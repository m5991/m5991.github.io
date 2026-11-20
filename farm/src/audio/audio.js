// The game's single audio owner (spec §9, A17). One AudioContext, three gain stages:
//
//   music source ─ musicBus (musicVolume) ─┐
//   effect voices ─ effectsBus (effectsVolume) ─┴─ master (Sound on/off) ─ speakers
//
// Rules it carries out:
// - Start on an explicit gesture: the context is created and resumed inside the first tap or
//   key press (mobile autoplay rules), and only when Sound is on.
// - If the browser refuses playback, `prompt` becomes 'enable' (the UI shows `Tap to enable
//   audio`); every later gesture retries. Audio never blocks play.
// - Mute all (Sound off) silences at once and stops the audio thread; the setting is kept.
// - The theme pauses at its position while a hold is set (the pause menu, a hidden tab). A
//   hidden tab also suspends the context; on return the theme does not autoplay: `prompt`
//   becomes 'resume' and the next gesture resumes it.
// - The theme is quiet by default (musicVolume 0.35) so footsteps and gathering cues sit on top.
// - (v0.20 played a found song's short clip through this context, over the ducked theme. v0.22: a
//   found song plays whole, in place of the theme, through the song player's own element:
//   ui/songplayer.js. The clip voice and the duck are gone.)
// - One-shot effects (for the sound-effects step): loadEffect(name, url), then
//   playEffect(name, { volume, rate }) plays through the effects bus.
//
// v0.29 (Tiffany, on her phone: "Music isn't on in the main part of the game ... Eventually it said
// 'tap to resume audio' and it never did. It worked during the slide show though"): the theme is
// Web Audio and the slideshow a plain <audio> element. On an iPhone, Web Audio is silenced by the
// ring/silent switch unless the page's audio session is "playback", while a media element plays
// either way; and a context the phone interrupted (another app, the lock screen) can stay
// "interrupted", or report "running" with its clock stopped, so resume() alone never brings the
// theme back. So: the audio session is set to "playback" where the browser has the API
// (`session`); where it does not, an iPhone gets a silent looping media element on the first tap,
// which does the same (`keepAlive`); a context that is interrupted, refused, or whose clock does not
// move after a resume is replaced by a new one on the next tap (`rebuild`), the theme's buffer and
// the effects carried over, the theme going on where it was.
//
// Settings live in their own device key, not in the farm save: they apply on the title screen
// before a farm is loaded, and a progress reset keeps them (spec §12).
import { loopPoints, playhead, TRACK } from './track.js';

export const AUDIO_KEY = 'vanessas-farm/audio';
export const DEFAULT_SETTINGS = Object.freeze({ soundEnabled: true, musicVolume: 0.35, effectsVolume: 0.8 });
export const BLOCK_CHECK_MS = 900; // a resume still pending after this counts as a refusal
// v0.30 (Tiffany's "Farm changes #4": "When I click out of the game to a different page in my phone
// and then come back, it should automatically start the audio. I shouldn't have to enable audio"):
// - a hidden page no longer suspends the audio context at once: the theme stops (a hold), and the
//   context is left to the browser for HIDDEN_SUSPEND_MS. A context the page suspended itself is one
//   a phone's browser will not start again without a tap; one it only interrupted (another app, the
//   lock screen) it starts again by itself when the page is back, and the theme then goes on at once;
// - back on the page the theme comes back as soon as the context runs (a resume, or the browser's
//   own return from an interruption, `onstatechange`), with no tap where the browser allows it;
// - "Tap to resume audio" shows only if the sound is still not back RETURN_GRACE_MS after the page
//   is (v0.23-v0.29 showed it at once and waited for that tap). Any tap still brings it back.
export const HIDDEN_SUSPEND_MS = 60000;
export const RETURN_GRACE_MS = 1500;
export const MAX_EFFECT_VOICES = 8;
export const LATENCY_HINT = 'playback'; // v0.32
const FADE_IN_S = 0.4;
const FADE_OUT_S = 0.06; // short enough to feel immediate, long enough not to click

const unit = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
export function sanitizeSettings(s) {
  const o = s && typeof s === 'object' ? s : {};
  return {
    soundEnabled: typeof o.soundEnabled === 'boolean' ? o.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    musicVolume: unit(o.musicVolume, DEFAULT_SETTINGS.musicVolume),
    effectsVolume: unit(o.effectsVolume, DEFAULT_SETTINGS.effectsVolume),
  };
}
export function readSettings(storage) {
  try {
    const t = storage?.getItem(AUDIO_KEY);
    return sanitizeSettings(t ? JSON.parse(t) : null);
  } catch { return sanitizeSettings(null); }
}
function writeSettings(storage, s) {
  try { storage?.setItem(AUDIO_KEY, JSON.stringify(s)); } catch { /* storage denied: settings last this session */ }
}

// Everything browser-specific is injected so the logic runs under Node tests.
//   AudioContextCtor  window.AudioContext (or webkitAudioContext); missing = unsupported
//   load(url)         Promise<ArrayBuffer> of an encoded file
export function createAudio({ AudioContextCtor, load, storage, track = TRACK, onChange, blockCheckMs = BLOCK_CHECK_MS, session = null, keepAlive = null, clockCheckMs = 600, hiddenSuspendMs = HIDDEN_SUSPEND_MS, returnGraceMs = RETURN_GRACE_MS, timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (t) => clearTimeout(t) } } = {}) {
  let settings = readSettings(storage);
  let ctx = null;
  let master = null;
  let musicBus = null;
  let effectsBus = null;
  let unsupported = !AudioContextCtor;
  let blocked = false;
  let hidden = false;
  let awaitingReturn = false; // came back from a hidden tab; the next gesture resumes
  let returnGrace = false; // v0.30: just back on the page: no prompt yet while the sound may still come back by itself
  let hideTimer = null; // v0.30: the context is suspended only after a while hidden
  let graceTimer = null;
  let stalled = false; // v0.29: the context says it runs but its clock stands still: the next gesture replaces it
  let rebuilds = 0;
  let blockedTries = 0; // gestures made while the context stayed refused
  const holds = new Set();
  const musicLevel = () => settings.musicVolume;
  // theme
  let musicBytes = null;
  let musicBuffer = null;
  let musicState = 'none'; // none | loading | ready | error
  let musicError = null;
  let source = null;
  let sourceFrom = 0; // asset position where the current source started
  let sourceAt = 0; // context time when it started
  let savedPos = 0; // asset position to restart from after a hold
  // effects
  const effects = new Map(); // name -> { buffer?, promise }
  let voices = 0;

  const changed = () => onChange?.(api);
  const running = () => !!ctx && ctx.state === 'running';

  function ramp(param, target, seconds) {
    const t = ctx.currentTime;
    param.cancelScheduledValues?.(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(target, t + seconds);
  }

  function create() {
    // v0.29: an iPhone plays Web Audio past the silent switch only in a "playback" audio session
    try { if (session && session.type !== 'playback') session.type = 'playback'; } catch { /* not settable here */ }
    try {
      // v0.32 (Tiffany's "Edits #6": "The background soundtrack is skipping"): the context is asked for
      // its "playback" latency, the larger buffers a browser keeps for music that has to run on
      // without a gap, so a busy phone (the farm drawn 60 times a second) does not starve the theme
      // between two of its buffers. v0.10-v0.31 took the default "interactive", the smallest buffers.
      // (The effects come a few hundredths of a second later; nothing waits on them.)
      try { ctx = new AudioContextCtor({ latencyHint: LATENCY_HINT }); } catch { ctx = new AudioContextCtor(); }
    } catch {
      unsupported = true;
      return false;
    }
    master = ctx.createGain();
    musicBus = ctx.createGain();
    effectsBus = ctx.createGain();
    master.gain.value = settings.soundEnabled ? 1 : 0;
    musicBus.gain.value = musicLevel();
    effectsBus.gain.value = settings.effectsVolume;
    musicBus.connect(master);
    effectsBus.connect(master);
    master.connect(ctx.destination);
    ctx.onstatechange = () => {
      if (running()) blocked = false;
      if (running() && awaitingReturn && !hidden) backOnPage(); // v0.30: the browser started it again by itself
      reconcile(); changed();
    };
    return true;
  }

  function tryResume() {
    if (!ctx || running()) return;
    const c = ctx;
    const check = () => { if (c === ctx && !running() && settings.soundEnabled && !hidden) { blocked = true; changed(); } };
    Promise.resolve(c.resume?.()).then(() => { if (running()) { blocked = false; reconcile(); changed(); watchClock(); } else check(); }, check);
    setTimeout(check, blockCheckMs);
  }
  // v0.30: back on the page and the context runs: the theme goes on, no tap asked
  function backOnPage() {
    awaitingReturn = false; returnGrace = false;
    holds.delete('hidden');
    watchClock();
  }
  // v0.29: a context that says it runs must also move its clock; one that does not is stalled
  function watchClock() {
    const c = ctx;
    if (!c || typeof c.currentTime !== 'number') return;
    const t0 = c.currentTime;
    setTimeout(() => {
      if (c !== ctx || hidden || !running() || !settings.soundEnabled) return;
      if (c.currentTime === t0) { stalled = true; blocked = true; changed(); }
    }, clockCheckMs);
  }
  // v0.29: a new context in place of one the phone has stuck (inside a gesture, so it may start):
  // the theme goes on from where it was, the effects keep their decoded buffers
  function rebuild() {
    const pos = position();
    const old = ctx;
    if (source) { try { source.stop(); } catch { /* gone */ } source = null; }
    savedPos = pos;
    try { old?.close?.().catch?.(() => {}); } catch { /* already closed */ }
    ctx = null;
    stalled = false;
    blocked = false;
    rebuilds++;
    return create();
  }

  async function loadMusic() {
    if (musicState === 'loading' || musicState === 'ready') return;
    musicState = 'loading';
    try {
      const bytes = await (musicBytes ??= Promise.resolve().then(() => load(track.url)));
      const buffer = await decode(bytes);
      loopPoints(track, buffer.duration); // refuse a truncated decode instead of looping wrongly
      musicBuffer = buffer;
      musicState = 'ready';
    } catch (err) {
      musicError = err;
      musicState = 'error';
      globalThis.console?.warn?.('theme unavailable:', err);
    }
    reconcile();
    changed();
  }
  function decode(bytes) {
    return new Promise((resolve, reject) => {
      // the callback form also works on older Safari, where the promise form is missing
      const p = ctx.decodeAudioData(bytes.slice(0), resolve, reject);
      p?.then?.(resolve, reject);
    });
  }

  function musicShouldPlay() {
    return running() && settings.soundEnabled && holds.size === 0 && !hidden && musicState === 'ready';
  }
  function position() {
    if (!source) return savedPos;
    return playhead(ctx.currentTime - sourceAt, track, sourceFrom);
  }
  function startMusic() {
    const pts = loopPoints(track);
    source = ctx.createBufferSource();
    source.buffer = musicBuffer;
    source.loop = true;
    source.loopStart = pts.start;
    source.loopEnd = pts.end;
    const fade = ctx.createGain();
    fade.gain.value = savedPos > 0 ? 0 : 1; // the top of the song has its own fade-in
    source.connect(fade);
    fade.connect(musicBus);
    source.fade = fade;
    sourceFrom = savedPos;
    sourceAt = ctx.currentTime;
    source.start(0, savedPos);
    if (savedPos > 0) ramp(fade.gain, 1, FADE_IN_S);
  }
  function stopMusic() {
    savedPos = position();
    const s = source;
    source = null;
    if (!ctx || !s) return;
    try {
      ramp(s.fade.gain, 0, FADE_OUT_S);
      s.stop(ctx.currentTime + FADE_OUT_S + 0.01);
    } catch { /* already stopped */ }
  }
  function reconcile() {
    if (!ctx) return;
    if (musicShouldPlay() && !source) startMusic();
    else if (!musicShouldPlay() && source && (holds.size > 0 || hidden)) stopMusic();
    // Sound off or a refused context keep the source: the master gain or the stopped clock
    // already silence it, and it carries on from the same place.
  }

  const api = {
    // Call from every user gesture (tap, click, key). Idempotent and cheap.
    gesture() {
      if (unsupported || hidden) return;
      if (awaitingReturn) { awaitingReturn = false; returnGrace = false; holds.delete('hidden'); }
      if (!settings.soundEnabled) { changed(); return; }
      try { keepAlive?.(); } catch { /* the fallback is only a help */ }
      // v0.29: a context the phone has stuck (interrupted, refused before, or its clock still) is
      // replaced here, inside the tap, where a new one may start
      // (a refusal is retried once on the same context, as before; refused again, it is replaced)
      if (blocked && !running()) blockedTries++;
      if (ctx && (ctx.state === 'interrupted' || stalled || (blocked && !running() && blockedTries >= 2))) { blockedTries = 0; if (!rebuild()) { changed(); return; } }
      if (!ctx && !create()) { changed(); return; }
      tryResume();
      if (musicState === 'none') loadMusic();
      reconcile();
      changed();
    },
    // v0.23 (Tiffany: "Sound automatically starts with the game"): try to start with no gesture, as
    // the game starts. A browser that allows it plays at once; one that does not (most phones, until
    // the page is touched) leaves the context waiting, with no prompt and no button: the first
    // touch of the game, which every later `gesture()` is, starts it. Idempotent.
    autostart() {
      if (unsupported || hidden || !settings.soundEnabled) return;
      if (!ctx && !create()) { changed(); return; }
      if (musicState === 'none') loadMusic();
      if (!running()) {
        const c = ctx;
        Promise.resolve(c.resume?.()).then(() => { if (c === ctx && running()) { blocked = false; reconcile(); changed(); } }, () => {});
      }
      reconcile();
      changed();
    },
    // Download the theme early (no context needed); skipped while Sound is off.
    prefetch() {
      if (unsupported || !settings.soundEnabled || musicBytes) return;
      musicBytes = Promise.resolve().then(() => load(track.url));
      musicBytes.catch(() => {});
    },
    get settings() { return { ...settings }; },
    setSoundEnabled(on) {
      settings = { ...settings, soundEnabled: !!on };
      writeSettings(storage, settings);
      if (ctx) {
        if (on) { ramp(master.gain, 1, FADE_OUT_S); api.gesture(); }
        else {
          blocked = false;
          ramp(master.gain, 0, FADE_OUT_S); // Mute all: immediate
          const c = ctx;
          setTimeout(() => { if (c === ctx && !settings.soundEnabled) c.suspend?.().catch(() => {}); }, FADE_OUT_S * 1000 + 40);
        }
      } else if (on) api.gesture(); // turning sound on is itself a gesture
      changed();
    },
    toggleSound() { api.setSoundEnabled(!settings.soundEnabled); return settings.soundEnabled; },
    setMusicVolume(v) {
      settings = { ...settings, musicVolume: unit(v, settings.musicVolume) };
      writeSettings(storage, settings);
      if (musicBus) ramp(musicBus.gain, musicLevel(), 0.05);
      changed();
    },
    setEffectsVolume(v) {
      settings = { ...settings, effectsVolume: unit(v, settings.effectsVolume) };
      writeSettings(storage, settings);
      if (effectsBus) ramp(effectsBus.gain, settings.effectsVolume, 0.05);
      changed();
    },
    // Play the theme again from the top, intro first (the opening's replay is timed to it); the
    // loop itself is unchanged. Without a context yet, the first gesture starts at the top anyway.
    restartMusic() {
      if (source) stopMusic();
      savedPos = 0;
      reconcile();
      changed();
    },
    // Pause the theme at its position while any reason is held (e.g. 'menu').
    holdMusic(reason) { holds.add(reason); reconcile(); changed(); },
    releaseMusic(reason) { holds.delete(reason); reconcile(); changed(); },
    // Tab hidden: pause the theme and the audio thread. Visible again: wait for a gesture.
    setHidden(h) {
      h = !!h;
      if (h === hidden) return;
      hidden = h;
      if (graceTimer !== null) { timers.clear(graceTimer); graceTimer = null; }
      if (hidden) {
        holds.add('hidden');
        reconcile();
        // (v0.30: the context is suspended only after a while hidden; v0.23-v0.29 suspended it at once)
        const c = ctx;
        if (hideTimer !== null) timers.clear(hideTimer);
        hideTimer = c ? timers.set(() => { hideTimer = null; if (c === ctx && hidden) c.suspend?.()?.catch?.(() => {}); }, hiddenSuspendMs) : null;
      } else if (ctx && settings.soundEnabled) {
        if (hideTimer !== null) { timers.clear(hideTimer); hideTimer = null; }
        // v0.23: the sound comes back by itself when the browser lets it (it does once the page
        // has been touched); if it does not, the next gesture resumes, as before
        // v0.30: a context still running (it was never suspended) goes on at once; one the browser
        // interrupted comes back when it starts it again (onstatechange); the prompt waits a moment
        awaitingReturn = true;
        const c = ctx;
        if (running()) backOnPage();
        else {
          returnGrace = true;
          graceTimer = timers.set(() => { graceTimer = null; returnGrace = false; changed(); }, returnGraceMs);
          Promise.resolve(c.resume?.()).then(() => {
            if (c !== ctx || !running() || !awaitingReturn || hidden) return;
            backOnPage(); reconcile(); changed();
          }, () => {});
        }
        reconcile();
      } else {
        holds.delete('hidden'); // nothing was playing; the next gesture starts as usual
      }
      changed();
    },
    // What the UI should offer: null, 'enable' (`Tap to enable audio`) or 'resume'.
    get prompt() {
      if (unsupported || !settings.soundEnabled || hidden) return null;
      if (awaitingReturn) return returnGrace ? null : 'resume'; // (v0.30: not while it may still come back by itself)
      return blocked ? 'enable' : null;
    },
    // 'unsupported' | 'off' | 'idle' (no gesture yet) | 'blocked' | 'paused' | 'loading' | 'playing' | 'error'
    get state() {
      if (unsupported) return 'unsupported';
      if (!settings.soundEnabled) return 'off';
      if (!ctx) return 'idle';
      if (blocked) return 'blocked';
      if (musicState === 'error') return 'error';
      if (hidden || holds.size > 0 || awaitingReturn) return 'paused';
      if (musicState !== 'ready' || !running()) return 'loading';
      return 'playing';
    },
    get running() { return running(); },
    get rebuilds() { return rebuilds; }, // v0.29: contexts replaced after the phone stuck one
    get musicError() { return musicError; },
    get position() { return position(); },
    get holds() { return [...holds]; },
    get context() { return ctx; },
    get buses() { return { master, music: musicBus, effects: effectsBus }; },
    get musicSource() { return source; },

    // ---------- one-shot effects through the effects bus ----------
    loadEffect(name, url) {
      if (effects.has(name)) return effects.get(name).promise;
      const entry = {};
      entry.promise = (async () => {
        const bytes = await load(url);
        if (!ctx && !create()) throw new Error('Web Audio unavailable');
        entry.buffer = await decode(bytes);
        return entry.buffer;
      })();
      entry.promise.catch(() => {});
      effects.set(name, entry);
      return entry.promise;
    },
    // Plays now if Sound is on, the context runs and the effect is loaded; returns whether it
    // played. Effects never queue: a cue that cannot play now is dropped.
    playEffect(name, { volume = 1, rate = 1 } = {}) {
      const buffer = effects.get(name)?.buffer;
      if (!buffer || !running() || !settings.soundEnabled || voices >= MAX_EFFECT_VOICES) return false;
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      g.gain.value = unit(volume, 1);
      src.connect(g);
      g.connect(effectsBus);
      voices++;
      src.onended = () => { voices--; try { g.disconnect(); } catch { /* gone */ } };
      src.start();
      return true;
    },
    get effectVoices() { return voices; },
  };
  return api;
}
