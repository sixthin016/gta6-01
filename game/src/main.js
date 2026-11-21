// Neon Bay — main.js: bootstrap, game loop, input, the player on foot
// and behind the wheel, the hurricane clock, and save/load. Every other
// module is built here and wired into one `world` object.
import * as THREE from 'three';
import { buildCity, DISTRICTS } from './city.js';
import { CAR_MODELS, makeCar, createTraffic, updateTraffic, driveCar, nearestCar } from './vehicles.js';
import { makePerson, createPedestrians, updatePedestrians, createCrew, updateCrew } from './people.js';
import { createPolice, addWanted, updatePolice } from './police.js';
import { MISSIONS, createMissionState, startMission, updateMission, nextMission, currentMission, currentStep } from './missions.js';
import { createCombat, playerShoot, updateCombat, spawnSquad, clearEnemies } from './combat.js';
import { createHud, drawMinimap, missionListHtml } from './hud.js';
import { createFx } from './fx.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';

const SAVE_KEY = 'neonbay-save-v1';
const STORM_TOTAL = 48 * 3600;

window.__NEONBAY__ = { ready: false, errors: [], frames: 0, started: false };
window.addEventListener('error', (e) => window.__NEONBAY__.errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__NEONBAY__.errors.push(String(e.reason)));

const params = new URLSearchParams(location.search);
const shotNum = Number(params.get('shot') || 0);
const autoplay = params.has('autoplay') || shotNum > 0;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb8d8);
scene.fog = new THREE.Fog(0x8fb8d8, 140, 460);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(-100, 12, -20);

const sun = new THREE.DirectionalLight(0xffe0b3, 2.4);
sun.position.set(150, 220, 90);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -280;
sun.shadow.camera.right = 280;
sun.shadow.camera.top = 280;
sun.shadow.camera.bottom = -280;
scene.add(sun);
const hemi = new THREE.HemisphereLight(0x9fc4e8, 0x3a2f2a, 0.9);
scene.add(hemi);

const audio = createAudio();
const fx = createFx(scene);
const city = buildCity(scene);
const traffic = createTraffic(scene, city.colliders, city.roadLines, 16);
const peds = createPedestrians(scene, city.colliders, 26);
const police = createPolice(scene);
const combat = createCombat(scene);
const missionState = createMissionState();
const hud = createHud();

const playerDef = { shirt: 0x14b8a6, skin: 0xe0ac69, hat: 0x111111 };
const playerPerson = makePerson(playerDef);
playerPerson.group.position.copy(city.spawn.player);
scene.add(playerPerson.group);

const world = {
  scene, camera, renderer, city, traffic, peds, police, combat, mission: missionState,
  fx, audio, hud, player: playerPerson,
  playerCar: null, inCar: false, shotMode: false,
  money: 500, health: 100, wanted: 0,
  garage: [], crew: [], storm: { secondsLeft: STORM_TOTAL, total: STORM_TOTAL },
  camYaw: 0.6, camPitch: 0.42, camDist: 10,
  keys: new Set(), paused: false, started: false,
  velY: 0, grounded: true, lastHitAt: 0, kills: 0,
  elapsed: 0, minimapTimer: 0, messageTimer: 0,
};

// ---- save / load -------------------------------------------------------
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: world.money, missionIndex: missionState.index, garage: world.garage,
      crew: world.crew, stormLeft: world.storm.secondsLeft, kills: world.kills,
    }));
  } catch (err) { /* storage may be unavailable; the game still plays */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    world.money = s.money ?? 500;
    missionState.index = Math.min(s.missionIndex ?? 0, MISSIONS.length - 1);
    world.garage = s.garage ?? [];
    world.crew = s.crew ?? [];
    world.storm.secondsLeft = s.stormLeft ?? STORM_TOTAL;
    world.kills = s.kills ?? 0;
    return true;
  } catch (err) {
    return false;
  }
}

// ---- input -------------------------------------------------------------
const keyMap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'boost', ShiftRight: 'boost', Space: 'jump' };
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') tryEnterExitCar();
  if (e.code === 'KeyR') combat.reloadTimer = Math.max(combat.reloadTimer, 0.01);
  if (e.code === 'KeyM') toggleOverlay('mission-list');
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyH') toggleOverlay('help');
  const mapped = keyMap[e.code];
  if (mapped) {
    world.keys.add(mapped);
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  const mapped = keyMap[e.code];
  if (mapped) world.keys.delete(mapped);
});

let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('mousedown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  audio.unlock();
  if (world.started && !world.inCar && !world.paused) {
    const result = playerShoot(combat, camera, scene, fx, audio, (kind) => {
      if (kind === 'kill') {
        world.kills++;
        missionState.kills++;
      }
    });
    if (result === 'hit' || result === 'miss') hud.setAmmo(combat.ammo);
  }
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  world.camYaw -= (e.clientX - lastX) * 0.005;
  world.camPitch = Math.max(0.12, Math.min(1.1, world.camPitch + (e.clientY - lastY) * 0.004));
  lastX = e.clientX;
  lastY = e.clientY;
});
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function toggleOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.classList.toggle('open');
  if (id === 'mission-list' && open) el.innerHTML = `<h2>Missions</h2>${missionListHtml(missionState.index)}`;
  // Overlays are informational; only P pauses the simulation.
}

function togglePause() {
  world.paused = !world.paused;
  document.getElementById('pause').classList.toggle('open', world.paused);
}

// ---- cars: enter, steal, exit ------------------------------------------
function tryEnterExitCar() {
  if (!world.started || world.paused) return;
  if (world.inCar && world.playerCar) {
    const car = world.playerCar;
    car.isPlayer = false;
    const side = car.group.position.clone();
    side.x += Math.cos(car.heading) * 2.5;
    side.z -= Math.sin(car.heading) * 2.5;
    playerPerson.group.position.set(side.x, 0, side.z);
    playerPerson.group.visible = true;
    world.playerCar = null;
    world.inCar = false;
    audio.click();
    // Parking inside the Harbor hideout keeps the car in the garage.
    if (side.x > 195 && side.z > 0 && side.z < 60 && !world.garage.includes(car.model.name)) {
      world.garage.push(car.model.name);
      hud.showMessage(`${car.model.name} parked in your garage.`);
      saveGame();
    }
    return;
  }
  const pos = playerPerson.group.position;
  const car = nearestCar(traffic, pos, 5.5);
  if (!car) return;
  const stolen = car.owner !== 'player';
  world.playerCar = car;
  world.inCar = true;
  car.isPlayer = true;
  car.owner = 'player';
  playerPerson.group.visible = false;
  audio.unlock();
  audio.click();
  if (stolen) {
    addWanted(police, 1, 'stolen car');
    hud.showMessage(`Stole a ${car.model.name} — the NBPD is on you!`);
    hud.setStars(police.wanted);
  } else {
    hud.showMessage(`Driving your ${car.model.name}.`);
  }
}

// ---- per-frame updates --------------------------------------------------
function updatePlayer(dt) {
  const p = playerPerson.group.position;
  if (world.inCar && world.playerCar) {
    const car = world.playerCar;
    const input = {
      forward: world.keys.has('up'), back: world.keys.has('down'),
      left: world.keys.has('left'), right: world.keys.has('right'),
      boost: world.keys.has('boost'), handbrake: world.keys.has('jump'),
    };
    const before = car.health;
    driveCar(car, input, dt, city.colliders);
    if (car.health < before) audio.crash();
    p.set(car.group.position.x, 0, car.group.position.z);
    world.camYaw = car.heading + Math.PI;
    audio.setEngine(Math.abs(car.speed) / car.model.top);
    hud.setSpeed(car.speed * 3.6, true);
    return;
  }
  audio.setEngine(0);
  hud.setSpeed(0, false);
  const speed = world.keys.has('boost') ? 9 : 5;
  let mx = 0;
  let mz = 0;
  if (world.keys.has('up')) mz -= 1;
  if (world.keys.has('down')) mz += 1;
  if (world.keys.has('left')) mx -= 1;
  if (world.keys.has('right')) mx += 1;
  const moving = mx !== 0 || mz !== 0;
  if (moving) {
    const len = Math.hypot(mx, mz);
    mx /= len;
    mz /= len;
    const sin = Math.sin(world.camYaw);
    const cos = Math.cos(world.camYaw);
    // Camera sits at player + (sin, cos) * dist, so forward on screen is
    // (-sin, -cos) and right is (cos, -sin).
    const wx = (mx * cos + mz * sin) * speed * dt;
    const wz = (-mx * sin + mz * cos) * speed * dt;
    const nx = p.x + wx;
    const nz = p.z + wz;
    const blocked = city.colliders.some((c) => nx > c.minX - 0.4 && nx < c.maxX + 0.4 && nz > c.minZ - 0.4 && nz < c.maxZ + 0.4);
    if (!blocked && Math.abs(nx) < 268 && nz > -258 && nz < 268) {
      p.x = nx;
      p.z = nz;
    }
    playerPerson.group.rotation.y = Math.atan2(wx, wz);
    playerPerson.walkPhase += dt * speed * 2.2;
    const swing = Math.sin(playerPerson.walkPhase) * 0.5;
    playerPerson.legs[0].rotation.x = swing;
    playerPerson.legs[1].rotation.x = -swing;
    playerPerson.arms[0].rotation.x = -swing * 0.7;
    playerPerson.arms[1].rotation.x = swing * 0.7;
  } else {
    playerPerson.legs[0].rotation.x = 0;
    playerPerson.legs[1].rotation.x = 0;
    playerPerson.arms[0].rotation.x = 0;
    playerPerson.arms[1].rotation.x = 0;
  }
  if (world.keys.has('jump') && world.grounded) {
    world.velY = 6.5;
    world.grounded = false;
  }
  if (!world.grounded) {
    world.velY -= 18 * dt;
    p.y += world.velY * dt;
    if (p.y <= 0) {
      p.y = 0;
      world.velY = 0;
      world.grounded = true;
    }
  }
}

function updateCamera(dt) {
  if (world.shotMode) {
    // Staged shot: hold the framed camera, breathe almost imperceptibly.
    camera.position.y += Math.sin(performance.now() * 0.0004) * 0.0006;
    return;
  }
  const target = world.inCar && world.playerCar ? world.playerCar.group.position : playerPerson.group.position;
  const dist = world.inCar ? 13 : world.camDist;
  const height = world.inCar ? 5.5 : 4.2;
  const tx = target.x + Math.sin(world.camYaw) * dist;
  const tz = target.z + Math.cos(world.camYaw) * dist;
  const k = Math.min(1, dt * 6);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.y += (target.y + height - camera.position.y) * k;
  camera.position.z += (tz - camera.position.z) * k;
  camera.lookAt(target.x, target.y + 1.6, target.z);
}

function districtAt(x, z) {
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dist = Math.hypot(d.x - x, d.z - z);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best.name;
}

function updateStorm(dt) {
  world.storm.secondsLeft = Math.max(0, world.storm.secondsLeft - dt * 60);
  const intensity = 1 - world.storm.secondsLeft / world.storm.total;
  // The sky bruises as Solana closes in; rain starts in the last quarter.
  const sky = new THREE.Color(0x8fb8d8).lerp(new THREE.Color(0x3a3f5e), Math.min(1, intensity * 1.4));
  scene.background = sky;
  scene.fog.color.copy(sky);
  sun.intensity = 2.4 - intensity * 1.3;
  hemi.intensity = 0.9 - intensity * 0.4;
  const p = playerPerson.group.position;
  fx.setRain(intensity > 0.72, p);
  hud.setClock(world.storm.secondsLeft);
}

function missionContext() {
  return {
    playerPos: playerPerson.group.position,
    inCar: world.inCar,
    recruit(id) {
      if (!world.crew.includes(id)) {
        world.crew.push(id);
        const def = world.crew;
        hud.showMessage(`Crew: ${id} joined. ${id === 'dune' ? 'Cars handle better.' : id === 'mara' ? 'Wanted cools down faster.' : 'You take less damage.'}`);
        refreshCrew();
        saveGame();
      }
    },
    onMissionComplete(mission) {
      world.money += mission.payout;
      hud.setCash(world.money);
      hud.setObjective('Mission complete', `${mission.title} — $${mission.payout} earned.`);
      hud.showMessage(`Mission complete: ${mission.title} — $${mission.payout}`);
      audio.missionDone();
      saveGame();
      setTimeout(() => {
        if (missionState.index < MISSIONS.length - 1) {
          nextMission(missionState);
          startMission(scene, missionState);
          const m = currentMission(missionState);
          hud.setObjective(m.title, currentStep(missionState).text);
          hud.showMessage(`New mission: ${m.title} — ${m.brief}`);
        } else {
          hud.setObjective('Neon Bay', 'All 16 missions complete. Free roam — the storm is yours.');
        }
      }, 2500);
    },
  };
}

let crewMembers = [];
function refreshCrew() {
  for (const m of crewMembers) scene.remove(m.group);
  crewMembers = createCrew(scene, world.crew, playerPerson.group.position);
}

function startGame() {
  if (world.started) return;
  world.started = true;
  window.__NEONBAY__.started = true;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  audio.unlock();
  audio.startMusic();
  const hadSave = loadGame();
  refreshCrew();
  const mission = startMission(scene, missionState);
  hud.setCash(world.money);
  hud.setHealth(world.health);
  hud.setStars(police.wanted);
  hud.setAmmo(combat.ammo);
  hud.setObjective(mission.title, currentStep(missionState).text);
  hud.showMessage(hadSave ? `Welcome back, Rae. Mission ${mission.id}: ${mission.title}.` : `Rae Vega — Mission 1: ${mission.title}. ${mission.brief}`);
  hud.setDistrict(districtAt(playerPerson.group.position.x, playerPerson.group.position.z));
}

document.getElementById('start-btn').addEventListener('click', () => {
  audio.unlock();
  startGame();
});
document.getElementById('continue-btn').addEventListener('click', () => {
  audio.unlock();
  startGame();
});
document.getElementById('resume-btn').addEventListener('click', togglePause);

// ---- main loop ----------------------------------------------------------
const clock = new THREE.Clock();
let killStepArmed = false;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  world.elapsed += dt;
  if (!world.started || world.paused) {
    renderer.render(scene, camera);
    return;
  }
  const p = playerPerson.group.position;
  updatePlayer(dt);
  updateTraffic(traffic, dt, city.colliders, p);
  updatePedestrians(peds, dt, city.colliders, p);
  updateCrew(crewMembers, dt, p, world.keys.size > 0);
  updateCamera(dt);
  fx.update(dt);

  // Kill steps need a squad on the street when none is left.
  const step = currentStep(missionState);
  if (missionState.active && step.type === 'kill') {
    const alive = combat.enemies.filter((e) => e.health > 0).length;
    if (alive === 0 && !killStepArmed) {
      spawnSquad(scene, combat, p.x + 14, p.z + 8, step.count - missionState.kills);
      killStepArmed = true;
    }
    if (alive > 0) killStepArmed = false;
  } else {
    killStepArmed = false;
  }

  const maraBonus = world.crew.includes('mara');
  updatePolice(scene, police, dt, p, world.inCar && world.playerCar ? Math.abs(world.playerCar.speed) : 0, city.colliders, audio, maraBonus);
  updateCombat(scene, combat, dt, p, (dmg, fromPos) => {
    const now = performance.now();
    const finalDmg = world.crew.includes('kip') ? dmg * 0.75 : dmg;
    world.health -= finalDmg;
    world.lastHitAt = now;
    fx.blood(p.clone().add(new THREE.Vector3(0, 1.2, 0)));
    hud.setHealth(world.health);
    if (world.health <= 0) {
      world.health = 100;
      world.money = Math.max(0, world.money - 200);
      police.wanted = 0;
      hud.setStars(0);
      playerPerson.group.position.copy(city.spawn.player);
      if (world.inCar && world.playerCar) {
        world.playerCar.isPlayer = false;
        world.playerCar = null;
        world.inCar = false;
        playerPerson.group.visible = true;
      }
      hud.showMessage('Wasted — the NBPD dropped you at the Mercado. -$200.');
      hud.setCash(world.money);
      hud.setHealth(world.health);
      saveGame();
    }
  });
  // Slow health regen out of combat.
  if (performance.now() - world.lastHitAt > 5000 && world.health < 100 && world.health > 0) {
    world.health = Math.min(100, world.health + 2 * dt);
    hud.setHealth(world.health);
  }

  const msg = updateMission(scene, missionState, missionContext(), dt);
  if (msg) {
    hud.showMessage(msg);
    const m = currentMission(missionState);
    if (missionState.active) hud.setObjective(m.title, currentStep(missionState).text);
  }
  updateStorm(dt);
  hud.setDistrict(districtAt(p.x, p.z));

  world.minimapTimer -= dt;
  if (world.minimapTimer <= 0) {
    world.minimapTimer = 0.12;
    drawMinimap(hud, {
      player: p,
      heading: world.inCar && world.playerCar ? world.playerCar.heading : playerPerson.group.rotation.y,
      traffic, cops: police.cruisers,
      enemies: combat.enemies,
      markerPos: missionState.marker ? { x: missionState.marker.position.x, z: missionState.marker.position.z } : null,
    });
  }
  renderer.render(scene, camera);
  window.__NEONBAY__.frames++;
  if (window.__NEONBAY__.frames === 5) window.__NEONBAY__.ready = true;
}

// ---- boot ---------------------------------------------------------------
if (shotNum > 0) {
  world.shotMode = true;
  applyShot(world, shotNum);
}
frame();
if (autoplay) {
  startGame();
  if (shotNum > 0) hud.setStars(police.wanted);
}
window.__NEONBAY__.world = world;
