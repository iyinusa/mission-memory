#!/usr/bin/env python3
"""Dump the full text of every NASA page cited for each story explorer into scripts/.cache/factpacks/<id>.txt.

Stories are drafted only from these packs, and every story quote is later verified against the same pages.

    python3 scripts/factpack.py
"""

import json
import re
import sys

import ingest

NASA_CHROME = re.compile(r"(Skip to main content|NASA Science.*?Search|Share Details Last Updated.*$)", re.S)


def main() -> int:
    manifest = json.loads(ingest.MANIFEST.read_text())
    named = manifest["sources"]
    out = ingest.CACHE / "factpacks"
    out.mkdir(parents=True, exist_ok=True)
    for ghost in manifest["ghosts"]:
        if ghost["tier"] == "map":
            continue
        refs = [f"nssdca:{rid}" for rid in ghost["nssdca"]]
        refs += [ghost["missionUrl"]] if ghost.get("missionUrl") else []
        refs += [e["url"] for e in ghost.get("evidence", [])] + ghost.get("storySources", [])
        urls = list(dict.fromkeys(ingest.resolve(r, named) for r in refs))
        parts = []
        for url in urls:
            text = NASA_CHROME.sub(" ", ingest.text_of(url)).strip()
            parts.append(f"===== SOURCE {url}\n{text}")
        (out / f"{ghost['id']}.txt").write_text("\n\n".join(parts) + "\n")
        print(f"  {ghost['id']:24} {len(urls)} sources, {sum(len(p.split()) for p in parts)} words")
    if ingest.errors:
        print("\n".join(ingest.errors), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
