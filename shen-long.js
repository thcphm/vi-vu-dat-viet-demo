'use strict';

// All parts share one world-space anchor. The driver can pass the apparition,
// look away, or lose sight of it behind a ridge.
function createShenLong(T, scene, dragonMap) {
  const root = new T.Group();
  root.name = 'Shen Long ban điều ước';
  root.visible = false;
  scene.add(root);
  const quad = new T.PlaneGeometry(1, 1);
  function plane(map, additive = false) {
    const material = new T.MeshBasicMaterial({map, transparent:true, depthWrite:false,
      toneMapped:false, fog:false, side:T.DoubleSide, blending:additive ? T.AdditiveBlending : T.NormalBlending});
    const mesh = new T.Mesh(quad, material);
    root.add(mesh);
    return mesh;
  }
  function texture(size, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d'), size);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    return map;
  }
  const glow = texture(64, (g, size) => {
    const r = size / 2, halo = g.createRadialGradient(r,r,0,r,r,r);
    halo.addColorStop(0, '#fff7cc'); halo.addColorStop(.14, '#ffdb83ef');
    halo.addColorStop(.5, '#efa73c62'); halo.addColorStop(1, '#e88d2700');
    g.fillStyle = halo; g.fillRect(0,0,size,size);
  });
  const recipient = plane(texture(128, g => {
    const shape = (colour, path) => { g.fillStyle = colour; g.fill(new Path2D(path)); };
    // The summoner raises both hands above a ring of seven amber spheres.
    shape('#765328', 'M14 103 Q30 92 45 96 Q47 89 65 92 Q78 86 88 94 Q105 92 116 102 Q92 115 53 110 Q30 111 14 103Z');
    shape('#f8c765', 'M16 102 Q35 91 52 98 Q68 86 90 95 L110 100 Q88 97 76 102 Q52 99 33 104Z');
    shape('#212629', 'M52 63 L72 63 L76 94 L84 98 L70 99 L63 78 L58 96 L46 97 L49 92Z');
    shape('#bc5c29', 'M51 43 L60 38 L69 40 L77 47 L73 68 Q61 73 49 66Z');
    shape('#e8ad54', 'M49 49 L35 40 L29 24 L34 21 L42 35 L57 42Z M68 42 L81 32 L89 16 L94 18 L87 38 L74 52Z');
    shape('#ffdaa0', 'M29 25 L25 17 L27 12 L34 20 L34 25Z M88 19 L90 10 L94 7 L95 16 L94 21Z');
    shape('#f3bd7b', 'M54 32 Q47 19 61 16 Q73 15 70 27 L73 28 L68 34 L64 39 L56 38Z');
    shape('#20282a', 'M51 31 Q44 25 49 18 L45 17 L53 14 L50 10 L59 13 Q68 7 73 18 L69 21 L62 19 L57 23 L57 30Z');
    for (let i=0; i<7; i++) {
      const a=i*Math.PI*2/7;
      const x=65+47*Math.cos(a), y=101+8*Math.sin(a);
      g.beginPath(); g.arc(x,y,3.4,0,2*Math.PI); g.fillStyle='#ffba46'; g.fill();
      g.beginPath(); g.arc(x-.8,y-1,1.3,0,2*Math.PI); g.fillStyle='#fff4ab'; g.fill();
    }
  }));
  recipient.scale.set(20,20,1); recipient.position.set(66,-20,.4); recipient.renderOrder=3;
  const dragon = plane(dragonMap);
  dragon.scale.set(106,106*608/553,1); dragon.renderOrder=1;
  const aura = plane(glow,true);
  aura.material.color.setHex(0xd7b96e); aura.scale.set(143,148,1); aura.position.z=-1;
  const ray = plane(glow,true), spark = plane(glow,true), blessing = plane(glow,true);
  ray.renderOrder=2; spark.renderOrder=4; blessing.renderOrder=2;
  // The mouth is at (0.764, 0.416) measured from the top left of the dragon texture.
  const mouthX=(.764-.5)*dragon.scale.x, mouthY=(.5-.416)*dragon.scale.y;
  const handX=70, handY=-12;
  const smooth = T.MathUtils.smoothstep;
  return {
    hide() { root.visible=false; },
    render(f, originX, originZ) {
      const t=f.age;
      root.visible=t>1 && t<15;
      root.position.set(f.x-originX,f.altitude,f.z-originZ);
      root.rotation.y=-f.yaw; root.scale.setScalar(f.range/520);
      const reveal=smooth(t,1,3.4)*(1-smooth(t,12.6,15));
      const wish=smooth(t,3.5,5.6)*(1-smooth(t,11.8,13.7));
      dragon.position.y=1.8*Math.sin(t*.7);
      dragon.rotation.z=.018*Math.sin(t*.46);
      dragon.material.opacity=reveal; aura.material.opacity=reveal*.21;
      const c=Math.cos(dragon.rotation.z), s=Math.sin(dragon.rotation.z);
      const x=mouthX*c-mouthY*s, y=mouthX*s+mouthY*c+dragon.position.y;
      const dx=handX-x, dy=handY-y;
      ray.position.set((x+handX)/2,(y+handY)/2,.25);
      ray.rotation.z=Math.atan2(-dx,dy); ray.scale.set(5,Math.hypot(dx,dy)*1.12,1);
      ray.material.opacity=wish*.86;
      const travel=((Math.max(0,t-4))%2.2)/2.2;
      spark.position.set(x+dx*travel,y+dy*travel,.5);
      spark.scale.setScalar(7); spark.material.opacity=wish*Math.sin(Math.PI*travel);
      blessing.position.set(handX,handY,.2); blessing.scale.setScalar(15+6*Math.sin(t*1.5));
      blessing.material.opacity=wish*.92;
      recipient.material.opacity=reveal;
      return smooth(t,0,1.8)*(1-smooth(t,13.3,16));
    }
  };
}
