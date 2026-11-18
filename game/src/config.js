// Neon Bay — shared tuning constants for the whole open-world game.
// Every system reads these numbers from one place so the city, the cars,
// the police and the missions all agree on the same world.
export const STEP = 1 / 60;
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 96;
export const ROAD_SPACING = 400;
export const SIDEWALK = 26;
export const SAVE_KEY = 'neonbay-save-v1';
export const MONEY_KEY = 'neonbay-best-money-v1';

// Roads: vertical centre lines and horizontal centre lines of the street grid.
export const ROADS_V = [200, 600, 1000, 1400, 1800, 2200, 2600];
export const ROADS_H = [200, 600, 1000, 1400, 1800, 2200];

// The beach: sand starts here, open water starts here. Cars and feet stop at the sand.
export const SAND_X = 2760;
export const WATER_X = 2920;

// Player on foot.
export const WALK_SPEED = 170;
export const RUN_SPEED = 290;
export const PLAYER_RADIUS = 14;
export const PLAYER_MAX_HP = 100;

// Cars.
export const CAR_W = 34;
export const CAR_LEN = 62;
export const CAR_ACCEL = 460;
export const CAR_BRAKE = 700;
export const CAR_MAX_SPEED = 430;
export const CAR_MAX_REVERSE = 150;
export const CAR_TURN = 2.6;
export const TRAFFIC_SPEED = 130;
export const POLICE_SPEED = 470;

// Combat.
export const PISTOL_AMMO_START = 30;
export const PISTOL_RANGE = 520;
export const PISTOL_DAMAGE = 34;
export const PUNCH_RANGE = 46;
export const PUNCH_DAMAGE = 20;

// Wanted.
export const WANTED_MAX = 5;
export const WANTED_DECAY_SECONDS = 7;
export const CRIME_QUIET_SECONDS = 9;

// The clock on the HUD starts here and ticks while you play.
export const CLOCK_START_MINUTES = 10 * 60 + 5;

// Colours of the sun-soaked city. Nothing here is borrowed from any other game.
export const PALETTE = {
  grass: '#7ec850',
  grassDark: '#6db544',
  road: '#3a3f4a',
  roadLine: '#f5d76e',
  sidewalk: '#c9c2b4',
  sand: '#f2dd9e',
  water: '#2fa8d8',
  waterDeep: '#1d7fb8',
  park: '#5da83f',
  buildingRoofs: ['#e2574c', '#f2a541', '#4c9de0', '#9b59d0', '#2ec4b6', '#f2708a', '#8bc34a', '#ff8c42'],
  carColors: ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c'],
  policeCar: '#1c2733',
  copUniform: '#22384f',
};

export const MISSION_REWARDS = [150, 300, 250, 400, 600];
