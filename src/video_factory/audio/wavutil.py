"""Operaciones mínimas sobre WAV PCM16 mono con la biblioteca estándar."""

from __future__ import annotations

import wave
from array import array
from dataclasses import dataclass
from pathlib import Path


@dataclass
class PcmAudio:
    samples: array  # array('h')
    sample_rate: int

    @property
    def duration(self) -> float:
        return len(self.samples) / self.sample_rate


def read_wav(path: Path) -> PcmAudio:
    with wave.open(str(path), "rb") as wf:
        if wf.getsampwidth() != 2 or wf.getnchannels() != 1:
            raise ValueError(f"{path.name}: se esperaba PCM16 mono")
        data = array("h")
        data.frombytes(wf.readframes(wf.getnframes()))
        return PcmAudio(data, wf.getframerate())


def write_wav(path: Path, audio: PcmAudio) -> None:
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(audio.sample_rate)
        wf.writeframes(audio.samples.tobytes())


def trim_silence(audio: PcmAudio, threshold: int = 400, keep_s: float = 0.03) -> PcmAudio:
    """Recorta silencio al inicio y al final dejando un margen corto para no cortar consonantes."""
    s = audio.samples
    n = len(s)
    start = next((i for i in range(n) if abs(s[i]) > threshold), n)
    end = next((i for i in range(n - 1, -1, -1) if abs(s[i]) > threshold), -1)
    if start >= n or end < 0:
        return PcmAudio(array("h"), audio.sample_rate)
    keep = int(keep_s * audio.sample_rate)
    return PcmAudio(s[max(0, start - keep): min(n, end + keep + 1)], audio.sample_rate)


def silence(seconds: float, sample_rate: int) -> array:
    return array("h", bytes(2 * max(0, int(round(seconds * sample_rate)))))


def peak_dbfs(audio: PcmAudio) -> float:
    import math

    peak = max((abs(x) for x in audio.samples), default=0)
    return -120.0 if peak == 0 else 20 * math.log10(peak / 32768)
