"""Modelos de datos compartidos entre módulos.

El contenido generado por la IA (VideoContent) y la línea de tiempo (Timeline) son
los únicos contratos entre etapas: la IA no produce código, solo datos que se validan
aquí y que las plantillas HTML interpretan.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Category = Literal["ciencia", "historia", "misterio", "finanzas", "curiosidades"]
# Estilos visuales: uno por categoría más estilos temáticos que se pueden elegir aparte.
Style = Literal["ciencia", "historia", "misterio", "finanzas", "curiosidades", "oceano", "anime"]
SceneRole = Literal["hook", "development", "surprise", "closing"]
SceneType = Literal["title", "statement", "big_number", "list", "comparison", "chart", "icon_fact", "cta",
                    "illustration", "timeline"]
Transition = Literal["fade", "slide", "zoom", "wipe"]
SfxName = Literal["none", "whoosh", "impact", "riser", "pop", "ding", "bubbles"]
Illustration = Literal["shark", "ancient_shark", "tree", "dinosaur", "human"]
Icon = Literal[
    "brain", "heart", "atom", "globe", "clock", "star", "bolt", "eye", "question",
    "chart", "coin", "rocket", "planet", "book", "map", "drop", "fire", "wave",
    "dna", "landmark", "key", "lightbulb", "skull", "crown",
]
Confidence = Literal["alta", "media", "baja"]

CATEGORIES: tuple[str, ...] = Category.__args__  # type: ignore[attr-defined]
STYLES: tuple[str, ...] = Style.__args__  # type: ignore[attr-defined]
ICONS: tuple[str, ...] = Icon.__args__  # type: ignore[attr-defined]


class ChartPoint(BaseModel):
    label: str = Field(max_length=24)
    value: float
    illustration: Illustration | None = None


class Scene(BaseModel):
    id: str = Field(description="Identificador corto y único, p. ej. s1, s2")
    role: SceneRole
    type: SceneType
    narration: str = Field(description="Texto exacto que dirá el narrador en esta escena")
    on_screen_text: str = Field(max_length=90, description="Texto breve que aparece en pantalla")
    highlight_words: list[str] = Field(default_factory=list, description="Palabras del texto en pantalla a resaltar")
    icon: Icon = "lightbulb"
    big_number: str | None = Field(default=None, max_length=16, description="Cifra destacada para big_number")
    number_caption: str | None = Field(default=None, max_length=60)
    items: list[str] = Field(default_factory=list, description="Elementos para list (2-4) o comparison (exactamente 2)")
    chart: list[ChartPoint] = Field(default_factory=list,
                                    description="2-5 puntos para chart; para timeline, millones de años atrás")
    illustration: Illustration | None = Field(default=None, description="Ilustración animada para illustration")
    sfx: SfxName = "none"
    transition: Transition = "fade"

    @field_validator("narration")
    @classmethod
    def _narration_not_empty(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 3:
            raise ValueError("la narración de la escena está vacía")
        return v

    @model_validator(mode="after")
    def _type_requirements(self) -> "Scene":
        if self.type == "big_number" and not self.big_number:
            raise ValueError(f"escena {self.id}: big_number requiere el campo big_number")
        if self.type == "list" and not (2 <= len(self.items) <= 4):
            raise ValueError(f"escena {self.id}: list requiere entre 2 y 4 items")
        if self.type == "comparison" and len(self.items) != 2:
            raise ValueError(f"escena {self.id}: comparison requiere exactamente 2 items")
        if self.type in ("chart", "timeline") and not (2 <= len(self.chart) <= 5):
            raise ValueError(f"escena {self.id}: {self.type} requiere entre 2 y 5 puntos")
        if self.type == "timeline" and any(p.value < 0 for p in self.chart):
            raise ValueError(f"escena {self.id}: timeline usa millones de años atrás (valores ≥ 0)")
        if self.type == "illustration" and not self.illustration:
            raise ValueError(f"escena {self.id}: illustration requiere el campo illustration")
        self.items = [i[:48] for i in self.items]
        return self


class Source(BaseModel):
    title: str
    url: str
    publisher: str = ""


class Claim(BaseModel):
    statement: str = Field(description="Afirmación factual importante del guion")
    scene_id: str
    source_urls: list[str] = Field(default_factory=list)
    confidence: Confidence = "media"
    # Lo asigna el validador de fuentes, nunca la IA.
    status: Literal["verified", "needs_review"] = "needs_review"
    review_note: str = ""


class VideoContent(BaseModel):
    topic: str
    category: Category
    title: str = Field(max_length=100)
    hook: str = Field(description="Frase gancho (0-3 s); debe coincidir con la narración de la primera escena")
    scenes: list[Scene]
    description: str = Field(max_length=2200)
    hashtags: list[str]
    sources: list[Source] = Field(default_factory=list)
    claims: list[Claim] = Field(default_factory=list)

    @field_validator("hashtags")
    @classmethod
    def _normalize_hashtags(cls, v: list[str]) -> list[str]:
        out: list[str] = []
        for tag in v:
            tag = "#" + "".join(ch for ch in tag.lstrip("#") if ch.isalnum() or ch == "_")
            if len(tag) > 1 and tag.lower() not in {t.lower() for t in out}:
                out.append(tag)
        return out[:12]

    @model_validator(mode="after")
    def _structure(self) -> "VideoContent":
        if not (3 <= len(self.scenes) <= 10):
            raise ValueError("el video debe tener entre 3 y 10 escenas")
        ids = [s.id for s in self.scenes]
        if len(set(ids)) != len(ids):
            raise ValueError("los ids de escena deben ser únicos")
        if self.scenes[0].role != "hook":
            raise ValueError("la primera escena debe tener rol hook")
        if self.scenes[-1].role != "closing":
            raise ValueError("la última escena debe tener rol closing")
        if not any(s.role == "surprise" for s in self.scenes):
            raise ValueError("debe existir al menos una escena con rol surprise (dato sorprendente)")
        for claim in self.claims:
            if claim.scene_id not in ids:
                raise ValueError(f"la afirmación '{claim.statement[:40]}' apunta a una escena inexistente")
        return self

    @property
    def word_count(self) -> int:
        return sum(len(s.narration.split()) for s in self.scenes)

    @property
    def needs_review(self) -> bool:
        return any(c.status != "verified" for c in self.claims) or not self.claims


# ---------------------------------------------------------------- Línea de tiempo


class Word(BaseModel):
    text: str
    start: float
    end: float


class Cue(BaseModel):
    start: float
    end: float
    text: str
    words: list[Word]


class SfxEvent(BaseModel):
    name: SfxName
    at: float


class TimelineScene(BaseModel):
    id: str
    index: int
    start: float
    end: float
    narration_start: float
    narration_end: float
    scene: Scene


class Timeline(BaseModel):
    width: int
    height: int
    fps: int
    duration: float
    style: Style
    category: Category | None = None
    title: str
    scenes: list[TimelineScene]
    cues: list[Cue]
    sfx: list[SfxEvent]
    narration_file: str
    voice_attribution: str | None = None

    @property
    def frame_count(self) -> int:
        return max(1, round(self.duration * self.fps))
