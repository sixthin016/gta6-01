// Procedural canvas textures — every facade is real (window grids, lit glass, signage),
// never a flat colored box. All textures are drawn at load; no image files, no network.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

// A building face: base color, window grid (some glass lit warm), ground-floor shopfront + sign.
export function facadeTexture(opts) {
  const { base = '#3a5a7a', floors = 8, cols = 6, lit = 0.45, sign = '', signColor = '#ffd75e' } = opts || {};
  const [c, g] = canvas(256, 512);
  g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  // subtle vertical grime + floor separators
  for (let f = 0; f < floors; f++) {
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(0, (f * 512) / floors, 256, 3);
  }
  const winW = 256 / cols, winH = (512 * 0.82) / floors;
  for (let f = 0; f < floors; f++) {
    for (let col = 0; col < cols; col++) {
      const x = col * winW + winW * 0.18, y = 14 + f * winH + winH * 0.18;
      const w = winW * 0.64, h = winH * 0.6;
      const litWin = Math.random() < lit;
      g.fillStyle = litWin ? (Math.random() < 0.6 ? '#ffd98a' : '#ffe9b8') : '#16222e';
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.fillRect(x, y, w, 3);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
      g.strokeRect(x, y, w, h);
      if (litWin) { g.fillStyle = 'rgba(255,180,80,0.25)'; g.fillRect(x, y + h * 0.55, w, h * 0.45); }
    }
  }
  // ground floor: shopfront glass + awning + sign band
  const gy = 512 * 0.84;
  g.fillStyle = shade(base, 0.55); g.fillRect(0, gy, 256, 512 - gy);
  g.fillStyle = '#101c28'; g.fillRect(10, gy + 14, 236, 512 - gy - 26);
  g.fillStyle = 'rgba(255,220,140,0.75)'; g.fillRect(14, gy + 18, 228, 10);
  g.fillStyle = '#0c1420'; g.fillRect(16, gy + 34, 100, 512 - gy - 48);
  g.fillStyle = '#0c1420'; g.fillRect(140, gy + 34, 100, 512 - gy - 48);
  if (sign) {
    g.fillStyle = '#0a0a14'; g.fillRect(0, gy - 34, 256, 34);
    g.font = 'bold 24px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = signColor; g.shadowBlur = 14; g.fillStyle = signColor;
    g.fillText(sign.slice(0, 12), 128, gy - 16);
  }
  const t = tex(c);
  return t;
}

// Wet asphalt: dark base, lane dashes, pale wet streaks that catch the sunset.
export function roadTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#23232e'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  g.fillStyle = '#f2d060';
  for (let y = 0; y < 256; y += 64) g.fillRect(126, y + 8, 4, 34);
  g.fillStyle = 'rgba(255,150,90,0.16)';
  for (let i = 0; i < 7; i++) g.fillRect(Math.random() * 200, 0, 8 + Math.random() * 20, 256);
  g.fillStyle = 'rgba(120,200,255,0.10)';
  g.fillRect(30, 0, 26, 256);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function sandTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#e8c890'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(190,150,90,0.5)' : 'rgba(255,235,190,0.5)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function grassTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#3f7a3a'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(30,90,30,0.6)' : 'rgba(120,180,80,0.5)';
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 3);
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// Glowing neon sign board.
export function neonSignTexture(text, color) {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#0a0616'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
  g.font = 'bold 56px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 26; g.fillStyle = color;
  g.fillText(text, 256, 66);
  g.shadowBlur = 0; g.fillStyle = '#ffffff';
  g.fillText(text, 256, 66);
  return tex(c);
}

export function billboardTexture(lines, bg, fg) {
  const [c, g] = canvas(512, 256);
  g.fillStyle = bg || '#101030'; g.fillRect(0, 0, 512, 256);
  g.font = 'bold 52px Arial'; g.textAlign = 'center';
  (lines || []).forEach((line, i) => {
    g.fillStyle = fg || '#ffd75e';
    g.shadowColor = fg || '#ffd75e'; g.shadowBlur = 18;
    g.fillText(line, 256, 84 + i * 66);
  });
  return tex(c);
}

// Diegetic prop screens -------------------------------------------------------
export function gpsTexture() {
  const [c, g] = canvas(256, 384);
  g.fillStyle = '#0d1b2e'; g.fillRect(0, 0, 256, 384);
  g.fillStyle = '#12324a'; g.fillRect(0, 0, 256, 44);
  g.fillStyle = '#fff'; g.font = 'bold 22px Arial'; g.textAlign = 'left';
  g.fillText('NEON NAV', 12, 30);
  g.fillStyle = '#2ee6ff'; g.font = 'bold 20px Arial'; g.fillText('5/6', 200, 30);
  g.strokeStyle = '#2a4a66'; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 90 + i * 56); g.lineTo(256, 90 + i * 56); g.stroke(); }
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(50 + i * 52, 44); g.lineTo(50 + i * 52, 384); g.stroke(); }
  g.strokeStyle = '#ffd75e'; g.lineWidth = 7; g.beginPath();
  g.moveTo(30, 350); g.lineTo(90, 260); g.lineTo(150, 280); g.lineTo(210, 130); g.stroke();
  g.fillStyle = '#ff2e63'; g.beginPath(); g.arc(210, 130, 12, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 17px Arial';
  g.fillText('MARINA DROP-OFF', 18, 372);
  g.fillStyle = '#7dff9a'; g.font = 'bold 15px Arial';
  g.fillText('ETA 2:14 · 1.2 km', 18, 66);
  return tex(c);
}

export function watchTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#05050c'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffd75e'; g.font = 'bold 26px Arial'; g.textAlign = 'center';
  g.fillText('★★★★★', 64, 40);
  g.fillStyle = '#ff5e8a'; g.font = 'bold 20px Arial';
  g.fillText('17:42', 64, 72);
  g.fillStyle = '#2ee6ff'; g.font = '13px Arial';
  g.fillText('MARA 78% · JAX 92%', 64, 96);
  g.strokeStyle = '#2ee6ff'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 120);
  return tex(c);
}

// Hacking minigame: 3 of 4 nodes done, timer 0:47 — the laptop screen IS the UI.
export function laptopTexture() {
  const [c, g] = canvas(512, 320);
  g.fillStyle = '#04140a'; g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#37e07a'; g.font = 'bold 26px Arial'; g.textAlign = 'left';
  g.fillText('VANTARA // BREACH', 18, 38);
  g.fillStyle = '#ff5e5e'; g.font = 'bold 30px Arial'; g.textAlign = 'right';
  g.fillText('0:47', 494, 38);
  const nodes = [[86, 130], [220, 100], [360, 150], [430, 240]];
  g.strokeStyle = '#37e07a'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(86, 130); g.lineTo(220, 100); g.lineTo(360, 150); g.lineTo(430, 240); g.stroke();
  nodes.forEach(([x, y], i) => {
    const done = i < 3;
    g.fillStyle = done ? '#37e07a' : '#ff5e5e';
    g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill();
    g.fillStyle = '#04140a'; g.font = 'bold 22px Arial'; g.textAlign = 'center';
    g.fillText(done ? '✓' : '!', x, y + 8);
  });
  g.fillStyle = '#37e07a'; g.font = 'bold 22px Arial'; g.textAlign = 'left';
  g.fillText('NODES 3/4 · PROTOTYPE DRIVE', 18, 292);
  g.fillStyle = '#0d3a1e'; g.fillRect(300, 268, 194, 16);
  g.fillStyle = '#37e07a'; g.fillRect(300, 268, 145, 16);
  return tex(c);
}

// Heli cockpit HUD seen through the open door.
export function heliHudTexture() {
  const [c, g] = canvas(512, 256);
  g.fillStyle = 'rgba(4,20,10,0.92)'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#37e07a'; g.lineWidth = 3;
  g.beginPath(); g.arc(256, 128, 84, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(256, 30); g.lineTo(256, 226); g.moveTo(158, 128); g.lineTo(354, 128); g.stroke();
  g.fillStyle = '#37e07a'; g.font = 'bold 30px Arial'; g.textAlign = 'center';
  g.fillText('ESCAPE 2.3 km', 256, 60);
  g.font = 'bold 22px Arial';
  g.fillText('ALT 240 m · SPD 210', 256, 210);
  g.fillStyle = '#ff5e5e'; g.font = 'bold 20px Arial';
  g.fillText('▲ AIR ONE · GUNNER READY', 256, 244);
  return tex(c);
}

// Concrete barrier: 7 bullet holes + 2 blood splats.
export function barrierTexture() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = '#8a8a86'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
    g.fillRect(Math.random() * 256, Math.random() * 128, 3, 3);
  }
  g.fillStyle = '#ffd75e'; g.font = 'bold 20px Arial'; g.textAlign = 'center';
  g.fillText('BCPD', 128, 26);
  const holes = [[40, 70], [80, 52], [120, 84], [150, 60], [185, 76], [215, 54], [100, 104]];
  holes.forEach(([x, y]) => {
    g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
    g.fillStyle = 'rgba(60,60,60,0.8)'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
  });
  [[60, 96], [205, 100]].forEach(([x, y]) => {
    g.fillStyle = 'rgba(160,10,10,0.85)';
    g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill();
    g.beginPath(); g.arc(x + 14, y + 6, 6, 0, 7); g.fill();
    g.beginPath(); g.arc(x - 12, y + 8, 5, 0, 7); g.fill();
  });
  return tex(c);
}

// Server rack face: LED strips, one PROTOTYPE drive with red blinking LED.
export function rackTexture(proto) {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#14161c'; g.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 8; r++) {
    const y = 10 + r * 30;
    g.fillStyle = '#1e222c'; g.fillRect(8, y, 112, 24);
    g.fillStyle = r === 3 && proto ? '#ff2e2e' : (Math.random() < 0.7 ? '#37e07a' : '#2ee6ff');
    g.fillRect(14, y + 9, 8, 6);
    g.fillStyle = '#3a4152'; g.fillRect(30, y + 8, 60, 8);
    if (r === 3 && proto) {
      g.fillStyle = '#ff2e2e'; g.font = 'bold 11px Arial'; g.textAlign = 'left';
      g.fillText('PROTOTYPE', 30, y + 8);
    }
  }
  return tex(c);
}

// Golden-hour sky gradient: orange horizon → magenta → deep violet top.
export function skyTexture() {
  const [c, g] = canvas(1024, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2a1a5e');
  grad.addColorStop(0.38, '#7a2a6e');
  grad.addColorStop(0.58, '#e85a6b');
  grad.addColorStop(0.72, '#ff9a4d');
  grad.addColorStop(0.82, '#ffc46b');
  grad.addColorStop(1, '#ffe9a8');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  // sun disc glow, low on the horizon
  const sun = g.createRadialGradient(300, 400, 8, 300, 400, 150);
  sun.addColorStop(0, 'rgba(255,240,190,0.9)');
  sun.addColorStop(0.3, 'rgba(255,190,90,0.7)');
  sun.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 512);
  // soft clouds
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 1024, y = 60 + Math.random() * 220;
    const w = 90 + Math.random() * 180, h = 12 + Math.random() * 22;
    const cg = g.createRadialGradient(x, y, 2, x, y, w / 2);
    cg.addColorStop(0, 'rgba(255,200,180,0.28)');
    cg.addColorStop(1, 'rgba(255,200,180,0)');
    g.fillStyle = cg;
    g.save(); g.translate(x, y); g.scale(1, h / w); g.translate(-x, -y);
    g.beginPath(); g.arc(x, y, w / 2, 0, 7); g.fill(); g.restore();
  }
  const t = tex(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}
