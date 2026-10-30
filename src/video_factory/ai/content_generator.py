"""Generación de contenido: temas, investigación y guion estructurado.

Esta capa no sabe nada de audio ni de video: produce un VideoContent validado.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from pydantic import BaseModel, Field

from ..core.errors import ContentGenerationError
from ..core.interfaces import LLMUsage
from ..core.models import VideoContent
from ..validation.sources import verify_claims
from . import prompts
from .topic_registry import find_duplicate

log = logging.getLogger("video_factory.ai.content")


class TopicIdea(BaseModel):
    topic: str
    angle: str
    why_verifiable: str


class TopicList(BaseModel):
    topics: list[TopicIdea] = Field(description="Lista de temas propuestos")


@dataclass
class GenerationOutput:
    content: VideoContent
    research_notes: str = ""
    researched_urls: list[str] = field(default_factory=list)
    usage: list[tuple[str, LLMUsage]] = field(default_factory=list)

    @property
    def cost_usd(self) -> float:
        return round(sum(u.cost_usd for _, u in self.usage), 6)


class ContentGenerator:
    def __init__(
        self,
        llm,  # ClaudeProvider u otro con research() y generate_structured()
        *,
        prompts_dir: Path,
        words_per_second: float,
        web_search: dict,
        recent_topics: Callable[[], list[str]] = lambda: [],
    ):
        self.llm = llm
        self.prompts_dir = prompts_dir
        self.wps = words_per_second
        self.web_search = web_search
        self.recent_topics = recent_topics

    def _recent_block(self) -> str:
        recent = self.recent_topics()[:40]
        return "; ".join(recent) if recent else "(ninguno)"

    def generate_topics(self, category: str, count: int = 5) -> tuple[list[TopicIdea], LLMUsage]:
        system, user = prompts.load_prompt(
            self.prompts_dir, "topic-generator", count=count, category=category, recent_topics=self._recent_block()
        )
        result = self.llm.generate_structured(system=system, prompt=user, output_model=TopicList)
        previous = self.recent_topics()
        fresh = [t for t in result.data.topics if not find_duplicate(t.topic, previous)]
        return fresh, result.usage

    def generate(self, *, topic: str, category: str, duration_s: int) -> GenerationOutput:
        usage: list[tuple[str, LLMUsage]] = []
        notes = ""
        researched: list[str] | None = None

        if self.web_search.get("enabled"):
            system, user = prompts.load_prompt(
                self.prompts_dir, "research", topic=topic, category=category, duration=duration_s
            )
            res = self.llm.research(system=system, prompt=user, max_searches=int(self.web_search.get("max_uses", 3)))
            usage.append(("research", res.usage))
            notes = res.data
            researched = [c["url"] for c in res.citations]
            if not researched:
                log.warning("La investigación no devolvió URLs; todo el contenido quedará para revisión")
            research_block = (
                "Usa EXCLUSIVAMENTE estos hechos investigados y sus URLs como fuentes. "
                "No añadas datos que no estén aquí.\n\n" + notes +
                "\n\nURLs válidas encontradas en la búsqueda:\n" + "\n".join(f"- {u}" for u in researched)
            )
        else:
            research_block = (
                "No hay búsqueda web disponible. Usa solo conocimiento ampliamente establecido, cita fuentes "
                "reconocidas que conozcas con URL y marca `confidence` como «media» o «baja»: "
                "todo quedará para revisión humana."
            )

        target_words = round(duration_s * self.wps)
        system, user = prompts.load_prompt(
            self.prompts_dir,
            "script-generator",
            topic=topic,
            category=category,
            duration=duration_s,
            target_words=target_words,
            min_scenes=4 if duration_s <= 30 else 5,
            max_scenes=6 if duration_s <= 30 else 8,
            scene_guide=prompts.load_fragment(self.prompts_dir, "scene-generator"),
            research_block=research_block,
            recent_topics=self._recent_block(),
        )
        result = self.llm.generate_structured(system=system, prompt=user, output_model=VideoContent)
        usage.append(("script", result.usage))
        content: VideoContent = result.data
        if content.category != category:
            content.category = category  # la categoría la decide el usuario, no la IA

        words = content.word_count
        if not (0.6 * target_words <= words <= 1.4 * target_words):
            raise ContentGenerationError(
                f"El guion tiene {words} palabras y se esperaban ≈{target_words}; no encaja en {duration_s}s"
            )
        verify_claims(content, researched_urls=set(researched) if researched is not None else None)
        return GenerationOutput(content=content, research_notes=notes, researched_urls=researched or [], usage=usage)
