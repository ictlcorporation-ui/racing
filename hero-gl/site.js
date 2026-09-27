// Secțiunile de după hero. Efectele sunt portate din bundle-ul landonorris.com (build/lando/bundle.js, OFF+BRAND):
// dezvăluirea rândurilor cu bloc colorat (split-rich-text), lista de cifre (data-stat-list), pista orizontală (data-horizontal-section),
// evantaiul de carduri (data-social-callout), banda de logo-uri din footer (data-marquee-scroll-direction-target).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BLOCK = { red: '#D81F26', dark: '#3b3c38', black: '#111112' };
const IS_TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;

// culorile blocurilor și ale pistei vin din variabilele CSS ale paginii (variantele de temă le schimbă; implicit ca pe index.html)
const cssVar = (n, d) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d;

export function initSite({ gl, lenis }) {
  BLOCK.red = cssVar('--red', BLOCK.red); BLOCK.dark = cssVar('--tint', BLOCK.dark); BLOCK.black = cssVar('--black', BLOCK.black);
  fgInterp = gsap.utils.interpolate(cssVar('--track-from', '#EDEBE4'), cssVar('--track-to', '#1a1a18'));
  anchors(lenis);
  const mm = gsap.matchMedia();
  // variantele de conținut (content.js) pot scoate secțiuni: fiecare efect rulează doar dacă secțiunea lui există
  const has = (sel) => !!$(sel);
  const run = (sel, fn) => { if (has(sel)) fn(); };
  if (has('[data-horizontal]')) {
    // pista orizontală doar pe ecrane late (ca pe referință: ≥ 992 px); pe îngust colajul curge vertical
    mm.add('(min-width: 992px)', () => {
      const h = horizontalTrack(gl);
      lineReveals($$('[data-lines]', $('.s-track')), h);
    });
    mm.add('(max-width: 991px)', () => {
      verticalTrack(gl);
      lineReveals($$('[data-lines]', $('.s-track')));
    });
  } else {
    // fără pistă: fundalul trece din carbon în crem la finalul manifestului (secțiunile deschise se bazează pe el)
    ScrollTrigger.create({ trigger: '.s-manifest', start: 'bottom 90%', end: 'bottom 30%', scrub: true, onUpdate: (self) => { gl.scroll.bgTrack = self.progress * 2; } });
  }
  lineReveals($$('[data-lines]').filter((el) => !el.closest('.s-track')));
  statReveal();
  run('.s-duo', duo);
  run('.s-bleed', bleed);
  run('.dark-bulge', darkBlock);
  run('.car-run', carSection);
  run('.s-crew', crew);
  calendarPeek();
  fan();
  run('.s-part', partners);
  $$('[data-marquee]').forEach(marquee);
  themeWatcher(gl);
}

/* ---------- linkuri interne prin Lenis ---------- */
function anchors(lenis) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href'); if (id === '#') return;
    const t = id === '#top' ? 0 : $(id); if (t === null) return;
    e.preventDefault(); lenis.scrollTo(t, { duration: 1.8, easing: (x) => 1 - Math.pow(1 - x, 4) });
  });
}

/* ---------- rândurile care apar de sub un bloc colorat (split-rich-text pe referință) ----------
   fiecare rând: clipPath inset(0 100% 0 0) → 0 în 0.6 s (power2.out); blocul colorat din rând scaleX 1 → 0 spre dreapta
   în 0.6 s (power2.inOut), pornit la jumătate; decalaj 0.15 s între rânduri; o singură dată, când elementul ajunge la 90% din ecran
   (în pista orizontală: la 95% din lățime, prin containerAnimation) */
function lineReveals(els, horizontal) {
  els.forEach((el) => {
    if (el._reveal) { el._reveal.revert(); }
    const color = BLOCK[el.dataset.lines] || BLOCK.red;
    const parts = el.classList.contains('h-big') || el.tagName === 'H3' ? [...el.children] : [el];
    const splits = parts.map((p) => SplitText.create(p, { type: 'lines', linesClass: 'line' }));
    const lines = splits.flatMap((s) => s.lines);
    const tl = gsap.timeline({ paused: true });
    lines.forEach((ln, i) => {
      ln.style.position = 'relative';
      // tăietura se extinde vertical (-0.35em), ca diacriticele (Ș, Ă, Î) să nu fie retezate; se scoate la final
      gsap.set(ln, { clipPath: 'inset(-0.35em 100% -0.35em 0)', autoAlpha: 1 });
      const b = document.createElement('div'); b.className = 'line-block';
      Object.assign(b.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: color, transformOrigin: 'right center', zIndex: '5' });
      ln.appendChild(b);
      const at = i * 0.15;
      tl.to(ln, { clipPath: 'inset(-0.35em 0% -0.35em 0)', duration: 0.6, ease: 'power2.out' }, at)
        .to(b, { scaleX: 0, duration: 0.6, ease: 'power2.inOut' }, at + 0.3);
    });
    tl.add(() => gsap.set(lines, { clearProps: 'clipPath' }));
    const inTrack = horizontal && el.closest('.track') && !el.closest('.t-intro');
    // în pista orizontală onEnter nu vine sigur la salturi de scroll: pornim și la prima actualizare cu progres > 0
    let st; const go = () => { tl.play(); if (st) st.kill(); };
    st = ScrollTrigger.create(inTrack
      ? { trigger: el.closest('.t-item, .t-quote, .t-stat, .t-col') || el, containerAnimation: horizontal, start: 'left 95%', onEnter: go, onUpdate: (self) => { if (self.progress > 0) go(); }, onRefresh: (self) => { if (self.progress > 0) go(); } }
      : { trigger: el, start: 'top 90%', once: true, onEnter: go });
    el._reveal = { revert() { st.kill(); tl.kill(); $$('.line-block', el).forEach((b) => b.remove()); splits.forEach((s) => s.revert()); el._reveal = null; } };
  });
}

/* ---------- lista de cifre (data-stat-list): același bloc, decalaj 0.05 s ---------- */
function statReveal() {
  $$('[data-stat-list]').forEach((list) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 90%', once: true } });
    $$('[data-stat-item]', list).forEach((it, i) => {
      it.style.position = 'relative'; it.style.overflow = 'hidden';
      gsap.set(it, { clipPath: 'inset(-0.35em 100% -0.35em 0)', autoAlpha: 1 });
      const b = document.createElement('div');
      Object.assign(b.style, { position: 'absolute', inset: '0', backgroundColor: BLOCK.red, transformOrigin: 'right center', zIndex: '5' });
      it.appendChild(b);
      tl.to(it, { clipPath: 'inset(-0.35em 0% -0.35em 0)', duration: 0.6, ease: 'power2.out' }, i * 0.05)
        .to(b, { scaleX: 0, duration: 0.6, ease: 'power2.inOut' }, i * 0.05 + 0.3);
    });
  });
}

/* ---------- pista orizontală (I_ pe referință) ----------
   secțiunea are înălțimea = lățimea pistei - lățimea ecranului; pista se mișcă de la „top bottom” la „bottom bottom” (scrub 1),
   iar fiecare poză alunecă 0 → 4rem în cadrul ei cât traversează ecranul. Fundalul topografic: carbon → gri → crem. */
let fgInterp = gsap.utils.interpolate('#EDEBE4', '#1a1a18');
function trackColors(gl, p) {
  const t = gsap.utils.clamp(0, 1, (p - 0.28) / 0.64); const e = t * t * (3 - 2 * t);
  gl.scroll.bgTrack = e * 2;
  $('.track').style.setProperty('--track-fg', fgInterp(gsap.utils.clamp(0, 1, (e * 2 - 1.05) / 0.4)));
}
function horizontalTrack(gl) {
  const sec = $('[data-horizontal]'), track = $('.track', sec);
  const size = () => { sec.style.height = Math.max(0, track.scrollWidth - innerWidth) + 'px'; };
  size();
  const tween = gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth), ease: 'none',
    scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true, onRefreshInit: size,
      onUpdate: (self) => trackColors(gl, self.progress) },
  });
  $$('.t-img img', track).forEach((img) => {
    gsap.fromTo(img, { x: 0 }, { x: '4rem', ease: 'none', scrollTrigger: { trigger: img.closest('.t-item'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
  });
  return tween;
}
function verticalTrack(gl) {
  const sec = $('[data-horizontal]'); sec.style.height = '';
  ScrollTrigger.create({ trigger: sec, start: 'top 80%', end: 'bottom bottom', scrub: true, onUpdate: (self) => trackColors(gl, 0.28 + self.progress * 0.72) });
  $$('.t-img img', sec).forEach((img) => {
    gsap.fromTo(img, { x: 0 }, { x: '4rem', ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  return () => { gl.scroll.bgTrack = 0; };
}

/* ---------- pe probă / în service: decupajele intră din margini, scrisul de mână urmează hover-ul ---------- */
function duo() {
  const sec = $('.s-duo'), items = $$('.duo-item', sec);
  gsap.fromTo('.duo-car', { x: '-12rem' }, { x: 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'center center', scrub: true } });
  gsap.fromTo('.duo-mihai', { x: '12rem' }, { x: 0, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'center center', scrub: true } });
  const set = (it) => items.forEach((x) => x.classList.toggle('on', x === it));
  ScrollTrigger.create({ trigger: sec, start: 'top 45%', once: true, onEnter: () => set(items[0]) });
  if (!IS_TOUCH) {
    items.forEach((it) => it.addEventListener('mouseenter', () => set(it)));
    $('.duo-wrap', sec).addEventListener('mouseleave', () => set(items[0]));
  }
}
function bleed() {
  const sec = $('.s-bleed');
  gsap.fromTo($('img', sec), { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo($('.bleed-img', sec), { clipPath: 'inset(0rem 3rem 0rem 3rem round 1rem)' }, { clipPath: 'inset(0rem 0rem 0rem 0rem round 0rem)', ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: true } });
}
/* marginea de jos a blocului întunecat e bombată și se aplatizează la scroll (trecerea negru → crem de pe referință) */
function darkBlock() {
  gsap.fromTo('.dark-bulge', { scaleY: 1 }, { scaleY: 0.12, ease: 'none', scrollTrigger: { trigger: '.dark-bulge', start: 'top bottom', end: 'top 25%', scrub: true } });
}
function carSection() {
  const img = $('.car-run img');
  gsap.fromTo(img, { x: () => -img.offsetWidth, yPercent: -50 }, { x: () => innerWidth, yPercent: -50, ease: 'none', scrollTrigger: { trigger: '.car-run', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  // perechea de poze (camp-item pe referință): -4rem / +4rem → 0
  const f = $$('.car-pair figure');
  gsap.fromTo(f[0], { x: '-4rem' }, { x: 0, ease: 'power2.out', scrollTrigger: { trigger: '.car-pair', start: 'top bottom', end: 'bottom center', scrub: true } });
  gsap.fromTo(f[1], { x: '4rem' }, { x: 0, ease: 'power2.out', scrollTrigger: { trigger: '.car-pair', start: 'top bottom', end: 'bottom center', scrub: true } });
}
function crew() {
  $$('.crew-card img').forEach((img) => gsap.fromTo(img, { y: '-3rem' }, { y: '3rem', ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  [['.team .f1', 3], ['.team .f2', 7], ['.team .f3', -4]].forEach(([s, d]) => gsap.fromTo(s, { y: d + 'rem' }, { y: -d + 'rem', ease: 'none', scrollTrigger: { trigger: '.team', start: 'top bottom', end: 'bottom top', scrub: true } }));
}

/* ---------- calendar: poza etapei urmează cursorul pe rând ---------- */
function calendarPeek() {
  if (IS_TOUCH) return;
  const peek = document.createElement('div'); peek.className = 'cal-peek'; const im = document.createElement('img'); im.alt = ''; peek.appendChild(im); document.body.appendChild(peek);
  const xTo = gsap.quickTo(peek, 'left', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(peek, 'top', { duration: 0.5, ease: 'power3' });
  $$('.cal-row[data-peek]').forEach((row) => {
    row.addEventListener('mouseenter', (e) => { im.src = `assets/img/${row.dataset.peek}.webp`; gsap.set(peek, { left: e.clientX, top: e.clientY }); peek.classList.add('on'); });
    row.addEventListener('mousemove', (e) => { xTo(e.clientX + 170); yTo(e.clientY); });
    row.addEventListener('mouseleave', () => peek.classList.remove('on'));
  });
  addEventListener('scroll', () => peek.classList.remove('on'), { passive: true });
}

/* ---------- evantaiul de carduri (q8 pe referință, valori identice) ---------- */
const FAN_WIDE = [{ scale: 0.7756, rotation: -21, x: -30, y: 7.3, zIndex: 1 }, { scale: 0.8498, rotation: -14, x: -22, y: 4, zIndex: 2 }, { scale: 0.9346, rotation: -7, x: -11, y: 1.3, zIndex: 3 }, { scale: 1, rotation: 0, x: 0, y: 0, zIndex: 10 }, { scale: 0.9346, rotation: 7, x: 11, y: 1.3, zIndex: 3 }, { scale: 0.8498, rotation: 14, x: 22, y: 4, zIndex: 2 }, { scale: 0.7756, rotation: 21, x: 30, y: 7.3, zIndex: 1 }];
const FAN_NARROW = [{ scale: 0.7756, rotation: -21, x: -15, y: 7.3, zIndex: 1 }, { scale: 0.8498, rotation: -14, x: -11, y: 4, zIndex: 2 }, { scale: 0.9346, rotation: -7, x: -6, y: 1.3, zIndex: 3 }, { scale: 1, rotation: 0, x: 0, y: 0, zIndex: 10 }, { scale: 0.9346, rotation: 7, x: 6, y: 1.3, zIndex: 3 }, { scale: 0.8498, rotation: 14, x: 11, y: 4, zIndex: 2 }, { scale: 0.7756, rotation: 21, x: 15, y: 7.3, zIndex: 1 }];
function fan() {
  const wrap = $('[data-fan]'); if (!wrap) return;
  const cards = $$('.fan-card', wrap), mid = Math.floor(cards.length / 2);
  const pose = () => (innerWidth <= 991 ? FAN_NARROW : FAN_WIDE);
  let P = pose();
  gsap.set(cards, { x: 0, y: '10rem', scale: 1, rotation: 0, transformOrigin: 'center center', opacity: 1 });
  cards.forEach((c, i) => { c.style.zIndex = P[i].zIndex; });
  const EL = 'elastic.out(1, 0.75)';
  const rest = () => {
    P = pose(); const tl = gsap.timeline();
    cards.map((c, i) => ({ c, i, d: Math.abs(i - mid) })).sort((a, b) => a.d - b.d)
      .forEach(({ c, i, d }) => tl.to(c, { x: P[i].x + 'rem', y: P[i].y + 'rem', scale: P[i].scale, rotation: P[i].rotation, duration: 0.5, ease: EL, overwrite: 'auto' }, d * 0.02));
  };
  const focus = (N) => {
    P = pose(); const tl = gsap.timeline(), last = cards.length - 1;
    cards.map((c, i) => ({ c, i, d: Math.abs(i - N) })).sort((a, b) => (a.i === N ? -1 : b.i === N ? 1 : a.d - b.d)).forEach(({ c, i, d }) => {
      const h = (i - mid) / mid, p = 1 - Math.abs(h), k = 1 + 0.2 * Math.max(0, 3 - d); let t;
      if (i === N) t = { y: P[i].y - 2.5 + 'rem', x: P[i].x + 'rem', scale: P[i].scale * 1.08, rotation: P[i].rotation };
      else if (i < N) t = { x: P[i].x - 8 * p * k + 'rem', y: P[i].y + 'rem', scale: P[i].scale, rotation: P[i].rotation - 3 / (d + 1) };
      else { const a = i === last ? 0 : 8 * p * k; t = { x: P[i].x + a + 'rem', y: P[i].y + (i === last ? -1 : 0) + 'rem', scale: P[i].scale, rotation: P[i].rotation + 3 / (d + 1) }; }
      tl.to(c, { ...t, duration: 0.5, ease: EL, overwrite: 'auto' }, d * 0.02);
    });
  };
  const hover = () => {
    let cur = null, to = null;
    addEventListener('resize', () => { P = pose(); if (cur === null) rest(); });
    if (IS_TOUCH) return;
    cards.forEach((c, i) => {
      c.addEventListener('mouseenter', () => { clearTimeout(to); cur = i; focus(i); });
      c.addEventListener('mouseleave', () => { if (cur === i) to = setTimeout(() => { if (cur === i) { cur = null; rest(); } }, 50); });
    });
    wrap.addEventListener('mouseleave', () => { clearTimeout(to); cur = null; rest(); });
  };
  gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 90%', once: true }, onComplete: hover })
    .to(cards, { y: 0, duration: 0.8, ease: 'power2.out', stagger: { amount: 0.5, from: 'end' } })
    .to(cards, { x: (i) => P[i].x + 'rem', y: (i) => P[i].y + 'rem', scale: (i) => P[i].scale, rotation: (i) => P[i].rotation, duration: 1.2, ease: EL, stagger: { amount: 0.2, from: 'center' } }, '-=0.4');
}

function partners() {
  gsap.to('.part-script', { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: '.s-part', start: 'top 75%', once: true } });
}

/* ---------- banda de logo-uri (O$ pe referință) ----------
   colecția e duplicată, rulează continuu (durata = viteza × lățimea colecției / ecran), își inversează sensul după direcția
   scroll-ului, iar tot rândul alunecă ±5vw cât traversează ecranul */
function marquee(E) {
  const C = $('.mq-scroll', E), I = $('.mq-coll', E);
  const { marqueeSpeed: K, marqueeDirection: J, marqueeDuplicate: U, marqueeScrollSpeed: G } = E.dataset;
  const H = parseFloat(K), Z = J === 'right' ? 1 : -1, q = parseInt(U || 0, 10), Y = parseFloat(G);
  const W = innerWidth < 479 ? 0.25 : innerWidth < 991 ? 0.5 : 1, dur = H * (I.offsetWidth / innerWidth) * W;
  C.style.marginLeft = `${-Y}%`; C.style.width = `${Y * 2 + 100}%`;
  for (let i = 0; i < q; i++) C.appendChild(I.cloneNode(true));
  const D = $$('.mq-coll', E);
  const R = gsap.to(D, { xPercent: -100, repeat: -1, duration: dur, ease: 'linear' }).totalProgress(0.5);
  gsap.set(D, { xPercent: Z === 1 ? 100 : -100 }); R.timeScale(Z); R.play();
  ScrollTrigger.create({ trigger: E, start: 'top bottom', end: 'bottom top', onUpdate: (P) => R.timeScale(P.direction === 1 ? -Z : Z) });
  const X = Z === -1 ? Y : -Y;
  gsap.timeline({ scrollTrigger: { trigger: E, start: '0% 100%', end: '100% 0%', scrub: 0 } }).fromTo(C, { x: `${X}vw` }, { x: `${-X}vw`, ease: 'none' });
}

/* ---------- tema nav-ului după secțiunea de sub el ---------- */
function themeWatcher(gl) {
  const secs = $$('[data-theme]').filter((el) => el !== document.body);
  const y = 44;
  gsap.ticker.add(() => {
    let th = null;
    for (const s of secs) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) th = s.dataset.theme; }
    if (!th) th = gl.scroll.bgHero > 0.5 ? 'dark' : 'light';
    if (th === 'track') th = gl.scroll.bgTrack > 1.3 ? 'light' : 'dark';
    if (document.body.dataset.theme !== th) document.body.dataset.theme = th;
  });
}
