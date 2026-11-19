// Neon Bay — vehicles: car meshes, arcade driving, traffic AI on the
// street grid, stealing, wrecks, and exploding cars (smoke, then a
// fireball with a damage radius and a police response).
import * as THREE from 'three';
import { S, WORLD_HALF } from '../core/state.js';
import { makeRng } from '../core/rng.js';
import { explosionFX, smokePuff, burst } from '../fx/particles.js';
import { sfx } from '../core/sound.js';
import { setWanted } from '../core/state.js';

const PALETTE = [0xd43d2a, 0x2a6fd4, 0xe8c33d, 0x37d67a, 0x8a5fd4, 0xe8e8e8, 0x222226, 0xff7a1a, 0x37e6ff, 0xd42a7a];
const GRID = [-160, -120, -80, -40, 0, 40, 80, 120, 160];

export function makeCarMesh(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), paint);
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.15, metalness: 0.8 }));
  cabin.position.set(0, 1.18, -0.25);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    g.add(w); wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    h.position.set(x, 0.66, 2.21);
    g.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const x of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.1), tailMat);
    t.position.set(x, 0.66, -2.21);
    g.add(t);
  }
  // NOS flame cone (hidden until boost)
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7722, transparent: true, opacity: 0.9 }));
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0.6, -3.2);
  flame.visible = false;
  g.add(flame);
  return { group: g, body, paint, wheels, flame };
}

export function makeCar(color, x, z, heading) {
  const parts = makeCarMesh(color);
  parts.group.position.set(x, 0, z);
  parts.group.rotation.y = heading;
  S.scene.add(parts.group);
  const car = {
    ...parts, mesh: parts.group,
    heading, speed: 0, steer: 0,
    hp: 100, wrecked: false, smoking: false, smokeT: 0,
    isPlayer: false, isCop: false, isTraffic: false,
    route: null, routeIdx: 0, cruise: 10,
    driver: null,
  };
  S.cars.push(car);
  return car;
}

function randomRoute(rng) {
  // random walk on grid intersections, 6 legs
  let x = rng.pick(GRID), z = rng.pick(GRID);
  const pts = [{ x, z }];
  let alongX = rng.chance(0.5);
  for (let i = 0; i < 6; i++) {
    if (alongX) x = rng.pick(GRID); else z = rng.pick(GRID);
    pts.push({ x, z });
    alongX = !alongX;
  }
  return pts;
}

export function spawnTraffic(n) {
  const rng = makeRng(S.seed * 331 + 7);
  for (let i = 0; i < n; i++) {
    const gx = rng.pick(GRID), gz = rng.range(-180, 180);
    const car = makeCar(rng.pick(PALETTE), gx + rng.range(-1.5, 1.5), gz, rng.chance(0.5) ? 0 : Math.PI);
    car.isTraffic = true;
    car.route = randomRoute(rng);
    car.routeIdx = 0;
    car.cruise = rng.range(8, 13);
    S.traffic.push(car);
  }
  // a few parked cars near the start for easy stealing
  const parked = [[-4, 40, 0.4], [10, 16, -1.2], [-14, 8, 2.2], [24, 40, 0.9]];
  for (const [x, z, h] of parked) makeCar(PALETTE[(x + 40) % PALETTE.length], x, z, h);
}

export function nearestCar(pos, maxDist, includeTraffic = true) {
  let best = null, bd = maxDist;
  for (const c of S.cars) {
    if (c.wrecked) continue;
    if (!includeTraffic && c.isTraffic) continue;
    const d = c.mesh.position.distanceTo(pos);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function enterCar(car) {
  if (car.isTraffic) {
    car.isTraffic = false;
    S.traffic = S.traffic.filter((t) => t !== car);
  }
  car.isPlayer = true;
  S.player.car = car;
  S.player.onFoot = false;
  S.player.pos.copy(car.mesh.position);
  if (S.playerMesh) S.playerMesh.visible = false;
  sfx('door');
}

export function exitCar() {
  const car = S.player.car;
  if (!car) return;
  car.isPlayer = false;
  car.speed = 0;
  S.player.car = null;
  S.player.onFoot = true;
  const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
  S.player.pos.copy(car.mesh.position).addScaledVector(side, 2.4);
  S.player.heading = car.heading;
  if (S.playerMesh) { S.playerMesh.visible = true; S.playerMesh.position.copy(S.player.pos); }
  sfx('door');
}

export function damageCar(car, dmg, byPlayer) {
  if (car.wrecked) return;
  car.hp -= dmg;
  if (car.hp <= 35 && !car.smoking) { car.smoking = true; car.smokeT = 0; }
  if (car.hp <= 0) explodeCar(car, byPlayer);
}

export function explodeCar(car, byPlayer) {
  if (car.wrecked) return;
  car.wrecked = true;
  car.speed = 0;
  car.paint.color.setHex(0x141414);
  car.body.material = car.paint;
  explosionFX(car.mesh.position, true);
  sfx('explosion');
  S.stats.exploded++;
  if (car.isPlayer) {
    S.player.car = null; S.player.onFoot = true; S.player.hp -= 25;
    S.player.pos.copy(car.mesh.position).add(new THREE.Vector3(2.4, 0, 0));
    if (S.playerMesh) { S.playerMesh.visible = true; S.playerMesh.position.copy(S.player.pos); }
  }
  if (car.isTraffic) S.traffic = S.traffic.filter((t) => t !== car);
  // damage radius
  const p = car.mesh.position;
  const hurt = (pos, dmg) => {
    if (pos.distanceTo(p) < 10) return dmg;
    return 0;
  };
  const pd = hurt(S.player.pos, 30);
  if (pd > 0 && !car.isPlayer) { S.player.hp -= pd; }
  for (const other of S.cars) {
    if (other !== car && !other.wrecked && other.mesh.position.distanceTo(p) < 9) {
      damageCar(other, 55, false);
    }
  }
  for (const ped of S.peds) {
    if (ped.mesh.position.distanceTo(p) < 8) ped.hp = 0;
  }
  if (byPlayer) setWanted(S.wanted + 2);
  // wreck stays: blackened, undrivable
}

function blockedAhead(car, dist) {
  const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
  const p = car.mesh.position;
  for (const o of S.cars) {
    if (o === car || o.wrecked) continue;
    const d = o.mesh.position.clone().sub(p);
    const along = d.dot(fwd);
    if (along > 0 && along < dist && Math.abs(d.x * fwd.z - d.z * fwd.x) < 2.2) return true;
  }
  return false;
}

export function updateTraffic(dt) {
  for (const car of S.traffic) {
    if (car.wrecked) continue;
    const target = car.route[car.routeIdx];
    if (!target) continue;
    const p = car.mesh.position;
    const dx = target.x - p.x, dz = target.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) {
      car.routeIdx = (car.routeIdx + 1) % car.route.length;
      continue;
    }
    const want = Math.atan2(dx, dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += THREE.MathUtils.clamp(diff, -1.6 * dt, 1.6 * dt);
    const stop = blockedAhead(car, 7);
    const targetSpeed = stop ? 0 : car.cruise;
    car.speed += THREE.MathUtils.clamp(targetSpeed - car.speed, -14 * dt, 6 * dt);
    p.x += Math.sin(car.heading) * car.speed * dt;
    p.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.copy(p);
    car.mesh.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;
  }
}

export function drivePlayer(dt, fwdInput, steerInput, nosWant) {
  const car = S.player.car;
  if (!car || car.wrecked) return;
  const up = S.upgrades;
  const topSpeed = 26 + up.engine * 4.5;
  const accel = 13 + up.engine * 2.5;
  const grip = 1 + up.tires * 0.25;
  // NOS
  const nosReady = up.nos > 0 && S.nos > 1 && (nosWant || S.shotNos);
  S.nosActive = nosReady;
  if (nosReady) {
    S.nos = Math.max(0, S.nos - dt * 34);
    if (S.nos <= 0) S.nosActive = false;
  } else {
    const rate = S.crew.jax ? 11 : 5.5;
    S.nos = Math.min(100, S.nos + dt * rate * (up.nos > 0 ? 1 + up.nos * 0.35 : 0.4));
  }
  if (fwdInput > 0) car.speed += accel * dt * (nosReady ? 2.1 : 1);
  else if (fwdInput < 0) car.speed -= (car.speed > 0.5 ? 26 : 9) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 7 * dt);
  car.speed = THREE.MathUtils.clamp(car.speed, -11, nosReady ? topSpeed * 1.45 : topSpeed);
  const steerAuthority = THREE.MathUtils.clamp(Math.abs(car.speed) / 9, 0, 1) * grip;
  car.heading -= steerInput * 1.9 * steerAuthority * dt * Math.sign(car.speed || 1);
  const p = car.mesh.position;
  p.x += Math.sin(car.heading) * car.speed * dt;
  p.z += Math.cos(car.heading) * car.speed * dt;
  // island bounds + water edge
  p.x = THREE.MathUtils.clamp(p.x, -WORLD_HALF + 4, WORLD_HALF - 6);
  p.z = THREE.MathUtils.clamp(p.z, -WORLD_HALF + 4, WORLD_HALF - 4);
  car.mesh.position.copy(p);
  car.mesh.rotation.y = car.heading;
  // lean into steering
  car.mesh.rotation.z = THREE.MathUtils.clamp(-steerInput * Math.abs(car.speed) * 0.012, -0.08, 0.08);
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;
  car.flame.visible = !!S.nosActive;
  if (S.nosActive) {
    const f = 0.8 + Math.random() * 0.5;
    car.flame.scale.set(f, f, 0.8 + Math.random() * 0.6);
    if (Math.random() < 0.3) sfx('nos');
  }
  // high-speed rams damage the car; Reyes slowly repairs it
  for (const o of S.cars) {
    if (o === car || o.wrecked) continue;
    const d = o.mesh.position.distanceTo(p);
    if (d < 3.4 && Math.abs(car.speed) > 14) {
      damageCar(o, 30, true);
      damageCar(car, 8, false);
      car.speed *= 0.55;
      burst(p.x, p.y + 1, p.z, 10, 6, 0.5, () => [1, 0.8, 0.3]);
      break;
    }
  }
  if (S.crew.reyes && car.hp < 100) car.hp = Math.min(100, car.hp + dt * 1.6);
  if (car.smoking) {
    car.smokeT -= dt;
    if (car.smokeT <= 0) { smokePuff(p); car.smokeT = 0.28; }
  }
  S.player.pos.copy(p);
  S.player.heading = car.heading;
  S.player.speed = Math.abs(car.speed);
}
