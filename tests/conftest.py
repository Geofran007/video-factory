from __future__ import annotations

import copy
import json
import math
import wave
from array import array
from pathlib import Path

import pytest

from video_factory.core.config import AppConfig, load_config
from video_factory.core.interfaces import SynthesisResult
from video_factory.core.models import VideoContent

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def example_content() -> VideoContent:
    return VideoContent.model_validate_json((ROOT / "examples" / "pulpos.json").read_text("utf-8"))


@pytest.fixture
def example_dict() -> dict:
    return json.loads((ROOT / "examples" / "pulpos.json").read_text("utf-8"))


@pytest.fixture
def cfg(tmp_path: Path) -> AppConfig:
    """Configuración real con salidas redirigidas a un directorio temporal."""
    base = load_config()
    settings = copy.deepcopy(base.settings)
    for key in ("output", "data", "logs"):
        settings["paths"][key] = str(tmp_path / key)
    providers = copy.deepcopy(base.providers)
    return AppConfig(root=base.root, settings=settings, providers=providers)


def write_tone(path: Path, seconds: float, rate: int = 22050, lead: float = 0.05) -> None:
    n = int(seconds * rate)
    lead_n = int(lead * rate)
    samples = array("h", [0] * lead_n + [int(8000 * math.sin(2 * math.pi * 220 * i / rate)) for i in range(n)] + [0] * lead_n)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(samples.tobytes())


class FakeTTS:
    """TTS determinista: 0.35 s por palabra, sin dependencias externas."""

    name = "fake"

    def __init__(self) -> None:
        self.calls = 0

    def synthesize_many(self, items, *, voice, speed=1.0):
        self.calls += 1
        out = []
        for it in items:
            words = len(it.text.split())
            dur = 0.35 * words / speed
            write_tone(it.out, dur)
            out.append(SynthesisResult(it.out, dur + 0.1, 22050, [4] * words))
        return out

    def available_voices(self):
        return {"masculina": {"model": "fake", "label": "Fake", "license": "MIT", "attribution": None}}

    def voice_info(self, voice):
        return self.available_voices()["masculina"]


@pytest.fixture
def fake_tts() -> FakeTTS:
    return FakeTTS()
