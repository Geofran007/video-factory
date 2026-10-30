"""Logs de la aplicación (logs/app.log) y de cada trabajo (output/<job>/job.log)."""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

_FORMAT = "%(asctime)s %(levelname)-7s %(name)s: %(message)s"
_configured = False


def setup_logging(log_dir: Path, level: int = logging.INFO) -> None:
    global _configured
    if _configured:
        return
    log_dir.mkdir(parents=True, exist_ok=True)
    root = logging.getLogger("video_factory")
    root.setLevel(level)
    fh = RotatingFileHandler(log_dir / "app.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(logging.Formatter(_FORMAT))
    sh = logging.StreamHandler()
    sh.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
    root.addHandler(fh)
    root.addHandler(sh)
    _configured = True


def job_log_handler(job_dir: Path) -> logging.Handler:
    handler = logging.FileHandler(job_dir / "job.log", encoding="utf-8")
    handler.setFormatter(logging.Formatter(_FORMAT))
    handler.setLevel(logging.INFO)
    logger = logging.getLogger("video_factory")
    # Sin setup_logging (uso como librería) el nivel efectivo sería WARNING y el log del trabajo quedaría vacío.
    if logger.getEffectiveLevel() > logging.INFO:
        logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    return handler


def remove_handler(handler: logging.Handler) -> None:
    logging.getLogger("video_factory").removeHandler(handler)
    handler.close()
