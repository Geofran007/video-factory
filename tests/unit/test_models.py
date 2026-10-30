import copy

import pytest
from pydantic import ValidationError

from video_factory.core.models import VideoContent


def test_example_is_valid(example_content):
    assert example_content.scenes[0].role == "hook"
    assert example_content.scenes[-1].role == "closing"
    assert example_content.word_count > 50
    assert all(h.startswith("#") for h in example_content.hashtags)


def _mutate(data, fn):
    d = copy.deepcopy(data)
    fn(d)
    return d


@pytest.mark.parametrize(
    "mutation, message",
    [
        (lambda d: d["scenes"][0].update(role="development"), "hook"),
        (lambda d: d["scenes"][-1].update(role="development"), "closing"),
        (lambda d: [s.update(role="development") for s in d["scenes"] if s["role"] == "surprise"], "surprise"),
        (lambda d: d["scenes"][1].update(narration="  "), "vacía"),
        (lambda d: d["scenes"][4].update(items=["solo uno"]), "comparison"),
        (lambda d: d["scenes"][3].update(big_number=None), "big_number"),
        (lambda d: d.update(scenes=[d["scenes"][0], d["scenes"][-1]], claims=[]), "entre 3 y 10"),
        (lambda d: d["scenes"][1].update(id="s1"), "únicos"),
        (lambda d: d["claims"][0].update(scene_id="s99"), "inexistente"),
        (lambda d: d["scenes"][1].update(icon="<script>"), "icon"),
        (lambda d: d["scenes"][1].update(type="html"), "type"),
    ],
)
def test_invalid_content_is_rejected(example_dict, mutation, message):
    with pytest.raises(ValidationError, match=message):
        VideoContent.model_validate(_mutate(example_dict, mutation))


def test_hashtags_are_normalized(example_dict):
    example_dict["hashtags"] = ["ciencia", "#Ciencia", "datos curiosos!", "#"]
    content = VideoContent.model_validate(example_dict)
    assert content.hashtags == ["#ciencia", "#datoscuriosos"]


def test_needs_review_until_verified(example_content):
    assert example_content.needs_review  # el estado inicial nunca es "verified"
    for c in example_content.claims:
        c.status = "verified"
    assert not example_content.needs_review
