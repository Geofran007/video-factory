"""Publicador de TikTok con la Content Posting API v2 (subida del archivo por partes, OAuth con refresh token).

Credenciales solo por variables de entorno (en GitHub Actions, secretos del repositorio):
    TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN_<ES|EN>
Se crean con scripts/tiktok_auth.py, que los guarda directo en GitHub sin mostrarlos.

Modos (variable TIKTOK_MODE):
- "inbox" (por defecto, permiso video.upload): el video llega como BORRADOR a la bandeja de entrada de TikTok
  y el autor termina de publicarlo desde la app.
- "direct" (permiso video.publish): publica directamente. Mientras la app no pase la auditoría de TikTok,
  la cuenta de TikTok tiene que ser privada y el video queda visible solo para el autor (SELF_ONLY).

El refresh token de TikTok cambia en cada uso: el nuevo se entrega a `on_new_refresh_token` para guardarlo;
si no se guarda, la siguiente ejecución fallará y habrá que volver a autorizar.
Referencias: developers.tiktok.com/doc/content-posting-api-get-started y content-posting-api-media-transfer-guide.
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Callable

import requests

from .publisher_interface import PublishRequest, PublishResult

log = logging.getLogger("video_factory.publishers.tiktok")

API = "https://open.tiktokapis.com"
TOKEN_URL = f"{API}/v2/oauth/token/"
CREATOR_INFO_URL = f"{API}/v2/post/publish/creator_info/query/"
DIRECT_INIT_URL = f"{API}/v2/post/publish/video/init/"
INBOX_INIT_URL = f"{API}/v2/post/publish/inbox/video/init/"
STATUS_URL = f"{API}/v2/post/publish/status/fetch/"

MIN_CHUNK = 5 * 1024 * 1024
MAX_CHUNK = 64 * 1024 * 1024
CHUNK = 10 * 1024 * 1024
MAX_CAPTION = 2200
MAX_DURATION_S = 600
PRIVACY = {"private": "SELF_ONLY", "unlisted": "SELF_ONLY", "public": "PUBLIC_TO_EVERYONE"}
DONE = {"SEND_TO_USER_INBOX", "PUBLISH_COMPLETE"}


class TikTokError(RuntimeError):
    pass


def _env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise TikTokError(f"Falta la variable de entorno {name} (ver scripts/tiktok_auth.py)")
    return value


def configured(channel: str) -> bool:
    """¿Hay credenciales de TikTok para este canal? Si no, la publicación en TikTok se omite."""
    return all(os.environ.get(n, "").strip() for n in
               ("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", f"TIKTOK_REFRESH_TOKEN_{channel.upper()}"))


def chunk_plan(size: int) -> tuple[int, int]:
    """(chunk_size, total_chunk_count) según la guía de transferencia de TikTok.

    Hasta 64 MB se sube en una sola parte; más grande, en partes de 10 MB y la última absorbe el resto
    (puede llegar a 128 MB). El número de partes es el tamaño dividido entre la parte, redondeado hacia abajo.
    """
    if size <= 0:
        raise TikTokError("El video está vacío")
    if size <= MAX_CHUNK:
        return size, 1
    return CHUNK, size // CHUNK


def _check(resp: requests.Response, what: str) -> dict:
    try:
        body = resp.json()
    except ValueError:
        raise TikTokError(f"TikTok respondió algo inesperado al {what} ({resp.status_code}): {resp.text[:300]}") from None
    err = body.get("error") or {}
    if resp.status_code != 200 or err.get("code", "ok") != "ok":
        raise TikTokError(f"TikTok rechazó {what} ({resp.status_code}): {err.get('code')} · {err.get('message', '')[:300]}")
    return body.get("data") or {}


class TikTokPublisher:
    platform = "tiktok"

    def __init__(self, channel: str, *, session: requests.Session | None = None, mode: str | None = None,
                 on_new_refresh_token: Callable[[str], None] | None = None,
                 sleep: Callable[[float], None] = time.sleep, status_timeout_s: float = 600):
        if channel not in ("es", "en"):
            raise TikTokError(f"Canal desconocido: {channel}")
        self.channel = channel
        self.mode = (mode or os.environ.get("TIKTOK_MODE", "inbox")).strip().lower()
        if self.mode not in ("inbox", "direct"):
            raise TikTokError(f"TIKTOK_MODE debe ser 'inbox' o 'direct', no '{self.mode}'")
        self.http = session or requests.Session()
        self.on_new_refresh_token = on_new_refresh_token
        self.sleep = sleep
        self.status_timeout_s = status_timeout_s

    # ------------------------------------------------------------------ autenticación
    def _access_token(self) -> str:
        r = self.http.post(TOKEN_URL, data={
            "client_key": _env("TIKTOK_CLIENT_KEY"),
            "client_secret": _env("TIKTOK_CLIENT_SECRET"),
            "grant_type": "refresh_token",
            "refresh_token": _env(f"TIKTOK_REFRESH_TOKEN_{self.channel.upper()}"),
        }, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=30)
        try:
            body = r.json()
        except ValueError:
            body = {}
        if r.status_code != 200 or "access_token" not in body:
            raise TikTokError(f"TikTok rechazó la autorización ({r.status_code}): {body.get('error', '')} "
                              f"{body.get('error_description', '')}".strip())
        new_rt = body.get("refresh_token")
        if new_rt and self.on_new_refresh_token:
            self.on_new_refresh_token(new_rt)
        elif new_rt:
            log.warning("TikTok entregó un refresh token nuevo y nadie lo guardó: la próxima ejecución fallará.")
        return body["access_token"]

    # ------------------------------------------------------------------ validación
    def validate(self, request: PublishRequest) -> list[str]:
        problems = []
        if not request.video_path.exists():
            problems.append(f"no existe el video {request.video_path}")
        if len(request.title) > MAX_CAPTION:
            problems.append(f"el texto supera {MAX_CAPTION} caracteres")
        dur = float(request.extra.get("duration_s", 0) or 0)
        if dur > MAX_DURATION_S:
            problems.append(f"dura {dur:.0f}s; la API admite hasta {MAX_DURATION_S}s")
        return problems

    # ------------------------------------------------------------------ subida
    def _headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=UTF-8"}

    def publish(self, request: PublishRequest) -> PublishResult:
        problems = self.validate(request)
        if problems:
            raise TikTokError("No se publica en TikTok: " + "; ".join(problems))
        token = self._access_token()
        size = request.video_path.stat().st_size
        chunk_size, count = chunk_plan(size)
        source = {"source": "FILE_UPLOAD", "video_size": size, "chunk_size": chunk_size, "total_chunk_count": count}

        if self.mode == "direct":
            info = _check(self.http.post(CREATOR_INFO_URL, headers=self._headers(token), data="{}", timeout=30),
                          "consultar la cuenta")
            privacy = PRIVACY.get(request.visibility, "SELF_ONLY")
            options = info.get("privacy_level_options") or []
            if privacy not in options:
                raise TikTokError(f"La cuenta de TikTok no permite '{privacy}' (opciones: {options}). "
                                  "Sin auditoría, TikTok solo deja publicar en cuentas privadas y como SELF_ONLY.")
            body = {"post_info": {"title": request.title[:MAX_CAPTION], "privacy_level": privacy,
                                  "disable_comment": bool(info.get("comment_disabled", False)),
                                  "disable_duet": bool(info.get("duet_disabled", False)),
                                  "disable_stitch": bool(info.get("stitch_disabled", False)),
                                  "video_cover_timestamp_ms": 1000,
                                  # La narración usa una voz clonada con IA: se declara como contenido generado con IA.
                                  "is_aigc": True},
                    "source_info": source}
            url = DIRECT_INIT_URL
        else:
            body = {"source_info": source}
            url = INBOX_INIT_URL
        data = _check(self.http.post(url, headers=self._headers(token), data=json.dumps(body), timeout=60),
                      "iniciar la subida")
        publish_id, upload_url = data.get("publish_id"), data.get("upload_url")
        if not publish_id or not upload_url:
            raise TikTokError("TikTok no devolvió publish_id/upload_url")

        with open(request.video_path, "rb") as fh:
            for i in range(count):
                start = i * chunk_size
                end = size - 1 if i == count - 1 else start + chunk_size - 1
                fh.seek(start)
                part = fh.read(end - start + 1)
                up = self.http.put(upload_url, data=part, timeout=900, headers={
                    "Content-Type": "video/mp4", "Content-Length": str(len(part)),
                    "Content-Range": f"bytes {start}-{end}/{size}"})
                if up.status_code not in (200, 201, 206):
                    raise TikTokError(f"Falló la parte {i + 1}/{count} de la subida ({up.status_code}): {up.text[:300]}")

        status = self._wait(token, publish_id)
        log.info("TikTok (%s, %s): %s · %s", self.channel, self.mode, publish_id, status)
        return PublishResult(platform="tiktok", remote_id=publish_id,
                             url="https://www.tiktok.com/" if self.mode == "inbox" else "")

    def _wait(self, token: str, publish_id: str) -> str:
        waited = 0.0
        while True:
            data = _check(self.http.post(STATUS_URL, headers=self._headers(token),
                                         data=json.dumps({"publish_id": publish_id}), timeout=30), "consultar el estado")
            status = data.get("status", "")
            if status in DONE:
                return status
            if status == "FAILED":
                raise TikTokError(f"TikTok no pudo procesar el video: {data.get('fail_reason', 'sin motivo')}")
            if waited >= self.status_timeout_s:
                raise TikTokError(f"TikTok sigue procesando el video tras {waited:.0f}s (estado {status})")
            self.sleep(10)
            waited += 10


def request_from_job(job_dir: Path, channel: str, visibility: str = "private") -> PublishRequest:
    """Arma la solicitud con los archivos que deja el pipeline (video.mp4 y metadata.json)."""
    meta = json.loads((job_dir / "metadata.json").read_text(encoding="utf-8"))
    tt = meta.get("platforms", {}).get("tiktok", {})
    caption = tt.get("caption") or meta["title"]
    return PublishRequest(
        video_path=job_dir / "video.mp4", title=caption, description="", tags=[], channel_id=channel,
        visibility=visibility,  # type: ignore[arg-type]
        extra={"language": meta.get("language", channel), "duration_s": str(meta.get("duration_s", 0))},
    )

