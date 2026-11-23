/* Fictional vehicles and fictional VietForward (VF) models. Capacities and driving characteristics below are simulation settings. */
(() => {
  const entries=[
    ['apex','Apex GT','Coupé','Coupé thể thao','cam','#ff771e',4.79,1.91,1.35,1350,145,7.2,'petrol',60,8.2],
    ['bus','City Bus','Xe buýt','Xe buýt đô thị','xanh ngọc','#067974',10.884,2.48,3.202,10300,82,2.7,'diesel',180,28],
    ['vf3','VietForward VF 3','VF 3','Mini SUV điện · 2 cửa','vàng','#efb91e',3.19,1.68,1.62,860,100,5.2,'electric',18.6,12]
  ];
  globalThis.DuongVietFleet=entries.map(([id,name,tab,type,paint,hex,length,width,height,mass,top,accel,fuel,capacity,rate])=>({
    id,name,tab,type,paint,hex,length,width,height,mass,top,accel,fuel,capacity,rate,electric:fuel==='electric',
    group:id.startsWith('vf')?'VietForward':['bus','truck','limo'].includes(id)?'Dịch vụ':'Cá nhân'
  }));
})();
