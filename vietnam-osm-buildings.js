'use strict';

function createVietnamOsmBuildings(base='vn-osm-buildings/',limit=matchMedia('(pointer: coarse)').matches?750:1500){
  const cache=new Map(),cell=128;
  let index,ready,signature,version=0,active=[];

  function loadIndex(){
    if(!index)index=fetch(base+'index.json').then(r=>{
      if(!r.ok)throw Error('Không tải được mục lục nhà OSM.');
      return r.json();
    }).catch(error=>{index=null;throw error;});
    return index;
  }

  // Index the whole outline, including long factories reaching into a nearby cell.
  function indexTile(rows){
    const cells=new Map();
    for(const row of rows){
      const ring=row[4][0];
      let x=0,y=0,west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
      for(let n=0;n<ring.length;n+=2){
        x+=ring[n];y+=ring[n+1];
        west=Math.min(west,x);south=Math.min(south,y);east=Math.max(east,x);north=Math.max(north,y);
      }
      const entry={row,west,south,east,north};
      for(let i=Math.floor(west/cell);i<=Math.floor(east/cell);i++)
        for(let j=Math.floor(south/cell);j<=Math.floor(north/cell);j++){
          const key=i+','+j;
          if(!cells.has(key))cells.set(key,[]);
          cells.get(key).push(entry);
        }
    }
    return cells;
  }

  async function load(graph,x,z){
    const stamp=++version;
    try{
      const manifest=await loadIndex();if(stamp!==version)return false;
      const [lon,lat]=graph.geo(x,z),reach=1050,dx=reach/graph.mx,dy=reach/graph.my;
      const w=(lon-dx)*manifest.scale,s=(lat-dy)*manifest.scale;
      const e=(lon+dx)*manifest.scale,n=(lat+dy)*manifest.scale;
      const keys=manifest.tiles.filter(([,left,bottom,right,top])=>right>=w&&left<=e&&top>=s&&bottom<=n)
        .map(tile=>tile[0]);
      const requested=keys.join('/');
      if(ready===graph&&signature===requested)return false;
      const loaded=await Promise.all(keys.map(key=>{
        if(!cache.has(key)){
          const job=fetchMapTile(base+key+'.gz').then(indexTile).catch(()=>{
            if(cache.get(key)===job)cache.delete(key);
            return null;
          });
          cache.set(key,job);
        }
        return cache.get(key);
      }));
      if(stamp!==version)return false;
      const next=keys.filter((_,i)=>loaded[i]).join('/');
      const changed=ready!==graph||signature!==next;
      ready=graph;signature=next;active=loaded.filter(Boolean);
      for(const k of cache.keys())if(!keys.includes(k))cache.delete(k);
      return changed;
    }catch{return false;}
  }

  function rows(graph,x,z){
    if(graph!==ready)return [];
    const [lon,lat]=graph.geo(x,z),px=lon*1e5,py=lat*1e5,reach=650;
    const mx=graph.mx/1e5,my=graph.my/1e5;
    const dx=reach/mx,dy=reach/my,seen=new Set(),candidates=[];
    for(let i=Math.floor((px-dx)/cell);i<=Math.floor((px+dx)/cell);i++){
      for(let j=Math.floor((py-dy)/cell);j<=Math.floor((py+dy)/cell);j++){
        const key=i+','+j;
        for(const tile of active)for(const entry of tile.get(key)||[]){
          if(seen.has(entry))continue;
          seen.add(entry);
          const ax=Math.max(0,entry.west-px,px-entry.east)*mx;
          const ay=Math.max(0,entry.south-py,py-entry.north)*my;
          const d=ax*ax+ay*ay;
          if(d<=reach*reach)candidates.push({row:entry.row,d});
        }
      }
    }
    candidates.sort((a,b)=>a.d-b.d);
    return candidates.slice(0,limit).map(item=>item.row);
  }
  return {load,rows};
}
