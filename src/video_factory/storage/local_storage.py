"""Almacenamiento local. En Fase 2 se añadirán backends externos con la misma interfaz."""

from __future__ import annotations

from pathlib import Path


class LocalStorage:
    """Los archivos ya viven en output/<job_id>/; este backend solo resuelve rutas."""

    def __init__(self, output_root: Path):
        self.output_root = output_root

    def job_dir(self, job_id: str) -> Path:
        return self.output_root / job_id

    def save(self, job_id: str, local_path: Path) -> str:
        return str(local_path.resolve())

    def url_for(self, job_id: str, name: str) -> str:
        return f"/api/jobs/{job_id}/files/{name}"
