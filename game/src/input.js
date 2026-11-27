// Keyboard and mouse input. Keys held down are read every frame; keys pressed once
// (jump, hide, decoy, pause, mute, confirm) are reported as edges and consumed by the
// caller, so holding a key never fires the action twice.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyH: 'hide',
  KeyC: 'decoy',
  Enter: 'confirm',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute',
  KeyR: 'restart',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, clicked: false };

  function onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(action);
    held.add(action);
  }
  function onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (action) held.delete(action);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouse.clicked = true;
    pressed.add('confirm');
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    /** Held keys as a movement snapshot for this frame. */
    read() {
      return {
        left: held.has('left'),
        right: held.has('right'),
        sprint: held.has('sprint'),
      };
    },
    /** True once per physical press; the caller consumes it by reading. */
    wasPressed(action) {
      return pressed.has(action);
    },
    consume(action) {
      pressed.delete(action);
    },
    consumeAll() {
      pressed.clear();
    },
    mouse() {
      const m = { ...mouse };
      mouse.clicked = false;
      return m;
    },
  };
}
