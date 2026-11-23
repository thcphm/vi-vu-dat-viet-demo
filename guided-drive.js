'use strict';

function guidedLegPoints(graph, edge, from, to) {
  const at = s => graph.sample({edge, s, dir:1});
  const middle = edge.points.filter((_, i) => edge.dist[i] > Math.min(from,to) && edge.dist[i] < Math.max(from,to));
  if (from > to) middle.reverse();
  return [at(from), ...middle, at(to)];
}

// Find a legal return to the last part of the route actually driven. Search only
// the streamed road graph, on edge+direction states to respect turn restrictions.
function findGuidedReturn(graph, cursor, target) {
  const queue = [], best = new Map(), goal = graph.sample(target);
  function offer(c, cost, parent) {
    const arrives = c.edge.id === target.edge.id && (target.s-c.s)*c.dir >= 0;
    const to = arrives ? target.s : c.dir > 0 ? c.edge.length : 0;
    const key = c.edge.id+':'+c.dir+':'+arrives;
    const distance = cost+Math.abs(to-c.s);
    if (distance >= (best.get(key) ?? Infinity)) return;
    best.set(key,distance);
    const p = graph.sample({...c,s:to});
    const estimate = distance+Math.hypot(p.x-goal.x,p.z-goal.z);
    queue.push({c,to,distance,estimate,parent,arrives,key});
  }
  if (cursor.dir > 0 || !cursor.edge.oneway) offer(cursor,0,null);
  if (cursor.dir < 0 || !cursor.edge.oneway) offer({...cursor,dir:-cursor.dir},0,null);
  while (queue.length) {
    queue.sort((a,b)=>b.estimate-a.estimate);
    const step = queue.pop();
    if (step.distance !== best.get(step.key)) continue;
    if (step.arrives) {
      const legs = [];
      for (let p=step;p;p=p.parent) legs.unshift(p);
      return {turnAround:legs[0].c.dir!==cursor.dir,
        points:legs.flatMap(p=>guidedLegPoints(graph,p.c.edge,p.c.s,p.to))};
    }
    for (const option of graph.options(step.c)) offer(option,step.distance,step);
  }
  return null;
}


async function measureFeaturedDrive(graph, route) {
  const missing = new Set(route.edges.map(Math.abs));
  const edges = new Map();
  function keep(edge) {
    if (edge && missing.delete(edge.id)) edges.set(edge.id,edge);
  }
  for (const id of missing) keep(graph.edges.get(id));
  for (const key of route.tiles) {
    if (!missing.size) break;
    const tile = await graph.tile(key);
    for (const row of tile.rows) if (missing.has(row[0])) keep(graph.decodeEdge(row));
  }
  if (missing.size) throw Error('Chưa tải đủ dữ liệu đường của tuyến này.');
  const endpoint = (coords, id) => {
    const edge=edges.get(Math.abs(id)), p=graph.point(...coords);
    const nearest=graph.nearest(p.x,p.z,[edge]), snapped=graph.sample(nearest);
    return {fraction:nearest.s/edge.length, coords:graph.geo(snapped.x,snapped.z)};
  };
  const a=endpoint(route.start,route.edges[0]), b=endpoint(route.finish,route.edges.at(-1));
  return {...route,start:a.coords,finish:b.coords,startFraction:a.fraction,finishFraction:b.fraction,
    lengths:route.edges.map(id=>edges.get(Math.abs(id)).length)};
}

function createGuidedDrive(graph, route, resume=null) {
  const legs=[], occurrences=new Map(), paths=new WeakMap();
  let length=0;
  route.edges.forEach((signed,i)=>{
    const id=Math.abs(signed), dir=Math.sign(signed), metres=route.lengths[i];
    const from=i===0?route.startFraction:dir>0?0:1;
    const to=i===route.edges.length-1?route.finishFraction:dir>0?1:0;
    const leg={id,dir,from,to,metres,index:i,offset:length};
    legs.push(leg);
    if (!occurrences.has(id)) occurrences.set(id,[]);
    occurrences.get(id).push(leg);
    length+=Math.abs(to-from)*metres;
  });
  const first=legs[0], startEdge=graph.edges.get(first?.id);
  if ((!startEdge && !resume) || !Number.isFinite(length)) throw Error('Chưa tải được đường tại điểm xuất phát.');
  if (length<15) throw Error('Hai điểm quá gần nhau. Hãy chọn điểm đến xa hơn.');
  const start=resume?.cursor || {edge:startEdge,dir:first.dir,s:startEdge.length*first.from};
  let progress=Math.max(0,Math.min(resume?.progress||0,length));
  let current=legs.find(l=>l.offset+Math.abs(l.to-l.from)*l.metres>=progress)||first;
  let anchor=start, offRoute=false, wrongWay=false, returnKey='', detour=null;
  const finish=graph.point(...route.finish);
  return {
    route, start, finish, length, timeMs:null,
    get detour(){return detour;},
    get remaining(){return Math.max(0,length-progress);},
    get progress(){return progress;},
    // Geometry comes from the same streaming tiles used to drive. Even a long
    // cross-country journey draws only the roads inside the current map view.
    visiblePaths(edges) {
      const visible=[];
      for(const edge of edges) {
        const parts=occurrences.get(edge.id);
        if(!parts)continue;
        if(!paths.has(edge))paths.set(edge,parts.map(l=>guidedLegPoints(graph,edge,l.from*edge.length,l.to*edge.length)));
        visible.push(...paths.get(edge));
      }
      return visible;
    },
    update(cursor,onRoad) {
      if(this.timeMs!==null)return false;
      const ratio=cursor.s/cursor.edge.length;
      let leg=null,along=0,nearest=Infinity;
      for(const candidate of occurrences.get(cursor.edge.id)||[]){
        const position=candidate.offset+(ratio-candidate.from)*candidate.dir*candidate.metres;
        // A dead-end turnaround reuses one edge in both directions.
        const delta=Math.abs(position-progress)+(candidate.dir===cursor.dir?0:14);
        if(delta<nearest){leg=candidate;along=position;nearest=delta;}
      }
      // Featured times require continuous progress. Custom trips can rejoin
      // a later leg after a detour without having to drive back to a checkpoint.
      offRoute=!onRoad || !leg || (route.id && (along>progress+45 || along<progress-65));
      wrongWay=!offRoute && cursor.dir!==leg.dir;
      if(!offRoute){
        detour=null;returnKey='';
        if(!wrongWay && (along>=progress || !route.id)){
          progress=Math.max(0,Math.min(length,along));current=leg;anchor={...cursor};
        }
        return !wrongWay && leg===legs.at(-1) && Math.abs(ratio-leg.to)*leg.metres<=12 && progress>=length-12;
      }
      const key=cursor.edge.id+':'+cursor.dir+':'+String(graph.signature);
      if(onRoad && key!==returnKey){
        returnKey=key;detour=null;
        if(graph.edges.has(anchor.edge.id)){
          const p=graph.sample(cursor), q=graph.sample(anchor);
          if(Math.hypot(p.x-q.x,p.z-q.z)<2000)detour=findGuidedReturn(graph,cursor,anchor);
        }
      }
      return false;
    },
    instruction() {
      if(offRoute)return detour?(detour.turnAround?'↶ Quay đầu khi an toàn':'Lệch tuyến')+' · Theo nét đứt về tuyến':'Lệch tuyến · Trở về vệt xanh trên bản đồ';
      if(wrongWay)return '↶ Sai hướng · Quay đầu khi an toàn';
      for(let i=current.index+1;i<legs.length && legs[i].offset-progress<=160;i++){
        const prev=legs[i-1],next=legs[i],edge=graph.edges.get(prev.id);
        if(!edge || next.offset-progress<3)continue;
        if(prev.id===next.id && prev.dir!==next.dir)return '↶ Quay đầu sau '+Math.ceil(next.offset-progress)+' m';
        const options=graph.options({edge,dir:prev.dir,s:prev.to*edge.length});
        const turn=options.find(o=>o.edge.id===next.id && o.dir===next.dir);
        if(!turn || options.length===1 && Math.abs(turn.angle)<.55)continue;
        const label=turn.angle<-.38?'← Rẽ trái':turn.angle>.38?'→ Rẽ phải':'↑ Đi thẳng';
        return label+' sau '+Math.ceil(next.offset-progress)+' m';
      }
      return length-progress<160?'⚑ Điểm đến phía trước':'↑ Tiếp tục theo vệt xanh';
    }
  };
}
