// The colour-reveal rule (spec v0.9 §10.9, P25-1), the blueprint set (P25-3), the bench gate
// (Q25-1, approved: the bench rituals wait for G2) and the colour finale's timeline (P25-2).
// Pure: no three.js, no DOM. The world reads it to decide each drawing part's look; tests read
// it to check the table against the spec.
//
// Every drawing part has one of three looks:
//   colour  - finished and usable: the full look;
//   outline - in the drawing but not finished: the real model, paper inside its ink line, no
//             cast shadow (the broken bench, the scattered border stones, crops not yet dug);
//   ghost   - the blueprint of something that does not exist yet: see-through faint ink or
//             dashed lines (the house's unbuilt stages, path edges, stepping-stone ovals, plot
//             borders).
// A part takes its colour the moment it is finished: a property build or a house part when its
// stage commits, a crop plant when its spot is dug (P25-4), with a 0.5 s colour wash (a fade of
// 150 ms or less under reduced motion).
import { isCommitted, mainComplete } from './ledger.js';

export const WASH_MS = 500; // the colour wash (P25-1)
export const REDUCED_FADE_MS = 150; // reduced motion: a cross-fade of 150 ms or less (§10.2)
export const BLUEPRINT_FADE_MS = 200; // hiding and showing the blueprint (P25-3)

// The §10.9 table, one row per drawing part the world presents. `stage` is the stage whose
// commit gives the part its colour (null: in colour from the start; 'finale': coloured only in
// the finale; 'never': stays ink). `dug` lists crop spots that must also be dug. `before` is the look until then.
export const PARTS = {
  // D01 house, part by part (answer 3: "House has color as its vuild")
  H1: { d: 'D01', what: 'plinth and floor', stage: 'H1', before: 'ghost' },
  // v0.15: walls only walls, roof only roof, the chimney a stage of its own, the home last
  H2: { d: 'D01', what: 'front and right walls', stage: 'H2', before: 'ghost' },
  H3: { d: 'D02', what: 'roof, eaves, ridge', stage: 'H3', before: 'ghost' },
  H4: { d: 'D03', what: 'chimney and its smoke', stage: 'H4', before: 'ghost' },
  H5: { d: 'D04-D07', what: 'round, square and side windows, door frame, red door and handle, door step, trim', stage: 'H5', before: 'ghost' },
  D08: { d: 'D08', what: 'path', stage: 'G1', before: 'ghost' },
  D09: { d: 'D09', what: 'tree', stage: null },
  D10: { d: 'D10', what: 'bench', stage: 'G2', before: 'outline' },
  D11: { d: 'D11', what: 'tree-border stones', stage: 'G4', before: 'outline' },
  D12: { d: 'D12', what: 'stepping stones', stage: 'G3', before: 'ghost' },
  D13: { d: 'D13', what: 'shovel', stage: null },
  D14: { d: 'D14', what: 'rake', stage: null },
  // D15 corn: each live plant when it is dug; the rest of the patch (11 plants) at C1
  c1: { d: 'D15', what: 'corn plant c1', stage: 'C0', dug: ['c1'], before: 'outline' },
  c2: { d: 'D15', what: 'corn plant c2', stage: 'C0', dug: ['c2'], before: 'outline' },
  c3: { d: 'D15', what: 'corn plant c3', stage: 'C1', dug: ['c3'], before: 'outline' },
  c4: { d: 'D15', what: 'corn plant c4', stage: 'C1', dug: ['c4'], before: 'outline' },
  cornRest: { d: 'D15', what: 'the other 11 corn plants', stage: 'C1', dug: ['c3', 'c4'], before: 'outline' },
  cornPlot: { d: 'D15', what: 'dashed corn plot border', stage: 'C1', dug: ['c3', 'c4'], before: 'ghost' },
  // D16 sunflowers: each plant when it is dug (S0: two, S1: two)
  sf0: { d: 'D16', what: 'sunflower 1', stage: 'S0', dug: ['s1'], before: 'outline' },
  sf1: { d: 'D16', what: 'sunflower 2', stage: 'S0', dug: ['s2'], before: 'outline' },
  sf2: { d: 'D16', what: 'sunflower 3', stage: 'S1', dug: ['s3'], before: 'outline' },
  sf3: { d: 'D16', what: 'sunflower 4', stage: 'S1', dug: ['s4'], before: 'outline' },
  sfPlot: { d: 'D16', what: 'dashed sunflower plot border', stage: 'S1', dug: ['s3', 's4'], before: 'ghost' },
  D17: { d: 'D17', what: 'Vanessa', stage: null },
  // v0.12 (P28-7): the bed's board frame is built with sticks at T0, an outline until then
  D18: { d: 'D18', what: 'raised bed', stage: 'T0', before: 'outline' },
  // D19: greens, beet, herbs and the Who-Knows plant from the start; the tomato plants at T0
  D19: { d: 'D19', what: 'greens, beet, herbs, Who-Knows plant', stage: null },
  tomatoes: { d: 'D19', what: 'the two tomato plants', stage: 'T0', dug: ['t1', 't2'], before: 'outline' },
  // work items, in colour from the start because they are work (P25-4, P25-6): never outlines,
  // never in the blueprint; the rocks hide in the finale and never return
  rocks: { d: '-', what: 'loose rocks R1-R8 and the recovery rock', stage: null },
  weeds: { d: '-', what: 'opening and plot weeds', stage: null },
  sources: { d: '-', what: 'wood piles, sticks and falling branches, dig spots', stage: null },
  D20: { d: 'D20', what: 'grass sprouts', stage: 'finale', before: 'ink' },
  D21: { d: 'D21', what: 'sky birds', stage: 'never', before: 'ink' },
  D22: { d: 'D22', what: 'sun', stage: 'finale', before: 'ink' },
  D23: { d: 'D23', what: 'horizon', stage: 'never', before: 'ink' },
  D24: { d: 'D24', what: 'open ground and blank sky', stage: 'finale', before: 'paper' },
};

// The look of a part on this ledger: 'colour' | 'outline' | 'ghost' | 'ink' | 'paper'.
// `finished` (the finale has played or been skipped, or the save is complete) colours the
// finale parts; birds and horizon stay ink for good.
export function partLook(l, id, { finished = mainComplete(l) } = {}) {
  const p = PARTS[id];
  if (!p) throw new Error(`unknown part ${id}`);
  if (p.stage === null) return 'colour';
  if (p.stage === 'never') return p.before;
  if (p.stage === 'finale') return finished ? 'colour' : p.before;
  // v0.12: a plant that wilted under weeds goes back to its outline until it is replanted, but a
  // part that waits for several spots (the rest of the corn, a plot border, the tomato plants)
  // keeps its colour: only the one plant wilts
  const dug = p.dug ?? [];
  const ok = (n) => l.nodes[n]?.dug || (dug.length > 1 && l.wilted?.[n]);
  return isCommitted(l, p.stage) && dug.every(ok) ? 'colour' : p.before;
}

// Parts that take their colour through `stage` (at its commit, or as its spots are dug).
export const partsColouredBy = (stage) => Object.keys(PARTS).filter((id) => PARTS[id].stage === stage);

// P25-3: the blueprint button shows and hides everything not yet in colour: the ghosts and the
// outline objects. It never hides anything in colour, nor mats, crate, sources, weeds, rocks,
// dig spots, the ring, the guide arrow or the HUD (none of which is a drawing part), nor the
// pen marks that stay ink (birds, horizon, sprouts) or the paper.
export const inBlueprint = (look) => look === 'ghost' || look === 'outline';
export function blueprintParts(l) {
  return Object.keys(PARTS).filter((id) => inBlueprint(partLook(l, id)));
}
// Whether a part is drawn: in colour, or in the blueprint while the button is on, or pinned
// because a ritual step or a requested hint needs it (E08's ovals and pebble, the bench).
export function partShown(l, id, { blueprint = true, pinned = false } = {}) {
  const look = partLook(l, id);
  if (!inBlueprint(look)) return true;
  return blueprint || pinned;
}

// ---------- Q25-1 (approved): the bench is usable only once G2 restores it ----------
// "bench maybe colorless until you fix it and then you can interact with it": colour means
// usable. Sitting, bird stains and Clean, and so E05, E17, E19 and E27, wait for G2. G2 is on
// the main route (required for the home, H5), so none of the four songs becomes missable. The bird
// rotation skips the bench perch until then (§7).
export const BENCH_STAGE = 'G2';
export const BENCH_RITUALS = ['E05', 'E17', 'E19', 'E27'];
export const benchUsable = (l) => isCommitted(l, BENCH_STAGE);
// The stage a ritual waits for, or null when it is available any time.
export const ritualGate = (eggId) => (BENCH_RITUALS.includes(eggId) ? BENCH_STAGE : null);
export const ritualOpen = (l, eggId) => { const g = ritualGate(eggId); return g === null || isCommitted(l, g); };

// ---------- P25-2: the colour finale, inside the approved 15 s ----------
// times in ms from the start of the finale (the last build is already saved)
// v0.25 (the captain's v0.24 playtest: "The animation when the house is finished feels off ...
// it should be better thought"): the finale has two shots, composed for the screen it plays on
// (world/framing.js FINALE_SHOTS), and what happens is where the camera is looking:
//   1. `home`: the camera eases from play to the finished house, large, and holds on it while
//      Vanessa, in front of it, cheers at what she has built;
//   2. `travel`: she runs to her place in the drawing and the camera goes with her to the second
//      shot (an upright screen: one screen to the right, to the sun's half of the drawing; a wide
//      one: out to the whole drawing);
//   3. there she turns to the viewer, and the colour comes: what is still in outline, the grass
//      from her feet, the sky from the horizon and, last, the sun; then a hold.
// (v0.9-v0.24: the camera eased to the whole drawing in the first 2 s, she ran to her place under
// it, and everything was coloured in that one frame; v0.21 framed an upright screen's colour beats
// on the drawing's middle between two bands of paper and then eased back to the whole.)
export const FINALE = {
  hide: [0, 2000], // HUD, mats, piles, crate, head stack, leftover rocks, blueprint and ring hide (V9); the camera eases to the first shot, the house
  cheer: [300, 2000], // she cheers at the house she has finished, in front of it
  travel: [2100, 4700], // she runs to D17 (from 2000: walk.js WALK) and the camera goes with her to the second shot
  settle: [4700, 5400], // Vanessa settles at D17, facing the viewer, hands in her pockets
  outlines: [5200, 6000], // anything still in outline takes its colour
  grass: [6000, 9500], // the ground animates into grass, spreading from her feet
  sky: [9500, 11300], // the sky turns blue, rising from the horizon
  sun: [11300, 12300], // last, the sun turns yellow
  hold: [12300, 15000], // hold on the coloured drawing
  total: 15000,
};
// Finale colours (§10.9): light steps of the leaf and tool-blue swatches, within §10.6 item 6;
// none more saturated than the flower yellow. The sun fills with the flower yellow and its
// spiral and rays take a deeper step of it.
// v0.22 (Tiffany: "Make the colors brighter especially the grass sky and sun at the end"): a fresh
// spring green, a clear sky blue and a bright yellow sun with orange strokes (v0.21: a sage
// 0x97a886, a grey-blue 0xb4c4d7 and an ochre 0xe6b83e). `sunGlow` is the light of its rays.
// v0.23 (Tiffany: "sun be brighter in the final graphic"): a lighter, brighter yellow disc and
// light (v0.22: 0xffd932 and 0xffe46b)
export const FINALE_COLOURS = { grass: 0x86c754, grassStroke: 0x559a34, sky: 0x8fd4f8, sun: 0xffe53d, sunInk: 0xf2960a, sprout: 0x559a34, sunGlow: 0xfff08a };

const ramp = ([a, b], t) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const smooth = (x) => x * x * (3 - 2 * x);
// The finale's state at time t (ms). Every value is 0..1 and only rises. `shot` (v0.25) is the
// camera's travel from the first shot to the second (framing.js finaleRect). Reduced motion goes
// straight to the coloured composition in the second shot with a short fade (REDUCED_FADE_MS) and
// then holds: no camera move.
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export function finaleState(t, { reducedMotion = false } = {}) {
  if (reducedMotion) {
    const k = Math.max(0, Math.min(1, t / REDUCED_FADE_MS));
    return { hide: 1, camera: 1, shot: 1, settled: true, outlines: k, grass: k, sky: k, sun: k, done: t >= FINALE.total };
  }
  return {
    hide: smooth(ramp([0, 400], t)), // play elements shrink away in the first 0.4 s
    camera: smooth(ramp(FINALE.hide, t)),
    shot: easeInOut(ramp(FINALE.travel, t)),
    settled: t >= FINALE.settle[0],
    outlines: ramp(FINALE.outlines, t),
    grass: ramp(FINALE.grass, t),
    sky: ramp(FINALE.sky, t),
    sun: ramp(FINALE.sun, t),
    done: t >= FINALE.total,
  };
}
// Skip lands on the coloured end state (the same as the last frame).
export const FINALE_END = Object.freeze(finaleState(FINALE.total));
