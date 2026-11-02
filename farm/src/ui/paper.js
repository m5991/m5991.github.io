// The opening's page (spec v0.10 §4.1; game/opening.js, world/opening.js): paper filling the
// view, seen from straight above, with the redrawn drawing on it and the title pencilled
// beside it (above it on portrait screens), a pencilled tap mark (`Start`) and a Sound toggle in
// opposite corners. The drawing is a still of the live world, drawn in ink through the drawing's
// own framing and copied once (and again on a resize), so when the camera has sunk until the
// drawing fills its frame (fitRect) the page can give way to the live world, which shows exactly
// the same picture there. Sinking straight down toward a flat sheet is a pure zoom, so the
// camera over the page is a CSS transform and nothing 3D is drawn while the page covers the
// screen. The title is positioned on screen by script: with the page while it sinks, then with
// the world as the camera eases down, so it slides out of frame. The title's lettering itself
// (text now, Tiffany's later) is set in one place: src/ui/opening-title.js.
import { fitRect } from '../world/projection.js';

const MAX_START_SCALE = 0.7; // at least this much of a sink, even where the page would fit larger

// The page in CSS px for a viewport, in page coordinates where the drawing's frame at the end of
// the sink is fitRect itself: portrait-like screens pencil the title on one line above the
// drawing, landscape ones on two lines beside it. `start` / `end`: the page point at the
// screen centre (cx, cy) and the scale.
export function pageLayout(vw, vh, r = fitRect(vw, vh)) {
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
    portrait, title, rect: r,
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

export function createPaper(root) {
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
      api.setDive(dive);
    },
    // copy the drawing out of the frame just rendered (call right after renderer.render, in the
    // same task, so the WebGL buffer is still there); its edges fade into the page's paper
    capture(glCanvas, dpr) {
      if (!L) return;
      const r = L.rect;
      const w = Math.max(1, Math.round(r.w * dpr));
      const h = Math.max(1, Math.round(r.h * dpr));
      if (drawing.width !== w || drawing.height !== h) { drawing.width = w; drawing.height = h; }
      const g = drawing.getContext('2d');
      g.globalCompositeOperation = 'copy';
      g.drawImage(glCanvas, Math.round(r.x * dpr), Math.round(r.y * dpr), w, h, 0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      const f = Math.round(Math.min(w, h) * 0.06);
      const edge = (x0, y0, x1, y1, rx, ry, rw, rh) => {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, 'rgba(0,0,0,1)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(rx, ry, rw, rh);
      };
      edge(0, 0, f, 0, 0, 0, f, h);
      edge(w, 0, w - f, 0, w - f, 0, f, h);
      edge(0, 0, 0, f, 0, 0, w, f);
      edge(0, h, 0, h - f, 0, h - f, w, f);
      g.globalCompositeOperation = 'source-over';
      api.needsCapture = false;
      api.captured = true;
      root.classList.add('ready');
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
