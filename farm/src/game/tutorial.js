// First-actions guide (captain phone test 2026-11-01: "add more tutorial guides in the first
// 2-3 actions so the player knows it needs to open them"). Pure: a function of the ledger plus
// whether the player has moved yet this session, so it needs no save field, picks up where a
// reload left off and never comes back once learned.
//
// v0.11 (captain 2026-11-02, replacing v0.9's steps 1-2 and 7): after the drag demo the arrow
// follows the goal line through the opening, with one short prompt at each first action:
//   1. take the rake: the arrow leads to the tools, `Stand still to take the rake`;
//   2. choose a crop: three arrows, one per crop patch, in the crop's colour (corn yellow,
//      sunflower gold, tomato red), `Choose a crop: rake any patch`; the first clump she rakes
//      makes it her crop, then a single arrow leads to its other clump (the rake goes back by
//      itself when no weed she needs is left);
//   3. take the shovel: the arrow leads back to the tools (`Now take the shovel`);
//   4. dig: `Stand still to dig` at the patch; the plant comes up in colour;
//   5. gather while it grows: `Stand still to gather` at the first branch pile and rock R1;
//   6. drop: once the wood and stone she needs are on her head, the arrow leads to the material
//      pile by the house, `Walk through the pile to drop your load`;
//   7. sell (P24-4b as built): once crops are harvested the arrow leads to the market crate, a
//      hand points at `Open market crate` and the card pulses `Sell all crops`;
//   8. build: at the house foundation H1, the first build, a hand points at its Build button and
//      the card pulses Build.
// It all goes after the first H1 Build. Afterwards only the self-explaining hint remains:
// lingering in reach of a collectible while moving says "Stand still to ...".
import { MATERIALS, NODES, PILES, ROCKS, SPOTS, STAGES, WEEDS } from './data.js';
import { choiceTargets, nextGoal } from './guide.js';
import { crateAvailable, digOpen, isCommitted } from './ledger.js';

export const TUTORIAL_STAGE = 'H1'; // the first build (v0.11: crops take no materials)
export const MOVED_M = 1.2; // metres of travel that count as "has moved"
export const LINGER_MS = 600; // moving in reach of a collectible this long shows the hint
// the three arrows of the crop choice (captain: "The arrow in the tutorial shows 3 different
// colors at the stage when you choose what to weed"): corn yellow, sunflower gold, tomato red
export const CHOICE_COLOURS = { C: '#e8c547', S: '#e0952b', T: '#c8463b' };

// what the player has shown they know, derived from the ledger
export function learned(l) {
  const dep = l.stages[TUTORIAL_STAGE].deposited;
  const delivered = isCommitted(l, TUTORIAL_STAGE) || dep.coins + dep.W + dep.R > 0;
  const dug = Object.values(l.nodes).some((n) => n.dug);
  const gathered = delivered || MATERIALS.some((r) => l.carried[r] > 0 || l.yard[r] > 0)
    || Object.entries(PILES).some(([id, p]) => l.piles[id] < p.units)
    || Object.entries(ROCKS).some(([id, r]) => !r.recovery && l.rocks[id] < r.units);
  const worked = WEEDS.some((id) => l.weeds[id]);
  const chose = l.crop !== null;
  const tookRake = worked || l.tool === 'rake';
  const tookShovel = dug || l.tool === 'shovel';
  const dropped = delivered || l.yard.W + l.yard.R > 0;
  const sold = l.sold.C + l.sold.S + l.sold.T > 0;
  return { tookRake, chose, worked, tookShovel, dug, gathered, dropped, sold, delivered };
}

const sellable = (l) => l.carried.C + l.carried.S + l.carried.T;

// the kind of a goal target; with the ledger a crop node that waits to be dug is a 'dig' spot
export function kindOf(id, l = null) {
  if (id === 'tools') return 'tools';
  if (id === 'yard') return 'yard';
  if (WEEDS.includes(id)) return 'weed';
  if (id in PILES || id in SPOTS || id in ROCKS) return 'source';
  if (id in NODES) return l && digOpen(l, id) ? 'dig' : 'node';
  if (id in STAGES) return 'mat';
  if (id === 'crate') return 'crate';
  return null;
}

// -> null when learned, else { phase, target, kind, tool?, choice? }
// phase: 'move' (not moved yet) | 'take' | 'choose' | 'work' | 'dig' | 'gather' | 'drop' |
//        'sell' | 'build' (a step to teach at `target`) | 'go' (an arrow to the goal line's
//        target, nothing new there). `choice` (phase 'choose'): [{ crop, target, colour }], one
//        arrow per crop patch.
export function tutorialStep(l, { moved = false } = {}) {
  const k = learned(l);
  if (k.delivered) return null;
  // P24-4b: harvested crops in hand before the first sale: the arrow leads to the crate
  if (!k.sold && sellable(l) > 0 && crateAvailable(l)) return { phase: 'sell', target: 'crate', kind: 'crate' };
  const goal = nextGoal(l);
  let { target } = goal;
  if (!target) return null;
  let kind = kindOf(target, l);
  // the load she needs is on her head: show her the pile by the house once
  if (k.gathered && !k.dropped && MATERIALS.some((r) => l.carried[r] > 0) && kind !== 'source' && kind !== 'tools' && kind !== 'dig') {
    target = 'yard';
    kind = 'yard';
    return { phase: 'drop', target, kind };
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
  else if (target === TUTORIAL_STAGE) phase = 'build';
  return goal.tool ? { phase, target, kind, tool: goal.tool } : { phase, target, kind };
}

const VERB = { weed: 'rake the weeds', source: 'gather', node: 'harvest', dig: 'dig' };

// The one short prompt to show now, or null.
// s: { step (tutorialStep result or null), learned, mode ('touch'|'mouse'|'keyboard'),
//      here (kind of the collectible in reach, or null), tool (the tool the tools give now),
//      working, lingering, atMat (the context action is the coached mat or crate), cardOpen }
// At the crate (phase 'sell') the hand alone points at `Open market crate`: no extra line.
export function coachPrompt(s) {
  const { step, mode = 'touch', here = null, working = false, lingering = false, atMat = false, cardOpen = false } = s;
  const k = s.learned ?? { tookRake: true, worked: true, tookShovel: true, dug: true, gathered: true, delivered: true };
  if (cardOpen) return null; // the card coaches its own Build button
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
  if (step.phase === 'choose') return 'Choose your first crop: rake any patch';
  if (step.phase === 'drop') return 'Walk through the pile to drop your load';
  if (step.phase === 'take' && step.tool === 'shovel' && here !== 'tools' && !working) return 'Now take the shovel';
  if (step.phase === 'build' && atMat) return mode === 'keyboard' ? 'Press E to open Build' : 'Tap to open Build';
  return null;
}
