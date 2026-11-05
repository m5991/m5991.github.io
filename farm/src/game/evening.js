// v0.17c (captain: "let's do all this", after the suggestion of an evening sky with fireflies once
// the farm is finished): on the finished farm the day turns slowly to a golden evening and back,
// on the active-time clock (paused with the world). Pure. -> 0 (day) .. 1 (evening).
export const EVENING = { periodMs: 360000, duskAt: 210000, rampMs: 30000, nightMs: 90000 };

const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export function eveningAt(activeMs, finished, e = EVENING) {
  if (!finished || !Number.isFinite(activeMs)) return 0;
  const t = ((activeMs % e.periodMs) + e.periodMs) % e.periodMs;
  if (t < e.duskAt) return 0;
  if (t < e.duskAt + e.rampMs) return smooth((t - e.duskAt) / e.rampMs);
  if (t < e.duskAt + e.rampMs + e.nightMs) return 1;
  return 1 - smooth((t - e.duskAt - e.rampMs - e.nightMs) / e.rampMs);
}
