import json
from pathlib import Path

import pytest

from video_factory.core.hashtags import _load, area, choose
from video_factory.core.models import VideoContent

ROOT = Path(__file__).resolve().parents[2]
QUEUED = sorted(p for d in ("cola", "largos") for p in (ROOT / "contenidos" / d).rglob("*.json"))


def test_long_moon_video_gets_space_tags():
    c = VideoContent.model_validate_json(next((ROOT / "contenidos/largos/en").glob("001-*.json")).read_text(encoding="utf-8"))
    tags = choose(c)
    assert len(tags) == 5 and tags[1] == "#science" and "#space" in tags[:3]
    assert "#shorts" not in tags and "#curiousleo" not in tags


@pytest.mark.parametrize("path", QUEUED, ids=lambda p: f"{p.parent.name}/{p.stem}")
def test_every_queued_script_gets_few_relevant_tags(path):
    c = VideoContent.model_validate_json(path.read_text(encoding="utf-8"))
    tags = choose(c)
    assert 4 <= len(tags) <= 6
    assert len({t.lower() for t in tags}) == len(tags)
    assert (tags[-1] == "#shorts") == (c.format == "short")
    assert area(c, _load()) is not None
