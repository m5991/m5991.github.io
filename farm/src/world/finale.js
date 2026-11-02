// The colour finale (spec v0.9 §5 and §10.9, P25-2): after H4 is saved, the play elements
// hide (V9), the camera eases to the drawing, Vanessa settles at D17 with her hands on her hips,
// anything still in outline takes its colour, the ground animates into grass from her feet, the
// sky turns blue from the horizon and, last, the sun turns yellow; then a hold, inside the
// approved 15 s. Skip lands on the coloured end state, and the world stays coloured afterwards
// (it derives from mainComplete, no save field). Presentation only: the ledger is untouched and
// the world loop is paused while it plays, so it is driven here by real frame time.
import { FINALE, FINALE_END, finaleState } from '../game/reveal.js';

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
    this.apply(st);
    if (st.done) this.end();
  }

  apply(st) {
    const w = this.world;
    w.setPlayHidden(st.hide);
    this.hero.stack.root.scale.setScalar(Math.max(0.01, 1 - st.hide)); // nothing on her head (V9)
    this.rig.wholeBlend = st.camera;
    if (st.settled && !this.settled) {
      this.settled = true;
      const p = this.centre;
      this.hero.place(p.x, p.z);
      this.hero.yaw = 0; this.hero.yawTarget = 0; this.hero.view.rotation.y = 0;
      this.hero.showFinalePose(true);
    }
    w.finaleOutlines(st.outlines);
    w.setFinaleColour({ grass: st.grass, sky: st.sky, sun: st.sun, centre: this.centre });
  }

  // checks only (?debug=1): show the frame at t ms without ending; `held` keeps it there
  seek(ms) {
    if (!this.active) return;
    this.t = ms;
    this.apply(finaleState(ms, { reducedMotion: this.reduced }));
  }

  // Skip (button or Escape): straight to the coloured end state
  skip() {
    if (!this.active) return;
    this.t = FINALE.total;
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
