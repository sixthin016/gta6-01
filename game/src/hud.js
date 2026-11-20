// DOM HUD: identical anchors in all four shots — only the values change.
// Mission top-left, money top-right, stars top-center, crew bottom-left,
// weapons bottom-center, speed + minimap bottom-right. Minimap draws ONE
// district with a route blip trail that connects shot 1 → 2 → 3 → 4.
import { MISSIONS, CREW, RADIOS, WEAPONS, DISPATCH, SHOT_HUD } from './missions.js';

const $ = (id) => document.getElementById(id);

// Route blip positions on the shared district map (one map, four stops).
const ROUTE = [
  [0.16, 0.78], // shot 1 — beach / Bayfront
  [0.42, 0.55], // shot 2 — Marisol market
  [0.68, 0.34], // shot 3 — downtown vault
  [0.84, 0.16], // shot 4 — highway interchange
];

export function drawMinimap(shot) {
  const cv = $('mmap');
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = 300, H = 224;
  g.clearRect(0, 0, W, H);
  // water + land
  g.fillStyle = '#0b3d5c'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1d2f22'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#24382e';
  g.beginPath(); g.moveTo(0, 60); g.lineTo(W, 20); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
  g.fillStyle = '#2e4a3a';
  g.beginPath(); g.moveTo(0, 120); g.lineTo(W, 90); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
  // beach strip
  g.fillStyle = '#d9b878'; g.fillRect(0, 52, W, 10);
  // streets
  g.strokeStyle = 'rgba(255,220,140,0.75)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(20, 200); g.lineTo(280, 30); g.stroke();
  g.beginPath(); g.moveTo(20, 90); g.lineTo(280, 60); g.stroke();
  g.beginPath(); g.moveTo(90, 20); g.lineTo(120, 210); g.stroke();
  g.beginPath(); g.moveTo(200, 10); g.lineTo(230, 200); g.stroke();
  // district labels
  g.fillStyle = '#cfe6ff'; g.font = 'bold 13px Arial'; g.textAlign = 'left';
  g.fillText('BAYFRONT', 14, 46);
  g.fillText('MARISOL', 96, 120);
  g.fillText('DOWNTOWN', 170, 60);
  g.fillText('HARBOR', 220, 200);
  // route trail 1→2→3→4
  g.strokeStyle = '#ff5fa2'; g.lineWidth = 3; g.setLineDash([6, 4]);
  g.beginPath();
  ROUTE.forEach(([x, y], i) => { i === 0 ? g.moveTo(x * W, y * H) : g.lineTo(x * W, y * H); });
  g.stroke(); g.setLineDash([]);
  ROUTE.forEach(([x, y], i) => {
    g.fillStyle = i + 1 === shot ? '#ff5fa2' : '#2ee6ff';
    g.beginPath(); g.arc(x * W, y * H, i + 1 === shot ? 8 : 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 10px Arial'; g.textAlign = 'center';
    g.fillText(String(i + 1), x * W, y * H + 3.5);
  });
  // north arrow + player cone
  const [px, py] = ROUTE[shot - 1];
  g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.textAlign = 'right';
  g.fillText('N ↑', W - 8, 18);
}

export function applyHud(shot) {
  const h = SHOT_HUD[shot];
  const m = MISSIONS[h.mission - 1];
  $('m-mission').textContent = `MISSION ${h.mission}/16 — ${h.name || m.name}`;
  $('m-obj').textContent = h.title;
  $('m-step').textContent = h.step;
  $('m-storm').textContent = `🌀 HURRICANE LANDFALL ${h.storm}`;
  $('m-cash').textContent = '$' + h.cash.toLocaleString('en-US');
  $('m-respect').textContent = `RESPECT ${58 + shot * 2}  •  DISTRICT ${h.district}`;
  $('m-time').textContent = `${h.time}  •  GOLDEN HOUR  •  28°C`;
  const radio = RADIOS[h.radio];
  $('m-radio').textContent = `♪ ${radio.name} — ${radio.track}`;
  // stars
  $('m-stars').innerHTML = '★'.repeat(h.stars) + '<span class="off">' + '☆'.repeat(5 - h.stars) + '</span>';
  // dispatch
  $('m-units').innerHTML = DISPATCH[shot].map(([u, d]) => `<div class="unit"><b>${u}</b> — ${d}</div>`).join('');
  // crew cards
  const names = h.crewNames || CREW.map((c) => c.name);
  $('crew').innerHTML = CREW.map((c, i) => `
    <div class="crewcard panel">
      <div class="face" style="background:linear-gradient(135deg,${c.color},#1a1a2e)">${names[i].slice(0, 2)}</div>
      <div class="nm">${names[i]}</div>
      <div class="rl">${c.role}</div>
      <div class="bar"><i style="width:${h.crewHp[i]}%"></i></div>
      <div class="hp">HP ${h.crewHp[i]}% • ${c.perk.split(':')[0]}</div>
    </div>`).join('');
  // weapons
  document.querySelector('#weapons').innerHTML = WEAPONS.map((w, i) =>
    `<div class="wslot${i === h.weapon ? ' cur' : ''}"><b>${w.name}</b>${w.ammo}</div>`).join('') +
    `<div class="wslot"><b>WHEEL</b>hold Q</div>`;
  $('m-speed').textContent = String(h.speed);
  $('speedo').style.display = h.speed > 0 ? 'block' : 'none';
  $('toast').textContent = h.toast;
  drawMinimap(shot);
}

// Live HUD for the playable game (values update every frame).
export function applyLiveHud(state) {
  const m = MISSIONS[Math.min(state.mission, 16) - 1];
  $('m-mission').textContent = `MISSION ${state.mission}/16 — ${m.name}`;
  $('m-obj').textContent = m.name;
  $('m-step').textContent = '▸ ' + m.obj;
  $('m-storm').textContent = `🌀 HURRICANE LANDFALL ${state.storm}`;
  $('m-cash').textContent = '$' + Math.floor(state.money).toLocaleString('en-US');
  $('m-respect').textContent = `RESPECT ${state.respect}  •  DISTRICT ${state.district}`;
  $('m-time').textContent = `${state.clock}  •  GOLDEN HOUR  •  28°C`;
  const radio = RADIOS[state.radio];
  $('m-radio').textContent = `♪ ${radio.name} — ${radio.track}`;
  $('m-stars').innerHTML = '★'.repeat(state.stars) + '<span class="off">' + '☆'.repeat(5 - state.stars) + '</span>';
  $('m-speed').textContent = String(Math.round(state.speed));
  $('speedo').style.display = state.inCar ? 'block' : 'none';
  $('crew').innerHTML = CREW.map((c) => `
    <div class="crewcard panel">
      <div class="face" style="background:linear-gradient(135deg,${c.color},#1a1a2e)">${c.name.slice(0, 2)}</div>
      <div class="nm">${c.name}</div>
      <div class="rl">${c.role}</div>
      <div class="bar"><i style="width:${c.hp}%"></i></div>
      <div class="hp">HP ${c.hp}% • ${c.perk.split(':')[0]}</div>
    </div>`).join('');
  document.querySelector('#weapons').innerHTML = WEAPONS.map((w, i) =>
    `<div class="wslot${i === state.weapon ? ' cur' : ''}"><b>${w.name}</b>${w.ammo}</div>`).join('') +
    `<div class="wslot"><b>WHEEL</b>hold Q</div>`;
  $('m-units').innerHTML = (DISPATCH[Math.min(state.stars, 4)] || DISPATCH[1])
    .map(([u, d]) => `<div class="unit"><b>${u}</b> — ${d}</div>`).join('');
  drawMinimap(Math.min(4, Math.max(1, state.mission <= 5 ? 1 : state.mission <= 6 ? 2 : 3)));
}
