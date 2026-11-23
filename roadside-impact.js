'use strict';

// The geometry stays batched. Only the instance slots touched by a collision move.
function createRoadsideImpact(T,scene,ground=()=>0){
  const objects=new Map(),swings=new Map(),leaves=[],scuffs=[];
  const pivot=new T.Matrix4(),shift=new T.Matrix4(),matrix=new T.Matrix4();
  const axis=new T.Vector3(),dummy=new T.Object3D(),tint=new T.Color();
  let ox=0,oz=0;

  const leaf=new T.BufferGeometry();
  leaf.setAttribute('position',new T.Float32BufferAttribute([
    0,0,-.6, -.21,0,-.14, 0,.07,.13, .2,0,.07, 0,-.02,.65
  ],3));
  leaf.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);leaf.computeVertexNormals();
  const foliage=new T.InstancedMesh(leaf,new T.MeshLambertMaterial({side:T.DoubleSide}),72);
  foliage.count=0;foliage.visible=false;foliage.frustumCulled=false;foliage.name='Lá rụng do va chạm';scene.add(foliage);

  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=96;
  const g=canvas.getContext('2d');
  // A chipped patch of plaster with rubber transfer near bumper height.
  for(let i=0;i<280;i++){
    const theta=Math.random()*Math.PI*2,r=Math.sqrt(Math.random());
    const x=96+78*r*Math.cos(theta),y=48+22*r*Math.sin(theta)+.065*(x-96);
    g.fillStyle=i%3===0?'#d6c4aa':'#514e48';g.globalAlpha=(1-r*.65)*(.35+Math.random()*.55);
    g.fillRect(x,y,2+Math.random()*12,.8+Math.random()*5);
  }
  const stain=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  stain.map.colorSpace=T.SRGBColorSpace;
  const stainPlane=new T.PlaneGeometry();

  function reset(){
    for(const s of scuffs){scene.remove(s.mesh);s.mesh.material.dispose();}
    scuffs.length=leaves.length=0;
    foliage.count=0;foliage.visible=false;
    for(const [id] of swings)rotate(objects.get(id),0,0,0);
    swings.clear();
  }
  function rebase(x,z){
    ox=x;oz=z;objects.clear();
  }
  function register(o){
    objects.set(o.id,o);
  }
  function rotate(o,nx,nz,angle){
    if(!o)return;
    if(angle){
      axis.set(nz,0,-nx);pivot.makeRotationAxis(axis,angle);
      pivot.premultiply(shift.makeTranslation(o.x,ground(ox+o.x,oz+o.z),o.z));
      pivot.multiply(shift.makeTranslation(-o.x,-ground(ox+o.x,oz+o.z),-o.z));
    }
    for(const part of o.parts){
      const attr=part.mesh.instanceMatrix;
      part.mesh.setMatrixAt(part.index,angle?matrix.multiplyMatrices(pivot,part.rest):part.rest);
      attr.addUpdateRange(part.index*16,16);attr.needsUpdate=true;
    }
  }
  function react(hit,x,z,strength){
    const o=objects.get(hit.id);
    const s=Math.min(1,Math.max(0,strength)),dx=-hit.nx,dz=-hit.nz;
    if(hit.kind==='building'){
      if(scuffs.length===10){const old=scuffs.shift();scene.remove(old.mesh);old.mesh.material.dispose();}
      const mesh=new T.Mesh(stainPlane,stain.clone());
      mesh.name='Tróc lớp trát';mesh.rotation.y=Math.atan2(hit.nx,hit.nz);
      mesh.scale.set(.4+s*1.7,.22+s*.68,1);scene.add(mesh);
      scuffs.push({mesh,x:x+hit.nx*.045,z:z+hit.nz*.045,ttl:6+s*8});
      mesh.position.set(x+hit.nx*.045-ox,ground(x,z)+.65,z+hit.nz*.045-oz);
      return;
    }
    if(!o||(o.kind!=='pole'&&o.kind!=='tree'))return;
    swings.set(o.id,{dx,dz,strength:s,age:0});
    if(o.kind==='tree'){
      const count=4+Math.ceil(s*19);
      if(leaves.length+count>foliage.instanceMatrix.count)leaves.splice(0,leaves.length+count-foliage.instanceMatrix.count);
      for(let i=0;i<count;i++){
        const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*o.height*.2;
        leaves.push({x:ox+o.x+Math.cos(a)*r,y:o.height*(.50+Math.random()*.34),z:oz+o.z+Math.sin(a)*r,
          vx:dx*s*2+Math.cos(a),vz:dz*s*2+Math.sin(a),vy:-.6+s*Math.random(),phase:a,
          size:.13+Math.random()*.16,tint:[0x54733b,0x809249,0x617d37,0xb4a85b][i%4],age:0});
      }
    }
  }
  function update(dt){
    for(const [id,w] of swings){
      const o=objects.get(id);w.age+=dt;
      if(!o||w.age>2.8){if(o)rotate(o,0,0,0);swings.delete(id);continue;}
      const tree=o.kind==='tree',amplitude=tree?.19:.047;
      const angle=amplitude*w.strength*Math.exp(-w.age*(tree?1.8:3))*Math.sin(w.age*(tree?8.8:17));
      rotate(o,w.dx,w.dz,angle);
    }
    for(let i=scuffs.length-1;i>=0;i--){
      const s=scuffs[i];s.ttl-=dt;
      if(s.ttl<=0){scene.remove(s.mesh);s.mesh.material.dispose();scuffs.splice(i,1);continue;}
      s.mesh.position.set(s.x-ox,ground(s.x,s.z)+.65,s.z-oz);s.mesh.material.opacity=Math.min(.86,s.ttl*.8);
    }
    for(let i=leaves.length-1;i>=0;i--){
      const p=leaves[i];p.age+=dt;
      if(p.y<.06||p.age>7){leaves.splice(i,1);continue;}
      const a=p.age*4.5+p.phase;
      p.vy=Math.max(-2.6,p.vy-dt*3);
      p.x+=(p.vx*Math.exp(-p.age)+.4*Math.sin(a))*dt;
      p.z+=(p.vz*Math.exp(-p.age)+.3*Math.cos(a))*dt;
      p.y+=p.vy*dt;
    }
    foliage.visible=leaves.length>0;foliage.count=leaves.length;
    if(!foliage.visible)return;
    leaves.forEach((p,i)=>{
      dummy.position.set(p.x-ox,ground(p.x,p.z)+Math.max(.06,p.y),p.z-oz);dummy.rotation.set(p.age*4+p.phase,p.phase+p.age*2.2,Math.sin(p.age*5+p.phase));
      dummy.scale.setScalar(p.size);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,tint.setHex(p.tint));
    });
    foliage.instanceMatrix.needsUpdate=true;foliage.instanceColor.needsUpdate=true;
  }
  return {reset,rebase,register,react,update};
}
