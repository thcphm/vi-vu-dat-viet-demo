'use strict';
// OSM anchors are indexed geographically so scene rebases never move an amenity.
function createVietnamAmenities(){
  const base='vn-amenities/', bucketScale=100, reach=2400;
  const tileCache=new Map();
  let manifest, graphLoaded, signature, request=0, buckets=new Map();

  function loadIndex(){
    if(!manifest)manifest=fetch(base+'index.json').then(response=>{
      if(!response.ok)throw Error('Không tải được mục lục địa điểm.');
      return response.json();
    }).then(index=>({tiles:new Set(index.tiles),scale:index.scale}))
      .catch(error=>{manifest=null;throw error;});
    return manifest;
  }

  async function load(graph,x,z){
    const stamp=++request;
    try{
      const index=await loadIndex();
      if(stamp!==request)return false;
      const [lon,lat]=graph.geo(x,z), dx=reach/graph.mx, dy=reach/graph.my, keys=[];
      for(let i=Math.floor(lon-dx);i<=Math.floor(lon+dx);i++)
        for(let j=Math.floor(lat-dy);j<=Math.floor(lat+dy);j++){
          const key=i+'_'+j;
          if(index.tiles.has(key))keys.push(key);
        }
      const next=keys.join('/');
      if(graphLoaded===graph&&next===signature)return false;
      const tiles=await Promise.all(keys.map(key=>{
        if(!tileCache.has(key)){
          const pending=fetchMapTile(base+key+'.gz').catch(error=>{tileCache.delete(key);throw error;});
          tileCache.set(key,pending);
        }
        return tileCache.get(key);
      }));
      if(stamp!==request)return false;
      const fresh=new Map();
      for(const tile of tiles)for(const [id,kind,name,rawLon,rawLat] of tile){
        const lon=rawLon/index.scale,lat=rawLat/index.scale;
        const key=Math.floor(lon*bucketScale)+','+Math.floor(lat*bucketScale);
        if(!fresh.has(key))fresh.set(key,[]);
        fresh.get(key).push({id,kind,name,...graph.point(lon,lat)});
      }
      for(const key of tileCache.keys())if(!keys.includes(key))tileCache.delete(key);
      buckets=fresh;signature=next;graphLoaded=graph;
      return true;
    }catch{return false;}
  }

  function nearby(graph,x,z,radius){
    if(graph!==graphLoaded||!Number.isFinite(radius)||radius<0)return [];
    const [lon,lat]=graph.geo(x,z), dx=radius/graph.mx, dy=radius/graph.my;
    const result=[];
    for(let i=Math.floor((lon-dx)*bucketScale);i<=Math.floor((lon+dx)*bucketScale);i++)
      for(let j=Math.floor((lat-dy)*bucketScale);j<=Math.floor((lat+dy)*bucketScale);j++)
        for(const point of buckets.get(i+','+j)||[]){
          if((point.x-x)**2+(point.z-z)**2<=radius**2)result.push(point);
        }
    return result;
  }
  return {load,nearby};
}
