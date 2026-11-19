// Neon Bay — entry point. Builds the renderer, city, traffic, crew and
// HUD, owns the main loop and the chase camera, handles keys/mouse,
// and stages the four screenshot scenes (?shot=start|drive|chase|mission
// &seed=N). No game logic lives here — it calls the sim/story/ui modules.
import * as THREE from 'three';
import { S, STORM_SECONDS, setWanted } from './core/state.js';
import { makeRng } from './core/rng.js';
import { initInput, keys, pressed, mouse, endFrame, forwardAxis, strafeAxis } from './core/input.js';
import { initAudio, resumeAudio, startRadio, cycleRadio, setMuted, sfx, stationName } from './core/sound.js';
import { loadGame, saveGame, hasSave } from './core/save.js';
import { buildIsland, updateStorm } from './city/island.js';
import { initFX, updateFX } from './fx/particles.js';
import { spawnTraffic, drivePlayer, updateTraffic, enterCar, exitCar, nearestCar } from './sim/cars.js';
import { spawnPlayerRig, spawnPeds, updatePeds, movePlayerOnFoot, updateCrew } from './sim/people.js';
import { updatePolice, clearPolice, forceChase } from './sim/police.js';
import { WEAPONS, tryShoot, updateWeapons, selectWeapon, toggleCover, startReload } from './sim/weapons.js';
import { updateEconomy, nearbyPlace, buyUpgrade, buyShopItem, useSafehouse, GARAGE_ITEMS, SHOP_ITEMS } from './sim/economy.js';
import { MISSIONS, initMissionMarker, startMission, updateMission, retryMission } from './story/missions.js';
import { initHUD, updateHUD, showToast, showStart, hideStart, showPause, showPanel, hidePanel, panelKind, showWheel } from './ui/hud.js';
import { updateTargets } from './sim/people.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
S.seed = parseInt(params.get('seed') || '1', 10) || 1;
S.shot = SHOT;

let wheelOpen = false;
let downPos = null;

function stageShot(shot) {
  S.started = true;
  hideStart();
  initAudio(); resumeAudio(); startRadio();
  if (shot === 'start' || shot === 'chase') {
    // cover: 5-star chase with heli + roadblock + NOS flame in one frame.
    // Car sits on the x=0 road heading north; camera sits behind it on
    // the same road so the frame is street, not building wall.
    S.shotCam = true;
    S.player.pos.set(0, 0, 40);
    const car = nearestCar(S.player.pos, 30);
    if (car) {
      enterCar(car);
      S.player.car.mesh.position.set(0, 0, 40);
      S.player.car.heading = 0;
      S.player.car.speed = 16;
      S.player.car.paint.color.setHex(0xd43d2a); // hero car reads bright red
    }
    S.camYaw = Math.PI;
    S.upgrades.nos = 2; S.upgrades.engine = 2;
    S.nos = 90;
    S.shotNos = true;
    setWanted(5);
    forceChase();
    if (S.heli) S.heli.angle = Math.PI / 2; // heli ahead of the car, in frame
    startMission(4);
    showToast('BCPD pursuit — 5 stars');
  } else if (shot === 'drive') {
    const car = nearestCar(S.player.pos, 30);
    if (car) {
      enterCar(car);
      S.player.car.speed = 14;
      // approach checkpoint 1 from the west along the open z=-120 street
      S.player.car.mesh.position.set(-168, 0, -120);
      S.player.car.heading = Math.PI / 2;
    }
    S.camYaw = Math.PI * 1.5; // camera behind the car, looking east
    startMission(4);
    showToast('Street Cred — checkpoint 1/8');
  } else if (shot === 'mission') {
    // safehouse defense shootout (Last Stand): stand on the Hideout so
    // the go-to leg completes on the first tick and the defense starts,
    // then step south into the open street so the camera sees the player,
    // the safehouse, and the SWAT wave — not a wall.
    S.player.pos.set(-136, 0, -104);
    S.camYaw = 0;
    startMission(14);
    setWanted(5);
    setTimeout(() => { S.player.pos.set(-136, 0, -86); }, 2500);
    showToast('Last Stand — hold the Hideout');
  } else if (shot === 'title') {
    // title over the city at golden hour, wet streets: force the storm
    // visuals now (the game is not running behind the title screen)
    S.time = STORM_SECONDS * 0.62;
    S.storm = 0.62;
    updateStorm(S.city, 0.62, 0, S.player.pos);
    S.player.pos.set(60, 0, 120);
    showStart(false);
    S.started = false;
  }
  if (shot === 'title') return;
  // snap the camera to its staged position on the first frame so a
  // slow first paint never catches it mid-flight from the origin
  S.camSnap = true;
  // warm the camera + a few frames of sim so the shot is dense, not empty
  for (let i = 0; i < 40; i++) updatePolice(0.05);
}

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('game').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2000);
  S.renderer = renderer; S.scene = scene; S.camera = camera;
  S.rng = makeRng(S.seed);
  S.city = buildIsland(scene);
  initFX(scene);
  initMissionMarker(scene);
  spawnPlayerRig();
  spawnTraffic(26);
  spawnPeds(30);
  initHUD();
  initInput();
  initAudio();
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  addEventListener('mousedown', (e) => { downPos = [e.clientX, e.clientY]; });
  addEventListener('mouseup', (e) => {
    if (!downPos || !S.started || S.paused) { downPos = null; return; }
    const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
    downPos = null;
    if (moved < 6 && !(e.target.closest && e.target.closest('button'))) tryShoot();
  });
  window.__neonbay_start = (cont) => {
    if (cont) loadGame();
    hideStart();
    S.started = true;
    resumeAudio(); startRadio();
    startMission(S.missionIdx);
    showToast(`Welcome to Neon Bay — ${MISSIONS[S.missionIdx].name}`);
  };
  window.__neonbay_resume = () => { S.paused = false; showPause(false); };
  window.__neonbay = {
    S, MISSIONS, WEAPONS,
    startMission, setWanted,
    debug: {
      damageCar: (car, dmg) => import('./sim/cars.js').then((m) => m.damageCar(car, dmg, true)),
      explodeCar: (car) => import('./sim/cars.js').then((m) => m.explodeCar(car, true)),
      buyUpgrade: (i) => import('./sim/economy.js').then((m) => m.buyUpgrade(i)),
      buyShopItem: (i) => import('./sim/economy.js').then((m) => m.buyShopItem(i)),
      useSafehouse: () => import('./sim/economy.js').then((m) => m.useSafehouse()),
      recruitCrew: (k) => import('./sim/people.js').then((m) => m.recruitCrew(k)),
      tryShoot,
    },
    snapshot: () => ({
      started: S.started, cash: S.cash, respect: S.respect, wanted: S.wanted,
      mission: S.mission ? { id: S.mission.id, name: S.mission.def.name, stage: S.mission.stage } : null,
      missionDone: S.missionDone.filter(Boolean).length,
      cars: S.cars.length, traffic: S.traffic.length, peds: S.peds.length,
      cops: S.cops.length, heli: !!S.heli, crew: Object.keys(S.crew).filter((k) => S.crew[k]),
      objective: S.objective, hp: S.player.hp, storm: S.storm,
    }),
  };
  if (SHOT) stageShot(SHOT);
  else showStart(hasSave());
  renderer.setAnimationLoop(tick);
  addEventListener('beforeunload', () => { if (S.started) saveGame(); });
}

const clock = new THREE.Clock();

function handleKeys() {
  if (pressed.Escape || pressed.KeyP) {
    if (panelKind) hidePanel();
    else if (wheelOpen) { wheelOpen = false; showWheel(false); }
    else if (S.started) { S.paused = !S.paused; showPause(S.paused); }
  }
  if (!S.started || S.paused) return;
  if (S.mission?.failed && pressed.Enter) { retryMission(); return; }
  // panels first: number keys buy while a panel is open
  if (panelKind) {
    for (let i = 0; i < 4; i++) {
      if (pressed[`Digit${i + 1}`]) {
        const msg = panelKind === 'garage' ? buyUpgrade(i) : buyShopItem(i);
        showToast(msg);
        const near = nearbyPlace();
        if (near?.type === 'garage') openGarage();
        else if (near?.type === 'shop') openShop();
      }
    }
    return;
  }
  if (pressed.KeyQ) { wheelOpen = !wheelOpen; showWheel(wheelOpen); }
  if (wheelOpen) {
    for (let i = 0; i < 4; i++) {
      if (pressed[`Digit${i + 1}`]) { selectWeapon(i); wheelOpen = false; showWheel(false); }
    }
  } else {
    for (let i = 0; i < 4; i++) if (pressed[`Digit${i + 1}`]) selectWeapon(i);
  }
  if (pressed.KeyR) showToast(`Radio: ${cycleRadio()}`);
  if (pressed.KeyM) { setMuted(!S.muted); showToast(S.muted ? 'Muted' : 'Sound on'); }
  if (pressed.KeyC) { toggleCover(); showToast(S.player.inCover ? 'In cover — cops shoot worse' : 'Out of cover'); }
  if (pressed.KeyX) startReload();
  if (pressed.KeyG) { const n = nearbyPlace(); if (n?.type === 'garage') openGarage(); }
  if (pressed.KeyB) { const n = nearbyPlace(); if (n?.type === 'shop') openShop(); }
  if (pressed.KeyH) {
    const n = nearbyPlace();
    if (n?.type === 'safehouse') showToast(useSafehouse());
  }
  if (pressed.KeyE) {
    const m = S.mission;
    const robbing = m && m.def.type === 'rob' && !m.robbed;
    const near = nearbyPlace();
    if (robbing && near?.type === 'shop') {
      // missions.js reads pressed.KeyE itself this frame
    } else if (S.player.onFoot) {
      const car = nearestCar(S.player.pos, 4.5);
      if (car) enterCar(car);
    } else {
      exitCar();
    }
  }
}

function openGarage() {
  showPanel('garage', "Rook's Garage — upgrades", GARAGE_ITEMS.map((g) => {
    const lvl = S.upgrades[g.key];
    return { name: `${g.name} ${'●'.repeat(lvl)}${'○'.repeat(3 - lvl)}`, desc: g.desc, cost: lvl >= 3 ? 'MAX' : `$${g.costs[lvl]}` };
  }));
}

function openShop() {
  showPanel('shop', 'Corner Store', SHOP_ITEMS.map((s) => ({ name: s.name, desc: s.desc, cost: `$${s.cost}` })));
}

function updateCamera(dt) {
  const cam = S.camera;
  const p = S.player.pos;
  // drag orbits the camera
  S.camYaw -= mouse.dx * 0.004;
  S.camPitch = THREE.MathUtils.clamp(S.camPitch + mouse.dy * 0.002, 0.12, 0.9);
  if (S.shotCam && S.player.car) {
    // low behind-above chase camera for the cover shot: road ahead,
    // heli in the top of the frame, NOS flame on the car
    const h = S.player.heading;
    const target = new THREE.Vector3(
      p.x - Math.sin(h) * 18, 5, p.z - Math.cos(h) * 18);
    if (S.camSnap || cam.position.distanceTo(target) > 12) { cam.position.copy(target); S.camSnap = false; }
    else cam.position.lerp(target, 1 - Math.pow(0.001, dt));
    cam.lookAt(p.x, p.y + 3, p.z);
    return;
  }
  if (S.shot === 'title') {
    cam.position.set(150, 55, 190);
    cam.lookAt(0, 8, 0);
    return;
  }
  // driving: camera swings behind the car's heading; on foot: free orbit
  if (!S.player.onFoot && S.player.car) {
    const targetYaw = S.player.heading + Math.PI;
    let diff = targetYaw - S.camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    S.camYaw += diff * Math.min(1, dt * 1.6);
  }
  const dist = S.player.onFoot ? 8 : 10.5;
  const cx = p.x + Math.sin(S.camYaw) * dist * Math.cos(S.camPitch);
  const cz = p.z + Math.cos(S.camYaw) * dist * Math.cos(S.camPitch);
  const cy = p.y + 2 + Math.sin(S.camPitch) * dist;
  const target = new THREE.Vector3(cx, cy, cz);
  if (S.camSnap || cam.position.distanceTo(target) > 12) { cam.position.copy(target); S.camSnap = false; }
  else cam.position.lerp(target, 1 - Math.pow(0.0001, dt));
  cam.lookAt(p.x, p.y + 1.6, p.z);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  handleKeys();
  if (S.started && !S.paused) {
    S.time += dt;
    S.storm = Math.min(1, S.time / STORM_SECONDS);
    const fwd = forwardAxis();
    const strafe = strafeAxis();
    const run = !!(keys.ShiftLeft || keys.ShiftRight);
    if (S.player.onFoot) {
      movePlayerOnFoot(dt, fwd, strafe, run);
    } else {
      drivePlayer(dt, fwd, strafe, !!(keys.Space));
    }
    updateTraffic(dt);
    updatePeds(dt);
    updateCrew(dt);
    updateTargets(dt);
    updatePolice(dt);
    updateWeapons(dt);
    updateMission(dt);
    updateEconomy();
    updateFX(dt);
    updateStorm(S.city, S.storm, dt, S.player.pos);
    if (S.player.hp <= 0) {
      // wasted outside cop fire (e.g. explosion): same penalty path
      S.player.hp = 100;
      setWanted(0);
      clearPolice();
      S.player.pos.set(0, 0, 24);
      if (S.player.car) { S.player.car.isPlayer = false; S.player.car = null; }
      S.player.onFoot = true;
      showToast('Wasted — $100 + respect lost');
    }
  }
  updateCamera(dt);
  updateHUD();
  S.renderer.render(S.scene, S.camera);
  endFrame();
}

init();
