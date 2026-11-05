// v0.17b (captain: "would you make a simple player when the music is playing so you can advance
// the music in the menu / also would you make the music replace the background while it plays, it
// gets stopped when you close the menu"): one song player for the whole game, apart from the cards.
// A song found in the hunt plays through it from its card or the songbook, keeps playing when the
// card or the menu closes, and can be paused, moved along (seek) or stopped from the card, the
// songbook or the small now-playing bar above the controls. While a song is loaded (playing or
// paused) the theme rests; it comes back when the song ends or is stopped (`onActive`).
// The audio element is injected (`makeAudio`) so the logic is unit-tested.

export function createSongPlayer({ makeAudio = (src) => new Audio(src), onActive = () => {}, muted = () => false } = {}) {
  let el = null;
  const s = { id: null, title: '', src: '', error: false };
  const subs = new Set();
  const state = () => ({
    id: s.id,
    title: s.title,
    playing: !!el && !el.paused && !el.ended,
    t: el ? el.currentTime || 0 : 0,
    duration: el && Number.isFinite(el.duration) ? el.duration : 0,
    error: s.error,
  });
  const emit = () => { const st = state(); for (const f of subs) f(st); };
  function release() {
    if (!el) return;
    el.pause();
    el.removeAttribute?.('src');
    el = null;
  }
  function stop() {
    const was = s.id !== null;
    release();
    Object.assign(s, { id: null, title: '', src: '', error: false });
    if (was) onActive(false);
    emit();
  }
  function play({ id, src, title }) {
    if (s.id === id && el) { if (el.paused) el.play()?.catch?.(() => {}); emit(); return; }
    const was = s.id !== null;
    release();
    Object.assign(s, { id, title, src, error: false });
    el = makeAudio(src);
    el.preload = 'auto';
    el.muted = muted();
    for (const ev of ['play', 'pause', 'timeupdate', 'loadedmetadata', 'seeked']) el.addEventListener(ev, emit);
    el.addEventListener('ended', () => stop()); // the theme comes back when the song is over
    el.addEventListener('error', () => { s.error = true; emit(); });
    if (!was) onActive(true);
    el.play()?.catch?.(() => emit());
    emit();
  }
  return {
    get state() { return state(); },
    get active() { return s.id !== null; },
    get element() { return el; }, // v0.17c: the farm dances to it (main.js, audio/beat.js)
    play,
    stop,
    pause() { if (el && !el.paused) el.pause(); emit(); },
    resume() { if (el && el.paused) el.play()?.catch?.(() => {}); emit(); },
    toggle() { if (!el) return; if (el.paused) el.play()?.catch?.(() => {}); else el.pause(); emit(); },
    seek(t) {
      if (!el) return;
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
