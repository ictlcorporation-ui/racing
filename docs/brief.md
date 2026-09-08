# Brief — site Mihai Manole (raliu)

## Client
- Pilot: **Mihai Manole**, Campionatul Național de Raliuri (CNR), România
- Mașină: Škoda Fabia Rally2 Evo (al 5-lea sezon pe model în 2025)
- Copilot: Florin Dorca
- Social cunoscut: X @MihayManole; profil eWRC-results (id 79667)

## Rezultate găsite public (de confirmat cu Mihai)
- 2026 Raliul Maramureșului: locul 2 general (după Gîrtofan/Pulpea)
- 2025 TESS Rally Brașov & Tg. Secuiesc: locul 3 general
- 2025: două podiumuri absolute (ambele locul 3)
- 2025 Raliul Clujului: locul 8 general
- 2025 Raliul Maramureșului: locul 7 general
- 2023: 46 puncte în clasamentul CNR

## Calendar CNR 2026 (fras.ro)
1. Maramureș 27–29 mar · 2. Harghita 24–26 apr · 3. Argeș 15–17 mai · 4. Cluj 19–21 iun
5. Sibiu 10–12 iul · 6. Iași 4–6 sep · 7. Vâlcea 24–26 sep · 8. Moldova 16–18 oct (anulată)

## Referință design: landonorris.com (verificat vizual, 2026-09-08)
- Fundal predominant **crem/off-white** cu un pattern subtil de linii topografice; secțiuni alternante **verde-olive închis**; accent **lime neon**.
- Tipografie: grotesk condensat bold cu majuscule pentru mesaje mari + serif elegant (italic) pentru citate și titluri secundare + semnătura scrisă de mână.
- Hero: portret frontal mare pe crem, cască desenată wireframe peste cap, wordmark „LANDO NORRIS” stânga sus, buton STORE lime dreapta sus, card mic „Next race” stânga jos.
- Apoi: marquee text uriaș olive („...we did... British GP win...”) cu foto mică în mijloc → manifest pe olive cu cuvinte cheie în lime → colaje foto libere cu etichete mici (loc, an) și citate scurte serif + semnătură.
- „Helmets Hall of Fame”: grilă pe negru, căști pe ani (2019–2025).
- Store: „World Drivers' Champion” pe crem, produse.
- Parteneri: logo-uri gri pe crem, script lime uriaș „Collab” peste titlu.
- „What's up on socials” + „Follow Lando on social media” (TikTok, Instagram, YouTube, Twitch).
- Footer olive închis cu gradient lime, „Always bringing the fight.” + cască.
- Motion: reveal la scroll, marquee, parallax pe colaje, hover pe căști.

**Transpunere pentru Mihai:** fundal crem cald + secțiuni negru-carbon, accent roșu Budureasca (nu lime), linii topografice = curbele de nivel ale traseelor de raliu; grotesk condensat + serif; „căștile” devin **etapele CNR** (grilă pe negru cu rezultate pe etape); store-ul lipsește; parteneri: Budureasca mare, ICTL Corp, apoi ceilalți.

## Decizii interviu (2026-09-08)
- Călătoria filmului: Claude decide (pitch 2–3 concepte)
- Lane B: 5 clipuri Seedance 2.0, draft 480p/fast, master 720p
- Secțiuni: Biografie + echipaj, Rezultate + calendar 2026
- Publicare: local deocamdată (repo GitHub `racing` există)

## Costuri Higgsfield (măsurate 2026-09-08)
- Seedance 2.0, 5s, 480p/fast, audio off: 7.5 credite
- Seedance 2.0, 5s, 720p/std, audio off: 22.5 credite
- Nano Banana Pro, 1 imagine: 2 credite

## Surse
- https://fras.ro/sport/raliu/
- https://www.ewrc-results.com/profile/79667-mihai-manole/
- https://www.fanrally.ro/victorie-pentru-andrei-girtofan-si-dorin-pulpea-la-raliul-maramuresului-2026/
- https://raliulvalcii.ro/stiri/comunicate/cronica-sezonului-2025-din-campionatul-national-de-raliuri/
- https://www.youtube.com/watch?v=o42EfVcAiD0 (Look Motors, invitat Mihai Manole)

## Site v1 (2026-09-09) — Lane A, poze reale
- Concept „Caietul de note”: odometru în header, capitole ca note de traseu, curbe de nivel procedurale.
- Fișier: site/index.html (GSAP + ScrollTrigger + Lenis vendorizate în site/vendor).
- Singura imagine editată AI: build/livery/livery-v4 (livreria reală + ICTL Corp), folosită în hero și în secțiunea Mașina.
- Server local: python3 site/serve.py 8765 → http://localhost:8765
- Verificare: build/shots/*.png (desktop + mobil), jank max 18.8ms (PASS).
- De completat de la Mihai: bio, rezultate etape 2–7 2026, socials (Instagram/Facebook), e-mail contact, sponsorii confirmați.

## Site v2 (2026-09-09) — hero „ca Lando”, WebGL + Higgsfield
- Folder: site-v2/ (server: python3 site-v2/serve.py 8766). v1 rămâne în site-v1/ (tag git v1).
- Hero: portret real Mihai decupat (Higgsfield background remover, 1 cr) + cască 3D reală (Nano Banana Pro 3 vederi = 6 cr → Tripo H3.1 image-to-3D = 9 cr; 56 MB → 2.8 MB optimizat + 265 KB low-poly pentru wireframe).
- Three.js: wireframe + „lanternă” la mouse (shader mask pe gl_FragCoord) + materializare la scroll (uReveal), parallax cap/cască/topo.
- Scroll (pin 260vh): fundal crem→carbon, hero→card, cască pe cap, card mic alb-negru cu video „Mesaj de la Mihai” (Seedance image-to-video din poza reală, draft 480p, 7.5 cr), marquee serif roșu + outline, semnătura (placeholder, stroke roșu).
- Lecții: uniformele custom trebuie DECLARATE în fragmentShader; #hero nu are voie să aibă height fix (blochează pin spacer-ul); modelul Tripo are fața pe axa X → pre-rotație -π/2.
- De la Mihai: semnătura reală (poză pe hârtie albă), un portret frontal studio ar fi ideal pentru hero.

## Site v3 (2026-09-09) — „De la portret la podium” (ALES după respingerea v2)
- Folder: site-v3/ (server: python3 site-v3/serve.py 8767). Film în build/film2/.
- Mecanism: 5 clipuri Seedance 2.0, fiecare cu start_image = ultimul cadru al clipului anterior și END_IMAGE = următoarea POZĂ REALĂ. Mihai și mașina sunt reale la fiecare capăt de capitol. Fără image-references (rup joncțiunea).
- Lanț: mihai-portrait → mihai-cockpit → act-dust-rear → act-jump → act-hairpin → crew-flag. SSIM joncțiuni: 0.76 / 0.87 / 0.82 / 0.82, verificate vizual.
- Draft 480p: 6 clipuri × 7.5 = 45 cr (unul fără end-frame, aruncat). Master 720p: 5 × 22.5 ≈ 112 cr, doar cu aprobare.
- Pagină: motor canvas cu ImageBitmap (engine.md), 301 cadre 1280w, beat-uri ca note de traseu, header adaptiv, seam spre carbon, secțiunile v1 sub film.
- Scripturi: build/film2/run-chain.sh (lanțul cu END), build/chain-ref.sh (suportă END= și refs).
