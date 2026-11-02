// Weighted but responsive movement (spec §10.6, P23-6.12). Pure math, no three.js or cannon,
// so the curves are unit-tested in Node. The hero mover keeps a speed and a heading:
// - speed ramps linearly toward the target: 0 -> top speed in ACCEL_S, top speed -> 0 in
//   STOP_S (the same rates apply to partial steps, e.g. a half-deflected stick);
// - the heading of travel and Vanessa's facing both turn toward the input direction with a
//   time constant TURN_TAU_S, so any turn is about 95% done after TURN_S;
// - the stick has an 8% dead zone and its deflection is rescaled from the dead-zone edge, so
//   speed grows smoothly from 0 at the edge to full speed at full deflection. Keyboard input
//   always has magnitude 1 (no analog slowdown) but uses the same easing.
// The 0.25 s stillness rule counts only while speed < 0.05 m/s (STILL_SPEED_MS, interaction.js).
// The top speed is a run (RUN_SPEED below), not P23-2's 2.2 m/s walk: the captain's phone
// test of 2026-11-01 found the walk "super slow" next to the ad hero's run. The easing times
// are unchanged, so the rates in m/s² scale with the top speed.

// m/s. The ad hero's measured run was 4.2-4.5 u/s (slice report, base-shell-experiment.md);
// the captain found 2.2 "super slow" and asked to err on brisk, so a little above the ad: 5.0
// crosses the 8.4 m from the start to the house mat in about 1.7 s instead of 4.4 s.
export const RUN_SPEED = 5.0;
export const AD_RUN_SPEED = 4.2; // the lower end of the ad hero's measured run

export const ACCEL_S = 0.1; // rest to full speed
export const STOP_S = 0.08; // full speed to rest
export const TURN_S = 0.12; // a turn is ~95% complete (three time constants)
export const TURN_TAU_S = TURN_S / 3;
export const STICK_DEAD_ZONE = 0.08; // fraction of the stick radius

// raw stick offset in px -> screen vector (x right, y up), magnitude 0..1 after the dead zone
export function shapeStick(dx, dy, radius, deadZone = STICK_DEAD_ZONE) {
  const len = Math.hypot(dx, dy);
  const frac = Math.min(1, len / radius);
  if (frac <= deadZone) return { x: 0, y: 0 };
  const mag = (frac - deadZone) / (1 - deadZone);
  return { x: (dx / len) * mag, y: (-dy / len) * mag };
}

// shortest signed angle from a to b
export function angleDelta(a, b) {
  const d = b - a;
  return Math.atan2(Math.sin(d), Math.cos(d));
}

// frame-rate independent exponential turn of `yaw` toward `target`
export function turnToward(yaw, target, dtS, tau = TURN_TAU_S) {
  return yaw + angleDelta(yaw, target) * (1 - Math.exp(-dtS / tau));
}

// linear ramp of `speed` toward `target`; rates are derived from the top speed
export function rampSpeed(speed, target, dtS, topSpeed, accelS = ACCEL_S, stopS = STOP_S) {
  if (target > speed) return Math.min(target, speed + (topSpeed / accelS) * dtS);
  return Math.max(target, speed - (topSpeed / stopS) * dtS);
}

// One mover step. state: { speed, heading } (heading = world yaw of travel, atan2(x, z)).
// input: screen vector (x right, y up), magnitude 0..1. Returns the world velocity.
// Camera looks toward -Z with no yaw: screen up = world -Z, screen right = +X.
export function stepMover(state, input, dtS, topSpeed) {
  const mag = Math.min(1, Math.hypot(input.x, input.y));
  let target = 0;
  if (mag > 0) {
    target = topSpeed * mag;
    const want = Math.atan2(input.x, -input.y);
    // from rest she sets off straight along the input; while moving the path bends smoothly
    state.heading = state.speed <= 0 ? want : turnToward(state.heading, want, dtS);
  }
  state.speed = rampSpeed(state.speed, target, dtS, topSpeed);
  return { x: Math.sin(state.heading) * state.speed, z: Math.cos(state.heading) * state.speed };
}

// ---------- gait: which locomotion clip plays, and how fast ----------
// V_Walk plants its feet at WALK_CLIP_SPEED with its 0.82 s cycle, V_Run at RUN_CLIP_SPEED with
// its 0.66 s cycle: the stance speeds the retarget locks the feet to (tools/make-vanessa.mjs,
// .tmp/vanessa-report.json `groundSpeed`), so the feet do not slide at these rates. The clip rate follows the eased speed so the
// feet keep pace; the walk/run choice has hysteresis so a stick held near the threshold does
// not flicker between clips. While input is held the choice uses the target speed (stick
// deflection x top speed), so a full push goes straight into the run instead of passing
// through a few frames of walk during the 0.1 s ramp; the stop glide keeps the current cycle.
export const WALK_CLIP_SPEED = 1.57; // m/s
export const RUN_CLIP_SPEED = 5.0; // m/s
// cycle lengths and where in each cycle a foot first touches down (the other foot half a cycle
// later), from the same report (`touchdownPhase`); footsteps sound there
export const WALK_CYCLE_S = 0.821;
export const RUN_CYCLE_S = 0.66;
export const STEP_PHASE = { walk: 0.97, run: 0.146 };
export const RUN_ENTER = 2.6; // m/s: walk -> run at or above this
export const RUN_EXIT = 2.2; // m/s: run -> walk below this
export const GAIT_STILL = 0.3; // m/s: below this, with no input, she stands
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// prev: 'still' | 'walk' | 'run'; { speed, target, moving } -> { kind, rate }
export function gait(prev, { speed, target = speed, moving }) {
  if (!moving && speed <= GAIT_STILL) return { kind: 'still', rate: 1 };
  let kind;
  if (!moving) kind = prev === 'run' ? 'run' : 'walk';
  else if (prev === 'run') kind = target >= RUN_EXIT ? 'run' : 'walk';
  else kind = target >= RUN_ENTER ? 'run' : 'walk';
  const rate = kind === 'run' ? clamp(speed / RUN_CLIP_SPEED, 0.7, 1.3) : clamp(speed / WALK_CLIP_SPEED, 0.5, 1.5);
  return { kind, rate };
}

// Footfalls: a clip plants a foot at phase `offset` and `offset` + 0.5 of its cycle (STEP_PHASE,
// measured by the retarget, tools/make-vanessa.mjs). -> how many plants the cycle crossed going
// from phase `prev` to `next` (0..1, wrapping); 0 when there is no previous phase. Footstep sounds follow
// the animation, so they keep pace with the run and the walk at every clip rate.
export function footfalls(prev, next, offset = 0) {
  if (prev === null || prev === undefined) return 0;
  const shift = (x) => (((x - offset) % 1) + 1) % 1; // phase measured from the first plant
  const p0 = shift(prev); const p1 = shift(next);
  const b = p1 < p0 ? p1 + 1 : p1; // wrapped
  let n = 0;
  for (const p of [0.5, 1, 1.5]) if (p0 < p && b >= p) n++;
  return n;
}
