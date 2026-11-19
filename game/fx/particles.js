// Neon Bay — lightweight particle effects: explosions, smoke, muzzle
// flashes, tracers, sparks. One pooled Points cloud + a few meshes;
// no per-frame allocation in the hot path.
import * as THREE from 'three';
import { S } from '../core/state.js';

const MAX = 900;

export function initFX(scene) {
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  const fx = {
    points, geo, pos, col,
    vel: new Float32Array(MAX * 3),
    life: new Float32Array(MAX),
    maxLife: new Float32Array(MAX),
    head: 0,
    tracers: [], // {line, life}
    flashes: [], // {light, life}
  };
  // park everything far below the island until used
  for (let i = 0; i < MAX; i++) { pos[i * 3 + 1] = -100; }
  S.fx = fx;
  return fx;
}

function spawn(fx, x, y, z, vx, vy, vz, life, r, g, b) {
  const i = fx.head;
  fx.head = (fx.head + 1) % MAX;
  fx.pos[i * 3] = x; fx.pos[i * 3 + 1] = y; fx.pos[i * 3 + 2] = z;
  fx.vel[i * 3] = vx; fx.vel[i * 3 + 1] = vy; fx.vel[i * 3 + 2] = vz;
  fx.col[i * 3] = r; fx.col[i * 3 + 1] = g; fx.col[i * 3 + 2] = b;
  fx.life[i] = life; fx.maxLife[i] = life;
}

export function burst(x, y, z, n, speed, life, colorFn) {
  const fx = S.fx; if (!fx) return;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI - Math.PI / 2;
    const sp = speed * (0.3 + Math.random() * 0.7);
    const c = colorFn(Math.random());
    spawn(fx, x, y, z,
      Math.cos(a) * Math.cos(e) * sp, Math.abs(Math.sin(e)) * sp + speed * 0.25, Math.sin(a) * Math.cos(e) * sp,
      life * (0.5 + Math.random() * 0.5), c[0], c[1], c[2]);
  }
}

export function explosionFX(p, big = true) {
  const fx = S.fx; if (!fx) return;
  burst(p.x, p.y + 1, p.z, big ? 70 : 30, big ? 14 : 9, 1.1, (t) =>
    t < 0.4 ? [1, 0.55 + t, 0.1] : t < 0.7 ? [0.9, 0.25, 0.05] : [0.25, 0.25, 0.25]);
  burst(p.x, p.y + 2, p.z, 24, 4, 2.2, () => [0.15, 0.15, 0.15]); // smoke
  // flash light
  const light = new THREE.PointLight(0xff7722, 60, 40, 1.8);
  light.position.set(p.x, p.y + 3, p.z);
  S.scene.add(light);
  fx.flashes.push({ light, life: 0.35, max: 0.35 });
}

export function smokePuff(p) {
  burst(p.x, p.y + 1.2, p.z, 6, 1.6, 1.6, () => [0.2, 0.2, 0.2]);
}

export function muzzleFX(p, dir) {
  burst(p.x, p.y, p.z, 5, 5, 0.12, () => [1, 0.85, 0.4]);
  void dir;
}

export function tracerFX(a, b) {
  const fx = S.fx; if (!fx) return;
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.95 }));
  S.scene.add(line);
  fx.tracers.push({ line, life: 0.09, max: 0.09 });
  if (fx.tracers.length > 24) {
    const old = fx.tracers.shift();
    S.scene.remove(old.line); old.line.geometry.dispose();
  }
}

export function updateFX(dt) {
  const fx = S.fx; if (!fx) return;
  for (let i = 0; i < MAX; i++) {
    if (fx.life[i] <= 0) continue;
    fx.life[i] -= dt;
    if (fx.life[i] <= 0) { fx.pos[i * 3 + 1] = -100; continue; }
    fx.pos[i * 3] += fx.vel[i * 3] * dt;
    fx.pos[i * 3 + 1] += fx.vel[i * 3 + 1] * dt;
    fx.pos[i * 3 + 2] += fx.vel[i * 3 + 2] * dt;
    fx.vel[i * 3 + 1] -= dt * 6; // gravity on debris
    const f = fx.life[i] / fx.maxLife[i];
    fx.col[i * 3] *= (0.9 + 0.1 * f);
  }
  fx.geo.attributes.position.needsUpdate = true;
  fx.geo.attributes.color.needsUpdate = true;
  for (let i = fx.tracers.length - 1; i >= 0; i--) {
    const t = fx.tracers[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life / t.max);
    if (t.life <= 0) { S.scene.remove(t.line); t.line.geometry.dispose(); fx.tracers.splice(i, 1); }
  }
  for (let i = fx.flashes.length - 1; i >= 0; i--) {
    const f = fx.flashes[i];
    f.life -= dt;
    f.light.intensity = 60 * Math.max(0, f.life / f.max);
    if (f.life <= 0) { S.scene.remove(f.light); fx.flashes.splice(i, 1); }
  }
}
