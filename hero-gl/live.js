/* date live: /api/season (funcția de pe Vercel care citește eWRC-results, vezi api/_ewrc.mjs) → lista „Etapele” și cardul din hero.
   Rândurile din HTML sunt varianta de rezervă (dacă eWRC nu răspunde, rămân ele). Rândurile existente se actualizează pe loc
   (după data-ewrc = id-ul raliului pe eWRC), ca să-și păstreze imaginea la hover și nota scrisă de noi; raliurile noi se adaugă,
   iar cele la care Mihai nu apare pe eWRC se scot. Rulează după i18n.js și hero-left.js. */
(() => {
  const t = window.I18N ? I18N.t : (ro) => ro, lang = window.I18N ? I18N.lang : 'ro';
  const list = document.querySelector('.cal');
  if (!list) return;
  const MONTHS = {
    ro: ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  }[lang];
  const range = (a, b) => {
    const [, m1, d1] = a.split('-').map(Number), [, m2, d2] = b.split('-').map(Number);
    return m1 === m2 ? `${d1}–${d2} ${MONTHS[m1 - 1]}` : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`;
  };
  const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const res = (r) => ({
    done: t(`Locul ${r.place}`, `${ord(r.place)} place`),
    retired: t('Abandon', 'Retired'),
    cancelled: t('Anulat', 'Cancelled'),
    upcoming: t('Urmează', 'Upcoming'),
  }[r.status]);

  fetch('/api/season', { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => {
      if (!data || !Array.isArray(data.rounds) || !data.rounds.length) return;
      const byId = new Map([...list.querySelectorAll('.cal-row[data-ewrc]')].map((li) => [li.dataset.ewrc, li]));
      const best = data.rounds.filter((r) => r.status === 'done').sort((a, b) => a.place - b.place)[0];
      const keep = new Set();
      data.rounds.forEach((r, i) => {
        let li = byId.get(String(r.id));
        if (!li) {
          li = document.createElement('li'); li.className = 'cal-row'; li.dataset.ewrc = r.id;
          li.innerHTML = `<span class="n"></span><span class="name">${r.name}</span><span class="date"></span><span class="res"></span><span class="note"></span>`;
        }
        keep.add(li);
        li.dataset.end = r.end;
        li.classList.toggle('off', r.status === 'cancelled');
        li.querySelector('.n').textContent = String(i + 1).padStart(2, '0');
        li.querySelector('.date').textContent = range(r.start, r.end);
        const rs = li.querySelector('.res'); rs.textContent = res(r); rs.classList.toggle('hi', r === best);
        const note = li.querySelector('.note');
        // nota scrisă de noi rămâne; altfel una automată pentru abandon
        if (!note.textContent.trim() && r.status === 'retired' && r.stage) note.textContent = t(`Abandon în PS${r.stage}`, `Retired on SS${r.stage}`);
        list.appendChild(li); // ordinea cronologică (mutarea păstrează evenimentele de hover)
      });
      byId.forEach((li) => { if (!keep.has(li)) li.remove(); });
      const src = document.querySelector('.cal-src');
      if (src) {
        const d = new Date(data.updated);
        src.textContent = t(`Rezultate la general, actualizate automat de pe eWRC-results · ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
          `Overall results, updated automatically from eWRC-results · ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
      }
      window.__heroLeft?.refresh();
      window.ScrollTrigger?.refresh();
    })
    .catch(() => { /* rămân rândurile din HTML */ });
})();
