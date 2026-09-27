#!/bin/sh
# Urcă site-ul (hero + secțiunile de după) pe Vercel (proiectul hero-gl-mihai → https://hero-gl-mihai.vercel.app): doar fișierele de care are nevoie pagina.
set -e
cd "$(dirname "$0")/.."
D=build/hero-gl-mihai
mkdir -p "$D/assets/models"
cp index.html app.js site.js preloader.js nav.js nav.css i18n.js hero-left.js hero-left.css live.js foot.js foot.css "$D/"
rm -rf "$D/api" && mkdir -p "$D/api" && cp api/*.mjs "$D/api/"  # funcția /api/season (eWRC)
rm -rf "$D/vendor" && cp -R vendor "$D/"
rm -rf "$D/assets/hdri" "$D/assets/tex" "$D/assets/img" "$D/assets/logo" "$D/assets/icons" && cp -R assets/hdri assets/tex assets/img assets/logo assets/icons "$D/assets/"
cp assets/models/helmet-venti.glb assets/models/helmet-venti-ghost.glb "$D/assets/models/"
cd "$D" && vercel deploy --prod --yes
