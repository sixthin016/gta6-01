// Neon Bay — city.js
// The city layout: pure data about WHERE things are. Three.js meshes are
// built from this in world.js; collisions are pure geometry here.

import { CONFIG, districtAt } from './config.js';
import { makeRng } from './random.js';

const ROOF_COLORS = [0xe2574c, 0xf2a541, 0x4c9de0, 0x9b59d0, 0x2ec4b6, 0xf2708a, 0x8bc34a, 0xff8c42, 0xe8e4da, 0x5a6b7d];

// Named places the missions and the HUD point at.
export const PLACES = {
  garage:    { name: "Rook's Garage",       x: -104, z: -104 },
  pier:      { name: 'Neon Pier',           x: 208,  z: 52 },
  marina:    { name: 'Marina',              x: 208,  z: -104 },
  store:     { name: 'Sunset Corner Store', x: -52,  z: 52 },
  baymart:   { name: 'Bay Mart',            x: 104,  z: 104 },
  bank:      { name: 'Bay Trust Bank',      x: 52,   z: -52 },
  hideout:   { name: 'Hideout',             x: -156, z: 156 },
  villa:     { name: 'Palm Villa',          x: 0,    z: 208 },
  lighthouse:{ name: 'Lighthouse Point',    x: 208,  z: 156 },
  plaza:     { name: 'Palm Plaza',          x: 0,    z: 0 },
  diner:     { name: 'Neon Diner',          x: -52,  z: -156 },
  stadium:   { name: 'Bay Stadium',         x: 104,  z: 156 },
  cityhall:  { name: 'City Hall',           x: 0,    z: -52 },
  docks:     { name: 'Container Yard',      x: -208, z: -104 },
  plant:     { name: 'Power Plant',         x: -52,  z: -208 },
  tower:     { name: 'Radio Tower',         x: 156,  z: -156 },
  watertower:{ name: 'Water Tower',         x: 208,  z: -208 },
  casino:    { name: 'Casino Royale Bay',   x: 104,  z: -104 },
  beach:     { name: 'Sunset Beach',        x: 208,  z: 104 },
};

// Shop and safehouse interiors: simple lit rooms built off the city grid
// (east/west of the island, beyond the streets) so entering one is a real
// change of place, not a menu over the street. The door sits on the south
// wall; walking to it and pressing E steps back outside.
export const INTERIORS = {
  shop:      { x: 380,  z: 0, w: 18, d: 13, name: 'Shop interior' },
  safehouse: { x: -380, z: 0, w: 18, d: 13, name: 'Safehouse interior' },
};

// Street-race ring: 8 checkpoints around the island, used by mission 5.
export const RACE_RING = [
  { x: -104, z: -104 }, { x: 104, z: -104 }, { x: 208, z: -52 },
  { x: 208, z: 104 },   { x: 104, z: 208 },  { x: -104, z: 208 },
  { x: -208, z: 104 },  { x: -208, z: -104 },
];

export function streetLines() {
  const lines = [];
  for (let v = -CONFIG.worldSize / 2; v <= CONFIG.worldSize / 2; v += CONFIG.roadSpacing) lines.push(v);
  return lines;
}

export function generateCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const signs = [];
  const lines = streetLines();
  const beachX = 190;
  for (let i = 0; i < lines.length - 1; i += 1) {
    for (let j = 0; j < lines.length - 1; j += 1) {
      const x0 = lines[i] + CONFIG.roadWidth / 2 + 3;
      const z0 = lines[j] + CONFIG.roadWidth / 2 + 3;
      const x1 = lines[i + 1] - CONFIG.roadWidth / 2 - 3;
      const z1 = lines[j + 1] - CONFIG.roadWidth / 2 - 3;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      if (cx > beachX - 10) continue; // beach stays open
      const district = districtAt(cx, cz);
      if (Math.abs(cx) < 32 && Math.abs(cz) < 32) {
        // Palm Plaza: open square with palms and a neon sign.
        for (let t = 0; t < 8; t += 1) palms.push({ x: rng.range(x0 + 4, x1 - 4), z: rng.range(z0 + 4, z1 - 4) });
        signs.push({ x: cx, z: cz - 6, text: 'NEON BAY', color: 0xff2e88 });
        continue;
      }
      const count = rng.chance(0.35) ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = count === 1 ? rng.range(16, 26) : rng.range(11, 15);
        const d = count === 1 ? rng.range(14, 22) : rng.range(10, 14);
        const bx = count === 1 ? cx - w / 2 : x0 + 2 + k * (x1 - x0 - 4 - w);
        const bz = cz - d / 2;
        const downtown = district.name === 'Downtown';
        buildings.push({
          x: bx, z: bz, w, d,
          h: rng.range(8, 34) * (downtown ? 1.7 : 1),
          color: rng.pick(ROOF_COLORS),
          roof: rng.pick([0xffffff, 0xffe9a8, 0xcfe8ff]),
          district: district.name,
        });
      }
      palms.push({ x: x0 + 3, z: z0 + 3 });
      palms.push({ x: x1 - 3, z: z1 - 3 });
      if (rng.chance(0.3)) {
        signs.push({
          x: rng.range(x0, x1), z: z0 + 1,
          text: rng.pick(['HOTEL', 'CASINO', 'BAR', 'TACOS', '24H', 'PIER', 'CLUB']),
          color: rng.pick([0xff2e88, 0x00e5ff, 0xffd166, 0x7dff8a]),
        });
      }
    }
  }
  for (const x of lines) for (const z of lines) lamps.push({ x: x + CONFIG.roadWidth / 2 + 1.5, z: z - CONFIG.roadWidth / 2 - 1.5 });
  for (let z = -180; z <= 180; z += 24) palms.push({ x: beachX + 6, z });
  const parked = [
    { x: -78, z: -52, angle: Math.PI / 2, color: 0xd23b3b, model: 'coupe', mission: 2 },
    { x: 26,  z: 0,   angle: 0,           color: 0x2b6fd6, model: 'sedan', mission: -1 },
    { x: -26, z: 78,  angle: Math.PI / 2, color: 0xe8b93a, model: 'sedan', mission: -1 },
    { x: 78,  z: -78, angle: 0,           color: 0x37b268, model: 'hatch', mission: -1 },
    { x: -156, z: 26, angle: Math.PI / 2, color: 0xdddddd, model: 'sedan', mission: -1 },
    { x: 156, z: 104, angle: 0,           color: 0x8a4fd0, model: 'hatch', mission: -1 },
    { x: 0,   z: -156, angle: Math.PI / 2, color: 0xe86a2a, model: 'coupe', mission: -1 },
    { x: -104, z: 156, angle: 0,          color: 0x2ec4b6, model: 'sedan', mission: -1 },
  ];
  return { buildings, palms, lamps, signs, parked, lines, beachX, waterX: 232 };
}

function nearestLineValue(value, lines) {
  let best = lines[0];
  for (const l of lines) if (Math.abs(value - l) < Math.abs(value - best)) best = l;
  return best;
}

export function nearestIntersection(x, z, lines) {
  return { x: nearestLineValue(x, lines), z: nearestLineValue(z, lines) };
}

export function onRoad(x, z, lines) {
  return Math.abs(x - nearestLineValue(x, lines)) < CONFIG.roadWidth / 2
    || Math.abs(z - nearestLineValue(z, lines)) < CONFIG.roadWidth / 2;
}

/** Circle-vs-city collision. `extra` is an optional list of {x,z,r} blockers (roadblocks). */
export function collideCircle(city, x, z, r, extra) {
  const H = CONFIG.worldSize / 2;
  if (x < -H + r || x > H - r || z < -H + r || z > H - r) return { edge: true };
  if (x + r > city.waterX) return { water: true };
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cz = Math.max(b.z, Math.min(z, b.z + b.d));
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) return b;
  }
  if (extra) {
    for (const e of extra) {
      const dx = x - e.x, dz = z - e.z;
      if (dx * dx + dz * dz < (r + (e.r || 2)) * (r + (e.r || 2))) return e;
    }
  }
  return null;
}

export function resolveCircle(city, x, z, r, extra) {
  const hit = collideCircle(city, x, z, r, extra);
  if (!hit) return { x, z, hit: null };
  const H = CONFIG.worldSize / 2;
  if (hit.edge) return { x: Math.max(-H + r, Math.min(H - r, x)), z: Math.max(-H + r, Math.min(H - r, z)), hit };
  if (hit.water) return { x: city.waterX - r, z, hit };
  if (hit.r !== undefined) {
    // round blocker (roadblock): push radially out
    const dx = x - hit.x, dz = z - hit.z;
    const d = Math.hypot(dx, dz) || 0.01;
    const push = r + hit.r - d;
    return { x: x + (dx / d) * push, z: z + (dz / d) * push, hit };
  }
  const left = x + r - hit.x, right = hit.x + hit.w - (x - r);
  const top = z + r - hit.z, bottom = hit.z + hit.d - (z - r);
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: hit.x - r, z, hit };
  if (m === right) return { x: hit.x + hit.w + r, z, hit };
  if (m === top) return { x, z: hit.z - r, hit };
  return { x, z: hit.z + hit.d + r, hit };
}

export { districtAt };
