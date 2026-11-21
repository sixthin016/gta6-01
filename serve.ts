// serve.ts — tiny static file server for Neon Bay (Node 22, stdlib only).
// Serves game/ at http://localhost:8080 so the game can be played and
// play-tested in a desktop browser. No build step, no network calls.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

const portArg = process.argv.find((a) => a.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1], 10) : 8080;

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = normalize(join(root, rel));
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(readFileSync(file));
    if (process.env.NB_LOG) console.log(`${req.method} ${url.pathname} -> 200`);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(`server error: ${(err as Error).message}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Neon Bay served at http://127.0.0.1:${port}/`);
});
