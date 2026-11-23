import './route-data.js';
import './pass-data.js';
import './routes.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
const shapes = {
  wheel:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><path d="m3.5 9 6.3 2.1m10.7-2.1-6.3 2.1M10.8 14.2l-.3 6.4m2.7-6.4.4 6.4"/>',
  car:'<path d="M3 15v-3l2-1 2-5h9l3 5 2 1v4H3Zm3 1v2m12-2v2M5 11h14M6.5 13.5h1m9 0h1"/>',
  book:'<path d="M12 6c-2-2-6-2-9-1v14c3-1 7-1 9 1 2-2 6-2 9-1V5c-3-1-7-1-9 1Zm0 0v14"/>',
  'volume-x':'<path d="m4 9 4 0 5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>',
  'volume-on':'<path d="m3 9 4 0 5-4v14l-5-4H3zM16 8c2.3 2 2.3 6 0 8m3-11c4.5 3.5 4.5 10.5 0 14"/>',
  gamepad:'<path d="M8 7h8c3 0 4 2 5 6l.7 2.8c.6 3.2-1.7 4.3-3.7 2.3L16 16H8l-2 2c-2 2-4.4.9-3.7-2.3L3 13c1-4 2-6 5-6Z"/><path d="M7.5 9.5v5m-2.5-2.5h5m5.5-.7h.1m2.5 2h.1"/>',
  route:'<circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="6" r="2.4"/><path d="M7.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7.5"/>',
  sliders:'<path d="M4 7h8m4 0h4M4 17h3m4 0h9"/><circle cx="14" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.25"/>',
  mountain:'<path d="m2 19 7-13 4 7 3-5 6 11H2Z"/><path d="m7 10 2.2 2 1.6-1.5"/>',
  level:'<path d="M5 19v-4m7 4V9m7 10V4" stroke-width="2.6"/>',
  waypoints:'<path d="M7 20h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/><circle cx="5" cy="20" r="1.6"/><circle cx="18" cy="7" r="2.5"/>',
  'map-fold':'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  check:'<path d="m5 12 4 4 10-10"/>', x:'<path d="m6 6 12 12M18 6 6 18"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/>',
  camera:'<path d="M3 8h4l2-3h6l2 3h4v12H3Z"/><circle cx="12" cy="13" r="3"/>',
  pause:'<path d="M8 5v14m8-14v14" stroke-width="3.6"/>',
  shield:'<path d="m12 3 8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.7-5"/>',
  left:'<path d="m15 5-7 7 7 7"/>',right:'<path d="m9 5 7 7-7 7"/>',
  flag:'<path d="M5 21V4c4-4 9 4 15 0v10c-6 4-11-4-15 0"/>',
  repeat:'<path d="M3 12a9 9 0 1 1 3 7m-3-8v5h5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
export function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 24 24'); s.setAttribute('aria-hidden','true'); s.classList.add('icon');
  s.innerHTML = shapes[name] || ''; return s;
}
export function icons(root=document) { $$('[data-icon]',root).forEach(n=>n.replaceWith(icon(n.dataset.icon))); }
export function action(label, className, fn, symbol) {
  const b=el('button',className); b.type='button'; if(symbol)b.append(icon(symbol)); b.append(label); b.onclick=fn; return b;
}
export const routes = globalThis.VietDrivingRoutes;
export const cars=globalThis.DuongVietFleet;
export const formatKm = metres => (metres / 1000).toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1});
export const formatTime = seconds => Math.floor(seconds/60)+'′ '+String(Math.floor(seconds%60)).padStart(2,'0')+'″';
export function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem('duongviet.1.'+key)) ?? fallback; } catch { return fallback; }
}
export function save(key, value) { try { localStorage.setItem('duongviet.1.'+key, JSON.stringify(value)); } catch {} }
const raw = read('preferences',{}) || {};
export const prefs = {
  route:routes.find(r=>r.id===raw.route)?.id || routes[0].id,
  car:cars.find(c=>c.id===raw.car)?.id || cars[0].id,
  mode:raw.mode === 'free'?'free':'study',
  sound:raw.sound === true
};
export const selectedRoute = () => routes.find(r=>r.id===prefs.route);
export const selectedCar = () => cars.find(c=>c.id===prefs.car);
export function prefer(key, value) { prefs[key]=value; save('preferences',prefs); }
const studyKey='taylai.csgt2025.study.v1';
function readStudy() {
  try {return JSON.parse(localStorage.getItem(studyKey)) || {};} catch {return {};}
}
export const records = readStudy().results || {};
export function markAnswer(id, idx) {
  const state=readStudy();state.results={...state.results,[id]:idx};records[id]=idx;
  try {localStorage.setItem(studyKey,JSON.stringify(state));} catch {}
}
let bankRequest;
const criticalIds=new Set([19,20,21,22,23,24,25,26,27,28,30,32,34,35,47,48,52,53,55,58,63,64,65,66,67,68,70,71,72,73,74,85,86,87,88,89,90,91,92,93,97,98,102,117,163,165,167,197,198,206,215,226,234,245,246,252,253,254,255,260]);
export function getBank() {
  Object.assign(records,readStudy().results);
  if(!bankRequest)bankRequest=import('../bank.js').then(()=>window.driveBank.map(q=>({
    id:q.id,prompt:q.prompt,choices:q.choices,answer:q.correct,critical:criticalIds.has(q.id),
    image:q.image?new URL('../'+q.image,import.meta.url).href:undefined
  }))).catch(e=>{bankRequest=null;throw e;});
  return bankRequest;
}
export function questionContent(q, choice, onAnswer) {
  const box=el('div','question-content');
  box.append(el('h2','question-title',q.prompt));
  if(q.image){const img=el('img','quiz-figure');img.src=q.image;img.alt='Hình minh họa câu '+q.id;box.append(img);}
  const list=el('div','options-list');
  q.choices.forEach((text,i)=>{
    const b=el('button','quiz-option');b.type='button';b.append(el('span','option-letter',String.fromCharCode(65+i)),el('span','',text));
    if(Number.isInteger(choice)){b.disabled=true;if(i===q.answer)b.classList.add('correct');else if(i===choice)b.classList.add('incorrect');}
    b.onclick=()=>onAnswer(i);list.append(b);
  });
  box.append(list);return box;
}
