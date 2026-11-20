// BCPD — Bay City Police Department: wanted levels, named dispatch units,
// roadblocks, spike strips, SWAT rappel, the Rhino tank.
import * as THREE from 'three';
import { makeCar } from './cars.js';
import { makeSwat } from './people.js';
import { makeRng } from '../core/rng.js';

export const UNIT_NAMES = [
  { call: 'UNIT 7 — CRUZ', dist: '120 m' },
  { call: 'UNIT 12 — VEGA', dist: '210 m' },
  { call: 'UNIT 4 — OKAFOR', dist: '340 m' },
  { call: 'AIR ONE — HAWK', dist: '180 m' },
  { call: 'SWAT 2 — REYES', dist: '95 m' },
  { call: 'UNIT 9 — LINDQ', dist: '410 m' },
];

// Wanted level → response: 1 patrol, 2 two cruisers, 3 roadblock, 4 heli, 5 SWAT + Rhino.
export function responseForStars(stars) {
  return {
    cruisers: Math.min(1 + stars, 6),
    roadblock: stars >= 3,
    heli: stars >= 4,
    swat: stars >= 5,
    rhino: stars >= 5,
  };
}

// A roadblock: 2 cruisers angled across the road + barrier + spike strip.
export function makeRoadblock() {
  const g = new THREE.Group();
  const c1 = makeCar({ color: 0xf0f0f0, police: true });
  c1.position.set(-3.2, 0, 0); c1.rotation.y = 0.5;
  const c2 = makeCar({ color: 0xf0f0f0, police: true });
  c2.position.set(3.0, 0, 1.2); c2.rotation.y = -0.45;
  g.add(c1, c2);
  // spike strip
  const strip = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x30343a }));
  strip.add(base);
  for (let i = 0; i < 12; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 0.9, roughness: 0.25 }));
    spike.position.set(-3.3 + i * 0.6, 0.16, 0);
    strip.add(spike);
  }
  strip.position.set(0, 0.06, 5.5);
  g.add(strip);
  // striped barrier
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.9, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
  barrier.position.set(0, 0.5, -4.5);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.28, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xff2020 }));
  stripe.position.set(0, 0.5, -4.5);
  g.add(barrier, stripe);
  return g;
}

// The Rhino tank: heavy hull, turret, long barrel.
export function makeRhino() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x3a4030, roughness: 0.7, metalness: 0.4 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 5.2), hullMat);
  hull.position.y = 0.95; hull.castShadow = true;
  const turret = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 2.2), hullMat);
  turret.position.set(0, 1.9, -0.3);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 8), hullMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 1.95, 2.4);
  g.add(hull, turret, barrel);
  [-1.35, 1.35].forEach((x) => {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 5.4),
      new THREE.MeshStandardMaterial({ color: 0x1c1e1a, roughness: 1 }));
    track.position.set(x, 0.45, 0);
    g.add(track);
  });
  return g;
}

// Two rappel ropes with a SWAT operator actually descending each one.
export function makeRappelTeam(scene, x, y, z) {
  const team = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 });
  [-2.2, 2.2].forEach((dx, i) => {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, y, 5), ropeMat);
    rope.position.set(x + dx, y / 2, z);
    team.add(rope);
    const op = makeSwat();
    op.position.set(x + dx, y * (i === 0 ? 0.42 : 0.62), z);
    op.rotation.y = Math.PI;
    team.add(op);
  });
  scene.add(team);
  return team;
}

// Police chase update (playable mode): cruisers close in, heli circles, wanted decays when hidden.
export function updatePolice(dt, state, playerPos, cruisers, heli) {
  const resp = responseForStars(state.wanted);
  cruisers.forEach((c, i) => {
    if (!c.visible) return;
    const dx = playerPos.x - c.position.x, dz = playerPos.z - c.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const speed = 14 + state.wanted * 2;
    c.position.x += (dx / d) * speed * dt;
    c.position.z += (dz / d) * speed * dt;
    c.rotation.y = Math.atan2(dx, dz);
    if (c.userData.lightBar) {
      const on = Math.floor(performance.now() / 220) % 2 === 0;
      c.userData.lightBar.children[0].visible = on;
      c.userData.lightBar.children[1].visible = !on;
    }
    if (i >= resp.cruisers) c.visible = false;
  });
  if (heli) {
    heli.visible = resp.heli;
    if (resp.heli) {
      const t = performance.now() / 1000;
      heli.position.set(playerPos.x + Math.cos(t * 0.25) * 26, 34, playerPos.z + Math.sin(t * 0.25) * 26);
      heli.rotation.y = Math.atan2(playerPos.x - heli.position.x, playerPos.z - heli.position.z);
      const rotor = heli.getObjectByName('rotor');
      if (rotor) rotor.rotation.y += dt * 22;
    }
  }
  return resp;
}
