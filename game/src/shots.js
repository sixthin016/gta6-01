// The four staged screenshots. Each one is a fixed, deterministic scene: the
// same seed always gives the same frame, and every frame is a real render of
// the game's own code. The four shots form one timeline — the money, the
// mission step and the wanted level all climb from shot 1 to shot 4, and the
// minimap shows the same district with a blip trail connecting them.
//
// Shot 1 — beach chase (golden hour, teal sea / amber sky): hero car macro in
// the lower third, counter-steered, NOS flame, three police in PIT formation,
// Bell 412 heli with searchlight, tire smoke in three layers, debris streaks.
// Shot 2 — market shootout (cool blue / orange muzzle): three depth planes —
// bullet-holed barrier up front, the player crouched with two crew firing in
// the middle, five police in bounding overwatch plus two SWAT on rappel ropes.
// Shot 3 — vault heist (magenta laser / cyan laptop): symmetric centre
// vanishing point, server racks, PROTOTYPE drive with red LED, hacking
// minigame 3/4 nodes at 0:47, eight-beam laser grid, getaway car at the door.
// Shot 4 — toll escape (amber / black tank): wide low camera, two decks — the
// hero car on the lower deck between six swerving civilians, a spike strip +
// four cruisers + Rhino tank on the upper deck, Bell 412 centre with gunner,
// a burning cruiser fireball.
import { CREW, SHOT_SCRIPTS, WEAPONS } from './config.js';
import { SCREEN_PLAY } from './render.js';

function hudBase(script, overrides) {
  return {
    missionStep: script.mission.step,
    missionLabel: script.mission.label,
    money: script.mission.money,
    stars: script.mission.stars,
    speed: script.mission.speed,
    crew: CREW.map((c) => ({ ...c })),
    weapon: WEAPONS[1],
    radio: 'NEON FM 88.1',
    hurricane: 18 * 60 + 32,
    district: script.district,
    policeUnits: ['UNIT 7 — VCPD', 'UNIT 12 — VCPD', 'UNIT 21 — VCPD', 'AIR 1 — HELI'],
    missionName: 'BEACH DELIVERY',
    ...overrides,
  };
}

const SHIRTS = ['#FFD700', '#31D7FF', '#FF2E88', '#7CFF6B', '#FFFFFF', '#FF8A2A', '#B33CFF', '#00D5E8', '#FFD700'];

function beachChase() {
  const script = SHOT_SCRIPTS.beach;
  return {
    mode: 'chase',
    script,
    hero: { x: 0.46, y: 0.82, w: 0.32, paint: '#E84D2F', angle: -0.14, nos: true },
    traffic: [
      // PIT formation: three police overlapping the hero's rear quarters.
      { lane: -0.30, depth: 0.34, paint: '#101018', police: true, brake: false },
      { lane: 0.18, depth: 0.42, paint: '#101018', police: true, brake: false },
      { lane: 0.62, depth: 0.50, paint: '#101018', police: true, brake: true },
      // Civilian traffic ahead, saturated paint only, front cone.
      { lane: -0.85, depth: 0.22, paint: '#00D5E8', police: false, brake: false },
      { lane: -0.55, depth: 0.58, paint: '#FFD700', police: false, brake: true },
      { lane: 0.05, depth: 0.66, paint: '#FF2E88', police: false, brake: false },
      { lane: 0.85, depth: 0.30, paint: '#7CFF6B', police: false, brake: false },
      { lane: -0.15, depth: 0.80, paint: '#FFFFFF', police: false, brake: false },
      { lane: 0.45, depth: 0.88, paint: '#B33CFF', police: false, brake: false },
      { lane: -0.70, depth: 0.94, paint: '#FF8A2A', police: false, brake: false },
      { lane: 0.75, depth: 0.72, paint: '#31D7FF', police: false, brake: false },
    ],
    peds: SHIRTS.map((shirt, i) => ({
      side: i % 2 ? 1 : -1,
      depth: 0.08 + (i % 5) * 0.18,
      shirt,
      walk: i * 1.1,
    })),
    heli: { x: 0.76, y: 0.14, rotor: 1.2, search: true },
    props: ['palms', 'sea', 'hotel'],
    effects: { smoke: 3, debris: 12, shafts: 4 },
    hud: hudBase(script, { missionName: 'BEACH DELIVERY', hurricane: 18 * 60 + 32 }),
  };
}

function marketShootout() {
  const script = SHOT_SCRIPTS.shootout;
  return {
    mode: 'street',
    script,
    hero: null,
    traffic: [],
    peds: [],
    heli: { x: 0.68, y: 0.13, rotor: 2.4, search: true },
    props: ['market-stalls', 'awnings', 'barrier'],
    effects: { smoke: 0, debris: 0, shafts: 3 },
    hud: hudBase(script, {
      missionName: 'LAST STAND', radio: 'SOLANO SOUL 92.4', hurricane: 14 * 60 + 10,
      weapon: WEAPONS[3],
      policeUnits: ['UNIT 7 — VCPD', 'UNIT 12 — VCPD', 'UNIT 21 — VCPD', 'AIR 1 — HELI', 'SWAT 4 — VCPD'],
    }),
  };
}

function vaultHeist() {
  const script = SHOT_SCRIPTS.heist;
  return {
    mode: 'interior',
    script,
    hero: null,
    traffic: [],
    peds: [],
    heli: { x: 0.5, y: 0.1, rotor: 0, search: false },
    props: ['server-racks', 'laser-grid', 'laptop'],
    effects: { smoke: 0, debris: 0, shafts: 2 },
    hud: hudBase(script, {
      missionName: 'VAULT JOB', radio: 'VICEROY 101.7', hurricane: 9 * 60 + 47,
      weapon: WEAPONS[1],
      policeUnits: ['UNIT 7 — VCPD', 'UNIT 12 — VCPD', 'UNIT 21 — VCPD', 'AIR 1 — HELI', 'SWAT 4 — VCPD'],
    }),
  };
}

function tollEscape() {
  const script = SHOT_SCRIPTS.toll;
  return {
    mode: 'toll',
    script,
    hero: { x: 0.5, y: 0.86, w: 0.32, paint: '#E84D2F', angle: -0.12, nos: true },
    traffic: [],
    peds: [],
    heli: { x: 0.5, y: 0.22, rotor: 3.6, search: true },
    props: ['rhino-tank', 'spike-strip', 'fireball'],
    effects: { smoke: 2, debris: 0, shafts: 4 },
    hud: hudBase(script, {
      missionName: 'BRIDGE BURNER', radio: 'STORM WARNING 107.9', hurricane: 4 * 60 + 12,
      weapon: WEAPONS[3],
      policeUnits: ['UNIT 7 — VCPD', 'UNIT 12 — VCPD', 'UNIT 21 — VCPD', 'AIR 1 — HELI', 'SWAT 4 — VCPD'],
    }),
  };
}

export const SHOT_BUILDERS = {
  'beach-chase': beachChase,
  'market-shootout': marketShootout,
  'vault-heist': vaultHeist,
  'toll-escape': tollEscape,
  // Short aliases for the ?shot= query used by the capture script.
  '1': beachChase,
  '2': marketShootout,
  '3': vaultHeist,
  '4': tollEscape,
};

/** Set `world` to the named staged scene and return the screen and scene to draw. */
export function stageShot(name, world) {
  const build = SHOT_BUILDERS[name] ?? beachChase;
  const scene = build();
  world.reset();
  world.state.money = scene.hud.money;
  world.state.wanted = scene.hud.stars;
  world.state.speedKmh = scene.hud.speed;
  world.state.district = scene.script.district;
  world.state.missionStep = parseInt(scene.hud.missionStep, 10);
  world.state.hurricaneSeconds = scene.hud.hurricane;
  return { screen: SCREEN_PLAY, scene, best: scene.hud.money };
}
