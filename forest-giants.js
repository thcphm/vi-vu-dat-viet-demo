'use strict';
window.VietnamForestGiants=(()=>{
  const tau=2*Math.PI;
  function bark(T){
    const m=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
    m.customProgramCacheKey=()=>'forest-giant-bark';
    m.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 barkPoint;varying vec3 barkNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nbarkPoint=position;barkNormal=normal;');
      shader.fragmentShader='varying vec3 barkPoint;varying vec3 barkNormal;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        {vec3 p=barkPoint;
        vec2 along=vec2(p.x+.19*sin(p.z*1.3),p.z+.16*sin(p.x*1.5));
        vec2 uv=along+.039*sin(p.y*2.6+along*7.)+.032*sin(p.y*.71-along*13.);
        vec2 ridges=pow(.5+.5*cos(uv*vec2(29.,33.)),vec2(6.));
        vec2 fine=.5+.5*cos(uv*vec2(87.,91.)+p.y*2.6);
        vec2 normalWeight=abs(barkNormal.zx)+.08;normalWeight/=normalWeight.x+normalWeight.y;
        float fade=1.-smoothstep(.12,.68,max(fwidth(p.x),fwidth(p.z)));
        float fissures=dot(ridges,normalWeight),fibre=dot(fine,normalWeight);
        float stain=sin(p.x*2.4+p.y*.81)*cos(p.z*2.16-p.y*.72);
        diffuseColor.rgb*=1.-.39*fade*fissures+.11*fade*(fibre-.5)+.13*stain;
        float lichen=smoothstep(.34,.79,stain)*(.48+.52*sin(p.y*4.2+p.z*3.1));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.15,.169,.092),lichen*.26);}
      `);
    };
    return m;
  }
  function limb(T,wood,rows,seed,dead=false,hollow=false,tint=dead?0x8a7559:0x8d8170){
    const curve=new T.CatmullRomCurve3(rows.map(([x,y,z])=>new T.Vector3(x,y,z)));
    const n=Math.max(7,Math.ceil(curve.getLength()*.72)),sides=rows[0][3]>.52?36:18;
    const rings=[];
    for(let i=0;i<=n;i++){
      const t=i/n,k=t*(rows.length-1),j=Math.min(rows.length-2,Math.floor(k)),f=k-j;
      const centre=curve.getPoint(t),up=curve.getTangent(t).normalize();
      const cross=new T.Vector3().crossVectors(up,Math.abs(up.z)>.84?new T.Vector3(1,0,0):new T.Vector3(0,0,1)).normalize();
      rings.push({centre,up,cross,back:new T.Vector3().crossVectors(up,cross),r:rows[j][3]+(rows[j+1][3]-rows[j][3])*f});
    }
    function at(u,i,scale=1,drop=0){
      const {centre,up,cross,back,r}=rings[i],a=u*tau,t=i/n;
      const flute=1+.086*Math.cos(7*a+seed+t*.9)+.046*Math.sin(15*a-t*1.6+seed);
      const broken=hollow?r*(.24*Math.sin(a*6+seed)+.33*Math.sin(a*4-seed))*Math.max(0,1-(1-t)*8):0;
      const p=centre.clone().addScaledVector(cross,r*scale*flute*Math.cos(a)).addScaledVector(back,r*scale*flute*Math.sin(a)).addScaledVector(up,broken-drop);
      return [p.x,p.y,p.z];
    }
    wood.grid(sides,n,(u,v)=>{
      const a=u*tau;
      const grooves=.12*Math.sin(a*12+Math.sin(v*5)*.9+seed)+.091*Math.cos(a*19+v*4.1);
      return [...at(u,Math.round(v*n)),tint,.82+grooves+.13*v];
    });
    if(hollow){
      wood.grid(sides,2,(u,v)=>[...at(u,n,1-v*.25),0xb09a75,.77+.13*Math.sin(u*49+seed)]);
      wood.grid(sides,5,(u,v)=>[...at(u,n,.75-v*.16,v*rows.at(-1)[3]*2.7),0x544735,.77-v*.53]);
      wood.grid(sides,2,(u,v)=>[...at(u,n,.59*(1-v),rows.at(-1)[3]*2.72),0x3e362b,.54]);
    }else{
      wood.grid(sides,1,(u,v)=>[...at(u,n,1-v),tint,.67]);
    }
  }
  function buttress(wood,x,z,angle,length,h,width,seed,dead,tint=dead?0x887051:0x8b8069){
    // Two thin faces rise out of the ground and join along an irregular crest.
    for(const side of [-1,1]){
      wood.grid(38,16,(u,v)=>{
        const a=angle+Math.sin(u*5+seed)*.083*u,spine=(1-u)**1.49*h*(1+.12*Math.sin(u*10+seed)+.065*Math.cos(17*u+seed));
        const along=.68+u*length,thick=(.035+width*(1-u)**.74)*(1-.86*v)*side;
        const warp=Math.sin(u*8.2+seed)*.24*u+side*(1-v)*(.15*Math.sin(u*26+v*5+seed)+.073*Math.sin(16*v+u*13));
        return [x+along*Math.cos(a)+(thick+warp)*Math.sin(a),-.27+v*(spine+.32),
          z+along*Math.sin(a)-(thick+warp)*Math.cos(a),v<.26+.075*Math.sin(u*19)&&Math.cos(u*8+seed)>.06?0x676f47:tint,
          .81+.08*Math.cos(u*29+v+seed)+.10*v];
      });
    }
  }
  function crowns(T,kit,rows){
    const trees=globalThis.createTreeModels(T),pose=new T.Object3D();
    // Reuse photographed canopy layers without duplicating their source trunk.
    for(let v=0;v<3;v++){
      const source=trees.geometry('tree',true,v),g=source.clone(),uv=g.attributes.uv,p=g.attributes.position,faces=[];
      for(let j=0;j<g.index.count;j+=3){
        const a=g.index.getX(j),b=g.index.getX(j+1),c=g.index.getX(j+2);
        if(uv.getY(a)>.126&&Math.max(p.getY(a),p.getY(b),p.getY(c))>.22)faces.push(a,b,c);
      }
      g.setIndex(faces);g.translate(0,-.60,0);source.dispose();
      const bunches=rows.filter((_,i)=>i%3===v),mesh=new T.InstancedMesh(g,trees.material,bunches.length);
      bunches.forEach(([x,y,z,rx,ry,rz,a],i)=>{
        pose.position.set(x,y,z);pose.rotation.y=a;pose.scale.set(rx*2.40,ry*2.74,rz*2.40);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
      });
      mesh.castShadow=mesh.receiveShadow=true;kit.group.add(mesh);
    }
  }
  return {bark,limb,buttress,crowns};
})();
