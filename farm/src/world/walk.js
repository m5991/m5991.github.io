// Vanessa's walk to her place in the finale (v0.13): pure ground geometry, no three.js, so it is
// testable (spec v0.13 P29-8). `planWalk` bends the straight line from where she stands to D17
// around the static obstacles (circles: the house, the tree, the bench, the bed), smooths it, and
// times it: her 5.0 m/s run, slowing to a walk over the last metre, all of it before the colour
// beats start at 3.5 s. From more than 13 m away (a replay) she starts 13 m out along her line.
// `walkAt` gives her place, heading and gait along it.
export const WALK = {
  start: 300, // ms into the finale: the play elements are shrinking away
  latest: 3300, // she is at D17 by then (the outlines take their colour from 3.5 s)
  walkSpeed: 1.6, // m/s, the last metre ends at this
  runSpeed: 5.0, // m/s (P24-1)
  slowM: 1, // the last metre is a walk
  maxM: 13, // farther: she starts this far out along her line
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// from, to: { x, z }; obstacles: [{ x, z, r }] -> { pts: [{x, z}], len, ms, gait, rate }
export function planWalk(from0, to, obstacles = [], n = 48) {
  let from = from0;
  const d0 = dist(from0, to);
  if (d0 > WALK.maxM) from = { x: to.x + ((from0.x - to.x) * WALK.maxM) / d0, z: to.z + ((from0.z - to.z) * WALK.maxM) / d0 };
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push({ x: from.x + ((to.x - from.x) * i) / n, z: from.z + ((to.z - from.z) * i) / n });
  // obstacles that hold an end point itself are left out (she starts beside the house)
  const obs = obstacles.filter((o) => dist(o, from) > o.r * 0.9 && dist(o, to) > o.r * 0.9);
  const push = () => {
    for (let i = 1; i < n; i++) {
      const p = pts[i];
      for (const o of obs) {
        const d = dist(p, o);
        if (d >= o.r) continue;
        // out to the circle's edge, on the side the straight line already passes
        let dx = p.x - o.x; let dz = p.z - o.z;
        if (d < 1e-4) { dx = -(to.z - from.z); dz = to.x - from.x; }
        const k = o.r / Math.max(1e-4, Math.hypot(dx, dz));
        p.x = o.x + dx * k; p.z = o.z + dz * k;
      }
    }
  };
  for (let it = 0; it < 12; it++) {
    push();
    for (let i = 1; i < n; i++) { // smooth
      const a = pts[i - 1]; const b = pts[i + 1];
      pts[i] = { x: (a.x + pts[i].x * 2 + b.x) / 4, z: (a.z + pts[i].z * 2 + b.z) / 4 };
    }
  }
  push();
  let len = 0;
  const cum = [0];
  for (let i = 1; i <= n; i++) { len += dist(pts[i], pts[i - 1]); cum.push(len); }
  // the run, then the last metre slowing from the run to a walk (linear speed: its time is the
  // distance over the mean speed), squeezed only if it would not fit before `latest`
  const slow = Math.min(WALK.slowM, len);
  const runM = len - slow;
  let runMs = (runM / WALK.runSpeed) * 1000;
  let slowMs = (slow / ((WALK.runSpeed + WALK.walkSpeed) / 2)) * 1000;
  const room = WALK.latest - WALK.start;
  if (runMs + slowMs > room) { const k = room / (runMs + slowMs); runMs *= k; slowMs *= k; }
  const ms = len < 0.05 ? 0 : runMs + slowMs;
  return { pts, cum, len, ms, runMs, slowMs, runM, gait: runM > 0 ? 'run' : 'walk', rate: 1 };
}

// k 0..1 of the walk's time -> { x, z, yaw, gait, rate }
export function walkAt(w, k) {
  const t = Math.max(0, Math.min(1, k)) * w.ms;
  let s;
  let speed;
  if (t <= w.runMs || w.slowMs <= 0) { s = w.runMs > 0 ? (t / w.runMs) * w.runM : 0; speed = w.runM / Math.max(1e-6, w.runMs / 1000); } else {
    // the last metre: speed falls linearly from the run to the walk
    const u = Math.min(1, (t - w.runMs) / w.slowMs);
    const slow = w.len - w.runM;
    const v0 = (2 * slow) / (w.slowMs / 1000) - WALK.walkSpeed; // so the mean speed covers it
    const v1 = WALK.walkSpeed;
    s = w.runM + ((v0 * u + ((v1 - v0) * u * u) / 2) * (w.slowMs / 1000));
    speed = v0 + (v1 - v0) * u;
  }
  s = Math.max(0, Math.min(w.len, s));
  let i = 1;
  while (i < w.pts.length - 1 && w.cum[i] < s) i++;
  const a = w.pts[i - 1]; const b = w.pts[i];
  const f = Math.max(0, Math.min(1, (s - w.cum[i - 1]) / Math.max(1e-6, w.cum[i] - w.cum[i - 1])));
  const run = speed > 2.6;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  return {
    x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, yaw: Math.atan2(b.x - a.x, b.z - a.z),
    gait: run ? 'run' : 'walk', rate: run ? clamp(speed / 5, 0.7, 1.3) : clamp(speed / 1.57, 0.5, 1.5),
  };
}
