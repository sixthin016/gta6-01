// Neon Bay — combat.js: shooting, rival crews and NBPD officers who fight
// back. Hits are raycasts from the camera; enemies are people with health
// bars who chase the player and shoot back on a timer.
import * as THREE from 'three';
import { makePerson } from './people.js';

export function createCombat(scene) {
  return {
    enemies: [],
    raycaster: new THREE.Raycaster(),
    shootCooldown: 0,
    ammo: 24,
    reloadTimer: 0,
  };
}

export function spawnEnemy(scene, combat, x, z, opts = {}) {
  const p = makePerson({ shirt: opts.shirt ?? 0x8a1f2d, hat: opts.hat ?? 0x111111 });
  p.group.position.set(x, 0, z);
  p.health = opts.health ?? 100;
  p.shootTimer = 1 + Math.random() * 2;
  p.isEnemy = true;
  // Health bar: a small green quad that shrinks as they take damage.
  const bar = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x37d67a, side: THREE.DoubleSide }),
  );
  bar.position.set(0, 2.25, 0);
  p.group.add(bar);
  p.bar = bar;
  scene.add(p.group);
  combat.enemies.push(p);
  return p;
}

export function spawnSquad(scene, combat, x, z, count, opts = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(spawnEnemy(scene, combat, x + (Math.random() - 0.5) * 12, z + (Math.random() - 0.5) * 12, opts));
  }
  return out;
}

export function playerShoot(combat, camera, scene, fx, audio, onHit) {
  if (combat.shootCooldown > 0 || combat.reloadTimer > 0) return 'cooling';
  if (combat.ammo <= 0) {
    combat.reloadTimer = 1.2;
    return 'reload';
  }
  combat.shootCooldown = 0.22;
  combat.ammo--;
  audio.gunshot();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const origin = camera.position.clone();
  fx.muzzle(origin.clone().add(dir.clone().multiplyScalar(1.2)), dir);
  combat.raycaster.set(origin, dir);
  combat.raycaster.far = 80;
  const targets = combat.enemies.filter((e) => e.health > 0).map((e) => e.group);
  const hits = combat.raycaster.intersectObjects(targets, true);
  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj.parent && obj.parent !== scene) obj = obj.parent;
    const hitEnemy = combat.enemies.find((e) => e.group === obj);
    if (hitEnemy) {
      hitEnemy.health -= 34;
      fx.blood(hits[0].point);
      if (hitEnemy.health <= 0) {
        hitEnemy.group.visible = false;
        onHit('kill', hitEnemy);
      } else {
        hitEnemy.bar.scale.x = Math.max(0.05, hitEnemy.health / 100);
        onHit('hit', hitEnemy);
      }
      return 'hit';
    }
  }
  return 'miss';
}

export function updateCombat(scene, combat, dt, playerPos, onPlayerHit) {
  combat.shootCooldown = Math.max(0, combat.shootCooldown - dt);
  if (combat.reloadTimer > 0) {
    combat.reloadTimer -= dt;
    if (combat.reloadTimer <= 0) combat.ammo = 24;
  }
  for (const e of combat.enemies) {
    if (e.health <= 0) continue;
    const dx = playerPos.x - e.group.position.x;
    const dz = playerPos.z - e.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 26) {
      const heading = Math.atan2(dx, dz);
      e.group.rotation.y = heading;
      if (dist > 7) {
        e.group.position.x += Math.sin(heading) * 3.4 * dt;
        e.group.position.z += Math.cos(heading) * 3.4 * dt;
        e.walkPhase += dt * 12;
        const swing = Math.sin(e.walkPhase) * 0.45;
        e.legs[0].rotation.x = swing;
        e.legs[1].rotation.x = -swing;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 24) {
        e.shootTimer = 1.4 + Math.random() * 1.2;
        onPlayerHit(8 + Math.random() * 8, e.group.position);
      }
    }
    if (e.bar) e.bar.lookAt(playerPos.x, e.bar.getWorldPosition(new THREE.Vector3()).y, playerPos.z);
  }
  // Drop corpses after a while so the street does not pile up.
  if (combat.enemies.length > 24) {
    const dead = combat.enemies.find((e) => e.health <= 0);
    if (dead) {
      scene.remove(dead.group);
      combat.enemies.splice(combat.enemies.indexOf(dead), 1);
    }
  }
}

export function clearEnemies(scene, combat) {
  for (const e of combat.enemies) scene.remove(e.group);
  combat.enemies = [];
}
