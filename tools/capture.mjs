// Neon Bay — screenshot capture. Serves game/ over local HTTP, drives the
// Playwright Chromium headless shell over CDP (Node's built-in WebSocket,
// standard library only) and saves each staged shot as a JPEG under 256 KiB.
//
// Usage: node tools/capture.mjs [1 2 3 4] [--menu]
// Writes screenshots/1-beach-chase.jpg ... 4-highway-escape.jpg

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME_DIR = join(ROOT, 'game');
const SHOTS_DIR = join(ROOT, 'screenshots');
const CHROME = resolve(
  process.env.HOME || '/home/hatch',
  '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell',
);
const PORT = 8917;
const DEBUG_PORT = 9333;
const MAX_BYTES = 256 * 1024;

const SHOTS = [
  { n: 1, file: '1-beach-chase.jpg' },
  { n: 2, file: '2-market-battle.jpg' },
  { n: 3, file: '3-heist.jpg' },
  { n: 4, file: '4-highway-escape.jpg' },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve() {
  return new Promise((resolveServer) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        let path = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
        const file = join(GAME_DIR, path);
        if (!file.startsWith(GAME_DIR)) { res.writeHead(403); res.end(); return; }
        const data = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(data);
      } catch (e) {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(PORT, '127.0.0.1', () => resolveServer(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForJson(path, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}${path}`);
      if (res.ok) return await res.json();
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chrome devtools did not come up at ' + path);
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 500));
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push('CONSOLE: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 500));
      }
    });
  }

  ready() {
    return new Promise((res, rej) => {
      this.ws.addEventListener('open', res);
      this.ws.addEventListener('error', rej);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('page eval failed: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result?.value;
  }

  close() { try { this.ws.close(); } catch (e) { /* ignore */ } }
}

async function captureShot(cdp, shot, quality) {
  const url = `http://127.0.0.1:${PORT}/index.html?shot=${shot.n}`;
  await cdp.send('Page.navigate', { url });
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    const ready = await cdp.eval('window.__neonBayReady === true');
    if (ready) break;
    await sleep(200);
  }
  const ready = await cdp.eval('window.__neonBayReady === true');
  if (!ready) throw new Error('shot ' + shot.n + ' never became ready');
  await sleep(600);
  const shot1 = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality });
  return Buffer.from(shot1.data, 'base64');
}

async function main() {
  const args = process.argv.slice(2);
  const wantMenu = args.includes('--menu');
  const wanted = args.filter((a) => /^[1-4]$/.test(a)).map(Number);
  const list = wanted.length ? SHOTS.filter((s) => wanted.includes(s.n)) : SHOTS;
  await mkdir(SHOTS_DIR, { recursive: true });

  const server = await serve();
  const chrome = spawn(CHROME, [
    '--remote-debugging-port=' + DEBUG_PORT,
    '--window-size=1280,720',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore' });

  const errors = [];
  try {
    const targets = await waitForJson('/json/list');
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target from chrome');
    const cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

    if (wantMenu) {
      await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
      const t0 = Date.now();
      while (Date.now() - t0 < 20000) {
        if (await cdp.eval('window.__neonBayReady === true')) break;
        await sleep(200);
      }
      await sleep(800);
      const img = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      const out = join('/tmp', 'neonbay-menu.jpg');
      await writeFile(out, Buffer.from(img.data, 'base64'));
      console.log('menu -> ' + out + ' (' + (await stat(out)).size + ' bytes)');
    }

    for (const shot of list) {
      let quality = 88;
      let buf = await captureShot(cdp, shot, quality);
      while (buf.length > MAX_BYTES && quality > 55) {
        quality -= 8;
        buf = await captureShot(cdp, shot, quality);
      }
      const out = join(SHOTS_DIR, shot.file);
      await writeFile(out, buf);
      const size = (await stat(out)).size;
      console.log(`${shot.file}: ${size} bytes (quality ${quality}) ${size <= MAX_BYTES ? 'OK' : 'OVER 256KiB!'}`);
      if (size > MAX_BYTES) errors.push(shot.file + ' over 256 KiB at quality ' + quality);
    }
    if (cdp.consoleErrors.length) {
      console.log('PAGE ERRORS:');
      for (const e of cdp.consoleErrors) console.log('  ' + e);
      errors.push('page errors: ' + cdp.consoleErrors.length);
    } else {
      console.log('no page errors');
    }
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
    server.close();
  }
  if (errors.length) {
    console.error('FAILED: ' + errors.join('; '));
    process.exit(1);
  }
  console.log('capture done');
}

main().catch((e) => { console.error(e); process.exit(1); });
