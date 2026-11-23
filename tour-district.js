'use strict';
const vanMieuArchitectureRefs=new Set(['w702185143','w702241280','w702241281',
  'w702185144','w702185176','w702185189','w702241324','w702241325']);
// Native Văn Miếu models use the monument's floor plans, photographs, and the
// documented order and catalogue sizes of the 82 stelae (VanMieuSurvey).
// Undimensioned roofs, timber, carving profiles, turtle bases and spacing are
// visual reconstructions. No inscription text is synthesized.
function createVanMieuArchitecture(T){
  const colors={clay:0xb66d4c,ridge:0x8e8176,timber:0x653d2e,wood:0x875742,lacquer:0x9c3b2a,
    granite:0x88887b,border:0x989889,brick:0xa97960,plaster:0xcec5af,bronze:0x827454,hide:0xc8aa81};
  for(const k of Object.keys(colors))colors[k]=new T.Color(colors[k]);
  const forms={box:new T.BoxGeometry(1,1,1),round:new T.CylinderGeometry(1,1,1,12),
    ellipsoid:new T.SphereGeometry(1,10,5),shell:new T.SphereGeometry(1,16,7)};
  return function draw(survey,ring,graph,put){
    const stele=Boolean(survey.steleRows),drum=survey.kind==='drum',bell=survey.kind==='bell';
    const gate=survey.ref==='w702185144'||survey.ref==='w702185176',hall=survey.ref==='w702185189';
    const mainGate=survey.ref==='w702185143',sideGate=survey.ref==='w702241280'||survey.ref==='w702241281';
    // World north is -z. Rows run from Khuê Văn Các to Đại Thành Môn. Each
    // tablet lies parallel to its gallery and faces across it toward the well.
    const site=window.VanMieuSurvey.byRef,centre=ref=>{
      const xy=site.get(ref).rings[0].slice(0,-1);
      return graph.point(xy.reduce((s,p)=>s+p[0],0)/xy.length,xy.reduce((s,p)=>s+p[1],0)/xy.length);
    };
    const khue=centre('w702185155'),dai=centre('w702185176'),well=centre('w37934144');
    let tx=dai.x-khue.x,tz=dai.z-khue.z;
    if(!stele)[tx,tz]=[-tz,tx];
    const length=Math.hypot(tx,tz);tx/=length;tz/=length;
    let ux=tx,uz=tz,longest=0;
    for(let j=0;j<ring.length;j++){
      const a=ring[j],b=ring[(j+1)%ring.length],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz),dot=dx*tx+dz*tz;
      if(len>longest&&Math.abs(dot)>.88*len){longest=len;ux=dx/len*Math.sign(dot);uz=dz/len*Math.sign(dot);}
    }
    let vx=-uz,vz=ux;
    const x0=ring[0].x,z0=ring[0].y;
    const front=stele?well:graph.point(105.8353754,21.0273187);
    if((front.x-x0)*vx+(front.z-z0)*vz<0){vx=-vx;vz=-vz;}
    const us=ring.map(p=>(p.x-x0)*ux+(p.y-z0)*uz),vs=ring.map(p=>(p.x-x0)*vx+(p.y-z0)*vz);
    const uMin=Math.min(...us),uMax=Math.max(...us),vMin=Math.min(...vs),vMax=Math.max(...vs);
    const U=(uMax-uMin)/2,V=(vMax-vMin)/2;
    const x=x0+ux*(uMax+uMin)/2+vx*(vMax+vMin)/2,z=z0+uz*(uMax+uMin)/2+vz*(vMax+vMin)/2;
    const solids=[],stelae=[];
    function corner(u,v){return new T.Vector2(x+ux*u+vx*v,z+uz*u+vz*v);}
    function barrier(u,v,ru,rv){solids.push([[corner(u-ru,v-rv),corner(u+ru,v-rv),corner(u+ru,v+rv),corner(u-ru,v+rv)]]);}
    function finishOf(tint){
      if(tint===colors.granite||tint===colors.border)return 3;
      if(tint===colors.wood||tint===colors.timber||tint===colors.lacquer)return 5;
      if(tint===colors.plaster)return 6;
      return 0;
    }
    function point(p,tint,finish=finishOf(tint),uv,normal){
      const [u,y,v]=p;
      const tex=uv||(finish>=3?[u,y]:[u,v]);
      put(x+ux*u+vx*v,y,z+uz*u+vz*v,tex[0],tex[1],tint,finish,normal);
    }
    function planar(a,b,c){
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],ex=c[0]-a[0],ey=c[1]-a[1],ez=c[2]-a[2];
      const nx=Math.abs(dy*ez-dz*ey),ny=Math.abs(dz*ex-dx*ez),nz=Math.abs(dx*ey-dy*ex);
      if(ny>nx&&ny>nz)return p=>[p[0],p[2]];
      return nx>nz?p=>[p[2],p[1]]:p=>[p[0],p[1]];
    }
    function face(a,b,c,d,tint,finish=finishOf(tint)){
      const map=finish>=3&&planar(a,b,c);
      for(const p of [a,b,c,a,c,d])point(p,tint,finish,map&&map(p));
    }
    function solid(key,u,y,v,su,sy,sv,tint){
      const geo=forms[key],ind=geo.index.array,positions=geo.attributes.position,uv=geo.attributes.uv,finish=finishOf(tint);
      const pts=Array.from({length:positions.count},(_,i)=>[u+positions.getX(i)*su,y+positions.getY(i)*sy,v+positions.getZ(i)*sv]);
      // Smooth the carved stone and turned posts without splitting the
      // district into additional draws. Mirror normals with the gallery.
      const sign=Math.sign(ux*vz-uz*vx),n=geo.attributes.normal;
      const normals=key!=='box'&&Array.from({length:n.count},(_,i)=>{
        const a=n.getX(i)/su,b=n.getY(i)/sy,c=n.getZ(i)/sv,s=sign/Math.hypot(a,b,c);
        return [(ux*a+vx*c)*s,b*s,(uz*a+vz*c)*s];
      });
      for(let j=0;j<ind.length;j+=3){
        const projection=key==='box'&&planar(pts[ind[j]],pts[ind[j+1]],pts[ind[j+2]]);
        for(let k=j;k<j+3;k++){
          const i=ind[k],p=pts[i];
          const tex=projection?projection(p):[u+.37*v+uv.getX(i)*Math.PI*(su+sv),y+(uv.getY(i)-.5)*sy*(key==='round'?1:2)];
          point(p,tint,finish,tex,normals&&normals[i]);
        }
      }
    }
    function box(u,y,v,w,h,d,tint){solid('box',u,y,v,w,h,d,tint);}
    const piers=survey.kind==='stelePavilion';
    const raised=gate||drum||bell;
    const floor=hall ? 0 : (raised ? .36 : .12);
    const tallest=stele?Math.max(...survey.steleRows.map(a=>a.height)):0;
    const eave=stele?Math.max(tallest+.76,piers?3.05:2.85):hall?4.5:gate?2.82:3.85;
    const rise=stele?(piers?1.95:1.43):Math.min(3,V*.75);
    const apron=Math.min(.32,V*.12);
    box(0,floor/2-.18,0,(U-apron*.65)*2,floor+.36,(V-apron*.65)*2,colors.brick);
    function roofTier(halfU,halfV,edge,pitch,offsetU=0,offsetV=0){
      const gabled=gate||hall;
      const hip=gabled?0:Math.min(halfU*.45,halfV*.73);
      function roofPoint(s,t,side){
        const end=Math.abs(s)**7,upturn=Math.min(.52,halfV*.17)*end;
        return [offsetU+s*(halfU-hip*t),edge+pitch*(.70*t+.30*t*t)+(gabled?.18:1)*upturn*((1-t)**2+.23*t*t),
          offsetV+side*halfV*(1-t)];
      }
      const segments=12,tiers=4;
      for(const side of [-1,1]){
        for(let j=0;j<segments;j++){
          const s=2*j/segments-1,r=2*(j+1)/segments-1;
          for(let k=0;k<tiers;k++)face(roofPoint(s,k/tiers,side),roofPoint(r,k/tiers,side),
            roofPoint(r,(k+1)/tiers,side),roofPoint(s,(k+1)/tiers,side),colors.clay,1);
          const a=roofPoint(s,0,side),b=roofPoint(r,0,side);
          face(a,b,[b[0],b[1]-.12,b[2]],[a[0],a[1]-.12,a[2]],colors.timber);
        }
      }
      for(const s of [-1,1])for(let k=0;k<tiers;k++){
        const t=k/tiers,n=(k+1)/tiers;
        face(roofPoint(s,t,-1),roofPoint(s,t,1),roofPoint(s,n,1),roofPoint(s,n,-1),
          gabled?colors.plaster:colors.clay,gabled?0:1);
      }
      const cap=(s,side)=>{const [u,y]=roofPoint(s,1,1);return [u,y+.09+Math.abs(s)**8*.14,offsetV+side*.10];};
      for(let k=0;k<segments;k++){
        const s=2*k/segments-1,r=2*(k+1)/segments-1;
        face(cap(s,-1),cap(r,-1),cap(r,1),cap(s,1),colors.ridge);
        for(const side of [-1,1]){
          const a=cap(s,side),b=cap(r,side);
          face(a,b,[b[0],b[1]-.16,b[2]],[a[0],a[1]-.16,a[2]],colors.ridge);
        }
      }
    }
    function arch(u,v,halfWidth,halfDepth,halfOpening,spring,top,bottom=0){
      // The round cutout runs through the full depth, so the portal also
      // reads correctly when approached from the other courtyard.
      const c=colors.plaster,postWidth=halfWidth-halfOpening;
      for(const side of [-1,1]){
        const centre=u+side*(halfOpening+postWidth/2);
        box(centre,(bottom+top)/2,v,postWidth,top-bottom,2*halfDepth,c);
        if(bottom<1)barrier(centre,v,postWidth/2,halfDepth);
      }
      const curve=t=>[u+halfOpening*Math.cos(t),spring+halfOpening*Math.sin(t)];
      for(let j=0;j<10;j++){
        const a=curve(j*Math.PI/10),b=curve((j+1)*Math.PI/10);
        for(const side of [-1,1]){
          const z=v+side*halfDepth;
          face([a[0],a[1],z],[b[0],b[1],z],[b[0],top,z],[a[0],top,z],c);
        }
        face([a[0],a[1],v-halfDepth],[b[0],b[1],v-halfDepth],
          [b[0],b[1],v+halfDepth],[a[0],a[1],v+halfDepth],c);
      }
      box(u,top+.045,v,2*halfWidth,.09,2*halfDepth,c);
    }
    if(mainGate||sideGate){
      const lower=sideGate?3.08:4.40,aperture=sideGate?U*.63:U*.42;
      arch(0,0,U,V,aperture,lower-aperture-.40,lower,floor);
      box(0,lower+.12,0,U*2+.18,.19,V*2+.18,colors.ridge);
      if(sideGate)return {solids,height:lower+.24};
      // The upper storey has its own mapped outline. The bell suspended
      // there is 2.10 m high with a 0.99 m mouth (monument operator).
      const upper=site.get('w702185142').rings[0].slice(0,-1).map(p=>graph.point(...p));
      const au=upper.map(p=>(p.x-x)*ux+(p.z-z)*uz),av=upper.map(p=>(p.x-x)*vx+(p.z-z)*vz);
      const halfU=(Math.max(...au)-Math.min(...au))/2,halfV=(Math.max(...av)-Math.min(...av))/2;
      const u=(Math.max(...au)+Math.min(...au))/2,v=(Math.max(...av)+Math.min(...av))/2;
      const low=lower+.24,top=low+3.0;
      for(const sign of [-1,1]){
        for(let bay=-1;bay<=1;bay++)
          arch(u+bay*halfU*2/3,v+sign*(halfV-.10),halfU/3,.10,halfU*.22,low+1.74,top,low);
        box(u+sign*(halfU-.12),low+.38,v,.22,.76,2*halfV,colors.plaster);
      }
      const ih=survey.instrumentHeight,ir=survey.instrumentDiameter/2;
      solid('round',u,top-ih*.56,v,ir*.85,ih*.74,ir*.85,colors.bronze);
      solid('ellipsoid',u,top-ih*.18,v,ir*.85,ih*.18,ir*.85,colors.bronze);
      solid('round',u,top-ih*.95,v,ir,ih*.10,ir,colors.bronze);
      roofTier(halfU+.30,halfV+.30,top,.85,u,v);
      roofTier(halfU*.80,halfV*.80,top+.67,.66,u,v);
      return {solids,height:top+1.64};
    }
    roofTier(U,V,eave,rise);
    // Columns and tie beams keep the approach and sides of the structures open.
    const bays=survey.bays||(piers||drum||bell?1:5);
    const rows=hall?survey.columns/(bays+1):gate?3:2;
    const postU=U-Math.min(.60,U*.17),postV=V-Math.min(.48,V*.22);
    const rad=piers?.34:drum||bell?.30:hall?.20:gate?.16:.125;
    for(let j=0;j<rows;j++){
      const v=-postV+2*postV*j/(rows-1);
      box(0,eave-.15,v,2*postU+.18,.22,piers?.35:.19,colors.timber);
      for(let k=0;k<=bays;k++){
        const u=-postU+2*postU*k/bays,top=eave-.12;
        box(u,floor+.085,v,rad*2.65,.17,rad*2.65,colors.granite);
        if(piers)box(u,(floor+top)/2,v,rad*2,top-floor,rad*2,colors.plaster);
        else solid('round',u,(floor+top)/2,v,rad,top-floor,rad,gate?colors.lacquer:colors.timber);
        barrier(u,v,rad,rad);
        if(j===0)box(u,eave-.13,0,.17,.22,2*postV+.25,colors.timber);
      }
    }
    // Closed end gables frame the open bays of the hall and courtyard gates.
    if(hall||gate)for(const sign of [-1,1]){
      box(sign*postU,(floor+eave)/2,0,.20,eave-floor,postV*2,colors.plaster);
      barrier(sign*postU,0,.10,postV);
    }
    if(gate){
      if(survey.entranceSteps){
        const n=survey.entranceSteps;
        for(const sign of [-1,1])for(let k=1;k<n;k++){
          const y=floor*k/n;
          box(0,y/2,sign*(V+(n-k-.5)*.28),postU*2/bays,y,.29,colors.granite);
        }
      }
      if(survey.doors)for(let k=0;k<bays;k++){
        const u=-postU+(k+.5)*2*postU/bays;
        // Fold each pair of doors back along the centre column line. This keeps
        // the three documented openings clear while retaining the timber leaves.
        for(const side of [-1,1])box(u+side*(postU/bays-rad-.03),floor+1.03,
          -postU/bays*.5,.09,2.06,postU/bays,colors.wood);
      }
    }
    if(drum||bell){
      const h=survey.instrumentHeight,diameter=survey.instrumentDiameter;
      if(drum){
        // The maker's 2.65 m drum stands on a horizontal axis in a wood cradle.
        const centre=floor+diameter*.52+.55;
        for(const v of [-h*.32,h*.32]){
          box(0,floor+.37,v,diameter*.82,.73,.13,colors.wood);
          box(0,floor+.09,v,diameter*1.06,.18,.32,colors.timber);
        }
        const segments=24,circle=(a,r,v)=>[Math.cos(a)*r,centre+Math.sin(a)*r,v];
        for(let j=0;j<segments;j++){
          const a=2*Math.PI*j/segments,b=2*Math.PI*(j+1)/segments;
          for(const sign of [-1,1]){
            const end=sign*h/2,r=diameter*.5;
            face(circle(a,r,end),circle(b,r,end),circle(b,r*1.12,0),circle(a,r*1.12,0),colors.lacquer);
            for(const fraction of [.58,.88]){
              const v1=end*(fraction-.018),v2=end*(fraction+.018);
              const r1=r*(1.12-.12*(fraction-.018))+.012,r2=r*(1.12-.12*(fraction+.018))+.012;
              face(circle(a,r1,v1),circle(b,r1,v1),circle(b,r2,v2),circle(a,r2,v2),colors.timber);
            }
            for(const p of [[0,centre,end],circle(a,r,end),circle(b,r,end)])point(p,colors.hide);
          }
        }
      }else{
        const foot=floor+.65;
        solid('round',0,foot+h*.52,0,.68,h*.74,.68,colors.bronze);
        solid('ellipsoid',0,foot+h*.85,0,.68,h*.15,.68,colors.bronze);
        solid('round',0,foot+h*.09,0,.77,h*.18,.77,colors.bronze);
        box(0,foot+h+(eave-foot-h)*.5,0,.10,eave-foot-h,.10,colors.timber);
      }
      barrier(0,0,drum?diameter*.56:.77,drum?h*.50:.77);
    }
    function tablet(u,height,width,year){
      const photographed=year===1442,ru=width/2,rv=Math.min(.15,width*.14),base=floor+.33;
      const curve=photographed?height*.135:width*.28;
      // A turtle supports each tablet. Its head turns toward Thiên Quang well.
      solid('shell',u,floor+.17,0,ru*1.02,.22,width*.59,colors.granite);
      solid('shell',u,floor+.17,width*.59,ru*.30,.17,width*.27,colors.granite);
      for(const side of [-1,1])for(const end of [-1,1])
        solid('ellipsoid',u+side*ru*.79,floor+.08,end*width*.27,ru*.27,.09,width*.19,colors.granite);
      const profile=[[-ru,0],[ru,0]];
      for(let k=0;k<=10;k++){
        const a=k*Math.PI/10;
        profile.push([Math.cos(a)*ru,height-curve+curve*Math.sin(a)]);
      }
      const place=([a,b],d)=>[u+a,base+b,d];
      const mid=[0,height*.46];
      const inset=p=>[p[0]*.86,p[1]*.90+height*.045];
      for(let k=0;k<profile.length;k++){
        const a=profile[k],b=profile[(k+1)%profile.length];
        face(place(a,-rv),place(b,-rv),place(b,rv),place(a,rv),colors.granite);
        for(const p of [a,b,mid])point(place(p,-rv),colors.granite);
        if(photographed){
          // Only the 1442 stele uses Ngokhong's photograph. The sign keeps
          // the historic inscription legible from the actual viewing side.
          const right=ux*vz-uz*vx;
          for(const p of [a,b,mid])point(place(p,rv+.012),colors.granite,4,[.5+right*p[0]/width,p[1]/height]);
        }else{
          face(place(a,rv),place(b,rv),place(inset(b),rv+.012),place(inset(a),rv+.012),colors.border);
          for(const p of [inset(a),inset(b),mid])point(place(p,rv+.012),colors.granite);
        }
      }
      barrier(u,width*.09,ru,width*.66);
    }
    if(stele){
      const entries=survey.steleRows,usable=2*(U-apron);
      const gap=(usable-entries.reduce((sum,entry)=>sum+entry.width,0))/entries.length;
      let end=-usable/2+gap/2;
      entries.forEach(({year,height,width})=>{
        const u=end+width/2;
        tablet(u,height,width,year);
        stelae.push({x:x+ux*u,z:z+uz*u,year,height,width,viewAngle:Math.atan2(vx,vz)});
        end+=width+gap;
      });
    }
    return {solids,stelae,height:eave+rise+.35};
  };
}

function createTourDistrict(T,scene,plaster,structures,osmBuildings,nightLights){
  const parts=createVietnamOsmBuildings('sight-building-parts/',Infinity);
  const wall=plaster.clone();wall.vertexColors=true;wall.side=T.DoubleSide;
  const roof=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.9});
  const grain={value:null},stelePhoto={value:null},photoReady={value:0};
  function loadMonumentSurfaces(){
    if(grain.value||typeof document==='undefined')return;
    const loader=new T.TextureLoader();
    grain.value=(typeof landmarkGrain!=='undefined'&&landmarkGrain)||loader.load('streetscape/surfaces/landmark-grain.webp');
    grain.value.wrapS=grain.value.wrapT=T.RepeatWrapping;grain.value.anisotropy=4;
    stelePhoto.value=loader.load('landmark-scans/van-mieu-1442-face.webp',()=>{photoReady.value=1;});
    stelePhoto.value.colorSpace=T.SRGBColorSpace;stelePhoto.value.anisotropy=4;
  }
  roof.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{monumentGrain:grain,stelePhoto,photoReady});
    const vary='varying vec2 visitorRoofUv; varying float visitorRoofFinish;\n';
    shader.vertexShader=vary+'attribute float roofFinish;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n visitorRoofUv=uv;visitorRoofFinish=roofFinish;');
    shader.fragmentShader=vary+'uniform sampler2D monumentGrain,stelePhoto; uniform float photoReady;\n'+
      shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float naturalRelief=0.;
      if(visitorRoofFinish>2.5){
        vec2 metres=visitorRoofUv;
        vec3 grain=texture2D(monumentGrain,metres*.56).rgb-.5;
        if(abs(visitorRoofFinish-4.)<.25 && photoReady>.5){
          diffuseColor.rgb=texture2D(stelePhoto,visitorRoofUv).rgb;
        }else if(visitorRoofFinish<4.5){
          float mineral=grain.g+.32*(texture2D(monumentGrain,metres*2.3).g-.5);
          float weather=texture2D(monumentGrain,metres*.21+vec2(.16,.61)).r-.5;
          diffuseColor.rgb*=vec3(1.+.66*mineral+.29*weather);
          diffuseColor.rgb*=mix(vec3(1.),vec3(.79,.85,.72),smoothstep(-.05,.24,weather)*.52);
          naturalRelief=.004*mineral;
        }else if(visitorRoofFinish<5.5){
          diffuseColor.rgb*=1.+.50*grain.b;naturalRelief=.002*grain.b;
        }else{
          float deposit=texture2D(monumentGrain,metres*vec2(.34,.16)).r-.5;
          diffuseColor.rgb*=vec3(1.+.41*grain.r+.24*deposit);
          naturalRelief=.0035*grain.r;
        }
      }else if(visitorRoofFinish>.5){
        vec2 tile=visitorRoofUv*vec2(5.8,3.6);
        vec2 aa=max(vec2(.001),fwidth(tile));float fade=1.-smoothstep(.14,.8,max(aa.x,aa.y));
        float crest=.5+.5*cos(tile.x*6.283);
        float lip=smoothstep(.71,.95,fract(tile.y));
        if(visitorRoofFinish>1.5)lip=0.;
        diffuseColor.rgb*=1.+fade*(.24*(crest-.5)-.16*lip);
      }`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        if(visitorRoofFinish>2.5 && abs(visitorRoofFinish-4.)>.25){
          vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);
          vec3 across=cross(dy,normal),along=cross(normal,dx);
          float area=dot(dx,across);
          normal=normalize(normal-sign(area)*(across*dFdx(naturalRelief)+along*dFdy(naturalRelief))/max(abs(area),1.e-9));
        }`);
  };
  // Window bays follow the measured edge length and the floor count. Shade them
  // in the wall pass, so a dense city block costs the same two draws on a phone.
  wall.onBeforeCompile=shader=>{
    shader.uniforms.nightLights=nightLights;
    shader.vertexShader='attribute vec2 bays; attribute float openingStyle; varying float opening; varying vec2 vBays;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vBays=bays;opening=openingStyle;');
    shader.fragmentShader='uniform float nightLights; varying float opening; varying vec2 vBays;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 roomLight=vec3(0.);
      if(opening<.5)diffuseColor.rgb=mix(vec3(.72),diffuseColor.rgb,.59);
      if(vBays.x>=0.){
        vec2 p=fract(vBays),aa=clamp(fwidth(vBays),vec2(.008),vec2(.18));
        vec2 pane=smoothstep(vec2(.2,.25)-aa,vec2(.2,.25)+aa,p)*(1.-smoothstep(vec2(.8,.78)-aa,vec2(.8,.78)+aa,p));
        float frame=1.-smoothstep(.013,.013+aa.x,abs(p.x-.5));
        float reveal=smoothstep(.20,.26,p.x)*(1.-smoothstep(.69,.78,p.y));
        float light=.77+.22*sin(dot(floor(vBays),vec2(7.2,3.9)));
        vec3 glazing=mix(vec3(.056,.084,.088),vec3(.25,.36,.38),p.y)*light;
        if(opening>.5 && opening<1.5){
          float bars=1.-smoothstep(.04,.12+aa.x,abs(fract(p.x*5.)-.5));
          float rails=1.-smoothstep(.045,.13+aa.y,abs(fract(p.y*4.)-.5));
          glazing=mix(vec3(.063,.05,.035),vec3(.24,.125,.068),max(bars,rails));frame=0.;
        }else if(opening>1.5){
          float side=(p.x-.5)/.3;
          float arch=opening>2.5?sqrt(max(0.,1.-side*side)):1.-abs(side);
          pane.y*=1.-smoothstep(.55+arch*.23-aa.y,.55+arch*.23+aa.y,p.y);
        }
        float openingMask=pane.x*pane.y;
        float sill=smoothstep(.17,.20,p.x)*(1.-smoothstep(.80,.83,p.x));
        sill*=smoothstep(.19-aa.y,.22,p.y)*(1.-smoothstep(.227,.25+aa.y,p.y));
        diffuseColor.rgb*=1.-.24*sill;
        diffuseColor.rgb=mix(diffuseColor.rgb,mix(glazing*(.67+.33*reveal),vec3(.18,.17,.15),frame),openingMask);
        if(opening<.5){
          float room=fract(sin(dot(floor(vBays),vec2(17.3,41.7))+opening*230.)*4375.5);
          roomLight=mix(vec3(.48,.19,.059),vec3(.62,.47,.29),room)
                    *nightLights*smoothstep(.55,.64,room)*openingMask*reveal*(1.-.9*frame);
        }
      }`).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=roomLight;');
  };
  const palette=[0xf3e1c6,0xd3d9cc,0xe9d0bb,0xf0d9a7,0xb9c6c9,0xeae6db].map(v=>new T.Color(v));
  const roofs=[0x9f6757,0xa09a8e,0x798d92,0xaca69c].map(v=>new T.Color(v));
  const concrete=new T.Color(0x989186);
  const doorway=new T.Color(0x354647);
  let vanMieuArchitecture;
  // Each material has one draw. Reuse its CPU buffer as the view moves, and
  // hand WebGL only the populated vertices when the new district is complete.
  let indexPromise,available,grid,scale=100000,loadedGraph,signature,loaded=[],serial=0;
  const cache=new Map(),footprints=new WeakMap(),cell=32;
  async function load(graph,x,z){
    const seq=++serial;
    try{
      indexPromise??=fetch('tour-buildings/index.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();})
        .then(data=>{available=new Set(data.tiles);grid=data.grid;scale=data.scale;}).catch(e=>{indexPromise=null;throw e;});
      await indexPromise;
      const [lon,lat]=graph.geo(x,z),keys=[],reach=1100;
      for(let i=Math.floor((lon-reach/graph.mx)*grid);i<=Math.floor((lon+reach/graph.mx)*grid);i++)
        for(let j=Math.floor((lat-reach/graph.my)*grid);j<=Math.floor((lat+reach/graph.my)*grid);j++){
          const key=i+'_'+j;if(available.has(key))keys.push(key);
        }
      const next=keys.join('/');if(graph===loadedGraph&&next===signature)return false;
      const data=await Promise.all(keys.map(k=>{
        if(!cache.has(k))cache.set(k,fetchMapTile('tour-buildings/'+k+'.gz').catch(e=>{cache.delete(k);throw e;}));
        return cache.get(k);
      }));
      if(seq!==serial)return false;
      for(const k of cache.keys())if(!keys.includes(k))cache.delete(k);
      loaded=data.flat();loadedGraph=graph;signature=next;return true;
    }catch{return false;}
  }
  function decode(raw,graph){
    let lon=0,lat=0;
    const ring=[];
    for(let i=0;i<raw.length;i+=2){lon+=raw[i];lat+=raw[i+1];const p=graph.point(lon/scale,lat/scale);ring.push(new T.Vector2(p.x,p.z));}
    if(ring.length>1&&ring[0].equals(ring.at(-1)))ring.pop();
    return ring;
  }
  function projectFootprint(raw,graph,projected,survey){
    const key=survey?.rings||raw,known=projected.get(key);if(known)return known;
    const rings=survey?survey.rings.map(ring=>ring.slice(0,-1).map(([lon,lat])=>{
      const p=graph.point(lon,lat);return new T.Vector2(p.x,p.z);
    })):raw.map(r=>decode(r,graph)).filter(r=>r.length>=3);
    if(!rings.length)return null;
    let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
    for(const p of rings[0]){minX=Math.min(minX,p.x);minZ=Math.min(minZ,p.y);maxX=Math.max(maxX,p.x);maxZ=Math.max(maxZ,p.y);}
    const shape={rings,box:{minX,minZ,maxX,maxZ},flat:rings.flat()};
    projected.set(key,shape);
    return shape;
  }
  function createView(parent){
  const group=new T.Group();group.name='OSM building footprints';parent.add(group);
  const batches=[wall,roof].map(mat=>({mat,stride:mat===wall?14:12,data:new Float32Array(0),used:0,curved:[]}));
  const cells=new Map(),blocks=new Map(),streetFronts=[];
  function contact(x,z,r){
    let hit;
    for(const b of cells.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){
      if(b.bottom>2.2)continue;
      if(x<b.minX-r||z<b.minZ-r||x>b.maxX+r||z>b.maxZ+r)continue;
      for(const rings of b.solids||[b.rings]){
        let inside=false,min=Infinity,px,pz;
        for(const ring of rings){
          for(let j=0,k=ring.length-1;j<ring.length;k=j++){
            const a=ring[k],c=ring[j],dx=c.x-a.x,dz=c.y-a.y;
            if((a.y>z)!==(c.y>z)&&x<a.x+(z-a.y)*dx/dz)inside=!inside;
            const f=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz||1)));
            const xx=a.x+f*dx,zz=a.y+f*dz,d=(x-xx)**2+(z-zz)**2;
            if(d<min){min=d;px=xx;pz=zz;}
          }
        }
        const d=Math.sqrt(min),depth=r+(inside?d:-d);
        if(depth<=0||hit&&hit.depth>=depth)continue;
        const dir=inside?-1:1;
        hit={nx:d?dir*(x-px)/d:1,nz:d?dir*(z-pz)/d:0,depth,pointX:px,pointZ:pz,height:b.h,kind:'building',id:b.id};
      }
    }
    return hit;
  }
  function insideRing(x,z,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  }
  function insideBuilding(x,z,rings){
    if(!insideRing(x,z,rings[0]))return false;
    for(let i=1;i<rings.length;i++)if(insideRing(x,z,rings[i]))return false;
    return true;
  }
  function overlapsModel(landmarks,rings,box){
    if(!landmarks)return false;
    for(const {ring:area,bounds} of landmarks.buildingAreas){
      if(box.maxX<bounds.min.x||box.minX>bounds.max.x||box.maxZ<bounds.min.y||box.minZ>bounds.max.y)continue;
      if(insideRing(rings[0][0].x,rings[0][0].y,area)||insideBuilding(area[0].x,area[0].y,rings))return true;
      for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i],dx=b.x-a.x,dz=b.y-a.y;
        for(let k=0,l=area.length-1;k<area.length;l=k++){
          const p=area[l],q=area[k],ex=q.x-p.x,ez=q.y-p.y,det=dx*ez-dz*ex;
          if(Math.abs(det)<1e-8)continue;
          const px=p.x-a.x,pz=p.y-a.y,t=(px*ez-pz*ex)/det,u=(px*dz-pz*dx)/det;
          if(t>=0&&t<=1&&u>=0&&u<=1)return true;
        }
      }
    }
    return false;
  }
  function overlapsGarden(landmarks,rings,box){
    for(const {x,z,r} of landmarks?.gardens||[]){
      if(x+r<box.minX||x-r>box.maxX||z+r<box.minZ||z-r>box.maxZ)continue;
      if(insideBuilding(x,z,rings))return true;
      for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i],dx=b.x-a.x,dz=b.y-a.y;
        const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz||1)));
        if((a.x+t*dx-x)**2+(a.y+t*dz-z)**2<=r*r)return true;
      }
    }
    return false;
  }
  function overlapsMapped(rings,box){
    const seen=new Set();
    for(let i=Math.floor(box.minX/cell);i<=Math.floor(box.maxX/cell);i++){
      for(let j=Math.floor(box.minZ/cell);j<=Math.floor(box.maxZ/cell);j++){
        for(const b of cells.get(i+','+j)||[]){
          if(!b.surveyed||seen.has(b))continue;
          seen.add(b);
          const left=Math.max(box.minX,b.minX),right=Math.min(box.maxX,b.maxX);
          const top=Math.max(box.minZ,b.minZ),bottom=Math.min(box.maxZ,b.maxZ);
          if(right-left<.6||bottom-top<.6)continue;
          const area=Math.min((box.maxX-box.minX)*(box.maxZ-box.minZ),(b.maxX-b.minX)*(b.maxZ-b.minZ));
          if((right-left)*(bottom-top)<area*.18)continue;
          let same=0;
          for(const u of [.2,.5,.8])for(const v of [.2,.5,.8]){
            const x=left+(right-left)*u,z=top+(bottom-top)*v;
            if(insideBuilding(x,z,rings)&&insideBuilding(x,z,b.rings))same++;
          }
          if(same>=3)return true;
        }
      }
    }
    return false;
  }
  function clear(){
    for(const mesh of [...group.children]){group.remove(mesh);mesh.geometry.dispose();}
    cells.clear();blocks.clear();streetFronts.length=0;
  }
  function* buildSteps(graph,cx,cz,landmarks,ground=()=>0,edges=[],openGround=()=>false,radius=620,terrainRevision,memorialAt=()=>false){
    clear();if(!graph)return;
    const pieces=parts.rows(graph,cx,cz);
    const replaced=new Set(pieces.flatMap(row=>[row[6]?.parent,row[6]?.sourceId]).filter(Boolean));
    const shells=[...(graph===loadedGraph?loaded:[]),...osmBuildings.rows(graph,cx,cz)];
    const surveyed=[...pieces,...shells.filter(row=>!replaced.has(row[0]))];
    const monument=window.VanMieuSurvey;
    if(monument?.byRef){
      const anchor=graph.point(...monument.origin);
      if(Math.hypot(anchor.x-cx,anchor.z-cz)<radius+400){
        const mapped=new Set(surveyed.map(row=>row[0]));
        // Some independently mapped gates have no building tag in the national
        // tile. Use the original geometry for the architectural survey itself.
        for(const f of monument.features){
          if(mapped.has(f.ref)||(!f.steleRows&&!vanMieuArchitectureRefs.has(f.ref)))continue;
          const [lon,lat]=f.rings[0][0];
          surveyed.push([f.ref,'temple',0,0,[[Math.round(lon*scale),Math.round(lat*scale)]],'']);
        }
      }
    }
    const extra=structures.rows(graph,cx,cz);
    // Satellite outlines can be displaced onto a carriageway. Only index the
    // road segments close enough to test a footprint in this view.
    const roadCells=new Map(),roadCell=48;
    let roadSegments=0;
    for(const edge of edges)for(let n=1;n<edge.points.length;n++){
      if((++roadSegments&63)===0)yield;
      const a=edge.points[n-1],b=edge.points[n],w=worldRoadHalfWidth(edge),dx=b.x-a.x,dz=b.z-a.z;
      const segment={a,dx,dz,length2:dx*dx+dz*dz,w};
      const margin=w+18;
      const left=Math.max(cx-850,Math.min(a.x,b.x)-margin),right=Math.min(cx+850,Math.max(a.x,b.x)+margin);
      const top=Math.max(cz-850,Math.min(a.z,b.z)-margin),bottom=Math.min(cz+850,Math.max(a.z,b.z)+margin);
      for(let i=Math.floor(left/roadCell);i<=Math.floor(right/roadCell);i++)for(let j=Math.floor(top/roadCell);j<=Math.floor(bottom/roadCell);j++){
        const key=i+','+j;if(!roadCells.has(key))roadCells.set(key,[]);
        roadCells.get(key).push(segment);
      }
    }
    function obstructsRoad(rings,box,x,z){
      const seen=new Set();
      for(let i=Math.floor(box.minX/roadCell);i<=Math.floor(box.maxX/roadCell);i++){
        for(let j=Math.floor(box.minZ/roadCell);j<=Math.floor(box.maxZ/roadCell);j++){
          for(const s of roadCells.get(i+','+j)||[]){
            if(seen.has(s)||!s.length2)continue;
            seen.add(s);
            const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.length2));
            const px=s.a.x+t*s.dx,pz=s.a.z+t*s.dz;
            const len=Math.sqrt(s.length2);
            for(const offset of [0,-s.w*.65,s.w*.65]){
              if(insideBuilding(px-offset*s.dz/len,pz+offset*s.dx/len,rings))return true;
            }
          }
        }
      }
      return false;
    }
    for(const b of batches){
      if(b.used < b.data.length/4)b.data=new Float32Array(b.used);
      b.used=0;b.curved.length=0;
    }
    let baseY=0,opening=0,facadeSeed=0;
    function vertex(b,x,y,z,u,v,tint,finish=0,bay=-1,floor=0,normal){
      const i=b.used;
      if(i+b.stride>b.data.length){
        const next=new Float32Array(Math.max(b.stride*256,b.data.length*2));
        next.set(b.data);b.data=next;
      }
      const data=b.data;
      data[i]=x-cx;data[i+1]=baseY+y;data[i+2]=z-cz;
      // The normal pass fills planar sections after the geometry is complete.
      if(normal){
        data[i+3]=normal[0];data[i+4]=normal[1];data[i+5]=normal[2];
        const run=b.curved.at(-1);
        if(run&&run[1]===i)run[1]+=b.stride;
        else b.curved.push([i,i+b.stride]);
      }
      data[i+6]=u;data[i+7]=v;
      data[i+8]=tint.r;data[i+9]=tint.g;data[i+10]=tint.b;
      if(b.mat===wall){
        data[i+11]=opening+facadeSeed;data[i+12]=bay;data[i+13]=floor;
      }else data[i+11]=finish;
      b.used+=b.stride;
    }
    function quad(b,a,c,lo,hi,tint,count,floors){
      const u=a.distanceTo(c)/5,lowFloor=Math.max(0,lo)/hi*floors;
      const left=count?0:-1,right=count||-1;
      vertex(b,a.x,lo,a.y,0,lo/4,tint,0,left,lowFloor);
      vertex(b,c.x,lo,c.y,u,lo/4,tint,0,right,lowFloor);
      vertex(b,a.x,hi,a.y,0,hi/4,tint,0,left,floors);
      vertex(b,c.x,lo,c.y,u,lo/4,tint,0,right,lowFloor);
      vertex(b,c.x,hi,c.y,u,hi/4,tint,0,right,floors);
      vertex(b,a.x,hi,a.y,0,hi/4,tint,0,left,floors);
    }
    // Fit a shaded doorway to the street-facing wall of a narrow low-rise.
    // The outline and height are mapped; the shutter and canopy are scenery.
    function streetFront(outer,h,tint,seed,zone){
      let best=null,bestGap=18;
      for(let i=0;i<outer.length;i++){
        const a=outer[i],b=outer[(i+1)%outer.length],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz);
        if(len<2.5||len>15)continue;
        const x=(a.x+b.x)/2,z=(a.y+b.y)/2;
        for(const s of roadCells.get(Math.floor(x/roadCell)+','+Math.floor(z/roadCell))||[]){
          if(!s.length2)continue;
          const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.length2));
          const rx=s.a.x+t*s.dx-x,rz=s.a.z+t*s.dz-z,dist=Math.hypot(rx,rz),gap=dist-s.w;
          if(gap<1.1||gap>=bestGap||Math.abs(dx*rx+dz*rz)>.45*len*dist)continue;
          let nx=-dz/len,nz=dx/len;
          if(nx*rx+nz*rz<0){nx=-nx;nz=-nz;}
          if(insideRing(x+nx*.2,z+nz*.2,outer))continue;
          best={x,z,nx,nz,ux:dx/len,uz:dz/len,half:Math.min(len*.43,3.2)};bestGap=gap;
        }
      }
      if(!best)return;
      const {x,z,nx,nz,ux,uz,half}=best,top=Math.min(2.8,h*.77);
      const panel=(lo,hi,back,front,col,left=-half,right=half)=>{
        for(const [u,y,d] of [[left,lo,back],[right,lo,back],[right,hi,front],[left,lo,back],[right,hi,front],[left,hi,front]])
          vertex(batches[1],x+ux*u+nx*d,y,z+uz*u+nz*d,0,0,col);
      };
      if(seed%3===0){
        panel(.12,top,.06,.06,concrete);
        for(let y=.25;y<top;y+=.22)panel(y,y+.028,.075,.075,tint);
      }else{
        panel(.12,top,.06,.06,doorway);
        for(let u=-half+.4;u<half-.1;u+=1.3)panel(.12,top,.08,.08,concrete,u,u+.055);
        panel(top*.78,top*.78+.065,.08,.08,concrete);
      }
      panel(top+.22,top,.07,.84,tint);
      if(h>=6.4&&seed%4!==0){
        panel(3.25,3.25,.06,.90,concrete);panel(3.13,3.25,.90,.90,concrete);
        panel(3.28,3.60,.87,.87,concrete);panel(4.09,4.15,.87,.87,tint);
        for(const u of [-half,0,half-.055])panel(3.55,4.12,.87,.87,tint,u,u+.055);
      }
      if(zone)streetFronts.push({x:x-cx,y:baseY,z:z-cz,nx,nz,ux,uz,half,top,h,seed,zone});
    }
    const ids=new Set(),surveyedIds=new Set(surveyed.map(row=>row[0]));
    if(!footprints.has(graph))footprints.set(graph,new WeakMap());
    const projected=footprints.get(graph);
    const [lon,lat]=graph.geo(cx,cz);
    const pins=VietnamTourism.nearby(lon,lat,720/graph.mx,720/graph.my)
      .filter(p=>p.id.startsWith('osm-node-')&&p.kind==='Công trình tín ngưỡng')
      .map(site=>({...graph.point(site.lon,site.lat),site}));
    let rowIndex=0;
    for(const [id,kind,tagH,levels,raw,shape,part] of [...surveyed,...extra]){
      if((rowIndex++ & 3)===0)yield;
      if(ids.has(id)||landmarks?.modeledBuildings.has(id))continue;
      const first=graph.point(raw[0][0]/scale,raw[0][1]/scale);
      if(Math.abs(first.x-cx)>850||Math.abs(first.z-cz)>850)continue;
      const survey=monument?.byRef?.get(id);
      // The upper gate storey is already drawn on this mapped outline by
      // the native main gate. A future national building tile may include it.
      if(survey&&id==='w702185142'&&surveyedIds.has('w702185143'))continue;
      const outline=projectFootprint(raw,graph,projected,survey);if(!outline)continue;
      const {rings,box,flat}=outline,outer=rings[0],{minX,minZ,maxX,maxZ}=box;
      const x=(minX+maxX)/2,z=(minZ+maxZ)/2;
      if(Math.hypot(x-cx,z-cz)>radius+Math.hypot(maxX-minX,maxZ-minZ)/2)continue;
      const original=surveyedIds.has(id);
      if(overlapsModel(landmarks,rings,box))continue;
      const visitorArea=overlapsGarden(landmarks,rings,box)||memorialAt(x,z);
      if(!original){
        if(visitorArea||outer.some(p=>openGround(p.x,p.y))||(openGround(x,z)&&insideBuilding(x,z,rings)))continue;
        if(overlapsMapped(rings,box)||obstructsRoad(rings,box,x,z))continue;
      }
      ids.add(id);
      // Keep floors level, and seat the plinth against the terrain around the
      // entire footprint, including courtyard edges and long downhill walls.
      if(terrainRevision===undefined||outline.terrainRevision!==terrainRevision){
        let foundation=ground(x,z);
        outline.profiles=rings.map(ring=>ring.map((a,j)=>{
          const c=ring[(j+1)%ring.length],steps=Math.max(1,Math.ceil(a.distanceTo(c)/12)),samples=[];
          for(let k=0;k<steps;k++){
            const t=k/steps,px=a.x+(c.x-a.x)*t,pz=a.y+(c.y-a.y)*t,h=ground(px,pz);
            foundation=Math.max(foundation,h);samples.push({x:px,z:pz,h});
          }
          return samples;
        }));
        outline.foundation=foundation;outline.terrainRevision=terrainRevision;
      }
      baseY=outline.foundation+(survey?.platformHeight||0);
      const profiles=outline.profiles;
      let seed=0;for(let i=0;i<id.length;i++)seed=(Math.imul(seed,31)+id.charCodeAt(i))>>>0;
      const warehouse=/warehouse|industrial|shed|garage|roof|barn/.test(kind);
      facadeSeed=(seed%997)/2493;
      const ref='osm-'+(id[0]==='w'?'way':'relation')+'-'+id.slice(1).split(':')[0];
      const pin=original&&pins.find(p=>p.x>=minX&&p.x<=maxX&&p.z>=minZ&&p.z<=maxZ&&insideBuilding(p.x,p.z,rings));
      const site=original&&(VietnamTourism.byId.get(ref)||pin?.site);
      const tagged=original&&(window.VietnamSightDetails?.[ref]||window.VietnamSightDetails?.[pin?.site.id]);
      const historicRoof=survey?.kind==='steleHouse'||survey?.kind==='stelePavilion'||survey?.kind==='wing'||
        ['w702185144','w702185176','w702185189','w702241326'].includes(id);
      let detail=part?{...tagged,...part}:tagged;
      if(historicRoof)detail={...detail,building:'temple','roof:material':'roof_tiles'};
      if(survey?.roofColour)detail={...detail,'roof:colour':survey.roofColour};
      const use=detail?.building||kind,faith=detail?.religion;
      const label=site?.name||'';
      opening=use==='temple'||['buddhist','vietnamese_folk','chinese_folk','Phật_Giáo'].includes(faith)||/^(chùa|đền|đình|miếu)\s/iu.test(label)?1:
        /church|cathedral|chapel/.test(use)||faith==='christian'||/^nhà thờ\s/iu.test(label)?2:use==='mosque'||faith==='muslim'?3:0;
      // A mapped outline establishes that a building exists. In visitor grounds
      // an unclassified outline is insufficient evidence for a house or a shop.
      const unclassified=visitorArea&&!opening&&!part&&(use==='yes'||use==='building');
      const bottom=part?.min_height||part?.['building:min_level']*3.3||0;
      const rise=parseFloat(detail?.['roof:height'])||detail?.['roof:levels']*3.3;
      const fallbackHeight=warehouse?5.4:3.7+(unclassified?0:seed%3*3);
      const h=Math.min(850,Math.max(bottom+.3,2,tagH||parseFloat(detail?.height)||(levels&&levels*3.3+(part&&rise||0))||structures.heightAt(graph,x,z)||fallbackHeight));
      const b={id,h,bottom,baseY,parent:part?.parent,rings,...box,surveyed:original};
      const block=Math.floor(x/70)+','+Math.floor(z/70);blocks.set(block,(blocks.get(block)||0)+1);
      for(let i=Math.floor((minX-12)/cell);i<=Math.floor((maxX+12)/cell);i++)for(let j=Math.floor((minZ-12)/cell);j<=Math.floor((maxZ+12)/cell);j++){
        const key=i+','+j;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(b);
      }
      if(survey&&(survey.steleRows||vanMieuArchitectureRefs.has(id))){
        loadMonumentSurfaces();
        vanMieuArchitecture??=createVanMieuArchitecture(T);
        const built=vanMieuArchitecture(survey,outer,graph,(px,py,pz,u,v,tint,finish,normal)=>
          vertex(batches[1],px,py,pz,u,v,tint,finish,-1,0,normal));
        b.h=built.height;b.solids=built.solids;b.stelae=built.stelae;continue;
      }
      const [bLon,bLat]=graph.geo(x,z),zone=window.CentralStreetscapes?.zoneAt(bLon,bLat);
      const zWalls=zone?zone.walls:null,zRoofs=zone?zone.roofs:null;
      const roofColor=detail?.['roof:colour']?new T.Color(detail['roof:colour']):zRoofs?new T.Color(zRoofs[opening===1?0:seed%zRoofs.length]):roofs[opening===1?0:seed%roofs.length];
      const base=detail?.['building:colour']?new T.Color(detail['building:colour']):detail?.['building:material']==='wood'?new T.Color(0x99765a):zWalls?new T.Color(zWalls[seed%zWalls.length]):palette[seed%palette.length];
      if(!part&&!opening&&!unclassified&&Math.hypot(x-cx,z-cz)<185&&h>=3&&h<17&&maxX-minX<32&&maxZ-minZ<32&&
        /^(yes|residential|house|terrace|apartments|retail|commercial|building)$/.test(kind))streetFront(outer,h,roofColor,seed,zone);
      let eave=h;
      const lowRiseRoof=!part&&!unclassified&&h<(zone?.forcePitched?10.5:7.2)&&(warehouse||zone?.forcePitched||seed%5<2)?'gabled':null;
      const roofShape=shape||detail?.['roof:shape']||(opening===1?'hipped':opening===2?'gabled':lowRiseRoof);
      const pitched=['hipped','gabled','pyramidal','hipped-and-gabled','side_hipped','round','skillion','onion','dome','saltbox','mansard'].includes(roofShape);
      const visitorRoof=original&&(site||opening||part||shape)&&pitched&&buildVisitorRoof(T,rings,roofShape,h,
        rise,roofColor,base,([px,py,pz],[u,v],tint,tiles)=>{
          const finish=tiles&&(/metal/.test(detail?.['roof:material'])?2:opening===1||detail?.['roof:material']==='roof_tiles'?1:0);
          vertex(batches[1],px,py,pz,u,v,tint,Number(finish));
        },opening===1,detail,bottom);
      if(visitorRoof){
        eave=visitorRoof;
      }else if(rings.length===1&&outer.length===4&&pitched){
        const start=outer[0].distanceTo(outer[1])>=outer[1].distanceTo(outer[2])?0:1;
        const [a,c,d,f]=Array.from({length:4},(_,i)=>outer[(start+i)%4]);
        eave=h-Math.min(h*.25,3,a.distanceTo(f)*.25);
        const l=a.clone().lerp(f,.5),r=c.clone().lerp(d,.5);
        const inset=roofShape==='gabled'?0:roofShape==='pyramidal'?.5:.2;
        const highL=l.clone().lerp(r,inset),highR=r.clone().lerp(l,inset);
        for(const tri of [[a,c,highR],[a,highR,highL],[f,highL,highR],[f,highR,d],[f,a,highL],[c,d,highR]]){
          for(const p of tri)vertex(batches[1],p.x,p===highL||p===highR?h:eave,p.y,0,0,roofColor);
        }
      }else{
        outline.triangles??=T.ShapeUtils.triangulateShape(outer,rings.slice(1));
        for(const tri of outline.triangles)for(const index of [tri[0],tri[2],tri[1]]){
          const p=flat[index];vertex(batches[1],p.x,h,p.y,0,0,roofColor);
        }
      }
      if(bottom>0){
        outline.triangles??=T.ShapeUtils.triangulateShape(outer,rings.slice(1));
        for(const tri of outline.triangles)for(const k of tri){
          const p=flat[k];vertex(batches[1],p.x,bottom,p.y,0,0,concrete);
        }
      }
      if(use==='roof'){
        // A mapped roof covers open ground. Only its supports obstruct the car.
        b.solids=[];
        const fascia=bottom>0?Math.max(bottom,eave-.22):eave-.22;
        for(const ring of rings)for(let j=0;j<ring.length;j++){
          const a=ring[j],c=ring[(j+1)%ring.length];
          quad(batches[0],a,c,fascia,eave,roofColor,0,0);
          if(bottom>0)continue;
          const spans=Math.max(1,Math.ceil(a.distanceTo(c)/12));
          for(let k=0;k<spans;k++){
            const p=a.clone().lerp(c,k/spans),r=.16;
            const post=[[-r,-r],[r,-r],[r,r],[-r,r]].map(([u,v])=>new T.Vector2(p.x+u,p.y+v));
            const foot=ground(p.x,p.y)-baseY-.22;
            for(let n=0;n<4;n++)quad(batches[0],post[n],post[(n+1)%4],foot,eave,concrete,0,0);
            b.solids.push([post]);
          }
        }
        continue;
      }
      for(let ri=0;ri<rings.length;ri++)for(let j=0;j<rings[ri].length;j++){
        const ring=rings[ri],profile=profiles[ri];
        const a=ring[j],c=ring[(j+1)%ring.length],length=a.distanceTo(c);
        if(length<.2)continue;
        const count=warehouse||unclassified?0:Math.floor(length/(opening?3.8:2.85)),floors=opening?Math.max(1,levels||1):Math.max(1,Math.round(h/3.3));
        const samples=profile[j],next=profile[(j+1)%ring.length][0],wallBatch=batches[0];
        if(bottom>0){quad(wallBatch,a,c,bottom,Math.max(bottom,eave),base,count,floors);continue;}
        // On nearly level blocks the wall itself can reach beneath the grass.
        if(samples.every(p=>baseY-p.h<.16)&&baseY-next.h<.16){
          quad(wallBatch,a,c,-.39,eave,base,count,floors);continue;
        }
        quad(wallBatch,a,c,0,eave,base,count,floors);
        for(let k=0;k<samples.length;k++){
          const l=samples[k],r=samples[k+1]||profile[(j+1)%ring.length][0];
          // The grass mesh sits 17 cm below the nominal ground.
          const lowL=l.h-baseY-.22,lowR=r.h-baseY-.22;
          for(const [p,y] of [[l,lowL],[r,lowR],[l,0],[r,lowR],[r,0],[l,0]]){
            vertex(wallBatch,p.x,y,p.z,Math.hypot(p.x-a.x,p.z-a.y)/5,y/4,concrete);
          }
        }
      }
    }
    for(const b of batches){
      if(!b.used)continue;
      const data=b.data.subarray(0,b.used);
      let run=0;
      const writePlanar=(start,end)=>{
        if(start>=end)return;
        const chunk=data.subarray(start,end);writeFlatNormals(chunk,chunk,b.stride,3);
      };
      for(let start=0;start<data.length;start+=b.stride*1536){
        const end=Math.min(data.length,start+b.stride*1536);
        let cursor=start;
        while(run<b.curved.length&&b.curved[run][0]<end){
          const [lo,hi]=b.curved[run];writePlanar(cursor,lo);cursor=hi;
          if(hi>end)break;
          run++;
        }
        writePlanar(cursor,end);yield;
      }
      const buffer=new T.InterleavedBuffer(data,b.stride),g=new T.BufferGeometry();
      const attribute=(size,offset)=>new T.InterleavedBufferAttribute(buffer,size,offset);
      g.setAttribute('position',attribute(3,0));g.setAttribute('normal',attribute(3,3));
      g.setAttribute('uv',attribute(2,6));g.setAttribute('color',attribute(3,8));
      g.setAttribute(b.mat===wall?'openingStyle':'roofFinish',attribute(1,11));
      if(b.mat===wall)g.setAttribute('bays',attribute(2,12));
      const mesh=new T.Mesh(g,b.mat);mesh.receiveShadow=true;mesh.castShadow=true;group.add(mesh);
    }
  }
  function footprint(site,x,z){
    const id=site.map?.match(/\/(way|relation)\/(\d+)$/);
    const near=cells.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[];
    if(id){
      const key=id[1][0]+id[2],match=near.find(b=>b.id.split(':')[0]===key||b.parent?.split(':')[0]===key);
      if(match)return match;
    }
    if(!['Công trình tín ngưỡng','Bảo tàng','Kiến trúc','Phòng trưng bày'].includes(site.kind))return null;
    return near.find(b=>b.surveyed&&insideBuilding(x,z,b.rings));
  }
  function footprintViews(b,x,z,approachX,approachZ,ground){
    const ring=b.rings[0],extent=Math.hypot(b.maxX-b.minX,b.maxZ-b.minZ);
    const cx=(b.maxX+b.minX)/2,cz=(b.maxZ+b.minZ)/2,faces=[];
    // A mapped ring can be concave or wound in either direction. Sample just
    // beyond each wall before accepting its outward normal.
    for(let i=0;i<ring.length;i++){
      const a=ring[i],v=ring[(i+1)%ring.length],dx=v.x-a.x,dz=v.y-a.y,len=Math.hypot(dx,dz);
      if(len<1.3)continue;
      const mx=(a.x+v.x)/2,mz=(a.y+v.y)/2;
      let nx=dz/len,nz=-dx/len;
      if(insideBuilding(mx+nx*.15,mz+nz*.15,b.rings)){nx=-nx;nz=-nz;}
      const ax=approachX-mx,az=approachZ-mz;
      faces.push({mx,mz,nx,nz,len,priority:len/Math.max(1,extent)+
        .6*(nx*ax+nz*az)/Math.max(1,Math.hypot(ax,az))});
    }
    if(!faces.length)return null;
    faces.sort((a,b)=>b.priority-a.priority);
    const candidates=faces.slice(0,16);
    function pick(close){
      let best=null;
      for(const face of candidates){
        const {mx,mz,nx,nz,len}=face,tx=close?mx:cx,tz=close?mz:cz;
        const height=close?b.h*.87:b.h;
        const targetY=b.baseY+height*.46;
        const run=close?Math.max(10,b.h*1.38,Math.min(36,len)*.98):
          Math.max(18,extent*1.15,b.h*1.60);
        const eyeX=tx+nx*run,eyeZ=tz+nz*run;
        if(insideBuilding(eyeX,eyeZ,b.rings))continue;
        let slope=close?.15:.36;
        // Find the lowest unobstructed ray from the wall or overview target.
        // Heights share the same terrain datum as the rendered district.
        const steps=Math.min(100,Math.ceil(run/1.8));
        for(let step=1;step<=steps;step++){
          const along=run*step/steps,px=tx+nx*along,pz=tz+nz*along;
          let ceiling=ground(px,pz)+1;
          const near=cells.get(Math.floor(px/cell)+','+Math.floor(pz/cell))||[];
          for(const other of near){
            if((other.id!==b.id||close)&&insideBuilding(px,pz,other.rings))ceiling=Math.max(ceiling,other.baseY+other.h+.8);
          }
          slope=Math.max(slope,(ceiling-targetY)/along);
        }
        const score=face.priority-4*slope;
        if(best&&score<=best.score)continue;
        const compass=['nam','đông nam','đông','đông bắc','bắc','tây bắc','tây','tây nam'];
        const angle=Math.atan2(nx,nz),side=compass[(Math.round(angle/(Math.PI/4))+8)%8];
        const elevation=Math.atan(slope);
        best={score,view:{name:close?'Mặt công trình phía '+side:'Toàn cảnh công trình',
          offset:[tx-x,tz-z],height,focusAltitude:targetY,viewAngle:angle,viewElevation:elevation,viewRadius:run/Math.cos(elevation)}};
      }
      return best?.view;
    }
    const overview=pick(false),detail=pick(true);
    return overview&&detail?[overview,detail]:null;
  }
  return {group,clear,buildSteps,build(...args){for(const step of buildSteps(...args)){}},contact,footprint,footprintViews,overlapsSight:(landmarks,rings,box)=>overlapsModel(landmarks,rings,box)||overlapsGarden(landmarks,rings,box),
    streetFronts,builtUp:(x,z)=>cells.has(Math.floor(x/cell)+','+Math.floor(z/cell)),
    mappedBlock:(x,z)=>(blocks.get(Math.floor(x/70)+','+Math.floor(z/70))||0)>=3};
  }
  return {...createView(scene),createView,load:async(g,x,z)=>(await Promise.all([load(g,x,z),parts.load(g,x,z)])).some(Boolean)};
}
