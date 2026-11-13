// The colour finale (spec v0.9 §5 and §10.9, P25-2): after the home (v0.15: H5) is saved, the play elements
// hide (V9), the camera eases to the drawing, Vanessa settles at D17 with her hands in her pockets (v0.22),
// anything still in outline takes its colour, the ground animates into grass from her feet, the
// sky turns blue from the horizon and, last, the sun turns yellow; then a hold, inside the
// approved 15 s. Skip lands on the coloured end state, and the world stays coloured afterwards
// (it derives from mainComplete, no save field). Presentation only: the ledger is untouched and
// the world loop is paused while it plays, so it is driven here by real frame time.
// v0.13 (captain's v0.12 playtest: "Vanessa teleport to the position she should be, maybe we can
// make her walk/run?"): she walks, or runs when it is far, from where she built the home to D17,
// around the house, the tree, the bench, the bed and the tables, while the camera eases out; then
// she turns to the viewer and puts her hands in her pockets. Reduced motion and Skip still place her.
// v0.25 (the captain's v0.24 playtest: "feels off ... it should be better thought"): the finale is
// two shots composed for the screen it plays on (framing.js FINALE_SHOTS): the camera eases to the
// finished house and holds on it while she cheers in front of it; then she runs to her place and
// the camera goes with her to the second shot, where the colour comes (reveal.js FINALE). No paper
// bands, and an upright screen never ends on the whole drawing as a small strip.
// v0.27 (the captain's v0.25 playtest, his phone showing her half of the drawing with the house out
// of the picture: "not what I was looking for / maybe we should simply show the whole farm"): one
// shot, on every screen: the whole farm (framing.js WHOLE_FARM, finaleRect). The camera eases out
// of play to it in the first two seconds, while she cheers at the house, and stays on it: she runs
// to her place across the picture, the colour comes, and it holds. The times are v0.25's.
import { FINALE, FINALE_END, finaleState } from '../game/reveal.js';
import { finaleRect } from './framing.js';
import { planWalk, walkAt, WALK } from './walk.js';

// Her final pose at D17. v0.13-v0.21 turned her 0.8 rad toward the screen's right, hands on her
// hips (A29-10, so that the ponytail read sideways). v0.22 (Tiffany: "In the final cinematic show
// her facing the front smiling like the picture instead with her hands in her pockets (see
// drawing)"): she faces the viewer, as the drawing has her; the pose itself swings the ponytail out
// to the side (hero.js showFinalePose, moments.js pocketPose).
export const FINALE_YAW = 0;

export class Finale {
  // world: World; hero: Hero; rig: CameraRig; at: () => Vector3, D17 on the ground;
  // reducedMotion: () => boolean; onStart / onEnd: the UI around it (main.js)
  // house: () => Vector3, the house she cheers at before she sets off (v0.25)
  constructor({ world, hero, rig, at, house = () => null, reducedMotion = () => false, onStart = () => {}, onEnd = () => {} }) {
    Object.assign(this, { world, hero, rig, at, house, reducedMotion, onStart, onEnd });
    this.active = false;
    this.t = 0;
    // the drawing camera's framing while the finale plays and while it eases back to play: the whole farm
    this.frame = (w, h) => finaleRect(w, h);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.held = false; // a check's hold (seek) never outlives its run
    this.t = 0;
    this.settled = false;
    this.reduced = this.reducedMotion();
    this.centre = this.at();
    const w = this.world;
    // her walk to D17 (presentation only; the world loop is paused)
    const from = this.hero.position.clone();
    this.walk = this.reduced ? null : planWalk(from, this.centre, obstaclesOf(w, this.hero));
    this.walkPhase = 0;
    this.cheered = false;
    this.rig.frameRect = this.frame;
    this.rig.frameK = 0;
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
    this.stepCheer(dtMs);
    this.stepWalk(dtMs);
    this.apply(st);
    if (st.done) this.end();
  }

  // v0.25: before she sets off she turns to the house she has just finished and cheers at it (her
  // own cheer, feet planted), her back to the viewer, as the camera eases out to the whole farm.
  // The world loop is paused, so her clips are moved on here.
  stepCheer(dtMs) {
    if (this.reduced || this.settled || this.t >= WALK.start) return;
    const h = this.hero;
    const at = this.house();
    if (at) {
      const want = Math.atan2(at.x - h.position.x, at.z - h.position.z);
      const d = Math.atan2(Math.sin(want - h.yaw), Math.cos(want - h.yaw));
      h.yaw += d * (1 - Math.exp(-dtMs / 110));
      h.yawTarget = h.yaw;
      h.view.rotation.y = h.yaw;
    }
    if (!this.cheered && this.t >= FINALE.cheer[0]) { this.cheered = true; h.anim.play('celebrate', 0.15); }
    else if (!this.cheered) h.anim.play('idle', 0.2);
    h.anim.update(dtMs / 1000);
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
      // facing the viewer, as the drawing has her (v0.22)
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
  // v0.14: every frame from the first moves her and her clips on, so she never stands frozen
  // while the camera eases: she turns onto her way within a few frames instead of snapping, and
  // once there (before the settle beat) she stands in her idle until the pose
  stepWalk(dtMs) {
    const w = this.walk;
    if (!w || this.settled || this.t < WALK.start) return;
    const h = this.hero;
    const k = w.ms > 0 ? Math.min(1, (this.t - WALK.start) / w.ms) : 1;
    const at = walkAt(w, k);
    h.view.position.set(at.x, 0, at.z);
    h.body.position.set(at.x, h.body.position.y, at.z);
    h.body.velocity.set(0, 0, 0);
    if (k < 1) {
      const d = Math.atan2(Math.sin(at.yaw - h.yaw), Math.cos(at.yaw - h.yaw));
      h.yaw += d * (1 - Math.exp(-dtMs / 45));
      h.view.rotation.y = h.yaw;
      const cur = h.anim.current;
      const swap = (cur === 'walk' && at.gait === 'run') || (cur === 'run' && at.gait === 'walk');
      h.anim.play(at.gait, 0.2, at.rate, swap ? h.anim.phase() : null); // a swap keeps the step
    } else h.anim.play('idle', 0.25);
    h.anim.update(dtMs / 1000);
  }

  // checks only (?debug=1): show the frame at t ms without ending; `held` keeps it there
  seek(ms) {
    if (!this.active) return;
    const dt = Math.max(0, ms - this.t);
    this.t = ms;
    this.stepCheer(dt);
    this.stepWalk(dt);
    this.apply(finaleState(ms, { reducedMotion: this.reduced }));
  }

  // Skip (button or Escape): straight to the coloured end state
  skip() {
    if (!this.active) return;
    this.t = FINALE.total;
    this.walk = null; // straight to her place
    this.settled = false; // (a skip before she has settled places her)
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
    this.onEnd(); // (the framing holds while the camera eases back to her: main.js)
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
