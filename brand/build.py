#!/usr/bin/env python3
"""Generate the Mission Memory brand assets (the Tuning M) into web/public.

    python3 brand/build.py

SVGs: brand/mark-*.svg, brand/logo-*.svg (wordmark outlined from Space Grotesk Bold), favicon.svg.
PNGs (rendered with headless Chrome, resized with macOS `sips`): favicon-32.png, apple-touch-icon.png, og-image.png.
"""

import shutil
import subprocess
import tempfile
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "web" / "public"
FONTS = ROOT / "web" / "node_modules" / "@fontsource"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PALETTES = {
    "dark": {"bg": "#05070f", "ink": "#eef1fb", "dim": "#8b93ad", "signal": "#7cf2c8"},
    "light": {"bg": "#f6f7fb", "ink": "#0b1020", "dim": "#5b6480", "signal": "#0b9b78"},
}

WAVE = "M8 46C12.5 46 14 18 19.5 18S27 38.5 32 38.5 39 18 44.5 18 51.5 46 56 46"


def glow(id_, color):
    return (f'<radialGradient id="{id_}"><stop offset="0" stop-color="{color}" stop-opacity=".9"/>'
            f'<stop offset=".35" stop-color="{color}" stop-opacity=".35"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient>')


def mark(p, k, simple=False):
    """The Tuning M: an M drawn as a signal wave, a tuning needle locked on its dip, and a dial scale."""
    top = 12 if simple else 9
    body = ""
    if not simple:
        ticks = "".join(f'<path d="M{x} 53v{3 if x % 8 == 0 else 1.8}" stroke="{p["dim"]}" stroke-width="1.4" stroke-linecap="round"/>'
                        for x in range(8, 57, 4))
        body += f'<path d="M8 53h48" stroke="{p["dim"]}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>{ticks}'
    body += (f'<path d="{WAVE}" fill="none" stroke="{p["ink"]}" stroke-width="{6 if simple else 5}" stroke-linecap="round" stroke-linejoin="round"/>'
             f'<path d="M32 {top}V{52 if simple else 56}" stroke="{p["signal"]}" stroke-width="{3.4 if simple else 2.6}" stroke-linecap="round"/>'
             f'<circle cx="32" cy="{top}" r="7" fill="url(#{k}glow)"/><circle cx="32" cy="{top}" r="{3.2 if simple else 2.8}" fill="{p["signal"]}"/>')
    return glow(f"{k}glow", p["signal"]), body


_font = TTFont(FONTS / "space-grotesk/files/space-grotesk-latin-700-normal.woff")
_gs, _cmap, _hmtx, _upm = _font.getGlyphSet(), _font.getBestCmap(), _font["hmtx"], _font["head"].unitsPerEm


def text_path(text, x, baseline, size, tracking=-0.01):
    s, d = size / _upm, ""
    for ch in text:
        g = _cmap[ord(ch)]
        pen = SVGPathPen(_gs, ntos=lambda v: f"{v:.1f}")
        _gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline)))
        d += pen.getCommands()
        x += _hmtx[g][0] * s + tracking * size
    return d, x


def wordmark(p, x, baseline, size):
    d1, x1 = text_path("Mission", x, baseline, size)
    d2, x2 = text_path("Memory", x1 + size * 0.26, baseline, size)
    return f'<path d="{d1}" fill="{p["ink"]}"/><path d="{d2}" fill="{p["dim"]}"/>', x2


def svg(w, h, defs, inner):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}" height="{h:g}" role="img" aria-label="Mission Memory">'
            f"<title>Mission Memory</title><defs>{defs}</defs>{inner}</svg>\n")


def favicon_svg():
    p = PALETTES["dark"]
    defs, body = mark(p, "fav-", simple=True)
    return svg(64, 64, defs, f'<rect width="64" height="64" rx="14" fill="{p["bg"]}"/>{body}')


def write_svgs():
    out = PUBLIC / "brand"
    out.mkdir(parents=True, exist_ok=True)
    for mode, p in PALETTES.items():
        defs, body = mark(p, f"{mode}-")
        (out / f"mark-{mode}.svg").write_text(svg(64, 64, defs, body))
        words, end = wordmark(p, 80, 43, 30)
        (out / f"logo-{mode}.svg").write_text(svg(round(end + 6), 64, defs, body + words))
    (PUBLIC / "favicon.svg").write_text(favicon_svg())


def render(html: str, w: int, h: int, out: Path, tmp: Path):
    page = tmp / f"{out.stem}.html"
    page.write_text(html)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={w},{h}", f"--screenshot={out}", page.as_uri()], check=True, capture_output=True)


def write_pngs():
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        fav = PUBLIC / "favicon.svg"
        icon512 = tmp / "icon-512.png"
        render(f'<body style="margin:0;background:#05070f"><img src="{fav.as_uri()}" width="512" height="512" style="display:block">', 512, 512, icon512, tmp)
        for size, name in [(32, "favicon-32.png"), (180, "apple-touch-icon.png")]:
            subprocess.run(["sips", "-z", str(size), str(size), str(icon512), "--out", str(PUBLIC / name)], check=True, capture_output=True)

        logo = PUBLIC / "brand" / "logo-dark.svg"
        sg = (FONTS / "atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2").as_uri()
        # Link-preview card: the lockup on a faint star field, with the tagline.
        stars = ",".join(f"radial-gradient(1.4px 1.4px at {x}% {y}%, #ffffff{a} 50%, transparent 51%)"
                         for x, y, a in [(8, 14, "90"), (17, 72, "60"), (29, 28, "70"), (41, 86, "50"), (55, 12, "80"), (63, 64, "40"),
                                         (74, 22, "70"), (82, 78, "60"), (91, 40, "90"), (96, 88, "50"), (4, 52, "50"), (48, 46, "30")])
        render(f"""<style>@font-face{{font-family:A;src:url({sg})}}
body{{margin:0;width:1200px;height:630px;background:{stars},radial-gradient(ellipse at 50% 120%,#13204a 0%,#05070f 60%);
display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;font-family:A,sans-serif}}
p{{margin:0;color:#a7aec8;font-size:34px}} b{{color:#7cf2c8;font-weight:400}}</style>
<img src="{logo.as_uri()}" height="150"><p>Tune in to the <b>explorers</b> NASA left behind.</p>""", 1200, 630, PUBLIC / "og-image.png", tmp)


if __name__ == "__main__":
    write_svgs()
    if shutil.which("sips") and Path(CHROME).exists():
        write_pngs()
    else:
        print("! skipped PNGs (needs macOS sips + Google Chrome)")
    print("✓ brand assets written to web/public")
