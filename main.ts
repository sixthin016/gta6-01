// Neon Bay — the entry program. Copies game/ and screenshots/ from this
// repository into the output directory (MAKEFUN_OUTPUT_DIR, or /output),
// then writes dossier.json with buildDossier from vendor/makefun-game.ts.
//
// Node 22, standard library only. It runs twice and writes identical bytes:
// the copy is a plain recursive copy in sorted order, and the dossier is
// built twice in-process and compared before anything is written.

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = resolve(import.meta.dirname);
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

const SCREENSHOT_LIMIT = 256 * 1024;
const INDEX_HTML_LIMIT = 1024 * 1024;

function fail(message: string): never {
  throw new Error('main.ts: ' + message);
}

// Walk a directory and return every entry below it, relative, sorted.
function walk(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(dir, base)).sort()) {
    const rel = base ? base + '/' + name : name;
    const full = join(dir, rel);
    const st = lstatSync(full);
    if (st.isSymbolicLink()) fail('symlink found at ' + rel + ' — game/ must be plain files only');
    if (st.isDirectory()) out.push(...walk(dir, rel));
    else if (st.isFile()) out.push(rel);
    else fail('unsupported entry at ' + rel);
  }
  return out;
}

function isJpeg(bytes: Buffer): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Buffer): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  );
}

function main(): void {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) fail('no game/ directory in the repository');
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) fail('no screenshots/ directory in the repository');

  // --- validate the game tree before copying it anywhere -------------------
  const gameFiles = walk(gameDir);
  if (gameFiles.length > CAPS.game_max_files) {
    fail(`game/ has ${gameFiles.length} files, over the ${CAPS.game_max_files} limit`);
  }
  let gameBytes = 0;
  for (const rel of gameFiles) {
    const bytes = statSync(join(gameDir, rel)).size;
    gameBytes += bytes;
    if (Buffer.byteLength(rel, 'utf8') > CAPS.game_path_max_bytes) fail('game path too long: ' + rel);
  }
  if (gameBytes > CAPS.game_max_bytes) fail(`game/ is ${gameBytes} bytes, over the ${CAPS.game_max_bytes} limit`);
  const indexHtml = join(gameDir, 'index.html');
  if (!existsSync(indexHtml)) fail('game/index.html is missing');
  if (statSync(indexHtml).size > INDEX_HTML_LIMIT) fail('game/index.html is over the 1 MiB limit');

  // --- validate the screenshots ---------------------------------------------
  const shotNames = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
  if (shotNames.length < 3 || shotNames.length > 4) {
    fail(`screenshots/ holds ${shotNames.length} images, need 3 or 4`);
  }
  for (const name of shotNames) {
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith('-') || name.length > 128) {
      fail('bad screenshot name: ' + name);
    }
    const full = join(shotsDir, name);
    if (!statSync(full).isFile()) fail('screenshot is not a regular file: ' + name);
    const bytes = readFileSync(full);
    if (bytes.length > SCREENSHOT_LIMIT) fail(`screenshot ${name} is ${bytes.length} bytes, over the 256 KiB limit`);
    if (!isJpeg(bytes) && !isPng(bytes)) fail('screenshot ' + name + ' is neither a JPEG nor a PNG');
  }

  // --- copy into the output directory ---------------------------------------
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  cpSync(gameDir, join(OUTPUT_DIR, 'game'), { recursive: true });
  cpSync(shotsDir, join(OUTPUT_DIR, 'screenshots'), { recursive: true });

  // --- build the dossier twice; both runs must agree byte for byte ---------
  const first = buildDossier(OUTPUT_DIR, CAPS);
  const second = buildDossier(OUTPUT_DIR, CAPS);
  if (first.length !== second.length || !first.every((b, i) => b === second[i])) {
    fail('buildDossier is not deterministic across two runs');
  }
  if (first.length > 1.5 * 1024 * 1024) fail('dossier.json would be over the 1.5 MiB limit');
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), first);

  // --- report ----------------------------------------------------------------
  const dossier = readFileSync(join(OUTPUT_DIR, 'dossier.json'));
  console.log(`Neon Bay entry written to ${OUTPUT_DIR}`);
  console.log(`  game/: ${gameFiles.length} files, ${gameBytes} bytes`);
  console.log(`  screenshots/: ${shotNames.join(', ')}`);
  console.log(`  dossier.json: ${dossier.length} bytes (deterministic across two runs)`);
}

main();
