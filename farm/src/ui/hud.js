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
import { RESOURCE_NAMES } from '../game/data.js';

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
const NAMES = { W: 'Wood', R: 'Stone', coins: 'Coins', C: 'Corn', S: 'Sunflowers', T: 'Tomatoes' };
export const HUD_ORDER = ['W', 'R', 'coins', 'C', 'S', 'T']; // portrait 3x2: materials+coins, then crops

export function createHud(root = document) {
  const $ = (id) => root.getElementById(id);
  const counters = $('counters');
  counters.innerHTML = HUD_ORDER.map((k) => `
    <div class="cell" data-res="${k}">
      <span class="icon">${ICONS[k]}</span>
      <span class="name">${NAMES[k]}</span>
      <span class="count" aria-live="off">0</span>
    </div>`).join('');
  const cells = Object.fromEntries(HUD_ORDER.map((k) => [k, counters.querySelector(`[data-res="${k}"]`)]));
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
  const need = buildbar.querySelector('.need');
  const diy = $('btn-diy');
  const sale = $('btn-sale');
  let diyHandler = null;
  let saleHandler = null;
  let buildKey = '';
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
    setGoal(text) { if (goal.textContent !== text) goal.textContent = text; },
    setContext(label, handler) {
      contextHandler = handler;
      if (!label) { context.hidden = true; return; }
      if (context.textContent !== label) context.textContent = label;
      context.hidden = false;
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
      // says where to go, and pressing it there shows the way (main.js)
      const button = bar.ready;
      diy.hidden = !button;
      need.hidden = button;
      diy.classList.toggle('away', bar.ready && !bar.here);
      if (button) {
        diy.querySelector('.verb').textContent = bar.verb === 'DIY' ? 'DIY!' : bar.verb;
        diy.querySelector('.what').textContent = bar.here ? bar.label : `${bar.label} · go there`;
        diy.setAttribute('aria-label', bar.here ? `${bar.verb}: ${bar.label}` : bar.text);
        return;
      }
      const cap = bar.label[0].toUpperCase() + bar.label.slice(1);
      const items = [['W', bar.short.W], ['R', bar.short.R], ['coins', bar.short.coins]].filter(([, n]) => n > 0);
      need.innerHTML = `<span class="label">${cap}:</span>${items.map(([k, n]) => `<span class="item">${ICONS[k]}${n}</span>`).join('')}`;
      need.setAttribute('aria-label', bar.text);
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
    setSale(on, handler = null, here = true) { saleHandler = handler; sale.hidden = !on; sale.classList.toggle('away', on && !here); },
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
