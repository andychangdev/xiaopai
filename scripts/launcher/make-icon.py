#!/usr/bin/env python3
"""Draw the app icon as a PNG. Standard library only — no Pillow, no downloads.

The mark is the roster itself: seven day columns, three staff rows, filled
where someone is on. The second column is empty because Tuesday is closed.

    python3 make-icon.py          # -> icon.png (1024x1024)
"""
import zlib, struct, math

SIZE   = 1024
BG_TOP = (0x1a, 0x72, 0x63)
BG_BOT = (0x0d, 0x49, 0x3f)
ON     = (0xf4, 0xf8, 0xf6)
OFF    = (0xff, 0xff, 0xff, 0.13)
HEAD   = (0xff, 0xff, 0xff, 0.34)

# Mon..Sun for three people — Tuesday is shut, so column 1 is bare.
PATTERN = [
    [1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 1, 0],
    [0, 0, 0, 1, 1, 1, 0],
]

canvas = bytearray(SIZE * SIZE * 4)          # RGBA, transparent


def coverage(px, py, x, y, w, h, r):
    """Antialiased coverage of a rounded rect at one pixel, 0..1."""
    dx = abs(px - (x + w / 2)) - (w / 2 - r)
    dy = abs(py - (y + h / 2)) - (h / 2 - r)
    outside = math.hypot(max(dx, 0), max(dy, 0)) - r
    inside = min(max(dx, dy), 0)
    return min(max(0.5 - (outside + inside), 0.0), 1.0)


def rect(x, y, w, h, r, colour, alpha=1.0, gradient=None):
    """Composite a rounded rect onto the canvas."""
    for py in range(max(0, int(y) - 2), min(SIZE, int(y + h) + 2)):
        t = (py - y) / h
        if gradient:
            top, bot = gradient
            rgb = tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        else:
            rgb = colour
        for px in range(max(0, int(x) - 2), min(SIZE, int(x + w) + 2)):
            a = coverage(px + 0.5, py + 0.5, x, y, w, h, r) * alpha
            if a <= 0:
                continue
            i = (py * SIZE + px) * 4
            for c in range(3):                        # source-over
                canvas[i + c] = round(rgb[c] * a + canvas[i + c] * (1 - a))
            canvas[i + 3] = round(255 * a + canvas[i + 3] * (1 - a))


def write_png(path):
    raw = b''.join(b'\x00' + bytes(canvas[y * SIZE * 4:(y + 1) * SIZE * 4])
                   for y in range(SIZE))
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    open(path, 'wb').write(png)


# --- the squircle: macOS sizes the art at 824 inside a 1024 canvas ---
INSET, RADIUS = 100, 185
rect(INSET, INSET, SIZE - 2 * INSET, SIZE - 2 * INSET, RADIUS, None,
     gradient=(BG_TOP, BG_BOT))

# --- the roster grid ---
CELL, GAP, RAD = 68, 20, 16
span = 7 * CELL + 6 * GAP
x0 = (SIZE - span) // 2
y0 = (SIZE - (3 * CELL + 2 * GAP)) // 2 + 20

for c in range(7):                                   # day headers
    rect(x0 + c * (CELL + GAP), y0 - GAP - 30, CELL, 14, 7,
         HEAD[:3], alpha=HEAD[3])

for r, row in enumerate(PATTERN):
    for c, on in enumerate(row):
        x = x0 + c * (CELL + GAP)
        y = y0 + r * (CELL + GAP)
        if on:
            rect(x, y, CELL, CELL, RAD, ON)
        else:
            rect(x, y, CELL, CELL, RAD, OFF[:3], alpha=OFF[3])

write_png('icon.png')
print('wrote icon.png')
