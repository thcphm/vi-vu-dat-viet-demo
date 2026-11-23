'use strict';

function buildTunnelProfiles(graph,data){
  const profiles=new Map(),levels=new Map(),inside=data?.inside||{};
  const passages=new Set(data?.passages||[]),immersedNodes=new Set(),grade=.075;
  const isBore=e=>e.traffic?.tunnel&&!e.traffic.bridge;
  function portal(node){
    if(data)return !Object.hasOwn(inside,node);
    const links=graph.nodes.get(node)||[];
    return links.length===1||links.some(e=>!isBore(e));
  }
  function pinned(node){
    const links=graph.nodes.get(node)||[];
    return links.some(e=>passages.has(e.id)||graph.bridges.profiles.has(e.id))||
      links.length!==2&&links.some(e=>!isBore(e));
  }
  function approach(e,from){
    if(!profiles.has(e.id))profiles.set(e.id,{bore:false,ranges:[]});
    if(immersedNodes.has(from)){
      profiles.get(e.id).grade=.04;
      immersedNodes.add(from===e.start?e.end:e.start);
    }
  }
  for(const e of graph.edges.values())if(isBore(e)){
    const passage=passages.has(e.id),clearance=data?.clearance?.[e.id];
    const immersed=/sông sài gòn|thủ thiêm/i.test(e.name||'');
    // The Sài Gòn immersed crossing has 185 m and 215 m open approaches and a
    // maximum longitudinal grade of 4%. Its floor datum is approximate.
    const entrance=passage?0:immersed?7.6:(clearance??5.4)+1.4,top=immersed?24:entrance;
    profiles.set(e.id,{bore:true,passage,clearance,top,grade:immersed?.04:grade,ranges:[[0,e.length]]});
    for(const node of [e.start,e.end]){
      if(immersed)immersedNodes.add(node);
      if(!pinned(node))levels.set(node,Math.max(levels.get(node)||0,portal(node)?entrance:top));
    }
  }
  const {lift}=solveRoadGrades(graph,profiles,levels,grade,pinned,e=>!graph.bridges.profiles.has(e.id),approach);
  return {profiles,info:e=>profiles.get(e.id),portal,lift:(edge,s)=>0-lift(edge,s),inside};
}

function createTunnelDistrict(graph,edges,ground){
  const profiles=graph.tunnels,heights=new Map(),sections=new Map();
  // Use elevations at the real entrances. The internal OSM nodes of a
  // mountain bore are below the DEM surface, even when a tile ends there.
  function base(node,p){
    if(heights.has(node))return heights.get(node);
    const a=profiles.inside[node];
    let h;
    if(a){
      const p=graph.point(a[0]/1e5,a[1]/1e5);
      h=ground(p.x,p.z);
      if(a.length===6){
        const q=graph.point(a[3]/1e5,a[4]/1e5),f=a[2]/(a[2]+a[5]||1);
        h+=(ground(q.x,q.z)-h)*f;
      }
    }else h=ground(p.x,p.z);
    heights.set(node,h);return h;
  }
  function height(edge,s){
    const info=profiles.info(edge);
    if(info?.bore&&!info.passage){
      const a=base(edge.start,edge.points[0]),b=base(edge.end,edge.points.at(-1));
      return a+(b-a)*s/edge.length+profiles.lift(edge,s);
    }
    const p=graph.sample({edge,s,dir:1});
    return ground(p.x,p.z)+profiles.lift(edge,s);
  }
  function section(e){
    if(!sections.has(e.id))sections.set(e.id,tunnelSection(e,graph));
    return sections.get(e.id);
  }
  function at(x,z,e,margin=.6){
    const info=e&&profiles.info(e);
    if(!info)return null;
    const c=graph.nearest(x,z,[e]);
    if(!c||c.error>(section(e).innerHalfWidth+margin)**2||
       !info.bore&&profiles.lift(e,c.s)>-.001)return null;
    return height(e,c.s);
  }
  return {edges:edges.filter(e=>profiles.info(e)),at,height,section};
}

// Cut only fragments of terrain or water that intersect the road's vertical
// clearance. A hillside, river surface or street above the crown stays intact.
function createTunnelCut(T){
  const size=768,metres=2,canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const texture=new T.CanvasTexture(canvas);texture.flipY=false;texture.generateMipmaps=false;
  texture.minFilter=texture.magFilter=T.NearestFilter;
  const box={value:new T.Vector4(0,0,0,0)},map={value:texture},ctx=canvas.getContext('2d');
  function update(graph,zone,cx,cz){
    box.value.w=0;
    if(!zone?.edges.length)return;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,size,size);
    const span=size*metres,left=Math.floor(cx/metres)*metres-span/2,top=Math.floor(cz/metres)*metres-span/2;
    ctx.setTransform(1/metres,0,0,1/metres,-left/metres,-top/metres);
    ctx.lineCap='butt';
    for(const e of zone.edges){
      const info=graph.tunnels.info(e),section=zone.section(e);
      ctx.lineWidth=2*section.innerHalfWidth;
      for(const [lo,hi] of info.ranges)for(let j=1;j<e.dist.length;j++){
        const start=Math.max(lo,e.dist[j-1]),end=Math.min(hi,e.dist[j]);
        if(end<=start)continue;
        const a=e.points[j-1],b=e.points[j];
        if(Math.max(a.x,b.x)<left-25||Math.min(a.x,b.x)>left+span+25||
           Math.max(a.z,b.z)<top-25||Math.min(a.z,b.z)>top+span+25)continue;
        const n=Math.ceil((end-start)/8);
        let p=graph.sample({edge:e,dir:1,s:start});
        for(let k=1;k<=n;k++){
          const s=start+k*(end-start)/n,q=graph.sample({edge:e,dir:1,s});
          const h=zone.height(e,s-.5*(end-start)/n);
          const v=Math.max(0,Math.min(65535,Math.round(h*8)+32768));
          const cap=Math.min(255,Math.ceil(8*(info.bore?section.crown+.12:28)));
          ctx.strokeStyle='rgb('+(v>>8)+','+(v&255)+','+cap+')';
          ctx.beginPath();ctx.moveTo(p.x,p.z);ctx.lineTo(q.x,q.z);ctx.stroke();p=q;
        }
      }
    }
    box.value.set(left,top,1/span,1);texture.needsUpdate=true;
  }
  function shade(shader,xz){
    shader.uniforms.tunnelCutBox=box;shader.uniforms.tunnelCutMap=map;
    shader.vertexShader='varying float tunnelSceneY;\n'+shader.vertexShader.replace('#include <project_vertex>',
      'tunnelSceneY=(modelMatrix*vec4(transformed,1.)).y;\n#include <project_vertex>');
    shader.fragmentShader='varying float tunnelSceneY;uniform sampler2D tunnelCutMap;uniform vec4 tunnelCutBox;\n'+
      shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(tunnelCutBox.w>0.){
        vec2 uv=(${xz}-tunnelCutBox.xy)*tunnelCutBox.z;
        if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))){
          vec4 cut=texture2D(tunnelCutMap,uv);
          float floorY=(dot(floor(cut.rg*255.+.5),vec2(256.,1.))-32768.)*.125;
          if(cut.a>.45&&tunnelSceneY>floorY-.8&&tunnelSceneY<floorY+cut.b*31.875)discard;
        }
      }`);
  }
  return {update,shade};
}
