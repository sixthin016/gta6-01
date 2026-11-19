// Neon Bay — tuning constants. One job: every number the 3D game balances on.
export const CFG = {
  seedDefault: 1,
  worldHalf: 240,            // city spans -240..240 on x and z
  block: 48,                // street grid spacing
  roadHalf: 5,              // half width of a road
  beachX: 190,              // east of this is sand, then water
  waterX: 232,
  walkSpeed: 9,
  runSpeed: 14,
  carAccel: 26,
  carBrake: 42,
  carMaxSpeed: 46,
  carReverseMax: 12,
  carTurn: 2.1,
  trafficCount: 26,
  pedCount: 30,
  policeCount: 4,
  wantedDecaySeconds: 14,   // wanted drops one star after this long unseen
  bustedSeconds: 6,         // police touching you at 3+ stars busts you after this
  saveKey: 'neonbay-save-v2',
  colors: {
    sky: 0x87bfe8, sun: 0xfff2cc, ground: 0x3f7a4a, road: 0x2b2f36,
    sand: 0xe8d29a, water: 0x1e7fb8, sidewalk: 0x9aa0a8,
  },
  // Car paint palette (original, no licensed brands).
  paints: [0xd23b3b, 0x2b6fd6, 0xe8b93a, 0x37b268, 0x8a4fd0, 0xe86a2a, 0xdddddd, 0x222831],
};

// Named places the missions and the HUD point at. Coordinates are world units.
export const PLACES = {
  garage:   { name: "Rook's Garage", x: -96, z: -96 },
  pier:     { name: 'Neon Pier', x: 200, z: 48 },
  marina:   { name: 'Marina', x: 200, z: -96 },
  store:    { name: 'Sunset Corner Store', x: -48, z: 48 },
  bank:     { name: 'Bay Trust Bank', x: 48, z: -48 },
  hideout:  { name: 'Hideout', x: -144, z: 144 },
  lighthouse:{ name: 'Lighthouse Point', x: 200, z: 144 },
  plaza:    { name: 'Palm Plaza', x: 0, z: 0 },
  diner:    { name: 'Neon Diner', x: -48, z: -144 },
  stadium:  { name: 'Bay Stadium', x: 96, z: 144 },
};
