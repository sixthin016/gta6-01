// Procedural canvas textures: every facade, road, sky and UI screen is painted here.
// No external assets — the game is fully self-contained.
import * as THREE from 'three';
import { makeRng } from './rng.js';

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---- sky: golden-hour gradient, saturated, with sun glow + cloud streaks ----
export function skyTexture(seed = 7) {
  const r = makeRng(seed);
  const [c, g] = cv(1024, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#2b1e63');
  grad.addColorStop(0.28, '#7a2d7d');
  grad.addColorStop(0.48, '#e0497a');
  grad.addColorStop(0.64, '#ff7a3c');
  grad.addColorStop(0.78, '#ffb347');
  grad.addColorStop(1.0, '#ffd98a');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  // sun glow
  const sun = g.createRadialGradient(700, 330, 8, 700, 330, 220);
  sun.addColorStop(0, 'rgba(255,246,200,0.95)');
  sun.addColorStop(0.25, 'rgba(255,190,90,0.55)');
  sun.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = sun; g.fillRect(380, 60, 640, 540);
  g.fillStyle = '#fff6c8';
  g.beginPath(); g.arc(700, 330, 26, 0, Math.PI * 2); g.fill();
  // cloud streaks, warm-lit
  for (let i = 0; i < 26; i++) {
    const y = r.range(30, 300), x = r.range(0, 1024), w = r.range(90, 320), h = r.range(6, 18);
    g.fillStyle = `rgba(255,${Math.floor(r.range(170, 220))},${Math.floor(r.range(140, 190))},${r.range(0.16, 0.42)})`;
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}

// ---- building facade: real window grid, lit windows, shop band + sign ----
export function facadeTexture(opts = {}) {
  const {
    base = '#3d5a80', trim = '#22344d', floors = 9, cols = 6,
    litRatio = 0.45, sign = '', signColor = '#ff5fa2', warm = true, seed = 1,
  } = opts;
  const r = makeRng(seed);
  const W = 256, H = 512;
  const [c, g] = cv(W, H);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // subtle vertical grime + panel lines
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(0,0,0,${r.range(0.03, 0.1)})`;
    g.fillRect(r.range(0, W), 0, r.range(2, 8), H);
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
  for (let f = 0; f <= floors; f++) { const y = 60 + (f * (H - 110)) / floors; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // windows
  const ww = (W - 24) / cols, wh = ((H - 110) / floors) * 0.58;
  for (let f = 0; f < floors; f++) {
    for (let col = 0; col < cols; col++) {
      const x = 12 + col * ww + ww * 0.16, y = 60 + f * ((H - 110) / floors) + ((H - 110) / floors) * 0.2;
      const lit = r.next() < litRatio;
      if (lit) {
        const warmC = warm ? `rgb(${Math.floor(r.range(255, 255))},${Math.floor(r.range(180, 215))},${Math.floor(r.range(90, 140))})` : `rgb(140,${Math.floor(r.range(200, 240))},255)`;
        g.fillStyle = warmC;
        g.fillRect(x, y, ww * 0.68, wh);
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, ww * 0.68, wh * 0.25);
      } else {
        g.fillStyle = '#101c2e'; g.fillRect(x, y, ww * 0.68, wh);
        g.fillStyle = 'rgba(120,170,220,0.28)'; g.fillRect(x, y, ww * 0.68, wh * 0.3);
      }
      g.strokeStyle = trim; g.lineWidth = 3; g.strokeRect(x, y, ww * 0.68, wh);
      g.beginPath(); g.moveTo(x + ww * 0.34, y); g.lineTo(x + ww * 0.34, y + wh); g.stroke();
    }
  }
  // ground floor: shop band with awning + sign
  g.fillStyle = 'rgba(10,10,18,0.9)'; g.fillRect(0, H - 52, W, 52);
  g.fillStyle = signColor; g.fillRect(0, H - 56, W, 6);
  if (sign) {
    g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = signColor;
    g.shadowColor = signColor; g.shadowBlur = 12;
    g.fillText(sign, W / 2, H - 26);
    g.shadowBlur = 0;
  }
  // door + shop glass
  g.fillStyle = '#0c1420'; g.fillRect(14, H - 50, 44, 50);
  g.fillStyle = 'rgba(150,220,255,0.35)'; g.fillRect(66, H - 48, W - 80, 30);
  return tex(c);
}

// ---- skyline windows: dense lit grid for distant towers ----
export function skylineTexture(seed = 3, hue = 'warm') {
  const r = makeRng(seed);
  const [c, g] = cv(256, 512);
  g.fillStyle = hue === 'warm' ? '#1c1430' : '#0e1a2c'; g.fillRect(0, 0, 256, 512);
  for (let y = 8; y < 504; y += 14) {
    for (let x = 8; x < 248; x += 16) {
      if (r.next() < 0.5) {
        g.fillStyle = r.next() < 0.7 ? `rgba(255,${Math.floor(r.range(170, 210))},90,${r.range(0.5, 1)})` : `rgba(120,200,255,${r.range(0.5, 1)})`;
        g.fillRect(x, y, 8, 9);
      }
    }
  }
  return tex(c);
}

// ---- wet asphalt with lane dashes, puddle sheen streaks ----
export function asphaltTexture(seed = 5) {
  const r = makeRng(seed);
  const [c, g] = cv(512, 512);
  g.fillStyle = '#23232b'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${Math.floor(r.range(30, 90))},${Math.floor(r.range(30, 90))},${Math.floor(r.range(35, 100))},0.5)`;
    g.fillRect(r.range(0, 512), r.range(0, 512), r.range(1, 3), r.range(1, 3));
  }
  // wet sheen: warm orange + cool blue streaks, subtle
  for (let i = 0; i < 10; i++) {
    const x = r.range(0, 512);
    const grad = g.createLinearGradient(x, 0, x + 60, 512);
    grad.addColorStop(0, 'rgba(255,150,60,0)');
    grad.addColorStop(0.5, `rgba(255,${Math.floor(r.range(120, 170))},70,${r.range(0.03, 0.09)})`);
    grad.addColorStop(1, 'rgba(80,140,255,0)');
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x + 30, 512); g.lineTo(x - 30, 512); g.closePath(); g.fill();
  }
  // lane dashes
  g.fillStyle = 'rgba(255,220,120,0.85)';
  for (let y = 0; y < 512; y += 64) g.fillRect(252, y, 8, 36);
  g.fillStyle = 'rgba(240,240,240,0.7)';
  g.fillRect(20, 0, 6, 512); g.fillRect(486, 0, 6, 512);
  return tex(c);
}

export function sandTexture(seed = 6) {
  const r = makeRng(seed);
  const [c, g] = cv(256, 256);
  g.fillStyle = '#e8c98f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(${Math.floor(r.range(180, 230))},${Math.floor(r.range(150, 190))},${Math.floor(r.range(100, 140))},0.6)`;
    g.fillRect(r.range(0, 256), r.range(0, 256), 2, 2);
  }
  return tex(c);
}

export function seaTexture(seed = 8) {
  const r = makeRng(seed);
  const [c, g] = cv(512, 256);
  const grad = g.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#0e7d8c'); grad.addColorStop(0.5, '#17a2a8'); grad.addColorStop(1, '#0b5f7a');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    const y = r.range(0, 256); g.beginPath();
    g.moveTo(0, y); g.bezierCurveTo(150, y + r.range(-8, 8), 350, y + r.range(-8, 8), 512, y); g.stroke();
  }
  // sun glitter path
  g.fillStyle = 'rgba(255,200,120,0.25)';
  for (let i = 0; i < 40; i++) g.fillRect(r.range(200, 320), r.range(0, 256), r.range(6, 26), 2);
  return tex(c);
}

// ---- smoke puff sprite ----
export function smokeTexture() {
  const [c, g] = cv(128, 128);
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(235,235,240,0.85)');
  grad.addColorStop(0.55, 'rgba(200,200,210,0.45)');
  grad.addColorStop(1, 'rgba(190,190,200,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return tex(c);
}

// ---- muzzle flash starburst ----
export function muzzleTexture() {
  const [c, g] = cv(128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,220,1)');
  grad.addColorStop(0.3, 'rgba(255,190,60,0.9)');
  grad.addColorStop(1, 'rgba(255,90,0,0)');
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.moveTo(64, 64);
    g.lineTo(64 + Math.cos(a - 0.08) * 62, 64 + Math.sin(a - 0.08) * 62);
    g.lineTo(64 + Math.cos(a + 0.08) * 62, 64 + Math.sin(a + 0.08) * 62);
  }
  g.fill();
  return tex(c);
}

// ---- cracked glass: spiderweb cracks + hole, on dark blue glass ----
export function crackTexture(seed = 11) {
  const r = makeRng(seed);
  const [c, g] = cv(256, 256);
  g.fillStyle = '#16283e'; g.fillRect(0, 0, 256, 256);
  // faint reflected skyline in glass
  g.fillStyle = 'rgba(255,170,90,0.16)'; g.fillRect(0, 150, 256, 40);
  g.fillStyle = 'rgba(120,190,255,0.14)'; g.fillRect(0, 60, 256, 26);
  const cx = 128, cy = 128;
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.5;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r.range(-0.15, 0.15);
    g.beginPath(); g.moveTo(cx, cy);
    let x = cx, y = cy;
    for (let s = 0; s < 4; s++) {
      x += Math.cos(a + r.range(-0.3, 0.3)) * r.range(22, 34);
      y += Math.sin(a + r.range(-0.3, 0.3)) * r.range(22, 34);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5;
  for (const rad of [34, 62, 92]) {
    g.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.25) {
      const rr = rad + r.range(-6, 6);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  // impact hole
  g.fillStyle = '#05080e'; g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.stroke();
  return tex(c);
}

// ---- laptop hacking UI: 3/4 nodes, timer 0:47, hex dump ----
export function laptopTexture() {
  const [c, g] = cv(512, 320);
  g.fillStyle = '#04120a'; g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#0aff66'; g.font = 'bold 22px monospace'; g.textAlign = 'left';
  g.fillText('NEON BAY // BREACH v3.1', 16, 30);
  g.fillStyle = '#ff3b3b'; g.font = 'bold 30px monospace'; g.textAlign = 'right';
  g.fillText('0:47', 496, 34);
  g.textAlign = 'left';
  // nodes
  const nodes = [[90, 110], [250, 80], [410, 120], [250, 190]];
  g.strokeStyle = '#0aff66'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(90, 110); g.lineTo(250, 80); g.lineTo(410, 120); g.lineTo(250, 190); g.lineTo(90, 110); g.stroke();
  nodes.forEach(([x, y], i) => {
    const done = i < 3;
    g.fillStyle = done ? '#0aff66' : '#ff3b3b';
    g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#04120a'; g.font = 'bold 18px monospace'; g.textAlign = 'center';
    g.fillText(done ? '✓' : '!', x, y + 6);
    g.fillStyle = done ? '#0aff66' : '#ff3b3b'; g.font = 'bold 13px monospace';
    g.fillText('NODE ' + (i + 1), x - 26, y + 38);
  });
  g.textAlign = 'left';
  g.fillStyle = '#0aff66'; g.font = 'bold 18px monospace';
  g.fillText('3/4 NODES BREACHED', 16, 250);
  g.fillStyle = '#12351f'; g.fillRect(16, 262, 480, 16);
  g.fillStyle = '#0aff66'; g.fillRect(16, 262, 360, 16);
  g.fillStyle = '#7dffb0'; g.font = '12px monospace';
  g.fillText('> injecting payload…  PROTOTYPE.SYS  [██████░░] 75%', 16, 300);
  return tex(c);
}

// ---- phone GPS: dark map, route, 5/6 ----
export function phoneTexture() {
  const [c, g] = cv(256, 400);
  g.fillStyle = '#0b1526'; g.fillRect(0, 0, 256, 400);
  g.strokeStyle = 'rgba(120,160,220,0.35)'; g.lineWidth = 6;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 60 + i * 70); g.lineTo(256, 50 + i * 70); g.stroke(); }
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * 60, 0); g.lineTo(50 + i * 60, 400); g.stroke(); }
  // route
  g.strokeStyle = '#2ee6ff'; g.lineWidth = 8; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(40, 360); g.lineTo(90, 260); g.lineTo(80, 170); g.lineTo(170, 120); g.lineTo(200, 60); g.stroke();
  g.fillStyle = '#ff3b6b'; g.beginPath(); g.arc(200, 60, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2ee6ff'; g.beginPath(); g.arc(40, 360, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 30px Arial'; g.textAlign = 'center';
  g.fillText('5/6', 128, 40);
  g.font = 'bold 15px Arial'; g.fillStyle = '#9fe8ff';
  g.fillText('DROP POINT  •  2.1 km', 128, 66);
  g.fillStyle = '#7dff9a'; g.font = 'bold 16px Arial';
  g.fillText('ETA 01:12', 128, 388);
  return tex(c);
}

// ---- smartwatch face: 5 red stars + crew health ----
export function watchTexture() {
  const [c, g] = cv(256, 256);
  g.fillStyle = '#05070d'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#ff2e4d'; g.font = 'bold 44px Arial'; g.textAlign = 'center';
  g.fillText('★★★★★', 128, 78);
  g.fillStyle = '#fff'; g.font = 'bold 20px Arial';
  g.fillText('BCPD ALERT', 128, 112);
  const rows = [['MACER', 0.78, '#37e08a'], ['KAYLA', 0.92, '#37e08a'], ['DRIVER', 1.0, '#37e08a']];
  rows.forEach(([nm, v, col], i) => {
    const y = 150 + i * 34;
    g.fillStyle = '#cfe6ff'; g.font = 'bold 16px Arial'; g.textAlign = 'left';
    g.fillText(nm, 24, y);
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(110, y - 12, 110, 12);
    g.fillStyle = col; g.fillRect(110, y - 12, 110 * v, 12);
    g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(Math.round(v * 100) + '%', 244, y);
  });
  return tex(c);
}

// ---- heli cockpit panel: ESCAPE 2.3km ----
export function heliPanelTexture() {
  const [c, g] = cv(256, 160);
  g.fillStyle = '#0a1410'; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = '#37e08a'; g.lineWidth = 3; g.strokeRect(4, 4, 248, 152);
  g.fillStyle = '#7dff9a'; g.font = 'bold 26px monospace'; g.textAlign = 'center';
  g.fillText('ESCAPE 2.3km', 128, 48);
  g.fillStyle = '#ffb84d'; g.font = 'bold 18px monospace';
  g.fillText('AIR-1 • ALT 180m', 128, 82);
  g.fillStyle = '#9fe8ff'; g.font = '15px monospace';
  g.fillText('ROTOR 100%  FUEL 62%', 128, 112);
  g.fillText('BCPD PURSUIT: 4 UNITS', 128, 138);
  return tex(c);
}

// ---- billboard neon ----
export function billboardTexture(text, color = '#ff5fa2', sub = '') {
  const [c, g] = cv(512, 256);
  g.fillStyle = '#0d0a1e'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(8, 8, 496, 240);
  g.fillStyle = color; g.font = 'bold 64px Arial'; g.textAlign = 'center';
  g.shadowColor = color; g.shadowBlur = 24;
  g.fillText(text, 256, 120);
  g.shadowBlur = 0;
  if (sub) { g.fillStyle = '#fff'; g.font = 'bold 28px Arial'; g.fillText(sub, 256, 180); }
  return tex(c);
}

// ---- striped market awning ----
export function awningTexture(c1 = '#ff5f6d', c2 = '#fff3e0') {
  const [c, g] = cv(256, 128);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 32, 0, 32, 128); }
  g.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 8; i++) g.fillRect(i * 32, 100, 32, 28);
  return tex(c);
}

// ---- server rack front with LEDs ----
export function rackTexture(seed = 21) {
  const r = makeRng(seed);
  const [c, g] = cv(128, 256);
  g.fillStyle = '#14161c'; g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 22) {
    g.fillStyle = '#1e2129'; g.fillRect(6, y, 116, 18);
    for (let x = 12; x < 116; x += 14) {
      const on = r.next();
      g.fillStyle = on < 0.5 ? '#37e08a' : on < 0.8 ? '#ffb84d' : (r.next() < 0.12 ? '#ff3b3b' : '#223');
      g.fillRect(x, y + 6, 7, 7);
    }
  }
  return tex(c);
}

// ---- "PROTOTYPE" drive label ----
export function prototypeTexture() {
  const [c, g] = cv(128, 64);
  g.fillStyle = '#1a0505'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#ff3b3b'; g.font = 'bold 20px monospace'; g.textAlign = 'center';
  g.shadowColor = '#ff3b3b'; g.shadowBlur = 10;
  g.fillText('PROTOTYPE', 64, 28);
  g.fillStyle = '#ffb84d'; g.font = 'bold 12px monospace';
  g.fillText('● REC', 64, 50);
  return tex(c);
}

// ---- bullet-hole decal (transparent) ----
export function bulletHoleTexture() {
  const [c, g] = cv(64, 64);
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(5,5,8,0.95)';
  g.beginPath(); g.arc(32, 32, 9, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(40,40,46,0.9)'; g.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    g.beginPath(); g.moveTo(32 + Math.cos(a) * 9, 32 + Math.sin(a) * 9);
    g.lineTo(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20); g.stroke();
  }
  return tex(c);
}

// ---- blood splat decal (transparent) ----
export function bloodTexture() {
  const r = makeRng(31);
  const [c, g] = cv(128, 128);
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(140,10,16,0.92)';
  g.beginPath(); g.ellipse(64, 64, 34, 22, 0.4, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 12; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(30, 55);
    g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r.range(2, 7), 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}

// ---- soft round glow sprite (flashbang / sun glare) ----
export function glowTexture(inner = 'rgba(255,255,240,1)', outer = 'rgba(255,200,90,0)') {
  const [c, g] = cv(256, 256);
  const grad = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  grad.addColorStop(0, inner); grad.addColorStop(0.4, 'rgba(255,220,140,0.55)'); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return tex(c);
}
