// The shared look (spec §10.6 items 2-6, P24-7 step 3), ported from the style test's
// look.js (farmgame-style-test, source/src/look.js) in place of the slice's world-space hull:
// - toon bands instead of facets (item 3): one material, half-Lambert into three bands
//   (shade, base, light) with anti-aliased edges; organic forms are smooth-normalled, built
//   edges may stay flat (`flatShading`);
// - constant-width ink (item 2): an inverted hull pushed out in clip space, about 2 CSS px with
//   ±20% low-frequency variation along edges, clamped to [1 device px, 3 CSS px];
// - soft ink-blue shadows (item 4): in cast shadow the colour mixes 30% toward ink #253347,
//   never black; a soft contact blob under characters and props so nothing floats;
// - paper (item 5): screen-space grain and fibre on the ground and the full-screen paper sky,
//   never on the DOM UI;
// - palette discipline (item 6): base colours are the §10.3 swatches plus low-saturation
//   companions; sparse diagonal hatching only in the shade band of big forms (§10.3).
// Differences from the style test: one set of shared uniforms (device pixel ratio, drawing
// buffer size, outline width) for every material, kept on clones; an opacity uniform so the
// tree fade, ghost outlines and reduced-motion unit fades keep working; a flat-shaded variant.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// spec §10.3 review swatches, plus companions the swatches do not name (skin, hair, bark, soil)
export const PAL = {
  paper: 0xfff7e5, ink: 0x253347, cap: 0x263853, denim: 0x426b91, shirt: 0xf4eddc,
  tool: 0x2864bd, cream: 0xf1deb5, red: 0xb53e36, charcoal: 0x3d434b, wood: 0x8d603e,
  stone: 0x969895, leaf: 0x527447, flower: 0xe6b83e,
  ground: 0xf3ead0, skin: 0xe2b48f, hair: 0x4a2f22, flipflop: 0x8a6a4f, bark: 0x6f4a32,
  leafLight: 0x6b8a52, woodLight: 0xa77a52, mouth: 0x8c3b33, soil: 0x6b4a33,
  corn: 0xe8c547, tomato: 0xc8463b, coin: 0xd9a93a,
};

export const LOOK = {
  outlinePx: 2.0, // CSS px (item 2)
  shadowInk: 0.3, // cast-shadow ink mix (item 4: 25-35%)
  shadeInk: 0.26, // form-shade band ink mix
  lightPaper: 0.1, // top light band toward paper
  outline: true, // URL ?outline=0 turns the ink off (main.js)
};

// one set for every look material, so a resize or DPR change is a single write
export const SHARED = {
  uDpr: { value: 1 },
  uRes: { value: new THREE.Vector2(1, 1) }, // drawing buffer, device px
  uWidth: { value: LOOK.outlinePx },
  // the opening's page (world/opening.js): every toon surface above uInkY metres is drawn in its
  // outline look (paper inside the ink line, no cast shadow) whatever its colour state, so the
  // finished farm reads as the drawing; raising the front is the §10.9 wash, rising from the
  // ground. INK_OFF (the default) costs nothing. Vanessa has her own front (ownInkFront).
  uInkY: { value: 1e4 },
};
export const INK_OFF = 1e4;
export const INK_ALL = -10;
// y: the wash front in metres; INK_OFF for none in ink, INK_ALL for everything
export function setInkFront(y, u = SHARED.uInkY) { u.value = Math.min(INK_OFF, y); }
// give the toon materials under root their own front (Vanessa fills with colour after the farm)
export function ownInkFront(root) {
  const u = { value: INK_OFF };
  root.traverse((m) => {
    const mat = m.material;
    if (mat && !Array.isArray(mat) && mat.uniforms?.uInkY) mat.uniforms.uInkY = u;
  });
  return u;
}
export function setLookResolution(renderer) {
  renderer.getDrawingBufferSize(SHARED.uRes.value);
  SHARED.uDpr.value = renderer.getPixelRatio();
}

const NOISE_GLSL = /* glsl */`
float st_hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float st_noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(st_hash(i), st_hash(i+vec2(1,0)), u.x), mix(st_hash(i+vec2(0,1)), st_hash(i+vec2(1,1)), u.x), u.y); }
`;

// ---------------- toon material ----------------
const TOON_VS = /* glsl */`
#include <common>
#include <color_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vWorldPos;
#ifdef GRAVEL
attribute float gravelEdge; // metres from the surface's edge (0 on it)
varying float vGravelEdge;
#endif
void main() {
  #ifdef GRAVEL
  vGravelEdge = gravelEdge;
  #endif
  #include <color_vertex>
  #include <morphcolor_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  vNormalV = normalize(transformedNormal);
  vViewPos = -mvPosition.xyz;
  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
}
`;

const TOON_FS = /* glsl */`
uniform vec3 uColor;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform float uShadeInk;
uniform float uShadowInk;
uniform float uLightPaper;
uniform float uHatch;
uniform float uGrain;
uniform float uFlat;
uniform float uNoLight;
uniform float uDpr;
uniform float uOpacity;
// the colour-reveal rule (spec v0.9 §10.9, P25-1): one colour amount per material, blended from
// the paper tone to the swatch behind the unchanged ink line, so no second model is needed.
// uColour 0 is the outline look (paper inside the ink line), 1 the full colour. The wash front
// uWashY rises over the wash coordinate: height (upward from the ground) plus, for flat things,
// the distance from uWashC (outward from where Vanessa worked).
uniform float uColour;
uniform float uWashY;
uniform float uWashSoft;
uniform float uWashRadial;
uniform vec2 uWashC;
uniform vec3 uPaperFill;
uniform float uInkY;
#ifdef GRAVEL
// v0.20 gravel (gravelMaterial below): pebbles drawn on the ground, in world space
#define GRAVEL_M 0.09
uniform vec3 uGravelDark;
varying float vGravelEdge;
#endif
#ifdef GRASS
// the finale (P25-2): the ground animates into grass, spreading from Vanessa's feet
uniform vec2 uGrassC;
uniform float uGrassR;
uniform vec3 uGrassCol;
uniform vec3 uGrassInk;
#endif
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vWorldPos;
#include <common>
#include <packing>
#include <color_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
${NOISE_GLSL}
float st_seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
void main() {
  vec3 base = uColor;
  #ifdef GRAVEL
  {
    // Pebbles: one rounded stone per cell of a jittered grid (the nearest and second-nearest
    // cell points give each stone its outline), GRAVEL_M metres apart. Each stone has its own
    // grey, a few are warm or pale, and the joints between them are darker. Far away (the whole
    // drawing in the finale and the credits) the stones are smaller than a pixel, so the pattern
    // fades to its mean grey with a soft mottle instead of shimmering. Along the surface's edge
    // whole stones drop out, so the gravel ends in a loose scatter and no straight line.
    vec2 gp = vWorldPos.xz / GRAVEL_M;
    vec2 gi = floor(gp);
    vec2 gf = gp - gi;
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    for (int gy = -1; gy <= 1; gy++) {
      for (int gx = -1; gx <= 1; gx++) {
        vec2 o = vec2(float(gx), float(gy));
        vec2 r = o + 0.14 + 0.72 * vec2(st_hash(gi + o), st_hash(gi + o + 31.7)) - gf;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = st_hash(gi + o + 9.3); } else if (d < d2) { d2 = d; }
      }
    }
    if (vGravelEdge < 0.03 + 0.1 * id) discard;
    float joint = 1.0 - smoothstep(0.03, 0.17, sqrt(d2) - sqrt(d1));
    float detail = 1.0 - smoothstep(0.55, 1.15, length(fwidth(gp)));
    vec3 stone = base * (0.88 + 0.22 * id);
    stone = mix(stone, stone * vec3(1.06, 1.0, 0.9), step(0.82, id));   // a warm stone now and then
    stone = mix(stone, mix(stone, uPaper, 0.35), step(id, 0.12));       // and a pale one
    stone *= 0.97 + 0.06 * smoothstep(0.0, 0.5, sqrt(d1));              // a touch of roundness
    vec3 far = base * (0.9 + 0.07 * st_noise(vWorldPos.xz * 2.3) + 0.08 * st_noise(vWorldPos.xz * 11.0));
    base = mix(far, mix(stone, uGravelDark, joint * 0.62), detail);
  }
  #endif
  #ifdef GRASS
    float gd = 1e4;
    float gk = 0.0;
    if (uGrassR > 0.0) { // paper during play: no cost until the finale
      gd = distance(vWorldPos.xz, uGrassC) + (st_noise(vWorldPos.xz * 0.7) - 0.5) * 1.6;
      gk = 1.0 - smoothstep(uGrassR - 1.2, uGrassR, gd);
      base = mix(base, uGrassCol, gk);
    }
  #endif
  #if defined(USE_COLOR_ALPHA)
    base *= vColor.rgb; // packed GLBs carry RGBA vertex colours
  #elif defined(USE_COLOR)
    base *= vColor;
  #endif
  #ifdef FLAT_SHADED
    vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  #else
    vec3 n = normalize(vNormalV);
    if (!gl_FrontFacing) n = -n;
  #endif
  vec3 L = directionalLights[0].direction;
  float lambert = dot(n, L) * 0.5 + 0.5; // half-Lambert: soft, never pitch black
  lambert = mix(lambert, 0.78, uFlat);   // ground and pads: evenly lit paper
  float shadow = getShadowMask();
  float inked = 0.0; // the opening's page: ink on paper above the wash front, no cast shadow
  if (uInkY < 5000.0) {
    float wy = vWorldPos.y + (st_noise(vWorldPos.xz * 7.0 + vWorldPos.y * 5.0) - 0.5) * 0.2;
    inked = smoothstep(uInkY - 0.25, uInkY, wy);
    shadow = mix(shadow, 1.0, inked);
  }
  // three bands: shade / base / light, with anti-aliased edges (item 3)
  float aa = max(fwidth(lambert), 0.004) * 1.2;
  float toShade = 1.0 - smoothstep(0.47 - aa, 0.47 + aa, lambert);
  float toLight = smoothstep(0.86 - aa, 0.86 + aa, lambert);
  vec3 col = base;
  col = mix(col, mix(base, uPaper, uLightPaper), toLight * shadow * (1.0 - uNoLight));
  col = mix(col, mix(base, uInk, uShadeInk), toShade);
  // cast shadows: soft ink-blue at about 30% (item 4), never black
  float inShadow = (1.0 - shadow) * (1.0 - toShade * 0.6);
  col = mix(col, uInk, uShadowInk * inShadow);
  // sparse hand hatching in the shade of big forms (§10.3)
  if (uHatch > 0.0) {
    vec2 fc = gl_FragCoord.xy / uDpr;
    float stripe = abs(fract((fc.x + fc.y) / 5.0) - 0.5) * 2.0;
    float line = 1.0 - smoothstep(0.18, 0.42, stripe);
    float patchy = smoothstep(0.45, 0.75, st_noise(fc / 26.0));
    float where = max(toShade, 1.0 - shadow);
    col = mix(col, uInk, line * patchy * where * 0.28 * uHatch);
  }
  #ifdef GRASS
  // sparse hand-drawn grass strokes grow in behind the front: two short blades in some cells
  if (gk > 0.0) {
    float cs = 0.55;
    vec2 cell = floor(vWorldPos.xz / cs);
    vec2 f = vWorldPos.xz - cell * cs;
    if (st_hash(cell) > 0.62) {
      float grow = clamp((uGrassR - 1.0 - gd) / 2.5, 0.0, 1.0);
      float len = 0.17 * grow;
      vec2 c0 = vec2(0.12 + 0.3 * st_hash(cell + 7.1), 0.24 + 0.24 * st_hash(cell + 3.3));
      float dd = min(st_seg(f, c0, c0 + vec2(-0.05, -len)), st_seg(f, c0 + vec2(0.035, 0.0), c0 + vec2(0.06, -len * 0.8)));
      float aa = max(fwidth(dd), 1e-4);
      float line = 1.0 - smoothstep(0.011 - aa, 0.011 + aa, dd);
      col = mix(col, uGrassInk, line * grow * 0.75 * step(0.001, len));
    }
  }
  #endif
  // the outline look and the colour wash (P25-1); the wash front is a little uneven, like a brush
  float ck = uColour * (1.0 - inked);
  if (uWashY < 5000.0) { // only while a wash is running: no cost to finished things (O25-5)
    float wc = vWorldPos.y + uWashRadial * distance(vWorldPos.xz, uWashC);
    wc += (st_noise(vWorldPos.xz * 7.0 + vWorldPos.y * 5.0) - 0.5) * uWashSoft * 0.8;
    ck *= 1.0 - smoothstep(uWashY - uWashSoft, uWashY, wc);
  }
  if (ck < 1.0) {
    vec3 paperFill = mix(uPaperFill, uInk, uShadowInk * (1.0 - shadow));
    col = mix(paperFill, col, ck);
  }
  // paper grain (item 5): low-contrast, screen space, so it reads as the drawing's paper; an
  // outline is the ground's own paper, so it takes the grain too
  float grain = max(uGrain, 1.0 - ck);
  if (grain > 0.0) {
    vec2 fc = gl_FragCoord.xy / uDpr;
    float g = st_noise(fc * 0.9) * 0.6 + st_noise(fc * 0.23) * 0.4;
    float fibre = st_noise(vec2(fc.x * 0.05, fc.y * 0.6));
    col *= 1.0 - grain * (g * 0.06 + fibre * 0.025);
  }
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}
`;

// keep the shared uniforms shared on every clone (the tree fade and unit fades clone materials)
function relink(m) {
  for (const k of ['uDpr', 'uRes', 'uWidth']) if (m.uniforms[k] && m.userData.sharedWidth !== false) m.uniforms[k] = SHARED[k];
  if (m.uniforms.uInkY) m.uniforms.uInkY = SHARED.uInkY;
  return m;
}

// A ShaderMaterial that answers `color` and `opacity` like the built-in materials, so the
// existing fades (`material.opacity = x`) and colour reads keep working.
export class ToonMaterial extends THREE.ShaderMaterial {
  get color() { return this.uniforms?.uColor?.value; }
  get opacity() { return this.uniforms?.uOpacity?.value ?? 1; }
  set opacity(v) { if (this.uniforms?.uOpacity) this.uniforms.uOpacity.value = v; }
  clone() { return relink(new this.constructor().copy(this)); }
}

const WASH_FULL = 1e4; // a wash front above everything: fully coloured
export function toonMaterial({ color = 0xffffff, vertexColors = false, hatch = 0, grain = 0, flat = 0, noLight = 0, flatShading = false, side = THREE.FrontSide, transparent = false, opacity = 1 } = {}) {
  const m = new ToonMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.lights, {
      uColor: { value: new THREE.Color(color) },
      uInk: { value: new THREE.Color(PAL.ink) },
      uPaper: { value: new THREE.Color(PAL.paper) },
      uShadeInk: { value: LOOK.shadeInk },
      uShadowInk: { value: LOOK.shadowInk },
      uLightPaper: { value: LOOK.lightPaper },
      uHatch: { value: hatch },
      uGrain: { value: grain },
      uFlat: { value: flat },
      uNoLight: { value: noLight },
      uDpr: { value: 1 },
      uOpacity: { value: opacity },
      uColour: { value: 1 },
      uWashY: { value: WASH_FULL },
      uWashSoft: { value: 0.25 },
      uWashRadial: { value: 0 },
      uWashC: { value: new THREE.Vector2() },
      uPaperFill: { value: new THREE.Color(PAL.ground) },
      uInkY: SHARED.uInkY,
    }]),
    vertexShader: TOON_VS,
    fragmentShader: TOON_FS,
    lights: true,
    vertexColors,
    side,
    transparent,
  });
  m.flatShading = flatShading; // read by the program cache (FLAT_SHADED); not a ShaderMaterial option
  m.userData.toon = true;
  return relink(m);
}

// cached toon materials by colour and options (static meshes share them)
const toonCache = new Map();
export function toon(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!toonCache.has(key)) toonCache.set(key, toonMaterial({ color, ...opts }));
  return toonCache.get(key);
}

// ---------------- screen-space ink outline (inverted hull) ----------------
// The hull is pushed out in clip space, so its width is a constant number of CSS pixels at
// any distance (item 2), with about ±20% low-frequency variation along long edges.
const INK_VS = /* glsl */`
#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
attribute vec3 inkNormal;
uniform float uWidth;
uniform float uScale;
uniform vec2 uRes;
uniform float uDpr;
${NOISE_GLSL}
void main() {
  vec3 objectNormal = inkNormal;
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vec3 transformedNormal = normalMatrix * objectNormal;
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vec4 clip = gl_Position;
  vec2 ns = (projectionMatrix * vec4(normalize(transformedNormal), 0.0)).xy;
  float len = length(ns);
  vec2 dir = len > 1e-5 ? ns / len : vec2(0.0);
  vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
  float vary = 1.0 + 0.2 * (st_noise(wp.xz * 1.7 + wp.y * 2.3) * 2.0 - 1.0);
  float px = clamp(uWidth * uScale * vary * uDpr, 1.0, 3.0 * uDpr);
  clip.xy += dir * px * 2.0 / uRes * clip.w;
  clip.z += 0.0004 * clip.w; // sit just behind the surface it outlines
  gl_Position = clip;
}
`;
const INK_FS = /* glsl */`
uniform vec3 uInk;
uniform float uOpacity;
void main() { gl_FragColor = vec4(uInk, uOpacity);
  #include <colorspace_fragment>
}
`;

class InkMaterial extends ToonMaterial {}
const inkMaterials = new Map();
function inkMaterial(scale = 1) {
  const key = scale.toFixed(2);
  if (!inkMaterials.has(key)) {
    const m = new InkMaterial({
      uniforms: {
        uWidth: SHARED.uWidth,
        uScale: { value: scale },
        uRes: SHARED.uRes,
        uDpr: SHARED.uDpr,
        uInk: { value: new THREE.Color(PAL.ink) },
        uOpacity: { value: 1 },
      },
      vertexShader: INK_VS,
      fragmentShader: INK_FS,
      side: THREE.BackSide,
    });
    m.userData.ink = true;
    inkMaterials.set(key, m);
  }
  return inkMaterials.get(key);
}

// Averaged normals per position, so hard-edged meshes (boxes, facets) get a closed hull.
export function addInkNormals(geo) {
  if (geo.attributes.inkNormal) return geo;
  const pos = geo.attributes.position;
  const key = (i) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
  const acc = new Map();
  const idx = geo.index;
  const tri = idx ? idx.count / 3 : pos.count / 3;
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const ab = new THREE.Vector3(); const ac = new THREE.Vector3();
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3; const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1; const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    const n = ab.subVectors(b, a).cross(ac.subVectors(c, a)); // area-weighted
    for (const i of [i0, i1, i2]) {
      const k = key(i);
      if (!acc.has(k)) acc.set(k, new THREE.Vector3());
      acc.get(k).add(n);
    }
  }
  const out = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const n = acc.get(key(i));
    if (n && n.lengthSq() > 0) v.copy(n).normalize(); else v.set(0, 1, 0);
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
  }
  geo.setAttribute('inkNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}

// Give every mesh under root an ink hull (skipping flagged, line and transparent ones). The
// hull is a child of its mesh, marked `outline` and `noFit` (measurement and unit counts skip it).
export function ink(root, scale = 1) {
  if (!LOOK.outline) return root;
  const meshes = [];
  root.traverse((m) => {
    if (m.isMesh && !m.userData.noOutline && !m.userData.outline && !(m.material && m.material.transparent) && !m.children.some((c) => c.userData.outline)) meshes.push(m);
  });
  for (const m of meshes) {
    addInkNormals(m.geometry);
    const mat = inkMaterial(m.userData.inkScale ?? scale);
    const hull = m.isSkinnedMesh ? new THREE.SkinnedMesh(m.geometry, mat) : new THREE.Mesh(m.geometry, mat);
    if (m.isSkinnedMesh) hull.bind(m.skeleton, m.bindMatrix);
    if (m.morphTargetInfluences) { hull.morphTargetInfluences = m.morphTargetInfluences; hull.morphTargetDictionary = m.morphTargetDictionary; }
    hull.userData.outline = true;
    hull.userData.noFit = true;
    hull.castShadow = false;
    hull.receiveShadow = false;
    hull.frustumCulled = m.frustumCulled;
    hull.raycast = () => {};
    m.add(hull);
  }
  return root;
}

export function smoothNormals(geo) {
  const g = geo.clone();
  g.deleteAttribute('normal');
  const merged = mergeVertices(g, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

// Soft contact blob so nothing floats, even with shadow maps off (item 4)
let blobTex = null;
export function contactBlob(radius) {
  if (!blobTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(37,51,71,0.32)');
    grd.addColorStop(0.6, 'rgba(37,51,71,0.16)');
    grd.addColorStop(1, 'rgba(37,51,71,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
    blobTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.name = 'contactBlob';
  m.userData.noOutline = true;
  m.userData.noFit = true;
  m.userData.keep = true;
  m.renderOrder = -1;
  m.raycast = () => {};
  return m;
}

// Full-screen paper backdrop (sky): paper colour plus the same grain, drawn first. In the finale
// (P25-2) the sky turns blue, rising from the horizon (`uHorizon`, the horizon's height on
// screen, 0 bottom to 1 top; `uSky` 0..1 the rise), and the grain stays over the colour.
export function paperBackdrop() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uPaper: { value: new THREE.Color(PAL.paper) }, uDpr: SHARED.uDpr,
      uSkyCol: { value: new THREE.Color(PAL.paper) }, uSky: { value: 0 }, uHorizon: { value: 0.5 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: /* glsl */`
      uniform vec3 uPaper; uniform float uDpr; uniform vec3 uSkyCol; uniform float uSky; uniform float uHorizon; varying vec2 vUv;
      ${NOISE_GLSL}
      void main(){
        vec2 fc = gl_FragCoord.xy / uDpr;
        float g = st_noise(fc * 0.9) * 0.6 + st_noise(fc * 0.23) * 0.4;
        float fibre = st_noise(vec2(fc.x * 0.05, fc.y * 0.6));
        float front = uHorizon - 0.02 + uSky * (1.12 - uHorizon);
        float edge = front + (st_noise(vec2(fc.x * 0.02, 3.0)) - 0.5) * 0.03;
        float sk = (1.0 - smoothstep(edge - 0.05, edge, vUv.y)) * step(0.0001, uSky);
        vec3 col = mix(uPaper, uSkyCol, sk) * (1.0 - (g * 0.06 + fibre * 0.025));
        col *= 1.0 - 0.05 * pow(length(vUv - 0.5) * 1.3, 2.0);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    depthWrite: false,
    depthTest: false,
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  q.name = 'PaperSky';
  q.frustumCulled = false;
  q.renderOrder = -10;
  q.userData.noOutline = true;
  q.userData.noFit = true;
  q.raycast = () => {};
  return q;
}

// v0.20 gravel (captain 2026-11-10: "The path is gray because it's like gravel ... we need to
// update the texture of both the path and the tree circle"): a flat, evenly lit grey surface
// covered in pebbles (the GRAVEL block of the toon shader). The pebbles are fixed to the ground,
// so the path and the circle round the tree, which overlap where the path comes in, are one
// continuous bed of gravel. The mesh needs a `gravelEdge` attribute: metres from its edge.
export const GRAVEL = { colour: 0xb9b8b1, joint: 0x6f7378 };
export function gravelMaterial() {
  const m = toonMaterial({ color: GRAVEL.colour, grain: 1, flat: 1, side: THREE.DoubleSide });
  m.defines = { ...(m.defines ?? {}), GRAVEL: '' };
  m.uniforms.uGravelDark = { value: new THREE.Color(GRAVEL.joint) };
  return m;
}

// The ground's paper (D24) with the finale's grass (P25-2): evenly lit, grained; the grass
// spreads from `uGrassC` (Vanessa's feet) out to radius `uGrassR` metres, with sparse
// hand-drawn strokes growing in behind the front. uGrassR 0: paper.
export function groundMaterial(grass, grassInk) {
  const m = toonMaterial({ color: PAL.ground, grain: 1, flat: 1 });
  m.defines = { ...(m.defines ?? {}), GRASS: '' };
  Object.assign(m.uniforms, {
    uGrassC: { value: new THREE.Vector2() },
    uGrassR: { value: 0 },
    uGrassCol: { value: new THREE.Color(grass) },
    uGrassInk: { value: new THREE.Color(grassInk) },
  });
  return m;
}

// ---------------- colour and fades per object (P25-1, P25-3) ----------------
// `paintable(root)`: the object's own copies of its toon and ink materials, sharing one set of
// colour, wash and opacity uniforms, so one write recolours or fades the whole object. Its
// other materials (lines, basic) fade with it. colour 0 is the outline look: paper inside the
// ink line, and no cast shadow.
const PAINT_KEYS = ['uColour', 'uWashY', 'uWashSoft', 'uWashRadial', 'uWashC', 'uOpacity'];
export function paintable(root, { colour = 1, radial = false, soft = 0.25 } = {}) {
  const u = {
    uColour: { value: colour }, uWashY: { value: WASH_FULL }, uWashSoft: { value: soft },
    uWashRadial: { value: radial ? 1 : 0 }, uWashC: { value: new THREE.Vector2() }, uOpacity: { value: 1 },
  };
  const toons = []; const others = []; const casts = [];
  root.traverse((m) => {
    if (!m.material || Array.isArray(m.material)) return;
    const c = m.material.clone();
    m.material = c;
    if (c.userData?.toon || c.userData?.ink) {
      for (const k of PAINT_KEYS) if (c.uniforms[k]) c.uniforms[k] = u[k];
      c.userData.opaque = !c.transparent;
      toons.push(c);
    } else {
      others.push({ mat: c, base: c.opacity ?? 1, opaque: !c.transparent });
    }
    if (m.isMesh && !m.userData.outline) casts.push([m, m.castShadow]);
  });
  const h = {
    root, u, radial, opacity: 1, colour,
    setColour(k) {
      h.colour = k;
      u.uColour.value = k;
      u.uWashY.value = WASH_FULL;
      for (const [m, cast] of casts) m.castShadow = cast && k > 0;
    },
    // a wash in progress: t 0 (paper) .. 1 (colour), over this object's own extent
    washRange(centre) {
      const box = new THREE.Box3().setFromObject(root);
      if (radial) {
        u.uWashC.value.set(centre?.x ?? (box.min.x + box.max.x) / 2, centre?.z ?? (box.min.z + box.max.z) / 2);
        const c = u.uWashC.value;
        const r = Math.max(...[box.min.x, box.max.x].flatMap((x) => [box.min.z, box.max.z].map((z) => Math.hypot(x - c.x, z - c.y))));
        h.range = [box.min.y - u.uWashSoft.value, box.max.y + r + u.uWashSoft.value * 2];
      } else {
        h.range = [box.min.y - u.uWashSoft.value, box.max.y + u.uWashSoft.value * 2];
      }
      return h.range;
    },
    setWash(t) {
      if (!h.range) h.washRange();
      h.colour = 1;
      u.uColour.value = 1;
      u.uWashY.value = t >= 1 ? WASH_FULL : h.range[0] + (h.range[1] - h.range[0]) * t;
      for (const [m, cast] of casts) m.castShadow = cast;
    },
    setOpacity(o) {
      if (o === h.opacity) return;
      h.opacity = o;
      u.uOpacity.value = o;
      for (const c of toons) c.transparent = o < 1 || !c.userData.opaque;
      for (const x of others) { x.mat.opacity = x.base * o; x.mat.transparent = o < 1 || !x.opaque; }
    },
  };
  h.setColour(colour);
  return h;
}

// `fader(root)`: own copies of every material under root, keeping each one's base opacity, so
// a blueprint ghost or outline can fade as one (P25-3: 200 ms; reduced motion 150 ms or less).
export function fader(root) {
  const mats = [];
  root.traverse((m) => {
    if (!m.material || Array.isArray(m.material)) return;
    m.material = m.material.clone();
    mats.push({ mat: m.material, base: m.material.opacity ?? 1, opaque: !m.material.transparent });
  });
  const f = {
    root, opacity: 1,
    setOpacity(o) {
      if (o === f.opacity) return;
      f.opacity = o;
      for (const x of mats) { x.mat.opacity = x.base * o; x.mat.transparent = o < 1 || !x.opaque; }
    },
  };
  return f;
}

// The sun light for this look: soft from the upper left, PCF shadows with a wide radius.
export function configureShadows(renderer, light) {
  renderer.shadowMap.type = THREE.PCFShadowMap;
  light.shadow.bias = -0.0006;
  light.shadow.normalBias = 0.02;
  light.shadow.radius = 5;
}
