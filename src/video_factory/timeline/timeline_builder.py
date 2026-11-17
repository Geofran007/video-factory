"""Construye la línea de tiempo: la única fuente de verdad para render, subtítulos y mezcla."""

from __future__ import annotations

from ..audio.narration import NarrationResult, SentenceSpan
from ..core.models import Cue, SfxEvent, Timeline, TimelineScene, VideoContent, Word


def _sentence_words(span: SentenceSpan) -> list[Word]:
    words = span.text.split()
    total = sum(span.word_weights) or 1.0
    t = span.start
    out = []
    for w, weight in zip(words, span.word_weights):
        d = (span.end - span.start) * weight / total
        out.append(Word(text=w, start=round(t, 3), end=round(t + d, 3)))
        t += d
    return out


def build_cues(sentences: list[SentenceSpan], *, max_words: int, min_cue_s: float) -> list[Cue]:
    cues: list[Cue] = []
    for span in sentences:
        words = _sentence_words(span)
        chunk: list[Word] = []
        for i, w in enumerate(words):
            chunk.append(w)
            last = i == len(words) - 1
            # Corta en el límite de palabras o tras puntuación interna. Si el corte dejaría una sola palabra
            # para el siguiente subtítulo, se incluye aquí (máximo max_words + 1).
            remaining = len(words) - i - 1
            boundary = len(chunk) >= max_words or (w.text[-1] in ",;:" and len(chunk) >= 2)
            if last or (boundary and remaining != 1):
                cues.append(Cue(start=chunk[0].start, end=chunk[-1].end,
                                text=" ".join(x.text for x in chunk), words=chunk))
                chunk = []
    # Duración mínima legible: se extiende hasta el inicio del siguiente sin solaparse.
    for i, cue in enumerate(cues):
        if cue.end - cue.start < min_cue_s:
            limit = cues[i + 1].start if i + 1 < len(cues) else cue.start + min_cue_s
            cue.end = round(min(cue.start + min_cue_s, limit), 3)
    return cues


def build_timeline(
    content: VideoContent,
    narration: NarrationResult,
    *,
    video_cfg: dict,
    subtitle_cfg: dict,
    voice_attribution: str | None,
    style: str | None = None,
) -> Timeline:
    spans = {s.scene_id: s for s in narration.scenes}
    scenes: list[TimelineScene] = []
    start = 0.0
    for i, scene in enumerate(content.scenes):
        span = spans[scene.id]
        is_last = i == len(content.scenes) - 1
        if is_last:
            end = narration.duration
        else:
            nxt = spans[content.scenes[i + 1].id]
            # El corte visual cae a mitad del silencio entre escenas.
            end = (span.narration_end + nxt.narration_start) / 2
        scenes.append(TimelineScene(id=scene.id, index=i, start=round(start, 3), end=round(end, 3),
                                    narration_start=span.narration_start, narration_end=span.narration_end,
                                    scene=scene))
        start = end

    sfx: list[SfxEvent] = []
    for ts in scenes:
        if ts.scene.sfx != "none":
            sfx.append(SfxEvent(name=ts.scene.sfx, at=round(ts.start + (0.05 if ts.index else 0.15), 3)))
        if ts.index > 0 and ts.scene.sfx != "whoosh":
            sfx.append(SfxEvent(name="whoosh", at=round(max(0.0, ts.start - 0.12), 3)))
    sfx.sort(key=lambda e: e.at)

    return Timeline(
        width=int(video_cfg["width"]),
        height=int(video_cfg["height"]),
        fps=int(video_cfg["fps"]),
        duration=round(narration.duration, 3),
        style=style or content.category,
        category=content.category,
        title=content.title,
        scenes=scenes,
        cues=build_cues(narration.sentences, max_words=int(subtitle_cfg["max_words_per_cue"]),
                        min_cue_s=float(subtitle_cfg["min_cue_s"])),
        sfx=sfx,
        narration_file=narration.path.name,
        voice_attribution=voice_attribution,
        presenter=content.presenter,
    )
