// Coral Isle — the playable city: 5 districts, beachfront, downtown towers, old market,
// marina, hills. Every building wears a real facade texture; roads are wet golden-hour asphalt.
import * as THREE from 'three';
import { facadeTexture, roadTexture, sandTexture, grassTexture, neonSignTexture, billboardTexture } from './textures.js';
import { makeRng } from '../core/rng.js';

const SIGNS = ['HOTEL CORAL', 'TACOS', 'NEON BAR', 'SURF SHOP', 'CASINO', 'PIZZA', 'GYM 24H', 'PAWN', 'CLUB LUMEN', 'DIVE BAR', 'RAMEN', 'HOTEL SOL', 'ARCADE', 'BAIT & TACKLE'];

export function buildIsland(scene, seed) {
  const rng = makeRng(seed || 20261120);
  const group = new THREE.Group();
  group.name = 'island';
  scene.add(group);
  const colliders = [];

  // --- ground, sand, water -------------------------------------------------
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d4a3a, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  group.add(ground);

  const sandTex = sandTexture(); sandTex.repeat.set(8, 3);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(700, 90),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.9 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.05, 235); sand.receiveShadow = true;
  group.add(sand);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(760, 130),
    new THREE.MeshStandardMaterial({ color: 0x1a7a8c, roughness: 0.12, metalness: 0.55 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.4, 340);
  group.add(water);

  // --- roads ----------------------------------------------------------------
  const roadTex = roadTexture();
  function road(x, z, w, l, rotY) {
    const t = roadTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, l / 32), 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.25 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = rotY || 0;
    m.position.set(x, 0.08, z); m.receiveShadow = true;
    group.add(m);
  }
  road(0, 200, 16, 560, 0);            // beachfront boulevard
  road(0, 40, 14, 560, 0);             // market avenue
  road(0, -80, 18, 560, 0);            // downtown main
  road(-100, -40, 14, 300, Math.PI / 2); // cross street west
  road(100, -40, 14, 300, Math.PI / 2);  // cross street east
  road(200, 60, 12, 320, Math.PI / 2);   // marina road
  road(0, -200, 14, 560, 0);           // north ring

  // --- facades ---------------------------------------------------------------
  const facadeCache = [];
  const bases = ['#4a6a8a', '#7a4a5a', '#3a6a5a', '#8a6a3a', '#5a4a7a', '#2e5a6a', '#a05a3a', '#6a7a3a'];
  for (let i = 0; i < 10; i++) {
    facadeCache.push(facadeTexture({
      base: bases[i % bases.length],
      floors: 4 + rng.int(0, 10),
      cols: 4 + rng.int(0, 4),
      lit: 0.4 + rng.next() * 0.3,
      sign: SIGNS[i % SIGNS.length],
      signColor: ['#ffd75e', '#ff5e8a', '#2ee6ff', '#7dff9a'][i % 4],
    }));
  }
  const roofMats = [0x2a2a34, 0x3a2f28, 0x24303a, 0x4a3a2a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));

  function building(x, z, w, d, h, facadeIdx) {
    const ft = facadeCache[facadeIdx % facadeCache.length];
    const side = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.75 });
    const roof = roofMats[Math.floor(rng.next() * roofMats.length)];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, roof, side, side]);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push({ x, z, w, d });
    return mesh;
  }

  // Downtown towers (north) — tall, neon
  for (let i = 0; i < 14; i++) {
    const x = -160 + (i % 7) * 52 + rng.range(-8, 8);
    const z = -150 + Math.floor(i / 7) * 62 + rng.range(-8, 8);
    building(x, z, 30 + rng.range(0, 14), 26 + rng.range(0, 10), 42 + rng.range(0, 58), i);
  }
  // Market shops (west-center) — low, warm
  for (let i = 0; i < 12; i++) {
    const x = -180 + (i % 4) * 46 + rng.range(-6, 6);
    const z = 10 + Math.floor(i / 4) * 44 + rng.range(-6, 6);
    building(x, z, 26 + rng.range(0, 8), 20 + rng.range(0, 8), 9 + rng.range(0, 9), i + 2);
  }
  // Beachfront hotels (south) — mid, teal/sand
  for (let i = 0; i < 9; i++) {
    const x = -200 + i * 52 + rng.range(-6, 6);
    building(x, 168, 34, 24, 14 + rng.range(0, 14), i + 4);
  }
  // Marina warehouses (east)
  for (let i = 0; i < 6; i++) {
    building(196, -60 + i * 48, 26, 30, 10 + rng.range(0, 6), i + 6);
  }
  // Hills houses (north-west)
  for (let i = 0; i < 8; i++) {
    const x = -220 + (i % 4) * 40, z = -220 + Math.floor(i / 4) * 44;
    building(x, z, 20, 18, 7 + rng.range(0, 5), i);
  }

  // --- palms along the beach --------------------------------------------------
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e8a4a, roughness: 0.9, side: THREE.DoubleSide });
  function palm(x, z, s) {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 7 * s, 6), trunkMat);
    trunk.position.y = 3.5 * s; trunk.rotation.z = rng.range(-0.12, 0.12);
    trunk.castShadow = true;
    p.add(trunk);
    for (let i = 0; i < 7; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 4.4 * s, 4), frondMat);
      const a = (i / 7) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.6 * s, 7 * s, Math.sin(a) * 1.6 * s);
      frond.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      frond.castShadow = true;
      p.add(frond);
    }
    p.position.set(x, 0, z);
    p.name = 'palm';
    group.add(p);
  }
  for (let x = -260; x <= 260; x += 26) palm(x + rng.range(-5, 5), 196 + rng.range(-6, 6), 0.9 + rng.next() * 0.5);
  for (let x = -240; x <= 240; x += 44) palm(x + rng.range(-6, 6), 148 + rng.range(-4, 4), 0.8 + rng.next() * 0.4);

  // --- beach props: umbrellas, kiosks -----------------------------------------
  const umbrellaCols = [0xff5e8a, 0xffd75e, 0x2ee6ff, 0xff8d3c, 0x7dff9a];
  for (let i = 0; i < 16; i++) {
    const x = -250 + i * 33 + rng.range(-8, 8), z = 232 + rng.range(-8, 10);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8 }));
    pole.position.set(x, 1.2, z);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: umbrellaCols[i % umbrellaCols.length], roughness: 0.8 }));
    top.position.set(x, 2.7, z); top.castShadow = true;
    group.add(pole, top);
  }
  // market kiosks with striped awnings
  for (let i = 0; i < 8; i++) {
    const x = -160 + (i % 4) * 40, z = 62 + Math.floor(i / 4) * 30;
    const k = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3),
      new THREE.MeshStandardMaterial({ color: [0xd94f30, 0x2e9ec8, 0xffb03c, 0x7a5cff][i % 4], roughness: 0.8 }));
    box.position.y = 1.2; box.castShadow = true;
    const awn = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xfff2d0, roughness: 0.9 }));
    awn.position.y = 2.6; awn.rotation.z = 0.12;
    k.add(box, awn);
    k.position.set(x, 0, z);
    group.add(k);
  }

  // --- neon signs + billboards -------------------------------------------------
  function signPlane(text, color, x, y, z, w, rotY) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial({ map: neonSignTexture(text, color), transparent: true }));
    m.position.set(x, y, z); m.rotation.y = rotY;
    group.add(m);
  }
  signPlane('NEON BAY', '#ff2e63', -120, 26, -118, 26, 0.4);
  signPlane('HOTEL CORAL', '#2ee6ff', -60, 22, 168, 24, Math.PI);
  signPlane('CLUB LUMEN', '#ff5e8a', 60, 30, -118, 22, -0.3);
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(24, 12),
    new THREE.MeshBasicMaterial({ map: billboardTexture(['VANTARA', 'PROTOTYPE INSIDE'], '#101030', '#ffd75e') }));
  bb.position.set(120, 26, -118); bb.rotation.y = -0.5;
  group.add(bb);

  return { group, colliders, rng };
}
