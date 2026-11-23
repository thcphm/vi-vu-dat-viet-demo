'use strict';
(()=>{
  // Seven route endpoints around Biên Hòa, Long Thành and Vĩnh Cửu (Đồng Nai).
  // Every footprint, centre and yaw is taken from the OpenStreetMap way named in
  // each entry, in metres. Local +Z is the façade that faces the arrival road.
  const cream=0xe8dcc0,ochre=0xe2b85e,white=0xf1ecdf,concrete=0xb9b4a8,paving=0xc6bfae,shade=0x3a3632,
    laterite=[0x9a5b3e,0x8a4f36,0xa9694a],terracotta=[0xc9643f,0xbb5a38,0xa94f32],
    shutter=0x2f6b55,lacquer=0x9a2f26,door=0x6b2f25,dark=0x4a2a22,gilt=0xd9b24a,glass=0x6f8f98,
    rock=[0x7d8a8c,0x6c797c,0x8f9a9a],grass=0x6f9a57;

  // Hipped tile roof; `lift` raises the eave towards each hip (0 = straight eaves).
  function tileRoof(T,k,tints,trim,x,y,z,width,depth,rise,lift=0){
    // The ridge follows the longer side.
    if(depth>width*1.05){k.place(x,z,Math.PI/2,()=>tileRoof(T,k,tints,trim,0,y,0,depth,width,rise,lift));return;}
    const bands=tints.map(()=>[]),rows=Math.max(4,Math.round(depth*.45)),ridge=width/2-Math.min(depth*.38,width*.3);
    for(let side=0;side<4;side++){
      const cols=Math.max(4,Math.ceil((side%2?depth:width)/1.4));
      const point=(u,v)=>{
        const edge=width/2*(1-v)+ridge*v,span=depth/2*(1-v),a=u*2-1;
        const px=side===0?a*edge:side===1?edge:side===2?-a*edge:-edge;
        const pz=side===0?span:side===1?-a*span:side===2?-span:a*span;
        return [px,rise*(lift?.53*v+.47*v*v:v)+Math.pow(Math.abs(a),5)*(1-v)**3*lift,pz];
      };
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const u=i/cols,w=(i+1)/cols,v=j/rows,t=(j+1)/rows;
        const a=point(u,v),b=point(w,v),c=point(w,t),d=point(u,t),n=(i*17+j*31+side*11+i*j*7)%15;
        bands[n<7?0:n<12?1:2].push(...a,...b,...c,...a,...c,...d);
      }
    }
    bands.forEach((data,i)=>{
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data,3));geo.computeVertexNormals();
      k.stamp(geo,tints[i],x,y,z);geo.dispose();
    });
    k.box(trim,x,y+rise+.1,z,ridge*2+.3,.28,.36);
    for(const f of [-1,1]){
      k.box(tints[2],x,y-.05,z+f*depth/2,width,.14,.14);
      k.box(tints[2],x+f*width/2,y-.05,z,.14,.14,depth);
    }
  }

  // Sheet-metal gable as a solid prism. alongX puts the ridge on the X axis.
  function gable(k,tint,x,y,z,span,rise,len,alongX){
    const tri=[[-span/2,0],[span/2,0],[span/2,.14],[0,rise+.14],[-span/2,.14]];
    if(alongX)k.outline(tri,tint,x-len/2,y,z,len,Math.PI/2);else k.outline(tri,tint,x,y,z-len/2,len);
  }
  function monitorRoof(k,tint,x,y,z,span,rise,len,alongX){
    const m=span*.24,h=rise*.24+.7,l=len*.86;
    k.box(shade,x,y+rise*.76+h/2,z,alongX?l:m,h,alongX?m:l);
    gable(k,tint,x,y+rise*.76+h,z,m+1.4,m*.16,l+1,alongX);
  }

  // An open-sided market shed: columns, fascia, low sills and a metal gable.
  function marketHall(k,{w,d,h=4.4,rise=2.6,bay=5,wall=cream,roof,alongX=true,monitor=true,floor=.4}){
    k.box(concrete,0,floor/2,0,w+1.4,floor,d+1.4);
    k.box(shade,0,floor+h*.45,0,w-.7,h*.9,d-.7);
    k.box(wall,0,floor+h-.45,0,w,.9,d);
    const nx=Math.max(2,Math.round(w/bay)),nz=Math.max(2,Math.round(d/bay));
    for(const f of [-1,1]){
      for(let i=0;i<=nx;i++)k.box(wall,(i/nx-.5)*(w-.5),floor+h/2,f*(d/2-.25),.5,h,.5);
      for(let i=1;i<nz;i++)k.box(wall,f*(w/2-.25),floor+h/2,(i/nz-.5)*(d-.5),.5,h,.5);
      // Sills leave a central doorway on every side.
      for(const g of [-1,1]){
        k.box(wall,g*(w/4+1),floor+.45,f*(d/2-.15),w/2-2,.9,.2);
        k.box(wall,f*(w/2-.15),floor+.45,g*(d/4+1),.2,.9,d/2-2);
      }
    }
    const span=(alongX?d:w)+1.8,len=(alongX?w:d)+1.8;
    gable(k,roof,0,floor+h,0,span,rise,len,alongX);
    if(monitor)monitorRoof(k,roof,0,floor+h,0,span,rise,len,alongX);
    return floor+h;
  }

  // Thin round-headed shutter on a wall face (0:+Z, 1:+X, 2:-Z, 3:-X).
  function archPane(k,tint,x,y,z,w,h,face){
    const r=w/2;
    k.outline([[-r,0],[r,0],[r,h-r],[r*.7,h-r*.3],[0,h],[-r*.7,h-r*.3],[-r,h-r]],tint,x,y,z,.1,face*Math.PI/2);
  }

  // Southern communal-house hall: plinth, lacquered posts, panelled front, tiled roof.
  function dinhHall(T,k,{w,d,floor=.7,wall=3.6,bays=3,front=true}){
    k.box(concrete,0,floor/2,0,w+1.2,floor,d+1.2);
    k.box(ochre,0,floor+wall/2,-.2,w-.5,wall,d-.9);
    const zz=d/2-.3;
    if(front){
      for(let i=0;i<=bays;i++){
        const x=(i/bays-.5)*(w-.7);
        k.stamp(k.round,concrete,x,floor+.15,zz,.32,.3,.32);
        k.stamp(k.round,lacquer,x,floor+wall/2,zz,.22,wall,.22);
      }
      for(let i=0;i<bays;i++){
        const x=((i+.5)/bays-.5)*(w-.7),bw=(w-.7)/bays;
        k.box(door,x,floor+wall*.44,d/2-.62,bw*.78,wall*.82,.12);
        k.box(gilt,x,floor+wall*.9,d/2-.55,bw*.6,.1,.08);
      }
      k.box(dark,0,floor+wall-.16,zz,w-.3,.32,.3);
    }
    tileRoof(T,k,terracotta,white,0,floor+wall+.1,0,w+2.2,d+2.0,Math.min(d*.3,2.8),.45);
  }

  const osm=id=>'https://www.openstreetmap.org/way/'+id;
  const sights=window.VietnamSights??=[];

  // ---------------------------------------------------------------- Chợ Biên Hòa
  // OSM way 981111138, the hall nearest the road point. Aerial imagery shows a
  // dark red sheet roof in five long bays with a few translucent panels. The old
  // two-storey arcaded range east of it (way 1039825148) is not modelled.
  sights.push({
    id:'cho-bien-hoa',name:'Chợ Biên Hòa',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.8144367,lat:10.9464904,start:[106.81482,10.94675],width:54,depth:70,yaw:2.5289,
    map:osm(981111138),
    source:'https://tuoitre.vn/ki-ot-tro-khung-hang-hoa-bi-thieu-rui-sau-vu-chay-cho-bien-hoa-100260806103941224.htm',
    description:'Ngôi chợ lâu đời và lớn nhất Biên Hòa, nằm bên bờ sông Đồng Nai. Chợ gồm nhà lồng lớn mái tôn đỏ sẫm nhiều nhịp và dãy nhà lồng cũ hai tầng cửa vòm chạy dài ở phía đông, chung quanh là các dãy sạp và phố chợ.',
    solids:[[0,0,25,33]],
    build(T,k){
      const {box,palette,place,sign}=k,roof=0x7b3238,awn=0x8d8f8c,sky=0xc3dcc6;
      palette({plaster:[cream,white],stone:[concrete,paving],metal:[roof,awn,sky],glass:glass});
      box(concrete,0,.25,0,51.6,.5,67.6);
      box(shade,0,2.6,0,49.2,4.2,65.4);
      box(awn,0,4.85,0,53.8,.22,69.8);
      box(cream,0,7.2,0,50,4.4,66.2);
      box(cream,0,9.7,0,50.5,.6,66.7);
      for(const f of [-1,1]){
        box(glass,0,7.5,f*33.12,46.5,1.7,.1);box(glass,f*25.02,7.5,0,.1,1.7,62);
        for(let i=0;i<=10;i++){
          const x=(i/10-.5)*49.2;
          box(cream,x,2.6,f*32.8,.6,4.2,.6);box(cream,x,7.5,f*33.16,.5,2.0,.16);
        }
        for(let i=1;i<13;i++){
          const z=(i/13-.5)*65.4;
          box(cream,f*24.6,2.6,z,.6,4.2,.6);box(cream,f*25.06,7.5,z,.16,2.0,.5);
        }
      }
      // Five roof bays run the length of the hall.
      for(let i=0;i<5;i++)gable(k,roof,(i-2)*9.8,10,0,10,1.7,65.4,false);
      for(const [i,z,f] of [[1,-19,1],[3,-9,-1],[0,15,1],[3,21,1],[2,2,-1]])box(sky,(i-2)*9.8+f*2.5,11.02,z,4.4,.08,9,0,0,-f*.33);
      box(white,0,9.2,33.3,13,1.9,.16);
      sign('CHỢ BIÊN HÒA',0,9.2,33.4,12,1.5);
      place(0,-33.3,Math.PI,()=>{box(white,0,9.2,0,13,1.9,.16);sign('CHỢ BIÊN HÒA',0,9.2,.1,12,1.5);});
    }
  });

  // ------------------------------------------------- Thành cổ Biên Hòa (Thành Kèn)
  // Local +Z faces Đường Phan Chu Trinh. Building positions follow OSM and aerial
  // imagery; the elevations of the two houses and the gate follow photographs.
  sights.push({
    id:'thanh-co-bien-hoa',name:'Thành cổ Biên Hòa (Thành Kèn)',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.8170594,lat:10.9507969,start:[106.8167653,10.9503099],width:104,depth:102,yaw:-.5861,
    map:osm(981111135),modeledBuildings:['w981111137','w981111134'],
    source:'https://vietnamnet.vn/canh-kho-tin-ben-trong-di-tich-200-tuoi-o-dong-nai-595022.html',
    description:'Thành đắp đất năm 1816, xây lại bằng đá ong năm 1837, được người Pháp thu nhỏ và gọi là Thành Kèn; di tích quốc gia từ năm 2013. Trong khuôn viên hơn 1 ha còn hai tòa nhà hai tầng kiểu Pháp tường vàng, cửa chớp gỗ nâu, mái ngói ở phía đông và phía tây.',
    // Site outline from OSM way 972604572; the notch is the later office block on the street front.
    boundary:[[51.8,-48.6],[-50.1,-50.1],[-50.6,50.4],[-5.5,49.8],[-5.9,34.4],[26.9,33.8],[27.3,49.4],[51.8,49]],
    reserve:(x,z,r)=>x>-51-r&&x<52+r&&z>-50.5-r&&z<50.5+r&&!(x>-5.9+r&&x<27.3-r&&z>34.2+r)&&(
      x<-48||x>49.5||z<-47.5||z>47.5||
      [[-40.9,35.6,12,16.5],[32.2,24.3,8,7.5],[-40,1,5.5,12.5],[32.5,-38.9,6,6],[-15.6,30,3,22]].some(([cx,cz,w,d])=>Math.abs(x-cx)<w+r&&Math.abs(z-cz)<d+r)),
    solids:[[-40.9,35.6,9.2,14.7],[32.2,24.3,6,5.5],[-40,1,3.6,10.9],[32.5,-38.9,3.9,3.9]],
    build(T,k){
      const {box,palette,place,sign}=k,band=0xd2a650,brown=0x6b4a3b,oldTile=[0x9a5f48,0x8c5540,0xa86a50],greyStone=0x7c7f80,tin=0xcfd6d2;
      palette({brick:laterite,plaster:[ochre,band,white],stone:[concrete,paving,greyStone],tile:[...terracotta,...oldTile],timber:[brown],metal:[tin]});
      // Laterite enclosure on the three inner sides, 3 m high with a coping course.
      const wall=(x0,z0,x1,z1)=>{
        const w=Math.abs(x1-x0)+.8,d=Math.abs(z1-z0)+.8,x=(x0+x1)/2,z=(z0+z1)/2;
        box(laterite[0],x,1.5,z,w,3,d);box(laterite[1],x,3.1,z,w+.25,.22,d+.25);
        const n=Math.round(Math.max(w,d)/8);
        for(let i=1;i<n;i++)box(laterite[2],x0+(x1-x0)*i/n,1.5,z0+(z1-z0)*i/n,1.1,3.3,1.1);
      };
      wall(-50.3,-50,51.8,-50);wall(51.8,-50,51.8,49);wall(-50.3,-50,-50.3,20.6);
      // Street front: low rendered fence, stone-faced gate piers and the name plaque.
      for(const [x0,x1] of [[-30.8,-19.4],[-11.8,-5.7],[27.1,51.8]])box(greyStone,(x0+x1)/2,.6,50,x1-x0,1.2,.4);
      for(const x of [-19.4,-11.8])box(greyStone,x,1.6,50,1.1,3.2,1.1);
      box(0x55514c,-8.7,1.5,50.3,2.8,1.7,.5);
      sign('THÀNH BIÊN HÒA',-8.7,1.5,50.57,2.5,.6,true,'#e3c463');
      box(paving,-15.6,.06,30,5,.12,42);
      // Western house: long wing with arched shuttered bays above a low ground floor,
      // and a taller parapeted pavilion at the street end.
      place(-40.9,35.6,0,()=>{
        const g=3.2,u=4.8,base=.5,w=17.4,top=base+g+u;
        box(concrete,0,base/2,0,w+1.2,base,29.6);
        box(ochre,0,base+(g+u)/2,-3.5,w,g+u,21.6);
        box(band,0,base+g,-3.5,w+.3,.25,21.9);box(band,0,top-.15,-3.5,w+.5,.35,22.1);
        for(let i=0;i<8;i++){
          const z=-14.3+(i+.5)*2.7;
          for(const f of [-1,1]){
            archPane(k,brown,f*w/2,base+g+.9,z,1.9,3.2,f>0?1:3);
            box(shade,f*(w/2+.03),base+1.5,z,.1,.8,1.1);
          }
        }
        for(const x of [-5.4,0,5.4])archPane(k,brown,x,base+g+.9,-14.3,1.9,3.2,2);
        tileRoof(T,k,terracotta,band,0,top,-3.5,w+1.4,23,3.6);
        for(let i=0;i<4;i++){box(ochre,3.4,top+2.5,-11.5+i*5.2,.8,2.2,.8);box(terracotta[2],3.4,top+3.7,-11.5+i*5.2,1.0,.2,1.0);}
        box(ochre,0,base+(g+u+1.2)/2,10.8,w+.8,g+u+1.2,7);
        box(band,0,base+g,10.8,w+1.1,.25,7.3);box(band,0,top+.2,10.8,w+1.3,.4,7.5);box(band,0,top+1.25,10.8,w+1.0,.2,7.2);
        for(const f of [-1,1])for(const z of [9.1,12.5])archPane(k,brown,f*(w/2+.4),base+g+.9,z,2.2,3.4,f>0?1:3);
        for(const x of [-6,-2,2,6])archPane(k,brown,x,base+g+.9,14.3,2.2,3.4,0);
        box(shade,w/2+.44,base+1.3,9.1,.1,2.6,1.4);
      });
      // Eastern house: two bays of full-height louvres on each floor over two doorways.
      place(32.2,24.3,0,()=>{
        const s=3.9,base=.4;
        box(concrete,0,base/2,0,12.4,base,11.4);box(ochre,0,base+s,0,11.6,2*s,10.6);
        box(band,0,base+s,0,11.9,.3,10.9);box(band,0,base+2*s-.15,0,12,.3,11);
        for(const z of [-2.6,2.6]){
          box(brown,-5.83,base+s+2.25,z,.1,2.9,4.2);box(brown,-5.83,base+2.1,z,.1,3.2,4.2);
          box(shade,-5.9,base+1.3,z,.1,2.6,1.3);box(band,-5.87,base+s+.55,z,.1,.5,4.4);
          for(let j=0;j<2;j++)box(brown,5.83,base+j*s+2.1,z,.1,2.4,1.5);
        }
        tileRoof(T,k,oldTile,band,0,base+2*s,0,13,12,2.6);
      });
      // Sheet-roofed single-storey range behind the western house.
      place(-40,1,0,()=>{
        box(concrete,0,.2,0,7.6,.4,22.2);box(ochre,0,2.1,0,6.8,3.4,21.4);
        for(let i=0;i<5;i++)box(brown,3.43,2.0,(i/4-.5)*17,.1,1.8,1.2);
        gable(k,tin,0,3.8,0,8.2,1.4,22.6,false);
      });
      // Small tile-roofed building near the north-east wall.
      place(32.5,-38.9,0,()=>{
        box(concrete,0,.2,0,8.4,.4,8.4);box(ochre,0,2.1,0,7.6,3.4,7.6);
        tileRoof(T,k,terracotta,band,0,3.8,0,9.2,9.2,2.2);
      });
    }
  });

  // ------------------------------------------------------ Khu du lịch Bửu Long
  // Not the ticket gate: the tile-roofed hall on the rocky spit that runs into the
  // lake about 120 m north of the road point (OSM way 1047443837), with the rock
  // pinnacles of the spit behind it. Layout from aerial imagery, rock form from photographs.
  sights.push({
    id:'khu-du-lich-buu-long',name:'Khu du lịch Bửu Long',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.7943715,lat:10.9615784,start:[106.79385,10.96057],width:56,depth:84,yaw:-.838,
    map:osm(1047443837),
    source:'https://commons.wikimedia.org/wiki/File:B%E1%BB%ADu_Long,_Bien_Hoa,_Dong_Nai,_Vietnam_-_panoramio_(6).jpg',
    description:'Danh thắng quốc gia rộng 84 ha quanh hồ Long Ẩn và hồ Long Vân, những hồ nước hình thành từ việc khai thác đá. Giữa mặt hồ phủ sen còn lại nhiều khối đá dựng đứng, khiến nơi đây được ví như một vịnh Hạ Long thu nhỏ.',
    reserve:(x,z,r)=>(Math.abs(x)<10+r&&z>13-r&&z<39+r)||(x>-30-r&&x<9+r&&z>-41-r&&z<-9+r)||(Math.abs(x-5.8)<4+r&&Math.abs(z-1.2)<4+r),
    solids:[[0,22,6,6],[5.8,1.2,2.2,2.2],[-17,-28,4,4],[-2,-20,3.5,3.5]],
    build(T,k){
      const {box,palette,tapered,place}=k,crag=[0xb7ae9d,0x9e978a,0x8c7a68];
      palette({stone:[...crag,concrete,paving],plaster:[cream,white],tile:terracotta});
      // Square hall under an orange tiled roof, forecourt on the landward side.
      place(0,22,0,()=>{
        box(concrete,0,.3,0,14.2,.6,14.2);box(cream,0,2.4,0,11.4,3.6,11.4);
        for(const x of [-5.7,-1.9,1.9,5.7])box(white,x,2.4,5.75,.5,3.6,.3);
        tileRoof(T,k,terracotta,white,0,4.2,0,14,14,3.2);
      });
      box(paving,0,.2,33.6,13,.4,8.8);
      place(5.8,1.2,0,()=>{box(cream,0,1.5,0,4,3,4);tileRoof(T,k,terracotta,white,0,3,0,5.6,5.6,1.5);});
      // Quarry-cut pinnacles: pale, near-vertical faces with rusty seams.
      const stones=[[-24,-36,3.4,6,5],[-20,-31,4.2,10.5,6],[-16.5,-27.5,3.6,8,5],[-13,-25,2.6,5.5,6],[-9,-23.5,3.2,7,5],
        [-5,-21,3.8,9.5,6],[-1,-19.5,3.0,6.5,5],[3,-17,2.2,4,6],[-22,-26,2.0,3.2,5],[-11,-30,2.4,4.4,5],[-3,-26,1.8,2.8,6],[6,-12,1.6,2.4,5]];
      stones.forEach(([x,z,r,h,n],i)=>tapered(crag[i%3],x,h/2-.3,z,r,r*.62,h,.78,n));
      box(grass,-9,.5,-26,26,.3,10);
    }
  });

  // --------------------------------------------------------------- Chợ Long Thành
  // Local +Z is Cửa Bắc (towards the road point); local +X is Cửa Tây.
  sights.push({
    id:'cho-long-thanh',name:'Chợ Long Thành',city:'Long Thành',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.9562342,lat:10.7770923,start:[106.9560091,10.7776055],width:172,depth:76,yaw:-2.7464,
    map:osm(322590412),
    source:'https://commons.wikimedia.org/wiki/File:Ch%E1%BB%A3_long_th%C3%A0nh_c%E1%BB%ADa_t%C3%A2y_-_panoramio.jpg',
    description:'Chợ Long Thành là khối nhà lồng hai tầng dài khoảng 160 m, mái tôn xanh nhạt bao quanh một sân trong. Tầng trệt là dãy ki-ốt cửa cuốn; các cửa lớn mang tên theo hướng như Cửa Bắc, Cửa Tây, phía trên gắn hàng chữ vàng tên chợ.',
    solids:[[47.9,0,32.8,32.7],[-47.9,0,32.8,32.7],[0,23.8,15.2,8.9],[0,-23.8,15.2,8.9]],
    build(T,k){
      const {box,palette,place,sign,tapered,outline}=k,roof=0xc9d6c3,trim=0x3f8f6b,shut=0x8fc7a4,pale=0xdfe9ee,teal=0x2f7f78,red=0xc53a2e,grey=0xc9ccd0;
      palette({plaster:[white,pale,grey],stone:[concrete,paving],metal:[roof,trim,shut,teal],glass:glass});
      // Two square halls joined by wings on either side of the planted courtyard.
      for(const [x,z,w,d] of [[47.9,0,65.6,65.3],[-47.9,0,65.6,65.3],[0,23.8,36,17.7],[0,-23.8,36,17.7]]){
        box(concrete,x,.2,z,w+1.2,.4,d+1.2);
        box(shut,x,2.4,z,w,4,d);
        box(white,x,4.9,z,w+2,1.0,d+2);
        box(white,x,7.3,z,w-3.6,3.8,d-3.6);
        box(trim,x,9.35,z,w-3,.3,d-3);
      }
      for(const f of [-1,1]){
        for(let i=0;i<=23;i++)box(pale,(i/23-.5)*161,2.4,f*32.7,.7,4,.4);
        for(let i=1;i<10;i++)box(pale,f*80.75,2.4,(i/10-.5)*65,.4,4,.7);
        box(glass,0,7.6,f*30.9,154,1.9,.12);box(glass,f*78.95,7.6,0,.12,1.9,58);
        for(let i=0;i<=11;i++)box(white,(i/11-.5)*156,7.3,f*30.95,.9,3.8,.2);
        tapered(roof,f*47.9,12.1,0,44.6,2.2,5.2,.985,4);
        gable(k,roof,0,9.5,f*23.8,15.4,1.6,36,true);
      }
      box(grass,0,.25,0,30,.1,30);
      // Gabled porch with its gate name; the market name stands on a raised band behind.
      const gate=label=>{
        for(const f of [-1,1]){box(grey,f*7.2,3.4,2.2,1.6,6.8,1.6);box(red,f*7.2,3.3,3.05,1.1,4.6,.08);}
        outline([[-9.2,0],[9.2,0],[9.2,1.2],[0,4.4],[-9.2,1.2]],grey,0,6.6,1.2,2.2);
        box(shade,0,3.3,.25,12.8,6.6,.3);
        sign(label,0,7.6,3.44,4.6,.8,true,'#f4d35e');
        box(teal,0,11.3,-4.4,24,2.6,.8);box(trim,0,12.75,-4.8,25.4,.3,2.4);
        sign('CHỢ LONG THÀNH',0,11.3,-3.97,20,2.0,true,'#f4d35e');
      };
      place(0,32.65,0,()=>gate('CỬA BẮC'));
      place(0,-32.65,Math.PI,()=>gate('CỬA NAM'));
      place(80.7,0,Math.PI/2,()=>gate('CỬA TÂY'));
      place(-80.7,0,-Math.PI/2,()=>gate('CỬA ĐÔNG'));
    }
  });

  // ----------------------------------------------------------------- Đình Tam An
  // Roof form, forecourt and the small roofed gate by the lane are read from aerial
  // imagery; the gate stands about 6 m east of the hall axis.
  sights.push({
    id:'dinh-tam-an',name:'Đình Tam An',city:'Long Thành',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.9193311,lat:10.8010343,start:[106.9194523,10.8009574],width:22,depth:48,yaw:-.5425,
    map:osm(907749031),
    source:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    description:'Đình thần Tam An là ngôi đình làng của xã Tam An cũ, nằm trong xóm cạnh đường huyện 21. Chính điện lợp ngói đỏ, phía trước là sân gạch và cổng nhỏ có mái ngói mở ra đường.',
    boundary:[[-8,-10],[8,-10],[8,10],[10.5,23],[1.5,23],[-8,10]],
    reserve:(x,z,r)=>(Math.abs(x)<9+r&&z>-10-r&&z<10+r)||(Math.abs(x-5)<5.5+r&&z>9&&z<23+r),
    solids:[[0,-1.8,6,5.9],[6,19.5,2.7,1]],
    build(T,k){
      const {box,palette,place,sign,stamp,round}=k,court=0xb98a6e;
      palette({plaster:[ochre,white],stone:[concrete,paving,court],tile:terracotta,timber:[lacquer,door,dark],metal:[gilt]});
      box(court,3,.05,13.5,11,.1,11.5);
      place(0,-1.85,0,()=>dinhHall(T,k,{w:11.8,d:11.6}));
      // Open front porch under a lower tiled skirt.
      box(concrete,0,.35,5.8,13,.7,3.8);
      for(const x of [-5.5,-1.85,1.85,5.5])stamp(round,lacquer,x,2.05,7.2,.2,2.7,.2);
      box(terracotta[1],0,3.5,5.9,13.6,.14,4.2,0,.2);
      for(let i=0;i<3;i++)box(i%2?paving:concrete,0,.1+(2-i)*.1,7.9+i*.36,5,.2+(2-i)*.2,.4);
      box(lacquer,0,3.3,4.02,4.7,.74,.06);sign('ĐÌNH THẦN TAM AN',0,3.3,4.07,4.4,.6);
      // Roofed gate at the lane.
      place(6,19.5,0,()=>{
        for(const x of [-1.9,1.9]){box(ochre,x,1.6,0,.7,3.2,.7);box(white,x,3.25,0,.9,.14,.9);}
        box(ochre,0,3.5,0,4.6,.4,.5);
        tileRoof(T,k,terracotta,white,0,3.7,0,5.6,2.6,.9,.3);
      });
    }
  });

  // ------------------------------------------------------------------- Chợ Mã Đà
  sights.push({
    id:'cho-ma-da',name:'Chợ Mã Đà',city:'Vĩnh Cửu',province:'Đồng Nai',region:'Nam Bộ',
    lon:107.0555039,lat:11.1086194,start:[107.0558648,11.1087232],width:64,depth:44,yaw:2.9403,
    map:osm(1065375351),source:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    description:'Chợ xã Mã Đà nằm ngay ngã ba đường tỉnh 761 và 767, cửa ngõ vào rừng Chiến khu Đ và hồ Trị An. Nhà lồng chợ rộng chừng 55 m, chung quanh là sân họp chợ.',
    solids:[[0,0,27.7,13.5],[1.2,-17.2,13.6,3.7]],
    build(T,k){
      const {box,palette,place,sign}=k,roof=0xb9c9b4;
      palette({plaster:[cream,white],stone:[concrete,paving],metal:[roof]});
      box(paving,0,.04,18,58,.08,9);
      const eave=marketHall(k,{w:55.4,d:27,roof,rise:3.0});
      // Lean-to annexe on the south side and the porch facing the road.
      box(concrete,1.2,.2,-17.2,27.6,.4,7.6);box(shade,1.2,1.9,-17,26.6,3.0,6.8);
      for(let i=0;i<=5;i++)box(cream,1.2+(i/5-.5)*26.6,1.9,-20.6,.4,3.0,.4);
      box(roof,1.2,3.75,-17.4,28.4,.14,8.2,0,-.16);
      box(concrete,-29.4,.2,3.7,3.6,.4,7.4);
      for(const z of [.4,7])box(cream,-30.8,1.9,z,.4,3.0,.4);
      box(roof,-29.6,3.6,3.7,4.2,.14,8,0,0,.14);
      sign('CHỢ MÃ ĐÀ',0,eave-.45,13.56,9,.8);
      place(-28.72,0,-Math.PI/2,()=>k.sign('CHỢ MÃ ĐÀ',0,eave+1.3,0,7,1.0));
    }
  });

  // --------------------------------------------------------------- Chợ Hiếu Liêm
  sights.push({
    id:'cho-hieu-liem',name:'Chợ Hiếu Liêm',city:'Vĩnh Cửu',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.966107,lat:11.1144042,start:[106.9662314,11.1144377],width:19,depth:24,yaw:1.8682,
    map:osm(1103857445),source:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    description:'Chợ nhỏ của xã Hiếu Liêm cũ, nằm sát đường liên xã bên bờ bắc sông Đồng Nai, cạnh trung tâm văn hóa và sân bóng của xã.',
    solids:[[0,0,7.6,9.9]],
    build(T,k){
      const {box,palette,sign}=k,roof=0xcdd6c8;
      palette({plaster:[cream,white],stone:[concrete,paving],metal:[roof]});
      const eave=marketHall(k,{w:15.2,d:19.8,h:3.8,rise:2.4,bay:4.9,roof,alongX:false,monitor:false});
      // Gable front to the road with the name board over the doorway.
      box(cream,0,eave+.75,10.86,8.4,1.3,.16);
      sign('CHỢ HIẾU LIÊM',0,eave+.75,10.96,7.6,1.0);
      box(roof,0,eave-.5,11.6,15.6,.12,3.0,0,.18);
      for(const x of [-7.3,-2.5,2.5,7.3])box(cream,x,(eave-.75)/2,12.9,.24,eave-.75,.24);
      box(paving,0,.04,12,16,.08,4.4);
    }
  });
})();
