// Floating stick state (pure, no DOM; unit-tested). It follows the BASE stick (app.pretty.js
// 32302-32420): the first touch anywhere in the play area places the stick's base under the
// finger (`onDragStart` moved `stickContainer` to the touch), the knob follows the finger up to
// the radius while the base stays put, and release hides it and stops. The base never jumps or
// drags along, so the direction always reads from where the thumb first landed.
// One finger owns the stick; other fingers are ignored until it lifts.
import { shapeStick } from '../world/mover.js';

export const STICK_RADIUS = 40; // px of knob travel (the 96 px base of spec §11.1)

export function createStick(radius = STICK_RADIUS) {
  const s = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
  return {
    get active() { return s.id !== null; },
    get origin() { return { x: s.x0, y: s.y0 }; },
    // the first pointer down claims the stick; returns false if another finger holds it
    down(id, x, y) {
      if (s.id !== null) return false;
      Object.assign(s, { id, x0: x, y0: y, x, y });
      return true;
    },
    move(id, x, y) {
      if (id !== s.id) return false;
      s.x = x; s.y = y;
      return true;
    },
    up(id) {
      if (id !== s.id) return false;
      s.id = null;
      return true;
    },
    release() { s.id = null; },
    // knob offset from the base centre in px, clamped to the radius
    knob() {
      if (s.id === null) return { x: 0, y: 0 };
      let dx = s.x - s.x0;
      let dy = s.y - s.y0;
      const len = Math.hypot(dx, dy);
      if (len > radius) { dx *= radius / len; dy *= radius / len; }
      return { x: dx, y: dy };
    },
    // movement vector (screen x right, y up), magnitude 0..1, 8% dead zone, partial deflection
    vector() {
      const k = this.knob();
      return shapeStick(k.x, k.y, radius);
    },
  };
}
