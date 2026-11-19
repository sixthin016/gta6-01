// Neon Bay — the island city itself: ground, water, road grid, buildings,
// palms, neon signs, golden-hour sky shader, rain and wet-street puddles.
// Seeded, so ?seed=N rebuilds the same city and traffic.
import * as THREE from 'three';
import { S, WORLD_HALF, ROAD_STEP } from '../core/state.js';
import { makeRng } from '../core/rng.js';
import { DISTRICTS, PLACES } from './districts.js';

const GRID = [-160, -120, -80, -40, 0, 40, 80, 120, 160];

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function groundTexture(rng) {
  return canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#3d4148'; g.fillRect(0, 0, w, h);
    // city blocks: concrete slabs between streets
    const toPx = (v) => ((v + 210) / 420) * w;
    for (let i = 0; i < GRID.length - 1; i++) {
      for (let j = 0; j < GRID.length - 1; j++) {
        const x0 = toPx(GRID[i] + 5), x1 = toPx(GRID[i + 1] - 5);
        const z0 = toPx(GRID[j] + 5), z1 = toPx(GRID[j + 1] - 5);
        g.fillStyle = rng.pick(['#5a5f52', '#54584e', '#60655a', '#4e5348']);
        g.fillRect(x0, z0, x1 - x0, z1 - z0);
      }
    }
    // beach sand on the east edge
    g.fillStyle = '#d9c08a';
    g.fillRect(toPx(168), 0, w - toPx(168), h);
    // speckle noise
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rng.chance(0.5) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
      g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
    }
  });
}

function roadTexture() {
  const t = canvasTexture(64, 256, (g, w, h) => {
    g.fillStyle = '#26282d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3d44';
    g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
    g.fillStyle = '#e8c33d';
    g.fillRect(w / 2 - 2, 20, 4, 60); g.fillRect(w / 2 - 2, 148, 4, 60);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function windowTexture(base, lit) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 12; y < h - 12; y += 22) {
      for (let x = 10; x < w - 10; x += 18) {
        g.fillStyle = Math.random() < 0.45 ? lit : 'rgba(10,14,22,0.9)';
        g.fillRect(x, y, 11, 13);
      }
    }
  });
}

function neonTexture(text, color) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.font = 'bold 56px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 22;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

function makePalm(rng) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 4.6, 6), trunkMat);
  trunk.position.y = 2.3; trunk.rotation.z = rng.range(-0.08, 0.08);
  g.add(trunk);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f9e4f, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.4, 4), frondMat);
    const a = (i / 7) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.1, 4.9, Math.sin(a) * 1.1);
    frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
    frond.scale.set(1, 1, 0.22);
    g.add(frond);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a22, roughness: 1 }));
  nut.position.y = 4.55; g.add(nut);
  return g;
}

function makeBuilding(rng, w, d, h, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = h / 2;
  // rooftop box (AC unit / stairwell)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 1.2, d * 0.3),
    new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 1 }));
  roof.position.y = h / 2 + 0.6;
  m.add(roof);
  // neon edge strip on taller towers
  if (h > 22) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.35, 0.2),
      new THREE.MeshBasicMaterial({ color: rng.pick([0xff4fd8, 0x37e6ff, 0xffd23d, 0xff5a3d]) }));
    strip.position.set(0, h / 2 - 0.8, d / 2 + 0.12);
    m.add(strip);
  }
  return m;
}

export function buildIsland(scene) {
  const rng = makeRng(S.seed * 7919 + 13);
  const city = { palms: [], puddles: [], signs: [], buildings: [], grid: GRID.slice() };
  const group = new THREE.Group();
  scene.add(group);
  city.group = group;

  // --- ground + water
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(430, 430),
    new THREE.MeshStandardMaterial({ map: groundTexture(rng), roughness: 0.95, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0;
  group.add(ground);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.MeshStandardMaterial({ color: 0x1b6f8e, roughness: 0.22, metalness: 0.35, transparent: true, opacity: 0.94 })
  );
  water.rotation.x = -Math.PI / 2; water.position.y = -0.7;
  group.add(water);
  city.water = water;

  // --- roads (grid strips with dashed texture)
  const rTex = roadTexture();
  for (const v of GRID) {
    const mk = (w, l, x, z, alongX) => {
      const t = rTex.clone(); t.needsUpdate = true;
      t.repeat.set(alongX ? 14 : 1, alongX ? 1 : 14);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l),
        new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.06, z);
      group.add(m);
    };
    mk(9, 420, v, 0, false); // street running north-south (constant x)
    mk(420, 9, 0, v, true);  // street running east-west (constant z)
  }

  // --- sky dome shader (golden hour -> storm grey)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      storm: { value: 0 },
      sunDir: { value: new THREE.Vector3(0.55, 0.28, -0.75).normalize() },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float storm; uniform vec3 sunDir;
      void main(){
        float h = clamp(vDir.y, -0.05, 1.0);
        vec3 zen = mix(vec3(0.16,0.34,0.62), vec3(0.10,0.12,0.16), storm);
        vec3 hor = mix(vec3(1.0,0.55,0.22), vec3(0.32,0.30,0.32), storm);
        vec3 col = mix(hor, zen, pow(max(h,0.0), 0.55));
        float sun = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 90.0);
        col += vec3(1.0,0.75,0.4) * sun * (1.0 - storm*0.85);
        float glow = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 6.0);
        col += vec3(0.9,0.45,0.15) * glow * 0.28 * (1.0 - storm);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 24, 16), skyMat);
  scene.add(sky);
  city.skyMat = skyMat;

  // --- lights
  const sun = new THREE.DirectionalLight(0xffb36b, 2.6);
  sun.position.set(220, 130, -300);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x8fb4e8, 0x5a4a38, 0.9);
  scene.add(hemi);
  city.sun = sun; city.hemi = hemi;
  scene.fog = new THREE.Fog(0xd8a06a, 260, 900);

  // --- buildings, one or two per block
  const facades = [
    new THREE.MeshStandardMaterial({ map: windowTexture('#4a4f5e', '#ffd88a'), roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ map: windowTexture('#5e4a4a', '#ffe9a8'), roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ map: windowTexture('#3d4a5e', '#9adcff'), roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ map: windowTexture('#54423a', '#ffb36b'), roughness: 0.85 }),
  ];
  for (let i = 0; i < GRID.length - 1; i++) {
    for (let j = 0; j < GRID.length - 1; j++) {
      const cx = (GRID[i] + GRID[i + 1]) / 2;
      const cz = (GRID[j] + GRID[j + 1]) / 2;
      if (cx > 150) continue; // beach stays open
      // skip the garage / shop / safehouse plots (built separately)
      if (nearPlot(cx, cz)) continue;
      const downtown = cx < -40 && cz < -40;
      const count = rng.chance(0.55) ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = rng.range(10, 20), d = rng.range(10, 20);
        const h = downtown ? rng.range(18, 46) : rng.range(7, 22);
        const b = makeBuilding(rng, w, d, h, rng.pick(facades));
        b.position.x = cx + rng.range(-8, 8) + (k ? 6 : -6);
        b.position.z = cz + rng.range(-8, 8) + (k ? -5 : 5);
        b.rotation.y = rng.chance(0.5) ? 0 : Math.PI / 2;
        group.add(b);
        city.buildings.push(b);
      }
    }
  }

  // --- palms: beach line + scattered along streets
  for (let z = -180; z <= 180; z += 14) {
    if (rng.chance(0.75)) {
      const p = makePalm(rng);
      p.position.set(rng.range(168, 188), 0, z + rng.range(-4, 4));
      group.add(p); city.palms.push(p);
    }
  }
  for (let i = 0; i < 26; i++) {
    const p = makePalm(rng);
    p.position.set(rng.pick(GRID) + rng.range(6, 9), 0, rng.range(-180, 180));
    group.add(p); city.palms.push(p);
  }

  // --- neon signs on rooftops / shop fronts
  const signDefs = [
    ['NEON BAY', 0, 60, -170, 0xff4fd8, 26],
    ['THE STRIP', 40, 26, 40, 0x37e6ff, 20],
    ['PALM ROW', 40, 18, -120, 0x7ed957, 16],
    ['OLD PORT', -120, 18, 40, 0x4db2e8, 16],
    ['DOWNTOWN', -120, 30, -120, 0xe8a33d, 18],
  ];
  for (const [text, x, y, z, color, w] of signDefs) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial({ map: neonTexture(text, '#' + color.toString(16).padStart(6, '0')) }));
    s.position.set(x, y, z);
    s.rotation.y = rng.angle();
    group.add(s); city.signs.push(s);
  }

  // --- landmarks: radio tower, water tower, levee wall
  const tower = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.2, 46, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.6 }));
  mast.position.y = 23; tower.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  beacon.position.y = 47; tower.add(beacon);
  tower.position.set(PLACES.tower.x, 0, PLACES.tower.z);
  group.add(tower);
  city.beacon = beacon;
  const wt = new THREE.Group();
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 6),
    new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 }));
  leg.position.y = 7; wt.add(leg);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(4.4, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x9adcff, roughness: 0.5, metalness: 0.4 }));
  tank.position.y = 16; wt.add(tank);
  wt.position.set(-120, 0, -120);
  group.add(wt);
  const levee = new THREE.Mesh(new THREE.BoxGeometry(4, 7, 120),
    new THREE.MeshStandardMaterial({ color: 0x6a6f76, roughness: 0.95 }));
  levee.position.set(196, 3.5, 40);
  group.add(levee);

  // --- place buildings: garage, shops, safehouses (distinct, lit)
  buildPlace(group, city, PLACES.garage, 0x2a9d8f, "ROOK'S GARAGE", rng);
  for (const s of PLACES.shops) buildPlace(group, city, s, 0xe8a33d, s.name.toUpperCase(), rng);
  for (const s of PLACES.safehouses) buildPlace(group, city, s, 0x7ed957, s.name.toUpperCase(), rng);

  // --- street lamps
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2c2f34, roughness: 0.6, metalness: 0.7 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const gx of GRID) {
    for (const gz of GRID) {
      if (rng.chance(0.6)) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6), lampMat);
      pole.position.set(gx + 5.5, 3.25, gz + 5.5);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), bulbMat);
      bulb.position.set(gx + 5.5, 6.6, gz + 5.5);
      group.add(bulb);
    }
  }

  // --- puddles (appear with the storm: wet streets, neon reflections)
  const puddleMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0,
  });
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(rng.range(4, 10), rng.range(3, 7)), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(rng.pick(GRID) + rng.range(-3, 3), 0.09, rng.range(-180, 180));
    p.rotation.z = rng.angle();
    group.add(p); city.puddles.push(p);
  }
  city.puddleMat = puddleMat;

  // --- rain: one Points cloud, falls in a box around the camera
  const rainCount = 1600;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = rng.range(-60, 60);
    rainPos[i * 3 + 1] = rng.range(0, 40);
    rainPos[i * 3 + 2] = rng.range(-60, 60);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({ color: 0xaaccee, size: 0.35, transparent: true, opacity: 0 });
  const rain = new THREE.Points(rainGeo, rainMat);
  scene.add(rain);
  city.rain = rain; city.rainGeo = rainGeo; city.rainPos = rainPos;

  return city;
}

function nearPlot(x, z) {
  const plots = [PLACES.garage, ...PLACES.shops, ...PLACES.safehouses];
  return plots.some((p) => Math.abs(p.x - x) < 22 && Math.abs(p.z - z) < 22);
}

function buildPlace(group, city, place, color, label, rng) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  base.position.y = 3.5;
  g.add(base);
  // lit interior: warm emissive shopfront
  const front = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.4),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  front.position.set(0, 3.2, 6.05);
  g.add(front);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2),
    new THREE.MeshBasicMaterial({ map: neonTexture(label, '#ffffff') }));
  sign.position.set(0, 8.6, 0);
  sign.rotation.y = 0;
  g.add(sign);
  // beacon ring so the place reads on the minimap and in the world
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23d }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.4;
  g.add(ring);
  g.position.set(place.x, 0, place.z);
  group.add(g);
  city.signs.push(sign);
}

// Per-frame storm update: sky darkens, rain starts, palms bend, streets wet.
export function updateStorm(city, storm, dt, playerPos) {
  if (!city) return;
  city.skyMat.uniforms.storm.value = storm;
  const s = storm;
  city.sun.intensity = 2.6 * (1 - s * 0.75);
  city.sun.color.setHSL(0.08, 0.85, 0.6 - s * 0.25);
  city.hemi.intensity = 0.9 * (1 - s * 0.45);
  if (S.scene) S.scene.fog.color.setHSL(0.08, 0.35, 0.62 - s * 0.35);
  // rain
  const rainOn = Math.max(0, (s - 0.45) / 0.55);
  city.rain.material.opacity = rainOn * 0.75;
  if (rainOn > 0) {
    const pos = city.rainPos;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= dt * 34;
      if (pos[i + 1] < 0) pos[i + 1] = 40;
    }
    city.rainGeo.attributes.position.needsUpdate = true;
    city.rain.position.set(playerPos.x, 0, playerPos.z);
  }
  // wet streets
  city.puddleMat.opacity = Math.max(0, (s - 0.35) / 0.65) * 0.85;
  // palms bend in the rising wind
  const bend = s * 0.35 * Math.sin(S.time * 1.7);
  for (const p of city.palms) p.rotation.z = bend * 0.4;
  // tower beacon blink
  if (city.beacon) city.beacon.material.color.setHex(Math.sin(S.time * 4) > 0 ? 0xff2a2a : 0x551111);
  void DISTRICTS;
}
