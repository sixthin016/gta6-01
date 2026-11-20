// Effects — tire smoke in 3 layers, flying debris with motion-blur streaks,
// explosions, flashbang glare, dust. All procedural sprites; no textures on disk.
import * as THREE from 'three';
import { makeRng } from '../core/rng.js';

function smokeTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(220,220,220,0.85)');
  grad.addColorStop(0.6, 'rgba(200,200,200,0.4)');
  grad.addColorStop(1, 'rgba(200,200,200,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}
let smokeTex = null;
export function smokeSprite(scale, opacity) {
  if (!smokeTex) smokeTex = smokeTexture();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale),
    new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, opacity, depthWrite: false }));
  return m;
}

// 3-layer tire smoke behind a drifting car: near dense, mid soft, far thin.
export function makeTireSmoke(carPos, dir) {
  const g = new THREE.Group();
  const layers = [
    { off: 0.6, s: 2.2, o: 0.85 }, { off: 1.6, s: 3.4, o: 0.55 }, { off: 3.0, s: 4.8, o: 0.32 },
  ];
  layers.forEach(({ off, s, o }) => {
    [-0.85, 0.85].forEach((x) => {
      const puff = smokeSprite(s, o);
      puff.position.set(carPos.x - dir.x * off + x * 0.4, 0.7 + Math.random() * 0.4, carPos.z - dir.z * off);
      puff.rotation.y = Math.random() * Math.PI;
      g.add(puff);
    });
  });
  return g;
}

// 12+ debris chunks flying off a crash, each with a motion-blur streak ≥15px long.
export function makeDebris(scene, origin, seed) {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  const mats = [0xd8dce2, 0xff2e4d, 0x2a2a34, 0xffd75e].map((c) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.6 }));
  for (let i = 0; i < 14; i++) {
    const m = mats[i % mats.length];
    const s = 0.3 + rng.next() * 0.35;
    const chunk = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.22 * s, 0.7 * s), m);
    const a = rng.range(0, Math.PI * 2), r = rng.range(1.5, 7);
    chunk.position.set(origin.x + Math.cos(a) * r, rng.range(0.3, 2.2), origin.z + Math.sin(a) * r);
    chunk.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
    g.add(chunk);
    // motion-blur streak: stretched translucent box trailing the chunk
    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.7),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
    streak.position.copy(chunk.position);
    streak.position.x -= Math.cos(a) * 0.5; streak.position.z -= Math.sin(a) * 0.5;
    streak.rotation.y = -a;
    g.add(streak);
  }
  // sparks
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd75e }));
    s.position.set(origin.x + rng.range(-3, 3), rng.range(0.3, 2.4), origin.z + rng.range(-3, 3));
    g.add(s);
  }
  scene.add(g);
  return g;
}

// Explosion fireball + smoke column.
export function makeExplosion(x, y, z) {
  const g = new THREE.Group();
  const fire = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.9 }));
  fire.position.set(x, y, z);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  core.position.set(x, y, z);
  g.add(fire, core);
  for (let i = 0; i < 5; i++) {
    const puff = smokeSprite(3 + i, 0.5);
    puff.position.set(x + (i - 2) * 0.8, y + 2 + i * 1.2, z);
    g.add(puff);
  }
  return g;
}

// Flashbang glare: a soft additive glow sprite + a small bright core —
// a big white plane reads as a wall, a sprite reads as light.
export function makeFlashbang(x, y, z) {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,250,230,0.7)');
  grad.addColorStop(1, 'rgba(255,250,230,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.setScalar(3.2);
  halo.position.set(x, y, z);
  g.add(halo);
  return g;
}

// Laser grid: 8 thin red beams crossing a room (no dots — they read as clutter).
export function makeLaserGrid(w, h, y) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 8; i++) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, w, 5), mat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, y + 0.3 + (i % 4) * 0.45, -3 + i * 0.9);
    beam.rotation.y = (i % 2 === 0 ? 0.35 : -0.35);
    g.add(beam);
  }
  return g;
}
