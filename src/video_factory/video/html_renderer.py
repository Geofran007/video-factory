"""Renderizador HTML → video con Playwright (Chromium sin GPU) y FFmpeg.

Cada frame se obtiene llamando a VF.seek(t) en la página y capturando la pantalla; los JPEG
se envían por tubería a FFmpeg (sin escribir frames en disco). El trabajo se reparte en
segmentos que se renderizan en procesos paralelos y se unen sin recodificar.
"""

from __future__ import annotations

import base64
import json
import logging
import multiprocessing
import os
import subprocess
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Any

from ..core.errors import RenderError
from ..core.interfaces import ProgressCallback
from ..core.media import binary, run_ffmpeg
from ..core.models import Timeline

log = logging.getLogger("video_factory.video.renderer")

# WebGL (escenas 3D) por software con SwiftShader: igual en Windows y en los runners de GitHub, sin GPU.
_CHROMIUM_ARGS = ["--disable-gpu", "--font-render-hinting=none", "--disable-lcd-text", "--hide-scrollbars",
                  "--mute-audio", "--disable-extensions", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]


def _render_segment(job: dict[str, Any]) -> dict[str, Any]:
    """Se ejecuta en un proceso hijo: renderiza los frames [start, end) en un MP4 parcial."""
    from playwright.sync_api import sync_playwright

    fps, start, end = job["fps"], job["start"], job["end"]
    out, progress_file = Path(job["out"]), Path(job["progress_file"])
    errors: list[str] = []
    stderr_path = out.with_suffix(".ffmpeg.log")
    with open(stderr_path, "wb") as stderr, sync_playwright() as p:
        browser = p.chromium.launch(args=_CHROMIUM_ARGS)
        try:
            ctx = browser.new_context(viewport={"width": job["width"], "height": job["height"]},
                                      device_scale_factor=1, offline=True)
            ctx.route("**/*", lambda route: route.continue_() if route.request.url.startswith("file:")
                      else route.abort())
            page = ctx.new_page()
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            page.on("console", lambda m: errors.append(f"console: {m.text}") if m.type == "error" else None)
            page.goto(job["page_url"], wait_until="load")
            page.evaluate("tl => VF.init(tl)", job["timeline"])
            if errors:
                raise RenderError("Error en la plantilla HTML: " + " | ".join(errors[:5]))
            cdp = ctx.new_cdp_session(page)
            ff = subprocess.Popen(
                [job["ffmpeg"], "-hide_banner", "-y", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg",
                 "-i", "-", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                 "-c:v", "libx264", "-preset", job["preset"], "-crf", str(job["crf"]),
                 "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                 "-r", str(fps), "-g", str(fps * 2), "-an", str(out)],
                stdin=subprocess.PIPE, stderr=stderr,
            )
            assert ff.stdin is not None
            try:
                for i in range(start, end):
                    page.evaluate("t => VF.seek(t)", i / fps)
                    shot = cdp.send("Page.captureScreenshot",
                                    {"format": "jpeg", "quality": job["quality"], "optimizeForSpeed": True})
                    ff.stdin.write(base64.b64decode(shot["data"]))
                    if (i - start) % 15 == 0:
                        progress_file.write_text(str(i - start + 1))
                ff.stdin.close()
            except BrokenPipeError as exc:
                raise RenderError("FFmpeg cerró la tubería de video") from exc
            if ff.wait(timeout=600) != 0:
                raise RenderError(f"FFmpeg falló al codificar el segmento: {stderr_path.read_text(errors='replace')[-500:]}")
            if errors:
                raise RenderError("Error en la plantilla HTML: " + " | ".join(errors[:5]))
        finally:
            browser.close()
    progress_file.write_text(str(end - start))
    stderr_path.unlink(missing_ok=True)
    return {"out": str(out), "frames": end - start}


def render_thumbnail(templates_dir: Path, timeline: Timeline, scene_id: str, at: float, text: str,
                     highlight: list[str], out: Path) -> Path:
    """Portada 1280×720 (o 720×1280): fotograma de una escena con título grande, sin subtítulos."""
    from playwright.sync_api import sync_playwright

    scene = next(s for s in timeline.scenes if s.id == scene_id)
    t = scene.start + (scene.end - scene.start) * at
    page_url = (templates_dir / "runtime" / "index.html").resolve().as_uri()
    page_url += "?o=h" if timeline.width > timeline.height else ""
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=_CHROMIUM_ARGS)
        try:
            ctx = browser.new_context(viewport={"width": timeline.width, "height": timeline.height},
                                      device_scale_factor=1, offline=True)
            ctx.route("**/*", lambda route: route.continue_() if route.request.url.startswith("file:")
                      else route.abort())
            page = ctx.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(page_url, wait_until="load")
            page.evaluate("tl => VF.init(tl)", json.loads(timeline.model_dump_json()))
            page.evaluate("t => VF.seek(t)", t)
            page.evaluate("([text, hl]) => VF.thumb(text, hl)", [text, highlight])
            png = out.with_suffix(".png")
            page.screenshot(path=str(png))
        finally:
            browser.close()
    if errors:
        raise RenderError("Error en la portada: " + " | ".join(errors[:3]))
    size = "1280:720" if timeline.width > timeline.height else "720:1280"
    run_ffmpeg(["-i", str(png), "-vf", f"scale={size}", "-q:v", "2", str(out)])
    png.unlink(missing_ok=True)
    return out


class PlaywrightRenderer:
    def __init__(self, templates_dir: Path, video_cfg: dict[str, Any]):
        self.templates_dir = templates_dir
        self.cfg = video_cfg

    def _workers(self, frames: int) -> int:
        configured = self.cfg.get("render_workers", "auto")
        if configured != "auto":
            return max(1, int(configured))
        cpus = os.cpu_count() or 2
        return max(1, min(4, cpus // 2, frames // 120))

    def render(self, timeline: Timeline, out_path: Path, *, progress: ProgressCallback | None = None) -> Path:
        page = self.templates_dir / "runtime" / "index.html"
        if not page.exists():
            raise RenderError(f"No se encontró la plantilla: {page}")
        if timeline.presenter and not (self.templates_dir / "presenters" / f"{timeline.presenter}.png").exists():
            raise RenderError(f"No se encontró el presentador: templates/presenters/{timeline.presenter}.png")
        total = timeline.frame_count
        workers = self._workers(total)
        seg_dir = out_path.parent / "segments"
        seg_dir.mkdir(parents=True, exist_ok=True)
        bounds = [round(total * k / workers) for k in range(workers + 1)]
        base = {
            "fps": timeline.fps, "width": timeline.width, "height": timeline.height,
            "page_url": page.resolve().as_uri() + ("?o=h" if timeline.width > timeline.height else ""), "timeline": json.loads(timeline.model_dump_json()),
            "ffmpeg": binary("ffmpeg"), "preset": self.cfg.get("preset", "medium"), "crf": int(self.cfg.get("crf", 20)),
            "quality": int(self.cfg.get("jpeg_quality", 88)),
        }
        jobs = [
            {**base, "start": bounds[k], "end": bounds[k + 1], "out": str(seg_dir / f"seg_{k:02d}.mp4"),
             "progress_file": str(seg_dir / f"seg_{k:02d}.progress")}
            for k in range(workers) if bounds[k + 1] > bounds[k]
        ]
        for j in jobs:
            Path(j["progress_file"]).write_text("0")
        log.info("Renderizando %d frames (%.2fs a %d fps) con %d procesos", total, timeline.duration, timeline.fps, len(jobs))
        t0 = time.time()
        # "spawn" en todas las plataformas: Playwright no es seguro tras un fork (Linux/GitHub Actions).
        with ProcessPoolExecutor(max_workers=len(jobs), mp_context=multiprocessing.get_context("spawn")) as pool:
            futures = [pool.submit(_render_segment, j) for j in jobs]
            pending = set(futures)
            while pending:
                done = {f for f in pending if f.done()}
                for f in done:
                    f.result()  # propaga errores del proceso hijo
                pending -= done
                if progress:
                    rendered = sum(int(Path(j["progress_file"]).read_text() or 0) for j in jobs)
                    progress(min(1.0, rendered / total))
                time.sleep(0.5)
        log.info("Render completado en %.1fs (%.1f fps efectivos)", time.time() - t0, total / max(0.01, time.time() - t0))

        if len(jobs) == 1:
            Path(jobs[0]["out"]).replace(out_path)
        else:
            concat = seg_dir / "concat.txt"
            concat.write_text("".join(f"file '{Path(j['out']).as_posix()}'\n" for j in jobs), encoding="utf-8")
            run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(out_path)])
        for f in seg_dir.iterdir():
            f.unlink()
        seg_dir.rmdir()
        return out_path
