// Economy and station data copied from specification v0.9 §6 (all numbers are P / proposed,
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
// - The three opening clumps (§6.1): two at the corn approach, one on the house mat. The two
//   corn-approach clumps are the corn plot's weeds (C0 commits, free, once they are cleared); the
//   house-mat clump gates the house mat.
// - P25-4b (Q25-2, approved): two clumps on each new crop plot, growing when its stage unlocks
//   and raked before its spots can be dug. The ids keep the stage in them (wS0a = S0's first).
export const WEEDS = ['wC1', 'wC2', 'wH', 'wS0a', 'wS0b', 'wT0a', 'wT0b', 'wC1a', 'wC1b', 'wS1a', 'wS1b'];
// the crop plot each weed belongs to (null: the house mat's clump)
export const WEED_PLOT = {
  wC1: 'C0', wC2: 'C0', wH: null,
  wS0a: 'S0', wS0b: 'S0', wT0a: 'T0', wT0b: 'T0', wC1a: 'C1', wC1b: 'C1', wS1a: 'S1', wS1b: 'S1',
};
export const OPENING_WEEDS = ['wC1', 'wC2', 'wH'];

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

// Stage recipes, prerequisites and work seconds (§6.3). `weeds` are clumps that must be cleared
// before the stage opens (C0's two corn-approach clumps; the house-mat clump for H1). The crop
// stages (`crop: true`) cost coins only (A25-5, S25-01): no wood or stone; their work is digging
// their spots (2 x 1.5 s), which replaces the old 3 s stage animation. C0 costs nothing, has no
// mat and commits as soon as its two weeds are cleared (`commitFree`).
export const STAGES = {
  C0: { label: 'corn plot', prereq: [], weeds: ['wC1', 'wC2'], coins: 0, W: 0, R: 0, workMs: 0, crop: true },
  H1: { label: 'house foundation', prereq: ['C0'], weeds: ['wH'], coins: 10, W: 4, R: 4, workMs: 3000 },
  G1: { label: 'path', prereq: ['H1'], coins: 6, W: 0, R: 3, workMs: 2000 },
  S0: { label: 'sunflowers', prereq: ['H1'], coins: 8, W: 0, R: 0, workMs: 0, crop: true },
  H2: { label: 'walls', prereq: ['S0', 'H1'], coins: 16, W: 4, R: 2, workMs: 4000 },
  A1: { label: 'first elf archer', prereq: ['H2', 'S0'], coins: 12, W: 2, R: 0, workMs: 3000 },
  T0: { label: 'tomato bed', prereq: ['A1'], coins: 14, W: 0, R: 0, workMs: 0, crop: true },
  C1: { label: 'corn expansion', prereq: ['A1', 'C0'], coins: 14, W: 0, R: 0, workMs: 0, crop: true },
  S1: { label: 'sunflower expansion', prereq: ['C1', 'S0'], coins: 14, W: 0, R: 0, workMs: 0, crop: true },
  G2: { label: 'bench', prereq: ['H1'], coins: 10, W: 4, R: 0, workMs: 2000 },
  G3: { label: 'stepping stones', prereq: ['H1'], coins: 8, W: 0, R: 3, workMs: 2000 },
  G4: { label: 'tree-border stones', prereq: ['H1'], coins: 8, W: 0, R: 4, workMs: 2000 },
  H3: { label: 'roof', prereq: ['H2', 'A1', 'T0', 'C1', 'S1'], coins: 26, W: 2, R: 2, workMs: 4000 },
  H4: { label: 'home', prereq: ['H3', 'G1', 'G2', 'G3', 'G4'], coins: 34, W: 4, R: 0, workMs: 4000 },
};
// Recommended order of the goal card (§6.3 table order).
export const STAGE_ORDER = ['C0', 'H1', 'G1', 'S0', 'H2', 'A1', 'T0', 'C1', 'S1', 'G2', 'G3', 'G4', 'H3', 'H4'];
export const HOUSE_STAGES = ['H1', 'H2', 'H3', 'H4'];
export const CROP_STAGES = STAGE_ORDER.filter((id) => STAGES[id].crop);
// stone the main route needs in all (18): the stone invariant's right-hand side (§6.6 point 1)
export const STONE_REQUIRED = STAGE_ORDER.reduce((n, id) => n + STAGES[id].R, 0);

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

// Stages this slice presents in the world (code-reuse report §10 step 4). The ledger knows
// every stage so the §6.4 route replay can run as a unit test.
export const SLICE_STAGES = ['C0', 'H1'];
