// Direction-C models (spec §10.8, P24-7 step 1), re-authored from the style test's variant C
// (farmgame-style-test, source/src/hand.js) into the game: the cottage D01-D07 with its stage
// nodes, the broad tree D09 with scalloped leaf clumps, the logs and stones of the carried stack
// and the delivered piles (one model each, V1), and (v0.9) the fallen branches and the angular
// loose rocks that wood and stone are gathered from.
// Everything is authored here in metres against the drawing and the §10.3 swatches; nothing
// comes from a kit or a capture. Organic forms are smooth (toon bands, never facets); built
// edges stay crisp. Static parts are merged per material so a model costs a few draw calls.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, toon } from './look.js';

export const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
export function mesh(geo, color, { hatch = 0, ink = true, shadow = true, noLight = 0 } = {}) {
  const m = new THREE.Mesh(geo, toon(color, { hatch, noLight }));
  m.castShadow = shadow; m.receiveShadow = true;
  if (!ink) m.userData.noOutline = true;
  return m;
}
export function at(o, x, y, z, rx = 0, ry = 0, rz = 0) { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; }

// ---------------- hand-made irregularity ----------------
export function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
export function noise3(x, y, z) {
  const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
  const xf = x - xi; const yf = y - yi; const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf); const v = yf * yf * (3 - 2 * yf); const w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
// displace a closed shape along its radius by `fn(direction, position)` (metres), smooth normals
export function displace(geo, fn) {
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  const g = mergeVertices(geo, 1e-5);
  const p = g.attributes.position; const v = new THREE.Vector3(); const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    d.copy(v).normalize();
    v.addScaledVector(d, fn(d, v));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
export function lumpy(geo, amp, freq, seed = 0) {
  return displace(geo, (d, v) => (noise3(v.x * freq + seed, v.y * freq + seed * 1.7, v.z * freq - seed) - 0.5) * 2 * amp);
}
// a tube whose radius tapers from r0 to r1 along a curve
export function taperTube(curve, r0, r1, segs = 16, radial = 9) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = []; const idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const c = curve.getPointAt(t); const r = r0 + (r1 - r0) * t;
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j; const b = a + radial; const a1 = i * radial + ((j + 1) % radial); const b1 = a1 + radial;
    idx.push(a, a1, b, b, a1, b1);
  }
  const end = curve.getPointAt(1); const ci = pos.length / 3; pos.push(end.x, end.y, end.z);
  for (let j = 0; j < radial; j++) idx.push(ci, segs * radial + j, segs * radial + ((j + 1) % radial));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------- merging static parts per material ----------------
// Bakes every mesh under `root` into one mesh per (material, ink, shadow) group, keeping names
// of the groups' first meshes for debugging. Returns a new Group with the same transform.
export function mergeByMaterial(root, name = root.name) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  root.traverse((m) => {
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    let g = m.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    g.deleteAttribute('uv');
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.index) g = mergeVertices(g, 1e-6);
    const parts = Array.isArray(m.material) && g.groups.length
      ? g.groups.map((gr) => ({ mat: mats[gr.materialIndex], geo: subGeometry(g, gr) }))
      : [{ mat: mats[0], geo: g }];
    for (const { mat, geo } of parts) {
      const key = `${mat.uuid}|${!!m.userData.noOutline}|${m.castShadow}`;
      if (!buckets.has(key)) buckets.set(key, { mat, noOutline: !!m.userData.noOutline, cast: m.castShadow, geos: [] });
      buckets.get(key).geos.push(geo);
    }
  });
  const out = new THREE.Group();
  out.name = name;
  out.position.copy(root.position); out.quaternion.copy(root.quaternion); out.scale.copy(root.scale);
  for (const b of buckets.values()) {
    const m = new THREE.Mesh(mergeGeometries(b.geos.map((g) => { g.clearGroups(); return g; }), false), b.mat);
    m.castShadow = b.cast; m.receiveShadow = true;
    if (b.noOutline) m.userData.noOutline = true;
    out.add(m);
  }
  Object.assign(out.userData, root.userData);
  return out;
}
function subGeometry(g, gr) {
  const s = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(g.attributes)) s.setAttribute(k, a);
  s.setIndex(Array.from(g.index.array.slice(gr.start, gr.start + gr.count)));
  return s;
}

// ---------------- the cottage D01-D07 ----------------
// Front gable faces +Z, origin at the footprint centre on the ground. Stage nodes (annex §E.6),
// each taking its colour as its stage is built (spec v0.9 §10.9, answer 3). v0.15 (captain:
// "the walls should only be walls, roof only be roof, add an extra step for chimney"): H1 the
// stone plinth; H2 the plain walls; H3 the roof (D02); H4 the red chimney D03 on the right slope
// toward the front (its smoke rises from `chimneyTop`, world.js); H5 the home: the round gable
// window D04, square front window D05, side window D06, the door frame, the red door with its
// handle D07, the door step and the window trim (the dark recesses behind them come with them).
export const COTTAGE = { w: 4.0, d: 3.3, wall: 2.45, roof: 1.55, plinth: 0.24 };
export function cottage() {
  const W = COTTAGE.w; const D = COTTAGE.d; const Hw = COTTAGE.wall; const R = COTTAGE.roof; const P = COTTAGE.plinth;
  const plinth = new THREE.Group(); plinth.name = 'D01_House_H1_Plinth';
  const walls = new THREE.Group(); walls.name = 'D01_House_H2_Walls';
  const roof = new THREE.Group(); roof.name = 'D01_House_H3_Roof';
  const chimney = new THREE.Group(); chimney.name = 'D01_House_H4_Chimney';
  const details = new THREE.Group(); details.name = 'D01_House_H5_Details';
  const recess = mix(PAL.ink, PAL.cream, 0.45); // an opening before its window or door is fitted
  const opening = (w, h, x, y, z, ry = 0) => at(mesh(new THREE.PlaneGeometry(w, h), recess, { ink: false, shadow: false }), x, y, z, 0, ry, 0);

  plinth.add(at(mesh(new THREE.BoxGeometry(W + 0.16, P, D + 0.16), PAL.stone), 0, P / 2, 0));
  // walls: one gable prism with a little hand-built wonkiness (D25), never enough to read broken
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, Hw); s.lineTo(0, Hw + R); s.lineTo(-W / 2, Hw); s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false });
  body.translate(0, P, -D / 2);
  const bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) bp.setX(i, bp.getX(i) + (bp.getY(i) - P) * 0.012 + Math.sin(bp.getZ(i) * 3.1) * 0.01);
  body.computeVertexNormals();
  walls.add(mesh(body, PAL.cream, { hatch: 1 }));

  const front = D / 2;
  details.add(windowFrame(0.72, 0.72, { x: -1.08, y: P + 1.35, z: front }));
  details.add(opening(0.72, 0.72, -1.08, P + 1.35, front + 0.004));
  const frame = new THREE.Group(); // the door frame: H5 (v0.15)
  for (const [w, h, x, y] of [[0.08, 1.86, -0.47, 0.93], [0.08, 1.86, 0.47, 0.93], [1.02, 0.08, 0, 1.86]]) frame.add(at(mesh(new THREE.BoxGeometry(w, h, 0.12), PAL.ink), x, y, 0));
  frame.add(opening(0.86, 1.78, 0, 0.89, -0.026));
  frame.position.set(0.55, P, front + 0.03);
  details.add(frame);
  const door = new THREE.Group(); // the red door and its handle: H5
  door.add(at(mesh(new THREE.BoxGeometry(0.86, 1.78, 0.08), PAL.red), 0, 0.89, 0));
  const handle = mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 12, Math.PI), PAL.ink, { ink: false });
  handle.position.set(0.28, 0.92, 0.07); handle.rotation.z = Math.PI / 2;
  door.add(handle);
  door.position.set(0.55, P, front + 0.03);
  details.add(door);
  details.add(at(mesh(new THREE.BoxGeometry(1.1, 0.1, 0.45), PAL.stone), 0.55, 0.05, front + 0.3)); // door step
  const round = new THREE.Group();
  round.add(mesh(new THREE.CircleGeometry(0.3, 24), PAL.shirt, { ink: false }));
  round.add(at(mesh(new THREE.TorusGeometry(0.31, 0.055, 8, 28), PAL.ink, { ink: false }), 0, 0, 0.02));
  round.add(at(mesh(new THREE.BoxGeometry(0.6, 0.05, 0.04), PAL.ink, { ink: false }), 0, 0, 0.03));
  round.add(at(mesh(new THREE.BoxGeometry(0.05, 0.6, 0.04), PAL.ink, { ink: false }), 0, 0, 0.03));
  round.position.set(0, P + Hw + R * 0.42, front + 0.015);
  details.add(round);
  const roundHole = at(mesh(new THREE.CircleGeometry(0.33, 24), recess, { ink: false, shadow: false }), 0, P + Hw + R * 0.42, front + 0.004);
  details.add(roundHole);
  const side = windowFrame(0.62, 0.68, { x: W / 2, y: P + 1.4, z: -0.15 });
  side.rotation.y = Math.PI / 2;
  details.add(side);
  details.add(opening(0.62, 0.68, W / 2 + 0.004, P + 1.4, -0.15, Math.PI / 2));

  // roof: two charcoal slabs with eaves, a ridge, three sparse shingle strokes per slope
  const half = W / 2; const pitch = Math.atan2(R, half); const slope = Math.hypot(half, R);
  const over = 0.32; const T = 0.14; const RD = D + 0.5;
  for (const sd of [-1, 1]) {
    const L = slope + over;
    const along = new THREE.Vector3(sd * Math.cos(pitch), -Math.sin(pitch), 0);
    const normal = new THREE.Vector3(sd * Math.sin(pitch), Math.cos(pitch), 0);
    const slab = mesh(new THREE.BoxGeometry(L, T, RD), PAL.charcoal);
    slab.position.copy(new THREE.Vector3(0, P + Hw + R, 0).addScaledVector(along, L / 2 - 0.06).addScaledVector(normal, T / 2));
    slab.rotation.z = -sd * pitch;
    roof.add(slab);
    for (let k = 1; k <= 3; k++) {
      const stroke = mesh(new THREE.BoxGeometry(0.018, 0.012, RD * (0.55 + 0.25 * Math.sin(k * 2.3))), PAL.ink, { ink: false, shadow: false });
      stroke.position.copy(new THREE.Vector3(0, P + Hw + R, 0).addScaledVector(along, (L - 0.06) * (k / 4)).addScaledVector(normal, T + 0.004));
      stroke.position.z += Math.sin(k * 1.7) * 0.25;
      stroke.rotation.z = -sd * pitch;
      roof.add(stroke);
    }
  }
  const ridge = mesh(new THREE.CylinderGeometry(0.09, 0.09, D + 0.55, 10), mix(PAL.charcoal, PAL.ink, 0.3));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, P + Hw + R + 0.12, 0);
  roof.add(ridge);
  const cx = 0.75; const cz = 0.55;
  const roofY = P + Hw + R - cx * Math.tan(pitch);
  chimney.add(at(mesh(new THREE.BoxGeometry(0.46, 1.5, 0.46), PAL.red, { hatch: 1 }), cx, roofY + 0.45, cz));
  chimney.add(at(mesh(new THREE.BoxGeometry(0.58, 0.12, 0.58), mix(PAL.red, PAL.ink, 0.35)), cx, roofY + 1.24, cz));

  const g = new THREE.Group();
  g.add(mergeByMaterial(plinth), mergeByMaterial(walls), mergeByMaterial(roof), mergeByMaterial(chimney), mergeByMaterial(details));
  g.userData.chimneyTop = new THREE.Vector3(cx, roofY + 1.35, cz);
  g.userData.doorStep = new THREE.Vector3(0.55, 0, front + 0.3 + 0.225); // the door step's front edge
  return g;
}
function windowFrame(w, h, { x, y, z }) {
  const g = new THREE.Group();
  const f = 0.07;
  g.add(mesh(new THREE.BoxGeometry(w, h, 0.03), PAL.shirt, { ink: false }));
  for (const [bw, bh, bx, by] of [[w + f, f, 0, h / 2], [w + f, f, 0, -h / 2], [f, h + f, -w / 2, 0], [f, h + f, w / 2, 0], [w, 0.045, 0, 0], [0.045, h, 0, 0]]) {
    g.add(at(mesh(new THREE.BoxGeometry(bw, bh, 0.07), PAL.ink, { ink: false }), bx, by, 0.02));
  }
  g.add(at(mesh(new THREE.BoxGeometry(w + 0.2, 0.07, 0.14), PAL.ink), 0, -h / 2 - 0.06, 0.05)); // sill
  g.position.set(x, y, z);
  return g;
}

// ---------------- the broad tree D09 ----------------
// A tapered trunk with root flare and five visible branches under an open canopy of leaf
// clumps. Each clump's surface is raised into round lobes, so its outline is the drawing's
// scalloped leaf contour, not a smooth blob (P24-7 step 6).
export function scallopedClump(r, seed, { lobes: n = 13, detail = 4 } = {}) {
  const lobes = [];
  for (let i = 0; i < n; i++) { // Fibonacci directions, jittered per clump
    const y = 1 - (2 * (i + 0.5)) / n; const rad = Math.sqrt(1 - y * y); const a = i * 2.39996 + seed;
    lobes.push(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad).add(new THREE.Vector3(hash3(seed, i, 1) - 0.5, hash3(i, seed, 2) - 0.5, hash3(1, i, seed) - 0.5).multiplyScalar(0.35)).normalize());
  }
  const cosW = Math.cos(0.62 * Math.sqrt(13 / n)); // lobe half-width (wider when there are fewer)
  const geo = new THREE.IcosahedronGeometry(r, detail); // detail 4: fine enough that no facet shows in the bands
  return displace(geo, (d, v) => {
    let best = 0;
    for (const c of lobes) { const k = (d.dot(c) - cosW) / (1 - cosW); if (k > best) best = k; }
    const dome = Math.sqrt(Math.min(1, best)); // round-topped lobes meeting in creases
    return r * (-0.1 + 0.2 * dome) + (noise3(v.x * 3 + seed, v.y * 3, v.z * 3) - 0.5) * r * 0.05;
  });
}
export function broadTree() {
  const g = new THREE.Group();
  const bark = PAL.bark;
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(0.05, 0.8, 0), new THREE.Vector3(-0.02, 1.5, 0.02), new THREE.Vector3(0.04, 2.0, 0)]);
  g.add(mesh(taperTube(trunk, 0.34, 0.17, 18, 12), bark, { hatch: 1 }));
  const flare = at(mesh(lumpy(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0.05, 3, 4), bark), 0, -0.06, 0);
  flare.scale.set(1, 0.45, 1);
  g.add(flare);
  const branches = [
    [[0.02, 1.5, 0], [-0.6, 2.2, 0.1], [-1.3, 2.75, 0.15]],
    [[0.03, 1.7, 0], [0.55, 2.3, -0.05], [1.15, 2.9, 0]],
    [[0.03, 1.9, 0], [-0.15, 2.6, -0.3], [-0.35, 3.3, -0.4]],
    [[0.04, 1.9, 0], [0.3, 2.6, 0.35], [0.5, 3.2, 0.5]],
    [[0.0, 1.3, 0], [-0.5, 1.75, -0.2], [-0.95, 2.05, -0.35]],
  ];
  for (const b of branches) g.add(mesh(taperTube(new THREE.CatmullRomCurve3(b.map((p) => new THREE.Vector3(...p))), 0.13, 0.04, 12, 8), bark));
  const clumps = [
    [-1.5, 2.9, 0.2, 0.75], [-0.75, 3.35, 0.35, 0.85], [0.2, 3.55, 0.3, 0.9], [1.1, 3.2, 0.25, 0.8], [1.65, 2.75, 0.0, 0.62],
    [-1.25, 3.5, -0.5, 0.8], [-0.2, 3.9, -0.4, 0.85], [0.85, 3.75, -0.5, 0.78], [-1.9, 2.55, -0.25, 0.55],
    [-0.4, 3.0, 0.75, 0.62], [0.6, 2.85, 0.7, 0.58], [1.45, 2.45, 0.55, 0.45], [-1.15, 2.45, 0.6, 0.5],
    [0.15, 4.25, -0.1, 0.6], [-0.95, 4.05, 0.0, 0.55], [1.25, 3.85, 0.1, 0.5],
  ];
  clumps.forEach(([x, y, z, r], i) => {
    const geo = scallopedClump(r, i * 3.1);
    geo.scale(1, 0.86, 1);
    g.add(at(mesh(geo, i % 3 === 0 ? PAL.leafLight : PAL.leaf, { hatch: 1, noLight: 0.6 }), x, y, z));
  });
  return mergeByMaterial(g, 'D09_Tree');
}
export const TREE_TRUNK_R = 0.32;

// ---------------- logs and stones: piles, the head stack, delivered piles ----------------
// One log: bark round, light end grain with an ink ring stroke on each end, as a single mesh
// with vertex colours (one draw call, one ink hull).
const logCache = new Map();
export function logGeometry(r, len, seed = 0) {
  const key = `${r}|${len}|${seed}`;
  if (logCache.has(key)) return logCache.get(key);
  const parts = [];
  const add = (geo, color) => {
    geo.deleteAttribute('uv');
    let g2 = geo.index ? geo : mergeVertices(geo, 1e-6);
    const c = new THREE.Color(color); const n = g2.attributes.position.count;
    const col = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g2.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g2);
  };
  const side = new THREE.CylinderGeometry(r, r * 1.03, len, 14, 3, true);
  const sp = side.attributes.position; // a slightly knobbly round
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i); const z = sp.getZ(i); const y = sp.getY(i);
    const k = 1 + (noise3(x * 9 + seed, y * 5, z * 9) - 0.5) * 0.12;
    sp.setX(i, x * k); sp.setZ(i, z * k);
  }
  side.computeVertexNormals();
  add(side, PAL.wood);
  for (const s of [-1, 1]) {
    const cap = new THREE.CircleGeometry(r * 1.0, 14);
    cap.rotateX(s * -Math.PI / 2); cap.translate(0, s * len / 2, 0);
    add(cap, PAL.woodLight);
    const ring = new THREE.TorusGeometry(r * 0.55, Math.max(0.004, r * 0.06), 4, 16);
    ring.rotateX(Math.PI / 2); ring.translate(0, s * (len / 2 + 0.002), 0);
    add(ring, PAL.ink);
  }
  const g = mergeGeometries(parts, false);
  logCache.set(key, g);
  return g;
}
const vcol = () => toon(0xffffff, { vertexColors: true });
// a log lying along X
export function log(r, len, seed = 0) {
  const m = new THREE.Mesh(logGeometry(r, len, seed), vcol());
  m.rotation.z = Math.PI / 2;
  m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  return g;
}
const stoneCache = new Map();
export function stoneGeometry(r, seed = 0, detail = 2) { // detail 1: far, many (the border ring)
  const key = `${r}|${seed}|${detail}`;
  if (!stoneCache.has(key)) {
    const g = lumpy(new THREE.IcosahedronGeometry(r, detail), r * 0.18, 2.5 / r, seed * 5.3);
    g.scale(1.15, 0.72, 1);
    stoneCache.set(key, g);
  }
  return stoneCache.get(key);
}
export function stone(r, seed = 0) {
  const m = new THREE.Mesh(stoneGeometry(r, seed), toon(seed % 2 ? PAL.stone : mix(PAL.stone, PAL.paper, 0.18)));
  m.rotation.set(((seed % 3) - 1) * 0.12, seed * 1.3, ((seed % 2) - 0.5) * 0.16); // lying flat-ish, hand-placed
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------------- v0.9 stations: the fallen branch and the loose rocks ----------------
// A dead branch (A25-6, P25-5): four broken lengths of a tapering bough, laid end to end with a
// slight bend and a couple of side twigs, the base piece first. Each length is one wood unit; a
// gathered unit breaks the tip-most piece off. -> Group of `unit_i` children along X (centred).
const TWIG_ON = [1, 2];
export function branchPieces(units = 4, seed = 0) {
  const g = new THREE.Group();
  const len = 0.27;
  const total = units * len;
  let x = -total / 2;
  let yaw = 0;
  for (let i = 0; i < units; i++) {
    const r = 0.095 - i * 0.01;
    const piece = new THREE.Group();
    piece.name = `unit_${i}`;
    const l = log(r, len - 0.012, seed * 7 + i);
    piece.add(l);
    if (TWIG_ON.includes(i)) {
      const s = i === 1 ? 1 : -1;
      const twig = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, r * 0.6, 0), new THREE.Vector3(0.06, r + 0.04, s * 0.09), new THREE.Vector3(0.14, r + 0.06, s * 0.2),
      ]);
      piece.add(mesh(taperTube(twig, r * 0.38, 0.008, 8, 6), PAL.bark));
    }
    yaw += ((((seed * 31 + i * 17) % 7) - 3) * 0.035);
    piece.position.set(x + len / 2, r, 0);
    piece.rotation.y = yaw;
    g.add(piece);
    x += len * Math.cos(yaw);
  }
  return g;
}

// A loose rock (A25-7, P25-6): angular, light-gray stones, visibly unlike the rounded drawing
// stones D11/D12. One stone per stone unit (the rock shrinks as units are taken).
const shardCache = new Map();
export function shardGeometry(r, seed = 0) {
  const key = `${r}|${seed}`;
  if (shardCache.has(key)) return shardCache.get(key);
  let geo = mergeVertices(new THREE.DodecahedronGeometry(r, 0).deleteAttribute('normal').deleteAttribute('uv'), 1e-5);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.78 + 0.44 * hash3(p.getX(i) * 9 + seed, p.getY(i) * 9, p.getZ(i) * 9);
    p.setXYZ(i, p.getX(i) * k * 1.12, p.getY(i) * k * 0.7, p.getZ(i) * k);
  }
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  shardCache.set(key, geo);
  return geo;
}
export const ROCK_GRAY = mix(PAL.stone, PAL.paper, 0.38);
export function shard(r, seed = 0) {
  const m = new THREE.Mesh(shardGeometry(r, seed), toon(seed % 2 ? ROCK_GRAY : mix(ROCK_GRAY, PAL.ink, 0.08), { flatShading: true }));
  m.rotation.set(((seed % 3) - 1) * 0.2, seed * 1.7, ((seed % 2) - 0.5) * 0.3);
  m.position.y = r * 0.42;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
