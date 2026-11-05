// Vanessa's walk to her place in the finale (v0.13): pure ground geometry, no three.js, so it is
// testable (spec v0.13 P29-8). `planWalk` bends the straight line from where she stands to D17
// around the static obstacles (circles: the house, the tree, the bench, the bed), smooths it, and
// times it: from standing (v0.14: from the finale's first frame), her 5.0 m/s run, slowing to a
// walk over the last metre, all of it before the colour beats start at 3.5 s. From more than 13 m away (a replay) she starts 13 m out along her line.
// `walkAt` gives her place, heading and gait along it.
export const WALK = {
  start: 0, // ms into the finale: she sets off at once, while the play elements shrink away (v0.14)
  accelMs: 250, // from standing to the full run
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
  return { pts, cum, len, ...timing(len) };
}

// v0.14 (captain: "vanessa running to her position hangs a bit, like she freezes for a second
// while the camera moves"): she sets off on the finale's first frame, picking up speed over
// WALK.accelMs, instead of standing still for its first 300 ms and then jumping to the run.
// The way is timed as three pieces of linearly changing speed: the start (0 to the peak), the run
// (at the peak) and the last metre (the peak down to a walk); squeezed only if it would not fit
// before `latest`. Under a metre she only walks.
function timing(len) {
  if (len < 0.05) return { ms: 0, segs: [], runMs: 0, runM: 0, slowMs: 0, gait: 'walk', rate: 1 };
  const { runSpeed: vr, walkSpeed: vw, slowM, accelMs } = WALK;
  const acc = vr / (accelMs / 1000); // m/s², the same pick-up for every way
  const accelFull = (vr * vr) / (2 * acc);
  let peak; let dA; let dB; let dC; let vEnd;
  if (len <= slowM) { // a walk: up to walking speed, then on at it
    peak = vw; vEnd = vw; dA = Math.min(len, (vw * vw) / (2 * acc)); dB = len - dA; dC = 0;
  } else if (len < accelFull + slowM) { // too short to reach the full run: a lower peak
    dC = (len * slowM) / (accelFull + slowM); dA = len - dC; dB = 0;
    peak = Math.max(vw, Math.sqrt(2 * acc * dA)); vEnd = vw;
  } else { peak = vr; vEnd = vw; dA = accelFull; dC = slowM; dB = len - dA - dC; }
  // a piece: { d: metres, ms, v0, v1 } with the speed changing linearly in time
  const piece = (d, v0, v1) => ({ d, v0, v1, ms: d > 0 ? (d / ((v0 + v1) / 2)) * 1000 : 0 });
  const segs = [piece(dA, 0, peak), piece(dB, peak, peak), piece(dC, peak, vEnd)].filter((g) => g.d > 0);
  let ms = segs.reduce((t, g) => t + g.ms, 0);
  const room = WALK.latest - WALK.start;
  if (ms > room) { const k = room / ms; for (const g of segs) { g.ms *= k; g.v0 /= k; g.v1 /= k; } ms = room; }
  const run = segs.find((g) => g.v0 === g.v1 && g.d === dB);
  return { ms, segs, runMs: run?.ms ?? 0, runM: run?.d ?? 0, slowMs: dC > 0 ? segs.at(-1).ms : 0, gait: peak > 2.6 ? 'run' : 'walk', rate: 1 };
}

// k 0..1 of the walk's time -> { x, z, yaw, gait, rate, speed }
export function walkAt(w, k) {
  let t = Math.max(0, Math.min(1, k)) * w.ms;
  let s = 0;
  let speed = 0;
  for (const g of w.segs) {
    if (t <= g.ms || g === w.segs.at(-1)) {
      const u = Math.max(0, Math.min(g.ms, t)) / 1000;
      const T = g.ms / 1000;
      const a = T > 0 ? (g.v1 - g.v0) / T : 0;
      s += g.v0 * u + (a * u * u) / 2;
      speed = g.v0 + a * u;
      break;
    }
    s += g.d; t -= g.ms;
  }
  s = Math.max(0, Math.min(w.len, s));
  let i = 1;
  while (i < w.pts.length - 1 && w.cum[i] < s) i++;
  const a = w.pts[i - 1]; const b = w.pts[i];
  const f = Math.max(0, Math.min(1, (s - w.cum[i - 1]) / Math.max(1e-6, w.cum[i] - w.cum[i - 1])));
  const run = speed > 2.6;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  return {
    x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, yaw: Math.atan2(b.x - a.x, b.z - a.z), speed,
    gait: run ? 'run' : 'walk', rate: run ? clamp(speed / 5, 0.7, 1.3) : clamp(speed / 1.57, 0.5, 1.5),
  };
}

// v0.14 (captain: "the customers right now can go through the tables"): the buyers' way to and
// from their place behind a table, around her tables (v0.16: and the farm's fixed footprints).
// `boxes` are footprints on the ground, { lo: [x, z], hi: [x, z] }, already grown by the room a
// buyer needs; boxes that touch (her tables stand almost edge to edge) make one wall. The way is
// the shortest one through the boxes' corners that never enters a box (a visibility graph);
// a straight line when nothing is in the way. -> [{ x, z }, ...] from `from` to `to`
const EPS = 1e-6;
const inBox = (p, b) => p.x > b.lo[0] + EPS && p.x < b.hi[0] - EPS && p.z > b.lo[1] + EPS && p.z < b.hi[1] - EPS;
// does the segment a-b pass through the inside of box b (slab test; touching an edge is fine)
export function crossesBox(a, c, b) {
  let t0 = 0; let t1 = 1;
  const d = [c.x - a.x, c.z - a.z]; const o = [a.x, a.z];
  for (let k = 0; k < 2; k++) {
    const lo = b.lo[k] + EPS; const hi = b.hi[k] - EPS;
    if (Math.abs(d[k]) < 1e-12) { if (o[k] <= lo || o[k] >= hi) return false; continue; }
    let u0 = (lo - o[k]) / d[k]; let u1 = (hi - o[k]) / d[k];
    if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
    if (t0 >= t1) return false;
  }
  return t1 - t0 > EPS;
}
export function routeAround(from, to, boxes = []) {
  const clear = (a, c) => boxes.every((b) => !crossesBox(a, c, b));
  if (clear(from, to)) return [{ ...from }, { ...to }];
  const m = 0.02; // corners just outside their box
  const nodes = [from, to];
  for (const b of boxes) {
    for (const x of [b.lo[0] - m, b.hi[0] + m]) for (const z of [b.lo[1] - m, b.hi[1] + m]) {
      const p = { x, z };
      if (!boxes.some((q) => inBox(p, q))) nodes.push(p);
    }
  }
  // Dijkstra over the corners that see each other
  const n = nodes.length;
  const best = new Array(n).fill(Infinity); const prev = new Array(n).fill(-1); const done = new Array(n).fill(false);
  best[0] = 0;
  for (;;) {
    let i = -1;
    for (let k = 0; k < n; k++) if (!done[k] && best[k] < Infinity && (i < 0 || best[k] < best[i])) i = k;
    if (i < 0 || i === 1) break;
    done[i] = true;
    for (let k = 0; k < n; k++) {
      if (done[k] || k === i) continue;
      const d = best[i] + dist(nodes[i], nodes[k]);
      if (d < best[k] && clear(nodes[i], nodes[k])) { best[k] = d; prev[k] = i; }
    }
  }
  if (prev[1] < 0) return [{ ...from }, { ...to }]; // boxed in: the old straight line
  const out = [];
  for (let k = 1; k >= 0; k = prev[k]) out.unshift({ x: nodes[k].x, z: nodes[k].z });
  return out;
}
// the length of a way, and the point and heading at distance s along it
export const routeLength = (pts) => pts.slice(1).reduce((n, p, i) => n + dist(p, pts[i]), 0);
export function routeAt(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]; const b = pts[i]; const d = dist(a, b);
    if (s <= d || i === pts.length - 1) {
      const f = d > 0 ? Math.max(0, Math.min(1, s / d)) : 1;
      return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    s -= d;
  }
  return { ...pts[0], yaw: 0 };
}
