// Goal card: one pure function of the ledger (annex §C.8 replaces the BASE tutorial target
// picker `getMainTarget`). It names the next action and its first missing resource or source
// (spec §4), in route order. The target is the place to walk to now: the first source in order
// that has units (or the renewable wood spot while everything is returning), so the first-actions
// guide never points at an empty pile or rock.
// v0.11 (captain 2026-11-02): the opening is take the rake -> choose a first crop by raking any
// of the three crop patches (corn, sunflowers or the tomato bed) -> rake its other clump (its
// stage commits free) -> take the shovel -> dig its two spots -> gather wood and stone while it
// grows (they can go onto the material pile by the house) -> harvest -> sell -> build the house
// foundation. After that the goal line walks the whole route to H4: every station has a Build
// card, the other two crops open after the first harvest, and Vanessa hammers each build up. A
// goal that needs a tool she is not holding points at the tools (`target: 'tools'`, `tool`).
import { BASE_STAGE, BASE_STAGES, CROPS, NODES, PILES, PRICES, ROUTE, STAGES } from './data.js';
import {
  available, crateAvailable, firstStage, isCommitted, isFirstCrop, mainComplete, missingPrereqs, nodeEstablished, plotWeeds, shortage, stageState,
  undug,
} from './ledger.js';

const woodSources = [...Object.keys(PILES).filter((k) => PILES[k].res === 'W'), 'sW'];
// rocks in the order the goal line names them: the recovery rock (only ever there when a save
// needed it), then R1 and R2 by the house approach, then outward around the map (§3 P25-6). The
// game swaps in the rock nearest Vanessa that still has stone (main.js).
export const ROCK_ORDER = ['RX', 'R1', 'R2', 'R5', 'R4', 'R6', 'R3', 'R8', 'R7'];
// the crop patches, in the order the choice names them
export const CHOICE = ['C', 'S', 'T'];
export const PATCH_NAME = { C: 'corn', S: 'sunflowers', T: 'tomatoes' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const ready = (l, id) => available(l, id) > 0 && (NODES[id] ? nodeEstablished(l, id) : true);
const anyReady = (l, ids) => ids.some((id) => ready(l, id));
// first source in `ids` that has units now, else `fallback` (by default the last one)
function readySource(l, ids, fallback = ids.at(-1)) {
  return ids.find((id) => ready(l, id)) ?? fallback;
}
// the crop nodes she has planted (dug), in node order
const planted = (l) => Object.keys(NODES).filter((id) => nodeEstablished(l, id));
// the value of the crops on her head
export const cropValue = (l) => CROPS.reduce((n, c) => n + l.carried[c] * PRICES[c], 0);

// the first uncleared weed on each crop patch she can still choose (the three-coloured arrows)
export function choiceTargets(l) {
  return CHOICE.map((c) => ({ crop: c, target: plotWeeds(BASE_STAGE[c]).find((w) => !l.weeds[w]) ?? null }))
    .filter((x) => x.target);
}

function gather(l, label, r, n) {
  if (r === 'W') {
    const text = anyReady(l, woodSources) ? 'gather wood by the tree' : 'a branch falls from the tree soon';
    return { text: `${label} · ${n} more wood: ${text}`, target: readySource(l, woodSources) };
  }
  return { text: `${label} · ${n} more stone: gather it from the rocks`, target: readySource(l, ROCK_ORDER, null) };
}

// coins for a stage: sell the crops in hand once they cover it (or nothing more is ready),
// otherwise harvest
function coinsGoal(l, label, short) {
  const value = cropValue(l);
  const nodes = planted(l);
  const cropReady = anyReady(l, nodes);
  if (value > 0 && crateAvailable(l) && (value >= short || !cropReady)) {
    return { text: `${label} · ${short} more coins: sell crops at the market crate`, target: 'crate' };
  }
  return { text: `${label} · ${short} more coins: ${cropReady ? 'harvest your crops' : 'your crops are growing'}, then sell them at the market crate`, target: readySource(l, nodes, nodes[0] ?? null) };
}

// what is still to get for a stage, in plain words: "2 wood and 3 stone to go" (v0.11 card)
export function toGoText(short) {
  const parts = [];
  if (short.W) parts.push(`${short.W} wood`);
  if (short.R) parts.push(`${short.R} stone`);
  if (short.coins) parts.push(`${short.coins} coin${short.coins === 1 ? '' : 's'}`);
  if (!parts.length) return 'everything is here';
  return `${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]} to go`;
}

// a crop stage's own steps: rake its weeds (rake), pay at its station, dig its spots (shovel)
function cropSteps(l, id, label) {
  const weeds = plotWeeds(id).filter((w) => !l.weeds[w]);
  if (weeds.length) {
    if (l.tool !== 'rake') return { text: `${label} · Take the rake: it leans by the house`, target: 'tools', tool: 'rake' };
    return { text: `${label} · Stand still beside the weeds to rake them`, target: weeds[0] };
  }
  if (!isCommitted(l, id)) return null; // pay at the station first (the caller)
  const spots = undug(l).filter((n) => NODES[n].stage === id);
  if (spots.length) {
    if (l.tool !== 'shovel') return { text: `${label} · Now take the shovel by the house`, target: 'tools', tool: 'shovel' };
    return { text: `${label} · Stand still beside a spot to dig it`, target: spots[0] };
  }
  return null;
}

// The goal line's order (spec v0.11 §6.4, each first crop's route): the house foundation (the
// Build lesson), the path, the cheaper of the other two crop plots, the walls, the archer, the
// last plot, then the §6.3 order.
export function goalOrder(l) {
  const others = BASE_STAGES.filter((id) => !isFirstCrop(l, id)).sort((a, b) => STAGES[a].coins - STAGES[b].coins);
  const head = ['H1', 'G1', others[0], 'H2', 'A1', others[1]];
  return [...head, ...ROUTE.filter((id) => !head.includes(id) && !isFirstCrop(l, id))];
}
// the next stage the goal line works on: the first one in goalOrder not built whose
// prerequisites are met (open, or waiting only for its weeds)
export function nextStage(l) {
  return goalOrder(l).find((id) => {
    if (isCommitted(l, id)) {
      // a planted crop stage still has spots to dig
      return STAGES[id].crop && undug(l).some((n) => NODES[n].stage === id);
    }
    return stageState(l, id) === 'OPEN' || !missingPrereqs(l, id).length; // open, or only its weeds left
  }) ?? null;
}

// -> { text, target, tool?, choice? } where target is a station id to point at (or null);
// `choice` (the first crop not chosen yet) lists one weed per crop patch
export function nextGoal(l) {
  if (mainComplete(l)) return { text: 'The farm is finished. Keep exploring, gathering and selling if you like.', target: null };
  // the free first crop: rake any crop patch
  if (!l.crop) {
    if (l.tool !== 'rake') return { text: 'Take the rake: it leans by the house', target: 'tools', tool: 'rake' };
    const choice = choiceTargets(l);
    return { text: 'Choose your first crop: rake the weeds on the corn, the sunflowers or the tomato bed', target: choice[0]?.target ?? null, choice };
  }
  const first = firstStage(l);
  const firstLabel = cap(PATCH_NAME[l.crop]);
  const own = cropSteps(l, first, firstLabel);
  if (own) return own;
  const id = nextStage(l);
  if (!id) return { text: 'Keep gathering and selling while the next build opens.', target: null };
  const s = STAGES[id];
  const label = cap(s.label);
  if (s.crop) {
    const step = cropSteps(l, id, label);
    if (step) return step;
  }
  const short = shortage(l, id);
  const value = cropValue(l);
  // sell once the crops in hand cover the coins (or nothing more is ready to harvest)
  if (short.coins > 0 && value > 0 && crateAvailable(l) && (value >= short.coins || !anyReady(l, planted(l)))) {
    return { text: `${label} · ${short.coins} more coins: sell crops at the market crate`, target: 'crate' };
  }
  // her crops grow while she gathers the wood and stone
  if (short.W > 0) return gather(l, label, 'W', short.W);
  if (short.R > 0) return gather(l, label, 'R', short.R);
  if (short.coins > 0) return coinsGoal(l, label, short.coins);
  return { text: `${label} · Everything is ready: ${s.hire ? 'hire' : 'build'} it at its station`, target: id };
}
