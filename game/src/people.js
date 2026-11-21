// Neon Bay — people.js: pedestrians who walk the sidewalks and the
// player's crew, who follow, fight beside the player and grant bonuses.
import * as THREE from 'three';
import { makeRng } from './rng.js';

const SHIRTS = [0xff6b6b, 0xffd166, 0x2ec4ff, 0x7dff5e, 0xb388ff, 0xff9e57, 0xf8f9fa, 0x222222];
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

export function makePerson(opts = {}) {
  const group = new THREE.Group();
  const shirt = opts.shirt ?? SHIRTS[Math.floor(Math.random() * SHIRTS.length)];
  const skin = opts.skin ?? SKINS[Math.floor(Math.random() * SKINS.length)];
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const pantsMat = new THREE.MeshLambertMaterial({ color: opts.pants ?? 0x2b3a67 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), shirtMat);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);
  const legs = [];
  for (const x of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.28), pantsMat);
    leg.position.set(x, 0.31, 0);
    group.add(leg);
    legs.push(leg);
  }
  const arms = [];
  for (const x of [-0.38, 0.38]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.2), shirtMat);
    arm.position.set(x, 1.05, 0);
    group.add(arm);
    arms.push(arm);
  }
  if (opts.hat) {
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: opts.hat }));
    hat.position.y = 1.98;
    group.add(hat);
  }
  return { group, legs, arms, health: 100, speed: 0, walkPhase: Math.random() * 6 };
}

export function createPedestrians(scene, colliders, count = 26, seed = 41) {
  const rng = makeRng(seed);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = makePerson({});
    const x = rng.range(-240, 240);
    const z = rng.range(-180, 240);
    p.group.position.set(x, 0, z);
    p.heading = rng.next() * Math.PI * 2;
    p.speed = rng.range(1.2, 2.4);
    p.pause = 0;
    scene.add(p.group);
    peds.push(p);
  }
  return peds;
}

export function updatePedestrians(peds, dt, colliders, playerPos) {
  for (const p of peds) {
    if (p.health <= 0) continue;
    p.pause -= dt;
    if (p.pause > 0) continue;
    // Flee from the player when the player is driving fast or shooting.
    const dx = p.group.position.x - playerPos.x;
    const dz = p.group.position.z - playerPos.z;
    const dist = Math.hypot(dx, dz);
    let heading = p.heading;
    let speed = p.speed;
    if (dist < 6) {
      heading = Math.atan2(dx, dz);
      speed = p.speed * 2.2;
    }
    p.heading = heading;
    const nx = p.group.position.x + Math.sin(heading) * speed * dt;
    const nz = p.group.position.z + Math.cos(heading) * speed * dt;
    const blocked = colliders.some((c) => nx > c.minX && nx < c.maxX && nz > c.minZ && nz < c.maxZ);
    if (!blocked && Math.abs(nx) < 255 && Math.abs(nz) < 255 && nz > -258) {
      p.group.position.x = nx;
      p.group.position.z = nz;
    } else {
      p.heading += Math.PI * (0.5 + Math.random() * 0.5);
      p.pause = 0.4;
    }
    p.group.rotation.y = heading;
    p.walkPhase += dt * speed * 4;
    const swing = Math.sin(p.walkPhase) * 0.5;
    p.legs[0].rotation.x = swing;
    p.legs[1].rotation.x = -swing;
    p.arms[0].rotation.x = -swing * 0.7;
    p.arms[1].rotation.x = swing * 0.7;
  }
}

export const CREW = [
  { id: 'dune', name: 'Dune', role: 'Getaway driver', bonus: 'Cars handle 15% better and top out faster.', shirt: 0x2ec4ff, hat: 0xffd166 },
  { id: 'mara', name: 'Mara', role: 'Hacker', bonus: 'Wanted stars cool down twice as fast.', shirt: 0xff2e88, hat: 0x222222 },
  { id: 'kip', name: 'Kip', role: 'Muscle', bonus: 'You take 25% less damage in fights.', shirt: 0x7dff5e, hat: 0xff6b6b },
];

export function createCrew(scene, recruitedIds, playerPos) {
  const members = [];
  CREW.forEach((def, i) => {
    if (!recruitedIds.includes(def.id)) return;
    const p = makePerson({ shirt: def.shirt, hat: def.hat });
    p.def = def;
    p.group.position.set(playerPos.x + 2 + i * 1.6, 0, playerPos.z + 2);
    scene.add(p.group);
    members.push(p);
  });
  return members;
}

export function updateCrew(members, dt, playerPos, playerMoving) {
  for (const m of members) {
    const dx = playerPos.x - m.group.position.x;
    const dz = playerPos.z - m.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 3.5) {
      const heading = Math.atan2(dx, dz);
      const speed = playerMoving ? 6.5 : 3.5;
      m.group.position.x += Math.sin(heading) * speed * dt;
      m.group.position.z += Math.cos(heading) * speed * dt;
      m.group.rotation.y = heading;
      m.walkPhase += dt * speed * 3.2;
      const swing = Math.sin(m.walkPhase) * 0.5;
      m.legs[0].rotation.x = swing;
      m.legs[1].rotation.x = -swing;
    } else {
      m.legs[0].rotation.x = 0;
      m.legs[1].rotation.x = 0;
    }
  }
}
