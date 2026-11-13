// The game-owned ledger (code-reuse annex §D.1): pure, deterministic, no three.js, no DOM.
// Every accepted transaction returns a new ledger plus events; the caller saves the new
// ledger before any presentation starts (spec §12). Views only present this state.
// v0.11 (captain 2026-11-02): wood and stone she drops at the material pile by the house wait
// there (`yard`); the first crop patch she rakes is her free first crop (`crop`, permanent: it
// also themes the cards and menus); the other two base crops open after her first harvest
// (`harvested`).
// v0.12 (captain's v0.11 playtest, 2026-11-02): crops are sold at a yard-sale table she fills by
// walking past it (`table`, `stock`, `yardSale`); a stage is built in one go with its DIY button
// once she has everything (`build`: no partial deposits, no Return); sticks drop at random spots
// around the tree and go if left (`sticks`); weeds creep back over planted crops and a plant left
// under one wilts (`overgrown`); the raised bed is built with sticks (T0); the tool upgrades are gone.
// v0.13 (captain's v0.12 playtest): the yard sale grows with the house: one table per house stage,
// four at most (`tables`), each holding six, and a sale needs six at least (`saleReady`); a tool she
// has once taken comes to her hand at the job from then on (`toolComes`, read from the farm:
// spec v0.13 P29-7, no save field).
// v0.17 (spec §7, §6.6 point 4, §6.5): birds steal crops, capped (`theft`, `steal`), a bird on the
// restored bench may leave a stain she cleans (`stain`, `cleanBench`), and a second archer (A2)
// can be hired, optional and outside the route (`ALL_STAGES`).
// v0.23 (Tiffany's notes "Farm changes #2", 2026-11-12): the farm is finished when every stage is
// built (`mainComplete`; the chimney is a new farm's last build); a yard sale is held when every
// table standing is full, and the tables come with what the builds cost (`tables`, `saleReady`);
// her crops go onto the table that has room (`stock` with `max`); a tool leaves her hand the
// moment she picks anything up (`pick`); on the finished farm weeds come up on the grass and are
// raked like any other (`yardWeeds`), and nothing takes or harms a crop; now and then a buyer has
// a wish and tips a coin for it (`saleWish`).
// v0.24 (the captain's v0.23 playtest): every weed that stands can be raked from the start (a crop
// patch's weeds no longer wait for the patch to open: `weedOpen`); the weeds on the open grass are
// there from the first moment of a farm and grow straight back when raked (`yardWeeds`, `yardBack`,
// `yardRaked`). The rake's jobs are still only the weeds the farm asks for (`jobWeeds`, `toolJobs`),
// so nothing in the route waits on the others.
// v0.25 (the captain's v0.24 playtest): the weeds of the two expansions stand, and can be raked,
// from the start too (`weedPresent`); she carries one table's worth of crops at most, what she
// harvests beyond that goes into the crate beside the tables (`crate`, no limit: `pick`), and the
// tables fill up again from the crate by themselves (`restock`, one of the ledger's own follow-ups).
// v0.28 (the captain: "I find the box counterintuitive ... you carry fruit in your head and then you
// can put them on the box or the tables, when you do the yard sale it automatically grabs fruit from
// the box"): everything she picks goes onto her head, twelve crops at most (a pick past that is
// refused, `pick`); walking past the crate empties her head into it (`stow`), like the pile by the
// house; a sale can be held once the tables and the crate together fill every standing table, and
// it fills the tables from the crate before it sells (`saleReady`, `yardSale`); after a sale the
// game fills the tables again from the crate (`restock`, no longer a follow-up of every change).
import { PERF } from '../core/perf.js';
import {
  ALL_STAGES, BASE_STAGE, BASE_STAGES, BIRDS, BIRDS_AFTER, CAPACITY, CROP_OF_STAGE, CROPS, HEAD_CROPS, HOUSE_STAGES, MATERIALS, NODE_FIRST_READY_MS,
  NODE_RENEW_MS, NODES, PILES, PRICES, REGROW, REGROW_WEEDS, regrowNode, RESOURCES, ROCKS, ROCK_IDS, ROUTE, STAGES,
  STAGE_ORDER, STICK, STICK_SLOTS, STONE_REQUIRED, TABLE_CAP, TABLE_STAGES, TOMATO_GROWTH, TOMATO_YIELD, TOOLS, WEEDS, WEED_PLOT,
  WISH, YARD_MATERIALS, YARD_WEEDS, YARD_WEED_SLOTS, isYardWeed,
} from './data.js';

const zeroRes = () => Object.fromEntries(RESOURCES.map((r) => [r, 0]));
const zeroCrops = () => Object.fromEntries(CROPS.map((c) => [c, 0]));

export function createLedger() {
  return {
    carried: zeroRes(),
    yard: { W: 0, R: 0 }, // the material pile by the house (v0.11): no cap
    table: zeroCrops(), // v0.12: the crops set out on the yard-sale table, TABLE_CAP at most
    crate: zeroCrops(), // v0.25: the crops in the crate beside the tables; no limit (v0.28: what she leaves there)
    sales: 0, // v0.12: yard sales held
    crop: null, // her first crop: null until she rakes a crop patch, then 'C', 'S' or 'T' for good
    harvested: false, // her first crop unit is picked: the other two base crops open
    purse: 0,
    lifetimeCoins: 0,
    sold: zeroCrops(),
    stages: Object.fromEntries(ALL_STAGES.map((id) => [id, { committed: false }])),
    paymentEvents: [], // committed stage IDs in commit order (each at most once)
    weeds: Object.fromEntries(WEEDS.map((id) => [id, false])), // true = cleared
    piles: Object.fromEntries(Object.entries(PILES).map(([id, p]) => [id, p.units])),
    // v0.12: sticks around the tree: units lying at each slot and when they landed
    sticks: Object.fromEntries(STICK_SLOTS.map((id) => [id, { units: 0, at: null }])),
    stickNext: null, // active time the next stick falls (from the house foundation on)
    stickSeq: 0, // sticks dropped so far (the seed of the next slot)
    // a crop node is a dig spot once its stage commits, and productive once dug (P25-4)
    nodes: Object.fromEntries(Object.keys(NODES).map((id) => [id, { remaining: 0, readyAt: null, dug: false }])),
    // v0.15: how many times each planted node's crop has come ready since it was dug (a tomato
    // plant grows with it, `plantSize`)
    grown: Object.fromEntries(Object.keys(NODES).map((id) => [id, 0])),
    // v0.12: a weed creeping over a planted node: the active time it sprouted, else null
    overgrown: Object.fromEntries(Object.keys(NODES).map((id) => [id, null])),
    wilted: Object.fromEntries(Object.keys(NODES).map((id) => [id, false])), // its plant wilted: replant it
    regrowAt: null, // active time the next weed creeps in (scheduled once regrowth is on)
    regrowSeq: 0, // weeds that have crept in so far (picks the next node)
    rocks: Object.fromEntries(ROCK_IDS.map((id) => [id, ROCKS[id].units])), // finite stone (P25-6)
    tool: null, // the tool in Vanessa's hand: null, 'rake' or 'shovel' (P25-4)
    activeMs: 0,
    // v0.17 birds (spec §7, §6.6 point 4): `rotation` counts the bird events so far (their kinds
    // take turns), `log` holds the active time of each crop taken (the rolling window's count),
    // `totalBeforeH4` the bird's takes before the home (v0.22: 5 plants at most; the name keeps the v5 field's),
    // `stain` a bird's mark on the restored bench, waiting to be cleaned
    theft: { rotation: 0, log: [], totalBeforeH4: 0, stain: false },
    // v0.23: the weeds that come up on the finished farm's grass (true = one stands at that slot),
    // the active time the next one comes, and how many have come (the seed of the next slot)
    // v0.24: they stand from the start of a farm (the first tick brings them up), and a raked one
    // is up again soon: `yardBack` holds the active time each raked weed comes back, `yardRaked`
    // how many she has raked (`yardWeedAt`, the v0.23 clock of the next one, is no longer used)
    yardWeeds: Object.fromEntries(YARD_WEED_SLOTS.map((id) => [id, false])),
    yardWeedAt: null,
    yardWeedSeq: 0,
    yardBack: [],
    yardRaked: 0,
  };
}

const clone = (l) => structuredClone(l);
const fail = (reason) => ({ ok: false, reason });
const sum = (o) => Object.values(o).reduce((n, x) => n + x, 0);

// a seeded hash of a counter: the "random" choices replay the same on every device (mulberry32)
export function seeded(n) {
  let t = (n * 0x6d2b79f5 + 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------- derived state ----------
export const isCommitted = (l, id) => l.stages[id]?.committed === true;
// her first crop's stage (C0, S0 or T0), or null before she has raked a crop patch
export const firstStage = (l) => (l.crop ? BASE_STAGE[l.crop] : null);
export const isFirstCrop = (l, id) => !!l.crop && BASE_STAGE[l.crop] === id;
// a stage's prerequisites on this ledger: 'first' is her first crop's stage
function prereqsOf(l, id) {
  return STAGES[id].prereq.map((p) => (p === 'first' ? firstStage(l) ?? 'first' : p));
}
export const plotsPlanted = (l) => BASE_STAGES.filter((id) => isCommitted(l, id)).length;
// prerequisites not yet met: stage ids, 'first' (no crop chosen yet), 'second' (no second crop
// plot yet) or 'harvest' (a base crop that is not her first waits for her first harvest)
export function missingPrereqs(l, id) {
  const s = STAGES[id];
  const out = prereqsOf(l, id).filter((p) => (p === 'first' ? true : p === 'second' ? plotsPlanted(l) < 2 : !isCommitted(l, p)));
  if (s.afterHarvest && !isFirstCrop(l, id) && !l.harvested) out.unshift('harvest');
  return out;
}
export function stageState(l, id) {
  if (isCommitted(l, id)) return 'COMMITTED';
  // only her first crop's free commit waits for its weeds; another plot's clumps and coins come
  // in either order, and its spots open for the shovel when both are done (P27-5)
  const weedsDone = !isFirstCrop(l, id) || (STAGES[id].weeds ?? []).every((w) => l.weeds[w]);
  return !missingPrereqs(l, id).length && weedsDone ? 'OPEN' : 'LOCKED';
}
export function lockedReason(l, id) {
  const s = STAGES[id];
  const weeds = isFirstCrop(l, id) ? (s.weeds ?? []).filter((w) => !l.weeds[w]) : [];
  const prereq = missingPrereqs(l, id);
  if (prereq.includes('harvest')) return { kind: 'harvest' };
  if (prereq.includes('first')) return { kind: 'first' };
  if (prereq.includes('second')) return { kind: 'second', stages: prereq.filter((p) => p !== 'second') };
  if (prereq.length) return { kind: 'stage', stages: prereq };
  if (weeds.length) return { kind: 'weeds', weeds };
  return null;
}
// What a stage costs on this ledger: her first crop's patch costs no coins (v0.11; v0.12: the
// raised bed still takes its 4 wood).
export function recipe(l, id) {
  const s = STAGES[id];
  return { coins: isFirstCrop(l, id) ? 0 : s.coins, W: s.W, R: s.R };
}
export const isFree = (l, id) => { const r = recipe(l, id); return r.coins + r.W + r.R === 0; };
export function houseStage(l) {
  let n = 0;
  for (const h of HOUSE_STAGES) if (isCommitted(l, h)) n++;
  return n;
}
// the yard-sale table appears when her first crop's patch is planted (its stage commits)
export const tableAvailable = (l) => BASE_STAGES.some((id) => isCommitted(l, id));
// v0.13: the tables standing now: one, and one more per house stage. v0.23 (Tiffany: "Have only
// enough tables that when she fills them the yard sale button is highlighted"): one, a second once
// the bench is built and a third once the walls are (TABLE_STAGES): each comes as the builds begin
// to cost what it brings
export const tables = (l) => 1 + TABLE_STAGES.filter((id) => isCommitted(l, id)).length;
// what the tables hold: six each (v0.14-v0.22 had no maximum from the fourth table on; gone)
export const tablesUnlimited = () => false;
export const tableCap = (l) => TABLE_CAP * tables(l);
// the goods set out on the tables
export const tableCount = (l) => sum(l.table);
export const tableRoom = (l) => Math.max(0, tableCap(l) - tableCount(l));
export const tableFull = (l) => tableCount(l) >= tableCap(l);
// v0.23: the table her crops go onto now: the first one with room (they fill in order, six each),
// and the room it has; null when every table is full
export const fillTable = (l) => (tableFull(l) ? null : Math.floor(tableCount(l) / TABLE_CAP));
export const fillRoom = (l) => (tableFull(l) ? 0 : TABLE_CAP - (tableCount(l) % TABLE_CAP));
// v0.25: the crops on her head (v0.28: twelve at most, HEAD_CROPS), the room left there, and the crate
export const cropsCarried = (l) => CROPS.reduce((n, c) => n + l.carried[c], 0);
export const headRoom = (l) => Math.max(0, HEAD_CROPS - cropsCarried(l));
export const crateCount = (l) => sum(l.crate ?? {});
// can she take one more unit of this resource now: wood and stone up to CAPACITY each on her head;
// crops up to HEAD_CROPS, all crops together (v0.28; v0.25-v0.27: a crop always, past her head's
// six it went into the crate)
export const canTake = (l, res) => (CROPS.includes(res) ? cropsCarried(l) < HEAD_CROPS : l.carried[res] < CAPACITY);
// the tables can be filled from the crate now: something is in it and a table has room
export const restockReady = (l) => tableAvailable(l) && crateCount(l) > 0 && tableRoom(l) > 0;
// a yard sale can be held: every table standing is full (v0.13-v0.22: six at least, whatever the
// number of tables, which left a table empty at most sales). v0.28: or the crate holds enough to
// fill what is still empty: the sale takes it from there first.
export const saleReady = (l) => tableAvailable(l) && tableCount(l) + crateCount(l) >= tableCap(l);
export const tableValue = (l) => CROPS.reduce((n, c) => n + l.table[c] * PRICES[c], 0);
// v0.23 (audit 13): the wish for the sale that comes next, or null: { crop, n, tip }. Every
// WISH.every-th sale, the crops in turn, and only a crop she has planted (so it can be met). Read
// from the ledger alone (the count of sales held), so it is the same before and at the sale.
export function saleWish(l) {
  const next = (l.sales ?? 0) + 1;
  if (next % WISH.every !== 0) return null;
  const crop = WISH.crops[(next / WISH.every - 1) % WISH.crops.length];
  if (!isCommitted(l, BASE_STAGE[crop]) || !NODES_OF[crop].some((id) => l.nodes[id].dug)) return null;
  return { crop, n: WISH.n, tip: WISH.tip };
}
const NODES_OF = Object.fromEntries(CROPS.map((c) => [c, Object.keys(NODES).filter((id) => NODES[id].res === c)]));
// is the wish met by what is out on the tables now
export const wishMet = (l, w = saleWish(l)) => !!w && l.table[w.crop] >= w.n;
// v0.23: the farm is finished when every stage is built. On a new farm the chimney is the last
// (data.js DIY_ORDER); a save from before v0.23 that built its chimney before the windows and
// doors is finished when those stand too.
export const mainComplete = (l) => ROUTE.every((id) => isCommitted(l, id));
// ---------- v0.17 birds: what can be taken now (spec §7 caps, §6.6 point 4) ----------
// the most a save's theft record may hold: v0.17's cap of 8, which older saves reached
export const THEFT_SAVED_MAX = 8;
// theft is possible from the second crop plot until the home, while the caps allow it
// (v0.23: and from the house foundation on: the raised bed, a second plot, is built first now)
export const birdsActive = (l) => plotsPlanted(l) >= 2 && isCommitted(l, BIRDS_AFTER);
export const takenRecently = (l, now = l.activeMs) => (l.theft?.log ?? []).filter((t) => now - t < BIRDS.windowMs).length;
export function theftAllowed(l) {
  if (!birdsActive(l) || mainComplete(l)) return false;
  return (l.theft?.totalBeforeH4 ?? 0) < BIRDS.totalMax && takenRecently(l) < BIRDS.windowMax;
}
// the ready crop plants a bird could land on (one unit at least, planted)
export const readyNodes = (l) => Object.keys(NODES).filter((id) => nodeEstablished(l, id) && l.nodes[id].remaining > 0);
// the crop a head thief goes for: her largest carried crop stack, ties to the cheapest crop
export function carriedTarget(l) {
  let best = null;
  for (const c of CROPS) {
    const n = l.carried[c];
    if (n <= 0) continue;
    if (!best || n > l.carried[best] || (n === l.carried[best] && PRICES[c] < PRICES[best])) best = c;
  }
  return best;
}
// v0.15: how big a crop plant is drawn (1 = as planted). A tomato plant grows one TOMATO_GROWTH
// step for every round after its first crop, `steps` at most; other crops keep their size.
// `growthLevel` is that count of steps: 0 on a plant's first crop.
export function growthLevel(l, id) {
  if (NODES[id]?.res !== 'T') return 0;
  return Math.min(TOMATO_GROWTH.steps, Math.max(0, (l.grown?.[id] ?? 0) - 1));
}
export const plantSize = (l, id) => 1 + TOMATO_GROWTH.step * growthLevel(l, id);
// v0.21: what a node gives each time its crop comes ready. A tomato plant's harvest grows with the
// plant (TOMATO_YIELD); corn and sunflowers give their fixed yield. `maxYield`: the most it ever gives.
export const nodeYield = (l, id) => (NODES[id].res === 'T' ? TOMATO_YIELD[growthLevel(l, id)] : NODES[id].yield);
export const maxYield = (id) => (NODES[id].res === 'T' ? Math.max(...TOMATO_YIELD) : NODES[id].yield);

// wood or stone she has for building: on her head plus at the pile
export const onHand = (l, r) => l.carried[r] + (l.yard?.[r] ?? 0);
// Shortage = recipe - what she has (purse; carried plus the pile), clamped at 0 (spec §11.2): the
// bottom line's count of what is still to get, counting down as she gathers.
export function shortage(l, id) {
  const need = recipe(l, id);
  return {
    coins: Math.max(0, need.coins - l.purse),
    W: Math.max(0, need.W - onHand(l, 'W')),
    R: Math.max(0, need.R - onHand(l, 'R')),
  };
}
// she has everything a stage takes (its DIY button can be pressed at the stage)
export const affordable = (l, id) => { const s = shortage(l, id); return s.coins + s.W + s.R === 0; };

// Units a source can give right now (piles, sticks, rocks, crop nodes).
export function available(l, src) {
  if (src in PILES) return l.piles[src];
  if (src in l.sticks) return l.sticks[src].units;
  if (src in ROCKS) return l.rocks[src];
  if (src in NODES) return l.nodes[src].remaining;
  return 0;
}
export function sourceResource(src) {
  if (src in ROCKS) return 'R';
  if (STICK_SLOTS.includes(src)) return 'W';
  return (PILES[src] ?? NODES[src])?.res ?? null;
}
// a crop node gives crops once its stage is committed and its spot dug
export function nodeEstablished(l, id) {
  return isCommitted(l, NODES[id].stage) && l.nodes[id].dug === true;
}
// the sticks lying around the tree now
export const sticksDown = (l) => STICK_SLOTS.filter((id) => l.sticks[id].units > 0);

// ---------- weeds, dig spots and tools (P25-4, P25-4b) ----------
// A crop patch's weed is in the world from the start (v0.25: the expansions' too; they waited for
// their plot's prerequisites). Cleared clumps never come back. v0.12: a regrowth
// weed (`wr-<node>`) is there while it covers its planted node.
export function weedPresent(l, id) {
  if (isYardWeed(id)) return l.yardWeeds?.[id] === true; // v0.23: on the finished farm's grass
  const node = regrowNode(id);
  if (node) return l.overgrown[node] !== null;
  // the crop patches' weeds stand from the start: the three base patches' (v0.11) and, v0.25
  // (the captain: "the extra weeds where you are going to plant the other corn or the sunflowers,
  // those should be able to be raked from the start as well"), the two expansions' as well. Until
  // v0.24 those four were drawn from the start but stood, for the rake, only once their plot had
  // unlocked (the archer hired and the first patch of that crop planted).
  return WEEDS.includes(id);
}
// A patch is hers to work (the goal line asks for its weeds, and its spots can be dug): any crop
// patch before she has chosen (raking one chooses it), her first crop's patch, another base patch
// after her first harvest (the tomatoes' bed may still be unbuilt), and C1 and S1 after their
// prerequisites.
export function patchWorkable(l, stage) {
  if (STAGES[stage].base) return l.crop === null || isFirstCrop(l, stage) || l.harvested;
  return !missingPrereqs(l, stage).length;
}
// v0.24 (the captain: "I would like the weeds to be removable from the start. All the weeds should
// be able to be removed"): a weed that stands can be raked, whatever its patch is waiting for.
// (v0.11-v0.23: the weeds of a patch that was not open yet, the other two crops' before her first
// harvest, just waited there: "Opens after your first harvest".) Raked early they are gone for
// good, as ever: the patch still opens, and costs, when it did.
export const weedOpen = (l, id) => {
  if (regrowNode(id) || isYardWeed(id)) return weedPresent(l, id);
  return l.weeds[id] === false && weedPresent(l, id);
};
export const openWeeds = (l) => [...WEEDS, ...REGROW_WEEDS, ...YARD_WEED_SLOTS].filter((id) => weedOpen(l, id));
// v0.24: the weeds the farm asks her to rake, which are the rake's jobs: a weed over a crop, and
// the weeds of a patch that is hers to work (v0.11-v0.23's "open" weeds). Not the weeds of a patch
// that has not opened yet, and not the ones on the open grass: those can be raked, but nothing
// waits on them, so the rake is not fetched for them, kept in hand for them, or held back from its
// lean by them.
export const weedJob = (l, id) => {
  if (isYardWeed(id)) return false;
  if (regrowNode(id)) return weedPresent(l, id);
  return weedOpen(l, id) && patchWorkable(l, WEED_PLOT[id]);
};
export const jobWeeds = (l) => [...WEEDS, ...REGROW_WEEDS].filter((id) => weedJob(l, id));
// v0.23: the weeds standing on the finished farm's grass
export const yardWeeds = (l) => YARD_WEED_SLOTS.filter((id) => l.yardWeeds?.[id]);
// the regrowth weeds over her crops now
export const regrowWeeds = (l) => REGROW_WEEDS.filter((id) => weedPresent(l, id));
// the plot weeds that must be raked before a stage's spots can be dug
export const plotWeeds = (stage) => WEEDS.filter((w) => WEED_PLOT[w] === stage);
export const plotClear = (l, stage) => plotWeeds(stage).every((w) => l.weeds[w]);
// a dig spot: its stage committed, its plot weeds raked, not dug yet (or its plant wilted)
export function digOpen(l, id) {
  const n = NODES[id];
  return !!n && isCommitted(l, n.stage) && !l.nodes[id].dug && plotClear(l, n.stage);
}
export const openDigSpots = (l) => Object.keys(NODES).filter((id) => digOpen(l, id));
// a spot dug or waiting to be dug (committed stage), even if its weeds still stand
export const undug = (l) => Object.keys(NODES).filter((id) => isCommitted(l, NODES[id].stage) && !l.nodes[id].dug);
// which tool each open job needs: { rake: [weed ids], shovel: [node ids] }
// (v0.24: the rake's jobs are the weeds the farm asks for, `jobWeeds`; any other weed that stands
// can be raked too, and the rake comes to her hand when she stands by one, interaction.js)
export const toolJobs = (l) => ({ rake: jobWeeds(l), shovel: openDigSpots(l) });
// the held tool has nothing left to do: it goes back to its lean by itself
export function toolIdle(l) {
  return l.tool !== null && toolJobs(l)[l.tool].length === 0;
}

// ---------- the stone invariant (§6.6 point 1, P25-6) ----------
// Stone is finite and never stolen, sold or spent on an optional item, so the stone in the rocks,
// carried and at the pile must always cover the stone still required. -> missing units (0 when it
// holds); a save that breaks it gets the recovery rock.
export function stoneOnHand(l) {
  let n = l.carried.R + (l.yard?.R ?? 0);
  for (const id of ROCK_IDS) n += l.rocks[id];
  return n;
}
export function stoneStillRequired(l) {
  return ROUTE.reduce((n, id) => n + (isCommitted(l, id) ? 0 : STAGES[id].R), 0);
}
export const stoneShortfall = (l) => Math.max(0, stoneStillRequired(l) - stoneOnHand(l));
export { STONE_REQUIRED };

// The follow-up transactions the game applies by itself after any accepted one, in order:
// a free stage that has just opened commits (her first crop once its two weeds are cleared),
// and a held tool with nothing left to do goes back to its lean. -> [tx]
export function autoTxs(l) {
  const out = [];
  for (const id of STAGE_ORDER) {
    if (isFree(l, id) && stageState(l, id) === 'OPEN') out.push({ t: 'commitFree', stage: id });
  }
  // (v0.25-v0.27: the tables filled up again from the crate here, whenever one had room. v0.28: the
  // crate is a store she fills herself; the tables take from it as a sale starts and after a sale)
  if (toolIdle(l)) out.push({ t: 'returnTool' });
  return out;
}
// apply `autoTxs` until none is left (pure; tests and save repair use it, the game applies the
// same transactions through its own commit so each one is saved and presented)
export function settle(l0) {
  let l = l0;
  const events = [];
  for (let guard = 0; guard < 20; guard++) {
    const next = autoTxs(l);
    if (!next.length) break;
    const r = apply(l, next[0]);
    if (!r.ok) break;
    l = r.l;
    events.push(...r.events);
  }
  return { l, events };
}

// ---------- transactions ----------
// tx: { t: 'tick', ms, calm? } | { t: 'clearWeed', id } | { t: 'pick', src } | { t: 'drop', r? }
//   | { t: 'stock' } | { t: 'stow' } | { t: 'restock' } | { t: 'yardSale' } | { t: 'build', stage } | { t: 'commitFree', stage }
//   | { t: 'takeTool', tool, come? } | { t: 'returnTool' } | { t: 'dig', id }
//   | { t: 'birdTurn' } | { t: 'steal', from: 'node', src } | { t: 'steal', from: 'carried' }
//   | { t: 'stain' } | { t: 'cleanBench' }
export function apply(l0, tx) {
  switch (tx?.t) {
    case 'tick': return tick(l0, tx.ms, !!tx.calm);
    case 'clearWeed': return clearWeed(l0, tx.id);
    case 'pick': return pick(l0, tx.src);
    case 'takeTool': return takeTool(l0, tx.tool, !!tx.come);
    case 'returnTool': return returnTool(l0);
    case 'dig': return dig(l0, tx.id);
    case 'commitFree': return commitFree(l0, tx.stage);
    case 'build': return build(l0, tx.stage);
    case 'drop': return drop(l0, tx.r ?? null);
    case 'stock': return stock(l0, tx.max ?? Infinity);
    case 'stow': return stow(l0);
    case 'restock': return restock(l0);
    case 'yardSale': return yardSale(l0);
    case 'birdTurn': return birdTurn(l0);
    case 'steal': return steal(l0, tx.from, tx.src ?? null);
    case 'stain': return stain(l0);
    case 'cleanBench': return cleanBench(l0);
    default: return fail('unknownTx');
  }
}

// v0.26: would a tick to `now` change nothing but the clock? It asks, in `tick`'s own order, each
// thing `tick` may do: a crop coming ready, a stick going or falling, the stick and weed clocks
// being set, a weed over a crop being cleared, giving one of its warnings or wilting its plant,
// a weed coming up on the grass. Whenever one of them would, the answer is no and the full tick
// runs. (test/v026.test.mjs plays whole farms both ways and compares every ledger.)
export function tickQuiet(l, now, calm = false) {
  for (const n of Object.values(l.nodes)) if (n.readyAt !== null && n.remaining === 0 && now >= n.readyAt) return false;
  let down = 0;
  for (const id of STICK_SLOTS) {
    const s = l.sticks[id];
    if (s.units <= 0) continue;
    if (calm || now >= s.at + STICK.lifeMs) return false; // its clock is pushed on, or it goes
    down++;
  }
  if (l.stickNext === null) { if (isCommitted(l, STICK.after)) return false; } else if (now >= l.stickNext && down < STICK.max) return false;
  const done = mainComplete(l);
  let over = false; // a weed stands over a crop, and nothing about it changes in this tick
  for (const id of Object.keys(NODES)) {
    const since = l.overgrown[id];
    if (since === null) continue;
    if (calm || done || now >= since + REGROW.wiltMs) return false; // it is cleared, or its plant wilts
    for (const at of [REGROW.warnMs, REGROW.growMs]) if (l.activeMs < since + at && now >= since + at) return false; // one of its two warnings
    over = true;
  }
  if (calm || done || over || !isCommitted(l, REGROW.after)) { if (l.regrowAt !== null) return false; } else if (l.regrowAt === null || now >= l.regrowAt) return false;
  if (l.yardWeedAt !== null || l.yardBack.some((t) => now >= t)) return false;
  let standing = 0;
  for (const id of YARD_WEED_SLOTS) if (l.yardWeeds[id]) standing++;
  if (YARD_WEEDS.max - standing - l.yardBack.length > 0 && (mainComplete(l) ? YARD_WEED_SLOTS : YARD_WEEDS.early).some((id) => !l.yardWeeds[id])) return false;
  return true;
}

// Active-time clock: only advanced while the world runs (pause, menus, hidden tabs add nothing).
// It also drops the sticks, lets a stick left too long go, and lets weeds creep over her crops.
// `calm` (Help me finish): no weed creeps in and nothing is lost: a lying stick or a weed's wilt
// clock simply waits.
function tick(l0, ms, calm = false) {
  if (!(Number.isFinite(ms) && ms >= 0)) return fail('badTime');
  // v0.26: nearly every tick moves the clock and nothing else. Such a tick gives back a ledger
  // that shares everything but the clock with the one before, in place of a copy of the whole
  // ledger made 60 times a second (the S26 audit: the copy was among the dearest things a frame
  // did). No reducer writes into the ledger it is given, so the shared parts are safe.
  if (PERF.cache && tickQuiet(l0, l0.activeMs + ms, calm)) return { ok: true, l: { ...l0, activeMs: l0.activeMs + ms }, events: [] };
  const l = clone(l0);
  const events = [];
  l.activeMs += ms;
  const now = l.activeMs;
  for (const [id, n] of Object.entries(l.nodes)) {
    if (n.readyAt !== null && n.remaining === 0 && now >= n.readyAt) {
      n.readyAt = null;
      l.grown[id] += 1;
      n.remaining = nodeYield(l, id); // v0.21: a grown tomato plant gives more
      events.push({ type: 'ready', src: id, round: l.grown[id] });
    }
  }
  // sticks: one left too long is gone; a new one falls on a free slot
  for (const id of STICK_SLOTS) {
    const s = l.sticks[id];
    if (s.units <= 0) continue;
    if (calm) s.at += ms;
    else if (now >= s.at + STICK.lifeMs) {
      events.push({ type: 'stickGone', src: id, units: s.units });
      s.units = 0;
      s.at = null;
    }
  }
  if (l.stickNext === null && isCommitted(l, STICK.after)) l.stickNext = now + STICK.everyMs;
  if (l.stickNext !== null && now >= l.stickNext && sticksDown(l).length < STICK.max) {
    const free = STICK_SLOTS.filter((id) => l.sticks[id].units === 0);
    const id = free[Math.floor(seeded(l.stickSeq) * free.length)];
    l.sticks[id] = { units: STICK.units, at: now };
    l.stickSeq += 1;
    l.stickNext = now + STICK.everyMs;
    events.push({ type: 'stickFell', src: id });
  }
  // weeds over planted crops (one at a time, once the foundation stands)
  const over = Object.keys(NODES).filter((id) => l.overgrown[id] !== null);
  if (calm || mainComplete(l)) {
    // Help me finish (or the finished farm): none creeps in, and an open one is cleared
    for (const id of over) { l.overgrown[id] = null; events.push({ type: 'weedCleared', id: `wr-${id}`, node: id, calm: true }); }
    l.regrowAt = null;
  } else {
    for (const id of over) {
      const since = l.overgrown[id];
      const prev = l0.activeMs;
      // the two warnings: a clump at warnMs, grown and choking the plant at growMs
      for (const [at, stage] of [[REGROW.warnMs, 'clump'], [REGROW.growMs, 'choking']]) {
        if (prev < since + at && now >= since + at && now < since + REGROW.wiltMs) events.push({ type: 'weedGrows', id: `wr-${id}`, node: id, stage });
      }
      if (now < since + REGROW.wiltMs) continue;
      // the one plant under it wilts: its spot needs digging again, the rest is untouched
      l.overgrown[id] = null;
      l.nodes[id] = { remaining: 0, readyAt: null, dug: false };
      l.grown[id] = 0;
      l.wilted[id] = true;
      events.push({ type: 'wilted', id, weed: `wr-${id}` });
    }
    const regrowing = isCommitted(l, REGROW.after) && !Object.values(l.overgrown).some((v) => v !== null);
    if (!regrowing) l.regrowAt = null;
    else if (l.regrowAt === null) l.regrowAt = now + REGROW.everyMs;
    else if (now >= l.regrowAt) {
      const planted = Object.keys(NODES).filter((id) => nodeEstablished(l, id));
      if (planted.length) {
        const id = planted[l.regrowSeq % planted.length];
        l.overgrown[id] = now;
        l.regrowSeq += 1;
        l.regrowAt = null;
        events.push({ type: 'weedSprouted', id: `wr-${id}`, node: id });
      } else l.regrowAt = now + REGROW.everyMs;
    }
  }
  // v0.23: on the finished farm weeds come up on the grass (never over a crop: nothing wilts here).
  // v0.24 (the captain: "removable from the start ... the ones that aren't going to be possible to
  // plant something on should be able to grow really fast"): from the first moment of a farm
  // YARD_WEEDS.max of them stand, and a raked one is up again YARD_WEEDS.backMs later (`back`).
  // While the farm is being built they keep to the places clear of her work (YARD_WEEDS.early);
  // on the finished farm they come up at any free one of the ten. Help me finish changes nothing
  // here: they take nothing and nothing waits on them.
  {
    const back = l.yardBack.filter((t) => now >= t).length;
    if (back) l.yardBack = l.yardBack.filter((t) => now < t);
    const places = mainComplete(l) ? YARD_WEED_SLOTS : YARD_WEEDS.early;
    const standing = YARD_WEED_SLOTS.filter((id) => l.yardWeeds[id]).length;
    const want = Math.max(back, YARD_WEEDS.max - standing - l.yardBack.length);
    for (let k = 0; k < want; k++) {
      const free = places.filter((id) => !l.yardWeeds[id]);
      if (!free.length) break;
      const id = free[Math.floor(seeded(l.yardWeedSeq + 101) * free.length)];
      l.yardWeeds[id] = true;
      l.yardWeedSeq += 1;
      events.push({ type: 'yardWeedSprouted', id, ...(k < back ? { back: true } : {}) });
    }
    l.yardWeedAt = null;
  }
  return { ok: true, l, events };
}

// weeding needs the rake in her hands (A25-5)
function clearWeed(l0, id) {
  if (isYardWeed(id)) {
    if (!weedPresent(l0, id)) return fail('notPresent');
    if (l0.tool !== 'rake') return fail('needRake');
    const l = clone(l0);
    // v0.24: gone, and up again in a moment (tick)
    l.yardWeeds[id] = false;
    l.yardBack = [...l.yardBack, l.activeMs + YARD_WEEDS.backMs];
    l.yardRaked += 1;
    return { ok: true, l, events: [{ type: 'weedCleared', id, yard: true, backMs: YARD_WEEDS.backMs }] };
  }
  const node = regrowNode(id);
  if (!node && !(id in l0.weeds)) return fail('unknownWeed');
  if (node ? !weedPresent(l0, id) : l0.weeds[id]) return fail('alreadyCleared');
  if (!weedPresent(l0, id)) return fail('notPresent');
  // (v0.24: no 'patchLocked' any more: a weed that stands can be raked)
  if (l0.tool !== 'rake') return fail('needRake');
  const l = clone(l0);
  if (node) {
    l.overgrown[node] = null;
    return { ok: true, l, events: [{ type: 'weedCleared', id, node }] };
  }
  l.weeds[id] = true;
  const events = [{ type: 'weedCleared', id }];
  // the first crop patch she rakes is her crop, for good (v0.11)
  const crop = CROP_OF_STAGE[WEED_PLOT[id]];
  if (l.crop === null && crop) {
    l.crop = crop;
    events.push({ type: 'cropChosen', crop, stage: WEED_PLOT[id] });
  }
  return { ok: true, l, events };
}

// take a tool from its lean (or swap: the held one goes back as she takes the other); `come`
// (v0.13): a tool she has taken once (or any, with Help me finish) flies to her hand at the job
// instead. `first`: her first take of it.
function takeTool(l0, tool, come = false) {
  if (!TOOLS.includes(tool)) return fail('unknownTool');
  if (l0.tool === tool) return fail('alreadyHeld');
  const first = !toolComes(l0, tool);
  const l = clone(l0);
  const from = l.tool;
  l.tool = tool;
  return { ok: true, l, events: [{ type: 'toolTaken', tool, from, ...(come ? { come: true } : {}), ...(first ? { first: true } : {}) }] };
}
// v0.13 (P29-7): she has taken this tool once, read from the farm: the rake once any weed is
// raked or it is in her hand, the shovel once any spot is dug (a wilted plant's spot was dug) or
// it is in her hand. From then on it comes to her hand at the job.
export function toolComes(l, tool) {
  if (l.tool === tool) return true;
  return toolUsed(l, tool);
}
// v0.23: the tool has done a job on this farm (a weed raked, a spot dug), so from now on it comes
// to her hand by itself. A tool she has only just fetched, and not yet used, stays in her hand
// whatever she picks up on the way: sent back, she would have to walk to the house for it again.
export function toolUsed(l, tool) {
  // (v0.24: a weed raked on the open grass counts; that one has come up there no longer does,
  // since they stand from the start)
  if (tool === 'rake') return Object.values(l.weeds ?? {}).some((w) => w === true) || (l.yardRaked ?? 0) > 0 || (l.regrowSeq ?? 0) > 0;
  if (tool === 'shovel') return Object.values(l.nodes ?? {}).some((n) => n?.dug) || Object.values(l.wilted ?? {}).some(Boolean);
  return false;
}
function returnTool(l0) {
  if (l0.tool === null) return fail('noTool');
  const l = clone(l0);
  const tool = l.tool;
  l.tool = null;
  return { ok: true, l, events: [{ type: 'toolReturned', tool }] };
}

// dig a crop spot with the shovel: the plant comes up, first ready 5 s later (also a wilted
// plant's spot: replanting is free)
function dig(l0, id) {
  if (!(id in NODES)) return fail('unknownSpot');
  if (!isCommitted(l0, NODES[id].stage)) return fail('notCommitted');
  if (l0.nodes[id].dug) return fail('alreadyDug');
  if (!plotClear(l0, NODES[id].stage)) return fail('weeds');
  if (l0.tool !== 'shovel') return fail('needShovel');
  const l = clone(l0);
  const replanted = l.wilted[id];
  l.nodes[id] = { remaining: 0, readyAt: l.activeMs + NODE_FIRST_READY_MS, dug: true };
  l.grown[id] = 0; // a new plant
  l.wilted[id] = false;
  return { ok: true, l, events: [{ type: 'dug', id, stage: NODES[id].stage, ...(replanted ? { replanted: true } : {}) }] };
}

function buildable(l0, stage) {
  if (!(stage in STAGES)) return 'unknownStage';
  const state = stageState(l0, stage);
  if (state === 'COMMITTED') return 'committed';
  if (state === 'LOCKED') return 'locked';
  return null;
}

// a stage that costs nothing commits as soon as it opens (her first crop, once its two weeds
// are cleared)
function commitFree(l0, stage) {
  const why = buildable(l0, stage);
  if (why) return fail(why);
  if (!isFree(l0, stage)) return fail('notFree');
  return build(l0, stage);
}

// v0.12 DIY: the whole stage in one go, once she has all of it. Wood and stone come from her
// head first, then the yard pile; coins from the purse. Standing at the stage is the caller's
// rule (the DIY button works only there).
function build(l0, stage) {
  const why = buildable(l0, stage);
  if (why) return fail(why);
  if (!affordable(l0, stage)) return fail('short');
  const l = clone(l0);
  const need = recipe(l, stage);
  const took = { carried: { W: 0, R: 0 }, yard: { W: 0, R: 0 }, coins: need.coins };
  for (const r of MATERIALS) {
    const head = Math.min(need[r], l.carried[r]);
    l.carried[r] -= head;
    l.yard[r] -= need[r] - head;
    took.carried[r] = head;
    took.yard[r] = need[r] - head;
  }
  l.purse -= need.coins;
  l.stages[stage].committed = true;
  l.paymentEvents.push(stage);
  // a crop stage's new nodes open as dig spots (P25-4): nothing grows until each is dug
  for (const [id, node] of Object.entries(NODES)) {
    if (node.stage === stage) { l.nodes[id] = { remaining: 0, readyAt: null, dug: false }; l.grown[id] = 0; }
  }
  return { ok: true, l, events: [{ type: 'built', stage, took }, { type: 'committed', stage }] };
}

// everything of wood and stone on her head onto the material pile by the house, in one step
// (v0.11 P27-1); `r` limits it to one material
function drop(l0, r = null) {
  if (r !== null && !YARD_MATERIALS.includes(r)) return fail('notAccepted');
  const kinds = r ? [r] : YARD_MATERIALS;
  if (!kinds.some((k) => l0.carried[k] > 0)) return fail('noStock');
  const l = clone(l0);
  const n = {};
  for (const k of kinds) { n[k] = l.carried[k]; l.yard[k] += n[k]; l.carried[k] = 0; }
  return { ok: true, l, events: [{ type: 'dropped', n: { W: n.W ?? 0, R: n.R ?? 0 }, yard: { ...l.yard } }] };
}

// v0.12: the crops on her head onto the yard-sale table as she walks past it, corn, sunflowers,
// tomatoes, until it holds TABLE_CAP; what does not fit stays on her head (v0.13: until the tables
// standing now hold six each; v0.14: with four tables, all of it)
// v0.23 (Tiffany: "she should go to and drop them off in front of what ever table is empty"):
// `max` is the room of the table she stands at (the first one with room, `fillRoom`): only that
// many go out; without it, as before, whatever the tables still hold
function stock(l0, max = Infinity) {
  if (!tableAvailable(l0)) return fail('noTable');
  if (tableFull(l0)) return fail('tableFull');
  if (!CROPS.some((c) => l0.carried[c] > 0)) return fail('noStock');
  if (!(max > 0)) return fail('noRoom');
  const l = clone(l0);
  const n = zeroCrops();
  let left = max;
  for (const c of CROPS) {
    const k = Math.min(l.carried[c], tableRoom(l), left);
    left -= k;
    l.carried[c] -= k;
    l.table[c] += k;
    n[c] = k;
  }
  return { ok: true, l, events: [{ type: 'stocked', n, table: { ...l.table } }] };
}

// v0.28: everything of crops on her head into the crate beside the tables as she walks past it, in
// one step, the way her wood and stone go onto the pile by the house (`drop`). The crate has no
// limit; it comes with the first table.
function stow(l0) {
  if (!tableAvailable(l0)) return fail('noTable');
  if (!CROPS.some((c) => l0.carried[c] > 0)) return fail('noStock');
  const l = clone(l0);
  const n = zeroCrops();
  for (const c of CROPS) { n[c] = l.carried[c]; l.crate[c] += n[c]; l.carried[c] = 0; }
  return { ok: true, l, events: [{ type: 'stowed', n, crate: { ...l.crate } }] };
}

// v0.25: the tables fill up again from the crate: as many as they have room for, the dearest crop
// first (so a sale from the crate never pays less than one she carried over).
// (v0.25-v0.27 it was the ledger's own follow-up, the moment a table had room. v0.28: the game asks
// for it after a sale, once the buyers have gone, and as a sale starts, `yardSale` does the same.)
const BY_PRICE = [...CROPS].sort((a, b) => PRICES[b] - PRICES[a]);
function fillFromCrate(l) {
  const n = zeroCrops();
  for (const c of BY_PRICE) {
    const k = Math.min(l.crate[c], tableRoom(l));
    l.crate[c] -= k;
    l.table[c] += k;
    n[c] = k;
  }
  return n;
}
function restock(l0) {
  if (!tableAvailable(l0)) return fail('noTable');
  if (tableFull(l0)) return fail('tableFull');
  if (crateCount(l0) <= 0) return fail('noStock');
  const l = clone(l0);
  const n = fillFromCrate(l);
  return { ok: true, l, events: [{ type: 'restocked', n, table: { ...l.table }, crate: { ...l.crate } }] };
}

// v0.12: the yard sale, once the table is full: every item on it sells at its fixed price (§6.1)
// (v0.13: once six at least are set out, on however many tables stand)
// v0.28: what the tables still lack comes from the crate first (a `restocked` event with `sale`;
// the game shows that fill before it starts the sale, main.js doYardSale)
function yardSale(l0) {
  if (!tableAvailable(l0)) return fail('noTable');
  if (!saleReady(l0)) return fail('tooFew');
  const l = clone(l0);
  const pre = [];
  if (!tableFull(l)) {
    const n = fillFromCrate(l);
    pre.push({ type: 'restocked', n, table: { ...l.table }, crate: { ...l.crate }, sale: true });
  }
  const items = { ...l.table };
  // v0.23 (audit 13): a buyer's wish, met by what is out, leaves a small tip on top
  const wish = saleWish(l);
  const tip = wishMet(l, wish) ? wish.tip : 0;
  const coins = tableValue(l) + tip;
  for (const c of CROPS) { l.sold[c] += items[c]; l.table[c] = 0; }
  l.purse += coins;
  l.lifetimeCoins += coins;
  l.sales += 1;
  return { ok: true, l, events: [...pre, { type: 'yardSale', items, coins, sale: l.sales, tables: tables(l), ...(wish ? { wish: { ...wish, met: tip > 0 } } : {}), ...(tip ? { tip } : {}) }] };
}

// ---------- v0.17 birds (spec §7) ----------
// a bird event starts: the kinds take turns (the caller skips a kind that cannot happen now)
function birdTurn(l0) {
  if (!birdsActive(l0)) return fail('tooEarly');
  const l = clone(l0);
  l.theft.rotation += 1;
  return { ok: true, l, events: [{ type: 'birdTurn', rotation: l.theft.rotation }] };
}
// a bird takes from a ready plant (`src`) or from the crops on her head (her largest stack, ties
// to the cheapest crop), within the caps; never anything else.
// v0.22 (Tiffany: "fly off with them so the crops need to grow back"): from a plant it takes the
// whole ripe crop (`n` units, what was left on it), and the plant grows it again from nothing;
// from her head it takes one unit. A visit counts once toward the caps.
function steal(l0, from, src) {
  if (!theftAllowed(l0)) return fail('capped');
  const l = clone(l0);
  let res;
  let n = 1;
  if (from === 'node') {
    if (!readyNodes(l0).includes(src)) return fail('notReady');
    const node = l.nodes[src];
    res = NODES[src].res;
    n = node.remaining;
    node.remaining = 0;
    node.readyAt = l.activeMs + NODE_RENEW_MS[res];
  } else if (from === 'carried') {
    res = carriedTarget(l0);
    if (!res) return fail('noCrops');
    l.carried[res] -= 1;
  } else return fail('unknownTarget');
  l.theft.log = [...l.theft.log.filter((t) => l.activeMs - t < BIRDS.windowMs), l.activeMs].slice(-BIRDS.totalMax);
  l.theft.totalBeforeH4 += 1;
  return { ok: true, l, events: [{ type: 'stolen', res, n, from, ...(src ? { src } : {}), total: l.theft.totalBeforeH4 }] };
}
// a bird on the restored bench leaves a stain (A22 item 8: from G2 on, Q25-1); cleaned in 1 s
function stain(l0) {
  if (!isCommitted(l0, 'G2')) return fail('noBench');
  if (l0.theft.stain) return fail('stained');
  const l = clone(l0);
  l.theft.stain = true;
  return { ok: true, l, events: [{ type: 'stained' }] };
}
function cleanBench(l0) {
  if (!l0.theft.stain) return fail('clean');
  const l = clone(l0);
  l.theft.stain = false;
  return { ok: true, l, events: [{ type: 'benchCleaned' }] };
}

function pick(l0, src) {
  const res = sourceResource(src);
  if (!res) return fail('unknownSource');
  if (src in NODES && !nodeEstablished(l0, src)) return fail('notEstablished');
  if (available(l0, src) <= 0) return fail('empty');
  // v0.28: her head holds HEAD_CROPS crops, all crops together, and a pick past that is refused, as
  // wood or stone past CAPACITY is (v0.25-v0.27: never refused; past her head's six the crop went
  // into the crate)
  const crop = CROPS.includes(res);
  if (!canTake(l0, res)) return fail('full');
  const l = clone(l0);
  const events = [];
  // v0.23 (Tiffany: "neither in her hand for harvesting ever"): a tool in her hand goes back to its
  // lean as she picks anything up
  // (one she has not used yet stays: it would not come back to her by itself)
  if (l.tool !== null && toolUsed(l, l.tool)) { events.push({ type: 'toolReturned', tool: l.tool }); l.tool = null; }
  l.carried[res] += 1;
  if (src in PILES) l.piles[src] -= 1;
  else if (src in l.sticks) {
    const s = l.sticks[src];
    s.units -= 1;
    if (s.units === 0) s.at = null;
  } else if (src in ROCKS) {
    l.rocks[src] -= 1; // finite: an empty rock never returns
    if (l.rocks[src] === 0) events.push({ type: 'rockEmpty', src });
  } else {
    const n = l.nodes[src];
    n.remaining -= 1;
    if (n.remaining === 0) n.readyAt = l.activeMs + NODE_RENEW_MS[res];
    if (!l.harvested) { l.harvested = true; events.push({ type: 'firstHarvest', res }); }
  }
  events.push({ type: 'picked', src, res });
  if (!crop && l.carried[res] === CAPACITY) events.push({ type: 'full', res });
  // her head is full of crops: the tables or the crate take them (v0.28)
  if (crop && cropsCarried(l) === HEAD_CROPS) events.push({ type: 'headFull', res });
  return { ok: true, l, events };
}

// ---------- validation (used by saves and tests) ----------
const isInt = (n, lo = 0, hi = Infinity) => Number.isInteger(n) && n >= lo && n <= hi;
const sameKeys = (o, keys) => o && typeof o === 'object' && Object.keys(o).length === keys.length && keys.every((k) => k in o);
const isTime = (t) => t === null || isInt(t);

export function validateLedger(l) {
  const errors = [];
  const e = (m) => errors.push(m);
  if (!l || typeof l !== 'object') return ['not an object'];
  if (!sameKeys(l.carried, RESOURCES)) e('carried keys');
  else for (const r of RESOURCES) if (!isInt(l.carried[r], 0, CAPACITY)) e(`carried ${r} outside 0..${CAPACITY}`);
  if (!sameKeys(l.yard, YARD_MATERIALS) || !YARD_MATERIALS.every((r) => isInt(l.yard[r]))) e('yard');
  // HEAD_CROPS crops on her head at most (v0.25-v0.27: six; v0.28: twelve); the crate has no limit
  if (sameKeys(l.carried, RESOURCES) && CROPS.reduce((n, c) => n + (l.carried[c] || 0), 0) > HEAD_CROPS) e(`more than ${HEAD_CROPS} crops on her head`);
  if (!sameKeys(l.crate, CROPS) || !CROPS.every((c) => isInt(l.crate[c]))) e('crate');
  if (!sameKeys(l.table, CROPS) || !CROPS.every((c) => isInt(l.table[c]))) e('table');
  else if (l.stages && sum(l.table) > tableCap(l)) e('table holds more than its tables');
  else if (sum(l.table) > 0 && !BASE_STAGES.some((id) => l.stages?.[id]?.committed)) e('table stocked before any crop plot');
  if (!isInt(l.sales)) e('sales');
  if (!(l.crop === null || CROPS.includes(l.crop))) e('crop');
  if (typeof l.harvested !== 'boolean') e('harvested');
  if (!isInt(l.purse)) e('purse must be an integer >= 0');
  if (!isInt(l.lifetimeCoins)) e('lifetimeCoins');
  if (!sameKeys(l.sold, CROPS) || !CROPS.every((c) => isInt(l.sold[c]))) e('sold');
  if (!isInt(l.activeMs)) e('activeMs');
  if (!sameKeys(l.stages, ALL_STAGES)) e('stage keys');
  else {
    for (const id of ALL_STAGES) {
      const st = l.stages[id];
      if (!sameKeys(st, ['committed']) || typeof st.committed !== 'boolean') { e(`${id} stage shape`); continue; }
      if (st.committed && (l.crop === null || CROPS.includes(l.crop))) {
        for (const p of prereqsOf(l, id)) {
          if (p === 'second' ? plotsPlanted(l) < 2 : !l.stages[p]?.committed) e(`${id} committed before ${p}`);
        }
      }
    }
    if (l.crop === null && BASE_STAGES.some((id) => l.stages[id].committed)) e('a crop patch is planted but no first crop is chosen');
    const committed = ALL_STAGES.filter((id) => l.stages[id].committed);
    if (!Array.isArray(l.paymentEvents) || l.paymentEvents.length !== committed.length
      || new Set(l.paymentEvents).size !== l.paymentEvents.length
      || !l.paymentEvents.every((id) => committed.includes(id))) e('paymentEvents must list each committed stage once');
  }
  if (!sameKeys(l.weeds, WEEDS) || !WEEDS.every((w) => typeof l.weeds[w] === 'boolean')) e('weeds');
  if (!sameKeys(l.piles, Object.keys(PILES))) e('pile keys');
  else for (const [id, p] of Object.entries(PILES)) if (!isInt(l.piles[id], 0, p.units)) e(`pile ${id}`);
  if (!sameKeys(l.sticks, STICK_SLOTS)) e('stick keys');
  else {
    for (const id of STICK_SLOTS) {
      const s = l.sticks[id];
      if (!sameKeys(s, ['units', 'at']) || !isInt(s.units, 0, STICK.units) || !isTime(s.at) || (s.units > 0) !== (s.at !== null)) e(`stick ${id}`);
    }
  }
  if (!isTime(l.stickNext) || !isInt(l.stickSeq)) e('stick clock');
  if (!sameKeys(l.nodes, Object.keys(NODES))) e('node keys');
  else {
    for (const [id, n] of Object.entries(NODES)) {
      const node = l.nodes[id];
      if (!node || !isInt(node.remaining, 0, maxYield(id)) || !isTime(node.readyAt) || !sameKeys(node, ['remaining', 'readyAt', 'dug']) || typeof node.dug !== 'boolean') e(`node ${id}`);
      else if (!l.stages?.[n.stage]?.committed && (node.dug || node.remaining > 0 || node.readyAt !== null)) e(`node ${id} active before ${n.stage}`);
      else if (!node.dug && (node.remaining > 0 || node.readyAt !== null)) e(`node ${id} growing before it is dug`);
    }
  }
  if (!sameKeys(l.grown, Object.keys(NODES)) || !Object.keys(NODES).every((id) => isInt(l.grown[id]) && (l.nodes?.[id]?.dug || l.grown[id] === 0))) e('grown');
  if (!sameKeys(l.overgrown, Object.keys(NODES))) e('overgrown keys');
  else {
    for (const id of Object.keys(NODES)) {
      const o = l.overgrown[id];
      if (!isTime(o)) e(`overgrown ${id}`);
      else if (o !== null && !l.nodes?.[id]?.dug) e(`a weed over ${id}, which is not planted`);
    }
  }
  if (!sameKeys(l.wilted, Object.keys(NODES)) || !Object.keys(NODES).every((id) => typeof l.wilted[id] === 'boolean' && !(l.wilted[id] && l.nodes?.[id]?.dug))) e('wilted');
  if (!isTime(l.regrowAt) || !isInt(l.regrowSeq)) e('regrowth clock');
  if (!sameKeys(l.rocks, ROCK_IDS)) e('rock keys');
  else {
    for (const id of ROCK_IDS) {
      const max = ROCKS[id].recovery ? STONE_REQUIRED : ROCKS[id].units;
      if (!isInt(l.rocks[id], 0, max)) e(`rock ${id}`);
    }
  }
  if (!(l.tool === null || TOOLS.includes(l.tool))) e('tool');
  const th = l.theft;
  // (v0.22 lowered the cap to 5 plants; a save from v0.17-v0.21 may hold up to its 8 units)
  if (!th || !isInt(th.rotation) || !Array.isArray(th.log) || th.log.length > THEFT_SAVED_MAX || !th.log.every((t) => isInt(t))
    || !isInt(th.totalBeforeH4, 0, THEFT_SAVED_MAX) || typeof th.stain !== 'boolean') e('theft');
  else if (th.stain && !l.stages?.G2?.committed) e('a stain on a bench that is not restored');
  // (v0.24: they stand on a farm still being built too)
  if (!sameKeys(l.yardWeeds, YARD_WEED_SLOTS) || !YARD_WEED_SLOTS.every((id) => typeof l.yardWeeds[id] === 'boolean')) e('yard weeds');
  if (!isTime(l.yardWeedAt) || !isInt(l.yardWeedSeq)) e('yard weed clock');
  if (!Array.isArray(l.yardBack) || l.yardBack.length > YARD_WEED_SLOTS.length || !l.yardBack.every((t) => isInt(t)) || !isInt(l.yardRaked)) e('yard weeds coming back');
  return errors;
}
