// Neon Bay — entities.js
// The people and the cars: factories, mesh builders and movement AI.
// Positions are x/z on the ground; angle is the heading (0 = +x).
// Meshes are built here; the simulation in world.js owns the state.
// Cars carry damage state: below EXPLOSION.smokeHp they smoke, at 0 HP
// they explode (world.js turns them into wrecks).

import { CONFIG } from './config.js';
import { nearestIntersection, onRoad } from './city.js';

const SHIRTS = [0xe2574c, 0xf2a541, 0x4c9de0, 0x2ec4b6, 0xf2708a, 0x8bc34a];
const SKINS = [0xf2c89b, 0xd9a066, 0x8a5a33, 0xf7d7b0];
const PAINTS = [0xd23b3b, 0x2b6fd6, 0xe8b93a, 0x37b268, 0x8a4fd0, 0xe86a2a, 0xdddddd, 0x222831];

export function createPlayer(x, z) {
  return {
    kind: 'player', x, z, angle: -Math.PI / 2, radius: 1.1,
    hp: 100, money: 250, wanted: 0,
    weapon: 'pistol',
    weapons: {
      pistol:  { ammo: 12, reserve: 999 },
      smg:     { ammo: 32, reserve: 96 },
      shotgun: { ammo: 6,  reserve: 24 },
      sniper:  { ammo: 5,  reserve: 15 },
    },
    inCar: null, speed: 0, walkPhase: 0, cover: false,
    nos: 100, punchCooldown: 0, shootCooldown: 0, reloadTimer: 0,
    invulnerable: 0, bustedTimer: 0,
  };
}

export function createPed(rng, x, z) {
  return {
    kind: 'ped', x, z, angle: rng.range(0, Math.PI * 2), radius: 0.9,
    speed: rng.range(1.2, 2.2), state: 'walk', fleeX: 0, fleeZ: 0,
    shirt: rng.pick(SHIRTS), skin: rng.pick(SKINS),
    walkPhase: rng.range(0, 6), hp: 100, panic: 0,
  };
}

export function createCar(rng, x, z, angle, opts = {}) {
  return {
    kind: opts.kind || 'traffic', x, z, angle, speed: opts.speed || 0,
    color: opts.color ?? rng.pick(PAINTS),
    model: opts.model || 'sedan', hp: 100, damage: 0,
    turnCooldown: 0, bumpTimer: 0, ramTimer: 0,
    targetSpeed: opts.speed || 9, mission: opts.mission ?? -1, id: opts.id || 0,
    topSpeed: CONFIG.carMaxSpeed, grip: 1, nosPower: 1, hull: 100,
    smoking: false, exploded: false, lastHitByPlayer: false,
  };
}

export function createPoliceCar(rng, x, z) {
  return createCar(rng, x, z, 0, { kind: 'police', color: 0x111111, speed: 0 });
}

export function createSwatVan(rng, x, z) {
  const v = createCar(rng, x, z, 0, { kind: 'swat', color: 0x1c2733, speed: 0, model: 'van' });
  v.topSpeed = 30;
  return v;
}

export function createCop(rng, x, z, swat = false) {
  return {
    kind: swat ? 'swat' : 'cop', x, z, angle: 0, radius: 1,
    speed: swat ? 7.5 : 6.5, hp: swat ? 160 : 100,
    shootCooldown: rng.range(0.5, 1.5), walkPhase: rng.range(0, 6),
  };
}

export function createTarget(x, z, name) {
  return { kind: 'target', x, z, angle: 0, radius: 1.2, hp: 100, name: name || 'Target', walkPhase: 0 };
}

export function createHeli(x, z) {
  return { kind: 'heli', x, z, y: 42, angle: 0, rotor: 0, speed: 14 };
}

export function createCrewFollower(name, color, x, z) {
  return { kind: 'crew', name, color, x, z, angle: 0, radius: 1, walkPhase: 0, speed: 8 };
}

/** A short-lived explosion: fireball mesh, age and radius for the sim. */
export function createExplosion(x, z) {
  return { x, z, life: 0.7, maxLife: 0.7, radius: 12, mesh: null };
}

export function randomRoadSpot(rng, lines) {
  const H = CONFIG.worldSize / 2;
  if (rng.next() < 0.5) {
    return { x: rng.pick(lines), z: rng.range(-H + 20, H - 20), angle: rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  }
  return { x: rng.range(-H + 20, H - 20), z: rng.pick(lines), angle: rng.next() < 0.5 ? 0 : Math.PI };
}

/** Drive a traffic car along its street; turn at intersections, slow for the car ahead. */
export function driveTraffic(car, dt, carsAhead, rng, lines) {
  const ix = nearestIntersection(car.x, car.z, lines);
  const nearCentre = Math.abs(car.x - ix.x) < 1.2 && Math.abs(car.z - ix.z) < 1.2;
  if (nearCentre && car.turnCooldown <= 0) {
    car.turnCooldown = 1.2;
    const roll = rng.next();
    if (roll < 0.3) car.angle += rng.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
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
  const H = CONFIG.worldSize / 2;
  if (car.x < -H + 4 || car.x > H - 4 || car.z < -H + 4 || car.z > H - 4) {
    const spot = randomRoadSpot(rng, lines);
    car.x = spot.x; car.z = spot.z; car.angle = spot.angle; car.speed = 9;
  }
}

/** Steer a police car toward a target, axis by axis, turning away from buildings. */
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
  if (nearCentre && rng.next() < 0.02) ped.angle = Math.floor(rng.next() * 4) * (Math.PI / 2);
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.z += Math.sin(ped.angle) * ped.speed * dt;
  ped.walkPhase += dt * 8;
  const H = CONFIG.worldSize / 2;
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
