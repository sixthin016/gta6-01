// Neon Bay — vehicles, all drawn as vector shapes: the hero car with a
// glossy saturated paint job, BCPD cruisers, colorful civilian traffic,
// the Air-1 helicopter and the Rhino tank. No black-block assets: every
// vehicle carries paint, glass, wheels and lights.

import { shade, rgba, glow, rr, makeRng } from './util.js';

// Generic rear three-quarter car. `opts` sets paint, size, angle, lights,
// NOS flame and window tint. Drawn facing left, nose to the left.
export function drawCar(ctx, x, y, w, h, opts = {}) {
  const paint = opts.paint || '#ff7a3d';
  const angle = opts.angle || 0;
  const flip = opts.flip ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(flip, 1);
  // shadow
  ctx.fillStyle = 'rgba(8,5,18,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.42, w * 0.52, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  const body = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.45);
  body.addColorStop(0, shade(paint, 0.35));
  body.addColorStop(0.45, paint);
  body.addColorStop(1, shade(paint, -0.35));
  ctx.fillStyle = body;
  rr(ctx, -w / 2, -h * 0.42, w, h * 0.72, h * 0.2);
  ctx.fill();
  // cabin + glass, low and tucked into the body so it never reads as a slab
  ctx.fillStyle = '#101826';
  rr(ctx, -w * 0.16, -h * 0.62, w * 0.36, h * 0.34, h * 0.1);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,210,255,0.55)';
  rr(ctx, -w * 0.12, -h * 0.58, w * 0.28, h * 0.24, h * 0.07);
  ctx.fill();
  // hood highlight — the glossy streak that sells the paint
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.48, -h * 0.3);
  ctx.lineTo(-w * 0.2, -h * 0.34);
  ctx.lineTo(-w * 0.28, -h * 0.05);
  ctx.lineTo(-w * 0.48, -h * 0.02);
  ctx.closePath();
  ctx.fill();
  // wheels
  for (const wx of [-w * 0.32, w * 0.32]) {
    ctx.fillStyle = '#0c0a12';
    ctx.beginPath();
    ctx.arc(wx, h * 0.28, h * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8ccd8';
    ctx.beginPath();
    ctx.arc(wx, h * 0.28, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // headlights (front = left) and tail glow
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.ellipse(-w * 0.5, -h * 0.18, 5, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  if (opts.brakeGlow) {
    glow(ctx, w * 0.5, -h * 0.1, 26, '#ff2e2e', 0.8);
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, -h * 0.12, 6, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, -h * 0.12, 5, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // NOS flame from the exhausts when boosting
  if (opts.nos) {
    const fl = h * (0.5 + 0.35 * Math.sin(Date.now() / 40));
    const fg = ctx.createLinearGradient(w * 0.5, 0, w * 0.5 + fl * 1.6, 0);
    fg.addColorStop(0, 'rgba(120,220,255,0.95)');
    fg.addColorStop(0.5, 'rgba(80,140,255,0.7)');
    fg.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(w * 0.48, h * 0.18);
    ctx.lineTo(w * 0.5 + fl * 1.6, h * 0.02);
    ctx.lineTo(w * 0.48, h * 0.36);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// The hero car: saturated orange-red "Coral GT" with a black hood stripe,
// roof spoiler and underglow. `opts` passes through to drawCar.
export function drawHeroCar(ctx, x, y, w, h, opts = {}) {
  drawCar(ctx, x, y, w, h, { paint: '#ff5a2e', ...opts });
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opts.angle || 0);
  if (opts.flip) ctx.scale(-1, 1);
  // hood stripe + spoiler
  ctx.fillStyle = 'rgba(12,8,20,0.85)';
  ctx.fillRect(-w * 0.46, -h * 0.34, w * 0.42, h * 0.09);
  ctx.fillStyle = '#14101e';
  rr(ctx, w * 0.34, -h * 0.66, w * 0.16, h * 0.14, 3);
  ctx.fill();
  // underglow
  glow(ctx, 0, h * 0.4, w * 0.5, '#ff2e88', 0.3);
  ctx.restore();
}

// BCPD cruiser: white doors, navy body, light bar flashing red/blue.
export function drawCruiser(ctx, x, y, w, h, opts = {}) {
  const t = opts.phase || 0;
  drawCar(ctx, x, y, w, h, { paint: '#1c2a4e', angle: opts.angle || 0, flip: opts.flip, brakeGlow: opts.brakeGlow });
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opts.angle || 0);
  if (opts.flip) ctx.scale(-1, 1);
  // white door panel + BCPD badge
  ctx.fillStyle = '#eef2f8';
  rr(ctx, -w * 0.14, -h * 0.4, w * 0.3, h * 0.66, h * 0.08);
  ctx.fill();
  ctx.fillStyle = '#1c2a4e';
  ctx.font = `bold ${Math.max(9, h * 0.16)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BCPD', 0.01 * w, -h * 0.08);
  // light bar, alternating flash — sits on the roofline
  const red = Math.sin(t) > 0;
  glow(ctx, -w * 0.05, -h * 0.7, 22, red ? '#ff2e2e' : '#2e6bff', 0.9);
  ctx.fillStyle = red ? '#ff2e2e' : '#8a1020';
  rr(ctx, -w * 0.14, -h * 0.78, w * 0.13, h * 0.12, 2);
  ctx.fill();
  ctx.fillStyle = red ? '#10205e' : '#2e6bff';
  rr(ctx, w * 0.01, -h * 0.78, w * 0.13, h * 0.12, 2);
  ctx.fill();
  // push bar
  ctx.strokeStyle = '#0e0c16';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, -h * 0.3);
  ctx.lineTo(-w * 0.56, h * 0.1);
  ctx.stroke();
  ctx.restore();
}

// Colorful civilian traffic car — never a black block.
export function drawTrafficCar(ctx, x, y, w, h, seed, opts = {}) {
  const rng = makeRng(seed);
  const paints = ['#ffd23e', '#3dd6ff', '#7cff5e', '#ff8ac2', '#c95eff', '#ff9a3d', '#4ae8a8'];
  drawCar(ctx, x, y, w, h, { paint: opts.paint || rng.pick(paints), angle: opts.angle || 0, flip: opts.flip });
}

// Air-1 helicopter: big dark silhouette against the bright sky, blurred
// rotor disc, tail boom, skids, and a searchlight cone when `spotlight` set.
export function drawHeli(ctx, x, y, w, opts = {}) {
  const h = w * 0.34;
  const t = opts.phase || 0;
  ctx.save();
  ctx.translate(x, y);
  if (opts.flip) ctx.scale(-1, 1);
  // rotor blur: two translucent discs, offset by phase
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = `rgba(20,16,30,${0.16 + 0.05 * Math.sin(t * 2 + i)})`;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.62, w * 0.72, h * 0.1, (i ? 0.06 : -0.06) + Math.sin(t) * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20,16,30,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w * 0.68, -h * 0.62);
  ctx.lineTo(w * 0.68, -h * 0.62);
  ctx.stroke();
  // tail boom + tail rotor
  ctx.fillStyle = '#14101e';
  ctx.beginPath();
  ctx.moveTo(w * 0.28, -h * 0.15);
  ctx.lineTo(w * 0.62, -h * 0.42);
  ctx.lineTo(w * 0.62, -h * 0.28);
  ctx.lineTo(w * 0.28, h * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(20,16,30,0.4)';
  ctx.beginPath();
  ctx.ellipse(w * 0.62, -h * 0.36, 6, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  const body = ctx.createLinearGradient(0, -h * 0.6, 0, h * 0.4);
  body.addColorStop(0, '#2e2a3e');
  body.addColorStop(1, '#0e0c18');
  ctx.fillStyle = body;
  rr(ctx, -w * 0.34, -h * 0.55, w * 0.62, h * 0.85, h * 0.28);
  ctx.fill();
  // cockpit glass catching the sunset
  ctx.fillStyle = 'rgba(255,190,110,0.75)';
  rr(ctx, -w * 0.32, -h * 0.48, w * 0.2, h * 0.34, h * 0.1);
  ctx.fill();
  ctx.fillStyle = 'rgba(140,220,255,0.5)';
  rr(ctx, -w * 0.1, -h * 0.48, w * 0.12, h * 0.3, h * 0.08);
  ctx.fill();
  // "AIR-1" marking + open door with gunner when requested
  ctx.fillStyle = '#ffd76a';
  ctx.font = `bold ${Math.max(10, w * 0.045)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AIR-1', w * 0.05, -h * 0.05);
  if (opts.gunner) {
    ctx.fillStyle = '#0a0812';
    ctx.beginPath();
    ctx.arc(w * 0.2, h * 0.18, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0812';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.28);
    ctx.lineTo(w * 0.34, h * 0.42);
    ctx.stroke();
  }
  // skids
  ctx.strokeStyle = '#0e0c18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, h * 0.42);
  ctx.lineTo(w * 0.26, h * 0.42);
  ctx.moveTo(-w * 0.2, h * 0.3);
  ctx.lineTo(-w * 0.24, h * 0.42);
  ctx.moveTo(w * 0.18, h * 0.3);
  ctx.lineTo(w * 0.2, h * 0.42);
  ctx.stroke();
  ctx.restore();
  // searchlight cone through the haze, drawn in world space
  if (opts.spotlight) {
    const sx = x;
    const sy = y + h * 0.35;
    const tx = opts.spotX ?? x;
    const ty = opts.spotY ?? y + 320;
    const g = ctx.createLinearGradient(sx, sy, tx, ty);
    g.addColorStop(0, 'rgba(255,250,220,0.6)');
    g.addColorStop(1, 'rgba(255,250,220,0.03)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - 10, sy);
    ctx.lineTo(sx + 10, sy);
    ctx.lineTo(tx + 130, ty);
    ctx.lineTo(tx - 130, ty);
    ctx.closePath();
    ctx.fill();
    glow(ctx, tx, ty, 90, '#fff6c8', 0.55);
  }
}

// Rhino tank blocking the deck, fully visible across the road.
export function drawTank(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(8,5,18,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.4, w * 0.52, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // tracks
  ctx.fillStyle = '#14101c';
  rr(ctx, -w / 2, h * 0.08, w, h * 0.34, h * 0.12);
  ctx.fill();
  ctx.fillStyle = '#3a3444';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(-w * 0.44 + i * w * 0.126, h * 0.25, h * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  // hull + turret + barrel
  const hull = ctx.createLinearGradient(0, -h * 0.4, 0, h * 0.1);
  hull.addColorStop(0, '#4a5a3a');
  hull.addColorStop(1, '#2e3a24');
  ctx.fillStyle = hull;
  rr(ctx, -w * 0.46, -h * 0.3, w * 0.92, h * 0.42, h * 0.08);
  ctx.fill();
  ctx.fillStyle = '#3a4a2e';
  rr(ctx, -w * 0.16, -h * 0.62, w * 0.34, h * 0.36, h * 0.08);
  ctx.fill();
  ctx.fillStyle = '#232e1a';
  ctx.fillRect(-w * 0.62, -h * 0.56, w * 0.5, h * 0.1);
  ctx.fillStyle = '#ffd76a';
  ctx.font = `bold ${Math.max(10, h * 0.2)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RHINO', 0, -h * 0.12);
  ctx.restore();
}
