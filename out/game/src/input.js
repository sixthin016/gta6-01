// Neon Bay — keyboard and mouse input. Keys are held in a set; presses are
// edge-triggered and consumed once, so E to enter a car or F to punch fires
// exactly once per tap. The mouse aims the pistol in screen space.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  Escape: ACTION_PAUSE,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  e: ACTION_ENTER,
  E: ACTION_ENTER,
  f: ACTION_PUNCH,
  F: ACTION_PUNCH,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    pressed.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
  }
  function onMouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  function held(key) {
    return keys.has(key);
  }

  return {
    mouse,
    /** True while a key is held down (for hold-to-rob, not edge taps). */
    isHeld(key) {
      return keys.has(key);
    },
    /** Movement axes, -1..1, from WASD or the arrow keys. */
    axes() {
      let x = 0;
      let y = 0;
      if (held('a') || held('arrowleft')) x -= 1;
      if (held('d') || held('arrowright')) x += 1;
      if (held('w') || held('arrowup')) y -= 1;
      if (held('s') || held('arrowdown')) y += 1;
      return { x, y, run: held('shift') };
    },
    /** One-shot actions pressed since the last call; clears them. */
    takeActions() {
      let flags = 0;
      for (const key of pressed) {
        const mapped = KEY_ACTIONS[key] ?? KEY_ACTIONS[key.toUpperCase()] ?? 0;
        flags |= mapped;
      }
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
