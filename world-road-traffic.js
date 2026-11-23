'use strict';

function roadSpeedLimit(cursor){
  const speed=cursor.edge.traffic?.speed;
  return Array.isArray(speed)?speed[cursor.dir>0?0:1]:speed;
}

function roadSurfaceClass(edge){
  const tag=edge.traffic?.surface;
  if(!tag)return 'asphalt';
  if(tag==='concrete:plates')return 'roadSlabs';
  if(/^(concrete(?::lanes)?|cement|bê_tông)$/.test(tag))return 'roadConcrete';
  if(/^(unpaved|gravel|fine_gravel|compacted|dirt|earth|ground|sand|mud|soil|clay|rock|grass|pebblestone)$/.test(tag))return 'earth';
  if(/^(paving_stones|sett|cobblestone|unhewn_cobblestone|grass_paver)$/.test(tag))return 'pavers';
  if(tag==='wood')return 'roadWood';
  if(tag==='metal'||tag==='steel')return 'roadMetal';
  return 'asphalt';
}

function roadLaneLayout(edge,halfWidth){
  const mapped=edge.traffic?.lanes;
  const lanes=mapped??(edge.oneway?Math.max(1,Math.round(halfWidth/1.75)):halfWidth<2.7?1:halfWidth>=6.75?4:2);
  // With an odd two-way count and no directional split the middle lane's use
  // is unknown. Keep traffic in the known outer lanes and omit ambiguous paint.
  const forward=edge.oneway?lanes:edge.traffic?.forward??Math.floor(lanes/2);
  const divider=edge.oneway?0:lanes===1||lanes%2&&!edge.traffic?.forward?null:lanes-forward;
  const surface=roadSurfaceClass(edge);
  const markEdges=(surface==='asphalt'||surface==='roadConcrete'||surface==='roadSlabs')&&Boolean(mapped||halfWidth>=4.2||edge.graded);
  return {lanes,divider,forward,markEdges};
}

function roadLaneOffset(cursor,scooter=false){
  const {edge,dir}=cursor,half=worldRoadHalfWidth(edge);
  const {lanes,forward,divider}=roadLaneLayout(edge,half);
  if(lanes===1)return edge.oneway?0:half*.43;
  const count=dir>0||divider===null?forward:lanes-forward;
  return half-2*half/lanes*(scooter ? .5 : Math.min(count,2)-.5);
}

function signalStopLineOffset(control){return control.flags&2?2.5:1.4;}

// Emit paint clipped to this piece of the original OSM edge. A dash or a
// crossing that spans two polyline segments keeps its phase through the bend.
function roadPaint(edge,layout,half,from,to,emit,{lines=true,controls=true}={}){
  function band(start,end,left,right,color){
    const lo=Math.max(from,start),hi=Math.min(to,end);
    if(hi>lo&&right>left)emit(lo,hi,left,right,color);
  }
  if(lines&&layout.markEdges){
    for(const side of [-1,1]){
      const offset=side*(half-.23);
      band(from,to,offset-.055,offset+.055,'white');
    }
    for(let lane=1;lane<layout.lanes;lane++){
      if(layout.divider===null&&(lane===layout.forward||lane===layout.forward+1))continue;
      const offset=half*(2*lane/layout.lanes-1);
      const color=lane===layout.divider?'yellow':'white';
      for(let s=Math.floor(from/10)*10;s<to;s+=10)band(s,s+3.8,offset-.07,offset+.07,color);
    }
  }
  if(!controls)return;
  for(const point of edge.controls||[]){
    if(point.s<from-3||point.s>to+3)continue;
    if(point.flags&2){
      for(let offset=-half+.3;offset<half-.3;offset+=.85){
        band(point.s-1.65,point.s+1.65,offset,Math.min(half-.2,offset+.43),'white');
      }
    }
    if(!(point.flags&4))continue;
    const dividingOffset=layout.divider===null?0:half*(2*layout.divider/layout.lanes-1);
    for(const dir of edge.oneway?[1]:[1,-1]){
      if(!signalApplies(point,edge,dir))continue;
      const stop=point.s-dir*signalStopLineOffset(point);
      const left=edge.oneway||dir<0?-half:dividingOffset, right=dir>0?half:dividingOffset;
      band(stop-.17,stop+.17,left+.13,right-.13,'white');
    }
  }
}

// Perpendicular approaches alternate, opposite approaches share a phase.
// The clock is simulated and shared by the lenses, the HUD and the vehicles.
function roadSignalPhase(yaw,seconds){
  // Resolve exactly diagonal axes consistently for both travel directions.
  const axis=Math.cos(2*yaw);
  const first=Math.abs(axis)<1e-9?Math.sin(2*yaw)>0:axis>0;
  const phase=(seconds+(first?0:28))%56;
  return phase<23?'green':phase<26?'amber':'red';
}

function signalApplies(control,edge,dir){
  return (control.flags&4)&&(!control.direction||control.direction===dir)
    &&(dir>0?control.s:edge.length-control.s)>.05;
}

function roadControlAhead(graph,cursor,seconds,signalsOnly=false){
  let c=cursor,travelled=0;
  const visited=new Set();
  while(travelled<65&&!visited.has(c.edge.id)){
    visited.add(c.edge.id);
    let best=null;
    for(const point of c.edge.controls||[]){
      const distance=travelled+(point.s-c.s)*c.dir;
      if(distance<-.05||distance>65||(best&&best.distance<=distance))continue;
      const signal=signalApplies(point,c.edge,c.dir);
      if(!signal&&(signalsOnly||!(point.flags&1)))continue;
      const yaw=graph.sample({edge:c.edge,dir:c.dir,s:point.s}).yaw;
      best={distance,phase:signal?roadSignalPhase(yaw,seconds):null,stopLineOffset:signal?signalStopLineOffset(point):0};
    }
    if(best)return best;
    travelled+=c.dir>0?c.edge.length-c.s:c.s;
    if(travelled>=65)break;
    const options=graph.options(c);
    if(options.length!==1)break;
    c={...options[0],kind:cursor.kind};
  }
  return null;
}

function createMappedTrafficLights(T,scene,small){
  const capacity=small?48:96;
  const material=new T.MeshLambertMaterial({color:0x353b3b});
  const poles=new T.InstancedMesh(new T.CylinderGeometry(.075,.095,1,7),material,capacity);
  const heads=new T.InstancedMesh(new T.BoxGeometry(.48,1.28,.34),material,capacity);
  const bulbs=new T.InstancedMesh(new T.SphereGeometry(.156,small?6:10,small?4:8),new T.MeshBasicMaterial(),capacity*3);
  const pose=new T.Object3D(),color=new T.Color();
  const objects=[poles,heads,bulbs],phases=['red','amber','green'];
  const lit=[0xff312a,0xffb825,0x2afb70],dim=[0x482221,0x45371f,0x183d2b];
  for(const mesh of objects){mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);}
  let active=[],lastTick=-1;
  function update(seconds){
    const tick=Math.floor(seconds);
    if(lastTick===tick)return;
    lastTick=tick;
    active.forEach(({yaw},i)=>{
      const phase=roadSignalPhase(yaw,seconds);
      phases.forEach((name,j)=>bulbs.setColorAt(3*i+j,color.setHex(name===phase?lit[j]:dim[j])));
    });
    if(bulbs.instanceColor)bulbs.instanceColor.needsUpdate=true;
  }
  function place(mesh,i,x,y,z,height,yaw){
    pose.position.set(x,y,z);pose.scale.set(1,height,1);pose.rotation.set(0,-yaw,0);
    pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
  }
  function rebuild(graph,edges,cx,cz,ground,roadsAt,siteClear){
    const candidates=[];
    for(const edge of edges)for(const point of edge.controls||[]){
      for(const dir of edge.oneway?[1]:[1,-1]){
        if(!signalApplies(point,edge,dir))continue;
        const p=graph.sample({edge,dir,s:point.s},worldRoadHalfWidth(edge)+.65);
        const x=p.x-cx,z=p.z-cz,distance=Math.hypot(x,z);
        if(distance<450)candidates.push({yaw:p.yaw,distance,node:point.node,edge,dir,s:point.s});
      }
    }
    function roadside(p){
      const half=worldRoadHalfWidth(p.edge);
      // Prefer the far right corner so the signal stays visible from the stop line.
      // A mapped approach often ends at the centre; project its last tangent across the junction.
      for(const extra of [0,2,5])for(const lead of [0,3,6,10,15,22,32,-3,-6,-10,-15,-22,-32]){
        const station=p.s+lead*p.dir,s=Math.max(0,Math.min(p.edge.length,station));
        if(lead<0&&s!==station)continue;
        const at=graph.sample({edge:p.edge,dir:p.dir,s},half+.75+extra);
        const beyond=(station-s)*p.dir;
        at.x+=Math.sin(at.yaw)*beyond;at.z-=Math.cos(at.yaw)*beyond;
        const x=at.x-cx,z=at.z-cz,y=ground(at.x,at.z,p.edge,s);
        const overlaps=roadsAt(x,z).some(road=>{
          const along=Math.max(0,Math.min(road.len,(x-road.ax)*road.fx+(z-road.az)*road.fz));
          if(Math.hypot(x-road.ax-road.fx*along,z-road.az-road.fz*along)>=road.w+.45)return false;
          const roadY=ground(at.x,at.z,road.source,road.station+along);
          return Math.abs(y-roadY)<4.5;
        });
        if(!overlaps&&siteClear(at.x,at.z,y,p.edge))return {x,y,z,yaw:at.yaw};
      }
    }
    active=[];
    for(const p of candidates.sort((a,b)=>a.distance-b.distance)){
      if(active.length===capacity)break;
      if(active.some(q=>p.node===q.node&&Math.cos(p.yaw-q.yaw)>.86))continue;
      const site=roadside(p);
      if(!site)continue;
      const {x,y,z,yaw}=site,i=active.length;
      active.push(p);place(poles,i,x,y+1.65,z,3.3,yaw);place(heads,i,x,y+3.65,z,1,yaw);
      for(let j=0;j<3;j++)place(bulbs,3*i+j,x-.19*Math.sin(yaw),y+4.03-j*.38,z+.19*Math.cos(yaw),1,yaw);
    }
    poles.count=heads.count=active.length;bulbs.count=3*active.length;
    for(const mesh of objects)mesh.instanceMatrix.needsUpdate=true;
    lastTick=-1;update(performance.now()/1000);
  }
  return {rebuild,update};
}
