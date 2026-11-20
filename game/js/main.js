// Neon Bay — boot: staging mode (?shot=1..4) renders one fixed shot for the
// screenshots; otherwise the playable game starts with its menu and loop.

import { renderShot } from './staging.js';
import { NeonBayGame } from './engine.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1280;
const H = 720;

const params = new URLSearchParams(location.search);
const shot = Number(params.get('shot') || 0);

if (shot >= 1 && shot <= 4) {
  document.title = 'Neon Bay — shot ' + shot;
  renderShot(ctx, shot, W, H);
  window.__neonBayShot = shot;
  window.__neonBayReady = true;
} else {
  document.title = 'Neon Bay — open-world crime game';
  const game = new NeonBayGame(canvas);
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__neonBayGame = game;
  window.__neonBayReady = true;
}
