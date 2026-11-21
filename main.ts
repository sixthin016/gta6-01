// main.ts — Neon Bay's hand-in program (Node 22, standard library only).
// It copies the playable game (game/) and its four screenshots
// (screenshots/) into the output directory and writes the dossier the
// scorer checks, using the kit's buildDossier verbatim.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(name: string): void {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) throw new Error(`main.ts: missing ${name}/ in the repository`);
  mkdirSync(outDir, { recursive: true });
  cpSync(src, dst, { recursive: true, force: true });
}

copyTree('game');
copyTree('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Neon Bay handed in: ${outDir}/dossier.json (${dossier.length} bytes)`);
