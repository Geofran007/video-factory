"""Historial de trabajos y consumo en SQLite (biblioteca estándar)."""

from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT,
    status TEXT NOT NULL,
    stage TEXT,
    progress REAL DEFAULT 0,
    output_dir TEXT NOT NULL,
    duration_s REAL,
    cost_usd REAL DEFAULT 0,
    needs_review INTEGER DEFAULT 1,
    error TEXT,
    options_json TEXT
);
CREATE TABLE IF NOT EXISTS llm_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    created_at TEXT NOT NULL,
    purpose TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    web_search_requests INTEGER,
    cost_usd REAL NOT NULL
);
"""

_UPDATABLE = {"title", "status", "stage", "progress", "duration_s", "cost_usd", "needs_review", "error", "category", "topic"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class History:
    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self._lock = threading.Lock()
        with self._conn() as c:
            c.executescript(_SCHEMA)

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
                conn.commit()
            finally:
                conn.close()

    def create_job(self, job_id: str, *, topic: str, category: str, output_dir: Path, options_json: str) -> None:
        now = _now()
        with self._conn() as c:
            c.execute(
                "INSERT INTO jobs (id, created_at, updated_at, topic, category, status, stage, output_dir, options_json)"
                " VALUES (?, ?, ?, ?, ?, 'queued', 'queued', ?, ?)",
                (job_id, now, now, topic, category, str(output_dir), options_json),
            )

    def update_job(self, job_id: str, **fields: Any) -> None:
        bad = set(fields) - _UPDATABLE
        if bad:
            raise ValueError(f"campos no actualizables: {bad}")
        if not fields:
            return
        cols = ", ".join(f"{k} = ?" for k in fields)
        with self._conn() as c:
            c.execute(f"UPDATE jobs SET {cols}, updated_at = ? WHERE id = ?", (*fields.values(), _now(), job_id))

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._conn() as c:
            row = c.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return dict(row) if row else None

    def list_jobs(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._conn() as c:
            rows = c.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def recent_topics(self, limit: int = 100) -> list[str]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT COALESCE(title, topic) AS t FROM jobs WHERE status != 'failed' ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [r["t"] for r in rows]

    def record_usage(self, job_id: str | None, purpose: str, usage: Any) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT INTO llm_usage (job_id, created_at, purpose, model, input_tokens, output_tokens,"
                " web_search_requests, cost_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (job_id, _now(), purpose, usage.model, usage.input_tokens, usage.output_tokens,
                 usage.web_search_requests, usage.cost_usd),
            )

    def spent_today_usd(self) -> float:
        today = datetime.now(timezone.utc).date().isoformat()
        with self._conn() as c:
            row = c.execute("SELECT COALESCE(SUM(cost_usd), 0) AS s FROM llm_usage WHERE created_at >= ?", (today,)).fetchone()
        return float(row["s"])
