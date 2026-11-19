// Neon Bay — the renderer. One job: the 3D chase camera, the DOM HUD and the
// 2D minimap. The three.js scene itself is built in world.js; this file only
// points the camera, syncs meshes to state, and draws the HUD.
import * as THREE from 'three';
import { CFG } from './config.js';
import { missionObjective, missionTitle, missionTarget } from './missions.js';

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
  let camYaw = 0;      // extra orbit from mouse drag
  let camDist = 13;
  let camHeight = 5.5;
  let shake = 0;
  let lastTarget = { x: 0, z: 0 };

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function setShake(amount) { shake = Math.max(shake, amount); }

  /** Sync every dynamic mesh to the game state, then place the chase camera. */
  function update(state, dt, time) {
    const p = state.player;
    // Player mesh.
    if (state.playerMesh) {
      state.playerMesh.visible = !p.inCar;
      state.playerMesh.position.set(p.x, 0, p.z);
      state.playerMesh.rotation.y = -p.angle + Math.PI / 2;
      const bob = p.speed > 0.5 ? Math.sin(p.walkPhase) * 0.06 : 0;
      state.playerMesh.position.y = bob;
    }
    // Cars.
    for (const car of [...state.cars, ...state.policeCars]) {
      if (!car.mesh) continue;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = -car.angle + Math.PI / 2;
      if (car.kind === 'police') {
        const bar = car.mesh.getObjectByName('lightbar');
        if (bar) bar.material.emissive.setHex(Math.floor(time * 6) % 2 === 0 ? 0xff2222 : 0x2244ff);
      }
    }
    // Pedestrians and cops.
    for (const ped of state.peds) {
      if (!ped.mesh) continue;
      ped.mesh.visible = ped.hp > 0;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = -ped.angle + Math.PI / 2;
      if (ped.hp <= 0) ped.mesh.rotation.z = Math.PI / 2;
      else ped.mesh.rotation.z = 0;
    }
    for (const cop of state.cops) {
      if (!cop.mesh) continue;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = -cop.angle + Math.PI / 2;
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
    // Chase camera: behind the player (or the car), smoothed, mouse-orbitable.
    const heading = p.angle;
    const yaw = heading + Math.PI + camYaw;
    const tx = p.x, tz = p.z;
    const dist = p.inCar ? camDist + 2 : camDist;
    const cx = tx + Math.cos(yaw) * dist;
    const cz = tz + Math.sin(yaw) * dist;
    const cy = camHeight + (p.inCar ? 1.2 : 0);
    const k = 1 - Math.pow(0.0001, dt);
    _v.set(cx, cy, cz);
    camera.position.lerp(_v, k);
    _look.set(tx, 1.6, tz);
    lastTarget = { x: tx, z: tz };
    camera.lookAt(_look);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake * 0.5;
      shake = Math.max(0, shake - dt * 1.4);
    }
    // Sun follows the player so shadows stay crisp everywhere.
    w3d.sun.position.set(p.x + 140, 220, p.z + 90);
    w3d.sun.target.position.set(p.x, 0, p.z);
    w3d.sun.target.updateMatrixWorld();
  }

  function drawHud(state, screen, extras) {
    const p = state.player;
    const clockMin = Math.floor(state.clockMinutes) % (24 * 60);
    const hh = String(Math.floor(clockMin / 60)).padStart(2, '0');
    const mm = String(clockMin % 60).padStart(2, '0');
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < p.wanted ? '★' : '☆';
    const obj = missionObjective(state.missionIndex);
    const timer = state.missionTimer > 0 ? ` ⏱ ${Math.ceil(state.missionTimer)}s` : '';
    const rob = state.missionIndex === 4 && state.missionStage === 0 && state.robProgress > 0
      ? ` — robbing ${Math.round((state.robProgress / 3) * 100)}% (hold E)` : '';
    const wait = state.missionIndex === 5 && state.missionStage === 0 && state.waitProgress > 0
      ? ` — Maya is getting in… ${Math.round((state.waitProgress / 4) * 100)}%` : '';
    hud.innerHTML = `
      <div class="panel tl"><div class="cash">$${p.money}</div>
        <div class="bar"><div class="fill" style="width:${p.hp}%"></div></div></div>
      <div class="panel tr"><div class="stars">${stars}</div><div class="clock">${hh}:${mm} • NEON BAY</div></div>
      <div class="panel tc">★ ${missionTitle(state.missionIndex)} — ${obj}${timer}${rob}${wait}</div>
      <div class="panel bl">${p.inCar
        ? `🚗 ${Math.round(Math.abs(p.speed) * 2.2)} km/h &nbsp;•&nbsp; E exit &nbsp;•&nbsp; ${p.inCar.model}`
        : `🔫 PISTOL ${p.ammo} / ${p.reserveAmmo} &nbsp;•&nbsp; WASD walk • E enter car • F punch • Click shoot`}</div>
      ${state.messageTimer > 0 && state.message ? `<div class="toast">${state.message}</div>` : ''}
      ${state.bannerTimer > 0 && state.banner ? `<div class="banner">${state.banner}</div>` : ''}
      ${screen === SCREEN_TITLE ? `<div class="title">
        <h1>NEON BAY</h1>
        <p>An open-world crime story — steal cars, dodge the cops, run Rook's jobs</p>
        <div class="card"><b>${extras.saveExists ? '▶ CONTINUE — press ENTER' : '▶ NEW GAME — press ENTER'}</b><br>
        WASD / arrows — walk &amp; drive • SHIFT — run<br>
        E — steal / exit car • F — punch • Mouse click — shoot<br>
        ESC — pause • M — mute • Progress saves automatically<br>
        <span class="dim">10 missions for Rook. A whole sunny island city. One very orange jacket.</span></div>
        <p class="dim">An original game. No Rockstar names, characters, map or assets.</p></div>` : ''}
      ${screen === SCREEN_PAUSED ? `<div class="title"><h1>PAUSED</h1><p>Press ESC or ENTER to keep playing</p></div>` : ''}
      ${screen === SCREEN_OVER ? `<div class="title"><h1>${extras.overKind === 'busted' ? 'BUSTED!' : 'WASTED!'}</h1>
        <p>The Bay PD took their cut. You woke up at Bay General Hospital.</p>
        <p>Cash: $${p.money} • Missions done: ${state.stats.missionsDone} / 10</p>
        <p><b>Press ENTER to get back out there</b></p></div>` : ''}
      ${extras.muted ? '<div class="muted">🔇 MUTED (M)</div>' : ''}`;
    drawMinimap(state);
  }

  function drawMinimap(state) {
    const W = minimap.width, Hh = minimap.height;
    const S = W / (CFG.worldHalf * 2);
    const ox = (x) => (x + CFG.worldHalf) * S;
    const oz = (z) => (z + CFG.worldHalf) * S;
    mctx.fillStyle = '#2f7d32';
    mctx.fillRect(0, 0, W, Hh);
    mctx.fillStyle = '#1e7fb8';
    mctx.fillRect(ox(CFG.waterX), 0, W - ox(CFG.waterX), Hh);
    mctx.fillStyle = '#e8d29a';
    mctx.fillRect(ox(CFG.beachX), 0, ox(CFG.waterX) - ox(CFG.beachX), Hh);
    mctx.strokeStyle = '#9aa0aa';
    mctx.lineWidth = 2;
    for (const v of state.city.lines) {
      mctx.beginPath(); mctx.moveTo(ox(v), 0); mctx.lineTo(ox(v), Hh); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, oz(v)); mctx.lineTo(W, oz(v)); mctx.stroke();
    }
    const target = missionTarget(state.missionIndex, state.missionStage);
    if (target) {
      mctx.fillStyle = '#ffd700';
      mctx.beginPath(); mctx.arc(ox(target.x), oz(target.z), 6, 0, Math.PI * 2); mctx.fill();
    }
    for (const car of state.policeCars) {
      mctx.fillStyle = '#ff3b30';
      mctx.beginPath(); mctx.arc(ox(car.x), oz(car.z), 4, 0, Math.PI * 2); mctx.fill();
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
    /** Camera-relative yaw for on-foot movement: W walks away from the camera. */
    getCamYaw() {
      const dx = camera.position.x - lastTarget.x;
      const dz = camera.position.z - lastTarget.z;
      return Math.atan2(dz, dx) - Math.PI / 2;
    },
    get canvas() { return renderer.domElement; },
  };
}
