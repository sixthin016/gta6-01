// Neon Bay — the 3D world. One job: build the three.js scene from city data
// and keep every mesh in sync with the game state each frame.
import * as THREE from 'three';
import { CFG } from './config.js';
import { generateCity, collideCircle, resolveCircle, nearestIntersection } from './city.js';
import { mulberry32, range } from './random.js';
import {
  createPlayer, createPed, createCar, createPoliceCar, createCop,
  driveTraffic, chaseSteer, walkPed, randomRoadSpot,
} from './entities.js';
import { MISSIONS, missionTarget, missionBrief } from './missions.js';

function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, emissive: opts.emissive ?? 0x000000 }),
  );
  m.castShadow = opts.shadow !== false;
  m.receiveShadow = true;
  return m;
}

export function makeCarMesh(color, kind = 'sedan') {
  const g = new THREE.Group();
  const body = box(2.0, 0.62, kind === 'coupe' ? 4.0 : 4.4, color);
  body.position.y = 0.55;
  g.add(body);
  const cabin = box(1.7, 0.55, 2.0, 0x18242f, { emissive: 0x0a1420 });
  cabin.position.set(0, 1.05, kind === 'coupe' ? -0.2 : 0.1);
  g.add(cabin);
  if (kind === 'police') {
    const band = box(2.02, 0.2, 1.1, 0x111111);
    band.position.set(0, 0.62, 0);
    g.add(band);
    const bar = box(0.9, 0.14, 0.5, 0xffffff, { emissive: 0x882222 });
    bar.position.set(0, 1.42, 0.1);
    bar.name = 'lightbar';
    g.add(bar);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    w.castShadow = true;
    g.add(w);
  }
  const head = box(1.6, 0.12, 0.1, 0xfff8c9, { emissive: 0x777744 });
  head.position.set(0, 0.6, kind === 'coupe' ? 2.0 : 2.2);
  g.add(head);
  return g;
}

export function makePersonMesh(shirt, skin, isCop = false) {
  const g = new THREE.Group();
  const legs = box(0.5, 0.8, 0.3, isCop ? 0x1c2733 : 0x3a3f4a);
  legs.position.y = 0.4;
  g.add(legs);
  const torso = box(0.62, 0.75, 0.36, isCop ? 0x22384f : shirt);
  torso.position.y = 1.15;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.78;
  head.castShadow = true;
  g.add(head);
  if (isCop) {
    const cap = box(0.5, 0.1, 0.5, 0x0f1c2b);
    cap.position.y = 2.0;
    g.add(cap);
  }
  return g;
}

export function createWorld3D(seed) {
  const city = generateCity(seed);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CFG.colors.sky);
  scene.fog = new THREE.Fog(CFG.colors.sky, 260, 620);
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 1200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a7a3a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(CFG.colors.sun, 1.6);
  sun.position.set(140, 220, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  scene.add(sun);

  const H = CFG.worldHalf;
  // Ground, beach, water.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2),
    new THREE.MeshLambertMaterial({ color: CFG.colors.ground }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CFG.waterX - CFG.beachX + 4, H * 2),
    new THREE.MeshLambertMaterial({ color: CFG.colors.sand }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set((CFG.beachX + CFG.waterX) / 2, 0.02, 0);
  sand.receiveShadow = true;
  scene.add(sand);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(120, H * 2 + 400),
    new THREE.MeshLambertMaterial({ color: CFG.colors.water, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(CFG.waterX + 60, 0.05, 0);
  scene.add(water);
  // Roads: dark strips along every grid line, plus pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: CFG.colors.road });
  const dashMat = new THREE.MeshLambertMaterial({ color: 0xf5d76e });
  for (const v of city.lines) {
    const rv = new THREE.Mesh(new THREE.PlaneGeometry(CFG.roadHalf * 2, H * 2), roadMat);
    rv.rotation.x = -Math.PI / 2; rv.position.set(v, 0.03, 0); rv.receiveShadow = true;
    scene.add(rv);
    const rh = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, CFG.roadHalf * 2), roadMat);
    rh.rotation.x = -Math.PI / 2; rh.position.set(0, 0.03, v); rh.receiveShadow = true;
    scene.add(rh);
    for (let d = -H + 12; d < H; d += 24) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(v, 0.05, d);
      scene.add(dash);
    }
  }
  // Buildings with pale roofs and glowing windows.
  const winMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0x554411 });
  for (const b of city.buildings) {
    const m = box(b.w, b.h, b.d, b.color);
    m.position.set(b.x + b.w / 2, b.h / 2, b.z + b.d / 2);
    scene.add(m);
    const roof = box(b.w + 0.3, 0.4, b.d + 0.3, b.roof);
    roof.position.set(b.x + b.w / 2, b.h + 0.2, b.z + b.d / 2);
    scene.add(roof);
    const floors = Math.max(1, Math.floor(b.h / 6));
    for (let f = 0; f < floors; f += 1) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(b.w - 2, 6), 1.2), winMat);
      win.position.set(b.x + b.w / 2, 3 + f * 6, b.z + b.d / 2 + 0.06);
      scene.add(win);
    }
  }
  // Palms: trunk + fronds; lamps: pole + warm bulb.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a33 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e4f });
  for (const p of city.palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.4, 8), trunkMat);
    trunk.position.set(p.x, 1.7, p.z);
    trunk.castShadow = true;
    scene.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.6, 8), leafMat);
    top.position.set(p.x, 4.0, p.z);
    top.castShadow = true;
    scene.add(top);
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xaa8833 });
  for (const l of city.lamps) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 8), poleMat);
    pole.position.set(l.x, 2.1, l.z);
    scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bulbMat);
    bulb.position.set(l.x, 4.3, l.z);
    scene.add(bulb);
  }
  // Mission waypoint beacon: a tall golden pillar, visible across the city.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.position.y = 30;
  scene.add(beacon);
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: 0xffd700 }));
  marker.position.y = 4;
  scene.add(marker);

  return { scene, camera, renderer, city, sun, beacon, marker };
}

// ---------------------------------------------------------------------------
// Simulation: one state object + one fixed step. Walking, driving, traffic,
// pedestrians, police pursuit, wanted level, combat, pickups, the garage and
// crew, and the ten Rook missions all run here. Meshes are attached to the
// entities so render.js can sync them every frame.
// ---------------------------------------------------------------------------

export const EVENT_NONE = 0;
export const EVENT_MISSION_DONE = 1;
export const EVENT_BUSTED = 2;
export const EVENT_WASTED = 4;
export const EVENT_CRIME = 8;
export const EVENT_SHOT = 16;
export const EVENT_ENTER_CAR = 32;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }

export function createGame(w3d, seed) {
  const rng = mulberry32(seed);
  const { scene, city } = w3d;
  const lines = city.lines;
  const state = {
    rng, city, seed,
    player: createPlayer(-96, -72),
    cars: [], peds: [], cops: [], policeCars: [],
    garage: [], crew: [],
    time: 0, clockMinutes: 10 * 60 + 5,
    missionIndex: 0, missionStage: 0, missionTimer: 0,
    robProgress: 0, waitProgress: 0,
    banner: null, bannerTimer: 0, message: null, messageTimer: 0,
    wantedTimer: 0, crimeTimer: 99, sirenOn: false,
    stats: { carsStolen: 0, missionsDone: 0, arrests: 0 },
    started: false, playerMesh: null,
  };

  function say(text, seconds) { state.message = text; state.messageTimer = seconds || 4; }
  function banner(text) { state.banner = text; state.bannerTimer = 7; }
  function addWanted(amount) {
    const before = state.player.wanted;
    state.player.wanted = clamp(state.player.wanted + amount, 0, 5);
    state.crimeTimer = 0;
    state.wantedTimer = 0;
    return state.player.wanted > before;
  }

  function spawnAll() {
    // Clear old meshes.
    for (const c of [...state.cars, ...state.policeCars]) if (c.mesh) scene.remove(c.mesh);
    for (const p of state.peds) if (p.mesh) scene.remove(p.mesh);
    for (const c of state.cops) if (c.mesh) scene.remove(c.mesh);
    if (state.playerMesh) scene.remove(state.playerMesh);
    state.cars = []; state.peds = []; state.cops = []; state.policeCars = [];
    for (const spot of city.parked) {
      const car = createCar(rng, spot.x, spot.z, spot.angle, {
        kind: 'parked', color: spot.color, model: spot.model, mission: spot.mission, id: 100 + state.cars.length,
      });
      car.mesh = makeCarMesh(car.color, car.model);
      scene.add(car.mesh);
      state.cars.push(car);
    }
    for (let i = 0; i < CFG.trafficCount; i += 1) {
      const spot = randomRoadSpot(rng, lines);
      const car = createCar(rng, spot.x, spot.z, spot.angle, { kind: 'traffic', speed: 8 + rng() * 4, id: i });
      car.mesh = makeCarMesh(car.color, car.model);
      scene.add(car.mesh);
      state.cars.push(car);
    }
    for (let i = 0; i < CFG.pedCount; i += 1) {
      const ped = createPed(rng, range(rng, -200, 180), range(rng, -200, 200));
      ped.mesh = makePersonMesh(ped.shirt, ped.skin);
      scene.add(ped.mesh);
      state.peds.push(ped);
    }
    state.playerMesh = makePersonMesh(0xff7a1a, 0xf2c89b);
    scene.add(state.playerMesh);
  }

  function respawn(reason) {
    const p = state.player;
    const fine = reason === 'busted' ? 100 : 150;
    p.money = Math.max(0, p.money - fine);
    p.hp = 100;
    p.wanted = 0;
    p.inCar = null;
    p.x = 48; p.z = -24;
    p.angle = Math.PI / 2;
    p.invulnerable = 3;
    p.bustedTimer = 0;
    for (const c of state.policeCars) if (c.mesh) scene.remove(c.mesh);
    for (const c of state.cops) if (c.mesh) scene.remove(c.mesh);
    state.policeCars = [];
    state.cops = [];
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
    state.waitProgress = 0;
    if (state.missionIndex < MISSIONS.length) {
      banner(missionBrief(state.missionIndex));
      say(`Mission complete! +$${mission.reward} — ${MISSIONS[state.missionIndex].title} unlocked.`, 5);
    } else {
      banner('ROOK: "That\'s all ten jobs, kid. The Bay is yours now."');
      say(`All missions done! +$${mission.reward}. Free roam — Neon Bay is yours.`, 6);
    }
    return EVENT_MISSION_DONE;
  }

  function startMission(index) {
    state.missionIndex = index;
    state.missionStage = 0;
    state.robProgress = 0;
    state.waitProgress = 0;
    const m = MISSIONS[index];
    if (m.timeLimit) state.missionTimer = m.timeLimit;
    if (m.startWanted) state.player.wanted = m.startWanted;
    banner(m.brief);
  }

  function nearestCar(x, z, maxDist) {
    let best = null, bestDist = maxDist;
    for (const car of [...state.cars, ...state.policeCars]) {
      const d = dist(x, z, car.x, car.z);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    return best;
  }

  function fireBullet(fromX, fromZ, toX, toZ, byPolice) {
    const angle = Math.atan2(toZ - fromZ, toX - fromX);
    const dx = Math.cos(angle), dz = Math.sin(angle);
    let hitDist = 60;
    let hitPed = null, hitCop = null, hitCar = null;
    const targets = [];
    for (const ped of state.peds) if (ped.hp > 0) targets.push({ e: ped, r: 1.4, kind: 'ped' });
    for (const cop of state.cops) targets.push({ e: cop, r: 1.4, kind: 'cop' });
    for (const car of [...state.cars, ...state.policeCars]) targets.push({ e: car, r: 2.4, kind: 'car' });
    for (const t of targets) {
      const relX = t.e.x - fromX, relZ = t.e.z - fromZ;
      const along = relX * dx + relZ * dz;
      if (along < 0 || along > 60) continue;
      const perp = Math.abs(-relX * dz + relZ * dx);
      if (perp < t.r && along < hitDist) {
        hitDist = along;
        hitPed = t.kind === 'ped' ? t.e : null;
        hitCop = t.kind === 'cop' ? t.e : null;
        hitCar = t.kind === 'car' ? t.e : null;
      }
    }
    let event = EVENT_SHOT;
    if (hitPed) {
      hitPed.hp -= 34;
      if (hitPed.hp <= 0 && !byPolice && addWanted(1)) event |= EVENT_CRIME;
    } else if (hitCop) {
      hitCop.hp -= 34;
      if (hitCop.hp <= 0) {
        if (hitCop.mesh) scene.remove(hitCop.mesh);
        state.cops = state.cops.filter((c) => c !== hitCop);
        if (!byPolice && addWanted(2)) event |= EVENT_CRIME;
      }
    } else if (hitCar) {
      hitCar.hp -= 34;
      hitCar.damage += 34;
      if (!byPolice && hitCar.kind !== 'police' && addWanted(1)) event |= EVENT_CRIME;
    }
    if (byPolice) {
      const p = state.player;
      if (dist(fromX, fromZ, p.x, p.z) < 60 && p.invulnerable <= 0 && rng() < 0.45) p.hp -= 9;
    }
    return event;
  }

  function updateMissions(dt, input) {
    const p = state.player;
    const idx = state.missionIndex;
    if (idx >= MISSIONS.length) return EVENT_NONE;
    const m = MISSIONS[idx];
    const target = missionTarget(idx, state.missionStage);
    if (m.timeLimit) {
      state.missionTimer -= dt;
      if (state.missionTimer <= 0) {
        state.missionTimer = m.timeLimit;
        say('Too slow! The job reset — try again.', 4);
        if (m.startWanted) p.wanted = m.startWanted;
        return EVENT_NONE;
      }
    }
    const atTarget = target && dist(p.x, p.z, target.x, target.z) < target.radius;
    if (m.type === 'goto') {
      if (atTarget && p.inCar) return completeMission();
    } else if (m.type === 'steal') {
      if (state.missionStage === 0) {
        const coupe = state.cars.find((c) => c.mission === 2);
        if (p.inCar === coupe) { state.missionStage = 1; say('Got the coupe! Now bring it to Rook\'s garage.', 4); }
      } else if (atTarget && p.inCar) return completeMission();
    } else if (m.type === 'lose') {
      if (p.wanted === 0) return completeMission();
    } else if (m.type === 'rob') {
      if (state.missionStage === 0) {
        if (atTarget && !p.inCar) {
          if (input.enterHeld) {
            state.robProgress += dt;
            if (state.robProgress >= 3) {
              state.missionStage = 1;
              state.robProgress = 0;
              p.money += 200;
              addWanted(3);
              say('Store cleaned out! +$200 cash. Now lose the heat and get to the garage!', 5);
            }
          } else state.robProgress = Math.max(0, state.robProgress - dt * 2);
        } else state.robProgress = 0;
      } else if (atTarget) return completeMission();
    } else if (m.type === 'wait') {
      if (state.missionStage === 0) {
        if (atTarget) {
          state.waitProgress += dt;
          if (state.waitProgress >= m.waitSeconds) {
            state.missionStage = 1;
            state.crew.push('Maya');
            say('Maya\'s in the crew! She rides with you now.', 4);
            return completeMission();
          }
        } else state.waitProgress = 0;
      }
    } else if (m.type === 'multi') {
      if (state.missionStage === 0) {
        if (atTarget && !p.inCar) {
          if (input.enterHeld) {
            state.robProgress += dt;
            if (state.robProgress >= 3) {
              state.missionStage = 1;
              state.robProgress = 0;
              p.money += 400;
              addWanted(4);
              say('The Big Score! +$400 in the bag. Get it to the garage!', 5);
            }
          } else state.robProgress = Math.max(0, state.robProgress - dt * 2);
        } else state.robProgress = 0;
      } else if (atTarget) return completeMission();
    }
    return EVENT_NONE;
  }

  function updatePolice(dt) {
    const p = state.player;
    const wanted = p.wanted;
    const wantCars = wanted >= 1 ? Math.min(wanted, 3) : 0;
    const wantCops = wanted >= 2 ? Math.min(wanted - 1, 3) : 0;
    while (state.policeCars.length < wantCars) {
      const angle = rng() * Math.PI * 2;
      const sx = clamp(p.x + Math.cos(angle) * 60, -220, 180);
      const sz = clamp(p.z + Math.sin(angle) * 60, -220, 220);
      const spot = nearestIntersection(sx, sz, lines);
      const car = createPoliceCar(rng, spot.x, spot.z);
      car.mesh = makeCarMesh(0x111111, 'police');
      scene.add(car.mesh);
      state.policeCars.push(car);
    }
    while (state.policeCars.length > wantCars) {
      const car = state.policeCars.pop();
      if (car.mesh) scene.remove(car.mesh);
    }
    while (state.cops.length < wantCops) {
      const angle = rng() * Math.PI * 2;
      const cop = createCop(rng, clamp(p.x + Math.cos(angle) * 30, -230, 230), clamp(p.z + Math.sin(angle) * 30, -230, 230));
      cop.mesh = makePersonMesh(0x22384f, 0xd9a066, true);
      scene.add(cop.mesh);
      state.cops.push(cop);
    }
    while (state.cops.length > wantCops) {
      const cop = state.cops.pop();
      if (cop.mesh) scene.remove(cop.mesh);
    }
    state.sirenOn = wanted > 0;
    for (const car of state.policeCars) {
      chaseSteer(car, p.x, p.z, dt, 30 + wanted * 2,
        (x, z) => Boolean(collideCircle(city, x, z, 2)));
      car.ramTimer = Math.max(0, car.ramTimer - dt);
      if (p.inCar && dist(car.x, car.z, p.x, p.z) < 4.5 && car.ramTimer <= 0) {
        car.ramTimer = 0.6;
        p.inCar.hp -= 6;
        p.inCar.damage += 6;
        car.speed *= 0.7;
      }
    }
    for (const cop of state.cops) {
      const d = dist(cop.x, cop.z, p.x, p.z);
      const angle = Math.atan2(p.z - cop.z, p.x - cop.x);
      cop.angle = angle;
      cop.x += Math.cos(angle) * cop.speed * dt;
      cop.z += Math.sin(angle) * cop.speed * dt;
      cop.walkPhase += dt * 10;
      const fixed = resolveCircle(city, cop.x, cop.z, cop.radius);
      cop.x = fixed.x; cop.z = fixed.z;
      cop.shootCooldown -= dt;
      if (wanted >= 3 && d < 30 && d > 4 && cop.shootCooldown <= 0) {
        cop.shootCooldown = range(rng, 0.9, 1.6);
        fireBullet(cop.x, cop.z, p.x, p.z, true);
      }
      if (!p.inCar && d < 2 && p.invulnerable <= 0) {
        p.bustedTimer += dt;
        if (p.bustedTimer > 1.2) { respawn('busted'); return EVENT_BUSTED; }
      } else p.bustedTimer = 0;
    }
    return EVENT_NONE;
  }

  function updateWanted(dt) {
    const p = state.player;
    if (p.wanted === 0) return;
    state.crimeTimer += dt;
    const nearestPolice = Math.min(
      ...state.policeCars.map((c) => dist(c.x, c.z, p.x, p.z)),
      ...state.cops.map((c) => dist(c.x, c.z, p.x, p.z)),
      99999,
    );
    if (state.crimeTimer > 9 && nearestPolice > 45) {
      state.wantedTimer += dt;
      if (state.wantedTimer >= CFG.wantedDecaySeconds) {
        state.wantedTimer = 0;
        p.wanted -= 1;
        if (p.wanted === 0) say('You lost them. The heat is off — for now.', 4);
      }
    } else state.wantedTimer = 0;
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    p.punchCooldown = Math.max(0, p.punchCooldown - dt);
    p.shootCooldown = Math.max(0, p.shootCooldown - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);

    if (p.inCar) {
      const car = p.inCar;
      if (input.ay < 0) car.speed += CFG.carAccel * dt;
      else if (input.ay > 0) {
        if (car.speed > 2) car.speed -= CFG.carBrake * dt;
        else car.speed -= CFG.carAccel * 0.6 * dt;
      } else car.speed -= car.speed * 0.5 * dt;
      const maxSpeed = car.hp > 0 ? CFG.carMaxSpeed * (car.hp < 30 ? 0.45 : 1) : 0;
      car.speed = clamp(car.speed, -CFG.carReverseMax, maxSpeed);
      const turnFactor = Math.max(0.3, Math.min(1, Math.abs(car.speed) / 14)) * (car.speed >= 0 ? 1 : -1);
      car.angle += input.ax * CFG.carTurn * turnFactor * dt;
      const freed = resolveCircle(city, car.x, car.z, 1.8);
      car.x = freed.x; car.z = freed.z;
      const stepX = Math.cos(car.angle) * car.speed * dt;
      const stepZ = Math.sin(car.angle) * car.speed * dt;
      const hitX = collideCircle(city, car.x + stepX, car.z, 1.8);
      const hitZ = collideCircle(city, car.x, car.z + stepZ, 1.8);
      if (!hitX) car.x += stepX;
      if (!hitZ) car.z += stepZ;
      if (hitX || hitZ) {
        car.speed *= -0.25;
        car.hp -= 9;
        car.damage += 9;
      }
      for (const ped of state.peds) {
        if (ped.hp <= 0) continue;
        if (dist(car.x, car.z, ped.x, ped.z) < 2.6 && Math.abs(car.speed) > 5) {
          ped.hp = 0;
          car.speed *= 0.85;
          car.hp -= 3;
          addWanted(1);
        }
      }
      for (const other of [...state.cars, ...state.policeCars]) {
        if (other === car) continue;
        const d = dist(car.x, car.z, other.x, other.z);
        if (d < 4.2 && d > 0.01) {
          const push = (4.2 - d) / 2;
          const ux = (car.x - other.x) / d, uz = (car.z - other.z) / d;
          car.x += ux * push; car.z += uz * push;
          if (other.kind !== 'parked') { other.x -= ux * push; other.z -= uz * push; }
          if (Math.abs(car.speed) > 8 && car.bumpTimer <= 0) {
            car.speed *= 0.6;
            car.hp -= 5; other.hp -= 5;
            car.bumpTimer = 0.5;
          }
        }
      }
      car.bumpTimer = Math.max(0, car.bumpTimer - dt);
      p.x = car.x; p.z = car.z; p.angle = car.angle; p.speed = car.speed;
      if (input.enter) {
        const side = car.angle + Math.PI / 2;
        p.x = car.x + Math.cos(side) * 2.6;
        p.z = car.z + Math.sin(side) * 2.6;
        const fixed = resolveCircle(city, p.x, p.z, p.radius);
        p.x = fixed.x; p.z = fixed.z;
        p.inCar = null;
        p.speed = 0;
      }
      return EVENT_NONE;
    }

    // On foot. Movement is camera-relative: W drives away from the camera.
    const len = Math.hypot(input.ax, input.ay) || 1;
    const speed = input.run ? CFG.runSpeed : CFG.walkSpeed;
    const mx = (input.ax / len) * speed * (input.ax || input.ay ? 1 : 0);
    const mz = (input.ay / len) * speed * (input.ax || input.ay ? 1 : 0);
    const yaw = input.camYaw || 0;
    const vx = mx * Math.cos(yaw) - mz * Math.sin(yaw);
    const vz = mx * Math.sin(yaw) + mz * Math.cos(yaw);
    if (input.ax || input.ay) {
      p.angle = Math.atan2(vz, vx);
      p.walkPhase += dt * (input.run ? 13 : 9);
    }
    const fixedX = resolveCircle(city, p.x + vx * dt, p.z, p.radius);
    const fixed = resolveCircle(city, fixedX.x, p.z + vz * dt, p.radius);
    p.x = fixed.x; p.z = fixed.z;
    p.speed = Math.hypot(vx, vz);

    if (input.enter) {
      const car = nearestCar(p.x, p.z, 5.5);
      if (car) {
        const stolen = car.kind === 'parked' || car.kind === 'traffic';
        if (car.kind === 'parked') {
          car.kind = 'traffic';
          if (!state.garage.includes(car)) state.garage.push(car);
        }
        p.inCar = car;
        p.x = car.x; p.z = car.z;
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
        if (ped.hp > 0 && dist(p.x, p.z, ped.x, ped.z) < 2.4) {
          ped.hp -= 20;
          if (ped.hp <= 0) addWanted(1);
          hitAnything = true;
        }
      }
      for (const cop of state.cops) {
        if (dist(p.x, p.z, cop.x, cop.z) < 2.4) {
          cop.hp -= 20;
          if (cop.hp <= 0) {
            if (cop.mesh) scene.remove(cop.mesh);
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
        return fireBullet(p.x, p.z, input.mouseX, input.mouseZ, false);
      }
      if (p.reserveAmmo > 0) {
        p.reserveAmmo -= 30;
        p.ammo += 30;
        say('Reloaded from reserve ammo.', 2);
      } else say('Out of ammo! Find an ammo pickup.', 3);
    }
    return EVENT_NONE;
  }

  function step(dt, input) {
    state.time += dt;
    state.clockMinutes += dt * 0.5;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;

    let events = stepPlayer(dt, input);
    for (const car of state.cars) {
      if (car.kind === 'traffic' && car !== state.player.inCar && car.hp > 0) {
        driveTraffic(car, dt, [...state.cars, ...state.policeCars], rng, lines);
      }
    }
    const allCars = [...state.cars, ...state.policeCars];
    for (let i = 0; i < allCars.length; i += 1) {
      for (let j = i + 1; j < allCars.length; j += 1) {
        const a = allCars[i], b = allCars[j];
        if (a === state.player.inCar || b === state.player.inCar) continue;
        const d = dist(a.x, a.z, b.x, b.z);
        if (d < 4 && d > 0.01) {
          const push = (4 - d) / 2;
          const ux = (a.x - b.x) / d, uz = (a.z - b.z) / d;
          a.x += ux * push; a.z += uz * push;
          b.x -= ux * push; b.z -= uz * push;
        }
      }
    }
    for (const ped of state.peds) {
      if (ped.hp <= 0) continue;
      let scare = null;
      if (state.player.inCar && Math.abs(state.player.speed) > 15
        && dist(ped.x, ped.z, state.player.x, state.player.z) < 12) {
        scare = { x: state.player.x, z: state.player.z };
      }
      walkPed(ped, dt, scare, rng, lines);
      const fixed = resolveCircle(city, ped.x, ped.z, ped.radius);
      ped.x = fixed.x; ped.z = fixed.z;
    }
    for (const ped of state.peds) {
      if (ped.hp <= 0) {
        ped.hp += dt * 4;
        if (ped.hp >= 40) {
          ped.hp = 100;
          ped.x = clamp(ped.x + 20, -220, 220);
          ped.z = clamp(ped.z + 20, -220, 220);
        }
      }
    }
    events |= updatePolice(dt);
    if (events & EVENT_BUSTED) return events;
    updateWanted(dt);
    events |= updateMissions(dt, input);
    if (state.player.hp <= 0) {
      respawn('wasted');
      return events | EVENT_WASTED;
    }
    return events;
  }

  function reset() {
    const p = state.player;
    p.x = -96; p.z = -72;
    p.angle = -Math.PI / 2;
    p.hp = 100; p.money = 250; p.wanted = 0;
    p.ammo = 30; p.reserveAmmo = 60;
    p.inCar = null; p.speed = 0; p.invulnerable = 0; p.bustedTimer = 0;
    state.time = 0;
    state.clockMinutes = 10 * 60 + 5;
    state.missionIndex = 0; state.missionStage = 0; state.missionTimer = 0;
    state.robProgress = 0; state.waitProgress = 0;
    state.banner = null; state.message = null;
    state.garage = []; state.crew = [];
    state.stats = { carsStolen: 0, missionsDone: 0, arrests: 0 };
    spawnAll();
  }

  function serialize() {
    const p = state.player;
    return {
      money: p.money, missionIndex: state.missionIndex, x: p.x, z: p.z,
      hp: p.hp, ammo: p.ammo, reserveAmmo: p.reserveAmmo,
      garage: state.garage.length, crew: state.crew,
    };
  }

  function restore(save) {
    reset();
    const p = state.player;
    p.money = save.money ?? 250;
    state.missionIndex = save.missionIndex ?? 0;
    p.x = save.x ?? -96;
    p.z = save.z ?? -72;
    p.hp = save.hp ?? 100;
    p.ammo = save.ammo ?? 30;
    p.reserveAmmo = save.reserveAmmo ?? 60;
    state.crew = save.crew ?? [];
    if (state.missionIndex < MISSIONS.length) banner(missionBrief(state.missionIndex));
  }

  spawnAll();
  return {
    state, step, reset, serialize, restore, startMission,
    addPoliceCar(x, z) {
      const car = createPoliceCar(rng, x, z);
      car.mesh = makeCarMesh(0x111111, 'police');
      scene.add(car.mesh);
      state.policeCars.push(car);
      return car;
    },
    missionTarget: (index) => missionTarget(index, state.missionStage),
    say, banner,
  };
}
