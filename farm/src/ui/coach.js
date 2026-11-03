// Coach layer for the first-actions guide (game/tutorial.js decides what to say; this only
// presents it). Paper-and-ink DOM over the canvas, never interactive (pointer-events: none):
// - an arrow that bobs above the target, or sits on the edge of the play area pointing toward
//   it when the target is off screen;
// - a short prompt pill in the status slot above the control band;
// - a pointing hand: a drag demo on a ghost stick for "drag anywhere", or over the context
//   button for "open the delivery".
// Every part fades in and out over 200 ms; reduced motion drops the bob and pulse (styles.css).

const EDGE = 28; // px: the edge arrow keeps this far inside the play area

// Where the arrow goes for a target at screen point p in a play rectangle r (both CSS px).
// -> { x, y, angle } with the arrow's tip at (x, y); angle 0 points down, clockwise radians.
// On screen the arrow hangs above the target; off screen (or behind the camera) it is clamped to
// the rectangle's edge along the line from the rectangle's centre and turned toward the target.
export function arrowPlacement(p, r) {
  const inside = p.front && p.x >= r.left + EDGE && p.x <= r.right - EDGE && p.y >= r.top + EDGE * 2 && p.y <= r.bottom - EDGE;
  if (inside) return { x: p.x, y: p.y, angle: 0, edge: false };
  const cx = (r.left + r.right) / 2;
  const cy = (r.top + r.bottom) / 2;
  let dx = p.x - cx;
  let dy = p.y - cy;
  if (!p.front) { dx = -dx; dy = -dy; } // behind the camera the projection is mirrored
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) dy = 1;
  const hw = (r.right - r.left) / 2 - EDGE;
  const hh = (r.bottom - r.top) / 2 - EDGE;
  const k = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy)));
  return { x: cx + dx * k, y: cy + dy * k, angle: Math.atan2(-dx, dy), edge: true };
}

export function createCoach(root = document) {
  const $ = (id) => root.getElementById(id);
  const arrow = $('coach-arrow');
  const tip = $('coach-tip');
  const tipText = tip.querySelector('.text');
  const hand = $('coach-hand');
  const demo = $('coach-demo');
  const context = $('context');
  const toggle = (el, on) => { if (el.classList.contains('on') !== on) el.classList.toggle('on', on); };
  // v0.11: the crop choice shows three arrows at once, one per patch in its crop's colour; the
  // extra two are copies of the guide's arrow, made on first use
  const all = [arrow];
  const arrowEl = (i) => {
    while (all.length <= i) {
      const c = arrow.cloneNode(true);
      c.removeAttribute('id');
      c.classList.remove('on');
      arrow.after(c);
      all.push(c);
    }
    return all[i];
  };
  const place = (el, a) => {
    toggle(el, !!a);
    if (!a) return;
    el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) rotate(${a.angle.toFixed(3)}rad)`;
    el.classList.toggle('edge', a.edge);
    const path = el.querySelector('path');
    const fill = a.colour ?? '';
    if (path.style.fill !== fill) path.style.fill = fill;
    el.classList.toggle('crop', !!a.colour);
  };

  return {
    // placement from arrowPlacement, or null to hide
    arrow(a) { this.arrows(a ? [a] : []); },
    // several placements at once (each may carry a `colour`); the rest hide
    arrows(list) {
      for (let i = 0; i < Math.max(list.length, all.length); i++) place(arrowEl(i), list[i] ?? null);
    },
    // prompt text or null; `raised` lifts it above a visible progress label
    tip(text, raised = false) {
      toggle(tip, !!text);
      if (text && tipText.textContent !== text) tipText.textContent = text;
      tip.classList.toggle('raised', raised);
    },
    // the drag demo on a ghost stick (the "drag anywhere" prompt on touch screens)
    demo(on) { toggle(demo, on); },
    // a hand pointing at the context button, which pulses
    pointAtContext(on) {
      const show = on && !context.hidden;
      toggle(hand, show);
      context.classList.toggle('coach-pulse', show);
      if (!show) return;
      const r = context.getBoundingClientRect();
      hand.style.transform = `translate(${(r.left + r.width / 2).toFixed(1)}px, ${r.top.toFixed(1)}px)`;
    },
    hideAll() {
      this.arrow(null);
      this.tip(null);
      this.demo(false);
      this.pointAtContext(false);
    },
  };
}
