'use strict';
function createSightSecrets(getView, playChime) {
  const el = id => document.getElementById(id);
  const tour = el('tourCamera'), panel = el('secretPanel'), field = el('secretField');
  const glint = el('secretGlint'), capture = el('secretCapture'), direction = el('secretDirection');
  const journal = el('stampJournal'), prefix = 'vivu.sight-stamp.v1.';
  const records = new Map();
  const modelIds = new Map(window.VietnamLandmarks.entries.filter(p=>p.catalogId).map(p=>[p.catalogId,p.id]));
  const tolerance = .14;
  const gestures = {turtle:'Chạm mặt nước', sail:'Đón gió', shell:'Áp tai nghe', drop:'Chạm giọt nước',
    lotus:'Mở cánh sen', wing:'Thả cánh chim', leaf:'Lật chiếc lá', dragon:'Đánh thức nét rồng',
    beacon:'Bắt tia sáng', star:'Bắt ánh sao', lantern:'Thắp đèn', ridge:'In đường chân núi',
    ink:'In nét mực', arch:'In đường vòm', gear:'Khớp bánh răng', echo:'Gọi tiếng vọng'};
  let site, stamp, target = 0, mode = 'idle', previousAngle, previousZoom, apparitionAngle;
  let page = 0, journalRows = [];
  let journalOpener, persistent = true, assetRequest, duskView, originalHour;

  // Template scripts are inert on the starting grid. The release bundler groups
  // them into one hashed request, while a source checkout uses the same order.
  function loadAssets() {
    if (!assetRequest) {
      const scripts = el('secretAssets').content.querySelectorAll('script[src]');
      assetRequest = Promise.all([...scripts].map(source => new Promise((resolve,reject) => {
        const script = document.createElement('script');
        script.async = false; script.src = source.src;
        script.onload = () => { script.remove(); resolve(); };
        script.onerror = () => { script.remove(); reject(new Error('Chưa tải được con dấu.')); };
        document.head.append(script);
      }))).catch(error => { assetRequest = null; throw error; });
    }
    return assetRequest;
  }

  function identity(id) {
    let hash = 2166136261;
    for (const letter of id) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
    return hash >>> 0;
  }
  function story(place) {
    const seed = identity(place.id);
    const [motif, title, clue, reveal] = window.sightSecretStories[place.id] ||
      window.sightSecretStories[place.catalogId] || window.sightSecretTheme(place, seed);
    const coordinates = [place.lat,place.lon].every(Number.isFinite) ?
      place.lat.toFixed(3)+'°N '+place.lon.toFixed(3)+'°E' : '';
    return {seed, motif, title, clue, reveal, coordinates};
  }
  function readRecord(id) {
    try {
      const raw = localStorage.getItem(prefix + id);
      if (raw) {
        const record = JSON.parse(raw);
        if (record && ['name','title','motif','reveal'].every(k => typeof record[k] === 'string') &&
            Number.isFinite(record.seed) && Number.isFinite(record.time)) {
          // Older stamps keep the original atlas label in local storage.
          const name = record.name.replace(/(^|\s)[\u0300-\u0303\u0306\u0309\u031b\u0323]+/gu, '$1').normalize('NFC');
          records.set(id, {...record,id,name});
        }
      }
    } catch { /* Session records also work with storage disabled. */ }
    return records.get(id);
  }
  function remember() {
    if (savedStamp(site)) return;
    const record = {id:site.id, name: site.name, location: site.locality || site.province || site.city || '',
      motif: stamp.motif, title: stamp.title, seed: stamp.seed, reveal: stamp.reveal,
      coordinates:stamp.coordinates, time: Date.now()};
    records.set(site.id, record);
    try { localStorage.setItem(prefix + site.id, JSON.stringify(record)); }
    catch { persistent = false; }
  }
  function savedStamp(place) {
    return readRecord(place.id) || (place.catalogId && place.catalogId!==place.id && readRecord(place.catalogId));
  }
  function changeMode(next) {
    if (next === 'idle' && duskView) { duskView.hour = originalHour; duskView = null; }
    mode = next;
    tour.toggleAttribute('data-finding', next !== 'idle');
    panel.hidden = next === 'idle';
    field.dataset.state = next;
    el('secretHunt').hidden = next !== 'hunt';
    el('secretResult').hidden = next !== 'found';
    previousAngle = undefined;
    update();
  }
  function close() {
    site = stamp = null;
    changeMode('idle');
    field.hidden = true;
  }
  function select(place) {
    const view = getView();
    site = place;
    stamp = null;
    const seed = identity(place.id), side = seed % 2 ? 1 : -1;
    target = (view.data.viewAngle ?? view.data.yaw ?? 0) + side * (.45 + (seed % 80) / 100);
    el('secretOpen').disabled = false;
    el('secretOpen').textContent = savedStamp(site) ? 'Xem lại dấu ẩn' : 'Tìm dấu ẩn';
    el('secretPlace').textContent = site.name;
    changeMode('idle');
  }
  function difference() {
    const angle = target - getView().angle;
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }
  function update() {
    const view = getView();
    if (!site || !view || (view.angle === previousAngle && view.zoom === previousZoom)) return;
    previousAngle = view.angle; previousZoom = view.zoom;
    const gap = difference(), aligned = Math.abs(gap) <= tolerance;
    field.hidden = mode === 'idle' && (Math.abs(gap) > .36 || records.has(site.id) || records.has(site.catalogId));
    if (field.hidden) return;
    const position = 50 + Math.max(-1, Math.min(1, gap / 1.15)) * 40;
    glint.style.left = position.toFixed(2) + '%';
    if (mode === 'found') {
      const offset = Math.atan2(Math.sin(apparitionAngle-view.angle), Math.cos(apparitionAngle-view.angle));
      el('secretApparition').style.left = (50 + 83 * offset) + '%';
    }
    field.toggleAttribute('data-aligned', aligned);
    glint.hidden = mode === 'found';
    if (mode === 'hunt') {
      // Keep the live region quiet until the actual instruction changes.
      const needsFocus = !el('secretLens').hidden && view.zoom > .80;
      const needsDusk = !el('secretDusk').hidden;
      const hint = aligned ? (needsDusk ? 'Đã vào khung · Đổi ánh sáng để tìm ngọn đèn' :
        needsFocus ? 'Đã vào khung · Kéo lấy nét về Gần' : 'Đã vào khung') :
        gap < 0 ? 'Xoay sang trái' : 'Xoay sang phải';
      if (direction.textContent !== hint) direction.textContent = hint;
      capture.disabled = !aligned || needsFocus || needsDusk;
      glint.disabled = capture.disabled;
    } else glint.disabled = false;
  }
  function cancel() {
    changeMode('idle');
    el('secretOpen').focus({preventScroll:true});
  }
  function reveal() {
    if (!site || tour.getAttribute('aria-busy') === 'true') return;
    if (mode === 'hunt' && capture.disabled) return;
    const prior = savedStamp(site);
    remember();
    el('secretOpen').textContent = 'Xem lại dấu ẩn';
    el('secretTitle').textContent = stamp.title;
    el('secretStory').textContent = stamp.reveal;
    el('secretSaved').textContent = persistent ? (prior ? 'Dấu trong sổ tay' : 'Đã đóng vào sổ tay') : 'Đã giữ trong phiên chơi';
    el('secretPrint').replaceChildren(window.createSightSecretArt(stamp.motif, stamp.seed, prior?.id || site.id, stamp.coordinates));
    el('secretApparition').dataset.motif = stamp.motif;
    el('secretApparition').replaceChildren(window.createSightSecretGlyph(stamp.motif, stamp.seed, prior?.id || site.id));
    apparitionAngle = getView().angle;
    changeMode('found');
    playChime(stamp.motif);
    el('secretDone').focus({preventScroll:true});
  }
  el('secretOpen').onclick = async () => {
    if (!site || tour.getAttribute('aria-busy') === 'true') return;
    const place = site;
    el('secretOpen').disabled = true; el('secretOpen').textContent = 'Đang mở dấu…';
    try { await loadAssets(); }
    catch {
      if (site === place) el('secretOpen').textContent = 'Thử tải lại dấu ẩn';
      return;
    } finally { if (site === place) el('secretOpen').disabled = false; }
    if (site !== place || tour.getAttribute('aria-busy') === 'true') return;
    const saved = savedStamp(site);
    stamp = saved || story(place);
    if (saved) return reveal();
    el('secretOpen').textContent = 'Tìm dấu ẩn';
    el('secretClue').textContent = stamp.clue;
    capture.textContent = gestures[stamp.motif] || 'Đóng dấu';
    el('secretLens').hidden = !['ink','arch','gear'].includes(stamp.motif);
    const hour = getView().hour;
    el('secretDusk').hidden = !['beacon','lantern'].includes(stamp.motif) || (hour != null && (hour>=18 || hour<6));
    el('secretFocus').value = getView().zoom;
    changeMode('hunt');
    el('secretClue').focus({preventScroll:true});
  };
  el('secretLeft').onclick = () => turn(-1);
  el('secretRight').onclick = () => turn(1);
  function turn(sign) {
    if (mode !== 'hunt') return;
    getView().angle += sign * .2;
    update();
  }
  el('secretFocus').oninput = event => {
    getView().zoom = Number(event.target.value);
    el('tourZoom').value = event.target.value;
    update();
  };
  el('secretDusk').onclick = () => {
    duskView = getView(); originalHour = duskView.hour; duskView.hour = 18.75;
    el('secretDusk').hidden = true; previousAngle = undefined; update();
  };
  glint.onclick = () => {
    if (mode === 'idle') el('secretOpen').click();
    else if (mode === 'hunt' && !capture.disabled) reveal();
  };
  capture.onclick = reveal;
  el('secretCancel').onclick = el('secretDone').onclick = cancel;
  function renderJournal() {
    const list = el('stampList'), count = journalRows.length, size = 8;
    el('stampCount').textContent = count ? count.toLocaleString('vi-VN') + ' địa danh đã khám phá' :
      'Khi ngắm một địa danh, tìm ánh lóe và xoay máy để đóng con dấu đầu tiên.';
    list.replaceChildren();
    for (const record of journalRows.slice(page * size, (page + 1) * size)) {
      const item = document.createElement('li'), details = document.createElement('details');
      const summary = document.createElement('summary'), text = document.createElement('span');
      const title = document.createElement('strong'), place = document.createElement('small'), note = document.createElement('p');
      title.textContent = record.title;
      place.textContent = record.name + (record.location && record.name !== record.location ? ' · ' + record.location : '');
      note.textContent = record.reveal;
      text.append(title, place);
      summary.append(window.createSightSecretArt(record.motif, record.seed, record.id, record.coordinates), text);
      details.append(summary, note);
      if (record.coordinates) {
        const coordinates = document.createElement('small');
        coordinates.textContent = record.coordinates;
        details.append(coordinates);
      }
      item.append(details); list.append(item);
    }
    el('stampPages').hidden = count <= size;
    el('stampPrev').disabled = !page;
    el('stampNext').disabled = (page + 1) * size >= count;
    el('stampPage').textContent = (page + 1) + ' / ' + Math.ceil(count / size);
  }
  async function openJournal(event) {
    journalOpener = event.currentTarget;
    el('stampCount').textContent = 'Đang mở sổ…';
    el('stampList').replaceChildren(); el('stampPages').hidden = true;
    journal.showModal();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) readRecord(key.slice(prefix.length));
      }
    } catch { /* Show the stamps discovered in this session. */ }
    const places = new Map();
    for(const record of records.values()){
      const id=modelIds.get(record.id)||record.id;
      if(!places.has(id)||record.id===id)places.set(id,record);
    }
    journalRows = [...places.values()].sort((a,b) => b.time - a.time);
    if (journalRows.length) {
      try { await loadAssets(); }
      catch { el('stampCount').textContent = 'Chưa tải được hình con dấu. Hãy đóng và mở lại sổ.'; return; }
    }
    page = 0; renderJournal();
  }
  document.querySelectorAll('[data-stamp-book]').forEach(button => button.addEventListener('click', openJournal));
  el('stampPrev').onclick = () => { page--; renderJournal(); };
  el('stampNext').onclick = () => { page++; renderJournal(); };
  el('stampClose').onclick = () => journal.close();
  journal.addEventListener('keydown', event => event.stopPropagation());
  journal.addEventListener('close', () => journalOpener?.focus({preventScroll:true}));
  return {select, close, update, async clue(place) { await loadAssets(); return story(place).clue; },
    escape() { if (mode === 'idle') return false; cancel(); return true; }};
}
