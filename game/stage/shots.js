// The 4 staged scenes — screenshot-first. Each shot is a real render of the game's
// own code: a fixed camera, staged actors, and a mid-progress HUD state.
// Rules baked in: facades first, front view cone, golden hour only, no black blocks,
// heli big-and-functional (shots 1, 2, 4), hero car saturated glossy, identical HUD anchors.
import * as THREE from 'three';
import { makeCar, makeHeli, makeNosFlame, spawnTraffic } from '../sim/cars.js';
import { makePed, makeShooter, makeKneelingCop, makeDriverWithPhone, spawnPeds, SHIRTS } from '../sim/people.js';
import { makeRoadblock, makeRhino, makeRappelTeam } from '../sim/police.js';
import { makeTireSmoke, makeDebris, makeFlashbang, makeLaserGrid } from '../fx/particles.js';
import { gpsTexture, watchTexture, laptopTexture, heliHudTexture, barrierTexture, rackTexture } from '../city/textures.js';
import { makeGunModel, makeMuzzleFlash, makeShells, makeTracer } from '../sim/weapons.js';

export const SHOT_NAMES = ['1-beach-chase', '2-market-battle', '3-heist', '4-highway-escape'];

// HUD state per shot: mission index, money, wanted, crew health, speed, minimap route.
export const SHOT_HUD = [
  { mission: 4, money: 5240, wanted: 4, health: [100, 100, 100], speed: 128, route: 0.12, weapon: 1 },
  { mission: 5, money: 5890, wanted: 5, health: [78, 92, 100], speed: 0, route: 0.45, weapon: 1 },
  { mission: 6, money: 9600, wanted: 5, health: [78, 92, 100], speed: 0, route: 0.68, weapon: 3 },
  { mission: 7, money: 12450, wanted: 5, health: [88, 92, 100], speed: 142, route: 0.9, weapon: 1 },
];

function applyHud(state, hud, n) {
  const s = SHOT_HUD[n - 1];
  state.missionIndex = s.mission;
  state.money = s.money;
  state.wanted = s.wanted;
  state.speedKmh = s.speed;
  state.minimapRoute = s.route;
  state.weaponIndex = s.weapon;
  state.crew.forEach((c, i) => { c.health = s.health[i]; });
  hud.render();
}

function clearGroup(scene, name) {
  const old = scene.getObjectByName(name);
  if (old) scene.remove(old);
  const g = new THREE.Group();
  g.name = name;
  scene.add(g);
  return g;
}

function openTopCar(car) {
  // Convertible hero car: drop the dark cabin so the driver + phone read.
  car.traverse((o) => { if (o.isMesh && o.position.y > 1.1 && o.geometry && o.geometry.parameters && o.geometry.parameters.height === 0.55) o.visible = false; });
  return car;
}

// --- SHOT 1 — BEACH CHASE ----------------------------------------------------
function shot1(stage, state) {
  // Clear palms out of the camera corridor so no trunk blocks the chase axis.
  const island = stage.parent ? stage.parent.getObjectByName('island') : null;
  if (island) {
    island.traverse((o) => {
      if (o.name === 'palm' && o.position.x > -75 && o.position.x < 30 && o.position.z > 188 && o.position.z < 206) o.visible = false;
    });
  }
  // Hero car: saturated coral-red, counter-steer 15°, NOS flame, driver + GPS phone.
  const hero = makeCar({ color: 0xff2e4d });
  openTopCar(hero);
  hero.position.set(6, 0, 200);
  hero.rotation.y = -Math.PI / 2 + 0.26; // heading west, counter-steer 15°
  stage.add(hero);
  const driver = makeDriverWithPhone(gpsTexture());
  driver.position.set(6.2, 0.15, 200.4);
  driver.rotation.y = -Math.PI / 2;
  driver.scale.setScalar(0.9);
  stage.add(driver);
  const nos = makeNosFlame();
  nos.position.set(6, 0, 200); nos.rotation.y = -Math.PI / 2 + 0.26;
  stage.add(nos);
  stage.add(makeTireSmoke(new THREE.Vector3(6, 0, 200), new THREE.Vector3(-1, 0, 0)));
  stage.add(makeDebris(stage, new THREE.Vector3(-2, 0, 200), 11));
  // 3 BCPD cruisers in PIT formation — pulling alongside the hero's FRONT
  // quarter, so the chase cam behind the hero stays clear of them.
  // White cruisers (never black blocks); tight on the hero so the chase reads.
  const pit = [
    { x: 3.5, z: 197.6, ry: -Math.PI / 2 + 0.45 },
    { x: 2.0, z: 202.8, ry: -Math.PI / 2 - 0.35 },
    { x: 0.0, z: 199.5, ry: -Math.PI / 2 + 0.1 },
  ];
  pit.forEach((p) => {
    const c = makeCar({ color: 0xf0f0f0, police: true });
    c.position.set(p.x, 0, p.z); c.rotation.y = p.ry;
    stage.add(c);
  });
  // Traffic ahead in the front cone — 8 colored cars, 3 lanes, closer in.
  spawnTraffic(stage, 101, 8, { x: -18, z: 200 }, { x: -1, z: 0 }, 9);
  // Pedestrians on the near sidewalk.
  spawnPeds(stage, 201, 8, { x: -14, z: 207.5 }, { x: -1, z: 0 }, 7);
  spawnPeds(stage, 202, 4, { x: -20, z: 192.5 }, { x: -1, z: 0 }, 9);
  // Roadblock mid-distance.
  const rb = makeRoadblock();
  rb.position.set(-55, 0, 200); rb.rotation.y = Math.PI / 2;
  stage.add(rb);
  // Heli, upper third, BIG — rotor blur disc + searchlight cone on the road.
  const heli = makeHeli({});
  heli.scale.setScalar(1.5);
  heli.position.set(-16, 15, 190);
  heli.rotation.y = 0.5;
  stage.add(heli);
  return { cam: new THREE.Vector3(13, 3.0, 202.5), look: new THREE.Vector3(-30, 2, 198.5) };
}

// --- SHOT 2 — ON-FOOT MARKET BATTLE (3 depth planes) --------------------------
function shot2(stage, state) {
  // FOREGROUND: concrete barrier — 7 bullet holes + 2 blood splats + overturned cart.
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.3, 0.5),
    new THREE.MeshStandardMaterial({ map: barrierTexture(), roughness: 0.9 }));
  barrier.position.set(-96, 0.65, 47); barrier.rotation.y = 0.12; barrier.castShadow = true;
  stage.add(barrier);
  const cart = new THREE.Group();
  const cartBox = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xd94f30, roughness: 0.8 }));
  const cartWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x222222 }));
  cartWheel.rotation.x = Math.PI / 2; cartWheel.position.set(0.8, 0.3, 0.8);
  cart.add(cartBox, cartWheel);
  cart.position.set(-92.5, 0.5, 47.5); cart.rotation.set(0.4, 0.7, 1.35);
  stage.add(cart);
  // MID: player crouched + 2 crew firing — muzzle flash, 6 shells in the air.
  const player = makeShooter({ shirt: 0x2ee6ff, pants: 0x2a3a5a, skin: 0xc98d5f });
  player.position.set(-95.2, 0, 48.6); player.rotation.y = Math.PI;
  stage.add(player);
  const mara = makeShooter({ shirt: 0xff5e8a, pants: 0x2a3a5a, skin: 0xe8b98a });
  mara.position.set(-97.8, 0, 48.8); mara.rotation.y = Math.PI + 0.2;
  stage.add(mara);
  const reyes = makeShooter({ shirt: 0xffb03c, pants: 0x2a3a5a, skin: 0xa9713f });
  reyes.position.set(-93.0, 0, 49.0); reyes.rotation.y = Math.PI - 0.25;
  stage.add(reyes);
  // smartwatch on the player's wrist — diegetic ★★★★★
  const watch = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3),
    new THREE.MeshBasicMaterial({ map: watchTexture() }));
  watch.position.set(-95.6, 1.05, 49.3); watch.rotation.set(-0.4, 0.3, 0);
  stage.add(watch);
  // guns + flashes + shells + tracers
  [[-95.2, 48.6], [-97.8, 48.8], [-93.0, 49.0]].forEach(([x, z], i) => {
    const gun = makeGunModel(i === 0 ? 1 : i);
    gun.position.set(x, 1.05, z - 0.55); gun.rotation.x = -0.15;
    stage.add(gun);
    const flash = makeMuzzleFlash();
    flash.position.set(x, 1.1, z - 1.1); flash.visible = true; flash.rotation.y = 0.4;
    stage.add(flash);
    stage.add(makeTracer(new THREE.Vector3(x, 1.1, z - 1), new THREE.Vector3(x + (i - 1) * 3, 1.2, z - 14)));
  });
  makeShells(stage, new THREE.Vector3(-95.5, 0.6, 48.5));
  // BACKGROUND: 5 police bounding overwatch — 2 kneeling, 3 moving + rappel team + heli.
  const cops = [
    { x: -99, z: 34, kneel: true }, { x: -93, z: 32, kneel: true },
    { x: -97, z: 28, kneel: false }, { x: -91, z: 26, kneel: false }, { x: -100, z: 24, kneel: false },
  ];
  cops.forEach((c) => {
    const cop = c.kneel ? makeKneelingCop() : makePed({ shirt: 0x4a6a8a, pants: 0x2a343e, skin: 0x8a5a34, hat: 0xd8dce2 });
    cop.position.set(c.x, 0, c.z); cop.rotation.y = 0;
    stage.add(cop);
    if (!c.kneel) {
      const gun = makeGunModel(1);
      gun.position.set(c.x, 1.1, c.z + 0.4);
      stage.add(gun);
    }
  });
  const heli = makeHeli({});
  heli.scale.setScalar(1.4);
  heli.position.set(-97, 18, 16);
  stage.add(heli);
  makeRappelTeam(stage, -97, 18, 16);
  // Market dressing in the frame: kiosks + peds scattering.
  spawnPeds(stage, 301, 6, { x: -110, z: 52 }, { x: 1, z: 0 }, 6);
  return { cam: new THREE.Vector3(-95.5, 3.2, 58), look: new THREE.Vector3(-96, 1.2, 26) };
}

// --- SHOT 3 — INTERIOR HEIST --------------------------------------------------
function shot3(stage, state) {
  // Server room: floor, 7 m walls, ceiling + hanging lights — a real interior,
  // so no skyline shows over the walls.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 13),
    new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.85, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0);
  stage.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.9 });
  // back wall split: garage-door gap at x 3.4..7.6, in the camera's view.
  const backL = new THREE.Mesh(new THREE.BoxGeometry(12.4, 9, 0.4), wallMat);
  backL.position.set(-2.8, 4.5, -6.5);
  const backR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 9, 0.4), wallMat);
  backR.position.set(8.3, 4.5, -6.5);
  // left wall split: a 4.2 m garage-door gap at z -5.1..-0.9 (second exit, dark).
  const leftA = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 1.4), wallMat);
  leftA.position.set(-9, 4.5, -5.8);
  const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 7.4), wallMat);
  leftB.position.set(-9, 4.5, 2.8);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 13), wallMat);
  right.position.set(9, 4.5, 0);
  stage.add(backL, backR, leftA, leftB, right);
  // ceiling + hanging light bars
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18, 13),
    new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 8.5, 0);
  stage.add(ceil);
  [-4, 3].forEach((x) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffe9b8 }));
    bar.position.set(x, 8.2, 0);
    stage.add(bar);
  });
  // Lintels above both door gaps, so no skyline shows over the door.
  const lintelBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.6, 0.4), wallMat);
  lintelBack.position.set(5.5, 6.2, -6.5);
  const lintelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.6, 4.2), wallMat);
  lintelLeft.position.set(-9, 6.2, -3);
  stage.add(lintelBack, lintelLeft);
  // server racks along the back wall (left of the door)
  for (let i = 0; i < 4; i++) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.4, 0.9),
      new THREE.MeshStandardMaterial({ map: rackTexture(i === 1), roughness: 0.5, metalness: 0.4 }));
    rack.position.set(-6.8 + i * 2.4, 1.7, -5.9);
    stage.add(rack);
  }
  // crate + laptop: the screen IS the hacking UI (3/4 nodes, timer 0:47).
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.9 }));
  crate.position.set(-1.2, 0.45, -1.2);
  stage.add(crate);
  const laptop = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94),
    new THREE.MeshBasicMaterial({ map: laptopTexture() }));
  laptop.position.set(-1.2, 1.05, -1.35); laptop.rotation.set(-0.5, 0.15, 0);
  stage.add(laptop);
  // laser grid — 8 beams across the room
  const lasers = makeLaserGrid(9, 3, 0.4);
  lasers.position.set(0, 0, 1.5);
  stage.add(lasers);
  // crew at stations: hacker at laptop, gunner covering the door.
  const hacker = makePed({ shirt: 0xff5e8a, pants: 0x2a3a5a, skin: 0xe8b98a });
  hacker.position.set(-1.2, 0, -0.2); hacker.rotation.y = Math.PI;
  hacker.scale.setScalar(0.92);
  stage.add(hacker);
  const gunner = makeShooter({ shirt: 0xffb03c, pants: 0x2a3a5a, skin: 0xa9713f });
  gunner.position.set(4.5, 0, -1.5); gunner.rotation.y = -Math.PI / 2;
  stage.add(gunner);
  const gflash = makeMuzzleFlash();
  gflash.position.set(3.0, 1.1, -1.5); gflash.visible = true;
  stage.add(gflash);
  // open garage door (back-wall gap) + getaway car outside, driver at the wheel.
  const door = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.7 }));
  door.position.set(3.2, 1.7, -6.4); door.rotation.y = 0.9;
  stage.add(door);
  const getaway = makeCar({ color: 0x2ee6ff });
  getaway.position.set(5.5, 0, -11); getaway.rotation.y = Math.PI;
  stage.add(getaway);
  const jax = makeDriverWithPhone(gpsTexture());
  jax.position.set(5.5, 0.15, -10.6); jax.rotation.y = Math.PI;
  jax.scale.setScalar(0.9);
  stage.add(jax);
  // 2 broken windows on the back wall + small flashbang glare by the right one.
  const winMat = new THREE.MeshStandardMaterial({ color: 0x0c1420, roughness: 0.2, metalness: 0.6, emissive: 0xff9a5a, emissiveIntensity: 0.9 });
  [[-7, 3.8], [0.5, 3.8]].forEach(([x, y]) => {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), winMat);
    win.position.set(x, y, -6.28);
    stage.add(win);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    crack.position.set(x, y, -6.26); crack.rotation.z = 0.5;
    stage.add(crack);
  });
  const fb = makeFlashbang(6.0, 2.0, -5.6);
  stage.add(fb);
  // warm practical lights
  const warm = new THREE.PointLight(0xffb36b, 60, 18);
  warm.position.set(0, 4, 0);
  stage.add(warm);
  const cool = new THREE.PointLight(0x2ee6ff, 25, 12);
  cool.position.set(-1.2, 2.5, -2);
  stage.add(cool);
  return { cam: new THREE.Vector3(5.8, 2.0, 5.2), look: new THREE.Vector3(-0.5, 1.4, -4.5) };
}

// --- SHOT 4 — STACKED HIGHWAY ESCAPE ------------------------------------------
function shot4(stage, state) {
  // Lower deck: hero car + 6 civilian cars swerving (3 lanes).
  const hero = makeCar({ color: 0xff2e4d });
  openTopCar(hero);
  hero.position.set(8, 0, -80);
  hero.rotation.y = -Math.PI / 2 - 0.12; // heading west, away from camera
  stage.add(hero);
  const nos = makeNosFlame();
  nos.position.set(8, 0, -80); nos.rotation.y = -Math.PI / 2 - 0.12;
  stage.add(nos);
  stage.add(makeTireSmoke(new THREE.Vector3(8, 0, -80), new THREE.Vector3(-1, 0, 0)));
  // Lower-deck police ahead: 2 cruisers + spike strip blocking the hero's lane.
  const lowRb = makeRoadblock();
  lowRb.position.set(-22, 0, -80); lowRb.rotation.y = Math.PI / 2;
  stage.add(lowRb);
  // Clear island towers that would clip through the highway corridor.
  const island = stage.parent ? stage.parent.getObjectByName('island') : null;
  if (island) {
    island.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.type === 'BoxGeometry') {
        const p = o.geometry.parameters;
        if (p && p.height > 15 && o.position.z > -115 && o.position.z < -55 && o.position.x > -95 && o.position.x < 75) o.visible = false;
      }
    });
  }
  spawnTraffic(stage, 401, 6, { x: -52, z: -80 }, { x: -1, z: 0 }, 12);
  // Upper deck slab + pillars + under-slab beams + hazard stripe on the front edge.
  const slab = new THREE.Mesh(new THREE.BoxGeometry(150, 1.2, 14),
    new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.8 }));
  slab.position.set(-10, 8.6, -80);
  stage.add(slab);
  const hazard = new THREE.Mesh(new THREE.BoxGeometry(150, 0.35, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffd75e }));
  hazard.position.set(-10, 8.0, -72.9);
  stage.add(hazard);
  for (let x = -70; x <= 50; x += 24) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x4a4f58, roughness: 0.85 }));
    pillar.position.set(x, 4.3, -74);
    stage.add(pillar);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 14),
      new THREE.MeshStandardMaterial({ color: 0x2e323a, roughness: 0.85 }));
    beam.position.set(x, 7.5, -80);
    stage.add(beam);
  }
  // Upper-deck blockade: spike strip, 4 cruisers, 1 Rhino tank.
  const rb = makeRoadblock();
  rb.position.set(-34, 9.2, -80); rb.rotation.y = Math.PI / 2;
  stage.add(rb);
  const rhino = makeRhino();
  rhino.position.set(-46, 9.2, -80); rhino.rotation.y = Math.PI / 2;
  stage.add(rhino);
  // Bell 412 center: rotor blur, open door + gunner, cockpit HUD through the door.
  const heli = makeHeli({ gunner: true, doorOpen: true });
  heli.scale.setScalar(1.5);
  heli.position.set(-6, 20, -68);
  heli.rotation.y = 0.35;
  stage.add(heli);
  const cockpit = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.75),
    new THREE.MeshBasicMaterial({ map: heliHudTexture() }));
  cockpit.position.set(-4.6, 19.4, -66.2); cockpit.rotation.y = 0.35;
  stage.add(cockpit);
  // Skyline backdrop: 12+ lit towers + crane + billboard (downtown behind the highway).
  for (let i = 0; i < 12; i++) {
    const h = 26 + (i % 5) * 12;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(14, h, 14),
      new THREE.MeshStandardMaterial({
        color: [0x3a3f5a, 0x5a3a4a, 0x2a4a5a, 0x4a3a5a][i % 4],
        roughness: 0.8, emissive: 0xffb36b, emissiveIntensity: 0.12,
      }));
    tower.position.set(-120 + i * 22, h / 2, -150 - (i % 3) * 14);
    stage.add(tower);
    // lit window strip
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(12, h * 0.7),
      new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.35 }));
    strip.position.set(-120 + i * 22, h / 2 + 2, -150 - (i % 3) * 14 + 7.1);
    stage.add(strip);
  }
  // tower crane
  const crane = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.6, 42, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xffd75e }));
  mast.position.y = 21;
  const jib = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xffd75e }));
  jib.position.set(8, 40, 0);
  crane.add(mast, jib);
  crane.position.set(-80, 0, -150);
  stage.add(crane);
  return { cam: new THREE.Vector3(30, 8, -62), look: new THREE.Vector3(-10, 3, -84) };
}

const SHOTS = [shot1, shot2, shot3, shot4];

export function stageShot(n, scene, camera, state, hud) {
  const stage = clearGroup(scene, 'stage');
  const { cam, look } = SHOTS[n - 1](stage, state);
  camera.position.copy(cam);
  camera.lookAt(look);
  camera.updateProjectionMatrix();
  applyHud(state, hud, n);
  return { cam, look };
}
