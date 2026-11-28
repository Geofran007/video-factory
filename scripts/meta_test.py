"""Sube a Facebook (y a Instagram con --publicar) un Short ya generado. Por defecto, como BORRADOR (no se publica).

Uso (lo ejecuta .github/workflows/meta-test.yml con los secretos META_*):
    python scripts/meta_test.py --carpeta descargas/publicado-123 --canal es [--titulo microondas] [--publicar]

Busca en la carpeta el primer trabajo con video.mp4 y metadata.json en el idioma del canal, sube el video a la
Página como borrador y muestra el id. El borrador aparece en Meta Business Suite → Contenido, donde puedes verlo,
publicarlo o borrarlo. Instagram no admite borradores por API, así que esta prueba no lo toca.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))

from publish_queue import meta_caption  # noqa: E402
from video_factory.publishers import meta  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--carpeta", required=True)
    ap.add_argument("--canal", choices=["es", "en"], default="es")
    ap.add_argument("--titulo", default="", help="Parte del título del Short a usar (sin distinguir mayúsculas)")
    ap.add_argument("--publicar", action="store_true", help="Publica ya en Facebook e Instagram en lugar de dejar un borrador")
    ap.add_argument("--solo-instagram", action="store_true", help="Publica solo en Instagram (si Facebook ya salió)")
    args = ap.parse_args()
    if not meta.configured(args.canal):
        raise SystemExit(f"Faltan los secretos META_PAGE_ID_{args.canal.upper()} / META_PAGE_TOKEN_{args.canal.upper()}.")
    for md in sorted(Path(args.carpeta).rglob("metadata.json")):
        data = json.loads(md.read_text(encoding="utf-8"))
        if (data.get("language") == args.canal and data.get("format", "short") == "short" and (md.parent / "video.mp4").exists()
                and args.titulo.lower() in data["title"].lower()):
            break
    else:
        raise SystemExit("No hay ningún Short con video.mp4 en esa carpeta.")
    print(f"Video: {data['title']} · {data['duration_s']} s")
    pub = meta.MetaPublisher(args.canal)
    if args.solo_instagram:
        if not pub.ig_id:
            raise SystemExit("Instagram no está activado (META_IG_AUTO) o no hay META_IG_ID.")
        print(f"Instagram: publicado · {pub.instagram_reel(md.parent / 'video.mp4', meta_caption(md.parent))}")
        return 0
    if not args.publicar:
        vid = pub.facebook_reel(md.parent / "video.mp4", meta_caption(md.parent), draft=True)
        print(f"Facebook: borrador de Reel creado · {vid}. Revísalo en Meta Business Suite → Contenido.")
        return 0
    res = pub.publish(md.parent / "video.mp4", meta_caption(md.parent), float(data["duration_s"]))
    print(f"Facebook: Reel publicado · {res.facebook_id}")
    print(f"Instagram: {'publicado · ' + res.instagram_id if res.instagram_id else 'no se publicó: ' + (res.instagram_error or 'no está activado o vinculado')}")
    if res.instagram_error:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
