// Neon Bay — entrypoint for the make.fun gta6-01 bounty.
//
// What this program does, in order:
//   1. Copies game/ and screenshots/ from this repository into the output
//      directory (MAKEFUN_OUTPUT_DIR, or /output outside the grader).
//   2. Builds /output/dossier.json with buildDossier from vendor/makefun-game.ts.
//   3. Validates its own work: screenshot count and size, game file and byte
//      caps, no symlinks, and that building the dossier twice from the same
//      output yields byte-identical output (determinism).
//
// Node 22+, standard library only. Run from the repository root:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

// Competition caps (RULES.txt): game/ at most 993 entries and 48 MiB,
// index.html at most 1 MiB, screenshots 3-4 files at most 256 KiB each,
// dossier.json at most 1.5 MiB.
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 48 * 1024 * 1024;
const INDEX_HTML_MAX_BYTES = 1024 * 1024;
const SCREENSHOT_MAX_BYTES = 256 * 1024;
const DOSSIER_MAX_BYTES = Math.floor(1.5 * 1024 * 1024);

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function fail(message) {
  throw new Error(`main.ts: ${message}`);
}

function isImageBytes(bytes) {
  const startsWith = (magic) => magic.every((b, i) => bytes[i] === b);
  return startsWith(JPEG_MAGIC) || startsWith(PNG_MAGIC);
}

// Walk game/ once: count entries, sum bytes, refuse symlinks, refuse an
// oversized index.html. Returns { entries, bytes }.
function validateGameTree(gameDir) {
  if (!existsSync(gameDir)) fail('game/ is missing from the repository');
  let entries = 0;
  let bytes = 0;
  const stack = [gameDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const st = lstatSync(path);
      entries += 1;
      if (st.isSymbolicLink()) fail(`game/ holds a symlink: ${path}`);
      if (st.isDirectory()) {
        stack.push(path);
      } else if (st.isFile()) {
        bytes += st.size;
        if (name === 'index.html' && dir === gameDir && st.size > INDEX_HTML_MAX_BYTES) {
          fail(`game/index.html is ${st.size} bytes, over the 1 MiB cap`);
        }
      } else {
        fail(`game/ holds a non-regular file: ${path}`);
      }
    }
  }
  if (entries > GAME_MAX_FILES) fail(`game/ holds ${entries} entries, over the ${GAME_MAX_FILES} cap`);
  if (bytes > GAME_MAX_BYTES) fail(`game/ totals ${bytes} bytes, over the 48 MiB cap`);
  return { entries, bytes };
}

// Screenshots: 3 or 4 real JPEG/PNG files, each within the size cap.
function validateScreenshots(shotsDir) {
  if (!existsSync(shotsDir)) fail('screenshots/ is missing from the repository');
  const names = readdirSync(shotsDir)
    .filter((n) => !n.startsWith('.'))
    .sort();
  if (names.length < 3 || names.length > 4) {
    fail(`screenshots/ holds ${names.length} files, need 3 or 4`);
  }
  const sizes = [];
  for (const name of names) {
    const path = join(shotsDir, name);
    const st = statSync(path);
    if (!st.isFile()) fail(`screenshots/${name} is not a regular file`);
    if (st.size > SCREENSHOT_MAX_BYTES) {
      fail(`screenshots/${name} is ${st.size} bytes, over the 256 KiB cap`);
    }
    const bytes = readFileSync(path);
    if (!isImageBytes(bytes)) fail(`screenshots/${name} is not a JPEG or PNG`);
    sizes.push({ name, bytes: st.size });
  }
  return sizes;
}

function copyTree(src, dest) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, dereference: false });
}

function main() {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');

  // Validate the repository first, before writing anything.
  const game = validateGameTree(gameDir);
  const shots = validateScreenshots(shotsDir);

  // Fresh output: replace only the three paths this program owns.
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyTree(gameDir, join(OUTPUT_DIR, 'game'));
  copyTree(shotsDir, join(OUTPUT_DIR, 'screenshots'));

  const caps = {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: SCREENSHOT_MAX_BYTES },
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: 1000,
  };

  // Determinism: build the dossier twice from the same output and require
  // byte-identical results before writing anything to disk.
  const first = buildDossier(OUTPUT_DIR, caps);
  const second = buildDossier(OUTPUT_DIR, caps);
  if (first.length !== second.length || !first.every((b, i) => b === second[i])) {
    fail('dossier is not deterministic: two builds from the same output differ');
  }
  if (first.length > DOSSIER_MAX_BYTES) {
    fail(`dossier.json would be ${first.length} bytes, over the 1.5 MiB cap`);
  }

  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), first);
  const written = statSync(join(OUTPUT_DIR, 'dossier.json'));
  if (written.size !== first.length) fail('dossier.json was not written whole');

  console.log(`Neon Bay packaged: game ${game.entries} entries / ${game.bytes} bytes, ` +
    `${shots.length} screenshots (${shots.map((s) => `${s.name} ${s.bytes}B`).join(', ')}), ` +
    `dossier.json ${first.length} bytes (deterministic, 2 builds identical) -> ${OUTPUT_DIR}`);
}

main();
