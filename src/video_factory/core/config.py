"""Carga de configuración desde config/*.json y variables de entorno."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class AppConfig:
    root: Path
    settings: dict[str, Any]
    providers: dict[str, Any]

    def path(self, key: str) -> Path:
        p = Path(self.settings["paths"][key])
        return p if p.is_absolute() else self.root / p

    @property
    def video(self) -> dict[str, Any]:
        return self.settings["video"]

    @property
    def audio(self) -> dict[str, Any]:
        return self.settings["audio"]

    @property
    def limits(self) -> dict[str, Any]:
        return self.settings["limits"]

    @property
    def qa(self) -> dict[str, Any]:
        return self.settings["qa"]

    @property
    def llm(self) -> dict[str, Any]:
        return self.providers["llm"]

    @property
    def tts(self) -> dict[str, Any]:
        return self.providers["tts"]


def _env_overrides(settings: dict[str, Any], providers: dict[str, Any]) -> None:
    if model := os.getenv("VF_LLM_MODEL"):
        providers["llm"]["model"] = model
    if (ws := os.getenv("VF_WEB_SEARCH")) is not None:
        providers["llm"]["web_search"]["enabled"] = ws.strip().lower() in {"1", "true", "yes", "si", "sí"}
    if budget := os.getenv("VF_DAILY_BUDGET_USD"):
        settings["limits"]["daily_budget_usd"] = float(budget)


@lru_cache(maxsize=1)
def load_config(root: str | None = None) -> AppConfig:
    base = Path(root) if root else ROOT
    load_dotenv(base / ".env", override=False)
    settings = json.loads((base / "config" / "settings.json").read_text(encoding="utf-8"))
    providers = json.loads((base / "config" / "providers.json").read_text(encoding="utf-8"))
    _env_overrides(settings, providers)
    return AppConfig(root=base, settings=settings, providers=providers)
