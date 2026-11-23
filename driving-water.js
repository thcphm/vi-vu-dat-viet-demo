'use strict';

// XY stores surface current in map coordinates, Z stores distance from the bank.
window.createDrivingWater = function(T, mapped) {
  const time = {value: 0}, origin = {value: new T.Vector2()};
  const rainfall={value:0},wake={value:new T.Vector4()},wakeAge={value:0};
  const field = {value: null}, bounds = {value: new T.Vector3()};
  const mirrorMap={value:null},mirrorMatrix={value:new T.Matrix4()},mirrorStrength={value:0};
  const mirrorLevel={value:0};
  const reflected=new T.PerspectiveCamera(),direction=new T.Vector3(),up=new T.Vector3();
  const plane=new T.Plane(),clip=new T.Vector4(),corner=new T.Vector4();
  let target=null,lastReflection=-Infinity;
  const material = new T.MeshPhysicalMaterial({
    color: 0xffffff, roughness: .43, metalness: 0, ior: 1.333,
    envMapIntensity: .53, side: T.DoubleSide, transparent: true, depthWrite: true, forceSinglePass: true
  });
  material.customProgramCacheKey = () => 'inland-water-' + mapped;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {waterTime: time, rainfall, wake, wakeAge, waterOrigin: origin, bankField: field, bankBounds: bounds, mirrorMap, mirrorMatrix, mirrorStrength});
    const varying = 'varying vec4 mirrorUV; varying vec2 waterMetres; varying vec2 localWater; varying vec3 waterProfile;\n';
    shader.vertexShader = varying + 'uniform vec2 waterOrigin; uniform mat4 mirrorMatrix;\n' +
      (mapped ? '' : 'attribute vec3 riverProfile;\n') + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nmirrorUV=mirrorMatrix*modelMatrix*vec4(position,1.0); localWater=position.xz; waterMetres=localWater+waterOrigin; waterProfile=' +
      (mapped ? 'vec3(0.0);' : 'riverProfile;'));
    shader.fragmentShader = varying + `
      uniform sampler2D mirrorMap; uniform float mirrorStrength; uniform float waterTime; uniform float rainfall;
      uniform vec4 wake; uniform float wakeAge; uniform sampler2D bankField;
      uniform vec3 bankBounds;
      float hashBank(vec2 xy){
        vec3 p=fract(vec3(xy.xyx)*.1031);
        p+=dot(p,p.yzx+33.33);
        return fract((p.x+p.y)*p.z);
      }
      float gust(vec2 xy){
        vec2 cell=floor(xy),t=fract(xy);t=t*t*(3.-2.*t);
        return mix(mix(hashBank(cell),hashBank(cell+vec2(1.,0.)),t.x),
                   mix(hashBank(cell+vec2(0.,1.)),hashBank(cell+vec2(1.)),t.x),t.y);
      }
      // Suppress wavelengths smaller than a screen pixel at low viewing angles.
      float band(vec2 p, vec2 k, float phase) {
        float a=dot(p,k);
        return cos(a+phase)*(1.0-smoothstep(.45,2.7,fwidth(a)));
      }
    ` + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 profile=waterProfile;
      ` + (mapped ? `vec4 atlas=texture2D(bankField,(localWater-bankBounds.xy)*bankBounds.z);
      profile=vec3(atlas.rg*2.0-1.0,atlas.b*24.0);` : '') + `
      float flow=clamp(length(profile.xy),0.0,1.0);
      vec2 drift=profile.xy+vec2(.12,.065);
      vec2 p=waterMetres-drift*waterTime;
      float bend=sin(dot(p,vec2(.19,.14)))*1.6+sin(dot(p,vec2(-.37,.23)))*.64;
      vec2 crosswind=normalize(mix(vec2(.84,.54),drift/max(length(drift),.01),flow));
      vec2 across=vec2(-crosswind.y,crosswind.x);
      vec2 channel=vec2(dot(p,crosswind),dot(p,across));
      float eddy=gust(p*.77+vec2(waterTime*.13,0.));
      channel+=vec2(eddy*1.17,gust(p*.46+5.7)*1.54);
      vec2 slope=crosswind*(.062*band(channel,vec2(2.3,.64),bend-waterTime*.9)
                             +.037*band(channel,vec2(7.9,-1.65),bend*1.6-waterTime*1.45))
                +across*(.044*band(channel,vec2(.72,3.7),-bend-waterTime*.54)
                         +.027*band(channel,vec2(2.72,12.1),bend*.64+waterTime));
      // Small capillary waves break up the sky even on slow-moving lake water.
      float windPatch=gust(p*.22+vec2(8.4,waterTime*.027));
      slope*=.55+.92*windPatch;
      slope+=vec2(.04,-.057)*band(p,vec2(-3.3,2.7),waterTime*.8+bend);
      if(rainfall>.015){
        vec2 cell=floor(waterMetres*2.4);
        float seed=fract(sin(dot(cell,vec2(27.1,83.7)))*4375.23);
        vec2 delta=fract(waterMetres*2.4)-vec2(.25+.5*seed,.25+.5*fract(seed*9.3));
        float age=fract(waterTime*1.45+seed);
        float radius=length(delta);
        float ring=exp(-abs(radius-age*.58)*19.)*(1.-age);
        slope+=delta/max(.04,radius)*ring*rainfall*.18;
      }
      float wakeFoam=0.;
      if(wake.w>.015){
        vec2 delta=localWater-wake.xy;
        vec2 forward=vec2(sin(wake.z),-cos(wake.z));
        float aft=-dot(delta,forward),beam=dot(delta,vec2(-forward.y,forward.x));
        float arm=abs(beam)-1.-max(aft,0.)*.31;
        float trail=smoothstep(-.8,1.,aft)*exp(-max(aft,0.)*.16)*exp(-abs(arm)*1.45);
        float wave=sin(arm*8.-waterTime*2.8);
        slope+=vec2(-forward.y,forward.x)*sign(beam)*wave*trail*wake.w*.17;
        float radius=length(delta);
        float splashRing=exp(-abs(radius-1.1-wakeAge*2.8)*1.6)*exp(-wakeAge*.65);
        slope+=delta/max(radius,.01)*splashRing*wake.w*.22;
        wakeFoam=(trail*(.4+.6*wave*wave)+splashRing*.8)*wake.w;
      }
      float depth=max(profile.z,0.0);
      float shallows=exp(-depth*.39);
      diffuseColor.a*=mix(.16,1.,smoothstep(0.,3.4,depth));
      vec3 deep=mix(vec3(.023,.077,.074),vec3(.070,.090,.055),smoothstep(.15,.7,flow));
      deep=mix(deep,vec3(.023,.09,.083),smoothstep(.72,1.0,flow));
      float bed=.5+.25*band(waterMetres,vec2(2.1,1.15),bend*.18)+.25*band(waterMetres,vec2(-3.7,4.2),.4);
      // Suspended sediment varies across the channel and the shallow bed remains visible.
      float silt=gust(waterMetres*.12+bend*.11);
      vec3 body=mix(deep,vec3(.078,.107,.064),silt*(.23+.30*flow));
      vec3 lakeBed=mix(vec3(.13,.12,.074),vec3(.19,.168,.102),bed);
      diffuseColor.rgb=mix(body,lakeBed*(.82+.3*bed),shallows);
      diffuseColor.rgb+=vec3(.15,.18,.17)*wakeFoam;
      float shorePulse=sin(depth*3.1-waterTime*1.65+bend*.5);
      diffuseColor.rgb+=vec3(.030,.034,.027)*smoothstep(.65,.96,shorePulse)*shallows;
      float crest=band(channel,vec2(4.2,.72),bend-waterTime*.77);
      float broken=smoothstep(.38,.85,sin(channel.y*1.8+bend)*sin(channel.x*.53-bend));
      diffuseColor.rgb+=vec3(.075,.092,.084)*smoothstep(.72,.98,crest)*broken*gust(channel*3.4)
                      *smoothstep(.38,.90,flow)*(.12+.88*shallows);
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      normal=normalize(mat3(viewMatrix)*vec3(-slope.x,1.0,-slope.y));
    `).replace('#include <opaque_fragment>', `
      vec2 reflectionUV=mirrorUV.xy/max(.001,mirrorUV.w)*.5+.5;
      reflectionUV+=slope*(.035+.018*windPatch);
      float edge=min(min(reflectionUV.x,reflectionUV.y),min(1.0-reflectionUV.x,1.0-reflectionUV.y));
      float fresnel=.021+.979*pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),5.0);
      float blend=mirrorStrength*smoothstep(0.0,.045,edge)*step(.01,mirrorUV.w)*fresnel;
      if(blend>.001){
        // Average the reflected scene across a wave footprint. Long banks should
        // read as interrupted colour bands even at a low viewing angle.
        vec2 spread=vec2(.0035,.009)*(.85+windPatch+rainfall);
        vec2 uv=clamp(reflectionUV,spread,1.0-spread);
        vec3 reflection=.25*(texture2D(mirrorMap,uv+spread).rgb+
                             texture2D(mirrorMap,uv-spread).rgb+
                             texture2D(mirrorMap,uv+vec2(spread.x,-spread.y)).rgb+
                             texture2D(mirrorMap,uv+vec2(-spread.x,spread.y)).rgb);
        outgoingLight=mix(outgoingLight,reflection,blend*(.44-.13*windPatch)*(1.0-shallows*.47));
      }
      #include <opaque_fragment>
    `);
  };
  function setField(pixels,size,x,z,scale,cx,cz) {
    if(!field.value||field.value.image.width!==size){
      field.value?.dispose();
      field.value=new T.DataTexture(pixels,size,size);
      field.value.minFilter=field.value.magFilter=T.LinearFilter;
    }else field.value.image.data=pixels;
    field.value.needsUpdate=true;
    bounds.value.set(x,z,scale/size);
    origin.value.set(cx,cz);lastReflection=-Infinity;
  }
  function sizeTarget(profile){
    if(!target){
      target=new T.WebGLRenderTarget(profile.waterWidth,profile.waterWidth*9/16);
      mirrorMap.value=target.texture;
    }else if(target.width!==profile.waterWidth)target.setSize(profile.waterWidth,profile.waterWidth*9/16);
  }
  function prepare(renderer,profile,work,draw=false){
    sizeTarget(profile);
    const previous=renderer.getRenderTarget(),visible=material.visible,mirror=mirrorMap.value;
    try{
      if(draw){
        target.scissor.set(0,0,1,1);target.scissorTest=true;
        mirrorMap.value=null;material.visible=false;
      }
      renderer.setRenderTarget(target);
      work();
    }finally{
      if(draw){target.scissorTest=false;material.visible=visible;mirrorMap.value=mirror;lastReflection=-Infinity;}
      renderer.setRenderTarget(previous);
    }
  }
  function reflect(renderer,scene,camera,level,now,near,profile){
    if(!profile.waterWidth||!near||camera.position.y<=level){mirrorStrength.value=0;lastReflection=-Infinity;return;}
    if(now-lastReflection<profile.waterMs)return;
    lastReflection=now;
    sizeTarget(profile);
    camera.updateMatrixWorld();
    camera.getWorldDirection(direction);direction.y*=-1;
    up.set(0,1,0).applyQuaternion(camera.quaternion);up.y*=-1;
    reflected.position.copy(camera.position);reflected.position.y=2*level-camera.position.y;
    reflected.up.copy(up);reflected.lookAt(direction.add(reflected.position));
    reflected.updateMatrixWorld();reflected.projectionMatrix.copy(camera.projectionMatrix);
    // Oblique near plane keeps the ground beneath the water out of the reflection.
    plane.normal.set(0,1,0);plane.constant=-level-.015;plane.applyMatrix4(reflected.matrixWorldInverse);
    clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    const m=reflected.projectionMatrix.elements;
    corner.set((Math.sign(clip.x)+m[8])/m[0],(Math.sign(clip.y)+m[9])/m[5],-1,(1+m[10])/m[14]);
    clip.multiplyScalar(2/clip.dot(corner));m[2]=clip.x;m[6]=clip.y;m[10]=clip.z+1;m[14]=clip.w;
    reflected.projectionMatrixInverse.copy(reflected.projectionMatrix).invert();
    mirrorMatrix.value.multiplyMatrices(reflected.projectionMatrix,reflected.matrixWorldInverse);
    mirrorLevel.value=level;
    const previous=renderer.getRenderTarget(),shadow=renderer.shadowMap.needsUpdate;
    // Wet asphalt may also sample this target. Unbind it in the capture pass.
    mirrorMap.value=null;mirrorStrength.value=0;
    material.visible=false;renderer.shadowMap.needsUpdate=false;
    try{renderer.setRenderTarget(target);renderer.render(scene,reflected);}
    finally{renderer.setRenderTarget(previous);mirrorMap.value=target.texture;material.visible=true;renderer.shadowMap.needsUpdate=shadow;}
    mirrorStrength.value=1;
  }
  return {material,setField,prepare,reflect,reflection:{mirrorMap,mirrorMatrix,mirrorStrength,mirrorLevel},setWake(x,z,yaw,strength,age){wake.value.set(x,z,yaw,strength);wakeAge.value=age;},update(seconds,rain=0){time.value=seconds;rainfall.value=rain;}};
};

// Two chamfer passes estimate the distance to the dry bank on the merged mask.
// Shared polygon cuts, map tile seams and islands therefore need no special edges.
window.waterBankField = function*(mask,current,size,metres) {
  const depth=new Float32Array(size*size),out=new Uint8Array(size*size*4);
  for(let i=0;i<depth.length;i++){
    if((i&2047)===0)yield;
    const alpha=mask[i*4+3];
    depth[i]=alpha>=250?24:alpha/255*metres*.5;
  }
  for(const step of [1,-1]){
    for(let n=0;n<depth.length;n++){
      if((n&2047)===0)yield;
      const i=step===1?n:depth.length-1-n;
      if(!depth[i])continue;
      const x=i%size,j=i-size*step;
      if(x-step>=0&&x-step<size)depth[i]=Math.min(depth[i],depth[i-step]+metres);
      if(j<0||j>=depth.length)continue;
      depth[i]=Math.min(depth[i],depth[j]+metres);
      if(x>0)depth[i]=Math.min(depth[i],depth[j-1]+1.414*metres);
      if(x+1<size)depth[i]=Math.min(depth[i],depth[j+1]+1.414*metres);
    }
  }
  for(let i=0;i<depth.length;i++){
    if((i&2047)===0)yield;
    const j=i*4,a=current[j+3]/255;
    out[j]=128+(current[j]-128)*a;out[j+1]=128+(current[j+1]-128)*a;
    out[j+2]=Math.round(depth[i]*255/24);out[j+3]=255;
  }
  return out;
};
