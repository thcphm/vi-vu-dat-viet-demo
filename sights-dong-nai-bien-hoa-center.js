'use strict';
(()=>{
  // Landmarks of central Biên Hòa. In every model local +Z is the principal
  // face; footprints and axes follow the OpenStreetMap ways named in each
  // entry's `map`, measured in metres. Colours and massing follow the press and
  // Wikimedia Commons photographs named in each entry's `source`.
  const white=0xf1f1ec,lampPole=0x6f7477,globe=0xf6f3e6,leaf=0x4f7d3a,leaf2=0x5d8c44,trunk=0x8a7a63;

  // Tile courses with the eave lifting towards each hip (set lift to 0 for a plain hip roof).
  function tileRoof(T,k,tints,trim,x,y,z,width,depth,rise,lift=.75){
    const bands=tints.map(()=>[]),rows=Math.max(5,Math.round(depth*.6)),ridge=width/2-Math.min(depth*.34,width*.25);
    for(let side=0;side<4;side++){
      const cols=Math.max(5,Math.ceil((side%2?depth:width)/.9));
      const point=(u,v)=>{
        const edge=width/2*(1-v)+ridge*v,span=depth/2*(1-v),a=u*2-1;
        const px=side===0?a*edge:side===1?edge:side===2?-a*edge:-edge;
        const pz=side===0?span:side===1?-a*span:side===2?-span:a*span;
        return [px,rise*(.53*v+.47*v*v)+Math.pow(Math.abs(a),5)*(1-v)**3*lift,pz];
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
    k.box(trim,x,y+rise+.14,z,ridge*2+.3,.34,.42);
    for(const f of [-1,1]){
      k.box(tints[2],x,y-.05,z+f*depth/2,width,.16,.16);
      k.box(tints[2],x+f*width/2,y-.05,z,.16,.16,depth);
      if(lift)k.outline([[0,0],[f*.5,.1],[f*1.0,.9],[f*1.05,1.2],[f*.7,1.0],[f*.56,.56],[f*.2,.36],[0,.34]],trim,x+ridge*f,y+rise+.14,z-.14,.28);
    }
  }
  function lamp(k,x,z,h=4.2,globes=1){
    k.stamp(k.round,lampPole,x,h/2,z,.07,h,.07);
    if(globes===1)k.stamp(k.round,globe,x,h+.2,z,.24,.42,.24);
    else for(let i=0;i<globes;i++){
      const a=i*Math.PI*2/globes;
      k.stamp(k.round,globe,x+Math.cos(a)*.42,h-.1,z+Math.sin(a)*.42,.2,.36,.2);
    }
  }
  function bench(k,x,z,ry=0,tint=white){
    k.box(tint,x,.75,z,1.8,.1,.5,ry);k.box(tint,x,.52,z,1.5,.44,.3,ry);
  }
  function tree(k,x,z,h=9,r=3.2){
    k.stamp(k.round,trunk,x,h*.3,z,.22,h*.6,.22);
    k.tapered(leaf,x,h*.72,z,r,r*.55,h*.5,1,8);
    k.tapered(leaf2,x,h*1.02,z,r*.6,.2,h*.22,1,8);
  }
  function flagpole(k,x,z,h,tint){
    k.stamp(k.round,0xcfd2d2,x,h/2,z,.06,h,.06);
    if(tint!==undefined)k.box(tint,x+.5,h-.4,z,.95,.62,.03);
  }

  const sights=[];

  // 1. Sân vận động Đồng Nai — bowl ways 971907337 (C-shaped stands) and
  //    971907338 (main stand, west), pitch way 147075492. Local +X runs south
  //    along the pitch; +Z faces west to Đường Phạm Văn Khoai.
  const standAt=t=>{
    const c=Math.cos(t),s=Math.sin(t),east=s>0,bi=east?59:64,bo=east?92:73;
    return {c,s,inner:[92*c,-bi*s],outer:[108*c,-bo*s],main:!east&&Math.abs(c)<.74};
  };
  sights.push({
    id:'san-van-dong-dong-nai',name:'Sân vận động Đồng Nai',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.8628178,lat:10.9616268,start:[106.8614463,10.9617878],width:224,depth:190,yaw:-1.658,viewDistance:1300,
    map:'https://www.openstreetmap.org/way/1020855104',
    source:'https://commons.wikimedia.org/wiki/File:Aerial_View_of_%C4%90%E1%BB%93ng_Nai_Stadium.png',
    description:'Sân vận động cấp tỉnh trên đường Phạm Văn Khoai, sức chứa khoảng 30.000 chỗ, sân nhà của câu lạc bộ bóng đá Đồng Nai. Lòng chảo hình bầu dục có đường chạy đỏ và các khán đài sơn kem, xanh dương, vàng, đỏ, xanh lá.',
    boundary:[[78,145],[114,133],[136,115],[156,81],[161,4],[153,-69],[118,-126],[84,-143],[-68,-140],[-120,-121],[-140,-100],[-160,-47],[-150,84],[-126,123],[-92,143],[41,147]],
    modeledBuildings:['w971907337','w971907338'],
    reserve:(x,z,r)=>(x/(112+r))**2+(z/(96+r))**2<1,
    solids:Array.from({length:36},(_,i)=>{
      const a=standAt((i+.5)*Math.PI/18);
      return [(a.inner[0]+a.outer[0])/2,(a.inner[1]+a.outer[1])/2,9,Math.max(5,Math.abs(a.outer[1]-a.inner[1])/2)];
    }),
    build(T,k){
      const {box,stamp,round,palette}=k;
      const apron=0xb9b6ad,track=0xb5503f,grass=0x4f9a45,turf=0x3f8a3b,line=0xf4f4ef,rim=0xeeeae0,cream=0xe9dcb4,
        blue=0x3f9bd6,yellow=0xe9c23a,red=0xd04a45,green=0x6fae4e,mint=0x8fd6c2,roof=0x9fb8ae,steel=0x8d9396,lampHead=0xdfe3e2,vip=0x3d8fd0;
      palette({stone:[apron,rim],plaster:[mint,cream],metal:[roof,steel,lampHead,vip]});
      // Apron, 400 m track and pitch.
      stamp(round,apron,0,.12,0,110,.26,90);
      box(track,0,.16,0,84,.32,92.6);
      for(const f of [-1,1]){stamp(round,track,f*42,.16,0,46.3,.32,46.3);stamp(round,grass,f*42,.18,0,36.5,.36,36.5);}
      box(grass,0,.18,0,84,.36,73);
      box(turf,0,.2,0,105,.4,68);
      for(const f of [-1,1]){
        box(line,0,.41,f*34,105,.02,.16);box(line,f*52.5,.41,0,.16,.02,68);
        box(line,f*36,.41,0,.16,.02,40.3);
        for(const g of [-1,1])box(line,f*44.25,.41,g*20.15,16.5,.02,.16);
        // Goals.
        for(const g of [-1,1])box(line,f*52.6,1.6,g*3.66,.12,2.44,.12);
        box(line,f*52.6,2.84,0,.12,.12,7.44);
      }
      box(line,0,.41,0,.16,.02,68);
      stamp(round,line,0,.405,0,9.15,.02,9.15);stamp(round,turf,0,.41,0,8.99,.02,8.99);
      // Terraces: 36 chords of the oval, four rising steps each, white rim wall behind.
      const N=36,step=Math.PI*2/N,tiers=4;
      for(let i=0;i<N;i++){
        const t=(i+.5)*step,a=standAt(t),p=standAt(t-step/2),q=standAt(t+step/2);
        const dx=a.outer[0]-a.inner[0],dz=a.outer[1]-a.inner[1],depth=Math.hypot(dx,dz);
        const deg=((t*180/Math.PI)+360)%360;
        const seat=a.main?(a.c>.25?yellow:cream):deg<35||deg>325?cream:deg<65?green:deg<115?red:deg<150?yellow:deg<172?blue:cream;
        const height=2+depth*.42;
        for(let j=0;j<tiers;j++){
          const f=(j+.5)/tiers,g0=j/tiers,g1=(j+1)/tiers;
          const ax=p.inner[0]+(p.outer[0]-p.inner[0])*f,az=p.inner[1]+(p.outer[1]-p.inner[1])*f;
          const bx=q.inner[0]+(q.outer[0]-q.inner[0])*f,bz=q.inner[1]+(q.outer[1]-q.inner[1])*f;
          const top=1.3+(height-1.3)*g1;
          box(seat,(ax+bx)/2,top/2,(az+bz)/2,Math.hypot(bx-ax,bz-az)*1.03,top,depth*(g1-g0)*1.02,Math.atan2(az-bz,bx-ax));
        }
        const ox=(p.outer[0]+q.outer[0])/2,oz=(p.outer[1]+q.outer[1])/2,len=Math.hypot(q.outer[0]-p.outer[0],q.outer[1]-p.outer[1])*1.03;
        const ang=Math.atan2(p.outer[1]-q.outer[1],q.outer[0]-p.outer[0]);
        if(a.main){
          // Main stand: mint-walled rooms behind the seats under a thin roof.
          box(mint,ox,(height+3.2)/2,oz,len,height+3.2,1.2,ang);
          box(roof,(ox+a.inner[0]*.35)/1.35,height+3.5,(oz+a.inner[1]*.35)/1.35,len,.22,depth*.8,ang);
          stamp(round,steel,a.inner[0]+dx*.45,(height+3.4)/2,a.inner[1]+dz*.45,.1,height+3.4,.1);
        }else{
          box(rim,ox,(height+1.1)/2,oz,len,height+1.1,.5,ang);
        }
      }
      // Blue-roofed box at the southern end of the main stand.
      box(vip,96,10.6,26,18,.3,13,-.5);
      for(const [x,z] of [[90,19],[104,24],[88,30],[101,36]])stamp(round,steel,x,5.3,z,.14,10.6,.14);
      box(rim,97,11.8,31,9,2.2,3.2,-.5);
      // Four floodlight masts outside the bowl.
      for(const fx of [-1,1])for(const fz of [-1,1]){
        const x=fx*100,z=fz*(fz>0?86:95);
        stamp(round,steel,x,16,z,.32,32,.32);
        box(lampHead,x,33.2,z,6.4,5.2,.5,Math.atan2(x,z)+Math.PI);
        box(steel,x,33.2,z,6.8,.2,.8,Math.atan2(x,z)+Math.PI);
      }
    }
  });

  // 2. Quảng trường tỉnh Đồng Nai — park way 769111901. Local +Z runs down the
  //    ceremonial avenue (road way 292214921, kept clear at x = -8…18) to Đường
  //    Nguyễn Ái Quốc; the hall closes the axis beyond the cross street.
  const squarePads=[[-40,6,30,44],[49,3,29,43],[-122,13,11,11],[-91,13,21,5],[2,-95,21,28]];
  const squareTrees=[];
  for(const x of [-60,-40,-20,32,50,68])for(const z of [-26,4,34])squareTrees.push([x,z]);
  sights.push({
    id:'quang-truong-tinh-dong-nai',name:'Quảng trường tỉnh Đồng Nai',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.82895,lat:10.958,start:[106.8292547,10.9576125],width:220,depth:180,yaw:.541,viewDistance:1200,
    map:'https://www.openstreetmap.org/way/769111901',
    source:'https://baodongnai.com.vn/dong-nai-cuoi-tuan/202603/chum-anh-khong-gian-cong-cong-nang-tam-do-thi-trung-tam-ong-nai-fd512ed/',
    description:'Quảng trường trung tâm của tỉnh trên đường Nguyễn Ái Quốc, gần ngã tư Vườn Mít. Sau khi tháo hàng rào năm 2025, hai sân lát đá dưới hàng cây dầu hai bên trục chính trở thành nơi tập thể dục và tổ chức lễ hội, biểu diễn ngoài trời.',
    boundary:[[-22,-125],[26,-125],[26,-62],[80,-42],[80,50],[-72,52],[-135,26],[-135,0],[-72,-40],[-22,-62]],
    reserve:(x,z,r)=>squarePads.some(([cx,cz,w,d])=>Math.abs(x-cx)<w+r&&Math.abs(z-cz)<d+r),
    solids:[[2,-95,20,27],[-122,13,9.5,9.5],...squareTrees.map(([x,z])=>[x,z,1.7,1.7])],
    build(T,k){
      const {box,stamp,round,palette}=k;
      const slab=0xd9d6cd,band=0xb9b5aa,kerb=0xe8e4d8,wood=0xb98a55,soil=0x6f5a44,steel=0xb8bcbe,wall=0xf3f0e6,roof=0xdfe3df,
        red=0xa83a30,dark=0x3d3836,basin=0xcfd8d6,water=0x7fb7c4,step=0xc9c4b8,lawn=0x6f9d55;
      palette({stone:[slab,band,kerb,step,basin],plaster:[wall],timber:[wood,red],metal:[steel,roof],glass:[water]});
      // Two striped stone courts beside the avenue.
      for(const [cx,cz,w,d] of squarePads.slice(0,2)){
        box(slab,cx,.16,cz,w*2,.32,d*2);
        for(let z=cz-d+5;z<cz+d;z+=7)box(band,cx,.17,z,w*2,.34,1.6);
        for(const f of [-1,1])box(kerb,cx+f*w,.3,cz,.5,.6,d*2);
      }
      // Trees in square planters whose timber rims serve as benches.
      for(const [x,z] of squareTrees){
        box(wood,x,.5,z,3.4,.5,3.4);box(soil,x,.56,z,2.7,.5,2.7);
        tree(k,x,z,15,3.6);
      }
      // Low grass terraces at the back of the western court.
      for(let i=0;i<3;i++){box(step,-66,.45+i*.3,6,2.4-i*.01,.5+i*.6,60-i*6);box(lawn,-67.3-i*.2,.72+i*.6,6,1.2,.06,56-i*6);}
      // Truss stage frame used for open-air shows.
      for(const z of [-9,13])for(const x of [-57,-49]){
        for(const [dx,dz] of [[-.35,-.35],[.35,-.35],[-.35,.35],[.35,.35]])stamp(round,steel,x+dx,4.2,z+dz,.05,8.4,.05);
        box(steel,x,8.5,z,.9,.2,.9);
      }
      for(const x of [-57,-49]){box(steel,x,8.1,2,.12,.12,22);box(steel,x,8.9,2,.12,.12,22);}
      for(const z of [-9,13]){box(steel,-53,8.1,z,8,.12,.12);box(steel,-53,8.9,z,8,.12,.12);}
      for(let z=-7;z<=11;z+=3)box(steel,-53,8.5,z,8,.08,.08,0,0,0);
      // Three-globe lamp standards along the court edges.
      for(const [x,z] of [[-12,-30],[-12,10],[-12,44],[22,-32],[22,6],[22,40],[-68,-34],[76,-36]])lamp(k,x,z,5.2,3);
      for(const [x,z,ry] of [[-30,-36,0],[-50,-36,0],[40,-38,0],[60,-38,0],[-30,48,0],[45,44,0]])bench(k,x,z,ry,kerb);
      // Round fountain basin west of the courts and the path to it.
      box(slab,-91,.16,13,42,.32,9);
      stamp(round,slab,-122,.16,13,11,.32,11);
      stamp(round,basin,-122,.45,13,9.5,.7,9.5);stamp(round,water,-122,.5,13,8.7,.66,8.7);
      stamp(round,basin,-122,.75,13,3.2,.5,3.2);stamp(round,water,-122,.82,13,2.6,.42,2.6);
      stamp(round,basin,-122,1.3,13,.5,1.0,.5);
      // The hall at the head of the axis: white block, wide steps, three red portals.
      box(step,2,.5,-95,42,1.0,56);
      for(let i=0;i<5;i++)box(i%2?slab:step,2,.1+i*.1,-65.6+i*.42-1.2,22,.2+i*.2-.001*i,.46);
      box(wall,2,5.6,-96,40,9.2,52);
      box(roof,2,10.4,-96,41.2,.5,53.2);
      box(wall,2,11.2,-71,30,1.4,1.2);
      for(const x of [-13,-7.5,-2.5,6.5,11.5,17])box(wall,x,5.0,-69.4,1.1,8,1.1);
      box(roof,2,9.3,-69.2,33,.6,3.2);
      for(const x of [-5,2,9]){box(red,x,3.1,-69.95,4.2,4.2,.16);box(dark,x,3.0,-69.85,2.2,4.0,.2);}
      for(const f of [-1,1]){box(dark,2+f*15.4,5.4,-69.98,3.2,3.2,.12);box(dark,2+f*20.05,5.6,-96,.12,3.0,40);}
    }
  });

  // 3. Công viên Biên Hùng — park way 527470174 on the south and east shore of
  //    Hồ Biên Hùng (water way 1039863904, drawn by the game). Local +Z is south.
  const parkWalk=[[-56,-28],[-6,0],[34,6],[84,-20]];
  const parkLinks=[[[-35,20],[-6,0]],[[-18,58],[-35,20]],[[-18,58],[34,6]],[[84,-20],[121,-34]]];
  const nearSegment=(x,z,[ax,az],[bx,bz])=>{
    const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-ax-dx*t,z-az-dz*t);
  };
  sights.push({
    id:'cong-vien-bien-hung',name:'Công viên Biên Hùng',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.8215064,lat:10.9518526,start:[106.8213591,10.9507683],width:250,depth:170,yaw:0,viewDistance:1100,
    map:'https://www.openstreetmap.org/way/527470174',
    source:'https://baodongnai.com.vn/dong-nai-cuoi-tuan/202601/mo-rong-khong-gian-cong-cong-cho-do-thi-bien-hoa-bf416a2/',
    description:'Công viên trung tâm của Biên Hòa, rộng khoảng 4 ha bên hồ Biên Hùng dưới tán cây cổ thụ. Sau đợt cải tạo đầu năm 2023, hàng rào và khu trò chơi cũ được tháo dỡ để mở các sân lát gạch và lối dạo ven hồ.',
    boundary:[[-80,-14],[-56,-36],[-6,-8],[34,-2],[80,-28],[105,-62],[169,-49],[65,71],[41,98],[-12,64],[-79,60]],
    reserve:(x,z,r)=>Math.hypot(x+35,z-20)<21+r||Math.hypot(x-121,z+34)<19+r||Math.hypot(x+18,z-58)<13+r||
      parkWalk.some((p,i)=>i&&nearSegment(x,z,parkWalk[i-1],p)<3.5+r)||parkLinks.some(([a,b])=>nearSegment(x,z,a,b)<2.5+r),
    solids:[],
    build(T,k){
      const {box,stamp,round,palette}=k;
      const tile=0xc9b79c,tile2=0xb7a184,path=0xbdb8ac,kerb=0xe6e2d6,rail=0xeef0ee,teal=0x3f9a8a,sand=0xd8ceb6;
      palette({stone:[tile,tile2,path,kerb,sand],metal:[rail,teal]});
      const strip=(a,b,w,tint,y=.16)=>{
        const dx=b[0]-a[0],dz=b[1]-a[1];
        box(tint,(a[0]+b[0])/2,y,(a[1]+b[1])/2,Math.hypot(dx,dz)+w*.5,y*2,w,Math.atan2(-dz,dx));
      };
      // Round brick court where the old amusement hall stood, and the square court by Đường 30 Tháng 4.
      stamp(round,tile,-35,.16,20,20,.32,20);stamp(round,tile2,-35,.17,20,13,.34,13);stamp(round,tile,-35,.18,20,6,.36,6);
      box(sand,121,.16,-34,30,.32,30,.7);box(tile,121,.17,-34,24,.34,24,.7);
      stamp(round,tile,-18,.16,58,12,.32,12);
      // Lakeside promenade with a white railing on the water side, lamps and benches.
      parkWalk.forEach((p,i)=>{
        if(!i)return;
        const a=parkWalk[i-1],dx=p[0]-a[0],dz=p[1]-a[1],len=Math.hypot(dx,dz),ang=Math.atan2(-dz,dx),nx=dz/len,nz=-dx/len;
        strip(a,p,5,path);
        const mx=(a[0]+p[0])/2+nx*2.7,mz=(a[1]+p[1])/2+nz*2.7;
        box(rail,mx,1.25,mz,len,.08,.08,ang);box(rail,mx,.8,mz,len,.06,.06,ang);
        for(let s=0;s<=len;s+=4)box(rail,a[0]+dx*s/len+nx*2.7,.75,a[1]+dz*s/len+nz*2.7,.1,1.1,.1,ang);
        for(let s=8;s<len;s+=18){
          lamp(k,a[0]+dx*s/len-nx*2.9,a[1]+dz*s/len-nz*2.9,4.4);
          bench(k,a[0]+dx*(s+8)/len-nx*2.9,a[1]+dz*(s+8)/len-nz*2.9,ang,kerb);
        }
      });
      for(const [a,b] of parkLinks)strip(a,b,3.4,path,.15);
      // Benches and lamps round the courts, and a row of exercise frames.
      for(let i=0;i<8;i++){
        const t=i*Math.PI/4;
        if(i%2)bench(k,-35+Math.cos(t)*18.5,20+Math.sin(t)*18.5,-t+Math.PI/2,kerb);
        else lamp(k,-35+Math.cos(t)*19,20+Math.sin(t)*19,4.6,3);
      }
      for(const [x,z] of [[108,-45],[134,-23],[109,-21],[132,-47]])lamp(k,x,z,4.6,3);
      for(let i=0;i<4;i++){
        const x=-12+i*3.2,z=44-i*2.4;
        for(const f of [-1,1])stamp(round,teal,x+f*.6,.9,z,.05,1.5,.05);
        box(teal,x,1.6,z,1.3,.08,.08);box(teal,x,.5,z,1.0,.08,.4);
      }
    }
  });

  // 4. Chùa Bửu Phong — main hall, OSM way 1419343709 (14.5 m front, 19.6 m deep)
  //    on Núi Bình Điện. Local +Z is the arcaded front facing south-west.
  sights.push({
    id:'chua-buu-phong',name:'Chùa Bửu Phong',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.8001491,lat:10.9673092,start:[106.8001427,10.9670731],width:22,depth:32,yaw:-.927,
    map:'https://www.openstreetmap.org/way/1419343709',
    source:'https://dulichbuulong.com.vn/chua-co-buu-phong/',
    description:'Ngôi cổ tự trên núi Bình Điện ở Bửu Long, tương truyền dựng từ thế kỷ 17 và được xếp hạng di tích cấp quốc gia năm 1990. Mặt tiền chánh điện có ba vòm cuốn lớn, bờ mái đắp nổi và khảm sành sứ, lợp ngói đỏ.',
    modeledBuildings:['w1419343709'],
    solids:[[0,-1.5,7.3,9.8]],
    build(T,k){
      const {box,stamp,round,arch,outline,tapered,palette}=k;
      const cream=0xe9d9a6,ochre=0xd9a53a,grey=0x8f9597,greyDark=0x6f7679,tileR=[0xc2633f,0xb5563a,0xa94c33],red=0xb03a30,
        dark=0x2e2a28,stone=0xb9b3a4,paving=0xa7a39a,lion=0xf1efe8,pot=0x9a4a36,altar=0xe8cf6a;
      palette({plaster:[cream,ochre,lion],stone:[stone,paving,grey,greyDark],tile:tileR,brick:[pot],timber:[red,dark]});
      const W=14.5,D=19.6,front=8.3,floor=1.1,wall=5.2;
      box(paving,0,.16,12.5,20,.32,9);
      box(stone,0,floor/2,-1.5,W+1.2,floor,D+1.2);
      for(let i=0;i<5;i++)box(i%2?paving:stone,0,(floor-i*.2)/2,front+1.0+i*.4,6.4,floor-i*.2,.42);
      // Body, dark interior behind the three great arches and the two narrow side bays.
      box(cream,0,floor+wall/2,-2.4,W,wall,D-1.8);
      box(dark,0,floor+2.1,front-.9,W-1.2,4.2,.3);
      box(altar,0,floor+1.0,front-1.6,2.6,1.6,1.0);
      for(const x of [-3.7,0,3.7])arch(cream,x,floor,front-.28,3.7,wall);
      for(const f of [-1,1]){
        arch(cream,f*6.4,floor,front-.28,1.7,wall);
        box(cream,f*7.0,floor+wall/2,front-.14,.5,wall,.28);
      }
      // Red couplet panels on the piers and the ochre bands of the entablature.
      for(const x of [-5.55,-1.85,1.85,5.55])box(red,x,floor+2.3,front+.03,.42,2.6,.06);
      box(ochre,0,floor+wall+.25,front-.1,W+.5,.5,.5);
      box(grey,0,floor+wall+.95,front-.1,W+.3,.9,.36);
      box(greyDark,0,floor+wall+1.5,front-.1,W+.7,.22,.56);
      // Mosaic parapet: scrolled crest in the centre, smaller crests and finials along the eave.
      outline([[-2.3,0],[2.3,0],[2.0,.7],[1.1,1.0],[.6,1.7],[0,2.0],[-.6,1.7],[-1.1,1.0],[-2.0,.7]],grey,0,floor+wall+1.6,front-.26,.32);
      for(const f of [-1,1]){
        outline([[-1.1,0],[1.1,0],[.8,.5],[0,.9],[-.8,.5]],greyDark,f*4.6,floor+wall+1.6,front-.26,.3);
        tapered(grey,f*7.1,floor+wall+2.1,front-.1,.34,.1,1.0,1,8);
      }
      for(const f of [-1,1])box(grey,f*(W/2+.02),floor+wall+.95,-2.4,.3,.9,D-1.8);
      // Low hipped tile roof behind the parapet.
      tileRoof(T,k,tileR,grey,0,floor+wall+1.0,-2.6,W-.4,D-2.6,2.3,0);
      // Side windows with pointed heads.
      for(const f of [-1,1])for(const z of [-8,-3,2])box(dark,f*(W/2+.02),floor+2.6,z,.08,2.2,1.2);
      // Guardian lions on the steps, bonsai pots and lamp standards in the forecourt.
      for(const f of [-1,1]){
        box(lion,f*3.9,floor*.5+.5,front+2.0,.8,.9,1.5);stamp(round,lion,f*3.9,floor*.5+1.25,front+2.5,.36,.6,.36);
        stamp(round,pot,f*5.6,.7,front+1.4,.6,.8,.6);tapered(leaf,f*5.6,2.0,front+1.4,.9,.25,1.9,1,8);
        stamp(round,pot,f*2.2,.62,front+3.6,.45,.6,.45);tapered(leaf2,f*2.2,1.5,front+3.6,.6,.2,1.2,1,8);
        lamp(k,f*8.6,front+5.5,3.6,3);
      }
    }
  });

  // 5. Cầu Ghềnh — three 75 m bowstring truss spans of 2016 carrying the
  //    North–South railway (way 138540676). Local +X runs along the bridge. The
  //    motorbike lanes (ways 137713869, 1013624949) hang on the upstream side at
  //    z = -4…-11 and are left completely clear.
  const ghenhSpans=[-78,0,78];
  sights.push({
    id:'cau-ghenh',name:'Cầu Ghềnh',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.8239515,lat:10.9305308,start:[106.8251329,10.9317131],width:240,depth:8,yaw:.6528,viewDistance:1400,
    foundationOnBridge:true,foundationAt:[-117,0],
    map:'https://www.openstreetmap.org/way/138540676',
    source:'https://vtcnews.vn/anh-tau-hoa-lan-banh-tren-cau-ghenh-truoc-ngay-khanh-thanh-ar264525.html',
    description:'Cầu đường sắt qua nhánh sông Đồng Nai nối Bửu Hòa với cù lao Phố. Cầu cũ do Pháp xây đầu thế kỷ 20 bị sà lan đâm sập năm 2016; cầu mới dài 239 m gồm ba nhịp dàn vòm thép 75 m, có làn riêng cho xe máy ở phía thượng lưu.',
    reserve:(x,z,r)=>Math.abs(x)<120+r&&Math.abs(z)<3.6+r,
    solids:ghenhSpans.map(x=>[x,0,37.5,3]),
    build(T,k){
      const {box,palette}=k;
      const steel=0xdfe3e4,steelDark=0xb9bfc2,concrete=0xb5b1a6,sleeper=0x5a4a3c,rail=0x8a8f92;
      palette({metal:[steel,steelDark,rail],stone:[concrete],timber:[sleeper]});
      const half=2.8,deck=.6,rise=13,panels=10,L=75;
      const member=(x1,y1,x2,y2,z,t,tint=steel)=>box(tint,(x1+x2)/2,(y1+y2)/2,z,Math.hypot(x2-x1,y2-y1),t,t,0,0,Math.atan2(y2-y1,x2-x1));
      const top=i=>deck+rise*(1-(2*i/panels-1)**2);
      for(const cx of ghenhSpans){
        const x0=cx-L/2;
        for(const f of [-1,1]){
          const z=f*half;
          box(steelDark,cx,deck,z,L,.7,.45);
          for(let i=0;i<panels;i++){
            const xa=x0+i*L/panels,xb=x0+(i+1)*L/panels;
            member(xa,top(i),xb,top(i+1),z,.5);
            if(i)member(xa,deck,xa,top(i),z,.3);
            // Diagonals fall towards mid-span.
            if(i>0&&i<panels-1){
              if(i<panels/2)member(xa,top(i),xb,deck,z,.24);else member(xa,deck,xb,top(i+1),z,.24);
            }
          }
        }
        // Portal and wind bracing between the two arches, floor beams and timber sleepers.
        for(let i=2;i<=panels-2;i++){
          const x=x0+i*L/panels;
          box(steel,x,top(i),0,.3,.3,half*2);
          if(i<panels-2)box(steelDark,x+L/panels/2,(top(i)+top(i+1))/2,0,.16,.16,half*2+3.6,Math.atan2(half*2,L/panels)*(i%2?1:-1),0,Math.atan2(top(i+1)-top(i),L/panels));
        }
        for(let i=0;i<=panels;i++)box(steelDark,x0+i*L/panels,deck-.1,0,.4,.5,half*2);
        box(sleeper,cx,deck+.3,0,L,.16,2.4);
        for(const f of [-1,1])box(rail,cx,deck+.45,f*.5,L,.14,.08);
      }
      // Concrete piers and abutments under the trusses only.
      for(const x of [-39,39]){
        box(concrete,x,-6.2,0,3.6,12.6,6.8);box(concrete,x,-.1,0,4.6,.7,7.2);
      }
      for(const x of [-118.5,118.5])box(concrete,x,-3.2,0,4,7.4,7.2);
    }
  });

  // 6. Ga Biên Hòa — station building way 981465489, entered from the end of
  //    Đường Hưng Đạo Vương. Local +Z faces west; the tracks lie behind (z < -16).
  sights.push({
    id:'ga-bien-hoa',name:'Ga Biên Hòa',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.8263274,lat:10.9507819,start:[106.825956,10.950838],width:74,depth:40,yaw:-Math.PI/2,
    map:'https://www.openstreetmap.org/way/981465489',
    source:'https://commons.wikimedia.org/wiki/File:Bien_Hoa_Station.jpg',
    description:'Nhà ga chính của Biên Hòa trên tuyến đường sắt Bắc–Nam, lý trình Km 1697+480, cách ga Sài Gòn 29 km. Nhà ga hai tầng sơn xanh dương, tầng trên che lam chắn nắng, hàng chữ đỏ “Ga Biên Hòa” trên mái.',
    modeledBuildings:['w981465489'],
    solids:[[-5,2,19.5,5.8],[3.7,-6,21.8,2.4]],
    build(T,k){
      const {box,stamp,round,sign,palette}=k;
      const blue=0x5aa9d8,blueDark=0x3f86b8,white=0xeef1f1,louvre=0xd9dcd8,glass=0x6f8a96,canopy=0xc9cdcc,red=0xd23a32,
        paving=0xc7b9a3,dark=0x23282c,roof=0xe6dcc0,post=0xd8d4c8,pot=0x8f4a36,pink=0xd9559a;
      palette({plaster:[blue,blueDark,white,post],stone:[paving,canopy],metal:[louvre,roof],glass:[glass,dark]});
      const cx=-5,W=39,D=11.5,cz=2,front=cz+D/2;
      box(paving,cx,.16,front+7.5,W+8,.32,15);
      // Two storeys of blue piers; glazed ground floor, louvred upper floor.
      box(blueDark,cx,3.6,cz-.3,W,7.2,D-.6);
      for(let i=0;i<=8;i++){
        const x=cx+(i/8-.5)*(W-.7);
        box(blue,x,4.0,front-.25,.7,8.0,.6);
        if(i<8){
          const mx=x+(W-.7)/16;
          box(glass,mx,1.7,front-.5,(W-.7)/8-.7,3.0,.1);
          box(louvre,mx,5.6,front-.42,(W-.7)/8-.7,2.6,.14);
          for(let j=0;j<5;j++)box(white,mx,4.6+j*.5,front-.33,(W-.7)/8-.7,.08,.06);
          box(white,mx,7.25,front-.4,(W-.7)/8-.7,.5,.12);
        }
      }
      // Canopy slab over the entrances, parapet and the red name on the roof line.
      box(canopy,cx,3.6,front+1.2,W+1.2,.3,3.2);
      box(blue,cx,8.35,cz-.3,W+.4,.9,D-.2);
      box(white,cx,8.85,cz-.3,W+.8,.12,D+.2);
      for(const f of [-1,1])box(red,cx+f*7.6,9.0,front-.4,.12,.3,.12);
      sign('GA BIÊN HÒA',cx,9.7,front-.36,15,1.5,true,'#d23a32');
      box(dark,cx-2,3.05,front+.1,9.6,.8,.12);
      box(dark,cx+7.5,3.05,front+.1,4.4,.8,.12);
      box(dark,cx,1.5,front-.42,3.6,2.8,.1);
      for(let i=0;i<3;i++)box(i%2?paving:canopy,cx,.1+i*.08,front+.9+i*.36,7,.2+i*.16,.4);
      // Flowering shrubs in pots at the doors.
      for(const x of [-9,-6,6,9]){
        stamp(round,pot,cx+x,.7,front+2.4,.5,.76,.5);stamp(round,leaf,cx+x,1.9,front+2.4,1.0,1.8,1.0);
        stamp(round,pink,cx+x,2.6,front+2.4,.8,.5,.8);
      }
      // Single-storey range on the platform side and the platform shelter, clear of the rails.
      box(blueDark,3.7,2.2,-6,43.5,4.4,4.7);box(white,3.7,4.5,-6,44,.2,5.2);
      box(roof,6,4.3,-12,72,.18,5.4);
      for(let x=-28;x<=40;x+=8.5)for(const z of [-10,-14])stamp(round,post,x,2.1,z,.1,4.2,.1);
      box(paving,6,.2,-11.8,74,.4,6.4);
    }
  });

  // 7. Đền thờ Nguyễn Hữu Cảnh (đình Bình Kính) — temple way 982159598 with the
  //    east hall 982159594 inside precinct way 977763754 on Cù lao Phố. Local +Z
  //    runs from the temple across the court and statue to the gate.
  sights.push({
    id:'den-tho-nguyen-huu-canh',name:'Đền thờ Nguyễn Hữu Cảnh',city:'Biên Hòa',province:'Đồng Nai',region:'Nam Bộ',
    lon:106.825755,lat:10.931062,start:[106.8253616,10.9304769],width:76,depth:96,yaw:-1.049,
    map:'https://www.openstreetmap.org/way/982159598',
    source:'https://dantri.com.vn/doi-song/den-tho-nguyen-huu-canh-noi-ghi-dau-nguoi-di-mo-coi-vung-dat-dong-nai-20260518112219850.htm',
    description:'Đền thờ Lễ Thành hầu Nguyễn Hữu Cảnh, người vâng lệnh chúa Nguyễn vào kinh lược xứ Đồng Nai năm 1698, vốn là đình Bình Kính ở cù lao Phố, di tích quốc gia từ năm 1991. Trước đền là sân lát đá với tượng đồng ông nhìn ra sông Đồng Nai.',
    boundary:[[-38,-22],[14,-22],[26,20],[30,70],[-16,70],[-40,66]],
    modeledBuildings:['w982159598','w982159594','w982159595','w982159596'],
    reserve:(x,z,r)=>Math.abs(x)<15+r&&z>-20-r&&z<70+r||[[-28,54,12,11],[17,54,5,5],[-10,64,3,3],[-42,6,5,5],[-31,6,5,5]]
      .some(([cx,cz,w,d])=>Math.abs(x-cx)<w+r&&Math.abs(z-cz)<d+r),
    solids:[[0,9,8.2,7.4],[2.5,-9.5,7.4,7.4],[2.3,53,2.2,2.2],[-28,54,10,9],[17,54,3.4,3.4],[-10,64,2,2],[-7.6,67,.8,.8],[-2.8,67,.8,.8],[5.6,67,.8,.8],[10.4,67,.8,.8],[-42,6,3.6,3.6],[-31,6,4,4]],
    build(T,k){
      const {box,stamp,round,tapered,outline,place,sign,wavingFlag,palette}=k;
      const tileR=[0xd0714a,0xc4653f,0xb85a38],cream=0xf0e2b8,yellow=0xe7c773,white=0xf3f1ea,red=0xb5302a,dark=0x3a2c28,
        stone=0xb9b5aa,slab=0xb7b2a4,brick=0xc77a52,bronze=0x9a7a3a,bronzeDark=0x7a5f2c,granite=0x8f8d88,blueish=0x6f93b5,gilt=0xe2b53a,jade=0x3f8f6a;
      palette({tile:tileR,plaster:[cream,yellow,white],stone:[stone,slab,granite],brick:[brick],metal:[bronze,bronzeDark,gilt],timber:[red,dark]});
      // Court: grey stone slabs on the axis, terracotta brick round the temple.
      box(slab,0,.16,42,28,.32,50);
      box(brick,1,.17,2,30,.34,42);
      for(let z=24;z<66;z+=7)box(stone,0,.18,z,28,.36,.3);
      // Front hall: open veranda of painted columns under the name frieze.
      place(0,9,0,()=>{
        const W=16,D=14,floor=.9,wall=4.4;
        box(stone,0,floor/2,0,W+2,floor,D+2);
        for(let i=0;i<4;i++)box(i%2?slab:stone,0,(floor-i*.2)/2,D/2+1.2+i*.38,8,floor-i*.2,.4);
        box(cream,0,floor+wall/2,-1.6,W-1,wall,D-3.4);
        box(dark,0,floor+1.9,.2,W-3,3.6,.2);
        for(let i=0;i<6;i++){
          const x=(i/5-.5)*(W-1);
          stamp(round,white,x,floor+wall/2,D/2-.5,.24,wall,.24);stamp(round,blueish,x,floor+wall*.55,D/2-.5,.27,wall*.5,.27);
          if(i<5&&i!==2){box(white,x+(W-1)/10,floor+.5,D/2-.5,(W-1)/5-.6,.7,.12);}
        }
        for(let i=0;i<5;i++)stamp(round,red,(i/4-.5)*(W-4),floor+wall-.9,D/2-.2,.26,.4,.26);
        box(cream,0,floor+wall+.5,D/2-.4,W+.4,1.0,.5);
        sign('NGUYỄN HỮU CẢNH',0,floor+wall+.5,D/2-.12,6.4,.72,false,'#b5302a');
        tileRoof(T,k,tileR,white,0,floor+wall+1.0,0,W+2.4,D+2.2,3.0,.5);
        // Scrolled crest board above the eave.
        outline([[-2.6,0],[2.6,0],[2.3,.9],[1.2,1.3],[0,1.7],[-1.2,1.3],[-2.3,.9]],cream,0,floor+wall+1.5,D/2+.5,.22);
        box(red,0,floor+wall+2.1,D/2+.74,3.4,.5,.04);
        for(const f of [-1,1])box(jade,f*1.9,floor+wall+3.0,D/2+.6,1.3,.3,.2,0,0,f*.4);
      });
      // Rear sanctuary under its own roof.
      place(2.5,-9.5,0,()=>{
        box(stone,0,.45,0,16,.9,16);box(yellow,0,3.1,0,14,4.4,14);
        for(const f of [-1,1])for(const z of [-3,3])box(dark,f*7.02,3.0,z,.08,1.8,1.3);
        tileRoof(T,k,tileR,white,0,5.4,0,16.2,16.2,3.4,.5);
      });
      // Bronze statue (abstract massing) on its granite pedestal, flower beds and incense urn.
      place(2.3,53,0,()=>{
        box(granite,0,.5,0,4.6,.7,4.6);box(granite,0,1.9,0,2.6,2.2,2.6);box(stone,0,3.1,0,3.0,.24,3.0);
        tapered(bronze,0,5.0,0,1.05,.7,3.6,1,10);
        stamp(round,bronze,0,7.1,0,.62,.9,.5);box(bronze,0,6.5,0,2.0,.5,.7);
        stamp(round,bronzeDark,0,8.0,0,.36,.9,.36);tapered(bronzeDark,0,8.7,0,.42,.16,.5,1,8);
        box(bronzeDark,.9,4.6,.5,.1,3.0,.1,0,0,-.2);
        for(const f of [-1,1])box(gilt,f*1.5,1.0,2.6,1.2,.5,.6);
        stamp(round,granite,0,.8,4.6,.6,1.0,.6);stamp(round,granite,0,1.4,4.6,.8,.3,.8);
        for(const f of [-1,1])box(red,f*6,.5,3.4,6.5,.5,.5,f*.5);
      });
      // Three-door gate with red piers, and the dragon balustrades of the steps.
      place(1.4,67,0,()=>{
        for(const x of [-9,-4.2,4.2,9])box(red,x,2.4,0,1.0,4.8,1.0);
        box(cream,0,5.1,0,19.5,.7,1.4);
        tileRoof(T,k,tileR,white,0,5.5,0,12,3.4,1.5,.5);
        for(const f of [-1,1])tileRoof(T,k,tileR,white,f*7.4,5.0,0,6.6,3.0,1.2,.5);
        for(const x of [-6.6,0,6.6])box(dark,x,2.0,-.3,x?3.4:6.6,3.8,.1);
        for(const f of [-1,1]){
          box(jade,f*3.0,.7,-3.0,.6,.7,4.4,f*.2);stamp(round,jade,f*3.5,1.3,-5.2,.5,1.0,.5);
        }
      });
      // East hall, two-tier pavilion and the small kiosk beside the gate.
      place(-28,54,0,()=>{
        box(stone,0,.4,0,21,.8,19);box(yellow,0,2.7,0,18,3.8,16);
        for(let i=0;i<5;i++)stamp(round,white,(i/4-.5)*17,2.6,8.6,.2,3.6,.2);
        for(const x of [-5,0,5])box(dark,x,2.3,8.02,2.6,2.8,.08);
        tileRoof(T,k,tileR,white,0,4.7,0,22,20,3.6,.5);
      });
      place(17,54,0,()=>{
        box(stone,0,.35,0,7.6,.7,7.6);
        for(const fx of [-1,1])for(const fz of [-1,1])stamp(round,red,fx*2.6,2.4,fz*2.6,.2,3.4,.2);
        tileRoof(T,k,tileR,white,0,4.1,0,8.6,8.6,1.4,.7);
        box(cream,0,5.3,0,3.6,1.0,3.6);
        tileRoof(T,k,tileR,white,0,5.8,0,5.6,5.6,1.6,.7);
      });
      place(-10,64,0,()=>{
        box(stone,0,.3,0,4.4,.6,4.4);box(cream,0,1.9,0,3.2,2.6,3.2);
        tileRoof(T,k,tileR,white,0,3.2,0,5,5,1.4,.4);
      });
      // Two small houses at the back of the precinct.
      for(const x of [-42,-31])place(x,6,0,()=>{
        box(yellow,0,1.7,0,7,3.4,7);tileRoof(T,k,tileR,white,0,3.4,0,8.4,8.4,1.8,0);
      });
      // Flag above the temple roof and lamp standards round the court.
      stamp(round,0xcfd2d2,0,10.6,6,.06,5,.06);wavingFlag(1.8,1.2,.06,13,6);
      for(const z of [26,40,58])for(const f of [-1,1])lamp(k,f*13.4,z,4.2,3);
    }
  });

  window.VietnamSights??=[];
  window.VietnamSights.push(...sights);
})();
