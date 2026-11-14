#!/usr/bin/env python3
"""Verify and publish the stories.

- Checks every cited quote in scripts/stories.json is really on its NASA page (fails otherwise).
- Measures the reading grade (Flesch-Kincaid) of each reading level.
- Writes web/public/data/stories.json for the app and review/STORIES-REVIEW.md for the fact-check team.

    python3 scripts/build_stories.py
"""

import json
import re
import sys
from datetime import datetime, timezone

import ingest

SRC = ingest.ROOT / "scripts" / "stories.json"
OUT = ingest.ROOT / "web" / "public" / "data" / "stories.json"
REVIEW = ingest.ROOT / "review" / "STORIES-REVIEW.md"

TITLES = {
    "why": "Why I was sent",
    "how": "How I worked",
    "discovered": "What I discovered",
    "lastDay": "My last day",
    "now": "Where I rest now",
}
LEVELS = {"younger": "Ages 9–11", "older": "Ages 12–14"}


def syllables(word: str) -> int:
    word = re.sub(r"[^a-z]", "", word.lower())
    if not word:
        return 0
    groups = re.findall(r"[aeiouy]+", word)
    n = len(groups) - (1 if word.endswith("e") and not word.endswith("le") and len(groups) > 1 else 0)
    return max(1, n)


def fk_grade(text: str) -> float:
    sentences = max(1, len(re.findall(r"[.!?]+(?=\s|$)", text)))
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", text)
    n = max(1, len(words))
    return 0.39 * n / sentences + 11.8 * sum(syllables(w) for w in words) / n - 15.59


def main() -> int:
    manifest = json.loads(ingest.MANIFEST.read_text())
    named = manifest["sources"]
    artifacts = {a["id"]: a for a in json.loads((ingest.OUT).read_text())["artifacts"]}
    src = json.loads(SRC.read_text())

    published, review_md, manual = {}, [], []
    grades = {lvl: [] for lvl in LEVELS}
    quotes = 0

    for story in src["stories"]:
        sid = story["id"]
        if sid not in artifacts:
            ingest.errors.append(f"{sid}: no such explorer in artifacts.json")
            continue
        beats = []
        review_md.append(f"\n## {artifacts[sid]['name']}  \n`{sid}` · status: **{story['review']['status']}**\n")
        for beat in story["beats"]:
            if beat["key"] not in TITLES:
                ingest.errors.append(f"{sid}: unknown beat key {beat['key']}")
            sources = []
            for c in beat["cites"]:
                url = ingest.resolve(c["url"], named)
                if c.get("verify", True):
                    quotes += 1
                    ingest.verify(sid, f"beat {beat['key']}", url, c["quote"])
                else:
                    manual.append(f"{sid} / {beat['key']}: \"{c['quote']}\" at {url}")
                sources.append({"label": ingest.label_for(url, named), "url": url, "quote": ingest.norm(c["quote"])})
            for lvl in LEVELS:
                grades[lvl].append(fk_grade(beat[lvl]))
            beats.append({"key": beat["key"], "title": TITLES[beat["key"]], "text": {lvl: beat[lvl] for lvl in LEVELS}, "sources": sources})

            review_md.append(f"### {TITLES[beat['key']]}\n")
            for lvl, label in LEVELS.items():
                review_md.append(f"- **{label}:** {beat[lvl]}")
            review_md.append("\n  NASA says:")
            for s in sources:
                review_md.append(f"  - [ ] \"{s['quote']}\" ([{s['label']}]({s['url']}))")
            if beat.get("notes"):
                review_md.append(f"\n  > **Check:** {beat['notes']}")
            review_md.append("")

        published[sid] = {
            "reviewStatus": story["review"]["status"],
            "interaction": story.get("interaction"),
            "postcard": story["postcard"],
            "beats": beats,
        }

    if ingest.errors:
        print(f"✗ {len(ingest.errors)} verification error(s):", file=sys.stderr)
        for e in ingest.errors:
            print("  - " + e, file=sys.stderr)
        return 1

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    avg = {lvl: sum(g) / len(g) for lvl, g in grades.items()}
    OUT.write_text(json.dumps({"generatedAt": now, "levels": LEVELS, "stories": published}, indent=2, ensure_ascii=False) + "\n")

    REVIEW.parent.mkdir(exist_ok=True)
    header = [
        "# Story fact-check",
        "",
        f"Generated {now} by `scripts/build_stories.py`. Edit stories in `scripts/stories.json`, then re-run the script.",
        "",
        "Every quote below has already been found word-for-word on its NASA page by the script.",
        "Your job is to check the **meaning**: does each sentence of the story say only what the quotes support?",
        "",
        "1. Read both reading levels of a beat.",
        "2. Tick each quote once you agree it supports the story text. Open the link if unsure.",
        "3. Read every **Check** note (calculated numbers and places where NASA sources disagree).",
        "4. When a whole story is right, set its `review.status` to `approved` and your name in `review.reviewer`.",
        "",
        f"Reading level (Flesch-Kincaid grade, average per beat): ages 9–11 → **{avg['younger']:.1f}**, ages 12–14 → **{avg['older']:.1f}**.",
    ]
    if manual:
        header += ["", "**Quotes the script cannot fetch. Check these by hand:**", ""] + [f"- [ ] {m}" for m in manual]
    REVIEW.write_text("\n".join(header + review_md) + "\n")

    print(f"✓ {len(published)} stories, {quotes} verified quotes, {len(manual)} to check by hand → {OUT.relative_to(ingest.ROOT)}")
    print(f"  reading grade: ages 9–11 {avg['younger']:.1f}, ages 12–14 {avg['older']:.1f}")
    print(f"  review checklist → {REVIEW.relative_to(ingest.ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
