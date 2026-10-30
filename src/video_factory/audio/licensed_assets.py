"""Registro de recursos de audio de terceros.

Solo se usa un archivo de assets/ si está declarado en assets/LICENSES.json con su licencia
y origen. Así ningún recurso sin autorización termina en un video.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

log = logging.getLogger("video_factory.audio.assets")
_AUDIO_EXT = (".wav", ".mp3", ".ogg", ".flac", ".m4a")
_REQUIRED = ("file", "license", "source")


def load_registry(assets_dir: Path) -> list[dict[str, Any]]:
    path = assets_dir / "LICENSES.json"
    if not path.exists():
        return []
    entries = json.loads(path.read_text(encoding="utf-8")).get("assets", [])
    valid = []
    for e in entries:
        if all(e.get(k) for k in _REQUIRED) and (assets_dir / e["file"]).exists():
            valid.append(e)
        else:
            log.warning("Recurso ignorado por datos de licencia incompletos o archivo ausente: %s", e.get("file"))
    return valid


def licensed_file(assets_dir: Path, prefix: str) -> Path | None:
    """Primer archivo registrado cuya ruta empieza por `prefix` (p. ej. 'music/ciencia' o 'sfx/whoosh')."""
    for e in load_registry(assets_dir):
        f = e["file"].replace("\\", "/")
        if f.startswith(prefix) and f.lower().endswith(_AUDIO_EXT):
            return assets_dir / f
    return None


def attribution_for(assets_dir: Path, file: Path) -> str | None:
    for e in load_registry(assets_dir):
        if (assets_dir / e["file"]).resolve() == file.resolve():
            return e.get("attribution") or f"{file.name} — {e['license']} ({e['source']})"
    return None
