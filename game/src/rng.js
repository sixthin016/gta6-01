// rng.js — deterministic seeded randomness for Neon Bay.
// Every procedural choice in the city (building heights, traffic colours,
// pedestrian routes, mission spawns) draws from here so a staged scene
// can be replayed exactly from one seed number.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // float in [min, max)
    range(min, max) { return min + next() * (max - min); },
    // integer in [min, max]
    int(min, max) { return Math.floor(min + next() * (max - min + 1)); },
    // pick one element of an array
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    // true with probability p
    chance(p) { return next() < p; },
    // shuffled copy of an array
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    },
    // gaussian-ish value around 0, range roughly [-1, 1]
    gauss() { return (next() + next() + next() - 1.5) / 1.5; },
    // weighted pick: entries are [value, weight]
    pickWeighted(entries) {
      let total = 0;
      for (const [, w] of entries) total += w;
      let roll = next() * total;
      for (const [v, w] of entries) { roll -= w; if (roll <= 0) return v; }
      return entries[entries.length - 1][0];
    },
    // random angle in radians
    angle() { return next() * Math.PI * 2; },
  };
}

// A tiny string hash so district names and mission ids become seeds.
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Clamp helper shared by movement code.
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}
