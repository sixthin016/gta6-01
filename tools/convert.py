#!/usr/bin/env python3
"""Neon Bay — PNG to JPEG conversion for the four staged shots.

Reads tools/tmp/<n>.png (1280x720 from headless Chromium), writes
screenshots/<n>-<name>.jpg at JPEG quality 82 (dropping quality until each
file is at most 256 KiB), and 320 px-wide thumbnails into tools/tmp/thumbs/
for the visual thumbnail check. Verifies the source is 1280x720.
"""
import os
import sys
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = os.path.join(REPO, "tools", "tmp")
SHOTS = os.path.join(REPO, "screenshots")
THUMBS = os.path.join(TMP, "thumbs")

NAMES = {
    1: "1-beach-chase.jpg",
    2: "2-market-battle.jpg",
    3: "3-heist.jpg",
    4: "4-highway-escape.jpg",
}
MAX_BYTES = 256 * 1024


def main():
    os.makedirs(SHOTS, exist_ok=True)
    os.makedirs(THUMBS, exist_ok=True)
    for n in (1, 2, 3, 4):
        src = os.path.join(TMP, f"{n}.png")
        if not os.path.exists(src):
            sys.exit(f"convert: missing {src}")
        img = Image.open(src).convert("RGB")
        if img.size != (1280, 720):
            sys.exit(f"convert: shot {n} is {img.size}, expected 1280x720")
        # Thumbnail for the visual check.
        thumb = img.resize((320, 180), Image.LANCZOS)
        thumb.save(os.path.join(THUMBS, f"{n}.jpg"), "JPEG", quality=80)
        # JPEG at descending quality until under the cap.
        out = os.path.join(SHOTS, NAMES[n])
        for quality in (85, 78, 70, 60, 50):
            img.save(out, "JPEG", quality=quality, optimize=True)
            size = os.path.getsize(out)
            if size <= MAX_BYTES:
                break
        print(f"convert: shot {n} -> {NAMES[n]} {size} bytes (q{quality})")
        if size > MAX_BYTES:
            sys.exit(f"convert: shot {n} still over 256 KiB at q50")
    print("convert: all four shots within limits")


if __name__ == "__main__":
    main()
