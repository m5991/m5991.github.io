// Projection and object registry (annex §D.5): drawing anchors from spec v0.6 §3, drawn
// extents read off the original drawing (1280 x 1064 photo; v = % of height, u = % of width),
// and the P placements of the slice stations. Ground positions are inverse-projected through
// the finale camera at load; per-object scale is solved from the drawn extent (`fit`).

// Drawn extents used for the per-object scale overrides (u = base centre; v from top to base).
export const FITS = {
  D01: { u: 34.5, vTop: 22, vBottom: 46.5, yaw: -0.42 }, // house incl. roof and chimney, two-wall view
  D09: { u: 10, vTop: 40, vBottom: 77.5, yaw: 0 }, // tree, trunk base (9,77)
  D10: { u: 16, vTop: 68.5, vBottom: 78.5, yaw: 0.65 }, // bench, diagonal to the viewer
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
export const STEPPING = [[48.5, 39.5], [47.5, 42], [47.5, 44.7], [48, 47.2], [47.6, 49.5]];
export const PATH = [[36, 47], [38, 52], [40, 57.5], [39.5, 62], [36.5, 68], [31, 74], [25.5, 78], [20, 81]];

// Sky layers (camera-facing): centre and drawn radius / width in drawing units
export const SKY = {
  D22: { u: 88.7, v: 18.3, rv: 6.2 },
  D21: { u: 9, v: 19.5, wu: 9 },
};

// Slice stations (P placements, spec §3/§6.1): weeds, starter piles, the wood spot, rocks, the
// tools, mats and the crate. Wood sits right of the tree's canopy (playtest fix, captain phone
// test 2026-11-01): at the gameplay camera the old spots (u 23-28.5) lay behind the canopy,
// hiding the piles and Vanessa while she gathered; the tree still fades when it hides her or a
// target (world.js).
// v0.9 (P25-6): stone comes only from eight finite loose rocks around the map. R1 and R2 are the
// former rubble piles by the house approach; the rubble spot is gone. RX, the recovery rock, sits
// beside R1 and shows only when a save needed it (§6.6). (P25-4): `tools` is where the blue rake
// D14 and shovel D13 lean against the house's side wall; standing there takes one. C0 has no mat.
export const ROCK_PLACES = {
  R1: { u: 33, v: 52.5 }, R2: { u: 36.5, v: 55 }, R3: { u: 22, v: 90 }, R4: { u: 45, v: 70 },
  R5: { u: 62, v: 62 }, R6: { u: 74, v: 56 }, R7: { u: 94, v: 84 }, R8: { u: 50, v: 93 },
  RX: { u: 30.5, v: 51.5 },
};
export const STATIONS = [
  { id: 'wC1', kind: 'weed', u: 56, v: 56.5, r: 0.3, label: 'weeds' },
  { id: 'wC2', kind: 'weed', u: 63.5, v: 56.5, r: 0.3, label: 'weeds' },
  { id: 'wH', kind: 'weed', u: 44, v: 55, r: 0.3, label: 'weeds' },
  { id: 'pW1', kind: 'pile', u: 32, v: 59, r: 0.35, label: 'fallen branch' },
  { id: 'pW2', kind: 'pile', u: 35, v: 62.5, r: 0.35, label: 'fallen branch' },
  { id: 'sW', kind: 'spot', u: 29, v: 61.5, r: 0.35, label: 'fallen branch' },
  ...Object.entries(ROCK_PLACES).map(([id, p]) => ({ id, kind: 'rock', ...p, r: 0.35, label: 'loose rocks' })),
  { id: 'tools', kind: 'tools', u: 43, v: 47.4, r: 0.3, label: 'tools' },
  { id: 'H1', kind: 'mat', u: 41, v: 52, r: 0.62, label: 'house foundation' },
  { id: 'crate', kind: 'crate', u: 47, v: 59, r: 0.5, label: 'market crate' },
];

// walkable region of the composition ground (world-bounds recovery clamps inside it)
export const BOUNDS = { uMin: 1, uMax: 99, vMin: 40, vMax: 99 };
