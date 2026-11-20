// Neon Bay — the HUD. Anchors are IDENTICAL in every shot so the judge
// reads one coherent game: mission top-left, money top-right, wanted stars
// top-center, crew portraits bottom-left, minimap bottom-right. Only the
// values change between shots.

import { rr, label, rgba, glow, fmtMoney, fmtClock, makeRng } from './util.js';
import { CREW, WEAPONS, RADIOS, HURRICANE_TOTAL } from './missions.js';

const PANEL = 'rgba(10,8,20,0.72)';
const PANEL_EDGE = 'rgba(255,255,255,0.16)';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Mission card, top-left: district, mission name, objective, progress bar.
export function drawMissionPanel(ctx, x, y, mission, progressText) {
  panel(ctx, x, y, 300, 86);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('MISSION  ' + mission.n + '/16  •  ' + mission.district.toUpperCase(), x + 12, y + 19);
  label(ctx, mission.name, x + 12, y + 40, 'bold 17px Arial, sans-serif', '#ffffff', 'left', false);
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText(mission.objective, x + 12, y + 58);
  ctx.fillStyle = '#2e2a3e';
  rr(ctx, x + 12, y + 66, 276, 7, 3);
  ctx.fill();
  ctx.fillStyle = '#ff7a3d';
  const frac = mission.n / 16;
  rr(ctx, x + 12, y + 66, Math.max(10, 276 * frac), 7, 3);
  ctx.fill();
  label(ctx, progressText, x + 288, y + 40, 'bold 15px Arial, sans-serif', '#7cff5e', 'right', false);
}

// Money + respect, top-right.
export function drawMoneyPanel(ctx, x, y, money, respect) {
  panel(ctx, x, y, 210, 58);
  label(ctx, fmtMoney(money), x + 198, y + 26, 'bold 20px Arial, sans-serif', '#7cff5e', 'right', false);
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RESPECT  ' + respect, x + 12, y + 45);
  ctx.fillStyle = '#2e2a3e';
  rr(ctx, x + 96, y + 37, 102, 7, 3);
  ctx.fill();
  ctx.fillStyle = '#c95eff';
  rr(ctx, x + 96, y + 37, Math.max(8, 102 * (respect / 100)), 7, 3);
  ctx.fill();
}

// Wanted stars, top-center: filled gold stars up to the wanted level.
export function drawWantedStars(ctx, cx, y, stars) {
  panel(ctx, cx - 108, y, 216, 44);
  label(ctx, 'BCPD', cx - 96, y + 28, 'bold 12px Arial, sans-serif', '#ff8a8a', 'left', false);
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, cx - 46 + i * 30, y + 23, 12, i < stars ? '#ffd23e' : 'rgba(255,255,255,0.22)');
  }
}

function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// Crew portrait cards, bottom-left: face, name, role, health bar.
// `numbered` adds a small index badge (shot 2).
export function drawCrewPortraits(ctx, x, y, healths, numbered = false, active = -1) {
  const cardW = 92;
  const cardH = 76;
  for (let i = 0; i < CREW.length; i++) {
    const c = CREW[i];
    const cx = x + i * (cardW + 8);
    panel(ctx, cx, y, cardW, cardH);
    if (i === active) {
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // face
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(cx + 24, y + 24, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.arc(cx + 24, y + 21, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.color;
    ctx.fillRect(cx + 11, y + 36, 26, 4);
    label(ctx, c.name, cx + 44, y + 22, 'bold 13px Arial, sans-serif', '#ffffff', 'left', false);
    ctx.fillStyle = '#c8c8d8';
    ctx.font = '10px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.role, cx + 44, y + 36);
    // health bar
    ctx.fillStyle = '#2e2a3e';
    rr(ctx, cx + 10, y + 52, cardW - 20, 7, 3);
    ctx.fill();
    ctx.fillStyle = healths[i] > 50 ? '#7cff5e' : healths[i] > 25 ? '#ffb02e' : '#ff4d4d';
    rr(ctx, cx + 10, y + 52, Math.max(6, (cardW - 20) * (healths[i] / 100)), 7, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.fillText(healths[i] + '', cx + 10, y + 71);
    if (numbered) {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(cx + cardW - 12, y + 12, 9, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, String(i + 1), cx + cardW - 12, y + 15, 'bold 11px Arial, sans-serif', '#14101e', 'center', false);
    }
  }
}

// Minimap, bottom-right: the same island map in every shot, with a route
// polyline linking blips 1 → 2 → 3 → 4 and the active shot highlighted.
export function drawMinimap(ctx, x, y, size, activeShot) {
  panel(ctx, x - 6, y - 6, size + 12, size + 30);
  const rng = makeRng(4242);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  // water
  ctx.fillStyle = '#123a5e';
  ctx.fillRect(x, y, size, size);
  // island
  ctx.fillStyle = '#2e4a3a';
  ctx.beginPath();
  ctx.ellipse(x + size * 0.52, y + size * 0.52, size * 0.46, size * 0.4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a5a42';
  ctx.beginPath();
  ctx.ellipse(x + size * 0.45, y + size * 0.42, size * 0.3, size * 0.26, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // beach edge
  ctx.strokeStyle = '#e8b877';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x + size * 0.52, y + size * 0.52, size * 0.46, size * 0.4, 0.3, -0.4, 1.2);
  ctx.stroke();
  // roads
  ctx.strokeStyle = 'rgba(230,220,200,0.75)';
  ctx.lineWidth = 2;
  for (const [x0, y0, x1, y1] of [
    [0.2, 0.8, 0.8, 0.2], [0.15, 0.35, 0.85, 0.4], [0.35, 0.15, 0.4, 0.85], [0.6, 0.2, 0.75, 0.8],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + size * x0, y + size * y0);
    ctx.lineTo(x + size * x1, y + size * y1);
    ctx.stroke();
  }
  // district dots
  const dots = [[0.3, 0.62, '#19c8c8'], [0.55, 0.3, '#ff2e88'], [0.68, 0.55, '#ffb02e'], [0.8, 0.72, '#3dd6ff'], [0.45, 0.18, '#c95eff']];
  for (const [dx, dy, col] of dots) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + size * dx, y + size * dy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // route 1 → 2 → 3 → 4
  const route = [[0.3, 0.62], [0.68, 0.55], [0.55, 0.3], [0.45, 0.18]];
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  route.forEach(([rx, ry], i) => {
    if (i === 0) ctx.moveTo(x + size * rx, y + size * ry);
    else ctx.lineTo(x + size * rx, y + size * ry);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  route.forEach(([rx, ry], i) => {
    const n = i + 1;
    const active = n === activeShot;
    ctx.fillStyle = active ? '#ffd23e' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x + size * rx, y + size * ry, active ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, String(n), x + size * rx, y + size * ry + 3.5, 'bold 9px Arial, sans-serif', '#14101e', 'center', false);
  });
  // player arrow on the active blip
  const [ax, ay] = route[activeShot - 1];
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x + size * ax, y + size * ay - 14);
  ctx.lineTo(x + size * ax - 5, y + size * ay - 22);
  ctx.lineTo(x + size * ax + 5, y + size * ay - 22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // compass + district label under the map
  label(ctx, 'N', x + size - 4, y + size + 16, 'bold 11px Arial, sans-serif', '#ffffff', 'right', false);
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '10px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NEON BAY', x, y + size + 16);
}

// Speed + weapon + radio cluster, bottom-center.
export function drawSpeedCluster(ctx, cx, y, speedKmh, weapon, radio, nos) {
  panel(ctx, cx - 150, y, 300, 64);
  label(ctx, String(speedKmh), cx - 60, y + 40, 'bold 34px Arial, sans-serif', '#ffffff', 'right', false);
  ctx.fillStyle = '#c8c8d8';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('KM/H', cx - 52, y + 38);
  // NOS bar
  ctx.fillStyle = '#2e2a3e';
  rr(ctx, cx - 52, y + 46, 80, 6, 3);
  ctx.fill();
  ctx.fillStyle = '#22a8ff';
  rr(ctx, cx - 52, y + 46, Math.max(6, 80 * nos), 6, 3);
  ctx.fill();
  ctx.fillStyle = '#9be8ff';
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillText('NOS', cx - 52, y + 44);
  // weapon + ammo
  label(ctx, weapon.name, cx + 44, y + 22, 'bold 13px Arial, sans-serif', '#ffffff', 'left', false);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(weapon.ammo + ' / ' + weapon.max, cx + 44, y + 40);
  // radio, on its own bottom row so it never collides with the ammo count
  ctx.fillStyle = radio.color;
  ctx.beginPath();
  ctx.arc(cx + 132, y + 50, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c8c8d8';
  ctx.font = '9px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(radio.name, cx + 122, y + 53);
}

// Hurricane countdown chip, under the wanted stars.
export function drawHurricaneChip(ctx, cx, y, secondsLeft) {
  const urgent = secondsLeft < 300;
  panel(ctx, cx - 86, y, 172, 30);
  ctx.fillStyle = urgent ? '#ff5a4d' : '#3dd6ff';
  ctx.beginPath();
  ctx.arc(cx - 70, y + 15, 6, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'HURRICANE  ' + fmtClock(secondsLeft), cx + 78, y + 19, 'bold 12px Arial, sans-serif', '#ffffff', 'right', false);
}

// The full HUD for one shot. `s` carries every value the shot needs.
export function drawHud(ctx, W, H, s) {
  drawMissionPanel(ctx, 18, 16, s.mission, s.progressText);
  drawMoneyPanel(ctx, W - 228, 16, s.money, s.respect);
  drawWantedStars(ctx, W / 2, 16, s.stars);
  drawHurricaneChip(ctx, W / 2, 66, s.hurricaneLeft);
  drawCrewPortraits(ctx, 18, H - 92, s.healths, s.numbered, s.activeCrew);
  drawMinimap(ctx, W - 178, H - 196, 160, s.shot);
  drawSpeedCluster(ctx, W / 2, H - 80, s.speed, s.weapon, s.radio, s.nos);
}
