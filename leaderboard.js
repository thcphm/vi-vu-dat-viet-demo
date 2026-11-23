'use strict';
function formatRaceTime(ms){
  return Math.floor(ms/60000)+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');
}
function createLeaderboard(routeId,title,serverTimed=false){
  const world=routeId==='xuyen-viet',dialog=document.createElement('dialog');
  dialog.className='scoreBoard';dialog.setAttribute('aria-labelledby','boardTitle-'+routeId);
  dialog.innerHTML='<div class="boardHead"><h2>Bảng xếp hạng online</h2><button type="button" aria-label="Đóng bảng xếp hạng">✕</button></div><p class="boardMode"></p><p role="status"></p><ol></ol><form hidden><p class="submitNotice">Khi bạn gửi, biệt danh và thành tích có thể xuất hiện trên bảng xếp hạng công khai. <a href="privacy.html" target="_blank" rel="noopener">Quyền riêng tư</a></p><label>Biệt danh <input name="alias" required minlength="1" maxlength="24" autocomplete="off"></label><button class="hot">Gửi thành tích</button></form><button class="reloadBoard">Tải lại bảng</button>';
  dialog.querySelector('h2').id='boardTitle-'+routeId;document.body.append(dialog);
  dialog.querySelector('.boardMode').textContent=title+' · '+(world?'Quãng đường trong một lượt':serverTimed?'Thời gian hoàn thành tuyến':'Thời gian gồm giây phạt');
  const status=dialog.querySelector('[role=status]'),list=dialog.querySelector('ol'),form=dialog.querySelector('form');
  const name=form.elements.alias,submit=form.querySelector('button'),reload=dialog.querySelector('.reloadBoard');
  const format=world?m=>m.toLocaleString('vi-VN')+' m':formatRaceTime;
  let run=null,arrival=null,pending=null,lastSent=0,displayVersion=0,sending=false;
  try{name.value=localStorage.getItem('taylai.alias')||'';}catch{}
  async function api(path,data){
    const opts={signal:AbortSignal.timeout(12000),cache:'no-store'};
    if(data)Object.assign(opts,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const res=await fetch('/api/leaderboard'+path,opts);
    if(!res.ok){const body=await res.json().catch(()=>null);throw new Error(body?.error||'Chưa kết nối được bảng online.');}
    return res.json();
  }
  function start(vehicleChoice){
    pending=null;arrival=null;lastSent=0;
    run=api('/start',{route:routeId,...vehicleChoice}).then(v=>v.runId).catch(()=>null);
  }
  function arrive(){
    const current=run;
    if(!arrival)arrival=Promise.resolve(current).then(id=>id?api('/arrive',{runId:id}):null)
      .then(result=>result?.timeMs??null).catch(()=>{
        if(current===run)arrival=null;
        return null;
      });
    return arrival;
  }
  function rows(entries){
    list.replaceChildren();
    for(const item of entries){
      const row=document.createElement('li'),alias=document.createElement('span'),score=document.createElement('b');
      alias.textContent=item.name;score.textContent=format(world?item.distanceM:item.timeMs);
      row.append(alias,score);list.append(row);
    }
  }
  async function load(){
    const version=++displayVersion;status.textContent='Đang tải bảng xếp hạng…';reload.disabled=true;
    try{
      const data=await api('?route='+encodeURIComponent(routeId));
      if(version!==displayVersion)return;
      rows(data.entries);status.textContent=data.personal?'Kỷ lục của bạn: '+format(world?data.personal.distanceM:data.personal.timeMs)+' · Hạng '+data.rank:data.entries.length?'Top '+data.entries.length:'Chưa có thành tích được gửi.';
    }catch{if(version===displayVersion)status.textContent='Chưa kết nối được bảng online.';}
    finally{if(version===displayVersion)reload.disabled=false;}
  }
  async function open(score){
    if(serverTimed && Number.isFinite(score)){
      form.hidden=true;
      if(!dialog.open)dialog.showModal();
      status.textContent='Đang xác nhận thời gian về đích…';
      const official=await arrive();
      if(!dialog.open)return;
      if(official===null){
        await load();
        status.textContent+=' · Chưa xác nhận được thời gian online của lượt này.';
        return;
      }
      score=official;
    }
    pending=Number.isFinite(score)?Math.round(score):null;
    form.hidden=!pending||pending<=lastSent;
    submit.textContent=pending?'Gửi '+format(pending):'Gửi thành tích';
    if(!dialog.open)dialog.showModal();
    load();
    if(!form.hidden&&!await run){form.hidden=true;status.textContent='Lượt này chưa kết nối với bảng online từ lúc xuất phát.';++displayVersion;reload.disabled=false;}
  }
  form.onsubmit=async e=>{
    e.preventDefault();const alias=name.value.trim();if(sending||!pending||!alias){name.focus();return;}
    const score=pending;const id=await run;if(!id)return;
    ++displayVersion;sending=true;submit.disabled=true;reload.disabled=true;
    try{
      const data=await api('/finish',{runId:id,name:alias,[world?'distanceM':'timeMs']:score});
      lastSent=score;rows(data.entries);form.hidden=true;status.textContent='Đã gửi · Hạng '+data.rank;
      try{localStorage.setItem('taylai.alias',alias);}catch{}
    }catch(err){status.textContent=err instanceof TypeError||err.name==='TimeoutError'?'Chưa gửi được thành tích. Hãy kiểm tra kết nối và thử lại.':err.message;}
    finally{sending=false;submit.disabled=false;reload.disabled=false;}
  };
  reload.onclick=load;dialog.querySelector('.boardHead button').onclick=()=>dialog.close();
  return {start,arrive,open};
}
