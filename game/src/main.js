// Neon Bay — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// The game moves between title, play, paused and game-over screens, and
// progress (cash, missions, position) saves to localStorage.
//
// ?seed=N fixes the city and the traffic. ?shot=start|drive|chase|mission
// (with &seed=N) stages that scene instead of running the loop, paints it
// and sets window.__shotReady for a screenshot.
import * as THREE from 'three';
import { CFG } from './config.js';
import { createWorld3D, createGame, EVENT_BUSTED, EVENT_ENTER_CAR, EVENT_MISSION_DONE, EVENT_WASTED } from './world.js';
import {
  ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';
import { STORY_INTRO } from './missions.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const SAVE_EVERY_SECONDS = 5;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const w3d = createWorld3D(seed);
const game = createGame(w3d, seed);
const renderer = createRenderer(w3d);
document.body.appendChild(renderer.canvas);
const audio = createAudio();
const status = document.getElementById('status');
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function readSave() {
  try {
    const raw = window.localStorage.getItem(CFG.saveKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(CFG.saveKey, JSON.stringify(game.serialize()));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

/** Where on the ground plane the mouse points, for aiming the pistol. */
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
  // Let the camera settle behind the player, then paint and signal ready.
  let painted = 0;
  function paint() {
    renderer.update(game.state, STEP, game.state.time);
    renderer.drawHud(game.state, screen, { saveExists: false, muted: false, overKind: 'wasted' });
    renderer.render();
    painted += 1;
    if (painted >= 12) window.__shotReady = true;
    // Keep repainting: a headless screenshot only captures a fresh frame
    // while the page keeps producing them.
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
    announce('Playing Neon Bay. Steal a car and drive to the garage.');
  }

  function endGame(kind) {
    overKind = kind;
    screen = SCREEN_OVER;
    writeSave();
    audio.busted();
    announce(kind === 'busted' ? 'Busted by the Bay PD.' : 'Wasted. You woke up at Bay General.');
  }

  function stepWorld(dt, actions) {
    const axes = input.axes();
    const clicked = input.takeClick();
    const aim = mouseGround(input);
    const stepInput = {
      ax: axes.x,
      ay: axes.y,
      run: axes.run,
      enter: Boolean(actions & ACTION_ENTER),
      enterHeld: input.isHeld('e'),
      punch: Boolean(actions & ACTION_PUNCH),
      click: clicked,
      mouseX: aim.x,
      mouseZ: aim.z,
      camYaw: renderer.getCamYaw(),
    };
    const events = game.step(dt, stepInput);
    if (events & EVENT_ENTER_CAR) audio.horn();
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
        game.step(STEP, { ax: 0, ay: 0, run: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: 0, mouseZ: 0, camYaw: 0 });
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
      audio.engine(p.inCar ? Math.min(1, Math.abs(p.speed) / CFG.carMaxSpeed) : 0);
      audio.siren(game.state.sirenOn, game.state.time);
      audio.update(STEP, true);
    } else {
      audio.engine(0);
      audio.siren(false, 0);
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
