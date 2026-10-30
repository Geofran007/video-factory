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

    def synthesize_many(self, items: list[SynthesisItem], *, voice: str, speed: float = 1.0) -> list[SynthesisResult]:
        if not items:
            return []
        if not 0.5 <= speed <= 2.0:
            raise AudioError(f"Velocidad fuera de rango: {speed}")
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


def create_tts(tts_config: dict[str, Any], root: Path, models_dir: Path) -> PiperTTS:
    provider = tts_config.get("provider", "piper")
    if provider == "piper":
        return PiperTTS(tts_config, models_dir, root / "scripts" / "piper_batch.py")
    raise ConfigurationError(f"Proveedor de voz no soportado todavía: {provider}")
