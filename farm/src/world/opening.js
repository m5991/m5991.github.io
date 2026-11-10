// The opening (spec v0.10 §4.1; the timeline and the clock are in game/opening.js): the page
// with the finished farm drawn in ink, the camera sinking into it, the drawing lifting into the
// live world in its start state (the parts not built yet become blueprint ghosts, the play
// elements come up, what is usable from the start takes its colour in the §10.9 wash), the
// camera easing down to the play camera, and Vanessa filling with colour, ending exactly on the
// play start that start() (main.js) has already set up: the same ledger, position, camera and
// first guide step. Presentation only: the ledger is untouched and the world loop is held while
// it plays, so it is driven here by real frame time, like the finale (world/finale.js).
import * as THREE from 'three';
import { createClock, OPENING_END, OPENING_START, openingState, SKIP_FADE_MS, stepClock } from '../game/opening.js';
import { INK_ALL, INK_OFF, ownInkFront, setInkFront } from './look.js';
import { HORIZON_V } from './projection.js';

const tmp = new THREE.Vector3();

export class Opening {
  // world: World; hero: Hero; rig: CameraRig; paper: ui/paper.js; view: () => { w, h } in CSS
  // px; music: () => { state, position } of the theme (audio.js); finished: () => the farm is
  // complete (its finale's colours are part of the end state); reducedMotion: () => boolean;
  // onStart / onRun / onFreeze (copy the frame on screen now, paper.captureView) / onEnd: the UI
  // around it (main.js)
  constructor({ world, hero, rig, paper, view = () => paper.viewport, music = () => ({}), finished = () => false, reducedMotion = () => false, onStart = () => {}, onRun = () => {}, onFreeze = () => {}, onEnd = () => {} }) {
    Object.assign(this, { world, hero, rig, paper, view, music, finished, reducedMotion, onStart, onRun, onFreeze, onEnd });
    this.active = false;
    this.phase = null; // 'waiting' (the resting page, before the first tap) | 'running'
    this.clock = createClock();
    this.state = null;
    this.heroInk = ownInkFront(hero.view); // she fills with colour after the farm (beat 3)
  }

  get t() { return this.clock.t; }
  // the page covers the whole screen: nothing 3D needs drawing (once its still is taken)
  get coversCanvas() { return this.active && (this.state?.paper ?? 1) >= 1; }

  // Show the page over the play start that is already set up (start() in main.js), or over the
  // farm as it is now (a replay).
  prepare() {
    if (this.active) return;
    this.active = true;
    this.phase = 'waiting';
    this.clock = createClock();
    this.reduced = this.reducedMotion();
    this.centre = this.hero.position.clone();
    this.stepped = false;
    this.playK = null;
    this.titleWorld = null;
    const w = this.world;
    // how high the colour has to rise: the tallest thing in the drawing
    w.root.updateMatrixWorld(true);
    this.top = Math.min(14, new THREE.Box3().setFromObject(w.root).max.y) + 0.4;
    w.resetFade();
    const h = this.hero;
    h.halt();
    h.yaw = 0; h.yawTarget = 0; h.view.rotation.y = 0; // facing out of the page, as drawn
    h.showFinalePose(true); // the drawing's hands-on-hips pose, nothing on her head
    w.showHeldTool(false);
    this.rig.frameK = 1; // v0.21 (audit 9): an upright screen's page shows the drawing's middle, larger
    this.paper.show('waiting');
    this.paper.needsCapture = true;
    this.onStart();
    this.apply(OPENING_START);
  }

  // the first tap, click, Enter or Space on the page: the theme starts and the clock with it
  begin() {
    if (!this.active || this.phase !== 'waiting') return;
    this.phase = 'running';
    this.paper.setMode('running');
    this.onRun();
  }

  // per rendered frame while active
  update(dtMs) {
    if (!this.active || this.held || this.phase !== 'running') return;
    this.clock = stepClock(this.clock, dtMs, this.music());
    const st = openingState(this.clock.t, { reducedMotion: this.reduced });
    this.apply(st, dtMs);
    if (st.done) this.end();
  }

  apply(st, dtMs = 0) {
    this.state = st;
    const w = this.world;
    this.paper.setDive(st.dive);
    this.paper.setOpacity(st.paper);
    this.rig.wholeBlend = st.camera;
    // the play elements come up out of the paper (they are not in the drawing)
    const k = 1 - st.stations;
    if (k <= 0) { if (this.playK !== 0) w.setPlayHidden(0); }
    else if (k >= 1) { if (this.playK !== 1) w.setPlayHidden(1); }
    else { if (this.playK === 1 || this.playK === null) w.setPlayHidden(0); w.setPlayHidden(k); }
    this.playK = k <= 0 ? 0 : k >= 1 ? 1 : k;
    w.drawingLook(st.drawing);
    // the colour rises from the ground: first the farm, then Vanessa; a finished farm's grass,
    // sky and sun come with the farm's wash
    setInkFront(st.wash <= 0 ? INK_ALL : st.wash >= 1 ? INK_OFF : -0.3 + st.wash * this.top);
    setInkFront(st.hero <= 0 ? INK_ALL : st.hero >= 1 ? INK_OFF : -0.3 + st.hero * 2.3, this.heroInk);
    if (this.finished()) w.setFinaleColour(st.wash > 0 ? { grass: st.wash, sky: st.wash, sun: st.wash, centre: this.centre } : {});
    if (!st.steppedIn && this.stepped) { this.stepped = false; this.hero.showFinalePose(true); w.showHeldTool(false); } // a check seeking back
    if (st.steppedIn && !this.stepped) {
      this.stepped = true;
      this.hero.showFinalePose(false); // into her idle
      w.showHeldTool(true);
    }
    if (this.stepped && dtMs > 0) this.hero.update(dtMs, { working: false, faceTo: null });
    this.placeTitle(st);
  }

  // the title rides the page while it sinks, then the world as the camera eases down, so it
  // slides out of frame; it is gone by the time the camera arrives
  placeTitle(st) {
    if (!this.paper.layout) return;
    if (st.paper >= 1 || st.camera >= 1) { this.paper.titleAt(this.paper.titleOnPage(), st.paper); return; }
    const cam = this.rig.camera;
    if (!this.titleWorld) {
      // where the title's centre sits on a vertical plane at the horizon, through the drawing's
      // own framing (the page's last frame), and how big a metre there is on screen
      const { w, h } = this.view();
      const r = this.paper.layout.comp; // where the whole drawing lands (v0.21: not the sheet's crop)
      const c = this.paper.titleCentre;
      const p = this.world.proj;
      const z = p.groundAt(50, HORIZON_V).z;
      const at = p.backdropAt(((c.x - r.x) / r.w) * 100, ((c.y - r.y) / r.h) * 100, z);
      if (!at) return;
      this.titleWorld = { at, c, px: this.metrePx(at, p.camera, w, h, r) };
    }
    const { w, h } = this.view();
    const tw = this.titleWorld;
    cam.updateMatrixWorld();
    tmp.copy(tw.at).project(cam);
    const x = ((tmp.x + 1) / 2) * w; const y = ((1 - tmp.y) / 2) * h;
    const s = this.metrePx(tw.at, cam, w, h) / tw.px;
    this.paper.titleAt({ dx: x - tw.c.x, dy: y - tw.c.y, s: Math.max(0.01, s) }, Math.max(0, 1 - (1 - st.camera) * 2.5));
  }

  // screen px per metre across the view at a point, through a camera (the drawing camera spans
  // the fitted rectangle `r`; a viewport camera spans the whole view)
  metrePx(at, camera, w, h, r = null) {
    camera.updateMatrixWorld();
    const a = tmp.copy(at).project(camera).x;
    const b = tmp.copy(at).setX(at.x + 1).project(camera).x;
    return Math.abs(b - a) / 2 * (r ? r.w : w);
  }

  // checks only (?debug=1): show the frame at t ms after the tap; `held` keeps it there
  seek(ms) {
    if (!this.active) return;
    if (this.phase === 'waiting') this.begin();
    this.clock = { ...this.clock, t: ms, free: true };
    this.apply(openingState(ms, { reducedMotion: this.reduced }), 0);
  }

  // any tap, click or key after the start: the same end state, cross-faded in 200 ms
  skip() {
    if (!this.active || this.phase !== 'running') return;
    if (!this.coversCanvas) this.onFreeze(); // hold the live frame on screen for the cross-fade
    this.apply(OPENING_END);
    this.end(SKIP_FADE_MS);
  }

  end(fadeMs = 0) {
    if (!this.active) return;
    this.active = false;
    this.phase = null;
    const w = this.world;
    setInkFront(INK_OFF);
    setInkFront(INK_OFF, this.heroInk);
    w.setPlayHidden(0);
    w.drawingLook(0);
    this.rig.wholeBlend = 0;
    this.rig.frameK = 0;
    if (!this.stepped) this.hero.showFinalePose(false);
    this.stepped = true;
    w.showHeldTool(true);
    w.setFinished(this.finished(), this.centre);
    this.onEnd(fadeMs);
    this.paper.hide(fadeMs);
  }
}
