'use strict';
// Two racers share a rolling itinerary. Distance along it distinguishes overlapping
// roads and successive visits to the same junction.
class RollingDuel {
 constructor(graph,start){
   this.graph=graph;this.path=[];this.visits=new Map();this.length=0;this.player=0;this.opponent=8;
   this.speed=0;this.gate=1200;this.wins=0;this.round=1;
   this.actor={id:'pace-rival',kind:'rival',speed:0,x:0,z:0,yaw:0};
   this.append(start);this.ensure(125);this.pose();
 }
 append(cursor){
   const length=cursor.dir>0?cursor.edge.length-cursor.s:cursor.s;
   const segment={...cursor,from:this.length,to:this.length+Math.max(0,length)};
   this.path.push(segment);this.length=segment.to;
   this.visits.set(cursor.edge.id,this.length);
   if(this.visits.size>220)this.visits.delete(this.visits.keys().next().value);
 }
 ensure(until){
   for(let i=0;this.length<until&&i<600;i++){
     const last=this.path.at(-1),options=this.graph.options(last);
     if(!options.length){
       if(last.edge.oneway)break;
       this.append({edge:last.edge,s:last.dir>0?last.edge.length:0,dir:-last.dir});continue;
     }
     // Prefer a through road, but avoid recently visited loops and one-way cul-de-sacs.
     const cost=o=>{
       const seen=this.visits.get(o.edge.id);
       return Math.abs(o.angle)+(seen!==undefined?Math.max(0,4-(this.length-seen)/220):0)+
         (o.edge.oneway&&!this.graph.options(o).length?8:0)+(last.edge.name&&last.edge.name===o.edge.name?-.2:0);
     };
     let pick=options[0],best=cost(pick);for(const item of options.slice(1)){const n=cost(item);if(n<best){pick=item;best=n;}}
     this.append(pick);
   }
 }
 at(m){
   let lo=0,hi=this.path.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(this.path[mid].to<m)lo=mid+1;else hi=mid;}
   const entry=this.path[lo];return {edge:entry.edge,dir:entry.dir,s:entry.s+entry.dir*Math.max(0,Math.min(entry.to,m)-entry.from)};
 }
 pose(){
   const c=this.at(this.opponent),lane=Math.min(worldRoadHalfWidth(c.edge)*.48,2.2);
   Object.assign(this.actor,this.graph.sample(c,lane),{edge:c.edge,deckLift:this.graph.roadLevel(c.edge,c.s),speed:this.speed});
 }
 move(cursor,traveled,dt,traffic){
   this.ensure(Math.max(this.player,this.opponent)+150);
   const start=this.player;
   let nearest=null;
   for(const entry of this.path){
     if(entry.edge.id!==cursor.edge.id||cursor.error>(worldRoadHalfWidth(entry.edge)+1)**2)continue;
     const progress=entry.from+(cursor.s-entry.s)*entry.dir;
     if(progress<entry.from-.2||progress>entry.to+.2||Math.abs(progress-start)>35)continue;
     if(nearest===null||Math.abs(progress-start)<Math.abs(nearest-start))nearest=progress;
   }
   this.offCourse=nearest===null;
   if(nearest!==null)this.player=Math.max(0,start+clamp(nearest-start,-traveled*1.3,traveled*1.3));
   const current=this.at(this.opponent),a=this.graph.sample(current),b=this.graph.sample(this.at(this.opponent+18));
   const bend=Math.abs(Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw)));
   const gap=this.opponent-this.player;let target=clamp(21-gap*.075,13,29)*Math.max(.43,1-bend*.39);
   const fx=Math.sin(this.actor.yaw),fz=-Math.cos(this.actor.yaw);
   for(const n of traffic){
     if(Math.abs(n.deckLift-this.actor.deckLift)>2.5)continue;
     const x=n.x-this.actor.x,z=n.z-this.actor.z,front=x*fx+z*fz;
     if(front>0&&front<12&&Math.abs(x*fz-z*fx)<1.7)target=Math.min(target,Math.max(2,n.speed+(front-6)*.6));
   }
   if(this.actor.recoil?.braking)target=0;
   this.speed+=clamp(target-this.speed,-11*dt,5.8*dt);
   if(this.opponent-this.player>125)this.speed=Math.max(0,this.speed-14*dt);
   this.opponent=Math.min(this.length,this.opponent+this.speed*dt);this.pose();DriveBody.advanceRecoil(this.actor,dt);
   const kick=this.actor.recoil;if(kick){this.actor.x+=kick.x;this.actor.z+=kick.z;this.actor.yaw+=kick.angle;}
   while(this.path.length>2&&this.path[0].to<Math.min(this.player,this.opponent)-40)this.path.shift();
   return this.player-start;
 }
 nextAt(node){
   return this.path.find((entry,i)=>i>0&&entry.from>=this.player-.01&&(entry.dir>0?entry.edge.start:entry.edge.end)===node);
 }
}
