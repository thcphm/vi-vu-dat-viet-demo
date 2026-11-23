'use strict';
// Player cars. Dimensions are in metres and speeds in m/s.
const worldGarage={
  supercar:{asset:'streetscape/race-car.glb',length:4.6,paint:0xc63322,power:8.4,top:48},
  gt:{asset:'streetscape/electric-gt.glb',length:4.67,paint:0x305955,power:7.8,top:43,wheelbase:2.85,electric:true},
  'muscle-car':{asset:'streetscape/muscle-car.glb',length:4.90,paint:0x841619,power:7.1,top:45,wheelbase:2.75,mass:1680},
  rally:{asset:'streetscape/rally-car.glb',length:4.25,paint:0x246397,power:7.7,top:40},
  'family-sedan':{
    worldOnly:true,asset:'streetscape/sedan.json.gz',length:4.58,width:1.80,height:1.45,paint:0x7194a7,
    power:4.8,top:36,braking:11.5,wheelbase:2.67,steerLock:.57,mass:1410,seatLift:.14
  },
  suv:{
    worldOnly:true,asset:'streetscape/family-suv.glb',length:4.98,width:1.93,height:1.78,paint:0x416d62,
    power:4.3,top:34,braking:10.2,wheelbase:2.96,steerLock:.50,mass:2020,seatLift:.44
  },
  'family-minivan':{
    worldOnly:true,asset:'streetscape/family-minivan.glb',length:5.10,width:1.99,height:1.74,paint:0xc5c8ca,
    power:4.4,top:35,braking:10.6,wheelbase:3.00,steerLock:.53,mass:1950,seatLift:.39
  }
};

for (const c of globalThis.DuongVietFleet || []) {
  worldGarage[c.id]={asset:'edition/assets/vehicles/'+c.id+'.glb',length:c.length,width:c.width,height:c.height,
    paint:parseInt(c.hex.slice(1),16),power:c.accel,top:c.top/3.6,braking:c.mass>5000?8.6:11.2,
    wheelbase:c.length*.59,steerLock:c.mass>2500?.46:.54,mass:c.mass,seatLift:Math.max(0,(c.height-1.35)*.76),
    electric:c.electric,worldOnly:c.id==='bus'||c.id==='truck'||c.id==='limo',fuel:c.fuel,capacity:c.capacity,rate:c.rate};
}
function fillEditionGarage(select,includeHeavy) {
  const group=select?.querySelector('optgroup[data-edition]');if(!group)return;
  for(const car of globalThis.DuongVietFleet||[]){
    if(!includeHeavy && worldGarage[car.id].worldOnly)continue;
    group.append(new Option(car.name,car.id));
  }
}

function tripVehicleChoice(vehicle){
  let previousVehicle=null;
  try{
    previousVehicle=localStorage.getItem('taylai.world.lastDriven');
    localStorage.setItem('taylai.world.lastDriven',vehicle);
  }catch{}
  return {vehicle,previousVehicle};
}
