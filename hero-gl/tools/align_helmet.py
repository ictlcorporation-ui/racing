#!/usr/bin/env python3
"""Aliniază fotografia cu cască peste portretul fără cască (scară + translație), după zona ochi–nas–gură:
șablonul din portret e căutat în fotografia cu cască la mai multe scări (NCC). Detaliile fine diferă (imaginea e regenerată),
așa că potrivirea de puncte (SIFT) nu merge; forma feței, da.
Folosire: python3 tools/align_helmet.py <portret> <cu_casca> <iesire>"""
import sys, cv2, numpy as np

A = cv2.imread(sys.argv[1]); B = cv2.imread(sys.argv[2]); out = sys.argv[3]
H, W = A.shape[:2]
ga = cv2.cvtColor(A, cv2.COLOR_BGR2GRAY).astype(np.float32); gb = cv2.cvtColor(B, cv2.COLOR_BGR2GRAY).astype(np.float32)
k = 0.25  # căutare la rezoluție redusă, apoi rafinare
sa, sb = cv2.resize(ga, None, fx=k, fy=k, interpolation=cv2.INTER_AREA), cv2.resize(gb, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
# șablonul: ochi, nas, gură (în coordonatele portretului); marginile feței le acoperă casca, deci rămân pe dinafară
x0, x1, y0, y1 = int(W * 0.44 * k), int(W * 0.56 * k), int(H * 0.29 * k), int(H * 0.42 * k)
T = sa[y0:y1, x0:x1]
best = (-2, 1, 0, 0)
for s in np.arange(0.9, 2.2, 0.01):          # cât de mare e fața în B față de A
    Ts = cv2.resize(T, None, fx=s, fy=s, interpolation=cv2.INTER_LINEAR)
    if Ts.shape[0] >= sb.shape[0] or Ts.shape[1] >= sb.shape[1]: continue
    r = cv2.matchTemplate(sb, Ts, cv2.TM_CCOEFF_NORMED); _, mv, _, ml = cv2.minMaxLoc(r)
    if mv > best[0]: best = (mv, s, ml[0], ml[1])
ncc, s, bx, by = best
# transformare B → A: punctul (x0,y0) din A corespunde lui (bx,by) din B, iar B e de s ori mai mare
sc = 1.0 / s
tx = x0 / k - (bx / k) * sc; ty = y0 / k - (by / k) * sc
M = np.float32([[sc, 0, tx], [0, sc, ty]])
print(f"NCC {ncc:.3f}, fața în B e de {s:.3f}× mai mare → scară {sc:.4f}, dx {tx:.1f}, dy {ty:.1f}")
bg = tuple(int(v) for v in A[20:120, 20:120].reshape(-1, 3).mean(0))
R = cv2.warpAffine(B, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=bg)
cv2.imwrite(out, R)
d = cv2.absdiff(cv2.cvtColor(R, cv2.COLOR_BGR2GRAY), cv2.cvtColor(A, cv2.COLOR_BGR2GRAY))[int(H * 0.3):int(H * 0.42), int(W * 0.44):int(W * 0.56)]
print(f"diferență medie pe față după aliniere: {d.mean():.1f}")
