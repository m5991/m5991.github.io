// Modal cards (spec §11.2). A <dialog> opened with showModal() traps focus, Escape closes it and
// focus returns to the opener. The world is paused behind every card; cards never change the
// ledger themselves, they return the player's explicit choice to the caller. v0.12 (captain:
// "no menu for selling", and builds are one DIY button): the station Build card and the market
// crate card are gone; what is left is the confirmation card (New farm).

import { fmtTime } from './songplayer.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createCards(dialog, { player = null } = {}) {
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
    dialog.scrollTop = 0; // v0.20: a long card (the songbook) opens at its top, not scrolled down to its Close button
  }

  // v0.16: a song found, or one from the songbook: its title, a line, and Listen (in the game),
  // Download MP3 (both editions) and Open in Suno (the full edition only: `suno` null hides it).
  // `available` false (no song files in this build) disables Listen and Download and says so.
  // v0.17b: Listen plays through the game's one song player (`player`, ui/songplayer.js), so the
  // song keeps playing when the card closes; the song that is loaded shows a seek bar and its time.
  // v0.20 (audit 4): each song shows one line of its own lyrics, quoted (`lyric`), on its card and
  // in the songbook; (audit 1) while its discovery clip plays (`clip`, audio/clips.js) the found
  // card shows "A taste of it…" with a small moving equaliser, gone when the clip ends.
  let unsubs = [];
  // a line of the song's own words; " / " in it is a line break in the song
  const lyricLine = (line) => (line ? `<blockquote class="song-lyric"><span aria-hidden="true">“</span>${esc(line)}<span aria-hidden="true">”</span></blockquote>` : '');
  function songActions({ src, download, suno, available }) {
    return `<div class="song-actions">
      <button type="button" class="primary" data-act="listen" ${available ? '' : 'disabled'} aria-pressed="false"><span class="ic" aria-hidden="true">▶</span> <span class="lbl">Listen</span></button>
      ${available ? `<a class="button" data-act="download" href="${esc(src)}" download="${esc(download)}"><span aria-hidden="true">⬇</span> Download MP3</a>` : '<button type="button" disabled>⬇ Download MP3</button>'}
      ${suno ? `<a class="button" data-act="suno" href="${esc(suno)}" target="_blank" rel="noopener noreferrer">Open in Suno ↗</a>` : ''}
    </div>${available ? '' : '<p class="small song-missing">The song files are not in this build.</p>'}
    <div class="song-seek" hidden><input type="range" min="0" max="1" step="0.5" value="0" aria-label="Where in the song"><span class="song-time small" aria-live="off"></span></div>`;
  }
  function wireListen(root, { id, src, title }) {
    const btn = root.querySelector('[data-act="listen"]');
    const seek = root.querySelector('.song-seek');
    const range = seek?.querySelector('input');
    const time = seek?.querySelector('.song-time');
    if (!btn || !player) return;
    let dragging = false;
    btn.addEventListener('click', () => { if (player.state.id === id) player.toggle(); else player.play({ id, src, title }); });
    range.addEventListener('input', () => { dragging = true; time.textContent = `${fmtTime(Number(range.value))} / ${fmtTime(Number(range.max))}`; });
    range.addEventListener('change', () => { dragging = false; player.seek(Number(range.value)); });
    unsubs.push(player.subscribe((st) => {
      const mine = st.id === id;
      const on = mine && st.playing;
      btn.setAttribute('aria-pressed', String(on));
      btn.querySelector('.ic').textContent = on ? '❚❚' : '▶';
      btn.querySelector('.lbl').textContent = on ? 'Pause' : mine ? 'Play' : 'Listen';
      seek.hidden = !mine;
      if (!mine) return;
      if (st.error) { time.textContent = 'This song could not be played.'; return; }
      if (st.duration) range.max = String(st.duration);
      if (!dragging) range.value = String(st.t);
      if (!dragging) time.textContent = `${fmtTime(st.t)} / ${fmtTime(st.duration)}`;
    }));
  }
  dialog.addEventListener('close', () => { for (const u of unsubs) u(); unsubs = []; });

  return {
    get isOpen() { return dialog.open; },

    // v0.16 a song card: { id, title, songTitle, lyric, text, src, download, suno, available, clip, onClose }
    song(o) {
      open(`<h2 id="card-title">${esc(o.title)}</h2>${lyricLine(o.lyric)}<p class="song-taste" role="status" hidden><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span> A taste of it…</p><p>${esc(o.text)}</p>${songActions(o)}<div class="actions"><button type="button" data-close autofocus>${esc(o.cancel ?? 'Lovely')}</button></div>`, {}, o.onClose);
      wireListen(dialog, { id: o.id, src: o.src, title: o.songTitle ?? o.title });
      const taste = dialog.querySelector('.song-taste');
      if (o.clip && taste) unsubs.push(o.clip.subscribe((st) => { taste.hidden = !(st.playing && st.id === o.id); }));
    },
    // v0.16 the songbook: { title, intro, songs: [{ id, title, src, download, suno }], left, available, onClose }
    songbook(o) {
      const rows = o.songs.map((x) => `<li class="song-row" data-id="${esc(x.id)}"><span class="song-title">${esc(x.title)}</span>${lyricLine(x.lyric)}${songActions({ ...x, available: o.available })}</li>`).join('');
      open(`<h2 id="card-title">${esc(o.title)}</h2>${o.stamp ? `<p class="stamp" role="img" aria-label="${esc(o.stamp)}">${esc(o.stamp)}</p>` : ''}<p>${esc(o.intro)}</p>${rows ? `<ol class="songbook">${rows}</ol>` : ''}${o.left ? `<p class="small">${esc(o.left)}</p>` : ''}<div class="actions"><button type="button" data-close autofocus>Close</button></div>`, {}, o.onClose);
      dialog.querySelectorAll('.song-row').forEach((row, i) => wireListen(row, o.songs[i]));
    },
    // v0.17c a keepsake found, or the list of them: { title, text, prints: [{ image, alt, title, year, caption }], left, onClose }
    prints(o) {
      const figs = o.prints.map((g) => `<figure class="keepsake-print"><img src="${esc(g.image)}" alt="${esc(g.alt)}" loading="lazy"><figcaption><span class="t">${esc(g.title)}</span>${g.year ? ` <span class="y">${g.year}</span>` : ''}${g.caption ? `<q>${esc(g.caption)}</q>` : ''}</figcaption></figure>`).join('');
      open(`<h2 id="card-title">${esc(o.title)}</h2>${o.text ? `<p>${esc(o.text)}</p>` : ''}${figs ? `<div class="keepsake-prints">${figs}</div>` : ''}${o.left ? `<p class="small">${esc(o.left)}</p>` : ''}<div class="actions"><button type="button" data-close autofocus>${esc(o.cancel ?? 'Lovely')}</button></div>`, {}, o.onClose);
    },
    // v0.17c "Draw it": the picture, and a link that saves it ({ title, text, src, download, onClose })
    picture(o) {
      open(`<h2 id="card-title">${esc(o.title)}</h2><p>${esc(o.text)}</p><figure class="keepsake-print drawing"><img src="${esc(o.src)}" alt="${esc(o.alt ?? 'The farm, drawn in pencil')}"></figure><div class="actions"><a class="button primary" href="${esc(o.src)}" download="${esc(o.download)}">⬇ Save the picture</a><button type="button" data-close autofocus>Close</button></div>`, {}, o.onClose);
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
