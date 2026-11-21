// tools/capture.mjs — takes the four staged screenshots of Neon Bay.
// Serves game/ with serve.ts, loads ?shot=N in headless Chromium, waits
// for the game's ready flag, and writes a 1280x720 JPEG per shot.
// Usage: node tools/capture.mjs   (run from the repo root)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const shots = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url), 'utf8')).shots;
const PORT = 8130;
// --only=2 retakes a single shot (handy after reframing one camera).
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? parseInt(onlyArg.split('=')[1], 10) : 0;
const todo = shots.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => !only || s.n === only);
if (!todo.length) { console.error(`no shot ${only}`); process.exit(2); }

const server = spawn('node', ['serve.ts', `--port=${PORT}`], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1800));

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
});

const errors = [];
try {
  for (const shot of todo) {
    const i = shot.n - 1;
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(`shot ${shot.n}: ${e.message.slice(0, 200)}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`shot ${shot.n} console: ${m.text().slice(0, 200)}`);
    });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?shot=${shot.n}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__NB && window.__NB.ready, null, { timeout: 30000 });
    await page.waitForTimeout(2500); // let the heli, rain and lamps settle
    await page.screenshot({ path: `screenshots/${shot.file}`, type: 'jpeg', quality: 82 });
    console.log(`shot ${shot.n} ${shot.file}: ${shot.title}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
process.exit(errors.length ? 1 : 0);
