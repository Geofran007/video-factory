"""Publicador de YouTube Shorts con la YouTube Data API v3 (subida reanudable, OAuth con refresh token).

Credenciales solo por variables de entorno (en GitHub Actions, secretos del repositorio):
    YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN_<ES|EN>
Se crean con scripts/youtube_auth.py, que los guarda directo en GitHub sin mostrarlos.

Mientras el proyecto de Google Cloud no pase la auditoría de la API, YouTube fuerza los videos a privado;
por eso la visibilidad por defecto es «private» y el autor los publica o programa en YouTube Studio.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import requests

from .publisher_interface import PublishRequest, PublishResult

log = logging.getLogger("video_factory.publishers.youtube")

TOKEN_URL = "https://oauth2.googleapis.com/token"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
MAX_SHORT_S = 180


class YouTubeError(RuntimeError):
    pass


def _env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise YouTubeError(f"Falta la variable de entorno {name} (ver scripts/youtube_auth.py)")
    return value


class YouTubePublisher:
    platform = "youtube"

    def __init__(self, channel: str, *, session: requests.Session | None = None):
        if channel not in ("es", "en"):
            raise YouTubeError(f"Canal desconocido: {channel}")
        self.channel = channel
        self.http = session or requests.Session()

    # ------------------------------------------------------------------ autenticación
    def _access_token(self) -> str:
        r = self.http.post(TOKEN_URL, data={
            "client_id": _env("YT_CLIENT_ID"),
            "client_secret": _env("YT_CLIENT_SECRET"),
            "refresh_token": _env(f"YT_REFRESH_TOKEN_{self.channel.upper()}"),
            "grant_type": "refresh_token",
        }, timeout=30)
        if r.status_code != 200:
            raise YouTubeError(f"Google rechazó la autorización ({r.status_code}): {r.json().get('error', '')}")
        return r.json()["access_token"]

    # ------------------------------------------------------------------ validación
    def validate(self, request: PublishRequest) -> list[str]:
        problems = []
        if not request.video_path.exists():
            problems.append(f"no existe el video {request.video_path}")
        if not request.title.strip():
            problems.append("el título está vacío")
        if len(request.title) > 100:
            problems.append("el título supera 100 caracteres")
        if len(request.description) > 5000:
            problems.append("la descripción supera 5000 caracteres")
        dur = float(request.extra.get("duration_s", 0) or 0)
        if dur > MAX_SHORT_S and request.extra.get("format") != "long":
            problems.append(f"dura {dur:.0f}s; un Short admite hasta {MAX_SHORT_S}s")
        return problems

    # ------------------------------------------------------------------ subida
    def publish(self, request: PublishRequest) -> PublishResult:
        problems = self.validate(request)
        if problems:
            raise YouTubeError("No se publica: " + "; ".join(problems))
        token = self._access_token()
        lang = request.extra.get("language", self.channel)
        body = {
            "snippet": {
                "title": request.title[:100],
                "description": request.description[:5000],
                "tags": request.tags[:15],
                "categoryId": request.extra.get("category_id", "27"),  # 27 = Educación
                "defaultLanguage": lang,
                "defaultAudioLanguage": lang,
            },
            "status": {
                "privacyStatus": request.visibility,
                "selfDeclaredMadeForKids": False,
                # La narración usa una voz clonada con IA: se declara como contenido sintético.
                "containsSyntheticMedia": True,
            },
        }
        # Publicación programada (opcional): YouTube solo la admite en videos privados.
        publish_at = request.extra.get("publish_at")
        if publish_at and request.visibility == "private":
            body["status"]["publishAt"] = publish_at
        size = request.video_path.stat().st_size
        init = self.http.post(
            UPLOAD_URL, params={"uploadType": "resumable", "part": "snippet,status"},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=UTF-8",
                     "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)},
            data=json.dumps(body), timeout=60)
        if init.status_code != 200 or "Location" not in init.headers:
            raise YouTubeError(f"YouTube no aceptó iniciar la subida ({init.status_code}): {init.text[:400]}")
        with open(request.video_path, "rb") as fh:
            up = self.http.put(init.headers["Location"], data=fh,
                               headers={"Authorization": f"Bearer {token}", "Content-Type": "video/mp4",
                                        "Content-Length": str(size)}, timeout=1800)
        if up.status_code not in (200, 201):
            raise YouTubeError(f"La subida falló ({up.status_code}): {up.text[:400]}")
        video = up.json()
        vid = video["id"]
        status = video.get("status", {})
        log.info("Subido a YouTube (%s): %s · %s", self.channel, vid, status.get("privacyStatus"))
        url = f"https://youtu.be/{vid}" if request.extra.get("format") == "long" else f"https://youtube.com/shorts/{vid}"
        return PublishResult(platform="youtube", remote_id=vid, url=url)


def request_from_job(job_dir: Path, channel: str, visibility: str = "private") -> PublishRequest:
    """Arma la solicitud con los archivos que deja el pipeline (video.mp4 y metadata.json)."""
    meta = json.loads((job_dir / "metadata.json").read_text(encoding="utf-8"))
    yt = meta.get("platforms", {}).get("youtube_shorts", {})
    return PublishRequest(
        video_path=job_dir / "video.mp4",
        title=yt.get("title", meta["title"]),
        description=yt.get("description", meta["description"]),
        tags=yt.get("tags", []),
        channel_id=os.environ.get(f"YT_CHANNEL_ID_{channel.upper()}", channel),
        visibility=visibility,  # type: ignore[arg-type]
        thumbnail_path=None,
        extra={"language": meta.get("language", channel), "category_id": str(yt.get("category_id", "27")),
               "format": meta.get("format", "short"), "duration_s": str(meta.get("duration_s", 0))},
    )
