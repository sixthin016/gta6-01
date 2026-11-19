// Neon Bay — the screenshot scenes behind ?shot=start|drive|chase|mission.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { EVENT_BUSTED, EVENT_WASTED } from './world.js';

const STEP = 1 / 60;
const IDLE_SECONDS = 6;
const DRIVE_SECONDS = 15;
const CHASE_SECONDS = 3;
const MISSION_SECONDS = 7;

const IDLE = { ax: 0, ay: 0, run: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: 0, mouseZ: 0, camYaw: 0 };

/** A loop of intersections to cruise through, so the chase never leaves town. */
const CRUISE = [
  { x: -96, z: -96 }, { x: 48, z: -96 }, { x: 48, z: 96 },
  { x: -48, z: 96 }, { x: -48, z: 0 }, { x: 144, z: 0 },
  { x: 144, z: 144 }, { x: -96, z: 144 },
];

/**
 * Drive the player's car along the street grid toward the current cruise
 * waypoint, following a Manhattan route through intersections so the car
 * never cuts across blocks. `nav` carries the leg, the route and the
 * stuck-recovery timer.
 */
function nearestLineValue(v) {
  let best = -240;
  for (let l = -240; l <= 240; l += 48) if (Math.abs(v - l) < Math.abs(v - best)) best = l;
  return best;
}

function routeTo(fromX, fromZ, toX, toZ) {
  const sx = nearestLineValue(fromX), sz = nearestLineValue(fromZ);
  const tx = nearestLineValue(toX), tz = nearestLineValue(toZ);
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
  if (Math.hypot(dx, dz) < 6) {
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
  if (Math.abs(p.speed) > 22) ay = 0;
  if (Math.abs(diff) > 0.9) ay = 0;
  if (Math.abs(diff) > 2.4) ay = 1;
  const ax = Math.max(-1, Math.min(1, diff * 2.5));
  game.step(STEP, { ...IDLE, ax, ay });
  return { ...nav, stuck, reversing: 0 };
}

/** Walk toward a point: convert the world-space direction into camera-relative input. */
function walkAutopilot(game, toX, toZ) {
  const p = game.state.player;
  if (Math.hypot(p.x - toX, p.z - toZ) < 3) {
    game.step(STEP, IDLE);
    return;
  }
  const yaw = p.angle + Math.PI / 2; // camera sits behind the walking player
  const wantX = toX - p.x, wantZ = toZ - p.z;
  const len = Math.hypot(wantX, wantZ);
  const dx = wantX / len, dz = wantZ / len;
  // Input (mx, mz) rotates by yaw into world space, so invert the rotation.
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
    // The stolen coupe mid-flight down a straight avenue, patrol cars
    // closing in behind, three stars on the HUD.
    const coupe = game.state.cars.find((c) => c.mission === 2);
    coupe.kind = 'traffic';
    coupe.x = -48; coupe.z = -48;
    coupe.angle = 0;
    coupe.speed = 22;
    p.inCar = coupe;
    p.x = -48; p.z = -48;
    p.angle = 0;
    p.speed = 22;
    p.wanted = 3;
    game.state.crimeTimer = 0;
    game.state.missionIndex = 6;
    game.state.missionTimer = 120;
    game.banner('ROOK: "Three stars, two minutes — get to the hideout."');
    const tail1 = game.addPoliceCar(-72, -48);
    tail1.angle = 0; tail1.speed = 26;
    const tail2 = game.addPoliceCar(-80, -48);
    tail2.angle = 0; tail2.speed = 24;
    let nav = { leg: 1, stuck: 0, reversing: 0 };
    for (let i = 0; i < CHASE_SECONDS / STEP; i += 1) {
      nav = driveAutopilot(game, nav);
      if (game.state.player.hp <= 0) break;
    }
    return { screen: 'play' };
  }
  if (name === 'drive') {
    // Walk up to the red coupe, steal it, then cruise the city.
    p.x = -72; p.z = -46;
    game.step(STEP, { ...IDLE, enter: true });
    p.wanted = 0;
    game.state.crimeTimer = 99;
    let nav = { leg: 0, stuck: 0, reversing: 0 };
    for (let i = 0; i < DRIVE_SECONDS / STEP; i += 1) {
      nav = driveAutopilot(game, nav);
      if (game.state.player.hp <= 0) break;
    }
    return { screen: 'play' };
  }
  if (name === 'mission') {
    // On foot outside the Sunset Corner Store, mid-robbery for mission 5.
    game.state.missionIndex = 4;
    game.state.missionStage = 0;
    game.startMission(4);
    p.x = -56; p.z = 40;
    for (let i = 0; i < MISSION_SECONDS / STEP; i += 1) {
      walkAutopilot(game, -48, 48);
    }
    return { screen: 'play' };
  }
  // Title screen over a living city: stand on the plaza road facing east
  // toward the beach while traffic rolls, then the menu sits on top.
  p.x = -48; p.z = 48; p.angle = 0;
  for (let i = 0; i < IDLE_SECONDS / STEP; i += 1) {
    game.step(STEP, IDLE);
  }
  return { screen: 'title' };
}

export { EVENT_BUSTED, EVENT_WASTED };
