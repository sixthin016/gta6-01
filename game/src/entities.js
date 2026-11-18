// Neon Bay — the people and the cars: the player, pedestrians, traffic and
// the police. Factories build them; the movement helpers drive them along
// the street grid, chase the player, or run away from danger.
import {
  CAR_LEN, CAR_W, PALETTE, PLAYER_MAX_HP, PISTOL_AMMO_START,
  ROADS_H, ROADS_V, ROAD_W, TRAFFIC_SPEED, WORLD_H, WORLD_W,
} from './config.js';
import { nearestIntersection, onRoad } from './city.js';

export function createPlayer(x, y) {
  return {
    kind: 'player', x, y, angle: -Math.PI / 2, radius: 14,
    hp: PLAYER_MAX_HP, money: 250, wanted: 0, ammo: PISTOL_AMMO_START,
    reserveAmmo: 60, inCar: null, speed: 0, walkPhase: 0,
    punchCooldown: 0, shootCooldown: 0, invulnerable: 0,
  };
}

export function createPed(rng, x, y) {
  return {
    kind: 'ped', x, y, angle: rng.range(0, Math.PI * 2), radius: 11,
    speed: rng.range(45, 75), state: 'walk', fleeX: 0, fleeY: 0,
    shirt: rng.pick(['#e2574c', '#f2a541', '#4c9de0', '#2ec4b6', '#f2708a', '#8bc34a']),
    skin: rng.pick(['#f2c89b', '#d9a066', '#8a5a33', '#f7d7b0']),
    walkPhase: rng.range(0, 6), hp: 100, panic: 0,
  };
}

export function createCar(rng, x, y, angle, opts) {
  const o = opts || {};
  return {
    kind: o.kind || 'traffic', x, y, angle, speed: o.speed || 0,
    color: o.color || rng.pick(PALETTE.carColors),
    model: o.model || 'sedan', hp: 100, damage: 0,
    turnCooldown: 0, bumpTimer: 0, ramTimer: 0,
    targetSpeed: o.speed || TRAFFIC_SPEED,
    mission: o.mission ?? -1, id: o.id || 0,
  };
}

export function createPoliceCar(rng, x, y) {
  return createCar(rng, x, y, 0, { kind: 'police', color: PALETTE.policeCar, speed: 0 });
}

export function createCop(rng, x, y) {
  return {
    kind: 'cop', x, y, angle: 0, radius: 12, speed: 205,
    hp: 100, shootCooldown: rng.range(0.5, 1.5), walkPhase: rng.range(0, 6),
  };
}

/** Pick a random road position for a traffic car to spawn on. */
export function randomRoadSpot(rng) {
  if (rng.chance(0.5)) {
    return { x: rng.pick(ROADS_V), y: rng.range(80, WORLD_H - 80), angle: rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2 };
  }
  return { x: rng.range(80, WORLD_W - 80), y: rng.pick(ROADS_H), angle: rng.chance(0.5) ? 0 : Math.PI };
}

/**
 * Drive a traffic car along its street. At an intersection it sometimes
 * turns; it slows for the car ahead so traffic bunches up like traffic.
 */
export function driveTraffic(car, dt, carsAhead, rng) {
  const ix = nearestIntersection(car.x, car.y);
  const nearCentre = Math.abs(car.x - ix.x) < 14 && Math.abs(car.y - ix.y) < 14;
  if (nearCentre && car.turnCooldown <= 0) {
    car.turnCooldown = 1.2;
    const roll = rng ? rng.next() : Math.random();
    if (roll < 0.3) {
      // Turn left or right onto the crossing street.
      const turn = (rng ? rng.chance(0.5) : Math.random() < 0.5) ? Math.PI / 2 : -Math.PI / 2;
      car.angle += turn;
    } else if (roll < 0.38) {
      car.angle += Math.PI; // U-turn, rare.
    }
    car.x = ix.x;
    car.y = ix.y;
  }
  car.turnCooldown -= dt;
  // Slow down for the car directly ahead.
  let want = car.targetSpeed;
  for (const other of carsAhead) {
    if (other === car || other.kind === 'parked') continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 110 && side < 30) want = Math.min(want, Math.max(0, (ahead - 60) * 1.5));
  }
  car.speed += (want - car.speed) * Math.min(1, dt * 2);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Wrap around the world edge back onto a street.
  if (car.x < 40 || car.x > WORLD_W - 40 || car.y < 40 || car.y > WORLD_H - 40) {
    const spot = rng ? randomRoadSpot(rng) : randomRoadSpot({ chance: () => Math.random() < 0.5, pick: (l) => l[Math.floor(Math.random() * l.length)], range: (a, b) => a + Math.random() * (b - a) });
    car.x = spot.x;
    car.y = spot.y;
    car.angle = spot.angle;
    car.speed = TRAFFIC_SPEED;
  }
}

/** Steer a police car toward a target point, arcade style, along the street
 *  grid: it drives down one axis at a time like a real car, and turns away
 *  when a building blocks the way ahead (isBlocked is a world callback). */
export function chaseSteer(car, tx, ty, dt, maxSpeed, isBlocked) {
  const dx = tx - car.x;
  const dy = ty - car.y;
  let want;
  if (Math.abs(dx) > 120 && Math.abs(dy) > 120) {
    // Far on both axes: keep the axis the car is already travelling on.
    want = Math.abs(Math.cos(car.angle)) > 0.7
      ? (dx > 0 ? 0 : Math.PI)
      : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  } else if (Math.abs(dx) > Math.abs(dy)) {
    want = dx > 0 ? 0 : Math.PI;
  } else {
    want = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turnRate = 3.4;
  car.angle += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
  let targetSpeed = maxSpeed;
  if (isBlocked) {
    const aheadX = car.x + Math.cos(car.angle) * 70;
    const aheadY = car.y + Math.sin(car.angle) * 70;
    if (isBlocked(aheadX, aheadY)) {
      // A building is ahead: swing the nose around and slow down.
      car.angle += 1.6 * dt;
      targetSpeed = maxSpeed * 0.35;
    }
  }
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.6);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (isBlocked && isBlocked(nx, ny)) {
    // A building is right in front: stop, swing the nose around, try again.
    car.angle += 2.2 * dt;
    car.speed *= 0.6;
    return;
  }
  car.x = nx;
  car.y = ny;
}

/** Walk a pedestrian along the sidewalk; panic makes them sprint away. */
export function walkPed(ped, dt, danger, rng) {
  if (danger) {
    ped.state = 'flee';
    ped.panic = 1.2;
    ped.fleeX = danger.x;
    ped.fleeY = danger.y;
  }
  if (ped.panic > 0) {
    ped.panic -= dt;
    const away = Math.atan2(ped.y - ped.fleeY, ped.x - ped.fleeX);
    ped.angle = away;
    const speed = 210;
    ped.x += Math.cos(away) * speed * dt;
    ped.y += Math.sin(away) * speed * dt;
    ped.walkPhase += dt * 14;
    if (ped.panic <= 0) ped.state = 'walk';
    return;
  }
  // Stroll along the nearest sidewalk line; turn at intersections.
  const ix = nearestIntersection(ped.x, ped.y);
  const nearCentre = Math.abs(ped.x - ix.x) < 20 && Math.abs(ped.y - ix.y) < 20;
  if (nearCentre && (rng ? rng.chance(0.02) : Math.random() < 0.02)) {
    ped.angle = (rng ? rng.int(0, 3) : Math.floor(Math.random() * 4)) * (Math.PI / 2);
  }
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  ped.walkPhase += dt * 8;
  // Keep pedestrians inside the world and off the road centre.
  if (ped.x < 30 || ped.x > WORLD_W - 30 || ped.y < 30 || ped.y > WORLD_H - 30) {
    ped.angle += Math.PI;
    ped.x = Math.max(30, Math.min(WORLD_W - 30, ped.x));
    ped.y = Math.max(30, Math.min(WORLD_H - 30, ped.y));
  }
  if (onRoad(ped.x, ped.y)) {
    // Drift back toward the sidewalk edge.
    const nx = Math.abs(ped.x - nearestIntersection(ped.x, ped.y).x);
    ped.x += (ped.x > nearestIntersection(ped.x, ped.y).x ? 1 : -1) * 30 * dt;
    void nx;
  }
}

export { CAR_LEN, CAR_W };
