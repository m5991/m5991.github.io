// Vanessa actor: the BASE hero pattern (annex §C.1/§C.5) on upstream libraries.
// - body: dynamic sphere r = 0.3 at y = 0.3, mass 50, fixed rotation (BASE heroPhysicsBody,
//   app.pretty.js 35199-35211); 0.6 m is the "Vanessa collision diameter" of spec §4.
// - mover: BASE `Vo` (34323-34378) wrote velocity = input direction x speed every step and zeroed
//   it on stop; P23-6.12 replaces that instant start/stop with the eased mover in mover.js
//   (0.1 s to full speed, 0.08 s to stop, ~0.12 s turns). Top speed is a 5.0 m/s run, not
//   P23-2's 2.2 m/s walk (captain phone test 2026-11-01); a partly deflected stick walks.
// - gait: V_Walk below the run threshold, V_Run above it, with hysteresis and phase-matched
//   cross-fades; the clip rate follows the eased speed (mover.js `gait`).
// - view: the provisional Vanessa GLB, lerped to the body (BASE 0.5 per step, 35084).
// - what she carries: one tall stack of the actual unit models on top of her head, the ad's way
//   (captain, 2026-11-01; carry.js), replacing the five 1-4/5-8/9-12 side clusters. It rides
//   her head (the step bounce, the bow while she gathers), stays upright and sways on a spring;
//   the ledger count stays authoritative and the HUD shows it. Coins are never on the stack
//   (the purse is a HUD number).
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MaskedAnimator, VANESSA_MASKS } from '../core/anim.js';
import { addOutline } from './greybox.js';
import { contactBlob } from './look.js';
import { footfalls, gait, RUN_SPEED, STEP_PHASE, stepMover, turnToward } from './mover.js';
import { CarryStack } from './carry.js';

export const HERO_RADIUS = 0.3;
export { RUN_SPEED }; // m/s, mover.js

export class Hero {
  constructor({ registry, world, scene, speed = RUN_SPEED, reducedMotion = false }) {
    this.speed = speed;
    this.reducedMotion = typeof reducedMotion === 'function' ? reducedMotion : () => reducedMotion; // main.js wires the setting
    this.world = world;
    this.view = registry.instance('Vanessa');
    this.view.name = 'D17_Vanessa';
    // the face is drawn lines already (eyes, brows, mouth): it gets no ink hull
    this.view.traverse((m) => { if (m.isMesh && m.morphTargetDictionary?.blink !== undefined) m.userData.noOutline = true; });
    addOutline(this.view, 0.012);
    this.view.traverse((m) => { if (m.isMesh && !m.userData.outline) { m.castShadow = true; m.frustumCulled = false; } });
    this.view.add(contactBlob(0.34)); // nothing floats, even with shadows off (spec §10.6 item 4)
    scene.add(this.view);
    this.body = new CANNON.Body({ mass: 50, shape: new CANNON.Sphere(HERO_RADIUS), fixedRotation: true, allowSleep: false, linearDamping: 0 });
    this.body.position.set(0, HERO_RADIUS, 0);
    world.physics.addBody(this.body);

    // animation: BASE action table pattern (ee) with Vanessa clips
    const a = new MaskedAnimator(this.view);
    a.addClip({ name: 'idle', clip: registry.clip('V_Idle') });
    a.addClip({ name: 'walk', clip: registry.clip('V_Walk') });
    a.addClip({ name: 'run', clip: registry.clip('V_Run') });
    a.addClip({ name: 'idleLegs', clip: registry.clip('V_Idle'), ...VANESSA_MASKS.legs });
    a.addClip({ name: 'gatherUpper', clip: registry.clip('V_Gather'), ...VANESSA_MASKS.upper });
    a.defineAction('idle', ['idle']);
    a.defineAction('walk', ['walk']);
    a.defineAction('run', ['run']);
    a.addClip({ name: 'celebrate', clip: registry.clip('V_Celebrate') });
    a.addClip({ name: 'finale', clip: registry.clip('V_Finale') });
    a.clips.celebrate.setLoop(THREE.LoopOnce, 1);
    a.clips.celebrate.clampWhenFinished = true;
    a.defineAction('gather', ['idleLegs', 'gatherUpper']);
    a.defineAction('celebrate', ['celebrate']);
    a.defineAction('finale', ['finale']);
    // the stack rides on her head, so her arms stay free: no carry pose
    a.play('idle', 0);
    this.celebrateMs = 0; // a stage commit's cheer, feet planted (spec §10.2), while she stands
    this.anim = a;
    this.gait = 'still';
    this.stepPhase = null; // walk/run cycle phase last frame, for footfalls (null when still)
    this.onFootfall = null; // (gait 'walk' | 'run') -> void: a foot was planted (footstep sounds)

    this.heads = [];
    this.view.traverse((m) => { if (m.isMesh && m.morphTargetDictionary && !m.userData.outline) this.heads.push(m); });
    this.face = { blinkIn: 3000, blinkT: -1, smileT: 0, smileMs: 0 };

    this.input = new THREE.Vector2();
    this.mover = { speed: 0, heading: 0 };
    this.moving = false; // input held; the stillness rule also needs groundSpeed < 0.05 m/s
    this.working = false;
    this.facingTarget = null;
    this.yaw = 0;
    this.stack = new CarryStack({ parent: this.view, worldRoot: world.root, anchor: this.view.getObjectByName('HeadEnd_M') });
    this.counts = { W: 0, R: 0, C: 0, S: 0, T: 0 };
  }

  get position() { return this.view.position; }

  place(x, z) {
    this.body.position.set(x, HERO_RADIUS, z);
    this.view.position.set(x, 0, z);
    this.halt();
  }

  // stop dead: pause, cards, teleports and bounds recovery must not leave a glide to resume
  halt() {
    this.input.set(0, 0);
    this.mover.speed = 0;
    this.moving = false;
    this.body.velocity.set(0, 0, 0);
    this.gait = 'still';
    this.stepPhase = null;
  }

  // current eased ground speed, m/s
  get groundSpeed() { return this.mover.speed; }

  // dir: Vector2 in screen space (x right, y up), magnitude 0..1; the stick dead zone and
  // analog scaling are applied by the input layer, so any nonzero vector means "walk"
  setInput(v) { this.input.copy(v); }

  // mover step (before the physics step)
  preStep(dtMs) {
    this.moving = this.input.lengthSq() > 1e-6;
    const v = stepMover(this.mover, this.input, dtMs / 1000, this.speed);
    this.body.velocity.x = v.x;
    this.body.velocity.z = v.z;
    if (this.moving) this.yawTarget = Math.atan2(this.input.x, -this.input.y);
  }

  // after the physics step: view follows body, bounds recovery, facing, animation and face
  update(dtMs, { working, faceTo }) {
    const p = this.body.position;
    const recovered = this.world.clampToBounds(p);
    if (recovered) { this.mover.speed = 0; this.body.velocity.set(0, 0, 0); }
    this.view.position.x += (p.x - this.view.position.x) * 0.5;
    this.view.position.z += (p.z - this.view.position.z) * 0.5;
    this.view.position.y = 0;
    if (faceTo && !this.moving) this.yawTarget = Math.atan2(faceTo.x - p.x, faceTo.z - p.z);
    if (this.yawTarget !== undefined) {
      this.yaw = turnToward(this.yaw, this.yawTarget, dtMs / 1000);
      this.view.rotation.y = this.yaw;
    }
    // walk or run cycle while steering or still gliding; the rate follows the eased speed so a
    // half-deflected stick does not moonwalk; walk <-> run swaps keep the stride phase
    const prev = this.gait;
    const g = gait(prev, { speed: this.mover.speed, target: Math.min(1, this.input.length()) * this.speed, moving: this.moving });
    this.gait = g.kind;
    if (this.celebrateMs > 0) this.celebrateMs = g.kind === 'still' && !working ? this.celebrateMs - dtMs : 0;
    const action = g.kind === 'still' ? (working ? 'gather' : this.celebrateMs > 0 ? 'celebrate' : 'idle') : g.kind;
    const swap = (prev === 'walk' && g.kind === 'run') || (prev === 'run' && g.kind === 'walk');
    this.anim.play(action, swap ? 0.2 : 0.15, g.rate, swap ? this.anim.phase() : null);
    this.anim.update(dtMs / 1000);
    // a foot plants at STEP_PHASE and half a cycle later (mover.js); a clip swap keeps the phase
    const ph = g.kind === 'still' ? null : this.anim.phase();
    if (ph !== null && footfalls(this.stepPhase, ph, STEP_PHASE[g.kind])) this.onFootfall?.(g.kind);
    this.stepPhase = ph;
    this.stack.update(dtMs, { vx: this.body.velocity.x, vz: this.body.velocity.z, yaw: this.yaw, reducedMotion: this.reducedMotion() });
    this.updateFace(dtMs, working);
  }

  // blink overlay every 3-6 s for ~150 ms; brief smile on celebrations (spec §10.2)
  updateFace(dtMs, focused) {
    const f = this.face;
    f.blinkIn -= dtMs;
    if (f.blinkIn <= 0 && f.blinkT < 0) { f.blinkT = 0; f.blinkIn = 3000 + Math.random() * 3000; }
    let blink = 0;
    if (f.blinkT >= 0) {
      f.blinkT += dtMs;
      blink = f.blinkT < 75 ? f.blinkT / 75 : Math.max(0, 1 - (f.blinkT - 75) / 75);
      if (f.blinkT > 150) f.blinkT = -1;
    }
    let smile = focused ? 0 : 0.15;
    if (f.smileMs > 0) {
      f.smileT += dtMs;
      const k = f.smileT / f.smileMs;
      smile = k < 0.2 ? k / 0.2 : k > 0.8 ? Math.max(0, (1 - k) / 0.2) : 1;
      if (f.smileT >= f.smileMs) f.smileMs = 0;
    }
    for (const h of this.heads) {
      h.morphTargetInfluences[h.morphTargetDictionary.blink] = blink;
      h.morphTargetInfluences[h.morphTargetDictionary.smile] = smile;
    }
  }

  // a stage commit: a broad smile, and the cheer if she is standing (about 1.7 s, never moves her)
  celebrate(ms = 1200) {
    this.face.smileT = 0; this.face.smileMs = ms;
    this.celebrateMs = this.anim.clips.celebrate.getClip().duration * 1000;
  }

  // the drawing's pose for the finale camera (D17, spec §5, V9): hands on hips, nothing on her
  // head; applied at once, because the world is paused in the whole-farm view
  showFinalePose(on) {
    this.stack.root.visible = !on;
    this.anim.play(on ? 'finale' : 'idle', 0);
    this.anim.update(1 / 60);
    if (on) this.view.updateMatrixWorld(true);
  }

  // carried counts from the ledger: the stack reconciles to them (no flights)
  setCounts(carried) {
    this.stack.sync(carried);
    this.counts = { ...carried };
  }
}
