"""Carruseles de imágenes en la Página de Facebook y en su Instagram profesional (Graph API v27).

Facebook: cada imagen se sube sin publicar (POST /{page}/photos published=false) y luego se crea una publicación con
todas (POST /{page}/feed con attached_media), publicada ya o programada (scheduled_publish_time, de 10 min a 6 meses).
Instagram: su API no acepta subir imágenes, solo enlaces públicos (image_url). Se usa la dirección que Facebook
asigna a cada foto recién subida, se crea un contenedor por imagen (is_carousel_item) y uno CAROUSEL con todos,
y se publica con media_publish. Instagram no permite programar: se publica en el momento.
Credenciales: las mismas de meta.py (META_PAGE_ID_*, META_PAGE_TOKEN_*, META_IG_ID_* y META_IG_AUTO=si).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import requests

from .meta import GRAPH, MetaError, MetaPublisher, _check


@dataclass
class CarouselResult:
    facebook_post_id: str = ""
    facebook_scheduled: str = ""
    instagram_id: str = ""
    instagram_error: str = ""


class MetaCarousel(MetaPublisher):
    def _upload_photos(self, images: list[Path]) -> list[str]:
        ids = []
        for img in images:
            with open(img, "rb") as fh:
                r = self.http.post(f"{GRAPH}/{self.page_id}/photos", files={"source": (img.name, fh, "image/jpeg")},
                                   data={"published": "false", "access_token": self.token}, timeout=120)
            ids.append(_check(r, f"Subir imagen {img.name}")["id"])
        return ids

    def _photo_url(self, photo_id: str) -> str:
        data = _check(self.http.get(f"{GRAPH}/{photo_id}", params={"fields": "images", "access_token": self.token}, timeout=30),
                      "Leer la imagen subida")
        best = max(data.get("images", []), key=lambda i: i.get("width", 0) * i.get("height", 0), default=None)
        if not best:
            raise MetaError("Facebook no devolvió la dirección de la imagen")
        return best["source"]

    def facebook_post(self, photo_ids: list[str], message: str, publish_at: int | None = None) -> str:
        data = {"message": message[:5000], "access_token": self.token,
                "attached_media": json.dumps([{"media_fbid": i} for i in photo_ids])}
        if publish_at:
            data.update(published="false", scheduled_publish_time=str(publish_at))
        return _check(self.http.post(f"{GRAPH}/{self.page_id}/feed", data=data, timeout=60), "Publicar en Facebook")["id"]

    def delete(self, object_id: str) -> None:
        _check(self.http.delete(f"{GRAPH}/{object_id}", params={"access_token": self.token}, timeout=30), "Borrar")

    def _wait(self, container: str, wait_s: int = 300) -> None:
        waited = 0
        while True:
            st = _check(self.http.get(f"{GRAPH}/{container}", params={"fields": "status_code", "access_token": self.token},
                                      timeout=30), "Estado en Instagram")
            if st.get("status_code") in (None, "FINISHED"):
                return
            if st["status_code"] in ("ERROR", "EXPIRED") or waited >= wait_s:
                raise MetaError(f"Instagram no procesó la imagen ({st['status_code']})")
            self.sleep(5)
            waited += 5

    def instagram_carousel(self, urls: list[str], caption: str, publish: bool = True) -> str:
        children = []
        for u in urls:
            c = _check(self.http.post(f"{GRAPH}/{self.ig_id}/media", data={"image_url": u, "is_carousel_item": "true",
                                                                          "access_token": self.token}, timeout=60),
                       "Imagen del carrusel de Instagram")["id"]
            self._wait(c)
            children.append(c)
        parent = _check(self.http.post(f"{GRAPH}/{self.ig_id}/media", data={
            "media_type": "CAROUSEL", "children": ",".join(children), "caption": caption[:2200], "access_token": self.token},
            timeout=60), "Carrusel de Instagram")["id"]
        self._wait(parent)
        if not publish:
            return parent  # prueba: contenedor listo, sin publicar
        return _check(self.http.post(f"{GRAPH}/{self.ig_id}/media_publish",
                                     data={"creation_id": parent, "access_token": self.token}, timeout=60),
                      "Publicar carrusel en Instagram")["id"]

    def publish_carousel(self, images: list[Path], caption: str, publish_at: int | None = None) -> CarouselResult:
        if not 2 <= len(images) <= 10:
            raise MetaError("Un carrusel necesita de 2 a 10 imágenes")
        res = CarouselResult()
        ids = self._upload_photos(images)
        # Las direcciones se leen antes de crear la publicación, mientras las fotos aún son solo de la Página.
        urls, url_error = [], ""
        if self.ig_id:
            try:
                urls = [self._photo_url(i) for i in ids]
            except (MetaError, requests.RequestException) as exc:
                url_error = str(exc)[:500]
        res.facebook_post_id = self.facebook_post(ids, caption, publish_at)
        res.facebook_scheduled = str(publish_at or "")
        if self.ig_id:
            try:
                if url_error:
                    raise MetaError(url_error)
                res.instagram_id = self.instagram_carousel(urls, caption)
            except (MetaError, requests.RequestException) as exc:
                res.instagram_error = str(exc)[:500]
        return res

