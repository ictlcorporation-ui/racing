/* Mihai Manole — scroll film engine: real photos + cinemagraph loops + designed transitions */
(() => {
  const Q = new URLSearchParams(location.search), JUMP = Q.get('jump');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d', { alpha:false });
  const film = document.getElementById('film'), flash = document.getElementById('flash');
  const ro = document.getElementById('ro'), robar = document.getElementById('robar');
  const bars = document.querySelectorAll('#film .bars i');
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v)), lerp = (a,b,t) => a+(b-a)*t;
  const eio = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2, eout = t => 1-Math.pow(1-t,3), ein = t => t*t*t;

  /* ---------- sources ---------- */
  const IMG = {}, VID = {};
  const STILL = { portrait:'assets/img/s-portrait.jpg', helmet:'assets/img/s-helmet.jpg', cockpit:'assets/img/s-cockpit.jpg', dust:'assets/img/s-dust.jpg', wet:'assets/img/s-wet.jpg', podium:'assets/img/s-podium.jpg' };
  const LOOP = { portrait:'assets/cine/portrait.mp4', cockpit:'assets/cine/cockpit.mp4', dust:'assets/cine/dust.mp4', wet:'assets/cine/wet.mp4', podium:'assets/cine/podium.mp4' };
  const FOC = { portrait:[.72,.40], helmet:[.72,.40], cockpit:[.42,.45], dust:[.55,.55], wet:[.55,.55], podium:[.5,.28] };
  const HF = 61; const hb = new Map(), hblobs = [], decoding = new Set();

  /* scenes on the 0..1 timeline */
  const SC = [
    { a:0,   b:.15, key:'portrait', cam:[1.00,1.04, 0,0, 0,0], label:'Start' },
    { a:.15, b:.33, key:'helmet',   cam:[1.04,1.04, 0,0, 0,0], label:'Casca', seq:true },
    { a:.33, b:.50, key:'cockpit',  cam:[1.00,1.10, 0,-.02, 0,0], label:'La volan' },
    { a:.50, b:.67, key:'dust',     cam:[1.12,1.00, .03,-.02, 0,0], label:'PS1 · pietriș' },
    { a:.67, b:.84, key:'wet',      cam:[1.00,1.10, -.02,.02, 0,0], label:'PS2 · asfalt ud' },
    { a:.84, b:1.0, key:'podium',   cam:[1.08,1.00, 0,0, .02,0], label:'Podium' } ];
  /* transitions: [progress start, length, type] applied at scene boundaries */
  const TR = { 2:'visor', 3:'whip', 4:'wipe', 5:'shutter' };
  const TLEN = .045;

  let progress = 0, lastP = -1, W = 0, H = 0, alive = true;
  function resize(){ W = innerWidth; H = innerHeight; cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR); cv.style.width = W+'px'; cv.style.height = H+'px'; lastP = -1; render(); }
  addEventListener('resize', resize);
  const portraitScreen = () => W < H;

  function srcOf(key){ const v = VID[key]; if (v && v.readyState >= 2 && !RM) return v; return IMG[key]; }
  function dims(b){ return b.videoWidth ? [b.videoWidth, b.videoHeight] : [b.width, b.height]; }
  function draw(key, z, px, py, alpha){
    const b = srcOf(key); if (!b) return; const [bw, bh] = dims(b);
    const cw = cv.width, ch = cv.height, s = Math.max(cw/bw, ch/bh)*z, w = bw*s, h = bh*s;
    const f = FOC[key] || [.5,.5]; const fx = portraitScreen() ? f[0] : lerp(.5, f[0], .3), fy = portraitScreen() ? f[1] : lerp(.5, f[1], .4);
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(b, (cw-w)*fx + (px||0)*cw, (ch-h)*fy + (py||0)*ch, w, h); ctx.globalAlpha = 1;
  }
  function drawFrameBitmap(b, z, px, py){ const cw = cv.width, ch = cv.height, s = Math.max(cw/b.width, ch/b.height)*z, w = b.width*s, h = b.height*s; const f = FOC.helmet; const fx = portraitScreen()?f[0]:lerp(.5,f[0],.3), fy = portraitScreen()?f[1]:lerp(.5,f[1],.4); ctx.drawImage(b, (cw-w)*fx + (px||0)*cw, (ch-h)*fy + (py||0)*ch, w, h); }

  /* helmet sequence with compressed middle */
  const Wt = []; for (let i=0;i<HF;i++) Wt.push(i>=20 && i<=47 ? .2 : 1); const CUM = []; let acc = 0; for (const w of Wt){ acc += w; CUM.push(acc); } for (let i=0;i<HF;i++) CUM[i] /= acc;
  function hFrame(t){ let lo=0, hi=HF-1; while (lo<hi){ const m=(lo+hi)>>1; if (CUM[m] < t) lo=m+1; else hi=m; } return lo; }
  function ensureH(c){ for (let i=Math.max(0,c-6); i<=Math.min(HF-1,c+6); i++){ if (hb.has(i)||decoding.has(i)||!hblobs[i]||decoding.size>4) continue; decoding.add(i); createImageBitmap(hblobs[i]).then(b=>{ decoding.delete(i); hb.set(i,b); lastP=-1; }).catch(()=>decoding.delete(i)); }
    for (const k of Array.from(hb.keys())) if (k<c-10||k>c+10){ hb.get(k).close(); hb.delete(k); } }
  function nearestH(i){ for (let d=1; d<HF; d++){ if (hb.has(i-d)) return hb.get(i-d); if (hb.has(i+d)) return hb.get(i+d); } return null; }

  /* ---------- scene draw with camera ---------- */
  function drawScene(si, t, extraZ, alpha){
    const s = SC[si]; const z = lerp(s.cam[0], s.cam[1], t) + (extraZ||0), px = lerp(s.cam[2], s.cam[3], t), py = lerp(s.cam[4], s.cam[5], t);
    if (s.seq){ const f = hFrame(t); ensureH(f); const b = hb.get(f) || nearestH(f); if (b){ if (alpha !== undefined) ctx.globalAlpha = alpha; drawFrameBitmap(b, z, px, py); ctx.globalAlpha = 1; } else draw('portrait', z, px, py, alpha); }
    else draw(s.key, z, px, py, alpha);
  }

  /* ---------- transitions ---------- */
  function streak(fn, amount, dir){ // motion-streak: several offset copies
    const n = 5; for (let i=0;i<n;i++){ ctx.globalAlpha = i ? .18 : 1; ctx.save(); ctx.translate(dir*amount*cv.width*.06*i, 0); fn(); ctx.restore(); } ctx.globalAlpha = 1; }
  function transition(type, from, to, t){
    const cw = cv.width, ch = cv.height;
    if (type === 'visor'){ // zoom into the visor, circle opens onto the next scene
      const zt = eio(t); drawScene(from, 1, zt*1.6);
      const r = eout(t) * Math.hypot(cw, ch)*.62; const f = FOC.helmet; const cx = cw*(portraitScreen()?f[0]:lerp(.5,f[0],.3)) , cy = ch*.36;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Math.max(1,r), 0, Math.PI*2); ctx.clip(); drawScene(to, 0, (1-eout(t))*.25); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Math.max(1,r), 0, Math.PI*2); ctx.lineWidth = 6*DPR; ctx.strokeStyle = 'rgba(237,48,41,'+(1-t)+')'; ctx.stroke(); ctx.restore();
    } else if (type === 'whip'){ // whip pan to the right
      const k = eio(t); const off = k*1.0;
      streak(() => drawScene(from, 1, 0), Math.sin(k*Math.PI), -1); ctx.save(); ctx.translate(-off*cw, 0); drawScene(from, 1, 0); ctx.restore();
      ctx.save(); ctx.translate((1-off)*cw, 0); streak(() => drawScene(to, 0, 0), Math.sin(k*Math.PI), -1); ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,'+(Math.sin(k*Math.PI)*.35)+')'; ctx.fillRect(0,0,cw,ch);
    } else if (type === 'wipe'){ // diagonal livery wipe with red edge
      const k = eio(t); drawScene(from, 1, 0);
      const x = (k*1.4 - .2)*cw; const sl = ch*.55;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(cw, 0); ctx.lineTo(cw, ch); ctx.lineTo(x - sl, ch); ctx.closePath(); ctx.clip(); drawScene(to, 0, (1-k)*.08); ctx.restore();
      const g = ctx.createLinearGradient(x - sl*.5, 0, x - sl*.5 + 40*DPR, 0); g.addColorStop(0,'rgba(237,48,41,0)'); g.addColorStop(.5,'rgba(237,48,41,.95)'); g.addColorStop(1,'rgba(237,48,41,0)');
      ctx.save(); ctx.beginPath(); ctx.moveTo(x-30*DPR, 0); ctx.lineTo(x+30*DPR, 0); ctx.lineTo(x - sl + 30*DPR, ch); ctx.lineTo(x - sl - 30*DPR, ch); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    } else if (type === 'shutter'){ // three bands slide out at different speeds
      drawScene(to, 0, (1-eout(t))*.06);
      const n = 3; for (let i=0;i<n;i++){ const k = clamp((t - i*.12)/(1 - i*.12), 0, 1); const off = ein(k) * cw * (i%2? 1 : -1);
        ctx.save(); ctx.beginPath(); ctx.rect(0, i*ch/n, cw, ch/n+1); ctx.clip(); ctx.translate(off, 0); drawScene(from, 1, 0); ctx.restore(); }
    }
  }

  /* ---------- overlays ---------- */
  const ovs = Array.from(document.querySelectorAll('.ov')).map(el => ({ el, k:+el.dataset.scene }));
  function setOverlays(si, t, inTr){
    for (const o of ovs){ let a = 0; if (o.k === si && !inTr){ a = o.k===0 ? clamp(1 - t/.6, 0, 1) : (o.k===SC.length-1 ? clamp((t-.06)/.22,0,1) : clamp(Math.min((t-.08)/.16, (.9-t)/.16), 0, 1)); }
      o.el.style.opacity = a; if (o.k) o.el.style.transform = `translateY(${(1-a)*20}px)`; }
  }
  let lastScene = -1;
  function render(){
    if (!IMG.portrait) return; ctx.fillStyle = '#000'; ctx.fillRect(0,0,cv.width,cv.height);
    let si = SC.findIndex(s => progress >= s.a && progress < s.b); if (si < 0) si = SC.length-1; const s = SC[si]; const t = clamp((progress - s.a)/(s.b - s.a), 0, 1);
    const tr = TR[si]; const d = progress - s.a; let inTr = false;
    if (tr && d < TLEN){ inTr = true; transition(tr, si-1, si, d/TLEN); }
    else if (si === 1 && d < .01){ drawScene(1, 0); }
    else { const punch = (si>0 && !tr) ? (1 - eout(clamp(t/.06,0,1)))*.05 : 0; drawScene(si, t, punch); }
    if (si !== lastScene){ if (lastScene >= 0 && JUMP === null && !tr){ flash.style.opacity = .5; setTimeout(() => flash.style.opacity = 0, 40); } lastScene = si; for (const k in VID){ const v = VID[k]; if (k === s.key){ v.play && v.play().catch(()=>{}); } else v.pause && v.pause(); } }
    setOverlays(si, t, inTr);
    if (ro.textContent !== s.label) ro.textContent = s.label; robar.style.width = (progress*100).toFixed(1)+'%';
    const end = clamp((progress-.94)/.06, 0, 1); bars.forEach((b,i) => b.style.transform = `translateY(${(i? 1:-1)*end*100}%)`);
  }
  function tick(){ try{ const r = film.getBoundingClientRect(); progress = clamp(-r.top/(r.height-innerHeight), 0, 1); const s = SC.find(x => progress >= x.a && progress < x.b) || SC[SC.length-1]; const v = VID[s.key]; if (progress !== lastP || (v && !v.paused)){ lastP = progress; render(); } }catch(e){ console.warn(e); } requestAnimationFrame(tick); }

  /* ---------- loading ---------- */
  const ldbar = document.getElementById('ldbar'), ldnum = document.getElementById('ldnum'); let done = 0; const total = Object.keys(STILL).length + HF;
  const prog = () => { done++; const p = Math.round(done/total*100); ldbar.style.width = p+'%'; ldnum.textContent = p+'%'; };
  function loadLoops(){ if (RM) return; for (const k in LOOP){ const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin='anonymous'; v.src = LOOP[k];
      v.addEventListener('loadeddata', () => { VID[k] = v; lastP = -1; }); v.addEventListener('error', () => {}); v.load(); } }
  window.__film = { ready: false };
  (async () => {
    await Promise.all(Object.entries(STILL).map(([k,src]) => fetch(src).then(r=>r.blob()).then(b=>createImageBitmap(b)).then(b=>{ IMG[k]=b; prog(); })));
    let n = 0; const worker = async () => { while (n < HF){ const i = n++; try{ hblobs[i] = await fetch(`frames/h_${String(i+1).padStart(3,'0')}.jpg`).then(r=>r.blob()); }catch(e){} prog(); } };
    await Promise.all(Array.from({length:8}, worker)); ensureH(0);
    if (document.fonts) await document.fonts.ready;
    resize(); requestAnimationFrame(tick); loadLoops();
    window.__film.ready = true; document.dispatchEvent(new CustomEvent('film:ready'));
  })().catch(e => { console.error(e); window.__film.ready = true; document.dispatchEvent(new CustomEvent('film:ready')); });
  window.__filmRender = () => { lastP = -1; render(); };
})();
