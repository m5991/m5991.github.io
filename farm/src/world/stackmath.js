// Carried-stack math (pure, no three.js; unit-tested). The captain asked (2026-11-01) for the
// ad's way of showing what she carries: every unit as its own model in one tall stack over and
// behind Vanessa's head. This is a readable port of the pattern of the BASE metastack `Do` and
// its hero stack (app.pretty.js 34054-34183, hero `nl` stacks child): units sit at the summed
// heights of the units below (`getHeight`, a per-type `dy`), a removal closes the gap by easing
// the units above down (`repositionStacks`, lerp 0.2 per update), and a full stack refuses more.
// Here the ledger keeps the counts (12 per resource, A08); the stack only presents them.

export const STACK_ORDER = ['W', 'R', 'C', 'S', 'T']; // bottom to top: materials, then crops
// height each unit adds, metres (the BASE default dy was 0.12 at its own scale)
export const UNIT_DY = { W: 0.09, R: 0.1, C: 0.085, S: 0.06, T: 0.11 };
// The stack sits on the top of her head and rises above it ("over your head", captain), so at
// the follow camera it never covers her face or body, whichever way she runs. carry.js rides
// the head-top bone; these are the standing values (the cap estimate uses the height).
export const STACK_BASE_Y = 1.68; // stack root above her feet when she stands: the top of her head
export const STACK_BACK_Z = -0.06; // a little behind the crown (she faces +Z)
export const MIN_CAP = 4; // a short landscape screen has room for little more above her head
export const MAX_CAP = 40;

// How many units fit on screen: the stack may rise `availableM` metres above its base.
export function stackCap(availableM, avgDy = 0.09) {
  return Math.max(MIN_CAP, Math.min(MAX_CAP, Math.floor(availableM / avgDy)));
}

// carried counts -> { units: resource per slot, bottom to top, hidden: units not drawn }.
// Under the cap every unit shows. Over it each carried resource keeps a share in proportion to
// its count (largest remainder, at least one each), so nothing she carries vanishes from view.
export function stackUnits(carried, cap = MAX_CAP) {
  const present = STACK_ORDER.filter((r) => (carried[r] ?? 0) > 0);
  const total = present.reduce((n, r) => n + carried[r], 0);
  const show = Object.fromEntries(present.map((r) => [r, carried[r]]));
  if (total > cap) {
    const q = Object.fromEntries(present.map((r) => [r, (carried[r] * cap) / total]));
    for (const r of present) show[r] = Math.max(1, Math.floor(q[r]));
    let used = present.reduce((n, r) => n + show[r], 0);
    const frac = (r) => q[r] - Math.floor(q[r]);
    const byRemainder = [...present].sort((a, b) => frac(b) - frac(a) || STACK_ORDER.indexOf(a) - STACK_ORDER.indexOf(b));
    for (let i = 0; used < cap; i++) { // total > cap, so some resource always has room
      const r = byRemainder[i % byRemainder.length];
      if (show[r] < carried[r]) { show[r] += 1; used += 1; }
    }
    while (used > cap) { // the "at least one each" floor overshot: trim the largest share
      const big = present.reduce((a, b) => (show[b] > show[a] ? b : a));
      show[big] -= 1; used -= 1;
    }
  }
  const units = present.flatMap((r) => Array(show[r]).fill(r));
  return { units, hidden: total - units.length };
}

// slot heights above the stack root for a list of unit types (bottom of each unit)
export function slotHeights(units) {
  const out = [];
  let y = 0;
  for (const r of units) { out.push(y); y += UNIT_DY[r]; }
  return out;
}

// One step of a damped spring toward `target` (x and z), semi-implicit Euler. Used for the
// stack's sway: the top lags behind her velocity and wobbles to rest when she stops.
export const SWAY = { k: 55, c: 8.5, lean: 0.055, max: 0.45 };
export function springStep(s, target, dtS, k = SWAY.k, c = SWAY.c) {
  const ax = -k * (s.x - target.x) - c * s.vx;
  const az = -k * (s.z - target.z) - c * s.vz;
  s.vx += ax * dtS; s.vz += az * dtS;
  s.x += s.vx * dtS; s.z += s.vz * dtS;
  const m = Math.hypot(s.x, s.z);
  if (m > SWAY.max) { s.x *= SWAY.max / m; s.z *= SWAY.max / m; }
  return s;
}
// where the sway target sits for a world velocity: the top trails her motion
export function swayTarget(vx, vz, lean = SWAY.lean) {
  return { x: -vx * lean, z: -vz * lean };
}
// share of the top offset at height h: a curved bend, stiff at the base, loose at the top
export function bendAt(h, refH = 1.6) {
  return Math.min(1.6, (h / refH) ** 1.6);
}

// the little spring a unit gives as it lands (scale factor, settles to 1 within ~0.3 s)
export function popScale(tS) {
  if (tS < 0) return 1;
  return 1 + 0.3 * Math.exp(-tS / 0.07) * Math.cos((2 * Math.PI * tS) / 0.17);
}
