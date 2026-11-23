'use strict';
(() => {
  // The two points are on the median between the mapped carriageways. They locate
  // the first and last main pylons (arch springings for Đông Trù and Bình Lợi).
  // Ba Son's second point sets the direction towards Thủ Thiêm.
  const bridges = [
    // IHI / JSCE, Nhật Tân, 150 + 4 × 300 + 150 m: www.jsce.or.jp/committee/concrete/e/newsletter/newsletter43/Newsletter43_files/Tanaka%20award/1.pdf
    {name:'Nhật Tân', a:[105.819069,21.089183], b:[105.823701,21.099096], form:'diamond',
      towers:5, outer:150, halfWidth:18, height:78, stays:11},
    // TEDI's drawings give twin decks and the 20 / 30 / 20 m parabolas: tedi.vn/wp-content/uploads/2018/05/4.pdf
    {name:'Đông Trù', a:[105.878845,21.070094], b:[105.877360,21.072202], form:'arch',
      spans:[80,120,80], rises:[20,30,20], halfWidth:26, paint:0xe6e7e2},
    // Shimizu, single central plane: www.shimz-global.com/vn/en/works/detail/index.html?id=277
    // 50 m navigation clearance: dulich.quangninh.gov.vn/Trang/ChiTietTinTuc.aspx?Page=4&nid=807
    {name:'Bãi Cháy', a:[107.064007,20.960834], b:[107.067882,20.959353], form:'median',
      towers:2, outer:205, halfWidth:12.7, height:90, stays:14, clearance:50},
    // Upper deck, twin 90 m spans and a parabolic transverse pylon. The 150 m roundabout below is a separate OSM road.
    // TEDI design and sections: tedi.vn/wp-content/uploads/2016/12/6-1.pdf
    {name:'Cầu vượt Ngã ba Huế', a:[108.178826,16.062036], b:[108.179626,16.062646], form:'parabolic',
      halfWidth:9.9, height:48, outer:90},
    // Road bridge on Phạm Văn Đồng, two parallel Nielsen arches: baochinhphu.vn/lap-vom-thep-thu-2-tren-cau-binh-loi-102115203.htm
    {name:'Bình Lợi', a:[106.708901,10.824488], b:[106.710225,10.824842], form:'arch',
      spans:[150], rises:[35], halfWidth:28, paint:0xc7432f, inclinedHangers:true},
    // WSP / Freyssinet, 200 + 115 m, pylon curves toward Thủ Thiêm: www.wsp.com/en-us/projects/thu-thiem-2-cable-stayed-bridge
    {name:'Ba Son', a:[106.710125,10.779562], b:[106.710925,10.779125], form:'curved',
      halfWidth:13.5, height:91, clearance:10},
    // Main span 380 m; H-frame towers. www.norway-steel.no/project/phu-my-bridge
    {name:'Phú Mỹ', a:[106.742693,10.744060], b:[106.745812,10.745571], form:'portal',
      towers:2, outer:162.5, halfWidth:14, height:94, stays:18, crossbar:.36, clearance:45},
    // The original QL1 bridge, 350 m between H towers, 128 stays. www.concrete.org/publications/internationalconcreteabstractsportal.aspx?id=11400
    {name:'Mỹ Thuận', a:[105.910603,10.275936], b:[105.909492,10.278895], form:'portal',
      towers:2, outer:155, halfWidth:12.7, height:80, stays:16, crossbar:.82, clearance:37.5},
    // DFAT, 150 + 350 + 150 m, H towers and two semi-fan planes: www.dfat.gov.au/sites/default/files/cao-lanh-inception-report-pd.pdf
    {name:'Cao Lãnh', a:[105.651708,10.410903], b:[105.651973,10.414048], form:'portal',
      towers:2, outer:150, halfWidth:13, height:80, stays:16, crossbar:.66, clearance:37.5},
    // Actual tower and cable geometry take precedence over the suspension tag on some OSM ways.
    // JICA, table 12.7 and fig. 12.44: openjicareport.jica.go.jp/pdf/12384244_02.pdf
    {name:'Cần Thơ', a:[105.810730,10.033292], b:[105.814622,10.036423], form:'invertedY',
      towers:2, outer:257, halfWidth:13.8, height:119, stays:27, cable:0xc45337, clearance:39}
  ];

  const projections = new WeakMap();
  function projected(graph) {
    if (projections.has(graph)) return projections.get(graph);
    const shapes = bridges.map(bridge => {
      const a = graph.point(...bridge.a), b = graph.point(...bridge.b);
      const length = Math.hypot(b.x-a.x,b.z-a.z);
      const ux = (b.x-a.x)/length, uz = (b.z-a.z)/length;
      const start = bridge.form === 'curved' ? -200 : -(bridge.outer || 0);
      const end = bridge.form === 'curved' ? 115 : bridge.form === 'parabolic' ? bridge.outer : length + (bridge.outer || 0);
      return {bridge,a,length,ux,uz,start,end};
    });
    projections.set(graph,shapes);
    return shapes;
  }
  function within(shape,x,z,margin) {
    const {a,ux,uz,start,end,bridge} = shape, dx=x-a.x, dz=z-a.z;
    const along=dx*ux+dz*uz, across=dz*ux-dx*uz;
    return along>=start-margin && along<=end+margin && Math.abs(across)<=bridge.halfWidth+margin;
  }
  function covers(graph,x,z) {
    return projected(graph).some(shape=>within(shape,x,z,2));
  }
  // Main-channel navigation clearance in metres. The road profile builds its approaches independently.
  // DFAT: www.dfat.gov.au/sites/default/files/my_thuan_monitoring_report.pdf
  // Cần Thơ: baochinhphu.vn/niem-vui-lon-tu-doi-bo-song-hau-10233044.htm
  // Phú Mỹ: bmt-group.vn/en/phu-my-bridge-pj1
  // Ba Son: WSP, Integration of FEM Analysis and Construction Geometry Management, 31. Dresdner Brückenbausymposium.
  function clearance(graph,x,z) {
    return projected(graph).find(shape=>shape.bridge.clearance && within(shape,x,z,2))?.bridge.clearance ?? null;
  }

  const concrete=0xc3c3b9, cableSteel=0xd0d5d2, sockets=0x82867e;
  // Relative stations and offsets in metres. Elevation follows the simulated deck
  // at each station, including the rise on the two sides of the river.
  function draw({graph,x,z,radius,deckHeight,groundHeight,beam}) {
    for (const shape of projected(graph)) {
      if (!within(shape,x,z,radius)) continue;
      const {bridge,a,length,ux,uz} = shape;
      const heights=new Map();
      function point(station,side,rise) {
        const cx=a.x+ux*station, cz=a.z+uz*station;
        if (!heights.has(station)) heights.set(station,deckHeight(cx,cz,ux,uz));
        const h=heights.get(station);
        if (!Number.isFinite(h)) return null;
        return {x:cx-uz*side, y:h+rise, z:cz+ux*side};
      }
      function bar(from,to,width,depth,color) {
        if (from && to) beam(from,to,width,depth,color);
      }
      // OSM draws one line per direction even on a single physical deck.
      // Carry its slab beneath both asphalt ribbons, the median and shoulders.
      // The two parallel arch structures keep their individual decks.
      if(bridge.form!=='arch'&&bridge.form!=='parabolic'){
        const {start,end}=shape,count=Math.ceil((end-start)/12);
        let prev=point(start,0,-.78);
        for(let i=1;i<=count;i++){
          const next=point(start+(end-start)*i/count,0,-.78);
          bar(prev,next,bridge.halfWidth*2,1.25,0xabaea7);
          prev=next;
        }
      }
      // Broad footings sit at the actual main piers, clear of river traffic
      // and the lower circular carriageway of the Đà Nẵng interchange.
      function pier(station,topSide,footSide,width,depth) {
        const top=point(station,topSide,-1.5), foot=point(station,footSide,-1.5);
        if (!top || !foot) return;
        const ground=groundHeight?.(foot.x,foot.z);
        foot.y=Number.isFinite(ground)?Math.min(top.y-2,ground-4.5):top.y-32;
        bar(foot,top,width,depth,concrete);
      }
      if (bridge.form==='arch') drawArches(bridge,length,point,bar,pier);
      else if (bridge.form==='curved' || bridge.form==='parabolic') drawSinglePylon(bridge,point,bar,pier);
      else drawTowers(bridge,length,point,bar,pier);
    }
  }

  function drawTowers(bridge,length,point,bar,pier) {
    const {form,height,halfWidth,outer,stays,towers}=bridge, spacing=length/(towers-1);
    const tint=bridge.cable||cableSteel;
    for (let i=0;i<towers;i++) {
      const station=i*spacing;
      const level=(side,h)=>point(station,side,h);
      bar(level(-halfWidth,-1.6),level(halfWidth,-1.6),6.8,2.2,concrete);
      if (form==='median') pier(station,0,0,8,8);
      else for (const side of [-1,1]) pier(station,side*halfWidth,side*halfWidth*(form==='portal' ? .94 : .61),4.4,6.2);
      if (form==='median') {
        bar(level(0,-1.4),level(0,height),3.5,5,concrete);
      } else if (form==='portal') {
        for (const side of [-1,1]) bar(level(side*halfWidth,-2),level(side*halfWidth,height),2.8,4,concrete);
        bar(level(-halfWidth,height*bridge.crossbar),level(halfWidth,height*bridge.crossbar),3,3.4,concrete);
      } else {
        const joint = form==='invertedY' ? .45 : .79;
        for (const side of [-1,1]) bar(level(side*halfWidth,-1.8),level(0,height*joint),3,4.6,concrete);
        bar(level(0,height*joint),level(0,height),3.6,4.6,concrete);
        if (form==='diamond') bar(level(0,height*.95),level(0,height+.5),3.7,4.7,0xbf4935);
      }
      for (const forward of [-1,1]) {
        const reach=(i===0 && forward<0 || i===towers-1 && forward>0) ? outer : spacing/2;
        const sides=form==='median' ? [0] : [-1,1];
        for (const side of sides) {
          for (let j=1;j<=stays;j++) {
            const t=j/stays, d=reach*(.09+.88*t);
            const h=form==='diamond' ? height*(.67+.24*t) : height*(.48+.49*t);
            const head=form==='portal' ? side*halfWidth : form==='diamond' ? side*halfWidth*Math.max(0,1-h/(height*.79)) : 0;
            const foot=point(station+forward*d,side*halfWidth,.4);
            bar(level(head,h),foot,.18,.18,tint);
            bar(foot,point(station+forward*d,side*halfWidth,1.0),.45,.56,sockets);
          }
        }
      }
    }
    if (form==='diamond') {
      // Nhật Tân's red outer girders also mark the main spans from the riverbank.
      const start=-outer, end=length+outer, segments=Math.ceil((end-start)/30);
      for (let i=0;i<segments;i++) for (const side of [-1,1]) {
        const d0=start+(end-start)*i/segments, d1=start+(end-start)*(i+1)/segments;
        bar(point(d0,side*halfWidth,-.9),point(d1,side*halfWidth,-.9),.48,1.55,0xb54b37);
      }
    }
  }

  function drawArches(bridge,length,point,bar,pier) {
    const {spans,rises,halfWidth,paint,inclinedHangers}=bridge;
    const total=spans.reduce((sum,span)=>sum+span,0);
    let start=0;
    function support(station) {
      bar(point(station,-halfWidth,-1.5),point(station,halfWidth,-1.5),3.8,1.6,concrete);
      for (const side of [-1,1]) pier(station,side*halfWidth*.52,side*halfWidth*.52,5.2,4.3);
    }
    support(start);
    for (let n=0;n<spans.length;n++) {
      const span=spans[n]*length/total, rise=rises[n], count=Math.ceil(span/6);
      for (const side of [-1,1]) {
        // Two independent arch bridges, one on either side of the median.
        const outer=side*(halfWidth-1), inner=side*1.45;
        const rib=(k,offset,dy=0)=> {
          const t=k/count;
          return point(start+span*t,offset,.42+4*t*(1-t)*rise+dy);
        };
        for (let k=1;k<=count;k++) {
          for (const offset of [inner,outer]) {
            bar(rib(k-1,offset),rib(k,offset),1.0,inclinedHangers?1.55:1.15,paint);
            if (!inclinedHangers) bar(rib(k-1,offset,-1.55),rib(k,offset,-1.55),.85,1.1,paint);
            if (k===count) continue;
            const shift=inclinedHangers ? (k%2===0?1:-1)*.9 : 0;
            bar(rib(k,offset),point(start+span*(k+shift)/count,offset,.5),.12,.12,cableSteel);
          }
          if (k%3===0 && k/count>.12 && k/count<.88) {
            bar(rib(k,inner),rib(k,outer),.58,.58,paint);
            if (!inclinedHangers) bar(rib(k-2,inner),rib(k,outer),.3,.3,paint);
          }
        }
      }
      start+=span;
      support(start);
    }
  }

  function drawSinglePylon({form,height,halfWidth},point,bar,pier) {
    const flyover=form==='parabolic', count=flyover?11:14;
    for (const side of [-1,1]) {
      const foot=side*(halfWidth+(flyover?7:1));
      // Ba Son's A frame leans east along the bridge; at Ngã ba Huế the
      // transverse parabola and golden stays frame the upper road.
      const spine=t=>point(flyover?0:28*t*t,foot*(flyover?Math.sqrt(1-t):1-t),height*t);
      pier(0,foot,foot*(flyover?1.14:1.05),flyover?3:4,flyover?4:6);
      for (let i=1;i<=16;i++) {
        const t=i/16;
        bar(spine((i-1)/16),spine(t),flyover?2.5:3.6-1.8*t,flyover?3.8:7-3*t,concrete);
      }
      for (let i=1;i<=count;i++) {
        const t=i/count, h=(flyover ? .40 : .24)+(flyover ? .56 : .72)*t;
        for (const direction of [-1,1]) {
          const d=flyover ? 12+(i-1)*7.2 : direction<0 ? 200*(.08+.91*t) : 115*(.34+.65*t);
          bar(spine(h),point(direction*d,side*(halfWidth-.7),.55),.2,.2,flyover?0xeeb349:cableSteel);
        }
      }
    }
  }

  window.VietnamBridgeSignatures={draw,covers,clearance};
})();
