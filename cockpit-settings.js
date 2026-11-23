'use strict';

// Apply the same player preferences before either arcade mode starts rendering.
(() => {
  const storageKey = 'taylai.cockpit.v1';
  const groups = [
    {key:'graphics', title:'Chất lượng đồ họa', options:[['auto','Tự động'], ['low','Thấp'], ['medium','Vừa'], ['high','Cao']], initial:'auto'},
    {key:'mapSize', title:'Cỡ bản đồ nhỏ', options:[['small','Gọn'], ['standard','Chuẩn'], ['large','Rộng']], initial:'standard'},
    {key:'mapSide', title:'Vị trí bản đồ', device:'keyboard', options:[['left','Bên trái'], ['right','Bên phải']], initial:'left'},
    {key:'steering', title:'Tay đánh lái', device:'touch', options:[['left','Tay trái'], ['right','Tay phải']], initial:'left'},
    {key:'buttonSize', title:'Cỡ nút cảm ứng', device:'touch', options:[['standard','Chuẩn'], ['large','Lớn']], initial:'standard'}
  ];
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  const settings = {};
  for (const group of groups) {
    const selected = group.options.some(([value]) => value === saved?.[group.key]) ? saved[group.key] : group.initial;
    settings[group.key] = document.body.dataset[group.key] = selected;
  }
  // The exam hall can change this preference while a lesson is open in its iframe.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    let next;
    try { next = JSON.parse(event.newValue); } catch { return; }
    for (const group of groups) {
      const value = group.options.some(([id]) => id === next?.[group.key]) ? next[group.key] : group.initial;
      settings[group.key] = document.body.dataset[group.key] = value;
      const radio = document.querySelector('#cockpitSettings input[name="' + group.key + '"][value="' + value + '"]');
      if (radio) radio.checked = true;
    }
  });
  const buttons = document.querySelectorAll('[data-cockpit-settings]');
  if (!buttons.length) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'cockpitSettings';
  dialog.setAttribute('aria-labelledby', 'cockpitTitle');
  dialog.innerHTML = '<form method="dialog"><h2 id="cockpitTitle">Bố trí buồng lái</h2><button class="settingsDone" value="close">Xong</button></form>';
  const form = dialog.firstElementChild;
  for (const group of groups) {
    const field = document.createElement('fieldset');
    if (group.device) field.dataset.device = group.device;
    const legend = document.createElement('legend');
    legend.textContent = group.title;
    field.append(legend);
    for (const [value, text] of group.options) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = group.key;
      radio.value = value;
      radio.checked = value === settings[group.key];
      label.append(radio, text);
      field.append(label);
    }
    form.insertBefore(field, form.lastElementChild);
  }
  form.addEventListener('change', ({target}) => {
    if (target.type !== 'radio') return;
    settings[target.name] = document.body.dataset[target.name] = target.value;
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
  });
  document.body.append(dialog);
  for (const button of buttons) {
    button.addEventListener('click', () => dialog.showModal());
  }
})();
