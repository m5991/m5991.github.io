// Race mode (v0.23, design audit 14: "New farm offers Race. A clock shows during the main route,
// the best time is kept on the device, and the finish card shows it. Off unless chosen."). Pure but
// for the storage it is handed. A race is a new farm started with the Race choice: the save's
// `session.race` is true, the clock is the ledger's own active time (so Pause, cards and a hidden
// tab add nothing, exactly as for the farm), and it stops when the last build is made
// (`session.finishedAt`). The best time lives on the device, apart from the farm save, so a new
// farm keeps it.
export const RACE_KEY = 'vanessas-farm/race';

// m:ss (h:mm:ss past an hour)
export function fmtRace(ms) {
  const s = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

// the race clock of a farm now, in ms, or null when it is not a race: the active time, held at the
// finish once the farm is built
export function raceClock(ledger, session) {
  if (!session?.race) return null;
  return Number.isFinite(session.finishedAt) ? session.finishedAt : ledger.activeMs;
}

export function createRace(storage) {
  const read = () => {
    try {
      const d = JSON.parse(storage?.getItem(RACE_KEY) ?? 'null');
      return Number.isFinite(d?.bestMs) && d.bestMs > 0 ? d.bestMs : null;
    } catch { return null; }
  };
  let best = read();
  return {
    get best() { return best; },
    // a race is finished in `ms`: -> { ms, best (the best time now), isBest (this run set it), previous }
    finish(ms) {
      const previous = best;
      const isBest = Number.isFinite(ms) && ms > 0 && (best === null || ms < best);
      if (isBest) {
        best = ms;
        try { storage?.setItem(RACE_KEY, JSON.stringify({ bestMs: ms })); } catch { /* kept for this session only */ }
      }
      return { ms, best, isBest, previous };
    },
    clear() { best = null; try { storage?.removeItem(RACE_KEY); } catch { /* nothing kept */ } },
  };
}
