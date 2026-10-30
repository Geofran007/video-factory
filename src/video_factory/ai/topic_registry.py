"""Detección de temas repetidos sin llamadas externas."""

from __future__ import annotations

import difflib
import re
import unicodedata

_STOP = {"el", "la", "los", "las", "de", "del", "que", "y", "en", "un", "una", "por", "para", "con", "se",
         "es", "son", "a", "al", "sabias", "datos", "dato", "curioso", "curiosos", "lo", "su", "sus"}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    words = [w for w in re.findall(r"[a-z0-9ñ]+", text) if w not in _STOP]
    return " ".join(words)


def similarity(a: str, b: str) -> float:
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return 0.0
    seq = difflib.SequenceMatcher(None, na, nb).ratio()
    sa, sb = set(na.split()), set(nb.split())
    jaccard = len(sa & sb) / len(sa | sb)
    return max(seq, jaccard)


def find_duplicate(topic: str, previous: list[str], threshold: float = 0.72) -> str | None:
    best = max(previous, key=lambda p: similarity(topic, p), default=None)
    if best is not None and similarity(topic, best) >= threshold:
        return best
    return None
