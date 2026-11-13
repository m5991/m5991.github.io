// First-actions guide (captain phone test 2026-11-01: "add more tutorial guides in the first
// 2-3 actions so the player knows it needs to open them"). Pure: a function of the ledger plus
// whether the player has moved yet this session, so it needs no save field, picks up where a
// reload left off and never comes back once learned.
//
// v0.12 (captain's v0.11 playtest, replacing v0.11's sell and Build steps): after the drag demo
// the arrow follows the goal line through the opening, with one short prompt at each first action:
//   1. take the rake: the arrow leads to the tools, `Stand still to take the rake`;
//   2. choose a crop: three arrows, one per crop patch, in the crop's colour (corn yellow,
//      sunflower gold, tomato red), `Choose a crop: rake any patch`; the first clump she rakes
//      makes it her crop, then a single arrow leads to its other clump;
//   3. take the shovel and dig: `Now take the shovel`, `Stand still to dig` (with the tomatoes,
//      the raised bed is built first: the DIY lesson, step 8, comes there);
//   4. gather while it grows: `Stand still to gather` at the first branch pile and rock R1;
//   5. drop: (v0.13, P29-1) an edge note, never the arrow: the first time she nears the pile
//      by the house carrying wood or stone, `Walk through the pile by the house to drop your load`;
//   6. set out: with crops in hand before the first sale, the arrow leads to the yard-sale
//      table, `Walk past the table to set out your crops`;
//   7. yard sale: once the table is full, a hand points at the Yard Sale button;
//   8. DIY: at the first build's spot (v0.23: the raised bed, always), with everything in hand,
//      the goal line says DIY and the arrow leads to the bed (v0.12-v0.22: a hand pointed at the
//      DIY button).
// It all goes once the house foundation stands. Afterwards only the self-explaining hint remains:
// lingering in reach of a collectible while moving says "Stand still to ...".
import { HAMMERED, isWeedId, MATERIALS, NODES, PILES, ROCKS, STAGES, STICK_SLOTS } from './data.js';
import { choiceTargets, nextGoal } from './guide.js';
import { digOpen, isCommitted, saleReady, tableAvailable, tableRoom } from './ledger.js';

// (v0.23: the raised bed is built before it, so the first DIY is taught at the bed; and no hand
// points at the DIY button any more: the goal line says DIY and the arrow leads to the place)
export const TUTORIAL_STAGE = 'H1'; // the tutorial ends when the house foundation stands
export const MOVED_M = 1.2; // metres of travel that count as "has moved"
export const LINGER_MS = 600; // moving in reach of a collectible this long shows the hint
// the three arrows of the crop choice (captain: "The arrow in the tutorial shows 3 different
// colors at the stage when you choose what to weed"): corn yellow, sunflower gold, tomato red
export const CHOICE_COLOURS = { C: '#e8c547', S: '#e0952b', T: '#c8463b' };

// what the player has shown they know, derived from the ledger
export function learned(l) {
  const delivered = isCommitted(l, TUTORIAL_STAGE);
  const built = l.paymentEvents.some((id) => HAMMERED.includes(id));
  const dug = Object.values(l.nodes).some((n) => n.dug);
  const gathered = built || MATERIALS.some((r) => l.carried[r] > 0 || l.yard[r] > 0)
    || Object.entries(PILES).some(([id, p]) => l.piles[id] < p.units)
    || Object.entries(ROCKS).some(([id, r]) => !r.recovery && l.rocks[id] < r.units);
  const worked = Object.values(l.weeds).some(Boolean);
  const chose = l.crop !== null;
  const tookRake = worked || l.tool === 'rake';
  const tookShovel = dug || l.tool === 'shovel';
  const dropped = built || l.yard.W + l.yard.R > 0;
  const sold = l.sold.C + l.sold.S + l.sold.T > 0;
  const stocked = sold || l.table.C + l.table.S + l.table.T > 0;
  return { tookRake, chose, worked, tookShovel, dug, gathered, dropped, stocked, sold, built, delivered };
}

const sellable = (l) => l.carried.C + l.carried.S + l.carried.T;

// the kind of a goal target; with the ledger a crop node that waits to be dug is a 'dig' spot
export function kindOf(id, l = null) {
  if (id === 'tools') return 'tools';
  if (id === 'yard') return 'yard';
  if (id === 'table') return 'table';
  if (isWeedId(id)) return 'weed';
  if (id in PILES || STICK_SLOTS.includes(id) || id in ROCKS) return 'source';
  if (id in NODES) return l && digOpen(l, id) ? 'dig' : 'node';
  if (id in STAGES) return 'site';
  return null;
}

// v0.18 (captain, v0.17 playtest: "we still get arrows and yellow circles on getting crops and
// materials for ingredients as the next step ... too many arrows and at that point the user gets
// it"): gathering is shown once. The first time she picks up wood (a starter pile or a stick),
// gathers stone or harvests a crop, the arrow and the standing circle lead her there; once she has
// done that kind of gathering, a goal that only sends her for more of it keeps its words in the
// goal line but gets no arrow and no circle. New things keep both: the first of each action, a
// weed, a dig, the tools, a build, the yard-sale table, the songs.
// What she has gathered at least once, from the ledger (no save field): wood and stone that left a
// starter pile or rock, sit on her head or the pile by the house, or went into a build; a harvest.
export function gatheredOnce(l) {
  const spent = (r) => l.paymentEvents.some((id) => (STAGES[id]?.[r] ?? 0) > 0);
  const W = l.carried.W > 0 || l.yard.W > 0 || spent('W') || Object.entries(PILES).some(([id, p]) => l.piles[id] < p.units);
  const R = l.carried.R > 0 || l.yard.R > 0 || spent('R') || Object.entries(ROCKS).some(([id, r]) => !r.recovery && l.rocks[id] < r.units);
  return { W, R, harvest: !!l.harvested };
}
// is the goal target `id` a routine gathering step now: a source of wood or stone, or a crop to
// harvest, of a kind she has gathered before?
export function routineGather(l, id) {
  const once = gatheredOnce(l);
  if (id in PILES) return once[PILES[id].res];
  if (STICK_SLOTS.includes(id)) return once.W;
  if (id in ROCKS) return once.R;
  if (id in NODES && kindOf(id, l) === 'node') return once.harvest;
  return false;
}
// the goal targets that get the arrow and the standing circle: the crop choice's patches, else the
// goal's own target unless it is a routine gathering step
export function guideTargets(l, goal) {
  const ids = goal.choice?.map((c) => c.target) ?? (goal.target ? [goal.target] : []);
  return ids.filter((id) => id && !routineGather(l, id));
}

// -> null when learned, else { phase, target, kind, tool?, choice? }
// phase: 'move' (not moved yet) | 'take' | 'choose' | 'work' | 'dig' | 'gather' |
//        'stock' | 'sale' | 'build' (a step to teach at `target`) | 'go' (an arrow to the goal
//        line's target, nothing new there). `choice` (phase 'choose'): [{ crop, target, colour }],
//        one arrow per crop patch.
export function tutorialStep(l, { moved = false, toolsCome = false } = {}) {
  const k = learned(l);
  if (k.delivered) return null;
  // v0.13 (P29-1, the captain's "design bug"): the arrows always point where the goal line points;
  // gathering, harvesting, setting crops out or dropping a load never moves or hides them. The
  // first yard sale's two steps are the goal line's own table target.
  const goal = nextGoal(l, { toolsCome });
  const { target } = goal;
  if (!target) return null;
  const kind = kindOf(target, l);
  if (!k.sold && target === 'table' && tableAvailable(l)) {
    if (saleReady(l) && (goal.sale || sellable(l) === 0 || tableRoom(l) === 0)) return { phase: 'sale', target: 'table', kind: 'table' };
    if (sellable(l) > 0 && tableRoom(l) > 0) return { phase: 'stock', target: 'table', kind: 'table' };
  }
  let phase = 'go';
  if (!moved && !k.tookRake) phase = 'move';
  else if (kind === 'tools' && ((goal.tool === 'rake' && !k.tookRake) || (goal.tool === 'shovel' && !k.tookShovel))) phase = 'take';
  else if (goal.choice) {
    const choice = choiceTargets(l).map((c) => ({ ...c, colour: CHOICE_COLOURS[c.crop] }));
    return { phase: 'choose', target, kind, choice };
  } else if (kind === 'weed' && !k.worked) phase = 'work';
  else if (kind === 'dig' && !k.dug) phase = 'dig';
  else if (kind === 'source' && !k.gathered) phase = 'gather';
  else if (kind === 'site' && !k.built && HAMMERED.includes(target)) phase = 'build';
  return goal.tool ? { phase, target, kind, tool: goal.tool } : { phase, target, kind };
}

// v0.13 (P29-1): the pile lesson is an edge note, never the arrow: the first time she comes within
// DROP_NOTE_M of the yard pile carrying wood or stone, before any drop or DIY (main.js shows it
// once). -> the note's text, or null
export const DROP_NOTE_M = 6;
export const DROP_NOTE = 'Walk through the pile by the house to drop your load';
export function dropLesson(l, distToYardM) {
  const k = learned(l);
  if (k.delivered || k.dropped || k.built || !MATERIALS.some((r) => l.carried[r] > 0)) return null;
  return distToYardM <= DROP_NOTE_M ? DROP_NOTE : null;
}

const VERB = { weed: 'remove the weeds', source: 'gather', node: 'harvest', dig: 'dig' };

// The one short prompt to show now, or null.
// s: { step (tutorialStep result or null), learned, mode ('touch'|'mouse'|'keyboard'),
//      here (kind of the collectible in reach, or null), tool (the tool the tools give now),
//      working, lingering, point ('diy' | 'sale' | null: the button the hand points at) }
export function coachPrompt(s) {
  const { step, mode = 'touch', here = null, working = false, lingering = false, point = null } = s;
  const k = s.learned ?? { tookRake: true, worked: true, tookShovel: true, dug: true, gathered: true, delivered: true };
  if (here && !working) {
    if (here === 'tools') {
      const tool = s.tool ?? step?.tool;
      if (tool && (step?.phase === 'take' || lingering)) return `Stand still to take the ${tool}`;
    } else {
      const teach = (here === 'weed' && !k.worked) || (here === 'source' && !k.gathered) || (here === 'dig' && !k.dug);
      if (teach || lingering) return `Stand still to ${VERB[here] ?? 'work'}`;
    }
  }
  if (!step) return null;
  if (step.phase === 'move') return mode === 'keyboard' ? 'Move with WASD or the arrow keys' : 'Drag anywhere to move';
  if (step.phase === 'choose') return 'Choose your first crop: remove the weeds on any patch';
  if (step.phase === 'stock') return 'Walk past the table to set out your crops';
  if (step.phase === 'sale') return mode === 'keyboard' ? 'The table is full: press E for Yard Sale' : 'The table is full: tap Yard Sale';
  if (step.phase === 'take' && step.tool === 'shovel' && here !== 'tools' && !working) return 'Now take the shovel';
  // v0.23 (Tiffany: "Don't have the arrow point at DIY"): no hand points at the DIY button; at the
  // part the button itself says DIY, and only the keyboard gets its key named
  if (step.phase === 'build' && s.atSite) return mode === 'keyboard' ? 'Press E to DIY' : null;
  return null;
}
