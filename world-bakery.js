'use strict';

// A street vendor in Hà Nội's old quarter. The stool stays at the same stall
// after breakfast and the cart returns the next morning (Vietnam time).
function createBreakfastStall(T, scene) {
  let stand, cart, site, previousGraph, nextClock = 0, greeted = false;
  function build() {
    stand = new T.Group(); stand.name = 'Góc bánh mì'; scene.add(stand);
    cart = new T.Group(); stand.add(cart);
    const box = new T.BoxGeometry(), tube = new T.CylinderGeometry(1, 1, 1, 12);
    const rim = new T.TorusGeometry(.29, .034, 6, 18), loaf = new T.SphereGeometry(1, 8, 6);
    const paint = color => new T.MeshLambertMaterial({color});
    const red = paint(0xa7422c), cream = paint(0xf3de9e), steel = paint(0x91a3a1),
      rubber = paint(0x343937), bread = paint(0xda983e), blue = paint(0x276986);
    function part(parent, geo, mat, x, y, z, sx=1, sy=1, sz=1) {
      const item = new T.Mesh(geo, mat);
      item.position.set(x,y,z); item.scale.set(sx,sy,sz); parent.add(item); return item;
    }
    part(stand,box,blue,1.08,.34,0,.36,.085,.36);
    for (const dx of [-.13,.13]) for (const dz of [-.13,.13])
      part(stand,box,blue,1.08+dx,.16,dz,.055,.32,.055);
    for (const z of [-.41,.41]) {
      part(cart,rim,rubber,-.42,.30,z);
      for (let i=0;i<4;i++) part(cart,box,steel,-.42,.30,z,.016,.55,.016).rotation.z=i*Math.PI/4;
    }
    part(cart,box,steel,.52,.30,0,.05,.58,.05);
    part(cart,box,red,0,.69,0,1.45,.44,.73);
    part(cart,box,cream,0,.94,0,1.53,.07,.78);
    for (const x of [-.66,.66]) for (const z of [-.32,.32])
      part(cart,tube,steel,x,1.36,z,.025,.82,.025);
    for (let i=0;i<6;i++)
      part(cart,loaf,bread,(i%3-1)*.38,1.04,Math.floor(i/3)*.25-.13,.23,.074,.09).rotation.y=.25;
    part(cart,box,red,0,1.82,0,1.64,.09,.94);
    const label=document.createElement('canvas'); label.width=256; label.height=64;
    const g=label.getContext('2d'); g.fillStyle='#f5dd9a'; g.fillRect(0,0,256,64);
    g.font='bold 47px sans-serif'; g.textAlign='center'; g.fillStyle='#932f21'; g.fillText('BÁNH MÌ',128,50);
    const map=new T.CanvasTexture(label); map.colorSpace=T.SRGBColorSpace;
    const sign=new T.MeshBasicMaterial({map}), panel=new T.PlaneGeometry(1.52,.34);
    for (const side of [-1,1]) part(cart,panel,sign,0,1.63,side*.425).rotation.y=side<0?Math.PI:0;
  }
  function place(graph,cx,cz,segments,clear,ground) {
    if (graph!==previousGraph) { greeted=false; nextClock=0; previousGraph=graph; }
    site=null;
    if (stand) stand.visible=false;
    if (!graph) return;
    const anchor=graph.point(105.8521,21.0343), ax=anchor.x-cx, az=anchor.z-cz;
    if (Math.hypot(ax,az)>400) { greeted=false; return; }
    let best=55;
    for (const s of segments) {
      if (s.len<6||s.graded||/^(motorway|trunk)/.test(s.kind)) continue;
      const t=Math.min(s.len-2, Math.max(2,(ax-s.ax)*s.fx+(az-s.az)*s.fz));
      for (const side of [-1,1]) {
        const x=s.ax+t*s.fx+side*s.nx*(s.w+2.0), z=s.az+t*s.fz+side*s.nz*(s.w+2.0);
        const d=Math.hypot(x-ax,z-az);
        if (d<best&&clear(x,z,1.35)) { best=d; site={x:x+cx,z:z+cz,yaw:Math.atan2(-s.fz,s.fx)}; }
      }
    }
    if (!site) return;
    if (!stand) build();
    stand.position.set(site.x-cx,ground(site.x,site.z),site.z-cz);
    stand.rotation.y=site.yaw;
    stand.visible=true;
  }
  function update(car,dt) {
    if (!site) return false;
    nextClock-=dt;
    if (nextClock<=0) {
      const hour=(new Date().getUTCHours()+7)%24;
      cart.visible=hour>=5&&hour<9; nextClock=2;
    }
    const distance=Math.hypot(site.x-car.x,site.z-car.z);
    if (distance>55) greeted=false;
    if (car.driving&&cart.visible&&distance<25&&!greeted) { greeted=true; return true; }
    return false;
  }
  return {place,update};
}
