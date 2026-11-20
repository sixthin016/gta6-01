// Neon Bay — boot. ?shot=1..4 renders a staged screenshot scene (fixed camera,
// full HUD, deterministic); no query param starts the playable free-roam game.
import * as THREE from 'three';
import { STAGE } from './shots.js';
import { applyHud } from './hud.js';
import { startGame } from './game.js';

const params = new URLSearchParams(location.search);
const shot = Number(params.get('shot') || 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.domElement.classList.add('webgl');
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
scene.add(camera);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

if (shot >= 1 && shot <= 4) {
  document.getElementById('help').style.display = 'none';
  const staged = STAGE[shot](scene, camera);
  applyHud(shot);
  // spin the heli rotors + pulse the searchlight for a few frames, then hold
  const clock = new THREE.Clock();
  let frames = 0;
  function renderShot() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (staged.heli) staged.heli.userData.blades.rotation.y += dt * 16;
    renderer.render(scene, camera);
    if (++frames < 90) requestAnimationFrame(renderShot);
    else window.__shotReady = true;
  }
  renderShot();
} else {
  startGame(scene, camera, renderer);
}
