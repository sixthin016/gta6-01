// Neon Bay — shot staging: four composed scenes, one per screenshot.
// Each shot is a fixed, seeded composition (same input → same frame) drawn
// with the same city / vehicle / people / effects helpers the playable game
// uses, then the shared HUD on top with identical anchors. The camera sits
// close and low: the hero car fills the lower third, the density is all in
// the forward view cone, and every building in frame carries a real facade.

import { makeRng, glow, rr, label, shade, rgba, vgrad } from './util.js';
import { PALETTES } from './palette.js';
import { MISSIONS, WEAPONS, RADIOS, CREW } from './missions.js';
import { drawSky, drawSkyline, drawWetRoad, drawSidewalk, drawPalm, drawCrane, drawBillboard } from './city.js';
import { drawHeroCar, drawCruiser, drawTrafficCar, drawHeli, drawTank } from './vehicles.js';
import { drawPedestrian, drawCrewShooter, drawCop, drawSwatRappel, drawStandingCrew } from './people.js';
import { drawTireSmoke, drawDebris, drawShells, drawBlood, drawBulletHoles, drawLaserGrid, drawCrackedGlass, drawFlashbang, drawServerRack } from './effects.js';
import { drawHud } from './hud.js';

export const SHOT_META = [
  { file: '1-beach-chase.jpg', title: 'beach chase', mission: 6, progress: '5/6 DELIVER', money: 5240, stars: 4, speed: 128 },
  { file: '2-market-battle.jpg', title: 'market battle', mission: 7, progress: '5/6 DEFEND', money: 5890, stars: 5, speed: 0 },
  { file: '3-heist.jpg', title: 'interior heist', mission: 15, progress: '6/6 EXTRACT', money: 9600, stars: 5, speed: 0 },
  { file: '4-highway-escape.jpg', title: 'highway escape', mission: 16, progress: '6/6 ESCAPE', money: 12450, stars: 5, speed: 142 },
];

function hudState(shot, mission, progressText, money, stars, speed, healths, opts = {}) {
  return {
    shot,
    mission,
    progressText,
    money,
    respect: opts.respect ?? 64,
    stars,
    speed,
    healths,
    hurricaneLeft: opts.hurricaneLeft ?? 872,
    weapon: opts.weapon || WEAPONS[1],
    radio: opts.radio || RADIOS[0],
    nos: opts.nos ?? 0.7,
    numbered: !!opts.numbered,
    activeCrew: opts.activeCrew ?? -1,
  };
}

// ---- Shot 1: beach chase -------------------------------------------------
function shotBeachChase(ctx, W, H) {
  const P = PALETTES.beach;
  drawSky(ctx, W, H, P, W * 0.74, H * 0.26);
  // ocean band on the left horizon, then sand, then the road
  ctx.fillStyle = vgrad(ctx, 0, H * 0.5, H * 0.6, [[0, P.sea], [1, P.seaDeep]]);
  ctx.fillRect(0, H * 0.5, W * 0.62, H * 0.1);
  ctx.fillStyle = 'rgba(255,220,160,0.5)';
  for (let i = 0; i < 5; i++) ctx.fillRect(W * 0.05 + i * 90, H * 0.53 + (i % 2) * 6, 60, 2);
  ctx.fillStyle = P.sand;
  ctx.fillRect(0, H * 0.6, W, H * 0.05);
  drawSkyline(ctx, W, H * 0.52, 'beach', 11, 10, 40, 120);
  drawWetRoad(ctx, W, H * 0.65, H, P, 0.5);
  drawSidewalk(ctx, W, H * 0.62, H * 0.65, '#a8763e');
  drawPalm(ctx, 70, H * 0.64, 150, 0.14, 5);
  drawPalm(ctx, 1220, H * 0.64, 140, -0.12, 6);
  drawPalm(ctx, 180, H * 0.63, 115, 0.1, 7);

  // Air-1 big in the upper third, searchlight cone through the haze
  glow(ctx, 860, 138, 240, '#ffc46b', 0.4);
  drawHeli(ctx, 860, 138, 380, { phase: 1.2, spotlight: true, spotX: 690, spotY: 560 });
  // extra rotor blur discs so the spin reads at thumbnail size
  ctx.fillStyle = 'rgba(20,16,30,0.14)';
  ctx.beginPath();
  ctx.ellipse(860, 100, 290, 13, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(860, 100, 290, 13, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // traffic ahead in the view cone — big, colorful, close
  drawTrafficCar(ctx, 800, 468, 195, 68, 21, { angle: -0.03 });
  drawTrafficCar(ctx, 1010, 508, 215, 74, 22, { angle: 0.02 });
  drawTrafficCar(ctx, 580, 446, 165, 58, 23, { angle: -0.05 });
  drawTrafficCar(ctx, 1150, 552, 195, 68, 24, { angle: 0.04 });
  // pedestrians close on the sidewalk
  drawPedestrian(ctx, 205, 468, 1.9, 31);
  drawPedestrian(ctx, 258, 472, 1.8, 32, { shirt: '#ff5a7a' });
  drawPedestrian(ctx, 1150, 470, 1.9, 33);
  drawPedestrian(ctx, 1085, 475, 1.7, 34, { shirt: '#3dd6ff' });

  // PIT formation: one cruiser alongside the hero's front quarter, one
  // tight behind, one braking ahead
  drawCruiser(ctx, 320, 545, 290, 100, { phase: 1.2, angle: -0.12 });
  drawCruiser(ctx, 950, 652, 280, 96, { phase: 1.2, angle: -0.3, brakeGlow: true });
  drawCruiser(ctx, 425, 468, 235, 80, { phase: 0.4, angle: -0.08 });

  // hero car, counter-steering ~15 degrees, NOS lit, brake glow on
  glow(ctx, 620, 690, 220, '#ff7a3d', 0.3);
  drawHeroCar(ctx, 620, 610, 380, 135, { angle: -0.26, nos: true, brakeGlow: true });
  drawTireSmoke(ctx, 850, 668, 77, -1);
  drawDebris(ctx, 620, 660, 78, 14);

  // phone in the driver's hand: bright GPS screen, route + "5/6"
  ctx.save();
  ctx.translate(438, 568);
  ctx.rotate(-0.15);
  ctx.fillStyle = '#0e0c18';
  rr(ctx, -52, -82, 104, 164, 12);
  ctx.fill();
  ctx.strokeStyle = '#3a3444';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0f4d63';
  rr(ctx, -45, -74, 90, 112, 8);
  ctx.fill();
  ctx.fillStyle = '#19c8c8';
  ctx.fillRect(-45, -74, 90, 112);
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-34, 28);
  ctx.lineTo(-10, -6);
  ctx.lineTo(10, -38);
  ctx.lineTo(32, -64);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(32, -64, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7cff5e';
  ctx.beginPath();
  ctx.arc(-34, 28, 6, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, '5/6', 0, 62, 'bold 24px Arial, sans-serif', '#7cff5e', 'center', false);
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '10px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GPS • 2.1 km', 0, 76);
  ctx.restore();

  drawHud(ctx, W, H, hudState(1, MISSIONS[5], '5/6 DELIVER', 5240, 4, 128, [92, 78, 86], {
    respect: 64, hurricaneLeft: 872, weapon: WEAPONS[1], radio: RADIOS[0], nos: 0.72, activeCrew: 0,
  }));
}

// ---- Shot 2: market battle ----------------------------------------------
function shotMarketBattle(ctx, W, H) {
  const P = PALETTES.market;
  drawSky(ctx, W, H, P, W * 0.24, H * 0.2);
  drawSkyline(ctx, W, H * 0.42, 'market', 21, 10, 90, 220);
  // market street floor, warm and wet
  ctx.fillStyle = vgrad(ctx, 0, H * 0.42, H, [[0, '#4a2e30'], [0.5, '#33272f'], [1, '#241a22']]);
  ctx.fillRect(0, H * 0.42, W, H * 0.58);
  ctx.fillStyle = 'rgba(255,170,60,0.12)';
  ctx.fillRect(0, H * 0.42, W, H * 0.58);
  // warm light pools on the street so the middle is not a void
  glow(ctx, 300, 470, 150, '#ffb02e', 0.28);
  glow(ctx, 700, 450, 170, '#ff7a3d', 0.24);
  glow(ctx, 1080, 480, 150, '#ffb02e', 0.28);
  // stalls with striped awnings on both sides
  const rng = makeRng(99);
  for (const [sx, sw, col] of [[40, 220, '#ff2e55'], [300, 200, '#ffb02e'], [980, 220, '#22a8c8'], [760, 180, '#7cff5e']]) {
    ctx.fillStyle = '#2a1c22';
    ctx.fillRect(sx, H * 0.42, sw, 130);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(sx - 10, H * 0.42 + 34);
    ctx.lineTo(sx + sw + 10, H * 0.42 + 34);
    ctx.lineTo(sx + sw, H * 0.42 + 62);
    ctx.lineTo(sx, H * 0.42 + 62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 5; i++) ctx.fillRect(sx + 8 + i * (sw / 5), H * 0.42 + 36, sw / 10, 24);
    // goods on the stall
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = rng.pick(['#ff5a7a', '#ffd23e', '#7cff5e', '#ff8a3d']);
      ctx.beginPath();
      ctx.arc(sx + 18 + i * 32, H * 0.42 + 108, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // market crates mid-ground
  for (const [cx, cy] of [[180, 500], [1090, 505]]) {
    ctx.fillStyle = '#6e4a2a';
    ctx.fillRect(cx, cy, 70, 46);
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(cx, cy, 70, 8);
    ctx.fillStyle = '#ff5a7a';
    ctx.beginPath();
    ctx.arc(cx + 16, cy - 4, 8, 0, Math.PI * 2);
    ctx.arc(cx + 38, cy - 6, 9, 0, Math.PI * 2);
    ctx.arc(cx + 58, cy - 4, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  // string lights across the street
  ctx.strokeStyle = 'rgba(20,12,20,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.3);
  ctx.quadraticCurveTo(W * 0.5, H * 0.42, W, H * 0.28);
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const lx = t * W;
    const ly = H * 0.3 + Math.sin(t * Math.PI) * H * 0.08 + (t < 0.5 ? t * 40 : (1 - t) * 40);
    glow(ctx, lx, ly, 10, ['#ffb02e', '#ff5a7a', '#7cff5e'][i % 3], 0.9);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Air-1 with two rappel ropes and SWAT descending
  glow(ctx, 1050, 118, 200, '#ffc46b', 0.35);
  drawHeli(ctx, 1050, 118, 330, { phase: 2.1, spotlight: false });
  drawSwatRappel(ctx, 985, 150, 295, 1.6, 41);
  drawSwatRappel(ctx, 1120, 150, 345, 1.6, 42);

  // five BCPD officers bounding overwatch in the background
  const copSpots = [[700, 405, 1.7], [790, 420, 1.85], [880, 402, 1.65], [960, 425, 1.8], [1180, 410, 1.75]];
  copSpots.forEach(([cx, cy, s], i) => drawCop(ctx, cx, cy, s, { flash: i === 1 }));

  // midground: the player crouched with Mara and Reyes firing
  drawCrewShooter(ctx, 470, 512, 2.3, '#ff5a2e', { flash: true });
  drawCrewShooter(ctx, 600, 518, 2.25, '#22e0ff', { flash: true });
  drawCrewShooter(ctx, 350, 516, 2.25, '#7cff5e', { flash: false });
  drawShells(ctx, [
    [560, 452, 0.7], [590, 436, 1.4], [545, 424, 2.2],
    [680, 450, 0.9], [655, 430, 1.8], [700, 436, 2.6],
  ]);

  // foreground: wooden barrier with 7 bullet holes + 2 blood splashes,
  // and an overturned market cart
  ctx.fillStyle = '#6e4a2a';
  ctx.fillRect(100, 585, 480, 105);
  ctx.fillStyle = '#7a5230';
  for (let i = 0; i < 5; i++) ctx.fillRect(100, 592 + i * 20, 480, 3);
  ctx.fillStyle = '#4a3018';
  ctx.fillRect(100, 585, 480, 10);
  drawBulletHoles(ctx, 100, 592, 480, 7, 55);
  drawBlood(ctx, 210, 640, 56, 1.4);
  drawBlood(ctx, 470, 655, 57, 1.2);
  // overturned cart, wheels up
  ctx.save();
  ctx.translate(870, 632);
  ctx.scale(1.3, 1.3);
  ctx.rotate(0.5);
  ctx.fillStyle = '#8a3a2a';
  ctx.fillRect(-70, -18, 140, 36);
  ctx.fillStyle = '#a8763e';
  ctx.fillRect(-70, -18, 140, 10);
  ctx.fillStyle = '#1c1a22';
  ctx.beginPath();
  ctx.arc(-50, -26, 12, 0, Math.PI * 2);
  ctx.arc(50, -26, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5a7a';
  ctx.beginPath();
  ctx.arc(-20, -4, 9, 0, Math.PI * 2);
  ctx.arc(15, 0, 8, 0, Math.PI * 2);
  ctx.arc(45, -6, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // smartwatch chip: flashing 5 stars + crew health, two rows, no overlap
  ctx.fillStyle = 'rgba(10,8,20,0.85)';
  rr(ctx, W / 2 - 130, H - 184, 260, 76, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  label(ctx, 'WATCH', W / 2 - 118, H - 160, 'bold 11px Arial, sans-serif', '#c8c8d8', 'left', false);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    const sx = W / 2 - 48 + i * 24;
    const sy = H - 144;
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rad = k % 2 === 0 ? 9 : 4;
      const px = sx + Math.cos(a) * rad;
      const py = sy + Math.sin(a) * rad;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  label(ctx, 'CREW 88 • 64 • 79', W / 2, H - 120, 'bold 12px Arial, sans-serif', '#7cff5e', 'center', false);

  drawHud(ctx, W, H, hudState(2, MISSIONS[6], '5/6 DEFEND', 5890, 5, 0, [88, 64, 79], {
    respect: 71, hurricaneLeft: 708, weapon: WEAPONS[3], radio: RADIOS[1], nos: 0.4, numbered: true, activeCrew: 1,
  }));
}

// ---- Shot 3: interior heist ------------------------------------------------
function shotHeist(ctx, W, H) {
  // interior: warm dark walls, tiled floor, ceiling strip
  ctx.fillStyle = vgrad(ctx, 0, 0, H, [[0, '#1c1426'], [0.55, '#2e1c30'], [1, '#171020']]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#241a2a';
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = 'rgba(255,190,110,0.25)';
  ctx.fillRect(0, 46, W, 3);
  // warm ceiling light bars
  glow(ctx, 400, 46, 130, '#ffcf7a', 0.5);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(320, 40, 160, 8);
  glow(ctx, 900, 46, 130, '#ffcf7a', 0.5);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(820, 40, 160, 8);
  // red alarm light, top-left
  glow(ctx, 90, 90, 60, '#ff283c', 0.7);
  ctx.fillStyle = '#ff283c';
  ctx.beginPath();
  ctx.arc(90, 90, 10, 0, Math.PI * 2);
  ctx.fill();
  // floor tiles with a warm reflection wash
  ctx.fillStyle = '#2a2030';
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  ctx.fillStyle = 'rgba(255,150,70,0.10)';
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 110) {
    ctx.beginPath();
    ctx.moveTo(x, H * 0.72);
    ctx.lineTo(x - 60, H);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, H * 0.84);
  ctx.lineTo(W, H * 0.84);
  ctx.stroke();

  // two cracked spiderweb windows + flashbang glare (kept clear of the garage door)
  drawCrackedGlass(ctx, 170, 190, 55, 61);
  ctx.strokeStyle = 'rgba(200,220,255,0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(108, 128, 124, 124);
  drawCrackedGlass(ctx, 790, 160, 48, 62);
  ctx.strokeStyle = 'rgba(200,220,255,0.6)';
  ctx.strokeRect(734, 104, 112, 112);
  drawFlashbang(ctx, 790, 160, W, H);

  // server racks left and right; the left one holds the PROTOTYPE drive
  drawServerRack(ctx, 50, 290, 190, 300, 71, true);
  drawServerRack(ctx, 1040, 290, 190, 300, 72, false);
  label(ctx, 'SERVER ROOM', 145, 280, 'bold 12px Arial, sans-serif', '#9be8ff', 'center', false);
  glow(ctx, 145, 330, 60, '#ff283c', 0.5);
  label(ctx, 'PROTOTYPE', 145, 330, 'bold 13px Arial, sans-serif', '#ff5a6a', 'center', false);

  // laser grid crossing the room: 8 beams
  drawLaserGrid(ctx, 280, 260, 1000, 500, 8, 1.1);

  // garage door, open: sunset and the getaway car outside
  ctx.fillStyle = '#0e0a18';
  ctx.fillRect(860, 100, 340, 380);
  ctx.fillStyle = vgrad(ctx, 0, 110, 470, [[0, '#7a2d63'], [0.6, '#ff9a3d'], [1, '#ffc46b']]);
  ctx.fillRect(872, 112, 316, 356);
  drawHeroCar(ctx, 1030, 420, 240, 84, { angle: -0.06, brakeGlow: true });
  ctx.strokeStyle = '#3a3444';
  ctx.lineWidth = 6;
  ctx.strokeRect(860, 100, 340, 380);
  label(ctx, 'GARAGE', 1030, 92, 'bold 12px Arial, sans-serif', '#ffd76a', 'center', false);

  // table + laptop running the hacking minigame mid-progress
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(400, 520, 480, 18);
  ctx.fillStyle = '#241a14';
  ctx.fillRect(420, 538, 14, 60);
  ctx.fillRect(846, 538, 14, 60);
  glow(ctx, 640, 540, 200, '#22e0ff', 0.18);
  // laptop screen IS the hacking UI: 3 of 4 nodes, timer 0:47
  ctx.fillStyle = '#0a0e18';
  rr(ctx, 450, 300, 380, 210, 8);
  ctx.fill();
  ctx.strokeStyle = '#22e0ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  label(ctx, 'BREACH // VAULT-7', 640, 332, 'bold 16px Arial, sans-serif', '#22e0ff', 'center', false);
  const nodes = [[530, 382], [610, 418], [690, 382], [770, 418]];
  nodes.forEach(([nx, ny], i) => {
    const done = i < 3;
    ctx.fillStyle = done ? '#7cff5e' : '#ff283c';
    ctx.beginPath();
    ctx.arc(nx, ny, 22, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, String(i + 1), nx, ny + 6, 'bold 16px Arial, sans-serif', '#0a0e18', 'center', false);
    if (i < 3) {
      ctx.strokeStyle = '#7cff5e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nx + 22, ny);
      ctx.lineTo(nodes[i + 1][0] - 22, nodes[i + 1][1]);
      ctx.stroke();
    }
  });
  ctx.fillStyle = '#2e2a3e';
  rr(ctx, 490, 465, 300, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#22e0ff';
  rr(ctx, 490, 465, 225, 10, 5);
  ctx.fill();
  label(ctx, '3/4 NODES   0:47', 640, 500, 'bold 14px Arial, sans-serif', '#ffd76a', 'center', false);

  // crew at their stations
  drawStandingCrew(ctx, 470, 580, 2.1, '#22e0ff', 'MARA');
  drawStandingCrew(ctx, 850, 580, 2.1, '#ff7a3d', 'JAX');
  drawStandingCrew(ctx, 260, 580, 2.1, '#7cff5e', 'REYES');

  drawHud(ctx, W, H, hudState(3, MISSIONS[14], '6/6 EXTRACT', 9600, 5, 0, [95, 82, 90], {
    respect: 88, hurricaneLeft: 372, weapon: WEAPONS[1], radio: RADIOS[2], nos: 0.85, activeCrew: 1,
  }));
}

// ---- Shot 4: highway escape ----------------------------------------------
function shotHighway(ctx, W, H) {
  const P = PALETTES.highway;
  drawSky(ctx, W, H, P, W * 0.3, H * 0.22);
  drawSkyline(ctx, W, H * 0.38, 'highway', 31, 14, 60, 150);
  drawCrane(ctx, 170, H * 0.38, 210);
  drawBillboard(ctx, 1020, 92, 210, 92, 'NEON BAY', '#ff2e88', '#3dd6ff');

  // upper deck with the blockade
  ctx.fillStyle = '#3a3444';
  ctx.fillRect(0, H * 0.42, W, 26);
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(0, H * 0.42 + 26, W, 96);
  ctx.fillStyle = 'rgba(255,150,70,0.18)';
  ctx.fillRect(0, H * 0.42 + 26, W, 96);
  // deck pillars
  ctx.fillStyle = '#241f30';
  for (const px of [120, 640, 1160]) ctx.fillRect(px - 14, H * 0.42 + 26, 28, 96);
  // spike strip
  ctx.fillStyle = '#c8ccd8';
  for (let i = 0; i < 9; i++) {
    const sx = 560 + i * 18;
    ctx.beginPath();
    ctx.moveTo(sx, H * 0.42 + 96);
    ctx.lineTo(sx + 9, H * 0.42 + 78);
    ctx.lineTo(sx + 18, H * 0.42 + 96);
    ctx.closePath();
    ctx.fill();
  }
  // 4 cruisers + the Rhino tank, fully across the upper deck
  drawCruiser(ctx, 300, H * 0.42 + 62, 175, 62, { phase: 0.8, angle: -0.04 });
  drawCruiser(ctx, 480, H * 0.42 + 66, 175, 62, { phase: 1.9, angle: 0.03 });
  drawCruiser(ctx, 820, H * 0.42 + 66, 175, 62, { phase: 0.8, angle: -0.03 });
  drawCruiser(ctx, 1010, H * 0.42 + 62, 175, 62, { phase: 1.9, angle: 0.04 });
  drawTank(ctx, 645, H * 0.42 + 58, 280, 108);

  // lower deck: 3 lanes of wet road
  drawWetRoad(ctx, W, H * 0.62, H, P, 0.5);
  // 6 civilian cars swerving out of the way
  drawTrafficCar(ctx, 300, 500, 150, 52, 51, { angle: 0.22 });
  drawTrafficCar(ctx, 450, 478, 128, 46, 52, { angle: -0.18 });
  drawTrafficCar(ctx, 760, 505, 160, 56, 53, { angle: 0.2 });
  drawTrafficCar(ctx, 920, 490, 140, 48, 54, { angle: -0.25 });
  drawTrafficCar(ctx, 1060, 560, 170, 58, 55, { angle: 0.12 });
  drawTrafficCar(ctx, 170, 560, 140, 48, 56, { angle: -0.1 });
  // hero car on the lower deck, NOS lit — kept left of the speed cluster
  // so its wheels stay visible above the HUD
  drawHeroCar(ctx, 500, 596, 330, 118, { angle: -0.12, nos: true, brakeGlow: true });
  drawTireSmoke(ctx, 690, 668, 79, -1);
  drawDebris(ctx, 500, 640, 80, 12);

  // Bell 412 center frame, against the bright sky: rotor blur, open door + gunner
  glow(ctx, 640, 118, 230, '#ffc46b', 0.55);
  drawHeli(ctx, 640, 118, 360, { phase: 1.6, gunner: true });
  ctx.fillStyle = 'rgba(20,16,30,0.15)';
  ctx.beginPath();
  ctx.ellipse(640, 82, 270, 13, 0.05, 0, Math.PI * 2);
  ctx.fill();
  // cockpit panel: escape distance
  ctx.fillStyle = 'rgba(10,8,20,0.8)';
  rr(ctx, 640 - 78, 212, 156, 30, 6);
  ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  label(ctx, 'ESCAPE  2.3 km', 640, 232, 'bold 13px Arial, sans-serif', '#ffd76a', 'center', false);

  drawHud(ctx, W, H, hudState(4, MISSIONS[15], '6/6 ESCAPE', 12450, 5, 142, [90, 74, 88], {
    respect: 96, hurricaneLeft: 167, weapon: WEAPONS[3], radio: RADIOS[3], nos: 0.42, activeCrew: 0,
  }));
}

export function renderShot(ctx, n, W, H) {
  if (n === 1) shotBeachChase(ctx, W, H);
  else if (n === 2) shotMarketBattle(ctx, W, H);
  else if (n === 3) shotHeist(ctx, W, H);
  else if (n === 4) shotHighway(ctx, W, H);
  else throw new Error('unknown shot ' + n);
}
