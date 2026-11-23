'use strict';
window.VietnamLandmarks=(()=>{
  // OSM footprint centres and axes in WGS84. Positive local Z is the principal façade.
  // Gate centres on OSM way 39514795, in metres in the market's local frame.
  const marketSideGates=[
    {label:'CỬA TÂY',side:-1,x:-49.6,z:10.4},
    {label:'CỬA ĐÔNG',side:1,x:48.7,z:9.2}
  ];
  const marketSolids=[[0,0,44.5,61],[-1.2,-64.4,27,3.9],
    ...marketSideGates.map(({x,z})=>[(x+Math.sign(x)*44)/2,z,(Math.abs(x)-44)/2,8])];
  const entries=[
    {id:'turtle',photo:'https://kienthuc.net.vn/he-lo-hinh-anh-can-canh-ben-trong-thap-rua-ho-guom-post997231.html',name:'Tháp Rùa',city:'Hà Nội',lon:105.852293,lat:21.027873,yaw:0,width:4.54,depth:6.28,
      start:[105.853615,21.02761],bearing:8,map:'https://www.openstreetmap.org/way/178995269',
      source:'https://scov.gov.vn/dat-nuoc-con-nguoi/dat-nuoc-viet-nam/ho-guom-dep-tuyet-qua-goc-nhin-la.html'},
    {id:'cathedral',photo:'https://danangfantasticity.com/en/culture-en/danang-cathedral',name:'Nhà thờ Con Gà',city:'Đà Nẵng',lon:108.2230584,lat:16.0666828,yaw:1.492,width:20,depth:46,
      start:[108.223797,16.067551],map:'https://www.openstreetmap.org/way/404714309',
      source:'https://danangfantasticity.com/en/culture-en/danang-cathedral'},
    {id:'market',photo:'https://www.vietnam.vn/en/cho-ben-thanh-thay-ao-moi-sau-6-ngay-trung-tam-tp-hcm-ruc-ro-don-tet',name:'Chợ Bến Thành',city:'TP. Hồ Chí Minh',lon:106.698017,lat:10.772568,yaw:.532,width:89,depth:122,
      start:[106.698484,10.771409],map:'https://www.openstreetmap.org/way/39514795',
      solids:marketSolids,
      reserve:(x,z,pad)=>marketSolids.some(([cx,cz,w,d])=>Math.abs(x-cx)<w+1.5+pad&&Math.abs(z-cz)<d+1.5+pad)||
        z>=60-pad&&z<113+pad&&Math.abs(x)<39+pad,
      source:'https://visithcmc.vn/vi/kham-pha-cho-ben-thanh-tphcm-tu-a-z-5-phut-doc/'},
    {id:'sapa',photo:'https://clublog.club-t.com/_ct/17777960',name:'Nhà thờ đá Sa Pa',city:'Sa Pa',lon:103.8423215,lat:22.335102,yaw:-2.31,width:12.6,depth:38.5,scale:[1.11,1,1.24],
      start:[103.841426,22.335771],map:'https://www.openstreetmap.org/way/1379648108',source:'https://vietnamtourism.gov.vn/en/post/11269'},
    {id:'coal',photo:'https://vinpearl.com/en/quang-ninh-museum',name:'Bảo tàng Quảng Ninh',city:'Hạ Long',lon:107.097448,lat:20.9485596,yaw:1.386,width:62,depth:45,scale:[1.09,1,.98],
      start:[107.098402,20.949146],map:'https://www.openstreetmap.org/way/674061974',source:'https://dulichso.quangninh.gov.vn/article/bao-tang-quang-ninh-bieu-tuong-than-da-giua-long-ha-long-2d1'},
    {id:'flag',photo:'https://dantri.com.vn/thoi-su/noi-ghi-dau-nhung-khoanh-khac-chuyen-dong-lich-su-20250901183433824.htm',name:'Kỳ Đài',city:'Huế',lon:107.5802849,lat:16.4663006,yaw:.623,width:78,depth:49,scale:[1.18,1,.79],
      start:[107.581668,16.465841],map:'https://www.openstreetmap.org/way/218427614',source:'https://svhtt.hue.gov.vn/tin-trong-tinh/khanh-thanh-cong-trinh-chieu-sang-my-thuat-ky-dai-hue.html'},
    {id:'ponagar',photo:'https://dulichso.khanhhoa.gov.vn/article/thap-ba-po-nagar-77f',name:'Tháp Bà Po Nagar',city:'Nha Trang',lon:109.195463,lat:12.265371,yaw:1.56,width:47,depth:58,
      start:[109.196350,12.265950],map:'https://www.openstreetmap.org/way/146780347',source:'https://vietnam.travel/vi/things-to-do/vietnams-cham-legacy/'},
    {id:'rong',photo:'https://mia.vn/cam-nang-du-lich/ghe-nha-rong-kon-klor-chiem-nguong-net-dep-van-hoa-mien-cao-dac-sac-7869',name:'Nhà rông Kon Klor',city:'Kon Tum',lon:108.0344241,lat:14.3482379,yaw:-1.32,width:16.7,depth:9.9,
      start:[108.033765,14.347389],map:'https://www.openstreetmap.org/node/4133919102',source:'https://nongthon.vietnamtourism.gov.vn/thanh-pho-kon-tum-bao-ton-va-phat-huy-gia-tri-nghe-truyen-thong/'},
    {id:'station',photo:'https://thegioitiepthi.danviet.vn/ga-da-lat-chay-cac-chuyen-tau-co-phuc-vu-du-khach-den-voi-cao-nguyen-20240411210115688-d26878.html',name:'Ga Đà Lạt',city:'Đà Lạt',lon:108.4544254,lat:11.9415757,yaw:-.99,width:66,depth:17,scale:[1.27,1,1.07],
      start:[108.453436,11.941116],map:'https://www.openstreetmap.org/relation/17877171',source:'https://vietnamtourism.gov.vn/post/33922'},
    {id:'bat',photo:'https://datviettour.com.vn/tin-tuc/chua-doi-net-dep-kien-truc-viet-nam',name:'Chùa Dơi',city:'Sóc Trăng',lon:105.9724502,lat:9.5789424,yaw:-1.219,width:13.1,depth:19.7,scale:[.8,1,.68],
      start:[105.972331,9.580009],map:'https://www.openstreetmap.org/way/669125218',source:'https://dantoc.vietnamtourism.gov.vn/kham-pha-chua-doi-noi-hoi-tu-van-hoa-khmer-viet-hoa/'},
    {id:'dinh',photo:'https://thegioianh.diendandoanhnghiep.vn/ngoi-den-nam-canh-ngon-hai-dang-o-phu-quoc-6607.html',name:'Dinh Cậu',city:'Phú Quốc',lon:103.9564106,lat:10.2172171,yaw:1.01,width:11,depth:13,
      start:[103.957484,10.217047],map:'https://www.openstreetmap.org/way/1491082316',source:'https://vietnamtourism.gov.vn/post/54798'}
  ];
  const additions=new Map((window.VietnamSights||[]).map(site=>[site.id,site]));
  entries.push(...additions.values());
  const churchRails=[[-14.7,39,.29,16.4],[14.7,39,.29,16.4],[-10.05,55.1,4,.38],[10.05,55.1,4,.38]];

  // Bake the masonry, roof tiles, trims and ornaments into one draw call per building.
  function* model(T,id){
    const positions=[],normals=[],colours=[],uvs=[],indices=[],group=new T.Group(),pose=new T.Object3D();
    const point=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3();
    let seed=2043;
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    const cube=new T.BoxGeometry(),round=new T.CylinderGeometry(1,1,1,20),colour=new T.Color();
    const finishKinds=[],swatches=new Map(),footingVertices=[];
    function palette(spec, defaults=false) {
      for(const [kind,tints] of Object.entries(spec))
        for(const tint of [].concat(tints)){
          if(!defaults||!swatches.has(tint))swatches.set(tint,landmarkFinish[kind]);
        }
    }
    function stamp(geo,tint,x,y,z,w=1,h=1,d=1,ry=0,rx=0,rz=0){
      pose.position.set(x,y,z);pose.scale.set(w,h,d);pose.rotation.set(rx,ry,rz,'YXZ');pose.updateMatrix();
      const p=geo.attributes.position,n=geo.attributes.normal,base=positions.length/3;
      const kind=swatches.get(tint)??landmarkFinish.plain;
      // Only the underside of an actual ground-level slab can extend downhill.
      const footing=geo===cube&&rx===0&&rz===0&&Math.min(w,d)>=1&&Math.max(w,d)<=160&&
        y-h/2>=-.60&&y-h/2<=.22&&y+h/2>0;
      normalMatrix.getNormalMatrix(pose.matrix);colour.setHex(tint);
      for(let i=0;i<p.count;i++){
        const {x:px,y:py,z:pz}=point.fromBufferAttribute(p,i).applyMatrix4(pose.matrix);
        const {x:nx,y:ny,z:nz}=normal.fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix);
        positions.push(px,py,pz);normals.push(nx,ny,nz);colours.push(colour.r,colour.g,colour.b);
        if(footing&&p.getY(i)<0)footingVertices.push(base+i);
        const top=Math.abs(ny)>Math.max(Math.abs(nx),Math.abs(nz));
        let u=top||Math.abs(nz)>=Math.abs(nx)?px:pz, v=top?pz:py;
        if(kind===landmarkFinish.tile||kind===landmarkFinish.glazedTile||kind===landmarkFinish.thatch){
          // Across and down the pitch, with the overlap facing the eave.
          const slopesX=Math.abs(nx)>Math.abs(nz);
          u=slopesX?pz:px;
          v=slopesX?px*Math.sign(nx):pz*Math.sign(nz);
        }else if(kind===landmarkFinish.timber){
          // Run the photographed fibres along the post, beam or deck plank.
          const a=p.getX(i)*w,b=p.getY(i)*h,c=p.getZ(i)*d;
          if(h>=w&&h>=d){u=b;v=Math.abs(n.getX(i))>.6?c:a;}
          else if(w>=d){u=a;v=Math.abs(n.getY(i))>.6?c:b;}
          else{u=c;v=Math.abs(n.getY(i))>.6?a:b;}
        }
        uvs.push(u,v);finishKinds.push(kind);
      }
      const order=geo.index;
      for(let i=0;i<(order?.count??p.count);i++)indices.push(base+(order?order.getX(i):i));
    }
    // Place a complete authored building on a surveyed axis. Keep its metre
    // UVs in building space so rotating the hall also rotates its tile rows.
    function place(x,z,yaw,build){
      const start=positions.length,firstChild=group.children.length;
      build();
      const c=Math.cos(yaw),s=Math.sin(yaw);
      for(let i=start;i<positions.length;i+=3){
        const px=positions[i],pz=positions[i+2],nx=normals[i],nz=normals[i+2];
        positions[i]=x+c*px+s*pz;positions[i+2]=z-s*px+c*pz;
        normals[i]=c*nx+s*nz;normals[i+2]=-s*nx+c*nz;
      }
      const matrix=new T.Matrix4().makeRotationY(yaw).setPosition(x,0,z);
      const children=group.children.slice(firstChild);
      for(const child of children)child.applyMatrix4(matrix);
      return children;
    }
    const box=(...args)=>stamp(cube,...args);
    const shoreRanges=[];
    function groundStamp(...args){
      const first=indices.length;
      stamp(...args);shoreRanges.push([first,indices.length]);
    }
    const deck=(...args)=>groundStamp(cube,...args);
    function tapered(tint,x,y,z,base,top,height,depthRatio=1,sides=4){
      const geo=new T.CylinderGeometry(top,base,height,sides);
      if(sides===4)geo.rotateY(Math.PI/4);
      stamp(geo,tint,x,y,z,1,1,depthRatio);geo.dispose();
    }
    function profile(shape,tint,x,y,z,depth,angle=0){
      const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:8});stamp(geo,tint,x,y,z,1,1,1,angle);geo.dispose();
    }
    function outline(points,tint,x,y,z,thickness,angle=0){
      const shape=new T.Shape();points.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));shape.closePath();
      profile(shape,tint,x,y,z,thickness,angle);
    }
    function arch(tint,x,y,z,width,height,angle=0){
      // A solid spandrel and jambs around a genuinely open passage.
      const span=width*.35,spring=height*.46;
      const s=new T.Shape();s.moveTo(-width/2,0);s.lineTo(-span,0);s.lineTo(-span,spring);
      s.quadraticCurveTo(-span,spring+span,0,spring+span*1.15);s.quadraticCurveTo(span,spring+span,span,spring);
      s.lineTo(span,0);s.lineTo(width/2,0);s.lineTo(width/2,height);s.lineTo(-width/2,height);s.closePath();
      profile(s,tint,x,y,z,.28,angle);
    }
    function sign(title,x,y,z,width,height,glass=false,ink){
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
      const g=canvas.getContext('2d');if(!glass){g.fillStyle='#f2dfa7';g.fillRect(0,0,768,128);}
      g.fillStyle=ink||(glass?'#f1f2ef':'#703d39');g.font=glass?'bold 78px Arial':'bold 76px "Times New Roman", "Noto Serif", serif';g.textAlign='center';g.textBaseline='middle';g.fillText(title,384,67,732);
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
      const panel=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map,transparent:glass,alphaTest:glass?.32:0,roughness:.86}));
      panel.position.set(x,y,z);group.add(panel);
    }
    function wavingFlag(width,height,px,py,pz){
      const canvas=document.createElement('canvas');canvas.width=192;canvas.height=128;
      const pen=canvas.getContext('2d');pen.fillStyle='#b92628';pen.fillRect(0,0,192,128);pen.fillStyle='#ffcf3b';pen.beginPath();
      for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?14:36;pen.lineTo(96+r*Math.cos(a),64+r*Math.sin(a));}
      pen.closePath();pen.fill();
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      const cloth=new T.PlaneGeometry(width,height,24,6);cloth.translate(width/2,-height/2,0);
      const flag=new T.Mesh(cloth,new T.MeshStandardMaterial({map:texture,side:T.DoubleSide,roughness:.94}));flag.position.set(px,py,pz);
      const pos=cloth.attributes.position,rest=pos.array.slice();let frame=-1;
      const motion=matchMedia('(prefers-reduced-motion: reduce)');
      flag.onBeforeRender=()=>{const time=motion.matches?0:Math.floor(performance.now()/60);if(time===frame)return;frame=time;
        for(let i=0;i<pos.count;i++){const x=rest[i*3],y=rest[i*3+1],f=x/width,phase=x*.69+y*.22-time*.16;
          pos.setXYZ(i,x*(1-.07*f),y-f*(.7+.18*Math.sin(phase)),f*(1.25*Math.sin(phase)+.33*Math.sin(phase*2.1)));}
        pos.needsUpdate=true;cloth.computeVertexNormals();};
      group.add(flag);
    }
    if(id==='turtle'){
      const stone=0xb5b1a4,band=0x92887a,roof=0x706052;
      palette({stone:[stone,band],tile:roof});
      const island=new T.SphereGeometry(1,40,9);
      for(let i=0;i<island.attributes.position.count;i++){
        const p=island.attributes.position,x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),wave=1+.027*Math.sin(a*7)+.016*Math.cos(a*11);
        p.setXYZ(i,x*wave,y,z*wave);
      }
      island.computeVertexNormals();groundStamp(island,0x726952,0,-.98,0,9.5,1.47,12.7);groundStamp(island,0x617746,0,-.64,0,8.96,1.23,11.95);
      const shrub=new T.IcosahedronGeometry(1,0);
      for(let i=0;i<64;i++){
        const a=random()*Math.PI*2,dist=.61+random()*.28,x=Math.cos(a)*8.9*dist,z=Math.sin(a)*11.9*dist;
        stamp(shrub,i%4?0x647d45:0x85924d,x,-.64+1.23*Math.sqrt(1-dist*dist),z,.2+random()*.4,.12+random()*.25,.3,a);
      }
      shrub.dispose();island.dispose();
      box(stone,0,.59,0,4.95,.28,6.65);
      for(const [base,w,d,h] of [[.72,4.54,6.28,2.22],[3.31,3.64,4.8,1.98]]){
        for(const side of [-1,1]){
          for(let i=0;i<3;i++)arch(stone,side*(w/2-.13),base,(i-1)*d/3,d/3,h,side*Math.PI/2);
          for(let i=0;i<2;i++)arch(stone,(i-.5)*w/2,base,side*(d/2-.13),w/2,h,side<0?Math.PI:0);
        }
        for(const [rise,edge,thick,tint] of [[.04,.23,.16,band],[.21,.36,.18,roof],[.32,.07,.10,band]])box(tint,0,base+h+rise,0,w+edge,thick,d+edge);
      }
      for(const [floor,w,d] of [[3.24,4.63,6.35],[5.66,3.72,4.90]]){
        for(const side of [-1,1]){
          box(band,side*w/2,floor+.25,0,.11,.10,d);
          box(band,0,floor+.25,side*d/2,w,.10,.11);
          for(let i=1;i<14;i++)box(stone,side*w/2,floor+.12,(i/14-.5)*d,.08,.20,.09);
          for(let i=1;i<10;i++)box(stone,(i/10-.5)*w,floor+.12,side*d/2,.09,.20,.08);
          for(const end of [-1,1])box(stone,side*w/2,floor+.18,end*d/2,.23,.42,.23);
        }
      }
      box(stone,0,6.19,0,2.12,1.20,3.02);
      for(const side of [-1,1]){
        for(let i=-1;i<=1;i++){
          box(band,side*1.071,6.15,i*.88,.036,.85,.67);
          box(0xa29d90,side*1.099,6.15,i*.88,.034,.71,.53);
        }
        stamp(round,band,0,6.23,side*1.52,.39,.065,.39,0,Math.PI/2);
        stamp(round,0x433f37,0,6.23,side*1.57,.26,.03,.26,0,Math.PI/2);
      }
      // Paired ridges on two tiled hipped roofs, with curled figures at the four tips.
      for(const [y,w,d,rise] of [[6.79,2.80,3.60,.67],[7.80,2.07,2.85,.59]]){
        const eave=w*.5,top=.36,run=eave-top,len=Math.hypot(run,rise);
        tapered(roof,0,y+rise/2,0,eave*Math.SQRT2,top*Math.SQRT2,rise,d/w);
        for(const side of [-1,1]){
          for(let i=0;i<12;i++){
            const z=(i/11-.5)*d*.78;
            const fraction=Math.min(1,(1-2*Math.abs(z)/d)/(1-top/eave));
            box(i%3?0x827062:0x998877,side*(eave-run*fraction/2),y+rise*fraction/2+.025,z,len*fraction,.054,.055,0,0,-side*Math.atan2(rise,run));
          }
          for(const end of [-1,1]){
            const curl=new T.Shape();curl.moveTo(-.28,-.06);curl.quadraticCurveTo(.1,-.07,.30,.16);
            curl.quadraticCurveTo(.44,.36,.37,.49);curl.lineTo(.30,.40);curl.quadraticCurveTo(.23,.15,-.29,.10);curl.closePath();
            profile(curl,0x918574,side*(eave-.07),y+.035,end*(d/2-.13),.10,side>0?0:Math.PI);
          }
        }
        box(band,0,y+rise+.05,0,top*2.1,.13,d*top/eave);
        if(y<7)box(stone,0,7.62,0,1.39,.40,2.05);
      }
      for(const side of [-1,1])tapered(0x988876,0,8.55,side*.35,.11,.045,.34,1,8);
    }
    if(id==='cathedral'){
      const pink=0xe3a5a0,blush=0xeab1aa,trim=0xffe7d9,glass=0x334958,slate=0x757c7b;
      box(0xc9b59e,0,.03,38,30,.12,35);
      for(let j=0;j<4;j++)box(0xe4d4bd,0,.1+j*.1,24.45-j*.45,10-j*.25,.17+j*.2,1);
      for(const side of [-1,1]){
        box(0x73865c,side*10.7,.12,40,6.7,.17,24);
        box(0xddb7a3,side*14.7,.23,39,.49,.42,35);
        for(let j=0;j<=12;j++){
          const z=23+j*2.6;box(blush,side*14.7,1.07,z,.51,2.1,.5);tapered(trim,side*14.7,2.21,z,.42,.16,.24);
          if(j<12)for(let i=0;i<6;i++)box(0x52645b,side*14.7,1.02,z+.31+i*.37,.07,1.48,.065);
        }
        box(0x52645b,side*14.7,1.55,38.5,.09,.09,31);
        for(const x of [6.5,13.6]){box(blush,x*side,1.47,55.1,.95,2.9,.95);tapered(trim,x*side,3.08,55.1,.77,.22,.54);}
        box(0x52645b,10.1*side,1.5,55.1,6.6,.08,.09);
        for(let i=0;i<15;i++)box(0x52645b,(7.02+i*.44)*side,.92,55.1,.065,1.75,.09);
      }
      box(0xafa397,0,.21,0,20.8,.42,47);box(pink,0,5.2,-1,18.7,10,42);
      const gable=[[-9.7,0],[0,5.7],[9.7,0]];
      outline(gable,slate,0,10.1,-22,42.8);
      function lancet(x,y,z,w,h,a){
        for(const [scale,depth,tint] of [[1,0,trim],[.76,.08,glass]]){
          const width=w*scale,hgt=h*scale;
          const s=new T.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(width/2,hgt*.57);
          s.quadraticCurveTo(width*.36,hgt*.86,0,hgt);s.quadraticCurveTo(-width*.36,hgt*.86,-width/2,hgt*.57);s.closePath();
          profile(s,tint,x+Math.sin(a)*depth,y+(h-hgt)/2,z+Math.cos(a)*depth,.09,a);
        }
        box(trim,x+.18*Math.sin(a),y+h*.42,z+.18*Math.cos(a),.12,h*.61,.11,a);
      }
      for(const side of [-1,1])for(let j=0;j<8;j++){
        const z=-19+j*5.3;
        box(blush,side*9.68,4.55,z,.95,9.1,.82);tapered(trim,side*9.68,9.48,z,.65,.12,.84);
        if(j<7)lancet(side*9.41,2.2,z+2.5,2.8,6.3,side*Math.PI/2);
      }
      box(blush,0,8.8,19,8.1,17.1,6.7);
      for(const side of [-1,1]){
        box(blush,side*7.25,6.4,19,4.25,12.4,6.5);tapered(slate,side*7.25,15.5,19,3.17,.03,5.8);
        lancet(side*7.25,2.1,22.26,2.7,5,0);
        for(const sx of [-1,1])tapered(trim,side*7.25+sx*1.92,14.1,21.94,.39,.02,3.2);
      }
      for(const [y,w,h] of [[16.9,7.9,.4],[20.4,6.7,.36],[26.7,5.94,.35]])box(trim,0,y,19,w,h,w*.85);
      box(pink,0,18.7,19,6.4,3.8,5.3);box(blush,0,23.58,19,5.55,6.3,4.7);
      lancet(0,.59,22.39,5.4,8.25,0);
      // Paired shutters below the dial and pointed hoods on all four belfry faces.
      for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){
        const sa=Math.sin(a),ca=Math.cos(a),wall=Math.abs(ca)>.5?2.38:2.8;
        for(const off of [-.74,.74]){
          lancet(sa*wall+ca*off,20.7,19+ca*wall-sa*off,1.27,2.66,a);
          for(let j=0;j<4;j++)box(0x667272,sa*(wall+.19)+ca*off,21.05+j*.28,19+ca*(wall+.19)-sa*off,.70,.09,.10,a);
        }
        const x=sa*(wall+.11),z=19+ca*(wall+.11);
        stamp(round,trim,x,24.95,z,1.02,.15,1.02,a,Math.PI/2);
        stamp(round,0xe4dfc8,x+sa*.12,24.95,z+ca*.12,.83,.1,.83,a,Math.PI/2);
        box(0x514d44,x+sa*.20,25.20,z+ca*.20,.084,.57,.065,a,0,-.2);
        box(0x514d44,x+sa*.21+ca*.18,24.95,z+ca*.21-sa*.18,.43,.072,.065,a);
        outline([[-2.61,0],[0,2.15],[2.61,0],[0,2.72]],trim,x,26.15,z,.18,a);
      }
      lancet(0,17.30,21.68,2.12,2.55,0);
      stamp(round,0xe8dac0,0,18.53,21.96,.31,1.0,.25);
      const head=new T.SphereGeometry(1,8,6);stamp(head,0xe8dac0,0,19.29,22,.23,.28,.21);head.dispose();
      // Rose window, tracery and four corner pinnacles mark the stepped bell tower.
      stamp(round,trim,0,13.4,22.43,2.2,.14,2.2,0,Math.PI/2);stamp(round,glass,0,13.4,22.55,1.82,.12,1.82,0,Math.PI/2);
      for(let i=0;i<6;i++)box(trim,0,13.4,22.67,.1,3.6,.085,0,0,i*Math.PI/6);
      for(const x of [-2.64,2.64])for(const z of [16.8,21.2])tapered(trim,x,27.84,z,.5,.02,3.2);
      tapered(blush,0,30.68,19,3.63,.10,8.0,1,4);stamp(round,0x43474a,0,35.15,19,.07,1.3,.07);
      outline([[-1.32,.88],[-1.06,.82],[-.75,.4],[-.46,.42],[-.21,.63],[.04,.59],[.23,1.08],[.38,1.18],[.45,1.43],[.54,1.22],[.75,1.31],[.69,1.05],[.97,.97],[.65,.82],[.52,.44],[.32,.12],[-.09,0],[-.55,.11],[-.81,.32],[-1.35,.49]],0x504d41,0,35.68,19,.1);
      // Pointed hood moulds and openwork bands span the side aisles.
      for(const side of [-1,1]){
        for(const x of [4.6,8.8])for(const y of [6.9,10.3])box(trim,side*x,y,22.35,.28,.38,.38);
        for(let j=0;j<5;j++)lancet(side*(4.88+j*.88),7.44,22.32,.7,1.58,0);
        outline([[-2,0],[0,1.75],[2,0],[0,2.14]],trim,side*7.25,11.92,22.33,.16);
        for(const y of [10.1,12.4])box(trim,side*7.24,y,22.35,4.58,.21,.33);
        outline([[0,0],[2,2.42],[4,0],[2,3.08]],trim,side*7.25-2,6.04,22.58,.16);
      }
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4,x=Math.sin(a)*1.02,y=13.4+Math.cos(a)*1.02;
        const ring=new T.TorusGeometry(.45,.075,5,14);stamp(ring,trim,x,y,22.77);ring.dispose();
      }
    }
    if(id==='market'){
      const wall=0xeadbbb,trim=0xf3ead6,tile=0xb64639,glass=0x49534d;
      function shell(w,d,h,y,r,tint){
        const shape=new T.Shape(),x=w/2,z=d/2;
        shape.moveTo(-x+r,-z);shape.lineTo(x-r,-z);shape.quadraticCurveTo(x,-z,x,-z+r);
        shape.lineTo(x,z-r);shape.quadraticCurveTo(x,z,x-r,z);shape.lineTo(-x+r,z);
        shape.quadraticCurveTo(-x,z,-x,z-r);shape.lineTo(-x,-z+r);shape.quadraticCurveTo(-x,-z,-x+r,-z);
        const slab=new T.ExtrudeGeometry(shape,{depth:h,curveSegments:6,bevelEnabled:false});slab.rotateX(-Math.PI/2);
        stamp(slab,tint,0,y,0);slab.dispose();
      }
      shell(93.4,129,.18,-.04,4.9,0xb8aea0);
      for(let j=0;j<3;j++)box(0xc9bdad,0,.15,62.0+j*.72,86.4,.025,.043);
      shell(90,123,.32,0,3.5,0xa5a297);shell(88,121,5.65,.32,3.5,wall);
      shell(88.6,121.8,.28,5.82,3.55,trim);shell(88.2,121.5,.22,6.06,3.55,tile);
      function hallRoof(x,z,w,length,eave,rise,angle,colour){
        outline([[-w/2,0],[0,rise],[w/2,0]],colour,x-Math.sin(angle)*length/2,eave,z-Math.cos(angle)*length/2,length,angle);
        box(0xc86b51,x,eave+rise,z,.22,.17,length,angle);
      }
      // A raised cruciform nave separates four fields of parallel ventilated roofs.
      for(const signX of [-1,1])for(const signZ of [-1,1]){
        for(let i=0;i<3;i++){
          const x=signX*(12+i*10.4),z=signZ*31;
          hallRoof(x,z,10.5,46,6.28,2.4,0,i===1?0xb64a3f:tile);
          box(0x7a6252,x,8.17,z,2.65,.85,33);
          hallRoof(x,z,3.45,33.8,8.56,.75,0,0xbc5142);
        }
      }
      hallRoof(0,0,15,110,6.28,4.05,0,tile);hallRoof(0,0,15.5,82,6.28,4.13,Math.PI/2,tile);
      box(0x927159,0,9.82,0,4.85,1.52,96);hallRoof(0,0,6.15,96,10.53,1.18,0,0xbc5142);
      for(const side of [-1,1]){
        box(0x927159,side*23,9.87,0,30,1.30,3.7);hallRoof(side*23,0,4.7,30.5,10.48,.92,Math.PI/2,0xbc5142);
        for(let j=0;j<10;j++){
          const z=(j-4.5)*10;box(trim,side*40.33,6.42,z,3.4,.28,3.2);
          box(0xb2ada2,side*40.33,6.72,z,2.0,.4,1.76);
        }
      }
      for(const side of [-1,1]){
        for(let i=0;i<20;i++){
          const z=(i-9.5)*5.95;box(trim,side*44.1,3.35,z,1.1,6.6,.6);
          box(glass,side*44.08,2.65,z+2.67,.2,4.2,4.25);
          for(let j=0;j<3;j++)box(wall,side*44.25,3.62+j*.4,z+2.67,.22,.16,4.35);
        }
        for(let i=0;i<7;i++){
          const x=side*(9+i*5.25);box(glass,x,2.6,60.7,3.6,4.4,.28);box(trim,x+side*2.23,3.3,61,.53,6.4,.77);
          box(i%3===0?0x8e9d80:0xb26446,x,4.75,61.3,4.85,.16,1.6,0,.09);
          box(0x79684e,x,1.03,61.06,3.5,.34,.56);
          for(let j=0;j<4;j++)box([0xc78a52,0xbba16f,0x909c62,0xaf6145][(i+j)%4],x-1.29+j*.78,1.45,61,.69,.51,.48);
        }
      }
      const cz=56.3;
      box(wall,0,7.5,cz,9.7,14.8,9.1);box(trim,0,14.9,cz,10.2,.68,9.5);
      box(wall,0,17.65,cz,9.2,5.2,8.7);
      for(const a of [0,Math.PI/2,-Math.PI/2,Math.PI]){
        const s=Math.sin(a),c=Math.cos(a),face=Math.abs(c)>.5?4.42:4.66;
        stamp(round,0x896e4a,s*face,17.61,cz+c*face,1.96,.18,1.96,a,Math.PI/2);
        stamp(round,0xfff3d9,s*(face+.12),17.61,cz+c*(face+.12),1.7,.09,1.7,a,Math.PI/2);
        for(let i=0;i<12;i++){
          const rad=i*Math.PI/6,off=Math.sin(rad)*1.4,depth=face+.2;
          box(0x484637,s*depth+c*off,17.61+Math.cos(rad)*1.4,cz+c*depth-s*off,.1,.30,.08,a,0,-rad);
        }
        for(const [ang,len] of [[-.96,1.06],[1.12,.83]]){
          const off=Math.sin(ang)*len/2,depth=face+.27;
          box(0x34392f,s*depth+c*off,17.61+Math.cos(ang)*len/2,cz+c*depth-s*off,.13,len,.08,a,0,-ang);
        }
      }
      for(const side of [-1,1]){
        box(0xd5ad60,side*2.64,17.65,60.69,2.89,4.69,.07);
        box(trim,side*4.36,17.65,60.79,.29,4.75,.19);
      }
      box(trim,0,20.51,cz,10.2,.6,9.7);box(wall,0,21.14,cz,9.55,.78,9);
      tapered(tile,0,22.99,cz,8.0,.21,2.78,.95);
      box(glass,0,3.35,61,6.6,6.4,.28);arch(trim,0,.24,61.21,9.4,7.2);
      for(const side of [-1,1]){
        box(trim,side*4.47,8.5,60.99,.48,16.4,.35);
        for(let i=0;i<6;i++){
          const x=side*(11.5+i*5.44);
          arch(wall,x,.25,61.55,5.42,5.45);
          box(trim,x,5.89,61.63,5.45,.27,.46);
        }
        for(const y of [15.83,19.52])box(trim,side*3.72,y,60.83,.42,.56,.34);
      }
      for(let i=0;i<9;i++)box(0x675c4a,(i-4)*.71,21.22,60.25,.43,.56,.18);
      box(trim,0,21.51,cz,10.65,.19,9.85);
      tapered(0x765746,0,24.92,cz,.24,.025,1.32,1,8);
      outline([[-.52,.92],[.51,.92],[.46,.18],[0,-.26],[-.46,.18]],0x7b7853,0,8.56,61.11,.14);
      sign('CHỢ BẾN THÀNH',0,11.07,61.22,9.23,1.42);

      // The side portals have tall flat parapets, pairs of white pilasters
      // and ceramic panels between perforated ventilation screens.
      for(const {label,side,x,z} of marketSideGates)place(x,z,side*Math.PI/2,()=>{
        const depth=Math.abs(x)-44;
        box(0x3e403a,0,2.2,-depth+.35,8.2,4.4,.25);
        box(wall,0,6.55,-depth/2,8.6,4.7,depth);
        box(trim,0,8.96,-depth/2,8.85,.19,depth+.13);
        for(const hand of [-1,1]){
          box(trim,hand*4.08,4.5,-.25,.48,8.85,.54);
          box(wall,hand*6.15,3.45,-depth/2,3.85,6.8,depth);
          box(trim,hand*6.15,6.91,-depth/2,4,.19,depth+.1);
          box(0x9a927e,hand*3.73,2.17,-depth/2,.32,4.25,depth);
          for(const col of [1.43,2.65]){
            box(glass,hand*col,4.97,.025,.93,1.34,.06);
            for(let row=0;row<6;row++){
              const y=4.44+row*.20,cx=hand*col;
              box(trim,cx-.22,y,.08,.51,.10,.10,0,0,-.25);
              box(trim,cx+.22,y,.08,.51,.10,.10,0,0,.25);
            }
          }
        }
        box(0x45685d,0,5.13,.03,1.52,1.64,.12);
        const relief=side<0
          ? [[-.64,.25],[-.20,.45],[.46,.36],[.66,.04],[.28,-.05],[.01,-.15],[-.43,-.61],[-.20,-.12]]
          : [[-.67,.49],[-.32,.25],[0,.35],[.32,.25],[.67,.49],[.52,.12],[.28,-.02],[.13,-.46],[-.15,-.46],[-.30,-.03],[-.50,.13]];
        outline(relief,0xd7b779,0,5.1,.11,.055);
        sign(label,0,7.36,.08,5.8,.95,true,'#765c42');
      });

      // The Lê Thánh Tôn frontage has a low arcade, flower stalls and a
      // curved nameboard above its central aisle, visible across the street.
      place(-1.2,-68.3,Math.PI,()=>{
        box(0x766553,0,3.88,-3.8,54,.23,7.65);
        for(let bay=-4;bay<=4;bay++){
          const x=bay*6;
          box(0x454740,x,1.82,-7.36,5.55,3.64,.23);
          arch(wall,x,.03,-.3,6,3.85);
          if(Math.abs(bay)<2)continue;
          box(0x705c48,x,.55,-1.75,3.5,.22,1.12);
          for(let pot=0;pot<4;pot++){
            const px=x+(pot-1.5)*.75,pz=-1.73+(pot%2)*.17;
            tapered(0x986443,px,.83,pz,.21,.31,.40,1,7);
            tapered(0x58714b,px,1.22,pz,.37,.17,.52,1,7);
            stamp(round,[0xe3b64b,0xc47780,0xe1d6a4][(bay+4+pot)%3],px,1.46,pz,.25,.17,.21);
          }
        }
        const crest=new T.Shape();
        crest.moveTo(-2.7,0);crest.lineTo(-2.7,1.40);
        crest.quadraticCurveTo(0,3.05,2.7,1.40);crest.lineTo(2.7,0);crest.closePath();
        profile(crest,trim,0,3.02,.025,.15);
        sign('CỬA BẮC',0,4.26,.195,4.6,.73,true,'#483e34');
        sign('CHỢ BẾN THÀNH',0,3.55,.195,3.8,.49,true,'#483e34');
      });
    }
    // The following pieces share the same baked mesh and metric coordinates as the original three sites.
    const stone=0xa3937c,ochre=0xd3a451,cream=0xf3deb0,tileRed=0x95513d,wood=0x633e2e;
    palette({stone,plaster:[cream,ochre],timber:wood,tile:tileRed});
    function gable(x,eaves,z,w,h,d,tint){
      outline([[-w/2,0],[0,h],[w/2,0]],tint,x,eaves,z-d/2,d);
    }
    function steps(x,z,width,count){
      for(let i=0;i<count;i++)box(i%2?0xc1b49a:0xb7ac97,x,(count-i)*.085,z+i*.36,width,(count-i)*.17,.39);
    }
    function dial(x,y,z,r){
      stamp(round,0x6d6253,x,y,z,r,.14,r,0,Math.PI/2);
      stamp(round,0xf2e7c9,x,y,z+.13,r*.89,.09,r*.89,0,Math.PI/2);
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;box(wood,x+r*.74*Math.sin(a),y+r*.74*Math.cos(a),z+.21,.07,r*.16,.07,0,0,-a);
      }
      for(const [a,l] of [[-.78,.42],[1.15,.7]])box(wood,x+Math.sin(a)*l*r/2,y+Math.cos(a)*l*r/2,z+.25,.08,r*l,.08,0,0,-a);
    }
    function stoneWindow(x,y,z,w,h,angle=0){
      box(0x46504d,x,y+h/2,z,w,h,.16,angle);
      arch(0xc4beb1,x+.13*Math.sin(angle),y,z+.13*Math.cos(angle),w+.3,h+.16,angle);
    }
    if(id==='sapa'){
      const limestone=0xb6b3a5,slate=0x504c47,w=10.4;
      // Draw the irregular rows in metre-space so stones retain their size on the belfry and nave.
      const sheet=document.createElement('canvas');sheet.width=sheet.height=256;
      const brush=sheet.getContext('2d');brush.fillStyle='#77776b';brush.fillRect(0,0,256,256);
      for(let row=0;row<12;row++){
        let x=row%2?-17:0;
        while(x<256){
          const width=28+Math.floor(random()*23),tone=151+Math.floor(random()*39);
          brush.fillStyle='rgb('+tone+','+(tone-2)+','+(tone-13)+')';
          brush.fillRect(x+.6,row*256/12+.7,width-1.2,256/12-1.5);
          for(let p=0;p<28;p++){
            brush.fillStyle=p%2?'rgba(46,42,34,.15)':'rgba(239,237,212,.19)';
            brush.fillRect(x+random()*width,row*256/12+random()*256/12,1+random()*2,.8+random());
          }
          x+=width;
        }
      }
      const blocks=new T.CanvasTexture(sheet);blocks.colorSpace=T.SRGBColorSpace;blocks.wrapS=blocks.wrapT=T.RepeatWrapping;
      const shell=[],shellNormals=[],shellUV=[];
      function stonework(geo,x,y,z){
        const g=geo.index?geo.toNonIndexed():geo,p=g.attributes.position,n=g.attributes.normal;
        for(let i=0;i<p.count;i++){
          const X=p.getX(i)+x,Y=p.getY(i)+y,Z=p.getZ(i)+z,nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
          shell.push(X,Y,Z);shellNormals.push(nx,ny,nz);
          shellUV.push((Math.abs(nx)>Math.abs(nz)?Z:X)/4.0,(Math.abs(ny)>.78?Z:Y)/3.72);
        }
        if(g!==geo)g.dispose();geo.dispose();
      }
      function stoneBlock(x,y,z,sx,sy,sz){stonework(new T.BoxGeometry(sx,sy,sz),x,y,z);}
      function stoneGable(x,y,z,width,rise,depth){
        const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(0,rise);shape.lineTo(width/2,0);shape.closePath();
        stonework(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),x,y,z-depth/2);
        for(const side of [-1,1])box(slate,x+side*width*.25,y+rise*.5+.06,z,Math.hypot(width/2,rise)+.18,.20,depth+.23,0,0,-side*Math.atan2(rise,width/2));
      }
      stoneBlock(0,3.25,-1.7,w,6.5,27.9);stoneGable(0,6.48,-1.7,w+.34,4.05,28.1);
      for(const side of [-1,1]){
        for(let i=0;i<6;i++){
          const z=-14+i*4.8;
          stoneBlock(side*5.23,2.14,z,.69,4.28,.68);
          stoneBlock(side*5.23,5.1,z,.53,1.72,.56);
          stoneWindow(side*5.23,1.74,z+2.3,1.42,3.43,side*Math.PI/2);
        }
      }
      stoneBlock(0,8.13,10.63,4.72,16.26,4.78);stoneGable(0,16.25,10.63,4.91,2.80,4.97);
      const lancet=(w,h)=>{const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h*.64);s.quadraticCurveTo(w*.46,h*.82,0,h);s.quadraticCurveTo(-w*.46,h*.82,-w/2,h*.64);s.closePath();return s;};
      for(const side of [-1,1]){
        const x=side*2.12;
        stoneBlock(x,8.18,13.09,.44,16.36,.5);
        box(0x8f8c7c,x,16.36,13.10,.56,.22,.58);
      }
      profile(lancet(3.61,10.88),0x7b7b70,0,7.18,13.03,.09);
      profile(lancet(3.08,10.4),0xb2b0a2,0,7.19,13.14,.07);
      for(const side of [-1,1]){
        const x=side*.79;
        box(0x383b35,x,10.64,13.23,.52,6.48,.10);
        for(let i=0;i<24;i++)box(0x625e52,x,7.55+i*.263,13.31,.5,.072,.08,0,.23);
        box(limestone,x,13.99,13.26,.68,.18,.18);
      }
      stoneBlock(0,3.04,13.10,5.82,6.08,3.63);stoneGable(0,6.07,13.10,6.25,1.88,3.75);
      profile(lancet(4.14,5.67),0x797767,0,.24,14.93,.10);
      profile(lancet(3.64,5.40),0xc0bcac,0,.25,15.04,.08);
      profile(lancet(3.13,5.03),0x4d5041,0,.26,15.13,.08);
      profile(lancet(2.73,4.71),0x553d30,0,.27,15.22,.06);
      box(0x362e25,0,1.96,15.31,.047,3.25,.055);
      for(const x of [-1,1])for(const h of [1.18,2.57])box(0x6b4a37,x*.66,h,15.33,1.03,1.0,.03);
      for(const x of [-2.60,2.60])stoneBlock(x,2.82,14.93,.52,5.64,.47);
      box(0x434846,0,19.45,10.60,.12,1.02,.12);box(0x434846,0,19.58,10.60,.68,.10,.11);
      steps(0,15.48,6.30,4);
      const masonry=new T.BufferGeometry();
      masonry.setAttribute('position',new T.Float32BufferAttribute(shell,3));masonry.setAttribute('normal',new T.Float32BufferAttribute(shellNormals,3));masonry.setAttribute('uv',new T.Float32BufferAttribute(shellUV,2));
      const walls=new T.Mesh(masonry,new T.MeshStandardMaterial({map:blocks,roughness:.92}));walls.castShadow=walls.receiveShadow=true;group.add(walls);
    }
    if(id==='coal'){
      const panes=[],norm=[],shade=[];
      function curtain(x,z,w,h,angle){
        const c=Math.cos(angle),s=Math.sin(angle),nx=Math.ceil(w/3.05),ny=Math.round(h/2.88);
        for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
          const x0=-w/2+i*w/nx+.025,x1=-w/2+(i+1)*w/nx-.025;
          const y0=3.54+j*h/ny+.021,y1=3.54+(j+1)*h/ny-.021;
          const tint=new T.Color().setHSL(.544+random()*.012,.045+random()*.03,.17+.075*j/ny+.020*random());
          for(const [u,y] of [[x0,y0],[x1,y0],[x1,y1],[x0,y0],[x1,y1],[x0,y1]]){
            panes.push(x+u*c,y,z-u*s);norm.push(s,0,c);shade.push(tint.r,tint.g,tint.b);
          }
        }
      }
      function glassWing(x,z,w,d,h){
        box(0x292e2f,x,3.53+h/2,z,w,h,d);
        curtain(x,z+d/2+.012,w,h,0);curtain(x,z-d/2-.012,w,h,Math.PI);
        curtain(x+w/2+.012,z,d,h,Math.PI/2);curtain(x-w/2-.012,z,d,h,-Math.PI/2);
        box(0x444a49,x,3.54+h,z,w+.08,.11,d+.08);
      }
      box(0x8a8980,0,.31,0,57.2,.61,45.4);
      box(0x454b49,0,2.01,-2.80,55.6,3.1,37.8);
      glassWing(-9.95,-2.53,34.0,37.84,21.0);glassWing(17.4,-3.72,20.55,36.5,18.8);
      const curtainWall=new T.BufferGeometry();
      curtainWall.setAttribute('position',new T.Float32BufferAttribute(panes,3));curtainWall.setAttribute('normal',new T.Float32BufferAttribute(norm,3));curtainWall.setAttribute('color',new T.Float32BufferAttribute(shade,3));
      const glazing=new T.Mesh(curtainWall,new T.MeshPhysicalMaterial({vertexColors:true,color:0xffffff,metalness:.48,roughness:.18,clearcoat:.8,clearcoatRoughness:.17,envMapIntensity:.9}));
      glazing.receiveShadow=true;group.add(glazing);
      // Broad stone steps, steel handrails and the recessed rectangular entrance.
      const doorway=-6.2;
      box(0xaaa89c,0,1.78,16.16,54.5,3.55,2.71);
      for(let i=0;i<18;i++){
        const z=22.8-i*.31,top=(i+1)*.19+.10;
        box(i%3?0xaaa89c:0x9d9d92,0,top/2,z,54.5,top,.33);
        box(0x9b4a40,doorway,top+.012,z,4.8,.018,.30);
      }
      for(const x of [-26.5,-17.7,17.7,26.5]){
        for(const i of [0,4,8,12,16])stamp(round,0xc9cdca,x,.65+(i+1)*.19,22.8-i*.31,.042,1.10,.042);
        box(0xc1c7c4,x,2.96,20.26,.08,.085,5.99,0,.55);
      }
      // The front volume projects over the entrance storey.
      box(0x313837,doorway,4.61,16.45,10.4,2.25,.24);
      for(let i=0;i<5;i++){
        box(0x536461,doorway+(i-2)*1.6,4.6,16.61,1.53,2.03,.10);
        box(0x8e9790,doorway+(i-2)*1.6,4.73,16.70,.042,.47,.06);
      }
      box(0x88918b,doorway,5.84,16.73,10.7,.17,1.18);
      const lettering=document.createElement('canvas');lettering.width=1024;lettering.height=768;
      const pen=lettering.getContext('2d');
      for(const [word,top,w,h] of [['BẢO TÀNG',14,736,280],['QUẢNG NINH',336,995,411]]){
        pen.save();pen.font='200 180px "Segoe UI Light","Segoe UI",sans-serif';
        const m=pen.measureText(word),ascent=m.actualBoundingBoxAscent,descent=m.actualBoundingBoxDescent;
        pen.translate((1024-w)/2,top);pen.scale(w/m.width,h/(ascent+descent));
        pen.fillStyle='#373d3d';pen.fillText(word,3,ascent+2);pen.fillStyle='#e7ebe6';pen.fillText(word,0,ascent);pen.restore();
      }
      const letters=new T.CanvasTexture(lettering);letters.colorSpace=T.SRGBColorSpace;
      const title=new T.Mesh(new T.PlaneGeometry(29.8,16.8),new T.MeshStandardMaterial({map:letters,transparent:true,alphaTest:.24,roughness:.6}));
      title.position.set(-8.8,15.44,16.43);group.add(title);
    }
    if(id==='flag'){
      // The river-facing edge comes to a point. The lower terrace flares into
      // two projecting shoulders, visible in aerial views from the south.
      const lower=[[-33,-27],[-24,-27],[-24,-10],[-17,-10],[-17,-22],[17,-22],[17,-10],[24,-10],[24,-27],[33,-27],[33,16],[0,31],[-33,16]];
      const middle=[[-21,-18],[21,-18],[21,11],[0,22],[-21,11]];
      const upper=[[-11,-10],[11,-10],[11,9],[-11,9]];
      function terrace(ring,y,h,wall,deck,parapet){
        const outline=ring.map(([x,z])=>new T.Vector2(x*.95,z*.95));
        const v=[],colors=[];
        function triangle(a,b,c,tint){
          v.push(...a,...b,...c);const k=new T.Color(tint);for(let i=0;i<3;i++)colors.push(k.r,k.g,k.b);
        }
        for(let i=0;i<ring.length;i++){
          const [x,z]=ring[i],[X,Z]=ring[(i+1)%ring.length],bottom=[x,y,z],next=[X,y,Z],top=[x*.95,y+h,z*.95],end=[X*.95,y+h,Z*.95];
          triangle(bottom,top,end,wall);triangle(bottom,end,next,wall);
          const dx=end[0]-top[0],dz=end[2]-top[2],length=Math.hypot(dx,dz),yaw=Math.atan2(-dz,dx);
          box(0x827970,(top[0]+end[0])/2,y+h-.10,(top[2]+end[2])/2,length+.05,.24,.38,yaw);
          if(parapet){
            const count=Math.max(1,Math.round(length/3.7));
            for(let j=0;j<count;j++){const t=(j+.5)/count;box(0x665b50,top[0]+dx*t,y+h+.27,top[2]+dz*t,length/count*.77,.54,.49,yaw);}
          }
        }
        for(const face of T.ShapeUtils.triangulateShape(outline,[])){
          const [a,b,c]=face.map(i=>[outline[i].x,y+h,outline[i].y]);
          if((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])<0)triangle(a,c,b,deck);else triangle(a,b,c,deck);
        }
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();
        const n=geo.attributes.normal;
        const first=positions.length/3;
        for(let i=0;i<v.length/3;i++)indices.push(first+i);
        for(let i=0;i<v.length/3;i++){positions.push(v[i*3],v[i*3+1],v[i*3+2]);normals.push(n.getX(i),n.getY(i),n.getZ(i));colours.push(colors[i*3],colors[i*3+1],colors[i*3+2]);uvs.push((Math.abs(n.getX(i))>.7?v[i*3+2]:v[i*3])*.22,(n.getY(i)>.8?v[i*3+2]:v[i*3+1])*.22);}
        geo.dispose();
      }
      terrace(lower.map(([x,z])=>[x*1.04,z*1.04]),-.32,.72,0x696353,0x748044,false);
      terrace(lower,.4,5.15,0x877366,0x98796c,false);
      terrace(middle,5.55,5.8,0x685f57,0x866658,true);
      terrace(upper,11.35,6.12,0x817666,0x96786b,true);
      box(0x878078,0,17.79,0,4.1,.64,3.8);
      tapered(0x938a80,0,18.76,0,1.68,1.02,1.32,1,8);
      tapered(0xaaa59a,0,36.9,0,.42,.18,36,1,16);
      for(let i=0;i<13;i++)stamp(round,0x77766d,0,20+i*2.66,0,.44-i*.018,.1,.44-i*.018);
      wavingFlag(11,7.33,.18,54.6,0);
    }
    if(id==='ponagar'){
      const brick=0xa15d43,terracotta=0xb47851,lintel=0x715142,sandstone=0xc09d72,top=7.55;
      // Mandapa lies below the eastern sanctuary terrace, on the same approach axis.
      const mound=new T.SphereGeometry(1,38,12);
      stamp(mound,0x69774b,0,-3.7,-2,23.4,9.2,24.8);mound.dispose();
      const shrub=new T.IcosahedronGeometry(1,1);
      for(let i=0;i<84;i++){
        const theta=i*2.4,r=.71+.26*random();
        const x=23.4*r*Math.cos(theta),z=-2+24.8*r*Math.sin(theta);
        if(z>4&&Math.abs(x-4)<8||Math.abs(x)<15.6&&z<5.5&&z>-18.5)continue;
        const y=-3.7+9.2*Math.sqrt(1-r*r);
        stamp(shrub,[0x5e703e,0x788541,0x829253,0x6b8145][i%4],x,y+.22,z,1.0+random()*1.65,.70+random()*.9,.85+random(),theta);
      }
      shrub.dispose();
      box(0x926b51,0,3.25,-6.5,31.2,8.2,23.8);
      box(0xb28768,0,7.40,-6.5,31.7,.30,24.25);
      box(0xab8363,4,.72,21.0,14.1,1.44,18.8);
      for(let i=0;i<36;i++){
        const height=7.55-i*.17;
        box(i%4?0x9f7558:0xaf8766,4,height/2,5.9+i*.23,2.9,height,.25);
      }
      for(const side of [-1,1])for(const [offset,count,r,h] of [[3.2,5,.95,5.0],[6.0,6,.60,2.85]]){
        for(let i=0;i<count;i++){
          const x=4+side*offset,z=14.7+i*(12.7/(count-1));
          tapered(terracotta,x,1.44+h/2,z,r,r*.82,h,1,8);
          if(count===5)box(lintel,x+side*r*.89,4.1,z,.03,.34,.37);
        }
      }
      const leaf=[[-.5,0],[-.5,.36],[-.42,.58],[-.23,.79],[0,1],[.23,.79],[.42,.58],[.5,.36],[.5,0]];
      function pointed(tint,x,y,z,w,h,depth,angle=0){
        outline(leaf.map(([u,v])=>[u*w,v*h]),tint,x,y,z,depth,angle);
      }
      function sanctuary(x,z,w,h,type){
        const body=h*(type==='south'?.49:.54);
        box(lintel,x,top+.22,z,w+.62,.44,w+.62);
        box(brick,x,top+.37+body/2,z,w,body,w);
        for(const side of [-1,1])for(const offset of [-.40,-.20,0,.20,.40]){
          const relief=offset===0?.4:.22;
          box(terracotta,x+offset*w,top+.38+body/2,z+side*(w/2+.02),w*.072,body,relief);
          box(terracotta,x+side*(w/2+.02),top+.38+body/2,z+offset*w,relief,body,w*.072);
        }
        const cornice=top+.36+body;
        for(const [dy,k] of [[-.32,1.02],[0,1.13],[.28,1.07]])
          box(dy?terracotta:lintel,x,cornice+dy,z,w*k,.26,w*k);
        if(type==='south'){
          // The south tower has a rounded, nearly continuous cap and no corner towers.
          const curve=[[0,.55],[.17,.51],[.38,.43],[.64,.29],[.85,.13],[1,.025]],rise=h-body-.68;
          const geo=new T.LatheGeometry(curve.map(([dy,r])=>new T.Vector2(w*r,dy*rise)),28);
          stamp(geo,0xb5724b,x,cornice+.22,z,1,1,1.03);geo.dispose();
        }else{
          const rise=h-body-.82,levels=type==='main'?3:2;
          for(let i=0;i<levels;i++){
            const y=cornice+i*rise/levels,k=1-i*.74/levels,levelH=rise/levels;
            tapered(brick,x,y+levelH*.52,z,w*k*.67,w*k*.44,levelH,1);
            box(lintel,x,y+.20,z,w*k*1.05,.36,w*k*1.05);
            for(const a of [-1,1])for(const b of [-1,1]){
              const px=x+a*w*k*.41,pz=z+b*w*k*.41;
              box(terracotta,px,y+levelH*.34,pz,w*k*.16,levelH*.58,w*k*.16);
              tapered(sandstone,px,y+levelH*.8,pz,w*k*.15,.04,levelH*.6);
            }
          }
          tapered(sandstone,x,top+h-.23,z,w*.12,.10,.8,1,8);
        }
        // Alternating brick courses and the projecting corbel frieze catch light at the cornice.
        for(let j=0;j<Math.ceil(w);j++)for(const side of [-1,1]){
          const u=((j+.5)/Math.ceil(w)-.5)*w;
          box(terracotta,x+u,cornice-.40,z+side*w*.52,.22,.27,.27);
          box(terracotta,x+side*w*.52,cornice-.40,z+u,.27,.27,.22);
        }
        for(let i=0;i<48;i++){
          const y=top+1.1+(body-1.4)*random(),u=(random()-.5)*w*.89;
          const tint=[0x9c6148,0xaa6c4d,0x945c44][i%3],side=i%2?1:-1;
          if(i%4<2)box(tint,x+u,y,z+side*(w*.5+.013),.25+random()*.4,.105,.04);
          else box(tint,x+side*(w*.5+.013),y,z+u,.04,.105,.25+random()*.4);
        }
        for(let face=0;face<4;face++){
          const angle=face*Math.PI/2,normalX=Math.sin(angle),normalZ=Math.cos(angle);
          const front=face===0,travel=w*(front?.65:.51),portal=w*(front?.52:.45);
          const location=k=>[x+(travel+k)*normalX,z+(travel+k)*normalZ];
          if(front)box(brick,x,top+body*.27,z+w*.52,portal,body*.55,w*.32);
          for(const [d,k,t] of [[0,1.12,lintel],[.14,1.0,terracotta],[.30,.79,brick]]){
            const [px,pz]=location(d);
            pointed(t,px,top+.45,pz,portal*k,body*.82*k,.16,angle);
          }
          const [px,pz]=location(.53);
          if(front){
            box(0x392d25,px,top+body*.20,pz,portal*.53,body*.39,.16);
            for(const side of [-1,1])stamp(round,sandstone,px+side*portal*.32,top+body*.2,pz+.12,.14,body*.4,.14);
            box(sandstone,px,top+body*.41,pz+.10,portal*.78,.30,.46);
            pointed(sandstone,px,top+body*.44,pz+.08,portal*.52,body*.22,.16);
          }
        }
      }
      sanctuary(4,-1.5,8.8,23,'main');sanctuary(-6.8,-4.1,6.4,18,'south');
      sanctuary(-11.7,1.5,3.9,7.1,'east');sanctuary(4,-13.8,4.15,9,'west');
    }
    if(id==='rong'){
      const beam=0x443429,slat=0x674c34,deck=2.95;
      for(const x of [-6.8,-2.2,2.2,6.8])for(const z of [-2.96,2.96]){
        stamp(round,beam,x,deck*.5,z,.32,deck,.36);
        box(0x66513c,x,2.55,z,.84,.36,.85);
      }
      box(beam,0,deck-.17,0,16.4,.34,7.3);
      box(slat,0,4.17,0,15.9,2.46,6.82);
      for(const side of [-1,1])for(let i=0;i<66;i++){
        const x=-7.82+i*.24;
        if(side>0&&Math.abs(x)<1.05)continue;
        box(i%3?0x71583e:0x7e6444,x,4.2,side*3.43,.19,2.36,.09);
      }
      box(0x221e1b,0,4.08,3.48,1.66,2.16,.12);
      box(beam,0,2.84,3.9,15.8,.21,1.18);
      for(let i=0;i<24;i++){
        const x=-7.52+i*.65;
        for(const dir of [-1,1])box(0xc4b395,x+dir*.12,3.18,3.51,.045,.43,.025,0,0,dir*.89);
      }
      // An arched ridge, inward-sloping gable ends and flared skirts distinguish
      // the thatched hull from a constant-width triangular prism.
      function roofPoint(u,t,face){
        return [u*(8.65-2.26*t),5.24+t*(15.25+.64*(1-u*u)),
          face*(4.52*Math.pow(1-t,1.32)+.11+.32*u*u*(1-t))];
      }
      const thatch=new Map();
      function thatchFace(a,b,c,d,tint){
        if(!thatch.has(tint))thatch.set(tint,[]);
        thatch.get(tint).push(...a,...b,...c,...a,...c,...d);
      }
      for(const face of [-1,1]){
        for(let r=0;r<42;r++)for(let j=0;j<18;j++){
          const u=-1+2*j/18,v=u+2/18,t=r/42,h=(r+1)/42;
          const a=roofPoint(u,t,face),b=roofPoint(v,t,face),c=roofPoint(v,h,face),d=roofPoint(u,h,face);
          a[2]+=face*.045;b[2]+=face*.045;
          const shade=Math.floor(random()*11)+(r%5===0?0:5);
          const tint=0x6f6654+shade*0x010101;
          if(face>0)thatchFace(a,b,c,d,tint);else thatchFace(b,a,d,c,tint);
        }
        // Dark timber fascia around the rim, with pale bound cane around the ridge.
        box(beam,0,5.23,face*4.63,17.2,.18,.23);
      }
      for(const end of [-1,1])for(let row=0;row<42;row++){
        const t=row/42,h=(row+1)/42,a=roofPoint(end,t,-1),b=roofPoint(end,t,1),c=roofPoint(end,h,1),d=roofPoint(end,h,-1);
        if(end<0)thatchFace(a,b,c,d,0x776b53);else thatchFace(b,a,d,c,0x776b53);
      }
      for(const [tint,faces] of thatch){
        const sheet=new T.BufferGeometry();sheet.setAttribute('position',new T.Float32BufferAttribute(faces,3));sheet.computeVertexNormals();
        stamp(sheet,tint,0,0,0);sheet.dispose();
      }
      for(let j=0;j<19;j++){
        const u=-1+j/9,x=u*6.4,y=20.49+.64*(1-u*u);
        box(0xb9ad8a,x,y-.15,0,.74,.45,.45);
        box(beam,x,y+.27,0,.047,.65,.06);
      }
      // Two inclined notched log stairs meet at the central front landing.
      for(const side of [-1,1]){
        box(beam,side*2.75,1.45,4.02,.64,4.64,.77,0,0,side*.92);
        for(let i=0;i<9;i++)box(0x816849,side*(4.48-i*.43),.22+i*.31,4.08,.48,.105,.82);
      }
    }
    if(id==='station'){
      const plaster=0xe9ad40,trim=0xf4ebd6,edge=0x854434,roof=0x975038;
      // The long wings have ridges parallel to the tracks. The three front-facing
      // gables interrupt that roof only over the central booking hall.
      function wing(x,z,width,length,base,rise){
        box(plaster,x,base/2,z,width,base,length);
        const shape=[[-length*.54,0],[0,rise],[length*.54,0]];
        outline(shape,roof,x-width/2-.18,base,z,width+.36,Math.PI/2);
        box(trim,x,base-.07,z+length*.51,width,.18,.22);
      }
      wing(0,-.6,38,12.6,6.15,3.2);
      for(const side of [-1,1]){
        wing(side*21.7,-.65,7.8,11.2,3.45,2.25);
        for(let j=0;j<12;j++){
          const x=side*(10.2+j*.68);
          box(j%3?0x455753:0x647675,x,5.77,5.77,.53,.49,.065);
        }
        for(let j=0;j<3;j++){
          const x=side*(12.2+j*2.8);
          box(edge,x,1.92,5.83,2.2,2.65,.13);
          box(0x59615a,x,1.95,5.92,1.99,2.34,.1);
          box(trim,x,1.9,6.02,.09,2.35,.07);
        }
      }
      const glass=[0x516563,0xd2a43f,0x8fa69b,0x9f5034,0xc5c7af,0x6e8175,0x425451];
      for(let i=-1;i<=1;i++){
        const x=i*6.25;
        const face=[[-3.42,0],[-2.64,5.53],[0,8.85],[2.64,5.53],[3.42,0]];
        outline(face,edge,x,3.38,3.65,4.99);
        outline(face.map(([u,v])=>[u*.935,v*.974]),trim,x,3.38,8.65,.11);
        outline(face.map(([u,v])=>[u*.88,v*.94]),plaster,x,3.41,8.77,.06);
        box(edge,x,8.69,8.87,5.15,.13,.08);
        box(trim,x,5.95,8.88,3.55,4.77,.12);
        for(let row=0;row<6;row++)for(let col=0;col<4;col++){
          if(i===0&&row===5)continue;
          const tint=glass[(row*7+col*13+row*col+Math.abs(i))%glass.length];
          box(tint,x+(col-1.5)*.80,4.06+row*.72,8.98,.65,.54,.055);
        }
        box(0x373d38,x,1.68,6.18,4.35,3.19,.13);
        for(const mullion of [-1,0,1])box(trim,x+mullion*1.15,1.65,6.28,.08,3.13,.07);
      }
      dial(0,10.11,8.92,.85);sign('DALAT',0,7.68,9.04,3.28,.62);
      // Two round-ended tiled porticoes project over the entrance doors.
      for(const side of [-1,1]){
        const x=side*6.15;
        for(const [y,r,tint] of [[3.0,3.1,trim],[3.22,3.02,edge],[3.42,2.87,roof]]){
          stamp(round,tint,x,y,7.55,r,.22,r*.8);box(tint,x,y,6.9,2*r,.22,1.3);
        }
        for(const dx of [-1.65,1.65])stamp(round,edge,x+dx,1.48,8.81,.15,2.96,.15);
      }
      box(trim,0,3.13,7.17,20.5,.21,2.45);
      for(const side of [-1,1])for(const x of [12.2,16.2,19.6])stamp(round,edge,side*x,1.42,6.48,.16,2.84,.16);
      for(const side of [-1,1])box(roof,side*15.25,2.97,6.15,9.7,.21,2.3,0,-.08);
      steps(0,9.1,19,3);
    }
    if(id==='bat'){
      const gold=0xd7a347,ochreRed=0xb67445,cobalt=0x387bb7,white=0xe6dcc6;
      box(cobalt,0,.58,0,17.1,1.16,29.3);box(0xdcbb73,0,1.20,0,17.35,.16,29.5);
      box(ochreRed,0,3.84,-.15,11.7,5.12,23.4);
      // The two entrances flank a painted devotional panel on the main gable end.
      for(const side of [-1,1])for(let i=0;i<7;i++){
        const z=-12+i*4,x=side*7.65;
        box(white,x,3.71,z,.43,4.86,.43);
        for(const y of [1.52,5.63,6.13])box(gold,x,y,z,.72,.23,.72);
        outline([[0,0],[side*.70,.46],[side*1.03,1.30],[side*.48,1.05],[0,.54]],gold,x,5.02,z,.18);
        if(i===6)continue;
        box(cobalt,x,1.53,z+2,.31,.42,3.9);box(gold,x,2.37,z+2,.34,.13,3.94);
        for(let j=0;j<8;j++)tapered(0xdcb35f,x,1.94,z+.29+j*.48,.102,.08,.71,1,8);
      }
      for(let i=-2;i<=2;i++)for(const side of [-1,1]){
        const z=i*4.2;box(gold,side*5.90,3.70,z,.18,2.62,1.56);box(0x433e32,side*6.01,3.70,z,.13,2.29,1.23);
      }
      for(const [w,d,y,h] of [[17.0,29.3,6.25,2.8],[12.8,23.4,8.0,2.65],[8.4,17.7,9.83,3.38]]){
        gable(0,y,0,w,h,d,0xac673f);box(gold,0,y+.01,0,w+.28,.24,d+.23);
        for(const side of [-1,1]){
          const slope=Math.atan2(h,w*.5);
          for(let i=1;i<=12;i++)box(i%2?0xb97849:0x915638,side*(w/2)*(1-i/13),y+h*i/13+.035,0,.08,.06,d,0,0,-side*slope);
          for(const end of [-1,1]){
            const z=end*(d/2+.10);
            box(gold,side*w*.25,y+h*.5,z,.20,Math.hypot(w/2,h),.18,0,0,side*Math.atan2(w/2,h));
            outline([[0,0],[side*.56,.18],[side*.90,.79],[side*.98,1.47],[side*.50,.95]],gold,side*w*.49,y,z,.18);
          }
        }
        box(gold,0,y+h+.07,0,.24,.21,d+.3);
      }
      for(const z of [-6.4,0,6.4]){
        tapered(gold,0,13.62,z,.34,.17,.65,1,8);tapered(0xc99b54,0,14.3,z,.18,.02,.87,1,8);
      }
      for(const end of [-1,1]){
        const z=end*11.87;
        for(const side of [-1,1]){
          const x=side*3.98;
          box(gold,x,3.22,z,2.32,3.85,.17);box(0x49382e,x,3.12,z+end*.10,1.86,3.54,.18);
          outline([[-1.17,0],[0,1.33],[1.17,0]],gold,x,5.13,z,.22,end<0?Math.PI:0);
          for(let j=0;j<7;j++)box(0xa99e88,x,(7-j)*.09,end*(14.3+j*.30),2.60,(7-j)*.18,.32);
        }
        box(gold,0,3.88,z,5.17,4.66,.22);box(0x44695e,0,3.87,z+end*.14,4.76,4.27,.13);
        // A painted frontal panel, with a seated figure and attendants between the doors.
        const panel=document.createElement('canvas');panel.width=384;panel.height=320;
        const art=panel.getContext('2d');
        const grove=art.createLinearGradient(0,0,0,320);
        grove.addColorStop(0,'#244841');grove.addColorStop(.66,'#466e65');grove.addColorStop(1,'#476d6b');
        art.fillStyle=grove;art.fillRect(0,0,384,320);
        function oval(x,y,rx,ry,tint){
          art.fillStyle=tint;art.beginPath();art.ellipse(x,y,rx,ry,0,0,Math.PI*2);art.fill();
        }
        for(let i=0;i<280;i++){
          const u=random(),v=random(),x=u*384,y=v*320;
          if(Math.abs(x-192)>45||y<83)oval(x,y,2+random()*13,1+random()*7,['#647b5f','#2b5548','#3e665a','#75907c'][i%4]);
        }
        for(let j=0;j<3;j++){
          oval(192,243-j*7,82-j*9,14,'#9f743f');
          oval(192,239-j*7,81-j*9,10,'#cfaa63');
        }
        oval(191,115,49,54,'#954f28');oval(191,115,46,51,'#d49f50');oval(191,115,41,46,'#d7b95f');
        oval(192,115,18,24,'#513931');oval(192,122,15,19,'#c59155');oval(192,95,7,7,'#4a3830');
        art.fillStyle='#c3904a';art.beginPath();art.moveTo(174,140);art.quadraticCurveTo(164,148,160,183);
        art.quadraticCurveTo(143,194,133,206);art.bezierCurveTo(129,220,155,222,192,217);
        art.bezierCurveTo(232,224,252,216,250,206);art.lineTo(218,183);art.quadraticCurveTo(219,146,205,139);art.closePath();art.fill();
        art.strokeStyle='#88613a';art.lineWidth=3;art.beginPath();art.moveTo(205,142);art.quadraticCurveTo(188,166,166,184);
        art.moveTo(208,146);art.quadraticCurveTo(196,170,179,184);art.moveTo(144,209);art.quadraticCurveTo(168,200,192,213);
        art.quadraticCurveTo(216,201,240,209);art.stroke();
        oval(182,183,17,4,'#d7b273');oval(202,185,14,4,'#d7b273');
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const u=192+side*(86+j*17),v=190+j*9;
          oval(u,v,7,9,'#c89b69');oval(u,v-5,6,3,'#564231');
          art.fillStyle=j%2?'#bb8649':'#bb6d3d';art.beginPath();art.moveTo(u-side*5,v+8);
          art.quadraticCurveTo(u+side*10,v+3,u+side*11,v+18);art.lineTo(u+side*19,v+32);
          art.quadraticCurveTo(u+side*9,v+40,u-side*13,v+31);art.closePath();art.fill();
          art.strokeStyle='#dfb681';art.lineWidth=3;art.beginPath();art.moveTo(u+side*3,v+13);art.lineTo(u-side*6,v+19);art.lineTo(u-side*11,v+10);art.stroke();
        }
        const paint=new T.CanvasTexture(panel);paint.colorSpace=T.SRGBColorSpace;
        const mural=new T.Mesh(new T.PlaneGeometry(4.70,4.12),new T.MeshStandardMaterial({map:paint,roughness:.93}));
        mural.position.set(0,3.87,z+end*.225);mural.rotation.y=end<0?Math.PI:0;group.add(mural);
        const width=7.35;
        outline([[-width/2,0],[0,2.96],[width/2,0]],gold,0,9.86,end*8.98,.16,end<0?Math.PI:0);
        for(let i=-3;i<=3;i++)for(let j=0;j<3-Math.abs(i)*.5;j++)
          outline([[0,0],[-.14,.18],[.02,.44],[.13,.20]],0xf2cb77,i*.76,10.03+j*.56,end*9.15,.12,end<0?Math.PI:0);
      }
    }
    if(id==='dinh'){
      const rock=new T.IcosahedronGeometry(1,0),deck=4.05;
      // Granite beds fracture into broad horizontal ledges at the waterline.
      for(let i=0;i<38;i++){
        const a=i*2.39996,r=Math.sqrt(i/38),x=11.0*r*Math.cos(a),z=11.2*r*Math.sin(a);
        stamp(rock,[0x9a9481,0x827d6f,0x786e61,0xa39a83][i%4],x,1.3-r*.7,z,3.3+random(),1.8+(1-r)*2.5,2.7+random(),a*.3,.07,-.11);
      }
      rock.dispose();
      box(0x9b9a8e,0,3.70,-.9,13,.70,16.6);box(0xe0d1b2,0,deck,-.9,13.3,.17,16.9);
      // The shrine and its open veranda have separate red roofs.
      box(0xedbd60,0,5.61,-1.8,7.9,3.1,6.8);
      for(const side of [-1,1]){
        for(const z of [-4.5,-2.25,0]){box(0x873e2b,side*3.98,5.75,z,.12,1.67,1.17);box(0x583a29,side*4.04,5.73,z,.09,1.44,.89);}
        for(const z of [1.24,5.35])stamp(round,0xa14531,side*3.51,5.56,z,.20,3.05,.20);
      }
      box(0x775032,0,5.32,1.65,2.65,2.47,.15);
      function hip(x,z,y,width,depth,rise){
        // Four curved roof planes share ridges; ridges rise slightly towards each corner.
        const points=[],ridges=[];
        const corners=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]];
        for(let f=0;f<4;f++){
          const a=corners[f],b=corners[(f+1)%4];
          const vertex=(u,v)=>{
            const x0=a[0]+(b[0]-a[0])*u,z0=a[1]+(b[1]-a[1])*u;
            const ridgeX=.46*x0,ridgeZ=.25*z0;
            return [x0+(ridgeX-x0)*v,rise*(v*.76+v*v*.24)+.43*Math.pow(Math.abs(2*u-1),4)*(1-v),z0+(ridgeZ-z0)*v];
          };
          for(let j=0;j<5;j++)for(let k=0;k<8;k++){
            const a=vertex(k/8,j/5),b=vertex((k+1)/8,j/5),c=vertex(k/8,(j+1)/5),d=vertex((k+1)/8,(j+1)/5);
            points.push(...a,...c,...b,...b,...c,...d);
          }
          const rim=Array.from({length:11},(_,i)=>new T.Vector3(...vertex(i/10,0)));
          const ridge=Array.from({length:7},(_,i)=>new T.Vector3(...vertex(0,i/6)));
          ridges.push(rim,ridge);
        }
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.computeVertexNormals();
        stamp(geo,0xb5503b,x,y,z);geo.dispose();
        box(0xb55342,x,y+rise-.02,z,width*.46,.11,depth*.25);
        for(const curve of ridges){
          const tube=new T.TubeGeometry(new T.CatmullRomCurve3(curve),10,.071,5,false);
          stamp(tube,0xe1ad59,x,y+.045,z);tube.dispose();
        }
      }
      hip(0,-1.8,7.05,9.8,8.1,1.74);hip(0,3.64,7.04,8.5,4.6,1.10);
      box(0xb78445,0,7.01,5.45,7.8,.38,.33);
      box(0xe9b24c,0,8.84,-1.8,4.15,.17,.24);
      const pearl=new T.SphereGeometry(.20,12,9);stamp(pearl,0xdc9847,0,9.24,-1.8);pearl.dispose();
      for(const side of [-1,1]){
        // The paired dragon silhouettes at the roof ridge face the central disc.
        const dragon=[[-.07,.09],[.09,.27],[.34,.31],[.46,.17],[.70,.15],[1.03,.35],[1.37,.32],[1.67,.55],[1.83,.85],[1.76,.35],[1.48,.12],[1.15,.02],[.88,.04],[.63,-.02],[.37,.04],[.19,.13]];
        outline(dragon.map(([u,v])=>[side*(u+.19),v]),0xb99955,0,8.88,-1.78,.16);
      }
      for(const side of [-1,1]){
        for(let j=0;j<12;j++){
          const z=-8.6+j*1.39;box(0xc5c7bf,side*6.36,deck+.47,z,.18,.87,.18);
        }
        for(const y of [.33,.84])box(0xd0d3ca,side*6.36,deck+y,-.90,.11,.09,15.65);
      }
      for(let i=0;i<29;i++){
        const t=i/28,h=deck*(1-t)+.1,angle=t*.9;
        box(0x9a9787,2.5+3.55*Math.sin(angle),h/2,7.1+t*7.3,2.05,h,.47,-angle*.38);
      }
      // Blue-grey masonry gate frames the landward end of the stair.
      const gateX=5.23,gateZ=13.82;
      arch(0x7b96a4,gateX,.16,gateZ,3.30,3.12,-.28);
      for(const side of [-1,1])box(0x75929d,gateX+side*1.48,1.51,gateZ+side*.42,.46,2.86,.70,-.28);
      box(0x98573c,gateX,3.27,gateZ,3.67,.24,.82,-.28);
      box(0xc87643,gateX,3.49,gateZ,2.85,.20,.64,-.28);
      box(0xe4b854,gateX,3.17,gateZ+.39,1.85,.25,.09,-.28);
      const lx=-6.35,lz=-5.75;
      tapered(0xd9d7cb,lx,deck+.31,lz,1.75,1.38,.62,1,20);
      for(let i=0;i<6;i++){
        const r=1.20-i*.066;
        tapered(i%2?0x678b9d:0xe0dfd6,lx,deck+1.20+i*1.14,lz,r,r-.066,1.14,1,24);
      }
      stamp(round,0xd1d4c9,lx,deck+7.62,lz,1.52,.26,1.52);
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;stamp(round,0x647477,lx+1.35*Math.cos(a),deck+8.02,lz+1.35*Math.sin(a),.033,.75,.033);
      }
      for(const y of [7.89,8.35]){
        const rail=new T.TorusGeometry(1.35,.034,5,30);stamp(rail,0x768484,lx,deck+y,lz,1,1,1,0,Math.PI/2);rail.dispose();
      }
      stamp(round,0x92adb0,lx,deck+8.27,lz,.71,1.10,.71);
      tapered(0xe3dfd4,lx,deck+9.05,lz,.93,.10,.65,1,18);
      stamp(round,0x626e69,lx,deck+9.60,lz,.037,.55,.037);
      window.CentralArch.trees(T,{group},[{x:5.6,y:2.35,z:-4.1,h:7.8,width:10.1}]);
    }
    const addition=additions.get(id);
    if(addition){
      const steps=addition.build(T,{group,place,stamp,groundStamp,box,deck,round,tapered,profile,outline,arch,sign,random,wavingFlag,palette,vertexCount:()=>positions.length/3});
      if(steps?.next)yield* steps;
    }
    cube.dispose();round.dispose();group.name=id;
    if(!positions.length)return group;
    yield;
    const geometry=new T.BufferGeometry();
    geometry.setIndex(indices);
    for(const [name,values] of [['position',positions],['normal',normals],['color',colours]]){
      geometry.setAttribute(name,new T.Float32BufferAttribute(values,3));
      if(values.length>65536)yield;
    }
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();
    geometry.setAttribute('finishKind',new T.Uint8BufferAttribute(finishKinds,1));
    const finish=createLandmarkMaterial(T,id,addition?.plasterStain??.18);
    if(id==='market'||id==='flag'){
      const fort=id==='flag';
      const scanned=finish.onBeforeCompile;
      finish.customProgramCacheKey=()=>fort?'citadel-brick-scan':'market-roof-scan';
      finish.onBeforeCompile=shader=>{
        scanned(shader);
        const vary='varying vec3 masonryPoint; varying vec3 masonryNormal;\n';
        shader.vertexShader=vary+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n masonryPoint=position; masonryNormal=normal;');
        shader.fragmentShader=vary+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+(fort?`
          if(masonryPoint.y<17.7){
            vec2 face=abs(masonryNormal.y)>.65?masonryPoint.xz:vec2(abs(masonryNormal.x)>.65?masonryPoint.z:masonryPoint.x,masonryPoint.y);
            vec2 course=face/vec2(.51,.215);course.x+=mod(floor(course.y),2.)*.5;
            vec2 dist=abs(fract(course)-.5),aa=max(fwidth(course),vec2(.004));
            float joint=max(smoothstep(.466-aa.x,.486+aa.x,dist.x),smoothstep(.435-aa.y,.475+aa.y,dist.y));
            float fade=1.-smoothstep(.28,.78,max(aa.x,aa.y));
            float brick=fract(sin(dot(floor(course),vec2(12.7,81.3)))*4358.7);
            diffuseColor.rgb*=1.+fade*(.19*(brick-.5)-.24*joint);
          }`:`
          if(masonryNormal.y>.55&&vColor.r>vColor.g*2.2){
            vec2 roof=abs(masonryNormal.x)>abs(masonryNormal.z)?masonryPoint.zx:masonryPoint.xz;
            vec2 tile=roof*vec2(4.8,3.45);
            float fade=1.-smoothstep(.24,.85,max(fwidth(tile.x),fwidth(tile.y)));
            float stepLip=smoothstep(.72,.99,fract(tile.y));
            diffuseColor.rgb*=1.+fade*(.10*cos(tile.x*6.28318)-.15*stepLip);
          }`));
      };
    }
    const mesh=new T.Mesh(geometry,finish);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    if(shoreRanges.length)mesh.userData.shoreCover=shoreRanges;
    if(footingVertices.length&&addition&&!group.userData.fitGround&&!addition.scale&&
       addition.solids?.length!==0&&!id.startsWith('cau-')){
      const p=geometry.getAttribute('position'),feet=new Map();
      for(const i of footingVertices){
        const x=p.getX(i),z=p.getZ(i),rest=p.getY(i),key=x+','+z;
        if(!feet.has(key))feet.set(key,{x,z,vertices:[]});
        feet.get(key).vertices.push([i,rest]);
      }
      group.userData.fitGround=ground=>{
        let changed=false;
        for(const {x,z,vertices} of feet.values()){
          const bed=ground(x,z)-.22;
          for(const [i,rest] of vertices){
            const y=Math.min(rest,bed);
            if(Math.abs(p.getY(i)-y)>.001){p.setY(i,y);changed=true;}
          }
        }
        if(changed){p.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();}
      };
    }
    return group;
  }
  function create(T,scene,nightLights={value:0}){
    const cached=new Map(),shoreCovers=new WeakMap(),finishes=createSightFinishes(T,nightLights);
    let displayed;
    function* prepareSteps(graph,cx,cz,ground=()=>0,deckHeight=null){
    const active=[];
    const buildingAreas=[],gardens=[],modeledBuildings=new Set();
    const naturalSites=new Set(['Thác nước','Hang động','Đỉnh núi','Hồ','Vịnh','Bãi biển','Khu bảo tồn','Vườn quốc gia']);
    const visitorSites=new Set(['Vườn cảnh','Công viên','Khảo cổ','Thành cổ','Lăng mộ','Đền chùa','Công trình tín ngưỡng','Di tích']);
    function gardenRadius(site,extent){
      if(site.gardenRadius)return site.gardenRadius;
      const fallback=naturalSites.has(site.kind)?75:visitorSites.has(site.kind)?35:12;
      // Use the shorter span so a long, narrow site does not clear entire
      // neighbouring blocks. Large parks still keep their surrounding villages.
      return extent?Math.min(120,Math.max(fallback,Math.min(...extent)*.5+8)):fallback;
    }
    function reserveBuildingArea(site,localRing){
      const ring=localRing.map(([u,v])=>new T.Vector2(site.x+u*site.c+v*site.s,site.z-u*site.s+v*site.c));
      buildingAreas.push({ring,bounds:new T.Box2().setFromPoints(ring)});
    }
    function prepareBuildingSites(graph,cx,cz){
      buildingAreas.length=gardens.length=0;modeledBuildings.clear();
      if(!graph)return;
      for(const site of active){
        gardens.push({x:site.x,z:site.z,r:gardenRadius(site.data,[site.data.width,site.data.depth])});
        if(site.data.surveyed)continue;
        const {data}=site,extra=data.id==='cathedral'?8:data.id==='turtle'?12:2;
        const rectangle=(x,z,w,d)=>reserveBuildingArea(site,[[x-w,z-d],[x+w,z-d],[x+w,z+d],[x-w,z+d]]);
        if(data.boundary)reserveBuildingArea(site,data.boundary);
        else rectangle(0,0,data.width/2+extra,data.depth/2+extra);
        if(data.id==='cathedral')rectangle(0,28.5,16,28.5);
        if(!data.boundary)for(const [x,z,w,d] of data.solids||[]){
          if(Math.abs(x)+w>data.width/2+extra||Math.abs(z)+d>data.depth/2+extra)rectangle(x,z,w,d);
        }
        const ref=(data.map||data.source||'').match(/openstreetmap\.org\/(way|relation)\/(\d+)\/?$/);
        if(ref)modeledBuildings.add(ref[1][0]+ref[2]);
        for(const id of data.modeledBuildings||[])modeledBuildings.add(id);
      }
      const precinct=graph.point(105.7956,20.5528);
      if(Math.hypot(precinct.x-cx,precinct.z-cz)<1500)gardens.push({...precinct,r:445});
      const [lon,lat]=graph.geo(cx,cz);
      for(const site of window.VietnamTourism?.nearby(lon,lat,900/graph.mx,900/graph.my)||[]){
        const p=graph.point(site.lon,site.lat);
        gardens.push({...p,r:gardenRadius(site,window.VietnamSightDetails?.[site.id]?.extent)});
      }
    }
    if(graph)for(const data of entries){
        if(additions.has(data.id)&&!data.build)continue;
        const {x,z}=graph.point(data.lon,data.lat);if(Math.hypot(x-cx,z-cz)>(data.viewDistance??1050))continue;
        if(!cached.has(data.id)){
          yield;
          const mesh=yield* model(T,data.id);
          finishes.apply(mesh);mesh.userData.height=new T.Box3().setFromObject(mesh).max.y*(data.scale?.[1]||1);
          mesh.visible=false;scene.add(mesh);cached.set(data.id,mesh);
          yield;
        }
        const foundation=deckHeight&&(modeledBridgeLengths[data.id]||data.foundationOnBridge)?(px,pz)=>deckHeight(px,pz)??ground(px,pz):ground;
        const mesh=cached.get(data.id),c=Math.cos(data.yaw),s=Math.sin(data.yaw);
        const [u,v]=data.foundationAt||[0,0];
        const base=foundation(x+u*c+v*s,z-u*s+v*c);
        active.push({data,x,z,mesh,c,s,base,place(){
          mesh.position.set(x-cx,base,z-cz);mesh.rotation.y=data.yaw;
          if(data.scale)mesh.scale.fromArray(data.scale);
          mesh.userData.placeLights?.();
          mesh.userData.fitGround?.((u,v)=>foundation(x+u*c+v*s,z-u*s+v*c)-base);
        }});
      }
    prepareBuildingSites(graph,cx,cz);
    function activate(){
      for(const site of displayed?.active||[])site.mesh.visible=false;
      for(const site of active){site.place();site.mesh.visible=true;}
      displayed=view;trim();
    }
    function nearest(x,z,maxMeters=650,id){
      let best=null;
      for(const site of active){
        if(id&&site.data.id!==id)continue;
        const distance=Math.hypot(x-site.x,z-site.z);
        if(distance<=maxMeters&&(!best||best.distance>distance))best={data:site.data,distance,x:site.x,z:site.z,base:site.base,height:site.mesh.userData.height};
      }
      return best;
    }
    function reserved(x,z,padding=0){
      return active.some(a=>{
        const dx=x-a.x,dz=z-a.z,extra=a.data.id==='cathedral'?8:a.data.id==='turtle'?12:2;
        const u=dx*a.c-dz*a.s,v=dx*a.s+dz*a.c;
        if(a.data.reserve)return a.data.reserve(u,v,padding);
        if(a.data.id==='cathedral'&&Math.abs(u)<16+padding&&v>0&&v<57+padding)return true;
        return Math.abs(u)<a.data.width/2+extra+padding&&Math.abs(v)<a.data.depth/2+extra+padding;
      });
    }
    function contact(x,z,r=.95,y=null){
      for(const a of active){
        if(y!==null&&modeledBridgeLengths[a.data.id]&&y+1.35<a.base)continue;
        const dx=x-a.x,dz=z-a.z,u=dx*a.c-dz*a.s,v=dx*a.s+dz*a.c;
        function solid(cx,cz,w,d){
          const lx=u-cx,lz=v-cz;
          if(Math.abs(lx)>=w+r||Math.abs(lz)>=d+r)return null;
          let nx=lx-Math.max(-w,Math.min(w,lx)),nz=lz-Math.max(-d,Math.min(d,lz)),depth;
          const length=Math.hypot(nx,nz);
          if(length>=r)return null;
          if(length){depth=r-length;nx/=length;nz/=length;}
          else if(w-Math.abs(lx)<d-Math.abs(lz)){depth=r+w-Math.abs(lx);nx=Math.sign(lx)||1;nz=0;}
          else{depth=r+d-Math.abs(lz);nz=Math.sign(lz)||1;nx=0;}
          const wx=nx*a.c+nz*a.s,wz=-nx*a.s+nz*a.c;
          return {nx:wx,nz:wz,pointX:x+wx*(depth-r),pointZ:z+wz*(depth-r),depth,kind:'building',id:a.data.id};
        }
        if(a.data.solids){
          for(const footprint of a.data.solids){const hit=solid(...footprint);if(hit)return hit;}
        }else{const main=solid(0,0,a.data.width/2,a.data.depth/2);if(main)return main;}
        if(a.data.id==='cathedral')for(const rail of churchRails){const hit=solid(...rail);if(hit)return hit;}
      }
      return null;
    }
    function addShoreCover(patch){
      // A pending district may have another render origin. Transform only the
      // cover meshes for this query and restore the visible landmark before yielding.
      for(const site of active){
        const {mesh}=site;
        let covers=shoreCovers.get(mesh);
        if(!covers){
          covers=[];mesh.traverse(part=>{if(part.userData.shoreCover)covers.push(part);});
          shoreCovers.set(mesh,covers);
        }
        if(!covers.length)continue;
        const previous=displayed?.active.find(a=>a.mesh===mesh);
        try{
          site.place();mesh.updateMatrixWorld(true);
          for(const part of covers){
            const cover=part.userData.shoreCover;
            if(cover===true)patch.addCover(part.geometry,part.matrixWorld);
            else for(const [start,end] of cover)patch.addCover(part.geometry,part.matrixWorld,start,end);
          }
        }finally{if(previous){previous.place();mesh.updateMatrixWorld(true);}}
      }
    }
    const view={active,activate,nearest,reserved,contact,addShoreCover,buildingAreas,gardens,modeledBuildings};
    return view;
    }
    function trim(){
      const limit=Math.max(12,displayed.active.length);
      for(const [id,mesh] of cached){
        if(cached.size<=limit)break;
        if(mesh.visible)continue;
        scene.remove(mesh);cached.delete(id);
        const resources=new Set();
        mesh.traverse(obj=>{
          if(obj.geometry)resources.add(obj.geometry);
          if(!obj.material)return;
          for(const m of [].concat(obj.material)){
            resources.add(m);
            for(const v of Object.values(m))if(v?.isTexture&&!v.userData.sightShared)resources.add(v);
          }
        });
        for(const resource of resources)resource.dispose();
      }
    }
    function prepare(...args){
      const steps=prepareSteps(...args);let result;
      do{result=steps.next();}while(!result.done);
      return result.value;
    }
    displayed=prepare(null,0,0);
    return {prepare,prepareSteps,trim,setOrigin(...args){prepare(...args).activate();},weather:finishes.weather,
      nearest:(...args)=>displayed.nearest(...args),reserved:(...args)=>displayed.reserved(...args),
      contact:(...args)=>displayed.contact(...args),addShoreCover:patch=>displayed.addShoreCover(patch),
      get buildingAreas(){return displayed.buildingAreas;},get gardens(){return displayed.gardens;},
      get modeledBuildings(){return displayed.modeledBuildings;}};

  }
  return {entries,create};
})();
