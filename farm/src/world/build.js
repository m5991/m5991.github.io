// v0.11 (spec v0.11 §10.10, P27-3; captain 2026-11-02: "Vanessa builds the stuff herself" and
// "There's a an animation when she builds house or other things, like she hammering, and a comic
// style onomatopeya "DIY time!""). When a house stage or a property build commits (it is saved
// first), Vanessa takes a small claw hammer from her bib pocket into her right hand, faces the
// part and strikes it three or four times while it goes together in ink, then puts the hammer
// away. Presentation only: the stage is already committed, so moving away just stops her.
// `hammerPlan` and `swingAngle` are pure and unit-tested; `Hammering` drives the model.
// v0.12 (captain's v0.11 playtest: "diy time animation includes jumping towards the house or
// subject of construction, dust clouds appear, hammering on over the top way"): on DIY she first
// jumps toward the part (a 0.45 s hop that lands in a squash, dust at her feet), then hammers it
// in a big comic way: the hammer wound far back over her shoulder, a whipping strike, her whole
// body bobbing into each blow with a squash and stretch, dust and motion lines at every contact
// and the part jolting. Reduced motion: no jump, no swing, no squash: the part simply fades in.
import * as THREE from 'three';

export const HAMMER_IN_MS = 200; // from the pocket into her hand
export const HAMMER_OUT_MS = 200; // back into the pocket
export const STRIKE_MS = 500; // about 0.5 s a strike
export const CONTACT = 0.72; // share of a strike at which the head meets the part
// drawn a little larger than life so it reads on a phone, like the carried units (V1)
export const HAMMER_SCALE = 1.8;
export const JUMP_MS = 450; // v0.12: the hop toward the part before the first strike
export const JUMP = { height: 0.45, reach: 0.7, keep: 0.55 }; // metres up; at most this far; stop this short of the part
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
export const SWING = { hold: 0.55, back: -1.7, hit: 1.45 };
export function swingAngle(p) {
  const { hold, back, hit } = SWING;
  if (p <= 0) return hold;
  if (p < 0.5) return hold + (back - hold) * easeOut(p / 0.5); // anticipation
  if (p < CONTACT) return back + (hit - back) * easeIn((p - 0.5) / (CONTACT - 0.5)); // the strike
  if (p < 1) { const t = (p - CONTACT) / (1 - CONTACT); return hit + (hold - hit) * easeOut(t); } // settle
  return hold;
}

// v0.12: the hop at share u (0..1) of JUMP_MS: how far along the way she is, how high, and the
// squash and stretch of her body (1 = none): stretched up on take-off, squashed on landing
export function jumpState(u) {
  if (u <= 0) return { along: 0, up: 0, squash: 1 };
  if (u >= 1) return { along: 1, up: 0, squash: 1 };
  const along = easeOut(Math.min(1, u / 0.85));
  const air = Math.min(1, u / 0.82);
  const up = JUMP.height * 4 * air * (1 - air);
  let squash = 1;
  if (u < 0.15) squash = 1 + 0.12 * Math.sin((u / 0.15) * Math.PI); // the spring off the ground
  else if (u > 0.82) squash = 1 - 0.16 * Math.sin(((u - 0.82) / 0.18) * Math.PI); // the landing
  return { along, up, squash };
}
// where the hop lands: toward the part, at most JUMP.reach, never closer than JUMP.keep
export function jumpTarget(from, part) {
  const dx = part.x - from.x; const dz = part.z - from.z;
  const d = Math.hypot(dx, dz);
  const go = Math.max(0, Math.min(JUMP.reach, d - JUMP.keep));
  return d > 1e-6 ? { x: from.x + (dx / d) * go, z: from.z + (dz / d) * go } : { x: from.x, z: from.z };
}
// her body's squash (y scale) at phase p of a strike: she rises into the wind-up and drops into
// the blow
export function strikeSquash(p) {
  if (p < 0.5) return 1 + 0.06 * easeOut(p / 0.5);
  if (p < CONTACT) return 1.06 - 0.16 * easeIn((p - 0.5) / (CONTACT - 0.5));
  return 0.9 + 0.1 * easeOut((p - CONTACT) / (1 - CONTACT));
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
  // hammer: the model (greybox hammer()); hand: her Hand_R_Tool socket; body: her view root;
  // physics: her physics body (the hop moves it)
  constructor({ hammer, hand, body, root, physics = null, reducedMotion = () => false }) {
    this.hammer = hammer;
    this.hand = hand;
    this.body = body;
    this.physics = physics;
    this.reducedMotion = reducedMotion;
    hammer.visible = false;
    root.add(hammer);
    this.state = null; // { stage, t, plan, struck, hop }
    this.onStrike = null; // (i, n) -> void: a strike meets the part (the tock, the ink ticks, dust)
    this.onLand = null; // (pos) -> void: she lands from the hop (dust at her feet)
    this.onEnd = null; // (stage) -> void
  }

  get active() { return !!this.state; }
  get stage() { return this.state?.stage ?? null; }
  // the hop plus the hammering, ms (the part's reveal waits for the hop)
  static leadMs(reduced) { return reduced ? 0 : JUMP_MS; }

  // `part`: where the part is ({x, z}); with it (and not reduced motion) she hops toward it first
  start(stage, workMs, part = null) {
    const reduced = this.reducedMotion();
    let hop = null;
    if (part && !reduced && this.physics) {
      const from = { x: this.physics.position.x, z: this.physics.position.z };
      hop = { from, to: jumpTarget(from, part), landed: false };
    }
    this.state = { stage, t: hop ? -JUMP_MS : 0, plan: hammerPlan(workMs), struck: 0, hop };
    this.hammer.visible = !hop;
    this.hammer.scale.setScalar(0.01);
  }

  // moving away (or the finale): she stops; the part finishes on its own
  stop() {
    if (!this.state) return;
    const { stage } = this.state;
    this.state = null;
    this.hammer.visible = false;
    this.body.scale.set(1, 1, 1);
    this.body.position.y = 0;
    this.onEnd?.(stage);
  }

  update(dtMs) {
    const s = this.state;
    if (!s) return;
    s.t += dtMs;
    const reduced = this.reducedMotion();
    // the hop: her physics body glides toward the part while her view arcs up and lands squashed
    if (s.t < 0 && s.hop) {
      const j = jumpState(1 + s.t / JUMP_MS);
      this.physics.position.x = s.hop.from.x + (s.hop.to.x - s.hop.from.x) * j.along;
      this.physics.position.z = s.hop.from.z + (s.hop.to.z - s.hop.from.z) * j.along;
      this.physics.velocity.set(0, 0, 0);
      this.body.position.y = j.up;
      this.body.scale.set(1 / Math.sqrt(j.squash), j.squash, 1 / Math.sqrt(j.squash));
      return;
    }
    if (s.hop && !s.hop.landed) {
      s.hop.landed = true;
      this.body.position.y = 0;
      this.body.scale.set(1, 1, 1);
      this.hammer.visible = true;
      this.onLand?.(s.hop.to);
    }
    const { strikes, strikeMs, totalMs } = s.plan;
    // the strikes: each meets the part at CONTACT of its own time
    const into = s.t - HAMMER_IN_MS;
    while (s.struck < strikes && into >= (s.struck + CONTACT) * strikeMs) {
      this.onStrike?.(s.struck, strikes);
      s.struck += 1;
    }
    let angle = SWING.hold;
    let squash = 1;
    if (!reduced && into > 0 && into < strikes * strikeMs) {
      const p = (into % strikeMs) / strikeMs;
      angle = swingAngle(p);
      squash = strikeSquash(p);
    }
    this.body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    // the hammer comes out of the pocket and goes back (a quick scale, none with reduced motion)
    let k = 1;
    if (!reduced) {
      if (s.t < HAMMER_IN_MS) k = easeOut(Math.max(0, s.t) / HAMMER_IN_MS);
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
