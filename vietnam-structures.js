'use strict';

function createVietnamStructures(){
  let setup,sources,offlineFootprints,offlineHeights,api,version=0,graphReady;
  let activeTiles=new Map(),activeHeights=[],signature='';
  const footprintCache=new Map(),heightCache=new Map(),step=.001;
  const limit=matchMedia('(pointer: coarse)').matches?750:1500;
  function json(path){
    return fetch('vn-structures/'+path).then(response=>{
      if(!response.ok)throw Error('Missing structure index');
      return response.json();
    });
  }
  async function init(){
    [api,sources]=await Promise.all([import('./vn-structures/source.mjs'),json('source-index.json')]);
    const offline=await json('offline.json');
    offlineFootprints=new Set(offline.footprints);offlineHeights=new Set(offline.heights);
  }
  function cached(cache,key,load){
    if(!cache.has(key)){
      const task=load().catch(error=>{if(cache.get(key)===task)cache.delete(key);throw error;});
      cache.set(key,task);
    }
    return cache.get(key);
  }
  function indexed(rows){
    if(!rows)return null;
    const cells=new Map();
    for(const row of rows){
      const ring=row[4][0];let x=0,y=0,west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
      for(let i=0;i<ring.length;i+=2){
        x+=ring[i];y+=ring[i+1];west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);
      }
      const lon=(west+east)/2e5,lat=(south+north)/2e5;
      const key=Math.floor(lon/step)+'_'+Math.floor(lat/step);
      if(!cells.has(key))cells.set(key,[]);
      cells.get(key).push({row,lon,lat});
    }
    return cells;
  }
  async function localHeight(key){
    const r=await fetch('vn-structures/heights/'+key+'.gz');
    if(!r.ok)throw Error('Missing bundled height');
    const bytes=new Uint8Array(await r.arrayBuffer());
    const pixels=bytes[0]===31&&bytes[1]===139&&bytes.length!==512*512
      ?new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()):bytes;
    if(pixels.length!==512*512)throw Error('Invalid bundled height');
    return pixels;
  }
  async function load(graph,x,z,bundledOnly=false){
    const seq=++version;
    try{
      setup??=init().catch(e=>{setup=null;throw e;});
      await setup;if(seq!==version)return false;
      const [lon,lat]=graph.geo(x,z),keys=api.tileKeys(lon,lat,950);
      const blocks=api.heightBlocks(sources.heightSources,lon,lat,950);
      // At departure, wait for bundled buildings before laying out the street.
      // Districts requiring remote imagery continue streaming while driving.
      if(bundledOnly && (!keys.every(k=>offlineFootprints.has(k)) ||
        !blocks.every(b=>offlineHeights.has(b.key))))return false;
      const tiles=await Promise.allSettled([
        ...keys.map(key=>cached(footprintCache,key,async()=>{
          const rows=offlineFootprints.has(key)?await fetchMapTile('vn-structures/footprints/'+key+'.gz'):
            await api.readFootprints(key,sources.thresholds);
          return indexed(rows);
        })),
        ...blocks.map(b=>cached(heightCache,b.key,()=>offlineHeights.has(b.key)?localHeight(b.key):api.readHeightBlock(b)))
      ]);
      if(seq!==version)return false;
      const local=new Map(),heights=[];
      keys.forEach((k,i)=>{if(tiles[i].status==='fulfilled'&&tiles[i].value)local.set(k,tiles[i].value);});
      blocks.forEach((b,i)=>{const tile=tiles[keys.length+i];if(tile.status==='fulfilled')heights.push({...b,pixels:tile.value});});
      const next=[...local.keys(),...heights.map(h=>h.key)].join('/');
      const changed=graph!==graphReady||next!==signature;
      graphReady=graph;signature=next;activeTiles=local;activeHeights=heights;
      for(const k of footprintCache.keys())if(!keys.includes(k))footprintCache.delete(k);
      const keepHeights=new Set(heights.map(b=>b.key));
      for(const k of heightCache.keys())if(!keepHeights.has(k))heightCache.delete(k);
      return changed;
    }catch{return false;}
  }
  function height(lon,lat){
    for(const b of activeHeights){
      const p=b.project(lon,lat);
      const u=Math.floor((p[0]-b.source[2])/4)-512*b.i,v=Math.floor((b.source[3]-p[1])/4)-512*b.j;
      if(u<0||v<0||u>=512||v>=512)continue;
      const sample=b.pixels[v*512+u];
      if(sample)return sample/2;
    }
    return 0;
  }
  function rows(graph,x,z){
    if(graph!==graphReady)return [];
    const [lon,lat]=graph.geo(x,z),candidates=[],seen=new Set(),reach=650;
    const dx=reach/graph.mx,dy=reach/graph.my;
    for(const key of api.tileKeys(lon,lat,reach)){
      const cells=activeTiles.get(key);if(!cells)continue;
      for(let i=Math.floor((lon-dx)/step);i<=Math.floor((lon+dx)/step);i++)
        for(let j=Math.floor((lat-dy)/step);j<=Math.floor((lat+dy)/step);j++){
          for(const item of cells.get(i+'_'+j)||[]){
            const distance=((item.lon-lon)*graph.mx)**2+((item.lat-lat)*graph.my)**2;
            if(distance<=reach**2&&!seen.has(item.row[0])){
              seen.add(item.row[0]);candidates.push({item,distance});
            }
          }
        }
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    return candidates.slice(0,limit).map(({item})=>{
      const row=item.row;
      return [row[0],row[1],height(item.lon,item.lat),row[3],row[4],row[5]];
    });
  }
  return {load,rows,
    heightAt:(graph,x,z)=>graph===graphReady?height(...graph.geo(x,z)):0,
    covered:(graph,x,z)=>graph===graphReady&&activeTiles.has(api.tileAt(...graph.geo(x,z)).join('_'))};
}
