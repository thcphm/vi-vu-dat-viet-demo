'use strict';
(()=>{
  const timber=0x704733,deepWood=0x50382f,stone=0xb3afa0,lightStone=0xc5c1b4;
  const tiles=[0x605e58,0x67635c,0x65615b,0x6b6761], ridge=0x8f897b;
  // The three halls share a traditional roof construction. Each surface has a
  // bowed slope, four lifted eaves, a solid fascia, hips and a decorated ridge.
  function hipRoof(T,{box,stamp,outline},w,d,y,rise){
    const halfRidge=Math.max(w*.22,(w-d)*.5),corners=[[-1,-1],[-1,1],[1,1],[1,-1]];
    const surfaces=tiles.map(()=>[]),soffit=[],thickness=.48;
    function vertex(side,u,t){
      const a=corners[side],b=corners[(side+1)%4],vx=a[0]+(b[0]-a[0])*u,vz=a[1]+(b[1]-a[1])*u;
      return [vx*(halfRidge+(w/2-halfRidge)*t),y+rise*(1-t**.63)+Math.min(2.75,rise*.35)*(Math.abs(vx*vz)**5)*t**3,vz*d*.5*t];
    }
    for(let side=0;side<4;side++){
      const cols=side%2?48:26,rows=6;
      for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
        const a=vertex(side,i/cols,j/rows),b=vertex(side,(i+1)/cols,j/rows);
        const c=vertex(side,(i+1)/cols,(j+1)/rows),e=vertex(side,i/cols,(j+1)/rows);
        const surface=surfaces[(i+Math.floor(i/6)+Math.floor(j/3))%tiles.length];
        surface.push(...a,...e,...b,...b,...e,...c);
        for(const p of [a,b,e,b,c,e])soffit.push(p[0],p[1]-thickness,p[2]);
        if(j===rows-1)surfaces[0].push(...e,e[0],e[1]-thickness,e[2],...c,...c,e[0],e[1]-thickness,e[2],c[0],c[1]-thickness,c[2]);
      }
      const tip=vertex(side,0,1),[sx,sz]=corners[side];
      outline([[0,-.26],[1.1,-.06],[2.1,.64],[2.96,2.08],[2.8,2.26],[2.23,1.46],[2.28,2.06],[1.7,1.84],[1.16,.94],[.4,.62],[-.15,.45]],
        ridge,...tip,.3,Math.atan2(-sz,sx));
    }
    for(const [vertices,color] of [...surfaces.map((v,i)=>[v,tiles[i]]),[soffit,deepWood]]){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
      stamp(g,color,0,0,0);g.dispose();
    }
    box(ridge,0,y+rise+.17,0,halfRidge*2+.4,.45,.6);
    for(const side of [-1,1])outline([[0,0],[1.5,.15],[2.4,1.05],[2.15,1.33],[1.36,.78],[.65,.96],[-.45,.5]],ridge,side*(halfRidge-.7),y+rise,0,.35,side===1?0:Math.PI);
  }

  function stairTerrace({box},w,d,level,foundations,deckHeight){
    const slabW=w+6,slabD=d+7;
    const deck=foundations.fixture(deckHeight,()=>{
      box(0x8c887d,0,level/2-.2,0,slabW,level+.4,slabD);
      box(stone,0,level-.10,0,slabW+.5,.24,slabD+.5);
      for(const side of [-1,1])for(let n=0;n<=4;n++){
        const x=side*(w*.265+n*(slabW/2-w*.265)/4),z=slabD/2;
        box(0xa9a599,x,level+.72,z,.52,1.45,.5);box(lightStone,x,level+1.49,z,.64,.23,.62);
        if(n<4)box(lightStone,x+side*(slabW/2-w*.265)/8,level+1.22,z,(slabW/2-w*.265)/4,.24,.27);
      }
    });
    foundations.skirt(0,0,slabW-.03,slabD-.03,-.3,deck);
    const count=Math.ceil(level/.27),step=level/count;
    for(let j=0;j<count;j++){
      const h=(j+1)*step,z=slabD/2+(count-j-.5)*.51;
      const stepAnchor=foundations.fixture(ground=>{
        const entry=ground(0,slabD/2+count*.51),t=(j+.5)/count;
        return entry*(1-t)+deck.height*t;
      },()=>{
        box(j%2?stone:lightStone,0,h/2,z,w*.46,h,.53);
        for(const side of [-1,1])box(0xa19c8c,side*w*.237,h/2+.22,z,.7,h+.44,.54);
      });
      foundations.skirt(0,z,w*.46-.03,.51,.03,stepAnchor);
    }
    return deck;
  }
  function veranda(T,kit,width,depth,base,height,bays){
    const {box,stamp}=kit,post=new T.CylinderGeometry(1,1.07,1,8),widthInside=width-5,depthInside=depth-5;
    box(deepWood,0,base+height/2,0,widthInside,height,depthInside);
    box(0x835b40,0,base+height-.25,0,width+.42,.6,depth+.42);
    function column(x,z){
      box(stone,x,base+.17,z,.95,.34,.95);stamp(post,timber,x,base+height/2,z,.4,height,.4);
      box(0x916546,x,base+height-.57,z,1.43,.42,1.09);
    }
    for(const s of [-1,1]){
      for(let i=0;i<=bays;i++){
        const x=(i/bays-.5)*width;column(x,s*depth/2);
        if(i===bays)continue;
        const bay=width/bays,mid=x+bay/2,z=s*(depthInside/2+.10);
        for(let j=0;j<4;j++){
          const px=mid+(j-1.5)*bay*.186;
          box(j%2?0x684635:0x77513a,px,base+height*.48,z,bay*.174,height*.83,.17);
          box(0x39362e,px,base+height*.64,z+s*.12,bay*.141,height*.30,.08);
          box(timber,px,base+height*.64,z+s*.17,.10,height*.29,.08);
        }
      }
      for(let j=1;j<4;j++)column(s*width/2,depth*(j/4-.5));
    }
    post.dispose();
  }

  function hall(T,kit,plan){
    const {w,d,base,tiers,bays}=plan,foundations=createTempleFoundations(T,kit);
    function deckHeight(ground){
      // A level floor clears the uphill corners; the stair foot meets the forecourt.
      let height=ground(0,0);
      for(const x of [-w/2-3,0,w/2+3])for(const z of [-d/2-3.5,0,d/2+3.5])height=Math.max(height,ground(x,z)-base+.12);
      return height;
    }
    const deck=stairTerrace(kit,w,d,base,foundations,deckHeight);
    foundations.fixture(()=>deck.height,()=>{
      let floor=base;
      for(const [ww,dd,eave,top] of tiers){
        veranda(T,kit,ww-5,dd-5,floor,eave-floor+.25,bays);
        hipRoof(T,kit,ww,dd,eave,top-eave);
        floor=eave+(top-eave)*.50;
      }
    });
    if(plan.cauldronZ)foundations.fixture(g=>g(0,plan.cauldronZ),()=>cauldron(T,kit,plan.cauldronZ));
  }
  function cauldron(T,{stamp,box},z){
    const profile=[[.8,.45],[.98,.62],[1.7,1.05],[2.10,1.85],[2.03,2.30],[1.88,2.54],[2.15,2.63],[2.14,2.79],[1.8,2.77],[1.65,2.51]].map(([x,y])=>new T.Vector2(x,y));
    const bowl=new T.LatheGeometry(profile,24);
    stamp(bowl,0x35392e,0,0,z);bowl.dispose();
    for(const s of [-1,1]){
      box(0x443e30,s*1.86,3.05,z,.25,1,.45);
      box(0x443e30,s*1.53,3.49,z,.89,.23,.45);
      box(0x443e30,s*1.18,3.12,z,.2,.86,.45);
    }
    for(let i=0;i<3;i++){const a=i*2*Math.PI/3;box(0x373a30,Math.cos(a)*.94,.35,z+Math.sin(a)*.94,.54,.76,.54);}
  }
  const common={
    complex:'tam-chuc',city:'Kim Bảng',province:'Ninh Bình',region:'Bắc Bộ',yaw:2.38,gardenRadius:150,
    photo:'https://thesmartlocal.com/vietnam/tam-chuc-pagoda/',
    source:'https://vietnamtourism.gov.vn/en/printer/15748?type=1'
  };
  (window.VietnamSights??=[]).push({
    ...common,id:'dien-quan-am',tourOrder:3,name:'Điện Quan Âm',lon:105.795991,lat:20.553143,
    map:'https://www.openstreetmap.org/way/1386126640',start:[105.79362,20.55243],width:68,depth:56,
    solids:[[0,0,26.9,13.5]],description:'Qua Vườn Cột Kinh, những bậc đá dẫn lên điện thờ Quan Âm. Từ hiên điện, trục bậc thềm nhìn thẳng ra sân cột kinh và mặt hồ.',
    build(T,kit){hall(T,kit,{w:61,d:34,base:2.4,bays:9,tiers:[[61,34,8.9,15.6],[51.2,26.4,13.7,22.4]]});}
  },{
    ...common,id:'dien-phap-chu',tourOrder:4,name:'Điện Pháp Chủ',lon:105.795185,lat:20.552322,
    map:'https://www.openstreetmap.org/way/1386126642',start:[105.79376,20.55191],width:71,depth:65,
    solids:[[0,0,28.5,20]],description:'Điện Pháp Chủ nằm ở giữa trục hành lễ. Dưới hai tầng mái cong là pho tượng Phật Thích Ca và những phù điêu kể về cuộc đời Đức Phật.',
    build(T,kit){hall(T,kit,{w:64,d:48,base:3.1,bays:9,tiers:[[64,48,11.8,20.6],[52.5,36,18.0,29.2]]});}
  },{
    ...common,id:'dien-tam-the',tourOrder:5,name:'Điện Tam Thế',lon:105.794355,lat:20.551562,
    map:'https://www.openstreetmap.org/way/1386126641',start:[105.793850,20.551377],width:84,depth:77,
    solids:[[0,0,34.4,22.1],[0,37,2.1,2.1]],description:'Điện Tam Thế có ba tầng mái và thờ ba pho Phật tượng trưng cho quá khứ, hiện tại và tương lai. Trước bậc thềm là chiếc vạc đồng lớn.',
    build(T,kit){hall(T,kit,{w:75,d:51,base:3.5,bays:11,cauldronZ:37,tiers:[[75,51,11.2,20.0],[65,41,18.45,27.2],[55.7,32.1,25.35,38.6]]});}
  });
})();
