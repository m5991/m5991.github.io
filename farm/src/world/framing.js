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

// ---------- v0.25: the finale's shots (the captain's v0.24 playtest) ----------
// "The animation when the house is finished feels off. I know that is because of the landscape and
// portrait mode and how out of focus, but I think that it should be better thought."
// v0.21's upright framing showed the colour beats in a strip between two bands of paper, cut
// through the tree on one side and the sun on the other, and then eased back to the whole drawing,
// a third of the screen high in empty sky and grass. The drawing is wider than it is tall, and an
// upright screen cannot show all of it large. But it falls into two halves that are each an
// upright picture: on the left the house, the path, the tree and the bench, with the birds over
// them; on the right the corn, the sun, the sunflowers, the raised bed, and Vanessa's place. So
// the finale is shot for the screen it plays on, in two shots it travels between:
//   an upright screen  - `home`, the left half, the finished house in its middle, filling the
//     screen's width; then the camera goes with her, one screen to the right, to `hers`, the right
//     half, where the grass spreads from her feet, the sky turns blue and the sun, large above the
//     corn, turns yellow. It ends there. Nothing is cut in half and nothing is small: in both
//     shots she and the house are about as large as in play.
//   a wide screen      - `home` is a close shot of the house, whole, with her in front of it (the
//     tree's crown and the first corn come in from the edges); then the camera eases out with her
//     to `hers`, the whole drawing, tree to sun, which a wide screen shows large, for the grass,
//     the sky and the sun.
// A shot is a box of the drawing (u, v in % of its width and height; it may reach past the
// drawing's own edges, where the tree's crown and the sun's rays go) fitted whole into the screen,
// as large as it goes. Like every drawing framing it is an exact crop of the one composition (the
// camera narrows its lens and shifts its image: projection.js frameViewport), so the two shots and
// the travel between them are the drawing itself, seen closer. No paper bands: above and below the
// drawing the world's own sky and ground go on. Pure arithmetic.
export const FINALE_SHOTS = Object.freeze({
  // (measured on the built farm: the tree's crown reaches u -10, the house ends at u 44.5, the
  // corn begins at u 49 and the last sunflower ends at u 97; the two boxes are the same width)
  upright: Object.freeze({ home: Object.freeze({ u0: -10.5, u1: 45, v0: 10, v1: 86 }), hers: Object.freeze({ u0: 45.5, u1: 101, v0: -2, v1: 90 }) }),
  wide: Object.freeze({ home: Object.freeze({ u0: 10, u1: 58, v0: 12, v1: 60 }), hers: Object.freeze({ u0: -10, u1: 104, v0: -3, v1: 91 }) }),
});
export const SHOT_PAD = 0.98; // a shot's box takes this share of the screen (or of its area) at most
export const finaleShots = (w, h) => (isPortrait(w, h) ? FINALE_SHOTS.upright : FINALE_SHOTS.wide);
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
// The drawing's frame at k of the camera's travel (0: `home`, 1: `hers`): the point of the drawing
// at the screen's centre moves in a straight line and the zoom changes at a constant rate, so an
// upright screen's travel is a level pan and a wide one's an even ease out. -> { x, y, w, h }
export function finaleRect(w, h, k = 1, shots = finaleShots(w, h)) {
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
// The end card ("The farm is finished", once, after the finale) no longer lies over the picture:
// the whole drawing is framed in the part of the screen the card leaves free. An upright screen
// has the picture above and the card below; a wide one the picture on the left and the card on
// the right. -> { area: the picture's part of the screen, card: 'below' | 'right', rect: where the
// whole drawing lands }
export const END_CARD = Object.freeze({ below: 0.44, right: 0.36 }); // the card's share of the height (upright) or the width (wide)
export function endCardFrame(w, h) {
  const upright = w / h < 1;
  const area = upright ? { x: 0, y: 0, w, h: h * (1 - END_CARD.below) } : { x: 0, y: 0, w: w * (1 - END_CARD.right), h };
  return { area, card: upright ? 'below' : 'right', rect: shotRect(w, h, FINALE_SHOTS.wide.hers, { area }) };
}

// ---------- v0.25: "Sunset on the bench" (game/sunset.js) ----------
// The same two kinds of shot as the finale, the other way round: an upright screen starts on the
// corn's half of the drawing, where the fireflies come up as the evening falls, and goes back
// across to the bench's half, a little lower than the finale's first shot so the bench is near the
// middle and there is grass under it for the signature; a wide screen has the bench, the corn and
// the sun in one picture, the whole drawing, from start to end.
export const SUNSET_SHOTS = Object.freeze({
  upright: Object.freeze({ home: FINALE_SHOTS.upright.hers, hers: Object.freeze({ u0: -10.5, u1: 45, v0: 22, v1: 100 }) }),
  wide: Object.freeze({ home: FINALE_SHOTS.wide.hers, hers: FINALE_SHOTS.wide.hers }),
});
export const sunsetShots = (w, h) => (isPortrait(w, h) ? SUNSET_SHOTS.upright : SUNSET_SHOTS.wide);
// the drawing's frame at k of the camera's travel (0: the corn's shot, 1: the bench's)
export const sunsetRect = (w, h, k = 1) => finaleRect(w, h, k, sunsetShots(w, h));
