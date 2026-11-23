/* Player feedback shared by Xuyên Việt and Cúp Bánh Mì. Simulation positions are
   stored in metres; only the GPU buffers use the renderer's local origin. */
window.createDrivingFX = function (T, scene, renderer) {
  'use strict';
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = new T.Group();
  root.name = 'Driving feedback';
  scene.add(root);
  let ox = 0, oz = 0, clock = 0, boostLevel = 0, kick = 0, kickX = 0, kickZ = 0;
  let smokeFraction = 0, sprayFraction = 0, skidDistance = 0, lastCar = null;
  const temp = new T.Object3D();

  // Cross-section narrows downstream, with a little turbulence in the outer edge.
  const flameGeometry = new T.BufferGeometry(), flameVerts = [], flameUV = [];
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      for (const [u, t] of [[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]]) {
        const v = t/12, a = u/12*Math.PI*2;
        const radius = (.064 + .075*Math.sin(Math.PI*Math.min(1,v*2))) * (1-v*.97);
        flameVerts.push(Math.cos(a)*radius,Math.sin(a)*radius,v);
        flameUV.push(u/12,v);
      }
    }
  }
  flameGeometry.setAttribute('position',new T.Float32BufferAttribute(flameVerts,3));
  flameGeometry.setAttribute('uv',new T.Float32BufferAttribute(flameUV,2));
  const flameMaterial = new T.ShaderMaterial({
    uniforms:{time:{value:0},power:{value:0}},
    vertexShader:'varying vec2 vUv;uniform float time,power;void main(){vUv=uv;vec3 p=position;p.x+=sin(time*26.+p.z*18.)*.023*p.z;p.y+=sin(time*36.-p.z*11.)*.021*p.z;p.z*=.45+power*(.82+.18*sin(time*44.)+.075*sin(time*81.));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader:'varying vec2 vUv;uniform float time,power;void main(){float v=vUv.y;float pulse=.5+.5*cos(v*30.-time*43.);vec3 c=mix(vec3(.72,1.,1.),vec3(.09,.64,1.),smoothstep(.01,.38,v));c=mix(c,vec3(.57,.23,1.),smoothstep(.40,.91,v));float a=(1.-v)*(.76+.22*pulse)*power;gl_FragColor=vec4(c*(1.1+.45*pulse),a);}',
    transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false
  });
  // Outlets in the authored model's local metres, with its nose pointing +Z.
  const outlets={
    supercar:{x:0,y:.32,z:-2.35,width:2.35,height:.78},
    'muscle-car':{x:-.56,y:.25,z:-2.34,width:.56,height:.56},
    rally:{x:-.50,y:.28,z:-2.02,width:.70,height:.70}
  };
  const exhaust=new T.Group(),jet=new T.Mesh(flameGeometry,flameMaterial);
  jet.rotation.y=Math.PI;exhaust.add(jet);
  const glow = new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({
    uniforms:{power:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;uniform float power;void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(.08,.46,1.,power*.4*(1.-smoothstep(.0,1.,r)));}',
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false
  }));
  glow.rotation.x=-Math.PI/2;glow.scale.set(1.35,1.65,1);exhaust.add(glow);
  function mountExhaust(model,kind){
    const outlet=outlets[kind],parent=outlet?model:null;
    if(exhaust.parent===(parent??null))return;
    exhaust.removeFromParent();
    if(!parent)return;
    jet.position.set(outlet.x,outlet.y,outlet.z);
    jet.scale.set(outlet.width,outlet.height,1);
    glow.position.set(outlet.x,.06,outlet.z-.48);
    parent.add(exhaust);
  }
  function boostFov(active,inside){
    return active&&!reduced.matches?(inside?2:5):0;
  }

  const smokeCapacity=96, smoke=Array.from({length:smokeCapacity},()=>({life:0}));
  let smokeIndex=0;
  const smokeGeo=new T.BufferGeometry();
  const positions=new Float32Array(smokeCapacity*3), colors=new Float32Array(smokeCapacity*3);
  const sizes=new Float32Array(smokeCapacity), opacity=new Float32Array(smokeCapacity), seeds=new Float32Array(smokeCapacity);
  for(const [name,data,dim] of [['position',positions,3],['tint',colors,3],['size',sizes,1],['alpha',opacity,1],['seed',seeds,1]])
    smokeGeo.setAttribute(name,new T.BufferAttribute(data,dim).setUsage(T.DynamicDrawUsage));
  const smokeMat=new T.ShaderMaterial({
    uniforms:{pixels:{value:680}},
    vertexShader:'attribute vec3 tint;attribute float size,alpha,seed;uniform float pixels;varying vec3 col;varying float a,noiseSeed;void main(){col=tint;a=alpha;noiseSeed=seed;vec4 v=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(size*pixels*projectionMatrix[1][1]/max(1.,-v.z),1.,160.);}',
    fragmentShader:'varying vec3 col;varying float a,noiseSeed;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec2 p=gl_PointCoord*2.-1.;float n=noise(4.*p+noiseSeed)+.44*noise(9.*p-noiseSeed);float density=(1.-smoothstep(.2,1.,length(p)+.20*(.7-n)))*(.31+.5*n);gl_FragColor=vec4(col,a*density);}',
    transparent:true,depthWrite:false,toneMapped:false
  });
  const puffs=new T.Points(smokeGeo,smokeMat);puffs.frustumCulled=false;puffs.renderOrder=3;root.add(puffs);
  function puff(x,y,z,dx,dy,dz,size,life,color,alpha){
    const i=smokeIndex++%smokeCapacity;
    Object.assign(smoke[i],{x,y,z,dx,dy,dz,size,life,total:life,alpha});
    colors.set(color,i*3);seeds[i]=Math.random()*95;
  }

  const sparkCount=72, sparks=Array.from({length:sparkCount},()=>({life:0}));
  let sparkIndex=0;
  const sparkPos=new Float32Array(sparkCount*6),sparkColor=new Float32Array(sparkCount*6);
  const sparkGeo=new T.BufferGeometry();
  sparkGeo.setAttribute('position',new T.BufferAttribute(sparkPos,3).setUsage(T.DynamicDrawUsage));
  sparkGeo.setAttribute('color',new T.BufferAttribute(sparkColor,3).setUsage(T.DynamicDrawUsage));
  const sparkMesh=new T.LineSegments(sparkGeo,new T.LineBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
  sparkMesh.frustumCulled=false;root.add(sparkMesh);
  const chipCount=36,chips=Array.from({length:chipCount},()=>({life:0}));let chipIndex=0;
  const chipMesh=new T.InstancedMesh(new T.TetrahedronGeometry(1),new T.MeshStandardMaterial({roughness:.30,metalness:.64}),chipCount);
  chipMesh.frustumCulled=false;chipMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(chipMesh);
  const chipTint=new T.Color();
  // The first impact already needs the instanced-colour shader. Allocate its
  // attribute before the departure screen warms that exact material variant.
  chipMesh.setColorAt(0,chipTint);
  chipMesh.instanceColor.setUsage(T.DynamicDrawUsage);

  // Local tyre ribbons join at the exact previous wheel contact, even in a turn.
  const markCount=440, marks=Array.from({length:markCount},()=>null),markGeo=new T.BufferGeometry();
  const marksXYZ=new Float32Array(markCount*18),marksUV=new Float32Array(markCount*12);
  const marksBorn=new Float32Array(markCount*6).fill(-100),marksLevel=new Float32Array(markCount*6);
  for(let i=0;i<markCount;i++)marksUV.set([0,0,1,0,1,1,0,0,1,1,0,1],i*12);
  for(const [name,array,size] of [['position',marksXYZ,3],['uv',marksUV,2],['born',marksBorn,1],['strength',marksLevel,1]])
    markGeo.setAttribute(name,new T.BufferAttribute(array,size));
  const markMat=new T.ShaderMaterial({
    uniforms:{now:{value:0}},
    vertexShader:'attribute float born,strength;uniform float now;varying float a;varying vec2 vUv;void main(){a=strength*(1.-smoothstep(10.,24.,now-born));vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying float a;varying vec2 vUv;void main(){float t=1.-smoothstep(.36,.50,abs(vUv.x-.5));float tread=.85+.15*cos(vUv.x*36.);gl_FragColor=vec4(.035,.033,.034,a*t*tread);}',
    transparent:true,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2
  });
  const ribbons=new T.Mesh(markGeo,markMat);ribbons.frustumCulled=false;ribbons.renderOrder=1;root.add(ribbons);
  let markIndex=0,previousAxle=null;
  function writeMark(i){
    const m=marks[i];if(!m)return;
    const {ax,ay,az,bx,by,bz,w}=m,dx=bx-ax,dz=bz-az,dl=Math.hypot(dx,dz)||1;
    const nx=-dz*w/dl,nz=dx*w/dl;
    const a0=[ax-ox-nx,ay+.038,az-oz-nz],a1=[ax-ox+nx,ay+.038,az-oz+nz];
    const b0=[bx-ox-nx,by+.038,bz-oz-nz],b1=[bx-ox+nx,by+.038,bz-oz+nz];
    marksXYZ.set([...a0,...a1,...b1,...a0,...b1,...b0],i*18);
  }
  function mark(ax,ay,az,bx,by,bz,strength){
    const i=markIndex++%markCount;
    marks[i]={ax,ay,az,bx,by,bz,w:.112};writeMark(i);
    marksBorn.fill(clock,i*6,i*6+6);marksLevel.fill(.67*strength,i*6,i*6+6);
    for(const key of ['position','born','strength'])markGeo.attributes[key].needsUpdate=true;
  }

  // Sparse air streaks remain outside the driving line and use real distance travelled.
  const airCount=24,airPoints=new Float32Array(airCount*6),airGeo=new T.BufferGeometry();
  const airPattern=Array.from({length:airCount},(_,i)=>({side:(i%2?1:-1)*(2.2+Math.random()*5),y:.6+Math.random()*3.2,phase:Math.random()*21}));
  airGeo.setAttribute('position',new T.BufferAttribute(airPoints,3).setUsage(T.DynamicDrawUsage));
  const air=new T.LineSegments(airGeo,new T.LineBasicMaterial({color:0xe2edf5,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));air.frustumCulled=false;root.add(air);
  let flow=0;

  function impact(x,z,nx,nz,strength,kind,groundY,cameraGain=1){
    const hit=clamp(strength||0,0,1);if(!hit)return;
    const y=Number.isFinite(groundY)?groundY:(lastCar?.y||0),ground=y;
    const len=Math.hypot(nx,nz)||1;nx=(nx||0)/len;nz=(nz||0)/len;
    if(hit*cameraGain>=kick){kick=hit*cameraGain;kickX=nx;kickZ=nz;}
    const metal=['car','vehicle','scooter','scrape','pole','rail','barrier'].includes(kind);
    const plaster=kind==='building'||kind==='wall';
    const water=kind==='water';
    const dustTint=water?[.76,.88,.92]:plaster?[.80,.73,.62]:metal?[.69,.66,.62]:[.65,.54,.38];
    for(let i=0;i<4+hit*12;i++){
      const lateral=(Math.random()-.5)*3;
      puff(x+(Math.random()-.5)*.45,y+.18+Math.random()*.55,z+(Math.random()-.5)*.45,
        nx*(.5+hit)+nz*lateral,.72+Math.random()*1.3,nz*(.5+hit)-nx*lateral,
        .28+Math.random()*.32, .7+Math.random()*.75,dustTint,.36+hit*.35);
    }
    if(water)for(let i=0;i<12+hit*34;i++){
      const a=Math.random()*Math.PI*2,r=.4+Math.random()*.9,v=(1.2+Math.random()*3.8)*(.55+hit);
      const dy=.8+Math.random()*(2.2+3.5*hit),life=dy*.21+.1;
      Object.assign(sparks[sparkIndex++%sparkCount],{water:true,x:x+Math.cos(a)*r,y:y+.12,z:z+Math.sin(a)*r,
        ground,dx:Math.cos(a)*v,dy,dz:Math.sin(a)*v,life,total:life});
    }
    if(metal)for(let i=0;i<3+hit*32;i++){
      const v=(1+Math.random()*8)*(.45+hit),side=(Math.random()-.5)*(3+hit*13),life=.13+Math.random()*.38;
      Object.assign(sparks[sparkIndex++%sparkCount],{water:false,x,y:y+.43,z,ground,dx:nx*v+nz*side,dy:1+Math.random()*5,dz:nz*v-nx*side,life,total:life});
    }
    if(!water)for(let i=0;i<Math.floor(hit*(metal?16:9));i++){
      const iChip=chipIndex++%chipCount,side=(Math.random()-.5)*(3+hit*8);
      const life=.7+Math.random()*1.1,glass=metal&&hit>.56&&i%3===0;
      Object.assign(chips[iChip],{x,y:y+.45,z,ground,dx:nx*hit*3+nz*side,dy:1+Math.random()*(1+hit*4),
        dz:nz*hit*3-nx*side,spin:Math.random()*17-8,life,total:life,size:(.035+Math.random()*.058)*(.7+hit*.5)});
      chipMesh.setColorAt(iChip,chipTint.setHex(glass?0xc1d8d9:metal?(i%2?0x575353:0x8e8275):plaster?(i%2?0xe0ccac:0xac8e72):0x796a57));
    }
    if(chipMesh.instanceColor)chipMesh.instanceColor.needsUpdate=true;
  }
  function scrape(x,y,z,vx,vz){
    const speed=Math.hypot(vx,vz);if(speed<3)return;
    const dx=vx/speed,dz=vz/speed;
    mark(x-dx*1.4,y,z-dz*1.4,x,y,z,.48);
    for(let i=0;i<Math.min(9,2+speed*.29);i++){
      const side=(Math.random()-.5)*3,trail=1+Math.random()*Math.min(7,speed*.55),life=.1+Math.random()*.22;
      Object.assign(sparks[sparkIndex++%sparkCount],{water:false,x,y:y+.13,z,ground:y,dx:-dx*trail+dz*side,
        dy:.3+Math.random()*2.5,dz:-dz*trail-dx*side,life,total:life});
    }
    puff(x,y+.12,z,-dx*.55,.38,-dz*.55,.2,.55,[.54,.52,.49],.25);
  }
  function reset(){
    for(const pool of [smoke,sparks,chips])for(const p of pool)p.life=0;
    marks.fill(null);marksBorn.fill(-100);markGeo.attributes.born.needsUpdate=true;
    kick=boostLevel=flow=smokeFraction=sprayFraction=skidDistance=0;lastCar=previousAxle=null;root.visible=exhaust.visible=false;
  }
  function update(car,dt,originX=0,originZ=0,inside=false,camera,wetness=0){
    dt=clamp(dt||0,0,.1);clock+=dt;
    const driving=car.driving!==false&&!car.showroom&&!car.wading&&!car.flood;
    if(originX!==ox||originZ!==oz){
      ox=originX;oz=originZ;
      for(let i=0;i<markCount;i++)if(marks[i]&&clock-marksBorn[i*6]<24)writeMark(i);
      markGeo.attributes.position.needsUpdate=true;
    }
    root.visible=true;const s=Math.sin(car.yaw),c=Math.cos(car.yaw),y=car.y||0,x=car.x,z=car.z;
    const speed=Math.abs(car.speed||0),slip=clamp(car.slip||0,0,1);
    const rolling=driving&&speed>2,wet=clamp(wetness,0,1);
    const skid=rolling&&!car.offroad?clamp((slip-.22)/.62,0,1):0;
    const dry=1-wet,dust=rolling&&car.offroad;
    const boostTarget=driving&&car.boost?1:0;
    boostLevel+=(boostTarget-boostLevel)*(1-Math.exp(-dt*(boostTarget?12:8)));
    exhaust.visible=driving&&boostLevel>.045&&!inside;
    flameMaterial.uniforms.time.value=reduced.matches?0:clock;
    flameMaterial.uniforms.power.value=boostLevel;
    glow.material.uniforms.power.value=boostLevel;
    const ax=x-s*1.35,az=z+c*1.35;
    const travel=lastCar?Math.hypot(lastCar.x-x,lastCar.z-z):0;
    if(travel>7||dt===0){previousAxle=null;skidDistance=0;}
    const rubber=skid*dry;
    if(rubber>.05&&dt>0){
      if(previousAxle)skidDistance+=travel;
      if(!previousAxle||skidDistance>=.28){
        if(previousAxle)for(const side of [-.78,.78]){
          mark(previousAxle.x+previousAxle.c*side,previousAxle.y,previousAxle.z+previousAxle.s*side,ax+c*side,y,az+s*side,rubber);
        }
        previousAxle={x:ax,y,z:az,s,c};skidDistance=0;
      }
    }else{previousAxle=null;skidDistance=0;}
    const smokeRate=(dust?Math.min(22,speed*1.3):24*skid)*dry*dry;
    smokeFraction=smokeRate?smokeFraction+dt*smokeRate:0;
    while(smokeFraction>=1){
      const side=Math.random()>.5?.78:-.78;
      const size=dust?.32:.24+skid*.21,alpha=dry*(dust?.44:.22+skid*.28);
      puff(ax+c*side,y+.13,az+s*side,s*car.speed*.09+(Math.random()-.5)*.6,.4+Math.random()*.68,-c*car.speed*.09,
        size,dust?1.1:.88,dust?[.64,.53,.38]:[.74,.76,.78],alpha);
      smokeFraction--;
    }
    // Pairs of short, low fans let both wheel tracks read even in light rain.
    const spray=rolling&&!car.offroad?wet*clamp((speed-2)/20,0,1):0;
    sprayFraction=spray?sprayFraction+dt*spray*22:0;
    while(sprayFraction>=1){
      for(const wheel of [-1,1]){
        const side=wheel*.78,out=wheel*(.55+spray+Math.random()*.45),back=car.speed*.17;
        puff(ax+c*side,y+.09,az+s*side,c*out-s*back,.23+spray*.48,s*out+c*back,.16+spray*.11,.32+spray*.20,[.68,.78,.84],.25+spray*.20);
      }
      sprayFraction--;
    }
    lastCar={x,y,z};
    let count=0;
    for(let i=0;i<smokeCapacity;i++){
      const p=smoke[i];if(p.life<=0){opacity[i]=0;continue;}
      p.life-=dt;const age=1-clamp(p.life/p.total,0,1);
      p.x+=p.dx*dt;p.z+=p.dz*dt;p.y+=p.dy*dt;p.dx*=Math.exp(-dt*1.6);p.dz*=Math.exp(-dt*1.6);
      positions.set([p.x-ox,p.y,p.z-oz],i*3);sizes[i]=p.size*(1+age*3.5);opacity[i]=p.alpha*(1-age);count++;
    }
    puffs.visible=count>0;
    if(count){for(const a of Object.values(smokeGeo.attributes))a.needsUpdate=true;smokeMat.uniforms.pixels.value=renderer.domElement.height*.78;}
    let sparkDraw=0;
    for(const p of sparks){
      if(p.life<=0)continue;p.life-=dt;
      p.x+=p.dx*dt;p.y+=p.dy*dt;p.z+=p.dz*dt;p.dy-=12*dt;
      if(p.water&&p.y<p.ground){p.life=0;continue;}
      if(p.y<p.ground+.03){p.y=p.ground+.03;p.dy=Math.abs(p.dy)*.33;}
      const trail=Math.min(.038,.015+p.life*.07),a=clamp(p.life/p.total,0,1);
      sparkPos.set([p.x-ox,p.y,p.z-oz,p.x-p.dx*trail-ox,p.y-p.dy*trail,p.z-p.dz*trail-oz],sparkDraw*6);
      sparkColor.set(p.water?[.50*a,.81*a,a,.19*a,.44*a,.62*a]:[1,.92*a,.47*a,a*.92,.28*a,.03],sparkDraw*6);sparkDraw++;
    }
    sparkMesh.visible=sparkDraw>0;sparkGeo.setDrawRange(0,sparkDraw*2);
    if(sparkDraw){sparkGeo.attributes.position.needsUpdate=true;sparkGeo.attributes.color.needsUpdate=true;}
    let chipDraw=false;
    for(let i=0;i<chipCount;i++){
      const p=chips[i];if(p.life<=0){temp.scale.setScalar(0);}else{
        chipDraw=true;p.life-=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;p.z+=p.dz*dt;p.dy-=9.81*dt;
        if(p.y<p.ground+.025){p.y=p.ground+.025;p.dy=Math.abs(p.dy)*.28;p.dx*=.7;p.dz*=.7;}
        temp.position.set(p.x-ox,p.y,p.z-oz);temp.rotation.set(p.life*p.spin,p.life*p.spin*.65,p.life*p.spin*1.16);
        const scale=p.size*clamp(p.life*5,0,1);temp.scale.set(scale,scale*.28,scale*1.4);
      }temp.updateMatrix();chipMesh.setMatrixAt(i,temp.matrix);
    }
    chipMesh.visible=chipDraw;if(chipDraw)chipMesh.instanceMatrix.needsUpdate=true;
    markMat.uniforms.now.value=clock;
    const wind=driving&&!reduced.matches?Math.max(boostLevel*.85*clamp(speed/16,0,1),clamp((speed-28)/28,0,.5)):0;
    air.visible=wind>.08;
    if(air.visible){
      flow=(flow+speed*dt)%21;
      for(let i=0;i<airCount;i++){
        const a=airPattern[i],f=(a.phase-flow+42)%21-5,length=(.3+wind*1.1);
        airPoints.set([x+s*f+c*a.side-ox,y+a.y,z-c*f+s*a.side-oz,x+s*(f+length)+c*a.side-ox,y+a.y,z-c*(f+length)+s*a.side-oz],i*6);
      }
      airGeo.attributes.position.needsUpdate=true;air.material.opacity=wind*(inside?.15:.23);
    }
    if(kick>.003&&camera&&!reduced.matches){
      const side=kickX*c+kickZ*s,forward=kickX*s-kickZ*c;
      camera.position.x+=kick*kickX*.13;camera.position.z+=kick*kickZ*.13;
      camera.rotateZ(-side*kick*.037);camera.rotateX((Math.sin(kick*18)*.021-forward*.014)*kick);
    }
    kick*=Math.exp(-dt*8);
  }
  reset();
  return {group:root,update,impact,scrape,reset,mountExhaust,boostFov};
};
