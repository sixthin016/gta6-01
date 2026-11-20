// Neon Bay — city street builder. One job: turn a district + seed into a row
// of dressed buildings on both sides of the road, so no shot ever shows a
// plain box. Every building gets a facade, lit windows and neon signage.
import { CANVAS_W, HORIZON_Y, DISTRICTS } from './config.js';
import { drawBuildingFacade } from './draw.js';
import { mulberry32, pick, range, rangeInt } from './rng.js';

const SHOP_SIGNS = [
  'TACOS', 'NEON', 'HOTEL', 'BAR 24H', 'PIZZA', 'LIQUOR', 'MOTEL', 'ARCADE',
  'DONUTS', 'PAWN', 'GYM', 'CLUB', 'PHARMACY', 'LAUNDRY', 'SUSHI', 'CASINO',
];

// Build a street: buildings on the left and right, far rows first so the
// near rows overlap them. Returns the list so scenes can reuse it.
export function buildStreet(districtId, seed) {
  const rng = mulberry32(seed);
  const district = DISTRICTS.find((d) => d.id === districtId) || DISTRICTS[1];
  const rows = [];
  // Five depth rows: y from the horizon down to the bottom edge.
  for (let row = 0; row < 5; row++) {
    const t = row / 4; // 0 = far, 1 = near
    const y = HORIZON_Y + 6 + t * t * 330;
    const h = 46 + t * 150;
    const scale = 0.35 + t * 0.9;
    rows.push({ row, t, y, h, scale });
  }
  const buildings = [];
  for (const side of ['left', 'right']) {
    for (const { row, t, y, h, scale } of rows) {
      // Road half-width at this depth: buildings start outside it.
      const roadHalf = 78 + t * 430;
      const centerX = 640;
      let x;
      if (side === 'left') {
        x = centerX - roadHalf - range(rng, 150, 260) * scale;
      } else {
        x = centerX + roadHalf + range(rng, 10, 60) * scale;
      }
      const w = range(rng, 130, 210) * scale;
      const base = pick(rng, district.palette);
      const sign = pick(rng, SHOP_SIGNS);
      const signColor = pick(rng, ['#00e5ff', '#ff2e88', '#ffd166', '#7bff9e', '#ff9f1c']);
      buildings.push({
        side, row, x, y: y - h, w, h,
        base, sign, signColor,
        litRatio: 0.35 + rng() * 0.35,
        seed: Math.floor(rng() * 1e9),
      });
      // A second building further out on the near rows for density.
      if (row >= 3 && rng() < 0.8) {
        const w2 = range(rng, 110, 180) * scale;
        const x2 = side === 'left'
          ? x - w2 - range(rng, 6, 30)
          : x + w + range(rng, 6, 30);
        buildings.push({
          side, row, x: x2, y: y - h * 0.92, w: w2, h: h * 0.92,
          base: pick(rng, district.palette), sign: pick(rng, SHOP_SIGNS),
          signColor: pick(rng, ['#00e5ff', '#ff2e88', '#ffd166']),
          litRatio: 0.35 + rng() * 0.35,
          seed: Math.floor(rng() * 1e9),
        });
      }
    }
  }
  // Far first, then near; within a row, left before right.
  buildings.sort((a, b) => a.row - b.row || (a.side === 'left' ? -1 : 1));
  return { district, buildings };
}

export function drawStreet(ctx, street) {
  for (const b of street.buildings) {
    const rng = mulberry32(b.seed);
    drawBuildingFacade(ctx, b.x, b.y, b.w, b.h, {
      base: b.base, sign: b.sign, signColor: b.signColor,
      litRatio: b.litRatio, rng, trim: '#ffd166',
    });
  }
}

// A distant skyline for the highway shot: lit towers, a crane, a billboard.
export function drawSkyline(ctx, seed, baseY) {
  const rng = mulberry32(seed);
  const towers = rangeInt(rng, 12, 14);
  let x = -10;
  for (let i = 0; i < towers; i++) {
    const w = range(rng, 46, 84);
    const h = range(rng, 90, 210);
    const base = pick(rng, ['#2a1b4d', '#3a2360', '#1f2a5e', '#4a2350']);
    ctx.fillStyle = base;
    ctx.fillRect(x, baseY - h, w, h);
    // Lit window dots.
    for (let wy = baseY - h + 10; wy < baseY - 8; wy += 12) {
      for (let wx = x + 6; wx < x + w - 6; wx += 11) {
        if (rng() < 0.42) {
          ctx.fillStyle = rng() < 0.7 ? '#ffd166' : '#7ee7ff';
          ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }
    // Antenna beacon on the tallest towers.
    if (h > 170) {
      ctx.strokeStyle = '#ff5b5b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, baseY - h);
      ctx.lineTo(x + w / 2, baseY - h - 18);
      ctx.stroke();
      ctx.fillStyle = '#ff5b5b';
      ctx.beginPath();
      ctx.arc(x + w / 2, baseY - h - 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    x += w + range(rng, 4, 18);
  }
  // Construction crane silhouette.
  ctx.strokeStyle = '#241a38';
  ctx.lineWidth = 5;
  const cx = CANVAS_W - 190;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.lineTo(cx, baseY - 190);
  ctx.moveTo(cx - 70, baseY - 178);
  ctx.lineTo(cx + 110, baseY - 178);
  ctx.moveTo(cx, baseY - 190);
  ctx.lineTo(cx + 110, baseY - 178);
  ctx.stroke();
  ctx.strokeStyle = '#241a38';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 96, baseY - 178);
  ctx.lineTo(cx + 96, baseY - 148);
  ctx.stroke();
  // Billboard with a neon headline.
  ctx.fillStyle = '#120a24';
  ctx.fillRect(60, baseY - 150, 170, 74);
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = 3;
  ctx.strokeRect(60, baseY - 150, 170, 74);
  ctx.save();
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ff9ecf';
  ctx.fillText('NEON BAY', 145, baseY - 118);
  ctx.font = 'bold 13px Arial';
  ctx.fillStyle = '#7ee7ff';
  ctx.shadowColor = '#00e5ff';
  ctx.fillText('VICE CITY AWAITS', 145, baseY - 92);
  ctx.restore();
}
