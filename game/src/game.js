// Playable Neon Bay: free-roam driving on the golden-hour coast road.
// WASD drive, Shift NOS, Space brake, F on foot / enter car, 1-4 weapons,
// Q weapon wheel (toast), R radio, M next mission. Wanted stars rise when you
// hit traffic or police; completing the mission marker advances the story.
// Progress (money / mission / respect) persists in localStorage.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import * as B from './builders.js';
import { makeSky, makeBeachRoad, makeSkyline, makeBuildingRow, makePalmRow } from './world.js';
import { MISSIONS, RADIOS, loadSave, storeSave } from './missions.js';
import { applyLiveHud } from './hud.js';

const TRAFFIC_PAINTS = [0xff5f2e, 0x2ee6a8, 0xffd24d, 0x4da6ff, 0xff5fa2, 0x9d6bff, 0x37e08a, 0xe0e6f0];

export function startGame(scene, camera, renderer) {
  makeSky(scene, 7);
  makeBeachRoad(scene);
  makeSkyline(scene, 3);
  makeBuildingRow(scene, +1, 80, -140, ['#e06a4d', '#3d7a8c', '#c9a227', '#7a4a8c', '#2e6b62'], 101);
  makePalmRow(scene, -16.5, 70, -130, 16, 201);
  makePalmRow(scene, 16.8, 60, -120, 22, 301);

  const save = loadSave();
  const state = {
    money: save.money, mission: save.mission, respect: save.respect,
    stars: 0, radio: save.radio, weapon: 0, speed: 0, inCar: true,
    district: 'Bayfront', storm: '19:42:10', clock: '17:42',
  };

  // hero car + NOS
  const hero = B.makeCar(0xff2e88);
  const nos = B.makeNosFlame(); nos.visible = false;
  hero.add(nos);
  hero.position.set(0, 0, 10);
  scene.add(hero);

  // on-foot player (hidden while driving)
  const walker = B.makePerson({ shirt: 0xff2e88, seed: 42 });
  walker.visible = false;
  scene.add(walker);

  // traffic: 10 colored cars cruising the road
  const r = makeRng(77);
  const traffic = [];
  for (let i = 0; i < 10; i++) {
    const c = B.makeCar(r.pick(TRAFFIC_PAINTS));
    c.position.set(r.pick([-4.2, -1.4, 1.4, 4.2]), 0, -30 - i * 16);
    c.userData.speed = r.range(9, 15);
    scene.add(c); traffic.push(c);
  }
  // police cruisers that join the chase as wanted level rises
  const cops = [];
  for (let i = 0; i < 3; i++) {
    const c = B.makeCar(0xf2f2f2, { police: true });
    c.position.set(r.pick([-4, 4]), 0, 40 + i * 14);
    c.visible = false;
    scene.add(c); cops.push(c);
  }
  // heli that appears at 3+ stars
  const heli = B.makeHeli({ searchlight: true });
  heli.scale.setScalar(1.5);
  heli.visible = false;
  scene.add(heli);
  // pedestrians on the sidewalks
  const peds = [];
  for (let i = 0; i < 8; i++) {
    const p = B.makePerson({ seed: 500 + i });
    p.position.set(i % 2 ? 13.5 : -13.5, 0, 40 - i * 14);
    p.userData.dir = i % 2 ? -1 : 1;
    scene.add(p); peds.push(p);
  }
  // mission marker: glowing beacon down the road
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff5fa2, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
  marker.position.set(0, 3.5, -90);
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,95,162,1)'); grad.addColorStop(1, 'rgba(255,95,162,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  })(), transparent: true, depthWrite: false }));
  beacon.scale.set(5, 5, 1); beacon.position.set(0, 2, -90);
  scene.add(marker, beacon);

  // ---- input ----
  const keys = {};
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyF') {
      state.inCar = !state.inCar;
      hero.visible = state.inCar; walker.visible = !state.inCar;
      if (!state.inCar) { walker.position.copy(hero.position); walker.rotation.copy(hero.rotation); }
      toast(state.inCar ? 'Back in the car' : 'On foot — press F to get back in');
    }
    if (e.code === 'KeyR') { state.radio = (state.radio + 1) % RADIOS.length; toast('♪ ' + RADIOS[state.radio].name); }
    if (e.code === 'KeyM') { advanceMission(); }
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 4) state.weapon = n - 1;
    }
    if (e.code === 'KeyQ') toast('Weapon wheel — 1 Pistol • 2 SMG • 3 Shotgun • 4 Rifle');
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  const toastEl = document.getElementById('toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastTimer = 3;
  }
  function advanceMission() {
    if (state.mission < 16) {
      state.mission++;
      state.money += MISSIONS[state.mission - 2].reward;
      state.respect = Math.min(100, state.respect + 4);
      toast(`Mission ${state.mission}/16: ${MISSIONS[state.mission - 1].name} — +$${MISSIONS[state.mission - 2].reward}`);
      storeSave({ money: state.money, mission: state.mission, respect: state.respect, radio: state.radio, completed: [] });
    } else {
      toast('Story complete — Neon Bay is yours. Hurricane incoming…');
    }
  }

  // ---- loop ----
  let speed = 0, heading = 0, wantedTimer = 0;
  const clock = new THREE.Clock();
  let hudTimer = 0;
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // drive / walk
    const nosOn = keys.ShiftLeft || keys.ShiftRight;
    if (state.inCar) {
      const accel = nosOn ? 34 : 20;
      if (keys.KeyW || keys.ArrowUp) speed += accel * dt;
      if (keys.KeyS || keys.ArrowDown) speed -= 26 * dt;
      if (keys.Space) speed -= 40 * dt;
      speed -= speed * 0.35 * dt; // drag
      speed = Math.max(-12, Math.min(nosOn ? 62 : 46, speed));
      if (keys.KeyA || keys.ArrowLeft) heading += 1.5 * dt * Math.sign(speed || 1);
      if (keys.KeyD || keys.ArrowRight) heading -= 1.5 * dt * Math.sign(speed || 1);
      hero.position.x += Math.sin(heading) * speed * dt;
      hero.position.z -= Math.cos(heading) * speed * dt;
      hero.position.x = Math.max(-9, Math.min(9, hero.position.x));
      hero.position.z = Math.max(-160, Math.min(150, hero.position.z));
      hero.rotation.y = heading + (nosOn && speed > 20 ? 0.06 : 0);
      nos.visible = nosOn && speed > 15;
      state.speed = Math.abs(speed) * 3.1;
      // chase camera
      const cx = hero.position.x - Math.sin(heading) * 9;
      const cz = hero.position.z + Math.cos(heading) * 9;
      camera.position.lerp(new THREE.Vector3(cx, 3.4, cz), 0.12);
      camera.lookAt(hero.position.x, 1.2, hero.position.z - 8);
    } else {
      const mv = 6 * dt;
      if (keys.KeyW) walker.position.z -= mv;
      if (keys.KeyS) walker.position.z += mv;
      if (keys.KeyA) walker.position.x -= mv;
      if (keys.KeyD) walker.position.x += mv;
      walker.position.x = Math.max(-13, Math.min(13, walker.position.x));
      walker.position.z = Math.max(-160, Math.min(150, walker.position.z));
      state.speed = 0;
      camera.position.lerp(new THREE.Vector3(walker.position.x + 2.5, 2.6, walker.position.z + 6), 0.12);
      camera.lookAt(walker.position.x, 1.3, walker.position.z - 6);
    }

    // traffic cruise + wrap
    for (const c of traffic) {
      c.position.z -= c.userData.speed * dt;
      if (c.position.z < -165) c.position.z = 150;
      // collision with hero = wanted + bump
      if (state.inCar && Math.abs(c.position.x - hero.position.x) < 1.9 && Math.abs(c.position.z - hero.position.z) < 3.4) {
        if (state.stars < 5) { state.stars++; toast(`BCPD pursuit — ${state.stars} star${state.stars > 1 ? 's' : ''}!`); }
        speed *= 0.5;
        c.position.z -= 6;
      }
    }
    // police chase when wanted
    cops.forEach((c, i) => {
      c.visible = state.stars >= 2;
      if (!c.visible) return;
      const dz = hero.position.z - c.position.z;
      c.position.z += Math.sign(dz) * Math.min(Math.abs(dz), (14 + state.stars * 2) * dt);
      c.position.x += (hero.position.x - c.position.x) * 0.4 * dt;
      c.rotation.y = heading * 0.5;
    });
    heli.visible = state.stars >= 3;
    if (heli.visible) {
      heli.position.set(hero.position.x + 8, 24 + Math.sin(t * 0.7) * 1.5, hero.position.z - 30);
      heli.userData.blades.rotation.y += dt * 14;
    }
    // peds stroll
    for (const p of peds) {
      p.position.z += p.userData.dir * 1.1 * dt;
      if (p.position.z > 80) p.position.z = -140;
      if (p.position.z < -145) p.position.z = 75;
    }
    // wanted decay when clean
    wantedTimer += dt;
    if (wantedTimer > 14 && state.stars > 0) { state.stars--; wantedTimer = 0; toast('BCPD lost your trail — heat dropping'); }
    // mission marker reached?
    const reach = state.inCar ? hero.position : walker.position;
    if (Math.abs(reach.z - -90) < 6 && Math.abs(reach.x) < 4) {
      advanceMission();
      marker.position.z -= 60; beacon.position.z -= 60;
      if (marker.position.z < -160) { marker.position.z = 140; beacon.position.z = 140; }
    }
    // storm countdown ticks
    state.storm = '19:41:' + String(59 - Math.floor(t % 60)).padStart(2, '0');
    // HUD refresh 4x/sec
    hudTimer += dt;
    if (hudTimer > 0.25) { hudTimer = 0; applyLiveHud(state); }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastEl.textContent = ''; }
    renderer.render(scene, camera);
  }
  document.getElementById('help').style.display = 'block';
  applyLiveHud(state);
  toast(`Mission ${state.mission}/16: ${MISSIONS[state.mission - 1].name} — drive to the pink beacon`);
  tick();
}
