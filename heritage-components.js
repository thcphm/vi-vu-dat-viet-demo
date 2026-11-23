'use strict';
(() => {
  const atlas = window.VietnamTourism;
  if (atlas.files) return;
  // Vietnamese visitor names published by Hội An's heritage centre, the
  // Tràng An management board and the national parks (references in heritage-visits.js).
  const names = new Map([
    ['osm-way-242169982','Nội thành Tây Đô (Thành Nhà Hồ)'],
    ['osm-node-3560283504','Hang Luồn'],
    ['osm-node-6474418794','Động Trung Trang'],
    ['osm-way-631074714','Bảo tàng Văn hóa Dân gian Hội An'],
    ['osm-node-2076856032','Bảo tàng Gốm sứ Mậu dịch'],
    ['osm-node-3189923484','Bảo tàng Văn hóa Sa Huỳnh'],
    ['osm-node-1540779110','Chùa Bích Động'],
    ['osm-way-772057039','Đền Thái Vi'],
    ['osm-node-4738232630','Đền Trần (Đền Nội Lâm)'],
    ['osm-node-13388919549','Phủ Khống'],
    ['osm-way-1424042953','Hành cung Vũ Lâm'],
    ['osm-node-4387487189','Suối Nước Moọc'],
    ['osm-node-3887715188','Hang Trinh Nữ'],
    ['osm-node-2669659389','Đền Trình Ngũ Nhạc'],
  ]);
  for (const site of atlas.entries) {
    if (names.has(site.id)) site.name = names.get(site.id);
  }
  // Several stops describe an entire precinct. Frame its actual mapped sights
  // instead of looking at the empty centre of the boundary polygon.
  // The whole-property pin is at the centre of the UNESCO boundary. Its
  // cameras look southeast at the temples. Cars stay on the road by the gate.
  const mySonGate=[108.10911,15.77344];
  // Phố Cái Bèo (w62343792) meets the visitor car park at this point.
  const benBeo=[107.057865,20.731873];
  // Road w974572929 beside Hương Sơn coach station w768420575 (chợ Đục Khê).
  // Hanoi's festival traffic plan keeps visitor cars outside the boat landing.
  const huongSonParking=[105.7877197,20.614076];
  const tuanChau=[106.9894,20.91974];
  // The tower footprint and the park boundary lead to the same visitor tour.
  atlas.aliases['osm-way-979538328']='osm-node-5323866724';
  atlas.aliases['osm-way-334166893']='osm-node-10756203755';
  atlas.aliases['osm-way-1085506314']='osm-node-5323866724';
  atlas.aliases['osm-way-940004472']='osm-node-8706712863';
  atlas.aliases['osm-way-1228794103']='osm-relation-15805643';
  atlas.aliases['osm-node-1805807506']='osm-way-1244769154';
  const dambriEntrance=[107.7445308,11.6412412],vungRoEntrance=[109.4191949,12.8776377];
  const honYenLane=[109.3045388,13.2267462],honYenSource='https://daklakvrtour.com/hon-yen.html';
  const baiMonParking=[109.4491036,12.8939039],baiMonSource='https://daklakvrtour.com/mui-dien-bai-mon.html';
  const baiHuongRoad=[109.4291998,12.881748],honNuaSource='https://csdl.vietnamtourism.gov.vn/dest/?item=616';
  const dambriSource='https://www.dambri.com.vn/vi/tin-tuc/tin-tuc-damb-ri/mot-ngay-o-khu-du-lich-thac-damb-ri-381.html';
  const baiChuaSource='https://daklakvrtour.com/tau-khong-so.html';
  const vungRoBay={locality:'Vũng Rô',formerProvince:'Phú Yên',start:[109.414242,12.871188],mappedEntrance:true,visitOnArrival:true,
    lookout:{lon:109.414301,lat:12.871245,kind:'Điểm ngắm cảnh'},source:'https://daklakvrtour.com/vung-ro.html',
    arrivalNote:'Xe dừng trên đường ven bờ phía tây vịnh. Bãi Chùa, nơi có đài tưởng niệm và nhà trưng bày, nằm về phía đông bắc.',
    views:[{name:'Nhìn ra vịnh từ bờ tây',offset:[109,24],height:7,viewAngle:-1.79,viewRadius:109,viewElevation:.048,
      description:'Từ bờ tây nhìn qua khoảng nước về sườn núi bên kia vịnh.'},
      {name:'Bờ vịnh nhìn về Bãi Chùa',offset:[370,-570],height:100,viewAngle:-.41,viewRadius:912,viewElevation:.105,viewFov:62,
      description:'Từ phía tây vịnh nhìn về đông bắc, dọc theo bờ có Quốc lộ 29 đến khu di tích Bãi Chùa.'}]};
  const laVangGate=[107.1947094,16.7101806],laVangMap='https://maps.giolelavang.com/';
  const precincts={
    'osm-node-2495002567':{name:'Khu mộ Đại tướng Võ Nguyên Giáp và phu nhân Đặng Bích Hà',city:'Phú Trạch',locality:'Vũng Chùa, Thọ Sơn, Quảng Đông',
      formerProvince:'Quảng Bình',start:[106.4939762,17.9238382],mappedEntrance:true,visitOnArrival:true,source:'https://vietnamtourism.vn/index.php/tourism/items/2924'},
    'osm-node-11563767582':{name:'Vũng Chùa – Đảo Yến',city:'Phú Trạch',locality:'Thọ Sơn, Quảng Đông',formerProvince:'Quảng Bình',
      start:[106.4881775,17.9226739],visitOnArrival:true,mappedEntrance:true,source:'https://quangbinhtourism.vn/diem-du-lich/khac/vung-chua-dao-yen.html'},
    'osm-node-8250669293':{name:'Hoành Sơn Quan trên đỉnh Đèo Ngang',city:'Hoành Sơn',locality:'Đèo Ngang, giáp Hà Tĩnh và Quảng Trị',
      province:'Hà Tĩnh',start:[106.4697041,17.9568173],mappedEntrance:true,visitOnArrival:true,map:'https://www.openstreetmap.org/node/8250669293',
      source:'https://vietnamtourism.vn/index.php/news/items/27340'},
    'osm-node-6346469056':{name:'Bia thành Đồng Hới và đoạn tường bên cầu Nam Thành',city:'Đồng Hới',locality:'Cầu Nam Thành',
      formerProvince:'Quảng Bình',start:[106.6234532,17.465947],mappedEntrance:true,visitOnArrival:true,
      source:'https://vnexpress.net/dau-tich-thoi-vua-minh-mang-con-lai-o-thanh-dong-hoi-3295094.html'},
    'dong-hoi-mui-thanh-dong-bac':{name:'Mũi thành đông bắc Đồng Hới và lối đi ven hào',city:'Đồng Hới',locality:'Thành Đồng Hới',
      formerProvince:'Quảng Bình',start:[106.6238226,17.4710593],mappedEntrance:true,visitOnArrival:true,map:'https://www.openstreetmap.org/way/940795265',
      source:'https://commons.wikimedia.org/?curid=148222144'},
    'osm-node-10756203755':{name:'Bảo tàng Quảng Trị – cơ sở Đồng Hới (Bảo tàng Quảng Bình)',city:'Đồng Hới',locality:'Thành Đồng Hới',
      formerProvince:'Quảng Bình',lon:106.623951,lat:17.468279,start:[106.6232646,17.4681344],mappedEntrance:true,visitOnArrival:true,
      source:'https://dulich.quangtri.gov.vn/vi/baotangtinhquangtri'},
    'dong-hoi-cua-dong':{name:'Cửa Đông thành Đồng Hới',city:'Đồng Hới',locality:'Hào thành Đồng Hới',formerProvince:'Quảng Bình',
      start:[106.62487,17.46779],mappedEntrance:true,visitOnArrival:true,map:'https://www.openstreetmap.org/way/940795265',
      source:'https://vnexpress.net/dau-tich-thoi-vua-minh-mang-con-lai-o-thanh-dong-hoi-3295094.html'},
    'osm-way-319395915':{name:'Cầu đá qua hào Cửa Đông thành Đồng Hới',city:'Đồng Hới',locality:'Cửa Đông',formerProvince:'Quảng Bình',
      start:[106.62487,17.46779],mappedEntrance:true,visitOnArrival:true,source:'https://vnexpress.net/dau-tich-thoi-vua-minh-mang-con-lai-o-thanh-dong-hoi-3295094.html'},
    'osm-node-5323866724':{name:'Cầu Nhật Lệ 1',city:'Đồng Hới',locality:'Sông Nhật Lệ',formerProvince:'Quảng Bình',start:[106.6242889,17.4711827],
      mappedEntrance:true,visitOnArrival:true,source:'https://nhandan.vn/quang-binh-thong-xe-cau-nhat-le-post470815.html'},
    'osm-node-8716478190':{name:'Tượng đài Mẹ Suốt',city:'Đồng Hới',locality:'Công viên bên sông Nhật Lệ',formerProvince:'Quảng Bình',
      start:[106.6269387,17.4654104],mappedEntrance:true,visitOnArrival:true,source:'https://svhttdl.quangtri.gov.vn/chi-tiet/-/view-article/1/1647938258475/1786420807291'},
    'osm-node-8706712863':{name:'Quảng Bình Quan',city:'Đồng Hới',locality:'Đồng Hới',formerProvince:'Quảng Bình',start:[106.6246407,17.4632662],
      mappedEntrance:true,visitOnArrival:true,source:'https://baoquangtri.vn/dat-va-nguoi-quang-binh/201912/quang-binh-quan-cong-trinh-van-hoa-lich-su-tieu-bieu-2172445/'},
    'osm-way-305408028':{name:'Tháp chuông cũ ở La Vang',city:'Hải Lăng',locality:'Trung tâm hành hương La Vang',start:laVangGate,
      mappedEntrance:true,visitOnArrival:true,source:laVangMap},
    'osm-node-3100293997':{name:'Linh đài Ba Cây Đa – Đức Mẹ La Vang',city:'Hải Lăng',locality:'Trung tâm hành hương La Vang',start:laVangGate,
      mappedEntrance:true,visitOnArrival:true,source:laVangMap,viewOf:['thanh-dia-la-vang',1]},
    'osm-way-690204938':{name:'Vương cung Thánh đường La Vang mới',city:'Hải Lăng',locality:'Trung tâm hành hương La Vang',start:laVangGate,
      lon:107.19577,lat:16.70552,mappedEntrance:true,visitOnArrival:true,source:laVangMap,viewOf:['thanh-dia-la-vang',2]},
    'osm-node-14309236352':{name:'Nhà hành lễ và bến thả hoa bờ Nam sông Thạch Hãn',city:'Quảng Trị',locality:'Bờ nam sông Thạch Hãn',
      start:[107.185303,16.754760],mappedEntrance:true,visitOnArrival:true,source:'https://dulich.quangtri.gov.vn/vi/benthahoabonamthachhan'},
    'osm-node-10605991202':{name:'Tượng đài và bến thả hoa bờ Bắc sông Thạch Hãn',city:'Quảng Trị',locality:'An Đôn',start:[107.1823027,16.7562374],
      mappedEntrance:true,visitOnArrival:true,source:'https://dsvh.gov.vn/di-tich-lich-su-thanh-co-quang-tri-va-nhung-dia-diem-luu-niem-su-kien-81-ngay-dem-nam-1972-2975'},
    'osm-way-343077412':{name:'Chứng tích tháp chuông Tam Tòa',city:'Đồng Hới',locality:'Công viên Đồng Mỹ',formerProvince:'Quảng Bình',
      start:[106.6230958,17.4750631],mappedEntrance:true,visitOnArrival:true,source:'https://myquangbinh.vn/vi/nhathotamtoa',
      arrivalNote:'Xe dừng ở làn đường Nguyễn Du phía công viên. Từ lối đi bộ có thể nhìn xuyên cửa vòm về nền nhà thờ cũ bên sông Nhật Lệ.'},
    'osm-node-1016631030':{name:'Kỳ đài Hiền Lương ở bờ bắc',city:'Vĩnh Linh',locality:'Đôi bờ Hiền Lương – Bến Hải',
      start:[107.0502153,17.0062013],lon:107.0502703,lat:17.0057033,viewOf:['hien-luong',2],mappedEntrance:true,visitOnArrival:true,
      source:'https://dsvh.gov.vn/di-tich-lich-su-doi-bo-hien-luong-ben-hai-2974',
      arrivalNote:'Xe dừng trên đường nhánh sát sân phía bắc Kỳ đài. Đi bộ ra sân để nhìn bệ tranh gốm và cột cờ.'},
    'osm-node-4411036589':{name:'Tượng đài Khát vọng thống nhất ở bờ nam',city:'Gio Linh',locality:'Bờ nam sông Bến Hải',
      lon:107.053335,lat:17.00232,start:[107.0528599,17.0027101],viewOf:['hien-luong',3],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở đường bờ nam, chỗ rẽ vào khu tưởng niệm. Đi bộ ra mép hồ để nhìn tượng người mẹ và người con.',
      source:'https://dsvh.gov.vn/di-tich-lich-su-doi-bo-hien-luong-ben-hai-2974'},
    'osm-node-1016631101':{city:'Vĩnh Linh',locality:'Bờ bắc sông Bến Hải',start:[107.0502153,17.0062013],mappedEntrance:true,visitOnArrival:true,
      searchNames:'Bảo tàng lịch sử Cầu Hiền Lương',source:'https://dsvh.gov.vn/di-tich-lich-su-doi-bo-hien-luong-ben-hai-2974'},
    'osm-node-1016630618':{name:'Cửa số 3 địa đạo Vịnh Mốc',city:'Vĩnh Linh',locality:'Di tích Vịnh Mốc',start:[107.1101055,17.074208],
      mappedEntrance:true,visitOnArrival:true,source:'https://dsvh.gov.vn/di-tich-lich-su-dia-dao-vinh-moc-va-he-thong-lang-ham-vinh-linh-2989',
      arrivalNote:'Xe theo đường dịch vụ qua cổng, dừng ở mép sân đón khách. Từ đây đi bộ tới cửa tham quan.'},
    'osm-node-1016631618':{name:'Cửa số 4 và bờ biển Vịnh Mốc',city:'Vĩnh Linh',locality:'Di tích Vịnh Mốc',
      start:[107.1101055,17.074208],viewOf:['dia-dao-vinh-moc',4],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe ở sân đón khách. Tại cửa số 4, bậc thang dẫn xuống bờ cuội ven biển.'},
    'osm-node-1016630582':{name:'Bảo tàng địa đạo Vịnh Mốc',city:'Vĩnh Linh',locality:'Di tích Vịnh Mốc',
      start:[107.1101055,17.074208],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe vào đến mép sân đón khách rồi tiếp tục đi bộ. Nhà trưng bày bổ sung và cửa số 3 có các điểm tham quan riêng.'},
    'osm-way-232410041':{name:'Bảo tàng Phú Yên – Bảo tàng Đắk Lắk cơ sở 2',city:'Tuy Hòa',locality:'151 Trần Phú',formerProvince:'Phú Yên',
      searchNames:'Bảo tàng Đắk Lắk cơ sở 2 · 151 Trần Phú',
      start:[109.3018625,13.095609],mappedEntrance:true,visitOnArrival:true,source:'https://daklakvrtour.com/bao-tang-phu-yen.html',
      arrivalNote:'Xe dừng trên đường Trần Phú trước cổng bảo tàng. Từ cổng, qua sân lát gạch đến hai cánh nhà và sảnh chính.'},
    'osm-relation-16028816':{city:'Sông Cầu',locality:'Vịnh Xuân Đài',formerProvince:'Phú Yên',start:[109.2943552,13.414665],
      mappedEntrance:true,visitOnArrival:true,source:'https://daklakvrtour.com/vinh-xuan-dai.html',
      arrivalNote:'Xe dừng trên đường làng ở Dân Phú 2, gần bờ Vũng Sứ phía dưới chùa Liên Phú.'},
    'osm-node-5841472185':{city:'Sông Cầu',locality:'Bình Nông, Xuân Thọ',formerProvince:'Phú Yên',start:[109.17807246,13.48849790],
      mappedEntrance:true,visitOnArrival:true,source:'https://daklakvrtour.com/thac-cay-du.html',
      arrivalNote:'Xe dừng trên ĐT.644 cạnh lối rẽ vào vườn. Từ đây đi bộ đến lòng suối và bờ đá dưới thác.'},
    'osm-way-1272966043':{name:'Hải đăng Gành Đèn',locality:'An Ninh Đông',formerProvince:'Phú Yên',start:[109.2930776,13.3628725],
      mappedEntrance:true,visitOnArrival:true,arrivalNote:'Xe dừng ở cuối đường dân cư cạnh trạm. Đi bộ theo lối ven ghềnh tới cầu và tháp đèn.'},
    'osm-node-11055944805':{name:'Tháp Nghinh Phong',locality:'Quảng trường Nghinh Phong',formerProvince:'Phú Yên',start:[109.3065001,13.1165356],
      mappedEntrance:true,visitOnArrival:true,arrivalNote:'Từ Đường Độc Lập, xe dừng ở lối vào bãi phía tây bắc quảng trường. Từ đó đi bộ về phía biển tới hai khối tháp.'},
    'osm-node-4674771389':{name:'Tháp Nhạn Tuy Hòa',locality:'Núi Nhạn',formerProvince:'Phú Yên',start:[109.2999132,13.0828095],
      mappedEntrance:true,visitOnArrival:true,arrivalNote:'Xe dừng ở lối vào từ đường Lê Trung Kiên. Qua quầy vé dưới chân núi rồi theo lối bộ hoặc đi xe điện lên sân tháp.'},
    'osm-node-4518976294':{name:'Đài tưởng niệm Núi Nhạn',locality:'Núi Nhạn',formerProvince:'Phú Yên',start:[109.2999132,13.0828095],
      mappedEntrance:true,visitOnArrival:true,arrivalNote:'Từ lối vào phía đường Lê Trung Kiên, theo đường trên núi đến nhánh vào sân đài tưởng niệm.'},
    'osm-node-6052212185':{name:'Chùa Thanh Lương',locality:'Mỹ Quang Nam',formerProvince:'Phú Yên',start:[109.2956876,13.1809668],
      mappedEntrance:true,visitOnArrival:true,arrivalNote:'Xe dừng ở sân phía nam. Từ sân theo lối bộ đến chính điện, điện Quan Âm và hai hồ.'},
    'osm-node-12856400201':{name:'Đền thờ Lương Văn Chánh',locality:'Long Phụng, Phú Hòa 2',formerProvince:'Phú Yên',start:[109.2373975,13.0911589],
      mappedEntrance:true,visitOnArrival:true,arrivalNote:'Xe dừng trên đường làng trước cổng ngoài. Từ tam quan đi bộ qua sân và cây bồ đề đến chính điện.'},
    'osm-way-160203374':{name:'Bãi Môn',locality:'Mũi Điện',formerProvince:'Phú Yên',start:baiMonParking,
      mappedEntrance:true,visitOnArrival:true,source:baiMonSource,
      arrivalNote:'Xe rẽ từ Quốc lộ 29 vào đường dịch vụ, dừng ở khu vé và sân đỗ trước cầu bộ. Từ đây đi bộ xuống bãi cát hoặc theo lối lên hải đăng.'},
    'osm-way-909041150':{name:'Hải đăng Đại Lãnh',locality:'Mũi Điện',formerProvince:'Phú Yên',start:baiMonParking,
      mappedEntrance:true,visitOnArrival:true,source:baiMonSource,
      arrivalNote:'Xe dừng ở khu vé Bãi Môn. Qua cầu đi bộ, theo đường bậc lên hải đăng Đại Lãnh trên Mũi Điện.'},
    'osm-way-1272966044':{name:'Hải đăng Hòn Nưa',locality:'Đảo Hòn Nưa',formerProvince:'Phú Yên',start:baiHuongRoad,
      mappedEntrance:true,visitOnArrival:true,source:honNuaSource,
      arrivalNote:'Xe dừng trên Quốc lộ 29 ở Bãi Hương, cạnh lối xuống bến. Sau chặng ca nô sang Hòn Nưa, từ bãi phía tây đi bộ lên hải đăng.'},
    // This legacy pin is inside the northern water polygon of Đầm Cù Mông,
    // among floating cages. The Ô Loan marker is 39.7 km farther south.
    'osm-node-4472649089':{name:'Vùng bè phía bắc đầm Cù Mông',locality:'Bắc đầm Cù Mông',city:'Sông Cầu',formerProvince:'Phú Yên',
      kind:'Đầm',start:[109.21096,13.61964],mappedEntrance:true,visitOnArrival:true,source:'https://daklakvrtour.com/dam-cu-mong.html',
      arrivalNote:'Xe dừng trên đường làng, cạnh các ao phía tây nam vùng bè. Các góc ngắm đưa bạn ra mặt đầm.'},
    'osm-node-4472642290':{name:'Mũi Yến – góc ngắm từ bờ Nhơn Hội',locality:'Nhơn Hội',formerProvince:'Phú Yên',
      start:honYenLane,mappedEntrance:true,visitOnArrival:true,source:honYenSource,viewOf:['hon-yen-phu-yen',0],
      arrivalNote:'Xe dừng ở cuối đường làng Nhơn Hội, gần lăng Nam Hải. Từ lối đi ven bờ nhìn ra Hòn Đụn và Hòn Yến ngoài khơi.'},
    // The field marker at đèo Quán Cau lies just off QL1. The visitor car
    // stays on the village turn at w799591456, north of the sign.
    'osm-node-11779827836':{name:'Đầm Ô Loan – điểm ngắm đèo Quán Cau',locality:'Tuy An',formerProvince:'Phú Yên',
      start:[109.251142,13.269216],mappedEntrance:true,visitOnArrival:true,source:'https://daklakvrtour.com/dam-o-loan.html',
      arrivalNote:'Xe dừng ở nhánh đường dân cư phía bắc bia thắng cảnh trên đèo Quán Cau. Từ bia nhìn về phía đông, qua các ao ven bờ tới mặt đầm.'},
    // The raw pin marks the mountain. Visit the granite outcrop from the QL1
    // trailhead, near the lay-by south of Cầu Suối Lớn on the old Đèo Cả road.
    'osm-node-4510077892':{name:'Núi Đá Bia – Thạch Bi Sơn',locality:'Đèo Cả',formerProvince:'Phú Yên',
      start:[109.3941124,12.8847007],mappedEntrance:true,visitOnArrival:true,
      source:'https://vietnamtourism.vn/index.php/tourism/items/1372',
      arrivalNote:'Xe dừng trên Quốc lộ 1 ở đầu lối vào bãi. Từ chân núi có đường bậc leo lên phiến đá; các góc ngắm trên đỉnh dành cho người đi bộ.'},
    'osm-way-804128824':{name:'Nhà thờ Mằng Lăng',locality:'Tuy An Đông',formerProvince:'Phú Yên',kind:'Nhà thờ',
      start:[109.2252868,13.3340986],mappedEntrance:true,visitOnArrival:true,
      source:'https://baodaklak.vn/van-hoa-du-lich-van-hoc-nghe-thuat/202511/kien-truc-dac-sac-cua-nha-tho-co-mang-lang-2a50145/',
      arrivalNote:'Xe dừng trên lối vào phía tây, cạnh sân đỗ xe và cách cổng khoảng 11 m. Đi qua cổng là sân trước mặt nhà thờ hai tháp chuông.'},
    'osm-node-4472600793':{...vungRoBay,name:'Điểm ngắm vịnh Vũng Rô từ bờ tây'},
    'osm-node-11565227115':{...vungRoBay,name:'Vịnh Vũng Rô'},
    'osm-node-4292019089':{name:'Di tích Bến tàu Không số Vũng Rô',locality:'Bãi Chùa',formerProvince:'Phú Yên',kind:'Di tích',
      start:vungRoEntrance,mappedEntrance:true,visitOnArrival:true,source:baiChuaSource,
      arrivalNote:'Xe dừng trên Quốc lộ 29, tại lối vào Bãi Chùa. Từ đó đi bộ qua sân lát tới đài tưởng niệm hình mũi tàu.'},
    'osm-node-12382639867':{name:'Nhà tưởng niệm liệt sĩ Bến Vũng Rô',locality:'Bãi Chùa',formerProvince:'Phú Yên',kind:'Di tích',
      start:vungRoEntrance,mappedEntrance:true,visitOnArrival:true,source:baiChuaSource,
      arrivalNote:'Xe dừng ở lối vào Bãi Chùa trên Quốc lộ 29. Nhà tưởng niệm nằm ở đầu đông lối đi bộ ven nước.'},
    'osm-node-5439114923':{name:'Chùa Bửu Minh',locality:'Biển Hồ',kind:'Chùa',searchNames:'Chùa Biển Hồ Trà, Chùa Phật Học, Chùa Biển Hồ Chè',
      start:[108.0130060,14.0660780],mappedEntrance:true,visitOnArrival:true,
      source:'https://chuabuuminh.vn/hinh-anh/nhiep-anh/7A5419_chua_buu_minh_tam_huyet_mot_doi_tu_.aspx',
      arrivalNote:'Xe dừng bên đường trước tam quan mái ngói đỏ. Cổng gỗ có đôi voi nằm chếch về phía nam, cùng bên đường.'},
    'osm-node-3093994368':{name:'Thác Đambri',locality:'Bảo Lộc',start:dambriEntrance,mappedEntrance:true,visitOnArrival:true,source:dambriSource,
      arrivalNote:'Xe dừng ở đầu đường vào khu du lịch. Từ bãi đỗ bên trong, khách đi bộ xuống chân thác hoặc dùng thang máy.'},
    'osm-way-1418616745':{name:'Khu du lịch thác Đambri',locality:'Bảo Lộc',start:dambriEntrance,mappedEntrance:true,visitOnArrival:true,source:dambriSource,
      lookout:{lon:107.74275,lat:11.642035,kind:'Điểm ngắm cảnh'},viewOf:['thac-dambri',1],
      arrivalNote:'Lối vào khu du lịch nằm ở phía đông. Thác Đambri ở phía bắc khuôn viên, còn hồ du lịch nằm về phía nam.'},
    'osm-way-304773101':{name:'Hồ Đambri',locality:'Bảo Lộc',start:dambriEntrance,mappedEntrance:true,visitOnArrival:true,source:dambriSource,
      lookout:{lon:107.7430902,lat:11.640799,kind:'Điểm ngắm cảnh'},
      arrivalNote:'Xe dừng ở đầu đường vào khu du lịch. Từ đây, đường nội bộ men theo bờ bắc của hồ.',
      views:[{name:'Mặt hồ từ bờ bắc',offset:[-22,81],height:6,viewAngle:2.876,viewRadius:84,viewElevation:.07,
        description:'Nhìn về phía tây nam qua lòng hồ dùng cho các hoạt động chèo thuyền, đạp vịt.'},
        {name:'Từ bờ bắc đến nhánh hồ phía nam',offset:[-8,98],height:5,viewAngle:-1.93,viewRadius:158,viewElevation:.47,
          description:'Góc cao cho thấy lòng hồ ở phía bắc thu hẹp dần về phía nam.'}]},
    // The museum moved the visitor entrance to 27 Phạm Hồng Thái in 2022.
    // The older Atlas pin remains at the west wall, next to Tán Thuật.
    'osm-node-1730268393':{name:'Nhà đày Buôn Ma Thuột',kind:'Di tích',locality:'Buôn Ma Thuột',
      start:[108.0473086,12.6757888],mappedEntrance:true,visitOnArrival:true,
      source:'https://www.daklakmuseum.vn/tin-tuc-su-kien/bai-viet/thong-bao-thay-doi-cong-vao-tham-quan-di-tich-lich-su-quoc-gia-dac-biet-nha-day-buon-ma-thuot',
      arrivalNote:'Xe dừng ở đường Phạm Hồng Thái, đầu lối vào số 27. Từ đây đi khoảng 52 m tới cổng phía nam khu di tích.'},
    'osm-node-10314905409':{name:'Đình Lạc Giao',kind:'Đình',locality:'Buôn Ma Thuột',start:[108.0421400,12.6821865],mappedEntrance:true,visitOnArrival:true,
      source:'https://www.daklakmuseum.vn/tin-tuc-su-kien/bai-viet/di-tich-lich-su-dinh-lac-giao-noi-bao-luu-nhung-gia-tri-truyen-thong?lng=vi',
      arrivalNote:'Địa chỉ đình là 67 Phan Bội Châu. Xe dừng trên đường Điện Biên Phủ, ở phía cổng chính mở vào sân đình.'},
    // The polygon and the second pin both represent Lake T'Nưng. Public cars
    // stop outside the gate. The tip, trail fork and statue are distinct features.
    'osm-way-506959800':{name:'Biển Hồ (hồ Tơ Nưng)',locality:'Biển Hồ',start:[107.9993443,14.0342026],mappedEntrance:true,visitOnArrival:true,
      lookout:{lon:107.99979,lat:14.040096,kind:'Điểm ngắm cảnh'},
      source:'https://bienho.gialai.gov.vn/thong-bao-van-ban-moi/gioi-thieu-diem-van-hoa-du-lich-tren-dia-ban-xa-bien-ho.html',
      views:[{name:'Từ đầu mũi nhìn ra lòng hồ',offset:[17,-109],height:14,viewAngle:-.15,viewRadius:103,viewElevation:.037,
        description:'Từ mũi đất nhô ra giữa hồ, nhìn về dải bờ phía bắc.'},
        {name:'Hai phía mặt nước quanh mũi Đầu Rùa',offset:[0,28],height:5,viewAngle:-2.33,viewRadius:144,viewElevation:.39,
          description:'Mặt nước ôm lấy hai bên mũi đất. Sân tượng và đoạn đường dạo nằm ở đầu bán đảo.'}],
      arrivalNote:'Xe dừng cạnh bãi trước cổng. Theo đường thông và bậc đá đến mũi Đầu Rùa để ngắm hai phía mặt hồ.'},
    'osm-node-13105153109':{name:'Biển Hồ Pleiku',locality:'Biển Hồ',start:[107.9993443,14.0342026],mappedEntrance:true,visitOnArrival:true,
      lookout:{lon:107.99979,lat:14.040096,kind:'Điểm ngắm cảnh'},viewOf:['mui-ngam-bien-ho-pleiku',2],
      arrivalNote:'Xe dừng cạnh bãi trước cổng. Mặt hồ nhìn thấy từ lan can của mũi Đầu Rùa.'},
    'osm-node-3600339699':{name:'Lối ra mũi Đầu Rùa ở Biển Hồ',locality:'Biển Hồ',start:[107.9993443,14.0342026],mappedEntrance:true,visitOnArrival:true,
      source:'https://bienho.gialai.gov.vn/thong-bao-van-ban-moi/gioi-thieu-diem-van-hoa-du-lich-tren-dia-ban-xa-bien-ho.html',
      arrivalNote:'Xe dừng ở bãi trước cổng. Theo lối đi tới đoạn rẽ ở đầu mũi đất, cách sân tượng khoảng 70 m.',
      views:[{name:'Từ lối rẽ nhìn lên sân tượng',offset:[26,-56],height:12,viewAngle:-.426,viewRadius:61,viewElevation:.10,
        description:'Đường đi dọc sống đất giữa hai phía mặt nước. Sân tượng nằm ở đầu mũi về phía đông bắc.'},
        {name:'Đường đi trên sống đất',offset:[10,-20],height:3.5,viewAngle:1.82,viewRadius:96,viewElevation:.43,
          description:'Từ trên cao có thể lần theo lối đi ra đầu mũi Đầu Rùa.'}]},
    // This old viewpoint is inland. Serve the eastern peninsula from the
    // mapped service-road junction with Âu Cơ (n677443064), at Lắk Resort.
    'osm-node-1765142229':{name:'Bờ đông nam hồ Lắk',locality:'Liên Sơn',kind:'Điểm ngắm cảnh',
      lookout:{lon:108.1820713,lat:12.4125449,kind:'Điểm ngắm cảnh'},
      start:[108.1824406,12.4132505],mappedEntrance:true,visitOnArrival:true,
      source:'https://daklaktourist.com.vn/lak-resort/',
      arrivalNote:'Xe dừng trên đường Âu Cơ, ở đầu lối vào Lắk Resort. Góc tham quan đưa tới bán đảo ở bờ đông nam hồ.',
      views:[{name:'Từ sân ven bờ nhìn về vũng hồ',offset:[-5.4,15],height:2,viewAngle:2.796,viewRadius:16,viewElevation:.08,
        description:'Góc nhìn từ khoảng sân bên nhà dài, hướng tây nam qua vũng nước ở bờ bán đảo.'},
        {name:'Mặt nước phía nam bán đảo',offset:[206.2,149],height:2,viewAngle:-2.7,viewRadius:25,viewElevation:.08,
          description:'Nhìn về phía đông nam từ lối dạo men bờ. Buôn Jun nằm ở phía bên kia vịnh, về hướng tây bắc.'}]},
    // Keep the Atlas lake polygon at its centroid. The public viewpoint is on
    // the western side of Buôn Jun's tip (n13654496501), beside the Y Jút landing.
    'osm-relation-7074662':{locality:'Liên Sơn',lookout:{lon:108.1672437,lat:12.416416,kind:'Điểm ngắm cảnh'},
      start:[108.1675773,12.4164342],mappedEntrance:true,visitOnArrival:true,source:'https://daklaktourist.com.vn/tour-ho-lak/',
      description:'Mũi đất của buôn Jun nhô ra từ bờ nam hồ Lắk. Từ đây có thể nhìn qua mặt nước tới những dải đồi bao quanh lòng hồ.',
      arrivalNote:'Xe dừng trên đường Y Jút gần bến buôn Jun. Điểm ngắm nằm ở mép tây mũi đất, cách chỗ dừng khoảng 36 m.',
      views:[{name:'Từ mũi buôn Jun nhìn về tây bắc',offset:[-89,-140],height:3,viewAngle:.568,viewRadius:166,viewElevation:.026,
        description:'Từ sát bờ, nhìn qua khoảng nước phía tây bắc buôn Jun tới đường chân đồi.'},
        {name:'Mũi đất giữa hai phía mặt hồ',offset:[13,38],height:2.5,viewAngle:-2.62,viewRadius:213,viewElevation:.35,
          description:'Góc cao từ mặt hồ nhìn về buôn Jun. Đường Y Jút đi dọc mũi đất, kết thúc ở bến phía bắc.'}]},
    // w706543013 is the public ĐT.819 beside Kênh 79. World Bank SWLC ESIA
    // fig. 3.5 marks the small canal compound 1.7 km southwest of this road.
    'osm-relation-17189466':{locality:'Tân Hưng',start:[105.7210387,10.7871526],mappedEntrance:true,visitOnArrival:true,
      source:'https://nbca.gov.vn/khu-du-tru-thien-nhien-lang-sen-long-an/',
      arrivalNote:'Xe dừng trên ĐT.819, phía đông nam cầu Kênh Tỉnh, bên Kênh 79. Từ đây góc tham quan đưa tới rừng tràm và con mương cạnh trạm, cách khoảng 1,7 km theo đường thẳng.'},
    // n4735572208 joins Âu Cơ to Nguyễn Huệ, the winding hill access (w52755113).
    'osm-way-52823719':{name:'Biệt điện Bảo Đại bên hồ Lắk',kind:'Biệt điện',locality:'Liên Sơn',start:[108.1783988,12.4129976],mappedEntrance:true,visitOnArrival:true,
      source:'https://daklaktourist.com.vn/tour-ho-lak/',
      arrivalNote:'Xe dừng trên đường Âu Cơ ở chân dốc Nguyễn Huệ. Con đường uốn theo sườn đồi dẫn lên sân biệt điện nhìn xuống hồ Lắk.'},
    // Lê Văn Giáo meets the eastern entrance walk (w769479510) at n6466763187.
    'osm-way-1244769154':{locality:'Cao Lãnh',start:[105.63325,10.4467407],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh cổng phía đường Lê Văn Giáo. Đi bộ qua cổng mộ và hồ sen để tới nơi an nghỉ của cụ Phó bảng Nguyễn Sinh Sắc.'},
    'osm-node-8437362637':{locality:'Long Hưng A',source:'https://csdl.vietnamtourism.gov.vn/dest/?item=1045',
      start:[105.6705179,10.3514116],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên Đường huyện 69, ở lối vào phía tây nam khu du lịch. Từ đây có đường vào khuôn viên.',
      description:'Trong khu du lịch văn hóa Phương Nam có Nam Phương Linh Từ, các dãy hành lang, nhà chuông, nhà trống và bảo tàng. Mở ảnh toàn cảnh để xem các công trình ở cự ly gần.'},
    // Hứa Hòa Hưng (w484331811) ends where the pedestrian approaches begin.
    'osm-relation-17189464':{start:[105.7207283,9.2426326],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trước cổng Vườn chim trên đường Hứa Hòa Hưng. Từ đây lối đi bộ dẫn vào khu trưng bày và các điểm ngắm chim.'},
    'osm-way-907749065':{start:[106.674909,10.360361],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường Rạch Gầm, bên cửa hông đình. Mặt võ ca nhìn về phố Phan Chu Trinh và chợ Gò Công.'},
    'osm-way-1272644423':{name:'Nhà Đốc Phủ Hải',kind:'Di tích',start:[106.6749700,10.3621709],mappedEntrance:true,visitOnArrival:true,
      source:'https://dulich.dongthap.gov.vn/vi/nhadocphuhai',arrivalNote:'Xe dừng trên đường Hai Bà Trưng, gần cổng số 49. Từ đây đi qua sân tới tiền sảnh của ngôi nhà.'},
    // w686360197 follows the stream through the waterfall pin. Visitors leave
    // their cars on the approach road and walk the last stretch into Bản Hiêu.
    'osm-node-6215416985':{name:'Thác Hiêu – Pù Luông',locality:'Bản Hiêu',start:[105.21903,20.46099],
      mappedEntrance:true,visitOnArrival:true,photo:'https://dantoctongiao.vn/den-pu-luong-chiem-nguong-thac-hieu-va-cam-nhan-van-hoa-thai-1784326501147.htm',
      arrivalNote:'Xe dừng trên đường vào bản Hiêu. Đường bộ tới thác dài khoảng 800 m.',
      views:[{name:'Bậc đá nhìn từ hạ lưu',height:1.7,viewAngle:-.15,viewRadius:15,viewElevation:.22,
        description:'Suối Hiêu bắt nguồn từ hang đá vôi. Trong chuỗi thác dài khoảng 800 m, cảnh này tái hiện một đoạn ngắn có các vũng nước và gờ đá vôi nối tiếp nhau.'},
        {name:'Dòng nước qua sườn đá',height:1.7,viewAngle:.72,viewRadius:17,viewElevation:.39,
          description:'Từ bờ suối nhìn chếch qua các bậc nước. Tim suối bám theo bản đồ. Bề rộng dòng chảy và hình dáng từng gờ đá được ước dựng.'}]},
    'osm-relation-15805643':{locality:'Vồ Dơi',start:[104.9594476,9.1976786],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trước cổng Vồ Dơi ở đường vào từ ĐT.985C. Tuyến tham quan bên trong vườn dài khoảng 3 km tới đài quan sát.'},
    'osm-node-5227610721':{locality:'Sa Đéc',start:[105.7685973,10.2940567],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường Nguyễn Huệ, trước lối qua sân vào nhà cổ Huỳnh Thủy Lê.'},
    'osm-node-8459780109':{locality:'Đốc Binh Kiều',start:[105.828311,10.603885],mappedEntrance:true,visitOnArrival:true,
      source:'https://dsvh.gov.vn/di-tich-khao-co-va-kien-truc-nghe-thuat-go-thap-2966',
      description:'Giữa Đồng Tháp Mười, các nền đền bằng gạch của văn hóa Óc Eo nằm gần chùa Tháp Linh và các đền, miếu tiếp tục đón khách hành hương. Mở cảnh thực 360° để đến từng điểm.',
      arrivalNote:'Xe dừng bên đường xuyên khu di tích. Từ đây đi bộ vào mái che phế tích đền Vishnu.'},
    // At Thạch Động the OSM monument pin is on the adjacent hill. The cave
    // model is at Tiên Sơn Tự, at the independent geological survey tower.
    'osm-node-2327003316':{name:'Thạch Động – Hà Tiên',kind:'Hang động',locality:'Hà Tiên',
      start:[104.47545,10.410973],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường vào dưới chân núi. Lối bậc dẫn lên chùa Tiên Sơn trong Thạch Động.'},
    'osm-node-2326969109':{name:'Đền thờ họ Mạc (Trung Nghĩa Từ)',kind:'Đền',locality:'Hà Tiên',
      start:[104.4835338,10.3854001],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường Mạc Cửu, trước lối vào đền. Từ chân núi Bình San, bậc đá dẫn lên khu mộ họ Mạc.'},
    'osm-node-2326969092':{name:'Chùa Phù Dung',kind:'Chùa',locality:'Hà Tiên',
      start:[104.482885,10.388893],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường Phù Dung phía bắc khuôn viên chùa.'},
    'osm-node-11353153265':{name:'Núi Đá Dựng',locality:'Hà Tiên',start:[104.4777594,10.4273828],
      mappedEntrance:true,visitOnArrival:true,
      source:'https://apc.angiang.gov.vn/m/164/1373/Nhung-dia-diem-du-lich-nao-duoc-yeu-thich-nhat-o-Kien-Giang.html',
      description:'Khối núi đá vôi đứng riêng giữa đồng bằng Hà Tiên. Từ sườn phía nam nhìn xuống, có thể nhận ra hai mặt hồ cách nhau một quãng đồng.',
      arrivalNote:'Xe dừng trên đường phía nam núi, tại lối rẽ vào chân núi Đá Dựng. Từ đây khách đi bộ.',
      // The southern ponds are OSM water polygons w940338140 and w934560370.
      views:[{name:'Mặt núi phía nam',offset:[-12,41],viewAngle:-.31,viewRadius:295,viewElevation:-.14,height:4},
        {name:'Từ sườn núi nhìn xuống hồ',offset:[-92,243],viewAngle:2.78,viewRadius:232,viewElevation:.34,height:3}]},
    'osm-node-2089305124':{locality:'Hương Sơn',start:huongSonParking,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh bến xe Hương Sơn ở chợ Đục Khê. Từ Bến Yến, đi đò đến bến Trò rồi đi bộ lên chùa Thiên Trù.'},
    'osm-node-2089305122':{locality:'Hương Sơn',start:huongSonParking,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh bến xe Hương Sơn ở chợ Đục Khê. Đi bộ hoặc xe điện đến Bến Yến, đi đò đến bến Trò rồi lên núi.'},
    'osm-node-2669659389':{locality:'Hương Sơn',start:huongSonParking,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh bến xe Hương Sơn ở chợ Đục Khê. Từ Bến Yến, đền nằm ở chặng đầu của tuyến suối Yến.'},
    'osm-node-2835735216':{locality:'Hương Sơn',start:huongSonParking,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh bến xe Hương Sơn. Chùa Giải Oan nằm trên đường núi từ Thiên Trù lên động Hương Tích.'},
    'osm-node-3887715188':{
      start:tuanChau,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở cảng Tuần Châu. Hang Trinh Nữ nằm trên đảo Bồ Hòn.'},
    'osm-node-4858968321':{
      name:'Vịnh Lan Hạ',start:benBeo,mappedEntrance:true,visitOnArrival:true,
      lookout:{lon:107.078406,lat:20.7299682,kind:'Điểm ngắm cảnh'},
      description:'Từ điểm cao trên đảo Cát Dứa nhìn ra vịnh Lan Hạ. Trong mục cảnh thực 360° có thể đến bãi Vạn Bội và đảo Năm Cát.',
      arrivalNote:'Xe dừng trên phố Cái Bèo, ở lối vào bãi xe của bến tàu.'},
    'osm-relation-20057203':{
      name:'Làng chài Cái Bèo',start:benBeo,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Từ Bến Bèo, thuyền đi giữa các đảo đá đến vùng làng chài.'},
    'osm-node-13388093801':{
      name:'Đảo Cát Dứa (Đảo Khỉ)',start:benBeo,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở lối vào bãi xe Bến Bèo trên đảo Cát Bà.',
      description:'Một bãi cát nằm dưới sườn bắc, bãi thứ hai nép về phía tây nam. Giữa hai bãi là sống đảo đá vôi.',
      // Beach polygons w208896430 and w208896431, and the summit n6293770430.
      views:[{name:'Bãi cát ở mũi bắc',offset:[15,-16],viewAngle:3.04,viewRadius:91,viewElevation:.28,height:6},
        {name:'Bãi phía tây nam đảo Cát Dứa',offset:[-124,226],viewAngle:-.97,viewRadius:112,viewElevation:.3,height:6},
        {name:'Sống đảo giữa hai bãi',offset:[-86,122],viewAngle:1.04,viewRadius:207,viewElevation:.52,height:9}]},
    'osm-way-198804451':{
      name:'Tháp A10 – Mỹ Sơn',start:mySonGate,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở cổng khu di tích Mỹ Sơn.',viewOf:['my-son-nhom-a',1]},
    'osm-node-2088919707':{
      name:'Tháp A11 – Mỹ Sơn',start:mySonGate,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở cổng khu di tích Mỹ Sơn.',viewOf:['my-son-nhom-a',2]},
    'osm-way-198804483':{
      name:'Toàn cảnh thung lũng Mỹ Sơn',start:mySonGate,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng tại cổng khu di tích. Từ đây tuyến tham quan đi sâu vào thung lũng Mỹ Sơn.',
      description:'Các cụm đền tháp Chăm nằm rải trong thung lũng. Từ trên cao có thể thấy nhóm B và C sát nhau, cùng hai nhà dài của nhóm D về phía đông.',
      views:[{name:'Ba nhóm tháp B, C và D',offset:[195,270],viewAngle:.86,viewRadius:102,viewElevation:.57,height:7},
        {name:'Nhìn qua hai nhà dài về nhóm B',offset:[200,278],viewAngle:1.43,viewRadius:68,viewElevation:.24,height:6}]},
    'osm-way-242169982':{
      description:'Từ cổng Nam, con đường chạy chéo qua cánh đồng trong thành đến cổng Bắc. Bốn cổng đá nối với nhau bằng các đoạn tường thành giữa đồng ruộng Vĩnh Lộc.',
      views:[{name:'Trục đường qua nội thành',offset:[105,180],viewAngle:.54,viewRadius:480,viewElevation:.59,height:9},
        {name:'Nhìn từ trong thành ra cổng Nam',offset:[228,382],viewAngle:-2.61,viewRadius:64,viewElevation:.16,height:11}]},
    'osm-way-1362974362':{
      description:'Hai đền vua Đinh và vua Lê nằm dưới chân núi ở vùng lõi Cố đô Hoa Lư. Từ trên cao có thể nhận ra hai quần thể sân và nhà thờ nằm cách nhau một quãng ngắn.',
      views:[{name:'Hai đền vua giữa Hoa Lư',offset:[380,-277],viewAngle:1.36,viewRadius:234,viewElevation:.65,height:14},
        {name:'Trước sân đền vua Đinh',offset:[353,-196],viewAngle:.98,viewRadius:76,viewElevation:.33,height:11},
        {name:'Nhìn sang đền vua Lê',offset:[414,-368],viewAngle:1.18,viewRadius:79,viewElevation:.33,height:11}]},
    'osm-relation-21401560':{
      description:'Những ô cỏ trên Quảng trường Ba Đình trải dài trước mặt Lăng Chủ tịch Hồ Chí Minh. Cột cờ nằm trên trục nhìn từ quảng trường về chính giữa hàng cột đá của Lăng.',
      views:[{name:'Các ô cỏ trước Lăng',viewAngle:1.49,viewRadius:139,viewElevation:.42,height:8},
        {name:'Dọc theo quảng trường',viewAngle:2.85,viewRadius:151,viewElevation:.24,height:13}]}
  };
  for(const site of atlas.entries){
    const precinct=precincts[site.id];
    if(!precinct)continue;
    Object.assign(site,precinct);
    if(precinct.start)site.approachMeters=Math.round(Math.hypot(
      (site.lon-site.start[0])*111320*Math.cos(site.lat*Math.PI/180),(site.lat-site.start[1])*110900));
  }
  // Mapped components omitted from the national import, including three member
  // ways of OSM relation 21218176. © OpenStreetMap contributors, ODbL.
  const source = 'https://dulichbacninh.gov.vn/kham-pha/vung-dat-con-nguoi-bac-ninh/quan-the-di-tich-yen-tu-vinh-nghiem-con-son-kiep-bac-di-san-van-hoa-the-gioi-1096.html';
  const components = [
    [1567975867,'Chùa Lân – Thiền viện Trúc Lâm Yên Tử','Quảng Ninh','Yên Tử',106.7293311,21.1097242,106.729035,21.110194,61],
    [1567975864,'Am – chùa Ngọa Vân','Quảng Ninh','Bình Khê',106.5795496,21.1765214,106.562360,21.167990,2017],
    [1567975862,'Chùa Bổ Đà','Bắc Ninh','Vân Hà',106.0524118,21.2423431,106.052006,21.242033,54],
    [1504768248,'Đền Trung – Hùng Vương Tổ miếu','Phú Thọ','Hùng Sơn',105.3240986,21.3690193,105.322450,21.369750,189,'https://denhung.vn/tin-tuc/den-trung'],
  ];
  const existing = new Set(atlas.entries.map(site => site.id));
  const kienLuongLane=[104.6386004,10.1402003],kienLuongRocks='hon-phu-tu-kien-luong';
  const kienLuongSource='https://kienluong.angiang.gov.vn/kien-luong-phat-huy-nhung-tiem-nang-du-lich-tu-cac-di-tich-lich-su-van-hoa';
  for(const [id,name,lon,lat,kind,way,camera] of [
    ['osm-way-1223400935','Hòn Phụ Tử',104.638706,10.135298,'Đảo',1223400935,null],
    ['hon-phu-tu-cot-da','Cột đá hòn Tử',104.638706,10.135298,'Danh thắng',1223400935,1],
    ['hon-phu-tu-be-da','Bệ đá và các khối gãy hòn Phụ Tử',104.639015,10.135584,'Danh thắng',1223400935,2],
    ['osm-way-1223400936','Hòn Bà ngoài khơi Kiên Lương',104.637637,10.135761,'Đảo',1223400936,3],
    ['osm-way-1223400937','Hòn Ông ngoài khơi Kiên Lương',104.635023,10.134842,'Đảo',1223400937,4],
  ]){
    if(existing.has(id))continue;
    atlas.entries.push({id,name,lon,lat,kind,start:kienLuongLane,region:'Nam Bộ',province:'An Giang',formerProvince:'Kiên Giang',
      city:'Kiên Lương',locality:'Bình An cũ',map:'https://www.openstreetmap.org/way/'+way,source:kienLuongSource,
      approachMeters:Math.round(Math.hypot((lon-kienLuongLane[0])*109580,(lat-kienLuongLane[1])*110900)),
      visitOnArrival:true,mappedEntrance:true,...(camera===null?{}:{viewOf:[kienLuongRocks,camera]})});
  }
  const haiSon=atlas.entries.find(p=>p.id==='osm-node-4374995102');
  if(haiSon){
    const approach=(lon,lat)=>Math.round(Math.hypot((lon-kienLuongLane[0])*109580,(lat-kienLuongLane[1])*110900));
    Object.assign(haiSon,{name:'Chùa Hang – Hải Sơn Tự',city:'Kiên Lương',locality:'Chùa Hang, Bình An cũ',
      formerProvince:'Kiên Giang',kind:'Chùa',start:kienLuongLane,approachMeters:approach(haiSon.lon,haiSon.lat),
      mappedEntrance:true,visitOnArrival:true,source:kienLuongSource});
    for(const [id,name,lon,lat,index] of [
      ['hai-son-dai-sen','Đài sen và lư hương trước tượng Quan Âm',104.6401227,10.1398193,1],
      ['hai-son-phap-y','Áo tượng và cành dương liễu ở Hải Sơn Tự',104.6401674,10.1397666,2],
      ['hai-son-san-cao','Thềm cao và cầu thang sân chùa Hải Sơn',104.6398878,10.1398403,3],
    ]){
      if(!existing.has(id))atlas.entries.push({...haiSon,id,name,lon,lat,kind:'Điểm ngắm cảnh',
        approachMeters:approach(lon,lat),viewOf:['chua-hang-hai-son-kien-luong',index]});
    }
  }
  const monumentStops=[
    ['osm-node-2495002567','Khu mộ Đại tướng Võ Nguyên Giáp và phu nhân Đặng Bích Hà',106.4949861,17.9247684,'osm-node-2495002567',null,null],
    ['vung-chua-bai-xe-khu-mo','Bãi xe và lối lên khu mộ Đại tướng Võ Nguyên Giáp',106.494083,17.923944,'osm-node-2495002567','khu-mo-vo-nguyen-giap',1,'https://www.openstreetmap.org/way/884243608'],
    ['vung-chua-loi-bo-khu-mo','Lối đi bộ trên sườn núi Thọ đến sân viếng',106.494218,17.9247657,'osm-node-2495002567','khu-mo-vo-nguyen-giap',2,'https://www.openstreetmap.org/way/841553891'],
    ['osm-way-885335615','Tháp chuông Vũng Chùa Hồng Chung',106.49474245,17.9246246,'osm-node-2495002567','khu-mo-vo-nguyen-giap',3],
    ['vung-chua-san-dang-huong','Sân dâng hương tại khu mộ Đại tướng Võ Nguyên Giáp',106.494987,17.924743,'osm-node-2495002567','khu-mo-vo-nguyen-giap',4],
    ['osm-node-8250669293','Hoành Sơn Quan trên đỉnh Đèo Ngang',106.4696886,17.9563451,'osm-node-8250669293',null,null],
    ['deo-ngang-bac-da-thien-ly','Bậc đá đường thiên lý phía bắc Hoành Sơn Quan',106.469665,17.956568,'osm-node-8250669293','hoanh-son-quan',1],
    ['deo-ngang-mat-nam-hoanh-son-quan','Mặt nam và lối vòm qua Hoành Sơn Quan',106.469682,17.956304,'osm-node-8250669293','hoanh-son-quan',2],
    ['deo-ngang-loi-vao-duong-cu','Lối lên Hoành Sơn Quan từ đường đèo cũ',106.4697039,17.956804,'osm-node-8250669293','hoanh-son-quan',3],
    ['osm-node-6346469056','Bia thành Đồng Hới và đoạn tường bên cầu Nam Thành',106.6233244,17.4663521,'osm-node-6346469056',null,null],
    ['dong-hoi-tuong-gach-cau-nam','Tường gạch cũ bên cầu Nam Thành',106.623244,17.466321,'osm-node-6346469056','bia-thanh-dong-hoi',1],
    ['dong-hoi-mui-thanh-dong-bac','Mũi thành đông bắc Đồng Hới và lối đi ven hào',106.623923,17.470658,'dong-hoi-mui-thanh-dong-bac',null,null],
    ['dong-hoi-loi-gach-mui-thanh','Lối gạch ven hào ở mũi thành đông bắc',106.6235936,17.4704832,'dong-hoi-mui-thanh-dong-bac','mui-thanh-dong-bac-dong-hoi',1],
    ['dong-hoi-san-trong-cua-dong','Sân trong Cửa Đông thành Đồng Hới',106.624246,17.46771,'dong-hoi-cua-dong','cua-dong-thanh-dong-hoi',2],
    ['dong-hoi-bac-gac-cua-dong','Bậc gạch và ô hoa trên gác Cửa Đông',106.624333,17.467813,'dong-hoi-cua-dong','cua-dong-thanh-dong-hoi',3],
    ['dong-hoi-cua-dong','Cửa Đông thành Đồng Hới',106.624457,17.467728,'dong-hoi-cua-dong',null,null],
    ['osm-way-319395915','Cầu đá qua hào Cửa Đông thành Đồng Hới',106.6246531,17.4677601,'osm-way-319395915',null,null],
    ['dong-hoi-tu-cau-vao-thanh','Từ cầu đá nhìn vào gác Cửa Đông',106.624825,17.46778,'osm-way-319395915','cau-da-cua-dong-dong-hoi',1],
    ['osm-node-10756203755','Bảo tàng Quảng Trị – cơ sở Đồng Hới',106.623951,17.468279,'osm-node-10756203755',null,null],
    ['dong-hoi-mai-bao-tang','Mái ngói bảo tàng nhìn từ phía sân',106.62350,17.468155,'osm-node-10756203755','bao-tang-tong-hop-quang-binh',1],
    ['dong-hoi-bao-tang-tu-hao','Bảo tàng Quảng Bình nhìn từ hào thành',106.62482,17.46778,'osm-node-10756203755','bao-tang-tong-hop-quang-binh',2],
    ['dong-hoi-toan-canh-cau-nhat-le','Toàn cảnh đầu cầu Nhật Lệ 1 từ phía Quách Xuân Kỳ',106.623917,17.47125,'osm-node-5323866724','cau-nhat-le',1],
    ['dong-hoi-le-bo-hanh-cau-nhat-le','Lề bộ hành cầu Nhật Lệ 1', 106.6264180,17.4721693,'osm-node-5323866724','cau-nhat-le',2],
    ['osm-node-8716478190','Tượng đài Mẹ Suốt',106.6270915,17.4654799,'osm-node-8716478190',null,null],
    ['dong-hoi-phu-dieu-me-suot','Phù điêu dưới tượng đài Mẹ Suốt',106.627087,17.465473,'osm-node-8716478190','tuong-dai-me-suot',1],
    ['dong-hoi-hang-cau-me-suot','Hàng cau bên tượng đài Mẹ Suốt',106.627028,17.465407,'osm-node-8716478190','tuong-dai-me-suot',2],
    ['osm-node-8706712863','Quảng Bình Quan',106.6240516,17.4633364,'osm-node-8706712863',null,null],
    ['quang-binh-quan-mat-quang-trung','Mặt Quảng Bình Quan phía đường Quang Trung',106.6241040,17.4633542,'osm-node-8706712863','quang-binh-quan',1],
    ['quang-binh-quan-vuon-le-loi','Vườn phía Lê Lợi và hai tầng mái Quảng Bình Quan',106.6238777,17.4633770,'osm-node-8706712863','quang-binh-quan',2],
    ['osm-way-305408028','Tháp chuông cũ ở La Vang',107.19547570,16.70697798,'osm-way-305408028',null,null],
    ['osm-node-3100290389','Cổng chính và Công trường Mân Côi ở La Vang',107.1947094,16.7101806,'osm-way-305408028','thanh-dia-la-vang',3],
    ['quang-tri-hanh-lang-ben-nam','Hành lang và thang đá bờ nam sông Thạch Hãn',107.1850883,16.7547129,'osm-node-14309236352','ben-tha-hoa-bo-nam-thach-han',1],
    ['quang-tri-tu-ben-nam-nhin-an-don','Từ bậc bến Thạch Hãn nhìn sang An Đôn',107.1850483,16.7548234,'osm-node-14309236352','ben-tha-hoa-bo-nam-thach-han',2],
    ['quang-tri-bia-ben-bac','Bia đá bên bến tám cạnh bờ bắc',107.1828266,16.7555459,'osm-node-10605991202','tuong-dai-bo-bac-thach-han',2],
    ['quang-tri-den-ben-bac','Đền tưởng niệm và bến tám cạnh ở An Đôn',107.1826360,16.7556078,'osm-node-10605991202','tuong-dai-bo-bac-thach-han',1],
    ['quang-binh-mat-tay-tam-toa','Mặt tây tháp chuông Tam Tòa',106.6233257,17.474978,'osm-way-343077412','nha-tho-tam-toa',0],
    ['quang-binh-nen-nha-tho-tam-toa','Nền nhà thờ Tam Tòa cũ và trụ gạch',106.62357,17.47495,'osm-way-343077412','nha-tho-tam-toa',1],
    ['osm-node-11663933869','Cầu Hiền Lương lịch sử',107.0518184,17.0043601,'osm-node-1016631030',null,null],
    ['quang-tri-vach-son-cau-hien-luong','Vạch sơn giữa cầu Hiền Lương',107.05172136,17.0043849,'osm-node-1016631030','hien-luong',1],
    ['quang-tri-san-don-khach-vinh-moc','Sân đón khách Vịnh Mốc',107.11027,17.074375,'osm-node-1016630618','dia-dao-vinh-moc',1],
    ['quang-tri-nha-trung-bay-vinh-moc','Nhà trưng bày bổ sung ở Vịnh Mốc',107.111735,17.073766,'osm-node-1016630618','dia-dao-vinh-moc',2],
    ['quang-tri-phong-ho-sinh-vinh-moc','Gian hộ sinh được trưng bày ở Vịnh Mốc',107.112718,17.073904,'osm-node-1016630618','dia-dao-vinh-moc',3],
  ];
  for(const [id,name,lon,lat,anchor,model,index,map] of monumentStops){
    if(existing.has(id))continue;
    const {start,city,locality,formerProvince,source}=precincts[anchor];
    const osm=id.startsWith('osm-')?id:anchor;
    atlas.entries.push({id,name,lon,lat,start,city,locality,formerProvince,source,region:'Trung Bộ',province:precincts[anchor].province||'Quảng Trị',kind:'Di tích',
      mappedEntrance:true,visitOnArrival:true,approachMeters:Math.round(Math.hypot((lon-start[0])*111320*Math.cos(lat*Math.PI/180),(lat-start[1])*110900)),
      ...(model?{viewOf:[model,index]}:{}),map:map||precincts[anchor].map||'https://www.openstreetmap.org/'+osm.split('-').slice(1).join('/')});
  }
  const museumStart=[106.3043554,9.9161497];
  for(const [id,name,lon,lat,index] of [
    ['osm-node-4793310552','Bảo tàng Văn hóa dân tộc Khmer Trà Vinh',106.3049965,9.9161553,null],
    ['bao-tang-khmer-cong-vao','Cổng vào Bảo tàng Văn hóa dân tộc Khmer',106.3044358,9.9161531,1],
    ['bao-tang-khmer-phu-dieu','Phù điêu và ô kính tam giác ở Bảo tàng Khmer',106.3048677,9.9161548,2],
    ['bao-tang-khmer-dan-ngu-am','Dàn nhạc ngũ âm tại Bảo tàng Khmer Trà Vinh',106.3050257,9.9161553,3],
  ]){
    const info={id,name,lon,lat,start:museumStart,city:'Nguyệt Hóa',province:'Vĩnh Long',formerProvince:'Trà Vinh',
      locality:'Bảo tàng Khmer, Trà Vinh',region:'Nam Bộ',kind:index===null?'Bảo tàng':'Điểm ngắm cảnh',
      source:'https://baotanglichsuquocgia.vn/vi/Articles/3096/16337/bao-tang-van-hoa-dan-toc-khmer-tinh-tra-vinh.html',
      map:'https://www.openstreetmap.org/node/4793310552',visitOnArrival:true,mappedEntrance:true,
      approachMeters:Math.round(Math.hypot((lon-museumStart[0])*109650,(lat-museumStart[1])*110900)),
      ...(index===null?{}:{viewOf:['bao-tang-khmer-tra-vinh',index]})};
    if(existing.has(id))Object.assign(atlas.entries.find(p=>p.id===id),info);
    else atlas.entries.push(info);
  }
  const hang=atlas.entries.find(p=>p.id==='osm-way-1352279406');
  if(hang){
    const start=[106.3439176,9.8880711];
    const approach=(lon,lat)=>Math.round(Math.hypot((lon-start[0])*109670,(lat-start[1])*110900));
    Object.assign(hang,{name:'Chùa Hang (Kompông Chrây)',start,approachMeters:approach(hang.lon,hang.lat),city:'Châu Thành',
      locality:'Chùa Kompông Chrây, Trà Vinh',formerProvince:'Trà Vinh',visitOnArrival:true,mappedEntrance:true});
    for(const [id,name,lon,lat,index] of [
      ['chua-hang-mai-ngoi','Mái ngói màu và tháp nóc chùa Hang',106.3450702,9.8871501,1],
      ['chua-hang-nha-trung-bay','Cột chim và nhà trưng bày chùa Hang',106.3446010,9.8871423,2],
      ['chua-hang-rung-cay','Rừng cây và sân chim chùa Hang',106.3452160,9.8870406,3],
      ['chua-hang-cong-tay','Cổng phụ ba vòm chùa Hang trên Quốc lộ 54',106.3439771,9.8880759,4],
      ['chua-hang-long-vom','Lối đi dưới vòm giữa cổng chùa Hang',106.3440299,9.8880903,5],
    ]){
      if(!existing.has(id))atlas.entries.push({...hang,id,name,lon,lat,kind:'Điểm ngắm cảnh',approachMeters:approach(lon,lat),
        source:'https://vinhlong.gov.vn/du-khach-old/diadanh_test',viewOf:['chua-hang-tra-vinh',index]});
    }
  }
  const ang=atlas.entries.find(p=>p.id==='osm-way-288574348');
  if(ang){
    Object.assign(ang,{city:'Nguyệt Hóa',formerProvince:'Trà Vinh',mappedEntrance:true,visitOnArrival:true});
    for(const [id,name,lon,lat,index] of [
      ['chua-ang-hao-nuoc','Lối qua hào nước chùa Âng',106.3029877,9.9157989,1],
      ['chua-ang-hanh-lang','Hành lang và ba cấp mái chùa Âng',106.3038469,9.9156893,2],
      ['chua-ang-dau-hoi','Đầu hồi chạm gỗ chánh điện chùa Âng',106.3037212,9.9158208,3],
      ['chua-ang-be-tho','Bệ thờ Phật Thích Ca trong chánh điện chùa Âng',106.3035691,9.9157907,7],
      ['chua-ang-bich-hoa','Bích họa và cột chạm rồng trong chùa Âng',106.3036547,9.9157671,8],
      ['chua-ang-cong-dong','Cổng chính chùa Âng dưới hai hàng sao',106.3042934,9.9161108,5],
      ['chua-ang-thap-nam-ngon','Bảo tháp năm ngọn bên hào chùa Âng',106.3038985,9.9158849,6],
      ['chua-ang-toan-canh','Toàn cảnh khuôn viên chùa Âng',106.3034999,9.9158874,4],
    ]){
      if(existing.has(id))continue;
      atlas.entries.push({...ang,id,name,lon,lat,city:'Nguyệt Hóa',formerProvince:'Trà Vinh',kind:'Điểm ngắm cảnh',
        locality:'Wat Angkor Raig Borei, Trà Vinh',source:'https://vinhlong.gov.vn/du-khach-old/di-tich-lich-su',
        approachMeters:Math.round(Math.hypot((lon-ang.start[0])*109650,(lat-ang.start[1])*110900)),mappedEntrance:true,
        visitOnArrival:true,viewOf:['chua-ang-tra-vinh',index]});
    }
  }
  // The pond is in the water layer. Add its public shore visits to the Atlas.
  const baOmStart=[106.3056618,9.9178216],baOmSource='https://vietnamtourism.vn/index.php/tourism/items/1395';
  for(const [id,name,kind,lon,lat,index] of [
    ['osm-way-76041615','Ao Bà Om (Ao Vuông), danh thắng Trà Vinh','Hồ',106.3040311,9.9176883,null],
    ['ao-ba-om-mat-nuoc','Lá sen và mặt nước Ao Bà Om','Điểm ngắm cảnh',106.3039108,9.9169125,1],
    ['ao-ba-om-loi-cat','Lối cát dưới rừng cây cổ thụ ở Ao Bà Om','Điểm ngắm cảnh',106.3028523,9.917422,2],
    ['ao-ba-om-tu-tren-cao','Bốn bờ Ao Vuông nhìn từ phía chùa Âng','Điểm ngắm cảnh',106.3040311,9.9176883,3],
  ]){
    if(existing.has(id))continue;
    atlas.entries.push({id,name,kind,lon,lat,start:baOmStart,city:'Nguyệt Hóa',province:'Vĩnh Long',formerProvince:'Trà Vinh',
      locality:'Ao Vuông, Trà Vinh',region:'Nam Bộ',source:baOmSource,map:'https://www.openstreetmap.org/way/76041615',
      approachMeters:Math.round(Math.hypot((lon-baOmStart[0])*109650,(lat-baOmStart[1])*110900)),
      mappedEntrance:true,visitOnArrival:true,...(index===null?{}:{viewOf:['ao-ba-om',index]})});
  }
  const vungChua=precincts['osm-node-11563767582'];
  for(const [id,name,kind,lon,lat,index,map] of [
    ['osm-node-6841107787','Bãi biển Vũng Chùa nhìn ra Đảo Yến','Điểm ngắm cảnh',106.4881227,17.9222823,1,'https://www.openstreetmap.org/node/6841107787'],
    ['vung-chua-tu-doi-tho-son','Đảo Yến từ sườn đồi Thọ Sơn','Điểm ngắm cảnh',106.4946445,17.924499,2,'https://www.openstreetmap.org/way/841553891'],
    ['osm-way-61973139','Đảo Yến (Hòn Nồm), Vũng Chùa','Đảo',106.4956151,17.911567,3,'https://www.openstreetmap.org/way/61973139'],
  ]){
    if(existing.has(id))continue;
    const start=index===2?[106.4939762,17.9238382]:vungChua.start;
    atlas.entries.push({...vungChua,id,name,kind,lon,lat,start,map,viewOf:['vung-chua-dao-yen',index],region:'Trung Bộ',province:'Quảng Trị',
      approachMeters:Math.round(Math.hypot((lon-start[0])*105930,(lat-start[1])*110900))});
  }
  const bay=precincts['osm-relation-16028816'];
  for(const [id,name,lon,lat,start,index,arrivalNote] of [
    ['phu-yen-cu-lao-vung-su','Cù lao nhỏ ngoài bãi thúng Vũng Sứ',109.29028,13.41449,bay.start,2,
      'Xe dừng ở Dân Phú 2. Từ trạm ảnh trên Vũng Sứ, hướng nhìn quay ra cù lao nhỏ đối diện bãi thúng.'],
    ['phu-yen-mui-cay-vung-chao','Mũi cây và bãi triều Vũng Chào',109.284422,13.447853,[109.2902731,13.4461723],3,
      'Xe dừng ở cuối đường dân cư trên sân cảng cá Vũng Chào. Góc ngắm từ trên cao nhìn xuống mũi cây và bãi triều ở phía tây bắc cảng.'],
  ]){
    if(existing.has(id))continue;
    atlas.entries.push({...bay,id,name,kind:'Điểm ngắm cảnh',region:'Trung Bộ',province:'Đắk Lắk',lon,lat,start,arrivalNote,
      approachMeters:Math.round(Math.hypot((lon-start[0])*108280,(lat-start[1])*110900)),viewOf:['vinh-xuan-dai',index],
      map:'https://www.openstreetmap.org/relation/16028816'});
  }
  const museumComponents=[
    ['phu-yen-canh-nha-bao-tang','Cánh tây nam của Bảo tàng Phú Yên',109.3021277,13.0948197,1],
    ['phu-yen-sanh-trong-dong','Sảnh trống đồng của Bảo tàng Phú Yên',109.302344,13.094969,2],
  ];
  for(const [id,name,lon,lat,index] of museumComponents){
    if(existing.has(id))continue;
    const museum=precincts['osm-way-232410041'];
    atlas.entries.push({...museum,id,name,kind:'Bảo tàng',region:'Trung Bộ',province:'Đắk Lắk',lon,lat,
      approachMeters:Math.round(Math.hypot((lon-museum.start[0])*108430,(lat-museum.start[1])*110900)),
      viewOf:['bao-tang-phu-yen',index],map:'https://www.openstreetmap.org/way/232410041'});
  }
  if(!existing.has('osm-node-11055944805'))atlas.entries.push({
    id:'osm-node-11055944805',...precincts['osm-node-11055944805'],kind:'Công trình kiến trúc',region:'Trung Bộ',province:'Đắk Lắk',city:'Tuy Hòa',
    lon:109.307256,lat:13.1163162,approachMeters:86,map:'https://www.openstreetmap.org/node/11055944805',source:'https://daklakvrtour.com/thap-nghinh-phong.html'});
  if(!existing.has('phu-yen-gian-tho-thap-nhan'))atlas.entries.push({
    id:'phu-yen-gian-tho-thap-nhan',name:'Gian thờ Thiên Y A Na trong Tháp Nhạn',kind:'Di tích',region:'Trung Bộ',province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Tuy Hòa',locality:'Núi Nhạn',
    lon:109.301589,lat:13.082314,start:[109.2999132,13.0828095],approachMeters:190,viewOf:['thap-nhan-tuy-hoa',3],mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/4674771389',source:'https://dsvh.gov.vn/thap-nhan-3238'});
  if(!existing.has('osm-way-1272649341'))atlas.entries.push({
    id:'osm-way-1272649341',name:'Quảng trường Nghinh Phong',kind:'Quảng trường',region:'Trung Bộ',province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Tuy Hòa',locality:'Đường Độc Lập',
    lon:109.3072662,lat:13.1162611,start:[109.3065001,13.1165356],approachMeters:88,viewOf:['nghinh',3],mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/way/1272649341',source:'https://daklakvrtour.com/thap-nghinh-phong.html'});
  // The national import merged the hall outline into the pagoda pin. The
  // measured hall and the ponds now have individual views within the grounds.
  delete atlas.aliases['osm-way-903827683'];
  const thanhLuongParking=precincts['osm-node-6052212185'].start;
  for(const [way,name,kind,lon,lat,view] of [
    [903827683,'Chính điện san hô ở chùa Thanh Lương','Chùa',109.2957709,13.1816945,1],
    [903834500,'Điện Quan Âm Linh Ứng','Chùa',109.2954311,13.1818768,2],
    [903834501,'Hồ Long Thủy và thủy tạ','Hồ',109.2954481,13.1814855,3],
    [903834502,'Hồ Long Ẩn và tượng Quan Âm Nam Hải','Hồ',109.2951457,13.1818254,0]
  ]){
    const id='osm-way-'+way;if(existing.has(id))continue;
    atlas.entries.push({id,name,kind,lon,lat,region:'Trung Bộ',province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Tuy An',locality:'Chùa Thanh Lương',
      start:thanhLuongParking,approachMeters:Math.round(Math.hypot((lon-thanhLuongParking[0])*108400,(lat-thanhLuongParking[1])*110900)),
      viewOf:['chua-thanh-luong',view],mappedEntrance:true,visitOnArrival:true,map:'https://www.openstreetmap.org/way/'+way,
      source:'https://daklakvrtour.com/chua-thanh-luong.html'});
  }
  if(!existing.has('osm-way-1229067977'))atlas.entries.push({
    id:'osm-way-1229067977',name:'Gành Đá Đĩa',kind:'Ghềnh đá',region:'Trung Bộ',province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Tuy An',locality:'Phú Hạnh',
    lon:109.29363,lat:13.35419,start:[109.2932594,13.3572872],approachMeters:346,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/way/1229067977',source:'https://dsvh.gov.vn/ganh-da-dia-tinh-phu-yen-3307',
    arrivalNote:'Xe dừng ở lối vào bãi đỗ phía bắc khu tham quan. Theo đường bộ qua cổng rồi xuống bậc để tới bãi đá.'});
  if(!existing.has('phu-yen-loi-xuong-bai-huong'))atlas.entries.push({
    id:'phu-yen-loi-xuong-bai-huong',name:'Lối xuống bè ở Bãi Hương',kind:'Bến thuyền',region:'Trung Bộ',
    province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Vũng Rô',locality:'Bãi Hương',lon:109.4291764,lat:12.8811792,
    start:baiHuongRoad,approachMeters:63,mappedEntrance:true,visitOnArrival:true,source:honNuaSource,
    map:'https://www.openstreetmap.org/?mlat=12.8811792&mlon=109.4291764#map=19/12.8811792/109.4291764',
    arrivalNote:'Xe dừng trên Quốc lộ 29 ở Bãi Hương. Từ đường làng, các cầu dẫn hẹp nối bờ với những bè neo trong vịnh.'});
  if(!existing.has('phu-yen-bia-mom-rang-dong'))atlas.entries.push({
    id:'phu-yen-bia-mom-rang-dong',name:'Bia đón bình minh ở mỏm Rạng Đông',kind:'Điểm ngắm cảnh',region:'Trung Bộ',
    province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Hòa Xuân',locality:'Mũi Điện',lon:109.457759,lat:12.895377,
    start:baiMonParking,approachMeters:952,mappedEntrance:true,visitOnArrival:true,source:baiMonSource,
    map:'https://www.openstreetmap.org/?mlat=12.895377&mlon=109.457759#map=19/12.895377/109.457759',
    arrivalNote:'Xe ở lại sân đỗ Bãi Môn. Từ đường lên hải đăng có nhánh bậc đi xuống mỏm đá đặt bia và cột cờ.'});
  for(const [way,name,kind,lon,lat,view] of [
    [50540459,'Đảo Hòn Nưa','Đảo',109.3937833,12.8303358,null],
    [481006392,'Bãi chính phía tây Hòn Nưa','Bãi biển',109.3915258,12.8284471,1],
    [481006394,'Ghềnh đá đông bắc Hòn Nưa','Ghềnh đá',109.39662,12.8320521,3]
  ]){
    const id='osm-way-'+way;
    if(existing.has(id))continue;
    const distance=Math.hypot((lon-baiHuongRoad[0])*111320*Math.cos(lat*Math.PI/180),(lat-baiHuongRoad[1])*110900);
    atlas.entries.push({id,name,kind,lon,lat,start:baiHuongRoad,approachMeters:Math.round(distance),region:'Trung Bộ',
      province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Vũng Rô',locality:'Đảo Hòn Nưa',
      ...(view===null?{}:{viewOf:['hon-nua-phu-yen',view]}),mappedEntrance:true,visitOnArrival:true,
      map:'https://www.openstreetmap.org/way/'+way,source:honNuaSource,
      arrivalNote:'Xe ở lại Bãi Hương trên bờ vịnh Vũng Rô. Ca nô qua vịnh tới bãi phía tây Hòn Nưa.'});
  }
  // OSM maps the two closed island shorelines independently of the mainland viewpoint.
  for(const [way,name,lon,lat,approachMeters,view] of [
    [151569083,'Hòn Yến',109.30878,13.22564,476,null],
    [151569085,'Hòn Đụn (Hòn Sụn)',109.30684,13.22669,250,3]
  ]){
    const id='osm-way-'+way;
    if(existing.has(id))continue;
    atlas.entries.push({id,name,lon,lat,start:honYenLane,approachMeters,kind:'Đảo',region:'Trung Bộ',city:'Tuy An',
      province:'Đắk Lắk',formerProvince:'Phú Yên',locality:'Nhơn Hội',source:honYenSource,map:'https://www.openstreetmap.org/way/'+way,
      ...(view===null?{}:{viewOf:['hon-yen-phu-yen',view]}),mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở cuối đường làng Nhơn Hội trên đất liền. Từ bờ có thể nhìn qua vùng nước giữa hai hòn.'});
  }
  if(!existing.has('phu-yen-nha-trung-bay-vung-ro'))atlas.entries.push({
    id:'phu-yen-nha-trung-bay-vung-ro',name:'Nhà trưng bày Bến Vũng Rô',region:'Trung Bộ',province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Đông Hòa',locality:'Bãi Chùa',kind:'Nhà trưng bày',
    lon:109.419861,lat:12.877000,start:vungRoEntrance,approachMeters:101,mappedEntrance:true,visitOnArrival:true,source:baiChuaSource,
    map:'https://www.openstreetmap.org/?mlat=12.877000&mlon=109.419861#map=19/12.877000/109.419861',
    arrivalNote:'Xe dừng trên Quốc lộ 29 ở lối vào Bãi Chùa. Nhà trưng bày nằm phía nam sân tượng đài.'});
  if(!existing.has('osm-node-3094058858'))atlas.entries.push({
    id:'osm-node-3094058858',name:'Điểm ngắm phía trên thác Đambri',region:'Trung Bộ',province:'Lâm Đồng',locality:'Bảo Lộc',kind:'Điểm ngắm cảnh',
    lon:107.7428354,lat:11.642191,start:dambriEntrance,approachMeters:213,mappedEntrance:true,visitOnArrival:true,source:dambriSource,
    viewOf:['thac-dambri',1],map:'https://www.openstreetmap.org/node/3094058858',
    arrivalNote:'Từ lối vào khu du lịch đi về khu thang máy để nhìn qua mép thác.'});
  // w741701880 is the named tea parcel. Its centroid marks the crop on the
  // map; the visit starts at the pull-off on the pine avenue w741701067.
  if(!existing.has('osm-way-741701880'))atlas.entries.push({
    id:'osm-way-741701880',name:'Biển Hồ Chè – hàng thông trăm tuổi',region:'Trung Bộ',province:'Gia Lai',locality:'Biển Hồ',
    kind:'Điểm ngắm cảnh',lon:108.0129715,lat:14.0660232,start:[108.0121527,14.0635859],approachMeters:285,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/way/741701880',
    source:'https://bienho.gialai.gov.vn/thong-bao-van-ban-moi/gioi-thieu-diem-van-hoa-du-lich-tren-dia-ban-xa-bien-ho.html',
    arrivalNote:'Xe dừng cạnh lề đường thông. Từ đây nhìn qua hàng cây có thể thấy các luống chè ở phía đông nam đường.'
  });
  if(!existing.has('osm-node-13105118510'))atlas.entries.push({
    id:'osm-node-13105118510',name:'Tượng Quán Thế Âm ở mũi Đầu Rùa',region:'Trung Bộ',province:'Gia Lai',city:'Pleiku',locality:'Biển Hồ',
    kind:'Tượng đài',lon:107.9998797,lat:14.0401163,start:[107.9993443,14.0342026],approachMeters:658,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/13105118510',
    source:'https://bienho.gialai.gov.vn/thong-bao-van-ban-moi/gioi-thieu-diem-van-hoa-du-lich-tren-dia-ban-xa-bien-ho.html',
    arrivalNote:'Xe dừng cạnh bãi ở cổng Biển Hồ. Từ đó đi bộ theo đường thông và bậc đá khoảng 680 m tới sân tượng.'
  });
  // The residence and provincial museum stand in the same grounds. w242705749
  // is the residence itself, south of the museum building w239932350.
  if(!existing.has('osm-way-242705749'))atlas.entries.push({
    id:'osm-way-242705749',name:'Biệt điện Bảo Đại (Buôn Ma Thuột)',region:'Trung Bộ',province:'Đắk Lắk',city:'Buôn Ma Thuột',locality:'Buôn Ma Thuột',
    kind:'Biệt điện',lon:108.042116,lat:12.674553,start:[108.042115,12.67345],approachMeters:122,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/way/242705749',
    source:'https://daklak.gov.vn/dia-danh-di-tich-thang-canh/-/asset_publisher/bDngMUmMrWIw/content/biet-ien-bao-ai',
    arrivalNote:'Xe dừng trên đường Y Ngông, trước lối vào khuôn viên bảo tàng. Đi bộ theo lối giữa vườn cây đến biệt điện.'
  });
  // The provincial transport plan connects Y Jút to the Buôn Jun landing.
  // Its last road segment (w779496939) meets the shore at the tip of the village.
  if(!existing.has('dak-lak-ben-thuyen-buon-jun'))atlas.entries.push({
    id:'dak-lak-ben-thuyen-buon-jun',name:'Bến thuyền độc mộc buôn Jun',region:'Trung Bộ',province:'Đắk Lắk',city:'Lắk',locality:'Buôn Jun',
    kind:'Bến tàu',lon:108.1675231,lat:12.4165578,start:[108.1675773,12.4164342],approachMeters:15,mappedEntrance:true,visitOnArrival:true,
    source:'https://ttthlak.gov.vn/tin-tuc/van-hoa-xa-hoi/doc-dao-le-cung-ben-thuyen-doc-moc-ho-lak-tai-buon-jun-thi-tran-lien-son',
    map:'https://www.openstreetmap.org/way/779496939',
    description:'Ở đầu bắc buôn Jun, đường Y Jút dẫn ra bến trên hồ Lắk. Người M’nông R’lâm từng dùng thuyền độc mộc để đánh cá, đi rẫy và qua lại giữa các buôn ven hồ.',
    arrivalNote:'Xe dừng gần cuối đường Y Jút. Đi bộ khoảng 15 m ra mép nước ở đầu bến.'
  });
  // The inscription faces the short southwestern court. The other main hall
  // across the roof ridge is the shrine of the Đặng family. The OSM pin
  // called Chùa Nam Phương lies outside the northern enclosure.
  if(!existing.has('dong-thap-nam-phuong-linh-tu'))atlas.entries.push({
    id:'dong-thap-nam-phuong-linh-tu',name:'Nam Phương Linh Từ',region:'Nam Bộ',province:'Đồng Tháp',city:'Lấp Vò',locality:'Long Hưng A',
    kind:'Di tích',lon:105.672435,lat:10.352504,start:[105.6705179,10.3514116],approachMeters:242,mappedEntrance:true,visitOnArrival:true,
    source:'https://dulichphuongnam.vn/den-tho-nam-phuong-linh-tu.html',map:'https://www.openstreetmap.org/?mlat=10.352504&mlon=105.672435#map=19/10.352504/105.672435',
    description:'Chính điện mở về sân phía tây nam, nơi có bia khắc tên Nam Phương Linh Từ. Ngôi điện có bảy gian, hai chái và sáu mươi cột.',
    arrivalNote:'Xe dừng ở lối vào khu văn hóa Phương Nam trên Đường huyện 69. Từ đó đi bộ qua sân tới chính điện.'
  });
  // The grave and temple are on the same plot at 1 Phan Đình Phùng. The
  // monument on the traffic island (n10608268024) has its own Atlas record.
  if(!existing.has('dong-thap-lang-mo-truong-dinh'))atlas.entries.push({
    id:'dong-thap-lang-mo-truong-dinh',name:'Mộ và đền thờ Trương Định',region:'Nam Bộ',province:'Đồng Tháp',city:'Gò Công',locality:'Gò Công',
    kind:'Lăng mộ',lon:106.674073,lat:10.3596791,start:[106.6741120,10.3598779],approachMeters:22,mappedEntrance:true,visitOnArrival:true,
    source:'https://dongthap.gov.vn/web/cong-thong-tin-dtp/tin-tuc/chi-tiet?id=10570971',map:'https://www.openstreetmap.org/?mlat=10.3596791&mlon=106.674073#map=19/10.3596791/106.674073',
    description:'Giữa phố Gò Công, phần mộ của Trương Định nằm trong khu tường bao, trước ngôi đền. Hai tấm bia có mái che ở đầu khu mộ.',
    arrivalNote:'Xe dừng trên đường Phan Đình Phùng gần cổng số 1. Đi qua cổng vào khu mộ và đền.'
  });
  // A nursery on Đường Hoa Sa Đéc. The OSM garden pin is on its service lane.
  // Park at the lane's intersection with the public road (n3423656227).
  if(!existing.has('osm-node-13518302230'))atlas.entries.push({
    id:'osm-node-13518302230',name:'Làng hoa Sa Đéc – vườn hoa Tân Quy Đông',region:'Nam Bộ',province:'Đồng Tháp',city:'Sa Đéc',locality:'Tân Quy Đông',
    kind:'Điểm tham quan',lon:105.7456238,lat:10.3184773,start:[105.7451432,10.3176824],approachMeters:103,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/13518302230',source:'https://dulich.dongthap.gov.vn/vi/camera360',photo:'https://vr3d.com.vn/dongthap/langhoasadec/',
    description:'Từ đường hoa Sa Nhiên – Cai Dao, các lối nhỏ dẫn vào những nhà vườn của Tân Quy Đông. Ảnh cầu cho thấy các luống cây và hoa ở nhiều vị trí trong làng.',
    arrivalNote:'Xe dừng trên Đường Hoa Sa Đéc, ở đầu lối vào vườn. Từ đây đi bộ vào các luống hoa.'
  });
  // The water wheels beside the rice fields have a separate pin from the reserve
  // boundary and the bamboo raft landing. The approach ends on village road w888275965.
  if(!existing.has('osm-node-13508679485'))atlas.entries.push({
    id:'osm-node-13508679485',name:'Guồng nước suối Chàm – Pù Luông',region:'Trung Bộ',province:'Thanh Hóa',city:'Thanh Hóa',locality:'Chiềng Lau',
    kind:'Điểm tham quan',lon:105.2108098,lat:20.3813461,start:[105.2107981,20.3802488],approachMeters:130,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/13508679485',source:'https://nhandan.vn/tre-chieng-lau-post789295.html',
    arrivalNote:'Xe dừng trên đường làng phía nam cánh đồng. Từ đây đi bộ theo bờ ruộng tới cụm guồng nước.'
  });
  if(!existing.has('osm-node-7173617332'))atlas.entries.push({
    id:'osm-node-7173617332',name:'Bến Yến (Chùa Hương)',region:'Bắc Bộ',province:'Hà Nội',city:'Hà Nội',locality:'Hương Sơn',
    kind:'Bến tàu',lon:105.7792825,lat:20.6090699,start:huongSonParking,approachMeters:1040,mappedEntrance:true,visitOnArrival:true,
    source:'https://hanoigo.hanoi.gov.vn/place/quan-the-huong-son-chua-huong-ctv-sa2nx5',
    map:'https://www.openstreetmap.org/node/7173617332',
    description:'Bến Yến nằm bên đường làng Yến Vỹ. Đò từ đây đi về phía tây nam theo suối Yến rồi vòng qua các dãy núi để đến bến Trò.',
    arrivalNote:'Xe dừng trên đường cạnh bến xe Hương Sơn, phía chợ Đục Khê. Từ đó đi bộ hoặc xe điện tới bến đò.',
    views:[{name:'Dọc bến đò làng Yến Vỹ',offset:[-11,6],viewAngle:1.01,viewRadius:58,viewElevation:.34,height:3},
      {name:'Suối Yến về phía núi',offset:[-85,83],viewAngle:2.39,viewRadius:115,viewElevation:.31,height:5}]
  });
  if(!existing.has('osm-node-778791182'))atlas.entries.push({
    id:'osm-node-778791182',name:'Bến Bèo',region:'Bắc Bộ',province:'Hải Phòng',city:'Hải Phòng',locality:'Cát Bà',
    kind:'Bến tàu',lon:107.0589122,lat:20.732131,start:benBeo,approachMeters:113,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/778791182',
    source:'https://haiphong.gov.vn/diem-bao-ve-hai-phong/diem-bao-hang-ngay-ve-hai-phong-ngay-7-4-2026-881575',
    description:'Phố Cái Bèo kết thúc bên cầu tàu. Các bến nhỏ nối theo bờ về phía nam. Từ đây tàu ra làng chài và vịnh Lan Hạ.',
    views:[{name:'Cầu tàu ở cuối phố Cái Bèo',offset:[-1,-4],viewAngle:2.06,viewRadius:67,viewElevation:.34,height:5},
      {name:'Dọc bờ Bến Bèo',offset:[-13,44],viewAngle:-2.91,viewRadius:144,viewElevation:.41,height:8}]
  });
  if(!existing.has('osm-node-5246605623'))atlas.entries.push({
    id:'osm-node-5246605623',name:'Hang Trống',region:'Bắc Bộ',province:'Quảng Ninh',city:'Vịnh Hạ Long',
    locality:'Đảo Bồ Hòn',kind:'Hang động',lon:107.1074494,lat:20.8404008,start:tuanChau,
    approachMeters:15100,mappedEntrance:true,visitOnArrival:true,map:'https://www.openstreetmap.org/node/5246605623',
    source:'https://whc.unesco.org/document/192087'
  });
  // Pò Giả Mải is the local name of Đảo Bà Góa. The way is tagged as an
  // island and has no tourism tag in the national catalogue import.
  if(!existing.has('osm-way-591309599'))atlas.entries.push({
    id:'osm-way-591309599',name:'Đảo Bà Góa – Pò Giả Mải',province:'Thái Nguyên',city:'Thái Nguyên',
    locality:'Ba Bể',region:'Bắc Bộ',kind:'Đảo',lon:105.623214,lat:22.405097,
    start:[105.6241973,22.4086666],approachMeters:409,source:'https://csdl.vietnamtourism.gov.vn/dest/?item=752',
    map:'https://www.openstreetmap.org/way/591309599'
  });
  for (const [way, name, province, locality, lon, lat, startLon, startLat, approachMeters, componentSource=source] of components) {
    const id = 'osm-way-' + way;
    if (existing.has(id) || atlas.aliases[id]) continue;
    atlas.entries.push({id, name, province, city:province, locality, region:'Bắc Bộ', kind:'Di tích',
      lon, lat, start:[startLon, startLat], approachMeters, source:componentSource, map:'https://www.openstreetmap.org/way/' + way});
  }
  // UNESCO's location for 678-014 and its list of the fourteen Huế components:
  // https://whc.unesco.org/en/list/678/maps/
  // Hòn Chén and Voi Ré use interior points of the named OSM ways. Their
  // road endpoints meet the mapped stairs and footpath at nodes 9859668009 and 9859723546.
  const hue = [
    {id:'osm-way-1075014568', name:'Điện Hòn Chén (điện Huệ Nam)', locality:'Hải Cát',
      lon:107.5629208, lat:16.4219646, start:[107.563060,16.423090], approachMeters:126,
      map:'https://www.openstreetmap.org/way/1075014568',
      arrivalNote:'Xe dừng trên đường làng Hải Cát, cách điện 126 m theo đường thẳng. Từ đây có bậc thang nối với lối đi bộ tới điện.'},
    {id:'osm-way-1075016121', name:'Điện Voi Ré (miếu Long Châu)', locality:'Trường Đá',
      lon:107.5527367, lat:16.4481203, start:[107.552950,16.447922], approachMeters:32,
      map:'https://www.openstreetmap.org/way/1075016121',
      arrivalNote:'Xe dừng ở đầu lối đi bộ vào điện Voi Ré, cách điểm tham quan 32 m theo đường thẳng.'},
    {id:'unesco-678-014', name:'Trấn Hải Thành', locality:'Thuận An',
      lon:107.6549333, lat:16.5546833, start:[107.654199,16.555779], approachMeters:145,
      map:'https://www.openstreetmap.org/?mlat=16.5546833&mlon=107.6549333#map=18/16.5546833/107.6549333',
      arrivalNote:'Xe dừng tại giao lộ Lê Sỹ và Trấn Hải Thành ở Thuận An, cách điểm di sản 145 m theo đường thẳng.'},
  ];
  for (const site of hue) {
    if (existing.has(site.id) || atlas.aliases[site.id]) continue;
    atlas.entries.push({...site, province:'Huế', city:'Huế', region:'Trung Bộ', kind:'Di tích',
      visitOnArrival:true, source:'https://whc.unesco.org/en/list/678/maps/'});
  }
})();
