// World assembly: greybox drawing objects at their inverse-projected anchors, the slice
// stations, colliders (cannon-es, authored per object as the BASE did) and the presentation
// of ledger state. Nothing here changes the ledger: station visuals, reveals and flights only
// show what the ledger already committed and saved.
// Playtest fixes (captain phone test 2026-11-01): the tree fades while it hides Vanessa or the
// marked target; a ground ring marks the nearest collectible and fills with each work unit;
// sources pop as a unit leaves and weed clumps shrink away instead of vanishing. Delivered
// units pile up on their mat and sold crops fill the market crate (carry.js), each appearing
// as its flight lands; a built stage's mat waits for its last unit, then shrinks away.
// v0.9 (addendum 25): the rake and shovel go from their lean into Vanessa's right hand and back
// (P25-4); crop spots show as dig spots until dug, then the plant comes up (P25-4); every
// renewable wood batch falls from the tree as a dead branch, waiting in the tree while its spot
// is off screen (P25-5); stone lies in finite loose rocks that fade out for good when empty
// (P25-6).
// Spec v0.9 §10.9 (P25-1, P25-3): every drawing part is registered with the stage that gives it
// its colour (game/reveal.js). Until then it is its outline (paper inside the ink line) or its
// blueprint ghost; the blueprint button fades those in and out; a commit washes the colour in.
// The finale's colour (P25-2: grass from her feet, blue sky, yellow sun) is set here too.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { HOUSE_STAGES, NODES, PILES, SPOTS, STAGES, YARD_SHOWN } from '../game/data.js';
import { crateAvailable, digOpen, isCommitted, missingPrereqs, recipe, stageState, stillNeeded } from '../game/ledger.js';
import { fitToDrawing, HORIZON_V, projectedExtent } from './projection.js';
import * as G from './greybox.js';
import { BORDER_POLYLINE, BOUNDS, CORN_PLANTS, FITS, PATH, SKY, STATIONS, STEPPING, SUNFLOWER_NODES, SUNFLOWERS, TOMATO_NODES } from './layout.js';
import { ease } from '../core/tween.js';
import { CRATE_SHOWN, crateSlot, matSlot, UnitPile, yardSlot } from './carry.js';
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

// a station model's own scale: mats sized to their reach, the bed's weeds a little smaller,
// the yard pile drawn large enough to read on a phone
export function stationScale(def) {
  if (def.kind === 'mat') return def.r / 0.62;
  if (def.bed) return 0.8;
  if (def.kind === 'yard') return 1.25;
  return 1;
}

// v0.11: which station mats show on this ledger. A mat shows while its stage is not built and is
// one she can work toward now: the house shows its next stage (locked or not), any other
// station once its prerequisites are met (it may still wait for its weeds). Her first crop's
// plot costs nothing and has no mat.
export function matShown(l, id) {
  if (isCommitted(l, id)) return false;
  const r = recipe(l, id);
  if (r.coins + r.W + r.R === 0) return false;
  if (HOUSE_STAGES.includes(id)) return HOUSE_STAGES.find((h) => !isCommitted(l, h)) === id;
  return !missingPrereqs(l, id).length;
}

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
    this.piles = {}; // station id -> UnitPile of delivered units (mats) or sold crops (crate)
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
    const bedPlants = G.bedPlants();
    bed.add(bedPlants);
    this.addBox(bed, 2.4, 1.1, 1);
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

  // D08: the blueprint's dashed edges before G1, and the gravel path G1 lays between them
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
    const gravel = G.gravelPath(edges[0], edges[1]);
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
      case 'spot': obj = G.fallenBranch(SPOTS[def.id].batch, 3); break;
      case 'rock': obj = G.looseRock(Number(def.id.slice(1)) || 9); break;
      case 'tools': obj = new THREE.Group(); break; // the tools themselves are D13/D14
      case 'mat': obj = G.mat(); break;
      case 'yard': obj = G.yardPatch(); break;
      case 'crate': obj = G.crate(); obj.visible = false; break;
      default: throw new Error(def.kind);
    }
    obj.position.copy(pos);
    if (def.bed) { obj.position.copy(this.bedAt(def.bed)).add(new THREE.Vector3(0, 0, 0.06)); pos.copy(obj.position).setY(0); }
    obj.name = `${def.kind}:${def.id}`;
    this.root.add(obj);
    this.stations[def.id] = { def, obj, pos };
    if (def.kind === 'mat') this.piles[def.id] = new UnitPile(obj, matSlot);
    if (def.kind === 'yard') this.piles.yard = new UnitPile(obj, yardSlot, 1.4);
    obj.scale.setScalar(stationScale(def));
    if (def.kind === 'crate') this.piles.crate = new UnitPile(obj, crateSlot, 1.3);
    if (def.kind === 'crate') {
      this.crateBody = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.43, 0.3, 0.31)) });
      this.crateBody.position.set(pos.x, 0.3, pos.z);
    }
  }

  // targets for the interaction controller (positions in metres on the ground)
  targets(l) {
    const out = [];
    for (const [id, s] of Object.entries(this.stations)) {
      if (s.def.kind === 'crate' && !crateAvailable(l)) continue;
      if (s.def.kind === 'mat' && !matShown(l, id)) continue; // built, or not reachable yet
      if (s.def.kind === 'node' && !this.nodeViews[id]) continue;
      if (s.def.kind === 'rock' && id === 'RX' && !l.rocks.RX) continue; // the recovery rock only when needed
      const kind = s.def.kind === 'node' && digOpen(l, id) ? 'dig' : s.def.kind;
      const t = { id, kind, x: s.pos.x, z: s.pos.z, r: s.def.r, label: s.def.label };
      if (id === 'sW' && this.branch.state !== 'idle') t.hold = true; // still in the tree or falling
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
        const gone = l.weeds[id];
        if (gone && s.obj.visible && animate && !this.revealing?.has(id)) this.shrinkAway(id);
        else if (!this.revealing?.has(id)) { s.obj.visible = !gone; s.obj.scale.setScalar(stationScale(s.def)); }
      } else if (kind === 'pile') {
        showUnits(s.obj, l.piles[id]);
        s.obj.getObjectByName('patch').visible = l.piles[id] > 0; // a starter pile never returns
      } else if (kind === 'spot') {
        showUnits(s.obj, l.spots[id].remaining);
        // a batch that is due shows only when its branch has fallen (P25-5)
        s.obj.visible = this.branch.state === 'idle' || l.spots[id].remaining === 0;
        if (this.branch.state !== 'idle') showUnits(s.obj, 0);
      } else if (kind === 'rock') {
        const n = l.rocks[id];
        showUnits(s.obj, n);
        if (n === 0 && s.obj.visible && animate && !this.revealing?.has(id) && s.seen) this.fadeRock(id);
        else if (!this.revealing?.has(id)) s.obj.visible = n > 0;
        if (n > 0) s.seen = true; // a rock that had stone fades when emptied; an empty one never shows
      } else if (kind === 'mat') {
        const st = stageState(l, id);
        const shown = matShown(l, id);
        const base = s.def.r / 0.62;
        if (st === 'COMMITTED' && s.obj.visible && animate && !this.revealing?.has(`mat:${id}`)) this.retireMat(id);
        else if (shown && !s.obj.visible && animate && !this.revealing?.has(`mat:${id}`) && !this.playHidden) this.popMat(id);
        else if (!this.revealing?.has(`mat:${id}`)) { s.obj.visible = shown; s.obj.scale.setScalar(base); }
        const dep = l.stages[id].deposited;
        const n = (r, cap = Infinity) => Math.max(0, Math.min(cap, dep[r] - this.inFlight(id, r)));
        const units = [...Array(n('W')).fill('W'), ...Array(n('R')).fill('R'), ...Array(n('coins', 12)).fill('coins')];
        // a built stage's units go into the part as she hammers (feedPart)
        const fed = st === 'COMMITTED' ? this.fed?.[id] ?? 0 : 0;
        this.piles[id].set(units.slice(0, Math.round(units.length * (1 - fed))), { pop: animate });
        const rc = recipe(l, id);
        const total = rc.coins + rc.W + rc.R;
        const need = stillNeeded(l, id);
        G.setMatFill(s.obj, total ? 1 - (need.coins + need.W + need.R) / total : 0);
        s.obj.getObjectByName('border').material.color.set(st === 'LOCKED' ? 0x9a9a9a : G.PALETTE.cap);
      } else if (kind === 'yard') {
        // the pile: what she has dropped, each unit appearing as its flight lands (P27-1)
        const n = (r) => Math.max(0, Math.min(YARD_SHOWN[r], l.yard[r] - this.inFlight('yard', r)));
        this.piles.yard.set([...Array(n('W')).fill('W'), ...Array(n('R')).fill('R')], { pop: animate });
        this.yardHidden = Math.max(0, l.yard.W - YARD_SHOWN.W) + Math.max(0, l.yard.R - YARD_SHOWN.R);
      } else if (kind === 'crate') {
        if (crateAvailable(l) && !s.obj.visible && !this.revealing?.has('crate')) s.obj.visible = true;
        const shown = [];
        for (const c of ['C', 'S', 'T']) for (let i = l.sold[c] - this.inFlight('crate', c); i > 0 && shown.length < CRATE_SHOWN; i--) shown.push(c);
        this.piles.crate.set(shown, { pop: animate });
        if (crateAvailable(l) && !this.crateBody.world) this.physics.addBody(this.crateBody);
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
      // brings the market crate (v0.11: whichever crop she chose)
      const spots = Object.keys(NODES).filter((id) => NODES[id].stage === stage && this.nodeViews[id]).map((id) => this.nodeViews[id].dig);
      const crate = this.stations.crate.obj;
      const withCrate = !crate.visible;
      if (withCrate) this.revealing.add('crate');
      const base = spots.map((d) => d.scale.x);
      for (const d of spots) { d.visible = true; d.scale.setScalar(0.01); }
      if (withCrate) { crate.visible = true; crate.scale.setScalar(0.01); }
      await this.tweens.run(500, (t) => {
        const k = Math.max(0.01, t);
        spots.forEach((d, i) => d.scale.setScalar(k * base[i]));
        if (withCrate) crate.scale.setScalar(k);
      }, ease.outBack);
      spots.forEach((d, i) => d.scale.setScalar(base[i]));
      this.revealing.delete('crate');
    }
    // the parts this commit finishes (a crop plant waits for its digging: revealDig)
    await this.washParts(partsColouredBy(stage).filter((id) => this.parts[id] && partLook(l, id) === 'colour'), ms);
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
      const kind = (x) => (['H1', 'H2', 'H3', 'H4'].includes(x.id) ? 'rise' : ['c1', 'c2', 'c3', 'c4'].includes(x.id) ? 'grow' : null);
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
  // Hide the play elements (V9: mats and their piles, the crate and its load, sources, weeds,
  // leftover rocks, the ring); k 0 shown .. 1 gone. Crop plants stay: they are the drawing.
  setPlayHidden(k) {
    this.playHidden = k;
    for (const s of Object.values(this.stations)) {
      if (!['weed', 'pile', 'spot', 'mat', 'crate', 'rock', 'yard'].includes(s.def.kind)) continue;
      if (k >= 1) s.obj.visible = false;
      s.obj.scale.setScalar(stationScale(s.def) * Math.max(0.01, 1 - k));
    }
    if (k > 0) this.marker.obj.visible = false;
    if (k === 0) {
      for (const s of Object.values(this.stations)) {
        if (!['weed', 'pile', 'spot', 'mat', 'crate', 'rock', 'yard'].includes(s.def.kind)) continue;
        s.obj.scale.setScalar(stationScale(s.def));
        if (['pile', 'spot', 'yard'].includes(s.def.kind)) s.obj.visible = true; // sync shows their units
      }
      if (this.lastLedger) this.sync(this.lastLedger); // weeds, mats, crate and rocks by the ledger
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

  // ---------- the falling branch (P25-5) ----------
  buildBranch() {
    const spot = this.stations.sW;
    const obj = G.fallingBranch(SPOTS.sW.batch, 3);
    // the same lengths as the spot's branch, so it lands exactly as the batch lies
    obj.children.forEach((c) => c.applyMatrix4(new THREE.Matrix4().makeRotationY(0.35 + 3 * 0.9)));
    obj.visible = false;
    this.root.add(obj);
    const tree = this.objects.D09;
    const k = tree.scale.x;
    // out of the right edge of the canopy, on its near side, over the wood spot's side of the tree
    const start = tree.position.clone().add(new THREE.Vector3(1.85 * k, 2.55 * k, 0.75 * k));
    const toTree = new THREE.Vector3().subVectors(tree.position, spot.pos).setY(0).normalize();
    const land = spot.pos.clone().addScaledVector(toTree, 0.55);
    this.branch = { state: 'idle', t: 0, obj, start, land, end: spot.pos.clone(), cracked: false, thudded: false };
    this.onBranch = null; // (phase: 'crack' | 'thud') -> void: sounds (main.js)
  }
  // a renewable batch came due in the ledger: its branch waits in the tree until its spot is seen
  branchDue() { if (this.branch.state === 'idle') { this.branch.state = 'waiting'; this.branch.t = 0; } }
  get branchPending() { return this.branch.state !== 'idle'; }
  // while the branch falls, the tree must not hide it (the occluder fade takes this point)
  branchPoint(out) {
    const b = this.branch;
    return b.state === 'falling' && b.obj.visible ? out.copy(b.obj.position).setY(Math.max(0.2, b.obj.position.y)) : null;
  }
  spotOnScreen(camera) {
    const p = tmpV.copy(this.branch.end).setY(0.2).project(camera);
    return p.z < 1 && Math.abs(p.x) <= 0.92 && Math.abs(p.y) <= 0.92;
  }
  updateBranch(dtMs, camera) {
    const b = this.branch;
    if (b.state === 'idle') return;
    const tree = this.objects.D09;
    if (b.state === 'waiting') {
      if (!camera || !this.spotOnScreen(camera)) return;
      b.state = this.reducedMotion() ? 'fading' : 'falling';
      b.t = 0; b.cracked = false; b.thudded = false;
    }
    b.t += dtMs;
    const o = b.obj;
    if (b.state === 'fading') {
      // reduced motion: no shiver, no fall; the branch fades in at the spot within 150 ms
      if (!b.cracked) { b.cracked = true; o.visible = true; o.position.copy(b.end); o.rotation.set(0, 0, 0); this.fadeIn = fadeable(o); }
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
    if (!b.thudded) { b.thudded = true; this.onBranch?.('thud'); }
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
  // where the k-th delivered unit of `res` sits on a mat, and the i-th sold crop in the crate
  matSlotWorld(id, res, k) { return this.piles[id].slotWorld(res, k, k); }
  // the yard pile (v0.11): where its k-th unit of `res` sits, and the top one when the pile
  // holds `n` (a Build takes it from there)
  yardSlotWorld(res, k) { return this.piles.yard.slotWorld(res, Math.min(k, YARD_SHOWN[res] - 1), k); }
  yardTopWorld(res, n) { return this.yardSlotWorld(res, Math.max(0, Math.min(n, YARD_SHOWN[res] - 1))).setY(0.3); }

  // the point of a build she hammers at (spec v0.11 §10.10): the house's front, or the part
  // beside its station
  buildPoint(stage, out = new THREE.Vector3()) {
    const st = this.stations[stage];
    if (HOUSE_STAGES.includes(stage)) return out.copy(this.objects.D01.position).lerp(st.pos, 0.35).setY(0.6);
    this.buildPts ??= {};
    if (!this.buildPts[stage]) {
      const part = { G1: 'D08', G2: 'D10', G3: 'D12', G4: 'D11' }[stage];
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
  // the units a mat shows for its deposits, before any are fed into the part
  matUnits(stage) {
    const d = this.lastLedger?.stages[stage].deposited;
    return d ? d.W + d.R + Math.min(12, d.coins) : 0;
  }
  // in time with the strikes, the units on a built stage's mat fly into the part: `share` 0..1 of
  // them are in (presentation only; the stage is committed already)
  feedPart(stage, share) {
    const pile = this.piles[stage];
    if (!pile) return;
    this.fed ??= {};
    if (share <= (this.fed[stage] ?? 0)) return;
    this.fed[stage] = share;
    const slots = pile.slots;
    const keep = Math.min(slots.length, Math.round(this.matUnits(stage) * (1 - share)));
    const to = this.buildPoint(stage);
    for (let i = slots.length - 1; i >= keep; i--) {
      const sl = slots[i];
      const from = sl.obj.getWorldPosition(new THREE.Vector3());
      this.flight(sl.res, from, to.clone().add(new THREE.Vector3((i % 3 - 1) * 0.15, 0.1, 0)), 280);
    }
    pile.set(slots.slice(0, keep).map((x) => x.res), { pop: false });
  }
  crateSlotWorld(i) { return this.piles.crate.slotWorld('C', 0, Math.min(CRATE_SHOWN - 1, i)); }
  updatePiles(dtMs, reducedMotion) { for (const p of Object.values(this.piles)) p.update(dtMs, reducedMotion); }

  // a built stage's mat: let the last units land, then shrink it away with its pile
  async retireMat(id) {
    this.revealing ??= new Set();
    const key = `mat:${id}`;
    this.revealing.add(key);
    for (let waited = 0; waited < 800 && ['W', 'R', 'coins'].some((r) => this.inFlight(id, r) > 0); waited += 50) await this.tweens.wait(50);
    const o = this.stations[id].obj;
    const base = this.stations[id].def.r / 0.62;
    await this.tweens.run(320, (t) => o.scale.setScalar(base * Math.max(0.01, 1 - t)), ease.inOut);
    o.visible = false;
    o.scale.setScalar(base);
    this.revealing.delete(key);
    if (this.lastLedger) this.sync(this.lastLedger, true); // the house's next stage mat comes up
  }
  // a station that has just opened: its mat comes up (v0.11)
  async popMat(id) {
    this.revealing ??= new Set();
    const key = `mat:${id}`;
    this.revealing.add(key);
    const o = this.stations[id].obj;
    const base = this.stations[id].def.r / 0.62;
    o.visible = true;
    await this.tweens.run(this.reducedMotion() ? 150 : 420, (t) => o.scale.setScalar(base * Math.max(0.01, this.reducedMotion() ? 1 : ease.outBack(t))), ease.out);
    o.scale.setScalar(base);
    this.revealing.delete(key);
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
