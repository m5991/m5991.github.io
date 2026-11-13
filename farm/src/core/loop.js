// Main loop with the world-pause gate (annex §D.4). Ported from the BASE loop `Ha`
// (app.pretty.js 29451-29500): requestAnimationFrame, delta clamped to 100 ms, fixed 1/60 s
// physics sub-steps. The gate is new: while any pause reason is held, world updates
// (physics, mixers, tweens, the ledger's active-time clock, interaction timers) stop and only
// rendering continues. Menus, cards, the title screen and hidden tabs hold reasons.
//
// v0.26 (the S26 heating audit): the loop has a frame budget.
// - A phone with a 120 Hz screen calls back 120 times a second, and v0.25 drew the farm on every
//   one. Now a callback that comes before the next frame is due is passed over: `fps` is the
//   most frames a second (60), and `idleFps` the budget while `plan()` says 'idle' (nothing but
//   the farm's own small motion: 30). The time handed to the world and the renderer is the real
//   time since the frame before, so every clock runs as it did.
// - While `plan()` says 'hold' (Pause, Extras, a card, a hidden tab: nothing on the canvas can
//   change) one last frame is drawn and the callbacks stop. `request()` (a tap, a key, a resize),
//   `pause()` and `resume()` start them again; a slow timer asks `plan()` again four times a
//   second, so a change nobody announced is still picked up.
// The scheduler's four functions can be handed in (tests run the loop on a made-up clock).
export const FRAME_SLACK_MS = 2; // a callback this close to due is taken (60 Hz timestamps jitter)
export const HOLD_POLL_MS = 250;

export function createLoop({
  world, render, plan = () => 'full', fps = () => 0, idleFps = () => 0,
  raf = (fn) => requestAnimationFrame(fn), caf = (id) => cancelAnimationFrame(id),
  setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id),
  now = () => performance.now(), hidden = () => globalThis.document?.hidden === true,
}) {
  const reasons = new Set();
  let last = 0; // the time of the frame before (0: none, the first frame takes 16.7 ms)
  let rafId = 0;
  let timer = 0;
  let running = false;
  let settled = false; // the held picture has been drawn
  let wanted = false; // a frame was asked for (request)
  let wantedUntil = 0; // full budget until then
  const stats = { frames: 0, since: now(), fps: 0, callbacks: 0, total: 0, mode: 'full' };

  function sleep() {
    caf(rafId); rafId = 0; last = 0;
    if (!hidden()) timer = setTimer(poll, HOLD_POLL_MS);
  }
  function poll() {
    timer = 0;
    if (!running || rafId) return;
    if (wanted || plan(now()) !== 'hold') wake(); else if (!hidden()) timer = setTimer(poll, HOLD_POLL_MS);
  }
  function wake() {
    if (!running || rafId) return;
    if (timer) { clearTimer(timer); timer = 0; }
    rafId = raf(frame);
  }

  function frame(t) {
    rafId = raf(frame);
    stats.callbacks++;
    const mode = wanted || t < wantedUntil ? 'full' : plan(t);
    const settling = mode === 'hold'; // the picture she leaves is drawn once, then it holds
    if (settling && settled) { stats.mode = 'hold'; sleep(); return; }
    const cap = mode === 'idle' ? (idleFps() || fps()) : fps();
    if (cap > 0 && last && t - last < 1000 / cap - FRAME_SLACK_MS && !wanted && !settling) return; // not due yet
    const dtMs = Math.min(100, last ? t - last : 16.7);
    last = t;
    wanted = false;
    settled = settling;
    stats.mode = mode;
    if (reasons.size === 0) world(dtMs);
    render(dtMs);
    stats.frames++; stats.total++;
    if (t - stats.since >= 1000) {
      stats.fps = (stats.frames * 1000) / (t - stats.since);
      stats.frames = 0;
      stats.since = t;
    }
  }

  return {
    start() { running = true; wake(); },
    stop() { running = false; caf(rafId); rafId = 0; if (timer) { clearTimer(timer); timer = 0; } },
    pause(reason) { reasons.add(reason); settled = false; wake(); },
    resume(reason) { reasons.delete(reason); settled = false; wake(); },
    // draw again: at least one frame, and at the full budget for `ms` after it (a tap, a resize,
    // a switch behind a held picture)
    request(ms = 0) { wanted = true; settled = false; if (ms > 0) wantedUntil = Math.max(wantedUntil, now() + ms); wake(); },
    get paused() { return reasons.size > 0; },
    get reasons() { return [...reasons]; },
    get fps() { return stats.fps; },
    // 'full' | 'idle' | 'hold': the budget of the last callback
    get mode() { return stats.mode; },
    get asleep() { return running && !rafId; },
    // callbacks the browser made and frames worked, since the start (checks)
    get counts() { return { callbacks: stats.callbacks, frames: stats.total }; },
  };
}
