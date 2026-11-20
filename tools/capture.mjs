// Capture the 4 staged screenshots (1280x720, JPEG q82, each <= 256 KiB).
// Serves game/ on a local port, screenshots each ?shot=N with headless Chromium
// (SwiftShader WebGL), converts PNG -> JPEG with Pillow, writes screenshots/.
// Usage: node tools/capture.mjs [--port 8901]
import { execFile, spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const gameDir = join(root, 'game');
const outDir = join(root, 'screenshots');
const port = Number(process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] || 8901);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const SHOTS = [
  [1, '1-beach-chase.jpg'],
  [2, '2-market-battle.jpg'],
  [3, '3-heist.jpg'],
  [4, '4-highway-escape.jpg'],
];

const run = (cmd, args) => new Promise((resolve, reject) => {
  execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) reject(new Error(`${cmd} ${args.join(' ')}: ${stderr || err.message}`));
    else resolve(stdout);
  });
});

async function main() {
  mkdirSync(outDir, { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', String(port)], { cwd: gameDir, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
  try {
    for (const [n, name] of SHOTS) {
      const png = `/tmp/neonbay-shot${n}.png`;
      const jpg = join(outDir, name);
      await run(CHROME, [
        '--headless=new', '--no-sandbox', '--disable-gpu',
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        '--window-size=1280,720', '--hide-scrollbars',
        '--virtual-time-budget=12000',
        `--screenshot=${png}`, `http://localhost:${port}/index.html?shot=${n}`,
      ]);
      await run('python3', ['-c',
        `from PIL import Image; im = Image.open(${JSON.stringify(png)}).convert('RGB'); ` +
        `im.save(${JSON.stringify(jpg)}, 'JPEG', quality=82, optimize=True)`]);
      const size = statSync(jpg).size;
      console.log(`${name}: ${size} bytes ${size <= 262144 ? 'OK' : 'OVER 256 KiB!'}`);
      if (size > 262144) throw new Error(`${name} exceeds 256 KiB`);
      rmSync(png, { force: true });
    }
    console.log('All 4 screenshots captured.');
  } finally {
    server.kill();
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
