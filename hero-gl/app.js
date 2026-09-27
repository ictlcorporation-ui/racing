// Hero GL — replică a arhitecturii de pe landonorris.com:
// un singur canvas WebGL fix, portret 2.5D (plane cu displacement din hartă de adâncime),
// cască revelată prin simulare de fluid la cursor, camera legată de scroll (ScrollTrigger scrub), Lenis.
import * as THREE from 'three';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { RGBELoader } from './vendor/addons/loaders/RGBELoader.js';
// variantele de temă (a.html, b.html, c.html) își dau aici culorile fundalului 3D, modulul secțiunilor și intro-ul;
// fără window.SITE_THEME pagina e cea de bază (index.html + site.js), neschimbată
const THEME = window.SITE_THEME || {};
const siteModule = import(new URL(THEME.module || './site.js', document.baseURI).href);
import { createPreloader } from './preloader.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
THREE.ColorManagement.enabled = false; // shadere custom: lucrăm direct în sRGB, fără conversii

const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const $ = (s, r = document) => r.querySelector(s);

/* ---------------- Lenis + GSAP ticker ---------------- */
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
window.__lenis = lenis; // unelte de verificare

/* ---------------- utilitare ---------------- */
class Eased {
  constructor(x = 0, y = 0, k = 0.025) { this.target = new THREE.Vector2(x, y); this.value = new THREE.Vector2(x, y); this.k = k; }
  update(dt) { const a = 1 - Math.pow(1 - this.k, dt * 60); this.value.lerp(this.target, a); }
}
function makeNoiseTexture(size, cell) { // zgomot valoric neted (pentru margini de dissolve)
  const small = document.createElement('canvas'); small.width = small.height = cell;
  const sc = small.getContext('2d'); const id = sc.createImageData(cell, cell);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  sc.putImageData(id, 0, 0);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
  cx.drawImage(small, 0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function makeGrainTexture(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const cx = c.getContext('2d'); const id = cx.createImageData(size, size);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  cx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = t.magFilter = THREE.NearestFilter; return t;
}

/* ---------------- simulare de fluid — portată 1:1 de pe landonorris.com ----------------
   „Stable Fluids” doar pe viteză (BFECC, disipare 0.96, forța mouse-ului 50, rezoluție 10% din ecran, cursor 18 celule),
   pas fix la 60 Hz. Masca de reveal = 1 - mix(1, vel.x*0.5+0.5, |vel|), cu prag dur 0.1 (de aici marginile nete și „topite”). */
const LF = {
  vert: `attribute vec3 position;uniform vec2 px;varying vec2 uv;
    void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px;pos.xy*=n;gl_Position=vec4(pos,1.0);}`,
  full: `attribute vec3 position;varying vec2 uv;void main(){uv=0.5+position.xy*0.5;gl_Position=vec4(position,1.0);}`,
  advect: `precision highp float;uniform sampler2D velocity;uniform float dt,dissipation;uniform vec2 fboSize,px;varying vec2 uv;
    void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;
      vec2 spot_new=uv;vec2 vel_old=texture2D(velocity,uv).xy;vec2 spot_old=spot_new-vel_old*dt*ratio;
      vec2 vel_new1=texture2D(velocity,spot_old).xy;vec2 spot_new2=spot_old+vel_new1*dt*ratio;vec2 error=spot_new2-spot_new;
      vec2 spot_new3=spot_new-error/2.0;vec2 vel_2=texture2D(velocity,spot_new3).xy;vec2 spot_old2=spot_new3-vel_2*dt*ratio;
      vec2 nv=texture2D(velocity,spot_old2).xy*dissipation;
      if(!(abs(nv.x)<1e4)||!(abs(nv.y)<1e4))nv=vec2(0.0); // NaN/Inf (comparația cu NaN e falsă; GLSL ES 1 n-are isnan): un NaN ar rămâne pentru totdeauna
      gl_FragColor=vec4(clamp(nv,-50.0,50.0),0.0,0.0);}`,
  forceVert: `attribute vec3 position;attribute vec2 uv;uniform vec2 center,scale,px;varying vec2 vUv;
    void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`,
  force: `precision highp float;uniform vec2 force;varying vec2 vUv;
    void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0,1);}`,
  div: `precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;
    void main(){float x0=texture2D(velocity,uv-vec2(px.x,0)).x,x1=texture2D(velocity,uv+vec2(px.x,0)).x;
      float y0=texture2D(velocity,uv-vec2(0,px.y)).y,y1=texture2D(velocity,uv+vec2(0,px.y)).y;gl_FragColor=vec4((x1-x0+y1-y0)/2.0/dt);}`,
  poisson: `precision highp float;uniform sampler2D pressure,divergence;uniform float straightness;uniform vec2 px;varying vec2 uv;
    void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0)).r,p1=texture2D(pressure,uv-vec2(px.x*2.0,0)).r;
      float p2=texture2D(pressure,uv+vec2(0,px.y*2.0)).r,p3=texture2D(pressure,uv-vec2(0,px.y*2.0)).r;
      float np=(p0+p1+p2+p3)/(4.0+straightness)-texture2D(divergence,uv).r;if(!(abs(np)<1e6))np=0.0;gl_FragColor=vec4(np);}`,
  pressure: `precision highp float;uniform sampler2D pressure,velocity;uniform vec2 px;uniform float dt;varying vec2 uv;
    void main(){float p0=texture2D(pressure,uv+vec2(px.x,0)).r,p1=texture2D(pressure,uv-vec2(px.x,0)).r;
      float p2=texture2D(pressure,uv+vec2(0,px.y)).r,p3=texture2D(pressure,uv-vec2(0,px.y)).r;
      vec2 v=texture2D(velocity,uv).xy-vec2(p0-p1,p2-p3)*0.5*dt;if(!(abs(v.x)<1e4)||!(abs(v.y)<1e4))v=vec2(0.0);gl_FragColor=vec4(v,0.0,1.0);}`,
  // masca de reveal (r) și |vel| (g)
  // + discul de hover: cât timp cursorul stă pe față, casca rămâne vizibilă într-un cerc cu margine ondulată în jurul lui.
  // max(..., 0.3*|vel|): pe referință o mișcare spre dreapta aproape nu dezvăluie nimic; aici dezvăluie în orice direcție
  out: `precision highp float;uniform sampler2D velocity;uniform vec2 uHC;uniform float uHR,uAsp,uTime;varying vec2 uv;
    void main(){vec2 vel=texture2D(velocity,uv).xy;float len=length(vel);float r=mix(1.0,vel.x*0.5+0.5,len);
      float e=max(1.0-r,0.3*len);
      vec2 q=(uv-uHC)*vec2(uAsp,1.0);float d=length(q);float ang=atan(q.y,q.x);
      float R=uHR*(1.0+0.08*sin(ang*5.0+uTime*1.7)+0.05*sin(ang*3.0-uTime*1.3));
      float disc=1.0-smoothstep(R-0.003,R,d);
      gl_FragColor=vec4(max(e,disc),max(len,disc*0.5),0.0,1.0);}`,
};
// cursor: 18 pe referință; 11 = dâră mai subțire; disipare 0.96 pe referință, 0.972 = dâra se stinge mai lent (cerut de client)
// pe ecranele tactile (doar cursorul automat) pensula e mai lată (28, cerut de client); dâra subțire (11) e doar pentru mouse
const TOUCH_UI = matchMedia('(hover: none) and (pointer: coarse)').matches;
const LF_OPT = { poisson: 4, dissipation: 0.972, force: 50, resolution: 0.1, cursor: TOUCH_UI ? 28 : 11, straightness: 1, dt: 0.014 };
class Fluid {
  constructor(renderer, w, h) {
    this.renderer = renderer;
    this.fboSize = new THREE.Vector2(); this.px = new THREE.Vector2();
    const o = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    const rt = () => new THREE.WebGLRenderTarget(4, 4, o);
    this.f = { vel0: rt(), vel1: rt(), div: rt(), p0: rt(), p1: rt() }; this.outRT = rt();
    this.scene = new THREE.Scene(); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.scene.add(this.quad);
    const m = (frag, u, vert = LF.vert) => new THREE.RawShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { px: { value: this.px }, ...u }, depthTest: false, depthWrite: false });
    this.m = {
      advect: m(LF.advect, { velocity: { value: null }, dt: { value: LF_OPT.dt }, dissipation: { value: LF_OPT.dissipation }, fboSize: { value: this.fboSize } }),
      div: m(LF.div, { velocity: { value: null }, dt: { value: LF_OPT.dt } }),
      poisson: m(LF.poisson, { pressure: { value: null }, divergence: { value: null }, straightness: { value: LF_OPT.straightness } }),
      pressure: m(LF.pressure, { pressure: { value: null }, velocity: { value: null }, dt: { value: LF_OPT.dt } }),
      out: m(LF.out, { velocity: { value: null }, uHC: { value: new THREE.Vector2(0.5, 0.5) }, uHR: { value: 0 }, uAsp: { value: 1 }, uTime: { value: 0 } }, LF.full),
    };
    this.forceMat = new THREE.RawShaderMaterial({ vertexShader: LF.forceVert, fragmentShader: LF.force, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true,
      uniforms: { px: { value: this.px }, force: { value: new THREE.Vector2() }, center: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2(LF_OPT.cursor, LF_OPT.cursor) } } });
    this.forceScene = new THREE.Scene(); this.forceScene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.forceMat));
    this.resize(w, h);
  }
  resize(w, h) {
    const A = Math.max(8, Math.round(LF_OPT.resolution * w)), Q = Math.max(8, Math.round(LF_OPT.resolution * h));
    this.fboSize.set(A, Q); this.px.set(1 / (1100 * LF_OPT.resolution), A / Q / (1100 * LF_OPT.resolution));
    for (const k in this.f) this.f[k].setSize(A, Q);
    this.outRT.setSize(Math.max(8, Math.round(w * 0.5)), Math.max(8, Math.round(h * 0.5)));
  }
  pass(mat, target, scene = this.scene) { if (scene === this.scene) this.quad.material = mat; this.renderer.setRenderTarget(target); this.renderer.render(scene, this.cam); }
  // un pas al simulării: diff/coords în coordonate NDC (-1..1), ca pe referință
  step(diff, coords, intensity = 1) {
    if (!Number.isFinite(diff.x + diff.y + coords.x + coords.y + intensity)) { diff.set(0, 0); if (!Number.isFinite(coords.x + coords.y)) return; intensity = 0; }
    const r = this.renderer, ac = r.autoClear; r.autoClear = false;
    const f = this.f, M = this.m;
    M.advect.uniforms.velocity.value = f.vel0.texture; this.pass(M.advect, f.vel1);
    const u = this.forceMat.uniforms, E = LF_OPT.cursor * this.px.x, I = LF_OPT.cursor * this.px.y;
    u.force.value.set(diff.x / 2 * LF_OPT.force * intensity, diff.y / 2 * LF_OPT.force * intensity);
    u.center.value.set(Math.min(Math.max(coords.x, -1 + E + this.px.x * 2), 1 - E - this.px.x * 2), Math.min(Math.max(coords.y, -1 + I + this.px.y * 2), 1 - I - this.px.y * 2));
    this.pass(null, f.vel1, this.forceScene);
    M.div.uniforms.velocity.value = f.vel1.texture; this.pass(M.div, f.div);
    let src = f.p0, dst = f.p1;
    M.poisson.uniforms.divergence.value = f.div.texture;
    for (let i = 0; i < LF_OPT.poisson; i++) { M.poisson.uniforms.pressure.value = src.texture; this.pass(M.poisson, dst); [src, dst] = [dst, src]; }
    M.pressure.uniforms.pressure.value = src.texture; M.pressure.uniforms.velocity.value = f.vel1.texture; this.pass(M.pressure, f.vel0);
    M.out.uniforms.velocity.value = f.vel0.texture; this.pass(M.out, this.outRT);
    r.setRenderTarget(null); r.autoClear = ac;
  }
  get velocity() { return this.f.vel0.texture; }
  get dyeTex() { return this.outRT.texture; } // r = masca de reveal (prag 0.1)
}

// ritmul cursorului automat: durata unei treceri, pauza dintre dus și întors, pauza dintre cicluri (referința: 2.5 / 1.5 / 3)
const IDLE = { sweep: 2.6, gap: 0.15, pause: 0.3 };
// ritmul căștii transparente: desenare, cât stă desenată, ștergere (s)
const GHOST_T = { draw: 2.0, hold: 0.8, erase: 2.0 };
// mouse oprit pe cap: după `wait` s casca foto se umple în `fill` s, stă `hold` s, apoi se golește și vine zigzagul automat (ghost-ul)
const HEAD_T = { wait: 0.6, fill: 2.2, hold: 1.2 };
/* cursorul „idle” de pe referință: după 2.5 s de la încărcare / 2 s de la ultima mișcare, un zigzag de 2.5 s de sus în jos,
   apoi înapoi de jos în sus (de la 4 s), pauză 3 s, repetă */
class IdleCursor {
  constructor() {
    this.isMoving = true; this.prev = true; this.progress = { x: 0, y: 0 }; this.cursor = new THREE.Vector2();
    this.initial = setTimeout(() => { this.isMoving = false; }, 2500);
    const move = () => { this.isMoving = true; clearTimeout(this.initial); clearTimeout(this.to); this.to = setTimeout(() => { this.isMoving = false; }, 2000); };
    // pe ecranele tactile (ca pe referință) degetul nu contează: cursorul automat rulează mereu
    if (!IS_TOUCH) document.addEventListener('mousemove', move);
    const p = this.progress;
    // mai lent și mai des decât pe referință (2.5 s pe trecere, înapoi de la 4 s, pauză 3 s) — cerut de client
    const D = IDLE.sweep, B = D + IDLE.gap;
    this.tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: IDLE.pause })
      .fromTo(p, { y: 0 }, { y: 1, duration: D, ease: 'none' }, 0).fromTo(p, { x: 0 }, { x: 1, duration: D, ease: 'power1.inOut' }, 0)
      .fromTo(p, { y: 1 }, { y: 0, duration: D, ease: 'none' }, B).fromTo(p, { x: 1 }, { x: 0, duration: D, ease: 'power1.inOut' }, B);
  }
  restart() { if (!this.isMoving) this.tl.seek(0); } // zigzagul reia de sus (după ce casca umplută de pe cap se golește)
  update() {
    if (!this.isMoving) this.cursor.set(-Math.cos(this.progress.x * Math.PI * 4) * 0.75, Math.cos(this.progress.y * Math.PI) * 0.5);
    if (this.isMoving !== this.prev) { if (!this.isMoving) { this.tl.seek(0); this.tl.play(); } else this.tl.pause(); }
    this.prev = this.isMoving;
  }
}

/* ---------------- shadere scenă ---------------- */
const BG_VERT = `varying vec2 vSuv;void main(){vec4 c=projectionMatrix*modelViewMatrix*vec4(position,1.);vSuv=c.xy/c.w*0.5+0.5;gl_Position=c;}`;
const BG_FRAG = `precision highp float;varying vec2 vSuv;uniform float uTime,uAspect;uniform sampler2D tVel,tDye,tNoise;uniform vec3 uBg,uLine,uFill,uCursor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 vel=texture2D(tVel,vSuv).xy;float dye=texture2D(tDye,vSuv).r;
  vec2 p=(vSuv-0.5)*vec2(uAspect,1.)*1.35+vel*0.035;
  float h=fbm(p+vec2(uTime*0.012,-uTime*0.008)+fbm(p*0.7)*0.35);
  float k=h*7.0;float iso=abs(fract(k)-0.5);float fw=fwidth(k);
  float line=1.0-smoothstep(fw*0.4,fw*1.4+0.004,iso);
  float fill=smoothstep(0.50,0.515,h);
  // v2: fundal mai liniștit — zonele pline abia se simt, liniile sunt fine, iar în spatele capului e o lumină de studio
  vec2 q=(vSuv-vec2(0.5,0.62))*vec2(uAspect,1.);float glow=smoothstep(0.75,0.0,length(q));
  vec3 col=mix(uBg,uFill,fill*0.35);
  col=mix(col,uLine,line*0.22*(1.0-glow*0.6));
  col=mix(col*0.965,min(col*1.03,vec3(1.)),glow);
  // pata cursorului pe fundal: aceeași formă ca masca de reveal, cu margine netă (ca pe referință)
  float nz=texture2D(tNoise,vSuv*vec2(uAspect,1.)*2.5).r;
  float m=smoothstep(0.095,0.105,dye); // masca de pe referință: prag dur 0.1
  col=mix(col,uCursor,m*0.45);
  float vig=smoothstep(1.35,0.45,length((vSuv-0.5)*vec2(uAspect,1.)));
  col=mix(col*0.985,col,vig);
  gl_FragColor=vec4(col,1.);}`;

const HEAD_VERT = `uniform sampler2D tDepthA,tDepthB,tCursor;uniform float uHelmet,uDepth,uPhoto;
varying vec2 vUv,vSuv;
void main(){vUv=uv;vec4 f=projectionMatrix*modelViewMatrix*vec4(position,1.);vSuv=f.xy/f.w*0.5+0.5;
  float cur=texture2D(tCursor,vSuv).r;float rv=max(smoothstep(0.3,0.7,uHelmet),smoothstep(0.095,0.105,cur))*uPhoto;
  // relieful rămâne mereu cel al portretului: altfel, la dezvăluire, fața s-ar mări/mișca (harta căștii o împinge în față)
  float d=texture2D(tDepthA,uv).r;
  vec3 p=position;p.z+=d*uDepth;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const HEAD_FRAG = `precision highp float;
uniform sampler2D tDiffA,tDiffB,tAlphaA,tAlphaB,tDepthB,tCursor,tNoise;
uniform float uHelmet,uReveal,uOutline,uLines,uPhoto,uGray,uDim,uExit;uniform vec3 uLineColor;
varying vec2 vUv,vSuv;
void main(){
  float n=texture2D(tNoise,vUv*2.0).r;
  float cur=texture2D(tCursor,vSuv).r;
  float rv=max(smoothstep(0.3,0.7,uHelmet+(n-0.5)*0.4),smoothstep(0.095,0.105,cur))*uPhoto; // casca foto: aceeași mască ca pe referință
  vec3 cA=texture2D(tDiffA,vUv).rgb,cB=texture2D(tDiffB,vUv).rgb;
  float aA=texture2D(tAlphaA,vUv).r,aB=texture2D(tAlphaB,vUv).r;
  vec3 col=mix(cA,cB,rv);float a=mix(aA,aB,rv);
  // ca pe referință: sub casca dezvăluită fața e în umbra ei
  col*=mix(1.0,0.8,max(smoothstep(0.095,0.105,cur),uHelmet)*(1.0-uPhoto)); // umbra doar sub casca 3D (fotografia o are deja)
  // "cască desenată" — curbe de nivel ale hărții de adâncime a căștii, vizibile până la reveal
  float dB=texture2D(tDepthB,vUv).r;float k=dB*uLines;float iso=abs(fract(k)-0.5);
  float th=max(fwidth(k)*1.1,0.035);float line=1.0-smoothstep(th*0.6,th*1.5,iso);
  float region=aB*smoothstep(0.02,0.15,dB)*(1.0-aA*0.78);
  float lines=line*region*(1.0-rv)*uOutline*uPhoto;
  col=mix(col,uLineColor,lines*0.9);a=max(a,lines*0.9);
  // intro: dissolve de jos în sus cu margine de zgomot
  float v=vUv.y*0.85+n*0.15;float intro=smoothstep(v,v+0.18,uReveal);
  a*=intro;
  // ieșirea din hero la scroll: alb-negru, estompat, apoi se stinge uniform (uExit 0 → 1) — fața nu e tăiată niciodată
  float lum=dot(col,vec3(.299,.587,.114));col=mix(col,vec3(lum),uGray);col*=1.0-uDim;
  a*=1.0-uExit;
  if(a<0.03)discard; // scriem adâncime doar unde există persoană (casca 3D se ascunde în spatele capului)
  gl_FragColor=vec4(col,a);}`;

// casca dezvăluită = fotografia 4K cu Mihai purtând Venti-ul (assets/tex/helmet-*), aliniată peste portret; ?helmet3d = casca 3D
// telefon / tabletă: fără hover și fără dâră sub deget (ca pe landonorris.com pe mobil) — doar animația automată
const IS_TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;
const PHOTO_HELMET = !new URLSearchParams(location.search).has('helmet3d');
// ?inspect: cameră fixă, mărită pe cască, fără mouse/cursor automat — pentru potrivirea căștii (tastele 1 fantomă, 2 casca foto, 3 alternează)
const HELMET_URL = `assets/models/${new URLSearchParams(location.search).get('helmet') || (PHOTO_HELMET ? 'helmet-venti-ghost' : 'helmet-venti')}.glb`;
const INSPECT = new URLSearchParams(location.search).has('inspect');

/* ---------------- carbon procedural (twill 2×2), proiecție triplanară în spațiul modelului ----------------
   ca în poza oficială Venti WRC: negru adânc, tow-uri alternante (unele prind lumina, altele nu), ușor bombate */
const CARBON_GLSL = `
float cfWeave(vec2 p){
  vec2 c = floor(p); vec2 f = fract(p);
  float dir = step(2.0, mod(c.x + c.y, 4.0));                 // twill 2x2: perechi de tow-uri în diagonală
  float across = mix(f.y, f.x, dir);                           // secțiunea transversală a tow-ului
  float bulge = sin(across * 3.14159);                         // tow bombat
  float fil = 0.85 + 0.15 * sin((mix(f.x, f.y, dir)) * 60.0);  // fibrele din tow
  float gap = smoothstep(0.0, 0.06, across) * smoothstep(1.0, 0.94, across);
  return mix(0.006, 0.13, dir) * (0.35 + 0.65 * bulge) * fil * gap + 0.002;
}
vec3 carbonColor(vec3 p, vec3 n){
  vec3 w = pow(abs(normalize(n)), vec3(4.0)); w /= (w.x + w.y + w.z);
  float N = 34.0;
  float v = cfWeave(p.zy * N) * w.x + cfWeave(p.xz * N) * w.y + cfWeave(p.xy * N) * w.z;
  return vec3(v) * vec3(0.95, 0.97, 1.0);
}`;
// logo-ul Stilo (text + steguleț roșu), desenat pe canvas → abțibild pe cochilie
function makeLogoTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 300; const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  x.font = '700 250px "Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif'; x.textBaseline = 'alphabetic';
  const w = x.measureText('stilo').width, x0 = (c.width - w) / 2, y0 = 245;
  // stegulețul roșu, înclinat, peste „o”
  const ow = x.measureText('o').width, ox = x0 + w - ow;
  x.fillStyle = '#d4202b'; x.beginPath(); x.moveTo(ox + ow * 0.62, 20); x.lineTo(ox + ow * 0.98, 20); x.lineTo(ox + ow * 0.98, y0 - 110); x.lineTo(ox + ow * 0.62, y0 - 70); x.closePath(); x.fill();
  x.fillStyle = '#e9e9e7'; x.fillText('stilo', x0, y0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* ---------------- casca „fantomă” (ce se vede înainte de reveal) ----------------
   ?ghost=grid | lando | contur | puncte | nimic — variante de comparat; implicit: lando */
const GHOST = (() => { const g = new URLSearchParams(location.search).get('ghost'); return ['grid', 'lando', 'scan', 'contur', 'puncte', 'nimic'].includes(g) ? g : 'lando'; })();
const GHOST_GLSL = {
  // v1: grilă latitudine/longitudine + sticlă mată
  grid: `float k1 = vLPos.y*uLat; float i1 = abs(fract(k1)-0.5); float t1 = max(fwidth(k1)*1.2, 0.04);
        float k2 = atan(vLPos.x, vLPos.z)/6.2831853*uLong; float i2 = abs(fract(k2)-0.5); float t2 = max(fwidth(k2)*1.2, 0.04);
        float line = max(1.0 - smoothstep(t1*0.5, t1*1.4, i1), 1.0 - smoothstep(t2*0.5, t2*1.4, i2));
        ghostA = (0.16 + line*0.22 + fres*0.28) * outer * uOutline;
        ghostC = mix(vec3(0.985, 0.98, 0.965), uLineColor, line*0.6 + fres*0.2);`,
  // ca pe landonorris.com: cască albă de sticlă mată, cu rețeaua fină de triunghiuri a modelului abia vizibilă, mai clară pe margini
  // sticlă mată + rețeaua fină de triunghiuri, animată în ciclu: se desenează de sus în jos (uDraw), stă, se șterge tot de sus
  // în jos (uErase), pauză; plus în jurul cursorului. (Varianta cu benzi de scanare continue a lui Lando: ?ghost=scan)
  lando: `vec3 fw = fwidth(vBary); vec3 e = smoothstep(vec3(0.0), fw*0.75, vBary); float wire = 1.0 - min(min(e.x, e.y), e.z); // linii fine
        float yd = mix(1.0, -0.9, uDraw); float dy = vLPos.y - yd;
        float ye = mix(1.05, -0.95, uErase); float de = vLPos.y - ye;
        float cyc = smoothstep(-0.004, 0.004, dy) * (1.0 - smoothstep(-0.004, 0.004, de));
        float cg = smoothstep(0.02, 0.2, texture2D(tCursor, vSuv).g);
        // hover pe față: halou de cască transparentă în jurul cercului în care apare casca foto
        vec2 hq = (vSuv - uHoverC) * vec2(uHoverAsp, 1.0); float hd = length(hq);
        float halo = uHoverR > 0.001 ? (1.0 - smoothstep(uHoverR * 1.25, uHoverR * 2.6, hd)) * smoothstep(0.0, 0.05, uHoverR) : 0.0;
        float drawn = max(max(cyc, cg), halo); float fillOn = max(max(smoothstep(0.0, 0.3, dy) * cyc, cg), halo);
        float front = ((1.0 - smoothstep(0.0, 0.07, dy)) * (1.0 - step(0.999, uDraw)) + (1.0 - smoothstep(0.0, 0.07, -de)) * step(0.001, uErase) * (1.0 - step(0.999, uErase))) * cyc;
        ghostA = ((0.2 + fres*0.4) * fillOn * uGhostFill + wire * (0.09 + fres*0.24 + front*0.75 + halo*0.12) * uGhostWire) * drawn * outer * uOutline;
        ghostC = mix(vec3(0.992, 0.99, 0.982), vec3(0.6, 0.6, 0.57), wire*(0.35 + fres*0.4) + fres*0.1);
        ghostC = mix(ghostC, vec3(0.32, 0.32, 0.3), clamp(wire*front*0.9, 0.0, 1.0));`,
  // benzile de scanare continue, portate din bundle-ul landonorris.com
  scan: `vec3 fw = fwidth(vBary); vec3 e = smoothstep(vec3(0.0), fw*1.1, vBary); float wire = 1.0 - min(min(e.x, e.y), e.z);
        float scan = pow(fract(-vLPos.y * 1.3 - uTime), 4.0);
        ghostA = (wire * (0.05 + 0.6 * scan) + fres * 0.12 * scan) * outer * uOutline;
        ghostC = mix(vec3(0.96, 0.96, 0.95), vec3(0.16, 0.16, 0.15), wire);`,
  // doar conturul, ca un desen în creion: silueta și muchiile, fără umplere
  contur: `float rim = smoothstep(0.35, 0.75, fres);
        ghostA = rim * 0.75 * outer * uOutline;
        ghostC = vec3(0.45, 0.45, 0.42);`,
  // semitonuri: puncte pe cochilie, mai mari spre margini
  puncte: `vec2 q = vec2(atan(vLPos.x, vLPos.z)/6.2831853*uLong*3.0, vLPos.y*uLat*2.6);
        float d = length(fract(q) - 0.5); float r = 0.12 + fres*0.22; float dot_ = 1.0 - smoothstep(r - fwidth(d)*1.2, r + fwidth(d)*1.2, d);
        ghostA = dot_ * 0.7 * outer * uOutline;
        ghostC = vec3(0.55, 0.55, 0.52);`,
  // nimic: casca apare doar sub cursor
  nimic: `ghostA = 0.0; ghostC = vec3(1.0);`,
};
// atributul baricentric pentru rețeaua de triunghiuri (varianta „lando”): geometria devine neindexată
function addBary(g) {
  const ng = g.index ? g.toNonIndexed() : g; const n = ng.attributes.position.count; const b = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) b[i * 3 + (i % 3)] = 1;
  ng.setAttribute('bary', new THREE.BufferAttribute(b, 3)); return ng;
}

/* ---------------- casca 3D (GLB) ----------------
   stare "fantomă": linii de nivel pe Y + contur fresnel (wireframe-ul lui Lando);
   stare reală: PBR cu carbon lucios + HDRI; trecerea e per-pixel din masca de fluid a cursorului. */
class Helmet {
  constructor(gl) {
    this.gl = gl; this.group = new THREE.Group(); this.group.visible = false; this.ready = false;
    this.u = {
      uHelmet: { value: 0 }, uOutline: { value: 1 }, uReveal: { value: 0 }, uTime: { value: 0 },
      tCursor: { value: null }, tNoise: { value: gl.noise }, uLineColor: { value: new THREE.Color('#B8B8AE') },
      uLat: { value: 10 }, uLong: { value: 22 }, uExposure: { value: 1.0 }, uFade: { value: 0 }, uDraw: { value: 0 }, uErase: { value: 0 }, uScan: { value: 0 },
      tLogo: { value: makeLogoTexture() }, uDbg: { value: 0 }, uSolidOn: { value: PHOTO_HELMET ? 0 : 1 }, uHoverC: { value: new THREE.Vector2(0.5, 0.5) }, uHoverR: { value: 0 }, uHoverAsp: { value: 1 },
      // pe telefon casca transparentă e mai plină (umplere ×1.6, linii ×1.6), altfel abia se vede pe ecranul mic (cerut de client)
      uGhostFill: { value: (TOUCH_UI ? 1.6 : 1.0) * (THEME.ghostFill ?? 1) }, // pe fundal închis (varianta A) umplerea albă se vede ca o coajă gri → mai puțină uGhostWire: { value: TOUCH_UI ? 1.6 : 1.0 },
      uArm: { value: 0.33 }, uArmPivot: { value: new THREE.Vector2(0.25, -0.33) }, // microfonul la gură: unghi (rad) și balamaua (z, y)
      uCut: { value: new THREE.Vector4(-0.48, 0.38, 0.45, -0.8) }, // cureaua de sub bărbie: sub y, în |x|, în spatele lui z; plus tot ce e sub y absolut
      uMicCut: { value: 0 }, // Venti: brațul de carbon „VENTI” al modelului rămâne (e ca în pozele oficiale); 1 = îl taie
    };
    // reglaje de poziționare (se pot ajusta live: heroGL.helmet.tune)
    this.tune = { x: -0.0101, y: 0.2706, z: 0.03, scale: 0.6015, sy: 1.0467, // potrivit numeric pe conturul căștii din foto (stânga/dreapta/sus/jos) // pe conturul căștii din fotografie (lățime 0.496, creștet +0.588)
       rotX: 0.06, rotY: 0, rotZ: 0, visor: 0,
      mic: { x: -0.08, y: -0.42, z: 0.58 } };
  }
  async load(url) {
    const gltf = await (typeof url === 'string' ? new GLTFLoader().loadAsync(url) : url); // url sau descărcarea deja pornită
    const root = gltf.scene;
    // normalizare: centrat în origine, lățime = 1 unitate
    const box = new THREE.Box3().setFromObject(root); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    root.position.sub(c); root.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
    const inner = new THREE.Group(); inner.add(root); this.inner = inner; this.group.add(inner);
    this.meshes = [];
    root.traverse((m) => {
      if (!m.isMesh) return;
      const o = m.material, map = o.map || null; if (map) map.colorSpace = THREE.NoColorSpace;
      const mat = new THREE.MeshPhysicalMaterial({
        map, normalMap: o.normalMap || null, // metal/rugozitate din GLB nu: carbonul e procedural (vezi CARBON_GLSL)
        // carbonul e desenat procedural (textura generată avea reflexiile albe ale pozelor „coapte” în ea); textura GLB rămâne
        // doar pentru căptușeală, borduri și cusături (zonele ei închise la culoare)
        color: 0xffffff, metalness: 0.0, roughness: 0.28,
        clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.0, envMap: this.studioEnv(), transparent: true, side: THREE.FrontSide,
      });
      if (o.normalMap) mat.normalScale.set(0.0, 0.0); // relieful din normal map-ul generat e zgomot, nu-l folosim
      mat.onBeforeCompile = (s) => this.patch(s, !!map, '1.0');
      mat.customProgramCacheKey = () => 'helmet-carbon4' + (map ? 1 : 0);
      m.geometry = addBary(m.geometry); m.material = mat; m.renderOrder = 3; m.frustumCulled = false; this.meshes.push(m);
    });
    this.addLiner(root); // addVisor(root) / addMic(root): viziera și microfonul desenate în cod — scoase, casca rămâne ca Venti-ul original
    this.group.visible = true; this.ready = true; this.apply();
    gsap.to(this.u.uFade, { value: 1, duration: 0.6, ease: 'power2.out' });
    // casca transparentă: se desenează de sus în jos, stă, se șterge de sus în jos, pauză — în buclă (puțin mai alert decât v1)
    // mișcare lentă (desenare / ștergere 2 s), iar după ce dispare reapare imediat: desenarea pornește repede (power1.out),
    // ștergerea se termină repede (power1.in), fără pauză între cicluri (cerut de client)
    gsap.timeline({ repeat: -1, delay: 0, repeatDelay: 0 })
      .set(this.u.uDraw, { value: 0 }).set(this.u.uErase, { value: 0 })
      .to(this.u.uDraw, { value: 1, duration: GHOST_T.draw, ease: 'power1.out' })
      .to(this.u.uErase, { value: 1, duration: GHOST_T.erase, ease: 'power1.in' }, '+=' + GHOST_T.hold);
  }
  // mediu de reflexie ca într-un studio foto de produs: fundal negru + trei softbox-uri (sus, stânga, dreapta) și o bandă de contur.
  // Cu camera albă a HDRI-ului, lacul reflecta alb peste tot și carbonul ieșea cenușiu; așa rămâne negru, cu sclipiri curate.
  studioEnv() {
    if (this._studio) return this._studio;
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x020203);
    const box = (w, h, x, y, z, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m);
    };
    box(6, 2.2, 0, 6, 1.5, 3.2);      // softbox mare deasupra, ușor în față
    box(1.6, 6, -6, 1, 2, 2.2);       // fâșie stânga
    box(1.6, 6, 6, 1, 2, 2.2);        // fâșie dreapta
    box(8, 0.5, 0, -1.5, -6, 1.2);    // bandă de contur în spate
    box(3, 1.2, 0, 1.5, 6, 0.9);      // umplere slabă din față
    const pm = new THREE.PMREMGenerator(this.gl.renderer);
    this._studio = pm.fromScene(sc, 0.03).texture; pm.dispose();
    return this._studio;
  }
  // viziera fumurie (GLB-ul nu o are): o bucată de elipsoid care urmează deschiderea feței, în coordonatele brute ale căștii.
  // se rotește în jurul centrului cochiliei, deci la ridicare alunecă sub cozoroc, ca una reală; tune.visor: 0 = coborâtă, 1 = ridicată
  addVisor(root) {
    const V = { cz: -0.04, rx: 0.79, rz: 0.985, az: 0.98, top: 0.13, bottom: -0.25, lift: 0.18 };
    const nu = 64, nv = 24, pos = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = (i / nu * 2 - 1) * V.az, e = Math.abs(u) / V.az;
      const yb = V.bottom + V.lift * e * e;                       // marginea de jos urcă spre laterale
      const y = yb + (V.top - yb) * (j / nv);
      const k = Math.sqrt(Math.max(0, 1 - (y / 1.25) ** 2));      // curbură verticală discretă
      pos.push(V.rx * Math.sin(u) * k, y, V.cz + V.rz * Math.cos(u) * k); uv.push(i / nu, j / nv);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x16181a, metalness: 0.0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03,
      envMapIntensity: 2.2, transparent: true, depthWrite: false, side: THREE.FrontSide,
    });
    mat.onBeforeCompile = (s) => this.patch(s, false, 'clamp(0.58 + fres*0.4, 0., 0.97)', true, '0.0');
    mat.customProgramCacheKey = () => 'visor3';
    const visor = new THREE.Mesh(addBary(g), mat); visor.renderOrder = 4; visor.frustumCulled = false;
    this.visorPivot = new THREE.Group(); this.visorPivot.position.set(0, 0, V.cz); visor.position.set(0, 0, -V.cz);
    this.visorPivot.add(visor); root.add(this.visorPivot); this.visor = visor;
  }
  // microfonul DES (cel din GLB e tăiat): braț lat din carbon care vine din apărătoarea dreaptă (+x) pe linia maxilarului,
  // capsulă-cutie neagră cu grilă gri chiar în fața gurii (după poza reală de pe probă). Coordonate brute ale căștii; tune.mic = centrul capsulei
  addMic(root) {
    const m = this.tune.mic;
    const end = new THREE.Vector3(m.x, m.y, m.z);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.60, -0.47, 0.30), new THREE.Vector3(0.46, -0.44, 0.52),
      new THREE.Vector3(0.22, end.y - 0.03, end.z + 0.02), new THREE.Vector3(end.x + 0.1, end.y - 0.01, end.z + 0.01),
    ]);
    const rr = (w, h, r) => { // dreptunghi rotunjit, centrat
      const sh = new THREE.Shape(), x = -w / 2, y = -h / 2;
      sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r);
      sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
      sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh;
    };
    // brațul: bandă verticală (0.10 înălțime, 0.035 grosime) construită manual — cadrele Frenet ale ExtrudeGeometry o culcau
    const arm = (() => {
      const N = 60, H = 0.10, T = 0.035, pos = [], idx = [], up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
      const ring = [[-T / 2, -H / 2], [T / 2, -H / 2], [T / 2, H / 2], [-T / 2, H / 2]];
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
        side.crossVectors(tg, up).normalize();
        const taper = 1 - 0.25 * t; // se subțiază spre capsulă
        for (const [a, b] of ring) pos.push(p.x + side.x * a, p.y + b * taper, p.z + side.z * a);
      }
      for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) {
        const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; idx.push(a, b, d, a, d, c);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      g.computeVertexNormals(); return g;
    })();
    // capsula: cutie cu muchii rotunjite, cu fața spre cameră
    const cw = 0.25, ch = 0.2, cd = 0.12;
    const cap = new THREE.ExtrudeGeometry(rr(cw, ch, 0.05), { depth: cd, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 8 });
    cap.translate(end.x, end.y, end.z - cd / 2);
    const grill = new THREE.ShapeGeometry(rr(cw * 0.55, ch * 0.62, 0.03), 8); grill.translate(end.x - 0.02, end.y, end.z + cd / 2 + 0.021);
    const mk = (g, color, rough, clear) => {
      const mat = new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0.0, clearcoat: clear, clearcoatRoughness: 0.2, envMapIntensity: 0.12, transparent: true, side: THREE.DoubleSide });
      mat.onBeforeCompile = (s) => this.patch(s, false, '1.0', false, '0.0');
      mat.customProgramCacheKey = () => 'mic';
      const mesh = new THREE.Mesh(addBary(g), mat); mesh.renderOrder = 3; mesh.frustumCulled = false; root.add(mesh); return mesh;
    };
    this.mic = [mk(arm, 0x08090a, 0.35, 0.4), mk(cap, 0x030304, 0.75, 0), mk(grill, 0x2c2c2b, 0.95, 0)];
  }
  // interiorul negru al căștii: un elipsoid desenat ÎNAINTEA portretului, deci se vede doar unde portretul e transparent
  // (între obraji și apărători, lângă urechi) — umple golurile pe care GLB-ul nu le are. În starea „fantomă” nu apare.
  addLiner(root) {
    const g = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.8);
    g.scale(0.76, 0.82, 0.86); g.translate(0, -0.02, -0.06);
    const mat = new THREE.MeshBasicMaterial({ color: 0x0c0c0d, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.u);
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSuv;varying vec3 vLPos;')
        .replace('#include <fog_vertex>', '#include <fog_vertex>\nvSuv=gl_Position.xy/gl_Position.w*0.5+0.5;vLPos=position.xyz;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSuv;varying vec3 vLPos;uniform float uHelmet,uReveal,uFade;uniform sampler2D tCursor,tNoise;')
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float n = texture2D(tNoise, vSuv*vec2(1.6,1.0)).r; float cur = texture2D(tCursor, vSuv).r;
          float rv = max(smoothstep(0.3, 0.7, uHelmet + (n-0.5)*0.4), smoothstep(0.095, 0.105, cur));
          float v = clamp(vLPos.y + 0.5, 0., 1.)*0.85 + n*0.15; float intro = smoothstep(v, v+0.18, uReveal);
          float a = rv * intro * uFade * smoothstep(-0.60, -0.40, vLPos.y);
          if (a < 0.02) discard; gl_FragColor.a = a;`);
    };
    const liner = new THREE.Mesh(g, mat); liner.renderOrder = 1; liner.frustumCulled = false; root.add(liner); this.liner = liner;
  }
  // shell = false: piese adăugate în cod (microfonul) — fără tăieturile și fără eliminarea fețelor interioare, gândite pentru GLB
  patch(s, hasMap, solidA, shell = true, ghostK = '1.0') {
    Object.assign(s.uniforms, this.u);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSuv;varying vec3 vWPos;varying vec3 vLPos;varying vec3 vLNrm;attribute vec3 bary;varying vec3 vBary;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvSuv=gl_Position.xy/gl_Position.w*0.5+0.5;vWPos=worldPosition.xyz;vLPos=position.xyz;vLNrm=normal;vBary=bary;');
    // brațul de microfon „VENTI” (față, jos) se rotește ca o balama în jurul prinderii din apărătoarea dreaptă, până la gură (ca în poza lui Mihai);
    // ponderea lină face ca brațul să se îndoaie firesc lângă prindere. Doar pentru cochilia GLB.
    if (shell) s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uArm;uniform vec2 uArmPivot;varying vec3 vEllN;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvEllN = normalize(normalMatrix * normalize(position / vec3(0.61, 0.9, 0.9)));')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float wArm = smoothstep(0.28, 0.42, position.z) * (1.0 - smoothstep(-0.36, -0.28, position.y)) * (1.0 - smoothstep(0.52, 0.64, abs(position.x)));
        float aArm = uArm * wArm; vec2 dzy = transformed.zy - uArmPivot;
        transformed.z = uArmPivot.x + dzy.x * cos(aArm) - dzy.y * sin(aArm);
        transformed.y = uArmPivot.y + dzy.x * sin(aArm) + dzy.y * cos(aArm);`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vSuv;varying vec3 vWPos;varying vec3 vLPos;varying vec3 vLNrm;varying vec3 vBary;
        uniform sampler2D tLogo;uniform float uDbg;
        ${CARBON_GLSL}
        uniform float uHelmet,uOutline,uReveal,uTime,uLat,uLong,uExposure,uFade,uDraw,uErase,uScan,uSolidOn,uHoverR,uHoverAsp,uGhostFill,uGhostWire;uniform vec2 uHoverC;uniform vec4 uCut;uniform float uMicCut;uniform sampler2D tCursor,tNoise;uniform vec3 uLineColor;`)
      // suprafețele interioare (căptușeala, interiorul cochiliei) au normala spre centru: le eliminăm, capul e un plan 2.5D
      .replace('#include <clipping_planes_fragment>', !shell ? '#include <clipping_planes_fragment>' : `#include <clipping_planes_fragment>
        // excepție: căptușeala de pe obraji (lateral, jos) rămâne, ca spumă neagră — altfel se văd găuri în apărători
        float innerFoam = 0.0;
        if (dot(normalize(vLNrm), normalize(vLPos)) < -0.3) { if (abs(vLPos.x) > 0.38 && vLPos.y < 0.12) innerFoam = 1.0; else discard; }
        // fără curea și cataramă sub bărbie; coordonatele brute ale GLB-ului, fața spre +z
        if (vLPos.y < uCut.x && abs(vLPos.x) < uCut.y && vLPos.z < uCut.z) discard;
        // uMicCut = 1 scoate brațul de microfon al GLB-ului (tot ce e în fața deschiderii, sub obraji); cu Venti rămâne
        if (uMicCut > 0.5 && vLPos.y < -0.36 && vLPos.z > 0.40) discard;
        if (vLPos.y < uCut.w) discard;
        // capătul curelei care atârnă lateral, sub apărători
        if (vLPos.y < -0.55 && vLPos.z < 0.3 && vLPos.z > -0.1 && abs(vLPos.x) < 0.55) discard;
        // spatele căștii (ceafa, marginile interioare) nu se vede niciodată prin deschiderea feței: fără linii peste nas și gură
        if (vLPos.z < 0.15 && abs(vLPos.x) < 0.42 && vLPos.y < 0.12 && vLPos.y > -0.62) discard;`)
      // textura GLB e sRGB: o aducem în liniar manual (ColorManagement e oprit)
      .replace('#include <map_fragment>', hasMap ? `vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        // cureaua și catarama (bej/auriu în textura generată) nu apar deloc
        { vec3 sc = texture2D(map, vMapUv).rgb; if (sc.r > 0.4 && sc.g > 0.3 && sc.b < 0.78 * sc.g && sc.r > sc.b + 0.15) discard; }
        sampledDiffuseColor.rgb = pow(sampledDiffuseColor.rgb, vec3(2.2));
        // cochilia (textură deschisă, estompată) → carbon procedural; căptușeala / bordurile (textură închisă) → textura originală
        float lumB = dot(pow(texture2D(map, vMapUv, 5.0).rgb, vec3(2.2)), vec3(0.3, 0.59, 0.11));
        // după geometrie (textura generată e fărâmițată în insule UV): cochilia = suprafața exterioară, aproape de elipsoidul căștii;
        // căptușeala și bordurile sunt mai înăuntru sau cu normala spre interior
        float shellR = length(vLPos / vec3(0.78, 0.95, 0.95));
        float isCarbon = smoothstep(0.80, 0.9, shellR) * smoothstep(0.05, 0.3, dot(normalize(vLNrm), normalize(vLPos)));
        vec3 carbonC = carbonColor(vLPos, vLNrm);
        // logo-ul Stilo, proiectat din față pe cochilie
        vec2 luv = (vLPos.xy - vec2(0.0, 0.47)) / vec2(0.34, 0.1) + 0.5;
        vec4 logo = texture2D(tLogo, luv) * step(0.0, luv.x) * step(luv.x, 1.0) * step(0.0, luv.y) * step(luv.y, 1.0) * smoothstep(0.2, 0.5, normalize(vLNrm).z) * step(0.3, vLPos.z);
        carbonC = mix(carbonC, pow(logo.rgb, vec3(2.2)), logo.a);
        diffuseColor.rgb *= mix(sampledDiffuseColor.rgb * 0.8, carbonC, isCarbon);
        if (uDbg > 0.5) diffuseColor.rgb = vec3(isCarbon, lumB, 0.0);` : '#include <map_fragment>')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float n = texture2D(tNoise, vSuv*vec2(1.6,1.0)).r;
        float cur = texture2D(tCursor, vSuv).r;
        // hover: dissolve moale; cursor: mască cu margine netă (dâra din referință)
        float rvH = smoothstep(0.3, 0.7, uHelmet + (n-0.5)*0.4);
        float rvC = smoothstep(0.095, 0.105, cur); // prag dur 0.1, ca pe referință
        float rv = max(rvH, rvC);
        // intro / dissolve la ieșire (de jos în sus, ca portretul)
        float v = clamp(vLPos.y + 0.5, 0., 1.)*0.85 + n*0.15; float intro = smoothstep(v, v+0.18, uReveal);
        // PBR -> sRGB + expunere
        vec3 solid = pow(clamp(gl_FragColor.rgb*uExposure, 0., 1.), vec3(1.0/2.2));
        ${shell ? 'solid = mix(solid, vec3(0.035, 0.035, 0.038), innerFoam);' : ''}
        vec3 nrm = normalize(vNormal); vec3 vdir = normalize(vViewPosition);
        float fres = pow(1.0 - abs(dot(nrm, vdir)), 2.5);
        // fantoma doar pe suprafața exterioară a cochiliei (nu pe căptușeală / interiorul deschiderii)
        float outer = smoothstep(0.0, 0.4, dot(normalize(vLNrm), normalize(vLPos)));
        // în fața gurii (microfon) nu desenăm fantoma, ca fața să rămână curată
        outer *= 1.0 - (1.0 - smoothstep(0.12, 0.28, abs(vLPos.x))) * (1.0 - smoothstep(-0.12, 0.08, vLPos.y));
        // nici marginile din față ale apărătorilor de obraji, care cad peste obraji lângă gură (pete albe) — tot ce e în fața feței, sub pomeți
        outer *= 1.0 - (1.0 - smoothstep(0.30, 0.42, abs(vLPos.x))) * (1.0 - smoothstep(-0.30, -0.18, vLPos.y)) * smoothstep(0.0, 0.2, vLPos.z);
        // nici marginea de sus a deschiderii / dedesubtul cozorocului (bandă peste frunte): fantoma rămâne în jurul capului, ca la Lando
        outer *= 1.0 - smoothstep(0.30, 0.45, vLPos.z) * (1.0 - smoothstep(0.16, 0.30, vLPos.y)) * (1.0 - smoothstep(0.5, 0.62, abs(vLPos.x)));
        float ghostA; vec3 ghostC;
        ${GHOST_GLSL[GHOST]}
        vec3 col = mix(ghostC, solid, rv);
        ghostA *= ${ghostK};
        float a = mix(ghostA, ${solidA} * uSolidOn, rv) * intro * uFade;
        if (a < 0.02) discard;
        gl_FragColor = vec4(col, a);`);
    // carbonul lăcuit: normala și normala lacului trase spre elipsoidul cochiliei → reflexii curate, fără sclipirile
    // suprafeței generate (care e ușor „mototolită”); căptușeala își păstrează normala
    if (hasMap && shell) s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEllN;')
      // căptușeala / bordurile: spumă mată, fără lac (doar carbonul e lăcuit)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat *= isCarbon; material.roughness = mix(0.92, material.roughness, isCarbon);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, vEllN * (gl_FrontFacing ? 1.0 : -1.0), 0.55 * isCarbon));')
      .replace('#include <clearcoat_normal_fragment_begin>', '#include <clearcoat_normal_fragment_begin>\nclearcoatNormal = normalize(mix(clearcoatNormal, vEllN * (gl_FrontFacing ? 1.0 : -1.0), 0.8 * isCarbon));');

  }
  apply() {
    if (!this.inner) return; const t = this.tune;
    this.group.position.set(t.x, t.y, t.z); this.group.scale.set(t.scale, t.scale * (t.sy || 1), t.scale);
    if (this.visorPivot) this.visorPivot.rotation.x = -(t.visor || 0) * 0.55;
  }
  update(gl, dt) {
    if (!this.ready) return;
    const u = this.u; u.tCursor.value = gl.fluid.dyeTex; u.uHelmet.value = Math.max(gl.state.helmet, gl.scroll.helmetFlash); u.uOutline.value = gl.scroll.outline;
    u.uReveal.value = Math.min(1.25, gl.state.reveal * 2.2); u.uTime.value = gl.time; // fantoma apare mai devreme decât portretul
    // rotire după mouse, cu inerție proprie (mai lentă decât camera) — ca pe landonorris.com
    if (!this.rot) this.rot = new Eased(0, 0, 0.045);
    this.rot.target.copy(gl.mouse.target); this.rot.update(dt);
    const r = this.rot.value, t = this.tune;
    // ca pe referință: casca nu se rotește după mouse (doar parallax-ul camerei)
    this.group.rotation.set(t.rotX, t.rotY, t.rotZ);
  }
}

const POST_VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// compunere finală: scena + grain
const POST_FRAG = `precision highp float;varying vec2 vUv;
uniform sampler2D tDiffuse,tGrain;uniform float uTime,uAspect;
void main(){
  vec3 col=texture2D(tDiffuse,vUv).rgb;
  float g=texture2D(tGrain,vUv*vec2(uAspect,1.)*2.5+vec2(fract(uTime*7.31),fract(uTime*3.17))).r-0.5;col+=g*0.028;
  gl_FragColor=vec4(col,1.);}`;

// culorile fundalului topografic pe parcursul paginii (ca pe referință: olive → gri → crem; aici crem → carbon → gri → crem).
// gl.scroll.bgHero + bgTrack = poziția pe această scară (0 hero, 1 carbon, 2 gri, 3 crem), condusă de scroll
const BG_STOPS = (THEME.bgStops || [
  { bg: '#F1F0EB', fill: '#F9F8F4', line: '#C6C5BC', cursor: '#E4E3DA' },
  { bg: '#141413', fill: '#191918', line: '#34342f', cursor: '#1f1f1d' },
  { bg: '#5d5c57', fill: '#61605b', line: '#71706a', cursor: '#686761' },
  { bg: '#F1F0EB', fill: '#F6F5F0', line: '#D2D1C8', cursor: '#E6E5DC' },
]).map((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, new THREE.Color(v)])));

// planul portretului (w × h, unități locale) și reperele din el: linia ochilor, vârful căștii, tăietura de jos, înălțimea încadrată pe lat,
// lățimea încadrată pe îngust
const F = { w: 2, h: 1.5, eyes: 0.264, top: 0.64, bottom: -0.75, span: 1.34, narrow: 1.15 };

/* ---------------- aplicația GL ---------------- */
class HeroGL {
  constructor(canvas) {
    this.canvas = canvas; this.wrap = canvas.parentElement;
    this.sizes = this.measure();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.sizes.dpr); this.renderer.setSize(this.sizes.w, this.sizes.h, false); // CSS-ul dă mărimea afișată
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, this.sizes.w / this.sizes.h, 0.1, 20);
    this.camGroup = new THREE.Group(); this.camGroup.add(this.camera); this.scene.add(this.camGroup);
    this.mouse = new Eased(0, 0, 0.025);   // pentru parallax cameră
    this.pace = 0;                          // viteza medie a cursorului
    this.raw = new THREE.Vector2(); this.rawPrev = new THREE.Vector2(); this.lastMove = 0; this.hasMouse = false;
    this.fluid = new Fluid(this.renderer, this.sizes.w, this.sizes.h); this.idle = new IdleCursor();
    this.ndc = new THREE.Vector2(); this.coords = new THREE.Vector2(); this.coordsOld = new THREE.Vector2(); this.diff = new THREE.Vector2();
    this.state = { helmet: 0, reveal: 0, rendering: true };
    // valori conduse de scroll (un singur ScrollTrigger le calculează din progres)
    // bg: poziția pe scara de culori BG_STOPS; exit: portretul se dizolvă (0 → 1); idle: cursorul automat (doar cât se vede hero-ul)
    this.scroll = { dolly: 0, drop: 0, outline: 1, cursorIntensity: 1, helmetFlash: 0, bgHero: 0, bgTrack: 0, gray: 0, dim: 0, exit: 0, idle: 1 };
    this.colors = { light: { head: THEME.headLine || '#2a2a27' } };
    this.rt = new THREE.WebGLRenderTarget(this.sizes.w * this.sizes.dpr, this.sizes.h * this.sizes.dpr, { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.time = 0;
    this.bindPointer();
  }

  async load(onProgress) {
    this.gltfP = new GLTFLoader().loadAsync(HELMET_URL); // modelul se descarcă în paralel cu texturile portretului
    const loader = new THREE.TextureLoader();
    const files = ['head-diffuse.jpg', 'head-alpha.png', 'head-depth.png', 'helmet-diffuse.jpg', 'helmet-alpha.png', 'helmet-depth.png'];
    let done = 0; const tex = {};
    await Promise.all(files.map((f) => new Promise((res, rej) => loader.load('assets/tex/' + f, (t) => {
      t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
      tex[f] = t; onProgress(++done / files.length); res();
    }, undefined, rej))));
    this.tex = tex;
    this.build();
  }

  build() {
    const { tex } = this;
    this.noise = makeNoiseTexture(512, 24); this.grain = makeGrainTexture(256);
    // fundal: plan mare în spatele capului
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: BG_VERT, fragmentShader: BG_FRAG, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uAspect: { value: 1 }, tVel: { value: null }, tDye: { value: null }, tNoise: { value: this.noise },
        uBg: { value: new THREE.Color(this.colors.light.bg) }, uLine: { value: new THREE.Color(this.colors.light.line) }, uFill: { value: new THREE.Color(this.colors.light.fill) },
        uCursor: { value: new THREE.Color('#E4E3DA') } },
    }));
    this.bg.position.z = -3; this.bg.scale.set(40, 40, 1); this.scene.add(this.bg);
    // capul: plan 3:4 subdivizat, deplasat pe Z după adâncime
    this.headU = {
      tDiffA: { value: tex['head-diffuse.jpg'] }, tAlphaA: { value: tex['head-alpha.png'] }, tDepthA: { value: tex['head-depth.png'] },
      tDiffB: { value: tex['helmet-diffuse.jpg'] }, tAlphaB: { value: tex['helmet-alpha.png'] }, tDepthB: { value: tex['helmet-depth.png'] },
      tCursor: { value: null }, tNoise: { value: this.noise },
      uHelmet: { value: 0 }, uDepth: { value: 0.23 }, uReveal: { value: 0 }, uOutline: { value: 1 }, uLines: { value: 0 }, uPhoto: { value: 1 },
      uGray: { value: 0 }, uDim: { value: 0 }, uExit: { value: 0 },
      uLineColor: { value: new THREE.Color(this.colors.light.head) },
    };
    this.head = new THREE.Mesh(new THREE.PlaneGeometry(F.w, F.h, Math.round(F.w * 260), Math.round(F.h * 260)), new THREE.ShaderMaterial({
      vertexShader: HEAD_VERT, fragmentShader: HEAD_FRAG, uniforms: this.headU, transparent: true, depthWrite: false, // casca (doar cochilia exterioară) acoperă mereu părul
    }));
    this.head.renderOrder = 2; this.scene.add(this.head);
    // casca 3D: copil al capului, ca să urmeze scara și poziția lui
    this.helmet = new Helmet(this); this.head.add(this.helmet.group);
    this.scene.add(new THREE.DirectionalLight(0xffffff, 1.2).translateX(2).translateY(3).translateZ(4));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    this.loadHelmet();
    // post: grain
    this.postScene = new THREE.Scene(); this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postU = { tDiffuse: { value: this.rt.texture }, tGrain: { value: this.grain }, uTime: { value: 0 }, uAspect: { value: 1 } };
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: POST_FRAG, uniforms: this.postU, depthTest: false })));
    this.responsive();
  }

  async loadHelmet() {
    try {
      // cu casca foto, modelul 3D e doar pentru casca transparentă: geometria goală (2.8 MB în loc de 16) și fără HDRI → apare repede
      if (!PHOTO_HELMET) {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const hdr = await new RGBELoader().loadAsync('assets/hdri/studio_small_08_1k.hdr');
        this.scene.environment = pmrem.fromEquirectangular(hdr).texture; hdr.dispose(); pmrem.dispose();
      }
      await this.helmet.load(this.gltfP || HELMET_URL);
      this.headU.uPhoto.value = PHOTO_HELMET ? 1 : 0; // cască foto: modelul 3D rămâne doar pentru desenul transparent
      if (PHOTO_HELMET && this.helmet.liner) this.helmet.liner.visible = false;
      console.log('helmet 3D ok');
    } catch (e) { console.warn('casca 3D indisponibilă, rămâne varianta din poză', e); }
  }

  responsive() {
    const { w, h } = this.sizes; const aspect = w / h;
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    // planul are F.w × F.h unități; îl scalăm față de lățimea vizibilă și îl lipim de marginea de sus
    const z = aspect > 1 ? 3 : 3.6; this.camera.position.z = z;
    const visH = 2 * z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), visW = visH * aspect;
    // pe lat: bustul, de la vârful căștii până sub scrisul „Budureasca” (prim-planul din v3 a fost prea aproape);
    // pe îngust scara vine din lățimea umerilor, iar bustul stă lipit jos
    const wide = aspect > 1;
    const s = wide ? visH / F.span : Math.min(1.6, visW / F.narrow * (aspect < 0.62 ? 1.44 : 1.1));
    this.head.scale.setScalar(s);
    // linia ochilor (local y = F.eyes) stă mereu pe axa camerei, ca perspectiva căștii 3D să fie identică în orice format;
    // încadrarea se face prin decentrarea proiecției (setViewOffset), nu mutând capul.
    this.head.position.set(0, -F.eyes * s, 0);
    const topW = (F.top - F.eyes) * s, bottomW = (F.bottom - F.eyes) * s; // vârful căștii / marginea de jos a planului
    // pe îngust: bustul lipit jos (cu 3% sub marginea ecranului, ca să nu se vadă capătul pozei); pe lat: lipit sus
    // + 6% din înălțime: Mihai stă puțin mai jos, cu aer deasupra căștii (cerut de client); pe telefon doar 2% (clientul: „un pic mai sus”)
    const yc = (!wide && (topW - bottomW) <= visH ? bottomW + visH * 0.53 : topW - visH / 2) + visH * (aspect < 0.8 ? 0.02 : 0.06);
    if (INSPECT) {
      // casca (centrul ei ≈ local +0.30) în mijlocul ecranului, mărită
      const ycI = (0.30 - F.eyes) * s; this.camera.zoom = 2.2;
      this.camera.setViewOffset(w, h, 0, -ycI / visH * h, w, h); this.camera.updateProjectionMatrix();
    } else { this.camera.zoom = 1; this.camera.setViewOffset(w, h, 0, -yc / visH * h, w, h); this.camera.updateProjectionMatrix(); }
    this.visH = visH;
    this.bg.material.uniforms.uAspect.value = aspect; this.postU.uAspect.value = aspect;
  }

  bindPointer() {
    const set = (x, y) => {
      this.raw.set(x / this.sizes.w, 1 - y / this.sizes.h); this.lastMove = this.time; this.hasMouse = true; this.ndc.set(this.raw.x * 2 - 1, this.raw.y * 2 - 1);
      this.mouse.target.set(this.raw.x * 2 - 1, this.raw.y * 2 - 1);
    };
    window.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' && !IS_TOUCH) set(e.clientX, e.clientY); }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { this.hasMouse = false; });
    new ResizeObserver(() => this.resize()).observe(this.wrap);
    window.addEventListener('resize', () => this.resize());
  }

  measure() { return { w: Math.max(1, this.wrap.clientWidth), h: Math.max(1, this.wrap.clientHeight), dpr: Math.min(devicePixelRatio, 2) }; }

  resize() {
    const s = this.measure();
    if (s.w === this.sizes.w && s.h === this.sizes.h && s.dpr === this.sizes.dpr && this.head) return;
    this.sizes = s;
    this.renderer.setPixelRatio(this.sizes.dpr); this.renderer.setSize(this.sizes.w, this.sizes.h, false);
    this.rt.setSize(this.sizes.w * this.sizes.dpr, this.sizes.h * this.sizes.dpr);
    this.fluid.resize(this.sizes.w, this.sizes.h);
    if (this.head) this.responsive();
  }

  // culorile fundalului topografic după poziția pe scara BG_STOPS (interpolare liniară între opriri)
  applyBg(t) {
    const i = Math.max(0, Math.min(BG_STOPS.length - 2, Math.floor(t))), f = Math.max(0, Math.min(1, t - i));
    const a = BG_STOPS[i], b = BG_STOPS[i + 1], u = this.bg.material.uniforms;
    u.uBg.value.copy(a.bg).lerp(b.bg, f); u.uFill.value.copy(a.fill).lerp(b.fill, f);
    u.uLine.value.copy(a.line).lerp(b.line, f); u.uCursor.value.copy(a.cursor).lerp(b.cursor, f);
  }

  update(dt) {
    if (!this.head) return;
    this.time += dt;
    // matricea camerei trebuie să fie la zi înainte de proiecții: pe conexiuni lente cursorul automat pornește înaintea primei
    // randări, iar proiecția ochilor cu matricea neinițializată dădea 0/0 = NaN, care intra în cameră și înnegrea tot ecranul
    this.camGroup.updateMatrixWorld(true);
    // mouse oprit pe cap / cască → casca se umple complet, lent (2.2 s); rândul „Casca” din card păstrează animația de pe referință;
    // zona = elipsa căștii în ecran (centrul căștii e cu ~0.04 unități peste linia ochilor, lățime ≈ 0.5, înălțime ≈ 0.62)
    {
      const s = this.head.scale.x, P = (x, y) => (this._pv || (this._pv = new THREE.Vector3())).set(x * s, y * s, 0).project(this.camera).clone();
      const c = P(0, 0.04), ex = P(0.26, 0.04), ey = P(0, 0.35);
      const rx = Math.abs(ex.x - c.x) * this.sizes.w / 2, ry = Math.abs(ey.y - c.y) * this.sizes.h / 2;
      // conturul căștii în NDC (pentru zigzagul automat)
      this.helmNdc = { x: c.x, y: c.y, rx: Math.abs(ex.x - c.x), ry: Math.abs(ey.y - c.y) };
      const dx = (this.ndc.x - c.x) * this.sizes.w / 2, dy = (this.ndc.y - c.y) * this.sizes.h / 2;
      // umplerea pornește doar când mouse-ul STĂ pe cap (> 0.6 s fără mișcare); cât se mișcă rămâne doar dâra (cerut de client).
      // umplerea nu ține la nesfârșit: după ce stă plină, se golește și vine zigzagul automat, ca oriunde altundeva pe ecran
      // (altfel, cu mouse-ul lăsat pe cască, ghost-ul nu mai apărea deloc — observat de client)
      const rest = this.time - this.lastMove;
      const inside = !IS_TOUCH && this.hasMouse && (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1 && this.scroll.cursorIntensity > 0.5 && this.scroll.exit < 0.01
        && rest > HEAD_T.wait && rest < HEAD_T.wait + HEAD_T.fill + HEAD_T.hold;
      if (inside !== !!this.headHover) {
        if (this.headHover && rest >= HEAD_T.wait + HEAD_T.fill + HEAD_T.hold) this.idle.restart();
        this.headHover = inside; window.dispatchEvent(new CustomEvent('head-hover', { detail: inside }));
      }
      const u = this.fluid.m.out.uniforms; u.uHR.value = 0; u.uAsp.value = this.sizes.w / this.sizes.h; u.uTime.value = this.time;
      if (this.helmet && this.helmet.u) { const hu = this.helmet.u; hu.uHoverR.value = 0; hu.uHoverAsp.value = u.uAsp.value; }
    }
    // cursor ca pe referință: mouse-ul real sau, după 2 s fără mișcare, cursorul „idle”; simularea merge la pas fix de 60 Hz
    this.idle.update();
    this.fluidAcc = (this.fluidAcc || 0) + dt;
    if (this.fluidAcc > 1 / 60) {
      this.fluidAcc %= 1 / 60;
      let c = this.ndc;
      if (!(this.idle.isMoving && this.hasMouse) && this.scroll.idle > 0.5) {
        // zigzagul de pe referință e centrat pe ecran, unde stă fața lui Lando; aici îl centrăm pe fața lui Mihai (linia ochilor)
        // zigzagul de pe referință acoperă tot ecranul (fața lui Lando îl umple); aici casca e doar în centru-sus, așa că
        // zigzagul e încadrat în conturul căștii (+ puțin aer) — altfel cea mai mare parte a timpului nu dezvăluia nimic
        const h = this.helmNdc || { x: 0, y: 0.2, rx: 0.3, ry: 0.4 };
        c = this.idleC || (this.idleC = new THREE.Vector2()); c.set(h.x + this.idle.cursor.x / 0.75 * h.rx * 1.15, h.y + this.idle.cursor.y / 0.5 * h.ry * 1.05);
        if (!Number.isFinite(c.x + c.y)) c.set(0, 0);
      }
      if (!this.idle.isMoving && this.scroll.idle > 0.5) this.mouse.target.set(c.x, c.y * 0.6);
      this.coords.copy(c); this.diff.subVectors(this.coords, this.coordsOld); this.coordsOld.copy(this.coords);
      if (this.diff.length() > 0.5) this.diff.set(0, 0); // salt (prima mișcare, ieșire/intrare în fereastră)
      this.fluid.step(this.diff, this.coords, INSPECT ? 0 : this.scroll.cursorIntensity * (this.state.rendering ? 1 : 0));
    }
    if (!Number.isFinite(this.mouse.target.x + this.mouse.target.y)) this.mouse.target.set(0, 0);
    this.mouse.update(dt);
    if (!Number.isFinite(this.mouse.value.x + this.mouse.value.y)) this.mouse.value.set(0, 0);

    if (!this.state.rendering) return;
    // parallax cameră (aceeași intensitate ca pe referință: 0.075) + dolly din scroll
    const m = this.mouse.value, sc = this.scroll;
    if (INSPECT) this.camGroup.position.set(0, 0, 0);
    else this.camGroup.position.set(m.x * 0.075, m.y * 0.075 + sc.drop, -sc.dolly * 0.7);

    const bu = this.bg.material.uniforms; bu.uTime.value = this.time; bu.tVel.value = this.fluid.velocity; bu.tDye.value = this.fluid.dyeTex;
    this.applyBg(sc.bgHero + sc.bgTrack);
    this.headU.tCursor.value = this.fluid.dyeTex;
    this.headU.uGray.value = sc.gray; this.headU.uDim.value = sc.dim; this.headU.uExit.value = sc.exit;
    this.head.visible = sc.exit < 0.999;
    this.headU.uHelmet.value = Math.max(this.state.helmet, sc.helmetFlash);
    this.headU.uReveal.value = this.state.reveal;
    this.headU.uOutline.value = sc.outline;
    this.helmet.update(this, dt);

    this.postU.uTime.value = this.time;
    this.renderer.setRenderTarget(this.rt); this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null); this.renderer.render(this.postScene, this.postCam);
    if (window.__afterRender) { const f = window.__afterRender; window.__afterRender = null; f(this.renderer.domElement); } // captură (unelte de verificare)
  }
}

/* ---------------- DOM: split & reveal-uri ---------------- */
function revealLines(root, { delay = 0, stagger = 0.08 } = {}) {
  const ins = root.querySelectorAll('.in');
  return gsap.to(ins, { y: '0%', duration: 1.3, ease: 'power3.out', delay, stagger });
}
function drawPath(el) {
  const len = el.getTotalLength(); el.style.strokeDasharray = len; el.style.strokeDashoffset = len; return len;
}

/* ---------------- bootstrap ---------------- */
const canvas = $('#gl');
// la reîncărcare pagina pornește mereu din hero (altfel browserul reface scroll-ul în secțiunea întunecată)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
const gl = new HeroGL(canvas);
window.heroGL = gl;
if (INSPECT) {
  // mod de inspecție: casca transparentă stă desenată complet; 1 = doar ea, 2 = casca foto, 3 = alternează la 0.9 s
  const lbl = document.createElement('div');
  lbl.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99;background:#111;color:#fff;font:600 13px system-ui;padding:8px 14px;border-radius:8px;opacity:.85';
  document.body.appendChild(lbl);
  let mode = '3';
  const setMode = (k) => { mode = k; lbl.textContent = { 1: '1 · casca transparentă', 2: '2 · casca foto', 3: '3 · alternează' }[k] + '   (tastele 1 2 3)'; };
  addEventListener('keydown', (e) => { if ('123'.includes(e.key)) setMode(e.key); });
  gsap.ticker.add(() => {
    const u = gl.helmet && gl.helmet.u; if (u) { u.uDraw.value = 1; u.uErase.value = 0; }
    gl.state.helmet = mode === '2' ? 1 : mode === '1' ? 0 : Math.floor(performance.now() / 900) % 2;
  });
  setMode('3');
}
const pre = createPreloader();

gl.load((p) => pre.set(p)).then(() => {
  gsap.ticker.add((t, dtMs) => gl.update(Math.min(dtMs / 1000, 0.05)));
  // când literele MM devin fereastra, hero-ul trebuie să fie deja desenat în spate: portretul apare direct, restul intră cu intro-ul
  pre.finish(() => {
    gl.state.reveal = 1.25;
    siteModule.then((m) => {
      if (!m.intro) return intro();
      lenis.start(); m.intro({ gl, lenis, revealLines, drawPath }); bindScroll(); bindHelmet();
    });
  });
}).catch((e) => { console.error(e); pre.error(window.I18N ? I18N.t('Eroare la încărcare', 'Loading error') : 'Eroare la încărcare'); });

function intro() {
  lenis.start();
  const outline = $('#heroCard .outline path'), stage = $('#stagePath');
  drawPath(outline); if (stage) drawPath(stage);
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.add(revealLines($('#nav .wordmark'), { stagger: 0.1 }), 0.4)
    .to('#navMark', { opacity: 1, duration: 1 }, 0.8)
    .to('#navRight', { opacity: 1, y: 0, duration: 1 }, 0.8)
    .add(revealLines($('#heroTitle'), { stagger: 0.1 }), 0.7)
    .to(outline, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, 0.9)
    .to(stage || {}, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 1.2)
    .to('#heroTitle .hx, #heroCard .hx', { opacity: 1, y: 0, duration: 1, stagger: 0.05 }, 1.1) // elementele din variantele hero-left.js
    .add(revealLines($('#heroCard'), { stagger: 0.07 }), 1.0)
    .to('#rule1', { scaleX: 1, duration: 1, ease: 'power2.inOut' }, 1.5)
    .add(() => $('#heroCard .hl')?.classList.add('on'), 1.6)
    .add(revealLines($('#heroRight'), { stagger: 0.07 }), 1.3);
  bindScroll();
  bindHelmet();
}

function bindHelmet() {
  const row = $('#helmetRow') || document.createElement('div'); // variantele pot să nu aibă rândul „Casca”
  // hoverAnimation de pe referință: intrare 1.5 s expo.inOut, ieșire 1 s expo.inOut
  const on = () => gsap.to(gl.state, { helmet: 1, duration: 1.5, ease: 'expo.inOut', overwrite: 'auto' });
  // ieșirea: mai lentă decât pe referință (1 s expo.inOut) — cerut de client
  const off = () => gsap.to(gl.state, { helmet: 0, duration: 1.8, ease: 'power2.inOut', overwrite: 'auto' });
  // capul: umplere mai lentă decât rândul (clientul: „se umple prea repede”)
  const onHead = () => gsap.to(gl.state, { helmet: 1, duration: HEAD_T.fill, ease: 'power2.inOut', overwrite: 'auto' });
  let rowIn = false, headIn = false; const sync = () => (rowIn ? on() : headIn ? onHead() : off());
  if (isTouch) { let v = false; row.addEventListener('click', (e) => { e.preventDefault(); v = !v; v ? on() : off(); }); }
  else {
    row.addEventListener('pointerenter', () => { rowIn = true; sync(); });
    row.addEventListener('pointerleave', () => { rowIn = false; sync(); });
    addEventListener('head-hover', (e) => { headIn = e.detail; sync(); });
  }
}

function bindScroll() {
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  // ieșirea din hero (fără card): hero-ul rămâne lipit cât urcă manifestul peste el (#heroTrack 250vh, manifestul are -100vh).
  // p = 0…1 pe cei 150vh lipiți: fundalul trece în carbon, portretul devine alb-negru, se estompează și se retrage,
  // casca transparentă și dâra cursorului se sting, apoi portretul se dizolvă de sus în jos cât manifestul îl acoperă
  ScrollTrigger.create({
    trigger: '#heroTrack', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => {
      const p = self.progress, sc = gl.scroll;
      sc.bgHero = ss(0.02, 0.3, p);
      sc.outline = 1 - ss(0, 0.14, p);
      sc.cursorIntensity = 1 - ss(0, 0.12, p);
      sc.idle = p < 0.12 ? 1 : 0;
      sc.gray = ss(0.03, 0.25, p);
      sc.dim = ss(0.1, 0.55, p) * 0.6;
      sc.dolly = -ss(0, 0.9, p) * 0.45;
      sc.drop = ss(0.2, 0.95, p) * 0.12;
      sc.exit = ss(0.42, 0.9, p);
    },
  });
  const fade = document.querySelectorAll(THEME.heroFade || '#heroTitle, #heroCard, #heroRight, #heroMob');
  if (fade.length) gsap.to(fade, { opacity: 0, y: -40, ease: 'none', scrollTrigger: { trigger: '#heroTrack', start: 'top top', end: () => '+=' + innerHeight * 0.3, scrub: true } });
  ScrollTrigger.refresh();
  // secțiunile de după hero: după fonturi (SplitText împarte rândurile pe metricile finale)
  document.fonts.ready.then(() => siteModule).then((m) => { m.initSite({ gl, lenis }); ScrollTrigger.refresh(); });
}
