// Direction-C props (spec §10.8, P24-7 pass 2), authored in code against the drawing and the
// §10.3 swatches in the same hand as hand.js: the broken slatted bench D10, the board raised
// bed D18, the blue shovel D13 and fan rake D14, the market crate with its hand-lettered tag and
// coin tin, the carried / delivered / sold units (cob, sunflower head, tomato, coin), the
// scattered border stones D11, the stepping-stone outlines D12, and the sky's spiral sun D22,
// check-mark birds D21 and the irregular horizon D23 drawn as pen strokes. Built edges stay
// crisp (wood, boards, tools); organic forms are smooth. Static parts merge per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, toon, toonMaterial } from './look.js';
import { at, hash3, log, lumpy, mergeByMaterial, mesh, mix, noise3, stone, stoneGeometry, taperTube } from './hand.js';
import { bake, blade, cobGeometry, paint, rng, sunflowerHeadGeometry, vmesh } from './flora.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// an ink pen stroke on a surface: a thin dark strip, no ink hull and no shadow of its own
const stroke = (w, h, d) => mesh(box(w, h, d), PAL.ink, { ink: false, shadow: false });

// ---------------- D10 bench: weathered, broken but sittable (before G2) ----------------
// Long axis X (1.5 m), front +Z. Two end frames (front leg up to the arm, back post up to the
// top rail, arm and apron), four seat slats, three back slats. Broken (§3 D10): the middle back
// slat hangs loose from its left end and the right front leg is short, propped on a stone.
export function bench({ broken = true } = {}) {
  const g = new THREE.Group();
  const weathered = broken ? mix(PAL.wood, PAL.stone, 0.22) : PAL.wood;
  const frame = mix(weathered, PAL.ink, 0.14);
  const r = rng(broken ? 3 : 4);
  const j = (a) => (r() - 0.5) * a;
  for (const x of [-0.7, 0.7]) {
    const short = broken && x > 0 ? 0.07 : 0;
    g.add(at(mesh(box(0.065, 0.62 - short, 0.065), frame), x, (0.62 + short) / 2, 0.19)); // front leg to the arm
    g.add(at(mesh(box(0.065, 0.9, 0.065), frame), x, 0.44, -0.2, -0.12, 0, 0)); // back post, leaning back
    g.add(at(mesh(box(0.07, 0.05, 0.5), frame), x, 0.64 + j(0.01), -0.01)); // arm
    g.add(at(mesh(box(0.05, 0.07, 0.42), frame), x, 0.38, -0.01)); // seat apron
    g.add(at(mesh(box(0.05, 0.05, 0.38), frame), x, 0.12, -0.01)); // low stretcher
  }
  for (let i = 0; i < 4; i++) { // seat slats, a little uneven
    const z = 0.15 - i * 0.105;
    g.add(at(mesh(box(1.5 + j(0.03), 0.035, 0.085), weathered, { hatch: 1 }), j(0.02), 0.44 + j(0.008), z, 0, j(0.02), j(0.01)));
    g.add(at(stroke(0.5 + r() * 0.4, 0.004, 0.008), j(0.4), 0.46, z + j(0.03), 0, j(0.06), 0)); // wood grain
  }
  for (let i = 0; i < 3; i++) { // back slats on the leaning posts
    const y = 0.58 + i * 0.12; const z = -0.215 - (y - 0.44) * 0.12;
    if (broken && i === 1) { // the loose slat: pinned at its left end, hanging toward the ground
      const s = new THREE.Group();
      s.add(at(mesh(box(1.42, 0.08, 0.03), weathered), 0.7, 0, 0));
      s.position.set(-0.7, y, z + 0.03); s.rotation.z = -0.42;
      g.add(s);
      continue;
    }
    g.add(at(mesh(box(1.5 + j(0.02), 0.08, 0.03), weathered, { hatch: 1 }), j(0.01), y, z, -0.12, 0, j(0.012)));
  }
  if (broken) { const st = stone(0.08, 5); st.position.set(0.7, 0.035, 0.19); g.add(st); }
  return mergeByMaterial(g, broken ? 'D10_Bench_Broken' : 'D10_Bench');
}

// ---------------- D18 raised bed: layered boards in perspective, soil ----------------
// 2.4 x 1.1 m, 0.42 m high (drawing-fitted to about 0.28 m, P23-4c): three planks a side with
// pen lines between them, square corner posts, lumpy soil with a few clods.
export const BED = { w: 2.4, d: 1.1, h: 0.42 };
export function raisedBed() {
  const g = new THREE.Group();
  const { w: W, d: D, h: H } = BED;
  const r = rng(8);
  const plank = (len, along, x, y, z) => {
    const geo = along === 'x' ? box(len, 0.13, 0.05) : box(0.05, 0.13, len);
    return at(mesh(geo, r() > 0.5 ? PAL.wood : mix(PAL.wood, PAL.woodLight, 0.35), { hatch: 1 }), x, y, z, 0, (r() - 0.5) * 0.006, (r() - 0.5) * 0.008);
  };
  for (let k = 0; k < 3; k++) {
    const y = 0.07 + k * 0.135;
    g.add(plank(W - 0.04, 'x', 0, y, D / 2), plank(W - 0.04, 'x', 0, y, -D / 2), plank(D - 0.06, 'z', W / 2, y, 0), plank(D - 0.06, 'z', -W / 2, y, 0));
    if (k) { // pen lines between the boards (front and the right end, the faces the camera sees)
      g.add(at(stroke(W - 0.1, 0.012, 0.012), 0, y - 0.067, D / 2 + 0.024));
      g.add(at(stroke(0.012, 0.012, D - 0.1), W / 2 + 0.024, y - 0.067, 0));
      g.add(at(stroke(0.012, 0.012, D - 0.1), -W / 2 - 0.024, y - 0.067, 0));
    }
  }
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) g.add(at(mesh(box(0.075, H + 0.04, 0.075), mix(PAL.wood, PAL.ink, 0.16)), x, (H + 0.04) / 2, z));
  const soil = new THREE.PlaneGeometry(W - 0.08, D - 0.08, 18, 8);
  soil.rotateX(-Math.PI / 2);
  const p = soil.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, (noise3(p.getX(i) * 4, 0, p.getZ(i) * 4) - 0.5) * 0.035);
  soil.computeVertexNormals();
  g.add(at(mesh(soil, PAL.soil, { hatch: 1 }), 0, H - 0.05, 0));
  for (let k = 0; k < 7; k++) { // clods
    const c = lumpy(new THREE.IcosahedronGeometry(0.03 + r() * 0.02, 1), 0.006, 40, k);
    c.scale(1.2, 0.6, 1);
    g.add(at(mesh(c, mix(PAL.soil, PAL.ink, 0.15)), (r() - 0.5) * (W - 0.3), H - 0.04, (r() - 0.5) * (D - 0.3)));
  }
  return mergeByMaterial(g, 'D18_RaisedBed');
}

// ---------------- D13 shovel and D14 rake: BLUE, leaning by the side wall ----------------
// Built upright with the working end on the ground; the drawing's dark grip at the top of each
// handle. A rounded, slightly cupped spade blade; a fan of spring tines with a cross brace.
export function tool(kind) {
  const g = new THREE.Group();
  const blue = PAL.tool; const grip = mix(PAL.tool, PAL.ink, 0.45); const steel = mix(PAL.tool, PAL.ink, 0.18);
  const handle = new THREE.Mesh(taperTube(new THREE.LineCurve3(V(0, 0.3, 0), V(0, 1.5, 0)), 0.021, 0.019, 4, 9), toon(blue));
  const gripM = new THREE.Mesh(taperTube(new THREE.LineCurve3(V(0, 1.47, 0), V(0, 1.63, 0)), 0.026, 0.024, 2, 9), toon(grip));
  g.add(handle, gripM);
  g.add(new THREE.Mesh(taperTube(new THREE.LineCurve3(V(0, 0.25, 0), V(0, 0.36, 0)), 0.038, 0.026, 2, 9), toon(steel))); // socket
  if (kind === 'shovel') {
    const s = new THREE.Shape();
    s.moveTo(-0.12, 0.27); s.lineTo(0.12, 0.27);
    s.bezierCurveTo(0.13, 0.12, 0.1, 0.03, 0, 0.0);
    s.bezierCurveTo(-0.1, 0.03, -0.13, 0.12, -0.12, 0.27);
    const bl = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 10 });
    bl.translate(0, 0, -0.005);
    const bp = bl.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setZ(i, bp.getZ(i) + 0.05 * (bp.getX(i) / 0.12) ** 2); // cupped
    bl.computeVertexNormals();
    g.add(new THREE.Mesh(bl, toon(blue, { flatShading: false })));
  } else {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) - 0.5;
      const pts = [V(t * 0.04, 0.3, 0), V(t * 0.2, 0.15, 0.005), V(t * 0.34, 0.03, 0.02), V(t * 0.35, 0.0, 0.05)];
      g.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 0.0065, 0.005, 6, 5), toon(blue)));
    }
    const brace = new THREE.CatmullRomCurve3([V(-0.12, 0.15, 0.005), V(0, 0.17, 0.006), V(0.12, 0.15, 0.005)]);
    g.add(new THREE.Mesh(taperTube(brace, 0.007, 0.007, 8, 5), toon(steel)));
  }
  g.rotation.z = kind === 'shovel' ? 0.12 : -0.1; // the lean (kept by the merge)
  return mergeByMaterial(g, kind === 'shovel' ? 'D13_Shovel' : 'D14_Rake');
}

// ---------------- the market crate (A22 / P): slatted, hand-lettered tag, coin tin ----------------
// 0.85 x 0.5 x 0.6 m; sold crops rest on a bed of straw at the brim (carry.js crateSlot).
let tagTex = null;
function tagTexture() {
  if (tagTex) return tagTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 140;
  const x = c.getContext('2d');
  x.fillStyle = '#fff7e5'; x.fillRect(0, 0, 256, 140);
  x.strokeStyle = '#253347'; x.lineWidth = 6; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(8, 10); x.lineTo(247, 6); x.lineTo(250, 131); x.lineTo(6, 134); x.closePath(); x.stroke();
  x.beginPath(); x.arc(28, 30, 9, 0, Math.PI * 2); x.stroke(); // the string hole
  x.fillStyle = '#253347';
  x.font = 'italic 600 54px "Segoe Print", "Comic Neue", "Bradley Hand", "Marker Felt", cursive';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.save(); x.translate(136, 82); x.rotate(-0.05); x.fillText('For sale', 0, 0); x.restore();
  tagTex = new THREE.CanvasTexture(c);
  tagTex.colorSpace = THREE.SRGBColorSpace;
  tagTex.anisotropy = 4;
  return tagTex;
}
export function crate() {
  const g = new THREE.Group();
  const W = 0.85; const H = 0.5; const D = 0.6;
  const r = rng(13);
  const slat = PAL.woodLight; const post = PAL.wood;
  for (let k = 0; k < 3; k++) {
    const y = 0.07 + k * 0.165;
    for (const z of [D / 2 - 0.012, -D / 2 + 0.012]) g.add(at(mesh(box(W - 0.06, 0.11, 0.024), slat), 0, y + (r() - 0.5) * 0.008, z, 0, 0, (r() - 0.5) * 0.012));
    for (const x of [W / 2 - 0.012, -W / 2 + 0.012]) g.add(at(mesh(box(0.024, 0.11, D - 0.06), slat), x, y + (r() - 0.5) * 0.008, 0));
  }
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) for (const z of [-D / 2 + 0.03, D / 2 - 0.03]) g.add(at(mesh(box(0.06, H, 0.06), post), x, H / 2, z));
  g.add(at(mesh(box(W - 0.05, 0.025, D - 0.05), post), 0, 0.012, 0)); // floor
  const straw = lumpy(new THREE.BoxGeometry(W - 0.08, 0.08, D - 0.08, 8, 1, 6), 0.012, 20, 2);
  g.add(at(mesh(straw, mix(PAL.flower, PAL.wood, 0.45)), 0, H - 0.06, 0));
  // coin tin on the near-left corner of the brim, three coins showing
  const tinC = mix(PAL.cap, PAL.stone, 0.35);
  g.add(at(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 18), tinC), -0.27, H + 0.035, 0.12));
  g.add(at(mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 18), mix(tinC, PAL.ink, 0.3)), -0.27, H + 0.07, 0.12, Math.PI / 2, 0, 0));
  for (let k = 0; k < 3; k++) g.add(at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 12), PAL.coin), -0.29 + k * 0.022, H + 0.072 + k * 0.004, 0.11 + (k % 2) * 0.02, 0.2, 0, 0.15 * k));
  const merged = mergeByMaterial(g, 'MarketCrate');
  // the paper tag hangs on a string from the front rim, a little askew
  const tag = new THREE.Group(); tag.name = 'tag';
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.13), new THREE.MeshBasicMaterial({ map: tagTexture() }));
  card.position.set(0, -0.08, 0.004); card.userData.noOutline = true;
  const back = mesh(box(0.235, 0.125, 0.004), PAL.paper, { shadow: true });
  back.position.set(0, -0.08, 0);
  const string = new THREE.Mesh(taperTube(new THREE.LineCurve3(V(-0.09, -0.04, 0.003), V(-0.13, 0.02, 0)), 0.003, 0.003, 1, 4), toon(PAL.ink));
  string.userData.noOutline = true;
  tag.add(card, back, string);
  tag.position.set(0.18, H - 0.02, D / 2 + 0.02); tag.rotation.set(-0.08, 0, 0.09);
  merged.add(tag);
  return merged;
}

// ---------------- units: carried, delivered and sold (one model each, V1) ----------------
let unitGeos = null;
function unitGeometries() {
  if (unitGeos) return unitGeos;
  const cob = cobGeometry().clone(); cob.translate(0, -0.12, 0); cob.rotateZ(-Math.PI / 2); // lying along X
  const tom = new THREE.SphereGeometry(0.062, 12, 9);
  const tp = tom.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) { // a squat, softly lobed tomato
    v.fromBufferAttribute(tp, i);
    const k = 1 + 0.05 * Math.cos(5 * Math.atan2(v.z, v.x)) * (1 - Math.abs(v.y) / 0.062);
    tp.setXYZ(i, v.x * k, v.y * 0.84, v.z * k);
  }
  const tparts = [paint(tom, PAL.tomato)];
  for (let k = 0; k < 5; k++) { // green star calyx and a stub of stem
    const a = (k / 5) * Math.PI * 2; const d = V(Math.cos(a), 0, Math.sin(a));
    tparts.push(paint(blade([V(0, 0.052, 0), d.clone().multiplyScalar(0.025).setY(0.055), d.clone().multiplyScalar(0.045).setY(0.044)], { width: (s) => 0.009 * Math.sin(Math.PI * s) ** 0.6, across: V(-d.z, 0, d.x), thick: 0.3, cup: 0, segs: 3, radial: 4 }), PAL.leaf));
  }
  tparts.push(paint(taperTube(new THREE.LineCurve3(V(0, 0.05, 0), V(0.006, 0.075, 0)), 0.006, 0.005, 1, 5), mix(PAL.leaf, PAL.ink, 0.2)));
  // a gold coin with a raised rim and a small pencil embossed on its face (§10.3 icon)
  const coin = [paint(new THREE.CylinderGeometry(0.07, 0.07, 0.022, 20), PAL.coin)];
  const rim = new THREE.TorusGeometry(0.062, 0.005, 3, 18); rim.rotateX(Math.PI / 2); rim.translate(0, 0.011, 0);
  coin.push(paint(rim, mix(PAL.coin, PAL.wood, 0.3)));
  const pencil = new THREE.BoxGeometry(0.07, 0.004, 0.014); pencil.rotateY(0.6); pencil.translate(0.004, 0.012, -0.003);
  const tip = new THREE.ConeGeometry(0.008, 0.02, 4); tip.rotateZ(Math.PI / 2); tip.rotateY(0.6); tip.translate(-0.034, 0.012, 0.021);
  coin.push(paint(pencil, mix(PAL.coin, PAL.wood, 0.45)), paint(tip, mix(PAL.coin, PAL.wood, 0.45)));
  unitGeos = { C: cob, T: bake(tparts), S: sunflowerHeadGeometry(0.1, true), coins: bake(coin) };
  return unitGeos;
}
// W twig (the pile's log, smaller), R stone, C cob, S sunflower head (faces +Z), T tomato, coins
export function unitMesh(res) {
  if (res === 'W') return log(0.03, 0.42, 7);
  if (res === 'R') return stone(0.05, 3);
  const geo = unitGeometries()[res] ?? unitGeometries().coins;
  return vmesh(geo);
}

// ---------------- D11 border stones: scattered, toppled, half-sunk (before G4) ----------------
// One rounded grey stone per place, from the piles' stone model; all of them merged per colour.
export function borderStones(places) {
  const g = new THREE.Group();
  places.forEach(({ pos, seed }) => {
    const r = 0.12 + (seed % 5) * 0.015;
    const m = new THREE.Mesh(stoneGeometry(r, seed % 6, 1), toon(seed % 3 ? PAL.stone : mix(PAL.stone, PAL.paper, 0.16)));
    m.scale.set(1.15, 0.85 + (seed % 3) * 0.08, 1);
    m.rotation.set(((seed % 3) - 1) * 0.3, seed * 0.9, ((seed % 4) - 1.5) * 0.18); // tilted, toppled
    m.position.copy(pos).setY(r * 0.32 - (seed % 2) * 0.02); // half-sunk
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  });
  return mergeByMaterial(g, 'D11_BorderStones');
}

// ---------------- D11 border stones settled into the ring (G4) ----------------
// The same rounded grey stones, upright and evenly bedded along the drawn ring (A22: G4 arranges
// them), keeping the path-facing gap between the two drawn runs.
export function borderRing(places) {
  const g = new THREE.Group();
  places.forEach(({ pos, seed }) => {
    const r = 0.13 + (seed % 4) * 0.012;
    const m = new THREE.Mesh(stoneGeometry(r, seed % 6, 1), toon(seed % 3 ? PAL.stone : mix(PAL.stone, PAL.paper, 0.16)));
    m.scale.set(1.2, 0.95, 1);
    m.rotation.set(0, seed * 0.7, 0);
    m.position.copy(pos).setY(r * 0.42);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  });
  return mergeByMaterial(g, 'D11_BorderRing');
}

// ---------------- D12 stepping stones (G3): flat irregular grey ovals set in the ground ----------------
export function steppingStone(i) {
  const geo = stoneGeometry(0.2, 11 + i, 2).clone();
  geo.scale(1.25, 0.3, 1);
  const m = new THREE.Mesh(geo, toon(i % 2 ? PAL.stone : mix(PAL.stone, PAL.paper, 0.14), { hatch: 1 }));
  m.position.y = 0.02; m.rotation.y = i * 0.6;
  m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.name = `D12_Stone_${i}`; g.add(m);
  return g;
}

// ---------------- D08 path (G1): a gravel ribbon between the two drawn edges ----------------
// left/right: matching arrays of ground points along the path; a few pebble dots and the two
// edges as solid pen lines (the blueprint's dashed edges hide once it is laid).
export function gravelPath(left, right) {
  const pos = []; const idx = [];
  for (let i = 0; i < left.length; i++) pos.push(left[i].x, 0.012, left[i].z, right[i].x, 0.012, right[i].z);
  for (let i = 0; i < left.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const ribbon = new THREE.Mesh(geo, toon(mix(PAL.stone, PAL.paper, 0.5), { grain: 1, flat: 1, side: THREE.DoubleSide }));
  ribbon.receiveShadow = true; ribbon.castShadow = false; ribbon.userData.noOutline = true;
  ribbon.name = 'D08_Path_Gravel';
  const g = new THREE.Group(); g.name = 'D08_Path'; g.add(ribbon);
  const r = rng(81);
  const dots = [];
  for (let i = 1; i < left.length - 1; i++) {
    for (let k = 0; k < 2; k++) {
      const t = 0.15 + r() * 0.7;
      const p = left[i].clone().lerp(right[i], t);
      const d = new THREE.CircleGeometry(0.025 + r() * 0.02, 6);
      d.rotateX(-Math.PI / 2); d.translate(p.x, 0.016, p.z);
      dots.push(d);
    }
  }
  const pebbles = new THREE.Mesh(mergeGeometries(dots, false), toon(mix(PAL.stone, PAL.ink, 0.25), { flat: 1 }));
  pebbles.userData.noOutline = true; pebbles.castShadow = false; pebbles.receiveShadow = true;
  g.add(pebbles);
  for (const edge of [left, right]) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge.map((q) => q.clone().setY(0.02))), new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0.75 }));
    line.userData.noFit = true;
    g.add(line);
  }
  return g;
}

// ---------------- the hidden bench's footprint (P25-3) ----------------
// With the blueprint off, the broken bench is not drawn but still blocks her: a faint ink
// footprint on the ground shows where it stands, so nothing invisible blocks her.
export function benchFootprint() {
  const w = 0.8; const d = 0.3; const rr = 0.09;
  const sh = new THREE.Shape();
  sh.moveTo(-w + rr, -d); sh.lineTo(w - rr, -d); sh.quadraticCurveTo(w, -d, w, -d + rr); sh.lineTo(w, d - rr);
  sh.quadraticCurveTo(w, d, w - rr, d); sh.lineTo(-w + rr, d); sh.quadraticCurveTo(-w, d, -w, d - rr);
  sh.lineTo(-w, -d + rr); sh.quadraticCurveTo(-w, -d, -w + rr, -d);
  const pts = sh.getSpacedPoints(48).slice(0, -1);
  const m = strokeMesh([strokeGeometry(pts, 0.03, true)], 0.4);
  m.rotation.x = -Math.PI / 2; m.position.y = 0.015;
  const g = new THREE.Group(); g.name = 'D10_Bench_Footprint'; g.add(m);
  return g;
}

// ---------------- D20 grass sprouts: fine pen marks (green in the finale) ----------------
// Small tufts of three or four upright strokes in the XY plane (facing the drawing camera);
// distinct from the broad removable weed clumps. One mesh per tuft, so each can turn green
// as the finale's grass reaches it.
export function sprout(seed) {
  const r = rng(200 + seed);
  const geos = [];
  const n = 3 + (seed % 2);
  for (let k = 0; k < n; k++) {
    const x0 = (k - (n - 1) / 2) * 0.035 + (r() - 0.5) * 0.02;
    const h = 0.09 + r() * 0.07; const lean = (k - (n - 1) / 2) * 0.03 + (r() - 0.5) * 0.02;
    const pts = [];
    for (let s = 0; s <= 5; s++) { const t = s / 5; pts.push(new THREE.Vector2(x0 + lean * t * t, h * t)); }
    geos.push(strokeGeometry(pts, (t) => 0.012 * (1 - 0.7 * t)));
  }
  const m = new THREE.Mesh(mergeGeometries(geos, false), new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.DoubleSide }));
  m.userData.noOutline = true; m.userData.noFit = true;
  const g = new THREE.Group(); g.name = `D20_Sprout_${seed}`; g.add(m);
  return g;
}

// ---------------- pen strokes on paper: stepping outlines, sun, birds, horizon ----------------
const toonMaterialFor = (c) => toonMaterial({ color: c, grain: 1, flat: 1, noLight: 1, transparent: true, opacity: 0 });
const inkBasic = (opacity = 1) => new THREE.MeshBasicMaterial({ color: PAL.ink, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity >= 1 });
// a flat stroke along a 2D polyline in the XY plane; width may vary along it (w(s), s in [0,1])
export function strokeGeometry(pts, w, closed = false) {
  const n = pts.length; const pos = []; const idx = [];
  const wf = typeof w === 'function' ? w : () => w;
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]; const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b.x - a.x; let dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const hw = wf(i / (n - 1)) / 2;
    pos.push(pts[i].x - dy * hw, pts[i].y + dx * hw, 0, pts[i].x + dy * hw, pts[i].y - dx * hw, 0);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) { const a = i * 2; const b = ((i + 1) % n) * 2; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
function strokeMesh(geos, opacity = 1) {
  const m = new THREE.Mesh(mergeGeometries(geos, false), inkBasic(opacity));
  m.userData.noOutline = true; m.userData.noFit = true;
  return m;
}
// D12 stepping-stone outline: one irregular drawn oval on the ground, faint ink (§10.4)
export function steppingOutline(i) {
  const pts = [];
  const n = 26;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const rr = 0.22 * (1 + 0.12 * (hash3(i, k % 7, 3) - 0.5) + 0.08 * Math.sin(a * 3 + i));
    pts.push(new THREE.Vector2(Math.cos(a) * rr * 1.3, Math.sin(a) * rr));
  }
  const m = strokeMesh([strokeGeometry(pts, 0.032, true)], 0.55);
  m.rotation.x = -Math.PI / 2; m.position.y = 0.015;
  const g = new THREE.Group(); g.name = `D12_Stones_Outline_${i}`; g.add(m);
  return g;
}
// D22: a hand-drawn spiral inside an uneven circle, with long irregular rays. `maxLen(a)` (local
// units) ends each ray at the composition edge (P23-4b).
export function sun(radius, maxLen = () => Infinity) {
  const R = radius; const w = R * 0.045;
  const geos = [];
  const spiral = [];
  const turns = 3.3; const n = 160;
  for (let k = 0; k <= n; k++) {
    const t = k / n; const a = t * turns * Math.PI * 2 + 0.6;
    const rr = R * (0.08 + 0.8 * t) * (1 + 0.04 * Math.sin(a * 2.3));
    spiral.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
  }
  geos.push(strokeGeometry(spiral, w));
  const ring = [];
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2; const rr = R * (1 + 0.035 * Math.sin(a * 3 + 1) + 0.02 * Math.sin(a * 7));
    ring.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
  }
  geos.push(strokeGeometry(ring, w * 1.1, true));
  const r = rng(22);
  for (let k = 0; k < 13; k++) {
    const a = (k / 13) * Math.PI * 2 + (r() - 0.5) * 0.25;
    const r0 = R * (1.2 + r() * 0.15);
    const len = Math.min(R * (2.2 + r() * 1.4), maxLen(a) - r0);
    if (len < R * 0.5) continue;
    const pts = [];
    for (let s = 0; s <= 8; s++) {
      const d = r0 + (len * s) / 8; const bend = Math.sin((s / 8) * Math.PI) * R * 0.05 * (k % 2 ? 1 : -1);
      pts.push(new THREE.Vector2(Math.cos(a) * d - Math.sin(a) * bend, Math.sin(a) * d + Math.cos(a) * bend));
    }
    geos.push(strokeGeometry(pts, (s) => w * (1 - 0.55 * s)));
  }
  const g = new THREE.Group(); g.name = 'D22_Sun';
  const strokes = strokeMesh(geos);
  strokes.name = 'D22_SunInk';
  // the finale's fill (P25-2): the disc fills with the flower yellow, paper grain over it; it
  // sits just behind the pen strokes and is see-through until then
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R * 1.02, 48), toonMaterialFor(PAL.flower));
  disc.position.z = -R * 0.01;
  disc.name = 'D22_SunDisc'; disc.userData.noOutline = true; disc.userData.noFit = true;
  disc.visible = false;
  g.add(disc, strokes);
  return g;
}
// D21: four check-mark birds, each two curved wing strokes
export function birds(size) {
  const geos = [];
  for (const [x, y, s, tilt] of [[0, 0, 1, 0.05], [0.9, 0.35, 0.8, -0.1], [1.7, -0.1, 0.9, 0.12], [0.6, -0.6, 0.75, -0.05]]) {
    for (const side of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8; const L = (side < 0 ? 0.24 : 0.3) * s;
        const px = side * t * L; const py = t * L * 0.55 + Math.sin(t * Math.PI) * L * 0.18 - t * t * L * 0.15;
        pts.push(new THREE.Vector2((x + px * Math.cos(tilt) - py * Math.sin(tilt)) * size, (y + px * Math.sin(tilt) + py * Math.cos(tilt)) * size));
      }
      geos.push(strokeGeometry(pts, (t) => size * 0.05 * (1 - 0.5 * t)));
    }
  }
  const g = new THREE.Group(); g.name = 'D21_Birds';
  g.add(strokeMesh(geos));
  return g;
}
// D23: one irregular pen line along the ground's far edge, with the drawing's gentle swell
export function horizon(halfW) {
  const pts = [];
  for (let x = -halfW; x <= halfW + 1e-6; x += 0.8) {
    const y = 0.04 + (noise3(x * 0.35, 0.5, 2) - 0.5) * 0.12 + 0.05 * Math.exp(-(((x - 3) / 6) ** 2));
    pts.push(V(x, y, (noise3(x * 0.5, 1.5, 4) - 0.5) * 0.2));
  }
  const m = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 0.03, 0.03, pts.length, 4), new THREE.MeshBasicMaterial({ color: PAL.ink }));
  m.name = 'D23_Horizon'; m.userData.noOutline = true; m.userData.noFit = true;
  return m;
}
