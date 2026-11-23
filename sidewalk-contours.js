'use strict';

// Trace the outside of the whole carriageway with a disc. Its contacts with
// straight streets are straight, and at an inside corner it rolls from one
// tangent to the next. Both sides of a T junction follow the same outline.
function sidewalkRings(segments){
  const radius=2.4,full=Math.PI*2,polygons=[],nodes=new Map();
  const scale=1000,point=(x,z)=>({X:Math.round(x*scale),Y:Math.round(z*scale)});
  for(const s of segments){
    const r=s.w+radius,nx=s.nx*r,nz=s.nz*r;
    polygons.push([point(s.ax+nx,s.az+nz),point(s.ax-nx,s.az-nz),
      point(s.bx-nx,s.bz-nz),point(s.bx+nx,s.bz+nz)]);
    for(const [x,z] of [[s.ax,s.az],[s.bx,s.bz]]){
      const key=x+','+z;
      let node=nodes.get(key);
      if(!node||r>node.r){node={x,z,r,angles:[]};nodes.set(key,node);}
      if(r===node.r){
        const a=Math.atan2(s.nz,s.nx);
        node.angles.push((a+full)%full,(a+Math.PI+full)%full);
      }
    }
  }
  // Circumscribed caps contain the road's end cap even after the radius is
  // subtracted. A tangent parallel to each attached street avoids little steps.
  for(const {x,z,r,angles} of nodes.values()){
    for(let i=0;i<24;i++)angles.push(full*i/24);
    angles.sort((a,b)=>a-b);
    const cap=[];
    for(let i=0;i<angles.length;i++){
      const a=angles[i],b=angles[i+1]??angles[0]+full;
      if(b-a<1e-7)continue;
      const mid=(a+b)/2,d=r/Math.cos((b-a)/2);
      cap.push(point(x+d*Math.cos(mid),z+d*Math.sin(mid)));
    }
    polygons.push(cap);
  }
  if(!polygons.length)return [];
  // Each ring has the roadway on its left, including rings around city blocks.
  const clipper=new ClipperLib.Clipper(),rings=[];
  clipper.AddPaths(polygons,ClipperLib.PolyType.ptSubject,true);
  clipper.Execute(ClipperLib.ClipType.ctUnion,rings,ClipperLib.PolyFillType.pftNonZero,ClipperLib.PolyFillType.pftNonZero);
  return rings;
}
function* traceSidewalkSteps(segments,nearby,emit,fill,worker){
  const radius=2.4,full=Math.PI*2,scale=1000;
  let rings;
  if(worker&&segments.size){
    const task=worker(segments);yield task;
    rings=task.rings;
  }
  rings??=sidewalkRings(segments);
  function owner(x,z){
    let nearest=null,gap=Infinity;
    for(const s of nearby(x,z)){
      const along=Math.max(0,Math.min(s.len,(x-s.ax)*s.fx+(z-s.az)*s.fz));
      const d=Math.hypot(x-s.ax-along*s.fx,z-s.az-along*s.fz)-s.w;
      if(d<gap){nearest=s;gap=d;}
    }
    return nearest;
  }
  for(const outline of rings){
    yield;
    const ring=ClipperLib.Clipper.CleanPolygon(outline,2);
    const edges=[];
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length];
      const x=a.X/scale,z=a.Y/scale,dx=(b.X-a.X)/scale,dz=(b.Y-a.Y)/scale,length=Math.hypot(dx,dz);
      if(!length)continue;
      const nx=-dz/length,nz=dx/length;
      // A union can dissolve collinear vertices across a change of road type.
      const count=Math.max(1,Math.ceil(length/12));
      for(let j=0;j<count;j++){
        const t=(j+.5)/count;
        edges.push({x:x+dx*j/count,z:z+dz*j/count,nx,nz,s:owner(x+dx*t,z+dz*t)});
      }
    }
    const sections=[];
    function section(x,z,nx,nz,width,s){
      const row={x:x+radius*nx,z:z+radius*nz,nx:-nx,nz:-nz,width,s};
      sections.push(row);
    }
    for(let i=0;i<edges.length;i++){
      const e=edges[i],p=edges[(i+edges.length-1)%edges.length];
      const before=p.s?.walkWidth||0,after=e.s?.walkWidth||0;
      const width=before&&after?(before+after)/2:before||after;
      const dot=p.nx*e.nx+p.nz*e.nz,cross=p.nx*e.nz-p.nz*e.nx;
      const turn=Math.atan2(cross,dot);
      if(turn<-.012&&(before||after)){
        const start=Math.atan2(p.nz,p.nx),steps=Math.ceil(-turn/(Math.PI/18));
        for(let j=0;j<=steps;j++){
          const angle=start+turn*j/steps;
          // Keep the return on the paved approach when a branch has no walk.
          const side=j===steps?e.s:(j<steps/2?p.s:e.s);
          section(e.x,e.z,Math.cos(angle),Math.sin(angle),width,
            j<steps&&!side?.walkWidth?(before?p.s:e.s):side);
        }
      }else{
        const divisor=1+dot;
        if(divisor<1e-7){section(e.x,e.z,e.nx,e.nz,width,e.s);continue;}
        section(e.x,e.z,(p.nx+e.nx)/divisor,(p.nz+e.nz)/divisor,width,e.s);
      }
    }
    function centre(s,p){
      const t=Math.max(0,Math.min(s.len,(p.x-s.ax)*s.fx+(p.z-s.az)*s.fz));
      return [s.ax+t*s.fx,s.az+t*s.fz];
    }
    for(let i=0;i<sections.length;i++){
      if((i & 31)===0)yield;
      const a=sections[i],b=sections[(i+1)%sections.length];
      if(!a.s?.walkWidth)continue;
      const prev=sections[(i+sections.length-1)%sections.length];
      emit(a,b,!prev.s?.walkWidth,!b.s?.walkWidth);
      // Lay road material up to the kerb around a return. The straight runs
      // already sit on the rendered carriageway.
      const ca=centre(a.s,a),cb=centre(a.s,b),pa=[a.x,a.z],pb=[b.x,b.z];
      const atCap=p=>(p.x-a.s.ax)*a.s.fx+(p.z-a.s.az)*a.s.fz;
      if(Math.min(atCap(a),atCap(b))<=0||Math.max(atCap(a),atCap(b))>=a.s.len||
        Math.max(Math.hypot(a.x-ca[0],a.z-ca[1]),Math.hypot(b.x-cb[0],b.z-cb[1]))>a.s.w+.002){
        fill(a.s,pa,pb,ca);fill(a.s,ca,pb,cb);
      }
      if(prev.s&&prev.s!==a.s)fill(a.s,pa,ca,centre(prev.s,a));
    }
  }
}

function traceSidewalks(...args){for(const step of traceSidewalkSteps(...args)){}}
