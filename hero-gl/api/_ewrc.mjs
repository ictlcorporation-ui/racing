/* rezultatele lui Mihai Manole din sezonul curent, citite live de pe eWRC-results (aceeași sursă ca secțiunea „Etapele”).
   1. lista raliurilor din România în sezon (/season/<an>/?nat=29)
   2. pentru fiecare: pagina de rezultate finale → nume, date, stare (anulat), locul lui Mihai sau abandonul (cu proba)
   3. raliurile viitoare în care Mihai apare pe lista de înscriși → „urmează”
   Se păstrează doar raliurile la care a participat / e înscris, plus cele anulate. Folosit de api/season.mjs (Vercel)
   și de serve.py (local, prin tools/season.mjs). */
const BASE = 'https://www.ewrc-results.com';
const NAT = 29; // România
const DRIVER = 'Manole Mihai';
// anteturi ca ale unui browser obișnuit (Cloudflare-ul eWRC respinge cu 403 cererile care arată a robot)
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9,ro;q=0.8',
  'cache-control': 'no-cache',
  'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'none', 'upgrade-insecure-requests': '1',
};

const get = async (path) => {
  const r = await fetch(BASE + path, { headers: HEADERS });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.text();
};
const text = (html) => html.replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, '|').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/\|+/g, '|');
const ldEvent = (html) => {
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try { const d = JSON.parse(m[1]); if (d && d.startDate) return d; } catch (e) { /* alt bloc */ }
  }
  return null;
};
// „Raliul Clujului Star Lubricants 2026” → „Raliul Clujului”; altfel doar fără an
const clean = (name) => { const n = name.replace(/\s*\b(19|20)\d{2}\b\s*/g, ' ').trim(); const m = n.match(/^Raliul\s+\S+/); return m ? m[0] : n; };

async function event(id, slug, now) {
  const html = await get(`/event/${id}-${slug}/final-results`);
  const ld = ldEvent(html) || {};
  const round = { id: +id, name: clean(ld.name || slug), fullName: ld.name || slug, start: (ld.startDate || '').slice(0, 10), end: (ld.endDate || '').slice(0, 10) };
  if (/Cancelled/i.test(ld.eventStatus || '')) return { ...round, status: 'cancelled' };
  // fiecare apariție a numelui: rândul din clasament („8. #69 Manole Mihai”) sau din abandonuri („SS 5 #69 Manole Mihai”)
  let pos = null, stage = null;
  for (let i = html.indexOf(DRIVER); i >= 0 && pos === null; i = html.indexOf(DRIVER, i + 1)) {
    const t = text(html.slice(Math.max(0, i - 3000), i + DRIVER.length));
    const p = t.match(/\|(\d+)\|?\.\|#\|\d+\|Manole Mihai$/); if (p) pos = +p[1];
    const s = t.match(/\|SS\|(\d+)\|#\|\d+\|Manole Mihai$/); if (s && stage === null) stage = +s[1];
  }
  if (pos !== null) return { ...round, status: 'done', place: pos };
  if (stage !== null) return { ...round, status: 'retired', stage };
  // fără rezultat: dacă raliul e în viitor și Mihai e înscris → urmează
  if (round.end && new Date(round.end + 'T23:59:59Z') >= now) {
    const entries = await get(`/event/${id}-${slug}/entries`).catch(() => '');
    if (entries.includes(DRIVER)) return { ...round, status: 'upcoming' };
  }
  return null; // n-a participat
}

export async function getSeason(year = new Date().getFullYear()) {
  const now = new Date();
  const list = await get(`/season/${year}/?nat=${NAT}`);
  const events = [...new Map([...list.matchAll(/href="\/event\/(\d+)-([^/"]+)\/final-results"/g)].map((m) => [m[1], m[2]])).entries()];
  const rounds = (await Promise.all(events.map(([id, slug]) => event(id, slug, now).catch((e) => ({ error: String(e), id: +id })))))
    .filter((r) => r && !r.error)
    .sort((a, b) => a.start.localeCompare(b.start));
  return { year, source: 'eWRC-results', updated: now.toISOString(), rounds };
}
