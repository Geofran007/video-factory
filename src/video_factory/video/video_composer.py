"""Composición final: video renderizado + audio mezclado → MP4 H.264/AAC listo para redes."""

from __future__ import annotations

from pathlib import Path

from ..core.media import run_ffmpeg
from ..core.models import Timeline


def compose(timeline: Timeline, video: Path, audio: Path, out: Path) -> Path:
    duration = f"{timeline.duration:.3f}"
    run_ffmpeg([
        "-i", str(video), "-i", str(audio),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-t", duration, "-movflags", "+faststart",
        "-metadata", f"title={timeline.title}", "-metadata", "language=spa",
        str(out),
    ])
    return out


def thumbnail(video: Path, out: Path, at: float = 1.2) -> Path:
    run_ffmpeg(["-ss", f"{at:.2f}", "-i", str(video), "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", str(out)])
    return out
