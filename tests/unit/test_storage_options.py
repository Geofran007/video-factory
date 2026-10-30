import pytest

from video_factory.core.errors import ValidationError
from video_factory.core.interfaces import LLMUsage
from video_factory.core.pipeline import JobOptions
from video_factory.storage.history import History


def test_history_roundtrip(tmp_path):
    h = History(tmp_path / "h.db")
    h.create_job("j1", topic="pulpos", category="ciencia", output_dir=tmp_path, options_json="{}")
    h.update_job("j1", status="done", title="Pulpos", duration_s=30.0)
    job = h.get_job("j1")
    assert job["status"] == "done" and job["title"] == "Pulpos"
    assert h.recent_topics() == ["Pulpos"]
    h.record_usage("j1", "script", LLMUsage(model="m", input_tokens=1, output_tokens=2, cost_usd=0.25))
    assert h.spent_today_usd() == pytest.approx(0.25)
    with pytest.raises(ValueError):
        h.update_job("j1", id="otro")


@pytest.mark.parametrize("kwargs, msg", [
    ({"category": "deportes"}, "Categoría"),
    ({"duration_s": 90}, "duración"),
    ({"topic": "x"}, "temática"),
    ({"speed": 2.0}, "Velocidad"),
])
def test_job_options_validation(cfg, kwargs, msg):
    opts = JobOptions(**{"topic": "Los pulpos", **kwargs})
    with pytest.raises(ValidationError, match=msg):
        opts.validate(cfg)
