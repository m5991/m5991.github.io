// v0.17c (captain: "let's do all this", after the suggestion to let the farm move to the song
// that's playing): a small beat follower. Pure: it gets the loudness of the song's low end each
// frame (0..1, from an AnalyserNode in main.js) and says how much the farm should move (`level`,
// smoothed) and when a beat lands (`beat`: a jump well over the recent average, at most every
// `minGapMs`). With no loudness to read (no audio context, or the browser will not share it) a
// steady pulse at `fallbackBpm` stands in, so the farm still sways.
export const BEAT = { attack: 0.35, release: 0.06, avgMs: 1200, rise: 1.35, floor: 0.08, minGapMs: 280, fallbackBpm: 100 };

export function createBeat(opts = {}) {
  const o = { ...BEAT, ...opts };
  let avg = 0;
  let level = 0;
  let since = Infinity;
  let t = 0;
  return {
    // energy: 0..1, or null when nothing can be read; -> { level, beat }
    update(dtMs, energy) {
      t += dtMs;
      since += dtMs;
      if (energy === null || energy === undefined || !Number.isFinite(energy)) {
        const period = 60000 / o.fallbackBpm;
        const phase = (t % period) / period;
        level = 0.55 + 0.35 * Math.cos(phase * Math.PI * 2);
        const beat = since >= period - dtMs / 2 && phase < 0.5;
        if (beat) since = 0;
        return { level, beat };
      }
      const k = Math.min(1, dtMs / o.avgMs);
      avg += (energy - avg) * k;
      level += (energy - level) * (energy > level ? o.attack : o.release);
      const beat = energy > o.floor && energy > avg * o.rise && since >= o.minGapMs;
      if (beat) since = 0;
      return { level: Math.min(1, level), beat };
    },
    reset() { avg = 0; level = 0; since = Infinity; t = 0; },
  };
}

// the low end's loudness from an analyser's byte spectrum (bins up to ~170 Hz at 44.1 kHz/1024)
export function lowEnergy(bytes, bins = 8) {
  let n = 0;
  for (let i = 1; i <= bins && i < bytes.length; i++) n += bytes[i];
  return n / (bins * 255);
}
