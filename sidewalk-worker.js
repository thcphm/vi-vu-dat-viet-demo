'use strict';
importScripts('clipper.min.js','sidewalk-contours.js');
self.onmessage=({data:{id,rows}})=>{
  const segments=[];
  for(let i=0;i<rows.length;i+=7){
    segments.push({ax:rows[i],az:rows[i+1],bx:rows[i+2],bz:rows[i+3],w:rows[i+4],nx:rows[i+5],nz:rows[i+6]});
  }
  self.postMessage({id,rings:sidewalkRings(segments)});
};
