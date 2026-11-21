// Neon Bay — tools/capture.mjs: takes the four staged screenshots.
// Serves game/ on a local port, opens each ?shot= URL in headless
// Chromium (Playwright), waits for the game to render, and saves a
// 1280x720 JPEG into screenshots/.
//
//   node tools/capture.mjs
//
// Requires the `playwright` package and a Chromium build
// (npx playwright install chromium). The game itself needs no network:
// the page makes zero requests outside localhost.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const PORT = Number(process.env.PORT ?? 8091);

function serve() {
  return new Promise((resolveServe, rejectServe) => {
    const child = spawn(process.execPath, [join(root, 'serve.ts'), ], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'ignore',
    });
    child.on('error', rejectServe);
    setTimeout(() => resolveServe(child), 1200);
  });
}

async function main() {
  const { chromium } = await import('playwright');
  const server = await serve();
  const browser = await chromium.launch();
  try {
    for (const shot of shots.shots) {
      const page = await browser.newPage({ viewport: { width: shots.width, height: shots.height } });
      const errors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', (err) => errors.push(String(err)));
      const url = shot.url.replace('http://localhost:8080', `http://localhost:${PORT}`);
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__NEONBAY__ && window.__NEONBAY__.ready, null, { timeout: 20000 });
      await page.waitForTimeout(2500);
      const out = join(root, 'screenshots', shot.file);
      await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
      const state = await page.evaluate(() => ({
        errors: window.__NEONBAY__.errors,
        frames: window.__NEONBAY__.frames,
      }));
      console.log(`${shot.file}: frames=${state.frames} consoleErrors=${errors.length + state.errors.length}`);
      if (errors.length || state.errors.length) console.warn('  errors:', [...errors, ...state.errors].slice(0, 5));
      await page.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('Neon Bay: screenshots done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
