// First-actions guide (captain phone test 2026-11-01: "add more tutorial guides in the first
// 2-3 actions so the player knows it needs to open them"). Pure: a function of the ledger plus
// whether the player has moved yet this session, so it needs no save field, picks up where a
// reload left off and never comes back once learned.
//
// v0.9 (P25-4, replacing P24-4's steps 3-5; S25-11): after the drag demo the arrow follows the
// goal line through the new opening, with one short prompt at each first action:
//   1. take the rake: the arrow leads to the tools, `Stand still to take the rake`;
//   2. clear the weeds: `Stand still to clear the weeds` at the first clump (after the third the
//      rake goes back by itself);
//   3. take the shovel: the arrow leads back to the tools (`Now take the shovel`);
//   4. dig: `Stand still to dig` at the corn plot; the corn comes up in colour;
//   5. gather while it grows: `Stand still to gather` at the first branch pile and rock R1;
//   6. sell (P24-4b as built): once corn is harvested the arrow leads to the market crate, a hand
//      points at `Open market crate` and the card pulses `Sell all crops`;
//   7. deliver: at the house foundation H1, the first mat that takes anything, a hand points at
//      `Tap to open the delivery` and the card pulses Confirm.
// It all goes after the first H1 deposit. Afterwards only the self-explaining hint remains:
// lingering in reach of a collectible while moving says "Stand still to ...".
import { MATERIALS, NODES, OPENING_WEEDS, PILES, ROCKS, SPOTS, STAGES, WEEDS } from './data.js';
import { nextGoal } from './guide.js';
import { crateAvailable, digOpen, isCommitted } from './ledger.js';

export const TUTORIAL_STAGE = 'H1'; // the first delivery mat (v0.9: C0 takes nothing)
export const MOVED_M = 1.2; // metres of travel that count as "has moved"
export const LINGER_MS = 600; // moving in reach of a collectible this long shows the hint

// what the player has shown they know, derived from the ledger
export function learned(l) {
  const dep = l.stages[TUTORIAL_STAGE].deposited;
  const delivered = isCommitted(l, TUTORIAL_STAGE) || dep.coins + dep.W + dep.R > 0;
  const dug = Object.values(l.nodes).some((n) => n.dug);
  const gathered = delivered || MATERIALS.some((r) => l.carried[r] > 0)
    || Object.entries(PILES).some(([id, p]) => l.piles[id] < p.units)
    || Object.entries(ROCKS).some(([id, r]) => !r.recovery && l.rocks[id] < r.units);
  const worked = WEEDS.some((id) => l.weeds[id]);
  const tookRake = worked || l.tool === 'rake';
  const tookShovel = dug || l.tool === 'shovel';
  const sold = l.sold.C + l.sold.S + l.sold.T > 0;
  return { tookRake, worked, tookShovel, dug, gathered, sold, delivered };
}

const sellable = (l) => l.carried.C + l.carried.S + l.carried.T;

// the kind of a goal target; with the ledger a crop node that waits to be dug is a 'dig' spot
export function kindOf(id, l = null) {
  if (id === 'tools') return 'tools';
  if (WEEDS.includes(id)) return 'weed';
  if (id in PILES || id in SPOTS || id in ROCKS) return 'source';
  if (id in NODES) return l && digOpen(l, id) ? 'dig' : 'node';
  if (id in STAGES) return 'mat';
  if (id === 'crate') return 'crate';
  return null;
}

// -> null when learned, else { phase, target, kind, tool? }
// phase: 'move' (not moved yet) | 'take' | 'work' | 'dig' | 'gather' | 'sell' | 'deliver' (a
//        step to teach at `target`) | 'go' (an arrow to the goal line's target, nothing new there)
export function tutorialStep(l, { moved = false } = {}) {
  const k = learned(l);
  if (k.delivered) return null;
  // P24-4b: harvested crops in hand before the first sale: the arrow leads to the crate
  if (!k.sold && sellable(l) > 0 && crateAvailable(l)) return { phase: 'sell', target: 'crate', kind: 'crate' };
  const goal = nextGoal(l);
  const { target } = goal;
  if (!target) return null;
  const kind = kindOf(target, l);
  let phase = 'go';
  if (!moved && !k.tookRake) phase = 'move';
  else if (kind === 'tools' && ((goal.tool === 'rake' && !k.tookRake) || (goal.tool === 'shovel' && !k.tookShovel))) phase = 'take';
  else if (kind === 'weed' && !k.worked) phase = 'work';
  else if (kind === 'dig' && !k.dug) phase = 'dig';
  else if (kind === 'source' && !k.gathered && OPENING_WEEDS.every((w) => l.weeds[w])) phase = 'gather';
  else if (target === TUTORIAL_STAGE) phase = 'deliver';
  return goal.tool ? { phase, target, kind, tool: goal.tool } : { phase, target, kind };
}

const VERB = { weed: 'clear the weeds', source: 'gather', node: 'harvest', dig: 'dig' };

// The one short prompt to show now, or null.
// s: { step (tutorialStep result or null), learned, mode ('touch'|'mouse'|'keyboard'),
//      here (kind of the collectible in reach, or null), tool (the tool the tools give now),
//      working, lingering, atMat (the context action is the coached mat or crate), cardOpen }
// At the crate (phase 'sell') the hand alone points at `Open market crate`: no extra line.
export function coachPrompt(s) {
  const { step, mode = 'touch', here = null, working = false, lingering = false, atMat = false, cardOpen = false } = s;
  const k = s.learned ?? { tookRake: true, worked: true, tookShovel: true, dug: true, gathered: true, delivered: true };
  if (cardOpen) return null; // the card coaches its own Confirm
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
  if (step.phase === 'take' && step.tool === 'shovel' && here !== 'tools' && !working) return 'Now take the shovel';
  if (step.phase === 'deliver' && atMat) return mode === 'keyboard' ? 'Press E to open the delivery' : 'Tap to open the delivery';
  return null;
}
