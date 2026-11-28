"""Carruseles de Facebook e Instagram con una sesión HTTP falsa (sin red)."""
import datetime as dt
import json
import sys
from pathlib import Path

import pytest

from video_factory.publishers.meta_carousel import MetaCarousel

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import carrusel  # noqa: E402


class Resp:
    def __init__(self, data):
        self._d, self.status_code, self.text = data, 200, str(data)

    def json(self):
        return self._d


class Fake:
    def __init__(self):
        self.calls, self.n = [], 0

    def post(self, url, data=None, files=None, timeout=None):
        self.calls.append(("POST", url, data or {}))
        self.n += 1
        if url.endswith("/photos"):
            return Resp({"id": f"P{self.n}"})
        if url.endswith("/feed"):
            return Resp({"id": "POST1"})
        if url.endswith("/media_publish"):
            return Resp({"id": "IG1"})
        return Resp({"id": f"C{self.n}"})

    def get(self, url, params=None, timeout=None):
        if "fields" in (params or {}) and params["fields"] == "images":
            return Resp({"images": [{"source": "https://cdn/x.jpg", "width": 1080, "height": 1350}, {"source": "small", "width": 1, "height": 1}]})
        return Resp({"status_code": "FINISHED"})

    def delete(self, url, params=None, timeout=None):
        self.calls.append(("DELETE", url, {}))
        return Resp({"success": True})


@pytest.fixture()
def env(monkeypatch):
    for k, v in {"META_PAGE_ID_ES": "P", "META_PAGE_TOKEN_ES": "T", "META_IG_ID_ES": "IG", "META_IG_AUTO": "si"}.items():
        monkeypatch.setenv(k, v)


def imgs(tmp_path, n=3):
    out = []
    for i in range(n):
        p = tmp_path / f"{i}.jpg"; p.write_bytes(b"\xff\xd8"); out.append(p)
    return out


def test_carousel_scheduled_on_facebook_and_published_on_instagram(tmp_path, env):
    s = Fake()
    res = MetaCarousel("es", session=s, sleep=lambda _: None).publish_carousel(imgs(tmp_path), "hola", publish_at=1800000000)
    feed = [c for c in s.calls if c[1].endswith("/feed")][0][2]
    assert json.loads(feed["attached_media"]) == [{"media_fbid": "P1"}, {"media_fbid": "P2"}, {"media_fbid": "P3"}]
    assert feed["published"] == "false" and feed["scheduled_publish_time"] == "1800000000"
    children = [c for c in s.calls if c[1].endswith("/IG/media") and c[2].get("is_carousel_item")]
    assert len(children) == 3 and children[0][2]["image_url"] == "https://cdn/x.jpg"
    parent = [c for c in s.calls if c[2].get("media_type") == "CAROUSEL"][0][2]
    assert parent["children"].count(",") == 2
    assert (res.facebook_post_id, res.instagram_id) == ("POST1", "IG1")


def test_queue_files_are_valid():
    for f in sorted((carrusel.QUEUE / "es").glob("*.json")):
        card = json.loads(f.read_text(encoding="utf-8"))
        assert 3 <= len(card["slides"]) <= 10 and card["sources"]
        assert card["slides"][0]["layout"] == "cover" and card["slides"][-1]["layout"] == "cta"
        assert len(carrusel.caption(card)) < 2200


def test_daily_slot_window():
    cfg = {"publicaciones": [{"tipo": "carrusel", "hora": "12:00"}, {"tipo": "imagen", "hora": "19:00"}],
           "zonas": {"es": "America/Guayaquil"}}
    at = lambda s: dt.datetime.fromisoformat(s).replace(tzinfo=dt.timezone.utc)
    assert [s[1] for s in carrusel.slots_now("es", cfg, at("2026-11-28T15:00"))] == ["2026-11-28-carrusel"]  # 10:00 Ecuador
    assert [s[1] for s in carrusel.slots_now("es", cfg, at("2026-11-28T23:00"))] == ["2026-11-28-carrusel", "2026-11-28-imagen"]
    assert carrusel.slots_now("es", cfg, at("2026-11-28T08:00")) == []  # 3:00 en Ecuador: nada pendiente


def test_single_image_goes_to_instagram_without_carousel(tmp_path, env):
    s = Fake()
    res = MetaCarousel("es", session=s, sleep=lambda _: None).publish_carousel(imgs(tmp_path, 1), "hola")
    assert not any(c[2].get("media_type") == "CAROUSEL" for c in s.calls)
    assert res.instagram_id == "IG1" and res.facebook_post_id == "POST1"


def test_image_queue_is_valid():
    for f in sorted((carrusel.QUEUES["imagen"] / "es").glob("*.json")):
        card = json.loads(f.read_text(encoding="utf-8"))
        assert len(card["slides"]) == 1 and card["slides"][0]["layout"] == "bubble" and card["sources"]
