// main.js — Neon Bay wiring: renderer, golden-hour light, the game loop,
// camera modes, input, enter/exit car, shooting, shops, garage and
// safehouse, save/load, and the ?shot= staging entry used for screenshots.
import * as THREE from 'three';
import { buildCity } from './city.js';
import { Traffic, buildCarMesh, Car, CAR_COLORS } from './vehicles.js';
import { Crowd, Player, CREW } from './people.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { MissionSystem } from './missions.js';
import { Hud } from './hud.js';
import { Fx } from './fx.js';
import { AudioEngine } from './audio.js';
import { Staging } from './shots.js';
import { makeRng, clamp, damp, angleLerp } from './rng.js';

const SAVE_KEY = 'neonbay-save-v1';

export class Game {
  constructor() {
    this.rng = makeRng(112358);
    this.state = {
      money: 500,
      respect: 0,
      wanted: 0,
      hp: 100,
      missionsDone: 0,
      timeMinutes: 17 * 60 + 30,
      hurricaneMinutes: 20 * 60,
      speedKmh: 0,
      boosting: false,
      radioOn: true,
      playerInCar: false,
      crew: CREW.map((c, i) => ({ ...c, faceColor: '#' + c.color.toString(16).padStart(6, '0'), recruited: i === 0 })),
    };
    this.stagedObjective = null;
    this.stagedSub = null;
    this.mode = 'title';
    this.cameraMode = 'chase';
    this.camOffset = new THREE.Vector3(0, 3.4, 11.5);
    this.camLook = new THREE.Vector3(0, 1.6, -14);
    this.camHeading = 0;
    this.camPitch = 0.12;
    this.input = { forward: false, back: false, left: false, right: false, run: false, nos: false, brake: false, camHeading: 0 };
    this.shotParam = 0;
    try {
      const q = new URLSearchParams(window.location.search);
      this.shotParam = parseInt(q.get('shot') || '0', 10) || 0;
    } catch (e) {
      this.shotParam = 0;
    }
    this.frames = 0;
    this.elapsed = 0;
    this.saveTimer = 0;
  }

  init() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    document.body.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe88a4a, 180, 1150);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3200);
    camera.position.set(-320, 90, 260);
    this.camera = camera;

    // golden hour: low warm sun from the west, warm sky bounce
    const sun = new THREE.DirectionalLight(0xffb36b, 2.4);
    sun.position.set(-420, 190, 160);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -420;
    sun.shadow.camera.right = 420;
    sun.shadow.camera.top = 420;
    sun.shadow.camera.bottom = -420;
    sun.shadow.camera.far = 1400;
    scene.add(sun);
    this.sun = sun;
    const hemi = new THREE.HemisphereLight(0xff9a6b, 0x2a3a5a, 0.85);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(0x604a6a, 0.5);
    scene.add(amb);

    this.city = buildCity(scene);
    this.fx = new Fx(scene);
    this.audio = new AudioEngine();
    this.traffic = new Traffic(scene, this.city, this.fx);
    this.crowd = new Crowd(scene);
    this.police = new Police(scene, this.city, this.fx, this.audio);
    this.combat = new Combat(scene, this.fx, this.audio);
    this.missions = new MissionSystem(scene, this.fx, this.audio);
    this.hud = new Hud(document);
    this.staging = new Staging(this);
    this.player = new Player(scene);
    this.playerCar = null;

    // world population: parked cars, flowing traffic, pedestrians
    const parkSpots = [];
    for (const r of this.city.roads) {
      const len = Math.hypot(r.x2 - r.x1, r.z2 - r.z1);
      const steps = Math.floor(len / 70);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        parkSpots.push({ x: r.x1 + (r.x2 - r.x1) * t + 7, z: r.z1 + (r.z2 - r.z1) * t });
      }
    }
    this.traffic.spawnParked(26, parkSpots);
    this.traffic.spawnFlow(24);
    this.crowd.spawn(26, this.city.spots.downtown, 130);
    this.crowd.spawn(14, this.city.spots.marketSquare, 60);
    this.crowd.spawn(12, this.city.spots.beach, 90);
    this.crowd.spawn(8, this.city.spots.harbour, 110);

    // patrol cars on the road loops
    for (let i = 0; i < 3; i++) {
      const loop = this.city.loops[i % this.city.loops.length];
      const wp = loop[Math.floor(this.rng.next() * loop.length)];
      this.police.spawnPatrol(new THREE.Vector3(wp.x, 0, wp.z));
    }

    // interactables: garage, gun store, safehouse
    this.interactables = [
      { name: 'GARAGE — buy NOS ($500)', pos: new THREE.Vector3(120, 0, 180), radius: 9, kind: 'garage' },
      { name: 'BAY ARMS — buy ammo ($200)', pos: new THREE.Vector3(240, 0, 60), radius: 9, kind: 'arms' },
      { name: 'SAFEHOUSE — clear wanted', pos: new THREE.Vector3(0, 0, -380), radius: 10, kind: 'safehouse' },
      { name: 'PIER — Rook', pos: new THREE.Vector3(-300, 0, -120), radius: 9, kind: 'pier' },
    ];
    this.nearInteractable = null;

    this.missions.onMissionComplete = (m) => {
      this.state.missionsDone = m.id + 1;
      this.hud.toast(`MISSION COMPLETE: ${m.name}  •  +$${m.reward.money.toLocaleString('en-US')}`);
      if (m.id === 0) this.state.crew[1].recruited = true;
      if (m.id === 2) this.state.crew[2].recruited = true;
      this.save();
    };
    this.missions.onStepComplete = (m, i) => {
      this.hud.toast(`${m.name}: step ${i + 1} done`);
    };

    this.load();
    this.missions.start(this.state.missionsDone >= 16 ? 15 : this.state.missionsDone);
    this.bindInput();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    if (this.shotParam > 0) {
      this.mode = 'playing';
      this.staging.apply(this.shotParam);
      this.hud.showTitle(false);
    } else {
      this.hud.showTitle(true);
    }
    window.__gameReady = false;
    window.NEONBAY = { game: this, state: this.state };
    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  bindInput() {
    const keymap = {
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      ShiftLeft: 'run', ShiftRight: 'run',
      Space: 'brake',
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') e.preventDefault();
      const k = keymap[e.code];
      if (k) this.input[k] = true;
      if (e.code === 'KeyE') this.tryInteract();
      if (e.code === 'KeyR') {
        const st = this.audio.nextStation();
        this.hud.toast('RADIO: ' + st.name);
      }
      if (e.code === 'KeyQ') {
        this.wheelOpen = !this.wheelOpen;
        this.hud.showWheel(this.wheelOpen, this.combat.weapons, this.combat.index);
      }
      if (this.wheelOpen && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        this.combat.select(parseInt(e.code.slice(-1), 10) - 1);
        this.hud.showWheel(true, this.combat.weapons, this.combat.index);
      }
      if (e.code === 'Escape') {
        if (this.mode === 'playing') {
          this.mode = 'paused';
          this.hud.showPause(true);
        } else if (this.mode === 'paused') {
          this.mode = 'playing';
          this.hud.showPause(false);
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = keymap[e.code];
      if (k) this.input[k] = false;
    });
    const el = this.renderer.domElement;
    el.addEventListener('click', () => {
      this.audio.ensure();
      if (this.mode === 'title') {
        this.mode = 'playing';
        this.hud.showTitle(false);
        this.hud.toast('NEON BAY — follow the gold beacon');
      } else if (this.mode === 'playing' && !this.wheelOpen) {
        this.shoot();
      }
    });
    el.addEventListener('mousemove', (e) => {
      if (e.buttons === 1 && this.mode === 'playing') {
        this.camHeading -= e.movementX * 0.004;
        this.camPitch = clamp(this.camPitch + e.movementY * 0.002, -0.15, 0.5);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'playing' && this.shotParam === 0) {
        this.mode = 'paused';
        this.hud.showPause(true);
      }
    });
  }

  shoot() {
    if (this.playerCar) return; // drive-by shooting is not in this build
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const targets = [];
    for (const s of this.police.swat) {
      if (!s.dead) targets.push({ pos: s.pos, hp: s.hp, dead: false, onDeath: () => { this.scene.remove(s.mesh); s.dead = true; } });
    }
    for (const c of this.police.cars) {
      if (!c.dead) {
        targets.push({
          pos: c.pos, hp: c.hp, dead: false,
          onDeath: () => this.combat.explodeCar(c, this.fx, this.audio),
        });
      }
    }
    const fired = this.combat.fire(origin, dir, targets, 'player');
    if (fired && this.state.wanted < 5) this.police.addWanted(0);
  }

  tryInteract() {
    if (!this.nearInteractable) {
      // try to enter / exit a car
      if (this.player.onFoot) {
        let best = null;
        let bestD = 5.5;
        for (const c of this.traffic.cars) {
          if (c.driver === 'police' || c.dead) continue;
          const d = Math.hypot(c.pos.x - this.player.pos.x, c.pos.z - this.player.pos.z);
          if (d < bestD) {
            best = c;
            bestD = d;
          }
        }
        if (best) {
          this.player.onFoot = false;
          this.player.mesh.visible = false;
          this.playerCar = best;
          best.driver = 'player';
          best.nos = Math.max(best.nos, 40);
          this.state.playerInCar = true;
          this.police.addWanted(1);
          this.hud.toast('Car stolen — the NBPD noticed');
          this.audio.uiClick();
        }
      } else if (this.playerCar) {
        const car = this.playerCar;
        this.player.onFoot = true;
        this.player.mesh.visible = true;
        this.player.pos.set(car.pos.x + 3, 0, car.pos.z + 1);
        this.player.heading = car.heading;
        car.driver = null;
        car.speed = 0;
        this.playerCar = null;
        this.state.playerInCar = false;
      }
      return;
    }
    const it = this.nearInteractable;
    if (it.kind === 'garage') {
      if (this.state.money >= 500 && this.playerCar) {
        this.state.money -= 500;
        this.playerCar.nos = 100;
        this.playerCar.maxSpeed = Math.min(52, this.playerCar.maxSpeed + 3);
        this.hud.toast('NOS refilled + engine tuned');
        this.audio.cash();
      } else {
        this.hud.toast(this.playerCar ? 'Need $500 for NOS' : 'Bring a car to the garage');
      }
    } else if (it.kind === 'arms') {
      if (this.state.money >= 200) {
        this.state.money -= 200;
        for (const w of this.combat.weapons) w.inReserve += w.mag;
        this.hud.toast('Ammo restocked');
        this.audio.cash();
      } else {
        this.hud.toast('Need $200 for ammo');
      }
    } else if (it.kind === 'safehouse') {
      this.police.clearWanted();
      this.state.hp = 100;
      this.hud.toast('Safehouse — heat cleared, healed up');
    } else if (it.kind === 'pier') {
      this.hud.toast('Rook: the storm is coming. Finish the job.');
    }
  }

  playerPos() {
    if (this.playerCar) return this.playerCar.pos;
    return this.player.pos;
  }

  playerHeading() {
    if (this.playerCar) return this.playerCar.heading;
    return this.player.heading;
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: this.state.money,
        respect: this.state.respect,
        missionsDone: this.state.missionsDone,
        crew: this.state.crew.map((c) => c.recruited),
        weapons: this.combat.weapons.map((w) => ({ ammo: w.ammo, inReserve: w.inReserve })),
      }));
    } catch (e) { /* storage unavailable in some embeds */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.money === 'number') this.state.money = s.money;
      if (typeof s.respect === 'number') this.state.respect = s.respect;
      if (typeof s.missionsDone === 'number') this.state.missionsDone = Math.min(15, s.missionsDone);
      if (Array.isArray(s.crew)) s.crew.forEach((r, i) => { if (this.state.crew[i]) this.state.crew[i].recruited = !!r; });
      if (Array.isArray(s.weapons)) s.weapons.forEach((w, i) => { if (this.combat.weapons[i]) { this.combat.weapons[i].ammo = w.ammo; this.combat.weapons[i].inReserve = w.inReserve; } });
    } catch (e) { /* ignore corrupt saves */ }
  }

  resolveCarCollisions(car) {
    for (const c of this.city.colliders) {
      const px = clamp(car.pos.x, c.minX, c.maxX);
      const pz = clamp(car.pos.z, c.minZ, c.maxZ);
      const dx = car.pos.x - px;
      const dz = car.pos.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < 2.3 * 2.3) {
        const d = Math.sqrt(d2) || 0.01;
        const push = 2.3 - d;
        car.pos.x += (dx / d) * push;
        car.pos.z += (dz / d) * push;
        if (Math.abs(car.speed) > 8) {
          car.speed *= 0.45;
          this.fx.burst('spark', car.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), 4, 3);
          this.audio.crash();
        } else {
          car.speed *= 0.7;
        }
      }
    }
  }

  updateCamera(dt) {
    const cam = this.camera;
    if (this.mode === 'title') {
      const a = this.elapsed * 0.045;
      cam.position.set(Math.cos(a) * 330, 95 + Math.sin(this.elapsed * 0.1) * 12, Math.sin(a) * 330);
      cam.lookAt(-40, 12, 0);
      return;
    }
    const target = this.playerPos();
    const heading = this.playerCar ? this.playerCar.heading : this.camHeading || this.player.heading;
    if (this.cameraMode === 'chase' && this.playerCar) {
      const f = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
      const s = new THREE.Vector3(f.z, 0, -f.x);
      const want = target.clone()
        .addScaledVector(f, -this.camOffset.z)
        .addScaledVector(s, this.camOffset.x);
      want.y = target.y + this.camOffset.y;
      cam.position.x = damp(cam.position.x, want.x, 6, dt);
      cam.position.y = damp(cam.position.y, want.y, 6, dt);
      cam.position.z = damp(cam.position.z, want.z, 6, dt);
      const look = target.clone().addScaledVector(f, -this.camLook.z).add(new THREE.Vector3(0, this.camLook.y, 0));
      cam.lookAt(look);
    } else {
      const f = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
      const s = new THREE.Vector3(f.z, 0, -f.x);
      const want = target.clone()
        .addScaledVector(f, -this.camOffset.z)
        .addScaledVector(s, this.camOffset.x);
      want.y = target.y + this.camOffset.y;
      cam.position.x = damp(cam.position.x, want.x, 8, dt);
      cam.position.y = damp(cam.position.y, want.y, 8, dt);
      cam.position.z = damp(cam.position.z, want.z, 8, dt);
      const look = target.clone().addScaledVector(f, -this.camLook.z).add(new THREE.Vector3(0, this.camLook.y, 0));
      cam.lookAt(look);
    }
  }

  tick(ms) {
    const dt = Math.min(0.05, (ms - (this._last || ms)) / 1000 || 0.016);
    this._last = ms;
    this.frames += 1;
    const t = ms / 1000;
    this.elapsed += dt;
    if (this.mode === 'paused') {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    // time of day + hurricane countdown
    this.state.timeMinutes += dt * 0.12;
    this.state.hurricaneMinutes = Math.max(0, this.state.hurricaneMinutes - dt);
    const sunA = ((this.state.timeMinutes - 12 * 60) / (12 * 60)) * Math.PI;
    this.sun.position.set(-420 * Math.cos(sunA * 0.4), 190 - sunA * 22, 160);

    // player
    if (this.mode === 'playing') {
      this.input.camHeading = this.camHeading;
      // staged chase shots drive themselves: the hero car holds its cruise
      if (this.shotParam > 0 && this.playerCar) this.input.forward = true;
      if (this.playerCar) {
        const throttle = (this.input.forward ? 1 : 0) + (this.input.back ? -0.55 : 0);
        const steer = (this.input.left ? -1 : 0) + (this.input.right ? 1 : 0);
        const boosting = this.playerCar.drive(dt, throttle, steer, this.input.brake, this.input.run);
        this.state.boosting = boosting;
        this.state.speedKmh = Math.abs(this.playerCar.speed) * 3.6;
        this.resolveCarCollisions(this.playerCar);
        if (boosting) {
          const back = this.playerCar.pos.clone().addScaledVector(this.playerCar.forward, -2.3);
          back.y = this.playerCar.pos.y + 0.4;
          this.fx.nosFlame(back, this.playerCar.forward.clone().multiplyScalar(-1));
        }
        if (this.input.brake && Math.abs(this.playerCar.speed) > 8) {
          const back = this.playerCar.pos.clone().addScaledVector(this.playerCar.forward, -1.6);
          back.y = this.playerCar.pos.y + 0.2;
          this.fx.tireSmoke(back, false);
          this.fx.addSkid(back, this.playerCar.heading);
        }
        this.audio.setEngine(Math.abs(this.playerCar.speed) / 46, boosting);
      } else {
        this.player.update(dt, this.input, this.city.colliders);
        this.state.speedKmh = Math.abs(this.player.speed) * 3.6;
        this.audio.setEngine(0, false);
      }
    }

    // world systems
    this.traffic.update(dt, { playerCar: this.playerCar });
    const danger = this.playerPos();
    this.crowd.update(dt, this.state.wanted >= 3 ? danger : null);
    this.police.update(dt, this.playerPos(), this.state.speedKmh, t);
    this.state.wanted = this.police.wanted;
    this.combat.update(dt);
    this.missions.update(dt, this, t);
    this.fx.update(dt, this.camera);
    if (this.shotParam > 0) this.staging.update(dt, t);

    // interactable proximity
    this.nearInteractable = null;
    if (this.mode === 'playing') {
      for (const it of this.interactables) {
        if (this.playerPos().distanceTo(it.pos) < it.radius) {
          this.nearInteractable = it;
          break;
        }
      }
    }

    // hack panel while a hack step is active and the player is on site
    const step = this.missions.step;
    if (step && step.type === 'hack' && this.playerPos().distanceTo(step.target) < 9 && !this.missions.done) {
      const frac = this.missions.stepProgress / (step.duration || 6);
      this.hud.showHack(true, frac, `NODE ${Math.floor(frac * 4) + 1}/4 — REYES is in`);
    } else if (this.shotParam !== 3) {
      this.hud.showHack(false);
    }

    this.updateCamera(dt);
    if (this.mode === 'playing' || this.mode === 'title') {
      this.hud.update(this.state, this);
    }
    this.renderer.render(this.scene, this.camera);
    if (this.frames === 12) window.__gameReady = true;
    this.saveTimer += dt;
    if (this.saveTimer > 25) {
      this.saveTimer = 0;
      this.save();
    }
  }
}
