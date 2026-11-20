// Vehicles — hero car (saturated glossy paint, never black), traffic in varied colors,
// BCPD cruisers with light bars, and the Air One helicopter with rotor blur + searchlight.
import * as THREE from 'three';
import { makeRng } from '../core/rng.js';

export const CAR_COLORS = [0xff2e4d, 0x2ee6ff, 0xffd75e, 0x7dff9a, 0xff8d3c, 0x7a5cff, 0xff5e8a, 0xe8f4ff, 0x2e9ec8, 0xc0c8d0];
const GLASS = new THREE.MeshStandardMaterial({ color: 0x101c28, roughness: 0.15, metalness: 0.7 });
const TYRE = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.95 });
const CHROME = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.2, metalness: 0.9 });

function wheel() {
  const w = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12), TYRE);
  tyre.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), CHROME);
  hub.rotation.z = Math.PI / 2;
  w.add(tyre, hub);
  return w;
}

// A drivable-looking car: body + cabin + glass + lights + spoiler + wheels.
export function makeCar(opts) {
  const { color = 0xff2e4d, police = false, length = 4.4, taxi = false } = opts || {};
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.55 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, length), paint);
  body.position.y = 0.62; body.castShadow = true;
  car.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 0.5), paint);
  nose.position.set(0, 0.5, length / 2 - 0.1);
  car.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, length * 0.48), GLASS);
  cabin.position.set(0, 1.18, -length * 0.06); cabin.castShadow = true;
  car.add(cabin);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.3), paint);
  spoiler.position.set(0, 1.02, -length / 2 + 0.15);
  car.add(spoiler);
  // headlights + taillights (emissive — they glow at golden hour)
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  [-0.65, 0.65].forEach((x) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), hl);
    h.position.set(x, 0.62, length / 2 + 0.02); car.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.06), tl);
    t.position.set(x, 0.66, -length / 2 - 0.02); car.add(t);
  });
  // wheels
  const wPos = [[-0.95, length / 2 - 0.75], [0.95, length / 2 - 0.75], [-0.95, -length / 2 + 0.75], [0.95, -length / 2 + 0.75]];
  wPos.forEach(([x, z]) => { const w = wheel(); w.position.set(x, 0.36, z); car.add(w); });
  if (police) {
    const bar = new THREE.Group();
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.2), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    r.position.x = -0.25; r.name = 'lightR';
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.2), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    b.position.x = 0.25; b.name = 'lightB';
    bar.add(r, b); bar.position.set(0, 1.52, -length * 0.06);
    car.add(bar);
    car.userData.lightBar = bar;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    door.position.set(-1.01, 0.66, 0); door.rotation.y = -Math.PI / 2;
    car.add(door);
  }
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffd75e }));
    sign.position.set(0, 1.56, -length * 0.06);
    car.add(sign);
  }
  car.userData.isCar = true;
  return car;
}

// NOS flame cone + underglow, attached when boosting.
export function makeNosFlame() {
  const flame = new THREE.Group();
  const geo = new THREE.ConeGeometry(0.22, 1.1, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0x66c8ff, transparent: true, opacity: 0.9 });
  [-0.6, 0.6].forEach((x) => {
    const f = new THREE.Mesh(geo, mat);
    f.rotation.x = -Math.PI / 2; f.position.set(x, 0.35, -2.4);
    flame.add(f);
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4),
    new THREE.MeshBasicMaterial({ color: 0x2e9eff, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.06, -2.2);
  flame.add(glow);
  return flame;
}

// Air One — BCPD helicopter: big silhouette, rotor blur disc, searchlight cone.
export function makeHeli(opts) {
  const { gunner = false, doorOpen = false } = opts || {};
  const heli = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2a3a, roughness: 0.4, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 4.6), bodyMat);
  body.position.y = 0; body.castShadow = true;
  heli.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.4), GLASS);
  glass.position.set(0, 0.25, 2.0);
  heli.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), bodyMat);
  tail.position.set(0, 0.3, -4.2);
  heli.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.4, 1.0), bodyMat);
  fin.position.set(0, 0.9, -6.2);
  heli.add(fin);
  // skids
  [-0.9, 0.9].forEach((x) => {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 6), CHROME);
    skid.rotation.x = Math.PI / 2; skid.position.set(x, -1.15, 0.3);
    heli.add(skid);
  });
  // main rotor: 2 blades + translucent blur disc (the spinning look)
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x14181e, roughness: 0.6 });
  [-1, 1].forEach((s) => {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.08, 0.42), bladeMat);
    blade.position.x = s * 3.8;
    rotor.add(blade);
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.4, 28),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.04;
  rotor.add(disc);
  rotor.position.y = 1.25;
  rotor.name = 'rotor';
  heli.add(rotor);
  // tail rotor
  const tailRotor = new THREE.Group();
  const tb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.3), bladeMat);
  tailRotor.add(tb);
  const td = new THREE.Mesh(new THREE.CircleGeometry(0.95, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
  td.rotation.y = Math.PI / 2;
  tailRotor.add(td);
  tailRotor.position.set(0.3, 0.9, -6.2);
  tailRotor.name = 'tailRotor';
  heli.add(tailRotor);
  // searchlight cone, aimed at the street
  const coneGeo = new THREE.ConeGeometry(3.2, 26, 20, 1, true);
  const cone = new THREE.Mesh(coneGeo,
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = Math.PI; cone.position.set(0, -13.5, 1.5);
  cone.name = 'searchlight';
  heli.add(cone);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff8d0 }));
  lamp.position.set(0, -0.9, 1.5);
  heli.add(lamp);
  if (gunner) {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x22262e }));
    torso.position.y = 0.35;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22262e }));
    head.position.y = 0.85;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x111111 }));
    gun.position.set(0, 0.3, 0.7);
    g.add(torso, head, gun);
    g.position.set(doorOpen ? 1.25 : 0.9, -0.55, 0.6);
    g.rotation.y = doorOpen ? Math.PI / 2 : 0;
    heli.add(g);
  }
  heli.userData.isHeli = true;
  return heli;
}

// Traffic: N colored cars placed along a road line with slight jitter.
export function spawnTraffic(scene, rngSeed, count, origin, dir, spacing) {
  const rng = makeRng(rngSeed);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const color = CAR_COLORS[rng.int(0, CAR_COLORS.length - 1)];
    const car = makeCar({ color, taxi: rng.chance(0.12) });
    const lane = (i % 3) - 1;
    car.position.set(
      origin.x + dir.x * i * spacing + dir.z * lane * 3.4 + rng.range(-0.5, 0.5),
      0,
      origin.z + dir.z * i * spacing - dir.x * lane * 3.4 + rng.range(-0.5, 0.5),
    );
    car.rotation.y = Math.atan2(dir.x, dir.z) + rng.range(-0.06, 0.06);
    scene.add(car);
    cars.push(car);
  }
  return cars;
}
