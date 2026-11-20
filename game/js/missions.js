// Neon Bay — story data: five districts, sixteen named missions, the crew,
// the weapon wheel, four radio stations and the hurricane countdown.
// This file holds facts only; rendering lives in hud.js and staging.js.

export const DISTRICTS = [
  { id: 'beach', name: 'Coral Beach', color: '#19c8c8' },
  { id: 'downtown', name: 'Neon Downtown', color: '#ff2e88' },
  { id: 'market', name: 'Mercado District', color: '#ffb02e' },
  { id: 'port', name: 'Portside', color: '#3dd6ff' },
  { id: 'heights', name: 'Skyline Heights', color: '#c95eff' },
];

// Sixteen story missions, in order. progress 0..16; a shot's HUD shows e.g. "5/6".
export const MISSIONS = [
  { n: 1, name: 'First Light', district: 'beach', type: 'DRIVE', objective: 'Meet Jax at the Coral pier', reward: 350 },
  { n: 2, name: 'Salt Air', district: 'beach', type: 'DELIVER', objective: 'Run the package down Shore Drive', reward: 480 },
  { n: 3, name: 'Tide Runner', district: 'beach', type: 'CHASE', objective: 'Lose the beach patrol', reward: 620 },
  { n: 4, name: 'Boardwalk Heat', district: 'beach', type: 'DEFEND', objective: 'Hold the arcade until Mara finishes', reward: 700 },
  { n: 5, name: 'Neon Intro', district: 'downtown', type: 'MEET', objective: 'Pick up Reyes at the Neon Hotel', reward: 400 },
  { n: 6, name: 'Downtown Run', district: 'downtown', type: 'DELIVER', objective: 'Deliver the prototype case — 5 of 6 drops', reward: 900 },
  { n: 7, name: 'Market Wars', district: 'market', type: 'DEFEND', objective: 'Defend the stall from the rival crew', reward: 850 },
  { n: 8, name: 'Night Market', district: 'market', type: 'STEAL', objective: 'Lift the ledger from the back room', reward: 1100 },
  { n: 9, name: 'Port Call', district: 'port', type: 'DRIVE', objective: 'Smuggle the crate through Portside', reward: 950 },
  { n: 10, name: 'Container King', district: 'port', type: 'HEIST', objective: 'Crack the container vault', reward: 1400 },
  { n: 11, name: 'High Rise', district: 'heights', type: 'CLIMB', objective: 'Reach the rooftop relay', reward: 1200 },
  { n: 12, name: 'Skyline Chase', district: 'heights', type: 'CHASE', objective: 'Outrun Air-1 across the tollway', reward: 1600 },
  { n: 13, name: 'Storm Warning', district: 'downtown', type: 'MEET', objective: 'Warn the crew — hurricane landfall soon', reward: 500 },
  { n: 14, name: 'Blackout', district: 'market', type: 'HEIST', objective: 'Cut the grid, take the server drives', reward: 2200 },
  { n: 15, name: 'Prototype', district: 'downtown', type: 'EXTRACT', objective: 'Extract the PROTOTYPE drive', reward: 2600 },
  { n: 16, name: 'Landfall', district: 'heights', type: 'ESCAPE', objective: 'Escape the tollway before landfall', reward: 4000 },
];

export const CREW = [
  {
    id: 'jax', name: 'Jax', role: 'Driver', perk: 'NOS tuning — longer boost, faster refill',
    color: '#ff7a3d', shirt: '#ff7a3d', skin: '#c98d64', hair: '#1c1a22', health: 92,
  },
  {
    id: 'mara', name: 'Mara', role: 'Hacker', perk: 'Breach — hacking nodes solve 40% faster',
    color: '#22e0ff', shirt: '#22a8c8', skin: '#e8b48a', hair: '#3a1c4e', health: 78,
  },
  {
    id: 'reyes', name: 'Reyes', role: 'Gunner', perk: 'Steady aim — no recoil bloom while braced',
    color: '#7cff5e', shirt: '#4a7a3a', skin: '#8a5a34', hair: '#0e0c10', health: 86,
  },
];

export const WEAPONS = [
  { id: 'pistol', name: 'P9 Pistol', ammo: 42, max: 60, damage: 22 },
  { id: 'smg', name: 'VK-9 SMG', ammo: 96, max: 120, damage: 14 },
  { id: 'shotgun', name: 'Breacher 12', ammo: 18, max: 24, damage: 55 },
  { id: 'rifle', name: 'AR-77 Rifle', ammo: 64, max: 90, damage: 34 },
];

export const RADIOS = [
  { id: 'wave', name: 'NEON WAVE 98.5', genre: 'synthwave', color: '#ff2e88' },
  { id: 'bay', name: 'BAY FM 101.1', genre: 'latin pop', color: '#ffb02e' },
  { id: 'storm', name: 'STORM TALK 640', genre: 'news • hurricane watch', color: '#3dd6ff' },
  { id: 'bass', name: 'BASSLINE 107.9', genre: 'hip-hop', color: '#7cff5e' },
];

// Hurricane landfall clock: 20 minutes of story time from the first mission.
export const HURRICANE_TOTAL = 20 * 60;

export const SHOPS = [
  { name: 'Ammu-Nation Bay', kind: 'weapons', district: 'downtown' },
  { name: 'Taco Coral', kind: 'food', district: 'beach' },
  { name: 'Mercado Meds', kind: 'health', district: 'market' },
  { name: 'Portside Paint', kind: 'garage', district: 'port' },
];

export const SAFHOUSES = [
  { name: 'Coral Motel 6', district: 'beach' },
  { name: 'Neon Loft', district: 'downtown' },
  { name: 'Market Flat', district: 'market' },
];
