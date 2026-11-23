'use strict';

// A single satellite composite follows the selected pass in either driving mode.
// Its square covers 9.6 km in the DEM's rotated, metre-based course frame.
function createPassSurface(T){
  const loader=new T.TextureLoader();
  const map={value:null},origin={value:new T.Vector2()},axis={value:new T.Vector3(1,0,1)},strength={value:0};
  let active=null;
  function select(id,x=0,z=0,cos=1,sin=0,eastScale=1){
    origin.value.set(x,z);axis.value.set(cos,sin,eastScale);
    const key=scenicPasses.has(id)?id:null;
    if(key===active)return;
    active=key;strength.value=0;map.value?.dispose();map.value=null;
    if(key)loader.load('pass-surfaces/'+key+'.webp',texture=>{
      if(active!==key){texture.dispose();return;}
      texture.colorSpace=T.SRGBColorSpace;map.value=texture;strength.value=1;
    });
  }
  function shade(shader,point,weight){
    Object.assign(shader.uniforms,{passAlbedo:map,passOrigin:origin,passAxis:axis,passStrength:strength});
    shader.fragmentShader='uniform sampler2D passAlbedo; uniform vec2 passOrigin; uniform vec3 passAxis; uniform float passStrength;\n'+
      shader.fragmentShader.replace('#include <alphamap_fragment>',`
        if(passStrength>.0){
          vec2 delta=(${point}-passOrigin)*vec2(passAxis.z,1.);
          vec2 course=vec2(dot(delta,passAxis.xy),dot(delta,vec2(-passAxis.y,passAxis.x)));
          float edge=1.-smoothstep(4200.,4790.,max(abs(course.x),abs(course.y)));
          vec3 surfaceColour=texture2D(passAlbedo,vec2(.5)+course*vec2(1.,-1.)/9600.).rgb;
          diffuseColor.rgb=mix(diffuseColor.rgb,surfaceColour,edge*clamp(${weight},0.,1.));
        }
        #include <alphamap_fragment>`);
  }
  return {select,shade};
}
