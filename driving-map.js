'use strict';

function createDrivingMap(getView) {
  const dialog = document.getElementById('drivingMap'), canvas = document.getElementById('areaMap');
  const g = canvas.getContext('2d'), spans = [340, 580, 1000, 1700, 2800];
  let zoom = 2, dx = 0, dz = 0, scale = 1, drag = null, frame = 0;
  function redraw() {
    if (dialog.open && !frame) frame = requestAnimationFrame(() => { frame = 0; if (dialog.open) draw(); });
  }
  function draw() {
    const {graph, car, edge, water, places, duel, guide, amenities,furniture} = getView();
    const w = canvas.clientWidth, h = canvas.clientHeight, ratio = Math.min(devicePixelRatio || 1, 2);
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
    }
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.fillStyle = '#d8e1d1'; g.fillRect(0, 0, w, h);
    scale = Math.max(w, h) / spans[zoom];
    const halfW = w / (2 * scale), halfH = h / (2 * scale);
    // Stay inside the local road tiles already streamed for this drive.
    dx = clamp(dx, halfW - 1800, 1800 - halfW); dz = clamp(dz, halfH - 1800, 1800 - halfH);
    const cx = car.x + dx, cz = car.z + dz;
    const px = x => w / 2 + (x - cx) * scale, py = z => h / 2 + (z - cz) * scale;
    function path(points) {
      g.beginPath();
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (i) g.lineTo(px(p.x), py(p.z)); else g.moveTo(px(p.x), py(p.z));
      }
    }
    const labels = [];
    for (const f of water?.features || []) {
      if (f.x1 < cx - halfW || f.x0 > cx + halfW || f.z1 < cz - halfH || f.z0 > cz + halfH) continue;
      path(f.points);
      if (f.kind === 'lake') { g.fillStyle = '#9cc8cf'; g.fill(); }
      else { g.strokeStyle = '#98c4cb'; g.lineWidth = Math.max(1.2, scale * (f.width || 7)); g.stroke(); }
    }
    g.lineCap = g.lineJoin = 'round';
    const edges = graph.nearby(cx, cz, Math.max(halfW, halfH) + 12);
    const major = e => /^(motorway|trunk|primary|secondary)/.test(e.kind);
    const roads = [edges.filter(e => !major(e)), edges.filter(major)];
    for (let kind = 0; kind < roads.length; kind++) {
      const width = Math.min(11, Math.max(kind ? 3 : 1.5, (kind ? 9 : 5) * scale));
      for (const border of [true, false]) {
        g.lineWidth = width + (border ? 1.8 : 0);
        g.strokeStyle = kind ? (border ? '#ab9472' : '#ffe3a2') : (border ? '#afbbae' : '#f6f5e9');
        for (const e of roads[kind]) { path(e.points); g.stroke(); }
      }
    }
    path(edge.points); g.lineWidth = Math.max(3, Math.min(8, 7 * scale)); g.strokeStyle = '#487354'; g.stroke();
    if (guide) {
      g.strokeStyle='#1d7960'; g.lineWidth=4;
      for(const points of guide.visiblePaths(edges)){path(points);g.stroke();}
      if (guide.detour) {
        path(guide.detour.points); g.setLineDash([6,4]); g.strokeStyle='#94421e'; g.stroke(); g.setLineDash([]);
      }
      g.fillStyle='#185443'; g.beginPath(); g.arc(px(guide.finish.x),py(guide.finish.z),6,0,Math.PI*2); g.fill();
    }
    if (duel) {
      const points = [];
      for (let m = duel.player; m < duel.length; m += 4) points.push(graph.sample(duel.at(m)));
      points.push(graph.sample(duel.at(duel.length)));
      path(points); g.strokeStyle = '#558e1b'; g.lineWidth = 4; g.setLineDash([7, 5]); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(px(duel.actor.x), py(duel.actor.z), 5, 0, Math.PI * 2);
      g.fillStyle = '#c74b32'; g.fill();
    }

    // Reserve space before painting text, starting with the car and named sights.
    const vx = px(car.x), vy = py(car.z), occupied = [[vx-17, vy-19, vx+17, vy+19]], names = new Set();
    function label(name, x, y, color, symbol) {
      if (!name || names.has(name)) return;
      g.font = (symbol ? 'bold ' : '600 ') + '13px "Segoe UI", sans-serif';
      const width = g.measureText(name).width, box = [x - 5, y - 11, x + width + (symbol ? 18 : 5), y + 11];
      if (box[0] < 6 || box[1] < 6 || box[2] > w-6 || box[3] > h-6 ||
        occupied.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return;
      occupied.push(box); names.add(name);
      if (symbol) {
        g.beginPath(); g.arc(x, y, 4.8, 0, Math.PI * 2); g.fillStyle=color; g.fill();
        g.strokeStyle='#fff9e9'; g.lineWidth=2; g.stroke(); x+=10;
      }
      g.textBaseline = 'middle'; g.lineWidth = 3.5; g.strokeStyle = '#f3f4e7'; g.strokeText(name, x, y);
      g.fillStyle = color; g.fillText(name, x, y);
    }
    for (const p of places) label(p.name, px(p.x), py(p.z), '#754532', true);
    for (const p of amenities) if (p.name) label(p.name, px(p.x), py(p.z), '#305e63', true);
    for (const e of [edge, ...roads[1], ...roads[0]]) {
      if (!e.name || names.has(e.name)) continue;
      const p = graph.sample({edge:e, dir:1, s:e.length/2});
      labels.push({name:e.name, x:px(p.x), y:py(p.z)});
    }
    for (const l of labels) label(l.name, l.x, l.y - 9, '#415347', false);
    g.save(); g.translate(vx, vy); g.rotate(car.yaw);
    g.beginPath(); g.moveTo(0,-13); g.lineTo(9,9); g.lineTo(0,5.5); g.lineTo(-9,9); g.closePath();
    g.fillStyle = '#153f35'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); g.fill(); g.restore();
    let visibleFixtures=0;
    if(zoom===0)for(const p of furniture||[]){
      const x=px(p.worldX),y=py(p.worldZ);
      if(x<0||y<0||x>w||y>h||Math.hypot(x-px(car.x),y-py(car.z))<13)continue;
      g.beginPath();g.strokeStyle='#364742';g.lineWidth=1;
      if(p.kind==='lamp'){g.fillStyle='#ffe298';g.arc(x,y,2.8,0,Math.PI*2);}
      else{g.fillStyle='#bb7560';g.rect(x-2,y-2,4,4);}
      g.fill();g.stroke();visibleFixtures++;
    }
    document.getElementById('mapFixtureKey').hidden=!visibleFixtures;
    const metres = [20, 50, 100, 200, 500, 1000].filter(m => m * scale <= Math.min(110, w * .27)).at(-1) || 20;
    const bar = document.getElementById('mapScale');
    bar.style.width = metres * scale + 'px'; bar.textContent = metres >= 1000 ? metres/1000 + ' km' : metres + ' m';
    document.getElementById('mapZoomIn').disabled = zoom === 0;
    document.getElementById('mapZoomOut').disabled = zoom === spans.length - 1;
  }
  function changeZoom(step) { zoom = clamp(zoom + step, 0, spans.length - 1); redraw(); }
  document.getElementById('mapZoomIn').onclick = () => changeZoom(-1);
  document.getElementById('mapZoomOut').onclick = () => changeZoom(1);
  document.getElementById('mapRecenter').onclick = () => {dx = dz = 0; redraw();};
  document.getElementById('closeDrivingMap').onclick = () => dialog.close();
  canvas.addEventListener('wheel', e => {e.preventDefault(); if (e.deltaY) changeZoom(Math.sign(e.deltaY));}, {passive:false});
  canvas.addEventListener('pointerdown', e => {
    if (e.button || drag) return;
    canvas.setPointerCapture(e.pointerId); drag = {id:e.pointerId, x:e.clientX, y:e.clientY};
  });
  canvas.addEventListener('pointermove', e => {
    if (drag?.id !== e.pointerId) return;
    dx -= (e.clientX - drag.x) / scale; dz -= (e.clientY - drag.y) / scale;
    drag.x = e.clientX; drag.y = e.clientY; redraw();
  });
  canvas.addEventListener('lostpointercapture', () => {drag = null;});
  dialog.addEventListener('keydown', e => {
    const step = 75 / scale;
    switch (e.key) {
      case 'ArrowLeft': dx -= step; break;
      case 'ArrowRight': dx += step; break;
      case 'ArrowUp': dz -= step; break;
      case 'ArrowDown': dz += step; break;
      case '+': case '=': changeZoom(-1); break;
      case '-': changeZoom(1); break;
      default: return;
    }
    e.preventDefault(); redraw();
  });
  new ResizeObserver(redraw).observe(canvas);
  return {open(street) {
    dx = dz = 0; drag = null;
    document.getElementById('drivingMapStreet').textContent = street;
    dialog.showModal(); draw();
  }};
}
