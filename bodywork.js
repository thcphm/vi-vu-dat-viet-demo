'use strict';
// Only damaged body panels get private vertex buffers. Shared showroom assets stay reusable.
function updateBodywork(T,root,mark,heading) {
  if(!root||root.userData.impactMark===mark)return;
  root.userData.impactMark=mark;
  const world=new T.Vector3(),center=new T.Vector3(),delta=new T.Vector3(),inverse=new T.Matrix4();
  root.updateWorldMatrix(true,true);root.getWorldPosition(center);
  const sin=Math.sin(heading),cos=Math.cos(heading);
  root.traverse(panel=>{
    if(!panel.isMesh||!panel.geometry?.attributes.position)return;
    const original=panel.userData.undamaged;
    if(original){panel.geometry.dispose();panel.geometry=original;delete panel.userData.undamaged;}
    if(!mark||!/^(?:paint(?:_|$)|.*_body\d*$|bumper|bonnet|hood)/i.test(panel.material?.name||''))return;
    const geometry=panel.geometry,points=geometry.attributes.position;
    const nX=mark.side*cos+mark.front*sin,nZ=mark.side*sin-mark.front*cos;
    const reach=Math.min(.86/Math.max(.01,Math.abs(mark.side)),1.89/Math.max(.01,Math.abs(mark.front)));
    const px=center.x+nX*reach,pz=center.z+nZ*reach;
    inverse.copy(panel.matrixWorld).invert();
    let modified;
    for(let i=0;i<points.count;i++){
      world.fromBufferAttribute(points,i).applyMatrix4(panel.matrixWorld);
      const radius=((world.x-px)**2+(world.z-pz)**2)/1.14+(world.y-center.y-.59)**2/.51;
      if(radius>=1)continue;
      modified??=geometry.clone();
      const depth=(1-radius)**2*(.09+mark.strength*.24);
      delta.set(world.x-nX*depth,world.y-depth*.13,world.z-nZ*depth).applyMatrix4(inverse);
      modified.attributes.position.setXYZ(i,delta.x,delta.y,delta.z);
    }
    if(modified){modified.computeVertexNormals();modified.computeBoundingSphere();panel.userData.undamaged=geometry;panel.geometry=modified;}
  });
}
