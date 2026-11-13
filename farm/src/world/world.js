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
import { BIRDS, HOUSE_STAGES, NODE_RENEW_MS, NODES, PILES, REGROW, STAGES, STICK, TABLES_UNLIMITED, TOMATO_GROWTH, YARD_SHOWN } from '../game/data.js';
import { crateCount, digOpen, fillTable, isCommitted, mainComplete, plantSize, saleReady, tableAvailable, tables, weedPresent } from '../game/ledger.js';
import { buyerCount, crowdFor, LOOKS } from '../game/crowd.js';
import { ARCHER, ringStoneReach, scatteredStoneReach } from './props.js';
import { ribbonDistance } from './pathgeom.js';
import { fitToDrawing, HORIZON_V, projectedExtent } from './projection.js';
import * as G from './greybox.js';
import { BORDER_POLYLINE, BOUNDS, CORN_PLANTS, FITS, PATH, SKY, STATIONS, SUNFLOWER_NODES, SUNFLOWERS, TOMATO_NODES, VANESSA_START, YARD_WEED_PLACES } from './layout.js';
import { ease } from '../core/tween.js';
import { SPOTS } from '../game/songs.js';
import { drawnShare, hopSpans } from './moments.js';
import { KEEPSAKES, KEEPSAKE_NEAR_M } from '../game/keepsakes.js';
import { CRATE_SHOWN, crateSlot, tableDrawn, tableSlot, tableSpot, UnitPile, yardSlot } from './carry.js';
import { fader, groundMaterial, PAL, paintable, paperBackdrop } from './look.js';
import { TREE_TRUNK_R } from './hand.js';
import { routeAround, routeAt, routeLength } from './walk.js';
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
// to read on a phone. v0.15 (captain: "Weed should be bigger and more noticeable"): weeds are
// drawn a third bigger, and a weed that creeps over the crops half as big again as that
export const WEED_SCALE = { clump: 1.35, regrow: 1.7, bed: 0.8 };
export function stationScale(def) {
  if (def.kind === 'weed') return (def.regrow ? WEED_SCALE.regrow : WEED_SCALE.clump) * (def.bed ? WEED_SCALE.bed : 1);
  if (def.bed) return 0.8;
  if (def.kind === 'yard') return 1.25;
  if (def.kind === 'stick') return 0.85;
  if (def.kind === 'crate') return CRATE_SCALE;
  return 1;
}

// v0.12 yard sale timings (ms): the sign goes down, the buyers walk up, each takes their goods,
// they walk off; reduced motion: everything fades in place within about a second
export const SALE_MS = { sign: 320, walkIn: 1250, take: 240, pause: 160, walkOut: 1050, linger: 250, stagger: 70 }; // v0.13: about 4 s in all
// where the buyers come from and stand, in drawing units relative to the table (u, v): across
// the stall from the camera, facing it, so the goods stay in view as they go
// where buyers come from (drawing units from the first table, off to the right) and where they
// stand behind a table (from that table)
// v0.14: where they come in, in metres: this far past the right end of the row and this far
// behind it; how fast they walk the way in or out (m/s, a brisk yard-sale pace), how long a way may
// take at most, and the part of it they fade in or out over
// v0.15 (captain: "the yard sale people should arrive from the south of the map"): they come up
// from the south (`out` metres in front of the southmost table or stall, the near side), each to a
// place on the south side of a table, and go back the same way; Vanessa sells from the north side
const BUYER_IN = { out: 2.4, lane: 0.5, speed: 3.2, maxMs: 1600, fade: 0.2 };
const BUYER_AT = [[-1.6, 2.4], [0.3, 2.8], [2.1, 2.3]];
const SELL_BEHIND_M = 0.95; // her selling spot, this far north of the first table's centre
export const CRATE_SCALE = 1.3; // drawn a little large, so the heap in it reads at phone size
export const CRATE_GAP_M = 1.02; // v0.25: the crop crate's centre, this far past the last table's along the row
export const TABLE_FRONT_M = 0.85; // v0.23: where she sets her crops out, this far south of the table that has room
// v0.16: the sign on its stick, three times the v0.15 sign (props.js saleSign), north of the
// tables between the first two, `SIGN_AT` metres behind (north of) the first table's centre and
// along the row
export const SIGN_SCALE = 3;
// v0.17c what the buyers say as they pick up their goods, by crop
// v0.23 (audit 13): what a buyer with a wish says
const WISH_COUNT = ['', 'One', 'Two', 'Three', 'Four'];
const WISH_CROP = { C: ['corn cob', 'corn cobs'], S: ['sunflower', 'sunflowers'], T: ['tomato', 'tomatoes'] };
export const wishWords = (w) => `${WISH_COUNT[w.n] ?? w.n} ${WISH_CROP[w.crop][w.n === 1 ? 0 : 1]}, please!`;
export const BUYER_WORDS = { C: ['Corny!', 'Ooh, corn!', 'A-maize-ing!'], S: ['So sunny!', 'Sunflowers!', 'Lovely!'], T: ['Yum!', 'Tomatoes!', 'Mine!'], any: ['Ooh!'] };
const SIGN_AT = { along: 0.55, behind: 1.75 };
// v0.16 the egg bird: it crosses `cross` m to each side of the drop point at `high` m, swooping to
// `dropAt` m over it, in `flyMs`; the egg falls for `fallMs`; the bird and egg sizes
export const EGG = { cross: 7, high: 4.2, dropAt: 2.6, flyMs: 2200, fallMs: 520, size: 1.9, birdSize: 2.1 };
// v0.16 the archer raises his crossbow to aim for `holdMs` every `everyMs`
export const ARCHER_AIM = { everyMs: 7000, holdMs: 1600 };
// v0.23 Dwight's few steps on watch: every `everyMs` he walks slowly (`speed` m/s) to the next of
// `spots` (metres from his post), so he is never more than a step or two from it; and his walks
// (off the picture at `off`, a drawing point beyond its right edge; to the bench, where he sits at
// `seatX` along it): his pace (m/s), his stride (m) and the swing of his legs (rad)
export const ARCHER_STROLL = { everyMs: 8500, firstMs: 3500, speed: 0.55, spots: [[0.75, 0.2], [0.1, 0.5], [-0.55, -0.1], [0, 0]] };
export const ARCHER_WALK = { speed: 1.5, leave: 2.6, stride: 0.72, swing: 0.5, off: [108, 79], seatX: 0.47 };
const PUFF_SIZE = 2.4; // a dust puff read at phone size: about 0.6 m across at its fullest
// v0.15: the house model's node for each stage's part (greybox.js house())
export const HOUSE_NODES = { H1: 'D01_House_H1_Plinth', H2: 'D01_House_H2_Walls', H3: 'D01_House_H3_Roof', H4: 'D01_House_H4_Chimney', H5: 'D01_House_H5_Details' };
// v0.15 the chimney's smoke (as the drawing has it): three puffs rising from the chimney top in
// turn, each over `ms`, `rise` metres up and drifting `drift` to the side, growing as it thins
export const SMOKE = { puffs: 4, ms: 3200, rise: 2.0, drift: 0.6, size: [2.4, 5.0], opacity: 0.9 };
// v0.16 (captain: "The stepping stones are supposed to connect the back of the house to the left
// of the corn field", as the original drawing has them): a short line of `stones` stepping stones
// from just outside the house's back right corner (`from`, house units in the house's own frame:
// x along its front, z toward its front) to the left edge of the corn field (`to`, a drawing
// point), passing between the leaning tools and the yard pile on one side and the corn on the
// other. Each stone is drawn `size` times the v0.14 ones. (v0.15's half circle round the house
// is gone.)
export const SKY_BIRDS = 1.9; // v0.16 (captain: "Make birds on the sky bigger"): this many times their v0.15 size
// v0.22 (Tiffany: "Add one stepping stone at the back leading to the back of the house (north
// side)"): one more stone beyond the line's house end, round the house's back corner (`back`, in
// the house's own metres like `from`); it is the last of steppingPlaces
export const STEPPING = { from: [2.95, -1.9], to: [48.4, 46.2], stones: 4, size: 1.25, back: [2.25, -2.55] };
// the front window's centre across the house front (hand.js cottage), house metres
const WINDOW_X = -1.08;
// v0.22 (Tiffany: "shovel and rake should be leaning against the house"): each tool stands with
// its foot `foot` m out from the house's right wall and its top resting on the wall (v0.21 fitted
// them to their drawn spots, which left them leaning in the air about a metre from the wall).
// `along`: where each stands along the wall, in house metres from the house's middle (the front
// corner is at +1.65); the station where she takes them is `stand` m out from the wall.
// how far the rake tips along the wall to rest on the shovel's handle (rad)
export const RAKE_ON_SHOVEL = 0.46;
export const TOOL_LEAN = { along: { shovel: 1.3, rake: 0.72 }, stand: 0.95, gap: 0.03 };
// the bird that takes a crop (v0.22): its size, and the crop in its claws, big enough to see
// a keepsake on the grass: this many times its model's size (0.25-0.4 m; v0.21: 1.3)
// a song spot's star while she is not standing in its circle, against its full size
export const SPOT_STAR = 0.6;
export const KEEPSAKE_SIZE = 1.9;
// v0.23: a keepsake's bounce: two hops of `hopMs` every `everyMs`, `high` metres up
export const KEEPSAKE_BOUNCE = { everyMs: 1700, hopMs: 380, high: 0.2 };
// how high it is at time t, 0..1 (pure: the checks read it)
export function keepsakeBounce(t) {
  const c = ((t % KEEPSAKE_BOUNCE.everyMs) + KEEPSAKE_BOUNCE.everyMs) % KEEPSAKE_BOUNCE.everyMs;
  if (c < KEEPSAKE_BOUNCE.hopMs) return Math.sin((c / KEEPSAKE_BOUNCE.hopMs) * Math.PI);
  if (c < KEEPSAKE_BOUNCE.hopMs * 1.8) return 0.55 * Math.sin(((c - KEEPSAKE_BOUNCE.hopMs) / (KEEPSAKE_BOUNCE.hopMs * 0.8)) * Math.PI);
  return 0;
}
// the end's sun: the spiral's turn (rad/s), how far a ray reaches out and draws back and how
// long that takes, the beams' light (least, most) and the time of the wave that goes round them
// v0.23 (Tiffany: "Have the suns spiral spinning and sun be brighter in the final graphic. Also
// make the sky around the sun lighter like its lighting up the sky"): the spiral turns plainly (a
// turn in about four seconds; v0.22's turn took eleven and was easy to miss), the beams and the
// halo are stronger (`beam`, `halo`: times v0.22's), the disc has a pale hot heart (`core`), and
// the sky is lit round it (look.js paperBackdrop uSunGlow)
export const SUN = { spin: 1.6, reach: 0.11, reachMs: 760, beam: [0.2, 0.56], waveMs: 620, halo: 1.6, core: 0.85 };
export const THIEF = { size: 2.3, crop: 2.6, away: [9, 4.2, -5] };
// v0.16 the ring of stones round the tree and the bench (D11): an ellipse round them, sized from
// the drawn ring (BORDER_POLYLINE's extent, `grow` metres more), stones `spacing` metres apart,
// with one gap of `gap` metres where the path comes in, in front of the bench
export const RING = { spacing: 0.34, gap: 1.9, grow: 0.15 };
// v0.17 the path into the ring: the drawn curve runs on `past` m beyond its drawn end, and the
// path ends `into` m inside the ring's gap along it, half
// `door` m wide at the door and `end` m at the gap (the gap is RING.gap wide), rounded over its
// last `cap` m
export const PATH_RING = { into: 0.5, door: 0.55, end: 0.68, cap: 0.6, past: 2.5 };
// v0.18 (captain: "No rocks on the path, the rocks from the circle shouldn't be on top of the
// path"): every stone keeps `clear` m between its farthest point and the path's dirt. The ring
// leaves out the stones that would touch the path, so the path comes in through an open entrance.
// (v0.19: no stones along the path's edges.)
export const PATH_STONES = { clear: 0.04 };

// v0.20: the drawing height (v, % from the top) of the two song stars under the sky's things: on
// the grass a few metres in front of the horizon, level with the back of the corn
export const SKY_SPOT_V = 45;
// v0.20 the tomatoes on a plant: [where they hang ('base': low on the plant, in the units' own
// frame; or a tier of the plant, in the tier's), the size level they come with, and each one's
// place and the harvest unit it belongs to: x, y, z, unit]. 2 on a plant's first crop, then 6,
// then 10. They hang close to the stem, inside the leaves' width: the plant grows taller, not
// wider (v0.16).
// v0.21 (the harvest grows with the plant: 2, 3, then 4 units a round, data.js TOMATO_YIELD): each
// unit is a share of the fruit on the plant. One tomato each on the first crop, two each once it
// has grown a tier (3 units, 6 tomatoes), and at full height two or three each (4 units, 10).
export const TOMATO_FRUIT = [
  ['base', 0, [[-0.055, 0.26, 0.05, 0], [0.055, 0.33, 0.05, 1]]],
  ['base', 1, [[-0.07, 0.385, 0.045, 2], [0.075, 0.2, 0.05, 0]]],
  ['tier0', 1, [[-0.04, 0.09, 0.055, 1], [0.045, 0.16, 0.05, 2]]],
  ['tier0', 2, [[-0.05, 0.22, 0.04, 3], [0.02, 0.275, 0.06, 3]]],
  ['tier1', 2, [[-0.04, 0.1, 0.055, 0], [0.045, 0.17, 0.05, 1]]],
];
// how many tomatoes show on a full plant at each size level, and how many go with each unit
export const tomatoFruitAt = (level) => TOMATO_FRUIT.filter(([, lv]) => lv <= level).reduce((n, [, , spots]) => n + spots.length, 0);

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
    // v0.15: five stages, each only its own part: foundation, walls, roof, chimney, home
    for (const st of HOUSE_STAGES) {
      const name = HOUSE_NODES[st];
      this.addPart(st, { model: node(name), before: [node(`D01_House_Ghost_${st}`), ...(st === 'H1' ? [node('D01_House_H0_Footprint')] : [])] });
    }
    this.buildSmoke(house);
    const tree = fitted('D09', G.tree());
    this.addCylinder(tree.position, TREE_TRUNK_R * tree.scale.x);
    // v0.22: only the canopy faded when it hid her or a target; the trunk and the branches stayed.
    // v0.24 (the captain's v0.23 playtest: "the trunk of the tree also should go transparent"): the
    // trunk and the branches go see-through together with the canopy, whichever of them is in the
    // way. They are two faders with one answer (updateFade), so that the trunk can stay solid for
    // the one moment v0.22 kept it for: while she hugs it.
    const leaves = [PAL.leaf, PAL.leafLight];
    const isLeaf = (m) => leaves.includes(m.material?.color?.getHex?.());
    const canopy = G.fadeable(tree, (m) => !m.userData.noFit && isLeaf(m));
    const trunk = G.fadeable(tree, (m) => !m.userData.noFit && !isLeaf(m));
    this.treeFade = { canopy, trunk };
    this.faders = [canopy, trunk];
    // House parts already own paintable materials; fade those uniforms rather than clone
    // them away from their build/wash owners. Only committed walls occlude during play.
    const houseFade = { opacity: 1, meshes: [], set: (o) => {
      houseFade.opacity = o;
      for (const id of HOUSE_STAGES) if (this.lastLedger && isCommitted(this.lastLedger, id)) this.parts[id].model.setOpacity(o);
    } };
    this.houseFade = houseFade;
    this.faders.push(houseFade);
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
    // Vanessa can step onto the low bed; buyers still route around its bounds.
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
      // its ripe tomatoes hang on the plant (TOMATO_FRUIT below fills it)
      const units = new THREE.Group(); units.name = `tomatoes:${id}`;
      units.position.copy(at);
      this.root.add(units);
      const ground = at.clone().setY(0);
      // v0.15: the plant itself, which grows a size step with each round (plantSize)
      const plant = bedPlants.getObjectByName(`D19_Tomato_${id}`);
      // v0.20 (captain: "When the tomato plant grows should have more tomato"): a grown plant
      // carries clearly more fruit: 2 on its first crop, 6 once it has grown a tier, 10 at full
      // height, more low on the plant and a truss on each tier.
      // v0.21 ("the tomatoes harvest should also go up"): and it gives more: 2, 3, then 4 units a
      // round. Each unit is a share of the tomatoes on the plant, and picking it takes its share
      // (TOMATO_FRUIT; showFruit).
      const fruit = [];
      const inv = new THREE.Vector3(1 / bed.scale.x, 1 / bed.scale.y, 1 / bed.scale.z);
      for (const [where, level, spots] of TOMATO_FRUIT) {
        const parent = where === 'base' ? units : plant.getObjectByName(where);
        if (!parent) continue;
        for (const [x, y, z, unit] of spots) {
          const t = G.unitMesh('T');
          t.position.set(x, y, z);
          t.scale.setScalar(1.05);
          if (parent !== units) t.scale.multiply(inv); // the plant is in the bed's scale; a tomato keeps its size
          t.userData.keep = true; // showUnits leaves it to showFruit
          t.visible = false;
          parent.add(t);
          fruit.push({ mesh: t, unit, level });
        }
      }
      this.nodeViews[id] = { dig, units, plant, fruit, size: 1, want: 1 };
      this.stations[id] = { def: { id, kind: 'node', r: 0.85, label: 'tomatoes' }, obj: units, pos: ground };
    }
    // the tools at their lean; `home` is where each returns (P25-4). v0.22: against the house's
    // right wall, the handle's top on the wall (TOOL_LEAN)
    this.tools = {};
    for (const [id, kind] of [['D13', 'shovel'], ['D14', 'rake']]) {
      const o = fitted(id, G.tool(kind));
      this.leanOnWall(o, kind);
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
    // v0.16 (captain: "The stones are in a continuous circle except for in front of the bench where
    // the path connects"): one ring of stones round the tree and the bench (ringPlaces), its only
    // gap in front of the bench, where the path comes in. Before G4 its stones lie scattered along
    // it, toppled and a little off their places.
    const ringAt = this.ringPlaces();
    const stones = ringAt.filter((_, i) => i % 4 !== 2).map((q, i) => {
      const seed = i + 2;
      return { seed, pos: q.clone().add(new THREE.Vector3(((seed * 13) % 7 - 3) * 0.035, 0, ((seed * 7) % 5 - 2) * 0.045)) };
    }).filter((st) => this.offPath(st.pos, scatteredStoneReach(st.seed))); // toppled ones too stay off the path
    const scattered = G.borderStones(stones);
    this.root.add(scattered);
    // G4 settles them into the ring, evenly, keeping the gap in front of the bench
    const ring = ringAt.map((pos) => ({ seed: pos.userData.seed, pos }));
    const arranged = G.borderRing(ring);
    this.root.add(arranged);
    this.addPart('D11', { model: arranged, radial: true, before: [paintable(scattered, { colour: 0 })] });
    this.ringModel = arranged;
    const ovals = new THREE.Group(); ovals.name = 'D12_Stones_Outlines';
    const setStones = new THREE.Group(); setStones.name = 'D12_Stones';
    this.steppingPlaces().forEach((at, i) => {
      const o = G.steppingOutline(i); o.position.copy(at); o.rotation.y = at.userData.yaw; o.scale.set(STEPPING.size, 1, STEPPING.size); ovals.add(o);
      const st = G.steppingStone(i); st.position.copy(at); st.rotation.y = at.userData.yaw; st.scale.set(STEPPING.size, 1.15, STEPPING.size); setStones.add(st);
    });
    this.root.add(ovals, setStones);
    this.addPart('D12', { model: setStones, radial: true, before: [ovals] });
    const path = this.buildPathOutline();
    // v0.20 (captain: "update the texture of both the path and the tree circle"): the circle
    // round the tree and the bench is the path's own gravel, inside the ring of stones
    path.gravel.add(G.gravelClearing(this.ring.centre, this.ring.rx, this.ring.rz, path.gravel.getObjectByName('D08_Path_Gravel').material));
    this.addPart('D08', { model: path.gravel, radial: true, before: path.dashes });
    this.buildSprouts();
    this.buildSky();

    // stations
    for (const def of STATIONS) this.buildStation(def);
    // v0.22: she takes the tools where they lean now: before the wall, between the two
    {
      const h = this.objects.D01;
      const mid = (TOOL_LEAN.along.shovel + TOOL_LEAN.along.rake) / 2;
      this.stations.tools.pos.copy(h.localToWorld(new THREE.Vector3(G.HOUSE.w / 2 + TOOL_LEAN.stand / h.scale.x, 0, mid))).setY(0);
      this.stations.tools.obj.position.copy(this.stations.tools.pos);
    }
    // v0.15: the stepping stones' site is one of them (v0.16: the middle one of their line)
    const line = this.steppingPlaces();
    this.stations.G3.pos.copy(line[Math.floor(line.length / 2)]).setY(0);
    this.buildRegrowth();
    this.buildYardWeeds();
    this.buildSale();
    this.buildCrate();
    this.marker = { obj: G.marker(), id: null, alpha: 0, t: 0, pop: 0, popAmp: 0, scale: 1 };
    this.marker.obj.visible = false;
    this.root.add(this.marker.obj);
    this.buildBranch();
    this.buildArcher();
    this.goalMarkers = {};
    // A build takes place beside its object, on ground Vanessa can reach.
    for (const id of HOUSE_STAGES) this.stations[id].pos.copy(this.eggSpotPos('door'));
    const benchSite = this.objects.D10;
    this.stations.G2.pos.copy(benchSite.localToWorld(new THREE.Vector3(0, 0, 0.85))).setY(0);
    this.boundsQuad = [[BOUNDS.uMin, BOUNDS.vMin], [BOUNDS.uMax, BOUNDS.vMin], [BOUNDS.uMax, BOUNDS.vMax], [BOUNDS.uMin, BOUNDS.vMax]]
      .map(([u, v]) => p.groundAt(u, v));
  }

  // v0.22: stand a tool against the house's right wall. It keeps its fitted size; it turns with
  // the house, so the lean built into its model (props.js tool: its top tips toward its own -x)
  // points at the wall, and its foot goes just far enough out that the grip's top touches it.
  leanOnWall(o, kind) {
    const h = this.objects.D01;
    h.updateMatrixWorld(true);
    const lean = o.rotation.z; // the model's own lean (props.js tool): 0.2 rad the shovel, 0.17 the rake
    o.rotation.set(0, h.rotation.y, lean);
    o.updateMatrixWorld(true);
    // how far the grip's top stands in from the foot: the handle's length along the lean, and half its width
    const box = new THREE.Box3();
    o.traverse((m) => { if (m.isMesh && !m.userData.outline) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); } });
    const reach = (Math.sin(lean) * box.max.y + 0.026) * o.scale.x;
    const out = (G.HOUSE.w / 2) + (reach + TOOL_LEAN.gap) / h.scale.x;
    o.position.copy(h.localToWorld(new THREE.Vector3(out, 0, TOOL_LEAN.along[kind]))).setY(0);
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

  // v0.16: the stepping stones (D12) on their line from the back of the house to the corn, each
  // turned along it (ground points; `userData.yaw` their turn)
  steppingPlaces() {
    if (this.stepping) return this.stepping;
    const h = this.objects.D01;
    h.updateMatrixWorld(true);
    const { from, to, stones } = STEPPING;
    const a = h.localToWorld(new THREE.Vector3(from[0], 0, from[1])).setY(0);
    const b = this.proj.groundAt(to[0], to[1]).setY(0);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const out = [];
    for (let i = 0; i < stones; i++) {
      const t = i / (stones - 1);
      const at = a.clone().lerp(b, t);
      // a little wander, as the drawing's hand placed them
      const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(0.12 * Math.sin(i * 2.1 + 0.6));
      at.add(side);
      at.userData = { yaw: yaw + 0.25 * Math.sin(i * 1.7) };
      out.push(at);
    }
    // v0.22: and one at the back, leading round the corner to the back of the house (the last one)
    const back = h.localToWorld(new THREE.Vector3(STEPPING.back[0], 0, STEPPING.back[1])).setY(0);
    back.userData = { yaw: yaw + 0.5 };
    out.push(back);
    this.stepping = out;
    return out;
  }
  // v0.16: the ring round the tree and the bench, and its gap: ground points `RING.spacing` apart
  // on an ellipse round the drawn ring, leaving out those within half the gap of the gap's middle,
  // the point of the ring in front of the bench (toward the path's drawn end). `ringGap` is that
  // point (where the path ends). v0.18: also leaving out every stone that would reach the path
  // (PATH_STONES), so the ring opens where the path comes in instead of running across it. Each
  // place carries its stone's seed (`userData.seed`).
  ringPlaces() {
    if (this.ring?.places) return this.ring.places;
    const pts = BORDER_POLYLINE.flat().map(([u, v]) => this.proj.groundAt(u, v));
    const x0 = Math.min(...pts.map((q) => q.x)) - RING.grow; const x1 = Math.max(...pts.map((q) => q.x)) + RING.grow;
    const z0 = Math.min(...pts.map((q) => q.z)) - RING.grow; const z1 = Math.max(...pts.map((q) => q.z)) + RING.grow;
    const c = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const rx = (x1 - x0) / 2; const rz = (z1 - z0) / 2;
    // v0.17 (captain: "the road next to the tree still looks off"): the gap is where the drawn
    // path crosses the ring, so the path comes in along its own curve (v0.16 aimed it at the drawn
    // end, past which the path had to cross the ring's stones)
    const k = this.pathEntry(c, rx, rz);
    const end = k.point;
    const gapA = Math.atan2((end.z - c.z) / rz, (end.x - c.x) / rx);
    const on = (a) => new THREE.Vector3(c.x + Math.cos(a) * rx, 0, c.z + Math.sin(a) * rz);
    const gapPt = on(gapA);
    // the ellipse first: the path's shape depends on it (pathShape)
    this.ring = { places: null, centre: c, rx, rz, gap: gapPt, gapAngle: gapA };
    // even spacing along the ellipse: walk it in small steps
    const places = [];
    let carry = 0; let prev = on(gapA); let n = 0;
    for (let k = 1; k <= 720; k++) {
      const q = on(gapA + (k / 720) * Math.PI * 2);
      carry += q.distanceTo(prev); prev = q;
      if (carry < RING.spacing) continue;
      carry = 0;
      const seed = 3 + n++;
      if (q.distanceTo(gapPt) < RING.gap / 2) continue;
      if (!this.offPath(q, ringStoneReach(seed))) continue;
      q.userData = { seed };
      places.push(q);
    }
    this.ring.places = places;
    return places;
  }
  // v0.18: does a stone at ground point q, reaching `reach` m from it, keep clear of the path?
  offPath(q, reach) {
    const { left, right } = this.pathShape();
    return ribbonDistance(q, left, right) >= reach + PATH_STONES.clear;
  }
  // v0.15 (captain: "the way to the house should arrive to the door of the house"): the door
  // step's front edge, and a point straight out from it, on the ground
  doorPoints() {
    const h = this.objects.D01;
    const step = h.userData.doorStep;
    return [h.localToWorld(step.clone().add(new THREE.Vector3(0, 0, -0.24))).setY(0), h.localToWorld(step.clone().add(new THREE.Vector3(0, 0, 1.4))).setY(0)];
  }

  // the drawn path on the ground: out of the door step, then through the drawing's path points to
  // its drawn end at the bench (centripetal, so it never overshoots a bend)
  // where the drawn path enters the ring (the ellipse c, rx, rz): its first point inside, or, if it
  // only brushes past, its nearest point. -> { samples, index, point, crosses }
  pathEntry(c, rx, rz) {
    const e = (q) => ((q.x - c.x) / rx) ** 2 + ((q.z - c.z) / rz) ** 2;
    const samples = this.drawnPath().getSpacedPoints(400);
    let index = samples.findIndex((q) => e(q) < 1);
    if (index > 0) return { samples, index, point: samples[index - 1].clone().lerp(samples[index], 0.5), crosses: true };
    index = samples.reduce((best, q, i) => (e(q) < e(samples[best]) ? i : best), 0);
    return { samples, index, point: samples[index].clone(), crosses: false };
  }
  // and on along its last direction for `PATH_RING.past` m, so it always reaches into the ring
  drawnPath() {
    if (this.drawnCurve) return this.drawnCurve;
    const pts = [...this.doorPoints(), ...PATH.slice(1).map(([u, v]) => this.proj.groundAt(u, v))];
    const [a, b] = pts.slice(-2);
    pts.push(b.clone().addScaledVector(b.clone().sub(a).setY(0).normalize(), PATH_RING.past));
    return (this.drawnCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'));
  }
  // D08: the path G1 lays (v0.19: no border, no edge rocks, no outline; v0.20: grey gravel)
  buildPathOutline() {
    this.ringPlaces();
    const { left, right } = this.pathShape();
    const dashes = [];
    const gravel = G.gravelPath(left, right);
    this.root.add(gravel);
    return { dashes, gravel };
  }
  // v0.18: the path's shape on the ground, worked out once, before any stone is placed (the ring's
  // and the edges' stones keep off it): its centre curve, its samples and the dirt's two edges
  pathShape() {
    if (this.pathShapeCache) return this.pathShapeCache;
    if (!this.ring) this.ringPlaces(); // the ring's ellipse (ringPlaces sets it before it asks for this)
    // v0.17 (captain: "the road next to the tree still looks off"): the drawn path's last points
    // lie inside the ring's outline, so the dirt crossed the ring's stones before it reached the
    // gap and ended in a wide square cut. Now the points within a metre of the ring are left out,
    // and the path comes straight in through the gap (along the ring's outward normal there),
    // narrower than the gap, and ends just inside it with a rounded end.
    // The path follows the drawn curve from the door step to the ring's gap (where that curve
    // crosses the ring, ringPlaces) and ends `into` m inside it, with a rounded end; it is
    // narrower than the gap.
    const { centre: c, rx, rz, gap } = this.ring;
    const entry = this.pathEntry(c, rx, rz);
    const drawn = entry.samples;
    let kept;
    if (entry.crosses) {
      let cut = entry.index;
      for (let run = 0; cut < drawn.length - 1 && run < PATH_RING.into; cut++) run += drawn[cut].distanceTo(drawn[cut + 1]);
      kept = drawn.slice(0, cut + 1);
    } else {
      // it only brushes past the ring: from its nearest point it turns in through the gap
      kept = [...drawn.slice(0, entry.index + 1), gap.clone().lerp(c, PATH_RING.into / Math.max(0.5, gap.distanceTo(c)))];
    }
    // every sixth point, and the end; a point within 0.3 m of the end gives way to it (two nearly
    // coincident points would twist the end)
    const ctrl = kept.filter((_, i) => i % 6 === 0);
    while (ctrl.length > 1 && ctrl.at(-1).distanceTo(kept.at(-1)) < 0.3) ctrl.pop();
    ctrl.push(kept.at(-1));
    const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
    const samples = curve.getSpacedPoints(110); // even by length, so the rounded end has its points
    // arc length from the far end, for the rounded end
    const fromEnd = new Array(samples.length).fill(0);
    for (let i = samples.length - 2; i >= 0; i--) fromEnd[i] = fromEnd[i + 1] + samples[i].distanceTo(samples[i + 1]);
    this.pathHalfWidth = (i) => {
      const w = PATH_RING.door + (PATH_RING.end - PATH_RING.door) * (i / (samples.length - 1)); // narrowing at the door
      const k = Math.min(1, fromEnd[i] / PATH_RING.cap);
      return w * Math.sqrt(Math.max(0, 1 - (1 - k) ** 2)); // a round end inside the gap
    };
    const edges = [];
    for (const side of [-1, 1]) {
      const edge = samples.map((q, i) => {
        const a = samples[Math.max(0, i - 1)];
        const b = samples[Math.min(samples.length - 1, i + 1)];
        const dir = new THREE.Vector3().subVectors(b, a).normalize();
        const n = new THREE.Vector3(-dir.z, 0, dir.x);
        // on the inside of a bend the edge stays within the bend's radius, so it never folds
        let w = this.pathHalfWidth(i);
        if (i > 0 && i < samples.length - 1) {
          const d1 = new THREE.Vector3().subVectors(q, a); const d2 = new THREE.Vector3().subVectors(b, q);
          const turn = Math.atan2(d1.x * d2.z - d1.z * d2.x, d1.x * d2.x + d1.z * d2.z); // + turns toward n
          const r = (d1.length() + d2.length()) / 2 / Math.max(1e-4, Math.abs(turn));
          if (Math.sign(turn) === side) w = Math.min(w, r * 0.8);
        }
        return q.clone().addScaledVector(n, side * w).setY(0.02);
      });
      // an edge never steps back along the path (that would loop at a tight bend): such a point
      // stays where the edge last was
      for (let i = 1; i < edge.length - 1; i++) {
        const dir = new THREE.Vector3().subVectors(samples[i + 1], samples[i - 1]).setY(0).normalize();
        if (new THREE.Vector3().subVectors(edge[i], edge[i - 1]).dot(dir) < 0) edge[i].copy(edge[i - 1]);
      }
      edges.push(edge);
    }
    this.pathCurve = curve;
    return (this.pathShapeCache = { curve, samples, left: edges[0], right: edges[1] });
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
    const sunInk = sun.getObjectByName('D22_SunInk');
    this.sunParts = { disc: sun.getObjectByName('D22_SunDisc'), ink: sunInk, inkMat: sunInk.userData.ink, spiral: sun.getObjectByName('D22_SunSpiral'), rays: sun.getObjectByName('D22_SunRays'), glow: sun.getObjectByName('D22_SunGlow'), core: sun.getObjectByName('D22_SunCore'), t: 0 };
    this.sunParts.disc.material.uniforms.uColor.value.set(FINALE_COLOURS.sun);
    const bc = p.backdropAt(SKY.D21.u, SKY.D21.v, z);
    const bw = bc.distanceTo(p.backdropAt(SKY.D21.u + SKY.D21.wu, SKY.D21.v, z));
    // v0.16 (captain: "Make birds on the sky bigger", the coloured drawing's big check marks)
    const flock = G.birds((bw / 2.2) * SKY_BIRDS);
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
    if (def.bed) { def = { ...def, r: 0.85 }; obj.position.copy(this.bedAt(def.bed)).add(new THREE.Vector3(0, 0, 0.06)); pos.copy(obj.position).setY(0); }
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

  // v0.23 (Tiffany: "In the end, keep ... weeds growing random places in the yard occasionally";
  // "Allow weeding anywhere in the picture there is a weed at the end"): the places a weed can come
  // up on the finished farm's grass (layout.js YARD_WEED_PLACES), each a weed station like the
  // others, hidden until the ledger has a weed there
  // (v0.24: three of the places have a weed from the start of the game; raked, it grows back in)
  buildYardWeeds() {
    for (const [id, [u, v]] of Object.entries(YARD_WEED_PLACES)) {
      const obj = G.weed();
      const pos = this.proj.groundAt(u, v);
      obj.position.copy(pos);
      obj.rotation.y = (u * 3.1 + v) % 6.28;
      obj.visible = false;
      obj.name = `weed:${id}`;
      this.root.add(obj);
      const def = { id, kind: 'weed', r: 0.3, label: 'weeds', yard: true };
      obj.scale.setScalar(stationScale(def));
      this.stations[id] = { def, obj, pos: pos.clone().setY(0) };
    }
  }

  // v0.12: the sale's sign and buyers, made once and shown only during a yard sale
  buildSale() {
    const t = this.stations.table;
    const sign = G.saleSign();
    sign.visible = false;
    const t1 = t.pos; const t2 = this.stations.table2.pos;
    const along = new THREE.Vector3().subVectors(t2, t1).setY(0).normalize();
    sign.position.copy(t1).addScaledVector(along, SIGN_AT.along * t1.distanceTo(t2)).add(new THREE.Vector3(0, 0, -SIGN_AT.behind)).setY(0);
    sign.rotation.y = -0.08;
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
    // v0.16: no neighbours' stalls any more (the captain: "Remove the extra sellers")
  }
  // v0.25 (the captain: "you start having so many crops in your head and there is no way to give
  // them away unless you sell"): the crop crate. It stands at the end of the row of tables, just
  // past the last one standing (so it is beside them whether one, two or three stand, and hops
  // along as a table is set up), with the crops in it heaped in sight (carry.js crateSlot) and a
  // count beside it (main.js). A station of its own kind: nothing is worked at it.
  buildCrate() {
    const obj = G.cropCrate();
    obj.name = 'crate:crate';
    obj.visible = false;
    this.root.add(obj);
    const pos = this.crateAt(1);
    obj.position.copy(pos);
    obj.rotation.y = 0.12;
    obj.scale.setScalar(CRATE_SCALE);
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.39, 0.3, 0.28)) });
    body.position.set(pos.x, 0.3, pos.z);
    this.stations.crate = { def: { id: 'crate', kind: 'crate', r: 0.35, label: 'crop crate' }, obj, pos, body };
    this.piles.crate = new UnitPile(obj, crateSlot, 1.15 / CRATE_SCALE * 1.12);
    this.crateTables = 1;
    this.crateShown = 0;
  }
  // where the crate stands when `n` tables do: past the last one, along the row
  crateAt(n, out = new THREE.Vector3()) {
    const list = this.tableStations();
    const last = list[Math.max(0, Math.min(list.length, n) - 1)].pos;
    const along = new THREE.Vector3().subVectors(list[1].pos, list[0].pos).setY(0).normalize();
    return out.copy(last).addScaledVector(along, CRATE_GAP_M).setY(0);
  }
  // the top of the crate's heap: where a crop flies to, and where one leaves it for a table
  crateTopWorld(out = new THREE.Vector3()) {
    return out.copy(this.stations.crate.pos).setY(0.5 + Math.min(0.26, 0.022 * (this.crateShown ?? 0)));
  }
  // v0.15: where she holds a sale from: behind (north of) her first table, the buyers' far side
  sellSpot(out = new THREE.Vector3()) { return out.copy(this.stations.table.pos).add(new THREE.Vector3(0, 0, -SELL_BEHIND_M)); }
  // v0.13: her tables, first to last
  tableStations() { return STATIONS.filter((d) => d.kind === 'table').map((d) => this.stations[d.id]); }

  // targets for the interaction controller (positions in metres on the ground)
  targets(l) {
    const out = [];
    for (const [id, s] of Object.entries(this.stations)) {
      if (s.def.kind === 'table' && (!tableAvailable(l) || s.def.table >= tables(l))) continue;
      if (s.def.kind === 'crate' && !tableAvailable(l)) continue; // v0.25: it comes with the first table
      if (s.def.kind === 'site' && isCommitted(l, id)) continue; // built
      if (s.def.kind === 'node' && !this.nodeViews[id]) continue;
      if (s.def.kind === 'rock' && id === 'RX' && !l.rocks.RX) continue; // the recovery rock only when needed
      if (s.def.kind === 'rock' && this.finished) continue; // v0.22: the leftover rocks are gone from the finished farm (sync hides them): nothing to gather there
      if ((s.def.regrow || s.def.yard) && !weedPresent(l, id)) continue;
      const kind = s.def.kind === 'node' && digOpen(l, id) ? 'dig' : s.def.kind;
      const t = { id, kind, x: s.pos.x, z: s.pos.z, r: s.def.r, label: s.def.label };
      if (s.def.kind === 'table') t.table = s.def.table; // v0.23: her crops go onto the table that has room
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
        const comes = s.def.regrow || s.def.yard; // a weed that creeps in (over a crop; v0.23: on the finished farm's grass)
        const gone = comes ? !weedPresent(l, id) : l.weeds[id];
        if (gone && s.obj.visible && animate && !this.revealing?.has(id)) this.shrinkAway(id);
        else if (!gone && !s.obj.visible && animate && comes && !this.revealing?.has(id) && !this.playHidden) this.creepIn(id);
        else if (!this.revealing?.has(id)) { s.obj.visible = !gone; s.obj.scale.setScalar(stationScale(s.def)); }
      } else if (kind === 'pile') {
        showUnits(s.obj, l.piles[id]);
        s.obj.getObjectByName('patch').visible = l.piles[id] > 0 && !this.onGrass(s.pos); // a starter pile never returns
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
        // v0.14: with all four tables the goods keep piling (carry.js tableSpot); past what is
        // drawn they are only counted
        const drawn = tableDrawn(n, n >= TABLES_UNLIMITED);
        for (const c of ['C', 'S', 'T']) for (let i = l.table[c] - this.inFlight('table', c); i > 0 && shown.length < drawn; i--) shown.push(c);
        const perTable = this.tableStations().map(() => []);
        for (let i = 0; i < Math.min(shown.length, drawn); i++) {
          const at = tableSpot(i, n, n >= TABLES_UNLIMITED);
          if (at && perTable[at.k]) perTable[at.k][at.i] = shown[i] ?? null;
        }
        for (const st of this.tableStations()) {
          const k = st.def.table;
          const want = k < n;
          if (want && !st.obj.visible && !this.revealing?.has(st.def.id) && !this.playHidden) {
            if (k > 0 && animate) this.popTable(st); else st.obj.visible = true;
          }
          if (!want && st.obj.visible && !this.revealing?.has(st.def.id)) st.obj.visible = false;
          this.piles[st.def.id].set(want ? Array.from(perTable[k], (x) => x ?? null) : [], { pop: animate });
          if (want && !st.body.world) this.physics.addBody(st.body);
          if (!want && st.body.world) this.physics.removeBody(st.body);
        }
        this.syncCrate(l, n, animate);
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
      if (c.plant) { c.want = plantSize(l, id); if (!animate) this.sizePlant(c, c.want); }
      if (c.fruit) { c.remaining = l.nodes[id].remaining; this.showFruit(c); }
    }
    this.syncTool(l.tool, animate);
    this.syncArcher(l, animate);
    this.syncStain(l);
    this.applyParts(l);
  }

  // v0.25: the crop crate, by the ledger: there once the first table is, past the last of the `n`
  // tables standing (it hops along when a table is set up), its heap what the ledger's crate
  // holds less what is still flying to it (CRATE_SHOWN drawn; `crateTotal` is the count shown)
  syncCrate(l, n, animate = false) {
    const st = this.stations.crate;
    if (!st) return;
    const want = n > 0;
    const o = st.obj;
    if (!this.revealing?.has('crate')) o.visible = want && !(this.playHidden >= 1);
    if (want && !st.body.world) this.physics.addBody(st.body);
    if (!want && st.body.world) this.physics.removeBody(st.body);
    const list = [];
    for (const c of ['C', 'S', 'T']) for (let i = (l.crate?.[c] ?? 0) - this.inFlight('crate', c); i > 0; i--) list.push(c);
    this.crateTotal = want ? crateCount(l) : 0;
    this.crateShown = Math.min(CRATE_SHOWN, list.length);
    this.piles.crate.set(want ? list.slice(0, CRATE_SHOWN) : [], { pop: animate });
    if (!want || n === this.crateTables) return;
    // a table more (or fewer, on another farm): the crate's place moves along the row
    const from = st.pos.clone();
    const to = this.crateAt(n);
    this.crateTables = n;
    st.pos.copy(to);
    st.body.position.set(to.x, 0.3, to.z);
    if (!animate || this.reducedMotion() || this.playHidden) { o.position.copy(to); return; }
    const token = (this.crateHop = (this.crateHop ?? 0) + 1);
    this.tweens.run(420, (t) => {
      if (this.crateHop !== token) return;
      o.position.lerpVectors(from, to, ease.inOut(t)).setY(Math.sin(Math.PI * t) * 0.28);
    }).then(() => { if (this.crateHop === token) o.position.copy(to); });
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
      const kind = (x) => ([...HOUSE_STAGES, 'D18'].includes(x.id) ? 'rise' : ['c1', 'c2', 'c3', 'c4'].includes(x.id) ? 'grow' : null);
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
      if (!['weed', 'pile', 'stick', 'table', 'rock', 'yard', 'crate'].includes(s.def.kind)) continue;
      if (k >= 1) s.obj.visible = false;
      s.obj.scale.setScalar(stationScale(s.def) * Math.max(0.01, 1 - k));
    }
    for (const a of Object.values(this.archers ?? {})) { // not in the drawing: away for the finale, back after
      a.hidden = k > 0;
      // (v0.23: he walks out of the picture himself as the finale starts: archerLeave)
      if (k > 0 && !(a.mode === 'walk' && a.walk?.then === 'gone')) a.root.visible = false;
    }
    if (this.stain && k > 0) this.stain.visible = false;
    if (k > 0 || this.finaleActive) {
      this.hideMarkers(); this.sale.sign.visible = false;
      for (const b of this.sale.buyers) b.visible = false;
    }
    if (k === 0) {
      for (const s of Object.values(this.stations)) {
        if (!['weed', 'pile', 'stick', 'table', 'rock', 'yard', 'crate'].includes(s.def.kind)) continue;
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
    const { disc, inkMat } = this.sunParts;
    disc.visible = sun > 0;
    disc.material.opacity = sun;
    inkMat.color.copy(ink).lerp(new THREE.Color(FINALE_COLOURS.sunInk), sun);
    this.finaleColour = { grass, sky, sun };
    this.updateSun(0);
    // v0.14 (captain: "in the postgame sticks have the old floor background, not grass"): a
    // branch's trodden paper patch belongs to the paper ground; where the grass has come it goes,
    // and the sticks and the starter piles lie on the grass itself, as everything else does
    for (const st of Object.values(this.stations)) {
      if (st.def.kind !== 'stick' && st.def.kind !== 'pile') continue;
      const patch = st.obj.getObjectByName('patch');
      if (patch) patch.visible = !this.onGrass(st.pos) && (st.def.kind !== 'pile' || (this.lastLedger?.piles[st.def.id] ?? 1) > 0);
    }
  }
  // v0.22 (Tiffany: "At the end, have the sun actually illuminating rays and the spiral
  // rotating"): once the sun has its colour (the finale's last beat, and the finished farm ever
  // after) its spiral turns, slowly, each ray reaches out and draws back in its own time, and a
  // beam of light lies along every ray inside a soft halo, the beams brightening in a slow wave
  // round the sun. Per rendered frame (main.js), so it lives while the world is paused. Reduced
  // motion: the light is there, still.
  updateSun(dtMs) {
    const s = this.sunParts;
    if (!s) return;
    const k = this.finaleColour?.sun ?? 0;
    s.glow.visible = k > 0.001;
    if (!s.glow.visible) { s.spiral.rotation.z = 0; for (const r of s.rays.children) r.scale.x = 1; if (s.core) s.core.visible = false; return; }
    const still = this.reducedMotion();
    if (!still) s.t += dtMs;
    const t = s.t;
    s.spiral.rotation.z = still ? 0 : -(t / 1000) * SUN.spin;
    s.rays.children.forEach((r, i) => { r.scale.x = still ? 1 : 1 + SUN.reach * Math.sin(t / SUN.reachMs + i * 1.7); });
    for (const o of s.glow.children) {
      if (o.name === 'D22_SunHalo') { for (const ring of o.children) ring.material.opacity = Math.min(1, k * ring.userData.level * SUN.halo * (still ? 1 : 0.9 + 0.1 * Math.sin(t / 900))); continue; }
      const i = Number(o.name.split('_').pop());
      const wave = still ? 0.5 : 0.5 + 0.5 * Math.sin(t / SUN.waveMs - i * 0.9);
      o.material.opacity = k * (SUN.beam[0] + (SUN.beam[1] - SUN.beam[0]) * wave);
      o.scale.x = still ? 1 : 0.94 + 0.1 * wave;
    }
    for (const o of s.glow.children) if (o.material) o.material.color.set(FINALE_COLOURS.sunGlow);
    if (s.core) { s.core.visible = true; s.core.material.opacity = k * SUN.core * (still ? 1 : 0.92 + 0.08 * Math.sin(t / 700)); }
  }
  // has the finale's grass reached this point of the ground (it stays after the finale)
  onGrass(pos) {
    const g = this.groundMat?.uniforms;
    return !!g && g.uGrassR.value > 0 && Math.hypot(pos.x - g.uGrassC.value.x, pos.z - g.uGrassC.value.y) < g.uGrassR.value;
  }
  // the horizon's height on screen for the sky's rise (per frame, with the camera in use)
  updateSky(camera) {
    const u = this.skyMesh.material.uniforms;
    if (!(this.finaleColour?.sky > 0)) { u.uSunGlow.value = 0; return; }
    tmpV.set(0, 0, this.groundCorners[0].z).project(camera);
    u.uHorizon.value = Math.max(0, Math.min(1, (tmpV.y + 1) / 2));
    // v0.23: where the sun is on screen, and how much it lights the sky round it
    tmpV.copy(this.objects.D22.position).project(camera);
    u.uSun.value.set((tmpV.x + 1) / 2, (tmpV.y + 1) / 2);
    u.uAspect.value = camera.aspect || 1;
    u.uSunGlow.value = this.finaleColour?.sun ?? 0;
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
    if (!this.hand) return;
    if (!animate) { this.resetTools(tool); return; }
    if (tool === this.heldTool) return;
    const prev = this.heldTool;
    this.heldTool = tool;
    if (prev) this.moveTool(prev, false, animate);
    if (tool) this.moveTool(tool, true, animate);
  }
  // Every launch path (fresh, Continue, recovery, New farm) cancels old flights and restores
  // both visibility and transforms. A hidden held tool must not stay hidden at its lean.
  resetTools(tool = null) {
    this.heldTool = tool;
    for (const [kind, t] of Object.entries(this.tools)) {
      ++t.tween; t.flying = false; t.obj.visible = true; setOpacity(t.obj, 1);
      t.obj.position.copy(t.home.pos); t.obj.quaternion.copy(t.home.quat); t.obj.scale.copy(t.home.scale);
      if (kind === tool && this.hand) this.gripWorld(kind, t.obj.position, t.obj.quaternion);
    }
  }
  // where the held tool goes now (root space = world space here)
  gripWorld(kind, pos, quat) {
    const t = this.tools[kind];
    const v = this.heroView;
    this.hand.updateWorldMatrix(true, false);
    const hp = this.hand.getWorldPosition(tmpV);
    // v0.23 (Tiffany: "When she is shoveling or raking make an animation of her doing it, not just
    // holding the tool"): while she works with it (`toolStroke`, from hero.js: the tool and where
    // in the stroke she is) the tool works the ground before her: the rake's head lies on the
    // ground and is drawn toward her feet, the shovel's blade goes into the earth and lifts it out.
    // Its foot is put where the stroke has it and its handle runs up through her fist.
    const st = this.toolStroke;
    if (st && st.kind === kind) {
      const yaw = v.rotation.y;
      const fx = Math.sin(yaw); const fz = Math.cos(yaw); // her forward
      const foot = tmpU.set(v.position.x + fx * st.reach - fz * st.side, v.position.y + st.lift, v.position.z + fz * st.reach + fx * st.side);
      const up = tmpW.copy(hp).sub(foot);
      if (up.lengthSq() > 1e-4) {
        up.normalize();
        // the rake's tines curl back toward her; the shovel's hollow faces away from her
        quat.setFromUnitVectors(Y_UP, up).multiply(tmpQ.setFromEuler(tmpE.set(0, yaw + (kind === 'rake' ? Math.PI : 0), 0)));
        pos.copy(foot);
        this.toolFoot = (this.toolFoot ?? new THREE.Vector3()).copy(foot);
        return pos;
      }
    }
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
    o.visible = true;
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

  // ---------- v0.16: the egg hunt (phase two) ----------
  // Each spot of the hunt (songs.js SPOTS) is a place on the farm; a spot with a song left in it
  // shows a sparkle over it. When she reaches one, a bird flies across and drops that spot's egg
  // near her (`eggDrop`); she picks it up (`popEgg`). Presentation only: main.js owns the hunt.
  eggSpotPos(id, out = new THREE.Vector3()) {
    const spec = SPOTS[id];
    const anchor = spec?.anchor ?? id;
    const offset = spec?.offset ?? [0, 0];
    const h = this.objects.D01;
    h.updateMatrixWorld(true);
    // v0.22: a spot out on open ground stands at its drawing point
    if (spec?.uv) return out.copy(this.ground(spec.uv[0], spec.uv[1])).setY(0);
    switch (anchor) {
      case 'door': { const [a, b] = this.doorPoints(); out.copy(a).lerp(b, 0.55).setY(0); break; }
      case 'chimney': out.copy(h.localToWorld(new THREE.Vector3(-2.9, 0, 0.9))).setY(0); break;
      // v0.22: before the front window, left of the door (hand.js cottage: the window at x -1.08)
      case 'window': out.copy(h.localToWorld(new THREE.Vector3(WINDOW_X, 0, G.HOUSE.d / 2 + 1.0))).setY(0); break;
      case 'bench': out.copy(this.stations.G2?.pos ?? this.ground(23, 72)).setY(0); break;
      // v0.22: a step from the trunk, on the viewer's side of it and away from the bench (it
      // stood out under the canopy's edge, three metres from the tree it is about)
      case 'tree': out.copy(this.objects.D09.position).add(new THREE.Vector3(-0.2, 0, 0.85)).setY(0); break;
      case 'tools': out.copy(this.stations.tools.pos).setY(0); break;
      // v0.22: the stone at the corn end of the line: she hops from it to the back of the house
      case 'stones': out.copy(this.hopRoute()[0]).setY(0); break;
      case 'bed': out.copy(this.stations.T0.pos).setY(0); break;
      case 'sunflowers': out.copy(this.stations.S0.pos).setY(0); break;
      case 'corn': out.copy(this.stations.C0.pos).setY(0); break;
      case 'table': this.sellSpot(out).setY(0); break;
      case 'pose': out.copy(this.ground(VANESSA_START.u, VANESSA_START.v)).setY(0); break; // D17, her place in the drawing
      // v0.20 (audit 2: "walking on the sky"): the sun's and the birds' stars stand on the farm's
      // own ground, at its back edge straight below the drawn sun and the drawn flock (SKY_SPOT_V;
      // v0.17 had them at v 33 and 34, beyond the ground's far edge, on the paper sky)
      case 'sun': out.copy(this.ground(SKY.D22.u, SKY_SPOT_V)).setY(0); break;
      case 'birds': out.copy(this.ground(SKY.D21.u + 3, SKY_SPOT_V)).setY(0); break;
      default: out.copy(this.heroPos() ?? new THREE.Vector3());
    }
    return out.add(new THREE.Vector3(offset[0], 0, offset[1]));
  }
  // how near a spot's centre she stands "at" it (the bed's is the Who-Knows plant, over its boards)
  spotReach(id) { return id === 'bed' ? 1.1 : 0.65; }
  // the stepping stones in the order she hops them: from the corn end of the line to the stone at
  // the back of the house (v0.22)
  hopRoute() {
    const line = this.steppingPlaces();
    const n = STEPPING.stones;
    return [...line.slice(0, n).reverse(), ...line.slice(n)].map((q) => q.clone().setY(0));
  }
  // when each hop lands, on the act's clock (ms): the sound of her feet on the stone
  hopTimes(ms) { return hopSpans(this.hopRoute().length).map(([, b]) => b * ms); }
  // Which way she turns for a spot's act (rad), or null to stay as she is: to the thing the act
  // is about, or to the viewer for the acts that are shown to the viewer.
  spotFacing(spot, hero, camera = this.camera) {
    const to = (p) => Math.atan2(p.x - hero.x, p.z - hero.z);
    const viewer = () => (camera ? Math.atan2(camera.position.x - hero.x, camera.position.z - hero.z) : 0);
    const h = this.objects.D01;
    switch (spot) {
      case 'sun': return to(this.objects.D22.position); // her back to the viewer, her arm up to it
      // a hand at her brow or her lips is seen from the front: she stands to the viewer, turned a
      // little toward the sun, or the birds, and looks up at them
      case 'glare': return viewer() + 0.55 * Math.sign(this.objects.D22.position.x - hero.x || 1);
      case 'birds': return viewer() + 0.55 * Math.sign(this.objects.D21.position.x - hero.x || 1);
      case 'tools': return to(this.tools.rake.home.pos);
      case 'weeds': return this.weedProp ? to(this.weedProp.position) : null;
      case 'tree': return to(this.objects.D09.position);
      case 'corn': return to(this.stations.c2?.pos ?? this.stations.C0.pos);
      case 'door': return to(h.localToWorld(new THREE.Vector3(0.55, 0, G.HOUSE.d / 2)));
      case 'window': return to(h.localToWorld(new THREE.Vector3(WINDOW_X, 0, G.HOUSE.d / 2)));
      case 'bed': { const p = this.whoKnowsPos(new THREE.Vector3()); return p ? to(p) : null; }
      case 'sketch': return this.sketchProp ? to(this.sketchProp.position) : null;
      // she stands side on to the sunflowers and leans toward them (her left)
      case 'between': return to(this.stations.s3?.pos ?? this.stations.S0.pos) - Math.PI / 2;
      case 'sunflowers': case 'world': case 'table': case 'pockets': case 'paper': case 'path': case 'field': case 'pose': case 'easel': case 'flipflops': return viewer();
      default: return null; // the bench, the chimney and the stones turn her themselves
    }
  }
  // What the act needs of the place, for hero.startMoment: the bench's seat, the climb's route,
  // the line of stones, the place a step away she moves to (the trunk, the glass).
  spotStage(spot, hero) {
    const h = this.objects.D01;
    switch (spot) {
      case 'bench': return { seat: this.benchSeat(), yaw: this.objects.D10.rotation.y };
      case 'chimney': return { route: this.chimneyRoute() };
      case 'stones': return { route: this.hopRoute() };
      case 'tree': {
        const trunk = this.objects.D09.position;
        const d = new THREE.Vector3(hero.x - trunk.x, 0, hero.z - trunk.z).normalize();
        return { to: trunk.clone().addScaledVector(d, TREE_TRUNK_R * this.objects.D09.scale.x + 0.3).setY(0) };
      }
      case 'window': return { to: h.localToWorld(new THREE.Vector3(WINDOW_X, 0, G.HOUSE.d / 2 + 0.46)).setY(0) };
      default: return {};
    }
  }
  // v0.23 (Tiffany: "When she builds the chimney have her clime onto the roof first"): her way for
  // the chimney's DIY: round the house's corner to the foot of its left wall, up the wall, over the
  // roof's ridge and down to a stand beside the chimney, which is on the right slope
  roofRoute() {
    const h = this.objects.D01;
    h.updateMatrixWorld(true);
    const at = (x, y, z) => h.localToWorld(new THREE.Vector3(x, y, z));
    const top = h.userData.chimneyTop;
    return [this.eggSpotPos('chimney'), at(-2.75, 0, G.HOUSE.d / 2 + 0.55), this.eggSpotPos('chimney'), at(-2.18, 1.2, 0.9), at(-2.18, 2.8, 0.9), at(-0.9, 3.8, 0.75), at(top.x - 0.62, top.y - 0.78, top.z + 0.12)];
  }
  // the chimney itself, for her to face and hammer at
  chimneyPoint(out = new THREE.Vector3()) { return out.copy(this.smoke.top).add(new THREE.Vector3(0, -0.5, 0)); }
  // ---------- v0.23 (design audit 8): one small ink moment as each house stage is built ----------
  // The foundation: two neighbours peek over it from behind, say "Ooh!" and are gone. The walls:
  // (main.js has Vanessa wave through where the window will be) a pencilled "Hello in there!".
  // The windows and doors: the door swings open and "Home!" is pencilled beside it. The roof: a
  // bird lands on the ridge and Dwight shoos it off. The chimney: its first puff curls into a
  // heart. Each is short, in ink, with no shake and no confetti; reduced motion keeps the words
  // and the heart, still. -> a Promise resolved when the moment is over.
  async houseMoment(stage) {
    const h = this.objects.D01;
    if (!h || this.finaleActive) return;
    h.updateMatrixWorld(true);
    const at = (x, y, z) => h.localToWorld(new THREE.Vector3(x, y, z));
    const still = this.reducedMotion();
    const front = G.HOUSE.d / 2;
    if (stage === 'H1') {
      const who = [this.sale.buyers[3], this.sale.buyers[10]].filter((b) => b && !b.visible);
      if (this.sale.active || who.length < 2 || still) { await this.inkWord('Ooh!', at(0.4, 1.5, -front - 0.4), { h: 0.5, ms: 1500, rise: 0.4 }); return; }
      const xs = [-0.75, 0.55];
      who.forEach((b, i) => { b.position.copy(at(xs[i], 0, -front - 0.55)); b.rotation.y = h.rotation.y + (i ? -0.25 : 0.2); b.visible = true; setOpacity(b, 1); for (const nm of ['legL', 'legR', 'armL', 'armR']) b.getObjectByName(nm).rotation.x = 0; });
      const low = -1.25; const up = -0.62; // head and shoulders over the foundation's far edge
      await this.tweens.run(420, (t) => who.forEach((b, i) => { b.position.y = low + (up - low) * ease.outBack(Math.max(0, Math.min(1, t * 1.15 - i * 0.15))); }));
      this.inkWord('Ooh!', at(-0.1, 1.15, -front - 0.55), { h: 0.46, ms: 1300, rise: 0.35 });
      await this.tweens.run(1100, (t) => who.forEach((b, i) => { b.rotation.z = 0.09 * Math.sin(t * Math.PI * 2 + i * 1.7); }));
      await this.tweens.run(320, (t) => who.forEach((b) => { b.position.y = up + (low - up) * t * t; }));
      who.forEach((b) => { b.visible = false; b.position.y = 0; b.rotation.z = 0; });
    } else if (stage === 'H2') {
      await this.inkWord('Hello in there!', at(WINDOW_X, 2.55, front + 0.3), { h: 0.42, ms: 1900, rise: 0.35 });
    } else if (stage === 'H5') {
      const door = h.getObjectByName('D01_House_Door');
      const word = this.inkWord('Home!', at(1.75, 1.75, front + 0.35), { h: 0.6, ms: 2300, rise: 0.4 });
      if (door && !still) {
        await this.tweens.run(520, (t) => { door.rotation.y = -1.75 * ease.outBack(t); });
        await this.tweens.wait(900);
        await this.tweens.run(620, (t) => { door.rotation.y = -1.75 * (1 - ease.inOut(t)); });
        door.rotation.y = 0;
      }
      await word;
    } else if (stage === 'H3') {
      const ridge = at(-0.2, G.HOUSE.plinth + G.HOUSE.wall + G.HOUSE.roof + 0.2, 0.9);
      if (still) { await this.inkWord('Shoo!', ridge.clone().add(new THREE.Vector3(0, 0.5, 0)), { h: 0.42, ms: 1400 }); return; }
      const bird = this.eggBird ??= (() => { const b = G.flyingBird(); b.scale.setScalar(EGG.birdSize); this.root.add(b); return b; })();
      const wl = bird.getObjectByName('wingL'); const wr = bird.getObjectByName('wingR');
      const from = ridge.clone().add(new THREE.Vector3(-6, 4.5, -3));
      const away = ridge.clone().add(new THREE.Vector3(7, 5, -4));
      const flap = (t, amp) => { const f = Math.sin(t / 60); wl.rotation.z = -amp * f; wr.rotation.z = amp * f; };
      bird.visible = true;
      let clock = 0;
      await this.tweens.run(900, (t) => { clock = t * 900; bird.position.lerpVectors(from, ridge, ease.inOut(t)); bird.rotation.set(0, Math.atan2(ridge.x - from.x, ridge.z - from.z), 0); flap(clock, 0.7 * (1 - t * 0.6)); });
      wl.rotation.z = 0; wr.rotation.z = 0;
      const a = this.archer;
      if (a?.root.visible && a.mode === 'post') this.archerDraw('A1', { x: ridge.x, z: ridge.z }, 900);
      await this.tweens.run(1000, (t) => { bird.position.copy(ridge).setY(ridge.y + Math.abs(Math.sin(t * Math.PI * 4)) * 0.05); bird.rotation.y += 0.01; });
      this.inkWord('Shoo!', a?.root.visible ? this.archerHead(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0)) : ridge.clone().add(new THREE.Vector3(0, 0.6, 0)), { h: 0.42, ms: 1200, rise: 0.3 });
      this.puff(ridge.clone(), { scale: 0.45 });
      await this.tweens.run(900, (t) => { clock += 16; bird.position.lerpVectors(ridge, away, ease.inOut(t)); bird.rotation.set(0, Math.atan2(away.x - ridge.x, away.z - ridge.z), 0); flap(t * 900, 0.85); });
      bird.visible = false;
    } else if (stage === 'H4') {
      const top = this.smoke.top.clone();
      await this.inkWord('♥', top.clone().add(new THREE.Vector3(0.1, 0.35, 0)), { h: 1.0, ms: 2100, rise: 1.5, colour: '#d33a2c' });
    }
  }
  chimneyRoute() {
    const h = this.objects.D01;
    const at = (x, y, z) => h.localToWorld(new THREE.Vector3(x, y, z));
    // Hands and feet work up the outside wall, then along the roof to the chimney.
    return [this.eggSpotPos('chimney'), at(-2.18, 1.2, 0.9), at(-2.18, 2.8, 0.9), at(-0.9, 3.8, 0.75), this.smoke.top.clone().add(new THREE.Vector3(-0.35, -0.25, 0.1))];
  }
  bedHeight(at) {
    this.bed.updateMatrixWorld(true);
    const p = this.bed.worldToLocal(at.clone());
    return Math.abs(p.x) < 1.13 && Math.abs(p.z) < 0.49 ? this.bed.scale.y * 0.37 : 0;
  }
  standPoint(id, out = new THREE.Vector3()) {
    // v0.23: with crops to set out, the place in front of the table that has room ("she should go
    // to and drop them off in front of what ever table is empty"); for a sale, behind the first
    if (id === 'table') {
      const l = this.lastLedger;
      const k = l && !saleReady(l) ? fillTable(l) : null;
      const st = k === null ? null : this.tableStations()[k];
      return st ? out.copy(st.pos).add(new THREE.Vector3(0, 0, TABLE_FRONT_M)).setY(0) : this.sellSpot(out).setY(0);
    }
    const st = this.stations[id];
    if (!st) return null;
    out.copy(st.pos).setY(0);
    if (st.def.bed || ['t1', 't2'].includes(id)) out.y = this.bed.scale.y * 0.37;
    return out;
  }
  updateStandMarker(mark, at, dtMs, ready = false, { chimney = false } = {}) {
    mark.position.copy(at);
    mark.userData.correct = ready;
    mark.userData.t = (mark.userData.t ?? 0) + (this.reducedMotion() ? 0 : dtMs);
    const t = mark.userData.t;
    mark.getObjectByName('standCircle').scale.setScalar(ready ? 1.18 : 1);
    const star = mark.getObjectByName('standStar');
    star.position.set(0, 0.8, 0);
    if (chimney) star.position.copy(this.smoke.top).sub(at).add(new THREE.Vector3(0, 0.35, 0));
    if (this.camera) star.quaternion.copy(this.camera.quaternion);
    star.scale.setScalar(ready ? 1.95 : 1.5);
    const sparks = mark.getObjectByName('standSparks');
    sparks.visible = ready;
    sparks.rotation.y = t / 1100;
    for (const [i, sp] of sparks.children.entries()) {
      if (this.camera) sp.quaternion.copy(this.camera.quaternion);
      sp.scale.setScalar(0.35 + 0.16 * Math.sin(t / 150 + i));
    }
    mark.getObjectByName('standDisc').material.opacity = ready ? 0.3 : 0.12;
  }
  // v0.23 ("Actions should be in a different color than songs and collecting crops. Maybe red for
  // actions?"): a place in `acts` is marked for an action (the bench's stain: Clean the bench), and
  // its circle is the actions' red one, kept apart from the guide's yellow one for the same place.
  updateGoalMarkers(ids, dtMs, acts = []) {
    this.goalMarkers ??= {};
    const hero = this.heroPos();
    const want = ids.map((id) => (acts.includes(id) ? `act:${id}` : id));
    for (const key of new Set([...Object.keys(this.goalMarkers), ...want])) {
      const act = key.startsWith('act:');
      const id = act ? key.slice(4) : key;
      let mark = this.goalMarkers[key];
      if (!mark) { mark = this.goalMarkers[key] = act ? G.standMarker(G.ACTION_RED) : G.standMarker(); this.root.add(mark); }
      mark.visible = want.includes(key) && !this.finaleActive && !this.playHidden;
      if (!mark.visible) continue;
      const at = this.standPoint(id);
      if (!at) { mark.visible = false; continue; }
      this.updateStandMarker(mark, at, dtMs, hero && Math.hypot(at.x - hero.x, at.z - hero.z) <= 0.65);
    }
  }
  // v0.22 (Tiffany: "The circles should be the actions that you perform to get the Easter egg
  // song"): every spot in `spots` (those with a song left) shows its yellow circle on the ground
  // and its star over it, from anywhere; the circle grows and sparkles when she stands in it. They
  // come and go in a breath. (v0.21 hid the stars until she came near; that is gone.) The two
  // things the acts are about that the farm did not have, the weeds by the bed and the crumpled
  // sketch, lie at their spots while their song waits.
  updateEggSpots(spots, dtMs) {
    this.eggSparkles ??= {};
    const hero = this.heroPos();
    const still = this.reducedMotion();
    const shown = !this.finaleActive && !this.playHidden;
    for (const id of new Set([...Object.keys(this.eggSparkles), ...spots])) {
      let sp = this.eggSparkles[id];
      // v0.23: an action's circle is red (the yellow ones are the guide's and the songs')
      if (!sp) { sp = this.eggSparkles[id] = G.standMarker(G.ACTION_RED); sp.userData.in = 0; this.root.add(sp); }
      const on = shown && spots.includes(id);
      sp.userData.in = Math.max(0, Math.min(1, (sp.userData.in ?? 0) + (on ? 1 : -1) * (still ? 1 : dtMs / 320)));
      sp.visible = shown && sp.userData.in > 0;
      if (!sp.visible) { if (!shown) sp.userData.in = 0; continue; }
      const at = this.eggSpotPos(id);
      if (id === 'bed') at.y = this.bedHeight(at); // on the bed's soil, where she steps up
      const ready = !!hero && Math.hypot(at.x - hero.x, at.z - hero.z) <= this.spotReach(id);
      this.updateStandMarker(sp, at, dtMs, ready, { chimney: id === 'chimney' });
      const k = ease.out(sp.userData.in);
      // with a circle at every song the stars are small until she stands in one (two dozen big
      // stars crowded the farm); the circle is the mark
      sp.getObjectByName('standStar').scale.multiplyScalar(Math.max(0.01, k) * (ready ? 1 : SPOT_STAR));
      sp.getObjectByName('standCircle').scale.multiplyScalar(Math.max(0.01, k));
    }
  }
  // the hunt's own things on the ground (main.js: `spots` are the spots with a song left; `out`
  // false outside the hunt): the weed clump of "Weeds Elite" and the crumpled sketch of "Don't You
  // Worry"
  updateSpotProps(spots, out) {
    if (!this.weedProp) {
      const w = G.weed(); w.name = 'HuntWeeds';
      const at = this.eggSpotPos('weeds').add(new THREE.Vector3(0.75, 0, -0.1));
      w.position.copy(at); w.scale.setScalar(1.25);
      const w2 = G.weed(); w2.position.set(0.32, 0, 0.18); w2.rotation.y = 1.9; w2.scale.setScalar(0.8); w.add(w2);
      this.root.add(w); this.weedProp = w;
      const s = G.crumpledSketch(); s.name = 'HuntSketch';
      s.position.copy(this.eggSpotPos('sketch').add(new THREE.Vector3(0.42, 0, 0.2)));
      this.root.add(s); this.sketchProp = s;
    }
    const show = out && !this.finaleActive && !this.playHidden;
    this.weedProp.visible = show && spots.includes('weeds');
    if (!this.sketchProp.userData.taken) this.sketchProp.visible = show && spots.includes('sketch');
  }
  // is a spot's circle and star in view now (checks)
  eggSpotLook(id) { return this.eggSparkles?.[id]?.visible ? 'star' : null; }
  // v0.23 (Tiffany: "Have all the keepsakes icons not circles and the songs all circles"): the song
  // itself, the egg the bird has dropped, lies in a yellow circle that breathes a little, so it is
  // seen without an arrow. `egg`: the egg on the grass, or null.
  updateEggCircle(egg, dtMs) {
    if (!this.eggCircle) { this.eggCircle = G.standMarker(PAL.flower, { star: false }); this.eggCircle.visible = false; this.root.add(this.eggCircle); }
    const m = this.eggCircle;
    const on = !!egg && egg.visible && !this.finaleActive && !this.playHidden;
    m.visible = on;
    if (!on) { m.userData.t = 0; return; }
    m.userData.t = (m.userData.t ?? 0) + dtMs;
    const hero = this.heroPos();
    const at = egg.position.clone().setY(0);
    this.updateStandMarker(m, at, dtMs, !!hero && Math.hypot(at.x - hero.x, at.z - hero.z) <= 1.1);
    const k = ease.out(Math.min(1, m.userData.t / 320)) * (this.reducedMotion() ? 1 : 1 + 0.06 * Math.sin(m.userData.t / 260));
    m.getObjectByName('standCircle').scale.multiplyScalar(Math.max(0.01, k * 1.25));
    m.getObjectByName('standDisc').scale.setScalar(1.25);
  }
  hideMarkers() {
    this.marker.obj.visible = false;
    for (const m of [...Object.values(this.eggSparkles ?? {}), ...Object.values(this.goalMarkers ?? {})]) m.visible = false;
    if (this.eggCircle) this.eggCircle.visible = false;
    if (this.nuisance) this.nuisance.bird.visible = false;
    for (const k of Object.values(this.keepsakes ?? {})) k.obj.visible = false;
    if (this.weedProp) { this.weedProp.visible = false; this.sketchProp.visible = false; }
    if (this.airLine) this.airLine.visible = false;
    for (const sp of this.inkWords ?? []) sp.visible = false;
  }
  // a bird flies across the screen over `at` and drops an egg there. -> Promise of the egg (a
  // world object at `at`), resolved when it has landed. Reduced motion: no flight, the egg fades
  // in where it lands.
  async eggDrop(at, seed = 0) {
    const egg = G.easterEgg(seed);
    egg.position.copy(at).setY(0);
    egg.scale.setScalar(EGG.size);
    this.root.add(egg);
    this.eggs ??= new Set();
    this.eggs.add(egg);
    if (this.reducedMotion()) {
      const mats = fadeable(egg);
      await this.tweens.run(250, (t) => mats.forEach((m) => { m.opacity = t; }));
      restoreMaterials(egg);
      return egg;
    }
    egg.visible = false;
    const bird = this.eggBird ??= (() => { const b = G.flyingBird(); b.scale.setScalar(EGG.birdSize); this.root.add(b); return b; })();
    const side = seed % 2 ? 1 : -1; // from the left or the right, in turn
    const a = at.clone().add(new THREE.Vector3(-side * EGG.cross, EGG.high, -1.2));
    const b = at.clone().add(new THREE.Vector3(side * EGG.cross, EGG.high + 0.6, -1.6));
    bird.visible = true;
    bird.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0);
    const wl = bird.getObjectByName('wingL'); const wr = bird.getObjectByName('wingR');
    let dropped = null;
    const flight = this.tweens.run(EGG.flyMs, (u) => {
      bird.position.lerpVectors(a, b, u);
      bird.position.y -= Math.sin(Math.PI * u) * (EGG.high - EGG.dropAt); // swoops low over her
      const flap = Math.sin(u * EGG.flyMs / 70);
      wl.rotation.z = -0.6 * flap; wr.rotation.z = 0.6 * flap;
      bird.rotation.z = 0.12 * Math.sin(u * Math.PI * 2);
      if (!dropped && u >= 0.5) {
        const from = bird.position.clone().add(new THREE.Vector3(0, -0.1, 0));
        egg.visible = true;
        egg.position.copy(from);
        this.onEggDrop?.();
        dropped = this.tweens.run(EGG.fallMs, (t) => {
          egg.position.lerpVectors(from, at, t).setY(Math.max(0, from.y * (1 - t * t)));
          egg.rotation.x = t * 3;
        }).then(() => this.tweens.run(260, (t) => { egg.position.copy(at).setY(Math.sin(Math.PI * t) * 0.12); egg.rotation.x = 3 + t * 0.6; }))
          .then(() => { egg.position.copy(at).setY(0); egg.rotation.x = 0; this.puff(at.clone().setY(0.1), { scale: 0.45 }); this.onEggLand?.(); });
      }
    }).then(() => { bird.visible = false; });
    while (!dropped) await this.tweens.wait(50);
    await dropped;
    flight.then(() => {});
    return egg;
  }
  // she picks it up: it hops, cracks into a pop of dust and is gone
  async popEgg(egg) {
    if (!egg) return;
    if (!this.reducedMotion()) {
      const k = egg.scale.x;
      const y0 = egg.position.y;
      await this.tweens.run(260, (t) => { egg.position.y = y0 + Math.sin(Math.PI * t) * 0.35; egg.scale.setScalar(k * (1 + 0.35 * t)); });
      this.puff(egg.position.clone().setY(0.3), { scale: 0.6 });
    }
    this.root.remove(egg);
    this.eggs?.delete(egg);
  }
  // load, New farm, the finale: no egg on show
  clearEggs() {
    for (const e of this.eggs ?? []) this.root.remove(e);
    this.eggs?.clear();
    if (this.eggBird) this.eggBird.visible = false;
  }

  // ---------- the one hired archer (A1) ----------
  // Each stands at his post once hired (popping in with a puff of dust), keeps watch on the sky,
  // turns after the birds and now and then raises his bow to aim. v0.17 (spec §7, A09): when a
  // bird comes into his cover he turns to it and draws (`archerDraw`), then looses a blunt warning
  // arrow into the empty ground beside it (`archerShoot`). Away for the finale's drawing, back
  // after it. Presentation only. `this.archer` stays the first archer (A1).
  buildArcher() {
    for (const a of Object.values(this.archers ?? {})) this.root.remove(a.root);
    this.archers = {};
    for (const [id, make, height, model] of [['A1', G.archer, ARCHER.height, 1.88]]) {
      const post = this.stations[id]?.pos;
      if (!post) continue;
      const root = make();
      root.scale.setScalar(height / model);
      root.position.copy(post).add(new THREE.Vector3(0.35, 0, 0.15));
      root.visible = false;
      this.root.add(root);
      this.archers[id] = {
        id, root, height, t: 0, shown: false, hidden: false, aim: null, arms: root.getObjectByName('arms'), head: root.getObjectByName('head'), body: root.getObjectByName('body'),
        // v0.23: his post (where his cover is measured from), his legs, and what he is up to:
        // 'post' (on watch, with a few steps now and then), 'walk' (on his way somewhere: off the
        // picture before the final image, or to the bench), 'gone' (out of the picture), 'seated'
        post: root.position.clone(), legL: root.getObjectByName('legL'), legR: root.getObjectByName('legR'), sit: root.getObjectByName('sit'),
        scale: height / model, mode: 'post', walk: null, stroll: { at: 0, to: null, from: null, t: 0, ms: 0, rest: ARCHER_STROLL.firstMs }, stride: 0,
      };
    }
    this.archer = this.archers.A1;
    this.arrows = [];
  }
  syncArcher(l, animate) {
    for (const a of Object.values(this.archers ?? {})) {
      // (v0.23: he walks off the picture before the final image, so the finale's hiding of the play
      // things leaves him be while he is on his way, and he is away once he is out of it)
      const leaving = a.mode === 'walk' && a.walk?.then === 'gone';
      const want = isCommitted(l, a.id) && a.mode !== 'gone' && (leaving || (!a.hidden && !this.playHidden));
      if (want === a.shown && a.root.visible === want) continue;
      a.shown = want;
      a.root.visible = want;
      if (want && animate && !this.reducedMotion()) {
        const p = a.root.position;
        for (let i = 0; i < 5; i++) { const ang = (i / 5) * Math.PI * 2; this.puff(new THREE.Vector3(p.x + Math.cos(ang) * 0.4, 0.15, p.z + Math.sin(ang) * 0.3), { scale: 0.8, delay: i * 40, seed: i }); }
        const k = a.root.scale.x;
        a.root.scale.setScalar(0.01);
        this.tweens.wait(120).then(() => this.tweens.run(380, (t) => a.root.scale.setScalar(k * Math.max(0.01, ease.outBack(t))))).then(() => a.root.scale.setScalar(k));
      }
    }
  }
  // where each hired archer's cover is measured from (his post), for the birds (game/birds.js)
  archerPosts(l) {
    // (v0.23: his post, not where his few steps have taken him; none once he sits on the bench)
    return Object.values(this.archers ?? {}).filter((a) => isCommitted(l, a.id) && a.mode === 'post').map((a) => ({ id: a.id, pos: { x: a.post.x, z: a.post.z } }));
  }
  // ---------- v0.23: Dwight moves ----------
  // Tiffany: "Have Dwight walking around just a little. He is too stiff. Not too distracting
  // though": on watch he takes a few slow steps to a place close by every ARCHER_STROLL.everyMs or
  // so, stands, and comes back the next time, his legs walking and his body bobbing a little; when
  // a bird comes he stops and turns to it. "If Dwight doesn't already walk off the screen before
  // the final image appears, have him do that. Not just disappear": `archerLeave` walks him off the
  // right side of the picture as the finale starts. "In the end let Dwight go sit down on the
  // bench": `archerToBench` walks him to the bench, where he sits, his crossbow on his knees
  // (`instant`: he is there already, as on a finished farm that loads).
  archerWalk(a, points, { speed = ARCHER_WALK.speed, then = 'post' } = {}) {
    const pts = points.map((q) => q.clone().setY(0));
    const legs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); legs.push(d); total += d; }
    a.walk = { pts, legs, total, d: 0, speed, then };
    a.mode = 'walk';
    this.archerSit(a, false);
  }
  archerSit(a, on) {
    if (a.sit) a.sit.visible = on;
    for (const leg of [a.legL, a.legR]) if (leg) { leg.visible = !on; leg.rotation.x = 0; }
    a.root.position.y = 0;
    if (a.body) a.body.position.y = 0;
  }
  // the finale: off the right side of the picture, round the sunflowers
  archerLeave(id = 'A1') {
    const a = this.archers?.[id];
    if (!a || !a.root.visible || a.mode === 'gone') return;
    if (this.reducedMotion()) { a.mode = 'gone'; a.root.visible = false; a.shown = false; return; }
    const from = a.root.position.clone();
    const out = this.ground(ARCHER_WALK.off[0], ARCHER_WALK.off[1]);
    const via = a.mode === 'seated' || from.x < this.ground(45, 70).x ? [this.ground(40, 86), this.ground(70, 96)] : [this.ground(76, 76.5)];
    a.aim = null;
    this.archerWalk(a, [from, ...via, out], { speed: ARCHER_WALK.leave, then: 'gone' });
  }
  // where he sits: the bench's right end as it faces the path (Vanessa's seat moves to the other)
  archerSeatPos(out = new THREE.Vector3()) {
    const b = this.objects.D10;
    b.updateMatrixWorld(true);
    return out.copy(b.localToWorld(new THREE.Vector3(ARCHER_WALK.seatX, 0.46, 0.02)));
  }
  archerSeated(id = 'A1') { return this.archers?.[id]?.mode === 'seated'; }
  archerToBench(id = 'A1', { instant = false } = {}) {
    const a = this.archers?.[id];
    if (!a || !this.lastLedger || !isCommitted(this.lastLedger, a.id) || !isCommitted(this.lastLedger, 'G2')) return;
    // (v0.25: `instant` seats him even while he is on his way there: the sunset's scene opens with him seated)
    if (a.mode === 'seated' || (a.mode === 'walk' && a.walk?.then === 'seated' && !instant)) return;
    const seat = this.archerSeatPos();
    const sit = () => {
      a.mode = 'seated'; a.walk = null; a.aim = null;
      a.root.position.set(seat.x, seat.y - (a.root.userData.hipY ?? 0.91) * a.scale + 0.03, seat.z);
      a.root.rotation.y = this.objects.D10.rotation.y;
      this.archerSit(a, true);
      a.root.position.y = seat.y - (a.root.userData.hipY ?? 0.91) * a.scale + 0.03;
    };
    if (instant || this.reducedMotion()) { sit(); return; }
    // from where he is (or, if he walked out of the picture, back in from there): along the grass
    // below the tables to the path's last bend, in through the ring's gap, and onto the bench
    const from = a.mode === 'gone' ? this.ground(ARCHER_WALK.off[0], ARCHER_WALK.off[1]) : a.root.position.clone();
    if (a.mode === 'gone') a.root.position.copy(from);
    const front = this.stations.G2.pos.clone();
    const via = from.x > this.ground(80, 76).x ? [this.ground(76, 76.5)] : [];
    this.archerWalk(a, [from, ...via, this.ground(44, 75), this.ground(31, 76.5), this.ground(25.5, 78), front, seat.clone().setY(0)], { then: 'seated' });
    a.walk.sit = sit;
    a.root.visible = !this.playHidden && !this.finaleActive;
    a.shown = a.root.visible;
  }
  // back on watch at his post (a new farm, or a save that is not finished)
  archerReset(id = 'A1') {
    const a = this.archers?.[id];
    if (!a) return;
    a.mode = 'post'; a.walk = null; a.aim = null;
    a.root.position.copy(a.post);
    Object.assign(a.stroll, { to: null, from: null, t: 0, ms: 0, rest: ARCHER_STROLL.firstMs, at: 0 });
    this.archerSit(a, false);
  }
  // his walk and his few steps, per frame; -> whether he is walking now
  stepArcher(a, dtMs) {
    const still = this.reducedMotion();
    if (a.mode === 'walk' && a.walk) {
      const w = a.walk;
      w.d = Math.min(w.total, w.d + (w.speed * dtMs) / 1000);
      let left = w.d; let i = 0;
      while (i < w.legs.length - 1 && left > w.legs[i]) { left -= w.legs[i]; i++; }
      const p = w.pts[i]; const q = w.pts[i + 1] ?? p;
      const k = w.legs[i] > 1e-6 ? Math.min(1, left / w.legs[i]) : 1;
      a.root.position.lerpVectors(p, q, k).setY(0);
      const want = Math.atan2(q.x - p.x, q.z - p.z);
      const d = Math.atan2(Math.sin(want - a.root.rotation.y), Math.cos(want - a.root.rotation.y));
      a.root.rotation.y += d * Math.min(1, dtMs / 140);
      a.stride += (w.speed * dtMs) / 1000 / ARCHER_WALK.stride;
      if (w.d >= w.total) {
        const then = w.then;
        a.walk = null;
        if (then === 'gone') { a.mode = 'gone'; a.root.visible = false; a.shown = false; } else if (then === 'seated') w.sit?.(); else a.mode = 'post';
        return false;
      }
      return true;
    }
    if (a.mode !== 'post' || still || a.aim) { if (a.aim && a.stroll.to) { a.stroll.to = null; a.stroll.rest = ARCHER_STROLL.everyMs; } return false; }
    // a few slow steps to a place close by, then a long stand
    const st = a.stroll;
    if (!st.to) {
      st.rest -= dtMs;
      if (st.rest > 0) return false;
      if (a.t % ARCHER_AIM.everyMs < ARCHER_AIM.holdMs + 500) return false; // not while his crossbow is up
      const spot = ARCHER_STROLL.spots[st.at % ARCHER_STROLL.spots.length];
      st.at += 1;
      st.from = a.root.position.clone();
      st.to = a.post.clone().add(new THREE.Vector3(spot[0], 0, spot[1]));
      st.ms = (st.from.distanceTo(st.to) / ARCHER_STROLL.speed) * 1000;
      st.t = 0;
      if (st.ms < 60) { st.to = null; st.rest = ARCHER_STROLL.everyMs; return false; }
    }
    st.t += dtMs;
    const k = Math.min(1, st.t / st.ms);
    a.root.position.lerpVectors(st.from, st.to, k).setY(0);
    a.stride += (ARCHER_STROLL.speed * dtMs) / 1000 / ARCHER_WALK.stride;
    a.strollYaw = Math.atan2(st.to.x - st.from.x, st.to.z - st.from.z);
    if (k >= 1) { st.to = null; st.rest = ARCHER_STROLL.everyMs; a.strollYaw = undefined; return false; }
    return true;
  }
  // per frame: he watches the sky's birds (yaw toward the flock, the head following a little
  // more), and every ARCHER_AIM.everyMs raises his bow for a moment; drawing at a bird he turns
  // to it and holds the bow up
  updateArcher(dtMs) {
    const sky = this.objects.D21?.position;
    const still = this.reducedMotion();
    for (const a of Object.values(this.archers ?? {})) {
      if (!a.root.visible) { if (a.mode === 'walk' && a.walk && (this.playHidden || this.finaleActive) && a.walk.then !== 'gone') continue; if (a.mode !== 'walk') continue; }
      if (!still) a.t += dtMs;
      // v0.23: his legs walk while he moves, and his body bobs with the steps
      const walking = this.stepArcher(a, dtMs);
      const swing = walking ? Math.sin(a.stride * Math.PI * 2) : 0;
      if (a.legL && a.legL.visible) { a.legL.rotation.x += (swing * ARCHER_WALK.swing - a.legL.rotation.x) * Math.min(1, dtMs / 90); a.legR.rotation.x += (-swing * ARCHER_WALK.swing - a.legR.rotation.x) * Math.min(1, dtMs / 90); }
      if (a.mode !== 'seated') a.root.position.y = walking ? Math.abs(Math.cos(a.stride * Math.PI * 2)) * 0.022 : 0;
      if (a.mode === 'walk' || a.mode === 'gone') { if (a.arms) { a.arms.rotation.x = 0.05 * swing; a.arms.position.y = 1.45; } if (a.head) a.head.rotation.set(0, 0, 0); continue; }
      if (a.mode === 'seated') {
        // on the bench: his crossbow on his knees, looking about, in no hurry
        a.root.rotation.y = this.objects.D10.rotation.y;
        if (a.arms) { a.arms.rotation.x = 0.42; a.arms.position.y = 1.36; }
        if (a.head) a.head.rotation.set(still ? 0 : 0.04 * Math.sin(a.t / 2100), still ? 0 : 0.5 * Math.sin(a.t / 3100), 0);
        continue;
      }
      const p = a.root.position;
      let yaw; let up;
      if (walking && a.strollYaw !== undefined) {
        const d = Math.atan2(Math.sin(a.strollYaw - a.root.rotation.y), Math.cos(a.strollYaw - a.root.rotation.y));
        a.root.rotation.y += d * Math.min(1, dtMs / 220);
        if (a.head) a.head.rotation.set(0, 0.2 * Math.sin(a.t / 1700 + 1), 0);
        if (a.arms) { a.arms.rotation.x += (0 - a.arms.rotation.x) * Math.min(1, dtMs / 160); a.arms.position.y += (1.45 - a.arms.position.y) * Math.min(1, dtMs / 160); }
        continue;
      }
      if (a.aim) {
        a.aim.t += dtMs;
        const want = Math.atan2(a.aim.x - p.x, a.aim.z - p.z);
        const d = Math.atan2(Math.sin(want - a.root.rotation.y), Math.cos(want - a.root.rotation.y));
        yaw = still ? want : a.root.rotation.y + d * Math.min(1, dtMs / 120);
        up = 1;
        if (a.aim.t > a.aim.ms) a.aim = null;
      } else {
        const base = sky ? Math.atan2(sky.x - p.x, sky.z - p.z) : Math.PI;
        // he faces the camera side mostly, turning toward the flock by half (eased, so he turns
        // back smoothly from a few steps: v0.23)
        const rest = still ? 0.4 : 0.35 + 0.35 * Math.sin(a.t / 2300) + 0.25 * Math.sin(base);
        const d = Math.atan2(Math.sin(rest - a.root.rotation.y), Math.cos(rest - a.root.rotation.y));
        yaw = still ? rest : a.root.rotation.y + d * Math.min(1, dtMs / 260);
        const cyc = a.t % ARCHER_AIM.everyMs;
        up = still ? 0 : cyc < ARCHER_AIM.holdMs ? Math.min(1, 1.6 * Math.sin((cyc / ARCHER_AIM.holdMs) * Math.PI)) : 0;
      }
      a.root.rotation.y = yaw;
      if (a.head) a.head.rotation.y = still || a.aim ? 0 : 0.25 * Math.sin(a.t / 1700 + 1);
      const armY = 1.45;
      if (a.arms) { a.arms.rotation.x = -0.9 * up; a.arms.position.y = armY + 0.1 * up; }
      if (a.head) a.head.rotation.x = -0.25 * up;
    }
    this.updateArrows(dtMs);
  }
  // where his speech bubble goes (above his head)
  archerHead(out = new THREE.Vector3(), id = 'A1') {
    const a = this.archers?.[id] ?? this.archer;
    return out.copy(a.root.position).setY(a.height + 0.35);
  }
  // v0.17: he turns to the bird and draws for `ms`
  archerDraw(id, at, ms) {
    const a = this.archers?.[id];
    if (a?.root.visible) a.aim = { x: at.x, z: at.z, t: 0, ms: ms + 500 };
  }
  // v0.17: the blunt warning arrow, from his bow into the empty ground at `at` (a short arc, then
  // it stands in the ground a moment and fades). -> Promise, resolved when it lands
  archerShoot(id, at) {
    const a = this.archers?.[id];
    if (!a?.root.visible) return Promise.resolve();
    const from = a.root.position.clone().setY(a.height * 0.82);
    const to = new THREE.Vector3(at.x, 0.12, at.z);
    const arrow = G.warningArrow();
    this.root.add(arrow);
    const rec = { arrow, t: 0, life: 1800 };
    this.arrows.push(rec);
    if (this.reducedMotion()) { arrow.position.copy(to); arrow.rotation.set(-0.9, Math.atan2(to.x - from.x, to.z - from.z), 0); return Promise.resolve(); }
    rec.life = Infinity;
    const lift = 0.6 + from.distanceTo(to) * 0.12;
    const prev = new THREE.Vector3();
    return this.tweens.run(420, (t) => {
      prev.copy(arrow.position);
      arrow.position.lerpVectors(from, to, t);
      arrow.position.y += Math.sin(Math.PI * t) * lift;
      if (t > 0) arrow.lookAt(arrow.position.clone().add(arrow.position.clone().sub(prev)));
    }).then(() => { arrow.position.copy(to); this.puff(to.clone().setY(0.05), { scale: 0.35 }); rec.life = 1500; rec.t = 0; });
  }
  updateArrows(dtMs) {
    for (const rec of [...(this.arrows ?? [])]) {
      if (!Number.isFinite(rec.life)) continue;
      rec.t += dtMs;
      if (rec.t > rec.life) { this.root.remove(rec.arrow); this.arrows.splice(this.arrows.indexOf(rec), 1); }
    }
  }

  // ---------- v0.17: the birds that come for the crops (spec §7; game/birds.js decides) ----------
  // One nuisance bird, the egg bird's kind drawn smaller. Per frame `updateBird` places it from the
  // director's state: in from the sky, circling its target while the warning shows, down onto the
  // plant or the bench (or after her), sitting, then off and away, with the crop it took in its
  // beak. Presentation only.
  nodeTop(id, out = new THREE.Vector3()) {
    const st = this.stations[id];
    if (!st) return null;
    const box = new THREE.Box3().setFromObject(st.obj);
    const top = Number.isFinite(box.max.y) ? box.max.y : 1;
    return out.copy(st.pos).setY(Math.min(2.6, top) + 0.05);
  }
  benchSeat(out = new THREE.Vector3()) {
    const b = this.objects.D10;
    b.updateMatrixWorld(true);
    // (v0.23: with Dwight on the bench's one end, she sits at the other)
    return out.copy(b.localToWorld(new THREE.Vector3(this.archerSeated() || this.archer?.walk?.then === 'seated' ? -ARCHER_WALK.seatX : 0, 0.46, 0)));
  }
  buildBird() {
    const bird = G.flyingBird();
    bird.scale.setScalar(THIEF.size); // v0.22: big enough to see what it is up to (it was 1.5)
    bird.visible = false;
    bird.name = 'NuisanceBird';
    this.root.add(bird);
    this.nuisance = { bird, wl: bird.getObjectByName('wingL'), wr: bird.getObjectByName('wingR'), feet: bird.getObjectByName('feet'), t: 0, from: new THREE.Vector3(), leaveFrom: null, carry: null, phase: 'idle' };
  }
  // s: the director's state; at: the target point (top of the plant, the bench seat, over her head)
  updateBird(dtMs, s, at) {
    if (!this.nuisance) this.buildBird();
    const n = this.nuisance;
    const { bird } = n;
    const still = this.reducedMotion();
    n.t += dtMs;
    if (!s || s.phase === 'idle' || this.playHidden || this.finaleActive) {
      bird.visible = false; n.phase = 'idle';
      if (n.carry) { bird.remove(n.carry); n.carry = null; }
      n.feet?.scale.setScalar(0.01);
      return;
    }
    // its feet come down as it lands and while it carries (v0.23)
    if (n.feet) {
      const down = n.carry || s.phase === 'sit' || (s.phase === 'approach' && s.t > 400) ? 1 : 0.01;
      n.feet.scale.setScalar(n.feet.scale.x + (down - n.feet.scale.x) * Math.min(1, dtMs / 120));
    }
    if (s.phase !== n.phase) {
      if (s.phase === 'warn') n.from.copy(at).add(new THREE.Vector3(-6, 7, -4)); // in from the sky
      if (s.phase === 'leave') n.leaveFrom = bird.position.clone();
      n.phase = s.phase;
    }
    bird.visible = true;
    const flap = still ? 0 : Math.sin(n.t / 70);
    let pos; let yaw = bird.rotation.y; let wings = 0.6 * flap; let pitch = 0;
    if (s.phase === 'warn') {
      // in, then round and round over the target
      const k = Math.min(1, s.t / 700);
      const ang = n.t / 520;
      const circle = at.clone().add(new THREE.Vector3(Math.cos(ang) * 1.3, 2.4 + 0.2 * Math.sin(n.t / 300), Math.sin(ang) * 1.0));
      pos = n.from.clone().lerp(circle, still ? 1 : ease.inOut(k));
      yaw = ang + Math.PI;
    } else if (s.phase === 'approach') {
      const ang = n.t / 520;
      const circle = at.clone().add(new THREE.Vector3(Math.cos(ang) * 1.3, 2.4, Math.sin(ang) * 1.0));
      const ms = s.target?.kind === 'carried' ? 2000 : 900;
      const k = Math.min(1, s.t / ms);
      const over = at.clone().add(new THREE.Vector3(0, s.target?.kind === 'carried' ? 0.35 : 0.05, 0));
      pos = circle.lerp(over, ease.inOut(k));
      yaw = Math.atan2(over.x - bird.position.x, over.z - bird.position.z);
    } else if (s.phase === 'sit') {
      // v0.22: on a plant it tugs at the crop, harder and harder, and the plant shakes with it
      const tug = s.target?.kind === 'node' && !still ? Math.min(1, s.t / BIRDS.sitMs) : 0;
      const peck = tug ? Math.max(0, Math.sin(n.t / (150 - 50 * tug))) : 0;
      pos = at.clone().add(new THREE.Vector3(0, 0.05 + (still ? 0 : Math.abs(Math.sin(n.t / 180)) * 0.04) + 0.1 * peck * tug, 0));
      pitch = 0.5 * peck * tug;
      wings = still ? 0 : (0.15 + 0.45 * tug * peck) * Math.sin(n.t / (400 - 300 * tug));
      yaw = 0.6 + 0.3 * Math.sin(n.t / 700);
      const plant = s.target?.kind === 'node' ? this.stations[s.target.id]?.obj : null;
      if (plant && tug) { n.shaking = plant; n.shake0 ??= plant.rotation.z; plant.rotation.z = n.shake0 + 0.07 * tug * Math.sin(n.t / 60); }
    } else {
      // off and away. With a crop in its claws (v0.22) it goes up and across the screen, slowly
      // enough to see what it has; with nothing, up and off to the far side as before
      const k = Math.min(1, s.t / BIRDS.leaveMs);
      const off = n.carry ? new THREE.Vector3(...THIEF.away) : new THREE.Vector3(7, 6.5, -6);
      const away = n.leaveFrom.clone().add(off);
      const e = n.carry ? k * k * (3 - 2 * k) * 0.55 + 0.45 * k : ease.inOut(Math.min(1, k * 1.8));
      pos = n.leaveFrom.clone().lerp(away, e);
      if (n.carry && !still) pos.y += Math.sin(Math.min(1, k * 2.4) * Math.PI) * 0.5; // a heave up with the load
      yaw = Math.atan2(away.x - n.leaveFrom.x, away.z - n.leaveFrom.z);
      wings = (n.carry ? 0.95 : 0.8) * (still ? 0 : Math.sin(n.t / (n.carry ? 75 : 55)));
      if (n.carry) n.carry.rotation.z = still ? 0 : 0.25 * Math.sin(n.t / 160); // it swings under it
    }
    if (s.phase !== 'sit' && n.shaking) { n.shaking.rotation.z = n.shake0; n.shaking = null; n.shake0 = undefined; }
    bird.position.copy(pos);
    bird.rotation.set(pitch, yaw, 0);
    n.wl.rotation.z = -wings; n.wr.rotation.z = wings;
  }
  // The crop a bird took hangs in its claws (v0.22, Tiffany: "more obviously steal crops and fly
  // off with them"): the crop itself, half as big again as on the plant, under its body.
  birdCarry(res) {
    const n = this.nuisance;
    if (!n || !res) return;
    if (n.carry) n.bird.remove(n.carry);
    // v0.23 (Tiffany: "it should show the bird carrying it away in his feet"): the crop hangs
    // from its two feet, right under them, and a good deal bigger than the bird's body so it is
    // plain what it has: a cob held along it, a sunflower's head face out, a tomato
    n.carry = new THREE.Group();
    const crop = G.unitMesh(res);
    crop.scale.setScalar(THIEF.crop / n.bird.scale.x);
    crop.position.set(0, res === 'C' ? -0.09 : -0.12, 0);
    if (res === 'S') crop.rotation.x = Math.PI / 2; // the sunflower's face to the viewer
    if (res === 'C') crop.rotation.set(Math.PI / 2, 0, 0); // the cob lies along the bird, a foot at each end
    n.carry.add(crop);
    n.carry.position.set(0, -0.155, -0.02); // at its feet
    n.bird.add(n.carry);
    n.feet?.scale.setScalar(1);
  }
  // The plant a bird took from (v0.22: "so the crops need to grow back"). Its ripe crop is gone
  // from it (the ledger: sync hides the units); here it shudders in a puff of dust, and the corn
  // and the sunflowers sag, then stand up again over the time their crop takes to grow.
  stripPlant(id) {
    const st = this.stations[id];
    if (!st || !NODES[id]) return;
    const res = NODES[id].res;
    const top = this.nodeTop(id, new THREE.Vector3());
    if (top) this.puff(top, { scale: 0.9 });
    const o = res === 'T' ? this.nodeViews[id]?.plant : st.obj;
    const view = this.nodeViews[id];
    if (view) view.stripped = true; // its crop pops back in when it is ripe again (regrowCrop)
    // v0.23: a sunflower loses its head to the bird, and grows a new one from a bud over the time
    // its crop takes (the corn's cobs and the tomatoes are the ledger's units: gone, then back)
    const head = res === 'S' ? st.obj.getObjectByName('head') : null;
    if (head) {
      const token = (head.userData.regrow = (head.userData.regrow ?? 0) + 1);
      head.scale.setScalar(0.12);
      if (this.reducedMotion()) this.tweens.wait(NODE_RENEW_MS.S).then(() => { if (head.userData.regrow === token) head.scale.setScalar(1); });
      else this.tweens.run(NODE_RENEW_MS.S, (k) => { if (head.userData.regrow === token) head.scale.setScalar(0.12 + 0.88 * ease.inOut(k)); }).then(() => { if (head.userData.regrow === token) head.scale.setScalar(1); });
    }
    if (!o || this.reducedMotion()) return;
    this.wobble(o, { amp: 0.16, ms: 700 });
    if (res === 'T') return; // the bed's plants keep their size: their fruit is what went
    const full = (o.userData.fullY ??= o.scale.y);
    const token = (o.userData.regrow = (o.userData.regrow ?? 0) + 1);
    const mine = () => o.userData.regrow === token;
    this.tweens.run(260, (k) => { if (mine()) o.scale.y = full * (1 - 0.3 * ease.out(k)); })
      .then(() => this.tweens.run(Math.max(500, NODE_RENEW_MS[res] - 500), (k) => { if (mine()) o.scale.y = full * (0.7 + 0.3 * k); }))
      .then(() => { if (mine()) o.scale.y = full; });
  }
  // v0.23 ("... which had disappeared as the bird carries it away, regrows"): the crop a bird took
  // is ripe again: the cobs, or the tomatoes, swell back onto the plant with a small bounce (the
  // ledger has shown them at once; this is how they come). Only for a plant a bird stripped.
  regrowCrop(id) {
    const view = this.nodeViews[id];
    if (!view?.stripped) return;
    view.stripped = false;
    if (this.reducedMotion()) return;
    const parts = view.fruit ? view.fruit.filter((f) => f.mesh.visible).map((f) => f.mesh) : view.units ? view.units.children.filter((c) => c.visible) : [];
    for (const [i, m] of parts.entries()) {
      const full = (m.userData.fullScale ??= m.scale.clone());
      m.scale.copy(full).multiplyScalar(0.05);
      this.tweens.wait(i * 70).then(() => this.tweens.run(420, (k) => m.scale.copy(full).multiplyScalar(Math.max(0.05, ease.outBack(k))))).then(() => m.scale.copy(full));
    }
  }
  // a shoo: a little puff where the bird was as it flies off
  birdShoo() { if (this.nuisance?.bird.visible) this.puff(this.nuisance.bird.position.clone(), { scale: 0.5 }); }
  birdPos(out = new THREE.Vector3()) { return this.nuisance?.bird.visible ? out.copy(this.nuisance.bird.position) : null; }
  cleanBenchVisual(u) {
    if (!this.stain) return;
    this.stain.scale.set(1 - Math.min(1, u) * 0.9, 1, 1 - Math.min(1, u) * 0.4);
  }
  // v0.17 the bench stain (A22 item 8), shown while the ledger has one
  syncStain(l) {
    if (!this.stain) {
      this.stain = G.benchStain();
      this.root.add(this.stain);
    }
    const on = !!l.theft?.stain && !this.playHidden;
    if (on && !this.stain.visible) { this.cleanBenchVisual(0); this.benchSeat(this.stain.position); this.stain.position.y += 0.005; this.stain.rotation.y = 0.65; }
    this.stain.visible = on;
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
  // (v0.14: in layers once all four stand; a good past what is drawn flies onto the heap's top)
  tableSlotWorld(res, i) {
    const list = this.tableStations();
    const n = Math.max(1, Math.min(list.length, this.tablesShown ?? 1));
    const big = n >= TABLES_UNLIMITED;
    const drawn = tableDrawn(n, big);
    const at = tableSpot(i < drawn ? i : drawn - 1 - (i % n), n, big) ?? { k: 0, i: 0 };
    return this.piles[list[at.k].def.id].slotWorld(res, 0, at.i);
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

  // where buyers may not walk (v0.14): her standing tables, as ground boxes grown by a buyer's room
  // (walk.js routeAround). v0.16 (captain: "The customers should get around the raised garden bed.
  // Right now they are getting across"): also the raised bed D18, the stone ring round the tree and
  // the bench (D11, the whole ring: nobody steps over it), the tree, the hired archer and the
  // sunflowers beside the last table (`obstacleBoxes`)
  saleBoxes(nTables) {
    const room = 0.1;
    const box = (x, z, hx, hz) => ({ lo: [x - hx - room, z - hz - room], hi: [x + hx + room, z + hz + room] });
    const out = this.tableStations().filter((st) => st.def.table < nTables).map((st) => box(st.pos.x, st.pos.z, 0.5, 0.28));
    const crate = this.stations.crate; // v0.25: the crate at the row's end is part of the wall
    if (crate && nTables > 0) out.push(box(crate.pos.x, crate.pos.z, 0.42, 0.3));
    return out;
  }
  // the farm's fixed footprints on the ground ({ lo, hi } boxes, grown by `room`): measured from
  // the built models, so they follow the fit
  obstacleBoxes(room = 0.15) {
    const out = [];
    const fromObj = (o, grow = room) => {
      if (!o) return;
      o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(o);
      if (b.isEmpty()) return;
      out.push({ lo: [b.min.x - grow, b.min.z - grow], hi: [b.max.x + grow, b.max.z + grow], name: o.name });
    };
    fromObj(this.objects.D18); // the raised bed
    fromObj(this.ringModel); // the border ring, its full circle (the tree and bench inside it)
    const trunk = this.objects.D09.position; const tr = TREE_TRUNK_R * this.objects.D09.scale.x + room;
    out.push({ lo: [trunk.x - tr, trunk.z - tr], hi: [trunk.x + tr, trunk.z + tr], name: 'D09_Trunk' });
    for (const id of SUNFLOWER_NODES) { const p = this.stations[id]?.pos; if (p) out.push({ lo: [p.x - 0.25, p.z - 0.25], hi: [p.x + 0.25, p.z + 0.25], name: id }); }
    for (const a of Object.values(this.archers ?? {})) if (a.root.visible) { const p = a.root.position; out.push({ lo: [p.x - 0.35, p.z - 0.35], hi: [p.x + 0.35, p.z + 0.35], name: 'Archer' }); }
    return out;
  }
  // v0.16: a free place on the grass near `p` for the egg to land: the first of a few places
  // round her (in front of her toward the camera first) clear of the tables, the house and the
  // farm's footprints, inside the walkable ground
  freeSpotNear(p, out = new THREE.Vector3()) {
    const boxes = [...this.saleBoxes(tables(this.lastLedger ?? { stages: {} })), ...this.obstacleBoxes(0.2)];
    const h = this.objects.D01; const hb = new THREE.Box3().setFromObject(h);
    boxes.push({ lo: [hb.min.x - 0.2, hb.min.z - 0.2], hi: [hb.max.x + 0.2, hb.max.z + 0.2] });
    const free = (q) => !boxes.some((b) => q.x > b.lo[0] && q.x < b.hi[0] && q.z > b.lo[1] && q.z < b.hi[1]);
    for (const [dx, dz] of [[0.5, 1.25], [-0.5, 1.25], [1.15, 0.6], [-1.15, 0.6], [1.3, -0.2], [-1.3, -0.2], [0.4, -1.2], [0, 1.9]]) {
      out.set(p.x + dx, 0, p.z + dz);
      const q = out.clone();
      if (this.clampToBounds(q)) continue;
      if (free(out)) return out;
    }
    // A star can lie inside the tree clearing. Search outwards until the egg is actually
    // on free ground rather than falling back inside a footprint.
    for (let radius = 2.2; radius < 14; radius += 0.4) for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12;
      out.set(p.x + Math.sin(a) * radius, 0, p.z + Math.cos(a) * radius);
      if (!this.clampToBounds(out.clone()) && free(out)) return out;
    }
    return out.copy(p).setY(0);
  }
  // a buyer's place or start that lies in a footprint moves out of it, sideways, to the near edge
  clearOf(p, boxes) {
    for (const b of boxes) {
      if (!(p.x > b.lo[0] && p.x < b.hi[0] && p.z > b.lo[1] && p.z < b.hi[1])) continue;
      p.x = p.x - b.lo[0] < b.hi[0] - p.x ? b.lo[0] - 0.05 : b.hi[0] + 0.05;
    }
    return p;
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

  // ---------- v0.15: the chimney's smoke ----------
  // Puffs of the dust's paper-white blobs in ink rise from the chimney top in turn, once the
  // chimney (H4) is built, in play, the finale and after. Reduced motion: they hold still, a
  // short column over the chimney.
  buildSmoke(house) {
    house.updateMatrixWorld(true);
    const top = house.localToWorld(house.userData.chimneyTop.clone());
    const puffs = [];
    for (let i = 0; i < SMOKE.puffs; i++) {
      const o = G.dustPuff(i + 2);
      const mats = fadeable(o);
      o.visible = false;
      o.name = `D03_Smoke_${i}`;
      this.root.add(o);
      puffs.push({ o, mats });
    }
    this.smoke = { top, puffs, t: 0, k: house.scale.x };
  }
  // per frame (real time); -> whether the smoke shows
  // ---------- v0.17c: the hidden keepsakes (game/keepsakes.js) ----------
  // Made once, lying on the grass where KEEPSAKES puts them; shown in the exploring phase until
  // found. One glints now and then when she is near. Presentation only: main.js owns finding.
  buildKeepsakes() {
    this.keepsakes = {};
    for (const [id, k] of Object.entries(KEEPSAKES)) {
      const obj = G.keepsake(id);
      const p = this.proj.groundAt(k.u, k.v);
      obj.position.copy(p);
      obj.scale.setScalar(KEEPSAKE_SIZE);
      obj.visible = false;
      this.root.add(obj);
      this.keepsakes[id] = { obj, pos: p.clone(), t: (id.length * 977) % 3000, gone: false };
    }
  }
  keepsakePos(id) { return this.keepsakes?.[id]?.pos ?? null; }
  // out: the exploring phase; found: { id: true }; hero: her position.
  // v0.22 (Tiffany: "should not have yellow circles around them, they should just be icons that
  // look like the item in the photo"): each lies on the grass as the thing itself. No ring, no
  // yellow glint; when she is near it gives a small hop now and then, so it is seen.
  // v0.23 (Tiffany: "Have the icons bouncing a bit so she sees them"; "just a few at a time"): only
  // the keepsakes in `shown` lie out (main.js: the first few still to find), and each bounces all
  // the time, wherever she is: two small hops, a rest, and again, each in its own time; a new one
  // pops up as one is found. Reduced motion: they lie still.
  updateKeepsakes(dtMs, { out = false, found = {}, shown = null } = {}) {
    if (!this.keepsakes) this.buildKeepsakes();
    const show = out && !this.playHidden && !this.finaleActive;
    const still = this.reducedMotion();
    for (const [id, k] of Object.entries(this.keepsakes)) {
      if (k.picking) continue;
      const on = show && !found[id] && (!shown || shown.includes(id));
      if (on && !k.obj.visible && k.wasOut && !still) k.popMs = 0; // it takes the place of one just found
      k.wasOut = show;
      k.obj.visible = on;
      k.obj.position.y = 0;
      k.obj.scale.setScalar(KEEPSAKE_SIZE);
      if (!on || still) continue;
      k.t += dtMs;
      const h = keepsakeBounce(k.t);
      k.obj.position.y = h * KEEPSAKE_BOUNCE.high;
      // a little squash as it lands, a little stretch in the air
      k.obj.scale.set(KEEPSAKE_SIZE * (1 - 0.06 * h), KEEPSAKE_SIZE * (1 + 0.1 * h), KEEPSAKE_SIZE * (1 - 0.06 * h));
      if (k.popMs !== undefined) {
        k.popMs += dtMs;
        const u = Math.min(1, k.popMs / 360);
        k.obj.scale.multiplyScalar(Math.max(0.01, ease.outBack(u)));
        if (u >= 1) k.popMs = undefined;
      }
    }
  }
  // she picks it up: a hop and a puff, and it is gone
  async pickKeepsake(id) {
    const k = this.keepsakes?.[id];
    if (!k) return;
    k.picking = true;
    if (!this.reducedMotion()) {
      const s0 = k.obj.scale.x;
      await this.tweens.run(320, (t) => { k.obj.position.y = Math.sin(Math.PI * t) * 0.5; k.obj.scale.setScalar(s0 * (1 + 0.4 * t)); k.obj.rotation.y += 0.25; });
      k.obj.scale.setScalar(s0);
    }
    this.puff(k.pos.clone().setY(0.3), { scale: 0.7 });
    k.obj.position.y = 0;
    k.obj.visible = false;
    k.picking = false;
  }

  // ---------- v0.17c: fireflies in the finished farm's evening (game/evening.js) ----------
  // Two dozen soft yellow lights low over the grass by the tree, the bed, the sunflowers and the
  // corn, drifting and blinking; they show as the evening comes (k 0..1). Still, dimmer lights
  // with reduced motion.
  updateFireflies(dtMs, k) {
    if (!this.fireflies) {
      const r = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
      const homes = [[22, 66], [30, 72], [66, 84], [74, 86], [84, 70], [90, 66], [60, 50], [72, 50], [46, 76], [14, 80]];
      const tex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d');
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,248,190,1)'); gr.addColorStop(0.35, 'rgba(255,224,110,0.8)'); gr.addColorStop(1, 'rgba(255,200,60,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      })();
      this.fireflies = Array.from({ length: 24 }, (_, i) => {
        const [u, v] = homes[i % homes.length];
        const base = this.proj.groundAt(u + (r(i) - 0.5) * 8, v + (r(i + 50) - 0.5) * 6);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
        sp.scale.setScalar(0.22);
        sp.userData.noOutline = true; sp.userData.noFit = true;
        sp.visible = false;
        this.root.add(sp);
        return { sp, base, ph: r(i + 100) * 10, sp2: 0.6 + r(i + 200) * 0.8 };
      });
      this.fireT = 0;
    }
    const still = this.reducedMotion();
    this.fireT += still ? 0 : dtMs;
    const show = k > 0.02 && !this.playHidden && !this.finaleActive;
    for (const f of this.fireflies) {
      f.sp.visible = show;
      if (!show) continue;
      const t = this.fireT / 1000 * f.sp2 + f.ph;
      f.sp.position.set(f.base.x + 0.6 * Math.sin(t * 0.7), 0.5 + 0.35 * Math.sin(t * 1.3) + 0.2, f.base.z + 0.5 * Math.cos(t * 0.5));
      const blink = still ? 0.6 : Math.max(0, Math.sin(t * 2.1)) ** 3;
      f.sp.material.opacity = k * (0.25 + 0.75 * blink);
    }
  }

  updateSkyBirds(dtMs) {
    if (this.reducedMotion()) return;
    this.skyBirdT = (this.skyBirdT ?? 0) + dtMs;
    const t = this.skyBirdT;
    for (const [i, b] of this.objects.D21.children.entries()) {
      b.userData.home ??= b.position.clone();
      b.position.copy(b.userData.home).add(new THREE.Vector3(0.12 * Math.sin(t / 1700 + i * 2.4), 0.08 * Math.sin(t / 600 + i), 0));
      b.rotation.z = 0.1 * Math.sin(t / 1100 + i);
      for (const wing of b.children) wing.rotation.z = wing.userData.side * 0.22 * Math.sin(t / (190 + i * 23) + i * 1.7);
    }
  }

  // ---------- v0.17c: the farm moves to the song that is playing (audio/beat.js) ----------
  // level 0..1 sways the sunflowers and the corn (they nod about their feet) and lifts the sky's
  // birds; on a beat the chimney gives a puff (one every 0.9 s at most) and the birds bob. With no
  // song (`on` false) everything eases back. Still with reduced motion.
  dance(dtMs, { on = false, level = 0, beat = false } = {}) {
    const d = (this.danceState ??= { k: 0, t: 0, lastPuff: -Infinity, bob: 0 });
    const still = this.reducedMotion();
    d.k += ((on && !still ? 1 : 0) - d.k) * Math.min(1, dtMs / 300);
    d.t += dtMs;
    if (d.k < 0.001 && !on) return;
    const sway = d.k * (0.05 + 0.12 * level);
    let i = 0;
    for (const id of ['s1', 's2', 's3', 's4', 'c1', 'c2', 'c3', 'c4']) {
      const o = this.stations[id]?.obj;
      if (o) o.rotation.x = sway * Math.sin(d.t / 260 + i * 0.9);
      i++;
    }
    if (beat && on && !still) {
      d.bob = 1;
      if (this.smoke && d.t - d.lastPuff > 900) { d.lastPuff = d.t; this.puff(this.smoke.top.clone(), { scale: 1.2 }); }
    }
    d.bob = Math.max(0, d.bob - dtMs / 260);
    const sky = this.objects.D21;
    if (sky) { sky.userData.y0 ??= sky.position.y; sky.position.y = sky.userData.y0 + d.k * (0.25 * level + 0.25 * d.bob); }
  }

  // ---------- v0.17c: ink words, wobbles and the hunt's spot moments ----------
  // a word in the drawing's pencil hand, outlined in paper, as a camera-facing sprite `h` metres tall
  inkSprite(text, h = 0.5, colour = '#253347') {
    const n = Math.max(1, [...text].length);
    const w = Math.min(1024, 96 + n * 56);
    const c = document.createElement('canvas'); c.width = w; c.height = 128;
    const g = c.getContext('2d');
    g.font = '700 88px "Pencil Title", "Comic Sans MS", cursive';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#fff7e5'; g.strokeText(text, w / 2, 68);
    g.fillStyle = colour; g.fillText(text, w / 2, 68);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
    sp.scale.set(h * (w / 128), h, 1); sp.renderOrder = 10; sp.userData.noOutline = true; sp.userData.noFit = true;
    this.root.add(sp);
    return sp;
  }
  // a word pops up at `pos`, rises a little and fades (a still word with reduced motion)
  inkWord(text, pos, { ms = 1400, h = 0.5, rise = 0.6, colour = '#253347' } = {}) {
    const sp = this.inkSprite(text, h, colour);
    this.inkWords ??= new Set(); this.inkWords.add(sp);
    sp.position.copy(pos);
    const still = this.reducedMotion();
    const y0 = pos.y;
    return this.tweens.run(ms, (t) => {
      sp.position.y = y0 + (still ? 0 : rise * ease.out(t));
      sp.material.opacity = t < 0.15 ? t / 0.15 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      if (!still) sp.scale.set(sp.scale.x / sp.scale.y * h * (t < 0.15 ? 0.7 + 2 * t : 1), h * (t < 0.15 ? 0.7 + 2 * t : 1), 1);
    }).then(() => { this.inkWords.delete(sp); this.root.remove(sp); sp.material.map.dispose(); sp.material.dispose(); });
  }
  // a thing on the farm wobbles (rotation about its foot), and settles back
  wobble(obj, { amp = 0.08, ms = 700, axis = 'z', delay = 0 } = {}) {
    if (!obj || this.reducedMotion() || obj.userData.wobbling) return Promise.resolve();
    obj.userData.wobbling = true;
    const base = obj.rotation[axis];
    return this.tweens.wait(delay).then(() => this.tweens.run(ms, (t) => { obj.rotation[axis] = base + amp * Math.sin(t * Math.PI * 5) * (1 - t); }))
      .then(() => { obj.rotation[axis] = base; obj.userData.wobbling = false; });
  }
  // The farm answers a spot's moment (songs.js SPOTS `act`): the pencilled word, when the act has
  // got to its point, and the spot's own reaction to what she does (v0.22: for every spot). All of
  // it runs on the world's clock; `cancelSpot` (she walked off) calls the rest of it off.
  spotPoke(spot, act, heroPos) {
    const ms = act.ms;
    const token = (this.pokeToken = (this.pokeToken ?? 0) + 1);
    const live = () => this.pokeToken === token;
    const after = (k, fn) => this.tweens.wait(ms * k).then(() => { if (live()) fn(); });
    const her = () => (this.heroPos() ?? heroPos).clone();
    const say = (k = 0.3, word = act.word, o = {}) => after(k, () => this.inkWord(word, her().setY(2.3), { h: 0.45, ...o }));
    const st = (id) => this.stations[id]?.obj;
    const wob = (objs, o) => objs.filter(Boolean).forEach((x, i) => this.wobble(x, { ...o, delay: (o?.delay ?? 0) + i * 90 }));
    switch (spot) {
      case 'door': say(0.1); this.strikePart('H5', 0); this.tweens.wait(300).then(() => { if (live()) this.strikePart('H5', 1); }); break;
      case 'chimney': {
        say(0.05);
        // at the top, three puffs go up from the chimney (small enough not to hide her)
        after(0.45, () => { const sm = this.smoke; if (sm) for (let i = 0; i < 3; i++) this.puff(sm.top.clone().add(new THREE.Vector3(0.1, 0.55 + 0.3 * i, -0.15)), { scale: 0.9 + 0.2 * i, delay: i * 220, seed: i }); });
        break;
      }
      case 'bench': say(0.3); after(0.2, () => wob([this.parts.D10?.model?.root], { amp: 0.04, ms: 500 })); break;
      // she hugs the trunk: the canopy shivers and the sky's birds start up
      case 'tree': say(0.4); after(0.3, () => { wob([this.objects.D09], { amp: 0.03, ms: 1000 }); this.wobble(this.objects.D21, { amp: 0.15, axis: 'x', ms: 900 }); }); break;
      case 'tools': say(0.55); this.leanRake(ms, live); break;
      case 'stones': {
        // a "Hop!" and a dip of the stone at every landing
        const route = this.hopRoute();
        const stones = this.parts.D12?.model?.root?.children ?? [];
        this.hopTimes(ms).forEach((at, i) => this.tweens.wait(at).then(() => {
          if (!live()) return;
          this.inkWord(i % 2 ? 'Hop!' : 'Hop', her().setY(2.1), { h: 0.36, ms: 700, rise: 0.4 });
          const stone = stones.find((s) => Math.hypot(s.position.x - route[i + 1].x, s.position.z - route[i + 1].z) < 0.2);
          if (stone && !this.reducedMotion()) { const y0 = stone.position.y; this.tweens.run(260, (k) => { stone.position.y = y0 - 0.03 * Math.sin(Math.PI * k); }).then(() => { stone.position.y = y0; }); }
          this.puff(route[i + 1].clone().setY(0.05), { scale: 0.35, seed: i });
        }));
        break;
      }
      case 'bed': say(0.3); after(0.25, () => this.whoKnowsHello(her())); break;
      case 'sunflowers': say(0.86); wob(['s1', 's2', 's3', 's4'].map(st), { amp: 0.16, ms: ms * 0.8 }); break;
      // the punchline, and the corn shakes with laughter
      case 'corn': say(0.56); after(0.56, () => wob(['c1', 'c2', 'c3', 'c4'].map(st), { amp: 0.13, ms: 1000 })); break;
      case 'table': case 'pockets': {
        // out of her pockets: a few small treasures fly up and land round her
        say(0.55);
        after(0.5, () => {
          const from = her().setY(0.95);
          ['coin', 'T', 'coin', 'C', 'coin'].forEach((res, i) => this.tweens.wait(i * 90).then(() => { if (live()) this.toss(res, from, from.clone().add(new THREE.Vector3((i - 2) * 0.42, -0.9, 0.55 + 0.12 * (i % 2))), 620, 0.9); }));
        });
        break;
      }
      case 'sun': say(0.3); after(0.3, () => this.sunFlare(1100)); break;
      case 'glare': say(0.35); after(0.2, () => this.sunFlare(1500)); break;
      case 'birds': say(0.45); after(0.4, () => { this.wobble(this.objects.D21, { amp: 0.22, axis: 'x', ms: 1100 }); this.inkWord('Tweet!', this.objects.D21.position.clone().add(new THREE.Vector3(0.6, -1.2, 0)), { h: 0.5, ms: 1200 }); }); break;
      case 'weeds': say(0.5); after(0.42, () => { if (this.weedProp) { wob([this.weedProp], { amp: 0.3, ms: 900 }); this.inkWord('HA HA HO!', this.weedProp.position.clone().setY(1.0), { h: 0.34, ms: 1100 }); } }); break;
      case 'world': say(0.4); break;
      // the corn leans after her, and one sunflower turns its head
      case 'between': say(0.45); after(0.25, () => { wob(['c3', 'c4'].map(st), { amp: 0.12, ms: 1400 }); wob([st('s3')], { amp: -0.1, ms: 1400 }); }); break;
      case 'paper': say(0.62); break;
      case 'window': say(0.5); break;
      case 'path': {
        // the coins go up from her hands, and come down round her
        say(0.42);
        after(0.3, () => {
          const from = her().setY(2.0);
          for (let i = 0; i < 6; i++) this.tweens.wait(i * 50).then(() => { if (live()) this.toss('coin', from, her().add(new THREE.Vector3(Math.cos(i * 1.05) * 0.7, 0.05, Math.sin(i * 1.05) * 0.55 + 0.25)), 900, 1.5); });
        });
        break;
      }
      // the kiss is a pencilled heart that floats off toward the viewer
      case 'field': after(0.5, () => { const p = her().setY(1.55); if (this.camera) p.add(new THREE.Vector3().subVectors(this.camera.position, p).setY(0).normalize().multiplyScalar(0.5)); this.inkWord(act.word, p, { h: 0.6, ms: 1500, rise: 1.1 }); }); break;
      case 'sketch': {
        // the paper comes up off the grass into her hand (hero.js shows it there), then the word
        say(0.6);
        after(0.33, () => { if (this.sketchProp) { this.sketchProp.userData.taken = true; this.sketchProp.visible = false; } });
        after(0.98, () => { if (this.sketchProp) this.sketchProp.userData.taken = false; });
        break;
      }
      case 'pose': say(0.35); break;
      case 'easel': say(0.8); this.airCircle(her(), ms, live); break;
      case 'flipflops': {
        say(0.3, 'Flip!'); say(0.56, 'Flop!');
        for (const k of [0.3, 0.56, 0.8]) after(k, () => this.puff(her().setY(0.05), { scale: 0.4, seed: Math.round(k * 10) }));
        break;
      }
      default: say(0.3);
    }
  }
  // she walked off in the middle of a moment: nothing more of it happens, and what it moved goes back
  cancelSpot(spot) {
    this.pokeToken = (this.pokeToken ?? 0) + 1;
    if (spot === 'tools') { const r = this.tools.rake; if (this.heldTool !== 'rake' && !r.flying) r.obj.quaternion.copy(r.home.quat); }
    if (spot === 'sketch' && this.sketchProp) this.sketchProp.userData.taken = false;
    if (this.airLine) this.airLine.visible = false;
  }
  // "Lean the rake on the shovel": as she reaches out, the rake tips along the wall until its
  // handle rests on the shovel's (a clink), stays there a moment, and goes back to its own lean
  leanRake(ms, live = () => true) {
    const r = this.tools.rake;
    if (this.heldTool === 'rake' || r.flying) return;
    const o = r.obj;
    const q = new THREE.Quaternion();
    const along = Math.sign(TOOL_LEAN.along.shovel - TOOL_LEAN.along.rake); // toward the shovel, along the wall
    const tip = (k) => o.quaternion.copy(r.home.quat).multiply(q.setFromEuler(tmpE.set(along * RAKE_ON_SHOVEL * k, 0, 0)));
    if (this.reducedMotion()) { tip(1); this.tweens.wait(ms * 0.8).then(() => o.quaternion.copy(r.home.quat)); return; }
    this.tweens.wait(ms * 0.22)
      .then(() => this.tweens.run(ms * 0.26, (k) => { if (live()) tip(ease.inOut(k)); }))
      .then(() => { if (live()) wob2(this, this.tools.shovel.obj); return this.tweens.wait(ms * 0.26); })
      .then(() => this.tweens.run(ms * 0.2, (k) => { if (live()) tip(1 - ease.inOut(k)); }))
      .then(() => { if (live() && this.heldTool !== 'rake') o.quaternion.copy(r.home.quat); });
  }
  // a small thing thrown up in an arc from `from` to `to` (higher than a unit's flight: `high` m)
  toss(res, from, to, ms = 700, high = 1) {
    const m = G.unitMesh(res);
    m.position.copy(from);
    this.root.add(m);
    if (this.reducedMotion()) return this.tweens.wait(REDUCED_FLIGHT_MS).then(() => this.root.remove(m));
    return this.tweens.run(ms, (k) => {
      m.position.lerpVectors(from, to, k);
      m.position.y += Math.sin(Math.PI * k) * high;
      m.rotation.set(k * 5, k * 7, 0);
    }).then(() => this.root.remove(m));
  }
  // "Draw a big circle in the air": a pencil line follows her hand round, before her, facing the
  // viewer, and fades when she is done
  airCircle(at, ms, live = () => true) {
    const R = 0.62; const N = 72;
    if (!this.airLine) {
      const pos = [];
      for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2; const r = R * (1 + 0.035 * Math.sin(a * 3 + 0.7)); pos.push(Math.sin(a) * r, Math.cos(a) * r, 0); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      this.airLine = new THREE.Line(g, new THREE.LineBasicMaterial({ color: G.PALETTE.ink, transparent: true, depthTest: false }));
      this.airLine.renderOrder = 9; this.airLine.userData.noOutline = true; this.airLine.userData.noFit = true;
      this.root.add(this.airLine);
    }
    const line = this.airLine;
    line.position.copy(at).setY(1.62);
    if (this.camera) { line.quaternion.copy(this.camera.quaternion); line.position.add(new THREE.Vector3().subVectors(this.camera.position, line.position).setY(0).normalize().multiplyScalar(0.45)); }
    line.visible = true; line.material.opacity = 1;
    this.tweens.run(ms, (u) => {
      if (!live()) return;
      line.geometry.setDrawRange(0, Math.max(2, Math.round(drawnShare(u) * (N + 1))));
      line.material.opacity = u > 0.86 ? Math.max(0, 1 - (u - 0.86) / 0.14) : 1;
    }).then(() => { if (live()) line.visible = false; });
  }
  // the sun answers her: it swells and its rays reach out for a moment
  sunFlare(ms = 1200) {
    const sun = this.objects.D22;
    if (!sun || this.reducedMotion() || sun.userData.flaring) return;
    sun.userData.flaring = true;
    const s0 = sun.scale.x;
    this.tweens.run(ms, (k) => sun.scale.setScalar(s0 * (1 + 0.1 * Math.sin(Math.PI * k) * (1 + 0.3 * Math.sin(k * 30))))).then(() => { sun.scale.setScalar(s0); sun.userData.flaring = false; });
  }

  // ---------- v0.17: the Who-Knows plant says hello (spec §10.5) ----------
  // It sways gently every 4–6 s (static with reduced motion), happily once its song (E25) is found
  // and she comes near; once per save, the first time she comes close, it gives a curious wiggle,
  // its leaves turn toward her and a pencilled "?" rises from its top loop and curls into a little
  // note, gone within 1.5 s (reduced motion: a still "?♪" badge for 2 s). Presentation only.
  whoKnowsObj() { return (this.whoKnowsNode ??= this.root.getObjectByName('D19_WhoKnows') ?? null); }
  whoKnowsPos(out = new THREE.Vector3()) { const o = this.whoKnowsObj(); return o ? o.getWorldPosition(out).setY(0) : null; }
  updateWhoKnows(dtMs, { near = false, happy = false } = {}) {
    const o = this.whoKnowsObj();
    if (!o) return;
    const w = (this.whoT ??= { t: 0, wiggle: 0, face: 0 });
    const still = this.reducedMotion();
    w.t += dtMs;
    w.wiggle = Math.max(0, w.wiggle - dtMs);
    if (still) { o.rotation.set(0, 0, 0); o.scale.setScalar(1); return; }
    // a gentle sway, a breath every 5 s or so
    const sway = 0.05 * Math.sin((w.t / 5000) * Math.PI * 2) * (0.6 + 0.4 * Math.sin(w.t / 3100));
    const glad = happy && near ? 0.12 * Math.sin(w.t / 160) : 0;
    const wig = w.wiggle > 0 ? 0.22 * Math.sin(w.wiggle / 55) * (w.wiggle / 1500) : 0;
    o.rotation.z = sway + glad + wig;
    o.rotation.y = w.face * (w.wiggle / 1500); // the leaves turn toward her while it wiggles
    o.scale.set(1, 1 + 0.06 * Math.abs(wig) / 0.22, 1);
  }
  whoKnowsHello(heroPos) {
    const o = this.whoKnowsObj();
    if (!o) return Promise.resolve();
    const top = o.localToWorld(new THREE.Vector3(0.02, 0.62, 0));
    const reduced = this.reducedMotion();
    const w = (this.whoT ??= { t: 0, wiggle: 0, face: 0 });
    const p = o.getWorldPosition(new THREE.Vector3());
    w.face = Math.atan2(heroPos.x - p.x, heroPos.z - p.z) * 0.15;
    if (!reduced) w.wiggle = 1500;
    const make = (text) => this.inkSprite(text, 0.85);
    if (reduced) {
      const badge = make('?♪');
      badge.scale.set(1.0, 1.0, 1);
      badge.position.copy(top).add(new THREE.Vector3(0, 0.35, 0));
      return this.tweens.wait(2000).then(() => { this.root.remove(badge); });
    }
    const q = make('?'); const n = make('♪');
    n.material.opacity = 0;
    return this.tweens.run(1500, (t) => {
      const rise = top.clone().add(new THREE.Vector3(0.12 * Math.sin(t * Math.PI * 1.5), 0.15 + t * 0.55, 0));
      q.position.copy(rise); n.position.copy(rise);
      const curl = Math.min(1, Math.max(0, (t - 0.35) / 0.35)); // the ? curls into the note
      q.material.opacity = 1 - curl; q.material.rotation = curl * 1.2;
      n.material.opacity = curl * (t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1);
      n.material.rotation = (1 - curl) * -0.8;
    }).then(() => { this.root.remove(q); this.root.remove(n); });
  }

  updateSmoke(dtMs) {
    const sm = this.smoke;
    if (!sm) return false;
    const part = this.parts.H4;
    const on = !!this.lastLedger && this.partDone(part, this.lastLedger) && !this.revealing?.has('H4');
    const still = this.reducedMotion();
    if (!still) sm.t += dtMs;
    sm.puffs.forEach(({ o, mats }, i) => {
      o.visible = on;
      if (!on) return;
      const u = still ? (i + 0.5) / SMOKE.puffs : ((sm.t / SMOKE.ms) + i / SMOKE.puffs) % 1;
      const size = (SMOKE.size[0] + (SMOKE.size[1] - SMOKE.size[0]) * u) * sm.k * 0.5;
      o.scale.setScalar(size);
      o.position.set(sm.top.x + SMOKE.drift * sm.k * u * u, sm.top.y + SMOKE.rise * sm.k * u, sm.top.z);
      o.rotation.y = i * 1.7 + u * 0.8;
      const a = still ? SMOKE.opacity * (1 - 0.5 * u) : SMOKE.opacity * Math.min(1, u / 0.12) * (1 - u);
      for (const m of mats) m.opacity = a;
    });
    return on;
  }

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
    const part = HOUSE_STAGES.includes(stage) ? stage : { G1: 'D08', G2: 'D10', G3: 'D12', G4: 'D11', T0: 'D18' }[stage];
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
  // v0.23 (design audit 13): `wish` ({ crop, n, met }) is a buyer's wish for this sale: the first
  // buyer says it as they walk up ("Two tomatoes, please!") and, if it was on the tables, thanks
  // her with a coin on top (`onTip`); if not, "Next time!".
  async yardSale(items, { onCoins = null, onSign = null, onTip = null, wish = null, sale: saleNo = 1, tables: nTables = 1 } = {}) {
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
      // v0.16: the stick goes into the ground behind the tables, the board popping up on it
      await this.tweens.run(SALE_MS.sign, (u) => { sign.scale.set(SIGN_SCALE * Math.max(0.01, ease.outBack(u)), SIGN_SCALE * Math.max(0.01, ease.outBack(u)), SIGN_SCALE); sign.position.y = 0.5 * (1 - u); });
      this.puff(sign.position.clone(), { scale: 0.6 });
    }
    if (!live()) return;
    // who comes, and to which table: every table that stands, in turn (at least two each)
    const used = Math.max(1, Math.min(nTables, tablesListLen(this)));
    // (P29-5: when there are more buyers than goods, the rest browse and leave with a nod)
    const n = buyerCount(nTables, saleNo);
    const who = crowdFor(saleNo, n);
    const buyers = who.map((i) => sale.buyers[i]);
    sale.showing = buyers;
    const tablesList = this.tableStations();
    const plan = buyers.map((b, i) => ({ b, k: i % used, slot: Math.floor(i / used) }));
    // each table's goods (their indexes in `items`) shared out among its buyers
    for (const p of plan) p.goods = [];
    // (v0.14: on four tables the heap's layers too; what is past the drawn heap sells unseen)
    const count = new Array(used).fill(0);
    for (let j = 0; j < Math.min(items.length, tableDrawn(used, used >= TABLES_UNLIMITED)); j++) {
      const at = tableSpot(j, used, used >= TABLES_UNLIMITED);
      if (!at || at.k >= used) continue;
      const mine = plan.filter((p) => p.k === at.k);
      mine[count[at.k]++ % mine.length]?.goods.push(j);
    }
    const to = plan.map((p) => {
      const d = tablesList[p.k].def;
      const [du, dv] = BUYER_AT[p.slot % BUYER_AT.length];
      return this.ground(d.u + du + Math.floor(p.slot / 3) * 0.6, d.v + dv + Math.floor(p.slot / 3) * 1.2);
    });
    // v0.14 (captain: "the customers right now can go through the tables"): each takes the
    // shortest way round the tables, stalls and sellers to their place, and goes back the same
    // way; they fade in and out at the far end, so nobody pops up. v0.15: they come up from the
    // south, from a little apart below the southmost table or stall, to the tables' south side
    // (v0.16: and round the raised bed, the stone ring, the tree, the archer and the sunflowers)
    const tableBoxes = this.saleBoxes(used);
    const fixed = this.obstacleBoxes();
    const boxes = [...tableBoxes, ...fixed];
    const front = Math.max(...tableBoxes.map((q) => q.hi[1]));
    for (const p of to) this.clearOf(p, fixed);
    const from = plan.map((_, i) => this.clearOf(new THREE.Vector3(to[i].x + ((i % 3) - 1) * BUYER_IN.lane, 0, front + BUYER_IN.out + (i % 4) * 0.3), fixed));
    const routes = plan.map((_, i) => routeAround({ x: from[i].x, z: from[i].z }, { x: to[i].x, z: to[i].z }, boxes));
    sale.routes = routes; // checks only
    const walk = (b, pts, ms, phase = 0, fade = 0) => {
      const rate = 140 / (b.userData.look?.walk ?? 1);
      const len = routeLength(pts);
      return this.tweens.run(ms, (u) => {
        if (!live()) return;
        const at = routeAt(pts, ease.inOut(u) * len);
        b.position.set(at.x, 0, at.z);
        const turn = Math.atan2(Math.sin(at.yaw - b.rotation.y), Math.cos(at.yaw - b.rotation.y));
        b.rotation.y += u < 0.02 ? turn : turn * 0.35; // round corners in a step or two
        const step = Math.sin((u * ms) / rate + phase);
        b.getObjectByName('legL').rotation.x = step * 0.5;
        b.getObjectByName('legR').rotation.x = -step * 0.5;
        b.getObjectByName('armL').rotation.x = -step * 0.35;
        b.getObjectByName('armR').rotation.x = step * 0.2;
        b.getObjectByName('body').position.y = Math.abs(step) * 0.03;
        if (fade > 0) setOpacity(b, Math.min(1, u / BUYER_IN.fade));
        else if (fade < 0) setOpacity(b, Math.min(1, (1 - u) / BUYER_IN.fade));
      }).then(() => { if (fade) setOpacity(b, fade > 0 ? 1 : 0); });
    };
    const walkMs = (pts, base) => Math.max(base, Math.min(BUYER_IN.maxMs, (routeLength(pts) / BUYER_IN.speed) * 1000));
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
      plan.forEach((p, i) => { p.b.position.copy(from[i]); p.b.rotation.y = Math.atan2(to[i].x - from[i].x, to[i].z - from[i].z); setOpacity(p.b, 0); p.b.visible = true; });
      await Promise.all(plan.map((p, i) => this.tweens.wait(i * SALE_MS.stagger).then(() => walk(p.b, routes[i], walkMs(routes[i], SALE_MS.walkIn), i, 1)).then(() => stand(p.b, p.k))));
    }
    if (!live()) return;
    if (wish && plan[0]) {
      plan[0].b.updateMatrixWorld(true);
      this.inkWord(wishWords(wish), plan[0].b.position.clone().setY(2.15), { h: 0.44, ms: 1700, rise: 0.3 });
      if (!reduced) await this.tweens.wait(650);
      if (!live()) return;
    }
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
      // v0.14: a heap on the last tables gives a buyer more than three; they lift them faster,
      // so a big sale takes about as long as a full one did
      const pace = Math.min(1, 3 / p.goods.length);
      // v0.17c: every other buyer says what they think of their goods, in ink over their head
      sale.said = (sale.said ?? 0) + 1;
      if (p.goods.length && sale.said % 2 === 1) {
        const res = items[p.goods[0]];
        const words = BUYER_WORDS[res] ?? BUYER_WORDS.any;
        p.b.updateMatrixWorld(true);
        this.inkWord(words[(sale.said >> 1) % words.length], p.b.position.clone().setY(2.0), { h: 0.42, ms: 1300, rise: 0.35 });
      }
      for (const j of p.goods) {
        if (!live()) return;
        const res = items[j];
        const fromP = this.tableSlotWorld(res, j);
        sale.goods[j] = null;
        this.sync(this.lastLedger, false);
        p.b.updateMatrixWorld(true);
        const basket = p.b.localToWorld(p.b.userData.basket.clone());
        const fly = this.flight(res, fromP, basket, reduced ? 150 : SALE_MS.take * Math.max(0.4, pace));
        onCoins?.(res, fromP);
        await fly;
        if (!reduced) await this.tweens.wait(SALE_MS.pause * 0.5 * pace);
      }
    };
    await Promise.all(plan.map((p, i) => take(p, i)));
    if (!live()) return;
    if (wish && plan[0]) {
      const over = plan[0].b.position.clone().setY(2.15);
      this.inkWord(wish.met ? 'Thank you! +1' : 'Next time!', over, { h: 0.44, ms: 1300, rise: 0.35 });
      if (wish.met) onTip?.(plan[0].b.position.clone().setY(1.3));
      if (!reduced) await this.tweens.wait(500);
      if (!live()) return;
    }
    sale.goods = null;
    this.sync(this.lastLedger, false);
    // they walk off; the sign comes up again
    if (reduced) {
      await this.tweens.run(200, (u) => { buyers.forEach((b) => setOpacity(b, 1 - u)); setOpacity(sign, 1 - u); });
      buyers.forEach((b) => { b.visible = false; setOpacity(b, 1); });
      sign.visible = false; setOpacity(sign, 1);
    } else {
      await Promise.all(plan.map((p, i) => {
        const back = routeAround({ x: p.b.position.x, z: p.b.position.z }, { x: from[i].x, z: from[i].z }, boxes);
        return this.tweens.wait(i * SALE_MS.stagger).then(() => walk(p.b, back, walkMs(back, SALE_MS.walkOut), i, -1));
      }));
      buyers.forEach((b) => { b.visible = false; setOpacity(b, 1); });
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
    for (const b of sale.buyers) { b.visible = false; setOpacity(b, 1); }
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
  // v0.15: a tomato plant at its size. v0.16 (captain: "The tomato plants should grow with
  // progression taller, not bigger, like normal"): the plant keeps its width and leaves; each size
  // step is one more tier grown on top of its stem (flora.js tomatoTier), rising out of the top as
  // the step comes in. Its tomatoes stay on their truss low on the plant.
  sizePlant(c, k) {
    c.size = k;
    const level = (k - 1) / TOMATO_GROWTH.step;
    for (let i = 0; ; i++) {
      const tier = c.plant.getObjectByName(`tier${i}`);
      if (!tier) break;
      const t = Math.max(0, Math.min(1, level - i));
      tier.visible = t > 0.01;
      tier.scale.set(0.6 + 0.4 * t, Math.max(0.01, t), 0.6 + 0.4 * t);
    }
    this.showFruit(c);
  }
  // v0.20: the extra tomatoes a grown plant carries: those of the units still on it, up to the
  // plant's size level (a tier's truss comes with its tier, the fuller low truss with the first)
  showFruit(c) {
    if (!c.fruit) return;
    const level = Math.floor((c.size - 1) / TOMATO_GROWTH.step + 0.5);
    for (const f of c.fruit) f.mesh.visible = f.unit < (c.remaining ?? 0) && f.level <= level;
  }
  // how many tomatoes show on a node's plant now (checks)
  fruitShown(id) {
    const c = this.nodeViews[id];
    if (!c?.units) return 0;
    let n = 0;
    c.units.children.forEach((m) => { if (!m.userData.outline && !m.userData.keep && m.visible) n++; });
    for (const f of c.fruit ?? []) { let on = f.mesh.visible; for (let o = f.mesh.parent; on && o && o !== this.root; o = o.parent) on = o.visible; if (on) n++; }
    return n;
  }
  // the plant's height above the soil now (bed space), for checks
  plantHeight(c) {
    c.plant.updateMatrixWorld(true);
    const b = new THREE.Box3();
    c.plant.traverse((m) => { if (m.isMesh && m.visible && !m.userData.outline && m.parent.visible) b.expandByObject(m); });
    return b.max.y - b.min.y;
  }
  // v0.12 per frame: a regrown weed grows from a tuft to a full clump over REGROW.growMs, and once
  // it is choking its plant the plant leans a little (spec v0.12 P28-4). v0.15: a tomato plant
  // that has come round again grows to its new size over about half a second
  updateRegrowth(l, dtMs = 50) {
    for (const c of Object.values(this.nodeViews)) {
      if (!c.plant || c.size === c.want) continue;
      const step = this.reducedMotion() ? Infinity : (dtMs / 500) * TOMATO_GROWTH.step;
      this.sizePlant(c, c.want > c.size ? Math.min(c.want, c.size + step) : Math.max(c.want, c.size - step));
    }
    for (const node of Object.keys(NODES)) {
      const st = this.stations[`wr-${node}`];
      if (!st || this.revealing?.has(st.def.id)) continue;
      const since = l.overgrown[node];
      const k = stationScale(st.def);
      const age = since === null ? 0 : Math.max(0, l.activeMs - since);
      if (since !== null && st.obj.visible) st.obj.scale.setScalar(k * (0.45 + 0.55 * Math.min(1, age / REGROW.growMs)));
      // v0.15: a weed over the crops sways, a little more once it is choking the plant, so the
      // eye finds it (none with reduced motion)
      st.sway = (st.sway ?? 0) + dtMs;
      const amp = since === null || this.reducedMotion() ? 0 : age >= REGROW.growMs ? 0.16 : 0.08;
      st.obj.rotation.z = amp * Math.sin(st.sway / 260);
      st.obj.rotation.x = amp * 0.5 * Math.sin(st.sway / 410 + 1);
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
    if (this.finaleActive || this.playHidden) { this.marker.obj.visible = false; return; }
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
    else if (mode === 'settle') s = 1.1;
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
  // v0.24: the tree is one thing to see through: when its canopy or its trunk hides a point, both
  // fade. `solidTrunk`: the trunk keeps its colour (she is hugging it: main.js).
  updateFade(dtMs, camera, points, { solidTrunk = false } = {}) {
    if (this.houseFade) {
      this.houseFade.meshes = [];
      for (const id of HOUSE_STAGES) if (this.lastLedger && isCommitted(this.lastLedger, id)) this.parts[id].model.root.traverse((m) => { if (m.isMesh && !m.userData.outline) this.houseFade.meshes.push(m); });
    }
    const hides = (f) => {
      for (const p of points) {
        tmpV.subVectors(p, camera.position);
        const len = tmpV.length();
        ray.set(camera.position, tmpV.divideScalar(len));
        ray.far = len - 0.05;
        if (ray.intersectObjects(f.meshes, false).length) return true;
      }
      return false;
    };
    const { canopy, trunk } = this.treeFade ?? {};
    const treeHides = !!canopy && (hides(canopy) || (!solidTrunk && hides(trunk)));
    for (const f of this.faders) {
      const hidden = f === canopy ? treeHides : f === trunk ? treeHides && !solidTrunk : hides(f);
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
const Y_UP = new THREE.Vector3(0, 1, 0);
const tmpW = new THREE.Vector3();
// the shovel gives a small shiver as the rake comes to rest on it
function wob2(world, obj) { world.wobble(obj, { amp: 0.04, ms: 420 }); }
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
