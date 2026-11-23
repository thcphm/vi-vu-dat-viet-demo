import {$,el,action,getBank,records,markAnswer,questionContent} from './core.js';
const chapters=[
  ['Tất cả chương',1,600],['Quy tắc giao thông',1,180],['Văn hóa giao thông',181,205],['Kỹ thuật lái xe',206,263],
  ['Cấu tạo và sửa chữa',264,300],['Biển báo đường bộ',301,485],['Sa hình & tình huống',486,600],['Câu điểm liệt',1,600]
];
let bank=[],chapter=0,filter='all',queue=[],pos=0,editing=false;
function setQueue(targetId){
  const [_,from,to]=chapters[chapter];
  queue=bank.filter(q=>q.id>=from && q.id<=to && (chapter!==7||q.critical) && (filter==='all'||(filter==='new'?records[q.id]===undefined:(records[q.id]!==undefined&&records[q.id]!==q.answer))));
  pos=Math.max(0,queue.findIndex(q=>q.id===targetId));editing=false;
}
export async function showTheory(){
  const root=$('#theory-app');
  try{bank=await getBank();const id=queue[pos]?.id;setQueue(id);render();}
  catch{root.replaceChildren(el('p','empty-state','Trình duyệt chưa tải được bộ câu hỏi.'),action('Tải lại','soft-button',showTheory));}
}
function render(){
  const area=$('#theory-app'),side=el('aside','theory-menu'),box=el('article','question-box');
  const attempted=bank.filter(q=>Number.isInteger(records[q.id])), score=attempted.filter(q=>q.answer===records[q.id]).length;
  side.append(el('h2','','Tiến độ ôn tập'));
  const stat=el('div','progress-copy');stat.append(el('span','','Đã trả lời'),el('b','',attempted.length+' / '+bank.length));const progress=el('progress');progress.max=bank.length;progress.value=attempted.length;progress.setAttribute('aria-label','Số câu đã trả lời');side.append(stat,progress);
  side.append(el('div','progress-copy','Đúng '+score+' · Cần ôn '+(attempted.length-score)),el('h3','','Chọn chương'));
  const ch=el('div','chapters');
  chapters.forEach(([label,a,b],i)=>{const btn=action(label,'chapter'+(i===chapter?' selected':''),()=>{chapter=i;setQueue();render();});btn.setAttribute('aria-pressed',i===chapter);btn.append(el('span','',i===7?bank.filter(q=>q.critical).length:b-a+1));ch.append(btn);});side.append(ch);
  const tool=el('div','theory-row'),q=queue[pos];
  tool.append(el('span','q-index',q?'CÂU '+String(q.id).padStart(3,'0')+' / 600':'ÔN TẬP'));
  const pills=el('div','filter-pills');[['all','Tất cả'],['new','Chưa làm'],['wrong','Làm sai']].forEach(([key,label])=>{const b=action(label,key===filter?'selected':'',()=>{filter=key;setQueue();render();});b.setAttribute('aria-pressed',key===filter);pills.append(b);});tool.append(pills);box.append(tool);
  if(q){
    const pick=editing?null:records[q.id];box.append(questionContent(q,pick,i=>{markAnswer(q.id,i);editing=false;render();}));
    if(Number.isInteger(pick)){
      const ok=pick===q.answer,feedback=el('div','quiz-feedback'+(ok?'':' bad'));feedback.setAttribute('role','status');feedback.append(ok?'Chính xác.':'Đáp án đúng là '+String.fromCharCode(65+q.answer)+'.');feedback.append(' ',action('Trả lời lại','text-link',()=>{editing=true;render();}));box.append(feedback);
    }
  }else{box.append(el('p','empty-state',filter==='wrong'?'Bạn chưa có câu làm sai trong nhóm này.':filter==='new'?'Bạn đã làm hết các câu trong nhóm này.':'Nhóm này chưa có câu hỏi.'));}
  const actions=el('div','quiz-actions'),prev=action('Câu trước','secondary-action',()=>{pos--;editing=false;render();});prev.disabled=pos===0;
  const next=action('Câu tiếp','secondary-action',()=>{pos++;editing=false;render();});next.disabled=pos>=queue.length-1;
  const go=el('form','jump-control'),inp=el('input');inp.type='number';inp.inputMode='numeric';inp.min=1;inp.max=600;inp.required=true;inp.placeholder='1–600';inp.setAttribute('aria-label','Số câu muốn mở');
  const jump=el('button','secondary-action','Đến câu');jump.type='submit';
  go.append(inp,jump);go.onsubmit=e=>{e.preventDefault();const id=Number(inp.value);if(!Number.isInteger(id)||id<1||id>600)return;chapter=0;filter='all';setQueue(id);render();};
  actions.append(prev,go,next);box.append(actions);area.replaceChildren(side,box);
}
