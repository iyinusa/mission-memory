#!/usr/bin/env python3
"""Build web/public/data/artifacts.json from scripts/manifest.json and NASA sources.

Every curated location and date in the manifest carries a verbatim quote. This script
fetches each source page (cached in scripts/.cache), checks the quote is really there,
cross-checks Mars coordinates against a second NASA source, and fails loudly otherwise.

    python3 scripts/ingest.py            # use cache
    python3 scripts/ingest.py --refresh  # re-download every page
"""

import hashlib
import html
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "scripts" / "manifest.json"
CACHE = ROOT / "scripts" / ".cache"
OUT = ROOT / "web" / "public" / "data" / "artifacts.json"

NSSDCA = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id={}"
NSSDCA_EXP = "https://nssdc.gsfc.nasa.gov/nmc/experiment/display.action?id={}"
MAX_COORD_DRIFT_DEG = 0.5

REFRESH = "--refresh" in sys.argv
errors: list[str] = []


def resolve(ref: str, named: dict) -> str:
    if ref.startswith("nssdca:"):
        return NSSDCA.format(ref.split(":", 1)[1])
    if ref.startswith("nssdca-exp:"):
        return NSSDCA_EXP.format(ref.split(":", 1)[1])
    if ref in named:
        return named[ref]["url"]
    return ref


def fetch(url: str) -> str:
    path = CACHE / "pages" / (hashlib.sha1(url.encode()).hexdigest() + ".html")
    if path.exists() and not REFRESH:
        return path.read_text(errors="ignore")
    req = urllib.request.Request(url, headers={"User-Agent": "MissionMemory/0.1 (NASA Space Apps 2026)"})
    with urllib.request.urlopen(req, timeout=40) as res:
        body = res.read().decode("utf-8", errors="ignore")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body)
    time.sleep(0.3)  # be polite to NASA servers
    return body


def to_text(page: str) -> str:
    page = re.sub(r"<script.*?</script>|<style.*?</style>", " ", page, flags=re.S | re.I)
    text = html.unescape(re.sub(r"<[^>]+>", " ", page)).replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


_text_cache: dict[str, str] = {}


def text_of(url: str) -> str:
    if url not in _text_cache:
        try:
            _text_cache[url] = to_text(fetch(url))
        except OSError as e:
            errors.append(f"could not fetch {url}: {e}")
            _text_cache[url] = ""
    return _text_cache[url]


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip()


def verify(ghost_id: str, what: str, url: str, quote: str) -> bool:
    if norm(quote) in text_of(url):
        return True
    errors.append(f"{ghost_id}: {what} quote not found at {url}\n    \"{quote}\"")
    return False


def nssdca_title(record_id: str) -> str:
    m = re.search(r"Spacecraft - Details \S+, \d+ \w+ \d{4} (.+?) NSSDCA/COSPAR ID", text_of(NSSDCA.format(record_id)))
    return m.group(1).strip() if m else record_id


def nssdca_launch(record_id: str) -> str | None:
    m = re.search(r"Launch Date: (\d{4}-\d{2}-\d{2})", text_of(NSSDCA.format(record_id)))
    return m.group(1) if m else None


def description_at(url: str) -> str:
    m = re.search(r"Description (.+?) (?:Mission Profile|Spacecraft and Subsystems|Alternate Names|Facts in Brief)", text_of(url))
    return m.group(1).strip() if m else ""


def nssdca_description(record_id: str) -> str:
    return description_at(NSSDCA.format(record_id))


def first_sentences(text: str, limit: int = 320) -> str:
    out = ""
    for s in re.split(r"(?<=[.!?])\s+", text):
        if len(out) + len(s) > limit and out:
            break
        out = f"{out} {s}".strip()
    return out


def label_for(url: str, named: dict) -> str:
    for src in named.values():
        if src["url"] == url:
            return src["label"]
    if "nssdc.gsfc.nasa.gov/nmc/experiment" in url:
        return f"NSSDCA experiment {url.rsplit('=', 1)[-1]}"
    if "nssdc.gsfc.nasa.gov/nmc/spacecraft" in url:
        rid = url.rsplit("=", 1)[-1]
        return f"NSSDCA: {nssdca_title(rid)} ({rid})"
    if "science.nasa.gov" in url:
        return "NASA Science mission page"
    return url


def build(ghost: dict, named: dict) -> dict:
    gid = ghost["id"]
    used: list[str] = []

    def use(ref: str) -> str:
        url = resolve(ref, named)
        if url not in used:
            used.append(url)
        return url

    for rid in ghost["nssdca"]:
        use(f"nssdca:{rid}")
    if ghost.get("missionUrl"):
        use(ghost["missionUrl"])

    evidence = []

    def cite(claim: str, ref: str, quote: str):
        url = use(ref)
        if verify(gid, claim, url, quote):
            evidence.append({"claim": claim, "quote": norm(quote), "url": url, "label": label_for(url, named)})

    lat = lon = None
    loc = ghost.get("location")
    if loc:
        lat, lon = loc["lat"], loc["lon"]
        cite("location", loc["url"], loc["quote"])
        cc = loc.get("crossCheck")
        if cc:
            cite("location cross-check", cc["source"], cc["quote"])
            dlat, dlon = abs(cc["lat"] - lat), abs(((cc["lon"] - lon + 180) % 360) - 180)
            if max(dlat, dlon) > MAX_COORD_DRIFT_DEG:
                errors.append(f"{gid}: coordinates disagree by {dlat:.2f}°/{dlon:.2f}° between sources")

    sites = []
    for site in ghost.get("sites", []):
        cite(f"site: {site['label']}", site["url"], site["quote"])
        sites.append({"label": site["label"], "lat": site["lat"], "lon": site["lon"]})

    last = ghost.get("lastContact")
    if last:
        cite("last contact", last["url"], last["quote"])

    for ev in ghost.get("evidence", []):
        cite(ev["claim"], ev["url"], ev["quote"])

    primary = ghost["nssdca"][0]
    artifact = {
        "id": gid,
        "name": ghost["name"],
        "world": ghost["world"],
        "body": ghost["body"],
        "nssdcaId": primary,
        "nssdcaUrl": NSSDCA.format(primary),
        "missionUrl": ghost.get("missionUrl"),
        "lat": lat,
        "lon": lon,
        "launched": nssdca_launch(primary),
        "arrived": None,
        "lastContact": last["date"] if last else None,
        "status": ghost["status"],
        "statusNote": ghost["statusNote"],
        "tier": ghost["tier"],
        # The primary record can describe a carrier (e.g. a lunar module) rather than the ghost itself.
        "summary": first_sentences(description_at(use(ghost["summarySource"])) if ghost.get("summarySource") else nssdca_description(primary)),
        "sites": sites,
        "evidence": evidence,
        "sources": [{"label": label_for(u, named), "url": u} for u in used],
    }

    # Plain-text NSSDCA descriptions for story drafting (facts only come from here and the evidence).
    notes = CACHE / "text" / f"{gid}.txt"
    notes.parent.mkdir(parents=True, exist_ok=True)
    notes.write_text("\n\n".join(f"[{rid}] {nssdca_description(rid)}" for rid in ghost["nssdca"]))
    return artifact


def main() -> int:
    manifest = json.loads(MANIFEST.read_text())
    named = manifest["sources"]
    artifacts = [build(g, named) for g in manifest["ghosts"]]

    if errors:
        print(f"✗ {len(errors)} verification error(s):", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        return 1

    OUT.write_text(json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "artifacts": artifacts}, indent=2, ensure_ascii=False) + "\n")
    n_ev = sum(len(a["evidence"]) for a in artifacts)
    print(f"✓ {len(artifacts)} explorers, {n_ev} verified quotes → {OUT.relative_to(ROOT)}")
    for a in artifacts:
        where = f"{a['lat']:.2f}, {a['lon']:.2f}" if a["lat"] is not None else a["body"]
        print(f"  {a['world']:6} {a['tier']:5} {a['id']:24} {where:24} launched {a['launched']}  last {a['lastContact']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
