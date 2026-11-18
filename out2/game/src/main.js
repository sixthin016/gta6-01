// Neon Bay — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// The game moves between title, play, paused and game-over screens, and
// progress (cash, missions, position) saves to localStorage.
//
// ?seed=N fixes the city and the traffic. ?shot=start|drive|chase|mission
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_BUSTED, EVENT_MISSION_DONE, EVENT_WASTED,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_BUSTED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY,
  SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';
import { STORY_INTRO } from './missions.js';

const MAX_FRAME = 0.25;
const SAVE_EVERY_SECONDS = 5;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.serialize()));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, { saveExists: false, muted: false, overKind: 'wasted' });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const save = readSave();
  let screen = SCREEN_TITLE;
  let overKind = 'wasted';
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  let introLine = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.ensure();
    if (save) {
      world.restore(save);
      world.say('Welcome back to Neon Bay.', 4);
    } else {
      world.reset();
      world.startMission(0);
      world.say(STORY_INTRO[0], 6);
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
    const cam = world.state.camera;
    const mouseWorldX = input.mouse.x - window.innerWidth / 2 + cam.x;
    const mouseWorldY = input.mouse.y - window.innerHeight / 2 + cam.y;
    const stepInput = {
      ax: axes.x,
      ay: axes.y,
      run: axes.run,
      enter: Boolean(actions & ACTION_ENTER),
      enterHeld: input.isHeld('e'),
      punch: Boolean(actions & ACTION_PUNCH),
      click: clicked,
      mouseX: mouseWorldX,
      mouseY: mouseWorldY,
    };
    const events = world.step(dt, stepInput);
    if (events & EVENT_BUSTED) endGame('busted');
    else if (events & EVENT_WASTED) endGame('wasted');
    else if (events & EVENT_MISSION_DONE) {
      audio.missionDone();
      writeSave();
      if (introLine > 0 && introLine < STORY_INTRO.length) {
        world.say(STORY_INTRO[introLine], 6);
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
      // A living backdrop: traffic rolls behind the menu.
      while (accumulator >= STEP) {
        world.step(STEP, { ax: 0, ay: 0, run: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: 0, mouseY: 0 });
        accumulator -= STEP;
      }
      handleActions();
    } else if (screen === SCREEN_PLAY) {
      // Read the pressed keys once per frame: pause/confirm here, the rest
      // (enter car, punch, mute) rides along into the world step.
      const actions = input.takeActions();
      if (actions & ACTION_MUTE) audio.setMuted(!audio.muted);
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        // Edge actions (enter car, punch) fire on the first sub-step only,
        // so one tap never enters and exits the same car in one frame.
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
    // Sound follows the game, never the menus.
    const p = world.state.player;
    if (screen === SCREEN_PLAY) {
      audio.engine(p.inCar ? Math.min(1, Math.abs(p.speed) / 430) : 0);
      audio.siren(world.state.sirenOn, world.state.time);
      audio.update(STEP, true);
    } else {
      audio.engine(0);
      audio.siren(false, 0);
    }
    renderer.draw(world, screen, { saveExists: Boolean(save), muted: audio.muted, overKind });
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
