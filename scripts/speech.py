"""Narration settings shared by narrate.py (voices the clips) and build_stories.py (checks they are current)."""

import hashlib
import re

VOICE = "bm_fable"  # Kokoro-82M, British
SPEED = 0.95  # a touch slower for young listeners

# Written forms that read badly aloud.
SPEECH = [
    (r"\bNEAR\b", "Near"),
    (r"(\d)\s?km/h\b", r"\1 kilometres an hour"),
    (r"(\d)\s?km\b", r"\1 kilometres"),
    (r"(\d)\s?kg\b", r"\1 kilograms"),
    (r"(\d)\s?cm\b", r"\1 centimetres"),
    (r"(\d)\s?rpm\b", r"\1 revolutions per minute"),
    (r"(\d)%", r"\1 percent"),
    (r"\bA\.D\.\s+We\b", "[A.D.](/ˌAdˈiː/), we"),  # the Apollo 11 plaque; a pause keeps "A.D. We" from running together
    (r"\b0?(\d{1,2}):(\d{2}) UT\b", r"\1 \2 Universal Time"),
    (r"\bDelta II\b", "Delta 2"),
    (r"\bmarsquakes\b", "Mars quakes"),
    (r"\"", ""),
]

# Names and words Kokoro's British G2P gets wrong, with the phonemes it should use (Kokoro's own
# alphabet: I = "eye", A = "ay", Q = "oh"). Checked by listening with Whisper and by printing G2P output.
SAY_AS = {
    "Chryse": "kɹˈIsi",  # KRY-see, not "cries"
    "Jezero": "ʤˈɛzəɹQ",  # JEZ-er-oh, as NASA says it
    "Gusev": "ɡˈuːsɛv",  # GOO-sev
    "Rheasilvia": "ɹˌiːəsˈɪlviə",  # ree-a-SIL-via
    "ion": "ˈIɒn",  # EYE-on; the default sounds like British "iron"
    "batteries": "bˈatəɹiz",  # the default stresses the last syllable
}
SPEECH += [(rf"\b{word}\b", f"[{word}](/{ph}/)") for word, ph in SAY_AS.items()]


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
