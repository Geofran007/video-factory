"""Carruseles de datos curiosos para Facebook e Instagram: genera las imágenes y, si toca, los publica.

Ficha (contenidos/carruseles/<es|en>/NNN-tema.json):
    {"language": "es", "colors": ["#2a0f5e", "#0b62d6"], "caption": "…", "hashtags": ["#…"], "sources": ["https://…"],
     "slides": [{"layout": "cover|fact|cta", "model3d": "ray_hook", "at": 0.3, "tag": "DATO 1/3", "big": "30.000 °C",
                 "fact": "…", "detail": "…", "highlight": ["…"], "swipe": "Desliza →"}, …]}

Uso:
    python scripts/carrusel.py imagenes contenidos/carruseles/es/001-rayo.json --salida output/carrusel
    python scripts/carrusel.py turno --canal es              # en GitHub Actions: publica el turno diario si toca
    python scripts/carrusel.py prueba --canal es             # sube a Facebook programado y lo borra; Instagram sin publicar
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))

import turnos  # noqa: E402
from video_factory.core.models import Scene, Timeline  # noqa: E402
from video_factory.publishers import meta  # noqa: E402
from video_factory.publishers.meta_carousel import MetaCarousel  # noqa: E402
from video_factory.video.html_renderer import render_post  # noqa: E402

QUEUE = ROOT / "contenidos" / "carruseles"
DONE = ROOT / "contenidos" / "publicados" / "carruseles"


def render(card_path: Path, out_dir: Path) -> list[Path]:
    card = json.loads(card_path.read_text(encoding="utf-8"))
    en = card["language"] == "en"
    out_dir.mkdir(parents=True, exist_ok=True)
    images = []
    for i, s in enumerate(card["slides"], 1):
        scene = Scene(id="s1", role="hook", type="scene3d", model3d=s.get("model3d", "ray_hook"),
                      narration="dato curioso", on_screen_text="dato")
        tl = Timeline(width=1080, height=1920, fps=30, duration=6, style="ciencia", category="ciencia", title="dato",
                      scenes=[dict(id="s1", index=0, start=0, end=6, narration_start=0, narration_end=6, scene=scene)],
                      cues=[], sfx=[], narration_file="-", presenter="perro", language=card["language"])
        slide = {"colors": card.get("colors"), "brand": "Curious Leo" if en else "Leo curioso", **s}
        img = out_dir / f"{card_path.stem}-{i}.jpg"
        render_post(ROOT / "templates", tl, "s1", float(s.get("at", 0.5)), slide, img)
        images.append(img)
    return images


def caption(card: dict) -> str:
    return f"{card['caption']}\n\n{' '.join(card.get('hashtags', []))}"


def slot_now(canal: str, cfg: dict, now: dt.datetime) -> tuple[str, dt.datetime] | None:
    """Turno diario de carruseles que toca: desde 3 h antes hasta 6 h después de su hora local."""
    c = cfg["carruseles"]
    for offset in (-1, 0, 1):
        day = (now + dt.timedelta(days=offset)).date().isoformat()
        local = dt.datetime.fromisoformat(f"{day}T{c['hora']}:00").replace(tzinfo=turnos.ZoneInfo(cfg["zonas"][canal]))
        when = local.astimezone(dt.timezone.utc)
        if when - dt.timedelta(hours=3) <= now <= when + dt.timedelta(hours=6):
            return f"{day}-carrusel", when
    return None


def turno(canal: str) -> int:
    now = dt.datetime.now(dt.timezone.utc)
    cfg = turnos.load(turnos.CONFIG)
    found = slot_now(canal, cfg, now)
    if not found:
        print("No toca carrusel ahora.")
        return 0
    slot, when = found
    ledger = turnos.load(turnos.LEDGER)
    if canal in ledger.get(slot, {}):
        print(f"El carrusel de {slot} ya se publicó.")
        return 0
    pending = sorted((QUEUE / canal).glob("*.json"))
    if not pending:
        print("Cola de carruseles vacía.")
        return 0
    if not meta.configured(canal):
        print(f"Sin credenciales de Meta para '{canal}'.")
        return 0
    card_path = pending[0]
    card = json.loads(card_path.read_text(encoding="utf-8"))
    images = render(card_path, ROOT / "output" / "carruseles")
    publish_at = int(when.timestamp()) if when > now + dt.timedelta(minutes=15) else None
    res = MetaCarousel(canal).publish_carousel(images, caption(card), publish_at)
    print(f"Facebook: carrusel {'programado' if publish_at else 'publicado'} · {res.facebook_post_id}")
    print(f"Instagram: {'publicado · ' + res.instagram_id if res.instagram_id else 'no se publicó: ' + (res.instagram_error or 'no activado')}")
    DONE.mkdir(parents=True, exist_ok=True)
    stamp = now.strftime("%Y%m%d")
    card_path.replace(DONE / f"{stamp}-{canal}-{card_path.name}")
    turnos.record(turnos.LEDGER, slot, canal, {"guion": card_path.stem, "facebook_post_id": res.facebook_post_id,
                                               "instagram_id": res.instagram_id, "instagram_error": res.instagram_error,
                                               "hora_recomendada_utc": when.isoformat()})
    return 0


def prueba(canal: str) -> int:
    """Comprueba la conexión sin dejar nada publicado: Facebook programado a 2 días y borrado; Instagram sin publicar."""
    pending = sorted((QUEUE / canal).glob("*.json"))
    card_path = pending[0]
    card = json.loads(card_path.read_text(encoding="utf-8"))
    images = render(card_path, ROOT / "output" / "carruseles")
    pub = MetaCarousel(canal)
    ids = pub._upload_photos(images)
    urls = [pub._photo_url(i) for i in ids] if pub.ig_id else []
    print(f"Facebook: {len(urls)} direcciones de imagen leídas para Instagram.")
    post = pub.facebook_post(ids, caption(card), int((dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=2)).timestamp()))
    print(f"Facebook: publicación programada creada ({post}) con {len(ids)} imágenes.")
    pub.delete(post)
    print("Facebook: publicación de prueba borrada.")
    if pub.ig_id:
        cont = pub.instagram_carousel(urls, caption(card), publish=False)
        print(f"Instagram: carrusel aceptado y listo ({cont}), sin publicar.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("imagenes"); a.add_argument("ficha"); a.add_argument("--salida", default=str(ROOT / "output" / "carruseles"))
    b = sub.add_parser("turno"); b.add_argument("--canal", choices=["es", "en"], default="es")
    c = sub.add_parser("prueba"); c.add_argument("--canal", choices=["es", "en"], default="es")
    args = ap.parse_args()
    if args.cmd == "imagenes":
        for p in render(Path(args.ficha), Path(args.salida)):
            print(p)
        return 0
    return turno(args.canal) if args.cmd == "turno" else prueba(args.canal)


if __name__ == "__main__":
    raise SystemExit(main())
