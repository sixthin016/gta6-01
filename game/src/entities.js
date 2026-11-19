// Neon Bay — the people and the cars. One job: factories + movement in 3D.
// Positions are x/z on the ground; angle is the heading (0 = +x, PI/2 = +z
// in three.js terms after the mesh rotation below). Meshes live in world.js.
import { CFG } from './config.js';
import { mulberry32, range, pick } from './random.js';
import { nearestIntersection, onRoad, resolveCircle, collideCircle } from './city.js';

const SHIRTS = [0xe2574c, 0xf2a541, 0x4c9de0, 0x2ec4b6, 0xf2708a, 0x8bc34a];
const SKINS = [0xf2c89b, 0xd9a066, 0x8a5a33, 0xf7d7b0];

export function createPlayer(x, z) {
  return {
    kind: 'player', x, z, angle: -Math.PI / 2, radius: 1.1,
    hp: 100, money: 250, wanted: 0, ammo: 30, reserveAmmo: 60,
    inCar: null, speed: 0, walkPhase: 0,
    punchCooldown: 0, shootCooldown: 0, invulnerable: 0, bustedTimer: 0,
  };
}

export function createPed(rng, x, z) {
  return {
    kind: 'ped', x, z, angle: range(rng, 0, Math.PI * 2), radius: 0.9,
    speed: range(rng, 1.2, 2.2), state: 'walk', fleeX: 0, fleeZ: 0,
    shirt: pick(rng, SHIRTS), skin: pick(rng, SKINS),
    walkPhase: range(rng, 0, 6), hp: 100, panic: 0,
  };
}

export function createCar(rng, x, z, angle, opts = {}) {
  return {
    kind: opts.kind || 'traffic', x, z, angle, speed: opts.speed || 0,
    color: opts.color ?? pick(rng, CFG.paints),
    model: opts.model || 'sedan', hp: 100, damage: 0,
    turnCooldown: 0, bumpTimer: 0, ramTimer: 0,
    targetSpeed: opts.speed || 9, mission: opts.mission ?? -1, id: opts.id || 0,
  };
}

export function createPoliceCar(rng, x, z) {
  return createCar(rng, x, z, 0, { kind: 'police', color: 0x111111, speed: 0 });
}

export function createCop(rng, x, z) {
  return {
    kind: 'cop', x, z, angle: 0, radius: 1, speed: 6.5,
    hp: 100, shootCooldown: range(rng, 0.5, 1.5), walkPhase: range(rng, 0, 6),
  };
}

export function randomRoadSpot(rng, lines) {
  const H = CFG.worldHalf;
  if (rng() < 0.5) {
    return { x: pick(rng, lines), z: range(rng, -H + 20, H - 20), angle: rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  }
  return { x: range(rng, -H + 20, H - 20), z: pick(rng, lines), angle: rng() < 0.5 ? 0 : Math.PI };
}

/** Drive a traffic car along its street; turn at intersections, slow for the car ahead. */
export function driveTraffic(car, dt, carsAhead, rng, lines) {
  const ix = nearestIntersection(car.x, car.z, lines);
  const nearCentre = Math.abs(car.x - ix.x) < 1.2 && Math.abs(car.z - ix.z) < 1.2;
  if (nearCentre && car.turnCooldown <= 0) {
    car.turnCooldown = 1.2;
    const roll = rng();
    if (roll < 0.3) car.angle += rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    else if (roll < 0.38) car.angle += Math.PI;
    car.x = ix.x;
    car.z = ix.z;
  }
  car.turnCooldown -= dt;
  let want = car.targetSpeed;
  for (const other of carsAhead) {
    if (other === car || other.kind === 'parked') continue;
    const dx = other.x - car.x, dz = other.z - car.z;
    const ahead = dx * Math.cos(car.angle) + dz * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dz * Math.cos(car.angle));
    if (ahead > 0 && ahead < 9 && side < 2.5) want = Math.min(want, Math.max(0, (ahead - 5) * 1.2));
  }
  car.speed += (want - car.speed) * Math.min(1, dt * 2);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.z += Math.sin(car.angle) * car.speed * dt;
  const H = CFG.worldHalf;
  if (car.x < -H + 4 || car.x > H - 4 || car.z < -H + 4 || car.z > H - 4) {
    const spot = randomRoadSpot(rng, lines);
    car.x = spot.x; car.z = spot.z; car.angle = spot.angle; car.speed = 9;
  }
}

/** Steer a police car toward a target, one axis at a time, turning away from buildings. */
export function chaseSteer(car, tx, tz, dt, maxSpeed, isBlocked) {
  const dx = tx - car.x, dz = tz - car.z;
  let want;
  if (Math.abs(dx) > 10 && Math.abs(dz) > 10) {
    want = Math.abs(Math.cos(car.angle)) > 0.7 ? (dx > 0 ? 0 : Math.PI) : (dz > 0 ? Math.PI / 2 : -Math.PI / 2);
  } else if (Math.abs(dx) > Math.abs(dz)) want = dx > 0 ? 0 : Math.PI;
  else want = dz > 0 ? Math.PI / 2 : -Math.PI / 2;
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turnRate = 3.4;
  car.angle += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
  let targetSpeed = maxSpeed;
  if (isBlocked) {
    const ax = car.x + Math.cos(car.angle) * 6, az = car.z + Math.sin(car.angle) * 6;
    if (isBlocked(ax, az)) { car.angle += 1.6 * dt; targetSpeed = maxSpeed * 0.35; }
  }
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.6);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const nz = car.z + Math.sin(car.angle) * car.speed * dt;
  if (isBlocked && isBlocked(nx, nz)) { car.angle += 2.2 * dt; car.speed *= 0.6; return; }
  car.x = nx; car.z = nz;
}

/** Walk a pedestrian along the sidewalk; panic makes them sprint away from danger. */
export function walkPed(ped, dt, danger, rng, lines) {
  if (danger) { ped.state = 'flee'; ped.panic = 1.2; ped.fleeX = danger.x; ped.fleeZ = danger.z; }
  if (ped.panic > 0) {
    ped.panic -= dt;
    const away = Math.atan2(ped.z - ped.fleeZ, ped.x - ped.fleeX);
    ped.angle = away;
    ped.x += Math.cos(away) * 6 * dt;
    ped.z += Math.sin(away) * 6 * dt;
    ped.walkPhase += dt * 14;
    if (ped.panic <= 0) ped.state = 'walk';
    return;
  }
  const ix = nearestIntersection(ped.x, ped.z, lines);
  const nearCentre = Math.abs(ped.x - ix.x) < 1.6 && Math.abs(ped.z - ix.z) < 1.6;
  if (nearCentre && rng() < 0.02) ped.angle = Math.floor(rng() * 4) * (Math.PI / 2);
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.z += Math.sin(ped.angle) * ped.speed * dt;
  ped.walkPhase += dt * 8;
  const H = CFG.worldHalf;
  if (ped.x < -H + 3 || ped.x > H - 3 || ped.z < -H + 3 || ped.z > H - 3) {
    ped.angle += Math.PI;
    ped.x = Math.max(-H + 3, Math.min(H - 3, ped.x));
    ped.z = Math.max(-H + 3, Math.min(H - 3, ped.z));
  }
  if (onRoad(ped.x, ped.z, lines)) {
    const ix2 = nearestIntersection(ped.x, ped.z, lines);
    ped.x += (ped.x > ix2.x ? 1 : -1) * 1.2 * dt;
  }
}

export { mulberry32, resolveCircle, collideCircle };
