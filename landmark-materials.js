'use strict';

// A byte per baked vertex identifies the actual finish of each stamped part.
// The scan packs neutral plaster, cut stone and timber grain in RGB. Sampling
// them together keeps differently finished surfaces in the existing draw call.
const landmarkFinish = Object.freeze({
  plain: 0, plaster: 1, stone: 2, timber: 3, tile: 4, glazedTile: 5,
  thatch: 6, brick: 7, metal: 8, glass: 9
});
let landmarkGrain;
function createLandmarkMaterial(T, id, stainStrength) {
  if (!landmarkGrain) {
    landmarkGrain = new T.TextureLoader().load('streetscape/surfaces/landmark-grain.webp');
    landmarkGrain.wrapS = landmarkGrain.wrapT = T.RepeatWrapping;
    landmarkGrain.anisotropy = 4;
    landmarkGrain.userData.sightShared = true;
  }
  const material = new T.MeshStandardMaterial({
    map: landmarkGrain, vertexColors: true,
    roughness: id === 'coal' ? .23 : .87, metalness: id === 'coal' ? .38 : 0
  });
  material.customProgramCacheKey = () => 'landmark-scan-v1';
  material.onBeforeCompile = shader => {
    shader.uniforms.landmarkWeathering = {value: stainStrength};
    shader.vertexShader = 'attribute float finishKind; varying float surfaceKind;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n surfaceKind=finishKind;');
    shader.fragmentShader = 'varying float surfaceKind; uniform float landmarkWeathering;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', `
        float kind = floor(surfaceKind+.5);
        vec2 m = vMapUv;
        vec3 grain = texture2D(map, m * .48).rgb - .5;
        float height = grain.r * .0025;
        float patina = grain.r * landmarkWeathering;
        float surfaceRough = roughness, surfaceMetal = metalness;
        if (kind == 1.) {
          patina += grain.r * .37;
          height = grain.r * .005;
          surfaceRough = .87 + grain.r * .12;
        } else if (kind == 2. || kind == 7.) {
          patina += grain.g * .44;
          height = grain.g * .007;
          surfaceRough = .88 + grain.g * .15;
          if (kind == 7.) {
            vec2 course = m / vec2(.30,.088);
            vec2 aa = max(fwidth(course), vec2(.002));
            course.x += .5 * mod(floor(course.y), 2.);
            vec2 edges = min(fract(course), 1. - fract(course));
            vec2 body = smoothstep(vec2(.012)-aa*.5, vec2(.04)+aa*.5, edges);
            float seam = (1.-body.x*body.y) * (1.-smoothstep(.22,.86,max(aa.x,aa.y)));
            patina -= seam * .25;
            height -= seam * .004;
          }
        } else if (kind == 3.) {
          patina = grain.b * .60;
          surfaceRough = .63 + grain.b * .20;
          height = grain.b * .002;
        } else if (kind == 4. || kind == 5.) {
          vec2 tile = m / vec2(.205,.275);
          vec2 aa = fwidth(tile);
          float detail = 1.-smoothstep(.19,.76,max(aa.x,aa.y));
          float roll = .5+.5*cos(6.2831853*tile.x);
          float lap = smoothstep(.68,.97,fract(tile.y));
          float mottling = texture2D(map, (floor(tile)+.5)/37.).g-.5;
          patina = grain.r*.20 + detail*(.32*mottling + .15*(roll-.5) - .13*lap);
          height = grain.r*.001 + detail*(.026*roll - .009*lap);
          surfaceRough = (kind == 5. ? .35 : .78) + grain.r*.17;
        } else if (kind == 6.) {
          float blade = m.x*113.+2.*sin(m.y*3.1);
          float fibre = sin(blade)*(1.-smoothstep(.5,3.,fwidth(blade)));
          patina = grain.b*.52 + fibre*.085;
          height = grain.b*.005 + fibre*.0014;
          surfaceRough = .97;
        } else if (kind == 8.) {
          surfaceMetal = .62;
          surfaceRough = .45+grain.r*.17;
          height = grain.r*.0008;
        } else if (kind == 9.) {
          surfaceMetal = .26;
          surfaceRough = .17;
          patina = grain.r*.045;
          height = 0.;
        }
        diffuseColor.rgb *= 1.+patina;
      `)
      .replace('#include <roughnessmap_fragment>', '#define roughness surfaceRough\n#include <roughnessmap_fragment>\n#undef roughness')
      .replace('#include <metalnessmap_fragment>', '#define metalness surfaceMetal\n#include <metalnessmap_fragment>\n#undef metalness')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 dx=dFdx(-vViewPosition), dy=dFdy(-vViewPosition);
        vec3 across=cross(dy,normal), along=cross(normal,dx);
        float area=dot(dx,across);
        normal=normalize(normal - sign(area)*(across*dFdx(height)+along*dFdy(height))/max(abs(area),1.e-9));
      `);
  };
  return material;
}
