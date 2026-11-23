'use strict';
// The structures stay level. Only their bedding, perimeter walls and garden walk
// follow the sampled relief. Coordinates and heights here are in landmark space.
function createTempleFoundations(T,{group,vertexCount,place}){
  const fixtures=[],walls=[],tops=[],flights=[],walks=[],walkEdges=[];
  function fixture(elevation,build,moved){
    const start=vertexCount();build();
    const anchor={elevation,start,end:vertexCount(),height:0,moved};
    fixtures.push(anchor);return anchor;
  }
  function cornersAt(x,z,w,d,yaw){
    const c=Math.cos(yaw),s=Math.sin(yaw);
    return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[x+c*u*w/2+s*v*d/2,z-s*u*w/2+c*v*d/2]);
  }
  function skirt(x,z,w,d,top,anchor,yaw=0){
    const corners=cornersAt(x,z,w,d,yaw);
    for(let side=0;side<4;side++){
      const [ax,az]=corners[side],[bx,bz]=corners[(side+1)%4],length=Math.hypot(bx-ax,bz-az);
      const count=Math.ceil(length/2);
      for(let i=0;i<count;i++)walls.push({
        ax:ax+(bx-ax)*i/count,az:az+(bz-az)*i/count,
        bx:ax+(bx-ax)*(i+1)/count,bz:az+(bz-az)*(i+1)/count,top,anchor,u:i*length/count,v:(i+1)*length/count
      });
    }
  }
  function building(x,z,yaw,w,d,build){
    const corners=cornersAt(x,z,w,d,yaw);
    let parts=[];
    const anchor=fixture(ground=>Math.max(ground(x,z),...corners.map(([px,pz])=>ground(px,pz))),()=>{
      parts=place(x,z,yaw,build).map(mesh=>({mesh,y:mesh.position.y}));
    },height=>{for(const part of parts)part.mesh.position.y=part.y+height;});
    skirt(x,z,w,d,.06,anchor,yaw);
    tops.push({corners,anchor});
    return anchor;
  }
  // A flight starts on a level landing and ends on the sampled path. The
  // outer cheek of each tread reaches the slope independently on both sides.
  function stairs(anchor,x,z,endX,endZ,width,top,count){
    const dx=endX-x,dz=endZ-z,length=Math.hypot(dx,dz);
    const sideX=dz*width/(2*length),sideZ=-dx*width/(2*length);
    for(let i=0;i<count;i++){
      const a=i/count,b=(i+1)/count,ax=x+dx*a,az=z+dz*a,bx=x+dx*b,bz=z+dz*b;
      flights.push({anchor,top,endX,endZ,a,b,corners:[
        [ax-sideX,az-sideZ],[ax+sideX,az+sideZ],[bx+sideX,bz+sideZ],[bx-sideX,bz-sideZ]]});
    }
  }
  function walk(width,depth,cx=0,cz=0){
    const count=Math.ceil(depth/2),cols=Math.ceil(width/2.5);
    for(let j=0;j<count;j++)for(let i=0;i<cols;i++){
      const z0=cz+(j/count-.5)*depth,z1=cz+((j+1)/count-.5)*depth,x0=cx+(i/cols-.5)*width,x1=cx+((i+1)/cols-.5)*width;
      walks.push([x0,z0,x0,z1,x1,z1,x0,z0,x1,z1,x1,z0]);
      if(i===0)walkEdges.push([x0,z1,x0,z0]);
      if(i===cols-1)walkEdges.push([x1,z0,x1,z1]);
      if(j===0)walkEdges.push([x0,z0,x1,z0]);
      if(j===count-1)walkEdges.push([x1,z1,x0,z1]);
    }
  }
  let support,body,rest;
  group.userData.fitGround=ground=>{
    // VietnamLandmarks seals its baked draw-call mesh after the builders run.
    if(!body){
      body=group.children[group.children.length-1].geometry;
      const p=body.getAttribute('position');rest=Float32Array.from({length:p.count},(_,i)=>p.getY(i));
      const count=(walls.length+tops.length+walks.length+walkEdges.length+flights.length*4)*6;
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3));
      g.setAttribute('uv',new T.BufferAttribute(new Float32Array(count*2),2));
      const material=new T.MeshStandardMaterial({color:0x827e71,roughness:.94});
      material.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec2 blockUV;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nblockUV=uv;');
        shader.fragmentShader='varying vec2 blockUV;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec2 p=blockUV/vec2(.92,.34);p.x+=.5*mod(floor(p.y),2.);
          vec2 joint=min(fract(p),1.-fract(p)),aa=max(fwidth(p),vec2(.001));
          vec2 face=smoothstep(vec2(.013)-aa*.5,vec2(.013)+aa*.5,joint);
          float grain=fract(sin(dot(floor(p),vec2(9.71,75.3)))*35485.76);
          diffuseColor.rgb*=mix(.69,.91+.13*grain,face.x*face.y);`);
      };
      support=new T.Mesh(g,material);support.name='Retaining stonework';support.castShadow=true;support.receiveShadow=true;group.add(support);
      support.userData.shoreCover=true;
    }
    const points=body.getAttribute('position');let moved=false;
    for(const f of fixtures){
      const height=f.elevation(ground);
      if(Math.abs(height-f.height)<.0001)continue;
      for(let i=f.start;i<f.end;i++)points.setY(i,rest[i]+height);
      f.height=height;f.moved?.(height);moved=true;
    }
    if(moved){points.needsUpdate=true;body.computeBoundingSphere();body.computeBoundingBox();group.userData.height=body.boundingBox.max.y;}
    const g=support.geometry,positions=g.getAttribute('position'),uv=g.getAttribute('uv');
    let i=0,changed=g.boundingSphere===null;
    function vertex(x,y,z,u,v){
      if(Math.abs(positions.getY(i)-y)>.0001)changed=true;
      positions.setXYZ(i,x,y,z);uv.setXY(i,u,v);i++;
    }
    for(const wall of walls){
      const {ax,az,bx,bz,u,v}=wall,top=wall.anchor.height+wall.top;
      // Slight overlap at both ends closes the seam when ground triangles break
      // across a side. Buried portions are naturally occluded by the ground.
      const lowA=Math.min(top-.04,ground(ax,az)-.25),lowB=Math.min(top-.04,ground(bx,bz)-.25);
      vertex(ax,top,az,u,top);vertex(bx,top,bz,v,top);vertex(ax,lowA,az,u,lowA);
      vertex(bx,top,bz,v,top);vertex(bx,lowB,bz,v,lowB);vertex(ax,lowA,az,u,lowA);
    }
    for(const {corners,anchor} of tops)for(const k of [0,2,1,0,3,2]){
      const [x,z]=corners[k];vertex(x,anchor.height+.055,z,x,z);
    }
    for(const {anchor,top,endX,endZ,a,b,corners} of flights){
      const start=anchor.height+top,end=ground(endX,endZ)+.025;
      const height=start+(end-start)*a,lip=start+(end-start)*b;
      for(const k of [0,2,1,0,3,2]){
        const [x,z]=corners[k];vertex(x,height,z,x,z);
      }
      for(const [left,right,tread] of [[1,2,false],[2,3,true],[3,0,false]]){
        const [ax,az]=corners[left],[bx,bz]=corners[right],len=Math.hypot(bx-ax,bz-az);
        const lowA=tread?lip:Math.min(height,ground(ax,az)-.15);
        const lowB=tread?lip:Math.min(height,ground(bx,bz)-.15);
        vertex(ax,height,az,0,height);vertex(bx,height,bz,len,height);vertex(ax,lowA,az,0,lowA);
        vertex(bx,height,bz,len,height);vertex(bx,lowB,bz,len,lowB);vertex(ax,lowA,az,0,lowA);
      }
    }
    for(const tile of walks)for(let j=0;j<tile.length;j+=2){
      const x=tile[j],z=tile[j+1];vertex(x,ground(x,z)-.126,z,x,z);
    }
    for(const [ax,az,bx,bz] of walkEdges){
      const a=ground(ax,az)-.126,b=ground(bx,bz)-.126,len=Math.hypot(bx-ax,bz-az);
      vertex(ax,a,az,0,a);vertex(bx,b,bz,len,b);vertex(ax,a-.16,az,0,a-.16);
      vertex(bx,b,bz,len,b);vertex(bx,b-.16,bz,len,b-.16);vertex(ax,a-.16,az,0,a-.16);
    }
    if(changed){positions.needsUpdate=true;uv.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
  };
  return {fixture,skirt,walk,building,stairs};
}
