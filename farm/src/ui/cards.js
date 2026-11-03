// Modal cards (spec §11.2): the recipe card of a mat and the market crate card. A <dialog>
// opened with showModal() traps focus, Escape closes it and focus returns to the opener. The
// world is paused behind every card; cards never change the ledger themselves, they return the
// player's explicit choice (Build, Return, Sell) to the caller.
import { PRICES, STAGES, UPGRADES } from '../game/data.js';
import { lockedReason, onHand, owns, recipe, shortage, stageState, stillNeeded } from '../game/ledger.js';
import { toGoText } from '../game/guide.js';
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

    // The station's Build card (v0.11, P27-2): what the build takes, what she has toward it (her
    // head plus the yard pile for wood and stone, the purse for coins), and in plain words what
    // is still to get after this Build ("2 wood and 3 stone to go"). Build takes what she has and
    // keeps it here; once everything is in she hammers it up. A1 is hired with the same card.
    // { l, stage, onBuild, onReturn, onClose, coach }; `coach` (first-actions guide) pulses Build
    // and adds one line saying what it does
    recipe({ l, stage, onBuild, onReturn, onClose: closeCb, coach = false }) {
      const s = STAGES[stage];
      const verb = s.hire ? 'Hire' : 'Build';
      const st = stageState(l, stage);
      const title = cap(s.label);
      if (st === 'LOCKED') {
        const why = lockedReason(l, stage);
        const names = (ids) => ids.map((x) => STAGES[x].label).join(' and ');
        const text = why.kind === 'weeds' ? 'Rake the weeds on this patch first. Take the rake by the house and stand still beside them.'
          : why.kind === 'harvest' ? 'Opens after your first harvest.'
            : why.kind === 'first' ? 'Plant your first crop first: rake any crop patch.'
              : why.kind === 'second' ? `Needs ${why.stages.length ? `the ${names(why.stages)} and ` : ''}a second crop plot first.`
                : `Needs the ${names(why.stages)} first.`;
        open(`<h2 id="card-title">${esc(title)}</h2><p>${esc(text)}</p>
          <div class="actions"><button type="button" data-close autofocus>Close</button></div>`, {}, closeCb);
        return;
      }
      const rc = recipe(l, stage);
      const need = stillNeeded(l, stage);
      const have = { coins: l.purse, W: onHand(l, 'W'), R: onHand(l, 'R') };
      const rows = [['coins', 'Coins'], ['W', 'Wood'], ['R', 'Stone']]
        .filter(([k]) => rc[k] > 0)
        .map(([k, name]) => {
          const where = k === 'coins' ? 'in your purse'
            : !l.yard[k] ? 'carried' : !l.carried[k] ? 'in the pile' : `${l.carried[k]} carried, ${l.yard[k]} in the pile`;
          return `<tr><th scope="row"><span class="icon">${ICONS[k]}</span>${name}</th><td>${l.stages[stage].deposited[k]} of ${rc[k]}</td><td>${have[k]} <span class="small">· ${esc(where)}</span></td></tr>`;
        }).join('');
      const short = shortage(l, stage);
      const anyDeposited = ['coins', 'W', 'R'].some((k) => l.stages[stage].deposited[k] > 0);
      const anyToGive = ['coins', 'W', 'R'].some((k) => need[k] > 0 && have[k] > 0);
      const toGo = short.coins + short.W + short.R
        ? `${cap(toGoText(short))}${short.coins ? '. Sell crops at the market crate for coins.' : '.'}`
        : `Everything is here: ${verb.toLowerCase()} it now.`;
      const doing = s.hire ? 'The coins and wood go to the archer.' : s.crop ? 'The coins go into the plot; then dig it with the shovel.'
        : 'Vanessa builds it herself once everything is in.';
      // the heading carries what is still to get, so it shows even when the card scrolls
      open(`<h2 id="card-title">${esc(title)}<span class="to-go" id="card-short">${esc(toGo)}</span></h2>
        <table class="recipe"><thead><tr><th scope="col"></th><th scope="col">Put in</th><th scope="col">You have</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p class="small">${esc(verb)} takes what you have toward it and keeps it here, so you can bring the rest later. ${esc(doing)}</p>
        ${coach ? `<p class="coach-line" id="card-coach">Tap ${esc(verb)}: your wood, stone and coins go in.</p>` : ''}
        <div class="actions">
          <button type="button" class="primary${coach ? ' coach-pulse' : ''}" data-act="build" ${anyToGive ? 'autofocus' : 'disabled'}>${esc(verb)}</button>
          ${anyDeposited ? '<button type="button" data-act="return">Take it back to the pile</button>' : ''}
          <button type="button" data-close ${anyToGive ? '' : 'autofocus'}>Close</button>
        </div>`, {
        '[data-act="build"]': () => { dialog.close('build'); onBuild(); },
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
           ${coach ? '<p class="coach-line" id="card-coach">Sell your crops for coins.</p>' : ''}
           <div class="actions"><button type="button" class="primary${coach ? ' coach-pulse' : ''}" data-sell="all" autofocus>Sell all crops (${total} coins)</button><button type="button" data-close>Close</button></div>`
        : `<p>Nothing to sell yet — harvest your crops first.</p><div class="actions"><button type="button" data-close autofocus>Close</button></div>`;
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
