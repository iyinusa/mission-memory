#!/usr/bin/env python3
"""Fetch the NASA images chosen in scripts/images.json from the NASA Image and Video Library.

For each image: official metadata (title, description, credit) from images-api.nasa.gov, the largest
JPEG rendition, resized to 1400 px with macOS `sips` into web/public/media/images/<ghost>/.
Writes web/public/data/images.json (merged into stories by build_stories.py) and the image
credits block in CREDITS.md.

    python3 scripts/images.py
"""

import json
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import ingest

SRC = ingest.ROOT / "scripts" / "images.json"
OUT = ingest.ROOT / "web" / "public" / "data" / "images.json"
MEDIA = ingest.ROOT / "web" / "public" / "media" / "images"
CACHE = ingest.CACHE / "images"
CREDITS = ingest.ROOT / "CREDITS.md"
API = "https://images-api.nasa.gov"
START, END = "<!-- images:start -->", "<!-- images:end -->"


def get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "MissionMemory/0.1 (NASA Space Apps 2026)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def metadata(nasa_id: str) -> dict:
    items = get_json(f"{API}/search?" + urllib.parse.urlencode({"nasa_id": nasa_id}))["collection"]["items"]
    if not items:
        raise LookupError(f"{nasa_id}: not found in the NASA Image and Video Library")
    return items[0]["data"][0]


def best_jpeg(nasa_id: str) -> str:
    hrefs = [i["href"] for i in get_json(f"{API}/asset/{urllib.parse.quote(nasa_id)}")["collection"]["items"]]
    for size in ("~large.jpg", "~medium.jpg", "~orig.jpg"):
        for h in hrefs:
            if h.lower().endswith(size):
                return h.replace("http://", "https://")
    raise LookupError(f"{nasa_id}: no JPEG rendition")


THUMB = 240


def square_thumb(src: Path, dest: Path) -> Path:
    """Centre-cropped square thumbnail (for the globe labels, map and panel)."""
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(src)], check=True, capture_output=True, text=True).stdout
    w, h = (int(v) for v in re.findall(r"pixel(?:Width|Height): (\d+)", out))
    fit = ["--resampleHeight", str(THUMB)] if w > h else ["--resampleWidth", str(THUMB)]
    subprocess.run(["sips", *fit, "-s", "format", "jpeg", "-s", "formatOptions", "80", str(src), "--out", str(dest)], check=True, capture_output=True)
    subprocess.run(["sips", "-c", str(THUMB), str(THUMB), str(dest)], check=True, capture_output=True)
    return dest


def credit_of(m: dict) -> str:
    if m.get("secondary_creator"):
        return m["secondary_creator"]
    if m.get("photographer") and "NASA" not in m["photographer"]:
        return f"NASA / {m['photographer']}"
    return "NASA"


def main() -> int:
    if not shutil.which("sips"):
        print("✗ needs macOS `sips` to resize images", file=sys.stderr)
        return 1
    chosen = {k: v for k, v in json.loads(SRC.read_text()).items() if not k.startswith("_")}
    out: dict[str, dict] = {}
    credit_rows = []
    CACHE.mkdir(parents=True, exist_ok=True)

    for ghost, beats in chosen.items():
        for beat, pick in beats.items():
            nid = pick["nasaId"]
            try:
                m = metadata(nid)
                cached = CACHE / f"{nid}.jpg"
                if not cached.exists():
                    with urllib.request.urlopen(best_jpeg(nid), timeout=120) as r:
                        cached.write_bytes(r.read())
            except (OSError, LookupError) as e:
                ingest.errors.append(f"{ghost}/{beat}: {e}")
                continue
            dest = MEDIA / ghost / f"{nid}.jpg"
            dest.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["sips", "-Z", "1400", "-s", "format", "jpeg", "-s", "formatOptions", "78", str(cached), "--out", str(dest)], check=True, capture_output=True)
            if beat == "portrait":
                dest = square_thumb(cached, MEDIA / ghost / "portrait.jpg")
            credit = credit_of(m)
            page = f"https://images.nasa.gov/details/{urllib.parse.quote(nid)}"
            out.setdefault(ghost, {})[beat] = {
                "src": f"/media/images/{ghost}/{dest.name}",
                "full": f"/media/images/{ghost}/{nid}.jpg",
                "alt": m.get("title", "").strip(),
                "caption": pick["caption"],
                "credit": credit,
                "illustration": bool(pick.get("illustration")),
                "nasaId": nid,
                "url": page,
                "nasaTitle": m.get("title", "").strip(),
                "nasaDescription": (m.get("description") or "").strip()[:600],
            }
            credit_rows.append(f"| {ghost} / {beat} | [{nid}]({page}) | {credit} |")
            print(f"  {ghost:24} {beat:10} {nid:22} {credit}")

    if ingest.errors:
        print(f"✗ {len(ingest.errors)} error(s):", file=sys.stderr)
        for e in ingest.errors:
            print("  - " + e, file=sys.stderr)
        return 1

    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    block = "\n".join([START, "", "| Used in | NASA Image Library ID | Credit |", "|---|---|---|", *credit_rows, "", END])
    text = CREDITS.read_text()
    if START in text:
        text = text[: text.index(START)] + block + text[text.index(END) + len(END) :]
    else:
        text = text.replace("## Software", f"## NASA images\n\nFrom the [NASA Image and Video Library](https://images.nasa.gov/), with each image's own credit line.\n\n{block}\n\n## Software")
    CREDITS.write_text(text)
    print(f"✓ {len(credit_rows)} NASA images → {OUT.relative_to(ingest.ROOT)}, credits in CREDITS.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
