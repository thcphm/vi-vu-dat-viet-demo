/* Interior details use the dimensions and axes of the bundled sedan shell. */
window.buildDriverCabin = function(T, rig, mapCanvas) {
  const cabin=new T.Group();
  cabin.visible=false;
  rig.add(cabin);
  cabin.scale.setScalar(.842);cabin.rotation.y=Math.PI;
  const black=new T.MeshStandardMaterial({color:0x151b1c,metalness:.18,roughness:.58});
  const steel=new T.MeshStandardMaterial({color:0x909a97,metalness:.65,roughness:.28});
  const rubber=new T.MeshStandardMaterial({color:0x242728,metalness:.1,roughness:.76});
  const chrome=new T.MeshStandardMaterial({color:0xd0d5d1,metalness:.4,roughness:.25});
  function bevel(parent,outline,depth,material,radius=.005) {
    const shape=new T.Shape();
    const pts=outline.map(p=>new T.Vector2(...p));
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length],mid=a.clone().lerp(b,.5);
      if(!i){const prev=pts[pts.length-1].clone().lerp(a,.5);shape.moveTo(prev.x,prev.y);}
      shape.quadraticCurveTo(a.x,a.y,mid.x,mid.y);
    }
    shape.closePath();
    const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,curveSegments:4,bevelEnabled:true,bevelSegments:3,bevelSize:radius,bevelThickness:radius}),material);
    parent.add(mesh);return mesh;
  }
  function rounded(parent,w,h,depth,material,radius=.012) {
    const x=w/2,y=h/2,r=radius;
    return bevel(parent,[[-x+r,-y],[x-r,-y],[x,-y],[x,-y+r],[x,y-r],[x,y],[x-r,y],[-x+r,y],[-x,y],[-x,y-r],[-x,-y+r],[-x,-y]],depth,material,.002);
  }
  function panel(parent,w,h,material,x,y,z){
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function canvasTexture(w,h){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    return {ctx:c.getContext('2d'),tex};
  }
  // The dash is a continuous cross-section. Each material owns a band of
  // that section so the veneer, shadow gaps and rolled edges meet exactly.
  let seed=1949;
  function random(){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  }
  const grain=canvasTexture(128,128),noise=grain.ctx.createImageData(128,128);
  for(let i=0;i<noise.data.length;i+=4){
    const value=Math.round(110+random()*130);
    noise.data.set([value,value,value,255],i);
  }
  grain.ctx.putImageData(noise,0,0);grain.tex.colorSpace=T.NoColorSpace;
  grain.tex.wrapS=grain.tex.wrapT=T.RepeatWrapping;grain.tex.repeat.set(12,5);
  const hide=new T.MeshStandardMaterial({color:0x3a3533,roughness:.74,bumpMap:grain.tex,bumpScale:.00032});
  const leather=hide.clone();leather.color.setHex(0x302c2b);leather.roughness=.58;
  const saddle=hide.clone();saddle.color.setHex(0x604335);
  const alloy=new T.MeshStandardMaterial({color:0xbca58b,metalness:.72,roughness:.32});
  const threadMaterial=new T.LineBasicMaterial({color:0x7d6a5c});
  const veneer=canvasTexture(768,96),pixels=veneer.ctx.createImageData(768,96);
  for(let y=0;y<96;y++)for(let x=0;x<768;x++){
    const t=x/768*Math.PI*2;
    const cut=y+.9*Math.sin(t*3+y*.045)+3.6*Math.sin(t+y*.077)+1.7*Math.cos(t*2-y*.12);
    const ray=cut+4*Math.sin(t*2+cut*.16);
    const tone=5*Math.sin(cut*.37)+3*Math.sin(ray*1.75)-11*Math.max(0,Math.sin(ray*.91))**9+5*random();
    pixels.data.set([94+tone,65+tone*.74,45+tone*.53,255],(y*768+x)*4);
  }
  veneer.ctx.putImageData(pixels,0,0);
  veneer.tex.wrapS=T.RepeatWrapping;veneer.tex.anisotropy=4;
  const walnut=new T.MeshStandardMaterial({map:veneer.tex,roughness:.42,metalness:.02});
  const contour=x=>.032*(1-x*x);
  const setback=x=>.038-.16*x*x;
  function swept(profile,material){
    const position=[],uv=[],colors=[],indices=[],count=profile.length;
    for(let i=0;i<=48;i++){
      const x=-1.04+2.08*i/48;
      profile.forEach(([y,z],j)=>{
        position.push(x,y+contour(x),z+setback(x));
        uv.push(i/48,1-j/(count-1));
        const shade=.99-.30*Math.exp(-((x-.37)**2/.05+(z-.31)**2/.03))-.22*Math.max(0,.9-y);
        colors.push(shade,shade,shade);
      });
    }
    for(let i=0;i<48;i++)for(let j=0;j<count-1;j++){
      const a=i*count+j;indices.push(a,a+1,a+count,a+1,a+count+1,a+count);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(position,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    const finish=material.clone();finish.vertexColors=true;cabin.add(new T.Mesh(geo,finish));
  }
  swept([[.10,-1.38],[.10,-.42],[.13,-.05],[.26,.16],[.46,.18],[.55,.17]],rubber);
  swept([[.55,.17],[.68,.135],[.772,.161],[.791,.174]],saddle);
  swept([[.791,.174],[.795,.169],[.802,.172]],alloy);
  swept([[.802,.172],[.814,.166],[.843,.168],[.866,.181],[.871,.187]],walnut);
  swept([[.871,.187],[.874,.187],[.878,.191]],alloy);
  swept([[.878,.191],[.885,.213],[.905,.232],[.917,.226]],black);
  swept([[.917,.226],[.922,.210],[.935,.208],[.957,.235],[.978,.30],[.987,.42],[.98,.61],[.949,.86],[.932,1.04]],hide);
  function pipe(parent,points,radius,material){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const mesh=new T.Mesh(new T.TubeGeometry(curve,20,radius,8,false),material);
    parent.add(mesh);return mesh;
  }
  function stitches(parent,count,point){
    const vertices=[];
    for(let i=0;i<count;i++)vertices.push(...point(i/count),...point((i+.58)/count));
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    parent.add(new T.LineSegments(geo,threadMaterial));
  }
  stitches(cabin,222,f=>{
    const x=(f-.5)*2.06;
    return [x,.978+contour(x),.295+setback(x)];
  });

  // An oval section with a broad upholstered face on the cabin side and
  // a dark rubber reveal on the glass side.
  const lining=new T.MeshStandardMaterial({color:0x645c55,roughness:.96});
  for(const side of [-1,1]){
    const pillar=new T.Group();cabin.add(pillar);
    pillar.position.x=side*.88;
    const path=[[side*.045,.91,.85],[0,1.11,.62],[-side*.082,1.36,.32],[-side*.23,1.83,-.19]];
    const bolster=pipe(pillar,path,.045,lining);bolster.scale.z=1.065;
    pipe(pillar,path.map(([x,y,z])=>[x-side*.040,y,z+.024]),.013,black);
    const door=new T.Group();door.position.set(side*.975,.762,-.16);
    door.rotation.y=-side*Math.PI/2;cabin.add(door);
    rounded(door,1.78,.43,.042,saddle,.045);
    rounded(door,1.78,.09,.065,hide,.034).position.y=.165;
    // The front face has normalized UVs independent of the door's extrusion.
    panel(door,1.70,.051,walnut,0,.074,.047);
    rounded(door,1.71,.005,.003,alloy,.002).position.set(0,.106,.047);
    const pull=bevel(door,[[-.12,.018],[.13,.027],[.093,-.019],[-.12,-.013]],.012,steel,.004);
    pull.position.set(-side*.12,-.021,.054);
  }
  const header=new T.Group();header.position.set(0,1.81,-.23);header.rotation.x=-.36;cabin.add(header);
  rounded(header,1.47,.078,.26,lining,.037);

  const dash=new T.Group();dash.rotation.y=Math.PI;dash.position.set(.37,1.069,.287);cabin.add(dash);
  // Loft a visor from the padded lip back down into the top of the dash.
  const brow=[[-.256,-.071],[-.252,.019],[-.220,.077],[-.153,.099],[.153,.099],[.220,.077],[.252,.019],[.256,-.071]];
  const browVertices=[],browIndices=[];
  for(const [z,sx,sy,dy] of [[.044,1,1,0],[.029,1.015,1.045,0],[-.031,1.01,.99,0],[-.135,.95,.72,-.022],[-.27,.83,.30,-.052]]){
    for(const [x,y] of brow)browVertices.push(x*sx,y*sy+dy,z);
  }
  for(let i=0;i<4;i++)for(let j=0;j<brow.length-1;j++){
    const k=i*brow.length+j;browIndices.push(k,k+1,k+brow.length,k+1,k+1+brow.length,k+brow.length);
  }
  const browGeometry=new T.BufferGeometry();
  browGeometry.setAttribute('position',new T.Float32BufferAttribute(browVertices,3));
  browGeometry.setIndex(browIndices);browGeometry.computeVertexNormals();
  const browSkin=hide.clone();browSkin.side=T.DoubleSide;browSkin.bumpMap=null;
  dash.add(new T.Mesh(browGeometry,browSkin));
  bevel(dash,[...brow,[.190,-.081],[-.190,-.081]],.013,black,.004).position.z=.001;
  const cluster=canvasTexture(896,282);
  panel(dash,.454,.143,new T.MeshBasicMaterial({map:cluster.tex,toneMapped:false}),0,.002,.024);

  // The hub, grips and buttons share one pivot in the tilted wheel plane.
  const wheel=new T.Group();wheel.position.set(.37,.880,.067);wheel.rotation.order='YXZ';
  wheel.rotation.y=Math.PI;wheel.rotation.x=-.32;cabin.add(wheel);
  const controls=new T.Group();wheel.add(controls);
  function grip(angle,sectionAngle){
    const x=Math.cos(angle),y=Math.sin(angle);
    const thumb=Math.exp(-((y-.28)**2)/.035);
    const radius=.177+(.020+.006*thumb)*Math.cos(sectionAngle)-.004*thumb;
    return [x*radius,Math.max(y,-.935)*radius,.048+.022*Math.sin(sectionAngle)];
  }
  const gripVertices=[],gripUV=[],gripIndices=[];
  for(let i=0;i<=112;i++)for(let j=0;j<=16;j++){
    gripVertices.push(...grip(i/112*Math.PI*2,j/16*Math.PI*2));
    gripUV.push(i/112,j/16);
    if(i<112&&j<16){const a=i*17+j;gripIndices.push(a,a+17,a+1,a+1,a+17,a+18);}
  }
  const gripGeo=new T.BufferGeometry();
  gripGeo.setAttribute('position',new T.Float32BufferAttribute(gripVertices,3));
  gripGeo.setAttribute('uv',new T.Float32BufferAttribute(gripUV,2));
  gripGeo.setIndex(gripIndices);gripGeo.computeVertexNormals();
  // Perforations are baked into the grip wrap so they cost one draw call.
  const wrap=canvasTexture(1024,128),wc=wrap.ctx;
  wc.fillStyle='#bdb9b4';wc.fillRect(0,0,1024,128);
  for(let row=0;row<22;row++)for(let col=0;col<172;col++){
    const u=col*6+row%2*3,v=row*6;
    if(Math.abs(Math.sin(u/1024*Math.PI*2))>.70)continue;
    wc.fillStyle='#76706b';wc.beginPath();wc.ellipse(u,v,1.25,1.65,0,0,Math.PI*2);wc.fill();
    wc.fillStyle='#d2cbc2';wc.fillRect(u,v+1.6,1.5,.6);
  }
  const gripFinish=leather.clone();gripFinish.color.setHex(0x514c48);gripFinish.map=wrap.tex;
  controls.add(new T.Mesh(gripGeo,gripFinish));
  stitches(controls,116,f=>grip(f*2*Math.PI,2.30));
  const lower=bevel(controls,[[-.066,-.030],[-.040,-.109],[-.023,-.157],[.023,-.157],[.040,-.109],[.066,-.030],[.036,-.048],[.010,-.123],[-.010,-.123],[-.036,-.048]],.012,alloy,.003);
  lower.position.z=.041;
  for(const side of [-1,1]){
    const spoke=bevel(controls,[[side*.052,.027],[side*.111,.029],[side*.169,.047],[side*.168,.006],[side*.123,-.018],[side*.060,-.043]],.018,steel,.004);
    spoke.position.z=.036;
    const keys=bevel(controls,[[side*.075,.021],[side*.148,.027],[side*.146,.004],[side*.114,-.009],[side*.075,-.015]],.006,black,.002);
    keys.position.z=.055;
    const dial=rounded(controls,.009,.016,.004,alloy,.003);
    dial.position.set(side*.119,.009,.063);
  }
  // Rounded sections roll the airbag cover into the spokes and give its
  // crown continuous normals across the windscreen reflection.
  const padOutline=new T.Shape();
  padOutline.moveTo(0,.064);
  padOutline.bezierCurveTo(.087,.064,.105,.059,.089,-.004);
  padOutline.bezierCurveTo(.077,-.058,.044,-.078,0,-.078);
  padOutline.bezierCurveTo(-.044,-.078,-.077,-.058,-.089,-.004);
  padOutline.bezierCurveTo(-.105,.059,-.087,.064,0,.064);
  const rimPoints=padOutline.getSpacedPoints(48).slice(0,-1);
  const padPositions=[],padUV=[],padFaces=[];
  for(const [scale,z] of [[.77,.037],[.97,.047],[1,.058],[.98,.069],[.91,.079],[.73,.086],[.42,.090],[.01,.092]]){
    for(const p of rimPoints){
      const x=p.x*scale,y=p.y*scale;
      padPositions.push(x,y,z);padUV.push(.5+x,.5+y);
    }
  }
  const count=rimPoints.length;
  for(let i=count;i<padPositions.length/3;i++){
    const next=i-i%count+(i+1)%count;
    padFaces.push(i-count,i,next-count,i,next,next-count);
  }
  const padGeometry=new T.BufferGeometry();
  padGeometry.setAttribute('position',new T.Float32BufferAttribute(padPositions,3));
  padGeometry.setAttribute('uv',new T.Float32BufferAttribute(padUV,2));
  padGeometry.setIndex(padFaces);padGeometry.computeVertexNormals();controls.add(new T.Mesh(padGeometry,leather));
  const emblem=new T.BufferGeometry();
  emblem.setAttribute('position',new T.Float32BufferAttribute([
    -.028,.011,0, -.010,.007,.001, 0,-.009,.003, 0,-.016,0,
    .028,.011,0, .010,.007,.001
  ],3));
  emblem.setIndex([0,3,2,0,2,1,2,3,4,5,2,4]);emblem.computeVertexNormals();
  const badge=new T.Mesh(emblem,chrome);badge.position.set(0,.010,.093);controls.add(badge);
  const lettering=canvasTexture(256,40);
  lettering.ctx.textAlign='center';lettering.ctx.fillStyle='#a79e94';lettering.ctx.font='500 22px sans-serif';
  lettering.ctx.fillText('S R S   A I R B A G',128,28);
  panel(controls,.045,.007,new T.MeshBasicMaterial({map:lettering.tex,transparent:true,depthWrite:false}),0,-.044,.090);
  // Stalks are fixed to the column behind the rotating rim.
  for(const side of [-1,1]){
    pipe(wheel,[[side*.055,-.017,-.026],[side*.12,-.009,-.033],[side*.171,.002,-.049]],.007,rubber);
    rounded(wheel,.046,.015,.012,black,.006).position.set(side*.171,.002,-.049);
  }
  const center=new T.Group();center.rotation.order='YXZ';center.rotation.y=Math.PI-.11;
  center.rotation.x=-.24;center.position.set(-.094,1.008,.220);cabin.add(center);
  rounded(center,.361,.161,.030,steel,.014).position.z=-.028;
  rounded(center,.357,.158,.013,black,.012);
  const nav=canvasTexture(480,224),n=nav.ctx;
  const mapScreen=panel(center,.333,.140,new T.MeshBasicMaterial({map:nav.tex,toneMapped:false}),0,0,.016);
  const consoleFace=new T.Group();consoleFace.position.set(-.095,.732,.107);
  consoleFace.rotation.order='YXZ';consoleFace.rotation.y=Math.PI;consoleFace.rotation.x=-.43;cabin.add(consoleFace);
  const surround=[[-.18,.064],[.18,.064],[.177,.018],[.135,-.135],[.094,-.178],[-.094,-.178],[-.135,-.135],[-.177,.018]];
  bevel(consoleFace,surround,.036,leather,.012);
  rounded(consoleFace,.311,.072,.008,alloy,.017).position.set(0,.004,.044);
  rounded(consoleFace,.305,.066,.009,black,.014).position.set(0,.004,.052);
  // Lathed control faces with a machined, fluted circumference.
  for(const x of [-.112,.112]){
    const dial=new T.Group();dial.position.set(x,.004,.062);consoleFace.add(dial);
    const knurl=new T.CylinderGeometry(.026,.026,.018,80,1);
    const pos=knurl.attributes.position;
    for(let i=0;i<pos.count;i++){
      const a=Math.atan2(pos.getX(i),pos.getZ(i)),r=1-.045*(1-Math.cos(40*a));
      pos.setX(i,pos.getX(i)*r);pos.setZ(i,pos.getZ(i)*r);
    }
    const knob=new T.Mesh(knurl,steel);knob.rotation.x=Math.PI/2;dial.add(knob);
    const cap=new T.Mesh(new T.CircleGeometry(.022,40),rubber);cap.position.z=.0095;dial.add(cap);
    panel(dial,.002,.007,alloy,0,.014,.010);
  }
  const switches=canvasTexture(384,96),sc=switches.ctx;
  sc.strokeStyle='#aeb4b0';sc.fillStyle='#c2c6c5';sc.lineWidth=4;sc.lineJoin='round';sc.lineCap='round';
  sc.beginPath();sc.moveTo(160,68);sc.lineTo(191,20);sc.lineTo(222,68);sc.closePath();sc.strokeStyle='#d4836a';sc.stroke();
  sc.textAlign='center';sc.font='500 34px sans-serif';sc.fillText('A/C',66,60);
  sc.strokeStyle='#b7bcb8';sc.beginPath();sc.moveTo(279,38);sc.quadraticCurveTo(306,22,339,38);sc.lineTo(330,63);sc.lineTo(289,63);sc.closePath();sc.stroke();
  for(let x=299;x<=319;x+=10){sc.beginPath();sc.moveTo(x,56);sc.bezierCurveTo(x-6,50,x+5,46,x,40);sc.stroke();}
  panel(consoleFace,.143,.035,new T.MeshBasicMaterial({map:switches.tex,transparent:true,depthWrite:false}),0,.005,.064);
  rounded(consoleFace,.167,.017,.004,black,.008).position.set(0,-.068,.041);
  const tunnel=new T.Group();tunnel.position.set(-.095,.40,-.24);tunnel.rotation.order='YXZ';
  tunnel.rotation.y=Math.PI;tunnel.rotation.x=-1.25;cabin.add(tunnel);
  rounded(tunnel,.305,.76,.060,leather,.048);
  rounded(tunnel,.238,.57,.008,black,.027).position.z=.064;
  const selector=new T.Mesh(new T.CylinderGeometry(.045,.049,.035,40),alloy);
  selector.rotation.x=Math.PI/2;selector.position.set(0,.106,.083);tunnel.add(selector);
  const selectorCap=new T.Mesh(new T.CircleGeometry(.041,40),rubber);
  selectorCap.position.set(0,.106,.101);tunnel.add(selectorCap);
  let mapDirty=true;
  function navigation(distance,course){
    if(!mapDirty)return;
    mapDirty=false;
    const w=n.canvas.width,h=n.canvas.height,mapHeight=course?h-40:h;
    const scale=Math.min(w/mapCanvas.width,mapHeight/mapCanvas.height);
    const width=mapCanvas.width*scale,height=mapCanvas.height*scale;
    n.fillStyle='#162825';n.fillRect(0,0,w,h);
    n.drawImage(mapCanvas,(w-width)/2,(mapHeight-height)/2,width,height);
    if(course){
      n.fillStyle='#0d191d';n.fillRect(0,mapHeight,w,40);
      n.font='600 23px sans-serif';n.textAlign='right';n.fillStyle='#afdecc';
      const remaining=Math.max(0,Math.round(course.finish-distance))+' m';
      n.fillText(remaining,w-10,h-11);
      n.textAlign='left';n.fillStyle='#e2f3ee';
      n.fillText(course.name,10,h-11,w-n.measureText(remaining).width-32);
    }
    nav.tex.needsUpdate=true;
  }
  const ventBlade=new T.MeshStandardMaterial({color:0x595652,roughness:.42,metalness:.46});
  for(const [x,width] of [[.78,.19],[-.13,.30],[-.76,.27]]){
    const vent=new T.Group();vent.position.set(x,.899+contour(x),.211+setback(x));
    vent.rotation.y=Math.PI+Math.atan(.32*x);cabin.add(vent);
    rounded(vent,width,.031,.007,black,.008);
    for(const y of [-.006,.006])rounded(vent,width-.016,.0024,.003,ventBlade,.001).position.set(0,y,.009);
    rounded(vent,.025,.007,.006,alloy,.002).position.set(width*.18,0,.010);
  }
  const grille=canvasTexture(256,48),gc=grille.ctx;
  gc.fillStyle='#353332';gc.beginPath();gc.roundRect(1,1,254,46,22);gc.fill();
  gc.clip();gc.fillStyle='#141519';
  for(let row=0;row<8;row++)for(let col=0;col<43;col++){
    gc.beginPath();gc.arc(col*6+row%2*3,row*6,1.8,0,Math.PI*2);gc.fill();
  }
  const speakerMaterial=new T.MeshStandardMaterial({map:grille.tex,transparent:true,roughness:.78,depthWrite:false});
  for(const x of [-.71,.71]){
    const speaker=panel(cabin,.29,.053,speakerMaterial,x,.975+contour(x),.668+setback(x));
    speaker.rotation.x=-Math.PI/2+.12;speaker.rotation.z=x*.18;
  }
  // The mirror samples the actual rear roadway into a small target on a separate cadence.
  const mirror=new T.Group();mirror.position.set(.015,1.58,.30);mirror.rotation.y=Math.PI-.12;cabin.add(mirror);
  pipe(mirror,[[0,.019,-.012],[0,.045,-.065],[0,.097,-.104]],.013,black);
  const mountPad=rounded(mirror,.069,.061,.022,black,.020);mountPad.rotation.x=-.75;mountPad.position.set(0,.104,-.11);
  rounded(mirror,.270,.083,.012,rubber,.014);
  const target=new T.WebGLRenderTarget(256,80,{generateMipmaps:false,minFilter:T.LinearFilter});
  target.texture.repeat.x=-1;target.texture.offset.x=1;
  panel(mirror,.253,.067,new T.MeshBasicMaterial({map:target.texture,toneMapped:false}),0,0,.016);
  // Sample a wider view outboard of the left door for lane changes.
  const sideTarget=new T.WebGLRenderTarget(144,72,{generateMipmaps:false,minFilter:T.LinearFilter});
  sideTarget.texture.repeat.x=-1;sideTarget.texture.offset.x=1;
  const sideMirror=new T.Group();sideMirror.position.set(.986,1.050,.69);sideMirror.rotation.y=Math.PI+.27;cabin.add(sideMirror);
  const mount=rounded(sideMirror,.12,.045,.046,black);mount.position.set(.092,-.049,-.035);
  rounded(sideMirror,.21,.105,.026,black,.026);
  panel(sideMirror,.194,.087,new T.MeshBasicMaterial({map:sideTarget.texture,toneMapped:false}),0,0,.032);
  const rearCamera=new T.PerspectiveCamera(27,256/80,.2,620);
  const wingCamera=new T.PerspectiveCamera(38,2,.2,620);
  // Cache the fixed dial faces. Changing a displayed reading only repaints
  // the two hands and the speed and gear readouts.
  const dialFace=document.createElement('canvas');
  dialFace.width=cluster.ctx.canvas.width;dialFace.height=cluster.ctx.canvas.height;
  const face=dialFace.getContext('2d'),cy=143,dialRadius=112;
  const speedCenter=167,secondCenter=729,startAngle=Math.PI*.75,sweepAngle=Math.PI*1.5;
  function circle(ctx,x,y,r,fill){
    ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  function dialPoint(x,angle,r){return [x+r*Math.cos(angle),cy+r*Math.sin(angle)];}
  function tick(ctx,x,angle,length,color,width){
    ctx.beginPath();ctx.moveTo(...dialPoint(x,angle,102));ctx.lineTo(...dialPoint(x,angle,102-length));
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  const glass=face.createLinearGradient(0,0,0,282);
  glass.addColorStop(0,'#282c30');glass.addColorStop(.34,'#14191c');glass.addColorStop(1,'#090c0f');
  face.fillStyle=glass;face.fillRect(0,0,896,282);
  const bezel=face.createLinearGradient(0,30,0,252);
  bezel.addColorStop(0,'#e1d3bd');bezel.addColorStop(.23,'#706a61');bezel.addColorStop(.64,'#24272a');bezel.addColorStop(1,'#aa9e89');
  face.textAlign='center';face.textBaseline='middle';
  for(const x of [speedCenter,secondCenter]){
    circle(face,x,cy,dialRadius+4,'#050709');circle(face,x,cy,dialRadius,bezel);
    const enamel=face.createRadialGradient(x,cy-22,4,x,cy,dialRadius);
    enamel.addColorStop(0,'#343b3e');enamel.addColorStop(.78,'#1a2024');enamel.addColorStop(1,'#080c0f');
    circle(face,x,cy,dialRadius-4,enamel);
  }
  for(let i=0;i<=44;i++){
    const angle=startAngle+sweepAngle*i/44,major=i%4===0;
    tick(face,speedCenter,angle,major?13:6,major?'#ebdfcb':'#837f77',major?3:2);
    if(major){
      face.font='600 18px sans-serif';face.fillStyle='#ece6db';
      face.fillText(i*5,...dialPoint(speedCenter,angle,73));
    }
  }
  face.font='16px sans-serif';face.fillStyle='#c5b69e';face.fillText('km/h',speedCenter,204);
  const revFace=dialFace.cloneNode(),rev=revFace.getContext('2d');
  rev.drawImage(dialFace,0,0);rev.textAlign='center';rev.textBaseline='middle';
  for(let i=0;i<=28;i++){
    const angle=startAngle+sweepAngle*i/28,major=i%4===0;
    tick(rev,secondCenter,angle,major?13:6,i>=24?'#df876e':'#d6c8ae',major?3:2);
    if(major){
      rev.font='600 21px sans-serif';rev.fillStyle='#ece6db';
      rev.fillText(i/4,...dialPoint(secondCenter,angle,73));
    }
  }
  rev.font='16px sans-serif';rev.fillStyle='#c5b69e';rev.fillText('×1000 rpm',secondCenter,204);
  const batteryFace=dialFace.cloneNode(),battery=batteryFace.getContext('2d');
  battery.drawImage(dialFace,0,0);battery.textAlign='center';battery.textBaseline='middle';
  battery.font='600 18px sans-serif';
  for(let percent=0;percent<=100;percent+=5){
    const angle=startAngle+sweepAngle*percent/100,major=percent%25===0;
    tick(battery,secondCenter,angle,major?13:6,percent<=10?'#f4ad6b':'#85ccbc',major?3:2);
    if(major){battery.fillStyle='#d6f4eb';battery.fillText(percent,...dialPoint(secondCenter,angle,73));}
  }
  battery.font='16px sans-serif';battery.fillStyle='#a4ddce';battery.fillText('PIN %',secondCenter,204);
  for(let i=0;i<48;i++)tick(face,secondCenter,i*Math.PI/24,i%4===0?12:5,i%4===0?'#d6c8ae':'#767a78',2);
  ['N','E','S','W'].forEach((label,i)=>{
    face.font='600 23px sans-serif';face.fillStyle=i?'#dbd5cd':'#efbd83';
    face.fillText(label,...dialPoint(secondCenter,(i-1)*Math.PI/2,73));
  });
  function hand(ctx,x,angle,length,color,width){
    ctx.save();ctx.translate(x,cy);ctx.rotate(angle);
    ctx.beginPath();ctx.moveTo(-12,-width*.6);ctx.lineTo(length,-1.2);ctx.lineTo(length,1.2);ctx.lineTo(-12,width);ctx.closePath();
    ctx.fillStyle=color;ctx.fill();ctx.restore();
    circle(ctx,x,cy,8,'#a59c8f');circle(ctx,x,cy,5,'#302f30');
  }
  let lastMirror=-Infinity,previousSpeed=-1,previousGear,previousAngle,previousFace,renderWing=false,preparedEnvironment;
  let electric=false, widthScale=1, previousEnergy;
  // Long-wheelbase and cab-over vehicles place the driver forward of the chassis centre.
  const forward={apex:0,terra:.18,atlas:.54,minivan:.78,limo:1.48,bus:4.06,truck:2.24,
    vf3:.08,vf5:.14,vf7:.22,vf8:.25,vf9:.38};
  const mirrorOrientation=new T.Quaternion();
  function instruments(speed,selectedGear,energy){
    const value=Math.round(Math.abs(speed)),gear=selectedGear??(speed<-.35?'R':'D');
    const rpm=window.driveAudio?.engineRpm??null;
    const level=Number.isFinite(energy)?Math.round(T.MathUtils.clamp(energy,0,100)):null;
    const usesBattery=electric&&level!==null;
    const background=usesBattery?batteryFace:rpm===null?dialFace:revFace;
    const angle=usesBattery?startAngle+sweepAngle*level/100:rpm===null?T.MathUtils.degToRad(Math.round(-T.MathUtils.radToDeg(rig.rotation.y))-90)
      :startAngle+sweepAngle*Math.min(1,Math.round(rpm/50)/140);
    if(value===previousSpeed&&gear===previousGear&&angle===previousAngle&&background===previousFace&&level===previousEnergy)return;
    previousSpeed=value;previousGear=gear;previousAngle=angle;previousFace=background;previousEnergy=level;
    const c=cluster.ctx;c.drawImage(background,0,0);
    hand(c,speedCenter,startAngle+sweepAngle*Math.min(value/220,1),96,'#e9ae78',5);
    if(background===dialFace)hand(c,secondCenter,angle+Math.PI,62,'#707d85',6);
    hand(c,secondCenter,angle,background===dialFace?65:96,usesBattery?'#85e1bd':'#efbd83',5);
    c.textAlign='center';c.fillStyle='#f6f2e9';c.font='500 92px sans-serif';c.fillText(value,432,132);
    c.fillStyle='#c3beb2';c.font='23px sans-serif';c.fillText('km/h',432,163);
    c.fillStyle='#303335';c.beginPath();c.roundRect(531,77,48,44,9);c.fill();
    c.font='600 32px sans-serif';c.fillStyle='#ead8b6';c.fillText(gear,555,111);
    if(level!==null){
      c.fillStyle=level<=10?'#ffb26d':'#d2e7d7';c.font='600 24px sans-serif';
      c.fillText((electric?'PIN  ':'NHIÊN LIỆU  ')+level+'%',432,216);
    }
    cluster.tex.needsUpdate=true;
  }
  return {
    mapScreen,interior:cabin,
    setVehicle(id,spec,lift=0){
      widthScale=T.MathUtils.clamp((spec.width||1.80)/1.80,.90,1.38);
      electric=Boolean(spec.electric);
      cabin.scale.x=.842*widthScale;
      cabin.position.set(0,lift,-(forward[id]||0));
    },
    driverEye(eye,look,aspect,aimHeight=.46){
      const inset=this.seatInset(aspect),x=(-.31+inset*.72)*widthScale;
      eye.set(x,1.10,.58+inset*2.35).add(cabin.position);
      look.set(x,aimHeight,-13).add(cabin.position);
    },
    refreshMap(){mapDirty=true;},
    // On narrow screens, sit a little farther back to keep the wheel and console in view.
    seatInset(aspect){return T.MathUtils.clamp((1-aspect)*.40,0,.24);},
    prepare(renderer,scene,camera){
      if(!scene.environment||preparedEnvironment===scene.environment)return;
      preparedEnvironment=scene.environment;
      if(!renderer.extensions.has('KHR_parallel_shader_compile'))return;
      // The display and the linear mirror texture use different shader programs.
      // Submit both batches while the starting scene is visible, before a mirror
      // draw has to wait for the driver to link each material in turn.
      renderer.compile(scene,camera);
      const previous=renderer.getRenderTarget();
      try{
        renderer.setRenderTarget(target);
        renderer.compile(scene,rearCamera);
      }finally{renderer.setRenderTarget(previous);}
    },
    update(interior,speed,steering,distance,course,selectedGear,energy){
      if(cabin.visible!==interior)document.body.toggleAttribute('data-dashboard-map',interior);
      cabin.visible=interior;

      if(interior){
        controls.rotation.z=-steering*1.25;
        instruments(speed,selectedGear,energy);
        navigation(distance,course);
      }
    },
    reflectMounted(renderer,scene,interval){
      this.reflect(renderer,scene,cabin,0,0,interval,true);
    },
    reflect(renderer,scene,player,distance,lateral,interval=90,mounted=false){
      const now=performance.now();if(now-lastMirror<interval)return;lastMirror=now;
      const cam=renderWing?wingCamera:rearCamera;
      if(renderWing){
        cam.position.set(lateral-1.02,1.13,2-distance);cam.lookAt(lateral-5.6,.97,25-distance);
      }else{
        cam.position.set(lateral,1.23,4.46-distance);cam.lookAt(lateral,1.08,45-distance);
      }
      if(mounted){
        cam.position.x*=widthScale;cam.position.z-=2.13;
        rig.localToWorld(cam.position.add(cabin.position));
        cam.quaternion.premultiply(rig.getWorldQuaternion(mirrorOrientation));
      }
      const previous=renderer.getRenderTarget(),visible=player.visible;
      try{
        player.visible=false;renderer.setRenderTarget(renderWing?sideTarget:target);renderer.render(scene,cam);
        renderWing=!renderWing;
      }finally{renderer.setRenderTarget(previous);player.visible=visible;}
    }
  };
};
