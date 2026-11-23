'use strict';

// Relative heights in metres. OSM layer specifies the order of decks. Surveyed
// deck elevations are generally unavailable in the national extract.
function buildBridgeProfiles(graph,details={}){
  const profiles=new Map(),levels=new Map(),grade=.095;
  const spans=[...graph.edges.values()].filter(edge=>edge.traffic?.bridge);
  // Layer 3 often marks a single flyover above a surface street. Count the
  // bridge decks actually crossing below each span, including stacked ramps.
  const layer=edge=>details[edge.id]?.layer??1,remaining=new Set(spans),chains=[];
  for(const first of spans){
    if(!remaining.delete(first))continue;
    const chain=[first];
    for(let i=0;i<chain.length;i++)for(const node of [chain[i].start,chain[i].end]){
      for(const next of graph.nodes.get(node)||[])if(layer(next)===layer(first)&&remaining.delete(next))chain.push(next);
    }
    chains.push(chain);
  }
  const grid=new Map();
  function crossingTier(chain){
    let tier=1;
    const sections=[];
    for(const edge of chain)for(let i=1;i<edge.points.length;i++){
      const a=edge.points[i-1],b=edge.points[i],dx=b.x-a.x,dz=b.z-a.z;
      const cells=new Set(),steps=Math.ceil(Math.hypot(dx,dz)/64);
      let px=Math.floor(a.x/64),pz=Math.floor(a.z/64);
      for(let k=1;k<=steps;k++){
        const x=Math.floor((a.x+dx*k/steps)/64),z=Math.floor((a.z+dz*k/steps)/64);
        for(let c=Math.min(px,x);c<=Math.max(px,x);c++)for(let r=Math.min(pz,z);r<=Math.max(pz,z);r++)cells.add(c+','+r);
        px=x;pz=z;
      }
      for(const cell of cells)for(const line of grid.get(cell)||[]){
        if(layer(line.edge)>=layer(edge)||line.edge.start===edge.start||line.edge.end===edge.end||
          line.edge.start===edge.end||line.edge.end===edge.start)continue;
        const det=dx*line.dz-dz*line.dx;
        if(Math.abs(det)<1e-5)continue;
        const x=line.a.x-a.x,z=line.a.z-a.z,t=(x*line.dz-z*line.dx)/det,u=(x*dz-z*dx)/det;
        if(t>=0&&t<=1&&u>=0&&u<=1)tier=Math.max(tier,line.tier+1);
      }
      sections.push({a,dx,dz,edge,cells});
    }
    for(const line of sections){
      line.tier=tier;
      for(const cell of line.cells){
        if(!grid.has(cell))grid.set(cell,[]);
        grid.get(cell).push(line);
      }
    }
    return tier;
  }
  function record(edge){
    let profile=profiles.get(edge.id);
    if(!profile){profile={bridge:false,layer:0,ranges:[]};profiles.set(edge.id,profile);}
    return profile;
  }
  function pinned(node){
    const links=graph.nodes.get(node)||[];
    return links.some(e=>e.traffic?.tunnel&&!e.traffic.bridge)||links.length!==2&&links.some(e=>!e.traffic?.bridge);
  }
  // A span may consist of many short ways or routing edges. Estimate the
  // clearance for the crossing as a whole and preserve explicitly stacked decks.
  for(const chain of chains.sort((a,b)=>layer(a[0])-layer(b[0]))){
    const tier=crossingTier(chain);
    let length=0,major=false,navigation=0;
    for(const edge of chain){
      length+=edge.length;
      const mid=graph.sample({edge,s:edge.length/2,dir:1});
      navigation=Math.max(navigation,window.VietnamBridgeSignatures?.clearance?.(graph,mid.x,mid.z)||0);
      major||=/^(?:motorway|trunk|primary)/.test(edge.kind)||/cầu vượt/i.test(edge.name);
    }
    const clearance=major?6.8:Math.min(6.8,1+length*.085);
    for(const edge of chain){
      const info=record(edge),extra=details[edge.id]||{};
      Object.assign(info,extra,{bridge:true,layer:extra.layer??1,ranges:[[0,edge.length]]});
      const terrainLift=Number.isFinite(extra.terrainLift)?extra.terrainLift:clearance;
      info.top=info.structure==='low_water_crossing'||info.structure==='floating'?.55:
        Math.max(.8,navigation,terrainLift+(tier-1)*6.8);
      for(const node of [edge.start,edge.end]){
        if(!pinned(node))levels.set(node,Math.max(levels.get(node)||0,info.top));
      }
    }
  }
  return solveRoadGrades(graph,profiles,levels,grade,pinned,e=>!e.traffic?.tunnel,record);
}

// Shared by elevated decks and descending tunnel approaches. All displacements
// are magnitudes here; the caller places them above or below the natural surface.
function solveRoadGrades(graph,profiles,levels,grade,pinned,eligible,record){
  const spans=new Set(profiles.keys());
  // Carry approaches along the connected carriageway only. A surface junction
  // pins the road back to grade. A geometric crossing is never a graph node.
  const queue=[...levels.keys()];
  for(let i=0;i<queue.length;i++){
    const node=queue[i],h=levels.get(node);
    for(const edge of graph.nodes.get(node)||[]){
      if(spans.has(edge.id)||!eligible(edge))continue;
      record(edge,node);
      const other=node===edge.start?edge.end:edge.start,next=h-(profiles.get(edge.id).grade??grade)*edge.length;
      if(next>(levels.get(other)||0)+1e-6&&!pinned(other)){
        levels.set(other,next);queue.push(other);
      }
    }
  }
  // Bound grades through consecutive short edges, including transitions
  // between two signed OSM layers at a motorway interchange.
  const relax=[];
  function limit(node,h){
    if(h+1e-6<(levels.get(node)||0)){levels.set(node,h);relax.push(node);}
  }
  for(const id of profiles.keys()){
    const e=graph.edges.get(id),rise=e.length*(profiles.get(id).grade??grade);
    limit(e.start,(levels.get(e.end)||0)+rise);
    limit(e.end,(levels.get(e.start)||0)+rise);
  }
  for(let i=0;i<relax.length;i++){
    const node=relax[i];
    for(const e of graph.nodes.get(node)||[])if(profiles.has(e.id))
      limit(node===e.start?e.end:e.start,levels.get(node)+(profiles.get(e.id).grade??grade)*e.length);
  }
  for(const [id,p] of profiles){
    const e=graph.edges.get(id);
    p.start=levels.get(e.start)||0;p.end=levels.get(e.end)||0;
    if(spans.has(id))continue;
    const slope=p.grade??grade,a=Math.min(e.length,p.start/slope),b=Math.max(0,e.length-p.end/slope);
    if(a>=b)p.ranges=[[0,e.length]];
    else{
      if(a>0)p.ranges.push([0,a]);
      if(b<e.length)p.ranges.push([b,e.length]);
    }
    if(!p.ranges.length)profiles.delete(id);
  }
  function lift(edge,s){
    const p=profiles.get(edge.id);
    if(!p)return 0;
    const a=Math.max(0,Math.min(edge.length,s)),b=edge.length-a;
    if(a===0)return p.start;
    if(b===0)return p.end;
    const slope=p.grade??grade,approach=Math.max(0,p.start-slope*a,p.end-slope*b);
    return spans.has(edge.id)?Math.max(approach,Math.min(p.top,p.start+slope*a,p.end+slope*b)):approach;
  }
  return {profiles,lift};
}

// The ordinary terrain road builder still owns the portion of a long approach
// beyond the ramp. Its endpoints agree with the mesh and physics profiles.
function bridgeGroundEdges(graph,edges){
  const result=[];
  for(const edge of edges){
    const profile=graph.bridges?.profiles.get(edge.id)||graph.tunnels?.info(edge);
    if(!profile){result.push(edge);continue;}
    let from=0;
    for(const [lo,hi] of [...profile.ranges,[edge.length,edge.length]]){
      if(lo-from>.01){
        const points=[graph.sample({edge,s:from,dir:1})];
        for(let i=1;i<edge.dist.length-1;i++)if(edge.dist[i]>from&&edge.dist[i]<lo)points.push(edge.points[i]);
        points.push(graph.sample({edge,s:lo,dir:1}));
        result.push({...edge,points,controls:edge.controls?.filter(point=>point.s>=from&&point.s<=lo),
          sourceEdge:edge});
      }
      from=hi;
    }
  }
  return result;
}

// Lengths of the scenery meshes already authored for these individual bridges.
// Only their occupied deck footprint suppresses the standard rail and pier kit.
const modeledBridgeLengths={'cau-rong':636,'cau-truong-tien':402,'cau-nhat-le':635,'cau-da-cua-dong-dong-hoi':39,
  'cau-song-han':260,'cau-tran-thi-ly':320,'cau-thuan-phuoc':360,'cau-treo-kon-klor':215,
  'cau-cua-hoi':360,'cau-ben-thuy':230,'cau-yen-xuan':230,'cau-ham-rong':164};

function createBridgeDistrict(graph,edges,cx,cz,ground){
  const info=edge=>graph.bridges.profiles.get(edge.id);
  const raised=edges.filter(info),origins=new Map();
  function height(edge,s){
    const p=graph.sample({edge,s,dir:1}),profile=info(edge);
    if(!profile?.bridge)return ground(p.x,p.z)+graph.bridges.lift(edge,s);
    if(!origins.has(edge.id)){
      const a=edge.points[0],b=edge.points.at(-1);
      origins.set(edge.id,[ground(a.x,a.z),ground(b.x,b.z)]);
    }
    const [a,b]=origins.get(edge.id);
    return a+(b-a)*s/edge.length+graph.bridges.lift(edge,s);
  }
  function at(x,z,edge){
    if(!edge||!info(edge))return null;
    const cursor=graph.nearest(x,z,[edge]);
    if(!cursor||cursor.error>(worldRoadHalfWidth(edge)+.65)**2)return null;
    if(!info(edge).bridge&&graph.bridges.lift(edge,cursor.s)<=.001)return null;
    return height(edge,cursor.s);
  }
  const models=[];
  for(const data of window.VietnamLandmarks?.entries||[]){
    const length=modeledBridgeLengths[data.id];
    if(!length||!data.build)continue;
    const p=graph.point(data.lon,data.lat);
    if(Math.hypot(p.x-cx,p.z-cz)>2200)continue;
    models.push({...p,data,length,cos:Math.cos(data.yaw),sin:Math.sin(data.yaw)});
  }
  function authoredAt(edge,s){
    if(!models.length||!info(edge)?.bridge)return false;
    const p=graph.sample({edge,s,dir:1});
    return models.some(m=>{
      const dx=p.x-m.x,dz=p.z-m.z;
      return Math.abs(dx*m.cos-dz*m.sin)<m.length/2&&Math.abs(dx*m.sin+dz*m.cos)<m.data.depth/2+2;
    });
  }
  function signatureHeight(x,z,ux,uz){
    let best=null;
    for(const e of graph.nearby(x,z,50)){
      if(!info(e)?.bridge)continue;
      const c=graph.nearest(x,z,[e]);
      if(!c||c.error>=(worldRoadHalfWidth(e)+30)**2||best&&c.error>=best.error)continue;
      if(ux!==undefined){
        const {yaw}=graph.sample(c);
        if(Math.abs(Math.sin(yaw)*ux-Math.cos(yaw)*uz)<.82)continue;
      }
      best=c;
    }
    return best?height(best.edge,best.s):null;
  }
  const footbridges=[],seen=new Set(),[west,north]=graph.geo(cx-900,cz-900),[east,south]=graph.geo(cx+900,cz+900);
  for(let i=Math.floor(west*4);i<=Math.floor(east*4);i++)for(let j=Math.floor(south*4);j<=Math.floor(north*4);j++){
    for(const [id,kind,layer,width,coords] of graph.footbridgeTiles[i+'_'+j]||[]){
      if(seen.has(id))continue;
      seen.add(id);
      const points=[];
      for(let n=0;n<coords.length;n+=2)points.push(graph.point(coords[n]/1e5,coords[n+1]/1e5));
      footbridges.push({id,kind,layer,width,points});
    }
  }
  return {edges:raised,bridgeInfo:info,height,at,authoredAt,signatureHeight,footbridges};
}
