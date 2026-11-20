// Neon Bay — the HUD. One job: draw every HUD panel at identical anchors in
// every shot and in live play: mission top-left, money top-right, wanted
// stars top-centre, crew portraits bottom-left, minimap bottom-right.
import { CANVAS_W, CANVAS_H, CREW, formatMoney, formatClock } from './config.js';
import { roundRect, glowText } from './draw.js';

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 8, 22, 0.72)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// Mission card, top-left.
export function drawMissionCard(ctx, mission, objective, progress) {
  panel(ctx, 18, 16, 330, 86);
  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 13px Arial';
  ctx.fillText(`MISSION ${String(mission.n).padStart(2, '0')} — ${mission.name}`, 32, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px Arial';
  ctx.fillText(objective, 32, 64);
  ctx.fillStyle = '#7ee7ff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(progress, 32, 88);
  ctx.restore();
}

// Cash, top-right.
export function drawMoney(ctx, cash, respect) {
  panel(ctx, CANVAS_W - 248, 16, 230, 86);
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7bff9e';
  ctx.font = 'bold 26px Arial';
  ctx.fillText(formatMoney(cash), CANVAS_W - 34, 52);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 13px Arial';
  ctx.fillText(`RESPECT ${respect}  •  CREW ${CREW.length}/3`, CANVAS_W - 34, 76);
  ctx.fillStyle = '#9aa0b5';
  ctx.font = '11px Arial';
  ctx.fillText('CASH', CANVAS_W - 34, 92 - 62);
  ctx.restore();
}

// Wanted stars + hurricane clock, top-centre.
export function drawWantedStars(ctx, stars, hurricaneSeconds) {
  const cx = CANVAS_W / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10, 8, 22, 0.72)';
  roundRect(ctx, cx - 150, 12, 300, 62, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = '#ff8fa3';
  ctx.fillText('BCPD  •  HURRICANE LANDFALL ' + formatClock(hurricaneSeconds), cx, 30);
  for (let i = 0; i < 5; i++) {
    const sx = cx - 88 + i * 44;
    const sy = 56;
    drawStar(ctx, sx, sy, i < stars ? 15 : 13, i < stars ? '#ffd166' : 'rgba(255,255,255,0.22)');
  }
  ctx.restore();
}

export function drawStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  if (color === '#ffd166') {
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Crew portraits, bottom-left: face, name, role, health bar.
export function drawCrewPortraits(ctx, crewState) {
  const y = CANVAS_H - 118;
  crewState.forEach((member, i) => {
    const x = 18 + i * 108;
    panel(ctx, x, y, 98, 100);
    ctx.save();
    // Portrait tile.
    const g = ctx.createLinearGradient(x + 8, y + 8, x + 90, y + 58);
    g.addColorStop(0, member.color);
    g.addColorStop(1, '#241a38');
    ctx.fillStyle = g;
    roundRect(ctx, x + 8, y + 8, 82, 50, 6);
    ctx.fill();
    // Simple face: head + hair + shades.
    ctx.fillStyle = '#c68642';
    ctx.beginPath();
    ctx.arc(x + 49, y + 30, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14101f';
    ctx.beginPath();
    ctx.arc(x + 49, y + 25, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(x + 38, y + 27, 22, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(member.name, x + 10, y + 76);
    // Health as a number as well as a bar, so it reads at thumbnail scale.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(String(member.hp), x + 90, y + 76);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9aa0b5';
    ctx.font = '10px Arial';
    ctx.fillText(member.role + ' • ' + member.perk.split(' ')[0].toUpperCase(), x + 10, y + 90);
    // Health bar.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 8, y + 94 - 2, 82, 5);
    ctx.fillStyle = member.hp > 50 ? '#7bff9e' : member.hp > 25 ? '#ffd166' : '#ff5b5b';
    ctx.fillRect(x + 8, y + 92, 82 * (member.hp / 100), 5);
    ctx.restore();
  });
}

// Minimap, bottom-right: same district map in every shot, route blips 1-4.
export function drawMinimap(ctx, districtName, currentShot) {
  const w = 218;
  const h = 150;
  const x = CANVAS_W - w - 18;
  const y = CANVAS_H - h - 18;
  panel(ctx, x, y, w, h);
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 8);
  ctx.clip();
  // Map ground: dusk teal blocks.
  ctx.fillStyle = '#12283a';
  ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
  // City blocks.
  ctx.fillStyle = '#1d3a52';
  for (let by = y + 14; by < y + h - 20; by += 26) {
    for (let bx = x + 14; bx < x + w - 24; bx += 34) {
      ctx.fillRect(bx, by, 26, 18);
    }
  }
  // Roads.
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 46);
  ctx.lineTo(x + w - 6, y + 40);
  ctx.moveTo(x + 60, y + 6);
  ctx.lineTo(x + 74, y + h - 6);
  ctx.moveTo(x + 150, y + 6);
  ctx.lineTo(x + 138, y + h - 6);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 96);
  ctx.lineTo(x + w - 6, y + 104);
  ctx.stroke();
  // Beach strip on the west edge.
  ctx.fillStyle = '#2ec4b6';
  ctx.fillRect(x + 6, y + 6, 10, h - 12);
  // Route through the four shot waypoints.
  const route = [
    [x + 34, y + 118],
    [x + 92, y + 84],
    [x + 140, y + 62],
    [x + 186, y + 30],
  ];
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  route.forEach(([rx, ry], i) => (i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry)));
  ctx.stroke();
  ctx.setLineDash([]);
  route.forEach(([rx, ry], i) => {
    const active = i + 1 === currentShot;
    ctx.fillStyle = active ? '#ffd166' : '#ff2e88';
    ctx.beginPath();
    ctx.arc(rx, ry, active ? 9 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14101f';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), rx, ry + 3.5);
  });
  // Player arrow on the current waypoint.
  const [px, py] = route[currentShot - 1];
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(px, py - 16);
  ctx.lineTo(px - 6, py - 6);
  ctx.lineTo(px + 6, py - 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(districtName, x + 10, y + 20);
  ctx.fillStyle = '#7ee7ff';
  ctx.font = '10px Arial';
  ctx.fillText('N', x + w - 22, y + 20);
  ctx.restore();
}

// Speed + weapon + radio strip, bottom-centre.
export function drawSpeedWeaponRadio(ctx, speedKmh, weapon, ammo, reserve, radio) {
  const cx = CANVAS_W / 2;
  ctx.save();
  ctx.textAlign = 'center';
  // Speed.
  ctx.fillStyle = 'rgba(10, 8, 22, 0.72)';
  roundRect(ctx, cx + 130, CANVAS_H - 96, 120, 64, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(String(speedKmh), cx + 190, CANVAS_H - 56);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('KM/H', cx + 190, CANVAS_H - 38);
  // Weapon + ammo.
  ctx.fillStyle = 'rgba(10, 8, 22, 0.72)';
  roundRect(ctx, cx - 250, CANVAS_H - 96, 200, 64, 10);
  ctx.fill();
  ctx.fillStyle = weapon.color;
  ctx.font = 'bold 16px Arial';
  ctx.fillText(weapon.name, cx - 150, CANVAS_H - 66);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(`${ammo} / ${reserve}`, cx - 150, CANVAS_H - 40);
  // Radio.
  ctx.fillStyle = 'rgba(10, 8, 22, 0.72)';
  roundRect(ctx, cx - 40, CANVAS_H - 60, 170, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#ff9ecf';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('♪ ' + radio.name, cx + 45, CANVAS_H - 42);
  ctx.restore();
}

// Full HUD in one call: same anchors in every shot.
export function drawHUD(ctx, hud) {
  drawMissionCard(ctx, hud.mission, hud.objective, hud.progress);
  drawMoney(ctx, hud.cash, hud.respect);
  drawWantedStars(ctx, hud.stars, hud.hurricaneSeconds);
  drawCrewPortraits(ctx, hud.crew);
  drawMinimap(ctx, hud.districtName, hud.currentShot);
  drawSpeedWeaponRadio(ctx, hud.speedKmh, hud.weapon, hud.ammo, hud.reserve, hud.radio);
  // Shot label (staging only, bottom-centre above the strip).
  if (hud.shotLabel) {
    glowText(ctx, hud.shotLabel, 18, CANVAS_H - 128, 'bold 13px Arial', '#ffffff', '#ff2e88', 8);
  }
}
