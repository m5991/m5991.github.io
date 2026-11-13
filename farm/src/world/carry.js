// What Vanessa carries, shown the ad's way (captain, 2026-11-01): one tall stack of the actual
// unit models rising from the top of her head, units flying in from piles and out to the yard
// pile and the yard-sale table, where they pile up or are set out. A readable port
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
const FLY_OUT_MS = 330; // stack -> the yard pile or the table
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
    // v0.12: a sunflower stands upright, its face to the camera (update turns it), so they stack
    // in a tall column like the captain asked
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
  // v0.26: a unit is flying to or from the stack, or popping as it lands (main.js: the full frame budget)
  get busy() { return this.outgoing.length > 0 || this.units.some((u) => u.fly || u.pop >= 0); }
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
  // `delayMs` (the yard drop, P27-1: one unit every 60 ms) keeps the unit riding her stack until
  // its turn, then launches it from where it is then.
  send(res, toWorld, carried, delayMs = 0) {
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
    const to = toWorld.clone();
    if (delayMs > 0) {
      return new Promise((done) => this.outgoing.push({ obj, t: -delayMs, dur: FLY_OUT_MS, from: null, ctrl: null, to, done, local: false, pending: true }));
    }
    return new Promise((done) => this.outgoing.push(this.launch({ obj, t: 0, dur: FLY_OUT_MS, to, done, local: false })));
  }
  // detach an outgoing unit into the world and aim its arc from where it is now
  launch(f) {
    this.worldRoot.attach(f.obj); // keeps its world transform
    const from = f.obj.position.clone();
    const ctrl = from.clone().lerp(f.to, 0.5);
    ctrl.y = Math.max(from.y, f.to.y) + 0.6;
    return this.flight({ ...f, from, ctrl, pending: false });
  }

  // under reduced motion an outgoing flight becomes a fade at its destination (V8)
  flight(f) {
    if (!this.reduced) return f;
    setFade(f.obj, 0);
    f.obj.position.copy(f.to);
    return { ...f, dur: Math.min(f.dur, REDUCED_FADE_MS), fade: true };
  }

  // a unit's turn about the stack's axis: its small hand-placed twist; a sunflower (v0.12) turns
  // against her facing so its face stays toward the camera, whichever way she runs
  spin(u) { return u.res === 'S' ? -(this.yaw ?? 0) + u.jitter * 0.25 : u.jitter; }

  // world position of the stack's top (for the count badge)
  topWorld(target = new THREE.Vector3()) {
    const h = slotHeights(this.units.map((u) => u.res));
    const y = h.length ? h.at(-1) + UNIT_DY[this.units.at(-1).res] : 0;
    return this.root.localToWorld(target.set(this.local.x * bendAt(y), y + 0.12, this.local.y * bendAt(y)));
  }

  // dtMs; vx, vz: her world velocity (m/s); yaw: her facing
  update(dtMs, { vx = 0, vz = 0, yaw = 0, reducedMotion = false } = {}) {
    const dt = dtMs / 1000;
    this.yaw = yaw;
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
          u.obj.rotation.set(0, this.spin(u), 0);
          setFade(u.obj, t);
          if (t >= 1) { clearFade(u.obj); u.fly = null; u.y = heights[i]; this.onLand?.(u.res); }
          continue;
        }
        const ctrl = this.tmp2.copy(u.fly.from).lerp(end, 0.5);
        ctrl.y = Math.max(u.fly.from.y, end.y) + 1.2;
        bezier(u.fly.from, ctrl, end, inOut(t), u.obj.position);
        u.obj.rotation.set(0, this.spin(u) + (1 - t) * 4, 0);
        if (t >= 1) { u.fly = null; u.y = heights[i]; u.pop = 0; this.onLand?.(u.res); }
        continue;
      }
      u.y += (heights[i] - u.y) * k;
      const bb = bendAt(u.y);
      u.obj.position.set(this.local.x * bb, u.y + half, this.local.y * bb);
      // each unit tilts with the bend (its slope), plus a small hand-placed twist
      const slope = 1.6 * (bb / Math.max(0.05, u.y + half));
      u.obj.rotation.set(this.local.y * slope * 0.6, this.spin(u), -this.local.x * slope * 0.6);
      if (u.pop >= 0) {
        u.pop += dt;
        u.obj.scale.setScalar(this.scale * (reducedMotion ? 1 : popScale(u.pop)));
        if (u.pop > 0.4) { u.pop = -1; u.obj.scale.setScalar(this.scale); }
      }
    }
    for (let i = this.outgoing.length - 1; i >= 0; i--) {
      let f = this.outgoing[i];
      f.t += dtMs;
      if (f.t < 0) continue;
      if (f.pending) { f = this.outgoing[i] = this.launch(f); }
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

// ---------- piles of units: the yard pile, the yard-sale table's goods ----------
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
      if (!res) { if (s) freeUnit(s.obj); this.slots[i] = undefined; continue; } // an empty place (v0.13: a good a buyer took)
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

  // v0.26: a unit that has just landed is still popping
  get busy() { return this.slots.some((s) => s && s.pop >= 0); }
  update(dtMs, reducedMotion = false) {
    for (const s of this.slots) {
      if (!s || s.pop < 0) continue;
      s.pop += dtMs / 1000;
      s.obj.scale.setScalar(this.scale * (reducedMotion ? 1 : popScale(s.pop)));
      if (s.pop > 0.4) { s.pop = -1; s.obj.scale.setScalar(this.scale); }
    }
  }
}

// v0.11 (P27-1): the yard pile by the house. Logs crib-stacked on the left in crossing layers of
// four (24 drawn: six layers), stones in a low cairn on the right (18 drawn: a ring of eight round
// one, then five, two and one on top), each hand-placed with a slight jitter (V3). Pile space:
// the patch is about 1.0 x 0.7 m, +Z faces the camera.
const CAIRN = [
  [0, 0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * 0.785 + 0.3) * 0.15, Math.sin(i * 0.785 + 0.3) * 0.11, 0]),
  [0, 0, 1], ...Array.from({ length: 5 }, (_, i) => [Math.cos(i * 1.257) * 0.075, Math.sin(i * 1.257) * 0.055, 1]),
  [0.04, 0.0, 2], [-0.04, 0.01, 2], [0, 0, 3],
];
export function yardSlot(res, k) {
  const j = (n) => (((k * 37 + n * 11) % 13) / 13 - 0.5);
  if (res === 'W') {
    const layer = Math.floor(k / 4);
    const i = (k % 4) - 1.5;
    const y = 0.065 + layer * 0.072;
    return layer % 2 === 0
      ? [-0.22 + i * 0.105 + j(1) * 0.012, y, j(2) * 0.03, Math.PI / 2 + j(3) * 0.08] // along Z
      : [-0.22 + j(1) * 0.03, y, i * 0.105 + j(2) * 0.012, j(3) * 0.08]; // across, along X
  }
  if (res === 'R') {
    const [x, z, layer] = CAIRN[k % CAIRN.length];
    return [0.28 + x + j(1) * 0.015, 0.05 + layer * 0.075 + Math.floor(k / CAIRN.length) * 0.3, z + j(2) * 0.015, k * 1.7];
  }
  return [0, 0, 0, 0];
}

// v0.12: the yard-sale table's goods, laid out on its cloth in two rows of three (table space;
// its top is at 0.65 m, +Z faces the camera), a little askew so they read as set out by hand
export const TABLE_SHOWN = 6;
const GOODS_AT = [[-0.3, -0.1], [0, -0.11], [0.3, -0.09], [-0.31, 0.13], [0.01, 0.12], [0.3, 0.14]];
// v0.14 (captain: "the last stage to not have maximum on produce being left in the tables (either
// it keeps piling or simply is there not rendered)"): with all four tables standing, the goods
// keep piling: each further six on a table lie in a layer on top of the last, drawn a little
// narrower so the heap rounds off, TABLE_LAYERS deep; any more are counted (and sold) but not drawn
export const TABLE_LAYERS = 3;
const LAYER_H = 0.1;
export function tableSlot(res, k, i) {
  const [x, z] = GOODS_AT[i % GOODS_AT.length];
  const lift = res === 'S' ? 0.17 : res === 'T' ? 0.075 : 0.07;
  const layer = Math.min(TABLE_LAYERS - 1, Math.floor(i / GOODS_AT.length));
  const narrow = 1 - 0.22 * layer;
  const j = layer ? (((i * 37) % 11) / 11 - 0.5) * 0.04 : 0; // a hand-set jitter on the heap
  return [x * narrow + j, 0.62 + lift + layer * LAYER_H, z * narrow - j * 0.5, (i * 0.7) % 1.2 - 0.6];
}
// v0.25: the crop crate's heap (crate space; its floor at 0.03 m, its rim at 0.32 m): the first
// six crops lie on its floor in two rows of three, the next six on top of them, the next four
// heaped over its rim; CRATE_SHOWN are drawn, and the count beside it says how many there are
export const CRATE_SHOWN = 16;
const CRATE_AT = [[-0.18, -0.09], [0, -0.1], [0.18, -0.08], [-0.17, 0.09], [0.01, 0.1], [0.18, 0.09]];
const CRATE_TOP = [[-0.1, -0.04], [0.09, -0.05], [-0.08, 0.07], [0.1, 0.06]];
export function crateSlot(res, k, i) {
  const n = Math.min(i, CRATE_SHOWN - 1);
  const lift = res === 'S' ? 0.05 : 0.02;
  const j = (((n * 37) % 11) / 11 - 0.5) * 0.03;
  if (n >= 12) { const [x, z] = CRATE_TOP[n - 12]; return [x + j, 0.3 + lift, z - j, (n * 0.9) % 1.4 - 0.7]; }
  const [x, z] = CRATE_AT[n % 6];
  return [x + (n >= 6 ? j : 0), 0.07 + lift + Math.floor(n / 6) * 0.115, z, (n * 0.7) % 1.2 - 0.6];
}
// where the i-th good set out (in table order) lies when `n` tables stand: the table it is on and
// its place there. Six to a table across all the tables, then (four tables only) the next layer
// across them again; null when it is past what is drawn
export function tableSpot(i, n, unlimited = false) {
  const layerSize = TABLE_SHOWN * n;
  const layer = Math.floor(i / layerSize);
  if (layer >= (unlimited ? TABLE_LAYERS : 1)) return null;
  const w = i % layerSize;
  return { k: Math.floor(w / TABLE_SHOWN), i: layer * TABLE_SHOWN + (w % TABLE_SHOWN) };
}
export const tableDrawn = (n, unlimited = false) => TABLE_SHOWN * n * (unlimited ? TABLE_LAYERS : 1);
