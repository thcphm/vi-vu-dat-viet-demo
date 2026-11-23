'use strict';
// A local texture keeps the categorical raster lookup out of the terrain shader.
function createWorldLandCover(T,environment){
  const side=128,metres=2048,rgba=new Uint8Array(side*side*4);
  const texture=new T.DataTexture(rgba,side,side,T.RGBAFormat);
  texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;
  const origin=new T.Vector2();
  const palette={10:[48,74,44],20:[108,120,75],30:[141,151,88],40:[167,161,93],
    50:[142,139,128],60:[169,151,127],70:[220,226,225],80:[77,113,122],
    90:[101,129,93],95:[57,99,72],100:[143,151,110]};
  let spare=new Uint8Array(rgba.length),displayedGraph,displayedRevision;
  function* prepare(graph,x,z){
    const left=x-metres/2,top=z-metres/2,rgba=spare,pitch=metres/side;
    const dx=(left-origin.x)/pitch,dz=(top-origin.y)/pitch,revision=environment.revision;
    const overlap=graph===displayedGraph&&revision===displayedRevision&&Number.isInteger(dx)&&Number.isInteger(dz);
    const previous=texture.image.data;
    for(let j=0;j<side;j++){
      if(j%4===0)yield;
      const row=j+dz,start=Math.max(0,-dx),end=Math.min(side,side-dx);
      const reuse=overlap&&row>=0&&row<side&&end>start;
      for(let i=0;i<side;){
        if(reuse&&i===start){
          const offset=(row*side+start+dx)*4;
          rgba.set(previous.subarray(offset,offset+(end-start)*4),(j*side+i)*4);
          i=end;continue;
        }
        const cover=environment.sample(graph,left+(i+.5)*pitch,top+(j+.5)*pitch).cover,tint=palette[cover],k=(j*side+i)*4;
        rgba[k]=tint?.[0]||0;rgba[k+1]=tint?.[1]||0;rgba[k+2]=tint?.[2]||0;
        rgba[k+3]=tint?(cover===40?255:170):0;i++;
      }
    }
    return ()=>{
      displayedGraph=graph;displayedRevision=revision;
      origin.set(left,top);spare=texture.image.data;texture.image.data=rgba;texture.needsUpdate=true;
    };
  }
  function shade(shader){
    shader.uniforms.coverMap={value:texture};shader.uniforms.coverOrigin={value:origin};
    shader.fragmentShader='uniform sampler2D coverMap; uniform vec2 coverOrigin;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      vec4 landClass=texture2D(coverMap,(groundMetres-coverOrigin)/2048.);
      vec3 groundTint=pow(landClass.rgb,vec3(2.2));
      float grain=clamp(dot(diffuseColor.rgb,vec3(.21,.72,.07))*4.,.58,1.32);
      float furrow=cos(dot(groundMetres,vec2(.36,.69)));
      grain*=1.+.07*furrow*smoothstep(.85,.99,landClass.a);
      diffuseColor.rgb=mix(diffuseColor.rgb,groundTint*grain,.74*smoothstep(0.,.65,landClass.a)*(1.-bankWet));
      #include <color_fragment>`);
  }
  return {prepare,shade};
}
