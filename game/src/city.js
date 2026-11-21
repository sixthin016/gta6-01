// city.js — Neon Bay, an invented island city. Five districts on a road
// grid around a downtown core, a beach on the south shore, docks in the
// north, and a causeway bridge to the east. Everything is procedural
// boxes/cylinders from one seed, so the map is identical every load.
import * as THREE from 'three';
import { makeRng, clamp } from './rng.js';

export const CITY_HALF = 280;
export const ROAD_STEP = 70;
export const ROAD_COORDS = [-210, -140, -70, 0, 70, 140, 210];

export const DISTRICTS = [
  { id: 'beach', name: 'Palmaro Beach', color: 0xf2c14e, bounds: [-280, 140, 280, 280], blurb: 'Golden sand, boardwalk arcades, the long beach road.' },
  { id: 'marina', name: 'Old Marina', color: 0x4ecdc4, bounds: [-280, -280, -70, 140], blurb: 'Fishing boats, fish markets, narrow pastel streets.' },
  { id: 'downtown', name: 'Downtown Neon', color: 0xff5da2, bounds: [-70, -70, 70, 140], blurb: 'Glass towers, neon signs, the heart of the city.' },
  { id: 'market', name: 'Calle Verde', color: 0xff9f43, bounds: [70, -280, 280, 140], blurb: 'Night market stalls, murals, crowded sidewalks.' },
  { id: 'docks', name: 'North Docks', color: 0x95a5a6, bounds: [-70, -280, 70, -280 + 210], blurb: 'Cranes, containers, warehouses by the freight port.' },
];

export function districtAt(x, z) {
  if (z >= 140) return DISTRICTS[0];
  if (x < -70) return DISTRICTS[1];
  if (x >= -70 && x <= 70 && z >= -70) return DISTRICTS[2];
  if (x > 70) return DISTRICTS[3];
  return DISTRICTS[4];
}

export function nearestRoadCoord(v) {
  let best = ROAD_COORDS[0];
  for (const c of ROAD_COORDS) if (Math.abs(c - v) < Math.abs(best - v)) best = c;
  return best;
}

function lam(color, emissive = 0x000000, intensity = 1) {
  return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: intensity });
}

export function buildCity(scene) {
  const rng = makeRng(20261121);
  const colliders = [];
  const lamps = [];
  const palms = [];
  const buildings = [];
  const group = new THREE.Group();
  group.name = 'NeonBayCity';
  scene.add(group);

  // Ground: island slab with a sandy south beach and grass inland.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(640, 640), lam(0x3d7a4a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  group.add(ground);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(640, 68), lam(0xe8d29a));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.02, 246);
  group.add(beach);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(640, 90), lam(0x1a6f8e));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, 325);
  group.add(sea);

  // Roads: dark asphalt strips with pale centre dashes, plus sidewalks.
  const roadMat = lam(0x2b2f36);
  const dashMat = lam(0xd8d8c8);
  for (const c of ROAD_COORDS) {
    for (const horizontal of [true, false]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 580 : 10, 0.12, horizontal ? 10 : 580), roadMat);
      strip.position.set(horizontal ? 0 : c, 0.06, horizontal ? c : 0);
      group.add(strip);
      for (let d = -260; d <= 260; d += 26) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 5 : 0.7, 0.14, horizontal ? 0.7 : 5), dashMat);
        dash.position.set(horizontal ? d : c, 0.13, horizontal ? c : d);
        group.add(dash);
      }
    }
  }

  // Buildings: one per block, height by district (towers downtown, low
  // pastel rows at the beach and marina, warehouses at the docks).
  const palette = [0xe07a5f, 0xf2c14e, 0x81b29a, 0x6d9dc5, 0xf4a261, 0xe76f51, 0x8ecae6, 0xffb4a2];
  const windowMat = lam(0xffe9a8, 0xffc861, 0.9);
  for (let gx = -3; gx <= 2; gx++) {
    for (let gz = -3; gz <= 2; gz++) {
      const cx = gx * ROAD_STEP + ROAD_STEP / 2;
      const cz = gz * ROAD_STEP + ROAD_STEP / 2;
      if (cz > 150) continue; // beach stays open
      const d = districtAt(cx, cz);
      const tall = d.id === 'downtown';
      const h = tall ? rng.range(38, 95) : d.id === 'docks' ? rng.range(8, 16) : rng.range(9, 26);
      const w = rng.range(22, 34);
      const dep = rng.range(22, 34);
      const color = d.id === 'downtown' ? rng.pick([0x3a4a6b, 0x2e3d5c, 0x4a3a5e]) : rng.pick(palette);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dep), lam(color));
      b.position.set(cx + rng.range(-4, 4), h / 2, cz + rng.range(-4, 4));
      group.add(b);
      buildings.push(b);
      colliders.push({ x: b.position.x, z: b.position.z, hx: w / 2 + 1, hz: dep / 2 + 1 });
      // Lit window strips on towers, rooftop box on low buildings.
      if (tall) {
        for (let f = 0; f < 5; f++) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.8, dep + 0.3), windowMat);
          strip.position.set(b.position.x, 6 + f * (h / 5.2), b.position.z);
          group.add(strip);
        }
        const crown = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), lam(0xff5da2, 0xff2d78, 1.4));
        crown.position.set(b.position.x, h + 1.5, b.position.z);
        group.add(crown);
      } else {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 2.4, dep * 0.4), lam(0x5a4a3a));
        roof.position.set(b.position.x, h + 1.2, b.position.z);
        group.add(roof);
      }
      // Neon shop sign on street-facing buildings.
      if (rng.chance(0.55)) {
        const signColor = rng.pick([0xff2d78, 0x00e5ff, 0xffd166, 0x7cff6b]);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(rng.range(6, 12), 1.1, 0.5), lam(signColor, signColor, 1.6));
        sign.position.set(b.position.x, rng.range(4, 7), b.position.z + dep / 2 + 0.4);
        group.add(sign);
      }
    }
  }

  // Palm trees along the beach road and the marina promenade.
  const trunkMat = lam(0x8a6b4a);
  const leafMat = lam(0x2f9e44);
  for (let i = 0; i < 46; i++) {
    const x = -260 + i * 11.5 + rng.range(-3, 3);
    const z = i % 2 === 0 ? 168 : 152;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = rng.range(-0.08, 0.08);
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 7), leafMat);
    crown.position.set(x, 8.2, z);
    group.add(crown);
    palms.push(trunk);
  }

  // Night-market stalls on Calle Verde: striped awnings over goods crates.
  const stallColors = [0xff6b6b, 0x48dbfb, 0xfeca57, 0x1dd1a1];
  for (let i = 0; i < 10; i++) {
    const sx = 130 + (i % 5) * 18;
    const sz = i < 5 ? -88 : -52;
    const stall = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 4), lam(0x8d6e63));
    stall.position.set(sx, 1.2, sz);
    group.add(stall);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.35, 4.6), lam(stallColors[i % 4], stallColors[i % 4], 0.7));
    awning.position.set(sx, 2.9, sz);
    awning.rotation.z = 0.06;
    group.add(awning);
    const goods = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.9, 3), lam(stallColors[(i + 2) % 4]));
    goods.position.set(sx, 2.9, sz);
    group.add(goods);
    colliders.push({ x: sx, z: sz, hx: 3.8, hz: 2.3 });
  }

  // Beach umbrellas and loungers on the sand south of the beach road.
  for (let i = 0; i < 8; i++) {
    const ux = -240 + i * 68 + rng.range(-8, 8);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6), lam(0xd8d8d8));
    pole.position.set(ux, 1.5, 238);
    group.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(3, 1.4, 8), lam(stallColors[i % 4]));
    shade.position.set(ux, 3.4, 238);
    group.add(shade);
  }

  // Street lamps on every intersection; their glow is switched on at night.
  const poleMat = lam(0x3a3f47);
  const bulbMat = lam(0xfff2b0, 0xffdf6b, 1.2);
  for (const cx of ROAD_COORDS) {
    for (const cz of ROAD_COORDS) {
      if (Math.abs(cx) > 210 || Math.abs(cz) > 210) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.5, 6), poleMat);
      pole.position.set(cx + 6.5, 3.25, cz + 6.5);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
      bulb.position.set(cx + 6.5, 6.7, cz + 6.5);
      group.add(bulb);
      lamps.push(bulb);
    }
  }

  // Docks: shipping containers and two cranes in the north.
  const contColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12];
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 2.6), lam(contColors[i % 4]));
    c.position.set(-60 + (i % 6) * 14, 1.3 + Math.floor(i / 6) * 2.7, -245 + Math.floor(i / 6) * 0);
    c.rotation.y = rng.range(-0.06, 0.06);
    group.add(c);
    colliders.push({ x: c.position.x, z: c.position.z, hx: 6.2, hz: 1.6 });
  }
  for (const cx of [-40, 30]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 34, 3), lam(0xd35400));
    tower.position.set(cx, 17, -252);
    group.add(tower);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(26, 2, 2), lam(0xe67e22));
    arm.position.set(cx + 10, 32, -252);
    group.add(arm);
  }

  // Causeway bridge east, over the water, to the small airstrip island.
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(90, 1.2, 12), lam(0x4a4f58));
  bridge.position.set(320, 2.5, 0);
  group.add(bridge);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(60, 0.3, 20), lam(0x555a63));
  strip.position.set(390, 0.4, 0);
  group.add(strip);

  // Downtown plaza fountain + the "Neon Bay" gateway arch on the beach road.
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 1.2, 20), lam(0x7fb3d5));
  fountain.position.set(0, 0.6, 35);
  group.add(fountain);
  const archMat = lam(0xff2d78, 0xff2d78, 1.1);
  for (const side of [-9, 9]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), archMat);
    pillar.position.set(side, 6, 210);
    group.add(pillar);
  }
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 1.6), archMat);
  archTop.position.set(0, 12.5, 210);
  group.add(archTop);

  return { group, colliders, lamps, palms, buildings, rng };
}

// Circle (player / car) vs building AABB push-out. Returns corrected x,z.
export function collideCircle(city, x, z, radius) {
  let nx = x, nz = z;
  for (const c of city.colliders) {
    const dx = nx - c.x, dz = nz - c.z;
    const px = c.hx + radius - Math.abs(dx);
    const pz = c.hz + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) nx = c.x + (dx > 0 ? c.hx + radius : -(c.hx + radius));
      else nz = c.z + (dz > 0 ? c.hz + radius : -(c.hz + radius));
    }
  }
  nx = clamp(nx, -CITY_HALF, 430);
  nz = clamp(nz, -CITY_HALF, CITY_HALF);
  return { x: nx, z: nz };
}
