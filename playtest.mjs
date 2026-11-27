// Drive the real game with keyboard input in headless Chromium and report the state:
// title -> start -> run -> jump -> pause -> stand still until caught -> restart.
// Usage: node playtest.mjs [base-url]
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:8123';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
const state = () => page.evaluate(() => window.__gameState);
await page.goto(`${base}/?seed=7`, { waitUntil: 'load' });
await page.waitForTimeout(500);
console.log('title:', JSON.stringify(await state()));

await page.keyboard.press('Enter');
await page.waitForTimeout(300);
console.log('after Enter:', JSON.stringify(await state()));

await page.keyboard.down('ArrowRight');
await page.keyboard.down('Shift');
await page.waitForTimeout(2500);
await page.keyboard.up('Shift');
await page.keyboard.press('Space');
await page.waitForTimeout(1000);
console.log('after run+sprint+jump:', JSON.stringify(await state()));

// Hide: walk back left toward the hay bale at x=350, then press H.
await page.keyboard.up('ArrowRight');
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(2500);
await page.keyboard.up('ArrowLeft');
await page.keyboard.press('KeyH');
await page.waitForTimeout(300);
console.log('after H:', JSON.stringify(await state()));
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(200);

// Pause and resume.
await page.keyboard.press('KeyP');
await page.waitForTimeout(200);
console.log('paused:', JSON.stringify(await state()));
await page.screenshot({ path: '/tmp/playtest-paused.png' });
await page.keyboard.press('KeyP');
await page.waitForTimeout(200);
console.log('resumed:', JSON.stringify(await state()));

// Stand still: the farmer should catch the turkey (3 lives) within ~40s.
await page.waitForTimeout(1000);
let caught = null;
for (let i = 0; i < 40; i += 1) {
  await page.waitForTimeout(2000);
  const s = await state();
  if (s.screen === 'over') { caught = s; break; }
  if (i % 5 === 4) console.log(`waiting… t+${(i + 1) * 2}s:`, JSON.stringify(s));
}
console.log('caught:', JSON.stringify(caught));
await page.screenshot({ path: '/tmp/playtest-end.png' });

// Restart with R.
await page.keyboard.press('KeyR');
await page.waitForTimeout(300);
console.log('after R:', JSON.stringify(await state()));
await browser.close();
console.log(errors.length ? `ERRORS: ${errors.join(' | ')}` : 'no page errors');
