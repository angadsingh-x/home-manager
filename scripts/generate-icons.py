#!/usr/bin/env python3
"""Render PNG icons for the PWA from a vector house glyph.

Outputs into public/:
  icon-192.png        Android Chrome
  icon-512.png        Android Chrome (large)
  apple-touch-icon.png  iOS home-screen (180×180)

Run: npm run icons   (requires Pillow; `pip install Pillow`)

The shapes here mirror public/icon.svg. If you redesign the icon, update
both files.
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow not installed. Run: pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
OUT.mkdir(exist_ok=True)

BG = (15, 23, 42, 255)        # slate-900 / #0f172a
FG = (248, 250, 252, 255)     # slate-50 / #f8fafc

# Master canvas is 1024 — render and downsample for crispness.
MASTER = 1024


def render_master() -> Image.Image:
    img = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded-square background.
    radius = MASTER * 96 // 512  # match icon.svg corner radius ratio
    draw.rounded_rectangle((0, 0, MASTER, MASTER), radius=radius, fill=BG)

    # House silhouette (coords in 512 space, scaled up).
    s = MASTER / 512

    def p(x: float, y: float) -> tuple[int, int]:
        return (round(x * s), round(y * s))

    house = [p(128, 240), p(256, 128), p(384, 240), p(384, 384), p(128, 384)]
    draw.polygon(house, fill=FG)

    # Door (punches back to bg).
    door_radius = round(6 * s)
    draw.rounded_rectangle(
        (p(232, 296), p(232 + 48, 296 + 88)),
        radius=door_radius,
        fill=BG,
    )

    return img


def main() -> None:
    master = render_master()
    targets = [
        ("icon-512.png", 512),
        ("icon-192.png", 192),
        ("apple-touch-icon.png", 180),
    ]
    for name, size in targets:
        out = master.resize((size, size), Image.LANCZOS)
        path = OUT / name
        out.save(path, format="PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)} ({size}x{size})")


if __name__ == "__main__":
    main()
