// Neon Bay — keyboard + mouse input. Tracks held keys, edge presses
// (pressed once per keydown), and drag-orbit deltas for the chase camera.
export const keys = Object.create(null);
export const pressed = Object.create(null); // edge-triggered, cleared each frame
export const mouse = { dx: 0, dy: 0, down: false, dragging: false, x: 0, y: 0 };

export function initInput() {
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });
  addEventListener('mousedown', (e) => {
    mouse.down = true; mouse.dragging = true; mouse.x = e.clientX; mouse.y = e.clientY;
  });
  addEventListener('mouseup', () => { mouse.down = false; mouse.dragging = false; });
  addEventListener('mousemove', (e) => {
    if (!mouse.dragging) return;
    mouse.dx += e.clientX - mouse.x;
    mouse.dy += e.clientY - mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
  });
}

export function endFrame() {
  for (const k of Object.keys(pressed)) pressed[k] = false;
  mouse.dx = 0; mouse.dy = 0;
}

export function axis(neg, pos) {
  return (keys[pos] ? 1 : 0) - (keys[neg] ? 1 : 0);
}

export function forwardAxis() {
  return axis('KeyS', 'KeyW') + axis('ArrowDown', 'ArrowUp');
}

export function strafeAxis() {
  return axis('KeyA', 'KeyD') + axis('ArrowLeft', 'ArrowRight');
}
