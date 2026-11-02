// Goal card: one pure function of the ledger (annex §C.8 replaces the BASE tutorial target
// picker `getMainTarget`). It names the next unlocked action and its first missing resource or
// source (spec §4), in table order, for the stages this slice builds. The target is the place to
// walk to now: the first source in order that has units (or the renewable wood spot while
// everything is returning), so the first-actions guide never points at an empty pile or rock.
// v0.9 (P25-4): the opening is take the rake -> clear the three weeds -> take the shovel -> dig
// the corn plot (C0 commits free once its two weeds are cleared) -> gather the starter wood and
// stone while the corn grows -> harvest -> sell -> deliver to the house foundation. A goal that
// needs a tool she is not holding points at the tools (`target: 'tools'`, `tool`).
import { NODES, OPENING_WEEDS, PILES, PRICES } from './data.js';
import { available, crateAvailable, isCommitted, shortage, undug } from './ledger.js';

const woodSources = [...Object.keys(PILES).filter((k) => PILES[k].res === 'W'), 'sW'];
// rocks in the order the goal line names them: the recovery rock (only ever there when a save
// needed it), then R1 and R2 by the house approach, then outward around the map (§3 P25-6). The
// game swaps in the rock nearest Vanessa that still has stone (main.js).
export const ROCK_ORDER = ['RX', 'R1', 'R2', 'R5', 'R4', 'R6', 'R3', 'R8', 'R7'];
const CORN_C0 = ['c1', 'c2'];

const ready = (l, id) => available(l, id) > 0 && (NODES[id] ? isCommitted(l, NODES[id].stage) && l.nodes[id].dug : true);
const anyReady = (l, ids) => ids.some((id) => ready(l, id));
// first source in `ids` that has units now, else `fallback` (by default the last one)
function readySource(l, ids, fallback = ids.at(-1)) {
  return ids.find((id) => ready(l, id)) ?? fallback;
}

function gather(l, label, r, n) {
  if (r === 'W') {
    const text = anyReady(l, woodSources) ? 'gather wood by the tree' : 'a branch falls from the tree soon';
    return { text: `${label} · Need ${n} more wood: ${text}`, target: readySource(l, woodSources) };
  }
  return { text: `${label} · Need ${n} more stone: gather it from the rocks`, target: readySource(l, ROCK_ORDER, null) };
}

// -> { text, target, tool? } where target is a station id to point at (or null)
export function nextGoal(l) {
  const weeds = OPENING_WEEDS.filter((id) => !l.weeds[id]);
  if (weeds.length) {
    if (l.tool !== 'rake') return { text: 'Take the rake: it leans by the house', target: 'tools', tool: 'rake' };
    return { text: 'Stand still beside the weeds to clear them with the rake', target: weeds[0] };
  }
  const spots = undug(l).filter((id) => CORN_C0.includes(id));
  if (spots.length) {
    if (l.tool !== 'shovel') return { text: 'Corn plot · Now take the shovel by the house', target: 'tools', tool: 'shovel' };
    return { text: 'Corn plot · Stand still beside a spot to dig it', target: spots[0] };
  }
  if (!isCommitted(l, 'H1')) {
    const short = shortage(l, 'H1');
    const label = 'Foundation';
    const value = l.carried.C * PRICES.C + l.carried.S * PRICES.S + l.carried.T * PRICES.T;
    const cornReady = anyReady(l, CORN_C0);
    // sell once the crops in hand cover the coins (or nothing more is ready to harvest)
    if (short.coins > 0 && value > 0 && crateAvailable(l) && (value >= short.coins || !cornReady)) {
      return { text: `${label} · Need ${short.coins} more coins: sell crops at the market crate`, target: 'crate' };
    }
    // the corn grows while she gathers the wood and stone
    if (short.W > 0) return gather(l, label, 'W', short.W);
    if (short.R > 0) return gather(l, label, 'R', short.R);
    if (short.coins > 0) {
      return { text: `${label} · Need ${short.coins} more coins: ${cornReady ? 'harvest corn' : 'corn is growing'}, then sell it at the market crate`, target: readySource(l, CORN_C0, 'c1') };
    }
    return { text: `${label} · Review the house mat and confirm delivery`, target: 'H1' };
  }
  return { text: 'Foundation laid! This test build stops here: keep gathering and selling if you like.', target: null };
}
