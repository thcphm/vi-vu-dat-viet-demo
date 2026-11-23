'use strict';
// Shared limestone geometry for the Phong Nha and Hạ Long visitor scenes.
window.VietnamKarst=(()=>{
  const tau=2*Math.PI;
  // All profiles are exterior visitor-scale reconstructions in metres. Surveyed
  // map pins/paths anchor them; the unmeasured cave sections are interpretive.
  function register(sites, node, settings, build) {
    const id = 'osm-node-'+node, atlas = globalThis.VietnamTourism;
    const site = atlas.byId?.get(id) ?? atlas.entries.find(entry => entry.id===id);
    if (!site) throw Error('Thiếu địa danh '+id);
    const {shots,...data}=settings, c=Math.cos(data.yaw), s=Math.sin(data.yaw);
    const views=shots.map(([name,x,z,height,radius,angle,elevation])=>({
      name,offset:[x*c+z*s,-x*s+z*c],height,viewRadius:radius,viewAngle:data.yaw+angle,viewElevation:elevation
    }));
    sites.push({...site,...data,id,catalogId:id,photo:data.source,views,solids:[],visitOnArrival:true,build});
  }

  // Adjacent samples share their normals. Bedrock, flowstone and river pebbles
  // share one draw and the same photographed mineral texture.
  function batch(T) {
    const positions=[],colors=[],indices=[],color=new T.Color();
    function grid(cols,rows,sample) {
      const first=positions.length/3;
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++) {
        const [x,y,z,tint,light=1]=sample(i/cols,j/rows);
        positions.push(x,y,z);color.setHex(tint);
        colors.push(color.r*light,color.g*light,color.b*light);
        if(i&&j){
          const d=first+j*(cols+1)+i,a=d-cols-2,b=a+1,c=d-1;
          indices.push(a,b,c,b,d,c);
        }
      }
    }
    function add(group,material) {
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      g.setIndex(indices);g.computeVertexNormals();
      material.side=T.DoubleSide;
      const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;mesh.castShadow=!material.isMeshPhongMaterial;
      group.add(mesh);
    }
    return {grid,add,trees:[],ferns:[]};
  }

  function boulder(rock,x,y,z,rx,h,rz,seed,moss=false) {
    rock.grid(20,7,(u,v)=>{
      const a=u*tau,lat=v*Math.PI/2,r=Math.cos(lat);
      const facets=(1+.10*Math.cos(4*a+seed)+.06*Math.sin(7*a+lat+seed))*r;
      const tint=moss&&v>.42+.12*Math.sin(3*a)?0x77804c:0x99998a;
      return [x+rx*(Math.cos(a)*facets+.1*v),y-.45+h*Math.sin(lat),
        z+rz*(Math.sin(a)*facets-.085*v),tint,.78+.17*v+.08*Math.cos(a+seed)];
    });
  }

  // Shape the mouth from its silhouette and loft actual sidewalls and ceiling
  // behind the lip. Each section is [depth, centre X, half-span, height, floor].
  function grotto(rock,sections,wing,crest,phase,upperWindow=false) {
    const [, ,radius,h,floor]=sections[0];
    function lip(u) {
      const a=(1-u)*Math.PI,relief=1+.075*Math.sin(a*5+phase)+.041*Math.cos(a*11-phase);
      return [radius*Math.cos(a),floor+h*Math.sin(a)**.72*relief,
        (.065*Math.sin(a*4+phase)+.03*Math.sin(11*a))*radius];
    }
    for(let j=0;j<sections.length-1;j++){
      const a=sections[j],b=sections[j+1];
      rock.grid(44,5,(u,v)=>{
        const t=(1-u)*Math.PI,z=a[0]+(b[0]-a[0])*v;
        const [lx,ly,lz]=lip(u),w=a[2]+(b[2]-a[2])*v;
        const rise=a[3]+(b[3]-a[3])*v,base=a[4]+(b[4]-a[4])*v;
        const decay=Math.exp(-z/Math.max(radius*.55,1));
        const scallop=.027*Math.sin(8*t+z*.39+phase)*(1-decay);
        return [a[1]+(b[1]-a[1])*v+lx*w/radius*(1+scallop),
          base+(ly-floor)*rise/h*(1+scallop),-z+lz*decay,
          0xb3a992,(.29+.62*decay)*(.94+.08*Math.cos(t*9+phase))];
      });
      rock.grid(30,5,(u,v)=>{
        const z=a[0]+(b[0]-a[0])*v,span=a[2]+(b[2]-a[2])*v;
        const x=a[1]+(b[1]-a[1])*v+(2*u-1)*span;
        const y=a[4]+(b[4]-a[4])*v;
        return [x,y+.025+.018*Math.sin(x*2.9+z*.5),-z,0x958c73,.24+.56*Math.exp(-z/(radius*.82))];
      });
    }
    const last=sections.at(-1);
    rock.grid(38,5,(u,v)=>{
      const [x,y]=lip(u);
      return [last[1]+x*last[2]/radius,last[4]+(y-floor)*last[3]/h*v,-last[0]-.03,
        0x383934,.68];
    });
    function facade(u,v) {
      const x=(2*u-1)*wing,inside=Math.abs(x)<=radius;
      const angle=Math.acos(Math.max(-1,Math.min(1,x/radius)));
      const [,ey,ez]=lip(1-angle/Math.PI);
      const margin=Math.max(0,Math.min(1,(wing-Math.abs(x))/(wing-radius)));
      const base=inside?ey:floor- (1-margin)*floor-.36;
      const top=crest*(.82+.12*Math.cos(5*u+phase)+.12*Math.sin(11*u-phase))*(.04+.96*margin**.45);
      const y=base+(Math.max(base+.3,top)-base)*v;
      const bed=(y*.43+x*.13+.4*Math.sin(u*9+phase));
      const ledge=(1-Math.abs((bed-Math.floor(bed))*2-1))**2;
      const fold=radius*(.095*Math.sin(9*u+phase)+.065*Math.sin(28*u+v*9)+.07*ledge)*(1-Math.exp(-v*8));
      return [x,y,ez+fold-v*v*radius*.48,margin];
    }
    function cliff(u,v) {
      const [x,y,z,m]=facade(u,v);
      const wet=.5+.5*Math.sin(x*.64+phase)*Math.cos(y*.37+z*.4);
      return [x,y,z,v>.81&&wet>.53?0x758060:0xaaa99b,
        (.80+.17*wet+.07*Math.cos(2.8*y+.6*x))*(.88+.12*m)];
    }
    if(upperWindow){
      // The high daylight opening above the stream at Hang Én is distinct
      // from the lower river entrance. Recess its jambs into the massif.
      function edges(u){
        const dx=(u-.545)/.18,aperture=Math.max(0,1-dx*dx);
        return [.38-.10*aperture,.38+.41*aperture**.66];
      }
      rock.grid(100,9,(u,v)=>cliff(u,v*edges(u)[0]));
      rock.grid(100,9,(u,v)=>cliff(u,edges(u)[1]+v*(1-edges(u)[1])));
      for(const edge of [0,1])rock.grid(42,5,(u,v)=>{
        const t=.365+.36*u, [x,y,z]=facade(t,edges(t)[edge]);
        return [x-v*radius*.43,y+(edge?.7:1.4)*v,z-v*radius,0x888575,1-.72*v];
      });
      rock.grid(42,4,(u,v)=>{
        const t=.365+.36*u,[a,b]=edges(t),[x,y,z]=facade(t,a+(b-a)*v);
        return [x-radius*.43,y+1,z-radius-.06,0x3b3d32,.63];
      });
    }else rock.grid(100,16,cliff);
    // Follow the buried passage around its bend. The outer hillside must stay
    // above the ceiling, including where a narrow entrance opens into a hall.
    function hillside(u,v){
      const [frontX,top,frontZ]=facade(u,1),depth=v*(last[0]+crest*.95);
      const i=sections.findIndex(s=>s[0]>=depth);
      const a=sections[i>0?i-1:i===0?0:sections.length-1];
      const b=sections[i<0?sections.length-1:i];
      const mix=b[0]===a[0]?0:(depth-a[0])/(b[0]-a[0]);
      const x=frontX+a[1]+(b[1]-a[1])*mix;
      const caveHeight=a[3]+(b[3]-a[3])*mix+a[4]+(b[4]-a[4])*mix;
      const crestWeight=Math.min(1,(1-Math.abs(2*u-1))/.5);
      const headroom=(caveHeight+crest*.24)*crestWeight*Math.min(1,depth/Math.max(1,radius));
      const tail=Math.max(0,(depth-last[0])/(crest*.95));
      return [x,(Math.max(headroom,top*(1-v*.38))+.45)*(1-tail*tail)-.45,frontZ-depth];
    }
    rock.grid(62,20,(u,v)=>[...hillside(u,v),0x818a70,.83+.15*Math.sin(u*38+v*4+phase)]);
    for(let n=0;n<44;n++){
      const u=(n*.618034)%1,v=((n*.3877+.08)%1)**1.7;
      const [x,y,z]=hillside(u,v),h=(1.7+crest*.20)*(.65+.50*Math.sin(n*11.1)**2);
      rock.trees.push([x,y-.06,z,h*.93,h,n*2.4]);
    }
    for(let i=0;i<105;i++){
      const u=(i*.61413)%1,v=(i*.4171)%1;
      if(v<.18&&Math.abs(2*u-1)*wing<radius)continue;
      const [x,y,z]=facade(u,.64+.36*v);
      rock.ferns.push([x,y,z+.24,Math.min(1.5,.25+crest*.035)*(1.2+.6*Math.sin(i)**2),i*2.4]);
    }
  }

  function river(T,group,length,centre,width,rapids=false,shelterDepth=0) {
    const water=batch(T);
    water.grid(16,40,(u,t)=>{
      const z=length[0]+(length[1]-length[0])*t;
      const x=centre(z)+(2*u-1)*(width(z)+.38*Math.sin(z*1.8)+.21*Math.cos(z*2.6));
      const ripple=.014*Math.cos(z*2.7+x*.8)+.009*Math.sin(z*1.2-x*3);
      const depth=1-Math.abs(u-.5)*2;
      return [x,.105+ripple,z,depth<.14?0x92997b:depth<.34?0x65a698:0x388d89,
        .86+.12*Math.sin(x*.6+z*.31)+.08*Math.cos(x*4+z)];
    });
    const m=new T.MeshPhongMaterial({vertexColors:true,specular:0x9cc8bd,shininess:52,transparent:true,depthWrite:false});
    const clock={value:0},limits={value:new T.Vector2(...length)},quiet=matchMedia('(prefers-reduced-motion: reduce)');
    m.customProgramCacheKey=()=>(rapids?'phong-nha-riffles':'phong-nha-pool')+shelterDepth;
    m.onBeforeRender=()=>{clock.value=quiet.matches?0:(performance.now()%900000)*.001;};
    m.onBeforeCompile=shader=>{
      shader.uniforms.streamTime=clock;shader.uniforms.ends=limits;
      shader.vertexShader='varying vec2 streamPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nstreamPoint=position.xz;');
      shader.fragmentShader='varying vec2 streamPoint;uniform float streamTime;uniform vec2 ends;\n'+
        shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec2 p=streamPoint;
          float wave=sin(p.y*5.8+p.x*.85-streamTime*2.7+1.9*sin(p.x*.95-p.y*.41));
          float crossWave=sin(p.y*3.4-p.x*2.17-streamTime*2.2);
          float crest=smoothstep(.40,.94,wave)*smoothstep(-.46,.72,crossWave);
          float fade=1.-smoothstep(.22,.87,fwidth(p.y));
          diffuseColor.rgb+=vec3(.048,.07,.063)*crest*fade;
          ${rapids?`float bank=sin(p.y*.59+sin(p.x*1.4))+cos(p.x*1.2+p.y*.37);
            float curl=sin(p.x*12.+p.y*4.5+2.8*sin(p.y*2.3)+2.*crossWave);
            float white=smoothstep(.86,1.8,bank)*smoothstep(.13,.88,wave+.26*crossWave)*smoothstep(-.55,.80,curl);
            diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.57,.66,.60),white*fade*.63);`:''}
          diffuseColor.a*=.94*smoothstep(0.,3.8,min(p.y-ends.x,ends.y-p.y));`);
      if(shelterDepth)shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',
        `gl_FragColor.rgb*=mix(.065,1.,smoothstep(-${shelterDepth.toFixed(1)},4.,streamPoint.y));\n#include <tonemapping_fragment>`);
    };
    water.add(group,m);
  }

  let fernMap;
  function finish(T,kit,rock,groundProfile) {
    rock.add(kit.group,globalThis.createSightStoneMaterial(T));
    if(rock.ferns.length) {
      const p=[],uv=[],order=[];
      for(const [x,y,z,h,angle] of rock.ferns)for(const off of [0,1.57]){
        const dx=h*.74*Math.cos(angle+off),dz=h*.74*Math.sin(angle+off),i=p.length/3;
        p.push(x-dx,y-.12,z-dz,x+dx,y-.12,z+dz,x+dx,y+h,z+dz,x-dx,y+h,z-dz);
        uv.push(0,0,1,0,1,1,0,1);order.push(i,i+1,i+3,i+1,i+2,i+3);
      }
      if(!fernMap){
        fernMap=new T.TextureLoader().load('streetscape/surfaces/bank-fern.webp');
        fernMap.colorSpace=T.SRGBColorSpace;fernMap.userData.sightShared=true;
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(order);g.computeVertexNormals();
      const ferns=new T.Mesh(g,new T.MeshLambertMaterial({color:0xb5c49b,map:fernMap,side:T.DoubleSide,alphaTest:.36}));
      ferns.receiveShadow=true;kit.group.add(ferns);
    }
    if(rock.trees.length)globalThis.createTreeModels(T).grove(kit.group,rock.trees);
    // Follow the same hillside used by the camera and the car. Keep the
    // rest positions across district rebuilds and sample only a coarse lattice.
    let layers,groves,previous;
    kit.group.userData.fitGround=height=>{
      if(!layers){
        groves=kit.group.children.filter(m=>m.isInstancedMesh).map(mesh=>({mesh,rest:mesh.instanceMatrix.array.slice()}));
        layers=kit.group.children.filter(m=>m.geometry?.attributes.position&&!m.isInstancedMesh).map(mesh=>{
          const geometry=mesh.geometry,p=geometry.attributes.position;
          return {geometry,p,baseY:Float32Array.from({length:p.count},(_,i)=>p.getY(i)),mesh};
        });
      }
      const spacing=3,heights=new Map();
      function sample(ix,iz){
        const key=ix+','+iz;
        if(!heights.has(key))heights.set(key,groundProfile?groundProfile(height,ix*spacing,iz*spacing):height(ix*spacing,iz*spacing));
        return heights.get(key);
      }
      if(previous) {
        let changed=false;
        for(const [key,old] of previous){
          const [x,z]=key.split(',').map(Number);
          if(Math.abs(sample(x,z)-old)>.006)changed=true;
        }
        if(!changed)return;
      }
      function lift(x,z){
        x/=spacing;z/=spacing;
        const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;
        const low=sample(ix,iz)*(1-u)+sample(ix+1,iz)*u;
        const high=sample(ix,iz+1)*(1-u)+sample(ix+1,iz+1)*u;
        return low*(1-v)+high*v;
      }
      for(const {geometry,p,baseY,mesh} of layers) {
        for(let i=0;i<p.count;i++)
          p.setY(i,baseY[i]+lift(mesh.position.x+p.getX(i),mesh.position.z+p.getZ(i)));
        p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();
      }
      for(const {mesh,rest} of groves){
        const m=mesh.instanceMatrix;
        for(let i=12;i<rest.length;i+=16)m.array[i+1]=rest[i+1]+lift(rest[i],rest[i+2]);
        m.needsUpdate=true;mesh.computeBoundingSphere();
      }
      previous=heights;
    };
  }

  function walkway(T,kit,points,width,height,wood) {
    kit.palette({timber:wood});
    for(let j=1;j<points.length;j++){
      const [ax,az]=points[j-1],[bx,bz]=points[j],dx=bx-ax,dz=bz-az;
      const length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),nx=dz/length,nz=-dx/length;
      const planks=Math.ceil(length/.24);
      for(let i=0;i<planks;i++) {
        const t=(i+.5)/planks;
        kit.box(wood,ax+t*dx,height,az+t*dz,width,.12,length/planks-.015,angle);
      }
      const bays=Math.ceil(length/2.2);
      for(const side of [-1,1]) {
        const x=ax+side*nx*width*.48,z=az+side*nz*width*.48;
        for(let i=0;i<=bays;i++){
          if(j>1&&i===0)continue;
          kit.box(wood,x+i*dx/bays,height+.08,z+i*dz/bays,.105,2,.105,angle);
        }
        for(const y of [height+.55,height+1.06]) globalThis.CentralArch.strut(T,kit,wood,x,y,z,x+dx,y,z+dz,.052);
      }
    }
  }

  return {register,batch,boulder,grotto,river,finish,walkway};
})();
