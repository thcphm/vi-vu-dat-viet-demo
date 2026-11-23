'use strict';

// Keep the descriptions attached to the same stage IDs in the atlas and both drives.
const scenicPasses=new Map([
  ['deo-hai-van',{region:'Lăng Cô · Đà Nẵng',landscape:'Núi ven biển',
    description:'Đường ôm sườn núi Hải Vân. Qua mỗi mũi núi, một khoảng biển lại hiện ra giữa rừng và chân trời.'}],
  ['deo-ma-pi-leng',{region:'Đồng Văn · Mèo Vạc',landscape:'Hẻm vực đá vôi',
    description:'Theo quốc lộ 4C qua cao nguyên đá. Sông Nho Quế uốn dưới hẻm vực, thấp hơn con đường hàng trăm mét.'}],
  ['deo-khau-pha',{region:'Tú Lệ · Mù Cang Chải',landscape:'Ruộng bậc thang',
    description:'Đường đèo men theo những sườn rừng trên thung lũng. Các thửa ruộng bậc thang xếp lớp dọc theo đường đồng mức.'}],
  ['deo-o-quy-ho',{region:'Sa Pa · Tam Đường',landscape:'Sống núi cao',
    description:'Theo đường đèo qua dãy Hoàng Liên Sơn. Những nếp núi nối nhau bên ngoài khúc cua, xa dần về phía thung lũng.'}],
  ['deo-pha-din',{region:'Thuận Châu · Tuần Giáo',landscape:'Thung lũng Tây Bắc',
    description:'Ở Pha Đin, quốc lộ 6 lượn giữa hai sườn dốc. Từ các đoạn đường cao, có thể nhìn qua nhiều lớp đồi trùng điệp.'}],
  ['deo-ngoan-muc',{region:'Sông Pha · Đơn Dương',landscape:'Sườn cao nguyên',
    description:'Từ lưu vực Sông Pha lên cao nguyên, các khúc ngoặt bám sát sườn núi. Triền rừng và đồng bằng mở ra ở hai cao độ khác nhau.'}]
]);

function scenicHour(){
  const light=new URLSearchParams(location.search).get('light');
  return light==='morning'?7.25:light==='late'?16.5:null;
}

// The simulated carriageway smooths sharp hillside DEM gradients over the length
// of an approach. Its profile is shared by the driving physics and the route atlas.
function smoothRoadProfile(stage){
  if(!stage)return null;
  const h=stage.heights,rises=[];
  for(let i=1;i<h.length;i++)rises.push((h[i]-h[i-1])/stage.step);
  const result=[0],weights=[1,2,3,4,5,6,5,4,3,2,1];
  let previous;
  for(let i=0;i<rises.length;i++){
    let slope=0;
    for(let j=-5;j<=5;j++)slope+=weights[j+5]*rises[Math.max(0,Math.min(i+j,rises.length-1))]/36;
    const target=.087*Math.tanh(slope/.087);
    previous=previous===undefined?target:Math.max(previous-.018,Math.min(target,previous+.018));
    result.push(result[i]+stage.step*previous);
  }
  return result;
}

function createScenicTrace(stage,graph){
  const [lon,lat]=stage.start;
  const points=stage.trace.map(([dx,dy])=>graph.point(lon+dx/1e6,lat+dy/1e6));
  const last=points.length-1;
  let previous=null,finished=false;
  function status(car){
    let error=Infinity,station=0,direction=0;
    for(let i=0;i<last;i++){
      const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z;
      const f=Math.max(0,Math.min(1,((car.x-a.x)*dx+(car.z-a.z)*dz)/(dx*dx+dz*dz)));
      const gap=(car.x-a.x-f*dx)**2+(car.z-a.z-f*dz)**2;
      if(gap<error){error=gap;station=i+f;direction=Math.atan2(dx,-dz);}
    }
    const remaining=(last-station)*stage.step;
    if(error<18**2 && !car.offroad && previous!==null && previous>=last-4 &&
       station>previous && remaining<13)finished=true;
    previous=station;
    if(finished)return 'Đã hết chặng · Tiếp tục lái tự do';
    if(error>35**2)return 'Cách tuyến '+Math.round(Math.sqrt(error))+' m · Xem vệt xanh trên bản đồ';
    if(Math.cos(car.yaw-direction)<-.35)return 'Đang đi ngược chiều chặng';
    return 'Còn '+(remaining/1000).toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1})+' km';
  }
  return {visiblePaths:()=>[points],finish:points[last],status};
}
