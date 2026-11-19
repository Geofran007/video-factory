"""Conecta un canal de YouTube con GitHub Actions sin exponer credenciales.

Uso (en tu PC, una vez por canal):
    python scripts/youtube_auth.py --canal es
    python scripts/youtube_auth.py --canal en

1. Lee la credencial OAuth de "App de escritorio" descargada de Google Cloud
   (por defecto credenciales/client_secret.json, carpeta excluida de git).
2. Abre el navegador: inicias sesión y eliges el canal (o canal de marca) que quieres conectar.
3. Muestra solo el nombre del canal autorizado y guarda los secretos directamente en GitHub
   (YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN_<ES|EN>) con `gh secret set`.
   El token nunca se imprime ni se escribe en disco.

Permisos pedidos: subir videos (youtube.upload) y leer datos del canal (youtube.readonly).
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

import requests
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parents[1]
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]


def gh_binary() -> str:
    for cand in (shutil.which("gh"), r"C:\Program Files\GitHub CLI\gh.exe"):
        if cand and Path(cand).exists():
            return cand
    sys.exit("No se encontró GitHub CLI (gh). Instálalo e inicia sesión con `gh auth login`.")


def set_secret(gh: str, repo: str, name: str, value: str) -> None:
    proc = subprocess.run([gh, "secret", "set", name, "--repo", repo], input=value, text=True, capture_output=True)
    if proc.returncode != 0:
        sys.exit(f"No se pudo guardar el secreto {name}: {proc.stderr.strip()}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--canal", choices=["es", "en"], required=True, help="Canal a conectar: es (español) o en (inglés)")
    ap.add_argument("--client-secret", default=str(ROOT / "credenciales" / "client_secret.json"))
    ap.add_argument("--repo", default="Geofran007/video-factory")
    args = ap.parse_args()

    secret_file = Path(args.client_secret)
    if not secret_file.exists():
        sys.exit(f"No encuentro la credencial OAuth en {secret_file}. Descárgala de Google Cloud (App de escritorio).")
    info = json.loads(secret_file.read_text(encoding="utf-8")).get("installed")
    if not info:
        sys.exit("La credencial debe ser de tipo 'App de escritorio' (clave 'installed' en el JSON).")

    gh = gh_binary()
    flow = InstalledAppFlow.from_client_secrets_file(str(secret_file), scopes=SCOPES)
    print(f"Se abrirá el navegador. Inicia sesión y elige el canal en {'ESPAÑOL' if args.canal == 'es' else 'INGLÉS'}.")
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent select_account",
                                  authorization_prompt_message="", open_browser=True)
    if not creds.refresh_token:
        sys.exit("Google no entregó un refresh token. Revoca el acceso en myaccount.google.com/permissions y repite.")

    r = requests.get("https://www.googleapis.com/youtube/v3/channels", params={"part": "snippet", "mine": "true"},
                     headers={"Authorization": f"Bearer {creds.token}"}, timeout=30)
    r.raise_for_status()
    items = r.json().get("items", [])
    if not items:
        sys.exit("Esa cuenta no tiene canal de YouTube. Repite y elige el canal correcto.")
    title, channel_id = items[0]["snippet"]["title"], items[0]["id"]
    print(f"Canal autorizado: {title} ({channel_id})")

    suffix = args.canal.upper()
    set_secret(gh, args.repo, "YT_CLIENT_ID", info["client_id"])
    set_secret(gh, args.repo, "YT_CLIENT_SECRET", info["client_secret"])
    set_secret(gh, args.repo, f"YT_REFRESH_TOKEN_{suffix}", creds.refresh_token)
    set_secret(gh, args.repo, f"YT_CHANNEL_ID_{suffix}", channel_id)
    print(f"Listo: secretos guardados en GitHub (YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN_{suffix}, YT_CHANNEL_ID_{suffix}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
