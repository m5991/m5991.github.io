// Camera rig. Follow behaviour ported from the BASE follower `Sr` (app.pretty.js 31509-31601:
// lerp follow), direction from the drawing projection instead of the coop's 45-degree diagonal.
// Modes: 'play' follows Vanessa at a closer zoom; 'whole' is the finale/overview framing that
// fits the whole drawing rectangle with letterboxing and the 4% margin (spec §3, §5).
// `wholeBlend` (0..1) eases the play camera toward the whole-drawing framing: the colour finale
// (spec v0.9 P25-2) eases to the drawing in its first 2 s and back afterwards.
import * as THREE from 'three';
import { fitRect } from './projection.js';

export class CameraRig {
  constructor(proj) {
    this.proj = proj;
    this.camera = proj.makeViewportCamera();
    this.mode = 'play';
    this.focus = new THREE.Vector3();
    this.snap = true;
    this.wholeBlend = 0;
  }

  // Vanessa's on-screen height in gameplay, CSS px (P; tuned for 390x844 / 844x390 phones)
  static gameplayPx(w, h) { return Math.min(110, Math.max(64, 0.1 * Math.max(w, h))); }

  update(dtMs, heroPos, view) {
    const { w, h, top = 0, bottom = 0 } = view;
    const p = this.proj;
    if (this.mode === 'whole') {
      p.frameViewport(this.camera, w, h, fitRect(w, h));
      return;
    }
    const target = new THREE.Vector3(heroPos.x, 0.8 + (heroPos.y ?? 0), heroPos.z);
    const snapped = this.snap;
    if (this.snap) { this.focus.copy(target); this.snap = false; }
    this.focus.lerp(target, 1 - Math.exp(-dtMs / 140));
    const px = this.zoomPx ?? CameraRig.gameplayPx(w, h);
    const vh = p.vanessaHeight * Math.cos(p.pitch);
    const c = this.camera;
    if (p.type === 'perspective') {
      c.fov = p.fov;
      c.aspect = w / h;
      const d = (vh * h) / (2 * Math.tan(THREE.MathUtils.degToRad(p.fov / 2)) * px);
      c.position.copy(p.dir).multiplyScalar(-d).add(this.focus);
    } else {
      const half = (vh * h) / (2 * px);
      Object.assign(c, { left: -half * (w / h), right: half * (w / h), top: half, bottom: -half });
      c.position.copy(p.dir).multiplyScalar(-p.distance).add(this.focus);
    }
    c.up.set(0, 1, 0);
    c.lookAt(this.focus);
    // centre Vanessa in the world region between the HUD bands, easing when a band changes
    // height (the goal line wrapping to another length) instead of jumping
    const want = (top - bottom) / 2;
    if (this.offsetY === undefined || snapped) this.offsetY = want;
    else this.offsetY += (want - this.offsetY) * (1 - Math.exp(-dtMs / 180));
    if (Math.abs(this.offsetY - want) < 0.05) this.offsetY = want;
    let offsetY = this.offsetY;
    const b = Math.max(0, Math.min(1, this.wholeBlend));
    if (b > 0) {
      const t = this.blendCam ??= p.makeViewportCamera();
      p.frameViewport(t, w, h, fitRect(w, h));
      c.position.lerp(t.position, b);
      c.quaternion.slerp(t.quaternion, b);
      if (p.type === 'perspective') c.fov += (t.fov - c.fov) * b;
      else for (const k of ['left', 'right', 'top', 'bottom']) c[k] += (t[k] - c[k]) * b;
      offsetY *= 1 - b;
    }
    if (offsetY) c.setViewOffset(w, h, 0, -offsetY, w, h); else c.clearViewOffset();
    c.near = 0.1;
    c.far = 500;
    c.updateProjectionMatrix();
  }
}
