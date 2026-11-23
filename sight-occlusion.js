'use strict';
// Sample visibility of the sky at the actual mesh vertices. This runs once per
// geometry, outside the render thread, including for procedurally built sights.
self.onmessage=({data:{id,positions:p,normals:n,indices}})=>{
  const count=p.length/3,size=112,map=new Float32Array(size*size);
  const a=new Float32Array(count),b=new Float32Array(count),d=new Float32Array(count);
  const occluded=new Float32Array(count),weights=new Float32Array(count);
  for(const [az,el] of [[0,1.43],[0,.57],[1.26,.67],[2.51,.53],[3.77,.67],[5.03,.53]]){
    const ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el);
    const dx=sa*ce,dy=se,dz=ca*ce;
    let left=Infinity,low=Infinity,right=-Infinity,high=-Infinity;
    for(let i=0;i<count;i++){
      const x=p[i*3],y=p[i*3+1],z=p[i*3+2];
      a[i]=x*ca-z*sa;b[i]=-x*sa*se+y*ce-z*ca*se;d[i]=x*dx+y*dy+z*dz;
      left=Math.min(left,a[i]);right=Math.max(right,a[i]);low=Math.min(low,b[i]);high=Math.max(high,b[i]);
    }
    const pixel=Math.max(.02,(right-left)/(size-3),(high-low)/(size-3));
    for(let i=0;i<count;i++){a[i]=(a[i]-left)/pixel+1;b[i]=(b[i]-low)/pixel+1;}
    map.fill(-Infinity);
    for(let k=0;k<(indices?.length??count);k+=3){
      const i=indices?indices[k]:k,j=indices?indices[k+1]:k+1,l=indices?indices[k+2]:k+2;
      const ax=a[i],ay=b[i],bx=a[j]-ax,by=b[j]-ay,cx=a[l]-ax,cy=b[l]-ay,det=bx*cy-by*cx;
      if(Math.abs(det)<.001)continue;
      const minX=Math.ceil(Math.min(ax,a[j],a[l])),maxX=Math.floor(Math.max(ax,a[j],a[l]));
      const minY=Math.ceil(Math.min(ay,b[j],b[l])),maxY=Math.floor(Math.max(ay,b[j],b[l]));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const u=((x-ax)*cy-(y-ay)*cx)/det,v=(bx*(y-ay)-by*(x-ax))/det;
        if(u<0||v<0||u+v>1)continue;
        const cell=y*size+x;map[cell]=Math.max(map[cell],d[i]+u*(d[j]-d[i])+v*(d[l]-d[i]));
      }
    }
    for(let i=0;i<count;i++){
      const facing=n[i*3]*dx+n[i*3+1]*dy+n[i*3+2]*dz;
      if(facing<.12)continue;
      const gap=map[Math.round(b[i])*size+Math.round(a[i])]-d[i];
      const blocked=Math.min(1,Math.max(0,(gap-pixel*.83/facing)/Math.max(.2,pixel*1.5)));
      occluded[i]+=facing*blocked;weights[i]+=facing;
    }
  }
  const light=Uint8Array.from(occluded,(v,i)=>Math.round(255*(weights[i]?1-.37*v/weights[i]:.83)));
  self.postMessage({id,light},[light.buffer]);
};
