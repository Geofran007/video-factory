"""Descarga los modelos de voz de Piper configurados en config/providers.json.

Origen: https://huggingface.co/rhasspy/piper-voices (cada voz tiene su propia licencia,
registrada en providers.json → tts.voices.*.license).
Uso: python scripts/setup_voices.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    providers = json.loads((ROOT / "config" / "providers.json").read_text(encoding="utf-8"))
    settings = json.loads((ROOT / "config" / "settings.json").read_text(encoding="utf-8"))
    target = ROOT / settings["paths"]["models"]
    target.mkdir(parents=True, exist_ok=True)
    voices = providers["tts"]["voices"].values()
    models = sorted({v["model"] for v in voices if v.get("engine", "piper") == "piper"})
    missing = [m for m in models if not (target / f"{m}.onnx").exists()]
    if not missing:
        print("Todas las voces ya están instaladas:", ", ".join(models))
        return 0
    print("Descargando:", ", ".join(missing))
    return subprocess.call([sys.executable, "-m", "piper.download_voices", "--download-dir", str(target), *missing])


if __name__ == "__main__":
    raise SystemExit(main())
