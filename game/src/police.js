// police.js — the NBPD wanted system. Five stars, escalating response:
// 1 star: a patrol car tails you. 2: two cruisers, they ram. 3: the
// helicopter "Air One" joins and circles overhead. 4: roadblocks go up
// ahead of you on the road you are on. 5: everything at once, faster,
// and the city locks down. Heat cools when you break line of sight and
// stay out of trouble; hiding in the safehouse garage clears it fast.
import * as THREE from 'three';
import { clamp } from './rng.js';
import { makeCarMesh, CAR_KINDS } from './vehicles.js';
import { nearestRoadCoord } from './city.js';

const STAR_NAMES = ['Clean', 'Suspect', 'Fleeing', 'Dangerous', 'Armed & Dangerous', 'City Lockdown'];

export class WantedSystem {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.level = 0;
    this.heat = 0; // 0..100, fills the next star
    this.coolTimer = 0;
    this.policeCars = [];
    this.roadblocks = [];
    this.roadblockTimer = 0;
    this.heli = null;
    this.heliAngle = 0;
    this.lastCrimeAt = 0;
    this.onLevelChange = null;
    this._spawnTimer = 0;
  }

  get label() { return STAR_NAMES[this.level]; }

  // Fraction (0..1) toward the next star — drives the HUD heat bar.
  wantedProgress() { return clamp(this.heat / 100, 0, 1); }

  // NBPD dispatch chatter lines, cycled by the HUD feed.
  static dispatchLine(level) {
    const lines = {
      1: ['NBPD: unit 12, check the beach road.', 'Dispatch: suspect on foot, keep visual.'],
      2: ['NBPD: two units converging.', 'Dispatch: suspect vehicle, last seen downtown.'],
      3: ['NBPD: Air One is up, maintain the cordon.', 'Dispatch: helicopter has the suspect.'],
      4: ['NBPD: roadblocks on all arterials.', 'Dispatch: spike strips authorised.'],
      5: ['NBPD: CITY LOCKDOWN. All units respond.', 'Dispatch: do not let the suspect reach the bridge.'],
    };
    const list = lines[level] || lines[1];
    return list[Math.floor(Math.random() * list.length)];
  }

  addHeat(amount, reason) {
    if (this.level >= 5 && this.heat >= 100) return;
    this.heat += amount;
    this.lastCrimeAt = performance.now();
    while (this.heat >= 100 && this.level < 5) {
      this.heat -= 100;
      this.setLevel(this.level + 1);
    }
    if (reason && this.onLevelChange) this.onLevelChange(this.level, reason);
  }

  setLevel(n) {
    n = clamp(n, 0, 5);
    if (n === this.level) return;
    this.level = n;
    if (this.onLevelChange) this.onLevelChange(n, n > 0 ? 'wanted' : 'clear');
  }

  clear() {
    this.level = 0;
    this.heat = 0;
    this.despawnAll();
  }

  // Spawn a cruiser on the nearest road, just out of sight of the player.
  spawnCruiser(px, pz) {
    const mesh = makeCarMesh('police', 0x111111);
    const road = nearestRoadCoord(px);
    const along = pz + (Math.random() < 0.5 ? -60 : 60);
    mesh.position.set(road + 3, 0, along);
    this.scene.add(mesh);
    const car = { mesh, speed: 0, heading: along > pz ? Math.PI : 0, ramTimer: 0 };
    mesh.rotation.y = car.heading;
    this.policeCars.push(car);
    return car;
  }

  spawnHeli() {
    if (this.heli) return;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 1.8), new THREE.MeshLambertMaterial({ color: 0x1a1a2e }));
    body.position.y = 0;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x1a1a2e }));
    tail.position.set(-3.6, 0.2, 0);
    g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: 0x888888 }));
    rotor.position.y = 1.0;
    g.add(rotor);
    const spot = new THREE.Mesh(new THREE.ConeGeometry(2.2, 12, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6b0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
    spot.position.y = -6;
    spot.rotation.x = Math.PI;
    g.add(spot);
    g.userData = { rotor };
    this.scene.add(g);
    this.heli = g;
  }

  removeHeli() {
    if (!this.heli) return;
    this.scene.remove(this.heli);
    this.heli = null;
  }

  // Two cruisers + striped barriers across the road ahead of the player.
  spawnRoadblock(px, pz, heading) {
    const aheadX = px + Math.sin(heading) * 45;
    const aheadZ = pz + Math.cos(heading) * 45;
    const roadX = nearestRoadCoord(aheadX);
    const roadZ = nearestRoadCoord(aheadZ);
    const useX = Math.abs(aheadX - roadX) < Math.abs(aheadZ - roadZ);
    const bx = useX ? roadX : aheadX;
    const bz = useX ? aheadZ : roadZ;
    const group = new THREE.Group();
    const barrierMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    for (const off of [-4, 0, 4]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 0.4), barrierMat);
      bar.position.set(useX ? off : 0, 0.8, useX ? 0 : off);
      group.add(bar);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      leg.position.set(useX ? off : 0, 0.3, useX ? 0 : off);
      group.add(leg);
    }
    group.position.set(bx, 0, bz);
    group.rotation.y = useX ? 0 : Math.PI / 2;
    this.scene.add(group);
    const cruiser = this.spawnCruiser(bx, bz);
    cruiser.mesh.position.set(bx + (useX ? 8 : 0), 0, bz + (useX ? 0 : 8));
    this.roadblocks.push({ group, x: bx, z: bz, life: 45 });
    return { x: bx, z: bz };
  }

  despawnAll() {
    for (const c of this.policeCars) this.scene.remove(c.mesh);
    this.policeCars = [];
    for (const r of this.roadblocks) this.scene.remove(r.group);
    this.roadblocks = [];
    this.removeHeli();
  }

  update(dt, px, pz, playerHeading, playerSpeed, inGarage) {
    // Heat cools when the player is slow, far from police, or in the garage.
    const nearestCop = this.policeCars.reduce((m, c) => Math.min(m, Math.hypot(c.mesh.position.x - px, c.mesh.position.z - pz)), 9999);
    if (this.level > 0) {
      const cooling = inGarage ? 14 : (nearestCop > 55 && playerSpeed < 12 ? 4.5 : 0.6);
      this.coolTimer += dt * cooling;
      if (this.coolTimer >= 6) {
        this.coolTimer = 0;
        this.heat -= 12;
        if (this.heat < 0) {
          this.heat = 90;
          this.setLevel(this.level - 1);
          if (this.level === 0) this.despawnAll();
        }
      }
    }
    // Desired cruiser count grows with stars.
    const want = this.level === 0 ? 0 : this.level === 1 ? 1 : this.level === 2 ? 2 : this.level === 3 ? 3 : 4;
    this._spawnTimer -= dt;
    if (this.policeCars.length < want && this._spawnTimer <= 0) {
      this.spawnCruiser(px, pz);
      this._spawnTimer = 2.5;
    }
    // Pursuit: steer toward the player, ram when close, fall off at 5 stars' speed.
    const top = 26 + this.level * 3.2;
    for (const c of this.policeCars) {
      const dx = px - c.mesh.position.x, dz = pz - c.mesh.position.z;
      const d = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += clamp(dh, -2.4 * dt, 2.4 * dt);
      const targetSpeed = d > 6 ? top : top * 0.55;
      c.speed += (targetSpeed - c.speed) * Math.min(1, dt * 1.4);
      c.mesh.position.x += Math.sin(c.heading) * c.speed * dt;
      c.mesh.position.z += Math.cos(c.heading) * c.speed * dt;
      c.mesh.rotation.y = c.heading;
      for (const w of c.mesh.userData.wheels) w.rotation.y += c.speed * dt * 2.4;
      // Ram: bump the player's speed down when a cruiser touches the car.
      if (d < 4.5) { c.ramTimer -= dt; }
    }
    // Helicopter from 3 stars: circles the player, spotlight on at night.
    if (this.level >= 3) {
      this.spawnHeli();
      this.heliAngle += dt * 0.45;
      const hx = px + Math.cos(this.heliAngle) * 26;
      const hz = pz + Math.sin(this.heliAngle) * 26;
      this.heli.position.set(hx, 42, hz);
      this.heli.rotation.y = -this.heliAngle;
      this.heli.userData.rotor.rotation.y += dt * 22;
    } else if (this.heli) this.removeHeli();
    // Roadblocks from 4 stars, refreshed ahead of the player's heading.
    if (this.level >= 4) {
      this.roadblockTimer -= dt;
      if (this.roadblockTimer <= 0 && this.roadblocks.length < 2) {
        this.spawnRoadblock(px, pz, playerHeading);
        this.roadblockTimer = 14;
      }
    }
    for (let i = this.roadblocks.length - 1; i >= 0; i--) {
      const r = this.roadblocks[i];
      r.life -= dt;
      if (r.life <= 0) { this.scene.remove(r.group); this.roadblocks.splice(i, 1); }
    }
    // Stale cruisers far behind get recycled near the action.
    for (const c of this.policeCars) {
      const d = Math.hypot(c.mesh.position.x - px, c.mesh.position.z - pz);
      if (d > 220) {
        c.mesh.position.set(nearestRoadCoord(px) + 3, 0, pz + (Math.random() < 0.5 ? -70 : 70));
        c.speed = 10;
      }
    }
  }
}
