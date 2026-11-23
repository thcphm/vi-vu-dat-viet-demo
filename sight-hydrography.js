'use strict';
// Surveyed flow lines and entrance approaches, © OpenStreetMap contributors.
// The surveyed axis anchors the scene. Rock, spray and the unmeasured section
// are a visual interpretation of the feature rather than a measured cave survey.
(() => {
  const atlas=window.VietnamTourism,profiles=window.VietnamHydrography;
  const byId=atlas.byId??new Map(atlas.entries.map(s=>[s.id,s]));
  const shared=new Map(),reference=window.VietnamSightDetails??{};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function map(T,file,colour) {
    if(!shared.has(file)){
      const t=new T.TextureLoader().load('streetscape/surfaces/'+file);
      t.wrapS=t.wrapT=T.RepeatWrapping;
      if(colour)t.colorSpace=T.SRGBColorSpace;
      t.userData.sightShared=true;shared.set(file,t);
    }
    return shared.get(file);
  }
  function rockMaterial(T){
    const m=new T.MeshStandardMaterial({map:map(T,'cut-rock-color.webp',true),normalMap:map(T,'cut-rock-normal.webp',false),
      normalScale:new T.Vector2(.95,.95),roughness:.92,vertexColors:true,side:T.DoubleSide});
    m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',
      `vec3 scan=texture2D(map,vMapUv*.39).rgb;
       float mineral=dot(scan,vec3(.28,.62,.1));
       float dip=vMapUv.y*2.8+.46*sin(vMapUv.x*.8)+.18*sin(vMapUv.x*2.2);
       float grains=dot(texture2D(map,vMapUv*1.18).rgb,vec3(.28,.62,.1));
       float oxidation=texture2D(map,vMapUv*.095+vec2(.33,.71)).g;
       float crack=1.-smoothstep(.018,.11,abs(fract(dip+mineral*1.9)-.5));
       crack*=smoothstep(.035,.115,oxidation);
       float fade=1.-smoothstep(.14,.72,fwidth(dip));
       diffuseColor.rgb*=clamp(.32+5.7*mineral+2.6*grains-.20*crack*fade,.28,1.60);
       diffuseColor.rgb*=mix(vec3(.65,.73,.68),vec3(1.12,1.06,.99),smoothstep(.028,.095,oxidation));`);};
    return m;
  }
  function waterMaterial(T,fall,limestone=false){
    // Use the normal renderer lighting; moving highlights are visible on the
    // sheets and the downstream pool even when viewed from the riverbank.
    const m=new T.MeshPhongMaterial({vertexColors:true,side:T.DoubleSide,specular:0xa3bdb9,shininess:fall?19:54,
      transparent:true,depthWrite:false});
    const clock={value:0},quiet=matchMedia('(prefers-reduced-motion: reduce)');
    m.onBeforeRender=()=>{clock.value=quiet.matches?0:(performance.now()%600000)*.001;};
    m.customProgramCacheKey=()=>fall?'hydro-falling-water':limestone?'hydro-shallow-stream':'hydro-pool-water';
    m.onBeforeCompile=s=>{
      s.uniforms.streamClock=clock;
      const vary='varying vec2 streamUV; varying float waterCoverage;\n';
      s.vertexShader=vary+'attribute float coverage;\n'+s.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n streamUV=uv;waterCoverage=coverage;');
      s.fragmentShader=vary+`uniform float streamClock;
        float streamHash(vec2 p){vec3 h=fract(p.xyx*.1031);h+=dot(h,h.yzx+33.33);return fract((h.x+h.y)*h.z);}
        float streamNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(streamHash(i),streamHash(i+vec2(1,0)),f.x),mix(streamHash(i+vec2(0,1)),streamHash(i+1.),f.x),f.y);}
        `+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+(fall?
          `vec2 flow=vec2(streamUV.x,streamUV.y+streamClock*3.8);
           float fold=streamNoise(flow*vec2(1.8,.34));
           float filaments=streamNoise(flow*vec2(13.,.83)+fold*2.);
           filaments=mix(filaments,.5,smoothstep(.06,.25,fwidth(flow.x)));
           float aeration=clamp(.46*fold+.65*filaments,0.,1.);
           diffuseColor.rgb=mix(diffuseColor.rgb*.71,vec3(.83,.90,.86),aeration*.76);
           diffuseColor.a=waterCoverage*mix(.38,.97,smoothstep(.21,.80,aeration));`:
          `vec2 p=streamUV;float r=length(p*vec2(.61,1.));
           float drift=streamNoise(p*.54+vec2(0.,-streamClock*.52));
           float ripple=sin(p.y*6.5+p.x*1.4-streamClock*2.6+drift*4.);
           float eddy=sin(r*6.1-streamClock*3.7+drift*4.);
           float nearFall=exp(-r*.17);
           float light=pow(max(0.,mix(ripple,eddy,nearFall)),5.);
           diffuseColor.rgb+=vec3(.08,.13,.12)*light*${limestone?'.22':'1.'}*(1.-smoothstep(.12,.63,fwidth(r)));
           diffuseColor.a=waterCoverage*(.79+.16*drift);`));
    };
    return m;
  }
  // Indexed grids retain a shared normal at neighbouring samples. Each stored
  // point can blend between local terrain and a level pool/cave datum. Rebuilds
  // always use the original section, never accumulate the previous deformation.
  function surface(T,group,parts,material,section=false){
    const p=[],uv=[],c=[],weight=[],coverage=[],indices=[],colour=new T.Color();
    function grid(nx,ny,sample){
      const first=p.length/3;
      for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
        const [x,y,z,u,v,tint,mix,alpha=1]=sample(i/nx,j/ny);
        p.push(x,y,z);uv.push(u,v);colour.setHex(tint);c.push(colour.r,colour.g,colour.b);
        weight.push(mix);if(material.transparent)coverage.push(alpha);
        if(i&&j){const k=first+j*(nx+1)+i;indices.push(k-nx-2,k-1,k-nx-1,k-1,k,k-nx-1);}
      }
    }
    function finish(){
      if(!indices.length){material.dispose();return;}
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(p,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(indices);
      if(coverage.length)g.setAttribute('coverage',new T.Float32BufferAttribute(coverage,1));
      g.computeVertexNormals();g.computeBoundingSphere();
      const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;mesh.castShadow=material.isMeshStandardMaterial;
      if(material.transparent)mesh.renderOrder=material.customProgramCacheKey()==='hydro-falling-water'?2:1;
      mesh.userData.surveySection=section;
      group.add(mesh);parts.push({g,ys:Float32Array.from(weight,(_,i)=>p[3*i+1]),weight,section});
    }
    return {grid,finish};
  }
  function tint(a,b,t){
    const k=clamp(t,0,1);
    return (Math.round((a>>16)*(1-k)+(b>>16)*k)<<16)+
      (Math.round((a>>8&255)*(1-k)+(b>>8&255)*k)<<8)+Math.round((a&255)*(1-k)+(b&255)*k);
  }
  function stone(x,y,z,phase,wet){
    const moss=Math.sin(x*.63+y*.34+phase)*Math.sin(z*.57-y*.49)+.22*Math.sin(x*2.56-y*.83);
    const grain=.5+.5*Math.cos(y*3.5+Math.sin(x*.31+phase)*.48+z*.12);
    return tint(tint(wet?0x666b65:0xaaa799,wet?0x909283:0xc4bca8,grain*.7),wet?0x55635b:0x82906b,Math.max(0,moss));
  }
  function stones(rock,ridges,phase){
    for(const [cx,cz,rx,h,rz] of ridges){
      rock.grid(14,6,(u,v)=>{
        const theta=u*Math.PI*2,lat=v*Math.PI/2;
        const n=1+.093*Math.sin(theta*3+phase)*Math.cos(lat*2)+.047*Math.cos(theta*7+lat);
        const x=cx+rx*n*Math.cos(lat)*Math.cos(theta),z=cz+rz*n*Math.cos(lat)*Math.sin(theta);
        const y=-.15+h*Math.sin(lat)*(1+.12*Math.sin(theta)*Math.cos(lat));
        return [x,y,z,x*.47,(y+z*.36)*.53,stone(x,y,z,phase,true),0];
      });
    }
  }
  // Reuse one cutout texture for bank vegetation. Cards root in the same
  // weighted bedrock samples as the stepped bank so they follow terrain loads.
  function bankFerns(T,group,parts,roots,phase){
    const plants=surface(T,group,parts,new T.MeshLambertMaterial({
      map:map(T,'bank-fern.webp',true),alphaTest:.40,vertexColors:true,side:T.DoubleSide
    }));
    for(let i=0;i<roots.length;i++){
      const [x,y,z,size,weight]=roots[i],turn=phase+i*2.39996;
      for(let card=0;card<2;card++){
        const a=turn+card*1.43,dx=Math.cos(a)*size,dz=Math.sin(a)*size;
        plants.grid(2,1,(u,v)=>{
          const t=u*2-1,lean=.12*v*(1-t*t);
          return [x+t*dx+lean*dz,y+size*v*.95-.036,z+t*dz-lean*dx,u,v,card?0xdddfc9:0xd1dabf,weight];
        });
      }
    }
    plants.finish();
  }
  function groundFit(group,parts,z,entrance=false){
    group.userData.fitGround=ground=>{
      const datum=ground(0,z);
      for(const {g,ys,weight,section} of parts){
        const pos=g.attributes.position;
        for(let i=0;i<pos.count;i++){
          const local=ground(pos.getX(i),pos.getZ(i));
          // The underlying terrain remains drivable. Follow an uphill cave
          // floor and emerging streambed where a level section would disappear.
          const base=!section&&(entrance||ys[i]<.2)?Math.max(datum,local):datum;
          pos.setY(i,ys[i]+local+(base-local)*weight[i]);
        }
        pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
      }
    };
  }
  function watercourse(profile){
    // Preserve downstream bends present in the sampled mapped line. Samples
    // may coincide when a way begins or ends at the falls.
    const sin=Math.sin(profile.yaw),cos=Math.cos(profile.yaw);
    const trace=profile.trace.map(([east,south])=>[east*cos-south*sin,east*sin+south*cos]);
    if(!trace.length)return ()=>0;
    const [east,south]=profile.traceOrigin??profile.trace[2];
    const cx=east*cos-south*sin,cz=east*sin+south*cos;
    const pts=[];
    for(const [x,z] of trace)if(!pts.length||z-cz>pts.at(-1)[1]+.1)pts.push([x-cx,z-cz]);
    return z=>{
      if(z<pts[0][1])return pts[0][0];
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i];
        if(z>=a[1]&&z<=b[1])return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);
      }
      return pts.at(-1)[0];
    };
  }
  // A short reach of the mapped Hiêu stream. The DEM sets the fall between
  // successive pools. The width and shapes of the encrusted sills are estimated.
  function limestoneSteps(T,group,p){
    const parts=[],centre=watercourse(p),levels=[-20,-14.2,-8.5,-1.1,4.8,12.1,20];
    const rock=surface(T,group,parts,rockMaterial(T)),pool=surface(T,group,parts,waterMaterial(T,false,true));
    const whitewater=surface(T,group,parts,waterMaterial(T,true));
    const width=z=>p.width*(.88+.21*Math.sin(z*.49)+.12*Math.cos(z*.73+.4));
    const bend=(x,z)=>.83*Math.sin(.68*x+.14*z)+.26*Math.cos(1.5*x-.12*z);
    const fade=z=>clamp((20-Math.abs(z))/2,0,1);
    rock.grid(32,128,(u,v)=>{
      const z=40*v-20,bank=u*2-1,half=width(z),x=bank*(half+2.4);
      const edge=Math.abs(bank),ripple=Math.cos(x*2.1+z*.91)*Math.sin(z*1.5-x);
      const shoulder=clamp((Math.abs(x)-half*.68)/1.2,0,1);
      const station=z-bend(x,z),moss=.5+.5*Math.sin(x*1.3+.3*z)*Math.sin(z*.94-x*.4);
      let sill=0;
      for(let i=1;i<levels.length;i++){
        const lip=levels[i]-(levels[i]-levels[i-1])*.36;
        sill=Math.max(sill,Math.exp(-((station-lip)**2)*2.1));
      }
      const y=(-.16+shoulder*(.24+.33*ripple)+.16*ripple+sill*(.23+.34*moss))*(1-edge**6)-.24*edge**6;
      const colour=tint(tint(0x807257,0xa19673,shoulder),0x626b38,moss*(.44+.51*sill));
      return [centre(z)+x,y,z,x*.53,z*.54,colour,fade(z)*(1-edge**5)];
    });
    pool.grid(28,128,(u,v)=>{
      const z=40*v-20,across=u*2-1,x=across*width(z);
      const edge=Math.abs(across),opacity=fade(z)*clamp((1-edge)*5,0,1);
      const mineral=.48+.22*Math.sin(x*1.3+z*.42)+.21*Math.cos(z*.73-x*.82);
      return [centre(z)+x,.035,z,x,z,tint(0x385d4b,0x8d9667,mineral+.22*edge),fade(z),opacity*.83];
    });
    for(let i=1;i<levels.length;i++){
      const length=levels[i]-levels[i-1];
      for(let run=0;run<5;run++){
        whitewater.grid(4,12,(u,v)=>{
          const station=levels[i-1]+length*(.57+v*.42);
          const across=-.89+(run+u*.85)*.36,x=across*width(station);
          const z=station+bend(x,station);
          const strength=Math.sin(v*Math.PI)*(.35+.58*Math.sin(u*Math.PI))*(.72+.28*Math.cos(2*x+i));
          return [centre(z)+x,.075,z,x,-z,0xceebdb,fade(z),fade(z)*strength];
        });
      }
    }
    const roots=[],ridges=[];
    for(let i=0;i<36;i++){
      const z=-19+(i*13.81)%38,side=i%2?1:-1,phase=i*2.39996;
      const x=centre(z)+side*(width(z)+.6+1.1*Math.cos(phase));
      const radius=.42+.67*(.5+.5*Math.sin(phase));
      ridges.push([x,z,radius*1.35,radius*(.53+.28*Math.cos(z)),radius]);
      roots.push([x+side*(1.1+radius),.06,z,.72+.49*Math.sin(z*.31)**2,0]);
    }
    stones(rock,ridges,1.39);
    rock.finish();pool.finish();whitewater.finish();bankFerns(T,group,parts,roots,1.39);
    // Woodland closes over the upper reach in field photographs. Leave the
    // downstream bank open for both visitor cameras.
    const woods=[[-7.4,-10,8.6],[8.6,-8.5,10],[-9,-16.7,11.2],[6.4,-18,8.8],
      [1.6,-22.6,9.3],[-4.1,-25,11.4],[12,-19,9.5],[-12,-4.6,8.8],[-8.2,4.3,6.6]];
    const firstTree=group.children.length;
    window.CentralArch.trees(T,{group},woods.map(([x,z,h])=>({x:centre(z)+x,z,h,width:h*.83})));
    const trees=group.children.slice(firstTree);
    group.userData.fitGround=ground=>{
      for(const {position} of trees)position.y=ground(position.x,position.z);
      const heights=levels.map(z=>ground(centre(z),z));
      for(const {g,ys,weight} of parts){
        const pos=g.attributes.position;
        for(let i=0;i<pos.count;i++){
          const x=pos.getX(i),z=pos.getZ(i),mix=weight[i];
          if(mix===0){pos.setY(i,ground(x,z)+ys[i]);continue;}
          const station=clamp(z-bend(x-centre(z),z),levels[0],levels.at(-1));
          let reach=1;
          while(reach<levels.length-1&&station>levels[reach])reach++;
          const t=(station-levels[reach-1])/(levels[reach]-levels[reach-1]);
          const face=clamp((t-.58)/.36,0,1),drop=.18*t+.82*face*face*(3-2*face);
          const waterline=heights[reach-1]+drop*(heights[reach]-heights[reach-1])+.34;
          const base=mix===1?waterline:ground(x,z)*(1-mix)+waterline*mix;
          pos.setY(i,base+ys[i]);
        }
        pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
      }
    };
  }
  function waterfall(T,group,p,seed){
    const parts=[],rock=surface(T,group,parts,rockMaterial(T)),sheets=surface(T,group,parts,waterMaterial(T,true)),
      pool=surface(T,group,parts,waterMaterial(T,false)),w=p.width,h=p.height,centre=watercourse(p);
    const roots=[];
    const tiers=p.form==='cascade'?3:p.form?1:p.heightSource==='estimate'&&p.grade>.30&&p.grade<.82&&h>4?3:h>2.8&&p.grade<.32?2:1;
    const ledge=clamp(w*.22+h*.13,1,9)*(tiers>1?1.3:1),undercut=p.form==='overhang';
    const dz=ledge/tiers,spread=clamp(w*.31+h*.09,1.8,13),phase=(seed%1597)*.013;
    const lip=x=>clamp(w*.097,.26,1.75)*(Math.sin(x/Math.max(2,w)*11+phase)*.75+Math.cos(x*.86+phase)*.24);
    const xAt=(x,z)=>x+centre(z);
    const toe=ledge-.68*dz,pz=toe+spread*.47;
    function cross(x,back){return x*(1-.14*back)+.02*w*Math.sin(phase+back*2.7);}
    for(let j=0;j<tiers;j++){
      const back=1-j/tiers,z0=dz*j,y0=h*back,y1=h*(back-1/tiers),half=w*(.53+.09*j/tiers);
      function point(u,v,shelf) {
        const x=cross((u-.5)*2*half,back),r=lip(x),z=z0+r+(shelf?-dz*(1-v):dz*.32*v);
        const grain=.12*Math.cos(x*3.4+phase)+.08*Math.sin(z*3.7+x*.17);
        const y=(shelf?y0:y0+(y1-y0)*v)+grain;
        return [xAt(x,z),y,z];
      }
      for(const shelf of [false,true])rock.grid(36,shelf?4:16,(u,v)=>{
        const [x,y,face]=point(u,v,shelf);
        const recess=shelf?0:Math.sin(Math.PI*v)**.71*Math.sin(Math.PI*u)**.7*clamp(w*.22,1,6);
        const z=face-(undercut?recess:0)+(shelf?0:Math.sin(y*2.7+x*.3)*.11);
        const colour=stone(x,y,z,phase,true);
        return [x,y,z,x*.38,(y+z*.47)*.43,undercut?tint(colour,0x454b46,clamp(recess*.23,0,.8)):colour,1];
      });
      const runs=clamp(Math.ceil(w/.54),8,100);
      for(let k=0;k<runs;k++){
        const f=(k+.5)/runs;
        const distribution=Math.sin(f*12+phase)+.53*Math.sin(f*23-phase+j*.2)+.34*Math.cos(f*42+j);
        if(distribution<(p.intermittent?.19:p.form==='dry-season'?-.4:-1.06))continue;
        sheets.grid(2,9,(u,v)=>{
          const drop=v*v,fraction=(k+u)/runs,[x,y,z]=point(fraction,drop,false);
          const twist=Math.sin(fraction*33+phase+drop*3);
          const flare=(fraction-.5)*w*.13*drop+twist*.06*w*drop;
          const arc=(v-drop)*Math.min(3.1,.63*h/tiers);
          const aeration=clamp(.15+drop*.61+.16*distribution+.13*twist,.05,1);
          return [x+flare,y+.09,z+.18+arc+drop*twist*.10,x,y,
            tint(0x638c8a,0xe5ece6,aeration),1,.82+.15*drop];
        });
        sheets.grid(1,2,(u,v)=>{
          const [x,y,z]=point((k+u)/runs,.52+v*.48,true);
          return [x,y+.08,z,x,z,0x78a6a5,1];
        });
      }
    }
    // Banks feather down to the rendered relief. A short upstream apron
    // joins the waterfall crest without standing like a wall across the valley.
    const backDepth=Math.max(ledge*1.8,w*.25,h*.59);
    rock.grid(26,8,(u,v)=>{
      const x=(u-.5)*1.18*w,z=lip(x)-dz-backDepth*v;
      const y=h*(1-v)**.6+.12*Math.sin(x+phase)*(1-v)-.18*v;
      return [xAt(x,z),y,z,x*.42,z*.41,stone(x,y,z,phase,true),1-v];
    });
    for(const side of [-1,1]){
      const breadth=w*.29+h*.45+2.1;
      function bluff(u,v,cap){
        const x=side*(w*.44+breadth*u);
        const shoulder=.49+.13*Math.cos(phase+side);
        const t=clamp((u-shoulder)/(1-shoulder),0,1);
        const margin=1-t*t*(3-2*t);
        const joint=.5+.5*Math.cos(u*17+phase+side);
        const height=h*(1+.12*Math.sin(u*5+phase+side)+.045*joint)*margin;
        const line=lip(x)+toe*(.69+.28*Math.sin(u*8+phase))+u*w*.075;
        const y=height*(cap?1-v**1.7:1-v),exposure=h*.045+.12;
        const band=Math.cos(y/Math.max(h*.10,.38)+Math.sin(x*.27+phase)*.57);
        const shelf=clamp((band+.37)*2.8,0,1);
        const ledgeJoint=(shelf*.83+joint*.64-.48)*exposure;
        const front=line+v*(h*.10+.6)+ledgeJoint;
        const z=cap?line+ledgeJoint*(1-v)-(backDepth+dz)*v:front;
        const factor=margin*(cap?1-v:1);
        const colour=tint(stone(x,y,z,phase,false),0x5f6258,Math.max(0,-band)*.37);
        return [xAt(x,z),y-.16*(1-factor),z,x*.47,(y+z*.43)*.45,colour,factor];
      }
      rock.grid(24,24,(u,v)=>bluff(u,v,false));
      rock.grid(24,8,(u,v)=>bluff(u,v,true));
      for(let i=0;i<28;i++){
        const u=.05+.91*((i*.618+Math.abs(Math.sin(phase+side)))%1);
        const t=.05+.73*((i*.386+Math.abs(Math.cos(phase-side)))%1);
        const [x,y,z,,,,weight]=bluff(u,t,true);
        roots.push([x,y,z,.42+.62*Math.abs(Math.sin(phase+i*.69)),weight]);
      }
    }
    // A shallow elliptical pool abuts the foot of the last fall. Vary the
    // colour and foam by depth, with quiet margins against exposed bedrock.
    if(!p.mappedPool)pool.grid(54,11,(u,v)=>{
      const a=Math.PI*2*u,shore=1+.13*Math.sin(a*3+phase)+.074*Math.sin(a*7-phase);
      const x=Math.cos(a)*v*(w*.62+spread*.29)*shore,z=pz+Math.sin(a)*v*(spread+.67)*shore;
      const y=.12+.014*Math.sin(v*18+phase)*(1-v);
      const foam=clamp(1-Math.abs(z-toe)/Math.max(1,spread*.7),0,1)*(1-v*.65);
      return [xAt(x,z),y,z,x,z-toe,tint(tint(0x396360,0x687f71,v),0xc9dfd7,foam*.76),1,1-clamp((v-.77)/.23,0,1)];
    });
    const stonesAt=[];
    for(let i=0;i<13;i++){
      const sign=i%2?1:-1,angle=phase+i*2.4,size=.15+spread*(.07+.115*(.5+.5*Math.sin(angle)));
      stonesAt.push([sign*(w*.54+spread*.45*Math.sin(angle)),toe+spread*.6+spread*.81*Math.cos(angle),
        size*1.57,size*.83,size]);
    }
    stones(rock,stonesAt,phase);
    rock.finish();sheets.finish();pool.finish();
    bankFerns(T,group,parts,roots,phase);groundFit(group,parts,pz);
  }
  function cave(T,group,p,seed){
    const parts=[],rock=surface(T,group,parts,rockMaterial(T)),w=p.width,h=p.height,phase=(seed%2377)*.014;
    const wing=Math.max(w*1.72,3.6),depth=clamp(w*1.47+h*.32,2.3,19),asymmetry=Math.sin(phase)*.18;
    const skew=.09*Math.cos(phase*.71),fissure=p.form==='fissure',basalt=p.form==='basalt';
    function mouth(x){
      const t=x/(w*.5),u=clamp(t,-1,1);
      const dome=fissure?1-Math.abs(u+skew*(1-u*u)):Math.pow(1-Math.abs(u)**(basalt?3.2:2.25),.54);
      const fracture=.086*Math.sin(7*u+phase)+.037*Math.cos(17*u-phase*.4);
      return Math.abs(t)>=1?0:h*dome*(1+u*asymmetry+fracture);
    }
    function front(x,v){
      const side=x<0?-1:1;
      const outer=clamp((wing-Math.abs(x))/(wing*(.43+.09*Math.sin(phase+side))),0,1);
      const flank=outer*outer*(3-2*outer),base=mouth(x);
      const crest=h*(1.47+.20*Math.cos(x/(w*.68)+phase)+.12*Math.sin(x/(w*.22)+phase*.76));
      const level=Math.max(base+h*.19,crest)*flank;
      const y=base+(level-base)*v-.16*(1-flank);
      const dip=x*.17+y+phase,scale=Math.max(.26,Math.min(h*.14,1.7));
      const bed=dip/scale-Math.floor(dip/scale),ledge=(1-Math.abs(bed*2-1))*Math.min(.17,h*.03);
      const recess=clamp(.60-.60*Math.cos(x/Math.max(.73,w*.16)+phase),0,1);
      const z=.19*Math.sin(x*1.57+y*.61+phase)+Math.min(1.4,w*.2)*Math.cos(x/Math.max(1,w*.48)+phase)
        +ledge+v*(1-v)*h*.54*recess-v*v*h*.41;
      return [x,y,z];
    }
    rock.grid(54,13,(u,v)=>{
      const [x,y,z]=front((u*2-1)*wing,v);
      const colour=stone(x,y,z,phase,false);
      return [x,y,z,x*.59,(y-z*.39)*.57,p.form==='basalt'?tint(colour,0x474a42,.67):colour,1-clamp((Math.abs(x)-w*.5)/wing,0,1)];
    });
    // An exterior approach establishes the mouth, not an underground bend.
    // Only extend along a passage if the survey actually traces one.
    const passage=p.evidence==='passage'&&p.trace?.length>1;
    const sin=Math.sin(p.yaw),cos=Math.cos(p.yaw);
    const path=passage?p.trace.map(([e,s])=>[e*cos-s*sin,e*sin+s*cos]):[];
    if(!passage)path.push([0,0],[0,-.65]);
    const sections=[[0,0,0]];
    for(let i=1;i<path.length;i++){
      const [ax,az]=path[i-1],dx=path[i][0]-ax,dz=path[i][1]-az,len=Math.hypot(dx,dz);
      const count=Math.ceil(len/2),along=sections.at(-1)[2];
      for(let j=1;j<=count;j++)sections.push([ax-path[0][0]+dx*j/count,az-path[0][1]+dz*j/count,along+len*j/count]);
    }
    const last=sections.length-1,length=sections[last][2]||1;
    function interior(x0,t){
      const i=Math.round(t*last),[dx,dz,distance]=sections[i],v=distance/length;
      const prev=sections[Math.max(0,i-1)],next=sections[Math.min(last,i+1)];
      const tx=next[0]-prev[0],tz=next[1]-prev[1],span=Math.hypot(tx,tz)||1;
      const lateral=x0*(1-v*.27),mouthZ=front(x0,0)[2]*Math.max(0,1-distance/2);
      return [dx+lateral*(i?-tz/span:1),dz+mouthZ+lateral*(i?tx/span:0),v];
    }
    const lining=surface(T,group,parts,rockMaterial(T),true);
    lining.grid(32,Math.max(1,last),(u,t)=>{
      const x0=(u-.5)*w,[,lipY]=front(x0,0),[x,z,v]=interior(x0,t);
      const y=lipY*(1-.18*v)+.08*Math.sin(v*11+u*14+phase)*Math.sin(v*Math.PI);
      return [x,y,z,(x+z*.37)*.61,(z+y*.36)*.54,tint(0x999b8c,0x272f2c,v**.64),1];
    });
    lining.grid(32,4,(u,v)=>{
      const x0=(u-.5)*w,[,y]=front(x0,0),[x,z]=interior(x0,1);
      return [x,y*.82*(1-v),z,
        u*3,v*2,0x252b28,1];
    });
    lining.grid(22,Math.max(1,last),(u,t)=>{
      const [x,z,v]=interior((u-.5)*w,t),y=.092+.024*Math.sin(x*3+v*15)*v;
      return [x,y,z,x*.53,z*.53,tint(0x827e69,0x242b26,v**.55),1];
    });
    lining.finish();
    rock.grid(38,8,(u,v)=>{
      const [x,y,z]=front((u*2-1)*wing,1);
      return [x,(1-v)**.82*y-.23*v,z-v*depth*1.03,x*.53,(z-v*depth)*.57,stone(x,y,z-v*depth,phase,false),1-v];
    });
    // Eroded flanks extend out of the cliff face. Detached blocks overlap its
    // foot and bury the wall edge; the mapped opening remains clear.
    const rocks=[];
    for(const side of [-1,1]){
      const breadth=wing-w*.55;
      for(let i=0;i<5;i++){
        const t=(i+.45)/5,x=side*(w*.6+breadth*t),crest=front(x,1)[1];
        const mass=Math.max(.18,crest*(.36+.18*Math.sin(phase+i*2.1+side)));
        const cx=x+side*.11*w;
        const cz=front(x,.35)[2]+.04*w;
        rock.grid(18,8,(u,v)=>{
          const a=u*Math.PI*2;
          const face=Math.abs(Math.cos(a+.4*i))*.78+Math.abs(Math.sin(a+.4*i))*.56;
          const strata=(1+.068*Math.sin(15*v+2*a+phase)+.065*Math.cos(6*a+i))/Math.max(.7,face);
          const radius=(1-v*.24)*strata*Math.min(1,(1-v)*5);
          const px=cx+(breadth*.24+.18)*radius*Math.cos(a)+side*v*w*.075;
          const pz=cz+(.45+.27*w)*(1+.25*Math.sin(i+phase))*radius*Math.sin(a)-v*w*.12;
          const py=mass*Math.min(1,v*1.22)*(1+.14*Math.cos(a+phase)*radius)-.22;
          return [px,py,pz,px*.54,(py+.32*pz)*.58,stone(px,py,pz,phase,false),1-t*.6];
        });
      }
      for(let i=0;i<12;i++){
        const k=(i*.618+.19)%1,sz=.18+(.33+.28*Math.cos(phase+i*2.7))*Math.min(2,w*.39);
        rocks.push([side*(w*.59+k*breadth),.29+Math.sin(i*2.4+phase)*1.03+sz,sz*1.41,sz*.86,sz]);
      }
    }
    stones(rock,rocks,phase);rock.finish();
    const roots=[];
    for(let i=0;i<52;i++){
      const x=wing*((i*.61803399%1)*1.84-.92),v=(i*.393+Math.abs(Math.cos(phase)))%1;
      const [,crest,z]=front(x,1);
      roots.push([x,crest*(1-v)**.82-.23*v,z-v*depth*1.03,.32+.42*Math.abs(Math.cos(i+phase)),1-v]);
    }
    bankFerns(T,group,parts,roots,phase);groundFit(group,parts,0,true);
  }
  // Initial views through clearings in the local tree cover (yaw offset, elevation).
  const clearingViews={
    'osm-node-7790401185':[-.46,.64],
    'osm-node-9811545028':[0,.46],
    'osm-node-9789872321':[0,.46]
  };
  const authored=new Set((window.VietnamSights||[]).map(s=>s.catalogId||s.id));
  for(const [id,p] of Object.entries(profiles)){
    if(authored.has(id))continue;
    const site=byId.get(id);
    if(!site)continue;
    const isCave=site.kind==='Hang động',seed=Number(id.slice(id.lastIndexOf('-')+1))||1;
    const span=isCave?Math.max(p.width*3.3,8.3):Math.max(10,p.width*2.25+p.height*.44);
    const [viewOffset,viewElevation]=clearingViews[id]||(isCave?[.14,.18]:[.28,.25]);
    const widthText=p.widthSource==='tag'?' Bề rộng trên bản đồ là '+p.width+' m.':p.widthSource==='published'?' Bề rộng tham khảo khoảng '+p.width+' m.':'';
    const heightText=p.heightSource==='tag'?' Chiều cao được ghi trên bản đồ là '+p.height+' m.':p.heightSource==='published'?' Chiều cao tham khảo khoảng '+p.height+' m.':'';
    const axisText=isCave?(p.evidence==='direction'?'Hướng cửa hang lấy từ ký hiệu bản đồ.':
      p.evidence==='passage'?'Góc nhìn hướng vào đoạn hang có lối ngầm đã lập bản đồ.':'Góc nhìn theo lối đi bộ đã lập bản đồ tới cửa hang.'):
      'Dòng thác đổ theo hướng của '+(p.evidence==='river'?'đoạn sông':'con suối')+' trên bản đồ.';
    const seasonal=p.form==='dry-season'?' Mô hình thể hiện dòng chảy mùa khô.':'';
    (window.VietnamSights??=[]).push({...site,id,catalogId:id,surveyed:true,source:p.reference??(p.way?'https://www.openstreetmap.org/way/'+p.way:site.map),
      photo:reference[id]?.photo??site.photo,width:span,depth:span*.82,solids:[],yaw:p.yaw,
      reserve(x,z,pad=0){
        if(p.form==='limestone-steps')return Math.abs(z)<20+pad&&Math.abs(x)<p.width+pad;
        const across=(isCave?p.width*.62:p.width*.65+1.7)+pad;
        const along=(isCave?1.5:Math.min(19,p.width*.34+p.height*.15+2))+pad;
        return (x/across)**2+(z/along)**2<1;
      },
      viewAngle:p.yaw+viewOffset,viewElevation,viewRadius:Math.max(isCave?7:13,span*.95,p.height*1.95),
      description:axisText+heightText+widthText+seasonal+(isCave?' Hình dáng vách đá ở cửa hang được ước dựng.':' Các bậc đá và dòng nước được ước dựng theo địa hình.'),
      build(T,{group}){
        if(p.form==='limestone-steps'){limestoneSteps(T,group,p);return;}
        if(isCave)cave(T,group,p,seed);else waterfall(T,group,p,seed);
        // Feather decorative rock returns into the terrain before the mapped
        // driving approach. Leave the measured opening and cascade untouched.
        const limit=Math.max(p.width*.66,site.approachMeters-6);
        if(limit>100)return;
        for(const mesh of group.children){
          if(mesh.userData.surveySection||mesh.material.transparent)continue;
          const pos=mesh.geometry.attributes.position;
          let changed=false;
          for(let i=0;i<pos.count;i++){
            const x=pos.getX(i),z=pos.getZ(i),radius=Math.hypot(x,z);
            if(radius<=limit)continue;
            pos.setXYZ(i,x*limit/radius,pos.getY(i),z*limit/radius);
            changed=true;
          }
          if(changed){pos.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}
        }
      }
    });
  }
})();
