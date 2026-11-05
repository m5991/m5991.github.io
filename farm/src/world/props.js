// Direction-C props (spec §10.8, P24-7 pass 2), authored in code against the drawing and the
// §10.3 swatches in the same hand as hand.js: the broken slatted bench D10, the board raised
// bed D18, the blue shovel D13 and fan rake D14, the yard-sale table, its sign and buyers (v0.12), the carried / delivered / sold units (cob, sunflower head, tomato, coin), the
// scattered border stones D11, the stepping-stone outlines D12, and the sky's spiral sun D22,
// check-mark birds D21 and the irregular horizon D23 drawn as pen strokes. Built edges stay
// crisp (wood, boards, tools); organic forms are smooth. Static parts merge per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, toon, toonMaterial } from './look.js';
import { at, hash3, log, lumpy, mergeByMaterial, mesh, mix, noise3, stone, stoneGeometry, taperTube } from './hand.js';
import { bake, blade, cobGeometry, paint, rng, sunflowerHeadGeometry, vmesh } from './flora.js';
import { LOOKS } from '../game/crowd.js';

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
  // the lean (kept by the merge). v0.16 (captain: "The Shovel and Rake both lean to the left on
  // the side of the house", as the original drawing has them): both tops to the left, onto the wall
  g.rotation.z = kind === 'shovel' ? 0.2 : 0.17;
  return mergeByMaterial(g, kind === 'shovel' ? 'D13_Shovel' : 'D14_Rake');
}

// ---------------- v0.12 the yard-sale table, its sign and the buyers ----------------
// (captain 2026-11-02: "yard sale. she puts the goods on the table and accumulates, then she puts
// the sign and when she has a certain amount people come and the goods disappear")
// A small trestle table, 1.0 x 0.55 m and 0.62 m high, in the drawing's hand: two crossed-leg
// trestles, three top boards with pen lines between them and a cream cloth with a red hand-drawn
// check draped over the front edge. The goods sit on the cloth (carry.js tableSlot).
export const TABLE = { w: 1.0, d: 0.55, h: 0.62 };
let clothTex = null;
function clothTexture() {
  if (clothTex) return clothTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#f6ead0'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(181, 62, 54, 0.55)'; x.lineWidth = 5;
  for (let i = 8; i < 128; i += 26) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 2, 128); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(128, i - 2); x.stroke();
  }
  clothTex = new THREE.CanvasTexture(c);
  clothTex.colorSpace = THREE.SRGBColorSpace;
  clothTex.wrapS = clothTex.wrapT = THREE.RepeatWrapping;
  clothTex.repeat.set(2, 1.2);
  return clothTex;
}
export function yardTable() {
  const g = new THREE.Group();
  const { w: W, d: D, h: H } = TABLE;
  const r = rng(21);
  const leg = mix(PAL.wood, PAL.ink, 0.1);
  for (const x of [-W / 2 + 0.14, W / 2 - 0.14]) { // two trestles, legs crossed in an X
    for (const s of [-1, 1]) g.add(at(mesh(box(0.04, H * 1.12, 0.04), leg), x, H / 2 - 0.02, 0, s * 0.36, 0, 0));
    g.add(at(mesh(box(0.04, 0.035, D * 0.72), leg), x, H * 0.5, 0)); // the crossbar where they meet
  }
  for (let k = 0; k < 3; k++) { // three top boards, a little uneven
    const z = -D / 2 + D / 6 + (k * D) / 3;
    g.add(at(mesh(box(W + (r() - 0.5) * 0.02, 0.035, D / 3 - 0.012), PAL.woodLight, { hatch: 1 }), (r() - 0.5) * 0.01, H, z, 0, (r() - 0.5) * 0.01, 0));
    if (k) g.add(at(stroke(W * 0.96, 0.004, 0.006), 0, H + 0.019, z - D / 6));
  }
  const merged = mergeByMaterial(g, 'YardTable');
  // the cloth: a thin sheet over the top, draped down the front (its own textured material)
  const clothMat = new THREE.MeshLambertMaterial({ map: clothTexture() });
  const top = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.008, D * 0.9), clothMat);
  top.position.set(0, H + 0.022, 0);
  const drape = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.16, 0.008), clothMat);
  drape.position.set(0, H - 0.06, D * 0.45 + 0.004); drape.rotation.x = 0.06;
  for (const m of [top, drape]) { m.castShadow = true; m.receiveShadow = true; }
  merged.add(top, drape);
  return merged;
}

// the hand-lettered "Yard Sale!" board (in the title's pencil hand, assets/fonts/), redrawn
// once the font has loaded
let signTex = null;
function drawSign(c) {
  const x = c.getContext('2d');
  x.fillStyle = '#fff7e5'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#253347'; x.lineWidth = 7; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(10, 12); x.lineTo(c.width - 8, 8); x.lineTo(c.width - 12, c.height - 10); x.lineTo(8, c.height - 6); x.closePath(); x.stroke();
  x.fillStyle = '#253347';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 96px "Pencil Title", "Segoe Print", "Bradley Hand", cursive';
  x.save(); x.translate(c.width / 2, c.height * 0.36); x.rotate(-0.04); x.fillText('Yard', 0, 0); x.restore();
  x.fillStyle = '#b53e36';
  x.save(); x.translate(c.width / 2 + 6, c.height * 0.72); x.rotate(-0.03); x.fillText('Sale!', 0, 0); x.restore();
}
function signTexture() {
  if (signTex) return signTex;
  const c = document.createElement('canvas'); c.width = 320; c.height = 280;
  drawSign(c);
  signTex = new THREE.CanvasTexture(c);
  signTex.colorSpace = THREE.SRGBColorSpace;
  signTex.anisotropy = 4;
  document.fonts?.load('96px "Pencil Title"').then(() => { drawSign(c); signTex.needsUpdate = true; }).catch(() => {});
  return signTex;
}
// v0.16 (captain: "The yard sale sign should be on the north side of the table, be on a stick and
// be three times as big"): a lettered board on a stick pushed into the ground, in model metres a
// 0.6 x 0.5 board whose bottom edge is 0.55 up a rough wooden stick; the world draws it at
// SIGN_SCALE (3), so its face is about three times the v0.15 A-frame's (0.61 m across then, 1.8
// m now) and its board stands above Vanessa's head behind the tables. Lettered on its front (+Z).
export const SIGN = { w: 0.6, h: 0.5, foot: 0.55 };
export function saleSign() {
  const g = new THREE.Group();
  const post = mix(PAL.wood, PAL.ink, 0.12);
  const { w, h, foot } = SIGN;
  g.add(new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3([V(0, -0.05, -0.02), V(0.006, foot * 0.6, -0.02), V(-0.004, foot + h * 0.85, -0.02)]), 0.022, 0.017, 6, 7), toon(post)));
  g.add(at(mesh(box(w, h, 0.025), PAL.woodLight), 0, foot + h / 2, 0, 0, 0, 0.015)); // the board
  g.add(at(mesh(box(w + 0.03, 0.03, 0.03), post), 0, foot + h - 0.005, 0.004, 0, 0, 0.015)); // its top lath
  for (const x of [-w * 0.32, w * 0.32]) g.add(at(stroke(0.014, 0.014, 0.01), x, foot + h * 0.88, 0.016)); // nail heads
  const merged = mergeByMaterial(g, 'SaleSign');
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.05, h - 0.06), new THREE.MeshBasicMaterial({ map: signTexture() }));
  face.userData.noOutline = true;
  face.position.set(0, foot + h / 2, 0.0135);
  face.rotation.z = 0.015;
  merged.add(face);
  return merged;
}

// a neighbour (v0.13, captain: "the clients are always the same and blocky ... make them more
// random"): one of the crowd's looks (game/crowd.js personLook), in the drawing's hand with smooth
// rounded forms: a lathe-turned shirt or dress, tapered arms with round hands, a round head with
// dot eyes, one of six hair styles or a straw hat, cap or beanie, rounded shoes, and a basket or a
// tote on the right arm. Built for a 1.6 m adult and scaled to `look.height` (a kid keeps a
// larger head). Named groups `legL`, `legR`, `armL`, `armR` swing and `body` bobs as they walk;
// `userData.basket` is where their goods fly to (local). Faces +Z.
const lathe = (pts, segs = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
export function buyer(look) {
  const L = typeof look === 'number' ? LOOKS[look % LOOKS.length] : look ?? { n: 0, height: 1.6, build: 1, skin: PAL.skin, hair: PAL.hair, hairStyle: 'short', hat: null, hatColour: PAL.flower, top: PAL.denim, bottom: PAL.charcoal, dress: false, carry: 'basket', kid: false };
  const root = new THREE.Group(); root.name = `Buyer_${L.n ?? 0}`;
  const w = L.build; // shoulders and hips
  const kid = L.kid;
  const headR = kid ? 0.15 : 0.115;
  const hipY = kid ? 0.66 : 0.82; // in the 1.6 m frame (a kid's legs are shorter for its height)
  const shoulderY = kid ? 1.16 : 1.3;
  const headY = shoulderY + 0.07 + headR * 0.95;
  const body = new THREE.Group(); body.name = 'body';
  // the shirt (or the dress, down past the knees), turned on a lathe: waist in, shoulders round
  const top = L.dress
    ? lathe([[0.0, hipY - 0.42], [0.2 * w, hipY - 0.42], [0.17 * w, hipY - 0.1], [0.13 * w, hipY + 0.12], [0.12 * w, hipY + 0.2], [0.15 * w, shoulderY - 0.16], [0.16 * w, shoulderY - 0.05], [0.1 * w, shoulderY + 0.03], [0.04, shoulderY + 0.05], [0, shoulderY + 0.05]])
    : lathe([[0.0, hipY - 0.03], [0.135 * w, hipY - 0.03], [0.14 * w, hipY + 0.06], [0.125 * w, hipY + 0.2], [0.15 * w, shoulderY - 0.14], [0.16 * w, shoulderY - 0.05], [0.1 * w, shoulderY + 0.03], [0.04, shoulderY + 0.05], [0, shoulderY + 0.05]]);
  top.scale(1, 1, 0.78);
  body.add(mesh(top, L.top));
  if (!L.dress) body.add(mesh(lathe([[0, hipY - 0.1], [0.13 * w, hipY - 0.1], [0.14 * w, hipY], [0.12 * w, hipY + 0.04], [0, hipY + 0.04]]).scale(1, 1, 0.8), L.bottom)); // the trousers' seat
  body.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 10), L.skin), 0, shoulderY + 0.07, 0)); // neck
  // the head: a soft egg with dot eyes and a small smile (drawn lines, no ink hull)
  const head = new THREE.SphereGeometry(headR, 16, 12); head.scale(0.94, 1.04, 0.94);
  body.add(at(mesh(head, L.skin), 0, headY, 0.0));
  for (const s of [-1, 1]) body.add(at(mesh(new THREE.SphereGeometry(headR * 0.11, 6, 5), PAL.ink, { ink: false, shadow: false }), s * headR * 0.36, headY + headR * 0.12, headR * 0.86));
  const smile = new THREE.TorusGeometry(headR * 0.26, headR * 0.035, 3, 10, Math.PI * 0.8);
  body.add(at(mesh(smile, PAL.mouth, { ink: false, shadow: false }), 0, headY - headR * 0.3, headR * 0.84, 0, 0, Math.PI * 1.1));
  // hair
  const cap = (k = 1.08, cut = 0.55) => new THREE.SphereGeometry(headR * k, 14, 8, 0, Math.PI * 2, 0, Math.PI * cut);
  const hairStyle = L.hat === 'straw' || L.hat === 'scarf' ? (L.hairStyle === 'braid' || L.hairStyle === 'ponytail' ? L.hairStyle : 'none') : L.hairStyle;
  if (hairStyle !== 'bald' && hairStyle !== 'none') body.add(at(mesh(cap(1.08, hairStyle === 'curly' ? 0.5 : 0.56), L.hair), 0, headY + headR * 0.02, -headR * 0.06, -0.25, 0, 0));
  if (hairStyle === 'bun') body.add(at(mesh(new THREE.SphereGeometry(headR * 0.42, 12, 10), L.hair), 0, headY + headR * 0.95, -headR * 0.45));
  if (hairStyle === 'braid') { // a plait down her back: knots of hair getting smaller
    for (let k = 0; k < 5; k++) {
      const q = k / 4;
      body.add(at(mesh(new THREE.SphereGeometry(headR * (0.3 - q * 0.1), 8, 6), L.hair), headR * 0.12 * Math.sin(q * 3), headY - headR * (0.35 + q * 1.5), -headR * (0.95 + q * 0.1)));
    }
  }
  if (hairStyle === 'ponytail') {
    const tail = taperTube(new THREE.CatmullRomCurve3([V(0, headY + headR * 0.55, -headR * 0.85), V(0, headY + headR * 0.1, -headR * 1.25), V(0, headY - headR * 0.9, -headR * 1.15)]), headR * 0.28, headR * 0.1, 10, 8);
    body.add(mesh(tail, L.hair));
  }
  if (hairStyle === 'curly') {
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      body.add(at(mesh(new THREE.SphereGeometry(headR * 0.34, 6, 4), L.hair), Math.cos(a) * headR * 0.78, headY + headR * (0.55 + 0.25 * Math.sin(a * 2)), Math.sin(a) * headR * 0.7 - headR * 0.1));
    }
  }
  // a hat now and then
  if (L.hat === 'straw') {
    body.add(at(mesh(new THREE.CylinderGeometry(headR * 2.1, headR * 2.2, 0.018, 24), L.hatColour, { hatch: 1 }), 0, headY + headR * 0.55, 0, -0.08, 0, 0));
    body.add(at(mesh(lathe([[headR * 0.95, 0], [headR * 0.92, headR * 0.5], [headR * 0.7, headR * 0.72], [0, headR * 0.75]]), L.hatColour, { hatch: 1 }), 0, headY + headR * 0.55, 0, -0.08, 0, 0));
    body.add(at(mesh(new THREE.CylinderGeometry(headR * 0.97, headR * 0.97, headR * 0.16, 20, 1, true), PAL.red), 0, headY + headR * 0.66, 0, -0.08, 0, 0));
  } else if (L.hat === 'cap') {
    body.add(at(mesh(cap(1.1, 0.5), L.hatColour), 0, headY + headR * 0.08, 0, -0.12, 0, 0));
    const visor = new THREE.CylinderGeometry(headR * 0.7, headR * 0.7, 0.014, 16, 1, false, -Math.PI / 2, Math.PI); visor.scale(1, 1, 0.9);
    body.add(at(mesh(visor, L.hatColour), 0, headY + headR * 0.32, headR * 0.72, 0.18, 0, 0));
  } else if (L.hat === 'scarf') { // a headscarf over the hair, knotted at the nape
    body.add(at(mesh(cap(1.13, 0.62), L.hatColour), 0, headY + headR * 0.04, -headR * 0.08, -0.45, 0, 0));
    body.add(at(mesh(new THREE.SphereGeometry(headR * 0.22, 8, 6), mix(L.hatColour, PAL.ink, 0.1)), 0, headY - headR * 0.45, -headR * 0.95));
    for (const sd of [-1, 1]) body.add(at(mesh(new THREE.ConeGeometry(headR * 0.14, headR * 0.6, 6), L.hatColour), sd * headR * 0.15, headY - headR * 0.8, -headR * 1.0, 0.2, 0, sd * 0.35));
  }
  root.add(mergeByMaterial(body, 'body'));
  // arms: a sleeve and a bare forearm, tapered, with a round hand; they swing from the shoulder
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.name = s < 0 ? 'armL' : 'armR';
    arm.position.set(s * 0.165 * w, shoulderY - 0.05, 0);
    const len = kid ? 0.42 : 0.56;
    const sleeve = taperTube(new THREE.CatmullRomCurve3([V(0, 0, 0), V(s * 0.03, -len * 0.25, 0.01), V(s * 0.045, -len * 0.45, 0.02)]), 0.052, 0.044, 6, 9);
    const fore = taperTube(new THREE.CatmullRomCurve3([V(s * 0.045, -len * 0.42, 0.02), V(s * 0.05, -len * 0.7, 0.04), V(s * 0.045, -len * 0.92, 0.06)]), 0.036, 0.03, 6, 8);
    arm.add(mesh(sleeve, L.top), mesh(fore, L.skin), at(mesh(new THREE.SphereGeometry(0.042, 10, 8), L.skin), s * 0.045, -len * 0.96, 0.065));
    root.add(mergeByMaterial(arm, arm.name));
  }
  // the basket (or a tote) on the right arm, where the goods go
  const handR = new THREE.Vector3(0.165 * w + 0.05, shoulderY - 0.05 - (kid ? 0.4 : 0.54), 0.07);
  const bag = new THREE.Group(); bag.name = 'bag';
  if (!L.carry) {
    // nothing to carry: the goods go into their arms
  } else if (L.carry === 'basket') {
    const basket = mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.12, 14, 1, true), PAL.woodLight, { hatch: 1 });
    basket.material.side = THREE.DoubleSide;
    bag.add(at(basket, 0.05, -0.12, 0.04), at(mesh(new THREE.TorusGeometry(0.11, 0.012, 5, 16, Math.PI), PAL.wood), 0.05, -0.06, 0.04));
  } else {
    const tote = new THREE.CylinderGeometry(0.11, 0.12, 0.2, 4, 1); tote.rotateY(Math.PI / 4); tote.scale(1, 1, 0.35);
    bag.add(at(mesh(tote, mix(PAL.cream, L.top, 0.25)), 0.04, -0.14, 0.03), at(mesh(new THREE.TorusGeometry(0.06, 0.008, 4, 12, Math.PI), PAL.cream), 0.04, -0.03, 0.03));
  }
  bag.position.copy(handR);
  root.add(bag);
  root.userData.basket = handR.clone().add(V(0.05, -0.08, 0.04));
  // legs: trousers (or bare under the dress), rounded shoes
  for (const s of [-1, 1]) {
    const legG = new THREE.Group(); legG.name = s < 0 ? 'legL' : 'legR';
    legG.position.set(s * 0.075 * w, hipY - 0.04, 0);
    const legLen = hipY - 0.1;
    const leg = taperTube(new THREE.LineCurve3(V(0, 0, 0), V(0, -legLen, 0.005)), L.dress ? 0.045 : 0.068, L.dress ? 0.036 : 0.05, 4, 9);
    legG.add(mesh(leg, L.dress ? L.skin : L.bottom));
    const shoe = new THREE.SphereGeometry(0.065, 12, 8); shoe.scale(0.85, 0.55, 1.45);
    legG.add(at(mesh(shoe, PAL.charcoal), 0, -legLen - 0.02, 0.04));
    root.add(mergeByMaterial(legG, legG.name));
  }
  root.userData.scale = L.height / (kid ? 1.25 : 1.6);
  root.scale.setScalar(root.userData.scale);
  return root;
}


// ---------------- v0.16 the hired archer (A1) ----------------
// The captain: "The archer should be Dwight from The Office. It should have every feature so it
// can be easily identified: the shirt, the tie, the hairstyle and the glasses ... Should be a
// crossbow." An original low-poly character in that style, in the drawing's hand like the
// neighbours: a tall, square-shouldered man in a short-sleeved mustard dress shirt with its
// collar and a breast pocket, a dark brown tie held by a tie bar, a belt and brown slacks, black
// shoes; a long face with a stern straight mouth and heavy brows; dark brown hair parted in the
// middle with a short, stiff fringe falling to each side of the part; rectangular wire glasses.
// He holds a crossbow level across his chest: wooden stock and butt, the bow (prod) across its
// front with its string drawn back to the latch, a bolt loaded, the foot stirrup. Groups: `body`
// (bobs), `head` (turns), `arms` (with the crossbow, raised to aim), `crossbow`. Built for a
// 1.88 m man, facing +Z.
export const ARCHER = { height: 1.88, shirt: 0xcfa93e, tie: 0x3b2c24, slacks: 0x6a5641, hair: 0x3a2a1f, skin: 0xe3b48f, frame: 0x2a2523 };
export function archer() {
  const A = ARCHER;
  const root = new THREE.Group(); root.name = 'Archer';
  const hipY = 0.97; const shoulderY = 1.5; const headR = 0.118; const headY = shoulderY + 0.1 + headR * 1.02;
  const body = new THREE.Group(); body.name = 'body';
  // the shirt: square shoulders, straight down to the belt
  const shirt = lathe([[0, hipY - 0.02], [0.15, hipY - 0.02], [0.16, hipY + 0.12], [0.165, hipY + 0.32], [0.18, shoulderY - 0.12], [0.19, shoulderY - 0.04], [0.12, shoulderY + 0.03], [0.05, shoulderY + 0.06], [0, shoulderY + 0.06]], 20);
  shirt.scale(1, 1, 0.74);
  body.add(mesh(shirt, A.shirt, { hatch: 1 }));
  // the collar points, a little darker, either side of the knot
  for (const sd of [-1, 1]) {
    const c = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(sd * 0.075, 0.035, -0.01), V(sd * 0.025, -0.06, 0.008)]);
    c.setIndex([0, 1, 2]); c.computeVertexNormals();
    const m = mesh(c, mix(A.shirt, PAL.ink, 0.14), { ink: false });
    m.material.side = THREE.DoubleSide;
    body.add(at(m, sd * 0.01, shoulderY + 0.035, 0.122));
  }
  body.add(at(stroke(0.006, 0.42, 0.006), 0.012, shoulderY - 0.3, 0.128)); // the button placket
  body.add(at(mesh(box(0.075, 0.075, 0.008), mix(A.shirt, PAL.ink, 0.1), { ink: false }), -0.085, shoulderY - 0.16, 0.13)); // breast pocket
  body.add(at(stroke(0.012, 0.03, 0.006), -0.068, shoulderY - 0.13, 0.136)); // a pen in it
  // the tie: knot, a long blade down to the belt, a tie bar
  body.add(at(mesh(box(0.045, 0.04, 0.03), A.tie), 0, shoulderY + 0.01, 0.128));
  const tie = new THREE.Shape();
  tie.moveTo(-0.018, 0); tie.lineTo(0.018, 0); tie.lineTo(0.038, -0.36); tie.lineTo(0, -0.41); tie.lineTo(-0.038, -0.36); tie.closePath();
  const tg = new THREE.ExtrudeGeometry(tie, { depth: 0.012, bevelEnabled: false });
  body.add(at(mesh(tg, A.tie), 0, shoulderY - 0.012, 0.124, -0.06, 0, 0));
  body.add(at(mesh(box(0.07, 0.008, 0.014), 0xc9c4b8, { ink: false }), 0, shoulderY - 0.2, 0.142)); // tie bar
  // belt with its buckle, and the slacks' seat
  body.add(at(mesh(new THREE.CylinderGeometry(0.153, 0.153, 0.04, 20).scale(1, 1, 0.75), 0x2d2420), 0, hipY + 0.01, 0));
  body.add(at(mesh(box(0.045, 0.032, 0.012), 0xc9a646, { ink: false }), 0, hipY + 0.01, 0.118));
  body.add(mesh(lathe([[0, hipY - 0.12], [0.15, hipY - 0.12], [0.155, hipY - 0.01], [0, hipY - 0.01]]).scale(1, 1, 0.78), A.slacks));
  body.add(at(mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 10), A.skin), 0, shoulderY + 0.07, 0)); // neck
  root.add(mergeByMaterial(body, 'body'));
  // the head: a long face, heavy brows, small eyes behind the glasses, a stern straight mouth
  const head = new THREE.Group(); head.name = 'head';
  head.position.set(0, headY, 0);
  const skull = new THREE.SphereGeometry(headR, 16, 12); skull.scale(0.9, 1.14, 0.95);
  head.add(mesh(skull, A.skin));
  head.add(at(mesh(new THREE.SphereGeometry(headR * 0.16, 6, 5), mix(A.skin, PAL.ink, 0.12)), 0, -headR * 0.1, headR * 0.93)); // nose
  for (const sd of [-1, 1]) {
    head.add(at(mesh(new THREE.SphereGeometry(headR * 0.085, 6, 5), PAL.ink, { ink: false, shadow: false }), sd * headR * 0.36, headR * 0.12, headR * 0.86)); // eyes
    head.add(at(mesh(box(headR * 0.42, headR * 0.07, headR * 0.06), A.hair, { ink: false, shadow: false }), sd * headR * 0.37, headR * 0.36, headR * 0.86, 0, 0, sd * -0.12)); // brows, a little stern
    head.add(at(mesh(new THREE.SphereGeometry(headR * 0.17, 8, 6), A.skin), sd * headR * 0.92, 0, 0)); // ears
  }
  head.add(at(mesh(box(headR * 0.5, headR * 0.05, headR * 0.04), PAL.mouth, { ink: false, shadow: false }), 0, -headR * 0.5, headR * 0.86)); // the straight mouth
  // the glasses: two rectangular wire frames with pale lenses, a bridge, the arms to the ears
  const frame = (w, h) => {
    const g = new THREE.Group();
    const t = headR * 0.045;
    for (const [bw, bh, x, y] of [[w, t, 0, h / 2], [w, t, 0, -h / 2], [t, h, -w / 2, 0], [t, h, w / 2, 0]]) g.add(at(mesh(box(bw, bh, t), A.frame, { ink: false, shadow: false }), x, y, 0));
    const lens = mesh(new THREE.PlaneGeometry(w, h), 0xe8f0f2, { ink: false, shadow: false });
    lens.material = lens.material.clone(); lens.material.transparent = true; lens.material.opacity = 0.45;
    g.add(lens);
    return g;
  };
  for (const sd of [-1, 1]) {
    const f = frame(headR * 0.62, headR * 0.4);
    f.position.set(sd * headR * 0.38, headR * 0.12, headR * 0.98);
    head.add(f);
    head.add(at(mesh(box(headR * 0.03, headR * 0.03, headR * 1.0), A.frame, { ink: false, shadow: false }), sd * headR * 0.7, headR * 0.16, headR * 0.45));
  }
  head.add(at(mesh(box(headR * 0.16, headR * 0.035, headR * 0.03), A.frame, { ink: false, shadow: false }), 0, headR * 0.17, headR * 1.0));
  // the hair: a close cap, parted in the middle, the stiff fringe falling to each side
  const cap = new THREE.SphereGeometry(headR * 1.07, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  head.add(at(mesh(cap, A.hair), 0, headR * 0.12, -headR * 0.04, -0.12, 0, 0));
  for (const sd of [-1, 1]) {
    const fringe = new THREE.SphereGeometry(headR * 0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    fringe.scale(1.05, 0.55, 0.7);
    head.add(at(mesh(fringe, A.hair), sd * headR * 0.42, headR * 0.6, headR * 0.5, 0.55, 0, sd * -0.5));
  }
  head.add(at(stroke(headR * 0.03, headR * 0.03, headR * 0.6), 0, headR * 1.12, headR * 0.35, 0.5, 0, 0)); // the part
  root.add(head);
  // arms forward, holding the crossbow level at the chest (the `arms` group is raised to aim)
  const arms = new THREE.Group(); arms.name = 'arms';
  arms.position.set(0, shoulderY - 0.05, 0);
  for (const sd of [-1, 1]) {
    const sleeve = taperTube(new THREE.CatmullRomCurve3([V(sd * 0.19, 0, 0), V(sd * 0.21, -0.12, 0.03), V(sd * 0.2, -0.22, 0.07)]), 0.058, 0.05, 6, 9);
    const fore = taperTube(new THREE.CatmullRomCurve3([V(sd * 0.2, -0.2, 0.06), V(sd * 0.16, -0.27, 0.18), V(sd * 0.08 + (sd > 0 ? 0.02 : 0), -0.28, 0.3)]), 0.04, 0.034, 6, 8);
    arms.add(mesh(sleeve, A.shirt), mesh(fore, A.skin), at(mesh(new THREE.SphereGeometry(0.045, 10, 8), A.skin), sd * 0.08 + (sd > 0 ? 0.02 : 0), -0.28, 0.31));
  }
  const bow = new THREE.Group(); bow.name = 'crossbow';
  const wood = mix(PAL.wood, PAL.ink, 0.06);
  bow.add(at(mesh(box(0.05, 0.05, 0.62), wood, { hatch: 1 }), 0, 0, 0.1)); // the stock, along the shot
  bow.add(at(mesh(box(0.06, 0.12, 0.16), wood, { hatch: 1 }), 0, -0.04, -0.22, 0.25, 0, 0)); // the butt
  const prod = new THREE.CatmullRomCurve3([V(-0.34, 0, 0.32), V(-0.18, 0, 0.42), V(0, 0, 0.44), V(0.18, 0, 0.42), V(0.34, 0, 0.32)]);
  bow.add(mesh(taperTube(prod, 0.018, 0.018, 14, 6), PAL.charcoal)); // the bow across the front
  const string = new THREE.BufferGeometry().setFromPoints([V(-0.34, 0.004, 0.32), V(0, 0.03, 0.06), V(0.34, 0.004, 0.32)]);
  const sl = new THREE.Line(string, new THREE.LineBasicMaterial({ color: PAL.ink }));
  sl.userData.noOutline = true; sl.userData.noFit = true;
  bow.add(sl);
  bow.add(at(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), 0xd7c7a3), 0, 0.034, 0.27, Math.PI / 2, 0, 0)); // the bolt
  bow.add(at(mesh(new THREE.ConeGeometry(0.016, 0.05, 6), PAL.charcoal), 0, 0.034, 0.5, Math.PI / 2, 0, 0)); // its head
  bow.add(at(mesh(new THREE.TorusGeometry(0.05, 0.008, 5, 12, Math.PI), PAL.charcoal), 0, -0.02, 0.47, 0, 0, Math.PI)); // the stirrup
  bow.position.set(0.02, -0.27, 0.14);
  arms.add(bow);
  root.add(arms);
  // legs in slacks, black shoes
  for (const sd of [-1, 1]) {
    const legG = new THREE.Group(); legG.name = sd < 0 ? 'legL' : 'legR';
    legG.position.set(sd * 0.085, hipY - 0.06, 0);
    const legLen = hipY - 0.12;
    legG.add(mesh(taperTube(new THREE.LineCurve3(V(0, 0, 0), V(0, -legLen, 0.005)), 0.072, 0.056, 4, 9), A.slacks));
    const shoe = new THREE.SphereGeometry(0.068, 12, 8); shoe.scale(0.85, 0.5, 1.5);
    legG.add(at(mesh(shoe, 0x1f1d1c), 0, -legLen - 0.03, 0.045));
    root.add(mergeByMaterial(legG, legG.name));
  }
  return root;
}

// ---------------- v0.17 the second archer (A2, spec §6.5, §10.5) ----------------
// An original woodland elf archer in the drawing's hand, distinct from the first archer at a
// glance: long fair hair tied at the nape, pointed ears, a slim moss-and-cream tunic with a belt,
// a bark-brown hooded cloak over the shoulders, soft boots, a quiver of blunt arrows on his back
// and a longbow in his left hand (the `bow` group, held across him when he draws). Groups: `body`,
// `head` (turns), `arms` (raised to draw), `bow`. Built for a 1.82 m elf, facing +Z. In the game
// he is named "second archer", never after any film character (§10.5).
export const ELF = { height: 1.82, tunic: 0x6b8a52, trim: 0xf1deb5, cloak: 0x7a5636, hair: 0xe8cf8e, skin: 0xe9c29e, boots: 0x5a4130, bow: 0x8d603e };
export function elfArcher() {
  const E = ELF;
  const root = new THREE.Group(); root.name = 'ElfArcher';
  const hipY = 0.95; const shoulderY = 1.45; const headR = 0.112; const headY = shoulderY + 0.1 + headR;
  const body = new THREE.Group(); body.name = 'body';
  // the tunic: slim, flaring a little to a hem above the knee, with a cream trim at the hem
  const tunic = lathe([[0, hipY - 0.32], [0.17, hipY - 0.32], [0.155, hipY - 0.1], [0.13, hipY + 0.08], [0.14, hipY + 0.3], [0.165, shoulderY - 0.1], [0.17, shoulderY - 0.03], [0.1, shoulderY + 0.03], [0.04, shoulderY + 0.06], [0, shoulderY + 0.06]], 20);
  tunic.scale(1, 1, 0.76);
  body.add(mesh(tunic, E.tunic, { hatch: 1 }));
  body.add(at(mesh(new THREE.TorusGeometry(0.165, 0.014, 5, 22).scale(1, 0.76, 1), E.trim, { ink: false }), 0, hipY - 0.31, 0, Math.PI / 2, 0, 0));
  body.add(at(mesh(new THREE.CylinderGeometry(0.137, 0.137, 0.035, 20).scale(1, 1, 0.76), E.boots), 0, hipY + 0.04, 0)); // belt
  body.add(at(mesh(new THREE.CylinderGeometry(0.044, 0.05, 0.1, 10), E.skin), 0, shoulderY + 0.07, 0)); // neck
  // the cloak: a draped half-cone hanging from the shoulders down his back, its hood folded
  const cloak = new THREE.CylinderGeometry(0.2, 0.3, 1.02, 18, 1, true, Math.PI * 0.5, Math.PI);
  const cm = mesh(cloak, E.cloak, { hatch: 1 });
  cm.material = cm.material.clone(); cm.material.side = THREE.DoubleSide;
  body.add(at(cm, 0, shoulderY - 0.48, -0.035));
  body.add(at(mesh(new THREE.TorusGeometry(0.11, 0.035, 6, 14, Math.PI), E.cloak), 0, shoulderY + 0.06, -0.06, -0.3, 0, 0)); // the folded hood
  body.add(at(mesh(new THREE.SphereGeometry(0.022, 8, 6), E.trim, { ink: false }), 0.1, shoulderY + 0.02, 0.1)); // the cloak's clasp
  // the quiver on his back, a few fletched blunt arrows standing out of it
  const quiver = new THREE.Group();
  quiver.add(mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.5, 10), E.boots));
  for (let k = 0; k < 4; k++) {
    quiver.add(at(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 5), 0xd7c7a3), (k - 1.5) * 0.018, 0.32, (k % 2) * 0.015));
    quiver.add(at(mesh(box(0.004, 0.06, 0.03), k % 2 ? PAL.red : E.trim, { ink: false }), (k - 1.5) * 0.018, 0.4, (k % 2) * 0.015));
  }
  quiver.position.set(0.11, shoulderY - 0.18, -0.33); quiver.rotation.set(0.15, 0, -0.35);
  body.add(quiver);
  root.add(mergeByMaterial(body, 'body'));
  // the head: a fine face, almond eyes, a calm small mouth, pointed ears; long fair hair
  const head = new THREE.Group(); head.name = 'head';
  head.position.set(0, headY, 0);
  const skull = new THREE.SphereGeometry(headR, 16, 12); skull.scale(0.88, 1.1, 0.94);
  head.add(mesh(skull, E.skin));
  for (const sd of [-1, 1]) {
    head.add(at(mesh(new THREE.SphereGeometry(headR * 0.08, 6, 5), PAL.ink, { ink: false, shadow: false }), sd * headR * 0.35, headR * 0.1, headR * 0.86));
    head.add(at(mesh(box(headR * 0.36, headR * 0.05, headR * 0.05), mix(E.hair, PAL.ink, 0.3), { ink: false, shadow: false }), sd * headR * 0.36, headR * 0.3, headR * 0.86, 0, 0, sd * 0.1));
    const ear = new THREE.ConeGeometry(headR * 0.14, headR * 0.55, 6); // pointed, swept back a little
    head.add(at(mesh(ear, E.skin), sd * headR * 0.88, headR * 0.12, -headR * 0.05, -0.35, 0, sd * -1.05));
  }
  head.add(at(mesh(box(headR * 0.32, headR * 0.04, headR * 0.04), PAL.mouth, { ink: false, shadow: false }), 0, -headR * 0.45, headR * 0.86));
  const hairCap = new THREE.SphereGeometry(headR * 1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
  head.add(at(mesh(hairCap, E.hair), 0, headR * 0.1, -headR * 0.03, -0.15, 0, 0));
  // the long hair down his back, and two thin braids framing the face
  const fall = taperTube(new THREE.CatmullRomCurve3([V(0, headR * 0.3, -headR * 0.75), V(0, -headR * 1.3, -headR * 2.3), V(0, -headR * 3.6, -headR * 2.9)]), headR * 0.62, headR * 0.3, 10, 10);
  head.add(mesh(fall, E.hair));
  for (const sd of [-1, 1]) head.add(mesh(taperTube(new THREE.CatmullRomCurve3([V(sd * headR * 0.78, headR * 0.15, headR * 0.35), V(sd * headR * 0.85, -headR * 0.8, headR * 0.3), V(sd * headR * 0.78, -headR * 1.7, headR * 0.25)]), headR * 0.12, headR * 0.08, 8, 6), E.hair));
  root.add(head);
  // the arms; the longbow in his left hand, upright at his side (raised and drawn to shoot)
  const arms = new THREE.Group(); arms.name = 'arms';
  arms.position.set(0, shoulderY - 0.05, 0);
  for (const sd of [-1, 1]) {
    const sleeve = taperTube(new THREE.CatmullRomCurve3([V(sd * 0.17, 0, 0), V(sd * 0.2, -0.16, 0.03), V(sd * 0.2, -0.3, 0.07)]), 0.05, 0.042, 6, 9);
    const fore = taperTube(new THREE.CatmullRomCurve3([V(sd * 0.2, -0.28, 0.06), V(sd * 0.2, -0.4, 0.13), V(sd * 0.2, -0.5, 0.2)]), 0.036, 0.03, 6, 8);
    arms.add(mesh(sleeve, E.tunic), mesh(fore, E.skin), at(mesh(new THREE.SphereGeometry(0.04, 10, 8), E.skin), sd * 0.2, -0.52, 0.21));
  }
  const bow = new THREE.Group(); bow.name = 'bow';
  const limb = new THREE.CatmullRomCurve3([V(0, 0.78, 0.0), V(0, 0.45, 0.1), V(0, 0, 0.13), V(0, -0.45, 0.1), V(0, -0.78, 0.0)]);
  bow.add(mesh(taperTube(limb, 0.016, 0.016, 18, 6), E.bow));
  bow.add(at(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 8), E.boots), 0, 0, 0.13)); // the grip
  const string = new THREE.BufferGeometry().setFromPoints([V(0, 0.78, 0), V(0, -0.78, 0)]);
  const sl = new THREE.Line(string, new THREE.LineBasicMaterial({ color: PAL.ink }));
  sl.userData.noOutline = true; sl.userData.noFit = true;
  bow.add(sl);
  bow.position.set(-0.2, -0.52, 0.08);
  arms.add(bow);
  root.add(arms);
  // legs in soft boots
  for (const sd of [-1, 1]) {
    const legG = new THREE.Group(); legG.name = sd < 0 ? 'legL' : 'legR';
    legG.position.set(sd * 0.08, hipY - 0.06, 0);
    const legLen = hipY - 0.12;
    legG.add(mesh(taperTube(new THREE.LineCurve3(V(0, 0, 0), V(0, -legLen * 0.55, 0.004)), 0.06, 0.05, 4, 9), mix(E.tunic, PAL.ink, 0.25)));
    legG.add(mesh(taperTube(new THREE.LineCurve3(V(0, -legLen * 0.5, 0.004), V(0, -legLen, 0.006)), 0.056, 0.05, 4, 9), E.boots));
    const boot = new THREE.SphereGeometry(0.06, 12, 8); boot.scale(0.85, 0.5, 1.5);
    legG.add(at(mesh(boot, E.boots), 0, -legLen - 0.025, 0.04));
    root.add(mergeByMaterial(legG, legG.name));
  }
  return root;
}

// ---------------- v0.17c the hidden keepsakes (game/keepsakes.js) ----------------
// Five of the gift jokes, small and readable at play scale (about 0.25–0.4 m), lying on the grass:
// the red jello on its plate, the round Christmas ornament with its ribbon, the CD in its case,
// the novel, and the marshmallow Peep farmer in overalls from the Creation diorama.
export function keepsake(kind) {
  const g = new THREE.Group(); g.name = `Keepsake_${kind}`;
  if (kind === 'jello') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.025, 24), 0xf6f3ec), 0, 0.012, 0)); // the plate
    const dome = mesh(new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0xc8332e);
    dome.material = dome.material.clone(); dome.material.transparent = true; dome.material.opacity = 0.85;
    dome.scale.set(1, 0.85, 1);
    g.add(at(dome, 0, 0.025, 0));
    g.add(at(mesh(box(0.1, 0.004, 0.07), PAL.paper, { ink: false, shadow: false }), 0.01, 0.07, 0.02, -0.4, 0.3, 0)); // the drawing inside
  } else if (kind === 'ornament') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24), 0xe9e2d0), 0, 0.13, 0, Math.PI / 2, 0, 0));
    g.add(at(mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 24), PAL.red), 0, 0.13, 0));
    g.add(at(mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 14), PAL.leaf), 0, 0.28, 0)); // the ribbon loop
    g.add(at(mesh(box(0.03, 0.06, 0.012), PAL.ink, { ink: false }), -0.03, 0.12, 0.014)); // the cut-out farmer
    g.add(at(mesh(new THREE.SphereGeometry(0.012, 6, 5), 0xfbf8ef, { ink: false }), 0.0, 0.1, 0.016)); // and what she holds
    g.rotation.y = 0.3;
  } else if (kind === 'cd') {
    g.add(at(mesh(box(0.26, 0.02, 0.24), PAL.charcoal), 0, 0.01, 0, 0, 0.4, 0)); // the case
    g.add(at(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.006, 28), 0xd9dde2), 0.03, 0.024, 0.01, 0, 0.4, 0)); // the disc
    g.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 12), PAL.charcoal, { ink: false }), 0.03, 0.026, 0.01));
    g.add(at(mesh(box(0.09, 0.004, 0.04), PAL.red, { ink: false }), -0.07, 0.022, -0.08, 0, 0.4, 0)); // its sticker
  } else if (kind === 'novel') {
    g.add(at(mesh(box(0.2, 0.05, 0.28), PAL.leaf), 0, 0.025, 0, 0, -0.3, 0)); // the cover
    g.add(at(mesh(box(0.19, 0.04, 0.27), 0xf4eddc, { ink: false }), 0.008, 0.025, 0, 0, -0.3, 0)); // the pages
    g.add(at(mesh(box(0.1, 0.004, 0.1), PAL.flower, { ink: false, shadow: false }), 0, 0.052, 0.02, 0, -0.3, 0)); // sunflowers on it
  } else if (kind === 'peep') {
    const body = new THREE.SphereGeometry(0.09, 16, 12); body.scale(1, 1.3, 0.9);
    g.add(at(mesh(body, 0xf2d64b), 0, 0.12, 0));
    g.add(at(mesh(new THREE.SphereGeometry(0.06, 14, 10), 0xf2d64b), 0, 0.25, 0.02));
    for (const sd of [-1, 1]) g.add(at(mesh(new THREE.SphereGeometry(0.009, 6, 5), PAL.ink, { ink: false, shadow: false }), sd * 0.022, 0.265, 0.073));
    g.add(at(mesh(new THREE.ConeGeometry(0.012, 0.03, 6), 0xe08a2e, { ink: false }), 0, 0.25, 0.085, Math.PI / 2, 0, 0)); // the beak
    const overalls = new THREE.CylinderGeometry(0.083, 0.09, 0.11, 16, 1, true); overalls.scale(1, 1, 0.9);
    const o = mesh(overalls, PAL.denim); o.material = o.material.clone(); o.material.side = THREE.DoubleSide;
    g.add(at(o, 0, 0.08, 0));
    for (const sd of [-1, 1]) g.add(at(mesh(box(0.012, 0.09, 0.01), PAL.denim, { ink: false }), sd * 0.035, 0.16, 0.075)); // the straps
  }
  return g;
}

// v0.17 the warning arrow (A09): a blunt practice arrow, a wooden shaft with a round felt tip and
// red-and-cream fletching, 0.62 m, along +Z (the tip at +Z). It never strikes anything: the
// archer looses it into the empty ground beside the bird.
export function warningArrow() {
  const g = new THREE.Group(); g.name = 'WarningArrow';
  g.add(at(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), 0xd7c7a3), 0, 0, 0, Math.PI / 2, 0, 0));
  g.add(at(mesh(new THREE.SphereGeometry(0.022, 8, 6), PAL.charcoal), 0, 0, 0.3)); // the blunt felt tip
  for (let k = 0; k < 3; k++) {
    const f = mesh(box(0.004, 0.035, 0.08), k ? PAL.cream : PAL.red, { ink: false });
    f.position.set(0, 0, -0.26);
    f.rotation.z = (k / 3) * Math.PI * 2;
    f.geometry.translate(0, 0.022, 0);
    g.add(f);
  }
  return g;
}

// v0.17 the bench stain (A22 item 8): a small white bird dropping with a grey centre, flat on the
// seat, about 12 cm across
export function benchStain() {
  const g = new THREE.Group(); g.name = 'BenchStain';
  const blob = (r, c, y, x = 0, z = 0) => at(mesh(new THREE.CircleGeometry(r, 12), c, { ink: false, shadow: false }), x, y, z, -Math.PI / 2, 0, 0);
  g.add(blob(0.06, 0xf4f1ea, 0.002), blob(0.025, 0xf4f1ea, 0.002, 0.06, 0.03), blob(0.018, 0xf4f1ea, 0.002, -0.05, -0.045), blob(0.022, 0x8c8f8a, 0.004, 0.006, -0.004));
  const edge = at(mesh(new THREE.RingGeometry(0.058, 0.066, 16), PAL.ink, { ink: false, shadow: false }), 0, 0.003, 0, -Math.PI / 2, 0, 0);
  edge.material = edge.material.clone(); edge.material.transparent = true; edge.material.opacity = 0.5;
  g.add(edge);
  return g;
}

// ---------------- v0.16 the egg hunt: the bird, the egg, the sparkle ----------------
// The captain: "When you get an easter egg, a bird flies by and drops an egg. That's the
// animation of how you get it." The bird is the sky's check-mark bird come down: an ink-blue body
// with a round head and a yellow beak, two long swept wings (`wingL`, `wingR`, flapping from the
// shoulder) and a forked tail, about 0.9 m across; it flies along +Z. The egg is a cream Easter
// egg, painted with a coloured band and dots (one of five colourways), 0.2 m tall, resting on its
// side a little. The sparkle is the DIY hint's four-point star in ink and the flower yellow.
export function flyingBird() {
  const g = new THREE.Group(); g.name = 'EggBird';
  const ink = PAL.ink;
  const bodyG = new THREE.SphereGeometry(0.11, 12, 8); bodyG.scale(0.85, 0.75, 1.6);
  g.add(mesh(bodyG, ink));
  g.add(at(mesh(new THREE.SphereGeometry(0.075, 10, 8), ink), 0, 0.05, 0.17));
  g.add(at(mesh(new THREE.ConeGeometry(0.028, 0.08, 6), PAL.flower), 0, 0.04, 0.27, Math.PI / 2, 0, 0));
  for (const sd of [-1, 1]) g.add(at(mesh(new THREE.SphereGeometry(0.012, 6, 5), PAL.paper, { ink: false, shadow: false }), sd * 0.045, 0.07, 0.22));
  for (const sd of [-1, 1]) { // the forked tail
    const t = new THREE.ConeGeometry(0.03, 0.18, 4); t.rotateX(-Math.PI / 2);
    g.add(at(mesh(t, ink), sd * 0.035, 0, -0.24, 0, sd * 0.25, 0));
  }
  for (const sd of [-1, 1]) {
    const wing = new THREE.Group(); wing.name = sd < 0 ? 'wingL' : 'wingR';
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.06); sh.quadraticCurveTo(0.22, 0.1, 0.46, -0.02); sh.quadraticCurveTo(0.26, -0.02, 0, -0.08); sh.closePath();
    const wg = new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: false });
    wg.rotateX(Math.PI / 2); // lie flat, the long edge along +X
    if (sd < 0) wg.scale(-1, 1, 1);
    const m = mesh(wg, ink);
    m.material = m.material.clone(); m.material.side = THREE.DoubleSide;
    wing.add(m);
    wing.position.set(sd * 0.06, 0.03, 0.02);
    g.add(wing);
  }
  return g;
}
const EGG_COLOURS = [[0xf4eddc, PAL.red, PAL.flower], [0xf6e3c0, PAL.tool, PAL.leafLight], [0xf3dcd5, PAL.leaf, PAL.red], [0xe9eef2, PAL.flower, PAL.tool], [0xf1e8c4, 0x8b6fa8, PAL.leafLight]];
export function easterEgg(seed = 0) {
  const [base, band, dot] = EGG_COLOURS[seed % EGG_COLOURS.length];
  const g = new THREE.Group(); g.name = 'EasterEgg';
  const shell = new THREE.SphereGeometry(0.075, 16, 12);
  const p = shell.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y * 1.32); const k = 1 - 0.18 * (y / 0.075); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  shell.computeVertexNormals();
  g.add(at(mesh(shell, base), 0, 0.1, 0));
  g.add(at(mesh(new THREE.TorusGeometry(0.072, 0.012, 6, 20), band, { ink: false }), 0, 0.1, 0, Math.PI / 2, 0, 0));
  g.add(at(mesh(new THREE.TorusGeometry(0.062, 0.006, 5, 18), band, { ink: false }), 0, 0.142, 0, Math.PI / 2, 0, 0));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    g.add(at(mesh(new THREE.SphereGeometry(0.011, 6, 4), dot, { ink: false, shadow: false }), Math.cos(a) * 0.066, 0.064, Math.sin(a) * 0.066));
  }
  g.rotation.z = 0.25;
  return g;
}
export function sparkleStar() {
  const sh = new THREE.Shape();
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.045 : 0.16;
    const x = Math.cos(a) * r; const y = Math.sin(a) * r;
    if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
  }
  const g = new THREE.Group(); g.name = 'Sparkle';
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: PAL.flower, side: THREE.DoubleSide, transparent: true }));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(sh.getPoints().map((q) => V(q.x, q.y, 0.002))), new THREE.LineBasicMaterial({ color: PAL.ink, transparent: true }));
  for (const o of [fill, line]) { o.userData.noOutline = true; o.userData.noFit = true; o.castShadow = false; }
  g.add(fill, line);
  return g;
}

// a dust puff (v0.12 DIY time): three or four soft paper-white blobs in ink, scaled and faded
// by the world as they billow up from where the hammer strikes or her feet land
export function dustPuff(seed = 0) {
  const g = new THREE.Group(); g.name = 'DustPuff';
  const r = rng(40 + seed);
  const n = 3 + (seed % 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r();
    const s = 0.09 + r() * 0.07;
    const m = mesh(new THREE.SphereGeometry(s, 10, 8), mix(PAL.ground, PAL.stone, 0.18), { shadow: false });
    m.position.set(Math.cos(a) * 0.12, s * 0.7 + r() * 0.06, Math.sin(a) * 0.08);
    g.add(m);
  }
  return g;
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
  // v0.12 (captain: "update the sunflowers that pick up and accumulate on your head to resemble
  // sunflowers better ... accumulate vertically"): an upright sunflower, facing +Z: a round dark
  // seed centre in two rings of yellow petals, on a short green stem with one leaf, so a column of
  // them on her head reads as sunflowers at phone size (origin at the head's centre)
  const sf = [sunflowerHeadGeometry(0.095, false).clone()];
  sf.push(paint(taperTube(new THREE.CatmullRomCurve3([V(0, -0.02, -0.02), V(0.008, -0.08, -0.015), V(0, -0.135, -0.01)]), 0.011, 0.008, 6, 6), PAL.leaf));
  sf.push(paint(blade([V(0.004, -0.085, -0.012), V(0.045, -0.07, 0.0), V(0.085, -0.095, 0.012)], { width: (s) => 0.022 * Math.sin(Math.PI * s) ** 0.7, across: V(0, 0.4, 1).normalize(), thick: 0.25, cup: 0.2, segs: 5, radial: 5 }), PAL.leaf));
  unitGeos = { C: cob, T: bake(tparts), S: bake(sf), coins: bake(coin) };
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

// ---------------- D08 path (G1), v0.13: stepping stones with grass between ----------------
// The captain: "the road looks cheap, I imagine is a placeholder"; answer 2 "Stepping stones"
// (spec v0.13 P29-3): the drawn winding path laid as a run of flat stepping stones between its two
// drawn boundaries, from the door to the frame's edge: irregular rounded slabs about 0.35-0.6 m
// across, two abreast where the path is wide and one where it narrows at the door, flush with the
// ground, each in the farm's stone grey (D11, D12) with hatching on its shaded side and its ink
// line; between them short ink tufts of grass on the paper (green only when the finale greens the
// ground: world.js). left/right: matching arrays of ground points along the path. Merged.
export function stonePath(left, right) {
  const g = new THREE.Group(); g.name = 'D08_Path';
  const r = rng(808);
  const n = left.length;
  const mid = left.map((q, i) => q.clone().lerp(right[i], 0.5));
  const len = [0];
  for (let i = 1; i < n; i++) len.push(len[i - 1] + mid[i].distanceTo(mid[i - 1]));
  const total = len[n - 1];
  const at = (s) => { // centre, across (unit), along (unit) and half-width at arc length s
    let i = 1; while (i < n - 1 && len[i] < s) i++;
    const t = Math.max(0, Math.min(1, (s - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1])));
    const c = mid[i - 1].clone().lerp(mid[i], t);
    const l = left[i - 1].clone().lerp(left[i], t); const rr = right[i - 1].clone().lerp(right[i], t);
    const across = rr.clone().sub(l); const half = across.length() / 2; across.normalize();
    const along = mid[i].clone().sub(mid[i - 1]).normalize();
    return { c, across, along, half };
  };
  const stones = new THREE.Group();
  const tufts = [];
  const rims = []; // each slab's ink line, drawn on the ground around it with an uneven pressure
  let row = 0;
  for (let s = 0.3; s < total - 0.2; row++) {
    const { c, across, along, half } = at(s);
    const two = half * 2 > 1.25;
    const yaw = Math.atan2(along.x, along.z);
    const k = two ? 2 : 1;
    let deep = 0;
    for (let j = 0; j < k; j++) {
      const wide = two ? Math.min(0.58, half * 0.78) : Math.min(0.6, half * 1.3); // across, m
      const size = wide * (0.82 + r() * 0.25);
      const lengthM = 0.36 + r() * 0.16; // along
      deep = Math.max(deep, lengthM);
      const off = two ? (j ? 1 : -1) * half * (0.42 + (r() - 0.5) * 0.08) + (row % 2 ? 0.05 : -0.05) : (r() - 0.5) * half * 0.3;
      const geo = stoneGeometry(0.2, 11 + ((row * 3 + j) % 9), 2).clone();
      geo.scale(size / 0.46, 0.22, lengthM / 0.4);
      const m = new THREE.Mesh(geo, toon((row + j) % 3 ? PAL.stone : mix(PAL.stone, PAL.paper, 0.16), { hatch: 1 }));
      m.position.copy(c).addScaledVector(across, off).addScaledVector(along, (r() - 0.5) * 0.06).setY(0.0);
      m.rotation.y = yaw + (r() - 0.5) * 0.6;
      m.castShadow = false; m.receiveShadow = true;
      stones.add(m);
      const pts = [];
      const seg = 22;
      const sd = row * 7 + j;
      for (let q = 0; q < seg; q++) {
        const a = (q / seg) * Math.PI * 2;
        const wob = 1 + 0.07 * Math.sin(a * 3 + sd) + 0.05 * (hash3(sd, q, 5) - 0.5);
        pts.push(new THREE.Vector2(Math.cos(a) * size * 0.53 * wob, Math.sin(a) * lengthM * 0.53 * wob));
      }
      const rim = strokeGeometry(pts, (u) => 0.014 + 0.012 * Math.abs(Math.sin(u * Math.PI * 2 + sd)), true);
      rim.rotateX(-Math.PI / 2);
      rim.rotateY(m.rotation.y);
      rim.translate(m.position.x, 0.006, m.position.z);
      rims.push(rim);
    }
    // grass in the gaps: a tuft between this stone and the next, now and then one at the edge
    const gap = 0.12 + r() * 0.08;
    const tuftAt = c.clone().addScaledVector(along, deep / 2 + gap / 2).addScaledVector(across, (r() - 0.5) * half * (two ? 1.2 : 0.8));
    tufts.push(tuftAt);
    if (two) tufts.push(c.clone().addScaledVector(across, (r() < 0.5 ? -1 : 1) * half * 0.05));
    if (row % 3 === 1) tufts.push(c.clone().addScaledVector(across, (r() < 0.5 ? -1 : 1) * half * 0.98));
    s += deep + gap;
  }
  const merged = mergeByMaterial(stones, 'D08_Path_Stones');
  // tufts: two to four short pen strokes each, facing the camera, in ink on the paper
  const tg = [];
  tufts.forEach((p, t) => {
    const n2 = 2 + (t % 3);
    for (let k = 0; k < n2; k++) {
      const x0 = (k - (n2 - 1) / 2) * 0.03 + (r() - 0.5) * 0.015;
      const h = 0.07 + r() * 0.06; const lean = (k - (n2 - 1) / 2) * 0.025;
      const pts = [];
      for (let q = 0; q <= 4; q++) { const u = q / 4; pts.push(new THREE.Vector2(x0 + lean * u * u, h * u)); }
      const geo = strokeGeometry(pts, (u) => 0.011 * (1 - 0.7 * u));
      geo.translate(p.x, 0.008, p.z);
      tg.push(geo);
    }
  });
  const grass = new THREE.Mesh(mergeGeometries(tg, false), new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.DoubleSide }));
  grass.userData.noOutline = true; grass.userData.noFit = true; grass.castShadow = false;
  grass.name = 'D08_Path_Tufts';
  const ink = new THREE.Mesh(mergeGeometries(rims, false), new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  ink.userData.noOutline = true; ink.userData.noFit = true; ink.castShadow = false;
  ink.name = 'D08_Path_Ink';
  g.add(merged, ink, grass);
  return g;
}

// ---------------- D08 path (G1), v0.16: solid dirt ----------------
// The captain: "Make the path solid, not rocks" (the coloured drawing's path is one sandy-ochre
// band): a flat ribbon between the two drawn edges in a warm dirt wash with the paper grain, its
// edges in ink with an uneven pressure, a few pencil strokes along it for the trodden earth and a
// sprinkle of darker grit; short grass tufts at its edges (green with the finale's ground).
export function dirtPath(left, right) {
  const g = new THREE.Group(); g.name = 'D08_Path';
  const n = left.length;
  const pos = []; const idx = [];
  for (let i = 0; i < n; i++) pos.push(left[i].x, 0.012, left[i].z, right[i].x, 0.012, right[i].z);
  for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const DIRT = 0xd9a86c;
  const ribbon = new THREE.Mesh(geo, toon(DIRT, { grain: 1, flat: 1, side: THREE.DoubleSide, hatch: 1 }));
  ribbon.receiveShadow = true; ribbon.castShadow = false; ribbon.userData.noOutline = true;
  ribbon.name = 'D08_Path_Dirt';
  const r = rng(816);
  const strokes = []; const grit = []; const tufts = [];
  for (let i = 2; i < n - 2; i += 2) {
    for (let k = 0; k < 2; k++) { // trodden-earth strokes along the path
      const t = 0.2 + r() * 0.6;
      const a = left[i].clone().lerp(right[i], t); const b = left[i + 2].clone().lerp(right[i + 2], t + (r() - 0.5) * 0.1);
      const d = b.clone().sub(a); const len = d.length() * (0.35 + r() * 0.4); d.normalize();
      const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(len * 0.5, (r() - 0.5) * 0.02), new THREE.Vector2(len, 0)];
      const sg = strokeGeometry(pts, (u) => 0.012 * Math.sin(Math.PI * u) + 0.003);
      sg.rotateX(-Math.PI / 2); sg.rotateY(-Math.atan2(d.z, d.x)); sg.translate(a.x, 0.016, a.z);
      strokes.push(sg);
    }
    for (let k = 0; k < 3; k++) { // grit
      const p = left[i].clone().lerp(right[i], 0.1 + r() * 0.8);
      const c = new THREE.CircleGeometry(0.018 + r() * 0.018, 6);
      c.rotateX(-Math.PI / 2); c.translate(p.x, 0.017, p.z);
      grit.push(c);
    }
    if (i % 6 === 2) tufts.push((r() < 0.5 ? left : right)[i].clone());
  }
  const strokeM = new THREE.Mesh(mergeGeometries(strokes, false), new THREE.MeshBasicMaterial({ color: mix(DIRT, PAL.ink, 0.45), side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
  strokeM.userData.noOutline = true; strokeM.userData.noFit = true; strokeM.castShadow = false; strokeM.name = 'D08_Path_Strokes';
  const gritM = new THREE.Mesh(mergeGeometries(grit, false), toon(mix(DIRT, PAL.ink, 0.35), { flat: 1 }));
  gritM.userData.noOutline = true; gritM.castShadow = false; gritM.name = 'D08_Path_Grit';
  g.add(ribbon, strokeM, gritM);
  // the two edges, in ink with an uneven pressure
  for (const edge of [left, right]) {
    const flat = edge.map((q) => new THREE.Vector2(q.x, -q.z));
    const eg = strokeGeometry(flat, (u) => 0.02 + 0.012 * Math.abs(Math.sin(u * 23)));
    eg.rotateX(-Math.PI / 2); eg.translate(0, 0.02, 0);
    const em = new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    em.userData.noOutline = true; em.userData.noFit = true; em.castShadow = false; em.name = 'D08_Path_Edge';
    g.add(em);
  }
  const tg = [];
  tufts.forEach((p, t) => {
    const n2 = 3;
    for (let k = 0; k < n2; k++) {
      const x0 = (k - 1) * 0.03 + (r() - 0.5) * 0.015;
      const h = 0.08 + r() * 0.06; const lean = (k - 1) * 0.025;
      const pts = [];
      for (let q = 0; q <= 4; q++) { const u = q / 4; pts.push(new THREE.Vector2(x0 + lean * u * u, h * u)); }
      const geo2 = strokeGeometry(pts, (u) => 0.011 * (1 - 0.7 * u));
      geo2.translate(p.x, 0.008, p.z);
      tg.push(geo2);
    }
  });
  if (tg.length) {
    const grass = new THREE.Mesh(mergeGeometries(tg, false), new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.DoubleSide }));
    grass.userData.noOutline = true; grass.userData.noFit = true; grass.castShadow = false;
    grass.name = 'D08_Path_Tufts';
    g.add(grass);
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
