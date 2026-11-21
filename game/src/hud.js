// hud.js — every DOM overlay: the start screen, health/cash/wanted HUD,
// mission banner, message feed, pause menu, and the 2D minimap canvas
// that draws roads, the player, police, crew and the mission marker.
import { clamp } from './rng.js';

export class Hud {
  constructor() {
    this.el = {};
    for (const id of ['title', 'hud', 'health-fill', 'cash', 'xp', 'stars', 'clock', 'storm', 'district', 'm-title', 'm-text', 'feed', 'speed', 'minimap', 'crosshair', 'vignette', 'pause', 'toast', 'save-note']) {
      this.el[id] = document.getElementById(id);
    }
    this.map = this.el.minimap.getContext('2d');
    this.messages = [];
    this.started = false;
    this.onStart = null;
    this.onResume = null;
    this.onSave = null;
    this.onRestart = null;
  }

  bindButtons() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => this._start());
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) resumeBtn.addEventListener('click', () => this._resume());
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => { if (this.onSave) this.onSave(); });
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', () => { if (this.onRestart) this.onRestart(); });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && !this.started) this._start();
    });
  }

  _start() {
    if (this.started) return;
    this.started = true;
    this.el.title.style.display = 'none';
    this.el.hud.style.display = 'block';
    if (this.onStart) this.onStart();
  }

  _resume() {
    this.el.pause.style.display = 'none';
    if (this.onResume) this.onResume();
  }

  showPause(show) { this.el.pause.style.display = show ? 'flex' : 'none'; }

  setHealth(h, max) {
    this.el['health-fill'].style.width = `${clamp((h / max) * 100, 0, 100)}%`;
    this.el['health-fill'].style.background = h < 30 ? '#e74c3c' : '#2ecc71';
  }

  setCash(cash) { this.el.cash.textContent = `$${cash.toLocaleString('en-US')}`; }
  setXp(xp, level) { this.el.xp.textContent = `LV ${level} · ${xp} XP`; }

  setWanted(level) {
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < level ? '★' : '☆';
    this.el.stars.textContent = stars;
    this.el.stars.style.color = level >= 4 ? '#ff4444' : level >= 2 ? '#ffaa00' : '#ffd166';
  }

  // Heat bar: fills toward the next wanted star, drains as you cool off.
  setHeat(frac, level) {
    const bar = document.getElementById('heat-fill');
    if (!bar) return;
    bar.style.width = `${Math.round(frac * 100)}%`;
    bar.style.background = level >= 4 ? '#ff4444' : level >= 2 ? '#ffaa00' : '#ffd166';
    bar.parentElement.style.display = level === 0 && frac < 0.05 ? 'none' : 'block';
  }

  // Countdown for timed missions (race / deliver), hidden when untimed.
  setTimer(seconds) {
    const t = document.getElementById('m-timer');
    if (!t) return;
    if (seconds > 0) {
      t.textContent = `⏱ ${seconds}s`;
      t.style.display = 'block';
      t.style.color = seconds <= 10 ? '#ff5555' : '#7fd4ff';
    } else t.style.display = 'none';
  }

  setClock(hour, minute, day) {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    this.el.clock.textContent = `${hh}:${mm} · Day ${day}`;
  }

  setStorm(hoursLeft) {
    const d = Math.floor(hoursLeft / 24);
    const h = Math.floor(hoursLeft % 24);
    this.el.storm.textContent = `🌀 SOLANA LANDFALL: ${d}d ${h}h`;
    this.el.storm.style.color = hoursLeft < 24 ? '#ff5555' : '#7fd4ff';
  }

  setDistrict(name) { this.el.district.textContent = name; }

  setMission(title, text) {
    this.el['m-title'].textContent = title;
    this.el['m-text'].textContent = text;
  }

  setSpeed(kmh, driving) {
    this.el.speed.textContent = driving ? `${Math.round(kmh)} km/h` : '';
  }

  setAmmo(ammo, reserve) {
    this.el.crosshair.textContent = ammo > 0 ? `✛ ${ammo} / ${reserve}` : 'R — RELOAD';
    this.el.crosshair.style.display = 'block';
  }

  showToast(text, ms = 2600) {
    this.el.toast.textContent = text;
    this.el.toast.style.display = 'block';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { this.el.toast.style.display = 'none'; }, ms);
  }

  setVignette(amount) {
    this.el.vignette.style.opacity = String(clamp(amount, 0, 0.85));
  }

  // Message feed: newest on top, fades after a while.
  feed(text) {
    this.messages.unshift({ text, at: Date.now() });
    if (this.messages.length > 4) this.messages.pop();
    this.el.feed.innerHTML = this.messages.map((m) => `<div>${m.text}</div>`).join('');
  }

  saveNote(text) {
    this.el['save-note'].textContent = text;
    this.el['save-note'].style.display = 'block';
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => { this.el['save-note'].style.display = 'none'; }, 3000);
  }

  // Minimap: 190px canvas, city bounds mapped to the square, north up.
  drawMinimap(state) {
    const ctx = this.map;
    const S = 190;
    const toMap = (x, z) => [((x + 280) / 560) * S, ((z + 280) / 560) * S];
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(8, 18, 28, 0.82)';
    ctx.fillRect(0, 0, S, S);
    // Beach + sea at the south edge.
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(0, S * 0.82, S, S * 0.18);
    ctx.fillStyle = '#1a6f8e';
    ctx.fillRect(0, S * 0.93, S, S * 0.07);
    // Roads.
    ctx.strokeStyle = '#5a6470';
    ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      const [px] = toMap(i * 70, 0);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, S); ctx.stroke();
      const [, pz] = toMap(0, i * 70);
      ctx.beginPath(); ctx.moveTo(0, pz); ctx.lineTo(S, pz); ctx.stroke();
    }
    // Mission marker: pulsing gold diamond.
    if (state.marker) {
      const [mx, mz] = toMap(state.marker.x, state.marker.z);
      const pulse = 5 + Math.sin(performance.now() / 220) * 2;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(mx, mz - pulse); ctx.lineTo(mx + pulse, mz); ctx.lineTo(mx, mz + pulse); ctx.lineTo(mx - pulse, mz);
      ctx.closePath(); ctx.fill();
    }
    // Police: red dots. Crew: green dots. Traffic: faint grey dots.
    for (const c of state.police || []) {
      const [x, z] = toMap(c.x, c.z);
      ctx.fillStyle = '#ff3344';
      ctx.beginPath(); ctx.arc(x, z, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of state.crew || []) {
      const [x, z] = toMap(c.x, c.z);
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath(); ctx.arc(x, z, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of state.traffic || []) {
      const [x, z] = toMap(c.x, c.z);
      ctx.fillStyle = 'rgba(200,200,200,0.55)';
      ctx.fillRect(x - 1.2, z - 1.2, 2.4, 2.4);
    }
    // Player: white arrow pointing along heading.
    const [px, pz] = toMap(state.px, state.pz);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(state.heading);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2.5); ctx.lineTo(-5, 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // View cone hint + north marker.
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', S - 12, 14);
  }
}
