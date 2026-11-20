// Capture the four staged screenshots with chrome-headless-shell (Playwright's
// cached build): serve game/ on :8091, load each ?shot= URL at 1280x720, wait
// for window.__shotReady via --virtual-time-budget, dump a PNG, then convert
// to JPEG quality 82 and shrink the quality until each file is at most 256 KiB.
// Usage: node tools/capture.mjs  (run from the repository root)
import { spawn, execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;
const SHOTS = JSON.parse(readFileSync('shots.json', 'utf8'));
const PORT = 8091;

function serve() {
  return new Promise((resolve) => {
    const proc = spawn('node', ['serve.ts', '--port', String(PORT)], { stdio: 'pipe' });
    proc.stdout.on('data', (d) => { if (String(d).includes('game/ is on')) resolve(proc); });
    setTimeout(() => resolve(proc), 3000);
  });
}

async function shotPng(shot, outPng) {
  const url = `http://127.0.0.1:${PORT}/index.html${shot.query}`;
  await execFileAsync(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--window-size=1280,720`, '--virtual-time-budget=8000',
    `--screenshot=${outPng}`, url,
  ], { timeout: 60000 });
}

async function toJpeg(png, jpg) {
  let quality = 84;
  for (;;) {
    await execFileAsync('ffmpeg', ['-y', '-v', 'error', '-i', png, '-q:v', String(Math.round((100 - quality) / 5)), jpg]);
    if (statSync(jpg).size <= 262144 || quality <= 40) return statSync(jpg).size;
    quality -= 8;
  }
}

const server = await serve();
mkdirSync('screenshots', { recursive: true });
for (const shot of SHOTS) {
  const png = `/tmp/r8-${shot.name}.png`;
  const jpg = join('screenshots', shot.name);
  await shotPng(shot, png);
  const size = await toJpeg(png, jpg);
  console.log(`${shot.name}: ${size} bytes`);
}
server.kill();
console.log('done');
