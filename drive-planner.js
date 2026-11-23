'use strict';

let featuredDrivesRequest;
function getFeaturedDrives() {
  return featuredDrivesRequest ??= fetch('featured-drives.json').then(r=>{
    if(!r.ok)throw Error('Chưa tải được danh sách tuyến.');
    return r.json();
  }).catch(e=>{featuredDrivesRequest=null;throw e;});
}

function createDrivePlanner({getOrigin,choosePoint,drive,openBoard,getIndex}) {
  const dialog=document.getElementById('drivePlanner');
  const el=id=>dialog.querySelector('#'+id);
  let start=null,finish=null,selected=null,worker=null,session=0,custom=true;
  function endpointText(place,fallback){
    if(!place)return fallback;
    if(['Tọa độ đã nhập','Điểm trên bản đồ'].includes(place[0]))
      return place[2].toFixed(4)+'° B, '+place[1].toFixed(4)+'° Đ';
    return place[3]?.name||place[0];
  }
  function status(message){el('planStatus').textContent=message;}
  function refresh(){
    el('pickOrigin').textContent=endpointText(start,'Chọn điểm đi');
    el('pickDestination').textContent=endpointText(finish,'Chọn điểm đến');
    el('planDrive').disabled=Boolean(worker) || (custom?!start||!finish:!selected);
    el('planDrive').textContent=worker?'Đang tìm đường…':custom?'Tìm đường':'Chọn tuyến này';
    el('planRanking').hidden=custom||!selected;
    el('featuredDescription').textContent=selected?.description||'';
    for(const id of ['pickOrigin','pickDestination','customTab','featuredTab'])el(id).disabled=Boolean(worker);
  }
  function showTab(isCustom){
    custom=isCustom;
    el('customTab').setAttribute('aria-pressed',String(custom));
    el('featuredTab').setAttribute('aria-pressed',String(!custom));
    el('customTrip').hidden=!custom;el('featuredTrips').hidden=custom;status('');
    refresh();
  }
  async function list(token){
    try{
      const items=await getFeaturedDrives();
      if(token!==session || !dialog.open)return;
      selected=items.find(r=>r.id===selected?.id)||items[0];
      el('featuredChoices').replaceChildren();
      for(const route of items){
        const label=document.createElement('label'),radio=document.createElement('input');
        const title=document.createElement('strong'),km=document.createElement('span');
        radio.type='radio';radio.name='featured-drive';radio.value=route.id;radio.checked=selected===route;
        radio.onchange=()=>{selected=route;status('');refresh();};
        title.textContent=route.title;km.textContent=(route.metres/1000).toLocaleString('vi-VN',{maximumFractionDigits:1})+' km';
        const photo=document.createElement('img');photo.alt='';photo.width=66;photo.height=40;
        photo.src='landmark-previews/'+encodeURIComponent(route.landmarkId)+'.webp';
        label.append(radio,photo,title,km);el('featuredChoices').append(label);
      }
      refresh();
    }catch{if(token===session && !custom)status('Chưa tải được các tuyến. Chọn lại mục Tuyến nổi bật để thử lại.');}
  }
  function open(isCustom=true){
    const token=++session;
    start=getOrigin();dialog.showModal();showTab(isCustom);list(token);
  }
  function cancel(){worker?.terminate();worker=null;++session;}
  dialog.addEventListener('close',cancel);
  el('closePlanner').onclick=()=>dialog.close();
  el('customTab').onclick=()=>showTab(true);
  el('featuredTab').onclick=()=>{showTab(false);if(!el('featuredChoices').children.length)list(session);};
  function pick(origin){
    choosePoint(origin?'điểm đi':'điểm đến',origin?start:finish||start,place=>{
      if(origin)start=place;else finish=place;status('');refresh();
    });
  }
  el('pickOrigin').onclick=()=>pick(true);el('pickDestination').onclick=()=>pick(false);
  el('planRanking').onclick=()=>{if(selected)openBoard(selected);};
  function accept(route){
    dialog.close();
    drive(route);
  }
  el('planDrive').onclick=()=>{
    if(!custom){if(selected)accept(selected);return;}
    if(!start||!finish||worker)return;
    if(start[1]===finish[1] && start[2]===finish[2]){status('Hãy chọn hai điểm khác nhau.');return;}
    const token=session;
    const fail=message=>{if(token!==session)return;worker?.terminate();worker=null;refresh();status(message);};
    try{
      worker=new Worker('route-network-worker.js');
      worker.onerror=()=>fail('Chưa tải được bộ tìm đường. Hãy thử lại.');
      worker.onmessage=({data})=>{
        if(token!==session)return;
        if(data.type==='progress'){status(data.message);return;}
        if(data.type!=='route'){fail(data.message||'Không tìm được đường ô tô nối hai điểm.');return;}
        worker.terminate();worker=null;
        const startLabel=endpointText(start), finishLabel=endpointText(finish);
        accept({...data,id:null,title:startLabel+' → '+finishLabel,startLabel,finishLabel,landmarkId:finish[3]?.id});
      };
      refresh();status('Đang nối hai điểm với mạng đường ô tô…');
      worker.postMessage({index:getIndex(),start:start.slice(1,3),finish:finish.slice(1,3)});
    }catch{fail('Chưa mở được bộ tìm đường. Hãy thử lại.');}
  };
  return {open};
}
