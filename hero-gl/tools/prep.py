#!/usr/bin/env python3
"""Pregătește texturile pentru hero:
  diffuse  (jpg 3:4, fundal off-white păstrat)
  alpha    (png, mască persoană, din rembg)
  depth    (png, Depth Anything V2 small ONNX, normalizat în interiorul măștii)

Folosire: python3 tools/prep.py <input> <nume>   ->  assets/tex/<nume>-{diffuse.jpg,alpha.png,depth.png}
"""
import sys, os, numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "tex")
os.makedirs(OUT, exist_ok=True)

src, name = sys.argv[1], sys.argv[2]
# al treilea argument opțional: "land" = 4:3 lat, 4096×3072 (portretul v3, prim-plan 4K); implicit 3:4, 1536×2048
LAND = len(sys.argv) > 3 and sys.argv[3] == "land"
W, H = (4096, 3072) if LAND else (1536, 2048)
R = W / H

im = Image.open(src).convert("RGB")
# crop la raportul țintă, centrat pe orizontală, lipit sus
w, h = im.size
if w / h > R:
    nw = int(h * R); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
else:
    nh = int(w / R); im = im.crop((0, 0, w, nh))
im = im.resize((W, H), Image.LANCZOS)
im.save(os.path.join(OUT, f"{name}-diffuse.jpg"), quality=90, subsampling=0)

# ---- alpha (rembg / u2net)
from rembg import remove, new_session
sess = new_session("u2net")
cut = remove(im, session=sess, alpha_matting=True, alpha_matting_foreground_threshold=240,
             alpha_matting_background_threshold=10, alpha_matting_erode_size=8)
alpha = cut.split()[-1]
alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
alpha.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(OUT, f"{name}-alpha.png"))
a = np.asarray(alpha).astype(np.float32) / 255.0

# ---- depth (Depth Anything V2 small, ONNX)
import onnxruntime as ort
model = os.path.join(HERE, "models", "depth-anything-v2-small.onnx")
S = 518
x = np.asarray(im.resize((S, S), Image.BICUBIC)).astype(np.float32) / 255.0
x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
x = x.transpose(2, 0, 1)[None]
s = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
inp = s.get_inputs()[0].name
d = s.run(None, {inp: x})[0]
d = np.squeeze(d).astype(np.float32)          # inverse depth: mare = aproape
d = np.asarray(Image.fromarray(d).resize((W, H), Image.BICUBIC))
m = a > 0.5
lo, hi = np.percentile(d[m], 1), np.percentile(d[m], 99.5)
d = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
d = d * a                                     # fundalul la 0
# adâncimea coboară lin la zero înainte de siluetă (altfel marginea planului deplasat iese „în trepte”)
ae = alpha.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(14 * W / 2048))
d = d * (np.asarray(ae).astype(np.float32) / 255.0) ** 1.5
depth = Image.fromarray((d * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
depth.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(OUT, f"{name}-depth.png"))
print("ok", name, "alpha cover %.1f%%" % (m.mean() * 100), "depth range", float(d[m].min()), float(d[m].max()))
