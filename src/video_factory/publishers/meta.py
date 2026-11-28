"""Publicador de Reels en una Página de Facebook y su cuenta profesional de Instagram (Graph API de Meta).

Credenciales solo por variables de entorno (en GitHub Actions, secretos que guarda scripts/meta_auth.py):
    META_PAGE_ID_<ES|EN>      id de la Página de Facebook
    META_PAGE_TOKEN_<ES|EN>   token de acceso de la Página (de larga duración, no caduca salvo cambios en la cuenta)
    META_IG_ID_<ES|EN>        id de la cuenta profesional de Instagram vinculada (opcional)

Flujo (documentación de Meta, Graph API v27):
  Facebook:  POST /{page}/video_reels start → POST rupload.facebook.com/video-upload/{video} (archivo)
             → POST /{page}/video_reels finish con PUBLISHED o SCHEDULED (de 10 min a 29 días).
  Instagram: POST /{ig}/media media_type=REELS upload_type=resumable → POST rupload.facebook.com/ig-api-upload/{contenedor}
             → GET /{contenedor}?fields=status_code hasta FINISHED → POST /{ig}/media_publish. Instagram no permite
             programar por API: se publica en el momento.
Límites: 30 Reels por API cada 24 h en la Página; 100 publicaciones por API cada 24 h en Instagram. Reels de 3 a 90 s.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path

import requests

log = logging.getLogger("video_factory.publishers.meta")

GRAPH = "https://graph.facebook.com/v27.0"
RUPLOAD = "https://rupload.facebook.com"
MAX_REEL_S = 90


class MetaError(RuntimeError):
    pass


def configured(channel: str) -> bool:
    c = channel.upper()
    return bool(os.environ.get(f"META_PAGE_ID_{c}", "").strip() and os.environ.get(f"META_PAGE_TOKEN_{c}", "").strip())


def _check(resp: requests.Response, what: str) -> dict:
    try:
        data = resp.json()
    except ValueError:
        data = {}
    if resp.status_code >= 400 or "error" in data:
        err = data.get("error", {})
        raise MetaError(f"{what} falló ({resp.status_code}): {err.get('message', resp.text[:300])}")
    return data


@dataclass
class MetaResult:
    facebook_id: str = ""
    facebook_scheduled: str = ""
    instagram_id: str = ""
    instagram_error: str = ""


class MetaPublisher:
    platform = "meta"

    def __init__(self, channel: str, *, session: requests.Session | None = None, sleep=time.sleep):
        c = channel.upper()
        self.page_id = os.environ.get(f"META_PAGE_ID_{c}", "").strip()
        self.token = os.environ.get(f"META_PAGE_TOKEN_{c}", "").strip()
        self.ig_id = os.environ.get(f"META_IG_ID_{c}", "").strip()
        if not (self.page_id and self.token):
            raise MetaError(f"Faltan META_PAGE_ID_{c} / META_PAGE_TOKEN_{c} (ver scripts/meta_auth.py)")
        self.http = session or requests.Session()
        self.sleep = sleep

    # ------------------------------------------------------------------ Facebook
    def facebook_reel(self, video: Path, description: str, publish_at: int | None = None) -> str:
        start = _check(self.http.post(f"{GRAPH}/{self.page_id}/video_reels",
                                      data={"upload_phase": "start", "access_token": self.token}, timeout=60), "Iniciar Reel")
        vid = start["video_id"]
        size = video.stat().st_size
        with open(video, "rb") as fh:
            _check(self.http.post(f"{RUPLOAD}/video-upload/v27.0/{vid}", data=fh, timeout=1800,
                                  headers={"Authorization": f"OAuth {self.token}", "offset": "0", "file_size": str(size)}),
                   "Subir Reel a Facebook")
        finish = {"upload_phase": "finish", "video_id": vid, "description": description[:2200], "access_token": self.token}
        if publish_at:
            finish.update(video_state="SCHEDULED", scheduled_publish_time=str(publish_at))
        else:
            finish["video_state"] = "PUBLISHED"
        _check(self.http.post(f"{GRAPH}/{self.page_id}/video_reels", data=finish, timeout=60), "Publicar Reel en Facebook")
        return vid

    # ------------------------------------------------------------------ Instagram
    def instagram_reel(self, video: Path, caption: str, wait_s: int = 600) -> str:
        cont = _check(self.http.post(f"{GRAPH}/{self.ig_id}/media", data={
            "media_type": "REELS", "upload_type": "resumable", "caption": caption[:2200], "share_to_feed": "true",
            "access_token": self.token}, timeout=60), "Crear contenedor de Instagram")
        cid = cont["id"]
        size = video.stat().st_size
        with open(video, "rb") as fh:
            _check(self.http.post(f"{RUPLOAD}/ig-api-upload/v27.0/{cid}", data=fh, timeout=1800,
                                  headers={"Authorization": f"OAuth {self.token}", "offset": "0", "file_size": str(size)}),
                   "Subir Reel a Instagram")
        waited = 0
        while True:
            st = _check(self.http.get(f"{GRAPH}/{cid}", params={"fields": "status_code,status", "access_token": self.token},
                                      timeout=30), "Estado del Reel de Instagram")
            code = st.get("status_code")
            if code == "FINISHED":
                break
            if code in ("ERROR", "EXPIRED") or waited >= wait_s:
                raise MetaError(f"Instagram no procesó el video ({code}): {st.get('status', '')}")
            self.sleep(10)
            waited += 10
        pub = _check(self.http.post(f"{GRAPH}/{self.ig_id}/media_publish", data={"creation_id": cid, "access_token": self.token},
                                    timeout=60), "Publicar Reel en Instagram")
        return pub["id"]

    # ------------------------------------------------------------------ ambos
    def publish(self, video: Path, caption: str, duration_s: float, publish_at: int | None = None) -> MetaResult:
        if not 3 <= duration_s <= MAX_REEL_S:
            raise MetaError(f"Un Reel debe durar de 3 a {MAX_REEL_S} s (este dura {duration_s:.0f} s)")
        res = MetaResult()
        res.facebook_id = self.facebook_reel(video, caption, publish_at)
        res.facebook_scheduled = str(publish_at or "")
        if self.ig_id:
            # Un fallo en Instagram no deshace lo publicado en Facebook: se anota y sigue.
            try:
                res.instagram_id = self.instagram_reel(video, caption)
            except (MetaError, requests.RequestException) as exc:
                res.instagram_error = str(exc)[:500]
                log.warning("Instagram: %s", res.instagram_error)
        return res
