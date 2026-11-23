'use strict';

// Unit-height assets are rooted at the collision pivot. Identical trees share
// geometry and materials across a batch, including the simpler distance meshes.
let roadsideTreeAtlas;
const treeGeometryTemplates=new WeakMap();
function createTreeModels(T){
  const cache=new Map();
  if(!treeGeometryTemplates.has(T))treeGeometryTemplates.set(T,new Map());
  const templates=treeGeometryTemplates.get(T);
  let distantMaterial;
  if(!roadsideTreeAtlas){
    const compact=globalThis.matchMedia?.('(pointer: coarse)').matches && globalThis.document?.body?.dataset.graphics!=='high';
    roadsideTreeAtlas=new T.TextureLoader().load(compact?'streetscape/tree-canopies-mobile.webp':'streetscape/tree-canopies.webp');
  }
  const atlas=roadsideTreeAtlas;
  atlas.colorSpace=T.SRGBColorSpace;
  atlas.userData.sightShared=true;
  atlas.anisotropy=4;
  const material=new T.MeshLambertMaterial({map:atlas,vertexColors:true,alphaTest:.31,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    // The same sun lights both sides of a cluster of small leaves. Use the
    // crown's outward normal through the cluster, regardless of viewing angle.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',
      '#include <normal_fragment_begin>\n if(vMapUv.y>.125) normal*=faceDirection;');
  };
  const palmMaterial=new T.MeshLambertMaterial({map:atlas,vertexColors:true,side:T.DoubleSide});
  function variantAt(x,z){
    const hash=Math.imul(Math.round(x*4),73856093)^Math.imul(Math.round(z*4),19349663);
    return (Math.imul(hash^(hash>>>16),0x45d9f3b)>>>16)%4;
  }
  const bytes=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
  function scanFor(kind,variant){return kind==='pine'?3:kind==='tea'?0:[1,2,0,1][variant];}
  // Use the same rooted silhouette at every detail level.
  function scanPosition(kind,variant,root,x,y,z){
    x-=root[0];z-=root[1];y-=.009;
    const f=Math.max(0,y);
    if(kind==='tea')return [x,Math.max(-.02,(y-.14)/.86),z];
    if(kind==='pine')return [x*(.82+variant*.07)+.038*Math.sin(f*2+variant)*f,y,z*(1.03-.07*variant)];
    if(variant===3)return [-x*(.79+.20*f)+.065*f*f,Math.sign(y)*Math.abs(y)**.82,z*(.88+.20*f)];
    return [x,y,z];
  }
  function distantGeometry(kind,variant){
    const key=kind+' distant '+variant;
    if(cache.has(key))return cache.get(key);
    const slot=scanFor(kind,variant),root=window.treeScanData[slot].root;
    const positions=[],normals=[],uv=[],indices=[];
    // Two upright views intersect at the trunk. The third covers elevated cameras.
    for(const [view,[right,up]] of [[0,1],[2,1],[0,2]].entries()){
      const start=positions.length/3;
      for(const v of [0,.5,1])for(const u of [0,.5,1]){
        const p=[root[0],.63,root[1]];p[right]=u;p[up]=v;
        positions.push(...scanPosition(kind,variant,root,...p));
        const normal=new T.Vector3(p[0]-.5,.65,p[2]-.5).normalize();
        normals.push(normal.x,normal.y,normal.z);
        uv.push((slot+(2+u*124)/128)/4,(3-view+(2+v*124)/128)/4);
      }
      for(const i of [0,1,3,4]){
        const a=start+i;indices.push(a,a+1,a+3,a+1,a+4,a+3);
      }
    }
    const g=new T.BufferGeometry();g.name='Tree model: '+key;
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);
    cache.set(key,g);return g;
  }
  function billboardMaterial(){
    if(!distantMaterial){
      const map=new T.TextureLoader().load('streetscape/tree-billboards.webp');
      map.colorSpace=T.SRGBColorSpace;
      distantMaterial=new T.MeshLambertMaterial({map,side:T.DoubleSide,alphaTest:.28});
      distantMaterial.onBeforeCompile=shader=>{
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',
          '#include <normal_fragment_begin>\n normal*=faceDirection;');
      };
    }
    return distantMaterial;
  }
  function geometry(kind,compact=false,variant=0){
    const key=kind+(compact?' grove ':' roadside ')+variant;
    if(cache.has(key))return cache.get(key);
    // Each landmark owns its mesh buffers. Decode and triangulate the same
    // scanned tree only once, even when its previous owner has been evicted.
    if(templates.has(key)){
      const copy=templates.get(key).clone();
      cache.set(key,copy);return copy;
    }
    const positions=[],normals=[],colors=[],uv=[],indices=[],shade=new T.Color(),tau=Math.PI*2;
    function vertex(x,y,z,nx,ny,nz,tile,u,v,tint,exposure=1){
      const inv=1/(Math.hypot(nx,ny,nz)||1);
      positions.push(x,y,z);normals.push(nx*inv,ny*inv,nz*inv);
      shade.setHex(tint).multiplyScalar(exposure);colors.push(shade.r,shade.g,shade.b);
      // Two gutter pixels on every side separate adjacent slices at small mips.
      const inset=2/320,span=1-2*inset;
      uv.push((tile%8+inset+u*span)/8,(7-Math.floor(tile/8)+inset+v*span)/8);
      return positions.length/3-1;
    }
    if(kind==='palm'){
      const bend=[.09,-.19,.035,.21][variant],head=[.76,.80,.82,.74][variant];
      const stemAt=t=>[bend*(t*t)*(1.30-.30*t),head*t,.035*Math.sin(t*2.7+variant)*t];
      const tube=(rings,sides,tile,tint)=>{
        let previous;
        rings.forEach(([x,y,z,r,light],j)=>{
          const row=[];
          for(let i=0;i<=sides;i++){
            const a=i*tau/sides,c=Math.cos(a),s=Math.sin(a);
            row.push(vertex(x+c*r,y,z+s*r,c,.045,s,tile,i/sides,j/(rings.length-1),tint,light));
            if(j&&i)indices.push(previous[i-1],row[i-1],previous[i],previous[i],row[i-1],row[i]);
          }previous=row;
        });
      };
      const rings=[];
      for(let j=0;j<=12;j++){
        const t=j/12,r=.020+.019*(1-t)**4+.013*Math.exp(-22*t);
        rings.push([...stemAt(t),r,.87+.12*t]);
      }
      tube(rings,compact?7:12,62,0xfff5de);
      const [cx,cy,cz]=stemAt(1),fronds=13+variant,segments=compact?9:23;
      // Each frond has an arched midrib, two ranks of folded pinnae and
      // independently drooping tips. The oldest fronds hang below the bud.
      for(let k=0;k<fronds;k++){
        const a=k*2.39996+variant*.66,dx=Math.cos(a),dz=Math.sin(a),age=k/(fronds-1);
        const span=.08+(.40+.04*Math.sin(k*2.7))*Math.sin(age*2.1);
        const lift=.18-.09*age,end=.25-.54*age+.035*Math.cos(k*1.7);
        const baseShade=age>.87?0xe5bb73:k%3===0?0xe4f0bb:0xecf7d6;
        function blade(t,side,offset,drop,u,v,light){
          const lateral=.026*Math.sin(t*2.5+k)*t+side*offset;
          return vertex(cx+dx*span*t-dz*lateral,cy+lift*Math.sin(t*Math.PI)+end*t*t-drop,
            cz+dz*span*t+dx*lateral,.25*dx-.18*side*dz,1,.25*dz+.18*side*dx,63,u,v,baseShade,light);
        }
        let last=[];
        for(let j=0;j<=segments;j++){
          const t=j/segments,r=.0055*(1-.88*t),rib=[blade(t,-1,r,0,.48,t,.90),blade(t,1,r,0,.52,t,1.14)];
          if(j)indices.push(last[0],last[1],rib[0],last[1],rib[1],rib[0]);
          last=rib;
          if(j===segments)break;
          for(const side of [-1,1]){
            const wave=Math.sin(k*9.12+j*4.73+side),w=.095*(.15+.85*Math.sin(Math.PI*(.05+.93*t)))*(1+.16*wave);
            const sweep=.06+.11*t+.022*wave,m=t+.45/segments;
            const base=blade(t,side,r,0,.02,.12,.89);
            const front=blade(m+sweep*.38,side,w*.6,.10*w,.23,.75,1.06);
            const ridge=blade(m+sweep*.45,side,w*.65,.065*w,.51,.70,1.18);
            const back=blade(m+sweep*.48+.38/segments,side,w*.54,.18*w,.76,.68,.81);
            const tip=blade(m+sweep,side,w,w*(.56+.33*age+.15*wave),.86,.92,.91);
            indices.push(base,front,ridge,front,tip,ridge,base,ridge,back,ridge,tip,back);
          }
        }
      }
    }else{
      const slot=scanFor(kind,variant);
      const scan=window.treeScanData[slot],wood=scan.wood[compact?1:0],root=scan.root;
      const position=(x,y,z)=>scanPosition(kind,variant,root,x,y,z);
      const xyz=new Int16Array(bytes(wood[0]).buffer),faces=new Uint16Array(bytes(wood[1]).buffer);
      const trunk=new T.BufferGeometry(),points=[];
      for(let i=0;i<xyz.length;i+=3)points.push(...position(xyz[i]/16000,xyz[i+1]/16000,xyz[i+2]/16000));
      trunk.setAttribute('position',new T.Float32BufferAttribute(points,3));trunk.setIndex(new T.BufferAttribute(faces,1));
      trunk.computeVertexNormals();
      const n=trunk.attributes.normal.array;
      for(let i=0;i<points.length;i+=3){
        const x=points[i],y=points[i+1],z=points[i+2];
        const u=.5+Math.atan2(z,x)/tau;
        vertex(x,y,z,n[i],n[i+1],n[i+2],kind==='pine'?60:61,u,Math.max(0,Math.min(1,y)),0xf5f2e8);
      }
      indices.push(...faces);trunk.dispose();
      const stride=compact?2:1,axes=[[2,0,1],[0,2,1],[1,0,2]];
      for(let layer=0;layer<scan.layers.length;layer++){
        const [d,h,v]=axes[Math.floor(layer/5)],tile=slot*15+layer;
        const depths=bytes(scan.layers[layer][0]),occupied=bytes(scan.layers[layer][1]),grid=new Map();
        function corner(i,j){
          const id=j*9+i;
          if(grid.has(id))return grid.get(id);
          const p=[0,0,0];p[d]=depths[id]/255;p[h]=i/8;p[v]=j/8;
          const [x,y,z]=position(...p);
          const light=.83+.14*p[1]+.13*Math.min(.7,Math.hypot(p[0]-.5,p[2]-.5));
          const index=vertex(x,y,z,(p[0]-.5)*1.45,.58+.55*p[1],(p[2]-.5)*1.45,
            tile,i/8,j/8,variant===3?0xfff4df:0xffffff,light);
          grid.set(id,index);return index;
        }
        for(let j=0;j<8;j+=stride)for(let i=0;i<8;i+=stride){
          let filled=false;
          for(let y=j;y<j+stride;y++)for(let x=i;x<i+stride;x++)filled||=Boolean(occupied[y]&(1<<x));
          if(!filled)continue;
          const a=corner(i,j),b=corner(i+stride,j),c=corner(i,j+stride),e=corner(i+stride,j+stride);
          indices.push(a,b,c,b,e,c);
        }
      }
    }
    const g=new T.BufferGeometry();g.name='Tree model: '+key;
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);
    templates.set(key,g.clone());
    cache.set(key,g);return g;
  }
  function grove(group,stems,compact=true){
    if(!stems.length)return;
    const groups=[[],[],[],[]],pose=new T.Object3D();
    for(const stem of stems)groups[variantAt(stem[0],stem[2])].push(stem);
    groups.forEach((rows,variant)=>{
      if(!rows.length)return;
      const mesh=new T.InstancedMesh(geometry('tree',compact,variant),material,rows.length);
      rows.forEach(([x,y,z,w,h,angle],i)=>{
        pose.position.set(x,y,z);pose.rotation.y=angle;pose.scale.set(w,h,w);
        pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
      });
      mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
    });
  }
  return {geometry,material,palmMaterial,variantAt,grove,distantGeometry,billboardMaterial};
}
