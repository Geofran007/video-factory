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
                    "illustration", "timeline", "cartoon", "scene3d"]
# Escenas 3D con Three.js (templates/runtime/three-scenes.js).
Model3D = Literal["ball", "room", "pool", "pyramid", "earth",
                  # Galápagos (templates/runtime/galapagos-3d.js), a pantalla completa
                  "gal_map", "gal_ages", "gal_hotspot", "gal_plate", "gal_volcano", "gal_drift", "gal_conveyor",
                  "gal_flyover", "gal_seamounts", "gal_life", "gal_beagle", "gal_final", "gal_outro",
                  "and_hook", "and_avenue", "and_rise", "and_cotopaxi", "and_final", "and_outro", "and_globe",
                  "sub_plates", "sub_push", "sub_melt", "sub_rise", "sub_row",
                  # Espacio (espacio-3d.js), cielo (cielo-3d.js) y Canal de Panamá (panama-3d.js)
                  "luna_hook", "luna_myth", "luna_half", "luna_orbit", "luna_new", "luna_quarter", "luna_full",
                  "luna_cycle", "luna_face", "luna_outro",
                  "est_hook", "est_distance", "est_tilt", "est_june", "est_rays", "est_december", "est_orbit",
                  "est_equator", "est_outro",
                  "cielo_hook", "cielo_prism", "cielo_molecules", "cielo_scatter", "cielo_everywhere", "cielo_violet",
                  "cielo_sunset", "cielo_moon", "cielo_outro",
                  "pan_hook", "pan_route", "pan_shortcut", "pan_profile", "pan_enter", "pan_fill", "pan_steps",
                  "pan_water", "pan_outro",
                  # Tanda 2: rayos (rayo-3d.js), arcoíris (cielo-3d.js), eclipses (espacio-3d.js), corazón (corazon-3d.js)
                  "ray_hook", "ray_cloud", "ray_charges", "ray_leader", "ray_strike", "ray_heat", "ray_thunder",
                  "ray_count", "ray_tower", "ray_outro",
                  "arco_hook", "arco_recipe", "arco_drop", "arco_split", "arco_many", "arco_cone", "arco_circle",
                  "arco_double", "arco_yours", "arco_outro",
                  "ecl_hook", "ecl_size", "ecl_same", "ecl_solar", "ecl_path", "ecl_tilt", "ecl_lunar", "ecl_red",
                  "ecl_future", "ecl_outro",
                  "cor_hook", "cor_size", "cor_two", "cor_lungs", "cor_body", "cor_spark", "cor_squeeze", "cor_valves",
                  "cor_liters", "cor_outro"]
# Caricatura: personajes originales del proyecto que actúan sobre un escenario (templates/runtime/cartoon.js).
Setting = Literal["house", "street", "train", "great_hall", "sky", "corridor", "forest", "chessboard", "castle_night",
                  "mirror_room"]
Character = Literal["hero", "friend_boy", "friend_girl", "giant", "aunt", "uncle", "professor", "turban", "elder",
                    "villain", "dog3", "owl"]
Action = Literal["idle", "talk", "walk_in", "run", "sleepy", "shocked", "jump_joy", "wave", "point", "cast_spell",
                 "hold_up", "read", "fly", "sneak", "cower", "fall", "float", "angry", "crumble"]
FxType = Literal["pow", "bubble", "thought", "confetti", "sparkles", "hearts", "dust", "zzz", "flash", "spell"]
Prop = Literal["wand", "book", "letter", "stone"]
Transition = Literal["fade", "slide", "zoom", "wipe", "cut"]
SfxName = Literal["none", "whoosh", "impact", "riser", "pop", "ding", "bubbles"]
Illustration = Literal["shark", "ancient_shark", "tree", "dinosaur", "human", "wizard", "trio", "hooded", "castle", "owl",
                       "letter", "wand", "lightning", "wizard_hat", "magic_stone", "broom", "three_headed_dog",
                       "train", "chess_knight", "mirror", "balloon", "balloons_person", "balloons_car",
                       "balloons_elephant", "balloons_whale", "water_glass", "water_person", "water_bathtub",
                       "water_pool", "water_earth"]
PresenterAction = Literal["none", "float_away"]
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


class CastMember(BaseModel):
    character: Character
    action: Action = "idle"
    x: float = Field(default=0.5, ge=0, le=1, description="Posición horizontal (0 = izquierda, 1 = derecha)")
    facing: Literal[1, -1] = 1
    at: float = Field(default=0, ge=0, le=20, description="Segundos desde el inicio de la escena en que empieza")
    prop: Prop | None = None


class Fx(BaseModel):
    type: FxType
    text: str = Field(default="", max_length=14)
    at: float = Field(default=0, ge=0, le=20)
    x: float = Field(default=0.5, ge=0, le=1)
    y: float | None = Field(default=None, ge=0, le=1, description="0 = arriba de la zona segura, 1 = abajo")
    x2: float | None = Field(default=None, ge=0, le=1, description="Destino del hechizo (spell)")
    dur: float | None = Field(default=None, gt=0, le=10)


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
    model3d: Model3D | None = Field(default=None, description="Escena 3D para scene3d")
    setting: Setting | None = Field(default=None, description="Escenario de la caricatura")
    cast: list[CastMember] = Field(default_factory=list, description="1-5 personajes de la caricatura")
    fx: list[Fx] = Field(default_factory=list, description="Efectos de cómic (máx. 6)")
    sfx: SfxName = "none"
    transition: Transition = "fade"
    presenter_action: PresenterAction = Field(default="none", description="float_away: el presentador se va volando con un globo")

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
        if self.type == "scene3d" and not self.model3d:
            raise ValueError(f"escena {self.id}: scene3d requiere el campo model3d")
        if self.type == "cartoon" and (not self.setting or not 1 <= len(self.cast) <= 5 or len(self.fx) > 6):
            raise ValueError(f"escena {self.id}: cartoon requiere setting, entre 1 y 5 personajes y como máximo 6 efectos")
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
    language: Literal["es", "en"] = Field(default="es", description="Idioma de la narración y los textos")
    presenter: str | None = Field(default=None, pattern=r"^[a-z0-9_-]{1,40}$",
                                  description="Presentador fijo arriba: templates/presenters/<nombre>.png")

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
        if not (3 <= len(self.scenes) <= 24):
            raise ValueError("el video debe tener entre 3 y 24 escenas")
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
    presenter: str | None = None
    language: str = "es"

    @property
    def frame_count(self) -> int:
        return max(1, round(self.duration * self.fps))
