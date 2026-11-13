// DOM HUD (annex §D.9; spec §11.1): carried counters with names, icons and the plain count, the
// coin purse (v0.11: wood and stone include the yard pile), the goal line, one contextual action,
// a nonmodal progress label and a polite live region. v0.12: the build line at the bottom (the
// next build's needs counting down, then its DIY button) and the Yard Sale button. v0.13 (captain's
// v0.12 playtest: "the tutorial text boxes ... get in the way and dont let you see the main
// character"; answer 1 "Edge note"): the lesson messages are a slim note pinned to the top edge
// under the HUD, never over Vanessa; a tap folds it to one line (and unfolds it), and the game
// keeps going; the DIY button shows as soon as she has everything, pulsing, and away from the part
// it says where to go. It only presents ledger and controller state. Counters show just the number (captain,
// 2026-11-01): the 12-unit cap is told at the refusal moment (toast and status), not here.
// v0.21 (design audit 5, "one voice on screen"): the goal is one line, icon-first (a build's short
// name and what it still needs as icons and numbers: guide.js `line`), with the whole sentence kept
// for screen readers; the bottom line's count is gone (the goal line is the one place that says
// it) and only the DIY button is left there; a counter appears when its resource first matters
// (countersShown) and stays; in the egg hunt the materials and crops go and the row is the songs
// found of all, a button that opens the songbook (and the keepsakes, once one is found). On a
// phone a counter is its icon over its number; its name shows where it fits on one line (900 px
// and wider) and is always its accessible name.
import { BASE_STAGE, RESOURCE_NAMES, STAGES } from '../game/data.js';
import { isCommitted, recipe } from '../game/ledger.js';
import { nextStage } from '../game/guide.js';

export const counterText = (n) => String(Math.min(9999, n));

// v0.20 (audit 2: "a note cut off by a bird warning does not replay"): what becomes of the note an
// urgent warning interrupts. It used to come back afterwards and run its whole time again. Now a
// note that has been up for at least NOTE_SEEN_MS, or for half its time, has been read: it is
// dropped. One cut off sooner comes back once, for the time it had left (never from the start).
export const NOTE_SEEN_MS = 1500;
export function afterInterrupt(note, shownMs) {
  if (!note) return null;
  if (shownMs >= NOTE_SEEN_MS || shownMs >= note.ms / 2) return null;
  return { ...note, ms: Math.max(1200, note.ms - shownMs) };
}

export const ICONS = {
  W: '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#253347" stroke-width="1.4" fill="#8d603e"><rect x="3" y="9" width="18" height="3" rx="1.5" transform="rotate(-12 12 10)"/><rect x="3" y="13" width="18" height="3" rx="1.5" transform="rotate(8 12 14)"/></g><path d="M8 7l2-3M15 18l2 2" stroke="#253347" stroke-width="1.4"/></svg>',
  R: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15c0-5 4-8 9-8 5 0 7 3 7 7 0 3-3 5-8 5s-8-1-8-4z" fill="#969895" stroke="#253347" stroke-width="1.4"/></svg>',
  C: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="4" ry="8" fill="#e8c547" stroke="#253347" stroke-width="1.4"/><path d="M8 18c-3-1-4-4-4-7M16 18c3-1 4-4 4-7" stroke="#527447" stroke-width="2" fill="none"/></svg>',
  S: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="#e6b83e" stroke="#253347" stroke-width="1">' +
    Array.from({ length: 10 }, (_, i) => `<path d="M12 12l-2-8h4z" transform="rotate(${i * 36} 12 12)"/>`).join('') +
    '</g><circle cx="12" cy="12" r="4" fill="#3b2a1e" stroke="#253347"/></svg>',
  T: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7" fill="#c8463b" stroke="#253347" stroke-width="1.4"/><path d="M12 7l-3-2M12 7l3-2M12 7V4M12 7l-4 1M12 7l4 1" stroke="#527447" stroke-width="1.6"/></svg>',
  coins: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="#d9a93a" stroke="#253347" stroke-width="1.4"/><path d="M9 15l5-6 1.5 1.3-5 6-2 .6z" fill="#fff7e5" stroke="#253347" stroke-width="0.9"/></svg>',
};
// v0.21 the goal line's own marks, in the counters' ink-and-wash hand
const INK = 'stroke="#253347" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';
export const GOAL_ICONS = {
  rake: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 3.5L9 14" ${INK} stroke-width="2" fill="none"/><path d="M4.5 12.5l8 6.2" ${INK} stroke-width="2" fill="none"/><path d="M4.5 12.5l-1.6 3M7.2 14.6l-1.6 3M9.9 16.6l-1.6 3M12.5 18.7l-1.6 3" ${INK} fill="none" stroke="#2864bd" stroke-width="1.8"/></svg>`,
  shovel: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.5 3.5L10.5 12" ${INK} stroke-width="2" fill="none"/><path d="M16.5 2.6l4.6 4.3" ${INK} stroke-width="2" fill="none"/><path d="M11.8 10.4l2.6 2.6c-1 3.4-4 6.6-8.6 8.2-.9.3-1.7-.5-1.4-1.4 1.6-4.6 4.4-8.2 7.4-9.4z" fill="#2864bd" ${INK}/></svg>`,
  weed: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c0-5 .2-9 .4-16M12 21c-.6-4.6-3-8.6-7.4-11M12 21c.8-4.2 3-7.6 7.6-9.6M12 21c-1-2.6-3.2-4.4-6.6-5M12 21c1-2.4 2.8-3.8 6-4.4" fill="none" stroke="#527447" stroke-width="2.2" stroke-linecap="round"/><path d="M5 21.5h14" ${INK} fill="none"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#e6b83e" ${INK}/><path d="M7.5 12.4l3.2 3.3 6-7.2" fill="none" ${INK} stroke-width="2.2"/></svg>`,
  note: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 17.5V5.5l9-2v11" fill="none" ${INK} stroke-width="1.8"/><ellipse cx="7" cy="17.6" rx="2.9" ry="2.3" fill="#253347" ${INK}/><ellipse cx="16" cy="14.6" rx="2.9" ry="2.3" fill="#253347" ${INK}/></svg>`,
  glint: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.5 3.8 1.3 6.6 2 8 1.6.6 4.3 1.2 7.5 1.5-3.2.5-5.9 1.1-7.5 1.7-.7 1.6-1.4 4.4-2 7.8-.6-3.4-1.3-6.2-2-7.8-1.6-.6-4.3-1.2-7.5-1.7 3.2-.3 5.9-.9 7.5-1.5.7-1.400 1.500-4.200 2-8z" fill="#e6b83e" ${INK}/></svg>`,
  egg: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c3.600 0 6.500 5.400 6.500 10.200 0 4.300-2.800 7.300-6.500 7.300s-6.500-3-6.500-7.300C5.500 8.400 8.400 3 12 3z" fill="#fff7e5" ${INK}/><path d="M5.900 11.200l2.600 1.900 2.300-2.200 2.500 2.300 2.300-2.100 2.500 1.900" fill="none" stroke="#c8463b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // v0.23: the DIY line's hammer
  hammer: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 8.4L5 19.4c-.6.8-.4 1.800.3 2.300.8.500 1.800.300 2.300-.500l8-11.100" fill="#b3804f" ${INK}/><path d="M9.800 5.200l6-2.700c.7-.3 1.500 0 1.900.600l2.700 4.300c.4.700.200 1.500-.400 1.900l-2.400 1.500-1.300-2-3.700 2.300z" fill="#8f96a0" ${INK}/></svg>`,
  gift: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="10.500" rx="1.500" fill="#c8463b" ${INK}/><rect x="3" y="6.500" width="18" height="4" rx="1" fill="#d9a93a" ${INK}/><path d="M12 6.500v14M12 6.500c-2-3.800-6-3.200-4.500-.6M12 6.500c2-3.800 6-3.200 4.500-.6" fill="none" ${INK}/></svg>`,
};
const NAMES = { W: 'Wood', R: 'Stone', coins: 'Coins', C: 'Corn', S: 'Sunflowers', T: 'Tomatoes', songs: 'Songs', keepsakes: 'Keepsakes' };
export const HUD_ORDER = ['W', 'R', 'coins', 'C', 'S', 'T']; // materials and coins, then crops
// the hunt's two counters (phase two), each a button: the songbook, the keepsakes
export const HUNT_COUNTERS = ['songs', 'keepsakes'];

// v0.21 (audit 5: "a counter appears when its resource first matters (crops when planted, tomatoes
// when the bed exists)"): the counters this ledger has a use for, in HUD order. Wood, stone and
// coins: once she has some, the build that is next needs some, or a build has used some. A crop:
// once its patch is planted (the tomatoes: once the raised bed is built), or she has some. A new
// farm starts with none, and the first build's needs bring wood, stone and coins together.
export function countersShown(l) {
  const next = nextStage(l);
  const need = next && !isCommitted(l, next) ? recipe(l, next) : { W: 0, R: 0, coins: 0 };
  const used = (r) => l.paymentEvents.some((id) => (STAGES[id]?.[r] ?? 0) > 0);
  const has = {
    W: l.carried.W + (l.yard?.W ?? 0) > 0 || need.W > 0 || used('W'),
    R: l.carried.R + (l.yard?.R ?? 0) > 0 || need.R > 0 || used('R'),
    coins: l.purse > 0 || (l.lifetimeCoins ?? 0) > 0 || need.coins > 0,
  };
  for (const c of ['C', 'S', 'T']) has[c] = isCommitted(l, BASE_STAGE[c]) || l.carried[c] > 0 || l.table[c] > 0 || l.sold[c] > 0;
  return HUD_ORDER.filter((k) => has[k]);
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// the goal line's one line (guide.js `line`), as HTML: an icon, the name, each need as its icon
// and number (the one she is after now marked), and a few last words
export function goalHtml(line) {
  if (!line) return '';
  const ico = line.icon && GOAL_ICONS[line.icon] ? `<span class="g-ico">${GOAL_ICONS[line.icon]}</span>` : '';
  const needs = (line.needs ?? []).map(([k, n]) => `<span class="g-need${k === line.now ? ' now' : ''}">${ICONS[k]}<b>${n}</b></span>`).join('');
  // v0.23: at DIY time the label is the word itself, set as a tag ("DIY"), and the place follows
  const tail = line.tail ? `<span class="g-tail${line.hot ? ' place' : ''}">${esc(line.tail)}</span>` : '';
  return `${ico}<span class="g-label${line.hot ? ' tag' : ''}">${esc(line.label)}</span>${needs}${tail}`;
}
// the same line in plain words (tests, logs): "Walls · wood 6, stone 4, coins 10"
export function goalPlain(line) {
  if (!line) return '';
  const needs = (line.needs ?? []).map(([k, n]) => `${NAMES[k].toLowerCase()} ${n}`).join(', ');
  return [line.label, needs, line.tail].filter(Boolean).join(' · ');
}

export function createHud(root = document) {
  const $ = (id) => root.getElementById(id);
  const counters = $('counters');
  counters.innerHTML = HUD_ORDER.map((k) => `
    <div class="cell" data-res="${k}" hidden>
      <span class="icon">${ICONS[k]}</span>
      <span class="name">${NAMES[k]}</span>
      <span class="count" aria-live="off">0</span>
    </div>`).join('') + HUNT_COUNTERS.map((k) => `
    <button class="cell wide" type="button" data-res="${k}" hidden>
      <span class="icon">${GOAL_ICONS[k === 'songs' ? 'note' : 'gift']}</span>
      <span class="name">${NAMES[k]}</span>
      <span class="count" aria-live="off"></span>
    </button>`).join('');
  const cells = Object.fromEntries([...HUD_ORDER, ...HUNT_COUNTERS].map((k) => [k, counters.querySelector(`[data-res="${k}"]`)]));
  // which counters are up: one that has appeared stays (until a new farm: reset)
  const seen = new Set();
  let hunt = null; // { found, total, keepsakes, keepsakesTotal } in the egg hunt, else null
  let lastLedger = null;
  const huntHandlers = { songs: null, keepsakes: null };
  for (const k of HUNT_COUNTERS) cells[k].addEventListener('click', () => huntHandlers[k]?.());
  function show(k, on) {
    const c = cells[k];
    if (c.hidden !== on) return; // already so
    c.hidden = !on;
    if (on) { c.classList.remove('arrive'); void c.offsetWidth; c.classList.add('arrive'); }
  }
  function showCounters(l) {
    if (l) for (const k of countersShown(l)) seen.add(k);
    for (const k of HUD_ORDER) show(k, !hunt && seen.has(k));
    show('songs', !!hunt);
    show('keepsakes', !!hunt && hunt.keepsakes > 0);
    if (hunt) {
      cells.songs.querySelector('.count').textContent = `${hunt.found}/${hunt.total}`;
      cells.songs.setAttribute('aria-label', `Songs: ${hunt.found} of ${hunt.total} found. Open the songbook`);
      cells.keepsakes.querySelector('.count').textContent = `${hunt.keepsakes}/${hunt.keepsakesTotal}`;
      cells.keepsakes.setAttribute('aria-label', `Keepsakes: ${hunt.keepsakes} of ${hunt.keepsakesTotal} found. Open the keepsakes`);
    }
    counters.classList.toggle('hunt', !!hunt);
  }
  const goal = $('goal');
  const context = $('context');
  const progress = $('progress');
  const live = $('live');
  const toast = $('toast');
  const toastText = toast.querySelector('.text');
  let folded = false; // the player's choice for this session: later notes arrive folded (P29-2)
  const showFold = () => {
    toast.classList.toggle('folded', folded);
    toast.setAttribute('aria-expanded', String(!folded));
    toast.title = folded ? 'Unfold the note' : 'Fold the note to one line';
  };
  // a tap (or Enter / Space with it focused: it is a button) folds and unfolds it; it never
  // moves Vanessa or starts the stick
  toast.addEventListener('click', (e) => { e.stopPropagation(); folded = !folded; showFold(); });
  toast.addEventListener('pointerdown', (e) => e.stopPropagation());
  showFold();
  let leaving = 0;
  const buildbar = $('buildbar');
  const diy = $('btn-diy');
  const sale = $('btn-sale');
  let diyHandler = null;
  let saleHandler = null;
  let buildKey = '';
  let contextKey = null; // v0.26: what the context button, the Yard Sale button and the race clock
  let saleKey = null; //   last showed: main.js asks on every frame, the page is written on a change
  let raceKey = null;
  let goalKey = '';
  let goalStep = null;
  let huntKey = '';
  let contextHandler = null;
  let lastAnnounce = '';
  let announceTimer = 0;
  let toastTimer = 0;
  let shownAt = 0; // when the note on show came up
  const toastQueue = [];
  // each note stays its time plus 1 s (P29-2), then slides up out of the way and the next slides in
  function showNext() {
    const q = toastQueue[0];
    if (!q) { toast.hidden = true; onNote?.(); return; }
    shownAt = performance.now();
    toastText.textContent = q.text;
    toast.classList.remove('leaving');
    toast.hidden = false;
    onNote?.();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('leaving');
      clearTimeout(leaving);
      leaving = setTimeout(() => { toastQueue.shift(); showNext(); }, 200);
    }, (toastQueue.length > 1 ? Math.min(q.ms, 2200) : q.ms) + 1000);
  }
  let onNote = null;
  // v0.17c: the coin counter counts up to a sale's total over about 0.8 s, with a "+N" that floats
  // off it; anything else (spending, a load) shows at once. Reduced motion: at once.
  let coinShown = null;
  let coinRaf = 0;
  const still = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  function countCoins(to) {
    const el = cells.coins.querySelector('.count');
    const from = coinShown ?? to;
    if (to - from < 3 || still() || typeof requestAnimationFrame !== 'function') {
      cancelAnimationFrame?.(coinRaf); coinShown = to; el.textContent = counterText(to); return;
    }
    const plus = document.createElement('span');
    plus.className = 'coin-plus'; plus.textContent = `+${to - from}`; plus.setAttribute('aria-hidden', 'true');
    cells.coins.appendChild(plus);
    setTimeout(() => plus.remove(), 1400);
    const t0 = performance.now();
    cancelAnimationFrame(coinRaf);
    const step = (now) => {
      const k = Math.max(0, Math.min(1, (now - t0) / 800)); // a frame's time can be a little before t0
      const n = Math.round(from + (to - from) * (1 - (1 - k) ** 2));
      el.textContent = counterText(n);
      if (k < 1) coinRaf = requestAnimationFrame(step);
    };
    coinShown = to;
    coinRaf = requestAnimationFrame(step);
  }
  context.addEventListener('click', () => contextHandler?.());
  diy.addEventListener('click', () => diyHandler?.());
  sale.addEventListener('click', () => saleHandler?.());

  return {
    render(l) {
      lastLedger = l;
      showCounters(l);
      for (const k of ['W', 'R', 'C', 'S', 'T']) {
        // v0.11 (P27-1): wood and stone count the yard pile plus her head
        const pile = l.yard?.[k] ?? 0;
        const n = l.carried[k] + pile;
        cells[k].querySelector('.count').textContent = counterText(n);
        cells[k].setAttribute('aria-label', pile ? `${NAMES[k]} ${n}: ${l.carried[k]} carried, ${pile} in the pile` : `${NAMES[k]} ${n}`);
      }
      // v0.17c: a sale's coins count up with a "+N" beside them; spending shows at once
      countCoins(l.purse);
      cells.coins.setAttribute('aria-label', `Coins ${l.purse}`);
    },
    // v0.21: the goal as one line (`g.line`, guide.js), with the whole sentence (`g.text`) for
    // screen readers; a plain string still shows as it is
    setGoal(g) {
      const line = typeof g === 'string' ? { label: g } : g?.line ?? (g?.text ? { label: g.text } : null);
      const text = typeof g === 'string' ? g : g?.text ?? goalPlain(line);
      const key = JSON.stringify([line, text]);
      if (key === goalKey) return;
      // a new step (not just a number counting down) gives the line one small nod
      const step = JSON.stringify([line?.icon, line?.label, line?.now]);
      goalKey = key;
      goal.innerHTML = line ? `<span class="g-line" aria-hidden="true">${goalHtml(line)}</span><span class="sr-only">${esc(text)}</span>` : '';
      goal.title = text;
      goal.classList.toggle('wrap', !!line?.wrap);
      // v0.23 (Tiffany: "Just have the [tasks line] say DIY so that it's noticeable"): the line
      // itself is lit while it says DIY; and after a build it holds a pencilled "✓ Walls!" (audit 8)
      goal.classList.toggle('hot', !!line?.hot);
      goal.classList.toggle('done', !!line?.done);
      if (step !== goalStep && goalStep !== null && line) { goal.classList.remove('nod'); void goal.offsetWidth; goal.classList.add('nod'); }
      goalStep = step;
    },
    get goalLine() { return goal.querySelector('.g-line')?.textContent ?? ''; },
    // v0.21 the egg hunt's row: { found, total, keepsakes, keepsakesTotal } hides the materials and
    // crops and shows the songs found of all (and the keepsakes, once one is found); null: phase one
    setHunt(h, { onSongs = null, onKeepsakes = null } = {}) {
      huntHandlers.songs = onSongs; huntHandlers.keepsakes = onKeepsakes;
      const key = h ? `${h.found}/${h.total}/${h.keepsakes}/${h.keepsakesTotal}` : '';
      if (key === huntKey) return;
      huntKey = key;
      hunt = h;
      showCounters(lastLedger);
    },
    // a new farm: no counter has appeared yet
    reset() { seen.clear(); hunt = null; huntKey = ''; goalStep = null; for (const k of [...HUD_ORDER, ...HUNT_COUNTERS]) cells[k].hidden = true; },
    get countersUp() { return [...HUD_ORDER, ...HUNT_COUNTERS].filter((k) => !cells[k].hidden); },
    // `kind` 'act' (v0.23): an action to do at a place (a red circle's, the bench's), in the
    // actions' red; anything else is the plain button
    // (v0.26: asked on every frame, written when it changes)
    setContext(label, handler, kind = null) {
      contextHandler = handler;
      const key = label ? `${kind === 'act' ? 'act' : ''}|${label}` : '';
      if (key === contextKey) return;
      contextKey = key;
      if (!label) { context.hidden = true; return; }
      if (context.textContent !== label) context.textContent = label;
      context.classList.toggle('act', kind === 'act');
      context.hidden = false;
    },
    // v0.23 (audit 14): the race clock beside the menu button ("4:12"), or null for none; `done`
    // holds it still at the finish
    setRace(text, done = false) {
      const key = text ? `${done ? 1 : 0}|${text}` : '';
      if (key === raceKey) return; // (v0.26: asked on every frame, written when it changes)
      raceKey = key;
      const el = $('race-clock');
      if (!el) return;
      el.parentElement?.classList?.toggle('racing', !!text); // the goal line makes room for it
      if (!text) { el.hidden = true; return; }
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle('done', !!done);
      el.hidden = false;
    },
    triggerContext() { if (!context.hidden) contextHandler?.(); },
    // v0.12: the build line. bar: null, or { label, short, ready, here, verb, text } (guide.js
    // buildBar); `onDiy` runs when its DIY button is pressed (shown only when ready and here)
    setBuild(bar, onDiy = null) {
      diyHandler = onDiy;
      const key = bar ? JSON.stringify([bar.label, bar.short, bar.ready, bar.here, bar.verb]) : '';
      if (key === buildKey) return;
      buildKey = key;
      buildbar.hidden = !bar;
      if (!bar) return;
      // v0.13: the button as soon as everything is in hand (it pulses); away from the part it
      // says where to go, and pressing it there shows the way (main.js). v0.21: until then the
      // bottom line shows nothing: what the build still needs is on the goal line, and only there
      const button = bar.ready;
      diy.hidden = !button;
      buildbar.hidden = !button;
      diy.classList.toggle('away', bar.ready && !bar.here);
      if (!button) return;
      diy.querySelector('.verb').textContent = bar.verb === 'DIY' ? 'DIY!' : bar.verb;
      diy.querySelector('.what').textContent = bar.here ? bar.label : `${bar.label} · go there`;
      diy.setAttribute('aria-label', bar.here ? `${bar.verb}: ${bar.label}` : bar.text);
    },
    get diyShown() { return !diy.hidden && !buildbar.hidden; },
    get diyHere() { return !diy.hidden && !buildbar.hidden && !diy.classList.contains('away'); },
    get noteRect() { return toast.hidden ? null : toast.getBoundingClientRect(); },
    // main.js: the note opened, changed or closed (the play area's top moves under it)
    set onNote(fn) { onNote = fn; },
    get noteFolded() { return folded; },
    triggerDiy() { if (!diy.hidden && !buildbar.hidden) diyHandler?.(); },
    // v0.12: the Yard Sale button, shown while the table is full
    // v0.14 (captain: "yard sale button should also go yellow"): like the DIY button, flower
    // yellow and pulsing once a tap sells (six out and she is at the tables); away from them it
    // keeps the paper-and-ink look, and a tap says where to go (main.js)
    // (v0.26: asked on every frame, written when it changes)
    setSale(on, handler = null, here = true) {
      saleHandler = handler;
      const key = `${on ? 1 : 0}${here ? 1 : 0}`;
      if (key === saleKey) return;
      saleKey = key;
      sale.hidden = !on;
      sale.classList.toggle('away', on && !here);
    },
    get saleShown() { return !sale.hidden; },
    triggerSale() { if (!sale.hidden) saleHandler?.(); },
    setProgress(text) {
      if (!text) { progress.hidden = true; return; }
      if (progress.textContent !== text) progress.textContent = text;
      progress.hidden = false;
    },
    // coalesced polite announcements (spec §11.4: avoid speech spam on unit updates)
    announce(text) {
      lastAnnounce = text;
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => { live.textContent = lastAnnounce; }, 400);
    },
    // one message at a time, queued so an explainer is never overwritten
    toast(text, ms = 2600) {
      if (toastQueue.some((q) => q.text === text)) return;
      toastQueue.push({ text, ms });
      if (toastQueue.length === 1) showNext();
    },
    // v0.17: a warning that cannot wait (a bird on its way): shown now, ahead of the queue.
    // v0.20: the note it interrupts does not replay (afterInterrupt above)
    urgent(text, ms = 2600) {
      if (toastQueue[0]?.text === text) return;
      const i = toastQueue.findIndex((q) => q.text === text);
      if (i > 0) toastQueue.splice(i, 1);
      if (toastQueue.length) {
        const rest = afterInterrupt(toastQueue[0], performance.now() - shownAt);
        if (rest) toastQueue[0] = rest; else toastQueue.shift();
      }
      toastQueue.unshift({ text, ms });
      clearTimeout(leaving);
      showNext();
    },
    bump(res) {
      const c = cells[res];
      if (!c) return;
      c.classList.remove('bump');
      void c.offsetWidth;
      c.classList.add('bump');
    },
    names: RESOURCE_NAMES,
  };
}
