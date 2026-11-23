'use strict';

function createVehicleLook(button, canvas, canLook) {
  const view = {yaw:0, pitch:0};
  let pointer = null, armed = false, idle = 0, usedCanvas = false;
  const arrows = new Set();
  function arm(value) {
    armed = value;
    button.setAttribute('aria-pressed', String(value));
    canvas.classList.toggle('looking', value);
    idle = 5;
  }
  function end() {
    const contact = pointer;
    pointer = null;
    if (contact?.surface.hasPointerCapture(contact.id)) contact.surface.releasePointerCapture(contact.id);
    arrows.clear();
    if (armed) arm(false);
  }
  for (const surface of [button, canvas]) {
    surface.addEventListener('pointerdown', e => {
      if (surface === canvas) usedCanvas = armed;
      if (!canLook() || pointer || e.button !== 0 || (surface === canvas && !armed)) return;
      e.preventDefault();
      surface.setPointerCapture(e.pointerId);
      pointer = {id:e.pointerId, surface, x:e.clientX, y:e.clientY, yaw:view.yaw, pitch:view.pitch, moved:false, wasArmed:armed};
      arm(true);
    });
    surface.addEventListener('pointermove', e => {
      if (pointer?.id !== e.pointerId) return;
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      if (!pointer.moved && Math.hypot(dx, dy) < 4) return;
      pointer.moved = true;
      view.yaw = Math.max(-Math.PI, Math.min(Math.PI, pointer.yaw + dx * Math.PI / Math.min(240, canvas.clientWidth * .27)));
      view.pitch = Math.max(-.75, Math.min(1.25, pointer.pitch - dy * 1.25 / Math.min(140, canvas.clientHeight * .27)));
    });
    surface.addEventListener('pointerup', e => {
      if (pointer?.id !== e.pointerId) return;
      const tapToArm = surface === button && !pointer.moved && !pointer.wasArmed;
      end();
      if (tapToArm) arm(true);
    });
    for (const type of ['pointercancel', 'lostpointercapture']) {
      surface.addEventListener(type, e => { if (pointer?.id === e.pointerId) end(); });
    }
  }
  canvas.addEventListener('click', e => {
    if (usedCanvas) { usedCanvas = false; e.stopImmediatePropagation(); }
  }, true);
  button.addEventListener('click', e => {
    if (e.detail === 0 && canLook()) arm(!armed); // Keyboard or assistive technology.
  });
  button.addEventListener('keydown', e => {
    if (!canLook()) return;
    if (e.key.startsWith('Arrow')) {
      e.preventDefault(); e.stopPropagation(); arrows.add(e.key); arm(true);
    } else if (e.key === 'Escape') end();
    else if (e.key === ' ') e.stopPropagation();
  });
  button.addEventListener('keyup', e => {
    if (arrows.delete(e.key) && !arrows.size) end();
  });
  button.addEventListener('blur', end);
  button.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('blur', end);
  document.addEventListener('visibilitychange', () => { if (document.hidden) end(); });
  return {
    view,
    update(dt) {
      if (!canLook()) { end(); view.yaw = view.pitch = 0; return; }
      if (arrows.size) {
        const horizontal = Number(arrows.has('ArrowRight')) - Number(arrows.has('ArrowLeft'));
        const vertical = Number(arrows.has('ArrowUp')) - Number(arrows.has('ArrowDown'));
        view.yaw = Math.max(-Math.PI, Math.min(Math.PI, view.yaw + dt * 2.3 * horizontal));
        view.pitch = Math.max(-.75, Math.min(1.25, view.pitch + dt * 1.6 * vertical));
      } else if (!pointer) {
        if (armed && (idle -= dt) <= 0) end();
        const decay = Math.exp(-dt * 9);
        view.yaw = Math.abs(view.yaw) < .001 ? 0 : view.yaw * decay;
        view.pitch = Math.abs(view.pitch) < .001 ? 0 : view.pitch * decay;
      }
    }
  };
}
