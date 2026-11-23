'use strict';
// All offsets are metres east/south of the Atlas pin. Only offer a shoreline
// or downhill view when the terrain used by the current renderer supports it.
function landscapeTourViews(kind,x,z,yaw,ground,waterAt){
  const shore=['Hồ','Bãi biển','Vịnh'].includes(kind);
  if(!shore&&!['Đỉnh núi','Điểm ngắm cảnh','Đèo'].includes(kind))return null;
  const wet=(u,v)=>!!waterAt(x+u,z+v);
  const startWet=shore&&wet(0,0),altitude=ground(x,z);
  let best=null;
  for(let i=0;i<16;i++){
    const angle=yaw+i*Math.PI/8,dx=Math.sin(angle),dz=Math.cos(angle);
    if(shore){
      let near=0,far=0;
      for(const step of [5,12,22,36,56,82,114,150,190]){
        if(wet(dx*step,dz*step)!==startWet){far=step;break;}
        near=step;
      }
      if(!far)continue;
      for(let j=0;j<5;j++){
        const mid=(near+far)/2;
        if(wet(dx*mid,dz*mid)===startWet)near=mid;else far=mid;
      }
      const edge=(near+far)/2,inward=startWet?-1:1;
      const land=edge-8*inward,water=edge+26*inward;
      if(wet(dx*land,dz*land)||!wet(dx*water,dz*water)||!wet(dx*(edge+13*inward),dz*(edge+13*inward)))continue;
      const towardLand=angle+(startWet?0:Math.PI),score=-edge+4*Math.cos(towardLand-yaw);
      if(best&&best.score>=score)continue;
      const level=waterAt(x+dx*water,z+dz*water)?.level;
      const focus=(level??ground(x+dx*water,z+dz*water))+.75;
      const rise=Math.max(3.8,ground(x+dx*land,z+dz*land)+2.6-focus);
      best={score,views:[
        {name:'Nhìn từ bờ ra mặt nước',offset:[dx*water,dz*water],height:1.7,focusAltitude:focus,
          viewRadius:Math.hypot(34,rise),viewAngle:towardLand,viewElevation:Math.atan2(rise,34)},
        {name:'Đường bờ và mặt nước',offset:[dx*edge,dz*edge],height:3,
          viewRadius:105,viewAngle:towardLand+.69,viewElevation:.50}
      ]};
    }else{
      const run=116,drop=altitude-ground(x+run*dx,z+run*dz);
      if(drop<13)continue;
      const eye=altitude+3.7,target=altitude-drop+2;
      let clearance=Infinity;
      for(const t of [.16,.32,.48,.64,.80]){
        clearance=Math.min(clearance,eye+(target-eye)*t-ground(x+run*t*dx,z+run*t*dz));
      }
      if(clearance<.8)continue;
      const score=drop+Math.min(9,clearance)*.5;
      if(best&&score<=best.score)continue;
      const compass=['nam','đông nam','đông','đông bắc','bắc','tây bắc','tây','tây nam'];
      const direction=compass[(Math.round(angle/(Math.PI/4))%8+8)%8];
      best={score,views:[
        {name:'Theo sườn dốc về phía '+direction,offset:[run*dx,run*dz],height:2/.46,focusAltitude:target,
          viewRadius:Math.hypot(run,eye-target),viewAngle:angle+Math.PI,viewElevation:Math.atan2(eye-target,run)},
        {name:'Toàn cảnh sườn núi',offset:[0,0],height:3,viewRadius:144,viewAngle:angle,viewElevation:.40}
      ]};
    }
  }
  return best?.views||null;
}
