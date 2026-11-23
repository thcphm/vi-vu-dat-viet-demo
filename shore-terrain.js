'use strict';

// Sum area-weighted triangle normals in slices while the previous mesh stays visible.
function* updateTerrainNormals(T,geometry){
  const points=geometry.attributes.position.array,triangles=geometry.index.array;
  const attribute=geometry.attributes.normal||new T.BufferAttribute(new Float32Array(points.length),3);
  const normals=attribute.array;normals.fill(0);
  for(let i=0;i<triangles.length;i+=3){
    const a=triangles[i]*3,b=triangles[i+1]*3,c=triangles[i+2]*3;
    const ux=points[b]-points[a],uy=points[b+1]-points[a+1],uz=points[b+2]-points[a+2];
    const vx=points[c]-points[a],vy=points[c+1]-points[a+1],vz=points[c+2]-points[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    for(let j=i;j<i+3;j++){const k=triangles[j]*3;normals[k]+=nx;normals[k+1]+=ny;normals[k+2]+=nz;}
    if((i&8191)===0)yield;
  }
  for(let i=0;i<normals.length;i+=3){
    const length=Math.sqrt(normals[i]**2+normals[i+1]**2+normals[i+2]**2)||1;
    normals[i]/=length;normals[i+1]/=length;normals[i+2]/=length;
    if((i&8191)===0)yield;
  }
  geometry.setAttribute('normal',attribute);attribute.needsUpdate=true;
}

// Even when the water mask is antialiased, adjacent IDs must remain distinct
// after the browser stores and reads back its premultiplied RGBA pixels.
function shorePoolColour(id){
  return 'rgb('+((id&7)*36)+','+(((id>>3)&7)*36)+','+((id>>6)*85)+')';
}
function shorePoolIndex(r,g,b){
  return Math.round(r/36)|(Math.round(g/36)<<3)|(Math.round(b/85)<<6);
}

// The mask's metre grid serves both the visible bed and the tyre immersion query.
// Its outer land vertices keep the same height and diagonal as the large terrain mesh.
function* buildMappedShoreSteps(T, options){
  const {mask,field,size,scale,maskX,maskZ,cx,cz,gx,gz,landWidth,land,landIndex,ground,pools,group,waterMaterial}=options;
  const segments=land.geometry.parameters.widthSegments;
  const metres=1/scale,coarse=landWidth/segments,steps=coarse/metres;
  const active=new Uint8Array(segments*segments),count=size*size,dry=new Float32Array(count),ids=new Uint8Array(count);
  const left=gx-cx-landWidth/2,top=gz-cz-landWidth/2;
  function poolId(i,k,j){
    let offset=i*4,alpha=mask[offset+3];
    if(!alpha||pools.length<2)return 0;
    // Canvas stores premultiplied colours. A faint edge cannot reliably
    // distinguish pool IDs. Read its most strongly covered neighbour first.
    if(alpha<32){
      for(let v=Math.max(0,j-1);v<=Math.min(size-1,j+1);v++)for(let u=Math.max(0,k-1);u<=Math.min(size-1,k+1);u++){
        const next=4*(v*size+u);
        if(mask[next+3]>alpha){offset=next;alpha=mask[next+3];}
      }
    }
    if(alpha<32)return 0;
    const id=shorePoolIndex(mask[offset],mask[offset+1],mask[offset+2]);
    return id<pools.length?id:0;
  }
  for(let j=0,i=0;j<size;j++)for(let k=0;k<size;k++,i++){
    if((i & 8191)===0)yield;
    const a=mask[4*i+3]/255;
    dry[i]=a>0?(1-a)*metres:32;ids[i]=poolId(i,k,j);
    if(a<=0)continue;
    const x=maskX+(k+.5)*metres-left,z=maskZ+(j+.5)*metres-top;
    // Include the dry bank outside the silhouette.
    for(let v=Math.max(0,Math.floor((z-10)/coarse));v<=Math.min(segments-1,Math.floor((z+10)/coarse));v++)
      for(let u=Math.max(0,Math.floor((x-10)/coarse));u<=Math.min(segments-1,Math.floor((x+10)/coarse));u++){
        const c=v*segments+u;
        if(field[i*4+2]<240)active[c]=1;
        else if(!active[c])active[c]=2;
      }
  }
  function spread(to,from,step){
    const d=dry[from]+step;
    if(d<dry[to]){dry[to]=d;ids[to]=ids[from];}
  }
  for(const dir of [1,-1])for(let k=0;k<count;k++){
    if((k & 8191)===0)yield;
    const i=dir===1?k:count-1-k,x=i%size,prev=i-size*dir;
    if(x-dir>=0&&x-dir<size)spread(i,i-dir,metres);
    if(prev>=0&&prev<count){
      spread(i,prev,metres);
      if(x>0)spread(i,prev-1,metres*Math.SQRT2);
      if(x<size-1)spread(i,prev+1,metres*Math.SQRT2);
    }
  }
  const signed=new Float32Array(count);
  for(let i=0;i<count;i++){
    const a=mask[i*4+3]/255;
    signed[i]=a>.98?field[i*4+2]*(24/255)-metres*.5:a<.02?metres*.5-dry[i]:(a-.5)*metres;
  }
  function cell(x,z){return x>=0&&z>=0&&x<size&&z<size?z*size+x:-1;}
  function distance(i){return i<0?-32:signed[i];}
  // Only cells near water need samples. Rows share boundary vertices between
  // neighbouring cells and serve the physics queries on the same metre grid.
  const gridSide=segments*steps+1,heights=new Array(gridSide);
  function node(x,z){
    const ix=Math.round((x-left)/metres),iz=Math.round((z-top)/metres);
    const line=heights[iz]??=new Array(gridSide);
    if(line[ix])return line[ix];
    const col=Math.round((x-maskX)*scale),row=Math.round((z-maskZ)*scale);
    const a=cell(col-1,row-1),b=cell(col,row-1),c=cell(col-1,row),e=cell(col,row);
    const da=distance(a),db=distance(b),dc=distance(c),de=distance(e);
    const d=(da+db+dc+de)*.25,closest=Math.max(da,db,dc,de);
    const nearest=da===closest?a:db===closest?b:dc===closest?c:e;
    const natural=ground(x,z)-.17,id=nearest<0?0:ids[nearest];
    // The DEM records embankments as land. Keep the surface below surrounding roads
    // while a named lake shares a level across its OSM islands and polygon cuts.
    const level=id&&pools[id]!==undefined?Math.min(natural-.12,Math.max(natural-3.2,pools[id])):natural-.42;
    const depth=Math.min(5.6,Math.max(0,d)*.33),dryWidth=Math.min(1,Math.max(0,-d/8));
    const blend=dryWidth*dryWidth*(3-2*dryWidth);
    const bed=d>0?level-depth:level+(natural-level)*blend;
    return line[ix]={x,z,bed,level,d,sediment:1-blend,waterIndex:-1};
  }
  const verts=[],uv=[],silt=[],indices=[],remaining=[],water=[],waterIndices=[];
  const waterVertex=(x,y,z)=>{const i=water.length/3;water.push(x,y,z);return i;};
  function waterTriangle(a,b,c,ia,ib,ic){
    if(a.d<=0&&b.d<=0&&c.d<=0)return;
    if(a.d>=0&&b.d>=0&&c.d>=0){waterIndices.push(ia,ib,ic);return;}
    const ring=[],ns=[a,b,c],vs=[ia,ib,ic];
    let p=c;
    for(let i=0;i<3;i++){
      const n=ns[i];
      if((p.d>0)!==(n.d>0)){
        const u=p.d/(p.d-n.d);
        ring.push(waterVertex(p.x+u*(n.x-p.x),p.level+u*(n.level-p.level),p.z+u*(n.z-p.z)));
      }
      if(n.d>0)ring.push(vs[i]);p=n;
    }
    for(let i=2;i<ring.length;i++)waterIndices.push(ring[0],ring[i-1],ring[i]);
  }
  for(let j=0;j<segments;j++)for(let i=0;i<segments;i++){
    const c=j*segments+i;
        if((c & 7)===0)yield;
    if(!active[c]){for(let k=c*6;k<c*6+6;k++)remaining.push(landIndex.array[k]);continue;}
    // Open water has a level surface and a saturated bed profile; shoreline
    // refinement there would produce many duplicate triangles on coastal maps.
    const divisions=active[c]===2?2:steps,spacing=coarse/divisions;
    const first=verts.length/3,ns=[],ws=[];
    for(let v=0;v<=divisions;v++)for(let u=0;u<=divisions;u++){
      const x=left+i*coarse+u*spacing,z=top+j*coarse+v*spacing,n=node(x,z);ns.push(n);
      const px=x+cx-gx,pz=z+cz-gz;
      verts.push(px,-pz,n.bed+.17);uv.push(px/landWidth+.5,.5-pz/landWidth);silt.push(n.sediment);
      if(n.d>=0&&n.waterIndex<0)n.waterIndex=waterVertex(x,n.level,z);
      ws.push(n.waterIndex);
      if(!v||!u)continue;
      const d=v*(divisions+1)+u,a=d-divisions-2,b=d-divisions-1,k=d-1;
      indices.push(first+a,first+k,first+b,first+k,first+d,first+b);
      waterTriangle(ns[a],ns[k],ns[b],ws[a],ws[k],ws[b]);waterTriangle(ns[k],ns[d],ns[b],ws[k],ws[d],ws[b]);
    }
  }
  const patch=new T.BufferGeometry();
  patch.setAttribute('position',new T.Float32BufferAttribute(verts,3));patch.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  patch.setAttribute('shoreSediment',new T.Float32BufferAttribute(silt,1));patch.setIndex(indices);yield* updateTerrainNormals(T,patch);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(water,3));g.setIndex(waterIndices);yield* updateTerrainNormals(T,g);
  land.geometry.setIndex(remaining);
  const bank=new T.Mesh(patch,land.material);bank.name='Mapped banks and bed';bank.receiveShadow=true;land.add(bank);
  // The shared materials are picked for the current biome by the main renderer.
  bank.onBeforeRender=()=>{bank.material=land.material;};
  const surface=new T.Mesh(g,waterMaterial);surface.name='Mapped water';surface.receiveShadow=true;group.add(surface);
  // Index the actual triangles that cover a bank (verges, paving and gardens).
  // A cover below the waterline reduces the depth, while one above it stays dry.
  const covers=new Map();
  function addCover(geometry,matrix,start=0,end=geometry.index?.count??geometry.attributes.position.count){
    const position=geometry.attributes.position,index=geometry.index;
    const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    function read(p,i){
      p.fromBufferAttribute(position,index?index.getX(i):i);
      if(matrix)p.applyMatrix4(matrix);
    }
    for(let i=start;i<end;i+=3){
      read(a,i);read(b,i+1);read(c,i+2);
      const bx=b.x-a.x,bz=b.z-a.z,cx=c.x-a.x,cz=c.z-a.z,det=bx*cz-bz*cx;
      if(Math.abs(det)<1e-8)continue;
      const x0=Math.max(0,Math.floor((Math.min(a.x,b.x,c.x)-left)/coarse)),x1=Math.min(segments-1,Math.floor((Math.max(a.x,b.x,c.x)-left)/coarse));
      const z0=Math.max(0,Math.floor((Math.min(a.z,b.z,c.z)-top)/coarse)),z1=Math.min(segments-1,Math.floor((Math.max(a.z,b.z,c.z)-top)/coarse));
      let tri;
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
        const key=z*segments+x;if(!active[key])continue;
        if(!covers.has(key))covers.set(key,[]);
        tri??={x:a.x,y:a.y,z:a.z,bx,bz,cx,cz,by:b.y-a.y,cy:c.y-a.y,det};
        covers.get(key).push(tri);
      }
    }
  }
  function sample(x,z,includeBank=false){
    const tx=Math.floor((x-left)/coarse),tz=Math.floor((z-top)/coarse);
    if(tx<0||tx>=segments||tz<0||tz>=segments||!active[tz*segments+tx])return null;
    const stride=active[tz*segments+tx]===2?steps/2:1,u=(x-left)/(metres*stride),v=(z-top)/(metres*stride);
    const i=Math.floor(u),j=Math.floor(v),f=u-i,h=v-j,col=i*stride,row=j*stride;
    const topRow=heights[row],bottomRow=heights[row+stride];
    const a=topRow?.[col],b=topRow?.[col+stride],c=bottomRow?.[col],d=bottomRow?.[col+stride];
    if(!a||!b||!c||!d)return null;
    const height=k=>f+h<=1?a[k]+f*(b[k]-a[k])+h*(c[k]-a[k]):d[k]+(1-f)*(c[k]-d[k])+(1-h)*(b[k]-d[k]);
    if(!includeBank&&height('d')<=0)return null;
    const level=height('level');let bed=height('bed');
    for(const t of covers.get(tz*segments+tx)||[]){
      const dx=x-t.x,dz=z-t.z,u=(dx*t.cz-dz*t.cx)/t.det,v=(t.bx*dz-t.bz*dx)/t.det;
      if(u>=-1e-7&&v>=-1e-7&&u+v<=1.0000001)bed=Math.max(bed,t.y+u*t.by+v*t.cy);
    }
    return includeBank||level>bed?{level,bed}:null;
  }
  function intersects(x0,z0,x1,z1){
    const firstX=Math.max(0,Math.floor((x0-left)/coarse)),lastX=Math.min(segments-1,Math.floor((x1-left)/coarse));
    const firstZ=Math.max(0,Math.floor((z0-top)/coarse)),lastZ=Math.min(segments-1,Math.floor((z1-top)/coarse));
    for(let j=firstZ;j<=lastZ;j++)for(let i=firstX;i<=lastX;i++)if(active[j*segments+i])return true;
    return false;
  }
  return {sample,addCover,intersects,dispose(){land.remove(bank);patch.dispose();land.geometry.setIndex(landIndex);}};
}
