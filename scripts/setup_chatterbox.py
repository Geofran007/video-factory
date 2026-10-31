"""Descarga y arma el modelo Chatterbox para español latinoamericano (licencia MIT).

Se ejecuta con el entorno aislado:  .venv-chatterbox/Scripts/python scripts/setup_chatterbox.py
Origen:
  - ResembleAI/Chatterbox-Multilingual-es-mx-latam: T3 latino + decodificador S3Gen v3 + tokenizador
  - ResembleAI/chatterbox: codificador de voz (ve.pt) y voz predeterminada (conds.pt)
Resultado: models/chatterbox-es-latam/ con los nombres que espera ChatterboxMultilingualTTS.from_local().
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from huggingface_hub import hf_hub_download

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "models" / "chatterbox-es-latam"

# (repositorio, archivo de origen, nombre local)
FILES = [
    ("ResembleAI/Chatterbox-Multilingual-es-mx-latam", "t3_es_mx_latam.safetensors", "t3_mtl23ls_v2.safetensors"),
    ("ResembleAI/Chatterbox-Multilingual-es-mx-latam", "s3gen_v3.pt", "s3gen.pt"),
    ("ResembleAI/Chatterbox-Multilingual-es-mx-latam", "grapheme_mtl_merged_expanded_v1.json", "grapheme_mtl_merged_expanded_v1.json"),
    ("ResembleAI/chatterbox", "ve.pt", "ve.pt"),
    ("ResembleAI/chatterbox", "conds.pt", "conds.pt"),
]


def main() -> int:
    TARGET.mkdir(parents=True, exist_ok=True)
    for repo, name, local in FILES:
        dest = TARGET / local
        if dest.exists() and dest.stat().st_size > 0:
            print(f"ya existe: {local}")
            continue
        print(f"descargando {repo}/{name} ...", flush=True)
        path = Path(hf_hub_download(repo_id=repo, filename=name, local_dir=TARGET / "_dl" / repo.split("/")[-1]))
        shutil.move(str(path), dest)
    shutil.rmtree(TARGET / "_dl", ignore_errors=True)
    (TARGET / "SOURCE.txt").write_text(
        "Chatterbox Multilingual (Resemble AI), licencia MIT.\n"
        "T3 y S3Gen v3: https://huggingface.co/ResembleAI/Chatterbox-Multilingual-es-mx-latam\n"
        "ve.pt y conds.pt: https://huggingface.co/ResembleAI/chatterbox\n"
        "Los audios generados llevan la marca de agua inaudible Perth.\n",
        encoding="utf-8",
    )
    print("listo:", TARGET)
    return 0


if __name__ == "__main__":
    sys.exit(main())
