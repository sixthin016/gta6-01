// Neon Bay — entry point. One job: boot the canvas, then either render one
// staged screenshot scene (?shot=1..4, drawn once, deterministic) or start
// the playable game loop.
import { CANVAS_W, CANVAS_H } from './config.js';
import { renderShot } from './shots.js';
import { createGame } from './game.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = Number(params.get('shot') || 0);

if (shot >= 1 && shot <= 4) {
  // Staging mode: one fixed scene, no animation, so a headless capture is
  // pixel-stable. The capture script waits for this flag.
  renderShot(ctx, shot);
  document.title = `Neon Bay — shot ${shot}`;
  window.__shotReady = true;
} else {
  const game = createGame(ctx);
  window.addEventListener('keydown', game.onKeyDown);
  window.addEventListener('keyup', game.onKeyUp);
  window.addEventListener('mousemove', game.onMouseMove);
  window.addEventListener('mousedown', game.onMouseDown);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.state.mode !== 'paused') game.update(dt);
    game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__gameReady = true;
}
