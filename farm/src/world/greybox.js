// Builders for the drawing objects and slice stations, as the world places them. The models are
// direction C (spec §10.8): authored in code in hand.js (house, tree, logs, stones), flora.js
// (crops, weeds, bed plants) and props.js (bench, bed, tools, crate, units, border, sky); this
// file gives them their ink, shadows, stage nodes, outlines and fades, plus the stations' piles,
// mats and the marker. Each builder returns a Group with its origin at the ground footprint
// centre, +Y up, front facing +Z, sized in metres at scale 1; layout.js places and scales it from
// the drawing. Stage variants are named child nodes (annex §E.6).
import * as THREE from 'three';

import { ink, LOOK, PAL, toon, toonMaterial } from './look.js';
import { branchPieces, broadTree, cottage, COTTAGE, mergeByMaterial, shard } from './hand.js';
import * as F from './flora.js';
import * as P from './props.js';

// spec §10.3 review swatches (look.js owns the full palette; these names stay for callers)
export const PALETTE = {
  paper: PAL.paper, ground: PAL.ground, ink: PAL.ink, cap: PAL.cap, denim: PAL.denim, shirt: PAL.shirt,
  tool: PAL.tool, cream: PAL.cream, red: PAL.red, charcoal: PAL.charcoal, wood: PAL.wood, stone: PAL.stone,
  leaf: PAL.leaf, flower: PAL.flower, soil: PAL.soil, corn: PAL.corn, tomato: PAL.tomato, coin: PAL.coin,
};

// every surface uses the shared toon material (look.js); `opts` may ask for flatShading,
// hatch, side, ...
export const lam = (color, opts = {}) => toon(color, opts);
const inkLine = new THREE.LineBasicMaterial({ color: PALETTE.ink });
const inkFaint = new THREE.LineBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.35 });

// Constant-width screen-space ink outline (look.js, spec §10.6 item 2) in place of the slice's
// world-space hull. `width` was the old hull's offset in metres; small props keep a slightly
// finer line. Toggle with `outlines.enabled` before building (URL `?outline=0`).
export const outlines = {
  get enabled() { return LOOK.outline; },
  set enabled(v) { LOOK.outline = v; },
  width: 0.02,
};
export function addOutline(root, width = outlines.width) {
  return ink(root, width >= 0.02 ? 1 : 0.7 + 0.3 * (width / 0.02));
}
// leaves, petals and blades take a finer pen than built forms (§10.3: "not a heavy border on
// every leaf"); at the finale camera a corn leaf is only a few pixels wide
export const FOLIAGE_INK = 0.55;

function at(o, x, y, z, rx = 0, ry = 0, rz = 0) { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; }
function named(o, name) { o.name = name; return o; }
function group(name, ...children) { const g = new THREE.Group(); g.name = name; for (const c of children) g.add(c); return g; }
function shadows(o, cast = true) { o.traverse((m) => { if (m.isMesh && !m.userData.outline) { m.castShadow = cast; m.receiveShadow = true; } }); return o; }
function ghost(o, opacity = 0.18) {
  o.traverse((m) => {
    if (!m.isMesh) return;
    m.material = m.material.clone();
    m.material.transparent = true;
    m.material.opacity = opacity;
    m.material.depthWrite = false;
    m.userData.noOutline = true;
    m.castShadow = false;
    if (m.material.color && m.material.color.getHex() === PALETTE.ink) return; // drawn details: faint fill only
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), inkFaint);
    edges.userData.noFit = true;
    m.add(edges);
  });
  return o;
}

// ---------- D01-D07 house (direction C, hand.js): H0 footprint, H1 plinth, H2 walls, H3 roof, H4 chimney, H5 details ----------
// Each part takes its colour as its stage is built (spec v0.9 §10.9, answer 3). Until then the
// part is the blueprint: a see-through ghost of it, one per stage (`D01_House_Ghost_H1`..`H5`),
// over the ink footprint. `world.sync` shows each node when its stage is committed.
export const HOUSE = { w: COTTAGE.w, d: COTTAGE.d, wall: COTTAGE.wall, roof: COTTAGE.roof, plinth: COTTAGE.plinth };
export function house() {
  const { w, d } = HOUSE;
  const footprint = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([[-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2], [-w / 2, -d / 2]].map(([x, z]) => new THREE.Vector3(x, 0.02, z))),
    inkLine,
  );
  footprint.name = 'D01_House_H0_Footprint';
  const c = cottage();
  const plinth = c.getObjectByName('D01_House_H1_Plinth');
  const walls = c.getObjectByName('D01_House_H2_Walls');
  const roof = c.getObjectByName('D01_House_H3_Roof');
  const chimney = c.getObjectByName('D01_House_H4_Chimney');
  const details = c.getObjectByName('D01_House_H5_Details');
  const parts = { H1: plinth, H2: walls, H3: roof, H4: chimney, H5: details };
  const ghostHome = group('D01_House_Ghost', ...Object.entries(parts).map(([st, n]) => named(ghost(n.clone()), `D01_House_Ghost_${st}`)));
  for (const n of Object.values(parts)) { shadows(addOutline(n)); n.visible = false; }
  const g = group('D01_House', footprint, plinth, walls, roof, chimney, details, ghostHome);
  g.userData.chimneyTop = c.userData.chimneyTop;
  g.userData.doorStep = c.userData.doorStep;
  return g;
}

// ---------- D09 tree (never chopped; direction C, scalloped leaf clumps) ----------
export function tree() {
  return shadows(addOutline(broadTree()));
}

// ---------- D10 bench, D13/D14 tools, D18 bed (direction C, props.js) ----------
export function benchBroken() { return shadows(addOutline(P.bench({ broken: true }))); }
export function benchRestored() { return shadows(addOutline(P.bench({ broken: false }))); }
export const benchFootprint = P.benchFootprint;
export function tool(kind) { return shadows(addOutline(P.tool(kind), 0.01)); }
export function raisedBed() { return shadows(addOutline(P.raisedBed())); }
export function bedPlants() { return shadows(ink(F.bedPlants(), FOLIAGE_INK)); }

// ---------- D11 border stones (scattered before G4), D12 stepping-stone outlines ----------
// places: [{ pos, seed }] on the ground; one merged model (a few draw calls for the ring)
export function borderStones(places) { return shadows(addOutline(P.borderStones(places), 0.8 * 0.02)); }
export const steppingOutline = P.steppingOutline;
export function borderRing(places) { return shadows(addOutline(P.borderRing(places), 0.8 * 0.02)); }
export function steppingStone(i) { return shadows(addOutline(P.steppingStone(i), 0.015)); }
// v0.16 solid, v0.19 borderless (no edge rocks, no outline), v0.20 grey gravel; `gravelClearing`
// is the same gravel for the circle round the tree (the path's own material, so they are one bed)
export function gravelPath(left, right) {
  const g = P.gravelPath(left, right);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
  return g;
}
export const gravelClearing = P.gravelClearing;
// v0.13: the path's stepping stones in ink (their outline), on the grass wash (v0.16: unused)
export function stonePath(left, right) {
  const g = P.stonePath(left, right);
  addOutline(g.getObjectByName('D08_Path_Stones'), 0.015);
  return g;
}
export const sprout = P.sprout;

// ---------- D15 corn: stalk silhouettes that stay after harvest; cobs show stock ----------
// Live plants are inked and coloured; before their stage the same plant is the drawing's own
// outline, paper inside its ink line (`sketch`), as the frame overlay of §3.
export function cornPlant({ live, variant = 0 }) {
  const g = F.cornPlant({ live, variant });
  return live ? shadows(ink(g, FOLIAGE_INK)) : sketch(g);
}

// One of the 11 corn plants that are never nodes: the stalk without cobs, inked and in colour;
// the world gives it its outline look until C1 completes the patch (spec v0.9 §10.9).
export function cornStalk(variant = 0) { return shadows(ink(F.cornPlant({ live: false, variant }), FOLIAGE_INK)); }
// v0.26: all of them as one mesh with one ink hull (they stand still and take their colour
// together, so nothing tells them apart but the number of draws: 2 in place of 22, and 1 in the
// shadow map in place of 11). plants: [{ pos, scale, yaw, variant }], in the patch's own space.
export function cornStalks(plants, name = 'D15_Corn_Rest') {
  const g = new THREE.Group();
  for (const pl of plants) {
    const one = F.cornPlant({ live: false, variant: pl.variant });
    one.position.copy(pl.pos); one.scale.setScalar(pl.scale); one.rotation.y = pl.yaw;
    g.add(one);
  }
  return shadows(ink(mergeByMaterial(g, name, { inkFirst: true }), FOLIAGE_INK));
}

// ---------- D16 sunflowers (outline until S0 / S1) ----------
export function sunflower(variant = 0, { live = false } = {}) {
  const g = F.sunflower(variant);
  return live ? shadows(ink(g, FOLIAGE_INK)) : sketch(g);
}

// ---------- D21 sky birds, D22 spiral sun, D23 horizon: pen strokes on the paper ----------
export const sun = P.sun;
export const birds = P.birds;
export const horizon = P.horizon;

// ---------- slice stations ----------
export function weed() { return shadows(ink(F.weed(), FOLIAGE_INK)); }
// Wood and stone piles (playtest fix: the slice's 3.5 cm twigs and 11 cm shards were about
// 10 px on a phone). Chunkier logs and stones, each on a trodden ground patch that stays when the
// pile is empty, so a source reads as a place to gather from. Units are the named children the
// world hides as the ledger counts down (`unit_i`); the patch is marked `keep`.
function groundPatch(r) {
  const m = at(new THREE.Mesh(new THREE.CircleGeometry(r, 28), lam(0xe3d5b0)), 0, 0.006, 0, -Math.PI / 2);
  m.scale.set(1.15, 1, 1);
  m.receiveShadow = true;
  m.userData.keep = true;
  m.userData.noOutline = true;
  m.userData.noFit = true;
  return named(m, 'patch');
}
function flatPatch(g) { g.getObjectByName('patch').castShadow = false; return g; }
// v0.9 (P25-5): a fallen branch, the starter piles and every renewable batch alike ("branches
// that have already fallen"), on its trodden patch. Units are the branch's lengths, tip last.
export function fallenBranch(units, seed = 0) {
  const g = group('FallenBranch');
  g.add(groundPatch(0.48));
  const b = branchPieces(units, seed);
  b.rotation.y = 0.35 + seed * 0.9;
  for (const c of [...b.children]) {
    c.applyMatrix4(new THREE.Matrix4().makeRotationY(b.rotation.y));
    g.add(c);
  }
  return flatPatch(shadows(addOutline(g, 0.012)));
}
// the branch that falls from the tree: the same model, without its patch
export function fallingBranch(units, seed = 0) {
  const g = group('FallingBranch');
  const b = branchPieces(units, seed);
  for (const c of [...b.children]) g.add(c);
  return shadows(addOutline(g, 0.012));
}

// v0.9 (P25-6): a loose rock, three angular light-gray stones on a trodden patch; one stone
// per unit. When it is empty its patch fades out for good (world.js).
const SHARD_AT = [[-0.12, 0.03, 0.15], [0.12, -0.04, 0.13], [0.0, 0.12, 0.11]];
export function looseRock(seed = 0) {
  const g = group('LooseRock');
  g.add(groundPatch(0.4));
  for (let i = 0; i < 3; i++) {
    const [x, z, r] = SHARD_AT[i % SHARD_AT.length];
    const u = group(`unit_${i}`, shard(r, seed * 3 + i + 1));
    u.position.set(x, 0, z);
    g.add(u);
  }
  return flatPatch(shadows(addOutline(g, 0.012)));
}

// v0.9 (P25-4): an open dig spot, a small patch of turned paper-tone soil with a dashed ring
export function digSpot() {
  const g = group('DigSpot');
  const soil = at(new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), lam(0xd9c39b, { flat: 1, grain: 1 })), 0, 0.008, 0, -Math.PI / 2);
  soil.receiveShadow = true;
  g.add(soil);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    const clod = at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), lam(0xb99a6e)), Math.cos(a) * 0.13, 0.012, Math.sin(a) * 0.11);
    clod.scale.set(1, 0.5, 1);
    g.add(clod);
  }
  const pts = [];
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 0.32, 0.02, Math.sin(a) * 0.32)); }
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: PALETTE.ink, dashSize: 0.07, gapSize: 0.05, transparent: true, opacity: 0.7 }));
  ring.computeLineDistances();
  ring.name = 'ring';
  g.add(ring);
  g.traverse((m) => { m.userData.noOutline = true; m.userData.noFit = true; });
  return g;
}

// ---------- the collectible marker: ground ring, soft disc and work-progress arc ----------
// Unit radius; the world scales it to the target. Drawn flat on the ground without writing
// depth, so it shows through a faded tree and never cuts Vanessa's feet.
export const MARKER_SEGMENTS = 48;
export function marker() {
  const g = group('Marker');
  const mat = (opacity) => new THREE.MeshBasicMaterial({ color: PALETTE.tool, transparent: true, opacity, depthWrite: false });
  const disc = named(at(new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), mat(0.12)), 0, 0.02, 0, -Math.PI / 2), 'disc');
  const ring = named(at(new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, MARKER_SEGMENTS), mat(0.9)), 0, 0.024, 0, -Math.PI / 2), 'ring');
  // full circle; the world draws a share of it with setDrawRange (6 indices per segment)
  const arc = named(at(new THREE.Mesh(new THREE.RingGeometry(1.06, 1.24, MARKER_SEGMENTS, 1, Math.PI / 2, Math.PI * 2), mat(1)), 0, 0.028, 0, -Math.PI / 2), 'arc');
  arc.geometry.setDrawRange(0, 0);
  g.add(disc, ring, arc);
  g.traverse((m) => { if (m.isMesh) { m.userData.noOutline = true; m.userData.noFit = true; m.renderOrder = -1; } });
  return g;
}

// A standing place, distinct from the resource's work-progress ring. Its centre is the
// exact point used by the action. Warm gold stays legible over paper and coloured grass.
// v0.23 (Tiffany: "Actions should be in a different color than songs and collecting crops. Maybe
// red for actions?"): `colour` is the circle's: the flower yellow of the guide and of a song (the
// egg's circle), or the action's red (ACTION_RED); the star keeps its yellow. `star: false` leaves
// the star out (the egg lies in its circle and needs none).
export const ACTION_RED = 0xe0392b;
export function standMarker(colour = PAL.flower, { star: withStar = true } = {}) {
  const g = group('StandHere');
  g.userData.colour = colour;
  const mat = (opacity) => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const ring = named(at(new THREE.Mesh(new THREE.RingGeometry(0.46, 0.55, 64), mat(0.9)), 0, 0.045, 0, -Math.PI / 2), 'standCircle');
  const disc = named(at(new THREE.Mesh(new THREE.CircleGeometry(0.46, 48), mat(0.14)), 0, 0.04, 0, -Math.PI / 2), 'standDisc');
  const star = P.sparkleStar(); star.name = 'standStar'; star.position.y = 0.8; star.scale.setScalar(1.5);
  if (!withStar) star.visible = false;
  if (colour !== PAL.flower) star.children[0].material.color.set(colour);
  const sparks = group('standSparks');
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const spark = P.sparkleStar(); spark.position.set(Math.cos(a) * 0.7, 0.1 + i % 2 * 0.18, Math.sin(a) * 0.7); spark.scale.setScalar(0.45); sparks.add(spark);
  }
  sparks.visible = false;
  g.add(ring, disc, star, sparks);
  g.traverse((o) => { o.userData.noFit = true; o.userData.noOutline = true; o.renderOrder = 5; });
  return g;
}

// ---------- fading a tall foreground object (playtest fix: the tree hid the piles) ----------
// Every colour material becomes a per-object transparent clone (opacity 1 renders exactly like
// the opaque original), drawn after a depth-only copy of the same meshes so overlapping canopy
// blobs fade as one sheet instead of stacking darker. The outline hulls fade with it and are
// drawn between the two, so only their rim shows. Built transparent from the start: fading later
// changes a uniform only, never a shader, so it cannot hitch.
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true });
// `fades(mesh)` (v0.22): which of its meshes fade; the others stay solid and hide nothing from the
// occlusion test (the tree's trunk and branches: only its leaves give way, so she can be seen to
// hug the trunk).
export function fadeable(root, fades = () => true) {
  const colour = [];
  const hulls = [];
  root.traverse((m) => { if (m.isMesh && fades(m.userData.outline ? m.parent : m)) (m.userData.outline ? hulls : colour).push(m); });
  for (const m of colour) {
    m.material = m.material.clone();
    m.material.transparent = true;
    m.renderOrder = 3;
    const d = new THREE.Mesh(m.geometry, depthOnly);
    d.renderOrder = 1;
    d.userData.noFit = true;
    d.raycast = () => {};
    m.add(d);
  }
  for (const h of hulls) {
    const mat = h.material.clone();
    mat.transparent = true;
    h.material = mat;
    h.renderOrder = 2;
  }
  return {
    meshes: colour, // for occlusion rays
    opacity: 1,
    set(o) {
      if (o === this.opacity) return;
      this.opacity = o;
      for (const m of colour) m.material.opacity = o;
      for (const h of hulls) h.material.opacity = o;
    },
  };
}
// ---------- a drawn outline (frame overlay, §3): the plant as the drawing draws it ----------
// For plants shown before their stage: the same model with paper inside its ink line, exactly
// how the drawing shows its corn and sunflowers, so a not-yet-established plant reads as the
// drawing's own outline and a live one as the drawing come to life. Casts no shadow.
const sketchPaper = toonMaterial({ color: PAL.ground, flat: 1, grain: 1 }); // the ground's own paper
export function sketch(root) {
  root.traverse((m) => {
    if (!m.isMesh || m.userData.outline) return;
    m.material = sketchPaper;
    m.castShadow = false;
  });
  return ink(root, FOLIAGE_INK);
}
// v0.11 (P27-1): the yard pile's place by the house, a trodden-earth patch about 1.0 x 0.7 m with
// a faint ink edge, always drawn (empty, it shows where the pile goes); the world's UnitPile
// stacks the dropped logs and stones on it (carry.js yardSlot).
export function yardPatch() {
  const g = group('YardPile');
  const soil = at(new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), lam(0xe0cfa6, { flat: 1, grain: 1 })), 0, 0.007, 0, -Math.PI / 2);
  soil.scale.set(1, 0.7, 1);
  soil.receiveShadow = true;
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const w = 1 + 0.035 * Math.sin(a * 5 + 1.3); // a hand-drawn wobble
    pts.push(new THREE.Vector3(Math.cos(a) * 0.5 * w, 0.012, Math.sin(a) * 0.35 * w));
  }
  const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.38 }));
  edge.name = 'edge';
  // two flat boards the logs rest on, so the crib reads as stacked, not dropped
  const board = (z) => at(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.07), lam(PALETTE.wood)), -0.22, 0.013, z);
  g.add(soil, edge, board(-0.16), board(0.16));
  g.traverse((m) => { m.userData.noFit = true; if (m.isMesh && m !== soil) m.castShadow = true; });
  soil.userData.noOutline = true;
  return addOutline(g, 0.01);
}

// v0.11 (P27-3): the hammer she builds with. Origin at her grip near the end of the handle,
// handle up +Y, the head across the top with its striking face toward +Z.
export function hammer() {
  const g = group('Hammer');
  const handle = at(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.34, 8), lam(PALETTE.wood, { hatch: 1 })), 0, 0.12, 0);
  const head = at(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.15), lam(PALETTE.charcoal)), 0, 0.29, 0.01);
  const face = at(new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.02, 10), lam(PALETTE.charcoal)), 0, 0.29, 0.09, Math.PI / 2);
  const claw = at(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.07), lam(PALETTE.charcoal)), 0, 0.3, -0.09, -0.35);
  const grip = at(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.09, 8), lam(PALETTE.tool)), 0, -0.01, 0);
  g.add(handle, head, face, claw, grip);
  return shadows(addOutline(g, 0.008));
}

// v0.12: the yard-sale table, its "Yard Sale!" sign, the buyers who come to it, and the dust
// that puffs up when she builds (props.js)
export function yardTable() { return shadows(addOutline(P.yardTable())); }
export function saleSign() { return shadows(addOutline(P.saleSign(), 0.012)); }
export function cropCrate() { return shadows(addOutline(P.cropCrate(), 0.012)); } // v0.25
export function flyingBird() { return shadows(addOutline(P.flyingBird(), 0.012)); }
export function easterEgg(seed) { return shadows(addOutline(P.easterEgg(seed), 0.01)); }
export const sparkleStar = P.sparkleStar;
export function archer() { return shadows(addOutline(P.archer(), 0.014)); }
export function elfArcher() { return shadows(addOutline(P.elfArcher(), 0.014)); }
export function warningArrow() { return shadows(addOutline(P.warningArrow(), 0.008)); }
export function benchStain() { return P.benchStain(); }
export function keepsake(kind) { return shadows(addOutline(P.keepsake(kind), 0.008)); }
export function crumpledSketch() { return shadows(addOutline(P.crumpledSketch(), 0.01)); }
export function buyer(look) { return shadows(addOutline(P.buyer(look), 0.014)); }
export function dustPuff(seed) { const g = addOutline(P.dustPuff(seed), 0.012); g.traverse((m) => { if (m.isMesh) m.castShadow = false; }); return g; }
// Carried-stack unit meshes (W log, R stone, C cob, S sunflower head, T tomato, coins), the same
// models as the piles and crops (V1)
export const unitMesh = P.unitMesh;
