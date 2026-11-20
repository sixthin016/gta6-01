// Keyboard + mouse input — one shared state object, polled by the loop.
export function createInput() {
  const keys = Object.create(null);
  const input = {
    keys,
    mouseX: 0, mouseY: 0, mouseDown: false,
    pressed: Object.create(null),
    axisX() { return (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0); },
    axisY() { return (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0); },
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    input.pressed[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  window.addEventListener('mousemove', (e) => { input.mouseX = e.clientX; input.mouseY = e.clientY; });
  window.addEventListener('mousedown', () => { input.mouseDown = true; });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  input.endFrame = () => { for (const k in input.pressed) input.pressed[k] = false; };
  return input;
}
