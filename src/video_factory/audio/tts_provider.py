"""Proveedores de voz (TTS). Piper es el proveedor local gratuito por defecto.

Para añadir un proveedor en la nube (Azure, Google, ElevenLabs) basta implementar
`synthesize_many` con la misma firma y registrarlo en `create_tts`.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from ..core.errors import AudioError, ConfigurationError
from ..core.media import duration_of, run_ffmpeg
from ..core.interfaces import SynthesisItem, SynthesisResult


class PiperTTS:
    name = "piper"

    def __init__(self, tts_config: dict[str, Any], models_dir: Path, worker_script: Path):
        self.cfg = tts_config
        self.models_dir = models_dir
        self.worker = worker_script

    def available_voices(self) -> dict[str, dict[str, Any]]:
        voices = {}
        for key, v in self.cfg["voices"].items():
            if (self.models_dir / f"{v['model']}.onnx").exists():
                voices[key] = v
        return voices

    def voice_info(self, voice: str) -> dict[str, Any]:
        if voice not in self.cfg["voices"]:
            raise ConfigurationError(f"Voz desconocida: {voice}")
        return self.cfg["voices"][voice]

    def _model_path(self, voice: str) -> Path:
        model = self.models_dir / f"{self.voice_info(voice)['model']}.onnx"
        if not model.exists():
            raise ConfigurationError(
                f"Falta el modelo de voz {model.name}. Ejecuta: python scripts/setup_voices.py"
            )
        return model

    def synthesize_many(self, items: list[SynthesisItem], *, voice: str, speed: float = 1.0,
                        language: str = "es") -> list[SynthesisResult]:
        if not items:
            return []
        if not 0.5 <= speed <= 2.0:
            raise AudioError(f"Velocidad fuera de rango: {speed}")
        if language != "es":
            raise ConfigurationError(f"Las voces Piper del proyecto solo hablan español; para '{language}' usa una voz Chatterbox")
        job = {
            "model": str(self._model_path(voice)),
            "length_scale": round(1.0 / speed, 4),
            "items": [{"text": i.text, "out": str(i.out)} for i in items],
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
            json.dump(job, fh, ensure_ascii=False)
            job_path = fh.name
        try:
            proc = subprocess.run(
                [sys.executable, str(self.worker), job_path],
                capture_output=True, text=True, encoding="utf-8", timeout=600,
            )
        finally:
            Path(job_path).unlink(missing_ok=True)
        if proc.returncode != 0:
            raise AudioError(f"Piper falló: {proc.stderr.strip()[-800:]}")
        raw = json.loads(proc.stdout)
        return [
            SynthesisResult(Path(r["out"]), float(r["duration"]), int(r["sample_rate"]), r.get("word_phonemes"))
            for r in raw
        ]

    def synthesize(self, text: str, out_path: Path, *, voice: str, speed: float = 1.0) -> SynthesisResult:
        return self.synthesize_many([SynthesisItem(text, out_path)], voice=voice, speed=speed)[0]


class ChatterboxTTS:
    """Chatterbox Multilingual (MIT) en su propio entorno (.venv-chatterbox). Muy lento sin GPU."""

    name = "chatterbox"

    def __init__(self, voices: dict[str, dict[str, Any]], root: Path):
        self.voices = voices
        self.root = root
        self.worker = root / "scripts" / "chatterbox_batch.py"
        sub = "Scripts/python.exe" if sys.platform == "win32" else "bin/python"
        self.python = root / ".venv-chatterbox" / sub

    def _model_dir(self, voice: str) -> Path:
        return self.root / self.voices[voice]["model_dir"]

    def _audio_prompt(self, voice: str) -> Path | None:
        """Clip de referencia (voz propia o autorizada) para clonar el timbre; None usa la voz incluida."""
        clip = self.voices[voice].get("audio_prompt")
        return (self.root / clip) if clip else None

    def available_voices(self) -> dict[str, dict[str, Any]]:
        if not self.python.exists():
            return {}
        return {k: v for k, v in self.voices.items()
                if (self._model_dir(k) / "t3_mtl23ls_v2.safetensors").exists()
                and (self._audio_prompt(k) is None or self._audio_prompt(k).exists())}

    def voice_info(self, voice: str) -> dict[str, Any]:
        return self.voices[voice]

    def synthesize_many(self, items: list[SynthesisItem], *, voice: str, speed: float = 1.0,
                        language: str = "es") -> list[SynthesisResult]:
        if not items:
            return []
        if voice not in self.available_voices():
            raise ConfigurationError("Chatterbox no está instalado (ver README: scripts/setup_chatterbox.py)")
        v = self.voices[voice]
        clip = self._audio_prompt(voice)
        job = {"model_dir": str(self._model_dir(voice)), "language": language,
               "audio_prompt": str(clip) if clip else None,
               "exaggeration": v.get("exaggeration", 0.5), "cfg_weight": v.get("cfg_weight", 0.5),
               "temperature": v.get("temperature", 0.8), "seed": v.get("seed", 1234),
               "items": [{"text": i.text, "out": str(i.out)} for i in items]}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
            json.dump(job, fh, ensure_ascii=False)
            job_path = fh.name
        try:
            proc = subprocess.run([str(self.python), str(self.worker), job_path], capture_output=True, text=True,
                                  encoding="utf-8", errors="replace", timeout=7200)
        finally:
            Path(job_path).unlink(missing_ok=True)
        if proc.returncode != 0:
            raise AudioError(f"Chatterbox falló: {proc.stderr.strip()[-800:]}")
        raw = json.loads(proc.stdout.strip().splitlines()[-1])
        # Chatterbox no tiene control de velocidad: se acelera después con atempo (conserva el tono).
        # `tempo` de la voz (providers.json) se combina con la velocidad pedida.
        tempo = float(v.get(f"tempo_{language}", v.get("tempo", 1.0))) * speed
        results = []
        for r in raw:
            out, dur = Path(r["out"]), float(r["duration"])
            if abs(tempo - 1.0) > 1e-3:
                fast = out.with_name(out.stem + ".tempo.wav")
                run_ffmpeg(["-i", str(out), "-af", f"atempo={tempo:.4f}", "-c:a", "pcm_s16le", str(fast)])
                fast.replace(out)
                dur = duration_of(out)
            results.append(SynthesisResult(out, dur, int(r["sample_rate"]), None))
        return results


class MultiEngineTTS:
    """Enruta cada voz a su motor según providers.json → tts.voices.<voz>.engine (por defecto, piper)."""

    name = "multi"

    def __init__(self, engines: dict[str, Any], voice_engine: dict[str, str]):
        self.engines = engines
        self.voice_engine = voice_engine

    def _engine(self, voice: str) -> Any:
        if voice not in self.voice_engine:
            raise ConfigurationError(f"Voz desconocida: {voice}")
        return self.engines[self.voice_engine[voice]]

    def available_voices(self) -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        for engine in self.engines.values():
            out.update(engine.available_voices())
        return out

    def voice_info(self, voice: str) -> dict[str, Any]:
        return self._engine(voice).voice_info(voice)

    def synthesize_many(self, items: list[SynthesisItem], *, voice: str, speed: float = 1.0,
                        language: str = "es") -> list[SynthesisResult]:
        return self._engine(voice).synthesize_many(items, voice=voice, speed=speed, language=language)


def create_tts(tts_config: dict[str, Any], root: Path, models_dir: Path) -> MultiEngineTTS:
    voices = tts_config["voices"]
    voice_engine = {k: v.get("engine", "piper") for k, v in voices.items()}
    piper_cfg = {**tts_config, "voices": {k: v for k, v in voices.items() if voice_engine[k] == "piper"}}
    engines: dict[str, Any] = {"piper": PiperTTS(piper_cfg, models_dir, root / "scripts" / "piper_batch.py")}
    cb = {k: v for k, v in voices.items() if voice_engine[k] == "chatterbox"}
    if cb:
        engines["chatterbox"] = ChatterboxTTS(cb, root)
    unknown = set(voice_engine.values()) - set(engines)
    if unknown:
        raise ConfigurationError(f"Motor de voz no soportado: {', '.join(sorted(unknown))}")
    return MultiEngineTTS(engines, voice_engine)
