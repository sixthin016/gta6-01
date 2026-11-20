// Neon Bay — low-level canvas drawing helpers. One job: every visible thing
// the game draws (sky, road, cars, people, helicopter, effects) lives here
// as a small named function the scenes and the playable game share.
import { CANVAS_W, CANVAS_H, HORIZON_Y, GOLDEN_HOUR } from './config.js';

export function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function glowText(ctx, text, x, y, font, color, glowColor, glowBlur) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glowBlur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Golden-hour sky with a low sun and a warm haze band at the horizon.
export function drawGoldenSky(ctx, sunX, sunY) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 40);
  g.addColorStop(0, GOLDEN_HOUR.skyTop);
  g.addColorStop(0.45, GOLDEN_HOUR.skyMid);
  g.addColorStop(0.78, GOLDEN_HOUR.skyLow);
  g.addColorStop(1, GOLDEN_HOUR.horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y + 40);
  // Sun disc + halo.
  const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150);
  halo.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
  halo.addColorStop(0.25, 'rgba(255, 190, 100, 0.55)');
  halo.addColorStop(1, 'rgba(255, 150, 80, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
  ctx.fillStyle = GOLDEN_HOUR.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
  // Thin cloud streaks catching the light.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffb27a';
  for (const [cx, cy, cw] of [[180, 92, 260], [760, 60, 300], [1020, 140, 220], [420, 170, 180]]) {
    roundRect(ctx, cx, cy, cw, 10, 5);
    ctx.fill();
  }
  ctx.restore();
}

// A road that recedes to the vanishing point, with wet sheen and lane dashes.
export function drawRoad(ctx, opts) {
  const { centerX = 640, topW = 150, botW = 900, wet = true } = opts || {};
  const g = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_H);
  g.addColorStop(0, GOLDEN_HOUR.roadTop);
  g.addColorStop(1, GOLDEN_HOUR.roadBottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(centerX - topW / 2, HORIZON_Y);
  ctx.lineTo(centerX + topW / 2, HORIZON_Y);
  ctx.lineTo(centerX + botW / 2, CANVAS_H);
  ctx.lineTo(centerX - botW / 2, CANVAS_H);
  ctx.closePath();
  ctx.fill();
  if (wet) {
    // Wet asphalt carries the sky colour: warm streaks down the lanes.
    ctx.save();
    ctx.globalAlpha = 0.5;
    const sheen = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_H);
    sheen.addColorStop(0, 'rgba(255, 150, 90, 0)');
    sheen.addColorStop(0.6, 'rgba(255, 150, 90, 0.10)');
    sheen.addColorStop(1, 'rgba(255, 190, 120, 0.22)');
    ctx.fillStyle = sheen;
    ctx.fill();
    ctx.restore();
  }
  // Centre dashes, converging toward the vanishing point.
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const y = HORIZON_Y + 8 + t * t * (CANVAS_H - HORIZON_Y - 20);
    const w = 3 + t * 9;
    const h = 4 + t * 26;
    ctx.globalAlpha = 0.35 + t * 0.6;
    ctx.fillRect(centerX - w / 2, y, w, h);
  }
  ctx.globalAlpha = 1;
  // Edge lines.
  ctx.strokeStyle = 'rgba(255, 220, 180, 0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - topW / 2, HORIZON_Y);
  ctx.lineTo(centerX - botW / 2, CANVAS_H);
  ctx.moveTo(centerX + topW / 2, HORIZON_Y);
  ctx.lineTo(centerX + botW / 2, CANVAS_H);
  ctx.stroke();
}

// One building facade: never a plain box — window grid, lit windows, neon
// signage, awning and a roof line. scale shrinks it toward the horizon.
export function drawBuildingFacade(ctx, x, y, w, h, opts) {
  const { base = '#5b4a8a', trim = '#ffd166', sign = null, signColor = '#00e5ff', litRatio = 0.45, rng } = opts || {};
  // Wall.
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, base);
  g.addColorStop(0.5, shade(base, 18));
  g.addColorStop(1, shade(base, -22));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Roof line.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = trim;
  ctx.fillRect(x, y + 5, w, 2);
  // Window grid.
  const cols = Math.max(2, Math.floor(w / 34));
  const rows = Math.max(2, Math.floor(h / 42));
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + c * cw + cw * 0.2;
      const wy = y + 14 + r * ch + ch * 0.18;
      const ww = cw * 0.6;
      const wh = ch * 0.6;
      const lit = rng ? rng() < litRatio : ((r * 7 + c * 3) % 5) < 2;
      ctx.fillStyle = lit ? '#ffd166' : 'rgba(10, 14, 30, 0.85)';
      if (lit) {
        ctx.shadowColor = '#ffbf47';
        ctx.shadowBlur = 6;
      }
      ctx.fillRect(wx, wy, ww, wh);
      ctx.shadowBlur = 0;
      // Window frame.
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, ww, wh);
    }
  }
  // Ground floor: shopfront glass + awning.
  const gfY = y + h - 46;
  ctx.fillStyle = 'rgba(12, 18, 36, 0.9)';
  ctx.fillRect(x + 4, gfY, w - 8, 42);
  ctx.fillStyle = 'rgba(255, 209, 102, 0.28)';
  ctx.fillRect(x + 8, gfY + 5, w - 16, 32);
  ctx.fillStyle = trim;
  ctx.fillRect(x, gfY - 8, w, 8);
  // Neon signage.
  if (sign) {
    ctx.save();
    ctx.font = `bold ${Math.max(11, Math.floor(w / 9))}px Arial`;
    ctx.textAlign = 'center';
    ctx.shadowColor = signColor;
    ctx.shadowBlur = 14;
    ctx.fillStyle = signColor;
    ctx.fillText(sign, x + w / 2, y + 34);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = signColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 6, y + 12, w - 12, 30);
    ctx.restore();
  }
}

// Lighten (+) or darken (-) a #rrggbb colour.
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${gg},${b})`;
}

// A car seen from the rear three-quarter: glossy body, roof, rear glass,
// glowing tail bar, wheels, wet reflection and optional NOS flame.
export function drawCarRear(ctx, x, y, w, h, opts) {
  const { color = '#ff2e88', police = false, angle = 0, nos = false, brake = false, label = null } = opts || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Wet reflection under the car.
  const refl = ctx.createLinearGradient(0, h * 0.55, 0, h * 1.05);
  refl.addColorStop(0, color + '55');
  refl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = refl;
  ctx.fillRect(-w * 0.48, h * 0.55, w * 0.96, h * 0.5);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, -w * 0.52, h * 0.42, w * 1.04, h * 0.2, 10);
  ctx.fill();
  // Body.
  const body = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
  body.addColorStop(0, shade(color, 55));
  body.addColorStop(0.45, color);
  body.addColorStop(1, shade(color, -45));
  ctx.fillStyle = body;
  roundRect(ctx, -w / 2, -h * 0.5, w, h, Math.max(8, h * 0.16));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Roof + rear glass.
  ctx.fillStyle = shade(color, -25);
  roundRect(ctx, -w * 0.36, -h * 0.52, w * 0.72, h * 0.34, 8);
  ctx.fill();
  const glass = ctx.createLinearGradient(0, -h * 0.5, 0, -h * 0.2);
  glass.addColorStop(0, '#1b2a4a');
  glass.addColorStop(1, '#ff9d5c');
  ctx.fillStyle = glass;
  roundRect(ctx, -w * 0.3, -h * 0.48, w * 0.6, h * 0.26, 6);
  ctx.fill();
  // Police livery.
  if (police) {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(-w / 2, -h * 0.12, w, h * 0.22);
    ctx.fillStyle = '#111';
    ctx.font = `bold ${Math.max(10, h * 0.14)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('BCPD', 0, h * 0.06);
    // Light bar.
    ctx.fillStyle = '#ff2020';
    ctx.shadowColor = '#ff2020';
    ctx.shadowBlur = 16;
    roundRect(ctx, -w * 0.28, -h * 0.62, w * 0.24, h * 0.1, 3);
    ctx.fill();
    ctx.fillStyle = '#2080ff';
    ctx.shadowColor = '#2080ff';
    roundRect(ctx, w * 0.04, -h * 0.62, w * 0.24, h * 0.1, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // Tail light bar (glows harder under braking).
  ctx.fillStyle = brake ? '#ff2a1a' : '#c81e1e';
  ctx.shadowColor = '#ff3020';
  ctx.shadowBlur = brake ? 22 : 10;
  roundRect(ctx, -w * 0.46, h * 0.26, w * 0.92, h * 0.1, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Bumper + plate.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-w * 0.48, h * 0.4, w * 0.96, h * 0.08);
  ctx.fillStyle = '#e9ecef';
  ctx.fillRect(-w * 0.12, h * 0.18, w * 0.24, h * 0.1);
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold ${Math.max(9, h * 0.11)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, h * 0.27);
  }
  // Wheels.
  ctx.fillStyle = '#0d0d0d';
  roundRect(ctx, -w * 0.5, h * 0.28, w * 0.14, h * 0.22, 3);
  ctx.fill();
  roundRect(ctx, w * 0.36, h * 0.28, w * 0.14, h * 0.22, 3);
  ctx.fill();
  // NOS flame: blue-orange jet from the exhausts.
  if (nos) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flame = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.95);
    flame.addColorStop(0, 'rgba(120, 220, 255, 0.95)');
    flame.addColorStop(0.5, 'rgba(255, 140, 40, 0.85)');
    flame.addColorStop(1, 'rgba(255, 60, 20, 0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, h * 0.48);
    ctx.lineTo(-w * 0.18, h * 0.48);
    ctx.lineTo(-w * 0.24, h * 0.98);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.48);
    ctx.lineTo(w * 0.3, h * 0.48);
    ctx.lineTo(w * 0.24, h * 0.98);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// A pedestrian: head, torso, legs, varied shirt colour, tiny shadow.
export function drawPerson(ctx, x, y, s, opts) {
  const { shirt = '#ff9f1c', skin = '#c68642', pants = '#2b2d42', pose = 'walk', gun = false, crouch = false } = opts || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 34, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const crouchDy = crouch ? 8 : 0;
  // Legs.
  ctx.strokeStyle = pants;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (pose === 'walk') {
    ctx.moveTo(0, 12 + crouchDy);
    ctx.lineTo(-5, 32);
    ctx.moveTo(0, 12 + crouchDy);
    ctx.lineTo(6, 32);
  } else {
    ctx.moveTo(0, 12 + crouchDy);
    ctx.lineTo(-4, 33);
    ctx.moveTo(0, 12 + crouchDy);
    ctx.lineTo(4, 33);
  }
  ctx.stroke();
  // Torso.
  ctx.fillStyle = shirt;
  roundRect(ctx, -7, -8 + crouchDy, 14, 22, 5);
  ctx.fill();
  // Head.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -16 + crouchDy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath();
  ctx.arc(0, -18 + crouchDy, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  // Arms: aiming a gun forward when requested.
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (gun) {
    ctx.moveTo(0, -4 + crouchDy);
    ctx.lineTo(16, -8 + crouchDy);
    ctx.moveTo(0, -2 + crouchDy);
    ctx.lineTo(15, -2 + crouchDy);
    ctx.stroke();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, -6 + crouchDy);
    ctx.lineTo(26, -6 + crouchDy);
    ctx.stroke();
  } else {
    ctx.moveTo(-6, -4 + crouchDy);
    ctx.lineTo(-11, 8 + crouchDy);
    ctx.moveTo(6, -4 + crouchDy);
    ctx.lineTo(11, 8 + crouchDy);
    ctx.stroke();
  }
  ctx.restore();
}

// A police helicopter: dark silhouette against the bright sky, blurred rotor
// discs and a searchlight cone that lands on the road.
export function drawHelicopter(ctx, x, y, s, opts) {
  const { spotlight = true, label = 'AIR-1' } = opts || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // Searchlight cone down to the road.
  if (spotlight) {
    const cone = ctx.createLinearGradient(0, 20, 0, 330);
    cone.addColorStop(0, 'rgba(255, 244, 200, 0.5)');
    cone.addColorStop(1, 'rgba(255, 244, 200, 0.02)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(-8, 18);
    ctx.lineTo(8, 18);
    ctx.lineTo(95, 330);
    ctx.lineTo(-95, 330);
    ctx.closePath();
    ctx.fill();
  }
  // Tail boom + fin.
  ctx.fillStyle = '#14101f';
  ctx.beginPath();
  ctx.moveTo(-10, -4);
  ctx.lineTo(-150, -16);
  ctx.lineTo(-152, -4);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#14101f';
  ctx.beginPath();
  ctx.moveTo(-150, -16);
  ctx.lineTo(-138, -38);
  ctx.lineTo(-128, -14);
  ctx.closePath();
  ctx.fill();
  // Tail rotor blur.
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#dfe6ff';
  ctx.beginPath();
  ctx.ellipse(-142, -12, 4, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Body.
  ctx.fillStyle = '#1b1526';
  roundRect(ctx, -58, -22, 116, 44, 18);
  ctx.fill();
  // Cockpit glass catching the sunset.
  const glass = ctx.createLinearGradient(30, -20, 58, 10);
  glass.addColorStop(0, '#ff9d5c');
  glass.addColorStop(1, '#2a1b4d');
  ctx.fillStyle = glass;
  roundRect(ctx, 28, -18, 30, 32, 10);
  ctx.fill();
  // Skids.
  ctx.strokeStyle = '#14101f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-48, 26);
  ctx.lineTo(52, 26);
  ctx.moveTo(-40, 22);
  ctx.lineTo(-34, 26);
  ctx.moveTo(36, 22);
  ctx.lineTo(30, 26);
  ctx.stroke();
  // Main rotor: four translucent blur discs, one per blade sweep.
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  for (const tilt of [-0.06, -0.02, 0.02, 0.06]) {
    ctx.beginPath();
    ctx.ellipse(0, -34, 150, 7, tilt, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#0c0a14';
  ctx.fillRect(-6, -40, 12, 6);
  // BCPD marking.
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 6);
  ctx.restore();
}

// Tire smoke in layered puffs: pale outer, grey mid, dark core.
export function drawSmokePuff(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const layers = [
    ['rgba(220, 220, 225, 0.55)', 1.0],
    ['rgba(160, 160, 170, 0.5)', 0.72],
    ['rgba(90, 90, 100, 0.5)', 0.45],
  ];
  for (const [color, rr] of layers) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Debris with motion-blur streaks.
export function drawDebris(ctx, x, y, angle, len, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.lineTo(len * 0.4, 0);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(-3, -2, 6, 4);
  ctx.restore();
}

// Star-shaped muzzle flash with a hot core.
export function drawMuzzleFlash(ctx, x, y, s, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2);
  g.addColorStop(0, 'rgba(255, 240, 170, 0.95)');
  g.addColorStop(0.4, 'rgba(255, 160, 40, 0.7)');
  g.addColorStop(1, 'rgba(255, 80, 20, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? s * 1.6 : s * 0.5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A spent shell casing arcing through the air.
export function drawCasing(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-3, -1, 6, 2);
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-3, 0);
  ctx.stroke();
  ctx.restore();
}
