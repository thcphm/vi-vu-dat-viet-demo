'use strict';
(() => {
  // Shared Central Vietnam architectural & bridge building blocks for Three.js landmarks.
  // All geometry is stamped directly into the landmark's single-draw-call buffer via `kit`.

  function plaque(T, kit, title, x, y, z, w, h, opts = {}) {
    const ry = opts.ry || 0;
    const bg = opts.bg || '#f2dfa7';
    const fg = opts.fg || '#6c2d23';
    const border = opts.border ?? 0x8c6d45;
    if (opts.frame !== false) {
      kit.box(border, x - Math.sin(ry) * 0.05, y, z - Math.cos(ry) * 0.05, w + 0.24, h + 0.18, 0.14, ry);
    }
    const c = document.createElement('canvas');
    c.width = 768; c.height = 144;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 768, 144);
    g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(8, 8, 752, 128);
    g.fillStyle = fg;
    g.font = 'bold 70px "Times New Roman", "Noto Serif", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(title, 384, 74, 710);
    const map = new T.CanvasTexture(c);
    map.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshStandardMaterial({ map, roughness: 0.84 })
    );
    mesh.position.set(x + Math.sin(ry) * 0.04, y, z + Math.cos(ry) * 0.04);
    mesh.rotation.y = ry;
    kit.group.add(mesh);
  }

  function archPiers(x, z, width, radius, depth) {
    const halfPier = Math.max(0.25, (width / 2 - radius) / 2);
    return [-1, 1].map(side => [x + side * (radius + halfPier), z, halfPier, depth / 2]);
  }

  function vaultedBay(T, kit, x, z, w, h, r, sy, d, wallColor, trimColor, darkColor) {
    const { profile, box, outline } = kit;
    const shape = new T.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(-r, 0); shape.lineTo(-r, sy);
    shape.absarc(0, sy, r, Math.PI, 0, true);
    shape.lineTo(r, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h);
    shape.closePath();
    profile(shape, wallColor, x, 0, z - d / 2, d);
    for (const side of [-1, 1]) {
      const f = z + side * (d / 2 + 0.03);
      for (const s of [-1, 1]) {
        box(trimColor, x + s * (r + 0.14), sy / 2, f, 0.22, sy, 0.12);
        box(darkColor, x + s * (r + 0.18), sy - 0.02, f, 0.32, 0.14, 0.16);
      }
      for (let i = 0; i < 11; i++) {
        const a = i * Math.PI / 11, b = (i + 1) * Math.PI / 11 - 0.014;
        const pt = (q, t) => [q * Math.cos(t), q * Math.sin(t)];
        outline([pt(r, a), pt(r + 0.22, a), pt(r + 0.22, b), pt(r, b)], i % 2 ? trimColor : darkColor, x, sy, f - 0.04, 0.1);
      }
    }
  }

  function curvedRoof(T, kit, x, y, z, w, d, h, tileColor, ridgeColor, eaveColor, ridgeRatio = 0.28, opts = {}) {
    const { stamp, box, outline } = kit;
    kit.palette({tile:tileColor}, true);
    const p = [], ledge = 0.15;
    function quad(a, b, c, dPt) { p.push(...a, ...b, ...dPt, ...b, ...c, ...dPt); }
    const ring = (t) => {
      const v = [];
      for (const [ax, az, bx, bz] of [[-1, -1, -1, 1], [-1, 1, 1, 1], [1, 1, 1, -1], [1, -1, -1, -1]]) {
        for (let i = 0; i < 8; i++) {
          const u = i / 8, xx = ax + (bx - ax) * u, zz = az + (bz - az) * u;
          const corner = Math.pow(Math.min(Math.abs(xx), Math.abs(zz)), 4.5);
          v.push([
            x + xx * (w / 2 * (1 - t) + w * ridgeRatio * t),
            y + h * t * t + corner * (1 - t) * Math.min(0.55, h * 0.44),
            z + zz * (d / 2 * (1 - t))
          ]);
        }
      }
      return v;
    };
    let outer = ring(0), prev = outer;
    for (const t of [0.33, 0.67, 1]) {
      const next = ring(t);
      for (let j = 0; j < 32; j++) { const k = (j + 1) % 32; quad(prev[j], next[j], next[k], prev[k]); }
      prev = next;
    }
    for (let i = 0; i < p.length; i += 9) {
      for (let axis = 0; axis < 3; axis++) [p[i + 3 + axis], p[i + 6 + axis]] = [p[i + 6 + axis], p[i + 3 + axis]];
    }
    for (let j = 0; j < 32; j++) {
      const k = (j + 1) % 32, a = outer[j], b = outer[k];
      const lowerA = [a[0], a[1] - ledge, a[2]], lowerB = [b[0], b[1] - ledge, b[2]];
      quad(b, a, lowerA, lowerB);
      // Return the soffit to the wall so the sky does not show through the eaves.
      const inner = v => [x + (v[0]-x)*.75, y-.12, z + (v[2]-z)*.75];
      quad(lowerA, lowerB, inner(lowerB), inner(lowerA));
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    stamp(g, tileColor, 0, 0, 0);
    g.dispose();
    // Raised hip caps follow the four swept pitches right to the corner tile.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const points=[];
      for (let j=0; j<=4; j++) {
        const t=j/4;
        points.push(new T.Vector3(x+sx*w*((1-t)*.5+ridgeRatio*t),
          y+h*t*t+(1-t)*Math.min(.55,h*.44)+.045, z+sz*d*.5*(1-t)));
      }
      const cap=new T.TubeGeometry(new T.CatmullRomCurve3(points),6,.093,6,false);
      stamp(cap,ridgeColor,0,0,0);
      cap.dispose();
    }
    box(ridgeColor, x, y + h + 0.08, z, Math.max(0.45, w * ridgeRatio * 2.15), 0.19, 0.24);
    for (const s of [-1, 1]) for (const f of [-1, 1]) {
      outline([[-0.30, 0], [0, 0.05], [0.22, 0.24], [0.38, 0.54], [0.40, 0.22], [0.24, -0.02], [0, -0.15]],
        eaveColor, x + s * w * 0.49, y + 0.34, z + f * (d / 2 - 0.1), 0.11, s === 1 ? 0 : Math.PI);
    }
    if (opts.dragons) {
      const span = Math.max(0.65, w * ridgeRatio * 0.82);
      const orb = new T.SphereGeometry(0.24, 10, 8);
      stamp(orb, opts.goldColor || 0xcfa449, x, y + h + 0.34, z, 1, 1, 0.5);
      orb.dispose();
      for (const s of [-1, 1]) {
        outline([[0, 0], [0.35, 0.12], [0.68, 0.42], [0.95, 0.24], [1.18, 0.52], [0.98, 0.65], [0.65, 0.62], [0.24, 0.34]],
          opts.goldColor || 0xb78e46, x + s * span, y + h + 0.14, z, 0.12, s === 1 ? Math.PI : 0);
      }
    }
  }

  function gabledRoof(T, kit, x, y, z, w, d, h, tileColor, ridgeColor, opts = {}) {
    const { outline, box } = kit;
    kit.palette({tile:tileColor}, true);
    const thick = opts.thick || 0.22;
    const over = opts.overhang || 0.35;
    const hw = w / 2 + over;
    const len = d + over * 2;
    const alongX = Boolean(opts.alongX);
    if (alongX) {
      const hd = d / 2 + over;
      outline([[-hd, 0], [0, h], [hd, 0], [hd, -thick], [0, h - thick], [-hd, -thick]], tileColor, x - w / 2 - over, y, z, w + over * 2, Math.PI / 2);
      box(ridgeColor, x, y + h + 0.06, z, w + over * 2.1, 0.2, 0.24);
    } else {
      outline([[-hw, 0], [0, h], [hw, 0], [hw, -thick], [0, h - thick], [-hw, -thick]], tileColor, x, y, z - len / 2, len);
      box(ridgeColor, x, y + h + 0.06, z, 0.24, 0.2, len + 0.12);
    }
  }

  // Cylinder connector between two 3D points (ideal for bridge stay cables, catenary hangers, steel trusses)
  function strut(T, kit, color, x1, y1, z1, x2, y2, z2, radius = 0.08) {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.02) return;
    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5, mz = (z1 + z2) * 0.5;
    const dir = new T.Vector3(dx / len, dy / len, dz / len);
    const quat = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    const eul = new T.Euler().setFromQuaternion(quat, 'YXZ');
    kit.stamp(kit.round, color, mx, my, mz, radius, len, radius, eul.y, eul.x, eul.z);
  }

  // Stepped masonry foundation plinth
  function steps(kit, x, z, w, d, count, stepH, stepRun, color) {
    for (let i = 0; i < count; i++) {
      kit.box(color, x, stepH * (i + 0.5), z + (count - 1 - i) * stepRun * 0.5, w - i * 0.32, stepH, d + (count - 1 - i) * stepRun);
    }
  }

  // Reusable Vietnamese Tam Quan / Nghi Môn gate
  function tamQuan(T, kit, opts = {}) {
    const { box, tapered } = kit;
    const wall = opts.wall || 0xd6c39c;
    const trim = opts.trim || 0xb79b6b;
    const dark = opts.dark || 0x564638;
    const tile = opts.tile || 0x864232;
    const ridge = opts.ridge || 0xd5c5a3;
    const eave = opts.eave || 0xc79f56;
    const wCenter = opts.wCenter || 5.4;
    const wSide = opts.wSide || 4.0;
    const depth = opts.depth || 3.0;
    const hCenter = opts.hCenter || 5.0;
    const hSide = opts.hSide || 3.6;
    const sideX = (wCenter + wSide) * 0.5 - 0.1;

    // Stone stepped base
    box(0x8e8679, 0, 0.22, 0, wCenter + wSide * 2 + 4.4, 0.44, depth + 2.4);
    vaultedBay(T, kit, 0, 0, wCenter, hCenter, wCenter * 0.30, hCenter * 0.52, depth, wall, trim, dark);
    for (const s of [-1, 1]) {
      vaultedBay(T, kit, s * sideX, 0, wSide, hSide, wSide * 0.27, hSide * 0.50, depth * 0.78, wall, trim, dark);
      curvedRoof(T, kit, s * sideX, hSide + 0.04, 0, wSide + 1.0, depth * 1.15, 0.85, tile, ridge, eave, 0.26);
      if (opts.twoTierSides) {
        box(trim, s * sideX, hSide + 1.05, 0, wSide * 0.72, 1.15, depth * 0.56);
        for (const f of [-1, 1]) box(dark, s * sideX, hSide + 1.05, f * depth * 0.30, wSide * 0.28, 0.68, 0.08);
        curvedRoof(T, kit, s * sideX, hSide + 1.62, 0, wSide + 0.4, depth * 0.92, 0.78, tile, ridge, eave, 0.24);
      }
      // Flanking Tứ Trụ Biểu ceremonial pillars
      if (opts.pillars !== false) {
        const px = s * (sideX + wSide * 0.5 + 1.25);
        box(dark, px, 0.55, 0.15, 1.05, 0.75, 1.05);
        box(wall, px, 2.75, 0.15, 0.70, 3.65, 0.70);
        for (const y of [1.0, 4.4, 4.82]) box(trim, px, y, 0.15, 0.88, 0.15, 0.88);
        tapered(eave, px, 5.32, 0.15, 0.44, 0.14, 0.68, 1, 4);
        box(0x7c2d23, px, 2.75, 0.52, 0.24, 2.35, 0.05);
      }
    }
    // Center roof(s) & upper bell pavilion
    box(trim, 0, hCenter + 0.12, 0, wCenter + 0.45, 0.24, depth + 0.35);
    if (opts.title) {
      plaque(T, kit, opts.title, 0, hCenter - 0.45, depth / 2 + 0.12, Math.min(3.4, wCenter * 0.62), 0.62, opts.plaque || {});
    }
    curvedRoof(T, kit, 0, hCenter + 0.22, 0, wCenter + 1.35, depth + 1.15, 1.02, tile, ridge, eave, 0.30);
    // Upper pavilion tier (gác chuông)
    const upY = hCenter + 1.25;
    box(wall, 0, upY + 0.85, 0, wCenter * 0.74, 1.75, depth * 0.76);
    for (const f of [-1, 1]) {
      box(0x5a261b, 0, upY + 0.85, f * depth * 0.39, wCenter * 0.30, 1.15, 0.08);
      for (const s of [-1, 1]) box(trim, s * wCenter * 0.27, upY + 0.85, f * depth * 0.39, 0.32, 1.25, 0.10);
    }
    curvedRoof(T, kit, 0, upY + 1.72, 0, wCenter + 0.65, depth + 0.65, 1.15, tile, ridge, eave, 0.28, { dragons: true, goldColor: eave });
  }

  // Reusable Vietnamese temple / palace / communal hall (Đình / Đền / Điện / Hội quán)
  function vietnameseHall(T, kit, opts = {}) {
    const { box, stamp, round } = kit;
    const w = opts.w || 16;
    const d = opts.d || 9.5;
    const baseH = opts.baseH || 1.1;
    const colH = opts.colH || 3.6;
    const wall = opts.wall || 0xdccaa2;
    const wood = opts.wood || 0x5c271c;
    const tile = opts.tile || 0x8b4231;
    const ridge = opts.ridge || 0xd6c7a8;
    const eave = opts.eave || 0xc99c4a;
    const stone = opts.stone || 0x918a7f;
    const bays = opts.bays || 5;

    kit.palette({timber:wood,stone,plaster:wall}, true);
    // Terraced stone foundation & front steps
    box(stone, 0, baseH * 0.5, 0, w + 2.4, baseH, d + 2.6);
    steps(kit, 0, d * 0.5 + 1.6, Math.min(7.5, w * 0.42), 1.4, 4, baseH / 4, 0.38, 0x847e74);
    for (const s of [-1, 1]) {
      box(0x7c766c, s * (Math.min(7.5, w * 0.42) * 0.5 + 0.25), baseH * 0.58, d * 0.5 + 1.9, 0.36, baseH * 0.85, 2.4);
    }

    // Main core body & veranda colonnade
    const cy = baseH + colH * 0.5;
    box(wall, 0, cy, -0.5, w - 1.2, colH, d - 1.8);
    for (let i = 0; i <= bays; i++) {
      const px = -w / 2 + 0.5 + (i / bays) * (w - 1.0);
      for (const pz of [-d / 2 + 0.35, d / 2 - 0.35]) {
        stamp(round, wood, px, cy, pz, 0.19, colH, 0.19);
        stamp(round, stone, px, baseH + 0.14, pz, 0.28, 0.28, 0.28);
      }
      if (i < bays) {
        const bx = px + (w - 1.0) / bays * 0.5;
        // Framed leaves, recessed panels and an open lattice above the door rail.
        const span=(w-1.4)/bays*.86, face=d/2-1.38;
        box(0x37271e,bx,cy,face,span,colH*.88,.16);
        for(const side of [-1,1]){
          const leaf=bx+side*span*.25;
          box(wood,leaf,baseH+colH*.36,face+.10,span*.46,colH*.50,.09);
          for(const edge of [-1,1])box(wood,leaf+edge*span*.214,cy,face+.17,.07,colH*.84,.07);
          for(const f of [.13,.44,.60,.84])box(wood,leaf,baseH+colH*f,face+.17,span*.46,.08,.07);
          for(let j=-1;j<=1;j++)box(wood,leaf+j*span*.105,baseH+colH*.72,face+.15,.04,colH*.22,.05);
        }
      }
    }
    // Front veranda beam & optional horizontal plaque
    box(wood, 0, baseH + colH - 0.14, d / 2 - 0.35, w - 0.6, 0.26, 0.24);
    if (opts.title) {
      plaque(T, kit, opts.title, 0, baseH + colH - 0.42, d / 2 - 0.12, Math.min(4.6, w * 0.34), 0.72, opts.plaque || { bg: '#6e231a', fg: '#f4d374' });
    }

    // Sweeping lower curved roof
    const roof1Y = baseH + colH;
    const roof1H = opts.doubleTier ? 1.55 : 2.55;
    curvedRoof(T, kit, 0, roof1Y, 0, w + 2.4, d + 2.4, roof1H, tile, ridge, eave, 0.32, { dragons: !opts.doubleTier, goldColor: eave });

    if (opts.doubleTier) {
      const tierY = roof1Y + roof1H * 0.82;
      const w2 = w * 0.70, d2 = d * 0.66, h2 = 1.65;
      box(opts.atticColor || 0x873024, 0, tierY + h2 * 0.5, 0, w2, h2, d2);
      for (let i = -2; i <= 2; i++) {
        box(eave, i * (w2 * 0.20), tierY + h2 * 0.5, d2 * 0.5 + 0.04, 0.18, h2 * 0.9, 0.08);
        if (i < 2) box(0x3a2018, (i + 0.5) * (w2 * 0.20), tierY + h2 * 0.55, d2 * 0.5 + 0.04, w2 * 0.13, h2 * 0.48, 0.06);
      }
      curvedRoof(T, kit, 0, tierY + h2, 0, w2 + 2.2, d2 + 2.1, 1.85, tile, ridge, eave, 0.30, { dragons: true, goldColor: eave });
    }

    // Courtyard bronze incense burner (đỉnh hương) & low flanking screen
    if (opts.incense !== false) {
      const iz = d / 2 + 4.4;
      stamp(round, stone, 0, 0.28, iz, 0.95, 0.56, 0.95);
      stamp(round, 0x5c4f3d, 0, 0.92, iz, 0.62, 0.78, 0.62);
      stamp(round, 0x6f5f47, 0, 1.38, iz, 0.76, 0.16, 0.76);
    }
  }

  // Authentic Champa fired-brick tower (Tháp Chăm — Kalan)
  function chamTower(T, kit, x, z, opts = {}) {
    const { box, stamp, tapered, outline } = kit;
    const w = opts.w || 7.6;
    const h = opts.h || 18.0;
    const brick = opts.brick || 0xa7523a;
    const darkBrick = opts.darkBrick || 0x843f2c;
    const sandstone = opts.sandstone || 0xc5b293;
    const octagonal = Boolean(opts.octagonal);

    kit.palette({stone:sandstone,brick:[brick,darkBrick]}, true);
    // Molded brick plinth base (chân đế)
    if (octagonal) {
      stamp(new T.CylinderGeometry(w * 0.62, w * 0.68, 1.4, 8), darkBrick, x, 0.7, z);
      stamp(new T.CylinderGeometry(w * 0.58, w * 0.62, 0.45, 8), sandstone, x, 1.6, z);
    } else {
      box(darkBrick, x, 0.65, z, w + 1.3, 1.3, w + 1.3);
      box(brick, x, 1.55, z, w + 0.65, 0.55, w + 0.65);
    }

    // Main vertical tower body with pilasters (trụ ốp tường)
    const bodyY = 1.8;
    const bodyH = h * 0.44;
    if (octagonal) {
      const shaft = new T.CylinderGeometry(w * 0.53, w * 0.56, bodyH, 8);
      stamp(shaft, brick, x, bodyY + bodyH * 0.5, z);
      shaft.dispose();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8;
        box(darkBrick, x + Math.sin(a) * w * 0.55, bodyY + bodyH * 0.5, z + Math.cos(a) * w * 0.55, 0.45, bodyH * 0.94, 0.24, a);
      }
    } else {
      box(brick, x, bodyY + bodyH * 0.5, z, w, bodyH, w);
      for (const s of [-1, 1]) for (const f of [-1, 1]) {
        box(darkBrick, x + s * (w * 0.44), bodyY + bodyH * 0.5, z + f * (w * 0.5 + 0.08), 0.52, bodyH * 0.96, 0.18);
        box(darkBrick, x + f * (w * 0.5 + 0.08), bodyY + bodyH * 0.5, z + s * (w * 0.44), 0.18, bodyH * 0.96, 0.52);
      }
      // Projecting entrance vestibule (tiền sảnh) on +Z with sandstone lintel & pointed pediment
      const vw = w * 0.48, vh = bodyH * 0.86, vd = w * 0.34;
      box(brick, x, bodyY + vh * 0.5, z + w * 0.5 + vd * 0.5, vw, vh, vd);
      box(0x2a1b16, x, bodyY + vh * 0.38, z + w * 0.5 + vd + 0.02, vw * 0.46, vh * 0.64, 0.12);
      box(sandstone, x, bodyY + vh * 0.72, z + w * 0.5 + vd + 0.08, vw * 0.72, 0.42, 0.24);
      // Pointed Champa flame-arch tympanum (vòm cuốn mũi giáo)
      outline([[-vw * 0.48, 0], [-vw * 0.34, 1.3], [0, 2.35], [vw * 0.34, 1.3], [vw * 0.48, 0]],
        darkBrick, x, bodyY + vh * 0.78, z + w * 0.5 + vd * 0.45, vd * 0.6);
      // Blind false doors (cửa giả) on the other 3 facades
      for (const [ang, fx, fz] of [[Math.PI, 0, -1], [Math.PI / 2, 1, 0], [-Math.PI / 2, -1, 0]]) {
        const dist = w * 0.5 + 0.12;
        box(darkBrick, x + fx * dist, bodyY + vh * 0.42, z + fz * dist, vw * 0.78, vh * 0.76, 0.24, ang);
        box(sandstone, x + fx * (dist + 0.08), bodyY + vh * 0.76, z + fz * (dist + 0.08), vw * 0.62, 0.32, 0.16, ang);
        outline([[-vw * 0.38, 0], [-vw * 0.26, 0.95], [0, 1.75], [vw * 0.26, 0.95], [vw * 0.38, 0]],
          darkBrick, x + fx * dist, bodyY + vh * 0.80, z + fz * dist, 0.24, ang);
      }
    }

    // Multi-tiered receding pyramidal Champa roof stories + corner turret finials (tháp góc)
    let curY = bodyY + bodyH;
    const tiers = opts.tiers || 3;
    for (let t = 0; t < tiers; t++) {
      const f = 1 - t * 0.22;
      const tw = w * f;
      const th = (h * 0.40) / tiers;
      // Cornice band
      if (octagonal) {
        const corn = new T.CylinderGeometry(tw * 0.60, tw * 0.55, 0.42, 8);
        stamp(corn, sandstone, x, curY + 0.21, z); corn.dispose();
        const mid = new T.CylinderGeometry(tw * 0.46, tw * 0.54, th, 8);
        stamp(mid, t % 2 ? darkBrick : brick, x, curY + 0.42 + th * 0.5, z); mid.dispose();
      } else {
        box(sandstone, x, curY + 0.18, z, tw + 0.55, 0.36, tw + 0.55);
        box(t % 2 ? darkBrick : brick, x, curY + 0.36 + th * 0.5, z, tw * 0.84, th, tw * 0.84);
        // Corner miniature turrets (tháp nhỏ góc mái)
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const tx = x + sx * (tw * 0.44), tz = z + sz * (tw * 0.44);
          box(darkBrick, tx, curY + 0.72, tz, tw * 0.16, 0.85, tw * 0.16);
          tapered(brick, tx, curY + 1.38, tz, tw * 0.11, 0.04, 0.58, 1, 4);
        }
      }
      curY += th + 0.36;
    }

    // Lotus sandstone capstone (đỉnh tháp hoa sen)
    tapered(sandstone, x, curY + 0.85, z, w * 0.22, 0.08, 1.75, 1, octagonal ? 8 : 4);
    const orb = new T.SphereGeometry(w * 0.06, 8, 6);
    stamp(orb, sandstone, x, curY + 1.85, z);
    orb.dispose();
  }

  // Multi-tier octagonal Buddhist stupa / pagoda tower (Tháp bát giác)
  function octagonalTower(T, kit, x, z, opts = {}) {
    const { stamp, tapered } = kit;
    const tiers = opts.tiers || 7;
    const baseR = opts.baseR || 3.6;
    const tierH = opts.tierH || 2.15;
    const wall = opts.wall || 0xd4b68c;
    const tile = opts.tile || 0x894230;
    const trim = opts.trim || 0xb78e4d;

    kit.palette({plaster:wall,tile}, true);
    // Stepped octagonal foundation
    tapered(0x888176, x, 0.55, z, baseR + 1.4, baseR + 1.1, 1.1, 1, 8);
    let curY = 1.1;
    for (let i = 0; i < tiers; i++) {
      const f = 1 - i * (0.52 / tiers);
      const r = baseR * f;
      const h = tierH * (1 - i * 0.04);
      tapered(wall, x, curY + h * 0.5, z, r, r * 0.96, h, 1, 8);
      // Arched dark openings on alternating faces
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + (i % 2 ? Math.PI / 4 : 0);
        kit.box(0x3a2820, x + Math.sin(a) * r * 0.92, curY + h * 0.45, z + Math.cos(a) * r * 0.92, r * 0.34, h * 0.54, 0.14, a);
      }
      // Flared octagonal tiled roof eave
      tapered(tile, x, curY + h + 0.35, z, r * 1.38, r * 0.88, 0.72, 1, 8);
      tapered(trim, x, curY + h + 0.02, z, r * 1.42, r * 1.36, 0.12, 1, 8);
      curY += h + 0.62;
    }
    // Lotus pinnacle spire (chóp hồ lô / búp sen)
    tapered(trim, x, curY + 0.95, z, baseR * 0.24, 0.06, 1.9, 1, 8);
    const orb = new T.SphereGeometry(0.28, 10, 8);
    stamp(orb, 0xd8b153, x, curY + 2.05, z);
    orb.dispose();
  }

  // Coastal Vietnamese Lighthouse (Hải đăng) + keeper house
  function lighthouse(T, kit, opts = {}) {
    const { box, stamp, round, tapered } = kit;
    const h = opts.h || 18;
    const rBase = opts.rBase || 2.55;
    const rTop = opts.rTop || 1.65;
    const body = opts.body || 0xebe6d8;
    const band = opts.band || 0xb53c2e;
    const dome = opts.dome || 0x9c3228;
    const striped = Boolean(opts.striped);
    const octagonal = Boolean(opts.octagonal);
    const sides = octagonal ? 8 : 20;

    kit.palette({plaster:[body,band],metal:[dome,0x3a4042],glass:0xadc6c7}, true);
    // Coastal stone seawall terrace
    box(0x888479, 0, 0.65, 0, 14.5, 1.3, 12.5);
    box(0x9a9588, 0, 1.42, 0, 14.8, 0.24, 12.8);

    // Keeper's house beside the tower
    const kx = -3.8, kz = -0.8;
    box(opts.houseWall || 0xe8dfc8, kx, 3.05, kz, 6.2, 3.4, 5.4);
    gabledRoof(T, kit, kx, 4.78, kz, 6.5, 5.6, 1.65, opts.roofColor || 0x9b4634, 0xd9cdb2, { alongX: true });
    for (const wx of [-5.2, -2.4]) box(0x2e4a47, wx, 3.1, kz + 2.72, 1.05, 1.35, 0.08);
    box(0x5a3525, kx, 2.55, kz + 2.72, 1.15, 2.1, 0.10);

    // Main lighthouse shaft
    const tx = 2.6, tz = 0.2;
    const baseY = 1.5;
    if (striped) {
      const segs = 5, sh = h / segs;
      for (let i = 0; i < segs; i++) {
        const rb = rBase + (rTop - rBase) * (i / segs);
        const rt = rBase + (rTop - rBase) * ((i + 1) / segs);
        tapered(i % 2 === 0 ? body : band, tx, baseY + sh * (i + 0.5), tz, rb, rt, sh + 0.02, 1, sides);
      }
    } else {
      tapered(body, tx, baseY + h * 0.5, tz, rBase, rTop, h, 1, sides);
      tapered(band, tx, baseY + 1.0, tz, rBase + 0.14, rBase + 0.06, 2.0, 1, sides);
    }
    // Small vertical slit windows climbing the shaft
    for (let i = 1; i <= 3; i++) {
      const wy = baseY + (h * i) / 4;
      const wr = rBase + (rTop - rBase) * (i / 4);
      box(0x28373b, tx, wy, tz + wr, 0.42, 0.88, 0.16);
    }

    // Corbelled gallery balcony & iron railing
    const galY = baseY + h;
    tapered(0x7c7b74, tx, galY + 0.28, tz, rTop, rTop + 0.65, 0.56, 1, sides);
    stamp(round, 0xd8d3c6, tx, galY + 0.68, tz, rTop + 0.72, 0.24, rTop + 0.72);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12;
      box(0x3a4042, tx + Math.sin(a) * (rTop + 0.62), galY + 1.25, tz + Math.cos(a) * (rTop + 0.62), 0.07, 1.0, 0.07);
    }
    const rail = new T.TorusGeometry(rTop + 0.62, 0.06, 6, 20);
    rail.rotateX(Math.PI / 2);
    stamp(rail, 0x3a4042, tx, galY + 1.72, tz);
    rail.dispose();

    // Glazed lantern room + cupola dome + lightning finial
    // Recess the glazing behind the lantern mullions and gallery rail.
    stamp(round, 0xadc6c7, tx, galY + 1.95, tz, rTop * 0.71, 2.25, rTop * 0.71);
    for(const level of [1.0,2.85])
      stamp(round,0x3a4042,tx,galY+level,tz,rTop*.77,.095,rTop*.77);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      box(0x2f3538, tx + Math.sin(a) * rTop * 0.76, galY + 1.95, tz + Math.cos(a) * rTop * 0.76, 0.09, 2.3, 0.09);
    }
    const cup = new T.SphereGeometry(rTop * 0.82, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    stamp(cup, dome, tx, galY + 3.05, tz);
    cup.dispose();
    stamp(round, 0xd6b050, tx, galY + 3.05 + rTop * 0.82 + 0.75, tz, 0.06, 1.5, 0.06);

    if (opts.title) {
      plaque(T, kit, opts.title, kx, 1.85, 6.32, 3.6, 0.64, { bg: '#f2ead4', fg: '#1d4c63' });
    }
  }

  // Vietnamese Catholic Church / Cathedral (Nhà thờ Gothic / Romanesque / Gỗ Tây Nguyên)
  function gothicChurch(T, kit, opts = {}) {
    const { box, stamp, tapered, outline, round } = kit;
    const w = opts.w || 15;
    const d = opts.d || 32;
    const wall = opts.wall || 0xd6cbb8;
    const trim = opts.trim || 0xf0e7d6;
    const roof = opts.roof || 0x8a4232;
    const dark = opts.dark || 0x332b27;
    const twinTowers = Boolean(opts.twinTowers);
    const towerH = opts.towerH || 24;
    const naveH = opts.naveH || 10.5;

    kit.palette({plaster:[wall,trim],glass:0x3b4e63}, true);
    // Stepped stone forecourt
    box(0x8c877d, 0, 0.4, 1.2, w + 3.0, 0.8, d + 4.8);
    steps(kit, 0, d / 2 + 2.4, w * 0.52, 1.6, 4, 0.2, 0.36, 0x999389);

    // Main nave body & side buttresses
    box(wall, 0, 0.8 + naveH * 0.5, -1.0, w, naveH, d - 2.0);
    gabledRoof(T, kit, 0, 0.8 + naveH, -1.0, w + 0.6, d - 1.6, naveH * 0.52, roof, trim);
    const nBays = Math.max(4, Math.round(d / 5.2));
    for (let i = 0; i < nBays; i++) {
      const bz = -d / 2 + 2.5 + (i / (nBays - 1)) * (d - 6.8);
      for (const s of [-1, 1]) {
        box(trim, s * (w / 2 + 0.22), 0.8 + naveH * 0.45, bz, 0.55, naveH * 0.9, 0.65);
        if (i < nBays - 1) {
          const wz = bz + (d - 6.8) / (nBays - 1) * 0.5;
          box(dark, s * (w / 2 + 0.04), 0.8 + naveH * 0.56, wz, 0.10, naveH * 0.46, 1.35);
          box(0xb58f4e, s * (w / 2 + 0.08), 0.8 + naveH * 0.56, wz, 0.06, naveH * 0.42, 0.10);
        }
      }
    }

    // Front gable facade, pointed portal & rose window
    const fz = d / 2 - 2.0;
    box(wall, 0, 0.8 + naveH * 0.58, fz + 0.45, w + 0.4, naveH * 1.15, 1.1);
    outline([[-w * 0.52, 0], [0, naveH * 0.62], [w * 0.52, 0]], wall, 0, 0.8 + naveH * 1.14, fz - 0.08, 1.05);
    // Pointed main portal
    box(dark, 0, 0.8 + 2.5, fz + 1.02, 3.1, 4.9, 0.18);
    outline([[-2.0, 0], [-1.55, 2.2], [0, 3.6], [1.55, 2.2], [2.0, 0]], trim, 0, 0.8 + 3.0, fz + 0.96, 0.24);
    // Rose window
    stamp(round, trim, 0, 0.8 + naveH * 0.82, fz + 1.02, 1.65, 0.24, 1.65, 0, Math.PI / 2);
    stamp(round, 0x3b4e63, 0, 0.8 + naveH * 0.82, fz + 1.09, 1.32, 0.16, 1.32, 0, Math.PI / 2);

    // Bell tower(s) & crosses
    const positions = twinTowers ? [-w * 0.40, w * 0.40] : [0];
    const tw = twinTowers ? Math.min(4.4, w * 0.30) : Math.min(5.2, w * 0.36);
    for (const tx of positions) {
      const baseTop = 0.8 + towerH * 0.64;
      box(wall, tx, 0.8 + towerH * 0.32, fz + 0.2, tw, towerH * 0.64, tw);
      box(trim, tx, baseTop + 0.14, fz + 0.2, tw + 0.48, 0.30, tw + 0.48);
      // Belfry louver tier
      const bh = towerH * 0.16;
      const bellY=baseTop+.28+bh*.5, half=tw*.44;
      for(const sx of [-1,1])for(const sz of [-1,1])
        box(wall,tx+sx*(half-tw*.09),bellY,fz+.2+sz*(half-tw*.09),tw*.18,bh,tw*.18);
      for(const level of [-1,1])box(trim,tx,bellY+level*bh*.44,fz+.2,tw*.91,bh*.12,tw*.91);
      tapered(0x65583e,tx,bellY,fz+.2,tw*.20,tw*.095,bh*.44,1,16);
      for(const side of [-1,1])for(let j=1;j<=4;j++){
        const sy=bellY+bh*(j/5-.5)*.82;
        box(dark,tx,sy,fz+.2+side*half,tw*.53,.07,.16,0,side*.38);
        box(dark,tx+side*half,sy,fz+.2,.16,.07,tw*.53,0,0,-side*.38);
      }
      // Tall spire & cross
      const spireY = baseTop + 0.28 + bh;
      const spireH = towerH * 0.30;
      tapered(roof, tx, spireY + spireH * 0.5, fz + 0.2, tw * 0.64, 0.12, spireH, 1, 4);
      const cy = spireY + spireH;
      box(0xdab254, tx, cy + 1.25, fz + 0.2, 0.16, 2.5, 0.16);
      box(0xdab254, tx, cy + 1.75, fz + 0.2, 1.35, 0.16, 0.16);
    }

    if (opts.title) {
      plaque(T, kit, opts.title, 0, 0.8 + 5.8, fz + 1.12, Math.min(5.2, w * 0.38), 0.62, { bg: '#efe6cf', fg: '#5a2d24' });
    }
  }

  // French-Indochinese / Civic Heritage Building (Trường học, Bảo tàng, Chợ, Biệt điện)
  function colonialBuilding(T, kit, opts = {}) {
    const { box, outline } = kit;
    const w = opts.w || 28;
    const d = opts.d || 13;
    const floors = opts.floors || 2;
    const floorH = opts.floorH || 4.1;
    const h = floors * floorH;
    const wall = opts.wall || 0xe8c97a;
    const trim = opts.trim || 0xf4ecd8;
    const shutter = opts.shutter || 0x2f5a44;
    const roof = opts.roof || 0x9c4532;
    const bays = opts.bays || Math.max(5, Math.round(w / 3.8));

    kit.palette({plaster:[wall,trim],timber:shutter,glass:0x283538}, true);
    // Raised stone plinth
    box(0x8d877c, 0, 0.45, 0, w + 1.4, 0.9, d + 1.4);
    steps(kit, 0, d / 2 + 1.1, Math.min(6.4, w * 0.28), 1.3, 4, 0.22, 0.32, 0x999286);

    // Main block
    box(wall, 0, 0.9 + h * 0.5, 0, w, h, d);
    // Horizontal molding cornices between floors
    for (let fl = 0; fl <= floors; fl++) {
      box(trim, 0, 0.9 + fl * floorH, 0, w + 0.42, 0.26, d + 0.42);
    }

    // Arched loggia piers + green louvered shutters along front & back
    const bayW = (w - 1.6) / bays;
    for (let i = 0; i <= bays; i++) {
      const px = -w / 2 + 0.8 + i * bayW;
      for (const f of [-1, 1]) {
        box(trim, px, 0.9 + h * 0.5, f * (d / 2 + 0.14), 0.36, h, 0.28);
      }
      if (i < bays) {
        const bx = px + bayW * 0.5;
        for (let fl = 0; fl < floors; fl++) {
          const wy = 0.9 + fl * floorH + floorH * 0.52;
          for (const f of [-1, 1]) {
            box(0x283538, bx, wy, f * (d / 2 + 0.04), bayW * 0.52, floorH * 0.56, 0.10);
            box(trim, bx, wy-floorH*.29, f*(d/2+.13), bayW*.86,.13,.33);
            box(shutter, bx, wy, f*(d/2+.11), .064,floorH*.55,.075);
            box(shutter, bx, wy+floorH*.12, f*(d/2+.11), bayW*.52,.075,.075);
            for (const s of [-1, 1]) {
              const sx=bx+s*bayW*.33;
              box(shutter,sx,wy,f*(d/2+.10),bayW*.17,floorH*.56,.08);
              for(let j=-3;j<=3;j++)
                box(shutter,sx,wy+j*floorH*.067,f*(d/2+.16),bayW*.144,.075,.09,0,f*.45);
            }
          }
        }
      }
    }

    // Pitched hipped / gabled terracotta roof + central pediment / clock dormer
    gabledRoof(T, kit, 0, 0.9 + h + 0.1, 0, w + 0.8, d + 0.8, Math.min(4.2, d * 0.30), roof, trim, { alongX: true });
    // Central projecting classical pediment over main entry
    const pw = Math.min(8.5, w * 0.30);
    box(wall, 0, 0.9 + h * 0.52, d / 2 + 0.55, pw, h * 1.04, 1.1);
    const doorway=Math.min(2.65,pw*.57), jamb=d/2+1.15;
    box(0x283538,0,2.25,jamb,doorway,2.70,.12);
    for(const edge of [-1,1]){
      box(trim,edge*(doorway/2+.10),2.25,jamb+.08,.20,2.70,.24);
      box(shutter,edge*doorway*.23,1.62,jamb+.085,doorway*.44,1.42,.09);
    }
    box(trim,0,3.63,jamb+.10,doorway+.52,.22,.38);
    box(shutter,0,2.25,jamb+.085,.08,2.70,.09);
    outline([[-pw * 0.54, 0], [0, 2.25], [pw * 0.54, 0]], trim, 0, 0.9 + h + 0.15, d / 2 + 0.2, 0.95);
    if (opts.clock) {
      kit.stamp(kit.round, 0xf6f0dc, 0, 0.9 + h + 1.05, d / 2 + 1.18, 0.72, 0.14, 0.72, 0, Math.PI / 2);
      kit.box(0x282828, 0, 0.9 + h + 1.18, d / 2 + 1.27, 0.07, 0.42, 0.05);
      kit.box(0x282828, 0.14, 0.9 + h + 1.05, d / 2 + 1.27, 0.34, 0.07, 0.05);
    }
    if (opts.title) {
      plaque(T, kit, opts.title, 0, 0.9 + h - 0.55, d / 2 + 1.16, Math.min(pw - 0.5, 6.2), 0.78, opts.plaque || { bg: '#f4e6c2', fg: '#782b20' });
    }
  }

  // Heroic Vietnamese Memorial / Victory Monument (Tượng đài & Quảng trường)
  // Sweep elliptical cross sections through the carve. Each section records
  // its centre and the two radii, in fractions of the height of one figure.
  function carving(T, kit, tint, x, y, z, size, yaw = 0) {
    const vertices = [], indices = [];
    function sweep(sections, folds = 0, sides = 16) {
      const first = vertices.length / 3;
      const centres = sections.map(([x, y, z]) => new T.Vector3(x, y, z));
      const axis = new T.Vector3(), side = new T.Vector3(), front = new T.Vector3();
      for (let row = 0; row < sections.length; row++) {
        axis.subVectors(centres[Math.min(row + 1, centres.length - 1)], centres[Math.max(0, row - 1)]).normalize();
        // Looking down an arm or leg, keep the carving's broad faces
        // aligned with the front of the statue as the joint bends.
        side.set(axis.y, -axis.x, 0);
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
        side.normalize();
        front.crossVectors(side, axis).normalize();
        const [cx, cy, cz, width, depth] = sections[row];
        for (let j = 0; j < sides; j++) {
          const a = j * Math.PI * 2 / sides;
          const ripple = 1 + folds * (Math.cos(5 * a + row * .36) + .4 * Math.cos(3 * a - row * .47));
          const u = Math.sin(a) * width * ripple, v = Math.cos(a) * depth * ripple;
          vertices.push(cx + u * side.x + v * front.x, cy + u * side.y + v * front.y, cz + u * side.z + v * front.z);
          if (row) {
            const p = first + (row - 1) * sides + j, q = first + (row - 1) * sides + (j + 1) % sides;
            indices.push(p, q, p + sides, q, q + sides, p + sides);
          }
        }
      }
      for (let j = 1; j < sides - 1; j++) {
        const last = first + (sections.length - 1) * sides;
        indices.push(first, first + j + 1, first + j, last, last + j, last + j + 1);
      }
    }
    function finish() {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      kit.stamp(geo, tint, x, y, z, size, size, size, yaw);
      geo.dispose();
    }
    return { sweep, finish };
  }

  // Trace the photographed front in pixel coordinates. Each form has closed
  // elliptical sections; its rear and end caps retain the sculpture material.
  function photoCarving(T,kit,{photo,backPhoto,width,height,crop=[0,0,width,height],origin,scale,
    position=[0,0,0],tint,forms}) {
    const points=[],uv=[],front=[],back=[],sides=32;
    for(const {z=0,rows} of forms){
      const first=points.length/3;
      for(const [y,left,right,radius,offset=0] of rows){
        for(let j=0;j<sides;j++){
          const angle=j*2*Math.PI/sides,pixel=(left+right+(right-left)*Math.cos(angle))/2;
          points.push((pixel-origin[0])*scale,(origin[1]-y)*scale,z+offset+radius*Math.sin(angle));
          uv.push((pixel-crop[0])/crop[2],1-(y-crop[1])/crop[3]);
        }
      }
      for(let i=0;i<rows.length-1;i++){
        for(let j=0;j<sides;j++){
          const a=first+i*sides+j,b=first+i*sides+(j+1)%sides;
          (j<sides/2?front:back).push(a,b,a+sides,b,b+sides,a+sides);
        }
      }
      const last=first+(rows.length-1)*sides;
      for(let j=1;j<sides-1;j++)back.push(first,first+j+1,first+j,last,last+j,last+j+1);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(points,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(front.concat(back));
    geo.addGroup(0,front.length,0);geo.addGroup(front.length,back.length,1);geo.computeVertexNormals();
    const stone=new T.MeshStandardMaterial({color:tint,roughness:.94}),image=stone.clone();
    const mesh=new T.Mesh(geo,[image,stone]);
    mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;kit.group.add(mesh);
    function applyPhoto(material,url){
      let disposed=false;
      material.addEventListener('dispose',()=>{disposed=true;});
      new T.TextureLoader().load(url,texture=>{
        if(disposed){texture.dispose();return;}
        texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
        material.color.setHex(0xffffff);material.map=texture;material.needsUpdate=true;
      });
    }
    applyPhoto(image,photo);
    if(backPhoto)applyPhoto(stone,backPhoto);
    return mesh;
  }

  function statueFigure(T, kit, tint, x, y, z, size, pose = {}) {
    const { sweep, finish } = carving(T, kit, tint, x, y, z, size, pose.yaw);
    // Slight offset at the knees puts the weight on the rear foot. The
    // separately carved shoes and flared trouser hems leave space between legs.
    for (const s of [-1, 1]) {
      if (pose.seated) {
        // Fold the leg back across the opposite calf, under the robe.
        sweep([[s*.058,.49,0,.071,.075],[s*.154,.424,.066,.067,.075],[s*.196,.38,.10,.067,.070],
          [s*.130,.375,.15,.062,.065],[-s*.015,.390,.187,.049,.045],[-s*.115,.420,.162,.030,.055]],.065,20);
      } else if (!pose.robe) {
        const rise = s < 0 ? (pose.stepUp||0) : 0;
        const foot = s < 0 ? .04+rise*.54 : -.017, hip = s * .056, ankle = s * .070;
        sweep([[ankle,.012+rise,foot+.015,.04,.072],[ankle,.025+rise,foot+.017,.042,.071],[ankle,.047+rise,foot,.032,.043]]);
        sweep([[ankle,.038+rise,foot,.039,.037],[ankle,.056+rise,foot,.048,.045],[s*.066,.19+rise*.7,foot*.72,.046,.048],
          [s*.064,.255+rise*.66,foot+.008,.049,.052],[hip,.38,0,.062,.061],[hip,.50,0,.063,.064]],.085);
      }
    }
    if (pose.robe) {
      sweep([[0,.015,0,.153,.090],[0,.041,-.005,.154,.094],[.006,.17,-.010,.141,.09],
        [-.014,.36,-.005,.129,.082],[0,.51,0,.108,.073]],.13,32);
      for(const s of [-1,1]) sweep([[s*.084,.808,-.010,.044,.054],[s*.103,.713,-.035,.042,.052],
        [s*.121,.53,-.035,.032,.052],[s*.107,.34,-.020,.024,.043]],.10);
    }
    const hem = pose.longCoat ? .34 : .43;
    sweep([[0,hem,0,.115,.069],[0,hem+.014,0,.118,.071],[.004,.53,0,.095,.066],[0,.615,0,.087,.061],
      [0,.72,.002,.110,.070],[0,.796,-.007,.126,.064],[0,.819,-.008,.086,.044],[0,.836,0,.040,.041]],.048,24);
    if (pose.jacket) {
      sweep([[0,.45,.069,.003,.003],[.002,.61,.064,.004,.004],[0,.73,.071,.004,.005],[0,.795,.057,.004,.005]],0,8);
      for (const s of [-1,1]) {
        sweep([[s*.014,.790,.055,.004,.004],[s*.041,.805,.051,.009,.006],[s*.039,.822,.036,.005,.005]],0,10);
        for (const py of [.53,.72]) {
          sweep([[s*.043,py,.066,.003,.004],[s*.063,py-.003,.062,.006,.005],[s*.082,py,.055,.003,.004]],0,10);
        }
      }
    } else {
      // Raised folds follow the pull from the shoulder to the belted waist.
      for (const s of [-1,1]) {
        sweep([[s*.081,.782,.044,.003,.004],[s*.055,.711,.064,.006,.006],[s*.029,.651,.057,.004,.004]],0,10);
        sweep([[s*.062,hem+.018,.056,.003,.004],[s*.044,(hem+.60)/2,.064,.008,.008],[s*.022,.599,.060,.003,.003]],0,10);
      }
    }
    // One continuous oval from chin to crown keeps the face smooth in close views.
    sweep([[0,.809,0,.044,.044],[0,.837,0,.037,.040],[0,.861,.004,.035,.037]]);
    sweep([[0,.846,.004,.018,.024],[0,.857,.004,.033,.035],[0,.880,.004,.045,.044],
      [0,.908,.004,.053,.050],[0,.939,.004,.055,.052],[0,.962,.004,.053,.050],
      [0,.982,.004,.044,.042],[0,.995,.004,.028,.027],[0,1,.004,.008,.008]],0,32);
    if (pose.seated || pose.robe) {
      sweep([[0,.957,-.009,.053,.052],[0,.987,-.010,.054,.053],[0,1.006,-.012,.040,.039],
        [0,1.016,-.012,.025,.025],[0,1.040,-.012,.018,.020],[0,1.048,-.012,.007,.008]],.06,24);
    }
    if (pose.beard) sweep([[0,.807,.047,.006,.005],[0,.838,.039,.019,.011],[0,.861,.026,.032,.013],[0,.876,.016,.030,.014]],.10);
    if (pose.headcloth) sweep([[0,.940,-.006,.054,.051],[0,.960,-.007,.058,.055],[0,.988,-.006,.048,.048],[0,1.005,-.010,.016,.024]],.04);
    for (const s of [-1, 1]) {
      const arm = (s < 0 ? pose.rightArm : pose.leftArm) || [[s*.139,.65,.005],[s*.141,.50,.025]];
      const [elbow, wrist] = arm;
      sweep([[s*.102,.788,-.004,.042,.047],[s*.122,.754,0,.041,.043],[...elbow,.035,.038],
        [(elbow[0]+wrist[0])/2,(elbow[1]+wrist[1])/2,(elbow[2]+wrist[2])/2,.033,.035],
        [...wrist,.026,.029]],.045);
      const hand = arm[2] || [wrist[0],wrist[1]-.052,wrist[2]+.006];
      const middle = hand.map((v,i) => (v+wrist[i])*.5);
      sweep([[...wrist,.022,.020],[...middle,.030,.020],[...hand,.022,.014]],0,12);
      sweep([[middle[0]-s*.013,middle[1],middle[2]+.008,.014,.014],
        [hand[0]-s*.027,(hand[1]+middle[1])/2,hand[2]+.012,.009,.011],
        [hand[0]-s*.026,hand[1],hand[2]+.013,.006,.008]],0,8);
      if (s < 0 && pose.openHand) {
        for (let finger=0;finger<4;finger++) {
          const shift=(finger-1.5)*.011;
          sweep([[hand[0]+shift,hand[1]-.004,hand[2],.007,.009],
            [hand[0]+shift*1.25,hand[1]+.025,hand[2]+.005,.006,.007],
            [hand[0]+shift*1.38,hand[1]+.042-Math.abs(shift)*.55,hand[2]+.009,.005,.005]],0,8);
        }
      }
    }
    finish();
  }

  function lotusSeat(T,kit,x,y,z,r,h,pale,shadow) {
    for(let row=0;row<2;row++) {
      const radius=r*(row?.92:1), base=y+row*h*.42;
      for (let i=0;i<16;i++) {
        const a=(i+row*.5)*Math.PI/8;
        const petal=carving(T,kit,row?pale:shadow,x+Math.sin(a)*radius,base,z+Math.cos(a)*radius,1,a);
        petal.sweep([[0,0,-r*.15,r*.102,r*.045],[0,h*.24,-r*.10,r*.170,r*.065],
          [0,h*.58,0,r*.192,r*.076],[0,h*.84,r*.035,r*.116,r*.046],[0,h,r*.063,r*.016,r*.017]],0,16);
        petal.finish();
      }
    }
  }

  function courtAttendant(T,kit,stone,x,y,z,height,yaw,role) {
    const {sweep,finish}=carving(T,kit,stone,x,y,z,height,yaw);
    const guard=role==='guard', civil=role==='civil';
    for(const s of [-1,1]){
      sweep([[s*.067,.001,.025,.041,.072],[s*.067,.028,.025,.044,.072],
        [s*.067,.060,0,.037,.044],[s*.063,.31,0,.041,.049]],.025,12);
    }
    const hem=guard?.23:.081;
    sweep([[0,hem,0,.143,.091],[0,hem+.021,0,.145,.091],[0,.35,0,.124,.078],
      [0,.53,-.003,.102,.073],[0,.68,-.006,.119,.082],[0,.756,-.009,.137,.071],
      [0,.789,-.008,.079,.048],[0,.8,0,.038,.038]],.039,20);
    // The sleeves close around the hands in front of the robe.
    for(const s of [-1,1]){
      sweep([[s*.108,.753,-.005,.050,.054],[s*.133,.705,.008,.052,.060],
        [s*.140,.595,.031,.048,.055],[s*.128,.528,.046,.045,.051],
        [s*.080,.548,.085,.045,.052],[s*.035,.590,.100,.034,.039]],.043,14);
      sweep([[s*.043,.580,.100,.025,.026],[s*.022,.603,.110,.025,.024],
        [s*.004,.612,.108,.015,.019]],0,12);
    }
    sweep([[0,.772,0,.037,.042],[0,.806,.012,.042,.047],[0,.828,.018,.052,.053],
      [0,.860,.016,.058,.058],[0,.891,.007,.057,.057],[0,.908,.003,.047,.048]],0,20);
    if(guard){
      // The outer guard rank at Ứng Lăng wears broad, ribbed conical hats.
      sweep([[0,.888,0,.109,.107],[0,.902,0,.112,.110],[0,.980,0,.024,.024],
        [0,.990,0,.011,.011]],.014,24);
    }else if(civil){
      // Tall, flat-topped court headdress; the square-ended tablet rises above the sleeves.
      sweep([[0,.886,0,.064,.062],[0,.899,-.002,.069,.065],[0,.914,-.008,.060,.059],
        [0,.976,-.013,.057,.047],[0,.988,-.014,.050,.043]],0,16);
      sweep([[0,.570,.109,.013,.010],[0,.610,.111,.017,.011],
        [0,.725,.124,.020,.009],[0,.732,.125,.018,.009]],0,8);
    }else{
      sweep([[0,.885,-.004,.066,.064],[0,.902,-.004,.077,.069],[0,.932,-.007,.068,.063],
        [0,.962,-.008,.045,.046],[0,.974,-.008,.018,.023]],0,20);
    }
    finish();
  }

  function memorialMonument(T, kit, opts = {}) {
    const { box, stamp, tapered, round, wavingFlag } = kit;
    const plazaW = opts.plazaW || 24;
    const plazaD = opts.plazaD || 18;
    const h = opts.h || 16;
    const stone = opts.stone || 0xbcb6aa;
    const darkStone = opts.darkStone || 0x76726b;
    const bronze = opts.bronze || 0x5c4a35;
    const accent = opts.accent || 0xa93829;
    const style = opts.style || 'obelisk'; // 'obelisk' | 'statue' | 'flame' | 'arch'
    kit.palette({stone:[stone,darkStone],metal:bronze});

    // Broad stepped granite plaza
    box(darkStone, 0, 0.28, 0, plazaW, 0.56, plazaD);
    box(stone, 0, 0.72, -0.5, plazaW * 0.78, 0.42, plazaD * 0.74);
    steps(kit, 0, plazaD * 0.38, plazaW * 0.45, 1.5, 4, 0.18, 0.42, stone);

    // Sculpted pedestal & red granite inscription slab
    box(darkStone, 0, 2.2, -1.2, 7.6, 2.7, 5.2);
    box(stone, 0, 3.65, -1.2, 8.2, 0.35, 5.8);
    if (opts.title) {
      plaque(T, kit, opts.title, 0, 2.35, 1.48, 6.4, 0.92, { bg: '#7f241c', fg: '#f4d370' });
    }

    // Flanking stone relief wing walls (bức phù điêu)
    if (opts.wings !== false) {
      for (const s of [-1, 1]) {
        box(stone, s * 7.8, 2.45, -2.6, 7.4, 3.2, 0.95, -s * 0.22);
        box(bronze, s * 7.8, 2.45, -2.06, 6.5, 2.15, 0.14, -s * 0.22);
      }
    }

    if (style === 'statue') {
      opts.sculpt(T, kit, 3.825);
    } else if (style === 'flame') {
      // Stylized rising torch / flame / lotus petals (Truông Bồn, Xô Viết Nghệ Tĩnh)
      const sy = 3.85;
      tapered(accent, 0, sy + h * 0.42, -1.2, 2.3, 0.35, h * 0.84, 0.72, 6);
      for (const s of [-1, 1]) {
        tapered(stone, s * 1.9, sy + h * 0.30, -1.2, 1.35, 0.28, h * 0.60, 0.8, 4);
      }
      const star = new T.OctahedronGeometry(1.05, 0);
      stamp(star, 0xe5b842, 0, sy + h * 0.88, -1.2);
      star.dispose();
    } else {
      // Monumental obelisk / twin-blade victory pylon
      const sy = 3.85;
      tapered(stone, 0, sy + h * 0.45, -1.2, 2.2, 0.65, h * 0.90, 0.82, 4);
      box(accent, 0, sy + h * 0.55, -0.15, 0.85, h * 0.48, 0.22);
      const star = new T.OctahedronGeometry(0.85, 0);
      stamp(star, 0xe8bc45, 0, sy + h * 0.94, -1.2);
      star.dispose();
    }

    // Ceremonial twin flagpoles
    if (opts.flags !== false && wavingFlag) {
      for (const s of [-1, 1]) {
        stamp(round, 0xd8d6ce, s * (plazaW * 0.36), 6.0, plazaD * 0.22, 0.11, 11.4, 0.11);
      }
      wavingFlag(3.2, 2.1, -plazaW * 0.36 + 0.1, 11.5, plazaD * 0.22);
    }
  }

  // Drive-through Steel Truss Bridge (local +X along bridge, piers down to y = -8, ZERO road z-fighting!)
  function steelTrussBridge(T, kit, opts = {}) {
    const { box, stamp, round } = kit;
    const len = opts.len || 180;
    const w = opts.w || 11.5; // total width between outer trusses (clear carriageway inside)
    const halfW = w * 0.5;
    const spans = opts.spans || 3;
    const spanLen = len / spans;
    const archH = opts.archH || 10.5;
    const steel = opts.steel || 0x5c727a;
    const steelDark = opts.steelDark || 0x42545c;
    const pierColor = opts.pierColor || 0x9b9588;
    const arched = opts.arched !== false;

    kit.palette({metal:[steel,steelDark],plaster:pierColor}, true);
    // Deck edge girders & railings strictly outside carriageway (`|z| >= halfW`)
    for (const s of [-1, 1]) {
      box(steelDark, 0, -0.45, s * (halfW + 0.35), len + 2, 0.95, 0.72);
      box(0xb5b0a2, 0, 0.18, s * (halfW + 0.32), len, 0.36, 0.48);
      // Handrail
      box(steel, 0, 1.15, s * (halfW + 0.55), len, 0.10, 0.10);
      for (let x = -len / 2; x <= len / 2; x += 4.5) {
        box(steelDark, x, 0.68, s * (halfW + 0.55), 0.10, 0.95, 0.10);
      }
    }

    // Concrete masonry river piers cleanly below asphalt (`y <= -1.0`)
    for (let i = 0; i <= spans; i++) {
      const px = -len / 2 + i * spanLen;
      box(pierColor, px, -5.2, 0, 3.2, 8.2, w + 3.4);
      box(0x868074, px, -1.25, 0, 3.8, 0.55, w + 4.0);
      // Cutwater noses facing upstream/downstream
      for (const s of [-1, 1]) {
        stamp(round, pierColor, px, -5.4, s * (halfW + 1.7), 1.5, 7.8, 1.5);
      }
    }

    // Truss / arch chords along each span
    const segs = 8;
    for (let sp = 0; sp < spans; sp++) {
      const x0 = -len / 2 + sp * spanLen;
      const dx = spanLen / segs;
      for (let j = 0; j < segs; j++) {
        const xa = x0 + j * dx, xb = xa + dx;
        const ta = j / segs, tb = (j + 1) / segs;
        const ya = arched ? (1.2 + archH * Math.sin(Math.PI * ta)) : (j === 0 ? 1.2 : archH);
        const yb = arched ? (1.2 + archH * Math.sin(Math.PI * tb)) : (j === segs - 1 ? 1.2 : archH);
        for (const s of [-1, 1]) {
          const z = s * (halfW + 0.35);
          // Upper chord
          strut(T, kit, steel, xa, ya, z, xb, yb, z, 0.24);
          // Vertical hangers/posts
          if (j > 0) strut(T, kit, steelDark, xa, 0.2, z, xa, ya, z, 0.14);
          // Diagonal web bracing
          strut(T, kit, steel, xa, 0.2, z, xb, yb, z, 0.13);
        }
        // Overhead wind-bracing portals safely above trucks (`y >= 6.8`)
        if (ya >= 6.8 && j > 0) {
          strut(T, kit, steelDark, xa, ya, -halfW - 0.35, xa, ya, halfW + 0.35, 0.18);
          if (yb >= 6.8) {
            strut(T, kit, steel, xa, ya, -halfW - 0.35, xb, yb, halfW + 0.35, 0.11);
          }
        }
      }
    }
  }

  // Drive-through Cable-Stayed Bridge (Cầu Sông Hàn, Cầu Trần Thị Lý, Cầu Cửa Hội)
  function cableStayedBridge(T, kit, opts = {}) {
    const { box, stamp, round } = kit;
    const len = opts.len || 240;
    const w = opts.w || 16.5;
    const halfW = w * 0.5;
    const pylonH = opts.pylonH || 42;
    const pylonXs = opts.pylonXs || [0];
    const pylonColor = opts.pylonColor || 0xe3dfd4;
    const cableColor = opts.cableColor || 0xcfd6d8;
    const accent = opts.accent || 0x2f7088;
    const tilt = opts.tilt || 0; // non-zero for Cầu Trần Thị Lý's iconic leaning mast!
    const centralMast = Boolean(opts.centralMast); // single median pylon (e.g. Cầu Sông Hàn / Trần Thị Lý)

    kit.palette({metal:cableColor,plaster:pylonColor}, true);
    // Deck edge fascia & pedestrian railings outside driving lanes
    for (const s of [-1, 1]) {
      box(0x888b8c, 0, -0.55, s * (halfW + 0.45), len + 2, 1.05, 0.90);
      box(accent, 0, -0.35, s * (halfW + 0.92), len, 0.42, 0.12);
      box(0xd6d9db, 0, 1.05, s * (halfW + 0.65), len, 0.10, 0.10);
      for (let x = -len / 2; x <= len / 2; x += 6) {
        box(0x7c8488, x, 0.55, s * (halfW + 0.65), 0.10, 1.0, 0.10);
      }
    }
    // River piers under deck (`y <= -1.0`)
    const pierStep = Math.max(45, len / 4);
    for (let x = -len / 2; x <= len / 2 + 1; x += pierStep) {
      box(0x9a968c, x, -5.5, 0, 3.6, 8.8, w + 2.6);
      box(0x827e74, x, -1.25, 0, 4.2, 0.55, w + 3.2);
    }

    // Pylon tower(s) + fan stay cables
    for (const px of pylonXs) {
      const topX = px + Math.sin(tilt) * pylonH;
      const topY = Math.cos(tilt) * pylonH;
      // Foundation pier below pylon
      box(0x8d897f, px, -5.2, 0, 6.2, 8.4, w + 4.2);

      if (centralMast) {
        // Central A-frame / leaning mast rising from narrow median (clear traffic on both sides!)
        strut(T, kit, pylonColor, px, -1.0, -0.85, topX, topY, 0, 1.15);
        strut(T, kit, pylonColor, px, -1.0, 0.85, topX, topY, 0, 1.15);
        stamp(round, accent, topX, topY + 1.2, 0, 0.65, 2.4, 0.65);
      } else {
        // Twin-leg portal / A-frame pylon straddling the roadway cleanly (`|z| >= halfW + 0.8`)
        for (const s of [-1, 1]) {
          const zBase = s * (halfW + 1.15);
          const zTop = opts.aFrame ? s * 1.4 : zBase;
          strut(T, kit, pylonColor, px, -5.0, zBase, topX, topY, zTop, 1.18);
        }
        // Overhead crossbeams safely above traffic
        box(pylonColor, px, Math.max(9.5, pylonH * 0.30), 0, 1.8, 1.6, (opts.aFrame ? w * 0.72 : w + 2.4));
        box(pylonColor, px, pylonH * 0.72, 0, 1.6, 1.5, (opts.aFrame ? w * 0.36 : w + 2.2));
        if (opts.aFrame) box(accent, topX, topY + 0.8, 0, 2.2, 2.2, 3.4);
      }

      // Fan stay cables anchoring along the deck edges (or median)
      const pairs = opts.cables || 8;
      const reach = opts.cableReach || Math.min(len * 0.44, pylonH * 2.15);
      for (const dir of [-1, 1]) {
        for (let i = 1; i <= pairs; i++) {
          const f = i / pairs;
          const ax = px + dir * (10 + f * (reach - 10));
          if (Math.abs(ax) > len * 0.49) continue;
          const cy = pylonH * (0.48 + f * 0.46);
          const cx = px + Math.sin(tilt) * cy;
          const cyReal = Math.cos(tilt) * cy;
          if (centralMast) {
            strut(T, kit, cableColor, cx, cyReal, 0, ax, 0.2, 0, 0.085);
            if (opts.fanEdges) {
              for (const s of [-1, 1]) strut(T, kit, cableColor, cx, cyReal, 0, ax, 0.2, s * (halfW + 0.4), 0.075);
            }
          } else {
            for (const s of [-1, 1]) {
              const zDeck = s * (halfW + 0.55);
              const zAnchor = opts.aFrame ? s * (1.4 + (1 - (cy / pylonH)) * (halfW - 0.25)) : zDeck;
              strut(T, kit, cableColor, cx, cyReal, zAnchor, ax, 0.2, zDeck, 0.085);
            }
          }
        }
      }
    }
  }

  // Drive-through Suspension Bridge (Cầu Thuận Phước, Cầu treo Kon Klor)
  function suspensionBridge(T, kit, opts = {}) {
    const { box } = kit;
    const len = opts.len || 260;
    const w = opts.w || 14;
    const halfW = w * 0.5;
    const towerX = opts.towerX || len * 0.26;
    const towerH = opts.towerH || 42;
    const towerColor = opts.towerColor || 0xd6d3c8;
    const cableColor = opts.cableColor || 0xb5442e;
    const deckColor = opts.deckColor || 0x7b8285;

    // Deck edge beams & railings
    kit.palette({metal:[cableColor,deckColor]}, true);
    for (const s of [-1, 1]) {
      box(deckColor, 0, -0.52, s * (halfW + 0.35), len + 2, 0.98, 0.75);
      box(towerColor, 0, 1.08, s * (halfW + 0.52), len, 0.10, 0.10);
      for (let x = -len / 2; x <= len / 2; x += 5) {
        box(deckColor, x, 0.58, s * (halfW + 0.52), 0.10, 0.98, 0.10);
      }
    }

    // Twin tall suspension portal towers
    for (const tx of [-towerX, towerX]) {
      box(0x8e8a80, tx, -5.2, 0, 4.8, 8.4, w + 3.8);
      for (const s of [-1, 1]) {
        box(towerColor, tx, towerH * 0.5 - 1.0, s * (halfW + 0.95), 1.9, towerH + 2.0, 1.9);
      }
      for (const frac of [0.34, 0.66, 0.96]) {
        const y = Math.max(7.2, towerH * frac);
        box(towerColor, tx, y, 0, 1.45, 1.45, w + 2.2);
      }
    }

    // Parabolic main suspension cables + vertical suspenders across center & side spans
    const segs = 16;
    for (const s of [-1, 1]) {
      const z = s * (halfW + 0.82);
      // Main center span catenary
      for (let i = 0; i < segs; i++) {
        const u0 = -1 + (2 * i) / segs, u1 = -1 + (2 * (i + 1)) / segs;
        const x0 = u0 * towerX, x1 = u1 * towerX;
        const y0 = 3.2 + (towerH - 3.6) * u0 * u0;
        const y1 = 3.2 + (towerH - 3.6) * u1 * u1;
        strut(T, kit, cableColor, x0, y0, z, x1, y1, z, 0.24);
        if (i > 0) strut(T, kit, 0xc8cecf, x0, 0.2, z, x0, y0, z, 0.065);
      }
      // Side anchor backstays
      for (const end of [-1, 1]) {
        const tx = end * towerX, ax = end * (len * 0.49);
        const sideSegs = 6;
        for (let i = 0; i < sideSegs; i++) {
          const f0 = i / sideSegs, f1 = (i + 1) / sideSegs;
          const x0 = tx + (ax - tx) * f0, x1 = tx + (ax - tx) * f1;
          const y0 = towerH * (1 - f0) * (1 - f0) + 1.4;
          const y1 = towerH * (1 - f1) * (1 - f1) + 1.4;
          strut(T, kit, cableColor, x0, y0, z, x1, y1, z, 0.22);
          if (i > 0) strut(T, kit, 0xc8cecf, x0, 0.2, z, x0, y0, z, 0.06);
        }
      }
    }
  }

  // Geometry is owned by the landmark so streaming can release it. The leaf
  // atlas is already shared with the roadside trees and survives site eviction.
  function trees(T, { group }, list) {
    const models = createTreeModels(T);
    const crownScale = { pine: 0.80, palm: 0.68, banyan: 1.03 };
    for (const { x, y = 0, z, h = 7, width, kind = 'banyan' } of list) {
      const variant = models.variantAt(x, z);
      const species = kind === 'banyan' ? 'tree' : kind;
      const geometry = models.geometry(species, true, variant);
      const mesh = new T.Mesh(geometry, kind === 'palm' ? models.palmMaterial : models.material);
      const spread = width ?? h * crownScale[kind];
      mesh.position.set(x, y, z);
      mesh.scale.set(spread, h, spread);
      mesh.rotation.y = x * 0.81 + z * 0.57;
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
  }

  window.CentralArch = {
    plaque,
    archPiers,
    vaultedBay,
    curvedRoof,
    gabledRoof,
    strut,
    steps,
    tamQuan,
    vietnameseHall,
    chamTower,
    octagonalTower,
    lighthouse,
    gothicChurch,
    colonialBuilding,
    memorialMonument, carving, photoCarving, statueFigure, lotusSeat,
    courtAttendant,
    steelTrussBridge,
    cableStayedBridge,
    suspensionBridge,
    trees
  };
})();
