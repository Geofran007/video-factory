"""Genera una hoja de contacto con frames de una línea de tiempo (útil para diseñar plantillas).

Uso: python scripts/preview_frames.py output/<job>/timeline.json salida.jpg [t1 t2 ...] [--style misterio]
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

from video_factory.core.media import run_ffmpeg

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    args = sys.argv[1:]
    style = None
    if "--style" in args:
        i = args.index("--style")
        style = args[i + 1]
        del args[i:i + 2]
    tl_path, out = Path(args[0]), Path(args[1])
    tl = json.loads(tl_path.read_text(encoding="utf-8"))
    if style:
        tl["style"] = style
    times = [float(x) for x in args[2:]] or [s["start"] + min(1.6, (s["end"] - s["start"]) * 0.6) for s in tl["scenes"]]
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-gpu"])
        page = browser.new_page(viewport={"width": 1080, "height": 1920})
        page.on("pageerror", lambda e: print("pageerror:", e))
        page.goto((ROOT / "templates" / "runtime" / "index.html").as_uri())
        page.evaluate("tl => VF.init(tl)", tl)
        for i, t in enumerate(times):
            page.evaluate("t => VF.seek(t)", t)
            page.screenshot(path=str(Path(tmp) / f"f{i:02d}.png"))
        browser.close()
        cols = min(4, len(times))
        rows = (len(times) + cols - 1) // cols
        run_ffmpeg(["-i", str(Path(tmp) / "f%02d.png"), "-vf", f"scale=360:640,tile={cols}x{rows}", "-frames:v", "1", str(out)])
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
