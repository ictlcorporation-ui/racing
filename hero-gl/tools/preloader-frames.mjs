// Cadre din pagina demo a preloader-ului (tools/preloader-demo.html) pentru o variantă, desktop sau mobil.
import { createRequire } from 'module';
const require = createRequire('/Users/rdd111/.claude/skills/scroll-film-studio/node_modules/');
const puppeteer = require('puppeteer-core');
const [v, mob, out] = process.argv.slice(2);
const fs = await import('fs'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage();
await p.setViewport(mob === '1' ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { width: 1440, height: 860 });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(`http://localhost:8772/tools/preloader-demo.html?v=${v}&noui`, { waitUntil: 'networkidle0' });
const t0 = Date.now();
const T = [400, 1200, 2000, 2900, 3700, 4300, 4800, 5300, 6200];
for (const t of T) { await new Promise((r) => setTimeout(r, Math.max(0, t - (Date.now() - t0)))); await p.screenshot({ path: `${out}/v${v}-${mob}-${t}.jpg`, type: 'jpeg', quality: 70 }); }
await b.close();
