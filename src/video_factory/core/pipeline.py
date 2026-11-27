"""Orquestador: tema → contenido → narración → línea de tiempo → render → mezcla → MP4 → QA.

Cada etapa guarda su artefacto en output/<job_id>/. Si un trabajo se reanuda, las etapas
cuyo artefacto ya existe no se repiten (en particular, no se vuelve a pagar la llamada a Claude).
"""

from __future__ import annotations

import json
import math
import logging
import shutil
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

from ..audio import audio_mixer, music, sound_effects
from ..audio.narration import build_narration
from ..audio.tts_provider import create_tts
from ..core.config import AppConfig
from ..core.errors import BudgetExceededError, ConfigurationError, ValidationError, VideoFactoryError
from ..core.logging_setup import job_log_handler, remove_handler
from ..core.models import CATEGORIES, STYLES, Timeline, VideoContent
from ..storage.history import History
from ..timeline.subtitle_generator import to_srt
from ..timeline.timeline_builder import build_timeline
from ..validation import media_qa
from ..validation.sources import verify_claims
from ..video.html_renderer import PlaywrightRenderer, render_thumbnail
from ..video.video_composer import compose, thumbnail

log = logging.getLogger("video_factory.pipeline")

StatusCallback = Callable[[str, float], None]

# Peso de cada etapa en la barra de progreso.
_STAGES = {"content": (0.0, 0.12), "audio": (0.12, 0.25), "timeline": (0.25, 0.27), "render": (0.27, 0.88),
           "mix": (0.88, 0.92), "compose": (0.92, 0.95), "qa": (0.95, 1.0)}


@dataclass
class JobOptions:
    topic: str
    category: str = "curiosidades"
    duration_s: int = 40
    voice: str = "masculina"
    speed: float = 1.0
    style: str | None = None
    content_file: str | None = None  # usar contenido existente en lugar de llamar a la IA
    # Solo con content_file: una persona verificó manualmente las fuentes listadas. Aun así se comprueba
    # que cada URL responda y que la confianza declarada sea alta.
    sources_verified: bool = False

    def validate(self, cfg: AppConfig) -> None:
        v = cfg.video
        if self.category not in CATEGORIES:
            raise ValidationError(f"Categoría inválida: {self.category}")
        if self.style and self.style not in STYLES:
            raise ValidationError(f"Estilo inválido: {self.style}")
        if not v["min_duration_s"] <= self.duration_s <= v["max_duration_s"]:
            raise ValidationError(f"La duración debe estar entre {v['min_duration_s']} y {v['max_duration_s']} s")
        if not self.content_file and not 3 <= len(self.topic.strip()) <= cfg.limits["max_topic_chars"]:
            raise ValidationError("La temática debe tener entre 3 y 200 caracteres")
        if not 0.8 <= self.speed <= cfg.audio["max_speed"]:
            raise ValidationError(f"Velocidad de voz fuera de rango (0.8-{cfg.audio['max_speed']})")


class Pipeline:
    def __init__(self, cfg: AppConfig, history: History, *, llm: Any | None = None):
        self.cfg = cfg
        self.history = history
        self._llm = llm
        self.tts = create_tts(cfg.tts, cfg.root, cfg.path("models"))
        self.renderer = PlaywrightRenderer(cfg.path("templates"), cfg.video)

    # ----------------------------------------------------------- dependencias

    def _budget_check(self) -> None:
        spent = self.history.spent_today_usd()
        budget = float(self.cfg.limits["daily_budget_usd"])
        if spent >= budget:
            raise BudgetExceededError(f"Presupuesto diario agotado: ${spent:.3f} de ${budget:.2f}")

    def llm(self) -> Any:
        if self._llm is None:
            from ..ai.claude_provider import ClaudeProvider

            self._llm = ClaudeProvider(self.cfg.llm, max_retries=int(self.cfg.limits["max_llm_retries"]),
                                       budget_check=self._budget_check)
        return self._llm

    def content_generator(self) -> Any:
        from ..ai.content_generator import ContentGenerator

        return ContentGenerator(self.llm(), prompts_dir=self.cfg.path("prompts"),
                                words_per_second=float(self.cfg.audio["words_per_second"]),
                                web_search=self.cfg.llm["web_search"], recent_topics=self.history.recent_topics)

    # ----------------------------------------------------------------- trabajos

    def create_job(self, options: JobOptions) -> str:
        options.validate(self.cfg)
        job_id = datetime.now().strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]
        job_dir = self.cfg.path("output") / job_id
        job_dir.mkdir(parents=True)
        (job_dir / "options.json").write_text(json.dumps(asdict(options), ensure_ascii=False, indent=2), "utf-8")
        topic = options.topic or Path(options.content_file or "").stem
        self.history.create_job(job_id, topic=topic, category=options.category, output_dir=job_dir,
                                options_json=json.dumps(asdict(options), ensure_ascii=False))
        return job_id

    def run(self, job_id: str, on_status: StatusCallback | None = None) -> dict[str, Any]:
        job_dir = self.cfg.path("output") / job_id
        options = JobOptions(**json.loads((job_dir / "options.json").read_text("utf-8")))
        handler = job_log_handler(job_dir)
        started = time.time()
        stage = "content"

        def status(name: str, frac: float = 0.0) -> None:
            nonlocal stage
            stage = name
            if time.time() - started > float(self.cfg.limits["max_job_seconds"]):
                raise VideoFactoryError("Se superó el tiempo máximo por trabajo")
            lo, hi = _STAGES[name]
            p = round(lo + (hi - lo) * frac, 4)
            self.history.update_job(job_id, status="running", stage=name, progress=p)
            if on_status:
                on_status(name, p)

        try:
            result = self._run(job_id, job_dir, options, status)
            self.history.update_job(job_id, status="done" if result["qa"]["passed"] else "qa_failed",
                                    stage="done", progress=1.0, duration_s=result["duration_s"],
                                    needs_review=int(result["needs_review"]), title=result["title"],
                                    error=None if result["qa"]["passed"] else "; ".join(result["qa_failures"]))
            log.info("Trabajo %s terminado en %.1fs", job_id, time.time() - started)
            return result
        except Exception as exc:  # se registra cualquier fallo con la etapa en la que ocurrió
            log.exception("Trabajo %s falló en la etapa %s", job_id, stage)
            self.history.update_job(job_id, status="failed", stage=stage, error=f"[{stage}] {exc}")
            raise
        finally:
            remove_handler(handler)

    # ------------------------------------------------------------------ etapas

    def _content(self, job_id: str, job_dir: Path, options: JobOptions) -> VideoContent:
        path = job_dir / "content.json"
        if path.exists():
            return VideoContent.model_validate_json(path.read_text("utf-8"))
        if options.content_file:
            content = VideoContent.model_validate_json(Path(options.content_file).read_text("utf-8"))
            manual = {s.url for s in content.sources} if options.sources_verified else None
            verify_claims(content, researched_urls=manual)
            if manual is not None:
                for c in content.claims:
                    if c.status == "verified":
                        c.review_note = "verificado manualmente"
        else:
            gen = self.content_generator()
            out = gen.generate(topic=options.topic, category=options.category, duration_s=options.duration_s)
            content = out.content
            for purpose, usage in out.usage:
                self.history.record_usage(job_id, purpose, usage)
            cost = out.cost_usd
            self.history.update_job(job_id, cost_usd=cost)
            (job_dir / "research.md").write_text(out.research_notes or "(sin investigación web)", "utf-8")
            (job_dir / "cost.json").write_text(json.dumps(
                {"total_usd": cost, "calls": [{"purpose": p, **asdict(u)} for p, u in out.usage]}, indent=2), "utf-8")
            log.info("Contenido generado: %d palabras, costo $%.4f", content.word_count, cost)
        path.write_text(content.model_dump_json(indent=2), "utf-8")
        return content

    def _run(self, job_id: str, job_dir: Path, options: JobOptions, status: Callable[[str, float], None]) -> dict[str, Any]:
        cfg = self.cfg
        status("content")
        content = self._content(job_id, job_dir, options)
        self.history.update_job(job_id, title=content.title, needs_review=int(content.needs_review))

        status("audio")
        if options.voice not in self.tts.available_voices():
            raise ConfigurationError(f"La voz '{options.voice}' no está instalada (python scripts/setup_voices.py)")
        voice = self.tts.voice_info(options.voice)
        # Los videos largos (horizontales) cambian tamaño, duración y subtítulos; el resto es común.
        long_cfg = cfg.settings["video_long"] if content.format == "long" else {}
        video_cfg = {**cfg.video, **long_cfg}
        subtitle_cfg = {**cfg.settings["subtitles"],
                        **{k: v for k, v in long_cfg.items() if k == "max_words_per_cue"}}
        speed = options.speed
        narration = build_narration(content, self.tts, voice=options.voice, speed=speed,
                                    audio_cfg=cfg.audio, work_dir=job_dir / "narration_parts")
        max_s = float(video_cfg["max_duration_s"])
        if narration.duration > max_s:
            speed = min(float(cfg.audio["max_speed"]), speed * narration.duration / max_s * 1.03)
            log.warning("Narración de %.1fs supera %ss; se acelera la voz a %.2f", narration.duration, max_s, speed)
            narration = build_narration(content, self.tts, voice=options.voice, speed=speed,
                                        audio_cfg=cfg.audio, work_dir=job_dir / "narration_parts")
        status("audio", 1.0)

        status("timeline")
        timeline = build_timeline(content, narration, video_cfg=video_cfg, subtitle_cfg=subtitle_cfg,
                                  voice_attribution=voice.get("attribution"), style=options.style)
        (job_dir / "timeline.json").write_text(timeline.model_dump_json(indent=2), "utf-8")
        (job_dir / "subtitles.srt").write_text(to_srt(timeline.cues), "utf-8")
        report = media_qa.QAReport()
        media_qa.check_timeline(timeline, report, min_s=float(video_cfg["min_duration_s"]), max_s=max_s)
        if not report.passed:
            raise ValidationError("Línea de tiempo inválida: " + "; ".join(f"{c.name} ({c.detail})" for c in report.failures()))

        status("render")
        video_only = self.renderer.render(timeline, job_dir / "video_noaudio.mp4",
                                          progress=lambda f: status("render", f))

        status("mix")
        cache = cfg.path("data") / "cache" / "sfx"
        sfx_files = {name: sound_effects.sfx_path(name, cache, cfg.path("assets")) for name in {e.name for e in timeline.sfx}}
        music_path, music_credit = music.music_bed(timeline.style, timeline.duration, job_dir / "music.wav", cfg.path("assets"))
        mixed = audio_mixer.mix(timeline, narration.path, music_path, sfx_files, job_dir / "mix.wav", cfg.audio)
        media_qa.check_audio_file(narration.path, report, name="narracion", max_peak_dbfs=float(cfg.qa["max_peak_dbfs"]))

        status("compose")
        final = compose(timeline, video_only, mixed, job_dir / "video.mp4")
        if content.thumbnail:
            th = content.thumbnail
            render_thumbnail(cfg.path("templates"), timeline, th.scene_id, th.at, th.text, th.highlight,
                             job_dir / "thumbnail.jpg")
        else:
            thumbnail(final, job_dir / "thumbnail.jpg", at=min(1.5, timeline.duration / 3))

        status("qa")
        info = media_qa.check_video(final, timeline, report, cfg.qa,
                                    float(video_cfg.get("max_output_mb", cfg.limits["max_output_mb"])))
        (job_dir / "report.json").write_text(json.dumps(report.to_dict(), ensure_ascii=False, indent=2), "utf-8")
        metadata = build_metadata(content, timeline, voice, music_credit, info)
        (job_dir / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), "utf-8")
        (job_dir / "script.md").write_text(script_markdown(content, timeline), "utf-8")

        if report.passed:  # los intermedios pesados solo se conservan si hay que depurar
            for name in ("video_noaudio.mp4", "music.wav", "mix.wav"):
                (job_dir / name).unlink(missing_ok=True)
        status("qa", 1.0)
        return {
            "job_id": job_id, "title": content.title, "video": str(final), "duration_s": round(timeline.duration, 2),
            "needs_review": content.needs_review, "qa": report.to_dict(),
            "qa_failures": [f"{c.name}: {c.detail}" for c in report.failures()],
        }


def chapter_list(timeline: Timeline, intro: str) -> str:
    """Capítulos para la descripción de YouTube («0:00 Introducción»…); vacío si el video no tiene capítulos."""
    marks = [(ts.start, ts.scene.chapter) for ts in timeline.scenes if ts.scene.chapter]
    if not marks:
        return ""
    if marks[0][0] > 0:
        marks.insert(0, (0.0, intro))
    # Se redondea hacia arriba para que el salto no caiga en la escena anterior.
    stamps = [(math.ceil(t), title) for t, title in marks]
    return "\n".join(f"{s // 60}:{s % 60:02d} {title}" for s, title in stamps) + "\n\n"


def build_metadata(content: VideoContent, timeline: Timeline, voice: dict, music_credit: str, info: dict) -> dict[str, Any]:
    en = content.language == "en"
    # La etiqueta de la voz lleva notas internas («· Chatterbox (muy lenta…)»): solo se publica el nombre.
    voice_name = voice["label"].split(" · ")[0]
    if voice.get("license") == "Voz propia del autor":
        credits = ["Voice: the creator's own voice, cloned with AI" if en else "Voz: la del autor, clonada con IA"]
    else:
        credits = [f"{'Voice' if en else 'Voz'}: {voice_name} ({voice['license']})"]
    if voice.get("attribution"):
        credits.append(voice["attribution"])
    music = "Original music generated by AI Video Factory" if en and music_credit.startswith("Música original") else music_credit
    credits.append(f"{'Music' if en else 'Música'}: {music}")
    chapters = chapter_list(timeline, "Intro" if en else "Introducción")
    sources = "\n".join(f"- {s.title} ({s.publisher}): {s.url}" for s in content.sources)
    labels = ("Sources", "Credits") if en else ("Fuentes", "Créditos")
    description = (f"{content.description}\n\n{chapters}{' '.join(content.hashtags)}\n\n{labels[0]}:\n{sources}\n\n{labels[1]}:\n"
                   + "\n".join(f"- {c}" for c in credits))
    tags = [h.lstrip("#") for h in content.hashtags]
    return {
        "title": content.title,
        "language": content.language,
        "format": content.format,
        "own_voice": voice.get("license") == "Voz propia del autor",
        "description": description,
        "hashtags": content.hashtags,
        "category": content.category,
        "style": timeline.style,
        "duration_s": round(timeline.duration, 2),
        "needs_review": content.needs_review,
        "claims": [c.model_dump() for c in content.claims],
        "sources": [s.model_dump() for s in content.sources],
        "credits": credits,
        "video": info,
        # Datos que usa el publicador de YouTube (publishers/youtube.py).
        "platforms": {
            "youtube_shorts": {"title": content.title[:100], "description": description[:5000], "tags": tags[:15],
                               "category_id": "27", "made_for_kids": False},
            "tiktok": {"caption": (content.title + " " + " ".join(content.hashtags))[:2200]},
        },
    }


def script_markdown(content: VideoContent, timeline: Timeline) -> str:
    lines = [f"# {content.title}", "", f"**Tema:** {content.topic}  ", f"**Categoría:** {content.category}  ",
             f"**Duración:** {timeline.duration:.1f} s", "", f"**Gancho:** {content.hook}", "", "## Guion por escenas", ""]
    for ts in timeline.scenes:
        s = ts.scene
        lines += [f"### {ts.index + 1}. {s.role} · {s.type} ({ts.start:.1f}–{ts.end:.1f} s)",
                  f"- Narración: {s.narration}", f"- En pantalla: {s.on_screen_text}",
                  f"- Efecto: {s.sfx} · Transición: {s.transition}", ""]
    lines += ["## Afirmaciones y verificación", ""]
    for c in content.claims:
        mark = "✅" if c.status == "verified" else "⚠️ revisar"
        lines.append(f"- {mark} {c.statement}" + (f" — {c.review_note}" if c.review_note else ""))
    lines += ["", "## Fuentes", ""] + [f"- [{s.title}]({s.url}) — {s.publisher}" for s in content.sources]
    lines += ["", "## Descripción", "", content.description, "", " ".join(content.hashtags)]
    return "\n".join(lines) + "\n"


def cleanup_job(job_dir: Path) -> None:
    shutil.rmtree(job_dir, ignore_errors=True)
