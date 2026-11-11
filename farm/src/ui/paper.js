// The opening's page (spec v0.10 §4.1; game/opening.js, world/opening.js): paper filling the
// view, seen from straight above, with the drawing on it and the title pencilled beside it
// (above it on portrait screens), a pencilled tap mark (`Start`) and a Sound toggle in opposite
// corners.
// v0.22 (Tiffany: "Change the opening to the actual farm drawing"): the drawing on the page is
// Vanessa's own drawing (assets/reference/drawing.jpg), its pen lines lifted off their white
// paper onto the page's paper (`inkOnPaper`). v0.10-v0.21 showed the game's redrawing of it, a
// still of the live world in ink. The drawing lies in the drawing's own frame (fitRect, where the
// live world is fitted to it), so when the camera has sunk until it fills that frame the page
// gives way to the live world drawn in ink over the same lines, which then takes its colour. Sinking straight down toward a flat sheet is a pure zoom, so the
// camera over the page is a CSS transform and nothing 3D is drawn while the page covers the
// screen. The title is positioned on screen by script: with the page while it sinks, then with
// the world as the camera eases down, so it slides out of frame. The title's lettering itself
// (text now, Tiffany's later) is set in one place: src/ui/opening-title.js.
import { drawingFrame } from '../world/framing.js';

const MAX_START_SCALE = 0.7; // at least this much of a sink, even where the page would fit larger
export const DRAWING_SRC = 'assets/reference/drawing.jpg';
// the drawing's pen (a dark blue-violet ballpoint), and the paper white that becomes clear
export const PEN = { rgb: [30, 26, 78], white: 246, range: 150 };
// A photo of pen on white paper -> the pen alone: each pixel becomes the pen's colour with an
// alpha from how dark it is (white and near-white: clear), so the lines sit on the page's own
// paper with no white rectangle round them. `px`: RGBA bytes, changed in place.
export function inkOnPaper(px) {
  const [r, g, b] = PEN.rgb;
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const a = Math.max(0, Math.min(1, (PEN.white - lum) / PEN.range));
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = Math.round(255 * a * (px[i + 3] / 255));
  }
  return px;
}
// the part of the drawing's picture (nw x nh px) that the sheet shows: `rect` (the sheet) within
// `comp` (where the whole drawing lands); on an upright screen that is its middle (v0.21)
export function drawingCrop(L, nw, nh) {
  const r = L.rect; const c = L.comp;
  return { sx: ((r.x - c.x) / c.w) * nw, sy: ((r.y - c.y) / c.h) * nh, sw: (r.w / c.w) * nw, sh: (r.h / c.h) * nh };
}

// The page in CSS px for a viewport, in page coordinates where the drawing's frame at the end of
// the sink is fitRect itself: portrait-like screens pencil the title on one line above the
// drawing, landscape ones on two lines beside it. `start` / `end`: the page point at the
// screen centre (cx, cy) and the scale.
// v0.21 (audit 9): on an upright screen the sheet shows the drawing's middle, larger (framing.js):
// `rect` is the sheet (the part of the drawing on screen at the end of the sink) and `comp` where
// the whole drawing would land, for placing things by their place in the drawing.
export function pageLayout(vw, vh, frame = drawingFrame(vw, vh, 1)) {
  const r = frame.window;
  const font = Math.round(Math.min(r.w * 0.19, r.h * 0.26));
  const gap = Math.round(font * 0.35);
  const portrait = vw / vh < 1.1;
  let title;
  if (portrait) {
    const w = Math.round(font * 4.9); const h = Math.round(font * 1.5);
    title = { x: Math.round(r.x + (r.w - w) / 2), y: Math.round(r.y - gap - h), w, h, font, lines: 1 };
  } else {
    const w = Math.round(font * 2.9); const h = Math.round(font * 2.5);
    title = { x: Math.round(r.x + r.w + gap), y: Math.round(r.y + (r.h - h) * 0.4), w, h, font, lines: 2 };
  }
  // what the resting page shows: the drawing and the title together
  const x0 = Math.min(r.x, title.x); const x1 = Math.max(r.x + r.w, title.x + title.w);
  const y0 = Math.min(r.y, title.y); const y1 = Math.max(r.y + r.h, title.y + title.h);
  const fit = Math.min((0.88 * vw) / (x1 - x0), (0.78 * vh) / (y1 - y0));
  return {
    portrait, title, rect: r, comp: frame.rect, zoom: frame.zoom,
    start: { s: Math.min(fit, MAX_START_SCALE), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 },
    end: { s: 1, cx: vw / 2, cy: vh / 2 },
  };
}

// the camera over the page at sink k (0 the resting page, 1 the drawing in its frame): a
// constant-rate zoom (log scale) toward the drawing's centre
export function diveCamera(L, k) {
  const a = L.start; const b = L.end;
  const e = Math.max(0, Math.min(1, k));
  return { s: a.s * (b.s / a.s) ** e, cx: a.cx + (b.cx - a.cx) * e, cy: a.cy + (b.cy - a.cy) * e };
}
// page point -> screen point through that camera (at k 1 the identity, because fitRect is
// centred in the viewport)
export function toScreen(vw, vh, cam, x, y) {
  return { x: vw / 2 + cam.s * (x - cam.cx), y: vh / 2 + cam.s * (y - cam.cy) };
}
const css = (vw, vh, cam) => `translate(${(vw / 2).toFixed(2)}px, ${(vh / 2).toFixed(2)}px) scale(${cam.s.toFixed(5)}) translate(${(-cam.cx).toFixed(2)}px, ${(-cam.cy).toFixed(2)}px)`;

// `loadImage(src, onload)` -> an image element (injected for tests); `dpr`: device px per CSS px
export function createPaper(root, { loadImage = (src, onload) => { const im = new Image(); im.decoding = 'async'; im.onload = onload; im.src = src; return im; }, dpr = () => Math.min(2, globalThis.devicePixelRatio || 1) } = {}) {
  const sheet = root.querySelector('.sheet');
  const drawing = root.querySelector('canvas.drawing');
  const title = root.querySelector('#opening-title');
  const stage = root.querySelector('.stage');
  const start = root.querySelector('#opening-start');
  const still = root.querySelector('canvas.still');
  let L = null;
  let vw = 1; let vh = 1;
  let dive = 0;
  let fadeTimer = 0;
  // the drawing itself: painted onto the sheet once it has loaded and the page is laid out
  const art = loadImage(DRAWING_SRC, () => api.paint());
  const api = {
    needsCapture: true,
    captured: false,
    get layout() { return L; },
    get viewport() { return { w: vw, h: vh }; },
    show(mode = 'waiting') {
      clearTimeout(fadeTimer);
      document.documentElement.dataset.opening = mode;
      root.hidden = false;
      root.classList.remove('leaving', 'frozen');
      stage.style.transition = '';
      api.setMode(mode);
      api.setOpacity(1);
    },
    // gone at once, or (ms) cross-faded to the live world while play already has control
    hide(ms = 0) {
      clearTimeout(fadeTimer);
      const done = () => { delete document.documentElement.dataset.opening; root.hidden = true; root.classList.remove('ready', 'running', 'leaving', 'frozen'); stage.style.transition = ''; title.style.transition = ''; };
      if (!ms || root.hidden) { done(); return; }
      root.classList.add('leaving'); // no longer takes taps
      stage.style.transition = title.style.transition = `opacity ${ms}ms linear`;
      stage.style.opacity = '0';
      title.style.opacity = '0';
      fadeTimer = setTimeout(done, ms + 30);
    },
    // 'waiting' (resting, until the first tap) or 'running'
    setMode(mode) {
      document.documentElement.dataset.opening = mode;
      root.classList.toggle('running', mode === 'running');
      if (mode === 'waiting') start.focus({ preventScroll: true });
    },
    place(w, h) {
      vw = w; vh = h;
      L = pageLayout(w, h);
      const r = L.rect;
      Object.assign(drawing.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      const t = L.title;
      Object.assign(title.style, { left: `${t.x}px`, top: `${t.y}px`, width: `${t.w}px`, height: `${t.h}px`, fontSize: `${t.font}px` });
      title.classList.toggle('stacked', t.lines === 2);
      root.classList.add('laid');
      api.needsCapture = true;
      api.paint(); // the drawing, for the new sheet (once its picture has loaded)
      api.setDive(dive);
    },
    // Paint the drawing onto the sheet: the part of it the sheet shows, its pen lines on clear
    // (inkOnPaper). Called when the picture has loaded and whenever the page is laid out again.
    // -> true when it is on the page (`needsCapture` then false: main.js stops drawing the world
    // under the page)
    paint() {
      if (!L || !art || !(art.naturalWidth > 0)) return false;
      const r = L.rect;
      const k = dpr();
      const w = Math.max(1, Math.round(r.w * k));
      const h = Math.max(1, Math.round(r.h * k));
      if (drawing.width !== w || drawing.height !== h) { drawing.width = w; drawing.height = h; }
      const g = drawing.getContext('2d', { willReadFrequently: true });
      const c = drawingCrop(L, art.naturalWidth, art.naturalHeight);
      g.globalCompositeOperation = 'copy';
      g.imageSmoothingQuality = 'high';
      g.drawImage(art, c.sx, c.sy, c.sw, c.sh, 0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
      try {
        const img = g.getImageData(0, 0, w, h);
        inkOnPaper(img.data);
        g.putImageData(img, 0, 0);
      } catch { drawing.style.mixBlendMode = 'multiply'; } // pixels not readable here: the white multiplies into the paper
      api.needsCapture = false;
      api.captured = true;
      root.classList.add('ready');
      return true;
    },
    // a skip from the live part: the frame on screen now, held over the end state while it fades
    captureView(glCanvas) {
      still.width = glCanvas.width; still.height = glCanvas.height;
      still.getContext('2d').drawImage(glCanvas, 0, 0);
      root.classList.add('frozen');
      api.setOpacity(1);
    },
    setDive(k) {
      dive = k;
      if (!L) return;
      const cam = diveCamera(L, k);
      sheet.style.transform = css(vw, vh, cam);
      api.titleAt(api.titleOnPage(cam));
    },
    // the title's screen placement on the sinking page: { dx, dy, s } from its laid-out box
    titleOnPage(cam = diveCamera(L, dive)) {
      const t = L.title;
      const c = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
      const p = toScreen(vw, vh, cam, c.x, c.y);
      return { dx: p.x - c.x, dy: p.y - c.y, s: cam.s };
    },
    titleAt({ dx, dy, s }, opacity = null) {
      title.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${s.toFixed(5)})`;
      if (opacity !== null) title.style.opacity = String(opacity);
    },
    // the title's centre on screen at the end of the sink (where the world takes it over)
    get titleCentre() { const t = L.title; return { x: t.x + t.w / 2, y: t.y + t.h / 2 }; },
    // the page layer (paper, drawing, tap mark, Sound) over the live world: 1 covers it
    setOpacity(o) { stage.style.opacity = String(o); },
    onStart(fn) {
      root.addEventListener('pointerup', (e) => {
        if (e.isPrimary === false || e.target.closest('#opening-sound') || root.classList.contains('leaving')) return;
        fn(e);
      });
    },
  };
  return api;
}
