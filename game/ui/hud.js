// HUD — fixed anchors in every shot (mission top-left, stars top-center, money top-right,
// crew bottom-left, minimap bottom-right); only the VALUES change. Portraits are drawn
// on canvas at runtime; the minimap is one district map with a route trace Shot 1→4.
import { currentMission, WEAPONS } from '../core/state.js';
import { UNIT_NAMES } from '../sim/police.js';

const $ = (id) => document.getElementById(id);

// Stylized crew portrait: skin face, hair, eyes, shirt shoulders, colored backdrop.
export function drawPortrait(canvas, crew) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  g.fillStyle = crew.color; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(0, 0, W, H * 0.3);
  // shoulders
  g.fillStyle = crew.shirt;
  g.beginPath(); g.ellipse(W / 2, H + 8, W * 0.42, H * 0.42, 0, 0, Math.PI * 2); g.fill();
  // neck + face
  g.fillStyle = crew.skin;
  g.fillRect(W / 2 - 7, H * 0.52, 14, 12);
  g.beginPath(); g.ellipse(W / 2, H * 0.42, W * 0.2, H * 0.26, 0, 0, Math.PI * 2); g.fill();
  // hair
  g.fillStyle = crew.hair;
  g.beginPath(); g.ellipse(W / 2, H * 0.26, W * 0.21, H * 0.2, 0, Math.PI, Math.PI * 2); g.fill();
  // eyes
  g.fillStyle = '#141414';
  g.beginPath(); g.arc(W / 2 - 8, H * 0.42, 2.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(W / 2 + 8, H * 0.42, 2.4, 0, Math.PI * 2); g.fill();
  // mouth
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(W / 2 - 5, H * 0.56); g.lineTo(W / 2 + 5, H * 0.56); g.stroke();
}

function fmtMoney(n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Minimap: Coral Isle — water, sand, roads, districts, gold route, blips.
// routeT 0..1 moves the player arrow along the Shot 1→4 route.
export function drawMinimap(canvas, state, routeT) {
  const g = canvas.getContext('2d');
  const S = canvas.width;
  g.clearRect(0, 0, S, S);
  // water
  g.fillStyle = '#14486e'; g.fillRect(0, 0, S, S);
  // island land
  g.fillStyle = '#2a3a2e'; g.fillRect(S * 0.06, S * 0.05, S * 0.88, S * 0.8);
  // sand (south edge)
  g.fillStyle = '#e8c890'; g.fillRect(S * 0.06, S * 0.74, S * 0.88, S * 0.11);
  // district blocks
  g.fillStyle = '#3d4a5a'; g.fillRect(S * 0.12, S * 0.12, S * 0.3, S * 0.22); // downtown
  g.fillStyle = '#5a4a3a'; g.fillRect(S * 0.12, S * 0.42, S * 0.26, S * 0.24); // market
  g.fillStyle = '#3a5a6a'; g.fillRect(S * 0.62, S * 0.42, S * 0.3, S * 0.24); // marina
  // roads
  g.strokeStyle = '#8a8a92'; g.lineWidth = 5; g.lineCap = 'round';
  const roads = [
    [[0.06, 0.78], [0.94, 0.78]], [[0.06, 0.55], [0.94, 0.55]],
    [[0.06, 0.28], [0.94, 0.28]], [[0.28, 0.05], [0.28, 0.85]],
    [[0.6, 0.05], [0.6, 0.85]], [[0.82, 0.05], [0.82, 0.85]],
  ];
  roads.forEach(([a, b]) => {
    g.beginPath(); g.moveTo(a[0] * S, a[1] * S); g.lineTo(b[0] * S, b[1] * S); g.stroke();
  });
  // route trace Shot 1→4 (gold, dashed)
  const route = [[0.3, 0.78], [0.24, 0.55], [0.5, 0.28], [0.72, 0.28]];
  g.strokeStyle = '#ffd75e'; g.lineWidth = 4; g.setLineDash([8, 6]);
  g.beginPath();
  route.forEach(([x, y], i) => { if (i === 0) g.moveTo(x * S, y * S); else g.lineTo(x * S, y * S); });
  g.stroke(); g.setLineDash([]);
  // mission marker
  const mi = route[Math.min(3, Math.floor(routeT * 4))];
  g.fillStyle = '#ffd75e';
  g.beginPath(); g.arc(mi[0] * S + 26, mi[1] * S - 18, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7a1030'; g.font = 'bold 13px Arial'; g.textAlign = 'center';
  g.fillText('★', mi[0] * S + 26, mi[1] * S - 13);
  // police blips
  g.fillStyle = '#4d8dff';
  [[0.36, 0.72], [0.2, 0.6], [0.56, 0.34], [0.66, 0.24]].forEach(([x, y]) => {
    g.beginPath(); g.arc(x * S, y * S, 6, 0, Math.PI * 2); g.fill();
  });
  // player arrow on the route
  const t = Math.max(0, Math.min(1, routeT));
  const seg = Math.min(2, Math.floor(t * 3)), ft = t * 3 - seg;
  const px = (route[seg][0] + (route[seg + 1][0] - route[seg][0]) * ft) * S;
  const py = (route[seg][1] + (route[seg + 1][1] - route[seg][1]) * ft) * S;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#141414'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(px, py - 11); g.lineTo(px + 8, py + 8); g.lineTo(px - 8, py + 8); g.closePath();
  g.fill(); g.stroke();
}

export function createHud(state) {
  const crewEl = $('hud-crew');
  const portraits = [];
  state.crew.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'crew-card';
    const cv = document.createElement('canvas');
    cv.width = 96; cv.height = 72;
    drawPortrait(cv, c);
    const name = document.createElement('div'); name.className = 'c-name'; name.textContent = c.name;
    const role = document.createElement('div'); role.className = 'c-role'; role.textContent = c.role + ' · ' + c.skill.split(' ')[0];
    const hp = document.createElement('div'); hp.className = 'c-hp';
    const bar = document.createElement('div'); bar.style.width = c.health + '%';
    hp.appendChild(bar);
    card.append(cv, name, role, hp);
    crewEl.appendChild(card);
    portraits.push({ card, bar, hp, name });
  });

  function setStars(n) {
    let html = '';
    for (let i = 0; i < 5; i++) html += `<span class="${i < n ? '' : 'off'}">★</span>`;
    $('stars').innerHTML = html;
  }
  function setUnits(count) {
    $('u-rows').innerHTML = UNIT_NAMES.slice(0, count).map((u) =>
      `<div class="u-row"><b>${u.call}</b> — ${u.dist}</div>`).join('');
  }
  function render() {
    const m = currentMission(state);
    $('m-num').textContent = `MISSION ${state.missionIndex + 1}/16 — ${m.district.toUpperCase()}`;
    $('m-title').textContent = m.name;
    $('m-obj').textContent = m.objective;
    $('m-next').textContent = 'Next: ' + m.next;
    $('cash').textContent = fmtMoney(state.money);
    $('respect').textContent = `RESPECT ${state.respect} · CORAL ISLE`;
    const mm = Math.floor(state.stormMinutesLeft), ss = Math.floor((state.stormMinutesLeft - mm) * 60);
    $('storm').textContent = `HURRICANE LANDFALL ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    setStars(state.wanted);
    setUnits(state.wanted >= 4 ? 5 : state.wanted >= 2 ? 3 : 2);
    const w = WEAPONS[state.weaponIndex];
    $('w-name').textContent = w.name;
    $('w-ammo').textContent = `${w.mag} / ${w.ammo}`;
    $('speed').textContent = Math.round(state.speedKmh);
    state.crew.forEach((c, i) => {
      portraits[i].bar.style.width = c.health + '%';
      portraits[i].hp.classList.toggle('low', c.health < 85);
    });
    drawMinimap($('minimap'), state, state.minimapRoute);
  }
  return {
    render,
    setStars, setUnits,
    toast(text) { $('hud-toast').textContent = text; },
    setRadio(name) { $('radio').textContent = name; },
    show(el) { $(el).style.display = ''; },
    hide(el) { $(el).style.display = 'none'; },
  };
}
