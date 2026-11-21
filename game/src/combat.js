// combat.js — four weapons, the weapon wheel, hitscan shooting with
// tracers, muzzle flash and shell casings, exploding cars and damage.
import * as THREE from 'three';
import { makeRng } from './rng.js';

export const WEAPONS = [
  { name: 'PISTOL', damage: 22, rate: 0.28, spread: 0.02, range: 90, mag: 12, reserve: 48, kind: 'pistol', auto: false },
  { name: 'SMG', damage: 13, rate: 0.09, spread: 0.05, range: 70, mag: 32, reserve: 96, kind: 'smg', auto: true },
  { name: 'SHOTGUN', damage: 16, rate: 0.85, spread: 0.11, range: 42, mag: 6, reserve: 24, kind: 'shotgun', auto: false, pellets: 7 },
  { name: 'RIFLE', damage: 38, rate: 0.16, spread: 0.012, range: 160, mag: 30, reserve: 90, kind: 'rifle', auto: true },
];

export class Combat {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.rng = makeRng(31337);
    this.weapons = WEAPONS.map((w) => ({ ...w, ammo: w.mag, inReserve: w.reserve }));
    this.index = 0;
    this.cooldown = 0;
    this.tracers = [];
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.85 });
    this.tracerGeo = new THREE.BoxGeometry(0.06, 0.06, 1);
  }

  get current() {
    return this.weapons[this.index];
  }

  select(i) {
    if (i >= 0 && i < this.weapons.length) this.index = i;
  }

  cycle() {
    this.index = (this.index + 1) % this.weapons.length;
  }

  buyAmmo(i, amount, cost) {
    const w = this.weapons[i];
    w.inReserve += amount;
    return cost;
  }

  fire(origin, dir, targets, shooter) {
    if (this.cooldown > 0) return false;
    const w = this.current;
    if (w.ammo <= 0) {
      this.cooldown = 0.4;
      return false;
    }
    w.ammo -= 1;
    this.cooldown = w.rate;
    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const d = dir.clone();
      d.x += (this.rng.next() - 0.5) * w.spread * 2;
      d.y += (this.rng.next() - 0.5) * w.spread * 2;
      d.z += (this.rng.next() - 0.5) * w.spread * 2;
      d.normalize();
      const end = origin.clone().addScaledVector(d, w.range);
      let best = null;
      let bestDist = w.range;
      for (const t of targets) {
        if (t.dead || t.hp <= 0) continue;
        const to = new THREE.Vector3().subVectors(t.pos, origin);
        const along = to.dot(d);
        if (along < 0 || along > bestDist) continue;
        const perp = to.clone().addScaledVector(d, -along).length();
        if (perp < 1.6 && along < bestDist) {
          best = t;
          bestDist = along;
        }
      }
      const hitPoint = origin.clone().addScaledVector(d, best ? bestDist : w.range);
      this.addTracer(origin, hitPoint);
      if (best) {
        best.hp -= w.damage;
        this.fx.burst('blood', hitPoint, 5, 3);
        if (best.hp <= 0) {
          best.dead = true;
          if (best.onDeath) best.onDeath();
        }
      } else if (this.rng.chance(0.3)) {
        this.fx.burst('spark', hitPoint, 2, 3);
      }
      this.fx.muzzle(origin.clone().addScaledVector(d, 1.2), d);
    }
    if (this.audio) this.audio.shot(w.kind);
    return true;
  }

  addTracer(from, to) {
    const len = from.distanceTo(to);
    const m = new THREE.Mesh(this.tracerGeo, this.tracerMat);
    m.position.copy(from).lerp(to, 0.5);
    m.scale.z = len;
    m.lookAt(to);
    this.scene.add(m);
    this.tracers.push({ mesh: m, life: 0.09 });
  }

  explodeCar(car, fx, audio) {
    if (car.dead) return;
    car.dead = true;
    fx.explosion(car.pos.clone().add(new THREE.Vector3(0, 1, 0)));
    if (audio) audio.explosion();
    // char the paint
    if (car.mesh.userData.paint) car.mesh.userData.paint.color.setHex(0x1a1a1a);
    car.speed = 0;
    // tip the wreck
    car.mesh.rotation.z = 0.12;
    car.mesh.position.y = 0.3;
  }

  damageCar(car, amount, fx, audio) {
    car.hp -= amount;
    if (car.hp <= 0) this.explodeCar(car, fx, audio);
    else if (this.rng.chance(0.4)) fx.burst('smoke', car.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 2, 1.5);
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }
  }
}
