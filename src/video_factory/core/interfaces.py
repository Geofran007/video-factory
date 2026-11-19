"""Interfaces intercambiables.

Cada proveedor (LLM, voz, renderizador, almacenamiento, publicación) se implementa
detrás de uno de estos protocolos para poder sustituirlo sin tocar el pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Protocol, TypeVar

from pydantic import BaseModel

from .models import Timeline

T = TypeVar("T", bound=BaseModel)


@dataclass
class LLMUsage:
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    web_search_requests: int = 0
    cost_usd: float = 0.0


@dataclass
class LLMResult:
    data: Any
    usage: LLMUsage
    citations: list[dict[str, str]] = field(default_factory=list)
    request_id: str | None = None


class LLMProvider(Protocol):
    """Genera datos estructurados validados contra un modelo Pydantic."""

    def generate_structured(
        self,
        *,
        system: str,
        prompt: str,
        output_model: type[T],
        use_web_search: bool = False,
    ) -> LLMResult: ...


@dataclass
class SynthesisItem:
    text: str
    out: Path


@dataclass
class SynthesisResult:
    path: Path
    duration: float
    sample_rate: int
    # Número de fonemas por palabra pronunciada (para repartir tiempos de subtítulos), si el motor lo ofrece.
    word_phonemes: list[int] | None = None


class TTSProvider(Protocol):
    """Convierte texto en WAV PCM16 mono. Debe devolver la duración real de cada audio."""

    name: str

    def synthesize_many(self, items: list[SynthesisItem], *, voice: str, speed: float = 1.0,
                        language: str = "es") -> list[SynthesisResult]: ...

    def available_voices(self) -> dict[str, dict[str, Any]]: ...

    def voice_info(self, voice: str) -> dict[str, Any]: ...


ProgressCallback = Callable[[float], None]


class Renderer(Protocol):
    """Renderiza una línea de tiempo a un video sin audio (H.264)."""

    def render(self, timeline: Timeline, out_path: Path, *, progress: ProgressCallback | None = None) -> Path: ...


class StorageBackend(Protocol):
    """Destino final de los archivos generados (local en Fase 1; S3/Drive en Fase 2)."""

    def save(self, job_id: str, local_path: Path) -> str: ...

    def url_for(self, job_id: str, name: str) -> str: ...
