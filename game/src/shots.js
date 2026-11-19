// Neon Bay — shots.js
// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame.

import { EVENT_BUSTED, EVENT_WASTED } from './world.js';

const STEP = 1 / 60;
const IDLE_SECONDS = 6;
const DRIVE_SECONDS = 15;
const CHASE_SECONDS = 3;
const MISSION_SECONDS = 7;

const IDLE = { ax: 0, ay: 0, run: false, nos: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: 0, mouseZ: 0, camYaw: 0 };

/** A loop of intersections to cruise through, so the chase never leaves town. */
const CRUISE = [
  { x: -104, z: -104 }, { x: 52, z: -104 }, { x: 52, z: 104 },
  { x: -52, z: 104 }, { x: -52, z: 0 }, { x: 156, z: 0 },
  { x: 156, z: 156 }, { x: -104, z: 156 },
];

function nearestLineValue(v) {
  let best = -260;
  for (let l = -260; l <= 260; l += 52) if (Math.abs(v - l) <= Math.abs(v - best)) best = l;
  return best;
}

function routeTo(fromX, fromZ, toX, toZ) {
  // Snap the start to the road the car is actually on (a car mid-block
  // snaps to both lines; a car on a road keeps its along-road coordinate),
  // so the route never cuts diagonally across a block of buildings.
  const tx = nearestLineValue(toX), tz = nearestLineValue(toZ);
  const onXRoad = Math.abs(fromZ - nearestLineValue(fromZ)) < 6;
  const onZRoad = Math.abs(fromX - nearestLineValue(fromX)) < 6;
  const sx = onZRoad ? nearestLineValue(fromX) : fromX;
  const sz = onXRoad ? nearestLineValue(fromZ) : fromZ;
  const pts = [];
  if (sx !== tx) pts.push({ x: tx, z: sz });
  if (sz !== tz) pts.push({ x: tx, z: tz });
  if (pts.length === 0) pts.push({ x: tx, z: tz });
  return pts;
}

function driveAutopilot(game, nav) {
  const p = game.state.player;
  if (!nav.route || nav.leg !== nav.routeLeg) {
    const target = CRUISE[nav.leg % CRUISE.length];
    nav = { ...nav, route: routeTo(p.x, p.z, target.x, target.z), routeLeg: nav.leg, point: 0 };
  }
  const target = nav.route[nav.point];
  const dx = target.x - p.x;
  const dz = target.z - p.z;
  const dTo = Math.hypot(dx, dz);
  if (dTo < 8) {
    if (nav.point + 1 < nav.route.length) return { ...nav, point: nav.point + 1, stuck: 0, reversing: 0 };
    return { leg: nav.leg + 1, stuck: 0, reversing: 0 };
  }
  let want;
  if (Math.abs(dx) > Math.abs(dz)) want = dx > 0 ? 0 : Math.PI;
  else want = dz > 0 ? Math.PI / 2 : -Math.PI / 2;
  let diff = want - p.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  let stuck = nav.stuck;
  let reversing = nav.reversing;
  if (reversing > 0) {
    reversing -= STEP;
    game.step(STEP, { ...IDLE, ax: -Math.max(-1, Math.min(1, diff * 2.5)), ay: 1 });
    return { ...nav, stuck: 0, reversing };
  }
  if (Math.abs(p.speed) < 2) stuck += STEP;
  else stuck = 0;
  if (stuck > 0.7) return { ...nav, stuck: 0, reversing: 0.9 };
  let ay = -1;
  if (Math.abs(p.speed) > 18) ay = 0;
  if (dTo < 16 && Math.abs(p.speed) > 12) ay = 0; // slow for the turn
  if (Math.abs(diff) > 0.9 && Math.abs(p.speed) > 4) ay = 1; // brake, then turn
  else if (Math.abs(diff) > 0.9) ay = 0;
  if (Math.abs(diff) > 2.4) ay = 1;
  const ax = Math.max(-1, Math.min(1, diff * 2.5));
  game.step(STEP, { ...IDLE, ax, ay, nos: false });
  return { ...nav, stuck, reversing: 0 };
}

/** Walk toward a point: convert the world-space direction into camera-relative input. */
function walkAutopilot(game, toX, toZ) {
  const p = game.state.player;
  if (Math.hypot(p.x - toX, p.z - toZ) < 3) {
    game.step(STEP, IDLE);
    return;
  }
  const yaw = p.angle + Math.PI / 2;
  const wantX = toX - p.x, wantZ = toZ - p.z;
  const len = Math.hypot(wantX, wantZ);
  const dx = wantX / len, dz = wantZ / len;
  const mx = dx * Math.cos(yaw) + dz * Math.sin(yaw);
  const mz = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
  game.step(STEP, { ...IDLE, ax: mx, ay: mz, camYaw: yaw });
}

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * Unknown names stage the title screen.
 */
export function stageShot(name, game) {
  game.reset();
  const p = game.state.player;
  if (name === 'chase') {
    // Five stars: the stolen coupe mid-flight, patrol cars closing in,
    // Air One overhead, a roadblock ahead, hurricane on the clock.
    const coupe = game.state.cars.find((c) => c.mission === 2);
    coupe.kind = 'traffic';
    coupe.x = -52; coupe.z = -52;
    coupe.angle = 0;
    coupe.speed = 22;
    p.inCar = coupe;
    p.x = -52; p.z = -52;
    p.angle = 0;
    p.speed = 22;
    p.wanted = 3;
    game.state.crimeTimer = 0;
    game.state.missionIndex = 10;
    game.state.missionTimer = 0;
    game.state.hurricaneLeft = 8 * 60 + 14;
    game.state.respect = 87;
    game.banner('MARA: "Five stars! Broadcast the ledger and vanish!"');
    const tail1 = game.addPoliceCar(-76, -52);
    tail1.angle = 0; tail1.speed = 26;
    const tail2 = game.addPoliceCar(-84, -52);
    tail2.angle = 0; tail2.speed = 24;
    let nav = { leg: 1, stuck: 0, reversing: 0 };
    // Chase at 3 stars first; raise to 5 for the last second so Air One and
    // the roadblock appear ahead while the car is still moving fast.
    for (let i = 0; i < (CHASE_SECONDS - 1) / STEP; i += 1) {
      nav = driveAutopilot(game, nav);
      if (game.state.player.hp <= 0) break;
    }
    p.wanted = 5;
    game.state.crimeTimer = 0;
    game.state.shotCam = { back: 18, side: 12, height: 7 };
    for (let i = 0; i < 0.5 / STEP; i += 1) {
      nav = driveAutopilot(game, nav);
      if (game.state.player.hp <= 0) break;
    }
    return { screen: 'play' };
  }
  if (name === 'drive') {
    // Steal the red coupe, then race the ring with NOS burning.
    game.state.missionIndex = 4;
    game.startMission(4);
    p.x = -78; p.z = -50;
    game.step(STEP, { ...IDLE, enter: true });
    p.wanted = 0;
    game.state.crimeTimer = 99;
    game.state.respect = 42;
    let nav = { leg: 0, stuck: 0, reversing: 0 };
    for (let i = 0; i < DRIVE_SECONDS / STEP; i += 1) {
      nav = driveAutopilot(game, nav);
      if (game.state.player.hp <= 0) break;
    }
    return { screen: 'play' };
  }
  if (name === 'mission') {
    // On foot at the Water Tower, SMG out, taking cover in a shootout.
    game.state.missionIndex = 5;
    game.startMission(5);
    p.x = 188; p.z = -188;
    p.weapon = 'smg';
    p.cover = true;
    game.state.respect = 55;
    for (let i = 0; i < MISSION_SECONDS / STEP; i += 1) {
      walkAutopilot(game, 196, -196);
    }
    // Fire a burst at the nearest lookout so the tracer reads in the frame.
    const t = game.state.targets[0];
    if (t) {
      game.step(STEP, { ...IDLE, click: true, mouseX: t.x, mouseZ: t.z });
      for (let i = 0; i < 8; i += 1) game.step(STEP, IDLE);
      game.step(STEP, { ...IDLE, click: true, mouseX: t.x, mouseZ: t.z });
    }
    return { screen: 'play' };
  }
  // Title screen over a living city: stand on the plaza road facing east
  // toward the beach while traffic rolls, then the menu sits on top.
  p.x = -52; p.z = 52; p.angle = 0;
  game.state.hurricaneLeft = 19 * 60 + 12;
  for (let i = 0; i < IDLE_SECONDS / STEP; i += 1) {
    game.step(STEP, IDLE);
  }
  return { screen: 'title' };
}

export { EVENT_BUSTED, EVENT_WASTED };
