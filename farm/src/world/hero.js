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
import { actionPose, finalePose, stepUpHeight, toolPose } from './moments.js';
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
    a.clips.celebrate.setLoop(THREE.LoopOnce, 1);
    a.clips.celebrate.clampWhenFinished = true;
    a.defineAction('gather', ['idleLegs', 'gatherUpper']);
    a.defineAction('celebrate', ['celebrate']);
    // (the model's V_Finale clip, hands on hips, is not used since v0.22: the drawing's pose is
    // hands in her pockets, laid over her idle stance: showFinalePose, moments.js pocketPose)
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
    this.cancelMoment(); this.groundY = 0; this.stepTarget = 0; this.stepMs = 500;
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
  // v0.23: `tool` ('rake' | 'shovel' | null) is the tool she is working with now and `stroke`
  // (0..1) how far the work unit is: she rakes or digs (moments.js toolPose), and `toolStroke` says
  // where the tool's foot is on the ground before her (world.js gripWorld puts the tool there)
  update(dtMs, { working, faceTo, tool = null, stroke = 0 }) {
    this.restorePose();
    const p = this.body.position;
    const recovered = this.world.clampToBounds(p);
    if (recovered) { this.mover.speed = 0; this.body.velocity.set(0, 0, 0); }
    this.view.position.x += (p.x - this.view.position.x) * 0.5;
    this.view.position.z += (p.z - this.view.position.z) * 0.5;
    const height = this.world.bedHeight?.(new THREE.Vector3(p.x, 0, p.z)) ?? 0;
    if (height !== this.stepTarget) { this.stepFrom = this.groundY ?? 0; this.stepTarget = height; this.stepMs = 0; }
    this.stepMs = Math.min(500, (this.stepMs ?? 0) + dtMs);
    this.groundY = stepUpHeight(this.stepFrom ?? 0, height, this.reducedMotion() ? 1 : this.stepMs / 500);
    this.view.position.y = this.groundY;
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
    const toolWork = g.kind === 'still' && working && tool ? toolPose(tool, stroke, this.reducedMotion()) : null;
    // (with a tool she stands in her idle stance and the work's own pose is laid over it)
    const action = g.kind === 'still' ? (toolWork ? 'idle' : working ? 'gather' : this.celebrateMs > 0 ? 'celebrate' : 'idle') : g.kind;
    const swap = (prev === 'walk' && g.kind === 'run') || (prev === 'run' && g.kind === 'walk');
    this.anim.play(action, swap ? 0.2 : 0.15, g.rate, swap ? this.anim.phase() : null);
    this.anim.update(dtMs / 1000);
    // a foot plants at STEP_PHASE and half a cycle later (mover.js); a clip swap keeps the phase
    const ph = g.kind === 'still' ? null : this.anim.phase();
    if (ph !== null && footfalls(this.stepPhase, ph, STEP_PHASE[g.kind])) this.onFootfall?.(g.kind);
    this.stepPhase = ph;
    this.stack.update(dtMs, { vx: this.body.velocity.x, vz: this.body.velocity.z, yaw: this.yaw, reducedMotion: this.reducedMotion() });
    this.updateFace(dtMs, working);
    this.updateMoment(dtMs);
    this.toolStroke = null;
    if (toolWork && !this.moment) {
      for (const [name, angles] of Object.entries(toolWork.bones)) this.poseBone(name, ...angles);
      this.toolStroke = { kind: tool, reach: toolWork.reach, side: toolWork.side, lift: toolWork.lift + (this.groundY ?? 0), k: toolWork.k, stroke: toolWork.stroke };
    }
    if (!this.moment && this.stepMs < 500 && !this.reducedMotion()) {
      const k = Math.sin(this.stepMs / 500 * Math.PI);
      this.poseBone('Hip_L', -0.65 * k); this.poseBone('Knee_L', 0.9 * k);
    }
  }

  restorePose() {
    for (const [bone, q] of this.poseSaved ?? []) bone.quaternion.copy(q);
    this.poseSaved = [];
  }
  poseBone(name, x, y = 0, z = 0) {
    const bone = this.view.getObjectByName(name);
    if (!bone) return;
    this.poseSaved.push([bone, bone.quaternion.clone()]);
    bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
  }
  // v0.17c a spot's moment; v0.22: one for every song spot (moments.js). `seat` and `yaw`: the
  // bench; `route`: the chimney climb (there and back) or the stepping stones (one way: she ends
  // on the last one); `to`: the act's own place a step away (the tree's trunk, the window).
  startMoment(kind, { ms, seat, route, yaw, to, up, down } = {}) {
    this.restorePose();
    this.moment = { kind, ms, t: 0, from: this.position.clone(), seat, route, yaw, to, up, down };
    this.celebrateMs = 0;
    if (kind === 'clean' && !this.cloth) {
      this.cloth = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.035, 0.16), new THREE.MeshLambertMaterial({ color: 0xfff4d6 }));
      this.cloth.name = 'BenchCleaningCloth';
      this.view.getObjectByName('Hand_R_Tool')?.add(this.cloth);
    }
  }
  cancelMoment() {
    this.moment = null;
    this.momentSmile = 0;
    if (this.cloth) this.cloth.visible = false;
    for (const p of Object.values(this.props ?? {})) p.visible = false;
    this.view.rotation.z = 0;
    this.restorePose();
  }
  // What she holds in a moment: the sheet with her drawing on it (held up over her head, or as
  // the pad she sketches on) and the crumpled sketch she picks up. Made on first use.
  momentProps() {
    if (this.props) return this.props;
    const paper = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.drawingTexture?.(paper); // main.js: the drawing itself on the sheet, once it has loaded
    const edge = new THREE.MeshBasicMaterial({ color: 0x253347, side: THREE.DoubleSide });
    const sheet = new THREE.Group(); sheet.name = 'MomentSheet';
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), paper); face.position.z = 0.003;
    const border = new THREE.Mesh(new THREE.PlaneGeometry(0.53, 0.43), edge);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0xfffaf0, side: THREE.DoubleSide })); back.position.z = -0.003; // plain paper behind
    sheet.add(border, face, back);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), new THREE.MeshLambertMaterial({ color: 0xfffaf0, flatShading: true }));
    ball.name = 'MomentSketchBall';
    for (const o of [sheet, ball]) { o.visible = false; o.traverse((x) => { x.userData.noOutline = true; x.userData.noFit = true; }); }
    this.view.add(sheet);
    (this.view.getObjectByName('Hand_R_Tool') ?? this.view).add(ball);
    this.props = { sheet, ball };
    return this.props;
  }
  updateMoment(dtMs) {
    const m = this.moment;
    if (this.cloth) this.cloth.visible = m?.kind === 'clean';
    if (!m) return;
    if (this.moving) { this.cancelMoment(); return; }
    m.t = Math.min(m.ms, m.t + dtMs);
    const still = this.reducedMotion();
    const q = actionPose(m.kind, m.t / m.ms, still, { stones: m.route?.length ?? 5, up: m.up, down: m.down });
    for (const [name, angles] of Object.entries(q.bones)) this.poseBone(name, ...angles);
    this.momentSmile = q.smile;
    if (m.kind === 'bench' && m.seat) {
      const at = m.seat.clone(); at.y -= 0.86;
      this.position.copy(m.from).lerp(at, q.blend);
      this.view.rotation.y = m.yaw ?? this.yaw;
    } else if ((m.kind === 'chimney' || m.kind === 'roof') && m.route) {
      const points = [m.from, ...m.route.slice(1)];
      const at = q.travel * (points.length - 1);
      const i = Math.min(points.length - 2, Math.floor(at));
      this.position.copy(points[i]).lerp(points[i + 1], at - i);
      const d = points[i + 1].clone().sub(points[i]);
      this.view.rotation.y = Math.atan2(d.x, d.z);
      this.yaw = this.view.rotation.y; this.yawTarget = this.yaw;
    } else if (m.kind === 'hop' && m.route?.length > 1) {
      // from stone to stone along the line; she ends on the last one
      const at = q.travel * (m.route.length - 1);
      const i = Math.min(m.route.length - 2, Math.floor(at));
      this.position.copy(m.route[i]).lerp(m.route[i + 1], at - i);
      this.position.y = (this.groundY ?? 0) + q.lift;
      const d = m.route[i + 1].clone().sub(m.route[i]);
      this.yaw = Math.atan2(d.x, d.z); this.yawTarget = this.yaw;
      this.view.rotation.y = this.yaw;
      this.body.position.x = this.position.x; this.body.position.z = this.position.z;
    } else if (m.kind === 'clean' && m.seat) {
      this.view.rotation.y = Math.atan2(m.seat.x - this.body.position.x, m.seat.z - this.body.position.z);
      this.position.y -= 0.1 * q.blend;
    } else {
      if (m.to && q.to > 0) { this.position.x = m.from.x + (m.to.x - m.from.x) * q.to; this.position.z = m.from.z + (m.to.z - m.from.z) * q.to; }
      this.position.y = (this.groundY ?? 0) + q.lift;
      this.view.rotation.y = this.yaw + q.spin;
      this.view.rotation.z = q.roll;
    }
    // what she holds
    if (['show', 'sketch', 'pickup'].includes(m.kind)) {
      const { sheet, ball } = this.momentProps();
      sheet.visible = m.kind !== 'pickup' && q.prop > 0.25;
      ball.visible = m.kind === 'pickup' && m.t / m.ms > 0.36 && q.prop > 0.2;
      if (m.kind === 'show') { sheet.position.set(0, 1.3, 0.56); sheet.rotation.set(-0.1, 0, 0); sheet.scale.setScalar(1.25 * (0.4 + 0.6 * q.prop)); }
      if (m.kind === 'sketch') { sheet.position.set(0.02, 1.12, 0.36); sheet.rotation.set(-1.0, 0, 0.12); sheet.scale.setScalar(0.62 * (0.4 + 0.6 * q.prop)); }
    }
    if (m.t >= m.ms) this.cancelMoment();
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
    let smile = Math.max(focused ? 0 : 0.15, this.momentSmile ?? 0); // a moment's own smile (v0.22)
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

  // The drawing's pose for the finale camera (D17, spec §5, V9), nothing on her head; applied at
  // once, because the world is paused in the whole-farm view. v0.22 (Tiffany: "show her facing the
  // front smiling like the picture instead with her hands in her pockets (see drawing)"): her idle
  // stance with her hands in her hip pockets, elbows out, her ponytail out to the side, and a
  // smile (it was the hands-on-hips clip, turned to one side).
  showFinalePose(on) {
    this.stack.root.visible = !on;
    this.cancelMoment();
    this.anim.play('idle', 0);
    this.anim.update(1 / 60);
    this.restorePose();
    for (const h of this.heads) {
      h.morphTargetInfluences[h.morphTargetDictionary.blink] = 0;
      h.morphTargetInfluences[h.morphTargetDictionary.smile] = on ? 1 : 0.15;
    }
    if (on) {
      // (v0.23: and her head lifted to the viewer: "looking up towards the people and smiling")
      for (const [name, angles] of Object.entries(finalePose(1))) this.poseBone(name, ...angles);
      this.view.rotation.z = 0;
      this.view.updateMatrixWorld(true);
    }
  }

  // carried counts from the ledger: the stack reconciles to them (no flights)
  setCounts(carried) {
    this.stack.sync(carried);
    this.counts = { ...carried };
  }
}
