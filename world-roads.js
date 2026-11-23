'use strict';
// Pine avenue at Biển Hồ Chè (w741701067). The paved road is about 6.8 m
// wide between the two earth shoulders. Use OSM junctions across tile splits.
(globalThis.VietnamRoadWidths??=new Map()).set('6943315929:7799883179',3.4);
// The lane outside Bửu Minh is about 5.1 m across at both gates, with earth
// shoulders. Its tertiary classification alone would produce a much wider road.
globalThis.VietnamRoadWidths.set('7650858866:7650873693',2.55);
async function fetchMapTile(url){
 const response=await fetch(url);
 if(!response.ok)throw Error('Không tải được vùng bản đồ.');
 return RoadTileCodec.decode(await RoadTileCodec.content(response));
}
// Keep only the tiles around the current drive. OSM node IDs, rather than coordinates,
// connect edges so an overpass does not accidentally become a turn.
class VietnamRoads {
 constructor(index,lon,lat){
   this.readRows=RoadTileCodec.roadRows(index);
   this.available=new Set([...index.tiles,...(index.sightAccess?.addedParents||[])]);
   this.splits=index.splits||{};this.subtiles=new Set([...(index.subtiles||[]),...(index.sightAccess?.addedSubtiles||[])]);
   this.visitorEdges=new Set(Object.values(index.sightAccess?.stops||{}).map(stop=>stop[0]));
   this.remote=index.tileBase;this.local=new Set(index.localTiles||[]);this.lon=lon;this.lat=lat;
   this.trafficTiles=new Set(index.trafficTiles||[]);
   this.bridgeDetails=index.bridgeDetails||{};
   this.footbridgeTiles=index.footbridgeTiles||{};
   this.tunnelData=index.tunnelData;
   this.mx=111320*Math.cos(lat*Math.PI/180);this.my=110900;
   this.cache=new Map();this.edges=new Map();this.nodes=new Map();this.buckets=new Map();
   this.turnOptions=new Map();this.edgeCells=new WeakMap();this.stamp=0;
 }
 point(lon,lat){return {x:(lon-this.lon)*this.mx,z:(this.lat-lat)*this.my};}
 geo(x,z){return [this.lon+x/this.mx,this.lat-z/this.my];}
 decodeEdge([id,start,end,name,kind,oneway,coords]){
   const points=[],dist=[];let length=0,minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
   for(let i=0;i<coords.length;i+=2){
     const p=this.point(coords[i]/100000,coords[i+1]/100000),last=points.at(-1);
     if(last){const d=Math.hypot(last.x-p.x,last.z-p.z);if(d<.1)continue;length+=d;}
     points.push(p);dist.push(length);
     minX=Math.min(minX,p.x);minZ=Math.min(minZ,p.z);maxX=Math.max(maxX,p.x);maxZ=Math.max(maxZ,p.z);
   }
   if(length<.5)return null;
   const edge={id,start,end,name,kind,oneway:Boolean(oneway),points,dist,length,minX,minZ,maxX,maxZ,visitorRoad:this.visitorEdges.has(id)};
   if(kind==='service'||kind==='residential'||kind==='tertiary')edge.authoredHalfWidth=globalThis.VietnamRoadWidths.get(Math.min(start,end)+':'+Math.max(start,end));
   return edge;
 }
 async tile(key){
   if(!this.cache.has(key)){
     const pending=(async()=>{
       const base=this.remote&&!this.local.has(key)?this.remote:'vn-roads/';
       const [rows,details]=await Promise.all([this.readRows(key,base,fetchMapTile),this.trafficTiles.has(key)
         ?fetchMapTile('vn-traffic/'+key+'.gz').catch(()=>null):undefined]);
       if(details===null)this.cache.delete(key);
       return {rows,details};
     })().catch(e=>{this.cache.delete(key);throw e;});
     this.cache.set(key,pending);
   }return this.cache.get(key);
 }
 async load(x,z,wide=false){
   const [lon,lat]=this.geo(x,z),r=wide?.13:.022,keys=[];
   for(let a=Math.floor((lon-r)*4);a<=Math.floor((lon+r)*4);a++)
     for(let b=Math.floor((lat-r)*4);b<=Math.floor((lat+r)*4);b++){
       const key=a+'_'+b;if(!this.available.has(key))continue;
       const split=this.splits[key];
       if(!split){keys.push(key);continue;}
       for(let i=Math.max(0,Math.floor(((lon-r)*4-a)*split));i<=Math.min(split-1,Math.floor(((lon+r)*4-a)*split));i++)
         for(let j=Math.max(0,Math.floor(((lat-r)*4-b)*split));j<=Math.min(split-1,Math.floor(((lat+r)*4-b)*split));j++){
           const part=key+'_'+i+'_'+j;if(this.subtiles.has(part))keys.push(part);
         }
     }
   const signature=keys.join(','),stamp=++this.stamp;if(this.signature===signature)return;
   const tiles=await Promise.all(keys.map(k=>this.tile(k)));
   if(stamp!==this.stamp)return;
   const fresh=new Map(),nodes=new Map(),buckets=new Map(),updatedTags=[];
   const streaming=this.edges.size>0;
   let rowsSeen=0,deadline=performance.now()+3;
   const trafficById=new Map();
   for(const {details} of tiles)if(details)for(const [id,tags] of Object.entries(details))trafficById.set(Number(id),tags);
   for(const {rows} of tiles)for(const row of rows){
     if(streaming&&(++rowsSeen&63)===0&&performance.now()>=deadline){
       if(globalThis.scheduler?.yield)await scheduler.yield();
       else await new Promise(resolve=>setTimeout(resolve,0));
       if(stamp!==this.stamp)return;
       deadline=performance.now()+3;
     }
     const [id,start,end]=row;if(fresh.has(id))continue;
     let edge=this.edges.get(id);
     if(!edge){
       edge=this.decodeEdge(row);if(!edge)continue;
     }
     if(!edge.traffic&&trafficById.has(id)){
       const traffic=trafficById.get(id);
       const controls=(traffic.controls||[]).map(([node,lon,lat,flags,direction])=>{
         const p=this.point(lon/1e5,lat/1e5);
         const s=node===start?0:node===end?edge.length:this.nearest(p.x,p.z,[edge]).s;
         return {node,s,flags,direction};
       });
       if(this.edges.has(id))updatedTags.push({edge,traffic,controls});
       else Object.assign(edge,{traffic,controls});
     }
     fresh.set(id,edge);
     for(const n of new Set([start,end])){if(!nodes.has(n))nodes.set(n,[]);nodes.get(n).push(edge);}
     // Sample a long straight segment too, so the spatial index covers its middle.
     let cells=this.edgeCells.get(edge);
     if(!cells){
       cells=new Set();
       for(let i=1;i<edge.points.length;i++){
         const a=edge.points[i-1],b=edge.points[i],count=Math.ceil((edge.dist[i]-edge.dist[i-1])/120);
         for(let j=0;j<=count;j++){const f=j/count;cells.add(Math.floor((a.x+(b.x-a.x)*f)/300)+','+Math.floor((a.z+(b.z-a.z)*f)/300));}
       }
       this.edgeCells.set(edge,cells);
     }
     for(const k of cells){if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(edge);}
   }
   // Existing cursors can still be using these edges while a replacement is being built.
   for(const {edge,traffic,controls} of updatedTags)Object.assign(edge,{traffic,controls});
   this.edges=fresh;this.nodes=nodes;this.buckets=buckets;
   this.turnOptions.clear();this.lastNearby=null;
   this.bridges=buildBridgeProfiles(this,this.bridgeDetails);
   this.tunnels=buildTunnelProfiles(this,this.tunnelData);
   this.signature=tiles.some(tile=>tile.details===null)?null:signature;
   for(const k of this.cache.keys())if(!keys.includes(k))this.cache.delete(k);
 }
 nearby(x,z,r){
   const left=Math.floor((x-r)/300),right=Math.floor((x+r)/300),top=Math.floor((z-r)/300),bottom=Math.floor((z+r)/300);
   if(left===right&&top===bottom)return this.buckets.get(left+','+top)||[];
   const last=this.lastNearby;
   if(last&&last.left===left&&last.right===right&&last.top===top&&last.bottom===bottom)return last.edges;
   const unique=new Set();
   for(let a=left;a<=right;a++)
     for(let b=top;b<=bottom;b++)
       for(const e of this.buckets.get(a+','+b)||[])unique.add(e);
   const edges=[...unique];
   this.lastNearby={left,right,top,bottom,edges};return edges;
 }
 roadLevel(edge,s){
   return this.tunnels?.info(edge)?this.tunnels.lift(edge,s):this.bridges.lift(edge,s);
 }
 nearest(x,z,candidates=this.edges.values(),level=null){
   let best=null,bestScore=Infinity;
   for(const edge of candidates){
     const dx=Math.max(0,edge.minX-x,x-edge.maxX),dz=Math.max(0,edge.minZ-z,z-edge.maxZ);
     if(dx*dx+dz*dz>=bestScore)continue;
     for(let i=1;i<edge.points.length;i++){
       const a=edge.points[i-1],b=edge.points[i],vx=b.x-a.x,vz=b.z-a.z;
       const f=Math.max(0,Math.min(1,((x-a.x)*vx+(z-a.z)*vz)/(vx*vx+vz*vz)));
       const error=(a.x+vx*f-x)**2+(a.z+vz*f-z)**2;
       if(error>=bestScore)continue;
       const s=edge.dist[i-1]+f*(edge.dist[i]-edge.dist[i-1]);
       const vertical=level===null?0:this.roadLevel(edge,s)-level;
       if(level!==null&&Math.abs(vertical)>2.5)continue;
       const score=error+vertical*vertical*4;
       if(score<bestScore){bestScore=score;best={edge,s,dir:1,error};}
     }
   }return best;
 }
 sample(c,lane=0){
   const {edge,s,dir}=c,d=Math.max(0,Math.min(s,edge.length));
   let lo=0,hi=edge.dist.length-1;
   while(hi-lo>1){const m=(hi+lo)>>1;if(edge.dist[m]<=d)lo=m;else hi=m;}
   const a=edge.points[lo],b=edge.points[hi],f=(d-edge.dist[lo])/(edge.dist[hi]-edge.dist[lo]);
   const yaw=Math.atan2((b.x-a.x)*dir,(a.z-b.z)*dir);
   return {x:a.x+(b.x-a.x)*f+Math.cos(yaw)*lane,z:a.z+(b.z-a.z)*f+Math.sin(yaw)*lane,yaw};
 }
 allows(c,node,edge,dir){
   const rules=c.edge.traffic?.turns;
   if(!rules)return true;
   const mode=c.kind==='scooter'?2:1;
   let mandatory=false,allowed=false;
   for(const [,via,target,type,mask] of rules){
     if(via!==node||!(mask&mode))continue;
     let matches=edge.traffic?.way===target;
     if(matches&&target===c.edge.traffic.way&&type.endsWith('_u_turn'))matches=edge.id===c.edge.id&&dir===-c.dir;
     if(type.startsWith('only_')){mandatory=true;allowed||=matches;}
     else if(matches)return false;
   }
   return !mandatory||allowed;
 }
 options(c){
   // Heading and turn restrictions depend on the incoming edge, direction and vehicle class.
   const key=c.edge.id+':'+c.dir+(c.kind==='scooter'?':bike':'');
   const cached=this.turnOptions.get(key);
   if(cached)return cached;
   const node=c.dir>0?c.edge.end:c.edge.start,base=this.sample({...c,s:c.dir>0?c.edge.length:0}).yaw,list=[];
   for(const edge of this.nodes.get(node)||[])for(const dir of [1,-1]){
     if(dir<0&&edge.oneway||edge.id===c.edge.id&&dir===-c.dir)continue;
     if((dir>0?edge.start:edge.end)!==node)continue;
     if(!this.allows(c,node,edge,dir))continue;
     const next={edge,dir,s:dir>0?0:edge.length};
     const turn=this.sample(next).yaw-base;
     list.push({...next,angle:Math.atan2(Math.sin(turn),Math.cos(turn))});
   }
   list.sort((a,b)=>Math.abs(a.angle)-Math.abs(b.angle));
   this.turnOptions.set(key,list);return list;
 }
 advance(c,meters,choose){
   let moved=0;
   while(meters>0){
     const left=c.dir>0?c.edge.length-c.s:c.s;
     const step=Math.min(meters,Math.max(0,left));c.s+=c.dir*step;meters-=step;moved+=step;
     if(meters<=.00001)break;
     const options=this.options(c);
     let next=options.length?choose(options):null;
     const node=c.dir>0?c.edge.end:c.edge.start;
     if(!next&&!c.edge.oneway&&this.allows(c,node,c.edge,-c.dir))next={edge:c.edge,s:c.s,dir:-c.dir};
     if(!next)break;
     Object.assign(c,{edge:next.edge,dir:next.dir,s:next.s});
   }return moved;
 }
}
class VietnamWater {
 constructor(index,roads){this.tiles=new Set(index.tiles);this.cache=new Map();this.roads=roads;this.features=[];this.request=0;}
 async load(x,z){
   const request=++this.request,[lon,lat]=this.roads.geo(x,z),keys=[];
   const dx=1850/this.roads.mx,dy=1850/this.roads.my;
   for(let a=Math.floor((lon-dx)*4);a<=Math.floor((lon+dx)*4);a++)
     for(let b=Math.floor((lat-dy)*4);b<=Math.floor((lat+dy)*4);b++){const k=a+'_'+b;if(this.tiles.has(k))keys.push(k);}
   const sig=keys.join('/');if(this.signature===sig)return false;
   const rows=await Promise.all(keys.map(k=>{
     if(!this.cache.has(k))this.cache.set(k,fetchMapTile('vn-water/'+k+'.gz').catch(e=>{this.cache.delete(k);throw e;}));
     return this.cache.get(k);
   }));
   if(request!==this.request)return false;
   const features=[],seen=new Set();
   for(const tile of rows)for(const [kind,name,coords,mappedWidth] of tile){
     const key=kind+'|'+name+'|'+(mappedWidth||0)+'|'+coords.join(',');
     if(seen.has(key))continue;seen.add(key);
     const points=[];let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;
     for(let i=0;i<coords.length;i+=2){const p=this.roads.point(coords[i]/1e5,coords[i+1]/1e5);points.push(p);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);z0=Math.min(z0,p.z);z1=Math.max(z1,p.z);}
     const width=mappedWidth||(kind==='stream'?4:kind==='canal'?8:kind==='drain'?2.5:
       kind==='river'?(/suối/i.test(name)?8:23):0);
     features.push({kind,name,width,points,x0,z0,x1,z1});
   }
   this.features=features;this.signature=sig;
   for(const k of this.cache.keys())if(!keys.includes(k))this.cache.delete(k);
   return true;
 }
 nearby(x,z){return this.features.filter(f=>f.x1>x-720&&f.x0<x+720&&f.z1>z-720&&f.z0<z+720);}
}
