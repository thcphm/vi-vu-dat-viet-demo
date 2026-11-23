import {$,$$,el,icon,icons,action,routes,cars,prefs,selectedRoute,selectedCar,prefer,formatKm,getBank,read} from './core.js';
import {showTheory} from './theory.js';
import {startTrip} from './launch.js';

icons();
const routeCards=$('#route-cards'), quickCar=$('#quick-car'), garage=$('#garage-cards');
const query = $('#route-query'), region = $('#route-region'), province = $('#route-province');
const more = $('#more-routes'), batch = 8;
let visible = batch;
const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll('đ', 'd');
function provinceOptions() {
  const current = province.value;
  const names = [...new Set(routes.filter(r => !region.value || r.region === region.value).map(r => r.province))];
  names.sort((a,b) => a === 'Đồng Nai' ? -1 : b === 'Đồng Nai' ? 1 : a.localeCompare(b,'vi'));
  province.replaceChildren(new Option('Tất cả tỉnh, thành',''), ...names.map(name => new Option(name,name)));
  if (names.includes(current)) province.value = current;
}
function markRouteCards() {
  for (const card of routeCards.children) {
    const active = card.dataset.route === prefs.route;
    card.classList.toggle('active',active);
    card.setAttribute('aria-pressed',String(active));
    $('.route-check',card).hidden = !active;
  }
}
function renderRouteCards() {
  const words = fold(query.value.trim()).split(/\s+/).filter(Boolean);
  const matches = routes.filter(route => {
    if ((region.value && route.region !== region.value) || (province.value && route.province !== province.value)) return false;
    const text = fold([route.name,route.location,route.province,route.region,route.terrain,route.pass||''].join(' '));
    return words.every(word => text.includes(word));
  });
  routeCards.replaceChildren();
  for (const r of matches.slice(0,visible)) {
    const card=el('button','route-card');card.type='button';card.dataset.route=r.id;
    const picture=el('div','route-image'),img=el('img');img.src=r.thumb;img.alt='';img.loading='lazy';
    const tick=el('span','route-check');tick.append(icon('check'));
    picture.append(img,el('span','route-tag',r.code),tick);
    const text=el('div','route-copy'),title=el('div');title.append(el('h3','',r.name),el('p','',r.location));
    text.append(title,el('span','route-km',formatKm(r.length)+' km'));card.append(picture,text);
    card.onclick=()=>{prefer('route',r.id);sync();};
    routeCards.append(card);
  }
  $('#route-count').textContent = matches.length ? (matches.length === routes.length
    ? routes.length+' cung đường · '+new Set(routes.map(r=>r.province)).size+' tỉnh, thành'
    : matches.length+' / '+routes.length+' cung đường') : 'Chưa có cung đường khớp. Hãy đổi từ khóa hoặc bộ lọc.';
  more.hidden = matches.length <= visible;
  more.textContent = 'Xem thêm '+Math.min(batch,Math.max(0,matches.length-visible))+' cung đường';
  markRouteCards();
}
query.oninput=province.onchange=()=>{visible=batch;renderRouteCards();};
region.onchange=()=>{provinceOptions();visible=batch;renderRouteCards();};
more.onclick=()=>{const first=routeCards.children.length;visible+=batch;renderRouteCards();routeCards.children[first]?.focus({preventScroll:true});};
provinceOptions();renderRouteCards();
let fleetFilter='Tất cả';
const groups=['VietForward','Cá nhân','Dịch vụ'];
for(const name of groups){
  const opt=el('optgroup');opt.label=name;
  for(const c of cars.filter(x=>x.group===name))opt.append(new Option(c.name,c.id));
  quickCar.append(opt);
}
quickCar.onchange=()=>{prefer('car',quickCar.value);sync();};
for(const filter of ['Tất cả',...groups]){
  const b=action(filter,'',()=>{fleetFilter=filter;sync();});b.dataset.filter=filter;$('#fleet-filters').append(b);
}
cars.forEach(c=>{
  const item=el('article','garage-card');item.dataset.car=c.id;
  const img=el('img','garage-photo');img.src='assets/vehicles/'+c.id+'-studio.webp';img.alt=c.name+' màu '+c.paint;
  const stats=el('div','garage-stats');
  [['Tốc độ tối đa',c.top+' km/h'],[c.electric?'Dung lượng pin':'Dung tích bình',c.capacity.toLocaleString('vi-VN')+(c.electric?' kWh':' L')]].forEach(([label,val])=>{const d=el('div');d.append(el('small','',label),el('b','',val));stats.append(d);});
  const button=action('Chọn xe','garage-select',()=>{prefer('car',c.id);sync();});
  const service=action('', 'garage-service',()=>{const e=DuongVietEnergy.meta(c.id);DuongVietEnergy.panel(e,{atGarage:true,onChanged:sync});});
  item.append(el('span','mini-label',c.electric?'Điện':c.fuel==='diesel'?'Diesel':'Xăng'),img,el('h2','',c.name),el('p','type',c.type+' · '+c.paint),stats,button,service);garage.append(item);
});
$$('[data-mode]').forEach(b=>b.onclick=()=>{prefer('mode',b.dataset.mode);sync();});
const perspectives = $$('[data-perspective]');
function showPerspective() {
  const selected = globalThis.DriveView.current();
  for (const button of perspectives) {
    const active = button.dataset.perspective === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}
for (const button of perspectives) button.onclick = () => {
  globalThis.DriveView.select(button.dataset.perspective);
  showPerspective();
};
window.addEventListener('pageshow', showPerspective);
window.addEventListener('storage', showPerspective);
function sync(){
  showPerspective();
  const route=selectedRoute(),car=selectedCar();
  $('#hero-land').style.backgroundImage='url("'+route.image+'")';
  $('#route-hero').classList.toggle('map-cover',route.mapPreview);
  $('#scenic-open').setAttribute('aria-label',route.mapPreview?'Phóng to sơ đồ cung đường':'Xem toàn cảnh cung đường');
  $('#hero-car').src='assets/vehicles/'+car.id+'-rear.webp';
  $('#hero-car-wrap').dataset.model=car.id;
  $('#hero-title').textContent=route.name;$('#hero-title').classList.toggle('long-title',route.name.length>23);$('#hero-region').textContent=route.region;
  $('#hero-code').textContent=route.code;$('#hero-location').textContent=route.location;
  $('#hero-length').textContent=formatKm(route.length)+' km';$('#hero-terrain').textContent=route.terrain;$('#hero-level').textContent=route.level;
  $('#model-name').textContent=car.name;$('#car-index').textContent=String(cars.indexOf(car)+1).padStart(2,'0')+' / '+cars.length;
  $('#model-photo').src='assets/vehicles/'+car.id+'-studio.webp';$('#model-photo').alt=car.name+' màu '+car.paint;
  $('#garage-route').textContent=route.name+' · '+formatKm(route.length)+' km';
  markRouteCards();
  quickCar.value=car.id;
  $$('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===fleetFilter);b.setAttribute('aria-pressed',b.dataset.filter===fleetFilter);});
  $$('[data-mode]').forEach(b=>{const on=b.dataset.car===car.id||b.dataset.mode===prefs.mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});
  $$('.garage-card').forEach(card=>{const on=card.dataset.car===car.id;card.classList.toggle('active',on);const v=cars.find(x=>x.id===card.dataset.car);card.hidden=fleetFilter!=='Tất cả'&&v.group!==fleetFilter;const energy=DuongVietEnergy.meta(v.id);$('.garage-service',card).textContent=energy.verb+' · '+DuongVietEnergy.pct(energy,DuongVietEnergy.amount(energy))+'%';const b=$('.garage-select',card);b.setAttribute('aria-pressed',on);b.replaceChildren(...(on?[icon('check'),'Đang chọn']:['Chọn xe']));});
  const sound=$('#sound');sound.replaceChildren(icon(prefs.sound?'volume-on':'volume-x'));const label=prefs.sound?'Tắt âm thanh':'Bật âm thanh';sound.title=label;sound.setAttribute('aria-label',label);sound.setAttribute('aria-pressed',prefs.sound);
}
$('#sound').onclick=()=>{prefer('sound',!prefs.sound);sync();};
const dialog=$('#info-dialog'), content=$('#dialog-content');
function openDialog(title,wide=false) {
  $('#dialog-heading').textContent=title;content.replaceChildren();dialog.classList.toggle('wide',wide);
  if(!dialog.open) dialog.showModal();
}
$('#close-info').onclick=()=>dialog.close();
dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
function guide(){
  openDialog('Hướng dẫn lái xe');
  const pairs=[['Tăng ga',['W','↑']],['Phanh và lùi',['S','↓']],['Đánh lái trái / phải',['A','D','←','→']],['Đổi góc nhìn',['C']],['Tạm dừng',['P']]];
  pairs.forEach(([t,keys])=>{const line=el('div','tip-line'),kb=el('div','guide-keys');keys.forEach(k=>kb.append(el('kbd','',k)));line.append(el('span','',t),kb);content.append(line);});
  content.append(el('p','','Trên màn hình cảm ứng, giữ nút Ga, Phanh và nút lái. Đi bên phải, giảm tốc trước khi vào cua và tránh xe ngược chiều.'));
  content.append(el('p','','Chọn Ghế lái (POV) trước khi xuất phát để nhìn qua kính chắn gió. Khi đang lái, nhấn C hoặc chạm Trong xe / Sau xe để chuyển góc nhìn.'));
  content.append(el('p','','Chế độ Lái & học dừng xe tại các mốc ôn tập. Trả lời đúng để phục hồi tình trạng xe. Chiều dài chặng được tính theo quãng đường bạn thực sự lái.'));
  content.append(action('Đã hiểu','primary',()=>dialog.close()));
}
function credits(){
  openDialog('Tác giả & nguồn dữ liệu');
  const author=el('div','credits-by');author.append('Vi vu đất Việt · © 2026',el('span','signature','thcphm'));content.append(author);
  content.append(el('p','','Vi vu đất Việt là sản phẩm của thcphm. Bạn có thể chọn một trong 3 mẫu xe, đổ xăng hoặc sạc điện và ôn lý thuyết ngay trên hành trình.'));
  content.append(el('p','','Ngân hàng 600 câu, đáp án và hình minh họa lý thuyết do Cục Cảnh sát giao thông – Bộ Công an biên soạn năm 2025.'));
  const links=el('div','source-links');
  [['Bộ 600 câu của Cục CSGT','https://xaydungchinhsach.chinhphu.vn/600-cau-hoi-dung-cho-sat-hach-lai-xe-co-gioi-duong-bo-119250513095211625.htm'],['Ảnh cung đường','licenses/route-photos.txt'],['Sơ đồ cung đường','licenses/route-maps.txt'],['Cây và mặt tiền','../streetscape/CREDITS.txt'],['Địa giới hành chính','assets/map/sources.txt'],['Đường và OSM','../vn-roads/CREDITS.txt'],['Leaflet','vendor/leaflet-license.txt'],['Three.js','../THREE-LICENSE.txt'],['Phông Barlow','licenses/barlow.txt'],['Barlow Condensed','licenses/barlow-condensed.txt'],['Explora','licenses/explora.txt']].forEach(([t,href])=>{const a=el('a','',t);a.href=href;a.target='_blank';a.rel='noopener';links.append(a);});
  content.append(links,el('p','','VietForward (VF) là hãng xe hư cấu của trò chơi. Dung lượng, tốc độ và mức tiêu thụ hiển thị là thông số trong game.'),el('p','','Lựa chọn xe, cung đường và tiến độ học được lưu trên trình duyệt của bạn.'));
}
$$('[data-dialog]').forEach(b=>b.onclick=b.dataset.dialog==='guide'?guide:credits);
$('#scenic-open').onclick=()=>{
  const r=selectedRoute(),c=selectedCar();openDialog(r.name+' · '+r.location,true);
  if(r.mapPreview){
    const map=el('img','route-trace');map.src=r.image;map.alt='Sơ đồ '+r.name;content.append(map);return;
  }
  const scene=el('div','scenic-view'),wrap=el('div','hero-car-wrap'),img=el('img');scene.style.backgroundImage='url("'+r.image+'")';img.src='assets/vehicles/'+c.id+'-rear.webp';img.alt=c.name+' trên '+r.name;wrap.append(img);scene.append(wrap);content.append(scene);
  content.append(action('Xem sơ đồ tuyến','soft-button',()=>{
    const map=el('img','route-trace');map.src='assets/routes/traces/'+r.id+'.webp';map.alt='Sơ đồ '+r.name;content.replaceChildren(map);
  }));
};
$$('[data-start]').forEach(b=>b.onclick=()=>startTrip(selectedRoute(),selectedCar(),prefs.mode,prefs.sound));
function showPage(shouldScroll=true){
  const fragments=['buong-lai','ban-do','gara','ly-thuyet'],fragment=location.hash.slice(1);
  const page=fragments.includes(fragment)?fragment:'buong-lai';
  $$('.view').forEach(v=>v.hidden=v.id!=='view-'+page);
  $$('.main-nav a').forEach(a=>{const on=a.dataset.page===page;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(page==='ly-thuyet')showTheory();
  if(page==='ban-do')import('./atlas.js').then(m=>m.openAtlas()).catch(()=>{$('#atlas-tip').textContent='Chưa tải được bản đồ. Hãy tải lại trang.';});
  sync();if(shouldScroll)window.scrollTo(0,0);
}
window.addEventListener('hashchange',()=>showPage());
showPage(false);
