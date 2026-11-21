// main.js — Neon Bay entry point. Builds the world, owns the player
// (on foot and in a car), runs the game loop, and wires every system
// together: city, traffic, pedestrians, police, combat, missions, FX,
// HUD, audio and the staged screenshot scenes.
import * as THREE from 'three';
import { makeRng, clamp, dist2 } from './rng.js';
import { buildCity, districtAt, collideCircle, CITY_HALF } from './city.js';
import { Car, Traffic, CAR_KINDS } from './vehicles.js';
import { Pedestrians, CrewManager, makePersonMesh } from './people.js';
import { WantedSystem } from './police.js';
import { Combat } from './combat.js';
import { Fx } from './fx.js';
import { MissionManager, MISSIONS, STORY_INTRO } from './missions.js';
import { Hud } from './hud.js';
import { stageShot, SHOTS } from './shots.js';
import { audio } from './audio.js';

const SAVE_KEY = 'neonbay-save-v10';
const SAFEHOUSE = { x: -70, z: 210, r: 14 };

const G = {
  cash: 250, xp: 0, level: 1,
  time: { hour: 17.5, day: 1 },
  driving: false, playerCar: null,
  freezeFrame: false, shotStaged: 0, stageCamera: null,
  cameraMode: 'chase', camYaw: Math.PI / 2, camPitch: 0.32,
  paused: false, started: false, over: false,
  districtName: 'Palmaro Beach',
};

function stormHoursLeft() {
  return Math.max(0, (7 - G.time.day) * 24 + (24 - G.time.hour));
}
G.stormHoursLeft = stormHoursLeft;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xff9e5e);
scene.fog = new THREE.Fog(0xe08a5a, 90, 620);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-20, 8, 190);
G.camera = camera;

const sun = new THREE.DirectionalLight(0xffb36b, 1.0);
sun.position.set(120, 180, 60);
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a2f28, 0.65);
scene.add(hemi);
G.scene = scene;

// ---------- world systems ----------
const city = buildCity(scene);
G.city = city;
const fx = new Fx(scene);
G.fx = fx;
const traffic = new Traffic(scene, city, 16);
G.traffic = traffic;
const peds = new Pedestrians(scene, 26);
G.peds = peds;
const crew = new CrewManager(scene);
G.crew = crew;
const wanted = new WantedSystem(scene, city);
G.wanted = wanted;
const combat = new Combat(scene, fx, audio);
G.combat = combat;
const missions = new MissionManager(scene, fx, audio);
G.missions = missions;
const hud = new Hud();
G.hud = hud;

// ---------- player ----------
const playerMesh = makePersonMesh(0x00cec9, 0x2d3436, 0xc68642);
playerMesh.position.set(-140, 0, 175);
scene.add(playerMesh);
const player = {
  mesh: playerMesh, x: -140, z: 175, heading: Math.PI / 2,
  speed: 0, walkPhase: 0, onFoot: true,
};
G.player = player;
G.spawnPlayerCar = (kindId, color, x, z, heading) => {
  const car = new Car(scene, kindId, color, x, z, heading);
  G.playerCar = car;
  return car;
};
G.enterCar = (car, silent = false) => {
  traffic.remove(car);
  G.playerCar = car;
  G.driving = true;
  player.onFoot = false;
  playerMesh.visible = false;
  if (!silent) {
    hud.feed(`Stole the ${car.kind.name}.`);
    if (!car.stolen) { car.stolen = true; wanted.addHeat(55, 'Grand theft auto'); }
    audio.thud();
  }
};
G.exitCar = (silent = false) => {
  if (!G.playerCar) return;
  const c = G.playerCar;
  player.x = c.mesh.position.x + Math.sin(c.heading + Math.PI / 2) * 2.5;
  player.z = c.mesh.position.z + Math.cos(c.heading + Math.PI / 2) * 2.5;
  player.heading = c.heading;
  playerMesh.position.set(player.x, 0, player.z);
  playerMesh.visible = true;
  G.driving = false;
  player.onFoot = true;
  if (!silent) hud.feed('On foot.');
};

// A starter car parked by the boardwalk so the first drive is one keypress away.
G.spawnPlayerCar('sedan', 0x74b9ff, -132, 182, Math.PI / 2);

// ---------- missions wiring ----------
missions.bind({
  spawnEnemyFn: (x, z, count) => {
    combat.clearEnemies();
    for (let i = 0; i < count; i++) {
      combat.spawnEnemy(x + (Math.random() - 0.5) * 18, z + (Math.random() - 0.5) * 18, 60);
    }
  },
  wantedFn: (level) => wanted.setLevel(level),
  crewFn: (on) => { for (const m of crew.members) m.following = on; },
});
missions.onUpdate = (text) => hud.feed(text);
missions.onComplete = (m, reward) => {
  G.cash += reward;
  G.xp += 150;
  G.level = 1 + Math.floor(G.xp / 800);
  hud.setCash(G.cash);
  hud.showToast(`MISSION COMPLETE — ${m.title}  +$${reward}`);
  hud.feed(`Mission complete: ${m.title} (+$${reward}). ${missions.done ? 'Story complete — Neon Bay is yours.' : 'Press Q for the next job.'}`);
  saveGame();
  if (missions.done) hud.showToast('STORY COMPLETE — you beat Hurricane Solana. Free roam continues.', 5000);
};
missions.onFail = (reason) => { hud.showToast(reason, 3000); hud.feed(reason); };

// ---------- input ----------
const keys = {};
let mouseDown = false;
let dragging = false;
let lastMouseX = 0, lastMouseY = 0;
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyE' && G.started && !G.paused) toggleCar();
  if (e.code === 'KeyF' && G.started && !G.driving) tryShoot();
  if (e.code === 'KeyR') combat.reload();
  if (e.code === 'KeyQ' && G.started && !missions.active) missions.start();
  if (e.code === 'KeyM') { audio.setMuted(!audio.muted); hud.feed(audio.muted ? 'Sound muted.' : 'Sound on.'); }
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyH') hud.showToast('WASD move/drive · E enter car · F shoot · R reload · Q mission · Shift run · Space brake · M mute · P pause');
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('mousedown', (e) => {
  mouseDown = true; dragging = true;
  lastMouseX = e.clientX; lastMouseY = e.clientY;
  if (G.started && !G.driving && !G.paused) tryShoot();
});
window.addEventListener('mouseup', () => { mouseDown = false; dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  G.camYaw -= (e.clientX - lastMouseX) * 0.004;
  G.camPitch = clamp(G.camPitch + (e.clientY - lastMouseY) * 0.003, 0.08, 0.9);
  lastMouseX = e.clientX; lastMouseY = e.clientY;
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function toggleCar() {
  if (G.driving) { G.exitCar(); return; }
  const near = traffic.nearest(player.x, player.z, 6);
  if (near) { G.enterCar(near); return; }
  if (G.playerCar && dist2(player.x, player.z, G.playerCar.mesh.position.x, G.playerCar.mesh.position.z) < 36) {
    G.enterCar(G.playerCar, G.playerCar.stolen);
    return;
  }
  hud.feed('No car nearby — walk to one and press E.');
}

function tryShoot() {
  if (G.paused || G.driving) return;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();
  const origin = new THREE.Vector3(player.x, 1.5, player.z);
  combat.shoot(origin, dir, (enemy, killed) => {
    if (killed) {
      wanted.addHeat(20, 'shooting');
      missions.onEnemyKilled();
      peds.scare(enemy.x, enemy.z, 26);
    }
  });
  wanted.addHeat(6, 'gunfire');
  peds.scare(player.x, player.z, 18);
}

function togglePause() {
  if (!G.started) return;
  G.paused = !G.paused;
  hud.showPause(G.paused);
}

// ---------- save / load ----------
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.cash, xp: G.xp, level: G.level, missionIndex: missions.index,
      completed: missions.completed, day: G.time.day, hour: G.time.hour,
      px: player.x, pz: player.z,
    }));
    hud.saveNote('Progress saved.');
  } catch { /* storage unavailable — game still plays */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    G.cash = s.cash ?? 250; G.xp = s.xp ?? 0; G.level = s.level ?? 1;
    missions.index = s.missionIndex ?? 0;
    missions.completed = s.completed ?? 0;
    G.time.day = s.day ?? 1; G.time.hour = s.hour ?? 17.5;
    player.x = s.px ?? -140; player.z = s.pz ?? 175;
    playerMesh.position.set(player.x, 0, player.z);
    return true;
  } catch { return false; }
}
const hadSave = loadGame();

// ---------- HUD wiring ----------
hud.onStart = () => {
  G.started = true;
  audio.init();
  audio.startMusic();
  hud.setCash(G.cash);
  hud.setXp(G.xp, G.level);
  hud.setHealth(combat.health, combat.maxHealth);
  hud.setWanted(wanted.level);
  hud.setMission(missions.current ? `${missions.current.title} — press Q` : 'Story complete', missions.current ? missions.current.text : 'Free roam. The city is yours.');
  hud.feed(STORY_INTRO);
  hud.feed(hadSave ? 'Save loaded — welcome back, Rae.' : 'Press Q to start your first job. E near a car to drive.');
  setInterval(saveGame, 30000);
};
hud.onResume = () => { G.paused = false; };
hud.onSave = () => { saveGame(); };
hud.onRestart = () => { try { localStorage.removeItem(SAVE_KEY); } catch {} location.reload(); };
hud.bindButtons();
wanted.onLevelChange = (level, reason) => {
  hud.setWanted(level);
  audio.siren(level > 0);
  if (level > 0) {
    hud.feed(`NBPD wanted level ${level} — ${wanted.label}.`);
    hud.feed(WantedSystem.dispatchLine(level));
  } else hud.feed('You lost them. Heat is gone.');
};

// Auto-pause when the tab loses focus mid-game (prevents unfair deaths).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.started && !G.paused && !G.freezeFrame) togglePause();
});

// ---------- player movement ----------
function updatePlayer(dt) {
  const run = keys.ShiftLeft || keys.ShiftRight;
  const speed = run ? 9.5 : 6;
  let fxIn = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  let sxIn = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (fxIn === 0 && sxIn === 0) { player.speed = 0; return; }
  // Camera-relative movement: W walks toward where the camera looks.
  // atan2(-sx, fx) maps D to screen-right (camera forward is (sin yaw, cos yaw)).
  const moveAngle = Math.atan2(-sxIn, fxIn) + G.camYaw;
  const heading = moveAngle;
  const nx = player.x + Math.sin(heading) * speed * dt;
  const nz = player.z + Math.cos(heading) * speed * dt;
  const fixed = collideCircle(city, nx, nz, 0.7);
  player.x = fixed.x;
  player.z = fixed.z;
  player.heading = heading;
  player.speed = speed;
  player.walkPhase += dt * speed * 1.6;
  const swing = Math.sin(player.walkPhase) * 0.55;
  const u = playerMesh.userData;
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.7;
  u.armR.rotation.x = swing * 0.7;
  playerMesh.position.set(player.x, Math.abs(Math.sin(player.walkPhase)) * 0.05, player.z);
  playerMesh.rotation.y = player.heading;
}

// ---------- camera ----------
function updateCamera(dt) {
  if (G.freezeFrame && G.stageCamera) {
    camera.position.set(...G.stageCamera.pos);
    camera.lookAt(new THREE.Vector3(...G.stageCamera.look));
    return;
  }
  const target = G.driving && G.playerCar
    ? G.playerCar.mesh.position
    : playerMesh.position;
  // Absolute camera yaw: drag orbits the camera, it never snaps behind
  // the player, so WASD stays consistent with what the player sees.
  const yaw = G.camYaw;
  const dist = G.driving ? 12.5 : 8.5;
  const height = G.driving ? 5 : 3.6;
  const cx = target.x - Math.sin(yaw) * dist * Math.cos(G.camPitch);
  const cz = target.z - Math.cos(yaw) * dist * Math.cos(G.camPitch);
  const cy = target.y + height + Math.sin(G.camPitch) * dist * 0.55;
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 7));
  camera.lookAt(target.x, target.y + 1.6, target.z);
}

// ---------- main loop ----------
const clock = new THREE.Clock();
let frames = 0;
let hudTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  frames++;
  if (G.started && !G.paused && !G.freezeFrame) {
    // Clock: one game hour every 50 real seconds; storm closes in.
    G.time.hour += dt / 50;
    if (G.time.hour >= 24) { G.time.hour -= 24; G.time.day = Math.min(7, G.time.day + 1); }
    const hoursLeft = stormHoursLeft();
    const weather = hoursLeft < 10 ? 'storm' : hoursLeft < 30 ? 'rain' : 'clear';
    if (fx.weather !== weather) fx.setWeather(weather);
    if (G.driving && G.playerCar) {
      const input = {
        forward: keys.KeyW || keys.ArrowUp, back: keys.KeyS || keys.ArrowDown,
        left: keys.KeyA || keys.ArrowLeft, right: keys.KeyD || keys.ArrowRight,
        handbrake: keys.Space,
      };
      const spd = G.playerCar.update(dt, input, city);
      audio.engine(spd / G.playerCar.kind.top, true);
      // Police rams: a cruiser touching the car scrubs speed and shakes the view.
      for (const cop of wanted.policeCars) {
        const d = Math.hypot(cop.mesh.position.x - G.playerCar.mesh.position.x, cop.mesh.position.z - G.playerCar.mesh.position.z);
        if (d < 4.2) {
          G.playerCar.speed *= (1 - dt * 1.8);
          if (Math.random() < dt * 6) fx.burst(new THREE.Vector3(G.playerCar.mesh.position.x, 1, G.playerCar.mesh.position.z), 0xffaa00, 3, 2);
        }
      }
      player.x = G.playerCar.mesh.position.x;
      player.z = G.playerCar.mesh.position.z;
      player.heading = G.playerCar.heading;
      if (Math.abs(G.playerCar.speed) > 20 && Math.random() < dt * 0.5) wanted.addHeat(1, 'speeding');
    } else {
      updatePlayer(dt);
      audio.engine(0, false);
    }
    const inGarage = Math.hypot(player.x - SAFEHOUSE.x, player.z - SAFEHOUSE.z) < SAFEHOUSE.r;
    wanted.update(dt, player.x, player.z, player.heading, G.driving && G.playerCar ? Math.abs(G.playerCar.speed) : player.speed, inGarage);
    combat.update(dt, player.x, player.z);
    if (combat.health <= 0 && !G.over) {
      G.over = true;
      hud.showToast('WASTED — NBPD picked you up at the hospital. -$250.', 4000);
      G.cash = Math.max(0, G.cash - 250);
      combat.health = 100;
      wanted.clear();
      player.x = -70; player.z = 35;
      playerMesh.position.set(player.x, 0, player.z);
      G.over = false;
      saveGame();
    }
    traffic.update(dt, player.x, player.z);
    peds.update(dt, player.x, player.z, player.speed);
    crew.update(dt, player.x, player.z);
    missions.update(dt, {
      px: player.x, pz: player.z, driving: G.driving,
      wanted: wanted.level, enemiesLeft: combat.enemies.length,
    });
    // District + HUD refresh (throttled to 5 Hz for the DOM bits).
    hudTimer += dt;
    if (hudTimer > 0.2) {
      hudTimer = 0;
      const d = districtAt(player.x, player.z);
      if (d.name !== G.districtName) { G.districtName = d.name; hud.setDistrict(d.name); }
      hud.setClock(Math.floor(G.time.hour), Math.floor((G.time.hour % 1) * 60), G.time.day);
      hud.setStorm(stormHoursLeft());
      hud.setHealth(combat.health, combat.maxHealth);
      hud.setCash(G.cash);
      hud.setXp(G.xp, G.level);
      hud.setWanted(wanted.level);
      hud.setHeat(wanted.wantedProgress(), wanted.level);
      hud.setTimer(missions.timeLeft());
      hud.setSpeed(G.driving && G.playerCar ? Math.abs(G.playerCar.speed) * 3.6 : 0, G.driving);
      hud.setAmmo(combat.ammo, combat.ammoReserve);
      hud.setVignette(combat.health < 35 ? (35 - combat.health) / 35 * 0.7 : 0);
      hud.drawMinimap({
        px: player.x, pz: player.z, heading: player.heading,
        marker: missions.active ? missions._targetPos() : null,
        police: wanted.policeCars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
        crew: crew.members.filter((m) => m.following).map((m) => ({ x: m.x, z: m.z })),
        traffic: traffic.cars.slice(0, 10).map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
      });
    }
  }
  fx.applySky(G.time.hour, sun, hemi, city.lamps);
  fx.update(dt, camera.position.x, camera.position.z);
  updateCamera(dt);
  renderer.render(scene, camera);
  if (frames === 5) window.__NB.ready = true;
}

// ---------- public handle for capture / playtests ----------
window.__NB = G;
window.NEONBAY = G;
G.stageShot = (n) => stageShot(G, n);
G.shots = SHOTS;
G.startMission = (i) => { missions.index = i; return missions.start(); };
G.teleport = (x, z) => { player.x = x; player.z = z; playerMesh.position.set(x, 0, z); };
G.setWanted = (n) => wanted.setLevel(n);
G.state = () => ({
  started: G.started, cash: G.cash, xp: G.xp, level: G.level,
  wanted: wanted.level, health: combat.health, ammo: combat.ammo,
  mission: missions.active ? missions.active.id : null,
  missionIndex: missions.index, driving: G.driving,
  px: player.x, pz: player.z, district: G.districtName,
  enemies: combat.enemies.length, police: wanted.policeCars.length,
  heli: !!wanted.heli, roadblocks: wanted.roadblocks.length,
  hour: G.time.hour, day: G.time.day, weather: fx.weather,
});

// ---------- boot: shot mode or normal play ----------
const params = new URLSearchParams(location.search);
const shotParam = parseInt(params.get('shot') || '0', 10);
if (shotParam >= 1 && shotParam <= 4) {
  // Staged capture: skip the title screen, stage the scene, freeze it.
  hud.started = true;
  G.started = true;
  hud.el.title.style.display = 'none';
  hud.el.hud.style.display = 'block';
  hud.setCash(G.cash);
  hud.setXp(G.xp, G.level);
  hud.setMission('NEON BAY', STORY_INTRO);
  stageShot(G, shotParam);
  // Let police/heli settle one frame, then mark ready for the capture script.
  setTimeout(() => { window.__NB.ready = true; }, 600);
}
animate();
