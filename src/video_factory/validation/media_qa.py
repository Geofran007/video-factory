"""Control de calidad automático del MP4 final y de los artefactos intermedios."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from ..core.media import probe, run_ffmpeg
from ..core.models import Timeline


@dataclass
class Check:
    name: str
    passed: bool
    detail: str = ""


@dataclass
class QAReport:
    checks: list[Check] = field(default_factory=list)

    def add(self, name: str, passed: bool, detail: str = "") -> None:
        self.checks.append(Check(name, bool(passed), detail))

    @property
    def passed(self) -> bool:
        return all(c.passed for c in self.checks)

    def failures(self) -> list[Check]:
        return [c for c in self.checks if not c.passed]

    def to_dict(self) -> dict[str, Any]:
        return {"passed": self.passed, "checks": [asdict(c) for c in self.checks]}


def check_timeline(timeline: Timeline, report: QAReport, *, min_s: float, max_s: float) -> None:
    report.add("duracion_en_rango", min_s <= timeline.duration <= max_s,
               f"{timeline.duration:.2f}s (permitido {min_s}-{max_s}s)")
    scenes_ok = all(s.end > s.start for s in timeline.scenes)
    report.add("escenas_con_duracion", scenes_ok, f"{len(timeline.scenes)} escenas")
    contiguous = all(abs(a.end - b.start) < 1e-3 for a, b in zip(timeline.scenes, timeline.scenes[1:]))
    report.add("escenas_contiguas", contiguous and timeline.scenes[0].start == 0
               and abs(timeline.scenes[-1].end - timeline.duration) < 1e-3, "sin huecos entre escenas")
    cues = timeline.cues
    ordered = all(c.start < c.end for c in cues) and all(a.start <= b.start for a, b in zip(cues, cues[1:]))
    overlap = any(a.end > b.start + 1e-3 for a, b in zip(cues, cues[1:]))
    inside = all(0 <= c.start and c.end <= timeline.duration for c in cues)
    report.add("subtitulos_sincronizados", bool(cues) and ordered and not overlap and inside,
               f"{len(cues)} subtítulos; ordenados={ordered}, solapados={overlap}, dentro={inside}")
    narr_ok = all(s.start <= s.narration_start and s.narration_end <= s.end + 1e-3 for s in timeline.scenes)
    report.add("narracion_dentro_de_escena", narr_ok, "cada narración cae dentro de su escena")


def check_audio_file(path: Path, report: QAReport, *, name: str, max_peak_dbfs: float) -> None:
    ok = path.exists() and path.stat().st_size > 1000
    report.add(f"{name}_existe", ok, str(path.name))
    if not ok:
        return
    proc = run_ffmpeg(["-i", str(path), "-af", "volumedetect", "-f", "null", "-"])
    m = re.search(r"max_volume:\s*(-?[\d.]+) dB", proc.stderr)
    mean = re.search(r"mean_volume:\s*(-?[\d.]+) dB", proc.stderr)
    peak = float(m.group(1)) if m else 0.0
    report.add(f"{name}_sin_clipping", peak <= max_peak_dbfs, f"pico {peak:.1f} dBFS (máx {max_peak_dbfs})")
    if mean:
        report.add(f"{name}_audible", float(mean.group(1)) > -45, f"volumen medio {mean.group(1)} dB")


def check_video(path: Path, timeline: Timeline, report: QAReport, qa_cfg: dict, max_mb: float) -> dict[str, Any]:
    exists = path.exists() and path.stat().st_size > 0
    report.add("mp4_no_vacio", exists, f"{path.stat().st_size / 1e6:.2f} MB" if exists else "no existe")
    if not exists:
        return {}
    size_mb = path.stat().st_size / 1e6
    report.add("mp4_tamano_maximo", size_mb <= max_mb, f"{size_mb:.2f} MB (máx {max_mb})")
    info = probe(path)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    report.add("mp4_abre", v is not None, info["format"].get("format_name", ""))
    report.add("video_h264", bool(v) and v["codec_name"] == "h264", v["codec_name"] if v else "sin video")
    report.add("resolucion_1080x1920", bool(v) and (v["width"], v["height"]) == (timeline.width, timeline.height),
               f"{v['width']}x{v['height']}" if v else "")
    report.add("pixel_yuv420p", bool(v) and v.get("pix_fmt") == "yuv420p", v.get("pix_fmt", "") if v else "")
    fps = eval_fraction(v["avg_frame_rate"]) if v else 0
    report.add("fps_correctos", abs(fps - timeline.fps) < 0.05, f"{fps:.2f} fps")
    report.add("audio_aac", bool(a) and a["codec_name"] == "aac", a["codec_name"] if a else "sin audio")
    dur = float(info["format"]["duration"])
    tol = float(qa_cfg["duration_tolerance_s"])
    report.add("duracion_coincide", abs(dur - timeline.duration) <= tol,
               f"mp4 {dur:.2f}s vs línea de tiempo {timeline.duration:.2f}s")

    # Escenas negras involuntarias y silencio final.
    proc = run_ffmpeg(["-i", str(path), "-vf", "blackdetect=d=0.2:pix_th=0.06", "-af",
                       "silencedetect=n=-50dB:d=0.3", "-f", "null", "-"])
    blacks = [(float(s), float(e)) for s, e in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", proc.stderr)]
    long_black = [b for b in blacks if b[1] - b[0] > float(qa_cfg["max_black_segment_s"])]
    report.add("sin_escenas_negras", not long_black, f"{len(long_black)} segmentos negros largos")
    report.add("sin_silencio_final_largo", trailing_silence(proc.stderr, dur) <= float(qa_cfg["max_trailing_silence_s"]),
               f"silencio final {trailing_silence(proc.stderr, dur):.2f}s")
    check_audio_file(path, report, name="audio_final", max_peak_dbfs=float(qa_cfg["max_peak_dbfs"]))
    return {"duration": dur, "size_mb": round(size_mb, 2), "fps": fps,
            "width": v["width"] if v else None, "height": v["height"] if v else None}


def trailing_silence(ffmpeg_log: str, duration: float) -> float:
    """Segundos de silencio continuo al final según la salida de silencedetect."""
    events = re.findall(r"silence_(start|end):\s*([\d.]+)", ffmpeg_log)
    if not events:
        return 0.0
    kind, value = events[-1]
    if kind == "start":
        return max(0.0, duration - float(value))
    if float(value) >= duration - 0.1:  # el silencio se cerró justo al final del archivo
        starts = [float(v) for k, v in events if k == "start"]
        return max(0.0, duration - starts[-1]) if starts else 0.0
    return 0.0


def eval_fraction(text: str) -> float:
    num, _, den = text.partition("/")
    return float(num) / float(den or 1) if float(den or 1) else 0.0
