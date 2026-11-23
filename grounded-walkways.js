'use strict';
// The tops share the ground triangulation used by the road. The vertical faces
// extend into the bank, including on the downhill side of a raised road.
function createGroundedWalkways(T,{cx,cz,step,height,ground,wet,needsDetail}){
  const tops=[],coping=[],frontages=[],faces=[],cells=new Map();
  const cell=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16);
  function face(ax,az,bx,bz,lift){
    const dx=bx-ax,dz=bz-az,breaks=[0,1];
    for(const [start,delta] of [[cx+ax,dx],[cz+az,dz],[cx+cz+ax+az,dx+dz]]){
      if(Math.abs(delta)<.0001)continue;
      const end=start+delta;
      for(let v=(Math.floor(Math.min(start,end)/step)+1)*step;v<Math.max(start,end);v+=step)breaks.push((v-start)/delta);
    }
    breaks.sort((a,b)=>a-b);
    let x=ax,z=az,h=height(x,z)+lift,low=Math.min(h-.15,ground(x,z)-.20);
    for(let i=1;i<breaks.length;i++){
      if(breaks[i]-breaks[i-1]<.000001)continue;
      const u=ax+dx*breaks[i],v=az+dz*breaks[i],high=height(u,v)+lift,bottom=Math.min(high-.15,ground(u,v)-.20);
      faces.push(x,h,z,u,high,v,u,bottom,v,x,h,z,u,bottom,v,x,low,z);
      x=u;z=v;h=high;low=bottom;
    }
  }
  // Use the same triangles for tyre contact and rendering, including the
  // tapered slabs where two streets with different widths meet.
  function slab(target,lift,a,b,c){
    const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(Math.abs(area)<1e-8)return;
    if(area>0)[b,c]=[c,b];
    target.push(...a,...b,...c);
    const tri={a,b,c,lift};
    for(let col=Math.floor(Math.min(a[0],b[0],c[0])/16);col<=Math.floor(Math.max(a[0],b[0],c[0])/16);col++){
      for(let row=Math.floor(Math.min(a[1],b[1],c[1])/16);row<=Math.floor(Math.max(a[1],b[1],c[1])/16);row++){
        const key=col+','+row;
        if(!cells.has(key))cells.set(key,[]);
        cells.get(key).push(tri);
      }
    }
  }
  function band(target,lift,a,b,c,d){
    slab(target,lift,a,b,c);slab(target,lift,c,b,d);
  }
  function sidewalk(a,b,capStart,capEnd){
    const row=p=>[[p.x,p.z],[p.x+.16*p.nx,p.z+.16*p.nz],[p.x+p.width*p.nx,p.z+p.width*p.nz]];
    const start=row(a),end=row(b);
    const mix=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
    const at=t=>start.map((p,i)=>mix(p,end[i],t));
    const centre=r=>mix(r[0],r[2],.5);
    const cap=r=>{face(...r[0],...r[1],.12);face(...r[1],...r[2],.108);};
    const fine=needsDetail(Math.min(a.x,b.x)-3,Math.min(a.z,b.z)-3,Math.max(a.x,b.x)+3,Math.max(a.z,b.z)+3);
    const count=fine?Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3)):1;
    let left=start;
    for(let i=1;i<=count;i++){
      const right=i===count?end:at(i/count);
      let p=left,q=right;
      left=right;
      const dryP=!wet(...centre(p)),dryQ=!wet(...centre(q));
      if(!dryP&&!dryQ)continue;
      if(dryP!==dryQ){
        let lo=(i-1)/count,hi=i/count;
        for(let k=0;k<8;k++){
          const t=(lo+hi)/2;
          const dry=!wet(...centre(at(t)));
          if(dry===dryP)lo=t;else hi=t;
        }
        const shore=at((lo+hi)/2);
        if(dryP)q=shore;else p=shore;
        cap(shore);
      }
      band(coping,.12,p[0],p[1],q[0],q[1]);band(tops,.108,p[1],p[2],q[1],q[2]);
      face(...p[0],...q[0],.12);face(...p[1],...q[1],.12);face(...p[2],...q[2],.108);
      if(i===1&&capStart&&dryP)cap(p);
      if(i===count&&capEnd&&dryQ)cap(q);
    }
  }
  function porch(s,x,z,width){
    const p=(u,v)=>[x+s.fx*u+s.nx*v,z+s.fz*u+s.nz*v];
    const a=p(-width/2,-1.35),b=p(-width/2,1.35),c=p(width/2,-1.35),d=p(width/2,1.35);
    band(frontages,.105,a,b,c,d);
    face(...a,...b,.105);face(...b,...d,.105);face(...d,...c,.105);face(...c,...a,.105);
  }
  function* buildSteps(group,surface,pavers,stone){
    yield* surface(tops,pavers,.108,1);
    yield* surface(coping,stone,.12,1);
    yield* surface(frontages,pavers,.105,1);
    tops.length=coping.length=frontages.length=0;
    if(!faces.length)return;
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(faces,3));setFlatNormals(T,geometry);
    faces.length=0;
    const mesh=new T.Mesh(geometry,stone);mesh.name='Curb and pavement edges';mesh.receiveShadow=true;group.add(mesh);
  }
  function liftAt(x,z){
    let lift=0;
    const inside=(p,q)=>(q[0]-p[0])*(z-p[1])-(q[1]-p[1])*(x-p[0])<=1e-8;
    for(const {a,b,c,lift:h} of cells.get(cell(x,z))||[]){
      if(inside(a,b)&&inside(b,c)&&inside(c,a))lift=Math.max(lift,h);
    }
    return lift;
  }
  function build(group,surface,pavers,stone){
    function* immediate(...args){surface(...args);}
    for(const step of buildSteps(group,immediate,pavers,stone)){}
  }
  return {sidewalk,porch,build,buildSteps,liftAt};
}
