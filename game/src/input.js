// Neon Bay — input.js
// Keyboard and mouse input. One job: keys held, one-shot actions, and the
// mouse (aim + drag to orbit the chase camera). Presses are edge-triggered
// and consumed once, so E to enter a car fires once per tap.
// B opens a shop (or closes its panel), H steps into a safehouse.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;
export const ACTION_WHEEL = 32;
export const ACTION_COVER = 64;
export const ACTION_GARAGE = 128;
export const ACTION_RADIO = 256;
export const ACTION_WEAPON_1 = 512;
export const ACTION_WEAPON_2 = 1024;
export const ACTION_WEAPON_3 = 2048;
export const ACTION_WEAPON_4 = 4096;
export const ACTION_SHOP = 8192;
export const ACTION_SAFEHOUSE = 16384;

const KEY_ACTIONS = {
  enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  escape: ACTION_PAUSE,
  p: ACTION_PAUSE,
  e: ACTION_ENTER,
  f: ACTION_PUNCH,
  m: ACTION_MUTE,
  q: ACTION_WHEEL,
  c: ACTION_COVER,
  g: ACTION_GARAGE,
  r: ACTION_RADIO,
  b: ACTION_SHOP,
  h: ACTION_SAFEHOUSE,
  1: ACTION_WEAPON_1,
  2: ACTION_WEAPON_2,
  3: ACTION_WEAPON_3,
  4: ACTION_WEAPON_4,
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
    isHeld(key) { return keys.has(key); },
    axes() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return { x, y, run: keys.has('shift'), nos: keys.has(' ') };
    },
    takeActions() {
      let flags = 0;
      for (const key of pressed) flags |= KEY_ACTIONS[key] ?? 0;
      pressed.clear();
      return flags;
    },
    takeClick() {
      const was = mouse.clicked;
      mouse.clicked = false;
      return was;
    },
  };
}
