// "DIY time!" (spec v0.11 §10.10, P27-3; the captain: "a comic style onomatopeya "DIY time!""):
// at the first hammer strike a jagged speech burst pops up beside Vanessa, on the side away from
// the camera's centre, paper inside an uneven hand-drawn ink outline, tilted a few degrees, the
// words hand-lettered in ink with one flower-yellow shadow step. Two short ink ticks flick out at
// each strike's contact for 150 ms (v0.12: 220 ms, with two swoosh lines trailing the hammer).
// DOM over the canvas, never interactive; presentation only.
import { burstState } from '../world/build.js';

const INK = '#253347';
const PAPER = '#fffaf0';
const FLOWER = '#e6b83e';

// a jagged burst outline in a 240 x 140 box: 18 spikes, their lengths and the wobble of each
// edge fixed by a small hash so it reads hand-drawn but never changes between builds
export function burstPath(n = 18, w = 240, h = 140) {
  const cx = w / 2; const cy = h / 2;
  const hash = (i) => { const x = Math.sin(i * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2 + (hash(i) - 0.5) * 0.08;
    const out = i % 2 === 0;
    const k = out ? 0.96 + hash(i + 50) * 0.08 : 0.74 + hash(i + 90) * 0.06;
    pts.push([cx + Math.cos(a) * (w / 2 - 4) * k, cy + Math.sin(a) * (h / 2 - 4) * k]);
  }
  return `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;
}

export function createBurst(root = document) {
  const el = root.getElementById('diy');
  const ticks = root.getElementById('diy-ticks');
  const d = burstPath();
  el.innerHTML = `<svg viewBox="0 0 240 140" aria-hidden="true">
      <path d="${d}" fill="${PAPER}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round" opacity="0.45" transform="translate(2.5 -1.5) rotate(0.8 120 70)"/>
    </svg><span class="words" data-text="DIY time!">DIY time!</span>`;
  // v0.12 ("hammering on over the top way"): at each contact, ink ticks flick out of the hit and
  // two swoosh lines trail the hammer's path down onto it
  ticks.innerHTML = `<svg viewBox="0 0 80 80" aria-hidden="true"><g stroke="${INK}" stroke-linecap="round" fill="none">
      <g stroke-width="3"><path d="M30 34 L38 41"/><path d="M53 30 L46 39"/><path d="M58 50 L49 47"/><path d="M27 52 L36 49"/></g>
      <g class="swoosh" stroke-width="2.2" opacity="0.8"><path d="M14 8 Q30 6 38 30"/><path d="M6 18 Q22 16 30 36"/></g></g></svg>`;
  el.style.setProperty('--burst-shadow', FLOWER);
  let t = -1; // ms since the burst appeared, or -1
  let tickMs = 0;
  let side = 1;
  return {
    get active() { return t >= 0; },
    // the first strike: pop it up; `towards` +1 puts it on her right, -1 on her left
    show(towards = 1) { t = 0; side = towards; el.classList.toggle('left', side < 0); },
    hide() { t = -1; el.classList.remove('on'); ticks.classList.remove('on'); },
    // a strike's contact at screen point p (CSS px)
    tick(p, reduced = false) {
      if (reduced || !p) return;
      tickMs = 220;
      ticks.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      ticks.classList.add('on');
    },
    // per frame: `anchor` is her head on screen (CSS px), `view` the play rectangle
    update(dtMs, anchor, view, reduced = false) {
      if (tickMs > 0) { tickMs -= dtMs; if (tickMs <= 0) ticks.classList.remove('on'); }
      if (t < 0) return;
      t += dtMs;
      const s = burstState(t, reduced);
      if (s.done || !anchor) { this.hide(); return; }
      // beside her head, never over her face or the stack: offset sideways, kept on screen
      const w = Math.max(150, Math.min(260, view.w * 0.27));
      const h = w * (140 / 240);
      let x = anchor.x + side * (w * 0.5 + 34);
      x = Math.max(w / 2 + 8, Math.min(view.w - w / 2 - 8, x));
      const y = Math.max(view.top + h / 2 + 8, Math.min(view.bottom - h / 2 - 8, anchor.y - h * 0.15));
      el.style.width = `${w.toFixed(0)}px`;
      el.style.height = `${h.toFixed(0)}px`;
      el.style.fontSize = `${Math.max(20, w * 0.15).toFixed(1)}px`;
      el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${side * -4}deg) scale(${s.scale.toFixed(3)})`;
      el.style.opacity = s.opacity.toFixed(3);
      el.classList.add('on');
    },
  };
}
