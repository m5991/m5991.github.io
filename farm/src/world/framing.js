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
