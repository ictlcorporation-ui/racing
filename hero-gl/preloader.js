// Preloader „Mască MM” (varianta 3 aleasă de client; demo: tools/preloader-demo.html).
// Monograma MM e un traseu pe care merge punctul „69” odată cu încărcarea; la final literele devin fereastra spre site
// și camera intră prin tija din mijloc până se deschide tot ecranul.
// monograma (aceeași geometrie ca semnul din meniu): primul M cu tija, apoi al doilea M pornind din vârful tijei
const MM_D = 'M12 50V16L24 36L36 16V50M36 16L48 36L60 16V50';
const MM_A = 'M12 50V16L24 36L36 16V50', MM_B = 'M36 16L48 36L60 16V50';
// drumul punctului „69”: continuu (coboară pe tijă și urcă înapoi), ca să nu sară; roșul urmează exact punctul
const CAR_D = 'M12 50V16L24 36L36 16V50V16L48 36L60 16V50';
const MM_T = 'translate(7 0) skewX(-12)';
// ritmul: pe telefon mai lent (cerut de client) — durata minimă a traseului, cât stă monograma plină, intrarea prin litere
const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;
const T = TOUCH ? { min: 3.0, hold: 1.1, zoom: 1.8 } : { min: 1.6, hold: 0.8, zoom: 1.5 };
const MIN_TIME = T.min; // s — și pe conexiuni rapide traseul are timp să se vadă

export function createPreloader() {
  const W = 1600, H = 1000, cx = W / 2, cy = H / 2 - 20;
  const narrow = innerWidth / innerHeight < 0.75, S0 = narrow ? 5.1 : 6.2;
  // curbe de nivel (ca fundalul site-ului), generate
  const topo = Array.from({ length: 14 }, (_, k) => {
    const r0 = 90 + k * 55, pts = [];
    for (let a = 0; a <= 64; a++) { const t = a / 64 * Math.PI * 2; const r = r0 * (1 + 0.18 * Math.sin(3 * t + k * 0.7) + 0.08 * Math.sin(5 * t - k)); pts.push([cx + Math.cos(t) * r * 1.35, cy + Math.sin(t) * r]); }
    return `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z"/>`;
  }).join('');
  const G = (id) => `<g id="${id}" transform="translate(${cx} ${cy}) scale(${S0}) translate(-36 -33)">`;
  const root = document.createElement('div');
  root.className = 'pl'; root.setAttribute('aria-label', 'Se încarcă'); root.setAttribute('role', 'progressbar');
  root.innerHTML = `<svg class="pl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><mask id="plMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>
      ${G('plMaskG')}<path d="${MM_D}" transform="${MM_T}" fill="none" stroke="#000" stroke-width="6.5" stroke-linejoin="miter" opacity="0"/></g></mask></defs>
    <g mask="url(#plMask)"><rect width="${W}" height="${H}" fill="#111112"/><g class="pl-topo">${topo}</g>
      ${G('plVis')}<path class="pl-route-bg" d="${MM_D}" transform="${MM_T}"/><path class="pl-route pl-a" d="${MM_A}" transform="${MM_T}"/><path class="pl-route pl-b" d="${MM_B}" transform="${MM_T}"/><path class="pl-car-path" d="${CAR_D}" fill="none" stroke="none"/>
        <g class="pl-car"><circle r="2.1"/><g class="pl-chip" transform="translate(3 -9)"><rect width="10" height="6.6" rx="1.2"/><text x="5" y="5.2" text-anchor="middle">69</text></g></g></g></g>
  </svg><div class="pl-foot"><span>Mihai Manole 2026</span><b class="pl-pct">0%</b></div>`;
  document.body.appendChild(root);
  const boot = document.getElementById('plBoot'); if (boot) boot.remove(); // coperta statică din HTML (până pornește scriptul)

  const ra = root.querySelector('.pl-a'), rb = root.querySelector('.pl-b'), geo = root.querySelector('.pl-route-bg'), car = root.querySelector('.pl-car');
  const carPath = root.querySelector('.pl-car-path'), route = [ra, rb];
  const pct = root.querySelector('.pl-pct'), sk = Math.tan(-12 * Math.PI / 180);
  const LA = ra.getTotalLength(), LB = rb.getTotalLength(), L = carPath.getTotalLength(), LS = L - LA - LB; // LS = urcarea înapoi pe tijă
  ra.style.strokeDasharray = `${LA} ${LA}`; rb.style.strokeDasharray = `${LB} ${LB}`; // lungimile reale
  const topoTw = gsap.to(root.querySelector('.pl-topo'), { rotation: 8, svgOrigin: `${cx} ${cy}`, duration: 14, ease: 'none' });
  const st = { target: 0, shown: 0 };
  const draw = () => {
    const p = st.shown, d = L * p;
    ra.style.strokeDashoffset = LA - Math.min(d, LA); rb.style.strokeDashoffset = LB - Math.max(0, Math.min(LB, d - LA - LS));
    const pt = carPath.getPointAtLength(d); car.setAttribute('transform', `translate(${pt.x + sk * pt.y + 7} ${pt.y})`);
    pct.textContent = Math.round(p * 100) + '%'; root.setAttribute('aria-valuenow', Math.round(p * 100));
  };
  // afișajul urmărește progresul real, dar nu mai repede de MIN_TIME pentru tot traseul
  const tick = (t, dtMs) => {
    const dt = Math.min(dtMs / 1000, 0.05);
    st.shown = Math.min(st.target, st.shown + dt / MIN_TIME, st.shown + (st.target - st.shown) * Math.min(1, dt * 6) + dt * 0.08);
    draw();
  };
  gsap.ticker.add(tick); draw();

  return {
    set(p) { st.target = Math.max(st.target, Math.min(1, p)); },
    error(msg) { pct.textContent = msg; },
    // onOpen: chemat când literele devin fereastra (site-ul trebuie să fie deja desenat în spate)
    finish(onOpen) {
      st.target = 1;
      return new Promise((resolve) => {
        const wait = () => {
          if (st.shown < 0.999) return;
          gsap.ticker.remove(wait); gsap.ticker.remove(tick); st.shown = 1; draw();
          const mg = root.querySelector('#plMaskG'), vis = root.querySelector('#plVis'), mp = mg.querySelector('path');
          const z = { k: S0 };
          const set = () => { const tr = `translate(${cx} ${cy}) scale(${z.k}) translate(-36 -33)`; mg.setAttribute('transform', tr); vis.setAttribute('transform', tr); };
          gsap.timeline({ onComplete: () => { topoTw.kill(); root.remove(); resolve(); } })
            // monograma stă plină (roșie, cu „69” la capăt) o clipă, abia apoi se deschide site-ul
            .to(car, { opacity: 0, duration: 0.3 }, T.hold - 0.3)
            .add(() => { mp.setAttribute('opacity', 1); onOpen && onOpen(); }, T.hold)
            .to([...route, geo], { opacity: 0, duration: 0.25 }, T.hold)
            .to(root.querySelector('.pl-foot'), { opacity: 0, duration: 0.3 }, T.hold)
            .to(z, { k: S0 * 70, duration: T.zoom, ease: 'expo.in', onUpdate: set }, T.hold + 0.45)
            .fromTo('.gl-wrap', { scale: 1.22 }, { scale: 1, duration: 2.1, ease: 'expo.out', clearProps: 'transform' }, T.hold + 0.45 + T.zoom * 0.7)
            .set(root, { pointerEvents: 'none' }, T.hold + 0.45 + T.zoom * 0.95);
        };
        gsap.ticker.add(wait);
      });
    },
  };
}
