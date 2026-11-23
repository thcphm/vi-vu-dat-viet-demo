'use strict';
// Current model conditions for the car's position. Coordinates come from the game map.
function createDrivingWeather(THREE,scene,sun,pavement,reference=''){
  const interval=15*60000,maxAge=2*3600000,labels=document.querySelectorAll('[data-weather]');
  const fields=['temperature_2m','weather_code','is_day','precipitation','cloud_cover'];
  const base={light:sun.intensity,fog:scene.fog.density,color:scene.fog.color.clone(),road:pavement.color.clone(),rough:pavement.roughness};
  const fogColor=new THREE.Color(),stormColor=new THREE.Color();
  const cacheKey='taylai.weather.v1';
  let cache=[];
  try{const data=JSON.parse(localStorage.getItem(cacheKey));if(Array.isArray(data))cache=data.slice(-20);}catch{}
  let point=null,due=0,request=null,current=null,lastFrame=0,opacity=0;
  const fresh=c=>c&&Number.isFinite(c.time)&&Date.now()-c.time*1000<maxAge&&c.time*1000<Date.now()+interval&&fields.every(f=>Number.isFinite(c[f]));
  function describe(c){
    const code=c.weather_code;
    if(code>=95)return 'Dông';if([71,73,75,77,85,86].includes(code))return 'Tuyết';
    if(code>=80)return 'Mưa rào';if(code>=61)return 'Mưa';if(code>=51)return 'Mưa phùn';
    if(code>=45)return 'Sương mù';if(code===3)return 'U ám';if(code>0)return 'Có mây';
    return c.is_day?'Trời quang':'Đêm quang';
  }
  const formatter=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hour12:false});
  function display(c,source){
    current=c;
    const text=c?describe(c)+' · '+Math.round(c.temperature_2m)+' °C · '+(source==='cache'?'Bản lưu ':'')+formatter.format(c.time*1000):source;
    for(const el of labels){el.textContent=(reference?reference+' · ':'')+text;el.title='Thời tiết Open-Meteo · Giờ Việt Nam';}
  }
  async function locate(lon,lat){
    const now=Date.now(),moved=!point||Math.hypot((point.lon-lon)*Math.cos(lat*Math.PI/180),point.lat-lat)>.04;
    if(!moved&&now<due)return;
    if(request)request.abort();
    point={lon,lat};due=now+interval;
    const id=Math.round(lat*25)+','+Math.round(lon*25);
    const record=cache.find(entry=>entry?.id===id&&fresh(entry.c));
    if(record&&moved&&now-record.saved<interval){display(record.c,'cache');due=record.saved+interval;request=null;return;}
    if(moved||!current||!fresh(current))display(record?.c||null,record?'cache':'Đang lấy thời tiết…');
    const controller=new AbortController();request=controller;
    const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const params=new URLSearchParams({latitude:lat.toFixed(4),longitude:lon.toFixed(4),current:fields.join(','),timeformat:'unixtime',forecast_days:'1'});
      const res=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:controller.signal});
      if(!res.ok)throw Error();
      const c=(await res.json()).current;if(!fresh(c))throw Error();
      if(request!==controller)return;
      cache=cache.filter(v=>v?.id!==id&&fresh(v?.c)).slice(-19);cache.push({id,c,saved:Date.now()});
      try{localStorage.setItem(cacheKey,JSON.stringify(cache));}catch{}
      display(c,Date.now()-c.time*1000>2*interval?'cache':'live');
    }catch{
      if(request!==controller)return;
      const fallback=fresh(record?.c)?record.c:(!moved&&fresh(current)?current:null);
      display(fallback,fallback?'cache':'Chưa có dữ liệu thời tiết');
      due=Date.now()+60000;
    }finally{clearTimeout(timeout);if(request===controller)request=null;}
  }
  const count=matchMedia('(pointer:coarse)').matches?220:460;
  const vertices=new Float32Array(count*6),seeds=Float32Array.from({length:count*3},()=>Math.random());
  const geom=new THREE.BufferGeometry(),positions=new THREE.BufferAttribute(vertices,3);
  positions.setUsage(THREE.DynamicDrawUsage);geom.setAttribute('position',positions);
  const mat=new THREE.LineBasicMaterial({color:0xc4d5df,transparent:true,depthWrite:false});
  const drops=new THREE.LineSegments(geom,mat);drops.frustumCulled=false;drops.visible=false;scene.add(drops);
  const dawnHaze=new THREE.Color(0xe6c9a4);
  function render(camera,now,dawn=0,worldLighting,sheltered=false){
    const mix=1-Math.exp(-Math.min(.2,(now-lastFrame)/1000)*2);lastFrame=now;
    const c=current,code=c?.weather_code||0,night=c&&c.is_day===0;
    const wet=c?(1-dawn)*Math.min(1,Math.max(c.precipitation*1.8,code>=51?.24:0)):0;
    const cloud=(c?.cloud_cover||0)/100*(1-dawn),fog=(code===45||code===48)?1-dawn:0;
    if(worldLighting){
      worldLighting(dawn,cloud,wet,fog,mix);
    }else{
      sun.intensity+=(base.light*(night?.13+.87*dawn:1-.65*cloud)-sun.intensity)*mix;
      scene.backgroundIntensity+=((night?.09+.91*dawn:1-.46*cloud)-scene.backgroundIntensity)*mix;
      scene.fog.density+=(Math.max(base.fog+dawn*.00036,.012*fog,wet*.004+cloud*.0005)-scene.fog.density)*mix;
      fogColor.copy(base.color).lerp(stormColor.setHex(night?0x374650:0xa0acb1),night?.95:Math.max(cloud,wet,fog)).lerp(dawnHaze,dawn);scene.fog.color.lerp(fogColor,mix);
      pavement.roughness+=(base.rough*(1-.58*wet)-pavement.roughness)*mix;
      pavement.color.lerp(fogColor.copy(base.road).multiplyScalar(1-.36*wet),mix);
    }
    opacity+=(wet-opacity)*mix;drops.visible=!sheltered&&opacity>.015;if(!drops.visible)return;
    const n=Math.ceil(count*opacity),snow=[71,73,75,77,85,86].includes(code);
    geom.setDrawRange(0,n*2);mat.opacity=.22+opacity*.42;drops.position.copy(camera.position);
    const wrap=(v,size)=>v-size*Math.floor(v/size);
    const t=now*.001;
    for(let i=0;i<n;i++){
      const k=i*3,j=i*6,x=wrap(seeds[k]*42+t-camera.position.x,42)-21;
      const y=wrap(seeds[k+1]*19-t*(snow?2:15)-camera.position.y,19)-8;
      const z=wrap(seeds[k+2]*42-camera.position.z,42)-21;
      vertices[j]=x;vertices[j+1]=y;vertices[j+2]=z;
      vertices[j+3]=x+.025;vertices[j+4]=y-(snow?.05:.6);vertices[j+5]=z;
    }
    positions.needsUpdate=true;
  }
  return {locate,render,get rainfall(){return opacity;}};
}
