from array import array

import pytest

from video_factory.audio.narration import build_narration, split_sentences, word_weights
from video_factory.audio.wavutil import PcmAudio, peak_dbfs, read_wav, trim_silence
from video_factory.timeline.subtitle_generator import to_srt
from video_factory.timeline.timeline_builder import build_timeline
from video_factory.validation import media_qa


def test_split_sentences():
    assert split_sentences("Hola. ¿Qué tal? Bien!  Fin") == ["Hola.", "¿Qué tal?", "Bien!", "Fin"]


def test_word_weights_use_phonemes_when_counts_match():
    assert word_weights("uno dos", [3, 5]) == [3.0, 5.0]
    w = word_weights("hola, mundo", [9])  # no coincide: se estima por sílabas
    assert len(w) == 2 and w[0] > w[1] - 1  # la coma añade peso de pausa


def test_trim_silence_and_peak():
    a = PcmAudio(array("h", [0] * 1000 + [10000] * 500 + [0] * 1000), 22050)
    t = trim_silence(a, keep_s=0.01)
    keep = int(0.01 * 22050)
    assert len(t.samples) == 500 + 2 * keep
    assert peak_dbfs(t) == pytest.approx(-10.3, abs=0.1)


@pytest.fixture
def narration(example_content, fake_tts, cfg, tmp_path):
    return build_narration(example_content, fake_tts, voice="masculina", speed=1.0, audio_cfg=cfg.audio,
                           work_dir=tmp_path / "parts")


def test_narration_spans_match_audio(narration, example_content, cfg):
    audio = read_wav(narration.path)
    assert audio.duration == pytest.approx(narration.duration, abs=0.01)
    assert [s.scene_id for s in narration.scenes] == [s.id for s in example_content.scenes]
    assert narration.sentences[0].start == pytest.approx(cfg.audio["lead_in_s"])
    for a, b in zip(narration.sentences, narration.sentences[1:]):
        assert b.start >= a.end  # sin solapamientos
    assert narration.duration - narration.speech_end == pytest.approx(cfg.audio["tail_s"], abs=0.01)


def test_narration_cache_avoids_resynthesis(example_content, fake_tts, cfg, tmp_path):
    for _ in range(2):
        build_narration(example_content, fake_tts, voice="masculina", speed=1.0, audio_cfg=cfg.audio,
                        work_dir=tmp_path / "parts")
    assert fake_tts.calls == 2  # la segunda vez el lote llega vacío
    # El proveedor recibió una lista vacía en la segunda llamada; no se regeneró ningún archivo.


def test_timeline_is_consistent(narration, example_content, cfg):
    tl = build_timeline(example_content, narration, video_cfg=cfg.video, subtitle_cfg=cfg.settings["subtitles"],
                        voice_attribution=None)
    report = media_qa.QAReport()
    media_qa.check_timeline(tl, report, min_s=15, max_s=60)
    assert report.passed, report.failures()
    assert tl.duration == pytest.approx(narration.duration, abs=1e-3)
    assert tl.frame_count == round(tl.duration * 30)
    # Se permite una palabra extra para no dejar una palabra huérfana en el siguiente subtítulo.
    assert all(len(c.words) <= cfg.settings["subtitles"]["max_words_per_cue"] + 1 for c in tl.cues)
    spoken = " ".join(c.text for c in tl.cues)
    assert spoken == " ".join(s.narration for s in example_content.scenes)
    names = {e.name for e in tl.sfx}
    assert {"impact", "whoosh"} <= names


def test_srt_format(narration, example_content, cfg):
    tl = build_timeline(example_content, narration, video_cfg=cfg.video, subtitle_cfg=cfg.settings["subtitles"],
                        voice_attribution=None)
    srt = to_srt(tl.cues)
    first = srt.split("\n\n")[0].splitlines()
    assert first[0] == "1"
    assert first[1].startswith("00:00:00,") and " --> " in first[1]


def test_trailing_silence_parser():
    log = "silence_start: 1.0\nsilence_end: 2.0\nsilence_start: 38.5\n"
    assert media_qa.trailing_silence(log, 40.0) == pytest.approx(1.5)
    assert media_qa.trailing_silence("silence_start: 3\nsilence_end: 4\n", 40.0) == 0.0
    assert media_qa.trailing_silence("silence_start: 39\nsilence_end: 40\n", 40.0) == pytest.approx(1.0)
