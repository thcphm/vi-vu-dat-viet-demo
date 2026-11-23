'use strict';
const vietnamPlaceTypes={
  market:{label:'Chợ',colour:'#904f32'},school:{label:'Trường học',colour:'#39597a'},
  fuel:{label:'Trạm xăng',colour:'#285c61'},cafe:{label:'Cà phê',colour:'#654536'},
  hospital:{label:'Bệnh viện',colour:'#307168'}
};

function createWorldStreetLife(T,scene,small,environment,amenities,prepareActor){
  const walkGroup=new T.Group();
  walkGroup.name='Người đi bộ';scene.add(walkGroup);
  const walkers=new Map(),models=new Map();
  let bins=new Map();
  let graph,places=[],paths=[],originX=0,originZ=0,walkTime=0;
  function localHour(){return (new Date().getUTCHours()+7)%24;}
  function interest(kind,h){
    if(kind==='school')return ((h>=6&&h<=8)||(h>=15&&h<=17)) ? .85 : .17;
    if(kind==='market')return (h>=5&&h<=11) ? .85 : .39;
    if(kind==='hospital')return .36;
    if(kind==='cafe')return (h>=6&&h<=21) ? .28 : .08;
    return .15;
  }
  function activity(g,x,z,kind,trafficLevel='auto',h=localHour(),nearPlaces=g===graph?bins:null){
    const {population,cover}=environment.sample(g,x,z),dark=h<5||h>=22;
    const fast=kind?.startsWith('motorway');
    let attraction=0;
    if(nearPlaces)for(let i=Math.floor((x-115)/128);i<=Math.floor((x+115)/128);i++){
      for(let j=Math.floor((z-115)/128);j<=Math.floor((z+115)/128);j++){
        for(const p of nearPlaces.get(i+','+j)||[]){
          const proximity=1-Math.hypot(p.x-x,p.z-z)/115;
          if(proximity>0)attraction=Math.max(attraction,proximity*interest(p.kind,h));
        }
      }
    }
    const residential=kind==='living_street'||kind==='residential';
    const fallback=cover===50 ? .48 : residential ? .34 : .16;
    const density=population==null?fallback:Math.min(1,Math.log1p(Math.max(0,population))/5);
    const walkers=fast?0:Math.min(1,density*.76+attraction)*(dark ? .32 : 1);
    const main=/^(motorway|trunk|primary)/.test(kind);
    const urban=!fast&&(density>=.68||cover===50);
    const peak=(h>=7&&h<9)||(h>=16&&h<19);
    const base=(3+11*density+attraction*4+(main?3:0))*(dark ? .67 : 1);
    const busy=trafficLevel==='busy'||(trafficLevel==='auto'&&urban&&!dark);
    let vehicles=base;
    if(trafficLevel==='quiet')vehicles=Math.min(7,base*.55);
    if(busy)vehicles=trafficLevel==='busy'?25+density*5:base+(peak?11:6);
    return {walkers,busy,vehicles:Math.min(small?22:30,Math.round(vehicles)),
      scooter:fast?0:Math.min(.80,.18+density*.37+attraction*.22+(busy?.20:0))};
  }
  function* walkingPaths(g,originX,originZ,bins,segments,clear){
    let rows=0;
    const candidates=[],hour=localHour();
    for(const s of segments){
      if((++rows & 15)===0)yield;
      if(s.rank>310||s.len<10||s.graded||s.kind.startsWith('motorway'))continue;
      // Anchor each walking path to a station on the original road segment so
      // a rebase or a clipped long road cannot slide its pedestrians around.
      const span=Math.min(13,s.len*.35),step=42;
      const project=-s.ax*s.fx-s.az*s.fz;
      const first=span+1+s.seed%12;
      const start=Math.max(0,Math.ceil((project-310-first)/step));
      for(let k=start;first+k*step<s.len-span-1&&first+k*step<project+310;k++){
        const station=first+k*step,side=(s.seed+k)%2?1:-1;
        const x=originX+s.ax+s.fx*station+side*s.nx*(s.w+1);
        const z=originZ+s.az+s.fz*station+side*s.nz*(s.w+1);
        const distance=Math.hypot(x-originX,z-originZ);if(distance>310)continue;
          const score=activity(g,x,z,s.kind,'auto',hour,bins).walkers;
        const hash=(Math.imul(s.seed^k,2654435761)>>>0)/4294967296;
        if(hash>score*.88)continue;
        candidates.push({x,z,fx:s.fx,fz:s.fz,span,phase:hash*53,rank:distance/(.45+score),
          key:s.seed+':'+k,model:pathPedestrianModel(s.seed,k)});
      }
    }
    candidates.sort((a,b)=>a.rank-b.rank);
    const paths=[];
    for(const p of candidates){
      yield;
      if(paths.length>=(small?6:11))break;
      if(paths.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<5))continue;
      let valid=true;
      for(let d=-p.span;d<=p.span+.01;d+=p.span/Math.ceil(p.span)){
        if(!clear(p.x+d*p.fx,p.z+d*p.fz,.3)){valid=false;break;}
      }
      if(valid)paths.push(p);
    }
    return paths;
  }
  function trimWalkers(){
    const active=new Set(paths.map(p=>p.key));
    for(const [key,item] of walkers){
      if(active.has(key))continue;
      walkGroup.remove(item.group);
      item.mixer?.stopAllAction();
      item.group.traverse(part=>{if(part.isSkinnedMesh)part.skeleton.dispose();});
      walkers.delete(key);
    }
  }
  function* prepare(g,x,z,segments,clear){
    const nextPlaces=amenities.nearby(g,x,z,500).filter(p=>vietnamPlaceTypes[p.kind]).sort((a,b)=>
      Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
    const nextBins=new Map();
    for(const p of nextPlaces){
      const key=Math.floor(p.x/128)+','+Math.floor(p.z/128);
      if(!nextBins.has(key))nextBins.set(key,[]);nextBins.get(key).push(p);
    }
    const nextPaths=yield* walkingPaths(g,x,z,nextBins,segments,clear);
    return ()=>{
      graph=g;originX=x;originZ=z;places=nextPlaces;bins=nextBins;paths=nextPaths;trimWalkers();
    };
  }
  function walker(p){
    if(walkers.has(p.key))return walkers.get(p.key);
    const group=new T.Group();walkGroup.add(group);
    const item={group};walkers.set(p.key,item);
    const asset=p.model;
    if(!models.has(asset))models.set(asset,TrafficModels.load.loadAsync('traffic/'+asset+'.glb'));
    item.ready=models.get(asset).then(async data=>{
      await prepareActor(asset,data.scene);
      if(walkers.get(p.key)!==item)return;
      const rig=TrafficModels.clone(data.scene);group.add(rig);
      rig.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true;}});
      const clip=data.animations.find(c=>c.name==='walk');
      if(clip){item.mixer=new T.AnimationMixer(rig);item.mixer.clipAction(clip).play();item.mixer.setTime(p.phase);}
    }).catch(()=>{});
    return item;
  }
  function render(dt,x,z,ground){
    walkTime+=dt;
    for(const p of paths){
      const visible=Math.hypot(p.x-x,p.z-z)<175;
      if(!visible){const item=walkers.get(p.key);if(item)item.group.visible=false;continue;}
      const actor=walker(p),t=(p.phase+walkTime*(.9+(p.phase%3)*.12))%(4*p.span);
      const along=p.span-Math.abs(t-2*p.span),sign=t<2*p.span?1:-1;
      const wx=p.x+p.fx*along,wz=p.z+p.fz*along;
      actor.group.position.set(wx-originX,ground(wx,wz)+.015,wz-originZ);
      actor.group.rotation.y=Math.atan2(sign*p.fx,sign*p.fz);actor.group.visible=true;
      actor.mixer?.update(dt);
    }
  }
  async function prepareDeparture(){
    // render() has already requested every walker visible from the starting point.
    const departure=small?walkers.values():paths.map(walker);
    await Promise.all(Array.from(departure,item=>item.ready));
    return walkGroup;
  }
  return {activity,prepare,render,prepareDeparture,get places(){return places;}};
}
