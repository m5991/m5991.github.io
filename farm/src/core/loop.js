// Main loop with the world-pause gate (annex §D.4). Ported from the BASE loop `Ha`
// (app.pretty.js 29451-29500): requestAnimationFrame, delta clamped to 100 ms, fixed 1/60 s
// physics sub-steps. The gate is new: while any pause reason is held, world updates
// (physics, mixers, tweens, the ledger's active-time clock, interaction timers) stop and only
// rendering continues. Menus, cards, the title screen and hidden tabs hold reasons.
export function createLoop({ world, render }) {
  const reasons = new Set();
  let last = 0;
  let raf = 0;
  const stats = { frames: 0, since: performance.now(), fps: 0 };

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dtMs = Math.min(100, last ? now - last : 16.7);
    last = now;
    if (reasons.size === 0) world(dtMs);
    render(dtMs);
    stats.frames++;
    if (now - stats.since >= 1000) {
      stats.fps = (stats.frames * 1000) / (now - stats.since);
      stats.frames = 0;
      stats.since = now;
    }
  }

  return {
    start() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    pause(reason) { reasons.add(reason); },
    resume(reason) { reasons.delete(reason); },
    get paused() { return reasons.size > 0; },
    get reasons() { return [...reasons]; },
    get fps() { return stats.fps; },
  };
}
