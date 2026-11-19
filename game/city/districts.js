// Neon Bay — five named districts. Each has a bounds box (for the HUD
// badge + the district-tinted minimap), a tint, and a flavor line.
// Police department: Bay City PD ("BCPD") — Neon Bay's own force.
export const POLICE_DEPT = 'BCPD';

export const DISTRICTS = [
  { name: 'Downtown', x0: -200, z0: -200, x1: -40, z1: -40, color: '#e8a33d', tint: 'rgba(232,163,61,0.20)', blurb: 'Glass towers and neon canyons.' },
  { name: 'Old Port', x0: -200, z0: -40, x1: -40, z1: 120, color: '#4db2e8', tint: 'rgba(77,178,232,0.20)', blurb: 'Cranes, containers, dock deals.' },
  { name: 'Palm Row', x0: -40, z0: -200, x1: 120, z1: -40, color: '#7ed957', tint: 'rgba(126,217,87,0.20)', blurb: 'Palm-lined villas and cafés.' },
  { name: 'The Strip', x0: -40, z0: -40, x1: 120, z1: 120, color: '#ff4fd8', tint: 'rgba(255,79,216,0.22)', blurb: 'Neon, clubs, all-night money.' },
  { name: 'Sunset Beach', x0: 120, z0: -200, x1: 200, z1: 200, color: '#ffd23d', tint: 'rgba(255,210,61,0.20)', blurb: 'Sand, surf, and the open sea.' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[4];
}

// Fixed places the sim and missions share (world coords, y = 0).
export const PLACES = {
  garage: { name: "Rook's Garage", x: -8, z: 96 },
  shops: [
    { name: 'Sunset Corner Store', x: 56, z: -8 },
    { name: 'Bay Mart', x: -104, z: 56 },
  ],
  safehouses: [
    { name: 'Hideout', x: -136, z: -104 },
    { name: 'Palm Villa', x: 88, z: -136 },
  ],
  start: { x: 0, z: 24 },
  docks: { name: 'Old Port Docks', x: -160, z: 80 },
  tower: { name: 'Radio Tower', x: 150, z: -150 },
  levee: { name: 'Levee Gate', x: 170, z: 40 },
  power: { name: 'Power Station', x: -160, z: -160 },
};
