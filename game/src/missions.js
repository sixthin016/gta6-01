// Neon Bay — story data: 16 named missions, crew, radio, BCPD dispatch units.
// All values mirror what the staged screenshots show (mid-progress states).
export const MISSIONS = [
  { n: 1, name: 'FIRST LIGHT', obj: 'Meet Jax at the Bayfront pier', district: 'Bayfront', reward: 800 },
  { n: 2, name: 'SALT & SMOKE', obj: 'Steal the courier van on Ocean Dr', district: 'Bayfront', reward: 1200 },
  { n: 3, name: 'NEON RAIN', obj: 'Lose a 2-star tail through downtown', district: 'Downtown', reward: 1500 },
  { n: 4, name: 'THE FIXER', obj: 'Buy your first safehouse in Marisol', district: 'Marisol', reward: 2000 },
  { n: 5, name: 'DELIVER THE PACKAGE', obj: 'Reach the drop point on Bayfront Ave', district: 'Bayfront', reward: 2400 },
  { n: 6, name: 'DEFEND THE MARKET', obj: 'Hold the Marisol market against BCPD', district: 'Marisol', reward: 2800 },
  { n: 7, name: 'EXTRACT THE PROTOTYPE', obj: 'Breach the server vault downtown', district: 'Downtown', reward: 4200 },
  { n: 8, name: 'STACKED HIGHWAY', obj: 'Escape the toll interchange at 5 stars', district: 'Downtown', reward: 5000 },
  { n: 9, name: 'STORM WARNING', obj: 'Fuel the boat before the hurricane', district: 'Harbor', reward: 2600 },
  { n: 10, name: 'GHOST FREQUENCY', obj: 'Jam the BCPD radio relay', district: 'Downtown', reward: 3100 },
  { n: 11, name: 'CASH & CARRY', obj: 'Rob the armored convoy on Route 9', district: 'Harbor', reward: 5500 },
  { n: 12, name: 'FAMILY BUSINESS', obj: 'Rescue Mara from the impound raid', district: 'Marisol', reward: 3600 },
  { n: 13, name: 'KING TIDE', obj: 'Race the storm surge to the causeway', district: 'Bayfront', reward: 4800 },
  { n: 14, name: 'THE LONG CON', obj: 'Sell the prototype to the highest bidder', district: 'Downtown', reward: 9000 },
  { n: 15, name: 'EYE OF THE STORM', obj: 'Hold the rooftop as the hurricane lands', district: 'Downtown', reward: 7500 },
  { n: 16, name: 'AFTER THE RAIN', obj: 'Drive out of Neon Bay — or stay and rule it', district: 'Bayfront', reward: 12000 },
];

export const CREW = [
  { name: 'JAX', callsign: 'MACER', role: 'Driver • NOS tune', color: '#ff5f6d', hp: 100, perk: 'Slipstream: +NOS duration' },
  { name: 'MARA', callsign: 'KAYLA', role: 'Hacker • Breach', color: '#2ee6a8', hp: 92, perk: 'Overclock: hacks 40% faster' },
  { name: 'REYES', callsign: 'DRIVER', role: 'Gunner • Heavy', color: '#4da6ff', hp: 78, perk: 'Steady hands: −30% recoil' },
];

export const RADIOS = [
  { name: 'NEON FM 101.1', track: 'Midnight Drive' },
  { name: 'BAY 98.5', track: 'Tide & Chrome' },
  { name: 'VICE WAVE 88.0', track: 'Palm Static' },
  { name: 'STORM RADIO 104.7', track: 'Hurricane Eye' },
];

export const WEAPONS = [
  { name: 'PISTOL', ammo: '12/48' },
  { name: 'SMG', ammo: '32/120' },
  { name: 'SHOTGUN', ammo: '6/24' },
  { name: 'RIFLE', ammo: '30/90' },
];

export const DISTRICTS = ['Bayfront', 'Downtown', 'Marisol', 'Harbor', 'Old Town'];

// BCPD dispatch units, named, with distances — shown in the dispatch panel.
export const DISPATCH = {
  1: [
    ['UNIT 7', '120m — Bayfront Ave'],
    ['UNIT 12', '85m — Ocean Dr'],
    ['AIR-1', 'inbound — heli'],
    ['UNIT 4', '210m — Pier Rd'],
  ],
  2: [
    ['UNIT 7', '40m — market north'],
    ['UNIT 12', '65m — market south'],
    ['SWAT-2', 'rappelling — Air-1'],
    ['AIR-1', 'hover — 60m'],
  ],
  3: [
    ['UNIT 9', '30m — vault door'],
    ['UNIT 14', '55m — garage'],
    ['SWAT-1', 'breaching — east'],
    ['AIR-1', 'circling — 200m'],
  ],
  4: [
    ['UNIT 7', '90m — lower deck'],
    ['UNIT 12', '140m — upper deck'],
    ['RHINO-1', 'roadblock — upper'],
    ['AIR-1', 'overhead — 80m'],
  ],
};

// Per-shot HUD state. Anchors are identical in all four shots; only values change.
export const SHOT_HUD = {
  1: {
    mission: 5, name: 'DELIVER THE PACKAGE', title: 'DELIVER THE PACKAGE', step: '▸ Reach the drop point on Bayfront Ave',
    cash: 5240, stars: 4, speed: 128, district: 'BAYFRONT', radio: 0, weapon: 0,
    crewHp: [100, 92, 78], storm: '19:42:10', time: '17:42', toast: 'BCPD pursuit — lose the tail!',
  },
  2: {
    mission: 5, name: 'DEFEND THE MARKET', title: 'DEFEND THE MARKET', step: '▸ Hold the line — SWAT inbound from Air-1',
    cash: 5890, stars: 5, speed: 0, district: 'MARISOL', radio: 1, weapon: 2,
    crewHp: [78, 92, 100], crewNames: ['MACER', 'KAYLA', 'DRIVER'], storm: '18:57:44', time: '17:58',
    toast: 'SWAT rappelling — hold the market!',
  },
  3: {
    mission: 6, name: 'EXTRACT THE PROTOTYPE', title: 'EXTRACT THE PROTOTYPE', step: '▸ Breach 3/4 nodes — 0:47 left',
    cash: 9600, stars: 5, speed: 0, district: 'DOWNTOWN', radio: 2, weapon: 1,
    crewHp: [100, 88, 95], storm: '17:12:03', time: '17:20', toast: 'Prototype drive secured — get out!',
  },
  4: {
    mission: 6, name: 'ESCAPE THE HIGHWAY', title: 'ESCAPE THE HIGHWAY', step: '▸ Break the upper-deck roadblock',
    cash: 12450, stars: 5, speed: 142, district: 'DOWNTOWN', radio: 3, weapon: 3,
    crewHp: [92, 88, 100], storm: '16:05:31', time: '17:51', toast: 'Rhino on the upper deck — go low!',
  },
};

export const SAVE_KEY = 'neon-bay-save-v1';
export function defaultSave() {
  return { money: 5240, mission: 5, respect: 62, stars: 0, radio: 0, completed: [1, 2, 3, 4] };
}
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
  } catch (e) { /* fresh save */ }
  return defaultSave();
}
export function storeSave(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
}
