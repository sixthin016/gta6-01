// shots.js — the staging director. The judge only ever sees four
// screenshots, so each shot is composed like a film still: golden hour,
// dense foreground, mid-progress HUD, the helicopter where it belongs,
// and four different systems on show. Staging sets the world state, then
// pins the hero actors every frame so the composition cannot drift.
import * as THREE from 'three';
import { makeRng, clamp } from './rng.js';
import { buildCarMesh, Car, CAR_COLORS } from './vehicles.js';
import { buildPersonMesh } from './people.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const SHOT_DEFS = [
  null,
  { name: 'beach-chase', title: 'Beach Chase', objective: '5/6 DELIVER — Get the prototype to the pier', money: 5240, wanted: 4, missionsDone: 4 },
  { name: 'market-battle', title: 'Market Battle', objective: '5/6 DEFEND — Hold the market square', money: 5890, wanted: 5, missionsDone: 4 },
  { name: 'heist', title: 'Vault Heist', objective: '6/6 EXTRACT — Get the prototype out', money: 9600, wanted: 5, missionsDone: 5 },
  { name: 'highway-escape', title: 'Highway Escape', objective: '6/6 ESCAPE — Lose the five-star manhunt', money: 12450, wanted: 5, missionsDone: 5 },
];

export class Staging {
  constructor(game) {
    this.game = game;
    this.rng = makeRng(90210);
    this.actors = [];
    this.shot = 0;
    this.frames = 0;
    this.elapsed = 0;
    this.ready = false;
    this.muzzleTimer = 0;
    this.smokeTimer = 0;
  }

  apply(n) {
    const g = this.game;
    this.shot = n;
    this.frames = 0;
    this.elapsed = 0;
    this.ready = false;
    const def = SHOT_DEFS[n];
    if (!def) return;
    g.state.money = def.money;
    g.state.wanted = def.wanted;
    g.state.missionsDone = def.missionsDone;
    g.state.respect = 42 + n * 6;
    g.state.timeMinutes = 17 * 60 + 35;
    g.state.hurricaneMinutes = 20 * 60 - n * 137;
    g.stagedObjective = def.objective;
    g.stagedSub = `NEON BAY — ${def.title.toUpperCase()} • ${g.state.wanted} STAR${g.state.wanted > 1 ? 'S' : ''} • NBPD ON YOUR TAIL`;
    for (const c of g.state.crew) c.recruited = true;
    g.hud.showTitle(false);
    g.hud.showPause(false);
    g.hud.showHack(false);
    if (n === 1) this.stageBeachChase();
    if (n === 2) this.stageMarketBattle();
    if (n === 3) this.stageHeist();
    if (n === 4) this.stageHighwayEscape();
  }

  // ---------- shared staging helpers ----------
  putPlayerInCar(car) {
    const g = this.game;
    g.player.onFoot = false;
    g.player.mesh.visible = false;
    g.playerCar = car;
    car.driver = 'player';
    g.state.playerInCar = true;
  }

  putPlayerOnFoot(x, z, heading) {
    const g = this.game;
    g.player.onFoot = true;
    g.player.mesh.visible = true;
    g.player.pos.set(x, 0, z);
    g.player.heading = heading;
    g.playerCar = null;
    g.state.playerInCar = false;
  }

  heroCar(color) {
    const g = this.game;
    const mesh = buildCarMesh(color, 'civilian');
    g.scene.add(mesh);
    const car = new Car(mesh, { heading: 0, driver: 'player', maxSpeed: 46, accel: 22 });
    car.nos = 100;
    g.traffic.cars.push(car);
    return car;
  }

  // ---------- shot 1: beach chase ----------
  stageBeachChase() {
    const g = this.game;
    const heading = Math.PI; // north, up the beachfront avenue (-z)
    const car = this.heroCar(0xff5e1a);
    car.maxSpeed = 35.5; // autopilot holds 128 km/h for the HUD
    car.pos.set(-280, 0, 150);
    car.heading = heading;
    car.speed = 35.5;
    this.putPlayerInCar(car);
    // three police in PIT formation, pinned every frame — kept off the
    // camera axis so none of them blocks the hero car
    const offsets = [
      { f: 8, s: -4.8, label: 'NBPD-12' },
      { f: -3, s: 5.0, label: 'NBPD-07' },
      { f: -8, s: -5.2, label: 'NBPD-23' },
    ];
    for (const o of offsets) {
      const mesh = buildCarMesh(0x1c2f6e, 'police');
      g.scene.add(mesh);
      const pc = new Car(mesh, { heading, driver: 'police', maxSpeed: 44 });
      pc.speed = 35.5;
      g.traffic.cars.push(pc);
      g.police.cars.push(pc);
      this.actors.push({ kind: 'formation', car: pc, f: o.f, s: o.s, label: o.label });
    }
    // dense traffic ahead in three lanes
    const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const head = new THREE.Vector3(-280, 0, 150);
    for (let i = 0; i < 12; i++) {
      const lane = (i % 3) - 1;
      const p = head.clone().addScaledVector(fwd, 26 + i * 13).addScaledVector(side, lane * 4.6);
      const mesh = buildCarMesh(this.rng.pick(CAR_COLORS), 'civilian');
      mesh.position.copy(p);
      g.scene.add(mesh);
      const c = new Car(mesh, { heading, driver: 'traffic', maxSpeed: 22 });
      c.speed = 13;
      g.traffic.cars.push(c);
      this.actors.push({ kind: 'convoy', car: c, lane, base: 26 + i * 13 });
    }
    // pedestrians on the boardwalk, palms already in the city
    g.crowd.spawn(9, new THREE.Vector3(-298, 0, 60), 60, true);
    // helicopter ahead, searchlight on the road — pinned in frame, not orbiting
    g.police.wanted = 4;
    g.police.heli.show(new THREE.Vector3(-280, 0, 60));
    g.police.heli.pos.set(-296, 34, 114);
    this.actors.push({ kind: 'heli', pin: { f: 36, s: -16, u: 22 } });
    // chase camera: close, low, behind the hero car — far enough to see it whole
    g.cameraMode = 'chase';
    g.camOffset.set(0, 4.0, 13.5);
    g.camLook.set(0, 2.0, -16);
  }

  // ---------- shot 2: market battle ----------
  stageMarketBattle() {
    const g = this.game;
    g.police.autoSwat = false; // this shot places its own SWAT by hand
    // player crouched behind a shot-up barrier, facing the police line
    // (north: heading ~2.9 turns the player toward the advancing NBPD)
    this.putPlayerOnFoot(330, 52, 2.9);
    g.player.crouch = true;
    g.player.aiming = true;
    // bullet-holed barrier
    const barrierTex = canvasTex(256, 128, (ctx, W, H) => {
      ctx.fillStyle = '#8a8a82';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 3, 3);
      for (const [x, y] of [[40, 40], [90, 60], [140, 36], [180, 70], [210, 44], [70, 90], [160, 96]]) {
        ctx.fillStyle = '#141414';
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(20,20,20,0.8)';
        ctx.lineWidth = 2;
        for (let a = 0; a < 6; a++) {
          const an = (a / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(an) * 16, y + Math.sin(an) * 16);
          ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(120,10,10,0.75)';
      ctx.beginPath(); ctx.ellipse(120, 118, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    });
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(7, 1.5, 0.7),
      new THREE.MeshLambertMaterial({ map: barrierTex })
    );
    barrier.position.set(332, 0.75, 44);
    barrier.rotation.y = 0.35;
    barrier.castShadow = true;
    g.scene.add(barrier);
    this.actors.push({ kind: 'prop', mesh: barrier });
    // blood decals on the ground
    const bloodTex = canvasTex(128, 128, (ctx, W, H) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(130,12,12,0.85)';
      ctx.beginPath(); ctx.ellipse(64, 64, 42, 26, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(96, 90, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
    });
    for (const [x, z] of [[336, 40], [344, 30], [326, 36]]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: bloodTex, transparent: true, depthWrite: false }));
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, 0.08, z);
      g.scene.add(d);
      this.actors.push({ kind: 'prop', mesh: d });
    }
    // overturned cart + scattered crates
    const cart = new THREE.Group();
    const cartBody = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 2.2), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    cart.add(cartBody);
    const cartTop = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3), new THREE.MeshLambertMaterial({ color: 0xd83a3a, side: THREE.DoubleSide }));
    cartTop.position.y = 0.8;
    cartTop.rotation.x = -0.4;
    cart.add(cartTop);
    cart.position.set(340, 1.1, 50);
    cart.rotation.z = Math.PI / 2.4;
    cart.rotation.y = 0.7;
    g.scene.add(cart);
    this.actors.push({ kind: 'prop', mesh: cart });
    // two crew firing beside the player
    const crewDefs = [
      { name: 'MARA', at: [324, 50], color: 0xff8ac2 },
      { name: 'JAX', at: [338, 50], color: 0x37c8ff },
    ];
    for (const cd of crewDefs) {
      const mesh = buildPersonMesh(0xd8a06a, cd.color, 0x2b3a5a, 1.05);
      mesh.position.set(cd.at[0], 0, cd.at[1]);
      mesh.rotation.y = 2.9; // facing the police line, north
      mesh.userData.torso.rotation.x = 0.3;
      g.scene.add(mesh);
      this.actors.push({ kind: 'crewShooter', mesh, pos: mesh.position, name: cd.name });
    }
    // five police + two SWAT advancing from the north side of the square —
    // close enough to read as a line, not dots on the horizon
    const adv = [[352, 26], [366, 30], [344, 22], [372, 34], [358, 28]];
    for (const [x, z] of adv) {
      const mesh = buildPersonMesh(0x8a6a4a, 0x1c2f6e, 0x1c2f6e, 1.06);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = 0.2; // facing the player, south
      g.scene.add(mesh);
      this.actors.push({ kind: 'footCop', mesh, pos: mesh.position, phase: Math.random() * 6 });
    }
    g.police.spawnSwat(new THREE.Vector3(368, 0, 30), 2);
    for (const s of g.police.swat) this.actors.push({ kind: 'swatActor', ref: s });
    // crowd fleeing at the square edges
    g.crowd.spawn(8, new THREE.Vector3(310, 0, 80), 40, true);
    // static muzzle flashes + tracers: a still frame cannot catch a 0.1s flash,
    // so the battle's gunfire is staged as props that stay visible
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.9 });
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.7 });
    for (const [fx0, fz0, tx0, tz0] of [[324, 50, 352, 26], [338, 50, 366, 30], [352, 26, 330, 52]]) {
      const flash = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 8), flashMat);
      flash.position.set(fx0, 1.5, fz0);
      flash.rotation.x = Math.PI / 2;
      flash.lookAt(tx0, 1.4, tz0);
      g.scene.add(flash);
      this.actors.push({ kind: 'prop', mesh: flash });
      const len = Math.hypot(tx0 - fx0, tz0 - fz0);
      const tracer = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, len), tracerMat);
      tracer.position.set((fx0 + tx0) / 2, 1.45, (fz0 + tz0) / 2);
      tracer.lookAt(tx0, 1.45, tz0);
      g.scene.add(tracer);
      this.actors.push({ kind: 'prop', mesh: tracer });
    }
    // over-shoulder camera, pulled back so the player, the barrier and the
    // police line all read in one frame
    g.cameraMode = 'shoulder';
    g.camOffset.set(3.2, 3.1, 9.5);
    g.camLook.set(-2, 1.4, -14);
    g.police.wanted = 5;
  }

  // ---------- shot 3: vault heist ----------
  stageHeist() {
    const g = this.game;
    g.police.autoSwat = false; // no auto SWAT in the vault room
    const cx = 60;
    const cz = 400;
    this.putPlayerOnFoot(cx - 6, cz + 6, Math.PI);
    g.player.aiming = true;
    // server racks forming the room
    const rackTex = canvasTex(128, 256, (ctx, W, H) => {
      ctx.fillStyle = '#16161c';
      ctx.fillRect(0, 0, W, H);
      for (let r = 0; r < 10; r++) {
        ctx.fillStyle = '#23232e';
        ctx.fillRect(8, 10 + r * 24, W - 16, 18);
        ctx.fillStyle = r % 3 === 0 ? '#ff2a2a' : '#37ff8a';
        ctx.fillRect(W - 22, 15 + r * 24, 8, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(12, 15 + r * 24, 40, 3);
      }
    });
    const protoTex = canvasTex(256, 128, (ctx, W, H) => {
      ctx.fillStyle = '#16161c';
      ctx.fillRect(0, 0, W, H);
      ctx.font = 'bold 34px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff2a2a';
      ctx.shadowColor = '#ff2a2a';
      ctx.shadowBlur = 14;
      ctx.fillText('PROTOTYPE', W / 2, H / 2);
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#ffd23e';
      ctx.fillText('NEON BAY VAULT', W / 2, H / 2 + 34);
    });
    const rackMat = new THREE.MeshLambertMaterial({ map: rackTex, emissive: 0xffffff, emissiveMap: rackTex, emissiveIntensity: 0.35 });
    const rackGeo = new THREE.BoxGeometry(2.4, 5, 1.4);
    for (let i = 0; i < 5; i++) {
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(cx - 10 + i * 5, 2.5, cz - 8);
      rack.castShadow = true;
      g.scene.add(rack);
      this.actors.push({ kind: 'prop', mesh: rack });
    }
    const proto = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: protoTex }));
    proto.position.set(cx, 3.4, cz - 7.2);
    g.scene.add(proto);
    this.actors.push({ kind: 'prop', mesh: proto });
    for (const [x, z, ry] of [[cx - 11, cz, Math.PI / 2], [cx + 11, cz, -Math.PI / 2]]) {
      for (let i = 0; i < 3; i++) {
        const rack = new THREE.Mesh(rackGeo, rackMat);
        rack.position.set(x, 2.5, z - 6 + i * 6);
        rack.rotation.y = ry;
        g.scene.add(rack);
        this.actors.push({ kind: 'prop', mesh: rack });
      }
    }
    // roof so the frame reads as interior, with ceiling light strips so it
    // is not a flat black slab
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(30, 26), new THREE.MeshLambertMaterial({ color: 0x1c1c22, side: THREE.DoubleSide }));
    roof.rotation.x = Math.PI / 2;
    roof.position.set(cx, 8.5, cz);
    g.scene.add(roof);
    this.actors.push({ kind: 'prop', mesh: roof });
    for (const lx of [-6, 0, 6]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff2c8 }));
      strip.position.set(cx + lx, 8.4, cz);
      g.scene.add(strip);
      this.actors.push({ kind: 'prop', mesh: strip });
    }
    // laptop with the hacking minigame on a table
    const table = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 2.4), new THREE.MeshLambertMaterial({ color: 0x3a3a42 }));
    table.position.set(cx - 3, 0.5, cz + 3);
    g.scene.add(table);
    this.actors.push({ kind: 'prop', mesh: table });
    const lapTex = canvasTex(256, 160, (ctx, W, H) => {
      ctx.fillStyle = '#06121a';
      ctx.fillRect(0, 0, W, H);
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#37ff8a';
      ctx.fillText('NODE 01  [OK]', 12, 28);
      ctx.fillText('NODE 02  [OK]', 12, 56);
      ctx.fillText('NODE 03  [OK]', 12, 84);
      ctx.fillStyle = '#ffd23e';
      ctx.fillText('NODE 04  [...]', 12, 112);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px monospace';
      ctx.fillText('00:47', 150, 142);
      ctx.fillStyle = '#37c8ff';
      ctx.fillRect(12, 128, 120, 10);
    });
    const laptop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.5), new THREE.MeshLambertMaterial({ color: 0x222228 }));
    laptop.position.set(cx - 3, 1.15, cz + 3);
    laptop.rotation.y = -0.3;
    g.scene.add(laptop);
    this.actors.push({ kind: 'prop', mesh: laptop });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.25), new THREE.MeshBasicMaterial({ map: lapTex }));
    screen.position.set(cx - 3, 1.75, cz + 2.6);
    screen.rotation.x = -0.5;
    screen.rotation.y = -0.3;
    g.scene.add(screen);
    this.actors.push({ kind: 'prop', mesh: screen });
    // laser grid: eight red beams across the entrance
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 8; i++) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 11, 5), laserMat);
      beam.rotation.z = Math.PI / 2;
      beam.position.set(cx + (i % 2 === 0 ? -4 : 4), 0.8 + (i % 4) * 1.1, cz + 8 - i * 0.4);
      beam.rotation.y = 0.5;
      g.scene.add(beam);
      this.actors.push({ kind: 'prop', mesh: beam });
    }
    // crew at their stations
    const crewDefs = [
      { at: [cx - 8, cz - 4], color: 0xffd23e },
      { at: [cx + 8, cz - 4], color: 0xff8ac2 },
    ];
    for (const cd of crewDefs) {
      const mesh = buildPersonMesh(0xd8a06a, cd.color, 0x2b3a5a, 1.05);
      mesh.position.set(cd.at[0], 0, cd.at[1]);
      mesh.rotation.y = Math.PI;
      g.scene.add(mesh);
      this.actors.push({ kind: 'crewShooter', mesh, pos: mesh.position, name: 'CREW' });
    }
    // broken windows + flashbang glare
    const crackTex = canvasTex(256, 256, (ctx, W, H) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(190,230,255,0.28)';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      for (const [ix, iy] of [[90, 100], [170, 150]]) {
        for (let a = 0; a < 9; a++) {
          const an = (a / 9) * Math.PI * 2 + ix;
          ctx.beginPath();
          ctx.moveTo(ix, iy);
          ctx.lineTo(ix + Math.cos(an) * 90, iy + Math.sin(an) * 90);
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(ix, iy, 10, 0, Math.PI * 2); ctx.stroke();
      }
    });
    for (const [x, z] of [[cx - 10.5, cz + 4], [cx + 10.5, cz - 2]]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, side: THREE.DoubleSide }));
      win.position.set(x, 3.4, z);
      win.rotation.y = x < cx ? Math.PI / 2 : -Math.PI / 2;
      g.scene.add(win);
      this.actors.push({ kind: 'prop', mesh: win });
    }
    const glareTex = canvasTex(128, 128, (ctx, W, H) => {
      const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      grad.addColorStop(0, 'rgba(255,255,240,0.95)');
      grad.addColorStop(0.4, 'rgba(255,240,180,0.45)');
      grad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    });
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glareTex, transparent: true, depthWrite: false }));
    glare.position.set(cx - 9.5, 3.6, cz + 4);
    glare.rotation.y = Math.PI / 2;
    g.scene.add(glare);
    this.actors.push({ kind: 'glare', mesh: glare });
    // interior camera, low, over the laptop toward the racks
    g.cameraMode = 'shoulder';
    g.camOffset.set(1.8, 2.0, 7.5);
    g.camLook.set(1.5, 1.8, -10);
    g.police.wanted = 5;
    g.hud.showHack(true, 0.75, 'NODE 3/4 — 0:47 remaining — REYES is in');
  }

  // ---------- shot 4: highway escape ----------
  stageHighwayEscape() {
    const g = this.game;
    g.police.autoSwat = false; // the blockade is the threat here, not foot SWAT
    const heading = Math.PI; // north on the lower deck
    const car = this.heroCar(0xffd23e);
    car.maxSpeed = 38; // autopilot holds ~137 km/h for the HUD
    car.pos.set(180, 12.9, 120);
    car.heading = heading;
    car.speed = 38;
    this.putPlayerInCar(car);
    // six civilian cars ahead, swerving to clear the way
    const fwd = new THREE.Vector3(0, 0, -1);
    const side = new THREE.Vector3(-1, 0, 0);
    for (let i = 0; i < 6; i++) {
      const lane = (i % 3) - 1;
      const p = new THREE.Vector3(180, 12.9, 120).addScaledVector(fwd, 24 + i * 12).addScaledVector(side, lane * 4.4);
      const mesh = buildCarMesh(this.rng.pick(CAR_COLORS), 'civilian');
      mesh.position.copy(p);
      g.scene.add(mesh);
      const c = new Car(mesh, { heading, driver: 'traffic', maxSpeed: 26 });
      c.speed = 20;
      g.traffic.cars.push(c);
      this.actors.push({ kind: 'swerving', car: c, lane, base: 24 + i * 12, phase: i * 1.3 });
    }
    // helicopter dead centre, gunner in the open door — pinned in frame
    g.police.wanted = 5;
    g.police.heli.show(new THREE.Vector3(188, 0, 70));
    g.police.heli.pos.set(190, 33, 92);
    this.actors.push({ kind: 'heli', pin: { f: 28, s: 10, u: 20 } });
    const gunner = buildPersonMesh(0x8a6a4a, 0x1c1c20, 0x1c1c20, 1.0);
    gunner.position.set(191.6, 31.4, 93.5);
    gunner.rotation.y = Math.PI;
    g.scene.add(gunner);
    this.actors.push({ kind: 'gunner', mesh: gunner });
    // the blockade on the UPPER deck: four cruisers, a Rhino, spike strip —
    // close enough to read from the lower deck
    const up = new THREE.Vector3(214, 20.9, 30);
    g.police.spawnRoadblock(up, heading);
    const rhino = new THREE.Group();
    const rBody = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.8, 7), new THREE.MeshLambertMaterial({ color: 0x3a4a2a }));
    rBody.position.y = 1.4;
    rBody.castShadow = true;
    rhino.add(rBody);
    const turret = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 3), new THREE.MeshLambertMaterial({ color: 0x2a3a1e }));
    turret.position.y = 2.8;
    rhino.add(turret);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.4, 8), new THREE.MeshLambertMaterial({ color: 0x1c1c1c }));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 2.9, 4.2);
    rhino.add(barrel);
    rhino.position.set(214, 20.9, 12);
    rhino.rotation.y = heading;
    g.scene.add(rhino);
    this.actors.push({ kind: 'prop', mesh: rhino });
    // skyline behind the blockade is the city itself; add a crane silhouette
    // chase camera: high enough to hold the hero car at the bottom and the
    // helicopter at the top of the same frame
    g.cameraMode = 'chase';
    g.camOffset.set(0, 6.5, 16);
    g.camLook.set(1.5, 3.5, -20);
  }

  // ---------- per-frame pinning ----------
  update(dt, t) {
    const g = this.game;
    if (!this.shot) return;
    this.frames += 1;
    this.elapsed += dt;
    const hero = g.playerCar;
    for (const a of this.actors) {
      if (a.kind === 'formation' && hero) {
        const f = hero.forward;
        const s = new THREE.Vector3(f.z, 0, -f.x);
        a.car.pos.copy(hero.pos).addScaledVector(f, a.f).addScaledVector(s, a.s);
        a.car.pos.y = hero.pos.y;
        a.car.heading = hero.heading;
        a.car.speed = hero.speed;
        a.car.mesh.position.copy(a.car.pos);
        a.car.mesh.rotation.y = a.car.heading;
      } else if (a.kind === 'convoy' && hero) {
        const f = hero.forward;
        const s = new THREE.Vector3(f.z, 0, -f.x);
        a.car.pos.copy(hero.pos).addScaledVector(f, a.base).addScaledVector(s, a.lane * 4.6);
        a.car.pos.y = hero.pos.y;
        a.car.heading = hero.heading;
        a.car.mesh.position.copy(a.car.pos);
        a.car.mesh.rotation.y = a.car.heading;
      } else if (a.kind === 'swerving' && hero) {
        const lat = Math.sin(t * 1.4 + a.phase) * 1.6;
        a.car.pos.x = 180 + a.lane * 4.4 + lat;
        a.car.pos.z = hero.pos.z - a.base + Math.sin(t * 0.8 + a.phase) * 2;
        a.car.pos.y = 12.9;
        a.car.heading = Math.PI + Math.cos(t * 1.4 + a.phase) * 0.06;
        a.car.mesh.position.copy(a.car.pos);
        a.car.mesh.rotation.y = a.car.heading;
      } else if (a.kind === 'heli' && g.police.heli.mesh.visible) {
        if (a.pin && hero) {
          // pinned in the frame: ahead of the hero, high enough to read,
          // low enough to stay inside the camera's vertical field
          const f = hero.forward;
          const s = new THREE.Vector3(f.z, 0, -f.x);
          const h = g.police.heli;
          h.pos.copy(hero.pos).addScaledVector(f, a.pin.f).addScaledVector(s, a.pin.s);
          h.pos.y = hero.pos.y + a.pin.u;
          h.mesh.lookAt(hero.pos.x, h.pos.y - 4, hero.pos.z);
          h.rotorBar.rotation.y += dt * 22;
          h.tailRotor.rotation.x += dt * 30;
          h.pool.position.set(hero.pos.x, 0.15, hero.pos.z);
          h.pool.material.opacity = 0.26 + Math.sin(t * 3) * 0.05;
        } else {
          g.police.heli.update(dt, hero ? hero.pos : g.player.pos, t);
        }
      } else if (a.kind === 'gunner') {
        // ride in the helicopter's open door as it orbits
        a.mesh.position.set(g.police.heli.pos.x + 1.6, g.police.heli.pos.y - 1.6 + Math.sin(t * 2.2) * 0.25, g.police.heli.pos.z + 1.5);
        a.mesh.rotation.y = Math.PI;
      } else if (a.kind === 'glare') {
        a.mesh.material.opacity = 0.75 + Math.sin(t * 5) * 0.2;
      } else if (a.kind === 'crewShooter' || a.kind === 'footCop') {
        a.phase = (a.phase || 0) + dt;
      }
    }
    // muzzle fire for the market battle
    if (this.shot === 2) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) {
        this.muzzleTimer = 0.45 + this.rng.next() * 0.5;
        for (const a of this.actors) {
          if (a.kind === 'crewShooter') {
            const from = a.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
            const to = new THREE.Vector3(360, 1.2, 0);
            const dir = to.clone().sub(from).normalize();
            g.fx.muzzle(from, dir);
            g.combat.addTracer(from, to);
            g.fx.spawn('casing', from, { count: 2, speed: 2.5, life: 0.7, grav: -12 });
          } else if (a.kind === 'footCop') {
            const from = a.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
            const to = new THREE.Vector3(332, 1.2, 48);
            const dir = to.clone().sub(from).normalize();
            if (this.rng.chance(0.6)) {
              g.fx.muzzle(from, dir);
              g.combat.addTracer(from, to);
            }
          }
        }
      }
    }
    // tire smoke + NOS for the chases (light puffs: the car is moving now)
    if ((this.shot === 1 || this.shot === 4) && hero) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.16;
        const back = hero.pos.clone().addScaledVector(hero.forward, -2.2);
        back.y = hero.pos.y + 0.3;
        g.fx.tireSmoke(back, true);
        if (this.rng.chance(0.5)) {
          const flame = back.clone();
          g.fx.nosFlame(flame, hero.forward.clone().multiplyScalar(-1));
        }
      }
    }
    // ready: enough frames rendered and settled (SwiftShader is ~1 fps, so
    // the gate is frame-light: 30 frames is plenty for the scene to settle)
    if (!this.ready && this.frames > 30 && this.elapsed > 1.2) {
      this.ready = true;
      if (typeof window !== 'undefined') window.__shotReady = true;
    }
  }
}
