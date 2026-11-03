// World assembly: greybox drawing objects at their inverse-projected anchors, the slice
// stations, colliders (cannon-es, authored per object as the BASE did) and the presentation
// of ledger state. Nothing here changes the ledger: station visuals, reveals and flights only
// show what the ledger already committed and saved.
// Playtest fixes (captain phone test 2026-11-01): the tree fades while it hides Vanessa or the
// marked target; a ground ring marks the nearest collectible and fills with each work unit;
// sources pop as a unit leaves and weed clumps shrink away instead of vanishing. Dropped wood and
// stone pile up at the yard pile and crops set out on the yard-sale table (carry.js), each
// appearing as its flight lands.
// v0.9 (addendum 25): the rake and shovel go from their lean into Vanessa's right hand and back
// (P25-4); crop spots show as dig spots until dug, then the plant comes up (P25-4); every
// renewable wood batch falls from the tree as a dead branch, waiting in the tree while its spot
// is off screen (P25-5); stone lies in finite loose rocks that fade out for good when empty
// (P25-6).
// Spec v0.9 §10.9 (P25-1, P25-3): every drawing part is registered with the stage that gives it
// its colour (game/reveal.js). Until then it is its outline (paper inside the ink line) or its
// blueprint ghost; the blueprint button fades those in and out; a commit washes the colour in.
// The finale's colour (P25-2: grass from her feet, blue sky, yellow sun) is set here too.
// v0.12 (captain's v0.11 playtest): no mats any more (a build's site is marked only by its own
// blueprint outline); crops she walks past go onto the yard-sale table, and a yard sale is a small
// scene (the sign goes down, neighbours walk up, the goods go into their baskets, coins pop out);
// sticks drop from the tree onto random spots around it and fade if left; weeds creep over planted
// crops and a plant left under one wilts; the raised bed is built (its outline until T0); dust
// puffs up when she builds.
// v0.13 (captain's v0.12 playtest): the yard sale grows with the house: a table more per house
// stage pops up in a burst of dust (four at most); the buyers are a crowd of sixteen different
// neighbours, 2-3 at one table up to 8-10 at four, each walking to a table and filling their
// basket; at the home two neighbours set up stalls of their own beside hers; the path is a run of
// flat hand-drawn stepping stones with grass between.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { HOUSE_STAGES, NODES, PILES, REGROW, STAGES, STICK, YARD_SHOWN } from '../game/data.js';
import { digOpen, isCommitted, mainComplete, tableAvailable, tables, weedPresent } from '../game/ledger.js';
import { buyerCount, crowdFor, LOOKS, SELLERS } from '../game/crowd.js';
import { fitToDrawing, HORIZON_V, projectedExtent } from './projection.js';
import * as G from './greybox.js';
import { BORDER_POLYLINE, BOUNDS, CORN_PLANTS, FITS, NEIGHBOUR_STALLS, PATH, SKY, STATIONS, STEPPING, SUNFLOWER_NODES, SUNFLOWERS, TOMATO_NODES } from './layout.js';
import { ease } from '../core/tween.js';
import { TABLE_SHOWN, tableSlot, UnitPile, yardSlot } from './carry.js';
import { fader, groundMaterial, paintable, paperBackdrop } from './look.js';
import { TREE_TRUNK_R } from './hand.js';
import { BLUEPRINT_FADE_MS, FINALE_COLOURS, PARTS, partLook, partsColouredBy, REDUCED_FADE_MS, WASH_MS } from '../game/reveal.js';

// the falling branch (P25-5): canopy shiver, fall, one bounce and the slide to the spot
export const BRANCH_MS = { shiver: 300, fall: 600, bounce: 160, slide: 180 };
export const TOOL_TAKE_MS = 260; // the tool's flight from its lean into her hand, after the 0.5 s take
export const TOOL_RETURN_MS = 400; // P25-4: the 0.4 s eased arc back to its lean
const FADE_OPACITY = 0.3; // the tree while it hides Vanessa or the marked target
const FADE_TAU_MS = 90;
const ray = new THREE.Raycaster();
const tmpV = new THREE.Vector3();
export const REDUCED_FLIGHT_MS = 150; // reduced motion: a unit fades, never arcs (V8)

// a station model's own scale: the bed's weeds a little smaller, the yard pile drawn large enough
// to read on a phone
export function stationScale(def) {
  if (def.bed) return 0.8;
  if (def.kind === 'yard') return 1.25;
  if (def.kind === 'stick') return 0.85;
  return 1;
}

// v0.12 yard sale timings (ms): the sign goes down, the buyers walk up, each takes their goods,
// they walk off; reduced motion: everything fades in place within about a second
export const SALE_MS = { sign: 320, walkIn: 1250, take: 240, pause: 160, walkOut: 1050, linger: 250, stagger: 70 }; // v0.13: about 4 s in all
// where the buyers come from and stand, in drawing units relative to the table (u, v): across
// the stall from the camera, facing it, so the goods stay in view as they go
// where buyers come from (drawing units from the first table, off to the right) and where they
// stand behind a table (from that table)
const BUYER_FROM = [[11, -4], [14, -1.5], [12, 1], [16, -3], [15, 3], [18, 0], [13, 5], [17, 6], [19, -5], [20, 3]];
const BUYER_AT = [[-1.6, -2.4], [0.3, -2.8], [2.1, -2.3]];
const GOODS_PER_TABLE = TABLE_SHOWN;
export const SIGN_SCALE = 1.45;
const PUFF_SIZE = 2.4; // a dust puff read at phone size: about 0.6 m across at its fullest

// The path of a unit flight from a to b over `ms`. -> { ms, fade, at(t, out) -> opacity }:
// `at` writes the position at t in [0, 1] into `out` and returns the unit's opacity.
// Normal: an arc raised above the midpoint, fully opaque. Reduced motion: no travel and no arc,
// the unit sits where it lands and fades in and out within REDUCED_FLIGHT_MS.
export function flightPlan(from, to, ms, reducedMotion = false) {
  const a = from.clone();
  const b = to.clone();
  if (reducedMotion) {
    return { ms: Math.min(ms, REDUCED_FLIGHT_MS), fade: true, at: (t, out) => { out.copy(b); return Math.sin(Math.PI * t); } };
  }
  const lift = 0.6 + a.distanceTo(b) * 0.25;
  return {
    ms,
    fade: false,
    at: (t, out) => {
      out.lerpVectors(a, b, t);
      out.y += Math.sin(Math.PI * t) * lift;
      return 1;
    },
  };
}

// own transparent copies of a mesh's (shared, cached) materials, so one unit can fade alone
function fadeable(obj) {
  const out = [];
  obj.traverse((o) => {
    if (!o.material) return;
    o.userData.fadeBase ??= o.material;
    o.material = o.material.clone();
    o.material.transparent = true;
    o.material.opacity = 0;
    out.push(o.material);
  });
  return out;
}

export class World {
  constructor({ scene, proj, tweens }) {
    this.reducedMotion = () => false; // main.js wires the player's setting
    this.scene = scene;
    this.proj = proj;
    this.tweens = tweens;
    this.physics = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    this.physics.defaultContactMaterial.friction = 0;
    this.objects = {}; // id -> Object3D
    this.stations = {}; // id -> { def, obj, pos }
    this.fits = {}; // id -> { scale, extent, heightM }
    this.root = new THREE.Group();
    scene.add(this.root);
    this.piles = {}; // 'yard' -> the yard pile's units, 'table' -> the yard-sale table's goods
    this.incoming = {}; // `${id}:${res}` -> units still flying to that pile
    this.parts = {}; // drawing part id (reveal.js PARTS) -> its looks
    this.blueprint = true; // P25-3, the player's setting (main.js)
    this.pins = new Set(); // parts a ritual step or a requested hint needs drawn (pinBlueprint)
    this.finaleActive = false; // the blueprint is always hidden in the finale
    this.finished = false; // the finale has coloured the drawing (derives from mainComplete)
    this.heroPos = () => null; // main.js: where Vanessa works (the centre of flat washes)
    this.onWash = null; // main.js: the brush-stroke cue as a colour wash starts
  }

  ground(u, v) { return this.proj.groundAt(u, v); }

  build() {
    const p = this.proj;
    this.buildGround();
    // drawing objects with their per-object scale solved from the drawn extent
    const fitted = (id, obj) => {
      const f = FITS[id];
      obj.rotation.y = f.yaw ?? 0;
      const ext = fitToDrawing(p, obj, f);
      const box = new THREE.Box3().setFromObject(obj);
      this.fits[id] = { scale: +obj.scale.x.toFixed(3), heightM: +(box.max.y - box.min.y).toFixed(2), extent: roundExt(ext), target: f };
      this.root.add(obj);
      this.objects[id] = obj;
      return obj;
    };
    const house = fitted('D01', G.house());
    this.addBox(house, G.HOUSE.w + 0.3, G.HOUSE.d + 0.3, 3);
    const node = (n) => house.getObjectByName(n);
    for (const st of ['H1', 'H2', 'H3', 'H4']) {
      const name = { H1: 'D01_House_H1_Plinth', H2: 'D01_House_H2_Walls', H3: 'D01_House_H3_Roof', H4: 'D01_House_H4_Details' }[st];
      this.addPart(st, { model: node(name), before: [node(`D01_House_Ghost_${st}`), ...(st === 'H1' ? [node('D01_House_H0_Footprint')] : [])] });
    }
    const tree = fitted('D09', G.tree());
    this.addCylinder(tree.position, TREE_TRUNK_R * tree.scale.x);
    this.faders = [G.fadeable(tree)];
    // D10: the broken bench is an ink outline until G2 restores it in the approved brown; with
    // the blueprint off it leaves a faint ink footprint (it still blocks her)
    const bench = fitted('D10', G.benchBroken());
    this.addBox(bench, 1.5, 0.55, 1);
    const restored = G.benchRestored();
    const footprint = G.benchFootprint();
    for (const o of [restored, footprint]) { o.position.copy(bench.position); o.rotation.copy(bench.rotation); o.scale.copy(bench.scale); this.root.add(o); }
    this.addPart('D10', { model: restored, before: [paintable(bench, { colour: 0 })] });
    this.benchFootprint = fader(footprint);
    const bed = fitted('D18', G.raisedBed());
    // the bed's plants sit in it, but apart from its boards: the bed is an outline until T0 (v0.12)
    const bedPlants = G.bedPlants();
    bedPlants.position.copy(bed.position); bedPlants.rotation.copy(bed.rotation); bedPlants.scale.copy(bed.scale);
    this.root.add(bedPlants);
    this.addBox(bed, 2.4, 1.1, 1);
    this.addPart('D18', { model: bed, outlineBefore: true });
    this.addPart('tomatoes', { model: bedPlants.getObjectByName('D19_TomatoStems'), outlineBefore: true });
    this.bed = bed;
    this.nodeViews = {}; // crop node id -> { dig, units: Group of its ripe units (or null) }
    bed.updateMatrixWorld(true);
    const soilY = 0.37; // the bed's soil, bed space (props.js BED.h - 0.05)
    this.bedAt = (id, lift = 0) => bed.localToWorld(new THREE.Vector3(TOMATO_NODES[id][0], soilY + lift, TOMATO_NODES[id][1]));
    for (const id of Object.keys(TOMATO_NODES)) {
      const at = this.bedAt(id);
      const dig = G.digSpot();
      dig.position.copy(at);
      dig.scale.setScalar(0.8);
      dig.visible = false;
      this.root.add(dig);
      // its ripe tomatoes hang on the stem, one per unit
      const units = new THREE.Group(); units.name = `tomatoes:${id}`;
      for (let k = 0; k < NODES[id].yield; k++) {
        const t = G.unitMesh('T');
        t.position.set((k - 0.5) * 0.11, 0.26 + k * 0.07, 0.05);
        t.scale.setScalar(1.05);
        units.add(t);
      }
      units.position.copy(at);
      this.root.add(units);
      const ground = at.clone().setY(0);
      this.nodeViews[id] = { dig, units };
      this.stations[id] = { def: { id, kind: 'node', r: 0.3, label: 'tomatoes' }, obj: units, pos: ground };
    }
    // the tools at their drawn lean; `home` is where each returns (P25-4)
    this.tools = {};
    for (const [id, kind] of [['D13', 'shovel'], ['D14', 'rake']]) {
      const o = fitted(id, G.tool(kind));
      o.updateMatrixWorld(true);
      this.tools[kind] = { obj: o, home: { pos: o.position.clone(), quat: o.quaternion.clone(), scale: o.scale.clone() }, tween: 0 };
    }
    this.heldTool = null;
    this.hand = null; // Vanessa's Hand_R_Tool socket (main.js)

    // corn: one front-row stalk fixes the scale, every plant shares it (silhouettes kept)
    const probe = G.cornPlant({ live: true });
    fitToDrawing(p, probe, FITS.D15);
    const cornScale = probe.scale.x;
    this.fits.D15 = { scale: +cornScale.toFixed(3), heightM: +(1.95 * cornScale).toFixed(2), extent: roundExt(projectedExtent(p, probe)), target: FITS.D15 };
    this.corn = {};
    const cornRest = new THREE.Group(); cornRest.name = 'D15_Corn_Rest'; // the 11 plants that are never nodes
    CORN_PLANTS.forEach((c, i) => {
      const holder = new THREE.Group();
      holder.position.copy(p.groundAt(c.u, c.v));
      holder.scale.setScalar(cornScale);
      holder.rotation.y = (c.u * 7.3) % 1.4;
      const variant = (i * 2 + Math.round(c.v)) % 3;
      if (c.node) {
        const outline = G.cornPlant({ live: false, variant });
        holder.add(outline);
        const live = G.cornPlant({ live: true, variant });
        live.visible = false;
        holder.add(live);
        const dig = G.digSpot();
        dig.position.copy(holder.position);
        dig.visible = false;
        this.root.add(dig);
        this.corn[c.node] = { holder, outline, live, dig, cobs: live.getObjectByName('cobs') };
        this.nodeViews[c.node] = { dig, units: live.getObjectByName('cobs') };
        this.stations[c.node] = { def: { id: c.node, kind: 'node', r: 0.3, label: 'corn' }, obj: holder, pos: holder.position.clone() };
        this.root.add(holder);
        this.addPart(c.node, { model: live, before: [outline] });
      } else {
        holder.add(G.cornStalk(variant)); // in colour at C1, when the patch is complete
        cornRest.add(holder);
      }
    });
    this.root.add(cornRest);
    this.addPart('cornRest', { model: cornRest, outlineBefore: true });
    this.corn.patch = this.addOutlineQuad([[49, 50.5], [84, 50.5], [84, 38], [49, 38]], 'D15_Corn_Footprint');
    this.addPart('cornPlot', { before: [this.corn.patch] });

    const sfProbe = G.sunflower();
    fitToDrawing(p, sfProbe, FITS.D16);
    this.fits.D16 = { scale: +sfProbe.scale.x.toFixed(3), heightM: +(2.2 * sfProbe.scale.x).toFixed(2), extent: roundExt(projectedExtent(p, sfProbe)), target: FITS.D16 };
    for (const [i, s] of SUNFLOWERS.entries()) {
      const f = G.sunflower(i, { live: true }); // its outline look until S0 (two) or S1 (two)
      f.position.copy(p.groundAt(s.u, s.v));
      f.scale.setScalar(sfProbe.scale.x);
      this.root.add(f);
      this.addPart(`sf${i}`, { model: f, outlineBefore: true });
      // v0.11: each plant is a crop node dug with the shovel (s1, s2 at S0; s3, s4 at S1)
      const node = SUNFLOWER_NODES[i];
      const dig = G.digSpot();
      dig.position.copy(f.position);
      dig.visible = false;
      this.root.add(dig);
      this.nodeViews[node] = { dig, units: null };
      this.stations[node] = { def: { id: node, kind: 'node', r: 0.3, label: 'sunflowers' }, obj: f, pos: f.position.clone() };
    }
    this.addPart('sfPlot', { before: [this.addOutlineQuad([[77, 72], [95, 72], [95, 60], [77, 60]], 'D16_Sunflower_Footprint')] });

    // D11 scattered border stones and D12 stepping-stone outlines, D08 path outline
    let seed = 1;
    const stones = [];
    for (const line of BORDER_POLYLINE) {
      for (let i = 0; i < line.length - 1; i++) {
        const [a, b] = [line[i], line[i + 1]];
        const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.6));
        for (let k = 0; k < n; k++) {
          const t = k / n;
          seed++;
          stones.push({ seed, pos: p.groundAt(a[0] + (b[0] - a[0]) * t + ((seed * 13) % 7 - 3) * 0.12, a[1] + (b[1] - a[1]) * t + ((seed * 7) % 5 - 2) * 0.15) });
        }
      }
    }
    const scattered = G.borderStones(stones);
    this.root.add(scattered);
    // G4 settles the same stones into the drawn ring, evenly, keeping the path-facing gap
    const ring = [];
    for (const line of BORDER_POLYLINE) {
      for (let i = 0; i < line.length - 1; i++) {
        const [a, b] = [line[i], line[i + 1]];
        const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.25));
        for (let k = 0; k < n; k++) ring.push({ seed: ring.length + 3, pos: p.groundAt(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n) });
      }
      const [u, v] = line[line.length - 1];
      ring.push({ seed: ring.length + 3, pos: p.groundAt(u, v) });
    }
    const arranged = G.borderRing(ring);
    this.root.add(arranged);
    this.addPart('D11', { model: arranged, radial: true, before: [paintable(scattered, { colour: 0 })] });
    const ovals = new THREE.Group(); ovals.name = 'D12_Stones_Outlines';
    const setStones = new THREE.Group(); setStones.name = 'D12_Stones';
    STEPPING.forEach(([u, v], i) => {
      const o = G.steppingOutline(i); o.position.copy(p.groundAt(u, v)); ovals.add(o);
      const st = G.steppingStone(i); st.position.copy(p.groundAt(u, v)); setStones.add(st);
    });
    this.root.add(ovals, setStones);
    this.addPart('D12', { model: setStones, radial: true, before: [ovals] });
    const path = this.buildPathOutline();
    this.addPart('D08', { model: path.gravel, radial: true, before: path.dashes });
    this.buildSprouts();
    this.buildSky();

    // stations
    for (const def of STATIONS) this.buildStation(def);
    this.buildRegrowth();
    this.buildSale();
    this.marker = { obj: G.marker(), id: null, alpha: 0, t: 0, pop: 0, popAmp: 0, scale: 1 };
    this.marker.obj.visible = false;
    this.root.add(this.marker.obj);
    this.buildBranch();
    this.boundsQuad = [[BOUNDS.uMin, BOUNDS.vMin], [BOUNDS.uMax, BOUNDS.vMin], [BOUNDS.uMax, BOUNDS.vMax], [BOUNDS.uMin, BOUNDS.vMax]]
      .map(([u, v]) => p.groundAt(u, v));
  }

  buildGround() {
    const p = this.proj;
    // finite ground whose far edge is the drawn horizon (D23); generous margins elsewhere
    const far = p.groundAt(50, HORIZON_V).z;
    const near = p.groundAt(50, 100).z;
    const halfW = p.groundAt(0, HORIZON_V).distanceTo(p.groundAt(100, HORIZON_V)) * 0.5 + 30;
    const depth = near - far + 30;
    const geo = new THREE.PlaneGeometry(halfW * 2, depth);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, far + depth / 2);
    // the drawing's paper: evenly lit, with the screen-space grain (spec §10.6 item 5)
    this.groundMat = groundMaterial(FINALE_COLOURS.grass, FINALE_COLOURS.grassStroke);
    const ground = new THREE.Mesh(geo, this.groundMat);
    ground.receiveShadow = true;
    ground.name = 'D24_Ground';
    this.root.add(ground);
    const horizon = G.horizon(halfW);
    horizon.position.set(0, 0, far);
    this.root.add(horizon);
    this.skyMesh = paperBackdrop(); // the sky: paper, never a flat clear colour (blue in the finale)
    this.skyMesh.material.uniforms.uSkyCol.value.set(FINALE_COLOURS.sky);
    this.root.add(this.skyMesh);
    // the far corners of the ground any framing shows (a portrait phone sees well below and
    // beside the drawing): the grass reaches them at the end of its spread
    this.groundCorners = [[-40, HORIZON_V], [140, HORIZON_V], [-40, 170], [140, 170]].map(([u, v]) => p.groundAt(u, v));
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.physics.addBody(body);
  }

  // D08: the blueprint's dashed edges before G1, and the path G1 lays between them (v0.13: flat
  // stepping stones with grass between, no longer a grey gravel ribbon)
  buildPathOutline() {
    const p = this.proj;
    const pts = PATH.map(([u, v]) => p.groundAt(u, v));
    const curve = new THREE.CatmullRomCurve3(pts);
    const samples = curve.getPoints(60);
    const dashes = [];
    const edges = [];
    for (const side of [-1, 1]) {
      const edge = samples.map((q, i) => {
        const a = samples[Math.max(0, i - 1)];
        const b = samples[Math.min(samples.length - 1, i + 1)];
        const dir = new THREE.Vector3().subVectors(b, a).normalize();
        const n = new THREE.Vector3(-dir.z, 0, dir.x);
        const width = 0.55 + 0.45 * (i / samples.length); // narrowing at the door
        return q.clone().addScaledVector(n, side * width).setY(0.02);
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), new THREE.LineDashedMaterial({ color: G.PALETTE.ink, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.45 }));
      line.computeLineDistances();
      line.name = 'D08_Path_Outline';
      this.root.add(line);
      dashes.push(line);
      edges.push(edge);
    }
    this.pathCurve = curve;
    const gravel = G.stonePath(edges[0], edges[1]); // v0.13: stepping stones with grass between
    this.root.add(gravel);
    return { dashes, gravel };
  }

  // D20: fine permanent pen marks at the stones, bench, crops and bed (green in the finale)
  buildSprouts() {
    const at = [[6, 87], [21, 86.5], [27.5, 78], [44, 67], [50.5, 73], [57, 61], [61, 88], [78, 89], [86, 79.5],
      [93, 75], [74.5, 71], [46, 90], [30, 92], [13, 91], [52.5, 55], [71, 55.5], [89, 58], [97, 66]];
    this.sprouts = at.map(([u, v], i) => {
      const o = G.sprout(i);
      o.position.copy(this.proj.groundAt(u, v));
      o.scale.setScalar(1.2);
      this.root.add(o);
      return { obj: o, mat: o.children[0].material, pos: o.position };
    });
    // v0.13: the path's grass tufts green with the ground in the finale, like the sprouts
    const tufts = this.parts.D08?.model?.root.getObjectByName('D08_Path_Tufts');
    if (tufts) {
      const mid = this.pathCurve.getPoint(0.5);
      this.sprouts.push({ obj: tufts, mat: tufts.material, pos: new THREE.Vector3(mid.x, 0, mid.z) });
    }
  }

  buildSky() {
    const p = this.proj;
    const z = p.groundAt(50, HORIZON_V).z - 2;
    const sunC = p.backdropAt(SKY.D22.u, SKY.D22.v, z);
    const sunR = sunC.distanceTo(p.backdropAt(SKY.D22.u, SKY.D22.v - SKY.D22.rv, z));
    // each ray ends at the composition rectangle (P23-4b): metres per drawing unit across and down
    const ku = sunC.distanceTo(p.backdropAt(SKY.D22.u + 1, SKY.D22.v, z));
    const kv = sunC.distanceTo(p.backdropAt(SKY.D22.u, SKY.D22.v + 1, z));
    const maxLen = (a) => {
      const du = Math.cos(a) / ku; const dv = -Math.sin(a) / kv; // drawing units per metre
      let t = Infinity;
      if (du > 1e-6) t = Math.min(t, (99.5 - SKY.D22.u) / du); else if (du < -1e-6) t = Math.min(t, (0.5 - SKY.D22.u) / du);
      if (dv > 1e-6) t = Math.min(t, (99.5 - SKY.D22.v) / dv); else if (dv < -1e-6) t = Math.min(t, (0.5 - SKY.D22.v) / dv);
      return t;
    };
    const sun = G.sun(sunR, maxLen);
    sun.position.copy(sunC);
    sun.lookAt(p.camera.position);
    this.root.add(sun);
    this.sunParts = { disc: sun.getObjectByName('D22_SunDisc'), ink: sun.getObjectByName('D22_SunInk') };
    const bc = p.backdropAt(SKY.D21.u, SKY.D21.v, z);
    const bw = bc.distanceTo(p.backdropAt(SKY.D21.u + SKY.D21.wu, SKY.D21.v, z));
    const flock = G.birds(bw / 2.2);
    flock.position.copy(bc);
    flock.lookAt(p.camera.position);
    this.root.add(flock);
    this.objects.D22 = sun;
    this.objects.D21 = flock;
  }

  addOutlineQuad(uvs, name) {
    const pts = uvs.map(([u, v]) => this.proj.groundAt(u, v).setY(0.02));
    const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: G.PALETTE.ink, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.5 }));
    loop.computeLineDistances();
    loop.name = name;
    this.root.add(loop);
    return loop;
  }

  addBox(obj, w, d, h) {
    const s = obj.scale.x;
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3((w * s) / 2, h / 2, (d * s) / 2)) });
    body.position.set(obj.position.x, h / 2, obj.position.z);
    body.quaternion.setFromEuler(0, obj.rotation.y, 0);
    this.physics.addBody(body);
    return body;
  }

  addCylinder(pos, r) {
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Cylinder(r, r, 3, 10) });
    body.position.set(pos.x, 1.5, pos.z);
    this.physics.addBody(body);
    return body;
  }

  buildStation(def) {
    const pos = this.proj.groundAt(def.u, def.v);
    let obj;
    switch (def.kind) {
      case 'weed': obj = G.weed(); break;
      case 'pile': obj = G.fallenBranch(PILES[def.id].units, def.id === 'pW1' ? 1 : 2); break;
      case 'stick': obj = G.fallenBranch(STICK.units, Number(def.id.slice(1)) + 3); obj.visible = false; break;
      case 'rock': obj = G.looseRock(Number(def.id.slice(1)) || 9); break;
      case 'tools': obj = new THREE.Group(); break; // the tools themselves are D13/D14
      case 'site': obj = new THREE.Group(); break; // v0.12: nothing marks a build site
      case 'yard': obj = G.yardPatch(); break;
      case 'table': obj = G.yardTable(); obj.visible = false; break;
      default: throw new Error(def.kind);
    }
    obj.position.copy(pos);
    if (def.bed) { obj.position.copy(this.bedAt(def.bed)).add(new THREE.Vector3(0, 0, 0.06)); pos.copy(obj.position).setY(0); }
    obj.name = `${def.kind}:${def.id}`;
    this.root.add(obj);
    this.stations[def.id] = { def, obj, pos };
    if (def.kind === 'yard') this.piles.yard = new UnitPile(obj, yardSlot, 1.4);
    obj.scale.setScalar(stationScale(def));
    if (def.kind === 'table') {
      this.piles[def.id] = new UnitPile(obj, tableSlot, 1.3);
      const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.33, 0.28)) });
      body.position.set(pos.x, 0.33, pos.z);
      this.stations[def.id].body = body;
    }
  }

  // v0.12: a weed that can creep over each planted crop node, in front of its plant (hidden
  // until the ledger says it is there); it is a weed station like the opening's clumps
  buildRegrowth() {
    for (const id of Object.keys(NODES)) {
      const plant = this.stations[id];
      if (!plant) continue;
      const obj = G.weed();
      const bed = NODES[id].res === 'T';
      const pos = bed ? this.bedAt(id).add(new THREE.Vector3(0.1, 0, 0.12)) : plant.pos.clone().add(new THREE.Vector3(0.08, 0, 0.18));
      obj.position.copy(pos);
      obj.visible = false;
      obj.name = `weed:wr-${id}`;
      this.root.add(obj);
      const def = { id: `wr-${id}`, kind: 'weed', r: 0.3, label: 'weeds', regrow: id, ...(bed ? { bed: id } : {}) };
      obj.scale.setScalar(stationScale(def));
      this.stations[def.id] = { def, obj, pos: pos.clone().setY(0) };
    }
  }

  // v0.12: the sale's sign and buyers, made once and shown only during a yard sale
  buildSale() {
    const t = this.stations.table;
    const sign = G.saleSign();
    sign.visible = false;
    sign.position.copy(this.ground(STATIONS.find((d) => d.id === 'table').u + 2.2, STATIONS.find((d) => d.id === 'table').v + 1.2));
    sign.rotation.y = -0.25;
    sign.scale.setScalar(SIGN_SCALE);
    this.root.add(sign);
    // v0.13: the crowd, sixteen different neighbours made once (game/crowd.js)
    const buyers = LOOKS.map((look) => {
      const b = G.buyer(look);
      b.visible = false;
      b.userData.look = look;
      this.root.add(b);
      return b;
    });
    this.sale = { sign, buyers, active: false, goods: null, token: 0, table: t };
    // the neighbours' stalls at the home: a table each, their goods and the neighbour behind it
    this.stalls = NEIGHBOUR_STALLS.map((p, i) => {
      const g = new THREE.Group(); g.name = `Stall_${i}`;
      const table = G.yardTable();
      table.add(G.stallGoods(i));
      g.add(table);
      g.position.copy(this.ground(p.u, p.v));
      g.visible = false;
      this.root.add(g);
      const seller = buyers[SELLERS[i]];
      const at = this.ground(p.u + 0.4, p.v - 2.6);
      const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.33, 0.28)) });
      body.position.set(g.position.x, 0.33, g.position.z);
      return { group: g, seller, at, body, face: g.position.clone() };
    });
    this.stallsShown = false;
  }
  // v0.13: her tables, first to last
  tableStations() { return STATIONS.filter((d) => d.kind === 'table').map((d) => this.stations[d.id]); }

  // targets for the interaction controller (positions in metres on the ground)
  targets(l) {
    const out = [];
    for (const [id, s] of Object.entries(this.stations)) {
      if (s.def.kind === 'table' && (!tableAvailable(l) || s.def.table >= tables(l))) continue;
      if (s.def.kind === 'site' && isCommitted(l, id)) continue; // built
      if (s.def.kind === 'node' && !this.nodeViews[id]) continue;
      if (s.def.kind === 'rock' && id === 'RX' && !l.rocks.RX) continue; // the recovery rock only when needed
      if (s.def.regrow && !weedPresent(l, id)) continue;
      const kind = s.def.kind === 'node' && digOpen(l, id) ? 'dig' : s.def.kind;
      const t = { id, kind, x: s.pos.x, z: s.pos.z, r: s.def.r, label: s.def.label };
      if (s.def.kind === 'stick' && this.branch.state !== 'idle' && this.branch.id === id) t.hold = true; // still falling
      out.push(t);
    }
    return out;
  }

  // ---------- presentation of ledger state ----------
  // `animate`: a live transaction (weeds shrink away); false on load (they are simply gone)
  sync(l, animate = false) {
    for (const [id, s] of Object.entries(this.stations)) {
      const { kind } = s.def;
      if (kind === 'weed') {
        const gone = s.def.regrow ? !weedPresent(l, id) : l.weeds[id];
        if (gone && s.obj.visible && animate && !this.revealing?.has(id)) this.shrinkAway(id);
        else if (!gone && !s.obj.visible && animate && s.def.regrow && !this.revealing?.has(id)) this.creepIn(id);
        else if (!this.revealing?.has(id)) { s.obj.visible = !gone; s.obj.scale.setScalar(stationScale(s.def)); }
      } else if (kind === 'pile') {
        showUnits(s.obj, l.piles[id]);
        s.obj.getObjectByName('patch').visible = l.piles[id] > 0; // a starter pile never returns
      } else if (kind === 'stick') {
        // v0.12: a stick lies where it fell; one that is falling shows when it lands
        const n = l.sticks[id].units;
        showUnits(s.obj, n);
        if (!this.revealing?.has(id)) s.obj.visible = n > 0 && !(this.branch.state !== 'idle' && this.branch.id === id);
      } else if (kind === 'rock') {
        const n = l.rocks[id];
        showUnits(s.obj, n);
        if (n === 0 && s.obj.visible && animate && !this.revealing?.has(id) && s.seen) this.fadeRock(id);
        else if (!this.revealing?.has(id)) s.obj.visible = n > 0;
        if (n > 0) s.seen = true; // a rock that had stone fades when emptied; an empty one never shows
      } else if (kind === 'yard') {
        // the pile: what she has dropped, each unit appearing as its flight lands (P27-1)
        const n = (r) => Math.max(0, Math.min(YARD_SHOWN[r], l.yard[r] - this.inFlight('yard', r)));
        this.piles.yard.set([...Array(n('W')).fill('W'), ...Array(n('R')).fill('R')], { pop: animate });
        this.yardHidden = Math.max(0, l.yard.W - YARD_SHOWN.W) + Math.max(0, l.yard.R - YARD_SHOWN.R);
      } else if (kind === 'table' && s.def.table === 0) {
        // v0.12: the table appears with her first crop plot; its goods, each as its flight lands,
        // and during a sale the sold goods until the buyers take them. v0.13: one more table per
        // house stage (it pops up in dust), the goods six to a table in order
        // a new table waits for its house stage's DIY to end (`tableHold`, main.js)
        let n = tableAvailable(l) ? tables(l) : 0;
        if (this.tableHold) n = Math.min(n, Math.max(1, this.tablesShown ?? 1));
        this.tablesShown = n;
        const shown = this.sale.goods ? [...this.sale.goods] : [];
        for (const c of ['C', 'S', 'T']) for (let i = l.table[c] - this.inFlight('table', c); i > 0 && shown.length < GOODS_PER_TABLE * n; i--) shown.push(c);
        for (const st of this.tableStations()) {
          const k = st.def.table;
          const want = k < n;
          if (want && !st.obj.visible && !this.revealing?.has(st.def.id) && !this.playHidden) {
            if (k > 0 && animate) this.popTable(st); else st.obj.visible = true;
          }
          if (!want && st.obj.visible && !this.revealing?.has(st.def.id)) st.obj.visible = false;
          this.piles[st.def.id].set(want ? shown.slice(k * GOODS_PER_TABLE, (k + 1) * GOODS_PER_TABLE) : [], { pop: animate });
          if (want && !st.body.world) this.physics.addBody(st.body);
          if (!want && st.body.world) this.physics.removeBody(st.body);
        }
        this.syncStalls(n, animate);
      }
    }
    this.lastLedger = l;
    if (this.finished) for (const s of Object.values(this.stations)) if (s.def.kind === 'rock') s.obj.visible = false; // never return (P25-6)
    for (const [id, c] of Object.entries(this.nodeViews)) {
      const committed = l.stages[NODES[id].stage].committed;
      const dug = l.nodes[id].dug;
      // an open dig spot (P25-4), once the weed on it is raked (v0.11 P27-4)
      if (!this.revealing?.has(id)) c.dig.visible = committed && !dug;
      if (c.units) showUnits(c.units, l.nodes[id].remaining);
    }
    this.syncTool(l.tool, animate);
    this.applyParts(l);
  }

  // ---------- the colour-reveal rule and the blueprint (spec v0.9 §10.9) ----------
  // A drawing part: `model`, the finished model (shown in colour once its stage commits; with
  // `outlineBefore` it is also drawn before that, in its outline look); `before`, what is drawn
  // only until then (blueprint ghosts, dashed borders, a separate outline model). Flat parts wash
  // outward from where Vanessa works (`radial`), the rest upward from the ground.
  addPart(id, { model = null, outlineBefore = false, before = [], radial = false }) {
    if (!PARTS[id]) throw new Error(`unknown drawing part ${id}`);
    const part = {
      id,
      stage: PARTS[id].stage,
      model: model && paintable(model, { colour: 0, radial }),
      outlineBefore,
      before: before.map((o) => (o.setOpacity ? o : fader(o))),
      alpha: 1, // blueprint visibility of what is drawn before the stage, 0..1
      target: 1,
    };
    this.parts[id] = part;
    return part;
  }
  // `showBuilt` (debug, presentation only) shows the finished drawing for the comparison overlay
  partDone(part, l) { return this.showBuilt || (!!l && partLook(l, part.id) === 'colour'); }
  blueprintShown(part) { return !this.finaleActive && (this.blueprint || this.pins.has(part.id)); }

  // the look of every part on this ledger, without animation (load, sync); a part whose reveal
  // is playing is left to it
  applyParts(l) {
    for (const part of Object.values(this.parts)) {
      if (this.revealing?.has(part.id)) continue;
      const done = this.partDone(part, l);
      part.target = done ? 1 : this.blueprintShown(part) ? 1 : 0;
      if (done) part.alpha = 1;
      if (part.model) {
        part.model.root.visible = done || (part.outlineBefore && part.alpha > 0);
        part.model.setColour(done ? 1 : 0);
        part.model.setOpacity(done ? 1 : part.alpha);
      }
      for (const b of part.before) { b.root.visible = !done && part.alpha > 0; b.setOpacity(part.alpha); }
    }
    this.applyFootprint();
  }
  applyFootprint() {
    const b = this.parts.D10;
    if (!b || !this.benchFootprint) return;
    const done = this.lastLedger && this.partDone(b, this.lastLedger);
    const k = done || this.finaleActive ? 0 : 1 - b.alpha;
    this.benchFootprint.root.visible = k > 0.01;
    this.benchFootprint.setOpacity(k);
  }
  // P25-3: the player's toggle; `animate` fades over 200 ms (150 ms with reduced motion)
  setBlueprint(on, animate = true) {
    this.blueprint = !!on;
    for (const part of Object.values(this.parts)) {
      part.target = this.lastLedger && this.partDone(part, this.lastLedger) ? 1 : this.blueprintShown(part) ? 1 : 0;
      if (!animate) part.alpha = part.target;
    }
    if (!animate && this.lastLedger) this.applyParts(this.lastLedger);
  }
  // A ritual step or a requested hint that needs a hidden outline (E08's ovals D12 and pebble
  // among D11, the bench D10) pins it: it shows even with the blueprint off (P25-3).
  pinBlueprint(id, on = true) {
    if (on) this.pins.add(id); else this.pins.delete(id);
    this.setBlueprint(this.blueprint);
  }
  // per frame (real time, so the toggle answers in the Pause panel too)
  updateLooks(dtMs) {
    const ms = this.reducedMotion() ? Math.min(REDUCED_FADE_MS, BLUEPRINT_FADE_MS) : BLUEPRINT_FADE_MS;
    let moved = false;
    for (const part of Object.values(this.parts)) {
      if (part.alpha === part.target || this.revealing?.has(part.id)) continue;
      const step = dtMs / ms;
      part.alpha = part.target > part.alpha ? Math.min(part.target, part.alpha + step) : Math.max(part.target, part.alpha - step);
      const done = this.lastLedger && this.partDone(part, this.lastLedger);
      if (done) continue;
      if (part.model && part.outlineBefore) { part.model.root.visible = part.alpha > 0; part.model.setOpacity(part.alpha); }
      for (const b of part.before) { b.root.visible = part.alpha > 0; b.setOpacity(part.alpha); }
      moved = true;
    }
    if (moved) this.applyFootprint();
  }
  // which parts are drawn now, for tests and the debug readout: id -> 'colour' | 'outline' |
  // 'ghost' | 'hidden'
  looks() {
    const out = {};
    for (const part of Object.values(this.parts)) {
      const done = this.lastLedger && this.partDone(part, this.lastLedger);
      if (done) out[part.id] = !part.model || part.model.colour === 1 ? 'colour' : 'outline'; // a plot border is simply gone
      else if (part.alpha === 0) out[part.id] = 'hidden';
      else out[part.id] = PARTS[part.id].before;
    }
    return out;
  }

  // The stage work animation, started only after the commit is saved (annex §C.6): each part
  // the stage finishes is built in ink (house parts rise, plants grow, the rest appears), then
  // takes its colour in a 0.5 s wash. Reduced motion: no build motion, a fade of 150 ms or less.
  async reveal(stage, ms, l = this.lastLedger) {
    this.revealing ??= new Set();
    if (STAGES[stage].crop) {
      // a crop plot is dug, not built: its commit opens its two dig spots, and the first plot
      // brings the yard-sale table (whichever crop she chose)
      const spots = Object.keys(NODES).filter((id) => NODES[id].stage === stage && this.nodeViews[id]).map((id) => this.nodeViews[id].dig);
      const crate = this.stations.table.obj;
      const withCrate = !crate.visible;
      if (withCrate) this.revealing.add('table');
      const base = spots.map((d) => d.scale.x);
      for (const d of spots) { d.visible = true; d.scale.setScalar(0.01); }
      if (withCrate) { crate.visible = true; crate.scale.setScalar(0.01); }
      await this.tweens.run(500, (t) => {
        const k = Math.max(0.01, t);
        spots.forEach((d, i) => d.scale.setScalar(k * base[i]));
        if (withCrate) crate.scale.setScalar(k);
      }, ease.outBack);
      spots.forEach((d, i) => d.scale.setScalar(base[i]));
      this.revealing.delete('table');
    }
    // the parts this commit finishes (a crop plant waits for its digging: revealDig)
    await this.washParts(partsColouredBy(stage).filter((id) => this.parts[id] && partLook(l, id) === 'colour'), ms);
  }

  // v0.12: a part keeps its blueprint look while she hops to it (the commit is saved already);
  // `reveal` then builds it and washes its colour in
  holdReveal(stage, l) {
    this.revealing ??= new Set();
    for (const id of partsColouredBy(stage)) if (this.parts[id] && partLook(l, id) === 'colour') this.revealing.add(id);
  }

  // a dug spot: the soil patch goes, the plant comes up in ink and takes its colour (P25-4,
  // P25-1); a part that waits for several spots (the rest of the corn patch, the tomatoes)
  // washes in when its last one is dug
  async revealDig(id, l = this.lastLedger) {
    const c = this.nodeViews[id];
    if (c) c.dig.visible = false;
    const ids = Object.keys(this.parts).filter((p) => PARTS[p].dug?.includes(id) && partLook(l, p) === 'colour');
    await this.washParts(ids, WASH_MS + (this.reducedMotion() ? 0 : 600));
  }

  // Build each part in ink (house parts rise, a dug corn plant grows), then wash its colour in
  // over 0.5 s; reduced motion: no build motion, a fade of 150 ms or less.
  async washParts(ids, ms) {
    if (!ids.length) return;
    this.revealing ??= new Set();
    const parts = ids.map((id) => this.parts[id]);
    const reduced = this.reducedMotion();
    ids.forEach((id) => this.revealing.add(id));
    for (const part of parts) {
      for (const b of part.before) b.root.visible = false;
      if (!part.model) continue;
      part.model.setOpacity(1);
      part.model.setColour(0);
      part.model.root.visible = true;
      part.base = part.model.root.scale.clone();
    }
    this.applyFootprint();
    const buildMs = Math.max(0, (ms ?? 0) - WASH_MS);
    const models = parts.filter((x) => x.model);
    if (!reduced && buildMs > 0) {
      // house parts rise from the plinth line and a dug corn plant grows, in ink; a part already
      // drawn in outline (plants, the bench, the stones) simply waits for its colour
      const kind = (x) => (['H1', 'H2', 'H3', 'H4', 'D18'].includes(x.id) ? 'rise' : ['c1', 'c2', 'c3', 'c4'].includes(x.id) ? 'grow' : null);
      await this.tweens.run(buildMs, (t) => {
        for (const x of models) {
          const k = kind(x);
          if (k === 'rise') x.model.root.scale.set(x.base.x, x.base.y * Math.max(0.01, ease.inOut(t)), x.base.z);
          else if (k === 'grow') x.model.root.scale.copy(x.base).multiplyScalar(Math.max(0.01, ease.outBack(Math.min(1, t * 1.6))));
        }
      });
      for (const x of models) x.model.root.scale.copy(x.base);
    }
    if (models.length) {
      this.onWash?.();
      const c = this.heroPos();
      for (const x of models) x.model.washRange(c);
      if (reduced) {
        await this.tweens.run(REDUCED_FADE_MS, (t) => models.forEach((x) => x.model.setColour(t)));
      } else {
        await this.tweens.run(WASH_MS, (t) => models.forEach((x) => x.model.setWash(t)), ease.inOut);
      }
      for (const x of models) x.model.setColour(1);
    }
    ids.forEach((id) => this.revealing.delete(id));
    if (this.lastLedger) this.applyParts(this.lastLedger);
  }

  // ---------- the colour finale (P25-2): presentation only ----------
  // Hide the play elements (V9: the yard pile, the table and its goods, sources, weeds,
  // leftover rocks, the ring); k 0 shown .. 1 gone. Crop plants stay: they are the drawing.
  setPlayHidden(k) {
    this.playHidden = k;
    for (const s of Object.values(this.stations)) {
      if (!['weed', 'pile', 'stick', 'table', 'rock', 'yard'].includes(s.def.kind)) continue;
      if (k >= 1) s.obj.visible = false;
      s.obj.scale.setScalar(stationScale(s.def) * Math.max(0.01, 1 - k));
    }
    if (k > 0) {
      this.marker.obj.visible = false; this.sale.sign.visible = false;
      for (const b of this.sale.buyers) b.visible = false;
      if (this.stallsShown) { this.stallsShown = false; for (const st of this.stalls) { st.group.visible = false; } }
    }
    if (k === 0) {
      for (const s of Object.values(this.stations)) {
        if (!['weed', 'pile', 'stick', 'table', 'rock', 'yard'].includes(s.def.kind)) continue;
        s.obj.scale.setScalar(stationScale(s.def));
        if (['pile', 'yard'].includes(s.def.kind)) s.obj.visible = true; // sync shows their units
      }
      if (this.lastLedger) this.sync(this.lastLedger); // weeds, sticks, the table and rocks by the ledger
    }
  }
  // grass 0..1 spreads from `centre` (her feet) to the far corners; sky 0..1 rises from the
  // horizon; sun 0..1 fills the disc with yellow and deepens its strokes. All 0: paper and ink.
  setFinaleColour({ grass = 0, sky = 0, sun = 0, centre = null } = {}) {
    const g = this.groundMat.uniforms;
    if (centre) g.uGrassC.value.set(centre.x, centre.z);
    const c = g.uGrassC.value;
    const reach = Math.max(...this.groundCorners.map((q) => Math.hypot(q.x - c.x, q.z - c.y))) + 4;
    const r = grass <= 0 ? 0 : grass >= 1 ? 1e4 : 0.5 + ease.inOut(grass) * reach;
    g.uGrassR.value = r;
    const ink = new THREE.Color(G.PALETTE.ink);
    const green = new THREE.Color(FINALE_COLOURS.sprout);
    for (const sp of this.sprouts) {
      const d = Math.hypot(sp.pos.x - c.x, sp.pos.z - c.y);
      sp.mat.color.copy(ink).lerp(green, Math.max(0, Math.min(1, (r - d) / 1.5)));
    }
    this.skyMesh.material.uniforms.uSky.value = sky;
    const { disc, ink: strokes } = this.sunParts;
    disc.visible = sun > 0;
    disc.material.opacity = sun;
    strokes.material.color.copy(ink).lerp(new THREE.Color(FINALE_COLOURS.sunInk), sun);
    this.finaleColour = { grass, sky, sun };
  }
  // the horizon's height on screen for the sky's rise (per frame, with the camera in use)
  updateSky(camera) {
    if (!(this.finaleColour?.sky > 0)) return;
    tmpV.set(0, 0, this.groundCorners[0].z).project(camera);
    this.skyMesh.material.uniforms.uHorizon.value = Math.max(0, Math.min(1, (tmpV.y + 1) / 2));
  }
  // the finale's outline step: anything the ledger has not finished (normally nothing at H4)
  // takes its colour, k 0..1; 0 gives every part back its ledger look
  finaleOutlines(k) {
    if (k === 0) {
      if (this.finaleOutlineK && this.lastLedger) this.applyParts(this.lastLedger);
      this.finaleOutlineK = 0;
      return;
    }
    this.finaleOutlineK = k;
    for (const part of Object.values(this.parts)) {
      if (!part.model || (this.lastLedger && this.partDone(part, this.lastLedger))) continue;
      for (const b of part.before) b.root.visible = false;
      part.model.root.visible = true;
      part.model.setOpacity(1);
      part.model.setColour(k);
    }
  }
  // The opening (world/opening.js): k 1 draws every part in full, as the drawing shows it (the
  // finished model in its outline look, no ghost or dashed border); k 0 gives every part back
  // its own look on the ledger (applyParts). In between, the parts that are not built yet turn
  // from the drawing into their blueprint ghosts. A part the ledger has finished is left alone.
  drawingLook(k) {
    if (k <= 0) {
      if (this.drawingK && this.lastLedger) this.applyParts(this.lastLedger);
      this.drawingK = 0;
      return;
    }
    this.drawingK = k;
    for (const part of Object.values(this.parts)) {
      if (this.lastLedger && this.partDone(part, this.lastLedger)) continue;
      const own = part.outlineBefore ? part.alpha : 0;
      if (part.model) {
        const o = k + (1 - k) * own;
        part.model.root.visible = o > 0.01;
        part.model.setColour(0);
        part.model.setOpacity(o);
      }
      for (const b of part.before) {
        const o = (1 - k) * part.alpha;
        b.root.visible = o > 0.01;
        b.setOpacity(o);
      }
    }
    if (this.benchFootprint) this.benchFootprint.root.visible = false;
  }
  // the coloured end state (after the finale, Skip, or loading a complete save)
  setFinished(on, centre = null) {
    this.finished = on;
    this.setFinaleColour(on ? { grass: 1, sky: 1, sun: 1, centre } : {});
  }

  // an emptied rock: its patch shrinks away for good (P25-6)
  async fadeRock(id) {
    this.revealing ??= new Set();
    this.revealing.add(id);
    const o = this.stations[id].obj;
    for (let waited = 0; waited < 400 && o.userData.pulsing; waited += 50) await this.tweens.wait(50);
    await this.tweens.run(this.reducedMotion() ? 150 : 450, (t) => o.scale.setScalar(Math.max(0.01, 1 - t)), ease.inOut);
    o.visible = false;
    o.scale.setScalar(1);
    this.revealing.delete(id);
  }

  // ---------- the tools (P25-4) ----------
  // The held tool stands in Vanessa's right fist, handle nearly upright and leaning a little
  // forward and out, its blade by her feet: each frame it follows her Hand_R_Tool socket (so it
  // moves with the walk and the raking or digging strokes) and turns with her. It flies there
  // from its lean when taken (after the 0.5 s take) and arcs back to its exact drawn lean in
  // 0.4 s when its job is done or she swaps. Reduced motion: a 150 ms fade instead of the arcs.
  setHand(hand, body) { this.hand = hand; this.heroView = body; }
  syncTool(tool, animate) {
    if (!this.hand || tool === this.heldTool) return;
    const prev = this.heldTool;
    this.heldTool = tool;
    if (prev) this.moveTool(prev, false, animate);
    if (tool) this.moveTool(tool, true, animate);
  }
  // where the held tool goes now (root space = world space here)
  gripWorld(kind, pos, quat) {
    const t = this.tools[kind];
    const v = this.heroView;
    this.hand.updateWorldMatrix(true, false);
    const hp = this.hand.getWorldPosition(tmpV);
    const side = Math.sign(v.worldToLocal(hp.clone()).x) || -1; // the fist's side of her body
    quat.copy(v.quaternion).multiply(tmpQ.setFromEuler(tmpE.set(GRIP.forward, 0, side * GRIP.out)));
    const up = tmpU.set(0, 1, 0).applyQuaternion(quat);
    pos.copy(hp).addScaledVector(up, -GRIP.at * t.home.scale.y);
    pos.y = Math.max(pos.y, 0.0); // the blade never sinks into the ground
    return pos;
  }
  // the whole-farm and drawing views show her with nothing in her hands (V9)
  showHeldTool(on) { if (this.heldTool) this.tools[this.heldTool].obj.visible = on; }
  // every frame: the held tool follows her hand
  updateHeldTool() {
    const k = this.heldTool;
    if (!k || !this.hand) return;
    const t = this.tools[k];
    if (t.flying) return;
    this.gripWorld(k, t.obj.position, t.obj.quaternion);
  }
  moveTool(kind, toHand, animate) {
    const t = this.tools[kind];
    const o = t.obj;
    const token = ++t.tween;
    t.flying = false;
    const placeHome = () => { o.position.copy(t.home.pos); o.quaternion.copy(t.home.quat); o.scale.copy(t.home.scale); };
    const place = () => { if (toHand) this.gripWorld(kind, o.position, o.quaternion); else placeHome(); };
    if (!animate) { place(); setOpacity(o, 1); return; }
    if (this.reducedMotion()) {
      // fade out where it is, fade in at the other end, within 150 ms
      t.flying = true;
      this.tweens.run(75, (u) => { if (token === t.tween) setOpacity(o, 1 - u); }).then(() => {
        if (token !== t.tween) return null;
        t.flying = false;
        place();
        return this.tweens.run(75, (u) => { if (token === t.tween) setOpacity(o, u); });
      }).then(() => { if (token === t.tween) setOpacity(o, 1); });
      return;
    }
    // an eased arc from where it is now to where it goes, recomputed as she moves
    const from = { pos: o.position.clone(), quat: o.quaternion.clone() };
    const to = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    t.flying = true;
    this.tweens.run(toHand ? TOOL_TAKE_MS : TOOL_RETURN_MS, (u) => {
      if (token !== t.tween) return;
      if (toHand) this.gripWorld(kind, to.pos, to.quat);
      else { to.pos.copy(t.home.pos); to.quat.copy(t.home.quat); }
      const e = ease.inOut(u);
      o.position.lerpVectors(from.pos, to.pos, e);
      o.position.y += Math.sin(Math.PI * u) * (toHand ? 0.25 : 0.45);
      o.quaternion.slerpQuaternions(from.quat, to.quat, e);
    }).then(() => {
      if (token !== t.tween) return;
      t.flying = false;
      place();
    });
  }

  // ---------- the falling stick (P25-5; v0.12: onto any of the slots around the tree) ----------
  buildBranch() {
    const obj = G.fallingBranch(STICK.units, 4);
    obj.visible = false;
    this.root.add(obj);
    const tree = this.objects.D09;
    const k = tree.scale.x;
    // out of the right edge of the canopy, on its near side
    const start = tree.position.clone().add(new THREE.Vector3(1.85 * k, 2.55 * k, 0.75 * k));
    this.branch = { state: 'idle', id: null, t: 0, obj, start, land: new THREE.Vector3(), end: new THREE.Vector3(), cracked: false, thudded: false };
    this.onBranch = null; // (phase: 'crack' | 'thud') -> void: sounds (main.js)
  }
  // a stick fell in the ledger: it falls from the canopy onto its slot when the slot is on screen
  // and no other is falling; otherwise it simply pops up where it lies
  dropStick(id, camera = null) {
    const st = this.stations[id];
    if (!st) return;
    const b = this.branch;
    if (b.state !== 'idle' || !camera || !this.onScreen(st.pos, camera)) { this.popIn(id); return; }
    const tree = this.objects.D09;
    const toTree = new THREE.Vector3().subVectors(tree.position, st.pos).setY(0).normalize();
    b.id = id;
    b.end.copy(st.pos);
    b.land.copy(st.pos).addScaledVector(toTree, 0.45);
    b.obj.rotation.set(0, 0, 0);
    b.obj.children.forEach((c) => { c.rotation.y = 0.35 + (Number(id.slice(1)) + 3) * 0.9; });
    b.obj.scale.setScalar(stationScale(st.def));
    b.state = this.reducedMotion() ? 'fading' : 'falling';
    b.t = 0; b.cracked = false; b.thudded = false;
    st.obj.visible = false;
  }
  get branchPending() { return this.branch.state !== 'idle'; }
  // while the branch falls, the tree must not hide it (the occluder fade takes this point)
  branchPoint(out) {
    const b = this.branch;
    return b.state === 'falling' && b.obj.visible ? out.copy(b.obj.position).setY(Math.max(0.2, b.obj.position.y)) : null;
  }
  onScreen(pos, camera) {
    const p = tmpV.copy(pos).setY(0.2).project(camera);
    return p.z < 1 && Math.abs(p.x) <= 0.92 && Math.abs(p.y) <= 0.92;
  }
  updateBranch(dtMs) {
    const b = this.branch;
    if (b.state === 'idle') return;
    const tree = this.objects.D09;
    b.t += dtMs;
    const o = b.obj;
    if (b.state === 'fading') {
      // reduced motion: no shiver, no fall; the stick fades in at its slot within 150 ms
      if (!b.cracked) { b.cracked = true; o.visible = true; o.position.copy(b.end); this.fadeIn = fadeable(o); }
      const a = Math.min(1, b.t / 150);
      for (const m of this.fadeIn) m.opacity = a;
      if (b.t >= 150) this.landBranch();
      return;
    }
    const { shiver, fall, bounce, slide } = BRANCH_MS;
    if (b.t < shiver) {
      // the right side of the canopy rocks about 2 degrees, a few quick times
      const u = b.t / shiver;
      tree.rotation.z = -0.02 * Math.sin(u * Math.PI * 6) * (1 - u);
      tree.rotation.x = 0.008 * Math.sin(u * Math.PI * 5);
      return;
    }
    tree.rotation.set(0, tree.rotation.y, 0);
    if (!b.cracked) { b.cracked = true; o.visible = true; this.onBranch?.('crack'); }
    let t = b.t - shiver;
    if (t < fall) {
      const u = t / fall;
      const g = u * u; // falling: accelerating down, drifting out over the drip line
      o.position.set(b.start.x + (b.land.x - b.start.x) * u, b.start.y * (1 - g), b.start.z + (b.land.z - b.start.z) * u);
      o.rotation.set(0.5 * (1 - u), 0.6 * (1 - u), 0.9 * (1 - u) * Math.cos(u * 2.2)); // turning slightly
      return;
    }
    if (!b.thudded) { b.thudded = true; this.onBranch?.('thud'); this.puff(b.land, { scale: 0.7 }); }
    t -= fall;
    if (t < bounce) {
      const u = t / bounce;
      o.position.copy(b.land).setY(Math.sin(Math.PI * u) * 0.14);
      o.rotation.set(0, 0, 0.18 * Math.sin(Math.PI * u)); // one small bounce, tipping over
      return;
    }
    t -= bounce;
    if (t < slide) {
      const u = ease.out(t / slide);
      o.position.lerpVectors(b.land, b.end, u).setY(0);
      o.rotation.set(0, 0, 0);
      return;
    }
    this.landBranch();
  }
  landBranch() {
    const b = this.branch;
    b.obj.visible = false;
    if (this.fadeIn) { for (const m of this.fadeIn) m.dispose(); this.fadeIn = null; restoreMaterials(b.obj); }
    this.objects.D09.rotation.set(0, this.objects.D09.rotation.y, 0);
    b.state = 'idle';
    b.id = null;
    if (this.lastLedger) this.sync(this.lastLedger, false);
  }
  // a stick that lands off screen (or while another falls) pops up where it lies
  async popIn(id) {
    const st = this.stations[id];
    this.revealing ??= new Set();
    this.revealing.add(id);
    const o = st.obj;
    const k = stationScale(st.def);
    o.visible = true;
    await this.tweens.run(this.reducedMotion() ? 150 : 320, (t) => o.scale.setScalar(k * Math.max(0.01, this.reducedMotion() ? 1 : ease.outBack(t))), ease.out);
    o.scale.setScalar(k);
    this.revealing.delete(id);
    if (this.lastLedger) this.sync(this.lastLedger, false);
  }
  // v0.12: a stick left too long is gone: it fades and sinks a little (or is just gone if it is
  // still falling)
  async fadeStick(id) {
    const st = this.stations[id];
    if (this.branch.id === id && this.branch.state !== 'idle') { this.landBranch(); }
    this.revealing ??= new Set();
    this.revealing.add(id);
    const o = st.obj;
    o.visible = true;
    const ms = this.reducedMotion() ? 150 : 600;
    await this.tweens.run(ms, (t) => { setOpacity(o, 1 - t); o.position.y = -0.04 * t; });
    o.visible = false;
    o.position.y = 0;
    setOpacity(o, 1);
    this.revealing.delete(id);
    if (this.lastLedger) this.sync(this.lastLedger, false);
  }

  // ---------- delivered-unit piles ----------
  inFlight(id, res) { return this.incoming[`${id}:${res}`] ?? 0; }
  // a unit is on its way to a pile: it shows there only when it lands
  expect(id, res, n = 1) { this.incoming[`${id}:${res}`] = this.inFlight(id, res) + n; }
  landed(id, res, n = 1) {
    this.incoming[`${id}:${res}`] = Math.max(0, this.inFlight(id, res) - n);
    if (this.lastLedger) this.sync(this.lastLedger, true);
  }
  // the yard pile (v0.11): where its k-th unit of `res` sits, and the top one when the pile
  // holds `n` (a build takes it from there)
  yardSlotWorld(res, k) { return this.piles.yard.slotWorld(res, Math.min(k, YARD_SHOWN[res] - 1), k); }
  yardTopWorld(res, n) { return this.yardSlotWorld(res, Math.max(0, Math.min(n, YARD_SHOWN[res] - 1))).setY(0.3); }
  // v0.12: where the i-th good on the yard-sale table sits
  // (v0.13: six to a table, in table order)
  tableSlotWorld(res, i) {
    const list = this.tableStations();
    const k = Math.min(list.length - 1, Math.floor(i / GOODS_PER_TABLE));
    return this.piles[list[k].def.id].slotWorld(res, 0, i - k * GOODS_PER_TABLE);
  }

  // v0.13: a new table pops up beside hers in a burst of dust, set up at once
  popTable(st) {
    this.revealing ??= new Set();
    this.revealing.add(st.def.id);
    const o = st.obj;
    o.visible = true;
    const p = st.pos;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      this.puff(new THREE.Vector3(p.x + Math.cos(a) * 0.55, 0.15, p.z + Math.sin(a) * 0.35), { scale: 0.8, delay: i * 40, seed: i });
    }
    this.onPop?.();
    const k = stationScale(st.def);
    if (this.reducedMotion()) { o.scale.setScalar(k); this.revealing.delete(st.def.id); return; }
    o.scale.setScalar(0.01);
    this.tweens.wait(120).then(() => this.tweens.run(380, (t) => o.scale.setScalar(k * Math.max(0.01, ease.outBack(t))))).then(() => {
      o.scale.setScalar(k);
      this.revealing.delete(st.def.id);
    });
  }

  // v0.13 (P29-5): with the fourth table two neighbours set up stalls of their own beside hers,
  // in the same dust; they hide in the finale (V9, D24) and come back after
  syncStalls(nTables, animate = false) {
    const want = nTables >= 4 && !this.finaleActive && !this.playHidden;
    if (want === this.stallsShown) return;
    this.stallsShown = want;
    for (const st of this.stalls) {
      st.group.visible = want;
      st.seller.visible = want;
      if (want) {
        st.seller.position.copy(st.at);
        st.seller.rotation.y = Math.atan2(st.face.x - st.at.x, st.face.z - st.at.z);
        if (!st.body.world) this.physics.addBody(st.body);
      } else if (st.body.world) this.physics.removeBody(st.body);
      if (want && animate && !this.reducedMotion()) {
        const p = st.group.position;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          this.puff(new THREE.Vector3(p.x + Math.cos(a) * 0.6, 0.15, p.z + Math.sin(a) * 0.4), { scale: 0.8, delay: i * 40, seed: i });
        }
        for (const o of [st.group, st.seller]) {
          const k = o.userData.scale ?? 1;
          o.scale.setScalar(0.01);
          this.tweens.wait(120).then(() => this.tweens.run(300, (t) => o.scale.setScalar(k * Math.max(0.01, ease.outBack(t))))).then(() => o.scale.setScalar(k));
        }
      }
    }
  }

  // the point of a build she hammers at (spec v0.11 §10.10): the house's front, or the part
  // beside its station
  buildPoint(stage, out = new THREE.Vector3()) {
    const st = this.stations[stage];
    if (HOUSE_STAGES.includes(stage)) return out.copy(this.objects.D01.position).lerp(st.pos, 0.35).setY(0.6);
    this.buildPts ??= {};
    if (!this.buildPts[stage]) {
      const part = { G1: 'D08', G2: 'D10', G3: 'D12', G4: 'D11', T0: 'D18' }[stage];
      const root = part && this.parts[part]?.model?.root;
      let c = st.pos.clone();
      if (root) {
        const b = new THREE.Box3().setFromObject(root);
        const centre = b.getCenter(new THREE.Vector3());
        // the nearest point of the part to its station, so she hammers what is beside her
        const near = b.clampPoint(st.pos.clone().setY(centre.y), new THREE.Vector3());
        if (near.distanceTo(st.pos) < 3) c = near;
      }
      this.buildPts[stage] = c.setY(0.3);
    }
    return out.copy(this.buildPts[stage]);
  }
  updatePiles(dtMs, reducedMotion) { for (const p of Object.values(this.piles)) p.update(dtMs, reducedMotion); }

  // ---------- v0.12: DIY time, the dust and the yard sale ----------
  // A dust puff at `pos`: a few paper-white blobs in ink billow up and out, then thin away
  // (about 0.7 s). Reduced motion: none.
  puff(pos, { scale = 1, delay = 0, seed = 0 } = {}) {
    if (this.reducedMotion()) return Promise.resolve();
    const o = G.dustPuff(seed + Math.floor(Math.random() * 7));
    const mats = fadeable(o);
    o.position.copy(pos).setY(Math.max(0, pos.y - 0.1));
    o.rotation.y = Math.random() * Math.PI;
    o.scale.setScalar(0.01);
    this.root.add(o);
    const run = () => this.tweens.run(700, (t) => {
      const k = PUFF_SIZE * scale * (0.5 + 0.9 * ease.out(t));
      o.scale.set(k * (1 + 0.25 * t), k, k * (1 + 0.25 * t));
      o.position.y = Math.max(0, pos.y - 0.1) + 0.25 * t * scale;
      for (const m of mats) m.opacity = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85) * 0.95;
    }).then(() => { this.root.remove(o); for (const m of mats) m.dispose(); });
    return delay ? this.tweens.wait(delay).then(run) : run();
  }
  // a strike lands on the part being built: dust at the hit point, and the part jolts
  strikePart(stage, k = 1) {
    const at = this.buildPoint(stage);
    this.puff(at.clone().setY(Math.max(0.05, at.y - 0.3)), { scale: 0.9 + 0.3 * k, seed: k });
    if (this.reducedMotion()) return;
    const part = { H1: 'H1', H2: 'H2', H3: 'H3', H4: 'H4', G1: 'D08', G2: 'D10', G3: 'D12', G4: 'D11', T0: 'D18' }[stage];
    const root = this.parts[part]?.model?.root;
    if (!root || root.userData.jolting) return;
    root.userData.jolting = true;
    const base = root.position.clone();
    this.tweens.run(180, (t) => { const s = Math.sin(t * Math.PI * 3) * (1 - t); root.position.set(base.x + s * 0.03, base.y - Math.abs(s) * 0.02, base.z); })
      .then(() => { root.position.copy(base); root.userData.jolting = false; });
  }

  // The yard sale (presentation only; the ledger already sold the goods and paid the coins):
  // the "Yard Sale!" sign goes down beside the table, neighbours walk up (v0.13: a different few
  // each sale, more as the tables grow: 2-3 at one table, about 8-10 at four), each to a table,
  // puts that table's goods into their basket while coins pop toward Vanessa (`onCoins`), and they
  // walk off. `items` [res...] in table order (six to a table). Resolves when it is over; the
  // tables take nothing until then.
  async yardSale(items, { onCoins = null, onSign = null, sale: saleNo = 1, tables: nTables = 1 } = {}) {
    const sale = this.sale;
    const token = ++sale.token;
    sale.active = true;
    sale.goods = [...items];
    const live = () => sale.token === token;
    const reduced = this.reducedMotion();
    const t = this.stations.table;
    const tdef = t.def;
    // the sign drops in beside the table with a little bounce
    const sign = sale.sign;
    sign.visible = true;
    onSign?.();
    if (reduced) { setOpacity(sign, 0); await this.tweens.run(150, (u) => setOpacity(sign, u)); setOpacity(sign, 1); } else {
      await this.tweens.run(SALE_MS.sign, (u) => { sign.scale.setScalar(SIGN_SCALE * Math.max(0.01, ease.outBack(u))); sign.position.y = 0.3 * (1 - u); });
      this.puff(sign.position.clone(), { scale: 0.6 });
    }
    if (!live()) return;
    // who comes, and to which table: every table that stands, in turn (at least two each)
    const used = Math.max(1, Math.min(nTables, tablesListLen(this)));
    // (P29-5: when there are more buyers than goods, the rest browse and leave with a nod)
    const n = buyerCount(nTables, saleNo);
    const who = crowdFor(saleNo, n, this.stallsShown ? SELLERS : []);
    const buyers = who.map((i) => sale.buyers[i]);
    sale.showing = buyers;
    const tablesList = this.tableStations();
    const plan = buyers.map((b, i) => ({ b, k: i % used, slot: Math.floor(i / used) }));
    // each table's goods (their indexes in `items`) shared out among its buyers
    for (const p of plan) p.goods = [];
    for (let k = 0; k < used; k++) {
      const mine = plan.filter((p) => p.k === k);
      for (let j = k * GOODS_PER_TABLE, c = 0; j < Math.min(items.length, (k + 1) * GOODS_PER_TABLE); j++, c++) mine[c % mine.length]?.goods.push(j);
    }
    const from = plan.map((_, i) => this.ground(tdef.u + BUYER_FROM[i % BUYER_FROM.length][0], tdef.v + BUYER_FROM[i % BUYER_FROM.length][1]));
    const to = plan.map((p) => {
      const d = tablesList[p.k].def;
      const [du, dv] = BUYER_AT[p.slot % BUYER_AT.length];
      return this.ground(d.u + du + Math.floor(p.slot / 3) * 0.6, d.v + dv - Math.floor(p.slot / 3) * 1.2);
    });
    const walk = (b, a, z, ms, phase = 0) => {
      const rate = 140 / (b.userData.look?.walk ?? 1);
      return this.tweens.run(ms, (u) => {
        if (!live()) return;
        const e = ease.inOut(u);
        b.position.lerpVectors(a, z, e);
        b.rotation.y = Math.atan2(z.x - a.x, z.z - a.z);
        const step = Math.sin((u * ms) / rate + phase);
        b.getObjectByName('legL').rotation.x = step * 0.5;
        b.getObjectByName('legR').rotation.x = -step * 0.5;
        b.getObjectByName('armL').rotation.x = -step * 0.35;
        b.getObjectByName('armR').rotation.x = step * 0.2;
        b.getObjectByName('body').position.y = Math.abs(step) * 0.03;
      });
    };
    const stand = (b, k) => {
      const tp = tablesList[k].pos;
      b.rotation.y = Math.atan2(tp.x - b.position.x, tp.z - b.position.z);
      for (const nm of ['legL', 'legR', 'armL', 'armR']) b.getObjectByName(nm).rotation.x = 0;
      b.getObjectByName('body').position.y = 0;
    };
    if (reduced) {
      plan.forEach((p, i) => { p.b.position.copy(to[i]); stand(p.b, p.k); p.b.visible = true; setOpacity(p.b, 0); });
      await this.tweens.run(200, (u) => buyers.forEach((b) => setOpacity(b, u)));
      buyers.forEach((b) => setOpacity(b, 1));
    } else {
      plan.forEach((p, i) => { p.b.position.copy(from[i]); p.b.visible = true; });
      await Promise.all(plan.map((p, i) => this.tweens.wait(i * SALE_MS.stagger).then(() => walk(p.b, from[i], to[i], SALE_MS.walkIn, i)).then(() => stand(p.b, p.k))));
    }
    if (!live()) return;
    // each takes their goods into the basket, a coin popping out for each; the buyers take
    // theirs at the same time, a little apart
    const take = async (p, i) => {
      if (!reduced) await this.tweens.wait(i * 60);
      if (!p.goods.length && !reduced) { // a browser: a look at the table and a nod
        const head = p.b.getObjectByName('body');
        await this.tweens.run(500, (u) => { head.rotation.x = Math.sin(u * Math.PI * 2) * 0.08; });
        head.rotation.x = 0;
        return;
      }
      for (const j of p.goods) {
        if (!live()) return;
        const res = items[j];
        const fromP = this.tableSlotWorld(res, j);
        sale.goods[j] = null;
        this.sync(this.lastLedger, false);
        p.b.updateMatrixWorld(true);
        const basket = p.b.localToWorld(p.b.userData.basket.clone());
        const fly = this.flight(res, fromP, basket, reduced ? 150 : SALE_MS.take);
        onCoins?.(res, fromP);
        await fly;
        if (!reduced) await this.tweens.wait(SALE_MS.pause * 0.5);
      }
    };
    await Promise.all(plan.map((p, i) => take(p, i)));
    if (!live()) return;
    sale.goods = null;
    this.sync(this.lastLedger, false);
    // they walk off; the sign comes up again
    if (reduced) {
      await this.tweens.run(200, (u) => { buyers.forEach((b) => setOpacity(b, 1 - u)); setOpacity(sign, 1 - u); });
      buyers.forEach((b) => { b.visible = false; setOpacity(b, 1); });
      sign.visible = false; setOpacity(sign, 1);
    } else {
      await Promise.all(plan.map((p, i) => this.tweens.wait(i * SALE_MS.stagger).then(() => walk(p.b, p.b.position.clone(), from[i], SALE_MS.walkOut, i))));
      buyers.forEach((b) => { b.visible = false; });
      await this.tweens.wait(SALE_MS.linger);
      await this.tweens.run(260, (u) => sign.scale.setScalar(SIGN_SCALE * Math.max(0.01, 1 - u * u)));
      sign.visible = false;
      sign.scale.setScalar(SIGN_SCALE);
    }
    if (live()) { sale.active = false; sale.showing = null; this.sync(this.lastLedger, false); }
  }
  // load, New farm or the finale: no sale on show
  endSale() {
    const sale = this.sale;
    sale.token++;
    sale.active = false;
    sale.goods = null;
    sale.sign.visible = false;
    sale.sign.scale.setScalar(SIGN_SCALE);
    sale.showing = null;
    for (const [i, b] of sale.buyers.entries()) if (!(this.stallsShown && SELLERS.includes(i))) b.visible = false;
  }

  // v0.12: a weed creeps over a planted crop: it grows up out of the soil over 0.6 s
  async creepIn(id) {
    this.revealing ??= new Set();
    this.revealing.add(id);
    const st = this.stations[id];
    const o = st.obj;
    const k = stationScale(st.def);
    o.visible = true;
    await this.tweens.run(this.reducedMotion() ? 150 : 600, (t) => o.scale.set(k * Math.max(0.01, ease.outBack(t)), k * Math.max(0.01, t), k * Math.max(0.01, ease.outBack(t))));
    o.scale.setScalar(k);
    this.revealing.delete(id);
    if (this.lastLedger) this.sync(this.lastLedger, false);
  }
  // v0.12 per frame: a regrown weed grows from a tuft to a full clump over REGROW.growMs, and once
  // it is choking its plant the plant leans a little (spec v0.12 P28-4)
  updateRegrowth(l) {
    for (const node of Object.keys(NODES)) {
      const st = this.stations[`wr-${node}`];
      if (!st || this.revealing?.has(st.def.id)) continue;
      const since = l.overgrown[node];
      const k = stationScale(st.def);
      const age = since === null ? 0 : Math.max(0, l.activeMs - since);
      if (since !== null && st.obj.visible) st.obj.scale.setScalar(k * (0.45 + 0.55 * Math.min(1, age / REGROW.growMs)));
      const lean = since !== null && age >= REGROW.growMs ? 0.18 : 0;
      for (const p of Object.keys(this.parts)) {
        const dug = PARTS[p].dug ?? [];
        if (dug.length !== 1 || dug[0] !== node || this.revealing?.has(p)) continue;
        const root = this.parts[p].model?.root;
        if (!root) continue;
        root.userData.lean0 ??= root.rotation.z;
        const want = root.userData.lean0 + lean;
        root.rotation.z += (want - root.rotation.z) * 0.1;
      }
    }
  }

  // v0.12: the plant under a weed left too long wilts: it droops and goes back to its outline,
  // and its dig spot opens for replanting
  async wilt(node) {
    const ids = Object.keys(this.parts).filter((p) => (PARTS[p].dug ?? []).length === 1 && PARTS[p].dug[0] === node);
    const roots = ids.map((p) => this.parts[p].model?.root).filter(Boolean);
    this.revealing ??= new Set();
    ids.forEach((p) => this.revealing.add(p));
    const base = roots.map((r) => ({ rz: r.rotation.z, sy: r.scale.y }));
    if (!this.reducedMotion()) {
      await this.tweens.run(700, (t) => roots.forEach((r, i) => { r.rotation.z = base[i].rz + 0.45 * ease.inOut(t); r.scale.y = base[i].sy * (1 - 0.25 * ease.inOut(t)); }));
    }
    roots.forEach((r, i) => { r.rotation.z = base[i].rz; r.scale.y = base[i].sy; });
    ids.forEach((p) => this.revealing.delete(p));
    if (this.lastLedger) this.sync(this.lastLedger, false);
  }

  // a cleared weed clump shrinks and sinks over 0.3 s (presentation only)
  async shrinkAway(id) {
    this.revealing ??= new Set();
    this.revealing.add(id);
    const o = this.stations[id].obj;
    const y0 = o.position.y;
    const k0 = o.scale.x;
    await this.tweens.run(300, (t) => { o.scale.setScalar(k0 * Math.max(0.01, 1 - t)); o.position.y = y0 - 0.1 * t; }, ease.out);
    o.visible = false;
    o.position.y = y0;
    o.scale.setScalar(k0);
    this.revealing.delete(id);
  }

  // a source gives a little pop as a unit leaves it (presentation only)
  pulse(id) {
    const o = this.stations[id]?.obj;
    if (!o || o.userData.pulsing) return;
    o.userData.pulsing = true;
    const base = o.scale.x; // corn holders carry the drawing-fitted scale
    this.tweens.run(180, (t) => o.scale.setScalar(base * (1 + 0.14 * Math.sin(Math.PI * t)))).then(() => { o.scale.setScalar(base); o.userData.pulsing = false; });
  }

  // ---------- the collectible marker (presentation of interaction state) ----------
  // m: null, or { target: {id, x, z, r}, mode: 'near' | 'reach' | 'settle' | 'work', progress }
  //   near: within range, not in reach: a light ring breathing slowly;
  //   reach: in reach while moving: a solid ring and a soft disc ("this one");
  //   settle: in reach and standing still (the 0.25 s before work): the ring draws in a little;
  //   work: working: the arc fills over each unit, and `markerPop` bumps it as the unit lands.
  updateMarker(dtMs, m, reducedMotion = false) {
    const k = this.marker;
    const o = k.obj;
    k.t += dtMs;
    const fadeTo = m ? 1 : 0;
    if (m && m.target.id !== k.id) { k.id = m.target.id; k.alpha = 0; k.pop = 0; } // a new target fades in fresh
    k.alpha += (fadeTo - k.alpha) * (1 - Math.exp(-dtMs / 70));
    if (!m && k.alpha < 0.02) { o.visible = false; k.id = null; return; }
    o.visible = true;
    if (m) o.position.set(m.target.x, 0, m.target.z);
    const mode = m?.mode ?? 'near';
    const r = (m?.target.r ?? 0.35) + 0.24;
    let s = 1;
    if (mode === 'near' && !reducedMotion) s = 1 + 0.05 * Math.sin((k.t / 1400) * Math.PI * 2);
    else if (mode === 'settle') s = 0.93;
    k.scale += (s - k.scale) * (1 - Math.exp(-dtMs / 60));
    if (k.pop > 0) k.pop = Math.max(0, k.pop - dtMs);
    const bump = reducedMotion ? 0 : k.popAmp * Math.sin(Math.PI * (k.pop / 180));
    o.scale.setScalar(r * (k.scale + bump));
    const ring = o.getObjectByName('ring');
    const disc = o.getObjectByName('disc');
    const arc = o.getObjectByName('arc');
    ring.material.opacity = k.alpha * (mode === 'near' ? 0.55 : 0.95);
    disc.material.opacity = k.alpha * (mode === 'near' ? 0 : 0.14);
    arc.material.opacity = k.alpha;
    const share = mode === 'work' ? Math.max(0, Math.min(1, m.progress ?? 0)) : 0;
    arc.geometry.setDrawRange(0, Math.round(share * G.MARKER_SEGMENTS) * 6);
  }

  // feedback the moment work starts (small) and as each unit lands (larger)
  markerPop(amp = 0.14) {
    this.marker.pop = 180;
    this.marker.popAmp = amp;
  }

  // ---------- occluder fade: the tree goes see-through while it hides what matters ----------
  // points: world positions that must stay visible (Vanessa's body, the marked target). A ray
  // from the camera to each point that meets the tree's meshes first fades the tree.
  updateFade(dtMs, camera, points) {
    for (const f of this.faders) {
      let hidden = false;
      for (const p of points) {
        tmpV.subVectors(p, camera.position);
        const len = tmpV.length();
        ray.set(camera.position, tmpV.divideScalar(len));
        ray.far = len - 0.05;
        if (ray.intersectObjects(f.meshes, false).length) { hidden = true; break; }
      }
      const target = hidden ? FADE_OPACITY : 1;
      let o = f.opacity + (target - f.opacity) * (1 - Math.exp(-dtMs / FADE_TAU_MS));
      if (Math.abs(o - target) < 0.01) o = target;
      f.set(o);
    }
  }
  resetFade() { for (const f of this.faders) f.set(1); }

  // a unit flight from a to b (presentation only); with reduced motion on there is no arc: the
  // unit fades in and out where it lands, within REDUCED_FLIGHT_MS (V8, O24-5)
  flight(res, from, to, ms = 260) {
    const m = G.unitMesh(res);
    const plan = flightPlan(from, to, ms, this.reducedMotion());
    const fades = plan.fade ? fadeable(m) : [];
    plan.at(0, m.position);
    this.root.add(m);
    return this.tweens.run(plan.ms, (t) => {
      const o = plan.at(t, m.position);
      for (const mat of fades) mat.opacity = o;
      if (!plan.fade) m.rotation.y = t * 6;
    }).then(() => {
      this.root.remove(m);
      for (const mat of fades) mat.dispose();
    });
  }

  // world-bounds recovery: keep Vanessa on the composition ground, inventory untouched
  clampToBounds(pos) {
    const q = this.boundsQuad;
    let inside = true;
    for (let i = 0; i < 4; i++) {
      const a = q[i]; const b = q[(i + 1) % 4];
      if ((b.x - a.x) * (pos.z - a.z) - (b.z - a.z) * (pos.x - a.x) < 0) { inside = false; break; }
    }
    if (inside) return false;
    // project onto the nearest edge
    let best = null; let bestD = Infinity;
    for (let i = 0; i < 4; i++) {
      const a = q[i]; const b = q[(i + 1) % 4];
      const ab = new THREE.Vector3().subVectors(b, a);
      const t = Math.max(0, Math.min(1, ((pos.x - a.x) * ab.x + (pos.z - a.z) * ab.z) / ab.lengthSq()));
      const c = a.clone().addScaledVector(ab, t);
      const d = Math.hypot(c.x - pos.x, c.z - pos.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    pos.x = best.x;
    pos.z = best.z;
    return true;
  }
}

// the held tool's grip: how far up the handle her fist is (model metres at the tool's drawing
// scale) and the handle's lean forward and outward, radians (tuned in the browser)
export const GRIP = { at: 0.9, forward: 0.16, out: 0.12 };
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpU = new THREE.Vector3();

const tablesListLen = (w) => w.tableStations().filter((st) => st.obj.visible).length;
function setOpacity(root, a) {
  root.traverse((m) => {
    if (!m.material) return;
    if (a < 1 && !m.userData.ownMat) { m.userData.baseMat = m.material; m.material = m.material.clone(); m.userData.ownMat = true; }
    if (m.userData.ownMat) { m.material.transparent = a < 1; m.material.opacity = a; }
    if (a >= 1 && m.userData.ownMat) { m.material.dispose(); m.material = m.userData.baseMat; m.userData.ownMat = false; }
  });
}
function restoreMaterials(root) {
  root.traverse((m) => { if (m.userData.fadeBase) { m.material = m.userData.fadeBase; delete m.userData.fadeBase; } });
}

function showUnits(group, n) {
  let i = 0;
  for (const c of group.children) {
    if (c.userData.outline || c.userData.keep) continue;
    c.visible = i < n;
    i++;
  }
}

function roundExt(e) {
  return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, +v.toFixed(2)]));
}
