# Storyboard film — „Coborârea” + „Anatomia vitezei” (5 capitole, 5s fiecare)

Direcție de cameră: mereu coborâm / împingem înainte. Grade: teal-amber la început, negru + roșu + verde electric la final.

| # | Capitol (RO, pe site) | Ce se vede | Start-image |
|---|---|---|---|
| 1 | Zorii | Dronă peste Carpați în zori, mare de nori, drum șerpuit jos. Camera coboară lent spre drum. | keyframe concept 2 |
| 2 | Drumul | Continuăm coborârea prin ceață spre drum; Škoda 69 apare mică pe drum, praf, crește în cadru. | ch1-last |
| 3 | Pietrișul | Ajungem la nivelul drumului când mașina trece; pietriș, praf, macro anvelopă care mușcă. | ch2-last |
| 4 | Caroseria | Camera alunecă pe caroserie: Budureasca, 69, ICTL Corp, apoi urcă pe capotă spre parbriz. | ch3-last |
| 5 | Pilotul | Intrăm prin parbriz: Mihai în cască, ochii, bordul aprins. Cadrul se stinge în negru. | ch4-last |

Referințe imagine pentru cap. 2–5: livreria aprobată (side), car-front34, mihai-helmet-bw, mihai-portrait.
Draft: 480p/fast, 7.5 cr/clip. Master: 720p, doar după aprobare.

## Draft finalizat 2026-09-08 (480p/fast)
- ch1: din keyframe concept 2, OK din prima.
- ch2: 3 încercări. Referințele de imagine (`--image-references`) fac Seedance să reîncadreze primul cadru → joncțiune ruptă. Fără referințe: SSIM 0.876, OK.
- ch3: fără referințe, OK (SSIM 0.58 sub-citește din cauza prafului; side-by-side identic).
- ch4: fără referințe a derapat pe livrerie Red Bull #23. Soluție: `--end-image` generat cu Nano Banana Pro din pozele reale (build/film/endframes/ch4-end). SSIM 0.887.
- ch5: `--end-image` cu chipul lui Mihai (ch5-end). SSIM 0.859.
- Master draft: build/film/draft/master.mp4, 601 cadre, 301 JPEG extrase, culoare seam #1b3144.
- Regulă pentru master 720p: aceleași prompturi, fără image-references, cu end-image la ch4 și ch5.
- Credite draft: 8 clipuri × 7.5 = 60 + 2 end-frames × 2 = 4.
