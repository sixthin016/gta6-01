// The four staged shots. Each builds a complete golden-hour scene from the
// shared world builders, then places camera + action inside a tight forward
// cone: hero ~15% of frame in the lower third, all density AHEAD of camera.
// Rule D: no black-block assets — every prop has real color + detail.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import * as TX from './textures.js';
import * as B from './builders.js';
import { makeSky, makeBeachRoad, makeStreet, makeSkyline, makeBuildingRow, makePalmRow } from './world.js';

const TRAFFIC_PAINTS = [0xff5f2e, 0x2ee6a8, 0xffd24d, 0x4da6ff, 0xff5fa2, 0x9d6bff, 0x37e08a, 0xe0e6f0, 0xff8a3c, 0x2ec4ff];

function addDebris(scene, x, y, z, n, seed) {
  const r = makeRng(seed);
  const mat = new THREE.MeshBasicMaterial({ color: 0xd8d8de, transparent: true, opacity: 0.4 });
  const mat2 = new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.4 });
  for (let i = 0; i < n; i++) {
    // short streaks along the motion direction = motion blur
    const len = r.range(0.3, 0.8);
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), r.next() < 0.75 ? mat : mat2);
    d.position.set(x + r.range(-2.5, 2.5), y + r.range(0.2, 2.6), z + r.range(-4, 4));
    d.rotation.set(r.range(0, 3), r.range(0, 3), r.range(0, 3));
    scene.add(d);
  }
}

function addSmokeTrail(scene, x, y, z, n, seed) {
  const r = makeRng(seed);
  for (let i = 0; i < n; i++) {
    const s = B.makeSmoke(r.range(1.6, 3.4), r.range(0.45, 0.8));
    s.position.set(x + r.range(-0.9, 0.9), y + r.range(0.2, 1.4), z + r.range(0, 2.5) + i * 0.9);
    scene.add(s);
  }
}

function addCasings(scene, x, y, z, n, seed) {
  const r = makeRng(seed);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd24d, roughness: 0.3, metalness: 0.9 });
  for (let i = 0; i < n; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.16), mat);
    c.position.set(x + r.range(-1.2, 1.2), y + r.range(0.6, 2.0), z + r.range(-0.5, 1.5));
    c.rotation.set(r.range(0, 3), r.range(0, 3), 0);
    scene.add(c);
  }
}

// diegetic phone in the driver's hand — small camera-child prop, bottom-left.
// Held up toward the camera: the GPS screen faces the lens, not the sky.
function attachPhone(camera) {
  const g = new THREE.Group();
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.7, 10),
    new THREE.MeshLambertMaterial({ color: 0x4a5a70 }));
  sleeve.rotation.x = 0.5; sleeve.position.set(0, -0.35, 0.05);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xc98d5f }));
  hand.scale.set(1, 0.8, 1.1); hand.position.set(0, 0.02, 0.28);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.9, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x11141c, roughness: 0.3, metalness: 0.6 }));
  phone.position.set(0, 0.5, 0.3); phone.rotation.x = -0.45;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.8),
    new THREE.MeshBasicMaterial({ map: TX.phoneTexture() }));
  screen.position.set(0, 0.5, 0.35); screen.rotation.x = -0.45;
  g.add(sleeve, hand, phone, screen);
  g.scale.setScalar(0.5);
  g.position.set(-0.78, -0.42, -1.35);
  g.rotation.set(0, 0.25, 0);
  camera.add(g);
}

// diegetic smartwatch on the player's wrist — compact, face toward camera
function attachWatch(camera) {
  const g = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.7, 10),
    new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
  arm.rotation.x = 0.5; arm.position.set(0, -0.3, 0.05);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 0.25, metalness: 0.7 }));
  face.position.set(0, 0.28, 0.28); face.rotation.x = -0.4;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.56),
    new THREE.MeshBasicMaterial({ map: TX.watchTexture() }));
  screen.position.set(0, 0.28, 0.34); screen.rotation.x = -0.4;
  g.add(arm, face, screen);
  g.scale.setScalar(0.55);
  g.position.set(-0.78, -0.42, -1.35);
  g.rotation.set(0, 0.25, 0);
  camera.add(g);
}

// ============================================================================
// SHOT 1 — BEACH CHASE, golden hour, teal + sand. Heli WHOLE in frame.
// ============================================================================
export function stageShot1(scene, camera) {
  makeSky(scene, 7);
  makeBeachRoad(scene);
  makeSkyline(scene, 3);
  makeBuildingRow(scene, +1, 60, -120, ['#e06a4d', '#3d7a8c', '#c9a227', '#7a4a8c', '#2e6b62'], 101);
  makePalmRow(scene, -16.5, 55, -110, 16, 201);
  makePalmRow(scene, 16.8, 45, -95, 22, 301);

  // hero car: saturated magenta, counter-steer 15°, NOS flame, brake glow
  const hero = B.makeCar(0xff2e88);
  hero.position.set(0.4, 0, 8);
  hero.rotation.y = 0.26; // ~15° counter-steer
  hero.add(B.makeNosFlame());
  scene.add(hero);
  addSmokeTrail(scene, 0.4, 0.4, 10.5, 9, 401); // 3 layers of tire smoke
  addDebris(scene, 0.4, 0.8, 6, 14, 501); // 12+ debris, motion blur

  // 3 BCPD cruisers in PIT formation — flanking / ahead of the hero, never
  // between camera and hero
  const pit = [
    [-2.9, 4.5, 0.5], [3.3, 4.0, -0.35], [-2.2, -3.5, 0.9],
  ];
  pit.forEach(([x, z, ry], i) => {
    const c = B.makeCar(0xf2f2f2, { police: true });
    c.position.set(x, 0, z); c.rotation.y = ry;
    scene.add(c);
  });

  // traffic queue AHEAD (forward cone) — 8 colored cars, 2 lanes
  const r = makeRng(601);
  const lanes = [-4.2, -1.4, 1.4, 4.2];
  for (let i = 0; i < 8; i++) {
    const c = B.makeCar(r.pick(TRAFFIC_PAINTS));
    c.position.set(r.pick(lanes), 0, -14 - i * 8.5);
    c.rotation.y = r.range(-0.06, 0.06) + (i % 3 === 0 ? 0.25 : 0); // a couple swerving
    scene.add(c);
  }

  // pedestrians on the near sidewalk (within ~10 m of camera)
  const pedSpots = [[13.2, 14], [14.0, 6], [13.5, -2], [-13.5, 12], [13.8, -10]];
  pedSpots.forEach(([x, z], i) => {
    const p = B.makePerson({ seed: 700 + i });
    p.position.set(x, 0, z); p.rotation.y = r.range(0, 6.28);
    scene.add(p);
  });

  // HELI — big, dominant, WHOLE in frame (upper third), rotor blur + searchlight
  const heli = B.makeHeli({ searchlight: true });
  heli.scale.setScalar(1.5);
  heli.position.set(9, 20, -48);
  heli.rotation.y = -0.5;
  heli.rotation.z = 0.08;
  scene.add(heli);
  // searchlight pool on the road ahead
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(3, 0.04, -18);
  scene.add(pool);

  // beach props: umbrellas + towels on the sand (left, in frame)
  for (const [x, z, col] of [[-20, -6, 0xff5f6d], [-24, -22, 0x2ee6ff], [-19, -38, 0xffd24d]]) {
    const um = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 10),
      new THREE.MeshLambertMaterial({ color: col }));
    um.position.set(x, 1.9, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8),
      new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    pole.position.set(x, 1.0, z);
    scene.add(um, pole);
  }

  camera.position.set(3.2, 4.2, 27);
  camera.lookAt(-1, 2.4, -35);
  attachPhone(camera);
  return { heli };
}

// ============================================================================
// SHOT 2 — ON-FOOT BATTLE, 3 depth planes, warm market palette. Heli visible.
// ============================================================================
export function stageShot2(scene, camera) {
  makeSky(scene, 8);
  makeStreet(scene, 20, 190);
  makeSkyline(scene, 4);
  makeBuildingRow(scene, +1, 40, -90, ['#c96a2e', '#8c4a3a', '#a87a2e', '#6b3a5c'], 801);
  makeBuildingRow(scene, -1, 40, -90, ['#b85a3a', '#7a5a2e', '#96425a', '#4a6a5c'], 901);

  // FOREGROUND: concrete barrier — 7 bullet holes + 2 blood splats + overturned cart
  const barrier = B.makeBarrier();
  barrier.position.set(0, 0, 2.2);
  scene.add(barrier);
  const cart = new THREE.Group();
  cart.add(B.box(1.6, 0.5, 1.0, new THREE.MeshLambertMaterial({ color: 0x7a5a30 }), 0, 0.3, 0));
  cart.add(B.box(1.4, 0.4, 0.8, new THREE.MeshLambertMaterial({ color: 0xff5f2e }), 0, 0.75, 0));
  cart.rotation.z = Math.PI / 2.4; cart.rotation.y = 0.5;
  cart.position.set(-3.4, 0.6, 3.2);
  scene.add(cart);
  // spilled fruit from the cart
  const r0 = makeRng(1001);
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshLambertMaterial({ color: r0.pick([0xff5f2e, 0xffd24d, 0x37e08a]) }));
    f.position.set(-3.4 + r0.range(-1.4, 1.4), 0.12, 3.2 + r0.range(-1, 1));
    scene.add(f);
  }

  // MIDDLE: player crouched + 2 crew firing (muzzle flash + 6 casings in air)
  const player = B.makePerson({ shirt: 0xff2e88, crouch: true, seed: 1101 });
  player.position.set(0.6, 0, 4.2); player.rotation.y = Math.PI;
  scene.add(player);
  const crew1 = B.makePerson({ shirt: 0x2ee6a8, crouch: true, seed: 1102 });
  crew1.position.set(-2.6, 0, 4.6); crew1.rotation.y = Math.PI - 0.3;
  const crew2 = B.makePerson({ shirt: 0x4da6ff, crouch: true, seed: 1103 });
  crew2.position.set(3.0, 0, 4.4); crew2.rotation.y = Math.PI + 0.25;
  scene.add(crew1, crew2);
  const m1 = B.makeMuzzle(); m1.position.set(-2.6, 1.1, 3.4); scene.add(m1);
  const m2 = B.makeMuzzle(); m2.position.set(3.0, 1.1, 3.2); scene.add(m2);
  const m3 = B.makeMuzzle(); m3.position.set(0.6, 1.05, 3.0); scene.add(m3);
  addCasings(scene, 0.6, 1.0, 3.8, 6, 1201);

  // BACKGROUND: 5 police bounding overwatch (2 kneeling / 3 moving) + cover car
  const copCar = B.makeCar(0xf2f2f2, { police: true });
  copCar.position.set(-4.5, 0, -14); copCar.rotation.y = 0.4;
  scene.add(copCar);
  const cops = [
    [-5.6, -12.5, true], [-2.0, -16, false], [1.5, -19, true], [4.2, -14.5, false], [6.5, -21, false],
  ];
  cops.forEach(([x, z, kneel], i) => {
    const p = B.makePerson({ police: true, crouch: kneel, seed: 1300 + i });
    p.position.set(x, 0, z); p.rotation.y = r0.range(-0.3, 0.3);
    scene.add(p);
  });

  // market stalls both sides (warm, colorful)
  const stallCols = [0xff5f6d, 0xffb84d, 0x2ee6ff, 0xff5fa2, 0x37e08a];
  for (let i = 0; i < 5; i++) {
    const s1 = B.makeStall(stallCols[i], 1400 + i);
    s1.position.set(12.5, 0, 18 - i * 14); s1.rotation.y = -Math.PI / 2;
    const s2 = B.makeStall(stallCols[(i + 2) % 5], 1500 + i);
    s2.position.set(-12.5, 0, 12 - i * 14); s2.rotation.y = Math.PI / 2;
    scene.add(s1, s2);
  }
  // fleeing pedestrians near the stalls
  for (let i = 0; i < 5; i++) {
    const p = B.makePerson({ seed: 1600 + i });
    p.position.set(i % 2 ? 10.5 : -10.5, 0, 8 - i * 7);
    p.rotation.y = r0.range(0, 6.28);
    scene.add(p);
  }

  // HELI upper area + 2 rappel ropes WITH SWAT models descending (not empty ropes)
  // placed against the pink sky gap so the dark silhouette reads whole
  const heli = B.makeHeli({ searchlight: true });
  heli.scale.setScalar(1.4);
  heli.position.set(-1, 19, -34);
  heli.rotation.y = 0.4;
  scene.add(heli);
  for (const [dx, dy] of [[-1.2, 0], [1.4, 0]]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 11, 6),
      new THREE.MeshLambertMaterial({ color: 0x333333 }));
    rope.position.set(-1 + dx, 13.5, -34 + dy);
    scene.add(rope);
    const swat = B.makePerson({ swat: true, seed: 1700 + dx * 10 });
    swat.position.set(-1 + dx, 8.5, -34 + dy);
    scene.add(swat);
  }

  camera.position.set(1.4, 2.5, 10.5);
  camera.lookAt(-1, 2.2, -28);
  attachWatch(camera);
  return { heli };
}

// ============================================================================
// SHOT 3 — INTERIOR HEIST, downtown neon. NO heli. Laptop screen IS the hack UI.
// ============================================================================
export function stageShot3(scene, camera) {
  makeSky(scene, 9);
  scene.fog = new THREE.Fog(0x1a0e2e, 30, 120);
  // room shell: floor + walls (dark panels + neon strips)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 15),
    new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.4, metalness: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -2);
  scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.85 });
  // back wall in segments: doorway opening x 4..9, y 0..4.4 (garage door, getaway visible)
  const backLeft = B.box(14, 7, 0.5, wallMat, -3, 3.5, -9.5);
  const backRight = B.box(1, 7, 0.5, wallMat, 9.5, 3.5, -9.5);
  const backLintel = B.box(5, 2.6, 0.5, wallMat, 6.5, 5.7, -9.5);
  const leftWall = B.box(0.5, 7, 15, wallMat, -10, 3.5, -2);
  const rightWall = B.box(0.5, 7, 15, wallMat, 10, 3.5, -2);
  scene.add(backLeft, backRight, backLintel, leftWall, rightWall);
  // ceiling — encloses the room so no sky shows through
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 15),
    new THREE.MeshStandardMaterial({ color: 0x141420, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 7, -2);
  scene.add(ceil);
  // floor props: crates + cable runs so the foreground is not empty
  scene.add(B.box(1.4, 1.0, 1.2, new THREE.MeshLambertMaterial({ color: 0x6a5a3a }), -6.5, 0.5, 3.5));
  scene.add(B.box(1.1, 0.8, 1.0, new THREE.MeshLambertMaterial({ color: 0x4a5a6a }), -5.0, 0.4, 4.2));
  scene.add(B.box(1.6, 0.9, 1.1, new THREE.MeshLambertMaterial({ color: 0x5a3a4a }), 6.8, 0.45, 3.8));
  for (const [x, z, ry] of [[-2, 0.5, 0.2], [2.5, 1.2, -0.3], [0, -0.5, 0.1]]) {
    const cable = B.box(0.14, 0.05, 5.5, new THREE.MeshLambertMaterial({ color: 0x111111 }), x, 0.03, z);
    cable.rotation.y = ry;
    scene.add(cable);
  }
  // neon strips
  const neon1 = B.box(20, 0.18, 0.1, new THREE.MeshBasicMaterial({ color: 0xff5fa2 }), 0, 5.6, -9.2);
  const neon2 = B.box(0.1, 0.18, 15, new THREE.MeshBasicMaterial({ color: 0x2ee6ff }), -9.7, 5.6, -2);
  const neon3 = B.box(0.1, 0.18, 15, new THREE.MeshBasicMaterial({ color: 0xffb84d }), 9.7, 5.6, -2);
  scene.add(neon1, neon2, neon3);
  // ceiling light bars
  for (const z of [-6, -2, 2]) {
    scene.add(B.box(4, 0.1, 0.3, new THREE.MeshBasicMaterial({ color: 0xfff2d0 }), 0, 6.4, z));
  }
  const hemi = new THREE.HemisphereLight(0x9a86ff, 0x1a1226, 1.6);
  const key = new THREE.DirectionalLight(0xffd9a0, 2.2); key.position.set(4, 6, 6);
  const fill = new THREE.DirectionalLight(0xffc890, 1.0); fill.position.set(-2, 4, 8);
  scene.add(hemi, key, fill);

  // server racks along the back wall — one PROTOTYPE drive, red blinking LED
  for (let i = 0; i < 5; i++) {
    const rack = B.makeRack(2100 + i, i === 2);
    rack.position.set(-7 + i * 3.5, 0, -8.6);
    scene.add(rack);
  }
  // red glow around the prototype rack
  const redGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glowTexture('rgba(255,60,60,1)', 'rgba(255,0,0,0)'), transparent: true, opacity: 0.55, depthWrite: false }));
  redGlow.scale.set(4, 4, 1); redGlow.position.set(0, 2.2, -8.0);
  scene.add(redGlow);

  // laptop on a crate, center — screen IS the hacking UI (3/4 nodes, 0:47)
  const crate = B.box(2.2, 1.1, 1.6, new THREE.MeshLambertMaterial({ color: 0x8a6a3a }), 0, 0.55, -3.5);
  scene.add(crate);
  const lapBase = B.box(1.5, 0.08, 1.0, new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.4, metalness: 0.5 }), 0, 1.14, -3.5);
  scene.add(lapBase);
  const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94),
    new THREE.MeshBasicMaterial({ map: TX.laptopTexture() }));
  lapScreen.position.set(0, 1.62, -3.95); lapScreen.rotation.x = -0.18;
  scene.add(lapScreen);
  // green glow spill from the laptop
  const greenGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glowTexture('rgba(80,255,150,0.9)', 'rgba(0,255,100,0)'), transparent: true, opacity: 0.4, depthWrite: false }));
  greenGlow.scale.set(3.5, 2.5, 1); greenGlow.position.set(0, 1.6, -3.4);
  scene.add(greenGlow);

  // laser grid: 8 red beams across the room
  const lasers = [
    [-4, 1.1, -5.5, 0], [-1, 1.7, -5.5, 0], [2.5, 1.2, -5.5, 0], [5, 1.9, -5.5, 0],
    [-6, 1.4, -1.5, Math.PI / 2], [-2, 0.9, -1.5, Math.PI / 2], [2, 1.6, -1.5, Math.PI / 2], [6, 1.0, -1.5, Math.PI / 2],
  ];
  lasers.forEach(([x, y, z, ry]) => scene.add(B.makeLaser(7, x, y, z, ry)));

  // crew at their stations: hacker at laptop, gunner at the door
  const hacker = B.makePerson({ shirt: 0x2ee6a8, crouch: true, seed: 2201 });
  hacker.position.set(0.4, 0, -2.2); hacker.rotation.y = Math.PI;
  scene.add(hacker);
  const gunner = B.makePerson({ shirt: 0x4da6ff, crouch: true, seed: 2202 });
  gunner.position.set(5.8, 0, -4.5); gunner.rotation.y = -Math.PI / 2 - 0.3;
  scene.add(gunner);
  const gm = B.makeMuzzle(); gm.position.set(5.0, 1.1, -5.2); scene.add(gm);

  // garage door open at the back: getaway car + neon street visible through it
  const doorFrameTop = B.box(5.4, 0.3, 0.4, new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.6 }), 6.5, 4.5, -9.4);
  const doorFrameL = B.box(0.3, 4.4, 0.4, new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.6 }), 3.9, 2.2, -9.4);
  const doorFrameR = B.box(0.3, 4.4, 0.4, new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.6 }), 9.1, 2.2, -9.4);
  scene.add(doorFrameTop, doorFrameL, doorFrameR);
  const getaway = B.makeCar(0x2ee6a8);
  getaway.position.set(6.5, 0, -12.5); getaway.rotation.y = 0.15;
  getaway.add(B.makeNosFlame());
  scene.add(getaway);
  const driver = B.makePerson({ shirt: 0xff5f6d, seed: 2203 });
  driver.position.set(5.2, 0, -11.2); driver.rotation.y = 0.9;
  scene.add(driver);
  // neon street glow through the doorway
  const streetGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glowTexture('rgba(255,95,162,0.9)', 'rgba(255,0,150,0)'), transparent: true, opacity: 0.5, depthWrite: false }));
  streetGlow.scale.set(7, 5, 1); streetGlow.position.set(6.5, 2.0, -11.5);
  scene.add(streetGlow);

  // 2 BROKEN WINDOWS on the left wall — detailed cracked glass, thin frames
  // (frames are 4 bars each; a solid box would hide the crack texture)
  for (const [y, z] of [[3.4, -5.5], [3.4, 1.0]]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2),
      new THREE.MeshBasicMaterial({ map: TX.crackTexture(2300 + z) }));
    win.position.set(-9.7, y, z); win.rotation.y = Math.PI / 2;
    scene.add(win);
    const fm = new THREE.MeshStandardMaterial({ color: 0x11141c, roughness: 0.5 });
    scene.add(B.box(0.14, 0.14, 2.7, fm, -9.72, y + 1.18, z));
    scene.add(B.box(0.14, 0.14, 2.7, fm, -9.72, y - 1.18, z));
    scene.add(B.box(0.14, 2.5, 0.14, fm, -9.72, y, z + 1.28));
    scene.add(B.box(0.14, 2.5, 0.14, fm, -9.72, y, z - 1.28));
  }
  // flashbang glare bursting through the front broken window — small enough
  // that the cracks around it still read
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glowTexture(), transparent: true, opacity: 1.0, depthWrite: false }));
  flash.scale.set(4.0, 4.0, 1); flash.position.set(-8.8, 3.4, 1.0);
  scene.add(flash);
  // glass shards on the floor below the window
  const shardMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85 });
  const r3 = makeRng(2401);
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(r3.range(0.1, 0.35), 0.03, r3.range(0.1, 0.3)), shardMat);
    s.position.set(-8.6 + r3.range(-0.8, 0.8), 0.03, 1.0 + r3.range(-1.2, 1.2));
    s.rotation.y = r3.range(0, 3);
    scene.add(s);
  }

  // second cracked window on the right wall (both broken windows in frame)
  const win2 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2),
    new THREE.MeshBasicMaterial({ map: TX.crackTexture(99) }));
  win2.position.set(9.7, 3.4, -4.5); win2.rotation.y = -Math.PI / 2;
  scene.add(win2);
  // third cracked window on the back wall between racks — guarantees two in frame
  const win3 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2),
    new THREE.MeshBasicMaterial({ map: TX.crackTexture(77) }));
  win3.position.set(-5.2, 3.6, -9.2);
  scene.add(win3);
  const fm2 = new THREE.MeshStandardMaterial({ color: 0x11141c, roughness: 0.5 });
  scene.add(B.box(0.14, 0.14, 2.7, fm2, 9.72, 4.58, -4.5));
  scene.add(B.box(0.14, 0.14, 2.7, fm2, 9.72, 2.22, -4.5));
  scene.add(B.box(0.14, 2.5, 0.14, fm2, 9.72, 3.4, -3.22));
  scene.add(B.box(0.14, 2.5, 0.14, fm2, 9.72, 3.4, -5.78));
  // rug under the hack station + toolbox so the floor is not empty
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(7, 5),
    new THREE.MeshStandardMaterial({ color: 0x3a1a24, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.02, -2.5);
  scene.add(rug);
  scene.add(B.box(1.0, 0.6, 0.6, new THREE.MeshLambertMaterial({ color: 0xc93a2e }), 8.2, 0.3, -6.5));

  camera.position.set(4.6, 2.2, 3.4);
  camera.lookAt(-0.8, 1.3, -5.5);
  return {};
}

// ============================================================================
// SHOT 4 — STACKED HIGHWAY ESCAPE, downtown neon. Heli center, Rhino VISIBLE.
// ============================================================================
export function stageShot4(scene, camera) {
  makeSky(scene, 10);
  makeSkyline(scene, 5);
  // billboard
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(16, 8),
    new THREE.MeshBasicMaterial({ map: TX.billboardTexture('NEON BAY', '#ff5fa2', 'HURRICANE 20:00') }));
  bb.position.set(-38, 26, -120); bb.rotation.y = 0.35;
  scene.add(bb);
  const bb2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 6),
    new THREE.MeshBasicMaterial({ map: TX.billboardTexture('BCPD', '#2ee6ff', 'WANTED ★★★★★') }));
  bb2.position.set(42, 22, -130); bb2.rotation.y = -0.3;
  scene.add(bb2);

  // LOWER DECK: 3 lanes, hero + 6 civilian cars swerving away
  makeStreet(scene, 18, 240);
  const hero = B.makeCar(0xff2e88);
  hero.position.set(-1.5, 0, 10);
  hero.rotation.y = 0.12;
  hero.add(B.makeNosFlame());
  scene.add(hero);
  addSmokeTrail(scene, -1.5, 0.4, 12.5, 6, 3101);
  addDebris(scene, -1.5, 0.8, 6, 10, 3102);
  const r = makeRng(3201);
  const civLanes = [-5.5, -2, 2, 5.5];
  for (let i = 0; i < 6; i++) {
    const c = B.makeCar(r.pick(TRAFFIC_PAINTS));
    c.position.set(r.pick(civLanes), 0, -10 - i * 11);
    c.rotation.y = r.range(-0.5, 0.5); // swerving away
    scene.add(c);
  }
  // police cruiser chasing on the lower deck — beside the hero, not in the lens
  const chaser = B.makeCar(0xf2f2f2, { police: true });
  chaser.position.set(5, 0, 2); chaser.rotation.y = -0.3;
  scene.add(chaser);

  // UPPER DECK: a cross-bridge (along X) at z=-35, deck y=7 — the roadblock
  // sits ON TOP of it in full view against the sky; the hero passes under it.
  // (A slab directly overhead would hide everything on it from a chase cam.)
  const slab = B.box(64, 1.2, 13, new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.7 }), 0, 7.6, -35);
  scene.add(slab);
  const slabTop = new THREE.Mesh(new THREE.PlaneGeometry(64, 13),
    new THREE.MeshStandardMaterial({ map: TX.asphaltTexture(11), roughness: 0.4, metalness: 0.3 }));
  slabTop.rotation.x = -Math.PI / 2; slabTop.position.set(0, 8.22, -35);
  slabTop.material.map.repeat.set(4, 1); slabTop.material.map.wrapS = slabTop.material.map.wrapT = THREE.RepeatWrapping;
  scene.add(slabTop);
  // bridge edge stripe (safety yellow) on the near edge
  scene.add(B.box(64, 0.18, 0.5, new THREE.MeshBasicMaterial({ color: 0xffd24d }), 0, 8.25, -28.8));
  for (const x of [-16, 16]) {
    scene.add(B.box(1.6, 7.6, 1.6, new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.8 }), x, 3.8, -35));
  }
  // spike strip across the bridge deck
  const spikes = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8d8e0, roughness: 0.3, metalness: 0.9 }));
    s.position.set(-4 + i, 8.45, -35);
    spikes.add(s);
  }
  const strip = B.box(9.5, 0.12, 1.2, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }), 0, 8.28, -35);
  spikes.add(strip);
  scene.add(spikes);
  // 4 cruisers forming the upper roadblock, angled across the bridge
  const block = [[-14, -35, 1.35], [-6, -36.5, 1.75], [8, -34, 1.4], [16, -36, 1.8]];
  block.forEach(([x, z, ry]) => {
    const c = B.makeCar(0xf2f2f2, { police: true });
    c.position.set(x, 8.25, z); c.rotation.y = ry;
    scene.add(c);
  });
  // RHINO TANK — on the bridge's near edge, barrel toward camera, NOTHING covering it
  // placed against the pink sky gap (not the dark tower) so the silhouette reads
  const tank = B.makeTank();
  tank.scale.setScalar(1.2);
  tank.position.set(-6, 8.25, -31.5);
  tank.rotation.y = 0.15;
  scene.add(tank);
  // SWAT on the bridge deck
  for (const [x, z] of [[-10, -33], [12, -37]]) {
    const p = B.makePerson({ swat: true, crouch: true, seed: 3300 + x });
    p.position.set(x, 8.25, z); p.rotation.y = Math.PI;
    scene.add(p);
  }

  // HELI — center frame, door open + gunner, cockpit panel "ESCAPE 2.3km"
  const heli = B.makeHeli({ searchlight: true });
  heli.scale.setScalar(1.6);
  heli.position.set(0, 25, -52);
  heli.rotation.y = 0.35;
  scene.add(heli);
  const gunner = B.makePerson({ swat: true, seed: 3401 });
  gunner.position.set(2.2, 23.4, -52.6); gunner.rotation.y = -Math.PI / 2;
  scene.add(gunner);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0),
    new THREE.MeshBasicMaterial({ map: TX.heliPanelTexture() }));
  panel.position.set(2.35, 24.6, -52.4); panel.rotation.y = -Math.PI / 2 + 0.35;
  scene.add(panel);
  // searchlight pool on the lower deck
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(1, 0.04, -20);
  scene.add(pool);

  // pedestrians fleeing on the lower sidewalk
  for (let i = 0; i < 4; i++) {
    const p = B.makePerson({ seed: 3500 + i });
    p.position.set(i % 2 ? 10.5 : -10.5, 0, 12 - i * 6);
    p.rotation.y = r.range(0, 6.28);
    scene.add(p);
  }

  camera.position.set(3, 3.5, 26);
  camera.lookAt(0, 5, -45);
  return { heli };
}

export const STAGE = { 1: stageShot1, 2: stageShot2, 3: stageShot3, 4: stageShot4 };
