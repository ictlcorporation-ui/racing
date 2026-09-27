# Predare: site-ul lui Mihai Manole (hero-gl) — 2026-09-27

## Stare: APROBAT de client („da e bine”)
Tot site-ul e în `hero-gl/`: preloader „Mască MM” → hero (portret + cască foto + fluid Lando + cască transparentă) → secțiunile de după (direcția A, „ca la Lando, fără card”).
Online: https://hero-gl-mihai.vercel.app (`sh hero-gl/tools/deploy.sh`). Local: `cd hero-gl && python3 serve.py 8772`.
Detalii tehnice și toate valorile reglate cu clientul: `hero-gl/README.md` (v7 + ajustările de la final).

## Fișiere
- `index.html` — structura + CSS (hero, secțiuni, preloader); `app.js` — GL (hero, tranziția de ieșire, paleta fundalului); `site.js` — efectele secțiunilor (portate din bundle-ul Lando); `preloader.js` — preloader-ul.
- Poze: `tools/web_img.py` → `assets/img/` (doar poze reale, fără bannerul ALPHA). Logo-uri: `assets/logo/`.
- Verificare vizuală (Chrome headless): `tools/shots.mjs`, `tools/hover-test.mjs`, `tools/trail-compare.mjs`, `tools/preloader-frames.mjs`.

## De primit de la client
- logo-urile pentru banda din footer (NEXT Energy nu are fișier — acum e text);
- e-mail de contact (butonul „Scrie-i lui Mihai” duce la X @MihayManole);
- textul cardului „Următoarea etapă” din hero (arată încă Raliul Iașului, trecut).

## Reguli
Fața lui Mihai nu se modifică niciodată; „ca la Lando” = port exact din `build/lando/bundle.js`, apoi reglaj după client; totul în română cu diacritice; verificare vizuală desktop + mobil, apoi deploy pentru test pe telefon.
