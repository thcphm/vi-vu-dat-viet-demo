'use strict';
const $=id=>document.getElementById(id),clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const keySet=createDriveInput(),held=(...names)=>names.some(n=>keySet.has(n));
const featured=[['Hà Nội',105.8521,21.0277],['TP. Hồ Chí Minh',106.6994,10.7743],['Đà Nẵng',108.2204,16.0677],['Hải Phòng',106.6821,20.8587],['Huế',107.5887,16.4645],['Đà Lạt',108.4373,11.9418],['Cần Thơ',105.7831,10.0324],['Cà Mau',105.1507,9.1769],['Hà Giang',104.9844,22.8234],['Phú Quốc',103.959,10.2135]];
const baSaoDrive=['Ba Sao · Quốc lộ 21',105.815695,20.550735];featured.push(baSaoDrive);
const nameOf=e=>e.name||({motorway:'Đường cao tốc',trunk:'Đường trục chính',primary:'Đường chính',secondary:'Đường liên huyện',tertiary:'Đường địa phương',residential:'Đường dân cư',service:'Đường dịch vụ'}[e.kind]||'Đường địa phương');
const tripKilometres=new Intl.NumberFormat('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1});
const fmt=d=>tripKilometres.format(d/1000)+' km';
let gfx,atlasData,indexData,roads,waterIndex,water,player,nearby=[],npcs=[],nextNpc=1,mode='loading',inside=false,source=featured[0];
let viewX=Infinity,viewZ=Infinity,loadX=Infinity,loadZ=Infinity,busy=false,loadToken=0,streamRetry=0,tourPins=[];
let hp=100,nitro=100,cooldown=0,distance=0,snapshot=0,toastTime=0,crashTime=0,crashKind='car',passes=0,duel=null;
let car={model:'supercar',spec:worldGarage.supercar,x:0,z:0,yaw:0,speed:0,steer:0,brake:false},last=performance.now(),uiTick=0,spawnTick=0;
let scenicTrace=null;
let activeTrip=false,loadRequest=null,openingCameraTime=0;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const vehicleLook=createVehicleLook($('lookAround'),$('world'),()=>mode==='drive');
car.look=vehicleLook.view;
const signatureTrip=window.createEditionSession?.(new URLSearchParams(location.search));
fillEditionGarage($('garage'),true);
let worldEnergy,worldTank;
let garageVehicle='supercar';
const learnerSedan={...worldGarage['family-sedan'],power:2.5,top:40/3.6,speedGovernor:true};
function selectVehicle(model,learner=false){
 if(!Object.hasOwn(worldGarage,model))return;
 worldTank?.flush();worldEnergy=DuongVietEnergy.meta(model,worldGarage[model]);worldTank=DuongVietEnergy.tank(worldEnergy);
 car.model=model;car.spec=learner?learnerSedan:worldGarage[model];gfx?.preloadVehicle(model);
 $('garage').value=model;
 $('learnerDrive').checked=learner;
 document.body.toggleAttribute('data-learner',learner);
}
let learnerSaved=false;
try{
 const saved=localStorage.getItem('taylai.world.garage')||localStorage.getItem('taylai.garage');
 if(Object.hasOwn(worldGarage,saved))garageVehicle=saved;
 learnerSaved=localStorage.getItem('taylai.world.learner')==='1';
 const traffic=localStorage.getItem('taylai.world.traffic');
 if(['quiet','busy'].includes(traffic))$('trafficLevel').value=traffic;
}catch{}
if(signatureTrip && Object.hasOwn(worldGarage,signatureTrip.vehicle)){
 garageVehicle=signatureTrip.vehicle;learnerSaved=false;
 try{localStorage.removeItem('taylai.world.learner');localStorage.removeItem('taylai.world.garage');localStorage.setItem(worldGarage[garageVehicle].worldOnly?'taylai.world.garage':'taylai.garage',garageVehicle);}catch{}
}
selectVehicle(learnerSaved?'family-sedan':garageVehicle,learnerSaved);
$('learnerDrive').onchange=()=>{
 const learner=$('learnerDrive').checked;
 selectVehicle(learner?'family-sedan':garageVehicle,learner);
 try{localStorage.setItem('taylai.world.learner',learner?'1':'0');}catch{}
};
$('garage').onchange=()=>{
 garageVehicle=$('garage').value;selectVehicle(garageVehicle);
 try{
   localStorage.removeItem('taylai.world.learner');
   if(car.spec.worldOnly)localStorage.setItem('taylai.world.garage',car.model);
   else{localStorage.setItem('taylai.garage',car.model);localStorage.removeItem('taylai.world.garage');}
 }catch{}
};
$('trafficLevel').onchange=()=>{
 try{localStorage.setItem('taylai.world.traffic',$('trafficLevel').value);}catch{}
 if(mode==='grid'&&gfx&&player){npcs=[];seedTraffic();}
};
function inform(text,time=3){$('callout').textContent=text;toastTime=time;}
function breakfastCall(){
 const line='Bánh mì nóng giòn đây! Ai bánh mì nào!';
 inform('“'+line+'”',4);driveAudio.broadcast(line,false);
}
function stance(){return roadLaneOffset(player);}
function save(){
 if(guide?.route.id||!activeTrip||!player||!roads||car.flood)return;
 const [lon,lat]=roads.geo(car.x,car.z);
 const navigation=guide && guide.timeMs===null && customSaveKey?{key:customSaveKey,progress:guide.progress,elapsed:Math.max(0,performance.now()-guideStarted)}:undefined;
 try{localStorage.setItem('taylai.world.trip',JSON.stringify({lon,lat,navigation,label:source[0],destination:source[3]?.id,distance,passes,dir:player.dir,edge:player.edge.id,yaw:car.yaw,origin:[roads.lon,roads.lat]}));}catch{}
}
function parkOnRoad(){
 const p=roads.sample(player,stance());car.flood=null;car.wading=null;car.accessLane=false;car.offroad=false;car.edge=player.edge;car.deckLift=roads.roadLevel(player.edge,player.s);DriveBody.reset(car);Object.assign(car,p);car.parked=true;cooldown=1;
}
function trackRoad(){
 const around=roads.nearby(car.x,car.z,22);
 const nearest=roads.nearest(car.x,car.z,around,car.deckLift||0);
 const halfWidth=nearest&&(roads.tunnels.info(nearest.edge)?.bore?tunnelSection(nearest.edge,roads).innerHalfWidth:worldRoadHalfWidth(nearest.edge));
 const onNetwork=nearest&&nearest.error<=halfWidth**2;
 car.accessLane=!onNetwork&&districtView?.graph===roads&&gfx.accessLane(car.x,car.z);
 car.offroad=!onNetwork&&!car.accessLane;
 car.edge=onNetwork?nearest.edge:null;
 car.deckLift=onNetwork?roads.roadLevel(nearest.edge,nearest.s):0;
 if(!nearest){player.error=Infinity;return;}
 const bearing=roads.sample(nearest).yaw;
 nearest.dir=Math.cos(car.yaw-bearing)>=0?1:-1;player=nearest;
}
let districtView=null,structureRequest=null,pendingDistrict=null;
function loadStructuresNear(graph,x,z){
 // Large regional archives stream separately so even an offline departure
 // can enter the driving view immediately with the bundled scenery.
 if(structureRequest?.graph===graph&&Math.hypot(x-structureRequest.x,z-structureRequest.z)<220)return;
 const request=structureRequest={graph,x,z};
 request.ready=gfx.loadStructures(graph,x,z).then(changed=>{
   const view=districtView;
   if(changed&&request===structureRequest&&view?.graph===graph)
     pendingDistrict=view;
 }).catch(()=>{if(request===structureRequest)structureRequest=null;});
}
function drawDistrict(graph,lakes,x,z,edges,build=gfx.setRoads){
 const [lon,lat]=graph.geo(x,z),waterways=lakes?.nearby(x,z)||[];
 for(const coast of window.VietnamSightCoasts||[]){
   if(Math.abs(lon-coast.lon)>.02||Math.abs(lat-coast.lat)>.02)continue;
   const project=ring=>ring.map(([x,y])=>graph.point(x,y));
   waterways.push({kind:'lake',points:project(coast.ring),holes:coast.holes.map(project),bankSpacing:coast.bankSpacing,
     name:coast.name,sharedStage:coast.sharedStage});
 }
 pendingDistrict=null;districtView={graph,x,z,edges,waterways};
 loadStructuresNear(graph,x,z);return build(edges,x,z,waterways,graph);
}
function refreshView(build,x=car.x,z=car.z){
 const [lon,lat]=roads.geo(x,z);
 tourPins=VietnamTourism.nearby(lon,lat,.018,.018).map(s=>catalogById.get(s.id)).filter(Boolean)
   .concat(mountainPlaces.filter(site=>Math.abs(site.lon-lon)<.018&&Math.abs(site.lat-lat)<.018))
   .map(data=>({...roads.point(data.lon,data.lat),data}));
 nearby=roads.nearby(x,z,560);viewX=x;viewZ=z;
 return drawDistrict(roads,water,viewX,viewZ,nearby,build);
}
function fetchWaterIndex(){
 return waterIndex??=fetchJSON('vn-water/index.json').catch(e=>{waterIndex=null;throw e;});
}
async function streamWater(graph){
 try{
   const index=await fetchWaterIndex();if(roads!==graph)return;
   if(!water||water.roads!==graph)water=new VietnamWater(index,graph);
   return await water.load(car.x,car.z);
 }catch{/* Road navigation stays available when this scenery layer is offline. */}
}
let framesStarted=false,departureWaterReady=null;
// Preload the ordered renderer scripts together on the first request for a 3D
// scene. Keep successful loads across retries so global bindings execute once.
const rendererFiles=new Map();
let rendererReady;
function loadJourneyRenderer(){
 return rendererReady??=(async()=>{
   const sources=[...$('journeyRenderer').content.querySelectorAll('script[src]')];
   for(const {src} of sources){
     if(rendererFiles.has(src))continue;
     const preload=document.createElement('link');
     preload.rel='preload';preload.as='script';preload.href=src;document.head.append(preload);
     rendererFiles.set(src,{preload,loaded:false});
   }
   for(const {src} of sources){
     const file=rendererFiles.get(src);
     if(file.loaded)continue;
     try{
       await new Promise((resolve,reject)=>{
         const script=document.createElement('script');script.src=src;
         script.onload=()=>{script.remove();resolve();};
         script.onerror=()=>{script.remove();reject(Error('Chưa tải đủ cảnh 3D. Kiểm tra kết nối rồi thử lại.'));};
         document.head.append(script);
       });
       file.loaded=true;
     }catch(e){rendererFiles.delete(src);throw e;}
     finally{file.preload.remove();}
   }
 })().catch(e=>{rendererReady=null;throw e;});
}
async function prepareWorld(graph,token){
 const progress=text=>{if(token===loadToken&&!$('grid').hidden)$('loadStatus').textContent=text;};
 progress('Đang dựng cảnh quanh '+$('journeyTitle').textContent+'…');
 await Promise.all([
   loadJourneyRenderer().then(()=>{
     if(token!==loadToken)return;
     gfx??=createWorldScene($('world'),breakfastCall);
     gfx.preloadVehicle(car.model);gfx.resetFx();
     const {x,z}=car;
     const buildings=gfx.loadStructures(graph,x,z,true).then(loaded=>{
       if(!loaded&&token===loadToken)loadStructuresNear(graph,x,z);
     });
     return Promise.all([gfx.terrainReady,gfx.loadDistrict(graph,x,z),buildings]);
   }),
   Promise.resolve(departureWaterReady).then(()=>{if(token===loadToken)return streamWater(graph);}),
   VietnamTourism.loadRegion(...graph.geo(car.x,car.z))
 ]);
 if(token!==loadToken)return false;
 progress('Đang nối mặt đường và đặt xe vào làn…');
 if(!await refreshView(gfx.loadRoads)||token!==loadToken)return false;
 seedTraffic();
 progress('Đang chuẩn bị ánh sáng và buồng lái…');
 await gfx.prepareShaders(car,npcs);
 if(token!==loadToken)return false;
 progress('');
 if(!framesStarted){framesStarted=true;requestAnimationFrame(frame);}
 return true;
}
async function startAt(place,restore=null,guided=null){
 signatureTrip?.relocate();
 guide=null;scenicTrace=null;guideStarted=0;customSaveKey=null;
 $('startGuided').disabled=true;$('guidedInfo').hidden=true;
 loadRequest={place,restore,guided};activeTrip=false;
 const firstDrive=place===openingPlace&&!restore;
 car.opening=firstDrive;car.openingPose=firstDrive?1:0;car.dawn=firstDrive?1:0;openingCameraTime=0;
 document.body.removeAttribute('data-awaiting-motion');
 document.body.toggleAttribute('data-lakeside',firstDrive);
 const site=place[3]||destinations.find(entry=>restore?.destination===entry.id)||catalogStop(restore?.destination);
 if(site)useSightEntrance(site);
 car.scenicHour=scenicPasses.has(site?.id)?scenicHour():null;
 const departure=restore?null:JourneyDepartures.byId(site?.id);
 if(departure&&!guided&&!reduceMotion.matches)car.openingPose=1;
 JourneyDepartures.select(departure);
 $('journeyTitle').textContent=departure?.title||site?.name||place[0];
 $('journeyTitle').classList.toggle('longTitle',$('journeyTitle').textContent.length>25);
 $('journeyCaption').textContent=guided?guided.id?'Đồng hồ xếp hạng chạy từ lúc cầm lái và tính cả thời gian tạm dừng.':'Đi theo vệt xanh đến '+guided.finishLabel+'.':restore?'Tiếp tục hành trình đã lưu · '+fmt(restore.distance):
   departure?departure.caption:
   samePlace(place,baSaoDrive)?'Theo đường Điện Biên Phủ về phía Khả Phong, qua khu dân cư Ba Sao và chân núi.':
   scenicPasses.has(site?.id)?scenicPasses.get(site.id).description:
   site?.accessRoad?'Xuất phát tại '+site.name+' · Đường tham quan mô phỏng.':
   site?.visitOnArrival?site.arrivalNote||'Xe đỗ trên đường ô tô, cách '+site.name+' khoảng '+atlasDistance(site.approachMeters/1000)+' theo đường chim bay.':
   site?.km?'Chinh phục '+fmt(site.km*1000)+' đường đèo.':[site?.kind,site?.city].filter(Boolean).join(' · ')||'Khám phá những con đường quanh điểm xuất phát.';
 if(guided){
   $('journeyTitle').textContent=guided.title;
   $('journeyTitle').classList.toggle('longTitle',guided.title.length>25);
 }
 $('runNotice').firstChild.textContent=guided&&!guided.id?'Lộ trình tự chọn được lưu trên trình duyệt này. ':'Khi xuất phát, máy chủ ghi lượt lái và dùng cookie cho khách. ';
 document.querySelector('.openingMode span').textContent=guided?(guided.id?'Tuyến xếp hạng':'Lộ trình tự chọn'):'Lái tự do';
 $('departureCoords').textContent=place[2].toFixed(4)+'° N  /  '+place[1].toFixed(4)+'° E';
 $('departureMap').getContext('2d').clearRect(0,0,$('departureMap').width,$('departureMap').height);
 gfx?.cancelRoads();
 const token=++loadToken;mode='loading';keySet.clear();$('grid').hidden=false;$('hud').hidden=true;$('touch').hidden=true;
 $('pause').hidden=true;$('camera').hidden=true;document.body.dataset.phase='grid';
 $('launch').disabled=true;$('challenge').disabled=true;$('launch').textContent='Đang tải đường…';$('loadStatus').textContent='';
 $('placeTitle').textContent=place[0];
 try{
   const origin=Array.isArray(restore?.origin)&&restore.origin.length===2&&restore.origin.every(Number.isFinite)?restore.origin:place.slice(1);
   const graph=new VietnamRoads(indexData,...origin),start=graph.point(place[1],place[2]);
   // The departure map and the road graph can load from the same coordinates.
   const previewOnly=!gfx&&departure&&!guided&&!site?.visitOnArrival;
   const previewWater=previewOnly?fetchWaterIndex().then(async index=>{
     const lakes=new VietnamWater(index,graph);await lakes.load(start.x,start.z);return lakes;
   }).catch(()=>null):null;
   await graph.load(start.x,start.z);
   const atEntrance=!restore&&!guided&&site?.accessRoad&&place[1]===site.start[0]&&place[2]===site.start[1];
   const accessEdge=atEntrance&&graph.edges.get(site.accessRoad);
   if(atEntrance&&!accessEdge)throw Error('Chưa tải được đường vào địa danh. Hãy thử lại.');
   let nearest=accessEdge?graph.nearest(start.x,start.z,[accessEdge]):graph.nearest(start.x,start.z);
   const savedEdge=restore&&graph.edges.get(restore.edge);
   if(savedEdge){
     const saved=graph.nearest(start.x,start.z,[savedEdge]);
     if(saved&&saved.error<=(worldRoadHalfWidth(savedEdge)+2)**2)nearest=saved;
   }
   if(!nearest||nearest.error>4000**2){await graph.load(start.x,start.z,true);nearest=graph.nearest(start.x,start.z);}
   if(token!==loadToken)return;
   if(!nearest||nearest.error>28000**2)throw Error('Chưa có đường ô tô gần điểm này. Hãy chọn điểm khác trên bản đồ.');
   if(place===JourneyDepartures.pin){
     $('journeyTitle').textContent=nameOf(nearest.edge);
     $('journeyCaption').textContent='Điểm hẹn trong bưu thiếp. Xe đã đỗ trên đường gần nhất.';
   }
   const sight=site||VietnamLandmarks.entries.find(v=>place[0]===v.name+' · '+v.city);
   if(sight)place=[place[0],place[1],place[2],sight];
   car.tourStop=Boolean(sight?.custom||sight&&VietnamLandmarks.entries.includes(sight));
   car.tourStopId=sight?.id;
   const view=departure?.view||(atEntrance&&site.departureView);
   car.departureView=view?{...view,...graph.point(site.lon,site.lat),yaw:site.yaw}:null;
   const bearing=firstDrive?104:samePlace(place,baSaoDrive)?12:sight?.bearing;
   if(Number.isFinite(bearing)&&!restore&&!nearest.edge.oneway){
     nearest.dir=Math.cos(graph.sample(nearest).yaw-bearing*Math.PI/180)>=0?1:-1;
   }else if(sight&&!restore&&!nearest.edge.oneway){
     const target=graph.point(sight.lon,sight.lat),p=graph.sample(nearest);
     if((target.x-p.x)*Math.sin(p.yaw)-(target.z-p.z)*Math.cos(p.yaw)<0)nearest.dir=-1;
   }
   if(restore&&restore.edge===nearest.edge.id&&restore.dir===-1&&!nearest.edge.oneway)nearest.dir=-1;
   if(guided){
     const route=guided.lengths?guided:await measureFeaturedDrive(graph,guided);
     if(token!==loadToken)return;
     const resume=restore?.navigation?{cursor:nearest,progress:restore.navigation.progress}:null;
     guide=createGuidedDrive(graph,route,resume);nearest={...guide.start};
     $('journeyCaption').textContent=fmt(guide.length)+' · '+$('journeyCaption').textContent;
   }
   if(!guided&&scenicPasses.has(site?.id))scenicTrace=createScenicTrace(mountainStages.find(stage=>stage.id===site.id),graph);
   nextWeatherCheck=0;roads=graph;water=null;player=nearest;source=place;distance=restore?.distance||0;hp=nitro=100;
   car.region=place[2]<10.8?'delta':place[2]>21.6||(place[1]>107&&place[2]>11&&place[2]<15)?'highlands':'city';
   duel=null;passes=restore?.passes||0;busy=false;npcs=[];parkOnRoad();
   inside=DriveView.current()==='cockpit';
   updateDriveViewButton($('camera'),inside);
   if(Number.isFinite(restore?.yaw)){car.x=start.x;car.z=start.z;car.yaw=restore.yaw;trackRoad();}
   loadX=car.x;loadZ=car.z;streamRetry=0;
   departureWaterReady=null;
   if(previewOnly){
     // These departures have a responsive scene photograph. Their real road
     // map, atlas and planner are ready before we need a WebGL context.
     nearby=graph.nearby(car.x,car.z,560);
     departureWaterReady=previewWater.then(lakes=>{
       if(token!==loadToken||roads!==graph||!lakes)return;
       water=lakes;
       if(mode==='grid')drawDepartureMap();
     });
   }else if(!await prepareWorld(graph,token))return;
   drawDepartureMap();mode='grid';
   $('challenge').disabled=guided;$('startGuided').disabled=false;$('launch').disabled=false;$('launch').textContent=restore?'Lái tiếp':'Cầm lái';
   if(site?.visitOnArrival&&!restore&&!guided)await openTour(site);
   else if(signatureTrip?.waiting)await begin();
 }catch(e){if(token===loadToken){$('startGuided').disabled=false;$('loadStatus').textContent=e.message;$('launch').textContent='Thử tải lại';$('launch').disabled=false;mode='error';pendingPlace=place;}}
}
async function stream(){
 if(busy||streamRetry>0||Math.hypot(car.x-loadX,car.z-loadZ)<300)return;
 const graph=roads,id=loadToken;busy=true;const x=car.x,z=car.z;
 try{
   await Promise.all([graph.load(x,z),VietnamTourism.loadRegion(...graph.geo(x,z))]);if(id!==loadToken)return;loadX=x;loadZ=z;
   const changes=await Promise.all([streamWater(graph),gfx.loadDistrict(graph,x,z)]);
   if(changes.some(Boolean)&&id===loadToken&&districtView?.graph===graph&&mode!=='tour')pendingDistrict=districtView;
 }
 catch{if(id===loadToken){streamRetry=4;inform('Đang thử tải lại đường phía trước.',3);}}
 finally{if(id===loadToken)busy=false;}
}
function branchAhead(){
 let c={...player},left=0;
 for(let i=0;i<55;i++){
   left+=c.dir>0?c.edge.length-c.s:c.s;
   if(left>125)return null;
   const options=roads.options(c),node=c.dir>0?c.edge.end:c.edge.start;
   if(options.length>1)return {node,options,left};
   if(!options.length)return null;c=options[0];
 }return null;
}
function branchText(a){return a<-.38?'Trái':a>.38?'Phải':'Thẳng';}
function recover(){
 if(!player)return;
 const nearest=roads.nearest(car.x,car.z,roads.nearby(car.x,car.z,60),car.deckLift||0);if(nearest)player=nearest;
 parkOnRoad();inform('Đã đặt xe trở lại mặt đường.');
}
function spawnAhead(ahead,index){
 const c={edge:player.edge,dir:player.dir,s:player.s};
 if(roads.advance(c,ahead,opts=>opts[0])<10)return;
 if(index%3===1&&!c.edge.oneway)c.dir*=-1;
 addNpc(c,index);
}
function addNpc(c,i){
 const centre=roads.sample(c);
 const mix=gfx.streetLife.activity(roads,centre.x,centre.z,c.edge.kind,$('trafficLevel').value);
 const kind=Math.random()<mix.scooter?'scooter':['taxi','van','sedan','rival'][i%4];
 const offset=roadLaneOffset(c,kind==='scooter');
 const p=roads.sample(c,offset);
 if(Math.hypot(car.x-p.x,car.z-p.z)<16||npcs.some(n=>Math.hypot(p.x-n.x,p.z-n.z)<(kind==='scooter'&&n.kind==='scooter'?6:10)))return;
 const pace=(kind==='scooter'?6:kind==='rival'?21:9)+Math.random()*4;
 npcs.push({...c,...p,deckLift:roads.roadLevel(c.edge,c.s),kind,id:nextNpc++,speed:Math.min(pace,(roadSpeedLimit(c)??160)/3.6),pace,stopped:0});
}
function seedTraffic(){
 const {vehicles,busy}=gfx.streetLife.activity(roads,car.x,car.z,player.edge.kind,$('trafficLevel').value);
 for(let i=0;i<Math.min(busy?12:8,vehicles);i++)spawnAhead(36+i*(busy?16:42),i);
 fillTraffic();
}
function fillTraffic(){
 npcs=npcs.filter(n=>Math.hypot(n.x-car.x,n.z-car.z)<430&&n.stopped<6&&roads.edges.has(n.edge.id));
 const {vehicles:target,busy}=gfx.streetLife.activity(roads,car.x,car.z,player.edge.kind,$('trafficLevel').value);
 if(npcs.length>=target||!nearby.length)return;
 if(busy)spawnAhead(85+Math.random()*95,nextNpc);
 for(let i=0;i<12&&npcs.length<target;i++){
   const edge=nearby[Math.floor(Math.random()*nearby.length)],dir=!edge.oneway&&Math.random()<.5?-1:1;
   const signal=busy&&edge.controls?.find(point=>signalApplies(point,edge,dir));
   const station=signal?clamp(signal.s-dir*(8+Math.random()*35),0,edge.length):Math.random()*edge.length;
   const c={edge,dir,s:station},p=roads.sample(c),d=Math.hypot(p.x-car.x,p.z-car.z);
   if(d>55&&d<330)addNpc(c,nextNpc);
 }
 if(npcs.length<Math.min(6,target))spawnAhead(85+Math.random()*125,nextNpc);
}
function trafficStep(dt){
 const seconds=performance.now()/1000;
 for(const n of npcs){
   if(n.flood){advanceFlood(n,dt);if(n.flood.age>5)n.stopped=7;continue;}
   const dx=car.x-n.x,dz=car.z-n.z,fx=Math.sin(n.yaw),fz=-Math.cos(n.yaw);
   const fallen=n.recoil?.fallen;
   let target=fallen||n.recoil?.braking?0:Math.min(n.pace,(roadSpeedLimit(n)??160)/3.6);
   const control=roadControlAhead(roads,n,seconds,true);
   const wait=control&&(control.phase==='red'||control.phase==='amber'&&control.distance>n.speed*.9);
   const stopAt=wait?Math.max(0,control.distance-control.stopLineOffset-(n.kind==='scooter'?1:2.1)):Infinity;
   if(wait)target=Math.min(target,Math.sqrt(7*stopAt));
   for(const other of npcs){
     if(other===n||Math.abs(other.deckLift-n.deckLift)>2.5)continue;const ox=other.x-n.x,oz=other.z-n.z,long=ox*fx+oz*fz;
     if(long>0&&long<15&&Math.abs(ox*fz-oz*fx)<1.65)target=Math.min(target,Math.max(0,(long-4)*1.3));
   }
   const ahead=dx*fx+dz*fz;
   if(Math.abs(car.deckLift-n.deckLift)<=2.5&&ahead>0&&ahead<17&&Math.abs(dx*fz-dz*fx)<1.75)target=Math.min(target,Math.max(0,(ahead-5)*1.2));
   n.speed=fallen?0:n.speed+clamp(target-n.speed,-9*dt,2.8*dt);
   const moved=roads.advance(n,Math.min(stopAt,n.speed*dt),options=>{
     const opts=n.kind==='scooter'?options.filter(o=>!o.edge.kind.startsWith('motorway')):options;
     return opts.length>1&&Math.random()<.24?opts[Math.floor(Math.random()*opts.length)]:opts[0];
   });
   if(moved<.001&&!fallen&&!wait&&target>0)n.stopped+=dt;else n.stopped=0;
   const pos=roads.sample(n,roadLaneOffset(n,n.kind==='scooter'));
   const landing=DriveBody.advanceRecoil(n,dt);Object.assign(n,pos);
   n.deckLift=roads.roadLevel(n.edge,n.s);
   if(n.recoil){n.x+=n.recoil.x;n.z+=n.recoil.z;n.yaw+=n.recoil.angle;}
   if(n.recoil){
     const wet=gfx.waterAt(n.x,n.z,n.edge);
     if(wet&&wet.level-wet.bed>.55&&n.recoil.y<.6){
       startFlood(n,wet,n.recoil.vx,n.recoil.vz);continue;
     }
   }
   if(fallen)wreckContact(n);
   landingFx(n,landing);
   const along=(car.x-n.x)*fx+(car.z-n.z)*fz,across=(car.x-n.x)*fz-(car.z-n.z)*fx;
   const parallel=Math.abs(car.deckLift-n.deckLift)<=2.5&&Math.cos(car.yaw-n.yaw)>.88&&Math.abs(across)<9;
   if(parallel&&along< -4&&along> -18)n.armed=true;
   if(!parallel||Math.abs(along)>32)n.armed=false;
   if(car.spec!==learnerSedan&&n.armed&&parallel&&along>4&&car.speed>n.speed&&cooldown<=0&&!n.passed){
     n.passed=true;passes++;nitro=Math.min(100,nitro+(n.kind==='rival'?20:7));inform(n.kind==='rival'?'Vượt tay đua · +20 nitro':'Vượt sạch · +7 nitro',1.6);
   }
   hitVehicle(n);if(mode!=='drive')return;
 }
}
function hitVehicle(n){
 if(n.recoil?.y>1.35||Math.abs(car.deckLift-n.deckLift)>2.5)return;
 const bike=n.kind==='scooter',hit=DriveBody.contact(car,n,bike?.38:.91,bike?.95:1.98);
 if(!hit)return;
 const impact=DriveBody.resolve(car,hit,Math.sin(n.yaw)*n.speed+(n.recoil?.vx||0),-Math.cos(n.yaw)*n.speed+(n.recoil?.vz||0),n);
 if(impact.closing>.7){
   n.armed=false;n.passed=true;
   DriveBody.strikeTraffic(n,hit,impact,n.yaw,car.x,car.z,n.x,n.z);
   if(n.recoil?.fallen)n.speed=0;
   if(n===duel?.actor)duel.speed=n.speed;
   hurt(bike?'scooter':'car',impact,hit);
 }
}
const pit=createPitQuiz($('pit'),()=>'Chú Tư lắc đầu. Chọn lại đáp án nhé.',()=>{
 if(car.flood)recover();
 hp=100;DriveBody.reset(car);cooldown=2;mode='drive';keySet.clear();updateHud();save();inform('Máy lại giòn. Lên đường!');
});
function wreckContact(n){
 const r=n.recoil;
 if(Math.hypot(r.vx,r.vz)<.08)return;
 const hit=gfx.contact(n.x,n.z,.59,gfx.ground(n.x,n.z,n.edge)+r.y,n.edge);
 if(!hit||r.y>(hit.height??(hit.kind==='water'?.15:7)))return;
 r.kind='scooter';r.yaw=n.yaw;
 const x=r.x,z=r.z,event=DriveBody.resolve(r,hit);
 n.x+=r.x-x;n.z+=r.z-z;
 if(event.closing<1)return;
 const px=hit.pointX??n.x,pz=hit.pointZ??n.z;
 gfx.reactToContact(hit,px,pz,event.strength);gfx.impact(px,pz,hit.nx,hit.nz,event.strength,hit.kind,r.y,.18,n.edge);
}
function landingFx(n,joules){
 if(n.recoil?.scrape)gfx.scrape(n.x,0,n.z,n.recoil.vx,n.recoil.vz,n.edge);
 if(joules<160)return;
 const r=n.recoil,level=Math.min(.77,Math.sqrt(joules)/100);
 gfx.impact(n.x,n.z,-r.vx,-r.vz,level,'scrape',0,.12,n.edge);
 driveAudio.impact(level*.55,'vehicle');
}
function hurt(kind,event,hit){
 if(cooldown>0||event.closing<.7)return;
 const strength=event.strength;
 DriveBody.recordDent(car,hit,event.delta,car.yaw);
 hp=Math.max(0,hp-event.damage);cooldown=.35;
 const x=hit.pointX??car.x-hit.nx,z=hit.pointZ??car.z-hit.nz;
 gfx.reactToContact?.(hit,x,z,strength);gfx.impact(x,z,hit.nx,hit.nz,strength,kind,0,undefined,car.edge);
 driveAudio.impact(strength,kind==='car'||kind==='scooter'?'vehicle':'curb');
 if(hp===0){mode='crash';crashTime=1.2;crashKind=kind;car.boost=false;keySet.clear();}
 else inform('Va chạm · '+(event.energy/1000).toLocaleString('vi-VN',{maximumFractionDigits:1})+' kJ · thân xe '+hp+'%',1.6);
}
function startFlood(actor,wet,vx,vz){
 const impact=Math.hypot(vx,vz);
 actor.flood={level:wet.level,bed:wet.bed,y:actor.wading?.bed??wet.level,age:0,vy:0,vx,vz,pitch:0};
 actor.wading=null;actor.boost=false;actor.slip=0;
 gfx.splash(actor.x,actor.z,-vx,-vz,Math.min(1,.24+impact/30),wet.level);
 if(actor!==car)return;
 driveAudio.impact(Math.min(1,.25+impact/35),'water');
 mode='sinking';keySet.clear();hp=0;updateHud();
 inform('Nước tràn vào máy · chờ cứu hộ',5);
}
function advanceFlood(actor,dt){
 const f=actor.flood;f.age+=dt;
 const drag=Math.exp(-2.6*dt);
 f.vx*=drag;f.vz*=drag;
 const x=actor.x+f.vx*dt,z=actor.z+f.vz*dt;
 const wet=gfx.waterAt(x,z);
 if(wet){
   actor.x=x;actor.z=z;f.level=wet.level;f.bed=wet.bed;
 }else{f.vx=0;f.vz=0;}
 actor.speed=f.vx*Math.sin(actor.yaw)-f.vz*Math.cos(actor.yaw);
 f.vy=Math.min(2.2,f.vy+dt*(.65+Math.min(1,f.age)*1.4));
 f.y=Math.max(f.bed,Math.min(f.level,f.y-f.vy*dt));
 f.pitch+=(Math.min(.21,(f.level-f.y)*.16)-f.pitch)*(1-Math.exp(-dt*2.6));
}
function waterStep(dt){
 const wet=gfx.waterAt(car.x,car.z,car.edge);
 if(!wet){car.wading=null;return;}
 const depth=wet.level-wet.bed;
 if(depth>.6){startFlood(car,wet,car.vx,car.vz);return;}
 if(!car.wading&&Math.abs(car.speed)>1)gfx.splash(car.x,car.z,-car.vx,-car.vz,Math.min(.65,.14+Math.abs(car.speed)/35),wet.level);
 car.wading=wet;
 const drag=Math.exp(-depth*2.4*dt);
 car.vx*=drag;car.vz*=drag;car.speed*=drag;car.boost=false;
}
function tick(dt){
 cooldown=Math.max(0,cooldown-dt);streamRetry=Math.max(0,streamRetry-dt);
 const charged=worldTank.level>.0001,gas=charged&&held('w','arrowup'),reverse=charged&&held('s','arrowdown');
 if(gas||reverse)car.parked=false;
 const brake=car.parked||held(' ')||(!charged&&held('s','arrowdown')),boost=charged&&car.spec!==learnerSedan&&!car.wading&&held('shift')&&nitro>1&&!reverse&&!brake;
 nitro=clamp(nitro+(boost?-27:held('shift')?0:6)*dt,0,100);
 const x=car.x,z=car.z;
 DriveBody.step(car,{grade:gfx.grade(car.x,car.z,car.yaw,car.edge),gas,reverse,brake,boost,steer:Number(held('d','arrowright'))-Number(held('a','arrowleft')),power:car.spec.power,top:car.spec.top},dt);
 const radius=car.spec.width?car.spec.width/2:.88;
 const probeOffset=car.spec.width?car.spec.length/2-radius:1.2;
 for(const axle of [probeOffset,-probeOffset]){
   const cx=car.x+Math.sin(car.yaw)*axle,cz=car.z-Math.cos(car.yaw)*axle,hit=gfx.contact(cx,cz,radius,gfx.ground(car.x,car.z,car.edge),car.edge);
   if(!hit)continue;
   hit.axle=axle;const impact=DriveBody.resolve(car,hit);
   if(impact.closing>.7)hurt(hit.kind||'shoulder',impact,hit);
 }
 trackRoad();
 if(mode==='drive')waterStep(dt);
 const moved=Math.hypot(car.x-x,car.z-z);distance+=moved;worldTank.consume(moved);
 if(mode!=='drive')return;
 const marker=signatureTrip?.marker(distance,guide?.progress);
 if(marker){
   mode='edition-stop';DriveBody.reset(car);keySet.clear();updateHud();
   signatureTrip.open(marker,repair=>{hp=Math.min(100,hp+repair);mode='drive';keySet.clear();updateHud();save();});
   return;
 }
 if(guide && guide.timeMs===null && guide.update(player,!car.offroad&&!car.accessLane&&!car.flood)){
   guide.timeMs=Math.max(1,Math.round(performance.now()-guideStarted));
   if(guide.route.id)boardFor(guide.route).arrive();
   $('arrivalTitle').textContent='Đã đến '+guide.route.finishLabel;
   $('arrivalBoard').hidden=!guide.route.id;
   $('arrivalTour').hidden=!visitTarget();
   $('arrivalTour').textContent=guide.route.landmarkId==='tam-chuc'?'Ngắm Tam Chúc':'Ngắm địa danh';
   DriveBody.reset(car);
   mode='arrival';keySet.clear();
   $('arrivalResult').textContent=fmt(guide.length)+' · Thời gian của bạn '+formatRaceTime(guide.timeMs)+(signatureTrip?.completeGuided()||'');
   $('guidedArrival').showModal();
   return;
 }
 if(duel){
   duel.move(player,moved,dt,npcs);hitVehicle(duel.actor);
   if(duel.player>=duel.gate){
     const won=duel.player>=duel.opponent;if(won)duel.wins++;
     inform((won?'Thắng chặng!':'Đối thủ về trước.')+' Chặng '+(++duel.round)+' bắt đầu.',4);duel.gate+=1200;
   }
 }
 trafficStep(dt);spawnTick+=dt;if(spawnTick>1.6){fillTraffic();spawnTick=0;}
 snapshot+=dt;if(snapshot>4){save();snapshot=0;}
}
function visitTarget(){
 if(guide?.timeMs && guide.route.landmarkId && Math.hypot(car.x-guide.finish.x,car.z-guide.finish.z)<160){
   const site=guide.route.landmarkId==='tam-chuc'?tamChuc:destinations.find(s=>s.id===guide.route.landmarkId);
   if(site && !site.km)return {data:site,...guide.finish,distance:Math.hypot(car.x-guide.finish.x,car.z-guide.finish.z)};
 }
 const site=source[3];
 if(site){
   const p=roads.point(site.lon,site.lat),distance=Math.hypot(car.x-p.x,car.z-p.z);
   if(distance<=Math.max(165,(site.approachMeters||0)+85))return {data:site,...p,distance};
 }
 let landmark=gfx.nearLandmark(car.x,car.z);
 if(landmark?.distance>450)landmark=null;
 for(const pin of tourPins){
   const distance=Math.hypot(car.x-pin.x,car.z-pin.z);
   if(distance<420&&(!landmark||distance<landmark.distance))landmark={...pin,distance};
 }
 return landmark;
}
function updateHud(){
 const energyButton=$('worldEnergy');energyButton.hidden=!activeTrip;energyButton.textContent=worldEnergy.verb+' · '+DuongVietEnergy.pct(worldEnergy,worldTank.level)+'%';
 let landmark=visitTarget();
 $('tourView').hidden=!landmark;$('tourView').textContent=landmark?.data.id==='tam-chuc'?'Ngắm Tam Chúc':'Ngắm địa danh 3D';
 $('scenicRadio').hidden=mode!=='drive'||!landmark||Math.abs(car.speed)>.28;
 const site=source[3];
 if(site){const p=roads.point(site.lon,site.lat),distance=Math.hypot(car.x-p.x,car.z-p.z);
   if(distance<5000&&(!landmark||landmark.distance>distance))landmark={...p,distance,data:site};}
 $('landmark').hidden=!landmark;
 if(landmark)$('landmark').textContent=landmark.data.name+' · cách xe '+atlasDistance(landmark.distance/1000);
 const grade=Math.round(100*gfx.grade(car.x,car.z,car.yaw,car.edge));
 const info=[],traffic=player.edge.traffic,limit=roadSpeedLimit(player);
 const onNetwork=!car.offroad&&!car.accessLane;
 if(onNetwork&&player.edge.visitorRoad)info.push('Đường tham quan mô phỏng');
 if(onNetwork&&traffic){
   if(traffic.bridge){
     const bridge=roads.bridges.profiles.get(player.edge.id);
     info.push(bridge?.name||(/cầu vượt/i.test(player.edge.name)?'Cầu vượt':'Cầu'));
   }
   if(traffic.tunnel)info.push(roads.tunnels.info(player.edge)?.passage?'Lối xuyên nhà':'Hầm');
   if(traffic.lanes)info.push(traffic.lanes+' làn');
   if(limit)info.push('Giới hạn '+limit+' km/h');
 }
 const control=onNetwork?roadControlAhead(roads,player,performance.now()/1000):null;
 if(control){
   const label=({red:'Đèn đỏ',amber:'Đèn vàng',green:'Đèn xanh'})[control.phase]||'Lối sang đường';
   info.push(label+' · '+Math.max(0,Math.round(control.distance))+' m');
 }
 $('roadFacts').hidden=!info.length;$('roadFacts').textContent=info.join(' · ');
 $('street').textContent=(car.accessLane?'Đường nội bộ':nameOf(player.edge))+(Math.abs(grade)>=2?' · '+(grade>0?'↑ ':'↓ ')+Math.abs(grade)+'%':'');$('speed').textContent=Math.round(Math.abs(car.speed)*3.6);$('trip').textContent=fmt(distance)+(car.spec===learnerSedan?' · Tập lái 40 km/h':' · '+passes+' lượt vượt');$('hp').value=hp;$('nitro').value=nitro;
 const fork=onNetwork?branchAhead():null,plan=duel&&fork?duel.nextAt(fork.node):null;
 $('duelInfo').hidden=!duel;
 if(duel)$('duelInfo').textContent='CHẶNG '+duel.round+' · '+(duel.player>=duel.opponent?'1/2':'2/2')+' · CÒN '+Math.ceil(duel.gate-duel.player)+' M';
 $('turnInfo').textContent=car.flood?'Xe ngập nước · chờ cứu hộ':car.wading?'Đang lội nước':duel?.offCourse?'Lệch lộ trình · tự lái về vệt xanh trên bản đồ':car.offroad?'Ngoài mặt đường':plan?'Giao lộ sau '+Math.ceil(fork.left)+' m · '+branchText(fork.options.find(o=>o.edge.id===plan.edge.id)?.angle||0):fork?'Giao lộ sau '+Math.ceil(fork.left)+' m':'';
 $('guidedInfo').hidden=!guide&&(!scenicTrace||!!duel);
 if(scenicTrace&&!duel)$('guidedInfo').textContent=source[3].name+' · '+scenicTrace.status(car);
 if(guide){
   $('guidedInfo').textContent=guide.timeMs?'Đã đến '+guide.route.finishLabel+' · '+formatRaceTime(guide.timeMs):guide.route.finishLabel+' · Còn '+fmt(guide.remaining)+' · '+formatRaceTime(Math.max(0,Math.floor(performance.now()-guideStarted))).split('.')[0];
   if(guide.timeMs===null && !car.flood && !car.wading)$('turnInfo').textContent=guide.instruction();
 }
 drawMini(landmark);
}
function traceMapLine(g,points){
 g.beginPath();
 points.forEach((p,i)=>i?g.lineTo(p.x-car.x,p.z-car.z):g.moveTo(p.x-car.x,p.z-car.z));
}
$('scenicRadio').onclick=async()=>{
 if(mode!=='drive'||Math.abs(car.speed)>.28)return;
 const stop=visitTarget();if(!stop)return;
 let clue;
 try{clue=await sightSecrets.clue(stop.data);}
 catch{clue='Chúc bạn một chuyến đi đẹp trời!';}
 if(mode!=='drive'||Math.abs(car.speed)>.28||visitTarget()?.data.id!==stop.data.id)return;
 const line='Sóng Ven Đường, từ '+stop.data.name+'. '+clue;
 inform('♫ '+line,8);driveAudio.broadcast(line,true);
};
function drawDepartureMap(){
 const c=$('departureMap'),g=c.getContext('2d');
 g.clearRect(0,0,c.width,c.height);
 // North-up overview of the actual starting roads. The driving map follows the car.
 g.save();g.translate(c.width/2,c.height/2);g.scale(.39,.39);
 for(const feature of water?.nearby(car.x,car.z)||[]){
   traceMapLine(g,feature.points);
   if(feature.kind==='lake'){g.fillStyle='#376267';g.fill();}
   else{g.strokeStyle='#437278';g.lineWidth=Math.max(2,feature.width||9);g.stroke();}
 }
 for(const edge of nearby){
   const selected=edge.id===player.edge.id;
   traceMapLine(g,edge.points);g.strokeStyle=selected?'#dbfa90':'#94aa93';
   g.lineWidth=selected?8:3.5;g.stroke();
 }
 g.restore();
 g.beginPath();g.arc(c.width/2,c.height/2,15,0,Math.PI*2);
 g.strokeStyle='#dcf89a';g.lineWidth=2;g.fillStyle='#d6f58932';g.fill();g.stroke();
 g.beginPath();g.arc(c.width/2,c.height/2,5,0,Math.PI*2);g.fillStyle='#f2ffca';g.fill();
}
let mapPlaces=[];
const drivingMap=createDrivingMap(()=>({graph:roads,car,edge:player.edge,water,duel,guide:guide||(!duel&&scenicTrace),places:mapPlaces,amenities:gfx.streetLife?.places||[],furniture:gfx.mappedFurniture}));
function openDrivingMap(){
 if(mode!=='drive')return;
 mode='map';keySet.clear();save();
 mapPlaces=localDrivingPlaces(roads,car.x,car.z,2700);
 drivingMap.open(nameOf(player.edge));
}
$('openDrivingMap').onclick=openDrivingMap;
$('world').addEventListener('click',event=>{
 if(mode==='drive'&&document.body.hasAttribute('data-dashboard-map')&&gfx.hitDashboardMap(event.clientX,event.clientY))openDrivingMap();
});
$('drivingMap').addEventListener('close',()=>{
 if(mode!=='map')return;
 mode='drive';keySet.clear();updateHud();
 if(document.hidden||!document.hasFocus())pause();
});
let miniEdges,miniRoads;
const edgePaths=new WeakMap();
function mapPath(edge){
 if(!edgePaths.has(edge)){
   const line=new Path2D(),points=edge.points;
   line.moveTo(points[0].x,points[0].z);
   for(let i=1;i<points.length;i++)line.lineTo(points[i].x,points[i].z);
   edgePaths.set(edge,line);
 }
 return edgePaths.get(edge);
}
function drawMini(landmark){
 const c=$('map'),g=c.getContext('2d'),scale=.43;
 // The dashboard has room to show more road on either side of the car.
 const width=inside&&!car.sightView&&!car.flood?320:188;
 if(c.width!==width)c.width=width;
 g.clearRect(0,0,c.width,c.height);g.save();g.translate(c.width/2,c.height*.56);
 g.scale(scale,scale);g.rotate(-car.yaw);
 if(miniEdges!==nearby){
   miniEdges=nearby;miniRoads=new Path2D();
   for(const edge of nearby)miniRoads.addPath(mapPath(edge));
 }
 g.save();g.translate(-car.x,-car.z);
 g.strokeStyle='#93aba2';g.lineWidth=3;g.stroke(miniRoads);
 g.strokeStyle='#d8f791';g.lineWidth=7;g.stroke(mapPath(player.edge));
 g.restore();
 const trace=guide||(!duel&&scenicTrace);
 if(trace){
   g.lineWidth=6;g.strokeStyle='#8af5ae';
   for(const points of trace.visiblePaths(nearby)){traceMapLine(g,points);g.stroke();}
   if(guide?.detour){
     g.setLineDash([10,7]);g.strokeStyle='#ffba78';traceMapLine(g,guide.detour.points);g.stroke();g.setLineDash([]);
   }
 }
 if(duel){
   g.strokeStyle='#a4ff63';g.lineWidth=5;g.beginPath();
   for(let d=0;d<=135;d+=3){const p=roads.sample(duel.at(duel.player+d));if(d)g.lineTo(p.x-car.x,p.z-car.z);else g.moveTo(p.x-car.x,p.z-car.z);}g.stroke();
   g.fillStyle='#ff6848';g.beginPath();g.arc(duel.actor.x-car.x,duel.actor.z-car.z,6,0,Math.PI*2);g.fill();
 }
 g.fillStyle='#b1dcca';for(const pin of tourPins){g.beginPath();g.arc(pin.x-car.x,pin.z-car.z,3.5,0,Math.PI*2);g.fill();}
 for(const p of gfx.streetLife.places){
   const dx=p.x-car.x,dz=p.z-car.z;
   if(Math.abs(dx)>220||Math.abs(dz)>220)continue;
   g.fillStyle=vietnamPlaceTypes[p.kind].colour;g.strokeStyle='#f2e9cf';g.lineWidth=1.6;
   g.beginPath();g.rect(dx-3.5,dz-3.5,7,7);g.fill();g.stroke();
 }
 if(landmark){g.fillStyle='#ffe7a5';g.strokeStyle='#423c28';g.lineWidth=2;g.beginPath();g.arc(landmark.x-car.x,landmark.z-car.z,7,0,Math.PI*2);g.fill();g.stroke();}
 g.fillStyle='#ffbe68';for(const n of npcs){g.beginPath();g.arc(n.x-car.x,n.z-car.z,4,0,2*Math.PI);g.fill();}
 g.restore();g.fillStyle='#e5ff9b';g.beginPath();g.moveTo(c.width/2,c.height*.56-7);g.lineTo(c.width/2+5,c.height*.56+5);g.lineTo(c.width/2-5,c.height*.56+5);g.fill();
 gfx.refreshMap();
}
let nextWeatherCheck=0;
function frame(now){
 const dt=clamp((now-last)/1000,0,.1);last=now;
 if(gfx&&player){
   if(mode==='drive'){
     const steps=Math.max(1,Math.ceil(dt*90));
     for(let i=0;i<steps&&mode==='drive';i++)tick(dt/steps);
     if(car.openingPose){
       openingCameraTime=Math.min(1,openingCameraTime+dt/.85);
       car.openingPose=reduceMotion.matches||inside?0:1-openingCameraTime**2*(3-2*openingCameraTime);
     }
     if(car.opening){
       car.dawn=clamp((210-distance)/85,0,1);
       if(distance>.25)document.body.removeAttribute('data-awaiting-motion');
       if(car.dawn===0){car.opening=false;document.body.removeAttribute('data-lakeside');}
     }
   }else if(mode==='sinking'){
     advanceFlood(car,dt);
     if(car.flood.age>=4.1){mode='pit';pit('water');}
   }else if(mode==='crash'){
     DriveBody.settle(car,dt);
     for(const actor of duel?[duel.actor,...npcs]:npcs){
       const r=actor.recoil;if(!r)continue;
       const {x,z,angle}=r,landing=DriveBody.advanceRecoil(actor,dt);
       actor.x+=r.x-x;actor.z+=r.z-z;actor.yaw+=r.angle-angle;
       if(r.fallen)wreckContact(actor);
       landingFx(actor,landing);
     }
     crashTime-=dt;if(crashTime<=0){mode='pit';pit(crashKind);}
   }
   if(mode!=='loading'&&roads&&!document.hidden&&now>=nextWeatherCheck){nextWeatherCheck=now+2000;gfx.weather.locate(...roads.geo(car.x,car.z));}
   car.driving=mode==='drive';car.showroom=mode==='grid';
   if(inside)car.energyPercent=DuongVietEnergy.pct(worldEnergy,worldTank.level);
   vehicleLook.update(dt);
   if(mode!=='loading'&&mode!=='error'&&mode!=='map'&&!$('postcard').open&&!$('fieldDialog').open&&!$('sightPhoto').open&&!document.hidden){
     // Keep steering against the displayed road until the next district is complete.
     // Look ahead at cruising speed so the next district starts building inside the overlap.
     const gap=gfx.districtDistance(car.x,car.z);
     const speed=mode==='drive'?Math.hypot(car.vx||0,car.vz||0):0;
     const lead=speed?Math.min(4,155/speed):0;
     const aheadX=car.x+(car.vx||0)*lead,aheadZ=car.z+(car.vz||0)*lead;
     const moved=mode==='drive'&&Math.hypot(aheadX-viewX,aheadZ-viewZ)>125+Math.min(65,speed*2);
     // A late scenery download can start a second build at the departure point.
     // Once the car leaves, spend that work on the road ahead instead.
     const leavingRefresh=moved&&speed>22&&gfx.districtDistance(viewX,viewZ)<1;
     const readyToRefresh=leavingRefresh||gfx.advanceRoads(mode==='drive'&&gap>210?10:4);
     if(readyToRefresh){
       if(gfx.sceneryChanged)pendingDistrict=districtView;
       if(moved||(pendingDistrict&&mode!=='tour'&&speed<22)){
         refreshView(gfx.queueRoads,aheadX,aheadZ);
       }else if(pendingDistrict&&mode==='tour'){
         const {edges,x,z,waterways,graph}=pendingDistrict;
         pendingDistrict=null;gfx.queueRoads(edges,x,z,waterways,graph);
       }
     }
     if(mode==='drive')stream();
     const ready=gfx.render(car,duel?[duel.actor,...npcs]:npcs,mode==='drive'||mode==='crash'||mode==='sinking'?dt:0,inside,now);
     if(mode==='tour')sightSecrets.update();
     if(mode==='tour'&&car.sightView?.data.id==='tam-chuc'){
       const point=gfx.projectSummit();
       summitMarker.hidden=!point;
       if(point){
         summitMarker.style.left=(point.x+1)*50+'%';
         summitMarker.style.top=(1-point.y)*50+'%';
       }
     }else summitMarker.hidden=true;
     if(ready&&!$('openingStill').hidden)$('openingStill').hidden=true;
   }
   if(mode==='drive'||mode==='sinking'){uiTick+=dt;if(uiTick>.13){uiTick=0;updateHud();}}
   driveAudio.update({electric:car.spec.electric,speed:Math.abs(car.speed)*3.6,boost:car.driving&&car.boost,slip:car.slip,offroad:car.offroad,throttle:held('w','arrowup'),braking:car.brake,signal:false,mode:mode==='drive'?'driving':mode==='grid'?'idling':'ready'});
 }
 if(toastTime>0&&(toastTime-=dt)<=0)$('callout').textContent='';
 requestAnimationFrame(frame);
}
const worldBoard=createLeaderboard('xuyen-viet','Xuyên Việt');
const guidedBoards=new Map();
function boardFor(route){
 if(!guidedBoards.has(route.id))guidedBoards.set(route.id,createLeaderboard(route.id,route.title,true));
 return guidedBoards.get(route.id);
}
let tripStart=0,guide=null,guideStarted=0,atlasChoice=null,customSaveKey=null;
function savedCustomRoute(trip){
 if(!trip.navigation?.key)return null;
 try{
   const saved=JSON.parse(localStorage.getItem('taylai.world.navigation')),r=saved?.route;
   if(saved?.key===trip.navigation.key && saved.graph===indexData.sourceSha256 && r && !r.id &&
      Array.isArray(r.edges) && r.edges.length && r.edges.length===r.lengths?.length &&
      r.edges.every(Number.isSafeInteger) && r.lengths.every(n=>Number.isFinite(n)&&n>0) &&
      [r.start,r.finish].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)) &&
      [r.startFraction,r.finishFraction].every(n=>n>=0&&n<=1))return r;
 }catch{}
 return null;
}
function startCustomClock(){
 const snapshot=loadRequest.restore?.navigation;
 guideStarted=performance.now()-(snapshot?.elapsed||0);
 if(snapshot){customSaveKey=snapshot.key;return;}
 try{
   // Write the long edge list once. Regular autosaves only update the cursor.
   const key=crypto.randomUUID();
   localStorage.setItem('taylai.world.navigation',JSON.stringify({key,graph:indexData.sourceSha256,route:guide.route}));
   customSaveKey=key;
 }catch{}
}
function prepareDrive(route){
 const address=new URL(location.href);
 for(const key of ['intro','search','collection','landmark','pass','plan','drive','view'])address.searchParams.delete(key);
 if(route.id)address.searchParams.set('drive',route.id);
 history.replaceState(null,'',address);
 for(const id of ['journeySetup','rest','guidedArrival'])if($(id).open)$(id).close();
 return startAt([route.startLabel,...route.start],null,route);
}
const planner=createDrivePlanner({
 getIndex:()=>indexData,
 getOrigin:()=>mode==='paused'?[nameOf(player.edge),...roads.geo(car.x,car.z)]:source,
 choosePoint:(label,place,accept)=>{atlasChoice={label,place,accept};openAtlas();},
 drive:prepareDrive,openBoard:route=>boardFor(route).open()
});
$('startGuided').onclick=$('pausedPlanner').onclick=()=>planner.open();
$('arrivalRetry').onclick=()=>prepareDrive(guide.route);
$('showGuidedBoard').onclick=()=>planner.open(false);
$('arrivalBoard').onclick=()=>{if(guide?.route.id)boardFor(guide.route).open(guide.timeMs);};
function leaveArrival(){
 $('guidedArrival').close();mode='drive';keySet.clear();updateHud();
}
$('arrivalTour').onclick=()=>{leaveArrival();$('tourView').click();};
$('arrivalDrive').onclick=leaveArrival;
$('guidedArrival').oncancel=e=>{e.preventDefault();leaveArrival();};
$('showBoard').onclick=()=>worldBoard.open();
$('openSetup').onclick=()=>$('journeySetup').showModal();
$('closeSetup').onclick=()=>$('journeySetup').close();
$('scoreBoard').onclick=()=>guide?.route.id?boardFor(guide.route).open(guide.timeMs):worldBoard.open(distance-tripStart);
async function begin(){
 if(mode==='error'){if(loadRequest&&indexData)startAt(loadRequest.place,loadRequest.restore,loadRequest.guided);else location.reload();return;}
 if(!player||mode!=='grid')return;
 if($('journeySetup').open)$('journeySetup').close();
 if(!gfx){
   const token=loadToken;mode='loading';
   $('launch').disabled=$('challenge').disabled=true;$('launch').textContent='Đang tải cảnh 3D…';
   try{
     if(!await prepareWorld(roads,token))return;
   }catch(e){
     if(token===loadToken){mode='error';$('loadStatus').textContent=e.message;$('launch').textContent='Thử tải lại';$('launch').disabled=false;}
     return;
   }
   $('launch').disabled=false;$('challenge').disabled=Boolean(guide);
 }
 $('openingStill').hidden=true;
 activeTrip=true;tripStart=distance;signatureTrip?.begin(distance);
 const address=new URL(location.href);
 if(address.searchParams.has('intro')){
   address.searchParams.delete('intro');
   history.replaceState(null,'',address);
 }
 if(guide?.route.id){guideStarted=performance.now();boardFor(guide.route).start(tripVehicleChoice(car.model));}
 else if(guide){startCustomClock();save();}
 else worldBoard.start(tripVehicleChoice(car.model));
 $('raceMode').hidden=Boolean(guide);
 $('scoreBoard').hidden=Boolean(guide&&!guide.route.id);
 $('scoreBoard').textContent=guide?'Bảng hạng · '+guide.route.title:'Xem hạng và gửi thành tích';
 mode='drive';document.body.dataset.phase='drive';$('grid').hidden=true;$('hud').hidden=false;$('touch').hidden=false;$('camera').hidden=false;$('pause').hidden=false;updateHud();
 if(!guide&&!duel)inform(matchMedia('(pointer:coarse)').matches?'Giữ Ga để lăn bánh · chạm ◀ hoặc ▶ để đánh lái':'Giữ W hoặc ↑ để lên ga · A/D để đánh lái',4);
 if(car.opening){
   document.body.setAttribute('data-awaiting-motion','');
   driveAudio.ignition(car.spec.electric);
 }
 else driveAudio.cue(true);
}
function pause(){
 if(mode!=='drive')return;mode='paused';keySet.clear();save();$('raceMode').textContent=duel?'Lái tự do':'Đua xuyên Việt';$('positionLabel').textContent=nameOf(player.edge)+' · '+fmt(distance);$('rest').showModal();
}
$('launch').onclick=begin;$('pause').onclick=pause;
$('worldEnergy').onclick=async()=>{
 if(mode!=='drive')return;
 mode='service';DriveBody.reset(car);keySet.clear();worldTank.flush();
 const [lon,lat]=roads.geo(car.x,car.z);
 let station=null;try{station=DuongVietEnergy.nearest(await DuongVietEnergy.stations(worldEnergy.fuel==='electric'),lat,lon);}catch{}
 DuongVietEnergy.panel(worldEnergy,{station,onChanged:()=>worldTank.reload(),exit:()=>{worldTank.reload();mode='drive';keySet.clear();updateHud();},
   relocate:p=>{const url=new URL('index.html',document.baseURI);url.searchParams.set('pin',p.lat.toFixed(5)+','+p.lon.toFixed(5));url.searchParams.set('edition','atlas-pin');url.searchParams.set('label',p.name);url.searchParams.set('vehicle',car.model);url.searchParams.set('camera',inside?'cockpit':'chase');url.searchParams.set('practice','free');url.searchParams.set('sound',driveAudio.enabled?'1':'0');location.assign(url);}
 });
};
window.addEventListener('pagehide',()=>worldTank?.flush());

const sightPhotos=createSightPhotos();
const fieldViews=createSightFieldViews(async id=>{
 const stop=allStops.get(id);if(!stop||mode!=='tour')return;
 loadingStop(true);
 try{await frameStop(stop);}
 catch{inform('Chưa tải được cảnh công trình này.');}
 finally{loadingStop(false);}
});
const sightSecrets=createSightSecrets(()=>car.sightView,driveAudio.souvenir);
function frameAboveTourControls(){
 if(!car.sightView)return;
 const canvas=$('world'),panel=$('tourCamera');
 const width=canvas.clientWidth,height=canvas.clientHeight;
 const covered=panel.hidden?0:Math.max(0,canvas.getBoundingClientRect().bottom-panel.getBoundingClientRect().top);
 $('secretField').style.setProperty('--secret-dock',covered+'px');
 // Frame the whole view between the top HUD and the actual tour panel.
 const top=Math.min(38,Math.round(height*.055));
 const visibleHeight=Math.max(64,height-covered-top-6);
 car.sightView.viewport=covered&&width&&height?{width,height,top,visibleHeight}:null;
}
const tourLayout=new ResizeObserver(frameAboveTourControls);
tourLayout.observe($('tourCamera'));tourLayout.observe($('world'));
const tourInfo=$('tourInfo'),tourSummary=tourInfo.querySelector('summary');
const narrowTour=matchMedia('(max-width:720px) and (orientation:portrait), (max-width:1050px) and (max-height:650px)');
function fitTourNotes(){tourInfo.open=!narrowTour.matches;}
fitTourNotes();narrowTour.addEventListener('change',fitTourNotes);
tourSummary.onclick=e=>{if($('tourDescription').hidden)e.preventDefault();};
function showMonument(monument,viewIndex=0,collection=null,stopId=monument.data.id){
 const views=monument.data.views,view=views?.[viewIndex];
 const data=view?{...monument.data,...view,id:monument.data.id,name:monument.data.name}:monument.data;
 const portraitOverview=monument.data.id==='tam-chuc'&&innerWidth<innerHeight;
 const angle=portraitOverview?data.yaw-.27:(data.viewAngle??(data.yaw+.23));
 const [east,south]=view?.offset??[0,0];
 car.sightView={monument,data,stopId,x:monument.x+east,z:monument.z+south,height:view?.height??monument.height,
   angle,elevation:data.viewElevation??.27,zoom:1,hour:$('tourLight').value===''?null:Number($('tourLight').value)};
 const visit=collection||visitsByStop.get(stopId)||visitsByStop.get(monument.data.id);
 $('tourZoom').value='1';sightPhotos.select(view?.photoCatalogId?data:monument.data);
 fieldViews.select(monument.data,collection||visit);
 const description=[data.description,data.arrivalNote].filter(Boolean).join(' ');
 $('tourDescription').textContent=description;$('tourDescription').hidden=!description&&!view?.photoCredit;
 tourSummary.tabIndex=$('tourDescription').hidden?-1:0;
 tourSummary.setAttribute('aria-disabled',String($('tourDescription').hidden));
 if(view?.photoCredit){
   const link=document.createElement('a');link.href=view.photoCreditUrl||'landmark-scans/CREDITS.txt';link.target='_blank';link.rel='noopener';
   link.textContent=view.photoCredit;$('tourDescription').append(' ',link);
 }
 $('tourTitle').textContent=view?.title||monument.data.name;$('tourCamera').hidden=false;
 sightSecrets.select(collection||monument.data);
 $('complexStopLabel').hidden=!(views||data.complex||visit);
 const select=$('complexStop');
 if(views){
   select.replaceChildren(...views.map((v,i)=>new Option(v.name,i)));select.value=String(viewIndex);
 }else if(data.complex){
   select.replaceChildren(...templeStopOptions);select.value=data.id;
 }else select.replaceChildren();
 if(visit){
   const group=document.createElement('optgroup');group.label=visit.name;
   group.append(new Option('Toàn quần thể · '+visit.name,'visit/'+visit.id));
   for(const stop of visit.stops)group.append(new Option(stop.name,'stop/'+stop.id));
   select.append(group);
   if(collection)select.value='visit/'+collection.id;
   else if(!views)select.value='stop/'+monument.data.id;
 }
 frameAboveTourControls();
}
async function frameStop(stop){
 const collection=stop.stops?stop:null;
 if(stop.stops)stop=stop.stops[0];
 // A mapped stop can select a camera kilometres from the model origin.
 // Load the district containing the model before applying its camera offset.
 const location=(stop.viewOf&&allStops.get(stop.viewOf[0]))||stop.lookout||stop;
 await VietnamTourism.loadRegion(location.lon,location.lat);
 const {x,z}=roads.point(location.lon,location.lat);
 if(Math.hypot(x-(tourCenter?.x??viewX),z-(tourCenter?.z??viewZ))>285){
   tourGraph??=new VietnamRoads(indexData,roads.lon,roads.lat);
   loadStructuresNear(tourGraph,x,z);
   await Promise.all([tourGraph.load(x,z),gfx.loadDistrict(tourGraph,x,z),(async()=>{
     try{tourWater??=new VietnamWater(await fetchWaterIndex(),tourGraph);await tourWater.load(x,z);}catch{tourWater=null;}
   })()]);
   drawDistrict(tourGraph,tourWater,x,z,tourGraph.nearby(x,z,560));tourCenter={x,z};
 }
 if(stop===tamChucOverview)return showMonument({data:stop,x,z,height:75});
 if(stop.viewOf){
   const [modelId,view]=stop.viewOf,site=gfx.nearLandmark(x,z,modelId);
   if(site?.data.views?.[view])return showMonument(site,view,collection,stop.id);
 }
 const authored=gfx.nearLandmark(x,z,stop.id);
 const approach=roads.point(...stop.start),dx=approach.x-x,dz=approach.z-z;
 const distance=Math.hypot(dx,dz),yaw=distance>2?Math.atan2(dx,dz):authored?.data.yaw||0;
 function surroundings(width,depth,height){
   const includeRoad=distance>=12&&distance<=320;
   return {name:includeRoad?'Quang cảnh và đường vào':'Toàn cảnh địa hình',
     offset:includeRoad?[dx*.28,dz*.28]:[0,0],viewAngle:yaw+.24,viewElevation:.40,
     viewRadius:Math.max(85,Math.max(width,depth)*1.35,height*1.6,includeRoad?distance*1.05:0),
     height:Math.min(30,Math.max(5,height*.6))};
 }
 if(authored?.data.id===stop.id){
   const data=authored.data;
   if(!data.views&&!data.complex)authored.data={...data,views:[
     {name:'Cận cảnh địa danh'},surroundings(data.width,data.depth,authored.height)]};
   return showMonument(authored,0,collection);
 }
 const footprint=stop.lookout?null:gfx.sightFootprint(stop,x,z);
 const wide=stop.km||['Hồ','Vịnh','Khu bảo tồn','Vườn quốc gia','Đỉnh núi','Bãi biển','Điểm ngắm cảnh'].includes(stop.kind);
 const tags=window.VietnamSightDetails?.[stop.id]||{};
 const extent=footprint?[footprint.maxX-footprint.minX,footprint.maxZ-footprint.minZ]:tags.extent;
 const [ew,ns]=extent||[wide?165:68,wide?165:68];
 const c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
 const width=clamp(ew*c+ns*s,13,440),depth=clamp(ew*s+ns*c,13,440);
 const height=footprint?.h||Math.min(wide?18:12,Math.max(3,Math.min(width,depth)*.14));
 const description=[stop.description,tags.start_date?'Niên đại ghi trên bản đồ là năm '+tags.start_date+'.':'',
   tags.architect?'Thiết kế của '+tags.architect+'.':''].filter(Boolean).join(' ');
 const data={...stop,width,depth,yaw,viewAngle:yaw,viewElevation:wide?.53:.39,description};
 data.views=stop.views?[...stop.views]:
   (footprint&&!footprint.stelae?.length?gfx.footprintViews(footprint,x,z,approach.x,approach.z):null)
   ||(!footprint?landscapeTourViews(location.kind,x,z,yaw,gfx.ground,gfx.waterAt):null)
   ||[{name:'Toàn cảnh địa điểm'},surroundings(width,depth,height)];
 if(footprint?.stelae?.length){
   data.views[0]={name:'Toàn cảnh nhà bia',viewAngle:footprint.stelae[0].viewAngle,viewElevation:.14};
   const metres=n=>n.toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2})+' m';
   for(const stone of footprint.stelae){
     const title='Bia khoa '+stone.year;
     data.views.push({name:title,title,offset:[stone.x-x,stone.z-z],viewAngle:stone.viewAngle,viewElevation:.08,
       viewRadius:Math.max(2.4,stone.width*2.15),height:stone.height*1.57,
       description:'Bia cao '+metres(stone.height)+', rộng '+metres(stone.width)+'. Số đo và thứ tự trong nhà bia theo khảo cứu của Đào Thị Thúy Anh (2017).',
       photoCredit:stone.year===1442?'Ảnh mặt bia của Ngokhong · CC BY-SA 3.0':null,arrivalNote:''});
   }
 }
 // A surveyed set may look from another elevation than the arrival road.
 // Orbiting the summit at road distance would label an aerial view as a road view.
 if(!(stop.mappedEntrance&&stop.views?.length)&&distance>=22&&distance<=350)data.views.push({name:'Từ phía đường ô tô',viewAngle:yaw,
   viewRadius:distance,viewElevation:.065,height:Math.min(8,height)});
 showMonument({data,x,z,height},0,collection);
}
$('tourView').onclick=()=>{
 if(mode!=='drive')return;
 const monument=visitTarget();if(monument)return openTour(monument.data);
};
async function openTour(site){
 mode='tour';keySet.clear();inform('',0);
 document.body.dataset.phase='tour';$('grid').hidden=true;
 const target=site.id==='tam-chuc'?tamChucOverview:site;
 loadingStop(true);
 try{await frameStop(target);}
 catch{
   loadingStop(false);await closeTour();
   const message='Chưa tải được cảnh. Bạn có thể mở lại góc ngắm.';
   if(activeTrip)inform(message);else $('loadStatus').textContent=message;
   return;
 }
 loadingStop(false);
 for(const id of ['hud','touch','camera','pause'])$(id).hidden=true;
 $('backToCar').focus({preventScroll:true});
}
$('tourZoom').oninput=e=>{if(car.sightView)car.sightView.zoom=Number(e.target.value);};
$('tourLight').onchange=e=>{if(car.sightView)car.sightView.hour=e.target.value===''?null:Number(e.target.value);};
let tourPointer=null,tourGraph=null,tourWater=null,tourCenter=null;
function loadingStop(busy){
 $('secretOpen').disabled=$('complexStop').disabled=$('backToCar').disabled=busy;
 $('tourCamera').setAttribute('aria-busy',String(busy));
}
$('complexStop').onchange=async e=>{
 const collection=e.target.value.startsWith('visit/')?regionalVisits.find(v=>'visit/'+v.id===e.target.value):null;
 const stopId=e.target.value.startsWith('stop/')?e.target.value.slice(5):null;
 if(!collection&&!stopId&&mode==='tour'&&car.sightView?.monument.data.views){
   showMonument(car.sightView.monument,Number(e.target.value),null,car.sightView.stopId);return;
 }
 const stop=collection||(stopId?destinations.find(s=>s.id===stopId):e.target.value==='tam-chuc'?tamChucOverview:tamChucParts.find(s=>s.id===e.target.value));
 if(mode!=='tour'||!stop)return;
 loadingStop(true);
 try{
   await frameStop(stop);
 }catch{
   $('complexStop').value=car.sightView.data.id;
   $('tourDescription').hidden=false;$('tourDescription').textContent='Chưa tải được cảnh. Hãy chọn lại công trình hoặc trở lại xe.';
   tourSummary.tabIndex=0;tourSummary.setAttribute('aria-disabled','false');tourInfo.open=true;
 }finally{loadingStop(false);}
};
async function closeTour(){
 if(mode!=='tour'||$('backToCar').disabled)return;
 if(tourGraph){
   loadingStop(true);
   loadStructuresNear(roads,car.x,car.z);
   try{await gfx.loadDistrict(roads,car.x,car.z);}
   catch{inform('Chưa tải đủ cảnh quanh xe.');}
   finally{tourGraph=tourWater=tourCenter=null;loadingStop(false);}
   refreshView();
 }
 mode=activeTrip?'drive':'grid';document.body.dataset.phase=mode;
 sightSecrets.close();
 car.sightView=null;tourPointer=null;keySet.clear();$('tourCamera').hidden=true;$('grid').hidden=activeTrip;
 for(const id of ['hud','touch','camera','pause'])$(id).hidden=!activeTrip;
 if(activeTrip)updateHud();
 $(activeTrip?'tourView':'launch').focus({preventScroll:true});
}
$('backToCar').onclick=closeTour;
$('world').addEventListener('pointerdown',e=>{
 if(mode!=='tour'||tourPointer)return;
 $('world').setPointerCapture(e.pointerId);tourPointer={id:e.pointerId,x:e.clientX,y:e.clientY};
});
$('world').addEventListener('pointermove',e=>{
 if(!car.sightView||tourPointer?.id!==e.pointerId)return;
 car.sightView.angle-=(e.clientX-tourPointer.x)*.009;
 car.sightView.elevation=clamp(car.sightView.elevation+(e.clientY-tourPointer.y)*.004,Math.min(.13,car.sightView.data.viewElevation??.13),1.05);
 tourPointer.x=e.clientX;tourPointer.y=e.clientY;
});
$('world').addEventListener('lostpointercapture',()=>{tourPointer=null;});
$('challenge').onclick=()=>{if(mode==='grid'){duel=new RollingDuel(roads,player);begin();inform('Theo vệt xanh · vượt đối thủ trước mốc 1,2 km.',4);}};
$('raceMode').onclick=()=>{
 if(duel){duel=null;inform('Đã chuyển sang lái tự do.');}
 else{duel=new RollingDuel(roads,player);inform('Chặng đua 1,2 km bắt đầu.');}
 $('resume').click();updateHud();
};
$('resume').onclick=()=>{$('rest').close();mode='drive';keySet.clear();};
$('reverse').onclick=()=>{$('resume').click();recover();};
$('camera').onclick=()=>{
 inside=!inside;
 DriveView.select(inside?'cockpit':'chase');
 updateDriveViewButton($('camera'),inside);
 if(mode==='drive')updateHud();
};
let postcardDialog;
for(const button of document.querySelectorAll('[data-postcard]')){
 button.onclick=async()=>{
   if(!gfx||button.disabled)return;
   const phase=mode;
   const sightseeing=phase==='tour';
   const stop=sightseeing?car.sightView?.data:visitTarget()?.data;
   // Use a known landmark entrance, otherwise share the road the car is on.
   const [lon,lat]=roads.geo(car.x,car.z);
   const featured=JourneyDepartures.byId(stop?.id);
   const address=new URL('./',location.href);
   if(featured)address.searchParams.set('intro',featured.id);
   else if(stop?.id)address.searchParams.set(scenicPasses.has(stop.id)?'pass':'landmark',stop.id);
   else address.searchParams.set('pin',lat.toFixed(5)+','+lon.toFixed(5));
   const found=sightseeing&&!$('secretResult').hidden;
   const details={title:featured?.title||stop?.name||nameOf(player.edge),url:address.href,
     note:featured?.note||'Tạt qua có một tí. Sao ảnh trong máy lại nhiều thế nhỉ?',
     stamp:found?$('secretTitle').textContent:'',stampArt:found?$('secretPrint').querySelector('svg'):null};
   button.disabled=true;
   try{
     const {createPostcardDialog}=await import('./journey-postcard.mjs');
     if(mode!==phase||(!sightseeing&&!$('rest').open))return;
     postcardDialog??=createPostcardDialog();
     await postcardDialog.open(()=>gfx.capturePhoto(),details);
   }catch{inform('Chưa mở được bưu thiếp. Hãy thử lại.');}
   finally{button.disabled=false;}
 };
}
const shutter=$('takePhoto');
let savingPhoto=false;
async function takeScenePhoto(){
 if(savingPhoto||!gfx||document.querySelector('dialog[open]'))return;
 if(mode!=='drive' && !(mode==='tour'&&car.sightView&&!$('backToCar').disabled))return;
 savingPhoto=true;
 try{
   const place=mode==='tour'?car.sightView.data.name:$('street').textContent;
   const locationName=place.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'');
   const stamp=new Date().toISOString().replace(/[:.]/g,'-');
   const image=await gfx.capturePhoto();
   if(!image)throw Error('Empty photo');
   const link=document.createElement('a');
   link.download='vi-vu-dat-Viet-'+(locationName||'Xuyen-Viet')+'-'+stamp+'.png';
   link.href=URL.createObjectURL(image);
   document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(link.href),30000);
   inform('Đã chụp ảnh cảnh.');
 }catch{inform('Chưa lưu được ảnh. Hãy thử chụp lại.');}
 finally{savingPhoto=false;}
}
// A second finger can press the shutter while the first holds the eye control.
shutter.onpointerdown=e=>e.preventDefault();
shutter.onpointerup=e=>{if(e.button===0)takeScenePhoto();};
shutter.onclick=e=>{if(e.detail===0)takeScenePhoto();};
function soundLabel(){
 $('sound').textContent=driveAudio.enabled?'Tắt âm':'Bật âm';
 $('sound').dataset.muted=String(!driveAudio.enabled);
 $('sound').title=$('sound').textContent;
}
if(signatureTrip&&driveAudio.enabled!==signatureTrip.sound)driveAudio.toggle();
soundLabel();$('sound').onclick=()=>{driveAudio.toggle();soundLabel();};
$('rest').oncancel=e=>{e.preventDefault();$('resume').click();};
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(k==='f'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(mode==='drive'||mode==='tour')&&
    !e.target.closest?.('input,textarea,select,[contenteditable=true],dialog')){
   if(!e.repeat)takeScenePhoto();
   return;
 }
 if(k===' '&&e.target===shutter)return;
 if(k==='m'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(mode==='drive'||mode==='map')){
   e.preventDefault();
   if(!e.repeat){if(mode==='map')$('drivingMap').close();else openDrivingMap();}
   return;
 }
 if(mode==='tour'){
   if(document.querySelector('dialog[open]'))return;
   if(k==='escape'&&!sightSecrets.escape())closeTour();
   if(car.sightView&&!['SELECT','INPUT'].includes(e.target.tagName)&&(k==='arrowleft'||k==='arrowright')){car.sightView.angle+=(k==='arrowleft'?-1:1)*.09;e.preventDefault();}
   return;
 }
 if(mode!=='drive')return;
 if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select,[contenteditable=true],dialog'))return;
 if(['p','u','c'].includes(k)&&!e.repeat){
   if(k==='p')pause();if(k==='u')recover();if(k==='c')$('camera').click();e.preventDefault();return;
 }
 if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown','shift',' '].includes(k)){keySet.add(k);e.preventDefault();}
});
window.addEventListener('keyup',e=>keySet.delete(e.key.toLowerCase()));
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',save);

let pendingPlace=featured[0],atlasPromise,originatedInPause=false;
const normalize=s=>s.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const tamChucParts=VietnamLandmarks.entries.filter(site=>site.complex==='tam-chuc').sort((a,b)=>a.tourOrder-b.tourOrder);
const tamChucOverview={id:'tam-chuc',complex:'tam-chuc',name:'Toàn cảnh trục chùa Tam Chúc',lon:105.79565,lat:20.55279,yaw:2.39,viewAngle:1.24,viewElevation:.50,width:260,depth:595,
 description:'Từ hồ vào núi, trục chùa đi qua Tam Quan nội, Vườn Cột Kinh và ba điện Quan Âm, Pháp Chủ, Tam Thế. Chùa Ngọc nằm cao hơn trên núi Thất Tinh.',
 photo:'https://vietnamtourism.gov.vn/en/printer/15748?type=1'};
const summitId='chua-ngoc-tam-chuc',summitName='Chùa Ngọc · đỉnh Thất Tinh';
const templeStopOptions=[new Option('Toàn cảnh trục chùa','tam-chuc'),
 ...tamChucParts.map(part=>new Option(part.id===summitId?summitName:part.name,part.id))];
const summitMarker=document.createElement('button');
summitMarker.id='summitMarker';summitMarker.hidden=true;summitMarker.textContent=summitName;
$('tourCamera').before(summitMarker);
summitMarker.onclick=()=>{
 if($('complexStop').disabled)return;
 $('complexStop').value=summitId;
 $('complexStop').dispatchEvent(new Event('change'));
};
const tamChuc={...tamChucParts.find(site=>site.tourOrder===1),id:'tam-chuc',name:'Quần thể Tam Chúc',custom:true,kind:'Quần thể kiến trúc',formerProvince:'Hà Nam',searchNames:tamChucParts.map(s=>s.name).join(' ')};
const models=VietnamLandmarks.entries.filter(site=>!site.complex).map(site=>({
 ...site,custom:true,kind:site.surveyed?site.kind:'Mô hình 3D'
}));
models.push(tamChuc);
const galleryHighlights=['cau-vang-ba-na','ban-gioc','buu-dien-sai-gon','dien-kinh-thien',
 'hon-trong-mai','ganh-da-dia','cot-co-mui-ca-mau','tam-chuc','doi-che-tan-cuong',
 'nha-tho-duc-ba-sai-gon','bau-trang','cau-rong','dinh-thu-ho-vuong','rung-tram-u-minh-thuong',
 'khue-van-cac','bao-tang-chien-thang-dien-bien-phu','thac-vuc-hom','hai-dang-hon-bai'];
const galleryOrder=new Map(galleryHighlights.map((id,i)=>[id,i]));
const gallery=models.slice().sort((a,b)=>(galleryOrder.get(a.id)??galleryOrder.size)-(galleryOrder.get(b.id)??galleryOrder.size)||
   Number(!!a.surveyed)-Number(!!b.surveyed)||a.name.localeCompare(b.name,'vi'));
// Eastbound on the lakeside road, just before it curves toward Tam Quan nội.
const openingPlace=['Tam Chúc',105.79650,20.555945,tamChuc];
const tourismSites=window.VietnamTourism?.entries||[];
const modeledStops=new Map();
const sharedSites=new Map([
 ['osm-way-640295913','san-hanh-le-doi-d1'],
 ['osm-node-6565918086','osm-way-1556531233'],
 ['osm-way-1346643116','tam-chuc'],['osm-way-1273113083','dinh'],
 ['osm-way-1272874768','ke-ga'],['osm-way-1545646899','hai-dang-mui-dinh']
]);
for(const model of models){
 if(model.approachMeters==null){
   const east=(model.start[0]-model.lon)*111320*Math.cos(model.lat*Math.PI/180);
   model.approachMeters=Math.hypot(east,(model.start[1]-model.lat)*110900);
 }
 let closest=null,best=Infinity;
 const local=VietnamTourism.nearby(model.lon,model.lat,.03,.03);
 for(const site of local.length?local:tourismSites){
   const d=(site.lon-model.lon)**2+(site.lat-model.lat)**2;
   if(d<best){best=d;closest=site;}
   if(!site.viewOf&&d<.003**2&&(normalize(model.name)===normalize(site.name)||model.map&&model.map===site.map))modeledStops.set(site.id,model);
 }
 if(model.catalogId)modeledStops.set(model.catalogId,model);
 if(closest){model.region??=closest.region;model.province??=closest.province;}
}
for(const [id,modelId] of sharedSites){
 const model=models.find(site=>site.id===modelId);
 if(model)modeledStops.set(id,model);
}
const catalog=tourismSites.filter(site=>!modeledStops.has(site.id))
  .map(site=>({...site,photo:window.VietnamSightDetails?.[site.id]?.photo}));
const catalogById=new Map(catalog.map(s=>[s.id,s]));
const legacyDestinations=new Map(modeledStops);
for(const [alias,id] of Object.entries(VietnamTourism.aliases||{})){
 const replacement=modeledStops.get(id)||catalogById.get(id);
 if(replacement)legacyDestinations.set(alias,replacement);
}
const mountainPlaces=mountainStages.map(stage=>({
 id:stage.id,name:stage.name,kind:'Đường đèo',city:scenicPasses.get(stage.id)?.region||'Đường đèo',start:stage.start,
 lon:stage.start[0],lat:stage.start[1],bearing:stage.bearing,km:stage.angles.length*stage.step/1000
}));
const visitsByStop=new Map(),allStops=new Map([...catalog,...models].map(site=>[site.id,site]));
for(const site of models)if(site.catalogId)allStops.set(site.catalogId,site);
const regionalVisits=heritageVisits.map(([id,name,ids])=>{
 const stops=ids.map(key=>allStops.get(key)||legacyDestinations.get(key)).filter(Boolean);
 if(!stops.length)return null;
 const first=stops[0],visit={id,name,kind:'Quần thể',city:first.city,province:first.province,region:first.region,
   start:first.start,lon:first.lon,lat:first.lat,approachMeters:first.approachMeters,visitOnArrival:true,
   arrivalNote:(first.arrivalNote||'Xe dừng ở điểm đầu tuyến.')+' Chọn một trong '+stops.length+' điểm dừng ở mục Góc ngắm.',
   stops,searchNames:stops.map(s=>s.name).join(' ')};
 for(const stop of stops)visitsByStop.set(stop.id,visit);
 return visit;
}).filter(Boolean);
// A precinct may consist entirely of separate mapped stops around one model.
// Its canonical Atlas card should also offer the itinerary.
for(const visit of regionalVisits)for(const stop of visit.stops){
 const modelId=stop.viewOf?.[0];
 if(modelId&&!visitsByStop.has(modelId))visitsByStop.set(modelId,visit);
}
const destinations=[...models,...regionalVisits,...mountainPlaces,...catalog];
VietnamTourism.onEntries=sites=>{
 for(const site of sites){
   if(modeledStops.has(site.id))continue;
   const entry={...site,photo:window.VietnamSightDetails?.[site.id]?.photo};
   catalogById.set(site.id,entry);catalog.push(entry);destinations.push(entry);
 }
};
VietnamTourism.onComplete=()=>{
 catalog.sort((a,b)=>a.atlasOrder-b.atlasOrder);
 destinations.splice(models.length+regionalVisits.length+mountainPlaces.length,catalog.length,...catalog);
};
function catalogStop(id){
 const key=VietnamTourism.aliases?.[id]||id;
 return legacyDestinations.get(id)||modeledStops.get(key)||catalogById.get(key);
}
function useSightEntrance(site){
 const stop=site.stops?.[0]||site;
 if(site.accessRoad||stop.arrivalNote)return;
 const arrival=indexData?.sightAccess?.stops[stop.catalogId||stop.id];
 if(!arrival)return;
 const [edge,x,y,dx,dy]=arrival,lon=x/1e5,lat=y/1e5,cos=Math.cos(lat*Math.PI/180);
 site.start=[lon,lat];site.accessRoad=edge;
 site.approachMeters=Math.hypot((site.lon-lon)*111320*cos,(site.lat-lat)*110900);
 site.bearing=Math.atan2(dx*cos,dy)*180/Math.PI;
}
function tourPlace(site){
 useSightEntrance(site);
 return [site.km?site.name:site.name+' · '+site.city,...site.start,site];
}
function featuredDeparture(departure){
 return departure.id==='tam-chuc'?openingPlace:tourPlace(models.find(site=>site.id===departure.id));
}
$('departureChoices').addEventListener('click',event=>{
 const link=event.target.closest('a[data-departure]');
 if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!indexData)return;
 event.preventDefault();
 if(link.hasAttribute('aria-current')&&mode!=='error')return;
 history.replaceState(null,'',link.href);
 startAt(featuredDeparture(JourneyDepartures.byId(link.dataset.departure)));
});
// Representative island positions (longitude, latitude), rounded for the national atlas.
// Hoàng Sa: https://danang.gov.vn/vi/web/dng/w/ubnd-huyen-hoang-sa-i
// Trường Sa: https://dulichso.khanhhoa.gov.vn/article/bia-chu-quyen-quan-dao-truong-sa-tai-dao-song-tu-tay-va-dao-nam-yet-980
const archipelagoPlaces=[
 {name:'Hoàng Sa',province:'Đà Nẵng',lon:111.95,lat:16.45,
  islands:[[111.19,15.78],[111.60,16.53],[111.77,16.05],[112.33,16.83],[112.72,16.67]]},
 {name:'Trường Sa',province:'Khánh Hòa',lon:113.9,lat:10.0,
  islands:[[111.92,8.63],[114.37,10.18],[114.30,11.43]]}
].map(site=>['Quần đảo '+site.name,site.lon,site.lat,{...site,kind:'Quần đảo',region:'Trung Bộ'}]);
for(const [label,values] of [['Vùng',['Bắc Bộ','Trung Bộ','Nam Bộ']],['Tỉnh, thành phố',(VietnamTourism.provinces||[...new Set(catalog.map(s=>s.province))]).sort((a,b)=>a.localeCompare(b,'vi'))]]){
 const group=document.createElement('optgroup');group.label=label;
 for(const value of values)group.append(new Option(value,value));$('tourFilter').append(group);
}
let matches=[],mapPins=[],mapLabels=[],projection,pageSize=24,focusedPin=null,activeResult=-1;
const finder=createAtlasFinder({entries:searchEntries,onLoading:searchLoading,onResults:showSearchResults});
function searchEntries(){
 const places=destinations.map(s=>({place:tourPlace(s),context:[s.kind,s.city,s.searchNames,s.formerProvince,s.region].filter(Boolean).join(' ')}));
 for(const place of archipelagoPlaces)places.push({place,featured:true,context:place[0]+' Việt Nam'});
 for(const p of featured)places.push({place:p,featured:true,context:p===baSaoDrive?'Ba Sao Kim Bảng Hà Nam Ninh Bình QL21':''});
 for(const p of atlasData?.places||[])places.push({place:p});
 return places;
}
function searchLoading(){
 matches=[];activeResult=-1;$('places').replaceChildren();$('picked').textContent='';$('travel').disabled=true;
 $('findPlace').removeAttribute('aria-activedescendant');$('findPlace').setAttribute('aria-expanded','false');
 $('resultCount').textContent='Đang tìm…';$('morePlaces').hidden=$('retrySearch').hidden=true;
}
function samePlace(a,b){return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];}
function choosePlace(place,focus=false){
 pendingPlace=place;const site=place[3];
 if(focus)focusedPin=place;
 activeResult=matches.findIndex(p=>samePlace(p,place));$('travel').disabled=!indexData||!!site?.islands;
 $('travel').textContent=atlasChoice?'Dùng làm '+atlasChoice.label:site?.stops?'Mở tuyến tham quan':site?.visitOnArrival?'Ngắm '+site.name:
   site&&!site.accessRoad&&site.approachMeters>=500?'Xuất phát từ đường gần nhất':'Đặt điểm xuất phát';
 const raceLink=$('racePass');raceLink.hidden=!site?.km;
 if(site?.km)raceLink.href='cup.html?route='+encodeURIComponent(site.id);
 const approach=site?.accessRoad?' · đường tham quan mô phỏng':site?.approachMeters>=20?' · điểm dừng xe cách địa danh khoảng '+atlasDistance(site.approachMeters/1000)+' theo đường thẳng':'';
 $('picked').textContent=site?.islands?place[0]+' · '+site.province+', Việt Nam · Chỉ xem bản đồ':place[4]?[place[0],place[4].context].filter(Boolean).join(' · '):site?.km?site.name+' · '+site.km.toLocaleString('vi-VN')+' km trong Cúp':site?site.name+' · '+(site.province||site.city)+' · '+site.kind+approach:place[0]+' · '+place[2].toFixed(3)+'° B, '+place[1].toFixed(3)+'° Đ';
 for(const b of $('places').children){const selected=Number(b.dataset.index)===activeResult;b.setAttribute('aria-selected',selected);b.setAttribute('aria-pressed',selected);}
 const option=$('places').children[activeResult];
 if(option)$('findPlace').setAttribute('aria-activedescendant',option.id);else $('findPlace').removeAttribute('aria-activedescendant');
 drawAtlas();
}
function placeList(keepScroll=false){
 const q=$('findPlace').value.trim(),filter=$('tourFilter').value;
 if(q){
   const coordinates=parseAtlasCoordinates(q);
   if(coordinates){finder.cancel();showSearchResults([coordinates],{total:1});return;}
   finder.query(q,filter,roads?roads.geo(car.x,car.z):source.slice(1,3),pageSize,destinations.length+':'+Boolean(atlasData));return;
 }
 finder.cancel();$('retrySearch').hidden=true;
 const places=filter==='heritage'?regionalVisits:filter==='model'?gallery:
   destinations.filter(s=>filter==='all'||(filter==='mountain'?!!s.km:filter===s.region||filter===s.province));
 matches=places.map(tourPlace);
 if(filter==='all')matches.push(...featured);
 renderPlaces(matches.length,keepScroll);
 $('resultCount').textContent=matches.length.toLocaleString('vi-VN')+(filter==='heritage'?' tuyến tham quan':' điểm đến');
 choosePlace(pendingPlace);
}
function showSearchResults(places,status){
 if(!$('atlas').open)return;
 matches=places;renderPlaces(status.total||0);
 const suffix=status.near?' trong 15 km từ '+(status.anchor||'xe'):'';
 $('resultCount').textContent=status.loading?'Đang tải địa chỉ và địa điểm…':status.error?'Một phần dữ liệu tìm kiếm chưa tải được.':
   places.length?(status.hits?.[0]?.approx?'Tên gần giống · ':'')+status.total.toLocaleString('vi-VN')+' kết quả'+suffix:
   status.missingAnchor?'Chưa tìm thấy địa điểm sau chữ “gần”. Thử thêm tỉnh, thành phố.':
   'Không tìm thấy'+suffix+'. Thử tên đường, địa danh hoặc thêm tỉnh thành.';
 $('retrySearch').hidden=!status.error;
 if(places.length){choosePlace(places.find(p=>focusedPin&&samePlace(p,focusedPin))||places[0]);}
 else{activeResult=-1;$('travel').disabled=true;$('picked').textContent='';$('findPlace').removeAttribute('aria-activedescendant');drawAtlas();}
}
function renderPlaces(count,keepScroll=false){
 const list=$('places'),filter=$('tourFilter').value;
 const scroll=keepScroll?list.scrollTop:0;list.replaceChildren();
 matches.slice(0,pageSize).forEach((p,i)=>{
   const b=document.createElement('button'),title=document.createElement('strong'),detail=document.createElement('span');
   title.textContent=p[3]?.name||p[0];detail.textContent=p[3]?.km?'Đường đèo · '+p[3].km.toLocaleString('vi-VN')+' km':p[3]?[p[3].kind,p[3].province||p[3].city].filter(Boolean).join(' · '):'Điểm xuất phát';
   if(p[3]?.islands){title.textContent=p[0];detail.textContent=p[3].province+', Việt Nam · Chỉ xem bản đồ';}
   if(p[3]?.stops)detail.textContent=p[3].stops.length+' điểm dừng · '+p[3].city;
   if(p[4])detail.textContent=[p[4].kind,p[4].context,atlasDistance(p[4].km)+' từ '+(p[4].anchor||'xe')].filter(Boolean).join(' · ');
   if(p===baSaoDrive)detail.textContent='Điểm xuất phát · Phường Tam Chúc · Ninh Bình (Hà Nam cũ)';
   if(filter==='model'&&p[3]?.custom){
     const photo=document.createElement('img');
     photo.onerror=()=>{photo.remove();b.classList.remove('sightChoice');};
     photo.alt='';photo.width=84;photo.height=58;photo.loading='lazy';
     photo.src='landmark-previews/'+encodeURIComponent(p[3].id)+'.webp';b.className='sightChoice';b.append(photo);
     detail.textContent=[...new Set([p[3].surveyed?p[3].kind:p[3].city,p[3].province||p[3].region].filter(Boolean))].join(' · ');
   }
   b.append(title,detail);b.type='button';b.dataset.index=i;b.setAttribute('aria-pressed',String(samePlace(p,pendingPlace)));
   b.id='atlas-option-'+i;b.setAttribute('role','option');b.setAttribute('aria-selected',String(samePlace(p,pendingPlace)));
   b.onclick=()=>choosePlace(p,true);list.append(b);
 });
 $('morePlaces').hidden=count<=pageSize;list.scrollTop=scroll;
 $('findPlace').setAttribute('aria-expanded',String(!!matches.length));
}
function resetPlaces(){focusedPin=null;pageSize=24;placeList();}
$('morePlaces').onclick=()=>{pageSize+=24;placeList(true);};
$('tourFilter').onchange=resetPlaces;
function drawArchipelago(g,place,at,w,h){
 const site=place[3],points=site.islands.map(([lon,lat])=>at(lon,lat));
 if(!points.some(([x,y])=>x>=0&&x<=w&&y>=0&&y<=h))return;
 g.save();
 g.fillStyle=pendingPlace===place?'#ffad77':'#cde2ac';
 for(const [x,y] of points){
   g.beginPath();g.arc(x,y,2.4,0,Math.PI*2);g.fill();
   mapPins.push({x,y,place});
 }
 g.font='600 12px "Segoe UI", sans-serif';g.textAlign='center';
 const half=g.measureText(place[0]).width/2;
 const x=clamp(at(site.lon,site.lat)[0],half+4,w-half-4);
 const y=clamp(Math.min(...points.map(p=>p[1]))-19,15,h-17);
 g.strokeStyle='#132b32';g.lineWidth=3;g.lineJoin='round';g.fillStyle='#eff4df';
 g.strokeText(place[0],x,y);g.fillText(place[0],x,y);
 g.font='11px "Segoe UI", sans-serif';g.strokeText('(Việt Nam)',x,y+13);g.fillText('(Việt Nam)',x,y+13);
 mapLabels.push({left:x-half-3,right:x+half+3,top:y-13,bottom:y+16,place});
 g.restore();
}
function drawAtlas(){
 const c=$('country'),g=c.getContext('2d'),w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;
 const ratio=Math.min(2,devicePixelRatio);c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);g.setTransform(ratio,0,0,ratio,0,0);
 let west=101.75,east=117.6,south=6.5,north=24.2;
 if(focusedPin&&!focusedPin[3]?.islands){
   const lon=focusedPin[3]?.lon??focusedPin[1],lat=focusedPin[3]?.lat??focusedPin[2];
   west=lon-.022;east=lon+.022;south=lat-.022;north=lat+.022;
 }else if(focusedPin||matches.length&&($('tourFilter').value!=='all'||$('findPlace').value.trim())){
   west=Infinity;east=-Infinity;south=Infinity;north=-Infinity;
   for(const p of focusedPin?[focusedPin]:matches){
     const site=p[3],points=site?.islands||[[site?.lon??p[1],site?.lat??p[2]]];
     for(const [lon,lat] of points){west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);}
   }
   const pad=Math.max(.018,Math.min(.3,Math.max(east-west,north-south)*.13));
   west-=pad;east+=pad;south-=pad;north+=pad;
 }
 const lon0=(east+west)/2,lat0=(south+north)/2,scale=Math.min((w-14)/((east-west)*.96),(h-12)/(north-south)),cx=w/2,cy=h/2;
 const at=(lon,lat)=>[cx+(lon-lon0)*scale*.96,cy-(lat-lat0)*scale];
 projection=(x,y)=>[lon0+(x-cx)/(scale*.96),lat0-(y-cy)/scale];
 g.fillStyle='#132b32';g.fillRect(0,0,w,h);g.strokeStyle='#284149';g.lineWidth=.6;g.beginPath();
 for(let lon=Math.floor(west);lon<=Math.ceil(east);lon++){const [x]=at(lon,16);g.moveTo(x,0);g.lineTo(x,h);}
 for(let lat=Math.floor(south);lat<=Math.ceil(north);lat++){const [,y]=at(106,lat);g.moveTo(0,y);g.lineTo(w,y);}g.stroke();
 g.strokeStyle='#a8cb9c';g.lineWidth=.65;g.beginPath();
 for(const line of atlasData?.lines||[]){for(let i=0;i<line.length;i+=2){const p=at(line[i]/1e5,line[i+1]/1e5);if(!i)g.moveTo(...p);else g.lineTo(...p);}}g.stroke();
 const regularPins=new Path2D(),modelPins=new Path2D();
 mapPins=[];mapLabels=[];for(const place of matches){
   if(place[3]?.islands)continue;
   const site=place[3],[x,y]=at(site?.lon??place[1],site?.lat??place[2]);
   if(x< -3||y< -3||x>w+3||y>h+3)continue;
   mapPins.push({x,y,place});
   const layer=site?.custom?modelPins:regularPins,radius=site?.custom?3:1.55;
   layer.moveTo(x+radius,y);layer.arc(x,y,radius,0,Math.PI*2);
 }
 g.fillStyle='#97cdb9';g.fill(regularPins);
 g.fillStyle='#ffe2a5';g.fill(modelPins);
 g.font='600 11px Segoe UI';g.fillStyle='#f5ecd2';
 for(const p of [featured[0],featured[2],featured[1]]){const [x,y]=at(p[1],p[2]);if(x<0||x>w||y<0||y>h)continue;g.fillRect(x-1.5,y-1.5,3,3);g.fillText(p[0],clamp(x+5,2,w-g.measureText(p[0]).width-2),y-4);}
 for(const place of archipelagoPlaces)drawArchipelago(g,place,at,w,h);
 if(pendingPlace[3]?.islands)return;
 const [x,y]=at(pendingPlace[3]?.lon??pendingPlace[1],pendingPlace[3]?.lat??pendingPlace[2]);g.strokeStyle='#fff';g.fillStyle='#ff713c';g.lineWidth=1.6;g.beginPath();g.arc(x,y,4.5,0,Math.PI*2);g.fill();g.stroke();
}
function setAtlasView(map){
 $('atlas').dataset.view=map?'map':'list';
 $('atlasMap').setAttribute('aria-pressed',String(map));
 $('atlasList').setAttribute('aria-pressed',String(!map));
 if(map)drawAtlas();
}
$('atlasMap').onclick=()=>setAtlasView(true);
$('atlasList').onclick=()=>setAtlasView(false);
async function openAtlas(filter='all',query=''){
 setAtlasView(false);
 $('atlasTitle').textContent=atlasChoice?'Chọn '+atlasChoice.label:'Chọn điểm xuất phát';
 originatedInPause=!atlasChoice && $('rest').open;if(originatedInPause)$('rest').close();
 $('atlas').showModal();$('findPlace').value=query;$('tourFilter').value=filter;
 if(query)$('findPlace').focus();
 let preferred;
 if(filter==='model'&&!source[3]?.custom)preferred=models.find(site=>site.id==='ganh-da-dia')||models[0];
 if(filter==='mountain'&&!source[3]?.km)preferred=mountainPlaces.find(site=>site.id==='deo-hai-van')||mountainPlaces[0];
 choosePlace(atlasChoice?.place||(preferred?tourPlace(preferred):source));resetPlaces();
 await loadAtlas();
}
async function loadAtlas(){
 try{
   atlasPromise||=fetchJSON('vn-roads/overview.json');
   [atlasData]=await Promise.all([atlasPromise,VietnamTourism.loadAll()]);
   if($('atlas').open){placeList();drawAtlas();}
 }catch{
   atlasPromise=null;
   if($('atlas').open){$('picked').textContent='Chưa tải đủ bản đồ. Hãy thử lại hoặc chọn một điểm đã hiện.';$('retrySearch').hidden=false;}
 }
}
$('departureSearch').onsubmit=e=>{
 e.preventDefault();
 if(!$('openingAtlas').disabled)openAtlas('all',$('departureQuery').value.trim());
};
$('openMap').onclick=$('relocate').onclick=()=>openAtlas();
$('openSights').onclick=e=>{e.preventDefault();openAtlas('model');};
$('openPasses').onclick=$('pausedPasses').onclick=e=>{e.preventDefault();openAtlas('mountain');};
$('atlas').onclose=()=>{atlasChoice=null;finder.close();if(originatedInPause&&mode==='paused')$('rest').showModal();originatedInPause=false;};
$('closeAtlas').onclick=()=>$('atlas').close();$('findPlace').oninput=resetPlaces;
$('retrySearch').onclick=()=>{resetPlaces();loadAtlas();};
for(const button of document.querySelectorAll('#atlas [data-near]'))button.onclick=()=>{
 $('tourFilter').value='all';$('findPlace').value=button.dataset.near+' gần đây';resetPlaces();
};
$('findPlace').onkeydown=e=>{
 if(!matches.length||!['ArrowDown','ArrowUp','Enter'].includes(e.key)||e.isComposing)return;
 e.preventDefault();
 let i=Math.max(0,activeResult);
 if(e.key==='ArrowDown')i=Math.min($('places').children.length-1,activeResult+1);
 if(e.key==='ArrowUp')i=Math.max(0,activeResult-1);
 choosePlace(matches[i],true);$('places').children[i]?.scrollIntoView({block:'nearest'});
 if(e.key==='Enter')$('travel').focus({preventScroll:true});
};
$('country').onclick=e=>{
 if(!projection)return;
 const rect=$('country').getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
 const label=mapLabels.find(b=>x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom);
 if(label){choosePlace(label.place,true);return;}
 let best=null,range=10;
 for(const pin of mapPins){const d=Math.hypot(pin.x-x,pin.y-y);if(d<range){best=pin.place;range=d;}}
 const [lon,lat]=projection(x,y);choosePlace(best||['Điểm trên bản đồ',lon,lat],true);
};
$('travel').onclick=()=>{
 if(atlasChoice){const {accept}=atlasChoice;atlasChoice=null;accept(pendingPlace);$('atlas').close();return;}
 originatedInPause=false;$('atlas').close();if($('journeySetup').open)$('journeySetup').close();if(indexData)startAt(pendingPlace);};
window.addEventListener('resize',()=>{if($('atlas').open)drawAtlas();});
async function fetchJSON(path){const r=await fetch(path);if(!r.ok)throw Error('Chưa tải được dữ liệu đường.');return r.json();}
(async()=>{
 $('openMap').disabled=true;
 try{
   const [roadIndex,trafficIndex,bridges,footbridges,tunnels]=await Promise.all([
     fetchJSON('vn-roads/index.json'),fetchJSON('vn-traffic/index.json').catch(()=>null),
     fetchJSON('vn-bridges/details.json').catch(()=>null),fetchJSON('vn-bridges/footbridges.json').catch(()=>null),
     fetchJSON('vn-traffic/tunnels.json').catch(()=>null)]);
   indexData=roadIndex;
   if(tunnels?.graphSourceSha256===roadIndex.sourceSha256)indexData.tunnelData=tunnels;
   if(trafficIndex?.graphSourceSha256===roadIndex.sourceSha256&&trafficIndex.osmTimestamp===roadIndex.osmTimestamp)indexData.trafficTiles=trafficIndex.tiles;
   if(bridges?.graphSourceSha256===roadIndex.sourceSha256)indexData.bridgeDetails=bridges.edges;
   if(footbridges?.graphSourceSha256===roadIndex.sourceSha256)indexData.footbridgeTiles=footbridges.tiles;
   $('coverage').textContent=indexData.roadKm.toLocaleString('vi-VN')+' km đường · Dữ liệu '+new Date(indexData.osmTimestamp).toLocaleDateString('vi-VN');
   $('openingAtlas').disabled=false;$('openMap').disabled=false;$('travel').disabled=false;
   const params=new URLSearchParams(location.search),stage=mountainPlaces.find(p=>p.id===params.get('pass'));
   const collection=params.get('collection')==='ha-nam';
   const stopId=params.get('landmark');
   const savedId=JourneyDepartures.trip?.destination;
   const findStop=id=>models.find(p=>p.id===id||p.catalogId===id)||tamChucParts.find(p=>p.id===id)||regionalVisits.find(p=>p.id===id)||catalogStop(id);
   if((stopId&&!findStop(stopId))||(!stopId&&savedId&&!findStop(savedId)))await VietnamTourism.loadAll();
   const landmark=stopId&&findStop(stopId)||(collection&&tamChuc);
   if(landmark||stage){
     const view=params.get('view'),direct=landmark&&['field','plan','tour'].includes(view);
     const place=tourPlace(landmark||stage);
     if(direct)place[3]={...place[3],visitOnArrival:true};
     await startAt(place);
     if(view==='tour'&&mode==='tour'&&params.has('goc')){
       const monument=car.sightView?.monument;
       const index=monument?.data.views?.findIndex(v=>v.id===params.get('goc'));
       if(index>=0)showMonument(monument,index,null,car.sightView.stopId);
     }
     if(direct&&mode==='tour'&&view!=='tour'){
       const button=$(view==='plan'?'sitePlan':'fieldView');
       if(!button.hidden)button.click();
     }
   }
   else if(params.get('drive')==='ba-sao')await startAt(baSaoDrive);
   else if(params.has('drive')){
     const route=(await getFeaturedDrives()).find(r=>r.id===params.get('drive'));
     if(route)await prepareDrive(route);
     else {await startAt(baSaoDrive);planner.open(false);}
   }
   else if(JourneyDepartures.pin)await startAt(signatureTrip?[signatureTrip.routeName,...JourneyDepartures.pin.slice(1)]:JourneyDepartures.pin);
   else if(JourneyDepartures.initial)await startAt(featuredDeparture(JourneyDepartures.initial));
   else{
     const saved=JourneyDepartures.trip;
     await startAt([saved.label||'Hành trình đang lái',saved.lon,saved.lat],saved,savedCustomRoute(saved));
   }
   const search=params.get('search')?.trim();
   if(search)await openAtlas('all',search);
   else if(collection)await openAtlas('model');
   else if(params.has('plan'))planner.open(params.get('plan')!=='featured');
 }catch(e){mode='error';$('loadStatus').textContent=e.message;$('launch').disabled=false;$('launch').textContent='Thử tải lại';}
})();
