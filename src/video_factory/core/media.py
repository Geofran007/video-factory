"""Utilidades para invocar FFmpeg/ffprobe de forma segura (sin shell)."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Any

from .errors import ConfigurationError

_WINGET_GLOB = "AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg*/*/bin"


@lru_cache(maxsize=4)
def binary(name: str) -> str:
    """Ubica ffmpeg/ffprobe: variable de entorno, PATH o instalación de winget."""
    env = os.getenv(f"{name.upper()}_PATH")
    if env and Path(env).exists():
        return env
    found = shutil.which(name)
    if found:
        return found
    for candidate in sorted(Path.home().glob(_WINGET_GLOB), reverse=True):
        exe = candidate / (name + (".exe" if os.name == "nt" else ""))
        if exe.exists():
            return str(exe)
    raise ConfigurationError(
        f"No se encontró {name}. Instálalo (winget install Gyan.FFmpeg / apt install ffmpeg) "
        f"o define {name.upper()}_PATH en .env"
    )


def run_ffmpeg(args: list[str], *, timeout: float = 900) -> subprocess.CompletedProcess[str]:
    cmd = [binary("ffmpeg"), "-hide_banner", "-nostdin", "-y", *args]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-15:])
        raise RuntimeError(f"ffmpeg falló ({proc.returncode}):\n{tail}")
    return proc


def probe(path: Path) -> dict[str, Any]:
    cmd = [binary("ffprobe"), "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60)
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe no pudo leer {path.name}: {proc.stderr.strip()[-300:]}")
    return json.loads(proc.stdout)


def duration_of(path: Path) -> float:
    return float(probe(path)["format"]["duration"])
