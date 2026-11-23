'use strict';
window.BaDinhLandscape=(()=>{
  // The public square and its lawn share outline nodes in the OSM ground bundle.
  // Give paving the lawn as a hole, keeping the separate paved apron intact.
  function prepareGround(layers,graph,cx,cz){
    const lawnStart=graph.point(105.835279,21.035253);
    if(Math.abs(lawnStart.x-cx)>1050||Math.abs(lawnStart.z-cz)>1050)return;
    const squareStart=graph.point(105.834747,21.035252);
    function startsAt(layer,point){
      const [x,z]=layer.rings[0][0];
      return Math.abs(x+cx-point.x)<.15&&Math.abs(z+cz-point.z)<.15;
    }
    const lawn=layers.find(layer=>layer.kind==='lawn'&&startsAt(layer,lawnStart));
    const square=layers.find(layer=>layer.kind==='court'&&startsAt(layer,squareStart));
    if(!lawn||!square)return;
    const ring=lawn.rings[0];
    if(!square.rings.includes(ring))square.rings.push(ring);
    lawn.coverageByte=128;
    function inside(x,z){
      let within=false;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const [ax,az]=ring[i],[bx,bz]=ring[j];
        if((az>z)!==(bz>z)&&x<ax+(bx-ax)*(z-az)/(bz-az))within=!within;
      }
      return within;
    }
    for(const layer of layers){
      if(layer.kind!=='walk')continue;
      const path=layer.rings[0],a=path[0],b=path[path.length-1];
      // Check both halves; a path which merely touches the garden keeps its width.
      if(inside(.75*a[0]+.25*b[0],.75*a[1]+.25*b[1])&&
         inside(.25*a[0]+.75*b[0],.25*a[1]+.75*b[1])){
        // The square's original landscape architect describes pebble concrete footpaths.
        layer.size||=1.4;layer.finish||='concrete';layer.coverageByte=255;
      }
    }
  }

  // Broad, clipped Plumeria crowns above open, forked branches in the Government
  // News photographs of 2 September 2026. Dimensions are fitted to the façade.
  // https://thanglong.baochinhphu.vn/le-thuong-co-dac-biet-trong-sang-quoc-khanh-tai-quang-truong-ba-dinh-103260902113729279.htm
  function frangipani(T,group,stamp,x,z,side){
    const limb=new T.CylinderGeometry(.66,1,1,8),up=new T.Vector3(0,1,0);
    const delta=new T.Vector3(),rotation=new T.Quaternion(),angles=new T.Euler(0,0,0,'YXZ');
    function branch(a,b,r,colour){
      delta.subVectors(b,a);
      const length=delta.length();
      rotation.setFromUnitVectors(up,delta.divideScalar(length));angles.setFromQuaternion(rotation,'YXZ');
      stamp(limb,colour,x+(a.x+b.x)/2,(a.y+b.y)/2,z+(a.z+b.z)/2,
        r,length,r,angles.y,angles.x,angles.z);
    }
    for(let i=0;i<7;i++){
      const a=i*2.39996+side*.31,dx=Math.cos(a),dz=Math.sin(a);
      const root=new T.Vector3(.41*dx,.10,.41*dz);
      const fork=new T.Vector3(1.35*dx,2.44+.21*Math.sin(2*a),1.2*dz);
      branch(root,fork,.21,0x706b57);
      for(const turn of [-.41,.38]){
        const bearing=a+turn,tip=new T.Vector3(4.4*Math.cos(bearing),5.23,3.9*Math.sin(bearing));
        branch(fork,tip,.145,0x7e7962);
      }
    }
    limb.dispose();
    const crown=new T.SphereGeometry(1,40,18),points=crown.attributes.position;
    const shades=[],ink=new T.Color();
    function skin(a,b){
      const c=Math.cos(b),s=Math.sin(b);
      const lobe=.035*Math.sin(5*a+side)*c+.027*Math.sin(9*a+3*b)*c+.013*Math.cos(17*a-5*b)*c;
      return [6.45*(1+lobe)*c*Math.cos(a),4.67+(s>0?3.29:.84)*s+.18*lobe*10,
        5.18*(1+lobe)*c*Math.sin(a)];
    }
    for(let i=0;i<points.count;i++){
      const a=Math.atan2(points.getZ(i),points.getX(i)),b=Math.asin(Math.min(1,Math.max(-1,points.getY(i))));
      const p=skin(a,b);
      points.setXYZ(i,...p);
      ink.setHex(0x476732).multiplyScalar(.72+.24*Math.sin(b)+.09*Math.cos(a*7+b*4)+.075*Math.sin(a*13-b*12));
      shades.push(ink.r,ink.g,ink.b);
    }
    crown.setAttribute('color',new T.Float32BufferAttribute(shades,3));crown.computeVertexNormals();
    const material=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.89});
    const canopy=new T.Mesh(crown,material);canopy.position.set(x,0,z);
    canopy.castShadow=canopy.receiveShadow=true;group.add(canopy);

    // Small rosettes along the outside break up the silhouette at eye level.
    const tips=[],colours=[];
    for(let i=0;i<192;i++){
      const a=i*2.399963+side*.27,b=Math.asin(-.25+1.24*(i+.5)/192);
      const [px,py,pz]=skin(a,b);
      for(let j=0;j<4;j++){
        const t=a+j*1.62+.14*Math.sin(i),dx=Math.cos(t),dz=Math.sin(t);
        const length=.27+.08*Math.sin(i*4+j),width=.08+.017*Math.cos(j+i);
        const start=[px+.06*Math.cos(a),py+.04,pz+.06*Math.sin(a)];
        const l=[start[0]+dx*.47*length-dz*width,start[1]+.075,start[2]+dz*.47*length+dx*width];
        const r=[start[0]+dx*.47*length+dz*width,start[1]+.065,start[2]+dz*.47*length-dx*width];
        const end=[start[0]+dx*length,start[1]-.005,start[2]+dz*length];
        ink.setHex([0x5d783b,0x728c46,0x547336,0x405f31][(i+j)%4]);
        for(const p of [start,l,r,l,end,r]){tips.push(...p);colours.push(ink.r,ink.g,ink.b);}
      }
    }
    const leaves=new T.BufferGeometry();
    leaves.setAttribute('position',new T.Float32BufferAttribute(tips,3));
    leaves.setAttribute('color',new T.Float32BufferAttribute(colours,3));leaves.computeVertexNormals();
    const mesh=new T.Mesh(leaves,material);mesh.position.copy(canopy.position);mesh.receiveShadow=true;group.add(mesh);
  }

  function cycadCrown(T,count,radius,rise,drop){
    const positions=[];
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count,dx=Math.cos(a),dz=Math.sin(a);
      function point(f,offset=0){
        return [dx*radius*f-dz*offset,rise*Math.sin(Math.PI*f*.78)-drop*f*f,dz*radius*f+dx*offset];
      }
      for(let j=0;j<7;j++){
        const f=j/7,end=(j+1)/7,mid=f+.05;
        positions.push(...point(f,-.018),...point(end,.012),...point(end,-.012),
          ...point(f,-.018),...point(f,.018),...point(end,.012));
        if(!j)continue;
        const width=.105*Math.sin(Math.PI*mid)+.015;
        for(const side of [-1,1]){
          const tip=point(Math.min(1,mid+.12),side*width);
          tip[1]-=.055;
          positions.push(...point(f,0),...tip,...point(end,0));
        }
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    return geometry;
  }

  // OSM 697161892 and 697161893 each consist of a seating bank in front
  // of a narrower upper deck. The surveyed 5.2 m high "skillion" is the
  // seating rake. The National Architecture Institute gives 66 m per stand.
  // https://vienkientrucquocgia.gov.vn/nhin-lai-hinh-thuc-kien-truc-ha-noi-nhung-chang-duong-sang-tac/
  const terraces=[
    {front:[[-92.7,18.4],[-27.2,17.9]],crest:[[-93.2,10],[-27.7,9.6]],
      deck:[[-89,2.8],[-29.1,2.5]],inscription:'NƯỚC CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM MUÔN NĂM !'},
    {front:[[29.4,18.2],[96,17.6]],crest:[[29.8,8.6],[95.5,9.2]],
      deck:[[32.9,1.7],[91.7,1.5]],inscription:'CHỦ TỊCH HỒ CHÍ MINH VĨ ĐẠI SỐNG MÃI TRONG SỰ NGHIỆP CỦA CHÚNG TA !'}
  ];
  function grandstand(T,group,{front,crest,deck,inscription}){
    const stand=new T.Group();group.add(stand);
    const positions=[],colours=[],ink=new T.Color(),feet=[];
    const mix=(a,b,f)=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
    const at=(point,y)=>[point[0],y,point[1]];
    function face(a,b,c,d,colour){
      ink.setHex(colour);
      for(const p of [a,b,d,b,c,d]){
        if(p[1]<0)feet.push(positions.length/3);
        positions.push(...p);colours.push(ink.r,ink.g,ink.b);
      }
    }
    function wall(a,b,bottom,top,colour){
      face(at(a,bottom),at(b,bottom),at(b,top),at(a,top),colour);
    }
    // Stone banks, with a narrow projecting lip along each exposed riser.
    const tiers=9;
    for(let i=0;i<tiers;i++){
      const first=front.map((p,j)=>mix(p,crest[j],i/tiers));
      const next=front.map((p,j)=>mix(p,crest[j],(i+1)/tiers));
      const height=1.8+3.4*i/(tiers-1),lower=i?height-3.4/(tiers-1):-.4;
      face(at(first[0],height),at(first[1],height),at(next[1],height),at(next[0],height),0xbebcb1);
      wall(first[0],first[1],lower,height-.065,i?0xaaa89d:0x94938a);
      wall(first[0],first[1],height-.065,height,0xcac7bb);
      wall(next[0],first[0],-.4,height,0xa3a095);
      wall(first[1],next[1],-.4,height,0xa3a095);
    }
    wall(crest[1],crest[0],-.4,5.2,0x969589);
    const shoulders=deck.map(p=>mix(crest[0],crest[1],(p[0]-crest[0][0])/(crest[1][0]-crest[0][0])));
    face(at(shoulders[0],5.2),at(shoulders[1],5.2),at(deck[1],5.2),at(deck[0],5.2),0xaba79b);
    wall(deck[1],deck[0],-.4,5.2,0x939086);
    wall(deck[0],shoulders[0],-.4,5.2,0x99978c);
    wall(shoulders[1],deck[1],-.4,5.2,0x99978c);
    const stone=new T.BufferGeometry();
    stone.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    stone.setAttribute('color',new T.Float32BufferAttribute(colours,3));stone.computeVertexNormals();
    const masonry=new T.Mesh(stone,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.89}));
    masonry.castShadow=masonry.receiveShadow=true;stand.add(masonry);

    // Freestanding pale blue-green inscription panels appear in the 2022 and
    // 2026 public façade photographs. They sit above, and behind, the tiers.
    const boardWidth=60.6,boardHeight=2.6;
    const centre=mix(crest[0],crest[1],.5);
    const frame=new T.Group();frame.position.set(centre[0],5.42+boardHeight/2,centre[1]-.25);
    frame.rotation.y=-Math.atan2(crest[1][1]-crest[0][1],crest[1][0]-crest[0][0]);stand.add(frame);
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=128;
    const pen=canvas.getContext('2d');
    pen.fillStyle='#bde8e4';pen.fillRect(0,0,2048,128);
    pen.fillStyle='#b5dcd8';
    for(let i=1;i<30;i++)pen.fillRect(Math.round(i*2048/30),0,1,128);
    pen.fillStyle='#be322d';pen.font='bold 96px Arial';pen.textAlign='center';pen.textBaseline='middle';
    pen.fillText(inscription,1024,70,1960);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
    const back=new T.Mesh(new T.BoxGeometry(boardWidth,boardHeight,.12),new T.MeshStandardMaterial({color:0xa7bdb7,roughness:.83}));
    frame.add(back);
    const text=new T.Mesh(new T.PlaneGeometry(boardWidth,boardHeight),new T.MeshStandardMaterial({map,roughness:.9}));
    text.position.z=.064;frame.add(text);
    const uprights=new T.InstancedMesh(new T.CylinderGeometry(.063,.081,1,8),new T.MeshStandardMaterial({color:0xa6aba5,roughness:.56}),7);
    const pose=new T.Object3D();
    for(let i=0;i<7;i++){
      const h=7.45;
      pose.position.set((i/6-.5)*(boardWidth-.7),h*.5-boardHeight*.5-.22,-.17);
      pose.scale.set(1,h,1);pose.updateMatrix();uprights.setMatrixAt(i,pose.matrix);
    }
    frame.add(uprights);
    return ground=>{
      const base=ground(centre[0],centre[1]);stand.position.y=base;
      const pos=stone.attributes.position;
      for(const i of feet)pos.setY(i,Math.min(-.4,ground(pos.getX(i),pos.getZ(i))-base-.18));
      pos.needsUpdate=true;stone.computeBoundingSphere();
    };
  }

  function addPlanting(T,{group,stamp}){
    // Operator's planting record: two đại and nine cycads before each lateral terrace.
    // https://btllang.mod.gov.vn/tin-tuc/tin-tu-bo-tu-lenh-lang/565-quang-truong-ba-dinh-va-lang-chu-tich-ho-chi-minh-khong-gian-thieng-lieng-cua-thu-do-ha-noi-va-cua-ca-nuoc.html
    const plants=[];
    for(const side of [-1,1]){
      frangipani(T,group,stamp,1.8+side*21.5,16.8,side);
      for(let i=0;i<9;i++){
        plants.push({x:1.8+side*(30+6.5*i),z:20.1,scale:.97+.035*Math.sin(i*2.3+side),angle:i*.78});
      }
    }
    const parts=[
      [new T.CylinderGeometry(.21,.17,.84,8),0x78634a,.42,0],
      [cycadCrown(T,12,.93,.38,.52),0x385e37,.87,0],
      [cycadCrown(T,9,.68,.53,.21),0x678546,.92,.19]
    ].map(([geometry,color,height,turn])=>{
      const material=new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.87});
      const mesh=new T.InstancedMesh(geometry,material,plants.length);
      mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
      return {mesh,height,turn};
    });
    const pose=new T.Object3D();
    function fitCycads(ground){
      plants.forEach(({x,z,scale,angle},i)=>{
        const base=ground(x,z);
        for(const {mesh,height,turn} of parts){
          pose.position.set(x,base+height*scale,z);pose.rotation.y=angle+turn;
          pose.scale.setScalar(scale);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
        }
      });
      for(const {mesh} of parts){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
    }
    fitCycads(()=>0);
    const fitStands=terraces.map(terrace=>grandstand(T,group,terrace));
    return ground=>{fitCycads(ground);for(const fit of fitStands)fit(ground);};
  }
  // Two untyped mapped trees lie among the independently modeled forecourt trees.
  const modeledTrees=['105834874,21036624','105834928,21036873'];
  return {modeledTrees,prepareGround,addPlanting};
})();
