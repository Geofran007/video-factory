"""Exporta subtítulos en SRT (los subtítulos del video se dibujan en las plantillas HTML)."""

from __future__ import annotations

from ..core.models import Cue


def _ts(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def to_srt(cues: list[Cue]) -> str:
    blocks = [f"{i}\n{_ts(c.start)} --> {_ts(c.end)}\n{c.text}\n" for i, c in enumerate(cues, 1)]
    return "\n".join(blocks)
