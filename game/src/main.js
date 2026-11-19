// Neon Bay — main.js
// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, paused and game-over screens, and progress (cash,
// missions, respect, upgrades, crew, hurricane clock) saves to localStorage
// (and on demand when a safehouse is entered).
//
// ?seed=N fixes the city and the traffic. ?shot=start|drive|chase|mission
// (with &seed=N) stages that scene instead of running the loop, paints it
// and sets window.__shotReady for a screenshot.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
  createWorld3D, createGame, EVENT_BUSTED, EVENT_ENTER_CAR,
  EVENT_MISSION_DONE, EVENT_WASTED, EVENT_SHOT, EVENT_EXPLOSION,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH,
  ACTION_WHEEL, ACTION_COVER, ACTION_GARAGE, ACTION_RADIO, ACTION_SHOP,
  ACTION_SAFEHOUSE,
  ACTION_WEAPON_1, ACTION_WEAPON_2, ACTION_WEAPON_3, ACTION_WEAPON_4,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';
import { STORY_INTRO } from './missions.js';
import { PLACES } from './city.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const SAVE_EVERY_SECONDS = 5;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const w3d = createWorld3D(seed);
const game = createGame(w3d, seed);
// Debug hook for headless smoke tests (shop, safehouse, explosion, perks).
window.__game = game;
const renderer = createRenderer(w3d);
document.body.appendChild(renderer.canvas);
const audio = createAudio();
const status = document.getElementById('status');
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function readSave() {
  try {
    const raw = window.localStorage.getItem(CONFIG.saveKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(CONFIG.saveKey, JSON.stringify(game.serialize()));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

/** Where on the ground plane the mouse points, for aiming the guns. */
function mouseGround(input) {
  const rect = renderer.canvas.getBoundingClientRect();
  const nx = ((input.mouse.x - rect.left) / rect.width) * 2 - 1;
  const ny = -((input.mouse.y - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera({ x: nx, y: ny }, w3d.camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, hit)) return { x: hit.x, z: hit.z };
  const p = game.state.player;
  return { x: p.x + 10, z: p.z };
}

function runShot(name) {
  const scene = stageShot(name, game);
  const screen = scene.screen === 'play' ? SCREEN_PLAY : SCREEN_TITLE;
  if (scene.wheel) renderer.toggleWheel();
  // Warm up the chase camera: the lerp needs ~40 frames to converge from
  // the origin, and a headless screenshot may fire after only a few rAF
  // ticks, which used to leave the camera tens of metres off-target.
  for (let i = 0; i < 40; i += 1) renderer.update(game.state, STEP, game.state.time);
  let painted = 0;
  function paint() {
    renderer.update(game.state, STEP, game.state.time);
    renderer.drawHud(game.state, screen, { saveExists: false, muted: false, overKind: 'wasted' });
    renderer.render();
    painted += 1;
    if (painted >= 12) {
      window.__shotReady = true;
      const pp = game.state.player;
      const cp = w3d.camera.position;
      status.textContent = `SHOTDEBUG ${name} x=${pp.x.toFixed(1)} z=${pp.z.toFixed(1)} speed=${pp.speed.toFixed(1)} wanted=${pp.wanted} mission=${game.state.missionIndex} heli=${Boolean(game.state.heli)} roadblocks=${game.state.roadblocks.length} police=${game.state.policeCars.length} cops=${game.state.cops.length} crew=${game.state.followers.length} cam=${cp.x.toFixed(1)},${cp.y.toFixed(1)},${cp.z.toFixed(1)} mesh=${Boolean(game.state.playerMesh)} meshPos=${game.state.playerMesh ? game.state.playerMesh.position.x.toFixed(1) + ',' + game.state.playerMesh.position.z.toFixed(1) : 'none'} targets=${game.state.targets.length} interior=${game.state.interior ? game.state.interior.kind : 'none'} wet=${w3d.wetOverlay ? w3d.wetOverlay.material.opacity.toFixed(2) : 'n/a'}`;
    }
    requestAnimationFrame(paint);
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(renderer.canvas, (d) => renderer.orbit(d));
  const save = readSave();
  let screen = SCREEN_TITLE;
  let overKind = 'wasted';
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  let introLine = 0;

  function announce(message) { status.textContent = message; }

  function startGame() {
    audio.ensure();
    if (save) {
      game.restore(save);
      game.say('Welcome back to Neon Bay.', 4);
    } else {
      game.reset();
      game.startMission(0);
      game.say(STORY_INTRO[0], 6);
      introLine = 1;
    }
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Playing Neon Bay. Steal a car and drive to the Marina.');
  }

  function endGame(kind) {
    overKind = kind;
    screen = SCREEN_OVER;
    writeSave();
    audio.busted();
    announce(kind === 'busted' ? 'Busted by the Bay PD.' : 'Wasted. You woke up at Bay General.');
  }

  function handlePlayActions(actions) {
    const p = game.state.player;
    if (actions & ACTION_MUTE) audio.setMuted(!audio.muted);
    if (actions & ACTION_WHEEL) renderer.toggleWheel();
    if (actions & ACTION_COVER) { p.cover = !p.cover; game.say(p.cover ? 'Taking cover — cops shoot worse.' : 'Out of cover.', 2); }
    if (actions & ACTION_RADIO) {
      audio.setStation(audio.station + 1);
      game.state.radioStation = audio.station;
      game.say(`Radio: ${['NEON FM 88.4', 'BAY 101', 'PALM TALK 94', 'STORM 107'][audio.station]}`, 2);
    }
    // Shop: B enters a nearby shop (panel opens inside); 1-3 buy while open.
    if (actions & ACTION_SHOP) {
      if (game.state.shopOpen) {
        game.state.shopOpen = false;
        game.say('Shop closed.', 2);
      } else if (game.enterShop()) {
        audio.door();
      } else if (!game.state.nearShop) {
        game.say('No shop nearby — look for the green $ on the minimap.', 3);
      }
    }
    // Safehouse: H steps inside a nearby safehouse ($100, saves, clears wanted).
    if (actions & ACTION_SAFEHOUSE) {
      if (game.enterSafehouse()) audio.door();
      else if (!game.state.nearSafehouse && !game.state.interior) {
        game.say('No safehouse nearby — look for the blue H on the minimap.', 3);
      }
    }
    if (game.state.shopOpen) {
      const ids = ['ammo', 'armor', 'snack'];
      [ACTION_WEAPON_1, ACTION_WEAPON_2, ACTION_WEAPON_3].forEach((flag, i) => {
        if (actions & flag && game.buyShopItem(ids[i])) audio.buy();
      });
      return; // while shopping, 1-4 buy; they are not weapon picks.
    }
    if (actions & ACTION_WEAPON_1) p.weapon = 'pistol';
    if (actions & ACTION_WEAPON_2) p.weapon = 'smg';
    if (actions & ACTION_WEAPON_3) p.weapon = 'shotgun';
    if (actions & ACTION_WEAPON_4) p.weapon = 'sniper';
    if (actions & ACTION_GARAGE) {
      const g = PLACES.garage;
      if (Math.hypot(p.x - g.x, p.z - g.z) < 14) {
        const open = renderer.toggleGarage();
        if (!open) renderer.closeGarage();
      } else game.say("Garage upgrades are at Rook's Garage — drive there and press G.", 3);
    }
    if (renderer.garageOpen) {
      const ids = ['engine', 'tires', 'nos', 'armor'];
      [ACTION_WEAPON_1, ACTION_WEAPON_2, ACTION_WEAPON_3, ACTION_WEAPON_4].forEach((flag, i) => {
        if (actions & flag) game.buyUpgrade(ids[i]);
      });
    }
  }

  function stepWorld(dt, actions) {
    const axes = input.axes();
    const clicked = input.takeClick();
    const aim = mouseGround(input);
    const stepInput = {
      ax: axes.x,
      ay: axes.y,
      run: axes.run,
      nos: axes.nos,
      enter: Boolean(actions & ACTION_ENTER),
      enterHeld: input.isHeld('e'),
      punch: Boolean(actions & ACTION_PUNCH),
      click: clicked && !renderer.wheelOpen && !renderer.garageOpen && !game.state.shopOpen,
      mouseX: aim.x,
      mouseZ: aim.z,
      camYaw: renderer.getCamYaw(),
    };
    const events = game.step(dt, stepInput);
    if (events & EVENT_ENTER_CAR) audio.horn();
    if (events & EVENT_SHOT) audio.shot(game.state.player.weapon);
    if (events & EVENT_EXPLOSION) audio.explosion();
    if (events & EVENT_BUSTED) endGame('busted');
    else if (events & EVENT_WASTED) endGame('wasted');
    else if (events & EVENT_MISSION_DONE) {
      audio.missionDone();
      audio.cash();
      writeSave();
      if (introLine > 0 && introLine < STORY_INTRO.length) {
        game.say(STORY_INTRO[introLine], 6);
        introLine += 1;
      }
    }
    // A safehouse entry asks for an immediate save.
    if (game.state.saveRequested) {
      game.state.saveRequested = false;
      writeSave();
    }
    return actions;
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.setMuted(!audio.muted);
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        game.step(STEP, { ax: 0, ay: 0, run: false, nos: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: 0, mouseZ: 0, camYaw: 0 });
        accumulator -= STEP;
      }
      handleActions();
    } else if (screen === SCREEN_PLAY) {
      const actions = input.takeActions();
      if (actions & ACTION_MUTE) audio.setMuted(!audio.muted);
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        handlePlayActions(actions);
        let firstStep = true;
        while (accumulator >= STEP && screen === SCREEN_PLAY) {
          stepWorld(STEP, firstStep ? actions : 0);
          firstStep = false;
          accumulator -= STEP;
        }
      }
      saveTimer += STEP;
      if (saveTimer >= SAVE_EVERY_SECONDS) {
        saveTimer = 0;
        writeSave();
      }
    } else {
      accumulator = 0;
      handleActions();
    }
    const p = game.state.player;
    if (screen === SCREEN_PLAY) {
      audio.engine(p.inCar ? Math.min(1, Math.abs(p.speed) / CONFIG.carMaxSpeed) : 0);
      audio.siren(game.state.sirenOn, game.state.time);
      audio.heli(Boolean(game.state.heli), game.state.time);
      audio.update(STEP, true);
    } else {
      audio.engine(0);
      audio.siren(false, 0);
      audio.heli(false, 0);
    }
    renderer.update(game.state, STEP, game.state.time);
    renderer.drawHud(game.state, screen, { saveExists: Boolean(save), muted: audio.muted, overKind });
    renderer.render();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Neon Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
