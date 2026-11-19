// Neon Bay — Bay City PD (BCPD): 5-star escalation. 1–2 stars: patrol
// cars chase. 3 stars: roadblocks. 4 stars: Air One helicopter (mesh,
// rotor, spotlight — blocks wanted decay). 5 stars: SWAT van + 2 SWAT
// cops. Wanted decays when hidden; busted/wasted costs cash + respect.
import * as THREE from 'three';
import { S, setWanted, addRespect, addCash } from '../core/state.js';
import { makeCar, damageCar } from './cars.js';
import { makeHumanoid } from './people.js';
import { tracerFX, burst } from '../fx/particles.js';
import { sfx, startRotor, stopRotor } from '../core/sound.js';

function policeLivery(car) {
  const bar = new THREE.Group();
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  red.position.x = -0.28;
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2255ff }));
  blue.position.x = 0.28;
  bar.add(red); bar.add(blue);
  bar.position.set(0, 1.55, -0.25);
  car.mesh.add(bar);
  car.lightbar = bar;
}

export function spawnCopCar(x, z) {
  const car = makeCar(0xe8e8e8, x, z, 0);
  car.isCop = true;
  car.cruise = 20;
  policeLivery(car);
  const cop = { kind: 'car', mesh: car.mesh, car, hp: 100, shootT: 0, ramT: 0 };
  S.cops.push(cop);
  return cop;
}

export function spawnFootCop(x, z, swat = false) {
  const mesh = makeHumanoid(swat ? 0x1a1d22 : 0x2244aa, 0x1a1d22);
  mesh.position.set(x, 0, z);
  S.scene.add(mesh);
  const cop = { kind: 'foot', mesh, hp: swat ? 60 : 40, shootT: Math.random(), swat, speed: swat ? 6 : 5 };
  S.cops.push(cop);
  return cop;
}

export function damageCop(cop, dmg) {
  cop.hp -= dmg;
  if (cop.hp > 0) return;
  if (cop.kind === 'car') {
    damageCar(cop.car, 200, true);
  } else {
    burst(cop.mesh.position.x, 1.2, cop.mesh.position.z, 10, 4, 0.5, () => [0.2, 0.2, 0.6]);
    cop.mesh.rotation.x = -Math.PI / 2;
    cop.dead = true;
  }
  S.cops = S.cops.filter((c) => c !== cop || c.kind === 'car');
  if (cop.kind === 'foot') S.scene.remove(cop.mesh);
}

function spawnRoadblock() {
  const p = S.player.pos;
  const ahead = p.clone().add(new THREE.Vector3(Math.sin(S.player.heading), 0, Math.cos(S.player.heading)).multiplyScalar(34));
  ahead.x = Math.round(ahead.x / 40) * 40;
  ahead.z = Math.round(ahead.z / 40) * 40;
  const c1 = makeCar(0xe8e8e8, ahead.x - 3, ahead.z, Math.PI / 2);
  const c2 = makeCar(0xe8e8e8, ahead.x + 3, ahead.z, Math.PI / 2);
  c1.isCop = true; c2.isCop = true;
  policeLivery(c1); policeLivery(c2);
  const rb = { cars: [c1, c2], pos: ahead.clone(), t: 0 };
  S.roadblocks.push(rb);
  return rb;
}

function spawnHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 4.6),
    new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.4, metalness: 0.5 }));
  body.position.y = 0;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.4, metalness: 0.5 }));
  tail.position.set(0, 0.3, -3.6);
  g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
  rotor.position.y = 1.0;
  g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x222222 }));
  tailRotor.position.set(0, 0.4, -5.1);
  g.add(tailRotor);
  const spot = new THREE.Mesh(new THREE.ConeGeometry(4.5, 30, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  spot.position.y = -15;
  spot.rotation.x = Math.PI;
  g.add(spot);
  const label = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  label.position.set(0, 0, 2.35);
  g.add(label);
  S.scene.add(g);
  S.heli = { mesh: g, rotor, angle: 0, spot };
  startRotor();
  return S.heli;
}

function spawnSwatVan() {
  const g = new THREE.Group();
  const van = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.5, metalness: 0.4 }));
  van.position.y = 1.5;
  g.add(van);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.4, 6.05),
    new THREE.MeshBasicMaterial({ color: 0x2255ff }));
  stripe.position.y = 1.5;
  g.add(stripe);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [[-1.2, 2], [1.2, 2], [-1.2, -2], [1.2, -2]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.45, z);
    g.add(w);
  }
  const p = S.player.pos;
  g.position.set(p.x + 26, 0, p.z + 10);
  S.scene.add(g);
  const vanCop = { kind: 'van', mesh: g, hp: 150, speed: 17, heading: 0, shootT: 0 };
  S.cops.push(vanCop);
  spawnFootCop(p.x + 22, p.z + 8, true);
  spawnFootCop(p.x + 24, p.z + 12, true);
  return vanCop;
}

function clearHeli() {
  if (!S.heli) return;
  S.scene.remove(S.heli.mesh);
  S.heli = null;
  stopRotor();
}

export function clearPolice() {
  for (const c of S.cops) {
    if (c.kind === 'car') { S.scene.remove(c.car.mesh); S.cars = S.cars.filter((x) => x !== c.car); }
    else S.scene.remove(c.mesh);
  }
  S.cops = [];
  for (const rb of S.roadblocks) for (const c of rb.cars) { S.scene.remove(c.mesh); S.cars = S.cars.filter((x) => x !== c); }
  S.roadblocks = [];
  clearHeli();
}

// Staged chase: two patrol cars + a roadblock + the heli, on demand
// (used by the cover-shot staging so the frame is dense immediately).
export function forceChase() {
  const p = S.player.pos;
  spawnCopCar(p.x + 34, p.z + 18);
  spawnCopCar(p.x - 28, p.z + 30);
  spawnRoadblock();
  if (!S.heli) spawnHeli();
}

function bustedOrWasted(kind) {
  addCash(-100);
  addRespect(-5);
  setWanted(0);
  clearPolice();
  S.player.hp = 100;
  S.player.pos.set(0, 0, 24);
  if (S.player.car) { S.player.car.isPlayer = false; S.player.car = null; }
  S.player.onFoot = true;
  if (S.playerMesh) S.playerMesh.position.copy(S.player.pos);
  sfx('busted');
  if (S.mission) S.mission.failed = kind;
}

function copShoot(cop, dt) {
  cop.shootT -= dt;
  const p = S.player.pos;
  const dist = cop.mesh.position.distanceTo(p);
  if (dist > 34 || cop.shootT > 0) return;
  cop.shootT = 1.4 + Math.random() * 0.6;
  const from = cop.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
  const to = p.clone().add(new THREE.Vector3(0, 1.2, 0));
  tracerFX(from, to);
  sfx('shoot-pistol');
  let hitChance = 0.22;
  if (S.player.inCover) hitChance = 0.08;
  if (!S.player.onFoot) hitChance *= 0.7;
  if (S.player.speed > 6) hitChance *= 0.6;
  if (Math.random() < hitChance) {
    const dmg = 6;
    if (S.armor > 0) { S.armor = Math.max(0, S.armor - dmg); }
    else S.player.hp -= dmg;
    if (S.player.hp <= 0) bustedOrWasted('wasted');
  }
}

export function updatePolice(dt) {
  const stars = Math.ceil(S.wanted - 0.001);
  const p = S.player.pos;
  // --- spawn to match stars
  const patrolWant = stars >= 1 ? Math.min(2, stars) : 0;
  const patrolHave = S.cops.filter((c) => c.kind === 'car').length;
  if (patrolHave < patrolWant && Math.random() < dt * 0.8) {
    const a = Math.random() * Math.PI * 2;
    spawnCopCar(p.x + Math.cos(a) * 55, p.z + Math.sin(a) * 55);
  }
  if (stars >= 3 && S.roadblocks.length < 2 && Math.random() < dt * 0.25) spawnRoadblock();
  if (stars >= 4 && !S.heli) spawnHeli();
  if (stars < 4 && S.heli) clearHeli();
  if (stars >= 5 && !S.cops.some((c) => c.kind === 'van') && Math.random() < dt * 0.5) spawnSwatVan();
  if (stars < 3) {
    for (const rb of S.roadblocks) for (const c of rb.cars) { S.scene.remove(c.mesh); S.cars = S.cars.filter((x) => x !== c); }
    S.roadblocks = [];
  }
  // --- move cop cars: chase the player, ram on contact
  for (const cop of S.cops) {
    if (cop.kind === 'car') {
      const car = cop.car;
      if (car.wrecked) continue;
      const d = p.clone().sub(car.mesh.position); d.y = 0;
      const dist = d.length();
      if (dist > 130) { // too far: respawn closer
        const a = Math.random() * Math.PI * 2;
        car.mesh.position.set(p.x + Math.cos(a) * 55, 0, p.z + Math.sin(a) * 55);
        continue;
      }
      const want = Math.atan2(d.x, d.z);
      let diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += THREE.MathUtils.clamp(diff, -2.2 * dt, 2.2 * dt);
      const targetSpeed = dist > 8 ? 24 + stars : 8;
      car.speed += THREE.MathUtils.clamp(targetSpeed - car.speed, -18 * dt, 10 * dt);
      car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
      car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
      car.mesh.rotation.y = car.heading;
      // lightbar flash
      if (car.lightbar) car.lightbar.visible = Math.sin(S.time * 10) > -0.2;
      if (dist < 3.6) {
        cop.ramT -= dt;
        if (cop.ramT <= 0) {
          cop.ramT = 1.2;
          if (S.player.onFoot) {
            S.player.hp -= 12;
            if (S.player.hp <= 0) bustedOrWasted('wasted');
          } else if (S.player.car) {
            S.player.car.hp -= 10;
            S.player.car.speed *= 0.7;
            burst(p.x, 1, p.z, 8, 5, 0.4, () => [1, 0.8, 0.3]);
          }
          if (Math.random() < 0.3) sfx('siren');
        }
      }
      // busted: cop car pins the player on foot
      if (S.player.onFoot && dist < 2.6) {
        cop.pinT = (cop.pinT || 0) + dt;
        if (cop.pinT > 1.5) bustedOrWasted('busted');
      } else cop.pinT = 0;
    } else if (cop.kind === 'foot') {
      if (cop.dead) continue;
      const d = p.clone().sub(cop.mesh.position); d.y = 0;
      const dist = d.length();
      if (dist > 4) {
        d.normalize();
        cop.mesh.position.addScaledVector(d, cop.speed * dt);
        cop.mesh.rotation.y = Math.atan2(d.x, d.z);
        const sw = Math.sin(S.time * 9) * 0.4;
        cop.mesh.userData.legL.rotation.x = sw;
        cop.mesh.userData.legR.rotation.x = -sw;
      }
      copShoot(cop, dt);
    } else if (cop.kind === 'van') {
      const d = p.clone().sub(cop.mesh.position); d.y = 0;
      const dist = d.length();
      if (dist > 130) { cop.mesh.position.set(p.x + 26, 0, p.z + 10); continue; }
      const want = Math.atan2(d.x, d.z);
      let diff = want - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.heading += THREE.MathUtils.clamp(diff, -1.8 * dt, 1.8 * dt);
      cop.mesh.position.x += Math.sin(cop.heading) * Math.min(cop.speed, dist > 10 ? cop.speed : 4) * dt;
      cop.mesh.position.z += Math.cos(cop.heading) * Math.min(cop.speed, dist > 10 ? cop.speed : 4) * dt;
      cop.mesh.rotation.y = cop.heading;
    }
  }
  // --- heli circles the player, spotlight on them, blocks decay
  if (S.heli) {
    const h = S.heli;
    h.angle += dt * 0.45;
    h.mesh.position.set(
      p.x + Math.cos(h.angle) * 20,
      20 + Math.sin(S.time * 0.7) * 1.5,
      p.z + Math.sin(h.angle) * 20
    );
    h.mesh.rotation.y = Math.atan2(p.x - h.mesh.position.x, p.z - h.mesh.position.z);
    h.rotor.rotation.y += dt * 22;
    h.spot.lookAt(p.x, 0, p.z);
  }
  // --- wanted decay when hidden (no cop near, no heli)
  const nearestCop = S.cops.reduce((m, c) => Math.min(m, c.mesh.position.distanceTo(p)), 999);
  if (S.wanted > 0 && !S.heli && nearestCop > 42) {
    setWanted(S.wanted - dt * 0.14);
  }
  // prune wrecked cop cars
  S.cops = S.cops.filter((c) => !(c.kind === 'car' && c.car.wrecked));
}
