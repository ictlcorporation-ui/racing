# Pozele reale din media/ → assets/img/*.webp pentru secțiunile de după hero.
# Doar redimensionare + compresie (nicio editare a fețelor). Rulare: python3 tools/web_img.py
from PIL import Image, ImageOps
import os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img')
os.makedirs(OUT, exist_ok=True)

# nume → (fișier din media/, latura lungă)
IMGS = {
    # sezonul 2026 (banda orizontală) — fără pozele cu bannerul „ALPHA”
    'mm-pan': ('actiune/Copyright_FlaviusCroitoriu_RaliulMaramuresului2026-99.jpg', 1600),
    'mm-wet': ('actiune/_ASZ_-5389.jpg', 1600),
    'mm-hay': ('masina/_ASZ_-3452.jpg', 1600),
    'mm-trees': ('masina/_ASZ_-4196.jpg', 1400),
    'mm-blur': ('masina/Copyright_FlaviusCroitoriu_RaliulMaramuresului2026-100.jpg', 1400),
    'mm-night': ('mihai/MHN- Start Festiv + Portrete-2898.jpg', 1400),
    'hr-curve': ('masina/_ASZ_-4525.jpg', 1600),
    'hr-crowd': ('actiune/_ASZ_-6278.jpg', 1400),
    'hr-side': ('masina/Copyright_FlaviusCroitoriu_RaliulHarghitei2026-441.jpg', 1400),
    'hr-green': ('actiune/Copyright_FlaviusCroitoriu_RaliulHarghitei2026-539.jpg', 1200),
    'hr-rear': ('masina/_ASZ_-4554.jpg', 1400),
    'cj-front': ('actiune/MHN - PS1-7848.jpg', 1600),
    'cj-shake': ('actiune/Shakedown-5620.jpg', 1600),
    # pe probă / în service
    'cockpit': ('mihai/_ASZ_-0861.jpg', 2400),
    'cutout-car': ('../site-v8/assets/img/car-cutout.webp', 1215),
    'cutout-mihai': ('../site-v8/assets/img/mihai-cutout.webp', 1366),
    # mașina
    'engine': ('masina/_ASZ_-3643.jpg', 1800),
    'car-side': ('masina/_ASZ_-3456.jpg', 1800),
    # echipajul
    'mihai': ('mihai/_ASZ_-7419.jpg', 1400),
    'florin': ('florin/_ASZ_-7439.jpg', 1400),
    'crew-duo': ('echipaj/MHN - Service-9603.jpg', 1600),
    'team-1': ('echipa/_ASZ_-7210.jpg', 1400),
    'team-2': ('echipa/_ASZ_-7201.jpg', 1400),
    'team-3': ('echipa/_ASZ_-7205.jpg', 1400),
    # galeria (evantai)
    'g-helmet': ('mihai/MHN- Start Festiv + Portrete-2904.jpg', 1200),
    'g-smile': ('mihai/MHN - Service-4361.jpg', 1200),
    'g-flag': ('echipaj/_ASZ_-6808.jpg', 1200),
    'g-incar': ('mihai/_ASZ_-9158.jpg', 1200),
    'g-bw': ('mihai/_ASZ_-0307.jpg', 1200),
    'g-wheel': ('echipa/_ASZ_-7192.jpg', 1200),
    'g-polo': ('echipaj/MHN - Start Festiv-4782.jpg', 1200),
}

for name, (src, edge) in IMGS.items():
    p = os.path.join(ROOT, 'media', src)
    im = ImageOps.exif_transpose(Image.open(p))
    alpha = im.mode in ('RGBA', 'LA')
    im = im.convert('RGBA' if alpha else 'RGB')
    im.thumbnail((edge, edge), Image.LANCZOS)
    dst = os.path.join(OUT, name + '.webp')
    im.save(dst, 'WEBP', quality=84 if not alpha else 88, method=6)
    print(f'{name:14s} {im.size[0]}x{im.size[1]}  {os.path.getsize(dst)//1024} KB')
