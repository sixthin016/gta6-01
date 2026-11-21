// Neon Bay — vehicles.js: car models built from boxes, arcade driving
// physics, and traffic that follows the road grid. Cars are the game's
// second skin: steal any of them with E, park one in the garage to keep it.
import * as THREE from 'three';
import { makeRng } from './rng.js';

export const CAR_MODELS = [
  { name: 'Comet GT', color: 0xff2e88, top: 34, accel: 16, grip: 1.0 },
  { name: 'Bay Runner', color: 0x2ec4ff, top: 30, accel: 14, grip: 1.0 },
  { name: 'Dune Buggy', color: 0xffd166, top: 26, accel: 15, grip: 0.9 },
  { name: 'Harbor Hauler', color: 0x7dff5e, top: 22, accel: 11, grip: 1.1 },
  { name: 'Neon Taxi', color: 0xffe14d, top: 28, accel: 13, grip: 1.0 },
  { name: 'Vesper S', color: 0xb388ff, top: 36, accel: 17, grip: 0.95 },
];

const WHEEL_GEO = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);

export function makeCar(model, opts = {}) {
  const rng = makeRng(model.name.length * 7919 + (opts.seed ?? 7));
  const group = new THREE.Group();
  group.name = `car-${model.name}`;
  const paint = new THREE.MeshLambertMaterial({ color: opts.color ?? model.color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x101826 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), paint);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.55, 2.2), glass);
  cabin.position.set(0, 1.15, -0.25);
  cabin.castShadow = true;
  group.add(cabin);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.4), paint);
  spoiler.position.set(0, 1.05, -2.1);
  group.add(spoiler);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.1), lightMat);
    head.position.set(x, 0.66, 2.22);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.1), tailMat);
    tail.position.set(x, 0.66, -2.22);
    group.add(tail);
  }
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const wheel = new THREE.Mesh(WHEEL_GEO, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  return {
    group,
    wheels,
    model,
    speed: 0,
    steer: 0,
    heading: opts.heading ?? 0,
    isPlayer: false,
    isPolice: false,
    owner: opts.owner ?? 'traffic',
    health: 100,
  };
}

export function aabbHit(colliders, x, z, r) {
  for (const c of colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return c;
  }
  return null;
}

export function driveCar(car, input, dt, colliders) {
  const m = car.model;
  const target = input.forward ? m.accel : input.back ? -m.accel * 0.6 : 0;
  car.speed += (target * dt - car.speed * 0.9 * dt) * (input.boost ? 1.35 : 1);
  if (!input.forward && !input.back) car.speed *= Math.max(0, 1 - 1.6 * dt);
  car.speed = Math.max(-m.top * 0.45, Math.min(m.top * (input.boost ? 1.2 : 1), car.speed));
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += car.steer * 1.9 * dt * dir * Math.min(1, Math.abs(car.speed) / 6) * m.grip;
  const nx = car.group.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.group.position.z + Math.cos(car.heading) * car.speed * dt;
  if (Math.abs(nx) > 272 || Math.abs(nz - 10) > 282) {
    car.speed *= -0.3;
  } else if (aabbHit(colliders, nx, nz, 1.4)) {
    car.speed *= -0.35;
    car.health = Math.max(0, car.health - Math.abs(car.speed) * 0.4);
  } else {
    car.group.position.x = nx;
    car.group.position.z = nz;
  }
  car.group.rotation.y = car.heading;
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;
  if (input.handbrake) car.speed *= Math.max(0, 1 - 4 * dt);
  return car;
}

export function createTraffic(scene, colliders, roadLines, count = 14, seed = 99) {
  const rng = makeRng(seed);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const model = CAR_MODELS[Math.floor(rng.next() * CAR_MODELS.length)];
    const car = makeCar(model, { seed: i * 13 + 5 });
    const vertical = rng.next() < 0.5;
    const line = roadLines[Math.floor(rng.next() * roadLines.length)];
    const along = rng.range(-250, 250);
    car.group.position.set(vertical ? line : along, 0, vertical ? along : line);
    car.heading = vertical ? (rng.next() < 0.5 ? 0 : Math.PI) : (rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    car.speed = rng.range(7, 12);
    car.cruise = car.speed;
    car.lane = line;
    car.vertical = vertical;
    scene.add(car.group);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, colliders, playerPos) {
  for (const car of cars) {
    if (car.isPlayer) continue;
    // Keep to the lane: nudge back onto the road line and turn at the edge.
    const along = car.vertical ? car.group.position.z : car.group.position.x;
    if (along > 255 || along < -255) {
      car.heading += Math.PI;
      car.group.position.x = Math.max(-250, Math.min(250, car.group.position.x));
      car.group.position.z = Math.max(-250, Math.min(250, car.group.position.z));
    }
    // Slow down when the player is right in front.
    const dx = playerPos.x - car.group.position.x;
    const dz = playerPos.z - car.group.position.z;
    const dist = Math.hypot(dx, dz);
    const want = dist < 12 ? Math.max(0, car.cruise - 8) : car.cruise;
    car.speed += (want - car.speed) * Math.min(1, dt * 1.5);
    const nx = car.group.position.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.group.position.z + Math.cos(car.heading) * car.speed * dt;
    if (!aabbHit(colliders, nx, nz, 1.4)) {
      car.group.position.x = nx;
      car.group.position.z = nz;
    } else {
      car.heading += Math.PI / 2;
    }
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;
  }
}

export function nearestCar(cars, pos, maxDist = 5) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.group.position.x - pos.x, car.group.position.z - pos.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}
