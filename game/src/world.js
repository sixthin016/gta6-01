// Shared golden-hour environment: sky dome, sun, wet roads, beach + sea,
// skyline towers and dressed building rows. Every shot reuses this base;
// staging adds the shot-specific action on top.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import * as TX from './textures.js';
import { makeBuilding, makeSkylineTower, makePalm, box } from './builders.js';

export function makeSky(scene, seed = 7) {
  const skyGeo = new THREE.SphereGeometry(420, 24, 14);
  const skyMat = new THREE.MeshBasicMaterial({ map: TX.skyTexture(seed), side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  // sun glow sprite low on the horizon
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glowTexture(), transparent: true, depthWrite: false, fog: false }));
  sun.scale.set(120, 120, 1);
  sun.position.set(180, 42, -330);
  scene.add(sun);
  scene.fog = new THREE.Fog(0xd97a4e, 90, 380);
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x3a2a4a, 1.15);
  const sunLight = new THREE.DirectionalLight(0xffb347, 2.4);
  sunLight.position.set(120, 70, -160);
  const fill = new THREE.DirectionalLight(0x7a86ff, 0.5);
  fill.position.set(-80, 60, 120);
  scene.add(hemi, sunLight, fill);
  return { sunLight };
}

// ---- long coastal road: wet asphalt, sidewalks, sand + sea on the left ----
export function makeBeachRoad(scene) {
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(26, 340),
    new THREE.MeshStandardMaterial({ map: TX.asphaltTexture(5), roughness: 0.35, metalness: 0.35 }));
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.material.map.repeat.set(1, 18);
  asphalt.material.map.wrapS = asphalt.material.map.wrapT = THREE.RepeatWrapping;
  scene.add(asphalt);
  // sidewalks
  for (const x of [-14.5, 14.5]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(3, 340),
      new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.9 }));
    walk.rotation.x = -Math.PI / 2; walk.position.set(x, 0.02, 0);
    scene.add(walk);
  }
  // sand + sea on the west side
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 340),
    new THREE.MeshStandardMaterial({ map: TX.sandTexture(6), roughness: 0.95 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-46, 0.01, 0);
  sand.material.map.repeat.set(3, 12); sand.material.map.wrapS = sand.material.map.wrapT = THREE.RepeatWrapping;
  scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(160, 340),
    new THREE.MeshStandardMaterial({ map: TX.seaTexture(8), roughness: 0.25, metalness: 0.4 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(-150, 0.0, 0);
  sea.material.map.repeat.set(4, 8); sea.material.map.wrapS = sea.material.map.wrapT = THREE.RepeatWrapping;
  scene.add(sea);
  // wet sheen strips on the road (golden reflections)
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(26, 340),
    new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.07 }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.y = 0.03;
  scene.add(sheen);
}

// ---- generic street block: asphalt + sidewalks (downtown / market) ----
export function makeStreet(scene, w = 22, len = 200) {
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(w, len),
    new THREE.MeshStandardMaterial({ map: TX.asphaltTexture(9), roughness: 0.35, metalness: 0.35 }));
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.material.map.repeat.set(1, 12);
  asphalt.material.map.wrapS = asphalt.material.map.wrapT = THREE.RepeatWrapping;
  scene.add(asphalt);
  for (const x of [-(w / 2 + 2), w / 2 + 2]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(4, len),
      new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 0.9 }));
    walk.rotation.x = -Math.PI / 2; walk.position.set(x, 0.02, 0);
    scene.add(walk);
  }
}

// ---- skyline ring: 12+ lit towers behind the action ----
export function makeSkyline(scene, seed = 3) {
  const r = makeRng(seed);
  const spots = [];
  for (let i = 0; i < 14; i++) {
    const a = r.range(-1.1, 1.1);
    const dist = r.range(150, 230);
    spots.push([Math.sin(a) * dist, -Math.cos(a) * dist - 40]);
  }
  spots.forEach(([x, z], i) => {
    const h = r.range(45, 110);
    const t = makeSkylineTower(r.range(14, 26), h, r.range(14, 26), 100 + i, i % 3 !== 0);
    t.position.set(x, 0, z);
    scene.add(t);
  });
  // construction crane silhouette
  const crane = new THREE.Group();
  crane.add(box(1.2, 55, 1.2, new THREE.MeshLambertMaterial({ color: 0x2a1f3a }), 0, 27.5, 0));
  crane.add(box(26, 1.2, 1.2, new THREE.MeshLambertMaterial({ color: 0x2a1f3a }), 8, 54, 0));
  crane.add(box(1.0, 8, 1.0, new THREE.MeshLambertMaterial({ color: 0xffb84d }), 18, 50, 0));
  crane.position.set(95, 0, -150);
  scene.add(crane);
}

// ---- dressed building row along a street (real facades, signs, colors) ----
// side: +1 = east side (x positive), -1 = west side. Faces the road.
export function makeBuildingRow(scene, side, zStart, zEnd, palette, seedBase) {
  const r = makeRng(seedBase);
  const signs = ['TACOS', 'NEON', 'HOTEL', 'BAR 24', 'SURF', 'PIZZA', 'MOTEL', 'CLUB', 'CAFE', 'GYM'];
  const signColors = ['#ff5fa2', '#2ee6ff', '#ffb84d', '#37e08a', '#ff8a3c', '#9d6bff'];
  let z = zStart;
  let i = 0;
  while (z > zEnd) {
    const w = r.range(10, 16), d = r.range(10, 14), h = r.range(14, 42);
    const b = makeBuilding(w, h, d, {
      base: r.pick(palette),
      sign: r.pick(signs),
      signColor: r.pick(signColors),
      seed: seedBase + i * 7,
      litRatio: r.range(0.35, 0.65),
      floors: Math.max(4, Math.floor(h / 4)),
    });
    const x = side * (16 + d / 2 + r.range(0, 2));
    b.position.set(x, 0, z);
    b.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(b);
    z -= d + r.range(2, 7);
    i++;
  }
}

// ---- palms along a road ----
export function makePalmRow(scene, xs, zStart, zEnd, step, seedBase) {
  const r = makeRng(seedBase);
  for (let z = zStart, i = 0; z > zEnd; z -= step, i++) {
    const p = makePalm(seedBase + i);
    p.position.set(xs + r.range(-0.6, 0.6), 0, z);
    scene.add(p);
  }
}
