# hero-gl — hero „ca pe landonorris.com” pentru Mihai Manole

Proiect separat de `site-v8`. Nu împarte nimic cu el în afară de copiile din `vendor/`.

## Rulare

```bash
python3 serve.py 8772
```

apoi http://localhost:8772 (port diferit de site-v8 / site-final, care folosesc 8765–8771).

## Ce reproduce

| Element de pe landonorris.com | Aici |
|---|---|
| un singur canvas WebGL fix, z-index -1, în spatele DOM-ului | `.gl-wrap` + `HeroGL` în `app.js` |
| portret 2.5D: plane 128×128 cu displacement din hartă de adâncime | `PlaneGeometry(1.5, 2, 160, 213)` + `HEAD_VERT` |
| cască revelată de cursor (simulare de fluid pe GPU) | clasa `Fluid` (advect, divergence, 14 iterații Jacobi, gradient) → `tCursor` |
| cască 3D reală (GLB) cu shell carbon, HDRI de studio | clasa `Helmet`: `assets/models/helmet.glb`, `MeshPhysicalMaterial` + `RGBELoader` (studio_small_08, Poly Haven CC0) |
| cască desenată wireframe peste cap | starea „fantomă” a aceluiași GLB: grilă latitudine/longitudine + fresnel, doar pe cochilia exterioară |
| hover pe rândul „casca” → cască permanentă | `[data-gl-helmet="hover"]` → `uHelmet` (expo.inOut, 1.6 s) |
| camera pe scroll (dolly + alb-negru), dissolve la ieșire | un singur `ScrollTrigger` cu `onUpdate` → `gl.scroll` |
| fundal topografic care se mișcă și se deformează după fluid | `BG_FRAG` (fbm + iso-linii, warp din `tVel`) |
| schimbarea culorii fundalului GL pe secțiuni | `[data-gl-change="dark|light"]` → `setTheme` |
| cursor „idle” când nimeni nu mișcă mouse-ul | curbă Lissajous în `update()` |
| Lenis + GSAP ticker, scalare fluidă (`html font-size = 100vw/1728*16`) | `index.html` |

## Texturi (assets/tex)

Generate cu Nano Banana Pro (Higgsfield) din pozele reale ale lui Mihai, apoi:

```bash
python3 tools/align.py                                   # aliniază portretul fără cască la cel cu cască
python3 tools/prep.py build/mihai-nohelmet-aligned.png head
python3 tools/prep.py build/mihai-helmet-raw.png helmet
```

`prep.py` produce diffuse (jpg 1536×2048), alpha (rembg u2net) și depth (Depth Anything V2 small, ONNX, `tools/models/`).
Fișierele brute generate sunt în `build/`.

## Casca 3D

`assets/models/helmet.glb` (10 MB, 40k triunghiuri, texturi PBR) a fost generat cu Higgsfield `multi_image_to_3d`
din 4 poze oficiale Stilo Venti WRC Carbon (`build/stilo/view-*.jpg`, de pe stilohelmets.com).
`assets/models/helmet-photo.glb` este varianta din vederile generate după poza lui Mihai (are microfon + curea): `?helmet=helmet-photo`.
CLI-ul 1.1.20 are un bug de validare pe acest model; se ocolește cu `--enable_animation false --enable_rigging false`.
Poziționarea pe cap: `heroGL.helmet.tune` (x, y, z, scale, rot*) — valorile bune sunt în constructorul `Helmet`.
Suprafețele interioare ale căștii sunt eliminate în shader (normala spre centru), fiindcă portretul e un plan 2.5D.

Încadrare: linia ochilor (local y = +0.32) stă pe axa camerei în orice format, iar poziționarea în ecran se face cu
`camera.setViewOffset` (decentrare de proiecție). Altfel, pe ferestre înalte capul ajungea deasupra axei și perspectiva
„cobora” casca 3D față de față.

Rotirea căștii după mouse: `Helmet.update` — easing propriu (0.045, mai lent decât camera), ±14° yaw, ±7° pitch, mic roll;
capul (planul) se rotește ±6°, ca mișcarea să fie coerentă.

## Scroll (ca pe referință)

Un singur `ScrollTrigger` pe track-ul de 200vh → `gl.scroll.card` (0→1 pe primii ~85% din faza lipită):
fundalul paginii (scena B, întunecată) apare, casca 3D se arată complet o clipă (`helmetFlash`), scena capului
(randată în RT cu fundalul ei deschis) se micșorează în dreptunghiul `#cardTarget` (citit din DOM în fiecare cadru,
deci cardul urcă apoi cu pagina), devine duoton (`uDuo`), iar două rânduri de marquee (text pe canvas → texturi,
compuse în post-pass SUB card) trec cu viteza și direcția scroll-ului. Eyebrow „Mesaj de la Mihai” deasupra cardului.

Încadrare (după feedback): referința e formatul de mobil — bustul umple înălțimea, scrisul „Budureasca” rămâne vizibil jos.
Pe lat scara vine din înălțime (`s = visH / 2.14`), pe îngust din lățime; fereastra vizibilă e aliniată jos când
bustul încape, altfel sus (creștet + loc pentru cască).

Urma cursorului (după înregistrarea de pe referință): `Fluid.stroke` pune mai multe pete pe segmentul mișcării → bandă
lată, întinsă pe direcția cursorului; masca de reveal are margine netă (`smoothstep(0.22,0.30)` + zgomot fin), aceeași
mască colorează fundalul în gri deschis (`uCursor`), iar dâra se strânge și dispare în ~1,5 s (disipare 0.982).
Casca-fantomă: sticlă mată albă (alpha 0.16) + linii subțiri deschise, doar pe cochilia exterioară.

## v2 (2026-09-26, după feedback)
- Portret nou `build/mihai-wide-1.png` (Nano Banana Pro, cadru mai larg: umerii și brațele întregi în cadru). Texturile vechi: `build/tex-v1/`.
  Reperele din plan sunt în constanta `F` din `app.js` (ochi +0.36, creștet +0.65).
- Casca: `tune` = x -0.015, y 0.385, z 0.06, scale 0.64, rotX 0.06. Cureaua de sub bărbie e tăiată în shader (`uCut`), microfonul rămâne.
- Fundal mai liniștit: zone pline slabe, linii fine, lumină de studio în spatele capului, pata cursorului la jumătate.

## v3 (2026-09-26/27) — prim-plan ca pe landonorris.com, vizieră
- Portret 4K lat: `build/mihai-closew-2.png` (4800×3584) → `python3 tools/prep.py build/mihai-closew-2.png head land` (4096×3072, plan 2 × 1.5).
  Texturile v2 (3:4) sunt în `build/tex-v2/`. Reperele: constanta `F` (ochi +0.264, vârful căștii +0.64, pe lat se încadrează 0.75 unități).
- Pe lat: prim-plan, capul ≈ jumătate din înălțime, tăietura sub guler; pe îngust bustul rămâne lipit jos.
- Casca: `tune` x -0.01, y 0.285, z 0.04, scale 0.53; `uDepth` 0.23.
- Vizieră fumurie generată în cod (`Helmet.addVisor`, elipsoid pe deschiderea feței), coborâtă; `heroGL.helmet.tune.visor = 1` o ridică sub cozoroc.
- v3.1: încadrarea pe lat revine la bust (`F.span` 1.34); microfonul GLB tăiat (`uMicCut`), înlocuit de `Helmet.addMic` (poziția capsulei în `tune.mic`);
  căptușeala obrajilor randată ca spumă neagră, interior negru `Helmet.addLiner` desenat înaintea portretului; portretul nu mai scrie adâncime,
  ca părul să nu treacă peste cască.
- v3.2: casca după proporțiile din poza reală de pe probă (lățime ≈ 3,7 × distanța dintre pupile, creștetul ≈ 2,1 × deasupra ochilor):
  `tune` scale 0.674, y 0.26. Microfon DES în cod (braț lat din carbon + capsulă-cutie cu grilă, `tune.mic`), vizieră până sub nas.

## v4 (2026-09-27) — efectul lui Lando, 1:1
- Fluidul e portat din bundle-ul landonorris.com (`build/lando/bundle.js`, OFF+BRAND): Stable Fluids doar pe viteză, BFECC,
  disipare 0.96, forță 50, rezoluție 0.1, cursor 18, pas fix 60 Hz; masca = 1 - mix(1, vel.x*0.5+0.5, |vel|), prag dur 0.1.
  Cursorul idle: după 2.5 s / 2 s fără mișcare, zigzag 2.5 s sus→jos, înapoi de la 4 s, pauză 3 s (aici centrat pe fața lui Mihai).
- Fără rotirea căștii/capului după mouse (doar parallax-ul camerei). Fața e umbrită sub casca dezvăluită.
- Casca fantomă: `?ghost=lando` (implicit, animată: se desenează sus→jos, apoi scanare la ~6 s) | `grid` | `contur` | `puncte` | `nimic`.
- Model nou `assets/models/helmet-venti.glb` (Higgsfield multi_image_to_3d din 4 poze oficiale Venti WRC, `build/venti/`), material carbon închis.
- Marginea portretului: adâncimea coboară lin înainte de siluetă (tools/prep.py), plan 520×390 segmente.
- Microfonul „VENTI” al modelului e rotit ca o balama (în vertex shader, `uArm` 0.33 rad în jurul `uArmPivot`) până la gură, ca în poza lui Mihai.
- Hover pe față (în plus față de referință): cât timp cursorul stă pe fața lui Mihai, un disc cu margine ondulată (rază 0.17 din înălțime)
  ține casca vizibilă în jurul lui; e adăugat în pasul de ieșire al fluidului (`LF.out`), deci îl folosesc toate shaderele.
  Dâra dezvăluie și la mișcări spre dreapta (max cu 0.3·|vel|).

## v5 (2026-09-27) — casca Venti curată
- `tools/view.html?m=helmet-venti` randează modelul brut din 6 unghiuri → `build/renders/` (cu `python3 tools/save_server.py 8779` pornit).
- Carbon procedural (twill 2×2, triplanar, `CARBON_GLSL`) în locul texturii generate (avea reflexiile albe „coapte”); textura GLB
  rămâne doar pentru căptușeală și borduri (clasificare după geometrie: aproape de elipsoidul cochiliei + normala spre exterior).
- Lac cu normale netezite spre elipsoid, mediu de reflexie de studio negru cu softbox-uri (`Helmet.studioEnv`), căptușeală mată.
- Logo Stilo desenat pe canvas, proiectat din față. Fără vizieră / microfon desenat; curelele și spatele căștii tăiate.
- Casca fantomă „lando”: portată din bundle — wireframe cu benzi de scanare `pow(fract(-y*1.3 - t), 4)` (la ei -y*10 pe un model
  de ~0.25 u): o bandă pe secundă coboară peste cască, linia apare clar și se stinge în urmă. Ciclul desenare/ștergere a fost scos.

## v6 (2026-09-27) — casca foto (implicit)
- `build/mihai-helmetphoto-2.png`: Nano Banana Pro 4K, portretul + poza oficială Venti (față) + poza reală cu casca/DES.
- `tools/align_helmet.py`: aliniere după zona ochi–nas–gură (șablon NCC multi-scară; SIFT nu merge pe imagini regenerate),
  apoi compoziție: casca + fața din foto, corpul de sub gât din portret → `build/mihai-helmet-composite.png` → `prep.py ... helmet land`.
- Reveal-ul arată fotografia (uPhoto = 1, aceeași mască de fluid); modelul 3D rămâne doar pentru casca transparentă. `?helmet3d` = casca 3D.
- Fluid protejat de NaN (un NaN rămânea pentru totdeauna în simulare și înnegrea tot ecranul).
- Compoziție finală (`build/helmet-mask11.png`): înfășurătoarea căștii întregi din foto minus fața (piele) → fața, ochii, nasul, barba
  rămân din portret; peste bărbie doar brațul/capsula; fără curele (pe gâtul din portret apăreau rupte). Relieful rămâne al portretului.
- Casca transparentă potrivită numeric pe conturul căștii foto (`tune` x -0.0101, y 0.2706, scale 0.6015, sy 1.0467).
- `?inspect`: cameră blocată pe cască, fără mouse; tastele 1 (transparentă) / 2 (foto) / 3 (alternează).
- Sub apărători și sub brațul de bărbie: doar gâtul/gulerul din portret (fără curea neagră, fără blocuri de guler din foto).
- Brațul VENTI + capsula: contur detectat în foto (carbon închis + grilă, fără piele), crescut spre bordura de cauciuc, margine de jos netezită (curbă de grad 3).
- Mobil (îngust): portretul mai mare (lățimea × 1.44 / F.narrow), bustul lipit jos cu 3% dedesubt → capul în treimea de sus.

## Online
`tools/deploy.sh` → https://hero-gl-mihai.vercel.app (Vercel, contul ictlcorporation-ui, proiect hero-gl-mihai; public).
- Pe ecranele tactile (`(hover: none) and (pointer: coarse)`): fără dâră și fără cerc sub deget, ca pe landonorris.com pe mobil;
  cursorul automat rulează continuu. Protecția NaN din fluid folosește `!(abs(x) < 1e4)` (shaderele raw sunt GLSL ES 1, fără isnan).
- Casca transparentă: model doar-geometrie `helmet-venti-ghost.glb` (2.8 MB), descărcat în paralel cu texturile, fără HDRI în modul foto;
  ciclu 1.3 s desenare / 1 s / 1.3 s ștergere / 0.15 s. Predarea pentru restul site-ului: `docs/handoff-hero-gl.md`.

## v7 (2026-09-27) — restul paginii (direcția A „ca la Lando, fără card”)
- Tranziția din hero: `#heroTrack` 250vh; manifestul (`.s-manifest`, margin-top -100vh) urcă peste hero-ul lipit. Fundalul GL trece crem → carbon,
  portretul devine alb-negru, se estompează, camera se retrage, apoi se stinge uniform (`uGray`, `uDim`, `uExit` în HEAD_FRAG). Fără card și fără marquee.
- Fundalul topografic urmează scara `BG_STOPS` (crem → carbon → gri → crem): `gl.scroll.bgHero` (hero) + `bgTrack` (pista orizontală).
- `site.js`: efecte portate din bundle-ul Lando — rânduri dezvăluite cu bloc colorat (SplitText, 0.6 s, decalaj 0.15 s), `data-stat-list`,
  pista orizontală (≥ 992 px, parallax 4rem pe poze), evantaiul de carduri (valori identice), banda de logo-uri din footer (O$), temă nav după secțiune.
- Secțiuni: manifest · Sezonul 2026 (pistă) · Pe probă / În service + poză full-bleed · Etapele CNR 2026 (rezultate eWRC) · Mașina · Echipajul ·
  Galeria (evantai) · Parteneri · footer cu banda de logo-uri. Pozele: `tools/web_img.py` → `assets/img` (fără cele cu bannerul ALPHA).
- GSAP 3.15 + SplitText în `vendor/` (vechiul 3.12.5 în `build/vendor-old`).
- Mouse pe cap/cască → casca se umple complet (hoverAnimation de pe referință: 1.5 s / 1 s expo.inOut), la fel ca rândul „Casca”.
  Portretul stă cu 6% mai jos (`responsive`, cerut de client). Semnul din nav: monograma MM + 69.
- Verificare: `node tools/shots.mjs <url> <w> <h> <mobil> <dir> nume=selector@offset …` (Chrome headless, desenează și când fereastra e ascunsă),
  `tools/hover-test.mjs`, `tools/trail-compare.mjs` (aceeași mișcare de mouse pe Lando și aici).
- Ajustări client (2026-09-27): calendarul ascunde etapele fără participare (Argeș, Sibiu); casca transparentă apare mai devreme
  (uReveal ×2.2) și se desenează/șterge în 1.8 s; dâra mai subțire (LF_OPT.cursor 11, referința are 18); pe cap casca se umple doar
  când mouse-ul stă > 0.6 s, în 2.2 s (power2.inOut); rândul „Casca” păstrează 1.5 s / 1 s expo.inOut.
- Ieșirea efectului (client): umplerea se stinge în 1.8 s power2.inOut (referința: 1 s expo.inOut); dâra se disipă cu 0.972 (referința: 0.96).
- Mobil (client): casca transparentă mai plină pe ecrane tactile (uGhostFill 1.6, uGhostWire 1.6); pensula cursorului automat pe mobil = 18 (valoarea aprobată), pe desktop 11.
- Preloader „Mască MM” (preloader.js, ales de client): traseul MM cu punctul 69 după progresul real (min 1.6 s), monograma plină 0.8 s, apoi literele devin fereastra și camera intră prin tija din mijloc. Demo cu cele 3 variante: tools/preloader-demo.html.
- Fix: pe conexiuni lente cursorul automat pornea înaintea primei randări → proiecție 0/0 = NaN în cameră → ecran negru; camGroup.updateMatrixWorld la începutul update + gărzi isFinite.
- Preloader pe telefon mai lent (client): traseu min 3 s, monograma plină 1.1 s, intrarea 1.8 s (desktop: 1.6 / 0.8 / 1.5) — constanta T din preloader.js.
- Fix: pete albe pe obraji lângă gură = marginile din față ale apărătorilor de obraji ale căștii transparente (vizibile mai ales cu umplerea ×1.6 de pe mobil); tăiate în shader (|x| < 0.30–0.42, y < -0.18, z > 0).
- Zigzagul automat (client: „pauza prea mare”): încadrat în conturul căștii (helmNdc) în loc de tot ecranul ca pe referință; IDLE gap 0.15 s, pauză 0.3 s.
- Zigzag 2.6 s / trecere; pensula pe telefon 28 (client: „prea subțire”).
- Fix (client): cu mouse-ul lăsat pe cască, zigzagul automat („ghost-ul”) nu mai apărea — umplerea de pe cap ținea cât stătea mouse-ul. Acum (`HEAD_T`): după 0.6 s se umple în 2.2 s, stă 1.2 s, apoi se golește (1.8 s) și zigzagul reia de sus, ca oriunde pe ecran. O nouă mișcare + oprire pe cap o reia.
- Preloader o singură dată pe browser (client): după prima rulare completă se scrie `localStorage['mm-preloader']`; la vizitele următoare scriptul din `<head>` pune `html.pl-seen` → doar coperta #plBoot (culoarea hero-ului) cât se încarcă din cache, apoi intro-ul hero (~0.6 s). `?preloader` în URL îl forțează.
- Sponsori: ICTL Corp (ictlcorp.com, icon verde) și ICTL Corp Technology (ictlcorptechnology.com, icon argintiu + „| TECHNOLOGY”; a făcut site-ul → creditul din foot-bar). Pe secțiunea deschisă variantele `-ink`; în footer (banda + credit) logo-urile în culorile originale, cerut de client și pe roșu. Budureasca: doar scrisul roșu (`budureasca-script.svg`), fără emblema albă.
- Navbar + meniu (client, 2026-09-27): „Panou lateral” (`nav.js`, `nav.css`) ales din 3 variante (celelalte în `tools/nav-variante/`); buton cu 3 linii; pe telefon panoul ia 65% și are o poză cu link spre Instagram; bara mai aerisită pe telefon. Favicon MM în `assets/icons/`.
- Contact: Mihai are doar Instagram (@mihaimanolerallydriver) și mailul contact@mihaimanole.com — fără X.
- RO / EN (`i18n.js`): dicționar RO→EN aplicat înainte de animații; `?lang=en`, ținut în localStorage `mm-lang`; selector în bară și în meniu. Text nou în pagină → adaugă-l și în dicționar.
- Hero stânga (`hero-left.js/.css`): „Fiecare secundă contează.” + cardul cu ultimul rezultat și fișa echipajului (desktop); pe telefon fără titlu, banda de cronometraj jos (urcă deasupra barei Safari: 100lvh − 100svh) + fișa în fereastră. Cifrele se calculează din rândurile „Etapele” (`data-end`, `data-ewrc`). Pe telefon Mihai stă cu 2% mai jos în loc de 6%.
- Date live (`api/_ewrc.mjs`, `api/season.mjs`, `live.js`): rezultatele citite de pe eWRC-results; local merg (`serve.py` → `/api/season`), pe Vercel eWRC răspunde 403 (Cloudflare blochează serverele) → pagina rămâne pe rândurile din HTML. De rezolvat mai târziu (sarcină programată pe Mac / GitHub Actions / proxy).
- „Hai să vorbim” (`foot.js/.css`): titlu mai mare, câte o poză înclinată pe laterale (noapte / alb-negru), mail + Instagram ca butoane mari; creditul din banda roșie centrat (grilă 1fr auto 1fr) și logo-ul ICTL alb acolo.

## Cum adaugi informații noi (de la Mihai)
- **Texte**: direct în `index.html`, în secțiunea respectivă (manifest `#manifest`, pista `#sezon`, mașina `#masina`, echipajul `#echipa`, partenerii `#parteneri`, footer). **Orice text nou trebuie adăugat și în `i18n.js`** (dicționarul RO → EN), altfel pe `?lang=en` rămâne în română.
- **Etape / rezultate**: un rând `li.cal-row` în `#calendar` cu `data-ewrc="<id eWRC>" data-end="AAAA-LL-ZZ"` (ultima zi). Hero-ul, banda de pe telefon și meniul își iau singure din rânduri „Ultimul rezultat”, „Urmează”, „Cel mai bun”. Când merg datele live (vezi mai sus), rândurile se completează singure.
- **Poze**: în `assets/img/` ca `.webp` (≈ 2000 px pe latura lungă, calitate 80–85); în HTML cu `loading="lazy" decoding="async"` (tot ce e sub hero).
- **Parteneri**: logo-urile în `assets/logo/` (SVG); apar în `#parteneri` și în banda din footer (`.foot-marquee`, de 2 ori, pentru bucla continuă).
- **Secțiuni scoase** (pe probă / în service, poza pe tot ecranul, galeria-evantai): codul lor de animație a rămas în `site.js` și rulează doar dacă secțiunea există — le poți pune înapoi din istoricul git (commit `3d3767d`).
- **Deploy**: `sh tools/deploy.sh` (copiază fișierele în `build/hero-gl-mihai`, unde e legătura cu Vercel — nu șterge folderul acela). Fișier nou în rădăcină → adaugă-l în lista din `deploy.sh`.
- **Domeniu**: https://mihaimanole.com (GoDaddy: A @ → 216.198.79.1 și 64.29.17.1, CNAME www → Vercel; restul DNS neatins, fără MX — mailul contact@ nu e încă configurat). Adresele din `index.html`, `robots.txt`, `sitemap.xml` sunt deja pe domeniu.

## Performanță și setări (2026-09-27)
- Texturile portretului / căștii: WebP q90 (identice vizual cu JPEG-ul 4K, PSNR 45 dB); pe telefoane varianta de 2560 px (`-m.webp`). JPEG-urile rămân pentru unelte.
- Imaginile de sub hero se încarcă leneș; `vercel.json`: cache 7 zile pentru `assets/`, 30 zile pentru `vendor/`, anteturi de securitate. Pagină: ~3,8 MB desktop / ~3,3 MB telefon (de la 8,2 MB).
- SEO / distribuire: descriere, Open Graph + imaginea `assets/icons/og.jpg` (1200×630), Twitter card, JSON-LD Person, hreflang RO/EN, `robots.txt`, `sitemap.xml`, `404.html`.
- `/api/season`: dacă eWRC nu răspunde, întoarce `{rounds: []}` (200, cache 1 h) — fără erori în consolă.
- Preloader (client, 2026-09-27): rulează la fiecare vizită; varianta „o dată pe browser” doar cu `?preloader-once`.
