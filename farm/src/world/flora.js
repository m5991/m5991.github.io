// Direction-C plants (spec §10.8, P24-7 pass 2), authored in code against the drawing's own
// marks and the §10.3 swatches, in the same hand as hand.js: corn D15 (stalk, arching
// creased leaves, tassel, husked cobs), sunflowers D16 (pointed petals round a dark seed disc,
// pointed-oval leaves), the removable weed clumps, and the raised bed's vegetables D19 (leafy
// greens, the E10 beet, the tomato plants, herb sprouts) with the Who-Knows plant (§10.5).
// Leaves are thin closed solids (a lens cross-section), so the ink hull outlines their edges and
// the toon bands stay smooth; round foliage uses hand.js's scalloped clumps. Every plant is one
// vertex-coloured mesh (one draw call plus its ink), and geometry is built once per variant.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, toon } from './look.js';
import { lumpy, mix, scallopedClump, taperTube } from './hand.js';

// low-saturation companions of the swatches (§10.6 item 6: the swatches plus light/shade steps)
export const FLORA = {
  stalk: mix(PAL.leaf, PAL.ink, 0.12),
  leaf: PAL.leaf,
  leafLight: PAL.leafLight,
  leafDark: mix(PAL.leaf, PAL.ink, 0.32),
  tassel: mix(PAL.flower, PAL.wood, 0.4),
  silk: mix(PAL.flower, PAL.wood, 0.6),
  husk: mix(PAL.leafLight, PAL.flower, 0.22),
  seed: mix(PAL.wood, PAL.ink, 0.5),
  petalDeep: mix(PAL.flower, PAL.wood, 0.14),
  weed: mix(PAL.leaf, PAL.wood, 0.22),
  weedDark: mix(PAL.leaf, PAL.ink, 0.4), // v0.15: the weeds' darker blades
  puff: PAL.paper,
  beet: mix(PAL.red, PAL.ink, 0.38),
  moss: mix(PAL.leaf, PAL.flower, 0.22),
  sprig: mix(PAL.leafLight, PAL.flower, 0.12),
};

// ---------------- geometry kit ----------------
export function rng(seed) { // mulberry32
  let a = (seed * 2654435761) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
// Give a geometry one colour as a vertex attribute, indexed, without uvs, ready to merge.
export function paint(geo, color) {
  geo.deleteAttribute('uv');
  let g = geo;
  if (!g.index) { g.deleteAttribute('normal'); g = mergeVertices(g, 1e-6); }
  if (!g.attributes.normal) g.computeVertexNormals();
  const c = new THREE.Color(color); const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
export const bake = (parts) => mergeGeometries(parts, false);
const vcolMat = (side = THREE.FrontSide) => toon(0xffffff, { vertexColors: true, side });
// one vertex-coloured mesh; `cast` false for flat ground bits
export function vmesh(geo, { cast = true, ink = true } = {}) {
  const m = new THREE.Mesh(geo, vcolMat());
  m.castShadow = cast; m.receiveShadow = true;
  if (!ink) m.userData.noOutline = true;
  return m;
}

// A leaf, petal or blade: a thin closed solid along a curve. `width(s)` is the half-width at
// s in [0, 1]; the cross-section is a lens `thick` times as deep as it is wide, cupped by `cup`
// (a creased leaf); `across` is the direction the broad face spreads in.
export function blade(points, { width, thick = 0.22, cup = 0.2, across, segs = 8, radial = 6 }) {
  const curve = points.length === 2 ? new THREE.LineCurve3(points[0], points[1]) : new THREE.CatmullRomCurve3(points);
  const pos = []; const idx = [];
  const Wd = new THREE.Vector3(); const N = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const s = i / segs; const P = curve.getPointAt(s); const T = curve.getTangentAt(s);
    Wd.copy(across).addScaledVector(T, -across.dot(T));
    if (Wd.lengthSq() < 1e-8) Wd.set(1, 0, 0);
    Wd.normalize();
    N.crossVectors(T, Wd).normalize();
    const w = Math.max(width(s), 0.0006); const t = Math.max(w * thick, 0.0012);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2; const ca = Math.cos(a);
      const x = ca * w; const y = Math.sin(a) * t + cup * w * (ca * ca - 0.5);
      pos.push(P.x + Wd.x * x + N.x * y, P.y + Wd.y * x + N.y * y, P.z + Wd.z * x + N.z * y);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j; const b = a + radial; const a1 = i * radial + ((j + 1) % radial); const b1 = a1 + radial;
    idx.push(a, b, a1, b, b1, a1);
  }
  for (const [i, sgn] of [[0, -1], [segs, 1]]) { // closed ends
    const P = curve.getPointAt(i / segs).addScaledVector(curve.getTangentAt(i / segs), sgn * 0.001);
    const ci = pos.length / 3; pos.push(P.x, P.y, P.z);
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j; const a1 = i * radial + ((j + 1) % radial);
      if (sgn < 0) idx.push(ci, a1, a); else idx.push(ci, a, a1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// width profiles
const strap = (w, base = 0.5) => (s) => w * (s < 0.12 ? base + (1 - base) * (s / 0.12) : 1 - ((s - 0.12) / 0.88) ** 1.7); // corn leaf, grass
const oval = (w, p = 0.8) => (s) => w * Math.sin(Math.PI * s) ** p; // pointed oval: petals, leaves
// horizontal direction across a leaf that heads out along azimuth `az`
const acrossAz = (az) => V(-Math.sin(az), 0, Math.cos(az));
const dirAz = (az) => V(Math.cos(az), 0, Math.sin(az));

// ---------------- D15 corn ----------------
// One stalk, 7 broad arching creased leaves spiralling up (lower ones longer, upper ones more
// upright), a fanned tassel; cobs in green husks at three leaf joints (live plants only). About
// 1.95 m at scale 1; the world solves one scale for the whole patch from a front-row stalk.
export const CORN_H = 1.95;
const cornCache = new Map();
function cornGeometry(variant) {
  if (cornCache.has(variant)) return cornCache.get(variant);
  const r = rng(11 + variant * 7);
  const parts = [];
  const lean = V((r() - 0.5) * 0.06, 0, (r() - 0.5) * 0.06);
  const top = V(lean.x, 1.72, lean.z);
  parts.push(paint(taperTube(new THREE.CatmullRomCurve3([V(0, -0.03, 0), V(lean.x * 0.3, 0.6, lean.z * 0.3), V(lean.x * 0.7, 1.2, lean.z * 0.7), top]), 0.036, 0.016, 8, 6), FLORA.stalk));
  const az0 = r() * Math.PI * 2;
  for (let k = 0; k < 7; k++) {
    const h = 0.18 + k * 0.21 + (r() - 0.5) * 0.05;
    const az = az0 + k * 2.6 + (r() - 0.5) * 0.7;
    const len = 0.78 - k * 0.045 + (r() - 0.5) * 0.08;
    const lift = 0.32 + k * 0.05; // upper leaves stand up more before they fold over
    const d = dirAz(az); const base = V(lean.x * h / 1.72, h, lean.z * h / 1.72).addScaledVector(d, 0.02);
    const pts = [
      base,
      base.clone().addScaledVector(d, len * 0.18).addScaledVector(UP, len * lift),
      base.clone().addScaledVector(d, len * 0.45).addScaledVector(UP, len * (lift + 0.1)),
      base.clone().addScaledVector(d, len * 0.72).addScaledVector(UP, len * (lift - 0.05)),
      base.clone().addScaledVector(d, len * 0.9).addScaledVector(UP, len * (lift - 0.38 - r() * 0.12)),
    ];
    parts.push(paint(blade(pts, { width: strap(0.064 + r() * 0.012), across: acrossAz(az), cup: 0.35, segs: 7, radial: 4 }), k % 3 === 1 ? FLORA.leafLight : FLORA.leaf));
  }
  for (let k = 0; k < 6; k++) { // tassel: a fan of thin spikes
    const az = az0 + k * 1.05; const out = k === 0 ? 0 : 0.07 + r() * 0.05;
    const tip = top.clone().addScaledVector(dirAz(az), out * 2.4).addScaledVector(UP, 0.2 + r() * 0.07 - out * 0.6);
    parts.push(paint(blade([top.clone().addScaledVector(UP, -0.02), top.clone().addScaledVector(dirAz(az), out).addScaledVector(UP, 0.12), tip], { width: oval(0.009, 0.5), across: acrossAz(az), thick: 0.6, cup: 0, segs: 3, radial: 3 }), FLORA.tassel));
  }
  const geo = bake(parts);
  const cobs = [0.55, 0.78, 1.0].map((h, i) => ({ h, az: az0 + i * 2.6 + Math.PI + (r() - 0.5) * 0.5, lean: lean.clone().multiplyScalar(h / 1.72) }));
  const out = { geo, cobs };
  cornCache.set(variant, out);
  return out;
}
// a cob in its husk, along +Y from the origin: yellow kernels showing at the top, husk leaves
// round it, a tuft of silk at the tip
let cobGeo = null;
export function cobGeometry() {
  if (cobGeo) return cobGeo;
  const parts = [];
  const cob = new THREE.CapsuleGeometry(0.042, 0.13, 3, 8); cob.translate(0, 0.11, 0);
  parts.push(paint(cob, PAL.corn));
  for (let k = 0; k < 3; k++) {
    const az = k * 2.1; const d = dirAz(az);
    parts.push(paint(blade([V(0, 0.0, 0), d.clone().multiplyScalar(0.045).setY(0.08), d.clone().multiplyScalar(0.038).setY(0.15), d.clone().multiplyScalar(0.02).setY(k === 0 ? 0.23 : 0.19)], { width: oval(0.04, 0.6), across: acrossAz(az), thick: 0.25, cup: -0.4, segs: 4, radial: 4 }), FLORA.husk));
  }
  parts.push(paint(blade([V(0, 0.2, 0), V(0.015, 0.25, 0.005), V(0.04, 0.27, 0.01)], { width: oval(0.012, 0.6), across: V(0, 0, 1), thick: 0.5, cup: 0, segs: 3, radial: 4 }), FLORA.silk));
  cobGeo = bake(parts);
  return cobGeo;
}
// A corn plant: `live` adds the cobs (named group `cobs`, one child per unit of stock).
export function cornPlant({ live, variant = 0 }) {
  const { geo, cobs } = cornGeometry(variant % 3);
  const g = new THREE.Group(); g.name = 'D15_Corn';
  g.add(vmesh(geo));
  if (live) {
    const cg = new THREE.Group(); cg.name = 'cobs';
    for (const c of cobs) {
      const m = vmesh(cobGeometry());
      const d = dirAz(c.az);
      m.position.copy(c.lean).setY(c.h).addScaledVector(d, 0.03);
      m.quaternion.setFromUnitVectors(UP, d.clone().multiplyScalar(0.5).add(UP).normalize());
      m.scale.setScalar(0.95);
      cg.add(m);
    }
    g.add(cg);
  }
  return g;
}

// ---------------- D16 sunflowers ----------------
// The head: a domed dark seed disc in two rings of pointed petals, on a green calyx; faces +Z,
// centred on the origin. `lite` is the carried / sold unit (fewer petals, fewer segments).
const headCache = new Map();
export function sunflowerHeadGeometry(R = 0.27, lite = false) {
  const key = `${R}|${lite}`;
  if (headCache.has(key)) return headCache.get(key);
  const parts = [];
  const n = lite ? 12 : 15;
  const seg = 3; const rad = 4;
  for (const [ring, count, len, col, off, fwd] of [[0, n, 1, PAL.flower, 0, 0], [1, n, 0.78, FLORA.petalDeep, 0.5, 0.012]]) {
    if (lite && ring === 1) continue;
    for (let k = 0; k < count; k++) {
      const a = ((k + off) / count) * Math.PI * 2 + (ring ? 0.07 : 0);
      const d = V(Math.cos(a), Math.sin(a), 0);
      const r0 = R * 0.3; const r1 = R * (0.3 + 0.7 * len) * (0.94 + 0.12 * Math.sin(k * 2.7));
      const pts = [d.clone().multiplyScalar(r0).setZ(fwd), d.clone().multiplyScalar((r0 + r1) / 2).setZ(fwd + R * 0.06), d.clone().multiplyScalar(r1).setZ(fwd + R * 0.02)];
      parts.push(paint(blade(pts, { width: oval(R * 0.075, 0.7), across: V(-d.y, d.x, 0), thick: 0.2, cup: 0.25, segs: seg, radial: rad }), col));
    }
  }
  const disc = new THREE.SphereGeometry(R * 0.36, lite ? 10 : 14, lite ? 5 : 7); disc.scale(1, 1, 0.42); disc.translate(0, 0, R * 0.05);
  parts.push(paint(disc, FLORA.seed));
  const calyx = new THREE.SphereGeometry(R * 0.33, lite ? 8 : 12, 5); calyx.scale(1, 1, 0.5); calyx.translate(0, 0, -R * 0.07);
  parts.push(paint(calyx, PAL.leaf));
  const g = bake(parts);
  headCache.set(key, g);
  return g;
}
export const SUNFLOWER_H = 2.2;
const sunCache = new Map();
function sunflowerGeometry(variant) {
  if (sunCache.has(variant)) return sunCache.get(variant);
  const r = rng(31 + variant * 5);
  const parts = [];
  const h = 1.92 + (r() - 0.5) * 0.06;
  const top = V((r() - 0.5) * 0.08, h, 0.05);
  const stem = new THREE.CatmullRomCurve3([V(0, -0.03, 0), V(0.03, 0.7, 0.01), V(-0.02, 1.4, 0), top]);
  parts.push(paint(taperTube(stem, 0.032, 0.021, 10, 6), PAL.leaf));
  for (let k = 0; k < 6; k++) { // pointed-oval leaves on short stalks, drooping, alternating
    const t = 0.18 + k * 0.12; const p = stem.getPointAt(t);
    const az = k * 2.4 + r() * 0.6; const d = dirAz(az);
    const len = 0.34 - k * 0.025;
    const s0 = p.clone().addScaledVector(d, 0.02); const s1 = p.clone().addScaledVector(d, 0.09).addScaledVector(UP, 0.03);
    parts.push(paint(taperTube(new THREE.LineCurve3(s0, s1), 0.008, 0.006, 2, 5), PAL.leaf));
    const pts = [s1, s1.clone().addScaledVector(d, len * 0.45).addScaledVector(UP, len * 0.05), s1.clone().addScaledVector(d, len).addScaledVector(UP, -len * 0.35)];
    parts.push(paint(blade(pts, { width: oval(0.075 - k * 0.004, 0.65), across: acrossAz(az), thick: 0.16, cup: 0.3, segs: 6, radial: 4 }), k % 2 ? FLORA.leafLight : PAL.leaf));
  }
  // v0.23: the head is its own mesh on the stem's top (`head`), so a bird can fly off with it and
  // it can grow back (world.js stripPlant); together they are the plant v0.22 drew as one
  const head = sunflowerHeadGeometry(0.27).clone();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.28 + (r() - 0.5) * 0.15, (r() - 0.5) * 0.5, (r() - 0.5) * 0.2));
  head.applyQuaternion(q);
  const out = { body: bake(parts), head, at: V(top.x, top.y + 0.02, top.z + 0.03) };
  sunCache.set(variant, out);
  return out;
}
export function sunflower(variant = 0) {
  const g = new THREE.Group(); g.name = 'D16_Sunflower';
  const geo = sunflowerGeometry(variant % 4);
  g.add(vmesh(geo.body));
  const head = vmesh(geo.head); head.name = 'head';
  head.position.copy(geo.at);
  g.add(head);
  return g;
}

// ---------------- weeds: broad removable clumps (distinct from the fine D20 sprouts) ----------------
// A ragged tuft of blades leaning out and a low jagged rosette, so a clump reads as "weeds" and
// not as a crop. v0.15 (captain: "Weed should be bigger and more noticeable"): taller, darker
// blades and a wider rosette. v0.16: plain weeds, no dandelion clocks or flowers (see below).
let weedGeo = null;
export function weedGeometry() {
  if (weedGeo) return weedGeo;
  const r = rng(5);
  const parts = [];
  for (let k = 0; k < 11; k++) {
    const az = (k / 11) * Math.PI * 2 + (r() - 0.5) * 0.5; const d = dirAz(az);
    const len = 0.38 + r() * 0.26; const out = 0.25 + r() * 0.35;
    const b = d.clone().multiplyScalar(0.03);
    const pts = [b, b.clone().addScaledVector(d, len * out * 0.4).addScaledVector(UP, len * 0.55), b.clone().addScaledVector(d, len * out).addScaledVector(UP, len * (0.85 - out * 0.4))];
    parts.push(paint(blade(pts, { width: strap(0.022, 0.8), across: acrossAz(az), thick: 0.3, cup: 0.3, segs: 4, radial: 4 }), k % 3 ? FLORA.weed : FLORA.weedDark));
  }
  for (let k = 0; k < 5; k++) { // low jagged rosette leaves lying on the ground
    const az = k * 1.3 + 0.4; const d = dirAz(az);
    const pts = [d.clone().multiplyScalar(0.02).setY(0.02), d.clone().multiplyScalar(0.15).setY(0.05), d.clone().multiplyScalar(0.29).setY(0.02)];
    parts.push(paint(blade(pts, { width: (s) => 0.045 * Math.sin(Math.PI * s) ** 0.7 * (0.75 + 0.25 * Math.abs(Math.sin(s * 14))), across: acrossAz(az), thick: 0.15, cup: 0.1, segs: 7, radial: 4 }), FLORA.weed));
  }
  // v0.16 (captain: "Remove the dandelion on the weed, just regular weed"): no clocks or flowers;
  // a few more, finer blades and a second, smaller tuft of grass leaning the other way instead
  for (let k = 0; k < 7; k++) {
    const az = (k / 7) * Math.PI * 2 + 0.35 + (r() - 0.5) * 0.4; const d = dirAz(az);
    const len = 0.26 + r() * 0.18; const out = 0.35 + r() * 0.3;
    const b = d.clone().multiplyScalar(0.06).add(V(0.05, 0, -0.04));
    const pts = [b, b.clone().addScaledVector(d, len * out * 0.4).addScaledVector(UP, len * 0.6), b.clone().addScaledVector(d, len * out).addScaledVector(UP, len * (0.9 - out * 0.4))];
    parts.push(paint(blade(pts, { width: strap(0.016, 0.8), across: acrossAz(az), thick: 0.3, cup: 0.3, segs: 4, radial: 4 }), k % 2 ? FLORA.weedDark : FLORA.weed));
  }
  weedGeo = bake(parts);
  return weedGeo;
}
export function weed() {
  const g = new THREE.Group(); g.name = 'Weed';
  g.add(vmesh(weedGeometry()));
  return g;
}

// ---------------- D19 the raised bed's vegetables and the Who-Knows plant ----------------
// In the bed's own frame (2.4 x 1.1 boards, soil at about y 0.38): leafy greens and the beet on
// the left, the Who-Knows plant in the middle, the two tomato plants (dark-topped stems,
// unfruited until T0) on the right, herb sprouts at both ends (§3 D19, §10.4).
const SOIL_Y = 0.37;
function herb(x, z, seed) {
  const r = rng(seed); const parts = [];
  for (let k = 0; k < 6; k++) {
    const az = k * 1.05 + r() * 0.4; const d = dirAz(az);
    const pts = [V(x, SOIL_Y, z), V(x, SOIL_Y + 0.08, z).addScaledVector(d, 0.03), V(x, SOIL_Y + 0.15 + r() * 0.05, z).addScaledVector(d, 0.08)];
    parts.push(paint(blade(pts, { width: oval(0.014, 0.6), across: acrossAz(az), thick: 0.3, cup: 0.2, segs: 4, radial: 4 }), FLORA.sprig));
  }
  return parts;
}
function lettuce(x, z, r0, seed) {
  const outer = scallopedClump(r0, seed, { lobes: 9, detail: 3 }); outer.scale(1.15, 0.62, 1.1); outer.translate(x, SOIL_Y + r0 * 0.42, z);
  const inner = scallopedClump(r0 * 0.6, seed + 2, { lobes: 7, detail: 2 }); inner.scale(1, 0.8, 1); inner.translate(x + 0.01, SOIL_Y + r0 * 0.75, z + 0.01);
  return [paint(outer, PAL.leafLight), paint(inner, mix(PAL.leafLight, PAL.paper, 0.15))];
}
function beet(x, z) {
  const parts = [];
  const root = new THREE.SphereGeometry(0.07, 14, 10); root.scale(1, 0.85, 1); root.translate(x, SOIL_Y + 0.02, z);
  parts.push(paint(root, FLORA.beet));
  for (let k = 0; k < 4; k++) {
    const az = k * 1.6 + 0.3; const d = dirAz(az);
    const s0 = V(x, SOIL_Y + 0.07, z); const s1 = s0.clone().addScaledVector(d, 0.03).addScaledVector(UP, 0.08);
    parts.push(paint(taperTube(new THREE.LineCurve3(s0, s1), 0.006, 0.005, 2, 5), mix(FLORA.beet, PAL.leaf, 0.3)));
    parts.push(paint(blade([s1, s1.clone().addScaledVector(d, 0.05).addScaledVector(UP, 0.08), s1.clone().addScaledVector(d, 0.1).addScaledVector(UP, 0.1)], { width: oval(0.04, 0.7), across: acrossAz(az), thick: 0.15, cup: 0.3, segs: 6, radial: 5 }), PAL.leaf));
  }
  return parts;
}
function tomatoPlant(x, z, seed, out = {}) {
  const r = rng(seed); const parts = [];
  const top = V(x + (r() - 0.5) * 0.06, 1.0 + r() * 0.08, z);
  out.top = top;
  const stem = new THREE.CatmullRomCurve3([V(x, SOIL_Y - 0.02, z), V(x + 0.02, 0.62, z), top]);
  parts.push(paint(taperTube(stem, 0.017, 0.011, 8, 6), FLORA.leafDark));
  const tips = [top];
  for (const [t, az] of [[0.45, 0.6 + r()], [0.65, 3.4 + r()]]) {
    const p = stem.getPointAt(t); const d = dirAz(az);
    const tip = p.clone().addScaledVector(d, 0.13).addScaledVector(UP, 0.12);
    parts.push(paint(taperTube(new THREE.CatmullRomCurve3([p, p.clone().addScaledVector(d, 0.07).addScaledVector(UP, 0.08), tip]), 0.009, 0.007, 4, 5), FLORA.leafDark));
    tips.push(tip);
  }
  for (let k = 0; k < 6; k++) { // compound leaves along the stem
    const p = stem.getPointAt(0.22 + k * 0.11); const az = k * 2.3 + r(); const d = dirAz(az);
    const s1 = p.clone().addScaledVector(d, 0.02);
    parts.push(paint(blade([s1, s1.clone().addScaledVector(d, 0.06).addScaledVector(UP, 0.04), s1.clone().addScaledVector(d, 0.13).addScaledVector(UP, -0.01)], { width: (s) => 0.026 * Math.sin(Math.PI * s) ** 0.7 * (0.8 + 0.2 * Math.abs(Math.sin(s * 11))), across: acrossAz(az), thick: 0.15, cup: 0.3, segs: 6, radial: 4 }), PAL.leaf));
  }
  tips.forEach((p, i) => { // the drawing's dark round tops
    const c = scallopedClump(i ? 0.062 : 0.08, seed + i, { lobes: 7, detail: 2 });
    c.translate(p.x, p.y + 0.03, p.z);
    parts.push(paint(c, FLORA.leafDark));
  });
  return parts;
}
// v0.16 (captain: "The tomato plants should grow with progression taller, not bigger, like
// normal"): a tier of the plant that grows on top of it with a round: the stem goes on up by
// TOMATO_TIER_M, with two compound leaves, a side shoot and a new dark round top (a truss), so the
// plant gets taller, its width and leaves staying their size. Built with its foot at the origin
// (the stem's top before it), in the bed's frame.
export const TOMATO_TIER_M = 0.34;
export const TOMATO_TIERS = 2;
function tomatoTier(seed, k) {
  const r = rng(seed * 7 + k * 13); const parts = [];
  const h = TOMATO_TIER_M;
  const top = V((r() - 0.5) * 0.05, h, (r() - 0.5) * 0.03);
  const stem = new THREE.CatmullRomCurve3([V(0, -0.06, 0), V(0.012 * (k ? -1 : 1), h * 0.5, 0), top]);
  parts.push(paint(taperTube(stem, 0.012, 0.009, 5, 5), FLORA.leafDark));
  for (let j = 0; j < 2; j++) { // compound leaves along the new stem
    const p = stem.getPointAt(0.25 + j * 0.4); const az = j * 2.4 + k * 1.3 + r(); const d = dirAz(az);
    const s1 = p.clone().addScaledVector(d, 0.02);
    parts.push(paint(blade([s1, s1.clone().addScaledVector(d, 0.06).addScaledVector(UP, 0.04), s1.clone().addScaledVector(d, 0.13).addScaledVector(UP, -0.01)], { width: (s) => 0.026 * Math.sin(Math.PI * s) ** 0.7 * (0.8 + 0.2 * Math.abs(Math.sin(s * 11))), across: acrossAz(az), thick: 0.15, cup: 0.3, segs: 5, radial: 3 }), PAL.leaf));
  }
  const p = stem.getPointAt(0.55); const d = dirAz(1.1 + k * 2.6 + r()); // a side shoot with its top
  const tip = p.clone().addScaledVector(d, 0.11).addScaledVector(UP, 0.08);
  parts.push(paint(taperTube(new THREE.CatmullRomCurve3([p, p.clone().addScaledVector(d, 0.06).addScaledVector(UP, 0.05), tip]), 0.008, 0.006, 3, 4), FLORA.leafDark));
  for (const [q, rr] of [[tip, 0.058], [top, 0.072]]) {
    const c = scallopedClump(rr, seed + 40 + k * 3 + (q === top ? 1 : 0), { lobes: 6, detail: 1 });
    c.translate(q.x, q.y + 0.03, q.z);
    parts.push(paint(c, FLORA.leafDark));
  }
  return { parts, top };
}
// The Who-Knows plant (§10.5): one continuous uneven ink stroke rising in loops from a moss
// mound, with a few bright sprig leaves. Never a resource; it keeps its drawing place.
export function whoKnows() {
  const g = new THREE.Group(); g.name = 'D19_WhoKnows';
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const loops = t * Math.PI * 2 * 2.6;
    const rr = 0.045 + 0.04 * Math.sin(t * Math.PI) + 0.012 * Math.sin(t * 23);
    pts.push(V(Math.sin(loops) * rr + 0.02 * Math.sin(t * 9), SOIL_Y + 0.08 + t * 0.62 + 0.05 * Math.sin(loops + 0.6) * Math.sin(t * Math.PI), Math.cos(loops) * rr * 0.7));
  }
  const stroke = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 0.0085, 0.006, 96, 5), toon(PAL.ink));
  stroke.userData.noOutline = true; stroke.castShadow = true;
  const parts = [];
  const mound = lumpy(new THREE.SphereGeometry(0.11, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), 0.012, 30, 3); mound.scale(1.2, 0.55, 1); mound.translate(0, SOIL_Y - 0.01, 0);
  parts.push(paint(mound, FLORA.moss));
  for (const [i, az, up] of [[64, 0.4, 0.06], [50, 2.2, 0.03], [38, 4.1, 0.02], [58, 5.2, 0.05]]) {
    const p = pts[i]; const d = dirAz(az);
    const s1 = p.clone().addScaledVector(d, 0.03).addScaledVector(UP, up);
    parts.push(paint(taperTube(new THREE.LineCurve3(p, s1), 0.004, 0.003, 2, 4), FLORA.leafDark));
    parts.push(paint(blade([s1, s1.clone().addScaledVector(d, 0.035).addScaledVector(UP, 0.02), s1.clone().addScaledVector(d, 0.07).addScaledVector(UP, 0.01)], { width: oval(0.022, 0.7), across: acrossAz(az), thick: 0.2, cup: 0.3, segs: 5, radial: 5 }), FLORA.sprig));
  }
  g.add(stroke, vmesh(bake(parts)));
  return g;
}
export function bedPlants() {
  const g = new THREE.Group(); g.name = 'D19_BedPlants';
  const greens = new THREE.Group(); greens.name = 'D19_Greens';
  greens.add(vmesh(bake([...lettuce(-0.86, 0.12, 0.15, 1), ...lettuce(-0.58, -0.18, 0.13, 4), ...beet(-0.32, 0.2), ...herb(-1.04, -0.26, 7), ...herb(1.05, 0.2, 9)])));
  const tomatoes = new THREE.Group(); tomatoes.name = 'D19_TomatoStems'; // unfruited until T0
  // v0.15: each plant on its own, its origin at its stem's foot on the soil, so it can grow
  // round by round (world.js, ledger plantSize)
  // v0.16: and its tiers, one more grown on top with each round (`tier0`, `tier1`; world.js)
  for (const [id, x, z, seed] of [['t1', 0.45, 0.08, 21], ['t2', 0.8, -0.16, 25]]) {
    const plant = new THREE.Group(); plant.name = `D19_Tomato_${id}`;
    const info = {};
    const geo = bake(tomatoPlant(0, 0, seed, info));
    geo.translate(0, -SOIL_Y, 0);
    plant.add(vmesh(geo));
    let foot = info.top.clone().setY(info.top.y - SOIL_Y);
    for (let k = 0; k < TOMATO_TIERS; k++) {
      const t = tomatoTier(seed, k);
      const m = vmesh(bake(t.parts));
      m.name = `tier${k}`;
      m.position.copy(foot);
      plant.add(m);
      foot = foot.clone().add(t.top);
    }
    plant.position.set(x, SOIL_Y, z);
    tomatoes.add(plant);
  }
  const who = whoKnows(); who.position.set(0.1, 0, -0.02);
  g.add(greens, tomatoes, who);
  return g;
}
