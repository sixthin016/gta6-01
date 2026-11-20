// Neon Bay — effects: tire smoke, flying debris, muzzle flashes, shell
// casings, blood, laser grids, NOS glow, flashbang glare and cracked glass.
// Each effect is a small deterministic drawing from a seed.

import { makeRng, glow, rgba } from './util.js';

// Three layered puffs of tire smoke trailing a drifting car.
export function drawTireSmoke(ctx, x, y, seed, dir = 1) {
  const rng = makeRng(seed);
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 7; i++) {
      const px = x + dir * (i * 16 + rng.range(-6, 6)) - layer * 10;
      const py = y - layer * 8 + rng.range(-8, 8);
      const r = 10 + layer * 7 + rng.range(0, 8);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(235,230,225,${0.5 - layer * 0.12})`);
      g.addColorStop(1, 'rgba(235,230,225,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Debris with motion blur: small streaks flying off a crash or skid.
export function drawDebris(ctx, cx, cy, seed, count = 14) {
  const rng = makeRng(seed);
  const colors = ['#ffd76a', '#ff8a3d', '#c8ccd8', '#ff5a4a', '#3dd6ff'];
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(20, 130);
    const px = cx + Math.cos(a) * d;
    const py = cy + Math.sin(a) * d * 0.5;
    const len = rng.range(6, 22);
    ctx.strokeStyle = rng.pick(colors);
    ctx.globalAlpha = rng.range(0.5, 0.95);
    ctx.lineWidth = rng.range(1.5, 3.5);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.cos(a) * len, py - Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Brass shell casings tumbling through the air.
export function drawShells(ctx, points) {
  for (const [x, y, rot] of points) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.fillStyle = '#c89a2e';
    ctx.fillRect(2, -1.5, 1.5, 3);
    ctx.restore();
  }
}

// Blood splashes on a market barrier / floor.
export function drawBlood(ctx, x, y, seed, scale = 1) {
  const rng = makeRng(seed);
  ctx.fillStyle = '#a01828';
  for (let i = 0; i < 9; i++) {
    const px = x + rng.range(-26, 26) * scale;
    const py = y + rng.range(-10, 14) * scale;
    const r = rng.range(2, 8) * scale;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 0.6, rng.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

// Bullet holes punched through a wooden market barrier.
export function drawBulletHoles(ctx, x, y, w, count, seed) {
  const rng = makeRng(seed);
  for (let i = 0; i < count; i++) {
    const hx = x + rng.range(8, w - 8);
    const hy = y + rng.range(6, 26);
    ctx.fillStyle = '#0c0812';
    ctx.beginPath();
    ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,20,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Laser grid: `count` red beams crossing a room, with bright emitter dots.
export function drawLaserGrid(ctx, x0, y0, x1, y1, count, phase = 0) {
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const bx = x0 + (x1 - x0) * t;
    const by = y0 + (y1 - y0) * t;
    const pulse = 0.55 + 0.3 * Math.sin(phase + i * 1.3);
    ctx.strokeStyle = `rgba(255,40,60,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 120, by - 36);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,40,60,${pulse * 0.25})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 120, by - 36);
    ctx.stroke();
    glow(ctx, bx, by, 7, '#ff283c', 0.8);
    ctx.fillStyle = '#ff5a6a';
    ctx.beginPath();
    ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Spiderweb crack in a window pane.
export function drawCrackedGlass(ctx, x, y, r, seed) {
  const rng = makeRng(seed);
  ctx.strokeStyle = 'rgba(230,240,255,0.85)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const len = r * rng.range(0.7, 1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  for (const rr2 of [0.35, 0.6, 0.85]) {
    ctx.beginPath();
    for (let i = 0; i <= 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const jitter = rng.range(-3, 3);
      const px = x + Math.cos(a) * r * rr2 + jitter;
      const py = y + Math.sin(a) * r * rr2 + jitter;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(20,16,30,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// Flashbang glare washing a corner of the frame.
export function drawFlashbang(ctx, x, y, W, H) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 420);
  g.addColorStop(0, 'rgba(255,255,240,0.95)');
  g.addColorStop(0.25, 'rgba(255,250,220,0.55)');
  g.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// A server rack with blinking drive LEDs; one drive is labelled PROTOTYPE.
export function drawServerRack(ctx, x, y, w, h, seed, prototype = false) {
  const rng = makeRng(seed);
  ctx.fillStyle = '#14121e';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2e2a3e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  const rows = Math.floor(h / 26);
  for (let r = 0; r < rows; r++) {
    const ry = y + 6 + r * 26;
    ctx.fillStyle = '#1e1a2e';
    ctx.fillRect(x + 6, ry, w - 12, 20);
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(x + 10, ry + 5, w - 40, 10);
    const lit = rng.next();
    const ledColor = prototype && r === 2 ? '#ff283c' : lit < 0.6 ? '#7cff5e' : '#ffd76a';
    const blink = prototype && r === 2 ? 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 300)) : 1;
    ctx.globalAlpha = blink;
    glow(ctx, x + w - 14, ry + 10, 6, ledColor, 0.9);
    ctx.fillStyle = ledColor;
    ctx.beginPath();
    ctx.arc(x + w - 14, ry + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (prototype && r === 2) {
      ctx.fillStyle = '#ff5a6a';
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('PROTOTYPE', x + 12, ry + 10);
    }
  }
}
