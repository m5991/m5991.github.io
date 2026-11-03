// The game-owned ledger (code-reuse annex §D.1): pure, deterministic, no three.js, no DOM.
// Every accepted transaction returns a new ledger plus events; the caller saves the new
// ledger before any presentation starts (spec §12). Views only present this state.
// v0.11 (captain 2026-11-02): wood and stone she drops at the material pile by the house wait
// there (`yard`) and builds take from her head first, then from the pile; the first crop patch
// she rakes is her free first crop (`crop`, permanent: it also themes the cards and menus); the
// other two base crops open after her first harvest (`harvested`).
import {
  BASE_STAGE, BASE_STAGES, CAPACITY, CROP_OF_STAGE, CROPS, MATERIALS, NODE_FIRST_READY_MS, NODE_RENEW_MS, NODES,
  PILES, PRICES, RESOURCES, ROCKS, ROCK_IDS, ROUTE, SPOTS, STAGES, STAGE_ORDER, STONE_REQUIRED, TOOLS,
  U2_FIRST_READY_MS, UPGRADES, WEEDS, WEED_PLOT, YARD_MATERIALS,
} from './data.js';

const zeroRes = () => Object.fromEntries(RESOURCES.map((r) => [r, 0]));

export function createLedger() {
  return {
    carried: zeroRes(),
    yard: { W: 0, R: 0 }, // the material pile by the house (v0.11): no cap
    crop: null, // her first crop: null until she rakes a crop patch, then 'C', 'S' or 'T' for good
    harvested: false, // her first crop unit is picked: the other two base crops open
    purse: 0,
    lifetimeCoins: 0,
    sold: { C: 0, S: 0, T: 0 },
    stages: Object.fromEntries(STAGE_ORDER.map((id) => [id, { committed: false, deposited: { coins: 0, W: 0, R: 0 } }])),
    paymentEvents: [], // committed stage IDs in commit order (each at most once)
    weeds: Object.fromEntries(WEEDS.map((id) => [id, false])), // true = cleared
    piles: Object.fromEntries(Object.entries(PILES).map(([id, p]) => [id, p.units])),
    spots: Object.fromEntries(Object.keys(SPOTS).map((id) => [id, { remaining: 0, readyAt: null }])),
    // a crop node is a dig spot once its stage commits, and productive once dug (P25-4)
    nodes: Object.fromEntries(Object.keys(NODES).map((id) => [id, { remaining: 0, readyAt: null, dug: false }])),
    rocks: Object.fromEntries(ROCK_IDS.map((id) => [id, ROCKS[id].units])), // finite stone (P25-6)
    tool: null, // the tool in Vanessa's hand: null, 'rake' or 'shovel' (P25-4)
    owned: Object.fromEntries(Object.keys(UPGRADES).map((id) => [id, false])), // shop upgrades (§6.5)
    activeMs: 0,
    // Reserved for later steps (birds, spec §6.6/§12); always zero in this slice.
    theft: { rotation: 0, log: [], totalBeforeH4: 0 },
  };
}

const clone = (l) => structuredClone(l);
const fail = (reason) => ({ ok: false, reason });

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
// What a stage costs on this ledger: her first crop's patch is free (v0.11).
export function recipe(l, id) {
  const s = STAGES[id];
  if (isFirstCrop(l, id)) return { coins: 0, W: 0, R: 0 };
  return { coins: s.coins, W: s.W, R: s.R };
}
export function houseStage(l) {
  let n = 0;
  for (const h of ['H1', 'H2', 'H3', 'H4']) if (isCommitted(l, h)) n++;
  return n;
}
// the market crate appears when her first crop's patch is planted (its stage commits)
export const crateAvailable = (l) => BASE_STAGES.some((id) => isCommitted(l, id));
export const mainComplete = (l) => isCommitted(l, 'H4');

export function stillNeeded(l, id) {
  const s = recipe(l, id);
  const d = l.stages[id].deposited;
  return { coins: s.coins - d.coins, W: s.W - d.W, R: s.R - d.R };
}
// wood or stone she has for building: on her head plus at the pile
export const onHand = (l, r) => l.carried[r] + (l.yard?.[r] ?? 0);
// Shortage = required - deposited - what she has (purse; carried plus the pile), clamped at 0
// (spec §11.2): what the card says is still "to go".
export function shortage(l, id) {
  const need = stillNeeded(l, id);
  return {
    coins: Math.max(0, need.coins - l.purse),
    W: Math.max(0, need.W - onHand(l, 'W')),
    R: Math.max(0, need.R - onHand(l, 'R')),
  };
}
export const fullyFunded = (l, id) => {
  const n = stillNeeded(l, id);
  return n.coins === 0 && n.W === 0 && n.R === 0;
};

// Units a source can give right now (piles, spots, rocks, crop nodes).
export function available(l, src) {
  if (src in PILES) return l.piles[src];
  if (src in SPOTS) return l.spots[src].remaining;
  if (src in ROCKS) return l.rocks[src];
  if (src in NODES) return l.nodes[src].remaining;
  return 0;
}
export function sourceResource(src) {
  if (src in ROCKS) return 'R';
  return (PILES[src] ?? SPOTS[src] ?? NODES[src])?.res ?? null;
}
// a crop node gives crops once its stage is committed and its spot dug
export function nodeEstablished(l, id) {
  return isCommitted(l, NODES[id].stage) && l.nodes[id].dug === true;
}

// ---------- weeds, dig spots and tools (P25-4, P25-4b) ----------
// A weed is in the world when its plot's stage has unlocked (prerequisites committed); the
// opening clumps are there from the start. Cleared clumps never come back.
export function weedPresent(l, id) {
  const plot = WEED_PLOT[id];
  if (!plot || STAGES[plot].base) return true; // the three crop patches' weeds: from the start
  return prereqsOf(l, plot).every((p) => isCommitted(l, p));
}
// A patch's weeds can be raked when the patch is hers to work: any crop patch before she has
// chosen (raking one chooses it), her first crop's patch, and another patch once it is unlocked
// (the other base crops after her first harvest, C1 and S1 after their prerequisites). Weeds on
// a patch that is not open yet just wait there.
export function patchWorkable(l, stage) {
  if (STAGES[stage].base && (l.crop === null || isFirstCrop(l, stage))) return true;
  return !missingPrereqs(l, stage).length;
}
export const weedOpen = (l, id) => l.weeds[id] === false && weedPresent(l, id) && patchWorkable(l, WEED_PLOT[id]);
export const openWeeds = (l) => WEEDS.filter((id) => weedOpen(l, id));
// the plot weeds that must be raked before a stage's spots can be dug
export const plotWeeds = (stage) => WEEDS.filter((w) => WEED_PLOT[w] === stage);
export const plotClear = (l, stage) => plotWeeds(stage).every((w) => l.weeds[w]);
// a dig spot: its stage committed, its plot weeds raked, not dug yet
export function digOpen(l, id) {
  const n = NODES[id];
  return !!n && isCommitted(l, n.stage) && !l.nodes[id].dug && plotClear(l, n.stage);
}
export const openDigSpots = (l) => Object.keys(NODES).filter((id) => digOpen(l, id));
// a spot dug or waiting to be dug (committed stage), even if its weeds still stand
export const undug = (l) => Object.keys(NODES).filter((id) => isCommitted(l, NODES[id].stage) && !l.nodes[id].dug);
// which tool each open job needs: { rake: [weed ids], shovel: [node ids] }
export const toolJobs = (l) => ({ rake: openWeeds(l), shovel: openDigSpots(l) });
// the held tool has nothing left to do: it goes back to its lean by itself
export function toolIdle(l) {
  return l.tool !== null && toolJobs(l)[l.tool].length === 0;
}
export const owns = (l, item) => l.owned?.[item] === true;

// ---------- the stone invariant (§6.6 point 1, P25-6) ----------
// Stone is finite and never stolen, sold or spent on an optional item, so the stone in the rocks,
// carried and in uncommitted escrow must always cover the stone still required. -> missing units
// (0 when it holds); a save that breaks it gets the recovery rock.
export function stoneOnHand(l) {
  let n = l.carried.R + (l.yard?.R ?? 0);
  for (const id of ROCK_IDS) n += l.rocks[id];
  for (const id of STAGE_ORDER) if (!isCommitted(l, id)) n += l.stages[id].deposited.R;
  return n;
}
export function stoneStillRequired(l) {
  return ROUTE.reduce((n, id) => n + (isCommitted(l, id) ? 0 : STAGES[id].R), 0);
}
export const stoneShortfall = (l) => Math.max(0, stoneStillRequired(l) - stoneOnHand(l));
export { STONE_REQUIRED };

// The follow-up transactions the game applies by itself after any accepted one, in order:
// a free stage that has just opened commits (C0 once its two weeds are cleared), and a held
// tool with nothing left to do goes back to its lean. -> [tx]
export function autoTxs(l) {
  const out = [];
  for (const id of STAGE_ORDER) {
    const s = recipe(l, id);
    if (s.coins + s.W + s.R === 0 && stageState(l, id) === 'OPEN') out.push({ t: 'commitFree', stage: id });
  }
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
// tx: { t: 'tick', ms } | { t: 'clearWeed', id } | { t: 'pick', src } | { t: 'depositMat', stage, r }
//   | { t: 'depositCoins', stage } | { t: 'refund', stage } | { t: 'sell', crop }
//   | { t: 'takeTool', tool } | { t: 'returnTool' } | { t: 'dig', id } | { t: 'commitFree', stage }
//   | { t: 'buy', item } | { t: 'drop', r }
export function apply(l0, tx) {
  switch (tx?.t) {
    case 'tick': return tick(l0, tx.ms);
    case 'clearWeed': return clearWeed(l0, tx.id);
    case 'pick': return pick(l0, tx.src);
    case 'takeTool': return takeTool(l0, tx.tool);
    case 'returnTool': return returnTool(l0);
    case 'dig': return dig(l0, tx.id);
    case 'commitFree': return commitFree(l0, tx.stage);
    case 'buy': return buy(l0, tx.item);
    case 'drop': return drop(l0, tx.r ?? null);
    case 'depositMat': return depositMat(l0, tx.stage, tx.r);
    case 'depositCoins': return depositCoins(l0, tx.stage);
    case 'refund': return refund(l0, tx.stage);
    case 'sell': return sell(l0, tx.crop);
    default: return fail('unknownTx');
  }
}

// Active-time clock: only advanced while the world runs (pause, menus, hidden tabs add nothing).
function tick(l0, ms) {
  if (!(Number.isFinite(ms) && ms >= 0)) return fail('badTime');
  const l = clone(l0);
  const events = [];
  l.activeMs += ms;
  for (const [id, s] of Object.entries(l.spots)) {
    if (s.readyAt !== null && s.remaining === 0 && l.activeMs >= s.readyAt) {
      s.remaining = SPOTS[id].batch;
      s.readyAt = null;
      events.push({ type: 'ready', src: id });
    }
  }
  for (const [id, n] of Object.entries(l.nodes)) {
    if (n.readyAt !== null && n.remaining === 0 && l.activeMs >= n.readyAt) {
      n.remaining = NODES[id].yield;
      n.readyAt = null;
      events.push({ type: 'ready', src: id });
    }
  }
  return { ok: true, l, events };
}

// weeding needs the rake in her hands (A25-5)
function clearWeed(l0, id) {
  if (!(id in l0.weeds)) return fail('unknownWeed');
  if (l0.weeds[id]) return fail('alreadyCleared');
  if (!weedPresent(l0, id)) return fail('notPresent');
  if (!patchWorkable(l0, WEED_PLOT[id])) return fail('patchLocked');
  if (l0.tool !== 'rake') return fail('needRake');
  const l = clone(l0);
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

// take a tool from its lean (or swap: the held one goes back as she takes the other)
function takeTool(l0, tool) {
  if (!TOOLS.includes(tool)) return fail('unknownTool');
  if (l0.tool === tool) return fail('alreadyHeld');
  const l = clone(l0);
  const from = l.tool;
  l.tool = tool;
  return { ok: true, l, events: [{ type: 'toolTaken', tool, from }] };
}
function returnTool(l0) {
  if (l0.tool === null) return fail('noTool');
  const l = clone(l0);
  const tool = l.tool;
  l.tool = null;
  return { ok: true, l, events: [{ type: 'toolReturned', tool }] };
}

// dig a crop spot with the shovel: the plant comes up, first ready 5 s later (3 s with U2)
function dig(l0, id) {
  if (!(id in NODES)) return fail('unknownSpot');
  if (!isCommitted(l0, NODES[id].stage)) return fail('notCommitted');
  if (l0.nodes[id].dug) return fail('alreadyDug');
  if (!plotClear(l0, NODES[id].stage)) return fail('weeds');
  if (l0.tool !== 'shovel') return fail('needShovel');
  const l = clone(l0);
  const firstReady = owns(l, 'U2') ? U2_FIRST_READY_MS : NODE_FIRST_READY_MS;
  l.nodes[id] = { remaining: 0, readyAt: l.activeMs + firstReady, dug: true };
  return { ok: true, l, events: [{ type: 'dug', id, stage: NODES[id].stage }] };
}

// a stage that costs nothing commits as soon as it opens (C0, once its two weeds are cleared);
// commits otherwise happen only on a deposit (F25)
function commitFree(l0, stage) {
  if (!(stage in STAGES)) return fail('unknownStage');
  const why = canDeposit(l0, stage);
  if (why) return fail(why);
  if (!fullyFunded(l0, stage)) return fail('notFree');
  return commitIfFunded(clone(l0), stage, []);
}

// an optional upgrade at the crate's Buy tab: after the first sale, coins only, once (§6.5)
function buy(l0, item) {
  const u = UPGRADES[item];
  if (!u) return fail('unknownItem');
  if (!crateAvailable(l0)) return fail('noCrate');
  if (l0.sold.C + l0.sold.S + l0.sold.T === 0) return fail('noSaleYet');
  if (owns(l0, item)) return fail('owned');
  if (l0.purse < u.coins) return fail('noCoins');
  const l = clone(l0);
  l.purse -= u.coins;
  l.owned[item] = true;
  return { ok: true, l, events: [{ type: 'bought', item, coins: u.coins }] };
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

function pick(l0, src) {
  const res = sourceResource(src);
  if (!res) return fail('unknownSource');
  if (src in NODES && !nodeEstablished(l0, src)) return fail('notEstablished');
  if (available(l0, src) <= 0) return fail('empty');
  if (l0.carried[res] >= CAPACITY) return fail('full');
  const l = clone(l0);
  const events = [];
  l.carried[res] += 1;
  if (src in PILES) {
    l.piles[src] -= 1;
    // The renewable spot starts its first 20 s once both starter piles of its resource are empty.
    for (const [sid, spot] of Object.entries(SPOTS)) {
      if (spot.after.includes(src) && spot.after.every((p) => l.piles[p] === 0)) {
        const s = l.spots[sid];
        if (s.remaining === 0 && s.readyAt === null) s.readyAt = l.activeMs + spot.renewMs;
      }
    }
  } else if (src in SPOTS) {
    const s = l.spots[src];
    s.remaining -= 1;
    if (s.remaining === 0) s.readyAt = l.activeMs + SPOTS[src].renewMs;
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
  if (l.carried[res] === CAPACITY) events.push({ type: 'full', res });
  return { ok: true, l, events };
}

function canDeposit(l0, stage) {
  if (!(stage in STAGES)) return 'unknownStage';
  const state = stageState(l0, stage);
  if (state === 'COMMITTED') return 'committed';
  if (state === 'LOCKED') return 'locked';
  return null;
}

function depositMat(l0, stage, r) {
  const why = canDeposit(l0, stage);
  if (why) return fail(why);
  if (!MATERIALS.includes(r)) return fail('notAccepted'); // crops are sold first, never delivered
  if (stillNeeded(l0, stage)[r] <= 0) return fail('notNeeded');
  if (onHand(l0, r) <= 0) return fail('noStock');
  const l = clone(l0);
  // from her head first, then from the material pile (v0.11)
  const from = l.carried[r] > 0 ? 'carried' : 'yard';
  if (from === 'carried') l.carried[r] -= 1; else l.yard[r] -= 1;
  l.stages[stage].deposited[r] += 1;
  return commitIfFunded(l, stage, [{ type: 'deposited', stage, r, n: 1, from }]);
}

// One atomic deposit of min(purse, coins still needed) (spec §6.1).
function depositCoins(l0, stage) {
  const why = canDeposit(l0, stage);
  if (why) return fail(why);
  const need = stillNeeded(l0, stage).coins;
  if (need <= 0) return fail('notNeeded');
  const n = Math.min(l0.purse, need);
  if (n <= 0) return fail('noCoins');
  const l = clone(l0);
  l.purse -= n;
  l.stages[stage].deposited.coins += n;
  return commitIfFunded(l, stage, [{ type: 'deposited', stage, r: 'coins', n }]);
}

// Full funding atomically commits the stage once, consumes the escrow and grants its unlock.
// A crop stage's new nodes open as dig spots (P25-4): nothing grows until each is dug.
function commitIfFunded(l, stage, events) {
  if (fullyFunded(l, stage)) {
    l.stages[stage].committed = true;
    l.paymentEvents.push(stage);
    for (const [id, node] of Object.entries(NODES)) {
      if (node.stage === stage) l.nodes[id] = { remaining: 0, readyAt: null, dug: false };
    }
    events.push({ type: 'committed', stage });
  }
  return { ok: true, l, events };
}

// Return deposited resources: free while incomplete; coins in full to the purse; v0.11: wood and
// stone go back onto the material pile, which has no cap (so `kept` is always zero now; the field
// stays for the card and older tests).
function refund(l0, stage) {
  if (!(stage in STAGES)) return fail('unknownStage');
  if (isCommitted(l0, stage)) return fail('committed');
  const d = l0.stages[stage].deposited;
  if (d.coins === 0 && d.W === 0 && d.R === 0) return fail('nothingDeposited');
  const l = clone(l0);
  const dep = l.stages[stage].deposited;
  const back = { coins: dep.coins, W: 0, R: 0 };
  l.purse += dep.coins;
  dep.coins = 0;
  for (const r of MATERIALS) {
    const n = dep[r];
    l.yard[r] += n;
    dep[r] = 0;
    back[r] = n;
  }
  return { ok: true, l, events: [{ type: 'refunded', stage, back, kept: { W: dep.W, R: dep.R } }] };
}

function sell(l0, crop) {
  if (!crateAvailable(l0)) return fail('noCrate');
  if (!CROPS.includes(crop)) return fail('notSellable');
  if (l0.carried[crop] <= 0) return fail('noStock');
  const l = clone(l0);
  const coins = PRICES[crop];
  l.carried[crop] -= 1;
  l.purse += coins;
  l.lifetimeCoins += coins;
  l.sold[crop] += 1;
  return { ok: true, l, events: [{ type: 'sold', crop, coins }] };
}

// ---------- validation (used by saves and tests) ----------
const isInt = (n, lo = 0, hi = Infinity) => Number.isInteger(n) && n >= lo && n <= hi;
const sameKeys = (o, keys) => o && typeof o === 'object' && Object.keys(o).length === keys.length && keys.every((k) => k in o);

export function validateLedger(l) {
  const errors = [];
  const e = (m) => errors.push(m);
  if (!l || typeof l !== 'object') return ['not an object'];
  if (!sameKeys(l.carried, RESOURCES)) e('carried keys');
  else for (const r of RESOURCES) if (!isInt(l.carried[r], 0, CAPACITY)) e(`carried ${r} outside 0..${CAPACITY}`);
  if (!sameKeys(l.yard, YARD_MATERIALS) || !YARD_MATERIALS.every((r) => isInt(l.yard[r]))) e('yard');
  if (!(l.crop === null || CROPS.includes(l.crop))) e('crop');
  if (typeof l.harvested !== 'boolean') e('harvested');
  if (!isInt(l.purse)) e('purse must be an integer >= 0');
  if (!isInt(l.lifetimeCoins)) e('lifetimeCoins');
  if (!sameKeys(l.sold, CROPS) || !CROPS.every((c) => isInt(l.sold[c]))) e('sold');
  if (!isInt(l.activeMs)) e('activeMs');
  if (!sameKeys(l.stages, STAGE_ORDER)) e('stage keys');
  else {
    const cropOk = l.crop === null || CROPS.includes(l.crop);
    for (const id of STAGE_ORDER) {
      const st = l.stages[id];
      if (typeof st?.committed !== 'boolean') { e(`${id} committed flag`); continue; }
      if (!sameKeys(st.deposited, ['coins', 'W', 'R'])) { e(`${id} deposited keys`); continue; }
      if (!cropOk) continue;
      const s = recipe(l, id);
      for (const k of ['coins', 'W', 'R']) if (!isInt(st.deposited[k], 0, s[k])) e(`${id} deposited ${k} exceeds recipe`);
      if (st.committed) {
        for (const p of prereqsOf(l, id)) {
          if (p === 'second' ? plotsPlanted(l) < 2 : !l.stages[p]?.committed) e(`${id} committed before ${p}`);
        }
        for (const k of ['coins', 'W', 'R']) if (st.deposited[k] !== s[k]) e(`${id} committed but not fully funded`);
      }
    }
    if (l.crop === null && BASE_STAGES.some((id) => l.stages[id].committed)) e('a crop patch is planted but no first crop is chosen');
    const committed = STAGE_ORDER.filter((id) => l.stages[id].committed);
    if (!Array.isArray(l.paymentEvents) || l.paymentEvents.length !== committed.length
      || new Set(l.paymentEvents).size !== l.paymentEvents.length
      || !l.paymentEvents.every((id) => committed.includes(id))) e('paymentEvents must list each committed stage once');
  }
  if (!sameKeys(l.weeds, WEEDS) || !WEEDS.every((w) => typeof l.weeds[w] === 'boolean')) e('weeds');
  if (!sameKeys(l.piles, Object.keys(PILES))) e('pile keys');
  else for (const [id, p] of Object.entries(PILES)) if (!isInt(l.piles[id], 0, p.units)) e(`pile ${id}`);
  const timer = (t, max) => t && isInt(t.remaining, 0, max) && (t.readyAt === null || isInt(t.readyAt));
  if (!sameKeys(l.spots, Object.keys(SPOTS))) e('spot keys');
  else for (const [id, s] of Object.entries(SPOTS)) if (!timer(l.spots[id], s.batch)) e(`spot ${id}`);
  if (!sameKeys(l.nodes, Object.keys(NODES))) e('node keys');
  else {
    for (const [id, n] of Object.entries(NODES)) {
      const node = l.nodes[id];
      if (!timer(node, n.yield) || !sameKeys(node, ['remaining', 'readyAt', 'dug']) || typeof node.dug !== 'boolean') e(`node ${id}`);
      else if (!l.stages?.[n.stage]?.committed && (node.dug || node.remaining > 0 || node.readyAt !== null)) e(`node ${id} active before ${n.stage}`);
      else if (!node.dug && (node.remaining > 0 || node.readyAt !== null)) e(`node ${id} growing before it is dug`);
    }
  }
  if (!sameKeys(l.rocks, ROCK_IDS)) e('rock keys');
  else {
    for (const id of ROCK_IDS) {
      const max = ROCKS[id].recovery ? STONE_REQUIRED : ROCKS[id].units;
      if (!isInt(l.rocks[id], 0, max)) e(`rock ${id}`);
    }
  }
  if (!(l.tool === null || TOOLS.includes(l.tool))) e('tool');
  if (!sameKeys(l.owned, Object.keys(UPGRADES)) || !Object.values(l.owned).every((v) => typeof v === 'boolean')) e('owned');
  const th = l.theft;
  if (!th || !isInt(th.rotation) || !Array.isArray(th.log) || !isInt(th.totalBeforeH4, 0, 8)) e('theft');
  return errors;
}
