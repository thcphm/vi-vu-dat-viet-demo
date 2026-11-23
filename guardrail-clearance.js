'use strict';

// Road footprints are capsules. Test the whole proposed beam, including its
// ends, against each nearby carriageway (metres in the same local frame).
function guardrailFits(ax,az,bx,bz,roads,margin,own,atLevel){
  const dx=bx-ax,dz=bz-az,length2=dx*dx+dz*dz;
  for(const r of roads){
    if(r===own)continue;
    const au=(ax-r.ax)*r.fx+(az-r.az)*r.fz,av=(az-r.az)*r.fx-(ax-r.ax)*r.fz;
    const bu=au+dx*r.fx+dz*r.fz,bv=av+dz*r.fx-dx*r.fz;
    const limit=(r.w+margin)**2;
    // Only overlapping footprints need a height lookup. The callback receives
    // metres along the other road and a fraction along the proposed beam.
    if(av*bv<0){
      const t=av/(av-bv),u=au+(bu-au)*t;
      if(u>=0&&u<=r.len&&(!atLevel||atLevel(r,u,t)))return false;
    }
    const a=Math.max(0,Math.min(r.len,au)),b=Math.max(0,Math.min(r.len,bu));
    if((au-a)**2+av*av<limit&&(!atLevel||atLevel(r,a,0)))return false;
    if((bu-b)**2+bv*bv<limit&&(!atLevel||atLevel(r,b,1)))return false;
    function endOverlaps(x,z,u){
      const t=length2?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/length2)):0;
      return (x-ax-dx*t)**2+(z-az-dz*t)**2<limit&&(!atLevel||atLevel(r,u,t));
    }
    if(endOverlaps(r.ax,r.az,0)||endOverlaps(r.bx,r.bz,r.len))return false;
  }
  return true;
}
