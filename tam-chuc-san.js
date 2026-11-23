'use strict';
(() => {
  const yaw=2.39;
  const approach=[105.797968,20.555006];
  const common={city:'Kim Bảng',province:'Ninh Bình',region:'Bắc Bộ',complex:'tam-chuc',yaw,start:approach,
    source:'https://vietnamtourism.gov.vn/en/printer/15748?type=1'};
  const gatePosts=[];
  const towers=[[-35.3,22,18],[-2.8,25.4,22],[34.5,24,18]];
  const galleries=[[-19.9,13.8,10.4],[16.1,14.2,10.4]];
  for(const [x,w,d] of [...towers,...galleries]){
    for(const face of [-1,1])for(let i=0;i<4;i++)gatePosts.push([x-w*.39+i*w*.26,face*d*.38,.55,.55]);
  }
  function gate(T,kit){
    const {stamp,box,outline}=kit,foundations=createTempleFoundations(T,kit);
    const timber=0x51382b,lacquer=0x79523b,stone=0x9b998c,tile=0x65594d;
    const post=new T.CylinderGeometry(1,1,1,10);
    const postAt=(x,y,z,h,r)=>{
      box(stone,x,y+.15,z,r*2.75,.3,r*2.75);
      stamp(post,timber,x,y+h/2,z,r,h,r);
      box(lacquer,x,y+h-.24,z,r*3.6,.46,r*3.6);
    };
    // Sweep both roof hips up into the four lifted corner rafters.
    function roof(cx,y,w,d,rise){
      const vertices=[],colors=[],soffit=[],thickness=.24;
      const halfW=w/2,halfD=d/2,ridge=Math.max(w*.23,halfW-halfD*.92);
      const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
      for(let side=0;side<4;side++){
        const a=corners[side],b=corners[(side+1)%4],divisions=side%2?8:18;
        function sample(u,v){
          const x=a[0]+u*(b[0]-a[0]),z=a[1]+u*(b[1]-a[1]);
          const lift=Math.pow(Math.abs(x*z),5)*Math.pow(v,2.4)*rise*.54;
          return [cx+x*(ridge+(halfW-ridge)*v),y+rise*(1-Math.pow(v,.70))+lift,z*halfD*v];
        }
        for(let i=0;i<divisions;i++)for(let j=0;j<5;j++){
          const u=i/divisions,v=j/5,un=(i+1)/divisions,vn=(j+1)/5;
          const p=sample(u,v),q=sample(un,v),r=sample(un,vn),s=sample(u,vn);
          const bucket=(i%3===0?colors:vertices);
          // Corners wind clockwise in the horizontal XZ plane.
          bucket.push(...p,...q,...s,...q,...r,...s);
          for(const pnt of [p,s,q,q,s,r])soffit.push(pnt[0],pnt[1]-thickness,pnt[2]);
          if(j===4)vertices.push(...s,...r,r[0],r[1]-thickness,r[2],...s,r[0],r[1]-thickness,r[2],s[0],s[1]-thickness,s[2]);
        }
        const [sx,sz]=a;
        outline([[0,0],[.75,.1],[1.4,.61],[2.08,1.88],[1.89,1.99],[1.37,1.24],[1.26,1.61],[.83,1.1],[.28,.64],[-.19,.48]],
          0x60584d,cx+sx*halfW,y+rise*.54,sz*halfD,.21,Math.atan2(-sz,sx));
      }
      for(const [v,c] of [[vertices,tile],[colors,0x706357],[soffit,timber]]){
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();stamp(g,c,0,0,0);g.dispose();
      }
      box(0x5a5149,cx,y+rise+.11,0,ridge*2+.18,.30,.32);
    }
    function eaves(cx,y,w,d,h,upper){
      for(const side of [-1,1]){
        const z=side*d*.38;
        box(lacquer,cx,y+h-.29,z,w*.86,.64,.53);
        for(let i=0;i<4;i++)postAt(cx-w*.39+i*w*.26,y,z,h,.45);
        if(upper){
          box(0x4f352a,cx,y+h*.49,side*d*.27,w*.70,h*.87,.4);
          for(let k=-3;k<=3;k++){
            box(0x342d27,cx+k*w*.09,y+h*.5,side*(d*.27+.27),w*.065,h*.56,.10);
            box(lacquer,cx+k*w*.09,y+h*.5,side*(d*.27+.37),.09,h*.59,.09);
          }
          box(timber,cx,y+.78,z,w*.8,.15,.17);
          for(let k=-8;k<=8;k++)box(lacquer,cx+k*w*.047,y+.46,z,.11,.64,.13);
        }
      }
      for(const side of [-1,1])box(timber,cx+side*w*.39,y+h-.29,0,.53,.64,d*.78);
    }
    for(const [x,w,d] of towers){
      const center=x===towers[1][0];
      const anchor=foundations.fixture(g=>g(x,0),()=>{
        eaves(x,.2,w,d,5.6,false);roof(x,5.65,w+3,d+1.8,3.3);
        eaves(x,8.1,w*.77,d*.77,3.85,true);roof(x,11.8,w*.90,d*.89,3.5);
        if(center){eaves(x,14.35,w*.56,d*.55,3.35,true);roof(x,17.6,w*.70,d*.68,3.6);}
      });
      foundations.walk(w+.9,d+.6,x);
      for(const side of [-1,1])for(let i=0;i<4;i++){
        foundations.skirt(x-w*.39+i*w*.26,side*d*.38,1.19,1.19,.23,anchor);
      }
    }
    for(const [x,w,d] of galleries){
      const anchor=foundations.fixture(g=>g(x,0),()=>{
        eaves(x,.15,w,d,4.75,false);roof(x,4.76,w+1.3,11.9,2.42);
      });
      for(const side of [-1,1])for(let i=0;i<4;i++){
        foundations.skirt(x-w*.39+i*w*.26,side*d*.38,1.19,1.19,.18,anchor);
      }
    }
    post.dispose();
  }
  const pillars=[];
  for(const side of [-1,1])for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    pillars.push([side*(11+col*11.8),(row-1.5)*12.1]);
  }
  function court(T,kit){
    const {box,stamp,tapered,group}=kit,foundations=createTempleFoundations(T,kit);
    const grey=0xa4a79d,rock=0x93988f,shade=0x737d73;
    foundations.walk(9.3,68);
    const petal=new T.SphereGeometry(1,7,4);
    const bud=new T.LatheGeometry([[0,0],[.54,.07],[.68,.49],[.57,.88],[.24,1.3],[0,1.74]].map(([r,y])=>new T.Vector2(r,y)),10);
    // A single shared inscription texture preserves readable vertical lettering up close.
    const cloth=document.createElement('canvas');cloth.width=256;cloth.height=512;
    const ctx=cloth.getContext('2d');ctx.fillStyle='#98745b';ctx.fillRect(0,0,256,512);
    ctx.strokeStyle='#d2b16b';ctx.lineWidth=5;ctx.strokeRect(8,8,240,496);
    ctx.fillStyle='#e4c682';ctx.textAlign='center';ctx.font='bold 44px "Times New Roman", "Noto Serif", serif';
    for(const [i,word] of ['TÂM','AN','VẠN','SỰ','AN'].entries())ctx.fillText(word,128,83+i*83);
    const texture=new T.CanvasTexture(cloth);texture.colorSpace=T.SRGBColorSpace;
    const panels=new T.InstancedMesh(new T.PlaneGeometry(1.03,7.3),
      new T.MeshLambertMaterial({map:texture}),pillars.length*6);
    const pose=new T.Object3D();let index=0;
    for(const [x,z] of pillars){
      const firstPanel=index;
      const anchor=foundations.fixture(g=>g(x,z),()=>{
        box(0x979887,x,.23,z,6.1,.32,6.1);
        tapered(rock,x,.62,z,2.53,2.53,.55,1,12);
        tapered(grey,x,1.14,z,2.32,1.94,.67,1,12);
        for(let i=0;i<10;i++){
          const a=Math.PI*i/5;
          stamp(petal,i%2?rock:grey,x+1.85*Math.sin(a),1.19,z+1.85*Math.cos(a),.58,.73,.42,a,.24);
        }
        tapered(shade,x,1.80,z,1.75,1.54,.66,1,8);
        tapered(grey,x,6.17,z,1.29,1.24,8.44,1,6);
        for(let face=0;face<6;face++){
          const a=Math.PI*(face+.5)/3;
          pose.position.set(x+1.123*Math.sin(a),6.25,z+1.123*Math.cos(a));pose.rotation.y=a;pose.updateMatrix();
          panels.setMatrixAt(index++,pose.matrix);
        }
        tapered(rock,x,10.65,z,1.34,1.45,.58,1,8);
        tapered(grey,x,11.22,z,1.34,.96,.62,1,10);
        tapered(shade,x,11.62,z,.86,.76,.22,1,10);
        stamp(bud,grey,x,11.75,z);
      },height=>{
        const m=new T.Matrix4();
        for(let face=0;face<6;face++){
          panels.getMatrixAt(firstPanel+face,m);m.elements[13]=6.25+height;panels.setMatrixAt(firstPanel+face,m);
        }
        panels.instanceMatrix.needsUpdate=true;panels.boundingSphere=null;
      });
      foundations.skirt(x,z,6.06,6.06,.15,anchor);
    }
    for(const x of [-30,30])for(const z of [-27.5,27.5])for(let i=0;i<8;i++){
      const w=43/8,px=x+(i-3.5)*w;
      const anchor=foundations.fixture(g=>g(px,z),()=>{
        box(0xb4b3a5,px,.19,z,w,.23,2.9);
        box(0x516549,px,.61,z,w-.08,.79,2.5);
      });
      foundations.skirt(px,z,w-.03,2.87,.13,anchor);
    }
    panels.instanceMatrix.needsUpdate=true;group.add(panels);petal.dispose();bud.dispose();
  }
  (window.VietnamSights??=[]).push({
    ...common,id:'tam-quan-noi-tam-chuc',name:'Cổng Tam Quan nội',tourOrder:1,
    lon:105.797683,lat:20.554722,width:99,depth:29,solids:gatePosts,
    description:'Từ bến hồ nhìn vào, lầu giữa nổi lên với ba lớp mái cong. Hai lầu bên thấp hơn nối với lầu giữa bằng hành lang gỗ mở ra sân cột kinh.',
    photo:'https://pystravel.vn/tin/17354-ban-do-chua-tam-chuc.html',map:'https://www.openstreetmap.org/way/1386126630',build:gate
  },{
    ...common,id:'vuon-cot-kinh',name:'Vườn Cột Kinh',tourOrder:2,
    lon:105.796975,lat:20.554066,width:118,depth:68,solids:pillars.map(([x,z])=>[x,z,2.35,2.35]),
    description:'Hai cụm cột đá mở một lối giữa hướng về điện Quan Âm. Mỗi cột vươn lên từ đài sen, thân sáu cạnh mang chữ và kết thúc bằng một nụ sen đá.',
    photo:'https://danviet.vn/kham-pha-vuon-cot-kinh-bang-da-doc-dao-o-ngoi-chua-lon-nhat-the-gioi-77771055006-d789265.html',
    map:'https://www.openstreetmap.org/way/1518302470',build:court
  });
})();
