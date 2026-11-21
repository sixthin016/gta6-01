// police.js — the NBPD: wanted stars, patrol cars, pursuit with PIT
// attempts, roadblocks, the Air One helicopter (rotor blur discs,
// searchlight cone, spotlight pool on the road) and SWAT at five stars.
import * as THREE from 'three';
import { makeRng, clamp, angleLerp, damp } from './rng.js';
import { buildCarMesh, Car } from './vehicles.js';
import { buildPersonMesh } from './people.js';

export class Helicopter {
  constructor(scene) {
    this.scene = scene;
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2f6e });
    const glass = new THREE.MeshLambertMaterial({ color: 0x18242e, emissive: 0x0a1420, emissiveIntensity: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 6.4), bodyMat);
    body.castShadow = true;
    g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 2.2), glass);
    nose.position.set(0, -0.2, 3.6);
    g.add(nose);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 6.4), bodyMat);
    tail.position.set(0, 0.4, -6);
    g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 1.6), bodyMat);
    fin.position.set(0, 1.4, -8.6);
    g.add(fin);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.5, 6.45), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }));
    stripe.position.y = 0.4;
    g.add(stripe);
    // rotor blur discs (translucent) + thin rotor bars
    const discMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    this.rotor = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.06, 24), discMat);
    this.rotor.position.y = 1.6;
    g.add(this.rotor);
    const barMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    this.rotorBar = new THREE.Mesh(new THREE.BoxGeometry(15, 0.1, 0.5), barMat);
    this.rotorBar.position.y = 1.62;
    g.add(this.rotorBar);
    this.tailRotor = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.08, 12), discMat);
    this.tailRotor.rotation.z = Math.PI / 2;
    this.tailRotor.position.set(0.7, 1.2, -8.6);
    g.add(this.tailRotor);
    // skids
    const skidMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    for (const sx of [-1.2, 1.2]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 5), skidMat);
      skid.position.set(sx, -1.5, 0.4);
      g.add(skid);
    }
    // searchlight: cone + ground pool
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(9, 42, 16, 1, true), coneMat);
    this.cone.position.set(0, -21, 6);
    this.cone.rotation.x = 0.35;
    g.add(this.cone);
    const poolMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.32, depthWrite: false });
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(8.5, 20), poolMat);
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.position.y = 0.15;
    scene.add(this.pool);
    this.mesh = g;
    this.mesh.visible = false;
    this.pool.visible = false;
    scene.add(g);
    this.pos = g.position;
    this.target = new THREE.Vector3();
    this.orbitA = 0;
  }

  show(at) {
    this.mesh.visible = true;
    this.pool.visible = true;
    this.pos.copy(at);
    this.pos.y = 46;
  }

  hide() {
    this.mesh.visible = false;
    this.pool.visible = false;
  }

  update(dt, focus, t) {
    if (!this.mesh.visible) return;
    this.orbitA += dt * 0.22;
    const ox = Math.cos(this.orbitA) * 26;
    const oz = Math.sin(this.orbitA) * 26;
    this.target.set(focus.x + ox * 0.4, 0, focus.z + oz * 0.4);
    this.pos.x = damp(this.pos.x, focus.x + ox, 1.4, dt);
    this.pos.z = damp(this.pos.z, focus.z + oz, 1.4, dt);
    this.pos.y = damp(this.pos.y, 44 + Math.sin(t * 0.7) * 3, 1.2, dt);
    this.mesh.lookAt(focus.x, this.pos.y - 6, focus.z);
    this.rotorBar.rotation.y += dt * 22;
    this.tailRotor.rotation.x += dt * 30;
    this.pool.position.set(focus.x, 0.15, focus.z);
    const pulse = 0.26 + Math.sin(t * 3) * 0.05;
    this.pool.material.opacity = pulse;
  }
}

export class Police {
  constructor(scene, city, fx, audio) {
    this.scene = scene;
    this.city = city;
    this.fx = fx;
    this.audio = audio;
    this.rng = makeRng(424242);
    this.wanted = 0;
    this.heat = 0;
    this.cars = [];
    this.heli = new Helicopter(scene);
    this.swat = [];
    this.roadblocks = [];
    this.autoSwat = true; // staging turns this off: its SWAT is placed by hand
    this.sirenTimer = 0;
    this.spawnTimer = 0;
    this.dispatchNames = ['NBPD-12', 'NBPD-07', 'NBPD-23', 'NBPD-31', 'NBPD-44', 'AIR ONE', 'SWAT-2'];
    this.unitIndex = 0;
  }

  addWanted(n, reason) {
    const before = this.wanted;
    this.wanted = clamp(this.wanted + n, 0, 5);
    if (this.wanted > before && this.audio) this.audio.wantedUp();
    return this.wanted;
  }

  clearWanted() {
    this.wanted = 0;
    this.heat = 0;
    for (const c of this.cars) this.scene.remove(c.mesh);
    this.cars = [];
    this.heli.hide();
    for (const s of this.swat) this.scene.remove(s.mesh);
    this.swat = [];
    for (const r of this.roadblocks) this.scene.remove(r);
    this.roadblocks = [];
  }

  spawnPatrol(spot) {
    const mesh = buildCarMesh(0x1c2f6e, 'police');
    mesh.position.set(spot.x, 0, spot.z);
    this.scene.add(mesh);
    const loop = this.rng.pick(this.city.loops);
    const car = new Car(mesh, { heading: this.rng.range(0, Math.PI * 2), driver: 'traffic', waypoints: loop, maxSpeed: 30 });
    car.wpIndex = Math.floor(this.rng.next() * loop.length);
    car.speed = 13;
    this.cars.push(car);
    return car;
  }

  spawnPursuit(near, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const d = this.rng.range(38, 70);
      const mesh = buildCarMesh(0x1c2f6e, 'police');
      mesh.position.set(near.x + Math.cos(a) * d, 0, near.z + Math.sin(a) * d);
      this.scene.add(mesh);
      const car = new Car(mesh, { heading: a, driver: 'police', maxSpeed: 42, accel: 22 });
      car.speed = 18;
      this.cars.push(car);
      out.push(car);
    }
    return out;
  }

  spawnRoadblock(at, heading) {
    const g = new THREE.Group();
    const f = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const side = new THREE.Vector3(f.z, 0, -f.x);
    for (let i = -1; i <= 1; i++) {
      const mesh = buildCarMesh(0x1c2f6e, 'police');
      mesh.position.copy(at).addScaledVector(side, i * 5.2).addScaledVector(f, (i % 2) * 2);
      mesh.rotation.y = heading + Math.PI / 2 + (i === 0 ? 0.35 : -0.2);
      g.add(mesh);
    }
    // spike strip
    const strip = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 1.2), new THREE.MeshBasicMaterial({ color: 0x888888 }));
    strip.position.copy(at).addScaledVector(f, -7);
    strip.rotation.y = heading;
    g.add(strip);
    for (let i = -4; i <= 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
      spike.position.copy(at).addScaledVector(side, i * 1.1).addScaledVector(f, -7);
      spike.position.y = 0.4;
      g.add(spike);
    }
    this.scene.add(g);
    this.roadblocks.push(g);
    return g;
  }

  spawnSwat(at, count) {
    for (let i = 0; i < count; i++) {
      const mesh = buildPersonMesh(0x8a6a4a, 0x1c1c20, 0x1c1c20, 1.06);
      mesh.position.set(at.x + this.rng.range(-6, 6), 0, at.z + this.rng.range(-6, 6));
      // helmet visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: 0x37c8ff }));
      visor.position.set(0, 1.78, 0.22);
      mesh.add(visor);
      this.scene.add(mesh);
      this.swat.push({ mesh, pos: mesh.position, hp: 120, heading: 0, phase: Math.random() * 6 });
    }
  }

  update(dt, playerPos, playerSpeed, t) {
    // wanted decays slowly when the player is calm and slow
    if (this.wanted > 0) {
      this.heat += dt;
      if (playerSpeed < 2 && this.heat > 26) {
        this.wanted = Math.max(0, this.wanted - 1);
        this.heat = 0;
      }
    }
    // siren blips
    this.sirenTimer -= dt;
    if (this.wanted > 0 && this.sirenTimer <= 0 && this.cars.length > 0) {
      this.sirenTimer = this.rng.range(2.4, 4.5);
      if (this.audio) this.audio.sirenBlip();
    }
    // keep the right number of pursuit cars
    const wantCars = this.wanted === 0 ? 0 : this.wanted <= 2 ? 2 : this.wanted <= 4 ? 3 : 4;
    this.spawnTimer -= dt;
    if (this.cars.length < wantCars && this.spawnTimer <= 0) {
      this.spawnTimer = 2.5;
      this.spawnPursuit(playerPos, 1);
    }
    // pursuit steering: chase the player, attempt PIT when alongside
    for (const c of this.cars) {
      if (c.driver !== 'police') continue;
      const dx = playerPos.x - c.pos.x;
      const dz = playerPos.z - c.pos.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      const side = Math.sin(want - c.heading);
      const pit = dist < 14 ? side * 0.5 : 0;
      c.heading = angleLerp(c.heading, want + pit, 1 - Math.exp(-2.6 * dt));
      const cruise = dist > 60 ? 40 : 33;
      c.speed = damp(c.speed, cruise, 1.1, dt);
      if (dist < 3.4 && playerSpeed > 4) {
        // PIT nudge + sparks
        c.speed *= 0.96;
        this.fx.burst('spark', new THREE.Vector3((c.pos.x + playerPos.x) / 2, 0.8, (c.pos.z + playerPos.z) / 2), 3, 4);
      }
    }
    // helicopter at 4+ stars
    if (this.wanted >= 4) {
      if (!this.heli.mesh.visible) this.heli.show(playerPos);
      this.heli.update(dt, playerPos, t);
    } else if (this.heli.mesh.visible) {
      this.heli.hide();
    }
    // SWAT at 5 stars (unless staging placed its own)
    if (this.wanted >= 5 && this.swat.length === 0 && this.autoSwat) {
      this.spawnSwat(playerPos, 4);
    }
    if (this.wanted < 5 && this.swat.length > 0) {
      for (const s of this.swat) this.scene.remove(s.mesh);
      this.swat = [];
    }
    // SWAT advance on the player
    for (const s of this.swat) {
      const dx = playerPos.x - s.pos.x;
      const dz = playerPos.z - s.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 9) {
        const want = Math.atan2(dx, dz);
        s.heading = angleLerp(s.heading, want, 1 - Math.exp(-3 * dt));
        s.pos.x += Math.sin(s.heading) * 3.4 * dt;
        s.pos.z += Math.cos(s.heading) * 3.4 * dt;
        s.mesh.rotation.y = s.heading;
        s.phase += dt * 7;
        const u = s.mesh.userData;
        u.legL.rotation.x = Math.sin(s.phase) * 0.5;
        u.legR.rotation.x = -Math.sin(s.phase) * 0.5;
      }
    }
  }

  unitLabel(i) {
    return this.dispatchNames[i % this.dispatchNames.length];
  }
}
