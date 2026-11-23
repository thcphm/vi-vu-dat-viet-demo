'use strict';

async function loadWorldFamilySedan(T,path){
  const data=await fetchMapTile(path);
  const model=new T.ObjectLoader().parse(data);
  const mounts=new Map();
  // The sedan export batches four identical corners per material. Each corner
  // occupies a contiguous quarter of both the indexed faces and the vertices.
  for(const part of ['tire','rim_paint','rim_machined','brake_disc','caliper']){
    const batch=model.getObjectByName(part),source=batch.geometry;
    const vertexCount=source.attributes.position.count/4,indexCount=source.index.count/4;
    for(let i=0;i<4;i++){
      const geometry=new T.BufferGeometry(),start=i*vertexCount;
      for(const [name,attribute] of Object.entries(source.attributes)){
        const size=attribute.itemSize;
        const values=attribute.array.subarray(start*size,(start+vertexCount)*size);
        geometry.setAttribute(name,new T.BufferAttribute(values,size,attribute.normalized));
      }
      const indices=source.index.array.subarray(i*indexCount,(i+1)*indexCount);
      geometry.setIndex(new T.BufferAttribute(indices.map(index=>index-start),1));
      geometry.computeBoundingBox();
      const center=geometry.boundingBox.getCenter(new T.Vector3());
      const front=center.z>0,left=center.x>0,id=(front?'F':'R')+(left?'L':'R');
      if(part==='tire'){
        const axle=new T.Group(),wheel=new T.Group();
        if(front)axle.name='steer_'+id;
        axle.position.copy(center);
        wheel.name='wheel_'+id;
        if(!left)wheel.rotation.y=Math.PI;
        model.add(axle);axle.add(wheel);mounts.set(id,{axle,wheel});
      }
      const {axle,wheel}=mounts.get(id);
      // Keep the faces in their authored pose when reparenting. Calipers
      // follow the steering knuckle while the wheel and disc spin together.
      const mesh=new T.Mesh(geometry,batch.material);
      (part==='caliper'?axle:wheel).attach(mesh);
    }
    model.remove(batch);
    source.dispose();
  }
  return model;
}
