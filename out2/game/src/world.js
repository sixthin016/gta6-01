// Neon Bay — the world: one state object and one fixed step that runs the
// whole game. Walking, driving, traffic, pedestrians, police, wanted level,
// combat, pickups, particles and the five Rook missions all live here.
import {
  CAR_BRAKE, CAR_ACCEL, CAR_MAX_REVERSE, CAR_MAX_SPEED, CAR_TURN,
  CLOCK_START_MINUTES, CRIME_QUIET_SECONDS, PALETTE, PISTOL_AMMO_START,
  PISTOL_DAMAGE, PISTOL_RANGE, PLAYER_MAX_HP, PLAYER_RADIUS, PUNCH_DAMAGE,
  PUNCH_RANGE, ROADS_H, ROADS_V, RUN_SPEED, SAND_X, STEP, WALK_SPEED,
  WANTED_DECAY_SECONDS, WANTED_MAX, WATER_X, WORLD_H, WORLD_W,
} from './config.js';
import {
  generateCity, collideCircle, resolveCircle, onRoad, nearestIntersection,
} from './city.js';
import {
  createCar, createCop, createPed, createPlayer, createPoliceCar,
  chaseSteer, driveTraffic, randomRoadSpot, walkPed,
} from './entities.js';
import { missionObjective, missionTarget, MISSIONS } from './missions.js';

export const EVENT_NONE = 0;
export const EVENT_MISSION_DONE = 1;
export const EVENT_BUSTED = 2;
export const EVENT_WASTED = 4;
export const EVENT_CRIME = 8;
export const EVENT_SHOT = 16;
export const EVENT_ENTER_CAR = 32;

const TRAFFIC_COUNT = 14;
const PED_COUNT = 26;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createWorld(rng) {
  const city = generateCity(rng);
  const state = {
    rng, city,
    player: createPlayer(600, 1650),
    cars: [], peds: [], cops: [], policeCars: [],
    particles: [], skids: [], tracers: [],
    camera: { x: 600, y: 1650 },
    time: 0, clockMinutes: CLOCK_START_MINUTES,
    missionIndex: 0, missionStage: 0, missionTimer: 0,
    robProgress: 0, banner: null, bannerTimer: 0,
    message: null, messageTimer: 0,
    wantedTimer: 0, crimeTimer: 99, shake: 0,
    stats: { carsStolen: 0, missionsDone: 0, arrests: 0 },
    sirenOn: false, started: false,
  };

  function spawnTrafficAndPeds() {
    state.cars = [];
    city.parked.forEach((spot, i) => {
      state.cars.push(createCar(rng, spot.x, spot.y, spot.angle, {
        kind: 'parked', color: spot.color, model: spot.model, mission: spot.mission, id: 100 + i,
      }));
    });
    for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
      const spot = randomRoadSpot(rng);
      state.cars.push(createCar(rng, spot.x, spot.y, spot.angle, { kind: 'traffic', speed: 110 + rng.range(0, 40), id: i }));
    }
    state.peds = [];
    for (let i = 0; i < PED_COUNT; i += 1) {
      const x = rng.range(120, WORLD_W - 500);
      const y = rng.range(120, WORLD_H - 120);
      state.peds.push(createPed(rng, x, y));
    }
    state.cops = [];
    state.policeCars = [];
  }

  spawnTrafficAndPeds();

  function say(text, seconds) {
    state.message = text;
    state.messageTimer = seconds || 4;
  }

  function banner(text) {
    state.banner = text;
    state.bannerTimer = 7;
  }

  function addWanted(amount) {
    const before = state.player.wanted;
    state.player.wanted = clamp(state.player.wanted + amount, 0, WANTED_MAX);
    state.crimeTimer = 0;
    state.wantedTimer = 0;
    if (state.player.wanted > before) return true;
    return false;
  }

  function addParticles(x, y, count, color, speed, life) {
    for (let i = 0; i < count; i += 1) {
      const a = rng.range(0, Math.PI * 2);
      const s = rng.range(speed * 0.3, speed);
      state.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rng.range(life * 0.5, life), maxLife: life, color, size: rng.range(2, 5),
      });
    }
    if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
  }

  function addSkid(x, y, angle) {
    state.skids.push({ x, y, angle, life: 6 });
    if (state.skids.length > 320) state.skids.shift();
  }

  function respawn(reason) {
    const p = state.player;
    const fine = reason === 'busted' ? 100 : 150;
    p.money = Math.max(0, p.money - fine);
    p.hp = PLAYER_MAX_HP;
    p.wanted = 0;
    p.inCar = null;
    p.x = 1560;
    p.y = 380;
    p.angle = Math.PI / 2;
    p.invulnerable = 3;
    state.policeCars = [];
    state.cops = [];
    state.camera.x = p.x;
    state.camera.y = p.y;
    state.stats.arrests += 1;
    say(reason === 'busted'
      ? `BUSTED! The Bay PD took $${fine}. You woke up at Bay General.`
      : `WASTED! The Bay PD took $${fine}. You woke up at Bay General.`, 6);
  }

  function completeMission() {
    const mission = MISSIONS[state.missionIndex];
    state.player.money += mission.reward;
    state.stats.missionsDone += 1;
    state.missionIndex += 1;
    state.missionStage = 0;
    state.missionTimer = 0;
    state.robProgress = 0;
    if (state.missionIndex < MISSIONS.length) {
      banner(MISSIONS[state.missionIndex].brief);
      say(`Mission complete! +$${mission.reward} — ${MISSIONS[state.missionIndex].title} unlocked.`, 5);
    } else {
      banner('ROOK: "That\'s all five jobs, kid. The Bay is yours now."');
      say(`All missions done! +$${mission.reward}. Free roam — Neon Bay is yours.`, 6);
    }
    return EVENT_MISSION_DONE;
  }

  function startMission(index) {
    state.missionIndex = index;
    state.missionStage = 0;
    state.robProgress = 0;
    if (index === 2) {
      state.player.wanted = 2;
      state.crimeTimer = 0;
    }
    if (index === 3) state.missionTimer = 90;
    banner(MISSIONS[index].brief);
  }

  function nearestCar(x, y, maxDist) {
    let best = null;
    let bestDist = maxDist;
    for (const car of state.cars) {
      if (car.hp <= 0 && car.kind === 'traffic') continue;
      const d = dist(x, y, car.x, car.y);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    for (const car of state.policeCars) {
      const d = dist(x, y, car.x, car.y);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    return best;
  }

  function fireBullet(fromX, fromY, toX, toY, byPolice) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let hitDist = PISTOL_RANGE;
    let hitPed = null;
    let hitCop = null;
    let hitCar = null;
    const targets = [];
    for (const ped of state.peds) if (ped.hp > 0) targets.push({ e: ped, r: 24, kind: 'ped' });
    for (const cop of state.cops) targets.push({ e: cop, r: 24, kind: 'cop' });
    for (const car of [...state.cars, ...state.policeCars]) targets.push({ e: car, r: 36, kind: 'car' });
    for (const t of targets) {
      const relX = t.e.x - fromX;
      const relY = t.e.y - fromY;
      const along = relX * dx + relY * dy;
      if (along < 0 || along > PISTOL_RANGE) continue;
      const perp = Math.abs(-relX * dy + relY * dx);
      if (perp < t.r && along < hitDist) {
        hitDist = along;
        hitPed = t.kind === 'ped' ? t.e : null;
        hitCop = t.kind === 'cop' ? t.e : null;
        hitCar = t.kind === 'car' ? t.e : null;
      }
    }
    const endX = fromX + dx * hitDist;
    const endY = fromY + dy * hitDist;
    state.tracers.push({ x1: fromX, y1: fromY, x2: endX, y2: endY, life: 0.09, maxLife: 0.09 });
    addParticles(endX, endY, 4, '#ffd76e', 120, 0.3);
    let event = EVENT_SHOT;
    if (hitPed) {
      hitPed.hp -= PISTOL_DAMAGE;
      if (hitPed.hp <= 0) {
        hitPed.state = 'down';
        addParticles(hitPed.x, hitPed.y, 10, '#c0392b', 140, 0.5);
        if (!byPolice && addWanted(1)) event |= EVENT_CRIME;
      }
    } else if (hitCop) {
      hitCop.hp -= PISTOL_DAMAGE;
      if (hitCop.hp <= 0) {
        state.cops = state.cops.filter((c) => c !== hitCop);
        addParticles(hitCop.x, hitCop.y, 10, '#c0392b', 140, 0.5);
        if (!byPolice && addWanted(2)) event |= EVENT_CRIME;
      }
    } else if (hitCar) {
      hitCar.hp -= PISTOL_DAMAGE;
      hitCar.damage += PISTOL_DAMAGE;
      if (hitCar.hp <= 0) addParticles(hitCar.x, hitCar.y, 14, '#888888', 160, 0.8);
      if (!byPolice && hitCar.kind !== 'police' && addWanted(1)) event |= EVENT_CRIME;
    }
    if (byPolice) {
      // Police fire at the player, not through the raycast above.
      const p = state.player;
      if (dist(fromX, fromY, p.x, p.y) < PISTOL_RANGE && p.invulnerable <= 0) {
        if (rng.chance(0.45)) {
          p.hp -= 9;
          addParticles(p.x, p.y, 6, '#c0392b', 120, 0.4);
        }
      }
    }
    return event;
  }

  function updateMissions(dt, input) {
    const p = state.player;
    const idx = state.missionIndex;
    if (idx >= MISSIONS.length) return EVENT_NONE;
    const target = missionTarget(idx, state);
    if (idx === 0) {
      if (p.inCar && target && dist(p.x, p.y, target.x, target.y) < target.radius) {
        return completeMission();
      }
    } else if (idx === 1) {
      if (state.missionStage === 0) {
        const coupe = state.cars.find((c) => c.mission === 2);
        if (p.inCar === coupe) {
          state.missionStage = 1;
          say('Got the coupe! Now bring it to Rook\'s garage.', 4);
        }
      } else if (p.inCar && target && dist(p.x, p.y, target.x, target.y) < target.radius) {
        return completeMission();
      }
    } else if (idx === 2) {
      if (p.wanted === 0) return completeMission();
    } else if (idx === 3) {
      state.missionTimer -= dt;
      if (state.missionTimer <= 0) {
        state.missionTimer = 90;
        say('Too slow! The package run reset — try again.', 4);
      } else if (target && dist(p.x, p.y, target.x, target.y) < target.radius) {
        return completeMission();
      }
    } else if (idx === 4) {
      if (state.missionStage === 0) {
        if (target && dist(p.x, p.y, target.x, target.y) < target.radius && !p.inCar) {
          if (input.enterHeld) {
            state.robProgress += dt;
            if (state.robProgress >= 3) {
              state.missionStage = 1;
              state.robProgress = 0;
              p.money += 200;
              addWanted(3);
              say('Store cleaned out! +$200 cash. Now lose the heat and get to the garage!', 5);
            }
          } else {
            state.robProgress = Math.max(0, state.robProgress - dt * 2);
          }
        } else {
          state.robProgress = 0;
        }
      } else if (target && dist(p.x, p.y, target.x, target.y) < target.radius) {
        return completeMission();
      }
    }
    return EVENT_NONE;
  }

  function updatePolice(dt) {
    const p = state.player;
    const wanted = p.wanted;
    const wantCars = wanted >= 1 ? Math.min(wanted, 3) : 0;
    const wantCops = wanted >= 2 ? Math.min(wanted - 1, 3) : 0;
    // Spawn police cars on a street near the player.
    while (state.policeCars.length < wantCars) {
      const angle = rng.range(0, Math.PI * 2);
      const sx = clamp(p.x + Math.cos(angle) * 900, 120, WORLD_W - 500);
      const sy = clamp(p.y + Math.sin(angle) * 900, 120, WORLD_H - 120);
      const spot = nearestIntersection(sx, sy);
      state.policeCars.push(createPoliceCar(rng, spot.x, spot.y));
    }
    while (state.policeCars.length > wantCars) state.policeCars.pop();
    while (state.cops.length < wantCops) {
      const angle = rng.range(0, Math.PI * 2);
      state.cops.push(createCop(rng, clamp(p.x + Math.cos(angle) * 420, 60, WORLD_W - 60), clamp(p.y + Math.sin(angle) * 420, 60, WORLD_H - 60)));
    }
    while (state.cops.length > wantCops) state.cops.pop();
    state.sirenOn = wanted > 0;

    for (const car of state.policeCars) {
      chaseSteer(car, p.x, p.y, dt, 430 + wanted * 12,
        (x, y) => Boolean(collideCircle(city, x, y, 26)));
      if (car.hp < 40) addParticles(car.x, car.y, 1, '#555555', 40, 0.6);
      // Ram the player's car: shove it forward instead of pinning it. The
      // damage only fires once per ram (a cooldown), not every frame.
      car.ramTimer = Math.max(0, car.ramTimer - dt);
      if (p.inCar && dist(car.x, car.y, p.x, p.y) < 58 && car.ramTimer <= 0) {
        car.ramTimer = 0.6;
        p.inCar.hp -= 6;
        p.inCar.damage += 6;
        const pushAngle = Math.atan2(p.y - car.y, p.x - car.x);
        const pushX = p.inCar.x + Math.cos(pushAngle) * 10;
        const pushY = p.inCar.y + Math.sin(pushAngle) * 10;
        if (!collideCircle(city, pushX, pushY, 22)) {
          p.inCar.x = pushX;
          p.inCar.y = pushY;
        }
        car.speed *= 0.7;
        state.shake = 0.25;
        addParticles(p.x, p.y, 6, '#ffd76e', 150, 0.4);
      }
    }
    for (const cop of state.cops) {
      const d = dist(cop.x, cop.y, p.x, p.y);
      const angle = Math.atan2(p.y - cop.y, p.x - cop.x);
      cop.angle = angle;
      cop.x += Math.cos(angle) * cop.speed * dt;
      cop.y += Math.sin(angle) * cop.speed * dt;
      cop.walkPhase += dt * 10;
      const fixed = resolveCircle(city, cop.x, cop.y, cop.radius);
      cop.x = fixed.x;
      cop.y = fixed.y;
      cop.shootCooldown -= dt;
      if (wanted >= 3 && d < 420 && d > 60 && cop.shootCooldown <= 0) {
        cop.shootCooldown = rng.range(0.9, 1.6);
        fireBullet(cop.x, cop.y, p.x, p.y, true);
      }
      if (!p.inCar && d < 28 && p.invulnerable <= 0) {
        respawn('busted');
        return EVENT_BUSTED;
      }
    }
    return EVENT_NONE;
  }

  function updateWanted(dt) {
    const p = state.player;
    if (p.wanted === 0) return;
    state.crimeTimer += dt;
    const nearestPolice = Math.min(
      ...state.policeCars.map((c) => dist(c.x, c.y, p.x, p.y)),
      ...state.cops.map((c) => dist(c.x, c.y, p.x, p.y)),
      99999,
    );
    if (state.crimeTimer > CRIME_QUIET_SECONDS && nearestPolice > 600) {
      state.wantedTimer += dt;
      if (state.wantedTimer >= WANTED_DECAY_SECONDS) {
        state.wantedTimer = 0;
        p.wanted -= 1;
        if (p.wanted === 0) say('You lost them. The heat is off — for now.', 4);
      }
    } else {
      state.wantedTimer = 0;
    }
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    p.punchCooldown = Math.max(0, p.punchCooldown - dt);
    p.shootCooldown = Math.max(0, p.shootCooldown - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);

    if (p.inCar) {
      const car = p.inCar;
      const forward = input.ay < 0 ? 1 : input.ay > 0 ? -1 : 0;
      if (input.ay < 0) {
        car.speed += CAR_ACCEL * dt;
      } else if (input.ay > 0) {
        if (car.speed > 20) car.speed -= CAR_BRAKE * dt;
        else car.speed -= CAR_ACCEL * 0.6 * dt;
      } else {
        car.speed -= car.speed * 0.5 * dt;
      }
      const maxSpeed = car.hp > 0 ? CAR_MAX_SPEED * (car.hp < 30 ? 0.45 : 1) : 0;
      car.speed = clamp(car.speed, -CAR_MAX_REVERSE, maxSpeed);
      const turnFactor = Math.max(0.3, Math.min(1, Math.abs(car.speed) / 170)) * (car.speed >= 0 ? 1 : -1);
      car.angle += input.ax * CAR_TURN * turnFactor * dt;
      // Never let the car overlap a building: push it out first, then slide
      // along walls axis by axis instead of sticking on a corner.
      const freed = resolveCircle(city, car.x, car.y, 22);
      car.x = freed.x;
      car.y = freed.y;
      const stepX = Math.cos(car.angle) * car.speed * dt;
      const stepY = Math.sin(car.angle) * car.speed * dt;
      const nx = car.x + stepX;
      const ny = car.y + stepY;
      const frontX = nx + Math.cos(car.angle) * 26;
      const frontY = ny + Math.sin(car.angle) * 26;
      const hitX = collideCircle(city, nx, car.y, 22)
        || collideCircle(city, frontX, car.y + Math.sin(car.angle) * 26, 20);
      const hitY = collideCircle(city, car.x, ny, 22)
        || collideCircle(city, car.x + Math.cos(car.angle) * 26, frontY, 20);
      if (!hitX) car.x = nx;
      if (!hitY) car.y = ny;
      if (hitX || hitY) {
        car.speed *= -0.25;
        car.hp -= 9;
        car.damage += 9;
        state.shake = 0.3;
        addParticles(frontX, frontY, 8, '#ffd76e', 180, 0.4);
        if (Math.abs(car.speed) > 120) say('Crash!', 1);
      }
      // Skid marks and smoke when sliding hard.
      if (Math.abs(input.ax) > 0.4 && Math.abs(car.speed) > 240) {
        addSkid(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, car.angle);
        if (Math.random() < 0.3) addParticles(car.x, car.y, 1, '#cccccc', 30, 0.7);
      }
      if (car.hp < 35 && Math.random() < 0.2) addParticles(car.x, car.y - 10, 1, '#555555', 40, 0.8);
      // Hit pedestrians with the car.
      for (const ped of state.peds) {
        if (ped.hp <= 0) continue;
        if (dist(car.x, car.y, ped.x, ped.y) < 36 && Math.abs(car.speed) > 60) {
          ped.hp = 0;
          ped.state = 'down';
          addParticles(ped.x, ped.y, 10, '#c0392b', 150, 0.5);
          car.speed *= 0.85;
          car.hp -= 3;
          if (addWanted(1)) { /* crime counted below */ }
          state.shake = 0.2;
        }
      }
      // Bump into other cars. Position separation runs every frame, but the
      // speed loss and damage only fire once per bump (a cooldown), so a
      // car riding your bumper does not drain you to a stop.
      for (const other of [...state.cars, ...state.policeCars]) {
        if (other === car) continue;
        const d = dist(car.x, car.y, other.x, other.y);
        if (d < 56 && d > 0.01) {
          const push = (56 - d) / 2;
          const ux = (car.x - other.x) / d;
          const uy = (car.y - other.y) / d;
          car.x += ux * push;
          car.y += uy * push;
          if (other.kind !== 'parked') {
            other.x -= ux * push;
            other.y -= uy * push;
          }
          if (Math.abs(car.speed) > 90 && car.bumpTimer <= 0) {
            car.speed *= 0.6;
            car.hp -= 5;
            other.hp -= 5;
            car.bumpTimer = 0.5;
            addParticles(car.x, car.y, 5, '#ffd76e', 120, 0.3);
            state.shake = 0.2;
          }
        }
      }
      car.bumpTimer = Math.max(0, car.bumpTimer - dt);
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      p.speed = car.speed;
      if (input.enter) {
        // Step out on the driver's side.
        const side = car.angle + Math.PI / 2;
        p.x = car.x + Math.cos(side) * 34;
        p.y = car.y + Math.sin(side) * 34;
        const fixed = resolveCircle(city, p.x, p.y, PLAYER_RADIUS);
        p.x = fixed.x;
        p.y = fixed.y;
        p.inCar = null;
        p.speed = 0;
      }
      return EVENT_NONE;
    }

    // On foot.
    const len = Math.hypot(input.ax, input.ay) || 1;
    const speed = input.run ? RUN_SPEED : WALK_SPEED;
    const vx = (input.ax / len) * speed * (input.ax || input.ay ? 1 : 0);
    const vy = (input.ay / len) * speed * (input.ax || input.ay ? 1 : 0);
    if (input.ax || input.ay) {
      p.angle = Math.atan2(vy, vx);
      p.walkPhase += dt * (input.run ? 13 : 9);
    }
    const nx = p.x + vx * dt;
    const ny = p.y + vy * dt;
    const fixedX = resolveCircle(city, nx, p.y, PLAYER_RADIUS);
    const fixed = resolveCircle(city, fixedX.x, ny, PLAYER_RADIUS);
    p.x = fixed.x;
    p.y = fixed.y;
    p.speed = Math.hypot(vx, vy);

    if (input.enter) {
      const car = nearestCar(p.x, p.y, 78);
      if (car) {
        const stolen = car.kind === 'parked' || car.kind === 'traffic';
        if (car.kind === 'parked') car.kind = 'traffic';
        p.inCar = car;
        p.x = car.x;
        p.y = car.y;
        if (stolen) {
          state.stats.carsStolen += 1;
          addWanted(1);
          say('Car stolen! The cops are on to you.', 3);
          return EVENT_ENTER_CAR | EVENT_CRIME;
        }
        return EVENT_ENTER_CAR;
      }
    }
    if (input.punch && p.punchCooldown <= 0) {
      p.punchCooldown = 0.45;
      let hitAnything = false;
      for (const ped of state.peds) {
        if (ped.hp > 0 && dist(p.x, p.y, ped.x, ped.y) < PUNCH_RANGE + 12) {
          ped.hp -= PUNCH_DAMAGE;
          if (ped.hp <= 0) {
            ped.state = 'down';
            addWanted(1);
            hitAnything = true;
          }
          addParticles(ped.x, ped.y, 5, '#ffd76e', 100, 0.3);
          hitAnything = true;
        }
      }
      for (const cop of state.cops) {
        if (dist(p.x, p.y, cop.x, cop.y) < PUNCH_RANGE + 12) {
          cop.hp -= PUNCH_DAMAGE;
          if (cop.hp <= 0) {
            state.cops = state.cops.filter((c) => c !== cop);
            addWanted(2);
          }
          hitAnything = true;
        }
      }
      if (hitAnything) return EVENT_CRIME;
    }
    if (input.click && p.shootCooldown <= 0) {
      if (p.ammo > 0) {
        p.shootCooldown = 0.22;
        p.ammo -= 1;
        return fireBullet(p.x, p.y, input.mouseX, input.mouseY, false);
      }
      if (p.reserveAmmo > 0) {
        p.reserveAmmo -= 30;
        p.ammo += 30;
        say('Reloaded from reserve ammo.', 2);
      } else {
        say('Out of ammo! Find an ammo pickup (yellow crate).', 3);
      }
    }
    return EVENT_NONE;
  }

  function step(dt, input) {
    state.time += dt;
    state.clockMinutes += dt * 0.5;
    state.shake = Math.max(0, state.shake - dt * 1.4);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    for (const t of state.tracers) t.life -= dt;
    state.tracers = state.tracers.filter((t) => t.life > 0);
    for (const pt of state.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
    }
    state.particles = state.particles.filter((pt) => pt.life > 0);
    for (const s of state.skids) s.life -= dt;
    state.skids = state.skids.filter((s) => s.life > 0);

    let events = stepPlayer(dt, input);
    if (events & (EVENT_BUSTED | EVENT_WASTED)) return events;

    // Traffic.
    for (const car of state.cars) {
      if (car.kind === 'traffic' && car !== state.player.inCar && car.hp > 0) {
        driveTraffic(car, dt, [...state.cars, ...state.policeCars], rng);
      }
    }
    // Keep cars from piling up on top of each other at intersections.
    const allCars = [...state.cars, ...state.policeCars];
    for (let i = 0; i < allCars.length; i += 1) {
      for (let j = i + 1; j < allCars.length; j += 1) {
        const a = allCars[i];
        const b = allCars[j];
        if (a === state.player.inCar || b === state.player.inCar) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < 52 && d > 0.01) {
          const push = (52 - d) / 2;
          const ux = (a.x - b.x) / d;
          const uy = (a.y - b.y) / d;
          a.x += ux * push;
          a.y += uy * push;
          b.x -= ux * push;
          b.y -= uy * push;
        }
      }
    }
    // Pedestrians; panic when a shot rings out or a fast car is near.
    const danger = state.tracers.length > 0
      ? { x: state.player.x, y: state.player.y }
      : null;
    for (const ped of state.peds) {
      if (ped.hp <= 0) continue;
      let scare = danger;
      if (!scare && state.player.inCar && Math.abs(state.player.speed) > 200
        && dist(ped.x, ped.y, state.player.x, state.player.y) < 160) {
        scare = { x: state.player.x, y: state.player.y };
      }
      walkPed(ped, dt, scare, rng);
      const fixed = resolveCircle(city, ped.x, ped.y, ped.radius);
      ped.x = fixed.x;
      ped.y = fixed.y;
    }
    // Downed pedestrians get back up after a while, away from trouble.
    for (const ped of state.peds) {
      if (ped.hp <= 0) {
        ped.hp += dt * 4;
        if (ped.hp >= 40) {
          ped.hp = 100;
          ped.state = 'walk';
          ped.x = clamp(ped.x + 200, 60, WORLD_W - 60);
          ped.y = clamp(ped.y + 200, 60, WORLD_H - 60);
        }
      }
    }

    const policeEvents = updatePolice(dt);
    events |= policeEvents;
    if (events & EVENT_BUSTED) return events;
    updateWanted(dt);

    const missionEvents = updateMissions(dt, input);
    events |= missionEvents;

    // Pickups.
    for (const pk of city.pickups) {
      if (pk.taken) continue;
      if (dist(state.player.x, state.player.y, pk.x, pk.y) < 34) {
        pk.taken = true;
        if (pk.kind === 'ammo') {
          state.player.reserveAmmo += 30;
          say('Ammo pickup! +30 reserve rounds.', 3);
        } else {
          state.player.hp = Math.min(PLAYER_MAX_HP, state.player.hp + 40);
          say('Health pickup! +40 HP.', 3);
        }
      }
    }

    // Player health.
    if (state.player.hp <= 0) {
      respawn('wasted');
      return events | EVENT_WASTED;
    }

    // Camera follows the player smoothly.
    const targetX = state.player.x;
    const targetY = state.player.y;
    state.camera.x += (targetX - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (targetY - state.camera.y) * Math.min(1, dt * 5);
    return events;
  }

  function reset() {
    const p = state.player;
    p.x = 600;
    p.y = 1650;
    p.angle = -Math.PI / 2;
    p.hp = PLAYER_MAX_HP;
    p.money = 250;
    p.wanted = 0;
    p.ammo = PISTOL_AMMO_START;
    p.reserveAmmo = 60;
    p.inCar = null;
    p.speed = 0;
    p.invulnerable = 0;
    state.time = 0;
    state.clockMinutes = CLOCK_START_MINUTES;
    state.missionIndex = 0;
    state.missionStage = 0;
    state.missionTimer = 0;
    state.robProgress = 0;
    state.banner = null;
    state.message = null;
    state.particles = [];
    state.skids = [];
    state.tracers = [];
    state.camera.x = p.x;
    state.camera.y = p.y;
    state.stats = { carsStolen: 0, missionsDone: 0, arrests: 0 };
    for (const pk of city.pickups) pk.taken = false;
    spawnTrafficAndPeds();
  }

  function serialize() {
    const p = state.player;
    return {
      money: p.money, missionIndex: state.missionIndex, x: p.x, y: p.y,
      hp: p.hp, ammo: p.ammo, reserveAmmo: p.reserveAmmo,
    };
  }

  function restore(save) {
    reset();
    const p = state.player;
    p.money = save.money ?? 250;
    state.missionIndex = save.missionIndex ?? 0;
    p.x = save.x ?? 600;
    p.y = save.y ?? 1650;
    p.hp = save.hp ?? PLAYER_MAX_HP;
    p.ammo = save.ammo ?? PISTOL_AMMO_START;
    p.reserveAmmo = save.reserveAmmo ?? 60;
    state.camera.x = p.x;
    state.camera.y = p.y;
    if (state.missionIndex < MISSIONS.length) banner(MISSIONS[state.missionIndex].brief);
  }

  return {
    state,
    step,
    reset,
    serialize,
    restore,
    startMission,
    /** Drop a patrol car at a spot (used by the screenshot staging). */
    addPoliceCar(x, y) {
      const car = createPoliceCar(rng, x, y);
      state.policeCars.push(car);
      return car;
    },
    missionObjective: (index) => missionObjective(index, state),
    missionTarget: (index) => missionTarget(index, state),
    say,
    banner,
  };
}

export { PALETTE, SAND_X, WATER_X };
