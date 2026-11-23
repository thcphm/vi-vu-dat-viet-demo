'use strict';

// The sky, its reflection in water, and the key light share a sun direction.
function createWorldAtmosphere(T, scene, sun, loader, bearing=0, clearFog=.00078) {
  const skyMap = loader.load('streetscape/sky.jpg');
  skyMap.colorSpace = T.SRGBColorSpace;
  skyMap.wrapS = T.RepeatWrapping;
  const solar = new T.Vector3(), direction = new T.Vector3();
  const up = new T.Vector3(0,1,0);
  const morning = new T.Vector3(.94,.115,-.32).normalize();
  const uniforms = {
    panorama: {value:skyMap}, sunRay: {value:direction}, overcast: {value:0},
    dusk: {value:0}, daylight: {value:1}, eclipse: {value:0}, horizon: {value:scene.fog.color}
  };
  const sky = new T.Mesh(new T.SphereGeometry(1,40,20), new T.ShaderMaterial({
    uniforms, side:T.BackSide, depthWrite:false,
    vertexShader:`
      varying vec3 ray;
      void main() {
        ray=position;
        vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*position,1.);
        gl_Position=clip.xyww;
      }`,
    fragmentShader:`
      uniform sampler2D panorama;
      uniform vec3 sunRay, horizon;
      uniform float overcast, dusk, daylight, eclipse;
      varying vec3 ray;
      void main() {
        vec3 d=normalize(ray);
        float height=max(0.,d.y), rim=exp(-height*5.);
        // Use photographed cloud detail without inheriting the photograph's sun position.
        vec2 uv=vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(height,0.,1.))*.31830989+.5);
        vec3 photograph=texture2D(panorama,uv).rgb;
        float cloud=smoothstep(.035,.75,min(photograph.r,photograph.g))*(1.-.72*rim);
        float facing=max(0.,dot(d,sunRay)), separation=length(d-sunRay);
        vec3 zenith=mix(vec3(.012,.023,.057),vec3(.075,.25,.55),daylight);
        zenith=mix(zenith,vec3(.155,.23,.42),dusk*.76);
        vec3 air=mix(zenith,horizon,rim);
        vec3 cloudLight=mix(vec3(.036,.053,.09),vec3(1.10,1.15,1.19),daylight);
        cloudLight=mix(cloudLight,vec3(1.28,.65,.37),dusk*(.32+.62*facing));
        vec3 colour=mix(air,cloudLight,cloud*.91);
        vec3 storm=mix(vec3(.15,.205,.26),vec3(.45,.51,.54),cloud+.17*rim)*(.14+.86*daylight);
        colour=mix(colour,storm,overcast*.89);
        float glow=exp(-separation*5.)*.30+exp(-separation*33.)*.96;
        vec3 sunlight=mix(vec3(1.,.89,.68),vec3(1.55,.62,.24),dusk);
        colour+=sunlight*(glow+5.*(1.-smoothstep(.005,.0085,separation)))*daylight*(1.-overcast);
        gl_FragColor=vec4(colour*mix(vec3(1.),vec3(.31,.45,.52),eclipse),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  // The sky is at the far depth. Shade only the sky pixels left by opaque scenery.
  sky.frustumCulled=false; sky.renderOrder=1000; scene.add(sky);
  const fill=new T.HemisphereLight(0xcde4ff,0x8c7761,1);
  scene.add(fill);
  const warmSun=new T.Color(0xffb065), daySun=new T.Color(0xfff0d6), moon=new T.Color(0x9cbeef);
  const clearAir=new T.Color(0xaac4d4), warmAir=new T.Color(0xefaa79);
  const greyAir=new T.Color(0xa0adb8), nightAir=new T.Color(0x354761);
  const skyFill=new T.Color(0xc3ddff), lowFill=new T.Color(0xa7b5df), nightFill=new T.Color(0x8faddb);
  const mixColour=new T.Color();
  const wetness={value:0}, lamps={value:0};
  const finishes=new Set();
  let reflectionLight=1;
  function registerFinish(mat){
    if(!mat?.isMeshStandardMaterial||finishes.has(mat))return;
    // GLTF paints are cloned per vehicle. Keep the unscaled value across clones.
    mat.userData.dayReflection??=mat.envMapIntensity;
    mat.envMapIntensity=mat.userData.dayReflection*reflectionLight;
    finishes.add(mat);
  }
  let lastMinute=-1, longitude=105.8, latitude=21, localHour=null;
  function setHour(hour){
    if(hour!==localHour){localHour=hour;lastMinute=-1;}
  }
  function setLocation(lon,lat) {
    longitude=lon; latitude=lat; lastMinute=-1;
  }
  function update(dawn,cloud,wet,fog,blend) {
    const minute=Math.floor(Date.now()/60000);
    if(minute!==lastMinute){
      lastMinute=minute;
      const day=new Date(minute*60000);
      const yearDay=(minute*60000-Date.UTC(day.getUTCFullYear(),0,1))/86400000;
      const rad=Math.PI/180, declination=.409*Math.sin((yearDay-80)*2*Math.PI/365.24);
      const utcMinutes=localHour==null?minute%1440:(localHour-7)*60;
      const angle=(utcMinutes/4+longitude-180)*rad, lat=latitude*rad;
      const cd=Math.cos(declination), sd=Math.sin(declination);
      solar.set(-cd*Math.sin(angle),sd*Math.sin(lat)+cd*Math.cos(angle)*Math.cos(lat),
        cd*Math.cos(angle)*Math.sin(lat)-sd*Math.cos(lat)).applyAxisAngle(up,bearing);
    }
    direction.copy(solar).lerp(morning,dawn).normalize();
    const eclipse=uniforms.eclipse.value;
    const day=T.MathUtils.smoothstep(direction.y,-.14,.08)*(1-eclipse);
    const dusk=(1-T.MathUtils.smoothstep(direction.y,.10,.54))*day;
    uniforms.overcast.value+=(Math.max(cloud*.85,wet*.97,fog)-uniforms.overcast.value)*blend;
    const cover=uniforms.overcast.value;
    const intensity=.15+day*(.92-.34*cover-.20*dusk);
    if(Math.abs(reflectionLight-intensity)>.009){
      reflectionLight=intensity;
      for(const mat of finishes)mat.envMapIntensity=mat.userData.dayReflection*intensity;
    }
    uniforms.dusk.value=dusk; uniforms.daylight.value=day;
    wetness.value+=(wet-wetness.value)*blend;
    lamps.value=Math.max(1-day,T.MathUtils.smoothstep(cover,.65,.98)*.24);
    mixColour.copy(clearAir).lerp(warmAir,dusk*.88).lerp(greyAir,cover).lerp(nightAir,1-day);
    scene.fog.color.copy(mixColour).multiplyScalar(1-.48*eclipse);
    scene.fog.density=Math.max(clearFog*(1.+dusk*.55+cover*.92),.010*fog,.0032*wetness.value);
    sun.color.copy(daySun).lerp(warmSun,dusk).lerp(greyAir,cover*.65).lerp(moon,1-day);
    sun.intensity=(.29+day*(3.25-.54*dusk))*(1.-.79*cover);
    fill.color.copy(skyFill).lerp(lowFill,dusk*.60).lerp(nightFill,1-day);
    fill.intensity=.31+day*(.85+.34*cover);
    // Keep a raking moonlight after sunset so silhouettes and road edges stay legible.
    sun.position.copy(direction);
    if(direction.y<0) sun.position.negate();
    sun.position.y=Math.max(.17,sun.position.y);
    sun.position.normalize().multiplyScalar(68).add(sun.target.position);
  }
  return {update,setLocation,setHour,registerFinish,wetness,lamps,eclipse:uniforms.eclipse};
}
