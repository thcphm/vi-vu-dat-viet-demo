import '../drive-input.js';

export function tripURL(route, car, mode, sound, base = location.href) {
  const url = new URL('../index.html', base);
  if (route.id === 'atlas-pin') {
    url.searchParams.set('pin', route.lat.toFixed(5) + ',' + route.lon.toFixed(5));
    url.searchParams.set('label', route.name.slice(0, 90));
  } else if (route.drive) {
    url.searchParams.set('drive', route.drive);
  } else {
    url.searchParams.set('pass', route.pass);
  }
  url.searchParams.set('edition', route.id);
  url.searchParams.set('vehicle', car.id);
  url.searchParams.set('practice', mode);
  url.searchParams.set('sound', sound ? '1' : '0');
  url.searchParams.set('camera', globalThis.DriveView.current());
  return url;
}

export function startTrip(route, car, mode, sound) {
  location.assign(tripURL(route, car, mode, sound).href);
}
