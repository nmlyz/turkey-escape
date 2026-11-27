// Take the game's screenshots with headless Chromium: one per entry in shots.json,
// waiting for window.__shotReady, saving JPEGs under screenshots/.
// Usage: node take-shots.mjs [base-url]  (default http://localhost:8123)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:8123';
const shots = JSON.parse(readFileSync(new URL('./shots.json', import.meta.url), 'utf8'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));
for (const shot of shots) {
  await page.goto(`${base}/${shot.query}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
  } catch {
    errors.push(`${shot.name}: __shotReady never set`);
  }
  await page.screenshot({ path: `screenshots/${shot.name}`, type: 'jpeg', quality: 82 });
  const state = await page.evaluate(() => window.__shotState);
  console.log('shot', shot.name, JSON.stringify(state));
}
await browser.close();
if (errors.length > 0) {
  console.log('ERRORS:');
  for (const e of errors) console.log(' -', e);
  process.exitCode = 1;
} else {
  console.log('no page errors');
}
