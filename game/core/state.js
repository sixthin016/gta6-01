// Game state — money, wanted, missions, crew, respect, hurricane countdown, radio.
import { MISSIONS } from '../story/missions.js';

export const CREW_DEFS = [
  { name: 'MARA', role: 'HACKER', skill: 'Doors & cameras open 2x faster', color: '#ff5e8a', hair: '#2b1a12', skin: '#e8b98a', shirt: '#7a2b4d', health: 100 },
  { name: 'JAX', role: 'DRIVER', skill: 'NOS lasts 40% longer', color: '#2ee6ff', hair: '#111111', skin: '#c98d5f', shirt: '#0e4d5c', health: 100 },
  { name: 'REYES', role: 'GUNNER', skill: 'Reload 30% faster, +1 armor', color: '#ffb03c', hair: '#3a2a18', skin: '#a9713f', shirt: '#4d3a10', health: 100 },
];

export const WEAPONS = [
  { name: 'PISTOL', ammo: 48, mag: 12 },
  { name: 'SMG', ammo: 180, mag: 32 },
  { name: 'SHOTGUN', ammo: 40, mag: 6 },
  { name: 'RIFLE', ammo: 120, mag: 30 },
];

export function createState() {
  return {
    money: 5240,
    respect: 42,
    missionIndex: 4, // 0-based: mission 5 of 16 active
    completed: [true, true, true, true],
    wanted: 4,
    crew: CREW_DEFS.map((c) => ({ ...c, recruited: true })),
    garage: ['CORAL GT'],
    radio: 0,
    weaponIndex: 1,
    stormMinutesLeft: 19.7,
    speedKmh: 0,
    onFoot: false,
    paused: false,
    started: false,
    timeOfDay: 17.4, // golden hour, 17:24
    minimapRoute: 0, // 0..1 progress along the Shot 1→4 route
  };
}

export function currentMission(state) {
  return MISSIONS[Math.min(state.missionIndex, MISSIONS.length - 1)];
}

export function completeMission(state) {
  const m = currentMission(state);
  state.completed.push(true);
  state.money += m.payout;
  state.respect = Math.min(100, state.respect + m.respect);
  if (state.missionIndex < MISSIONS.length - 1) state.missionIndex += 1;
  return m;
}

export function addWanted(state, stars) {
  state.wanted = Math.max(0, Math.min(5, state.wanted + stars));
}

export function applySave(state, data) {
  if (!data) return;
  state.money = data.money; state.respect = data.respect;
  state.missionIndex = data.missionIndex; state.completed = data.completed;
  state.wanted = data.wanted; state.radio = data.radio;
  state.stormMinutesLeft = data.stormMinutesLeft;
  if (data.garage) state.garage = data.garage;
  if (data.crew) data.crew.forEach((c, i) => { if (state.crew[i]) { state.crew[i].health = c.health; state.crew[i].recruited = c.recruited; } });
}
