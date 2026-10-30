"""Música de fondo.

Prioridad: 1) pista licenciada en assets/music/<categoría>/ registrada en LICENSES.json;
2) cama musical original generada por síntesis (acordes + pulso) según el estilo.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ..core.media import run_ffmpeg
from .licensed_assets import attribution_for, licensed_file

_NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "Ab": 8,
         "A": 9, "Bb": 10, "B": 11}


@dataclass(frozen=True)
class MusicStyle:
    chords: tuple[str, ...]  # p. ej. "Am" o "F"
    bpm: int
    pulse: float  # volumen del bombo (0 = sin pulso)
    hats: float  # volumen del charles (0 = sin charles)
    brightness: int  # frecuencia del filtro pasa bajos


STYLES: dict[str, MusicStyle] = {
    "ciencia": MusicStyle(("Am", "F", "C", "G"), 100, 0.35, 0.0, 3200),
    "historia": MusicStyle(("Dm", "Bb", "F", "C"), 76, 0.25, 0.0, 2200),
    "misterio": MusicStyle(("Cm", "Ab", "Fm", "G"), 66, 0.30, 0.0, 1500),
    "finanzas": MusicStyle(("C", "G", "Am", "F"), 108, 0.35, 0.05, 4200),
    "curiosidades": MusicStyle(("F", "C", "Dm", "Bb"), 118, 0.38, 0.06, 5000),
}


def chord_freqs(chord: str, octave_base: float = 110.0) -> tuple[float, float, float]:
    minor = chord.endswith("m")
    root = chord[:-1] if minor else chord
    semis = _NOTE[root]
    f = octave_base * 2 ** ((semis - 9) / 12)  # A2 = 110 Hz como referencia
    third = f * 2 ** ((3 if minor else 4) / 12)
    fifth = f * 2 ** (7 / 12)
    return f, third, fifth


def _select(index_expr: str, values: list[str]) -> str:
    expr = values[-1]
    for i in range(len(values) - 2, -1, -1):
        expr = f"if(eq({index_expr},{i}),{values[i]},{expr})"
    return expr


def music_expression(style: MusicStyle) -> str:
    beat = 60.0 / style.bpm
    bar = beat * 4
    k = f"mod(floor(t/{bar:.4f}),{len(style.chords)})"
    voices = []
    for n in range(3):
        freqs = [f"{chord_freqs(c)[n] * 2:.3f}" for c in style.chords]  # una octava arriba para el pad
        voices.append(f"sin(2*PI*{_select(k, freqs)}*t)")
    bass = [f"{chord_freqs(c)[0] / 2:.3f}" for c in style.chords]
    local = f"mod(t,{bar:.4f})"
    env = f"min(1,{local}/0.5)*min(1,({bar:.4f}-{local})/0.5)"  # sin clics en los cambios de acorde
    pad = f"0.16*({'+'.join(voices)})*{env}"
    sub = f"0.22*sin(2*PI*{_select(k, bass)}*t)*{env}"
    bt = f"mod(t,{beat:.4f})"
    parts = [pad, sub]
    if style.pulse:
        parts.append(f"{style.pulse}*sin(2*PI*(48+70*exp(-30*{bt}))*{bt})*exp(-9*{bt})")
    if style.hats:
        ht = f"mod(t+{beat / 2:.4f},{beat:.4f})"
        parts.append(f"{style.hats}*(2*random(1)-1)*exp(-70*{ht})")
    return "+".join(parts)


def music_bed(category: str, duration: float, out: Path, assets_dir: Path) -> tuple[Path, str]:
    """Genera la pista de música con la duración exacta. Devuelve (ruta, atribución/descripción)."""
    licensed = licensed_file(assets_dir, f"music/{category}")
    fade_out = min(1.5, duration / 4)
    if licensed:
        run_ffmpeg([
            "-stream_loop", "-1", "-i", str(licensed), "-t", f"{duration:.3f}",
            "-af", f"afade=t=in:d=0.8,afade=t=out:st={duration - fade_out:.3f}:d={fade_out:.3f}",
            "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(out),
        ])
        return out, attribution_for(assets_dir, licensed) or licensed.name
    style = STYLES.get(category, STYLES["curiosidades"])
    graph = (
        f"aevalsrc=exprs='{music_expression(style)}':s=24000:d={duration:.3f},"
        f"lowpass=f={style.brightness},aecho=0.8:0.6:90|170:0.25|0.15,"
        f"afade=t=in:d=1.0,afade=t=out:st={duration - fade_out:.3f}:d={fade_out:.3f},"
        "dynaudnorm=f=500:g=31,volume=-3dB"
    )
    run_ffmpeg(["-f", "lavfi", "-i", graph, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(out)])
    return out, "Música original generada por AI Video Factory"
