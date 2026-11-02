// Modal cards (spec §11.2): the recipe card of a mat and the market crate card. A <dialog>
// opened with showModal() traps focus, Escape closes it and focus returns to the opener. The
// world is paused behind every card; cards never change the ledger themselves, they return the
// player's explicit choice (Confirm delivery, Return, Sell) to the caller.
import { PRICES, RESOURCE_NAMES, STAGES, UPGRADES } from '../game/data.js';
import { lockedReason, owns, stageState, stillNeeded } from '../game/ledger.js';
import { ICONS } from './hud.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function createCards(dialog) {
  let onClose = null;
  dialog.addEventListener('close', () => { const f = onClose; onClose = null; f?.(dialog.returnValue); });

  function open(html, handlers, closeCb) {
    dialog.innerHTML = html;
    onClose = closeCb;
    for (const [sel, fn] of Object.entries(handlers)) {
      dialog.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => fn(b)));
    }
    dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close('close')));
    if (!dialog.open) dialog.showModal();
    (dialog.querySelector('[autofocus]') ?? dialog.querySelector('button'))?.focus();
  }

  return {
    get isOpen() { return dialog.open; },
    close(v = 'close') { if (dialog.open) dialog.close(v); },

    // { l, stage, onConfirm, onReturn, onClose, coach }; `coach` (first-actions guide) pulses
    // Confirm delivery and adds one line saying what it does
    recipe({ l, stage, onConfirm, onReturn, onClose: closeCb, coach = false }) {
      const s = STAGES[stage];
      const st = stageState(l, stage);
      const title = cap(s.label);
      if (st === 'LOCKED') {
        const why = lockedReason(l, stage);
        const text = why.kind === 'weeds' ? 'Clear the weeds here first. Stand still beside them.'
          : `Needs the ${why.stages.map((x) => STAGES[x].label).join(' and ')} first.`;
        open(`<h2 id="card-title">${esc(title)}</h2><p>${esc(text)}</p><p class="small">Locked mats accept nothing.</p>
          <div class="actions"><button type="button" data-close autofocus>Close</button></div>`, {}, closeCb);
        return;
      }
      const need = stillNeeded(l, stage);
      const rows = [['coins', 'Coins', l.purse], ['W', 'Wood', l.carried.W], ['R', 'Stone', l.carried.R]]
        .filter(([k]) => s[k] > 0)
        .map(([k, name, have]) => {
          const dep = l.stages[stage].deposited[k];
          const still = need[k];
          return `<tr><th scope="row"><span class="icon">${ICONS[k]}</span>${name}</th><td>${have}</td><td>${dep}</td><td>${s[k]}</td><td>${still}</td></tr>`;
        }).join('');
      const short = rows && ['coins', 'W', 'R'].filter((k) => s[k] > 0 && need[k] > (k === 'coins' ? l.purse : l.carried[k]));
      const anyDeposited = ['coins', 'W', 'R'].some((k) => l.stages[stage].deposited[k] > 0);
      const shortText = short.length
        ? `Still short after this delivery: ${short.map((k) => `${need[k] - (k === 'coins' ? l.purse : l.carried[k])} ${k === 'coins' ? 'coins' : RESOURCE_NAMES[k]}`).join(', ')}.${short.includes('coins') ? ' Sell crops at the market crate.' : ''}`
        : 'You carry enough to finish this.';
      open(`<h2 id="card-title">${esc(title)}</h2>
        <table class="recipe"><thead><tr><th scope="col"></th><th scope="col">In purse / carried</th><th scope="col">Deposited</th><th scope="col">Required</th><th scope="col">Still needed</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p class="small">Wood goes in first, then stone, then the coins in one go. Partial delivery is safe: what you deposit stays here, and Return gives it back.</p>
        <p class="small" id="card-short">${esc(shortText)}</p>
        ${coach ? '<p class="coach-line" id="card-coach">Confirm to hand over your coins, wood and stone.</p>' : ''}
        <div class="actions">
          <button type="button" class="primary${coach ? ' coach-pulse' : ''}" data-act="confirm" autofocus>Confirm delivery</button>
          ${anyDeposited ? '<button type="button" data-act="return">Return deposited resources</button>' : ''}
          <button type="button" data-close>Close</button>
        </div>`, {
        '[data-act="confirm"]': () => { dialog.close('confirm'); onConfirm(); },
        '[data-act="return"]': () => { dialog.close('return'); onReturn(); },
      }, closeCb);
    },

    // { l, onSell(mode), onBuy(item), onClose, coach, tab }; `coach` (first-actions guide, P24-4b)
    // pulses Sell all crops and adds one line saying what it does. The Buy tab (§6.5) opens after
    // the first sale: optional tool upgrades for coins, each confirmed in the card before it is
    // bought (`Buy … for n coins?`), never required.
    crate({ l, onSell, onBuy, onClose: closeCb, coach = false, tab = 'sell' }) {
      const shopOpen = l.sold.C + l.sold.S + l.sold.T > 0;
      const tabs = `<div class="tabs" role="tablist">
        <button type="button" role="tab" aria-selected="${tab === 'sell'}" data-tab="sell">Sell</button>
        ${shopOpen ? `<button type="button" role="tab" aria-selected="${tab === 'buy'}" data-tab="buy">Buy</button>` : ''}</div>`;
      const switchTo = (t) => this.crate({ l, onSell, onBuy, onClose: closeCb, coach, tab: t });
      if (tab === 'buy' && shopOpen) {
        const rows = Object.entries(UPGRADES).map(([id, u]) => {
          const action = owns(l, id) ? '<span class="small">Owned</span>'
            : l.purse >= u.coins ? `<button type="button" data-buy="${id}">Buy for ${u.coins} coins</button>`
              : `<span class="small">Need ${u.coins - l.purse} more coins</span>`;
          return `<tr><th scope="row">${esc(cap(u.label))}</th><td class="small">${esc(u.effect)}</td><td>${action}</td></tr>`;
        }).join('');
        open(`<h2 id="card-title">Market crate</h2>${tabs}
          <p class="small">Spare coins buy upgrades for the rake and the shovel. You never need them to finish the farm. Purse: ${l.purse} coins.</p>
          <table class="recipe"><tbody>${rows}</tbody></table>
          <div class="actions"><button type="button" data-close autofocus>Close</button></div>`, {
          '[data-tab]': (b) => switchTo(b.dataset.tab),
          '[data-buy]': (b) => {
            const id = b.dataset.buy;
            const u = UPGRADES[id];
            open(`<h2 id="card-title">Buy the ${esc(u.label)} for ${u.coins} coins?</h2>
              <p>${esc(u.effect)}</p><p class="small">Purchases cannot be returned.</p>
              <div class="actions"><button type="button" class="primary" data-act="buy" autofocus>Buy for ${u.coins} coins</button>
              <button type="button" data-act="back">Back</button></div>`, {
              '[data-act="buy"]': () => { dialog.close('buy'); onBuy?.(id); },
              '[data-act="back"]': () => switchTo('buy'),
            }, closeCb);
          },
        }, closeCb);
        return;
      }
      const crops = [['C', 'Corn', 'corn'], ['S', 'Sunflowers', 'sunflowers'], ['T', 'Tomatoes', 'tomatoes']].filter(([k]) => l.carried[k] > 0);
      const total = crops.reduce((n, [k]) => n + l.carried[k] * PRICES[k], 0);
      const rows = crops.map(([k, name, lower]) => `<tr><th scope="row"><span class="icon">${ICONS[k]}</span>${name}</th>
        <td>${l.carried[k]} × ${PRICES[k]} = ${l.carried[k] * PRICES[k]} coins</td>
        <td><button type="button" data-sell="${k}">Sell ${lower}</button></td></tr>`).join('');
      const body = crops.length
        ? `<table class="recipe"><tbody>${rows}</tbody></table>
           ${coach ? '<p class="coach-line" id="card-coach">Sell your corn for coins.</p>' : ''}
           <div class="actions"><button type="button" class="primary${coach ? ' coach-pulse' : ''}" data-sell="all" autofocus>Sell all crops (${total} coins)</button><button type="button" data-close>Close</button></div>`
        : `<p>Nothing to sell yet — harvest corn, sunflowers or tomatoes.</p><div class="actions"><button type="button" data-close autofocus>Close</button></div>`;
      open(`<h2 id="card-title">Market crate</h2>
        ${tabs}
        <p class="small">Corn 2, sunflowers 3, tomatoes 5 coins each. Selling happens one crop at a time while you stay here.</p>
        ${body}
        <p class="small">Earned so far: ${l.lifetimeCoins} coins</p>`, {
        '[data-sell]': (b) => { dialog.close('sell'); onSell(b.dataset.sell === 'all' ? 'all' : b.dataset.sell); },
        '[data-tab]': (b) => switchTo(b.dataset.tab),
      }, closeCb);
    },

    // generic message / confirmation
    message({ title, text, confirm, cancel = 'Close', onConfirm, onClose: closeCb }) {
      open(`<h2 id="card-title">${esc(title)}</h2><p>${esc(text)}</p><div class="actions">
        ${confirm ? `<button type="button" class="primary" data-act="ok">${esc(confirm)}</button>` : ''}
        <button type="button" data-close ${confirm ? 'autofocus' : 'autofocus'}>${esc(cancel)}</button></div>`, {
        '[data-act="ok"]': () => { dialog.close('ok'); onConfirm?.(); },
      }, closeCb);
    },
  };
}
