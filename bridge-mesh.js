'use strict';
(() => {
  const concrete=0xb9b7ab,soffit=0x898b86,girder=0x9b9e98,steel=0x99a5a4;
  const shared=new WeakMap();
  const mix=(a,b,t)=>a+(b-a)*t;
  function assets(T,materials){
    if(!shared.has(materials))shared.set(materials,{
      box:new T.BoxGeometry(),
      beams:new T.MeshLambertMaterial({color:0xffffff}),
      faces:new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide})
    });
    return shared.get(materials);
  }
  // Positions stay in graph metres until they are written to a render buffer.
  // A new district origin therefore does not move an expansion joint or a pier.
  function* buildBridgeMeshSteps(T,options){
    const {edges,graph,cx,cz,radius,group,material,height,ground,bridgeInfo,registerObstacle,signatureHeight}=options;
    if(!graph)return;
    const kit=assets(T,material),decks=new Map(),faces=[],colors=[],poses=[],tints=[];
    let work=0;
    let activeDeck;
    const tint=new T.Color(),matrix=new T.Matrix4();
    const inRange=(x,z,margin=0)=>Math.hypot(x-cx,z-cz)<=radius+margin;
    function beam(a,b,width,depth,color){
      const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
      const length=Math.hypot(dx,dy,dz);
      if(length<.002)return;
      const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
      if(!inRange(mx,mz,length/2+width))return;
      const horiz=Math.hypot(dx,dz),rx=horiz>.001?dz/horiz:1,rz=horiz>.001?-dx/horiz:0;
      // Local Z spans the endpoints. Local Y is the upward section normal.
      const ux=dy*rz/length,uy=(dz*rx-dx*rz)/length,uz=-dy*rx/length;
      matrix.set(rx*width,ux*depth,dx,mx-cx,0,uy*depth,dy,(a.y+b.y)/2,
        rz*width,uz*depth,dz,mz-cz,0,0,0,1);
      poses.push(...matrix.elements);tints.push(color);
    }
    function polygon(points,color,halfWidth=0){
      if(!halfWidth)tint.setHex(color);
      for(const p of points){
        const x=p.x-cx,z=p.z-cz;
        if(halfWidth){
          const {positions,uv,finish}=activeDeck;
          positions.push(x,p.y,z);
          const freq=finish==='earth' ? .48 : .25;
          if(finish==='roadSlabs'||finish==='roadWood')uv.push(p.s,p.offset);
          else if(finish==='pavers')uv.push(p.x,p.z);
          else uv.push(x*freq+(cx*freq)%1,z*freq+(cz*freq)%1);
          if(finish==='asphalt')activeDeck.carriageway.push(p.offset,halfWidth);
        }else{
          faces.push(x,p.y,z);colors.push(tint.r,tint.g,tint.b);
        }
      }
    }
    function quad(a,b,c,d,color,halfWidth=0){polygon([a,b,d,b,c,d],color,halfWidth);}
    function at(row,offset,y=0){
      return {x:row.x+row.nx*offset,y:row.y+y,z:row.z+row.nz*offset,s:row.s,offset};
    }
    function ribbon(a,b,left,right,y,color,halfWidth=0){
      quad(at(a,left,y),at(a,right,y),at(b,right,y),at(b,left,y),color,halfWidth);
    }
    function intermediate(a,b,s){
      const t=(s-a.s)/(b.s-a.s);
      return {s,x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),y:mix(a.y,b.y,t),nx:mix(a.nx,b.nx,t),nz:mix(a.nz,b.nz,t)};
    }
    function clearRail(edge,segment,a,b,offset){
      const p=at(a,offset),q=at(b,offset);
      const ax=p.x-cx,az=p.z-cz,bx=q.x-cx,bz=q.z-cz;
      return guardrailFits(ax,az,bx,bz,options.railRoads(ax,az,bx,bz),.12,null,(r,u,t)=>{
        if(r.source===edge&&r.station>=edge.dist[segment]-.001&&r.station<edge.dist[segment+1]-.001)return false;
        const roadY=options.roadHeight(r,u),railY=mix(a.y,b.y,t);
        // Match the vehicle clearance and parapet used by physical contact.
        return roadY+1.35>=railY&&roadY<=railY+1.20;
      });
    }
    function barrier(edge,a,b,side,offset){
      const p=at(a,offset),q=at(b,offset),dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);
      if(len<.05)return;
      registerObstacle({id:'bridge:'+edge.id+':'+side+':'+a.s.toFixed(2),kind:'barrier',
        x:(p.x+q.x)/2-cx,z:(p.z+q.z)/2-cz,fx:dx/len,fz:dz/len,w:len/2,d:.12,
        baseY:Math.min(a.y,b.y),height:1.08+Math.abs(a.y-b.y),parts:[]});
    }
    const width=window.worldRoadHalfWidth,signatures=window.VietnamBridgeSignatures;
    // Pick the same mitre on both sides of a two-way graph join, including
    // joins between separately mapped OSM ways and the ground approaches.
    function outward(edge,node){
      const pts=edge.points,first=edge.start===node;
      const a=first?pts[0]:pts.at(-1),b=first?pts[1]:pts.at(-2),len=Math.hypot(b.x-a.x,b.z-a.z);
      return [(b.x-a.x)/len,(b.z-a.z)/len];
    }
    function endpoint(edge,node,tangent,first){
      const links=graph.nodes.get(node)||[];
      if(links.length!==2)return tangent;
      const next=links.find(e=>e!==edge);
      if(!next)return tangent;
      const [tx,tz]=outward(next,node),nx=first?tz:-tz,nz=first?-tx:tx;
      return miter(tangent.nx,tangent.nz,nx,nz);
    }
    function miter(ax,az,bx,bz){
      const scale=1/Math.max(.5,1+ax*bx+az*bz);
      return {nx:(ax+bx)*scale,nz:(az+bz)*scale};
    }
    function rowSampler(edge,elevation=height,joinRoads=true){
      const tangents=edge.points.slice(1).map((b,i)=>{
        const a=edge.points[i],length=edge.dist[i+1]-edge.dist[i];
        return {nx:(a.z-b.z)/length,nz:(b.x-a.x)/length};
      });
      const joins=tangents.map((u,i)=>i?miter(tangents[i-1].nx,tangents[i-1].nz,u.nx,u.nz):joinRoads?endpoint(edge,edge.start,u,true):u);
      joins.push(joinRoads?endpoint(edge,edge.end,tangents.at(-1),false):tangents.at(-1));
      return (s,i)=>{
        if(i===undefined){
          let lo=0,hi=edge.dist.length-1;
          while(hi-lo>1){const mid=(lo+hi)>>1;if(edge.dist[mid]>s)hi=mid;else lo=mid;}
          i=lo;
        }
        const len=edge.dist[i+1]-edge.dist[i],t=(s-edge.dist[i])/len;
        const a=edge.points[i],b=edge.points[i+1],u=joins[i],v=joins[i+1];
        return {s,x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),y:elevation(edge,s),nx:mix(u.nx,v.nx,t),nz:mix(u.nz,v.nz,t)};
      };
    }
    function roomForPier(edge,row){
      for(const other of graph.nearby(row.x,row.z,12)){
        if(other===edge)continue;
        const gap=width(other)+1.75;
        if(row.x<other.minX-gap||row.x>other.maxX+gap||row.z<other.minZ-gap||row.z>other.maxZ+gap)continue;
        for(let i=1;i<other.points.length;i++){
          const a=other.points[i-1],b=other.points[i];
          if(row.x<Math.min(a.x,b.x)-gap||row.x>Math.max(a.x,b.x)+gap||
             row.z<Math.min(a.z,b.z)-gap||row.z>Math.max(a.z,b.z)+gap)continue;
          const dx=b.x-a.x,dz=b.z-a.z,len=other.dist[i]-other.dist[i-1];
          const t=Math.max(0,Math.min(1,((row.x-a.x)*dx+(row.z-a.z)*dz)/(len*len)));
          if(Math.hypot(row.x-a.x-t*dx,row.z-a.z-t*dz)<gap&&height(other,other.dist[i-1]+t*len)<row.y-1.8)return false;
        }
      }
      return true;
    }
    function addPier(edge,row,w,depth){
      const top=row.y-depth-.53,base=ground(row.x,row.z)-3;
      if(top<base+1)return;
      const cap=Math.max(1.4,w*.80),stem=Math.min(1.8,w*.36);
      const center={x:row.x,z:row.z};
      beam({...center,y:base},{...center,y:top},stem*1.38,stem*1.22,0xa9aaa0);
      const arm=(side,outer,y)=>at(row,side*(outer?cap:stem*.44),y);
      for(const side of [-1,1])
        beam(arm(side,false,-depth-1.54),arm(side,true,-depth-.53),1.3,.58,concrete);
      beam(at(row,-cap,-depth-.45),at(row,cap,-depth-.45),1.47,.64,concrete);
      for(const side of [-1,1]){
        const p=at(row,side*w*.63);
        beam({...p,y:row.y-depth-.21},{...p,y:row.y-depth-.04},.62,.55,0x525b59);
      }
      registerObstacle({id:'pier:'+edge.id+':'+row.s.toFixed(1),kind:'barrier',x:row.x-cx,z:row.z-cz,
        radius:stem*.82,baseY:base,height:top-base,parts:[]});
    }
    function structureOnSpan(type,row,start,end,w){
      const mid=row((start+end)/2),length=end-start;
      if(!inRange(mid.x,mid.z,length/2)||signatures?.covers(graph,mid.x,mid.z)||length<14)return;
      const arch=type==='arch',truss=type==='truss';
      if(!arch&&!truss)return;
      // Deck arches carry the roadway on spandrels, through trusses frame the carriageway.
      const rise=arch?Math.min(length*.16,mid.y-ground(mid.x,mid.z)-1.2,8):Math.min(7.2,Math.max(4.8,w*.93));
      if(arch&&rise<1)return;
      const n=Math.max(3,Math.ceil(length/(truss?7:4.5)));
      for(const side of [-1,1]){
        const offset=side*(truss?w+.52:w*.68);
        let lastTop=null,lastBase=null;
        for(let i=0;i<=n;i++){
          const t=i/n,r=row(mix(start,end,t)),level=arch?-1.16-rise*(2*t-1)**2:rise;
          const top=at(r,offset,level),base=at(r,offset,truss?.54:-.76);
          if(lastTop){
            beam(lastTop,top,arch?.54:.30,arch?.71:.33,arch?concrete:0x697b79);
            if(truss){
              beam(i%2?lastBase:lastTop,i%2?top:base,.18,.20,0x71847f);
              if(side===1&&i%2===0)beam(at(r,-offset,rise),top,.18,.23,0x768681);
            }
          }
          if(i<n||truss)beam(base,top,arch?.34:.19,arch?.38:.21,arch?girder:0x748480);
          lastTop=top;lastBase=base;
        }
      }
    }
    function cableSpan(edge,row,start,end,w,depth,type){
      const length=end-start,mid=row((start+end)/2);
      if(signatures?.covers(graph,mid.x,mid.z))return;
      if(type==='simple-suspension'){
        const n=Math.max(6,Math.ceil(length/5.5)),h=Math.min(5.4,2.1+length*.027);
        for(const side of [-1,1]){
          const o=side*(w+.28);
          let prev=null;
          for(let k=0;k<=n;k++){
            const t=k/n,r=row(mix(start,end,t)),cable=at(r,o,1.28+(h-1.28)*(2*t-1)**2);
            beam(at(r,o,.25),cable,k===0||k===n?.18:.052,k===0||k===n?.20:.052,steel);
            if(prev)beam(prev,cable,.095,.095,0x737d79);prev=cable;
          }
        }
        return;
      }
      const stayed=type==='cable-stayed';
      // A mapped structure tag supplies the family, while the visible span
      // supplies its scale. Individually surveyed landmarks own their towers.
      const first=start+length*.18,second=end-length*.18,span=second-first;
      const h=Math.min(50,Math.max(5,length*(stayed?.13:.10)));
      for(const station of [first,second]){
        const r=row(station);
        if(inRange(r.x,r.z,4)&&roomForPier(edge,r))addPier(edge,r,w,depth);
      }
      for(const side of [-1,1]){
        const out=side*(w+.48),p=(s,h)=>at(row(s),out,h);
        for(const station of [first,second]){
          beam(p(station,-.43),p(station,h+.50),.5+h*.021,.59+h*.026,concrete);
          if(side===1)beam(at(row(station),-out,h*.80),p(station,h*.80),.48+h*.012,.46+h*.014,girder);
        }
        if(stayed){
          for(const [station,left,right] of [[first,start,(first+second)/2],[second,(first+second)/2,end]])
            for(let i=1;i<=7;i++)for(const anchor of [left,right])
              beam(p(station,h*(.72+.28*i/7)),p(mix(station,anchor,i/7),.49),.095,.095,0xc6cbca);
        }else{
          beam(p(start,.6),p(first,h),.18,.18,0x798a87);beam(p(second,h),p(end,.6),.18,.18,0x798a87);
          const n=Math.max(8,Math.ceil(span/7));
          let prev=p(first,h);
          for(let i=1;i<=n;i++){
            const t=i/n,station=mix(first,second,t),next=p(station,h*(.26+.74*(2*t-1)**2));
            beam(prev,next,.18,.18,0x798a87);if(i<n)beam(p(station,.5),next,.075,.075,steel);
            prev=next;
          }
        }
      }
    }
    // A bridge may be divided at an ordinary junction, virtual routing vertex,
    // or into two parallel one-way carriageways. Fit one main span to the
    // physical crossing and keep the approach viaducts on their own piers.
    const cableTypes=new Set(['cable-stayed','suspension','simple-suspension']);
    const cables=[],handled=new Set(),suspended=new Map();
    for(const initial of edges){
      const type=bridgeInfo(initial)?.structure;
      if(!cableTypes.has(type)||handled.has(initial))continue;
      const chain=[{edge:initial,forward:true}];handled.add(initial);
      for(const front of [true,false]){
        let node=front?initial.start:initial.end;
        for(;;){
          const links=(graph.nodes.get(node)||[]).filter(e=>bridgeInfo(e)?.structure===type);
          if(links.length!==2)break;
          const edge=links.find(e=>!handled.has(e));
          if(!edge)break;
          handled.add(edge);
          const item={edge,forward:front?edge.end===node:edge.start===node};
          if(front)chain.unshift(item);else chain.push(item);
          node=edge.start===node?edge.end:edge.start;
        }
      }
      let length=0;
      for(const item of chain){
        item.from=length;length+=item.edge.length;item.to=length;item.row=rowSampler(item.edge);
      }
      if(length<30)continue;
      function sample(s){
        const item=chain.find(i=>i.to>=s)||chain.at(-1),d=item.forward?s-item.from:item.to-s;
        const r=item.row(Math.max(0,Math.min(item.edge.length,d)));
        if(!item.forward){r.nx=-r.nx;r.nz=-r.nz;}
        r.s=s;r.edge=item.edge;r.distance=d;return r;
      }
      const a=sample(0),b=sample(length);
      cables.push({initial,chain,length,sample,a,b,type});
    }
    const separation=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    const paired=new Set();
    for(const c of cables){
      if(paired.has(c))continue;
      let twin=null,reverse=false;
      if(c.initial.oneway){
        for(const next of cables){
          if(next===c||paired.has(next)||!next.initial.oneway||next.type!==c.type||
             Math.abs(next.length-c.length)>Math.max(12,c.length*.07))continue;
          const f=Math.max(separation(c.a,next.a),separation(c.b,next.b));
          const r=Math.max(separation(c.a,next.b),separation(c.b,next.a));
          if(Math.min(f,r)>Math.max(width(c.initial)+width(next.initial)+7,16))continue;
          twin=next;reverse=r<f;paired.add(next);break;
        }
      }
      paired.add(c);
      const half=width(c.initial),mid=c.length/2,limit=c.type==='cable-stayed'?520:430;
      const length=Math.min(c.length,limit),lo=mid-length/2,hi=mid+length/2;
      const mate=s=>twin.sample((reverse?1-s/c.length:s/c.length)*twin.length);
      const row=s=>{
        const p=c.sample(s);
        if(twin){
          const q=mate(s);p.x=(p.x+q.x)/2;p.z=(p.z+q.z)/2;p.y=(p.y+q.y)/2;
        }
        return p;
      };
      let modeled=false;
      const checks=Math.max(2,Math.ceil(c.length/80));
      for(let i=0;i<=checks&&!modeled;i++){
        const r=row(c.length*i/checks);
        modeled=signatures?.covers(graph,r.x,r.z)||options.authoredAt?.(r.edge,r.distance);
      }
      if(modeled)continue;
      const w=twin?(half+width(twin.initial)+separation(c.sample(mid),mate(mid)))/2:half;
      cableSpan(c.initial,row,lo,hi,w,Math.max(.56,Math.min(1.38,w*.14)),c.type);
      for(const part of twin?[c,twin]:[c]){
        const start=lo*part.length/c.length,end=hi*part.length/c.length;
        for(const item of part.chain){
          if(item.to<=start||item.from>=end)continue;
          const u=Math.max(item.from,start),v=Math.min(item.to,end);
          suspended.set(item.edge,item.forward?[u-item.from,v-item.from]:[item.to-v,item.to-u]);
        }
      }
    }
    const capped=new Set();
    for(const edge of edges){
      const info=bridgeInfo(edge);
      if(!info)continue;
      const w=width(edge),row=rowSampler(edge),major=/^(motorway|trunk)/.test(edge.kind);
      const heavy=major||w>=6,depth=Math.min(1.38,Math.max(.56,w*.14));
      const layout=roadLaneLayout(edge,w),finish=roadSurfaceClass(edge);
      if(!decks.has(finish))decks.set(finish,{finish,positions:[],uv:[],carriageway:[]});
      activeDeck=decks.get(finish);
      const apron=node=>(graph.nodes.get(node)?.length||0)>2?w+1.4:0;
      const railMin=apron(edge.start),railMax=edge.length-apron(edge.end);
      for(const [start,end] of info.ranges){
        for(const [s,node,mouth] of [[0,edge.start,railMin],[edge.length,edge.end,edge.length-railMax]]){
          if(!mouth||s<start||s>end||capped.has(node))continue;
          capped.add(node);
          const p=row(s),r=Math.max(...graph.nodes.get(node).map(width));
          if(!inRange(p.x,p.z,r)||p.y-ground(p.x,p.z)<.2)continue;
          // Merge elevated slip roads around their mapped node. The connected
          // strips keep their top at y+.004; this small apron sits below them.
          const center={...p,offset:0};
          for(let k=0;k<16;k++){
            const rim=i=>({...center,x:p.x+r*Math.sin(i*Math.PI/8),z:p.z+r*Math.cos(i*Math.PI/8)});
            polygon([center,rim(k),rim(k+1)],0,r);
          }
        }
        for(let i=0;i<edge.points.length-1;i++){
          const lo=Math.max(start,edge.dist[i]),hi=Math.min(end,edge.dist[i+1]);
          if(lo>=hi)continue;
          const a=edge.points[i],b=edge.points[i+1],len=edge.dist[i+1]-edge.dist[i];
          const tx=(b.x-a.x)/len,tz=(b.z-a.z)/len,along=(cx-a.x)*tx+(cz-a.z)*tz;
          const side=Math.abs((cx-a.x)*tz-(cz-a.z)*tx),reach=radius+w+5;
          if(side>reach)continue;
          const extent=Math.sqrt(reach*reach-side*side);
          const from=Math.max(lo,edge.dist[i]+along-extent),to=Math.min(hi,edge.dist[i]+along+extent);
          if(to<=from)continue;
          // Anchor the subdivision on the OSM segment, even when it leaves the view.
          const stations=[from,to];
          for(let s=edge.dist[i]+Math.ceil((from-edge.dist[i])/6)*6;s<to;s+=6)if(s>from)stations.push(s);
          if(railMin>from&&railMin<to)stations.push(railMin);
          if(railMax>from&&railMax<to)stations.push(railMax);
          stations.sort((a,b)=>a-b);
          let prev=row(from,i);
          for(const s of stations.slice(1)){
            if((++work&7)===0)yield;
            if(s-prev.s<.0001)continue;
            const next=row(s,i);
            ribbon(prev,next,-w,w,.004,0,w);
            roadPaint(edge,layout,w,prev.s,s,(lo,hi,left,right,color)=>
              ribbon(intermediate(prev,next,lo),intermediate(prev,next,hi),left,right,.028,
                color==='yellow'?0xf0ca63:0xe8e8d7),{lines:prev.s>=railMin&&s<=railMax});
            const owned=options.authoredAt?.(edge,(prev.s+s)/2)??info.landmark;
            if(!owned){
              for(const side of [-1,1]){
                const outer=side*(w+.38),lip=side*(w+.16);
                ribbon(prev,next,side*w,outer,.005,concrete);
                quad(at(prev,outer,.005),at(next,outer,.005),at(next,lip,-.39),at(prev,lip,-.39),girder);
                if(info.bridge){
                  const offset=side*w*.63;
                  beam(at(prev,offset,-(depth+.32)/2),at(next,offset,-(depth+.32)/2),Math.max(.4,w*.17),depth-.30,0x989c97);
                }else{
                  const foot=r=>{
                    const p=at(r,outer),level=ground(p.x,p.z),fill=Math.max(0,r.y-level);
                    const f=at(r,side*(w+.4+Math.min(5,fill*.8)));f.y=ground(f.x,f.z)-.25;return f;
                  };
                  quad(at(prev,lip,-.28),at(next,lip,-.28),foot(next),foot(prev),0x918f77);
                }
                if(prev.s>=railMin&&s<=railMax){
                  const o=side*(w+.16);
                  const raised=info.bridge||Math.max(prev.y-ground(prev.x,prev.z),next.y-ground(next.x,next.z))>.45;
                  if(raised&&clearRail(edge,i,prev,next,o)){
                    beam(at(prev,o,.14),at(next,o,.14),.35,.29,concrete);
                    if(heavy){
                      beam(at(prev,o,.49),at(next,o,.49),.23,.48,0xc8c7ba);
                      beam(at(prev,o,.82),at(next,o,.82),.20,.16,0xbabcb4);
                    }else{
                      for(const h of [.57,.95])beam(at(prev,o,h),at(next,o,h),.095,.095,steel);
                    }
                    for(let d=Math.ceil(prev.s/(heavy?12:3))* (heavy?12:3);d<s;d+=heavy?12:3){
                      const stand=intermediate(prev,next,d);
                      if(heavy)beam(at(stand,o,.89),at(stand,o,.97),.15,.095,0xe9b24f);
                      else beam(at(stand,o,.23),at(stand,o,.98),.11,.13,0x87938e);
                    }
                    barrier(edge,prev,next,side,o);
                  }
                }
              }
              if(info.bridge)ribbon(prev,next,-w-.16,w+.16,-.38,soffit);
            }
            prev=next;
          }
        }
        if(!info.bridge)continue;
        const length=end-start,bays=Math.max(1,Math.ceil(length/(major?39:31))),bay=length/bays;
        const type=info.structure,architecturalBays=Math.max(1,Math.round(length/65));
        if(type==='truss'||type==='arch'){
          for(let k=0;k<architecturalBays;k++)if(!(options.authoredAt?.(edge,start+length*(k+.5)/architecturalBays)??info.landmark))
            structureOnSpan(type,row,start+length*k/architecturalBays,start+length*(k+1)/architecturalBays,w);
        }
        if(type==='floating'||type==='low_water_crossing')continue;
        const gap=suspended.get(edge);
        for(let k=1;k<bays;k++){
          if((++work&7)===0)yield;
          if(gap&&start+bay*k>gap[0]&&start+bay*k<gap[1])continue;
          for(const delta of [0,-5,5,-9,9]){
            if(Math.abs(delta)>=bay*.37)continue;
            const r=row(start+bay*k+delta);
            if(!inRange(r.x,r.z,4)||signatures?.covers(graph,r.x,r.z)||(options.authoredAt?.(edge,r.s)??info.landmark))break;
            if(roomForPier(edge,r)){addPier(edge,r,w,depth);break;}
          }
        }
      }
    }
    // Mapped footbridges have their own path and supports. Their stair or ramp
    // ways run from street level to the shared endpoint of the elevated deck.
    const footWays=[],ends=new Map();
    const pointKey=p=>Math.round(p.x*100)+','+Math.round(p.z*100);
    for(const way of options.footbridges||[]){
      if((++work&15)===0)yield;
      const points=[],dist=[];
      let length=0,visible=false;
      for(const p of way.points){
        const prev=points.at(-1);
        if(prev){
          const d=Math.hypot(prev.x-p.x,prev.z-p.z);
          if(d<.05)continue;
          length+=d;visible||=inRange((p.x+prev.x)/2,(p.z+prev.z)/2,d/2+8);
        }
        points.push(p);dist.push(length);
      }
      if(!visible||length<.5)continue;
      const foot={...way,points,dist,length,half:Math.min(4.5,Math.max(.55,(way.width||2.1)/2))};
      footWays.push(foot);
      if(foot.kind!=='deck')continue;
      const clearance=6.1+Math.max(0,(foot.layer||1)-1)*6.8;
      let top=-Infinity;
      for(const p of points)top=Math.max(top,ground(p.x,p.z)+clearance);
      for(let j=1;j<points.length;j++){
        const a=points[j-1],b=points[j],dx=b.x-a.x,dz=b.z-a.z;
        if((++work&7)===0)yield;
        for(const road of graph.nearby((a.x+b.x)/2,(a.z+b.z)/2,Math.hypot(dx,dz)/2+2)){
          const profile=bridgeInfo(road);
          if(!profile||profile.layer>=(foot.layer||1))continue;
          for(let k=1;k<road.points.length;k++){
            const c=road.points[k-1],d=road.points[k],rx=d.x-c.x,rz=d.z-c.z,det=dx*rz-dz*rx;
            if(Math.abs(det)<.0001)continue;
            const x=c.x-a.x,z=c.z-a.z,u=(x*rz-z*rx)/det,v=(x*dz-z*dx)/det;
            if(u>=0&&u<=1&&v>=0&&v<=1)top=Math.max(top,height(road,mix(road.dist[k-1],road.dist[k],v))+5.9);
          }
        }
      }
      foot.top=top;
      for(const p of [points[0],points.at(-1)]){
        const key=pointKey(p);
        if(!ends.has(key))ends.set(key,[]);
        ends.get(key).push(foot);
      }
    }
    const unseen=new Set(footWays.filter(way=>way.kind==='deck'));
    for(const first of unseen){
      const chain=[first];unseen.delete(first);
      let top=first.top;
      for(let i=0;i<chain.length;i++){
        const way=chain[i];top=Math.max(top,way.top);
        for(const p of [way.points[0],way.points.at(-1)])for(const next of ends.get(pointKey(p)))
          if(unseen.delete(next))chain.push(next);
      }
      for(const way of chain)way.top=top;
    }
    function landingHeight(foot,p){
      const adjacent=ends.get(pointKey(p))?.find(deck=>deck.layer===foot.layer);
      if(adjacent)return adjacent.top;
      // A stair sometimes joins an interior node of a long or simplified deck.
      for(const deck of footWays){
        if(deck.kind!=='deck'||deck.layer!==foot.layer)continue;
        for(let i=1;i<deck.points.length;i++){
          const a=deck.points[i-1],b=deck.points[i],dx=b.x-a.x,dz=b.z-a.z;
          const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
          if(Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)<1.35)return deck.top;
        }
      }
      return ground(p.x,p.z)+6.1+Math.max(0,(foot.layer||1)-1)*6.8;
    }
    for(const foot of footWays){
      yield;
      const {points,length,half,kind}=foot,first=points[0],last=points.at(-1);
      const bottom=ground(first.x,first.z)+.06;
      const top=foot.top??landingHeight(foot,last);
      const isDeck=kind==='deck',stairs=kind==='steps',rises=Math.max(1,Math.round(Math.abs(top-bottom)/.165));
      const row=rowSampler(foot,(_,s)=>isDeck?top:mix(bottom,top,s/length),false);
      const stations=new Set(foot.dist);
      for(let s=0;s<length;s+=12)stations.add(s);
      if(stairs)for(let i=1;i<rises;i++)stations.add(i*length/rises);
      let a=row(0);
      for(const s of [...stations].sort((u,v)=>u-v)){
        if((++work&15)===0)yield;
        if(s-a.s<.0001)continue;
        const b=row(s);
        if(inRange((a.x+b.x)/2,(a.z+b.z)/2,(s-a.s)/2+half)){
          const treadY=stairs?mix(bottom,top,Math.floor((a.s+s)*.5*rises/length)/rises):null;
          const front=treadY==null?a:{...a,y:treadY},back=treadY==null?b:{...b,y:treadY};
          ribbon(front,back,-half,half,.005,0xadafa6);
          if(stairs&&Math.abs(s*rises/length-Math.round(s*rises/length))<.00001)
            quad(at(back,-half),at(back,half),at(b,half),at(b,-half),0x878a83);
          ribbon(a,b,-half,half,-.34,soffit);
          for(const side of [-1,1]){
            const o=side*half;
            quad(at(front,o,.005),at(back,o,.005),at(b,o,-.34),at(a,o,-.34),girder);
            for(const h of [.47,1.04])beam(at(a,o,h),at(b,o,h),.065,.07,steel);
          }
        }
        a=b;
      }
      for(let s=0;s<length;s+=1.5){
        const r=row(s);
        if(!inRange(r.x,r.z,half)||(s%3&&Math.hypot(r.x-cx,r.z-cz)>320))continue;
        for(const side of [-1,1])beam(at(r,side*half,-.025),at(r,side*half,1.05),.075,.08,steel);
      }
      if(isDeck){
        const bays=Math.max(1,Math.ceil(length/28));
        for(let i=0;i<=bays;i++){
          const r=row(i*length/bays);
          if(!inRange(r.x,r.z,4)||!roomForPier(foot,r))continue;
          // Adjacent deck ways share one bent at their join.
          if((i===0||i===bays)&&ends.get(pointKey(r))?.[0]!==foot)continue;
          const base=ground(r.x,r.z)-.5;
          beam({...r,y:base},{...r,y:r.y-.67},.65,.79,0xa5aaa3);
          beam(at(r,-half*.94,-.5),at(r,half*.94,-.5),.78,.34,concrete);
          registerObstacle({id:'foot-pier:'+foot.id+':'+i,kind:'barrier',x:r.x-cx,z:r.z-cz,radius:.42,
            baseY:base,height:r.y-.65-base,parts:[]});
        }
      }
    }
    if(signatureHeight)signatures?.draw({graph,x:cx,z:cz,radius,deckHeight:signatureHeight,groundHeight:ground,beam});
    function mesh(vertices,mat,name,attributes){
      if(!vertices.length)return;
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
      for(const [key,buffer,size] of attributes)g.setAttribute(key,new T.Float32BufferAttribute(buffer,size));
      g.computeVertexNormals();
      const m=new T.Mesh(g,mat);m.name=name;m.castShadow=m.receiveShadow=true;group.add(m);
    }
    for(const {finish,positions,uv,carriageway} of decks.values()){
      yield;
      const attributes=[['uv',uv,2]];
      if(finish==='asphalt')attributes.push(['carriageway',carriageway,2]);
      mesh(positions,material[finish],'Mapped bridge decks',attributes);
    }
    if(faces.length)yield;
    mesh(faces,kit.faces,'Bridge fascia and markings',[['color',colors,3]]);
    if(tints.length){
      const members=new T.InstancedMesh(kit.box,kit.beams,tints.length);
      members.name='Bridge piers, rails and superstructures';members.castShadow=members.receiveShadow=true;
      members.instanceMatrix.array.set(poses);
      tints.forEach((color,i)=>members.setColorAt(i,tint.setHex(color)));
      group.add(members);
    }
  }
  window.buildBridgeMeshSteps=buildBridgeMeshSteps;
  window.buildBridgeMeshes=function(T,options){
    for(const step of buildBridgeMeshSteps(T,options)){ /* Finish synchronous builds. */ }
  };
})();
