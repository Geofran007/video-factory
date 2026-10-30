"""Prueba de integración: genera un video real completo (Piper + Chromium + FFmpeg) sin llamar a la IA.

Ejecutar con: pytest -m integration
"""

import json

import pytest

from video_factory.core.media import probe
from video_factory.core.pipeline import JobOptions, Pipeline
from video_factory.storage.history import History

pytestmark = pytest.mark.integration


def test_full_video_from_example(cfg, tmp_path):
    from conftest import ROOT

    history = History(cfg.path("data") / "history.db")
    pipe = Pipeline(cfg, history)
    job_id = pipe.create_job(JobOptions(topic="pulpos", category="ciencia", voice="femenina",
                                        content_file=str(ROOT / "examples" / "pulpos.json")))
    result = pipe.run(job_id)

    assert result["qa"]["passed"], result["qa_failures"]
    job_dir = cfg.path("output") / job_id
    info = probe(job_dir / "video.mp4")
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    a = next(s for s in info["streams"] if s["codec_type"] == "audio")
    assert (v["codec_name"], v["width"], v["height"], v["pix_fmt"]) == ("h264", 1080, 1920, "yuv420p")
    assert a["codec_name"] == "aac"
    timeline = json.loads((job_dir / "timeline.json").read_text("utf-8"))
    assert abs(float(info["format"]["duration"]) - timeline["duration"]) < 0.2
    for name in ("script.md", "metadata.json", "subtitles.srt", "report.json", "thumbnail.jpg", "job.log"):
        assert (job_dir / name).stat().st_size > 0, name
    meta = json.loads((job_dir / "metadata.json").read_text("utf-8"))
    assert "CC BY-SA 4.0" in " ".join(meta["credits"])  # atribución obligatoria de la voz femenina
    assert history.get_job(job_id)["status"] == "done"
