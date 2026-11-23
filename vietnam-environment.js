'use strict';
// Load local raster tiles around the active drive; every lookup is synchronous.
function createVietnamEnvironment(){
  let manifest, manifestRequest, active=new Map(), signature=null, version=0, revision=0;
  const pending=new Map(), estimates=new Float32Array(256);
  for(let i=1;i<256;i++)estimates[i]=2**((i-1)/20)-1;

  function readManifest(){
    if(!manifestRequest){
      manifestRequest=fetch('vn-environment/index.json').then(async response=>{
        if(!response.ok)throw Error('Environment index HTTP '+response.status);
        manifest=await response.json();
        manifest.tiles=new Set(manifest.tiles);
      }).catch(error=>{manifestRequest=null;throw error;});
    }
    return manifestRequest;
  }

  function readTile(key){
    if(active.has(key))return Promise.resolve(active.get(key));
    if(!pending.has(key)){
      const request=fetch('vn-environment/'+key+'.gz').then(async response=>{
        if(!response.ok)throw Error('Environment tile HTTP '+response.status);
        let pixels=new Uint8Array(await response.arrayBuffer());
        const expected=manifest.populationSize**2+manifest.coverSize**2;
        if(pixels.length!==expected&&pixels[0]===31&&pixels[1]===139){
          const stream=new Blob([pixels]).stream().pipeThrough(new DecompressionStream('gzip'));
          pixels=new Uint8Array(await new Response(stream).arrayBuffer());
        }
        if(pixels.length!==expected)throw Error('Invalid environment tile');
        return pixels;
      }).finally(()=>pending.delete(key));
      pending.set(key,request);
    }
    return pending.get(key);
  }

  async function load(graph,x,z){
    const stamp=++version;
    try{await readManifest();}catch{return false;}
    if(stamp!==version)return false;
    const [lon,lat]=graph.geo(x,z),grid=manifest.grid,keys=[];
    const dx=1600/graph.mx,dy=1600/graph.my;
    for(let i=Math.floor((lon-dx)*grid);i<=Math.floor((lon+dx)*grid);i++){
      for(let j=Math.floor((lat-dy)*grid);j<=Math.floor((lat+dy)*grid);j++){
        const key=i+'_'+j;
        if(manifest.tiles.has(key))keys.push(key);
      }
    }
    const next=keys.join('/');
    if(next===signature)return false;
    const tiles=await Promise.allSettled(keys.map(readTile));
    if(stamp!==version)return false;
    const loaded=new Map();
    tiles.forEach((result,i)=>{if(result.status==='fulfilled')loaded.set(keys[i],result.value);});
    const changed=loaded.size!==active.size||[...loaded.keys()].some(key=>!active.has(key));
    if(changed)revision++;
    active=loaded;
    signature=loaded.size===keys.length?next:null;
    return changed;
  }

  function sample(graph,x,z){
    if(!manifest)return {population:null,cover:null};
    const [lon,lat]=graph.geo(x,z),u=lon*manifest.grid,v=lat*manifest.grid;
    const east=Math.floor(u),north=Math.floor(v),bytes=active.get(east+'_'+north);
    if(!bytes)return {population:null,cover:null};
    const fx=u-east,fy=v-north;
    // Raster rows run north to south. Exactly on the south edge is the last row.
    const index=size=>(size-1-Math.floor(fy*size))*size+Math.floor(fx*size);
    const density=bytes[index(manifest.populationSize)];
    return {population:density?estimates[density]:null,
            cover:bytes[manifest.populationSize**2+index(manifest.coverSize)]||null};
  }
  return {load,sample,get revision(){return revision;}};
}
