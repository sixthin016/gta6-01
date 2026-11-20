// Neon Bay — people: colorful pedestrians, the three crew members in action
// poses, BCPD officers doing bounding overwatch, and SWAT rappelling from
// the helicopter. Everyone is drawn as a small vector figure with a shirt,
// skin, hair and legs — never a black block.

import { makeRng, rgba } from './util.js';

const SHIRTS = ['#ff5a7a', '#3dd6ff', '#ffd23e', '#7cff5e', '#c95eff', '#ff9a3d', '#4ae8a8', '#ff8ac2'];
const SKINS = ['#e8b48a', '#c98d64', '#8a5a34', '#f0c8a0', '#6e4426'];
const PANTS = ['#2e3a5e', '#3a2e4e', '#4e2e2e', '#2e4e3a', '#1c1c26'];

// A pedestrian seen from behind/side at a given scale. `pose` shifts the legs.
export function drawPedestrian(ctx, x, y, s, seed, opts = {}) {
  const rng = makeRng(seed);
  const shirt = opts.shirt || rng.pick(SHIRTS);
  const skin = opts.skin || rng.pick(SKINS);
  const pants = opts.pants || rng.pick(PANTS);
  const hair = opts.hair || rng.pick(['#1c1a22', '#3a2a1a', '#6e4a2a', '#0e0c10', '#8a8a92']);
  const walk = opts.walk ?? 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // shadow
  ctx.fillStyle = 'rgba(8,5,18,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // legs
  ctx.strokeStyle = pants;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(-4 + walk * 3, 0);
  ctx.moveTo(0, -16);
  ctx.lineTo(4 - walk * 3, 0);
  ctx.stroke();
  // torso
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(-7, -30);
  ctx.lineTo(7, -30);
  ctx.lineTo(6, -15);
  ctx.lineTo(-6, -15);
  ctx.closePath();
  ctx.fill();
  // arms
  ctx.strokeStyle = shirt;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-6, -28);
  ctx.lineTo(-9, -16 + walk * 2);
  ctx.moveTo(6, -28);
  ctx.lineTo(9, -16 - walk * 2);
  ctx.stroke();
  // head + hair
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -36, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -38, 6.5, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A crew member crouched behind cover, aiming a rifle. `color` is their
// signature color; `flash` draws the muzzle flash at the barrel tip.
export function drawCrewShooter(ctx, x, y, s, color, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(8,5,18,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // crouched legs
  ctx.strokeStyle = '#23232e';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -14);
  ctx.lineTo(-12, 0);
  ctx.moveTo(2, -14);
  ctx.lineTo(12, 0);
  ctx.stroke();
  // torso leaning forward
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-8, -32);
  ctx.lineTo(10, -34);
  ctx.lineTo(12, -16);
  ctx.lineTo(-6, -14);
  ctx.closePath();
  ctx.fill();
  // head
  ctx.fillStyle = '#e8b48a';
  ctx.beginPath();
  ctx.arc(10, -38, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1a22';
  ctx.beginPath();
  ctx.arc(10, -40, 6.5, Math.PI, Math.PI * 2);
  ctx.fill();
  // rifle pointing right
  ctx.strokeStyle = '#14101c';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(8, -26);
  ctx.lineTo(38, -30);
  ctx.stroke();
  ctx.fillStyle = '#2e2a3e';
  ctx.fillRect(30, -33, 10, 5);
  if (opts.flash) {
    const fg = ctx.createRadialGradient(42, -30, 0, 42, -30, 16);
    fg.addColorStop(0, 'rgba(255,240,170,0.95)');
    fg.addColorStop(0.4, 'rgba(255,160,40,0.7)');
    fg.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(40, -30);
    ctx.lineTo(58, -38);
    ctx.lineTo(54, -30);
    ctx.lineTo(58, -22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, -30, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// A BCPD officer in a bounding-overwatch advance: low run, rifle ready.
export function drawCop(ctx, x, y, s, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(8,5,18,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // legs mid-stride
  ctx.strokeStyle = '#141a2e';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(-11, 1);
  ctx.moveTo(0, -16);
  ctx.lineTo(10, -2);
  ctx.stroke();
  // navy uniform + vest
  ctx.fillStyle = '#1c2a4e';
  ctx.beginPath();
  ctx.moveTo(-7, -32);
  ctx.lineTo(8, -33);
  ctx.lineTo(9, -15);
  ctx.lineTo(-6, -14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0e1424';
  ctx.fillRect(-6, -30, 14, 8);
  // cap + head
  ctx.fillStyle = '#c98d64';
  ctx.beginPath();
  ctx.arc(8, -38, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#141a2e';
  ctx.beginPath();
  ctx.arc(8, -40, 6, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(2, -42, 14, 3);
  // rifle
  ctx.strokeStyle = '#0e0c16';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(6, -26);
  ctx.lineTo(34, -30);
  ctx.stroke();
  if (opts.flash) {
    ctx.fillStyle = 'rgba(255,220,120,0.9)';
    ctx.beginPath();
    ctx.moveTo(34, -30);
    ctx.lineTo(48, -36);
    ctx.lineTo(46, -30);
    ctx.lineTo(48, -24);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// SWAT operator sliding down a rope from the helicopter.
export function drawSwatRappel(ctx, ropeX, topY, y, s, seed) {
  const rng = makeRng(seed);
  ctx.save();
  ctx.strokeStyle = 'rgba(220,220,230,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ropeX, topY);
  ctx.lineTo(ropeX, y + 30);
  ctx.stroke();
  ctx.translate(ropeX, y);
  ctx.scale(s, s);
  // legs braced on the rope
  ctx.strokeStyle = '#1a1a22';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(-8, 4);
  ctx.moveTo(0, -12);
  ctx.lineTo(8, 2);
  ctx.stroke();
  // dark tac gear + vest
  ctx.fillStyle = '#23232e';
  ctx.beginPath();
  ctx.moveTo(-8, -30);
  ctx.lineTo(8, -30);
  ctx.lineTo(7, -12);
  ctx.lineTo(-7, -12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(-7, -28, 14, 7);
  // helmet + visor
  ctx.fillStyle = '#1a1a22';
  ctx.beginPath();
  ctx.arc(0, -36, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(140,220,255,0.55)';
  ctx.fillRect(1, -39, 6, 5);
  // one hand on the rope, one on the rifle
  ctx.strokeStyle = '#23232e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(0, -44);
  ctx.stroke();
  ctx.restore();
}

// A standing figure seen from the front — used for the heist interior crew.
export function drawStandingCrew(ctx, x, y, s, color, role) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(8,5,18,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#23232e';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(-4, 0);
  ctx.moveTo(0, -16);
  ctx.lineTo(4, 0);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-8, -32);
  ctx.lineTo(8, -32);
  ctx.lineTo(7, -15);
  ctx.lineTo(-7, -15);
  ctx.closePath();
  ctx.fill();
  // arms toward a console / keyboard
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-7, -28);
  ctx.lineTo(-13, -18);
  ctx.moveTo(7, -28);
  ctx.lineTo(13, -18);
  ctx.stroke();
  ctx.fillStyle = '#e8b48a';
  ctx.beginPath();
  ctx.arc(0, -38, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1a22';
  ctx.beginPath();
  ctx.arc(0, -40, 6.5, Math.PI, Math.PI * 2);
  ctx.fill();
  if (role) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 8px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(role, 0, -48);
  }
  ctx.restore();
}
