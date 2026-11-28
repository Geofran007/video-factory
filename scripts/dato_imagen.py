"""Genera imágenes de dato curioso (1080×1350) para Facebook e Instagram a partir de una ficha JSON.

Uso:
    python scripts/dato_imagen.py contenidos/datos/es/rayo-30000-grados.json --salida output/datos

Ficha (una por idioma):
    {"language": "es", "model3d": "ray_strike", "at": 0.6,
     "fact": "Un rayo calienta el aire a 30.000 °C", "highlight": ["30.000"],
     "detail": "Cinco veces más que la superficie del Sol…", "caption": "texto de la publicación",
     "hashtags": ["#rayos", "#ciencia"], "sources": ["https://…"]}

Deja la imagen .jpg y un .txt con el texto listo para publicar.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from video_factory.core.models import Scene, Timeline  # noqa: E402
from video_factory.video.html_renderer import render_post  # noqa: E402


def build(card_path: Path, out_dir: Path) -> Path:
    card = json.loads(card_path.read_text(encoding="utf-8"))
    scene = Scene(id="s1", role="hook", type="scene3d", model3d=card["model3d"], narration=card["fact"],
                  on_screen_text=card["fact"][:90])
    tl = Timeline(width=1080, height=1920, fps=30, duration=6, style="ciencia", category="ciencia", title=card["fact"],
                  scenes=[dict(id="s1", index=0, start=0, end=6, narration_start=0, narration_end=6, scene=scene)],
                  cues=[], sfx=[], narration_file="-", presenter="perro", language=card["language"])
    out_dir.mkdir(parents=True, exist_ok=True)
    img = out_dir / f"{card['language']}-{card_path.stem}.jpg"
    en = card["language"] == "en"
    render_post(ROOT / "templates", tl, "s1", float(card.get("at", 0.6)), {
        "badge": "DID YOU KNOW?" if en else "¿SABÍAS QUE…?", "fact": card["fact"], "highlight": card.get("highlight", []),
        "detail": card.get("detail", ""), "brand": "Curious Leo" if en else "Leo curioso"}, img)
    text = f"{card['caption']}\n\n{' '.join(card.get('hashtags', []))}"
    img.with_suffix(".txt").write_text(text + "\n", encoding="utf-8")
    return img


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("fichas", nargs="+")
    ap.add_argument("--salida", default=str(ROOT / "output" / "datos"))
    args = ap.parse_args()
    for f in args.fichas:
        print(build(Path(f), Path(args.salida)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
