// Neon Bay — HUD: wanted stars, cash, respect, district badge, hurricane
// clock, objective line, weapon + ammo + NOS meter, crew perks, prompts,
// toasts, start/pause screens, garage/shop panels, weapon wheel, and the
// district-tinted minimap with mission / cop / heli / crew markers.
import { S, stars, STORM_SECONDS } from '../core/state.js';
import { DISTRICTS, districtAt, PLACES } from '../city/districts.js';
import { WEAPONS } from '../sim/weapons.js';
import { crewNames, crewPerks } from '../sim/people.js';
import { MISSIONS } from '../story/missions.js';

const $ = (id) => document.getElementById(id);
let minimap = null;
let mctx = null;
let toastTimer = null;

export function initHUD() {
  minimap = $('minimap');
  if (minimap) mctx = minimap.getContext('2d');
  const startBtn = $('btn-start');
  if (startBtn) startBtn.addEventListener('click', () => window.__neonbay_start?.(false));
  const contBtn = $('btn-continue');
  if (contBtn) contBtn.addEventListener('click', () => window.__neonbay_start?.(true));
  const resumeBtn = $('btn-resume');
  if (resumeBtn) resumeBtn.addEventListener('click', () => window.__neonbay_resume?.());
}

export function showToast(msg, ms = 2600) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, ms);
}

function fmtClock() {
  const left = Math.max(0, STORM_SECONDS - S.time);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(Math.floor(left % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function updateHUD() {
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const st = stars();
  set('stars', '★'.repeat(st) + '☆'.repeat(5 - st));
  const starsEl = $('stars');
  if (starsEl) starsEl.style.color = st >= 4 ? '#ff4444' : st >= 2 ? '#ffaa22' : '#ffffff';
  set('cash', `$${S.cash.toLocaleString()}`);
  set('respect', `Respect ${S.respect}`);
  const d = districtAt(S.player.pos.x, S.player.pos.z);
  set('district', d.name);
  const dEl = $('district');
  if (dEl) dEl.style.borderColor = d.color;
  set('storm-clock', `🌀 ${fmtClock()}`);
  set('objective', S.objective || 'Free roam — Neon Bay is yours');
  set('prompt', S.prompt || '');
  const w = WEAPONS[S.weapon];
  set('weapon', `${w.name}  ${S.ammo[S.weapon]} / ${S.reserve[S.weapon]}`);
  const nosFill = $('nos-fill');
  if (nosFill) nosFill.style.width = `${S.nos}%`;
  const nosWrap = $('nos-wrap');
  if (nosWrap) nosWrap.style.opacity = S.upgrades.nos > 0 ? '1' : '0.35';
  const perks = crewPerks();
  set('perks', perks.length ? perks.join('  •  ') : '');
  const crew = crewNames();
  set('crew', crew.length ? `Crew: ${crew.join(', ')}` : 'Crew: — (race, turncoat, high-stakes missions recruit)');
  const hpEl = $('hp');
  if (hpEl) {
    hpEl.textContent = `HP ${Math.max(0, Math.ceil(S.player.hp))}${S.armor > 0 ? `  🛡 ${Math.ceil(S.armor)}` : ''}`;
    hpEl.style.color = S.player.hp < 30 ? '#ff5555' : '#ffffff';
  }
  const misEl = $('mission-count');
  if (misEl) {
    const done = S.missionDone.filter(Boolean).length;
    misEl.textContent = `Missions ${done}/16`;
  }
  drawMinimap();
}

function toMap(x, z, size) {
  const s = size / 420;
  return [(x + 210) * s, (z + 210) * s];
}

function drawMinimap() {
  if (!mctx || !minimap) return;
  const W = minimap.width, H = minimap.height;
  const c = mctx;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#0d1420';
  c.fillRect(0, 0, W, H);
  // districts
  for (const d of DISTRICTS) {
    const [x0, y0] = toMap(d.x0, d.z0, W);
    const [x1, y1] = toMap(d.x1, d.z1, W);
    c.fillStyle = d.tint;
    c.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // roads
  c.strokeStyle = 'rgba(200,200,210,0.35)';
  c.lineWidth = 1;
  for (const v of [-160, -120, -80, -40, 0, 40, 80, 120, 160]) {
    const [x] = toMap(v, 0, W);
    const [, y] = toMap(0, v, W);
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // water east
  const [wx] = toMap(190, 0, W);
  c.fillStyle = 'rgba(40,120,160,0.5)';
  c.fillRect(wx, 0, W - wx, H);
  const dot = (x, z, color, r = 3) => {
    const [mx, my] = toMap(x, z, W);
    c.fillStyle = color;
    c.beginPath(); c.arc(mx, my, r, 0, Math.PI * 2); c.fill();
  };
  dot(PLACES.garage.x, PLACES.garage.z, '#2a9d8f', 4);
  for (const s of PLACES.shops) dot(s.x, s.z, '#e8c33d', 4);
  for (const s of PLACES.safehouses) dot(s.x, s.z, '#7ed957', 4);
  for (const t of S.targets) if (t.hp > 0) dot(t.mesh.position.x, t.mesh.position.z, '#ff2222', 3);
  for (const rb of S.roadblocks) dot(rb.pos.x, rb.pos.z, '#ff7a1a', 4);
  for (const cop of S.cops) dot(cop.mesh.position.x, cop.mesh.position.z, '#4488ff', 3);
  if (S.heli) dot(S.heli.mesh.position.x, S.heli.mesh.position.z, '#ff4444', 5);
  for (const f of S.followers) if (f.mesh.visible) dot(f.mesh.position.x, f.mesh.position.z, '#37d67a', 3);
  // mission marker (pulsing diamond)
  if (S.missionMarker) {
    const [mx, my] = toMap(S.missionMarker.x, S.missionMarker.z, W);
    const r = 5 + Math.sin(S.time * 5) * 2;
    c.fillStyle = '#ffd23d';
    c.beginPath();
    c.moveTo(mx, my - r); c.lineTo(mx + r, my); c.lineTo(mx, my + r); c.lineTo(mx - r, my);
    c.closePath(); c.fill();
  }
  // player arrow
  const [px, py] = toMap(S.player.pos.x, S.player.pos.z, W);
  c.save();
  c.translate(px, py);
  c.rotate(Math.PI - S.player.heading);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6);
  c.closePath(); c.fill();
  c.restore();
}

// --- screens ---
export function showStart(hasSave) {
  const el = $('start-screen');
  if (el) el.style.display = 'flex';
  const cont = $('btn-continue');
  if (cont) cont.style.display = hasSave ? 'inline-block' : 'none';
  const list = $('mission-list');
  if (list) {
    list.innerHTML = MISSIONS.map((m, i) =>
      `<div class="mission-row">${S.missionDone[i] ? '✓' : `${i + 1}.`} ${m.name} <span class="act">Act ${m.act}</span></div>`).join('');
  }
}

export function hideStart() {
  const el = $('start-screen');
  if (el) el.style.display = 'none';
}

export function showPause(show) {
  const el = $('pause-screen');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// --- panels (garage / shop) ---
export let panelKind = null;

export function showPanel(kind, title, rows) {
  panelKind = kind;
  const el = $('panel');
  if (!el) return;
  $('panel-title').textContent = title;
  $('panel-body').innerHTML = rows.map((r, i) =>
    `<div class="panel-row"><span class="panel-key">${i + 1}</span><span class="panel-name">${r.name}</span><span class="panel-desc">${r.desc}</span><span class="panel-cost">${r.cost}</span></div>`).join('') +
    `<div class="panel-hint">Press 1–4 to buy • Esc to close</div>`;
  el.style.display = 'block';
}

export function hidePanel() {
  panelKind = null;
  const el = $('panel');
  if (el) el.style.display = 'none';
}

// --- weapon wheel ---
export function showWheel(show) {
  const el = $('wheel');
  if (!el) return;
  if (show) {
    el.innerHTML = WEAPONS.map((w, i) =>
      `<div class="wheel-slot${i === S.weapon ? ' active' : ''}"><b>${i + 1}</b> ${w.name}<span>${S.ammo[i]} / ${S.reserve[i]}</span></div>`).join('');
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}
