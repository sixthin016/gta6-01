// Neon Bay — fx.js: particles, explosions, muzzle flashes, rain and the
// storm sky. All effects are plain three.js meshes and points; nothing
// is loaded from a file.
import * as THREE from 'three';

export function createFx(scene) {
  const bursts = [];
  const flashes = [];
  const rain = { points: null, vel: [] };
  const tmpColor = new THREE.Color();

  function makeBurst(pos, color, count, speed, life, size, gravity) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      vels.push(new THREE.Vector3(Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + speed * 0.4, Math.sin(a) * Math.cos(b) * s));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    bursts.push({ points, vels, life, maxLife: life, gravity: gravity ?? 9 });
    return points;
  }

  function update(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= dt;
      const attr = b.points.geometry.getAttribute('position');
      for (let j = 0; j < b.vels.length; j++) {
        const v = b.vels[j];
        v.y -= b.gravity * dt;
        attr.array[j * 3] += v.x * dt;
        attr.array[j * 3 + 1] += v.y * dt;
        attr.array[j * 3 + 2] += v.z * dt;
        if (attr.array[j * 3 + 1] < 0.05) attr.array[j * 3 + 1] = 0.05;
      }
      attr.needsUpdate = true;
      b.points.material.opacity = Math.max(0, b.life / b.maxLife);
      if (b.life <= 0) {
        scene.remove(b.points);
        b.points.geometry.dispose();
        b.points.material.dispose();
        bursts.splice(i, 1);
      }
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life -= dt;
      f.mesh.material.opacity = Math.max(0, f.life / 0.09);
      if (f.life <= 0) {
        scene.remove(f.mesh);
        f.mesh.material.dispose();
        flashes.splice(i, 1);
      }
    }
    if (rain.points) {
      const attr = rain.points.geometry.getAttribute('position');
      for (let i = 0; i < rain.vel.length; i++) {
        attr.array[i * 3 + 1] -= rain.vel[i] * dt;
        attr.array[i * 3] += 2.5 * dt;
        if (attr.array[i * 3 + 1] < 0) attr.array[i * 3 + 1] = 30;
      }
      attr.needsUpdate = true;
    }
  }

  return {
    update,
    sparks(pos) { makeBurst(pos, 0xffc861, 26, 9, 0.5, 0.22, 12); },
    explosion(pos) {
      makeBurst(pos, 0xff7a2a, 70, 14, 0.9, 0.5, 6);
      makeBurst(pos, 0x3a3a3a, 40, 6, 1.4, 0.8, -1.5);
      makeBurst(pos, 0xffe9a8, 30, 20, 0.35, 0.3, 4);
    },
    muzzle(pos, dir) {
      const geo = new THREE.ConeGeometry(0.14, 0.9, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.lookAt(pos.clone().add(dir));
      mesh.rotateX(Math.PI / 2);
      scene.add(mesh);
      flashes.push({ mesh, life: 0.09 });
    },
    blood(pos) { makeBurst(pos, 0xb3122e, 18, 5, 0.6, 0.2, 10); },
    setRain(on, center) {
      if (on && !rain.points) {
        const count = 900;
        const positions = new Float32Array(count * 3);
        rain.vel = [];
        for (let i = 0; i < count; i++) {
          positions[i * 3] = center.x + (Math.random() - 0.5) * 90;
          positions[i * 3 + 1] = Math.random() * 30;
          positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * 90;
          rain.vel.push(22 + Math.random() * 10);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: 0x9fc4e8, size: 0.12, transparent: true, opacity: 0.55 });
        rain.points = new THREE.Points(geo, mat);
        scene.add(rain.points);
      } else if (!on && rain.points) {
        scene.remove(rain.points);
        rain.points.geometry.dispose();
        rain.points.material.dispose();
        rain.points = null;
        rain.vel = [];
      } else if (on && rain.points) {
        // Rain stays where it was created; the storm cell covers the
        // play area, so no re-centring is needed mid-frame.
      }
    },
    tint(color) { tmpColor.set(color); return tmpColor; },
  };
}
