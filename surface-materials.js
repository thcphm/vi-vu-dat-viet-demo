'use strict';
// Streamed surfaces have independent vertices per triangle. Compute their
// flat normal once per face, including when positions and normals are interleaved.
function writeFlatNormals(positions,normals,stride=3,offset=0){
  for(let a=0;a<positions.length;a+=stride*3){
    const b=a+stride,c=b+stride;
    const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
    const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
    const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;
    const length=Math.sqrt(x*x+y*y+z*z)||1;
    const nx=x/length,ny=y/length,nz=z/length;
    for(let i=a+offset;i<=c+offset;i+=stride){
      normals[i]=nx;normals[i+1]=ny;normals[i+2]=nz;
    }
  }
}
function setFlatNormals(T,geometry){
  const positions=geometry.attributes.position.array,normals=new Float32Array(positions.length);
  writeFlatNormals(positions,normals);
  geometry.setAttribute('normal',new T.BufferAttribute(normals,3));
}

// Scanned material channels share a UV transform, including after an origin rebase.
function createRoadSurfaces(T,renderer){
  const loader=new T.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  function scanned(name,tint,strength){
    function channel(kind){
      const tex=loader.load('streetscape/surfaces/'+name+'-'+kind+'.webp');
      tex.name=name+' '+kind;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=anisotropy;
      if(kind==='color')tex.colorSpace=T.SRGBColorSpace;
      return tex;
    }
    return new T.MeshStandardMaterial({name:'Scanned '+name,color:tint,map:channel('color'),roughnessMap:channel('rough'),
      normalMap:channel('normal'),normalScale:new T.Vector2(strength,strength),metalness:0,roughness:.94,envMapIntensity:.36});
  }
  function transform(material,repeatX,repeatY,offsetX=0,offsetY=0){
    for(const tex of [material.map,material.normalMap,material.roughnessMap]){
      tex.repeat.set(repeatX,repeatY);tex.offset.set(offsetX,offsetY);
    }
  }
  function weatheredAsphalt(mat,wetness,origin,reflection){
    mat.envMapIntensity=.67;
    mat.onBeforeCompile=shader=>{
      shader.uniforms.roadWetness=wetness;
      shader.uniforms.roadOrigin={value:origin};
      Object.assign(shader.uniforms,reflection);
      const varyings='varying vec4 roadSample; varying vec4 roadMirrorUV; varying float roadHeight;\n';
      shader.vertexShader=varyings+'attribute vec2 carriageway; uniform vec2 roadOrigin; uniform mat4 mirrorMatrix;\n'+
        shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n roadSample=vec4(position.xz+roadOrigin,carriageway); vec4 roadWorld=modelMatrix*vec4(position,1.); roadHeight=roadWorld.y; roadMirrorUV=mirrorMatrix*roadWorld;');
      shader.fragmentShader=varyings+`
        uniform float roadWetness, mirrorStrength, mirrorLevel;
        uniform sampler2D mirrorMap;
        float roadHash(vec2 p){
          vec3 h=fract(p.xyx*vec3(.1031,.11369,.13787));
          h+=dot(h,h.yzx+19.19);return fract((h.x+h.y)*h.z);
        }
        float depressions(vec2 p){
          vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(roadHash(i),roadHash(i+vec2(1.,0.)),f.x),
                     mix(roadHash(i+vec2(0.,1.)),roadHash(i+1.),f.x),f.y);
        }\n`+
        shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          // Sample a larger patch of the same scan to break up the four-metre repeat.
          vec2 metres=roadSample.xy;
          vec2 patchUV=mat2(.8,.6,-.6,.8)*metres/32.;
          float variation=smoothstep(.13,.35,texture2D(map,patchUV).g);
          float halfWidth=roadSample.w, lateral=abs(roadSample.z);
          float laneWidth=halfWidth>6.7 ? halfWidth*.5 : halfWidth;
          float centre=halfWidth<4.2 ? 0. : laneWidth*.5;
          float offset=abs(mod(lateral-centre+laneWidth*.5,max(laneWidth,.1))-laneWidth*.5);
          float tracks=(1.-smoothstep(.14,.50,abs(offset-.82)))*step(.01,halfWidth);
          float edge=smoothstep(halfWidth-.85,halfWidth,lateral)*step(.01,halfWidth);
          float film=0.;
          if(roadWetness>.004){
            float basin=.72*depressions(metres*.32)+.28*variation+.10*edge-.08*tracks;
            film=roadWetness*(.21+.79*smoothstep(.32,.69,basin));
          }
          diffuseColor.rgb*=mix(.83,1.18,variation)*(1.-.16*tracks);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.17,.122,.084),edge*.26);
          diffuseColor.rgb*=1.-.53*film-.13*roadWetness;`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=mix(clamp(roughnessFactor-.07*tracks,.52,.97),.085,film);`)
        .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          normal=normalize(mix(normal,nonPerturbedNormal,.84*film));`)
        .replace('#include <opaque_fragment>',`
          if(film>.08 && mirrorStrength>.5 && roadMirrorUV.w>0.){
            vec2 uv=roadMirrorUV.xy/roadMirrorUV.w*.5+.5;
            float border=min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y));
            float levelFit=1.-smoothstep(.12,1.5,abs(roadHeight-mirrorLevel));
            float grazing=1.-max(0.,dot(normal,normalize(vViewPosition)));
            float reflectance=(.04+.71*pow(grazing,3.))*film*film*levelFit*smoothstep(0.,.045,border);
            vec2 ripple=(normal.xy-nonPerturbedNormal.xy)*.038;
            vec2 blur=vec2(.002,.004)*(1.5-film);
            uv=clamp(uv+ripple,blur,1.-blur);
            vec3 reflected=texture2D(mirrorMap,uv).rgb*.5+
              .25*(texture2D(mirrorMap,uv+blur).rgb+texture2D(mirrorMap,uv-blur).rgb);
            outgoingLight=mix(outgoingLight,reflected,reflectance);
          }
          #include <opaque_fragment>`);
    };
  }
  return {scanned,transform,weatheredAsphalt};
}
