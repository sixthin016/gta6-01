// Neon Bay — the city itself: golden-hour sky, facaded skylines, wet streets,
// palms, cranes and billboards. Every building drawn here carries a real
// facade: tinted wall, window grid, lit windows and a neon sign — never a
// plain flat box.

import { vgrad, hgrad, glow, makeRng, shade, rgba, clamp } from './util.js';
import { FACADE_COLORS, NEON_SIGNS, NEON_COLORS } from './palette.js';

// Full golden-hour sky with a low sun and a haze band near the horizon.
export function drawSky(ctx, W, H, palette, sunX = W * 0.72, sunY = H * 0.30) {
  ctx.fillStyle = vgrad(ctx, 0, 0, H * 0.62, palette.sky);
  ctx.fillRect(0, 0, W, H * 0.62);
  glow(ctx, sunX, sunY, 190, palette.sun, 0.85);
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
  ctx.fill();
  // thin cloud streaks catching the sunset
  ctx.fillStyle = 'rgba(255,190,140,0.28)';
  for (const [cx, cy, cw] of [[W * 0.12, H * 0.12, 260], [W * 0.42, H * 0.07, 320], [W * 0.62, H * 0.17, 200]]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = palette.haze;
  ctx.fillRect(0, H * 0.42, W, H * 0.2);
}

// One building with a real facade. x,y = top-left of the wall; w,h = wall size.
// Windows are a lit grid (some dark), a neon sign sits near the roof, and a
// darker base grounds it. `seed` keeps the facade stable between frames.
export function drawBuilding(ctx, x, y, w, h, district, seed, opts = {}) {
  const rng = makeRng(seed);
  const colors = FACADE_COLORS[district] || FACADE_COLORS.downtown;
  const wall = opts.wall || rng.pick(colors);
  const litRatio = opts.litRatio ?? 0.55;

  // wall with a subtle vertical shade so it reads as a volume, not a card
  ctx.fillStyle = vgrad(ctx, x, y, y + h, [[0, shade(wall, 0.18)], [1, shade(wall, -0.28)]]);
  ctx.fillRect(x, y, w, h);
  // roof cap
  ctx.fillStyle = shade(wall, -0.45);
  ctx.fillRect(x, y, w, Math.max(4, h * 0.02));
  // side shade
  ctx.fillStyle = 'rgba(10,6,20,0.25)';
  ctx.fillRect(x + w - Math.max(5, w * 0.07), y, Math.max(5, w * 0.07), h);

  // window grid
  const cols = Math.max(2, Math.floor(w / 26));
  const rows = Math.max(3, Math.floor(h / 34));
  const gx = w / cols;
  const gy = h / rows;
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + c * gx + gx * 0.22;
      const wy = y + r * gy + gy * 0.22;
      const ww = gx * 0.56;
      const wh = gy * 0.5;
      const lit = rng.next() < litRatio;
      if (lit) {
        const warm = rng.pick(['#ffd76a', '#ffe9a8', '#ffb35c', '#9be8ff']);
        ctx.fillStyle = warm;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(wx, wy, ww, wh);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(12,10,26,0.72)';
        ctx.fillRect(wx, wy, ww, wh);
      }
      ctx.strokeStyle = 'rgba(8,6,18,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, ww, wh);
    }
  }

  // neon sign near the roof
  if (w >= 70 && h >= 90 && rng.next() < 0.9) {
    const signs = NEON_SIGNS[district] || NEON_SIGNS.downtown;
    const text = rng.pick(signs);
    const nc = rng.pick(NEON_COLORS);
    const sy = y + Math.max(16, h * 0.08);
    ctx.font = `bold ${Math.max(11, Math.min(22, w / (text.length + 1)))}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    glow(ctx, x + w / 2, sy, w * 0.42, nc, 0.5);
    ctx.fillStyle = nc;
    ctx.fillText(text, x + w / 2, sy);
    // sign backplate
    ctx.strokeStyle = rgba(nc, 0.8);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + w * 0.08, sy - 13, w * 0.84, 26);
  }

  // ground-floor awning / shopfront so the base is not bare wall
  if (opts.shopfront !== false && h > 110) {
    const aw = rng.pick(['#ff2e88', '#22a8c8', '#ffb02e', '#7cff5e']);
    ctx.fillStyle = aw;
    ctx.fillRect(x, y + h - 26, w, 8);
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.fillRect(x + w * 0.12, y + h - 18, w * 0.76, 14);
  }
}

// A row of facaded buildings forming a skyline silhouette.
// Returns the ground line y. `baseY` is the horizon.
export function drawSkyline(ctx, W, baseY, district, seed, count = 14, minH = 60, maxH = 260) {
  const rng = makeRng(seed);
  let x = -20;
  const step = (W + 40) / count;
  for (let i = 0; i < count; i++) {
    const w = step * rng.range(0.72, 1.05);
    const h = rng.range(minH, maxH) * (1 + 0.25 * Math.sin(i * 1.7));
    drawBuilding(ctx, x, baseY - h, w, h, district, seed + i * 977, { litRatio: 0.6 });
    x += step;
  }
  return baseY;
}

// Wet asphalt: dark road with a mirrored wash of the sky gradient, lane
// dashes and a bright center sheen. `y0..y1` is the road band on screen.
export function drawWetRoad(ctx, W, y0, y1, palette, horizonX = 0.5) {
  const cx = W * horizonX;
  ctx.fillStyle = vgrad(ctx, 0, y0, y1, [
    [0, shade(palette.road, 0.35)],
    [0.25, palette.road],
    [0.6, shade(palette.road, -0.1)],
    [1, shade(palette.road, -0.35)],
  ]);
  ctx.fillRect(0, y0, W, y1 - y0);
  // sky wash reflected in the wet surface
  ctx.fillStyle = vgrad(ctx, 0, y0, y1, [
    [0, 'rgba(255,140,70,0.30)'],
    [0.4, 'rgba(255,120,90,0.10)'],
    [1, 'rgba(20,10,40,0.05)'],
  ]);
  ctx.fillRect(0, y0, W, y1 - y0);
  // perspective lane dashes converging on the horizon point
  ctx.fillStyle = palette.roadLine;
  const lanes = [0.22, 0.5, 0.78];
  for (const lx of lanes) {
    const topX = cx + (W * lx - cx) * 0.12;
    const botX = W * lx;
    ctx.beginPath();
    ctx.moveTo(topX - 2, y0 + 4);
    ctx.lineTo(topX + 2, y0 + 4);
    ctx.lineTo(botX + 7, y1);
    ctx.lineTo(botX - 7, y1);
    ctx.closePath();
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // edge lines
  ctx.strokeStyle = 'rgba(255,230,160,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.06, y0);
  ctx.lineTo(0, y1);
  ctx.moveTo(cx + W * 0.06, y0);
  ctx.lineTo(W, y1);
  ctx.stroke();
}

// A sidewalk band with curb and slab joints.
export function drawSidewalk(ctx, W, y0, y1, tone = '#6e5a52') {
  ctx.fillStyle = tone;
  ctx.fillRect(0, y0, W, y1 - y0);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let x = 20; x < W; x += 90) ctx.fillRect(x, y0, 2, y1 - y0);
  ctx.fillStyle = 'rgba(255,220,170,0.35)';
  ctx.fillRect(0, y1 - 4, W, 4);
}

// Palm tree with a leaning trunk and a lit frond crown.
export function drawPalm(ctx, x, y, h, lean = 0.12, seed = 1) {
  const rng = makeRng(seed);
  ctx.strokeStyle = '#5a3a28';
  ctx.lineWidth = Math.max(4, h * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + h * lean * 0.5, y - h * 0.6, x + h * lean, y - h);
  ctx.stroke();
  const topX = x + h * lean;
  const topY = y - h;
  ctx.strokeStyle = '#2e7a3a';
  ctx.lineWidth = Math.max(3, h * 0.03);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.14) + (rng.next() - 0.5) * 0.2;
    const len = h * rng.range(0.3, 0.42);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.5 - 8,
      topX + Math.cos(a) * len, topY + Math.sin(a) * len + 14,
    );
    ctx.stroke();
  }
}

// Construction crane against the sunset.
export function drawCrane(ctx, x, y, h, color = '#2a2038') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.lineTo(x + h * 0.85, y - h * 0.92);
  ctx.moveTo(x, y - h);
  ctx.lineTo(x - h * 0.3, y - h * 0.88);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + h * 0.55, y - h * 0.55);
  ctx.lineTo(x + h * 0.55, y - h * 0.86);
  ctx.stroke();
  // counterweight + hook
  ctx.fillStyle = color;
  ctx.fillRect(x - h * 0.3 - 8, y - h * 0.92, 16, 14);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + h * 0.55, y - h * 0.86);
  ctx.lineTo(x + h * 0.55, y - h * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#ff2e55';
  ctx.beginPath();
  ctx.arc(x + h * 0.55, y - h * 0.48, 4, 0, Math.PI * 2);
  ctx.fill();
}

// Billboard with a lit ad panel and support legs.
export function drawBillboard(ctx, x, y, w, h, text, colorA, colorB) {
  ctx.fillStyle = '#1c1626';
  ctx.fillRect(x + w * 0.2, y + h, 8, 26);
  ctx.fillRect(x + w * 0.7, y + h, 8, 26);
  ctx.fillStyle = hgrad(ctx, x, x + w, y, [[0, colorA], [1, colorB]]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#0e0a18';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  glow(ctx, x + w / 2, y + h / 2, w * 0.55, colorA, 0.35);
  ctx.font = `bold ${Math.max(12, h * 0.28)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff8ea';
  ctx.fillText(text, x + w / 2, y + h / 2);
}
