'use strict';

// Both the road signs and the driving map use the same landmark entrances.
function localDrivingPlaces(graph, x, z, radius) {
  const [lon, lat] = graph.geo(x, z), places = [], seen = new Set();
  for (const sites of [VietnamLandmarks.entries, window.VietnamTourism?.entries || []]) {
    for (const site of sites) {
      if (Math.abs(site.lon - lon) * graph.mx > radius || Math.abs(site.lat - lat) * graph.my > radius) continue;
      const p = graph.point(site.lon, site.lat);
      const distance = Math.hypot(p.x - x, p.z - z);
      if (distance > radius || seen.has(site.name)) continue;
      seen.add(site.name);
      places.push({...p, name: site.name, start: site.start, distance});
    }
  }
  return places.sort((a, b) => a.distance - b.distance);
}

// Work backwards from mapped vehicle entrances. Each entry stores the shortest
// drivable distance from the start of a directed edge to a local destination.
function* signDestinations(graph, places) {
  const routes = new Map(), queue = [];
  function offer(edge, dir, distance, place) {
    const key = edge.id * dir;
    if (distance > 2400 || (routes.get(key)?.distance ?? Infinity) <= distance) return;
    const entry = {edge, dir, distance, place};
    routes.set(key, entry);
    queue.push(entry);
  }
  for (const place of places.slice(0, 24)) {
    yield;
    const p = place.start ? graph.point(...place.start) : place;
    const near = graph.nearest(p.x, p.z, graph.nearby(p.x, p.z, 60));
    if (!near || near.error > 60 ** 2) continue;
    offer(near.edge, 1, near.s, place);
    if (!near.edge.oneway) offer(near.edge, -1, near.edge.length - near.s, place);
  }
  // A short local search. Re-enqueue improved distances and skip superseded ones.
  for (let i = 0; i < queue.length; i++) {
    if ((i & 127) === 0) yield;
    const entry = queue[i], {edge, dir, distance, place} = entry;
    if (routes.get(edge.id * dir) !== entry) continue;
    const node = dir > 0 ? edge.start : edge.end;
    for (const incoming of graph.nodes.get(node) || []) {
      if (incoming.id === edge.id) continue;
      if (incoming.end === node && graph.allows({edge:incoming, dir:1}, node, edge, dir)) offer(incoming, 1, distance + incoming.length, place);
      if (incoming.start === node && !incoming.oneway && graph.allows({edge:incoming, dir:-1}, node, edge, dir)) offer(incoming, -1, distance + incoming.length, place);
    }
  }
  return routes;
}

function junctionRows(options, routes) {
  const choices = options.filter(o => Math.abs(o.angle) < 2.65).map(o => {
    const route = routes.get(o.edge.id * o.dir);
    const magnitude = Math.abs(o.angle);
    const arrow = magnitude < .20 ? '↑' : magnitude < .68 ? (o.angle < 0 ? '↖' : '↗') : (o.angle < 0 ? '←' : '→');
    return {arrow, road:o.edge.name, route};
  });
  const rows = [], used = new Set();
  for (const choice of choices) {
    const route = choice.route;
    // Two exits can reach the same place. Sign the shorter approach.
    const shortest = route && !choices.some(other => other.route?.place === route.place && other.route.distance < route.distance);
    const label = shortest && !used.has(route.place.name) ? route.place.name : choice.road;
    if (!label || used.has(label)) continue;
    used.add(label);
    rows.push({arrow: choice.arrow, label});
    if (rows.length === 3) break;
  }
  return rows;
}

function createWorldSigns(T, scene, small) {
  const displayed = new T.Group(), faces = new Map();
  displayed.name = 'Biển báo và chỉ hướng';
  scene.add(displayed);
  const plane = new T.PlaneGeometry(), mast = new T.CylinderGeometry(.065, .085, 1, 8);
  const postPaint = document.createElement('canvas');
  postPaint.width = 8; postPaint.height = 64;
  const paint = postPaint.getContext('2d');
  paint.fillStyle = '#eeeae0'; paint.fillRect(0, 0, 8, 64);
  paint.fillStyle = '#b93931';
  for (let y = 0; y < 64; y += 16) paint.fillRect(0, y, 8, 8);
  const stripes = new T.CanvasTexture(postPaint); stripes.colorSpace = T.SRGBColorSpace;
  const postMaterial = new T.MeshLambertMaterial({map: stripes});
  const steel = new T.MeshLambertMaterial({color: 0xa2aaa5});
  const backMetal = new T.MeshLambertMaterial({color: 0x969c99, side:T.BackSide});
  const triangle = new T.Shape();
  triangle.moveTo(0,.47); triangle.lineTo(-.49,-.44); triangle.lineTo(.49,-.44); triangle.closePath();
  const triangularBack = new T.ShapeGeometry(triangle);
  const roundBack = new T.CircleGeometry(.49, 48);

  function faceFor(sign, used) {
    const key = JSON.stringify(sign.rows || sign.type);
    used.add(key);
    if (faces.has(key)) return faces.get(key);
    const guide = Boolean(sign.rows), canvas = document.createElement('canvas');
    canvas.width = guide ? 768 : 192;
    canvas.height = guide ? 104 * sign.rows.length + 28 : sign.type === 'one-way' || sign.type === 'no-entry' ? 192 : 176;
    const g = canvas.getContext('2d');
    g.lineJoin = g.lineCap = 'round';
    if (guide) {
      g.fillStyle = '#145798'; g.fillRect(0, 0, canvas.width, canvas.height);
      g.strokeStyle = '#f4f3de'; g.lineWidth = 5;
      g.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
      g.fillStyle = '#fffdf0'; g.textBaseline = 'middle';
      sign.rows.forEach(({arrow, label, distance}, i) => {
        const y = 67 + i * 104;
        g.font = 'bold 78px Arial'; g.fillText(arrow, 30, y);
        g.font = 'bold 58px "Segoe UI", sans-serif'; g.fillText(label, 133, y, distance ? 440 : 600);
        if (distance) {
          g.font = '600 39px "Segoe UI", sans-serif'; g.textAlign = 'right';
          g.fillText(distance, 730, y, 140); g.textAlign = 'left';
        }
      });
    } else if (sign.type === 'no-entry') {
      g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(96,96,94,0,2*Math.PI); g.fill();
      g.fillStyle = '#c92727'; g.beginPath(); g.arc(96,96,91,0,2*Math.PI); g.fill();
      g.fillStyle = '#fffaf0'; g.fillRect(32,79,128,34);
    } else if (sign.type === 'one-way') {
      g.fillStyle = '#fffaf0'; g.fillRect(0,0,192,192);
      g.fillStyle = '#155395'; g.fillRect(4,4,184,184);
      g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(96,20); g.lineTo(149,82);
      g.lineTo(117,82); g.lineTo(117,166); g.lineTo(75,166); g.lineTo(75,82); g.lineTo(43,82); g.closePath(); g.fill();
    } else {
      g.beginPath(); g.moveTo(96, 12); g.lineTo(182, 160); g.lineTo(10, 160); g.closePath();
      g.fillStyle = '#ffcd38'; g.fill(); g.strokeStyle = '#c32927'; g.lineWidth = 13; g.stroke();
      g.strokeStyle = '#252621'; g.lineWidth = 15; g.beginPath();
      g.moveTo(96, 136);
      if (sign.type.startsWith('junction')) {
        if (sign.type === 'junction-T') {
          g.lineTo(96, 93); g.moveTo(62,93); g.lineTo(130,93);
        } else {
          g.lineTo(96, 66);
          g.moveTo(sign.type === 'junction-right' ? 96 : 62, 103);
          g.lineTo(sign.type === 'junction-left' ? 96 : 130, 103);
        }
      } else {
        const dx = sign.type === 'bend-right' ? 27 : -27;
        g.lineTo(96, 114); g.quadraticCurveTo(96, 97, 96 + dx * .5, 87); g.lineTo(96 + dx, 72);
      }
      g.stroke();
    }
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshLambertMaterial({map, alphaTest: .45});
    faces.set(key, mat); return mat;
  }

  let displayedFaces = new Set();
  function trim(used) {
    for (const [key, mat] of faces) if (!used.has(key)) {
      mat.map.dispose(); mat.dispose(); faces.delete(key);
    }
  }
  function* prepare(graph, edges, cx, cz, clear, ground, register) {
    const group = new T.Group();
    const used = new Set(), candidates = [], placed = [];
    if (!graph) return () => {displayed.clear();displayedFaces=used;trim(used);};
    const routes = yield* signDestinations(graph, localDrivingPlaces(graph, cx, cz, 1450));
    function candidate(edge, dir, s, type, rows) {
      const at = {edge, dir, s}, p = graph.sample(at);
      const distance = Math.hypot(p.x - cx, p.z - cz);
      if (distance < 470) candidates.push({at, type, rows, distance});
    }
    let scanned = 0;
    for (const edge of edges) {
      if ((++scanned & 15) === 0) yield;
      if (edge.oneway && edge.length >= 10) {
        const inset = Math.min(12, edge.length * .35);
        for (const dir of [1, -1]) {
          const node = dir === 1 ? edge.start : edge.end;
          const links = (graph.nodes.get(node) || []).filter(other => other !== edge);
          // An OSM way can be split mid-block. Sign actual entrances from other streets.
          const entrance = links.some(other => !other.oneway || (links.length > 1 && other.end === node));
          if (entrance) candidate(edge, dir, dir === 1 ? inset : edge.length-inset, dir === 1 ? 'one-way' : 'no-entry');
        }
      }
      if (edge.length < 19) continue;
      for (const dir of edge.oneway ? [1] : [1, -1]) {
        const station = d => dir === 1 ? d : edge.length - d;
        const lead = Math.min(36, edge.length * .58);
        const options = graph.options({edge, dir});
        if (options.length > 1) {
          const rows = junctionRows(options, routes);
          const left = options.some(o => o.angle < -.43), right = options.some(o => o.angle > .43);
          const through = options.some(o => Math.abs(o.angle) <= .43);
          const warning = !through && left && right ? 'junction-T' : left && !right ? 'junction-left'
            : right && !left ? 'junction-right' : 'junction';
          candidate(edge, dir, station(edge.length - lead), warning, rows.length ? rows : null);
          if (rows.length && edge.length > 120) candidate(edge, dir, station(edge.length - 83), warning);
        } else if (options.length === 1 && Math.abs(options[0].angle) > .65) {
          candidate(edge, dir, station(edge.length - lead), options[0].angle > 0 ? 'bend-right' : 'bend-left');
        }
        // Reassurance boards also work on long approaches before the next junction.
        const route = routes.get(edge.id * dir);
        for (let d = 69; route && d < edge.length - 65; d += 280) {
          const left = route.distance - d;
          if (left > 28 && left <= 1600) {
            const distance = left >= 1000 ? (left / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(left / 10) * 10 + ' m';
            candidate(edge, dir, station(d), 'guide', [{arrow:'↑', label:route.place.name, distance}]);
          }
        }
        for (let i = 1; i < edge.points.length - 1; i++) {
          const s = edge.dist[i], before = s - dir * 20;
          if (before < 5 || before > edge.length - 5) continue;
          const a = graph.sample({edge, dir, s:before}).yaw, b = graph.sample({edge, dir, s:s + dir * 10}).yaw;
          const angle = Math.atan2(Math.sin(b - a), Math.cos(b - a));
          if (Math.abs(angle) > .65) candidate(edge, dir, before, angle > 0 ? 'bend-right' : 'bend-left');
        }
      }
    }
    const rank = sign => sign.distance + (sign.rows ? 40 : 0);
    candidates.sort((a, b) => rank(a) - rank(b) || a.at.edge.id - b.at.edge.id);
    for (const sign of candidates) {
      if ((++scanned & 15) === 0) yield;
      if (placed.length >= (small ? 19 : 32)) break;
      const {at, rows} = sign, width = rows ? 4.45 : 1.22;
      const square = sign.type === 'one-way', round = sign.type === 'no-entry';
      const height = rows ? width * (104 * rows.length + 28) / 768 : (square || round ? width : 1.12);
      const offset = worldRoadHalfWidth(at.edge) + width / 2;
      let p;
      for (const along of [0, -5, 5, -10]) {
        const s = at.s + along * at.dir;
        if (s < 2 || s > at.edge.length - 2) continue;
        const q = graph.sample({...at, s}, offset + 1.1);
        if (!clear(q.x, q.z, width / 2)) continue;
        const crowded = placed.some(a => Math.hypot(q.x-a.x, q.z-a.z) < (Math.cos(a.yaw-q.yaw) > .7 ? 19 : 4));
        if (!crowded) {p = {...q,s}; break;}
      }
      if (!p) continue;
      placed.push(p);
      // The front of a Three.js plane points along +Z. Face approaching traffic.
      const x = p.x - cx, z = p.z - cz, yaw = -p.yaw, base = ground(p.x, p.z, at.edge, p.s), y = base + 2.3 + height / 2;
      const face = new T.Mesh(plane, faceFor(sign, used));
      face.position.set(x, y, z); face.rotation.y = yaw; face.scale.set(width, height, 1);
      face.name = rows ? rows.map(r => r.arrow + ' ' + r.label).join(' / ') : sign.type;
      group.add(face);
      const back = new T.Mesh(rows || square ? plane : round ? roundBack : triangularBack, backMetal);
      back.position.copy(face.position); back.rotation.copy(face.rotation); back.scale.copy(face.scale);
      back.translateZ(-.025); group.add(back);
      for (const lateral of rows ? [-1.28, 1.28] : [0]) {
        const px = x + lateral * Math.cos(yaw), pz = z - lateral * Math.sin(yaw);
        const bottom = ground(px + cx, pz + cz, at.edge, p.s), top = y + height * .32;
        const pole = new T.Mesh(mast, rows ? steel : postMaterial);
        pole.position.set(px, (top + bottom) / 2, pz);
        pole.position.x -= .11 * Math.sin(yaw); pole.position.z -= .11 * Math.cos(yaw);
        pole.scale.y = top - bottom; group.add(pole);
        register({id:'road-sign:' + at.edge.id + ':' + at.dir + ':' + at.s + ':' + lateral,
          kind:'pole', x:pole.position.x, z:pole.position.z, radius:.085, baseY:bottom,height:top-bottom, parts:[]});
      }
    }
    return () => {
      displayed.clear();displayed.add(group);displayedFaces=used;trim(used);
    };
  }
  return {prepare, cancel:()=>trim(displayedFaces)};
}
