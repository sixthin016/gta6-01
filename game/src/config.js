// Neon Bay — config.js
// All tunable constants: world, districts, weapons, garage, radio,
// police escalation and the hurricane countdown. Numbers only, no logic.

export const CONFIG = {
  worldSize: 520,
  roadSpacing: 52,
  roadWidth: 12,
  seaLevel: -0.4,
  gravity: 22,
  walkSpeed: 7,
  runSpeed: 11,
  carAccel: 26,
  carBrake: 40,
  carMaxSpeed: 34,
  carTurn: 1.9,
  nosBoost: 1.7,
  nosCapacity: 100,
  nosDrain: 34,
  nosRefill: 7,
  wantedDecay: 0.045,
  hurricaneMinutes: 20,
  saveKey: 'neon-bay-save-v3',
};

export const DISTRICTS = [
  { name: 'Downtown',     color: '#ff9f1c', x0: -130, z0: -130, x1: 130,  z1: 40,  desc: 'Glass towers, neon, the money' },
  { name: 'The Docks',    color: '#2ec4b6', x0: -260, z0: -260, x1: -130, z1: 40,  desc: 'Cranes, containers, smugglers' },
  { name: 'Sunset Beach', color: '#ffd166', x0: -260, z0: 40,   x1: 260,  z1: 260, desc: 'Sand, surf, boardwalk' },
  { name: 'Palm Suburbs', color: '#80ed99', x0: 130,  z0: -260,  x1: 260,  z1: 40,  desc: 'Palms, villas, quiet streets' },
  { name: 'Old Industrial', color: '#b388eb', x0: -130, z0: -260, x1: 130, z1: -130, desc: 'Warehouses, the power plant' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  }
  return DISTRICTS[0];
}

export const WEAPONS = {
  pistol:  { name: 'Pistol',  damage: 34, fireRate: 3.2, spread: 0.02,  range: 60,  mag: 12, reload: 1.1, auto: false, color: '#e8e8e8' },
  smg:     { name: 'SMG',     damage: 16, fireRate: 9,   spread: 0.07,  range: 48,  mag: 32, reload: 1.6, auto: true,  color: '#ffd166' },
  shotgun: { name: 'Shotgun', damage: 22, fireRate: 1.1, spread: 0.16,  range: 26,  mag: 6,  reload: 2.2, auto: false, color: '#ef476f', pellets: 6 },
  sniper:  { name: 'Sniper',  damage: 95, fireRate: 0.8, spread: 0.002, range: 160, mag: 5,  reload: 2.6, auto: false, color: '#2ec4b6' },
};

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine', desc: '+12% top speed',   cost: 600, max: 3 },
  { id: 'tires',  name: 'Tires',  desc: '+15% grip & turn', cost: 450, max: 3 },
  { id: 'nos',    name: 'NOS kit', desc: '+25% boost power', cost: 900, max: 2 },
  { id: 'armor',  name: 'Armor',  desc: '+40 hull',         cost: 700, max: 3 },
];

export const RADIO = [
  { name: 'NEON FM 88.4 — synthwave',  wave: 'sawtooth', bpm: 112, base: 110 },
  { name: 'BAY 101 — latin funk',      wave: 'triangle', bpm: 96,  base: 165 },
  { name: 'PALM TALK 94 — talk radio', wave: 'sine',     bpm: 70,  base: 220 },
  { name: 'STORM 107 — drum & bass',   wave: 'square',   bpm: 174, base: 55 },
];

export const POLICE = {
  1: { cars: 1, heli: false, roadblock: false, swat: false },
  2: { cars: 2, heli: false, roadblock: false, swat: false },
  3: { cars: 3, heli: false, roadblock: true,  swat: false },
  4: { cars: 3, heli: true,  roadblock: true,  swat: false },
  5: { cars: 4, heli: true,  roadblock: true,  swat: true },
};

export const CREW = [
  { name: 'Jax',   role: 'Driver & lookout',  color: '#ff9f1c' },
  { name: 'Mara',  role: 'Hacker & fixer',    color: '#2ec4b6' },
  { name: 'Reyes', role: 'Muscle & wheelman', color: '#ef476f' },
];

export const PALETTE = {
  skyTop: 0x2b4a8f,
  skyHorizon: 0xff8c42,
  sun: 0xffd166,
  sea: 0x0e6e8c,
  sand: 0xe8c47c,
  asphalt: 0x2a2d34,
  sidewalk: 0x8d99ae,
  buildingGlass: 0x274156,
};
