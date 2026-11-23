'use strict';
// Elevation tiles describe the top of the mountain, including the terrain above
// underground rivers. Cut only the passage occupied by an authored cave.
function createCaveOpenings(T){
  const maximum=6;
  const uniforms={
    caveOrigin:{value:new T.Vector3()},caveBearing:{value:new T.Vector2()},
    caveCount:{value:0},caveApproach:{value:0},
    caveSections:{value:Array.from({length:maximum},()=>new T.Vector4())}
  };
  let previous=null;
  function update(monument,originX,originZ){
    const profile=monument?.data.caveOpening;
    if(!profile||!Number.isFinite(monument.base)){uniforms.caveCount.value=0;previous=null;return;}
    uniforms.caveOrigin.value.set(monument.x-originX,monument.base,monument.z-originZ);
    if(profile===previous)return;
    previous=profile;
    uniforms.caveBearing.value.set(Math.cos(monument.data.yaw),Math.sin(monument.data.yaw));
    uniforms.caveCount.value=profile.sections.length;
    uniforms.caveApproach.value=profile.approach;
    profile.sections.forEach(([d,x,w,h],i)=>uniforms.caveSections.value[i].set(d,x,w,h));
  }
  function shade(shader){
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec3 cavePosition;\n'+shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n cavePosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`varying vec3 cavePosition;
      uniform vec3 caveOrigin; uniform vec2 caveBearing;
      uniform int caveCount; uniform float caveApproach; uniform vec4 caveSections[${maximum}];
      bool insideCave(){
        if(caveCount==0)return false;
        vec3 delta=cavePosition-caveOrigin;
        float d=-dot(delta.xz,caveBearing.yx);
        if(d < -caveApproach || delta.y < -3. || (d<0. && delta.y<d*.32-.15))return false;
        float lateral=dot(delta.xz,vec2(caveBearing.x,-caveBearing.y));
        vec4 a=caveSections[0];
        for(int i=1;i<${maximum};i++){
          if(i>=caveCount)break;
          vec4 b=caveSections[i];
          if(d<=b.x){
            vec3 section=mix(a.yzw,b.yzw,clamp((d-a.x)/(b.x-a.x),0.,1.));
            float x=abs(lateral-section.x)/(section.y*1.11+.30);
            return x<1. && delta.y<section.z*1.19*pow(max(0.,1.-x*x),.34)+1.2;
          }
          a=b;
        }
        return false;
      }\n`+shader.fragmentShader.replace('#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\n if(insideCave())discard;');
  }
  function floorAt(x,z){
    if(!previous)return null;
    const origin=uniforms.caveOrigin.value,bearing=uniforms.caveBearing.value;
    const dx=x-origin.x,dz=z-origin.z,d=-dx*bearing.y-dz*bearing.x;
    const side=dx*bearing.x-dz*bearing.y;
    if(d < -previous.approach)return null;
    let a=previous.sections[0];
    for(let i=1;i<previous.sections.length;i++){
      const b=previous.sections[i];
      if(d<=b[0]){
        const t=Math.max(0,(d-a[0])/(b[0]-a[0])),centre=a[1]+t*(b[1]-a[1]),width=a[2]+t*(b[2]-a[2]);
        return Math.abs(side-centre)<width?origin.y+a[4]+t*(b[4]-a[4]):null;
      }
      a=b;
    }
    return null;
  }
  return {update,shade,floorAt};
}
