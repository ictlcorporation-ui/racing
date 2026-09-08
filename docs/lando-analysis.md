# landonorris.com — analiză tehnică (2026-09-09, verificat în browser)

## Stack
- Webflow + WebGL custom (studio itsoffbrand.io) + Rive (canvas 2D) pentru micro-animații (nav, butoane, next-race).
- Asset-uri GL: `models/helmet-21.glb` (draco) + texturi PBR (BaseColor/Normal/Metallic/Roughness) + `Norris_Glass` (vizieră) + HDRI `studio_small_08`; `textures/head/{diffuse,normal,depth,alpha,shadow}.webp` = portret 2.5D cu hartă de adâncime; `tracks-05.glb` (circuite 3D); fonturi MSDF (Mona Sans, Brier) pentru text 3D; variantă „disco” helmet.

## Hero (ce vezi)
1. Portret frontal studio pe crem, linii topografice subtile în fundal (SVG animat lent).
2. Peste cap: **cască wireframe** (mesh transparent, linii gri).
3. **Mouse = lanternă**: un cerc urmărește cursorul; în interiorul lui casca apare texturată real (livrea), restul rămâne wireframe. Capul are parallax de adâncime ușor.
4. Card „Next race” stânga jos, wordmark stânga sus, STORE lime dreapta.

## Scroll (secvența)
1. Fundalul paginii → olive închis; hero-ul se încadrează într-un card care se micșorează.
2. Casca se **materializează complet** (vizieră McLaren) și coboară pe cap.
3. Cardul devine video alb-negru „Message from Lando”; marquee uriaș (serif lime + grotesk crem) trece în spatele cardului.
4. **Semnătura** lui se desenează cu lime peste card (stroke animat).
5. Manifest: „REDEFINING LIMITS…” cu cuvinte cheie în lime, apoi colaje.

## Transpunere pentru Mihai (v2)
- Portret real Mihai, fundal eliminat (Higgsfield background remover) pe crem + curbe de nivel.
- **Casca reală Stilo carbon** → model 3D (Higgsfield image-to-3D) → Three.js: wireframe + lanternă la mouse + materializare la scroll.
- Card „Mesaj de la Mihai”: Seedance image-to-video din poza reală (clipire, respirație), alb-negru.
- Semnătura lui Mihai (de cerut: poză cu semnătura pe hârtie albă) desenată cu roșu.
- Marquee: serif roșu + grotesk crem; manifest cu cuvinte cheie în roșu/galben.
