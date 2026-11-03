// v0.11 (spec v0.11 §10.10, P27-3; captain 2026-11-02: "Vanessa builds the stuff herself" and
// "There's a an animation when she builds house or other things, like she hammering, and a comic
// style onomatopeya "DIY time!""). When a house stage or a property build commits (it is saved
// first), Vanessa takes a small claw hammer from her bib pocket into her right hand, faces the
// part and strikes it three or four times while it goes together in ink, then puts the hammer
// away. Presentation only: the stage is already committed, so moving away just stops her.
// `hammerPlan` and `swingAngle` are pure and unit-tested; `Hammering` drives the model.
import * as THREE from 'three';

export const HAMMER_IN_MS = 200; // from the pocket into her hand
export const HAMMER_OUT_MS = 200; // back into the pocket
export const STRIKE_MS = 500; // about 0.5 s a strike
export const CONTACT = 0.72; // share of a strike at which the head meets the part
// drawn a little larger than life so it reads on a phone, like the carried units (V1)
export const HAMMER_SCALE = 1.5;
export const BURST_MS = { pop: 200, hold: 1000, fade: 200 }; // "DIY time!": about 1.4 s in all

// how she hammers a stage with `workMs` of work: four strikes for a house stage (3-4 s), three
// for a property build (2 s), about 0.5 s each, all inside the work seconds before the wash
export function hammerPlan(workMs) {
  const strikes = workMs >= 3000 ? 4 : 3;
  const room = Math.max(0, workMs - 500 - HAMMER_IN_MS - HAMMER_OUT_MS); // the 0.5 s wash ends it
  const strikeMs = Math.max(380, Math.min(620, room / strikes));
  return { strikes, strikeMs, totalMs: HAMMER_IN_MS + strikes * strikeMs + HAMMER_OUT_MS };
}

const easeOut = (t) => 1 - (1 - t) ** 2;
const easeIn = (t) => t * t;
// The hammer's swing about her shoulder line at phase p (0..1) of one strike, radians: + tips
// the head forward and down. A short anticipation back over the shoulder, a quick firm strike
// to the contact, then a small settle up off the part (P23-6.12 easing, no snapping).
export const SWING = { hold: 0.55, back: -0.85, hit: 1.3 };
export function swingAngle(p) {
  const { hold, back, hit } = SWING;
  if (p <= 0) return hold;
  if (p < 0.5) return hold + (back - hold) * easeOut(p / 0.5); // anticipation
  if (p < CONTACT) return back + (hit - back) * easeIn((p - 0.5) / (CONTACT - 0.5)); // the strike
  if (p < 1) { const t = (p - CONTACT) / (1 - CONTACT); return hit + (hold - hit) * easeOut(t); } // settle
  return hold;
}

// The burst's scale and opacity t ms after it appears: 0.6 -> 1.05 -> 1.0 over 200 ms, a hold of
// about 1 s, a 200 ms fade. Reduced motion: no scale, a 150 ms fade in and out.
export function burstState(t, reduced = false) {
  const { pop, hold, fade } = BURST_MS;
  const total = pop + hold + fade;
  if (t < 0 || t >= total) return { scale: 1, opacity: 0, done: t >= total };
  if (reduced) {
    const o = t < 150 ? t / 150 : t > total - 150 ? (total - t) / 150 : 1;
    return { scale: 1, opacity: Math.max(0, Math.min(1, o)), done: false };
  }
  let scale = 1;
  if (t < pop) { const u = t / pop; scale = u < 0.7 ? 0.6 + (1.05 - 0.6) * easeOut(u / 0.7) : 1.05 - 0.05 * ((u - 0.7) / 0.3); }
  const opacity = t < pop * 0.5 ? t / (pop * 0.5) : t > pop + hold ? 1 - (t - pop - hold) / fade : 1;
  return { scale, opacity: Math.max(0, Math.min(1, opacity)), done: false };
}

const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

export class Hammering {
  // hammer: the model (greybox hammer()); hand: her Hand_R_Tool socket; body: her view root
  constructor({ hammer, hand, body, root, reducedMotion = () => false }) {
    this.hammer = hammer;
    this.hand = hand;
    this.body = body;
    this.reducedMotion = reducedMotion;
    hammer.visible = false;
    root.add(hammer);
    this.state = null; // { stage, t, plan, struck }
    this.onStrike = null; // (i) -> void: a strike meets the part (the tock, the ink ticks, units fly in)
    this.onEnd = null; // (stage) -> void
  }

  get active() { return !!this.state; }
  get stage() { return this.state?.stage ?? null; }

  start(stage, workMs) {
    this.state = { stage, t: 0, plan: hammerPlan(workMs), struck: 0 };
    this.hammer.visible = true;
    this.hammer.scale.setScalar(0.01);
  }

  // moving away (or the finale): she stops; the part finishes on its own
  stop() {
    if (!this.state) return;
    const { stage } = this.state;
    this.state = null;
    this.hammer.visible = false;
    this.onEnd?.(stage);
  }

  update(dtMs) {
    const s = this.state;
    if (!s) return;
    s.t += dtMs;
    const { strikes, strikeMs, totalMs } = s.plan;
    const reduced = this.reducedMotion();
    // the strikes: each meets the part at CONTACT of its own time
    const into = s.t - HAMMER_IN_MS;
    while (s.struck < strikes && into >= (s.struck + CONTACT) * strikeMs) {
      this.onStrike?.(s.struck, strikes);
      s.struck += 1;
    }
    let angle = SWING.hold;
    if (!reduced && into > 0 && into < strikes * strikeMs) angle = swingAngle((into % strikeMs) / strikeMs);
    // the hammer comes out of the pocket and goes back (a quick scale, none with reduced motion)
    let k = 1;
    if (!reduced) {
      if (s.t < HAMMER_IN_MS) k = easeOut(s.t / HAMMER_IN_MS);
      else if (s.t > totalMs - HAMMER_OUT_MS) k = Math.max(0, (totalMs - s.t) / HAMMER_OUT_MS);
    }
    this.place(angle, Math.max(0.01, k));
    if (s.t >= totalMs) this.stop();
  }

  // the hammer in her right fist, swung about her shoulder line, turning with her
  place(angle, scale) {
    this.hand.updateWorldMatrix(true, false);
    this.hammer.position.copy(this.hand.getWorldPosition(tmpV));
    this.hammer.quaternion.copy(this.body.quaternion).multiply(tmpQ.setFromEuler(tmpE.set(angle, 0, -0.1)));
    this.hammer.scale.setScalar(scale * HAMMER_SCALE);
  }
}
