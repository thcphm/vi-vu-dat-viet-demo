'use strict';

const pedestrianWardrobe = [
  ['hust-tee', 'hust-jacket'],
  ['fox-cosplayer', 'witch-cosplayer']
];

// One draw per pedestrian. Each row occupies a tenth of [0, 1); the remaining share is ordinary walkers.
function choosePedestrianModel(roll, ordinary) {
  const slot = roll * 10;
  const group = Math.floor(slot);
  const styles = pedestrianWardrobe[group];
  return styles ? styles[Math.floor((slot - group) * styles.length)] : ordinary;
}

function pathPedestrianModel(seed, station) {
  // Mix independently of the density roll that decided whether this path is occupied.
  let bits = seed ^ Math.imul(station + 1, 0x9e3779b1);
  bits = Math.imul(bits ^ (bits >>> 16), 0x85ebca6b);
  bits = Math.imul(bits ^ (bits >>> 13), 0xc2b2ae35);
  bits = (bits ^ (bits >>> 16)) >>> 0;
  return choosePedestrianModel(bits / 4294967296, bits % 3 === 1 ? 'hiker' : 'casual-walker');
}
