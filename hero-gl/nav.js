/* navbar + meniu („Panou lateral”, ales de client din 3 variante — celelalte două sunt în tools/nav-variante/):
   butonul cu 3 linii deschide un panou din dreapta (pe telefon: jumătate din lățime), cu pagina estompată în spate;
   bara de sus se ascunde la scroll în jos și revine, cu fundal mat, la scroll în sus; secțiunea curentă are un punct roșu.
   Textele vin în limba aleasă (i18n.js: window.I18N); selectorul RO / EN stă în bară (de la tabletă în sus) și în meniu. */
const $ = (s, r = document) => r.querySelector(s);
const I = window.I18N || { lang: 'ro', t: (ro) => ro, url: () => '?' }, t = I.t;
const LINKS = [
  { id: 'sezon', t: t('Sezonul 2026', 'Season 2026') },
  { id: 'duo', t: t('Pe probă', 'On stage') },
  { id: 'calendar', t: t('Etapele', 'Rounds') },
  { id: 'masina', t: t('Mașina', 'The car') },
  { id: 'echipa', t: t('Echipajul', 'The crew') },
  { id: 'galerie', t: t('Galerie', 'Gallery') },
  { id: 'parteneri', t: t('Parteneri', 'Partners') },
  { id: 'contact', t: 'Contact' },
].filter((l) => l.id === 'contact' || document.getElementById(l.id)); // variantele de conținut (content.js) pot scoate secțiuni
const num = (i) => String(i + 1).padStart(2, '0');
// Mihai are doar Instagram (fără X); contactul e pe mail
const IG_URL = 'https://www.instagram.com/mihaimanolerallydriver/', MAIL = 'contact@mihaimanole.com';
const ICON_IG = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="3.8" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="4" r=".9" fill="currentColor"/></svg>';
const ICON_MAIL = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="1.6" stroke="currentColor" stroke-width="1.4"/><path d="m2 4 6 5 6-5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const ICON_CAL = '<svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="#fff" stroke-width="1.5"/><path d="M1.5 6.5h13M5 1v3M11 1v3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICON_AR = '<svg class="ar" viewBox="0 0 16 16" fill="none"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SOCIAL = `<a class="mn-social" href="${IG_URL}" target="_blank" rel="noopener" aria-label="Instagram">${ICON_IG}<span class="lbl">Instagram</span></a><a class="mn-social" href="mailto:${MAIL}" aria-label="${MAIL}">${ICON_MAIL}<span class="lbl">${MAIL}</span></a>`;
const LANG = (cls = '') => `<div class="lang ${cls}" role="group" aria-label="${t('Limba', 'Language')}">${['ro', 'en'].map((l) => `<a href="${I.url(l)}" hreflang="${l}" lang="${l}"${l === I.lang ? ' aria-current="true"' : ''} aria-label="${l === 'ro' ? 'Română' : 'English'}">${l.toUpperCase()}</a>`).join('')}</div>`;
const MARK = $('#navMark svg')?.outerHTML || '';
// date reale (eWRC, vezi secțiunea Etapele): 5 etape disputate, cel mai bun loc 6 la Iași
const STATS = [['5', t('etape în 2026', 'rounds in 2026')], ['P6', t('Raliul Iașului', 'Iași Rally')], ['69', t('numărul lui Mihai', 'Mihai’s number')]];
const CLOSE = t('Închide meniul', 'Close menu'), MENU = t('Meniu', 'Menu');

const foot = $('footer.foot'); if (foot && !foot.id) foot.id = 'contact';
const nav = $('#nav'), ham = $('#nav .ham');
ham.id = 'ham'; ham.innerHTML = '<i></i><i></i><i></i>'; ham.setAttribute('aria-expanded', 'false'); ham.setAttribute('aria-controls', 'menu');
// selectorul de limbă din bară (ascuns pe telefon, unde e în meniu)
$('#navRight').insertAdjacentHTML('afterbegin', LANG('lang-bar'));

/* ---------- meniul ---------- */
const menu = document.createElement('div');
menu.className = 'mn'; menu.id = 'menu'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-modal', 'true'); menu.setAttribute('aria-label', MENU);
menu.setAttribute('data-lenis-prevent', ''); menu.inert = true;
menu.innerHTML = `
  <div class="mn-bd" data-close></div>
  <aside class="mn-panel">
    <div class="mn-head">${MARK}<button class="mn-x" data-close aria-label="${CLOSE}"><i></i><i></i></button></div>
    <ol class="mn-list">${LINKS.map((l, i) => `<li style="--i:${i}"><a href="#${l.id}"><span class="n">${num(i)}</span><span class="t">${l.t}</span>${ICON_AR}</a></li>`).join('')}</ol>
    <a class="mn-photo" href="${IG_URL}" target="_blank" rel="noopener"><img src="assets/img/g-helmet.webp" alt="" loading="lazy">
      <span class="mx-cap"><span class="eb">${t('Urmărește sezonul', 'Follow the season')}</span><b>${ICON_IG} @mihaimanolerallydriver</b></span></a>
    <div class="mn-card">
      <div class="mn-row"><p class="eb">${t('Sezonul 2026', '2026 season')} · Manole / Dorca</p>${LANG()}</div>
      <div class="mn-stats">${STATS.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
      <a class="btn mn-btn" href="#calendar">${ICON_CAL}Calendar 2026</a>
      <div class="mn-cta">${SOCIAL}</div>
    </div>
  </aside>`;
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
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------- bara la scroll + secțiunea activă ---------- */
const secs = LINKS.map((l) => document.getElementById(l.id));
const links = menu.querySelectorAll('.mn-list a');
let lastY = 0, active = null, frame = 0;
gsap.ticker.add(() => {
  const y = window.scrollY, vh = innerHeight;
  nav.classList.toggle('is-solid', y > vh * 0.9);
  if (!open) { if (y > vh * 0.9 && y > lastY + 4) nav.classList.add('is-hidden'); else if (y < lastY - 4 || y < vh * 0.9) nav.classList.remove('is-hidden'); }
  lastY = y;
  if (++frame % 6) return;
  // activă = ultima secțiune al cărei început a trecut de mijlocul ecranului (și încă nu s-a terminat)
  let a = null; secs.forEach((s, i) => { if (!s) return; const r = s.getBoundingClientRect(); if (r.top < vh * 0.5 && r.bottom > vh * 0.3) a = LINKS[i].id; });
  if (a !== active) { active = a; links.forEach((el) => el.classList.toggle('is-on', el.getAttribute('href') === '#' + a)); }
});
