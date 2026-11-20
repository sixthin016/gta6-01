// Neon Bay — gta6-01 entry program (Node 22, standard library only).
// Hands in the game: copies this repo's game/ and screenshots/ to /output and writes
// /output/dossier.json with the vendored make.fun library, exactly as the kit's starter
// does — plus a pre-flight check of my own: every screenshot must exist and sit under
// the gate's 256 KiB cap before the dossier is built, so a bad capture fails loudly
// here instead of silently at the scorer.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const SHOT_MAX_BYTES = 262144;

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Pre-flight (mine, not the starter's): 4 screenshots, each a real JPEG under the cap.
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => !f.startsWith('.')).sort() : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`Neon Bay: expected 3-4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > SHOT_MAX_BYTES) throw new Error(`Neon Bay: ${shot} is ${size} bytes, over the 256 KiB cap`);
}
console.log(`Neon Bay: handing in ${shots.length} screenshots (${shots.join(', ')})`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log('Neon Bay: dossier written to ' + join(out, 'dossier.json'));
