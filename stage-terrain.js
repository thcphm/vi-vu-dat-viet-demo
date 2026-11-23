'use strict';
// Source grids are pre-rotated from geographic north to the race's first bearing.
// Decode only the selected circuit's height field. The same-origin script is
// parser-blocking because terrain, trees and contact points share its first sample.
(() => {
  const half=105,width=half*2+1;
  window.decodePassTerrain=function(encoded,id){
    const data=atob(encoded),raster=new Int16Array(width*width);
    let cursor=0;
    for(let i=0;i<raster.length;i++){
      let shift=0,value=0,byte;
      do{byte=data.charCodeAt(cursor++);value+=(byte&127)*2**shift;shift+=7;}while(byte>=128);
      raster[i]=(i%width?raster[i-1]:0)+(value%2?-(value+1)/2:value/2);
    }
    function cell(distance){
      const d=Math.abs(distance);
      const t=d<=3600?d/50:d<=6200?72+(d-3600)/200:85+(Math.min(15200,d)-6200)/450;
      return half+Math.sign(distance)*t;
    }
    const base=raster[half*width+half];
    function elevation(x,z){
        const u=cell(x),v=cell(z),i=Math.min(width-2,Math.floor(u)),j=Math.min(width-2,Math.floor(v));
        const a=j*width+i,fx=u-i,fz=v-j;
        const lo=raster[a]+(raster[a+1]-raster[a])*fx;
        const hi=raster[a+width]+(raster[a+width+1]-raster[a+width])*fx;
        return lo+(hi-lo)*fz;
    }
    return {id,elevation,seaLevel:-base*.77,ground:(x,z)=>(elevation(x,z)-base)*.77};
  };
  if(document.body.classList.contains('journey'))return;
  const query=new URLSearchParams(location.search),key=query.get('route');
  const stage=(window.mountainStages||[]).find(s=>s.id===key);
  if(!stage&&key!=='pass'&&!(query.get('mode')==='exam'&&!key))return;
  const id=stage?.id||'deo-o-quy-ho';
  window.loadStageRelief=encoded=>{window.stageRelief=window.decodePassTerrain(encoded,id);};
  // IDs come exclusively from the baked stage manifest.
  document.write('<script src="stage-terrain/'+id+'.js"><\/script>');
})();
