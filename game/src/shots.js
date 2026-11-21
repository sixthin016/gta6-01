// Neon Bay — shots.js: staged setups for the four screenshots. Each shot
// places the player, cars, police and enemies, sets the wanted level and
// mission, and frames a camera that shows several systems at once —
// the city, the HUD, the minimap, traffic and the chase. The game itself
// stays playable from every staged pose.
import * as THREE from 'three';
import { addWanted, spawnCruiser, spawnHelicopter, spawnRoadblock } from './police.js';
import { spawnSquad } from './combat.js';
import { CAR_MODELS, makeCar } from './vehicles.js';

function placePlayerCar(world, modelName, x, z, heading) {
  const model = CAR_MODELS.find((m) => m.name === modelName) ?? CAR_MODELS[0];
  const car = makeCar(model, { seed: 4242 });
  car.group.position.set(x, 0, z);
  car.heading = heading;
  car.group.rotation.y = heading;
  world.scene.add(car.group);
  world.traffic.push(car);
  world.playerCar = car;
  world.inCar = true;
  car.isPlayer = true;
  world.player.group.visible = false;
  world.player.group.position.set(x, 0, z);
  return car;
}

export const SHOT_DEFS = [
  { n: 1, title: 'Beach chase', wanted: 4, mission: 4, district: 'Coral Beach' },
  { n: 2, title: 'Market battle', wanted: 2, mission: 3, district: 'Mercado District' },
  { n: 3, title: 'Harbor heist', wanted: 3, mission: 15, district: 'Harbor' },
  { n: 4, title: 'Highway escape', wanted: 5, mission: 15, district: 'Highway Loop' },
];

export function applyShot(world, n) {
  const def = SHOT_DEFS.find((s) => s.n === n) ?? SHOT_DEFS[0];
  world.shotMode = true;
  world.storm.secondsLeft = def.n === 3 ? 3600 * 5 : 3600 * 30;
  if (def.n === 1) {
    // Beach chase: player car on the sand, cruisers behind, heli above.
    const car = placePlayerCar(world, 'Comet GT', 10, -205, Math.PI * 0.55);
    car.speed = 22;
    world.camera.position.set(-2, 9, -176);
    world.camera.lookAt(14, 1.5, -210);
    addWanted(world.police, 4, 'shot');
    spawnCruiser(world.scene, world.police, world.player.group.position);
    spawnCruiser(world.scene, world.police, world.player.group.position);
    spawnHelicopter(world.scene, world.police, world.player.group.position);
    world.player.group.position.set(10, 0, -205);
  } else if (def.n === 2) {
    // Market battle: on foot among the stalls, squad ahead, crew beside.
    world.player.group.position.set(-95, 0, -58);
    world.player.group.visible = true;
    world.camera.position.set(-106, 8, -42);
    world.camera.lookAt(-90, 1.2, -62);
    spawnSquad(world.scene, world.combat, -82, -70, 4);
    addWanted(world.police, 2, 'shot');
    spawnCruiser(world.scene, world.police, world.player.group.position);
    world.fx.sparks(new THREE.Vector3(-86, 1.5, -64));
  } else if (def.n === 3) {
    // Harbor heist: crew at the containers, vault truck, storm light.
    world.player.group.position.set(208, 0, 18);
    world.player.group.visible = true;
    world.camera.position.set(196, 6, 38);
    world.camera.lookAt(210, 1.5, 20);
    const truck = makeCar(CAR_MODELS[3], { seed: 777 });
    truck.group.position.set(222, 0, 34);
    truck.heading = Math.PI / 2;
    truck.group.rotation.y = truck.heading;
    world.scene.add(truck.group);
    world.traffic.push(truck);
    spawnSquad(world.scene, world.combat, 228, 8, 3);
    addWanted(world.police, 3, 'shot');
    world.storm.secondsLeft = 3600 * 5;
  } else {
    // Highway escape: 5 stars, roadblock ahead, heli above.
    const car = placePlayerCar(world, 'Vesper S', -180, 90, 0);
    car.speed = 30;
    world.camera.position.set(-176, 12, 55);
    world.camera.lookAt(-182, 2, 125);
    addWanted(world.police, 5, 'shot');
    spawnCruiser(world.scene, world.police, world.player.group.position);
    spawnCruiser(world.scene, world.police, world.player.group.position);
    spawnRoadblock(world.scene, world.police, { x: -180, z: 165 }, 0);
    spawnHelicopter(world.scene, world.police, world.player.group.position);
    world.player.group.position.set(-180, 0, 90);
  }
  world.mission.index = def.mission;
  world.mission.done = false;
  return def;
}
