(() => {
  const coverIds = ['tri-an', 'hai-van', 'ma-pi-leng', 'prenn'];
  const featured = globalThis.VietRouteData.map(route => ({...route, drive: route.id}));
  const seen = new Set(featured.map(route => route.id));
  const passes = globalThis.VietPassData.filter(route => !seen.has(route.id));
  const all = [...featured, ...passes].map(route => {
    const cover = coverIds.includes(route.id);
    const image = cover ? 'assets/routes/' + route.id + '.webp' : 'assets/routes/traces/' + route.id + '.webp';
    return {...route, image, thumb: cover ? image.replace('.webp', '-thumb.webp') : image,
      mapPreview: !cover, code: route.province,
      level: route.drive ? 'Có dẫn đường' : 'Khám phá đèo'};
  });
  const highlights = [...coverIds, 'bach-khoa-ho-guom', 'ky-dai-thien-mu', 'chua-ong-cai-rang'];
  const local = all.find(route => route.province === 'Đồng Nai' && route.id !== 'tri-an');
  if (local) highlights.splice(4, 0, local.id);
  const order = id => { const n = highlights.indexOf(id); return n < 0 ? highlights.length : n; };
  globalThis.VietDrivingRoutes = all.sort((a, b) =>
    order(a.id) - order(b.id) || a.province.localeCompare(b.province, 'vi') || a.name.localeCompare(b.name, 'vi'));
})();
