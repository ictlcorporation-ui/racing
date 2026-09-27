/* limba site-ului: română (implicit) sau engleză. Alegerea: ?lang=ro|en în adresă > ultima aleasă (localStorage) > română.
   Rulează înainte de app.js / nav.js și de SplitText: înlocuiește textele din pagină (noduri de text, alt / aria-label / title)
   după dicționarul de mai jos. Elementele cu text amestecat cu <em> / <b> se traduc întregi (HTML). Schimbarea limbii = reîncărcare. */
(() => {
  const q = new URLSearchParams(location.search).get('lang');
  let saved = null; try { saved = localStorage.getItem('mm-lang'); } catch (e) {}
  const lang = ['ro', 'en'].includes(q) ? q : ['ro', 'en'].includes(saved) ? saved : 'ro';
  try { localStorage.setItem('mm-lang', lang); } catch (e) {}
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const url = (l) => { const u = new URL(location.href); u.searchParams.set('lang', l); u.hash = ''; return u.pathname + u.search; };
  window.I18N = { lang, t: (ro, en) => (lang === 'en' ? en : ro), url };
  document.documentElement.lang = lang;
  if (lang === 'ro') return;

  // elemente cu text + <em>/<b>: cheia = innerHTML normalizat
  const H = {
    'Al șaselea sezon pe <em>Fabia</em>. Fiecare probă, o <em>luptă</em> cu cronometrul. Din parcul de service până la <em>sosire</em>, cu Florin în dreapta.':
      'A sixth season in the <em>Fabia</em>. Every stage a <em>fight</em> against the clock. From the service park to the <em>finish</em>, with Florin in the right seat.',
    'Sezonul a pornit la Baia Mare: <b>locul 2</b> la general după prima zi.<span class="mark"></span>':
      'The season started in Baia Mare: <b>2nd overall</b> after day one.<span class="mark"></span>',
    'Cel mai bun rezultat al anului: <b>locul 6</b> la general, la Raliul Iașului.<span class="mark"></span>':
      'Best result of the year: <b>6th overall</b> at the Iași Rally.<span class="mark"></span>',
    '<span>Sezonul</span><em>în imagini</em>': '<span>The season</span><em>in pictures</em>',
  };
  const T = {
    'Mihai Manole — Pilot CNR': 'Mihai Manole — Rally driver, CNR',
    'Mihai Manole, numărul 69': 'Mihai Manole, number 69',
    'Meniu': 'Menu',
    'pilot de raliu': 'rally driver',
    'Următoarea etapă': 'Next round',
    'Raliul Iașului': 'Iași Rally',
    '4 – 6 sep 2026 · Et. 6': '4 – 6 Sep 2026 · Rd. 6',
    'Casca · Stilo WRC': 'Helmet · Stilo WRC',
    'treci cu mouse-ul': 'hover to reveal',
    'Campionatul Național de Raliuri · 2026': 'Romanian National Rally Championship · 2026',
    'Sezonul': 'Season',
    'Cinci raliuri în Campionatul Național, de la Baia Mare la Râmnicu Vâlcea. Mihai Manole și Florin Dorca, cu Škoda Fabia Rally2 Evo numărul 69.':
      'Five rallies in the National Championship, from Baia Mare to Râmnicu Vâlcea. Mihai Manole and Florin Dorca, in Škoda Fabia Rally2 Evo number 69.',
    'Start festiv · Maramureș, 2026': 'Ceremonial start · Maramureș, 2026',
    'Mihai Manole cu casca, la startul festiv al Raliului Maramureșului': 'Mihai Manole in his helmet at the ceremonial start of the Maramureș Rally',
    'Raliul Maramureșului, 2026': 'Maramureș Rally, 2026',
    'Škoda Fabia nr. 69 în viteză, Raliul Maramureșului': 'Škoda Fabia no. 69 at speed, Maramureș Rally',
    'Fabia pe asfalt ud, spate, Maramureș': 'The Fabia on wet tarmac, from behind, Maramureș',
    'Numărul de concurs · Škoda Fabia Rally2 Evo': 'Competition number · Škoda Fabia Rally2 Evo',
    'Raliul Harghitei, 2026': 'Harghita Rally, 2026',
    'Fabia în viraj, Raliul Harghitei': 'The Fabia through a corner, Harghita Rally',
    'Mașina pe proba din Harghita, între dealuri': 'The car on the Harghita stage, between the hills',
    'Fabia în fața publicului, Harghita': 'The Fabia in front of the crowd, Harghita',
    'PS1 · Raliul Clujului, 2026': 'SS1 · Cluj Rally, 2026',
    'Fabia din față, PS1 Raliul Clujului': 'The Fabia head-on, SS1 of the Cluj Rally',
    'Fabia din profil, shakedown Cluj': 'The Fabia in profile, Cluj shakedown',
    'Fabia lângă baloții de paie, Maramureș': 'The Fabia by the hay bales, Maramureș',
    'Sezoane pe Fabia Rally2, 2021–2026': 'Seasons in the Fabia Rally2, 2021–2026',
    'Fabia din spate, în viraj, Harghita': 'The Fabia from behind, cornering, Harghita',
    'Fabia pe drumul dintre copaci, Maramureș': 'The Fabia on a tree-lined road, Maramureș',
    'Fabia din profil, Harghita': 'The Fabia in profile, Harghita',
    'Maramureș, Harghita, Cluj, Iași, Vâlcea. Toate etapele, cu rezultatele lor.': 'Maramureș, Harghita, Cluj, Iași, Vâlcea. Every round, with its result.',
    'Vezi calendarul': 'See the calendar',
    'pe': 'on', 'Pe': 'On', 'probă': 'stage', 'în': 'in', 'În': 'In',
    'Etapele, rezultatele și probele sezonului 2026': 'The rounds, results and stages of the 2026 season',
    'Echipajul, mașina și echipa din parcul de service': 'The crew, the car and the team in the service park',
    'Mihai Manole cu casca, în habitaclul Fabiei, Raliul Harghitei': 'Mihai Manole in his helmet, in the Fabia’s cockpit, Harghita Rally',
    'În habitaclu · Raliul Harghitei, 2026': 'In the cockpit · Harghita Rally, 2026',
    'Etapele': 'Rounds',
    'Rezultatele echipajului Manole / Dorca în Campionatul Național de Raliuri 2026, la general.': 'Overall results of the Manole / Dorca crew in the 2026 Romanian National Rally Championship.',
    'Raliul Maramureșului': 'Maramureș Rally', 'Raliul Harghitei': 'Harghita Rally', 'Raliul Clujului': 'Cluj Rally', 'Raliul Vâlcii': 'Vâlcea Rally', 'Raliul Moldovei': 'Moldova Rally',
    '27–29 martie': '27–29 March', '24–26 aprilie': '24–26 April', '19–21 iunie': '19–21 June', '4–6 septembrie': '4–6 September', '25–26 septembrie': '25–26 September', '17–18 octombrie': '17–18 October',
    'Locul 7': '7th place', 'Locul 15': '15th place', 'Locul 6': '6th place', 'Locul 8': '8th place',
    'Pe locul 2 după prima zi; pană duminică': '2nd after day one; a puncture on Sunday',
    'Abandon': 'Retired', 'Accident în PS5': 'Crash on SS5', 'Cel mai bun rezultat al sezonului': 'Best result of the season',
    'Anulat': 'Cancelled', 'Etapa de la Bacău nu s-a mai disputat': 'The Bacău round was not held',
    'Rezultate la general, după eWRC-results.': 'Overall results, source: eWRC-results.',
    'Mașina de categoria Rally2 cu care Mihai aleargă din 2021: tracțiune integrală, motor turbo de 1,6 litri, livreea neagră cu roșu Budureasca.':
      'The Rally2 car Mihai has raced since 2021: four-wheel drive, a 1.6-litre turbo engine and the black-and-red Budureasca livery.',
    'Škoda Fabia Rally2 Evo nr. 69, din profil': 'Škoda Fabia Rally2 Evo no. 69, in profile',
    'Motor': 'Engine', '1,6 l turbo': '1.6 l turbo', 'benzină, 4 cilindri': 'petrol, 4 cylinders', 'Putere': 'Power', '291 CP': '291 hp',
    'Cuplu': 'Torque', 'Tracțiune': 'Drive', 'Cutie': 'Gearbox', '5 trepte': '5-speed', 'secvențială': 'sequential', 'Masă minimă': 'Minimum weight', '1 230 kg': '1,230 kg',
    'Fabia cu capota ridicată, în parcul de service': 'The Fabia with the bonnet up, in the service park',
    'Parcul de service · Harghita, 2026': 'Service park · Harghita, 2026',
    'Fabia lângă baloții de paie, din spate': 'The Fabia by the hay bales, from behind',
    'Echipajul': 'The crew', 'numărul 69': 'number 69',
    'Pilotul și copilotul, plus oamenii din parcul de service care pregătesc Fabia între probe.': 'Driver and co-driver, plus the people in the service park who prepare the Fabia between stages.',
    'Mihai Manole, în combinezonul Budureasca': 'Mihai Manole in his Budureasca race suit',
    'pilot': 'driver', 'copilot': 'co-driver',
    'Florin Dorca, cu căștile de comunicație': 'Florin Dorca with his intercom headset',
    'Echipa': 'The team', 'din service': 'in service',
    'Roți, reglaje și verificări în câteva minute între bucle.': 'Tyres, set-up and checks in a few minutes between loops.',
    'Service · Raliul Iașului, 2026': 'Service · Iași Rally, 2026',
    'Mihai în fața cortului de service, cu Fabia pe elevator': 'Mihai in front of the service tent, with the Fabia on the lift',
    'Cortul de service · Iași, 2026': 'Service tent · Iași, 2026',
    'Cortul de service, cu Fabia pe capre și roțile pregătite': 'The service tent, with the Fabia on stands and the wheels ready',
    'Mihai lângă roata Fabiei, în service': 'Mihai by the Fabia’s wheel, in service',
    'Mihai în habitaclu, alb-negru': 'Mihai in the cockpit, black and white',
    'Mihai și Florin la startul festiv': 'Mihai and Florin at the ceremonial start',
    'Schimb de roată în service': 'Wheel change in service',
    'Mihai cu casca, seara, la startul festiv': 'Mihai in his helmet at the evening ceremonial start',
    'Echipajul cu tricolorul pe mașină': 'The crew with the Romanian flag on the car',
    'Mihai și Florin, zâmbind, în service': 'Mihai and Florin, smiling, in service',
    'Mihai în mașină, la Iași': 'Mihai in the car, in Iași',
    'De pe probe, din service, de la start.': 'From the stages, the service park and the start line.',
    'Foto: Flavius Croitoriu și arhiva echipei': 'Photos: Flavius Croitoriu and the team archive',
    'Împreună': 'Together', 'Parteneri': 'Partners', '& susținători': '& supporters',
    'Companiile care fac posibil sezonul echipajului Manole / Dorca în Campionatul Național de Raliuri.': 'The companies that make the Manole / Dorca season in the National Rally Championship possible.',
    'Hai să': 'Let’s', 'vorbim': 'talk',
    'Parteneriate, presă, colaborări pentru sezonul următor.': 'Partnerships, press and collaborations for next season.',
    'Scrie-i lui Mihai': 'Write to Mihai',
    '© 2026 Mihai Manole. Toate drepturile rezervate.': '© 2026 Mihai Manole. All rights reserved.',
    'Site realizat de': 'Site by',
    'Înapoi sus ↑': 'Back to top ↑',
  };
  const tr = (s) => { const k = norm(s); return k && T[k] !== undefined ? s.replace(k, T[k]) : s; };
  document.title = tr(document.title);
  document.querySelectorAll('h2,h3,p').forEach((el) => { const k = norm(el.innerHTML); if (H[k]) el.innerHTML = H[k]; });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('script,style,svg') ? 2 : 1) });
  for (let n; (n = w.nextNode());) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  document.querySelectorAll('[alt],[aria-label],[title]').forEach((el) => ['alt', 'aria-label', 'title'].forEach((a) => el.hasAttribute(a) && el.setAttribute(a, tr(el.getAttribute(a)))));
  const m = document.querySelector('meta[name="description"]'); if (m) m.content = tr(m.content);
})();
