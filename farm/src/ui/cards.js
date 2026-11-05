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
    // a card closed just now whose close event has not fired yet: run its close first, so a card
    // opened straight after one (the songbook after a song) never swallows it
    if (!dialog.open && onClose) { const f = onClose; onClose = null; f(dialog.returnValue); }
    dialog.innerHTML = html;
    onClose = closeCb;
    for (const [sel, fn] of Object.entries(handlers)) {
      dialog.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => fn(b)));
    }
    dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close('close')));
    if (!dialog.open) dialog.showModal();
    (dialog.querySelector('[autofocus]') ?? dialog.querySelector('button'))?.focus();
  }

  // v0.16: a song found, or one from the songbook: its title, a line, and Listen (in the game),
  // Download MP3 (both editions) and Open in Suno (the full edition only: `suno` null hides it).
  // `available` false (no song files in this build) disables Listen and Download and says so.
  let player = null;
  function songActions({ src, download, suno, available }) {
    return `<div class="song-actions">
      <button type="button" class="primary" data-act="listen" ${available ? '' : 'disabled'} aria-pressed="false"><span class="ic" aria-hidden="true">▶</span> <span class="lbl">Listen</span></button>
      ${available ? `<a class="button" data-act="download" href="${esc(src)}" download="${esc(download)}"><span aria-hidden="true">⬇</span> Download MP3</a>` : '<button type="button" disabled>⬇ Download MP3</button>'}
      ${suno ? `<a class="button" data-act="suno" href="${esc(suno)}" target="_blank" rel="noopener noreferrer">Open in Suno ↗</a>` : ''}
    </div>${available ? '' : '<p class="small song-missing">The song files are not in this build.</p>'}
    <div class="song-time small" aria-live="off"></div>`;
  }
  function wireListen(root, { src, onPlay, onStop }) {
    const btn = root.querySelector('[data-act="listen"]');
    const time = root.querySelector('.song-time');
    if (!btn) return;
    const fmt = (t) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '–:––');
    btn.addEventListener('click', () => {
      if (player && player.src.endsWith(src) && !player.paused) { player.pause(); return; }
      if (player) player.pause();
      player = new Audio(src);
      player.preload = 'auto';
      const show = (on) => { btn.setAttribute('aria-pressed', String(on)); btn.querySelector('.ic').textContent = on ? '❚❚' : '▶'; btn.querySelector('.lbl').textContent = on ? 'Pause' : 'Listen'; };
      player.addEventListener('play', () => { show(true); onPlay?.(player); });
      player.addEventListener('pause', () => { show(false); onStop?.(); });
      player.addEventListener('ended', () => { show(false); onStop?.(); });
      player.addEventListener('timeupdate', () => { if (time) time.textContent = `${fmt(player.currentTime)} / ${fmt(player.duration)}`; });
      player.addEventListener('error', () => { show(false); if (time) time.textContent = 'This song could not be played.'; onStop?.(); });
      player.play().catch(() => { show(false); onStop?.(); });
    });
  }
  function stopSong() { if (player) { player.pause(); player = null; } }
  dialog.addEventListener('close', stopSong);

  return {
    get isOpen() { return dialog.open; },
    get playing() { return !!player && !player.paused; },
    stopSong,

    // v0.16 a song card: { title, text, src, download, suno, available, onPlay, onStop, onClose }
    song(o) {
      open(`<h2 id="card-title">${esc(o.title)}</h2><p>${esc(o.text)}</p>${songActions(o)}<div class="actions"><button type="button" data-close autofocus>${esc(o.cancel ?? 'Lovely')}</button></div>`, {}, o.onClose);
      wireListen(dialog, o);
    },
    // v0.16 the songbook: { title, intro, songs: [{ id, title, src, download, suno }], left, available, onPlay, onStop, onClose }
    songbook(o) {
      const rows = o.songs.map((x) => `<li class="song-row" data-id="${esc(x.id)}"><span class="song-title">${esc(x.title)}</span>${songActions({ ...x, available: o.available })}</li>`).join('');
      open(`<h2 id="card-title">${esc(o.title)}</h2><p>${esc(o.intro)}</p>${rows ? `<ol class="songbook">${rows}</ol>` : ''}${o.left ? `<p class="small">${esc(o.left)}</p>` : ''}<div class="actions"><button type="button" data-close autofocus>Close</button></div>`, {}, o.onClose);
      dialog.querySelectorAll('.song-row').forEach((row, i) => wireListen(row, { ...o.songs[i], onPlay: o.onPlay, onStop: o.onStop }));
    },
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
