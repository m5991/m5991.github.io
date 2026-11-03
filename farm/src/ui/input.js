// Movement input: the floating stick and keyboard feed one vector (screen x right, y up).
// The stick floats like the BASE stick (stick.js): `#stick-zone` covers the whole play area
// under the HUD, so a touch anywhere that is not a HUD panel, button or card places the stick
// under the finger; it hides again on release or pointer cancel. HUD panels, the Pause and
// context buttons and the cards sit above the zone and keep their touches. WASD/arrows act only
// while no dialog owns focus. The stick has an 8% dead zone and walks slower below full
// deflection (P23-6.12, mover.js); keys always give a unit vector. Both get the same
// accel/stop/turn easing in the hero mover. B toggles the blueprint (spec v0.9 P25-3); the
// handler decides when it applies.
import { createStick } from './stick.js';

const KEYS = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

export function createInput({ zone, base, knob, onAction, onEscape, onBlueprint, isBlocked, onMode, onTap }) {
  const v = { x: 0, y: 0 };
  const stick = createStick();
  const held = new Set();
  // the last kind of input the player used: 'touch', 'mouse' or 'keyboard' (coach wording)
  let mode = globalThis.matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'keyboard';
  const setMode = (m) => { if (m !== mode) { mode = m; onMode?.(m); } };

  function setKnob(dx, dy) { knob.style.transform = `translate(${dx}px, ${dy}px)`; }
  function show(x, y) {
    base.style.left = `${x}px`;
    base.style.top = `${y}px`;
    setKnob(0, 0);
    zone.classList.add('active');
  }
  function hide() {
    zone.classList.remove('active');
    setKnob(0, 0);
  }

  // v0.12: a short tap that does not drag is also a tap on the world (the yard-sale stand)
  let press = null;
  zone.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || isBlocked()) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    if (!stick.down(e.pointerId, e.clientX, e.clientY)) return;
    setMode(e.pointerType === 'mouse' ? 'mouse' : 'touch');
    show(e.clientX, e.clientY);
    try { zone.setPointerCapture(e.pointerId); } catch { /* synthetic or already released pointer */ }
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => { stick.move(e.pointerId, e.clientX, e.clientY); });
  const end = (e) => { if (stick.up(e.pointerId)) hide(); };
  zone.addEventListener('pointerup', (e) => {
    const p = press;
    press = null;
    end(e);
    if (p && p.id === e.pointerId && performance.now() - p.t < 350 && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 14 && !isBlocked()) onTap?.(e.clientX, e.clientY);
  });
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('lostpointercapture', end);
  zone.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { onEscape(); return; }
    if (e.code === 'KeyB' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target?.closest?.('input, textarea')) { onBlueprint?.(); return; }
    if (isBlocked()) return;
    if (KEYS[e.code]) { held.add(e.code); setMode('keyboard'); e.preventDefault(); return; }
    if ((e.code === 'KeyE' || e.code === 'Space') && !e.repeat) {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON' && e.code === 'Space') return;
      e.preventDefault();
      setMode('keyboard');
      onAction();
    }
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  return {
    // current vector, magnitude 0..1
    read() {
      v.x = 0; v.y = 0;
      if (isBlocked()) { held.clear(); return v; }
      if (stick.active) {
        const k = stick.knob();
        setKnob(k.x, k.y);
        const s = stick.vector();
        v.x = s.x; v.y = s.y;
        return v;
      }
      for (const k of held) { v.x += KEYS[k][0]; v.y += KEYS[k][1]; }
      const len = Math.hypot(v.x, v.y);
      if (len > 1) { v.x /= len; v.y /= len; }
      return v;
    },
    release() { held.clear(); if (stick.active) { stick.release(); hide(); } },
    get stickActive() { return stick.active; },
    get mode() { return mode; },
  };
}
