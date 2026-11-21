// Neon Bay — police.js: the NBPD wanted system. Stars climb on crimes and
// cool down when the player stays out of sight. Cruisers chase and ram,
// roadblocks appear at 3 stars, and the helicopter joins at 4 stars.
import * as THREE from 'three';
import { makeCar, CAR_MODELS } from './vehicles.js';

export const POLICE_MODEL = { name: 'NBPD Interceptor', color: 0x1b2a4a, top: 33, accel: 17, grip: 1.05 };

export function createPolice(scene) {
  return {
    wanted: 0,
    heat: 0,
    cooldown: 0,
    cruisers: [],
    roadblocks: [],
    heli: null,
    heliLight: null,
    sirenTimer: 0,
  };
}

export function addWanted(police, stars, reason) {
  police.wanted = Math.max(0, Math.min(5, police.wanted + stars));
  police.heat = Math.min(100, police.heat + stars * 22);
  police.cooldown = 0;
  return reason;
}

export function spawnCruiser(scene, police, pos) {
  const car = makeCar(POLICE_MODEL, { seed: police.cruisers.length * 31 + 3 });
  car.isPolice = true;
  // Black-and-white NBPD livery: white doors on a dark body.
  const doorMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  for (const x of [-1.06, 1.06]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 1.6), doorMat);
    door.position.set(x, 0.66, -0.2);
    car.group.add(door);
  }
  const barMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.5), barMat);
  bar.position.set(0, 1.5, -0.25);
  car.group.add(bar);
  car.group.position.set(pos.x + (Math.random() - 0.5) * 30, 0, pos.z + (Math.random() - 0.5) * 30);
  car.heading = Math.atan2(pos.x - car.group.position.x, pos.z - car.group.position.z);
  car.speed = 10;
  scene.add(car.group);
  police.cruisers.push(car);
  return car;
}

export function spawnRoadblock(scene, police, pos, heading) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xff6b35 });
  const white = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  for (let i = -1; i <= 1; i++) {
    const car = makeCar(POLICE_MODEL, { seed: 100 + i });
    car.isPolice = true;
    car.group.position.set(i * 5, 0, 0);
    car.group.rotation.y = Math.PI / 2;
    group.add(car.group);
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 0.4), i % 2 ? mat : white);
    barrier.position.set(i * 5, 0.45, 2.6);
    group.add(barrier);
  }
  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = heading;
  scene.add(group);
  const block = { group, pos: new THREE.Vector3(pos.x, 0, pos.z) };
  police.roadblocks.push(block);
  return block;
}

export function spawnHelicopter(scene, police, pos) {
  if (police.heli) return police.heli;
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.6, 4.2),
    new THREE.MeshLambertMaterial({ color: 0x1b2a4a }),
  );
  body.castShadow = true;
  group.add(body);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.9, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x9fd8ff }),
  );
  glass.position.set(0, 0.2, 1.6);
  group.add(glass);
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), rotorMat);
  rotor.position.y = 1.1;
  group.add(rotor);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 3.4), new THREE.MeshLambertMaterial({ color: 0x1b2a4a }));
  tail.position.set(0, 0.3, -3.6);
  group.add(tail);
  const spot = new THREE.SpotLight(0xfff2b0, 60, 60, 0.35, 0.5);
  spot.position.set(0, -0.5, 0);
  const target = new THREE.Object3D();
  target.position.set(0, -30, 0);
  group.add(target);
  spot.target = target;
  group.add(spot);
  group.position.set(pos.x + 20, 32, pos.z - 20);
  scene.add(group);
  police.heli = { group, rotor, spot };
  return police.heli;
}

export function updatePolice(scene, police, dt, playerPos, playerSpeed, colliders, audio, maraBonus) {
  // Wanted decay: hide long enough and the heat fades.
  if (police.wanted > 0) {
    police.cooldown += dt;
    const rate = maraBonus ? 2 : 1;
    if (police.cooldown > 14 / rate) {
      police.wanted = Math.max(0, police.wanted - 1);
      police.cooldown = 0;
      police.heat = Math.max(0, police.heat - 25);
    }
  }
  const wantCruisers = police.wanted === 0 ? 0 : police.wanted <= 1 ? 1 : police.wanted <= 2 ? 2 : police.wanted <= 3 ? 3 : 4;
  while (police.cruisers.length < wantCruisers) spawnCruiser(scene, police, playerPos);
  while (police.cruisers.length > wantCruisers) {
    const c = police.cruisers.pop();
    scene.remove(c.group);
  }
  for (const cruiser of police.cruisers) {
    const dx = playerPos.x - cruiser.group.position.x;
    const dz = playerPos.z - cruiser.group.position.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - cruiser.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    cruiser.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    cruiser.speed += ((dist > 8 ? 26 : 14) - cruiser.speed) * Math.min(1, dt * 1.2);
    const nx = cruiser.group.position.x + Math.sin(cruiser.heading) * cruiser.speed * dt;
    const nz = cruiser.group.position.z + Math.cos(cruiser.heading) * cruiser.speed * dt;
    const blocked = colliders.some((c) => nx > c.minX && nx < c.maxX && nz > c.minZ && nz < c.maxZ);
    if (!blocked && Math.abs(nx) < 260 && Math.abs(nz) < 260) {
      cruiser.group.position.x = nx;
      cruiser.group.position.z = nz;
    } else {
      cruiser.heading += Math.PI / 2;
    }
    cruiser.group.rotation.y = cruiser.heading;
    for (const w of cruiser.wheels) w.rotation.x += cruiser.speed * dt * 2.4;
  }
  // Roadblocks at 3+ stars, one ahead of the player on the ring road.
  if (police.wanted >= 3 && police.roadblocks.length === 0) {
    spawnRoadblock(scene, police, { x: playerPos.x + 40, z: playerPos.z }, 0);
  }
  if (police.wanted < 3) {
    for (const b of police.roadblocks) scene.remove(b.group);
    police.roadblocks = [];
  }
  // Helicopter at 4+ stars.
  if (police.wanted >= 4 && !police.heli) spawnHelicopter(scene, police, playerPos);
  if (police.wanted < 4 && police.heli) {
    scene.remove(police.heli.group);
    police.heli = null;
  }
  if (police.heli) {
    const h = police.heli.group;
    h.position.x += (playerPos.x + 14 - h.position.x) * Math.min(1, dt * 0.6);
    h.position.z += (playerPos.z - 10 - h.position.z) * Math.min(1, dt * 0.6);
    h.position.y = 30 + Math.sin(performance.now() * 0.001) * 1.5;
    police.heli.rotor.rotation.y += dt * 22;
    h.lookAt(playerPos.x, h.position.y, playerPos.z);
  }
  police.sirenTimer -= dt;
  if (police.wanted > 0 && police.sirenTimer <= 0) {
    audio.siren();
    police.sirenTimer = 3.2;
  }
  return { cruisers: police.cruisers.length, roadblocks: police.roadblocks.length, heli: !!police.heli };
}
