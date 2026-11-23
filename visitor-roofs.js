'use strict';
// Clip each mapped roof triangle to its pitch planes. This keeps recessed wings,
// courtyard holes and side aisles even on footprints with more than four corners.
function buildVisitorRoof(T,rings,shape,h,rise,roofColor,wallColor,draw,temple,detail={},bottom=0){
  const outer=rings[0],origin=outer[0];
  let longest=0,ux=1,uz=0;
  outer.forEach((a,i)=>{
    const b=outer[(i+1)%outer.length],d=a.distanceTo(b);
    if(d>longest){longest=d;ux=(b.x-a.x)/d;uz=(b.y-a.y)/d;}
  });
  const direction=detail?.['roof:direction'],bearing=parseFloat(direction);
  if(Number.isFinite(bearing)){ux=Math.cos(bearing*Math.PI/180);uz=Math.sin(bearing*Math.PI/180);}
  const project=p=>[(p.x-origin.x)*ux+(p.y-origin.y)*uz,(p.y-origin.y)*ux-(p.x-origin.x)*uz];
  const points=rings.flat().map(project);
  let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
  for(const [u,v] of points){u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
  // The longest straight edge occasionally belongs to the gable end.
  if(!Number.isFinite(bearing)&&((u1-u0<v1-v0)!==(detail?.['roof:orientation']==='across'))){
    [ux,uz]=[-uz,ux];[u0,u1,v0,v1]=[v0,v1,-u1,-u0];
    for(const p of points)[p[0],p[1]]=[p[1],-p[0]];
  }
  const width=v1-v0,length=u1-u0;
  if(width<1||length<1)return false;
  const hip=['hipped','hipped-and-gabled','side_hipped','pyramidal','mansard'].includes(shape);
  const hipLength=shape==='pyramidal'?length/2:Math.min(length*.38,width*.5);
  const lift=Math.min(h-bottom,h*.68,Number.isFinite(rise)&&rise>0?rise:Math.max(.7,Math.min(temple?5.5:4.6,width*(temple?.32:.36))));
  const eave=h-lift;
  const ridge=shape==='saltbox'?.36:.5;
  let planes=[([,v])=>(v-v0)/(width*ridge),([,v])=>(v1-v)/(width*(1-ridge))];
  if(shape==='skillion')planes=[([,v])=>(v-v0)/width];
  if(shape==='round'){
    const y=t=>Math.sqrt(Math.max(0,1-(2*t-1)**2));
    planes=Array.from({length:10},(_,i)=>{
      const a=(1-Math.cos(Math.PI*i/10))/2,b=(1-Math.cos(Math.PI*(i+1)/10))/2;
      const slope=(y(b)-y(a))/(b-a);
      return ([,v])=>y(a)+slope*((v-v0)/width-a);
    });
  }
  if(hip)planes.push(([u])=>(u-u0)/hipLength,([u])=>(u1-u)/hipLength);
  if(shape==='mansard')planes=planes.flatMap(f=>[p=>2.25*f(p),p=>.78+.22*f(p)]);
  function clip(poly,dist){
    const out=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],da=dist(a),db=dist(b);
      if(da>=0)out.push(a);
      if((da>0&&db<0)||(da<0&&db>0)){
        const k=da/(da-db);out.push([a[0]+k*(b[0]-a[0]),a[1]+k*(b[1]-a[1])]);
      }
    }
    return out;
  }
  function xyz([u,v],y){return [origin.x+ux*u-uz*v,y,origin.y+uz*u+ux*v];}
  if((shape==='dome'||shape==='onion')&&rings.length===1){
    const center=[(u0+u1)/2,(v0+v1)/2];
    for(let j=0;j<12;j++){
      function arc(p,level){
        const t=level/12,rad=shape==='dome'?Math.cos(Math.PI*t/2):Math.max(0,1-t+.30*Math.sin(2*Math.PI*t)*(1-t));
        return xyz([center[0]+(p[0]-center[0])*rad,center[1]+(p[1]-center[1])*rad],
          eave+lift*(shape==='dome'?Math.sin(t*Math.PI/2):t));
      }
      for(let i=0;i<points.length;i++){
        const p=points[i],q=points[(i+1)%points.length];
        for(const [v,k] of [[p,j],[q,j],[p,j+1],[q,j],[q,j+1],[p,j+1]])draw(arc(v,k),v,roofColor,false);
      }
    }
    return eave;
  }
  const heights=p=>eave+lift*Math.max(0,Math.min(...planes.map(f=>f(p))));
  const tint=temple?roofColor.clone().multiplyScalar(.88):roofColor;
  for(const tri of T.ShapeUtils.triangulateShape(outer,rings.slice(1))){
    for(const plane of planes){
      let poly=tri.map(i=>points[i]);
      for(const other of planes)if(other!==plane&&poly.length)poly=clip(poly,p=>other(p)-plane(p));
      for(let i=1;i+1<poly.length;i++)
        for(const p of [poly[0],poly[i+1],poly[i]])draw(xyz(p,eave+lift*plane(p)),p,roofColor,true);
    }
  }
  // Close the gable and all cut edges around internal courtyards. Split where
  // a ridge or a hip crosses the wall so the infill follows the pitches exactly.
  for(const ring of rings)ring.forEach((a,i)=>{
    const p=project(a),q=project(ring[(i+1)%ring.length]),ts=[0,1];
    for(let j=0;j<planes.length;j++)for(let k=j+1;k<planes.length;k++){
      const d=planes[j](p)-planes[k](p),e=planes[j](q)-planes[k](q);
      if(d*e<0)ts.push(d/(d-e));
    }
    ts.sort((a,b)=>a-b);
    const at=t=>[p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])];
    for(let j=1;j<ts.length;j++){
      const l=at(ts[j-1]),r=at(ts[j]),lh=heights(l),rh=heights(r);
      if(Math.max(lh,rh)-eave<.005)continue;
      for(const [pos,y] of [[l,eave],[r,eave],[l,lh],[r,eave],[r,rh],[l,lh]])
        draw(xyz(pos,y),pos,wallColor,false);
    }
    // A visible fascia and projecting lip along the actual eave outline.
    if(temple&&Math.abs(heights(p)-eave)<.06&&Math.abs(heights(q)-eave)<.06){
      const dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz);
      if(len<.1)return;
      const s=T.ShapeUtils.isClockWise(ring)=== (ring===outer)?1:-1,over=Math.min(.68,width*.045);
      const l=[p[0]-s*dz/len*over,p[1]+s*dx/len*over],r=[q[0]-s*dz/len*over,q[1]+s*dx/len*over];
      for(const v of [p,q,l,q,r,l])draw(xyz(v,v===p||v===q?eave+.03:eave-.12),v,roofColor,true);
      for(const [v,y] of [[l,-.12],[r,-.12],[l,-.26],[r,-.12],[r,-.26],[l,-.26]])
        draw(xyz(v,eave+y),v,tint,false);
    }
  });
  return eave;
}
