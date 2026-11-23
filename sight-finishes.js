'use strict';
function createSightFinishes(T,nightLights){
  const damp={value:0},pending=new Map();
  // Local coordinates in the authored models. The fourth value is the reach
  // in metres of a light on the stonework, under the eaves, or above a deck.
  const fixtures={
    turtle:{tint:0xffce87,bulbs:[[3,.9,4.9,10],[-3.8,1,-2,9],[0,1.5,-5,9]]},
    'ngo-mon':{tint:0xffca90,bulbs:[[-19,2,20,23],[18,2,20,22],[0,7,7.8,16]]},
    rong:{tint:0xffbd75,bulbs:[[-3,2,6.7,9],[3,2,6.7,9],[0,5,-5.8,13]]},
    market:{tint:0xffdaab,bulbs:[[0,13,64,16],[-19,4,65,17],[20,4,65,17]]},
    'cho-noi-cai-rang':{tint:0xffc173,bulbs:[[-6,3,-21,7],[1,2.8,-5,8],[8,3,12,8]]},
    'thanh-co-vinh':{tint:0xffc982,bulbs:[[0,4.5,6,14],[-7,5,4.5,12],[7,5,4.5,12]]},
    'den-cuong':{tint:0xffc985,bulbs:[[0,5,3.5,13],[-6,4,3,11],[6,4,3,11]]},
    'quang-truong-hcm-vinh':{tint:0xffd89c,bulbs:[[0,10,12,24],[-14,5,10,18],[14,5,10,18]]},
    'cau-rong':{tint:0xffb84d,bulbs:[[-22,10,0,28],[0,13,0,32],[24,10,0,28]]},
    'cau-song-han':{tint:0x8ad8ff,bulbs:[[-16,12,0,26],[0,22,0,34],[16,12,0,26]]},
    'cau-tran-thi-ly':{tint:0xffc278,bulbs:[[-18,12,0,28],[0,28,0,38],[18,12,0,28]]},
    'hoi-quan-phuc-kien':{tint:0xffb562,bulbs:[[0,4,6,14],[-6,3.5,5,11],[6,3.5,5,11]]},
    'cau-truong-tien':{tint:0xc8a4ff,bulbs:[[-28,8,0,24],[0,9,0,26],[28,8,0,24]]},
    'phu-van-lau':{tint:0xffc985,bulbs:[[0,4,7,14],[-7,4,6,12],[7,4,6,12]]},
    'dien-thai-hoa':{tint:0xffcf87,bulbs:[[0,5,12,20],[-14,5,10,16],[14,5,10,16]]},
    'quang-binh-quan':{tint:0xffc988,bulbs:[[0,5,6,15],[-6,4,5,12],[6,4,5,12]]},
    'thap-tram-huong':{tint:0xffb67a,bulbs:[[0,8,9,18],[0,18,7,20],[0,28,5,18]]},
    'quang-truong-lam-vien':{tint:0xffe07d,bulbs:[[-14,8,8,20],[0,10,10,22],[14,8,8,20]]},
    'bao-tang-ca-phe':{tint:0xffcc88,bulbs:[[-12,4,8,16],[0,5,10,18],[12,4,8,16]]}
  };
  const finishes={
    'ngo-mon':`
      if(finishPoint.y<5.75 && abs(fn.y)<.6){
        vec2 block=face/vec2(.78,.29);
        block.x+=.5*mod(floor(block.y),2.);
        vec2 edge=min(fract(block),1.-fract(block)),aa=max(fwidth(block),vec2(.002));
        vec2 joint=smoothstep(vec2(.014)-aa*.5,vec2(.034)+aa*.5,edge);
        float detail=1.-smoothstep(.25,1.,max(aa.x,aa.y));
        diffuseColor.rgb*=1.+detail*(.12*(stoneHash(floor(block))-.5)-.28*(1.-joint.x*joint.y));
      }`,
    rong:`
      if(finishPoint.y>5.3 && finishPoint.y<21.4){
        float weave=face.x*38.+.48*sin(face.y*2.7+floor(face.x*5.));
        float fibre=sin(weave*6.283)*(1.-smoothstep(.12,.68,fwidth(weave)));
        float bundles=stoneNoise(face*vec2(8.,.46));
        diffuseColor.rgb*=vec3(1.09,1.035,.93)*(.92+.17*bundles+.11*fibre);
      }`,
    turtle:`
      if(finishPoint.y>.72 && finishPoint.y<6.7 && abs(fn.y)<.6){
        float patina=(1.-smoothstep(.85,3.5,finishPoint.y))*smoothstep(.42,.76,stain);
        diffuseColor.rgb*=mix(vec3(1.),vec3(.68,.78,.61),patina*.72);
      }`
  };
  let worker,sequence=0;
  function occlude(g){
    const p=g.attributes.position,n=g.attributes.normal,color=g.attributes.color;
    if(!color||!n||!p||p.count<60||!window.Worker)return;
    if(!worker){
      worker=new Worker('sight-occlusion.js');
      worker.onmessage=({data:{id,light}})=>{
        const target=pending.get(id);pending.delete(id);
        if(!target||target.count!==light.length)return;
        for(let i=0;i<light.length;i++){
          const f=light[i]/255;target.setXYZ(i,target.getX(i)*f,target.getY(i)*f,target.getZ(i)*f);
        }
        target.needsUpdate=true;
      };
      worker.onerror=()=>{pending.clear();worker.terminate();worker=null;};
    }
    const id=++sequence,positions=p.array.slice(),normals=n.array.slice(),indices=g.index?.array.slice();
    pending.set(id,color);g.addEventListener('dispose',()=>pending.delete(id));
    const buffers=[positions.buffer,normals.buffer];if(indices)buffers.push(indices.buffer);
    worker.postMessage({id,positions,normals,indices},buffers);
  }
  function apply(group){
    const brick=['ponagar','thap-doi','thap-vinh-hung','my-son','pho-minh','phuoc-duyen',
      'thap-bang-an','thap-khuong-my','thap-chien-dan','thap-banh-it','thap-duong-long',
      'thap-canh-tien','thap-nhan-tuy-hoa','po-klong-garai','thap-po-rome','thap-po-sah-inu'].includes(group.name);
    const rig=fixtures[group.name];
    const surface=finishes[group.name]||'';
    const bulbs=rig?.bulbs.map(([x,y,z,r])=>new T.Vector4(x,y,z,r));
    if(rig){
      const point=new T.Vector3();
      group.userData.placeLights=()=>{
        group.updateWorldMatrix(true,false);
        rig.bulbs.forEach(([x,y,z,r],i)=>{
          point.set(x,y,z).applyMatrix4(group.matrixWorld);
          bulbs[i].set(point.x,point.y,point.z,r);
        });
      };
    }
    const seen=new Set();
    group.traverse(obj=>{
      const m=obj.material,g=obj.geometry;
      if(!m?.isMeshStandardMaterial||m.transparent||m.alphaTest||!g)return;
      if(!seen.has(g)){occlude(g);seen.add(g);}
      if(m.userData.sightFinish)return;
      m.userData.sightFinish=true;
      const previous=m.onBeforeCompile,program=m.customProgramCacheKey();
      m.customProgramCacheKey=()=>program+'-sight-'+brick+(rig?'-lit':'')+(surface?group.name:'');
      m.onBeforeCompile=function(shader,renderer){
        previous.call(this,shader,renderer);shader.uniforms.rainOnSight=damp;
        const vary='varying vec3 finishPoint; varying vec3 finishNormal;\n';
        shader.vertexShader=vary+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n finishPoint=position;finishNormal=normal;');
        shader.fragmentShader=vary+`uniform float rainOnSight;
          float stoneHash(vec2 p){vec3 h=fract(p.xyx*.1031);h+=dot(h,h.yzx+33.33);return fract((h.x+h.y)*h.z);}
          float stoneNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(stoneHash(i),stoneHash(i+vec2(1,0)),f.x),mix(stoneHash(i+vec2(0,1)),stoneHash(i+1.),f.x),f.y);}
        `+shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          vec3 fn=normalize(finishNormal);
          vec2 face=abs(fn.y)>.68?finishPoint.xz:vec2(abs(fn.x)>abs(fn.z)?finishPoint.z:finishPoint.x,finishPoint.y);
          float stain=stoneNoise(face*vec2(.69,.19))*.65+stoneNoise(face*2.9)*.35;
          float wet=rainOnSight*(.25+.64*max(0.,fn.y)+.10*stain);
          diffuseColor.rgb*=1.+(stain-.5)*.18-wet*.23;
          roughnessFactor=mix(roughnessFactor,min(.29,roughnessFactor),wet);
          ${surface}
          ${brick?`if(${g.hasAttribute('finishKind')?'surfaceKind<.5 && ':''}diffuseColor.r>diffuseColor.g*1.38 && abs(fn.y)<.8){
            vec2 course=face/vec2(.31,.095);course.x+=mod(floor(course.y),2.)*.5;
            vec2 edge=min(fract(course),1.-fract(course)),aa=max(fwidth(course),vec2(.005));
            vec2 body=smoothstep(vec2(.026)-aa*.5,vec2(.055)+aa*.5,edge);
            float detail=1.-smoothstep(.24,.91,max(aa.x,aa.y));
            diffuseColor.rgb*=1.+detail*((stoneHash(floor(course))-.5)*.21-(1.-body.x*body.y)*.24);
          }`:''}`);
        if(rig){
          shader.uniforms.sightBulbs={value:bulbs};
          shader.uniforms.sightLampTint={value:new T.Color(rig.tint)};
          shader.uniforms.nightOnSight=nightLights;
          shader.fragmentShader='uniform vec4 sightBulbs[3]; uniform vec3 sightLampTint; uniform float nightOnSight;\n'+
            shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
              if(nightOnSight>.015){
                float spill=0.;
                for(int i=0;i<3;i++){
                  vec3 lightRay=(viewMatrix*vec4(sightBulbs[i].xyz,1.)).xyz+vViewPosition;
                  float d=max(.08,length(lightRay)),f=max(0.,1.-d/sightBulbs[i].w);
                  spill+=f*f*max(dot(normal,lightRay/d),0.);
                }
                reflectedLight.directDiffuse+=diffuseColor.rgb*sightLampTint*(spill*nightOnSight*2.8);
              }`);
        }
      };
    });
  }
  return {apply,weather(value){damp.value=value;}};
}
