"""Hashtags de publicación: pocos y ordenados (config/hashtags.json).

YouTube muestra sobre el título solo los 3 primeros hashtags de la descripción, y con más de 15 puede ignorarlos todos.
Por eso se eligen: 1) los del tema del guion, 2) los del área (espacio, tierra, animales…, según sus escenas 3D),
3) generales del canal (#ciencia / #science), y #shorts en los Shorts. Sin repetir, hasta el máximo configurado.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from .models import VideoContent

CONFIG = Path(__file__).resolve().parents[3] / "config" / "hashtags.json"


def _load(path: Path = CONFIG) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def area(content: VideoContent, cfg: dict) -> str | None:
    """Área dominante según el prefijo de las escenas 3D (luna_, tsu_, gato_…)."""
    prefixes = Counter((s.model3d or "").split("_")[0] for s in content.scenes if s.model3d)
    best, votes = None, 0
    for name, a in cfg["areas"].items():
        n = sum(prefixes[p] for p in a["prefijos"])
        if n > votes:
            best, votes = name, n
    return best


def choose(content: VideoContent, cfg: dict | None = None) -> list[str]:
    cfg = cfg or _load()
    lang = "en" if content.language == "en" else "es"
    skip = {x.lower() for x in cfg["excluir"]}
    topic = [h for h in content.hashtags if h.lstrip("#").lower() not in skip]
    a = area(content, cfg)
    area_tags = cfg["areas"][a][lang] if a else []
    general = cfg["generales"][lang]
    limit = int(cfg["maximo"])
    # Visibles sobre el título: el tema principal, el general del canal y el área.
    ordered = topic[:1] + general[:1] + area_tags[:1] + topic[1:3] + area_tags[1:] + general[1:]
    out: list[str] = []
    for h in ordered:
        if h.lower() not in {x.lower() for x in out}:
            out.append(h)
    out = out[:limit]
    if content.format == "short":
        out.append(cfg["shorts"][lang])
    return out
