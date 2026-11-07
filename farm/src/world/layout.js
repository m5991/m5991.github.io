// Projection and object registry (annex §D.5): drawing anchors from spec v0.6 §3, drawn
// extents read off the original drawing (1280 x 1064 photo; v = % of height, u = % of width),
// and the P placements of the slice stations. Ground positions are inverse-projected through
// the finale camera at load; per-object scale is solved from the drawn extent (`fit`).

// Drawn extents used for the per-object scale overrides (u = base centre; v from top to base).
export const FITS = {
  D01: { u: 34.5, vTop: 22, vBottom: 46.5, yaw: -0.42 }, // house incl. roof and chimney, two-wall view
  D09: { u: 10, vTop: 40, vBottom: 77.5, yaw: 0 }, // tree, trunk base (9,77)
  D10: { u: 16, vTop: 68.5, vBottom: 78.5, yaw: 0.85 }, // bench, diagonal to the viewer (v0.17: turned 0.2 rad more, to face the path's way into the ring)
  D18: { u: 68.5, vTop: 78, vBottom: 85.5, yaw: 0 }, // raised bed boards
  D15: { u: 66, vTop: 36, vBottom: 48.5, yaw: 0 }, // a front-row corn stalk sets the corn scale
  D16: { u: 86, vTop: 51.5, vBottom: 70, yaw: 0 }, // one sunflower sets the sunflower scale
  D13: { u: 42, vTop: 38.5, vBottom: 46.8, yaw: 0 }, // blue shovel
  D14: { u: 43.6, vTop: 38, vBottom: 46.2, yaw: 0 }, // blue rake
};

export const VANESSA_START = { u: 56, v: 81 }; // D17

// D15 corn: live nodes on the front row (the accessible edge), the rest silhouettes.
export const CORN_PLANTS = [
  ...[52, 59, 66, 73, 80].map((u) => ({ u, v: 41 })),
  ...[55, 62, 69, 76, 82].map((u) => ({ u, v: 44.5 })),
  { u: 54, v: 48.5 }, { u: 57.5, v: 48.5, node: 'c1' }, { u: 64, v: 48.5, node: 'c2' },
  { u: 71.5, v: 48.5, node: 'c3' }, { u: 78.5, v: 48.2, node: 'c4' },
];
export const SUNFLOWERS = [{ u: 80, v: 66.5 }, { u: 84, v: 70 }, { u: 88, v: 64.5 }, { u: 92, v: 68.5 }];

// D11 border stones (scattered before G4) along the drawn ring, gap facing the path
export const BORDER_POLYLINE = [
  [[11, 65.5], [18, 65], [24, 66], [25.5, 70], [26, 73.5]],
  [[3.5, 70], [2, 74], [1.8, 78], [3, 82], [8, 83.5], [13, 83.5], [18, 83]],
];
// D12 stepping stones: v0.16 lays them in a short line from the back of the house to the left of
// the corn field, worked out from the fitted house (world.js steppingPlaces, STEPPING)
// D11: v0.16 settles the border stones on one ring round the tree and the bench, its only gap in
// front of the bench where the path ends (world.js ringPlaces, RING); BORDER_POLYLINE gives its
// extent, and PATH's last point the side its gap faces
export const PATH = [[36, 47], [38, 52], [40, 57.5], [39.5, 62], [36.5, 68], [31, 74], [25.5, 78], [20, 81]];

// Sky layers (camera-facing): centre and drawn radius / width in drawing units
export const SKY = {
  D22: { u: 88.7, v: 18.3, rv: 6.2 },
  D21: { u: 9, v: 19.5, wu: 9 },
};

// v0.12: where sticks drop around the tree (u, v)
export const STICK_PLACES = [[29, 61.5], [25, 59], [21.5, 62], [26.5, 64.5], [30.5, 66.5], [22, 57.5], [18, 60.5], [32.5, 67.5]];

// Slice stations (P placements, spec §3/§6.1): weeds, starter piles, the wood spot, rocks, the
// tools, mats and the crate. Wood sits right of the tree's canopy (playtest fix, captain phone
// test 2026-11-01): at the gameplay camera the old spots (u 23-28.5) lay behind the canopy,
// hiding the piles and Vanessa while she gathered; the tree still fades when it hides her or a
// target (world.js).
// v0.9 (P25-6): stone comes only from eight finite loose rocks around the map. R1 and R2 are the
// former rubble piles by the house approach; the rubble spot is gone. RX, the recovery rock, sits
// beside R1 and shows only when a save needed it (§6.6). (P25-4): `tools` is where the blue rake
// D14 and shovel D13 lean against the house's side wall; standing there takes one. C0 has no mat.
// v0.18 (captain: "No rocks on the path"): R1, R2 and RX move a little west, off the path's dirt
// where it leaves the door (v0.17: R2 sat on it, R1 and RX on its edge; test/playtest-v018).
export const ROCK_PLACES = {
  R1: { u: 31.5, v: 53.5 }, R2: { u: 32.5, v: 55 }, R3: { u: 22, v: 90 }, R4: { u: 45, v: 70 },
  R5: { u: 62, v: 62 }, R6: { u: 74, v: 56 }, R7: { u: 94, v: 84 }, R8: { u: 50, v: 93 },
  RX: { u: 29, v: 52.5 },
};
// v0.11 (captain 2026-11-02): the weeds sit where the crops will grow, two on each crop patch
// right in front of the first two plants (corn c1/c2, sunflowers s1/s2, the tomato stems in the
// raised bed: `bed` places them on the bed's soil at that stem); C1 and S1 keep their two each.
// Every build has a station: the house (H1-H5 share the house mat; the next stage shows), the
// path, the bench, the stepping stones, the tree border, and a station per crop patch for the
// crops that cost coins. `yard` is the material pile by the house's side wall, beside the tools.
export const SUNFLOWER_NODES = ['s1', 's2', 's3', 's4']; // at SUNFLOWERS[i]
const SUNFLOWERS_UV = (i) => ({ u: SUNFLOWERS[i].u, v: SUNFLOWERS[i].v });
export const TOMATO_NODES = { t1: [0.45, 0.08], t2: [0.8, -0.16] }; // stems in the bed (bed space)
export const TOMATO_UV = { t1: { u: 72.5, v: 81.5 }, t2: { u: 75, v: 80.5 } }; // approximate, for route timing
// each weed sits on a dig spot (`on`): raking it uncovers the spot (spec v0.11 P27-4)
export const STATIONS = [
  { id: 'wC1', kind: 'weed', on: 'c1', u: 57.5, v: 48.5, r: 0.3, label: 'weeds' },
  { id: 'wC2', kind: 'weed', on: 'c2', u: 64, v: 48.5, r: 0.3, label: 'weeds' },
  { id: 'wS0a', kind: 'weed', on: 's1', ...SUNFLOWERS_UV(0), r: 0.3, label: 'weeds' },
  { id: 'wS0b', kind: 'weed', on: 's2', ...SUNFLOWERS_UV(1), r: 0.3, label: 'weeds' },
  { id: 'wT0a', kind: 'weed', on: 't1', ...TOMATO_UV.t1, bed: 't1', r: 0.3, label: 'weeds' },
  { id: 'wT0b', kind: 'weed', on: 't2', ...TOMATO_UV.t2, bed: 't2', r: 0.3, label: 'weeds' },
  { id: 'wC1a', kind: 'weed', on: 'c3', u: 71.5, v: 48.5, r: 0.3, label: 'weeds' },
  { id: 'wC1b', kind: 'weed', on: 'c4', u: 78.5, v: 48.2, r: 0.3, label: 'weeds' },
  { id: 'wS1a', kind: 'weed', on: 's3', ...SUNFLOWERS_UV(2), r: 0.3, label: 'weeds' },
  { id: 'wS1b', kind: 'weed', on: 's4', ...SUNFLOWERS_UV(3), r: 0.3, label: 'weeds' },
  { id: 'pW1', kind: 'pile', u: 32, v: 59, r: 0.35, label: 'fallen branch' },
  { id: 'pW2', kind: 'pile', u: 35, v: 62.5, r: 0.35, label: 'fallen branch' },
  // v0.12: the slots around the tree where sticks drop (STICK_SLOTS), right of and below the
  // canopy where the play camera sees them, clear of the path, the bench and the border ring
  ...STICK_PLACES.map(([u, v], i) => ({ id: `k${i + 1}`, kind: 'stick', u, v, r: 0.3, label: 'stick' })),
  ...Object.entries(ROCK_PLACES).map(([id, p]) => ({ id, kind: 'rock', ...p, r: 0.35, label: 'loose rocks' })),
  { id: 'tools', kind: 'tools', u: 43, v: 47.4, r: 0.3, label: 'tools' },
  // P27-1 (anchor about (44.5,45.5), to tune in play): just right of the leaning tools, so the
  // tools never hide it, against the house's right wall and short of the stepping stones
  { id: 'yard', kind: 'yard', u: 45.8, v: 47.2, r: 0.5, label: 'yard pile' },
  // v0.12 (answer 3, "No spots at all"): every build has a site, but nothing marks it: the part's
  // own blueprint outline shows where it goes, and the DIY button works within reach of the site.
  // The house (H1-H5 share the house front; the next stage shows), the path bend, the bench, the
  // stepping stones, the border gap, the archer's post, the crop plots that cost coins, and the
  // raised bed (T0, built with sticks).
  ...['H1', 'H2', 'H3', 'H4', 'H5'].map((id) => ({ id, kind: 'site', u: 41, v: 52.5, r: 0.9, label: 'house', house: true })),
  { id: 'G1', kind: 'site', u: 39, v: 62, r: 0.7, label: 'path' },
  { id: 'G2', kind: 'site', u: 23, v: 72, r: 0.7, label: 'bench' },
  // v0.15: one of the stones (v0.16: the middle one of their line from the back of the house to
  // the corn; world.js places the site there exactly, from the fitted house; this is where it
  // lands at the play fit)
  { id: 'G3', kind: 'site', u: 47, v: 44.5, r: 0.6, label: 'stepping stones' },
  { id: 'G4', kind: 'site', u: 28, v: 80, r: 0.6, label: 'tree-border stones' },
  // A1: the archer's post beside the path between the crop approaches (§7)
  { id: 'A1', kind: 'site', u: 66, v: 66, r: 0.6, label: 'archer post' },
  { id: 'C0', kind: 'site', u: 60.5, v: 54, r: 0.7, label: 'corn patch' },
  { id: 'C1', kind: 'site', u: 80.5, v: 53, r: 0.7, label: 'corn expansion' },
  { id: 'S0', kind: 'site', u: 79, v: 75, r: 0.7, label: 'sunflower patch' },
  { id: 'S1', kind: 'site', u: 90.5, v: 75, r: 0.7, label: 'sunflower expansion' },
  { id: 'T0', kind: 'site', u: 68.5, v: 87.5, r: 0.8, label: 'raised bed' },
  // the yard-sale table (v0.12), where the market crate stood: beside the path bend, on the way
  // between the crops and the house
  { id: 'table', kind: 'table', u: 47, v: 59, r: 0.5, label: 'yard-sale table', table: 0 },
  // v0.13 (captain: "as your house is growing ... more tables appear"): one more table with each
  // house stage, set up end to end beside hers in one row clear of the path (so the buyers stand
  // behind the row and never between her and the goods), four at most
  { id: 'table2', kind: 'table', u: 53.2, v: 59.3, r: 0.5, label: 'yard-sale table', table: 1 },
  { id: 'table3', kind: 'table', u: 59.4, v: 59.6, r: 0.5, label: 'yard-sale table', table: 2 },
  { id: 'table4', kind: 'table', u: 65.6, v: 59.9, r: 0.5, label: 'yard-sale table', table: 3 },
  // v0.16 (captain: "Remove the extra sellers, just produce an extra table every progression of
  // the house"): the chimney and the home bring a fifth and a sixth table to the row, where the
  // neighbours' stalls used to stand at the big sale
  { id: 'table5', kind: 'table', u: 71.8, v: 60.2, r: 0.5, label: 'yard-sale table', table: 4 },
  { id: 'table6', kind: 'table', u: 78.0, v: 60.5, r: 0.5, label: 'yard-sale table', table: 5 },
];

// walkable region of the composition ground (world-bounds recovery clamps inside it)
export const BOUNDS = { uMin: 1, uMax: 99, vMin: 30, vMax: 99 };
