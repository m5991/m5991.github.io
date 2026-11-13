// v0.25 "Sunset on the bench" (game/sunset.js has the rules and the timeline): the scene that
// plays once everything is found on the finished farm. The day turns to golden evening and the
// fireflies come up; Vanessa walks to the bench where Dwight sits and sits down at its free end;
// "The Farm, complete" is pencilled in under them and a gold 100% comes onto the paper beside it.
// Presentation only, like the finale (world/finale.js): the ledger is untouched and the world loop
// is paused while it plays, so it is driven here by real frame time. Nothing is hidden for it (the
// tables, the crate and Dwight are the farm as it is that evening) but what she carries.
import { SUNSET, SUNSET_END, sunsetState } from '../game/sunset.js';
import { sunsetRect } from './framing.js';
import { planWalk } from './walk.js';

const WALK_SPEED = 2.3; // m/s: unhurried; a long way is squeezed into SUNSET.walk

export class Sunset {
  // world: World; hero: Hero; rig: CameraRig; reducedMotion: () => boolean;
  // onStart / onState(st) (the light, the signature: main.js) / onEnd: the UI around it
  constructor({ world, hero, rig, reducedMotion = () => false, onStart = () => {}, onState = () => {}, onEnd = () => {} }) {
    Object.assign(this, { world, hero, rig, reducedMotion, onStart, onState, onEnd });
    this.active = false;
    this.t = 0;
    this.state = null;
    this.shotK = 0;
    this.frame = (w, h) => sunsetRect(w, h, this.shotK);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.held = false; // a check's hold (seek) never outlives its run
    this.t = 0;
    this.endedAt = null; // v0.27: the scene's time when it ended (a skip: when it was skipped)
    this.reduced = this.reducedMotion();
    const w = this.world; const h = this.hero;
    // Dwight is on the bench (he walks there after the finale; here he simply is there)
    w.archerToBench('A1', { instant: true });
    this.seat = w.benchSeat(); // its free end
    this.benchYaw = w.objects.D10.rotation.y;
    // v0.27: her spot in front of that seat, where her feet stay while she sits down (hero.js
    // sitSpot; v0.25 walked her to the bench's front and slid her from there into the seat)
    this.front = h.sitSpot(this.seat, this.benchYaw);
    const from = h.position.clone();
    this.walk = planWalk(from, this.front, obstaclesOf(w, h), 48, Infinity); // from wherever she is: no jump
    // her way takes its length at a walk, inside the scene's time for it
    const room = SUNSET.walk[1] - SUNSET.walk[0];
    this.walkMs = Math.max(600, Math.min(room, (this.walk.len / WALK_SPEED) * 1000));
    this.seated = false;
    w.resetFade(); // the tree is opaque: nothing is to be seen through it
    w.hideMarkers(); // no guide circle, and no ring round what she stood beside
    if (w.marker) w.marker.obj.visible = false;
    h.halt();
    h.cancelMoment({ hard: true });
    this.shotK = this.reduced ? 1 : 0;
    this.rig.frameRect = this.frame;
    this.rig.frameK = 0;
    this.onStart();
    this.update(0);
  }

  // per rendered frame while active (`held`: a check holds the frame, see seek)
  update(dtMs) {
    if (!this.active || this.held) return;
    this.t += dtMs;
    this.step(dtMs);
    if (this.state.done) this.end();
  }

  step(dtMs) {
    const st = sunsetState(this.t, { reducedMotion: this.reduced });
    this.state = st;
    this.rig.wholeBlend = st.camera;
    this.shotK = st.shot;
    this.stepHero(dtMs, st);
    this.onState(st);
  }

  // where she is on her way at walk time k (0..1): the point at that share of its length
  wayAt(k) {
    const w = this.walk;
    const s = Math.max(0, Math.min(1, k)) * w.len;
    let i = 1;
    while (i < w.pts.length - 1 && w.cum[i] < s) i++;
    const a = w.pts[i - 1]; const b = w.pts[i];
    const f = Math.max(0, Math.min(1, (s - w.cum[i - 1]) / Math.max(1e-6, w.cum[i] - w.cum[i - 1])));
    return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
  }

  // her walk to the bench and her sitting down, moved on here (the world loop is paused)
  stepHero(dtMs, st) {
    const h = this.hero;
    h.stack.root.scale.setScalar(0.01); // nothing on her head as she sits
    h.restorePose();
    const tWalk = this.t - SUNSET.walk[0];
    const k = this.reduced ? 1 : Math.max(0, Math.min(1, tWalk / this.walkMs));
    if (k < 1 && this.walk.len > 0.05) {
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // eased: she sets off and arrives gently
      const at = this.wayAt(e);
      h.view.position.set(at.x, 0, at.z);
      h.body.position.set(at.x, h.body.position.y, at.z);
      h.body.velocity.set(0, 0, 0);
      const d = Math.atan2(Math.sin(at.yaw - h.yaw), Math.cos(at.yaw - h.yaw));
      h.yaw += d * (1 - Math.exp(-dtMs / 90));
      h.yawTarget = h.yaw;
      h.view.rotation.y = h.yaw;
      if (tWalk >= 0) h.anim.play('walk', 0.25, Math.max(0.6, Math.min(1.45, (this.walk.len / (this.walkMs / 1000)) / 1.57)));
      else h.anim.play('idle', 0.2);
      h.anim.update(dtMs / 1000);
      return;
    }
    // on her spot in front of the bench: she turns the way it faces and sits down at its free
    // end, her feet staying where they are (v0.27: hero.js poseSit)
    h.anim.play('idle', 0.3);
    h.anim.update(dtMs / 1000);
    const s = st.sit;
    if (s > 0 || this.reduced) h.poseSit(this.seat, this.benchYaw, s);
    else {
      const d = Math.atan2(Math.sin(this.benchYaw - h.yaw), Math.cos(this.benchYaw - h.yaw));
      h.yaw += d * (1 - Math.exp(-dtMs / 140));
      h.yawTarget = h.yaw;
      h.view.rotation.y = h.yaw;
      h.view.position.set(this.front.x, 0, this.front.z);
      h.momentSmile = 0;
    }
    h.body.position.x = this.front.x; h.body.position.z = this.front.z;
    h.updateFace(dtMs, false);
    this.seated = s >= 1;
  }

  // checks only (?debug=1): show the frame at t ms without ending; `held` keeps it there
  seek(ms) {
    if (!this.active) return;
    const dt = Math.max(0, ms - this.t);
    this.t = ms;
    this.step(dt);
  }

  // Skip (button or Escape): straight to the end of it
  skip() {
    if (!this.active) return;
    this.endedAt = this.t;
    this.t = SUNSET.total;
    this.state = SUNSET_END;
    this.onState(SUNSET_END);
    this.end();
  }

  // The scene ends with her seated (a skipped one too: Skip lands on its last frame), and she
  // gets up from there as the farm goes on: an animated stand-up onto her spot in front of the
  // bench (hero.js standUp), the evening stays (main.js). (v0.25 put her on her feet at once; the
  // captain: "she sits and then teleports to not being sitted".)
  end() {
    if (!this.active) return;
    this.active = false;
    const h = this.hero;
    h.restorePose();
    h.stack.root.scale.setScalar(1);
    h.standUp(this.seat, this.benchYaw);
    this.shotK = 1; // (the framing holds while the camera eases back to her)
    this.endedAt ??= this.t;
    this.onEnd();
  }
}

// the static colliders she walks around (circles on the ground), as in the finale
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
