"""Interfaz de publicación (preparada para la Fase 2; sin implementaciones en esta fase).

En la Fase 2 se añadirán YouTubeShortsPublisher (YouTube Data API v3) y TikTokPublisher
(Content Posting API), cada uno con sus credenciales OAuth por canal en variables de entorno
o en un gestor de secretos. Aquí no hay llamadas simuladas: publicar lanza NotImplementedError.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Protocol

Visibility = Literal["private", "unlisted", "public"]


@dataclass
class PublishRequest:
    video_path: Path
    title: str
    description: str
    tags: list[str]
    channel_id: str  # permite configurar varios canales
    visibility: Visibility = "private"
    thumbnail_path: Path | None = None
    extra: dict[str, str] = field(default_factory=dict)


@dataclass
class PublishResult:
    platform: str
    remote_id: str
    url: str


class Publisher(Protocol):
    platform: str

    def validate(self, request: PublishRequest) -> list[str]:
        """Devuelve los problemas que impedirían publicar (duración, tamaño, metadatos)."""
        ...

    def publish(self, request: PublishRequest) -> PublishResult: ...


def get_publisher(platform: str) -> Publisher:
    raise NotImplementedError(
        f"La publicación en '{platform}' no está implementada en la Fase 1. "
        "Los metadatos ya se generan en metadata.json → platforms."
    )
