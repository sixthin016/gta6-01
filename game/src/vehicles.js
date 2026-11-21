// vehicles.js — cars: a detailed low-poly build (body, cabin, wheels,
// lights, NOS flames), arcade driving physics, traffic that follows the
// road loops, and stealing parked cars.
import * as THREE from 'three';
import { makeRng, clamp, angleLerp, damp } from './rng.js';

export const CAR_COLORS = [
  0xe83a2a, 0x2a7ad8, 0xffd23e, 0x37c8ff, 0xff8ac2, 0x3aa84a,
  0xff7a1a, 0x9a4ad8, 0xf2ead8, 0x2ad8b8, 0xd8e13a, 0x8a5a2a,
];

export function buildCarMesh(color, kind) {
  const rng = makeRng(Math.floor(color) + (kind === 'police' ? 7 : 0));
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.08 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x18242e, emissive: 0x0a1420, emissiveIntensity: 0.4 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c20 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), glass);
  cabin.position.set(0, 1.18, -0.25);
  cabin.castShadow = true;
  g.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 1.1), paint);
  hood.position.set(0, 0.98, 1.6);
  g.add(hood);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.3, 0.3), dark);
  bumperF.position.set(0, 0.42, 2.25);
  g.add(bumperF);
  const bumperB = bumperF.clone();
  bumperB.position.z = -2.25;
  g.add(bumperB);
  // headlights + taillights (emissive so they read at golden hour)
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headMat);
    h.position.set(sx, 0.72, 2.24);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), tailMat);
    t.position.set(sx, 0.72, -2.24);
    g.add(t);
  }
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(wx, 0.42, wz);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar.position.set(0, 1.56, -0.25);
    g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar2.position.set(0.6, 1.56, -0.25);
    g.add(bar2);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }));
    stripe.position.y = 0.62;
    g.add(stripe);
    const word = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.05), new THREE.MeshBasicMaterial({ color: 0x112244 }));
    word.position.set(0, 0.9, 2.21);
    g.add(word);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    sign.position.set(0, 1.6, -0.25);
    g.add(sign);
  }
  g.userData.wheels = wheels;
  g.userData.paint = paint;
  return g;
}

export class Car {
  constructor(mesh, opts) {
    this.mesh = mesh;
    this.pos = mesh.position;
    this.heading = opts.heading || 0;
    this.speed = 0;
    this.maxSpeed = opts.maxSpeed || 34;
    this.accel = opts.accel || 16;
    this.steer = 0;
    this.kind = opts.kind || 'civilian';
    this.hp = 100;
    this.dead = false;
    this.nos = opts.nos || 0;
    this.boosting = false;
    this.driver = opts.driver || null; // 'player' | 'traffic' | 'police' | null
    this.waypoints = opts.waypoints || null;
    this.wpIndex = 0;
    this.waitAt = 0;
    this.swerve = 0;
    this.brakeLight = false;
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  update(dt, world) {
    if (this.dead) return;
    if (this.driver === 'traffic' || this.driver === 'police') {
      this.updateAi(dt, world);
    }
    const f = this.forward;
    this.pos.addScaledVector(f, this.speed * dt);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * dt * 2.4;
    for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
    // keep on the island
    this.pos.x = clamp(this.pos.x, -490, 490);
    this.pos.z = clamp(this.pos.z, -490, 490);
    if (this.pos.y < 0) this.pos.y = 0;
  }

  updateAi(dt, world) {
    if (!this.waypoints || this.waypoints.length === 0) return;
    const target = this.waypoints[this.wpIndex];
    const dx = target.x - this.pos.x;
    const dz = target.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 9) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      return;
    }
    const want = Math.atan2(dx, dz);
    this.heading = angleLerp(this.heading, want + this.swerve, 1 - Math.exp(-2.2 * dt));
    const cruise = this.driver === 'police' ? 30 : 15;
    this.speed = damp(this.speed, cruise, 0.9, dt);
    // avoid the player car ahead: brake
    if (world && world.playerCar) {
      const pc = world.playerCar;
      const rel = new THREE.Vector3().subVectors(pc.pos, this.pos);
      const ahead = rel.dot(this.forward);
      const side = Math.abs(rel.x * Math.cos(this.heading) - rel.z * Math.sin(this.heading));
      if (ahead > 0 && ahead < 12 && side < 4) this.speed = damp(this.speed, 0, 4, dt);
    }
  }

  // arcade player driving: throttle -1..1, steer -1..1
  drive(dt, throttle, steer, handbrake, nos) {
    const boosting = nos && this.nos > 0 && throttle > 0;
    this.boosting = boosting;
    if (boosting) this.nos = Math.max(0, this.nos - dt * 34);
    const top = this.maxSpeed * (boosting ? 1.45 : 1);
    const target = throttle * top;
    const rate = throttle !== 0 ? (handbrake ? 5 : 2.2) : 3.2;
    this.speed = damp(this.speed, target, rate, dt);
    if (handbrake && Math.abs(this.speed) > 6) this.speed = damp(this.speed, 0, 2.5, dt);
    const steerAmount = steer * clamp(Math.abs(this.speed) / 12, 0, 1) * (this.speed >= 0 ? 1 : -1);
    this.heading += steerAmount * 1.9 * dt * (handbrake ? 1.5 : 1);
    this.brakeLight = throttle < 0 || handbrake;
    return boosting;
  }

  collideCircle(x, z, r) {
    const dx = this.pos.x - x;
    const dz = this.pos.z - z;
    const d = Math.hypot(dx, dz);
    return d < r + 2.2;
  }
}

export class Traffic {
  constructor(scene, city, fx) {
    this.scene = scene;
    this.city = city;
    this.fx = fx;
    this.rng = makeRng(5551212);
    this.cars = [];
  }

  spawnParked(count, spots) {
    for (let i = 0; i < count; i++) {
      const s = this.rng.pick(spots);
      const color = this.rng.pick(CAR_COLORS);
      const mesh = buildCarMesh(color, this.rng.chance(0.08) ? 'taxi' : 'civilian');
      mesh.position.set(s.x + this.rng.range(-4, 4), 0, s.z + this.rng.range(-4, 4));
      this.scene.add(mesh);
      const car = new Car(mesh, { heading: this.rng.range(0, Math.PI * 2), driver: null, maxSpeed: 30 });
      this.cars.push(car);
    }
  }

  spawnFlow(count) {
    for (let i = 0; i < count; i++) {
      const loop = this.rng.pick(this.city.loops);
      const wp = loop[Math.floor(this.rng.next() * loop.length)];
      const color = this.rng.pick(CAR_COLORS);
      const mesh = buildCarMesh(color, 'civilian');
      mesh.position.set(wp.x + this.rng.range(-3, 3), wp.y, wp.z + this.rng.range(-3, 3));
      this.scene.add(mesh);
      const car = new Car(mesh, {
        heading: this.rng.range(0, Math.PI * 2),
        driver: 'traffic',
        waypoints: loop,
        maxSpeed: 26,
      });
      car.wpIndex = Math.floor(this.rng.next() * loop.length);
      car.speed = 12;
      this.cars.push(car);
    }
  }

  // extra dense traffic staged right in front of the camera for a shot
  spawnConvoy(ahead, heading, count, spacing, police) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const f = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
      const side = new THREE.Vector3(f.z, 0, -f.x);
      const lane = (i % 3) - 1;
      const p = ahead.clone().addScaledVector(f, 14 + i * spacing).addScaledVector(side, lane * 4.4);
      const color = police ? 0x1c2f6e : this.rng.pick(CAR_COLORS);
      const mesh = buildCarMesh(color, police ? 'police' : 'civilian');
      mesh.position.copy(p);
      mesh.position.y = p.y;
      this.scene.add(mesh);
      const car = new Car(mesh, { heading, driver: police ? 'police' : 'traffic', maxSpeed: police ? 40 : 24 });
      car.speed = police ? 26 : 14;
      this.cars.push(car);
      out.push(car);
    }
    return out;
  }

  remove(car) {
    this.scene.remove(car.mesh);
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
  }

  update(dt, world) {
    for (const c of this.cars) c.update(dt, world);
  }
}
