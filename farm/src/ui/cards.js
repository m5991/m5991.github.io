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

  // The songs' cards. All sound goes through the game's one song player (`player`,
  // ui/songplayer.js), so a song keeps playing when its card closes.
  // v0.20 (audit 4): each song shows one line of its own lyrics, quoted (`lyric`).
  // v0.22 (Tiffany: "Remove the Listen button. ... The only option should be lovely when you get a
  // song. You can download at the end under the extras the songs tab"): the found card has no
  // Listen, no download and no link: the song is already playing, and the card says so with a
  // small moving equaliser. The songbook's rows have Play (the row's seek bar shows while its song
  // is loaded), Download MP3 and, where the song has a public page, Open in Suno.
  let unsubs = [];
  // a line of the song's own words; " / " in it is a line break in the song
  const lyricLine = (line) => (line ? `<blockquote class="song-lyric"><span aria-hidden="true">“</span>${esc(line)}<span aria-hidden="true">”</span></blockquote>` : '');
  const EQ = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  function songActions({ src, download, suno, available }) {
    return `<div class="song-actions">
      <button type="button" class="primary" data-act="play" ${available ? '' : 'disabled'} aria-pressed="false"><span class="ic" aria-hidden="true">▶</span> <span class="lbl">Play</span></button>
      ${available ? `<a class="button" data-act="download" href="${esc(src)}" download="${esc(download)}"><span aria-hidden="true">⬇</span> Download MP3</a>` : '<button type="button" disabled>⬇ Download MP3</button>'}
      ${suno ? `<a class="button" data-act="suno" href="${esc(suno)}" target="_blank" rel="noopener noreferrer">Open in Suno ↗</a>` : ''}
    </div>${available ? '' : '<p class="small song-missing">The song files are not in this build.</p>'}
    <div class="song-seek" hidden><input type="range" min="0" max="1" step="0.5" value="0" aria-label="Where in the song"><span class="song-time small" aria-live="off"></span></div>`;
  }
  function wirePlay(root, { id, src, title }) {
    const btn = root.querySelector('[data-act="play"]');
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
      btn.querySelector('.lbl').textContent = on ? 'Pause' : 'Play';
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

    // v0.22 a song found: { id, title, songTitle, lyric, text, src, from, available, onClose }.
    // One button, Lovely. "Now playing" shows while its song plays. `tap` appears only when the
    // browser refused to start the song with no tap behind it: that button is the tap.
    song(o) {
      open(`<h2 id="card-title">${esc(o.title)}</h2>${lyricLine(o.lyric)}<p class="song-taste" role="status" hidden>${EQ} Now playing</p><p>${esc(o.text)}</p><div class="song-actions tap" hidden><button type="button" data-act="tap"><span aria-hidden="true">▶</span> Play it</button></div><div class="actions"><button type="button" class="primary" data-close autofocus>Lovely</button></div>`, {}, o.onClose);
      const taste = dialog.querySelector('.song-taste');
      const tap = dialog.querySelector('.song-actions.tap');
      if (!player) return;
      tap.querySelector('button').addEventListener('click', () => player.play({ id: o.id, src: o.src, title: o.songTitle ?? o.title, from: o.from ?? 0 }));
      unsubs.push(player.subscribe((st) => {
        const mine = st.id === o.id;
        taste.hidden = !(mine && st.playing);
        tap.hidden = !(mine && st.blocked && !st.playing);
      }));
    },
    // the songbook: { title, intro, songs: [{ id, number, title, playTitle, lyric, src, download, suno }], stamp, left, available, onClose }
    // v0.22: only the songs found, in list order (no row for a song still to find)
    songbook(o) {
      // v0.23: every song is listed, found or not; a found one carries a small mark
      const rows = o.songs.map((x) => `<li class="song-row${x.found ? ' found' : ''}" data-id="${esc(x.id)}"><span class="song-title">${esc(x.title)}${x.found ? ' <span class="song-found" title="Found on the farm"><span aria-hidden="true">✓</span><span class="sr-only"> found on the farm</span></span>' : ''}</span>${lyricLine(x.lyric)}${songActions({ ...x, available: o.available })}</li>`).join('');
      open(`<h2 id="card-title">${esc(o.title)}</h2>${o.stamp ? `<p class="stamp" role="img" aria-label="${esc(o.stamp)}">${esc(o.stamp)}</p>` : ''}<p>${esc(o.intro)}</p>${rows ? `<ol class="songbook">${rows}</ol>` : ''}${o.left ? `<p class="small">${esc(o.left)}</p>` : ''}<div class="actions"><button type="button" data-close autofocus>Close</button></div>`, {}, o.onClose);
      dialog.querySelectorAll('.song-row').forEach((row) => { const x = o.songs.find((y) => y.id === row.dataset.id); wirePlay(row, { id: x.id, src: x.src, title: x.playTitle ?? x.title }); });
    },
    // v0.17c a keepsake found, or the list of them: { title, text, prints: [{ image, alt, title, caption }], left, onClose }
    // v0.22 (Tiffany: "Remove the dates on the keepsakes"): a print shows its title and the words
    // on it, never its year
    prints(o) {
      const figs = o.prints.map((g) => `<figure class="keepsake-print"><img src="${esc(g.image)}" alt="${esc(g.alt)}" loading="lazy"><figcaption><span class="t">${esc(g.title)}</span>${g.caption ? `<q>${esc(g.caption)}</q>` : ''}</figcaption></figure>`).join('');
      open(`<h2 id="card-title">${esc(o.title)}</h2>${o.text ? `<p>${esc(o.text)}</p>` : ''}${figs ? `<div class="keepsake-prints">${figs}</div>` : ''}${o.left ? `<p class="small">${esc(o.left)}</p>` : ''}<div class="actions"><button type="button" data-close autofocus>${esc(o.cancel ?? 'Lovely')}</button></div>`, {}, o.onClose);
    },
    // a picture and a link that saves it ({ title, text, src, alt, download, save, onClose }).
    // v0.22 "The drawing": Vanessa's own drawing, to download
    // v0.23 (audit 12, the postcard): `stats` ([[label, value]]) is a strip of this farm's numbers
    // under the picture (`statsText` reads it out), and `share` a button that hands the picture
    // with that strip to `onShare(img, say)`: `say` puts a word under the buttons.
    picture(o) {
      const strip = o.stats?.length ? `<dl class="stats-strip" aria-label="${esc(o.statsText ?? '')}">${o.stats.map(([k, v]) => `<div><dd>${esc(v)}</dd><dt>${esc(k)}</dt></div>`).join('')}</dl>` : '';
      open(`<h2 id="card-title">${esc(o.title)}</h2><p>${esc(o.text)}</p><figure class="keepsake-print drawing"><img src="${esc(o.src)}" alt="${esc(o.alt ?? '')}"></figure>${strip}<div class="actions">${o.share ? `<button type="button" class="primary" data-act="share"><span aria-hidden="true">↗</span> ${esc(o.share)}</button>` : ''}<a class="button${o.share ? '' : ' primary'}" href="${esc(o.src)}" download="${esc(o.download)}">⬇ ${esc(o.save ?? 'Save the picture')}</a><button type="button" data-close autofocus>Close</button></div><p class="small share-said" role="status"></p>`, {
        '[data-act="share"]': async (b) => {
          const img = dialog.querySelector('figure img');
          const said = dialog.querySelector('.share-said');
          b.disabled = true;
          try { await o.onShare?.(img, (t) => { said.textContent = t; }); } catch { said.textContent = 'That did not work here. Download the drawing instead.'; }
          b.disabled = false;
        },
      }, o.onClose);
    },
    // (v0.23, Tiffany: "Get rid of the credits tab": the Credits card of v0.22 is gone)
    close(v = 'close') { if (dialog.open) dialog.close(v); },

    // generic message / confirmation
    // (v0.23, audit 14: `extra` is a second way to go on, with a line that says what it is: the
    // new farm's "as a race")
    message({ title, text, confirm, cancel = 'Close', onConfirm, onClose: closeCb, extra = null, extraNote = '', onExtra = null }) {
      open(`<h2 id="card-title">${esc(title)}</h2><p>${esc(text)}</p><div class="actions">
        ${confirm ? `<button type="button" class="primary" data-act="ok">${esc(confirm)}</button>` : ''}
        ${extra ? `<button type="button" data-act="extra">${esc(extra)}</button>` : ''}
        <button type="button" data-close ${confirm ? 'autofocus' : 'autofocus'}>${esc(cancel)}</button></div>${extra && extraNote ? `<p class="small">${esc(extraNote)}</p>` : ''}`, {
        '[data-act="ok"]': () => { dialog.close('ok'); onConfirm?.(); },
        '[data-act="extra"]': () => { dialog.close('extra'); onExtra?.(); },
      }, closeCb);
    },
  };
}
