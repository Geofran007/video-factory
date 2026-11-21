"""Conecta una cuenta de TikTok con GitHub Actions sin exponer credenciales.

Uso (en tu PC, una vez por cuenta):
    python scripts/tiktok_auth.py --canal es
    python scripts/tiktok_auth.py --canal en
    python scripts/tiktok_auth.py --canal es --modo direct   # pide también publicar directo (video.publish)

1. Lee el Client key y el Client secret de tu app de TikTok desde credenciales/tiktok_app.json
   (carpeta excluida de git), con este formato:  {"client_key": "...", "client_secret": "..."}
   Si el archivo no existe, los pide aquí en la terminal (no se muestran al escribir).
2. Abre el navegador: inicias sesión en la cuenta de TikTok y aceptas los permisos.
   La app debe tener registrado el redirect URI  http://127.0.0.1:3455/callback/  (Login Kit → Desktop).
3. Muestra solo el nombre de la cuenta autorizada y guarda los secretos directamente en GitHub
   (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN_<ES|EN>) con `gh secret set`.
   El token nunca se imprime ni se escribe en disco.

Permisos: user.info.basic y video.upload (enviar borradores); con --modo direct, también video.publish.
"""

from __future__ import annotations

import argparse
import getpass
import hashlib
import http.server
import json
import secrets
import shutil
import subprocess
import sys
import threading
import urllib.parse
import webbrowser
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
USER_URL = "https://open.tiktokapis.com/v2/user/info/"
PORT = 3455
REDIRECT = f"http://127.0.0.1:{PORT}/callback/"


def gh_binary() -> str:
    for cand in (shutil.which("gh"), r"C:\Program Files\GitHub CLI\gh.exe"):
        if cand and Path(cand).exists():
            return cand
    sys.exit("No se encontró GitHub CLI (gh). Instálalo e inicia sesión con `gh auth login`.")


def set_secret(gh: str, repo: str, name: str, value: str) -> None:
    proc = subprocess.run([gh, "secret", "set", name, "--repo", repo], input=value, text=True, capture_output=True)
    if proc.returncode != 0:
        sys.exit(f"No se pudo guardar el secreto {name}: {proc.stderr.strip()}")


def app_credentials(path: Path) -> tuple[str, str]:
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return data["client_key"].strip(), data["client_secret"].strip()
    print(f"No encontré {path}. Escribe las credenciales de tu app de TikTok (no se verán en pantalla).")
    return getpass.getpass("Client key: ").strip(), getpass.getpass("Client secret: ").strip()


def wait_for_code(state: str) -> str:
    result: dict[str, str] = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            result.update({k: v[0] for k, v in q.items()})
            ok = "code" in result and result.get("state") == state
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
            msg = "Listo, ya puedes cerrar esta pestaña." if ok else "No se pudo autorizar. Revisa la terminal."
            self.wfile.write(f"<h2>{msg}</h2>".encode("utf-8"))
            threading.Thread(target=self.server.shutdown, daemon=True).start()

        def log_message(self, *a):  # silencio
            pass

    srv = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    srv.serve_forever()
    if result.get("state") != state:
        sys.exit("La respuesta de TikTok no coincide (state). Repite el proceso.")
    if "code" not in result:
        sys.exit(f"TikTok no autorizó: {result.get('error', '')} {result.get('error_description', '')}".strip())
    return result["code"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--canal", choices=["es", "en"], required=True, help="Cuenta a conectar: es (español) o en (inglés)")
    ap.add_argument("--modo", choices=["inbox", "direct"], default="inbox")
    ap.add_argument("--app", default=str(ROOT / "credenciales" / "tiktok_app.json"))
    ap.add_argument("--repo", default="Geofran007/video-factory")
    args = ap.parse_args()

    gh = gh_binary()
    client_key, client_secret = app_credentials(Path(args.app))
    if not client_key or not client_secret:
        sys.exit("Faltan el Client key o el Client secret.")

    scopes = "user.info.basic,video.upload" + (",video.publish" if args.modo == "direct" else "")
    verifier = secrets.token_urlsafe(64)[:96]
    # TikTok (Login Kit para escritorio) usa el SHA-256 del verifier en hexadecimal como code_challenge.
    challenge = hashlib.sha256(verifier.encode()).hexdigest()
    state = secrets.token_urlsafe(16)
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "client_key": client_key, "response_type": "code", "scope": scopes, "redirect_uri": REDIRECT,
        "state": state, "code_challenge": challenge, "code_challenge_method": "S256"})
    print(f"Se abrirá el navegador. Inicia sesión en la cuenta de TikTok en {'ESPAÑOL' if args.canal == 'es' else 'INGLÉS'}.")
    print(f"Si no se abre, copia esta dirección en el navegador:\n{url}\n")
    webbrowser.open(url)
    code = wait_for_code(state)

    r = requests.post(TOKEN_URL, data={
        "client_key": client_key, "client_secret": client_secret, "code": code, "grant_type": "authorization_code",
        "redirect_uri": REDIRECT, "code_verifier": verifier,
    }, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=30)
    tok = r.json() if r.headers.get("Content-Type", "").startswith("application/json") else {}
    if r.status_code != 200 or "refresh_token" not in tok:
        sys.exit(f"TikTok no entregó el token ({r.status_code}): {tok.get('error', '')} {tok.get('error_description', '')}")
    granted = set(tok.get("scope", "").split(","))
    missing = set(scopes.split(",")) - granted
    if missing:
        sys.exit(f"Faltan permisos aceptados: {', '.join(sorted(missing))}. Revisa los productos de tu app y repite.")

    u = requests.get(USER_URL, params={"fields": "open_id,display_name"},
                     headers={"Authorization": f"Bearer {tok['access_token']}"}, timeout=30)
    name = (u.json().get("data", {}).get("user", {}) or {}).get("display_name", "?") if u.status_code == 200 else "?"
    print(f"Cuenta de TikTok autorizada: {name}")

    suffix = args.canal.upper()
    set_secret(gh, args.repo, "TIKTOK_CLIENT_KEY", client_key)
    set_secret(gh, args.repo, "TIKTOK_CLIENT_SECRET", client_secret)
    set_secret(gh, args.repo, f"TIKTOK_REFRESH_TOKEN_{suffix}", tok["refresh_token"])
    print(f"Listo: secretos guardados en GitHub (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN_{suffix}).")
    if args.modo == "direct":
        print("Recuerda: en modo direct agrega en GitHub la variable TIKTOK_MODE=direct (Settings → Variables).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
