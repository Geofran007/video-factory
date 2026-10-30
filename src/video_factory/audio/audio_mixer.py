"""Mezcla final: narración + música con ducking + efectos, normalizada a -14 LUFS sin clipping."""

from __future__ import annotations

from pathlib import Path

from ..core.media import run_ffmpeg
from ..core.models import Timeline


def mix(
    timeline: Timeline,
    narration: Path,
    music: Path | None,
    sfx_files: dict[str, Path],
    out: Path,
    audio_cfg: dict,
) -> Path:
    duration = timeline.duration
    inputs = ["-i", str(narration)]
    filters = [
        "[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=mono,"
        f"apad=whole_dur={duration:.3f},asplit=2[voice][key]"
    ]
    mix_labels = ["[voice]"]
    idx = 1
    if music is not None:
        d = audio_cfg["ducking"]
        inputs += ["-i", str(music)]
        filters.append(
            f"[{idx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"volume={audio_cfg['music_volume_db']}dB[mus]"
        )
        filters.append(
            f"[mus][key]sidechaincompress=threshold={d['threshold']}:ratio={d['ratio']}:"
            f"attack={d['attack_ms']}:release={d['release_ms']}:makeup=1[ducked]"
        )
        mix_labels.append("[ducked]")
        idx += 1
    else:
        filters.append("[key]anullsink")

    for n, event in enumerate(timeline.sfx):
        path = sfx_files.get(event.name)
        if path is None:
            continue
        inputs += ["-i", str(path)]
        delay = int(round(event.at * 1000))
        filters.append(
            f"[{idx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"adelay={delay}|{delay},volume={audio_cfg['sfx_volume_db']}dB[s{n}]"
        )
        mix_labels.append(f"[s{n}]")
        idx += 1

    filters.append(
        f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:normalize=0:duration=first,"
        f"loudnorm=I={audio_cfg['target_lufs']}:TP={audio_cfg['true_peak_db']}:LRA=11,"
        f"aresample=48000,alimiter=limit=0.85:level=false,"
        f"atrim=0:{duration:.3f},apad=whole_dur={duration:.3f}[out]"
    )
    run_ffmpeg([*inputs, "-filter_complex", ";".join(filters), "-map", "[out]",
                "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", str(out)])
    return out
