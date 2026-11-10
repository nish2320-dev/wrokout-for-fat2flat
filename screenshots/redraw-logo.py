"""
Redraws the Fat2Flat emblem from the original logo at high resolution.

assets/fat2flat-logo.png is a 1024 px image whose artwork only fills about
470 x 420 px, too small to enlarge into an app icon cleanly. The logo uses
three flat colours, so instead of stretching it we upscale, then snap every
pixel back to pure black, pure red or nothing. Edges come out sharp at any
size. The emblem keeps the figures, triangle and FAT2FLAT, and drops the
"personal training" line and barbell, which are unreadable at icon size.

Usage: python3 redraw-logo.py   ->   assets/fat2flat-emblem.png (transparent)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).parent
SCALE = 4
# figures + triangle + FAT2FLAT, in the original logo's pixels
EMBLEM_BOX = (278, 311, 746, 586)
BLACK = (5, 6, 8)
RED = (225, 46, 32)

src = Image.open(HERE / "assets" / "fat2flat-logo.png").convert("RGBA")
flat = Image.new("RGB", src.size, "white")
flat.paste(src, mask=src.getchannel("A"))
flat = flat.crop(EMBLEM_BOX)

big = flat.resize((flat.width * SCALE, flat.height * SCALE), Image.LANCZOS)
big = big.filter(ImageFilter.GaussianBlur(SCALE * 0.5))
px = np.asarray(big).astype(np.int32)
r, g, b = px[..., 0], px[..., 1], px[..., 2]

# Red is the only coloured ink, so judge it by how much redder than green a
# pixel is, and black vs paper by brightness. Grey edge pixels then fall to
# black or paper and never pick up a red fringe.
red = (r - g) > 90
black = ~red & ((r * 299 + g * 587 + b * 114) // 1000 < 128)

out = np.zeros((*px.shape[:2], 4), np.uint8)
out[red] = (*RED, 255)
out[black] = (*BLACK, 255)
Image.fromarray(out).save(HERE / "assets" / "fat2flat-emblem.png", optimize=True)
print(f"assets/fat2flat-emblem.png {out.shape[1]}x{out.shape[0]}")
