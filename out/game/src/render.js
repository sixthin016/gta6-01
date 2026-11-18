// Neon Bay — the renderer: one canvas, painted top-down. It draws the city,
// the cars and people, the particles, then the HUD with its minimap, the
// mission banner, and the title / pause / game-over screens.
import {
  CAR_LEN, CAR_W, PALETTE, ROADS_H, ROADS_V, ROAD_W, SAND_X, WATER_X,
  WORLD_H, WORLD_W,
} from './config.js';
import { LANDMARKS } from './city.js';
import { missionObjective, missionTitle } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';

const MINIMAP_W = 220;
const MINIMAP_H = 165;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Soft shadow under the car.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, -CAR_LEN / 2 + 3, -CAR_W / 2 + 4, CAR_LEN, CAR_W, 9);
  ctx.fill();
  const body = car.kind === 'police' ? '#f5f5f5' : car.color;
  ctx.fillStyle = body;
  roundRect(ctx, -CAR_LEN / 2, -CAR_W / 2, CAR_LEN, CAR_W, 9);
  ctx.fill();
  if (car.kind === 'police') {
    ctx.fillStyle = '#1c2733';
    ctx.fillRect(-6, -CAR_W / 2, 12, CAR_W);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-CAR_LEN / 2 + 4, -CAR_W / 2 + 3, 8, 6);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-CAR_LEN / 2 + 4, CAR_W / 2 - 9, 8, 6);
  }
  // Windshield, roof and rear window.
  ctx.fillStyle = 'rgba(20,40,60,0.85)';
  ctx.fillRect(8, -CAR_W / 2 + 4, 10, CAR_W - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-8, -CAR_W / 2 + 5, 14, CAR_W - 10);
  ctx.fillStyle = 'rgba(20,40,60,0.85)';
  ctx.fillRect(-CAR_LEN / 2 + 4, -CAR_W / 2 + 4, 8, CAR_W - 8);
  // Headlights.
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(CAR_LEN / 2 - 3, -CAR_W / 2 + 2, 3, 6);
  ctx.fillRect(CAR_LEN / 2 - 3, CAR_W / 2 - 8, 3, 6);
  // Damage smoke is drawn by the particle system; a wrecked car looks dented.
  if (car.damage > 55) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-CAR_LEN / 2 + 2, -CAR_W / 2 + 2, 16, CAR_W - 4);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, skin, walkPhase, isCop) {
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(1, 3, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const bob = Math.sin(walkPhase) * 1.5;
  ctx.rotate(angle);
  // Legs swing while walking.
  ctx.fillStyle = isCop ? '#1c2733' : '#3a3f4a';
  ctx.fillRect(-6, -8 + bob, 5, 8);
  ctx.fillRect(-6, 0 - bob, 5, 8);
  ctx.fillStyle = isCop ? '#22384f' : shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(7, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  if (isCop) {
    ctx.fillStyle = '#0f1c2b';
    ctx.beginPath();
    ctx.arc(7, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5d76e';
    ctx.fillRect(6, -2, 3, 4);
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewW = 1280;
  let viewH = 800;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function drawGround(city) {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    // Mown stripes on the grass for a sunny-park feel.
    ctx.fillStyle = PALETTE.grassDark;
    for (let y = 0; y < WORLD_H; y += 160) ctx.fillRect(0, y, WORLD_W, 40);
    // Beach sand and the sea on the east edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(SAND_X, 0, WATER_X - SAND_X, WORLD_H);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(WATER_X, 0, WORLD_W - WATER_X, WORLD_H);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let y = 60; y < WORLD_H; y += 220) {
      ctx.beginPath();
      ctx.ellipse(WATER_X + 90, y, 70, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The park block.
    const park = LANDMARKS.park;
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = '#4a8f33';
    ctx.beginPath();
    ctx.ellipse(park.x + park.w / 2, park.y + park.h / 2, 90, 60, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRoads() {
    // Sidewalks first, then asphalt, then centre dashes.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const x of ROADS_V) ctx.fillRect(x - ROAD_W / 2 - 26, 0, ROAD_W + 52, WORLD_H);
    for (const y of ROADS_H) ctx.fillRect(0, y - ROAD_W / 2 - 26, WORLD_W, ROAD_W + 52);
    ctx.fillStyle = PALETTE.road;
    for (const x of ROADS_V) ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD_H);
    for (const y of ROADS_H) ctx.fillRect(0, y - ROAD_W / 2, WORLD_W, ROAD_W);
    ctx.fillStyle = PALETTE.roadLine;
    for (const x of ROADS_V) {
      for (let y = 0; y < WORLD_H; y += 80) ctx.fillRect(x - 3, y + 10, 6, 40);
    }
    for (const y of ROADS_H) {
      for (let x = 0; x < SAND_X; x += 80) ctx.fillRect(x + 10, y - 3, 40, 6);
    }
    // Crosswalk stripes at every intersection.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const x of ROADS_V) {
      for (const y of ROADS_H) {
        for (let i = -3; i <= 3; i += 1) {
          ctx.fillRect(x + i * 12 - 4, y - ROAD_W / 2 - 22, 8, 16);
          ctx.fillRect(x + i * 12 - 4, y + ROAD_W / 2 + 6, 8, 16);
        }
      }
    }
  }

  function drawCity(state) {
    const city = state.city;
    drawGround(city);
    drawRoads();
    // Skid marks.
    ctx.strokeStyle = 'rgba(20,20,20,0.5)';
    ctx.lineWidth = 4;
    for (const s of state.skids) {
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14);
      ctx.lineTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
      ctx.stroke();
    }
    // Buildings: shadow, coloured body, pale roof, windows.
    for (const b of city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      ctx.fillStyle = 'rgba(30,60,90,0.55)';
      const cols = Math.max(2, Math.floor(b.w / 34));
      const rows = Math.max(2, Math.floor(b.h / 34));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          ctx.fillRect(b.x + 16 + i * ((b.w - 32) / cols), b.y + 16 + j * ((b.h - 32) / rows), 12, 14);
        }
      }
    }
    // Hospital cross and garage sign so landmarks read at a glance.
    const hosp = LANDMARKS.hospital;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✚', hosp.x, hosp.y + 60);
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#22384f';
    ctx.fillText('BAY GENERAL', hosp.x, hosp.y + 88);
    const gar = LANDMARKS.garage;
    ctx.fillStyle = '#22384f';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText("ROOK'S GARAGE", gar.x, gar.y - 40);
    const store = LANDMARKS.store;
    ctx.fillStyle = '#7a4a12';
    ctx.fillText('SUNSET STORE', store.x, store.y - 40);
    // Trees, lamps and benches.
    for (const t of city.trees) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(t.x + 3, t.y + 4, t.r, t.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f7d32';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#66bb5a';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const lamp of city.lamps) {
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pickups: yellow ammo crates and green health crosses.
    for (const pk of city.pickups) {
      if (pk.taken) continue;
      const pulse = 1 + Math.sin(state.time * 4 + pk.x) * 0.12;
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.scale(pulse, pulse);
      if (pk.kind === 'ammo') {
        ctx.fillStyle = '#f2c230';
        ctx.fillRect(-11, -11, 22, 22);
        ctx.fillStyle = '#7a5a00';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AMMO', 0, 5);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-11, -11, 22, 22);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(-3, -9, 6, 18);
        ctx.fillRect(-9, -3, 18, 6);
      }
      ctx.restore();
    }
  }

  function drawEntities(state) {
    for (const car of state.cars) drawCarShape(ctx, car);
    for (const car of state.policeCars) {
      drawCarShape(ctx, car);
      // Flashing light bar.
      const phase = Math.floor(state.time * 6) % 2 === 0;
      ctx.fillStyle = phase ? '#e74c3c' : '#3498db';
      ctx.beginPath();
      ctx.arc(car.x - Math.cos(car.angle) * 8, car.y - Math.sin(car.angle) * 8, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const ped of state.peds) {
      if (ped.state === 'down') {
        ctx.save();
        ctx.translate(ped.x, ped.y);
        ctx.rotate(0.6);
        ctx.fillStyle = ped.shirt;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.skin, ped.walkPhase, false);
      }
    }
    for (const cop of state.cops) {
      drawPerson(ctx, cop.x, cop.y, cop.angle, null, '#d9a066', cop.walkPhase, true);
    }
    const p = state.player;
    if (!p.inCar) {
      const blink = p.invulnerable > 0 && Math.floor(state.time * 8) % 2 === 0;
      if (!blink) {
        // Player wears a bright orange jacket so they are easy to spot.
        drawPerson(ctx, p.x, p.y, p.angle, '#ff7a1a', '#f2c89b', p.walkPhase, false);
        // Direction tick.
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(p.angle) * 14, p.y + Math.sin(p.angle) * 14);
        ctx.lineTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22);
        ctx.stroke();
      }
    } else {
      drawCarShape(ctx, p.inCar);
    }
    // Particles and bullet tracers.
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    for (const t of state.tracers) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawMissionMarker(world) {
    const state = world.state;
    const target = world.missionTarget(state.missionIndex);
    if (!target) return;
    const bob = Math.sin(state.time * 3) * 8;
    ctx.save();
    ctx.translate(target.x, target.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#7a5a00';
    ctx.lineWidth = 3;
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeRect(-16, -16, 32, 32);
    ctx.restore();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼', target.x, target.y - 34 + bob);
    // Edge arrow when the target is off screen.
    const sx = target.x - state.camera.x + viewW / 2;
    const sy = target.y - state.camera.y + viewH / 2;
    if (sx < 60 || sx > viewW - 60 || sy < 60 || sy > viewH - 60) {
      const cx = viewW / 2;
      const cy = viewH / 2;
      const angle = Math.atan2(sy - cy, sx - cx);
      const ex = cx + Math.cos(angle) * (Math.min(viewW, viewH) / 2 - 90);
      const ey = cy + Math.sin(angle) * (Math.min(viewW, viewH) / 2 - 90);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(angle);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const d = Math.round(Math.hypot(target.x - state.player.x, target.y - state.player.y));
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${d}m`, ex, ey + 30);
    }
  }

  function drawHud(world) {
    const state = world.state;
    const p = state.player;
    ctx.textAlign = 'left';
    // Top-left: cash and health.
    ctx.fillStyle = 'rgba(10,20,30,0.82)';
    roundRect(ctx, 14, 14, 250, 64, 10);
    ctx.fill();
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(`$${p.money}`, 28, 44);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, 28, 54, 200, 12, 6);
    ctx.fill();
    ctx.fillStyle = p.hp > 40 ? '#7dff8a' : '#ff5a5a';
    roundRect(ctx, 28, 54, 200 * (p.hp / 100), 12, 6);
    ctx.fill();
    // Top-right: wanted stars and the clock.
    ctx.fillStyle = 'rgba(10,20,30,0.82)';
    roundRect(ctx, viewW - 264, 14, 250, 64, 10);
    ctx.fill();
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < p.wanted ? '★' : '☆';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(stars, viewW - 28, 44);
    const totalMin = Math.floor(state.clockMinutes) % (24 * 60);
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`${hh}:${mm}  •  NEON BAY`, viewW - 28, 66);
    // Top-centre: the mission objective.
    const obj = missionObjective(state.missionIndex, state);
    ctx.font = 'bold 14px system-ui, sans-serif';
    const objText = `★ ${missionTitle(state.missionIndex)} — ${obj}`;
    const objW = Math.min(640, ctx.measureText(objText).width + 36);
    ctx.fillStyle = 'rgba(10,20,30,0.82)';
    roundRect(ctx, (viewW - objW) / 2, 14, objW, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText(objText, viewW / 2, 40, objW - 16);
    // Mission timer / robbery progress under the objective.
    if (state.missionIndex === 3 && state.missionTimer > 0) {
      ctx.fillStyle = state.missionTimer < 20 ? '#ff5a5a' : '#ffffff';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`⏱ ${Math.ceil(state.missionTimer)}s left`, viewW / 2, 84);
    }
    if (state.missionIndex === 4 && state.missionStage === 0 && state.robProgress > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`Robbing… ${Math.round((state.robProgress / 3) * 100)}% — keep holding E`, viewW / 2, 84);
    }
    // Bottom-left: weapon, ammo and speed.
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(10,20,30,0.82)';
    roundRect(ctx, 14, viewH - 74, 250, 60, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`🔫 PISTOL  ${p.ammo} / ${p.reserveAmmo}`, 28, viewH - 46);
    if (p.inCar) {
      const kmh = Math.round(Math.abs(p.speed) * 0.55);
      ctx.fillStyle = '#7dff8a';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(`🚗 ${kmh} km/h`, 28, viewH - 22);
    } else {
      ctx.fillStyle = '#cfe8ff';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('WASD walk • E enter car • F punch • Click shoot', 28, viewH - 22);
    }
    // Toast message above the banner.
    if (state.messageTimer > 0 && state.message) {
      ctx.font = 'bold 16px system-ui, sans-serif';
      const w = ctx.measureText(state.message).width + 32;
      ctx.fillStyle = 'rgba(10,20,30,0.65)';
      roundRect(ctx, (viewW - w) / 2, viewH - 190, w, 36, 10);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, viewW / 2, viewH - 166);
    }
    // Rook's banner at the bottom.
    if (state.bannerTimer > 0 && state.banner) {
      ctx.fillStyle = 'rgba(20,16,40,0.78)';
      roundRect(ctx, viewW / 2 - 330, viewH - 140, 660, 52, 10);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.banner, viewW / 2, viewH - 108);
    }
    drawMinimap(world);
  }

  function drawMinimap(world) {
    const state = world.state;
    const mx = viewW - MINIMAP_W - 14;
    const my = viewH - MINIMAP_H - 14;
    const sx = MINIMAP_W / WORLD_W;
    const sy = MINIMAP_H / WORLD_H;
    ctx.fillStyle = 'rgba(10,20,30,0.6)';
    roundRect(ctx, mx - 6, my - 6, MINIMAP_W + 12, MINIMAP_H + 12, 10);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, MINIMAP_W, MINIMAP_H);
    ctx.clip();
    ctx.fillStyle = '#2f7d32';
    ctx.fillRect(mx, my, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = '#2fa8d8';
    ctx.fillRect(mx + WATER_X * sx, my, (WORLD_W - WATER_X) * sx, MINIMAP_H);
    ctx.strokeStyle = '#9aa0aa';
    ctx.lineWidth = 2;
    for (const x of ROADS_V) {
      ctx.beginPath();
      ctx.moveTo(mx + x * sx, my);
      ctx.lineTo(mx + x * sx, my + MINIMAP_H);
      ctx.stroke();
    }
    for (const y of ROADS_H) {
      ctx.beginPath();
      ctx.moveTo(mx, my + y * sy);
      ctx.lineTo(mx + MINIMAP_W, my + y * sy);
      ctx.stroke();
    }
    // Hospital cross.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx + LANDMARKS.hospital.x * sx - 3, my + LANDMARKS.hospital.y * sy - 1, 6, 2);
    ctx.fillRect(mx + LANDMARKS.hospital.x * sx - 1, my + LANDMARKS.hospital.y * sy - 3, 2, 6);
    const target = world.missionTarget(state.missionIndex);
    if (target) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(mx + target.x * sx, my + target.y * sy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const car of state.policeCars) {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(mx + car.x * sx, my + car.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const cop of state.cops) {
      ctx.fillStyle = '#ff7a7a';
      ctx.fillRect(mx + cop.x * sx - 2, my + cop.y * sy - 2, 4, 4);
    }
    // The player, white with a dark ring.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NEON BAY', mx, my - 10);
  }

  function drawTitleScreen(world, extras) {
    ctx.fillStyle = 'rgba(8,12,28,0.45)';
    ctx.fillRect(0, 0, viewW, viewH);
    const grad = ctx.createLinearGradient(0, viewH * 0.18, 0, viewH * 0.42);
    grad.addColorStop(0, '#ffe259');
    grad.addColorStop(0.5, '#ff7a1a');
    grad.addColorStop(1, '#ff2e88');
    ctx.fillStyle = grad;
    ctx.font = '900 96px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEON BAY', viewW / 2, viewH * 0.32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('An open-world crime story — steal cars, dodge the cops, run Rook\'s jobs', viewW / 2, viewH * 0.32 + 44);
    ctx.fillStyle = 'rgba(10,20,30,0.7)';
    roundRect(ctx, viewW / 2 - 300, viewH * 0.48, 600, 190, 14);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(extras.saveExists ? '▶  CONTINUE — press ENTER' : '▶  NEW GAME — press ENTER', viewW / 2, viewH * 0.48 + 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — walk & drive    •    SHIFT — run', viewW / 2, viewH * 0.48 + 84);
    ctx.fillText('E — steal / exit car    •    F — punch    •    Mouse click — shoot', viewW / 2, viewH * 0.48 + 112);
    ctx.fillText('ESC — pause    •    M — mute    •    Progress saves automatically', viewW / 2, viewH * 0.48 + 140);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Five missions for Rook. A whole sunny city. One very orange jacket.', viewW / 2, viewH * 0.48 + 168);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('An original game. No Rockstar names, characters, map or assets.', viewW / 2, viewH - 24);
    if (extras.muted) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🔇 MUTED (M)', viewW - 24, 34);
    }
  }

  function drawPauseScreen() {
    ctx.fillStyle = 'rgba(8,12,28,0.6)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', viewW / 2, viewH / 2 - 20);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Press ESC or ENTER to keep playing', viewW / 2, viewH / 2 + 30);
  }

  function drawGameOverScreen(world, extras) {
    ctx.fillStyle = 'rgba(20,4,8,0.72)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = extras.overKind === 'busted' ? '#5aa9ff' : '#ff5a5a';
    ctx.font = '900 88px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(extras.overKind === 'busted' ? 'BUSTED!' : 'WASTED!', viewW / 2, viewH / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('The Bay PD took their cut. You woke up at Bay General Hospital.', viewW / 2, viewH / 2 + 20);
    ctx.fillText(`Cash: $${world.state.player.money}   •   Missions done: ${world.state.stats.missionsDone} / 5`, viewW / 2, viewH / 2 + 56);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Press ENTER to get back out there', viewW / 2, viewH / 2 + 110);
  }

  function draw(world, screen, extras) {
    const state = world.state;
    ctx.clearRect(0, 0, viewW, viewH);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 24 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 24 : 0;
    const camX = Math.max(viewW / 2, Math.min(WORLD_W - viewW / 2, state.camera.x));
    const camY = Math.max(viewH / 2, Math.min(WORLD_H - viewH / 2, state.camera.y));
    ctx.save();
    ctx.translate(Math.round(viewW / 2 - camX + shakeX), Math.round(viewH / 2 - camY + shakeY));
    drawCity(state);
    drawEntities(state);
    drawMissionMarker(world);
    ctx.restore();
    if (screen === SCREEN_TITLE) drawTitleScreen(world, extras);
    else if (screen === SCREEN_PAUSED) { drawHud(world); drawPauseScreen(); }
    else if (screen === SCREEN_OVER) drawGameOverScreen(world, extras);
    else drawHud(world);
  }

  return { draw, resize };
}
