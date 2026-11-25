import json
from pathlib import Path

import pytest

from video_factory.core.config import load_config
from video_factory.core.models import VideoContent
from video_factory.core.pipeline import chapter_list

ROOT = Path(__file__).resolve().parents[2]
FILES = [p for c in ("largos", "publicados") for p in (ROOT / "contenidos" / c).rglob("*.json")
         if json.loads(p.read_text(encoding="utf-8")).get("format") == "long"]


class _TS:
    def __init__(self, start, chapter):
        self.start = start
        self.scene = type("S", (), {"chapter": chapter})()


def test_chapters_start_at_zero():
    tl = type("T", (), {"scenes": [_TS(0, None), _TS(30.4, "Uno"), _TS(95.0, "Dos")]})()
    assert chapter_list(tl, "Intro") == "0:00 Intro\n0:31 Uno\n1:35 Dos\n\n"
    assert chapter_list(type("T", (), {"scenes": [_TS(0, None)]})(), "Intro") == ""


def test_long_settings_are_horizontal():
    cfg = load_config().settings["video_long"]
    assert (cfg["width"], cfg["height"]) == (1920, 1080)


@pytest.mark.parametrize("path", FILES, ids=lambda p: p.stem)
def test_long_scripts_are_valid(path):
    content = VideoContent.model_validate_json(path.read_text(encoding="utf-8"))
    assert len(content.scenes) > 24
    assert sum(1 for s in content.scenes if s.chapter) >= 3


def test_short_still_limited():
    raw = json.loads(FILES[0].read_text(encoding="utf-8"))
    raw["format"] = "short"
    with pytest.raises(ValueError):
        VideoContent.model_validate(raw)
