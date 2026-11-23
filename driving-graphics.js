'use strict';

// Rendering budgets are independent of the simulation clock and CSS layout.
function createDrivingGraphics(renderer, camera, sun) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const profiles = [
    {id:'low', dpr:.9, pixels:900000, shadow:512, shadowMs:180, mirrorMs:170, waterWidth:0, waterMs:0, districtRadius:420, scenery:270, cars:2, treeDetail:25, treeCanopy:85},
    {id:'medium', dpr:1.25, pixels:1800000, shadow:1024, shadowMs:100, mirrorMs:120, waterWidth:256, waterMs:260, districtRadius:540, scenery:440, cars:3, treeDetail:55, treeCanopy:150},
    {id:'high', dpr:1.65, pixels:3600000, shadow:2048, shadowMs:60, mirrorMs:90, waterWidth:480, waterMs:130, districtRadius:650, scenery:620, cars:5, treeDetail:90, treeCanopy:240}
  ];
  if (touch) Object.assign(profiles[0], {pixels:520000, districtRadius:360, scenery:220, treeDetail:18, treeCanopy:65});
  const cores = navigator.hardwareConcurrency, memory = navigator.deviceMemory;
  // Mobile core counts include efficiency cores and do not predict GPU throughput.
  const initial = touch || cores <= 4 || memory <= 4 ? 0 : cores >= 8 && memory >= 8 ? 2 : 1;
  const autoCeiling = touch ? 1 : profiles.length - 1;
  const touchDensity = [.9, 1.25, 1.5];
  let level = initial, preference, previous = null, duration = 0, frames = 0, slow = 0, fast = 0, recoverAfter;
  let density = 0, smooth = 0, onTime = 0, sharpenAfter = 2;
  let width = 0, height = 0, ratio = 0;
  let verySlow = 0, reduced = false;
  const shadows = renderer.shadowMap.enabled;
  const canvas = renderer.domElement;

  function resetSamples() {
    previous = null;
    duration = frames = slow = fast = verySlow = smooth = onTime = 0;
  }
  function choose() {
    const selected = document.body.dataset.graphics || 'auto';
    if (preference === selected) return;
    preference = selected;
    const fixed = profiles.findIndex(profile => profile.id === selected);
    level = fixed < 0 ? initial : fixed;
    reduced = false;
    density = 0;
    sharpenAfter = 2;
    recoverAfter = touch ? 30 : 12;
    resetSamples();
  }
  function lowerQuality() {
    if (level > 0) level--;
    else if (touch && preference === 'auto' && density > 0) density--;
    else reduced = true;
    sharpenAfter = 12;
    recoverAfter = 45;
    resetSamples();
  }
  function sample(now, playing) {
    if (!playing || document.hidden || (preference !== 'auto' && preference !== 'low')) {
      if (previous !== null) resetSamples();
      return;
    }
    const delta = previous === null ? 0 : now - previous;
    previous = now;
    if (delta <= 0) return;
    // Several very late frames warrant a quick reduction even on a CPU-rich device.
    verySlow = delta > 55 ? verySlow + 1 : 0;
    if (verySlow >= 5 && !reduced) {
      lowerQuality();
      return;
    }
    // Bound the influence of a single tile load or shader compilation.
    duration += Math.min(delta, 100);
    frames++;
    if (delta <= 25) onTime++;
    if (duration < 1000) return;
    const average = duration / frames;
    const mobileAuto = touch && preference === 'auto';
    const slowLimit = level > 0 ? 23 : density > 0 ? 32 : 34;
    slow = average > slowLimit ? slow + 1 : 0;
    // Streaming may miss an individual frame even when most draws have headroom.
    const steady = onTime >= frames * .7 && average < (density === 0 ? 28 : 24);
    smooth = steady ? smooth + 1 : 0;
    fast = average < 18.5 ? fast + 1 : 0;
    duration = frames = onTime = 0;
    if (slow >= 2 && !reduced) {
      lowerQuality();
    } else if (mobileAuto && smooth >= (reduced ? 2 : sharpenAfter) && (reduced || density < touchDensity.length - 1)) {
      // Spend spare frame time on road markings first. Shadows, reflections
      // and the streamed district retain their own, slower recovery threshold.
      if (reduced) {
        reduced = false;
      } else {
        density++;
        sharpenAfter = 4;
      }
      smooth = 0;
    } else if (fast >= recoverAfter && (reduced || preference === 'auto' && level < autoCeiling)) {
      if (reduced) reduced = false;
      else level++;
      resetSamples();
    }
  }
  function resize() {
    const profile = profiles[level], w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const mobileAuto = touch && preference === 'auto';
    const dpr = mobileAuto ? touchDensity[density] : profile.dpr;
    const pixels = mobileAuto ? Math.min(1200000, profiles[0].pixels * (dpr / touchDensity[0]) ** 2) : profile.pixels;
    const scale = Math.min(window.devicePixelRatio || 1, dpr, Math.sqrt(pixels / (w * h))) * (reduced ? .64 : 1);
    const shadowMap = shadows && level > 0;
    if (renderer.shadowMap.enabled !== shadowMap) {
      renderer.shadowMap.enabled = shadowMap;
      renderer.shadowMap.needsUpdate = true;
    }
    if (w !== width || h !== height || scale !== ratio) {
      renderer.setDrawingBufferSize(w, h, scale);
      if (w !== width || h !== height) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      width = w; height = h; ratio = scale;
    }
    if (sun && sun.shadow.mapSize.x !== profile.shadow) {
      sun.shadow.mapSize.setScalar(profile.shadow);
      sun.shadow.map?.setSize(profile.shadow, profile.shadow);
      renderer.shadowMap.needsUpdate = true;
    }
  }
  function frame(now, playing) {
    choose();
    sample(now, playing);
    resize();
  }
  choose();
  document.addEventListener('visibilitychange', resetSamples);
  return {frame, resize, get profile() { return profiles[level]; }};
}
