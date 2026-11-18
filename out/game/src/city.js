// Neon Bay — the city itself: a sunny grid of streets, colourful blocks, a
// park, a beach and the landmarks the missions use. Generated once from a
// seeded random so the same seed always builds the same Neon Bay.
import {
  PALETTE, ROADS_H, ROADS_V, ROAD_SPACING, ROAD_W, SAND_X, WATER_X,
  WORLD_H, WORLD_W,
} from './config.js';

// Landmarks the story and the missions point at.
export const LANDMARKS = {
  hospital: { x: 1560, y: 330, label: 'Bay General Hospital' },
  safehouse: { x: 600, y: 1800, label: "Rook's Garage" },
  store: { x: 1900, y: 1120, label: 'Sunset Corner Store' },
  garage: { x: 600, y: 1800, label: "Rook's Garage" },
  pier: { x: 2680, y: 2280, label: 'Neon Pier' },
  park: { x: 1000, y: 1400, w: 400, h: 400, label: 'Palm Park' },
};

function nearestRoad(value, roads) {
  let best = roads[0];
  let bestDist = Math.abs(value - best);
  for (const road of roads) {
    const dist = Math.abs(value - road);
    if (dist < bestDist) {
      bestDist = dist;
      best = road;
    }
  }
  return { road: best, dist: bestDist };
}

export function generateCity(rng) {
  const buildings = [];
  const trees = [];
  const lamps = [];
  const benches = [];

  // One block sits between two neighbouring streets. Fill most blocks with
  // one or two colourful buildings; keep the park block green and open.
  for (let bi = 0; bi < ROADS_V.length - 1; bi += 1) {
    for (let bj = 0; bj < ROADS_H.length - 1; bj += 1) {
      const x0 = ROADS_V[bi] + ROAD_W / 2 + 14;
      const y0 = ROADS_H[bj] + ROAD_W / 2 + 14;
      const x1 = ROADS_V[bi + 1] - ROAD_W / 2 - 14;
      const y1 = ROADS_H[bj + 1] - ROAD_W / 2 - 14;
      const isPark = bi === 1 && bj === 2;
      const isHospitalBlock = bi === 2 && bj === 0;
      if (isPark) {
        for (let t = 0; t < 14; t += 1) {
          trees.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20), r: rng.range(9, 15) });
        }
        benches.push({ x: (x0 + x1) / 2, y: y0 + 60 });
        benches.push({ x: (x0 + x1) / 2, y: y1 - 60 });
        continue;
      }
      const count = rng.chance(0.35) ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = count === 1 ? rng.range(150, 230) : rng.range(110, 150);
        const h = count === 1 ? rng.range(130, 210) : rng.range(100, 150);
        const bx = count === 1 ? (x0 + x1) / 2 - w / 2 : x0 + 18 + k * ((x1 - x0 - 36 - w) / 1);
        const by = (y0 + y1) / 2 - h / 2 + (count === 2 && k === 1 ? 0 : 0);
        const colour = isHospitalBlock ? '#f5f5f0' : rng.pick(PALETTE.buildingRoofs);
        buildings.push({
          x: bx, y: by, w, h, color: colour,
          roof: rng.pick(['#ffffff', '#ffe9a8', '#cfe8ff']),
          floors: rng.int(1, 4),
        });
      }
      // A couple of street trees on the block corners.
      trees.push({ x: x0 + 8, y: y0 + 8, r: 10 });
      trees.push({ x: x1 - 8, y: y1 - 8, r: 10 });
    }
  }

  // Street lamps along every street, alternating sides.
  for (const x of ROADS_V) {
    for (const y of ROADS_H) {
      lamps.push({ x: x + ROAD_W / 2 + 8, y: y - ROAD_W / 2 - 8 });
      lamps.push({ x: x - ROAD_W / 2 - 8, y: y + ROAD_W / 2 + 8 });
    }
  }

  // Ammo and health pickups scattered at useful corners.
  const pickups = [
    { x: 600, y: 260, kind: 'ammo' },
    { x: 2200, y: 1400, kind: 'ammo' },
    { x: 1400, y: 260, kind: 'health' },
    { x: 1000, y: 1800, kind: 'health' },
    { x: 2600, y: 600, kind: 'ammo' },
    { x: 1800, y: 2200, kind: 'health' },
  ];

  // Parked cars waiting on the kerb, one of them the red coupe of mission 2.
  const parked = [
    { x: 660, y: 430, angle: Math.PI / 2, color: '#e74c3c', model: 'coupe', mission: 2 },
    { x: 1060, y: 1030, angle: 0, color: '#3498db', model: 'sedan', mission: -1 },
    { x: 1460, y: 630, angle: Math.PI / 2, color: '#f1c40f', model: 'sedan', mission: -1 },
    { x: 2260, y: 1830, angle: 0, color: '#2ecc71', model: 'hatch', mission: -1 },
    { x: 1860, y: 1430, angle: Math.PI / 2, color: '#ecf0f1', model: 'sedan', mission: -1 },
    { x: 660, y: 2230, angle: 0, color: '#9b59b6', model: 'hatch', mission: -1 },
    { x: 2660, y: 1030, angle: Math.PI / 2, color: '#e67e22', model: 'coupe', mission: -1 },
    { x: 1060, y: 2230, angle: 0, color: '#1abc9c', model: 'sedan', mission: -1 },
  ];

  return { buildings, trees, lamps, benches, pickups, parked };
}

/** True when the point is on a road surface (not sidewalk, not a block). */
export function onRoad(x, y) {
  const vx = nearestRoad(x, ROADS_V).dist < ROAD_W / 2;
  const hy = nearestRoad(y, ROADS_H).dist < ROAD_W / 2;
  return vx || hy;
}

/** True when the point is on a sidewalk strip beside a road. */
export function onSidewalk(x, y) {
  const vx = nearestRoad(x, ROADS_V).dist;
  const hy = nearestRoad(y, ROADS_H).dist;
  const half = ROAD_W / 2;
  return (vx >= half && vx < half + 26) || (hy >= half && hy < half + 26);
}

/** Snap a point onto the nearest road centre line, keeping the other axis. */
export function snapToRoad(x, y) {
  const vx = nearestRoad(x, ROADS_V);
  const hy = nearestRoad(y, ROADS_H);
  if (vx.dist <= hy.dist) return { x: vx.road, y };
  return { x, y: hy.road };
}

/** The nearest intersection centre to a point. */
export function nearestIntersection(x, y) {
  return { x: nearestRoad(x, ROADS_V).road, y: nearestRoad(y, ROADS_H).road };
}

/**
 * Circle-vs-city collision: buildings are solid, the sea is solid, the world
 * edge is solid. Returns the first blocking rectangle, or null.
 */
export function collideCircle(city, x, y, r) {
  if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return { x: 0, y: 0, w: WORLD_W, h: WORLD_H, edge: true };
  if (x + r > WATER_X) return { x: WATER_X, y: 0, w: WORLD_W - WATER_X, h: WORLD_H, water: true };
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

/** Push a circle out of whatever it overlaps; returns the corrected position. */
export function resolveCircle(city, x, y, r) {
  const hit = collideCircle(city, x, y, r);
  if (!hit) return { x, y, hit: null };
  if (hit.edge) {
    return { x: Math.max(r, Math.min(WORLD_W - r, x)), y: Math.max(r, Math.min(WORLD_H - r, y)), hit };
  }
  if (hit.water) return { x: WATER_X - r, y, hit };
  // Push out along the smallest penetration axis.
  const left = x + r - hit.x;
  const right = hit.x + hit.w - (x - r);
  const top = y + r - hit.y;
  const bottom = hit.y + hit.h - (y - r);
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: hit.x - r, y, hit };
  if (m === right) return { x: hit.x + hit.w + r, y, hit };
  if (m === top) return { x, y: hit.y - r, hit };
  return { x, y: hit.y + hit.h + r, hit };
}

export { SAND_X, WATER_X };
