"""Línea de comandos: generación individual o por lotes, diagnóstico e interfaz web.

Ejemplos:
  video-factory generate --topic "¿Por qué el cielo es azul?" --category ciencia --duration 40
  video-factory generate --content examples/pulpos.json --voice femenina
  video-factory topics --category historia --count 5
  video-factory batch --category curiosidades --count 3 --duration 35
  video-factory doctor
  video-factory serve --port 8000
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from .core.config import load_config
from .core.errors import VideoFactoryError
from .core.logging_setup import setup_logging
from .core.models import CATEGORIES, STYLES
from .core.pipeline import JobOptions, Pipeline
from .storage.history import History


def _pipeline() -> Pipeline:
    cfg = load_config()
    setup_logging(cfg.path("logs"))
    return Pipeline(cfg, History(cfg.path("data") / "history.db"))


def cmd_generate(args: argparse.Namespace) -> int:
    pipe = _pipeline()
    opts = JobOptions(topic=args.topic or "", category=args.category, duration_s=args.duration, voice=args.voice,
                      speed=args.speed, style=args.style, content_file=args.content,
                      sources_verified=bool(args.content and args.sources_verified))
    if args.content:
        data = json.loads(open(args.content, encoding="utf-8").read())
        opts.topic = opts.topic or data.get("topic", "")
        opts.category = data.get("category", opts.category)
    job_id = pipe.create_job(opts)
    print(f"Trabajo {job_id}")
    last = [""]

    def on_status(stage: str, p: float) -> None:
        line = f"  {stage:<9} {int(p * 20) * 5:3d}%"
        if line != last[0]:
            print(line, flush=True)
            last[0] = line

    result = pipe.run(job_id, on_status=on_status)
    print(json.dumps({k: result[k] for k in ("job_id", "title", "video", "duration_s", "needs_review", "qa_failures")},
                     ensure_ascii=False, indent=2))
    return 0 if result["qa"]["passed"] else 2


def cmd_topics(args: argparse.Namespace) -> int:
    pipe = _pipeline()
    topics, usage = pipe.content_generator().generate_topics(args.category, args.count)
    pipe.history.record_usage(None, "topics", usage)
    for t in topics:
        print(f"- {t.topic}\n    gancho: {t.angle}\n    fuente: {t.why_verifiable}")
    print(f"Costo: ${usage.cost_usd:.4f}")
    return 0


def cmd_batch(args: argparse.Namespace) -> int:
    """Genera varios videos con temas propuestos por la IA (preparado para GitHub Actions)."""
    pipe = _pipeline()
    topics, usage = pipe.content_generator().generate_topics(args.category, args.count)
    pipe.history.record_usage(None, "topics", usage)
    failures = 0
    for t in topics[: args.count]:
        opts = JobOptions(topic=t.topic, category=args.category, duration_s=args.duration, voice=args.voice)
        job_id = pipe.create_job(opts)
        try:
            result = pipe.run(job_id)
            print(f"OK  {job_id}  {result['title']}  qa={'ok' if result['qa']['passed'] else 'FALLÓ'}")
            failures += 0 if result["qa"]["passed"] else 1
        except VideoFactoryError as exc:
            failures += 1
            print(f"ERR {job_id}  {exc}")
    return 1 if failures else 0


def cmd_doctor(_: argparse.Namespace) -> int:
    from .core.media import binary

    cfg = load_config()
    ok = True

    def line(name: str, good: bool, detail: str) -> None:
        nonlocal ok
        ok &= good
        print(f"[{'OK' if good else '!!'}] {name}: {detail}")

    for b in ("ffmpeg", "ffprobe"):
        try:
            line(b, True, binary(b))
        except VideoFactoryError as exc:
            line(b, False, str(exc))
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch()
            line("chromium", True, browser.version)
            browser.close()
    except Exception as exc:  # noqa: BLE001 - diagnóstico
        line("chromium", False, f"{exc} → ejecuta: python -m playwright install chromium")
    from .audio.tts_provider import create_tts

    tts = create_tts(cfg.tts, cfg.root, cfg.path("models"))
    voices = tts.available_voices()
    line("voces piper", bool(voices), ", ".join(voices) or "ninguna → python scripts/setup_voices.py")
    has_key = bool(os.getenv("ANTHROPIC_API_KEY"))
    print(f"[{'OK' if has_key else '--'}] ANTHROPIC_API_KEY: {'configurada' if has_key else 'no configurada (solo --content)'}")
    print(f"[--] modelo: {cfg.llm['model']} · búsqueda web: {cfg.llm['web_search']['enabled']}")
    return 0 if ok else 1


def cmd_serve(args: argparse.Namespace) -> int:
    import uvicorn

    port = args.port or int(os.getenv("VF_PORT", "8000"))
    print(f"Interfaz en http://127.0.0.1:{port}")
    uvicorn.run("video_factory.web.app:app", host=args.host, port=port, log_level="info")
    return 0


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="video-factory", description="AI Video Factory")
    sub = parser.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="Genera un video")
    g.add_argument("--topic", help="Temática del video")
    g.add_argument("--content", help="Ruta a un content.json existente (no llama a la IA)")
    g.add_argument("--category", choices=CATEGORIES, default="curiosidades")
    g.add_argument("--style", choices=STYLES, help="Estilo visual (por defecto, el de la categoría)")
    g.add_argument("--sources-verified", action="store_true",
                   help="Con --content: las fuentes fueron verificadas manualmente por una persona")
    g.add_argument("--duration", type=int, default=40)
    g.add_argument("--voice", default="masculina")
    g.add_argument("--speed", type=float, default=1.0)
    g.set_defaults(func=cmd_generate)

    t = sub.add_parser("topics", help="Propone temas nuevos")
    t.add_argument("--category", choices=CATEGORIES, default="curiosidades")
    t.add_argument("--count", type=int, default=5)
    t.set_defaults(func=cmd_topics)

    b = sub.add_parser("batch", help="Genera varios videos con temas automáticos")
    b.add_argument("--category", choices=CATEGORIES, default="curiosidades")
    b.add_argument("--count", type=int, default=3)
    b.add_argument("--duration", type=int, default=40)
    b.add_argument("--voice", default="masculina")
    b.set_defaults(func=cmd_batch)

    d = sub.add_parser("doctor", help="Verifica dependencias y configuración")
    d.set_defaults(func=cmd_doctor)

    s = sub.add_parser("serve", help="Inicia la interfaz web")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int)
    s.set_defaults(func=cmd_serve)

    args = parser.parse_args(argv)
    if args.cmd == "generate" and not (args.topic or args.content):
        parser.error("indica --topic o --content")
    try:
        return args.func(args)
    except VideoFactoryError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
