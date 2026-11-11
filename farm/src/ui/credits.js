// The slideshow (v0.17's end credits, spec §5.1; v0.22, Tiffany: "Call it slideshow", offered at
// the end and kept in Extras, never started by itself): quiet paper over the coloured drawing at the
// finale camera. A print of each gift joke, taped onto the page on the side away from the lyrics,
// its title, year and the words printed on it; a message card per sender (none yet: the section is
// left out); a closing card; and the lyric being sung on a paper panel in the lower third, the
// next one lighter beneath. Skip (top corner, Escape) and Pause (Space) are the only controls.
// The song plays once through a plain <audio> element (the theme rests meanwhile); its clock drives
// everything, and with Sound off or the song blocked or missing a silent clock runs the same
// times. The content file, the lyrics and the prints load only when the credits start.
// v0.20: the prints are the photos of the drawing over the years, shown as a slideshow (each one
// fades in over the last, numbered "3 / 26"); `photos()` false shows none (v0.20's kids edition).
import { creditsAt, planCredits, validateCredits } from '../game/credits.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const CREDITS_URL = 'assets/credits/credits.json';
const AHEAD = 3; // photos loaded ahead of the one on show
const FADE_MS = 700; // a card fades out under the next one

export function createCredits({ el, fetchJson, soundOn, reducedMotion, onStart, onEnd, holdMusic, releaseMusic, photos = () => true }) {
  const card = el.querySelector('.credits-card');
  const now = el.querySelector('.credits-lyrics .now');
  const next = el.querySelector('.credits-lyrics .next');
  const live = el.querySelector('.credits-live');
  const pauseBtn = el.querySelector('[data-act="pause"]');
  const skipBtn = el.querySelector('[data-act="skip"]');
  const s = { active: false, paused: false, t: 0, plan: null, lyrics: null, audio: null, shown: null, lineShown: null, images: new Map(), token: 0 };

  // v0.20: the photos load a few ahead of the one on show (`from`: the plan's card index), not all
  // 26 at once when the credits start: the first is there for the title's five seconds, and each
  // later one has three photos' time to arrive
  function preload(c, from = 0, ahead = AHEAD) {
    let n = 0;
    for (const g of c.cards.slice(from)) {
      if (g.kind === 'gift' && ++n > ahead) break;
      for (const src of g.kind === 'gift' ? [g.image] : g.kind === 'prints' ? g.items.map((x) => x.image) : []) {
        if (!src || s.images.has(src)) continue;
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
        s.images.set(src, img);
      }
    }
  }
  function cardHtml(c) {
    if (c.kind === 'title') return `<div class="credits-paper title"><h2>${esc(c.title)}</h2><p class="song">♪ ${esc(c.song)}</p></div>`;
    if (c.kind === 'gift') {
      return `<figure class="credits-print ${c.side}"><span class="tape" aria-hidden="true"></span><img src="${esc(c.image)}" alt="${esc(c.alt)}"><figcaption><span class="t">${esc(c.title)}</span>${c.year ? `<span class="y">${c.year}</span>` : ''}${c.of ? `<span class="n" aria-hidden="true">${c.n} / ${c.of}</span>` : ''}${c.caption ? `<q>${esc(c.caption)}</q>` : ''}</figcaption></figure>`;
    }
    if (c.kind === 'prints') return `<div class="credits-paper prints">${c.items.map((g) => `<img src="${esc(g.image)}" alt="${esc(g.alt)}">`).join('')}</div>`;
    if (c.kind === 'message') return `<div class="credits-paper message"><p class="from">${esc(c.from)}</p><p class="text">${esc(c.text)}</p></div>`;
    return `<div class="credits-paper closing" tabindex="0" role="region" aria-label="Closing text; scroll to read"><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p></div>`;
  }
  // what a screen reader hears once per card (the lyric lines are not announced one by one)
  function cardSpeech(c) {
    if (c.kind === 'gift') return `${c.title}${c.year ? `, ${c.year}` : ''}. ${c.alt}${c.caption ? ` It says: ${c.caption}` : ''}`;
    if (c.kind === 'message') return `From ${c.from}: ${c.text}`;
    if (c.kind === 'title') return `The slideshow. ${c.title}. The song: ${c.song}.`;
    if (c.kind === 'prints') return `${c.items.length} more gifts.`;
    return `${c.title} ${c.text}`;
  }
  function render() {
    const at = creditsAt(s.plan, s.lyrics, s.t);
    if (at.card !== s.shown) {
      s.shown = at.card;
      card.classList.toggle('reduced', reducedMotion());
      // v0.20 a slideshow: the card on show fades out while the next fades in over it
      const old = [...card.children];
      for (const o of old.slice(0, -1)) o.remove();
      const prev = old.at(-1);
      if (prev) { prev.classList.remove('in'); prev.classList.add('leaving'); setTimeout(() => prev.remove(), reducedMotion() ? 160 : FADE_MS); }
      if (at.card) {
        card.insertAdjacentHTML('beforeend', cardHtml(at.card));
        card.lastElementChild.classList.add('in');
        live.textContent = cardSpeech(at.card);
        preload(s.plan, s.plan.cards.indexOf(at.card) + 1);
      }
    }
    const key = at.line ? at.line.t : null;
    if (key !== s.lineShown) {
      s.lineShown = key;
      now.textContent = at.line?.text ?? '';
      next.textContent = at.next?.text ?? '';
      el.querySelector('.credits-lyrics').classList.toggle('empty', !at.line && !at.next);
    } else if (!at.line && at.next && next.textContent !== at.next.text) next.textContent = at.next.text;
    return at;
  }

  async function start() {
    if (s.active) return;
    const token = ++s.token;
    s.active = true; s.paused = false; s.t = 0; s.shown = undefined; s.lineShown = undefined;
    el.hidden = false;
    card.innerHTML = '';
    now.textContent = ''; next.textContent = '';
    pauseBtn.textContent = 'Pause';
    onStart?.();
    holdMusic?.();
    let content = null;
    try { content = await fetchJson(CREDITS_URL); } catch { content = null; }
    let lyrics = null;
    try { lyrics = content ? await fetchJson(content.song.lyrics) : null; } catch { lyrics = null; }
    if (token !== s.token) return;
    if (!content || validateCredits(content, lyrics).length) content = { version: 1, song: content?.song ?? null, gifts: [], messages: [], closing: null };
    s.lyrics = lyrics;
    // the song: its length from the file once known (181 s for The House), else from the lyrics
    const guess = Math.max(60, ...(lyrics?.lines ?? []).map((l) => l.end + 4));
    const opts = { photos: photos() };
    s.plan = planCredits(content, guess, opts);
    preload(s.plan);
    if (content.song?.audio) {
      const a = new Audio(content.song.audio);
      a.preload = 'auto';
      s.audio = a;
      a.addEventListener('loadedmetadata', () => { if (token === s.token && Number.isFinite(a.duration)) { s.plan = planCredits(content, a.duration, opts); preload(s.plan); s.shown = undefined; } });
      a.addEventListener('error', () => { if (s.audio === a) s.audio = null; }); // a failed song: the silent clock
      a.addEventListener('ended', () => { if (s.audio === a) finish(); });
      if (soundOn()) a.play().catch(() => { /* blocked: the silent clock runs, the song may still start with a tap */ });
    }
    render();
    pauseBtn.focus({ preventScroll: true });
  }
  // the clock: the song's own while it plays, else a silent one with the same times
  function update(dtMs) {
    if (!s.active || !s.plan) return;
    const a = s.audio;
    if (!s.paused) {
      if (a && !a.paused && !a.ended && a.currentTime > 0) s.t = a.currentTime;
      else s.t += dtMs / 1000;
    }
    const at = render();
    if (at.done && !(a && !a.paused && !a.ended)) finish();
  }
  function togglePause() {
    if (!s.active) return;
    s.paused = !s.paused;
    pauseBtn.textContent = s.paused ? 'Play' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(s.paused));
    if (s.audio) { if (s.paused) s.audio.pause(); else if (soundOn()) { s.audio.currentTime = s.t; s.audio.play().catch(() => {}); } }
  }
  function finish() {
    if (!s.active) return;
    s.active = false;
    s.token++;
    if (s.audio) { s.audio.pause(); s.audio = null; }
    el.hidden = true;
    card.innerHTML = '';
    releaseMusic?.();
    onEnd?.();
  }
  // Sound turned on or off while they play
  function setSound(on) {
    const a = s.audio;
    if (!a) return;
    if (!on) a.pause();
    else if (!s.paused) { a.currentTime = s.t; a.play().catch(() => {}); }
  }
  // a hidden tab pauses them, the way it pauses the theme
  function setHidden(h) { if (s.active && h && !s.paused) togglePause(); }
  pauseBtn.addEventListener('click', togglePause);
  skipBtn.addEventListener('click', finish);
  return {
    get active() { return s.active; },
    get paused() { return s.paused; },
    get time() { return s.t; },
    get plan() { return s.plan; },
    start, update, togglePause, skip: finish, setSound, setHidden,
    seek(t) { s.t = t; if (s.audio) s.audio.currentTime = t; render(); },
  };
}
