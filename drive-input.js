'use strict';
// The trip setup and all driving modes share the last camera the driver chose.
globalThis.DriveView = (() => {
  const key = 'vivudatviet.driverView';
  const valid = view => view === 'cockpit' || view === 'chase';
  let last;
  function current(fallback = 'chase') {
    const requested = new URLSearchParams(globalThis.location?.search).get('camera');
    if (valid(requested)) return requested;
    try { last = localStorage.getItem(key) || last; } catch {}
    return valid(last) ? last : fallback;
  }
  function select(view) {
    if (!valid(view)) return;
    last = view;
    try { localStorage.setItem(key, view); } catch {}
    const url = new URL(location.href);
    if (url.searchParams.has('camera') && url.searchParams.get('camera') !== view) {
      url.searchParams.set('camera', view);
      history.replaceState(history.state, '', url);
    }
  }
  return {current, select};
})();

function updateDriveViewButton(button, inside) {
  button.dataset.nextView = inside ? 'chase' : 'cockpit';
  button.textContent = inside ? 'Sau xe' : 'Trong xe';
  button.dataset.view = inside ? 'cockpit' : 'chase';
  button.title = inside ? 'Chuyển sang góc nhìn sau xe (C)' : 'Chuyển sang góc nhìn người lái (C)';
  button.setAttribute('aria-keyshortcuts', 'C');
  button.setAttribute('aria-label', button.title);
}

// Keyboard and individual contacts own their input independently on hybrid devices.
function createDriveInput() {
  const keyboard = new Set(), contacts = new Map(), active = new Set();
  function setContact(id, button) {
    const previous = contacts.get(id);
    if (previous === button) return;
    if (button) contacts.set(id, button);
    else contacts.delete(id);
    const pressed = new Set(contacts.values());
    if (previous && !pressed.has(previous)) previous.classList.remove('active');
    if (button) button.classList.add('active');
    active.clear();
    for (const control of pressed) {
      for (const key of control.dataset.key.split(' ')) active.add(key);
    }
  }
  function clear() {
    keyboard.clear();
    for (const id of contacts.keys()) setContact(id);
  }
  for (const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setContact(event.pointerId, button);
    });
    if (button.hasAttribute('data-slide-pedal')) {
      button.addEventListener('pointermove', event => {
        if (!contacts.has(event.pointerId)) return;
        // Capture keeps the release reliable. Hit-test the thumb as it crosses pedals.
        const pedal = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slide-pedal]');
        if (pedal) setContact(event.pointerId, pedal);
      });
    }
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => setContact(event.pointerId));
    }
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  window.addEventListener('blur', clear);
  window.addEventListener('pagehide', clear);
  matchMedia('(orientation: landscape)').addEventListener('change', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  return {has: key => keyboard.has(key) || active.has(key), add: key => keyboard.add(key), delete: key => keyboard.delete(key), clear};
}
