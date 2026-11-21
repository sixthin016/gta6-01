// capture.mjs — take Neon Bay's four staged screenshots with a headless
// Chromium over CDP (Node's built-in WebSocket, no dependencies). Serves
// the repo on a local port, waits for each shot's __shotReady flag, and
// writes 1280x720 JPEGs under screenshots/ (re-encoding smaller when a
// shot would pass the 256 KiB cap). Also runs a freeroam smoke check and
// reports console errors.
//
//   node tools/capture.mjs [--port 8901] [--shots 1,2,3,4]
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shotsJson = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
const args = process.argv.slice(2);
const port = parseInt((args.find((a) => a.startsWith('--port=')) || '--port=8901').slice(7), 10);
const want = (args.find((a) => a.startsWith('--shots=')) || '--shots=1,2,3,4').slice(8).split(',').map((s) => parseInt(s, 10));
const outDir = join(repo, 'screenshots');
mkdirSync(outDir, { recursive: true });

const CHROME_CANDIDATES = [
  join(homedir(), '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'),
  join(homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome'),
];
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) throw new Error('no chromium found under ~/.cache/ms-playwright');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }

  async send(method, params) {
    await this.ready;
    const id = ++this.id;
    const p = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    return p;
  }

  async evalJs(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r.result ? r.result.value : undefined;
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  // 1. serve the repo
  const server = spawn(process.execPath, ['serve.ts', `--port=${port}`], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  try {
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/game/index.html`);
        if (res.ok) break;
      } catch (e) { /* not up yet */ }
      await sleep(250);
    }
    // 2. launch chromium headless with software WebGL
    const cdpPort = port + 77;
    const chromeProc = spawn(chrome, [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--window-size=1280,720',
      '--mute-audio',
      `http://127.0.0.1:${port}/game/index.html`,
    ], { stdio: 'ignore' });
    try {
      let targets = [];
      for (let i = 0; i < 60; i++) {
        try {
          targets = await getJson(`http://127.0.0.1:${cdpPort}/json/list`);
          if (targets.find((t) => t.type === 'page')) break;
        } catch (e) { /* not up yet */ }
        await sleep(500);
      }
      const page = targets.find((t) => t.type === 'page');
      if (!page) throw new Error('no page target; server log: ' + serverLog.slice(-500));
      const cdp = new CDP(page.webSocketDebuggerUrl);
      await cdp.send('Page.enable');
      await cdp.send('Runtime.enable');
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

      // 3. smoke check: freeroam loads with no uncaught errors
      await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/game/index.html?shot=0` });
      let ready = false;
      for (let i = 0; i < 120; i++) {
        await sleep(500);
        try {
          ready = await cdp.evalJs('window.__gameReady === true');
        } catch (e) { /* page still loading */ }
        if (ready) break;
      }
      const errors = cdp.events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
      console.log('smoke: gameReady=' + ready + ' consoleErrors=' + errors.length);
      for (const e of errors.slice(0, 5)) console.log('  ERR', JSON.stringify(e.params).slice(0, 400));

      // 4. the four staged shots
      for (const shot of shotsJson.shots) {
        if (!want.includes(shot.id)) continue;
        const url = `http://127.0.0.1:${port}${shot.url}`;
        await cdp.send('Page.navigate', { url });
        let shotReady = false;
        for (let i = 0; i < 160; i++) {
          await sleep(500);
          try {
            shotReady = await cdp.evalJs('window.__shotReady === true');
          } catch (e) { /* loading */ }
          if (shotReady) break;
        }
        console.log(`shot ${shot.id} (${shot.title}): ready=${shotReady}`);
        const out = join(outDir, shot.file);
        let quality = 88;
        for (let attempt = 0; attempt < 3; attempt++) {
          const img = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality });
          writeFileSync(out, Buffer.from(img.data, 'base64'));
          const size = statSync(out).size;
          console.log(`  ${shot.file}: ${size} bytes @ quality ${quality}`);
          if (size <= 256 * 1024) break;
          quality -= 14;
        }
      }
      cdp.close();
    } finally {
      chromeProc.kill('SIGKILL');
    }
  } finally {
    server.kill('SIGKILL');
  }
  console.log('capture done');
}

main().catch((e) => {
  console.error('capture failed:', e.message);
  process.exit(1);
});
