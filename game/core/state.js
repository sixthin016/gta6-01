// Neon Bay — shared mutable game state. Every module reads/writes this
// one object, so the wiring stays flat: boot.js owns the loop, the sim
// modules own their slice of S. No module imports boot.js.
import * as THREE from 'three';

export const STORM_SECONDS = 1200; // 20-minute hurricane countdown
export const WORLD_HALF = 200;     // island spans -200..200 on x and z
export const ROAD_STEP = 40;       // streets every 40 units

export const S = {
  seed: 1,
  rng: null,
  scene: null,
  camera: null,
  renderer: null,
  started: false,
  paused: false,
  muted: false,
  time: 0,          // seconds since run start
  storm: 0,         // 0..1 hurricane progress (time / STORM_SECONDS)
  cash: 500,
  respect: 0,       // 0..100
  wanted: 0,        // float, 0..5 stars shown as ceil
  hp: 100,
  armor: 0,
  missionIdx: 0,
  mission: null,    // runtime mission state object (see story/missions.js)
  missionDone: new Array(16).fill(false),
  crew: { jax: false, mara: false, reyes: false },
  followers: [],    // crew follower rigs
  upgrades: { engine: 0, tires: 0, nos: 0, armor: 0 },
  nos: 100,         // 0..100 NOS meter
  nosActive: false,
  weapon: 0,        // index into WEAPONS
  ammo: [12, 90, 24, 10],
  reserve: [48, 240, 48, 20],
  player: {
    pos: new THREE.Vector3(0, 0, 24),
    heading: 0,
    speed: 0,
    hp: 100,
    onFoot: true,
    car: null,
    inCover: false,
    vel: new THREE.Vector3(),
  },
  cars: [],         // every drivable car rig
  traffic: [],      // traffic car rigs (subset of cars)
  peds: [],         // pedestrian rigs
  cops: [],         // police rigs (car or foot)
  heli: null,       // helicopter rig or null
  roadblocks: [],   // roadblock rigs
  targets: [],      // mission shoot targets
  city: null,       // built by city/island.js
  fx: null,         // particle system (fx/particles.js)
  camYaw: 0,
  camPitch: 0.34,
  camDist: 9.5,
  camSnap: false,   // first-frame camera snap for staged shots
  shot: null,       // ?shot= staging name
  shotCam: false,   // fixed cinematic camera for the cover shot
  shotNos: false,   // staged NOS flame for the cover shot
  radio: 0,         // station index 0..3
  objective: '',
  prompt: '',       // contextual key prompt ("E — enter car")
  promptKey: '',
  stats: { shots: 0, hits: 0, exploded: 0, robbed: 0 },
  over: false,
};

export function stars() {
  return Math.min(5, Math.max(0, Math.ceil(S.wanted - 0.001)));
}

export function addCash(n) {
  S.cash = Math.max(0, S.cash + n);
}

export function addRespect(n) {
  S.respect = Math.min(100, Math.max(0, S.respect + n));
}

export function setWanted(n) {
  S.wanted = Math.min(5, Math.max(0, n));
}
