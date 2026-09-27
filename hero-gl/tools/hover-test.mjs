// Test headless al interacțiunilor din hero (desktop): hover pe rândul „Casca”, dâră pe față, mouse oprit pe față.
import { createRequire } from 'module';
const require = createRequire('/Users/rdd111/.claude/skills/scroll-film-studio/node_modules/');
const puppeteer = require('puppeteer-core');
const [url, dir] = process.argv.slice(2);
const fs = await import('fs'); fs.mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1512, height: 900 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 6000));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (n) => page.screenshot({ path: `${dir}/${n}.jpg`, type: 'jpeg', quality: 80 });
// 1. hover pe rândul „Casca · Stilo WRC”
const row = await page.$('#helmetRow'); const b = await row.boundingBox();
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 }); await wait(2000); await shot('1-row-hover');
console.log('state.helmet', await page.evaluate(() => heroGL.state.helmet));
await page.mouse.move(1300, 200, { steps: 5 }); await wait(2000);
// 2. dâră peste față
for (let i = 0; i <= 30; i++) await page.mouse.move(560 + i * 14, 300 + Math.sin(i / 3) * 60, { steps: 1 });
await wait(80); await shot('2-trail');
// 3. mouse oprit pe față
await page.mouse.move(756, 330, { steps: 8 }); await wait(2500); await shot('3-rest-face');
await browser.close();
