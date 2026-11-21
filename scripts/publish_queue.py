"""Toma el siguiente guion de la cola de un canal, genera el video y lo sube a YouTube.

    python scripts/publish_queue.py --canal es            # Leo curioso
    python scripts/publish_queue.py --canal en            # Curious Leo
    python scripts/publish_queue.py --canal en --dry-run  # genera, pero no sube ni mueve nada

Cola:       contenidos/cola/<es|en>/*.json   (por defecto se elige uno al azar; con --orden alfabetico, el primero;
            con --guion <nombre>, ese guion)
Publicados: contenidos/publicados/<es|en>/<fecha>-<nombre>.json + <fecha>-<nombre>.youtube.json

Reglas de seguridad:
- Si el video no pasa el control de calidad, no se sube y el guion se queda en la cola.
- El idioma del guion debe coincidir con el canal (no se sube un video en inglés al canal en español).
- La visibilidad por defecto es «private»: el autor lo publica o lo programa en YouTube Studio.
- TikTok (opcional): si hay secretos TIKTOK_* para el canal, después de YouTube el mismo video se envía a TikTok
  (por defecto como borrador a la bandeja de la app; ver video_factory/publishers/tiktok.py). Si TikTok falla,
  YouTube no se ve afectado y el guion igual pasa a publicados.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import random
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from video_factory.publishers import tiktok  # noqa: E402
from video_factory.publishers.youtube import YouTubePublisher, request_from_job  # noqa: E402


def generate(content: Path, voice: str) -> dict:
    exe = Path(sys.executable).with_name("video-factory" + (".exe" if sys.platform == "win32" else ""))
    cmd = [str(exe) if exe.exists() else "video-factory", "generate", "--content", str(content), "--voice", voice]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    sys.stderr.write(proc.stderr[-4000:])
    if proc.returncode != 0:
        raise SystemExit(f"La generación falló (código {proc.returncode}).")
    out = proc.stdout
    start = out.rfind("\n{")
    return json.loads(out[start + 1 if start >= 0 else out.index("{"):])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--canal", choices=["es", "en"], required=True)
    ap.add_argument("--voice", default="voz_zueria")
    ap.add_argument("--visibility", choices=["private", "unlisted", "public"], default="private")
    ap.add_argument("--dry-run", action="store_true", help="Genera el video pero no lo sube ni mueve el guion")
    ap.add_argument("--orden", choices=["aleatorio", "alfabetico"], default="aleatorio",
                    help="aleatorio: temas variados cada día; alfabetico: respeta los prefijos 001-, 002-…")
    ap.add_argument("--guion", default="", help="Nombre de un guion concreto de la cola (con o sin .json)")
    ap.add_argument("--sin-tiktok", action="store_true", help="No enviar a TikTok aunque haya credenciales")
    args = ap.parse_args()

    queue = ROOT / "contenidos" / "cola" / args.canal
    pending = sorted(p for p in queue.glob("*.json"))
    if not pending:
        print(f"Cola vacía ({queue.relative_to(ROOT)}): no hay nada que publicar hoy.")
        return 0
    # Azar reproducible por día y canal: si el trabajo se reintenta el mismo día, elige el mismo guion.
    rng = random.Random(f"{dt.date.today().isoformat()}-{args.canal}")
    content = rng.choice(pending) if args.orden == "aleatorio" else pending[0]
    if args.guion:
        wanted = queue / (args.guion if args.guion.endswith(".json") else args.guion + ".json")
        if wanted not in pending:
            raise SystemExit(f"No está en la cola: {wanted.relative_to(ROOT)}")
        content = wanted
    data = json.loads(content.read_text(encoding="utf-8"))
    if data.get("language", "es") != args.canal:
        raise SystemExit(f"{content.name} está en '{data.get('language', 'es')}' y el canal es '{args.canal}'.")
    print(f"Guion: {content.relative_to(ROOT)} · quedan {len(pending) - 1} después de este")

    result = generate(content, args.voice)
    if result.get("qa_failures"):
        raise SystemExit(f"Control de calidad fallido, no se sube: {result['qa_failures']}")
    job_dir = Path(result["video"]).parent
    print(f"Video listo: {result['title']} · {result['duration_s']} s")

    if args.dry_run:
        print("--dry-run: no se sube ni se mueve el guion.")
        return 0

    pub = YouTubePublisher(args.canal)
    res = pub.publish(request_from_job(job_dir, args.canal, args.visibility))
    print(f"Subido ({args.visibility}): {res.url}")

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d")
    done = ROOT / "contenidos" / "publicados" / args.canal
    done.mkdir(parents=True, exist_ok=True)
    name = content.stem.split("-", 1)[1] if content.stem[:3].isdigit() and "-" in content.stem else content.stem
    content.replace(done / f"{stamp}-{name}.json")
    (done / f"{stamp}-{name}.youtube.json").write_text(json.dumps({
        "video_id": res.remote_id, "url": res.url, "visibility": args.visibility, "channel": args.canal,
        "title": result["title"], "duration_s": result["duration_s"], "job_id": result["job_id"],
        "uploaded_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    if not args.sin_tiktok:
        publish_tiktok(job_dir, args.canal, args.visibility, done / f"{stamp}-{name}.tiktok.json", result)
    return 0


def save_rotated_token(token: str) -> None:
    """TikTok cambia el refresh token en cada uso: se deja en un archivo temporal para que el workflow lo
    guarde como secreto de GitHub (nunca se imprime ni se sube al repositorio)."""
    out = os.environ.get("TIKTOK_NEW_TOKEN_FILE", "").strip()
    if not out:
        print("::warning::TikTok entregó un refresh token nuevo y no hay TIKTOK_NEW_TOKEN_FILE para guardarlo.")
        return
    Path(out).write_text(token, encoding="utf-8")


def publish_tiktok(job_dir: Path, canal: str, visibility: str, record: Path, result: dict) -> None:
    if not tiktok.configured(canal):
        print(f"TikTok: sin credenciales para '{canal}', se omite.")
        return
    try:
        pub = tiktok.TikTokPublisher(canal, on_new_refresh_token=save_rotated_token)
        res = pub.publish(tiktok.request_from_job(job_dir, canal, visibility))
        info = {"publish_id": res.remote_id, "mode": pub.mode, "ok": True}
        print(f"TikTok ({pub.mode}): enviado · {res.remote_id}"
              + (" — revisa la bandeja de entrada de la app para publicarlo." if pub.mode == "inbox" else ""))
    except Exception as exc:  # TikTok no debe tumbar la publicación de YouTube
        info = {"ok": False, "error": str(exc)[:500]}
        print(f"::warning::TikTok falló: {exc}")
    info.update({"channel": canal, "title": result["title"], "job_id": result["job_id"],
                 "sent_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")})
    record.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
