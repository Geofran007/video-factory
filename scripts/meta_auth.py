"""Conecta la Página de Facebook (y su Instagram profesional) con GitHub Actions sin exponer credenciales.

Uso (en tu PC, una vez):
    python scripts/meta_auth.py --canal es

1. En https://developers.facebook.com/tools/explorer/ eliges tu app, pulsas «Generar token de acceso» y aceptas
   los permisos: pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic,
   instagram_content_publish y business_management.
2. Este script te pide en la terminal (sin mostrar lo que escribes) el App ID, la clave secreta de la app y ese token.
3. Lo cambia por un token de larga duración, busca tus Páginas, te deja elegir una, detecta su Instagram vinculado
   y guarda directamente en GitHub: META_PAGE_ID_<CANAL>, META_PAGE_TOKEN_<CANAL> y META_IG_ID_<CANAL>.
   Solo muestra nombres de Página y de Instagram; los tokens nunca se imprimen ni se escriben en disco.
"""

from __future__ import annotations

import argparse
import getpass
import shutil
import subprocess
import sys
from pathlib import Path

import requests

GRAPH = "https://graph.facebook.com/v27.0"
REPO = "Geofran007/video-factory"


def gh_binary() -> str:
    for cand in (shutil.which("gh"), r"C:\Program Files\GitHub CLI\gh.exe"):
        if cand and Path(cand).exists():
            return cand
    sys.exit("No se encontró GitHub CLI (gh). Instálalo e inicia sesión con `gh auth login`.")


def set_secret(gh: str, name: str, value: str) -> None:
    proc = subprocess.run([gh, "secret", "set", name, "--repo", REPO], input=value, text=True, capture_output=True)
    if proc.returncode != 0:
        sys.exit(f"No se pudo guardar el secreto {name}: {proc.stderr.strip()}")


def get(path: str, **params) -> dict:
    r = requests.get(f"{GRAPH}/{path}", params=params, timeout=30)
    data = r.json()
    if "error" in data:
        sys.exit(f"Meta respondió con un error: {data['error'].get('message', '')}")
    return data


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--canal", choices=["es", "en"], required=True)
    args = ap.parse_args()
    gh = gh_binary()
    c = args.canal.upper()

    app_id = input("App ID: ").strip()
    secret = getpass.getpass("Clave secreta de la app (no se muestra): ").strip()
    short = getpass.getpass("Token del Explorador de la API Graph (no se muestra): ").strip()
    if not (app_id and secret and short):
        sys.exit("Faltan datos.")

    long_user = get("oauth/access_token", grant_type="fb_exchange_token", client_id=app_id,
                    client_secret=secret, fb_exchange_token=short)["access_token"]
    pages = get("me/accounts", access_token=long_user, fields="id,name,access_token,tasks,instagram_business_account{id,username}")["data"]
    pages = [p for p in pages if "CREATE_CONTENT" in p.get("tasks", [])]
    if not pages:
        sys.exit("Tu cuenta no administra ninguna Página con permiso para publicar. Revisa el acceso a la Página.")
    for i, p in enumerate(pages, 1):
        ig = p.get("instagram_business_account") or {}
        print(f"  {i}. {p['name']}" + (f"  · Instagram @{ig['username']}" if ig.get("username") else "  · sin Instagram vinculado"))
    pick = pages[int(input("Número de la Página para este canal: ").strip()) - 1]
    ig = pick.get("instagram_business_account") or {}

    set_secret(gh, f"META_PAGE_ID_{c}", pick["id"])
    set_secret(gh, f"META_PAGE_TOKEN_{c}", pick["access_token"])
    if ig.get("id"):
        set_secret(gh, f"META_IG_ID_{c}", ig["id"])
    print(f"Listo: «{pick['name']}»" + (f" e Instagram @{ig['username']}" if ig.get("username") else "")
          + f" quedaron conectados al canal '{args.canal}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
