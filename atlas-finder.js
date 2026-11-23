'use strict';
function parseAtlasCoordinates(input){
  let text=input.trim();
  if(/^https?:\/\//i.test(text)){
    try{
      const url=new URL(text),pin=text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
      if(pin)text=pin[1]+','+pin[2];
      else text=url.searchParams.get('query')||url.searchParams.get('q')||text.match(/@(-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)/)?.[1]||'';
    }catch{return null;}
  }
  const pair=text.match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if(!pair)return null;
  const lat=Number(pair[1]),lon=Number(pair[2]);
  return Math.abs(lat)<=90&&Math.abs(lon)<=180?['Tọa độ đã nhập',lon,lat]:null;
}
function atlasDistance(km){
  return km<1?Math.round(km*1000)+' m':km.toLocaleString('vi-VN',{maximumFractionDigits:km<10?1:0})+' km';
}
function createAtlasFinder({entries,onResults,onLoading}){
  let worker=null,timer=0,idle=0,revision=0,refs=[],sourceVersion=null;
  function cancel(){clearTimeout(timer);revision++;}
  function query(text,filter,center,limit,version){
    cancel();clearTimeout(idle);const id=revision;onLoading();
    timer=setTimeout(()=>{
      try{
        if(!worker){
          worker=new Worker('atlas-search-worker.js');
          worker.onmessage=({data})=>{
            if(data.id!==revision)return;
            const places=data.hits.map(hit=>{
              if(hit.ref!=null)return refs[hit.ref];
              return [hit.name,hit.lon,hit.lat,null,{kind:hit.kind,context:hit.context,km:hit.km,anchor:data.anchor}];
            });
            onResults(places,data);
          };
          worker.onerror=()=>{worker.terminate();worker=null;sourceVersion=null;onResults([],{error:true});};
        }
        if(sourceVersion!==version||!refs.length){
          const rows=entries();refs=rows.map(item=>item.place);
          worker.postMessage({type:'extras',entries:rows.map(({place,context,featured},i)=>{
            const s=place[3],name=s?.name||place[0];
            const mappedName=s?.custom&&s.catalogId?VietnamTourism.byId.get(s.catalogId)?.name:null;
            return {row:[name,s?.islands?'archipelago':s?.km?'road':featured?'town':'attraction',Math.round((s?.lon??place[1])*1e5),
              Math.round((s?.lat??place[2])*1e5),s?.locality||'',s?.province||s?.city||'',context||''],
              id:i,custom:!!s?.custom,catalogName:mappedName!==name?mappedName:undefined,mountain:!!s?.km,heritage:!!s?.stops,region:s?.region,featured:!!featured};
          })});sourceVersion=version;
        }
        worker.postMessage({type:'query',id,text,filter,center,limit});
      }catch{if(id===revision)onResults([],{error:true});}
    },100);
  }
  function close(){
    cancel();clearTimeout(idle);idle=setTimeout(()=>{worker?.terminate();worker=null;refs=[];sourceVersion=null;},60000);
  }
  return {query,cancel,close};
}
