"""Turnos de publicación y emparejado español-inglés (solo biblioteca estándar).

GitHub retrasa o descarta ejecuciones programadas, así que el workflow se intenta muchas veces al día y cada
ejecución prepara el primer turno pendiente de las próximas horas. El registro contenidos/publicados/turnos.json
evita llenar dos veces el mismo turno. Los horarios se cambian en config/horarios.json.

    python scripts/turnos.py    # escribe turno=… y canales=… para $GITHUB_OUTPUT (vacíos si no hay nada pendiente)
"""

from __future__ import annotations

import datetime as dt
import json
import random
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "horarios.json"
LEDGER = ROOT / "contenidos" / "publicados" / "turnos.json"
QUEUE = ROOT / "contenidos" / "cola"
CHANNELS = ("es", "en")
DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def target(slot: str, canal: str, cfg: dict) -> dt.datetime | None:
    """Hora UTC del turno «AAAA-MM-DD-nombre» en un canal; None si es un turno manual."""
    day, name = slot[:10], slot[11:]
    hours = {**cfg["turnos"], **({"largo": cfg["largos"]["hora"]} if "largos" in cfg else {})}
    if name not in hours:
        return None
    local = dt.datetime.fromisoformat(f"{day}T{hours[name]}:00")
    return local.replace(tzinfo=ZoneInfo(cfg["zonas"][canal])).astimezone(dt.timezone.utc)


def next_slot(now: dt.datetime, cfg: dict, ledger: dict, queued: dict[str, bool],
              queued_long: dict[str, bool] | None = None) -> tuple[str, list[str]]:
    """Primer turno con canales por llenar dentro del horizonte: (turno, canales), o ("", []).
    Los turnos «AAAA-MM-DD-largo» (semanales) son de videos largos y usan su propia cola y margen."""
    hi = now + dt.timedelta(hours=cfg["horizonte_h"])
    found = []
    for offset in range(-1, 4):
        date = (now + dt.timedelta(days=offset)).date()
        names = list(cfg["turnos"])
        if "largos" in cfg and DAYS[date.weekday()] in cfg["largos"]["dias"]:
            names.append("largo")
        for name in names:
            slot = f"{date.isoformat()}-{name}"
            long = name == "largo"
            lo = now + dt.timedelta(minutes=cfg["largos"].get("margen_min", 240) if long else cfg["margen_min"])
            times = {c: target(slot, c, cfg) for c in CHANNELS}
            # El turno se decide con su primera hora: así los dos canales entran siempre juntos.
            if not lo <= min(times.values()) <= hi:
                continue
            have = (queued_long or {}) if long else queued
            due = [c for c in CHANNELS if have.get(c) and c not in ledger.get(slot, {})]
            if due:
                found.append((min(times.values()), slot, due))
    if not found:
        return "", []
    _, slot, due = min(found)
    return slot, due


def signature(path: Path) -> str:
    """Secuencia de escenas 3D: es igual en la versión española y la inglesa de un mismo tema."""
    return ">".join(str(s.get("model3d")) for s in load(path)["scenes"])


def choose(queue: Path, canal: str, partner_signature: str, seed: str) -> Path | None:
    """Guion del mismo tema que ya subió el otro canal; si no hay, una pareja completa; si no, uno suelto."""
    sigs = {c: {signature(p): p for p in sorted((queue / c).glob("*.json"))} for c in CHANNELS}
    mine = sigs[canal]
    if partner_signature and partner_signature in mine:
        return mine[partner_signature]
    other = sigs["en" if canal == "es" else "es"]
    pairs = sorted(set(mine) & set(other))
    singles = sorted(set(mine) - set(other))
    # Si el otro canal ya subió un tema sin equivalente aquí, se usa un suelto para no romper otra pareja.
    options = (singles or pairs) if partner_signature else (pairs or singles)
    return mine[random.Random(seed).choice(options)] if options else None


def partner(ledger: dict, slot: str, canal: str) -> str:
    return ledger.get(slot, {}).get("en" if canal == "es" else "es", {}).get("firma", "")


def record(path: Path, slot: str, canal: str, entry: dict) -> None:
    ledger = load(path)
    ledger.setdefault(slot, {})[canal] = entry
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    queued = {c: any((QUEUE / c).glob("*.json")) for c in CHANNELS}
    queued_long = {c: any((ROOT / "contenidos" / "largos" / c).glob("*.json")) for c in CHANNELS}
    slot, due = next_slot(dt.datetime.now(dt.timezone.utc), load(CONFIG), load(LEDGER), queued, queued_long)
    print(f"turno={slot}")
    print(f"canales={' '.join(due)}")
    print(f"formato={'largo' if slot.endswith('-largo') else 'short'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
