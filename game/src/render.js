// Neon Bay — render.js
// One job: the 3D chase camera, the DOM HUD and the 2D minimap, plus the
// weapon wheel and garage overlays. The scene is built in world.js; this
// file only points the camera, syncs meshes to state, and draws the HUD.

import * as THREE from 'three';
import { CONFIG, WEAPONS, GARAGE_UPGRADES, RADIO, districtAt } from './config.js';
import { missionObjective, missionTitle, missionTarget, MISSIONS } from './missions.js';
import { RACE_RING } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const _v = new THREE.Vector3();
const _look = new THREE.Vector3();

export function createRenderer(w3d) {
  const { scene, camera, renderer } = w3d;
  const hud = document.getElementById('hud');
  const minimap = document.getElementById('minimap');
  const mctx = minimap.getContext('2d');
  let camYaw = 0;
  let camDist = 13;
  let camHeight = 5.5;
  let shake = 0;
  let lastTarget = { x: 0, z: 0 };
  let wheelOpen = false;
  let garageOpen = false;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function setShake(amount) { shake = Math.max(shake, amount); }

  function update(state, dt, time) {
    const p = state.player;
    if (state.playerMesh) {
      state.playerMesh.visible = !p.inCar;
      state.playerMesh.position.set(p.x, 0, p.z);
      state.playerMesh.rotation.y = -p.angle + Math.PI / 2;
      const bob = p.speed > 0.5 ? Math.sin(p.walkPhase) * 0.06 : 0;
      state.playerMesh.position.y = bob;
      state.playerMesh.scale.y = p.cover ? 0.78 : 1;
    }
    for (const car of [...state.cars, ...state.policeCars, ...state.swatVans]) {
      if (!car.mesh) continue;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = -car.angle + Math.PI / 2;
      if (car.kind === 'police' || car.kind === 'swat') {
        const bar = car.mesh.getObjectByName('lightbar');
        if (bar) bar.material.emissive.setHex(Math.floor(time * 6) % 2 === 0 ? 0xff2222 : 0x2244ff);
      }
    }
    for (const ped of state.peds) {
      if (!ped.mesh) continue;
      ped.mesh.visible = ped.hp > 0;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = -ped.angle + Math.PI / 2;
      ped.mesh.rotation.z = ped.hp <= 0 ? Math.PI / 2 : 0;
    }
    for (const cop of state.cops) {
      if (!cop.mesh) continue;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = -cop.angle + Math.PI / 2;
    }
    for (const t of state.targets) {
      if (!t.mesh) continue;
      t.mesh.visible = t.hp > 0;
      t.mesh.position.set(t.x, 0, t.z);
      t.mesh.rotation.y = Math.sin(time * 2 + t.x) * 0.4;
    }
    for (const f of state.followers) {
      if (!f.mesh) continue;
      f.mesh.position.set(f.x, 0, f.z);
      f.mesh.rotation.y = -f.angle + Math.PI / 2;
      f.mesh.position.y = Math.sin(f.walkPhase) * 0.05;
    }
    if (state.heli && state.heli.mesh) {
      state.heli.mesh.position.set(state.heli.x, state.heli.y, state.heli.z);
      state.heli.mesh.rotation.y = -state.heli.angle + Math.PI / 2;
      const rotor = state.heli.mesh.getObjectByName('rotor');
      if (rotor) rotor.rotation.y = state.heli.rotor;
    }
    // Storm: sky darkens, rain falls, palms sway, water roughens.
    const storm = 1 - state.hurricaneLeft / (CONFIG.hurricaneMinutes * 60);
    if (w3d.skyMat) w3d.skyMat.uniforms.storm.value = storm;
    if (w3d.sun) {
      w3d.sun.intensity = 1.9 - storm * 1.1;
      w3d.sun.color.setHex(storm > 0.6 ? 0x9aa8c0 : 0xffd166);
    }
    if (w3d.rain) {
      w3d.rain.material.opacity = storm * 0.55;
      const pos = w3d.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        let y = pos.getY(i) - dt * (28 + storm * 30);
        if (y < 0) y = 60;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      w3d.rain.position.x = p.x;
      w3d.rain.position.z = p.z;
    }
    for (const top of w3d.palmTops || []) {
      top.rotation.z = Math.sin(time * 2 + top.position.x) * storm * 0.25;
    }
    // Waypoint beacon + marker.
    const target = missionTarget(state.missionIndex, state.missionStage);
    if (target && w3d.beacon) {
      w3d.beacon.visible = true;
      w3d.beacon.position.set(target.x, 30, target.z);
      w3d.marker.visible = true;
      w3d.marker.position.set(target.x, 4 + Math.sin(time * 3) * 0.6, target.z);
      w3d.marker.rotation.y = time * 2;
    } else if (w3d.beacon) {
      w3d.beacon.visible = false;
      w3d.marker.visible = false;
    }
    // Race checkpoint ring.
    const mission = MISSIONS[state.missionIndex];
    if (mission && mission.type === 'race' && w3d.ring) {
      const cp = RACE_RING[state.raceCheckpoint];
      if (cp) {
        w3d.ring.visible = true;
        w3d.ring.position.set(cp.x, 3 + Math.sin(time * 3) * 0.4, cp.z);
        w3d.ring.rotation.y = time;
        w3d.ring.rotation.x = Math.PI / 2;
      } else w3d.ring.visible = false;
    } else if (w3d.ring) w3d.ring.visible = false;
    // Chase camera.
    const heading = p.angle;
    const yaw = heading + Math.PI + camYaw;
    const tx = p.x, tz = p.z;
    const dist = p.inCar ? camDist + 2 : camDist;
    let cx = tx + Math.cos(yaw) * dist;
    let cz = tz + Math.sin(yaw) * dist;
    let cy = camHeight + (p.inCar ? 1.2 : 0);
    if (state.shotCam) {
      // Staged shots only: a fixed 3/4 rear angle so the player, the cars
      // chasing behind, and the road ahead are all in the frame at once.
      const sc = state.shotCam;
      const fx = Math.cos(heading), fz = Math.sin(heading);
      const lx = -fz, lz = fx;
      cx = tx - fx * sc.back + lx * sc.side;
      cz = tz - fz * sc.back + lz * sc.side;
      cy = sc.height;
      camera.position.set(cx, cy, cz);
      _look.set(tx, 1.6, tz);
      lastTarget = { x: tx, z: tz };
      camera.lookAt(_look);
    } else {
      const k = 1 - Math.pow(0.0001, dt);
      _v.set(cx, cy, cz);
      camera.position.lerp(_v, k);
      _look.set(tx, 1.6, tz);
      lastTarget = { x: tx, z: tz };
      camera.lookAt(_look);
    }
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake * 0.5;
      shake = Math.max(0, shake - dt * 1.4);
    }
    w3d.sun.position.set(p.x + 180, 120, p.z + 60);
    w3d.sun.target.position.set(p.x, 0, p.z);
    w3d.sun.target.updateMatrixWorld();
  }

  function drawHud(state, screen, extras) {
    const p = state.player;
    const clockMin = Math.floor(state.clockMinutes) % (24 * 60);
    const hh = String(Math.floor(clockMin / 60)).padStart(2, '0');
    const mm = String(clockMin % 60).padStart(2, '0');
    const left = Math.max(0, Math.ceil(state.hurricaneLeft));
    const hMin = String(Math.floor(left / 60)).padStart(2, '0');
    const hSec = String(left % 60).padStart(2, '0');
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < p.wanted ? '★' : '☆';
    const obj = missionObjective(state.missionIndex);
    const timer = state.missionTimer > 0 ? ` ⏱ ${Math.ceil(state.missionTimer)}s` : '';
    const rob = (state.missionIndex < MISSIONS.length && ['rob', 'multi'].includes(MISSIONS[state.missionIndex].type)
      && state.missionStage === 0 && state.robProgress > 0)
      ? ` — working ${Math.round((state.robProgress / 3) * 100)}% (hold E)` : '';
    const wait = state.missionIndex === 13 && state.waitProgress > 0
      ? ` — dawn breaks… ${Math.round((state.waitProgress / 5) * 100)}%` : '';
    const survive = MISSIONS[state.missionIndex] && MISSIONS[state.missionIndex].type === 'survive' && state.surviveLeft > 0
      ? ` — hold on ${Math.ceil(state.surviveLeft)}s` : '';
    const race = MISSIONS[state.missionIndex] && MISSIONS[state.missionIndex].type === 'race'
      ? ` — checkpoint ${state.raceCheckpoint}/8` : '';
    const district = districtAt(p.x, p.z);
    const wdef = WEAPONS[p.weapon];
    const slot = p.weapons[p.weapon];
    const crewNames = state.followers.map((f) => f.name).join(', ') || '—';
    const wheel = wheelOpen ? `<div class="wheel">${Object.entries(WEAPONS).map(([key, w]) => `
      <div class="wheel-item ${key === p.weapon ? 'sel' : ''}" data-weapon="${key}">
        <b>${w.name}</b><br><span>${p.weapons[key].ammo} / ${p.weapons[key].reserve}</span></div>`).join('')}
      <div class="wheel-hint">Q or 1–4 to pick a weapon</div></div>` : '';
    const garage = garageOpen ? `<div class="garage"><h3>🔧 ROOK'S GARAGE — upgrades</h3>
      ${GARAGE_UPGRADES.map((u) => `
        <div class="g-row"><b>${u.name} Lv ${state.upgrades[u.id]}/${u.max}</b> — ${u.desc}
        <span class="g-cost">${state.upgrades[u.id] >= u.max ? 'MAX' : '$' + u.cost}</span></div>`).join('')}
      <div class="dim">Press G to close. Buy with keys 1–4 while the garage is open.</div></div>` : '';
    hud.innerHTML = `
      <div class="panel tl"><div class="cash">$${p.money}</div>
        <div class="bar"><div class="fill" style="width:${p.hp}%"></div></div>
        <div class="respect">RESPECT ${state.respect} <div class="bar small"><div class="fill gold" style="width:${state.respect}%"></div></div></div>
        <div class="district" style="color:${district.color}">📍 ${district.name}</div></div>
      <div class="panel tr"><div class="stars">${stars}</div>
        <div class="clock">${hh}:${mm} • NEON BAY</div>
        <div class="storm">⛈ HURRICANE ${hMin}:${hSec}</div>
        <div class="radio">📻 ${RADIO[state.radioStation].name}</div></div>
      <div class="panel tc">★ ${missionTitle(state.missionIndex)} — ${obj}${timer}${rob}${wait}${survive}${race}</div>
      <div class="panel bl">${p.inCar
        ? `🚗 ${Math.round(Math.abs(p.speed) * 2.2)} km/h • NOS ${Math.round(p.nos)}% (SPACE) • E exit • ${p.inCar.model}`
        : `🔫 ${wdef.name} ${slot.ammo} / ${slot.reserve} • WASD walk • E enter car • F punch • Click shoot • Q wheel • C cover`}
        ${state.followers.length ? `<br>👥 Crew: ${crewNames}` : ''}</div>
      ${wheel}${garage}
      ${state.messageTimer > 0 && state.message ? `<div class="toast">${state.message}</div>` : ''}
      ${state.bannerTimer > 0 && state.banner ? `<div class="banner">${state.banner}</div>` : ''}
      ${screen === SCREEN_TITLE ? `<div class="title">
        <h1>NEON BAY</h1>
        <p>An open-world crime story — 14 missions, one hurricane, one island city</p>
        <div class="card"><b>${extras.saveExists ? '▶ CONTINUE — press ENTER' : '▶ NEW GAME — press ENTER'}</b><br>
        WASD / arrows — walk &amp; drive • SHIFT — run • SPACE — NOS boost<br>
        E — steal / exit car (hold E to rob) • F — punch • Click — shoot • 1–4 / Q — weapons<br>
        C — take cover • G — garage (near Rook's) • R — radio • M — mute • ESC — pause<br>
        <span class="dim">14 missions for Rook, Mara, Jax &amp; Reyes. 5-star police, helicopter, roadblocks, SWAT.<br>
        Street races, garage upgrades, respect, saves — and a Category 5 storm on the clock.</span></div>
        <p class="dim">An original game. No Rockstar names, characters, map or assets.</p></div>` : ''}
      ${screen === SCREEN_PAUSED ? `<div class="title"><h1>PAUSED</h1><p>Press ESC or ENTER to keep playing</p></div>` : ''}
      ${screen === SCREEN_OVER ? `<div class="title"><h1>${extras.overKind === 'busted' ? 'BUSTED!' : 'WASTED!'}</h1>
        <p>The Bay PD took their cut. You woke up at Bay General Hospital.</p>
        <p>Cash: $${p.money} • Missions done: ${state.stats.missionsDone} / 14 • Respect: ${state.respect}</p>
        <p><b>Press ENTER to get back out there</b></p></div>` : ''}
      ${extras.muted ? '<div class="muted">🔇 MUTED (M)</div>' : ''}`;
    drawMinimap(state);
  }

  function drawMinimap(state) {
    const W = minimap.width, Hh = minimap.height;
    const S = W / (CONFIG.worldSize);
    const ox = (x) => (x + CONFIG.worldSize / 2) * S;
    const oz = (z) => (z + CONFIG.worldSize / 2) * S;
    mctx.fillStyle = '#2f7d32';
    mctx.fillRect(0, 0, W, Hh);
    // Districts as tinted zones.
    for (const d of [{ name: 'Downtown', color: '#ff9f1c', x0: -130, z0: -130, x1: 130, z1: 40 },
      { name: 'The Docks', color: '#2ec4b6', x0: -260, z0: -260, x1: -130, z1: 40 },
      { name: 'Sunset Beach', color: '#ffd166', x0: -260, z0: 40, x1: 260, z1: 260 },
      { name: 'Palm Suburbs', color: '#80ed99', x0: 130, z0: -260, x1: 260, z1: 40 },
      { name: 'Old Industrial', color: '#b388eb', x0: -130, z0: -260, x1: 130, z1: -130 }]) {
      mctx.fillStyle = d.color + '55';
      mctx.fillRect(ox(d.x0), oz(d.z0), (d.x1 - d.x0) * S, (d.z1 - d.z0) * S);
    }
    mctx.fillStyle = '#1e7fb8';
    mctx.fillRect(ox(232), 0, W - ox(232), Hh);
    mctx.fillStyle = '#e8d29a';
    mctx.fillRect(ox(190), 0, ox(232) - ox(190), Hh);
    mctx.strokeStyle = '#9aa0aa';
    mctx.lineWidth = 1.5;
    for (const v of state.city.lines) {
      mctx.beginPath(); mctx.moveTo(ox(v), 0); mctx.lineTo(ox(v), Hh); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, oz(v)); mctx.lineTo(W, oz(v)); mctx.stroke();
    }
    // Race checkpoints.
    const mission = MISSIONS[state.missionIndex];
    if (mission && mission.type === 'race') {
      RACE_RING.forEach((cp, i) => {
        mctx.fillStyle = i === state.raceCheckpoint ? '#00e5ff' : '#00e5ff88';
        mctx.beginPath(); mctx.arc(ox(cp.x), oz(cp.z), i === state.raceCheckpoint ? 6 : 3, 0, Math.PI * 2); mctx.fill();
      });
    }
    const target = missionTarget(state.missionIndex, state.missionStage);
    if (target) {
      mctx.fillStyle = '#ffd700';
      mctx.beginPath(); mctx.arc(ox(target.x), oz(target.z), 6, 0, Math.PI * 2); mctx.fill();
    }
    for (const r of state.roadblocks) {
      mctx.fillStyle = '#ff6d00';
      mctx.fillRect(ox(r.x) - 4, oz(r.z) - 4, 8, 8);
    }
    if (state.heli) {
      mctx.fillStyle = '#ff3b30';
      mctx.beginPath(); mctx.arc(ox(state.heli.x), oz(state.heli.z), 7, 0, Math.PI * 2); mctx.fill();
    }
    for (const car of state.policeCars) {
      mctx.fillStyle = '#ff3b30';
      mctx.beginPath(); mctx.arc(ox(car.x), oz(car.z), 4, 0, Math.PI * 2); mctx.fill();
    }
    for (const f of state.followers) {
      mctx.fillStyle = '#7dff8a';
      mctx.beginPath(); mctx.arc(ox(f.x), oz(f.z), 3, 0, Math.PI * 2); mctx.fill();
    }
    mctx.fillStyle = '#ffffff';
    mctx.beginPath(); mctx.arc(ox(state.player.x), oz(state.player.z), 5, 0, Math.PI * 2); mctx.fill();
    mctx.strokeStyle = '#111111';
    mctx.stroke();
  }

  function render() { renderer.render(scene, camera); }

  return {
    update, drawHud, render, resize,
    setShake,
    orbit(delta) { camYaw += delta; },
    zoom(delta) { camDist = Math.max(8, Math.min(20, camDist + delta)); },
    getCamYaw() {
      const dx = camera.position.x - lastTarget.x;
      const dz = camera.position.z - lastTarget.z;
      return Math.atan2(dz, dx) - Math.PI / 2;
    },
    get wheelOpen() { return wheelOpen; },
    toggleWheel() { wheelOpen = !wheelOpen; return wheelOpen; },
    closeWheel() { wheelOpen = false; },
    get garageOpen() { return garageOpen; },
    toggleGarage() { garageOpen = !garageOpen; return garageOpen; },
    closeGarage() { garageOpen = false; },
    get canvas() { return renderer.domElement; },
  };
}
