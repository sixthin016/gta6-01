// Neon Bay — the screenshot scenes behind ?shot=start|drive|chase|mission.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { EVENT_BUSTED, EVENT_WASTED } from './world.js';

const IDLE_SECONDS = 6;
const DRIVE_SECONDS = 15;
const CHASE_SECONDS = 3;
const MISSION_SECONDS = 7;

/** Steer toward a point: returns {ax, ay} in world space. */
function steerToward(fromX, fromY, fromAngle, toX, toY, driving) {
  const want = Math.atan2(toY - fromY, toX - fromX);
  let diff = want - fromAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (driving) {
    return { ax: Math.max(-1, Math.min(1, diff * 2.2)), ay: -1 };
  }
  return { ax: Math.cos(want), ay: Math.sin(want) };
}

/** A loop of intersections to cruise through, so the chase never leaves town. */
const CRUISE = [
  { x: 600, y: 600 },
  { x: 1800, y: 600 },
  { x: 1800, y: 1800 },
  { x: 1000, y: 1800 },
  { x: 1000, y: 1000 },
  { x: 2200, y: 1000 },
  { x: 2200, y: 2200 },
  { x: 600, y: 2200 },
];

/**
 * Drive the player's car along the street grid toward the current cruise
 * waypoint: one axis at a time, like a real driver, so the car never cuts
 * across blocks or buildings. `nav` carries the leg and the stuck-recovery
 * timer. Returns the updated nav.
 */
function driveAutopilot(world, nav) {
  const p = world.state.player;
  const target = CRUISE[nav.leg % CRUISE.length];
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  if (Math.hypot(dx, dy) < 120) return { leg: nav.leg + 1, stuck: 0, reversing: 0 };
  let want;
  if (Math.abs(dx) > 100 && Math.abs(dy) > 100) {
    // Both axes far: keep the axis the car is already travelling on.
    want = Math.abs(Math.cos(p.angle)) > 0.7
      ? (dx > 0 ? 0 : Math.PI)
      : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  } else if (Math.abs(dx) > Math.abs(dy)) {
    want = dx > 0 ? 0 : Math.PI;
  } else {
    want = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  let diff = want - p.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Stuck against something: back out for a moment, steering the other way.
  let stuck = nav.stuck;
  let reversing = nav.reversing;
  if (reversing > 0) {
    reversing -= STEP;
    world.step(STEP, { ax: -Math.max(-1, Math.min(1, diff * 2.5)), ay: 1, run: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: p.x + 100, mouseY: p.y });
    return { leg: nav.leg, stuck: 0, reversing };
  }
  if (Math.abs(p.speed) < 25) stuck += STEP;
  else stuck = 0;
  if (stuck > 0.7) return { leg: nav.leg, stuck: 0, reversing: 0.9 };
  // Slow down for the turn so the arc stays inside the intersection.
  let ay = -1;
  if (Math.abs(p.speed) > 260) ay = 0;
  if (Math.abs(diff) > 0.9) ay = 0;
  if (Math.abs(diff) > 2.4) ay = 1;
  const ax = Math.max(-1, Math.min(1, diff * 2.5));
  world.step(STEP, { ax, ay, run: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: p.x + 100, mouseY: p.y });
  return { leg: nav.leg, stuck, reversing: 0 };
}

function walkAutopilot(world, toX, toY) {
  const p = world.state.player;
  if (Math.hypot(p.x - toX, p.y - toY) < 40) {
    // Close enough: stand still so the frame stays composed.
    world.step(STEP, { ax: 0, ay: 0, run: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: p.x + 100, mouseY: p.y });
    return;
  }
  const input = steerToward(p.x, p.y, p.angle, toX, toY, false);
  world.step(STEP, { ...input, run: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: p.x + 100, mouseY: p.y });
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Unknown names stage the title screen.
 */
export function stageShot(name, world) {
  world.reset();
  const p = world.state.player;
  if (name === 'chase') {
    // Stage the chase directly: the stolen coupe mid-flight down a straight
    // avenue, two patrol cars closing in behind, two stars on the HUD.
    const coupe = world.state.cars.find((c) => c.mission === 2);
    coupe.kind = 'traffic';
    coupe.x = 1000;
    coupe.y = 600;
    coupe.angle = 0;
    coupe.speed = 260;
    p.inCar = coupe;
    p.x = 1000;
    p.y = 600;
    p.angle = 0;
    p.speed = 260;
    p.wanted = 2;
    world.state.crimeTimer = 0;
    world.state.camera.x = p.x;
    world.state.camera.y = p.y;
    world.banner('ROOK: "You\'re hot — two stars. Lose them!"');
    const tail1 = world.addPoliceCar(760, 600);
    tail1.angle = 0;
    tail1.speed = 320;
    const tail2 = world.addPoliceCar(680, 600);
    tail2.angle = 0;
    tail2.speed = 300;
    let nav = { leg: 1, stuck: 0, reversing: 0 };
    for (let i = 0; i < CHASE_SECONDS / STEP; i += 1) {
      nav = driveAutopilot(world, nav);
      if (world.state.player.hp <= 0) break;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'drive') {
    // Walk up to the red coupe, steal it, then cruise the city.
    p.x = 660;
    p.y = 480;
    world.state.camera.x = p.x;
    world.state.camera.y = p.y;
    world.step(STEP, { ax: 0, ay: 0, run: false, enter: true, enterHeld: false, punch: false, click: false, mouseX: 660, mouseY: 430 });
    // A clean cruise for the drive shot: the steal is done, the heat is off.
    p.wanted = 0;
    world.state.crimeTimer = 99;
    let nav = { leg: 0, stuck: 0, reversing: 0 };
    for (let i = 0; i < DRIVE_SECONDS / STEP; i += 1) {
      nav = driveAutopilot(world, nav);
      if (world.state.player.hp <= 0) break;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // On foot outside the Sunset Corner Store, mid-robbery setup for mission 4.
    world.state.missionIndex = 4;
    world.state.missionStage = 0;
    world.startMission(4);
    p.x = 1800;
    p.y = 1160;
    world.state.camera.x = p.x;
    world.state.camera.y = p.y;
    for (let i = 0; i < MISSION_SECONDS / STEP; i += 1) {
      walkAutopilot(world, 1830, 1180);
    }
    return { screen: SCREEN_PLAY };
  }
  // Title screen over a living city: traffic rolls while the menu sits on top.
  for (let i = 0; i < IDLE_SECONDS / STEP; i += 1) {
    world.step(STEP, { ax: 0, ay: 0, run: false, enter: false, enterHeld: false, punch: false, click: false, mouseX: 0, mouseY: 0 });
  }
  return { screen: SCREEN_TITLE };
}

export { EVENT_BUSTED, EVENT_WASTED };
