'use strict';
function createSightPhotos(){
  const link=document.getElementById('tourReference'),dialog=document.getElementById('sightPhoto');
  const image=dialog.querySelector('img'),credit=dialog.querySelector('figcaption');
  let index,current,sequence=0;
  function external(title,url){
    const a=document.createElement('a');a.textContent=title;a.href=url;a.target='_blank';a.rel='noopener';return a;
  }
  async function select(data){
    const token=++sequence;
    current=null;
    const fallback=data.photo||data.map||data.source;
    link.hidden=!fallback;
    link.href=fallback||'#';link.removeAttribute('aria-haspopup');
    link.textContent=data.photo?'Ảnh tham khảo ↗':data.map?'Bản đồ địa điểm ↗':'Tư liệu địa danh ↗';
    try{
      index??=fetch('sight-photos/index.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).catch(e=>{index=null;throw e;});
      const photos=await index;
      if(sequence!==token)return;
      const ref=data.map?.match(/openstreetmap\.org\/(node|way|relation)\/(\d+)/);
      // A camera may face a different building from the main landmark.
      // Keep its own reference link when that view has no reusable photograph.
      const photo=data.photoCatalogId?photos[data.photoCatalogId]:
        photos[data.catalogId||data.id]||ref&&photos['osm-'+ref[1]+'-'+ref[2]];
      if(!photo)return;
      current={name:data.name,photo};link.href=photo.page;link.textContent='Xem ảnh thực địa';
      link.setAttribute('aria-haspopup','dialog');link.hidden=false;
    }catch{/* The source/map link remains available offline. */}
  }
  link.addEventListener('click',e=>{
    if(!current||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
    e.preventDefault();
    const {name,photo}=current;
    document.getElementById('sightPhotoTitle').textContent=name;
    image.alt='Ảnh thực địa tại '+name;image.width=photo.width;image.height=photo.height;
    image.hidden=false;image.src='sight-photos/'+photo.file;
    image.onerror=()=>{image.hidden=true;};
    credit.replaceChildren(document.createTextNode(photo.artist+' · '),external(photo.license,photo.licenseUrl),
      document.createTextNode(' · '),external('Ảnh gốc',photo.page),document.createTextNode(' · Đã thu nhỏ, chuyển sang WebP.'));
    dialog.showModal();
  });
  dialog.querySelector('button').onclick=()=>dialog.close();
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  dialog.addEventListener('close',()=>{image.removeAttribute('src');link.focus({preventScroll:true});});
  return {select};
}
