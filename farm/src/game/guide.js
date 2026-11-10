// Goal card: one pure function of the ledger (annex §C.8 replaces the BASE tutorial target
// picker `getMainTarget`). It names the next action and its first missing resource or source
// (spec §4), in route order. The target is the place to walk to now: the first source in order
// that has units (or the tree while no stick lies under it), so the first-actions
// guide never points at an empty pile or rock.
// v0.11 (captain 2026-11-02): the opening is take the rake -> choose a first crop by raking any
// of the three crop patches (corn, sunflowers or the tomato bed) -> rake its other clump (its
// stage commits free) -> take the shovel -> dig its two spots -> gather wood and stone while it
// grows (they can go onto the material pile by the house) -> harvest -> sell -> build the house
// foundation. After that the goal line walks the whole route to the home (H5): every station has a Build
// card, the other two crops open after the first harvest, and Vanessa hammers each build up. A
// goal that needs a tool she is not holding points at the tools (`target: 'tools'`, `tool`).
// v0.12 (captain's v0.11 playtest): coins come from the yard-sale table (walk past it with crops,
// then Yard Sale once it holds six); the next build's needs show at the bottom of the screen and
// become its DIY button once she has them all (`buildBar`); wood comes from the starter piles and
// then the sticks around the tree; a weed over her crops comes first, before its plant wilts; the
// tomatoes wait for the raised bed, which is built first.
// v0.13 (captain's v0.12 playtest): a sale needs six at least on the tables, which grow with the
// house (one per house stage, four at most), so the goal line sells once six are out and nothing
// she carries still fits; a tool she has taken once comes to her at the job (P29-7), so the goal
// line sends her to the tools only for a tool she has never taken.
// v0.21 (design audit 5, "one voice on screen": "one goal line, one line long on phones, icon-first
// (Walls · 🪵6 🪨4 🪙10)"): every goal also carries `line`, what the screen shows in one line:
// { icon?, label, needs?: [[res, n]], now?: the need she is after now, tail?: a few words }. A
// build is its short name and what is still missing, as icons and numbers; a step is an icon and
// two or three words. `text` stays the whole sentence: it is what a screen reader hears.
import { BASE_STAGE, BASE_STAGES, CAPACITY, CROPS, NODES, PILES, PRICES, REGROW, RESOURCE_UNIT, ROUTE, SALE_MIN, STAGES, STICK_SLOTS } from './data.js';
import {
  available, firstStage, isCommitted, isFirstCrop, isFree, mainComplete, missingPrereqs, nodeEstablished, plotWeeds,
  regrowWeeds, saleReady, shortage, stageState, tableAvailable, tableCount, tableRoom, toolComes, undug,
} from './ledger.js';

export const WOOD_PILES = Object.keys(PILES).filter((k) => PILES[k].res === 'W'); // the starter logs by the path
export const WOOD_SOURCES = [...WOOD_PILES, ...STICK_SLOTS];
// rocks in the order the goal line names them: the recovery rock (only ever there when a save
// needed it), then R1 and R2 by the house approach, then outward around the map (§3 P25-6). The
// game swaps in the rock nearest Vanessa that still has stone (main.js).
export const ROCK_ORDER = ['RX', 'R1', 'R2', 'R5', 'R4', 'R6', 'R3', 'R8', 'R7'];
// the crop patches, in the order the choice names them
export const CHOICE = ['C', 'S', 'T'];
export const PATCH_NAME = { C: 'corn', S: 'sunflowers', T: 'tomatoes' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
// short names for the goal line, so a build and its needs fit one line on a phone
export const SHORT_LABEL = {
  C0: 'Corn patch', S0: 'Sunflowers', T0: 'Raised bed', H1: 'Foundation', G1: 'Path', H2: 'Walls', A1: 'Archer', C1: 'More corn',
  S1: 'More sunflowers', G2: 'Bench', G3: 'Step stones', G4: 'Tree stones', H3: 'Roof', H4: 'Chimney', H5: 'Home',
};
const NEED_ORDER = ['W', 'R', 'coins'];
// the line of a build that still needs things: its short name, each need with its number, the
// one she is after now, and a word when she can only wait
export const needsLine = (id, short, now = null, tail = null) => ({
  label: SHORT_LABEL[id] ?? cap(STAGES[id].label),
  needs: NEED_ORDER.filter((k) => short[k] > 0).map((k) => [k, short[k]]),
  ...(now ? { now } : {}), ...(tail ? { tail } : {}),
});

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
const cropsCarried = (l) => CROPS.reduce((n, c) => n + l.carried[c], 0);
// she must walk to the house for this tool: she does not hold it and has never taken it
// (`come`: Help me finish brings every tool by itself, P29-7)
const mustFetch = (l, tool, come = false) => !come && l.tool !== tool && !toolComes(l, tool);
// what is out on the tables, and what is out plus on her head, in coins
const outValue = (l) => CROPS.reduce((n, c) => n + l.table[c] * PRICES[c], 0);
// a sale is the next thing to do: six at least are out, and nothing she carries still fits or
// what is out and on her head pays for the build (v0.13: the tables hold more as the house grows;
// the goal line sells what the build needs rather than filling every table first)
const sellNow = (l, short) => saleReady(l)
  && (tableRoom(l) === 0 || covers(l, short) || !anyReady(l, pickable(l)));
// what is out and on her head makes a sale (six at least) that pays for the build
const covers = (l, short) => tableCount(l) + cropsCarried(l) >= SALE_MIN && outValue(l) + cropValue(l) >= short;
// the planted crops she still has room on her head for (v0.13: with more tables, a full head goes
// to the table even when they would hold more)
const pickable = (l) => planted(l).filter((id) => l.carried[NODES[id].res] < CAPACITY);
// her crops go onto the tables now: what she carries fills them, pays for the build, or nothing
// more she can pick is ready
const setOutNow = (l, short, cropReady) => cropsCarried(l) > 0 && tableAvailable(l) && tableRoom(l) > 0
  && (cropsCarried(l) >= tableRoom(l) || covers(l, short) || !cropReady);
// the button a stage's bottom line becomes once she has everything
export const actionVerb = (id) => (STAGES[id].hire ? 'Hire' : STAGES[id].crop && !STAGES[id].W ? 'Plant' : 'DIY');

// the first uncleared weed on each crop patch she can still choose (the three-coloured arrows)
export function choiceTargets(l) {
  return CHOICE.map((c) => ({ crop: c, target: plotWeeds(BASE_STAGE[c]).find((w) => !l.weeds[w]) ?? null }))
    .filter((x) => x.target);
}

// v0.20 (audit 2): the first wood is the two log piles by the path, so while one of them has wood
// the line names them (it said "sticks by the tree", where nothing lies yet); after that, the sticks
function gather(l, label, r, n) {
  if (r === 'W') {
    const logs = WOOD_PILES.filter((id) => ready(l, id));
    if (logs.length) return { text: `${label} · ${n} more wood: pick up the logs by the path`, target: logs[0] };
    const lying = anyReady(l, STICK_SLOTS);
    const text = lying ? 'pick up sticks by the tree' : 'a stick falls from the tree soon';
    return { text: `${label} · ${n} more wood: ${text}`, target: readySource(l, STICK_SLOTS, 'k1'), ...(lying ? {} : { wait: 'stick coming' }) };
  }
  return { text: `${label} · ${n} more stone: gather it from the rocks`, target: readySource(l, ROCK_ORDER, null) };
}

// v0.20 (audit 2: "Growing" on spots not planted yet): what the status line says beside a crop
// spot that has nothing to pick. A planted one is growing (or under weeds); one that is not dug
// yet wants the shovel, after its patch's weeds; a patch she has not opened says nothing.
export function spotStatus(l, id) {
  if (l.overgrown[id] !== null) return 'Weeds! Rake them before it wilts';
  if (l.nodes[id].dug) return 'Growing';
  const stage = NODES[id].stage;
  const weeds = plotWeeds(stage).filter((w) => !l.weeds[w]);
  if (isCommitted(l, stage)) return weeds.length ? 'Rake its weeds, then dig it with the shovel' : l.tool === 'shovel' ? 'Stand still to dig it' : 'Dig it with the shovel';
  // her free first crop: its patch is planted as soon as its weeds are raked
  if (weeds.length && BASE_STAGES.includes(stage) && (!l.crop || isFirstCrop(l, stage))) return 'Rake the weeds here, then dig it with the shovel';
  return null;
}

// v0.21: the crop to harvest next for coins: of the ripe plants she has room for, the one whose
// crop pays best (tomatoes 5, sunflowers 3, corn 2), in node order within a crop. Before, it was
// the first ripe one in node order, so the line kept to the corn and the dearer plots stood ripe.
export function bestHarvest(l, nodes = pickable(l)) {
  let best = null;
  for (const id of nodes) if (ready(l, id) && (!best || PRICES[NODES[id].res] > PRICES[NODES[best].res])) best = id;
  return best;
}

// coins for a stage: a full table sells with Yard Sale; crops on her head go onto the table;
// otherwise harvest (or wait for the crops to grow)
function coinsGoal(l, label, short) {
  if (sellNow(l, short)) return { text: `${label} · ${short} more coins: the goods are out, go to the back of the table and tap Yard Sale`, target: 'table', sale: true };
  const nodes = pickable(l);
  const cropReady = anyReady(l, nodes);
  // to the table once what she carries fills it, or nothing more is ready to pick
  if (setOutNow(l, short, cropReady)) {
    return { text: `${label} · ${short} more coins: walk past the yard-sale table to set out your crops`, target: 'table' };
  }
  const all = planted(l);
  return { text: `${label} · ${short} more coins: ${cropReady ? 'harvest your crops' : 'your crops are growing'}, then set them out on the yard-sale table`, target: bestHarvest(l, nodes) ?? nodes[0] ?? all[0] ?? null, ...(cropReady ? {} : { wait: 'crops growing' }) };
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
// the bottom line's count (v0.12, captain: "materials accumulate, the needed amount appears at the
// bottom"): "Walls: 6 wood, 4 stone, 10 coins", what is still to get, counting down
export function needText(label, short) {
  const parts = [];
  if (short.W) parts.push(`${short.W} wood`);
  if (short.R) parts.push(`${short.R} stone`);
  if (short.coins) parts.push(`${short.coins} coin${short.coins === 1 ? '' : 's'}`);
  return `${cap(label)}: ${parts.join(', ')}`;
}

// a crop stage's own steps: rake its weeds (rake), plant it (or build the raised bed), dig its
// spots (shovel; also a wilted plant's spot, `Replant`)
function cropSteps(l, id, label, come = false) {
  const weeds = plotWeeds(id).filter((w) => !l.weeds[w]);
  const where = isFirstCrop(l, id) ? null : (SHORT_LABEL[id] ?? STAGES[id].label).toLowerCase(); // a later patch is named, her first one is the only one
  if (weeds.length) {
    if (mustFetch(l, 'rake', come)) return { text: `${label} · Take the rake: it leans by the house`, target: 'tools', tool: 'rake', line: { icon: 'rake', label: 'Take the rake' } };
    return { text: `${label} · Stand still beside the weeds to rake them`, target: weeds[0], line: { icon: 'weed', label: 'Rake the weeds', ...(where ? { tail: where } : {}) } };
  }
  if (!isCommitted(l, id)) return null; // plant it (or DIY the bed) at its spot first (the caller)
  const spots = undug(l).filter((n) => NODES[n].stage === id);
  if (spots.length) {
    if (mustFetch(l, 'shovel', come)) return { text: `${label} · ${spots.some((n) => l.wilted?.[n]) ? 'Replant: take' : 'Now take'} the shovel by the house`, target: 'tools', tool: 'shovel', line: { icon: 'shovel', label: 'Take the shovel' } };
    const re = l.wilted?.[spots[0]];
    if (re) return { text: `${label} · Replant: dig the wilted spot with the shovel`, target: spots[0], line: { icon: 'shovel', label: 'Replant the wilted spot' } };
    return { text: `${label} · Stand still beside a spot to dig it`, target: spots[0], line: { icon: 'shovel', label: spots.length > 1 ? 'Dig the spots' : 'Dig the spot', ...(where ? { tail: where } : {}) } };
  }
  return null;
}

// The goal line's order (spec v0.11 §6.4, each first crop's route): the house foundation (the
// DIY lesson), the path, the cheaper of the other two crop plots, the walls, the archer, the
// last plot, then the §6.3 order (v0.12: the tomatoes' plot is their raised bed, built by DIY).
export function goalOrder(l) {
  const others = BASE_STAGES.filter((id) => !isFirstCrop(l, id)).sort((a, b) => STAGES[a].coins - STAGES[b].coins);
  const head = ['H1', 'G1', 'G2', others[0], 'H2', 'A1', others[1]];
  // her first crop leads (with the tomatoes its raised bed is built first, by DIY)
  const first = firstStage(l);
  return [...(first ? [first] : []), ...head, ...ROUTE.filter((id) => !head.includes(id) && !isFirstCrop(l, id))];
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

// v0.12: the bottom line. The stage she stands at (when she can build it now), else the goal
// line's next build; what is still to get for it, or, once she has everything, its DIY (Hire,
// Buy seeds) button, which works only at its site. -> null when no build is next.
// -> { stage, label, short, ready, here, verb, text }
export function buildBar(l, hereId = null) {
  const buildable = (id) => !!id && id in STAGES && !isCommitted(l, id) && !isFree(l, id) && stageState(l, id) === 'OPEN';
  const id = buildable(hereId) ? hereId : nextStage(l);
  if (!id || isCommitted(l, id) || isFree(l, id) || missingPrereqs(l, id).length) return null;
  const short = shortage(l, id);
  const ready = short.coins + short.W + short.R === 0 && stageState(l, id) === 'OPEN';
  const label = STAGES[id].label;
  const verb = actionVerb(id);
  const here = hereId === id;
  const text = !ready ? needText(label, short) : here ? `${verb}: ${label}` : `${cap(label)}: go there to ${verb === 'DIY' ? 'build it' : verb.toLowerCase()}`;
  return { stage: id, label, short, ready, here, verb, text };
}

// -> { text, target, tool?, choice?, sale?, weed? } where target is a station id to point at (or
// null); `choice` (the first crop not chosen yet) lists one weed per crop patch
// opts.toolsCome: Help me finish (every tool comes to her, so the goal line never sends her to
// the tools)
export function nextGoal(l, { toolsCome = false } = {}) {
  if (mainComplete(l)) return { text: 'The farm is finished. Keep exploring, gathering and selling if you like.', target: null, line: { icon: 'check', label: 'The farm is finished' } };
  // the free first crop: rake any crop patch
  if (!l.crop) {
    if (mustFetch(l, 'rake', toolsCome)) return { text: 'Take the rake: it leans by the house', target: 'tools', tool: 'rake', line: { icon: 'rake', label: 'Take the rake' } };
    const choice = choiceTargets(l);
    return { text: 'Choose your first crop: rake the weeds on the corn, the sunflowers or the tomato bed', target: choice[0]?.target ?? null, choice, line: { icon: 'weed', label: 'Choose a crop', tail: 'rake it' } };
  }
  // a weed over her crops, once it has grown to a clump: rake it before the plant under it wilts
  const over = regrowWeeds(l).filter((w) => l.activeMs - l.overgrown[w.slice(3)] >= REGROW.warnMs);
  if (over.length) {
    const node = over[0].slice(3);
    const what = PATCH_NAME[NODES[node].res];
    const line = l.activeMs - l.overgrown[node] >= REGROW.growMs ? `Weeds are choking a ${RESOURCE_UNIT[NODES[node].res]} plant` : `Weeds in the ${what}: rake them before the plant wilts`;
    const choking = l.activeMs - l.overgrown[node] >= REGROW.growMs;
    if (mustFetch(l, 'rake', toolsCome)) return { text: `${line} · Take the rake by the house`, target: 'tools', tool: 'rake', weed: true, line: { icon: 'rake', label: 'Take the rake', tail: `${what} weeds` } };
    return { text: line, target: over[0], weed: true, line: { icon: 'weed', label: choking ? 'Wilting soon!' : 'Weeds!', tail: `rake the ${what}` } };
  }
  const first = firstStage(l);
  const firstLabel = cap(PATCH_NAME[l.crop]);
  const own = cropSteps(l, first, firstLabel, toolsCome);
  if (own) return own;
  const id = nextStage(l);
  if (!id) return { text: 'Keep gathering and selling while the next build opens.', target: null, line: { label: 'Keep gathering and selling' } };
  const s = STAGES[id];
  const label = cap(s.label);
  if (s.crop) {
    const step = cropSteps(l, id, label, toolsCome);
    if (step) return step;
  }
  const short = shortage(l, id);
  if (short.coins + short.W + short.R === 0) {
    const verb = actionVerb(id);
    return { text: `${label} · You have everything: ${verb === 'DIY' ? 'DIY it' : verb.toLowerCase()} at its spot`, target: id, line: { icon: 'check', label: SHORT_LABEL[id] ?? label, tail: 'ready!' } };
  }
  // what is still missing, as icons and numbers; the need she is after now is marked
  const lined = (g, now) => ({ ...g, line: needsLine(id, short, now, g.wait ?? null) });
  // a full table sells now; crops on her head go onto the table once they fill it (or nothing
  // more is ready to harvest)
  if (short.coins > 0 && sellNow(l, short.coins)) return lined(coinsGoal(l, label, short.coins), 'coins');
  if (short.coins > 0 && tableAvailable(l) && cropsCarried(l) > 0 && (cropsCarried(l) >= tableRoom(l) || covers(l, short.coins))) {
    return lined(coinsGoal(l, label, short.coins), 'coins');
  }
  // her crops grow while she gathers the wood and stone
  if (short.W > 0) return lined(gather(l, label, 'W', short.W), 'W');
  if (short.R > 0) return lined(gather(l, label, 'R', short.R), 'R');
  return lined(coinsGoal(l, label, short.coins), 'coins');
}
