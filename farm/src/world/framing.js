// v0.21 (design audit 9, "portrait framing for the finale and the opening"). The drawing is wider
// than it is tall (1.2 : 1), so on an upright phone the whole of it, fitted to the width, is a
// strip 29 to 35% of the screen's height with empty sky above and empty grass below: the game's
// biggest moment was its smallest picture. On an upright screen the finale's colour beats and the
// opening's page are now framed on the drawing's middle (the tree, the bench, the path, the house,
// Vanessa and the raised bed) at about 1.5 times the size: the drawing keeps its whole height, its
// two sides run off the screen, and the paper above and below it is the frame. The finale then
// eases back out and ends on the whole drawing, as before.
// The framing is an exact crop of the drawing: the camera only narrows its lens (a zoom) and shifts
// its image (projection.js frameViewport), so nothing in the composition moves against anything else.
// (v0.25 and v0.27: the finale has a framing of its own, below; the opening's page keeps this one.)
// Pure arithmetic: no three.js, no DOM.
import { DRAWING_ASPECT, MARGIN } from './drawing.js';

export const PORTRAIT_ASPECT = 0.8; // a screen this narrow (width / height) or narrower is upright
export const PORTRAIT_ZOOM = 1.5; // "at about 1.5x": never more
export const PORTRAIT_SHARE = 0.6; // the framed drawing takes at most this share of the screen's height
// the drawing's middle, in drawing units across (u, % of its width): from the left of the tree's
// crown to the right end of the raised bed. All of it stays on screen.
export const MIDDLE = { u0: 3, u1: 78 };

// the composition rectangle (CSS px) fitted into a viewport, letterboxed with the 4% margin
export function fitRect(w, h) {
  const aw = w * (1 - 2 * MARGIN);
  const ah = h * (1 - 2 * MARGIN);
  let rw = aw;
  let rh = rw / DRAWING_ASPECT;
  if (rh > ah) { rh = ah; rw = rh * DRAWING_ASPECT; }
  return { x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh };
}

export const isPortrait = (w, h) => w / h <= PORTRAIT_ASPECT;
// how much the upright framing enlarges the drawing on this screen (1: not upright, no change):
// 1.5 at most, never taller than PORTRAIT_SHARE of the screen, never so close that the middle
// no longer fits across
export function portraitZoom(w, h) {
  if (!isPortrait(w, h)) return 1;
  const fit = fitRect(w, h);
  const across = w / (fit.w * (MIDDLE.u1 - MIDDLE.u0) / 100);
  return Math.max(1, Math.min(PORTRAIT_ZOOM, (h * PORTRAIT_SHARE) / fit.h, across));
}

// The drawing's frame on a w x h screen at k (0: the whole drawing, fitted; 1: the upright framing
// on its middle; between: the camera easing from one to the other at a constant rate of zoom).
// -> { zoom, rect: where the whole drawing lands (CSS px; at k 1 it runs off both sides),
//      window: the part of it on screen }. A screen that is not upright gets the fitted rectangle at every k.
export function drawingFrame(w, h, k = 1) {
  const fit = fitRect(w, h);
  const full = portraitZoom(w, h);
  const e = Math.max(0, Math.min(1, k));
  if (full === 1 || e === 0) return { zoom: 1, rect: fit, window: fit };
  const zoom = full ** e;
  const uc = 50 + ((MIDDLE.u0 + MIDDLE.u1) / 2 - 50) * e; // the drawing's u at the screen's centre
  const rw = fit.w * zoom;
  const rh = fit.h * zoom;
  const rect = { x: w / 2 - rw * (uc / 100), y: (h - rh) / 2, w: rw, h: rh };
  const x0 = Math.max(0, rect.x);
  const x1 = Math.min(w, rect.x + rw);
  return { zoom, rect, window: { x: x0, y: rect.y, w: x1 - x0, h: rh } };
}
// the drawing's u (% across) at the left and right edges of the screen in a frame
export const frameSpan = (w, frame) => ({ u0: ((0 - frame.rect.x) / frame.rect.w) * 100, u1: ((w - frame.rect.x) / frame.rect.w) * 100 });

// ---------- v0.27: the finale shows the whole farm (the captain's v0.25 playtest) ----------
// v0.25 had split the drawing into two upright halves for an upright phone, so that nothing would
// be small, and the camera travelled from the house's half to her half (a wide screen opened on a
// close shot of the house). The captain, with a picture of the second half on his phone, the house
// out of it: "not what I was looking for / maybe we should simply show the whole farm".
// So the finale has one shot on every screen: the whole farm, the tree's crown to the sun's rays
// and the top ray to the grass under the ring of stones, fitted whole into the screen and as large
// as it goes (an upright screen: across its width; a wide one: up its height). The house, the
// path, the tree and the bench, Vanessa, the bed, the corn, the sunflowers and the sun are in it
// from the moment the camera has eased out of play until it eases back. Above and below the farm
// an upright screen has the world's own sky and ground, where the sky turns blue and the grass
// spreads.
// It is an exact crop of the one drawing, as every drawing framing is (the camera narrows its lens
// and shifts its image: projection.js frameViewport). A camera of its own for the upright screen
// was measured on the built farm and left out: the farm's width, tree to sunflowers to sun, is
// what fills an upright screen, and no other place for the camera makes it narrower. Higher up,
// the ground takes more of the screen's height but everything standing on it is smaller (Vanessa
// 44 px from the drawing's own place on a 390 px phone, 33 px from 10 m up); to one side, the tree
// stands in front of the house. Pure arithmetic.
// A box of the drawing: u, v in % of its width and height; it may reach past the drawing's own
// edges, where the tree's crown and the sun's rays go. (Measured on the built farm: the crown
// reaches u -10, the last sunflower u 97, the sun's rays at their longest u 105 and v -2, the
// ring of stones v 85.6. test/v027-world.test.mjs holds every part inside it, and holds the box
// to the farm: its sides are the crown and the rays.)
export const WHOLE_FARM = Object.freeze({ u0: -10.5, u1: 105.5, v0: -2.5, v1: 90 });
export const SHOT_PAD = 0.98; // a shot's box takes this share of the screen (or of its area) at most
// Where the whole drawing lands (CSS px; it may run off the screen) so that `box` is fitted whole
// into `area` (default: the whole w x h screen), centred there. -> { x, y, w, h }
export function shotRect(w, h, box, { pad = SHOT_PAD, area = null } = {}) {
  const a = area ?? { x: 0, y: 0, w, h };
  const du = (box.u1 - box.u0) / 100;
  const dv = (box.v1 - box.v0) / 100;
  const rw = Math.min((a.w * pad) / du, (a.h * pad * DRAWING_ASPECT) / dv);
  const rh = rw / DRAWING_ASPECT;
  const uc = (box.u0 + box.u1) / 200;
  const vc = (box.v0 + box.v1) / 200;
  return { x: a.x + a.w / 2 - rw * uc, y: a.y + a.h / 2 - rh * vc, w: rw, h: rh };
}
// the finale's frame on a w x h screen: where the whole drawing lands so that the whole farm is on it
export const finaleRect = (w, h) => shotRect(w, h, WHOLE_FARM);
// The drawing's frame at k of a camera's travel between two shots (0: `home`, 1: `hers`; the
// sunset below has such a travel): the point of the drawing at the screen's centre moves in a
// straight line and the zoom changes at a constant rate, so a travel between two shots of one size
// is a level pan. -> { x, y, w, h }
export function travelRect(w, h, k, shots) {
  const a = shotRect(w, h, shots.home);
  const b = shotRect(w, h, shots.hers);
  const e = Math.max(0, Math.min(1, k));
  if (e === 0) return a;
  if (e === 1) return b;
  const centre = (r) => ({ u: (w / 2 - r.x) / r.w, v: (h / 2 - r.y) / r.h });
  const ca = centre(a); const cb = centre(b);
  const rw = a.w * (b.w / a.w) ** e;
  const rh = rw / DRAWING_ASPECT;
  const u = ca.u + (cb.u - ca.u) * e;
  const v = ca.v + (cb.v - ca.v) * e;
  return { x: w / 2 - rw * u, y: h / 2 - rh * v, w: rw, h: rh };
}
// the part of the drawing on screen in a frame: { u0, u1, v0, v1 } in % (tests, the report)
export const rectSpan = (w, h, r) => ({ u0: ((0 - r.x) / r.w) * 100, u1: ((w - r.x) / r.w) * 100, v0: ((0 - r.y) / r.h) * 100, v1: ((h - r.y) / r.h) * 100 });
// The end card ("The farm is finished", once, after the finale) does not lie over the picture
// (v0.25): the whole farm is framed in the part of the screen the card leaves free. An upright
// screen has the picture above and the card below; a wide one the picture on the left and the card
// on the right. -> { area: the picture's part of the screen, card: 'below' | 'right', rect: where
// the whole drawing lands }
export const END_CARD = Object.freeze({ below: 0.44, right: 0.36 }); // the card's share of the height (upright) or the width (wide)
export function endCardFrame(w, h) {
  const upright = w / h < 1;
  const area = upright ? { x: 0, y: 0, w, h: h * (1 - END_CARD.below) } : { x: 0, y: 0, w: w * (1 - END_CARD.right), h };
  return { area, card: upright ? 'below' : 'right', rect: shotRect(w, h, WHOLE_FARM, { area }) };
}
// v0.27: the picture's way from the finale's frame to the end card's (k 0..1, eased by the
// caller): its size and its place change evenly, so the farm slides up (or to the left) into the
// room the card leaves, instead of jumping there. -> { x, y, w, h }
export function mixRect(a, b, k) {
  const e = Math.max(0, Math.min(1, k));
  const m = (p, q) => p + (q - p) * e;
  return { x: m(a.x, b.x), y: m(a.y, b.y), w: m(a.w, b.w), h: m(a.h, b.h) };
}

// ---------- v0.25: "Sunset on the bench" (game/sunset.js) ----------
// Two shots on an upright screen, which the camera travels between: it starts on the corn's half
// of the drawing, where the fireflies come up as the evening falls, and goes back across to the
// bench's half, framed so the bench is near the middle and there is grass under it for the
// signature; a wide screen has the bench, the corn and the sun in one picture, the whole drawing,
// from start to end. (v0.27 left this scene's framing as v0.25 made it: the boxes are v0.25's.)
export const SUNSET_SHOTS = Object.freeze({
  upright: Object.freeze({ home: Object.freeze({ u0: 45.5, u1: 101, v0: -2, v1: 90 }), hers: Object.freeze({ u0: -10.5, u1: 45, v0: 22, v1: 100 }) }),
  wide: (() => { const whole = Object.freeze({ u0: -10, u1: 104, v0: -3, v1: 91 }); return Object.freeze({ home: whole, hers: whole }); })(),
});
export const sunsetShots = (w, h) => (isPortrait(w, h) ? SUNSET_SHOTS.upright : SUNSET_SHOTS.wide);
// the drawing's frame at k of the camera's travel (0: the corn's shot, 1: the bench's)
export const sunsetRect = (w, h, k = 1) => travelRect(w, h, k, sunsetShots(w, h));
