'use strict';
(()=>{
  // Local frame: +Z runs from the main hall down the sacred axis to Văn Miếu Môn
  // and Đường Chu Văn An. Footprints follow OSM ways 984292068–984292075,
  // 998734952 and 1058035743, in metres.
  // Colours follow site photographs: emerald glazed tiles, cream walls and posts,
  // cobalt ridge dragons, a terracotta ceremonial court and a green pond.
  const jade=[0x2f9a63,0x27895a,0x1f7a4d],plaster=0xf3ead2,ochre=0xefe7d2,stone=0xb9b3a4,paving=0xcfc8b6,
    lacquer=0x9a2f26,door=0x4a342c,dark=0x3a2a25,gilt=0xd9b24a,granite=0x9a978f,water=0x4aa890,bronze=0x6d5a3a,
    post=0xead7a2,footing=0x9a4038,dragon=0x2b4f9e,terracotta=0xc56f58,fret=0x3f9f7a;

  // Glazed tile courses with the eave lifting towards each hip.
  function tileRoof(T,k,x,y,z,width,depth,rise){
    const bands=jade.map(()=>[]),rows=Math.max(5,Math.round(depth*.6)),ridge=width/2-Math.min(depth*.34,width*.25);
    for(let side=0;side<4;side++){
      const cols=Math.max(5,Math.ceil((side%2?depth:width)/.9));
      const point=(u,v)=>{
        const edge=width/2*(1-v)+ridge*v,span=depth/2*(1-v),a=u*2-1;
        const px=side===0?a*edge:side===1?edge:side===2?-a*edge:-edge;
        const pz=side===0?span:side===1?-a*span:side===2?-span:a*span;
        return [px,rise*(.53*v+.47*v*v)+Math.pow(Math.abs(a),5)*(1-v)**3*.75,pz];
      };
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const u=i/cols,w=(i+1)/cols,v=j/rows,t=(j+1)/rows;
        const a=point(u,v),b=point(w,v),c=point(w,t),d=point(u,t),n=(i*17+j*31+side*11+i*j*7)%15;
        bands[n<7?0:n<12?1:2].push(...a,...b,...c,...a,...c,...d);
      }
    }
    bands.forEach((data,i)=>{
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data,3));geo.computeVertexNormals();
      k.stamp(geo,jade[i],x,y,z);geo.dispose();
    });
    k.box(plaster,x,y+rise+.14,z,ridge*2+.3,.34,.42);
    for(const f of [-1,1]){
      k.box(jade[2],x,y-.05,z+f*depth/2,width,.16,.16);
      k.box(jade[2],x+f*width/2,y-.05,z,.16,.16,depth);
      // Upswept ridge finials.
      k.outline([[0,0],[f*.5,.1],[f*1.0,.9],[f*1.05,1.2],[f*.7,1.0],[f*.56,.56],[f*.2,.36],[0,.34]],dragon,x+ridge*f,y+rise+.14,z-.14,.28);
    }
    k.stamp(k.round,dragon,x,y+rise+.62,z,.34,.34,.34);
  }

  // A timber hall on a stone plinth. `tiers` stacks a second roof on an attic band.
  function hall(T,k,{w,d,floor=.9,wall=4.2,tiers=2,bays=5,open=false,steps=true}){
    k.box(stone,0,floor/2,0,w+1.6,floor,d+1.6);
    if(steps)for(let i=0;i<4;i++)k.box(i%2?stone:paving,0,floor*(3.5-i)/4/2+.01,d/2+1.0+i*.36,Math.min(w*.5,9),floor*(3.5-i)/4,.4);
    const cols=bays+1,zz=d/2-.35;
    for(const f of open?[-1,1]:[1])for(let i=0;i<cols;i++){
      const x=(i/bays-.5)*(w-.8);
      k.stamp(k.round,footing,x,floor+.3,f*zz,.36,.6,.36);
      k.stamp(k.round,post,x,floor+wall/2,f*zz,.26,wall,.26);
    }
    if(open){
      for(const f of [-1,1])k.box(dark,f*(w/2-.4),floor+wall-.2,0,.3,.4,d-.7);
    }else{
      k.box(plaster,0,floor+wall/2,-d*.08,w-.9,wall,d*.78);
      k.box(door,0,floor+wall/2,d*.31,w-1.2,wall,.24);
      for(let i=0;i<bays;i++){
        const x=((i+.5)/bays-.5)*(w-1.2),bw=(w-1.2)/bays;
        k.box(dark,x,floor+wall*.42,d*.31+.14,bw*.8,wall*.78,.14);
        k.box(lacquer,x,floor+wall*.9,d*.31+.16,bw*.6,.12,.1);
      }
    }
    for(const f of [-1,1])k.box(dark,0,floor+wall-.18,f*zz,w-.4,.36,.34);
    const eave=floor+wall+.12,r1=Math.min(d*.24,3.4);
    tileRoof(T,k,0,eave,0,w+2.6,d+2.6,tiers>1?r1:Math.min(d*.34,4.6));
    if(tiers>1){
      const aw=w*.66,ad=d*.56,ay=eave+r1*.5,ah=1.25;
      k.box(plaster,0,ay+ah/2,0,aw,ah,ad);
      for(let i=0;i<=bays;i++)k.box(fret,(i/bays-.5)*(aw-.4),ay+ah/2,ad/2+.03,.12,ah*.7,.06);
      tileRoof(T,k,0,ay+ah,0,aw+2.4,ad+2.4,Math.min(ad*.36,4.4));
    }
  }

  function stele(k,floor,h=2.7){
    k.box(granite,0,floor+.28,0,2.3,.56,1.5);
    k.box(0x77736d,0,floor+.56+h/2,0,1.5,h,.34);
    k.outline([[-.75,0],[.75,0],[.6,.42],[0,.62],[-.6,.42]],0x77736d,0,floor+.56+h,-.17,.34);
    for(const f of [-1,1])k.box(gilt,0,floor+.56+h*.52,f*.18,1.0,h*.7,.02);
  }

  window.VietnamSights??=[];
  window.VietnamSights.push({
    id:'van-mieu-tran-bien',name:'Văn miếu Trấn Biên',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.8015425,lat:10.9640251,start:[106.8015974,10.9631207],bearing:0,width:104,depth:196,yaw:.0754,viewDistance:1300,
    map:'https://www.openstreetmap.org/way/972604565',
    source:'https://vi.wikipedia.org/wiki/V%C4%83n_mi%E1%BA%BFu_Tr%E1%BA%A5n_Bi%C3%AAn',
    description:'Văn miếu đầu tiên ở Nam Bộ, dựng năm 1715 và phục dựng năm 1998–2002 tại Bửu Long. Trục thần đạo đi từ Văn Miếu Môn qua nhà bia, Khuê Văn Các, hồ Tịnh Quang, Đại Thành Môn, nhà bia Khổng Tử rồi tới Bái đường, tất cả lợp ngói lưu ly xanh ngọc.',
    boundary:[[-52,-100],[52,-100],[52,93],[-52,93]],
    modeledBuildings:['w984292068','w984292069','w984292070','w984292071','w984292072','w984292073','w984292074','w984292075','w1058035743'],
    // Lawns between the halls stay free for the roadside planting.
    reserve:(x,z,r)=>Math.abs(x)<52+r&&z>-100-r&&z<93+r&&(
      Math.abs(x)<5+r||Math.abs(Math.abs(x)-51)<1.5+r||z>91-r||z<-98+r||
      [[0,88.8,15,4],[0,70.7,6,6],[0,46.7,9,7],[0,8.2,21,21],[39.6,14.8,12,18],[-37.7,14.3,12,18],[0,-22,10,4],
       [0,-40.7,7,6],[0,-58,22,10],[-38.5,-49.7,11,15],[34.7,-50,9,15],[0,-83.2,26,16]]
        .some(([cx,cz,w,d])=>Math.abs(x-cx)<w+r&&Math.abs(z-cz)<d+r)),
    solids:[[0,70.7,4,4],[0,46.7,7,5],[39.6,14.8,10,15.5],[-37.7,14.3,9.5,15.5],[0,-40.7,5,3.5],
      [-38.5,-49.7,8.6,12.8],[34.7,-50,6,13],[0,-83.2,23,13]],
    build(T,k){
      const {box,stamp,round,place,palette,sign}=k;
      palette({glazedTile:[...jade,dragon],plaster:[plaster,ochre,post,fret],stone:[stone,paving,granite,0x77736d],brick:[terracotta,footing],timber:[lacquer,door,dark],metal:[gilt,bronze],glass:water});

      // Sacred way, courts and the precinct wall.
      box(paving,0,.16,-3,8,.32,186);
      box(terracotta,0,.2,-58,44,.4,22);
      box(paving,0,.16,30,58,.32,6);
      for(const f of [-1,1]){
        for(const [z0,z1] of [[-99,-4],[-4,91]]){
          box(ochre,f*51,1.25,(z0+z1)/2,.5,2.5,z1-z0);box(jade[1],f*51,2.6,(z0+z1)/2,.9,.22,z1-z0);
        }
        box(ochre,f*33,1.25,88.8,36,2.5,.5);box(jade[1],f*33,2.6,88.8,36,.22,.9);
        box(ochre,f*26,1.25,-99,52,2.5,.5);box(jade[1],f*26,2.6,-99,52,.22,.9);
      }

      // Văn Miếu Môn: three passages under stepped roofs.
      place(0,88.8,0,()=>{
        for(const x of [-11,-5.4,-2.5,2.5,5.4,11])box(plaster,x,x*x<9?3.4:2.5,0,x*x<9?1.5:1.3,x*x<9?6.8:5,3.6);
        box(plaster,0,6.1,0,6.5,1.5,3.6);
        for(const f of [-1,1]){box(plaster,f*8.2,4.5,0,6.9,1.1,3.6);box(fret,f*8.2,2.0,0,4.3,.12,.2);}
        tileRoof(T,k,0,6.9,0,10.4,6.2,1.9);
        box(plaster,0,8.2,0,5.2,1.0,2.6);tileRoof(T,k,0,8.7,0,8.2,5.0,1.7);
        for(const f of [-1,1])tileRoof(T,k,f*8.2,5.1,0,9.2,5.6,1.6);
        sign('VĂN MIẾU MÔN',0,6.15,1.86,4.6,.82);
        for(const x of [-2.5,2.5,-5.4,5.4])box(footing,x,.35,1.85,1.56,.7,.12);
      });

      // Stele house, Khuê Văn Các and the square pond.
      place(0,70.7,0,()=>{hall(T,k,{w:7.4,d:7.0,floor:.7,wall:3.8,bays:3,open:true});stele(k,.7);});
      place(0,46.7,0,()=>{
        box(stone,0,.4,0,14.4,.8,10.6);
        for(const x of [-5.6,-1.9,1.9,5.6])for(const z of [-3.9,3.9])box(plaster,x,2.9,z,.85,4.2,.85);
        box(dark,0,5.15,0,12.6,.3,9.0);
        tileRoof(T,k,0,5.3,0,15.4,11.6,1.5);
        box(plaster,0,7.6,0,9.0,3.0,6.2);
        for(const f of [-1,1]){
          stamp(round,fret,0,7.7,f*3.13,1.05,.06,1.05,0,Math.PI/2);
          for(const x of [-3.1,3.1])box(dark,x,7.6,f*3.13,1.5,1.9,.06);
        }
        for(const f of [-1,1])stamp(round,fret,f*4.53,7.7,0,.9,.06,.9,0,0,Math.PI/2);
        tileRoof(T,k,0,9.15,0,11.4,8.6,2.5);
        sign('KHUÊ VĂN CÁC',0,6.6,3.2,3.6,.62);
      });
      box(granite,0,.3,8.2,39.6,.6,38.6);box(water,0,.33,8.2,37.4,.6,36.4);
      for(const x of [-19.5,19.5])for(let z=-9;z<=26;z+=3.5)box(fret,x,.85,z,.24,.5,.24);
      for(const f of [-1,1]){
        box(fret,f*19.5,1.12,8.2,.2,.14,38.6);box(fret,0,1.12,8.2+f*19.1,39.6,.14,.2);
      }
      place(39.6,14.8,-Math.PI/2,()=>hall(T,k,{w:29,d:17.4,floor:.8,wall:4.0,bays:7}));
      place(-37.7,14.3,Math.PI/2,()=>hall(T,k,{w:29,d:16.6,floor:.8,wall:4.0,bays:7}));

      // Đại Thành Môn, the Confucius stele and the ceremonial court.
      place(0,-22,0,()=>{
        for(const x of [-7.4,-2.6,2.6,7.4])box(plaster,x,2.4,0,1.2,4.8,2.6);
        box(plaster,0,5.1,0,16,1.0,2.6);
        tileRoof(T,k,0,5.6,0,18.6,5.2,1.8);
        sign('ĐẠI THÀNH MÔN',0,5.1,1.36,4.4,.72);
      });
      place(0,-40.7,0,()=>{hall(T,k,{w:9.6,d:6.4,floor:.7,wall:3.8,bays:3,open:true});stele(k,.7,3.0);});
      stamp(round,granite,0,.45,-58,1.5,.9,1.5);stamp(round,bronze,0,1.5,-58,1.05,1.2,1.05);
      stamp(round,bronze,0,2.25,-58,1.3,.16,1.3);
      place(-38.5,-49.7,Math.PI/2,()=>hall(T,k,{w:24,d:15.4,floor:.8,wall:3.9,bays:5,tiers:1}));
      place(34.7,-50,-Math.PI/2,()=>hall(T,k,{w:24.6,d:10.6,floor:.8,wall:3.9,bays:5,tiers:1}));

      // Bái đường on its raised terrace.
      place(0,-83.2,0,()=>{
        box(stone,0,.5,2.5,50,1.0,31);
        for(let i=0;i<5;i++)box(i%2?paving:stone,0,.1+i*.1,18.6-i*.42,16,.2+i*.2,.44);
        for(const x of [-25,-12.5,0,12.5,25])box(granite,x,1.5,17.9,.3,1.0,.3);
        for(const f of [-1,1])box(granite,f*15.6,1.9,17.9,18.8,.16,.22);
        hall(T,k,{w:44,d:22,floor:1.9,wall:5.8,bays:9,steps:false});
        for(let i=0;i<4;i++)box(i%2?stone:paving,0,1.0+.9*(3.5-i)/4/2,12.2+i*.4,12,.9*(3.5-i)/4,.42);
        sign('VĂN MIẾU TRẤN BIÊN',0,7.0,7.02,8.4,1.05);
      });
    }
  });
})();
