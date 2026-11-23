'use strict';

// Small, animated profiles in world space. Foreground trees, ridges and buildings
// can hide a sighting just as they hide other scenery.
function paintSkyProfile(g, kind, phase) {
  g.clearRect(0, 0, 256, 128);
  g.lineCap = g.lineJoin = 'round';
  function shape(color, path) {
    g.fillStyle = color;
    g.fill(new Path2D(path));
  }
  function stroke(color, width, path) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.stroke(new Path2D(path));
  }
  function oval(color, x, y, rx, ry) {
    g.fillStyle = color;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
  }
  if (kind === 'saucer') {
    const metal = g.createLinearGradient(0, 38, 0, 83);
    metal.addColorStop(0, '#ecf4ed'); metal.addColorStop(.48, '#889b9e');
    metal.addColorStop(.64, '#d2ddd4'); metal.addColorStop(.68, '#4b5d67'); metal.addColorStop(1, '#283b4e');
    shape('#456776', 'M92 57 Q100 27 129 28 Q155 28 165 57Z');
    shape('#b2dadc', 'M100 49 Q111 29 131 32 Q113 33 107 49Z');
    shape(metal, 'M19 62 Q42 54 96 47 Q129 51 162 47 Q210 54 237 62 Q213 79 162 82 Q125 95 87 81 Q43 77 19 62Z');
    stroke('#e2eee2', 2, 'M24 63 Q126 75 230 63');
    for (let i = 0; i < 7; i++) {
      const a = phase + i * Math.PI * 2 / 7;
      if (Math.sin(a) > 0) oval('#a9ebda', 128 + 87 * Math.cos(a), 67 + 8 * Math.sin(a), 3, 1.8);
    }
  } else if (kind === 'dragon') {
    const back = x => 62 + 18 * Math.sin(x / 25 - phase);
    const neck = back(191);
    // Taper the coils towards the tail. Spines and claws follow the same spine.
    for (let x = 12; x < 192; x += 2) {
      const y = back(x), next = back(x + 3), r = 1 + 6 * Math.min(1, (x - 12) / 78);
      if (x % 8 === 4) shape('#c18c42', `M${x-4} ${y-r+2} l0 -9 l7 7Z`);
      stroke('#355955', r * 2, `M${x} ${y} L${x+3} ${next}`);
      stroke('#b69c61', r * .55, `M${x} ${y+r*.58} L${x+3} ${next+r*.58}`);
    }
    for (const x of [86, 158]) {
      const y = back(x);
      stroke('#496754', 4, `M${x} ${y} q-6 10 1 15 l-7 6 m7 -6 l-1 8 m1 -8 l4 5`);
    }
    g.save(); g.translate(190, neck);
    shape('#b07a32', 'M1 3 Q-10 6 -19 13 L-12 3 -25 2 -11 -4 -22 -11 -6 -8 -14 -20 3 -9Z');
    stroke('#e3bd73', 3, 'M4 -9 Q-5 -17 -7 -28 M-4 -19 l-8 -2 M9 -8 Q5 -19 9 -26');
    shape('#426956', 'M-5 6 Q-6 -13 7 -15 L15 -11 18 -5 34 -7 39 -3 34 3 16 5 28 8 20 12 8 9 0 12Z');
    oval('#ffcb59', 11, -7, 2.5, 1.8);
    stroke('#d7b575', 1.7, 'M29 1 Q52 5 52 -12 Q50 -18 46 -14 M29 4 Q48 14 55 5');
    g.restore();
  } else if (kind === 'phoenix') {
    const flap = Math.sin(phase), tip = 37 * flap;
    for (let i = 0; i < 5; i++) {
      const y = 68 + (i - 2) * 5, wave = 7 * Math.sin(phase + i * .65);
      shape(i % 2 ? '#d9933c' : '#a74d32', `M136 65 Q91 ${54+i*6} 73 ${y+wave} T${11+i*6} ${y+wave+(i-2)*7} Q37 ${y+wave+14} 78 ${y+6} T136 70Z`);
    }
    const wing = 'M0 0 Q-9 -17 -39 -28 L-78 -43 Q-70 -30 -52 -22 L-73 -31 Q-61 -17 -46 -14 L-62 -18 Q-50 -6 -31 -4 L-43 -5 Q-27 5 -6 8Z';
    g.save(); g.translate(146, 61); g.transform(.77, .1, .32, .65 - .32*flap, 0, 0); shape('#9d5235', wing); g.restore();
    shape('#c97933', 'M104 72 Q125 65 139 56 Q156 51 176 55 Q188 57 197 45 Q199 36 209 36 Q219 36 221 43 L233 46 219 48 Q215 59 205 61 Q190 65 178 72 Q150 87 126 75Z');
    shape('#e1a945', 'M202 40 Q203 26 191 19 Q208 21 212 35 Q213 23 207 17 Q220 24 216 38Z');
    g.save(); g.translate(151, 63); g.transform(1, 0, -.18, .42 + tip / 30, 0, 0);
    shape('#b95e32', wing); stroke('#e0a143', 3, 'M-4 0 Q-26 -17 -61 -32');
    g.restore();
  } else if (kind === 'flyer') {
    shape('#973d38', 'M168 60 Q133 43 110 55 T53 50 Q107 70 135 65 L85 73 Q125 78 158 68Z');
    stroke('#263743', 10, 'M133 67 L101 70 66 67 M132 64 L100 60 75 59');
    shape('#405966', 'M122 60 Q143 52 165 56 L181 62 167 70 131 72Z');
    stroke('#425661', 7, 'M164 61 L188 63 209 56 M158 66 L140 76 127 74');
    oval('#ad8061', 181, 54, 8, 8); oval('#32373a', 180, 51, 8, 5);
    stroke('#b98f72', 5, 'M207 56 l7 -1');
  } else {
    const scarf = Math.sin(phase) * 5;
    shape('#77a7a6', 'M27 98 Q78 93 111 91 L97 98 34 102Z');
    shape('#bfdfd7', 'M60 94 L189 87 229 80 209 91 64 101Z');
    stroke('#99743b', 4, 'M42 99 L67 96 M65 89 l3 13');
    stroke('#30383d', 6, 'M141 64 L134 78 123 90 117 92 M146 63 L154 78 159 88 165 88');
    shape('#455962', 'M136 38 Q143 34 151 40 L155 54 148 59 158 73 Q139 74 115 81 Q126 69 131 56Z');
    stroke('#627579', 6, 'M147 43 L158 52 172 47 M136 44 L123 55 113 52');
    oval('#b68b69', 144, 31, 6, 8); oval('#312f33', 143, 27, 7, 5); oval('#312f33', 140, 21, 4, 4);
    shape('#a15440', `M139 37 Q120 ${35+scarf} 111 42 T83 ${40+scarf} Q101 52 118 44 L140 40Z`);
  }
}

function createSkySightings(T, scene, random = Math.random, ground = () => 0) {
  const kinds = ['saucer', 'dragon', 'phoenix', 'flyer', 'sword'];
  let timer, flight, lastKind, sprite, context, frame = -1;
  let wish, dragonMap;
  function interval() { return 25 + random() * 15; }
  function reset() {
    timer = interval(); flight = null; lastKind = null;
    if (sprite) sprite.visible = false;
    wish?.hide();
  }
  function launch(car, aspect) {
    const choices = kinds.filter(kind => kind !== lastKind);
    const kind = choices[Math.floor(random() * choices.length)];
    const human = kind === 'sword' || kind === 'flyer';
    const range = human ? 120 : 360;
    const sign = random() < .5 ? -1 : 1;
    flight = {kind, age:0, duration:6 + random()*3, x:car.x, z:car.z, yaw:car.yaw,
      altitude:car.y + range * (.22 + random() * .09), range, sign,
      span:range * Math.min(.68, aspect * .46), drift:Math.max(0,car.speed)*.8,
      width:human ? (kind === 'sword' ? 11 : 9) : kind === 'dragon' ? 53 : 39};
    lastKind = kind; frame = -1;
    if (!sprite) {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
      context = canvas.getContext('2d');
      const map = new T.CanvasTexture(canvas);
      map.colorSpace = T.SRGBColorSpace; map.generateMipmaps = false; map.minFilter = T.LinearFilter;
      sprite = new T.Sprite(new T.SpriteMaterial({map, transparent:true, depthWrite:false}));
      sprite.name = 'Thoáng thấy trên trời'; scene.add(sprite);
    }
    sprite.scale.set(flight.width, flight.width / 2, 1);
    sprite.material.map.repeat.x = sign; sprite.material.map.offset.x = sign < 0 ? 1 : 0;
  }
  function summon(car, aspect) {
    const range = 520 + Math.max(0,car.speed)*10;
    const bearing = car.yaw + (.025 + random()*.09)*Math.min(1,aspect);
    const x = car.x+range*Math.sin(bearing), z = car.z-range*Math.cos(bearing);
    const ridge = Math.max(car.y,ground(x,z),ground((car.x+x)/2,(car.z+z)/2));
    flight = {kind:'shen-long', age:0, waiting:0, x,z, range, yaw:bearing, altitude:ridge+range*.305};
    dragonMap ??= new T.TextureLoader().load('sky-shen-long.webp', undefined, undefined, () => {
      dragonMap.dispose(); dragonMap=null;
    });
    dragonMap.colorSpace=T.SRGBColorSpace;
  }
  function update(dt, car, originX, originZ, aspect, sheltered) {
    if (!car.driving || sheltered) {
      if (sprite) sprite.visible = false;
      wish?.hide();
      return 0;
    }
    if (!flight) {
      if (Math.abs(car.speed) < 1 || (timer -= dt) > 0) return 0;
      timer = interval();
      const roll = random();
      if (roll < .04) summon(car, aspect);
      else if (roll < .26) launch(car, aspect);
      else return 0;
    }
    const f = flight;
    if (f.kind === 'shen-long') {
      if (!dragonMap?.image) {
        if (!dragonMap || (f.waiting+=dt)>8) flight=null;
        return 0;
      }
      wish ??= createShenLong(T, scene, dragonMap);
      f.age += dt;
      if (f.age >= 16) { wish.hide(); flight=null; timer+=90; return 0; }
      return wish.render(f, originX, originZ);
    }
    f.age += dt;
    const progress = f.age / f.duration;
    if (progress >= 1) { sprite.visible = false; flight = null; timer += 65; return 0; }
    const ahead = f.range + f.drift * f.age;
    const across = (2 * progress - 1) * f.span * f.sign;
    const sin = Math.sin(f.yaw), cos = Math.cos(f.yaw);
    const lift = f.kind === 'saucer' ? 2 * progress ** 4 : Math.sin(progress * Math.PI);
    sprite.position.set(f.x-originX + ahead*sin + across*cos, f.altitude + .06*f.range*lift,
      f.z-originZ - ahead*cos + across*sin);
    sprite.visible = true;
    sprite.material.opacity = .88 * Math.min(1, f.age / .8, (f.duration-f.age) / 1.1);
    const nextFrame = Math.floor(f.age * 12);
    if (nextFrame !== frame) {
      frame = nextFrame;
      paintSkyProfile(context, f.kind, nextFrame * .24);
      sprite.material.map.needsUpdate = true;
    }
    return 0;
  }
  reset();
  return {update, reset};
}
