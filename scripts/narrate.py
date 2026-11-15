#!/usr/bin/env python3
"""Narrate the stories with Kokoro TTS (British voice bm_fable) into MP3s.

Reads web/public/data/stories.json (run build_stories.py first) and writes
web/public/media/audio/<id>/<level>-<beat>.mp3. Only approved stories are narrated
unless --all is given. Map-only explorers get their verified NASA summary narrated
(<id>/summary.mp3). A clip is regenerated only when its text changes.
Every MP3 is tagged as synthetic speech (SI-generated audio) in its ID3 metadata.

    python3 scripts/narrate.py              # approved stories + map-only summaries
    python3 scripts/narrate.py --all        # include drafts (for listening tests)
    python3 scripts/narrate.py --only spirit,dawn
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

from speech import SPEED, VOICE, clip_digest, clip_name, speakable, summary_clip_name

ROOT = Path(__file__).resolve().parent.parent
STORIES = ROOT / "web" / "public" / "data" / "stories.json"
ARTIFACTS = ROOT / "web" / "public" / "data" / "artifacts.json"
LINES = ROOT / "scripts" / "lines.json"
LAB_LINES = ROOT / "web" / "src" / "lib" / "labLines.json"  # what the hands-on moments say (also shown on screen)
AUDIO = ROOT / "web" / "public" / "media" / "audio"
MANIFEST = AUDIO / "manifest.json"
RATE = 24_000

_pipeline: KPipeline | None = None


def voice(text: str, out: Path, title: str) -> float:
    """Speak `text` into an MP3 at `out`, tagged as synthetic speech. Returns its length in seconds."""
    global _pipeline
    _pipeline = _pipeline or KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
    chunks = [np.asarray(a, dtype=np.float32) for _, _, a in _pipeline(speakable(text), voice=VOICE, speed=SPEED)]
    audio = np.concatenate([np.zeros(int(RATE * 0.25), dtype=np.float32), *chunks, np.zeros(int(RATE * 0.4), dtype=np.float32)])
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        sf.write(wav.name, audio, RATE)
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", wav.name,
                "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "80k", "-id3v2_version", "3",
                "-metadata", f"title={title}",
                "-metadata", "artist=Mission Memory",
                "-metadata", "album=Mission Memory: the explorers NASA left behind",
                "-metadata", "comment=Synthetic (SI-generated) voice: Kokoro-82M TTS, voice bm_fable. Text fact-checked against NASA sources.",
                "-metadata", "synthetic_voice=Kokoro-82M bm_fable",
                str(out),
            ],
            check=True,
        )
    return len(audio) / RATE


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="also narrate stories still in draft")
    ap.add_argument("--only", default="", help="comma-separated explorer ids")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        print("✗ ffmpeg is required", file=sys.stderr)
        return 1
    only = {s for s in args.only.split(",") if s}
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    made = skipped = 0

    # What to say: (clip path, text, title).
    jobs: list[tuple[str, str, str]] = []
    data = json.loads(STORIES.read_text())
    for sid, story in data["stories"].items():
        if only and sid not in only:
            continue
        if story["reviewStatus"] != "approved" and not args.all:
            print(f"  · {sid}: draft, skipped (use --all to narrate drafts)")
            continue
        for level, label in data["levels"].items():
            for beat in story["beats"]:
                jobs.append((clip_name(sid, level, beat["key"]), beat["text"][level], f"{beat['title']} ({label})"))
    # Map-only explorers: NASA's catalog summary (already verified by ingest.py), heard when the tuner finds them.
    for a in json.loads(ARTIFACTS.read_text())["artifacts"]:
        if a["tier"] == "map" and (not only or a["id"] in only):
            jobs.append((summary_clip_name(a["id"]), a["summary"], f"{a['name']}: NASA summary"))
    # Site lines (e.g. the Mission Control welcome on the landing page).
    if not only:
        for key, text in json.loads(LINES.read_text()).items():
            if not key.startswith("_"):
                jobs.append((f"site/{key}.mp3", text, f"Mission Control: {key}"))
        for key, text in json.loads(LAB_LINES.read_text()).items():
            if not key.startswith("_"):
                jobs.append((f"labs/{key}.mp3", text, f"Hands-on: {key}"))

    for rel, text, title in jobs:
        out = AUDIO / rel
        digest = clip_digest(text)
        if out.exists() and manifest.get(rel) == digest:
            skipped += 1
            continue
        seconds = voice(text, out, title)
        manifest[rel] = digest
        made += 1
        print(f"  ♪ {rel}  ({seconds:.1f} s)")

    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=2) + "\n")
    print(f"✓ {made} clips narrated, {skipped} unchanged. Run build_stories.py to publish them.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
