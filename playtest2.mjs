// Focused play test: start, stand still until caught, restart with R, verify.
// Usage: node playtest2.mjs [base-url]
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:8123';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
const state = () => page.evaluate(() => window.__gameState);
await page.goto(`${base}/?seed=7`, { waitUntil: 'load' });
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
console.log('start:', JSON.stringify(await state()));
// Stand still: the farmer walks in after the grace and grabs 3 times.
let caught = null;
for (let i = 0; i < 45; i += 1) {
  await page.waitForTimeout(2000);
  const s = await state();
  if (s.screen === 'over') { caught = s; break; }
  if (i % 5 === 4) console.log(`t+${(i + 1) * 2}s:`, JSON.stringify(s));
}
console.log('caught:', JSON.stringify(caught));
await page.screenshot({ path: '/tmp/playtest-caught.png' });
if (caught) {
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(400);
  console.log('after R:', JSON.stringify(await state()));
  // Run right a little to confirm the new run moves.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowRight');
  console.log('new run:', JSON.stringify(await state()));
}
await browser.close();
console.log(errors.length ? `ERRORS: ${errors.join(' | ')}` : 'no page errors');
