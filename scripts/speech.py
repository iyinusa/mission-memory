"""Narration settings shared by narrate.py (voices the clips) and build_stories.py (checks they are current)."""

import hashlib
import re

VOICE = "bm_fable"  # Kokoro-82M, British
SPEED = 0.95  # a touch slower for young listeners

# Written forms that read badly aloud.
SPEECH = [
    (r"\bNEAR\b", "Near"),
    (r"(\d)\s?km\b", r"\1 kilometres"),
    (r"(\d)\s?kg\b", r"\1 kilograms"),
    (r"(\d)\s?cm\b", r"\1 centimetres"),
    (r"(\d)\s?rpm\b", r"\1 revolutions per minute"),
    (r"(\d)%", r"\1 percent"),
    (r"\bA\.D\.", "A D"),
    (r"\"", ""),
]


def speakable(text: str) -> str:
    for pattern, repl in SPEECH:
        text = re.sub(pattern, repl, text)
    return text


def clip_name(sid: str, level: str, beat_key: str) -> str:
    return f"{sid}/{level}-{beat_key}.mp3"


def summary_clip_name(sid: str) -> str:
    """Narrated NASA summary for map-only explorers, heard when the tuner finds them."""
    return f"{sid}/summary.mp3"


def clip_digest(text: str) -> str:
    """Identifies a clip by what was spoken and how; changes when the story text changes."""
    return hashlib.sha1(f"{VOICE}|{SPEED}|{speakable(text)}".encode()).hexdigest()
