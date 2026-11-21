// fx.js — particles, tracers, muzzle flashes, explosions, and the
// weather/sky system. One THREE.Points pool is reused for every burst so
// effects never allocate during gameplay. The sky, sun, fog and rain all
// follow the in-game clock and the hurricane countdown.
import * as THREE from 'three';
import { clamp, lerp } from './rng.js';

const MAX_PARTICLES = 900;

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.vel = new Float32Array(MAX_PARTICLES * 3);
    this.life = new Float32Array(MAX_PARTICLES);
    this.maxLife = new Float32Array(MAX_PARTICLES);
    this.head = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.tracers = [];
    this.flash = null;
    this.flashTimer = 0;
    // Rain: a second points cloud that falls in a box around the camera.
    // Dense enough to read as streaks at screenshot distance.
    this.rainCount = 2000;
    this.rainPos = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) {
      this.rainPos[i * 3] = (Math.random() - 0.5) * 90;
      this.rainPos[i * 3 + 1] = Math.random() * 40;
      this.rainPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xd6e6f2, size: 1.0, transparent: true, opacity: 0.9, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
    this.weather = 'clear'; // clear | rain | storm
    this.rainIntensity = 0;
  }

  burst(pos, colorHex, count = 12, speed = 5) {
    const c = new THREE.Color(colorHex);
    for (let n = 0; n < count; n++) {
      const i = this.head;
      this.head = (this.head + 1) % MAX_PARTICLES;
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = up * s;
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;
      this.life[i] = this.maxLife[i] = 0.5 + Math.random() * 0.7;
    }
  }

  explosion(pos) {
    this.burst(pos, 0xff8800, 42, 11);
    this.burst(pos, 0xffdd55, 24, 7);
    this.burst(pos, 0x555555, 20, 4);
    // Expanding shockwave ring on the ground.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.1, 28),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(0.25);
    this.scene.add(ring);
    this.tracers.push({ line: ring, life: 0.55, ring: true });
    const light = new THREE.PointLight(0xff9933, 260, 60, 1.6);
    light.position.copy(pos).add(new THREE.Vector3(0, 2, 0));
    this.scene.add(light);
    this.flash = light;
    this.flashTimer = 0.5;
  }

  muzzle(pos) {
    this.burst(pos, 0xffe27a, 5, 3);
  }

  tracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.09 });
  }

  skid(pos, heading) {
    this.burst(pos, 0x777777, 4, 1.5);
  }

  setWeather(w) {
    this.weather = w;
    this.rain.visible = w !== 'clear';
    this.rainIntensity = w === 'storm' ? 1 : w === 'rain' ? 0.55 : 0;
  }

  // Sky palettes by hour: dawn, noon, golden hour, dusk, night.
  skyFor(hour) {
    if (hour < 5.5) return { sky: 0x0b1026, fog: 0x0b1026, sun: 0x334466, sunI: 0.25, hemi: 0.35 };
    if (hour < 8) return { sky: 0xffb27a, fog: 0xe8a06a, sun: 0xffd9a0, sunI: 0.9, hemi: 0.6 };
    if (hour < 16.5) return { sky: 0x87ceeb, fog: 0xa8c8d8, sun: 0xfff2cc, sunI: 1.15, hemi: 0.9 };
    if (hour < 18.5) return { sky: 0xff9e5e, fog: 0xe08a5a, sun: 0xffb36b, sunI: 1.0, hemi: 0.65 };
    if (hour < 20) return { sky: 0x2c1a4e, fog: 0x3a2358, sun: 0xff7a5c, sunI: 0.55, hemi: 0.45 };
    return { sky: 0x0b1026, fog: 0x0b1026, sun: 0x8fa8ff, sunI: 0.3, hemi: 0.35 };
  }

  applySky(hour, sunLight, hemiLight, lamps) {
    const a = this.skyFor(hour);
    const b = this.skyFor((hour + 1.5) % 24);
    const t = (hour % 1.5) / 1.5;
    const sky = new THREE.Color(a.sky).lerp(new THREE.Color(b.sky), clamp(t, 0, 1) * 0.4);
    this.scene.background = sky;
    if (this.scene.fog) this.scene.fog.color.copy(sky);
    sunLight.color.setHex(a.sun);
    sunLight.intensity = a.sunI;
    hemiLight.intensity = a.hemi;
    const night = hour < 5.5 || hour >= 19.5;
    for (const lamp of lamps) lamp.material.emissiveIntensity = night ? 1.6 : 0.25;
  }

  update(dt, camX, camZ) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 9 * dt;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.positions[i * 3 + 1] < 0.05) { this.positions[i * 3 + 1] = 0.05; this.vel[i * 3 + 1] = 0; }
      if (this.life[i] <= 0) this.positions[i * 3 + 1] = -999;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09) * 0.9;
      if (t.ring) {
        const s = 1 + (0.55 - Math.max(0, t.life)) * 26;
        t.line.scale.set(s, s, s);
        t.line.material.opacity = Math.max(0, t.life / 0.55) * 0.9;
      }
      if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); this.tracers.splice(i, 1); }
    }
    if (this.flash) {
      this.flashTimer -= dt;
      this.flash.intensity = Math.max(0, this.flashTimer / 0.5) * 260;
      if (this.flashTimer <= 0) { this.scene.remove(this.flash); this.flash = null; }
    }
    if (this.rain.visible) {
      const fall = (this.weather === 'storm' ? 34 : 22) * dt;
      const wind = this.weather === 'storm' ? 9 : 2;
      for (let i = 0; i < this.rainCount; i++) {
        this.rainPos[i * 3 + 1] -= fall * (0.7 + (i % 5) * 0.12);
        this.rainPos[i * 3] += wind * dt;
        if (this.rainPos[i * 3 + 1] < 0) {
          this.rainPos[i * 3 + 1] = 38;
          this.rainPos[i * 3] = camX + (Math.random() - 0.5) * 90;
          this.rainPos[i * 3 + 2] = camZ + (Math.random() - 0.5) * 90;
        }
      }
      this.rain.position.set(0, 0, 0);
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
}
