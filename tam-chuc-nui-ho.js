'use strict';
(()=>{
  // Four pitched faces share a short ridge and lift at the four corners.
  // The longitudinal ribs follow the same surface as the small tile courses.
  function roof(T,k,x,y,z,width,depth,height,yaw,tiles,ridge,stone=false){
    const pos=[],rgb=[],color=new T.Color(),sn=Math.sin(yaw),cs=Math.cos(yaw);
    const a=width/2,b=depth/2,r=Math.max(.1,a-b*.87);
    const outer=[[-a,b],[a,b],[a,-b],[-a,-b]],peak=[[-r,0],[r,0],[r,0],[-r,0]];
    function point(face,s,t){
      const next=(face+1)%4,sx=outer[face][0]*(1-s)+outer[next][0]*s,sz=outer[face][1]*(1-s)+outer[next][1]*s;
      const top=peak[face][0]*(1-s)+peak[next][0]*s;
      const u=sx*(1-t)+top*t,v=sz*(1-t);
      const lift=height*.22*Math.pow(Math.abs(s*2-1),4)*Math.pow(1-t,2);
      return new T.Vector3(x+cs*u+sn*v,y+height*t*(.73+.27*t)+lift,z-sn*u+cs*v);
    }
    function triangle(a,b,c,tint){color.setHex(tint);for(const v of [a,b,c]){pos.push(v.x,v.y,v.z);rgb.push(color.r,color.g,color.b);}}
    function rib(p,q,width){
      const d=q.clone().sub(p),m=q.clone().add(p).multiplyScalar(.5);
      const ang=Math.atan2(d.x,d.z),slope=-Math.atan2(d.y,Math.hypot(d.x,d.z));
      k.box(ridge,m.x,m.y+.05,m.z,width,width*.72,d.length()+.06,ang,slope);
    }
    for(let f=0;f<4;f++){
      const bays=Math.max(8,Math.round((f%2?depth:width)/.58)),rows=5;
      for(let b=0;b<bays;b++)for(let j=0;j<rows;j++){
        const p=point(f,b/bays,j/rows),q=point(f,(b+1)/bays,j/rows);
        const u=point(f,b/bays,(j+1)/rows),v=point(f,(b+1)/bays,(j+1)/rows);
        const tint=tiles[(b*7+j*3+f)%tiles.length];triangle(p,q,u,tint);triangle(q,v,u,tint);
        if(!j)rib(p,q,stone?.17:.15);
        if(!b)rib(p,u,stone?.22:.23);
      }
    }
    rib(point(0,0,1),point(0,1,1),stone?.2:.28);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.computeVertexNormals();
    const mesh=new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));mesh.castShadow=mesh.receiveShadow=true;k.group.add(mesh);
  }
  function summit(T,k){
    const foundation=createTempleFoundations(T,k);
    const roofStart=k.group.children.length;
    const platform=foundation.fixture(ground=>{
      let highest=ground(0,0);
      for(const u of [-8.4,0,8.4])for(const v of [-7.1,0,7.1])highest=Math.max(highest,ground(u,v));
      return highest;
    },()=>summitStonework(T,k),height=>{
      for(const roof of roofs)roof.position.y=height;
    });
    const roofs=k.group.children.slice(roofStart);
    foundation.skirt(0,0,16.8,14.2,.6,platform);
  }
  function summitStonework(T,k){
    const {box,tapered,stamp,round}=k,red=0xa55445,sand=0xc98671,dark=0x643a33,basalt=0x6c665c;
    const boulder=new T.DodecahedronGeometry(1,0);
    for(let i=0;i<19;i++){
      const angle=i*Math.PI*2/19;
      stamp(boulder,i%3?0x827f71:0x777568,Math.sin(angle)*7.4,-.15,Math.cos(angle)*6.4,2.1+(i%4)*.25,1.7+(i%3)*.35,2.2,angle);
    }
    boulder.dispose();
    box(basalt,0,.3,0,16.8,2.05,14.2);
    box(0xb6aba0,0,1.39,0,17.2,.3,14.6);
    for(const x of [-8.36,8.36]){
      for(let z=-6.85;z<=7;z+=2.25)box(0x9c9588,x,2.15,z,.25,1.45,.25);
      box(basalt,x,2.51,0,.23,.18,14);box(basalt,x,1.98,0,.13,.12,14);
    }
    for(const z of [-7.03,7.03])for(const x of [-5.67,5.67]){
      box(basalt,x,2.52,z,5.56,.16,.22);box(basalt,x,1.98,z,5.56,.12,.12);
      for(const dx of [-2.6,0,2.6])box(0xa49b8f,x+dx,2.12,z,.24,1.24,.25);
    }
    for(let i=0;i<9;i++)box(0xa19788,0,1.43-.19*i,7+.38*i,4.6,.28,.54);
    for(let i=0;i<3;i++)box(i%2?sand:red,0,1.68+i*.19,0,7.55-i*.32,.21,7.55-i*.32);
    const levels=[[2.13,4.1,5.85,8.25,1.19],[7.38,2.38,4.8,7.23,1.12],[10.81,1.8,3.88,6.05,1.28]];
    for(let n=0;n<levels.length;n++){
      const [base,h,w,eave,rise]=levels[n];
      box(red,0,base+h/2,0,w,h,w);
      for(const f of [-1,1]){
        const front=f*(w/2+.03);
        for(const u of [-w*.38,0,w*.38]){
          if(!u){
            const width=w*.38,high=h*.82;
            const arch=new T.Shape();arch.moveTo(-width*.5,0);arch.lineTo(width*.5,0);arch.lineTo(width*.5,high-width*.5);
            arch.absarc(0,high-width*.5,width*.5,0,Math.PI,false);arch.closePath();
            k.profile(arch,dark,0,base,front,.07,f>0?0:Math.PI);
            for(const dx of [-.3,0,.3])box(red,dx,base+high*.4,front+f*.115,.06,high*.77,.08);
            box(dark,f*(w/2+.03),base+h*.46,0,.08,h*.56,w*.29);
          }else{
            box(sand,u,base+h*.49,front,.22,h,.13);
            box(sand,front,base+h*.49,u,.13,h,.22);
          }
        }
      }
      for(const off of [0,.18])box(sand,0,base+h-off,0,w+.42-off,.12,w+.42-off);
      roof(T,k,0,base+h,0,eave,eave*.95,rise,0,[0x66544b,0x69574c,0x746158,0x6c584d],0x5c5048,true);
    }
    tapered(dark,0,14.25,0,.37,.26,.64,1,12);tapered(red,0,14.71,0,.3,.025,.61,1,12);
  }
  // World-metre offsets from the đình; east is +X and north is -Z.
  // Island: OSM 483729468. The bridge knots are surveyed nodes of way 1517604965.
  const shore=[[10,53.8],[18.4,52.2],[46,30.1],[51.7,20.2],[55,5.5],[52.6,-11.3],[47.6,-23],[37.2,-32.9],[23.5,-42.2],[10.1,-46.2],[-6,-47.3],[-18.4,-39.1],[-30.3,-18.3],[-34.3,-5.4],[-34.6,10.9],[-30.1,29.8],[-22.6,41.5],[-12.4,48.2],[-3.4,51.9]];
  const walkway=[[40.1,-24.4],[52.4,-66],[98.7,-75],[111.4,-120.4],[157.3,-128.1],[170,-170]];
  function island(T,k){
    const {box,stamp,round}=k,rock=0x7b7564,deck=0xc6bba9,rail=0x96938a;
    const verts=[],tints=[],col=new T.Color();
    function tri(a,b,c,tint){col.setHex(tint);for(const p of [a,b,c]){verts.push(...p);tints.push(col.r,col.g,col.b);}}
    for(let i=0;i<shore.length;i++){
      const [x,z]=shore[i],[xx,zz]=shore[(i+1)%shore.length];
      const a=[x*.91,1.08,z*.91],b=[xx*.91,1.08,zz*.91],c=[x,.15,z],d=[xx,.15,zz];
      tri([5,1.09,0],a,b,0x788255);tri(a,c,b,i%3?0x747761:rock);tri(b,c,d,i%3?rock:0x91866d);
      tri(c,[x*1.025,-2.1,z*1.025],d,rock);tri(d,[x*1.025,-2.1,z*1.025],[xx*1.025,-2.1,zz*1.025],rock);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(tints,3));g.computeVertexNormals();
    const soil=new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));soil.receiveShadow=true;k.group.add(soil);
    soil.userData.shoreCover=true;
    k.deck(0xae927c,10,1.23,4,49,.32,42,-.75);
    function hall(cx,cz,w,d,yaw,main){
      const cs=Math.cos(yaw),sn=Math.sin(yaw),timber=0x674231;
      const place=(color,x,y,z,width,height,depth)=>box(color,cx+x*cs+z*sn,y,cz-x*sn+z*cs,width,height,depth,yaw);
      const h=main?4.5:3.2;
      place(0xae9c86,0,1.57,0,w+.55,.55,d+.5);
      place(0xc49c7e,0,h/2+1.8,0,w-1.08,h,d-1.16);
      const bays=main?5:3;
      for(let i=0;i<bays;i++){
        const x=w*((i+.5)/bays-.5);
        place(timber,x,1.8+h*.44,d/2-.53,w/bays*.74,h*.85,.21);
      }
      for(let i=0;i<=bays;i++){
        const x=(i/bays-.5)*(w-.7);
        place(timber,x,1.8+h/2,d/2+.06,.24,h,.24);
      }
      roof(T,k,cx,1.8+h,cz,w+2.8,d+2.6,main?3:2.15,yaw,[0x795b52,0x876359,0x7e6158,0x906e62],0xb59e8e);
    }
    hall(-5,-6,11,9,.74,false);hall(1.2,2.8,21.4,11.9,.74,true);
    hall(.8,24,12,5.7,-.75,false);hall(25.5,4.2,12.6,5.6,-.75,false);
    hall(8.2,-17.5,7.7,3.1,.74,false);hall(5.5,-23,5.6,3.2,.74,false);
    const leaves=new T.IcosahedronGeometry(1,0);
    for(let i=0;i<shore.length;i++){
      const n=shore[(i+1)%shore.length];for(let j=0;j<2;j++){
        const f=j*.5,x=(shore[i][0]*(1-f)+n[0]*f)*.83,z=(shore[i][1]*(1-f)+n[1]*f)*.83;
        if(Math.hypot(x-39,z+24)<8)continue;
        const h=3.1+(i*13+j*7)%3;
        stamp(round,0x736047,x,1+h*.45,z,.27,h,.27);
        stamp(leaves,[0x506642,0x667b4e,0x405f47][(i+j)%3],x,1+h,z,3.8,h*.70,3.45,i+j);
      }
    }
    leaves.dispose();
    for(let i=1;i<walkway.length;i++){
      const [ax,az]=walkway[i-1],[bx,bz]=walkway[i],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
      const cx=(ax+bx)/2,cz=(az+bz)/2,yaw=Math.atan2(dx,dz),nx=dz/len,nz=-dx/len;
      k.deck(deck,cx,1.23,cz,3.15,.46,len+.55,yaw);
      for(const side of [-1,1]){
        box(rail,cx+nx*side*1.48,2.36,cz+nz*side*1.48,.13,.18,len,yaw);
        box(rail,cx+nx*side*1.48,1.94,cz+nz*side*1.48,.10,.11,len,yaw);
      }
      const bays=Math.ceil(len/2.8);
      for(let t=0;t<=bays;t++){
        const x=ax+dx*t/bays,z=az+dz*t/bays;
        for(const side of [-1,1])box(rail,x+nx*side*1.48,1.93,z+nz*side*1.48,.19,1.2,.19,yaw);
        if(t%3===0)box(rock,x,-1.36,z,1.46,4.85,.78,yaw);
      }
    }
  }
  (window.VietnamSights??=[]).push({
    id:'chua-ngoc-tam-chuc',name:'Chùa Ngọc',complex:'tam-chuc',tourOrder:6,city:'Kim Bảng',province:'Ninh Bình',region:'Bắc Bộ',
    lon:105.79278,lat:20.549706,yaw:2.46,viewAngle:2.3,viewElevation:.50,start:[105.793895,20.549502],width:19,depth:21,solids:[[0,0,3.4,3.4]],gardenRadius:66,viewDistance:3800,
    description:'Trên đỉnh núi Thất Tinh, chùa Ngọc có ba tầng mái cong. Thân tháp ghép từ các khối granit đỏ do nghệ nhân Ấn Độ chế tác, phía trước mở ra hồ Tam Chúc.',
    map:'https://www.openstreetmap.org/way/1518302477',photo:'https://dantri.com.vn/du-lich/doc-dao-ngoi-chua-co-pho-tuong-phat-hong-ngoc-nang-4-tan-20190427142245497.htm',source:'https://bnews.vn/photo/ve-dep-chua-ngoc-o-trung-tam-van-hoa-phat-giao-tam-chuc/122136/trang-1.html',build:summit
  },{
    id:'dinh-tam-chuc',name:'Đình Tam Chúc',complex:'tam-chuc',tourOrder:7,city:'Kim Bảng',province:'Ninh Bình',region:'Bắc Bộ',
    lon:105.809254,lat:20.560967,yaw:0,viewAngle:.52,start:[105.815566,20.559786],width:97,depth:102,solids:[[0,0,7.6,8.5],[25.5,4.2,4.1,4.3],[.8,24,4.1,4.3]],gardenRadius:105,
    description:'Đình nằm trên một đảo giữa hồ Lục Nhạc. Cầu đi bộ gấp khúc năm đoạn nối đảo đình với đảo Cò. Qua tán cây ven đảo có thể thấy tiền đường, hậu cung và sân lát gạch.',
    map:'https://www.openstreetmap.org/way/1517604966',photo:'https://ngaynay.vn/phatgiao/canh-sac-chua-tam-chuc-vinh-ha-long-tren-can-post100706.html',source:'https://vietnamtourism.gov.vn/en/printer/15748?type=1',build:island
  });
})();
