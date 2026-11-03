// Economy and station data copied from specification v0.9 §6, changed by the v0.11 build brief (all numbers are P / proposed,
// unplaytested). The ledger reads only this table, so later tuning edits data, ledger tests
// and saves together (spec §6.4 "Update recipes, ledger, saves and tests together").

export const CAPACITY = 12; // per carried resource, independently (A08-retained)
export const MATERIALS = ['W', 'R'];
export const CROPS = ['C', 'S', 'T'];
export const RESOURCES = [...MATERIALS, ...CROPS];
export const RESOURCE_NAMES = { W: 'wood', R: 'stone', C: 'corn', S: 'sunflowers', T: 'tomatoes' };
export const RESOURCE_UNIT = { W: 'wood', R: 'stone', C: 'corn', S: 'sunflower', T: 'tomato' };

// Fixed crop prices in coins per unit (§6.1). Wood and stone are never sellable.
export const PRICES = { C: 2, S: 3, T: 5 };

// Interaction cadence (§4, §6.1): A08 0.75 s/unit work, 1 s/weed, 0.15 s/unit transfer;
// P 0.25 s stillness rule and 0.3 s coin pour. v0.9 (P25-4): 0.5 s to take or swap a tool at the
// tools, 1.5 s to dig a crop spot.
export const TIMING = {
  stillMs: 250,
  workUnitMs: 750,
  weedMs: 1000,
  transferMs: 150,
  coinPourMs: 300,
  toolMs: 500,
  digMs: 1500,
};

// The two farm tools (A25-5, P25-4). Weeding needs the rake and digging a crop spot needs the
// shovel; she holds at most one, and it goes back to its lean by itself when no open job for it
// is left. Gathering, harvesting, selling, delivering and building need no tool.
export const TOOLS = ['rake', 'shovel'];
export const TOOL_NAMES = { rake: 'rake', shovel: 'shovel' };

// Weed clumps. They yield nothing and never come back.
// v0.11 (captain 2026-11-02: "Weeds should be where the crops are goint to grow"): the opening's
// weeds sit on the three crop patches, two each, right where the first two plants of each will
// grow: corn (wC1, wC2), sunflowers (wS0a, wS0b) and the tomatoes in the raised bed (wT0a,
// wT0b). The first patch she rakes is her free first crop (FIRST_CROP below). The house mat has
// no weed any more. P25-4b (Q25-2) is kept for the two expansions: C1 and S1 each grow two
// clumps when they unlock. The ids keep the stage in them (wS0a = S0's first).
export const WEEDS = ['wC1', 'wC2', 'wS0a', 'wS0b', 'wT0a', 'wT0b', 'wC1a', 'wC1b', 'wS1a', 'wS1b'];
// the crop plot each weed belongs to
export const WEED_PLOT = {
  wC1: 'C0', wC2: 'C0', wS0a: 'S0', wS0b: 'S0', wT0a: 'T0', wT0b: 'T0', wC1a: 'C1', wC1b: 'C1', wS1a: 'S1', wS1b: 'S1',
};
// the weeds on the three crop patches, there from the start
export const OPENING_WEEDS = ['wC1', 'wC2', 'wS0a', 'wS0b', 'wT0a', 'wT0b'];

// v0.11: the free first crop (captain: "We want liberty to start weeding corn or tomatoes or
// sunflowers and planting after that"). Each crop has one base patch; the first one she rakes is
// her crop: it costs nothing and commits as soon as its two weeds are raked, and it themes every
// card and menu for good. The other two open after her first harvest, in any order, and cost
// their coins at their station.
export const BASE_STAGE = { C: 'C0', S: 'S0', T: 'T0' };
export const CROP_OF_STAGE = { C0: 'C', S0: 'S', T0: 'T' };
export const BASE_STAGES = Object.values(BASE_STAGE);

// v0.11 (captain: "resources accumilate next to the house"): the material pile by the house's
// side wall. Walking past it with wood or stone on her head drops them there, one unit every
// once, all of it (one saved step; the units fly off her stack DROP_MS apart); building takes
// from her head first, then from the pile. Crops are never dropped (they are sold at the crate).
// The pile has no cap: CAPACITY limits only what she carries in one trip.
export const YARD_MATERIALS = ['W', 'R'];
export const DROP_MS = 60;
export const YARD_SHOWN = { W: 24, R: 18 }; // the pile draws this many; more shows as +N

// Starter fallen-branch piles (§6.1): two piles of 4W, branches that have already fallen.
export const PILES = {
  pW1: { res: 'W', units: 4 },
  pW2: { res: 'W', units: 4 },
};

// The renewable wood spot (§6.2): first batch 20 s of active time after both starter piles are
// emptied; each depleted batch returns 20 s after its last unit. Each batch arrives as a dead
// branch falling from the tree (A25-6, P25-5); wood is unlimited (A25-8 answer 5).
export const SPOTS = {
  sW: { res: 'W', batch: 4, renewMs: 20000, after: ['pW1', 'pW2'] },
};

// Loose rocks (A25-7, P25-6): stone is finite. Eight rocks of 3R around the map, 24R against the
// 18R the route needs; they never renew. R1 and R2 are the opening's 6R (the former rubble piles).
// RX is the recovery rock (§6.6 point 1): empty and absent unless a save breaks the stone
// invariant, when it appears at R1's place holding the missing units.
export const ROCKS = {
  R1: { units: 3 }, R2: { units: 3 }, R3: { units: 3 }, R4: { units: 3 },
  R5: { units: 3 }, R6: { units: 3 }, R7: { units: 3 }, R8: { units: 3 },
  RX: { units: 0, recovery: true },
};
export const ROCK_IDS = Object.keys(ROCKS);
export const STONE_IN_ROCKS = Object.values(ROCKS).reduce((n, r) => n + r.units, 0); // 24

// Crop nodes (§6.2): a stage commit opens each new node as a dig spot (P25-4); digging it with
// the shovel plants it, first ready 5 s later (3 s with U2); each node renews after its last unit
// is collected (corn/sunflower 15 s, tomato 20 s).
export const NODE_FIRST_READY_MS = 5000;
export const NODE_RENEW_MS = { C: 15000, S: 15000, T: 20000 };
export const NODES = {
  c1: { res: 'C', yield: 3, stage: 'C0' },
  c2: { res: 'C', yield: 3, stage: 'C0' },
  c3: { res: 'C', yield: 3, stage: 'C1' },
  c4: { res: 'C', yield: 3, stage: 'C1' },
  s1: { res: 'S', yield: 2, stage: 'S0' },
  s2: { res: 'S', yield: 2, stage: 'S0' },
  s3: { res: 'S', yield: 2, stage: 'S1' },
  s4: { res: 'S', yield: 2, stage: 'S1' },
  t1: { res: 'T', yield: 2, stage: 'T0' },
  t2: { res: 'T', yield: 2, stage: 'T0' },
};

// Stage recipes, prerequisites and work seconds (§6.3). `weeds` are a base crop plot's two
// clumps: raked, they commit her first crop free (another plot's clumps only gate its digging). The crop stages (`crop: true`) cost coins only (A25-5, S25-01); their
// work is digging their spots. v0.11: the base crop she starts first costs nothing (its `coins`
// apply only when it is not her first crop, `recipe` in ledger.js) and commits as soon as its two
// weeds are raked; the other two base crops open after her first harvest (`afterHarvest`), in any
// order (spec v0.11 P27-5: corn 8, sunflowers 8, tomatoes 14 when not chosen first). 'first' in
// a prereq list means her first crop's stage, 'second' any second crop plot. Every build that
// takes wood or stone is hammered up by Vanessa herself (`workMs`, the hammering); A1 is hired
// with the same card (`hire`): the archer itself is not built yet, so it arrives later.
export const STAGES = {
  C0: { label: 'corn patch', prereq: [], weeds: ['wC1', 'wC2'], coins: 8, W: 0, R: 0, workMs: 0, crop: true, base: 'C', afterHarvest: true },
  S0: { label: 'sunflower patch', prereq: [], weeds: ['wS0a', 'wS0b'], coins: 8, W: 0, R: 0, workMs: 0, crop: true, base: 'S', afterHarvest: true },
  T0: { label: 'tomato bed', prereq: [], weeds: ['wT0a', 'wT0b'], coins: 14, W: 0, R: 0, workMs: 0, crop: true, base: 'T', afterHarvest: true },
  H1: { label: 'house foundation', prereq: ['first'], coins: 10, W: 4, R: 4, workMs: 3000 },
  G1: { label: 'path', prereq: ['H1'], coins: 6, W: 0, R: 3, workMs: 2000 },
  H2: { label: 'walls', prereq: ['H1', 'second'], coins: 16, W: 4, R: 2, workMs: 4000 },
  A1: { label: 'first elf archer', prereq: ['H2'], coins: 12, W: 2, R: 0, workMs: 0, hire: true },
  C1: { label: 'corn expansion', prereq: ['A1', 'C0'], coins: 14, W: 0, R: 0, workMs: 0, crop: true },
  S1: { label: 'sunflower expansion', prereq: ['A1', 'S0'], coins: 14, W: 0, R: 0, workMs: 0, crop: true },
  G2: { label: 'bench', prereq: ['H1'], coins: 10, W: 4, R: 0, workMs: 2000 },
  G3: { label: 'stepping stones', prereq: ['H1'], coins: 8, W: 0, R: 3, workMs: 2000 },
  G4: { label: 'tree-border stones', prereq: ['H1'], coins: 8, W: 0, R: 4, workMs: 2000 },
  H3: { label: 'roof', prereq: ['H2', 'A1', 'T0', 'C1', 'S1'], coins: 26, W: 2, R: 2, workMs: 4000 },
  H4: { label: 'home', prereq: ['H3', 'G1', 'G2', 'G3', 'G4'], coins: 34, W: 4, R: 0, workMs: 4000 },
};
// Recommended order of the goal card (§6.3 table order, v0.11: the base crops first).
export const STAGE_ORDER = ['C0', 'S0', 'T0', 'H1', 'G1', 'H2', 'A1', 'C1', 'S1', 'G2', 'G3', 'G4', 'H3', 'H4'];
// the stages the farm needs (all of them)
export const ROUTE = STAGE_ORDER;
export const HOUSE_STAGES = ['H1', 'H2', 'H3', 'H4'];
export const CROP_STAGES = STAGE_ORDER.filter((id) => STAGES[id].crop);
// stages Vanessa hammers up herself: the house and the property builds (crop plots are dug, A1
// is hired)
export const HAMMERED = ROUTE.filter((id) => STAGES[id].W + STAGES[id].R > 0 && !STAGES[id].hire);
// stone the main route needs in all (18): the stone invariant's right-hand side (§6.6 point 1)
export const STONE_REQUIRED = ROUTE.reduce((n, id) => n + STAGES[id].R, 0);

// Optional upgrades at the market crate's Buy tab (§6.5), opened after the first sale. Coins
// only, never required, never refunded. v0.9 (A25-8 answer 6, P25-7): they speed the tools' own
// jobs and cost 10 coins each. No optional item costs stone (the §6.6 stone invariant).
export const UPGRADES = {
  U1: { label: 'wide rake head', coins: 10, effect: 'Weeding takes 0.5 s per clump instead of 1 s.' },
  U2: { label: 'sharpened shovel', coins: 10, effect: 'Digging takes 0.75 s per spot instead of 1.5 s, and a newly dug plant is first ready in 3 s instead of 5 s.' },
};
export const U1_WEED_MS = 500;
export const U2_DIG_MS = 750;
export const U2_FIRST_READY_MS = 3000;

