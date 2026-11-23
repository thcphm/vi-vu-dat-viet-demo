'use strict';
(() => {
  const widths={motorway:7.3,trunk:6.9,primary:6.1,secondary:5.2,tertiary:4.6,residential:3.4,unclassified:3.4,service:2.8};
  const namedPass=e=>e&&typeof e==='object'&&e.name?.startsWith('Đèo ')&&!e.oneway;
  window.worldRoadHalfWidth=edge=>{
    if(edge?.authoredHalfWidth)return edge.authoredHalfWidth;
    if(edge?.traffic?.width)return Math.max(1.1,Math.min(40,edge.traffic.width/2));
    if(edge?.traffic?.lanes)return edge.traffic.lanes*(edge.kind.startsWith('motorway')?1.8:1.6);
    const kind=typeof edge==='string'?edge:edge?.kind;
    const w=String(kind).endsWith('_link')?3.8:widths[kind]||4.2;
    return namedPass(edge)?Math.min(w,3.85):w;
  };

  // Use a geographic grid so revisiting the same place from another spawn keeps the same trees.
  function* forestPlots(graph,cx,cz,radius,visit){
    const pitch=12,metresLon=105000,metresLat=110900;
    const [lon,lat]=graph.geo(cx,cz);
    const east=lon*metresLon,south=-lat*metresLat,rx=radius*metresLon/graph.mx;
    for(let ix=Math.floor((east-rx)/pitch);ix<=Math.floor((east+rx)/pitch);ix++){
      yield;
      for(let iz=Math.floor((south-radius)/pitch);iz<=Math.floor((south+radius)/pitch);iz++){
        let seed=(Math.imul(ix,73856093)^Math.imul(iz,19349663))>>>0;
        const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        const gx=(ix+rand())*pitch,gz=(iz+rand())*pitch;
        const p=graph.point(gx/metresLon,-gz/metresLat);
        if(Math.hypot(p.x-cx,p.z-cz)<=radius)visit(ix,iz,p.x,p.z,gx,gz,rand);
      }
    }
  }

  window.createWorldScene=function(canvas,onBreakfastCall){
    const T=window.THREE,scene=new T.Scene();
    const renderer=DrivingRenderer.get(canvas,{powerPreference:'high-performance'});
    if(!renderer)throw Error('Chưa mở được cảnh lái 3D.');
    // ANGLE can translate shaders again to produce debug logs on their first draw.
    renderer.debug.checkShaderErrors=false;
    const small=matchMedia('(pointer:coarse)').matches;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
    scene.background=new T.Color(0xaec5d2);scene.fog=new T.FogExp2(0xc2d1d0,.00072);
    const markerPoint=new T.Vector3();
    const camera=new T.PerspectiveCamera(61,1,.14,28000);
    const breakfast=createBreakfastStall(T,scene);
    const skyLoader=new T.TextureLoader();
    function texture(file,tile=false){
      const t=skyLoader.load('streetscape/'+file);
      t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      if(tile)t.wrapS=t.wrapT=T.RepeatWrapping;
      return t;
    }
    const environmentReady=skyLoader.loadAsync('streetscape/river-reflection.jpg').then(t=>{
      t.colorSpace=T.SRGBColorSpace;t.mapping=T.EquirectangularReflectionMapping;scene.environment=t;
    }).catch(()=>{});
    const sun=new T.DirectionalLight(0xffefcf,2.30);
    const atmosphere=createWorldAtmosphere(T,scene,sun,skyLoader);
    const graphics=createDrivingGraphics(renderer,camera,sun);
    sun.castShadow=true;
    Object.assign(sun.shadow.camera,{left:-43,right:43,bottom:-43,top:43,near:1,far:175});
    sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.025;sun.shadow.bias=-.00025;scene.add(sun,sun.target);
    const basic=c=>new T.MeshLambertMaterial({color:c});
    const surfaces=createRoadSurfaces(T,renderer);
    const treeModels=createTreeModels(T);
    let treeBatches=[];
    function updateTreeDetail(x,z,profile){
      for(const batch of treeBatches){
        const {mesh,bounds,kind,variant}=batch;
        const dx=Math.max(0,bounds.min.x-x,x-bounds.max.x),dz=Math.max(0,bounds.min.z-z,z-bounds.max.z);
        const distance2=dx*dx+dz*dz;
        const near=profile.treeDetail+(batch.level===0?5:0),far=profile.treeCanopy+(batch.level===1?8:0);
        const level=distance2<near*near&&kind!=='tea'?0:distance2<far*far||kind==='palm'?1:2;
        if(level===batch.level)continue;
        batch.level=level;
        mesh.geometry=level===2?treeModels.distantGeometry(kind,variant):treeModels.geometry(kind,level===1,variant);
        mesh.material=level===2?treeModels.billboardMaterial():kind==='palm'?treeModels.palmMaterial:treeModels.material;
      }
    }
    const material={
      asphalt:surfaces.scanned('asphalt',0xaeb2b3,.41),
      earth:surfaces.scanned('verge',0xd7d1bc,.65),
      white:basic(0xe8e8d7),yellow:basic(0xf0ca63),wall:surfaces.scanned('plaster',0xfff9e9,.6),roof:basic(0x748585),
      gable:new T.MeshStandardMaterial({color:0xf6e2c6,roughness:.84}),
      pavement:basic(0xc2b8a3),steel:basic(0x687877),concrete:basic(0xb0afa3),glass:new T.MeshStandardMaterial({color:0x5c7979,roughness:.19,metalness:.53,envMapIntensity:.86}),
      awning:basic(0x9c9f92),tree:treeModels.material,pine:treeModels.material,palm:treeModels.palmMaterial
    };
    material.lantern=new T.MeshStandardMaterial({color:0xd0cbb9,roughness:.43,emissive:0xffc786,emissiveIntensity:0});
    const asphaltOrigin=new T.Vector2();
    material.glass.emissive.setHex(0xda9e60);material.glass.emissiveIntensity=0;
    const weather=createDrivingWeather(T,scene,sun,material.asphalt);
    material.cut=new T.MeshStandardMaterial({normalScale:new T.Vector2(.62,.62),roughness:.96,side:T.DoubleSide,color:0xbcb5a6});
    material.fern=new T.MeshLambertMaterial({map:texture('surfaces/bank-fern.webp'),alphaTest:.38,side:T.DoubleSide,color:0xd6dfd1});
    const foliageEye=new T.Vector3();
    material.fern.onBeforeCompile=shader=>{
      shader.uniforms.foliageEye={value:foliageEye};
      shader.vertexShader='uniform vec3 foliageEye; varying float foliageFade;\n'+shader.vertexShader
        .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal=vec3(0.,1.,0.);')
        .replace('#include <project_vertex>','#include <project_vertex>\n foliageFade=foliageEye.z*smoothstep(120.,185.,distance(instanceMatrix[3].xz,foliageEye.xy));');
      shader.fragmentShader='varying float foliageFade;\n'+shader.fragmentShader
        .replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal*=faceDirection;')
        .replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb*=2.25;')
        .replace('#include <alphatest_fragment>','#include <alphatest_fragment>\n if(foliageFade>0. && foliageFade>=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))))discard;');
    };
    material.rail=new T.MeshStandardMaterial({color:0xaab2af,metalness:.55,roughness:.49,side:T.DoubleSide});
    material.asphalt.side=material.earth.side=T.DoubleSide;
    material.roadConcrete=material.wall.clone();
    material.roadConcrete.name='Cast concrete road';
    material.roadConcrete.color.setHex(0xb1afa3);material.roadConcrete.normalScale.set(.13,.13);material.roadConcrete.side=T.DoubleSide;
    material.roadSlabs=new T.MeshStandardMaterial({name:'Concrete road panels',color:0xb4b2a8,roughness:.91,side:T.DoubleSide});
    material.roadWood=new T.MeshStandardMaterial({name:'Timber deck',color:0x8e6e50,roughness:.89,side:T.DoubleSide});
    material.roadMetal=new T.MeshStandardMaterial({name:'Steel deck',color:0x909997,metalness:.50,roughness:.65,side:T.DoubleSide});
    // UV runs along the road, then across it. Planks and expansion joints turn with the mapped road.
    for(const [mat,spacing,joint] of [[material.roadWood,.22,.009],[material.roadSlabs,4.5,.018]]){
      mat.userData.roadPanels=true;
      mat.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec2 deckUV;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n deckUV=uv;');
        shader.fragmentShader='varying vec2 deckUV;\n'+shader.fragmentShader.replace('#include <color_fragment>',
          '#include <color_fragment>\n'+
          'float phase=deckUV.x/'+spacing.toFixed(2)+'; float aa=max(fwidth(phase),.0001);'+
          'float jointWidth='+joint.toFixed(3)+'/'+spacing.toFixed(2)+'; float gap=abs(fract(phase+.5)-.5);'+
          'float body=smoothstep(jointWidth-aa*.5,jointWidth+aa*.5,gap);'+
          'float board=fract(sin(mod(floor(phase),1024.)*37.7)*917.1);'+
          'diffuseColor.rgb*=mix(mix(.6,.96+.06*board,body),.99,smoothstep(.2,.8,aa));');
      };
      mat.customProgramCacheKey=()=>mat.name;
    }
    material.pavers=new T.MeshStandardMaterial({color:0xb5ada4,roughness:.91,side:T.DoubleSide});
    const grassClump=createVergeGrass(T);
    const sparseGrass=small?createVergeGrass(T,7):grassClump;
    material.vergeGrass=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
    let temple;
    const curbStone=new T.MeshStandardMaterial({color:0x979388,roughness:.94,side:T.DoubleSide});
    material.pavers.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 paving;\n'+shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n paving=uv;');
      shader.fragmentShader='varying vec2 paving;\n'+shader.fragmentShader.replace('#include <color_fragment>',
        `#include <color_fragment>
         vec2 p=paving/vec2(.49,.25);p.x+=.5*mod(floor(p.y),2.);
         vec2 edge=min(fract(p),1.-fract(p)),aa=max(fwidth(p),vec2(.01));
         vec2 face=smoothstep(vec2(.01)-aa*.5,vec2(.044)+aa*.5,edge);
         float detail=1.-smoothstep(.35,1.6,max(aa.x,aa.y));
         diffuseColor.rgb*=mix(.94,mix(.57,1.,face.x*face.y),detail);`);
    };
    surfaces.transform(material.wall,2,2);
    const shopTypes=['cafe','bakery','grocer','pho','garage','pharmacy'];
    const upstairs=new Set(['cafe','grocer','pharmacy']);
    for(const [i,name] of shopTypes.entries()){
      material['front'+i]=new T.MeshStandardMaterial({
        name:'Shopfront '+name,map:texture('surfaces/front-'+name+'.webp'),roughness:.91,metalness:0
      });
    }
    const centralStreetscapes=window.CentralStreetscapes?.create(T,scene,renderer,material);
    const meadow=surfaces.scanned('meadow',0xafbd9d,.56);
    const upland=surfaces.scanned('grass',0x8ea68d,.67);
    const landscapeSource=createSightLandscapes(T);
    const groundSource=createSightGrounds(T,small);
    const environment=createVietnamEnvironment(),amenities=createVietnamAmenities(),structures=createVietnamStructures();
    const osmBuildings=createVietnamOsmBuildings();
    const coverMap=createWorldLandCover(T,environment);
    const streetLife=createWorldStreetLife(T,scene,small,environment,amenities,prepareActor);
    const signs=createWorldSigns(T,scene,small);
    const mappedLights=createMappedTrafficLights(T,scene,small);
    const landWidth=2048,landSegments=landWidth/vietnamReliefStep;
    let land=new T.Mesh(new T.PlaneGeometry(landWidth,landWidth,landSegments,landSegments),meadow);
    const landIndex=land.geometry.index;
    land.geometry.setAttribute('shoreSediment',new T.Float32BufferAttribute(new Float32Array(land.geometry.attributes.position.count),1));
    let shorePatch=null;
    const shoreEarth=texture('verge-earth.webp',true);
    const landOrigin=new T.Vector2();
    const tunnelCut=createTunnelCut(T),caveOpenings=createCaveOpenings(T);
    // Low-frequency variation is fixed in geographic space. Close-up grain stays sharp.
    for(const mat of [meadow,upland]){
      mat.onBeforeCompile=shader=>{
        shader.uniforms.landOrigin={value:landOrigin};shader.uniforms.shoreEarth={value:shoreEarth};
        shader.vertexShader='uniform vec2 landOrigin; varying vec2 groundMetres; attribute float shoreSediment; varying float bankWet;\n'+shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n groundMetres=vec2(position.x,-position.y)+landOrigin; bankWet=shoreSediment;');
        shader.fragmentShader='varying vec2 groundMetres; varying float bankWet; uniform sampler2D shoreEarth;\n'+shader.fragmentShader.replace('#include <map_fragment>',
          '#include <map_fragment>\n float patchiness=sin(dot(groundMetres,vec2(.035,.019)))+.55*cos(dot(groundMetres,vec2(-.015,.047))); diffuseColor.rgb*=vec3(.96,.98,.95)+patchiness*vec3(.08,.035,.05); vec3 silt=texture2D(shoreEarth,groundMetres*.58).rgb; float bank=clamp(bankWet+(silt.g-.17)*.7,0.,1.)*smoothstep(0.,.2,bankWet); diffuseColor.rgb=mix(diffuseColor.rgb,silt*mix(vec3(.84,.78,.66),vec3(.34,.31,.25),bankWet),bank);');
        coverMap.shade(shader);landscapeSource.shade(shader);landscapeSource.shadeWaterBoundary(shader,false);groundSource.shade(shader);
        relief.passSurface.shade(shader,'groundMetres','(.40+.46*smoothstep(35.,450.,length(vViewPosition)))*(1.-bankWet)');
        tunnelCut.shade(shader,'groundMetres');caveOpenings.shade(shader);
        // The satellite texels span several metres. Restore ground-scale contrast
        // after the regional tint, including at the edge of a streamed tile.
        shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`
          vec3 blades=texture2D(map,vMapUv).rgb;
          float fineGrass=clamp(dot(blades,vec3(.21,.72,.07))*4.0,.50,1.48);
          float broadGrass=smoothstep(.12,.35,texture2D(map,groundMetres*.033).g);
          float localDetail=(1.-smoothstep(65.,310.,length(vViewPosition)))*(1.-bankWet);
          diffuseColor.rgb*=mix(vec3(1.),mix(vec3(.76,.83,.69),vec3(1.12,1.08,.94),broadGrass)*fineGrass,localDetail*.80);
          #include <alphamap_fragment>`);
      };
    }
    land.rotation.x=-Math.PI/2;land.position.y=-.17;land.receiveShadow=true;scene.add(land);
    const waterSurface=createDrivingWater(T,true);
    const shadeWater=waterSurface.material.onBeforeCompile;
    waterSurface.material.onBeforeCompile=function(shader,renderer){
      shadeWater.call(this,shader,renderer);landscapeSource.shadeWaterBoundary(shader,true);
      tunnelCut.shade(shader,'waterMetres');caveOpenings.shade(shader);
    };
    surfaces.weatheredAsphalt(material.asphalt,atmosphere.wetness,asphaltOrigin,waterSurface.reflection);
    for(const finish of [...Object.values(material),meadow,upland,waterSurface.material])atmosphere.registerFinish(finish);
    const relief=createVietnamRelief(T,scene,graphics.profile.id==='low',landscapeSource,tunnelCut,landWidth,caveOpenings);
    const sightings=createSkySightings(T,scene,Math.random,relief.ground);
    const unitBox=new T.BoxGeometry(),unitPlane=new T.PlaneGeometry(),unitPole=new T.CylinderGeometry(.5,.5,1,8);
    const roofSection=new T.Shape();roofSection.moveTo(-.5,0);roofSection.lineTo(0,1);roofSection.lineTo(.5,0);roofSection.closePath();
    const gable=new T.ExtrudeGeometry(roofSection,{depth:1,bevelEnabled:false});gable.translate(0,0,-.5);
    const wireMaterial=new T.LineBasicMaterial({color:0x50554d,transparent:true,opacity:.64});
    const temp=new T.Object3D(),tone=new T.Color();
    const roadsideImpact=createRoadsideImpact(T,scene,relief.ground);
    let groundAt=relief.ground,bridges=null,tunnels=null;
    const driveGround=(x,z,edge)=>groundAt(x,z,edge);
    function drivingSurface(bridges,tunnels,pavementLift,roadway,shoreBed,cx,cz){
      return (x,z,edge)=>{
        const deck=tunnels?.at(x,z,edge)??bridges?.at(x,z,edge);
        if(deck!=null)return deck;
        const lift=pavementLift(x-cx,z-cz);
        return lift?roadway(x,z)+lift:(shoreBed(x,z)??roadway(x,z));
      };
    }
    function driveGrade(x,z,yaw,edge){
      const dx=2.2*Math.sin(yaw),dz=-2.2*Math.cos(yaw);
      // Sample the slope along the road's tangent so the edge of a raised deck
      // doesn't induce a near-vertical roll when a tyre gets near the rail.
      const structure=edge&&(sceneGraph?.tunnels.info(edge)?tunnels:bridges);
      if(structure?.at(x,z,edge)!=null){
        const c=sceneGraph.nearest(x,z,[edge]),p=sceneGraph.sample(c);
        const a=Math.max(0,c.s-2.2),b=Math.min(edge.length,c.s+2.2);
        return (structure.height(edge,b)-structure.height(edge,a))/(b-a)*Math.cos(yaw-p.yaw);
      }
      return (driveGround(x+dx,z+dz)-driveGround(x-dx,z-dz))/4.4;
    }
    let roadGroup=null,sceneGraph=null,originX=0,originZ=0,shadowStamp=-1000,districtRadius=0;
    let streetBulbs=[];
    const streetLights=Array.from({length:3},()=>{
      const light=new T.PointLight(0xffc88a,0,32,2);
      scene.add(light);return light;
    });
    let nextLightCheck=0;
    const landmarkSource=window.VietnamLandmarks?.create(T,scene,atmosphere.lamps);
    const buildingSource=createTourDistrict(T,scene,material.wall,structures,osmBuildings,atmosphere.lamps);
    let district=buildingSource,grounds=groundSource,landmarks=landmarkSource;
    let spare=null,job=null;
    let nearbyWaterLevel=()=>null;
    let obstacleCells=new Map(),waterAt=()=>null;
    const obstacleKey=(x,z)=>Math.floor(x/15)+','+Math.floor(z/15);
    function indexObstacle(obstacleCells,o){
      const reach=o.radius||Math.hypot(o.w,o.d);
      for(let i=Math.floor((o.x-reach-3)/15);i<=Math.floor((o.x+reach+3)/15);i++)
        for(let j=Math.floor((o.z-reach-3)/15);j<=Math.floor((o.z+reach+3)/15);j++){
          const key=i+','+j;
          if(!obstacleCells.has(key))obstacleCells.set(key,[]);
          obstacleCells.get(key).push(o);
        }
      return o;
    }
    function regionContact(obstacleCells,originX,originZ,sceneGraph,tunnels,landmarks,district,x,z,r=.95,y=null,edge=null){
      const px=x-originX,pz=z-originZ;
      const inBore=edge&&sceneGraph.tunnels.info(edge)?.bore&&tunnels.at(x,z,edge,r+1)!=null;
      let hit=null;
      for(const o of obstacleCells.get(obstacleKey(px,pz))||[]){
        if(inBore&&o.baseY==null)continue;
        if(y!==null){
          const base=o.baseY??relief.ground(x,z);
          if(y+1.35<base||y>base+(o.height??7)+.12)continue;
        }
        const dx=px-o.x,dz=pz-o.z;
        let nx,nz,depth;
        if(o.radius){
          const dist=Math.hypot(dx,dz);
          nx=dist?dx/dist:1;nz=dist?dz/dist:0;depth=r+o.radius-dist;
        }else{
          const u=dx*o.fx+dz*o.fz,v=-dx*o.fz+dz*o.fx;
          let a=u-Math.min(o.w,Math.max(-o.w,u)),b=v-Math.min(o.d,Math.max(-o.d,v));
          const dist=Math.hypot(a,b);
          if(dist){depth=r-dist;a/=dist;b/=dist;}
          else if(o.w-Math.abs(u)<o.d-Math.abs(v)){depth=r+o.w-Math.abs(u);a=u>=0?1:-1;b=0;}
          else{depth=r+o.d-Math.abs(v);a=0;b=v>=0?1:-1;}
          nx=a*o.fx-b*o.fz;nz=a*o.fz+b*o.fx;
        }
        if(depth>0&&(!hit||depth>hit.depth))hit={nx,nz,depth,kind:o.kind,id:o.id,height:o.height,pointX:x+nx*(depth-r),pointZ:z+nz*(depth-r)};
      }
      if(inBore)return hit;
      return hit||landmarks?.contact(x,z,r,y)||(y===null||y<relief.ground(x,z)+3?district.contact(x,z,r):null);
    }
    function contact(...args){return regionContact(obstacleCells,originX,originZ,sceneGraph,tunnels,landmarks,district,...args);}
    function discardRoads(roadGroup){
      if(!roadGroup)return;roadGroup.removeFromParent();
      roadGroup.traverse(obj=>{if(obj.isInstancedMesh)obj.dispose();else if(obj.geometry)obj.geometry.dispose();});
    }
    function makeSpare(){
      const nextLand=new T.Mesh(new T.PlaneGeometry(landWidth,landWidth,landSegments,landSegments),land.material);
      nextLand.geometry.setAttribute('shoreSediment',land.geometry.attributes.shoreSediment.clone());
      nextLand.rotation.x=-Math.PI/2;nextLand.receiveShadow=true;
      return {land:nextLand,district:buildingSource.createView(new T.Group()),grounds:groundSource.createView()};
    }
    function activate(next){
      const previous={land,district,grounds};
      if(shorePatch)shorePatch.dispose();
      discardRoads(roadGroup);land.removeFromParent();district.group.removeFromParent();district.clear();
      ({land,district,grounds,landmarks,roadGroup,shorePatch,groundAt,bridges,tunnels,obstacleCells,waterAt,
        nearbyWaterLevel,sceneGraph,originX,originZ,treeBatches,streetBulbs}=next);
      spare=previous;
      scene.add(land,roadGroup,district.group);groundSource.display(grounds);landmarks?.activate();
    }
    function* buildRoads(slot,edges,cx,cz,water,graph,streamed){
      let work=0;
      const {land,district,grounds}=slot;
      const roadGroup=new T.Group(),treeBatches=[],streetBulbs=[],obstacleCells=new Map(),obstacles=[];
      let shorePatch=null,fieldPixels=null,committed=false;
      const registerObstacle=o=>{obstacles.push(o);return indexObstacle(obstacleCells,o);};
      try{
      const landscapes=landscapeSource.prepare(graph);
      const terrain=relief.prepare(graph,landscapes);
      yield;
      const bridges=graph?createBridgeDistrict(graph,edges,cx,cz,terrain.ground):null;
      const tunnels=graph?createTunnelDistrict(graph,edges,terrain.ground):null;
      const localGround=(x,z)=>terrain.ground(cx+x,cz+z);
      const landmarks=landmarkSource?yield* landmarkSource.prepareSteps(graph,cx,cz,terrain.ground,bridges?.signatureHeight):null;
      yield;
      yield* grounds.prepare(graph,cx,cz,landmarks);
      yield;
      if(streamed&&grounds.uniforms.visitorActive.value){
        renderer.initTexture(grounds.uniforms.visitorMap.value);
        yield;
      }
      const vistas=[];
      if(graph)for(const site of VietnamLandmarks.entries){
        const end=graph.point(site.lon,site.lat);if(Math.hypot(end.x-cx,end.z-cz)>1000)continue;
        const start=graph.point(...site.start),dx=end.x-start.x,dz=end.z-start.z;
        if(dx*dx+dz*dz<=70*70)vistas.push({start,dx,dz,length2:dx*dx+dz*dz||1});
      }
      function onApproach(x,z){
        return vistas.some(v=>{
          const dx=x-v.start.x,dz=z-v.start.z,f=(dx*v.dx+dz*v.dz)/v.length2;
          return f>-.12&&f<1.1&&Math.hypot(dx-v.dx*f,dz-v.dz*f)<9;
        });
      }
      const gx=Math.round(cx/terrain.step)*terrain.step,gz=Math.round(cz/terrain.step)*terrain.step,positions=land.geometry.attributes.position;
      const showCover=yield* coverMap.prepare(graph,gx,gz);
      land.position.set(gx-cx,-.17,gz-cz);
      for(let i=0;i<positions.count;i++){
        if((i&255)===0)yield;
        positions.setZ(i,terrain.ground(gx+positions.getX(i),gz-positions.getY(i)));
      }
      positions.needsUpdate=true;yield* updateTerrainNormals(T,land.geometry);land.geometry.computeBoundingSphere();
      const natural=localGround;
      const complexCenter=graph?.point(105.7956,20.5528);
      const innerPrecinct=complexCenter&&Math.hypot(complexCenter.x-cx,complexCenter.z-cz)<1500;
      const cover=complexCenter&&Math.hypot(complexCenter.x-cx,complexCenter.z-cz)<2200?(window.tamChucGroundCover||[]).map(([kind,coords])=>{
        const points=[];
        for(let i=0;i<coords.length;i+=2){
          const p=graph.point(105.79+coords[i]/1e6,20.54+coords[i+1]/1e6);
          points.push(new T.Vector2(p.x-cx,p.z-cz));
        }
        return {kind,points,bounds:new T.Box2().setFromPoints(points)};
      }):[];
      const groves=cover.filter(p=>p.kind==='wood');
      function inGrove(x,z){
        return groves.some(({points,bounds})=>{
          if(x<bounds.min.x||x>bounds.max.x||z<bounds.min.y||z>bounds.max.y)return false;
          let inside=false;
          for(let i=0,j=points.length-1;i<points.length;j=i++){
            const a=points[i],b=points[j];
            if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)inside=!inside;
          }
          return inside;
        });
      }

      const segments=[],cells=new Map(),roadData=[],landData=[],bankData=[],railVerts=[],railIndices=[],cutVerts=[],cutUv=[],cutIndices=[],yellow=[],white=[],wires=[],junctions=new Map(),batches=new Map(),candidates=[],rivals=new Map();
      const roadSurfaces={asphalt:roadData,earth:[],pavers:[],roadConcrete:[],roadSlabs:[],roadWood:[],roadMetal:[]};

      const cellSize=32,cutoff=graphics.profile.districtRadius,detailRadius=graphics.profile.scenery;
      // A small occupancy mask lets each generated building test its footprint in constant time.
      // Keep two samples across the narrowest stretches of the Chùa Âng moat.
      const fineBank=water?.some(f=>f.bankSpacing===2&&f.points.some(p=>Math.max(Math.abs(p.x-cx),Math.abs(p.z-cz))<cutoff+16));
      const maskScale=fineBank?.5:.25,maskSize=Math.ceil((2*cutoff*maskScale+8)/16)*16;
      // Raster cells are aligned in world metres across render-origin shifts.
      const maskX=Math.floor((cx-cutoff)/4)*4-cx,maskZ=Math.floor((cz-cutoff)/4)*4-cz;
      let wetMask=null;
      const sampleShore=(x,z)=>shorePatch?.sample(x,z)||null;
      if(water.length||landscapes.visible){
        const mask=document.createElement('canvas');mask.width=mask.height=maskSize;
        const painter=mask.getContext('2d',{willReadFrequently:true});
        painter.setTransform(maskScale,0,0,maskScale,-maskX*maskScale,-maskZ*maskScale);
        painter.fillStyle=painter.strokeStyle='#fff';painter.lineJoin=painter.lineCap='round';
        const currentCanvas=mask.cloneNode();
        const current=currentCanvas.getContext('2d',{willReadFrequently:true});
        current.setTransform(painter.getTransform());current.lineCap='round';
        // A named lake may be split into rings to preserve islands. Estimate a
        // shared stage from its shore samples, keeping the water below the banks.
        const samples=new Map(),poolIds=new Map(),pools=[null];
        for(const feature of water){
          if(feature.kind!=='lake'||(!feature.sharedStage&&! /^(hồ|đầm|ao|bàu)\s/i.test(feature.name||'')))continue;
          if(!samples.has(feature.name))samples.set(feature.name,[]);
          const values=samples.get(feature.name),stride=Math.max(1,Math.ceil(feature.points.length/18));
          for(let i=0;i<feature.points.length;i+=stride){const p=feature.points[i];values.push(terrain.ground(p.x,p.z));}
        }
        for(const [name,values] of samples){
          if(pools.length>=255)break;
          values.sort((a,b)=>a-b);poolIds.set(name,pools.length);pools.push(values[Math.floor(values.length*.16)]-.58);
        }
        for(const feature of water){
          if(!feature.points||feature.points.length<2)continue;
          if(feature.kind==='lake'){
            let ring=feature.points.map(p=>new T.Vector2(p.x-cx,p.z-cz));
            if(ring.at(-1).equals(ring[0]))ring.pop();
            // Clip the ring first so a lake stretching into other tiles stays cheap to render.
            for(const [axis,limit,sign] of [['x',-cutoff,1],['x',cutoff,-1],['y',-cutoff,1],['y',cutoff,-1]]){
              if(!ring.length)break;
              const clean=[];let prev=ring.at(-1),prevIn=(prev[axis]-limit)*sign>=0;
              for(const p of ring){
                const inside=(p[axis]-limit)*sign>=0;
                if(inside!==prevIn)clean.push(prev.clone().lerp(p,(limit-prev[axis])/(p[axis]-prev[axis])));
                if(inside)clean.push(p);prev=p;prevIn=inside;
              }
              ring=clean;
            }
            if(ring.length<3)continue;
            painter.fillStyle=shorePoolColour(poolIds.get(feature.name)||0);
            painter.beginPath();painter.moveTo(ring[0].x,ring[0].y);
            for(let i=1;i<ring.length;i++)painter.lineTo(ring[i].x,ring[i].y);
            painter.closePath();
            for(const island of feature.holes||[]){
              painter.moveTo(island[0].x-cx,island[0].z-cz);
              for(const p of island.slice(1))painter.lineTo(p.x-cx,p.z-cz);
              painter.closePath();
            }
            painter.fill('evenodd');
          }else{
            const radius=Math.min(90,Math.max(2,Number(feature.width)||(/suối/i.test(feature.name||'')?8:23)))/2;
            painter.globalCompositeOperation='destination-over';painter.strokeStyle='#000';painter.lineWidth=radius*2;
            for(let i=1;i<feature.points.length;i++){
              let ax=feature.points[i-1].x-cx,az=feature.points[i-1].z-cz,bx=feature.points[i].x-cx,bz=feature.points[i].z-cz;
              const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(len<.01)continue;
              const nx=-dz/len,nz=dx/len;
              const along=Math.max(0,Math.min(len,(-ax*dx-az*dz)/len)),lateral=Math.hypot(ax+dx/len*along,az+dz/len*along);
              if(lateral>cutoff+radius)continue;
              const lo=Math.max(0,along-cutoff-radius),hi=Math.min(len,along+cutoff+radius);
              bx=ax+dx/len*hi;bz=az+dz/len*hi;ax+=dx/len*lo;az+=dz/len*lo;
              const speed=radius<=5?.98:.58;
              current.strokeStyle='rgb('+Math.round(128+126*speed*dx/len)+','+Math.round(128+126*speed*dz/len)+',0)';
              current.lineWidth=radius*2;current.beginPath();current.moveTo(ax,az);current.lineTo(bx,bz);current.stroke();
              painter.beginPath();painter.moveTo(ax,az);painter.lineTo(bx,bz);painter.stroke();
            }
            painter.globalCompositeOperation='source-over';
          }
        }
        landscapes.paintWater(painter,cx,cz);
        wetMask=painter.getImageData(0,0,maskSize,maskSize).data;
        let waterPixel=3;
        while(waterPixel<wetMask.length&&!wetMask[waterPixel])waterPixel+=4;
        if(waterPixel>=wetMask.length)wetMask=null;
        if(wetMask){
          const field=yield* waterBankField(wetMask,current.getImageData(0,0,maskSize,maskSize).data,maskSize,1/maskScale);
          fieldPixels=field;yield;
          shorePatch=yield* buildMappedShoreSteps(T,{mask:wetMask,field,size:maskSize,scale:maskScale,maskX,maskZ,cx,cz,gx,gz,landWidth,land,landIndex,
            ground:localGround,pools,group:roadGroup,waterMaterial:waterSurface.material});
          landmarks?.addShoreCover(shorePatch);
        }
      }
      // Index occupied blocks once so narrow streams also enable local reflections.
      const wetBlocks=new Map(),blockSize=16,blocks=Math.ceil(maskSize/blockSize);
      if(wetMask)for(let row=0;row<maskSize;row++)for(let col=0;col<maskSize;col++){
        if(wetMask[(row*maskSize+col)*4+3]<=100)continue;
        const key=Math.floor(row/blockSize)*blocks+Math.floor(col/blockSize);
        const d=(col%blockSize+.5-blockSize/2)**2+(row%blockSize+.5-blockSize/2)**2;
        if(d<(wetBlocks.get(key)?.d??Infinity)){
          wetBlocks.set(key,{x:maskX+(col+.5)/maskScale,z:maskZ+(row+.5)/maskScale,d});
        }
      }
      const nearbyWaterLevel=(x,z)=>{
        const col=Math.floor((x-maskX)*maskScale/blockSize),row=Math.floor((z-maskZ)*maskScale/blockSize);
        let nearest=null,distance=Infinity;
        for(let j=Math.max(0,row-2);j<=Math.min(blocks-1,row+2);j++)for(let i=Math.max(0,col-2);i<=Math.min(blocks-1,col+2);i++){
          const p=wetBlocks.get(j*blocks+i);if(!p)continue;
          const d=(x-p.x)**2+(z-p.z)**2;
          if(d<distance){nearest=p;distance=d;}
        }
        return nearest?sampleShore(nearest.x,nearest.z)?.level??null:null;
      };
      function wet(x,z){
        const col=Math.floor((x-maskX)*maskScale),row=Math.floor((z-maskZ)*maskScale);
        return col>=0&&row>=0&&col<maskSize&&row<maskSize&&wetMask[(row*maskSize+col)*4+3]>100;
      }
      function openGround(x,z){
        return grounds.memorialAt(x,z)||grounds.mapped(x,z)||Boolean(wetMask&&wet(x-cx,z-cz));
      }
      yield* district.buildSteps(graph,cx,cz,landmarks,terrain.ground,edges,openGround,Math.min(620,cutoff),terrain.revision,grounds.memorialAt);
      const contact=(...args)=>regionContact(obstacleCells,cx,cz,graph,tunnels,landmarks,district,...args);
      function nearbyCell(x,z){return Math.floor(x/cellSize)+','+Math.floor(z/cellSize);}
      function bounds(seg,pad,fn){
        for(let ix=Math.floor((Math.min(seg.ax,seg.bx)-pad)/cellSize);ix<=Math.floor((Math.max(seg.ax,seg.bx)+pad)/cellSize);ix++)
          for(let iz=Math.floor((Math.min(seg.az,seg.bz)-pad)/cellSize);iz<=Math.floor((Math.max(seg.az,seg.bz)+pad)/cellSize);iz++)fn(ix+','+iz);
      }
      function obstruction(x,z,r,allowWater=false,mapped=false){
        const occupied=mapped?landmarks?.contact(x+cx,z+cz,r):landmarks?.reserved(x+cx,z+cz,r);
        if(occupied||district.contact(x+cx,z+cz,r))return true;
        if(!allowWater&&wetMask&&(wet(x,z)||wet(x+r,z)||wet(x-r,z)||wet(x,z+r)||wet(x,z-r)))return true;
        const list=cells.get(nearbyCell(x,z))||[];
        for(const s of list){
          const t=Math.max(0,Math.min(s.len,(x-s.ax)*s.fx+(z-s.az)*s.fz));
          const dx=x-s.ax-s.fx*t,dz=z-s.az-s.fz*t;
          if(dx*dx+dz*dz<(s.w+r)*(s.w+r))return true;
        }return false;
      }
      function blocked(x,z,r){
        return grounds.nearFixture(x,z,r)||grounds.mapped(x+cx,z+cz)||obstruction(x,z,r);
      }
      const waterAt=(x,z)=>sampleShore(x-cx,z-cz);
      const shoreBed=(x,z)=>shorePatch?.sample(x-cx,z-cz,true)?.bed;
      let buildingBase=null;
      function instance(mat,geo,x,y,z,sx,sy,sz,yaw=0,color=null,owner=null,cell=''){
        const key=mat+':'+geo.id+cell;
        if(!batches.has(key))batches.set(key,{mat,geo,poses:[],colors:[],moving:[]});
        const b=batches.get(key);temp.position.set(x,y+(buildingBase??localGround(x,z)),z);temp.rotation.set(0,yaw,0,'YXZ');
        if(sz>2&&sy<.16&&buildingBase===null){
          temp.rotation.x=-Math.atan(terrain.grade(cx+x,cz+z,Math.PI-yaw));
          temp.rotation.z=Math.atan(terrain.grade(cx+x,cz+z,Math.PI/2-yaw));
        }temp.scale.set(sx,sy,sz);temp.updateMatrix();
        if(owner)b.moving.push([b.poses.length,owner]);
        b.poses.push(temp.matrix.clone());b.colors.push(color);
        return b;
      }
      function plantTree(kind,x,z,h,w,angle,color,owner){
        const variant=kind==='tea'?0:treeModels.variantAt(cx+x,cz+z);
        const geo=treeModels.geometry(kind,true,variant);
        const cell=':'+Math.floor(x/80)+','+Math.floor(z/80);
        const batch=instance(kind==='tea'?'tree':kind,geo,x,0,z,w,h,w,angle,color,owner,cell);
        const tree=batch.tree??={kind,variant,bounds:new T.Box3(),radius:0};
        tree.bounds.expandByPoint(temp.position);
        tree.radius=Math.max(tree.radius,Math.hypot(w,h,w));
      }
      function quad(points,ax,az,bx,bz,cx,cz,dx,dz){points.push(ax,az,bx,bz,cx,cz,cx,cz,bx,bz,dx,dz);}
      const sectionsFor=new Map([roadData,roadSurfaces.roadSlabs,roadSurfaces.roadWood].map(data=>[data,[]]));
      function strip(target,s,start,end,l,r){
        const n=s.graded?Math.max(1,Math.ceil((end-start)/5)):1;
        for(let j=0;j<n;j++){
          const a=start+(end-start)*j/n,b=start+(end-start)*(j+1)/n;
          const ax=s.ax+s.fx*a,az=s.az+s.fz*a,bx=s.ax+s.fx*b,bz=s.az+s.fz*b;
          sectionsFor.get(target)?.push(s,s);
          quad(target,ax+s.nx*l,az+s.nz*l,ax+s.nx*r,az+s.nz*r,bx+s.nx*l,bz+s.nz*l,bx+s.nx*r,bz+s.nz*r);
        }
      }
      const groundEdges=graph?bridgeGroundEdges(graph,edges):edges;
      for(const e of groundEdges){
        if((++work & 15)===0)yield;
        const width=window.worldRoadHalfWidth(e);
        const finish=roadSurfaceClass(e),pavement=roadSurfaces[finish],source=e.sourceEdge||e;
        const cityStreet=e.kind==='residential'||e.kind==='living_street'||/^phố\s/i.test(e.name);
        let nextStation=e.sourceEdge?graph.nearest(e.points[0].x,e.points[0].z,[source]).s:0;
        for(let i=1;i<e.points.length;i++){
          const a=e.points[i-1],b=e.points[i];
          let ax=a.x-cx,az=a.z-cz,bx=b.x-cx,bz=b.z-cz;
          const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);if(length<.05)continue;
          const station=nextStation;nextStation+=length;
          if(Math.min(ax,bx)>cutoff||Math.max(ax,bx)<-cutoff||Math.min(az,bz)>cutoff||Math.max(az,bz)<-cutoff)continue;
          const fx=dx/length,fz=dz/length,nx=-fz,nz=fx;
          const near=Math.max(0,Math.min(length,-ax*fx-az*fz)),perp=Math.hypot(ax+near*fx,az+near*fz);
          if(perp>cutoff)continue;
          const seed=(Math.imul(e.id,2246822519)^Math.imul(i,3266489917))>>>0;
          const latitude=graph?graph.lat-a.z/graph.my:0;
          const mx=graph?111320*Math.cos(latitude*Math.PI/180)/graph.mx:1;
          const sourceLength=Math.hypot(dx*mx,dz);
          const s={ax,az,bx,bz,fx,fz,nx,nz,len:length,sourceLength,w:width,kind:e.kind,oneway:e.oneway,rank:perp,seed};
          s.traffic=e.traffic;s.station=station;s.source=source;s.roadMaterial=material[finish];
          s.graded=namedPass(e)||terrain.altitude((a.x+b.x)*.5,(a.z+b.z)*.5)>280&&(e.visitorRoad||!district.builtUp(cx+(ax+bx)*.5,cz+(az+bz)*.5)&&!['residential','service','living_street'].includes(e.kind));
          s.laneLayout=roadLaneLayout(s,width);
          if(s.graded){
            const n=Math.max(1,Math.ceil(length/12));s.interval=length/n;s.crown=[];
            for(let j=0;j<=n;j++){
              const x=ax+fx*s.interval*j,z=az+fz*s.interval*j;
              // Build a level cross-section above the uphill shoulder. The two
              // batters reconnect it to natural ground without canting the car.
              s.crown.push(Math.max(natural(x,z),natural(x+nx*width,z+nz*width),natural(x-nx*width,z-nz*width))+.10+width*.018);
            }
          }
          s.authoredPavement=Boolean(e.authoredHalfWidth);
          if(!s.authoredPavement&&perp<detailRadius+30&&!e.kind.startsWith('motorway')&&!e.kind.endsWith('_link')&&!e.traffic?.tunnel){
            const x=(a.x+b.x)/2,z=(a.z+b.z)/2;
            if(cityStreet||district.builtUp(x,z)||graph&&environment.sample(graph,x,z).cover===50)
              s.walkWidth=width<4?1.2:1.85;
          }
          segments.push(s);
          if(!s.authoredPavement)strip(landData,s,0,s.len,-width-.85,width+.85);
          if(s.graded){strip(pavement,s,0,s.len,-width,0);strip(pavement,s,0,s.len,0,width);}
          else strip(pavement,s,0,s.len,-width,width);
          if(source.controls?.length)roadPaint(source,s.laneLayout,width,station,nextStation,
            (lo,hi,l,r)=>strip(white,s,lo-station,hi-station,l,r),{lines:false});
          for(const [x,z] of [[ax,az],[bx,bz]]){
            const k=Math.round(x*10)+','+Math.round(z*10);
            const node=junctions.get(k);if(node){if(width>node.r){node.r=width;node.pavement=pavement;}node.n++;}else junctions.set(k,{x,z,r:width,n:1,pavement});
          }
          bounds(s,width+9,key=>{if(!cells.has(key))cells.set(key,[]);cells.get(key).push(s);});
        }
      }
      // Share the formation height at every OSM node to keep joined ribbons continuous.
      // Keep generated trees, shop plots and street furniture out of the bridge
      // footprint. Upper decks never enter the ground-level sidewalk contours.
      if(graph)for(const edge of [...bridges.edges,...tunnels.edges]){
        const w=worldRoadHalfWidth(edge);
        const profile=bridges.bridgeInfo(edge)||graph.tunnels.info(edge);
        for(const [start,end] of profile.ranges)for(let i=1;i<edge.dist.length;i++){
          const lo=Math.max(start,edge.dist[i-1]),hi=Math.min(end,edge.dist[i]);
          if(hi<=lo)continue;
          const a=graph.sample({edge,s:lo,dir:1}),b=graph.sample({edge,s:hi,dir:1});
          const ax=a.x-cx,az=a.z-cz,bx=b.x-cx,bz=b.z-cz,len=hi-lo;
          const seg={ax,az,bx,bz,len,w,fx:(bx-ax)/len,fz:(bz-az)/len,elevated:true,source:edge,station:lo};
          bounds(seg,w+9,key=>{if(!cells.has(key))cells.set(key,[]);cells.get(key).push(seg);});
        }
      }
      const crestNodes=new Map(),nodeKey=(x,z)=>Math.round((cx+x)*10)+','+Math.round((cz+z)*10);
      for(const s of segments)if(s.graded){
        for(const [x,z,h] of [[s.ax,s.az,s.crown[0]],[s.bx,s.bz,s.crown.at(-1)]]){
          const k=nodeKey(x,z);
          crestNodes.set(k,Math.max(crestNodes.get(k)??-Infinity,h));
        }
      }
      for(const s of segments)if(s.graded){
        s.crown[0]=crestNodes.get(nodeKey(s.ax,s.az));
        s.crown[s.crown.length-1]=crestNodes.get(nodeKey(s.bx,s.bz));
      }
      const wooded=segments.some(s=>s.graded);
      const roadway=!wooded?terrain.ground:(x,z)=>{
        const lx=x-cx,lz=z-cz,naturalY=natural(lx,lz);
        let weightSum=0,formationSum=0,influence=0;
        for(const s of cells.get(nearbyCell(lx,lz))||[]){
          if(!s.graded)continue;
          const d=Math.max(0,Math.min(s.len,(lx-s.ax)*s.fx+(lz-s.az)*s.fz));
          const cross=Math.hypot(lx-s.ax-s.fx*d,lz-s.az-s.fz*d);
          if(cross>=s.w+4)continue;
          const j=Math.min(s.crown.length-2,Math.floor(d/s.interval)),f=d/s.interval-j;
          const crown=s.crown[j]*(1-f)+s.crown[j+1]*f;
          const t=Math.max(0,Math.min(1,(s.w+4-cross)/3.35));
          // Intersecting formations meet continuously where their nearest edges switch.
          const blend=t*t*(3-2*t),weight=blend/(1+cross*cross);
          formationSum+=(crown-Math.min(s.w,cross)*.018)*weight;
          weightSum+=weight;influence=Math.max(influence,blend);
        }
        return weightSum?naturalY+(formationSum/weightSum-naturalY)*influence:naturalY;
      };
      function cutClearance(x,z,own){
        let gap=8;
        for(const other of cells.get(nearbyCell(x,z))||[]){
          if(other===own)continue;
          const t=Math.max(0,Math.min(other.len,(x-other.ax)*other.fx+(z-other.az)*other.fz));
          gap=Math.min(gap,Math.hypot(x-other.ax-t*other.fx,z-other.az-t*other.fz)-other.w);
        }return Math.max(0,Math.min(1,(gap-.6)/4));
      }
      // Taper the fill into the natural slope beneath road bends and at joints.
      function cap(points,x,z,r){
        let a=0;
        for(let i=1;i<=12;i++){const b=i*Math.PI/6;points.push(x,z,x+Math.sin(a)*r,z+Math.cos(a)*r,x+Math.sin(b)*r,z+Math.cos(b)*r);a=b;}
      }
      for(const s of segments)if(s.graded)for(const sign of [-1,1]){
        const mid=s.len*.5,x=s.ax+s.fx*mid,z=s.az+s.fz*mid;
        const uphill=natural(x+s.nx*sign*8,z+s.nz*sign*8)-natural(x,z)>.35;
        strip(bankData,s,0,s.len,sign*(s.w+.68),sign*(s.w+(uphill?2.15:4.25)));
        if(!uphill||s.len<7||wetMask&&wet(x,z)||district.builtUp(cx+x,cz+z))continue;
        const count=Math.max(2,Math.ceil(s.len/2.4));
        let prev=-1;
        for(let j=0;j<=count;j++){
          const u=s.len*j/count,px=s.ax+s.fx*u,pz=s.az+s.fz*u;
          const wx=px+cx,wz=pz+cz,coarse=.5+.5*Math.sin(wx*.03+wz*.016+.8*Math.sin(wz*.047));
          const fracture=Math.sin(wx*.88+wz*.42)*.19+Math.cos(wz*1.14-wx*.29)*.13;
          const toe=1.45+.44*coarse+fracture;
          const footX=px+sign*s.nx*(s.w+toe),footZ=pz+sign*s.nz*(s.w+toe);
          const backX=footX+sign*s.nx*5.5,backZ=footZ+sign*s.nz*5.5;
          const cutRoads=cells.get(nearbyCell((footX+backX)*.5,(footZ+backZ)*.5))||[];
          if(!guardrailFits(footX,footZ,backX,backZ,cutRoads,s.len/count*.5+.45,s)){
            prev=-1;continue;
          }
          const rise=Math.max(0,natural(backX,backZ)-natural(footX,footZ));
          const ends=Math.min(1,u/4,(s.len-u)/4),gap=Math.min(cutClearance(footX,footZ,s),cutClearance(backX,backZ,s));
          const height=Math.min(3.9,.15+rise*(1.15+coarse)+coarse*coarse*1.65)*gap*ends;
          if(height<.08){prev=-1;continue;}
          const row=cutVerts.length/3,bankBase=roadway(wx+(footX-px),wz+(footZ-pz));
          for(const [lateral,y] of [[0,bankBase-.28],[.30+fracture,bankBase+height*.35],[.63-fracture,bankBase+height*.77],
            [1.28+coarse,bankBase+height],[3.1,natural(footX+sign*s.nx*3.1,footZ+sign*s.nz*3.1)+height*.32],[5.5,natural(backX,backZ)-.22]]){
            const xx=footX+sign*s.nx*lateral,zz=footZ+sign*s.nz*lateral;
            cutVerts.push(xx,y,zz);cutUv.push(((xx+cx)*s.fx+(zz+cz)*s.fz)*.33,(y+lateral*.67)*.33);
          }
          if(prev>=0){
            for(let k=0;k<5;k++)cutIndices.push(prev+k,row+k,prev+k+1,prev+k+1,row+k,row+k+1);
            if(height>.48){
              const lastX=cutVerts[prev*3],lastZ=cutVerts[prev*3+2];
              const dx=footX-lastX,dz=footZ-lastZ,length=Math.hypot(dx,dz);
              registerObstacle({id:s.seed+':cut:'+j,kind:'barrier',x:(footX+lastX)*.5,z:(footZ+lastZ)*.5,
                fx:dx/length,fz:dz/length,w:length*.5,d:.13,height,parts:[]});
            }
          }
          prev=row;
          if(j%3===1&&s.rank<260&&height>.8){
            const fh=.6+coarse*.65;
            instance('fern',unitPlane,footX+sign*s.nx*1.6,bankBase+height-natural(footX,footZ)+fh*.37,footZ+sign*s.nz*1.6,fh*2.24,fh,1,wx*.43+wz*.21);
          }
        }

      }
      for(const node of junctions.values()){cap(node.pavement,node.x,node.z,node.r);cap(landData,node.x,node.z,node.r+.85);}
      function openNearEnd(s,x,z){
        const node=junctions.get(Math.round(x*10)+','+Math.round(z*10));return node&&node.n>2?node.r+1:.0;
      }
      // Placements compete only with immediate neighbours by fixed OSM-derived priority.
      // Reordering visible roads or clipping a distant street cannot cascade into a new layout.
      function compareCandidate(a,b){return a.priority-b.priority||a.key.localeCompare(b.key);}
      const plotSize=12;
      function visitPlots(c,cb){
        for(let i=Math.floor((c.hx-c.footprint)/plotSize);i<=Math.floor((c.hx+c.footprint)/plotSize);i++)
          for(let j=Math.floor((c.hz-c.footprint)/plotSize);j<=Math.floor((c.hz+c.footprint)/plotSize);j++)cb(i+','+j);
      }
      const walks=createGroundedWalkways(T,{cx,cz,step:terrain.step,
        height:(x,z)=>roadway(cx+x,cz+z),ground:(x,z)=>Math.min(localGround(x,z),shoreBed(cx+x,cz+z)??Infinity),
        needsDetail:(x0,z0,x1,z1)=>wooded||shorePatch?.intersects(x0,z0,x1,z1),
        wet:(x,z)=>{
          if(!wetMask||!wet(x,z))return false;
          // The four-metre water mask can straddle a waterfront street. Carry
          // the grounded kerb over its shallow bank up to the mapped bed.
          const shore=sampleShore(x,z);
          return shore&&shore.level-shore.bed>.65;
        }});
      const aprons=new Map(),walkRoads=new Set();
      for(const s of segments){
        if((++work & 15)===0)yield;
        const start=openNearEnd(s,s.ax,s.az),end=s.len-openNearEnd(s,s.bx,s.bz);
        if(s.authoredPavement)continue;
        if(s.walkWidth)bounds(s,s.w+5,key=>{
          for(const neighbour of cells.get(key)||[])if(!neighbour.elevated)walkRoads.add(neighbour);
        });
        if(end<=start)continue;
        const mid=(start+end)/2,mx=s.ax+s.fx*mid,mz=s.az+s.fz*mid;
        const street=s.kind==='residential'||s.kind==='living_street'||district.builtUp(mx+cx,mz+cz);
        if(!street && !s.kind.startsWith('motorway') && s.rank<420 && s.len>12){
          // Red-topped marker posts follow exposed verges, including the outside of bends.
          for(let d=8+s.seed%17;d<end-5;d+=48)for(const side of [-1,1]){
            if(d<start+4)continue;
            const x=s.ax+s.fx*d+side*s.nx*(s.w+1.05),z=s.az+s.fz*d+side*s.nz*(s.w+1.05);
            if(blocked(x,z,.24)||contact(cx+x,cz+z,.28))continue;
            const y=roadway(cx+x,cz+z)-localGround(x,z);
            instance('white',unitBox,x,y+.32,z,.17,.64,.17);
            instance('white',unitBox,x,y+.72,z,.18,.16,.18,0,0xc13f31);
          }
        }
        roadPaint(s.source,s.laneLayout,s.w,s.station+start,s.station+end,(lo,hi,l,r,color)=>
          strip(color==='yellow'?yellow:white,s,lo-s.station,hi-s.station,l,r),{controls:false});
        if(s.rank>detailRadius||s.len<3)continue;
        if(!s.graded&&s.w>=4.2&&s.len>=24){
          const spacing=s.w>6?31:38;
          let last=null;
          for(let station=9;station<end-4;station+=spacing){
            const px=s.ax+s.fx*station+s.nx*(s.w+1.7),pz=s.az+s.fz*station+s.nz*(s.w+1.7);
            if(grounds.memorialAt(px+cx,pz+cz)||blocked(px,pz,.45)||(s.w>6&&grounds.nearFixture(px,pz,spacing*.8,'lamp'))){last=null;continue;}
            const pole=registerObstacle({id:s.seed+':pole:'+station,kind:'pole',x:px,z:pz,radius:.12,parts:[]});
            instance('concrete',unitPole,px,3.65,pz,.17,7.3,.17,0,null,pole);
            const rot=Math.atan2(s.nx,s.nz);
            if(s.w>6){
              instance('steel',unitBox,px-s.nx*.9,7.18,pz-s.nz*.9,.095,.09,1.98,rot,null,pole);
              instance('lantern',unitBox,px-s.nx*1.91,7.13,pz-s.nz*1.91,.34,.14,.68,rot,null,pole);
              const lx=px-s.nx*1.91,lz=pz-s.nz*1.91;
              streetBulbs.push(new T.Vector3(lx,localGround(lx,lz)+6.99,lz));
            }else{
              instance('steel',unitBox,px,6.89,pz,.085,.095,1.66,rot,null,pole);
              for(const side of [-1,1]){
                instance('roof',unitPole,px+s.nx*side*.67,7.04,pz+s.nz*side*.67,.1,.23,.1,0,null,pole);
                if(last)for(let j=0;j<6;j++){
                  const f=j/6,t=(j+1)/6;
                  for(const u of [f,t])wires.push(last.x+(px-last.x)*u+s.nx*side*.67,7.13-2.8*u*(1-u),last.z+(pz-last.z)*u+s.nz*side*.67);
                }
              }
            }last={x:px,z:pz};
          }
        }
        const dense=['residential','living_street','secondary','tertiary'].includes(s.kind);
        const step=dense?14:23;
        let first=(s.seed%step)+2;
        if(first>s.sourceLength&&s.sourceLength>5)first=s.sourceLength*.52;
        for(let station=first,index=0;station<s.sourceLength;station+=step,index++){
          const d=station*s.len/s.sourceLength,x=s.ax+s.fx*d,z=s.az+s.fz*d;
          if(Math.hypot(x,z)>detailRadius)continue;
          for(const sign of [-1,1]){
            let seed=(s.seed^Math.imul(1+2*index+(sign>0?1:0),1597334677))>>>0;
            const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            const priority=random(),house=random()<(s.graded?.035:dense?.73:.34),type=Math.floor(random()*shopTypes.length);
            const width=4.5+random()*2.9,depth=5+random()*3.9;
            const dist=s.w+(house?3.5+depth/2:3)+random()*(house?3:5);
            const hx=x+sign*s.nx*dist,hz=z+sign*s.nz*dist,footprint=house?Math.hypot(width,depth)/2+.8:1.7;
            const cover=landscapes.cover(hx+cx,hz+cz);
            const landClass=environment.sample(graph,hx+cx,hz+cz).cover;
            if(cover===1||house&&cover>178||landClass===80||landClass===95)continue;
            if(house&&(structures.covered(graph,hx+cx,hz+cz)||(landClass!=null&&landClass!==50)))continue;
            if(!house&&[40,60,70,90].includes(landClass)&&random()>.09)continue;
            if(blocked(hx,hz,footprint)||onApproach(hx+cx,hz+cz)||house&&(grounds.memorialAt(hx+cx,hz+cz)||district.mappedBlock(hx+cx,hz+cz)))continue;
            if(house){
              const x=hx+cx,z=hz+cz,w=width/2+.25,d=depth/2+.30,front=-sign*(depth/2+2);
              const ring=[[-w,front],[w,front],[w,sign*d],[-w,sign*d]].map(([u,v])=>new T.Vector2(x+s.fx*u+s.nx*v,z+s.fz*u+s.nz*v));
              const bounds=new T.Box2().setFromPoints(ring);
              if(ring.some(p=>openGround(p.x,p.y))||
                district.overlapsSight(landmarks,[ring],{minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.y,maxZ:bounds.max.y}))continue;
            }
            const c={key:s.seed+':'+index+':'+sign,priority,s,sign,hx,hz,footprint,house,width,depth,type,random};
            candidates.push(c);
            visitPlots(c,k=>{if(!rivals.has(k))rivals.set(k,[]);rivals.get(k).push(c);});
          }
        }
      }
      yield* traceSidewalkSteps(walkRoads,(x,z)=>(cells.get(nearbyCell(x,z))||[]).filter(s=>!s.elevated),walks.sidewalk,(s,a,b,c)=>{
        if(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<.00001)return;
        const mat=s.roadMaterial;
        if(!aprons.has(mat))aprons.set(mat,[]);
        aprons.get(mat).push(...a,...b,...c);
      },streamed&&requestSidewalkRings);
      for(const c of candidates){
        if((++work & 15)===0)yield;
        let obscured=false;
        visitPlots(c,k=>{
          if(obscured)return;
          obscured=rivals.get(k).some(o=>o!==c&&compareCandidate(o,c)<0&&Math.hypot(c.hx-o.hx,c.hz-o.hz)<c.footprint+o.footprint);
        });
        if(obscured)continue;
        const {house,s,sign,hx,hz,width,depth,type,random}=c;
            if(house){
              const regional=centralStreetscapes?.themeAt(graph,hx+cx,hz+cz);
              const rZone=regional?.zone,rShop=rZone?.shops[type%rZone.shops.length];
              const twoStory=rShop?rShop.upstairs:upstairs.has(shopTypes[type]);
              const h=(twoStory?6.7:3.65)+random()*.62;
              registerObstacle({id:c.key,kind:'building',x:hx,z:hz,fx:s.fx,fz:s.fz,w:width/2,d:depth/2,height:h});
              // Local +Z faces the road, with the façade just outside the wall.
              const sx=-s.nx*sign,sz=-s.nz*sign,rot=Math.atan2(sx,sz);
              buildingBase=localGround(hx,hz);
              const foot=Math.abs(localGround(hx+width*.5,hz)-localGround(hx-width*.5,hz))+
                Math.abs(localGround(hx,hz+depth*.5)-localGround(hx,hz-depth*.5));
              if(foot>.14)instance('concrete',unitBox,hx,-foot*.43,hz,width+.06,foot*.9+.10,depth+.06,rot);
              const wallPal=rZone?rZone.walls:[0xe9d4b5,0xc7d6bb,0xf3dfb0];
              const roofPal=rZone?rZone.roofs:[0x989d98,0xaf846d,0x99aeb0];
              const gablePal=rZone?rZone.gables:[0xa26148,0x825947,0x7b8688];
              const awningPal=rZone?rZone.awnings:[0xa2a692,0xbc8062,0x809b93];
              const frontKey=regional?regional.frontKeys[type%regional.frontKeys.length]:'front'+type;
              instance('wall',unitBox,hx,h*.5,hz,width,h,depth,rot,wallPal[type%wallPal.length]);
              instance(frontKey,unitPlane,hx+sx*(depth/2+.025),h/2,hz+sz*(depth/2+.025),width,h,1,rot);
              for(const side of [-1,1]){
                const wx=hx+s.fx*side*(width/2+.035),wz=hz+s.fz*side*(width/2+.035);
                for(const floor of h>5?[1.7,4.5]:[1.7]){
                  instance('glass',unitBox,wx,floor,wz,.075,1.05,1.56,rot);
                  instance('concrete',unitBox,wx+s.fx*side*.10,floor-.57,wz+s.fz*side*.10,.28,.09,1.75,rot);
                }
              }
              instance('roof',unitBox,hx,h+.07,hz,width+.46,.19,depth+.52,rot,roofPal[type%roofPal.length]);
              const pitched=(rZone?.forcePitched?h<8:h<5)&&c.priority<(rZone?.forcePitched?.95:.7);
              if(pitched)instance('gable',gable,hx,h+.14,hz,width+.5,width*(rZone?.forcePitched?.29:.24),depth+.59,rot,gablePal[type%gablePal.length]);
              walks.porch(s,hx+sx*depth/2,hz+sz*depth/2,width+.35);
              const porch=depth/2+.72;
              instance('awning',unitBox,hx+sx*porch,2.65,hz+sz*porch,width+.4,.13,1.8,rot,awningPal[type%awningPal.length]);
              instance('concrete',unitPole,hx+sx*porch+s.fx*width*.45,1.32,hz+sz*porch+s.fz*width*.45,.09,2.62,.09);
              if(type%3===0&&!pitched)instance('steel',unitPole,hx,h+.65,hz,1.2,1.0,1.2);
              buildingBase=null;
            }else{
              const [lon,lat]=graph?graph.geo(hx+cx,hz+cz):[105,21];
              const uplands=lat>21.3&&lon<106.4||lat>11.6&&lat<15&&lon>107&&lon<108.6;
              const palm=random()<(uplands?.015:lat<11?.48:lat<18?.32:.11),height=(palm?7.5:5)+random()*5,w=height*(palm?.59:.92),r=random()*Math.PI;
              const tree=registerObstacle({id:c.key,kind:'tree',x:hx,z:hz,radius:.27,height,parts:[]});
              plantTree(palm?'palm':'tree',hx,hz,height,w,r,null,tree);
            }
      }
      if(innerPrecinct){
        // Three shade trees on the inside verge frame the gate as the road turns.
        const verge=[[105.79649,20.55585,7.6],[105.79665,20.55580,9.2],[105.79682,20.55578,7.9]];
        for(const [lon,lat,h] of verge){
          const p=graph.point(lon,lat),x=p.x-cx,z=p.z-cz;
          if(Math.hypot(x,z)>540||blocked(x,z,1.5))continue;
          const tree=registerObstacle({id:'tam-chuc-verge:'+lon,kind:'tree',x,z,radius:.25,height:h,parts:[]});
          plantTree('tree',x,z,h,h*.94,.35,0xfff4d8,tree);
        }
      }
      if(graph){
        yield* forestPlots(graph,cx,cz,Math.min(600,detailRadius),(ix,iz,wx,wz,gx,gz,rand)=>{
            const precinct=Math.hypot(wx-complexCenter.x,wz-complexCenter.z)<1500;
            const observed=landscapes.cover(wx,wz),grove=precinct&&inGrove(wx-cx,wz-cz);
            const landClass=environment.sample(graph,wx,wz).cover;
            const woodland=landClass===10||landClass===95;
            if(!grove){
              if(landClass!=null&&!woodland)return;
              if(observed!==null?observed<(woodland?158:204):!woodland&&terrain.altitude(wx,wz)<(precinct?63:280))return;
            }
            // A high vegetation index also occurs in rice fields. Use the mapped
            // tree and mangrove classes to fill a canopy without planting the fields.
            if(!precinct&&rand()>(woodland?(small?.56:.76):.36))return;
            const openness=.46+.19*Math.sin(gx*.013+gz*.004)+.18*Math.sin(gz*.019-gx*.005);
            if(rand()>openness+.24||district.builtUp(wx,wz)||onApproach(wx,wz))return;
            const lx=wx-cx,lz=wz-cz,dist=Math.hypot(lx,lz);
            if(blocked(lx,lz,5.5))return;
            const occupants=obstacleCells.get(obstacleKey(lx,lz))||[];
            if(occupants.some(o=>!String(o.id).startsWith('stand:')&&
              Math.hypot(lx-o.x,lz-o.z)<(o.radius||Math.hypot(o.w,o.d))+2))return;
            const altitude=terrain.altitude(wx,wz),cool=altitude>650;
            const pine=cool&&rand()<.4;
            const h=landClass===95?4.7+rand()*5.5:(pine?10:6.7)+rand()*(pine?10:7.1);
            const w=h*(pine?.5:landClass===95?1.12:.82)*(.82+rand()*.32);
            const angle=rand()*Math.PI,tint=tone.setHSL(.24+rand()*.10,.08+rand()*.14,.66+rand()*.18).getHex();
            const id='stand:'+ix+':'+iz;
            const tree=registerObstacle({id,kind:'tree',x:lx,z:lz,radius:Math.max(.16,h*.02),height:h,parts:[]});
            plantTree(pine?'pine':'tree',lx,lz,h,w,angle,tint,tree);
            if(dist>365||rand()>.76)return;
            for(let k=0;k<3;k++){
              const fx=lx+(rand()-.5)*12,fz=lz+(rand()-.5)*12,fh=.6+rand()*1.0;
              if(!blocked(fx,fz,1.5))instance('fern',unitPlane,fx,fh*.47,fz,fh*2.24,fh,1,rand()*Math.PI,tint);
            }
        });
      }
      if(cutVerts.length){
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(cutVerts,3));
        g.setAttribute('uv',new T.Float32BufferAttribute(cutUv,2));g.setIndex(cutIndices);g.computeVertexNormals();
        if(!material.cut.map){
          material.cut.map=texture('surfaces/cut-rock-color.webp',true);
          material.cut.normalMap=skyLoader.load('streetscape/surfaces/cut-rock-normal.webp');
          material.cut.normalMap.wrapS=material.cut.normalMap.wrapT=T.RepeatWrapping;
        }
        const bank=new T.Mesh(g,material.cut);bank.name='Exposed rock cuttings';bank.castShadow=true;bank.receiveShadow=true;roadGroup.add(bank);
      }
      // A continuous folded W-beam follows the low shoulder above a drop.
      for(const s of segments){
        if((++work & 15)===0)yield;
        if(!s.graded||s.len<3||s.rank>530)continue;
        const mid=s.len/2,x=s.ax+s.fx*mid,z=s.az+s.fz*mid;
        const side=natural(x+s.nx*7,z+s.nz*7)<natural(x-s.nx*7,z-s.nz*7)?1:-1;
        const off=side*(s.w+.47);
        if(natural(x,z)-natural(x+side*s.nx*9,z+side*s.nz*9)<.45||
          wetMask&&wet(x,z)||district.builtUp(cx+x,cz+z))continue;
        const start=openNearEnd(s,s.ax,s.az),end=s.len-openNearEnd(s,s.bx,s.bz),length=end-start;
        if(length<2)continue;
        const count=Math.ceil(length/4),angle=Math.atan2(s.fx,s.fz);
        const span=length/count;
        function row(x,z){
          const first=railVerts.length/3,y=roadway(cx+x,cz+z);
          for(const [push,up] of [[0,.51],[.064,.55],[.012,.605],[.067,.66],[0,.70]])
            railVerts.push(x-side*push*s.nx,y+up,z-side*push*s.nz);
          return first;
        }
        let previousRow=-1;
        for(let j=0;j<count;j++){
          const d=start+span*j,px=s.ax+s.fx*d+s.nx*off,pz=s.az+s.fz*d+s.nz*off;
          const ex=px+s.fx*span,ez=pz+s.fz*span,mx=(px+ex)*.5,mz=(pz+ez)*.5;
          // A side road or the return leg of a hairpin can overlap a shoulder
          // well beyond the node itself. Open the rail and its collider together.
          if(!guardrailFits(px,pz,ex,ez,cells.get(nearbyCell(mx,mz))||[],.32,s)){
            previousRow=-1;continue;
          }
          const a=previousRow>=0?previousRow:row(px,pz),b=row(ex,ez);
          for(let k=0;k<4;k++)railIndices.push(a+k,b+k,a+k+1,a+k+1,b+k,b+k+1);
          previousRow=b;
          const adjust=roadway(cx+px,cz+pz)-natural(px,pz);
          instance('steel',unitBox,px+side*.08*s.nx,adjust+.27,pz+side*.08*s.nz,.10,.88,.12,angle);
          if(j%4===0)instance('white',unitBox,px,adjust+.697,pz,.12,.054,.06,angle);
          registerObstacle({id:s.seed+':rail:'+j,kind:'barrier',x:mx,z:mz,fx:s.fx,fz:s.fz,w:span*.5,d:.10,height:.70,parts:[]});
        }
      }
      if(railVerts.length){
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(railVerts,3));
        g.setIndex(railIndices);g.computeVertexNormals();const rails=new T.Mesh(g,material.rail);
        rails.name='Mountain safety rails';rails.castShadow=true;rails.receiveShadow=true;roadGroup.add(rails);
      }
      function* surface(data,mat,y,freq,groundHeight=null){
        if(!data.length)return;
        const verts=[],uv=[],crossSection=[],step=terrain.step;
        const asphalt=mat===material.asphalt;
        let section;

        function vertex(x,z){
          const h=groundHeight?groundHeight(x,z):roadway(cx+x,cz+z);
          verts.push(x,h+y,z);
          if(asphalt)crossSection.push(section?(x-section.ax)*section.nx+(z-section.az)*section.nz:0,section?.w||0);
          if(mat.userData.roadPanels&&section){
            const dx=x-section.ax,dz=z-section.az;
            uv.push(section.station+dx*section.fx+dz*section.fz,dx*section.nx+dz*section.nz);
          }else if(mat.userData.templeSurface||mat===material.pavers)uv.push(cx+x,cz+z);
          else uv.push(x*freq+(cx*freq)%1,z*freq+(cz*freq)%1);
        }
        const fitRoad=wooded&&(mat===material.pavers||mat===curbStone);
        function triangle(a,b,c,depth=0){
          if(fitRoad&&depth<5){
            const sample=p=>roadway(cx+p[0],cz+p[1]);
            const mid=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2];
            const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a),ha=sample(a),hb=sample(b),hc=sample(c);
            const middle=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];
            const error=Math.max(Math.abs(sample(ab)-(ha+hb)/2),Math.abs(sample(bc)-(hb+hc)/2),
              Math.abs(sample(ca)-(hc+ha)/2),Math.abs(sample(middle)-(ha+hb+hc)/3));
            if(error>.014){
              triangle(a,ab,ca,depth+1);triangle(ab,b,bc,depth+1);
              triangle(ca,bc,c,depth+1);triangle(ab,bc,ca,depth+1);return;
            }
          }
          vertex(...a);vertex(...b);vertex(...c);
        }
        // Split at terrain edges so a long road, its paint and the ground coincide
        // even when all three meshes have different source triangulations.
        const offset=[cx,cz,cx+cz];
        function split(poly,axis){
          if(axis===3){
            for(let j=1;j<poly.length-1;j++)triangle(poly[0],poly[j],poly[j+1]);
            return;
          }
          const coord=p=>axis===2?p[0]+p[1]:p[axis];
          let low=Infinity,high=-Infinity;
          for(const p of poly){const v=coord(p);low=Math.min(low,v);high=Math.max(high,v);}
          const cut=(Math.floor((low+offset[axis]+.00001)/step)+1)*step-offset[axis];
          if(cut>=high-.00001){split(poly,axis+1);return;}
          const left=[],right=[];let prev=poly.at(-1),a=coord(prev)-cut;
          for(const p of poly){
            const b=coord(p)-cut;
            if(a*b<0){
              const f=a/(a-b),mid=[prev[0]+(p[0]-prev[0])*f,prev[1]+(p[1]-prev[1])*f];
              left.push(mid);right.push(mid);
            }
            if(b<=0)left.push(p);if(b>=0)right.push(p);prev=p;a=b;
          }
          split(left,axis+1);split(right,axis);
        }
        const same=(a,b,c,o)=>Math.floor((Math.min(a,b,c)+o)/step)===Math.floor((Math.max(a,b,c)+o)/step);
        const sections=sectionsFor.get(data);
        for(let i=0;i<data.length;i+=6){
          if(i%768===0)yield;
          if(sections)section=sections[i/6];
          const ax=data[i],az=data[i+1],bx=data[i+2],bz=data[i+3],dx=data[i+4],dz=data[i+5];
          if(same(ax,bx,dx,cx)&&same(az,bz,dz,cz)&&same(ax+az,bx+bz,dx+dz,cx+cz)){
            if(fitRoad)triangle([ax,az],[bx,bz],[dx,dz]);else{vertex(ax,az);vertex(bx,bz);vertex(dx,dz);}
          }else split([[ax,az],[bx,bz],[dx,dz]],0);
        }
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));setFlatNormals(T,g);
        if(asphalt)g.setAttribute('carriageway',new T.Float32BufferAttribute(crossSection,2));
        const mesh=new T.Mesh(g,mat);mesh.receiveShadow=true;
        if(mat!==material.white&&mat!==material.yellow)shorePatch?.addCover(g);
        if(mat.transparent&&mat.userData.templeSurface)mesh.renderOrder=1;
        roadGroup.add(mesh);
      }
      material.white.side=material.yellow.side=T.DoubleSide;
      // Full-scale lights require a recorded height. Locations without a
      // physical measurement remain on the close-range driving map.
      for(const f of grounds.streetFurniture){
        if(!f.height||Math.hypot(f.x,f.z)>detailRadius)continue;
        const {x,z,height:h}=f;
        if(district.contact(cx+x,cz+z,.08))continue;
        const width=f.diameter||(f.kind==='lamp'?.14:.12);
        const owner=registerObstacle({id:'osm-node-'+f.id,kind:'pole',x,z,radius:width/2,height:h,parts:[]});
        instance('steel',unitPole,x,h/2,z,width,h,width,0,null,owner);
        if(f.kind==='lamp'){
          instance('lantern',unitPole,x,h-.07,z,width*1.7,.14,width*1.7,0,null,owner);
          streetBulbs.push(new T.Vector3(x,localGround(x,z)+h-.15,z));
        }
      }
      yield* grounds.build(roadGroup,localGround,obstruction,registerObstacle,sampleShore,(kind,x,z,h,w,angle)=>{
        if(kind==='tea'){
          plantTree('tea',x,z,h,w,angle,0xebf2cd,null);return;
        }
        const tree=registerObstacle({id:'mapped-tree:'+Math.round(cx+x)+':'+Math.round(cz+z),
          kind:'tree',x,z,radius:Math.max(.12,h*.022),height:h,parts:[]});
        plantTree(kind,x,z,h,w,angle,null,tree);
      },(x,z,r,allowWater=false)=>obstruction(x,z,r,allowWater,true));
      yield* surface(bankData,material.earth,-.065,.60);
      if(cover.length){
        temple??=createTempleSurfaces(T);temple.setOrigin(graph);
        const layer={stone:[],lawn:[],wood:[]};
        for(const {kind,points} of cover){
          for(const face of T.ShapeUtils.triangulateShape(points,[])){
            for(const i of face)layer[kind].push(points[i].x,points[i].y);
          }
        }
        // Ground cover extends beneath the mapped carriageway at the lakeside gate.
        yield* surface(layer.stone,temple.paving,-.158,1,localGround);
        yield* surface(layer.lawn,temple.lawn,-.153,1,localGround);
        yield* surface(layer.wood,temple.wood,-.148,1,localGround);
      }
      if(graph&&window.tamChucPaths){
        const center=graph.point(105.7956,20.5528);
        if(Math.hypot(center.x-cx,center.z-cz)<1500){
          const paving=[];
          for(const [steps,coords] of tamChucPaths){
            let a=graph.point(105.79+coords[0]/1e6,20.54+coords[1]/1e6);
            for(let i=2;i<coords.length;i+=2){
              const b=graph.point(105.79+coords[i]/1e6,20.54+coords[i+1]/1e6);
              const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
              if(len>.1){
                const half=steps?2.5:1.65,ox=-dz/len*half,oz=dx/len*half;
                const ax=a.x-cx,az=a.z-cz,bx=b.x-cx,bz=b.z-cz;
                paving.push(ax+ox,az+oz,bx+ox,bz+oz,bx-ox,bz-oz,ax+ox,az+oz,bx-ox,bz-oz,ax-ox,az-oz);
              }
              a=b;
            }
          }
          if(paving.length){temple??=createTempleSurfaces(T);yield* surface(paving,temple.paving,-.14,1,localGround);}
        }
      }
      yield* surface(landData,material.earth,-.032,.77);
      for(const [finish,data] of Object.entries(roadSurfaces))
        yield* surface(data,material[finish],.002,finish==='earth' ? .48 : finish==='pavers' ? 1 : .25);
      for(const [mat,data] of aprons)yield* surface(data,mat,.001,mat===material.earth ? .48 : mat===material.pavers ? 1 : .25);
      yield* surface(yellow,material.yellow,.026,1);yield* surface(white,material.white,.026,1);
      yield* walks.buildSteps(roadGroup,surface,material.pavers,curbStone);const pavementLift=walks.liftAt;
      const lightScenery=small&&graphics.profile.id==='low';
      const grass=lightScenery?sparseGrass:grassClump;
      scatterVergeGrass(segments,Math.min(lightScenery?155:320,detailRadius),
        (x,z)=>!walks.liftAt(x,z)&&!blocked(x,z,.8),
        (x,z,size,angle)=>instance('vergeGrass',grass,x,-.18,z,size,size,size,angle));
      if(wires.length){
        for(let i=0;i<wires.length;i+=3)wires[i+1]+=localGround(wires[i],wires[i+2]);
        const lines=new T.BufferGeometry();lines.setAttribute('position',new T.Float32BufferAttribute(wires,3));
        roadGroup.add(new T.LineSegments(lines,wireMaterial));
      }
      for(const b of batches.values()){
        if((++work & 15)===0)yield;
        const m=new T.InstancedMesh(b.geo,material[b.mat],b.poses.length);
        for(const [index,o] of b.moving)o.parts.push({index,mesh:m,rest:b.poses[index]});
        const tinted=b.colors.some(c=>c!==null);
        b.poses.forEach((pose,i)=>{m.setMatrixAt(i,pose);if(tinted)m.setColorAt(i,tone.set(b.colors[i]??0xffffff));});
        if(b.tree){
          // All levels share instance slots (including collision animation) and culling bounds.
          m.boundingSphere=b.tree.bounds.getBoundingSphere(new T.Sphere());
          m.boundingSphere.radius+=b.tree.radius;
          treeBatches.push({...b.tree,mesh:m,level:1});
        }
        m.castShadow=b.mat!=='vergeGrass';m.receiveShadow=true;roadGroup.add(m);
      }
      function railRoads(ax,az,bx,bz){
        // Roads are indexed with nine metres of padding beyond the pavement.
        if(Math.hypot(bx-ax,bz-az)<=16)return cells.get(nearbyCell((ax+bx)/2,(az+bz)/2))||[];
        const roads=new Set();
        bounds({ax,az,bx,bz},0,key=>{for(const s of cells.get(key)||[])roads.add(s);});
        return roads;
      }
      function roadHeight(s,u){
        if(!s.elevated)return roadway(cx+s.ax+s.fx*u,cz+s.az+s.fz*u);
        const structure=bridges.bridgeInfo(s.source)?bridges:tunnels;
        return structure.height(s.source,s.station+u);
      }
      if(bridges)yield* buildBridgeMeshSteps(T,{...bridges,graph,cx,cz,radius:cutoff,group:roadGroup,material,ground:terrain.ground,registerObstacle,railRoads,roadHeight});
      if(tunnels?.edges.length)buildTunnelMeshes(T,{...tunnels,graph,cx,cz,radius:cutoff,group:roadGroup,material,ground:terrain.ground,registerObstacle});
      const groundAt=drivingSurface(bridges,tunnels,pavementLift,roadway,shoreBed,cx,cz);
      const showPeople=yield* streetLife.prepare(graph,cx,cz,segments,(x,z,r)=>!blocked(x-cx,z-cz,r)&&!contact(x,z,r));
      const signGround=(x,z,e,s)=>graph?.tunnels.info(e)?tunnels.height(e,s):bridges?.bridgeInfo(e)?bridges.height(e,s):groundAt(x,z);
      const showSigns=yield* signs.prepare(graph,edges,cx,cz,(x,z,r)=>!blocked(x-cx,z-cz,r)&&!contact(x,z,r),signGround,registerObstacle);
      // Three otherwise computes these bounds during the first draw of the
      // new district. Warm them while the previous scene is still visible.
      const meshes=[...roadGroup.children,...district.group.children,land],boundPoint=new T.Vector3();
      for(let i=0;i<meshes.length;i++){
        const mesh=meshes[i];
        if(mesh.isInstancedMesh){if(!mesh.boundingSphere)mesh.computeBoundingSphere();}
        else if(mesh.geometry&&!mesh.geometry.boundingSphere){
          const geometry=mesh.geometry,positions=geometry.attributes.position;
          if(positions?.count>4096&&!geometry.morphAttributes.position){
            // A box encloses the same vertices and takes only one interruptible pass.
            const box=new T.Box3();
            for(let j=0;j<positions.count;j++){
              box.expandByPoint(boundPoint.fromBufferAttribute(positions,j));
              if((j&2047)===2047)yield;
            }
            geometry.boundingBox=box;geometry.boundingSphere=box.getBoundingSphere(new T.Sphere());
          }else geometry.computeBoundingSphere();
        }
        if(mesh.children.length)meshes.push(...mesh.children);
        if((i & 7)===0)yield;
      }
      if(streamed&&driveWarmed){
        const pending=new T.Group(),owner=job;
        pending.children.push(roadGroup,district.group,land,...(landmarks?.active||[]).map(site=>site.mesh));
        yield {ready:warmMaterials(pending,()=>job!==owner,true).catch(error=>console.warn('District shader preparation',error))};
      }
      yield;
      // Publish geometry and its complete contact index in the same frame.
      activate({land,district,grounds,landmarks,roadGroup,shorePatch,groundAt,bridges,tunnels,obstacleCells,waterAt,
        nearbyWaterLevel,sceneGraph:graph,originX:cx,originZ:cz,treeBatches,streetBulbs});
      committed=true;districtRadius=cutoff;nextLightCheck=0;asphaltOrigin.set(cx,cz);landOrigin.set(gx,gz);
      landscapeSource.setWaterDistrict(cx,cz,cutoff);
      if(graph)atmosphere.setLocation(...graph.geo(cx,cz));
      landscapeSource.activate(landscapes);relief.activate(terrain,cx,cz);tunnelCut.update(graph,tunnels,cx,cz);showCover();
      if(fieldPixels)waterSurface.setField(fieldPixels,maskSize,maskX,maskZ,maskScale,cx,cz);
      // Local plane UV runs towards -Z. Synchronize the three PBR maps at a rebase.
      for(const [mat,tile] of [[meadow,3.1],[upland,14.2]]){
        surfaces.transform(mat,landWidth/tile,landWidth/tile,(gx/tile)%1,(-gz/tile)%1);
      }
      showPeople();showSigns();
      mappedLights.rebuild(graph,edges,cx,cz,signGround,(x,z)=>cells.get(nearbyCell(x,z))||[],
        (x,z,y,edge)=>!contact(x,z,.45,y,edge));
      breakfast.place(graph,cx,cz,segments,(x,z,r)=>!grounds.memorialAt(x+cx,z+cz)&&!blocked(x,z,r)&&!contact(x+cx,z+cz,r),driveGround);
      centralStreetscapes?.place(graph,cx,cz,segments,(x,z,r)=>!blocked(x,z,r)&&!contact(x+cx,z+cz,r),driveGround,district.streetFronts,streetLife.places);
      roadsideImpact.rebase(cx,cz);for(const o of obstacles)roadsideImpact.register(o);
      shadowStamp=-1000;
      }finally{
        if(!committed){shorePatch?.dispose();discardRoads(roadGroup);district.clear();signs.cancel();landmarkSource?.trim();}
      }
    }
    let contourWorker=null,workerDisabled=false,contourSerial=0,waiting=null;
    const requests=new Map();
    function requestSidewalkRings(segments){
      if(!contourWorker&&!workerDisabled){
        try{
          contourWorker=new Worker('sidewalk-worker.js');
          contourWorker.onmessage=({data})=>{
            const finish=requests.get(data.id);
            if(finish){requests.delete(data.id);finish(data.rings);}
          };
          contourWorker.onerror=()=>{
            workerDisabled=true;contourWorker.terminate();contourWorker=null;
            for(const finish of requests.values())finish();requests.clear();
          };
        }catch{workerDisabled=true;}
      }
      const task={};
      if(contourWorker){
        const id=++contourSerial,rows=new Float64Array(segments.size*7);
        let i=0;
        for(const s of segments)for(const v of [s.ax,s.az,s.bx,s.bz,s.w,s.nx,s.nz])rows[i++]=v;
        task.ready=new Promise(resolve=>requests.set(id,rings=>{task.rings=rings;resolve();}));
        try{contourWorker.postMessage({id,rows},[rows.buffer]);}
        catch{requests.get(id)();requests.delete(id);}
      }
      return task;
    }
    function cancelRoads(){
      waiting=null;
      if(job){job.return();job=null;}
    }
    function beginRoads(edges,cx,cz,water=[],graph=null,streamed=false){
      cancelRoads();
      spare??=makeSpare();
      job=buildRoads(spare,edges,cx,cz,water,graph,streamed);
    }
    function advanceRoads(budget=5){
      if(!job)return true;
      const end=performance.now()+budget;
      if(waiting)return false;
      do{
        const step=job.next();
        if(step.done){job=null;return true;}
        if(step.value?.ready){
          const task=waiting=step.value;
          task.ready.then(()=>{if(waiting===task)waiting=null;});
          return false;
        }
      }while(performance.now()<end);
      return false;
    }
    function setRoads(edges,cx,cz,water=[],graph=null){
      beginRoads(edges,cx,cz,water,graph);
      advanceRoads(Infinity);
    }
    async function loadRoads(edges,cx,cz,water=[],graph=null){
      beginRoads(edges,cx,cz,water,graph,true);
      const mine=job;
      while(job===mine){
        if(advanceRoads(12))return true;
        if(waiting)await waiting.ready;
        else if(globalThis.scheduler?.yield)await scheduler.yield();
        else await new Promise(resolve=>setTimeout(resolve,0));
      }
      return false;
    }
    function queueRoads(edges,cx,cz,water=[],graph=null){
      beginRoads(edges,cx,cz,water,graph,true);
      const mine=job;
      const schedule=()=>{
        if(job!==mine||document.hidden)return;
        if(globalThis.scheduler?.postTask)scheduler.postTask(pump,{priority:'background'});
        else setTimeout(pump,0);
      };
      function pump(){
        if(job!==mine||document.hidden||advanceRoads(4))return;
        if(waiting)waiting.ready.then(schedule);
        else schedule();
      }
      schedule();
    }
    const trafficModels={
      sedan:{asset:'traffic/hatchback.glb',length:3.95},van:{asset:'traffic/kei-van.glb',length:4.05},
      scooter:{asset:'traffic/motor-scooter.glb',length:1.84},taxi:{asset:'streetscape/city-taxi.glb',length:4.52},rival:worldGarage.gt
    };
    const cache=new Map(),colors=[0x446370,0x9f553e,0x9aaba9,0x384c67,0xa7a39c,0x99864e];
    const contactTexture=document.createElement('canvas');contactTexture.width=contactTexture.height=64;
    const ctx=contactTexture.getContext('2d'),grad=ctx.createRadialGradient(32,32,9,32,32,31);
    grad.addColorStop(0,'rgba(10,13,15,.75)');grad.addColorStop(1,'rgba(10,13,15,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
    const contactMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(contactTexture),transparent:true,depthWrite:false});
    const trafficBody=new T.MeshLambertMaterial();
    const fallbackMats=colors.map(c=>new T.MeshStandardMaterial({color:c,metalness:.5,roughness:.28}));
    const tires=basic(0x212323),windows=new T.MeshStandardMaterial({color:0x35494e,metalness:.48,roughness:.17}),lamps=new T.MeshBasicMaterial({color:0xa83227});
    function loadModel(kind){
      if(cache.has(kind))return cache.get(kind);
      const spec=worldGarage[kind]||trafficModels[kind];
      const request=kind==='family-sedan'?loadWorldFamilySedan(T,spec.asset):TrafficModels.load.loadAsync(spec.asset).then(gltf=>gltf.scene);
      cache.set(kind,request.then(model=>{
        const b=new T.Box3().setFromObject(model,true),center=b.getCenter(new T.Vector3()),scale=spec.length/(b.max.z-b.min.z);
        model.scale.multiplyScalar(scale);model.position.set(-center.x*scale,-b.min.y*scale,-center.z*scale);
        model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
        return model;
      }).catch(()=>{cache.delete(kind);return null;}));return cache.get(kind);
    }
    const riderGeometry={
      head:new T.SphereGeometry(1,16,10),
      helmet:new T.SphereGeometry(1,20,12,0,Math.PI*2,0,1.8),
      limb:new T.CylinderGeometry(.063,.08,1,8)
    };
    const riderMats={skin:basic(0xb98e6a),jacket:basic(0x506d69),jeans:basic(0x37474b),helmet:new T.MeshStandardMaterial({color:0xe4ddd2,roughness:.26})};
    function scooterRider(parent){
      function blob(geometry,material,x,y,z,sx,sy,sz){
        const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;
      }
      function limb(a,b,mat){
        const from=new T.Vector3(...a),to=new T.Vector3(...b),dir=to.clone().sub(from),mid=from.add(to).multiplyScalar(.5);
        const m=blob(riderGeometry.limb,mat,mid.x,mid.y,mid.z,1,dir.length(),1);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());
      }
      blob(riderGeometry.head,riderMats.jacket,0,1.07,-.10,.205,.335,.148).rotation.x=.16;
      blob(riderGeometry.head,riderMats.skin,0,1.49,-.045,.112,.135,.119);
      blob(riderGeometry.helmet,riderMats.helmet,0,1.53,-.054,.136,.138,.14);
      for(const s of [-1,1]){
        limb([s*.15,1.26,-.075],[s*.216,1.05,.06],riderMats.jacket);limb([s*.216,1.05,.06],[s*.255,1.03,.34],riderMats.skin);
        limb([s*.107,.83,-.14],[s*.175,.58,.24],riderMats.jeans);limb([s*.175,.58,.24],[s*.18,.26,.09],riderMats.jeans);
      }
    }
    function makeVehicle(kind,idx,player=false){
      const root=new T.Group(),outside=new T.Group(),low=new T.Group();root.add(outside);outside.add(low);scene.add(root);
      const spec=player?worldGarage[kind]:trafficModels[kind];
      const len=spec.length,wide=spec.width??(kind==='scooter'?.55:1.8),high=spec.height??(kind==='van'?1.65:1.18);
      const shadow=new T.Mesh(unitPlane,contactMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.013;shadow.scale.set(wide*1.75,len*1.32,1);root.add(shadow);
      const paint=fallbackMats[idx%colors.length];
      function block(x,y,z,w,h,l,m){
        const mesh=new T.Mesh(unitBox,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,l);low.add(mesh);
      }
      if(kind==='scooter'){
        for(const z of [-.59,.59]){
          const wheel=new T.Mesh(unitPole,tires);wheel.rotation.z=Math.PI/2;wheel.scale.set(.52,.16,.52);wheel.position.set(0,.26,z);low.add(wheel);
        }
        block(0,.46,-.26,.43,.42,.83,paint);block(0,.74,-.28,.39,.12,.63,tires);
        block(0,.4,.13,.36,.1,.7,paint);block(0,.69,.5,.32,.54,.18,paint);block(0,.98,.5,.57,.07,.1,tires);
      }else{
      block(0,high*.38,0,wide,high*.42,len*.97,paint);block(0,high*.69,-len*.055,wide*.87,high*.43,len*.56,windows);
      block(0,high*.92,-len*.08,wide*.84,.07,len*.49,paint);
      for(const s of [-1,1]){
        block(s*wide*.34,high*.48,-len*.485,wide*.22,.1,.05,lamps);
        for(const side of [-1,1])block(s*wide*.47,.29,side*len*.31,.16,.38,.54,tires);
      }
      }
      // Small-screen traffic proxies can draw their body, windows and tyres in one pass.
      if(small&&!player){
        const panels=low.children.filter(mesh=>mesh.geometry===unitBox);
        const body=new T.InstancedMesh(unitBox,trafficBody,panels.length);
        panels.forEach((panel,i)=>{
          panel.updateMatrix();body.setMatrixAt(i,panel.matrix);body.setColorAt(i,panel.material.color);
          low.remove(panel);
        });
        low.add(body);
      }
      const item={root,outside,low,shadow,axleShadows:[],kind,idx,wheels:[],front:[],light:null,detail:null,loading:false};
      item.request=()=>{
        if(item.loading)return;item.loading=true;
        item.ready=loadModel(kind).then(async base=>{
          if(!base){item.modelReady=true;return;}
          const model=base.clone(true),tints=new Map();
          model.traverse(n=>{
            if(!n.isMesh)return;
            const src=n.material;
            if(!src||Array.isArray(src))return;
            if(/^(paint|paint_body)$/.test(src.name)){
              if(!tints.has(src)){
                const m=src.clone();
                if(player)m.color.setHex(spec.paint);
                else if(kind==='rival')m.color.setHex(0x3a7790);
                else if(kind!=='taxi')m.color.setHex(colors[idx%colors.length]);
                tints.set(src,m);
              }n.material=tints.get(src);
            }else if(src.name==='light_rear'){
              if(!item.light){item.light=src.clone();item.light.emissive.setHex(0xff210b);}
              n.material=item.light;
            }
            atmosphere.registerFinish(n.material);
          });
          item.wheels=['FL','FR','RL','RR','F','R'].map(id=>({n:model.getObjectByName('wheel_'+id),id})).filter(i=>i.n);
          item.front=['FL','FR'].map(id=>model.getObjectByName('steer_'+id)).filter(Boolean);
          const detail=new T.Group();detail.add(model);if(kind==='scooter')scooterRider(detail);
          outside.add(detail);detail.visible=false;
          for(const {n} of item.wheels){
            const axle=root.worldToLocal(n.getWorldPosition(new T.Vector3()));
            const patch=new T.Mesh(unitPlane,contactMat);patch.rotation.x=-Math.PI/2;
            patch.position.set(axle.x,.014,axle.z);patch.scale.set(kind==='scooter'?.24:.48,.62,1);detail.add(patch);item.axleShadows.push(patch);
          }
          await prepareActor(kind,detail);
          item.detail=detail;item.modelReady=true;
        });
      };
      return item;
    }
    const playerRig=new T.Group();scene.add(playerRig);
    // A single unshadowed beam lights the actual road, kerbs and traffic ahead.
    const headlight=new T.SpotLight(0xffeccd,0,82,.49,.58,2);
    headlight.position.set(0,.73,-2.27);headlight.target.position.set(0,.08,-23);
    playerRig.add(headlight,headlight.target);
    let cabin, cabinModel;
    function refreshMap(){cabin?.refreshMap();}
    const mapRay=new T.Raycaster(),mapPointer=new T.Vector2();
    function hitDashboardMap(clientX,clientY){
      if(!cabin?.interior.visible)return false;
      const rect=canvas.getBoundingClientRect();
      mapPointer.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);
      mapRay.setFromCamera(mapPointer,camera);
      return mapRay.intersectObject(cabin.mapScreen,false).length>0;
    }
    const mirrorRotation=new T.Quaternion(),eye=new T.Vector3(),look=new T.Vector3();
    let player=null,version=0;
    const players=new Map(),trafficItems=new Map(),pools=new Map();
    function pose(item,car,dt,near){
      const pitch=Math.atan(driveGrade(car.x,car.z,car.yaw,car.edge)),bank=Math.atan(driveGrade(car.x,car.z,car.yaw+Math.PI/2,car.edge));
      item.root.position.set(car.x-originX,(car.flood?.y??car.wading?.bed??driveGround(car.x,car.z,car.edge))+.011,car.z-originZ);
      item.root.rotation.set(car.flood?car.flood.pitch:-pitch,Math.PI-car.yaw,car.flood?0:-bank,'YXZ');
      if(near)item.request();
      const detailed=near&&!!item.detail;item.low.visible=!detailed;
      if(item.detail)item.detail.visible=detailed;
      if(detailed){
        item.wheels.forEach(({n,id})=>n.rotateX((id.endsWith('R')&&id.length===2?-1:1)*car.speed*dt/.33));
        for(const steer of item.front)steer.rotation.y=-(car.steer||0)*.34;
        if(item.light)item.light.emissiveIntensity=car.brake||car.showroom&&car.opening||car.recoil?.braking?4.2:.55+atmosphere.lamps.value*1.15;
        updateBodywork(T,item.detail,car.dent,car.yaw);
      }
    }
    const driveFx=createDrivingFX(T,scene,renderer);
    const lookAxis=new T.Vector3(0,1,0),headTurn=new T.Euler(0,0,0,'YXZ');
    function render(car,traffic,dt,inside=false,now=performance.now(),prepareOnly=false){
      caveOpenings.update(car.sightView?.monument,originX,originZ);
      foliageEye.set(car.x-originX,car.z-originZ,car.sightView?0:1);
      if(!car||!Number.isFinite(car.x)||!Number.isFinite(car.z))return;
      if(car.showroom||car.sightView||car.flood)inside=false;
      graphics.frame(now,car.driving);dt=Math.max(0,Math.min(.12,dt||0));version++;
      waterSurface.update(now*.001,weather.rainfall);
      mappedLights.update(now*.001);
      const x=car.x-originX,z=car.z-originZ;
      streetLife.render(dt,car.sightView?.x??car.x,car.sightView?.z??car.z,driveGround);
      const wake=car.flood?Math.exp(-car.flood.age*.36):car.wading?Math.min(1,Math.abs(car.speed)*.11):0;
      waterSurface.setWake(x,z,car.yaw+(car.speed<0?Math.PI:0),wake,car.flood?.age||0);
      const kind=car.model;
      if(!player||player.kind!==kind){
        if(player)player.root.visible=false;
        if(!players.has(kind))players.set(kind,makeVehicle(kind,0,true));
        player=players.get(kind);
        if(player.modelReady&&!player.detail)player.loading=false;
        player.request();player.root.visible=true;
      }
      pose(player,car,dt,true);player.root.visible=!car.sightView;player.outside.visible=!inside;
      driveFx.mountExhaust(player.detail?.children[0],kind);
      player.shadow.visible=!car.flood;for(const shadow of player.axleShadows)shadow.visible=!car.flood;
      player.outside.rotation.set(-(car.pitch||0),0,-(car.roll||0));
      car.y=player.root.position.y-.011;playerRig.position.copy(player.root.position);
      playerRig.position.y+=car.spec.seatLift??0;
      playerRig.rotation.set(-player.root.rotation.x,-car.yaw,-player.root.rotation.z,'YXZ');
      mirrorRotation.copy(playerRig.quaternion);
      if(inside){
        cabin??=window.buildDriverCabin(T,playerRig,document.getElementById('map'));
        if(cabinModel!==kind){cabin.setVehicle(kind,car.spec);cabinModel=kind;}
      }
      cabin?.update(inside,(car.speed||0)*3.6,car.steer||0,undefined,undefined,undefined,car.energyPercent);
      const visibleTraffic=car.sightView?.data.memorialVisit?[]:traffic||[];
      const lightTraffic=small&&graphics.profile.id==='low';
      const trafficRange=lightTraffic?220:360,detailRange=lightTraffic?70:140;
      const closest=visibleTraffic.map(a=>({a,d:(a.x-car.x)**2+(a.z-car.z)**2})).filter(v=>v.d<trafficRange**2).sort((a,b)=>a.d-b.d);
      for(const [index,{a,d}] of closest.entries()){
        const kind=Object.hasOwn(trafficModels,a.kind)?a.kind:'sedan';
        let item=trafficItems.get(a.id);
        if(item&&item.kind!==kind){trafficItems.delete(a.id);item.root.visible=false;(pools.get(item.kind)||pools.set(item.kind,[]).get(item.kind)).push(item);item=null;}
        if(!item){item=pools.get(kind)?.pop()||makeVehicle(kind,Math.abs(Number(a.id)||index));trafficItems.set(a.id,item);}
        item.tick=version;item.root.visible=true;
        const recoil=a.flood?null:a.recoil;
        item.outside.position.y=(recoil?.y||0)+(recoil?.fallen ? .25*Math.abs(Math.sin(recoil.roll)) : 0);
        item.outside.rotation.set(-(recoil?.pitch||0),0,-(recoil?.roll||0));
        for(const shadow of item.axleShadows)shadow.visible=!a.flood&&!recoil?.fallen;
        item.shadow.visible=!a.flood&&(recoil?.y||0)<3.2;
        // Keep nearby riders legible without loading every scooter on a busy street.
        pose(item,a,dt,(index<graphics.profile.cars||kind==='scooter'&&d<35*35||!!recoil)&&d<detailRange**2);
      }
      for(const [id,item] of trafficItems)if(item.tick!==version){
        trafficItems.delete(id);item.root.visible=false;
        if(!pools.has(item.kind))pools.set(item.kind,[]);pools.get(item.kind).push(item);
      }
      const sin=Math.sin(car.yaw),cos=Math.cos(car.yaw),speed=Math.abs(car.speed||0);
      sun.target.position.set(Math.round(x+sin*17),car.y,Math.round(z-cos*17));
      if(now-shadowStamp>graphics.profile.shadowMs){renderer.shadowMap.needsUpdate=true;shadowStamp=now;}
      const viewpoint=car.sightView||car;
      land.material=car.region==='highlands'?upland:meadow;relief.update(viewpoint.x,viewpoint.z);
      if(car.showroom&&!inside&&!car.opening){
        const portrait=camera.aspect<.85;
        eye.set(portrait?-5.6:-4.3,portrait?1.9:1.6,portrait?8.0:5.5);
        look.set(portrait?0:-1.38,.72,-.38);
      }else if(inside){
        cabin.driverEye(eye,look,camera.aspect);
      }else{
        const extraLength=Math.max(0,(car.spec.length||4.6)-5.1),extraHeight=Math.max(0,(car.spec.height||1.4)-1.85);
        const back=(camera.aspect<.85?7.55:6.35)+speed*.018+extraLength*.92+extraHeight*.35;
        eye.set(-(car.steer||0)*.32,2.08+speed*.007+extraHeight*.84,back);look.set(0,.9+extraHeight*.28,-10-extraLength*.4);
      }
      if(car.openingPose&&!inside&&!car.sightView){
        const p=car.openingPose,portrait=camera.aspect<.85;
        eye.x+=(3.2-eye.x)*p;eye.y+=(1.22-eye.y)*p;eye.z+=((portrait?9.5:6.2)-eye.z)*p;
        look.x+=((portrait?-1.55:-2.7)-look.x)*p;look.y+=(1.12-look.y)*p;look.z+=(-3.1-look.z)*p;
      }
      if(car.driving && car.look && (car.look.yaw || car.look.pitch)){
        // Turn around the seat in the cabin, or around the car in chase view.
        look.sub(eye).applyEuler(headTurn.set(car.look.pitch,-car.look.yaw,0,'YXZ'));
        if(!inside)eye.applyAxisAngle(lookAxis,-car.look.yaw);
        look.add(eye);
      }
      eye.applyQuaternion(mirrorRotation).add(playerRig.position);look.applyQuaternion(mirrorRotation).add(playerRig.position);
      if(car.showroom&&car.departureView&&!inside){
        const v=car.departureView,offset=v.offset||0;
        const px=v.x+Math.sin(v.yaw)*offset,pz=v.z+Math.cos(v.yaw)*offset;
        const ground=(modeledBridgeLengths[car.tourStopId]?bridges?.signatureHeight(v.x,v.z):null)??relief.ground(v.x,v.z),radius=v.radius/Math.min(1,camera.aspect*1.32);
        look.set(px-originX,ground+v.focus,pz-originZ);
        eye.set(look.x+Math.sin(v.angle)*radius,ground+v.eye,look.z+Math.cos(v.angle)*radius);
        eye.y=Math.max(eye.y,relief.ground(eye.x+originX,eye.z+originZ)+1.5);
        sun.target.position.copy(look);
      }else if(car.showroom&&car.tourStop&&!car.opening){
        const stop=landmarks.nearest(car.x,car.z);
        if(stop&&stop.distance>3){
          const dx=(stop.x-car.x)/stop.distance,dz=(stop.z-car.z)/stop.distance;
          eye.set(x-dx*7+dz*1.5,car.y+2.15,z-dz*7-dx*1.5);
          look.set(x+dx*15,car.y+2.7,z+dz*15);
        }
      }
      if(car.edge&&sceneGraph?.tunnels.info(car.edge)?.bore&&!car.sightView&&!inside){
        // Keep the chase camera in the driver's bore on bends and at the mouth.
        const road=sceneGraph.nearest(eye.x+originX,eye.z+originZ,[car.edge]),p=sceneGraph.sample(road);
        const q=tunnels.section(car.edge),dx=eye.x+originX-p.x,dz=eye.z+originZ-p.z;
        const across=dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw);
        const safe=Math.max(.25,q.roadHalfWidth-.4),correction=Math.max(-safe,Math.min(safe,across))-across;
        eye.x+=Math.cos(p.yaw)*correction;eye.z+=Math.sin(p.yaw)*correction;
        const floor=tunnels.height(car.edge,road.s);
        eye.y=Math.max(floor+.5,Math.min(floor+q.spring-.25,eye.y));
      }
      if(car.flood){eye.y=Math.max(eye.y,car.flood.level+2.2);look.set(x,car.flood.level-.25,z);}
      camera.position.copy(eye);camera.lookAt(look);
      const viewport=car.sightView?.viewport;
      const tourAspect=viewport?viewport.width/viewport.visibleHeight:camera.aspect;
      if(car.sightView){
        const v=car.sightView,angle=v.angle-v.data.yaw;
        const span=Math.abs(Math.cos(angle))*v.data.width+Math.abs(Math.sin(angle))*v.data.depth;
        const front=Math.abs(Math.sin(angle))*v.data.width+Math.abs(Math.cos(angle))*v.data.depth;
        const radius=(v.data.viewRadius??(Math.max(span/Math.max(.35,tourAspect),v.height)*1.10+front*.40))*v.zoom;
        const monumentDatum=v.data.caveOpening||v.data.viewBase==='monument';
        const base=(monumentDatum?v.monument.base:null)??(modeledBridgeLengths[v.data.id]?bridges?.signatureHeight(v.x,v.z):null)??relief.ground(v.x,v.z);
        const focus=v.data.focusAltitude??(base+v.height*.46);
        look.set(v.x-originX,focus,v.z-originZ);
        camera.position.set(look.x+Math.sin(v.angle)*radius*Math.cos(v.elevation),focus+radius*Math.sin(v.elevation),
          look.z+Math.cos(v.angle)*radius*Math.cos(v.elevation));
        const floor=caveOpenings.floorAt(camera.position.x,camera.position.z)??relief.ground(camera.position.x+originX,camera.position.z+originZ);
        camera.position.y=Math.max(camera.position.y,floor+2);
        camera.lookAt(look);
        sun.target.position.copy(look);
      }
      // Fit the facade on a narrow screen without backing the eye into a tree.
      const fixedView=car.sightView?.data.viewRadius;
      const tourFov=car.sightView?.data.viewFov??57;
      const fov=fixedView?T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(tourFov/2))/Math.min(1,tourAspect))):
        (inside?64:car.openingPose?57+Math.min(15,speed*.28)-9*car.openingPose:car.showroom?47:57+Math.min(15,speed*.28))+driveFx.boostFov(car.driving&&car.boost,inside);
      if(Math.abs(fov-camera.fov)>.05){
        camera.fov=car.showroom||car.sightView?.data.views?fov:camera.fov+(fov-camera.fov)*(1-Math.exp(-dt*7));
        camera.updateProjectionMatrix();
      }
      if(viewport){
        const {width,height,top,visibleHeight}=viewport,v=camera.view,scale=height/visibleHeight;
        const frameWidth=width*scale,frameHeight=height*scale;
        if(!v?.enabled||v.fullWidth!==width||v.fullHeight!==height||v.height!==frameHeight||v.offsetY!==-top*scale)
          camera.setViewOffset(width,height,(width-frameWidth)/2,-top*scale,frameWidth,frameHeight);
      }else if(camera.view?.enabled)camera.clearViewOffset();
      if(breakfast.update(car,dt))onBreakfastCall?.();
      atmosphere.setHour(car.sightView?.hour??car.scenicHour);
      const sheltered=!car.sightView&&car.edge&&sceneGraph?.tunnels.info(car.edge)?.bore;
      atmosphere.eclipse.value=sightings.update(dt,car,originX,originZ,camera.aspect,sheltered);
      weather.render(camera,now,car.dawn||0,atmosphere.update,sheltered);
      headlight.intensity=car.flood?0:(sheltered?1:atmosphere.lamps.value)*2600;
      material.glass.emissiveIntensity=atmosphere.lamps.value*.37;
      material.lantern.emissiveIntensity=atmosphere.lamps.value*3.2;
      centralStreetscapes?.update(atmosphere.lamps.value);
      if(now>=nextLightCheck){
        nextLightCheck=now+240;
        const level=atmosphere.lamps.value;
        if(level>.04)streetBulbs.sort((a,b)=>a.distanceToSquared(camera.position)-b.distanceToSquared(camera.position));
        streetLights.forEach((light,i)=>{
          const bulb=streetBulbs[i],distance=bulb?.distanceTo(camera.position)??Infinity;
          // Changing the number of visible lights recompiles every lit material.
          if(level>.04&&i<(graphics.profile.id==='low'?1:3)&&distance<78){
            light.position.copy(bulb);
            light.intensity=230*level*(1-T.MathUtils.smoothstep(distance,48,78));
          }else light.intensity=0;
        });
      }
      updateTreeDetail(camera.position.x,camera.position.z,graphics.profile);
      if(prepareOnly)return warmScene();
      if(car.showroom&&player.modelReady)cabin?.prepare(renderer,scene,camera);
      if(inside&&cabin)cabin.reflectMounted(renderer,scene,graphics.profile.mirrorMs);
      roadsideImpact.update(dt);driveFx.update(car,dt,originX,originZ,inside,camera,atmosphere.wetness.value);
      landmarkSource?.weather(weather.rainfall);
      const waterLevel=graphics.profile.waterWidth?nearbyWaterLevel(viewpoint.x-originX,viewpoint.z-originZ):null;
      const wetRoad=atmosphere.wetness.value>.12&&!car.sightView&&!car.flood;
      const reflectionLevel=waterLevel??(wetRoad?car.y:null);
      waterSurface.reflect(renderer,scene,camera,reflectionLevel,now,reflectionLevel!==null,graphics.profile);
      renderer.render(scene,camera);
      return player.modelReady;
    }
    let driveWarmed=false;
    const actorPrograms=new Map(),preparedPrograms=new WeakSet(),uploadedTextures=new WeakMap();
    async function warmMaterials(object,canceled=()=>false,streamed=false){
      const programs=new Set(),textures=new Set();
      function compile(batch){
        for(const mat of renderer.compile(batch,camera,scene)){
          // A material can have separate screen, reflection and instancing
          // programs. A concurrent draw changes its currentProgram.
          for(const program of renderer.properties.get(mat).programs.values()){
            if(!preparedPrograms.has(program))programs.add(program);
          }
          for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap']){
            const tex=mat[key];
            if(tex?.image&&tex.image.complete!==false&&tex.version>0&&!tex.isRenderTargetTexture&&uploadedTextures.get(tex)!==tex.version)textures.add(tex);
          }
        }
      }
      function compileBatch(batch){
        if(graphics.profile.waterWidth)waterSurface.prepare(renderer,graphics.profile,()=>compile(batch));
        compile(batch);
      }
      if(streamed){
        // The same road and building materials recur at every origin. Warm new
        // surfaces in small batches while the driver still sees the previous district.
        const fresh=[],batch=new T.Group();
        object.traverse(node=>{
          if(!node.material)return;
          const materials=Array.isArray(node.material)?node.material:[node.material];
          if(materials.some(mat=>!renderer.properties.get(mat).programs?.size))fresh.push(node);
        });
        for(let i=0;i<fresh.length&&!canceled();i+=8){
          batch.children=fresh.slice(i,i+8);
          compileBatch(batch);
          if(i+8<fresh.length)await new Promise(resolve=>setTimeout(resolve,0));
        }
      }else compileBatch(object);
      while((programs.size||textures.size)&&!canceled()){
        const end=performance.now()+2;
        for(const program of programs){
          if(!program.program||preparedPrograms.has(program))programs.delete(program);
          else if(program.isReady()){
            program.getUniforms();preparedPrograms.add(program);programs.delete(program);
          }
          if(performance.now()>=end)break;
        }
        for(const tex of textures){
          if(performance.now()>=end)break;
          if(uploadedTextures.get(tex)!==tex.version){renderer.initTexture(tex);uploadedTextures.set(tex,tex.version);}
          textures.delete(tex);
        }
        if(programs.size||textures.size)await new Promise(resolve=>setTimeout(resolve,8));
      }
    }
    function prepareActor(kind,object){
      if(!driveWarmed)return;
      const key=kind+'|'+graphics.profile.id;
      if(!actorPrograms.has(key))actorPrograms.set(key,warmMaterials(object).catch(()=>actorPrograms.delete(key)));
      return actorPrograms.get(key);
    }
    async function warmScene(){
      const actors=new Map([[player.kind,player]]);
      for(const item of trafficItems.values()){
        if(small&&!item.loading)continue;
        if(!actors.has(item.kind))actors.set(item.kind,item);
      }
      for(const item of actors.values())item.request();
      const [walkers]=await Promise.all([streetLife.prepareDeparture(),environmentReady,
        ...Array.from(actors.values(),item=>item.ready)]);
      driveFx.mountExhaust(player.detail?.children[0],player.kind);
      await warmMaterials(scene);
      // Some drivers specialize a linked program on its first draw. Prime the
      // skinned, vehicle and impact layouts behind the departure screen.
      const actorsToRestore=[],scissor=renderer.getScissor(new T.Vector4()),clipped=renderer.getScissorTest();
      const canopyProbes=[];
      try{
        // At departure distant trees can all be billboards. The first nearby
        // grove uses a different shader, with or without per-instance colour.
        if(small&&treeBatches.length){
          const canopy=treeModels.geometry('tree',true,0);
          for(const tinted of [false,true]){
            const probe=new T.InstancedMesh(canopy,treeModels.material,1);
            if(tinted)probe.setColorAt(0,new T.Color(0xffffff));
            probe.receiveShadow=true;probe.frustumCulled=false;
            scene.add(probe);canopyProbes.push(probe);
          }
        }
        for(const root of [walkers,driveFx.group,...Array.from(actors.values(),item=>item.root)])root.traverse(node=>{
          actorsToRestore.push([node,node.visible,node.frustumCulled]);
          node.visible=true;node.frustumCulled=false;
        });
        renderer.setScissor(0,0,1,1);renderer.setScissorTest(true);
        renderer.shadowMap.needsUpdate=true;
        if(graphics.profile.waterWidth)waterSurface.prepare(renderer,graphics.profile,()=>renderer.render(scene,camera),true);
        renderer.render(scene,camera);
      }finally{
        for(const probe of canopyProbes){probe.removeFromParent();probe.dispose();}
        for(const [node,visible,culled] of actorsToRestore){node.visible=visible;node.frustumCulled=culled;}
        renderer.setScissor(scissor);renderer.setScissorTest(clipped);renderer.shadowMap.needsUpdate=true;
      }
      const gl=renderer.getContext(),fence=gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
      if(fence){
        gl.flush();
        try{while(gl.clientWaitSync(fence,0,0)===gl.TIMEOUT_EXPIRED)await new Promise(resolve=>setTimeout(resolve,8));}
        finally{gl.deleteSync(fence);}
      }
      driveWarmed=true;
    }
    function prepareShaders(car,traffic){
      return render(car,traffic,0,false,performance.now(),true);
    }
    function capturePhoto(){
      if(renderer.getContext().isContextLost())throw Error('WebGL context lost');
      // The browser may clear the WebGL buffer after presenting it. Redraw the
      // displayed camera pose without advancing the drive or its sky events.
      renderer.render(scene,camera);
      return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    }
    function projectSummit(){
      const summit=scene.getObjectByName('chua-ngoc-tam-chuc');
      if(!summit?.visible)return null;
      markerPoint.copy(summit.position);
      markerPoint.y+=summit.userData.height;
      markerPoint.project(camera);
      return markerPoint.z>0 && markerPoint.z<1 && Math.abs(markerPoint.x)<.92 && Math.abs(markerPoint.y)<.9 ? markerPoint : null;
    }
    return {get sceneryChanged(){return districtRadius!==graphics.profile.districtRadius;},get mappedFurniture(){return grounds.streetFurniture;},
      capturePhoto,hitDashboardMap,refreshMap,prepareShaders,projectSummit,weather,streetLife,accessLane:(x,z)=>grounds.accessLane(x,z),loadStructures:structures.load,preloadVehicle:loadModel,waterAt:(x,z,edge)=>{if(edge&&sceneGraph.tunnels.info(edge)?.bore&&tunnels.at(x,z,edge)!=null)return null;const wet=waterAt(x,z),deck=wet&&bridges?.at(x,z,edge);return wet&&deck!=null&&deck>=wet.level?null:wet;},terrainReady:relief.ready,grade:driveGrade,ground:driveGround,setRoads,queueRoads,loadRoads,advanceRoads,cancelRoads,districtDistance:(x,z)=>Math.hypot(x-originX,z-originZ),render,resize:graphics.resize,contact,loadDistrict:async(g,x,z)=>(await Promise.all([buildingSource.load(g,x,z),osmBuildings.load(g,x,z),relief.loadLocal(g,x,z),landscapeSource.load(g,x,z),groundSource.load(g,x,z),environment.load(g,x,z),amenities.load(g,x,z)])).some(Boolean),splash:(x,z,nx,nz,strength,level)=>driveFx.impact(x,z,nx,nz,strength,'water',level,.3),sightFootprint:(...args)=>district.footprint(...args),footprintViews:(...args)=>district.footprintViews(...args,relief.ground),nearLandmark:(x,z,id)=>landmarks?.nearest(x,z,650,id),reactToContact:roadsideImpact.react,impact:(x,z,nx,nz,s,k,h=0,g,edge)=>driveFx.impact(x,z,nx,nz,s,k,driveGround(x,z,edge)+h,g),scrape:(x,y,z,vx,vz,edge)=>driveFx.scrape(x,driveGround(x,z,edge)+y,z,vx,vz),resetFx(){driveFx.reset();roadsideImpact.reset();sightings.reset();}};
  };
})();
