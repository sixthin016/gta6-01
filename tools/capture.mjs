// Neon Bay — screenshot capture. One job: serve game/ locally, open each
// staged shot (?shot=1..4) in headless Chromium at 1280x720, and hand the
// PNGs to tools/convert.py, which writes the JPEGs into screenshots/.
// Run from the repository root: node tools/capture.mjs
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const REPO = join(ROOT);
const TMP = join(REPO, 'tools', 'tmp');
const PORT = 8123;

const CHROME_CANDIDATES = [
  process.env.CHROMIUM,
  join(process.env.HOME, '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome'),
  join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/headless_shell'),
].filter(Boolean);

function findChrome() {
  for (const c of CHROME_CANDIDATES) {
    if (c && existsSync(c)) return c;
  }
  throw new Error('no Chromium found; set CHROMIUM to the browser binary');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`server did not come up at ${url}`);
}

async function main() {
  const chrome = findChrome();
  mkdirSync(TMP, { recursive: true });
  console.log(`capture: chrome=${chrome}`);

  const server = spawn('node', ['serve.ts'], {
    cwd: REPO,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  try {
    await waitForServer(`http://localhost:${PORT}/`);
    for (let shot = 1; shot <= 4; shot++) {
      const out = join(TMP, `${shot}.png`);
      const url = `http://localhost:${PORT}/?shot=${shot}`;
      console.log(`capture: shot ${shot} -> ${out}`);
      execFileSync(chrome, [
        '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        '--force-device-scale-factor=1', '--window-size=1280,720',
        '--virtual-time-budget=8000', `--screenshot=${out}`, url,
      ], { stdio: 'inherit', timeout: 60000 });
      if (!existsSync(out)) throw new Error(`shot ${shot}: no PNG produced`);
    }
  } finally {
    server.kill();
  }
  console.log('capture: converting PNGs to JPEGs...');
  execFileSync('python3', [join(REPO, 'tools', 'convert.py')], { stdio: 'inherit' });
  console.log('capture: done');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
