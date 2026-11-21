// main.ts — Neon Bay round 10 entry program (Node 22, stdlib only).
// Copies game/ and screenshots/ from this repository to /output and
// writes /output/dossier.json with the kit's buildDossier. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output.
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Start from a clean output dir so a stale file from an older round can
// never leak into the entry (the grader runs this twice; both runs must
// write identical bytes, and a clean slate guarantees it).
rmSync(join(out, 'game'), { recursive: true, force: true });
rmSync(join(out, 'screenshots'), { recursive: true, force: true });
rmSync(join(out, 'dossier.json'), { force: true });
mkdirSync(join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(repo, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(repo, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
const shotNames = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
console.log(`Neon Bay round 10 handed in: ${shotNames.length} screenshots, dossier ${dossier.length} bytes -> ${out}/dossier.json`);
