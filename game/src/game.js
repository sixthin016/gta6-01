// Neon Bay — the playable game. One job: the live loop — drive, walk, shoot,
// outrun the BCPD, finish missions and save progress. The staged shots in
// shots.js are stills; this file is the game a player actually plays.
import {
  CANVAS_W, CANVAS_H, HORIZON_Y, MISSIONS, CREW, WEAPONS, RADIO,
  HURRICANE_TOTAL_SECONDS, formatClock,
} from './config.js';
import { mulberry32, range, pick } from './rng.js';
import {
  drawGoldenSky, drawRoad, drawCarRear, drawPerson, drawHelicopter,
  drawSmokePuff, drawMuzzleFlash, drawCasing, roundRect, glowText,
} from './draw.js';
import { buildStreet, drawStreet } from './world.js';
import { drawHUD } from './hud.js';

const SAVE_KEY = 'neon-bay-save-v1';
const TRAFFIC_COLORS = ['#2ec4b6', '#ffd166', '#ff70a6', '#7bff9e', '#ff9f1c', '#00e5ff', '#e9ecef'];

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s.money !== 'number' || typeof s.mission !== 'number') return null;
    return s;
  } catch {
    return null;
  }
}

export function createGame(ctx) {
  const saved = loadSave();
  const state = {
    mode: 'title', // title | drive | foot | paused | busted
    time: 0,
    speed: 0,
    carX: 0, // lateral offset from road centre, -1..1
    roadOffset: 0,
    nos: 100,
    health: 100,
    money: saved ? saved.money : 250,
    respect: saved ? saved.respect : 5,
    missionIndex: saved ? saved.mission : 0,
    objectiveDone: 0,
    objectiveTotal: 6,
    waypointMeters: 850,
    wanted: 0,
    hurricaneLeft: HURRICANE_TOTAL_SECONDS,
    weaponIndex: 1,
    ammo: WEAPONS[1].mag,
    reserve: WEAPONS[1].reserve,
    radioIndex: 0,
    onFoot: { x: 640, y: 600, aimX: 700, aimY: 500 },
    traffic: [],
    peds: [],
    cops: [],
    casings: [],
    flashes: [],
    smoke: [],
    wheelOpen: false,
    message: '',
    messageUntil: 0,
    keys: {},
    mouse: { x: 640, y: 360, down: false },
    street: buildStreet('downtown', 777),
    districtIndex: 1,
  };

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: state.money, respect: state.respect, mission: state.missionIndex,
      }));
    } catch { /* storage unavailable: play on without saving */ }
  }

  function showMessage(text, seconds = 3) {
    state.message = text;
    state.messageUntil = state.time + seconds;
  }

  function currentMission() {
    return MISSIONS[Math.min(state.missionIndex, MISSIONS.length - 1)];
  }

  function spawnTraffic() {
    if (state.traffic.length < 6 && Math.random() < 0.05) {
      state.traffic.push({
        lane: range(Math.random, -0.55, 0.55),
        z: 0, // 0 = horizon, 1 = past the player
        speed: range(Math.random, 30, 70),
        color: pick(Math.random, TRAFFIC_COLORS),
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  function spawnCop() {
    const need = state.wanted >= 3 ? 3 : state.wanted >= 1 ? 1 : 0;
    if (state.cops.length < need && Math.random() < 0.02 * state.wanted) {
      state.cops.push({ lane: range(Math.random, -0.6, 0.6), z: 0.15, kind: 'cruiser' });
    }
  }

  function completeObjective() {
    state.objectiveDone += 1;
    const payout = 150 + state.missionIndex * 25;
    state.money += payout;
    state.respect += 2;
    showMessage(`Objective complete  +$${payout}`);
    if (state.objectiveDone >= state.objectiveTotal) {
      state.objectiveDone = 0;
      state.missionIndex = Math.min(state.missionIndex + 1, MISSIONS.length - 1);
      state.money += 500;
      state.respect += 8;
      showMessage(`MISSION COMPLETE: ${currentMission().name}  +$500`, 5);
      saveGame();
    }
    state.waypointMeters = 600 + Math.random() * 500;
  }

  function fireWeapon() {
    const w = WEAPONS[state.weaponIndex];
    if (state.ammo <= 0) {
      showMessage('Press R to reload', 1.5);
      return;
    }
    state.ammo -= 1;
    state.flashes.push({ x: state.onFoot.x + 26, y: state.onFoot.y - 8, t: 0.08 });
    state.casings.push({
      x: state.onFoot.x + 10, y: state.onFoot.y - 14,
      vx: range(Math.random, 40, 120), vy: range(Math.random, -140, -60), t: 0.7,
    });
    if (Math.random() < 0.4) state.wanted = Math.min(5, state.wanted + 1);
    // Hit a cop standing in the aim cone.
    const aimDx = state.mouse.x - state.onFoot.x;
    const aimDy = state.mouse.y - state.onFoot.y;
    for (const cop of state.cops) {
      const dx = cop.x - state.onFoot.x;
      const dy = cop.y - state.onFoot.y;
      if (dx * aimDx + dy * aimDy > 0 && Math.hypot(dx, dy) < 260) {
        cop.hp = (cop.hp || 100) - w.damage;
        if (cop.hp <= 0) {
          state.cops.splice(state.cops.indexOf(cop), 1);
          state.money += 50;
          showMessage('Cop down  +$50');
        }
        break;
      }
    }
  }

  function reloadWeapon() {
    const w = WEAPONS[state.weaponIndex];
    const need = w.mag - state.ammo;
    const take = Math.min(need, state.reserve);
    state.ammo += take;
    state.reserve -= take;
    showMessage(take > 0 ? `Reloaded ${w.name}` : 'No reserve ammo');
  }

  // ---------------------------------------------------------- update
  function update(dt) {
    state.time += dt;
    state.hurricaneLeft = Math.max(0, state.hurricaneLeft - dt);
    const k = state.keys;

    if (state.mode === 'drive') {
      // Steering and speed.
      if (k['arrowleft'] || k['a']) state.carX = Math.max(-0.85, state.carX - dt * 1.4);
      if (k['arrowright'] || k['d']) state.carX = Math.min(0.85, state.carX + dt * 1.4);
      const wantNos = (k['shift']) && state.nos > 0;
      const target = (k['arrowup'] || k['w']) ? (wantNos ? 175 : 120) : (k['arrowdown'] || k['s']) ? 0 : 45;
      state.speed += (target - state.speed) * Math.min(1, dt * (wantNos ? 1.6 : 0.9));
      if (wantNos && state.speed > 60) {
        state.nos = Math.max(0, state.nos - dt * 30);
        if (Math.random() < 0.5) {
          state.smoke.push({ x: 640 + state.carX * 300, y: 690, r: 22, t: 0.5 });
        }
      } else {
        state.nos = Math.min(100, state.nos + dt * 6);
      }
      state.roadOffset += state.speed * dt * 0.06;
      // Waypoint closes as the player drives.
      state.waypointMeters -= (state.speed * dt) / 3.6;
      if (state.waypointMeters <= 0) completeObjective();
      // Traffic flows toward the player and past.
      spawnTraffic();
      for (const car of state.traffic) {
        car.z += ((state.speed - car.speed) * dt) / 900;
        car.lane += Math.sin(state.time * 0.7 + car.wobble) * 0.0004;
        if (car.z > 1.15) state.traffic.splice(state.traffic.indexOf(car), 1);
      }
      // Collisions: same lane, close depth.
      for (const car of state.traffic) {
        if (car.z > 0.82 && car.z < 1.0 && Math.abs(car.lane - state.carX) < 0.22) {
          state.health -= 12;
          state.wanted = Math.min(5, state.wanted + 1);
          state.speed *= 0.55;
          state.traffic.splice(state.traffic.indexOf(car), 1);
          showMessage('Crash! BCPD noticed');
          break;
        }
      }
      // Police chase: cruisers close in and PIT the player.
      spawnCop();
      for (const cop of state.cops) {
        cop.z += dt * 0.12;
        cop.lane += (state.carX - cop.lane) * dt * 0.8;
        if (cop.z > 0.85) {
          state.health -= 8;
          state.speed *= 0.8;
          cop.z = 0.3;
          showMessage('BCPD PIT maneuver!');
        }
      }
      if (state.wanted >= 1 && Math.random() < dt * 0.02) state.wanted = Math.max(1, state.wanted - 0);
      if (k['e']) {
        state.mode = 'foot';
        state.onFoot.x = 640 + state.carX * 300;
        state.onFoot.y = 620;
        state.keys['e'] = false;
        showMessage('On foot — WASD to move, click to shoot, E to get back in');
      }
    } else if (state.mode === 'foot') {
      const p = state.onFoot;
      const mv = 260 * dt;
      if (k['arrowleft'] || k['a']) p.x = Math.max(60, p.x - mv);
      if (k['arrowright'] || k['d']) p.x = Math.min(CANVAS_W - 60, p.x + mv);
      if (k['arrowup'] || k['w']) p.y = Math.max(330, p.y - mv);
      if (k['arrowdown'] || k['s']) p.y = Math.min(690, p.y + mv);
      p.aimX = state.mouse.x;
      p.aimY = state.mouse.y;
      // Cops on foot close in.
      if (state.wanted >= 2 && state.cops.length < 2 && Math.random() < dt * 0.3) {
        state.cops.push({ x: Math.random() < 0.5 ? 80 : CANVAS_W - 80, y: 380, kind: 'officer', hp: 100 });
      }
      for (const cop of state.cops) {
        if (cop.kind !== 'officer') continue;
        const dx = p.x - cop.x;
        const dy = p.y - cop.y;
        const d = Math.hypot(dx, dy) || 1;
        cop.x += (dx / d) * 90 * dt;
        cop.y += (dy / d) * 90 * dt;
        if (d < 40) {
          state.health -= 20 * dt;
          showMessage('BCPD is beating you down — run!');
        }
      }
      if (state.mouse.down) {
        fireWeapon();
        state.mouse.down = false;
      }
      if (k['e']) {
        state.mode = 'drive';
        state.keys['e'] = false;
        showMessage('Back behind the wheel');
      }
    }
    // Shared particle decay.
    for (const f of state.flashes) f.t -= dt;
    state.flashes = state.flashes.filter((f) => f.t > 0);
    for (const c of state.casings) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 300 * dt;
      c.t -= dt;
    }
    state.casings = state.casings.filter((c) => c.t > 0);
    for (const s of state.smoke) s.t -= dt;
    state.smoke = state.smoke.filter((s) => s.t > 0);
    // Wanted slowly cools when the player behaves.
    if (state.mode === 'drive' && state.speed < 30 && Math.random() < dt * 0.05) {
      state.wanted = Math.max(0, state.wanted - 1);
    }
    if (state.health <= 0) {
      state.mode = 'busted';
      state.health = 100;
      state.money = Math.max(0, state.money - 300);
      showMessage('BUSTED — the BCPD took $300', 5);
      saveGame();
    }
  }

  // ---------------------------------------------------------- render
  function render() {
    const mission = currentMission();
    drawGoldenSky(ctx, 980, 235);
    drawStreet(ctx, state.street);
    drawRoad(ctx, { centerX: 640 });
    // Pedestrians strolling the sidewalks.
    const rng = mulberry32(42);
    for (let i = 0; i < 5; i++) {
      const px = 120 + i * 70 + Math.sin(state.time * 0.3 + i) * 20;
      drawPerson(ctx, px, 520 + (i % 2) * 90, 1.4, { shirt: pick(rng, TRAFFIC_COLORS), pose: 'walk' });
      const qx = 1080 - i * 60 + Math.cos(state.time * 0.25 + i) * 16;
      drawPerson(ctx, qx, 540 + (i % 2) * 70, 1.3, { shirt: pick(rng, TRAFFIC_COLORS), pose: 'walk' });
    }
    if (state.mode === 'drive' || state.mode === 'busted') {
      // Traffic ahead, scaled by depth.
      for (const car of state.traffic) {
        const t = Math.max(0.05, Math.min(1, car.z));
        const y = HORIZON_Y + 12 + t * t * 380;
        const scale = 0.25 + t * 0.85;
        const x = 640 + car.lane * (90 + t * 400);
        drawCarRear(ctx, x, y, 130 * scale, 58 * scale, { color: car.color });
      }
      for (const cop of state.cops) {
        if (cop.kind !== 'cruiser') continue;
        const t = Math.max(0.05, Math.min(1, cop.z));
        const y = HORIZON_Y + 12 + t * t * 380;
        const scale = 0.25 + t * 0.85;
        const x = 640 + cop.lane * (90 + t * 400);
        drawCarRear(ctx, x, y, 135 * scale, 60 * scale, { police: true });
      }
      const nosOn = (state.keys['shift']) && state.nos > 0 && state.speed > 60;
      drawCarRear(ctx, 640 + state.carX * 300, 600, 215, 96, {
        color: '#ff2e88', angle: -state.carX * 0.18, nos: nosOn, brake: state.speed < 20, label: 'NEON-1',
      });
      for (const s of state.smoke) drawSmokePuff(ctx, s.x, s.y, s.r, s.t);
      if (state.wanted >= 4) drawHelicopter(ctx, 880, 120, 1.0, { spotlight: true });
    } else if (state.mode === 'foot') {
      // On foot: the player, nearby cops, aim line, casings and flashes.
      for (const cop of state.cops) {
        if (cop.kind === 'officer') drawPerson(ctx, cop.x, cop.y, 1.7, { shirt: '#1b2a4a', pants: '#101828', gun: true });
      }
      const p = state.onFoot;
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(p.x + 20, p.y - 6);
      ctx.lineTo(p.aimX, p.aimY);
      ctx.stroke();
      ctx.setLineDash([]);
      drawPerson(ctx, p.x, p.y, 1.9, { shirt: '#ff2e88', pants: '#2b2d42', gun: true });
      for (const f of state.flashes) drawMuzzleFlash(ctx, f.x, f.y, 15, 0);
      for (const c of state.casings) drawCasing(ctx, c.x, c.y, c.t);
      // Parked hero car at the kerb.
      drawCarRear(ctx, 1060, 640, 170, 76, { color: '#ff2e88', label: 'NEON-1' });
    }
    // HUD with live values.
    const w = WEAPONS[state.weaponIndex];
    drawHUD(ctx, {
      mission,
      objective: `${mission.objective} — ${Math.max(0, Math.round(state.waypointMeters))}m`,
      progress: `${state.objectiveDone}/${state.objectiveTotal} ${mission.name.split(' ')[0]}`,
      cash: state.money, respect: state.respect, stars: state.wanted,
      speedKmh: Math.round(state.speed),
      weapon: w, ammo: state.ammo, reserve: state.reserve,
      radio: RADIO[state.radioIndex],
      crew: CREW.map((c, i) => ({ ...c, hp: [100, 88, 94][i] })),
      districtName: 'NEON BAY', currentShot: 1, hurricaneSeconds: state.hurricaneLeft,
      shotLabel: '',
    });
    // NOS gauge.
    ctx.save();
    ctx.fillStyle = 'rgba(10, 8, 22, 0.72)';
    roundRect(ctx, CANVAS_W / 2 - 90, CANVAS_H - 118, 180, 14, 7);
    ctx.fill();
    ctx.fillStyle = state.nos > 25 ? '#00e5ff' : '#ff5b5b';
    ctx.fillRect(CANVAS_W / 2 - 88, CANVAS_H - 116, 176 * (state.nos / 100), 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('NOS', CANVAS_W / 2, CANVAS_H - 122);
    ctx.restore();
    // Weapon wheel overlay.
    if (state.wheelOpen) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 8, 22, 0.75)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      glowText(ctx, 'WEAPON WHEEL — press 1-4', CANVAS_W / 2 - 150, 220, 'bold 22px Arial', '#ffffff', '#ff2e88', 10);
      WEAPONS.forEach((wp, i) => {
        const x = CANVAS_W / 2 - 260 + i * 180;
        const y = 300;
        ctx.fillStyle = i === state.weaponIndex ? wp.color : 'rgba(255,255,255,0.12)';
        roundRect(ctx, x, y, 150, 90, 10);
        ctx.fill();
        ctx.fillStyle = i === state.weaponIndex ? '#14101f' : '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}  ${wp.name}`, x + 75, y + 38);
        ctx.font = '13px Arial';
        ctx.fillText(`${wp.mag} / ${wp.reserve}`, x + 75, y + 64);
      });
      ctx.restore();
    }
    // Title screen.
    if (state.mode === 'title') {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 8, 22, 0.82)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      glowText(ctx, 'NEON BAY', CANVAS_W / 2 - 190, 240, 'bold 92px Arial', '#ff2e88', '#ff2e88', 24);
      glowText(ctx, '16 missions • 5-star BCPD • hurricane in ' + formatClock(state.hurricaneLeft), CANVAS_W / 2 - 250, 290, 'bold 20px Arial', '#ffd166', '#ffb347', 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('WASD drive / walk   •   SHIFT NOS   •   E enter / exit car   •   Q weapon wheel   •   1-4 weapons', CANVAS_W / 2, 360);
      ctx.fillText('Mouse aim, click to shoot   •   R reload   •   C radio   •   P pause', CANVAS_W / 2, 392);
      glowText(ctx, 'CLICK TO START', CANVAS_W / 2 - 110, 470, 'bold 26px Arial', '#7bff9e', '#7bff9e', 12);
      ctx.font = '15px Arial';
      ctx.fillStyle = '#9aa0b5';
      ctx.fillText(`Save found: $${state.money} • mission ${state.missionIndex + 1}/16 — progress is kept`, CANVAS_W / 2, 520);
      ctx.restore();
    }
    if (state.mode === 'busted') {
      ctx.save();
      ctx.fillStyle = 'rgba(20, 4, 10, 0.8)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      glowText(ctx, 'BUSTED', CANVAS_W / 2 - 130, 320, 'bold 84px Arial', '#ff5b5b', '#ff2020', 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('The BCPD took $300. Click to get back on the street.', CANVAS_W / 2, 380);
      ctx.restore();
    }
    if (state.mode === 'paused') {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 8, 22, 0.7)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      glowText(ctx, 'PAUSED', CANVAS_W / 2 - 110, 360, 'bold 64px Arial', '#ffffff', '#00e5ff', 14);
      ctx.restore();
    }
    // Transient message.
    if (state.time < state.messageUntil && state.message) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 8, 22, 0.8)';
      const mw = ctx.measureText(state.message).width + 36;
      roundRect(ctx, CANVAS_W / 2 - mw / 2, 120, mw, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, CANVAS_W / 2, 143);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------- input
  function keyName(e) {
    return e.key.toLowerCase();
  }

  function onKeyDown(e) {
    const k = keyName(e);
    state.keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (state.mode === 'title') return;
    if (k === 'p') {
      state.mode = state.mode === 'paused' ? 'drive' : 'paused';
      return;
    }
    if (state.mode === 'paused') return;
    if (k === 'q') state.wheelOpen = !state.wheelOpen;
    if (k >= '1' && k <= '4') {
      state.weaponIndex = Number(k) - 1;
      const w = WEAPONS[state.weaponIndex];
      state.ammo = w.mag;
      state.reserve = w.reserve;
      state.wheelOpen = false;
      showMessage(`${w.name} equipped`, 1.5);
    }
    if (k === 'r') reloadWeapon();
    if (k === 'c') {
      state.radioIndex = (state.radioIndex + 1) % RADIO.length;
      showMessage(`Radio: ${RADIO[state.radioIndex].name}`, 2);
    }
  }

  function onKeyUp(e) {
    state.keys[keyName(e)] = false;
  }

  function onMouseMove(e) {
    const rect = ctx.canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    state.mouse.y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
  }

  function onMouseDown(e) {
    onMouseMove(e);
    if (state.mode === 'title') {
      state.mode = 'drive';
      showMessage(`Mission ${state.missionIndex + 1}: ${currentMission().name} — follow the waypoint`, 4);
      return;
    }
    if (state.mode === 'busted') {
      state.mode = 'drive';
      state.wanted = 0;
      return;
    }
    if (state.mode === 'foot') state.mouse.down = true;
  }

  return { state, update, render, onKeyDown, onKeyUp, onMouseMove, onMouseDown };
}
