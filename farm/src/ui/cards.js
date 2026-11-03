// Modal cards (spec §11.2). A <dialog> opened with showModal() traps focus, Escape closes it and
// focus returns to the opener. The world is paused behind every card; cards never change the
// ledger themselves, they return the player's explicit choice to the caller. v0.12 (captain:
// "no menu for selling", and builds are one DIY button): the station Build card and the market
// crate card are gone; what is left is the confirmation card (New farm).

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
