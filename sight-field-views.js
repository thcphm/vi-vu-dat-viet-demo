'use strict';
// Open the publisher's interactive capture on demand. The local Mỹ Sơn
// photogrammetry uses the existing glTF loader and needs no third-party viewer.
function createSightFieldViews(onVisit){
  const el=id=>document.getElementById(id),dialog=el('fieldDialog'),stage=el('fieldStage');
  const button=el('fieldView'),plan=el('sitePlan'),caption=el('fieldCaption'),source=el('fieldSource');
  const national='https://images.vietnam.travel/360Tour/';
  const tours=[
    ['HoiAn','Phố cổ Hội An',['pho-co-hoi-an','nha-co-tan-ky','chua-cau']],
    ['Hue','Di tích Cố đô Huế',['di-tich-co-do-hue','ngo-mon','lang-minh-mang']],
    ['PhongNha','Phong Nha – Kẻ Bàng',['phong-nha-ke-bang','phong-nha']],
    ['HaLong','Vịnh Hạ Long',['vinh-ha-long-cat-ba','hon-trong-mai']],
    ['NinhBinh','Danh thắng Ninh Bình',['quan-the-trang-an','ben-thuyen-trang-an']],
    ['DaNang','Đà Nẵng',['cau-rong','chua-tam-thai-ngu-hanh-son']],
    ['NhaTrang2021','Nha Trang',['ponagar']],
    ['DaLat2021','Đà Lạt',['station']],
    ['HaNoi','Hà Nội',['turtle']]
  ];
  const scans={
    'my-son':[
      ['Phế tích Mỹ Sơn','my-son','Robert Szymaniuk','833564ab7c2540b9be6ecefb8bfc2a8a'],
      ['Tháp G4 trước trùng tu · 2019','my-son-g4','Computer Vision and Reverse Engineering Lab','518acfd077b14520bd126dee56cd2dbf']
    ],
    'osm-way-178995262':[['Bên trong đền Ngọc Sơn · 2017','den-ngoc-son','Adam Cigler','cb5b4f68f93b41cf94a6d8e0d2c896a4']]
  };
  const [ruins,g4]=scans['my-son'];
  scans['my-son-nhom-g']=[g4,ruins];
  const cyark={
    'cung-an-dinh':[['Cung An Định','fd6df65eae404a7dbf006f68e7857a2e']],
    'lang-tu-duc':[['Điện Hòa Khiêm','ed319997b5354c1eb9b8dbf810044295'],['Bi đình · từ mặt đất','55b9ce7e35524473bbbe7620102a3811'],['Bi đình · từ trên cao','7194d6083f0142dcb7a047a0082a5d71']]
  };
  let views=[],currentId,dispose=null,generation=0;
  function release(){
    generation++;dispose?.();dispose=null;
    stage.replaceChildren();caption.replaceChildren();
  }
  function select(data,collection){
    const survey=window.VanMieuSurvey,ids=[data.id,collection?.id];
    currentId=data.id;
    plan.hidden=!ids.some(id=>survey.panoramaNodes.has(id));
    views=[];
    const scan=scans[data.id]||scans[data.catalogId]||scans[collection?.id];
    for(const [name,file,author,uid] of scan||[]){
      views.push({name,file:'landmark-scans/'+file+'.glb',credit:author+' · CC BY 4.0',source:'https://sketchfab.com/3d-models/'+uid});
    }
    for(const [name,key] of cyark[data.id]||[])views.push({name,url:'https://sketchfab.com/models/'+key+'/embed',credit:'CyArk · Trung tâm Bảo tồn Di tích Cố đô Huế',source:'https://sketchfab.com/3d-models/'+key});
    for(const v of window.NatureFieldCaptures?.[data.id]||window.NatureFieldCaptures?.[data.catalogId]||[])views.push(v);
    if(!plan.hidden){
      const node=survey.panoramaNodes.get(data.id);
      const url='https://vr360.com.vn/projects/van-mieu-quoc-tu-giam/'+(node?'#node'+node:'');
      views.push({name:node?data.name:'Văn Miếu – Quốc Tử Giám',url,credit:'Ảnh toàn cảnh · VR360',source:url});
    }else{
      const tour=tours.find(([, ,stops])=>ids.some(id=>stops.includes(id)));
      if(tour&&!views.length){
        const url=national+tour[0]+'/index.htm';
        views.push({name:tour[1],url,credit:'Ảnh toàn cảnh · Cục Du lịch Quốc gia Việt Nam',source:url});
      }
    }
    button.hidden=!views.length;
    button.textContent=scan||cyark[data.id]?'Xem bản quét 3D':'Xem cảnh thực 360°';
  }
  function open(title,credit,url){
    release();el('fieldTitle').textContent=title;caption.textContent=credit;source.href=url;
    if(!dialog.open)dialog.showModal();
  }
  async function display(index){
    const v=views[index];open(v.name,[v.credit,v.scope].filter(Boolean).join(' · '),v.source);const token=generation;
    if(v.file){
      const credit=document.createElement('a');credit.href='landmark-scans/CREDITS.txt';credit.target='_blank';credit.rel='noopener';
      credit.textContent='Ghi công bản quét';caption.append(' · ',credit);
    }
    if(views.length>1){
      const select=document.createElement('select');select.setAttribute('aria-label','Chọn cảnh thực địa');
      select.replaceChildren(...views.map((v,i)=>new Option(v.name,i)));select.value=String(index);
      select.onchange=()=>display(Number(select.value));caption.append(' · ',select);
    }
    if(!v.file){
      if(!v.url){
        const link=document.createElement('a');link.href=v.source;link.target='_blank';link.rel='noopener';
        link.textContent='Mở '+v.name;stage.append(link);return;
      }
      const frame=document.createElement('iframe');frame.title=v.name;frame.allowFullscreen=true;
      frame.allow='fullscreen; encrypted-media; gyroscope; accelerometer';frame.src=v.url;stage.append(frame);return;
    }
    const status=document.createElement('p');status.textContent='Đang tải bản quét…';stage.append(status);
    let renderer;
    try{
      const T=window.THREE,gltf=await window.TrafficModels.load.loadAsync(v.file),object=gltf.scene;
      object.traverse(c=>{if(c.isPoints){
        c.material.sizeAttenuation=false;c.material.size=1.8;
        c.material.onBeforeCompile=shader=>{
          shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>',
            '#include <fog_vertex>\n gl_PointSize=clamp(gl_PointSize,1.2,7.0);');
          shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',
            '#include <clipping_planes_fragment>\n if(dot(gl_PointCoord-0.5,gl_PointCoord-0.5)>.25)discard;');
        };
      }});
      function freeModel(){
        const textures=new Set(),materials=new Set(),geometries=new Set();
        object.traverse(child=>{if(!child.geometry)return;geometries.add(child.geometry);
          for(const m of [].concat(child.material))materials.add(m);});
        for(const m of materials){for(const t of Object.values(m))if(t?.isTexture)textures.add(t);m.dispose();}
        for(const t of textures){t.dispose();t.source?.data?.close?.();}
        for(const g of geometries)g.dispose();
      }
      if(token!==generation){freeModel();return;}
      dispose=freeModel;
      renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
      const scene=new T.Scene();scene.background=new T.Color(0x1d2d29);
      scene.add(object,new T.HemisphereLight(0xffffff,0xe3cfad,2));
      const sun=new T.DirectionalLight(0xfff3df,1.1);sun.position.set(2,5,3);scene.add(sun);
      const box=new T.Box3().setFromObject(object),center=box.getCenter(new T.Vector3()),initialCenter=center.clone();
      const radius=box.getBoundingSphere(new T.Sphere()).radius;
      const camera=new T.PerspectiveCamera(41,1,radius*.008,radius*18);
      const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Xoay bản quét bằng phím mũi tên hoặc kéo tay');
      stage.replaceChildren(canvas);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
      const pointCloud=v.file.endsWith('/den-ngoc-son.glb'),startZoom=pointCloud ? .59 : .76;
      const eye=box.getSize(new T.Vector3()).multiply(new T.Vector3(.49,.19,.76)).add(box.min);
      let yaw=.96,pitch=.48,zoom=startZoom,inside=false;
      const pointers=new Map();
      function render(){
        if(!canvas.clientWidth||!canvas.clientHeight)return;
        camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.fov=inside?Math.max(38,Math.min(83,zoom*69)):41;
        camera.near=radius*(inside ? .018 : .008);camera.updateProjectionMatrix();
        const angle=Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect));
        const distance=radius/Math.sin(angle)*zoom;
        const axis=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
        if(inside){camera.position.copy(eye);camera.lookAt(eye.clone().sub(axis));}
        else{camera.position.copy(center).addScaledVector(axis,distance);camera.lookAt(center);}
        renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);renderer.render(scene,camera);
      }
      function move(dx,dy,factor=1){yaw+=dx;pitch=Math.max(-1.28,Math.min(1.45,pitch+dy));zoom=Math.max(.35,Math.min(2.4,zoom*factor));render();}
      function pan(dx,dy){
        if(inside)return;
        const scale=2*camera.position.distanceTo(center)*Math.tan(camera.fov*Math.PI/360)/canvas.clientHeight;
        center.addScaledVector(new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),-dx*scale);
        center.addScaledVector(new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),dy*scale);
      }
      canvas.oncontextmenu=e=>e.preventDefault();
      canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);};
      canvas.onpointermove=e=>{
        const p=pointers.get(e.pointerId);if(!p)return;
        const dx=e.clientX-p[0],dy=e.clientY-p[1];
        if(pointers.size===2){
          const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];
          const prev=Math.hypot(p[0]-other[0],p[1]-other[1]),next=Math.hypot(e.clientX-other[0],e.clientY-other[1]);
          pan(dx*.5,dy*.5);move(0,0,Math.max(1,prev)/Math.max(1,next));
        }else if(e.buttons===2||e.shiftKey){pan(dx,dy);render();}
        else move(-dx*.009,dy*.008);
        pointers.set(e.pointerId,[e.clientX,e.clientY]);
      };
      canvas.onlostpointercapture=e=>pointers.delete(e.pointerId);
      canvas.onwheel=e=>{e.preventDefault();move(0,0,e.deltaY>0?1.1:.91);};
      canvas.onkeydown=e=>{
        const m={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,.1],ArrowDown:[0,-.1],'+':[0,0,.88],'-':[0,0,1.14]}[e.key];
        if(m){e.preventDefault();move(...m);}
      };
      const controls=document.createElement('div');controls.className='scanZoom';
      function pointSize(){
        if(pointCloud)object.traverse(c=>{if(c.isPoints){
          c.material.sizeAttenuation=inside;c.material.size=inside?radius*.0024:1.8;c.material.needsUpdate=true;
        }});
      }
      if(pointCloud){
        const enter=document.createElement('button');enter.type='button';enter.textContent='Trong điện';
        enter.onclick=()=>{inside=true;yaw=.08;pitch=-.12;zoom=1;pointSize();render();};controls.append(enter);
      }
      for(const [label,factor] of [['Phóng to',.8],['Thu nhỏ',1.25]]){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>move(0,0,factor);controls.append(b);
      }
      const reset=document.createElement('button');reset.type='button';reset.textContent='Toàn cảnh';
      reset.onclick=()=>{inside=false;pointSize();center.copy(initialCenter);yaw=.96;pitch=.48;zoom=startZoom;render();};controls.append(reset);
      stage.append(controls);const observer=new ResizeObserver(render);observer.observe(canvas);
      dispose=()=>{observer.disconnect();freeModel();renderer.dispose();renderer.forceContextLoss();};render();
    }catch{
      if(token===generation){release();stage.textContent='Chưa mở được bản quét trên thiết bị này. Bạn có thể xem ở nguồn tư liệu.';}
    }
  }
  function showPlan(){
    const survey=window.VanMieuSurvey;
    open('Văn Miếu – Quốc Tử Giám','Mặt bằng theo OpenStreetMap · Chọn công trình để ngắm','https://vanmieu.gov.vn/vi/introduction/visitor-information');
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    const g=document.createElementNS(ns,'g');svg.append(g);svg.setAttribute('aria-label','Mặt bằng Văn Miếu, phía bắc ở trên');
    const treeInfo=document.createElement('output');treeInfo.setAttribute('aria-live','polite');
    const [lon,lat]=survey.origin,mx=111320*Math.cos(lat*Math.PI/180);
    const paint={grounds:'#e8dec1',garden:'#c3d8a5',grass:'#a1bd87',courtyard:'#d6bba0',path:'#a99886',water:'#78afaf',well:'#579997',island:'#bcd095',wall:'#8f796d',tree:'#547e52'};
    const order=['grounds','garden','grass','courtyard','water','island','well','path','wall'];
    const features=[...survey.features].sort((a,b)=>(order.includes(a.kind)?order.indexOf(a.kind):10)-(order.includes(b.kind)?order.indexOf(b.kind):10));
    for(const feature of features){
      const {kind,rings}=feature;
      const coords=rings.map(r=>r.map(([x,y])=>[(x-lon)*mx,(lat-y)*110900]));
      const point=coords[0].length===1,shape=document.createElementNS(ns,point?'circle':'path');
      if(point){shape.setAttribute('cx',coords[0][0][0]);shape.setAttribute('cy',coords[0][0][1]);shape.setAttribute('r',kind==='tree'?'2.1':'3.2');}
      else{
        const line=['wall','path'].includes(kind);
        shape.setAttribute('d',coords.map(r=>'M'+r.map(p=>p.join(',')).join('L')+(line?'':'Z')).join(''));
        shape.setAttribute('stroke',line?paint[kind]:'#887964');shape.setAttribute('stroke-width',line?'1.1':'.48');
        shape.setAttribute('fill-rule','evenodd');
      }
      const id=survey.refStops.get(feature.ref);
      shape.setAttribute('fill',kind==='path'||kind==='wall'?'none':id===currentId?'#e67c47':paint[kind]||'#aa7458');
      if(id){shape.style.cursor='pointer';shape.onclick=()=>{dialog.close();onVisit(id);};}
      let title=survey.stopName(feature);
      if(kind==='tree'&&feature.species){
        const species=feature.species.replace(/^vi:/,'').replace(/ \(thực vật\)$/,'');
        title=[species,feature.height?'cao '+feature.height+' m':''].filter(Boolean).join(' · ');
        shape.style.cursor='help';shape.onclick=()=>{treeInfo.textContent=title;};
      }
      if(title){const t=document.createElementNS(ns,'title');t.textContent=title;shape.append(t);}
      g.append(shape);
    }
    const opts=document.createElement('select');opts.setAttribute('aria-label','Ngắm công trình');
    opts.add(new Option('Chọn công trình…',''));
    for(const [ref,id] of survey.refStops){
      if([...opts.options].some(o=>o.value===id))continue;
      opts.add(new Option(survey.stopName(survey.byRef.get(ref)),id));
    }
    opts.onchange=()=>{if(opts.value){dialog.close();onVisit(opts.value);}};
    caption.append(' ',opts,' ',treeInfo);stage.append(svg);
    const b=g.getBBox();
    const labels=[
      ['w702241326','Nhà Thái Học',1],['w702185190','Điện Đại Thành',1],['w702185157','Vườn bia',1],
      ['w37934144','Giếng Thiên Quang',-1],['w702185155','Khuê Văn Các',1],['w702185144','Đại Trung Môn',1],
      ['w1582901993','Vườn Giám',-1],['w702185143','Văn Miếu Môn',1],['r2388849','Hồ Văn',1]
    ];
    for(const [ref,label,side] of labels){
      const ring=survey.byRef.get(ref).rings[0],xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
      const x=((Math.min(...xs)+Math.max(...xs))/2-lon)*mx,y=(lat-(Math.min(...ys)+Math.max(...ys))/2)*110900;
      const end=side>0?b.x+b.width+6:b.x-6;
      const line=document.createElementNS(ns,'path');
      line.setAttribute('d','M'+x+','+y+' H'+end);line.setAttribute('stroke','#705f4c');line.setAttribute('stroke-width','.8');
      line.style.pointerEvents='none';svg.append(line);
      const t=document.createElementNS(ns,'text');t.textContent=label;t.setAttribute('x',end+2*side);t.setAttribute('y',y+2);
      t.setAttribute('text-anchor',side>0?'start':'end');t.setAttribute('font-size','7.7');t.setAttribute('fill','#33413a');
      t.style.cursor='pointer';t.onclick=()=>{dialog.close();onVisit(survey.refStops.get(ref));};svg.append(t);
    }
    const extent=svg.getBBox(),width=extent.width+8,height=extent.height+16;
    const homeX=extent.x+extent.width/2,homeY=extent.y+extent.height/2;
    let scale=1,cx=homeX,cy=homeY,drag=null,moved=false;
    function position(){
      const w=width/scale,h=height/scale;
      cx=Math.min(homeX+(width-w)/2,Math.max(homeX-(width-w)/2,cx));
      cy=Math.min(homeY+(height-h)/2,Math.max(homeY-(height-h)/2,cy));
      svg.setAttribute('viewBox',[cx-w/2,cy-h/2,w,h].join(' '));
    }
    function magnify(factor,x=cx,y=cy){
      const next=Math.max(1,Math.min(6,scale*factor));
      cx=x+(cx-x)*scale/next;cy=y+(cy-y)*scale/next;scale=next;position();
    }
    svg.onwheel=e=>{
      e.preventDefault();
      const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      magnify(e.deltaY>0?.8:1.25,pt.x,pt.y);
    };
    svg.onpointerdown=e=>{moved=false;drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx,cy};};
    svg.onpointermove=e=>{
      if(!drag||drag.id!==e.pointerId||scale===1)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!moved&&Math.hypot(dx,dy)<5)return;
      moved=true;svg.setPointerCapture(e.pointerId);
      const units=1/svg.getScreenCTM().a;cx=drag.cx-dx*units;cy=drag.cy-dy*units;position();
    };
    svg.onpointerup=svg.onpointercancel=()=>{drag=null;};
    svg.addEventListener('click',e=>{if(moved){e.stopPropagation();moved=false;}},true);
    const zoom=document.createElement('div');zoom.className='scanZoom';
    for(const [label,factor] of [['Phóng to',1.5],['Thu nhỏ',2/3]]){
      const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>magnify(factor);zoom.append(button);
    }
    position();stage.append(zoom);
    const notes=document.createElement('details'),label=document.createElement('summary'),link=document.createElement('a');
    label.textContent='Hai bia Hạ Mã';link.href='https://data.vanmieu.baotangso.com/upload/anpham2024/bia-ha-ma.pdf#page=28';
    link.target='_blank';link.rel='noopener';link.textContent='Sơ đồ hai bia, trang 28 ↗';
    notes.append(label,'Hai bia đứng dọc phố Quốc Tử Giám, hai bên Tứ trụ. Bia phía tây ở đầu giáp Vườn Giám, bia phía đông gần góc phố Văn Miếu. ',link);
    caption.append(notes);
  }
  button.onclick=()=>display(0);plan.onclick=showPlan;
  el('fieldClose').onclick=()=>dialog.close();dialog.addEventListener('close',release);
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  return {select};
}
