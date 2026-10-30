"""Construye la pista de narración completa a partir del contenido.

Cada frase se sintetiza por separado y se mide su duración real; así la línea de tiempo
(escenas, subtítulos y efectos) se basa en el audio verdadero y no en estimaciones.
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from ..core.errors import AudioError
from ..core.interfaces import SynthesisItem, TTSProvider
from ..core.models import VideoContent
from .wavutil import PcmAudio, read_wav, silence, trim_silence, write_wav

log = logging.getLogger("video_factory.audio.narration")

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?…])\s+")


@dataclass
class SentenceSpan:
    scene_id: str
    text: str
    start: float
    end: float
    word_weights: list[float]


@dataclass
class SceneSpan:
    scene_id: str
    narration_start: float
    narration_end: float


@dataclass
class NarrationResult:
    path: Path
    duration: float  # incluye entrada y cola
    speech_end: float
    sentences: list[SentenceSpan]
    scenes: list[SceneSpan]
    speed: float


def split_sentences(text: str) -> list[str]:
    parts = [p.strip() for p in _SENTENCE_SPLIT.split(" ".join(text.split())) if p.strip()]
    return parts or [text.strip()]


def syllable_estimate(word: str) -> int:
    return max(1, len(re.findall(r"[aeiouáéíóúü]+", word.lower())))


def word_weights(sentence: str, phonemes: list[int] | None) -> list[float]:
    words = sentence.split()
    if phonemes and len(phonemes) == len(words):
        base = [float(p) for p in phonemes]
    else:
        base = [syllable_estimate(w) * 2.5 for w in words]
    # Piper hace una pausa breve tras comas y dos puntos.
    return [b + (2.0 if w[-1] in ",;:" else 0.0) for b, w in zip(base, words)]


def build_narration(
    content: VideoContent,
    tts: TTSProvider,
    *,
    voice: str,
    speed: float,
    audio_cfg: dict,
    work_dir: Path,
) -> NarrationResult:
    work_dir.mkdir(parents=True, exist_ok=True)
    plan: list[tuple[str, str, Path]] = []
    for scene in content.scenes:
        for sentence in split_sentences(scene.narration):
            digest = hashlib.sha1(f"{voice}|{speed}|{sentence}".encode()).hexdigest()[:12]
            plan.append((scene.id, sentence, work_dir / f"{scene.id}_{digest}.wav"))

    pending = [SynthesisItem(text, out) for _, text, out in plan if not out.exists()]
    results = {r.path: r for r in tts.synthesize_many(pending, voice=voice, speed=speed)}

    lead_in = float(audio_cfg["lead_in_s"])
    pause = float(audio_cfg["sentence_pause_s"])
    padding = float(audio_cfg["scene_padding_s"])
    tail = float(audio_cfg["tail_s"])

    rate: int | None = None
    track = silence(0, 22050)
    t = lead_in
    sentences: list[SentenceSpan] = []
    scenes: list[SceneSpan] = []
    for scene in content.scenes:
        scene_plan = [(text, out) for sid, text, out in plan if sid == scene.id]
        scene_start = t
        for i, (text, out) in enumerate(scene_plan):
            audio = trim_silence(read_wav(out))
            if rate is None:
                rate = audio.sample_rate
                track = silence(lead_in, rate)
            elif audio.sample_rate != rate:
                raise AudioError("Las frases tienen frecuencias de muestreo distintas")
            if len(audio.samples) == 0:
                raise AudioError(f"La frase quedó sin audio: {text[:50]}")
            res = results.get(out)
            sentences.append(SentenceSpan(scene.id, text, t, t + audio.duration,
                                          word_weights(text, res.word_phonemes if res else None)))
            track.extend(audio.samples)
            t += audio.duration
            if i < len(scene_plan) - 1:
                track.extend(silence(pause, rate))
                t += pause
        scenes.append(SceneSpan(scene.id, scene_start, t))
        track.extend(silence(padding, rate))
        t += padding

    assert rate is not None
    speech_end = scenes[-1].narration_end
    # Se sustituye el último relleno de escena por la cola configurada.
    total = speech_end + tail
    wanted = int(round(total * rate))
    if len(track) > wanted:
        del track[wanted:]
    else:
        track.extend(silence((wanted - len(track)) / rate, rate))
    out_path = work_dir.parent / "narration.wav"
    write_wav(out_path, PcmAudio(track, rate))
    log.info("Narración: %.2fs (%d frases, velocidad %.2f)", total, len(sentences), speed)
    return NarrationResult(out_path, total, speech_end, sentences, scenes, speed)
