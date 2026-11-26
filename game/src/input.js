// Langit Nusantara — keyboard and mouse input. One object collects the
// pilot's stick, throttle and buttons each frame; the flight model reads
// it, never the DOM directly, so the autopilot can drive the same shape.
export function createInput() {
  const keys = new Set();
  const state = {
    pitch: 0, // -1 pull up .. +1 push down (stick)
    roll: 0, // -1 left .. +1 right
    throttleDelta: 0,
    brake: false,
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
  };

  function onKeyDown(event) {
    keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    // Only the canvas steers: moving over menus and panels must not trim.
    if (event.target && event.target.tagName !== 'CANVAS') return;
    state.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    state.mouseActive = true;
  }
  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('blur', onBlur);

  /** Read the current pilot input for this frame. */
  function read() {
    const up = keys.has('ArrowUp') || keys.has('KeyW');
    const down = keys.has('ArrowDown') || keys.has('KeyS');
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    // W/S double as throttle when the arrows fly the plane; Shift/Ctrl too.
    let throttle = 0;
    if (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyW')) throttle += 1;
    if (keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyS')) throttle -= 1;
    // Arrows take priority for pitch/roll; WASD mirrors them.
    let pitch = 0;
    if (up) pitch -= 1;
    if (down) pitch += 1;
    let roll = 0;
    if (left) roll -= 1;
    if (right) roll += 1;
    // Mouse trims the stick gently — never more than a third of full throw.
    if (state.mouseActive) {
      pitch += state.mouseY * 0.3;
      roll += state.mouseX * 0.3;
    }
    state.pitch = Math.max(-1, Math.min(1, pitch));
    state.roll = Math.max(-1, Math.min(1, roll));
    state.throttleDelta = throttle;
    state.brake = keys.has('Space');
    return state;
  }

  /** Was this key pressed since the last check? (menus use this.) */
  function pressed(code) {
    if (keys.has(code)) {
      keys.delete(code);
      return true;
    }
    return false;
  }

  function destroy() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('blur', onBlur);
  }

  return { state, read, pressed, destroy };
}
