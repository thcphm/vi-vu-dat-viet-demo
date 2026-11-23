'use strict';
// The catalogue keeps stable OSM IDs for saved trips. Bucket its positions so
// moving the render origin examines only nearby destinations.
(()=>{
  const atlas=window.VietnamTourism,grid=32,cells=new Map();
  atlas.byId=new Map();
  // Start on the public street at the turn for each visitor entrance.
  const arrivals=new Map([
    ['osm-way-197995330',[106.6612130,10.8049114],'Xe dừng ở đường Thăng Long. Đường vào bảo tàng rẽ từ đây đến sân trưng bày.'],
    ['osm-way-165491089',[106.7047032,10.7761032],'Từ đường Đông Du, lối vào sân thánh đường dẫn đến chân bậc thềm.'],
    ['osm-node-7372895085',[107.7470527,16.4954238],'Xe dừng ở đầu đường đi bộ. Theo lối mòn đến cầu thang phía đông để ngắm tháp bên dưới.'],
    ['osm-way-888629812',[105.8275619,21.0079302],'Xe dừng trên phố Chùa Bộc. Lối đi bộ từ vỉa hè vào sân chùa được mô phỏng theo mặt tiền.'],
    ['osm-way-683697174',[106.7058911,10.7655729],'Xe dừng trong hẻm 42 Hoàng Diệu. Lối đi bộ ngắn vào miếu được mô phỏng ở phía hẻm.'],
    ['osm-way-1156119270',[106.6910790,10.7795113],'Xe dừng trên đường Nguyễn Đình Chiểu. Lối đi bộ vào sân được mô phỏng ở mặt tiền số 180.']
  ].map(([id,start,note])=>[id,{start,note}]));
  function index(site){
    const arrival=arrivals.get(site.id);
    if(arrival){
      const {start,note}=arrival,east=(start[0]-site.lon)*111320*Math.cos(site.lat*Math.PI/180);
      Object.assign(site,{start,arrivalNote:note,visitOnArrival:true,
        approachMeters:Math.round(Math.hypot(east,(start[1]-site.lat)*110900))});
    }
    atlas.byId.set(site.id,site);
    const key=Math.floor(site.lon*grid)+','+Math.floor(site.lat*grid);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(site);
  }
  for(const site of atlas.entries)index(site);
  atlas.nearby=(lon,lat,dx,dy)=>{
    const found=[];
    for(let i=Math.floor((lon-dx)*grid);i<=Math.floor((lon+dx)*grid);i++)
      for(let j=Math.floor((lat-dy)*grid);j<=Math.floor((lat+dy)*grid);j++)
        for(const s of cells.get(i+','+j)||[])
          if(Math.abs(s.lon-lon)<=dx&&Math.abs(s.lat-lat)<=dy)found.push(s);
    return found;
  };
  // Local source already includes the full Atlas. Release assets are split by
  // position for driving and can be fetched in one request for national search.
  const requests=new Map();
  function once(file,load){
    if(!requests.has(file))requests.set(file,load().catch(error=>{requests.delete(file);throw error;}));
    return requests.get(file);
  }
  function loadTile(file){
    return once(file,async()=>{
      const response=await fetch(file);
      if(!response.ok)throw Error('Chưa tải được dữ liệu địa danh. Hãy thử lại.');
      const added=[];
      for(const [site,detail] of RoadTileCodec.decode(await RoadTileCodec.content(response))){
        if(atlas.byId.has(site.id))continue;
        if(detail)window.VietnamSightDetails[site.id]=detail;
        index(site);atlas.entries.push(site);added.push(site);
      }
      atlas.onEntries?.(added);
    });
  }
  atlas.loadAll=async()=>{
    if(atlas.all&&!atlas.complete){
      await loadTile(atlas.all);
      if(!atlas.complete){atlas.complete=true;atlas.onComplete?.();}
    }
  };
  atlas.loadRegion=async(lon,lat)=>{
    const jobs=[];
    if(atlas.files&&!atlas.complete){
      const scale=atlas.tileScale;
      for(let x=Math.floor((lon-.05)*scale);x<=Math.floor((lon+.05)*scale);x++)
        for(let y=Math.floor((lat-.05)*scale);y<=Math.floor((lat+.05)*scale);y++){
          const file=atlas.files[x+'_'+y];if(file)jobs.push(loadTile(file));
        }
    }
    for(const group of atlas.modelGroups||[]){
      if(!group.sites.some(s=>Math.abs(s.lon-lon)<.06&&Math.abs(s.lat-lat)<.06))continue;
      jobs.push(once(group.file,async()=>{
        const {default:sites}=await import('./'+group.file);
        for(let i=0;i<sites.length;i++)Object.assign(group.sites[i],sites[i]);
      }));
    }
    await Promise.all(jobs);
  };
})();
