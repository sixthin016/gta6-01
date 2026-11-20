// Neon Bay — the four staged screenshot scenes. One job: compose each shot
// exactly as specified (golden hour, dense foreground, full HUD at identical
// anchors) and draw it once, deterministically, for the capture script.
import {
  CANVAS_W, CANVAS_H, HORIZON_Y, MISSIONS, CREW, WEAPONS, RADIO,
} from './config.js';
import { mulberry32, range, rangeInt, pick } from './rng.js';
import {
  drawGoldenSky, drawRoad, drawCarRear, drawPerson, drawHelicopter,
  drawSmokePuff, drawDebris, drawMuzzleFlash, drawCasing, roundRect,
  glowText, shade,
} from './draw.js';
import { buildStreet, drawStreet, drawSkyline } from './world.js';
import { drawHUD } from './hud.js';

function baseHud(over) {
  return {
    mission: MISSIONS[4], objective: 'DELIVER THE PACKAGE', progress: '5/6 DELIVER',
    cash: 5240, respect: 42, stars: 4, speedKmh: 128,
    weapon: WEAPONS[1], ammo: 32, reserve: 160, radio: RADIO[0],
    crew: CREW.map((c, i) => ({ ...c, hp: [100, 88, 94][i] })),
    districtName: 'NEON BAY', currentShot: 1, hurricaneSeconds: 1122,
    shotLabel: '', ...over,
  };
}

// ---------------------------------------------------------------- shot 1
function shotBeachChase(ctx) {
  const rng = mulberry32(101);
  drawGoldenSky(ctx, 980, 235);
  // Ocean band on the left, sun glitter on the water.
  const sea = ctx.createLinearGradient(0, 235, 0, 305);
  sea.addColorStop(0, '#ff9d5c');
  sea.addColorStop(0.5, '#e76f88');
  sea.addColorStop(1, '#2ec4b6');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.moveTo(0, 252);
  ctx.lineTo(520, 268);
  ctx.lineTo(500, 305);
  ctx.lineTo(0, 305);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 243, 196, 0.7)';
  for (let i = 0; i < 8; i++) {
    const wx = 60 + i * 46;
    ctx.fillRect(wx, 272 + (i % 3) * 8, 34, 3);
  }
  // Sand strip along the left road edge.
  const sand = ctx.createLinearGradient(0, 300, 0, 720);
  sand.addColorStop(0, '#e8c98f');
  sand.addColorStop(1, '#d9a86c');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, 305);
  ctx.lineTo(520, 305);
  ctx.lineTo(180, 720);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();
  // Boardwalk hotels on the right only; the left is open beach.
  const street = buildStreet('beach', 101);
  const rightOnly = { district: street.district, buildings: street.buildings.filter((b) => b.side === 'right') };
  drawStreet(ctx, rightOnly);
  drawRoad(ctx, { centerX: 640 });
  // Beach pedestrians close on the left sidewalk.
  const shirts = ['#ff9f1c', '#2ec4b6', '#ff70a6', '#ffd166', '#7bff9e', '#ff5b5b'];
  for (let i = 0; i < 6; i++) {
    drawPerson(ctx, 90 + i * 62, 560 + (i % 2) * 60, 1.5 + (i % 2) * 0.3, {
      shirt: shirts[i], pose: 'walk',
    });
  }
  // Traffic ahead, colourful, in the view cone.
  drawCarRear(ctx, 560, 380, 84, 40, { color: '#2ec4b6' });
  drawCarRear(ctx, 740, 360, 76, 36, { color: '#ffd166', angle: 0.06 });
  drawCarRear(ctx, 655, 330, 56, 27, { color: '#ff70a6' });
  // Three BCPD cruisers in PIT formation around the hero.
  drawCarRear(ctx, 468, 545, 150, 68, { police: true, angle: 0.22 });
  drawCarRear(ctx, 812, 535, 150, 68, { police: true, angle: -0.2 });
  drawCarRear(ctx, 752, 415, 96, 44, { police: true, angle: -0.08 });
  // Hero: magenta, counter-steered ~15 degrees, NOS burning, brake glow.
  drawCarRear(ctx, 640, 600, 215, 96, { color: '#ff2e88', angle: -0.26, nos: true, brake: true, label: 'NEON-1' });
  // Three layers of tyre smoke behind the hero.
  const smokeSpots = [[560, 665, 26], [600, 678, 34], [648, 690, 30], [700, 682, 28], [740, 668, 22], [585, 655, 18]];
  for (const [sx, sy, sr] of smokeSpots) drawSmokePuff(ctx, sx, sy, sr, 0.85);
  // Twelve-plus debris pieces with motion blur around the hero.
  for (let i = 0; i < 14; i++) {
    drawDebris(ctx, range(rng, 430, 850), range(rng, 560, 700), range(rng, -0.6, 0.6), range(rng, 8, 26), pick(rng, ['#ffd166', '#c0c0c8', '#ff5b5b', '#ffffff']));
  }
  // Air-1 big in the top third, four rotor blur-discs, spotlight on the road.
  drawHelicopter(ctx, 900, 105, 1.35, { spotlight: true });
  // Phone in the driver's hand: GPS route + "5/6".
  ctx.save();
  ctx.translate(536, 512);
  ctx.rotate(-0.28);
  ctx.fillStyle = '#0d0d0d';
  roundRect(ctx, -30, -52, 60, 104, 10);
  ctx.fill();
  ctx.strokeStyle = '#2ec4b6';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#0f2a3a';
  ctx.fillRect(-25, -47, 50, 94);
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-18, 38);
  ctx.lineTo(-5, 10);
  ctx.lineTo(10, -8);
  ctx.lineTo(18, -36);
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(18, -36, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('5/6', 0, 74);
  ctx.restore();
  // Driver's hand gripping the phone.
  ctx.fillStyle = '#c68642';
  ctx.beginPath();
  ctx.arc(556, 560, 10, 0, Math.PI * 2);
  ctx.fill();
  // Beach props on the sand: umbrellas and palms.
  for (const [ux, uy, uc] of [[150, 470, '#ff2e88'], [300, 610, '#2ec4b6'], [90, 650, '#ffd166']]) {
    ctx.strokeStyle = '#7b4a2d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(ux, uy - 42);
    ctx.stroke();
    ctx.fillStyle = uc;
    ctx.beginPath();
    ctx.moveTo(ux - 34, uy - 40);
    ctx.quadraticCurveTo(ux, uy - 72, ux + 34, uy - 40);
    ctx.closePath();
    ctx.fill();
  }
  for (const [px, py] of [[60, 430], [250, 400]]) {
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(px, py + 40);
    ctx.quadraticCurveTo(px + 10, py, px + 4, py - 44);
    ctx.stroke();
    ctx.strokeStyle = '#2e8b57';
    ctx.lineWidth = 4;
    for (let f = 0; f < 5; f++) {
      const a = -Math.PI / 2 + (f - 2) * 0.5;
      ctx.beginPath();
      ctx.moveTo(px + 4, py - 44);
      ctx.quadraticCurveTo(px + 4 + Math.cos(a) * 26, py - 44 + Math.sin(a) * 26 - 8, px + 4 + Math.cos(a) * 40, py - 44 + Math.sin(a) * 40 + 10);
      ctx.stroke();
    }
  }
  drawHUD(ctx, baseHud({
    mission: MISSIONS[4], objective: 'DELIVER THE PACKAGE', progress: '5/6 DELIVER',
    cash: 5240, respect: 42, stars: 4, speedKmh: 128,
    weapon: WEAPONS[1], ammo: 32, reserve: 160, radio: RADIO[0],
    crew: CREW.map((c, i) => ({ ...c, hp: [100, 88, 94][i] })),
    currentShot: 1, hurricaneSeconds: 1122,
    shotLabel: 'SHOT 1 — BEACH CHASE • VICE BEACH',
  }));
}

// ---------------------------------------------------------------- shot 2
function shotMarketBattle(ctx) {
  const rng = mulberry32(202);
  drawGoldenSky(ctx, 320, 230);
  const street = buildStreet('market', 202);
  drawStreet(ctx, street);
  drawRoad(ctx, { centerX: 640 });
  // Market stalls with striped awnings on both sidewalks.
  for (const [ax, ac] of [[120, '#e71d36'], [980, '#ff9f1c']]) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(ax, 430, 180, 110);
    for (let s = 0; s < 6; s++) {
      ctx.fillStyle = s % 2 === 0 ? ac : '#fff3e0';
      ctx.fillRect(ax + s * 30, 430, 30, 22);
    }
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(ax < 500 ? 'FRUTAS' : 'TACOS', ax + 90, 478);
    // Produce crates.
    ctx.fillStyle = '#7bff9e';
    ctx.fillRect(ax + 16, 500, 40, 18);
    ctx.fillStyle = '#ff5b5b';
    ctx.fillRect(ax + 66, 500, 40, 18);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(ax + 116, 500, 40, 18);
  }
  // Air-1 above with two rappel ropes and SWAT descending.
  drawHelicopter(ctx, 640, 100, 1.15, { spotlight: false });
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(600, 122);
  ctx.lineTo(600, 300);
  ctx.moveTo(688, 122);
  ctx.lineTo(688, 318);
  ctx.stroke();
  drawPerson(ctx, 600, 300, 1.35, { shirt: '#1b1b1b', pants: '#1b1b1b', pose: 'stand' });
  drawPerson(ctx, 688, 318, 1.35, { shirt: '#1b1b1b', pants: '#1b1b1b', pose: 'stand' });
  ctx.fillStyle = '#ff5b5b';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SWAT', 600, 268);
  ctx.fillText('SWAT', 688, 286);
  // Five BCPD officers in bounding overwatch, mid-ground.
  const copX = [470, 560, 660, 770, 850];
  copX.forEach((cx, i) => {
    drawPerson(ctx, cx, 380 + (i % 2) * 28, 1.5, {
      shirt: '#1b2a4a', pants: '#101828', pose: 'stand', gun: true, crouch: i % 2 === 0,
    });
    if (i % 2 === 0) drawMuzzleFlash(ctx, cx + 30, 372 + (i % 2) * 28, 9, 0);
  });
  // Foreground: barrier with 7 bullet holes, 2 blood splatters, overturned cart.
  // It sits above the HUD strip so it stays readable at thumbnail scale.
  ctx.fillStyle = '#8d99ae';
  roundRect(ctx, 300, 545, 680, 48, 8);
  ctx.fill();
  ctx.fillStyle = '#6c757d';
  ctx.fillRect(300, 545, 680, 10);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('BCPD  •  ROAD CLOSED', 640, 575);
  for (let i = 0; i < 7; i++) {
    const hx = 340 + i * 86 + range(rng, -8, 8);
    const hy = 561 + (i % 2) * 14;
    ctx.fillStyle = '#14101f';
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,31,0.6)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2 + i;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10);
      ctx.stroke();
    }
  }
  for (const [bx, by] of [[420, 584], [880, 586]]) {
    ctx.fillStyle = '#a4133c';
    ctx.beginPath();
    ctx.arc(bx, by, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx + 16, by + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx - 14, by + 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Overturned cart, wheels up, produce spilled.
  ctx.save();
  ctx.translate(920, 600);
  ctx.rotate(0.5);
  ctx.fillStyle = '#7b4a2d';
  ctx.fillRect(-46, -12, 92, 24);
  ctx.fillStyle = '#14101f';
  ctx.beginPath();
  ctx.arc(-34, -20, 9, 0, Math.PI * 2);
  ctx.arc(34, -20, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ff5b5b';
  ctx.beginPath();
  ctx.arc(872, 614, 6, 0, Math.PI * 2);
  ctx.arc(962, 618, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7bff9e';
  ctx.beginPath();
  ctx.arc(902, 624, 6, 0, Math.PI * 2);
  ctx.fill();
  // Mid-ground: player crouched + Jax and Mara firing, muzzle flashes.
  drawPerson(ctx, 430, 500, 2.1, { shirt: '#ff2e88', pants: '#2b2d42', gun: true, crouch: true });
  drawMuzzleFlash(ctx, 466, 488, 16, -0.15);
  drawPerson(ctx, 560, 515, 2.0, { shirt: '#ff9f1c', pants: '#2b2d42', gun: true, crouch: true });
  drawMuzzleFlash(ctx, 594, 503, 14, -0.1);
  drawPerson(ctx, 330, 520, 1.9, { shirt: '#00e5ff', pants: '#2b2d42', gun: true, crouch: true });
  drawMuzzleFlash(ctx, 362, 508, 13, -0.2);
  // Six shell casings in the air.
  for (let i = 0; i < 6; i++) {
    drawCasing(ctx, 400 + i * 42 + range(rng, -6, 6), 470 - (i % 3) * 16, range(rng, -1, 1));
  }
  // Smartwatch on the player's wrist: blinking five stars + crew health.
  ctx.save();
  ctx.translate(452, 488);
  ctx.fillStyle = '#14101f';
  roundRect(ctx, -16, -12, 32, 24, 7);
  ctx.fill();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('★★★★★', 0, 4);
  ctx.restore();
  drawHUD(ctx, baseHud({
    mission: MISSIONS[9], objective: 'DEFEND THE CREW', progress: '5/6 DEFEND',
    cash: 5890, respect: 47, stars: 5, speedKmh: 0,
    weapon: WEAPONS[3], ammo: 30, reserve: 120, radio: RADIO[2],
    crew: CREW.map((c, i) => ({ ...c, hp: [76, 64, 82][i] })),
    currentShot: 2, hurricaneSeconds: 920,
    shotLabel: 'SHOT 2 — MARKET BATTLE • LITTLE HAVANA',
  }));
}

// ---------------------------------------------------------------- shot 3
function shotHeistInterior(ctx) {
  const rng = mulberry32(303);
  // Interior: warm dark room, golden light spilling from the garage door.
  const wall = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  wall.addColorStop(0, '#241a38');
  wall.addColorStop(0.7, '#3a2350');
  wall.addColorStop(1, '#1a1226');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Floor reflection band.
  ctx.fillStyle = 'rgba(255, 150, 90, 0.12)';
  ctx.fillRect(0, 560, CANVAS_W, 160);
  // Back wall: three server racks, one labelled PROTOTYPE with red LEDs.
  const rackX = [80, 300, 520];
  rackX.forEach((rx, ri) => {
    ctx.fillStyle = '#0d0d14';
    roundRect(ctx, rx, 90, 180, 330, 8);
    ctx.fill();
    ctx.strokeStyle = '#3a3a55';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 4; col++) {
        const lx = rx + 16 + col * 42;
        const ly = 108 + row * 34;
        const proto = ri === 1 && row === 4;
        ctx.fillStyle = proto ? '#ff2020' : pick(rng, ['#7bff9e', '#00e5ff', '#ffd166', '#2a2a3a']) === '#7bff9e' ? '#7bff9e' : '#2a4a5a';
        if (proto) {
          ctx.shadowColor = '#ff2020';
          ctx.shadowBlur = 10;
        }
        ctx.fillRect(lx, ly, 26, 12);
        ctx.shadowBlur = 0;
      }
    }
    if (ri === 1) {
      ctx.save();
      ctx.fillStyle = '#ff2020';
      ctx.shadowColor = '#ff2020';
      ctx.shadowBlur = 12;
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PROTOTYPE', rx + 90, 82);
      ctx.restore();
    }
  });
  // Laser grid: eight beams crossing the room.
  ctx.save();
  ctx.strokeStyle = '#ff2020';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff2020';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 8; i++) {
    const ly = 150 + i * 46;
    ctx.beginPath();
    ctx.moveTo(60, ly);
    ctx.lineTo(760, ly + (i % 2 === 0 ? 26 : -26));
    ctx.stroke();
    ctx.fillStyle = '#ff2020';
    ctx.beginPath();
    ctx.arc(60, ly, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Flashbang glare, top-left, over two spiderweb-cracked windows.
  for (const [wx, wy] of [[760, 90], [980, 110]]) {
    ctx.fillStyle = '#1b2a4a';
    ctx.fillRect(wx, wy, 120, 90);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.strokeRect(wx, wy, 120, 90);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    const cxp = wx + 60;
    const cyp = wy + 45;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cxp, cyp);
      ctx.lineTo(cxp + Math.cos(a) * 52, cyp + Math.sin(a) * 40);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cxp, cyp, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
  const glare = ctx.createRadialGradient(180, 120, 10, 180, 120, 200);
  glare.addColorStop(0, 'rgba(255, 255, 240, 0.55)');
  glare.addColorStop(1, 'rgba(255, 255, 240, 0)');
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, 380, 280);
  // Open garage door, right: golden dusk + getaway car.
  ctx.fillStyle = '#ff9d5c';
  ctx.fillRect(1060, 120, 220, 420);
  const doorGlow = ctx.createLinearGradient(1060, 0, 1280, 0);
  doorGlow.addColorStop(0, 'rgba(255, 157, 92, 0.0)');
  doorGlow.addColorStop(1, 'rgba(255, 190, 120, 0.55)');
  ctx.fillStyle = doorGlow;
  ctx.fillRect(900, 120, 380, 420);
  ctx.fillStyle = '#2a1b4d';
  ctx.fillRect(1060, 120, 220, 18);
  drawCarRear(ctx, 1170, 460, 190, 84, { color: '#2ec4b6', brake: true, label: 'GETAWAY' });
  // Table + laptop running the hacking minigame (the screen IS the UI).
  // The laptop is deliberately huge: its screen must read at thumbnail scale.
  ctx.fillStyle = '#4a3423';
  ctx.fillRect(560, 530, 460, 22);
  ctx.fillStyle = '#2a1b12';
  ctx.fillRect(575, 552, 14, 90);
  ctx.fillRect(990, 552, 14, 90);
  // Laptop.
  ctx.fillStyle = '#14101f';
  roundRect(ctx, 600, 280, 380, 250, 10);
  ctx.fill();
  ctx.fillStyle = '#0f2a3a';
  ctx.fillRect(615, 295, 350, 220);
  // Hack UI: 4 nodes, 3 breached, timer 0:47, progress bar.
  const nodes = [[665, 360], [775, 360], [885, 360], [665, 440]];
  nodes.forEach(([nx, ny], i) => {
    ctx.fillStyle = i < 3 ? '#7bff9e' : '#ff2020';
    ctx.shadowColor = i < 3 ? '#7bff9e' : '#ff2020';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(nx, ny, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0d0d0d';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), nx, ny + 6);
  });
  ctx.strokeStyle = 'rgba(123, 255, 158, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(665, 360);
  ctx.lineTo(775, 360);
  ctx.lineTo(885, 360);
  ctx.moveTo(775, 360);
  ctx.lineTo(665, 440);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('BREACH 3/4', 740, 448);
  ctx.fillStyle = '#ff5b5b';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('0:47', 665, 492);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(615, 500, 350, 12);
  ctx.fillStyle = '#7bff9e';
  ctx.fillRect(615, 500, 350 * 0.75, 12);
  glowText(ctx, 'NEON BAY // SERVER ROOM', 80, 560, 'bold 13px Arial', '#ffffff', '#00e5ff', 8);
  // Crew at their stations: Mara at the laptop, Jax at the door, Reyes at the rack.
  drawPerson(ctx, 545, 590, 2.3, { shirt: '#00e5ff', pants: '#2b2d42', pose: 'stand' });
  drawPerson(ctx, 1040, 580, 2.2, { shirt: '#ff9f1c', pants: '#2b2d42', pose: 'stand', gun: true });
  drawPerson(ctx, 520, 540, 2.2, { shirt: '#e71d36', pants: '#2b2d42', pose: 'stand', gun: true });
  drawHUD(ctx, baseHud({
    mission: MISSIONS[5], objective: 'EXTRACT THE PROTOTYPE', progress: '6/6 EXTRACT',
    cash: 9600, respect: 58, stars: 5, speedKmh: 0,
    weapon: WEAPONS[0], ammo: 12, reserve: 96, radio: RADIO[3],
    crew: CREW.map((c, i) => ({ ...c, hp: [88, 92, 70][i] })),
    currentShot: 3, hurricaneSeconds: 725,
    shotLabel: 'SHOT 3 — INTERIOR HEIST • GLASS TOWER',
  }));
}

// ---------------------------------------------------------------- shot 4
function shotHighwayEscape(ctx) {
  const rng = mulberry32(404);
  drawGoldenSky(ctx, 300, 210);
  drawSkyline(ctx, 404, 330);
  // Billboard in front of the skyline, right side, clear of the helicopter.
  ctx.fillStyle = '#120a24';
  ctx.fillRect(950, 118, 180, 80);
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = 3;
  ctx.strokeRect(950, 118, 180, 80);
  ctx.save();
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ff9ecf';
  ctx.fillText('NEON BAY', 1040, 152);
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#7ee7ff';
  ctx.shadowColor = '#00e5ff';
  ctx.fillText('VICE CITY AWAITS', 1040, 178);
  ctx.restore();
  // Lower deck road first: the upper deck then occludes its far end.
  drawRoad(ctx, { centerX: 640 });
  // Upper deck: the blockade.
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(0, 335, CANVAS_W, 110);
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(40 + i * 106, 335, 54, 4);
  }
  // Spike strip across the upper deck.
  ctx.fillStyle = '#14101f';
  ctx.fillRect(420, 395, 440, 18);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = '#c0c0c8';
    ctx.beginPath();
    ctx.moveTo(430 + i * 30, 395);
    ctx.lineTo(440 + i * 30, 380);
    ctx.lineTo(450 + i * 30, 395);
    ctx.closePath();
    ctx.fill();
  }
  // Four cruisers + the Rhino tank spanning the upper deck.
  drawCarRear(ctx, 290, 378, 130, 58, { police: true });
  drawCarRear(ctx, 470, 370, 130, 58, { police: true, angle: 0.05 });
  drawCarRear(ctx, 900, 378, 130, 58, { police: true });
  drawCarRear(ctx, 1060, 370, 130, 58, { police: true, angle: -0.05 });
  // Rhino tank, whole, across the deck.
  ctx.save();
  ctx.translate(680, 388);
  ctx.fillStyle = '#4a5240';
  roundRect(ctx, -150, -30, 300, 60, 12);
  ctx.fill();
  ctx.fillStyle = '#3a4232';
  roundRect(ctx, -70, -50, 140, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#2e3527';
  ctx.fillRect(50, -44, 170, 11);
  ctx.fillStyle = '#1c1c1c';
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(-128 + i * 32, 34, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('RHINO', 0, 8);
  ctx.restore();
  // Lower deck road was drawn before the upper deck; civilian cars below.
  // Six civilian cars swerving across three lanes.
  const civ = [
    [430, 470, '#2ec4b6', 0.14], [560, 440, '#ffd166', -0.1], [700, 470, '#ff70a6', 0.18],
    [850, 445, '#7bff9e', -0.16], [980, 480, '#ff9f1c', 0.1], [360, 500, '#00e5ff', -0.08],
  ];
  civ.forEach(([cx, cy, col, ang]) => drawCarRear(ctx, cx, cy, 120, 54, { color: col, angle: ang }));
  // Hero on the lower deck, NOS on.
  drawCarRear(ctx, 640, 615, 220, 98, { color: '#ff2e88', angle: -0.12, nos: true, brake: true, label: 'NEON-1' });
  drawSmokePuff(ctx, 580, 690, 30, 0.7);
  drawSmokePuff(ctx, 700, 692, 26, 0.7);
  // Bell 412 dead centre in the frame, open door + gunner, cockpit panel.
  drawHelicopter(ctx, 640, 165, 1.25, { spotlight: false });
  // Open door + gunner leaning out.
  ctx.fillStyle = '#0d0a16';
  ctx.fillRect(668, 152, 26, 34);
  drawPerson(ctx, 700, 176, 0.9, { shirt: '#1b1b1b', pants: '#1b1b1b', gun: true, pose: 'stand' });
  // Cockpit data panel.
  ctx.fillStyle = 'rgba(10, 8, 22, 0.85)';
  roundRect(ctx, 700, 96, 170, 34, 8);
  ctx.fill();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#7ee7ff';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('ESCAPE 2.3km', 712, 118);
  drawHUD(ctx, baseHud({
    mission: MISSIONS[14], objective: 'ESCAPE THE BLOCKADE', progress: '6/6 ESCAPE',
    cash: 12450, respect: 71, stars: 5, speedKmh: 142,
    weapon: WEAPONS[3], ammo: 30, reserve: 120, radio: RADIO[1],
    crew: CREW.map((c, i) => ({ ...c, hp: [92, 84, 88][i] })),
    currentShot: 4, hurricaneSeconds: 390,
    shotLabel: 'SHOT 4 — HIGHWAY ESCAPE • STARFISH CAUSEWAY',
  }));
}

export const SHOT_SCENES = {
  1: { name: 'beach chase', render: shotBeachChase },
  2: { name: 'market battle', render: shotMarketBattle },
  3: { name: 'interior heist', render: shotHeistInterior },
  4: { name: 'highway escape', render: shotHighwayEscape },
};

// Render one staged shot onto the canvas context. Returns its name.
export function renderShot(ctx, shotNumber) {
  const scene = SHOT_SCENES[shotNumber];
  if (!scene) throw new Error(`unknown shot ${shotNumber}`);
  scene.render(ctx);
  return scene.name;
}
