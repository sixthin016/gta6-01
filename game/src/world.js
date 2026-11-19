// Neon Bay — world.js
// Two jobs: build the three.js scene (golden-hour sky, city, beach, water,
// neon, rain, helicopter, shop/safehouse interiors, wet streets) and run
// the simulation (driving, traffic, police escalation, wanted stars,
// weapons, NOS, garage, crew + crew perks, respect, the hurricane
// countdown, shops, safehouses, exploding cars and all sixteen missions).
// Meshes live on the entities so render.js can sync them every frame.

import * as THREE from 'three';
import {
  CONFIG, POLICE, GARAGE_UPGRADES, SHOPS, SAFEHOUSES, SHOP_ITEMS,
  SAFEHOUSE_COST, SHOP_RADIUS, SAFEHOUSE_RADIUS, EXPLOSION,
} from './config.js';
import {
  generateCity, collideCircle, resolveCircle, nearestIntersection,
  PLACES, RACE_RING, INTERIORS,
} from './city.js';
import { makeRng } from './random.js';
import {
  createPlayer, createPed, createCar, createPoliceCar, createSwatVan, createCop,
  createTarget, createHeli, createCrewFollower, createExplosion,
  driveTraffic, chaseSteer, walkPed, randomRoadSpot,
} from './entities.js';
import { MISSIONS, missionTarget, missionBrief } from './missions.js';

export const EVENT_NONE = 0;
export const EVENT_MISSION_DONE = 1;
export const EVENT_BUSTED = 2;
export const EVENT_WASTED = 4;
export const EVENT_CRIME = 8;
export const EVENT_SHOT = 16;
export const EVENT_ENTER_CAR = 32;
export const EVENT_EXPLOSION = 64;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// ---------------------------------------------------------------------------
// Mesh factories
// ---------------------------------------------------------------------------

function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, emissive: opts.emissive ?? 0x000000 }),
  );
  m.castShadow = opts.shadow !== false;
  m.receiveShadow = true;
  return m;
}

export function makeCarMesh(color, kind = 'sedan') {
  const g = new THREE.Group();
  const len = kind === 'van' ? 5.6 : kind === 'coupe' ? 4.0 : 4.4;
  const body = box(2.0, kind === 'van' ? 1.6 : 0.62, len, color);
  body.position.y = kind === 'van' ? 1.1 : 0.55;
  g.add(body);
  if (kind !== 'van') {
    const cabin = box(1.7, 0.55, 2.0, 0x18242f, { emissive: 0x0a1420 });
    cabin.position.set(0, 1.05, kind === 'coupe' ? -0.2 : 0.1);
    g.add(cabin);
  }
  if (kind === 'police' || kind === 'swat') {
    const band = box(2.02, 0.2, 1.1, 0x111111);
    band.position.set(0, 0.62, 0);
    g.add(band);
    const bar = box(0.9, 0.14, 0.5, 0xffffff, { emissive: 0x882222 });
    bar.position.set(0, 1.42, 0.1);
    bar.name = 'lightbar';
    g.add(bar);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    w.castShadow = true;
    g.add(w);
  }
  const head = box(1.6, 0.12, 0.1, 0xfff8c9, { emissive: 0x777744 });
  head.position.set(0, 0.6, len / 2);
  g.add(head);
  // NOS flame cone at the rear, hidden until boosting.
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.6, 8),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 }),
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0.55, -len / 2 - 0.7);
  flame.name = 'nosflame';
  flame.visible = false;
  g.add(flame);
  return g;
}

export function makePersonMesh(shirt, skin, isCop = false) {
  const g = new THREE.Group();
  const legs = box(0.5, 0.8, 0.3, isCop ? 0x1c2733 : 0x3a3f4a);
  legs.position.y = 0.4;
  g.add(legs);
  const torso = box(0.62, 0.75, 0.36, isCop ? 0x22384f : shirt);
  torso.position.y = 1.15;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.78;
  head.castShadow = true;
  g.add(head);
  if (isCop) {
    const cap = box(0.5, 0.1, 0.5, 0x0f1c2b);
    cap.position.y = 2.0;
    g.add(cap);
  }
  return g;
}

export function makeHeliMesh() {
  const g = new THREE.Group();
  const body = box(2.2, 1.2, 4.6, 0x22384f);
  body.position.y = 0;
  g.add(body);
  const tail = box(0.5, 0.5, 3.4, 0x22384f);
  tail.position.set(0, 0.3, -3.6);
  g.add(tail);
  const glass = box(1.9, 0.7, 1.4, 0x9fd8ff, { emissive: 0x224466 });
  glass.position.set(0, 0.2, 1.8);
  g.add(glass);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x111111 }));
  rotor.position.y = 0.9;
  rotor.name = 'rotor';
  g.add(rotor);
  const spot = new THREE.SpotLight(0xfff2cc, 60, 120, 0.35, 0.4, 1.2);
  spot.position.set(0, -0.6, 0);
  spot.target.position.set(0, -40, 0);
  spot.name = 'spotlight';
  g.add(spot);
  g.add(spot.target);
  return g;
}

function makeRoadblockMesh() {
  const g = new THREE.Group();
  const stripe = box(5.4, 0.9, 0.5, 0xff6d00, { emissive: 0x662200 });
  stripe.position.y = 0.9;
  g.add(stripe);
  const stripe2 = box(5.4, 0.9, 0.5, 0xffffff, { emissive: 0x333333 });
  stripe2.position.y = 0.45;
  g.add(stripe2);
  for (const sx of [-2.4, 2.4]) {
    const leg = box(0.3, 0.9, 0.3, 0x333333);
    leg.position.set(sx, 0.45, 0);
    g.add(leg);
  }
  return g;
}

function neonTexture(text, colorHex) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#0a0a14';
  x.fillRect(0, 0, 256, 64);
  x.font = 'bold 40px system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.shadowColor = colorHex;
  x.shadowBlur = 18;
  x.fillStyle = colorHex;
  x.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A shop / safehouse interior: a simple lit room off the city grid, with a
// counter or a bed, a warm lamp and a glowing door mat. The door sits on
// the south wall; E at the mat steps back outside.
function makeInteriorRoom(room, kind) {
  const g = new THREE.Group();
  const floorColor = kind === 'shop' ? 0x7a5a38 : 0x4a3f5e;
  const wallColor = kind === 'shop' ? 0x9a8a72 : 0x6a5a7a;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(room.w, room.d),
    new THREE.MeshLambertMaterial({ color: floorColor }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(room.x, 0.02, room.z);
  floor.receiveShadow = true;
  g.add(floor);
  const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
  const HGT = 4.2, TH = 0.5;
  function wall(w, d, x, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, HGT, d), wallMat);
    m.position.set(x, HGT / 2, z);
    m.castShadow = true;
    g.add(m);
  }
  wall(room.w, TH, room.x, room.z - room.d / 2); // north
  wall(TH, room.d, room.x - room.w / 2, room.z); // west
  wall(TH, room.d, room.x + room.w / 2, room.z); // east
  const side = (room.w - 3) / 2; // south wall with a 3-wide door gap
  wall(side, TH, room.x - room.w / 2 + side / 2, room.z + room.d / 2);
  wall(side, TH, room.x + room.w / 2 - side / 2, room.z + room.d / 2);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.2),
    new THREE.MeshBasicMaterial({ color: 0x7dff8a, transparent: true, opacity: 0.7 }));
  door.rotation.x = -Math.PI / 2;
  door.position.set(room.x, 0.06, room.z + room.d / 2 - 1);
  g.add(door);
  if (kind === 'shop') {
    const counter = box(7, 1.1, 1.4, 0x5a3a22);
    counter.position.set(room.x, 0.55, room.z - room.d / 2 + 2);
    g.add(counter);
    const shelf = box(4, 2.2, 1, 0x3a2a1a);
    shelf.position.set(room.x - room.w / 2 + 1.5, 1.1, room.z - 1);
    g.add(shelf);
    const shelf2 = box(4, 2.2, 1, 0x3a2a1a);
    shelf2.position.set(room.x + room.w / 2 - 1.5, 1.1, room.z - 1);
    g.add(shelf2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5),
      new THREE.MeshBasicMaterial({ map: neonTexture('SHOP', '#7dff8a'), transparent: true }));
    sign.position.set(room.x, 3.4, room.z - room.d / 2 + 0.4);
    g.add(sign);
  } else {
    const bed = box(2.2, 0.6, 4.2, 0x2ec4b6);
    bed.position.set(room.x - room.w / 2 + 2.5, 0.3, room.z - 2);
    g.add(bed);
    const table = box(2, 0.9, 1.2, 0x5a3a22);
    table.position.set(room.x + room.w / 2 - 3, 0.45, room.z - room.d / 2 + 2);
    g.add(table);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    lamp.position.set(room.x + room.w / 2 - 3, 1.4, room.z - room.d / 2 + 2);
    g.add(lamp);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5),
      new THREE.MeshBasicMaterial({ map: neonTexture('SAFE', '#ffd166'), transparent: true }));
    sign.position.set(room.x, 3.4, room.z - room.d / 2 + 0.4);
    g.add(sign);
  }
  const light = new THREE.PointLight(0xffc37a, 80, 30, 1.6);
  light.position.set(room.x, 3.4, room.z);
  g.add(light);
  return g;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function createWorld3D(seed) {
  const city = generateCity(seed);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xff9a52, 280, 700);
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 1500);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Golden-hour sky dome: warm horizon fading to blue, darkening as the storm grows.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      storm: { value: 0 },
      topColor: { value: new THREE.Color(0x2b4a8f) },
      horizonColor: { value: new THREE.Color(0xff8c42) },
      stormTop: { value: new THREE.Color(0x0d1420) },
      stormHorizon: { value: new THREE.Color(0x4a5568) },
    },
    vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vPos; uniform float storm;
      uniform vec3 topColor, horizonColor, stormTop, stormHorizon;
      void main(){
        float h = normalize(vPos).y * 0.5 + 0.5;
        vec3 top = mix(topColor, stormTop, storm);
        vec3 hor = mix(horizonColor, stormHorizon, storm);
        gl_FragColor = vec4(mix(hor, top, smoothstep(0.52, 0.82, h)), 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xffe0b3, 0x4a7a3a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd166, 1.9);
  sun.position.set(180, 120, 60); // low golden-hour sun
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 800;
  scene.add(sun);
  scene.add(sun.target);

  const H = CONFIG.worldSize / 2;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2),
    new THREE.MeshLambertMaterial({ color: 0x3f7a4a }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(city.waterX - city.beachX + 4, H * 2),
    new THREE.MeshLambertMaterial({ color: 0xe8c47c }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set((city.beachX + city.waterX) / 2, 0.02, 0);
  sand.receiveShadow = true;
  scene.add(sand);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x0e6e8c, transparent: true, opacity: 0.92 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(140, H * 2 + 400), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(city.waterX + 70, 0.05, 0);
  scene.add(water);

  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2d34 });
  const dashMat = new THREE.MeshLambertMaterial({ color: 0xf5d76e });
  for (const v of city.lines) {
    const rv = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.roadWidth, H * 2), roadMat);
    rv.rotation.x = -Math.PI / 2; rv.position.set(v, 0.03, 0); rv.receiveShadow = true;
    scene.add(rv);
    const rh = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, CONFIG.roadWidth), roadMat);
    rh.rotation.x = -Math.PI / 2; rh.position.set(0, 0.03, v); rh.receiveShadow = true;
    scene.add(rh);
    for (let d = -H + 12; d < H; d += 24) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(v, 0.05, d);
      scene.add(dash);
    }
  }
  const winMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0x554411 });
  for (const b of city.buildings) {
    const m = box(b.w, b.h, b.d, b.color);
    m.position.set(b.x + b.w / 2, b.h / 2, b.z + b.d / 2);
    scene.add(m);
    const roof = box(b.w + 0.3, 0.4, b.d + 0.3, b.roof);
    roof.position.set(b.x + b.w / 2, b.h + 0.2, b.z + b.d / 2);
    scene.add(roof);
    const floors = Math.max(1, Math.floor(b.h / 6));
    for (let f = 0; f < floors; f += 1) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(b.w - 2, 6), 1.2), winMat);
      win.position.set(b.x + b.w / 2, 3 + f * 6, b.z + b.d / 2 + 0.06);
      scene.add(win);
    }
  }
  // Neon signs: glowing canvas textures on downtown faces, plus an
  // additive glow copy that fades in with the rain (wet neon reflections).
  const signGlows = [];
  for (const s of city.signs) {
    const colorCss = `#${s.color.toString(16).padStart(6, '0')}`;
    const tex = neonTexture(s.text, colorCss);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.set(s.x, 7, s.z);
    scene.add(sign);
    const glow = sign.clone();
    glow.material = sign.material.clone();
    glow.material.blending = THREE.AdditiveBlending;
    glow.material.opacity = 0;
    glow.scale.set(1.18, 1.18, 1);
    glow.position.z -= 0.15;
    scene.add(glow);
    signGlows.push(glow);
  }
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a33 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e4f });
  const palmTops = [];
  for (const p of city.palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.4, 8), trunkMat);
    trunk.position.set(p.x, 1.7, p.z);
    trunk.castShadow = true;
    scene.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.6, 8), leafMat);
    top.position.set(p.x, 4.0, p.z);
    top.castShadow = true;
    scene.add(top);
    palmTops.push(top);
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xaa8833 });
  for (const l of city.lamps) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 8), poleMat);
    pole.position.set(l.x, 2.1, l.z);
    scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bulbMat);
    bulb.position.set(l.x, 4.3, l.z);
    scene.add(bulb);
  }
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.position.y = 30;
  scene.add(beacon);
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: 0xffd700 }));
  marker.position.y = 4;
  scene.add(marker);
  // Race checkpoint ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.35, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 }));
  ring.position.y = 3;
  ring.visible = false;
  scene.add(ring);
  // Rain: a point cloud that falls harder as the storm grows.
  const rainCount = 900;
  const rainPos = new Float32Array(rainCount * 3);
  const rng = makeRng(seed + 7);
  for (let i = 0; i < rainCount; i += 1) {
    rainPos[i * 3] = rng.range(-260, 260);
    rainPos[i * 3 + 1] = rng.range(0, 60);
    rainPos[i * 3 + 2] = rng.range(-260, 260);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 0.35, transparent: true, opacity: 0 }));
  scene.add(rain);

  // Wet streets: once the hurricane rain starts, a glossy overlay sheens
  // the ground and reflective puddles appear at intersections, while the
  // neon signs glow harder. Golden hour stays dry — opacity is 0 until
  // the storm builds (render.js drives these from the storm level).
  const wetMat = new THREE.MeshPhongMaterial({
    color: 0x14273d, specular: 0x8fb4ff, shininess: 160,
    transparent: true, opacity: 0, depthWrite: false,
  });
  const wetOverlay = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), wetMat);
  wetOverlay.rotation.x = -Math.PI / 2;
  wetOverlay.position.y = 0.045;
  scene.add(wetOverlay);
  const puddles = [];
  for (let i = 0; i < 22; i += 1) {
    const px = city.lines[Math.floor(rng.next() * city.lines.length)];
    const pz = city.lines[Math.floor(rng.next() * city.lines.length)];
    if (px > 180) continue; // keep puddles off the beach
    const r = rng.range(2.5, 5.5);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(r, 20),
      new THREE.MeshPhongMaterial({
        color: 0x1a2f4a, specular: 0xbdd8ff, shininess: 200,
        transparent: true, opacity: 0, depthWrite: false,
      }));
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(px + rng.range(-2, 2), 0.06, pz + rng.range(-2, 2));
    scene.add(puddle);
    puddles.push(puddle);
  }

  // Shop + safehouse interiors, off the city grid.
  scene.add(makeInteriorRoom(INTERIORS.shop, 'shop'));
  scene.add(makeInteriorRoom(INTERIORS.safehouse, 'safehouse'));
  const rooms = {
    shop: { ...INTERIORS.shop, door: { x: INTERIORS.shop.x, z: INTERIORS.shop.z + INTERIORS.shop.d / 2 - 1 } },
    safehouse: { ...INTERIORS.safehouse, door: { x: INTERIORS.safehouse.x, z: INTERIORS.safehouse.z + INTERIORS.safehouse.d / 2 - 1 } },
  };

  return { scene, camera, renderer, city, sun, hemi, skyMat, waterMat, beacon, marker, ring, rain, palmTops, wetOverlay, puddles, signGlows, rooms };
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export function createGame(w3d, seed) {
  const rng = makeRng(seed);
  const { scene, city } = w3d;
  const lines = city.lines;
  const state = {
    rng, city, seed,
    player: createPlayer(-104, -80),
    cars: [], peds: [], cops: [], policeCars: [], swatVans: [],
    targets: [], followers: [], roadblocks: [],
    heli: null,
    time: 0, clockMinutes: 17 * 60 + 40, // golden hour: 17:40
    missionIndex: 0, missionStage: 0, missionTimer: 0,
    robProgress: 0, waitProgress: 0, surviveLeft: 0, raceCheckpoint: 0,
    banner: null, bannerTimer: 0, message: null, messageTimer: 0,
    wantedTimer: 0, crimeTimer: 99, sirenOn: false,
    respect: 0, hurricaneLeft: CONFIG.hurricaneMinutes * 60,
    upgrades: { engine: 0, tires: 0, nos: 0, armor: 0 },
    radioStation: 0, shotCam: null,
    stats: { carsStolen: 0, missionsDone: 0, arrests: 0, racesWon: 0 },
    started: false, playerMesh: null,
    tracers: [],
    // Round 4: shops, safehouses, interiors, explosions, crew perks.
    shopOpen: false, interior: null, saveRequested: false,
    nearShop: null, nearSafehouse: null,
    explosions: [], maraFireTimer: 0, explosionEvent: false,
  };

  const stormLevel = () => clamp(1 - state.hurricaneLeft / (CONFIG.hurricaneMinutes * 60), 0, 1);
  const blockers = () => state.roadblocks.map((r) => ({ x: r.x, z: r.z, r: 2.6 }));
  const hasFollower = (name) => state.followers.some((f) => f.name === name);

  function say(text, seconds) { state.message = text; state.messageTimer = seconds || 4; }
  function banner(text) { state.banner = text; state.bannerTimer = 7; }
  function addWanted(amount) {
    const before = state.player.wanted;
    state.player.wanted = clamp(state.player.wanted + amount, 0, 5);
    state.crimeTimer = 0;
    state.wantedTimer = 0;
    return state.player.wanted > before;
  }
  function addRespect(amount) { state.respect = clamp(state.respect + amount, 0, 100); }

  function carPerf(car) {
    return {
      topSpeed: CONFIG.carMaxSpeed * (1 + 0.12 * state.upgrades.engine) * (car.hp < 30 ? 0.45 : 1),
      turn: CONFIG.carTurn * (1 + 0.15 * state.upgrades.tires),
      nosPower: 1 + 0.25 * state.upgrades.nos,
      hull: 100 + 40 * state.upgrades.armor,
    };
  }

  // --- Shops & safehouses -------------------------------------------------
  function nearestShop(x, z) {
    for (const s of SHOPS) if (dist(x, z, s.x, s.z) < SHOP_RADIUS) return s;
    return null;
  }
  function nearestSafehouse(x, z) {
    for (const s of SAFEHOUSES) if (dist(x, z, s.x, s.z) < SAFEHOUSE_RADIUS) return s;
    return null;
  }

  function enterShop() {
    const p = state.player;
    if (state.interior || p.inCar || !state.nearShop) return false;
    const room = w3d.rooms.shop;
    state.interior = { kind: 'shop', shopId: state.nearShop.id, returnX: p.x, returnZ: p.z };
    p.x = room.x; p.z = room.z - 2; p.angle = -Math.PI / 2; p.speed = 0;
    state.shopOpen = true;
    say(`${state.nearShop.name} — press 1-3 to buy, B to close, E at the green mat to leave.`, 5);
    return true;
  }

  function enterSafehouse() {
    const p = state.player;
    if (state.interior || p.inCar || !state.nearSafehouse) return false;
    if (p.money < SAFEHOUSE_COST) {
      say(`Safehouse costs $${SAFEHOUSE_COST} — you have $${p.money}.`, 4);
      return false;
    }
    p.money -= SAFEHOUSE_COST;
    p.wanted = 0;
    p.hp = Math.min(100, p.hp + 25);
    state.saveRequested = true;
    const room = w3d.rooms.safehouse;
    state.interior = { kind: 'safehouse', safehouseId: state.nearSafehouse.id, returnX: p.x, returnZ: p.z };
    p.x = room.x; p.z = room.z - 2; p.angle = -Math.PI / 2; p.speed = 0;
    say(`Safehouse — $${SAFEHOUSE_COST}. Progress saved, wanted cleared, +25 HP. E at the green mat to leave.`, 6);
    return true;
  }

  function exitInterior() {
    const p = state.player;
    if (!state.interior) return false;
    p.x = state.interior.returnX;
    p.z = state.interior.returnZ;
    p.speed = 0;
    state.interior = null;
    state.shopOpen = false;
    say('Back on the street.', 3);
    return true;
  }

  function buyShopItem(id) {
    const p = state.player;
    if (!state.shopOpen) return false;
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item || p.money < item.cost) {
      if (item) say(`Not enough cash for ${item.name} ($${item.cost}).`, 3);
      return false;
    }
    p.money -= item.cost;
    if (id === 'ammo') {
      for (const w of Object.values(p.weapons)) w.reserve = Math.min(999, w.reserve + 60);
    } else if (id === 'armor') {
      p.hp = Math.min(100, p.hp + 50);
    } else if (id === 'snack') {
      p.hp = Math.min(100, p.hp + 25);
    }
    say(`Bought ${item.name} for $${item.cost}. ${item.desc}`, 3);
    return true;
  }

  // --- Exploding cars ------------------------------------------------------
  function startSmoking(car) {
    if (car.smoking || !car.mesh) return;
    car.smoking = true;
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.7 }),
    );
    smoke.position.set(0, 1.8, 0);
    smoke.name = 'smoke';
    car.mesh.add(smoke);
  }

  function explodeCar(car) {
    if (car.exploded) return;
    car.exploded = true;
    car.hp = 0;
    car.speed = 0;
    if (car.mesh) {
      const smoke = car.mesh.getObjectByName('smoke');
      if (smoke) car.mesh.remove(smoke);
      // The wreck: a blackened shell that can never drive again.
      car.mesh.traverse((o) => {
        if (o.isMesh && o.material && o.material.color) o.material.color.setHex(0x161616);
      });
    }
    car.kind = 'wreck';
    const ex = createExplosion(car.x, car.z);
    const fireball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.95 }),
    );
    fireball.position.set(car.x, 1.5, car.z);
    scene.add(fireball);
    ex.mesh = fireball;
    state.explosions.push(ex);
    state.explosionEvent = true;
    const p = state.player;
    if (p.inCar === car) {
      p.inCar = null;
      p.x = car.x + 4; p.z = car.z + 4;
      p.speed = 0;
      say('Your car blew up! You bail out, singed.', 4);
    }
    const pd = dist(p.x, p.z, car.x, car.z);
    if (pd < EXPLOSION.radius) {
      p.hp -= pd < 6 ? EXPLOSION.playerDamage : Math.floor(EXPLOSION.playerDamage / 2);
    }
    for (const ped of state.peds) {
      if (ped.hp > 0 && dist(ped.x, ped.z, car.x, car.z) < EXPLOSION.radius) ped.hp = 0;
    }
    for (const cop of [...state.cops]) {
      if (dist(cop.x, cop.z, car.x, car.z) < EXPLOSION.radius) {
        cop.hp = 0;
        if (cop.mesh) scene.remove(cop.mesh);
        state.cops = state.cops.filter((c) => c !== cop);
      }
    }
    for (const t of [...state.targets]) {
      if (t.hp > 0 && dist(t.x, t.z, car.x, car.z) < EXPLOSION.radius) {
        t.hp = 0;
        if (t.mesh) scene.remove(t.mesh);
        state.targets = state.targets.filter((x) => x !== t);
      }
    }
    for (const other of [...state.cars, ...state.policeCars, ...state.swatVans]) {
      if (other !== car && !other.exploded && dist(other.x, other.z, car.x, car.z) < EXPLOSION.radius) {
        other.hp -= EXPLOSION.carDamage;
        other.lastHitByPlayer = car.lastHitByPlayer;
      }
    }
    if (car.lastHitByPlayer && addWanted(EXPLOSION.wanted)) {
      say('That explosion drew the whole Bay PD!', 4);
    }
  }

  function checkExplosions() {
    for (const car of [...state.cars, ...state.policeCars, ...state.swatVans]) {
      if (car.hp <= 0 && !car.exploded) explodeCar(car);
      else if (car.hp <= EXPLOSION.smokeHp && !car.smoking && !car.exploded) startSmoking(car);
    }
  }

  function spawnAll() {
    for (const c of [...state.cars, ...state.policeCars, ...state.swatVans]) if (c.mesh) scene.remove(c.mesh);
    for (const p of [...state.peds, ...state.cops, ...state.targets, ...state.followers]) if (p.mesh) scene.remove(p.mesh);
    if (state.heli && state.heli.mesh) scene.remove(state.heli.mesh);
    if (state.playerMesh) scene.remove(state.playerMesh);
    for (const ex of state.explosions) if (ex.mesh) scene.remove(ex.mesh);
    state.explosions = [];
    state.cars = []; state.peds = []; state.cops = []; state.policeCars = []; state.swatVans = [];
    state.targets = []; state.followers = []; state.roadblocks = []; state.heli = null;
    for (const spot of city.parked) {
      const car = createCar(rng, spot.x, spot.z, spot.angle, {
        kind: 'parked', color: spot.color, model: spot.model, mission: spot.mission, id: 100 + state.cars.length,
      });
      car.mesh = makeCarMesh(car.color, car.model);
      scene.add(car.mesh);
      state.cars.push(car);
    }
    for (let i = 0; i < 26; i += 1) {
      const spot = randomRoadSpot(rng, lines);
      const car = createCar(rng, spot.x, spot.z, spot.angle, { kind: 'traffic', speed: 8 + rng.next() * 4, id: i });
      car.mesh = makeCarMesh(car.color, car.model);
      scene.add(car.mesh);
      state.cars.push(car);
    }
    for (let i = 0; i < 30; i += 1) {
      const ped = createPed(rng, rng.range(-200, 180), rng.range(-200, 200));
      ped.mesh = makePersonMesh(ped.shirt, ped.skin);
      scene.add(ped.mesh);
      state.peds.push(ped);
    }
    state.playerMesh = makePersonMesh(0xff7a1a, 0xf2c89b);
    scene.add(state.playerMesh);
  }

  function respawn(reason) {
    const p = state.player;
    const fine = reason === 'busted' ? 100 : 150;
    p.money = Math.max(0, p.money - fine);
    p.hp = 100;
    p.wanted = 0;
    p.inCar = null;
    p.x = 48; p.z = -24;
    p.angle = Math.PI / 2;
    p.invulnerable = 3;
    p.bustedTimer = 0;
    addRespect(-5);
    for (const c of [...state.policeCars, ...state.swatVans]) if (c.mesh) scene.remove(c.mesh);
    for (const c of state.cops) if (c.mesh) scene.remove(c.mesh);
    for (const r of state.roadblocks) if (r.mesh) scene.remove(r.mesh);
    if (state.heli && state.heli.mesh) scene.remove(state.heli.mesh);
    state.policeCars = []; state.swatVans = []; state.cops = []; state.roadblocks = []; state.heli = null;
    state.stats.arrests += 1;
    say(reason === 'busted'
      ? `BUSTED! The Bay PD took $${fine}. You woke up at Bay General.`
      : `WASTED! The Bay PD took $${fine}. You woke up at Bay General.`, 6);
  }

  function completeMission() {
    const mission = MISSIONS[state.missionIndex];
    state.player.money += mission.reward;
    addRespect(4);
    state.stats.missionsDone += 1;
    if (mission.type === 'race') state.stats.racesWon += 1;
    // Ammo top-up and crew unlocks.
    for (const w of Object.values(state.player.weapons)) w.reserve = Math.min(999, w.reserve + 30);
    if (state.missionIndex === 4) addFollower('Jax', 0xff9f1c);
    if (state.missionIndex === 9) addFollower('Mara', 0x2ec4b6);
    if (state.missionIndex === 11) addFollower('Reyes', 0xef476f);
    clearTargets();
    state.missionIndex += 1;
    state.missionStage = 0;
    state.missionTimer = 0;
    state.robProgress = 0;
    state.waitProgress = 0;
    state.surviveLeft = 0;
    state.raceCheckpoint = 0;
    if (state.missionIndex < MISSIONS.length) {
      // Start the next mission properly (timer, survive clock, wanted,
      // targets) — without this a survive/defend mission would complete
      // instantly on arrival with surviveLeft still 0.
      const next = state.missionIndex;
      startMission(next);
      say(`Mission complete! +$${mission.reward} — ${MISSIONS[next].title} unlocked.`, 5);
    } else {
      banner('ROOK: "That\'s all sixteen jobs, kid. The Bay is yours now."');
      say(`All missions done! +$${mission.reward}. Free roam — Neon Bay is yours.`, 6);
    }
    return EVENT_MISSION_DONE;
  }

  function addFollower(name, color) {
    if (state.followers.some((f) => f.name === name)) return;
    const p = state.player;
    const f = createCrewFollower(name, color, p.x + 3, p.z + 3);
    f.mesh = makePersonMesh(color, 0xf2c89b);
    scene.add(f.mesh);
    state.followers.push(f);
    say(`${name} joined your crew!`, 4);
  }

  function clearTargets() {
    for (const t of state.targets) if (t.mesh) scene.remove(t.mesh);
    state.targets = [];
  }

  function startMission(index) {
    state.missionIndex = index;
    state.missionStage = 0;
    state.robProgress = 0;
    state.waitProgress = 0;
    state.raceCheckpoint = 0;
    const m = MISSIONS[index];
    if (m.timeLimit) state.missionTimer = m.timeLimit;
    if (m.surviveSeconds) state.surviveLeft = m.surviveSeconds;
    if (m.startWanted) state.player.wanted = m.startWanted;
    if (m.type === 'shoot') {
      clearTargets();
      for (const t of m.targets) {
        const target = createTarget(t.x, t.z, t.name);
        target.mesh = makePersonMesh(0x8a1a1a, 0xd9a066);
        scene.add(target.mesh);
        state.targets.push(target);
      }
    }
    banner(m.brief);
  }

  function nearestCar(x, z, maxDist) {
    let best = null, bestDist = maxDist;
    for (const car of [...state.cars, ...state.policeCars, ...state.swatVans]) {
      if (car.kind === 'wreck' || car.exploded) continue;
      const d = dist(x, z, car.x, car.z);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    return best;
  }

  function addTracer(fromX, fromZ, toX, toZ) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(fromX, 1.4, fromZ),
      new THREE.Vector3(toX, 1.4, toZ),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe259, transparent: true, opacity: 0.9 }));
    scene.add(line);
    state.tracers.push({ line, life: 0.08 });
  }

  function fireBullet(fromX, fromZ, toX, toZ, byPolice, weaponKey) {
    const w = weaponKey ? { damage: 30, range: 50, spread: 0.03, pellets: 1 } : null;
    const angle = Math.atan2(toZ - fromZ, toX - fromX);
    const dx = Math.cos(angle), dz = Math.sin(angle);
    let hitDist = 60;
    let hitPed = null, hitCop = null, hitCar = null, hitTarget = null;
    const targets = [];
    for (const ped of state.peds) if (ped.hp > 0) targets.push({ e: ped, r: 1.4, kind: 'ped' });
    for (const cop of state.cops) targets.push({ e: cop, r: 1.4, kind: 'cop' });
    for (const t of state.targets) if (t.hp > 0) targets.push({ e: t, r: 1.4, kind: 'target' });
    for (const car of [...state.cars, ...state.policeCars, ...state.swatVans]) {
      if (!car.exploded) targets.push({ e: car, r: 2.4, kind: 'car' });
    }
    for (const t of targets) {
      const relX = t.e.x - fromX, relZ = t.e.z - fromZ;
      const along = relX * dx + relZ * dz;
      if (along < 0 || along > 60) continue;
      const perp = Math.abs(-relX * dz + relZ * dx);
      if (perp < t.r && along < hitDist) {
        hitDist = along;
        hitPed = t.kind === 'ped' ? t.e : null;
        hitCop = t.kind === 'cop' ? t.e : null;
        hitTarget = t.kind === 'target' ? t.e : null;
        hitCar = t.kind === 'car' ? t.e : null;
      }
    }
    addTracer(fromX, fromZ, fromX + dx * hitDist, fromZ + dz * hitDist);
    let event = EVENT_SHOT;
    const dmg = w ? w.damage : 34;
    if (hitPed) {
      hitPed.hp -= dmg;
      if (hitPed.hp <= 0 && !byPolice && addWanted(1)) event |= EVENT_CRIME;
    } else if (hitCop) {
      hitCop.hp -= dmg;
      if (hitCop.hp <= 0) {
        if (hitCop.mesh) scene.remove(hitCop.mesh);
        state.cops = state.cops.filter((c) => c !== hitCop);
        if (!byPolice && addWanted(2)) event |= EVENT_CRIME;
      }
    } else if (hitTarget) {
      hitTarget.hp -= dmg;
      if (hitTarget.hp <= 0) {
        if (hitTarget.mesh) scene.remove(hitTarget.mesh);
        state.targets = state.targets.filter((t) => t !== hitTarget);
        say(`${hitTarget.name} down! ${state.targets.length} left.`, 2);
      }
    } else if (hitCar) {
      hitCar.hp -= dmg;
      hitCar.damage += dmg;
      if (!byPolice) hitCar.lastHitByPlayer = true;
      if (!byPolice && hitCar.kind !== 'police' && hitCar.kind !== 'swat' && addWanted(1)) event |= EVENT_CRIME;
    }
    if (byPolice) {
      const p = state.player;
      const coverFactor = p.cover ? 0.2 : 0.45;
      if (dist(fromX, fromZ, p.x, p.z) < 60 && p.invulnerable <= 0 && rng.next() < coverFactor) p.hp -= 9;
    }
    return event;
  }

  function updateMissions(dt, input) {
    const p = state.player;
    const idx = state.missionIndex;
    if (idx >= MISSIONS.length) return EVENT_NONE;
    const m = MISSIONS[idx];
    const target = missionTarget(idx, state.missionStage);
    if (m.timeLimit) {
      state.missionTimer -= dt;
      if (state.missionTimer <= 0) {
        state.missionTimer = m.timeLimit;
        say('Too slow! The job reset — try again.', 4);
        if (m.startWanted) p.wanted = m.startWanted;
        return EVENT_NONE;
      }
    }
    const atTarget = target && dist(p.x, p.z, target.x, target.z) < target.radius;
    if (m.type === 'goto') {
      if (atTarget && p.inCar) return completeMission();
    } else if (m.type === 'steal') {
      if (state.missionStage === 0) {
        const coupe = state.cars.find((c) => c.mission === 2);
        if (p.inCar === coupe) { state.missionStage = 1; say("Got the coupe! Now bring it to Rook's garage.", 4); }
      } else if (atTarget && p.inCar) return completeMission();
    } else if (m.type === 'lose') {
      if (p.wanted === 0) return completeMission();
    } else if (m.type === 'rob' || m.type === 'multi') {
      if (state.missionStage === 0) {
        if (atTarget && !p.inCar) {
          if (input.enterHeld) {
            state.robProgress += dt;
            if (state.robProgress >= 3) {
              state.missionStage = 1;
              state.robProgress = 0;
              p.money += m.type === 'multi' ? 400 : 200;
              addWanted(m.type === 'multi' ? 4 : 3);
              say(`Score! +$${m.type === 'multi' ? 400 : 200} in the bag. Now get to ${PLACES[m.after].name}!`, 5);
            }
          } else state.robProgress = Math.max(0, state.robProgress - dt * 2);
        } else state.robProgress = 0;
      } else if (atTarget) return completeMission();
    } else if (m.type === 'wait') {
      if (atTarget) {
        state.waitProgress += dt;
        if (state.waitProgress >= m.waitSeconds) return completeMission();
      } else state.waitProgress = 0;
    } else if (m.type === 'race') {
      const cp = RACE_RING[state.raceCheckpoint];
      if (cp && dist(p.x, p.z, cp.x, cp.z) < 10 && p.inCar) {
        state.raceCheckpoint += 1;
        say(`Checkpoint ${state.raceCheckpoint}/8!`, 2);
        if (state.raceCheckpoint >= RACE_RING.length) return completeMission();
      }
    } else if (m.type === 'shoot') {
      if (state.targets.length === 0) return completeMission();
    } else if (m.type === 'survive' || m.type === 'defend') {
      // Survive holds a place; defend holds the safehouse against a SWAT wave.
      if (atTarget) {
        state.surviveLeft -= dt;
        if (state.surviveLeft <= 0) return completeMission();
      }
    }
    return EVENT_NONE;
  }

  function ensureRoadblocks(want) {
    const p = state.player;
    if (want && state.roadblocks.length === 0) {
      const ahead = nearestIntersection(p.x + Math.cos(p.angle) * 40, p.z + Math.sin(p.angle) * 40, lines);
      for (const off of [{ x: ahead.x, z: ahead.z }, { x: ahead.x + 26, z: ahead.z }]) {
        const mesh = makeRoadblockMesh();
        mesh.position.set(off.x, 0, off.z);
        scene.add(mesh);
        state.roadblocks.push({ x: off.x, z: off.z, mesh });
      }
      say('ROADBLOCK AHEAD! The Bay PD sealed the street.', 4);
    } else if (!want && state.roadblocks.length > 0) {
      for (const r of state.roadblocks) if (r.mesh) scene.remove(r.mesh);
      state.roadblocks = [];
    }
  }

  function updatePolice(dt) {
    const p = state.player;
    const wanted = p.wanted;
    const tier = POLICE[wanted] || { cars: 0, heli: false, roadblock: false, swat: false };
    const wantCars = tier.cars;
    const defending = MISSIONS[state.missionIndex] && MISSIONS[state.missionIndex].type === 'defend';
    const wantCops = defending ? 4 : (wanted >= 2 ? Math.min(wanted - 1, 3) : 0);
    while (state.policeCars.length < wantCars) {
      const angle = rng.next() * Math.PI * 2;
      const sx = clamp(p.x + Math.cos(angle) * 60, -220, 180);
      const sz = clamp(p.z + Math.sin(angle) * 60, -220, 220);
      const spot = nearestIntersection(sx, sz, lines);
      const car = createPoliceCar(rng, spot.x, spot.z);
      car.mesh = makeCarMesh(0x111111, 'police');
      scene.add(car.mesh);
      state.policeCars.push(car);
    }
    while (state.policeCars.length > wantCars) {
      const car = state.policeCars.pop();
      if (car.mesh) scene.remove(car.mesh);
    }
    while (state.cops.length < wantCops) {
      const angle = rng.next() * Math.PI * 2;
      const cop = createCop(rng, clamp(p.x + Math.cos(angle) * 30, -230, 230), clamp(p.z + Math.sin(angle) * 30, -230, 230), defending);
      cop.mesh = makePersonMesh(0x22384f, 0xd9a066, true);
      scene.add(cop.mesh);
      state.cops.push(cop);
    }
    while (state.cops.length > wantCops + (state.swatVans.length > 0 ? 2 : 0)) {
      const cop = state.cops.pop();
      if (cop.mesh) scene.remove(cop.mesh);
    }
    // SWAT van at 5 stars.
    if (tier.swat && state.swatVans.length === 0) {
      const spot = nearestIntersection(p.x + 50, p.z, lines);
      const van = createSwatVan(rng, spot.x, spot.z);
      van.mesh = makeCarMesh(0x1c2733, 'swat');
      scene.add(van.mesh);
      state.swatVans.push(van);
      for (let i = 0; i < 2; i += 1) {
        const cop = createCop(rng, p.x + 20 + i * 4, p.z + 10, true);
        cop.mesh = makePersonMesh(0x1c2733, 0xd9a066, true);
        scene.add(cop.mesh);
        state.cops.push(cop);
      }
      say('SWAT is on the street! Five stars — survive or surrender.', 5);
    } else if (!tier.swat && state.swatVans.length > 0) {
      for (const v of state.swatVans) if (v.mesh) scene.remove(v.mesh);
      state.swatVans = [];
    }
    // Helicopter at 4-5 stars.
    if (tier.heli && !state.heli) {
      const heli = createHeli(p.x + 38, p.z - 10);
      heli.y = 14;
      heli.mesh = makeHeliMesh();
      scene.add(heli.mesh);
      state.heli = heli;
      say('Air One is overhead! The helicopter spotlight is on you.', 4);
    } else if (!tier.heli && state.heli) {
      if (state.heli.mesh) scene.remove(state.heli.mesh);
      state.heli = null;
    }
    if (state.heli) {
      const h = state.heli;
      const dx = p.x - h.x, dz = p.z - h.z;
      const d = Math.hypot(dx, dz) || 1;
      h.x += (dx / d) * h.speed * dt;
      h.z += (dz / d) * h.speed * dt;
      h.angle = Math.atan2(dz, dx);
      h.rotor += dt * 30;
    }
    ensureRoadblocks(tier.roadblock);
    state.sirenOn = wanted > 0;
    for (const car of [...state.policeCars, ...state.swatVans]) {
      chaseSteer(car, p.x, p.z, dt, 30 + wanted * 2,
        (x, z) => Boolean(collideCircle(city, x, z, 2, blockers())));
      car.ramTimer = Math.max(0, car.ramTimer - dt);
      if (p.inCar && dist(car.x, car.z, p.x, p.z) < 4.5 && car.ramTimer <= 0) {
        car.ramTimer = 0.6;
        p.inCar.hp -= 6;
        p.inCar.damage += 6;
        car.speed *= 0.7;
      }
    }
    for (const cop of state.cops) {
      const d = dist(cop.x, cop.z, p.x, p.z);
      const angle = Math.atan2(p.z - cop.z, p.x - cop.x);
      cop.angle = angle;
      cop.x += Math.cos(angle) * cop.speed * dt;
      cop.z += Math.sin(angle) * cop.speed * dt;
      cop.walkPhase += dt * 10;
      const fixed = resolveCircle(city, cop.x, cop.z, cop.radius, blockers());
      cop.x = fixed.x; cop.z = fixed.z;
      cop.shootCooldown -= dt;
      if (wanted >= 3 && d < 30 && d > 4 && cop.shootCooldown <= 0) {
        cop.shootCooldown = cop.kind === 'swat' ? 0.7 : rng.range(0.9, 1.6);
        fireBullet(cop.x, cop.z, p.x, p.z, true);
      }
      if (!p.inCar && d < 2 && p.invulnerable <= 0) {
        p.bustedTimer += dt;
        if (p.bustedTimer > 1.2) { respawn('busted'); return EVENT_BUSTED; }
      } else p.bustedTimer = 0;
    }
    return EVENT_NONE;
  }

  function updateWanted(dt) {
    const p = state.player;
    if (p.wanted === 0) return;
    state.crimeTimer += dt;
    const nearestPolice = Math.min(
      ...state.policeCars.map((c) => dist(c.x, c.z, p.x, p.z)),
      ...state.cops.map((c) => dist(c.x, c.z, p.x, p.z)),
      state.heli ? 20 : 99999,
      99999,
    );
    const unseenFor = state.heli ? 999 : 9; // heli keeps the heat on
    if (state.crimeTimer > unseenFor && nearestPolice > 45) {
      state.wantedTimer += dt;
      if (state.wantedTimer >= 14) {
        state.wantedTimer = 0;
        p.wanted -= 1;
        if (p.wanted === 0) say('You lost them. The heat is off — for now.', 4);
      }
    } else state.wantedTimer = 0;
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    p.punchCooldown = Math.max(0, p.punchCooldown - dt);
    p.shootCooldown = Math.max(0, p.shootCooldown - dt);
    p.reloadTimer = Math.max(0, p.reloadTimer - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);

    // Inside a shop / safehouse: walk the room, E at the green mat to leave.
    if (state.interior) {
      const room = INTERIORS[state.interior.kind];
      const len = Math.hypot(input.ax, input.ay) || 1;
      const speed = (input.run ? CONFIG.runSpeed : CONFIG.walkSpeed);
      const mx = (input.ax / len) * speed * (input.ax || input.ay ? 1 : 0);
      const mz = (input.ay / len) * speed * (input.ax || input.ay ? 1 : 0);
      const yaw = input.camYaw || 0;
      const vx = mx * Math.cos(yaw) - mz * Math.sin(yaw);
      const vz = mx * Math.sin(yaw) + mz * Math.cos(yaw);
      if (input.ax || input.ay) {
        p.angle = Math.atan2(vz, vx);
        p.walkPhase += dt * (input.run ? 13 : 9);
      }
      p.x = clamp(p.x + vx * dt, room.x - room.w / 2 + 1.5, room.x + room.w / 2 - 1.5);
      p.z = clamp(p.z + vz * dt, room.z - room.d / 2 + 1.5, room.z + room.d / 2 - 1.5);
      p.speed = Math.hypot(vx, vz);
      const door = w3d.rooms[state.interior.kind].door;
      if (input.enter && dist(p.x, p.z, door.x, door.z) < 3) exitInterior();
      return EVENT_NONE;
    }

    if (p.inCar) {
      const car = p.inCar;
      const perf = carPerf(car);
      const boosting = input.nos && p.nos > 0;
      if (boosting) p.nos = Math.max(0, p.nos - CONFIG.nosDrain * dt);
      // Jax (driver) perk: NOS refills twice as fast while he follows.
      else p.nos = Math.min(CONFIG.nosCapacity, p.nos + CONFIG.nosRefill * (hasFollower('Jax') ? 2 : 1) * dt);
      // Reyes (fixer) perk: the car slowly self-repairs while he follows.
      if (hasFollower('Reyes') && car.hp > 0) car.hp = Math.min(perf.hull, car.hp + 2.5 * dt);
      if (input.ay < 0) car.speed += CONFIG.carAccel * dt;
      else if (input.ay > 0) {
        if (car.speed > 2) car.speed -= CONFIG.carBrake * dt;
        else car.speed -= CONFIG.carAccel * 0.6 * dt;
      } else car.speed -= car.speed * 0.5 * dt;
      let maxSpeed = car.hp > 0 ? perf.topSpeed : 0;
      if (boosting) maxSpeed *= CONFIG.nosBoost * perf.nosPower;
      car.speed = clamp(car.speed, -12, maxSpeed);
      const turnFactor = Math.max(0.3, Math.min(1, Math.abs(car.speed) / 14)) * (car.speed >= 0 ? 1 : -1);
      car.angle += input.ax * perf.turn * turnFactor * dt;
      const freed = resolveCircle(city, car.x, car.z, 1.8, blockers());
      car.x = freed.x; car.z = freed.z;
      const stepX = Math.cos(car.angle) * car.speed * dt;
      const stepZ = Math.sin(car.angle) * car.speed * dt;
      const hitX = collideCircle(city, car.x + stepX, car.z, 1.8, blockers());
      const hitZ = collideCircle(city, car.x, car.z + stepZ, 1.8, blockers());
      if (!hitX) car.x += stepX;
      if (!hitZ) car.z += stepZ;
      if (hitX || hitZ) {
        car.speed *= -0.25;
        car.hp -= 9;
        car.damage += 9;
      }
      for (const ped of state.peds) {
        if (ped.hp <= 0) continue;
        if (dist(car.x, car.z, ped.x, ped.z) < 2.6 && Math.abs(car.speed) > 5) {
          ped.hp = 0;
          car.speed *= 0.85;
          car.hp -= 3;
          addWanted(1);
        }
      }
      for (const other of [...state.cars, ...state.policeCars, ...state.swatVans]) {
        if (other === car || other.exploded) continue;
        const d = dist(car.x, car.z, other.x, other.z);
        if (d < 4.2 && d > 0.01) {
          const push = (4.2 - d) / 2;
          const ux = (car.x - other.x) / d, uz = (car.z - other.z) / d;
          car.x += ux * push; car.z += uz * push;
          if (other.kind !== 'parked') { other.x -= ux * push; other.z -= uz * push; }
          if (Math.abs(car.speed) > 8 && car.bumpTimer <= 0) {
            // A hard ram at speed wrecks the other car — fast enough and it blows.
            const hard = Math.abs(car.speed) > 20;
            car.speed *= 0.6;
            car.hp -= hard ? 10 : 5;
            other.hp -= hard ? 30 : 5;
            other.lastHitByPlayer = true;
            car.bumpTimer = 0.5;
          }
        }
      }
      car.bumpTimer = Math.max(0, car.bumpTimer - dt);
      p.x = car.x; p.z = car.z; p.angle = car.angle; p.speed = car.speed;
      if (car.mesh) {
        const flame = car.mesh.getObjectByName('nosflame');
        if (flame) flame.visible = boosting && Math.abs(car.speed) > 5;
      }
      if (input.enter) {
        const side = car.angle + Math.PI / 2;
        p.x = car.x + Math.cos(side) * 2.6;
        p.z = car.z + Math.sin(side) * 2.6;
        const fixed = resolveCircle(city, p.x, p.z, p.radius, blockers());
        p.x = fixed.x; p.z = fixed.z;
        p.inCar = null;
        p.speed = 0;
      }
      return EVENT_NONE;
    }

    const len = Math.hypot(input.ax, input.ay) || 1;
    const speed = (input.run ? CONFIG.runSpeed : CONFIG.walkSpeed) * (p.cover ? 0.45 : 1);
    const mx = (input.ax / len) * speed * (input.ax || input.ay ? 1 : 0);
    const mz = (input.ay / len) * speed * (input.ax || input.ay ? 1 : 0);
    const yaw = input.camYaw || 0;
    const vx = mx * Math.cos(yaw) - mz * Math.sin(yaw);
    const vz = mx * Math.sin(yaw) + mz * Math.cos(yaw);
    if (input.ax || input.ay) {
      p.angle = Math.atan2(vz, vx);
      p.walkPhase += dt * (input.run ? 13 : 9);
    }
    const fixedX = resolveCircle(city, p.x + vx * dt, p.z, p.radius, blockers());
    const fixed = resolveCircle(city, fixedX.x, p.z + vz * dt, p.radius, blockers());
    p.x = fixed.x; p.z = fixed.z;
    p.speed = Math.hypot(vx, vz);

    if (input.enter) {
      const car = nearestCar(p.x, p.z, 5.5);
      if (car) {
        const stolen = car.kind === 'parked' || car.kind === 'traffic';
        if (car.kind === 'parked') car.kind = 'traffic';
        p.inCar = car;
        p.x = car.x; p.z = car.z;
        if (stolen) {
          state.stats.carsStolen += 1;
          addWanted(1);
          say('Car stolen! The cops are on to you.', 3);
          return EVENT_ENTER_CAR | EVENT_CRIME;
        }
        return EVENT_ENTER_CAR;
      }
    }
    if (input.punch && p.punchCooldown <= 0) {
      p.punchCooldown = 0.45;
      let hitAnything = false;
      for (const ped of state.peds) {
        if (ped.hp > 0 && dist(p.x, p.z, ped.x, ped.z) < 2.4) {
          ped.hp -= 20;
          if (ped.hp <= 0) addWanted(1);
          hitAnything = true;
        }
      }
      for (const cop of state.cops) {
        if (dist(p.x, p.z, cop.x, cop.z) < 2.4) {
          cop.hp -= 20;
          if (cop.hp <= 0) {
            if (cop.mesh) scene.remove(cop.mesh);
            state.cops = state.cops.filter((c) => c !== cop);
            addWanted(2);
          }
          hitAnything = true;
        }
      }
      if (hitAnything) return EVENT_CRIME;
    }
    if (input.click && p.shootCooldown <= 0 && p.reloadTimer <= 0) {
      const wdef = { pistol: { damage: 34, fireRate: 3.2, spread: 0.02, range: 60, pellets: 1 },
        smg: { damage: 16, fireRate: 9, spread: 0.07, range: 48, pellets: 1 },
        shotgun: { damage: 22, fireRate: 1.1, spread: 0.16, range: 26, pellets: 6 },
        sniper: { damage: 95, fireRate: 0.8, spread: 0.002, range: 160, pellets: 1 } }[p.weapon];
      const slot = p.weapons[p.weapon];
      if (slot.ammo > 0) {
        p.shootCooldown = 1 / wdef.fireRate;
        slot.ammo -= 1;
        for (let i = 0; i < wdef.pellets; i += 1) {
          const spread = (rng.next() - 0.5) * wdef.spread * 2;
          const base = Math.atan2(input.mouseZ - p.z, input.mouseX - p.x) + spread;
          const tx = p.x + Math.cos(base) * wdef.range;
          const tz = p.z + Math.sin(base) * wdef.range;
          fireBullet(p.x, p.z, tx, tz, false, p.weapon);
        }
        if (slot.ammo === 0 && slot.reserve > 0) {
          p.reloadTimer = 1.2;
          slot.ammo = Math.min(12, slot.reserve);
          slot.reserve -= slot.ammo;
          say('Reloading…', 1);
        }
        return EVENT_SHOT;
      }
      say('Out of ammo! Finish a mission to restock.', 3);
    }
    return EVENT_NONE;
  }

  function stepFollowers(dt) {
    const p = state.player;
    for (const f of state.followers) {
      if (p.inCar) {
        // Crew waits by the car when you drive off.
        continue;
      }
      const d = dist(f.x, f.z, p.x, p.z);
      if (d > 6) {
        const a = Math.atan2(p.z - f.z, p.x - f.x);
        f.angle = a;
        f.x += Math.cos(a) * f.speed * dt;
        f.z += Math.sin(a) * f.speed * dt;
        f.walkPhase += dt * 10;
        const fixed = resolveCircle(city, f.x, f.z, f.radius, blockers());
        f.x = fixed.x; f.z = fixed.z;
      }
    }
  }

  // Mara (shooter) perk: cover fire at the nearest cop or target in range.
  function stepCrewAbilities(dt) {
    if (!hasFollower('Mara')) return;
    state.maraFireTimer -= dt;
    if (state.maraFireTimer > 0) return;
    const mara = state.followers.find((f) => f.name === 'Mara');
    if (!mara) return;
    let best = null, bestD = 34;
    for (const cop of state.cops) {
      const d = dist(mara.x, mara.z, cop.x, cop.z);
      if (d < bestD) { bestD = d; best = cop; }
    }
    for (const t of state.targets) {
      if (t.hp <= 0) continue;
      const d = dist(mara.x, mara.z, t.x, t.z);
      if (d < bestD) { bestD = d; best = t; }
    }
    if (!best) return;
    state.maraFireTimer = 1.4;
    fireBullet(mara.x, mara.z, best.x, best.z, false);
  }

  function step(dt, input) {
    state.time += dt;
    state.clockMinutes += dt * 0.5;
    state.hurricaneLeft = Math.max(0, state.hurricaneLeft - dt);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    for (const t of state.tracers) {
      t.life -= dt;
      if (t.life <= 0) { scene.remove(t.line); }
    }
    state.tracers = state.tracers.filter((t) => t.life > 0);
    for (const ex of state.explosions) {
      ex.life -= dt;
      if (ex.mesh) {
        const k = 1 - ex.life / ex.maxLife;
        ex.mesh.scale.setScalar(1 + k * 7);
        ex.mesh.material.opacity = Math.max(0, ex.life / ex.maxLife) * 0.95;
      }
    }
    for (const ex of state.explosions) if (ex.life <= 0 && ex.mesh) scene.remove(ex.mesh);
    state.explosions = state.explosions.filter((ex) => ex.life > 0);

    // Shop / safehouse proximity, for the HUD prompts.
    const p0 = state.player;
    state.nearShop = !state.interior && !p0.inCar ? nearestShop(p0.x, p0.z) : null;
    state.nearSafehouse = !state.interior && !p0.inCar ? nearestSafehouse(p0.x, p0.z) : null;

    let events = stepPlayer(dt, input);
    for (const car of state.cars) {
      if (car.kind === 'traffic' && car !== state.player.inCar && car.hp > 0) {
        driveTraffic(car, dt, [...state.cars, ...state.policeCars, ...state.swatVans], rng, lines);
      }
    }
    const allCars = [...state.cars, ...state.policeCars, ...state.swatVans];
    for (let i = 0; i < allCars.length; i += 1) {
      for (let j = i + 1; j < allCars.length; j += 1) {
        const a = allCars[i], b = allCars[j];
        if (a === state.player.inCar || b === state.player.inCar) continue;
        const d = dist(a.x, a.z, b.x, b.z);
        if (d < 4 && d > 0.01) {
          const push = (4 - d) / 2;
          const ux = (a.x - b.x) / d, uz = (a.z - b.z) / d;
          a.x += ux * push; a.z += uz * push;
          b.x -= ux * push; b.z -= uz * push;
        }
      }
    }
    for (const ped of state.peds) {
      if (ped.hp <= 0) continue;
      let scare = null;
      if (state.player.inCar && Math.abs(state.player.speed) > 15
        && dist(ped.x, ped.z, state.player.x, state.player.z) < 12) {
        scare = { x: state.player.x, z: state.player.z };
      }
      walkPed(ped, dt, scare, rng, lines);
      const fixed = resolveCircle(city, ped.x, ped.z, ped.radius, blockers());
      ped.x = fixed.x; ped.z = fixed.z;
    }
    for (const ped of state.peds) {
      if (ped.hp <= 0) {
        ped.hp += dt * 4;
        if (ped.hp >= 40) {
          ped.hp = 100;
          ped.x = clamp(ped.x + 20, -220, 220);
          ped.z = clamp(ped.z + 20, -220, 220);
        }
      }
    }
    stepFollowers(dt);
    stepCrewAbilities(dt);
    checkExplosions();
    if (state.explosionEvent) {
      state.explosionEvent = false;
      events |= EVENT_EXPLOSION;
    }
    events |= updatePolice(dt);
    if (events & EVENT_BUSTED) return events;
    updateWanted(dt);
    events |= updateMissions(dt, input);
    if (state.player.hp <= 0) {
      respawn('wasted');
      return events | EVENT_WASTED;
    }
    return events;
  }

  function reset() {
    const p = state.player;
    p.x = -104; p.z = -80;
    p.angle = -Math.PI / 2;
    p.hp = 100; p.money = 250; p.wanted = 0;
    p.weapon = 'pistol';
    p.weapons = {
      pistol: { ammo: 12, reserve: 999 },
      smg: { ammo: 32, reserve: 96 },
      shotgun: { ammo: 6, reserve: 24 },
      sniper: { ammo: 5, reserve: 15 },
    };
    p.inCar = null; p.speed = 0; p.invulnerable = 0; p.bustedTimer = 0;
    p.nos = 100; p.cover = false;
    state.time = 0;
    state.clockMinutes = 17 * 60 + 40;
    state.missionIndex = 0; state.missionStage = 0; state.missionTimer = 0;
    state.robProgress = 0; state.waitProgress = 0; state.surviveLeft = 0; state.raceCheckpoint = 0;
    state.banner = null; state.message = null;
    state.respect = 0; state.hurricaneLeft = CONFIG.hurricaneMinutes * 60;
    state.upgrades = { engine: 0, tires: 0, nos: 0, armor: 0 };
    state.radioStation = 0; state.shotCam = null;
    state.stats = { carsStolen: 0, missionsDone: 0, arrests: 0, racesWon: 0 };
    state.shopOpen = false; state.interior = null; state.saveRequested = false;
    state.nearShop = null; state.nearSafehouse = null;
    state.maraFireTimer = 0; state.explosionEvent = false;
    spawnAll();
  }

  function serialize() {
    const p = state.player;
    return {
      money: p.money, missionIndex: state.missionIndex, x: p.x, z: p.z,
      hp: p.hp, respect: state.respect, hurricaneLeft: state.hurricaneLeft,
      upgrades: state.upgrades, radioStation: state.radioStation,
      crew: state.followers.map((f) => f.name),
    };
  }

  function restore(save) {
    reset();
    const p = state.player;
    p.money = save.money ?? 250;
    state.missionIndex = save.missionIndex ?? 0;
    p.x = save.x ?? -104;
    p.z = save.z ?? -80;
    p.hp = save.hp ?? 100;
    state.respect = save.respect ?? 0;
    state.hurricaneLeft = save.hurricaneLeft ?? CONFIG.hurricaneMinutes * 60;
    state.upgrades = save.upgrades ?? { engine: 0, tires: 0, nos: 0, armor: 0 };
    state.radioStation = save.radioStation ?? 0;
    for (const name of save.crew ?? []) {
      const def = { Jax: 0xff9f1c, Mara: 0x2ec4b6, Reyes: 0xef476f }[name];
      if (def !== undefined) addFollower(name, def);
    }
    if (state.missionIndex < MISSIONS.length) banner(missionBrief(state.missionIndex));
  }

  function buyUpgrade(id) {
    const def = GARAGE_UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    if (state.upgrades[id] >= def.max) return false;
    if (state.player.money < def.cost) return false;
    state.player.money -= def.cost;
    state.upgrades[id] += 1;
    say(`${def.name} upgraded to level ${state.upgrades[id]}!`, 3);
    return true;
  }

  spawnAll();
  return {
    state, step, reset, serialize, restore, startMission, buyUpgrade,
    stormLevel, carPerf, addFollower, buyShopItem, enterShop, enterSafehouse,
    exitInterior,
    addPoliceCar(x, z) {
      const car = createPoliceCar(rng, x, z);
      car.mesh = makeCarMesh(0x111111, 'police');
      scene.add(car.mesh);
      state.policeCars.push(car);
      return car;
    },
    missionTarget: (index) => missionTarget(index, state.missionStage),
    say, banner,
  };
}
