"""API e interfaz web local (FastAPI). Procesa un trabajo a la vez en una cola en segundo plano."""

from __future__ import annotations

import json
import logging
import os
import queue
import re
import threading
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from ..core.config import load_config
from ..core.logging_setup import setup_logging
from ..core.models import CATEGORIES, STYLES
from ..core.pipeline import JobOptions, Pipeline
from ..storage.history import History

log = logging.getLogger("video_factory.web")

cfg = load_config()
setup_logging(cfg.path("logs"))
history = History(cfg.path("data") / "history.db")
pipeline = Pipeline(cfg, history)
EXAMPLES_DIR = cfg.root / "examples"
STATIC_DIR = Path(__file__).parent / "static"

_JOB_ID = re.compile(r"^[\w-]{1,64}$")
_FILES = {
    "video.mp4": "video/mp4", "thumbnail.jpg": "image/jpeg", "script.md": "text/markdown; charset=utf-8",
    "metadata.json": "application/json", "subtitles.srt": "application/x-subrip; charset=utf-8",
    "content.json": "application/json", "report.json": "application/json",
    "research.md": "text/markdown; charset=utf-8", "job.log": "text/plain; charset=utf-8",
    "cost.json": "application/json",
}

_queue: "queue.Queue[str]" = queue.Queue()


def _worker() -> None:
    while True:
        job_id = _queue.get()
        try:
            pipeline.run(job_id)
        except Exception:  # el error queda registrado en el historial y en job.log
            log.exception("Fallo en el trabajo %s", job_id)
        finally:
            _queue.task_done()


threading.Thread(target=_worker, name="video-worker", daemon=True).start()

app = FastAPI(title="AI Video Factory", version="0.1.0")


class JobRequest(BaseModel):
    topic: str = Field(default="", max_length=200)
    category: str = "curiosidades"
    duration_s: int = 40
    style: str | None = None
    voice: str = "masculina"
    speed: float = 1.0
    example: str | None = None  # nombre de un archivo de examples/ para generar sin IA


def _examples() -> list[dict[str, str]]:
    out = []
    for f in sorted(EXAMPLES_DIR.glob("*.json")):
        try:
            data = json.loads(f.read_text("utf-8"))
            out.append({"name": f.name, "title": data.get("title", f.stem), "category": data.get("category", "")})
        except (json.JSONDecodeError, OSError):
            continue
    return out


@app.get("/api/options")
def options() -> dict[str, Any]:
    v = cfg.video
    return {
        "categories": list(CATEGORIES),
        "styles": list(STYLES),
        "voices": [{"id": k, "label": val["label"]} for k, val in pipeline.tts.available_voices().items()],
        "duration": {"min": v["min_duration_s"], "max": v["max_duration_s"], "default": v["default_duration_s"]},
        "speed": {"min": 0.8, "max": cfg.audio["max_speed"]},
        "ai_available": bool(os.getenv("ANTHROPIC_API_KEY")),
        "model": cfg.llm["model"],
        "web_search": cfg.llm["web_search"]["enabled"],
        "examples": _examples(),
        "spent_today_usd": round(history.spent_today_usd(), 4),
        "daily_budget_usd": cfg.limits["daily_budget_usd"],
    }


@app.post("/api/jobs")
def create_job(req: JobRequest) -> dict[str, str]:
    content_file = None
    category = req.category
    topic = req.topic.strip()
    if req.example:
        path = (EXAMPLES_DIR / req.example).resolve()
        if path.parent != EXAMPLES_DIR.resolve() or not path.exists():
            raise HTTPException(400, "Ejemplo no válido")
        data = json.loads(path.read_text("utf-8"))
        content_file, category, topic = str(path), data.get("category", category), data.get("topic", topic)
    elif not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(400, "No hay ANTHROPIC_API_KEY configurada: usa un ejemplo o configura la clave en .env")
    opts = JobOptions(topic=topic, category=category, duration_s=req.duration_s, voice=req.voice,
                      speed=req.speed, style=req.style or None, content_file=content_file)
    try:
        job_id = pipeline.create_job(opts)
    except Exception as exc:  # errores de validación de opciones
        raise HTTPException(400, str(exc)) from exc
    _queue.put(job_id)
    return {"job_id": job_id}


def _job_dir(job_id: str) -> Path:
    if not _JOB_ID.match(job_id):
        raise HTTPException(404, "Trabajo no encontrado")
    return cfg.path("output") / job_id


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text("utf-8")) if path.exists() else None


@app.get("/api/jobs")
def list_jobs(limit: int = 50) -> list[dict[str, Any]]:
    return history.list_jobs(min(max(limit, 1), 200))


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    job = history.get_job(job_id) if _JOB_ID.match(job_id) else None
    if not job:
        raise HTTPException(404, "Trabajo no encontrado")
    d = _job_dir(job_id)
    job["queue_position"] = list(_queue.queue).index(job_id) + 1 if job_id in list(_queue.queue) else 0
    job["content"] = _read_json(d / "content.json")
    job["metadata"] = _read_json(d / "metadata.json")
    job["report"] = _read_json(d / "report.json")
    job["timeline_summary"] = None
    tl = _read_json(d / "timeline.json")
    if tl:
        job["timeline_summary"] = [{"id": s["id"], "start": s["start"], "end": s["end"], "type": s["scene"]["type"],
                                    "role": s["scene"]["role"]} for s in tl["scenes"]]
    job["files"] = [n for n in _FILES if (d / n).exists()]
    return job


@app.get("/api/jobs/{job_id}/files/{name}")
def get_file(job_id: str, name: str, download: bool = False) -> FileResponse:
    if name not in _FILES:
        raise HTTPException(404, "Archivo no disponible")
    path = _job_dir(job_id) / name
    if not path.exists():
        raise HTTPException(404, "Archivo no encontrado")
    filename = f"{job_id}-{name}" if download else None
    return FileResponse(path, media_type=_FILES[name], filename=filename)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
