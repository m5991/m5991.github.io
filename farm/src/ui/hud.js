// DOM HUD (annex §D.9; spec §11.1): carried counters with names, icons and the plain count, the
// coin purse (v0.11: wood and stone include the yard pile), the goal line, one contextual action,
// a nonmodal progress label and a polite live region. v0.12: the build line at the bottom (the
// next build's needs counting down, then its DIY button) and the Yard Sale button. It only presents ledger and controller state. Counters show just the number (captain,
// 2026-11-01): the 12-unit cap is told at the refusal moment (toast and status), not here.
import { RESOURCE_NAMES } from '../game/data.js';

export const counterText = (n) => String(Math.min(9999, n));

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
  const toastQueue = [];
  function showNext() {
    const q = toastQueue[0];
    if (!q) { toast.hidden = true; return; }
    toast.textContent = q.text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastQueue.shift(); showNext(); }, toastQueue.length > 1 ? Math.min(q.ms, 2200) : q.ms);
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
      cells.coins.querySelector('.count').textContent = counterText(l.purse);
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
      const button = bar.ready && bar.here;
      diy.hidden = !button;
      need.hidden = button;
      need.classList.toggle('go', bar.ready && !bar.here);
      if (button) {
        diy.querySelector('.verb').textContent = bar.verb === 'DIY' ? 'DIY!' : bar.verb;
        diy.querySelector('.what').textContent = bar.label;
        diy.setAttribute('aria-label', `${bar.verb}: ${bar.label}`);
        return;
      }
      const cap = bar.label[0].toUpperCase() + bar.label.slice(1);
      if (bar.ready) { need.textContent = bar.text; return; }
      const items = [['W', bar.short.W], ['R', bar.short.R], ['coins', bar.short.coins]].filter(([, n]) => n > 0);
      need.innerHTML = `<span class="label">${cap}:</span>${items.map(([k, n]) => `<span class="item">${ICONS[k]}${n}</span>`).join('')}`;
      need.setAttribute('aria-label', bar.text);
    },
    get diyShown() { return !diy.hidden && !buildbar.hidden; },
    triggerDiy() { if (!diy.hidden && !buildbar.hidden) diyHandler?.(); },
    // v0.12: the Yard Sale button, shown while the table is full
    setSale(on, handler = null) { saleHandler = handler; sale.hidden = !on; },
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
