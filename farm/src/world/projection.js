// One authored projection from the drawing plane (u, v in 0..100, origin upper-left) to the
// ground (spec §3; annex §F.1). The finale camera is fixed first, then every ground anchor is
// inverse-projected through it onto y = 0. Sky elements are camera-facing layers placed on a
// backdrop plane behind the horizon. Gameplay uses the same camera direction, closer, following
// Vanessa. Camera type, pitch and field of view are the tuning knobs (`?cam=persp|ortho`,
// `?pitch=`, `?fov=`); per-object scale is solved from each object's drawn extent.
import * as THREE from 'three';

export const DRAWING_ASPECT = 1280 / 1064; // the photographed drawing, about 1.20:1
export const MARGIN = 0.04; // 4% safety margin around the fitted composition (spec §3)
export const VANESSA_SHARE = 0.16; // D17 finale height as a share of the composition (14-18%)
export const VANESSA_FEET = { u: 56, v: 81 }; // D17 roughly u53-59 / v65-81
export const HORIZON_V = 38.5; // D23 irregular horizon v37-40

export const PRESETS = {
  // chosen in the slice: low pitch, wide lens, so drawing-fitted objects keep plausible 3D sizes
  persp: { type: 'perspective', pitchDeg: 20, fovDeg: 50 },
  ortho: { type: 'orthographic', pitchDeg: 20, fovDeg: null },
};

// Composition rectangle (CSS px) inside a viewport, letterboxed with the 4% margin.
export function fitRect(w, h) {
  const aw = w * (1 - 2 * MARGIN);
  const ah = h * (1 - 2 * MARGIN);
  let rw = aw;
  let rh = rw / DRAWING_ASPECT;
  if (rh > ah) { rh = ah; rw = rh * DRAWING_ASPECT; }
  return { x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh };
}

const ndc = (u, v) => new THREE.Vector2((u / 100) * 2 - 1, 1 - (v / 100) * 2);
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export class Projection {
  // vanessaHeight: measured height of the loaded Vanessa model in metres
  constructor({ type, pitchDeg, fovDeg }, vanessaHeight) {
    this.type = type;
    this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.fov = fovDeg;
    this.vanessaHeight = vanessaHeight;
    this.dir = new THREE.Vector3(0, -Math.sin(this.pitch), -Math.cos(this.pitch)); // looks toward -Z
    this.camera = this.type === 'perspective'
      ? new THREE.PerspectiveCamera(fovDeg, DRAWING_ASPECT, 0.1, 500)
      : new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    this.solve();
  }

  // Place the composition camera so it looks at the ground origin (the drawing centre) and a
  // Vanessa of the measured height standing at her drawn feet spans 16% of the composition.
  solve() {
    if (this.type === 'orthographic') {
      this.size = (this.vanessaHeight * Math.cos(this.pitch)) / VANESSA_SHARE; // world height of the view
      this.distance = 60;
      this._apply();
      return;
    }
    let lo = 1;
    let hi = 400;
    for (let i = 0; i < 60; i++) {
      this.distance = (lo + hi) / 2;
      this._apply();
      const share = this.shareOf(this.groundAt(VANESSA_FEET.u, VANESSA_FEET.v), this.vanessaHeight);
      if (share > VANESSA_SHARE) lo = this.distance; else hi = this.distance;
    }
  }

  // Refine the solve against the real model (cap brim and toes add depth on screen): place it
  // with its feet at the D17 anchor and scale the camera until its projected extent is 16%.
  refine(model) {
    for (let i = 0; i < 12; i++) {
      this.groundAt(VANESSA_FEET.u, VANESSA_FEET.v, model.position);
      model.updateMatrixWorld(true);
      const e = projectedExtent(this, model);
      const share = (e.bottom - e.top) / 100;
      if (Math.abs(share - VANESSA_SHARE) < 1e-4) break;
      if (this.type === 'orthographic') this.size *= share / VANESSA_SHARE;
      else this.distance *= share / VANESSA_SHARE;
      this._apply();
    }
    return this;
  }

  _apply() {
    const c = this.camera;
    c.position.copy(this.dir).multiplyScalar(-this.distance);
    c.up.set(0, 1, 0);
    c.lookAt(0, 0, 0);
    if (this.type === 'orthographic') {
      const h = this.size / 2;
      Object.assign(c, { left: -h * DRAWING_ASPECT, right: h * DRAWING_ASPECT, top: h, bottom: -h });
    }
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
  }

  // drawing (u, v) -> point on the ground plane
  groundAt(u, v, target = new THREE.Vector3()) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc(u, v), this.camera);
    const hit = ray.ray.intersectPlane(GROUND, target);
    if (!hit) throw new Error(`(${u}, ${v}) does not reach the ground with this camera`);
    return hit;
  }

  // drawing (u, v) -> point on a vertical backdrop plane at depth z (sky layers)
  backdropAt(u, v, z, target = new THREE.Vector3()) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc(u, v), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);
    return ray.ray.intersectPlane(plane, target);
  }

  // world point -> drawing (u, v) through the composition camera
  toDrawing(p) {
    const q = p.clone().project(this.camera);
    return { u: (q.x + 1) * 50, v: (1 - q.y) * 50 };
  }

  // share of the composition height spanned by a vertical segment standing at `base`
  shareOf(base, height) {
    const a = this.toDrawing(base);
    const b = this.toDrawing(base.clone().add(new THREE.Vector3(0, height, 0)));
    return (a.v - b.v) / 100;
  }

  // metres per drawing unit along u at a ground point (for walking-speed reporting)
  metresPerU(u, v) {
    return this.groundAt(u + 0.5, v).distanceTo(this.groundAt(u - 0.5, v));
  }

  // Configure a viewport camera with the same projection, scaled so the composition rectangle
  // `rect` (CSS px) of a `w` x `h` viewport shows exactly the composition. `zoom` > 1 moves in
  // toward `focus` (gameplay); `offsetY` shifts the image centre (CSS px, positive = down).
  frameViewport(cam, w, h, rect, { zoom = 1, focus = null, offsetY = 0 } = {}) {
    const k = h / rect.h; // viewport height in composition heights
    const target = focus ?? new THREE.Vector3();
    if (this.type === 'perspective') {
      const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(this.fov / 2)) * k);
      cam.fov = THREE.MathUtils.radToDeg(half * 2);
      cam.aspect = w / h;
      cam.position.copy(this.dir).multiplyScalar(-this.distance / zoom).add(target);
    } else {
      const half = (this.size / 2) * k / zoom;
      Object.assign(cam, { left: -half * (w / h), right: half * (w / h), top: half, bottom: -half });
      cam.position.copy(this.dir).multiplyScalar(-this.distance).add(target);
    }
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    if (offsetY) cam.setViewOffset(w, h, 0, -offsetY, w, h); else cam.clearViewOffset();
    cam.near = 0.1;
    cam.far = 500;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }

  makeViewportCamera() {
    return this.type === 'perspective' ? new THREE.PerspectiveCamera(this.fov, 1, 0.1, 500) : new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  }

  describe() {
    const feet = this.groundAt(VANESSA_FEET.u, VANESSA_FEET.v);
    const far = this.groundAt(50, HORIZON_V);
    const near = this.groundAt(50, 100);
    return {
      type: this.type,
      pitchDeg: THREE.MathUtils.radToDeg(this.pitch),
      fovDeg: this.fov,
      cameraHeight: +this.camera.position.y.toFixed(2),
      cameraDistance: +this.distance.toFixed(2),
      vanessaHeight: +this.vanessaHeight.toFixed(3),
      groundDepthM: +far.distanceTo(near).toFixed(2),
      widthAtVanessaM: +this.groundAt(0, VANESSA_FEET.v).distanceTo(this.groundAt(100, VANESSA_FEET.v)).toFixed(2),
      widthAtHorizonM: +this.groundAt(0, HORIZON_V).distanceTo(this.groundAt(100, HORIZON_V)).toFixed(2),
      feet: feet.toArray().map((n) => +n.toFixed(2)),
    };
  }
}

// Solve a uniform scale and ground position so an object's projected extent spans its drawn
// vertical extent [vTop, vBottom] with its base centred at u (per-object scale override).
// `measure(obj)` returns projected {top, bottom} in drawing v of the object's geometry.
export function fitToDrawing(proj, obj, { u, vTop, vBottom }, { scale = true, iterations = 6 } = {}) {
  obj.scale.setScalar(1);
  let v = vBottom;
  for (let i = 0; i < iterations; i++) {
    proj.groundAt(u, v, obj.position);
    obj.updateMatrixWorld(true);
    let ext = projectedExtent(proj, obj);
    if (scale) {
      const s = obj.scale.x * (vBottom - vTop) / Math.max(1e-6, ext.bottom - ext.top);
      obj.scale.setScalar(s);
      obj.updateMatrixWorld(true);
      ext = projectedExtent(proj, obj);
    }
    v += vBottom - ext.bottom;
  }
  proj.groundAt(u, v, obj.position);
  obj.updateMatrixWorld(true);
  return projectedExtent(proj, obj);
}

const _v = new THREE.Vector3();
export function projectedExtent(proj, obj) {
  let top = Infinity; let bottom = -Infinity; let left = Infinity; let right = -Infinity;
  obj.updateMatrixWorld(true);
  obj.traverse((m) => {
    if (!m.isMesh || m.userData.noFit || !visibleChain(m, obj)) return;
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      m.getVertexPosition(i, _v).applyMatrix4(m.matrixWorld); // skinning, morphs and quantization applied
      const d = proj.toDrawing(_v);
      top = Math.min(top, d.v); bottom = Math.max(bottom, d.v);
      left = Math.min(left, d.u); right = Math.max(right, d.u);
    }
  });
  return { top, bottom, left, right };
}

function visibleChain(m, root) {
  for (let o = m; o; o = o.parent) {
    if (!o.visible) return false;
    if (o === root) return true;
  }
  return true;
}
