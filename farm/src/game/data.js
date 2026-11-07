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

// v0.12 (captain 2026-11-02: "the sticks appear more randomly around the tree, if you dont go
// pick them up quick enough you can lose them"): after the two starter piles, wood comes as sticks
// (fallen branches of STICK.units) that drop from the tree onto one of the free STICK_SLOTS around
// it, one every STICK.everyMs of active time while fewer than STICK.max lie there. The slot
// is chosen by a seeded hash of a counter in the ledger, so it looks random but replays the same.
// A stick left STICK.lifeMs after it lands is gone (a small fade). Wood stays unlimited, so this
// never softlocks; Help me finish keeps the sticks from going.
// (spec v0.12 P28-5 defaults: a 4-unit branch every 20 s while fewer than two lie, from the
// house foundation on; one left 45 s fades; the two starter piles never fade)
export const STICK = { units: 4, after: 'H1', everyMs: 20000, max: 2, lifeMs: 45000 };
export const STICK_SLOTS = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8'];

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
// the shovel plants it, first ready 5 s later; each node renews after its last unit is collected
// (corn/sunflower 15 s, tomato 20 s).
export const NODE_FIRST_READY_MS = 5000;
export const NODE_RENEW_MS = { C: 15000, S: 15000, T: 20000 };
// v0.15 (captain: "can you make tomato plant be bigger after another round of growing"): each
// time a planted node's crop comes ready its round count goes up (`grown` in the ledger; digging
// or replanting starts it at 0). A tomato plant is drawn one size step bigger for every round
// after its first crop, up to `steps` steps: 1x for the first crop, 1.25x for the second, 1.5x
// from the third on. A wilted plant is a new plant: back to 1x. v0.16 (captain: "taller, not
// bigger, like normal"): a step is drawn as one more tier of stem, leaves and a truss on top of the
// plant (world.js sizePlant), so it grows taller and keeps its width.
export const TOMATO_GROWTH = { step: 0.25, steps: 2 };
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
// clumps: raked, they commit her first crop free (another plot's clumps only gate its digging).
// The crop stages (`crop: true`) cost coins only (A25-5, S25-01); their work is digging their
// spots. v0.11: the base crop she starts first costs nothing (its `coins`
// apply only when it is not her first crop, `recipe` in ledger.js) and commits as soon as its two
// weeds are raked; the other two base crops open after her first harvest (`afterHarvest`), in any
// order (spec v0.11 P27-5: corn 8, sunflowers 8, tomatoes 14 when not chosen first). 'first' in
// a prereq list means her first crop's stage, 'second' any second crop plot. Every build that
// takes wood or stone is hammered up by Vanessa herself (`workMs`, the hammering); A1 is hired
// (`hire`; v0.16: the archer stands at his post from then on, world.js, and says ARCHER_LINES[0]). v0.12: nothing is paid in
// part any more; a stage is built in one go, with its DIY button, once she has all of it (on her
// head, at the yard pile and in her purse) and stands at it.
export const STAGES = {
  C0: { label: 'corn patch', prereq: [], weeds: ['wC1', 'wC2'], coins: 8, W: 0, R: 0, workMs: 0, crop: true, base: 'C', afterHarvest: true },
  S0: { label: 'sunflower patch', prereq: [], weeds: ['wS0a', 'wS0b'], coins: 8, W: 0, R: 0, workMs: 0, crop: true, base: 'S', afterHarvest: true },
  // v0.12 (captain: "el lugar donde cultivas tomates deberia tambien de ser construido con sticks"):
  // the tomato plot is the raised bed, built with 4 wood (sticks) by DIY before its tomatoes are
  // dug; its coins only when tomatoes are not her first crop (spec v0.12 P28-7)
  T0: { label: 'raised bed', prereq: [], weeds: ['wT0a', 'wT0b'], coins: 14, W: 4, R: 0, workMs: 2000, crop: true, base: 'T', afterHarvest: true },
  H1: { label: 'house foundation', prereq: ['first'], coins: 10, W: 4, R: 4, workMs: 3000 },
  G1: { label: 'path', prereq: ['H1'], coins: 6, W: 0, R: 3, workMs: 2000 },
  H2: { label: 'walls', prereq: ['H1', 'second'], coins: 16, W: 4, R: 2, workMs: 4000 },
  A1: { label: 'archer', prereq: ['H2'], coins: 12, W: 2, R: 0, workMs: 0, hire: true },
  C1: { label: 'corn expansion', prereq: ['A1', 'C0'], coins: 14, W: 0, R: 0, workMs: 0, crop: true },
  S1: { label: 'sunflower expansion', prereq: ['A1', 'S0'], coins: 14, W: 0, R: 0, workMs: 0, crop: true },
  G2: { label: 'bench', prereq: ['H1'], coins: 10, W: 4, R: 0, workMs: 2000 },
  G3: { label: 'stepping stones', prereq: ['H1'], coins: 8, W: 0, R: 3, workMs: 2000 },
  G4: { label: 'tree-border stones', prereq: ['H1'], coins: 8, W: 0, R: 4, workMs: 2000 },
  // v0.15 (captain: "the walls should only be walls, roof only be roof, add an extra step for
  // chimney, last step still the home with door and window"): five house stages. The old H3
  // (roof and chimney: 26 coins, 2 wood, 2 stone, 4 s) is split between the roof (its wood) and
  // the chimney (its stone, a stack of stones and mortar), so the house costs what it did; the
  // home is the old H4 with the door frame and step the walls used to bring.
  H3: { label: 'roof', prereq: ['H2', 'A1', 'T0', 'C1', 'S1'], coins: 14, W: 2, R: 0, workMs: 2500 },
  H4: { label: 'chimney', prereq: ['H3'], coins: 12, W: 0, R: 2, workMs: 2000 },
  H5: { label: 'home', prereq: ['H4', 'G1', 'G2', 'G3', 'G4'], coins: 34, W: 4, R: 0, workMs: 4000 },
};
// Reserved for optional stages; the phone playtest removed the second archer.
export const OPTIONAL_STAGES = [];
// v0.16 (captain: "it should have a funny line when it is hired to be an archer"): what the archer
// says as he arrives at his post, in his deadpan, self-important manner (original lines; the first
// is the one the game says, the others are offered to the captain in the build report)
export const ARCHER_LINES = [
  'Hired. Correct decision. I have guarded beet fields since I was six, and no bird has ever taken a single seed. Birds. Seeds. Crossbow.',
  'Question: what eats sunflower seeds? Birds. Question: what stops birds? Me. Assistant to the farmer, reporting for duty.',
  'I trained my whole life for this. Mostly on beets, but the principle is identical. Stand back, I am loading the crossbow.',
];
// Recommended order of the goal card (§6.3 table order, v0.11: the base crops first).
export const STAGE_ORDER = ['C0', 'S0', 'T0', 'H1', 'G1', 'H2', 'A1', 'C1', 'S1', 'G2', 'G3', 'G4', 'H3', 'H4', 'H5'];
// every stage the ledger keeps: the route, then the optional ones (v0.17)
export const ALL_STAGES = [...STAGE_ORDER, ...OPTIONAL_STAGES];
// One archer, guarding all three crops.
export const ARCHERS = ['A1'];
// the stages the farm needs (all of them)
export const ROUTE = STAGE_ORDER;
// v0.15: foundation, walls, roof, chimney, home; the last one finishes the farm (the finale)
export const HOUSE_STAGES = ['H1', 'H2', 'H3', 'H4', 'H5'];
export const LAST_STAGE = 'H5';
export const CROP_STAGES = STAGE_ORDER.filter((id) => STAGES[id].crop);
// stages Vanessa hammers up herself: the house, the property builds and the raised bed (other
// crop plots are dug, A1 is hired)
export const HAMMERED = ROUTE.filter((id) => STAGES[id].W + STAGES[id].R > 0 && !STAGES[id].hire);
// stone the main route needs in all (18): the stone invariant's right-hand side (§6.6 point 1)
export const STONE_REQUIRED = ROUTE.reduce((n, id) => n + STAGES[id].R, 0);

// v0.12 (captain 2026-11-02: "remove the enhancements on rake and shovel, not needed"): the wide
// rake head and the sharpened shovel are gone, and with them the market crate's Buy tab.

// v0.12 yard sale (captain: "she puts the goods on the table and accumulates, then she puts the
// sign and when she has a certain amount people come and the goods disappear"): walking past the
// yard-sale table with crops on her head sets them out on it, up to TABLE_CAP; when it is full a
// Yard Sale button appears (tapping the stand works too), and the sale pays PRICES per item.
export const TABLE_CAP = 6; // one table holds six
export const TABLE_REACH_M = 1.2; // like the yard pile: within about 1.2 m her crops go onto it
// v0.13 (captain's v0.12 playtest: "as your house is growing more people come and more tables
// appear (the only minimum is 6 produce items always), but the maximum keeps increasing"; answer 3
// "1 table per stage"): one table at the start and one more with each house stage, four at most
// (by the roof, H3); a sale always needs SALE_MIN on the tables and holds up to six per table
// (v0.14: once all four stand there is no maximum, `tableCap` in ledger.js).
// Buyers come in a crowd that grows with the tables (BUYERS[tables - 1], [least, most]).
// v0.16 (captain: "Remove the extra sellers, just produce an extra table every progression of the
// house"): one table at the start and one more with every house stage, six with the home (H5); the
// neighbours' stalls and their sellers are gone. As in v0.14 the tables have no maximum from the
// fourth on (TABLES_UNLIMITED, the roof), so the route's sales are unchanged.
export const SALE_MIN = 6;
export const TABLES_MAX = 6;
export const TABLES_UNLIMITED = 4;
export const BUYERS = [[2, 3], [4, 5], [6, 7], [8, 10], [9, 11], [10, 12]];

// v0.12 (captain: "weeds keep appearing even over planted crops, you remove them because if not
// you can lose the crop"; answer 1 "One plant wilts"): from the house foundation until the home
// (v0.15: H5), a weed creeps onto one planted crop spot every REGROW.everyMs of active time, one
// at a time. It grows for REGROW.growMs (a first warning at warnMs, a second as it is grown and
// choking the plant); raked (the rake, 1 s) it is gone; left REGROW.wiltMs in all, the one plant
// under it wilts and its spot is a dig spot again (`Replant`, free with the shovel). Help me finish
// turns it off and clears an open one. (Spec v0.12 P28-4 defaults, as firstmate relayed them.)
// v0.15 (captain: "Weed should be bigger and more noticeable, grow faster on crops"): a weed comes
// back after 75 s instead of 120 s, shows as a clump after 10 s and is grown and choking after
// 30 s instead of 60 s; the wilt stays bounded: one plant, 120 s after its weed came, as before.
export const REGROW = { after: 'H1', until: LAST_STAGE, everyMs: 75000, warnMs: 10000, growMs: 30000, wiltMs: 120000 };
// a regrowth weed's id: `wr-` and the crop node it covers
export const REGROW_WEEDS = Object.keys(NODES).map((n) => `wr-${n}`);
export const regrowNode = (id) => (typeof id === 'string' && id.startsWith('wr-') && id.slice(3) in NODES ? id.slice(3) : null);
export const isWeedId = (id) => WEEDS.includes(id) || regrowNode(id) !== null;

// v0.17 birds (spec §7, §6.6 point 4; A22: "birds steal crops, archers chase them off, and losses
// are capped so nobody gets stuck"). One bird event every `everyMs` of active time at most, from
// the second crop plot on. The kinds rotate in a fixed order, skipping any that cannot happen now:
// a bird perches on the bench (from the bench's restoration, G2: it may leave a stain to clean),
// one lands on the ready crop plant farthest from Vanessa, one goes for the crops on her head.
// Each gives a `warnMs` warning that names its target. A node thief sits `sitMs` before it takes
// one unit; a head thief chases her for `approachMs`; a free Wave before the take, or a hired
// archer whose cover the bird enters, sends it off with nothing. An archer covers the crops he
// guards (ARCHER_GUARDS: Dwight guards all three crops) and, for crops on her head,
// coverM round his post. Caps: one unit per event, windowMax in windowMs, totalMax
// between the second crop plot and the home. Nothing else is ever taken.
export const BIRDS = {
  everyMs: 16000, firstMs: 8000, warnMs: 2000, approachMs: 2000, landMs: 900, sitMs: 3000, leaveMs: 1200,
  windowMs: 120000, windowMax: 3, totalMax: 8,
  coverM: 3.5, drawMs: 800, fireMs: 3000, perchMs: 3000, cleanMs: 1800,
};
export const BIRD_KINDS = ['perch', 'node', 'carried'];
export const ARCHER_GUARDS = { A1: ['c1', 'c2', 'c3', 'c4', 's1', 's2', 's3', 's4', 't1', 't2'] };
