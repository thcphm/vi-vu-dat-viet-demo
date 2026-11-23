'use strict';

const JourneyDepartures=(()=>{
  const byId=id=>journeyStops.find(place=>place.id===id);
  const params=new URLSearchParams(location.search);
  let trip;
  try{
    const stored=JSON.parse(localStorage.getItem('taylai.world.trip'));
    if(stored&&[stored.lon,stored.lat,stored.distance].every(Number.isFinite)&&stored.distance>=0)trip=stored;
  }catch{}
  const requested=byId(params.get('intro'));
  const today=Math.floor((Date.now()+7*3600000)/86400000);
  const initial=requested||(trip?null:journeyStops[today%journeyStops.length]);
  const match=/^(\d{1,2}(?:\.\d{1,6})?),(\d{3}(?:\.\d{1,6})?)$/.exec(params.get('pin')||'');
  const pin=match&&+match[1]>=8&&+match[1]<=24&&+match[2]>=102&&+match[2]<=118
    ? ['Điểm hẹn trên đường',+match[2],+match[1]] : null;
  const explicit=pin||['pass','landmark','drive','collection'].some(key=>params.has(key));
  const preview=explicit?byId(params.get('landmark')):initial;

  function imageBase(place){
    if(place.id==='tam-chuc')return 'tam-chuc-opening';
    const hour=(new Date().getUTCHours()+7)%24;
    return 'departure-views/'+place.id+(hour<5||hour>=18?'-night':'');
  }
  if(preview){
    // Start just the image that fits the viewport while the rest of the page parses.
    for(const orientation of ['portrait','landscape']){
      const link=document.createElement('link');
      link.rel='preload';link.as='image';link.fetchPriority='high';
      link.media='(orientation: '+orientation+')';
      link.href=imageBase(preview)+(orientation==='portrait'?'-portrait':'')+'.webp';
      document.head.append(link);
    }
  }
  function select(place){
    for(const link of document.getElementById('departureChoices').children){
      if(link.dataset.departure===place?.id)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
    const still=document.getElementById('openingStill');
    if(place){
      const base=imageBase(place);
      still.style.setProperty('--wide-view','url("'+base+'.webp")');
      still.style.setProperty('--tall-view','url("'+base+'-portrait.webp")');
    }
    still.hidden=!place;
  }
  function mount(){
    const group=document.getElementById('departureChoices');
    for(const place of journeyStops){
      const a=document.createElement('a');
      a.href='?intro='+place.id;a.dataset.departure=place.id;a.textContent=place.city;
      a.setAttribute('aria-label',place.city+' · '+place.title);group.append(a);
    }
    select(preview);
    document.getElementById('journeyTitle').textContent=preview?.title||pin?.[0]||(!explicit&&trip?.label)||'Xuyên Việt';
    document.getElementById('journeyCaption').textContent=preview?.caption||'';
  }
  return {byId,initial,pin,trip,select,mount};
})();
