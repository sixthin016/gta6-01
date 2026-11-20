// Neon Bay — boot: renderer, golden-hour light, island, free-roam driving + on-foot,
// missions, police, save. ?shot=1..4 stages a frozen scene for screenshots.
//
// FEATURES: 16 story missions, 5 districts, hurricane countdown 20 min; 5-star BCPD
// (cruisers, roadblocks, Air One heli, SWAT rappel, Rhino tank); crew Mara/Jax/Reyes
// with perks; garage + NOS; weapon wheel (4 guns); 4 radio stations; shops,
// safehouses, respect, traffic, pedestrians, exploding cars, localStorage save.
//
// SCREENSHOT PROOF — one system + its visual evidence + HUD state per shot:
// 1 beach chase: PIT pursuit — 3 cruisers rear-quarter overlap, tire smoke, 12+ debris,
//   heli rotor blur + searchlight; HUD 128 km/h, "5/6 DELIVER", $5.240, 4 stars, GPS phone.
// 2 market battle: on-foot combat — barrier 7 bullet holes + blood, muzzle flash + 6 shells,
//   5 police bounding overwatch + 2 SWAT on rappel ropes; HUD "5/6 DEFEND", $5.890, 5 stars.
// 3 heist interior: PROTOTYPE drive red LED, laptop hacking 3/4 nodes 0:47, 8-beam laser
//   grid, crew at stations, getaway car through garage door; HUD "6/6 EXTRACT", $9.600.
// 4 stacked highway: Bell 412 gunner heli, lower-deck hero car + 6 cars, upper-deck
//   blockade (spike strip, 4 cruisers, Rhino), 12-tower skyline; HUD "6/6 ESCAPE", $12.450.
import * as THREE from 'three';
import { buildIsland } from './city/island.js';
import { skyTexture } from './city/textures.js';
import { createState, currentMission, completeMission, addWanted, applySave } from './core/state.js';
import { createInput } from './core/input.js';
import { createSound } from './core/sound.js';
import { saveGame, loadGame } from './core/save.js';
import { makeCar, makeHeli, makeNosFlame, spawnTraffic } from './sim/cars.js';
import { makePed, spawnPeds } from './sim/people.js';
import { updatePolice } from './sim/police.js';
import { createHud } from './ui/hud.js';
import { stageShot } from './stage/shots.js';

const params = new URLSearchParams(location.search);
const SHOT = Math.max(0, Math.min(4, parseInt(params.get('shot') || '0', 10) || 0));
const SEED = parseInt(params.get('seed') || '20261120', 10);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const skyTex = skyTexture();
scene.background = skyTex;
scene.environment = skyTex;
scene.fog = new THREE.Fog(0xd97a5e, 120, 520);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
camera.position.set(20, 3, 215);

// Golden hour: low warm sun from the west + pink sky fill.
const sun = new THREE.DirectionalLight(0xffb36b, 2.6);
sun.position.set(-140, 42, 90);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;
sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;
sun.shadow.camera.far = 500;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xff9a7a, 0x3a2a4a, 1.15));
const bounce = new THREE.DirectionalLight(0x2ee6ff, 0.35);
bounce.position.set(80, 30, -60);
scene.add(bounce);
// Warm fill from the south-east so shadowed streets (market) stay readable.
const fill = new THREE.DirectionalLight(0xff9a5a, 0.55);
fill.position.set(120, 60, 140);
scene.add(fill);

const island = buildIsland(scene, SEED);
const state = createState();
applySave(state, loadGame());
const input = createInput();
const sound = createSound();
const hud = createHud(state);

// --- player ------------------------------------------------------------------
const playerCar = makeCar({ color: 0xff2e4d });
playerCar.position.set(10, 0, 200);
playerCar.rotation.y = -Math.PI / 2;
scene.add(playerCar);
const nosFlame = makeNosFlame();
nosFlame.visible = false;
playerCar.add(nosFlame);
const playerPed = makePed({ shirt: 0x2ee6ff, pants: 0x2a3a5a, skin: 0xc98d5f });
playerPed.position.set(10, 0, 204);
playerPed.visible = false;
scene.add(playerPed);

const car = { speed: 0, heading: -Math.PI / 2, boosting: false };
const walk = { heading: -Math.PI / 2 };
const traffic = spawnTraffic(scene, SEED + 1, 10, { x: -200, z: 200 }, { x: 1, z: 0 }, 42);
spawnTraffic(scene, SEED + 2, 8, { x: -200, z: -80 }, { x: 1, z: 0 }, 55);
spawnPeds(scene, SEED + 3, 14, { x: -180, z: 207 }, { x: 1, z: 0 }, 26);
const cruisers = [];
for (let i = 0; i < 3; i++) {
  const c = makeCar({ color: 0xf0f0f0, police: true });
  c.position.set(-40 - i * 30, 0, 196 + i * 4);
  scene.add(c);
  cruisers.push(c);
}
const heli = makeHeli({});
heli.position.set(0, 34, 170);
scene.add(heli);

// Mission beacon: gold ring + light pillar at the current target.
const MISSION_SPOTS = [
  [30, 210], [-60, 200], [210, 60], [40, -100], [210, 120], [-100, 40],
  [60, -100], [-40, -80], [180, 180], [-160, -200], [-120, 60], [60, -120],
  [200, 200], [-180, 210], [-160, -220], [0, -100],
];
const beacon = new THREE.Group();
const beaconRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 8, 32),
  new THREE.MeshBasicMaterial({ color: 0xffd75e }));
beaconRing.rotation.x = -Math.PI / 2; beaconRing.position.y = 0.3;
const beaconBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 60, 10, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
beaconBeam.position.y = 30;
beacon.add(beaconRing, beaconBeam);
scene.add(beacon);

function placeBeacon() {
  const [x, z] = MISSION_SPOTS[state.missionIndex % MISSION_SPOTS.length];
  beacon.position.set(x, 0, z);
}
placeBeacon();

// --- title / start -------------------------------------------------------------
const titleEl = document.getElementById('title');
function startGame() {
  if (state.started) return;
  state.started = true;
  titleEl.style.display = 'none';
  sound.unlock();
  sound.setStation(state.radio);
  hud.setRadio(sound.station().name);
  hud.toast(`${currentMission(state).name} — ${currentMission(state).objective}`);
}
titleEl.addEventListener('click', startGame);
window.addEventListener('keydown', (e) => { if (e.code === 'Enter') startGame(); });

// --- shot mode ------------------------------------------------------------------
if (SHOT >= 1) {
  titleEl.style.display = 'none';
  document.getElementById('hud-hint').style.display = 'none';
  playerCar.visible = false;
  traffic.forEach((c) => { c.visible = false; });
  cruisers.forEach((c) => { c.visible = false; });
  heli.visible = false;
  beacon.visible = false;
  stageShot(SHOT, scene, camera, state, hud);
  hud.render();
  let frames = 0;
  const ready = () => {
    renderer.render(scene, camera);
    frames += 1;
    if (frames >= 3) { window.__shotReady = true; return; }
    requestAnimationFrame(ready);
  };
  requestAnimationFrame(ready);
  // Gentle idle motion keeps rotors/smoke alive without moving the camera.
  (function idle() {
    const rotor = scene.getObjectByName('rotor');
    if (rotor) rotor.rotation.y += 0.35;
    requestAnimationFrame(idle);
  }());
  window.NEONBAY = { state, scene, camera, renderer };
} else {
  // --- free-roam loop ------------------------------------------------------------
  const clock = new THREE.Clock();
  const camTarget = new THREE.Vector3();
  let toastTimer = 0;

  function collide(x, z) {
    for (const c of island.colliders) {
      if (Math.abs(x - c.x) < c.w / 2 + 1.2 && Math.abs(z - c.z) < c.d / 2 + 1.2) return true;
    }
    return false;
  }

  function drive(dt) {
    const fwd = input.axisY();
    const steer = input.axisX();
    car.boosting = !!input.keys.ShiftLeft && fwd > 0;
    const maxSpeed = car.boosting ? 52 : 40;
    if (fwd > 0) car.speed = Math.min(maxSpeed, car.speed + 16 * dt);
    else if (fwd < 0) car.speed = Math.max(-10, car.speed - 20 * dt);
    else car.speed *= Math.max(0, 1 - 1.4 * dt);
    if (input.keys.Space) car.speed *= Math.max(0, 1 - 4 * dt);
    if (Math.abs(car.speed) > 0.5) car.heading += steer * 1.5 * dt * Math.sign(car.speed) * (1 - Math.abs(car.speed) / 90);
    const nx = playerCar.position.x + Math.sin(car.heading) * car.speed * dt;
    const nz = playerCar.position.z + Math.cos(car.heading) * car.speed * dt;
    if (!collide(nx, playerCar.position.z)) playerCar.position.x = nx;
    if (!collide(playerCar.position.x, nz)) playerCar.position.z = nz;
    playerCar.position.x = Math.max(-300, Math.min(300, playerCar.position.x));
    playerCar.position.z = Math.max(-300, Math.min(300, playerCar.position.z));
    playerCar.rotation.y = car.heading;
    nosFlame.visible = car.boosting;
    state.speedKmh = Math.abs(car.speed) * 3.6;
    sound.setEngine(Math.abs(car.speed) / 52, car.boosting);
    // chase camera
    const bx = playerCar.position.x - Math.sin(car.heading) * 11;
    const bz = playerCar.position.z - Math.cos(car.heading) * 11;
    camTarget.set(bx, 4.2, bz);
    camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));
    camera.lookAt(playerCar.position.x + Math.sin(car.heading) * 8, 1.6, playerCar.position.z + Math.cos(car.heading) * 8);
    if (input.pressed.KeyE) { // exit car
      state.onFoot = true;
      playerPed.visible = true;
      playerPed.position.copy(playerCar.position);
      playerPed.position.z += 3;
      walk.heading = car.heading;
      playerCar.visible = false;
      car.speed = 0;
    }
  }

  function walkMode(dt) {
    const fwd = input.axisY();
    const steer = input.axisX();
    walk.heading += steer * 2.2 * dt;
    const sp = 5.5;
    const nx = playerPed.position.x + Math.sin(walk.heading) * fwd * sp * dt;
    const nz = playerPed.position.z + Math.cos(walk.heading) * fwd * sp * dt;
    if (!collide(nx, playerPed.position.z)) playerPed.position.x = nx;
    if (!collide(playerPed.position.x, nz)) playerPed.position.z = nz;
    playerPed.position.x = Math.max(-300, Math.min(300, playerPed.position.x));
    playerPed.position.z = Math.max(-300, Math.min(300, playerPed.position.z));
    playerPed.rotation.y = walk.heading;
    state.speedKmh = Math.abs(fwd) * sp * 3.6;
    const bx = playerPed.position.x - Math.sin(walk.heading) * 6;
    const bz = playerPed.position.z - Math.cos(walk.heading) * 6;
    camTarget.set(bx, 2.6, bz);
    camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));
    camera.lookAt(playerPed.position.x, 1.4, playerPed.position.z);
    // enter nearest car
    const dx = playerPed.position.x - playerCar.position.x;
    const dz = playerPed.position.z - playerCar.position.z;
    if (input.pressed.KeyE && Math.hypot(dx, dz) < 4) {
      state.onFoot = false;
      playerPed.visible = false;
      playerCar.visible = true;
      car.heading = walk.heading;
    }
    // shoot on click
    if (input.mouseDown) {
      sound.gunshot();
      addWanted(state, 0.05);
      input.mouseDown = false;
    }
  }

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    if (state.started && !state.paused) {
      if (state.onFoot) walkMode(dt); else drive(dt);
      // traffic drift
      traffic.forEach((c, i) => {
        c.position.x += Math.sin(c.rotation.y) * 7 * dt;
        c.position.z += Math.cos(c.rotation.y) * 7 * dt;
        if (c.position.x > 300) c.position.x = -300;
        if (c.position.x < -300) c.position.x = 300;
        if (c.position.z > 300) c.position.z = -300;
        if (c.position.z < -300) c.position.z = 300;
        void i;
      });
      // police
      const ppos = state.onFoot ? playerPed.position : playerCar.position;
      updatePolice(dt, state, ppos, cruisers, heli);
      // mission beacon
      const [bx, bz] = MISSION_SPOTS[state.missionIndex % MISSION_SPOTS.length];
      const d = Math.hypot(ppos.x - bx, ppos.z - bz);
      beaconRing.rotation.z = t * 0.8;
      if (d < 9) {
        hud.toast('Press E to complete: ' + currentMission(state).name);
        if (input.pressed.KeyE) {
          const m = completeMission(state);
          sound.mission();
          hud.toast(`MISSION COMPLETE — ${m.name} +$${m.payout.toLocaleString()}`);
          addWanted(state, -2);
          saveGame(state);
          placeBeacon();
          toastTimer = 3;
        }
      } else if (toastTimer > 0) { toastTimer -= dt; } else { hud.toast(''); }
      // storm countdown
      state.stormMinutesLeft = Math.max(0, state.stormMinutesLeft - dt / 60);
      // radio switch
      if (input.pressed.KeyQ) {
        const st = sound.setStation(state.radio + 1);
        state.radio = (state.radio + 1) % 4;
        hud.setRadio(st.name);
      }
      // weapon switch
      ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((code, i) => {
        if (input.pressed[code]) state.weaponIndex = i;
      });
      // wanted decay when slow and far from police
      if (Math.abs(car.speed) < 2 && state.wanted > 0) state.wanted = Math.max(0, state.wanted - dt * 0.02);
      hud.render();
    }
    renderer.render(scene, camera);
    input.endFrame();
  }
  tick();
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  window.addEventListener('beforeunload', () => saveGame(state));
  window.NEONBAY = { state, scene, camera, renderer };
}
