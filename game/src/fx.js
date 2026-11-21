// fx.js — cheap particle bursts (smoke, fire, sparks, muzzle flash,
// shell casings, debris), skid marks and camera shake. One shared pool
// of small meshes; nothing allocates per frame while playing.
import * as THREE from 'three';
import { makeRng } from './rng.js';

const POOL = 420;

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(987654);
    this.parts = [];
    this.geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    this.smokeGeo = new THREE.SphereGeometry(0.55, 6, 5);
    this.palette = {
      smoke: 0x8a8a8a, fire: 0xff7a1a, spark: 0xffd23e, muzzle: 0xffe9a3,
      blood: 0x8f1111, casing: 0xd8b25a, debris: 0x5a5a5a, nos: 0x37c8ff,
      glass: 0xbfe8ff, leaf: 0x3fae5a,
    };
    for (let i = 0; i < POOL; i++) {
      // every particle owns its material: fading one must never fade the rest
      const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.95 }));
      m.visible = false;
      scene.add(m);
      this.parts.push({ mesh: m, vel: new THREE.Vector3(), life: 0, max: 1, grow: 0, spin: 0, grav: 0, smoke: false });
    }
    this.cursor = 0;
    this.shakeAmp = 0;
    this.skids = [];
    this.skidMat = new THREE.MeshBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.55, depthWrite: false });
    this.skidGeo = new THREE.PlaneGeometry(0.5, 2.4);
  }

  spawn(kind, pos, opts) {
    const o = opts || {};
    const count = o.count || 8;
    for (let n = 0; n < count; n++) {
      const p = this.parts[this.cursor];
      this.cursor = (this.cursor + 1) % POOL;
      const r = this.rng;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.position.x += r.range(-0.4, 0.4) * (o.spread || 1);
      p.mesh.position.y += r.range(-0.2, 0.4) * (o.spread || 1);
      p.mesh.position.z += r.range(-0.4, 0.4) * (o.spread || 1);
      p.vel.set(r.range(-1, 1), r.range(0, 1), r.range(-1, 1));
      if (o.dir) p.vel.add(o.dir);
      p.vel.multiplyScalar(o.speed || 3);
      p.max = o.life || r.range(0.35, 0.8);
      p.life = p.max;
      p.grow = kind === 'smoke' ? r.range(0.5, 0.9) : 0;
      p.grav = o.grav !== undefined ? o.grav : kind === 'casing' ? -12 : kind === 'smoke' ? 1.2 : -4;
      p.spin = r.range(-6, 6);
      p.smoke = kind === 'smoke';
      p.mesh.geometry = p.smoke ? this.smokeGeo : this.geo;
      p.mesh.material.color.setHex(this.palette[kind] || this.palette.debris);
      p.mesh.material.depthWrite = !p.smoke;
      const s = kind === 'smoke' ? r.range(0.6, 1.1) : r.range(0.6, 1.5);
      p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = kind === 'smoke' ? 0.38 : 0.95;
    }
  }

  burst(kind, pos, count, speed) {
    this.spawn(kind, pos, { count, speed: speed || 5 });
  }

  tireSmoke(pos, big) {
    this.spawn('smoke', pos, { count: big ? 3 : 1, speed: 1.2, life: 1.1, spread: 0.6, grav: 1.5 });
  }

  nosFlame(pos, dir) {
    this.spawn('nos', pos, { count: 4, speed: 7, life: 0.28, dir, grav: 0 });
    this.spawn('fire', pos, { count: 2, speed: 4, life: 0.3, dir, grav: 0 });
  }

  muzzle(pos, dir) {
    this.spawn('muzzle', pos, { count: 5, speed: 9, life: 0.12, dir, grav: 0 });
    this.spawn('spark', pos, { count: 4, speed: 6, life: 0.3, dir });
  }

  explosion(pos) {
    this.spawn('fire', pos, { count: 26, speed: 9, life: 0.9, spread: 1.4 });
    this.spawn('smoke', pos, { count: 18, speed: 3.5, life: 1.8, spread: 1.2 });
    this.spawn('debris', pos, { count: 14, speed: 11, life: 1.1, grav: -14 });
    this.spawn('spark', pos, { count: 10, speed: 12, life: 0.5 });
    this.shake(0.9);
  }

  shake(amount) {
    this.shakeAmp = Math.max(this.shakeAmp, amount);
  }

  addSkid(pos, heading) {
    if (this.skids.length > 90) {
      const old = this.skids.shift();
      this.scene.remove(old);
    }
    const m = new THREE.Mesh(this.skidGeo, this.skidMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = heading;
    m.position.set(pos.x, 0.06, pos.z);
    this.scene.add(m);
    this.skids.push(m);
  }

  update(dt, camera) {
    for (const p of this.parts) {
      if (!p.mesh.visible) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.y += p.grav * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.12 && p.grav < 0) {
        p.mesh.position.y = 0.12;
        p.vel.y *= -0.3;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.y += p.spin * 0.7 * dt;
      if (p.grow) p.mesh.scale.addScalar(p.grow * dt);
      const fade = p.life / p.max;
      p.mesh.material.opacity = p.smoke ? 0.4 * fade : 0.95 * fade;
    }
    if (this.shakeAmp > 0.001 && camera) {
      const s = this.shakeAmp;
      camera.position.x += (this.rng.next() - 0.5) * s * 0.5;
      camera.position.y += (this.rng.next() - 0.5) * s * 0.35;
      this.shakeAmp *= Math.exp(-6 * dt);
    } else {
      this.shakeAmp = 0;
    }
  }
}
