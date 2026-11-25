"""Publicador de YouTube con una sesión HTTP falsa (sin red)."""

import json

import pytest

from video_factory.publishers.publisher_interface import PublishRequest
from video_factory.publishers.youtube import YouTubeError, YouTubePublisher, request_from_job


class FakeResp:
    def __init__(self, status, body=None, headers=None):
        self.status_code, self._body, self.headers = status, body or {}, headers or {}
        self.text = json.dumps(self._body)

    def json(self):
        return self._body


class FakeSession:
    def __init__(self):
        self.calls = []

    def post(self, url, **kw):
        self.calls.append(("POST", url, kw))
        if "oauth2" in url:
            return FakeResp(200, {"access_token": "AT"})
        return FakeResp(200, headers={"Location": "https://upload.example/session"})

    def put(self, url, **kw):
        self.calls.append(("PUT", url, kw))
        return FakeResp(200, {"id": "abc123", "status": {"privacyStatus": "private"}})


@pytest.fixture()
def env(monkeypatch):
    for k, v in {"YT_CLIENT_ID": "id", "YT_CLIENT_SECRET": "sec", "YT_REFRESH_TOKEN_EN": "rt"}.items():
        monkeypatch.setenv(k, v)


def _request(tmp_path, **over):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\x00" * 10)
    base = dict(video_path=video, title="How many balloons?", description="desc", tags=["a"], channel_id="en",
                extra={"language": "en", "duration_s": "35"})
    base.update(over)
    return PublishRequest(**base)


def test_publish_uploads_private_with_synthetic_flag(tmp_path, env):
    s = FakeSession()
    res = YouTubePublisher("en", session=s).publish(_request(tmp_path))
    assert res.remote_id == "abc123" and res.url.endswith("/abc123")
    init = next(c for c in s.calls if c[0] == "POST" and "upload" in c[1])
    body = json.loads(init[2]["data"])
    assert body["status"]["privacyStatus"] == "private"
    assert body["status"]["containsSyntheticMedia"] is True
    assert body["status"]["selfDeclaredMadeForKids"] is False
    assert body["snippet"]["defaultAudioLanguage"] == "en"


def test_publish_at_only_when_requested_and_private(tmp_path, env):
    when = "2026-11-26T14:00:00Z"
    for visibility, extra, expected in [("private", {}, None), ("private", {"publish_at": when}, when),
                                        ("unlisted", {"publish_at": when}, None)]:
        s = FakeSession()
        YouTubePublisher("en", session=s).publish(_request(tmp_path, visibility=visibility, extra=extra))
        init = next(c for c in s.calls if c[0] == "POST" and "upload" in c[1])
        assert json.loads(init[2]["data"])["status"].get("publishAt") == expected


def test_validate_blocks_long_or_untitled(tmp_path, env):
    pub = YouTubePublisher("en", session=FakeSession())
    assert pub.validate(_request(tmp_path, title=" ")) == ["el título está vacío"]
    with pytest.raises(YouTubeError):
        pub.publish(_request(tmp_path, extra={"duration_s": "240"}))


def test_missing_credentials(tmp_path, monkeypatch):
    monkeypatch.delenv("YT_REFRESH_TOKEN_ES", raising=False)
    monkeypatch.setenv("YT_CLIENT_ID", "id")
    monkeypatch.setenv("YT_CLIENT_SECRET", "sec")
    with pytest.raises(YouTubeError, match="YT_REFRESH_TOKEN_ES"):
        YouTubePublisher("es", session=FakeSession()).publish(_request(tmp_path))


def test_request_from_job(tmp_path):
    (tmp_path / "video.mp4").write_bytes(b"x")
    (tmp_path / "metadata.json").write_text(json.dumps({
        "title": "T", "description": "D", "language": "en", "duration_s": 30,
        "platforms": {"youtube_shorts": {"title": "T", "description": "D", "tags": ["x"], "category_id": "27"}},
    }), encoding="utf-8")
    req = request_from_job(tmp_path, "en")
    assert req.visibility == "private" and req.extra["language"] == "en" and req.tags == ["x"]
