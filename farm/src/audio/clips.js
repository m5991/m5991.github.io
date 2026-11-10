// v0.20 (design audit 1, building the approved A16: "use all the exact supplied crops as discovery
// excerpts"): a found song's discovery clip, the captain's own short crop of it (4 to 25 s), plays
// once as its egg cracks and its card opens. It is the song answering the crack: the theme ducks
// under it (`onActive`, audio.js duckMusic) and comes back when it ends. It plays through even if
// the card is closed; anything that needs the sound ends it with a short fade: Listen (the whole
// song takes over), another egg, the pause menu, the credits, a hidden tab. With Sound off no clip
// plays. One clip at a time. The voice (`makeAudio`: in the game the audio owner's clipVoice, which
// plays through the context the player's gesture started, so a phone does not refuse it) and the
// fade's timer are injected, so the logic is unit-tested (test/v020.test.mjs).

export const CLIP = { fadeMs: 320, stepMs: 40 };

export function createClipPlayer({
  makeAudio = (src) => new Audio(src), onActive = () => {}, muted = () => false,
  setTimer = (fn, ms) => setInterval(fn, ms), clearTimer = (t) => clearInterval(t),
} = {}) {
  let el = null;
  let id = null;
  let fading = null;
  const subs = new Set();
  const state = () => ({ id, playing: !!el });
  const emit = () => { const st = state(); for (const f of subs) f(st); };
  // the clip is over (it ended, failed, or was stopped): the theme comes back
  function end() {
    if (!el) return;
    if (fading !== null) { clearTimer(fading); fading = null; }
    const a = el;
    el = null; id = null;
    a.pause();
    a.removeAttribute?.('src');
    onActive(false);
    emit();
  }
  // -> true when the clip started (false with Sound off)
  function play(newId, src) {
    if (muted()) return false;
    const was = !!el;
    if (was) { // straight on to the next one: the theme stays ducked
      if (fading !== null) { clearTimer(fading); fading = null; }
      el.pause(); el.removeAttribute?.('src');
    }
    const a = makeAudio(src);
    el = a; id = newId;
    a.preload = 'auto';
    a.addEventListener('ended', () => { if (el === a) end(); });
    a.addEventListener('error', () => { if (el === a) end(); }); // no file: the crack and the card stand alone
    if (!was) onActive(true);
    a.play()?.catch?.(() => { if (el === a) end(); }); // refused by the browser: no clip, the theme back
    emit();
    return true;
  }
  // end it now, with a short fade (`fade` false: at once)
  function stop({ fade = true } = {}) {
    if (!el) return;
    if (!fade || fading !== null) { end(); return; }
    const a = el;
    const from = Number.isFinite(a.volume) ? a.volume : 1;
    let t = 0;
    fading = setTimer(() => {
      t += CLIP.stepMs;
      if (el !== a) return;
      if (t >= CLIP.fadeMs) { end(); return; }
      try { a.volume = Math.max(0, from * (1 - t / CLIP.fadeMs)); } catch { /* a browser that fixes the volume: it just ends */ }
    }, CLIP.stepMs);
  }
  return {
    get playing() { return !!el; },
    get id() { return id; },
    get state() { return state(); },
    play,
    stop,
    // Sound turned off while it plays: it ends at once
    setMuted(on) { if (on) stop({ fade: false }); },
    subscribe(f) { subs.add(f); f(state()); return () => subs.delete(f); },
  };
}
