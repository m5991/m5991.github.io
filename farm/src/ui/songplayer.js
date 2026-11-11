// v0.17b (captain: "would you make a simple player when the music is playing so you can advance
// the music in the menu / also would you make the music replace the background while it plays, it
// gets stopped when you close the menu"): one song player for the whole game, apart from the cards.
// A song found in the hunt plays through it, keeps playing when its card or the menu closes, and
// can be paused, moved along (seek) or stopped from the songbook or the small now-playing bar above
// the controls. While a song is loaded (playing or paused) the theme rests; it comes back when the
// song ends or is stopped (`onActive`).
//
// v0.22 (Tiffany's notes: "Remove the Listen button. Make it automatically proceed from the part in
// the preview that it starts. The preview doesn't stop, it continues playing."): a found song
// starts by itself as its egg cracks, at its preview's first second (`from`, songs.js
// previewStart), and plays on to the end of the song. No tap starts it, and a phone refuses a
// new <audio> element that plays with no tap: so the player keeps ONE element for the whole game
// and `unlock()` blesses it on the player's first gestures (a `load()` inside the gesture, the way
// audio libraries unlock their HTML5 voices); every song then plays through that element. If the
// browser still refuses, the state says `blocked` and the caller offers a button, which is a tap.
// `prepare()` loads a song ahead of its moment (the bird is still on its way with the egg).
// The audio element is injected (`makeAudio`) so the logic is unit-tested.

export function createSongPlayer({ makeAudio = () => new Audio(), onActive = () => {}, muted = () => false } = {}) {
  let el = null; // the one element, made on first use
  let unlocked = false;
  let pendingFrom = 0; // where the song loading now starts (s)
  let prepared = null; // { id, src, from } loaded ahead, not playing
  const s = { id: null, title: '', src: '', error: false, blocked: false };
  const subs = new Set();
  const state = () => ({
    id: s.id,
    title: s.title,
    playing: s.id !== null && !!el && !el.paused && !el.ended,
    t: s.id !== null && el ? el.currentTime || 0 : 0,
    duration: s.id !== null && el && Number.isFinite(el.duration) ? el.duration : 0,
    error: s.error,
    blocked: s.blocked,
  });
  const emit = () => { const st = state(); for (const f of subs) f(st); };
  function element() {
    if (el) return el;
    el = makeAudio();
    el.preload = 'auto';
    for (const ev of ['play', 'pause', 'timeupdate', 'seeked']) el.addEventListener(ev, () => { if (s.id !== null) emit(); });
    el.addEventListener('playing', () => { if (s.id !== null && s.blocked) { s.blocked = false; emit(); } });
    // the song starts at its preview's first second: the fragment asks for it, and this makes sure
    el.addEventListener('loadedmetadata', () => {
      if (pendingFrom > 0 && Number.isFinite(el.duration) && pendingFrom < el.duration - 1 && Math.abs((el.currentTime || 0) - pendingFrom) > 0.5) {
        try { el.currentTime = pendingFrom; } catch { /* not seekable yet: it starts from the top */ }
      }
      pendingFrom = 0;
      if (s.id !== null) emit();
    });
    el.addEventListener('ended', () => { if (s.id !== null) stop(); }); // the theme comes back when the song is over
    el.addEventListener('error', () => { if (s.id !== null) { s.error = true; emit(); } });
    return el;
  }
  const srcAt = (src, from) => (from > 0 ? `${src}#t=${from}` : src);
  function load(src, from) {
    const a = element();
    pendingFrom = from > 0 ? from : 0;
    a.src = srcAt(src, pendingFrom);
    a.load?.();
  }
  function start() {
    const a = element();
    a.muted = muted();
    const p = a.play();
    p?.catch?.((err) => {
      // refused with no tap behind it (a phone that did not take the unlock): the caller offers one
      if (s.id !== null && a.paused) { s.blocked = err?.name !== 'AbortError'; emit(); }
    });
  }
  function stop() {
    const was = s.id !== null;
    prepared = null;
    if (el) {
      el.pause();
      el.removeAttribute?.('src');
      el.load?.(); // let go of the file
    }
    Object.assign(s, { id: null, title: '', src: '', error: false, blocked: false });
    if (was) onActive(false);
    emit();
  }
  // { id, src, title, from }: `from` (s) is where it starts; a song already loaded just goes on
  function play({ id, src, title, from = 0 }) {
    if (s.id === id && el) { if (el.paused) start(); emit(); return; }
    const was = s.id !== null;
    const ready = prepared && prepared.id === id && prepared.src === src && prepared.from === from;
    prepared = null;
    Object.assign(s, { id, title, src, error: false, blocked: false });
    if (!ready) load(src, from);
    if (!was) onActive(true);
    start();
    emit();
  }
  return {
    get state() { return state(); },
    get active() { return s.id !== null; },
    get element() { return s.id !== null ? el : null; }, // v0.17c: the farm dances to it (main.js, audio/beat.js)
    get unlocked() { return unlocked; },
    // a tap or a key: bless the element so a later song may start with no tap (never while a song is loaded)
    unlock() {
      if (unlocked || s.id !== null || prepared) return;
      unlocked = true;
      try { element().load?.(); } catch { /* nothing to unlock in this browser */ }
    },
    // load a song ahead of its moment; nothing plays, and a song that is playing is left alone
    prepare({ id, src, from = 0 }) {
      if (s.id !== null) return;
      if (prepared && prepared.id === id) return;
      prepared = { id, src, from };
      load(src, from);
    },
    play,
    stop,
    pause() { if (s.id !== null && el && !el.paused) el.pause(); emit(); },
    resume() { if (s.id !== null && el && el.paused) start(); emit(); },
    toggle() { if (s.id === null || !el) return; if (el.paused) start(); else el.pause(); emit(); },
    seek(t) {
      if (s.id === null || !el) return;
      const d = Number.isFinite(el.duration) ? el.duration : Infinity;
      el.currentTime = Math.max(0, Math.min(d, Number(t) || 0));
      emit();
    },
    setMuted(on) { if (el) el.muted = on; },
    subscribe(f) { subs.add(f); f(state()); return () => subs.delete(f); },
  };
}

// m:ss
export const fmtTime = (t) => (Number.isFinite(t) && t >= 0 ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '–:––');
