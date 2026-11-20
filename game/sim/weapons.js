// Weapons — 4 guns, muzzle flash, ejected shells, tracer lines.
// The weapon wheel (hold TAB in play mode) lists all four with ammo.
import * as THREE from 'three';
import { WEAPONS } from '../core/state.js';

export function makeGunModel(index) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.45, metalness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a3a1a, roughness: 0.8 });
  if (index === 0) { // pistol
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.34), dark);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.1), wood);
    grip.position.set(0, -0.12, -0.1); grip.rotation.x = 0.3;
    g.add(body, grip);
  } else if (index === 1) { // SMG
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.62), dark);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.1), dark);
    mag.position.set(0, -0.16, 0.05);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.24), dark);
    stock.position.set(0, 0, -0.4);
    g.add(body, mag, stock);
  } else if (index === 2) { // shotgun
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), dark);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, 0.3);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.3), wood);
    pump.position.set(0, -0.04, 0.28);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), wood);
    stock.position.set(0, -0.02, -0.35);
    g.add(barrel, pump, stock);
  } else { // rifle
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.85), dark);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.12), dark);
    mag.position.set(0, -0.16, 0.1); mag.rotation.x = 0.25;
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.16), dark);
    sight.position.set(0, 0.11, 0.05);
    g.add(body, mag, sight);
  }
  return g;
}

// A muzzle flash: additive radial sprite, always faces the camera —
// a flat plane reads as a paper sheet at frame scale.
let flashTex = null;
function getFlashTexture() {
  if (flashTex) return flashTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,250,220,1)');
  grad.addColorStop(0.35, 'rgba(255,215,94,0.9)');
  grad.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  // star spikes
  g.strokeStyle = 'rgba(255,230,150,0.9)'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(64, 6); g.lineTo(64, 122); g.moveTo(6, 64); g.lineTo(122, 64); g.stroke();
  flashTex = new THREE.CanvasTexture(c);
  return flashTex;
}
export function makeMuzzleFlash() {
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getFlashTexture(), transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  flash.scale.setScalar(0.85);
  flash.visible = false;
  return flash;
}

// 6 ejected shell casings frozen mid-air (brass, tumbling).
export function makeShells(scene, origin) {
  const shells = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8a83c, metalness: 0.9, roughness: 0.3 });
  const spots = [
    [0.4, 0.9, 0.3], [0.7, 1.2, -0.2], [0.2, 1.4, 0.5],
    [0.9, 0.7, 0.4], [0.5, 1.6, -0.4], [1.1, 1.0, 0.1],
  ];
  spots.forEach(([x, y, z], i) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 6), brass);
    s.position.set(origin.x + x, origin.y + y, origin.z + z);
    s.rotation.set(i * 1.1, i * 0.7, i * 1.7);
    shells.add(s);
  });
  scene.add(shells);
  return shells;
}

// Tracer line from a barrel to a target point.
export function makeTracer(from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: 0xffe9a8, transparent: true, opacity: 0.8,
  }));
  return line;
}

export function weaponName(state) {
  return WEAPONS[state.weaponIndex].name;
}
export function weaponAmmo(state) {
  const w = WEAPONS[state.weaponIndex];
  return `${w.mag} / ${w.ammo}`;
}
