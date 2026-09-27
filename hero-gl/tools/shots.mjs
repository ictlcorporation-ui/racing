// Capturi headless (Chrome de sistem prin puppeteer-core) la poziții de scroll date — pentru verificare vizuală desktop/mobil.
// node tools/shots.mjs <url> <w> <h> <mobil 0|1> <dir> <pas1> <pas2> ...
// pas = „nume=selector[@offsetVh]” sau „nume=px:1234” sau „nume=vh:1.5”
import { createRequire } from 'module';
const require = createRequire('/Users/rdd111/.claude/skills/scroll-film-studio/node_modules/');
const puppeteer = require('puppeteer-core');
const [url, w, h, mob, dir, ...steps] = process.argv.slice(2);
const fs = await import('fs'); fs.mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: mob === '1' ? 2 : 1, isMobile: mob === '1', hasTouch: mob === '1' });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6500));
for (const s of steps) {
  const [name, spec] = s.split('=');
  await page.evaluate((spec) => {
    let y;
    if (spec.startsWith('px:')) y = +spec.slice(3);
    else if (spec.startsWith('vh:')) y = +spec.slice(3) * innerHeight;
    else { const [sel, off] = spec.split('@'); const e = document.querySelector(sel); y = e.getBoundingClientRect().top + scrollY + (+(off || 0)) * innerHeight; }
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  }, spec);
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: `${dir}/${name}.jpg`, type: 'jpeg', quality: 80 });
  console.log('ok', name);
}
await browser.close();
