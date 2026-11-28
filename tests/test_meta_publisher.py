"""Publicador de Facebook e Instagram con una sesión HTTP falsa (sin red)."""

import pytest

from video_factory.publishers import meta


class Resp:
    def __init__(self, data, status=200):
        self._d, self.status_code, self.text = data, status, str(data)

    def json(self):
        return self._d


class Fake:
    def __init__(self, ig_status=("IN_PROGRESS", "FINISHED")):
        self.calls, self.ig_status = [], list(ig_status)

    def post(self, url, data=None, headers=None, timeout=None):
        body = data if isinstance(data, dict) else {}
        self.calls.append(("POST", url, body, headers or {}))
        if url.endswith("/video_reels") and body.get("upload_phase") == "start":
            return Resp({"video_id": "V1"})
        if url.endswith("/media") and "graph" in url:
            return Resp({"id": "C1"})
        if url.endswith("/media_publish"):
            return Resp({"id": "IG1"})
        return Resp({"success": True})

    def get(self, url, params=None, timeout=None):
        self.calls.append(("GET", url, params, {}))
        return Resp({"status_code": self.ig_status.pop(0)})


@pytest.fixture()
def env(monkeypatch):
    for k, v in {"META_PAGE_ID_ES": "P", "META_PAGE_TOKEN_ES": "T", "META_IG_ID_ES": "IG", "META_IG_AUTO": "si"}.items():
        monkeypatch.setenv(k, v)


def video(tmp_path):
    p = tmp_path / "video.mp4"
    p.write_bytes(b"\0" * 100)
    return p


def test_facebook_scheduled_and_instagram_published(tmp_path, env):
    s = Fake()
    res = meta.MetaPublisher("es", session=s, sleep=lambda _: None).publish(video(tmp_path), "Hola #ciencia", 50, publish_at=1800000000)
    assert (res.facebook_id, res.instagram_id, res.instagram_error) == ("V1", "IG1", "")
    finish = [c for c in s.calls if c[0] == "POST" and c[2].get("upload_phase") == "finish"][0][2]
    assert finish["video_state"] == "SCHEDULED" and finish["scheduled_publish_time"] == "1800000000"
    uploads = [c for c in s.calls if "rupload" in c[1]]
    assert len(uploads) == 2 and all(c[3]["Authorization"] == "OAuth T" for c in uploads)
    container = [c for c in s.calls if c[1].endswith("/IG/media")][0][2]
    assert container["media_type"] == "REELS" and container["upload_type"] == "resumable"


def test_instagram_failure_does_not_undo_facebook(tmp_path, env):
    s = Fake(ig_status=("ERROR",))
    res = meta.MetaPublisher("es", session=s, sleep=lambda _: None).publish(video(tmp_path), "x", 50)
    assert res.facebook_id == "V1" and not res.instagram_id and "ERROR" in res.instagram_error


def test_reel_duration_limit(tmp_path, env):
    with pytest.raises(meta.MetaError):
        meta.MetaPublisher("es", session=Fake()).publish(video(tmp_path), "x", 200)


def test_not_configured(monkeypatch):
    monkeypatch.delenv("META_PAGE_TOKEN_EN", raising=False)
    assert not meta.configured("en")


def test_draft_is_not_published(tmp_path, env):
    s = Fake()
    meta.MetaPublisher("es", session=s).facebook_reel(video(tmp_path), "x", draft=True)
    finish = [c for c in s.calls if c[0] == "POST" and c[2].get("upload_phase") == "finish"][0][2]
    assert finish["video_state"] == "DRAFT" and "scheduled_publish_time" not in finish


def test_instagram_off_without_switch(tmp_path, env, monkeypatch):
    monkeypatch.delenv("META_IG_AUTO")
    s = Fake()
    res = meta.MetaPublisher("es", session=s).publish(video(tmp_path), "x", 50)
    assert res.facebook_id == "V1" and not res.instagram_id and not any("/media" in c[1] for c in s.calls)
