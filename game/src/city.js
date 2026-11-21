// city.js — Neon Bay: a 1000x1000 island city with five districts, a road
// grid, a beachfront, a harbour and a two-deck highway. Buildings get
// procedurally painted facades (lit windows, varied colours, neon signs)
// so no plain coloured box ever faces the camera.
import * as THREE from 'three';
import { makeRng } from './rng.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const FACADE_PALETTES = [
  { wall: '#c96f4a', trim: '#f2d8a7', lit: '#ffd98a', dark: '#2c3550' },
  { wall: '#4a7a96', trim: '#d8ecf2', lit: '#ffe9a3', dark: '#1d2b3a' },
  { wall: '#8a5a7d', trim: '#f2c9e0', lit: '#ffd23e', dark: '#241a2e' },
  { wall: '#5a8a5a', trim: '#d8f2c9', lit: '#ffe9a3', dark: '#1a2e22' },
  { wall: '#b09a4a', trim: '#f2e8c9', lit: '#ffcf5e', dark: '#2e2a1a' },
  { wall: '#96504a', trim: '#f2c9c2', lit: '#ffd98a', dark: '#2e1a1a' },
];

const SIGN_WORDS = ['NEON', 'HOTEL', 'CASINO', 'BAR', 'TACOS', '24H', 'PIER', 'CLUB', 'MOTEL', 'SURF'];

export function buildCity(scene) {
  const rng = makeRng(20261121);
  const group = new THREE.Group();
  group.name = 'NeonBayCity';
  scene.add(group);
  const colliders = [];

  // ---------- ground: one painted 2048 canvas over the whole island ----------
  const roads = [];
  function road(x1, z1, x2, z2, w) {
    roads.push({ x1, z1, x2, z2, w });
  }
  // downtown / old-town grid
  for (const x of [-240, -120, 0, 120, 240, 360]) road(x, -240, x, 240, 16);
  for (const z of [-180, -60, 60, 180]) road(-260, z, 480, z, 16);
  road(-280, -460, -280, 460, 18); // beachfront avenue
  road(-460, -240, 460, -240, 18); // north ring
  road(-460, 240, 460, 240, 18); // south ring
  road(-460, -460, -460, 460, 16); // west ring (behind beach)
  road(460, -460, 460, 460, 16); // east ring
  road(-280, 300, 460, 300, 16); // harbour road
  road(180, -480, 180, 480, 22); // highway ground line (deck above it)

  const groundTex = canvasTex(2048, 2048, (g, W, H) => {
    const px = (x) => ((x + 550) / 1100) * W;
    const pz = (z) => ((z + 550) / 1100) * H;
    g.fillStyle = '#5d6b52';
    g.fillRect(0, 0, W, H);
    // sand: west beach + south shore
    g.fillStyle = '#e6c68d';
    g.fillRect(0, 0, px(-300), H);
    g.fillRect(0, pz(300), W, H - pz(300));
    // urban ground
    g.fillStyle = '#6f6f68';
    g.fillRect(px(-300), 0, W - px(-300), pz(300));
    // hills grass
    g.fillStyle = '#55794a';
    g.fillRect(px(-300), 0, W - px(-300), pz(-260));
    // harbour concrete
    g.fillStyle = '#838383';
    g.fillRect(px(-300), pz(300), W - px(-300), H - pz(300));
    // market square tiles
    g.fillStyle = '#a8845a';
    g.fillRect(px(270), pz(-50), px(420) - px(270), pz(90) - pz(-50));
    g.strokeStyle = 'rgba(60,40,20,0.5)';
    g.lineWidth = 2;
    for (let x = 280; x <= 410; x += 18) {
      g.beginPath(); g.moveTo(px(x), pz(-50)); g.lineTo(px(x), pz(90)); g.stroke();
    }
    for (let z = -40; z <= 80; z += 18) {
      g.beginPath(); g.moveTo(px(270), pz(z)); g.lineTo(px(420), pz(z)); g.stroke();
    }
    // roads
    for (const r of roads) {
      g.strokeStyle = '#2b2b30';
      g.lineWidth = (r.w / 1100) * W;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(px(r.x1), pz(r.z1));
      g.lineTo(px(r.x2), pz(r.z2));
      g.stroke();
      // centre dashes
      g.strokeStyle = 'rgba(255,214,90,0.85)';
      g.lineWidth = 3;
      g.setLineDash([26, 30]);
      g.beginPath();
      g.moveTo(px(r.x1), pz(r.z1));
      g.lineTo(px(r.x2), pz(r.z2));
      g.stroke();
      g.setLineDash([]);
    }
    // sidewalk speckle
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 900; i++) {
      g.fillRect(rng.next() * W, rng.next() * H, 3, 3);
    }
    // palm shadows on the beach
    g.fillStyle = 'rgba(120,90,40,0.35)';
    for (let i = 0; i < 40; i++) {
      const x = px(rng.range(-480, -310));
      const z = pz(rng.range(-450, 280));
      g.beginPath(); g.arc(x, z, 9, 0, Math.PI * 2); g.fill();
    }
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1100, 1100),
    new THREE.MeshLambertMaterial({ map: groundTex })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // ---------- ocean ----------
  const oceanTex = canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#1d7a8c';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 3;
    for (let i = 0; i < 90; i++) {
      const x = rng.next() * W;
      const y = rng.next() * H;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 22, y - 7, x + 48, y);
      g.stroke();
    }
  });
  oceanTex.wrapS = oceanTex.wrapT = THREE.RepeatWrapping;
  oceanTex.repeat.set(9, 9);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(3400, 3400),
    new THREE.MeshLambertMaterial({ map: oceanTex })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.6;
  group.add(ocean);

  // ---------- sky dome + sun + clouds ----------
  const skyTex = canvasTex(1024, 512, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2a2350');
    grad.addColorStop(0.45, '#b34a6e');
    grad.addColorStop(0.65, '#ff7a45');
    grad.addColorStop(0.8, '#ffa53c');
    grad.addColorStop(1, '#ffd28a');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,240,200,0.9)';
    g.beginPath(); g.arc(W * 0.72, H * 0.66, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,220,160,0.35)';
    g.beginPath(); g.arc(W * 0.72, H * 0.66, 90, 0, Math.PI * 2); g.fill();
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  group.add(sky);
  const cloudTex = canvasTex(256, 128, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    for (const [x, y, r] of [[60, 80, 42], [120, 60, 52], [190, 82, 40], [90, 95, 36], [160, 95, 38]]) {
      const grad = g.createRadialGradient(x, y, 4, x, y, r);
      grad.addColorStop(0, 'rgba(255,190,150,0.85)');
      grad.addColorStop(1, 'rgba(255,190,150,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });
  for (let i = 0; i < 10; i++) {
    const cloud = new THREE.Mesh(
      new THREE.PlaneGeometry(rng.range(220, 420), rng.range(60, 120)),
      new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false })
    );
    const a = rng.range(0, Math.PI * 2);
    cloud.position.set(Math.cos(a) * rng.range(700, 1200), rng.range(180, 320), Math.sin(a) * rng.range(700, 1200));
    cloud.lookAt(0, cloud.position.y, 0);
    group.add(cloud);
  }

  // ---------- facade textures ----------
  const facadeTexs = FACADE_PALETTES.map((p) => canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = p.wall;
    g.fillRect(0, 0, W, H);
    g.fillStyle = p.trim;
    g.fillRect(0, 0, W, 10);
    g.fillRect(0, H - 10, W, 10);
    const cols = 6;
    const rows = 9;
    const cw = W / cols;
    const ch = H / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rng.next() < 0.62;
        g.fillStyle = lit ? p.lit : p.dark;
        g.fillRect(c * cw + 6, r * ch + 8, cw - 12, ch - 16);
        if (lit) {
          g.fillStyle = 'rgba(255,255,255,0.35)';
          g.fillRect(c * cw + 6, r * ch + 8, cw - 12, 5);
        }
      }
    }
  }));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3a3a40 });
  const facadeMats = facadeTexs.map((t) => new THREE.MeshLambertMaterial({
    map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22,
  }));

  function addBuilding(x, z, w, d, h, matIdx) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, [facadeMats[matIdx], facadeMats[matIdx], roofMat, roofMat, facadeMats[matIdx], facadeMats[matIdx]]);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    // rooftop box
    if (rng.chance(0.5)) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 3, d * 0.3), roofMat);
      box.position.set(x + rng.range(-w / 4, w / 4), h + 1.5, z + rng.range(-d / 4, d / 4));
      group.add(box);
    }
    return mesh;
  }

  function nearRoad(x, z, pad) {
    for (const r of roads) {
      const dx = r.x2 - r.x1;
      const dz = r.z2 - r.z1;
      const len2 = dx * dx + dz * dz;
      let t = ((x - r.x1) * dx + (z - r.z1) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = r.x1 + dx * t;
      const cz = r.z1 + dz * t;
      const dist = Math.hypot(x - cx, z - cz);
      if (dist < r.w / 2 + pad) return true;
    }
    return false;
  }

  // downtown towers
  for (let gx = -240; gx <= 120; gx += 58) {
    for (let gz = -180; gz <= 180; gz += 58) {
      if (rng.chance(0.18)) continue;
      const x = gx + rng.range(-8, 8);
      const z = gz + rng.range(-8, 8);
      if (nearRoad(x, z, 20)) continue;
      addBuilding(x, z, rng.range(24, 34), rng.range(22, 30), rng.range(42, 125), rng.int(0, 5));
    }
  }
  // old town low blocks
  for (let gx = 150; gx <= 450; gx += 52) {
    for (let gz = -220; gz <= 220; gz += 52) {
      if (rng.chance(0.22)) continue;
      if (gx > 260 && gx < 430 && gz > -60 && gz < 100) continue; // market square
      const x = gx + rng.range(-7, 7);
      const z = gz + rng.range(-7, 7);
      if (nearRoad(x, z, 18)) continue;
      addBuilding(x, z, rng.range(20, 30), rng.range(18, 26), rng.range(12, 26), rng.int(0, 5));
    }
  }
  // harbour warehouses
  for (let i = 0; i < 9; i++) {
    const x = -320 + i * 78;
    const z = 380 + rng.range(-14, 14);
    if (nearRoad(x, z, 26)) continue;
    addBuilding(x, z, rng.range(48, 62), rng.range(26, 34), rng.range(13, 19), rng.int(0, 5));
  }
  // hills houses
  for (let gx = -440; gx <= 440; gx += 64) {
    for (let gz = -470; gz <= -280; gz += 64) {
      if (rng.chance(0.35)) continue;
      const x = gx + rng.range(-8, 8);
      const z = gz + rng.range(-8, 8);
      if (nearRoad(x, z, 16)) continue;
      addBuilding(x, z, rng.range(16, 24), rng.range(14, 20), rng.range(8, 13), rng.int(0, 5));
    }
  }

  // ---------- neon signs on downtown towers ----------
  const signTexs = SIGN_WORDS.map((w) => canvasTex(256, 64, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.font = 'bold 44px Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#ff2e88';
    g.shadowBlur = 22;
    g.fillStyle = '#ffd7ef';
    g.fillText(w, W / 2, H / 2);
  }));
  for (let i = 0; i < 16; i++) {
    const x = rng.range(-250, 110);
    const z = rng.pick([-186, -66, 54, 174]);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 6.5),
      new THREE.MeshBasicMaterial({ map: signTexs[i % signTexs.length], transparent: true, side: THREE.DoubleSide })
    );
    sign.position.set(x, rng.range(26, 60), z);
    sign.rotation.y = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    group.add(sign);
  }

  // ---------- palms ----------
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e, side: THREE.DoubleSide });
  function palm(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.55 * s, 9 * s, 6), trunkMat);
    trunk.position.y = 4.5 * s;
    trunk.rotation.z = 0.12;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(1.1 * s, 4.4 * s, 4), frondMat);
      const a = (i / 6) * Math.PI * 2;
      f.position.set(Math.cos(a) * 1.6 * s, 9.4 * s, Math.sin(a) * 1.6 * s);
      f.rotation.z = Math.cos(a) * 1.1;
      f.rotation.x = -Math.sin(a) * 1.1;
      g.add(f);
    }
    g.position.set(x, 0, z);
    group.add(g);
  }
  for (let z = -440; z <= 280; z += 34) {
    if (rng.chance(0.3)) continue;
    palm(-305 + rng.range(-6, 6), z, rng.range(0.9, 1.3));
  }
  for (let i = 0; i < 26; i++) palm(rng.range(-260, 460), rng.pick([-248, 248, 308]), rng.range(0.8, 1.2));

  // ---------- market stalls (old town square) ----------
  const awningCols = [0xd83a3a, 0x2a7ad8, 0xe8a13a, 0x3aa84a];
  function stall(x, z, col, rotY) {
    const g = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(7, 1.6, 3), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    counter.position.y = 0.8;
    counter.castShadow = true;
    g.add(counter);
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.4), new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
    awn.position.y = 3.4;
    awn.rotation.x = -Math.PI / 2 + 0.5;
    g.add(awn);
    for (const [px, pz] of [[-3.4, -1.4], [3.4, -1.4], [-3.4, 1.4], [3.4, 1.4]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 5), trunkMat);
      pole.position.set(px, 1.7, pz);
      g.add(pole);
    }
    // goods: coloured crates
    for (let i = 0; i < 5; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: rng.pick([0xe84a3a, 0xf2c230, 0x4aa84a, 0xd86a2a]) }));
      crate.position.set(rng.range(-2.6, 2.6), 2.05, rng.range(-0.8, 0.8));
      g.add(crate);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rotY || 0;
    group.add(g);
    colliders.push({ minX: x - 3.5, maxX: x + 3.5, minZ: z - 1.8, maxZ: z + 1.8 });
  }
  stall(300, -30, awningCols[0], 0);
  stall(330, -30, awningCols[1], 0.2);
  stall(360, -30, awningCols[2], -0.15);
  stall(300, 40, awningCols[3], 0.1);
  stall(350, 55, awningCols[0], -0.2);
  stall(395, 20, awningCols[1], 0.4);

  // ---------- beach umbrellas + kiosks ----------
  const umbCols = [0xff5e62, 0x37c8ff, 0xffd23e, 0xff8ac2];
  for (let i = 0; i < 14; i++) {
    const x = rng.range(-480, -330);
    const z = rng.range(-420, 260);
    const umb = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 5), trunkMat);
    pole.position.y = 1.7;
    umb.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 8), new THREE.MeshLambertMaterial({ color: umbCols[i % 4], side: THREE.DoubleSide }));
    top.position.y = 3.6;
    umb.add(top);
    umb.position.set(x, 0, z);
    group.add(umb);
  }

  // ---------- harbour cranes + containers ----------
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xd8a13a });
  function crane(x, z) {
    const g = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 46, 4), craneMat);
    tower.position.y = 23;
    tower.castShadow = true;
    g.add(tower);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(44, 2.4, 2.4), craneMat);
    arm.position.set(14, 44, 0);
    g.add(arm);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 5), new THREE.MeshLambertMaterial({ color: 0x2b2b30 }));
    cab.position.set(2, 40, 0);
    g.add(cab);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 18, 4), roofMat);
    cable.position.set(30, 34, 0);
    g.add(cable);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshLambertMaterial({ color: 0x8a2a2a }));
    hook.position.set(30, 24, 0);
    g.add(hook);
    g.position.set(x, 0, z);
    group.add(g);
    colliders.push({ minX: x - 2, maxX: x + 2, minZ: z - 2, maxZ: z + 2 });
  }
  crane(-180, 340);
  crane(60, 360);
  crane(300, 340);
  const contCols = [0xb83a2a, 0x2a6ab8, 0x3a8a4a, 0xd8a13a, 0x7a4a9a];
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(12, 2.8, 2.6), new THREE.MeshLambertMaterial({ color: contCols[i % 5] }));
    c.position.set(rng.range(-420, 440), 1.4 + (i % 3 === 0 ? 2.8 : 0), rng.range(330, 470));
    c.rotation.y = rng.pick([0, Math.PI / 2]);
    c.castShadow = true;
    group.add(c);
    colliders.push({ minX: c.position.x - 6, maxX: c.position.x + 6, minZ: c.position.z - 1.5, maxZ: c.position.z + 1.5 });
  }

  // ---------- lighthouse ----------
  const light = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 34, 10), new THREE.MeshLambertMaterial({ color: 0xf2ead8 }));
  tower.position.y = 17;
  tower.castShadow = true;
  light.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 4, 10), new THREE.MeshLambertMaterial({ color: 0xd83a3a }));
  band.position.y = 22;
  light.add(band);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  lamp.position.y = 35.5;
  light.add(lamp);
  light.position.set(-430, 0, -430);
  group.add(light);
  colliders.push({ minX: -436, maxX: -424, minZ: -436, maxZ: -424 });

  // ---------- billboards ----------
  function billboard(x, z, rotY, text, bg) {
    const tex = canvasTex(512, 256, (g, W, H) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.font = 'bold 64px Arial';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = '#ffffff';
      g.shadowBlur = 12;
      g.fillStyle = '#ffffff';
      g.fillText(text, W / 2, H / 2 - 20);
      g.font = 'bold 30px Arial';
      g.fillText('NEON BAY', W / 2, H / 2 + 52);
    });
    const g2 = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 }));
    board.position.y = 22;
    board.castShadow = true;
    g2.add(board);
    for (const px of [-12, 12]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 15, 1.4), roofMat);
      leg.position.set(px, 7.5, 0);
      g2.add(leg);
    }
    g2.position.set(x, 0, z);
    g2.rotation.y = rotY;
    group.add(g2);
    colliders.push({ minX: x - 1, maxX: x + 1, minZ: z - 1, maxZ: z + 1 });
  }
  billboard(-250, 190, Math.PI / 2, 'GOLDEN HOUR', '#c23a6e');
  billboard(120, -190, 0, 'VICE LIFE', '#2a5ad8');
  billboard(430, 120, -Math.PI / 2, 'NEON BAY', '#1a8a6a');

  // ---------- street lamps ----------
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2b2b30 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a3 });
  for (const r of roads) {
    const len = Math.hypot(r.x2 - r.x1, r.z2 - r.z1);
    const steps = Math.floor(len / 90);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = r.x1 + (r.x2 - r.x1) * t + (r.w / 2 + 2) * (r.x1 === r.x2 ? 1 : 0);
      const z = r.z1 + (r.z2 - r.z1) * t + (r.w / 2 + 2) * (r.z1 === r.z2 ? 1 : 0);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 5), lampMat);
      pole.position.set(x, 3.5, z);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
      bulb.position.set(x, 7.1, z);
      group.add(bulb);
    }
  }

  // ---------- two-deck highway ----------
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x3d3d44 });
  const railMat = new THREE.MeshLambertMaterial({ color: 0x8a8a92 });
  function deck(x, y, w, len) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, len), deckMat);
    d.position.set(x, y, 0);
    d.castShadow = true;
    d.receiveShadow = true;
    group.add(d);
    for (const z of [-420, -300, -180, -60, 60, 180, 300, 420]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(3, y, 3), deckMat);
      pillar.position.set(x, y / 2, z);
      group.add(pillar);
    }
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, len), railMat);
      rail.position.set(x + side * (w / 2), y + 1.4, 0);
      group.add(rail);
    }
    // lane dashes on the deck
    const dashTex = canvasTex(64, 512, (g, W, H) => {
      g.fillStyle = '#3d3d44';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffd65a';
      for (let yy = 0; yy < H; yy += 64) g.fillRect(W / 2 - 3, yy, 6, 34);
    });
    dashTex.wrapT = THREE.RepeatWrapping;
    dashTex.repeat.set(1, 24);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, len), new THREE.MeshLambertMaterial({ map: dashTex }));
    top.rotation.x = -Math.PI / 2;
    top.position.set(x, y + 0.85, 0);
    group.add(top);
  }
  deck(180, 12, 24, 960); // lower deck — the player escapes here
  deck(214, 20, 20, 960); // upper deck — the blockade sits here
  // ramps (visual): sloped slabs at both ends of the lower deck
  for (const zs of [-1, 1]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(22, 1.4, 90), deckMat);
    ramp.position.set(180, 6, zs * 500);
    ramp.rotation.x = zs * 0.13;
    group.add(ramp);
  }

  // ---------- traffic loops (waypoints for cars) ----------
  const loops = [
    // ring road
    [[-460, -240], [460, -240], [460, 240], [-460, 240]],
    // downtown grid loop
    [[-240, -180], [120, -180], [120, 180], [-240, 180]],
    // beachfront avenue (there and back)
    [[-280, -440], [-280, 300], [-280, -440]],
    // old town loop
    [[120, -180], [360, -180], [360, 180], [120, 180]],
    // highway lower deck (there and back)
    [[180, -460], [180, 460], [180, -460]],
  ].map((pts) => pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));

  return {
    group,
    colliders,
    roads,
    loops,
    spots: {
      marketSquare: new THREE.Vector3(345, 0, 20),
      beach: new THREE.Vector3(-320, 0, 60),
      harbour: new THREE.Vector3(0, 0, 400),
      downtown: new THREE.Vector3(-60, 0, 0),
      hills: new THREE.Vector3(0, 0, -380),
      highwayLower: new THREE.Vector3(180, 12.9, 0),
      highwayUpper: new THREE.Vector3(214, 20.9, 0),
      pier: new THREE.Vector3(-300, 0, -120),
    },
  };
}
