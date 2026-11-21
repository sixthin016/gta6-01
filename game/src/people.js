// people.js — pedestrians with varied clothes and walks, the three crew
// members with their perks, and the on-foot player character.
import * as THREE from 'three';
import { makeRng, clamp, angleLerp, damp } from './rng.js';

const SKINS = [0xf2c9a0, 0xd8a06a, 0x8a5a3a, 0xf2d8b0, 0x6a4028];
const SHIRTS = [0xe83a2a, 0x2a7ad8, 0xffd23e, 0x37c8ff, 0xff8ac2, 0x3aa84a, 0xff7a1a, 0x9a4ad8, 0xf2ead8, 0x2ad8b8];
const PANTS = [0x2b3a5a, 0x3a3a3a, 0x5a3a2a, 0x2a4a3a, 0x6a6a6a];

export function buildPersonMesh(skin, shirt, pants, scale) {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x1c1410 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), shirtMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.4), skinMat);
  head.position.y = 1.72;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.44), hairMat);
  hair.position.y = 1.96;
  g.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.26), pantsMat);
  legL.position.set(-0.17, 0.39, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.17;
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), shirtMat);
  armL.position.set(-0.42, 1.12, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(armR);
  g.scale.setScalar(scale || 1);
  g.userData = { legL, legR, armL, armR, torso, head };
  return g;
}

export class Pedestrian {
  constructor(mesh, opts) {
    this.mesh = mesh;
    this.pos = mesh.position;
    this.heading = opts.heading || 0;
    this.speed = opts.speed || 1.6;
    this.home = opts.home || this.pos.clone();
    this.wanderR = opts.wanderR || 26;
    this.target = null;
    this.panic = 0;
    this.walkPhase = Math.random() * 6;
  }

  update(dt, danger) {
    if (danger && this.pos.distanceTo(danger) < 26) this.panic = 1.6;
    if (this.panic > 0) {
      this.panic -= dt;
      const away = Math.atan2(this.pos.x - danger.x, this.pos.z - danger.z);
      this.heading = angleLerp(this.heading, away, 1 - Math.exp(-4 * dt));
      this.speed = damp(this.speed, 5.4, 3, dt);
    } else {
      if (!this.target || this.pos.distanceTo(this.target) < 2) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * this.wanderR;
        this.target = new THREE.Vector3(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
      }
      const want = Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z);
      this.heading = angleLerp(this.heading, want, 1 - Math.exp(-2 * dt));
      this.speed = damp(this.speed, 1.7, 1.5, dt);
    }
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    this.pos.x = clamp(this.pos.x, -490, 490);
    this.pos.z = clamp(this.pos.z, -490, 490);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.walkPhase += dt * this.speed * 3.4;
    const s = Math.sin(this.walkPhase) * 0.55;
    const u = this.mesh.userData;
    u.legL.rotation.x = s;
    u.legR.rotation.x = -s;
    u.armL.rotation.x = -s * 0.7;
    u.armR.rotation.x = s * 0.7;
  }
}

export class Crowd {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(777001);
    this.peds = [];
  }

  spawn(count, center, radius, panicFree) {
    for (let i = 0; i < count; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(2, radius);
      const x = center.x + Math.cos(a) * r;
      const z = center.z + Math.sin(a) * r;
      const mesh = buildPersonMesh(
        this.rng.pick(SKINS),
        this.rng.pick(SHIRTS),
        this.rng.pick(PANTS),
        this.rng.range(0.92, 1.06)
      );
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      const p = new Pedestrian(mesh, { heading: this.rng.range(0, Math.PI * 2), home: new THREE.Vector3(x, 0, z), wanderR: panicFree ? 4 : radius });
      this.peds.push(p);
    }
  }

  update(dt, danger) {
    for (const p of this.peds) p.update(dt, danger);
  }
}

export const CREW = [
  { name: 'MARA', role: 'Driver', perk: 'NOS lasts 40% longer', color: 0xff8ac2, hp: 100 },
  { name: 'JAX', role: 'Muscle', perk: 'Takes 30% less damage', color: 0x37c8ff, hp: 100 },
  { name: 'REYES', role: 'Hacker', perk: 'Hacks finish twice as fast', color: 0xffd23e, hp: 100 },
];

export class Player {
  constructor(scene) {
    this.mesh = buildPersonMesh(0xd8a06a, 0xe83a2a, 0x2b3a5a, 1.04);
    this.mesh.visible = true;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.pos.set(-280, 0, 40);
    this.heading = 0;
    this.speed = 0;
    this.hp = 100;
    this.onFoot = true;
    this.car = null;
    this.walkPhase = 0;
    this.crouch = false;
    this.aiming = false;
  }

  update(dt, input, colliders) {
    if (!this.onFoot) return;
    let mx = 0;
    let mz = 0;
    if (input.forward) mz += 1;
    if (input.back) mz -= 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    const run = input.run ? 7.4 : 4.2;
    const target = (mx !== 0 || mz !== 0) ? run * (this.crouch ? 0.45 : 1) : 0;
    this.speed = damp(this.speed, target, 6, dt);
    if (this.speed > 0.2) {
      const camH = input.camHeading || 0;
      const moveH = camH + Math.atan2(mx, mz);
      this.heading = angleLerp(this.heading, moveH, 1 - Math.exp(-10 * dt));
      const nx = this.pos.x + Math.sin(this.heading) * this.speed * dt;
      const nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
      if (!this.hitsCollider(nx, this.pos.z, colliders) && !this.hitsCollider(this.pos.x, nz, colliders)) {
        this.pos.x = nx;
        this.pos.z = nz;
      }
    }
    this.pos.x = clamp(this.pos.x, -495, 495);
    this.pos.z = clamp(this.pos.z, -495, 495);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.walkPhase += dt * this.speed * 2.6;
    const s = Math.sin(this.walkPhase) * clamp(this.speed / 5, 0, 1) * 0.6;
    const u = this.mesh.userData;
    u.legL.rotation.x = s;
    u.legR.rotation.x = -s;
    u.armL.rotation.x = this.aiming ? -1.2 : -s * 0.7;
    u.armR.rotation.x = this.aiming ? -1.2 : s * 0.7;
    u.torso.rotation.x = this.crouch ? 0.35 : 0;
  }

  hitsCollider(x, z, colliders) {
    for (const c of colliders) {
      if (x > c.minX - 0.6 && x < c.maxX + 0.6 && z > c.minZ - 0.6 && z < c.maxZ + 0.6) return true;
    }
    return false;
  }
}
