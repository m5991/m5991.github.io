// The colour finale (spec v0.9 §5 and §10.9, P25-2): after H4 is saved, the play elements
// hide (V9), the camera eases to the drawing, Vanessa settles at D17 with her hands on her hips,
// anything still in outline takes its colour, the ground animates into grass from her feet, the
// sky turns blue from the horizon and, last, the sun turns yellow; then a hold, inside the
// approved 15 s. Skip lands on the coloured end state, and the world stays coloured afterwards
// (it derives from mainComplete, no save field). Presentation only: the ledger is untouched and
// the world loop is paused while it plays, so it is driven here by real frame time.
// v0.13 (captain's v0.12 playtest: "Vanessa teleport to the position she should be, maybe we can
// make her walk/run?"): she walks, or runs when it is far, from where she built the home to D17,
// around the house, the tree, the bench, the bed and the tables, while the camera eases out; then
// she turns to the viewer and puts her hands on her hips. Reduced motion and Skip still place her.
import { FINALE, FINALE_END, finaleState } from '../game/reveal.js';
import { planWalk, walkAt, WALK } from './walk.js';

// A29-10 (the captain at v0.13's approval: "even Vanessa position should change a bit to show her
// ponytail sideways"): her final pose at D17 turns this far (radians) toward the screen's right,
// so the ponytail falls to the left of her head as in the drawing; anchor and pose unchanged
export const FINALE_YAW = 0.8;

export class Finale {
  // world: World; hero: Hero; rig: CameraRig; at: () => Vector3, D17 on the ground;
  // reducedMotion: () => boolean; onStart / onEnd: the UI around it (main.js)
  constructor({ world, hero, rig, at, reducedMotion = () => false, onStart = () => {}, onEnd = () => {} }) {
    Object.assign(this, { world, hero, rig, at, reducedMotion, onStart, onEnd });
    this.active = false;
    this.t = 0;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.t = 0;
    this.settled = false;
    this.reduced = this.reducedMotion();
    this.centre = this.at();
    const w = this.world;
    // her walk to D17 (presentation only; the world loop is paused)
    const from = this.hero.position.clone();
    this.walk = this.reduced ? null : planWalk(from, this.centre, obstaclesOf(w, this.hero));
    this.walkPhase = 0;
    w.finaleActive = true; // the blueprint is always hidden in the finale
    w.setBlueprint(w.blueprint);
    w.setFinished(false, this.centre); // a replay colours the drawing again from paper
    w.resetFade(); // the tree is opaque in the finale (D09)
    this.onStart();
    this.update(0);
  }

  // per rendered frame while active (`held`: a check holds the frame, see seek)
  update(dtMs) {
    if (!this.active || this.held) return;
    this.t += dtMs;
    const st = finaleState(this.t, { reducedMotion: this.reduced });
    this.stepWalk(dtMs);
    this.apply(st);
    if (st.done) this.end();
  }

  apply(st) {
    const w = this.world;
    w.setPlayHidden(st.hide);
    this.hero.stack.root.scale.setScalar(Math.max(0.01, 1 - st.hide)); // nothing on her head (V9)
    this.rig.wholeBlend = st.camera;
    if (st.settled && !this.settled && (!this.walk || this.walkDone(this.t))) {
      this.settled = true;
      const p = this.centre;
      this.hero.place(p.x, p.z);
      // A29-10: turned a little, so her ponytail reads sideways as in the drawing
      this.hero.yaw = FINALE_YAW; this.hero.yawTarget = FINALE_YAW; this.hero.view.rotation.y = FINALE_YAW;
      // the run's clips are still fading out: clear them, so the pose is exactly the drawing's
      this.hero.anim.mixer.stopAllAction();
      this.hero.anim.current = null;
      this.hero.showFinalePose(true);
    }
    w.finaleOutlines(st.outlines);
    w.setFinaleColour({ grass: st.grass, sky: st.sky, sun: st.sun, centre: this.centre });
  }

  // the walk: where she is at finale time t, her gait and her heading (WALK in walk.js)
  walkDone(t) { return !this.walk || t >= WALK.start + this.walk.ms; }
  stepWalk(dtMs) {
    const w = this.walk;
    if (!w || this.settled || this.t < WALK.start) return;
    const h = this.hero;
    const k = Math.min(1, (this.t - WALK.start) / w.ms);
    const at = walkAt(w, k);
    h.view.position.set(at.x, 0, at.z);
    h.body.position.set(at.x, h.body.position.y, at.z);
    h.body.velocity.set(0, 0, 0);
    if (k < 1) {
      h.yaw = at.yaw; h.view.rotation.y = at.yaw;
      h.anim.play(at.gait, 0.2, at.rate);
      h.anim.update(dtMs / 1000);
    }
  }

  // checks only (?debug=1): show the frame at t ms without ending; `held` keeps it there
  seek(ms) {
    if (!this.active) return;
    const dt = Math.max(0, ms - this.t);
    this.t = ms;
    this.stepWalk(dt);
    this.apply(finaleState(ms, { reducedMotion: this.reduced }));
  }

  // Skip (button or Escape): straight to the coloured end state
  skip() {
    if (!this.active) return;
    this.t = FINALE.total;
    this.walk = null; // straight to her place
    this.apply(FINALE_END);
    this.end();
  }

  end() {
    if (!this.active) return;
    this.active = false;
    const w = this.world;
    w.finaleActive = false;
    w.setFinished(true, this.centre);
    w.finaleOutlines(0);
    w.setBlueprint(w.blueprint, false);
    this.hero.stack.root.scale.setScalar(1);
    this.hero.showFinalePose(false);
    w.setPlayHidden(0);
    this.onEnd();
  }
}

// the static colliders she walks around: the house, the tree, the bench, the bed, the tables
// (circles on the ground: x, z, r), never her own body or the ground
function obstaclesOf(world, hero) {
  const out = [];
  for (const b of world.physics.bodies) {
    if (b === hero.body || b.mass !== 0) continue;
    const sh = b.shapes[0];
    if (!sh) continue;
    let r = null;
    if (sh.halfExtents) r = Math.hypot(sh.halfExtents.x, sh.halfExtents.z) * 0.85;
    else if (sh.radiusTop !== undefined) r = Math.max(sh.radiusTop, sh.radiusBottom);
    if (r === null) continue; // the ground plane
    out.push({ x: b.position.x, z: b.position.z, r: r + 0.4 });
  }
  return out;
}
