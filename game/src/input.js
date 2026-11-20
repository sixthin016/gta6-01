// Keyboard + mouse input. Arrows/WASD drive and walk, Shift is NOS, Space is the
// handbrake, F gets in and out of a car, Q opens the weapon wheel, R changes the
// radio station, M toggles the mission panel, P pauses, Enter confirms.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_EXIT_CAR = 4;
export const ACTION_WHEEL = 8;
export const ACTION_RADIO = 16;
export const ACTION_NOS = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  function onKey(event, down) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (down) keys.add(key); else keys.delete(key);
    if (!down) return;
    if (key === 'enter' || key === ' ') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'escape') actions |= ACTION_PAUSE;
    if (key === 'f') actions |= ACTION_EXIT_CAR;
    if (key === 'q') actions |= ACTION_WHEEL;
    if (key === 'r') actions |= ACTION_RADIO;
    if (key === 'shift') actions |= ACTION_NOS;
  }

  const keyDown = (e) => onKey(e, true);
  const keyUp = (e) => onKey(e, false);
  const mouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  };
  const mouseDownFn = (e) => { mouseMove(e); mouseDown = true; actions |= ACTION_CONFIRM; };
  const mouseUpFn = () => { mouseDown = false; };

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDownFn);
  window.addEventListener('mouseup', mouseUpFn);

  return {
    direction() {
      const left = keys.has('arrowleft') || keys.has('a') ? -1 : 0;
      const right = keys.has('arrowright') || keys.has('d') ? 1 : 0;
      return left + right;
    },
    throttle() {
      const up = keys.has('arrowup') || keys.has('w') ? 1 : 0;
      const down = keys.has('arrowdown') || keys.has('s') ? -1 : 0;
      return up + down;
    },
    nos() { return keys.has('shift'); },
    handbrake() { return keys.has(' '); },
    takeActions() { const taken = actions; actions = 0; return taken; },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
  };
}
