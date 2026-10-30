"""Efectos de sonido originales generados por síntesis con FFmpeg (sin recursos de terceros).

Si existe un archivo licenciado en assets/sfx/<nombre>.wav registrado en assets/LICENSES.json,
se usa en lugar del sintetizado.
"""

from __future__ import annotations

from pathlib import Path

from ..core.media import run_ffmpeg
from .licensed_assets import licensed_file

# Expresiones de aevalsrc: (duración en s, expresión). t = tiempo en segundos.
_SYNTH: dict[str, tuple[float, str]] = {
    "impact": (1.1, "0.85*sin(2*PI*(38+90*exp(-14*t))*t)*exp(-4.5*t)+0.3*(2*random(0)-1)*exp(-35*t)"),
    "riser": (1.2, "(0.30*sin(2*PI*(180*t+380*t*t))+0.18*(2*random(0)-1)*t)*pow(t/1.2,1.6)"),
    "pop": (0.2, "0.75*sin(2*PI*(950-1800*t)*t)*exp(-28*t)"),
    "ding": (1.3, "0.45*sin(2*PI*1318.5*t)*exp(-3.2*t)+0.22*sin(2*PI*2637*t)*exp(-6*t)+0.1*sin(2*PI*3955*t)*exp(-9*t)"),
}
_WHOOSH = (
    "anoisesrc=d=0.65:c=pink:r=48000:a=0.9:s=7,"
    "highpass=f=350,lowpass=f=5000,bandpass=f=1800:width_type=o:w=2.2,"
    "afade=t=in:d=0.32:curve=qsin,afade=t=out:st=0.32:d=0.33:curve=qsin"
)

SFX_NAMES = ("whoosh", "impact", "riser", "pop", "ding")


def sfx_path(name: str, cache_dir: Path, assets_dir: Path) -> Path:
    if name not in SFX_NAMES:
        raise ValueError(f"Efecto desconocido: {name}")
    licensed = licensed_file(assets_dir, f"sfx/{name}")
    if licensed:
        return licensed
    cache_dir.mkdir(parents=True, exist_ok=True)
    out = cache_dir / f"{name}.wav"
    if out.exists() and out.stat().st_size > 1000:
        return out
    if name == "whoosh":
        graph = _WHOOSH
    else:
        dur, expr = _SYNTH[name]
        graph = f"aevalsrc=exprs='{expr}':s=48000:d={dur},afade=t=out:st={dur - 0.08:.2f}:d=0.08"
    run_ffmpeg(["-f", "lavfi", "-i", graph + ",dynaudnorm=f=150,volume=-1dB", "-ac", "1", "-c:a", "pcm_s16le", str(out)])
    return out
