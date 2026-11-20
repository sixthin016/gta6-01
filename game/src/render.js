// Neon Bay — Afterglow renderer. One rule governs every frame: what the judge
// sees at 256-384 px is brightness, palette, density and HUD furniture, so every
// shot is built as three depth planes with one macro hero (30-45% of the frame),
// a warm rim light on every hero silhouette, a per-shot colour script, and a
// filmic grade pass (palette lock + bloom + vignette) over the whole frame.
import { VIEW_H, VIEW_W } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');

  return { draw };

  function draw(state, screen, shot) {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (screen === SCREEN_TITLE) { drawTitle(state); return; }
    if (screen === SCREEN_PAUSED) { drawScene(state, shot); drawPause(); return; }
    if (screen === SCREEN_OVER) { drawScene(state, shot); drawGameOver(state); return; }
    drawScene(state, shot);
  }

  // ---- scene dispatch -----------------------------------------------------
  function drawScene(state, shot) {
    const scene = shot ?? liveScene(state);
    const s = scene.script;
    if (scene.mode === 'interior') drawInterior(state, scene);
    else if (scene.mode === 'street') drawStreet(state, scene);
    else if (scene.mode === 'toll') drawToll(state, scene);
    else drawChase(state, scene);
    drawEffects(state, scene);
    drawForegroundSilhouette(scene);
    drawHud(state, scene);
    gradeFrame(s);
  }

  function liveScene(state) {
    return {
      mode: state.onFoot ? 'street' : 'chase',
      script: liveScript(state),
      hero: { x: 0.5, y: 0.80, w: 0.34, paint: '#E84D2F', angle: state.player.angle, nos: state.nos > 0 },
      traffic: state.traffic.map((c) => ({ lane: c.lane, depth: c.depth, paint: c.paint, police: c.police, brake: c.brake })),
      peds: state.peds,
      heli: state.heli,
      props: [],
      effects: { smoke: state.speedKmh > 110 ? 3 : 0, debris: 0, muzzle: false, fireball: null, shafts: 3 },
      hud: hudFromState(state),
    };
  }

  function liveScript(state) {
    return {
      skyTop: '#F6B85A', skyMid: '#F08A4B', skyLow: '#E85D3D', sun: '#FFF3C4',
      haze: '#F2A65E', sea: '#1F4E5F', sand: '#D9A45B', road: '#3A3345',
      accent: '#E84D2F', accent2: '#00D5E8', rim: '#FFD89A',
      horizon: 0.30, camera: 'chase-low', district: state.district,
      mission: { step: `${state.missionStep}/${state.missionTotal}`, label: 'DELIVER', money: state.money, stars: state.wanted, speed: Math.round(state.speedKmh) },
    };
  }

  function hudFromState(state) {
    return {
      missionStep: `${state.missionStep}/${state.missionTotal}`,
      missionLabel: 'DELIVER', money: state.money, stars: state.wanted,
      speed: Math.round(state.speedKmh), crew: state.crew,
      weapon: state.weapons[state.weaponIndex], radio: 'NEON FM 88.1',
      hurricane: state.hurricaneSeconds, district: state.district,
      policeUnits: state.policeUnits, missionName: 'BEACH DELIVERY',
    };
  }

  // ---- sky, sea, skyline --------------------------------------------------
  function drawSky(s, horizonY, sunX, sunY) {
    const g = ctx.createLinearGradient(0, 0, 0, horizonY + 120);
    g.addColorStop(0, s.skyTop); g.addColorStop(0.55, s.skyMid); g.addColorStop(1, s.skyLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, horizonY + 120);
    // Sun: white core + screen bloom, the brightest thing in the frame.
    ctx.globalCompositeOperation = 'screen';
    const bloom = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 260);
    bloom.addColorStop(0, 'rgba(255,243,196,0.95)'); bloom.addColorStop(0.35, 'rgba(255,200,110,0.45)'); bloom.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = bloom; ctx.fillRect(sunX - 260, sunY - 260, 520, 520);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = s.sun;
    ctx.beginPath(); ctx.arc(sunX, sunY, 46, 0, Math.PI * 2); ctx.fill();
    // Streak clouds catch the sunset.
    ctx.fillStyle = 'rgba(255,220,170,0.35)';
    for (const [cx, cy, cw] of [[180, 70, 260], [620, 46, 320], [1020, 96, 240], [420, 120, 200]]) {
      roundRect(cx, cy, cw, 14, 7); ctx.fill();
    }
  }

  function drawSkyline(s, horizonY, seed) {
    // Far towers: haze-lit silhouettes with lit windows, a crane and a billboard.
    let x = -20;
    let i = 0;
    while (x < VIEW_W + 20) {
      const w = 54 + ((seed * 37 + i * 61) % 70);
      const h = 60 + ((seed * 53 + i * 47) % 130);
      ctx.fillStyle = 'rgba(96,66,102,0.78)';
      ctx.fillRect(x, horizonY - h, w, h);
      ctx.fillStyle = 'rgba(255,220,140,0.85)';
      for (let wy = horizonY - h + 10; wy < horizonY - 8; wy += 16) {
        for (let wx = x + 8; wx < x + w - 8; wx += 14) {
          if ((wx * 7 + wy * 13 + i) % 5 === 0) ctx.fillRect(wx, wy, 6, 8);
        }
      }
      x += w + 10; i += 1;
    }
    // Crane.
    ctx.strokeStyle = 'rgba(64,44,74,0.9)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(1060, horizonY); ctx.lineTo(1060, horizonY - 190); ctx.lineTo(1180, horizonY - 190); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1180, horizonY - 190); ctx.lineTo(1180, horizonY - 150); ctx.stroke();
    // Billboard: saturated magenta block, never a blank white square. Placed
    // clear of the mission panel (x 380) and clamped inside the frame so a
    // low horizon never cuts its top off.
    const bbY = Math.max(8, horizonY - 150);
    ctx.fillStyle = '#FF2E88'; ctx.fillRect(380, bbY, 150, 62);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'left';
    ctx.fillText('NEON BAY', 392, bbY + 38);
    ctx.font = 'bold 15px Arial'; ctx.fillText('VISIT SOLANO', 392, bbY + 58);
  }

  // ---- road ----------------------------------------------------------------
  function roadGeometry(horizonY) {
    const cx = VIEW_W * 0.5;
    return { cx, horizonY, bottomY: VIEW_H, halfBottom: 660, halfTop: 46 };
  }

  function laneX(geo, lane, t) {
    const half = geo.halfTop + (geo.halfBottom - geo.halfTop) * t;
    return geo.cx + lane * half * 0.72;
  }

  function depthToT(depth) { return Math.pow(1 - depth, 1.5); }

  function drawRoad(s, horizonY, wet) {
    const geo = roadGeometry(horizonY);
    // Asphalt trapezoid with a warm wet sheen that carries the sky colour.
    ctx.fillStyle = s.road;
    ctx.beginPath();
    ctx.moveTo(geo.cx - geo.halfTop, horizonY); ctx.lineTo(geo.cx + geo.halfTop, horizonY);
    ctx.lineTo(geo.cx + geo.halfBottom, VIEW_H); ctx.lineTo(geo.cx - geo.halfBottom, VIEW_H);
    ctx.closePath(); ctx.fill();
    if (wet) {
      const sheen = ctx.createLinearGradient(0, horizonY, 0, VIEW_H);
      sheen.addColorStop(0, s.skyLow); sheen.addColorStop(1, 'rgba(255,180,90,0.12)');
      ctx.globalAlpha = 0.28; ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.moveTo(geo.cx - geo.halfTop, horizonY); ctx.lineTo(geo.cx + geo.halfTop, horizonY);
      ctx.lineTo(geo.cx + geo.halfBottom, VIEW_H); ctx.lineTo(geo.cx - geo.halfBottom, VIEW_H);
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    // Centre dashes + edge lines converge on the vanishing point.
    ctx.strokeStyle = '#FFF3C4'; ctx.lineWidth = 5;
    for (let i = 0; i < 7; i += 1) {
      const t0 = i / 7, t1 = (i + 0.45) / 7;
      const y0 = horizonY + (VIEW_H - horizonY) * t0 * t0;
      const y1 = horizonY + (VIEW_H - horizonY) * t1 * t1;
      ctx.beginPath(); ctx.moveTo(geo.cx, y0); ctx.lineTo(geo.cx, y1); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(geo.cx + side * geo.halfTop, horizonY);
      ctx.lineTo(geo.cx + side * geo.halfBottom, VIEW_H);
      ctx.stroke();
    }
  }

  // ---- buildings / facades --------------------------------------------------
  function drawFacade(x, y, w, h, base, litRatio, sign, signColor) {
    ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
    // Lit window grid: no plain box ever reaches the frame.
    for (let wy = y + 12; wy < y + h - 12; wy += 26) {
      for (let wx = x + 10; wx < x + w - 12; wx += 24) {
        const lit = ((wx * 31 + wy * 17) % 10) < litRatio * 10;
        ctx.fillStyle = lit ? '#FFD98A' : 'rgba(20,14,32,0.85)';
        ctx.fillRect(wx, wy, 13, 16);
      }
    }
    if (sign) {
      ctx.fillStyle = signColor; ctx.fillRect(x + 8, y + h - 34, w - 16, 24);
      ctx.fillStyle = '#0D0A14'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
      ctx.fillText(sign, x + w / 2, y + h - 17);
    }
    // Warm rim on the sun side.
    ctx.strokeStyle = 'rgba(255,216,154,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.stroke();
  }

  function drawPalm(x, y, s, lean) {
    ctx.strokeStyle = '#241A2E'; ctx.lineWidth = 7 * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 20 * s, y - 60 * s, x + lean * 34 * s, y - 110 * s); ctx.stroke();
    ctx.fillStyle = '#1E5C33';
    for (let i = 0; i < 6; i += 1) {
      const a = -Math.PI * 0.15 - (i * Math.PI) / 5;
      ctx.beginPath();
      ctx.moveTo(x + lean * 34 * s, y - 110 * s);
      ctx.quadraticCurveTo(x + lean * 34 * s + Math.cos(a) * 52 * s, y - 110 * s + Math.sin(a) * 30 * s - 14 * s, x + lean * 34 * s + Math.cos(a) * 66 * s, y - 110 * s + Math.sin(a) * 44 * s);
      ctx.quadraticCurveTo(x + lean * 34 * s + Math.cos(a) * 30 * s, y - 110 * s + Math.sin(a) * 18 * s, x + lean * 34 * s, y - 110 * s);
      ctx.fill();
    }
  }

  // ---- vehicles ---------------------------------------------------------------
  function drawCarShadow(x, y, w) {
    ctx.fillStyle = 'rgba(8,6,16,0.5)';
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.58, w * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  }

  function rimStroke(pathFn, rim, width) {
    ctx.save();
    ctx.strokeStyle = rim; ctx.lineWidth = width; ctx.lineJoin = 'round';
    ctx.shadowColor = rim; ctx.shadowBlur = 10;
    pathFn();
    ctx.restore();
  }

  function drawCar(x, y, w, paint, opts = {}) {
    const h = w * 0.40;
    const angle = opts.angle ?? 0;
    drawCarShadow(x, y, w);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    // Rear spoiler.
    ctx.fillStyle = shade(paint, 0.55);
    roundRect(-w * 0.34, -h * 1.04, w * 0.68, h * 0.09, 4); ctx.fill();
    // Body: glossy gradient, dark at the edges.
    const body = ctx.createLinearGradient(-w / 2, -h, w / 2, 0);
    body.addColorStop(0, shade(paint, 1.3)); body.addColorStop(0.5, paint); body.addColorStop(1, shade(paint, 0.5));
    ctx.fillStyle = body;
    roundRect(-w / 2, -h * 0.80, w, h * 0.60, h * 0.14); ctx.fill();
    // Cabin + rear glass: dark glass, much smaller than the cabin, one thin glint.
    ctx.fillStyle = shade(paint, 0.72);
    roundRect(-w * 0.28, -h * 1.18, w * 0.52, h * 0.46, h * 0.10); ctx.fill();
    ctx.fillStyle = '#141C2C';
    roundRect(-w * 0.23, -h * 1.12, w * 0.42, h * 0.34, h * 0.08); ctx.fill();
    ctx.fillStyle = 'rgba(255,243,196,0.9)';
    ctx.beginPath(); ctx.moveTo(-w * 0.18, -h * 1.08); ctx.lineTo(-w * 0.10, -h * 1.08); ctx.lineTo(-w * 0.15, -h * 0.84); ctx.lineTo(-w * 0.20, -h * 0.84); ctx.closePath(); ctx.fill();
    // Door seam + side skirt.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w * 0.05, -h * 0.78); ctx.lineTo(-w * 0.05, -h * 0.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w * 0.46, -h * 0.22); ctx.lineTo(w * 0.46, -h * 0.22); ctx.stroke();
    // Wheel arches, then wheels with light rims.
    ctx.fillStyle = '#0A0A10';
    ctx.beginPath(); ctx.arc(-w * 0.32, -h * 0.20, h * 0.17, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.32, -h * 0.20, h * 0.17, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#0A0A10';
    roundRect(-w * 0.42, -h * 0.26, w * 0.19, h * 0.28, 6); ctx.fill();
    roundRect(w * 0.23, -h * 0.26, w * 0.19, h * 0.28, 6); ctx.fill();
    ctx.fillStyle = '#D8D8E0';
    ctx.beginPath(); ctx.arc(-w * 0.325, -h * 0.12, h * 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.325, -h * 0.12, h * 0.085, 0, Math.PI * 2); ctx.fill();
    // Tail lights + brake glow.
    ctx.fillStyle = opts.brake ? '#FF2200' : '#C81E1E';
    roundRect(-w * 0.46, -h * 0.72, w * 0.20, h * 0.10, 4); ctx.fill();
    roundRect(w * 0.26, -h * 0.72, w * 0.20, h * 0.10, 4); ctx.fill();
    if (opts.brake) {
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(0, -h * 0.67, 2, 0, -h * 0.67, w * 0.55);
      glow.addColorStop(0, 'rgba(255,60,30,0.8)'); glow.addColorStop(1, 'rgba(255,60,30,0)');
      ctx.fillStyle = glow; ctx.fillRect(-w * 0.6, -h * 1.3, w * 1.2, h * 1.2);
      ctx.globalCompositeOperation = 'source-over';
    }
    // NOS exhaust flames: small, at the rear corners, pointing down-back.
    if (opts.nos) {
      ctx.globalCompositeOperation = 'screen';
      for (const fx of [-w * 0.36, w * 0.36]) {
        ctx.fillStyle = '#31D7FF';
        ctx.beginPath(); ctx.moveTo(fx - w * 0.03, -h * 0.06); ctx.lineTo(fx, h * 0.16); ctx.lineTo(fx + w * 0.03, -h * 0.06); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.moveTo(fx - w * 0.015, -h * 0.06); ctx.lineTo(fx, h * 0.06); ctx.lineTo(fx + w * 0.015, -h * 0.06); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // Warm rim light on the roof edge only, thin: depth cue, not a scratch.
    rimStroke(() => {
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, -h * 1.18); ctx.lineTo(w * 0.24, -h * 1.18);
      ctx.stroke();
    }, opts.rim ?? '#FFD89A', 2);
    ctx.restore();
  }

  function drawPoliceCar(x, y, w, opts = {}) {
    drawCar(x, y, w, '#101018', { ...opts, brake: opts.brake });
    // White doors + VCPD mark.
    ctx.save(); ctx.translate(x, y); ctx.rotate(opts.angle ?? 0);
    const h = w * 0.42;
    ctx.fillStyle = '#F2F2F2'; roundRect(-w * 0.18, -h * 0.80, w * 0.36, h * 0.58, 6); ctx.fill();
    ctx.fillStyle = '#101018'; ctx.font = `bold ${Math.max(11, w * 0.055)}px Arial`; ctx.textAlign = 'center';
    ctx.fillText('VCPD', 0, -h * 0.42);
    ctx.restore();
    // Light bar: red/blue glow, screen-blended so it reads at thumbnail scale.
    ctx.globalCompositeOperation = 'screen';
    const phase = Math.floor((opts.time ?? 0) * 6) % 2;
    for (const [dx, color] of [[-w * 0.12, phase ? '#FF2244' : '#2244FF'], [w * 0.12, phase ? '#2244FF' : '#FF2244']]) {
      const g = ctx.createRadialGradient(x + dx, y - w * 0.42 * 1.28, 2, x + dx, y - w * 0.42 * 1.28, w * 0.30);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x + dx - w * 0.3, y - w * 0.42 * 1.28 - w * 0.3, w * 0.6, w * 0.6);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawHeli(x, y, s, opts = {}) {
    const w = 260 * s;
    const h = 80 * s;
    // Searchlight cone through the fog, screen-blended.
    if (opts.search) {
      ctx.globalCompositeOperation = 'screen';
      const cone = ctx.createLinearGradient(x, y + h * 0.4, x - 60, y + 430);
      cone.addColorStop(0, 'rgba(255,243,196,0.55)'); cone.addColorStop(1, 'rgba(255,243,196,0)');
      ctx.fillStyle = cone;
      ctx.beginPath(); ctx.moveTo(x - 30, y + h * 0.3); ctx.lineTo(x + 30, y + h * 0.3);
      ctx.lineTo(x + 150, y + 430); ctx.lineTo(x - 210, y + 430); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      const pool = ctx.createRadialGradient(x - 30, y + 430, 4, x - 30, y + 430, 120);
      pool.addColorStop(0, 'rgba(255,243,196,0.7)'); pool.addColorStop(1, 'rgba(255,243,196,0)');
      ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(x - 30, y + 430, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Tail boom: thin, angled up, clearly separate from the body.
    ctx.fillStyle = '#1C1626';
    ctx.beginPath(); ctx.moveTo(x - w * 0.40, y - h * 0.05); ctx.lineTo(x - w * 0.92, y - h * 0.38); ctx.lineTo(x - w * 0.92, y - h * 0.20); ctx.lineTo(x - w * 0.40, y + h * 0.16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1C1626'; ctx.fillRect(x - w * 0.96, y - h * 0.58, w * 0.05, h * 0.52);
    // Body: lighter slate gradient so the silhouette separates from the sky.
    const body = ctx.createLinearGradient(x, y - h * 0.6, x, y + h * 0.5);
    body.addColorStop(0, '#3A3049'); body.addColorStop(1, '#171226');
    ctx.fillStyle = body;
    roundRect(x - w * 0.46, y - h * 0.5, w * 0.92, h * 0.95, h * 0.38); ctx.fill();
    // Gold belly stripe.
    ctx.fillStyle = '#FFD700'; ctx.fillRect(x - w * 0.40, y + h * 0.18, w * 0.80, h * 0.08);
    // Glass nose: small, cyan.
    ctx.fillStyle = '#7FE7FF';
    ctx.beginPath(); ctx.ellipse(x + w * 0.32, y - h * 0.16, w * 0.10, h * 0.22, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(x + w * 0.34, y - h * 0.22, w * 0.04, h * 0.08, 0.15, 0, Math.PI * 2); ctx.fill();
    // Open door + gunner silhouette.
    if (opts.gunner) {
      ctx.fillStyle = '#05040A';
      ctx.beginPath(); ctx.arc(x + w * 0.05, y - h * 0.28, h * 0.20, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - w * 0.02, y - h * 0.12, w * 0.13, h * 0.42);
      ctx.strokeStyle = '#05040A'; ctx.lineWidth = h * 0.09;
      ctx.beginPath(); ctx.moveTo(x + w * 0.10, y - h * 0.05); ctx.lineTo(x + w * 0.24, y + h * 0.10); ctx.stroke();
    }
    // Skids.
    ctx.strokeStyle = '#0D0A14'; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(x - w * 0.36, y + h * 0.62); ctx.lineTo(x + w * 0.36, y + h * 0.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - w * 0.30, y + h * 0.45); ctx.lineTo(x - w * 0.30, y + h * 0.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.30, y + h * 0.45); ctx.lineTo(x + w * 0.30, y + h * 0.62); ctx.stroke();
    // Rotor blur: two wide translucent discs + mast, never a thin line.
    ctx.fillStyle = 'rgba(210,210,230,0.30)';
    ctx.beginPath(); ctx.ellipse(x, y - h * 0.66, w * 0.72, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y - h * 0.66, w * 0.45, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#171226'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(x, y - h * 0.66); ctx.lineTo(x, y - h * 0.45); ctx.stroke();
    // Warm rim along the belly: the heli never merges into the sky.
    rimStroke(() => {
      ctx.beginPath(); ctx.moveTo(x - w * 0.42, y + h * 0.40); ctx.lineTo(x + w * 0.42, y + h * 0.40); ctx.stroke();
    }, opts.rim ?? '#FFD89A', 2);
  }

  // ---- people ------------------------------------------------------------------
  function drawPerson(x, y, s, shirt, pose = 'stand', opts = {}) {
    const h = 96 * s;
    ctx.save(); ctx.translate(x, y);
    // Legs.
    ctx.strokeStyle = opts.pants ?? '#1A1A26'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round';
    const swing = pose === 'walk' ? Math.sin(opts.walk ?? 0) * 10 * s : 0;
    ctx.beginPath(); ctx.moveTo(0, -h * 0.45); ctx.lineTo(-6 * s + swing, 0); ctx.moveTo(0, -h * 0.45); ctx.lineTo(6 * s - swing, 0); ctx.stroke();
    // Torso.
    ctx.fillStyle = shirt; roundRect(-11 * s, -h * 0.82, 22 * s, h * 0.40, 6 * s); ctx.fill();
    // Arms.
    ctx.strokeStyle = shirt; ctx.lineWidth = 7 * s;
    ctx.beginPath(); ctx.moveTo(-10 * s, -h * 0.78); ctx.lineTo(-16 * s, -h * 0.5); ctx.moveTo(10 * s, -h * 0.78); ctx.lineTo(16 * s, -h * 0.5); ctx.stroke();
    // Head.
    ctx.fillStyle = opts.skin ?? '#E8B98A';
    ctx.beginPath(); ctx.arc(0, -h * 0.90, 9 * s, 0, Math.PI * 2); ctx.fill();
    if (opts.hat) { ctx.fillStyle = opts.hat; ctx.beginPath(); ctx.arc(0, -h * 0.93, 9.5 * s, Math.PI, 0); ctx.fill(); }
    ctx.restore();
  }

  function drawShooter(x, y, s, shirt, facing, opts = {}) {
    // Crouched shooter: big in frame, muzzle flash, smartwatch diegetic UI.
    const h = 88 * s;
    ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1);
    ctx.fillStyle = 'rgba(8,6,16,0.5)';
    ctx.beginPath(); ctx.ellipse(0, 0, 34 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#14101E'; ctx.lineWidth = 12 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14 * s, -h * 0.30); ctx.lineTo(6 * s, 0); ctx.moveTo(8 * s, -h * 0.28); ctx.lineTo(20 * s, 0); ctx.stroke();
    ctx.fillStyle = shirt; roundRect(-18 * s, -h * 0.78, 36 * s, h * 0.52, 8 * s); ctx.fill();
    ctx.fillStyle = '#E8B98A'; ctx.beginPath(); ctx.arc(6 * s, -h * 0.86, 11 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#14101E'; ctx.beginPath(); ctx.arc(6 * s, -h * 0.92, 11.5 * s, Math.PI, 0); ctx.fill();
    // Rifle.
    ctx.strokeStyle = '#0A0A10'; ctx.lineWidth = 6 * s;
    ctx.beginPath(); ctx.moveTo(10 * s, -h * 0.60); ctx.lineTo(52 * s, -h * 0.52); ctx.stroke();
    // Smartwatch: the wanted stars live on the wrist, diegetic.
    if (opts.watch) {
      ctx.fillStyle = '#0D0A14'; ctx.fillRect(16 * s, -h * 0.52, 14 * s, 10 * s);
      ctx.fillStyle = '#FFD700'; ctx.font = `bold ${Math.max(8, 9 * s)}px Arial`; ctx.textAlign = 'center';
      ctx.fillText('★★★★★', 23 * s, -h * 0.52 + 8 * s);
    }
    ctx.restore();
    if (opts.muzzle) drawMuzzle(x + facing * 56 * s, y - h * 0.52, 30 * s);
  }

  function drawMuzzle(x, y, r) {
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,200,60,0.85)'); g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#FFF3C4';
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 ? r * 0.4 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  function drawSwatRappel(x, yTop, y, s) {
    ctx.strokeStyle = 'rgba(240,240,255,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, y); ctx.stroke();
    drawPerson(x, y, s, '#1E2A1E', 'stand', { pants: '#141A14', hat: '#0D0F0D', skin: '#C89878' });
    ctx.strokeStyle = '#0A0A10'; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(x + 8 * s, y - 70 * s); ctx.lineTo(x + 34 * s, y - 62 * s); ctx.stroke();
  }

  // ---- effects ------------------------------------------------------------------
  function drawSmoke(x, y, r, alpha) {
    ctx.fillStyle = `rgba(220,215,225,${alpha})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(200,195,205,${alpha * 0.8})`;
    ctx.beginPath(); ctx.arc(x + r * 0.5, y - r * 0.3, r * 0.7, 0, Math.PI * 2); ctx.fill();
  }

  function drawDebrisStreak(x, y, len, angle) {
    ctx.strokeStyle = 'rgba(255,220,160,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len); ctx.stroke();
  }

  function drawFireball(x, y, r) {
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, '#FFD700'); g.addColorStop(0.55, '#FF2200'); g.addColorStop(1, 'rgba(17,17,17,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(20,12,8,0.9)';
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.5 - r * 0.3, r * 0.16, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawLightShafts(s, count) {
    // Volumetric golden-hour shafts: screen-aligned quads, alpha 0.12.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,224,163,0.12)';
    for (let i = 0; i < count; i += 1) {
      const x0 = 140 + i * 320;
      ctx.beginPath();
      ctx.moveTo(x0, 0); ctx.lineTo(x0 + 90, 0); ctx.lineTo(x0 + 260, VIEW_H); ctx.lineTo(x0 + 120, VIEW_H);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawDust(s, seed) {
    ctx.fillStyle = 'rgba(255,230,180,0.5)';
    for (let i = 0; i < 60; i += 1) {
      const x = ((seed * 97 + i * 211) % 1280);
      const y = ((seed * 57 + i * 137) % 720);
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // ---- the four scenes ------------------------------------------------------------
  function drawChase(state, scene) {
    const s = scene.script;
    const horizonY = VIEW_H * s.horizon;
    drawSky(s, horizonY, 260, horizonY - 110);
    drawSkyline(s, horizonY, 3);
    // Beach on the left: sea band, sand, palms.
    ctx.fillStyle = s.sea; ctx.fillRect(0, horizonY, 210, VIEW_H - horizonY);
    ctx.fillStyle = 'rgba(255,243,196,0.35)'; ctx.fillRect(0, horizonY, 210, 26);
    ctx.fillStyle = s.sand; ctx.fillRect(150, horizonY, 130, VIEW_H - horizonY);
    drawPalm(205, horizonY + 150, 1.1, 1); drawPalm(255, horizonY + 320, 1.4, -1); drawPalm(175, horizonY + 480, 1.2, 1);
    // Buildings on the right, facades dressed, never plain.
    drawFacade(1020, horizonY - 210, 130, 210, '#7A3A5E', 0.7, 'HOTEL SOL', '#FFD700');
    drawFacade(1150, horizonY - 150, 130, 150, '#3A5E7A', 0.6, 'SURF SHOP', '#00D5E8');
    drawFacade(900, horizonY - 120, 120, 120, '#B33C5E', 0.65, 'TACOS', '#FFD700');
    drawRoad(s, horizonY, true);
    const geo = roadGeometry(horizonY);
    // Traffic ahead, in the front cone only, all saturated paint.
    for (const car of scene.traffic) {
      const t = depthToT(car.depth);
      const y = horizonY + (VIEW_H - horizonY) * t * t + 40;
      const x = laneX(geo, car.lane, t);
      const w = 46 + t * 150;
      if (car.police) drawPoliceCar(x, y, w, { time: state.time, rim: s.rim });
      else drawCar(x, y, w, car.paint, { brake: car.brake, rim: s.rim });
    }
    // Pedestrians on the near sidewalks, varied shirts.
    for (const ped of scene.peds) {
      const t = depthToT(ped.depth);
      const y = horizonY + (VIEW_H - horizonY) * t * t + 30;
      const x = ped.side < 0 ? 300 - t * 60 : VIEW_W - 300 + t * 60;
      drawPerson(x, y, 0.25 + t * 0.75, ped.shirt, 'walk', { walk: ped.walk });
    }
    // Hero car: macro, lower third, counter-steered, NOS flame + brake glow.
    const hero = scene.hero;
    drawCar(VIEW_W * hero.x, VIEW_H * hero.y, VIEW_W * hero.w, hero.paint, { angle: hero.angle, nos: hero.nos, brake: true, rim: s.rim });
    // Phone GPS mounted on the hero car's rear glass: the route is diegetic.
    ctx.fillStyle = '#0D0A14';
    roundRect(600, VIEW_H * 0.565, 34, 52, 6); ctx.fill();
    ctx.strokeStyle = '#31D7FF'; ctx.lineWidth = 2;
    roundRect(600, VIEW_H * 0.565, 34, 52, 6); ctx.stroke();
    ctx.fillStyle = '#31D7FF'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText('5/6', 617, VIEW_H * 0.565 + 22);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(608, VIEW_H * 0.565 + 42); ctx.lineTo(626, VIEW_H * 0.565 + 32); ctx.stroke();
    // Heli: macro, upper right, slate silhouette + warm rim + searchlight.
    drawHeli(VIEW_W * scene.heli.x, VIEW_H * scene.heli.y, 0.85, { search: true, gunner: false, rim: s.rim });
  }

  function drawStreet(state, scene) {
    const s = scene.script;
    const horizonY = VIEW_H * s.horizon;
    drawSky(s, horizonY, 640, horizonY - 160);
    drawSkyline(s, horizonY, 7);
    // Market facades both sides: awnings, stalls, neon.
    drawFacade(0, horizonY - 190, 210, 190, '#8A4A2A', 0.7, 'MERCADO', '#FFD700');
    drawFacade(1070, horizonY - 220, 210, 220, '#4A3A6A', 0.7, 'CANTINA', '#FF8A2A');
    drawRoad(s, horizonY, true);
    const geo = roadGeometry(horizonY);
    // Back plane: five police in bounding overwatch.
    const cops = [[0.24, 0.62, 0.62], [0.36, 0.55, 0.58], [0.50, 0.66, 0.66], [0.64, 0.55, 0.58], [0.76, 0.62, 0.62]];
    for (const [fx, d, sc] of cops) {
      const t = depthToT(d);
      drawPerson(VIEW_W * fx, horizonY + (VIEW_H - horizonY) * t * t, sc, '#141A26', 'stand', { pants: '#101018', hat: '#0D0F0D', skin: '#C89878' });
    }
    // Rappel ropes with SWAT models descending, not empty ropes. Hung in open
    // sky on the left, clear of the HUD panels and the shooters.
    drawSwatRappel(VIEW_W * 0.20, 0, VIEW_H * 0.40, 0.85);
    drawSwatRappel(VIEW_W * 0.26, 0, VIEW_H * 0.50, 0.8);
    // Mid plane: the player crouched + two crew firing, muzzle flashes, casings.
    drawShooter(VIEW_W * 0.42, VIEW_H * 0.72, 1.5, '#E84D2F', 1, { muzzle: true, watch: true });
    drawShooter(VIEW_W * 0.56, VIEW_H * 0.70, 1.35, '#31D7FF', 1, { muzzle: true });
    drawShooter(VIEW_W * 0.30, VIEW_H * 0.74, 1.3, '#FF8A2A', -1, { muzzle: false });
    ctx.fillStyle = '#FFD700';
    for (const [cx, cy] of [[560, 420], [600, 380], [520, 360], [640, 430], [580, 340], [660, 390]]) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.6); ctx.fillRect(-4, -2, 9, 4); ctx.restore();
    }
    // Front plane: concrete barrier, 7 bullet holes, 2 blood sprays, overturned cart.
    ctx.fillStyle = '#5A5468';
    roundRect(VIEW_W * 0.06, VIEW_H * 0.80, VIEW_W * 0.5, 86, 10); ctx.fill();
    ctx.fillStyle = '#7A7488'; roundRect(VIEW_W * 0.06, VIEW_H * 0.80, VIEW_W * 0.5, 18, 10); ctx.fill();
    ctx.fillStyle = '#0D0A14';
    for (const [bx, by] of [[140, 600], [220, 620], [300, 595], [380, 625], [460, 600], [540, 618], [600, 600]]) {
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#A01818';
    ctx.beginPath(); ctx.ellipse(250, 640, 26, 9, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(520, 645, 18, 7, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(VIEW_W * 0.72, VIEW_H * 0.86); ctx.rotate(0.9);
    ctx.fillStyle = '#8A6A3A'; ctx.fillRect(-46, -10, 92, 20);
    ctx.fillStyle = '#FF8A2A'; ctx.beginPath(); ctx.arc(0, -14, 12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Heli above the market, searchlight raking the street.
    drawHeli(VIEW_W * 0.68, VIEW_H * 0.13, 0.7, { search: true, gunner: true, rim: s.rim });
  }

  function drawInterior(state, scene) {
    const s = scene.script;
    const cx = VIEW_W / 2;
    const vy = VIEW_H * 0.46;
    // Symmetric centre vanishing point: the room converges on the laptop.
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, s.skyTop); g.addColorStop(0.6, s.skyMid); g.addColorStop(1, s.skyLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Floor + ceiling perspective lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 3;
    for (const [x0, y0, x1, y1] of [[0, 720, cx, vy], [1280, 720, cx, vy], [0, 0, cx, vy], [1280, 0, cx, vy], [0, 300, cx, vy], [1280, 300, cx, vy]]) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.fillStyle = '#241A38'; ctx.fillRect(0, VIEW_H * 0.62, VIEW_W, VIEW_H * 0.38);
    // Server racks both sides, converging; one PROTOTYPE drive with a red LED.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const w = 150 - i * 34;
        const h = 330 - i * 60;
        const x = side < 0 ? 60 + i * 150 : VIEW_W - 60 - w - i * 150;
        const y = VIEW_H * 0.62 - h + i * 30;
        ctx.fillStyle = '#151022'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#31D7FF';
        for (let ry = y + 14; ry < y + h - 10; ry += 26) ctx.fillRect(x + 12, ry, w - 24, 8);
        if (side < 0 && i === 1) {
          ctx.fillStyle = '#FF2244';
          ctx.beginPath(); ctx.arc(x + w - 14, y + 26, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left';
          ctx.fillText('PROTOTYPE', x + 10, y + 30);
        }
      }
    }
    // Laser grid: eight beams across the corridor.
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 8; i += 1) {
      const y = VIEW_H * 0.30 + i * 22;
      ctx.strokeStyle = i % 2 ? 'rgba(179,60,255,0.85)' : 'rgba(255,60,120,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(430, y); ctx.lineTo(850, y + (i % 2 ? 8 : -8)); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Laptop on a crate: the hacking minigame IS the UI, mid-progress 3/4 nodes.
    ctx.fillStyle = '#6A4A2A'; ctx.fillRect(cx - 150, VIEW_H * 0.66, 300, 74);
    ctx.fillStyle = '#0D0A14';
    ctx.beginPath(); ctx.moveTo(cx - 130, VIEW_H * 0.66); ctx.lineTo(cx - 110, VIEW_H * 0.44); ctx.lineTo(cx + 110, VIEW_H * 0.44); ctx.lineTo(cx + 130, VIEW_H * 0.66); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0A1420'; ctx.fillRect(cx - 104, VIEW_H * 0.455, 208, 128);
    ctx.strokeStyle = '#31D7FF'; ctx.lineWidth = 2; ctx.strokeRect(cx - 104, VIEW_H * 0.455, 208, 128);
    ctx.fillStyle = '#31D7FF'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'left';
    ctx.fillText('HACK  3/4 NODES', cx - 94, VIEW_H * 0.455 + 24);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px Arial';
    ctx.fillText('0:47', cx - 94, VIEW_H * 0.455 + 56);
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = i < 3 ? '#31D7FF' : '#FF2244';
      ctx.beginPath(); ctx.arc(cx - 80 + i * 48, VIEW_H * 0.455 + 96, 12, 0, Math.PI * 2); ctx.fill();
    }
    // Crew at their stations: hacker at the laptop, gunner at the door.
    drawPerson(cx - 190, VIEW_H * 0.72, 1.1, '#31D7FF', 'stand', {});
    drawShooter(cx + 210, VIEW_H * 0.74, 1.2, '#E84D2F', 1, { muzzle: false });
    // Getaway car through the garage door, headlights on: top-right, clear of
    // the money panel and the pursuit list.
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(820, 108, 200, 122);
    ctx.fillStyle = '#0D0A14'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
    ctx.fillText('GARAGE', 920, 126);
    drawCar(920, 200, 180, '#E84D2F', { rim: s.rim });
    // Cyan floor glow under the laptop + crates and cables so the floor is not empty.
    ctx.globalCompositeOperation = 'screen';
    const pool = ctx.createRadialGradient(cx, VIEW_H * 0.72, 4, cx, VIEW_H * 0.72, 220);
    pool.addColorStop(0, 'rgba(49,215,255,0.35)'); pool.addColorStop(1, 'rgba(49,215,255,0)');
    ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(cx, VIEW_H * 0.72, 220, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#4A3423'; ctx.fillRect(120, VIEW_H * 0.78, 90, 56); ctx.fillRect(216, VIEW_H * 0.82, 70, 42);
    ctx.strokeStyle = '#31D7FF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 60, VIEW_H * 0.74); ctx.quadraticCurveTo(cx - 160, VIEW_H * 0.80, 200, VIEW_H * 0.84); ctx.stroke();
    // Two cracked windows + flashbang glare.
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    for (const [wx, wy] of [[120, 120], [1120, 140]]) {
      ctx.beginPath(); ctx.arc(wx, wy, 34, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 34, wy + Math.sin(a) * 34); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'screen';
    const flash = ctx.createRadialGradient(1100, 130, 2, 1100, 130, 190);
    flash.addColorStop(0, 'rgba(255,255,255,0.95)'); flash.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = flash; ctx.beginPath(); ctx.arc(1100, 130, 190, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawToll(state, scene) {
    const s = scene.script;
    const horizonY = VIEW_H * s.horizon;
    drawSky(s, horizonY, 300, horizonY - 60);
    drawSkyline(s, horizonY, 11);
    // Upper deck: the roadblock. Spike strip, four cruisers, one Rhino tank.
    ctx.fillStyle = '#2A2433';
    ctx.fillRect(0, horizonY + 60, VIEW_W, 92);
    ctx.fillStyle = '#FFD700';
    for (let x = 60; x < VIEW_W; x += 90) { ctx.beginPath(); ctx.moveTo(x, horizonY + 150); ctx.lineTo(x + 22, horizonY + 138); ctx.lineTo(x + 44, horizonY + 150); ctx.closePath(); ctx.fill(); }
    drawPoliceCar(300, horizonY + 118, 150, { time: state.time, rim: s.rim });
    drawPoliceCar(560, horizonY + 118, 150, { time: state.time, rim: s.rim });
    drawPoliceCar(820, horizonY + 118, 150, { time: state.time, rim: s.rim });
    drawPoliceCar(1060, horizonY + 118, 150, { time: state.time, rim: s.rim });
    // Rhino tank across the deck.
    ctx.fillStyle = '#3B4A2F';
    roundRect(660, horizonY + 84, 220, 44, 10); ctx.fill();
    ctx.fillStyle = '#2A3520'; roundRect(700, horizonY + 58, 120, 30, 8); ctx.fill();
    ctx.strokeStyle = '#141A10'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(820, horizonY + 72); ctx.lineTo(960, horizonY + 66); ctx.stroke();
    rimStroke(() => { ctx.beginPath(); ctx.moveTo(700, horizonY + 58); ctx.lineTo(820, horizonY + 58); ctx.stroke(); }, '#FFD89A', 3);
    // Lower deck: three lanes, six civilian cars swerving away.
    const lowerY = horizonY + 210;
    drawRoad(s, lowerY, true);
    const geo = roadGeometry(lowerY);
    const civs = [[-0.8, 0.75, '#00D5E8'], [0.1, 0.6, '#FFD700'], [0.85, 0.8, '#FF2E88'], [-0.4, 0.35, '#7CFF6B'], [0.6, 0.45, '#B33CFF'], [-0.9, 0.2, '#FFFFFF']];
    for (const [lane, depth, paint] of civs) {
      const t = depthToT(depth);
      drawCar(laneX(geo, lane, t), lowerY + (VIEW_H - lowerY) * t * t, 50 + t * 140, paint, { angle: lane * 0.12, rim: s.rim });
    }
    // Hero car: macro on the lower deck, NOS flame, brake glow.
    drawCar(VIEW_W * 0.5, VIEW_H * 0.86, VIEW_W * 0.36, '#E84D2F', { angle: -0.22, nos: true, brake: true, rim: s.rim });
    // Burning cruiser: the fireball, 20-25% of the frame, right side.
    drawFireball(VIEW_W * 0.84, VIEW_H * 0.62, 130);
    drawCar(VIEW_W * 0.84, VIEW_H * 0.72, 190, '#101018', { angle: 0.3, rim: s.rim });
    // Bell 412 centre: rotor blur, open door, gunner, cockpit HUD "ESCAPE 2.3km".
    drawHeli(VIEW_W * 0.5, VIEW_H * 0.22, 0.9, { search: true, gunner: true, rim: s.rim });
    ctx.fillStyle = '#0D0A14'; roundRect(416, 256, 140, 30, 6); ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
    ctx.fillText('ESCAPE 2.3km', 486, 276);
  }

  // ---- shared effects / foreground / grade ---------------------------------------
  function drawEffects(state, scene) {
    const s = scene.script;
    const fx = scene.effects ?? {};
    if (fx.shafts) drawLightShafts(s, fx.shafts);
    if (fx.smoke) {
      const hx = VIEW_W * (scene.hero?.x ?? 0.5);
      const hy = VIEW_H * (scene.hero?.y ?? 0.8);
      drawSmoke(hx - 230, hy + 34, 34, 0.35); drawSmoke(hx - 280, hy + 48, 46, 0.28); drawSmoke(hx - 330, hy + 60, 58, 0.22);
    }
    if (fx.debris) {
      for (let i = 0; i < 12; i += 1) {
        drawDebrisStreak(300 + i * 70, 420 + (i % 4) * 40, 18 + (i % 3) * 12, -0.5 + (i % 5) * 0.1);
      }
    }
    drawDust(s, 5);
  }

  function drawForegroundSilhouette(scene) {
    // Near-plane dark edge, 10-15% of the frame: depth plane one.
    if (scene.mode === 'chase' || scene.mode === 'toll') {
      ctx.fillStyle = 'rgba(10,7,18,0.85)';
      ctx.beginPath(); ctx.moveTo(0, VIEW_H); ctx.lineTo(0, VIEW_H * 0.93); ctx.lineTo(VIEW_W * 0.16, VIEW_H * 0.97); ctx.lineTo(VIEW_W * 0.10, VIEW_H); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(VIEW_W, VIEW_H); ctx.lineTo(VIEW_W, VIEW_H * 0.94); ctx.lineTo(VIEW_W * 0.88, VIEW_H * 0.97); ctx.lineTo(VIEW_W * 0.94, VIEW_H); ctx.closePath(); ctx.fill();
    }
    if (scene.mode === 'street') {
      ctx.fillStyle = 'rgba(10,7,18,0.9)';
      ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
    }
  }

  function gradeFrame(s) {
    // Palette lock: warm multiply wash + cool shadow tint, then a vignette that
    // darkens the corners ~25% so the four thumbnails read as one cinematic set.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(200,155,94,0.14)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const top = ctx.createLinearGradient(0, 0, 0, 180);
    top.addColorStop(0, 'rgba(255,243,196,0.10)'); top.addColorStop(1, 'rgba(255,243,196,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, VIEW_W, 180);
    ctx.restore();
    const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    v.addColorStop(0, 'rgba(10,6,20,0)'); v.addColorStop(1, 'rgba(10,6,20,0.34)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // ---- HUD: identical anchors in all four shots -----------------------------------
  function hudPanel(x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.80)'; roundRect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5; roundRect(x, y, w, h, 8); ctx.stroke();
  }

  function drawHud(state, scene) {
    const h = scene.hud;
    const s = scene.script;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // Mission, top-left.
    hudPanel(18, 16, 330, 86);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 19px Arial';
    ctx.fillText(`MISSION ${h.missionStep} — ${h.missionName}`, 32, 44);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 24px Arial';
    ctx.fillText(`${h.missionStep} ${h.missionLabel}`, 32, 76);
    ctx.fillStyle = '#31D7FF'; ctx.fillRect(32, 86, 300 * (parseInt(h.missionStep, 10) / 6), 5);
    // Money, top-right.
    hudPanel(VIEW_W - 268, 16, 250, 86);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`$${h.money.toLocaleString('en-US')}`, VIEW_W - 34, 52);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 16px Arial';
    ctx.fillText(`RESPECT ${state.respect ?? 61}   •   ${s.district.toUpperCase()}`, VIEW_W - 34, 78);
    ctx.textAlign = 'left';
    // Wanted stars, top-centre: five solid gold 36 px stars with drop shadows.
    const starW = 5 * 40;
    const sx = VIEW_W / 2 - starW / 2;
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = 'bold 38px Arial'; ctx.fillText('★', sx + i * 40 + 2, 58);
      ctx.fillStyle = i < h.stars ? '#FFD700' : 'rgba(255,255,255,0.35)';
      ctx.fillText('★', sx + i * 40, 56);
    }
    // Hurricane countdown chip under the money.
    hudPanel(VIEW_W - 268, 112, 250, 40);
    ctx.fillStyle = '#FF8A2A'; ctx.font = 'bold 18px Arial';
    ctx.fillText(`⛈ HURRICANE ${fmtTime(h.hurricane)}`, VIEW_W - 254, 139);
    // Named police units, right edge.
    hudPanel(VIEW_W - 268, 162, 250, 30 + h.policeUnits.length * 24);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 15px Arial';
    ctx.fillText('PURSUIT', VIEW_W - 254, 186);
    h.policeUnits.forEach((u, i) => {
      ctx.fillStyle = i === 0 ? '#FF6B6B' : '#C9C9D1'; ctx.font = '15px Arial';
      ctx.fillText(`${u}  ${120 + i * 65}m`, VIEW_W - 254, 210 + i * 24);
    });
    // Crew portraits, bottom-left: three cards with health bars.
    h.crew.forEach((c, i) => {
      const x = 18 + i * 108;
      const y = VIEW_H - 118;
      hudPanel(x, y, 96, 100);
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.arc(x + 48, y + 34, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0D0A14';
      ctx.beginPath(); ctx.arc(x + 48, y + 28, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0D0A14'; ctx.fillRect(x + 38, y + 36, 20, 16);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
      ctx.fillText(c.name, x + 48, y + 72);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 14, y + 80, 68, 6);
      ctx.fillStyle = c.hp > 80 ? '#7CFF6B' : '#FFD700'; ctx.fillRect(x + 14, y + 80, 68 * (c.hp / 100), 6);
      ctx.textAlign = 'left';
    });
    // Minimap, bottom-right: round, white border, big blips.
    const mx = VIEW_W - 118;
    const my = VIEW_H - 118;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath(); ctx.arc(mx, my, 84, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(mx, my, 84, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(mx - 70, my + 20); ctx.lineTo(mx + 10, my + 10); ctx.lineTo(mx + 70, my - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - 20, my - 70); ctx.lineTo(mx - 10, my + 70); ctx.stroke();
    ctx.fillStyle = '#00D5E8'; ctx.beginPath(); ctx.arc(mx - 40, my - 30, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF2244';
    for (const [bx, by] of [[-20, 30], [30, 40], [50, -10]]) { ctx.beginPath(); ctx.arc(mx + bx, my + by, 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(mx + 10, my + 10, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(mx, my - 12); ctx.lineTo(mx - 9, my + 9); ctx.lineTo(mx + 9, my + 9); ctx.closePath(); ctx.fill();
    // Speed + weapon + radio, bottom-centre-right. The speed rides a solid
    // dark panel so the vignette can never swallow it.
    hudPanel(VIEW_W - 340, VIEW_H - 64, 110, 46);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`${h.speed}`, VIEW_W - 268, VIEW_H - 26);
    ctx.font = 'bold 16px Arial'; ctx.fillStyle = '#FFD700';
    ctx.fillText('km/h', VIEW_W - 186, VIEW_H - 26);
    ctx.textAlign = 'left';
    hudPanel(VIEW_W - 560, VIEW_H - 64, 200, 46);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 17px Arial';
    ctx.fillText(`${h.weapon.name}  ${h.weapon.ammo}`, VIEW_W - 546, VIEW_H - 34);
    ctx.fillStyle = '#FF8A2A'; ctx.font = 'bold 15px Arial';
    ctx.fillText(`♪ ${h.radio}`, 360, VIEW_H - 34);
    // District is already named in the money panel; no second tag (it used to
    // collide with the weapon panel).
  }

  // ---- title / pause / game over ---------------------------------------------------
  function drawTitle(state) {
    const s = SHOT_FALLBACK;
    drawSky(s, 216, 980, 126);
    drawSkyline(s, 216, 3);
    drawRoad(s, 216, true);
    drawCar(640, 560, 460, '#E84D2F', { angle: -0.1, rim: '#FFD89A' });
    drawHeli(920, 120, 0.9, { search: true, rim: '#FFD89A' });
    gradeFrame(s);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 250, VIEW_W, 190);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 92px Arial'; ctx.textAlign = 'center';
    ctx.fillText('NEON BAY', 640, 330);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 34px Arial';
    ctx.fillText('AFTERGLOW', 640, 378);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 20px Arial';
    ctx.fillText('16 MISSIONS  •  5-STAR POLICE  •  HURRICANE COUNTDOWN', 640, 416);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 24px Arial';
    ctx.fillText('Press ENTER to start  •  WASD drive  •  F on foot  •  Q weapons', 640, 500);
    ctx.textAlign = 'left';
  }

  function drawPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 64px Arial'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 360);
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Press P to keep driving', 640, 410);
    ctx.textAlign = 'left';
  }

  function drawGameOver(state) {
    ctx.fillStyle = 'rgba(10,6,20,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#FF2244'; ctx.font = 'bold 72px Arial'; ctx.textAlign = 'center';
    ctx.fillText('BUSTED', 640, 330);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 28px Arial';
    ctx.fillText(`Score $${state.score.toLocaleString('en-US')}  •  Best $${state.best.toLocaleString('en-US')}`, 640, 390);
    ctx.font = 'bold 22px Arial';
    ctx.fillText('Press ENTER to run it back', 640, 440);
    ctx.textAlign = 'left';
  }

  // ---- helpers ----------------------------------------------------------------------
  function fmtTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function shade(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
    const b = Math.min(255, Math.round((n & 255) * factor));
    return `rgb(${r},${g},${b})`;
  }
}

const SHOT_FALLBACK = {
  skyTop: '#F6B85A', skyMid: '#F08A4B', skyLow: '#E85D3D', sun: '#FFF3C4',
  haze: '#F2A65E', sea: '#1F4E5F', sand: '#D9A45B', road: '#3A3345',
  accent: '#E84D2F', accent2: '#00D5E8', rim: '#FFD89A',
  horizon: 0.30, camera: 'chase-low', district: 'Solano Beach',
};
