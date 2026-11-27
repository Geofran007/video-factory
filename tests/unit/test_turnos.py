import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import turnos  # noqa: E402

CFG = {"turnos": {"manana": "09:00", "tarde": "17:00"},
       "zonas": {"es": "America/Guayaquil", "en": "America/New_York"}, "horizonte_h": 24, "margen_min": 75}
BOTH = {"es": True, "en": True}


def at(text):
    return dt.datetime.fromisoformat(text).replace(tzinfo=dt.timezone.utc)


def test_target_follows_local_time_and_dst():
    assert turnos.target("2026-11-26-manana", "es", CFG) == at("2026-11-26T14:00")
    assert turnos.target("2026-11-26-manana", "en", CFG) == at("2026-11-26T14:00")
    assert turnos.target("2026-07-01-manana", "en", CFG) == at("2026-07-01T13:00")
    assert turnos.target("manual-123", "es", CFG) is None


def test_fills_each_slot_once_and_ahead():
    now, ledger, seen = at("2026-11-25T18:17"), {}, []
    for _ in range(4):
        slot, due = turnos.next_slot(now, CFG, ledger, BOTH)
        if slot:
            seen.append(slot)
            ledger[slot] = {c: {} for c in due}
    assert seen == ["2026-11-25-tarde", "2026-11-26-manana"]


def test_skips_slot_too_close_and_retries_missing_channel():
    now = at("2026-11-25T21:30")
    assert turnos.next_slot(now, CFG, {}, BOTH)[0] == "2026-11-26-manana"
    assert turnos.next_slot(now, CFG, {"2026-11-26-manana": {"es": {}}}, BOTH) == ("2026-11-26-manana", ["en"])
    assert turnos.next_slot(now, CFG, {}, {}) == ("", [])


def test_both_channels_stay_together_in_summer():
    # A las 11:50 UTC el inglés (13:00) ya está muy cerca; el español (14:00) no debe quedarse solo con el turno.
    assert turnos.next_slot(at("2026-07-01T11:50"), CFG, {}, BOTH) == ("2026-07-01-tarde", ["es", "en"])


def test_survives_long_delays():
    ledger, now = {}, at("2026-11-26T00:17")
    while now < at("2026-12-06T00:17"):
        slot, due = turnos.next_slot(now, CFG, ledger, BOTH)
        if slot:
            ledger[slot] = {c: {} for c in due}
        now += dt.timedelta(hours=10)
    days = [f"2026-11-{d}" for d in (27, 28, 29, 30)]
    assert all(f"{d}-{n}" in ledger for d in days for n in CFG["turnos"])


def make(queue, canal, name, model):
    (queue / canal).mkdir(parents=True, exist_ok=True)
    (queue / canal / f"{name}.json").write_text(json.dumps({"scenes": [{"model3d": model}]}), encoding="utf-8")


def test_both_channels_take_the_same_topic(tmp_path):
    for m in ("sol", "luna", "mar"):
        make(tmp_path, "es", f"es-{m}", m)
        make(tmp_path, "en", f"en-{m}", m)
    make(tmp_path, "es", "es-suelto", "suelto")
    es = turnos.choose(tmp_path, "es", "", "x")
    assert es.stem != "es-suelto"
    sig = turnos.signature(es)
    es.unlink()
    assert turnos.choose(tmp_path, "en", sig, "x").stem == "en-" + sig


def test_topic_without_counterpart_uses_a_single(tmp_path):
    make(tmp_path, "es", "es-sol", "sol")
    make(tmp_path, "en", "en-sol", "sol")
    make(tmp_path, "en", "en-otro", "otro")
    assert turnos.choose(tmp_path, "en", "suelto-ya-subido", "x").stem == "en-otro"


def test_record_keeps_other_channel(tmp_path):
    path = tmp_path / "turnos.json"
    turnos.record(path, "s", "es", {"firma": "a"})
    turnos.record(path, "s", "en", {"firma": "b"})
    assert set(turnos.load(path)["s"]) == {"es", "en"}
    assert turnos.partner(turnos.load(path), "s", "en") == "a"


def test_real_queue_has_no_duplicate_topics():
    for c in turnos.CHANNELS:
        files = list((turnos.QUEUE / c).glob("*.json"))
        assert len({turnos.signature(p) for p in files}) == len(files)


LONG = {**CFG, "largos": {"dia": "sabado", "hora": "10:00", "margen_min": 240}}


def test_weekly_long_slot_on_saturday():
    # Viernes 27/11 a las 20:17 UTC: el sábado 28 a las 10:00 (15:00 UTC) está dentro del horizonte.
    now = at("2026-11-27T20:17")
    done = {s: {"es": {}, "en": {}} for s in ("2026-11-27-tarde", "2026-11-28-manana")}
    slot, due = turnos.next_slot(now, LONG, done, BOTH, BOTH)
    assert (slot, due) == ("2026-11-28-largo", ["es", "en"])
    assert turnos.target("2026-11-28-largo", "es", LONG) == at("2026-11-28T15:00")
    # Sin guiones largos en cola, el turno largo no existe.
    assert turnos.next_slot(now, LONG, done, BOTH, {})[0] == ""  # el turno de la tarde aún está fuera del horizonte


def test_long_slot_needs_more_margin():
    # A las 12:00 UTC faltan 3 h: no da tiempo a generar un video largo (margen 4 h).
    ledger = {"2026-11-28-tarde": {"es": {}, "en": {}}}
    assert turnos.next_slot(at("2026-11-28T12:00"), LONG, ledger, {}, BOTH) == ("", [])
