/* zona din stânga a hero-ului: titlul „Fiecare secundă contează.” și cardul (ultimul rezultat + fișa echipajului),
   combinația aleasă de client din 3 variante. Nimic de actualizat de mână: rezultatul, cel mai bun loc și „Urmează”
   (dacă în calendar există o etapă viitoare) se calculează din rândurile secțiunii „Etapele” (li.cal-row, data-end = ultima zi).
   Rulează după i18n.js (textele din calendar sunt deja în limba aleasă) și înainte de app.js (intro-ul animă .ln/.in și .hx). */
(() => {
  const t = window.I18N ? I18N.t : (ro) => ro;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const title = $('#heroTitle'), card = $('#heroCard');
  if (!title || !card) return;

  /* ---------- sezonul, din calendar (live.js îl reface din eWRC și cheamă __heroLeft.refresh) ---------- */
  function season() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rounds = [...document.querySelectorAll('.cal .cal-row')].map((li) => {
      const txt = (s) => (li.querySelector(s)?.textContent || '').trim();
      const end = li.dataset.end ? new Date(li.dataset.end + 'T23:59:59') : null;
      const res = txt('.res'), place = parseInt(res.replace(/\D+/g, ''), 10);
      const off = li.classList.contains('off');
      return { name: txt('.name'), date: txt('.date'), res, place: Number.isFinite(place) ? place : null, off,
        state: off ? 'off' : end && end < today ? 'done' : 'next' };
    });
    const done = rounds.filter((x) => x.state === 'done');
    const next = rounds.find((x) => x.state === 'next');
    const last = done[done.length - 1], r = next || last;
    const best = done.filter((x) => x.place).sort((a, b) => a.place - b.place)[0];
    return {
      r, next,
      lbl: next ? t('Urmează', 'Next round') : t('Ultimul rezultat', 'Latest result'),
      big: r ? (next ? r.name : r.place ? 'P' + r.place : r.res) : '—',
      sub: r ? (next ? r.date : r.name) : '',
      full: r ? (next ? r.date : r.name + ' · ' + r.date) : '',
      best: best ? t(`Locul ${best.place} · ${best.name}`, `P${best.place} · ${best.name}`) : '—',
      bestBig: best ? t('Locul ', 'P') + best.place : '—',
      bestSub: best ? best.name : '',
    };
  }
  const S = season();

  const L = (s, cls = '') => `<span class="ln ${cls}"><span class="in">${s}</span></span>`;
  const EB = (...lines) => `<div class="eyebrow">${lines.map((l) => L(l)).join('')}</div>`;
  const OUTLINE = card.querySelector('.outline')?.outerHTML || '';
  const HELMET = `<div class="rule" id="rule1"></div>
    <div class="helmet-row" data-gl-helmet="hover" id="helmetRow">
      <svg viewBox="0 0 40 30" fill="none"><path d="M4 22c0-10 7-18 16-18s16 8 16 18v3c0 2-1 3-3 3H7c-2 0-3-1-3-3v-3Z" stroke="currentColor" stroke-width="1.6"/><path d="M9 20c2-5 6-8 11-8s9 3 11 8" stroke="currentColor" stroke-width="1.6"/><path d="M24 24h9" stroke="#D81F26" stroke-width="2.2" stroke-linecap="round"/></svg>
      ${EB(t('Casca · Stilo WRC', 'Helmet · Stilo WRC'), touch ? t('atinge s-o vezi', 'tap to reveal') : t('treci cu mouse-ul', 'hover to reveal'))}
    </div>`;

  // titlul: replica (varianta 2); cardul: ultimul rezultat (sau etapa următoare, când există) + fișa echipajului (varianta 3)
  title.className = 'hero-title hl-title';
  title.innerHTML = `${L(t('Fiecare', 'Every'))}${L(t('secundă', 'second'))}${L(t('contează.', 'counts.'), 's')}`;
  const row = (k, v, live = '') => `<div class="hl-row hx"><dt>${k}</dt><dd${live ? ` data-live="${live}"` : ''}>${v}</dd></div>`;
  card.innerHTML = `${OUTLINE}
    <div class="eyebrow">${L(`<span class="hl" data-live="lbl">${S.lbl}</span>`)}</div>
    <a href="#calendar" class="hl-last hx"><p class="hl-big" data-live="big">${S.big}</p><p class="hl-sub" data-live="full">${S.full}</p></a>
    <dl class="hl-sheet">
      ${row(t('Copilot', 'Co-driver'), 'Florin Dorca')}
      ${row(t('Mașina', 'Car'), 'Škoda Fabia Rally2 Evo')}
      ${row(t('Număr', 'Number'), '69')}
      ${row(t('Pe Fabia', 'In the Fabia'), t('din 2021', 'since 2021'))}
      ${row(t('Cel mai bun 2026', 'Best of 2026'), S.best, 'best')}
    </dl>
    ${HELMET}`;

  /* ---------- telefon (≤ 767 px): în locul cardului mare (acoperea fața), o bandă ca tabela de cronometraj care defilează
     (rezultat, cel mai bun loc, copilot, mașina); atingerea ei deschide fișa completă de jos. Plus un buton rotund cu casca. ---------- */
  const hero = card.closest('.hero');
  // [etichetă, valoare, detaliu] + cheile data-live ale fiecăruia (ca să poată fi actualizate când vin datele live)
  const facts = [
    [S.lbl, S.big, S.sub, ['lbl', 'big', 'sub']],
    [t('Cel mai bun 2026', 'Best of 2026'), S.bestBig, S.bestSub, ['', 'bestBig', 'bestSub']],
    [t('Copilot', 'Co-driver'), 'Florin Dorca', '', []],
    [t('Mașina', 'Car'), 'Škoda Fabia', 'Rally2 Evo · #69', []],
  ];
  const lv = (k) => (k ? ` data-live="${k}"` : '');
  const ICON_HELMET = '<svg viewBox="0 0 40 30" fill="none" aria-hidden="true"><path d="M4 22c0-10 7-18 16-18s16 8 16 18v3c0 2-1 3-3 3H7c-2 0-3-1-3-3v-3Z" stroke="currentColor" stroke-width="2"/><path d="M9 20c2-5 6-8 11-8s9 3 11 8" stroke="currentColor" stroke-width="2"/><path d="M24 24h9" stroke="#D81F26" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const mob = document.createElement('div'); mob.className = 'hm'; mob.id = 'heroMob';
  const helmBtn = `<button class="hm-helmet" aria-label="${t('Arată casca', 'Show the helmet')}" aria-pressed="false">${ICON_HELMET}</button>`;
  const item = ([k, v, sub, [a, b, c]]) => `<span class="it"><span class="lbl"${lv(a)}>${k}</span><b${lv(b)}>${v}</b><span class="sub"${lv(c)}>${sub}</span></span>`;
  const seq = facts.map(item).join('<span class="sep">/</span>') + '<span class="sep">/</span>';
  mob.innerHTML = `<button class="hm-ticker" aria-haspopup="dialog" aria-label="${t('Fișa echipajului', 'Crew sheet')}"><span class="flag"></span><span class="hm-track"><span class="run">${seq}${seq}</span></span></button>${helmBtn}`;
  hero.appendChild(mob);

  // fereastra cu fișa completă
  const pop = document.createElement('div'); pop.className = 'hm-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true');
  pop.setAttribute('aria-label', t('Fișa echipajului', 'Crew sheet')); pop.inert = true; pop.setAttribute('data-lenis-prevent', '');
  pop.innerHTML = `<div class="hm-bd" data-close></div><div class="hm-sheet"><div class="hm-grab"></div>
    <div class="hm-head"><span class="eyebrow"><span class="hl on" data-live="lbl">${S.lbl}</span></span><button class="hm-x" data-close aria-label="${t('Închide', 'Close')}"><i></i><i></i></button></div>
    <a href="#calendar" class="hm-last" data-close><b data-live="big">${S.big}</b><span data-live="full">${S.full}</span></a>
    <dl class="hm-rows">
      <div><dt>${t('Copilot', 'Co-driver')}</dt><dd>Florin Dorca</dd></div>
      <div><dt>${t('Mașina', 'Car')}</dt><dd>Škoda Fabia Rally2 Evo</dd></div>
      <div><dt>${t('Număr', 'Number')}</dt><dd>69</dd></div>
      <div><dt>${t('Pe Fabia', 'In the Fabia')}</dt><dd>${t('din 2021', 'since 2021')}</dd></div>
      <div><dt>${t('Cel mai bun 2026', 'Best of 2026')}</dt><dd data-live="best">${S.best}</dd></div>
    </dl>
    <a class="btn hm-cal" href="#calendar" data-close>${t('Toate etapele', 'All rounds')}</a></div>`;
  document.body.appendChild(pop);
  const setPop = (v) => {
    pop.toggleAttribute('data-open', v); pop.inert = !v; document.documentElement.toggleAttribute('data-menu', v);
    v ? window.__lenis?.stop() : window.__lenis?.start();
  };
  mob.querySelector('.hm-ticker').addEventListener('click', () => setPop(true));
  pop.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) setPop(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop.hasAttribute('data-open')) setPop(false); });

  // butonul cu casca: același comutator ca rândul „Casca” din card (app.js: pe touch, click = pornit / oprit)
  const hb = mob.querySelector('.hm-helmet');
  hb.addEventListener('click', () => { document.getElementById('helmetRow')?.click(); hb.setAttribute('aria-pressed', String(hb.getAttribute('aria-pressed') !== 'true')); });

  // apare odată cu restul hero-ului (intro-ul din app.js animă #navRight)
  const nr = document.getElementById('navRight');
  const wait = () => { if (nr && +getComputedStyle(nr).opacity > 0.05) mob.classList.add('in'); else requestAnimationFrame(wait); };
  requestAnimationFrame(wait);

  // datele live (live.js, din eWRC): recalculează și înlocuiește doar textele marcate data-live
  window.__heroLeft = { refresh() { const n = season(); document.querySelectorAll('[data-live]').forEach((el) => { const v = n[el.dataset.live]; if (v !== undefined && el.textContent !== v) el.textContent = v; }); } };

})();
