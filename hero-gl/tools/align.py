#!/usr/bin/env python3
"""Aliniază portretul fără cască la cel cu cască (după regiunea nas–gură), ca reveal-ul să se suprapună 1:1.
Mută imaginea fără cască cu (dx,dy) și umple cu culoarea fundalului. Scrie build/mihai-nohelmet-aligned.png"""
import sys, numpy as np
from PIL import Image

A = Image.open("build/mihai-nohelmet-raw.png").convert("RGB")   # fără cască (se mută)
B = Image.open("build/mihai-helmet-raw.png").convert("RGB")     # cu cască (referință)
W, H = A.size
s = 4
a = np.asarray(A.resize((W // s, H // s), Image.BILINEAR).convert("L")).astype(np.float32)
b = np.asarray(B.resize((W // s, H // s), Image.BILINEAR).convert("L")).astype(np.float32)
h, w = a.shape
# șablon: nas + gură din A (procente din preview-ul 600x800: y 290..360, x 230..370)
y0, y1 = int(h * 0.36), int(h * 0.45)
x0, x1 = int(w * 0.38), int(w * 0.62)
T = a[y0:y1, x0:x1]; T = (T - T.mean()) / (T.std() + 1e-6)
best = (-1, 0, 0)
for dy in range(0, int(h * 0.16)):
    for dx in range(-int(w * 0.04), int(w * 0.04) + 1):
        P = b[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
        if P.shape != T.shape: continue
        P = (P - P.mean()) / (P.std() + 1e-6)
        c = float((T * P).mean())
        if c > best[0]: best = (c, dx, dy)
c, dx, dy = best
dx, dy = dx * s, dy * s
print("ncc %.3f  shift dx=%d dy=%d (px la %dx%d)" % (c, dx, dy, W, H))
bg = tuple(int(v) for v in np.asarray(A)[10:60, 10:60].reshape(-1, 3).mean(0))
out = Image.new("RGB", (W, H), bg)
out.paste(A, (dx, dy))
out.save("build/mihai-nohelmet-aligned.png")
