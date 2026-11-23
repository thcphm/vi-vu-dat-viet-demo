'use strict';
// Each cell covers 1/32 degree. Page slots run west to east, then north to south.
function sightRasterPages(base,grid,extensions){
  const pages=new Map(),byGraph=new WeakMap();
  let index;
  function page(name){
    if(!pages.has(name)){
      const read=ext=>new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=base+name+ext;
      });
      pages.set(name,Promise.all(extensions.map(read)).catch(e=>{pages.delete(name);throw e;}));
    }
    return pages.get(name);
  }
  async function load(graph,x,z){
    const [lon,lat]=graph.geo(x,z),west=Math.floor(lon*grid)-1,north=Math.floor(lat*grid)+2;
    const last=byGraph.get(graph);
    if(last?.west===west&&last.north===north)return false;
    const next={west,north,cells:[],ready:false,previous:last?.ready?last:last?.previous};
    byGraph.set(graph,next);
    try{
      index??=fetch(base+'index.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(book=>{
        const cells=new Map();
        for(const [tag,slots] of Object.entries(book)){
          const x=Number(tag.slice(4))*grid,y=Number(tag.slice(1,3))*grid;
          slots.forEach(([i,j],n)=>cells.set((x+i)+','+(y+j),{name:tag+'-'+Math.floor(n/32),slot:n%32}));
        }
        return cells;
      }).catch(e=>{index=null;throw e;});
      const book=await index,needed=new Set();
      for(let j=0;j<3;j++)for(let i=0;i<3;i++){
        const tile=book.get((west+i)+','+(north-1-j));if(!tile)continue;
        needed.add(tile.name);
        next.cells.push({...tile,i,j});
      }
      await Promise.all(next.cells.map(async tile=>{tile.images=await page(tile.name);}));
      if(byGraph.get(graph)!==next)return false;
      next.ready=true;delete next.previous;
      for(const key of pages.keys())if(!needed.has(key))pages.delete(key);
      return true;
    }catch{if(byGraph.get(graph)===next){if(next.previous)byGraph.set(graph,next.previous);else byGraph.delete(graph);}return false;}
  }
  return {load,current(graph){
    const found=graph&&byGraph.get(graph);
    return found?.ready?found:found?.previous||null;
  }};
}
// In the output colour space, distant open water takes its light from the sky.
const sightOpenWaterColour='fogColor*vec3(.36,.54,.59)';
function createSightLandscapes(T){
  const grid=32,size=96,side=3*size;
  const coarse=sightRasterPages('sight-landscapes/',grid,['.webp','.surface.webp','-water.webp']);
  const fine=sightRasterPages('sight-imagery/',grid*4,['.webp']);
  const supplement=sightRasterPages('sight-elevation/',grid,['.png']),extraSize=80;
  let front,spare;
  function createView(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=side;
  const colour=canvas.getContext('2d');
  const mask=canvas.cloneNode(),surface=mask.getContext('2d',{willReadFrequently:true});
  canvas.width=canvas.height=side*4;
  const water=document.createElement('canvas');water.width=water.height=side*4;
  const waterPen=water.getContext('2d',{willReadFrequently:true});
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const waterTexture=new T.CanvasTexture(water);
  const uniforms={sightImage:{value:texture},sightWater:{value:waterTexture},sightBounds:{value:new T.Vector4(0,0,1,1)},sightEnabled:{value:0}};
  let active=null,activeFine=null,activeExtra=null,pixels=null;
  const heights=new Float32Array(side*side),distance=new Float32Array(side*side);
  const extraCanvas=document.createElement('canvas');extraCanvas.width=extraCanvas.height=3*extraSize;
  const extraPen=extraCanvas.getContext('2d',{willReadFrequently:true});
  function composeHeights(area,extra,graph){
    const n=extraCanvas.width;
    let extraPixels;
    if(extra?.cells.length){
      extraPen.clearRect(0,0,n,n);
      for(const {slot,i,j,images} of extra.cells){
        extraPen.drawImage(images[0],slot%8*extraSize,Math.floor(slot/8)*extraSize,extraSize,extraSize,
          (i+extra.west-area.west)*extraSize,(j+area.north-extra.north)*extraSize,extraSize,extraSize);
      }
      extraPixels=extraPen.getImageData(0,0,n,n).data;
    }
    function extraHeight(i,j){
      if(!extraPixels)return NaN;
      const u=(i+.5)*extraSize/size-.5,v=(j+.5)*extraSize/size-.5;
      const left=Math.floor(u),top=Math.floor(v),fx=u-left,fy=v-top;
      let sum=0,weight=0;
      for(let y=0;y<2;y++)for(let x=0;x<2;x++){
        const k=(Math.min(n-1,Math.max(0,top+y))*n+Math.min(n-1,Math.max(0,left+x)))*4;
        const h=extraPixels[k]*256+extraPixels[k+1];
        if(!h)continue;
        const f=(x?fx:1-fx)*(y?fy:1-fy);
        sum+=f*(h-129);weight+=f;
      }
      return weight>.49?sum/weight:NaN;
    }
    const dx=graph.mx/(grid*size),dz=graph.my/(grid*size),diagonal=Math.hypot(dx,dz);
    for(let j=0,k=0;j<side;j++)for(let i=0;i<side;i++,k++){
      const p=k*4;
      heights[k]=pixels?.[p+2]?pixels[p]*256+pixels[p+1]-128:extraHeight(i,j);
      distance[k]=Number.isFinite(heights[k])?Math.min(240,i*dx,(side-1-i)*dx,j*dz,(side-1-j)*dz):0;
    }
    // Two chamfer sweeps include internal holes and the streamed window edge.
    // A shared confidence field prevents seams where the two DEMs meet.
    for(let j=1;j<side-1;j++)for(let i=1;i<side-1;i++){
      const k=j*side+i;
      distance[k]=Math.min(distance[k],distance[k-1]+dx,distance[k-side]+dz,
        distance[k-side-1]+diagonal,distance[k-side+1]+diagonal);
    }
    for(let j=side-2;j>0;j--)for(let i=side-2;i>0;i--){
      const k=j*side+i;
      distance[k]=Math.min(distance[k],distance[k+1]+dx,distance[k+side]+dz,
        distance[k+side+1]+diagonal,distance[k+side-1]+diagonal);
    }
  }
  function setOrigin(graph){
    const next=coarse.current(graph),detail=fine.current(graph),extra=supplement.current(graph);
    if(active===next&&activeFine===detail&&activeExtra===extra)return;
    active=next;activeFine=detail;activeExtra=extra;pixels=null;uniforms.sightEnabled.value=0;
    if(!next?.cells.length&&!extra?.cells.length){heights.fill(NaN);distance.fill(0);return;}
    const area=next?.cells.length?next:extra;
    colour.clearRect(0,0,canvas.width,canvas.height);surface.clearRect(0,0,side,side);waterPen.clearRect(0,0,water.width,water.height);
    for(const {slot,i,j,images} of next?.cells||[]){
      const rect=[slot%8*size,Math.floor(slot/8)*size,size,size,i*size,j*size,size,size];
      colour.drawImage(images[0],...rect.slice(0,4),...rect.slice(4).map(n=>n*4));surface.drawImage(images[1],...rect);
      waterPen.drawImage(images[2],...rect.map(n=>n*4));
    }
    if(detail)for(const {slot,i,j,images} of detail.cells){
      const x=(detail.west-area.west*4+i)*size,y=(area.north*4-detail.north+j)*size;
      colour.drawImage(images[0],slot%8*size,Math.floor(slot/8)*size,size,size,x,y,size,size);
    }
    const origin=graph.point(area.west/grid,area.north/grid);
    uniforms.sightBounds.value.set(origin.x,origin.z,grid/(3*graph.mx),grid/(3*graph.my));
    if(next?.cells.length)pixels=surface.getImageData(0,0,side,side).data;
    composeHeights(area,extra,graph);
    texture.needsUpdate=waterTexture.needsUpdate=true;uniforms.sightEnabled.value=pixels?1:0;
  }
  function sample(x,z,field){
    if(!active&&!activeExtra)return null;
    const b=uniforms.sightBounds.value,u=(x-b.x)*b.z*side-.5,v=(z-b.y)*b.w*side-.5;
    const i=Math.floor(u),j=Math.floor(v);
    if(i<0||j<0||i>=side-1||j>=side-1)return null;
    const k=j*side+i;
    if(!field)return pixels?.[k*4+2]||null;
    const fx=u-i,fy=v-j;
    const low=field[k]*(1-fx)+field[k+1]*fx,high=field[k+side]*(1-fx)+field[k+side+1]*fx;
    const value=low*(1-fy)+high*fy;
    return Number.isFinite(value)?value:null;
  }
  function paintWater(ctx,cx,cz){
    if(!pixels)return;
    const b=uniforms.sightBounds.value;
    ctx.save();ctx.globalCompositeOperation='destination-over';
    ctx.drawImage(water,b.x-cx,b.y-cz,1/b.z,1/b.w);ctx.restore();
  }
  return {uniforms,setOrigin,matches:graph=>active===coarse.current(graph)&&activeFine===fine.current(graph)&&activeExtra===supplement.current(graph),
    paintWater,cover:(x,z)=>sample(x,z,null),elevation:(x,z)=>sample(x,z,heights),
    elevationWeight(x,z){const t=(sample(x,z,distance)||0)/240;return t*t*(3-2*t);},get visible(){return !!pixels;}};
  }
  front=createView();
  const uniforms=Object.fromEntries(Object.entries(front.uniforms).map(([key,u])=>[key,{value:u.value}]));
  const waterDistrict={value:new T.Vector3()};
  async function load(graph,x,z){
    return (await Promise.all([coarse.load(graph,x,z),fine.load(graph,x,z),supplement.load(graph,x,z)])).some(Boolean);
  }
  function shade(shader,position='groundMetres',exposure='1.-bankWet'){
    Object.assign(shader.uniforms,uniforms);
    shader.fragmentShader='uniform sampler2D sightImage; uniform sampler2D sightWater; uniform vec4 sightBounds; uniform float sightEnabled;\n'+
      shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 sightUV=(${position}-sightBounds.xy)*sightBounds.zw;
      float sightCoverage=0.,sightMappedWater=0.;
      if(sightEnabled>.5 && all(greaterThan(sightUV,vec2(0.))) && all(lessThan(sightUV,vec2(1.)))){
        vec4 observed=texture2D(sightImage,vec2(sightUV.x,1.-sightUV.y));
        float fineGrain=clamp(dot(diffuseColor.rgb,vec3(.21,.72,.07))*3.8,.60,1.34);
        diffuseColor.rgb=mix(diffuseColor.rgb,observed.rgb*fineGrain,.86*observed.a*(${exposure}));
        sightCoverage=observed.a;
        sightMappedWater=texture2D(sightWater,vec2(sightUV.x,1.-sightUV.y)).a;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.049,.13,.145)+observed.rgb*.10,.91*sightMappedWater*(${exposure}));
      }`);
  }
  function prepare(graph){
    if(front.matches(graph))return front;
    spare??=createView();spare.setOrigin(graph);return spare;
  }
  // A lake can extend beyond the generated water mesh. Use the surveyed mask
  // on both sides of that boundary, and keep waves and reflections in the foreground.
  function shadeWaterBoundary(shader,surface){
    shader.uniforms.waterDistrict=waterDistrict;
    const position=surface?'waterMetres':'groundMetres';
    let declarations='uniform vec3 waterDistrict;\n';
    if(surface){
      for(const id of ['sightWater','sightBounds','sightEnabled'])shader.uniforms[id]=uniforms[id];
      declarations+='uniform sampler2D sightWater; uniform vec4 sightBounds; uniform float sightEnabled;\n';
    }
    shader.fragmentShader=declarations+shader.fragmentShader.replace('#include <fog_fragment>',`
      #ifdef USE_FOG
        float districtRange=length(${position}-waterDistrict.xy)*waterDistrict.z;
        float edgeBlend=smoothstep(.58,.96,districtRange);
        if(edgeBlend>0.){
          ${surface?`vec2 uv=(waterMetres-sightBounds.xy)*sightBounds.zw;
          float sightMappedWater=0.;
          if(sightEnabled>.5 && all(greaterThanEqual(uv,vec2(0.))) && all(lessThanEqual(uv,vec2(1.))))
            sightMappedWater=texture2D(sightWater,vec2(uv.x,1.-uv.y)).a;`:''}
          gl_FragColor.rgb=mix(gl_FragColor.rgb,${sightOpenWaterColour},edgeBlend*sightMappedWater);
        }
      #endif
      #include <fog_fragment>`);
  }
  function activate(view){
    if(front===view)return;
    spare=front;front=view;
    for(const key of Object.keys(uniforms))uniforms[key].value=view.uniforms[key].value;
  }
  return {load,shade,shadeWaterBoundary,prepare,activate,setWaterDistrict(x,z,radius){waterDistrict.value.set(x,z,1/radius);}};
}
