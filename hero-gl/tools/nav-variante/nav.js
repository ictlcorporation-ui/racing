/* navbar + meniu în 3 variante, alese din adresă: ?nav=1 (Cortina), ?nav=2 (Panou lateral), ?nav=3 (Telemetrie).
   1 · Cortina: meniu pe tot ecranul (ca pe landonorris.com), linkuri mari, previzualizare foto la hover.
   2 · Panou lateral: sertar din dreapta; bara de sus se ascunde la scroll în jos și revine (cu fundal mat) la scroll în sus.
   3 · Telemetrie: pe desktop linkurile stau în bară (cu indicator de secțiune + progres de scroll), fără buton de meniu;
       pe telefon / tabletă meniul e o foaie care urcă de jos, cu plăci foto (se închide și trăgând în jos).
   Cu ?nav în adresă apare jos un comutator între variante. Fără parametru: varianta 1.
   Textele vin în limba aleasă (i18n.js: window.I18N); selectorul RO / EN stă în bară (de la tabletă în sus) și în fiecare meniu. */
const V = (() => { const v = new URLSearchParams(location.search).get('nav'); return ['1', '2', '3'].includes(v) ? v : '1'; })();
const SHOW_SWITCH = new URLSearchParams(location.search).has('nav');
document.documentElement.dataset.nav = V;

const $ = (s, r = document) => r.querySelector(s);
const I = window.I18N || { lang: 'ro', t: (ro) => ro, url: () => '?' }, t = I.t;
const EN = I.lang === 'en';
const LINKS = [
  { id: 'sezon', t: t('Sezonul 2026', 'Season 2026'), s: t('Sezon', 'Season'), em: t('pe pistă', 'on track'), img: 'mm-pan' },
  { id: 'duo', t: t('Pe probă', 'On stage'), s: t('Pe probă', 'On stage'), em: t('și în service', 'and in service'), img: 'cj-shake' },
  { id: 'calendar', t: t('Etapele', 'Rounds'), s: t('Etape', 'Rounds'), em: 'CNR 2026', img: 'mm-hay' },
  { id: 'masina', t: t('Mașina', 'The car'), s: t('Mașina', 'Car'), em: 'Fabia Rally2 Evo', img: 'car-side' },
  { id: 'echipa', t: t('Echipajul', 'The crew'), s: t('Echipaj', 'Crew'), em: 'Manole / Dorca', img: 'crew-duo' },
  { id: 'galerie', t: t('Galerie', 'Gallery'), s: t('Galerie', 'Gallery'), em: t('din sezon', 'from the season'), img: 'g-helmet' },
  { id: 'parteneri', t: t('Parteneri', 'Partners'), s: t('Parteneri', 'Partners'), em: t('care ne susțin', 'who back us'), img: 'team-1' },
  { id: 'contact', t: 'Contact', s: 'Contact', em: t('scrie-i lui Mihai', 'write to Mihai'), img: 'g-smile' },
];
const IMG = (k) => `assets/img/${k}.webp`;
const num = (i) => String(i + 1).padStart(2, '0');
// Mihai are doar Instagram (fără X); contactul e pe mail
const IG_URL = 'https://www.instagram.com/mihaimanolerallydriver/', MAIL = 'contact@mihaimanole.com';
const ICON_IG = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="3.8" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="4" r=".9" fill="currentColor"/></svg>';
const ICON_MAIL = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="1.6" stroke="currentColor" stroke-width="1.4"/><path d="m2 4 6 5 6-5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const SOCIAL = (short) => `<a class="mn-social" href="${IG_URL}" target="_blank" rel="noopener" aria-label="Instagram">${ICON_IG}${short ? '' : '<span class="lbl">Instagram</span>'}</a><a class="mn-social" href="mailto:${MAIL}" aria-label="${MAIL}">${ICON_MAIL}${short ? '' : '<span class="lbl">' + MAIL + '</span>'}</a>`;
const LANG = () => `<div class="lang" role="group" aria-label="${t('Limba', 'Language')}">${['ro', 'en'].map((l) => `<a href="${I.url(l)}" hreflang="${l}" lang="${l}"${l === I.lang ? ' aria-current="true"' : ''} aria-label="${l === 'ro' ? 'Română' : 'English'}">${l.toUpperCase()}</a>`).join('')}</div>`;
const ICON_CAL = '<svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="#fff" stroke-width="1.5"/><path d="M1.5 6.5h13M5 1v3M11 1v3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICON_AR = '<svg class="ar" viewBox="0 0 16 16" fill="none"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MARK = $('#navMark svg')?.outerHTML || '';
// date reale (eWRC, vezi secțiunea Etapele): 5 etape disputate, cel mai bun loc 6 la Iași
const STATS = [['5', t('etape în 2026', 'rounds in 2026')], ['P6', t('Raliul Iașului', 'Iași Rally')], ['69', t('numărul lui Mihai', 'Mihai’s number')]];
const CLOSE = t('Închide meniul', 'Close menu'), MENU = t('Meniu', 'Menu');

const foot = $('footer.foot'); if (foot && !foot.id) foot.id = 'contact';
const nav = $('#nav'), ham = $('#nav .ham');
ham.id = 'ham'; ham.innerHTML = '<i></i><i></i><i></i>'; ham.setAttribute('aria-expanded', 'false'); ham.setAttribute('aria-controls', 'menu');
// selectorul de limbă din bară (ascuns pe telefon, unde e în meniu)
$('#navRight').insertAdjacentHTML('afterbegin', LANG().replace('class="lang"', 'class="lang lang-bar"'));

/* ---------- meniul fiecărei variante ---------- */
const menu = document.createElement('div');
menu.className = `mn mn${V}`; menu.id = 'menu'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-modal', 'true'); menu.setAttribute('aria-label', MENU);
menu.setAttribute('data-lenis-prevent', ''); menu.inert = true;

if (V === '1') {
  menu.innerHTML = `
    <div class="mn-bd" data-close></div>
    <div class="mn1-panel">
    <ol class="mn1-list">${LINKS.map((l, i) => `<li><a href="#${l.id}" data-i="${i}" style="--i:${i}"><span class="n">${num(i)}</span>${l.t}<em>${l.em}</em></a></li>`).join('')}</ol>
    <figure class="mn1-peek">${LINKS.map((l, i) => `<img src="${IMG(l.img)}" alt="" loading="lazy" data-i="${i}"${i ? '' : ' class="on"'}>`).join('')}<figcaption class="eb">Mihai Manole · CNR 2026</figcaption></figure>
    <div class="mn1-foot">
      <div class="mn1-stats">${STATS.map(([b, s]) => `<div class="mn1-stat"><small>${s}</small>${b}</div>`).join('')}</div>
      <div class="mn1-social">${SOCIAL()}</div>
      ${LANG()}
    </div>
    </div>`;
  const imgs = [...menu.querySelectorAll('.mn1-peek img')];
  const peek = (i) => imgs.forEach((im) => im.classList.toggle('on', +im.dataset.i === i));
  menu.querySelectorAll('.mn1-list a').forEach((a) => { const i = +a.dataset.i; a.addEventListener('pointerenter', () => peek(i)); a.addEventListener('focus', () => peek(i)); });
} else if (V === '2') {
  menu.innerHTML = `
    <div class="mn-bd" data-close></div>
    <aside class="mn2-panel">
      <div class="mn2-head">${MARK}<button class="mn-x" data-close aria-label="${CLOSE}"><i></i><i></i></button></div>
      <ol class="mn2-list">${LINKS.map((l, i) => `<li style="--i:${i}"><a href="#${l.id}"><span class="n">${num(i)}</span><span class="t">${l.t}</span>${ICON_AR}</a></li>`).join('')}</ol>
      <div class="mn2-card">
        <div class="mn2-row"><p class="eb" style="opacity:.55">${t('Sezonul 2026', '2026 season')} · Manole / Dorca</p>${LANG()}</div>
        <div class="mn2-stats">${STATS.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
        <a class="btn mn2-btn" href="#calendar">${ICON_CAL}Calendar 2026</a>
        <div class="mn2-cta">${SOCIAL()}</div>
      </div>
    </aside>`;
} else {
  menu.innerHTML = `
    <div class="mn-bd" data-close></div>
    <div class="mn3-sheet">
      <div class="mn3-grab" aria-hidden="true"></div>
      <div class="mn3-head"><p class="h">${MENU}<em>CNR 2026</em></p>${LANG()}<button class="mn-x" data-close aria-label="${CLOSE}"><i></i><i></i></button></div>
      <div class="mn3-body">
        <ol class="mn3-grid">${LINKS.map((l, i) => `<li style="--i:${i}"><a href="#${l.id}"><img src="${IMG(l.img)}" alt="" loading="lazy"><span class="n">${num(i)}</span><span class="t">${l.t}</span></a></li>`).join('')}</ol>
      </div>
      <div class="mn3-foot"><a class="btn" href="#calendar">${ICON_CAL}Calendar 2026</a>${SOCIAL(true)}</div>
    </div>`;
  // linkurile din bară (desktop) + progresul de scroll
  const bar = document.createElement('div'); bar.className = 'nav-links'; bar.id = 'navLinks';
  bar.innerHTML = '<span class="pill"></span>' + LINKS.slice(0, 7).map((l) => `<a href="#${l.id}">${l.s}</a>`).join('');
  nav.insertBefore(bar, $('#navRight'));
  const prog = document.createElement('div'); prog.className = 'nav-prog'; document.body.appendChild(prog);
  // apar odată cu restul barei (intro-ul din app.js animă #navRight)
  const nr = $('#navRight');
  const wait = () => { if (+getComputedStyle(nr).opacity > 0.05) gsap.to(bar, { opacity: 1, duration: 1 }); else requestAnimationFrame(wait); };
  wait();
}
document.body.appendChild(menu);

/* ---------- deschidere / închidere ---------- */
let open = false, lastFocus = null;
const lenis = () => window.__lenis;
function setOpen(v) {
  if (v === open) return; open = v;
  menu.toggleAttribute('data-open', v); menu.inert = !v;
  document.documentElement.toggleAttribute('data-menu', v);
  ham.setAttribute('aria-expanded', String(v)); ham.setAttribute('aria-label', v ? CLOSE : MENU);
  if (v) { lastFocus = document.activeElement; lenis()?.stop(); nav.classList.remove('is-hidden'); setTimeout(() => menu.querySelector('a[href^="#"]')?.focus({ preventScroll: true }), 350); }
  else { lenis()?.start(); (lastFocus && lastFocus !== document.body ? lastFocus : ham).focus?.({ preventScroll: true }); }
}
ham.addEventListener('click', () => setOpen(!open));
menu.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return setOpen(false);
  // linkul intern: închidem înainte ca site.js (handler-ul de pe document) să pornească scroll-ul cu Lenis
  if (e.target.closest('a[href^="#"]')) { lastFocus = null; setOpen(false); }
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && open) setOpen(false);
  if (e.key === 'Tab' && open) { // focusul rămâne în meniu
    const f = [...menu.querySelectorAll('a,button')].filter((el) => el.offsetParent !== null);
    if (V === '1') f.unshift(ham);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
// varianta 3: pe desktop nu există meniu; dacă fereastra se lărgește cu foaia deschisă, o închidem
if (V === '3') matchMedia('(min-width:992px)').addEventListener('change', (m) => m.matches && setOpen(false));

/* foaia de jos (varianta 3): se închide trăgând în jos de mâner / titlu */
if (V === '3') {
  const sheet = $('.mn3-sheet', menu); let y0 = null, dy = 0;
  sheet.addEventListener('pointerdown', (e) => { if (e.target.closest('a, button, .mn3-foot')) return; if (e.target.closest('.mn3-body') && $('.mn3-body', menu).scrollTop > 0) return; y0 = e.clientY; dy = 0; sheet.classList.add('is-drag'); sheet.setPointerCapture(e.pointerId); });
  sheet.addEventListener('pointermove', (e) => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sheet.style.setProperty('--drag', dy + 'px'); });
  const end = () => { if (y0 === null) return; y0 = null; sheet.classList.remove('is-drag'); sheet.style.removeProperty('--drag'); if (dy > Math.min(140, sheet.offsetHeight * 0.25)) setOpen(false); };
  sheet.addEventListener('pointerup', end); sheet.addEventListener('pointercancel', end);
}

/* ---------- bara la scroll + secțiunea activă ---------- */
const secs = LINKS.map((l) => document.getElementById(l.id));
const allLinks = () => document.querySelectorAll('#menu a[href^="#"], #navLinks a');
let lastY = 0, active = null, frame = 0;
function onFrame() {
  const y = window.scrollY, vh = innerHeight;
  if (V === '2' || V === '3') {
    nav.classList.toggle('is-solid', y > vh * 0.9);
    if (V === '2' && !open) { if (y > vh * 0.9 && y > lastY + 4) nav.classList.add('is-hidden'); else if (y < lastY - 4 || y < vh * 0.9) nav.classList.remove('is-hidden'); }
  }
  if (V === '3') { const max = document.documentElement.scrollHeight - vh; $('.nav-prog').style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`; }
  lastY = y;
  if (++frame % 6) return;
  // activă = ultima secțiune al cărei început a trecut de mijlocul ecranului (și încă nu s-a terminat)
  let a = null; secs.forEach((s, i) => { if (!s) return; const r = s.getBoundingClientRect(); if (r.top < vh * 0.5 && r.bottom > vh * 0.3) a = LINKS[i].id; });
  if (a !== active) {
    active = a;
    allLinks().forEach((el) => el.classList.toggle('is-on', el.getAttribute('href') === '#' + a));
    if (V === '3') movePill();
  }
}
function movePill() {
  const bar = $('#navLinks'); if (!bar) return; const pill = $('.pill', bar), on = $('a.is-on', bar);
  if (!on) { pill.style.opacity = 0; return; }
  pill.style.opacity = 1; pill.style.width = on.offsetWidth + 'px'; pill.style.transform = `translateX(${on.offsetLeft}px)`;
}
gsap.ticker.add(onFrame);
addEventListener('resize', () => V === '3' && movePill());

/* ---------- comutator între variante ---------- */
if (SHOW_SWITCH) {
  const sw = document.createElement('nav'); sw.className = 'nav-switch'; sw.setAttribute('aria-label', 'Variante navbar');
  const url = (n) => { const u = new URL(location.href); u.searchParams.set('nav', n); u.hash = ''; return u.pathname + u.search; };
  sw.innerHTML = '<span>Nav</span>' + ['1', '2', '3'].map((n) => `<a href="${url(n)}"${n === V ? ' aria-current="true"' : ''}>${n}</a>`).join('');
  document.body.appendChild(sw);
}
