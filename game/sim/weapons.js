// Neon Bay — weapon wheel + 4 guns. Pistol / SMG / shotgun / sniper with
// distinct damage, fire rate, spread, pellets, range, magazine and
// reload. Click to shoot from the crosshair; tracers; C to take cover
// (cops shoot worse while you are in cover).
import * as THREE from 'three';
import { S } from '../core/state.js';
import { tracerFX, muzzleFX, burst } from '../fx/particles.js';
import { sfx } from '../core/sound.js';
import { damageCar } from './cars.js';
import { damageCop } from './police.js';
import { damageTarget } from './people.js';

export const WEAPONS = [
  { name: 'Pistol', damage: 12, rate: 0.28, spread: 0.012, pellets: 1, range: 60, mag: 12, reload: 1.0, sfx: 'shoot-pistol', color: 0x888888 },
  { name: 'SMG', damage: 8, rate: 0.09, spread: 0.035, pellets: 1, range: 45, mag: 32, reload: 1.3, sfx: 'shoot-smg', color: 0x333333 },
  { name: 'Shotgun', damage: 9, rate: 0.85, spread: 0.09, pellets: 6, range: 26, mag: 6, reload: 1.8, sfx: 'shoot-shotgun', color: 0x6b4a22 },
  { name: 'Sniper', damage: 70, rate: 1.3, spread: 0.001, pellets: 1, range: 140, mag: 5, reload: 2.2, sfx: 'shoot-sniper', color: 0x224422 },
];

let cooldown = 0;
let reloading = 0;
const raycaster = new THREE.Raycaster();

export function weaponName() { return WEAPONS[S.weapon].name; }
export function isReloading() { return reloading > 0; }

export function selectWeapon(i) {
  if (i < 0 || i >= WEAPONS.length) return;
  S.weapon = i;
  reloading = 0;
  sfx('pickup');
}

export function buyAmmo() {
  const w = WEAPONS[S.weapon];
  const cost = 40;
  if (S.cash < cost) return false;
  S.cash -= cost;
  S.reserve[S.weapon] += w.mag * 3;
  sfx('cash');
  return true;
}

export function startReload() {
  const w = WEAPONS[S.weapon];
  if (reloading > 0 || S.ammo[S.weapon] >= w.mag || S.reserve[S.weapon] <= 0) return;
  reloading = w.reload;
  sfx('reload');
}

function finishReload() {
  const w = WEAPONS[S.weapon];
  const need = w.mag - S.ammo[S.weapon];
  const take = Math.min(need, S.reserve[S.weapon]);
  S.ammo[S.weapon] += take;
  S.reserve[S.weapon] -= take;
}

function muzzleWorld() {
  // shoot from the camera (crosshair) so aiming always matches the view
  const dir = new THREE.Vector3();
  S.camera.getWorldDirection(dir);
  const origin = S.camera.position.clone().addScaledVector(dir, 1.2);
  origin.y -= 0.25;
  return { origin, dir };
}

export function tryShoot() {
  if (cooldown > 0 || reloading > 0 || S.paused || !S.started) return false;
  const w = WEAPONS[S.weapon];
  if (S.ammo[S.weapon] <= 0) { startReload(); return false; }
  cooldown = w.rate;
  S.ammo[S.weapon]--;
  S.stats.shots++;
  sfx(w.sfx);
  const { origin, dir } = muzzleWorld();
  muzzleFX(origin, dir);
  let hitAnything = false;
  for (let p = 0; p < w.pellets; p++) {
    const spreadDir = dir.clone();
    spreadDir.x += (Math.random() - 0.5) * w.spread * 2;
    spreadDir.y += (Math.random() - 0.5) * w.spread * 2;
    spreadDir.z += (Math.random() - 0.5) * w.spread * 2;
    spreadDir.normalize();
    raycaster.set(origin, spreadDir);
    raycaster.far = w.range;
    // collect shootable meshes: cops, targets, cars, peds
    const meshes = [];
    for (const c of S.cops) if (c.kind !== 'van') meshes.push(c.mesh);
    for (const t of S.targets) if (t.hp > 0) meshes.push(t.mesh);
    for (const car of S.cars) if (!car.wrecked) meshes.push(car.mesh);
    for (const ped of S.peds) if (ped.hp > 0) meshes.push(ped.mesh);
    const hits = raycaster.intersectObjects(meshes, true);
    let end = origin.clone().addScaledVector(spreadDir, w.range);
    if (hits.length > 0) {
      const h = hits[0];
      end = h.point.clone();
      hitAnything = true;
      S.stats.hits++;
      // resolve which rig was hit by walking up to a registered mesh
      let node = h.object;
      while (node && !meshes.includes(node)) node = node.parent;
      if (node) {
        const cop = S.cops.find((c) => c.mesh === node);
        const target = S.targets.find((t) => t.mesh === node);
        const car = S.cars.find((c) => c.mesh === node);
        const ped = S.peds.find((x) => x.mesh === node);
        if (cop) damageCop(cop, w.damage);
        else if (target) damageTarget(target, w.damage);
        else if (car) damageCar(car, w.damage, true);
        else if (ped) { ped.hp -= w.damage; burst(h.point.x, h.point.y, h.point.z, 5, 3, 0.3, () => [1, 0.2, 0.2]); }
      }
    }
    tracerFX(origin, end);
  }
  if (hitAnything) sfx('hit');
  return true;
}

export function updateWeapons(dt) {
  cooldown = Math.max(0, cooldown - dt);
  if (reloading > 0) {
    reloading -= dt;
    if (reloading <= 0) { reloading = 0; finishReload(); }
  }
}

export function toggleCover() {
  S.player.inCover = !S.player.inCover;
}
