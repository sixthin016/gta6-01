// Neon Bay — Afterglow: every tunable number in one place.
// Golden hour is locked at 17:00-18:00 for every staged shot; each shot runs its
// own warm/cool colour script so the four thumbnails read as four places, not
// one scene photographed four times. Palette lock (all shots): shadows #1A142E,
// midtones #C89B5E, highlights #FFF3C4, accent #E84D2F.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const BEST_KEY = 'neonbay-afterglow-best';
export const SAVE_KEY = 'neonbay-afterglow-save';
export const GOLDEN_HOUR = '17:42';

// Per-shot colour scripts (warm/cool split) + camera grammar. The horizon is the
// vanishing-point height as a fraction of the frame: every shot uses a different
// one so the four thumbnails never share a perspective.
export const SHOT_SCRIPTS = {
  beach: {
    name: 'beach-chase',
    skyTop: '#F6B85A', skyMid: '#F08A4B', skyLow: '#E85D3D',
    sun: '#FFF3C4', haze: '#F2A65E', sea: '#1F4E5F', sand: '#D9A45B',
    road: '#3A3345', accent: '#E84D2F', accent2: '#00D5E8', rim: '#FFD89A',
    horizon: 0.30, camera: 'chase-low', district: 'Solano Beach',
    mission: { step: '5/6', label: 'DELIVER', money: 5240, stars: 4, speed: 128 },
  },
  shootout: {
    name: 'market-shootout',
    skyTop: '#234A6B', skyMid: '#3D6A8C', skyLow: '#FF8A2A',
    sun: '#FFD9A0', haze: '#7FA6B8', sea: '#1F4E5F', sand: '#C89B5E',
    road: '#2E2A33', accent: '#FF8A2A', accent2: '#7FE7FF', rim: '#FFD89A',
    horizon: 0.55, camera: 'street-vertical', district: 'Mercado Viejo',
    mission: { step: '5/6', label: 'DEFEND', money: 5890, stars: 5, speed: 0 },
  },
  heist: {
    name: 'vault-heist',
    skyTop: '#140A24', skyMid: '#241040', skyLow: '#B33CFF',
    sun: '#E8B4FF', haze: '#6A3D99', sea: '#12081F', sand: '#8A6AB8',
    road: '#1A142E', accent: '#B33CFF', accent2: '#31D7FF', rim: '#7FE7FF',
    horizon: 0.50, camera: 'interior-symmetric', district: 'Port Solano Vault',
    mission: { step: '6/6', label: 'EXTRACT', money: 9600, stars: 5, speed: 0 },
  },
  toll: {
    name: 'toll-escape',
    skyTop: '#FF9E3D', skyMid: '#E86A2A', skyLow: '#5A2A4A',
    sun: '#FFF3C4', haze: '#C97A4A', sea: '#1F4E5F', sand: '#C89B5E',
    road: '#332E3D', accent: '#FF9E3D', accent2: '#FFD700', rim: '#FFD89A',
    horizon: 0.20, camera: 'wide-low', district: 'Bay Bridge Toll',
    mission: { step: '6/6', label: 'ESCAPE', money: 12450, stars: 5, speed: 141 },
  },
};

// The five districts of Neon Bay, each with its own palette accent.
export const DISTRICTS = [
  { name: 'Solano Beach', accent: '#00D5E8', note: 'teal sea, pale sand, palms' },
  { name: 'Downtown Neon', accent: '#FF2E88', note: 'neon towers, wet asphalt' },
  { name: 'Mercado Viejo', accent: '#FF8A2A', note: 'warm market stalls, awnings' },
  { name: 'Port Solano', accent: '#B33CFF', note: 'cranes, containers, vault' },
  { name: 'Bay Bridge', accent: '#FF9E3D', note: 'toll decks, skyline, tank roadblock' },
];

// Sixteen story missions. The staged shots show missions 5 and 6 mid-progress;
// the outline-proof mapping in the README ties each shot to one mission step.
export const MISSIONS = [
  { id: 1, name: 'First Light', district: 'Solano Beach', goal: 'Meet Macer at the pier' },
  { id: 2, name: 'Hot Wheels', district: 'Downtown Neon', goal: 'Steal the Comet GT' },
  { id: 3, name: 'Pay the Toll', district: 'Bay Bridge', goal: 'Lose a 2-star tail' },
  { id: 4, name: 'Market Run', district: 'Mercado Viejo', goal: 'Collect the drop, no alarms' },
  { id: 5, name: 'Beach Delivery', district: 'Solano Beach', goal: 'Deliver the package, 5/6 stops' },
  { id: 6, name: 'Last Stand', district: 'Mercado Viejo', goal: 'Defend the crew, 5/6 waves' },
  { id: 7, name: 'Vault Job', district: 'Port Solano', goal: 'Hack the prototype drive' },
  { id: 8, name: 'Bridge Burner', district: 'Bay Bridge', goal: 'Escape the toll roadblock' },
  { id: 9, name: 'Neon Nights', district: 'Downtown Neon', goal: 'Win the midnight race' },
  { id: 10, name: 'Storm Warning', district: 'Solano Beach', goal: 'Outrun the hurricane wall' },
  { id: 11, name: 'Crew Up', district: 'Mercado Viejo', goal: 'Recruit Kayla the driver' },
  { id: 12, name: 'Silent Alarm', district: 'Port Solano', goal: 'Cut the vault power' },
  { id: 13, name: 'High Tide', district: 'Bay Bridge', goal: 'Jump the raised deck' },
  { id: 14, name: 'Kingpin', district: 'Downtown Neon', goal: 'Take the penthouse' },
  { id: 15, name: 'Eye of the Storm', district: 'Solano Beach', goal: 'Hold the pier in the storm' },
  { id: 16, name: 'Afterglow', district: 'Bay Bridge', goal: 'One last escape at dawn' },
];

// The crew: portraits with health bars ride the HUD in every staged shot.
export const CREW = [
  { name: 'MACER', role: 'Hacker', perk: 'Doors open 40% faster', hp: 78, color: '#31D7FF' },
  { name: 'KAYLA', role: 'Driver', perk: 'NOS lasts twice as long', hp: 92, color: '#FF8A2A' },
  { name: 'RICO', role: 'Gunner', perk: 'Ammo never runs dry in cars', hp: 100, color: '#E84D2F' },
];

export const WEAPONS = [
  { name: 'Pistol', ammo: '12/48', color: '#C9C9D1' },
  { name: 'SMG', ammo: '32/96', color: '#FFD700' },
  { name: 'Shotgun', ammo: '6/24', color: '#FF8A2A' },
  { name: 'Rifle', ammo: '24/120', color: '#31D7FF' },
];

export const RADIO = ['NEON FM 88.1', 'SOLANO SOUL 92.4', 'VICEROY 101.7', 'STORM WARNING 107.9'];
export const HURRICANE_MINUTES = 20;
export const WANTED_MAX = 5;

// Traffic paint: saturated colours only. A black-block car is never spawned:
// at thumbnail scale a dark box reads as a missing texture.
export const CAR_PAINTS = ['#E84D2F', '#FF9E3D', '#00D5E8', '#FFD700', '#FF2E88', '#31D7FF', '#7CFF6B', '#FFFFFF', '#B33CFF', '#FF8A2A'];
export const PED_SHIRTS = ['#FFD700', '#31D7FF', '#FF2E88', '#7CFF6B', '#FFFFFF', '#FF8A2A', '#B33CFF', '#00D5E8'];
export const POLICE_UNITS = ['UNIT 7 — VCPD', 'UNIT 12 — VCPD', 'UNIT 21 — VCPD', 'AIR 1 — HELI', 'SWAT 4 — VCPD'];
