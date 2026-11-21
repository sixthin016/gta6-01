// vehicles.js — car factory and traffic. Every car is a small group of
// boxes (body, cabin, wheels, lights) so it reads as a car at a glance
// and costs almost nothing to render. Player driving is arcade physics:
// throttle, brake/reverse, steering that tightens with speed, handbrake.
import * as THREE from 'three';
import { makeRng, clamp } from './rng.js';
import { ROAD_COORDS, nearestRoadCoord, collideCircle } from './city.js';

export const CAR_COLORS = [0xd63031, 0x0984e3, 0xfdcb6e, 0x00b894, 0x6c5ce7, 0xe17055, 0xffffff, 0x2d3436, 0xff7675, 0x74b9ff];
export const CAR_KINDS = [
  { id: 'sedan', name: 'Vela Sedan', top: 30, accel: 16 },
  { id: 'sport', name: 'Cometa GT', top: 42, accel: 24 },
  { id: 'taxi', name: 'Bay Taxi', top: 28, accel: 15 },
  { id: 'van', name: 'Cargo Van', top: 24, accel: 12 },
  { id: 'police', name: 'NBPD Interceptor', top: 40, accel: 26 },
  { id: 'truck', name: 'Haul Truck', top: 22, accel: 10 },
];

export function makeCarMesh(kindId, color) {
  const kind = CAR_KINDS.find((k) => k.id === kindId) || CAR_KINDS[0];
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const long = kind.id === 'truck' || kind.id === 'van' ? 5.6 : 4.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(long, 0.85, 2.0), bodyMat);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(long * 0.5, 0.75, 1.8), glassMat);
  cabin.position.set(kind.id === 'truck' ? long * 0.28 : -0.2, 1.35, 0);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[long / 2 - 0.8, 1.0], [long / 2 - 0.8, -1.0], [-long / 2 + 0.8, 1.0], [-long / 2 + 0.8, -1.0]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    group.add(w);
    wheels.push(w);
  }
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0xffedb0, emissiveIntensity: 0.9 });
  for (const wz of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.5), lightMat);
    head.position.set(long / 2 + 0.02, 0.7, wz);
    group.add(head);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 0.8 });
  for (const wz of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.5), tailMat);
    tail.position.set(-long / 2 - 0.02, 0.7, wz);
    group.add(tail);
  }
  if (kind.id === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 1.5), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    bar.position.set(-0.2, 1.85, 0);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 }));
    red.position.set(-0.2, 1.95, 0.4);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), new THREE.MeshLambertMaterial({ color: 0x0044ff, emissive: 0x0044ff, emissiveIntensity: 1.5 }));
    blue.position.set(-0.2, 1.95, -0.4);
    group.add(blue);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(long + 0.05, 0.3, 2.05), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    stripe.position.y = 0.62;
    group.add(stripe);
  }
  if (kind.id === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.8), new THREE.MeshLambertMaterial({ color: 0xffd166, emissive: 0xcc9900, emissiveIntensity: 0.8 }));
    sign.position.set(-0.2, 1.9, 0);
    group.add(sign);
  }
  group.userData = { kind, wheels, long, tailMat };
  return group;
}

// One drivable car: position, heading, speed, and arcade update.
export class Car {
  constructor(scene, kindId, color, x, z, heading = 0) {
    this.mesh = makeCarMesh(kindId, color);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.kind = this.mesh.userData.kind;
    this.speed = 0;
    this.heading = heading;
    this.steer = 0;
    this.color = color;
    this.stolen = false;
  }

  update(dt, input, city) {
    const k = this.kind;
    if (input.forward) this.speed += k.accel * dt;
    if (input.back) this.speed -= k.accel * 0.9 * dt;
    if (!input.forward && !input.back) this.speed -= Math.sign(this.speed) * 8 * dt;
    if (input.handbrake) this.speed -= Math.sign(this.speed) * 26 * dt;
    this.speed = clamp(this.speed, -k.top * 0.45, k.top);
    if (Math.abs(this.speed) < 0.05 && !input.forward && !input.back) this.speed = 0;
    const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const turnRate = this.steer * 1.9 * clamp(Math.abs(this.speed) / 12, 0, 1) * (this.speed >= 0 ? 1 : -1);
    this.heading += turnRate * dt;
    const nx = this.mesh.position.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.mesh.position.z + Math.cos(this.heading) * this.speed * dt;
    const fixed = collideCircle(city, nx, nz, 2.2);
    if (fixed.x !== nx || fixed.z !== nz) this.speed *= 0.55;
    this.mesh.position.x = fixed.x;
    this.mesh.position.z = fixed.z;
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * dt * 2.4;
    for (const w of this.mesh.userData.wheels) w.rotation.y += spin;
    // Brake lights flare when braking or handbraking.
    const braking = input.back || input.handbrake;
    this.mesh.userData.tailMat.emissiveIntensity = braking ? 2.6 : 0.8;
    const lean = -this.steer * clamp(Math.abs(this.speed) / k.top, 0, 1) * 0.06;
    this.mesh.rotation.z = lean;
    return Math.abs(this.speed);
  }

  dispose(scene) { scene.remove(this.mesh); }
}

// Ambient traffic: cars cruising the road grid, turning at intersections,
// wrapping around the map edge so the streets never empty out.
export class Traffic {
  constructor(scene, city, count = 16) {
    this.scene = scene;
    this.city = city;
    this.rng = makeRng(777);
    this.cars = [];
    for (let i = 0; i < count; i++) this.cars.push(this.spawnFar(0, 0));
  }

  spawnFar(px, pz) {
    const horizontal = this.rng.chance(0.5);
    const road = this.rng.pick(ROAD_COORDS);
    const along = this.rng.range(-260, 260);
    const dir = this.rng.chance(0.5) ? 1 : -1;
    const kindId = this.rng.pick(['sedan', 'sedan', 'taxi', 'van', 'sport']);
    const car = new Car(this.scene, kindId, this.rng.pick(CAR_COLORS), horizontal ? along : road, horizontal ? road : along, horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI));
    car.speed = this.rng.range(9, 15);
    car._axis = horizontal ? 'x' : 'z';
    car._dir = dir;
    car._lane = road;
    car._cruise = car.speed;
    return car;
  }

  update(dt, px, pz) {
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      // Slow down for the player so traffic feels alive, not suicidal.
      const d2 = (c.mesh.position.x - px) ** 2 + (c.mesh.position.z - pz) ** 2;
      const target = d2 < 100 ? c._cruise * 0.25 : c._cruise;
      c.speed += (target - c.speed) * Math.min(1, dt * 2);
      const step = c.speed * c._dir * dt;
      if (c._axis === 'x') {
        c.mesh.position.x += step;
        if (c.mesh.position.x > 275 || c.mesh.position.x < -275) {
          const replacement = this.spawnFar(px, pz);
          c.dispose(this.scene);
          this.cars[i] = replacement;
          continue;
        }
        // Occasionally turn at an intersection onto a cross street.
        if (this.rng.chance(dt * 0.06)) {
          const cross = nearestRoadCoord(c.mesh.position.x);
          if (Math.abs(c.mesh.position.x - cross) < 3) this.turn(c, cross);
        }
      } else {
        c.mesh.position.z += step;
        if (c.mesh.position.z > 275 || c.mesh.position.z < -275) {
          const replacement = this.spawnFar(px, pz);
          c.dispose(this.scene);
          this.cars[i] = replacement;
          continue;
        }
        if (this.rng.chance(dt * 0.06)) {
          const cross = nearestRoadCoord(c.mesh.position.z);
          if (Math.abs(c.mesh.position.z - cross) < 3) this.turn(c, cross);
        }
      }
      c.mesh.rotation.y = c.heading;
      for (const w of c.mesh.userData.wheels) w.rotation.y += c.speed * dt * 2.4;
    }
  }

  turn(c, cross) {
    if (c._axis === 'x') {
      c._axis = 'z';
      c._lane = cross;
      c.mesh.position.x = cross;
      c._dir = this.rng.chance(0.5) ? 1 : -1;
      c.heading = c._dir > 0 ? 0 : Math.PI;
    } else {
      c._axis = 'x';
      c._lane = cross;
      c.mesh.position.z = cross;
      c._dir = this.rng.chance(0.5) ? 1 : -1;
      c.heading = c._dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  // Nearest traffic car to a point (for stealing / entering).
  nearest(x, z, maxDist = 6) {
    let best = null, bestD = maxDist * maxDist;
    for (const c of this.cars) {
      const d = (c.mesh.position.x - x) ** 2 + (c.mesh.position.z - z) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  remove(car) {
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
    this.cars.push(this.spawnFar(car.mesh.position.x, car.mesh.position.z));
  }
}
