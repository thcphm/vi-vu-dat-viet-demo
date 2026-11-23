'use strict';
(() => {
  const finishes=new WeakMap();
  const motorRoad=edge=>/^(motorway|trunk|primary)(?:_link)?$/.test(edge.kind);
  const tunnel=edge=>Boolean(edge.traffic?.tunnel);

  window.tunnelSection=function(edge,graph){
    const w=worldRoadHalfWidth(edge),name=edge.name||'',info=graph.tunnels?.info(edge);
    const immersed=/sông sài gòn|thủ thiêm/i.test(name),haiVan=/hải vân/i.test(name);
    // Short urban and rural road underpasses generally have a box section. Use
    // connected mapped bores to avoid changing profile at an internal way split.
    const namedMountain=/hải vân|đèo |cù mông|cổ mã|núi |thần vũ|thung thi|phước tượng|phú gia|bình đê/i.test(name);
    const long=edge.length>150||[edge.start,edge.end].some(node=>
      (graph.nodes.get(node)||[]).some(next=>next!==edge&&tunnel(next)&&next.length>150));
    const box=Boolean(info?.passage)||immersed||/chui|chìm|gầm/i.test(name)||!(namedMountain||long&&motorRoad(edge));
    const wall=info?.clearance>0?info.clearance:immersed?4.5:motorRoad(edge)?4.95:3.95;
    // Sài Gòn traffic operator: double-box immersed section, 4.5 m clearance.
    // Đà Nẵng city, Hải Vân I project: its arched main bore is 7.5 m high.
    const crown=box?wall+.27:haiVan?Math.max(wall+.5,7.5):wall+Math.min(2.85,1.1+w*.19);
    const innerHalfWidth=w+(w<3.1?.35:motorRoad(edge)?.85:.62);
    return {roadHalfWidth:w,innerHalfWidth,crown,wall,spring:box?wall:wall-.45,box};
  };
  window.buildTunnelMeshes=function(T,{graph,edges,cx,cz,radius,group,height,ground,material,registerObstacle}){
    const ways=edges.filter(e=>graph.tunnels.info(e));
    if(!ways.length)return;
    if(!finishes.has(material)){
      // Tunnels stay legible at night. The vertex tones bake the variation
      // between lamps without a point light and shadow pass for every fixture.
      const lining=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,emissive:0x35342f,emissiveIntensity:.43});
      finishes.set(material,{lining,exterior:lining.clone(),light:new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,toneMapped:false})});
    }
    const materials=finishes.get(material),batches=new Map(),color=new T.Color();
    const portals=new Set(),partitions=new Map(),sections=new Map();
    const mix=(a,b,f)=>a+(b-a)*f;
    const section=e=>{
      if(!sections.has(e))sections.set(e,tunnelSection(e,graph));
      return sections.get(e);
    };
    function put(mat,shade,a,b,c,d,w=0){
      let batch=batches.get(mat);
      if(!batch){batch={pos:[],uv:[],road:[],col:[],painted:!w};batches.set(mat,batch);}
      if(!w)color.setHex(shade);
      for(const p of [a,b,d,b,c,d]){
        const x=p.x-cx,z=p.z-cz;batch.pos.push(x,p.y,z);
        if(w){
          if(mat===material.roadSlabs||mat===material.roadWood)batch.uv.push(p.s,p.o);
          else batch.uv.push(x*.25+(cx*.25)%1,z*.25+(cz*.25)%1);
          batch.road.push(p.o,w);
        }
        else{
          const wash=mat===materials.lining&&p.lit ? .88+.12*Math.cos((p.s-5)*Math.PI/7) : 1;
          batch.col.push(color.r*wash,color.g*wash,color.b*wash);
        }
      }
    }
    const face=(a,b,c,d,shade)=>put(materials.lining,shade,a,b,c,d);
    const exteriorFace=(a,b,c,d,shade)=>put(materials.exterior,shade,a,b,c,d);
    const light=(a,b,c,d,shade)=>put(materials.light,shade,a,b,c,d);
    const point=(r,o,h=0)=>({x:r.x+r.nx*o,y:r.y+h,z:r.z+r.nz*o,o,s:r.s,lit:r.lit});
    function band(draw,a,b,offset1,y1,offset2,y2,tint){
      draw(point(a,offset1,y1),point(b,offset1,y1),point(b,offset2,y2),point(a,offset2,y2),tint);
    }
    const openings=node=>(graph.nodes.get(node)||[]).filter(tunnel);
    const clearance=26,tile=64,key=(i,j)=>i+','+j;
    // Neighbouring portals can be separate bores, or parallel mapped vehicle
    // and motorbike ways in a single chamber (for example, Hầm Sông Sài Gòn).
    for(const e of ways)if(tunnel(e)&&e.oneway&&section(e).box){
      for(let i=1;i<e.points.length;i++){
        const a=e.points[i-1],b=e.points[i],l=e.dist[i]-e.dist[i-1];
        const x0=Math.max(cx-radius-clearance,Math.min(a.x,b.x)-clearance),x1=Math.min(cx+radius+clearance,Math.max(a.x,b.x)+clearance);
        const z0=Math.max(cz-radius-clearance,Math.min(a.z,b.z)-clearance),z1=Math.min(cz+radius+clearance,Math.max(a.z,b.z)+clearance);
        const segment={e,a,fx:(b.x-a.x)/l,fz:(b.z-a.z)/l,l,s:e.dist[i-1]};
        for(let x=Math.floor(x0/tile);x<=Math.floor(x1/tile);x++)for(let z=Math.floor(z0/tile);z<=Math.floor(z1/tile);z++){
          const k=key(x,z);if(!partitions.has(k))partitions.set(k,[]);partitions.get(k).push(segment);
        }
      }
    }
    function lanesAt(e,r,q){
      const sides=[{w:q.innerHalfWidth,shared:false},{w:q.innerHalfWidth,shared:false}];
      if(!e.oneway||!q.box)return sides;
      for(const n of partitions.get(key(Math.floor(r.x/tile),Math.floor(r.z/tile)))||[]){
        if(n.e===e||Math.abs(r.tx*n.fx+r.tz*n.fz)<.96)continue;
        const dx=r.x-n.a.x,dz=r.z-n.a.z,d=dx*n.fx+dz*n.fz;
        if(d<-.5||d>n.l+.5)continue;
        const cross=(n.a.x+d*n.fx-r.x)*(-r.tz)+(n.a.z+d*n.fz-r.z)*r.tx;
        const w=section(n.e).roadHalfWidth,gap=Math.abs(cross),combined=q.roadHalfWidth+w;
        if(gap<1.4||gap>combined+2.3||Math.abs(height(n.e,n.s+Math.max(0,Math.min(n.l,d)))-r.y)>1.4)continue;
        const side=sides[cross>0?1:0],boundary=gap*q.roadHalfWidth/combined;
        if(side.matched&&boundary>=side.w)continue;
        side.shared=r.tx*n.fx+r.tz*n.fz>0;side.matched=true;
        side.w=side.shared?boundary:Math.min(side.w,boundary-.08);
      }
      return sides;
    }
    function edgeNormal(e,i){
      const a=e.points[i],b=e.points[i+1],d=e.dist[i+1]-e.dist[i];
      return [(a.z-b.z)/d,(b.x-a.x)/d];
    }
    function miter(a,b){
      const f=1/Math.max(.6,1+a[0]*b[0]+a[1]*b[1]);return [(a[0]+b[0])*f,(a[1]+b[1])*f];
    }
    function join(e,i){
      const last=e.points.length-1;
      if(i>0&&i<last)return miter(edgeNormal(e,i-1),edgeNormal(e,i));
      const first=i===0,node=first?e.start:e.end,normal=edgeNormal(e,first?0:last-1);
      const links=openings(node);
      if(links.length!==2)return normal;
      const other=links.find(o=>o!==e);
      if(!other)return normal;
      const nextStarts=other.start===node,next=edgeNormal(other,nextStarts?0:other.points.length-2);
      return miter(normal,first===nextStarts?[-next[0],-next[1]]:next);
    }
    function boundary(q,side,sign){
      const w=side.w*sign;
      if(q.box)return [[w,0],[w,q.spring],[w*(side.shared?1:.974),q.crown],[w*.64,q.crown],[w*.32,q.crown],[0,q.crown]];
      return [[w,0],[w,q.spring],[w*.925,mix(q.spring,q.crown,.42)],[w*.70,mix(q.spring,q.crown,.76)],
        [w*.38,mix(q.spring,q.crown,.94)],[0,q.crown]];
    }
    function obstacle(a,b,oa,ob,id,h){
      if(!registerObstacle)return;
      const p=point(a,oa),q=point(b,ob),dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz);
      if(l<.02||h<.25)return;
      const baseY=Math.min(p.y,q.y);
      registerObstacle({id,kind:'barrier',x:(p.x+q.x)/2-cx,z:(p.z+q.z)/2-cz,fx:dx/l,fz:dz/l,w:l/2,d:.10,
        baseY,height:h+Math.abs(p.y-q.y),parts:[]});
    }
    const move=(r,d)=>({...r,x:r.x+r.tx*d,z:r.z+r.tz*d});
    function portal(e,r,q,dir){
      const node=dir===1?e.start:e.end;
      const trueEnd=graph.tunnels.portal?graph.tunnels.portal(node):
        openings(node).length===1&&(graph.nodes.get(node)||[]).some(next=>!tunnel(next));
      if(portals.has(node)||!trueEnd||graph.tunnels.info(e).passage)return;
      portals.add(node);
      const out=move(r,-dir*.46),inner=move(r,dir*.84);
      for(const [i,sign] of [[0,-1],[1,1]]){
        const shape=boundary(q,r.sides[i],sign),shared=r.sides[i].shared;
        for(let k=shared?2:0;k<shape.length-1;k++){
          const [o,h]=shape[k],[oo,hh]=shape[k+1];
          const exterior=(offset,y)=>point(out,offset+(shared?0:sign*.52*Math.abs(offset)/r.sides[i].w),y+(y/q.crown)*.54);
          exteriorFace(point(out,o,h),point(out,oo,hh),exterior(oo,hh),exterior(o,h),0xc3c1b5);
          exteriorFace(exterior(o,h),exterior(oo,hh),point(inner,oo+(shared?0:sign*.52*Math.abs(oo)/r.sides[i].w),hh+(hh/q.crown)*.54),
            point(inner,o+(shared?0:sign*.52*Math.abs(o)/r.sides[i].w),h+(h/q.crown)*.54),0xa3a49a);
          exteriorFace(point(out,o,h),point(out,oo,hh),point(inner,oo,hh),point(inner,o,h),0x9b9d93);
        }
        if(shared)continue;
        const x=r.sides[i].w*sign;
        for(let j=0;j<6;j++){
          const h=.22+j*.22,faceRow=move(out,-dir*.016);
          exteriorFace(point(faceRow,x,h),point(faceRow,x+sign*.43,h+.16),point(faceRow,x+sign*.43,h+.36),
            point(faceRow,x,h+.20),j%2?0x494b44:0xe0bd61);
        }
      }
    }
    for(const edge of ways){
      const info=graph.tunnels.info(edge),bore=info.bore,q=section(edge);
      const half=q.roadHalfWidth,joins=edge.points.map((_,i)=>join(edge,i));
      const floorMaterial=material[roadSurfaceClass(edge)]||material.asphalt,layout=roadLaneLayout(edge,half);
      for(let i=1;i<edge.points.length;i++){
        const p=edge.points[i-1],b=edge.points[i],len=edge.dist[i]-edge.dist[i-1],base=edge.dist[i-1];
        const tx=(b.x-p.x)/len,tz=(b.z-p.z)/len,d=(cx-p.x)*tx+(cz-p.z)*tz;
        const lateral=Math.abs((cx-p.x)*tz-(cz-p.z)*tx),reach=radius+q.innerHalfWidth+2;
        if(lateral>=reach)continue;
        const extent=Math.sqrt(reach*reach-lateral*lateral);
        const clipStart=base+Math.max(0,d-extent),clipEnd=base+Math.min(len,d+extent);
        const rows=new Map();
        function row(s){
          if(rows.has(s))return rows.get(s);
          const f=(s-base)/len;
          const r={s,x:mix(p.x,b.x,f),z:mix(p.z,b.z,f),y:height(edge,s),tx,tz,lit:bore&&(motorRoad(edge)||edge.length>40),
            nx:mix(joins[i-1][0],joins[i][0],f),nz:mix(joins[i-1][1],joins[i][1],f)};
          r.sides=lanesAt(edge,r,q);rows.set(s,r);return r;
        }
        for(const [start,end] of info.ranges){
          const lo=Math.max(start,clipStart),hi=Math.min(end,clipEnd);
          if(hi-lo<.01)continue;
          const stations=[lo,hi];
          for(let s=Math.ceil((lo+.0001)/8)*8;s<hi-.0001;s+=8)stations.push(s);
          stations.sort((a,b)=>a-b);
          let a=row(lo);
          if(bore&&lo<.001)portal(edge,a,q,1);
          for(const s of stations.slice(1)){
            const c=row(s);
            put(floorMaterial,0,point(a,-a.sides[0].w,.004),point(a,a.sides[1].w,.004),
              point(c,c.sides[1].w,.004),point(c,-c.sides[0].w,.004),half);
            for(const [idx,sign] of [[0,-1],[1,1]]){
              const side=a.sides[idx],next=c.sides[idx],oa=side.w*sign,ob=next.w*sign;
              const branch=[edge.start,edge.end].some((n,j)=>openings(n).length>2&&(j?edge.length-a.s:s)<q.innerHalfWidth*1.75);
              const open=side.shared&&next.shared||branch;
              if(!bore){
                const pa=point(a,oa),pc=point(c,ob);
                const hA=Math.max(0,ground(pa.x,pa.z)-a.y+.08),hC=Math.max(0,ground(pc.x,pc.z)-c.y+.08);
                if(!open&&Math.max(hA,hC)>.15){
                  exteriorFace(pa,pc,point(c,ob,hC),point(a,oa,hA),0xafb0a2);
                  obstacle(a,c,oa,ob,'trench:'+edge.id+':'+idx+':'+s,Math.min(hA,hC));
                }
                continue;
              }
              const shape=boundary(q,side,sign),shapeNext=boundary(q,next,sign);
              for(let k=open?2:0;k<shape.length-1;k++){
                const [o,h]=shape[k],[oo,hh]=shape[k+1],[u,v]=shapeNext[k],[uu,vv]=shapeNext[k+1];
                face(point(a,o,h),point(c,u,v),point(c,uu,vv),point(a,oo,hh),k===0?0x9a9f95:k===1?0x838c87:0x757d78);
              }
              if(open)continue;
              const nearA=oa-sign*.018,nearC=ob-sign*.018;
              face(point(a,nearA,.23),point(c,nearC,.23),point(c,nearC,1.35),point(a,nearA,1.35),0xc7c6b6);
              face(point(a,nearA-sign*.008,1.19),point(c,nearC-sign*.008,1.19),point(c,nearC-sign*.008,1.29),
                point(a,nearA-sign*.008,1.29),0x96a19b);
              obstacle(a,c,oa,ob,'tunnel:'+edge.id+':'+idx+':'+s,q.spring);
            }
            const paint=(from,to,l,r,col)=>{
              const x=row(from),z=row(to),left=Math.max(l,-x.sides[0].w,-z.sides[0].w),
                right=Math.min(r,x.sides[1].w,z.sides[1].w);
              if(right>left)band(bore?face:exteriorFace,x,z,left,.025,right,.025,col==='yellow'?0xe9c369:0xe4e4d4);
            };
            roadPaint(edge,layout,half,a.s,s,paint);
            if(bore&&(motorRoad(edge)||edge.length>40)){
              for(let station=Math.ceil((a.s-5)/14)*14+5;station<s;station+=14){
                const at=row(station),end=row(Math.min(station+1.55,hi));
                for(const [idx,sign] of [[0,-1],[1,1]]){
                  if(at.sides[idx].shared)continue;
                  const offset=at.sides[idx].w*sign*(q.box?.83:.63);
                  const y=q.box?q.crown-.055:mix(q.spring,q.crown,.778);
                  band(light,at,end,offset-.09,y,offset+.09,y,0xffeec9);
                }
              }
            }
            a=c;
          }
          if(bore&&hi>=edge.length-.001)portal(edge,a,q,-1);
        }
      }
    }
    for(const [mat,batch] of batches){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.pos,3));
      if(batch.painted)g.setAttribute('color',new T.Float32BufferAttribute(batch.col,3));
      else{g.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));g.setAttribute('carriageway',new T.Float32BufferAttribute(batch.road,2));}
      g.computeVertexNormals();
      const mesh=new T.Mesh(g,mat);
      mesh.name=mat===materials.lining?'Tunnel inner lining':mat===materials.exterior?'Tunnel portals and approaches':
        mat===materials.light?'Tunnel luminaires':'Tunnel carriageways';
      // The roof still shades the road. Coarse outdoor shadow maps leave sawtooth edges on the inside wall.
      mesh.castShadow=mat===materials.lining||mat===materials.exterior;
      mesh.receiveShadow=mat!==materials.lining&&mat!==materials.light;group.add(mesh);
    }
    return portals;
  };
})();
