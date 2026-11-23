'use strict';

// Geometry UVs are east/south metres in the road graph, independent of the
// movable render origin. All three materials are shared across streamed meshes.
window.createTempleSurfaces=function(T){
  const loader=new T.TextureLoader();
  function channel(name,kind,scale){
    const texture=loader.load('streetscape/surfaces/'+name+'-'+kind+'.webp');
    texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.repeat.setScalar(1/scale);
    if(kind==='color')texture.colorSpace=T.SRGBColorSpace;
    return texture;
  }
  const noise=`
    varying vec2 stoneMetres;
    float tileHash(vec2 cell){
      vec3 p=fract(vec3(cell.xyx)*.1031);
      p+=dot(p,p.yzx+33.33);
      return fract((p.x+p.y)*p.z);
    }
    float fieldNoise(vec2 pos){
      vec2 cell=floor(pos),f=fract(pos);
      f=f*f*(3.-2.*f);
      return mix(mix(tileHash(cell),tileHash(cell+vec2(1.,0.)),f.x),
                 mix(tileHash(cell+vec2(0.,1.)),tileHash(cell+vec2(1.)),f.x),f.y);
    }
  `;
  function ground(name,scan,size,strength,fragment,roughness){
    const material=new T.MeshStandardMaterial({
      name,side:T.DoubleSide,roughness:.94,metalness:0,envMapIntensity:.30,
      map:channel(scan,'color',size),normalMap:channel(scan,'normal',size),
      normalScale:new T.Vector2(strength,strength)
    });
    material.userData.templeSurface=true;
    material.customProgramCacheKey=()=>name;
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 stoneMetres;\n'+shader.vertexShader.replace(
        '#include <uv_vertex>','#include <uv_vertex>\n stoneMetres=uv;');
      shader.fragmentShader=noise+shader.fragmentShader.replace('#include <map_fragment>',fragment);
      if(roughness)shader.fragmentShader=shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n'+roughness);
    };
    return material;
  }
  const paving=ground('Weathered limestone flags','cut-rock',2.7,.12,`
    // Align the long joints with the northeast-facing temple steps.
    vec2 m=mat2(.73,.68,-.68,.73)*stoneMetres;
    float row=floor(m.y/.54);
    vec2 flags=vec2(m.x/1.08+.5*mod(row,2.),m.y/.54);
    vec2 cell=floor(flags),f=fract(flags);
    float visibility=1.-smoothstep(.24,.95,max(fwidth(m.x)/1.08,fwidth(m.y)/.54));
    float key=tileHash(cell),faceTone=mix(.52,tileHash(cell+vec2(41.,15.)),visibility);
    vec2 rockUv=vMapUv+vec2(key,faceTone)*2.79;
    vec3 rock=mix(texture2D(map,vMapUv).rgb,texture2D(map,rockUv).rgb,visibility);
    float mineral=dot(rock,vec3(.299,.587,.114));
    float damp=fieldNoise(stoneMetres*.088);
    float abrasion=fieldNoise(rockUv*2.9);
    vec3 grey=mix(vec3(.144,.155,.151),vec3(.248,.250,.228),faceTone);
    grey*=clamp(.73+mineral*3.2,.72,1.28)*(.85+.20*abrasion);
    grey*=1.-smoothstep(.54,.9,damp)*.20;
    vec2 metresToEdge=min(f,1.-f)*vec2(1.08,.54);
    float edge=min(metresToEdge.x,metresToEdge.y);
    float aa=max(.0006,.65*max(fwidth(m.x),fwidth(m.y)));
    float seam=1.-smoothstep(.006-aa,.006+aa,edge);
    float nearDetail=1.-smoothstep(.04,.19,aa);
    vec3 joint=mix(vec3(.060,.058,.049),vec3(.092,.096,.075),damp);
    diffuseColor.rgb*=mix(grey,joint,seam*nearDetail);
  `, 'roughnessFactor=clamp(.86+.08*mix(.5,key,visibility)-.12*smoothstep(.54,.9,damp)+.08*seam,.62,1.);');

  function vegetation(name,scan,size,strength,baseColor){
    const material=ground(name,scan,size,strength,`
      float moisture=fieldNoise(stoneMetres*.053);
      float cover=fieldNoise(stoneMetres*.19+vec2(7.,-16.));
      vec2 offset=vec2(moisture,cover)*.34;
      vec3 blade=texture2D(map,vMapUv+offset).rgb;
      vec3 broad=texture2D(map,mat2(.82,.57,-.57,.82)*vMapUv*.43+offset).rgb;
      vec3 organic=mix(blade,broad,.18);
      float grain=dot(organic,vec3(.28,.60,.12));
      diffuseColor.rgb*=${baseColor}*(.48+3.0*grain)*(.80+.26*moisture+.19*cover);
      diffuseColor.rgb*=mix(vec3(1.05,.97,.86),vec3(.89,1.05,.95),moisture);
    `);
    // An optional geographic alpha mask feathers surveyed garden boundaries
    // into the underlying soil; opaque stone and footpaths still write depth.
    material.transparent=true;
    material.alphaTest=.012;
    material.depthWrite=false;
    material.forceSinglePass=true;
    return material;
  }
  const lawn=vegetation('Temple lawn','meadow',3.1,.45,'vec3(.18,.252,.112)');
  const wood=vegetation('Temple woodland floor','verge',3.8,.52,'vec3(.128,.143,.078)');
  const masks=[];
  let maskGraph=null;
  function bakeMask(kind,material){
    const rings=(window.tamChucGroundCover||[]).filter(area=>area[0]===kind).map(area=>area[1]);
    if(!rings.length)return;
    let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
    for(const coords of rings)for(let i=0;i<coords.length;i+=2){
      west=Math.min(west,coords[i]);east=Math.max(east,coords[i]);
      south=Math.min(south,coords[i+1]);north=Math.max(north,coords[i+1]);
    }
    // Input coordinates are millionths of a degree from 105.79 E, 20.54 N.
    west-=64;east+=64;south-=64;north+=64;
    const canvas=document.createElement('canvas');
    const widthMetres=(east-west)*.1042,heightMetres=(north-south)*.1109;
    const scale=Math.min(1,1024/Math.max(widthMetres,heightMetres));
    canvas.width=Math.ceil(widthMetres*scale);canvas.height=Math.ceil(heightMetres*scale);
    const c=canvas.getContext('2d');
    c.fillStyle='#000';c.fillRect(0,0,canvas.width,canvas.height);
    const path=new Path2D();
    for(const coords of rings){
      for(let i=0;i<coords.length;i+=2){
        const x=(coords[i]-west)/(east-west)*canvas.width;
        const y=(north-coords[i+1])/(north-south)*canvas.height;
        if(i)path.lineTo(x,y);else path.moveTo(x,y);
      }
      path.closePath();
    }
    c.fillStyle='#fff';c.fill(path);
    // Fade inwards. Alpha remains near zero where the triangulated polygon
    // physically ends, including concave corners and thin strips of planting.
    c.lineJoin='round';c.lineCap='round';
    const transition=kind==='wood'?5.2:2.9;
    for(let band=9;band>=1;band--){
      const value=Math.round(255*(band-1)/9);
      c.lineWidth=Math.max(.65,2*transition*scale*band/9);
      c.strokeStyle='rgb('+value+' '+value+' '+value+')';
      c.stroke(path);
    }
    const texture=new T.CanvasTexture(canvas);
    texture.name='Tam Chuc '+kind+' margins';texture.flipY=false;
    material.alphaMap=texture;material.needsUpdate=true;
    masks.push({texture,west:105.79+west/1e6,north:20.54+north/1e6,
      east:105.79+east/1e6,south:20.54+south/1e6});
  }
  function setOrigin(graph){
    if(!graph||graph===maskGraph)return;
    if(!masks.length){bakeMask('lawn',lawn);bakeMask('wood',wood);}
    for(const mask of masks){
      const nw=graph.point(mask.west,mask.north),se=graph.point(mask.east,mask.south);
      const sx=1/(se.x-nw.x),sz=1/(se.z-nw.z);
      mask.texture.repeat.set(sx,sz);
      mask.texture.offset.set(-nw.x*sx,-nw.z*sz);
    }
    maskGraph=graph;
  }
  return {paving,lawn,wood,setOrigin};
};
