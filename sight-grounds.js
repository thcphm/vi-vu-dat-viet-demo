'use strict';
// Only unrecorded scenery uses these outlines. Paths, trees and buildings
// surveyed inside a memorial continue to use their normal rendering paths.
let memorialOutlines;
function memorialGroundsNear(graph,cx,cz){
  if(!graph)return ()=>false;
  memorialOutlines??=(window.MemorialGroundRings||[]).map(([, ,paths])=>{
    let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
    const rings=paths.map(path=>{
      const ring=[];let x=0,y=0;
      for(let i=0;i<path.length;i+=2){
        x+=path[i];y+=path[i+1];const lon=x/1e7,lat=y/1e7;
        west=Math.min(west,lon);south=Math.min(south,lat);east=Math.max(east,lon);north=Math.max(north,lat);
        ring.push([lon,lat]);
      }
      return ring;
    });
    return {west,south,east,north,rings};
  });
  const [lon,lat]=graph.geo(cx,cz),dx=1000/graph.mx,dy=1000/graph.my;
  const nearby=memorialOutlines.filter(p=>p.east>=lon-dx&&p.west<=lon+dx&&p.north>=lat-dy&&p.south<=lat+dy)
    .map(p=>({nw:graph.point(p.west,p.north),se:graph.point(p.east,p.south),rings:p.rings.map(r=>r.map(v=>graph.point(...v)))}));
  return (x,z)=>nearby.some(({nw,se,rings})=>{
    if(x<nw.x||x>se.x||z<nw.z||z>se.z)return false;
    let inside=false;
    for(const ring of rings){
      let a=ring[ring.length-1];
      for(const b of ring){
        if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
        a=b;
      }
    }
    return inside;
  });
}
// Metre-scale ground finishes follow the mapped rings (including holes) and
// pedestrian ways. The relief mesh supplies their elevation and doesn't need
// another layer of nearly coplanar triangles.
function createSightGrounds(T,small,source){
  const canvas=document.createElement('canvas'),span=1120;
  canvas.width=canvas.height=small?768:1280;
  const pen=canvas.getContext('2d',{willReadFrequently:true});
  // Collision lookup and the shader can share the same top-to-bottom raster.
  const texture=new T.DataTexture(null,canvas.width,canvas.height);
  texture.magFilter=texture.minFilter=T.LinearFilter;
  const uniforms={visitorMap:{value:texture},visitorOrigin:{value:new T.Vector2()},visitorActive:{value:0}};
  const codes={sand:1,rock:2,lawn:3,orchard:3,tea:3,court:4,trail:5,walk:6,steps:6,drive:7};
  const surfaces={asphalt:1,concrete:2,'concrete:plates':2,gravel:3,wood:4,brick:5,
    sett:6,cobblestone:6,stone:6};
  const projections=source?.projections||new WeakMap();
  const datasets=source?.datasets||['sight-grounds/','sight-furniture/'].map(base=>({
    base,states:new WeakMap(),cache:new Map(),manifest:null
  }));
  const occupiedCells=new Map();
  let mask,fixtures=[],streetFurniture=[],originX=0,originZ=0;
  let memorialAt=()=>false;
  let fenceModels=[],wallModels=[],cityWallModels=[];
  async function loadLayer(layer,graph,x,z){
    const {base,states,cache}=layer;
    const [lon,lat]=graph.geo(x,z),reach=span*.5+180;
    const W=Math.floor((lon-reach/graph.mx)*32),E=Math.floor((lon+reach/graph.mx)*32);
    const S=Math.floor((lat-reach/graph.my)*32),N=Math.floor((lat+reach/graph.my)*32);
    const signature=[W,E,S,N].join('/'),prior=states.get(graph);
    if(prior?.signature===signature)return prior.job;
    const state={signature,rows:prior?.rows||[]};
    states.set(graph,state);
    state.job=(async()=>{
      try{
        layer.manifest??=fetch(base+'index.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();})
          .then(index=>new Set(index.bundles)).catch(e=>{layer.manifest=null;throw e;});
        const available=await layer.manifest,needed=new Set(),jobs=[];
        for(let i=W;i<=E;i++)for(let j=S;j<=N;j++){
          const key=Math.floor(i/8)+'_'+Math.floor(j/8);
          if(!available.has(key))continue;
          needed.add(key);
          if(!cache.has(key))cache.set(key,fetchMapTile(base+key+'.gz').catch(e=>{cache.delete(key);throw e;}));
          jobs.push(cache.get(key).then(bundle=>bundle[i+'_'+j]||[]));
        }
        const rows=(await Promise.all(jobs)).flat();
        if(states.get(graph)!==state)return false;
        state.rows=rows;state.job=false;
        for(const key of cache.keys())if(!needed.has(key))cache.delete(key);
        return true;
      }catch{if(states.get(graph)===state)states.delete(graph);return false;}
    })();
    return state.job;
  }
  async function load(graph,x,z){
    return (await Promise.all(datasets.map(layer=>loadLayer(layer,graph,x,z)))).some(Boolean);
  }
  // Index surveyed points before generating buildings or vegetation. All
  // coordinates in this index are relative to this district's render origin.
  function occupy(x,z,radius,kind){
    const key=Math.floor(x/20)+','+Math.floor(z/20);
    if(!occupiedCells.has(key))occupiedCells.set(key,[]);
    occupiedCells.get(key).push({x,z,radius,kind});
  }
  function nearFixture(x,z,radius,kind){
    const reach=radius+3;
    for(let i=Math.floor((x-reach)/20);i<=Math.floor((x+reach)/20);i++){
      for(let j=Math.floor((z-reach)/20);j<=Math.floor((z+reach)/20);j++){
        for(const p of occupiedCells.get(i+','+j)||[]){
          if((!kind||p.kind===kind)&&(x-p.x)**2+(z-p.z)**2<(radius+p.radius)**2)return true;
        }
      }
    }
    return false;
  }
  const displayed={visitorMap:{value:texture},visitorOrigin:{value:new T.Vector2()},visitorActive:{value:0}};
  function shade(shader){
    Object.assign(shader.uniforms,displayed);
    shader.fragmentShader='uniform sampler2D visitorMap; uniform vec2 visitorOrigin; uniform float visitorActive;\n'+
      shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      vec2 vu=(groundMetres-visitorOrigin)/1120.+.5;
      if(visitorActive>.5 && all(greaterThan(vu,vec2(0.))) && all(lessThan(vu,vec2(1.)))){
        vec4 sampleGround=texture2D(visitorMap,vu);
        float type=floor(sampleGround.r*8.+.5);
        vec2 m=groundMetres;
        float grain=clamp(dot(diffuseColor.rgb,vec3(.23,.63,.14))*4.,.72,1.22);
        vec3 tint=vec3(.54,.41,.235);
        if(type==2.)tint=vec3(.26,.25,.218);
        if(type==3.)tint=vec3(.118,.214,.065);
        if(type==4.||type==6.){
          vec2 block=m/(type==4.?vec2(1.12,.61):vec2(.53,.28));
          block.x+=.5*mod(floor(block.y),2.);
          vec2 aa=max(fwidth(block),vec2(.004)),edge=min(fract(block),1.-fract(block));
          vec2 seam=smoothstep(vec2(.009)-aa*.45,vec2(.033)+aa*.45,edge);
          float fade=1.-smoothstep(.15,.85,max(aa.x,aa.y));
          float slab=fract(sin(dot(mod(floor(block),256.),vec2(27.1,18.9)))*4347.);
          tint=(type==4.?vec3(.36,.325,.282):vec3(.325,.274,.214))*(1.+fade*(.14*(slab-.5)-.34*(1.-seam.x*seam.y)));
        }
        if(type==5.)tint=vec3(.235,.16,.095);
        if(type==7.)tint=vec3(.23,.225,.21);
        float surface=floor(sampleGround.g*8.+.5);
        if(surface==1.)tint=vec3(.105,.108,.105);
        if(surface==2.)tint=vec3(.34,.33,.30);
        if(surface==3.)tint=vec3(.28,.23,.17);
        if(surface==4.)tint=vec3(.29,.19,.12);
        if(surface==5.)tint*=vec3(1.12,.65,.49);
        if(surface==6.)tint*=vec3(.87,.94,1.);
        // A narrow concrete path blended against grass must never decode as
        // asphalt or dirt where the two categorical IDs mix at a texel edge.
        if(sampleGround.b>=.501){
          float pathCoverage=smoothstep(.21,.78,(sampleGround.b*255.-128.)/127.);
          tint=mix(vec3(.118,.214,.065),vec3(.34,.33,.30),pathCoverage);
        }
        diffuseColor.rgb=mix(diffuseColor.rgb,tint*grain,sampleGround.a*(1.-bankWet)*.92);
      }`);
  }
  function* prepare(graph,cx,cz,landmarks){
    let work=0;
    originX=cx;originZ=cz;fixtures=[];mask=null;uniforms.visitorActive.value=0;
    memorialAt=memorialGroundsNear(graph,cx,cz);
    fenceModels=(landmarks?.active||[]).filter(site=>site.data.replacesFence);
    wallModels=(landmarks?.active||[]).filter(site=>site.data.replacesWall);
    cityWallModels=(landmarks?.active||[]).filter(site=>site.data.replacesCityWall);
    occupiedCells.clear();streetFurniture=[];
    for(const [kind,id,lon,lat,height,diameter,tags] of datasets[1].states.get(graph)?.rows||[]){
      if((++work & 127)===0)yield;
      const point=graph.point(lon/1e7,lat/1e7),x=point.x-cx,z=point.z-cz;
      if(Math.abs(x)>span/2||Math.abs(z)>span/2)continue;
      occupy(x,z,.4,kind);streetFurniture.push({kind,id,x,z,worldX:point.x,worldZ:point.z,height,diameter,tags});
    }
    if(!graph)return;
    const rows=datasets[0].states.get(graph)?.rows||[];
    const ratio=canvas.width/span,half=span/2;
    if(!projections.has(graph))projections.set(graph,new WeakMap());
    const projected=projections.get(graph);
    const layers=[];
    const survey=window.VanMieuSurvey,surveyOrigin=survey&&graph.point(...survey.origin);
    const treePositions=new Set();
    if(landmarks?.active?.some(site=>site.data.id==='lang-chu-tich-ho-chi-minh')){
      for(const position of window.BaDinhLandscape?.modeledTrees||[])treePositions.add(position);
    }
    if(surveyOrigin&&Math.hypot(surveyOrigin.x-cx,surveyOrigin.z-cz)<1050){
      for(const f of survey.features){
        if(!['tree','courtyard','grass'].includes(f.kind))continue;
        const rings=f.rings.map(r=>r.map(([lon,lat])=>{
          const p=graph.point(lon,lat);return [p.x-cx,p.z-cz];
        }));
        if(f.kind==='tree'){
          const [lon,lat]=f.rings[0][0],ring=rings[0];
          treePositions.add(Math.round(lon*1e6)+','+Math.round(lat*1e6));
          fixtures.push({kind:'tree',size:f.height,ring,rings,measuredPosition:true});
          occupy(...ring[0],3,'tree');
        }else{
          const kind=f.kind==='grass'?'lawn':'court';
          layers.push({kind,code:codes[kind],rings,finish:f.surface==='paving_stones'?'stone':f.surface});
        }
      }
    }
    const modeledSteps=new Set((landmarks?.active||[]).flatMap(site=>site.data.modeledStairWays||[]));
    for(const [kind,size,raw,finish='',detail=0,wayId] of rows){
      if((++work & 31)===0)yield;
      if(['tree','palm','pine'].includes(kind)&&treePositions.has(raw[0][0]+','+raw[0][1]))continue;
      let feature=projected.get(raw);
      if(!feature){
        let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
        const rings=raw.map((ring,index)=>{
          let lon=0,lat=0;
          const points=[];
          for(let i=0;i<ring.length;i+=2){
            lon+=ring[i];lat+=ring[i+1];
            const p=graph.point(lon/1e6,lat/1e6);
            points.push(p);
            if(!index){
              minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
              minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
            }
          }
          return points;
        });
        feature={rings,minX,maxX,minZ,maxZ};projected.set(raw,feature);
      }
      if(feature.maxX<cx-half-12||feature.minX>cx+half+12||feature.maxZ<cz-half-12||feature.minZ>cz+half+12)continue;
      const rings=feature.rings.map(r=>r.map(p=>[p.x-cx,p.z-cz]));
      const ring=rings[0];
      if(ring.length===1)occupy(...ring[0],['tree','pine','palm'].includes(kind)?3:.8,kind);
      if(kind==='avenue')for(let i=1;i<ring.length;i++){
        const [x,z]=ring[i-1],[bx,bz]=ring[i],n=Math.ceil(Math.hypot(bx-x,bz-z)/8);
        for(let j=0;j<n;j++)occupy(x+(bx-x)*(j+.5)/n,z+(bz-z)*(j+.5)/n,3,'avenue');
      }
      const code=codes[kind];
      if(code)layers.push({kind,code,rings,size,finish});
      if((!code||['steps','orchard','tea'].includes(kind))&&!(kind==='steps'&&modeledSteps.has(wayId)))
        fixtures.push({kind,size,ring,rings,finish,detail});
    }
    window.BaDinhLandscape?.prepareGround(layers,graph,cx,cz);
    if(!layers.length)return;
    pen.setTransform(ratio,0,0,ratio,canvas.width/2,canvas.height/2);
    pen.clearRect(-half,-half,span,span);pen.lineCap=pen.lineJoin='round';
    layers.sort((a,b)=>a.code-b.code);
    function trace(points,closed){
      pen.moveTo(...points[0]);
      for(let i=1;i<points.length;i++)pen.lineTo(...points[i]);
      if(closed)pen.closePath();
    }
    function pigment(code,finish,coverageByte=0){
      return 'rgb('+Math.round(code*255/8)+' '+Math.round((surfaces[finish]||0)*255/8)+' '+coverageByte+')';
    }
    for(const {code,rings,finish,coverageByte} of layers){
      if((++work & 31)===0)yield;
      if(code>=4)continue;
      pen.beginPath();
      for(const ring of rings)trace(ring,true);
      pen.fillStyle=pigment(code,finish,coverageByte);pen.fill('evenodd');
    }
    // Detailed architectural models already include paving and landscaping.
    pen.globalCompositeOperation='destination-out';
    for(const {ring} of landmarks?.buildingAreas||[]){
      pen.beginPath();trace(ring.map(p=>[p.x-cx,p.y-cz]),true);pen.fill();
    }
    pen.globalCompositeOperation='source-over';
    // An approach can run through a modeled gate and into its courtyard.
    for(const {kind,code,rings,size,finish,coverageByte} of layers){
      if((++work & 31)===0)yield;
      if(code===4){
        pen.beginPath();
        for(const ring of rings)trace(ring,true);
        pen.fillStyle=pigment(code,finish);pen.fill('evenodd');
        continue;
      }
      if(code<5)continue;
      pen.beginPath();
      for(const ring of rings)trace(ring,false);
      pen.lineWidth=Math.min(14,size||(kind==='drive'?4:kind==='trail'?1.5:2.4));
      pen.strokeStyle=pigment(code,finish,coverageByte);pen.stroke();
    }
    mask=pen.getImageData(0,0,canvas.width,canvas.height).data;
    texture.image.data=new Uint8Array(mask.buffer,mask.byteOffset,mask.byteLength);
    uniforms.visitorOrigin.value.set(cx,cz);uniforms.visitorActive.value=1;texture.needsUpdate=true;
  }
  function groundCode(x,z){
    if(!mask)return 0;
    const i=Math.floor((.5+(x-originX)/span)*canvas.width),j=Math.floor((.5+(z-originZ)/span)*canvas.height);
    if(i<0||j<0||i>=canvas.width||j>=canvas.height)return 0;
    const pixel=(j*canvas.width+i)*4;
    return mask[pixel+3]>100?Math.round(mask[pixel]*8/255):0;
  }
  // Structural features share one vertex-coloured draw, with metre-space joints
  // on brickwork and end grain on timber. Keep the original path bearings.
  const grain=source?.grain||new T.TextureLoader().load('streetscape/surfaces/landmark-grain.webp');
  grain.wrapS=grain.wrapT=T.RepeatWrapping;
  const material=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.88});
  material.onBeforeCompile=shader=>{
    shader.uniforms.fixtureGrain={value:grain};
    const vary='varying vec2 groundsUV; varying float finishCode;\n';
    shader.vertexShader=vary+'attribute float finish;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n groundsUV=uv; finishCode=finish;');
    shader.fragmentShader=vary+'uniform sampler2D fixtureGrain;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 relief=texture2D(fixtureGrain,groundsUV*.46).rgb-.5;
      if(abs(finishCode-1.)<.1 || abs(finishCode-3.)<.1){
        vec2 p=groundsUV/(finishCode<2.?vec2(.32,.115):vec2(.82,.36));p.x+=.5*mod(floor(p.y),2.);
        vec2 aa=max(fwidth(p),vec2(.002)),edge=min(fract(p),1.-fract(p));
        vec2 inside=smoothstep(vec2(.013)-aa*.5,vec2(.037)+aa*.5,edge);
        float shade=fract(sin(dot(mod(floor(p),256.),vec2(53.3,97.1)))*4817.);
        diffuseColor.rgb*=1.+relief.g*.43+(.13*(shade-.5)-(1.-inside.x*inside.y)*.36)*(1.-smoothstep(.12,.9,max(aa.x,aa.y)));
      }else if(abs(finishCode-2.)<.1){
        float fibre=sin(groundsUV.y*47.+1.7*sin(groundsUV.x*2.6));
        diffuseColor.rgb*=1.+relief.b*.45+.07*fibre*(1.-smoothstep(.012,.072,fwidth(groundsUV.y)));
      }else if(abs(finishCode-4.)<.1){
        float damp=(1.-smoothstep(.12,.88,groundsUV.y))*smoothstep(-.14,.13,relief.r);
        diffuseColor.rgb*=vec3(1.+.39*relief.r)*mix(vec3(1.),vec3(.73,.78,.66),damp*.74);
      }else if(abs(finishCode-5.)<.1){
        float leaf=texture2D(fixtureGrain,groundsUV*2.7).g-.5;
        diffuseColor.rgb*=1.+relief.r*.48+leaf*.82-.16*(1.-smoothstep(.05,.6,groundsUV.y));
      }`);
  };
  // Alpha-cut wire leaves gaps in the shadow map as well as in the colour pass.
  // Pots, masonry and rails still share the solid fixture draw call.
  const fenceMaterials=source?.fenceMaterials||new Map();
  function fenceMaterial(style){
    if(fenceMaterials.has(style))return fenceMaterials.get(style);
    const tile=document.createElement('canvas');tile.width=tile.height=64;
    const c=tile.getContext('2d');c.strokeStyle='#fff';c.lineCap='square';
    c.lineWidth=style==='mesh'?3:7;c.beginPath();
    if(style==='mesh'){
      for(const x of [-64,0,64]){c.moveTo(x,0);c.lineTo(x+64,64);c.moveTo(x+64,0);c.lineTo(x,64);}
    }else{c.moveTo(32,0);c.lineTo(32,64);}
    c.stroke();
    const map=new T.CanvasTexture(tile);map.wrapS=map.wrapT=T.RepeatWrapping;
    const mat=new T.MeshLambertMaterial({color:style==='mesh'?0x727b72:0x4d5554,map,alphaTest:.23,side:T.DoubleSide});
    fenceMaterials.set(style,mat);return mat;
  }
  function* build(group,ground,blocked,obstacle,water,plant,mappedBlocked=blocked){
    const pos=[],rgb=[],uv=[],finish=[],colour=new T.Color();
    const panels=new Map(),posts=new Set();
    function quad(a,b,c,d,tint,code=0){
      colour.setHex(tint);
      const w=Math.hypot(...b.map((v,i)=>v-a[i])),h=Math.hypot(...d.map((v,i)=>v-a[i]));
      const across=Math.hypot(b[0]-a[0],b[2]-a[2]);
      const u=across?(((a[0]+originX)*(b[0]-a[0])+(a[2]+originZ)*(b[2]-a[2]))/across)%2048:0;
      for(const p of [a,b,c,a,c,d]){pos.push(...p);rgb.push(colour.r,colour.g,colour.b);finish.push(code);}
      uv.push(u,0,u+w,0,u+w,h,u,0,u+w,h,u,h);
    }
    function slab(ax,az,bx,bz,half,loA,loB,hiA,hiB,tint,code=0){
      const length=Math.hypot(bx-ax,bz-az),nx=(az-bz)*half/length,nz=(bx-ax)*half/length;
      const a=[ax+nx,hiA,az+nz],b=[bx+nx,hiB,bz+nz],c=[bx-nx,hiB,bz-nz],d=[ax-nx,hiA,az-nz];
      const al=[a[0],loA,a[2]],bl=[b[0],loB,b[2]],cl=[c[0],loB,c[2]],dl=[d[0],loA,d[2]];
      quad(a,b,c,d,tint,code);quad(al,bl,b,a,tint,code);quad(cl,dl,d,c,tint,code);
      quad(dl,al,a,d,tint,code);quad(bl,cl,c,b,tint,code);
    }
    function upright(x,z,r,base,top,tint,finish=0){
      slab(x-r,z,x+r,z,r,base,base,top,top,tint,finish);
    }
    function screen(style,x,z,xx,zz,a,b,h){
      let panel=panels.get(style);
      if(!panel){panel={pos:[],uv:[]};panels.set(style,panel);}
      const lo=.11,top=h-.09;
      panel.pos.push(x,a+lo,z,xx,b+lo,zz,xx,b+top,zz,x,a+lo,z,xx,b+top,zz,x,a+top,z);
      const u=Math.hypot(xx-x,zz-z)/(style==='bars'?.16:.115),v=(top-lo)/(style==='bars'?1:.15);
      panel.uv.push(0,0,u,0,u,v,0,0,u,v,0,v);
    }
    const close=small?145:225,reach=small?230:350;
    function inside(x,z,ring){
      let hit=false;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const [a,b]=ring[i],[c,d]=ring[j];
        if((b>z)!==(d>z)&&x<a+(z-b)*(c-a)/(d-b))hit=!hit;
      }
      return hit;
    }
    function rows(kind,rings){
      const ring=rings[0],[ox,oz]=ring[0];
      let length=0,fx=1,fz=0;
      for(let i=0;i<ring.length;i++){
        const [x,z]=ring[i],[a,b]=ring[(i+1)%ring.length],d=Math.hypot(a-x,b-z);
        if(d>length){length=d;fx=(a-x)/d;fz=(b-z)/d;}
      }
      const smallCrop=kind==='tea',along=smallCrop?1.65:7.3,across=smallCrop?3.6:8;
      const reach=smallCrop?(small?75:115):(small?130:190);
      const originU=-ox*fx-oz*fz,originV=ox*fz-oz*fx;
      let minU=Infinity,minV=Infinity,maxU=-Infinity,maxV=-Infinity;
      for(const [x,z] of ring){
        const u=(x-ox)*fx+(z-oz)*fz,v=(z-oz)*fx-(x-ox)*fz;
        minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);
      }
      const holes=rings.slice(1);
      for(let j=Math.ceil(Math.max(minV,originV-reach)/across);j*across<=Math.min(maxV,originV+reach);j++){
        for(let i=Math.ceil(Math.max(minU,originU-reach)/along);i*along<=Math.min(maxU,originU+reach);i++){
          const x=ox+fx*i*along-fz*j*across,z=oz+fz*i*along+fx*j*across;
          if(x*x+z*z>reach*reach||!inside(x,z,ring)||holes.some(r=>inside(x,z,r))||blocked(x,z,.45))continue;
          const noise=Math.sin(i*17.31+j*24.71);
          if(smallCrop)plant('tea',x,z,.99+noise*.06,1.78,Math.atan2(fx,fz));
          else plant('tree',x,z,4.35+noise*.42,4.6+noise*.44,i+j);
        }
      }
    }
    let work=0;
    for(const {kind,ring,rings,size,finish:skin,detail,measuredPosition} of fixtures){
      if((++work & 7)===0)yield;
      if(kind==='orchard'||kind==='tea'){rows(kind,rings);continue;}
      if(ring.length===1){
        const [x,z]=ring[0],gate=kind==='gate_post'||kind==='gate_pier';
        if(Math.hypot(x,z)>close||(gate||measuredPosition?mappedBlocked:blocked)(x,z,gate?.1:.45))continue;
        const baseY=ground(x,z);
        if(gate){
          const stone=kind==='gate_pier',h=Math.min(5.5,size||(stone?1.95:1.6)),r=stone?.17:.062;
          upright(x,z,r,baseY-.19,baseY+h,stone?0xa6a094:0x596361,stone?4:0);
          upright(x,z,r+.025,baseY+h-.055,baseY+h+.04,stone?0x89877f:0x414943);
          obstacle({id:'grounds:'+kind+':'+Math.round(originX+x)+':'+Math.round(originZ+z),kind:'barrier',
            x,z,fx:1,fz:0,w:r+.025,d:r+.025,height:h+.04,parts:[]});
          continue;
        }
        if(['tree','pine','palm'].includes(kind)){
          const seed=Math.sin((x+originX)*.15+(z+originZ)*.41),height=Math.min(55,size||9+seed*2.2);
          plant(kind,x,z,height,height*(kind==='pine'?.47:kind==='palm'?.61:.86),seed*3);
          continue;
        }
        function box(dx,dz,w,d,y,h,c,code=0){slab(x+dx-w/2,z+dz,x+dx+w/2,z+dz,d/2,baseY+y,baseY+y,baseY+y+h,baseY+y+h,c,code);}
        if(kind==='bench'||kind==='picnic_table'){
          const table=kind==='picnic_table';
          for(const dx of [-.57,.57])box(dx,0,.12,table?1.28:.46,-.16,.59,0x6b685c);
          for(const dz of table?[-.68,.68]:[0])for(let j=-1;j<=1;j++)box(0,dz+j*.13,1.72,.12,.39,.065,0x926948,2);
          if(table)box(0,0,1.88,.67,.7,.09,0x9b7751,2);
          else{
            for(const dx of [-.57,.57])box(dx,-.21,.065,.065,.41,.43,0x605b4e);
            for(const y of [.61,.78])box(0,-.20,1.72,.065,y,.105,0x936e4e,2);
          }
        }else if(kind==='board'){
          for(const dx of [-.69,.69])box(dx,0,.10,.13,-.15,2.03,0x655746,2);
          box(0,0,1.56,.09,.86,1.04,0x675c48);
          box(0,.051,1.39,.012,.96,.83,0xc8c5ae);
          box(0,0,1.73,.37,1.9,.08,0x625a50);
        }else if(kind==='flagpole'){
          const h=Math.min(55,size||8);box(0,0,.65,.65,-.15,.37,0xb3afa3);box(0,0,.09,.09,.17,h,0xb9c2c4);
        }else{
          const h=Math.min(28,size||(kind==='obelisk'?4:1.65)),w=Math.min(3,h*.42);
          box(0,0,w*1.6,w*1.35,-.16,.4,0x9e9a8f);box(0,0,w*1.3,w*1.05,.24,.19,0xaaa698);
          if(kind==='obelisk'){
            const lower=w*.45,upper=w*.20,y=baseY+.42,top=baseY+h;
            const ring=(r,level)=>[[-r,-r],[r,-r],[r,r],[-r,r]].map(([dx,dz])=>[x+dx,level,z+dz]);
            const a=ring(lower,y),b=ring(upper,top);
            for(let i=0;i<4;i++){const j=(i+1)%4;quad(a[i],a[j],b[j],b[i],0xaaa698);quad(b[i],b[j],[x,top+upper*2,z],[x,top+upper*2,z],0xb1aca1);}
          }else box(0,0,w,w*.48,.41,h*.8,0x848175);
        }
        continue;
      }
      const fence=kind==='fence'||kind==='railing';
      const replacements=fence?fenceModels:kind==='wall'?wallModels:kind==='city_wall'?cityWallModels:null;
      const closedFence=['wall','brick','dry_stone','stone','concrete','concrete_block','sheet'].includes(skin);
      let along=0;
      for(let i=1;i<ring.length;i++){
        const [ax,az]=ring[i-1],[bx,bz]=ring[i],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
        if(len<.12)continue;
        const start=along;along+=len;
        const nearest=Math.max(0,Math.min(1,-(ax*dx+az*dz)/(len*len)));
        if(Math.hypot(ax+nearest*dx,az+nearest*dz)>reach)continue;
        const taggedRun=kind==='steps'&&detail>=.12&&detail<=3?detail:0;
        const step=kind==='steps'?.40:kind==='pier'?2.5:kind==='avenue'?8:fence?2.7:3.6;
        const n=taggedRun?Math.max(1,Math.round(along/taggedRun)-Math.round(start/taggedRun)):Math.ceil(len/step);
        const fx=dx/len,fz=dz/len;
        for(let j=0;j<n;j++){
          const t=j/n,u=(j+1)/n,x=ax+dx*t,z=az+dz*t,xx=ax+dx*u,zz=az+dz*u,mx=(x+xx)/2,mz=(z+zz)/2;
          if(replacements?.some(site=>{
            const dx=mx+originX-site.x,dz=mz+originZ-site.z;
            const replaces=fence?site.data.replacesFence:kind==='city_wall'?site.data.replacesCityWall:site.data.replacesWall;
            return replaces(dx*site.c-dz*site.s,dx*site.s+dz*site.c);
          }))continue;
          if(Math.hypot(mx,mz)>reach||(kind==='avenue'?blocked:mappedBlocked)(mx,mz,.16,kind==='pier'||kind==='retaining_wall'))continue;
          const a=ground(x,z),b=ground(xx,zz);
          if(kind==='avenue'){
            const h=Math.min(40,size||8.5);
            plant('tree',mx,mz,h,h*.75,j*.83);
          }else if(kind==='steps'){
            const half=Math.min(8,size||2.4)/2,sx=-fz*half,sz=fx*half;
            const sides=[ground(x+sx,z+sz),ground(x-sx,z-sz),ground(xx+sx,zz+sz),ground(xx-sx,zz-sz)];
            const top=Math.max(a,b,...sides)+.035,bottom=Math.min(a,b,...sides)-.14;
            slab(x,z,xx,zz,half,bottom,bottom,top,top,skin==='brick'?0xaa7255:0xb4ae9e,4);
          }else if(kind==='pier'){
            const level=water(mx,mz)?.level,deck=Number.isFinite(level)?level+.96:Math.max(a,b)+.5;
            const half=Math.min(8,size||2)/2;
            slab(x,z,xx,zz,half,deck-.18,deck-.18,deck,deck,0x9b7c5d,2);
            for(const side of [-1,1]){
              const px=x-fz*half*.8*side,pz=z+fx*half*.8*side;
              slab(px-.09,pz,px+.09,pz,.09,deck-2.8,deck-2.8,deck-.16,deck-.16,0x766650,2);
            }
          }else{
            const hedge=kind==='hedge',fort=kind==='city_wall',retained=kind==='retaining_wall';
            const h=Math.min(15,size||(hedge?1.14:fort?3.8:retained?.92:fence?1.35:1.65));
            const half=Math.min(fence&&!closedFence?.13:4,detail?detail/2:hedge?.44:fort?1.15:fence&&!closedFence?.055:.15);
            if(fence&&!closedFence){
              const wood=skin==='timber',paint=wood?0x80715a:0x64706c;
              for(const [px,pz,y] of [[x,z,a],[xx,zz,b]]){
                const key=px.toFixed(2)+','+pz.toFixed(2);
                if(posts.has(key))continue;
                posts.add(key);upright(px,pz,half,y-.15,y+h+.04,paint,wood?2:0);
              }
              for(const level of [h*.18,h*.91])
                slab(x,z,xx,zz,wood?.048:.026,a+level,b+level,a+level+.07,b+level+.07,paint,wood?2:0);
              if(skin==='bars'||skin==='mesh'||kind==='railing')screen(skin==='mesh'?'mesh':'bars',x,z,xx,zz,a,b,h);
              else if(!wood)slab(x,z,xx,zz,.021,a+h*.54,b+h*.54,a+h*.54+.045,b+h*.54+.045,paint);
            }else{
              const sx=-fz*half,sz=fx*half;
              const loA=Math.min(a,ground(x+sx,z+sz),ground(x-sx,z-sz))-.22;
              const loB=Math.min(b,ground(xx+sx,zz+sz),ground(xx-sx,zz-sz))-.22;
              const masonry=hedge?5:skin==='brick'?1:fort||retained||skin==='stone'||skin==='dry_stone'?3:skin==='sheet'?0:4;
              const tint=hedge?0x597344:masonry===1?0xa07159:masonry===3?0x978978:skin==='sheet'?0x87918e:0xb2a99b;
              slab(x,z,xx,zz,half,loA,loB,a+h,b+h,tint,masonry);
              if(!hedge&&skin!=='sheet')slab(x,z,xx,zz,half+.045,a+h-.075,b+h-.075,a+h+.03,b+h+.03,0x989488);
            }
            obstacle({id:'grounds:'+kind+':'+Math.round(originX+mx)+':'+Math.round(originZ+mz),kind:'barrier',
              x:mx,z:mz,fx,fz,w:len/n/2,d:half,height:h,parts:[]});
          }
        }
      }
    }
    if(!pos.length)return;
    const geo=new T.BufferGeometry();
    for(const [name,array,size] of [['position',pos,3],['color',rgb,3],['uv',uv,2],['finish',finish,1]])
      geo.setAttribute(name,new T.Float32BufferAttribute(array,size));
    setFlatNormals(T,geo);
    const mesh=new T.Mesh(geo,material);mesh.name='Mapped visitor grounds';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
    for(const [style,data] of panels){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.pos,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));setFlatNormals(T,g);
      const infill=new T.Mesh(g,fenceMaterial(style));infill.name='Mapped '+style+' fence';
      infill.castShadow=infill.receiveShadow=true;group.add(infill);
    }
  }
  return {load,prepare,shade,nearFixture,get memorialAt(){return memorialAt;},get streetFurniture(){return streetFurniture;},
    createView:()=>createSightGrounds(T,small,{datasets,projections,fenceMaterials,grain}),uniforms,
    display(view){displayed.visitorMap.value=view.uniforms.visitorMap.value;displayed.visitorOrigin.value.copy(view.uniforms.visitorOrigin.value);displayed.visitorActive.value=view.uniforms.visitorActive.value;},
    mapped:(x,z)=>groundCode(x,z)>0,accessLane:(x,z)=>groundCode(x,z)===codes.drive,build};
}
