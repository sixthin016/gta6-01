// Neon Bay — the city layout. One job: decide WHERE things are (data only).
// The 3D meshes are built from this data in world.js. Coordinates are x/z
// on the ground plane; y is up. Streets run on a 48-unit grid, the beach
// and open water lie east of the city.
import { CFG, PLACES } from './config.js';
import { range, pick, chance, mulberry32 } from './random.js';

const ROOF_COLORS = [0xe2574c, 0xf2a541, 0x4c9de0, 0x9b59d0, 0x2ec4b6, 0xf2708a, 0x8bc34a, 0xff8c42, 0xe8e4da, 0x5a6b7d];

export function streetLines() {
  const lines = [];
  for (let v = -CFG.worldHalf; v <= CFG.worldHalf; v += CFG.block) lines.push(v);
  return lines;
}

export function generateCity(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const lines = streetLines();
  // One block sits between two neighbouring streets. Fill most blocks with
  // one or two low-poly towers; keep the plaza block open with palms.
  for (let i = 0; i < lines.length - 1; i += 1) {
    for (let j = 0; j < lines.length - 1; j += 1) {
      const x0 = lines[i] + CFG.roadHalf + 3;
      const z0 = lines[j] + CFG.roadHalf + 3;
      const x1 = lines[i + 1] - CFG.roadHalf - 3;
      const z1 = lines[j + 1] - CFG.roadHalf - 3;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      if (cx > CFG.beachX - 10) continue; // beach stays open
      if (Math.abs(cx) < 30 && Math.abs(cz) < 30) {
        for (let t = 0; t < 8; t += 1) palms.push({ x: range(rng, x0 + 4, x1 - 4), z: range(rng, z0 + 4, z1 - 4) });
        continue;
      }
      const count = chance(rng, 0.35) ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = count === 1 ? range(rng, 16, 26) : range(rng, 11, 15);
        const d = count === 1 ? range(rng, 14, 22) : range(rng, 10, 14);
        const bx = count === 1 ? cx - w / 2 : x0 + 2 + k * (x1 - x0 - 4 - w);
        const bz = cz - d / 2;
        buildings.push({
          x: bx, z: bz, w, d,
          h: range(rng, 8, 34) * (Math.abs(cx) < 60 && Math.abs(cz) < 60 ? 1.6 : 1),
          color: pick(rng, ROOF_COLORS),
          roof: pick(rng, [0xffffff, 0xffe9a8, 0xcfe8ff]),
        });
      }
      palms.push({ x: x0 + 3, z: z0 + 3 });
      palms.push({ x: x1 - 3, z: z1 - 3 });
    }
  }
  // Street lamps at intersections, palms along the beach.
  for (const x of lines) for (const z of lines) lamps.push({ x: x + CFG.roadHalf + 1.5, z: z - CFG.roadHalf - 1.5 });
  for (let z = -180; z <= 180; z += 24) palms.push({ x: CFG.beachX + 6, z });
  // Parked cars on the kerb; the first is the red coupe of mission 2.
  const parked = [
    { x: -72, z: -48, angle: Math.PI / 2, color: 0xd23b3b, model: 'coupe', mission: 2 },
    { x: 24, z: 0, angle: 0, color: 0x2b6fd6, model: 'sedan', mission: -1 },
    { x: -24, z: 72, angle: Math.PI / 2, color: 0xe8b93a, model: 'sedan', mission: -1 },
    { x: 72, z: -72, angle: 0, color: 0x37b268, model: 'hatch', mission: -1 },
    { x: -144, z: 24, angle: Math.PI / 2, color: 0xdddddd, model: 'sedan', mission: -1 },
    { x: 144, z: 96, angle: 0, color: 0x8a4fd0, model: 'hatch', mission: -1 },
    { x: 0, z: -144, angle: Math.PI / 2, color: 0xe86a2a, model: 'coupe', mission: -1 },
    { x: -96, z: 144, angle: 0, color: 0x2ec4b6, model: 'sedan', mission: -1 },
  ];
  return { buildings, palms, lamps, parked, lines };
}

function nearestLine(value, lines) {
  let best = lines[0];
  for (const l of lines) if (Math.abs(value - l) < Math.abs(value - best)) best = l;
  return best;
}

export function nearestIntersection(x, z, lines) {
  return { x: nearestLine(x, lines), z: nearestLine(z, lines) };
}

/** True when the point is on a road surface. */
export function onRoad(x, z, lines) {
  return Math.abs(x - nearestLine(x, lines)) < CFG.roadHalf
    || Math.abs(z - nearestLine(z, lines)) < CFG.roadHalf;
}

/** Circle-vs-city collision: buildings are solid, the sea is solid, the edge is solid. */
export function collideCircle(city, x, z, r) {
  const H = CFG.worldHalf;
  if (x < -H + r || x > H - r || z < -H + r || z > H - r) return { edge: true };
  if (x + r > CFG.waterX) return { water: true };
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cz = Math.max(b.z, Math.min(z, b.z + b.d));
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) return b;
  }
  return null;
}

/** Push a circle out of whatever it overlaps; returns the corrected position. */
export function resolveCircle(city, x, z, r) {
  const hit = collideCircle(city, x, z, r);
  if (!hit) return { x, z, hit: null };
  const H = CFG.worldHalf;
  if (hit.edge) return { x: Math.max(-H + r, Math.min(H - r, x)), z: Math.max(-H + r, Math.min(H - r, z)), hit };
  if (hit.water) return { x: CFG.waterX - r, z, hit };
  const left = x + r - hit.x, right = hit.x + hit.w - (x - r);
  const top = z + r - hit.z, bottom = hit.z + hit.d - (z - r);
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: hit.x - r, z, hit };
  if (m === right) return { x: hit.x + hit.w + r, z, hit };
  if (m === top) return { x, z: hit.z - r, hit };
  return { x, z: hit.z + hit.d + r, hit };
}

export { PLACES };
