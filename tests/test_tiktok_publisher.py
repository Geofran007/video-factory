"""Publicador de TikTok con una sesión HTTP falsa (sin red)."""

import json

import pytest

from video_factory.publishers.publisher_interface import PublishRequest
from video_factory.publishers.tiktok import TikTokError, TikTokPublisher, chunk_plan, configured, request_from_job


def chunk_count_check(size: int) -> bool:
    """El plan respeta la guía: 1–1000 partes, partes de 5–64 MB (salvo una sola) y la última hasta 128 MB."""
    cs, n = chunk_plan(size)
    last = size - cs * (n - 1)
    return 1 <= n <= 1000 and (n == 1 or 5 * 2**20 <= cs <= 64 * 2**20) and 0 < last <= 128 * 2**20


class FakeResp:
    def __init__(self, status, body=None):
        self.status_code, self._body = status, body if body is not None else {}
        self.text = json.dumps(self._body)

    def json(self):
        return self._body


def ok(data):
    return FakeResp(200, {"data": data, "error": {"code": "ok", "message": "", "log_id": "x"}})


class FakeSession:
    def __init__(self, privacy_options=("SELF_ONLY",), statuses=("PROCESSING_UPLOAD", "SEND_TO_USER_INBOX")):
        self.calls, self.privacy_options, self.statuses = [], list(privacy_options), list(statuses)

    def post(self, url, **kw):
        self.calls.append(("POST", url, kw))
        if url.endswith("/oauth/token/"):
            return FakeResp(200, {"access_token": "AT", "refresh_token": "RT2", "expires_in": 7200})
        if url.endswith("/creator_info/query/"):
            return ok({"privacy_level_options": self.privacy_options, "comment_disabled": False})
        if url.endswith("/video/init/"):
            return ok({"publish_id": "v_pub_1", "upload_url": "https://upload.example/x?token=1"})
        if url.endswith("/status/fetch/"):
            return ok({"status": self.statuses.pop(0)})
        raise AssertionError(url)

    def put(self, url, **kw):
        self.calls.append(("PUT", url, kw))
        return FakeResp(201, {})


@pytest.fixture()
def env(monkeypatch):
    for k, v in {"TIKTOK_CLIENT_KEY": "ck", "TIKTOK_CLIENT_SECRET": "cs", "TIKTOK_REFRESH_TOKEN_ES": "rt"}.items():
        monkeypatch.setenv(k, v)
    monkeypatch.delenv("TIKTOK_MODE", raising=False)


def req(tmp_path, size=1000, visibility="private"):
    v = tmp_path / "video.mp4"
    v.write_bytes(b"\0" * size)
    return PublishRequest(video_path=v, title="Hola #shorts", description="", tags=[], channel_id="es",
                          visibility=visibility, extra={"duration_s": "60"})


def test_chunk_plan_follows_transfer_guide():
    assert chunk_plan(3_000_000) == (3_000_000, 1)          # < 5 MB: una sola parte con el tamaño exacto
    assert chunk_plan(40_000_000) == (40_000_000, 1)        # hasta 64 MB: una parte
    cs, n = chunk_plan(150_000_000)
    assert cs == 10 * 1024 * 1024 and n == 150_000_000 // cs
    for size in (1, 5_242_880, 67_108_864, 67_108_865, 999_999_999):
        assert chunk_count_check(size)


def test_inbox_upload_saves_rotated_token(env, tmp_path):
    saved = []
    s = FakeSession()
    res = TikTokPublisher("es", session=s, on_new_refresh_token=saved.append, sleep=lambda _: None).publish(req(tmp_path))
    assert res.platform == "tiktok" and res.remote_id == "v_pub_1"
    assert saved == ["RT2"]
    urls = [c[1] for c in s.calls]
    assert any(u.endswith("/inbox/video/init/") for u in urls)
    assert not any(u.endswith("/creator_info/query/") for u in urls)
    put = next(c for c in s.calls if c[0] == "PUT")
    assert put[2]["headers"]["Content-Range"] == "bytes 0-999/1000"
    init = next(c for c in s.calls if c[1].endswith("/video/init/"))
    assert json.loads(init[2]["data"])["source_info"] == {"source": "FILE_UPLOAD", "video_size": 1000,
                                                         "chunk_size": 1000, "total_chunk_count": 1}


def test_direct_post_requires_allowed_privacy(env, tmp_path):
    s = FakeSession(privacy_options=["PUBLIC_TO_EVERYONE"])
    with pytest.raises(TikTokError, match="SELF_ONLY"):
        TikTokPublisher("es", session=s, mode="direct", sleep=lambda _: None).publish(req(tmp_path))


def test_direct_post_sends_private_and_ai_label(env, tmp_path):
    s = FakeSession(statuses=["PUBLISH_COMPLETE"])
    TikTokPublisher("es", session=s, mode="direct", sleep=lambda _: None).publish(req(tmp_path))
    init = next(c for c in s.calls if c[1].endswith("/publish/video/init/"))
    info = json.loads(init[2]["data"])["post_info"]
    assert info["privacy_level"] == "SELF_ONLY" and info["is_aigc"] is True and info["title"] == "Hola #shorts"


def test_failed_status_raises(env, tmp_path):
    s = FakeSession(statuses=["FAILED"])
    with pytest.raises(TikTokError, match="no pudo procesar"):
        TikTokPublisher("es", session=s, sleep=lambda _: None).publish(req(tmp_path))


def test_missing_credentials(monkeypatch, tmp_path):
    for k in ("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN_ES"):
        monkeypatch.delenv(k, raising=False)
    assert not configured("es")
    with pytest.raises(TikTokError, match="TIKTOK_CLIENT_KEY"):
        TikTokPublisher("es", session=FakeSession()).publish(req(tmp_path))


def test_request_from_job_uses_tiktok_caption(tmp_path):
    (tmp_path / "video.mp4").write_bytes(b"x")
    (tmp_path / "metadata.json").write_text(json.dumps({
        "title": "T", "description": "D", "language": "es", "duration_s": 61.2,
        "platforms": {"tiktok": {"caption": "Caption #ciencia"}}}), encoding="utf-8")
    r = request_from_job(tmp_path, "es")
    assert r.title == "Caption #ciencia" and r.extra["duration_s"] == "61.2"
