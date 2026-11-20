// People — pedestrians in varied colors (never black blocks), crew figures,
// the driver with a phone, SWAT operators. Built from simple parts, posed by code.
import * as THREE from 'three';
import { makeRng } from '../core/rng.js';

export const SHIRTS = [0xff5e8a, 0x2ee6ff, 0xffd75e, 0x7dff9a, 0xff8d3c, 0x7a5cff, 0xe8f4ff, 0xd94f30, 0x2e9ec8, 0xc98d5f];
export const PANTS = [0x2a3a5a, 0x3a2a1a, 0x4a4a4a, 0x5a2a3a, 0x2a4a3a, 0x6a6a7a];
export const SKINS = [0xe8b98a, 0xc98d5f, 0xa9713f, 0x8a5a34, 0xf2c9a0];

// A standing person: legs, torso, arms, head — colored, ~1.75m.
export function makePed(opts) {
  const { shirt = 0xff5e8a, pants = 0x2a3a5a, skin = 0xe8b98a, scale = 1, hat = null } = opts || {};
  const p = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 0.18), pantsMat);
  legL.position.set(-0.11, 0.39, 0);
  const legR = legL.clone(); legR.position.x = 0.11;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.26), shirtMat);
  torso.position.y = 1.09; torso.castShadow = true;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, 0.14), shirtMat);
  armL.position.set(-0.3, 1.08, 0);
  const armR = armL.clone(); armR.position.x = 0.3;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skinMat);
  head.position.y = 1.58; head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.175, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: hat || 0x1a1a1a, roughness: 1 }));
  hair.position.y = 1.6;
  p.add(legL, legR, torso, armL, armR, head, hair);
  p.scale.setScalar(scale);
  p.userData = { armL, armR, legL, legR, head, torso };
  return p;
}

// Crouching shooter: lowered torso, one arm extended with a rifle.
export function makeShooter(opts) {
  const p = makePed(opts);
  const u = p.userData;
  u.torso.position.y = 0.82; u.torso.rotation.x = 0.35;
  u.head.position.y = 1.24; u.head.position.z = 0.14;
  u.legL.position.y = 0.28; u.legL.rotation.x = -1.2;
  u.legR.position.y = 0.28; u.legR.rotation.x = -0.5; u.legR.position.z = 0.25;
  u.armL.position.set(-0.28, 0.95, 0.3); u.armL.rotation.x = -1.3;
  u.armR.position.set(0.28, 0.95, 0.3); u.armR.rotation.x = -1.3;
  return p;
}

// Kneeling police officer (bounding overwatch).
export function makeKneelingCop() {
  const p = makePed({ shirt: 0x4a6a8a, pants: 0x2a343e, skin: 0xc98d5f, hat: 0xd8dce2 });
  const u = p.userData;
  u.legL.position.y = 0.2; u.legL.rotation.x = -1.5;
  u.legR.position.y = 0.12; u.legR.rotation.x = 0.2; u.legR.position.z = -0.2;
  u.torso.position.y = 0.72;
  u.head.position.y = 1.12;
  u.armL.rotation.x = -1.2; u.armL.position.set(-0.28, 0.85, 0.25);
  u.armR.rotation.x = -1.2; u.armR.position.set(0.28, 0.85, 0.25);
  // helmet brim
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8dce2 }));
  brim.position.y = 1.16;
  p.add(brim);
  return p;
}

// SWAT operator descending a rope: dark gear, helmet, rifle slung.
export function makeSwat() {
  const p = makePed({ shirt: 0x22262e, pants: 0x1a1e24, skin: 0x8a5a34, hat: 0x0c0e12 });
  const u = p.userData;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x11141a }));
  vest.position.y = 1.1;
  p.add(vest);
  u.armL.rotation.x = -0.9; u.armL.position.set(-0.3, 1.15, 0.2);
  u.armR.rotation.x = -0.9; u.armR.position.set(0.3, 1.15, 0.2);
  return p;
}

// Driver seated in a car, one arm raised holding a phone (GPS visible).
export function makeDriverWithPhone(phoneTexture) {
  const g = new THREE.Group();
  const body = makePed({ shirt: 0x2ee6ff, pants: 0x2a3a5a, skin: 0xc98d5f, hat: 0x111111 });
  const u = body.userData;
  u.legL.rotation.x = -1.4; u.legL.position.set(-0.11, 0.3, 0.3);
  u.legR.rotation.x = -1.4; u.legR.position.set(0.11, 0.3, 0.3);
  u.armL.rotation.x = -1.1; u.armL.position.set(-0.3, 0.95, 0.35);
  // raised arm + phone (bigger, so the GPS screen reads at frame scale)
  u.armR.rotation.x = -2.4; u.armR.position.set(0.32, 1.25, 0.28);
  const phone = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5),
    new THREE.MeshBasicMaterial({ map: phoneTexture }));
  phone.position.set(0.34, 1.72, 0.42);
  phone.rotation.x = -0.5;
  body.add(phone);
  g.add(body);
  return g;
}

// Pedestrian crowd along a sidewalk line.
export function spawnPeds(scene, rngSeed, count, origin, dir, spacing) {
  const rng = makeRng(rngSeed);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const ped = makePed({
      shirt: SHIRTS[rng.int(0, SHIRTS.length - 1)],
      pants: PANTS[rng.int(0, PANTS.length - 1)],
      skin: SKINS[rng.int(0, SKINS.length - 1)],
      scale: 0.92 + rng.next() * 0.16,
    });
    const side = i % 2 === 0 ? 1 : -1;
    ped.position.set(
      origin.x + dir.x * i * spacing + dir.z * side * (2.2 + rng.range(0, 2.5)),
      0,
      origin.z + dir.z * i * spacing - dir.x * side * (2.2 + rng.range(0, 2.5)),
    );
    ped.rotation.y = rng.range(0, Math.PI * 2);
    scene.add(ped);
    peds.push(ped);
  }
  return peds;
}
