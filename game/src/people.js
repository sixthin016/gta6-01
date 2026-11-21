// people.js — pedestrians and the player's crew. Peds are simple two-tone
// figures who stroll the sidewalks, wait at crossings, and scatter when
// a gun goes off or a car screeches past. Crew members stand out by name
// and follow the player during crew missions.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import { ROAD_COORDS } from './city.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1, 0xfd79a8, 0x00cec9];
const PANTS = [0x2c3e50, 0x34495e, 0x7f8c8d, 0x6c3483, 0x1a1a2e];

export function makePersonMesh(shirt, pants, skin = 0xd9a066) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirtMat);
  torso.position.y = 1.12;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
  head.position.y = 1.72;
  g.add(head);
  // Hair or hat: most peds get dark hair, a few get a bright cap or a straw hat.
  const roll = Math.random();
  if (roll < 0.62) {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    hair.position.y = 1.95;
    g.add(hair);
  } else if (roll < 0.85) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.14, 8), new THREE.MeshLambertMaterial({ color: [0xd63031, 0x0984e3, 0xfdcb6e][Math.floor(Math.random() * 3)] }));
    cap.position.y = 1.97;
    g.add(cap);
  } else {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.26, 8), new THREE.MeshLambertMaterial({ color: 0xe8d29a }));
    hat.position.y = 2.0;
    g.add(hat);
  }
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), pantsMat);
  legL.position.set(-0.16, 0.36, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), shirtMat);
  armL.position.set(-0.42, 1.12, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(armR);
  g.userData = { legL, legR, armL, armR, torso };
  return g;
}

export class Pedestrians {
  constructor(scene, count = 26) {
    this.scene = scene;
    this.rng = makeRng(4242);
    this.peds = [];
    for (let i = 0; i < count; i++) {
      const mesh = makePersonMesh(this.rng.pick(SHIRTS), this.rng.pick(PANTS));
      const x = this.rng.range(-260, 260);
      const z = this.rng.range(-260, 260);
      mesh.position.set(x, 0, z);
      scene.add(mesh);
      this.peds.push({
        mesh, x, z,
        heading: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(0.9, 1.8),
        targetX: x, targetZ: z,
        panic: 0, walkPhase: this.rng.range(0, 6),
        name: null,
      });
      this.pickTarget(this.peds[this.peds.length - 1]);
    }
  }

  pickTarget(p) {
    // Walk along a sidewalk: pick a nearby road, then a point along it.
    const road = this.rng.pick(ROAD_COORDS);
    if (this.rng.chance(0.5)) { p.targetX = this.rng.range(-260, 260); p.targetZ = road + this.rng.pick([-7, 7]); }
    else { p.targetX = road + this.rng.pick([-7, 7]); p.targetZ = this.rng.range(-260, 260); }
  }

  // Gunfire or a near-miss makes nearby peds run away from the scare point.
  scare(x, z, radius = 22) {
    for (const p of this.peds) {
      const dx = p.x - x, dz = p.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        p.panic = 3;
        p.targetX = p.x + dx * 2;
        p.targetZ = p.z + dz * 2;
      }
    }
  }

  update(dt, playerX, playerZ, playerSpeed) {
    for (const p of this.peds) {
      if (p.panic > 0) p.panic -= dt;
      const dx = p.targetX - p.x, dz = p.targetZ - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) { this.pickTarget(p); continue; }
      const speed = p.panic > 0 ? 5.2 : p.speed;
      p.heading = Math.atan2(dx, dz);
      p.x += (dx / d) * speed * dt;
      p.z += (dz / d) * speed * dt;
      p.walkPhase += dt * speed * 4;
      const swing = Math.sin(p.walkPhase) * (p.panic > 0 ? 0.7 : 0.45);
      const u = p.mesh.userData;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.7;
      u.armR.rotation.x = swing * 0.7;
      p.mesh.position.set(p.x, Math.abs(Math.sin(p.walkPhase)) * 0.04, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }

  count() { return this.peds.length; }
}

// Crew: named allies with a coloured jacket who stand near the player and
// follow during crew missions. Milo drives, Tess shoots, Dario lifts.
export const CREW = [
  { id: 'milo', name: 'Milo Reyes', role: 'Wheelman', shirt: 0x27ae60, line: 'I drive, you shoot. Deal?' },
  { id: 'tess', name: 'Tess Marlowe', role: 'Sharpshooter', shirt: 0xc0392b, line: 'Roof access, thirty seconds. Go.' },
  { id: 'dario', name: 'Big Dario', role: 'Muscle', shirt: 0x8e44ad, line: 'Doors are just suggestions.' },
];

export class CrewManager {
  constructor(scene) {
    this.scene = scene;
    this.members = CREW.map((c, i) => {
      const mesh = makePersonMesh(c.shirt, 0x2c3e50);
      mesh.position.set(6 + i * 2, 0, 8);
      scene.add(mesh);
      return { ...c, mesh, following: false, x: 6 + i * 2, z: 8 };
    });
  }

  setFollowing(id, on) {
    const m = this.members.find((x) => x.id === id);
    if (m) m.following = on;
  }

  update(dt, px, pz) {
    this.members.forEach((m, i) => {
      if (!m.following) return;
      const tx = px - Math.sin(0) * (3 + i * 1.4);
      const tz = pz + 3 + i * 1.4;
      const dx = tx - m.x, dz = tz - m.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.6) {
        const s = Math.min(6.5, d * 2) * dt;
        m.x += (dx / d) * s;
        m.z += (dz / d) * s;
        m.mesh.position.set(m.x, 0, m.z);
        m.mesh.rotation.y = Math.atan2(dx, dz);
        const u = m.mesh.userData;
        const ph = performance.now() / 140 + i;
        u.legL.rotation.x = Math.sin(ph) * 0.5;
        u.legR.rotation.x = -Math.sin(ph) * 0.5;
      }
    });
  }
}
