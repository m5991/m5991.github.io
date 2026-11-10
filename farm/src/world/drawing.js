// The drawing's own numbers, with no three.js behind them, so the pure modules can read them
// (world/projection.js re-exports them).
export const DRAWING_ASPECT = 1280 / 1064; // the photographed drawing, about 1.20:1
export const MARGIN = 0.04; // 4% safety margin around the fitted composition (spec §3)
