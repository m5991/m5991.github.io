// The DIY hint (v0.13, captain's v0.12 playtest: "we need better clues of where to do diy time
// when we have enough material, maybe a timer and if you havent done anything it signals you
// where to go"; answer 4 "After 10 s"). Pure, fed the bottom line (guide.js buildBar) each world
// step with the active time that passed: once she has everything for the next part, the DIY
// button pulses at once; after DIY_HINT_MS of play without building it, an arrow and a sparkle
// point at the part (spec v0.13 P29-6). Both go when she is within reach of the part, when the DIY
// starts, or when the line moves to another part, and the 10 s start again for the next part;
// picking things up on the way changes nothing. Pause and cards stop the clock (the world step
// does not run). Tapping DIY away from the part shows the way at once.
export const DIY_HINT_MS = 10000;

export function createDiyHint(hintMs = DIY_HINT_MS) {
  let stage = null;
  let ms = 0;
  return {
    // bar: buildBar(...) or null (also while she hammers) -> { stage, pulse, point }
    update(dtMs, bar) {
      const ready = bar?.ready ? bar.stage : null;
      if (ready !== stage) { stage = ready; ms = 0; return { stage, pulse: !!stage, point: false }; }
      if (!stage) return { stage, pulse: false, point: false };
      if (bar.here) { ms = 0; return { stage, pulse: true, point: false }; }
      ms += dtMs;
      return { stage, pulse: true, point: ms >= hintMs };
    },
    // DIY pressed away from the part: the arrow and the sparkle show now
    nudge() { if (stage) ms = Math.max(ms, hintMs); },
    reset() { stage = null; ms = 0; },
    get waitedMs() { return ms; },
  };
}
