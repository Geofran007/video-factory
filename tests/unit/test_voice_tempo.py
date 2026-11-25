import json
from types import SimpleNamespace

import pytest

from video_factory.audio import tts_provider
from video_factory.core.interfaces import SynthesisItem


@pytest.mark.parametrize("language,expected", [("es", "atempo=1.1500"), ("en", None)])
def test_tempo_per_language(tmp_path, monkeypatch, language, expected):
    out = tmp_path / "a.wav"
    voice = {"model_dir": "m", "tempo": 1.15, "tempo_en": 1.0}
    tts = tts_provider.ChatterboxTTS({"v": voice}, tmp_path)
    monkeypatch.setattr(tts, "available_voices", lambda: {"v": voice})
    reply = json.dumps([{"out": str(out), "duration": 2.0, "sample_rate": 24000}])
    monkeypatch.setattr(tts_provider.subprocess, "run", lambda *a, **k: SimpleNamespace(returncode=0, stdout=reply, stderr=""))
    filters = []

    def fake_ffmpeg(args):
        filters.append(args[args.index("-af") + 1])
        tmp_path.joinpath("a.tempo.wav").write_bytes(b"x")

    monkeypatch.setattr(tts_provider, "run_ffmpeg", fake_ffmpeg)
    monkeypatch.setattr(tts_provider, "duration_of", lambda p: 1.7)
    tts.synthesize_many([SynthesisItem("hi", out)], voice="v", language=language)
    assert filters == ([expected] if expected else [])
