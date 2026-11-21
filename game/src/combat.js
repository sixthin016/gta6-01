// combat.js — on-foot shooting and the enemies who shoot back. Hitscan
// with a cone check against the camera forward, tracer lines and muzzle
// flash from fx.js, and hostile gunmen who take cover, advance, and
// lose accuracy at range. Health regens slowly out of combat.
import * as THREE from 'three';
import { makePersonMesh } from './people.js';
import { clamp } from './rng.js';

export class Combat {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.ammo = 24;
    this.ammoReserve = 120;
    this.health = 100;
    this.maxHealth = 100;
    this.cooldown = 0;
    this.reloadTimer = 0;
    this.regenTimer = 0;
    this.enemies = [];
    this.kills = 0;
  }

  spawnEnemy(x, z, hp = 60) {
    const mesh = makePersonMesh(0x1f1f2e, 0x1f1f2e);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 0.38), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x881111, emissiveIntensity: 0.8 }));
    band.position.y = 1.62;
    mesh.add(band);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const e = { mesh, x, z, hp, maxHp: hp, heading: 0, shootTimer: 1.5 + Math.random(), state: 'advance', hitFlash: 0 };
    this.enemies.push(e);
    return e;
  }

  clearEnemies() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
  }

  // Player fires. Returns the enemy hit, if any.
  shoot(origin, dir, onHit) {
    if (this.cooldown > 0 || this.reloadTimer > 0) return null;
    if (this.ammo <= 0) { this.reload(); return null; }
    this.cooldown = 0.22;
    this.ammo--;
    this.audio.shot();
    const muzzle = origin.clone().add(dir.clone().multiplyScalar(1.2));
    muzzle.y = Math.max(muzzle.y, 1.3);
    this.fx.muzzle(muzzle);
    let best = null, bestScore = 0.94; // cos(20deg) cone
    for (const e of this.enemies) {
      const to = new THREE.Vector3(e.x - origin.x, 1.2 - origin.y, e.z - origin.z);
      const d = to.length();
      if (d > 46 || d < 0.5) continue;
      const score = to.normalize().dot(dir);
      if (score > bestScore) { bestScore = score; best = e; }
    }
    const end = best
      ? new THREE.Vector3(best.x, 1.3, best.z)
      : origin.clone().add(dir.clone().multiplyScalar(46));
    this.fx.tracer(muzzle, end);
    if (best) {
      best.hp -= 34;
      best.hitFlash = 0.12;
      this.fx.burst(new THREE.Vector3(best.x, 1.4, best.z), 0xff5544, 8, 4);
      if (best.hp <= 0) {
        this.kills++;
        this.scene.remove(best.mesh);
        this.enemies.splice(this.enemies.indexOf(best), 1);
        this.fx.burst(new THREE.Vector3(best.x, 1.0, best.z), 0xaa2222, 16, 5);
        this.audio.thud();
        // Downed enemies drop ammo half the time — keeps a long fight going.
        if (Math.random() < 0.5) this.giveAmmo(12);
        if (onHit) onHit(best, true);
      } else if (onHit) onHit(best, false);
    }
    return best;
  }

  reload() {
    if (this.reloadTimer > 0 || this.ammoReserve <= 0 || this.ammo === 24) return;
    this.reloadTimer = 1.1;
    const take = Math.min(24 - this.ammo, this.ammoReserve);
    this.ammo += take;
    this.ammoReserve -= take;
  }

  // Ammo pickup (dropped by a downed enemy, or found in a mission crate).
  giveAmmo(n) {
    this.ammoReserve = Math.min(240, this.ammoReserve + n);
    this.audio.blip(520);
  }

  hurt(amount) {
    this.health = clamp(this.health - amount, 0, this.maxHealth);
    this.regenTimer = 4;
    return this.health <= 0;
  }

  heal(amount) { this.health = clamp(this.health + amount, 0, this.maxHealth); }

  update(dt, px, pz, playerDir) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadTimer > 0) this.reloadTimer -= dt;
    this.regenTimer -= dt;
    if (this.regenTimer <= 0 && this.health > 0 && this.health < this.maxHealth) {
      this.health = clamp(this.health + 3.5 * dt, 0, this.maxHealth);
    }
    for (const e of this.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      const dx = px - e.x, dz = pz - e.z;
      const d = Math.hypot(dx, dz) || 1;
      // Advance to ~14m, then hold and fire with range-based accuracy.
      if (d > 15) {
        e.state = 'advance';
        e.x += (dx / d) * 3.4 * dt;
        e.z += (dz / d) * 3.4 * dt;
      } else {
        e.state = 'firing';
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = 1.1 + Math.random() * 0.9;
          const hitChance = clamp(0.42 - d * 0.014, 0.08, 0.42);
          const from = new THREE.Vector3(e.x, 1.4, e.z);
          const to = new THREE.Vector3(px, 1.3, pz);
          this.fx.tracer(from, to);
          this.audio.shot();
          if (Math.random() < hitChance) {
            this.hurt(7 + Math.random() * 6);
            this.fx.burst(new THREE.Vector3(px, 1.4, pz), 0xff2222, 6, 3);
          }
        }
      }
      e.heading = Math.atan2(dx, dz);
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = e.heading;
      const u = e.mesh.userData;
      const ph = performance.now() / 160;
      const swing = e.state === 'advance' ? Math.sin(ph) * 0.5 : 0;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = e.state === 'firing' ? -1.2 : -swing * 0.7;
      u.armR.rotation.x = e.state === 'firing' ? -1.2 : swing * 0.7;
    }
  }
}
