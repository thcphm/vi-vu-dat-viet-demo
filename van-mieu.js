'use strict';
// The entrance is on Quốc Tử Giám street. Inside the monument, each stop
// keeps its own mapped location while the car stays at the public approach.
(() => {
  const survey=window.VanMieuSurvey,atlas=window.VietnamTourism;
  const byRef=new Map(survey.features.map(f=>[f.ref,f]));
  const ids=new Map(atlas.entries.map(s=>[s.id,s]));
  const idOf=ref=>'osm-'+({w:'way',n:'node',r:'relation'})[ref[0]]+'-'+ref.slice(1);
  const canonical={w702185155:'khue-van-cac',w1582901993:'osm-relation-21422526'};
  const visitId=ref=>canonical[ref]||idOf(ref);
  const start=[105.8353754,21.0273187];
  const stops=['w702185143','n6594592049','w702241281','w702241280','w702185144','w702241362','w702241363',
    'w702185155','w702185149','w702185150','w37934144','w702185156','w702185157','w702185158','w702185159',
    'w702185160','w702185162','w702185163','w702185164','w702185165','w702185166','w702185176','n1000087430',
    'w702185187','w702185188','w702185189','w702185186','w702185190','w702241331','w37934138','w37934139',
    'w702241326','w702241324','w702241325','n1000087332','w1582901993','w702185145','w178995315','w9964421','n12690252301'];
  const nodes={w702185143:4,w702185144:6,w702185155:8,w37934144:10,w702185157:11,
    w702185176:21,w702185190:22,w702241331:23,w702241326:25,w702241324:31,w702241325:30};
  survey.byRef=byRef;
  survey.stopIds=stops.map(visitId);
  survey.panoramaNodes=new Map(stops.map((ref,i)=>[survey.stopIds[i],nodes[ref]]));
  survey.panoramaNodes.set('van-mieu-quoc-tu-giam',4);
  survey.refStops=new Map(stops.map((ref,i)=>[ref,survey.stopIds[i]]));
  survey.stopName=f=>{
    if(!f.steleRows)return f.name;
    const first=f.steleRows[0].year;
    return f.steleRows.length===1?'Bi đình · khoa '+first:'Nhà bia · dãy có bia khoa '+first;
  };
  survey.refStops.set('w702185142',idOf('w702185143'));
  survey.refStops.set('w702241323',idOf('w702241326'));
  survey.refStops.set('r2388849',idOf('w178995315'));
  // Packed clients already contain the indexed stops. During source builds
  // add them before visitor-atlas creates its spatial index.
  if(atlas.files)return;
  for(const ref of stops){
    if(ref==='w702185155')continue;
    const f=byRef.get(ref),points=f.rings[0];
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const lon=(Math.min(...xs)+Math.max(...xs))/2,lat=(Math.min(...ys)+Math.max(...ys))/2;
    const existing=ids.get(visitId(ref));
    const entry={...existing,id:visitId(ref),name:survey.stopName(f),
      lon,lat,kind:'Di tích',city:'Hà Nội',locality:'Hà Nội',province:'Hà Nội',region:'Bắc Bộ',start,
      visitOnArrival:true,mappedEntrance:true,arrivalNote:'Xe dừng trên phố Quốc Tử Giám, trước lối vào Văn Miếu.',
      approachMeters:Math.round(Math.hypot((lon-start[0])*111320*Math.cos(lat*Math.PI/180),(lat-start[1])*110900)),
      map:'https://www.openstreetmap.org/'+(ref[0]==='n'?'node/':'way/')+ref.slice(1),source:survey.source};
    if(existing)Object.assign(existing,entry);
    else atlas.entries.push(entry);
  }
})();
