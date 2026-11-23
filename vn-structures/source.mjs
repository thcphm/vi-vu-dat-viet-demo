import {PMTiles, VectorTile, Pbf} from './tiles-vendor.mjs';

const archiveURL='https://data.source.coop/cholmes/google-open-buildings/google-open-buildings.pmtiles';
const archive=new PMTiles({
  getKey:()=>archiveURL,
  async getBytes(offset,length,signal){
    const timeout=AbortSignal.timeout(12000);
    const response=await fetch(archiveURL,{
      headers:{Range:'bytes='+offset+'-'+(offset+length-1)},cache:'no-store',
      signal:signal?AbortSignal.any([timeout,signal]):timeout
    });
    if(response.status!==206)throw Error('Building archive does not support byte ranges');
    return {data:await response.arrayBuffer(),etag:response.headers.get('ETag')||undefined};
  }
});
const world=32768, radians=Math.PI/180;
export function tileAt(lon,lat){
  return [Math.floor((lon+180)/360*world),Math.floor((1-Math.asinh(Math.tan(lat*radians))/Math.PI)*world/2)];
}
export function tileKeys(lon,lat,reach){
  const dx=reach/(111320*Math.cos(lat*radians)),dy=reach/110900;
  const [x0,y0]=tileAt(lon-dx,lat+dy),[x1,y1]=tileAt(lon+dx,lat-dy),keys=[];
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)keys.push(x+'_'+y);
  return keys;
}
function minimumConfidence(zones,lon,lat){
  for(const [value,ring] of zones){
    let inside=false;
    for(let i=0,j=ring.length-2;i<ring.length;j=i,i+=2){
      const x=ring[i],y=ring[i+1],a=ring[j],b=ring[j+1];
      if((y>lat)!==(b>lat)&&lon<(a-x)*(lat-y)/(b-y)+x)inside=!inside;
    }
    if(inside)return value;
  }
  return .85;
}
function packRing(coords){
  const points=[];
  for(const [lon,lat] of coords.slice(0,-1)){
    const x=Math.round(lon*1e5),y=Math.round(lat*1e5);
    if(x!==points.at(-1)?.[0]||y!==points.at(-1)?.[1])points.push([x,y]);
  }
  // Rounding to one metre can fold a narrow indent onto its own edge.
  // Drop collinear vertices and reject any remaining self-intersection.
  const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  let j=0;
  while(j<points.length&&points.length>=3){
    if(turn(points.at(j-1),points[j],points[(j+1)%points.length])===0){
      points.splice(j,1);j=Math.max(0,j-1);
    }else j++;
  }
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    for(let k=i+2;k<points.length;k++){
      if(i===0&&k===points.length-1)continue;
      const c=points[k],d=points[(k+1)%points.length];
      if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||
         Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))continue;
      if(turn(a,b,c)*turn(a,b,d)<=0&&turn(c,d,a)*turn(c,d,b)<=0)return [];
    }
  }
  const packed=[];
  for(let i=0;i<points.length;i++)packed.push(points[i][0]-(i?points[i-1][0]:0),points[i][1]-(i?points[i-1][1]:0));
  return packed;
}
export async function readFootprints(key,zones){
  const [tx,ty]=key.split('_').map(Number),signal=AbortSignal.timeout(12000);
  const tile=await archive.getZxy(15,tx,ty,signal);
  if(!tile)return null;
  const layer=new VectorTile(new Pbf(new Uint8Array(tile.data))).layers.buildings;
  const lon=(tx+.5)/world*360-180,lat=Math.atan(Math.sinh(Math.PI*(1-2*(ty+.5)/world)))/radians;
  const threshold=minimumConfidence(zones,lon,lat),rows=[];
  for(let i=0;i<(layer?.length||0);i++){
    const feature=layer.feature(i);
    if(feature.properties.confidence<threshold||feature.properties.area_in_meters<8)continue;
    const geom=feature.toGeoJSON(tx,ty,15).geometry,polygons=geom.type==='Polygon'?[geom.coordinates]:geom.coordinates;
    for(let n=0;n<polygons.length;n++){
      const polygon=polygons[n],outer=polygon[0];
      if(!outer||outer.length<4)continue;
      let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
      for(const [x,y] of outer){west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}
      const [ownerX,ownerY]=tileAt((west+east)/2,(south+north)/2);
      if(ownerX!==tx||ownerY!==ty)continue;
      const shell=packRing(outer);
      if(shell.length<6)continue;
      const rings=[shell,...polygon.slice(1).map(packRing).filter(r=>r.length>=6)];
      rows.push(['g'+feature.id+(n?'.'+n:''),'yes',0,0,rings,'']);
    }
  }
  return rows;
}

// WGS84 to UTM, used in the same zones as the original Sentinel-2 rasters.
function utm(lon,lat,zone){
  const phi=lat*radians,e2=.0066943799901413165,ep=e2/(1-e2),a=6378137;
  const sin=Math.sin(phi),cos=Math.cos(phi),tan=Math.tan(phi),t=tan*tan,c=ep*cos*cos;
  const n=a/Math.sqrt(1-e2*sin*sin),u=cos*(lon-(zone*6-183))*radians;
  const m=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*phi-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*phi)
    +(15*e2**2/256+45*e2**3/1024)*Math.sin(4*phi)-35*e2**3/3072*Math.sin(6*phi));
  return [500000+.9996*n*(u+(1-t+c)*u**3/6+(5-18*t+t*t+72*c-58*ep)*u**5/120),
    .9996*(m+n*tan*(u*u/2+(5-t+9*c+4*c*c)*u**4/24+(61-58*t+t*t+600*c-330*ep)*u**6/720))];
}
export function heightBlocks(sources,lon,lat,reach){
  const dx=reach/(111320*Math.cos(lat*radians)),dy=reach/110900,blocks=[];
  const projections=new Map();
  for(const source of sources){
    const [uri,zone,west,north,width,height,x0,y0,x1,y1]=source;
    if(x0>(lon+dx)*1e4||x1<(lon-dx)*1e4||y0>(lat+dy)*1e4||y1<(lat-dy)*1e4)continue;
    if(!projections.has(zone)){
      const center=utm(lon,lat,zone),delta=.0001,stepX=utm(lon+delta,lat,zone),stepY=utm(lon,lat+delta,zone);
      projections.set(zone,(x,y)=>[(center[0]+(stepX[0]-center[0])*(x-lon)/delta+(stepY[0]-center[0])*(y-lat)/delta),
        (center[1]+(stepX[1]-center[1])*(x-lon)/delta+(stepY[1]-center[1])*(y-lat)/delta)]);
    }
    const project=projections.get(zone);
    const corners=[project(lon-dx,lat-dy),project(lon-dx,lat+dy),project(lon+dx,lat-dy),project(lon+dx,lat+dy)];
    const tx=corners.map(p=>Math.floor((p[0]-west)/2048)),ty=corners.map(p=>Math.floor((north-p[1])/2048));
    const stem=uri.replace(/.*\/tile_/,'').replace('.tif','');
    for(let i=Math.max(0,Math.min(...tx));i<=Math.min(Math.ceil(width/2048)-1,Math.max(...tx));i++)
      for(let j=Math.max(0,Math.min(...ty));j<=Math.min(Math.ceil(height/2048)-1,Math.max(...ty));j++)
        blocks.push({key:stem+'_'+i+'_'+j,source,i,j,project});
  }
  return blocks;
}
async function range(uri,start,length){
  const path=encodeURIComponent('v1/geotiffs/'+uri);
  const url='https://storage.googleapis.com/download/storage/v1/b/open-buildings-temporal-data/o/'+path+'?alt=media';
  const res=await fetch(url,{headers:{Range:'bytes='+start+'-'+(start+length-1)},signal:AbortSignal.timeout(12000)});
  if(res.status!==206)throw Error('Height source does not support byte ranges');
  return new Uint8Array(await res.arrayBuffer());
}
const headers=new Map();
async function readOverview(source){
  // Classic little-endian tiled GeoTIFF, 32-bit float, planar DEFLATE with
  // floating-point prediction. At 4 m each 512px block spans 2,048 metres.
  const view=new DataView((await range(source[0],0,98304)).buffer);
  if(view.getUint16(0,true)!==0x4949||view.getUint16(2,true)!==42)throw Error('Unexpected temporal raster format');
  for(let ifd=view.getUint32(4,true);ifd;){
    const count=view.getUint16(ifd,true),tags=new Map();
    for(let j=0;j<count;j++){
      const pos=ifd+2+j*12,t=view.getUint16(pos,true),type=view.getUint16(pos+2,true);
      tags.set(t,type===3&&view.getUint32(pos+4,true)===1?view.getUint16(pos+8,true):view.getUint32(pos+8,true));
    }
    if(tags.get(256)===Math.ceil(source[4]/4)&&tags.get(257)===Math.ceil(source[5]/4)){
      if(tags.get(317)!==3||tags.get(284)!==2||tags.get(322)!==512||tags.get(323)!==512||tags.get(259)!==8)
        throw Error('Unexpected height block encoding');
      const across=Math.ceil(tags.get(256)/512),blocks=across*Math.ceil(tags.get(257)/512);
      return (i,j)=>{
        const index=blocks+j*across+i;
        return [view.getUint32(tags.get(324)+4*index,true),view.getUint32(tags.get(325)+4*index,true)];
      };
    }
    ifd=view.getUint32(ifd+2+count*12,true);
  }
  throw Error('4 m height overview unavailable');
}
export async function readHeightBlock(block){
  const {source,i,j}=block,uri=source[0];
  if(!headers.has(uri)){
    if(headers.size>=24)headers.delete(headers.keys().next().value);
    headers.set(uri,readOverview(source).catch(error=>{headers.delete(uri);throw error;}));
  }
  const lookup=await headers.get(uri),[offset,length]=lookup(i,j);
  if(!length)return new Uint8Array(512*512);
  const bytes=await range(uri,offset,length);
  const scan=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  if(scan.length!==512*512*4)throw Error('Incomplete height block');
  const out=new Uint8Array(512*512),num=new DataView(new ArrayBuffer(4));
  for(let y=0;y<512;y++){
    const row=y*2048;
    for(let k=1;k<2048;k++)scan[row+k]+=scan[row+k-1];
    for(let x=0;x<512;x++){
      for(let p=0;p<4;p++)num.setUint8(p,scan[row+p*512+x]);
      const metres=num.getFloat32(0,false);
      if(metres>=1.5&&metres<=100)out[y*512+x]=Math.round(metres*2);
    }
  }
  return out;
}
