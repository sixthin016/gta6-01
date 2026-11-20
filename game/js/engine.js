// Neon Bay — the playable game: pseudo-3D driving on a curving island road
// with traffic, BCPD pursuit, NOS and the hurricane clock; plus an on-foot
// mode with shooting, shops and cars to steal. Missions advance by driving
// the story distance; progress saves to localStorage.

import { makeRng, clamp, lerp, shade, rgba, vgrad, glow, rr, label } from './util.js';
import { PALETTES } from './palette.js';
import { MISSIONS, WEAPONS, RADIOS, CREW, HURRICANE_TOTAL } from './missions.js';
import { drawSky, drawBuilding, drawSkyline } from './city.js';
import { drawHeroCar, drawCruiser, drawTrafficCar } from './vehicles.js';
import { drawPedestrian, drawCrewShooter, drawCop } from './people.js';
import { drawHud } from './hud.js';

const W = 1280;
const H = 720;
const SEG_LEN = 200;
const ROAD_W = 2200;
const CAM_H = 1150;
const CAM_DEPTH = 0.84;
const DRAW = 150;
const PLAYER_Z = CAM_H * CAM_DEPTH;
const MAX_SPEED = SEG_LEN * 62;
const SAVE_KEY = 'neonbay-save-v1';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s.money !== 'number' || typeof s.mission !== 'number') return null;
    return s;
  } catch (e) {
    return null;
  }
}

function storeSave(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) {
    /* storage may be unavailable; the game still plays */
  }
}

export class NeonBayGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.keys = {};
    this.mouse = { x: W / 2, y: H / 2, down: false };
    this.mode = 'menu'; // menu | drive | foot | busted | done
    this.rng = makeRng(20261120);
    const save = loadSave();
    this.money = save?.money ?? 1200;
    this.respect = save?.respect ?? 12;
    this.missionIndex = save?.mission ?? 0;
    this.stars = 0;
    this.speed = 0;
    this.position = 0;
    this.playerX = 0;
    this.nos = 1;
    this.weaponIndex = 1;
    this.radioIndex = 0;
    this.hurricaneLeft = HURRICANE_TOTAL;
    this.wantedTimer = 0;
    this.missionDistance = 0;
    this.missionTarget = 9000;
    this.flash = 0;
    this.shake = 0;
    this.message = '';
    this.messageTimer = 0;
    this.wheelOpen = false;
    this.foot = { x: W / 2, y: 560, dir: 1, walk: 0 };
    this.peds = [];
    this.cops = [];
    this.traffic = [];
    this.police = [];
    this.segments = [];
    this.trackLength = 0;
    this.buildTrack();
    this.buildTraffic();
    this.buildPeds();
    this.bindInput();
  }

  // ---- track -------------------------------------------------------------
  buildTrack() {
    this.trackY = 0;
    const add = (enter, hold, leave, curve, dy) => {
      const startY = this.trackY;
      const endY = startY + dy;
      const total = enter + hold + leave;
      for (let n = 0; n < enter; n++) this.addSegment(this.easeIn(0, curve, n / enter), this.easeInOut(startY, endY, n / total));
      for (let n = 0; n < hold; n++) this.addSegment(curve, this.easeInOut(startY, endY, (enter + n) / total));
      for (let n = 0; n < leave; n++) this.addSegment(this.easeInOut(curve, 0, n / leave), this.easeInOut(startY, endY, (enter + hold + n) / total));
      this.trackY = endY;
    };
    add(40, 40, 40, 0, 0);
    add(30, 50, 30, 2, 600);
    add(30, 50, 30, -3, -400);
    add(40, 40, 40, 0, 900);
    add(30, 60, 30, 4, 0);
    add(30, 50, 30, -2, -700);
    add(50, 50, 50, 0, 0);
    this.trackLength = this.segments.length * SEG_LEN;
  }

  addSegment(curve, y) {
    const n = this.segments.length;
    const prevY = n === 0 ? 0 : this.segments[n - 1].p2.world.y;
    const seg = {
      index: n,
      curve,
      p1: { world: { x: 0, y: prevY, z: n * SEG_LEN }, camera: {}, screen: {} },
      p2: { world: { x: 0, y, z: (n + 1) * SEG_LEN }, camera: {}, screen: {} },
      buildings: [],
      color: Math.floor(n / 3) % 2 === 0 ? 'light' : 'dark',
    };
    // roadside facaded buildings on some segments
    const r = this.rng;
    if (n % 2 === 0 && r.next() < 0.75) {
      seg.buildings.push({
        side: r.next() < 0.5 ? -1 : 1,
        w: r.range(2600, 4200),
        h: r.range(4200, 11000),
        seed: 1000 + n * 31,
        district: r.pick(['beach', 'downtown', 'market', 'highway']),
      });
    }
    if (n % 3 === 1 && r.next() < 0.5) {
      seg.buildings.push({
        side: r.next() < 0.5 ? -1 : 1,
        w: r.range(2600, 3800),
        h: r.range(3800, 8000),
        seed: 2000 + n * 17,
        district: r.pick(['beach', 'downtown', 'market', 'highway']),
      });
    }
    this.segments.push(seg);
  }

  easeIn(a, b, t) { return a + (b - a) * t * t; }
  easeInOut(a, b, t) { return a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5); }

  findSegment(z) {
    return this.segments[Math.floor(z / SEG_LEN) % this.segments.length];
  }

  project(p, camX, camY, camZ) {
    p.camera.x = p.world.x - camX;
    p.camera.y = p.world.y - camY;
    p.camera.z = p.world.z - camZ;
    p.screen.scale = CAM_DEPTH / Math.max(1, p.camera.z);
    p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * (W / 2));
    p.screen.y = Math.round(H / 2 - p.screen.scale * p.camera.y * (H / 2));
    p.screen.w = Math.round(p.screen.scale * ROAD_W * (W / 2));
  }

  buildTraffic() {
    for (let i = 0; i < 14; i++) {
      this.traffic.push({
        z: this.rng.range(2000, this.trackLength * 0.9),
        offset: this.rng.range(-0.7, 0.7),
        speed: this.rng.range(SEG_LEN * 18, SEG_LEN * 30),
        seed: 500 + i * 13,
        color: null,
      });
    }
  }

  buildPeds() {
    for (let i = 0; i < 10; i++) {
      this.peds.push({
        x: this.rng.range(80, W - 80),
        y: this.rng.range(430, 620),
        s: this.rng.range(1.1, 1.7),
        seed: 900 + i * 7,
        vx: this.rng.range(-14, 14),
        walk: this.rng.range(0, 6),
      });
    }
  }

  // ---- input ---------------------------------------------------------------
  bindInput() {
    const onKey = (down) => (e) => {
      this.keys[e.key.toLowerCase()] = down;
      if (down) {
        if (e.key === 'e' || e.key === 'E') this.toggleFoot();
        if (e.key === 'f' || e.key === 'F') this.cycleWeapon();
        if (e.key === 'q' || e.key === 'Q') this.wheelOpen = !this.wheelOpen;
        if (e.key === 'm' || e.key === 'M') this.radioIndex = (this.radioIndex + 1) % RADIOS.length;
        if (e.key === ' ') e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey(true));
    window.addEventListener('keyup', onKey(false));
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * W;
      this.mouse.y = ((e.clientY - r.top) / r.height) * H;
    });
    this.canvas.addEventListener('mousedown', () => {
      this.mouse.down = true;
      if (this.mode === 'menu') this.startGame();
      else if (this.mode === 'foot') this.shoot();
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  startGame() {
    this.mode = 'drive';
    this.showMessage('Mission: ' + this.currentMission().name + ' — ' + this.currentMission().objective);
  }

  currentMission() {
    return MISSIONS[Math.min(this.missionIndex, MISSIONS.length - 1)];
  }

  toggleFoot() {
    if (this.mode === 'drive' && this.speed < SEG_LEN * 4) {
      this.mode = 'foot';
      this.foot.x = W / 2;
      this.showMessage('On foot — E near the car to get back in, click to fire');
    } else if (this.mode === 'foot') {
      this.mode = 'drive';
      this.showMessage('Back in the Coral GT');
    }
  }

  cycleWeapon() {
    this.weaponIndex = (this.weaponIndex + 1) % WEAPONS.length;
    this.showMessage(WEAPONS[this.weaponIndex].name + ' ready — ' + WEAPONS[this.weaponIndex].ammo + ' rounds');
  }

  shoot() {
    const w = WEAPONS[this.weaponIndex];
    if (w.ammo <= 0) {
      this.showMessage('Out of ammo — visit Ammu-Nation Bay');
      return;
    }
    w.ammo -= 1;
    this.flash = 6;
    this.raiseWanted(1);
    // a cop hit nearby drops the heat back down a notch sometimes
    if (this.rng.next() < 0.3) this.stars = Math.max(1, this.stars - 1);
  }

  raiseWanted(n) {
    this.stars = clamp(this.stars + n, 0, 5);
    this.wantedTimer = 20;
  }

  showMessage(text) {
    this.message = text;
    this.messageTimer = 4;
  }

  completeMission() {
    const m = this.currentMission();
    this.money += m.reward;
    this.respect = clamp(this.respect + 6, 0, 100);
    this.showMessage('Mission complete: ' + m.name + '  +$' + m.reward);
    this.missionIndex = Math.min(this.missionIndex + 1, MISSIONS.length - 1);
    this.missionDistance = 0;
    this.missionTarget = 9000 + this.missionIndex * 1500;
    this.stars = Math.max(0, this.stars - 2);
    storeSave({ money: this.money, respect: this.respect, mission: this.missionIndex });
    if (this.missionIndex >= MISSIONS.length - 1 && this.missionDistance <= 0) {
      this.mode = 'done';
    }
  }

  // ---- update --------------------------------------------------------------
  update(dt) {
    if (this.mode === 'menu' || this.mode === 'busted' || this.mode === 'done') return;
    this.hurricaneLeft = Math.max(0, this.hurricaneLeft - dt);
    if (this.hurricaneLeft <= 0) {
      this.mode = 'done';
      this.showMessage('Landfall! The storm hits Neon Bay — story complete');
      return;
    }
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.flash > 0) this.flash -= 1;
    if (this.wantedTimer > 0) {
      this.wantedTimer -= dt;
      if (this.wantedTimer <= 0) this.stars = Math.max(0, this.stars - 1);
    }
    if (this.mode === 'drive') this.updateDrive(dt);
    else if (this.mode === 'foot') this.updateFoot(dt);
    // traffic flows
    for (const car of this.traffic) {
      car.z += car.speed * dt;
      if (car.z > this.trackLength) car.z -= this.trackLength;
    }
    // police pursuit
    const want = this.stars;
    while (this.police.length < want && this.police.length < 3) {
      this.police.push({ z: this.position + PLAYER_Z + 900 + this.rng.range(0, 600), offset: this.rng.pick([-0.5, 0.5]), wobble: this.rng.range(0, 6) });
    }
    while (this.police.length > want) this.police.pop();
    for (const cop of this.police) {
      cop.wobble += dt * 3;
      // cruisers close in and try to ram the player off the road
      cop.z = lerp(cop.z, this.position + PLAYER_Z + 420, dt * 0.35);
      cop.offset = lerp(cop.offset, this.playerX * 0.9, dt * 0.5);
      if (Math.abs(cop.z - (this.position + PLAYER_Z)) < 260 && Math.abs(cop.offset - this.playerX) < 0.22) {
        this.speed *= 0.985;
        this.shake = 6;
        if (this.rng.next() < dt * 0.4) this.raiseWanted(0);
      }
    }
    // mission progress while driving fast
    if (this.mode === 'drive' && this.speed > SEG_LEN * 20) {
      this.missionDistance += this.speed * dt;
      if (this.missionDistance >= this.missionTarget) this.completeMission();
    }
  }

  updateDrive(dt) {
    const k = this.keys;
    const playerSegment = this.findSegment(this.position + PLAYER_Z);
    const speedRatio = this.speed / MAX_SPEED;
    const dx = dt * 2.2 * speedRatio;
    const startPosition = this.position;
    // steering
    if (k['arrowleft'] || k['a']) this.playerX -= dx * (0.9 + speedRatio);
    if (k['arrowright'] || k['d']) this.playerX += dx * (0.9 + speedRatio);
    // centrifugal push on curves
    this.playerX -= dx * speedRatio * playerSegment.curve * 0.32;
    // throttle / brake
    if (k['arrowup'] || k['w']) this.speed += MAX_SPEED * dt * 0.5;
    else this.speed -= MAX_SPEED * dt * 0.18;
    if (k['arrowdown'] || k['s']) this.speed -= MAX_SPEED * dt * 0.9;
    if (k[' '] ) this.speed -= MAX_SPEED * dt * 1.4;
    // NOS boost
    if (k['shift'] && this.nos > 0 && this.speed > SEG_LEN * 10) {
      this.speed += MAX_SPEED * dt * 0.7;
      this.nos = Math.max(0, this.nos - dt * 0.5);
    } else {
      this.nos = Math.min(1, this.nos + dt * 0.06);
    }
    this.speed = clamp(this.speed, 0, MAX_SPEED * 1.25);
    // off-road slows the car and risks the law noticing
    if (this.playerX < -1 || this.playerX > 1) {
      this.speed = Math.max(0, this.speed - MAX_SPEED * dt * 0.5);
      if (this.speed > SEG_LEN * 30 && this.rng.next() < dt * 0.5) this.raiseWanted(1);
    }
    this.playerX = clamp(this.playerX, -1.6, 1.6);
    this.position = (this.position + this.speed * dt) % this.trackLength;
    if (this.shake > 0) this.shake -= dt * 20;
    // near-miss with traffic raises respect
    for (const car of this.traffic) {
      const dz = car.z - (this.position + PLAYER_Z);
      if (dz > 0 && dz < 500 && Math.abs(car.offset - this.playerX) < 0.3 && this.speed > SEG_LEN * 40) {
        this.respect = clamp(this.respect + dt * 2, 0, 100);
      }
    }
    void startPosition;
  }

  updateFoot(dt) {
    const k = this.keys;
    const f = this.foot;
    let mx = 0;
    if (k['arrowleft'] || k['a']) mx -= 1;
    if (k['arrowright'] || k['d']) mx += 1;
    if (mx !== 0) {
      f.dir = mx;
      f.x = clamp(f.x + mx * 260 * dt, 60, W - 60);
      f.walk += dt * 10;
    }
    for (const p of this.peds) {
      p.x += p.vx * dt;
      p.walk += dt * 6;
      if (p.x < 40) { p.x = 40; p.vx = Math.abs(p.vx); }
      if (p.x > W - 40) { p.x = W - 40; p.vx = -Math.abs(p.vx); }
    }
    // cops close in on foot when wanted
    while (this.cops.length < this.stars) {
      this.cops.push({ x: this.rng.pick([60, W - 60]), y: 520, s: 1.3 });
    }
    while (this.cops.length > this.stars) this.cops.pop();
    for (const c of this.cops) {
      c.x += Math.sign(f.x - c.x) * 90 * dt;
      if (Math.abs(c.x - f.x) < 26) {
        this.mode = 'busted';
        this.showMessage('BUSTED by the BCPD');
        storeSave({ money: this.money, respect: this.respect, mission: this.missionIndex });
      }
    }
  }

  // ---- render --------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    if (this.mode === 'menu') this.renderMenu();
    else if (this.mode === 'foot') this.renderFoot();
    else this.renderDrive();
    ctx.restore();
    if (this.mode === 'busted') this.renderBusted();
    if (this.mode === 'done') this.renderDone();
  }

  hudState() {
    const m = this.currentMission();
    const speedKmh = Math.round((this.speed / MAX_SPEED) * 198);
    const remain = Math.max(0, this.missionTarget - this.missionDistance);
    return {
      shot: 1,
      mission: m,
      progressText: (m.n) + '/16  •  ' + Math.round(remain / 100) * 100 + 'm',
      money: this.money,
      respect: Math.round(this.respect),
      stars: this.stars,
      speed: this.mode === 'foot' ? 0 : speedKmh,
      healths: CREW.map((c) => c.health),
      hurricaneLeft: this.hurricaneLeft,
      weapon: WEAPONS[this.weaponIndex],
      radio: RADIOS[this.radioIndex],
      nos: this.nos,
      numbered: false,
      activeCrew: 0,
    };
  }

  renderDrive() {
    const ctx = this.ctx;
    const P = PALETTES.downtown;
    drawSky(ctx, W, H, P, W * 0.7, H * 0.24);
    drawSkyline(ctx, W, H * 0.42, 'downtown', 5, 16, 50, 170);
    const baseSegment = this.findSegment(this.position);
    const basePercent = (this.position % SEG_LEN) / SEG_LEN;
    const playerSegment = this.findSegment(this.position + PLAYER_Z);
    const playerPercent = ((this.position + PLAYER_Z) % SEG_LEN) / SEG_LEN;
    const playerY = playerSegment.p1.world.y + (playerSegment.p2.world.y - playerSegment.p1.world.y) * playerPercent;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);
    let maxY = H;
    // road pass
    for (let n = 0; n < DRAW; n++) {
      const seg = this.segments[(baseSegment.index + n) % this.segments.length];
      seg.looped = seg.index < baseSegment.index;
      seg.fog = 1 - n / DRAW;
      seg.clip = maxY;
      const camZ = this.position - (seg.looped ? this.trackLength : 0);
      this.project(seg.p1, this.playerX * ROAD_W - x, playerY + CAM_H, camZ);
      this.project(seg.p2, this.playerX * ROAD_W - x - dx, playerY + CAM_H, camZ);
      x += dx;
      dx += seg.curve;
      if (seg.p1.camera.z <= CAM_DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxY) continue;
      this.renderSegment(seg);
      maxY = seg.p1.screen.y;
    }
    // cars pass, far to near
    const drawList = [];
    for (const car of this.traffic) {
      const seg = this.findSegment(car.z);
      const relZ = (car.z - this.position + this.trackLength) % this.trackLength;
      if (relZ < PLAYER_Z || relZ > PLAYER_Z + DRAW * SEG_LEN) continue;
      const scale = CAM_DEPTH / Math.max(1, relZ - PLAYER_Z + 400);
      const sx = W / 2 + scale * (car.offset * ROAD_W - this.playerX * ROAD_W) * (W / 2) * 0.9;
      const sy = H * 0.62 - scale * 900;
      const size = clamp(scale * 620, 8, 260);
      drawList.push({ z: relZ, fn: () => drawTrafficCar(ctx, sx, sy, size, size * 0.34, car.seed, {}) });
    }
    for (const cop of this.police) {
      const relZ = (cop.z - this.position + this.trackLength) % this.trackLength;
      if (relZ < PLAYER_Z || relZ > PLAYER_Z + DRAW * SEG_LEN) continue;
      const scale = CAM_DEPTH / Math.max(1, relZ - PLAYER_Z + 400);
      const sx = W / 2 + scale * (cop.offset * ROAD_W - this.playerX * ROAD_W) * (W / 2) * 0.9 + Math.sin(cop.wobble) * 6;
      const sy = H * 0.62 - scale * 900;
      const size = clamp(scale * 640, 8, 270);
      drawList.push({ z: relZ, fn: () => drawCruiser(ctx, sx, sy, size, size * 0.34, { phase: cop.wobble }) });
    }
    drawList.sort((a, b) => b.z - a.z);
    for (const d of drawList) d.fn();
    // player car
    const boosting = this.keys['shift'] && this.nos > 0;
    drawHeroCar(ctx, W / 2 + this.playerX * 40, H - 150, 330, 118, {
      angle: -0.04 * (this.keys['arrowleft'] || this.keys['a'] ? 1 : 0) + 0.04 * (this.keys['arrowright'] || this.keys['d'] ? 1 : 0),
      nos: boosting,
      brakeGlow: this.keys[' '] || this.keys['arrowdown'] || this.keys['s'],
    });
    drawHud(ctx, W, H, this.hudState());
    if (this.wheelOpen) this.renderWheel();
    if (this.messageTimer > 0) this.renderMessage();
  }

  renderSegment(seg) {
    const ctx = this.ctx;
    const x1 = seg.p1.screen.x;
    const y1 = seg.p1.screen.y;
    const w1 = seg.p1.screen.w;
    const x2 = seg.p2.screen.x;
    const y2 = seg.p2.screen.y;
    const w2 = seg.p2.screen.w;
    // grass / ground
    ctx.fillStyle = seg.color === 'light' ? '#3a5a42' : '#33483a';
    ctx.fillRect(0, y2, W, y1 - y2);
    // roadside buildings, drawn against the sky wash
    for (const b of seg.buildings) {
      const scale = seg.p1.screen.scale;
      if (scale < 0.0004) continue;
      const bw = scale * b.w * (W / 2);
      const bh = scale * b.h * (H / 2);
      if (bw < 12 || bh < 20) continue;
      const bx = x1 + b.side * (w1 * 0.62 + bw / 2);
      drawBuilding(ctx, bx - bw / 2, y1 - bh, bw, bh, b.district, b.seed, { litRatio: 0.5 });
    }
    // road surface
    ctx.fillStyle = seg.color === 'light' ? '#3a3348' : '#353044';
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x1 + w1, y1);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x2 - w2, y2);
    ctx.closePath();
    ctx.fill();
    // wet sheen
    ctx.fillStyle = 'rgba(255,140,70,0.10)';
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x1 + w1, y1);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x2 - w2, y2);
    ctx.closePath();
    ctx.fill();
    // lane markers
    if (seg.color === 'light') {
      ctx.fillStyle = 'rgba(255,224,138,0.8)';
      const lw1 = Math.max(1, w1 * 0.02);
      const lw2 = Math.max(1, w2 * 0.02);
      for (const lane of [-0.33, 0.33]) {
        ctx.beginPath();
        ctx.moveTo(x1 + w1 * lane - lw1, y1);
        ctx.lineTo(x1 + w1 * lane + lw1, y1);
        ctx.lineTo(x2 + w2 * lane + lw2, y2);
        ctx.lineTo(x2 + w2 * lane - lw2, y2);
        ctx.closePath();
        ctx.fill();
      }
    }
    // fog wash for depth
    if (seg.fog < 0.9) {
      ctx.fillStyle = `rgba(255,150,90,${(1 - seg.fog) * 0.25})`;
      ctx.fillRect(0, y2, W, y1 - y2);
    }
  }

  renderFoot() {
    const ctx = this.ctx;
    const P = PALETTES.market;
    drawSky(ctx, W, H, P, W * 0.3, H * 0.2);
    drawSkyline(ctx, W, H * 0.44, 'market', 31, 12, 80, 200);
    // street + sidewalk
    ctx.fillStyle = '#33272f';
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
    ctx.fillStyle = '#6e5a52';
    ctx.fillRect(0, H * 0.56, W, H * 0.06);
    for (const p of this.peds) drawPedestrian(ctx, p.x, p.y, p.s, p.seed, { walk: Math.sin(p.walk) });
    for (const c of this.cops) drawCop(ctx, c.x, c.y, c.s, {});
    // the player, aiming toward the mouse
    const f = this.foot;
    drawCrewShooter(ctx, f.x, f.y, 1.6, '#ff5a2e', { flash: this.flash > 0 });
    if (this.flash > 0) {
      ctx.strokeStyle = 'rgba(255,220,120,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x + 40, f.y - 48);
      ctx.lineTo(this.mouse.x, this.mouse.y);
      ctx.stroke();
    }
    // parked hero car at the curb to get back into
    drawHeroCar(ctx, 1080, 640, 260, 92, { angle: -0.03 });
    label(ctx, 'E — GET IN', 1080, 540, 'bold 13px Arial, sans-serif', '#ffd76a', 'center');
    // crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.mouse.x - 18, this.mouse.y);
    ctx.lineTo(this.mouse.x - 6, this.mouse.y);
    ctx.moveTo(this.mouse.x + 6, this.mouse.y);
    ctx.lineTo(this.mouse.x + 18, this.mouse.y);
    ctx.moveTo(this.mouse.x, this.mouse.y - 18);
    ctx.lineTo(this.mouse.x, this.mouse.y - 6);
    ctx.moveTo(this.mouse.x, this.mouse.y + 6);
    ctx.lineTo(this.mouse.x, this.mouse.y + 18);
    ctx.stroke();
    drawHud(ctx, W, H, this.hudState());
    if (this.wheelOpen) this.renderWheel();
    if (this.messageTimer > 0) this.renderMessage();
  }

  renderWheel() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8,6,16,0.6)';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2 - 40;
    for (let i = 0; i < WEAPONS.length; i++) {
      const a = -Math.PI / 2 + (i / WEAPONS.length) * Math.PI * 2;
      const wx = cx + Math.cos(a) * 130;
      const wy = cy + Math.sin(a) * 130;
      const w = WEAPONS[i];
      ctx.fillStyle = i === this.weaponIndex ? 'rgba(255,122,61,0.9)' : 'rgba(16,12,28,0.9)';
      ctx.beginPath();
      ctx.arc(wx, wy, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, w.name, wx, wy - 4, 'bold 12px Arial, sans-serif', '#ffffff', 'center', false);
      label(ctx, w.ammo + ' / ' + w.max, wx, wy + 14, '11px Arial, sans-serif', '#ffd76a', 'center', false);
    }
    label(ctx, 'WEAPON WHEEL — F to cycle, Q to close', cx, cy + 210, 'bold 14px Arial, sans-serif', '#ffffff', 'center');
  }

  renderMessage() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10,8,20,0.75)';
    const tw = ctx.measureText(this.message).width + 30;
    rr(ctx, W / 2 - 260, 116, 520, 34, 8);
    ctx.fill();
    label(ctx, this.message, W / 2, 139, 'bold 14px Arial, sans-serif', '#ffd76a', 'center', false);
    void tw;
  }

  renderMenu() {
    const ctx = this.ctx;
    const P = PALETTES.beach;
    drawSky(ctx, W, H, P, W * 0.68, H * 0.28);
    drawSkyline(ctx, W, H * 0.52, 'beach', 11, 14, 60, 200);
    ctx.fillStyle = '#3a3348';
    ctx.fillRect(0, H * 0.52, W, H * 0.48);
    ctx.fillStyle = 'rgba(255,140,70,0.15)';
    ctx.fillRect(0, H * 0.52, W, H * 0.48);
    drawHeroCar(ctx, W / 2, H * 0.72, 420, 150, { angle: -0.05, nos: true, brakeGlow: true });
    glow(ctx, W / 2, H * 0.72, 260, '#ff2e88', 0.25);
    // title
    label(ctx, 'NEON BAY', W / 2, 150, 'bold 84px Arial, sans-serif', '#ffffff', 'center');
    label(ctx, '16 missions  •  5-star BCPD  •  hurricane countdown', W / 2, 190, 'bold 19px Arial, sans-serif', '#ffd76a', 'center');
    ctx.fillStyle = 'rgba(10,8,20,0.72)';
    rr(ctx, W / 2 - 300, 220, 600, 190, 12);
    ctx.fill();
    const lines = [
      'W / ↑  accelerate      S / ↓  brake      A D  steer',
      'SHIFT  NOS boost      SPACE  handbrake      E  get in / out',
      'CLICK  fire (on foot)      F  weapon      Q  weapon wheel',
      'M  radio      5 districts  •  3 crew  •  4 radio stations',
      'Hurricane landfall in ' + Math.floor(this.hurricaneLeft / 60) + ':' + String(Math.floor(this.hurricaneLeft % 60)).padStart(2, '0'),
    ];
    lines.forEach((l, i) => label(ctx, l, W / 2, 252 + i * 30, i === 4 ? 'bold 15px Arial, sans-serif' : '15px Arial, sans-serif', i === 4 ? '#3dd6ff' : '#e8e8f0', 'center', false));
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
    ctx.globalAlpha = pulse;
    label(ctx, 'CLICK TO START', W / 2, 470, 'bold 26px Arial, sans-serif', '#7cff5e', 'center');
    ctx.globalAlpha = 1;
    if (this.money > 1200 || this.missionIndex > 0) {
      label(ctx, 'Save loaded — ' + this.money.toLocaleString('en-US') + ' dollars, mission ' + (this.missionIndex + 1) + '/16', W / 2, 510, '14px Arial, sans-serif', '#c8c8d8', 'center', false);
    }
  }

  renderBusted() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10,6,20,0.82)';
    ctx.fillRect(0, 0, W, H);
    label(ctx, 'BUSTED', W / 2, 330, 'bold 72px Arial, sans-serif', '#ff4d4d', 'center');
    label(ctx, 'The BCPD caught you on foot. Click to get back in the car.', W / 2, 380, '18px Arial, sans-serif', '#ffffff', 'center');
    if (!this.bustedBound) {
      this.bustedBound = true;
      this.canvas.addEventListener('mousedown', () => {
        if (this.mode !== 'busted') return;
        this.mode = 'drive';
        this.stars = Math.max(0, this.stars - 1);
        this.bustedBound = false;
      });
    }
  }

  renderDone() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10,6,20,0.82)';
    ctx.fillRect(0, 0, W, H);
    label(ctx, 'LANDFALL', W / 2, 300, 'bold 64px Arial, sans-serif', '#3dd6ff', 'center');
    label(ctx, 'You escaped Neon Bay with ' + this.money.toLocaleString('en-US') + ' dollars and ' + Math.round(this.respect) + ' respect.', W / 2, 350, '18px Arial, sans-serif', '#ffffff', 'center');
    label(ctx, 'Missions finished: ' + (this.missionIndex + 1) + '/16 — click to play again', W / 2, 390, '16px Arial, sans-serif', '#ffd76a', 'center');
    if (!this.doneBound) {
      this.doneBound = true;
      this.canvas.addEventListener('mousedown', () => {
        if (this.mode !== 'done') return;
        this.mode = 'drive';
        this.missionIndex = 0;
        this.missionDistance = 0;
        this.hurricaneLeft = HURRICANE_TOTAL;
        this.doneBound = false;
      });
    }
  }

  // main loop entry, called with the frame delta in seconds
  frame(dt) {
    this.update(dt);
    this.render();
  }
}
