// Neon Bay — city.js: builds the whole city from boxes and procedural
// canvas textures. Five districts on a road grid, a beach and a pier to
// the south, the harbor to the east, and the Highway Loop ringing it all.
// Every building registers an AABB collider so cars and the player stop
// at walls instead of driving through them.
import * as THREE from 'three';
import { makeRng } from './rng.js';

export const DISTRICTS = [
  { name: 'Coral Beach', x: 0, z: -215, color: '#ff9e57' },
  { name: 'Mercado District', x: -90, z: -60, color: '#ffd166' },
  { name: 'Neon Row', x: 0, z: 0, color: '#ff2e88' },
  { name: 'Palm Heights', x: 90, z: 90, color: '#2ec4ff' },
  { name: 'Harbor', x: 215, z: 30, color: '#7dff5e' },
  { name: 'Highway Loop', x: -190, z: 150, color: '#b388ff' },
];

const ROAD_LINES = [-180, -120, -60, 0, 60, 120, 180];

function windowTexture(rng, base, litRatio) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = rng.next() < litRatio;
      g.fillStyle = lit ? (rng.next() < 0.5 ? '#ffd166' : '#7de3ff') : '#1c2438';
      g.fillRect(x, y, 8, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene, seed = 20261121) {
  const rng = makeRng(seed);
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'NeonBayCity';

  const palette = ['#2b3a67', '#3a2b5c', '#173f4d', '#4d2b3a', '#233d2b', '#453a1e'];

  // Ground: one big slab for the city, sand for the beach, sea beyond it.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x2e3440 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 10);
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 70),
    new THREE.MeshLambertMaterial({ color: 0xd9b380 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, -225);
  sand.receiveShadow = true;
  group.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 160),
    new THREE.MeshLambertMaterial({ color: 0x0e5f7a }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.01, -340);
  group.add(sea);

  // Roads: dark strips on the grid, with pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x181c26 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c56a });
  for (const v of ROAD_LINES) {
    for (const [w, d, x, z] of [[560, 10, 0, v], [10, 560, v, 10]]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.03, z);
      road.receiveShadow = true;
      group.add(road);
    }
    for (let t = -260; t < 260; t += 16) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(t, 0.05, v);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(v, 0.05, t);
      group.add(dash2);
    }
  }

  // Buildings: one block per grid cell that is not beach, sea or harbor yard.
  const neonColors = [0xff2e88, 0x2ec4ff, 0xffd166, 0x7dff5e, 0xb388ff, 0xff9e57];
  const blockCenters = [];
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      // Blocks sit BETWEEN the roads: offset half a block (30) from the
      // road lines so no building ever stands in the middle of a street.
      const cx = gx * 60 + 30;
      const cz = gz * 60 + 40;
      if (cz < -180) continue; // beach
      if (cx > 190 && cz > -40 && cz < 80) continue; // harbor yard
      blockCenters.push([cx, cz]);
    }
  }
  for (const [cx, cz] of blockCenters) {
    const downtown = Math.abs(cx) <= 60 && Math.abs(cz) <= 60;
    const count = downtown ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const w = rng.range(14, 24);
      const d = rng.range(14, 24);
      const h = downtown ? rng.range(28, 70) : rng.range(8, 26);
      const ox = k === 0 ? -w * 0.35 : w * 0.4;
      const oz = k === 0 ? -d * 0.3 : d * 0.35;
      const x = cx + ox;
      const z = cz + oz;
      const tex = windowTexture(rng, palette[Math.floor(rng.next() * palette.length)], downtown ? 0.55 : 0.3);
      const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x, h / 2, z);
      b.castShadow = true;
      b.receiveShadow = true;
      group.add(b);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      // Neon sign strip on some downtown towers.
      if (downtown && rng.next() < 0.6) {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.7, 1.2, 0.4),
          new THREE.MeshBasicMaterial({ color: neonColors[Math.floor(rng.next() * neonColors.length)] }),
        );
        sign.position.set(x, h * 0.82, z + d / 2 + 0.25);
        group.add(sign);
      }
      // Rooftop beacon on the tallest towers.
      if (h > 55) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.9, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
        );
        beacon.position.set(x, h + 1.2, z);
        group.add(beacon);
      }
    }
  }

  // Palms along the beach front and the plaza.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e44 });
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = 0.08;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    group.add(g);
  }
  for (let x = -240; x <= 240; x += 24) palm(x, -192);
  for (let x = -120; x <= 120; x += 30) palm(x, -150);

  // Street lamps on every road crossing.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const v of ROAD_LINES) {
    for (const u of ROAD_LINES) {
      if (u < -180 || u > 180) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), poleMat);
      pole.position.set(u + 6, 3, v + 6);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), lampMat);
      lamp.position.set(u + 6, 6.2, v + 6);
      group.add(lamp);
    }
  }

  // Harbor: crates, containers and a pier over the sea.
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6d3b });
  const contColors = [0xc0392b, 0x2471a3, 0x1e8449, 0xd4ac0d];
  for (let i = 0; i < 14; i++) {
    const s = rng.range(2, 4);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(rng.range(200, 245), s / 2, rng.range(-30, 70));
    crate.rotation.y = rng.next() * Math.PI;
    crate.castShadow = true;
    group.add(crate);
    colliders.push({ minX: crate.position.x - s / 2, maxX: crate.position.x + s / 2, minZ: crate.position.z - s / 2, maxZ: crate.position.z + s / 2 });
  }
  for (let i = 0; i < 6; i++) {
    const cont = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3, 3),
      new THREE.MeshLambertMaterial({ color: contColors[i % contColors.length] }),
    );
    cont.position.set(210 + (i % 3) * 14, 1.5, -20 + Math.floor(i / 3) * 60);
    cont.castShadow = true;
    group.add(cont);
    colliders.push({ minX: cont.position.x - 6, maxX: cont.position.x + 6, minZ: cont.position.z - 1.5, maxZ: cont.position.z + 1.5 });
  }
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1, 60),
    new THREE.MeshLambertMaterial({ color: 0x7a5a34 }),
  );
  pier.position.set(-40, 0.8, -290);
  group.add(pier);

  // Mercado stalls: low awnings over the plaza at (-90, -60).
  const awningColors = [0xff6b6b, 0xffd166, 0x2ec4ff, 0x7dff5e];
  for (let i = 0; i < 8; i++) {
    const stall = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.3, 5),
      new THREE.MeshLambertMaterial({ color: awningColors[i % awningColors.length] }),
    );
    top.position.y = 3;
    stall.add(top);
    for (const [px, pz] of [[-2.8, -2.2], [2.8, -2.2], [-2.8, 2.2], [2.8, 2.2]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), poleMat);
      leg.position.set(px, 1.5, pz);
      stall.add(leg);
    }
    stall.position.set(-110 + (i % 4) * 14, 0, -72 + Math.floor(i / 4) * 22);
    group.add(stall);
  }

  scene.add(group);
  return {
    group,
    colliders,
    spawn: { player: new THREE.Vector3(-90, 0, -40), beach: new THREE.Vector3(0, 0, -200), harbor: new THREE.Vector3(215, 0, 30), highway: new THREE.Vector3(-180, 0, 150) },
    roadLines: ROAD_LINES,
  };
}
