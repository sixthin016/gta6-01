// 3D prop builders: cars, helicopter, people, buildings, tank, palms, market stalls.
// Everything is procedural boxes/cylinders with saturated, glossy materials —
// no black-block assets: every mesh gets a real color + detail.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import * as TX from './textures.js';

const std = (color, rough = 0.5, metal = 0.15) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const lam = (color) => new THREE.MeshLambertMaterial({ color });
const emi = (color, intensity = 1.6) =>
  new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity });

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}
function sph(r, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
  m.position.set(x, y, z);
  return m;
}

// ---- car: body + cabin + wheels + lights. paint = saturated glossy color ----
export function makeCar(paint = 0xff2e88, opts = {}) {
  const { police = false, taxi = false } = opts;
  const g = new THREE.Group();
  const paintMat = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.22, metalness: 0.75 });
  const bodyMat = police ? std(0xf2f2f2, 0.3, 0.4) : paintMat;
  const body = box(2.0, 0.55, 4.4, bodyMat, 0, 0.55, 0);
  const nose = box(1.9, 0.42, 0.9, bodyMat, 0, 0.5, 2.1);
  const cabin = box(1.6, 0.5, 2.1, std(0x0e1622, 0.12, 0.6), 0, 1.05, -0.25);
  const glass = box(1.56, 0.3, 2.0, new THREE.MeshStandardMaterial({ color: 0x182838, roughness: 0.08, metalness: 0.9 }), 0, 1.06, -0.25);
  g.add(body, nose, cabin, glass);
  if (police) {
    const door = box(2.02, 0.3, 1.6, std(0x10203a, 0.4, 0.2), 0, 0.55, -0.2);
    g.add(door);
    const bar = box(1.2, 0.12, 0.3, std(0x222222, 0.4, 0.3), 0, 1.36, -0.25);
    const r = box(0.5, 0.14, 0.32, emi(0xff2222, 2.2), -0.32, 1.36, -0.25);
    const b = box(0.5, 0.14, 0.32, emi(0x2255ff, 2.2), 0.32, 1.36, -0.25);
    g.add(bar, r, b);
  }
  // headlights / taillights
  g.add(box(0.34, 0.12, 0.06, emi(0xfff2b0, 2.4), -0.68, 0.62, 2.56));
  g.add(box(0.34, 0.12, 0.06, emi(0xfff2b0, 2.4), 0.68, 0.62, 2.56));
  g.add(box(0.4, 0.12, 0.06, emi(0xff1a1a, 2.0), -0.68, 0.62, -2.22));
  g.add(box(0.4, 0.12, 0.06, emi(0xff1a1a, 2.0), 0.68, 0.62, -2.22));
  // grille + spoiler for hero cars
  g.add(box(1.1, 0.14, 0.08, std(0x111111, 0.5, 0.4), 0, 0.52, 2.56));
  if (!police) {
    const spoiler = box(1.9, 0.06, 0.4, std(0x14141c, 0.3, 0.6), 0, 1.02, -2.1);
    g.add(spoiler);
    g.add(box(0.08, 0.22, 0.08, std(0x14141c), -0.85, 0.9, -2.1));
    g.add(box(0.08, 0.22, 0.08, std(0x14141c), 0.85, 0.9, -2.1));
  }
  // wheels
  const wheelMat = std(0x0c0c10, 0.9, 0.1);
  const hubMat = std(0xd8d8e0, 0.25, 0.9);
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = cyl(0.36, 0.36, 0.28, wheelMat, x, 0.36, z);
    w.rotation.z = Math.PI / 2;
    const hub = cyl(0.18, 0.18, 0.3, hubMat, x, 0.36, z);
    hub.rotation.z = Math.PI / 2;
    g.add(w, hub);
  }
  // fake wet-road reflection blob under the car
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.0),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
  g.add(blob);
  return g;
}

// ---- NOS flame cone + underglow (hero car) ----
export function makeNosFlame() {
  const g = new THREE.Group();
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 10),
    new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.85 }));
  flame.rotation.x = Math.PI / 2; flame.position.set(-0.5, 0.35, -2.6);
  const flame2 = flame.clone(); flame2.position.x = 0.5;
  flame2.material = new THREE.MeshBasicMaterial({ color: 0x3399ff, transparent: true, opacity: 0.7 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.8),
    new THREE.MeshBasicMaterial({ color: 0x2288ff, transparent: true, opacity: 0.28 }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03;
  g.add(flame, flame2, glow);
  return g;
}

// ---- police helicopter (Bell 412 style): big, dark silhouette, blur disc, searchlight ----
export function makeHeli(opts = {}) {
  const { searchlight = true } = opts;
  const g = new THREE.Group();
  const bodyMat = std(0x1c2733, 0.35, 0.5);
  const fus = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), bodyMat);
  fus.scale.set(1.15, 1.0, 1.9); fus.position.y = 0;
  const nose = sph(1.05, new THREE.MeshStandardMaterial({ color: 0x0e1a26, roughness: 0.1, metalness: 0.8 }), 0, -0.15, 2.4);
  nose.scale.set(1, 0.85, 1);
  const tail = cyl(0.28, 0.5, 4.6, bodyMat, 0, 0.35, -4.2);
  tail.rotation.x = Math.PI / 2 - 0.12;
  const fin = box(0.14, 1.5, 1.0, bodyMat, 0, 1.1, -6.2);
  const tailRotor = box(0.08, 2.0, 0.3, std(0x333a44, 0.4, 0.6), 0.35, 0.9, -6.1);
  // main rotor: mast + 4 blades + translucent blur disc
  const mast = cyl(0.14, 0.14, 0.9, std(0x333a44), 0, 1.9, 0);
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = box(0.42, 0.06, 5.6, std(0x22262e, 0.4, 0.5), 0, 0, 0);
    const holder = new THREE.Group();
    holder.add(b); holder.rotation.y = (i * Math.PI) / 2;
    blades.add(holder);
  }
  blades.position.y = 2.35;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 2.32;
  const disc2 = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
  disc2.rotation.x = -Math.PI / 2; disc2.position.y = 2.3;
  // skids
  g.add(box(0.12, 0.12, 4.4, std(0x333a44), -1.1, -1.35, 0.4));
  g.add(box(0.12, 0.12, 4.4, std(0x333a44), 1.1, -1.35, 0.4));
  g.add(box(0.1, 0.5, 0.1, std(0x333a44), -1.1, -1.1, 1.6));
  g.add(box(0.1, 0.5, 0.1, std(0x333a44), 1.1, -1.1, 1.6));
  g.add(box(0.1, 0.5, 0.1, std(0x333a44), -1.1, -1.1, -1.0));
  g.add(box(0.1, 0.5, 0.1, std(0x333a44), 1.1, -1.1, -1.0));
  // cockpit glass + side door (open, dark) + BCPD marking
  const glass = box(1.9, 0.9, 1.4, new THREE.MeshStandardMaterial({ color: 0x0a1a28, roughness: 0.08, metalness: 0.9 }), 0, 0.35, 1.9);
  const door = box(0.06, 1.3, 1.3, std(0x05080c, 0.6, 0.2), 1.72, 0.1, 0.2);
  const stripe = box(3.0, 0.28, 0.06, emi(0xffb84d, 1.2), 0, 0.0, 2.86);
  g.add(fus, nose, tail, fin, tailRotor, mast, blades, disc, disc2, glass, door, stripe);
  // searchlight cone aimed at the road
  if (searchlight) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 14, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    cone.position.set(0, -7.5, 3.5); cone.rotation.x = -0.35;
    const lamp = sph(0.28, emi(0xfff6c8, 3), 0, -1.35, 1.2);
    g.add(cone, lamp);
    g.userData.cone = cone;
  }
  g.userData.blades = blades;
  return g;
}

// ---- person: varied colors, never a black block ----
const SKIN = [0xe8b88a, 0xc98d5f, 0x8a5a34, 0xf0c8a0, 0x6e4423];
const SHIRTS = [0xff5f6d, 0x2ee6a8, 0xffb84d, 0x4da6ff, 0xff5fa2, 0x9d6bff, 0x37e08a, 0xff8a3c, 0xe0e6f0, 0x2ec4ff];
const PANTS = [0x2b3a55, 0x4a2b3a, 0x223322, 0x3a3a44, 0x5a4a2b, 0x1e2e4a];
export function makePerson(opts = {}) {
  const {
    shirt = null, pants = null, skin = null, police = false, swat = false,
    crouch = false, scale = 1, seed = 1,
  } = opts;
  const r = makeRng(seed);
  const g = new THREE.Group();
  const skinC = skin ?? r.pick(SKIN);
  const shirtC = swat ? 0x14181f : police ? 0x1d2f4d : (shirt ?? r.pick(SHIRTS));
  const pantsC = swat ? 0x0e1116 : police ? 0x16233a : (pants ?? r.pick(PANTS));
  const legH = crouch ? 0.32 : 0.62;
  const legL = cyl(0.11, 0.13, legH, lam(pantsC), -0.14, legH / 2, 0);
  const legR = cyl(0.11, 0.13, legH, lam(pantsC), 0.14, legH / 2, 0);
  const torsoY = crouch ? 0.62 : 1.05;
  const torso = box(0.52, 0.62, 0.3, lam(shirtC), 0, torsoY, 0);
  if (crouch) torso.rotation.x = 0.5;
  const head = sph(0.21, lam(skinC), 0, torsoY + 0.5, crouch ? 0.14 : 0);
  const hair = sph(0.215, lam(r.pick([0x1a1210, 0x3a2a18, 0x0c0c0c, 0x6b4a2a])), 0, torsoY + 0.56, crouch ? 0.12 : -0.02);
  hair.scale.set(1, 0.75, 1);
  g.add(legL, legR, torso, head, hair);
  if (police || swat) {
    const cap = cyl(0.22, 0.23, 0.1, lam(swat ? 0x0e1116 : 0x10203a), 0, torsoY + 0.68, crouch ? 0.14 : 0);
    g.add(cap);
    if (swat) {
      const vest = box(0.56, 0.4, 0.34, lam(0x232830), 0, torsoY + 0.08, 0);
      g.add(vest);
    }
  }
  // arms: forward when aiming/crouching, down otherwise
  const armMat = lam(shirtC);
  if (crouch) {
    const aL = box(0.13, 0.13, 0.62, armMat, -0.2, torsoY + 0.15, 0.4);
    const aR = box(0.13, 0.13, 0.62, armMat, 0.2, torsoY + 0.15, 0.4);
    g.add(aL, aR);
    // rifle
    const rifle = box(0.07, 0.09, 0.95, std(0x1a1d22, 0.4, 0.6), 0, torsoY + 0.18, 0.75);
    g.add(rifle);
  } else {
    const aL = box(0.13, 0.55, 0.13, armMat, -0.33, torsoY + 0.05, 0);
    const aR = box(0.13, 0.55, 0.13, armMat, 0.33, torsoY + 0.05, 0);
    g.add(aL, aR);
  }
  g.scale.setScalar(scale);
  return g;
}

// ---- building with a real facade (window grid, lit windows, shop sign) ----
export function makeBuilding(w, h, d, opts = {}) {
  const { base = '#3d5a80', sign = '', signColor = '#ff5fa2', seed = 1, litRatio = 0.45, floors = 9 } = opts;
  const g = new THREE.Group();
  const facade = TX.facadeTexture({ base, sign, signColor, seed, litRatio, floors });
  const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.55), roughness: 0.85 });
  const mats = [
    new THREE.MeshStandardMaterial({ map: facade, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: facade, roughness: 0.8 }),
    side, side,
    new THREE.MeshStandardMaterial({ map: facade, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: facade, roughness: 0.8 }),
  ];
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.y = h / 2;
  g.add(m);
  // roof slab + AC units + antenna so the top is not a flat void
  g.add(box(w * 0.94, 0.5, d * 0.94, std(0x2a2a33, 0.9, 0.05), 0, h + 0.25, 0));
  g.add(box(2.2, 1.0, 1.6, std(0x9aa2ad, 0.8, 0.3), -w * 0.2, h + 1.0, 0));
  g.add(box(1.2, 1.6, 1.2, std(0x7d8590, 0.8, 0.3), w * 0.25, h + 1.3, -d * 0.15));
  if (sign) {
    const signTex = TX.billboardTexture(sign, signColor, '');
    const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.8, 7), Math.min(w * 0.8, 7) * 0.5),
      new THREE.MeshBasicMaterial({ map: signTex }));
    signPlane.position.set(0, h * 0.82, d / 2 + 0.15);
    g.add(signPlane);
  }
  return g;
}

// ---- distant skyline tower: dark silhouette, dense lit windows ----
export function makeSkylineTower(w, h, d, seed = 3, warm = true) {
  const g = new THREE.Group();
  const t = TX.skylineTexture(seed, warm ? 'warm' : 'cool');
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ map: t }));
  m.position.y = h / 2;
  g.add(m);
  g.add(box(w * 0.9, 0.6, d * 0.9, lam(0x0d0a18), 0, h + 0.3, 0));
  return g;
}

// ---- palm tree ----
export function makePalm(seed = 1) {
  const r = makeRng(seed);
  const g = new THREE.Group();
  const trunk = cyl(0.14, 0.22, 5.2, lam(0x7a5a38), 0, 2.6, 0);
  trunk.rotation.z = r.range(-0.08, 0.08);
  g.add(trunk);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const frond = box(0.32, 0.06, 2.4, lam(0x2f9e5f), Math.cos(a) * 1.0, 5.3, Math.sin(a) * 1.0);
    frond.rotation.y = -a;
    frond.rotation.x = 0.5;
    g.add(frond);
  }
  g.add(sph(0.3, lam(0x6b4a2a), 0, 5.15, 0));
  return g;
}

// ---- market stall: striped awning + goods crates ----
export function makeStall(awningColor = '#ff5f6d', seed = 2) {
  const r = makeRng(seed);
  const g = new THREE.Group();
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2),
    new THREE.MeshStandardMaterial({ map: TX.awningTexture(awningColor), roughness: 0.9, side: THREE.DoubleSide }));
  awn.rotation.x = -Math.PI / 2 + 0.35; awn.position.y = 2.3;
  g.add(awn);
  for (const x of [-1.55, 1.55]) g.add(cyl(0.06, 0.06, 2.3, std(0x8a8f96), x, 1.15, -0.8));
  for (const x of [-1.55, 1.55]) g.add(cyl(0.06, 0.06, 2.3, std(0x8a8f96), x, 1.15, 0.8));
  g.add(box(3.0, 0.9, 1.6, lam(0x8a5a30), 0, 0.45, 0));
  const goods = [0xff5f2e, 0x37e08a, 0xffd24d, 0xff5fa2, 0x2ec4ff];
  for (let i = 0; i < 6; i++) {
    g.add(box(0.5, 0.3, 0.4, lam(r.pick(goods)), -1.1 + (i % 3) * 1.1, 1.05, i < 3 ? -0.35 : 0.35));
  }
  return g;
}

// ---- server rack ----
export function makeRack(seed = 21, prototype = false) {
  const g = new THREE.Group();
  const rack = box(1.4, 3.4, 0.9, new THREE.MeshStandardMaterial({ map: TX.rackTexture(seed), roughness: 0.6 }), 0, 1.7, 0);
  g.add(rack);
  g.add(box(1.5, 0.12, 1.0, std(0x0c0e12, 0.7, 0.2), 0, 3.46, 0));
  if (prototype) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5),
      new THREE.MeshBasicMaterial({ map: TX.prototypeTexture() }));
    label.position.set(0, 2.2, 0.48);
    const led = box(0.1, 0.1, 0.06, emi(0xff3b3b, 3), 0.55, 2.2, 0.48);
    g.add(label, led);
  }
  return g;
}

// ---- Rhino tank (armored, clearly visible, tan/green) ----
export function makeTank() {
  const g = new THREE.Group();
  const hullMat = std(0x9a9a5e, 0.7, 0.3);
  g.add(box(3.2, 1.0, 5.2, hullMat, 0, 0.9, 0));
  g.add(box(2.6, 0.7, 4.4, std(0x8a8a50, 0.7, 0.3), 0, 1.7, -0.2));
  // tracks
  g.add(box(0.8, 0.9, 5.4, std(0x22221e, 0.9, 0.1), -1.7, 0.45, 0));
  g.add(box(0.8, 0.9, 5.4, std(0x22221e, 0.9, 0.1), 1.7, 0.45, 0));
  // turret + barrel
  const turret = box(2.0, 0.8, 2.4, std(0x8a8a50, 0.7, 0.3), 0, 2.4, -0.3);
  const barrel = cyl(0.14, 0.18, 3.4, std(0x3a3a30, 0.6, 0.4), 0, 2.5, 2.6);
  barrel.rotation.x = Math.PI / 2 - 0.06;
  g.add(turret, barrel);
  g.add(box(0.5, 0.3, 0.5, emi(0xffb84d, 1.5), -0.6, 2.9, -0.3));
  // amber marker lights so the tank reads against the sky
  g.add(box(0.3, 0.18, 0.1, emi(0xffb84d, 2.5), -1.2, 2.0, 2.62));
  g.add(box(0.3, 0.18, 0.1, emi(0xffb84d, 2.5), 1.2, 2.0, 2.62));
  return g;
}

// ---- concrete barrier with bullet holes + blood decals ----
export function makeBarrier() {
  const g = new THREE.Group();
  const b = box(4.6, 1.25, 0.7, std(0x9aa0a8, 0.95, 0.0), 0, 0.62, 0);
  g.add(b);
  g.add(box(4.6, 0.14, 0.76, std(0x6e747c, 0.95, 0.0), 0, 1.3, 0));
  const holeTex = TX.bulletHoleTexture();
  const r = makeRng(41);
  for (let i = 0; i < 7; i++) {
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshBasicMaterial({ map: holeTex, transparent: true }));
    hole.position.set(r.range(-2.0, 2.0), r.range(0.35, 1.15), 0.36);
    g.add(hole);
  }
  const bloodTex = TX.bloodTexture();
  for (const [x, y] of [[-1.4, 0.55], [1.1, 0.8]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: bloodTex, transparent: true, depthWrite: false }));
    s.position.set(x, y, 0.37);
    g.add(s);
  }
  return g;
}

// ---- laser beam (thin red translucent box) ----
export function makeLaser(len, x, y, z, rotY = 0) {
  const m = box(0.06, 0.06, len, new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.75 }));
  m.position.set(x, y, z); m.rotation.y = rotY;
  return m;
}

// ---- muzzle flash sprite ----
export function makeMuzzle() {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.muzzleTexture(), transparent: true, depthWrite: false }));
  s.scale.set(1.6, 1.6, 1);
  return s;
}

// ---- smoke puff sprite ----
export function makeSmoke(scale = 2.2, opacity = 0.75) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.smokeTexture(), transparent: true, opacity, depthWrite: false }));
  s.scale.set(scale, scale, 1);
  return s;
}
