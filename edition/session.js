'use strict';
window.createEditionSession = function(params) {
  const id=params.get('edition');
  const route=id==='atlas-pin' ? {name:String(params.get('label')||'Điểm trên bản đồ').slice(0,90),length:3000}
    : window.VietDrivingRoutes?.find(item=>item.id===id);
  if(!route)return null;
  const study=params.get('practice')==='study', ids=new Set();
  let origin=0,stop=0,correct=0,answered=0,active=true,started=false;
  const markers=[95,route.length*.34,route.length*.67,route.length*.91];
  const dialog=document.createElement('dialog');dialog.className='edition-stop';dialog.setAttribute('aria-label','Chặng lái trong Vi vu đất Việt');document.body.append(dialog);
  dialog.oncancel=e=>e.preventDefault();
  const make=(tag,txt,cl)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt)n.textContent=txt;return n;};
  function title(over,text){dialog.replaceChildren(make('small',over),make('h2',text));if(!dialog.open)dialog.showModal();}
  function buttons(items){const row=make('div','','edition-buttons');items.forEach(([txt,fn])=>{const b=make('button',txt);b.type='button';b.onclick=fn;row.append(b);});dialog.append(row);row.firstChild.focus({preventScroll:true});}
  function home(){location.assign(new URL('edition/',document.baseURI));}
  const km=n=>(n/1000).toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1});
  async function ask(resume){
    title('Lái & học · '+route.name,'Trạm ôn tập');dialog.append(make('p','Đang tải câu hỏi…'));
    try{
      const {getBank,markAnswer,records,questionContent}=await import('./core.js');
      const bank=await getBank(),pool=bank.filter(q=>!ids.has(q.id)),wrong=pool.filter(q=>Number.isInteger(records[q.id])&&records[q.id]!==q.answer),fresh=pool.filter(q=>records[q.id]===undefined);
      const pick=wrong.length?wrong:fresh.length?fresh:pool;const q=pick[Math.floor(Math.random()*pick.length)];ids.add(q.id);
      const draw=choice=>{
        title('TRẠM ÔN TẬP · CÂU '+q.id,route.name);dialog.append(questionContent(q,choice,i=>{answered++;if(i===q.answer)correct++;markAnswer(q.id,i);draw(i);}));
        if(Number.isInteger(choice)){
          const ok=choice===q.answer;dialog.append(make('p',ok?'Chính xác. Xe được phục hồi tối đa 20 điểm.':'Đáp án đúng là '+String.fromCharCode(65+q.answer)+'.','edition-feedback'));
          buttons([['Lái tiếp',()=>{dialog.close();resume(ok?20:0);} ],['Về buồng lái',home]]);
        }
      };draw(null);
    }catch{
      title('TRẠM ÔN TẬP','Chưa tải được câu hỏi');buttons([['Thử lại',()=>ask(resume)],['Bỏ qua',()=>{dialog.close();resume(0);}]]);
    }
  }
  return {
    routeName:route.name,vehicle:params.get('vehicle'),sound:params.get('sound')==='1',
    get waiting(){return !started && active;},
    begin(distance){if(!started){origin=distance;started=true;}},
    relocate(){if(started)active=false;},
    completeGuided(){if(!active||!route.drive)return '';active=false;return study?' · Ôn tập '+correct+' / '+answered+' câu đúng':'';},
    marker(distance,guidedProgress){if(!started||!active)return null;const d=route.drive?guidedProgress:distance-origin;if(!Number.isFinite(d))return null;if(!route.drive&&d>=route.length){active=false;return 'finish';}if(study&&stop<markers.length&&d>=markers[stop]){stop++;return 'study';}return null;},
    open(kind,resume){
      if(kind==='study'){ask(resume);return;}
      title('Vi vu đất Việt · thcphm','Hoàn thành chặng '+route.name);dialog.append(make('p','Bạn đã lái '+km(route.length)+' km.'+(study?' Trả lời đúng '+correct+' / '+answered+' câu.':'')));
      buttons([['Tiếp tục lái tự do',()=>{dialog.close();resume(0);}],['Về buồng lái',home]]);
    }
  };
};
