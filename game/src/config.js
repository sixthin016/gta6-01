// Neon Bay — shared configuration: canvas, districts, missions, crew,
// weapons, radio stations and the hurricane clock. One job: constants only.
export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const HORIZON_Y = 300;

// Golden-hour palette shared by every scene. The sun never leaves 17:00-18:00.
export const GOLDEN_HOUR = {
  skyTop: '#2e1a5e',
  skyMid: '#c94b7c',
  skyLow: '#ff7e5f',
  horizon: '#ffb347',
  sunCore: '#fff3c4',
  sunGlow: 'rgba(255, 170, 80, 0.55)',
  roadTop: '#3a3348',
  roadBottom: '#191423',
  wetSheen: 'rgba(255, 150, 90, 0.20)',
};

export const DISTRICTS = [
  { id: 'beach', name: 'VICE BEACH', palette: ['#2ec4b6', '#f4d58d', '#ff8fa3', '#118ab2'], accent: '#2ec4b6', mood: 'teal sand' },
  { id: 'downtown', name: 'DOWNTOWN NEON', palette: ['#7b2ff7', '#00e5ff', '#ff2e88', '#ffd166'], accent: '#ff2e88', mood: 'neon purple' },
  { id: 'market', name: 'LITTLE HAVANA', palette: ['#ff9f1c', '#e71d36', '#ffd166', '#2ec4b6'], accent: '#ff9f1c', mood: 'warm market' },
  { id: 'portside', name: 'PORTSIDE DOCKS', palette: ['#4cc9f0', '#4361ee', '#f72585', '#adb5bd'], accent: '#4cc9f0', mood: 'industrial teal' },
  { id: 'starfish', name: 'STARFISH ISLAND', palette: ['#ff70a6', '#ffd670', '#e9ff70', '#70d6ff'], accent: '#ff70a6', mood: 'pink white' },
];

// Sixteen named story missions across the five districts.
export const MISSIONS = [
  { n: 1, district: 'beach', name: 'SALT AIR INTRO', objective: 'Meet Jax at the boardwalk' },
  { n: 2, district: 'beach', name: 'BOARDWALK PICKUP', objective: 'Collect the package' },
  { n: 3, district: 'beach', name: 'TIDE RUNNER', objective: 'Outrun the beach patrol' },
  { n: 4, district: 'beach', name: 'BEACHFRONT BLOWOUT', objective: 'Deliver before the tide turns' },
  { n: 5, district: 'downtown', name: 'NEON NIGHTS', objective: 'Deliver the package downtown' },
  { n: 6, district: 'downtown', name: 'GLASS TOWER JOB', objective: 'Breach the tower server room' },
  { n: 7, district: 'downtown', name: 'ROOFTOP RELAY', objective: 'Hold the rooftop relay' },
  { n: 8, district: 'downtown', name: 'DOWNTOWN DRIFT', objective: 'Lose the BCPD in the neon grid' },
  { n: 9, district: 'market', name: 'MARKET RUN', objective: 'Move the goods through the stalls' },
  { n: 10, district: 'market', name: 'CALLE OCHO HEAT', objective: 'Defend the crew at the market' },
  { n: 11, district: 'market', name: "THE BUTCHER'S LEDGER", objective: 'Recover the ledger' },
  { n: 12, district: 'portside', name: 'DOCKSIDE DEAL', objective: 'Meet the buyer at pier 9' },
  { n: 13, district: 'portside', name: 'CONTAINER MAZE', objective: 'Find the prototype crate' },
  { n: 14, district: 'portside', name: 'HARBOR LIGHTS', objective: 'Escape the dock raid' },
  { n: 15, district: 'starfish', name: 'ISLAND GETAWAY', objective: 'Cross the causeway at speed' },
  { n: 16, district: 'starfish', name: 'LANDFALL', objective: 'Beat the hurricane to the safehouse' },
];

export const CREW = [
  { id: 'jax', name: 'JAX', role: 'DRIVER', perk: 'NOS tune +40% boost', color: '#ff9f1c', initial: 'J' },
  { id: 'mara', name: 'MARA', role: 'HACKER', perk: 'Breach 2x faster', color: '#00e5ff', initial: 'M' },
  { id: 'reyes', name: 'REYES', role: 'GUNNER', perk: 'Steady aim, no sway', color: '#e71d36', initial: 'R' },
];

export const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', mag: 12, reserve: 96, damage: 25, color: '#ffd166' },
  { id: 'smg', name: 'SMG', mag: 32, reserve: 160, damage: 14, color: '#00e5ff' },
  { id: 'shotgun', name: 'SHOTGUN', mag: 6, reserve: 36, damage: 60, color: '#ff9f1c' },
  { id: 'rifle', name: 'RIFLE', mag: 30, reserve: 120, damage: 40, color: '#ff2e88' },
];

export const RADIO = [
  { id: 'neon', name: 'NEON FM 101.1', song: 'Midnight Drive — Vega Sunset' },
  { id: 'wave', name: 'WAVE 98.5', song: 'Salt Air — The Palms' },
  { id: 'calle', name: 'LA CALLE 87.9', song: 'Calle Ocho — Los Reyes' },
  { id: 'storm', name: 'STORM RADIO', song: 'Hurricane Warning — BCPD band' },
];

// The hurricane lands 20 minutes after the story opens; the clock never stops.
export const HURRICANE_TOTAL_SECONDS = 20 * 60;

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function formatMoney(cents) {
  return '$' + Math.floor(cents).toLocaleString('en-US');
}
