// What Vanessa carries, shown the ad's way (captain, 2026-11-01): one tall stack of the actual
// unit models rising from the top of her head, units flying in from piles and out to mats and
// the market crate, and the paid-in units piling up where they were delivered. A readable port
// of the BASE patterns, no captured code: the metastack `Do` (summed unit heights, gap closing,
// a refusal when full), the hero's stack on its back (`nl`, stacks child at the upper back), and
// the flights `th`/`dl` (a curve from the unit's place through a point raised above the
// midpoint to its slot, computed in the stack's own space so it follows a running hero). The
// BASE carried its stack on the hero's back; here it sits on her head so that, at this game's
// low follow camera, it never covers her face or body.
// Presentation only: the ledger owns every count; `sync` reconciles to it every frame.
import * as THREE from 'three';
import { addOutline, unitMesh } from './greybox.js';
import {
  bendAt, MAX_CAP, popScale, slotHeights, springStep, STACK_BACK_Z, STACK_BASE_Y, STACK_ORDER, stackUnits, swayTarget, UNIT_DY,
} from './stackmath.js';

const FLY_IN_MS = 340; // pile -> stack (the BASE flight time was 300 ms)
const FLY_OUT_MS = 330; // stack -> mat or crate
// reduced motion (V8): no arc and no travel; a unit fades in where it lands within this time
export const REDUCED_FADE_MS = 150;
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const out = (t) => 1 - (1 - t) ** 2;
const bezier = (a, c, b, t, target) => target.set(
  (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
  (1 - t) ** 2 * a.z + 2 * (1 - t) * t * c.z + t * t * b.z,
);

// ---------- unit models: the shared carried-unit meshes, laid flat for stacking ----------
function makeUnit(res) {
  const g = new THREE.Group();
  g.name = `unit:${res}`;
  let m;
  if (res === 'coins') m = unitMesh('coins');
  else {
    m = unitMesh(res);
    if (res === 'S') m.rotation.set(-Math.PI / 2 * 0.8, 0, 0); // a flower head facing up
  }
  g.add(m);
  addOutline(g, 0.008);
  g.traverse((o) => { if (o.isMesh && !o.userData.outline) o.castShadow = true; });
  g.userData.res = res;
  return g;
}
const pool = new Map(); // res -> [Group]; units are reused, never rebuilt per pickup
function takeUnit(res) {
  const u = pool.get(res)?.pop() ?? makeUnit(res);
  u.visible = true;
  u.position.set(0, 0, 0);
  u.rotation.set(0, 0, 0);
  u.scale.setScalar(1);
  return u;
}
// per-unit opacity for a reduced-motion fade: pooled units share cached materials, so a fading
// unit gets its own transparent copies, and `clearFade` puts the shared ones back
function setFade(obj, opacity) {
  obj.traverse((o) => {
    if (!o.material) return;
    if (!o.userData.baseMat) {
      o.userData.baseMat = o.material;
      o.material = o.material.clone();
      o.material.transparent = true;
    }
    o.material.opacity = opacity;
  });
}
function clearFade(obj) {
  obj.traverse((o) => {
    if (!o.userData.baseMat) return;
    o.material.dispose();
    o.material = o.userData.baseMat;
    delete o.userData.baseMat;
  });
}
function freeUnit(u) {
  clearFade(u);
  u.removeFromParent();
  const list = pool.get(u.userData.res) ?? [];
  list.push(u);
  pool.set(u.userData.res, list);
}

// ---------- the stack over her head ----------
export class CarryStack {
  // parent: Vanessa's view root (turns with her); worldRoot: where outgoing units fly;
  // anchor: the bone at the top of her head. The stack rides its position (the step bounce, the
  // bow while she gathers) but stays upright: a tall stack tilting with her head would whip.
  constructor({ parent, worldRoot, anchor = null, scale = 1.5 }) {
    this.root = new THREE.Group();
    this.root.name = 'CarryStack';
    this.root.position.set(0, STACK_BASE_Y, STACK_BACK_Z);
    parent.add(this.root);
    this.worldRoot = worldRoot;
    this.anchor = anchor;
    this.scale = scale;
    this.units = []; // { res, obj, y, pop, fly: { t, dur, from } | null, jitter }
    this.outgoing = []; // { obj, t, dur, from, ctrl, to, done }
    this.sway = { x: 0, z: 0, vx: 0, vz: 0 };
    this.local = new THREE.Vector2(); // the top's sway offset in the stack's own space
    this.cap = MAX_CAP;
    this.hidden = 0;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.reduced = false; // reduced motion, as of the last update: new flights fade instead
    this.onLand = null; // (res) -> void: a unit arrived on the stack (the pickup pop sound)
  }

  get count() { return this.units.length; }
  countOf(res) { let n = 0; for (const u of this.units) if (u.res === res) n++; return n; }

  // insert a unit of `res` above the others of its kind, keeping the bottom-to-top order
  insert(res, from = null, delayMs = 0) {
    const rank = STACK_ORDER.indexOf(res);
    let at = this.units.findIndex((u) => STACK_ORDER.indexOf(u.res) > rank);
    if (at < 0) at = this.units.length;
    const obj = takeUnit(res);
    obj.scale.setScalar(this.scale);
    this.root.add(obj);
    const heights = slotHeights(this.units.map((u) => u.res));
    const y = at < heights.length ? heights[at] : heights.length ? heights.at(-1) + UNIT_DY[this.units.at(-1).res] : 0;
    const fade = !!from && this.reduced;
    const u = { res, obj, y, pop: from ? -1 : 0, fly: from ? { t: -delayMs, dur: fade ? REDUCED_FADE_MS : FLY_IN_MS, from: from.clone(), fade } : null, jitter: (Math.random() - 0.5) * 0.36 };
    if (from) obj.position.copy(from);
    if (fade) setFade(obj, 0);
    this.units.splice(at, 0, u);
    return u;
  }

  // the topmost unit of `res` leaves the stack; returns it, detached from the list
  takeTop(res) {
    for (let i = this.units.length - 1; i >= 0; i--) {
      if (this.units[i].res === res) return this.units.splice(i, 1)[0];
    }
    return null;
  }

  // Reconcile with the ledger's carried counts without flights (load, refunds settled, debug):
  // missing units pop on in their slots, extra ones are put away.
  sync(carried) {
    const want = stackUnits(carried, this.cap);
    this.hidden = want.hidden;
    for (const res of STACK_ORDER) {
      const need = want.units.filter((r) => r === res).length;
      let have = this.countOf(res);
      while (have < need) { this.insert(res); have++; }
      while (have > need) { freeUnit(this.takeTop(res).obj); have--; }
    }
  }

  // A unit just joined the ledger's carried count: fly it from `fromWorld` into its slot.
  // `carried` is the ledger count after the pick. Over the visual cap the unit flies to the top
  // and merges into the count badge instead.
  receive(res, fromWorld, carried, delayMs = 0) {
    this.root.updateWorldMatrix(true, false);
    const from = this.root.worldToLocal(this.tmp.copy(fromWorld));
    const want = stackUnits(carried, this.cap);
    this.hidden = want.hidden;
    if (want.units.filter((r) => r === res).length > this.countOf(res)) {
      this.insert(res, from, delayMs);
      return;
    }
    // over the cap: a transient unit flies to the top and is put away on arrival
    const obj = takeUnit(res);
    obj.scale.setScalar(this.scale);
    this.root.add(obj);
    obj.position.copy(from);
    const top = slotHeights(this.units.map((u) => u.res));
    const h = top.length ? top.at(-1) + 0.1 : 0;
    this.outgoing.push(this.flight({ obj, t: -delayMs, dur: FLY_IN_MS, from: from.clone(), ctrl: from.clone().lerp(new THREE.Vector3(0, h, 0), 0.5).add(new THREE.Vector3(0, 1.2, 0)), to: new THREE.Vector3(0, h, 0), done: null, local: true, res }));
  }

  // A unit just left the ledger's carried count: fly it from the stack to `toWorld`. Resolves
  // when it lands. `carried` is the count after the transfer.
  send(res, toWorld, carried) {
    const want = stackUnits(carried, this.cap);
    this.hidden = want.hidden;
    let obj;
    if (this.countOf(res) > want.units.filter((r) => r === res).length) obj = this.takeTop(res).obj;
    else { // over the cap: one comes off the top of the drawn stack
      obj = takeUnit(res);
      obj.scale.setScalar(this.scale);
      this.root.add(obj);
      const top = slotHeights(this.units.map((u) => u.res));
      obj.position.set(0, top.length ? top.at(-1) : 0, 0);
    }
    this.worldRoot.attach(obj); // keeps its world transform
    const from = obj.position.clone();
    const to = toWorld.clone();
    const ctrl = from.clone().lerp(to, 0.5);
    ctrl.y = Math.max(from.y, to.y) + 0.6;
    return new Promise((done) => this.outgoing.push(this.flight({ obj, t: 0, dur: FLY_OUT_MS, from, ctrl, to, done, local: false })));
  }

  // under reduced motion an outgoing flight becomes a fade at its destination (V8)
  flight(f) {
    if (!this.reduced) return f;
    setFade(f.obj, 0);
    f.obj.position.copy(f.to);
    return { ...f, dur: Math.min(f.dur, REDUCED_FADE_MS), fade: true };
  }

  // world position of the stack's top (for the count badge)
  topWorld(target = new THREE.Vector3()) {
    const h = slotHeights(this.units.map((u) => u.res));
    const y = h.length ? h.at(-1) + UNIT_DY[this.units.at(-1).res] : 0;
    return this.root.localToWorld(target.set(this.local.x * bendAt(y), y + 0.12, this.local.y * bendAt(y)));
  }

  // dtMs; vx, vz: her world velocity (m/s); yaw: her facing
  update(dtMs, { vx = 0, vz = 0, yaw = 0, reducedMotion = false } = {}) {
    const dt = dtMs / 1000;
    this.reduced = reducedMotion;
    // sway: a damped spring in world space trailing her velocity, read in the stack's space
    if (reducedMotion) Object.assign(this.sway, { x: 0, z: 0, vx: 0, vz: 0 });
    else for (let s = 0; s < dt; s += 1 / 120) springStep(this.sway, swayTarget(vx, vz), Math.min(1 / 120, dt - s));
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    this.local.set(this.sway.x * c - this.sway.z * sn, this.sway.x * sn + this.sway.z * c);
    if (this.anchor) {
      this.anchor.updateWorldMatrix(true, false);
      const p = this.root.parent.worldToLocal(this.anchor.getWorldPosition(this.tmp));
      this.root.position.set(p.x, p.y, p.z + STACK_BACK_Z);
    }

    const heights = slotHeights(this.units.map((u) => u.res));
    const k = 1 - Math.exp(-dtMs / 45); // gap closing (BASE lerp 0.2 per update)
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      const half = UNIT_DY[u.res] / 2;
      const b = bendAt(heights[i]);
      const end = this.tmp.set(this.local.x * b, heights[i] + half, this.local.y * b);
      if (u.fly) {
        u.fly.t += dtMs;
        if (u.fly.t < 0) continue; // waiting its turn on the mat (refunds)
        const t = Math.min(1, u.fly.t / u.fly.dur);
        if (u.fly.fade) { // reduced motion: in its slot, fading in
          u.obj.position.copy(end);
          u.obj.rotation.set(0, u.jitter, 0);
          setFade(u.obj, t);
          if (t >= 1) { clearFade(u.obj); u.fly = null; u.y = heights[i]; this.onLand?.(u.res); }
          continue;
        }
        const ctrl = this.tmp2.copy(u.fly.from).lerp(end, 0.5);
        ctrl.y = Math.max(u.fly.from.y, end.y) + 1.2;
        bezier(u.fly.from, ctrl, end, inOut(t), u.obj.position);
        u.obj.rotation.set(0, u.jitter + (1 - t) * 4, 0);
        if (t >= 1) { u.fly = null; u.y = heights[i]; u.pop = 0; this.onLand?.(u.res); }
        continue;
      }
      u.y += (heights[i] - u.y) * k;
      const bb = bendAt(u.y);
      u.obj.position.set(this.local.x * bb, u.y + half, this.local.y * bb);
      // each unit tilts with the bend (its slope), plus a small hand-placed twist
      const slope = 1.6 * (bb / Math.max(0.05, u.y + half));
      u.obj.rotation.set(this.local.y * slope * 0.6, u.jitter, -this.local.x * slope * 0.6);
      if (u.pop >= 0) {
        u.pop += dt;
        u.obj.scale.setScalar(this.scale * (reducedMotion ? 1 : popScale(u.pop)));
        if (u.pop > 0.4) { u.pop = -1; u.obj.scale.setScalar(this.scale); }
      }
    }
    for (let i = this.outgoing.length - 1; i >= 0; i--) {
      const f = this.outgoing[i];
      f.t += dtMs;
      if (f.t < 0) continue;
      const t = Math.min(1, f.t / f.dur);
      // reduced motion: at its destination, fading in (into the badge: in and out)
      if (f.fade) setFade(f.obj, f.local ? Math.sin(Math.PI * t) : t);
      else {
        bezier(f.from, f.ctrl, f.to, f.local ? inOut(t) : out(t), f.obj.position);
        f.obj.rotation.y += dt * 9;
      }
      if (t >= 1) {
        this.outgoing.splice(i, 1);
        freeUnit(f.obj);
        if (f.local) this.onLand?.(f.res); // over the cap: it reached the top of the stack
        f.done?.();
      }
    }
  }
}

// ---------- piles of delivered units: on a mat, in the market crate ----------
// slotAt(res, k, i) -> [x, y, z, rotY] in the pile's space for the k-th unit of `res`, the
// i-th overall. `set` shows a list of unit types, popping in the ones that are new.
export class UnitPile {
  constructor(parent, slotAt, scale = 1.35) {
    this.group = new THREE.Group();
    this.group.name = 'UnitPile';
    parent.add(this.group);
    this.slotAt = slotAt;
    this.scale = scale;
    this.slots = []; // { res, obj, pop }
  }

  set(types, { pop = true } = {}) {
    const seen = {};
    for (let i = 0; i < Math.max(types.length, this.slots.length); i++) {
      const res = types[i];
      const s = this.slots[i];
      if (!res) { freeUnit(s.obj); continue; }
      const k = (seen[res] = (seen[res] ?? -1) + 1);
      if (s && s.res === res) continue;
      if (s) freeUnit(s.obj);
      const obj = takeUnit(res);
      const [x, y, z, ry] = this.slotAt(res, k, i);
      obj.position.set(x, y, z);
      obj.rotation.y = ry;
      obj.scale.setScalar(this.scale);
      this.group.add(obj);
      this.slots[i] = { res, obj, pop: pop ? 0 : -1 };
    }
    this.slots.length = types.length;
  }

  // world position where the k-th unit of `res` will sit (a flight's target)
  slotWorld(res, k, i, target = new THREE.Vector3()) {
    const [x, y, z] = this.slotAt(res, k, i);
    this.group.updateWorldMatrix(true, false);
    return this.group.localToWorld(target.set(x, y, z));
  }

  update(dtMs, reducedMotion = false) {
    for (const s of this.slots) {
      if (s.pop < 0) continue;
      s.pop += dtMs / 1000;
      s.obj.scale.setScalar(this.scale * (reducedMotion ? 1 : popScale(s.pop)));
      if (s.pop > 0.4) { s.pop = -1; s.obj.scale.setScalar(this.scale); }
    }
  }
}

// A mat's pile, kept toward the pad's rim so Vanessa standing on the mat hides little of it:
// wood logs crossing in layers on the left, stones heaped on the right, a coin tower at the
// front, nearest the camera (units in mat space; the pad has radius 0.62, +Z faces the camera).
const STONE_AT = [[0.32, 0.06], [0.44, -0.08], [0.3, -0.14], [0.42, 0.16], [0.36, 0.0], [0.26, 0.2]];
export function matSlot(res, k) {
  if (res === 'W') {
    const layer = Math.floor(k / 2);
    const side = (k % 2) - 0.5;
    return layer % 2 === 0 ? [-0.36, 0.05 + layer * 0.075, side * 0.15, Math.PI / 2] : [-0.36 + side * 0.15, 0.05 + layer * 0.075, 0, 0];
  }
  if (res === 'R') {
    const [x, z] = STONE_AT[k % STONE_AT.length];
    return [x, 0.07 + Math.floor(k / STONE_AT.length) * 0.1, z, k * 1.3];
  }
  return [0.0, 0.012 + k * 0.022, 0.4, k * 0.4]; // coins
}
// The crate: crops laid in a 4 x 3 grid on its top, in layers (crate space; top at 0.5 m).
export const CRATE_SHOWN = 12;
export function crateSlot(res, k, i) {
  const layer = Math.floor(i / 12);
  const j = i % 12;
  return [-0.27 + (j % 4) * 0.18, 0.56 + layer * 0.08, -0.16 + Math.floor(j / 4) * 0.16, (j % 3) * 0.3];
}
