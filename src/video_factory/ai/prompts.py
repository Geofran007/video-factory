"""Carga de plantillas de prompts (prompts/*.md) con secciones # SISTEMA / # USUARIO."""

from __future__ import annotations

import re
from pathlib import Path

_PLACEHOLDER = re.compile(r"\{\{(\w+)\}\}")


def render(template: str, **values: object) -> str:
    def sub(m: re.Match[str]) -> str:
        key = m.group(1)
        if key not in values:
            raise KeyError(f"Falta el valor '{key}' para la plantilla de prompt")
        return str(values[key])

    return _PLACEHOLDER.sub(sub, template)


def load_prompt(prompts_dir: Path, prompt_name: str, /, **values: object) -> tuple[str, str]:
    """Devuelve (system, user). Los archivos sin secciones se tratan como texto de usuario."""
    text = (prompts_dir / f"{prompt_name}.md").read_text(encoding="utf-8")
    if "# SISTEMA" in text and "# USUARIO" in text:
        system_part, user_part = text.split("# USUARIO", 1)
        system = system_part.replace("# SISTEMA", "", 1).strip()
        return render(system, **values), render(user_part.strip(), **values)
    return "", render(text.strip(), **values)


def load_fragment(prompts_dir: Path, name: str) -> str:
    return (prompts_dir / f"{name}.md").read_text(encoding="utf-8").strip()
