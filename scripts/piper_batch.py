"""Proceso independiente que sintetiza un lote de frases con Piper (GPL-3.0).

Se ejecuta como programa separado para que el resto del proyecto no importe Piper.
Entrada: ruta a un JSON {"model": str, "length_scale": float, "items": [{"text": str, "out": str}]}
Salida (stdout): JSON [{"out", "duration", "sample_rate", "word_phonemes": [int, ...]}]
"""

from __future__ import annotations

import json
import sys
import wave

from piper import PiperVoice, SynthesisConfig

_SKIP = {"ˈ", "ˌ", "ː", ".", ",", ";", ":", "!", "?", "¡", "¿", "…", "-", "—"}


def word_phoneme_counts(phonemes: list[str]) -> list[int]:
    counts, current = [], 0
    for ph in phonemes:
        if ph == " ":
            if current:
                counts.append(current)
            current = 0
        elif ph not in _SKIP:
            current += 1
    if current:
        counts.append(current)
    return counts


def main() -> int:
    job = json.loads(open(sys.argv[1], encoding="utf-8").read())
    voice = PiperVoice.load(job["model"])
    # Piper normaliza al pico máximo (0 dBFS); volume=0.7 deja ~3 dB de margen y evita clipping.
    cfg = SynthesisConfig(length_scale=float(job.get("length_scale", 1.0)), volume=float(job.get("volume", 0.7)))
    results = []
    for item in job["items"]:
        words: list[int] = []
        frames = 0
        with wave.open(item["out"], "wb") as wf:
            first = True
            for chunk in voice.synthesize(item["text"], syn_config=cfg):
                if first:
                    wf.setframerate(chunk.sample_rate)
                    wf.setsampwidth(chunk.sample_width)
                    wf.setnchannels(chunk.sample_channels)
                    first = False
                wf.writeframes(chunk.audio_int16_bytes)
                frames += len(chunk.audio_int16_bytes) // (chunk.sample_width * chunk.sample_channels)
                words.extend(word_phoneme_counts(chunk.phonemes))
                rate = chunk.sample_rate
        if first:
            raise SystemExit(f"Piper no produjo audio para: {item['text'][:60]}")
        results.append({"out": item["out"], "duration": frames / rate, "sample_rate": rate, "word_phonemes": words})
    sys.stdout.write(json.dumps(results))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
