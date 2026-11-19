// Neon Bay — make.fun gta6-01 entry program (Node 22).
// Hands the game in: copies game/ and screenshots/ from this repository
// into the output directory and writes dossier.json with buildDossier
// from the kit's vendor/makefun-game.ts. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output.
import { cpSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function main() {
  mkdirSync(out, { recursive: true });
  const gameSrc = join(here, 'game');
  const shotsSrc = join(here, 'screenshots');
  if (!existsSync(gameSrc)) throw new Error('game/ directory missing');
  cpSync(gameSrc, join(out, 'game'), { recursive: true });
  if (existsSync(shotsSrc)) cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });
  const dossier = buildDossier(out, caps);
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`Neon Bay handed in: ${out} (dossier ${dossier.length} bytes)`);
}

main();
