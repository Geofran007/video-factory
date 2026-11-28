"""Prueba de Facebook: sube un Short ya generado como BORRADOR de Reel en la Página (no se publica).

Uso (lo ejecuta .github/workflows/meta-test.yml con los secretos META_*):
    python scripts/meta_test.py --carpeta descargas/publicado-123 --canal es

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
    args = ap.parse_args()
    if not meta.configured(args.canal):
        raise SystemExit(f"Faltan los secretos META_PAGE_ID_{args.canal.upper()} / META_PAGE_TOKEN_{args.canal.upper()}.")
    for md in sorted(Path(args.carpeta).rglob("metadata.json")):
        data = json.loads(md.read_text(encoding="utf-8"))
        if data.get("language") == args.canal and data.get("format", "short") == "short" and (md.parent / "video.mp4").exists():
            break
    else:
        raise SystemExit("No hay ningún Short con video.mp4 en esa carpeta.")
    print(f"Video: {data['title']} · {data['duration_s']} s")
    vid = meta.MetaPublisher(args.canal).facebook_reel(md.parent / "video.mp4", meta_caption(md.parent), draft=True)
    print(f"Facebook: borrador de Reel creado · {vid}. Revísalo en Meta Business Suite → Contenido.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
