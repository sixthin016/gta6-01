// Neon Bay — keyboard and mouse input. One job: keys held, one-shot actions,
// and the mouse (aim + drag to orbit the chase camera). Presses are
// edge-triggered and consumed once, so E to enter a car fires once per tap.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;

const KEY_ACTIONS = {
  enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  escape: ACTION_PAUSE,
  p: ACTION_PAUSE,
  e: ACTION_ENTER,
  f: ACTION_PUNCH,
  m: ACTION_MUTE,
};

export function createInput(canvas, onOrbit) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, lastX: 0 };
  let dragging = false;

  function normKey(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  }
  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(normKey(event));
    pressed.add(normKey(event));
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(normKey(event))) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) { keys.delete(normKey(event)); }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    if (dragging && onOrbit) onOrbit((event.clientX - mouse.lastX) * 0.005);
    mouse.lastX = event.clientX;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
    dragging = true;
    mouse.lastX = event.clientX;
  }
  function onMouseUp() { mouse.down = false; dragging = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    mouse,
    /** True while a key is held down (for hold-to-rob, not edge taps). */
    isHeld(key) { return keys.has(key); },
    /** Movement axes, -1..1, from WASD or the arrow keys. */
    axes() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return { x, y, run: keys.has('shift') };
    },
    /** One-shot actions pressed since the last call; clears them. */
    takeActions() {
      let flags = 0;
      for (const key of pressed) flags |= KEY_ACTIONS[key] ?? 0;
      pressed.clear();
      return flags;
    },
    /** True when the mouse was clicked since the last call. */
    takeClick() {
      const was = mouse.clicked;
      mouse.clicked = false;
      return was;
    },
  };
}
