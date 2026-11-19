// Neon Bay — people: the player on foot, sidewalk pedestrians, crew
// followers (Jax / Mara / Reyes) and their live perks, and mission
// shoot targets. Mara's cover fire lives here; Jax/Reyes perks hook
// into driving in sim/cars.js.
import * as THREE from 'three';
import { S } from '../core/state.js';
import { makeRng } from '../core/rng.js';
import { tracerFX, burst } from '../fx/particles.js';
import { sfx } from '../core/sound.js';
import { damageCop } from './police.js';

const SHIRTS = [0xe8e8e8, 0x37d67a, 0xd43d2a, 0x2a6fd4, 0xe8c33d, 0x8a5fd4, 0xff7a1a];

export function makeHumanoid(shirt, pants = 0x2a2f3a, skin = 0xc98e6b) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.36),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 }));
  torso.position.y = 1.05;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 }));
  head.position.y = 1.72;
  g.add(head);
  const legMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.95 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.68, 0.26), legMat);
  legL.position.set(-0.16, 0.34, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  g.add(legL); g.add(legR);
  const armMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), armMat);
  armL.position.set(-0.42, 1.05, 0);
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(armL); g.add(armR);
  g.userData = { legL, legR, armL, armR, torso };
  return g;
}

export function spawnPlayerRig() {
  const mesh = makeHumanoid(0x222226, 0x1c1f26, 0xc98e6b);
  // player's jacket: teal
  mesh.userData.torso.material = new THREE.MeshStandardMaterial({ color: 0x1f8a8a, roughness: 0.85 });
  mesh.position.copy(S.player.pos);
  S.scene.add(mesh);
  S.playerMesh = mesh;
  return mesh;
}

export function spawnPeds(n) {
  const rng = makeRng(S.seed * 911 + 3);
  const GRID = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
  for (let i = 0; i < n; i++) {
    const mesh = makeHumanoid(rng.pick(SHIRTS));
    const x = rng.pick(GRID) + rng.range(6, 10) * rng.pick([-1, 1]);
    const z = rng.range(-180, 180);
    mesh.position.set(x, 0, z);
    S.scene.add(mesh);
    S.peds.push({
      mesh, hp: 100,
      target: new THREE.Vector3(rng.pick(GRID), 0, rng.range(-180, 180)),
      speed: rng.range(1.2, 2.4), wait: 0, walkPhase: rng.range(0, 6),
    });
  }
}

export function updatePeds(dt) {
  for (const ped of S.peds) {
    if (ped.hp <= 0) {
      ped.mesh.rotation.x = Math.max(ped.mesh.rotation.x, -Math.PI / 2);
      ped.mesh.rotation.x = -Math.PI / 2;
      continue;
    }
    if (ped.wait > 0) { ped.wait -= dt; continue; }
    const p = ped.mesh.position;
    const d = ped.target.clone().sub(p); d.y = 0;
    if (d.length() < 1.5) {
      ped.wait = Math.random() * 3;
      ped.target.set((Math.random() * 360 - 180), 0, (Math.random() * 360 - 180));
      continue;
    }
    d.normalize();
    p.addScaledVector(d, ped.speed * dt);
    ped.mesh.rotation.y = Math.atan2(d.x, d.z);
    ped.walkPhase += dt * ped.speed * 3.2;
    const sw = Math.sin(ped.walkPhase) * 0.45;
    ped.mesh.userData.legL.rotation.x = sw;
    ped.mesh.userData.legR.rotation.x = -sw;
  }
}

// --- player on foot ---
export function movePlayerOnFoot(dt, fwd, strafe, run) {
  const p = S.player;
  const camYaw = S.camYaw;
  // camera-relative move dir
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  let mx = fx * fwd + rx * strafe;
  let mz = fz * fwd + rz * strafe;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    const speed = run ? 9 : 5;
    p.pos.x += mx * speed * dt;
    p.pos.z += mz * speed * dt;
    p.heading = Math.atan2(mx, mz);
    p.speed = speed;
    p.pos.x = THREE.MathUtils.clamp(p.pos.x, -196, 194);
    p.pos.z = THREE.MathUtils.clamp(p.pos.z, -196, 196);
  } else {
    p.speed = 0;
  }
  const mesh = S.playerMesh;
  if (mesh) {
    mesh.position.copy(p.pos);
    mesh.rotation.y = p.heading;
    const bob = p.speed > 0 ? Math.sin(S.time * 11) * 0.5 : 0;
    mesh.userData.legL.rotation.x = bob;
    mesh.userData.legR.rotation.x = -bob;
    mesh.scale.y = p.inCover ? 0.72 : 1;
  }
}

// --- crew ---
const CREW_DEFS = {
  jax: { name: 'Jax', role: 'Driver', shirt: 0xd43d2a, perk: 'NOS refills 2× faster' },
  mara: { name: 'Mara', role: 'Shooter', shirt: 0x8a5fd4, perk: 'Cover fire on nearby cops' },
  reyes: { name: 'Reyes', role: 'Fixer', shirt: 0x37d67a, perk: 'Slowly repairs your car' },
};

export function crewNames() {
  return Object.keys(CREW_DEFS).filter((k) => S.crew[k]).map((k) => CREW_DEFS[k].name);
}

export function crewPerks() {
  return Object.keys(CREW_DEFS).filter((k) => S.crew[k]).map((k) => `${CREW_DEFS[k].name}: ${CREW_DEFS[k].perk}`);
}

export function recruitCrew(key) {
  if (S.crew[key]) return;
  S.crew[key] = true;
  const def = CREW_DEFS[key];
  const mesh = makeHumanoid(def.shirt);
  mesh.position.copy(S.player.pos).add(new THREE.Vector3(2, 0, 2));
  S.scene.add(mesh);
  S.followers.push({ key, name: def.name, mesh, fireT: 0, riding: false });
  sfx('pickup');
}

export function updateCrew(dt) {
  for (const f of S.followers) {
    if (S.player.onFoot === false) {
      // riding along: hidden while the player drives
      f.mesh.visible = false;
      f.riding = true;
      continue;
    }
    if (f.riding) {
      f.mesh.position.copy(S.player.pos).add(new THREE.Vector3(1.5, 0, 1.5));
      f.riding = false;
    }
    f.mesh.visible = true;
    const p = f.mesh.position;
    const idx = S.followers.indexOf(f);
    const off = new THREE.Vector3(Math.sin(S.player.heading + 2.4 + idx) * 2.2, 0, Math.cos(S.player.heading + 2.4 + idx) * 2.2);
    const target = S.player.pos.clone().add(off);
    const d = target.clone().sub(p); d.y = 0;
    const dist = d.length();
    if (dist > 0.4) {
      d.normalize();
      const sp = dist > 12 ? 12 : 6.5;
      p.addScaledVector(d, Math.min(sp * dt, dist));
      f.mesh.rotation.y = Math.atan2(d.x, d.z);
      const sw = Math.sin(S.time * 10 + idx * 2) * 0.45;
      f.mesh.userData.legL.rotation.x = sw;
      f.mesh.userData.legR.rotation.x = -sw;
    }
    // Mara lays down cover fire on nearby cops
    if (f.key === 'mara') {
      f.fireT -= dt;
      let nearest = null, bd = 26;
      for (const cop of S.cops) {
        if (cop.hp <= 0) continue;
        const dd = cop.mesh.position.distanceTo(p);
        if (dd < bd) { bd = dd; nearest = cop; }
      }
      if (nearest && f.fireT <= 0) {
        f.fireT = 1.15;
        const from = p.clone().add(new THREE.Vector3(0, 1.4, 0));
        const to = nearest.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        tracerFX(from, to);
        sfx('shoot-smg');
        damageCop(nearest, 14);
      }
    }
  }
}

// --- mission shoot targets ---
export function spawnTarget(x, z) {
  const mesh = makeHumanoid(0x111111, 0x111111, 0xd8b48a);
  mesh.userData.torso.material = new THREE.MeshStandardMaterial({ color: 0x881111, roughness: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.15;
  mesh.add(ring);
  mesh.position.set(x, 0, z);
  S.scene.add(mesh);
  const t = { mesh, hp: 30, ring };
  S.targets.push(t);
  return t;
}

export function clearTargets() {
  for (const t of S.targets) S.scene.remove(t.mesh);
  S.targets = [];
}

export function updateTargets(dt) {
  for (const t of S.targets) {
    if (t.hp <= 0) continue;
    // targets strafe nervously around their spot
    t.mesh.position.x += Math.sin(S.time * 1.3 + t.mesh.position.z) * dt * 0.8;
    t.ring.rotation.z += dt * 2;
  }
}

export function damageTarget(t, dmg) {
  t.hp -= dmg;
  burst(t.mesh.position.x, t.mesh.position.y + 1.2, t.mesh.position.z, 6, 4, 0.4, () => [1, 0.2, 0.2]);
  if (t.hp <= 0) {
    t.mesh.rotation.x = -Math.PI / 2;
    t.ring.visible = false;
  }
}
