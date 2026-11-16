// v0.29 (Tiffany, "Farm changes #3": "On the action that relates to the song, I gave it to the
// world, I have a person who looks like Tiffany (another farmer but with blond hair and a different
// colored shirt) run in in a second pair of overalls, steal the drawing and throw copies around then
// get chased off the screen by Vanessa. this should be the last song."): the scene at "Show your
// drawing to the world". Vanessa holds her drawing out; a second farmer, Vanessa's own model in its
// overalls with blond hair, a rose shirt and a red cap, runs in, takes the drawing, throws copies of
// it all round, and runs off past the edge of the screen with Vanessa after her. The copies lie on the
// grass a while, then fade. Presentation only: the song is found as ever, after the scene (main.js).
//
// The timeline (ms on the act's clock, THIEF_SCENE): she shows the drawing; the farmer comes in
// from the left; takes it; throws the copies; runs off to the right, Vanessa running after her for
// a few steps; Vanessa stops, the farmer runs on out of sight. Reduced motion: no running and no
// flying paper: the farmer stands beside her with the drawing and the copies lie about, then she
// is gone.
import * as THREE from 'three';

export const THIEF_SCENE = Object.freeze({
  ms: 9000,
  arriveMs: 1700, // she runs in from off the screen, and takes the drawing as she arrives
  throwMs: [2100, 3900], // the copies fly
  fleeMs: 4300, // she runs off; Vanessa starts after her a moment later
  chaseMs: [4600, 6600], // Vanessa runs after her
  goneMs: 7600, // past the edge of the screen: gone
  copies: 7,
  from: -9, // m from Vanessa, along the row in front of the farm: where she comes from
  to: 16, // and where she runs off to
  speed: 5.2, // m/s running
});
// the farmer's colours in place of Vanessa's (her hair and shirt; the cap red; the overalls kept)
export const THIEF_LOOK = Object.freeze({
  hair: [0x4a2f22, 0xe2c16a], hairLight: [0x6b534a, 0xf0d78f], shirt: [0xf4eddc, 0xe07a8e], shirtShade: [0xe2dbcb, 0xc86a7d], cap: [0x263853, 0xb8352e],
});

const linear = (hex) => new THREE.Color(hex); // (THREE.Color takes sRGB hex to the linear working space)

// Vanessa's model with the farmer's colours: her vertex colours swapped where they are Vanessa's
// hair, shirt and cap (within a small tolerance: the file stores them in 8 bits)
export function recolour(root, look = THIEF_LOOK, tol = 0.03) {
  const pairs = Object.values(look).map(([a, b]) => [linear(a), linear(b)]);
  let changed = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry.attributes.color) return;
    o.geometry = o.geometry.clone();
    const col = o.geometry.attributes.color;
    for (let i = 0; i < col.count; i++) {
      const r = col.getX(i); const g = col.getY(i); const b = col.getZ(i);
      for (const [from, to] of pairs) {
        if (Math.abs(r - from.r) < tol && Math.abs(g - from.g) < tol && Math.abs(b - from.b) < tol) { col.setXYZ(i, to.r, to.g, to.b); changed++; break; }
      }
    }
    col.needsUpdate = true;
  });
  return changed;
}

export class ThiefScene {
  constructor({ registry, root, tweens, drawingMap, inkWord, puff, reducedMotion = () => false }) {
    Object.assign(this, { registry, root, tweens, drawingMap, inkWord, puff, reducedMotion });
    this.active = false;
    this.copies = [];
  }
  build() {
    if (this.model) return;
    const m = this.registry.instance('Vanessa');
    m.name = 'TheOtherFarmer';
    this.changed = recolour(m);
    m.visible = false;
    this.root.add(m);
    this.model = m;
    this.mixer = new THREE.AnimationMixer(m);
    this.acts = Object.fromEntries(['V_Run', 'V_Idle', 'V_Celebrate'].map((c) => [c, this.mixer.clipAction(this.registry.clip(c))]));
    // the drawing in her hand, and the copies
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.drawingMap((t) => { mat.map = t; mat.needsUpdate = true; });
    this.paper = mat;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), mat);
    sheet.name = 'StolenDrawing';
    sheet.visible = false;
    (m.getObjectByName('Hand_R_Tool') ?? m).add(sheet);
    const s = new THREE.Vector3(); sheet.parent.updateWorldMatrix(true, false); sheet.parent.getWorldScale(s);
    sheet.scale.setScalar(1 / Math.max(1e-3, s.x));
    this.sheet = sheet;
    m.traverse((o) => { o.userData.noFit = true; });
  }
  play(name) {
    for (const [n, a] of Object.entries(this.acts)) { if (n === name) { if (!a.isRunning()) a.reset().play(); } else a.stop(); }
  }
  // the scene starts at Vanessa's place `at` (a ground point), the camera at `camera`
  start(at, camera) {
    this.build();
    this.clearCopies();
    this.active = true;
    this.t = 0;
    this.at = at.clone();
    // along the row in front of the farm, across the screen: from the left, off to the right
    const right = camera ? new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize() : new THREE.Vector3(1, 0, 0);
    this.right = right;
    this.fromP = at.clone().addScaledVector(right, THIEF_SCENE.from).add(new THREE.Vector3(0, 0, 0.35));
    this.meetP = at.clone().addScaledVector(right, -0.75).add(new THREE.Vector3(0, 0, 0.35));
    this.toP = at.clone().addScaledVector(right, THIEF_SCENE.to).add(new THREE.Vector3(0, 0, 0.35));
    const m = this.model;
    m.position.copy(this.reducedMotion() ? this.meetP : this.fromP);
    m.rotation.y = Math.atan2(right.x, right.z);
    m.visible = true;
    this.sheet.visible = false;
    this.thrown = 0;
    this.play(this.reducedMotion() ? 'V_Idle' : 'V_Run');
  }
  // where she is (for Vanessa to chase), or null
  get position() { return this.active ? this.model.position : null; }
  // one step of the scene. -> { took?, flee?, chase?, gone? } what happened in this step
  update(dtMs) {
    if (!this.active) return {};
    const S = THIEF_SCENE;
    const before = this.t;
    this.t += dtMs;
    const t = this.t;
    const at = (k) => before < k && t >= k;
    const out = {};
    this.mixer.update(dtMs / 1000);
    const m = this.model;
    const still = this.reducedMotion();
    if (t < S.arriveMs) {
      if (!still) m.position.lerpVectors(this.fromP, this.meetP, t / S.arriveMs);
    } else if (t < S.fleeMs) {
      if (at(S.arriveMs)) { out.took = true; this.sheet.visible = true; this.play('V_Celebrate'); m.position.copy(this.meetP); m.rotation.y = Math.atan2(this.at.x - m.position.x, this.at.z - m.position.z) + 0.6; this.inkWord('Mine!', m.position.clone().setY(2.2), { h: 0.42, ms: 1200 }); }
      // the copies, one after another, up out of her hands and down all round
      const n = Math.floor(((t - S.throwMs[0]) / (S.throwMs[1] - S.throwMs[0])) * S.copies);
      while (t >= S.throwMs[0] && this.thrown < Math.min(S.copies, n + 1)) this.throwCopy(this.thrown++);
    } else if (t < S.goneMs) {
      if (at(S.fleeMs) || (before < S.fleeMs && t >= S.fleeMs)) { out.flee = true; this.play(still ? 'V_Idle' : 'V_Run'); m.rotation.y = Math.atan2(this.right.x, this.right.z); }
      if (!still) m.position.lerpVectors(this.meetP, this.toP, Math.min(1, ((t - S.fleeMs) / 1000) * S.speed / this.meetP.distanceTo(this.toP)));
    } else {
      out.gone = true;
      this.stop();
    }
    if (t >= S.chaseMs[0] && t < S.chaseMs[1] && !still) out.chase = true;
    return out;
  }
  throwCopy(i) {
    const m = this.model;
    const from = m.position.clone().setY(1.6);
    const a = (i / THIEF_SCENE.copies) * Math.PI * 2 + 0.4;
    const r = 1.3 + 0.9 * ((i * 37) % 10) / 10;
    const to = this.at.clone().add(new THREE.Vector3(Math.cos(a) * r, 0.015 + i * 0.001, Math.sin(a) * r * 0.7 + 0.3));
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), this.paper);
    sheet.userData.noFit = true;
    sheet.name = `DrawingCopy_${i}`;
    this.root.add(sheet);
    this.copies.push(sheet);
    const spin = (i % 2 ? 1 : -1) * (2 + i * 0.3);
    if (this.reducedMotion()) { sheet.position.copy(to); sheet.rotation.set(-Math.PI / 2, 0, a); return; }
    this.tweens.run(900, (k) => {
      sheet.position.lerpVectors(from, to, k);
      sheet.position.y = to.y + (from.y - to.y) * (1 - k) + Math.sin(Math.PI * k) * 1.1;
      sheet.rotation.set(-Math.PI / 2 * k + Math.sin(k * 9) * 0.3 * (1 - k), spin * k, a * k);
    }).then(() => { sheet.position.copy(to); sheet.rotation.set(-Math.PI / 2, 0, a); this.puff?.(to.clone().setY(0.05), { scale: 0.25, seed: i }); });
  }
  stop() {
    this.active = false;
    if (this.model) { this.model.visible = false; for (const a of Object.values(this.acts)) a.stop(); this.sheet.visible = false; }
    // the copies lie a while on the grass, then fade
    const copies = this.copies;
    this.copies = [];
    this.tweens.wait(9000).then(() => this.tweens.run(900, (k) => { for (const c of copies) { c.material = c.material === this.paper ? this.paper.clone() : c.material; c.material.transparent = true; c.material.opacity = 1 - k; } }))
      .then(() => { for (const c of copies) { this.root.remove(c); if (c.material !== this.paper) c.material.dispose(); c.geometry.dispose(); } });
  }
  clearCopies() { for (const c of this.copies) { this.root.remove(c); c.geometry.dispose(); } this.copies = []; }
  cancel() { if (this.active) this.stop(); }
}
