// Aceeași mișcare de mouse (realistă, un pas la ~16 ms) pe landonorris.com și pe hero-ul nostru → capturi la mijlocul și finalul mișcării.
import { createRequire } from 'module';
const require = createRequire('/Users/rdd111/.claude/skills/scroll-film-studio/node_modules/');
const puppeteer = require('puppeteer-core');
const [dir, ...urls] = process.argv.slice(2);
const fs = await import('fs'); fs.mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [k, url] of urls.entries()) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1512, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(9000);
  await page.mouse.move(400, 250); await wait(300);
  // zigzag peste față, ca un utilizator: ~0.9 s de mișcare
  const pts = [];
  for (let i = 0; i <= 56; i++) { const t = i / 56; pts.push([480 + t * 560, 260 + Math.sin(t * Math.PI * 3) * 90 + t * 60]); }
  for (const [i, [x, y]] of pts.entries()) {
    await page.mouse.move(x, y); await wait(16);
    if (i === 30) await page.screenshot({ path: `${dir}/${k}-mid.jpg`, type: 'jpeg', quality: 80 });
  }
  await page.screenshot({ path: `${dir}/${k}-end.jpg`, type: 'jpeg', quality: 80 });
  await wait(700); await page.screenshot({ path: `${dir}/${k}-after700.jpg`, type: 'jpeg', quality: 80 });
  await page.close();
}
await browser.close();
