"""Proceso independiente que sintetiza un lote de frases con Chatterbox (MIT), en su propio entorno.

Se ejecuta con .venv-chatterbox (sus dependencias fijas chocan con las del proyecto).
Entrada: ruta a un JSON {"model_dir", "language", "exaggeration", "cfg_weight", "temperature", "seed",
                         "audio_prompt" (opcional, clip de referencia autorizado), "items": [{"text", "out"}]}
Salida (stdout, última línea): JSON [{"out", "duration", "sample_rate", "word_phonemes": null}]
"""

from __future__ import annotations

import json
import sys
import time
import wave

from pathlib import Path

import numpy as np
import torch
from chatterbox.models.s3gen import S3Gen
from chatterbox.models.t3 import T3
from chatterbox.models.t3.modules.t3_config import T3Config
from chatterbox.models.tokenizers import MTLTokenizer
from chatterbox.models.voice_encoder import VoiceEncoder
from chatterbox.mtl_tts import ChatterboxMultilingualTTS, Conditionals
from safetensors.torch import load_file

# Buffers que S3Gen recalcula al construirse; el checkpoint v3 latino no los incluye.
_RECOMPUTED = {"tokenizer._mel_filters", "tokenizer.window"}


def load_model(model_dir: str) -> ChatterboxMultilingualTTS:
    d = Path(model_dir)
    cpu = torch.device("cpu")
    ve = VoiceEncoder()
    ve.load_state_dict(torch.load(d / "ve.pt", map_location=cpu, weights_only=True))
    t3 = T3(T3Config.multilingual())
    state = load_file(d / "t3_mtl23ls_v2.safetensors")
    t3.load_state_dict(state["model"][0] if "model" in state else state)
    s3gen = S3Gen()
    result = s3gen.load_state_dict(torch.load(d / "s3gen.pt", map_location=cpu, weights_only=True), strict=False)
    unexpected_missing = set(result.missing_keys) - _RECOMPUTED
    if unexpected_missing or result.unexpected_keys:
        raise RuntimeError(f"Checkpoint S3Gen incompatible: faltan {unexpected_missing}, sobran {result.unexpected_keys}")
    tokenizer = MTLTokenizer(str(d / "grapheme_mtl_merged_expanded_v1.json"))
    conds = Conditionals.load(d / "conds.pt", map_location=cpu)
    for m in (ve, t3, s3gen):
        m.eval()
    return ChatterboxMultilingualTTS(t3, s3gen, ve, tokenizer, "cpu", conds=conds)


TOKENS_PER_SECOND = 25  # tasa del tokenizador de voz S3
SECONDS_PER_WORD = 0.40  # ritmo esperado en español


def cap_tokens(model: ChatterboxMultilingualTTS, max_tokens: int) -> None:
    """La librería fija max_new_tokens=1000 (~40 s); se limita por frase para evitar audio desbocado."""
    original = model.t3.inference.__func__ if hasattr(model.t3.inference, "__func__") else None
    t3 = model.t3

    def limited(*args, **kwargs):
        kwargs["max_new_tokens"] = max_tokens
        return original(t3, *args, **kwargs)

    t3.inference = limited


def trim_overrun(audio: np.ndarray, sr: int, expected_s: float) -> np.ndarray:
    """Si el audio supera lo esperado, corta en la primera pausa (≥120 ms) después del 85 % esperado."""
    if len(audio) / sr <= expected_s * 1.3:
        return audio
    frame = int(0.02 * sr)
    rms = np.sqrt(np.convolve(audio ** 2, np.ones(frame) / frame, mode="same"))
    quiet = rms < max(1e-4, 0.08 * float(np.percentile(rms, 95)))
    start = int(expected_s * 0.85 * sr)
    need = int(0.12 * sr)
    run = 0
    for i in range(start, len(audio)):
        run = run + 1 if quiet[i] else 0
        if run >= need:
            return audio[: i - need + int(0.05 * sr)]
    return audio


def main() -> int:
    job = json.loads(open(sys.argv[1], encoding="utf-8").read())
    if job.get("threads"):
        torch.set_num_threads(int(job["threads"]))
    t0 = time.time()
    model = load_model(job["model_dir"])
    print(f"modelo cargado en {time.time() - t0:.1f}s", file=sys.stderr, flush=True)
    results = []
    original_inference = model.t3.inference
    for i, item in enumerate(job["items"]):
        torch.manual_seed(int(job.get("seed", 1234)) + i)  # resultados reproducibles
        t1 = time.time()
        expected = max(1.0, len(item["text"].split()) * SECONDS_PER_WORD)
        model.t3.inference = original_inference
        cap_tokens(model, int((expected * 1.6 + 0.6) * TOKENS_PER_SECOND))
        wav = model.generate(
            item["text"],
            language_id=job.get("language", "es"),
            audio_prompt_path=job.get("audio_prompt"),
            exaggeration=float(job.get("exaggeration", 0.5)),
            cfg_weight=float(job.get("cfg_weight", 0.5)),
            temperature=float(job.get("temperature", 0.8)),
        )
        audio = trim_overrun(wav.squeeze(0).detach().cpu().numpy().astype(np.float32), model.sr, expected)
        peak = float(np.max(np.abs(audio))) or 1.0
        pcm = (audio / peak * 0.7 * 32767).astype(np.int16)  # ~-3 dBFS de margen, igual que Piper
        with wave.open(item["out"], "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(model.sr)
            wf.writeframes(pcm.tobytes())
        dur = len(pcm) / model.sr
        print(f"[{i + 1}/{len(job['items'])}] {dur:.2f}s de audio en {time.time() - t1:.1f}s", file=sys.stderr, flush=True)
        results.append({"out": item["out"], "duration": dur, "sample_rate": model.sr, "word_phonemes": None})
    sys.stdout.write(json.dumps(results) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
