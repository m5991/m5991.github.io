// v0.17c (captain: "let's do all this", after the suggestion of an evening sky with fireflies once
// the farm is finished): on the finished farm the day turns slowly to a golden evening and back,
// on the active-time clock (paused with the world). Pure. -> 0 (day) .. 1 (evening).
// v0.20 (audit 2: "the hunt opens at dusk"): the clock starts when the farm is finished
// (`sinceFinishMs`, main.js keeps the finish time in the save), so the egg hunt always opens in
// full daylight: three and a half minutes of day, then the evening. It ran on the farm's whole
// active time, and a route of five and a half minutes ended right in the evening.
export const EVENING = { periodMs: 360000, duskAt: 210000, rampMs: 30000, nightMs: 90000 };
// active time since the farm was finished (`finishedAt`: the active ms when the home was built;
// null for a farm finished before v0.20, whose clock starts when it is next loaded)
export const sinceFinish = (activeMs, finishedAt) => Math.max(0, activeMs - (Number.isFinite(finishedAt) ? finishedAt : activeMs));

const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export function eveningAt(activeMs, finished, e = EVENING) {
  if (!finished || !Number.isFinite(activeMs)) return 0;
  const t = ((activeMs % e.periodMs) + e.periodMs) % e.periodMs;
  if (t < e.duskAt) return 0;
  if (t < e.duskAt + e.rampMs) return smooth((t - e.duskAt) / e.rampMs);
  if (t < e.duskAt + e.rampMs + e.nightMs) return 1;
  return 1 - smooth((t - e.duskAt - e.rampMs - e.nightMs) / e.rampMs);
}
