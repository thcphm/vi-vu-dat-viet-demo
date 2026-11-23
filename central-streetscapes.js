'use strict';
(() => {
  // Regional Central Vietnam streetscapes: authentic district palettes, regional
  // shopfront facades, sidewalk specialty stalls (quán đặc sản vỉa hè), café
  // plastic-stool clusters, and Hội An / Huế silk lantern strings.
  const ZONES = [
    {
      id: 'hoi-an',
      bounds: [108.308, 15.864, 108.352, 15.890],
      walls: [0xeac655, 0xe3bc47, 0xf0d26d, 0xdcb546],
      roofs: [0x874834, 0x763e2d, 0x693b2d],
      gables: [0x8e4b35, 0x7a402e, 0x6b3a2c],
      awnings: [0x7e462d, 0x995333, 0x6c3c27],
      forcePitched: true,
      heritageWood: true,
      lanterns: true,
      signStyle: { bg: '#6e311f', fg: '#f6d67a', trim: '#d5a84c', wall: '#ebd072', shutter: '#5a3520' },
      shops: [
        { title: 'CAO LẦU HỘI AN', sub: 'MÌ QUẢNG • HOÀNH THÁNH', accent: '#8f3021', upstairs: true },
        { title: 'ĐÈN LỒNG HỘI AN', sub: 'LỤA TƠ TẰM • THỦ CÔNG', accent: '#b83c2a', upstairs: false },
        { title: 'CÀ PHÊ PHỐ CỔ', sub: 'TRÀ MÓT • NƯỚC THẢO MỘC', accent: '#6d4428', upstairs: true },
        { title: 'BÁNH MÌ PHỐ HỘI', sub: 'PATE • XÁ XÍU • RAU THƠM', accent: '#9b4a26', upstairs: false },
        { title: 'MAY ĐO ÁO DÀI', sub: 'VẢI LỤA • LẤY NGAY', accent: '#2f5e62', upstairs: true },
        { title: 'MÌ QUẢNG BÀ LỄ', sub: 'ĐẶC SẢN QUẢNG NAM', accent: '#7c3926', upstairs: false }
      ],
      stalls: ['CAO LẦU', 'TRÀ MÓT', 'BÁNH MÌ', 'ĐÈN LỒNG']
    },
    {
      id: 'hue',
      bounds: [107.530, 16.430, 107.628, 16.505],
      walls: [0xecd8a4, 0xe4cc94, 0xf2e4c2, 0xddd0b0],
      roofs: [0x8d4935, 0x7a4231, 0x705140],
      gables: [0x924c38, 0x7d4433, 0x6e4738],
      awnings: [0x7e3746, 0x965743, 0x5c685e],
      forcePitched: false,
      heritageWood: true,
      lanterns: true,
      signStyle: { bg: '#662839', fg: '#f4df9e', trim: '#c79a50', wall: '#ecdab1', shutter: '#4d3a2c' },
      shops: [
        { title: 'BÚN BÒ HUẾ', sub: 'GIÒ HEO • CHẢ CUA • MẮM RUỐC', accent: '#8c2d2c', upstairs: true },
        { title: 'CÀ PHÊ MUỐI', sub: 'CÀ PHÊ PHIN • TRÀ CUNG ĐÌNH', accent: '#5e3c28', upstairs: false },
        { title: 'BÁNH BÈO NẬM LỌC', sub: 'BÁNH KHOÁI • NEM LỤI', accent: '#7a3346', upstairs: true },
        { title: 'CƠM HẾN SÔNG HƯƠNG', sub: 'BÚN HẾN • CHÈ HẺM HUẾ', accent: '#36615d', upstairs: false },
        { title: 'MÈ XỬNG HUẾ', sub: 'TRÀ SEN • QUÀ CỐ ĐÔ', accent: '#99532b', upstairs: true },
        { title: 'CHÈ CUNG ĐÌNH', sub: 'CHÈ HẠT SEN • BỘT LỌC HEO QUAY', accent: '#6d3145', upstairs: false }
      ],
      stalls: ['BÚN BÒ HUẾ', 'CÀ PHÊ MUỐI', 'CƠM HẾN', 'CHÈ HẺM']
    },
    {
      id: 'da-nang',
      bounds: [108.165, 16.005, 108.285, 16.135],
      walls: [0xf2ece0, 0xe1ecec, 0xeee3cc, 0xdce6ed],
      roofs: [0x9c5844, 0x567d8e, 0x7a8a8e],
      gables: [0xa15943, 0x5f7f8c, 0x86614d],
      awnings: [0x2f6c80, 0xb0543a, 0x4c8276],
      forcePitched: false,
      heritageWood: false,
      lanterns: false,
      signStyle: { bg: '#1e5b73', fg: '#fff4d4', trim: '#e0a54b', wall: '#efe9dd', shutter: '#2f5460' },
      shops: [
        { title: 'MÌ QUẢNG ĐÀ NẴNG', sub: 'ẾCH • GÀ TA • TÔM THỊT', accent: '#b34729', upstairs: true },
        { title: 'HẢI SẢN TƯƠI SỐNG', sub: 'TÔM HÙM • CUA GHẸ • ỐC BIỂN', accent: '#1b6380', upstairs: false },
        { title: 'BÁNH TRÁNG CUỐN THỊT', sub: 'MẮM NÊM DÌ VÂN • RAU SỐNG', accent: '#2f7257', upstairs: true },
        { title: 'BÚN CHẢ CÁ SÔNG HÀN', sub: 'CHẢ CÁ THU • BÚN MẮM NÊM', accent: '#a84f2b', upstairs: false },
        { title: 'CÀ PHÊ BIỂN MỸ KHÊ', sub: 'TRÀ SỮA • NƯỚC DỪA TƯƠI', accent: '#2c5c6e', upstairs: true },
        { title: 'ĐẶC SẢN MIỀN TRUNG', sub: 'CHẢ BÒ • MỰC RIM • TRÉ', accent: '#8e362c', upstairs: false }
      ],
      stalls: ['MÌ QUẢNG', 'HẢI SẢN', 'BÚN CHẢ CÁ', 'CÀ PHÊ']
    },
    {
      id: 'nghe-an',
      bounds: [105.42, 18.58, 105.82, 19.32],
      walls: [0xeddac0, 0xe5cca0, 0xf1e5cf, 0xdcd3bf],
      roofs: [0xa44b35, 0x8c412f, 0x7b4c3a],
      gables: [0xa84d36, 0x8d4330, 0x795140],
      awnings: [0x9f3f2d, 0x3b6c63, 0xa86f38],
      forcePitched: false,
      heritageWood: false,
      lanterns: false,
      signStyle: { bg: '#8c2b22', fg: '#fce39c', trim: '#d5a147', wall: '#ede0c6', shutter: '#4f3e2e' },
      shops: [
        { title: 'CHÁO LƯƠN XỨ NGHỆ', sub: 'SÚP LƯƠN • MIẾN LƯƠN ĐỒNG', accent: '#992d22', upstairs: true },
        { title: 'CÀ PHÊ THÀNH VINH', sub: 'TRÀ ĐÁ • HƯỚNG DƯƠNG', accent: '#5a3d29', upstairs: false },
        { title: 'BÁNH MƯỚT NGHỆ AN', sub: 'GIÒ NÓNG • XÁO LÒNG', accent: '#2d6859', upstairs: true },
        { title: 'HẢI SẢN CỬA LÒ', sub: 'MỰC NHÁY • TÔM HẤP SẢ', accent: '#1f5e78', upstairs: false },
        { title: 'NHÚT THANH CHƯƠNG', sub: 'TƯƠNG NAM ĐÀN • BÁNH GAI', accent: '#7c4c27', upstairs: true },
        { title: 'SÚP LƯƠN BÁNH MÌ', sub: 'ĐẶC SẢN THÀNH VINH', accent: '#a84426', upstairs: false }
      ],
      stalls: ['CHÁO LƯƠN', 'SÚP LƯƠN', 'BÁNH MƯỚT', 'CÀ PHÊ']
    },
    {
      id: 'ha-tinh-quang-tri',
      bounds: [105.70, 16.65, 107.28, 18.56],
      walls: [0xede0c8, 0xe3d2b3, 0xe8e2d4, 0xf0e4cd],
      roofs: [0x9b4d38, 0x7e4d3d, 0x6f7e82],
      gables: [0x9e4f39, 0x825140, 0x737d7e],
      awnings: [0x2e6a73, 0x9c4832, 0x6f7c54],
      forcePitched: false,
      heritageWood: false,
      lanterns: false,
      signStyle: { bg: '#275966', fg: '#f8e6b4', trim: '#cc974b', wall: '#ede2cb', shutter: '#3e5256' },
      shops: [
        { title: 'KẸO CU ĐƠ HÀ TĨNH', sub: 'BÁNH ĐA VỪNG • CHÈ XANH', accent: '#8e3824', upstairs: true },
        { title: 'CHÁO CANH QUẢNG BÌNH', sub: 'CÁ LÓC • RAM GIÒN', accent: '#256372', upstairs: false },
        { title: 'BÁNH BỘT LỌC', sub: 'BÁNH KHOÁI • ĐỒNG HỚI', accent: '#a24e2b', upstairs: true },
        { title: 'CÀ PHÊ NHẬT LỆ', sub: 'NƯỚC DỪA • SINH TỐ', accent: '#4b5e3c', upstairs: false },
        { title: 'HẢI SẢN SÔNG GIANH', sub: 'MỰC NƯỚNG • CÁ NỤC HẤP', accent: '#1e5a74', upstairs: true },
        { title: 'BÚN HẾN MAI XÁ', sub: 'CHÁO BỘT • QUẢNG TRỊ', accent: '#7c3f28', upstairs: false }
      ],
      stalls: ['CHÁO CANH', 'CU ĐƠ', 'BÁNH LỌC', 'CHÈ XANH']
    },
    {
      id: 'thanh-hoa',
      bounds: [105.32, 19.62, 105.98, 20.18],
      walls: [0xeee0be, 0xe5d4ad, 0xefe6d4, 0xe2decb],
      roofs: [0xa34c36, 0x8c4230, 0x7a6a5c],
      gables: [0xa64e38, 0x8d4533, 0x7d6b5b],
      awnings: [0x9d3c2b, 0x35696c, 0x8d6738],
      forcePitched: false,
      heritageWood: false,
      lanterns: false,
      signStyle: { bg: '#8a2d24', fg: '#fae4a4', trim: '#cfa04c', wall: '#eee2c4', shutter: '#4c3f32' },
      shops: [
        { title: 'NEM CHUA THANH HÓA', sub: 'NEM NƯỚNG • TƯƠNG ỚT XỨ THANH', accent: '#9e2e24', upstairs: true },
        { title: 'CHẢ TÔM XỨ THANH', sub: 'BÁNH CUỐN NÓNG • RAU SỐNG', accent: '#b04e28', upstairs: false },
        { title: 'HẢI SẢN SẦM SƠN', sub: 'CUA GHẸ • MỰC TRỨNG HẤP', accent: '#1f617a', upstairs: true },
        { title: 'CÀ PHÊ HÀM RỒNG', sub: 'TRÀ CHANH • HƯỚNG DƯƠNG', accent: '#5c412b', upstairs: false },
        { title: 'BÁNH RĂNG BỪA', sub: 'CHÈ LAM PHỦ QUẢNG', accent: '#366855', upstairs: true },
        { title: 'CHÁO CANH SƯỜN', sub: 'BÚN CHẢ • ĐẶC SẢN XỨ THANH', accent: '#8c4228', upstairs: false }
      ],
      stalls: ['NEM CHUA', 'CHẢ TÔM', 'BÁNH CUỐN', 'CÀ PHÊ']
    },
    {
      id: 'quang-ngai-quy-nhon',
      bounds: [108.68, 13.68, 109.32, 15.42],
      walls: [0xf1e4ca, 0xe8d7b4, 0xe4e9e4, 0xf2ead9],
      roofs: [0xa3543d, 0x62828a, 0x8a5b46],
      gables: [0xa6563f, 0x66838b, 0x8c5d47],
      awnings: [0x2e6e7c, 0xb05336, 0x4f7c62],
      forcePitched: false,
      heritageWood: false,
      lanterns: false,
      signStyle: { bg: '#215d6d', fg: '#fff1cc', trim: '#d99c46', wall: '#f0e4cc', shutter: '#35545c' },
      shops: [
        { title: 'BÁNH XÈO TÔM NHẢY', sub: 'BÁNH HỎI LÒNG HEO • QUY NHƠN', accent: '#b24826', upstairs: true },
        { title: 'BÚN CHẢ CÁ QUY NHƠN', sub: 'CHẢ CÁ BIỂN • SỨA TƯƠI', accent: '#1e637a', upstairs: false },
        { title: 'DON QUẢNG NGÃI', sub: 'RAM BẮP • BÁNH TRÁNG NƯỚNG', accent: '#8e3d28', upstairs: true },
        { title: 'CÀ PHÊ BIỂN', sub: 'NƯỚC DỪA • SINH TỐ TƯƠI', accent: '#346b5a', upstairs: false },
        { title: 'NEM CHỢ HUYỆN', sub: 'MẠCH NHA • TỎI LÝ SƠN', accent: '#995328', upstairs: true },
        { title: 'HẢI SẢN GHỀNH RÁNG', sub: 'ỐC HƯƠNG • MỰC NƯỚNG', accent: '#235a78', upstairs: false }
      ],
      stalls: ['BÁNH XÈO', 'BÚN CHẢ CÁ', 'DON', 'CÀ PHÊ']
    },
    {
      id: 'nha-trang-phan-rang',
      bounds: [108.88, 11.48, 109.42, 13.22],
      walls: [0xf4ece0, 0xf0dec4, 0xe2ecef, 0xf5e8d2],
      roofs: [0xa9563d, 0x527f96, 0x8e6248],
      gables: [0xac583f, 0x568298, 0x91644a],
      awnings: [0x26708c, 0xb85838, 0x3b847a],
      forcePitched: false,
      heritageWood: false,
      lanterns: false,
      signStyle: { bg: '#1b6482', fg: '#fff5d8', trim: '#e6aa4c', wall: '#f3ebd9', shutter: '#2a5668' },
      shops: [
        { title: 'NEM NƯỚNG NHA TRANG', sub: 'BÁNH ƯỚT • NƯỚC CHẤM ĐẶC BIỆT', accent: '#b34326', upstairs: true },
        { title: 'BÚN SỨA CHẢ CÁ', sub: 'BÚN CÁ DẦM • NHA TRANG', accent: '#1d6885', upstairs: false },
        { title: 'MẮT CÁ NGỪ ĐẠI DƯƠNG', sub: 'HẢI SẢN TUY HÒA • PHÚ YÊN', accent: '#2d6c68', upstairs: true },
        { title: 'CÀ PHÊ TRẦN PHÚ', sub: 'YẾN SÀO • NƯỚC DỪA XIÊM', accent: '#355c74', upstairs: false },
        { title: 'BÁNH CĂN PHAN RANG', sub: 'NHO TƯƠI • MẬT NHO NINH THUẬN', accent: '#7e3b68', upstairs: true },
        { title: 'HẢI SẢN NƯỚNG BIỂN', sub: 'TÔM HÙM • NHUM NƯỚNG MỠ HÀNH', accent: '#a84f2b', upstairs: false }
      ],
      stalls: ['NEM NƯỚNG', 'BÚN SỨA', 'BÁNH CĂN', 'NƯỚC DỪA']
    },
    {
      id: 'tay-nguyen',
      bounds: [107.78, 12.52, 108.38, 14.48],
      walls: [0xe8d3b3, 0xdac09d, 0xe6dac7, 0xdfc8a5],
      roofs: [0x8e4733, 0x6b4534, 0x7b563c],
      gables: [0x924a35, 0x6e4836, 0x80583e],
      awnings: [0x6d3b26, 0x8c4d2d, 0x456544],
      forcePitched: false,
      heritageWood: true,
      lanterns: false,
      signStyle: { bg: '#512d1d', fg: '#f6d897', trim: '#c98e46', wall: '#e6d2b4', shutter: '#492e1f' },
      shops: [
        { title: 'CÀ PHÊ BAN MÊ', sub: 'ROBUSTA RANG XAY • NGUYÊN CHẤT', accent: '#5a321e', upstairs: true },
        { title: 'PHỞ KHÔ GIA LAI', sub: 'PHỞ HAI TÔ • TƯƠNG ĐEN PLEIKU', accent: '#8e3824', upstairs: false },
        { title: 'BÚN ĐỎ BUÔN MA THUỘT', sub: 'BÁNH ƯỚT THỊT NƯỚNG', accent: '#a63e26', upstairs: true },
        { title: 'GỎI LÁ KON TUM', sub: 'CƠM LAM • GÀ NƯỚNG BẢN ĐÔN', accent: '#356644', upstairs: false },
        { title: 'CÀ PHÊ NGUYÊN CHẤT', sub: 'MẬT ONG HOA CÀ PHÊ • TIÊU ĐEN', accent: '#6d3e24', upstairs: true },
        { title: 'BÒ NHÚNG ME TÂY NGUYÊN', sub: 'LẨU LÁ RỪNG • RƯỢU CẦN', accent: '#8a4326', upstairs: false }
      ],
      stalls: ['CÀ PHÊ BAN MÊ', 'PHỞ KHÔ', 'BÚN ĐỎ', 'CƠM LAM']
    },
    {
      id: 'da-lat',
      bounds: [108.37, 11.87, 108.52, 12.00],
      walls: [0xf3e4c3, 0xecd1bc, 0xe6dfd0, 0xf2ddb0],
      roofs: [0xa84b36, 0x8c3e2e, 0x5b6c75],
      gables: [0xad4e38, 0x8f4130, 0x5f717a],
      awnings: [0x8e3a32, 0x456b5a, 0x6b4b5c],
      forcePitched: true,
      heritageWood: true,
      lanterns: true,
      signStyle: { bg: '#5a2d36', fg: '#fae6b8', trim: '#d6a45c', wall: '#f2e3c6', shutter: '#3b5748' },
      shops: [
        { title: 'BÁNH TRÁNG NƯỚNG', sub: 'SỮA ĐẬU NÀNH NÓNG • ĐÀ LẠT', accent: '#9e3b2e', upstairs: true },
        { title: 'CÀ PHÊ SƯƠNG MÙ', sub: 'ARABICA CẦU ĐẤT • TRÀ ATISO', accent: '#485e4c', upstairs: false },
        { title: 'LẨU GÀ LÁ É', sub: 'BÁNH ƯỚT LÒNG GÀ • CHỢ ĐÊM', accent: '#36684f', upstairs: true },
        { title: 'BÁNH MÌ XÍU MẠI', sub: 'BÁNH CĂN NÓNG • HỒ XUÂN HƯƠNG', accent: '#a8512d', upstairs: false },
        { title: 'HOA TƯƠI ĐÀ LẠT', sub: 'DÂU TÂY • MỨT ĐẶC SẢN', accent: '#8c3554', upstairs: true },
        { title: 'SỮA ĐẬU NÀNH NÓNG', sub: 'BÁNH SU KEM • KHOAI NƯỚNG', accent: '#6d4430', upstairs: false }
      ],
      stalls: ['BÁNH TRÁNG NƯỚNG', 'SỮA ĐẬU NÀNH', 'CÀ PHÊ NÓNG', 'HOA ĐÀ LẠT']
    },
    {
      id: 'phan-thiet',
      bounds: [108.02, 10.86, 108.38, 11.06],
      walls: [0xf3e6ce, 0xefd8be, 0xe4ecee, 0xf4e3c2],
      roofs: [0xa6533b, 0x558296, 0x8d5b44],
      gables: [0xa9563d, 0x58859a, 0x905e46],
      awnings: [0x26708a, 0xb35235, 0x45806f],
      forcePitched: false,
      heritageWood: false,
      lanterns: false,
      signStyle: { bg: '#1e6078', fg: '#fff2d0', trim: '#dfa349', wall: '#f2e4ca', shutter: '#2f5766' },
      shops: [
        { title: 'BÁNH CĂN PHAN THIẾT', sub: 'BÁNH XÈO • CÁ KHO TỘ', accent: '#b04828', upstairs: true },
        { title: 'NƯỚC MẮM PHAN THIẾT', sub: 'MỰC MỘT NẮNG • ĐẶC SẢN', accent: '#8e3824', upstairs: false },
        { title: 'MÌ QUẢNG VỊT', sub: 'BÁNH QUAI VẠC • CHẢ CÁ', accent: '#23647a', upstairs: true },
        { title: 'HẢI SẢN MŨI NÉ', sub: 'GỎI CÁ MAI • RĂNG MỰC NƯỚNG', accent: '#2a6f62', upstairs: false },
        { title: 'CÀ PHÊ ĐỒI DƯƠNG', sub: 'NƯỚC DỪA TƯƠI • THANH LONG', accent: '#7c3658', upstairs: true },
        { title: 'BÁNH RẾ PHAN THIẾT', sub: 'CỐM SỮA • QUÀ BIỂN', accent: '#9c522a', upstairs: false }
      ],
      stalls: ['BÁNH CĂN', 'RĂNG MỰC', 'GỎI CÁ MAI', 'NƯỚC DỪA']
    }
  ];

  function zoneAt(lon, lat) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    for (const z of ZONES) {
      const [minLon, minLat, maxLon, maxLat] = z.bounds;
      if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) return z;
    }
    return null;
  }

  function paintShopfrontTexture(T, zone, shop, renderer) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = shop.upstairs ? 512 : 320;
    const g = c.getContext('2d');
    const st = zone.signStyle;
    const W = c.width, H = c.height;

    // Base plaster wall with subtle vertical weathering
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, st.wall);
    grad.addColorStop(0.85, st.wall);
    grad.addColorStop(1, '#b8aa92');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // Subtle plaster grain lines
    g.fillStyle = 'rgba(70,50,30,0.045)';
    for (let y = 0; y < H; y += 16) g.fillRect(0, y, W, 3);

    const gfTop = shop.upstairs ? 248 : 28;
    // Upstairs floor (windows + shutters + balcony) for 2-story shops
    if (shop.upstairs) {
      // Molding cornice
      g.fillStyle = 'rgba(90,65,40,0.22)';
      g.fillRect(0, 14, W, 12);
      g.fillStyle = '#d9ccb2';
      g.fillRect(0, 224, W, 16);

      // Two shuttered Vietnamese windows (Hội An / Huế / Đà Lạt wood or green louvers)
      for (const wx of [78, 306]) {
        g.fillStyle = '#3b2c20';
        g.fillRect(wx - 6, 56, 140, 148);
        // Dark interior glass
        g.fillStyle = '#243438';
        g.fillRect(wx + 24, 66, 80, 128);
        // Glass mullions
        g.strokeStyle = '#6b5a46';
        g.lineWidth = 4;
        g.strokeRect(wx + 24, 66, 80, 128);
        g.beginPath();
        g.moveTo(wx + 64, 66); g.lineTo(wx + 64, 194);
        g.moveTo(wx + 24, 130); g.lineTo(wx + 104, 130);
        g.stroke();
        // Side louvered shutters
        g.fillStyle = st.shutter;
        g.fillRect(wx - 4, 62, 28, 136);
        g.fillRect(wx + 104, 62, 28, 136);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let ly = 70; ly < 194; ly += 10) {
          g.fillRect(wx - 1, ly, 22, 3);
          g.fillRect(wx + 107, ly, 22, 3);
        }
      }
      // Balcony railing
      g.fillStyle = '#3d3732';
      g.fillRect(42, 184, W - 84, 6);
      g.fillRect(42, 218, W - 84, 6);
      for (let bx = 50; bx <= W - 50; bx += 22) g.fillRect(bx, 184, 4, 38);
    }

    // Shop signboard (biển hiệu tiếng Việt)
    const signY = gfTop;
    const signH = 82;
    g.fillStyle = shop.accent || st.bg;
    g.fillRect(16, signY, W - 32, signH);
    g.strokeStyle = st.trim;
    g.lineWidth = 5;
    g.strokeRect(20, signY + 4, W - 40, signH - 8);

    // Main title
    g.fillStyle = st.fg;
    g.font = 'bold 38px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(shop.title, W / 2, signY + 34, W - 58);

    // Subtitle menu
    g.fillStyle = 'rgba(255,244,218,0.88)';
    g.font = 'bold 17px "Segoe UI", Arial, sans-serif';
    g.fillText(shop.sub, W / 2, signY + 64, W - 64);

    // Striped awning valance strip under signboard
    const valY = signY + signH + 4;
    for (let x = 16, idx = 0; x < W - 16; x += 32, idx++) {
      g.fillStyle = idx % 2 === 0 ? (shop.accent || st.bg) : '#f3ead8';
      g.fillRect(x, valY, Math.min(32, W - 16 - x), 18);
    }

    // Ground floor open doorway / wooden folding panels (cửa gỗ Hội An / cửa kính quán ăn)
    const doorY = valY + 22;
    const doorH = H - doorY - 12;
    if (zone.heritageWood) {
      // Heritage timber folding panels (cửa bức bàn / cửa gỗ cổ)
      g.fillStyle = '#3d2416';
      g.fillRect(36, doorY, W - 72, doorH);
      // Warm interior glow
      const warm = g.createLinearGradient(0, doorY, 0, H);
      warm.addColorStop(0, '#4a2e1b');
      warm.addColorStop(0.5, '#7c532e');
      warm.addColorStop(1, '#3b281c');
      g.fillStyle = warm;
      g.fillRect(136, doorY + 12, W - 272, doorH - 12);
      // Flanking wooden doors with lattice & gold calligraphy panels
      for (const dx of [40, W - 132]) {
        g.fillStyle = '#5e351f';
        g.fillRect(dx, doorY + 6, 92, doorH - 6);
        g.strokeStyle = '#351c0f';
        g.lineWidth = 4;
        g.strokeRect(dx + 6, doorY + 14, 80, doorH * 0.45);
        g.strokeRect(dx + 6, doorY + doorH * 0.52, 80, doorH * 0.42);
      }
      // Two hanging red/gold paper lanterns under lintel
      for (const lx of [185, W - 185]) {
        g.fillStyle = '#d93d2b';
        g.beginPath();
        g.ellipse(lx, doorY + 32, 18, 22, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#f2c14e';
        g.fillRect(lx - 8, doorY + 8, 16, 6);
        g.fillRect(lx - 6, doorY + 52, 12, 8);
      }
    } else {
      // Modern Vietnamese tiled shopfront with open glass/metal roll-up entrance & glass food cabinet
      g.fillStyle = '#2d3b3e';
      g.fillRect(36, doorY, W - 72, doorH);
      // Warm interior wall & light bar
      const inner = g.createLinearGradient(0, doorY, 0, H);
      inner.addColorStop(0, '#6a5b44');
      inner.addColorStop(0.35, '#8f7d60');
      inner.addColorStop(1, '#4c463c');
      g.fillStyle = inner;
      g.fillRect(52, doorY + 12, W - 104, doorH - 12);
      // Glass food display cabinet (tủ kính bán bún/cháo/mì)
      g.fillStyle = '#b9d2d8';
      g.fillRect(68, doorY + doorH * 0.36, 130, doorH * 0.62);
      g.fillStyle = '#9aaeb4';
      g.fillRect(68, doorY + doorH * 0.68, 130, doorH * 0.30);
      g.strokeStyle = '#6c797c';
      g.lineWidth = 4;
      g.strokeRect(68, doorY + doorH * 0.36, 130, doorH * 0.62);
      // Stacked bowls/dishes silhouette in cabinet
      g.fillStyle = '#e7decb';
      for (const bx of [86, 118, 152]) g.fillRect(bx, doorY + doorH * 0.56, 22, 12);
      // Ceramic wall tile dado on pillars
      g.fillStyle = '#d8d2c2';
      g.fillRect(0, doorY + doorH * 0.45, 34, H - (doorY + doorH * 0.45));
      g.fillRect(W - 34, doorY + doorH * 0.45, 34, H - (doorY + doorH * 0.45));
    }

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    if (renderer) tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return new T.MeshStandardMaterial({
      name: 'CentralShop ' + zone.id + ' ' + shop.title,
      map: tex,
      roughness: 0.88,
      metalness: 0.02
    });
  }

  function makeStallSignTexture(T, text, bg, fg) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56);
    g.fillStyle = fg; g.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 34, 232);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  function create(T, scene, renderer, materialMap) {
    const root = new T.Group();
    root.name = 'Central Vietnam street life';
    scene.add(root);

    const frontCache = new Map();
    const signCache = new Map();
    const glowMats = [];

    // Shared geometries & materials for sidewalk stalls, plastic stools, tables, umbrellas & lanterns
    const geo = {
      box: new T.BoxGeometry(1, 1, 1),
      cyl: new T.CylinderGeometry(1, 1, 1, 10),
      cone: new T.ConeGeometry(1, 1, 8),
      sphere: new T.SphereGeometry(1, 10, 8),
      plane: new T.PlaneGeometry(1, 1)
    };
    const mat = {
      steel: new T.MeshStandardMaterial({ color: 0xb4bec0, roughness: 0.42, metalness: 0.55 }),
      wood: new T.MeshLambertMaterial({ color: 0x6f4329 }),
      cream: new T.MeshLambertMaterial({ color: 0xf1e5c8 }),
      redStool: new T.MeshLambertMaterial({ color: 0xb83529 }),
      blueStool: new T.MeshLambertMaterial({ color: 0x256588 }),
      umbrellaA: new T.MeshLambertMaterial({ color: 0xb53c2e }),
      umbrellaB: new T.MeshLambertMaterial({ color: 0x286a7a }),
      umbrellaC: new T.MeshLambertMaterial({ color: 0xc98b2e }),
      pot: new T.MeshLambertMaterial({ color: 0x9b543a }),
      foliage: new T.MeshLambertMaterial({ color: 0x3b6e34 }),
      blossom: new T.MeshLambertMaterial({ color: 0xc73b66 }),
      glass: new T.MeshStandardMaterial({ color: 0xaed0d4, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.72 }),
      cord: new T.MeshBasicMaterial({ color: 0x2a2622 })
    };
    const lanternPalette = [0xd93a2b, 0xedb434, 0xd96b27, 0x2a8d82, 0xc74272];
    const lanternMats = lanternPalette.map(hex => {
      const m = new T.MeshStandardMaterial({ color: hex, roughness: 0.5, emissive: hex, emissiveIntensity: 0.22 });
      glowMats.push({ mat: m, base: 0.16, night: 2.4 });
      return m;
    });
    const bulbMat = new T.MeshStandardMaterial({ color: 0xfff3d4, roughness: 0.4, emissive: 0xffc870, emissiveIntensity: 0.25 });
    glowMats.push({ mat: bulbMat, base: 0.15, night: 3.1 });

    function ensureFrontMaterials(zone) {
      if (frontCache.has(zone.id)) return frontCache.get(zone.id);
      const keys = [];
      zone.shops.forEach((shop, i) => {
        const key = 'cfront_' + zone.id + '_' + i;
        if (!materialMap[key]) materialMap[key] = paintShopfrontTexture(T, zone, shop, renderer);
        keys.push(key);
      });
      frontCache.set(zone.id, keys);
      return keys;
    }

    function addPart(parent, g, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
      const mesh = new T.Mesh(g, m);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    // Build a Vietnamese sidewalk specialty food/coffee stall (quán vỉa hè) with low tables & plastic stools
    function buildStall(zone, label, seed) {
      const g = new T.Group();
      const awningMat = [mat.umbrellaA, mat.umbrellaB, mat.umbrellaC][seed % 3];
      const stoolMat = seed % 2 ? mat.blueStool : mat.redStool;

      // Stainless steel / timber food cart counter
      addPart(g, geo.box, zone.heritageWood ? mat.wood : mat.steel, -0.75, 0.46, 0, 1.35, 0.86, 0.68);
      // Glass display top (tủ kính)
      addPart(g, geo.box, mat.glass, -0.75, 1.24, 0, 1.28, 0.68, 0.60);
      // Roof frame poles & sloped awning canopy
      for (const px of [-1.42, -0.08]) for (const pz of [-0.32, 0.32]) {
        addPart(g, geo.cyl, mat.steel, px, 1.54, pz, 0.025, 1.28, 0.025);
      }
      addPart(g, geo.box, awningMat, -0.75, 2.22, 0.06, 1.85, 0.09, 1.18, 0.14);
      // Glowing warm stall light bulb under awning
      addPart(g, geo.sphere, bulbMat, -0.75, 2.02, 0.18, 0.09, 0.09, 0.09);

      // Vietnamese signboard on front & back of stall canopy
      const sKey = zone.id + ':' + label;
      let signMat = signCache.get(sKey);
      if (!signMat) {
        signMat = new T.MeshBasicMaterial({ map: makeStallSignTexture(T, label, zone.signStyle.bg, zone.signStyle.fg) });
        signCache.set(sKey, signMat);
      }
      addPart(g, geo.plane, signMat, -0.75, 1.96, 0.56, 1.55, 0.36, 1);
      addPart(g, geo.plane, signMat, -0.75, 1.96, -0.45, 1.55, 0.36, 1, 0, Math.PI, 0);

      // Low table + 3 plastic stools (ghế nhựa vỉa hè) beside the cart
      addPart(g, geo.box, mat.steel, 0.95, 0.52, 0.05, 0.88, 0.05, 0.62);
      for (const lx of [0.58, 1.32]) for (const lz of [-0.20, 0.30]) {
        addPart(g, geo.cyl, mat.steel, lx, 0.26, lz, 0.022, 0.52, 0.022);
      }
      for (const [sx, sz] of [[0.95, -0.52], [0.95, 0.62], [1.62, 0.05]]) {
        addPart(g, geo.box, stoolMat, sx, 0.34, sz, 0.32, 0.06, 0.32);
        for (const dx of [-0.11, 0.11]) for (const dz of [-0.11, 0.11]) {
          addPart(g, geo.box, stoolMat, sx + dx, 0.17, sz + dz, 0.045, 0.33, 0.045);
        }
      }

      // Market umbrella (dù che nắng) shading the seating area
      addPart(g, geo.cyl, mat.steel, 1.18, 1.24, -0.05, 0.035, 2.45, 0.035);
      addPart(g, geo.cone, awningMat, 1.18, 2.52, -0.05, 1.35, 0.42, 1.35);

      // Potted bougainvillea / ornamental shrub beside the stall
      addPart(g, geo.cyl, mat.pot, -1.78, 0.24, 0.15, 0.26, 0.48, 0.22);
      addPart(g, geo.sphere, mat.foliage, -1.78, 0.78, 0.15, 0.42, 0.46, 0.42);
      addPart(g, geo.sphere, mat.blossom, -1.66, 0.94, 0.26, 0.22, 0.20, 0.22);
      addPart(g, geo.sphere, mat.blossom, -1.90, 0.88, 0.04, 0.20, 0.18, 0.20);
      return g;
    }

    // Build a Hội An / Huế / Đà Lạt silk lantern string slung between two roadside timber posts
    function buildLanternGarland(span, seed) {
      const g = new T.Group();
      const half = span / 2;
      for (const s of [-1, 1]) {
        addPart(g, geo.cyl, mat.wood, s * half, 2.1, 0, 0.06, 4.2, 0.06);
      }
      const count = Math.max(4, Math.min(7, Math.round(span / 1.15)));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const x = -half + t * span;
        const sag = 0.55 * 4 * t * (1 - t);
        const y = 3.9 - sag;
        const lm = lanternMats[(seed + i) % lanternMats.length];
        addPart(g, geo.cyl, mat.cord, x, y + 0.20, 0, 0.014, 0.30, 0.014);
        addPart(g, geo.sphere, lm, x, y - 0.06, 0, 0.26, 0.33, 0.26);
        addPart(g, geo.cyl, mat.wood, x, y + 0.22, 0, 0.09, 0.05, 0.09);
        addPart(g, geo.cyl, mat.wood, x, y - 0.36, 0, 0.07, 0.06, 0.07);
      }
      return g;
    }

    // Build an across-the-street overhead Hội An / Huế silk lantern arch (`y = 5.1..5.7m`, safely above traffic!)
    function buildOverheadLanternSpan(span, seed) {
      const g = new T.Group();
      const half = span / 2;
      for (const s of [-1, 1]) {
        addPart(g, geo.cyl, mat.wood, s * half, 2.85, 0, 0.07, 5.7, 0.07);
      }
      const count = Math.max(5, Math.min(9, Math.round(span / 1.15)));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const x = -half + t * span;
        const sag = 0.65 * 4 * t * (1 - t);
        const y = 5.65 - sag;
        const lm = lanternMats[(seed + i) % lanternMats.length];
        addPart(g, geo.cyl, mat.cord, x, y + 0.16, 0, 0.014, 0.28, 0.014);
        addPart(g, geo.sphere, lm, x, y - 0.08, 0, 0.25, 0.32, 0.25);
        addPart(g, geo.cyl, mat.wood, x, y + 0.19, 0, 0.085, 0.045, 0.085);
        addPart(g, geo.cyl, mat.wood, x, y - 0.37, 0, 0.065, 0.06, 0.065);
      }
      return g;
    }

    function getShopSignMaterial(zone, shop) {
      const sKey = 'shopSign:' + zone.id + ':' + shop.title;
      let signMat = signCache.get(sKey);
      if (!signMat) {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 160;
        const ctx = c.getContext('2d');
        const st = zone.signStyle;
        ctx.fillStyle = shop.accent || st.bg;
        ctx.fillRect(0, 0, 512, 160);
        ctx.strokeStyle = st.trim; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 500, 148);
        ctx.fillStyle = st.fg; ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(shop.title, 256, 62, 470);
        ctx.fillStyle = 'rgba(255,244,218,0.92)'; ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText(shop.sub, 256, 118, 464);
        const tex = new T.CanvasTexture(c);
        tex.colorSpace = T.SRGBColorSpace;
        signMat = new T.MeshStandardMaterial({
          map: tex, roughness: 0.6,
          emissiveMap: tex, emissive: new T.Color(0xffffff), emissiveIntensity: 0.14
        });
        glowMats.push({ mat: signMat, base: 0.10, night: 0.78 });
        signCache.set(sKey, signMat);
      }
      return signMat;
    }

    // Build a free-standing roadside shop signboard (biển hiệu đứng / biển vẫy quán đặc sản)
    function buildRoadsideSign(zone, shop, seed) {
      const g = new T.Group();
      const signMat = getShopSignMaterial(zone, shop);
      for (const px of [-1.05, 1.05]) addPart(g, geo.cyl, mat.steel, px, 1.55, 0, 0.045, 3.1, 0.045);
      addPart(g, geo.box, mat.wood, 0, 2.75, 0, 2.52, 0.86, 0.14);
      addPart(g, geo.plane, signMat, 0, 2.75, 0.075, 2.42, 0.76, 1);
      addPart(g, geo.plane, signMat, 0, 2.75, -0.075, 2.42, 0.76, 1, 0, Math.PI, 0);
      if (zone.lanterns) {
        for (const px of [-0.75, 0.75]) {
          addPart(g, geo.sphere, lanternMats[(seed + (px > 0 ? 1 : 0)) % lanternMats.length], px, 2.12, 0, 0.18, 0.23, 0.18);
        }
      }
      return g;
    }

    // Mount authentic regional Vietnamese shopfront signboards, under-awning silk lanterns,
    // and potted bougainvillea directly onto surveyed OSM shophouse facades from tour-district.js!
    function decorateDistrictFronts(fronts, clearFn) {
      if (!fronts || !fronts.length) return;
      const nearest = fronts
        .filter(f => f.zone && f.half >= 1.35 && Math.hypot(f.x, f.z) <= 155)
        .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
      const mounted = [];
      let count = 0;
      for (const f of nearest) {
        if (count >= 26) break;
        if (mounted.some(p => Math.hypot(p.x - f.x, p.z - f.z) < 5.5)) continue;
        const zone = f.zone;
        const shop = zone.shops[f.seed % zone.shops.length];
        const signMat = getShopSignMaterial(zone, shop);
        const w = Math.min(f.half * 1.72, 4.2);
        const h = Math.min(0.84, Math.max(0.58, w * 0.24));
        const yaw = Math.atan2(f.nx, f.nz);
        const g = new T.Group();
        // Backlit signboard mounted cleanly flush above the awning (or on the 2nd-floor balcony fascia when present!)
        const hasBalcony = f.h >= 6.4 && f.seed % 4 !== 0;
        const sy = hasBalcony ? 3.68 : Math.min(f.h - h * 0.55, f.top + 0.54);
        const sz = hasBalcony ? 0.94 : 0.14;
        if (sy > f.top + 0.18) {
          addPart(g, geo.box, mat.wood, 0, sy, sz, w + 0.14, h + 0.10, 0.10);
          addPart(g, geo.plane, signMat, 0, sy, sz + 0.055, w, h, 1);
        }
        // Hanging glowing silk lanterns under Hội An / Huế / Đà Lạt shop awnings
        if (zone.lanterns) {
          const lx = Math.min(f.half * 0.62, 1.45);
          for (const side of [-1, 1]) {
            const lm = lanternMats[(f.seed + (side > 0 ? 2 : 0)) % lanternMats.length];
            addPart(g, geo.cyl, mat.cord, side * lx, f.top - 0.08, 0.52, 0.012, 0.24, 0.012);
            addPart(g, geo.sphere, lm, side * lx, f.top - 0.34, 0.52, 0.21, 0.27, 0.21);
          }
        }
        // Potted bougainvillea beside the doorway if sidewalk space is clear
        if (f.seed % 3 === 0) {
          const px = f.x + f.nx * 0.72 + f.nz * (f.half * 0.78);
          const pz = f.z + f.nz * 0.72 - f.nx * (f.half * 0.78);
          if (clearFn(px, pz, 0.45)) {
            addPart(g, geo.cyl, mat.pot, f.half * 0.78, 0.24, 0.72, 0.24, 0.46, 0.22);
            addPart(g, geo.sphere, mat.foliage, f.half * 0.78, 0.76, 0.72, 0.38, 0.44, 0.38);
            addPart(g, geo.sphere, mat.blossom, f.half * 0.78 + 0.10, 0.94, 0.78, 0.22, 0.20, 0.22);
          }
        }
        g.position.set(f.x, f.y, f.z);
        g.rotation.y = yaw;
        root.add(g);
        mounted.push({ x: f.x, z: f.z });
        count++;
      }
    }

    function clearProps() {
      while (root.children.length) root.remove(root.children[0]);
    }

    function place(graph, cx, cz, segments, clearFn, groundFn, districtFronts = null, osmPlaces = null) {
      clearProps();
      if (!graph) return;
      const [lon, lat] = graph.geo(cx, cz);
      const zone = zoneAt(lon, lat);
      if (!zone) return;

      // 1. Mount authentic regional Vietnamese shopfront signboards & lanterns onto real OSM shophouses
      decorateDistrictFronts(districtFronts, clearFn);

      // Boost priority of street segments close to real OSM cafes & markets
      const hotSpots = (osmPlaces || [])
        .filter(p => p.kind === 'cafe' || p.kind === 'market')
        .map(p => ({ x: p.x - cx, z: p.z - cz }));

      // Sort nearest segments first (with cafe/market amenity bonus)
      const nearby = segments
        .filter(s => s.len >= 7 && !s.graded && !/^(motorway|trunk)/.test(s.kind))
        .map(s => {
          const mx = (s.ax + s.bx) * 0.5, mz = (s.az + s.bz) * 0.5;
          const dist = Math.hypot(mx, mz);
          const nearCafe = hotSpots.some(h => Math.hypot(h.x - mx, h.z - mz) < 45);
          return { s, dist, rank: dist - (nearCafe ? 35 : 0) };
        })
        .filter(item => item.dist <= 200)
        .sort((a, b) => a.rank - b.rank);

      const placed = [];
      let stallCount = 0;
      let overheadCount = 0;
      let garlandCount = 0;
      let signCount = 0;
      const maxStalls = 14;
      const maxOverhead = (zone.id === 'hoi-an' || zone.id === 'hue') ? 10 : 0;
      const maxGarlands = zone.lanterns ? 10 : 0;
      const maxSigns = 8;

      // 2. String overhead silk lantern canopies right across narrow Hội An & Huế Old Town streets!
      if (maxOverhead > 0) {
        for (const { s } of nearby) {
          if (overheadCount >= maxOverhead) break;
          if (s.w > 4.8 || s.len < 10) continue;
          const step = Math.max(18, s.len * 0.5);
          for (let d = 5; d < s.len - 5 && overheadCount < maxOverhead; d += step) {
            const cxRoad = s.ax + s.fx * d, czRoad = s.az + s.fz * d;
            if (Math.hypot(cxRoad, czRoad) > 155) continue;
            if (placed.some(p => Math.hypot(p.x - cxRoad, p.z - czRoad) < 16)) continue;
            const halfSpan = s.w + 1.35;
            const lx = cxRoad - s.nx * halfSpan, lz = czRoad - s.nz * halfSpan;
            const rx = cxRoad + s.nx * halfSpan, rz = czRoad + s.nz * halfSpan;
            if (!clearFn(lx, lz, 0.35) || !clearFn(rx, rz, 0.35)) continue;
            const wy = groundFn(cxRoad + cx, czRoad + cz);
            const hash = (s.seed ^ Math.imul(Math.round(d) + 31, 73856093)) >>> 0;
            const spanArch = buildOverheadLanternSpan(halfSpan * 2, hash);
            spanArch.position.set(cxRoad, wy, czRoad);
            // Local +X runs across the road along (s.nx, s.nz)
            spanArch.rotation.y = Math.atan2(-s.nz, s.nx);
            root.add(spanArch);
            placed.push({ x: cxRoad, z: czRoad });
            overheadCount++;
          }
        }
      }

      // 3. Place specialty sidewalk food/coffee stalls, plastic stools, umbrellas & projecting shop signs
      for (const { s } of nearby) {
        if (stallCount >= maxStalls && garlandCount >= maxGarlands && signCount >= maxSigns) break;
        const step = Math.max(13, Math.min(26, s.len * 0.45));
        for (let d = 3.5 + (s.seed % 5); d < s.len - 3.5; d += step) {
          for (const side of [-1, 1]) {
            const hash = (s.seed ^ Math.imul(Math.round(d) + 17, side > 0 ? 73856093 : 19349663)) >>> 0;
            const offset = s.w + 2.15;
            const x = s.ax + s.fx * d + side * s.nx * offset;
            const z = s.az + s.fz * d + side * s.nz * offset;
            if (Math.hypot(x, z) > 190) continue;
            if (placed.some(p => Math.hypot(p.x - x, p.z - z) < 12.5)) continue;
            if (!clearFn(x, z, 1.45)) continue;

            const wy = groundFn(x + cx, z + cz);
            const faceRoadYaw = Math.atan2(-s.nx * side, -s.nz * side);
            const pick = hash % 5;

            if (zone.lanterns && garlandCount < maxGarlands && pick === 0 && s.len >= 8) {
              if (!clearFn(x + s.fx * 2.5, z + s.fz * 2.5, 0.45) || !clearFn(x - s.fx * 2.5, z - s.fz * 2.5, 0.45)) continue;
              const garland = buildLanternGarland(5.4, hash);
              garland.position.set(x, wy, z);
              garland.rotation.y = Math.atan2(-s.fz, s.fx);
              root.add(garland);
              placed.push({ x, z });
              garlandCount++;
            } else if (signCount < maxSigns && pick === 1) {
              const shop = zone.shops[hash % zone.shops.length];
              const board = buildRoadsideSign(zone, shop, hash);
              board.position.set(x, wy, z);
              board.rotation.y = Math.atan2(s.fx, s.fz);
              root.add(board);
              placed.push({ x, z });
              signCount++;
            } else if (stallCount < maxStalls) {
              if (!clearFn(x + s.fx * 1.2, z + s.fz * 1.2, 0.65) || !clearFn(x - s.fx * 1.2, z - s.fz * 1.2, 0.65)) continue;
              const label = zone.stalls[hash % zone.stalls.length];
              const stall = buildStall(zone, label, hash);
              stall.position.set(x, wy, z);
              stall.rotation.y = faceRoadYaw;
              root.add(stall);
              placed.push({ x, z });
              stallCount++;
            }
            if (stallCount >= maxStalls && garlandCount >= maxGarlands && signCount >= maxSigns) break;
          }
          if (stallCount >= maxStalls && garlandCount >= maxGarlands && signCount >= maxSigns) break;
        }
      }
    }

    function update(lampLevel) {
      const k = Math.max(0, Math.min(1, lampLevel || 0));
      for (const item of glowMats) {
        item.mat.emissiveIntensity = item.base + k * item.night;
      }
    }

    function themeAt(graph, wx, wz) {
      if (!graph) return null;
      const [lon, lat] = graph.geo(wx, wz);
      const zone = zoneAt(lon, lat);
      if (!zone) return null;
      return {
        zone,
        frontKeys: ensureFrontMaterials(zone)
      };
    }

    return { themeAt, place, update, zoneAt };
  }

  window.CentralStreetscapes = { create, zoneAt };
})();
