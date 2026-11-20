// Neon Bay — golden-hour palettes, one per district, so no two shots share a look.
// Every shot is 17:00–18:00: a saturated gradient sky and wet streets that carry it.

export const GOLDEN_SKY = [
  [0, '#2b1b4d'],
  [0.32, '#7a2d63'],
  [0.55, '#e2543e'],
  [0.74, '#ff9a3d'],
  [0.88, '#ffc46b'],
  [1, '#ffe3a1'],
];

export const PALETTES = {
  beach: {
    name: 'Coral Beach',
    sky: GOLDEN_SKY,
    sun: '#fff3c4',
    sea: '#1d7f8c',
    seaDeep: '#0f4d63',
    sand: '#e8b877',
    road: '#3a3348',
    roadLine: '#ffd76a',
    accent: '#19c8c8',
    accent2: '#ff7a3d',
    haze: 'rgba(255,150,90,0.20)',
  },
  downtown: {
    name: 'Neon Downtown',
    sky: [
      [0, '#1c1440'],
      [0.35, '#5c2470'],
      [0.58, '#c23a6e'],
      [0.78, '#ff7a4d'],
      [1, '#ffb35c'],
    ],
    sun: '#ffe9a8',
    sea: '#17324e',
    seaDeep: '#0d1c33',
    sand: '#8a6a52',
    road: '#2e2a3e',
    roadLine: '#ffe08a',
    accent: '#ff2e88',
    accent2: '#22e0ff',
    haze: 'rgba(255,90,140,0.16)',
  },
  market: {
    name: 'Mercado District',
    sky: [
      [0, '#241536'],
      [0.35, '#6e2a4e'],
      [0.6, '#d0543a'],
      [0.8, '#ff8f3d'],
      [1, '#ffcf7a'],
    ],
    sun: '#ffedbe',
    sea: '#17324e',
    seaDeep: '#0d1c33',
    sand: '#a8763e',
    road: '#33272f',
    roadLine: '#ffc46b',
    accent: '#ffb02e',
    accent2: '#ff4d6d',
    haze: 'rgba(255,170,60,0.18)',
  },
  highway: {
    name: 'Skyline Heights',
    sky: [
      [0, '#141233'],
      [0.3, '#4a2060'],
      [0.55, '#a83a68'],
      [0.75, '#ff6a45'],
      [0.9, '#ffa94d'],
      [1, '#ffd98a'],
    ],
    sun: '#fff0b0',
    sea: '#1a2f4d',
    seaDeep: '#0e1a30',
    sand: '#7a5c48',
    road: '#33304a',
    roadLine: '#ffe08a',
    accent: '#3dd6ff',
    accent2: '#ff5c8a',
    haze: 'rgba(120,90,255,0.15)',
  },
};

// Facade paint colors per district — never a flat grey box: every building
// gets a tinted wall, a window grid and a neon sign from these lists.
export const FACADE_COLORS = {
  beach: ['#e88a5a', '#d96a7c', '#4fa8a0', '#e8b45a', '#7fb069', '#c96a8a'],
  downtown: ['#3d3a6e', '#6e2a5e', '#2a4a6e', '#7a3a5e', '#4a2a6e', '#8a4a3a'],
  market: ['#a85a2e', '#8a3a3a', '#6e5a2e', '#a83a4e', '#7a4a2e', '#c07a3a'],
  highway: ['#2e3a5e', '#4a2e5e', '#3a4a6e', '#5e2e4a', '#2e4a5e', '#6e3a4a'],
};

export const NEON_SIGNS = {
  beach: ['SURF', 'TACO', 'BEACH', 'DIVE', 'CORAL', 'PALM'],
  downtown: ['HOTEL', 'NEON', 'CLUB', 'BAR', '24H', 'CINE'],
  market: ['RAMEN', 'SPICE', 'TEA', 'MEAT', 'FISH', 'FLOWER'],
  highway: ['MOTEL', 'GAS', 'DINER', 'PARK', 'MALL', 'TOWER'],
};

export const NEON_COLORS = ['#ff2e88', '#22e0ff', '#ffb02e', '#7cff5e', '#ff5c5c', '#c95eff'];
