'use strict';
// Packed files are gzip streams, just like the original JSON tiles. After
// decompression this signature distinguishes the columnar road graph from
// JSON, including when the HTTP layer already removed the gzip envelope.
globalThis.RoadTileCodec=(()=>{
  const utf8=new TextDecoder();
  const labelUTF8=new TextDecoder('utf-8',{ignoreBOM:true});
  function packed(bytes){
    return bytes[0]===86&&bytes[1]===82&&bytes[2]===68&&bytes[3]===49; // VRD1
  }
  function decode(bytes){
    if(bytes instanceof ArrayBuffer)bytes=new Uint8Array(bytes);
    if(!packed(bytes))return JSON.parse(utf8.decode(bytes));
    let at=4;
    function uint(){
      let n=0,scale=1;
      while(at<bytes.length){
        const b=bytes[at++];n+=(b&127)*scale;
        if(!Number.isSafeInteger(n))throw Error('Invalid road tile integer.');
        if(b<128)return n;
        scale*=128;
      }
      throw Error('Incomplete road tile.');
    }
    function signed(){const v=uint();return v%2===1?-(v+1)/2:v/2;}
    function count(){
      const n=uint();
      if(n>bytes.length-at)throw Error('Invalid road tile count.');
      return n;
    }
    function strings(){
      const n=count(),out=new Array(n);
      for(let i=0;i<n;i++){
        const len=count();out[i]=labelUTF8.decode(bytes.subarray(at,at+len));at+=len;
      }
      return out;
    }
    const edges=count(),nodes=count(),names=strings(),kinds=strings();
    const ids=new Float64Array(nodes),xs=new Int32Array(nodes),ys=new Int32Array(nodes);
    for(const column of [ids,xs,ys]){
      let previous=0;
      for(let i=0;i<nodes;i++){previous+=signed();column[i]=previous;}
    }
    const rows=new Array(edges),starts=new Int32Array(edges),ends=new Int32Array(edges);
    let edgeId=0;
    for(let i=0;i<edges;i++){edgeId+=signed();rows[i]=[edgeId,0,0,'','',0,null];}
    for(let i=0;i<edges;i++)starts[i]=signed();
    let previousEnd=0;
    for(let i=0;i<edges;i++){
      const a=starts[i]+previousEnd,b=a+signed();previousEnd=b;
      if(a<0||b<0||a>=nodes||b>=nodes)throw Error('Unknown road tile node.');
      starts[i]=a;ends[i]=b;rows[i][1]=ids[a];rows[i][2]=ids[b];
    }
    for(const [field,dict] of [[3,names],[4,kinds]]){
      for(let i=0;i<edges;i++){
        const k=uint();if(k>=dict.length)throw Error('Unknown road tile label.');
        rows[i][field]=dict[k];
      }
    }
    for(let i=0;i<edges;i++){
      const shape=uint(),inner=Math.floor(shape/2);
      if(inner>bytes.length-at)throw Error('Invalid road tile shape.');
      const coords=new Array(4+2*inner),a=starts[i],b=ends[i];
      coords[0]=xs[a];coords[1]=ys[a];coords[coords.length-2]=xs[b];coords[coords.length-1]=ys[b];
      rows[i][5]=shape%2;rows[i][6]=coords;
    }
    for(let axis=0;axis<2;axis++)for(const row of rows){
      const c=row[6];
      for(let j=axis+2;j<c.length-2;j+=2)c[j]=c[j-2]+signed();
    }
    if(at!==bytes.length)throw Error('Unexpected road tile trailing data.');
    return rows;
  }
  async function content(response){
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes[0]!==31||bytes[1]!==139)return bytes;
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function tileURL(base,key){
    return base+key+'.gz'+(base==='vn-roads/'?'?format=packed':'');
  }
  function roadRows(index){
    const extra=new Set(index.sightAccess?.tiles),only=new Set(index.sightAccess?.only);
    return async(key,base,read)=>{
      if(!extra.has(key))return read(tileURL(base,key));
      const [roads,access]=await Promise.all([only.has(key)?[]:read(tileURL(base,key)),read('vn-access/'+key+'.gz')]);
      return roads.concat(access);
    };
  }
  function routeCosts(bytes){
    if(bytes.length%4===0)return new Int32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);
    if(bytes.length%4!==1||bytes[0]!==86||bytes[1]!==82||bytes[2]!==67||bytes[3]!==49||bytes[4]!==0)
      throw Error('Invalid route cost matrix.');
    const count=(bytes.length-5)/4,values=new Int32Array(count);
    let value=0;
    for(let i=0;i<count;i++){
      const p=5+i;
      const delta=bytes[p]|(bytes[p+count]<<8)|(bytes[p+2*count]<<16)|(bytes[p+3*count]<<24);
      value=(value+delta)|0;
      values[i]=value;
    }
    return values;
  }
  return {packed,decode,content,tileURL,roadRows,routeCosts};
})();
