// Neon Bay — hud.js: the whole interface — wanted stars, health, cash,
// mission objective, speed, the live minimap, the start screen, pause
// and mission menus, and the message feed. Plain DOM over the canvas.
import { DISTRICTS } from './city.js';
import { MISSIONS } from './missions.js';

export function createHud() {
  const root = document.getElementById('hud');
  const els = {};
  for (const id of ['stars', 'cash', 'health-fill', 'health-text', 'objective', 'objective-title', 'speed', 'clock', 'storm', 'feed', 'minimap', 'district', 'ammo']) {
    els[id] = document.getElementById(id);
  }
  const minimap = els.minimap;
  const mctx = minimap.getContext('2d');
  return {
    els,
    mctx,
    messages: [],
    showMessage(text, ms = 4200) {
      const div = document.createElement('div');
      div.className = 'feed-msg';
      div.textContent = text;
      els.feed.appendChild(div);
      this.messages.push(div);
      while (this.messages.length > 4) this.messages.shift().remove();
      setTimeout(() => {
        div.classList.add('fade');
        setTimeout(() => div.remove(), 600);
      }, ms);
    },
    setStars(n) {
      els.stars.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
      els.stars.classList.toggle('hot', n >= 3);
    },
    setCash(n) {
      els.cash.textContent = `$${Math.floor(n).toLocaleString('en-US')}`;
    },
    setHealth(h) {
      const pct = Math.max(0, Math.min(100, h));
      els['health-fill'].style.width = `${pct}%`;
      els['health-text'].textContent = `${Math.ceil(pct)} HP`;
      els['health-fill'].classList.toggle('low', pct < 30);
    },
    setObjective(title, text) {
      els['objective-title'].textContent = title;
      els.objective.textContent = text;
    },
    setSpeed(kmh, inCar) {
      els.speed.textContent = inCar ? `${Math.round(Math.abs(kmh))} km/h` : '';
    },
    setAmmo(n) {
      els.ammo.textContent = n > 0 ? `Ammo ${n}` : 'Press R to reload';
    },
    setClock(stormSeconds) {
      const total = Math.max(0, Math.floor(stormSeconds));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      els.clock.textContent = `Hurricane Solana: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      els.storm.classList.toggle('urgent', total < 3600);
    },
    setDistrict(name) {
      els.district.textContent = name;
    },
  };
}

export function drawMinimap(hud, state) {
  const { mctx, els } = hud;
  const size = els.minimap.width;
  const ctx = mctx;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(10, 16, 28, 0.85)';
  ctx.fillRect(0, 0, size, size);
  const toMap = (x, z) => [((x + 280) / 560) * size, ((z + 280) / 560) * size];
  // Sea and sand.
  ctx.fillStyle = '#0e5f7a';
  ctx.fillRect(0, 0, size, size * 0.07);
  ctx.fillStyle = '#d9b380';
  ctx.fillRect(0, size * 0.07, size, size * 0.06);
  // Roads.
  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 3;
  for (const v of [-180, -120, -60, 0, 60, 120, 180]) {
    const [x1, y1] = toMap(v, -280);
    const [x2, y2] = toMap(v, 280);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const [x3, y3] = toMap(-280, v);
    const [x4, y4] = toMap(280, v);
    ctx.beginPath();
    ctx.moveTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.stroke();
  }
  // Districts.
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    const [x, y] = toMap(d.x, d.z);
    ctx.fillStyle = d.color;
    ctx.fillText(d.name.toUpperCase(), x, y);
  }
  const dot = (x, z, color, r = 3) => {
    const [mx, my] = toMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Mission marker.
  if (state.markerPos) dot(state.markerPos.x, state.markerPos.z, '#ffd166', 5);
  // Traffic (grey), police (blue/red), enemies (red).
  for (const c of state.traffic) dot(c.group.position.x, c.group.position.z, '#9aa5b1', 2);
  for (const c of state.cops) dot(c.group.position.x, c.group.position.z, '#3b82f6', 3);
  for (const e of state.enemies) if (e.health > 0) dot(e.group.position.x, e.group.position.z, '#ef4444', 2.5);
  // Player arrow.
  const [px, py] = toMap(state.player.x, state.player.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4.5, 5);
  ctx.lineTo(-4.5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // North tick.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('N', size / 2, 12);
}

export function missionListHtml(index) {
  return MISSIONS.map((m, i) => {
    const cls = i < index ? 'done' : i === index ? 'current' : 'locked';
    const mark = i < index ? '✓' : i === index ? '▶' : '·';
    return `<div class="mission-row ${cls}"><span>${mark} ${m.id}. ${m.title}</span><span>$${m.payout}</span></div>`;
  }).join('');
}
