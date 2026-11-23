'use strict';

// Bent leaves share one small mesh. Vertex colours keep the roots in shade
// while the thinner tips pick up light from the sky.
function createVergeGrass(T,blades=21){
  const verts=[], colours=[], bottom=new T.Color(0x56643a), tip=new T.Color(0xaba65e);
  for(let i=0;i<blades;i++){
    const a=i*2.39996, spread=.53*Math.sqrt(i/blades), dx=Math.cos(a), dz=Math.sin(a);
    const x=dx*spread,z=dz*spread,h=.32+.38*(.5+.5*Math.sin(7.1*i+1.7));
    const w=.012+.006*(i%4),lean=.21+.21*spread;
    const l=[x-dz*w,0,z+dx*w],r=[x+dz*w,0,z-dx*w];
    const m=[x+dx*lean*.36,h*.64,z+dz*lean*.36],end=[x+dx*lean,h,z+dz*lean];
    const ml=[m[0]-dz*w*.56,m[1],m[2]+dx*w*.56];
    const mr=[m[0]+dz*w*.56,m[1],m[2]-dx*w*.56];
    for(const p of [l,r,ml,r,mr,ml,ml,mr,end]){
      verts.push(...p);
      const f=.12+.88*p[1]/h;
      colours.push(bottom.r+(tip.r-bottom.r)*f,bottom.g+(tip.g-bottom.g)*f,bottom.b+(tip.b-bottom.b)*f);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));
  geometry.computeVertexNormals();
  return geometry;
}

function scatterVergeGrass(segments, reach, clear, plant){
  for(const s of segments){
    if(s.rank>reach||s.authoredPavement||s.graded||s.len<7)continue;
    let seed=s.seed;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(const sign of [-1,1]){
      for(let d=2+random()*5;d<s.len-1;d+=4+random()*7){
        const beyond=s.w+1.05+random()**2*5;
        const x=s.ax+s.fx*d+sign*s.nx*beyond,z=s.az+s.fz*d+sign*s.nz*beyond;
        const size=.40+random()*.65,angle=random()*Math.PI*2;
        if(x*x+z*z>reach*reach||!clear(x,z))continue;
        for(let i=-1;i<=1;i++){
          const px=x+s.fx*i*.7,pz=z+s.fz*i*.7;
          plant(px,pz,size*(1-.24*Math.abs(i)),angle+i*1.75);
        }
      }
    }
  }
}
