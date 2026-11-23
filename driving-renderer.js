'use strict';

const DrivingRenderer = (() => {
  let renderer;

  function unavailable(networkError=false) {
    if (document.getElementById('graphicsUnavailable')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'graphicsUnavailable';
    dialog.setAttribute('aria-labelledby', 'graphicsTitle');
    dialog.setAttribute('aria-describedby', 'graphicsHelp');
    const title = document.createElement('h2');
    title.id = 'graphicsTitle';
    title.textContent = networkError ? 'Chưa tải đủ trò chơi' : 'Chưa mở được cảnh lái 3D';
    const help = document.createElement('p');
    help.id = 'graphicsHelp';
    help.textContent = networkError ? 'Hãy kiểm tra kết nối rồi tải lại trang để bắt đầu lái.' :
      'Trình duyệt chưa tạo được cảnh WebGL. Bạn có thể ôn lý thuyết ngay, hoặc bật tăng tốc đồ họa trong trình duyệt rồi tải lại trang.';
    const theory = document.createElement('a');
    theory.href = 'theory-exam.html';
    theory.target = '_top';
    theory.textContent = 'Ôn lý thuyết';
    const retry = document.createElement('button');
    retry.textContent = 'Tải lại trang';
    retry.onclick = () => location.reload();
    const home = document.createElement('a');
    home.href = 'hall.html';
    home.target = '_top';
    home.textContent = 'Về sân tập';
    dialog.append(title, help, theory, retry, home);
    document.body.append(dialog);
    // Closing this notice would expose controls without a renderer.
    dialog.oncancel = event => event.preventDefault();
    dialog.showModal();
    theory.focus();
  }

  function get(canvas, options) {
    if (!renderer) {
      try {
        const antialias = !matchMedia('(pointer: coarse)').matches || document.body.dataset.graphics === 'high';
        renderer = new THREE.WebGLRenderer({canvas, antialias, ...options});
      } catch {
        unavailable();
        return null;
      }
    }
    return renderer;
  }

  return {get, unavailable};
})();

// The race extends the road simulator through several ordered classic scripts.
// Start them together only after the real game canvas has a working renderer.
{
  const entry = document.getElementById('drivingScripts');
  if (entry && DrivingRenderer.get(document.getElementById(entry.dataset.canvas), {
    powerPreference: entry.dataset.power || 'default'
  })) {
    const scripts = [...entry.content.querySelectorAll('script[src]')];
    const buttons = [...document.querySelectorAll('#launch, #start, #go, #fullStart')];
    buttons.forEach(button => { button.disabled = true; });
    for (const source of scripts) {
      const script = document.createElement('script');
      script.async = false;
      script.src = source.src;
      script.onerror = () => DrivingRenderer.unavailable(true);
      if (source === scripts.at(-1)) script.onload = () => {
        for (const button of buttons) button.disabled = false;
      };
      document.body.append(script);
    }
  }
}
