/* Stored quantities are litres for combustion vehicles and kWh for electric vehicles. */
(() => {
  const fleet=id=>(globalThis.DuongVietFleet||[]).find(c=>c.id===id);
  const meta=(id,spec={})=>{
    const c=fleet(id)||spec, fuel=c.fuel||(c.electric||id==='gt'?'electric':'petrol');
    return {id,name:c.name||id,fuel,capacity:c.capacity||(fuel==='electric'?80:60),rate:c.rate||(fuel==='electric'?18:8.5),unit:fuel==='electric'?'kWh':'L',verb:fuel==='electric'?'Sạc điện':fuel==='diesel'?'Đổ dầu':'Đổ xăng'};
  };
  const key=id=>'duongviet.2.energy.'+id;
  const memory=new Map();
  function amount(c) {
    let v;try{v=localStorage.getItem(key(c.id));}catch{}
    const n=v===null||v===undefined?memory.get(c.id):Number(v);
    return Number.isFinite(n)?Math.min(c.capacity,Math.max(0,n)):c.capacity*.68;
  }
  function write(c,n){const v=Math.max(0,Math.min(c.capacity,n));memory.set(c.id,v);try{localStorage.setItem(key(c.id),String(v));}catch{}return v;}
  const pct=(c,n)=>Math.round(100*n/c.capacity);
  function tank(c){
    let level=amount(c),used=0;
    function flush(){level=write(c,amount(c)-used);used=0;return level;}
    return {get level(){return Math.max(0,level-used);},consume(metres){if(metres>0&&Number.isFinite(metres)){used+=metres*c.rate/100000;if(used>.018||used>=level)flush();}},flush,reload(){level=amount(c);used=0;}};
  }
  const assets=new URL('assets/map/',document.currentScript.src);
  const requests={};
  function stations(ev) {
    const file=ev?'charge.json':'fuel.json';
    if(!requests[file])requests[file]=fetch(new URL(file,assets)).then(r=>{if(!r.ok)throw Error('stations');return r.json();}).catch(e=>{delete requests[file];throw e;});
    return requests[file];
  }
  const distance=(lat,lon,p)=>Math.hypot((p.lon-lon)*111320*Math.cos(lat*Math.PI/180),(p.lat-lat)*110950);
  function nearest(list,lat,lon){let best=null,d=Infinity;for(const p of list){const n=distance(lat,lon,p);if(n<d){best=p;d=n;}}return best?{...best,metres:d}:null;}
  function panel(c,location) {
    const {station,atGarage=false,relocate,exit,onChanged}=location;
    const el=(t,txt)=>{const n=document.createElement(t);if(txt)n.textContent=txt;return n;};
    const d=el('dialog');d.className='edition-stop service-dialog';d.setAttribute('aria-label',c.verb);document.body.append(d);
    let status='';const local=atGarage||Boolean(station && station.metres<=350);
    function close(){if(d.open)d.close();}
    d.onclose=()=>{d.remove();exit?.();};
    function paint(){
      d.replaceChildren(el('small',atGarage?'GARA · THCPHM':'DỊCH VỤ TRÊN ĐƯỜNG'),el('h2',c.verb+' · '+c.name));
      const current=amount(c),percent=pct(c,current),p=el('progress');p.max=c.capacity;p.value=current;p.setAttribute('aria-label',c.fuel==='electric'?'Mức pin':'Mức nhiên liệu');
      d.append(el('p',(c.fuel==='electric'?'Pin':'Bình nhiên liệu')+' '+percent+'% · '+current.toLocaleString('vi-VN',{maximumFractionDigits:1})+' / '+c.capacity.toLocaleString('vi-VN')+' '+c.unit),p);
      if(!atGarage)d.append(el('p',station?(local?'Đang ở gần ':'Trạm gần nhất · ')+station.name+' · '+(station.metres/1000).toLocaleString('vi-VN',{maximumFractionDigits:1})+' km':'Chưa có dữ liệu trạm tại vị trí này.'));
      const note=el('p',status);note.setAttribute('role','status');d.append(note);
      const row=el('div');row.className='edition-buttons';
      function btn(t,fn,disabled=false){const b=el('button',t);b.type='button';b.disabled=disabled;b.onclick=fn;row.append(b);return b;}
      if(local){
        const fill=target=>{const old=amount(c);const val=write(c,Math.max(old,c.capacity*target));status='Đã '+(c.fuel==='electric'?'sạc':'nạp')+' thêm '+(val-old).toLocaleString('vi-VN',{maximumFractionDigits:1})+' '+c.unit+'.';onChanged?.();paint();};
        if(c.fuel==='electric')btn('Sạc đến 80%',()=>fill(.8),current>=c.capacity*.8-.001);
        btn(c.fuel==='electric'?'Sạc đầy':'Đổ đầy',()=>fill(1),current>=c.capacity-.001);
      }else{
        if(station&&relocate)btn('Đặt xe tại trạm',()=>{close();relocate(station);});
        if(current<c.capacity*.10)btn('Gọi tiếp ứng 10%',()=>{write(c,c.capacity*.1);status='Xe đã nhận tiếp ứng để lái đến trạm.';onChanged?.();paint();});
      }
      btn(atGarage?'Đóng':'Trở lại xe',close);d.append(row);
    }
    paint();d.showModal();
  }
  globalThis.DuongVietEnergy={meta,amount,write,tank,pct,stations,nearest,panel};
})();
