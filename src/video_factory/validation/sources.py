"""Verificación de fuentes y afirmaciones.

Una afirmación queda `verified` solo si:
  1. cita al menos una URL listada en `sources`,
  2. esa URL proviene de los resultados reales de búsqueda (cuando hubo investigación),
  3. la URL responde (HTTP < 400), y
  4. la confianza declarada es «alta».
En cualquier otro caso queda `needs_review` con una nota explicativa.
"""

from __future__ import annotations

import logging
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit

from ..core.models import VideoContent

log = logging.getLogger("video_factory.validation.sources")
_UA = "Mozilla/5.0 (compatible; VideoFactoryLinkCheck/0.1)"


def _norm(url: str) -> str:
    p = urlsplit(url.strip())
    return f"{p.netloc.lower().removeprefix('www.')}{p.path.rstrip('/')}"


def check_url(url: str, timeout: float = 8.0) -> bool:
    if urlsplit(url).scheme not in {"http", "https"}:
        return False
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method, headers={"User-Agent": _UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (esquema validado arriba)
                if resp.status < 400:
                    return True
        except urllib.error.HTTPError as exc:
            if method == "HEAD" and exc.code in {403, 405, 501}:
                continue  # algunos servidores no aceptan HEAD: se reintenta con GET
            # 401/403: la página existe pero bloquea clientes automáticos.
            return exc.code in {401, 403}
        except (urllib.error.URLError, TimeoutError, OSError):
            return False
    return False


def check_urls(urls: list[str]) -> dict[str, bool]:
    unique = list(dict.fromkeys(urls))
    with ThreadPoolExecutor(max_workers=6) as pool:
        return dict(zip(unique, pool.map(check_url, unique)))


def verify_claims(
    content: VideoContent,
    *,
    researched_urls: set[str] | None,
    reachable: dict[str, bool] | None = None,
) -> VideoContent:
    """Asigna status/review_note a cada afirmación. `researched_urls=None` = no hubo búsqueda web."""
    listed = {_norm(s.url) for s in content.sources}
    researched = {_norm(u) for u in researched_urls} if researched_urls is not None else None
    if reachable is None:
        reachable = check_urls([u for c in content.claims for u in c.source_urls])
    for claim in content.claims:
        notes: list[str] = []
        good = []
        for url in claim.source_urls:
            n = _norm(url)
            if n not in listed:
                notes.append(f"URL no listada en fuentes: {url}")
            elif researched is not None and n not in researched:
                notes.append(f"URL no proviene de la búsqueda: {url}")
            elif not reachable.get(url, False):
                notes.append(f"URL no accesible: {url}")
            else:
                good.append(url)
        if researched is None:
            notes.append("sin búsqueda web: requiere verificación manual")
        if not claim.source_urls:
            notes.append("sin fuente")
        if claim.confidence != "alta":
            notes.append(f"confianza {claim.confidence}")
        verified = bool(good) and researched is not None and claim.confidence == "alta"
        claim.status = "verified" if verified else "needs_review"
        claim.review_note = "" if verified else "; ".join(notes)
    if not content.claims:
        log.warning("El contenido no declara afirmaciones verificables")
    return content
