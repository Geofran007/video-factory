"""Interfaz de publicación.

Implementado: YouTube (publishers/youtube.py, YouTube Data API v3, subida como privado por defecto).
Pendiente: TikTok (Content Posting API). Credenciales OAuth por canal en variables de entorno.
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


def get_publisher(platform: str, channel: str = "es") -> Publisher:
    if platform == "youtube":
        from .youtube import YouTubePublisher
        return YouTubePublisher(channel)
    raise NotImplementedError(f"La publicación en '{platform}' todavía no está implementada.")
