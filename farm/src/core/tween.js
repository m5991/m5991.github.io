// Tiny tween manager advanced by world time only (the BASE advanced @tweenjs/tween.js from the
// same loop; here it sits behind the world-pause gate). Tweens are presentation: they never
// change ledger state, they only show changes the ledger already committed and saved.
export class Tweens {
  constructor() { this.list = []; }

  // run(fn(t in 0..1), ms) -> Promise resolved at the end (or immediately when ms <= 0)
  run(ms, fn, ease = (t) => t) {
    if (ms <= 0) { fn(1); return Promise.resolve(); }
    return new Promise((done) => this.list.push({ t: 0, ms, fn, ease, done }));
  }

  wait(ms) { return this.run(ms, () => {}); }

  update(dtMs) {
    if (!this.list.length) return;
    const keep = [];
    for (const tw of this.list) {
      tw.t += dtMs;
      const k = Math.min(1, tw.t / tw.ms);
      tw.fn(tw.ease(k));
      if (k < 1) keep.push(tw); else tw.done();
    }
    this.list = keep;
  }
}

export const ease = {
  outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  out: (t) => 1 - (1 - t) ** 2,
};
