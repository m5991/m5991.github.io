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
// - The theme ducks (v0.20): while a reason is set with duckMusic (a found song's short clip is
//   playing) it keeps playing at DUCK.level of its volume, and swells back when the reason goes.
// - A song's clip plays through this context too (clipVoice): the context was started by the
//   player's own gesture, so the clip needs none of its own (a new <audio> element started with no
//   tap is refused on phones), and Mute all silences it with everything else.
// - One-shot effects (for the sound-effects step): loadEffect(name, url), then
//   playEffect(name, { volume, rate }) plays through the effects bus.
//
// Settings live in their own device key, not in the farm save: they apply on the title screen
// before a farm is loaded, and a progress reset keeps them (spec §12).
import { loopPoints, playhead, TRACK } from './track.js';

export const AUDIO_KEY = 'vanessas-farm/audio';
export const DEFAULT_SETTINGS = Object.freeze({ soundEnabled: true, musicVolume: 0.35, effectsVolume: 0.8 });
export const BLOCK_CHECK_MS = 900; // a resume still pending after this counts as a refusal
export const MAX_EFFECT_VOICES = 8;
const FADE_IN_S = 0.4;
const FADE_OUT_S = 0.06; // short enough to feel immediate, long enough not to click
// v0.20: the theme under a song's discovery clip: down to `level` of its volume in `downS`, back in `upS`
export const DUCK = Object.freeze({ level: 0.18, downS: 0.25, upS: 0.8 });

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
export function createAudio({ AudioContextCtor, load, storage, track = TRACK, onChange, blockCheckMs = BLOCK_CHECK_MS } = {}) {
  let settings = readSettings(storage);
  let ctx = null;
  let master = null;
  let musicBus = null;
  let effectsBus = null;
  let unsupported = !AudioContextCtor;
  let blocked = false;
  let hidden = false;
  let awaitingReturn = false; // came back from a hidden tab; the next gesture resumes
  const holds = new Set();
  const ducks = new Set();
  const musicLevel = () => settings.musicVolume * (ducks.size ? DUCK.level : 1);
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
  // clips (v0.20): the last few decoded, by url
  const clipBuffers = new Map();
  const CLIPS_KEPT = 3;
  function clipBuffer(url) {
    if (!clipBuffers.has(url)) {
      const p = Promise.resolve().then(() => load(url)).then((bytes) => {
        if (!ctx) throw new Error('no audio context');
        return decode(bytes);
      });
      p.catch(() => clipBuffers.delete(url)); // a failed one may be tried again
      clipBuffers.set(url, p);
      for (const k of clipBuffers.keys()) { if (clipBuffers.size <= CLIPS_KEPT) break; if (k !== url) clipBuffers.delete(k); }
    }
    return clipBuffers.get(url);
  }

  const changed = () => onChange?.(api);
  const running = () => !!ctx && ctx.state === 'running';

  function ramp(param, target, seconds) {
    const t = ctx.currentTime;
    param.cancelScheduledValues?.(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(target, t + seconds);
  }

  function create() {
    try {
      ctx = new AudioContextCtor();
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
    ctx.onstatechange = () => { if (running()) blocked = false; reconcile(); changed(); };
    return true;
  }

  function tryResume() {
    if (!ctx || running()) return;
    const c = ctx;
    const check = () => { if (c === ctx && !running() && settings.soundEnabled && !hidden) { blocked = true; changed(); } };
    Promise.resolve(c.resume?.()).then(() => { if (running()) { blocked = false; reconcile(); changed(); } else check(); }, check);
    setTimeout(check, blockCheckMs);
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
      if (awaitingReturn) { awaitingReturn = false; holds.delete('hidden'); }
      if (!settings.soundEnabled) { changed(); return; }
      if (!ctx && !create()) { changed(); return; }
      tryResume();
      if (musicState === 'none') loadMusic();
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
    // v0.20: keep the theme playing, quietly, while any reason is set (a song's clip over it)
    duckMusic(reason) { ducks.add(reason); if (musicBus) ramp(musicBus.gain, musicLevel(), DUCK.downS); changed(); },
    unduckMusic(reason) { if (!ducks.delete(reason)) return; if (musicBus) ramp(musicBus.gain, musicLevel(), DUCK.upS); changed(); },
    get ducked() { return ducks.size > 0; },
    // Tab hidden: pause the theme and the audio thread. Visible again: wait for a gesture.
    setHidden(h) {
      h = !!h;
      if (h === hidden) return;
      hidden = h;
      if (hidden) {
        holds.add('hidden');
        reconcile();
        ctx?.suspend?.().catch(() => {});
      } else if (ctx && settings.soundEnabled) {
        awaitingReturn = true; // no autoplay after returning: the next gesture resumes
      } else {
        holds.delete('hidden'); // nothing was playing; the next gesture starts as usual
      }
      changed();
    },
    // What the UI should offer: null, 'enable' (`Tap to enable audio`) or 'resume'.
    get prompt() {
      if (unsupported || !settings.soundEnabled || hidden) return null;
      if (awaitingReturn) return 'resume';
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

    // ---------- a song's clip (v0.20, audio/clips.js) ----------
    // Fetch and decode a clip ahead of its moment (the bird is still on its way with the egg).
    primeClip(url) { if (running() && settings.soundEnabled) clipBuffer(url).catch(() => {}); },
    // One clip as a voice with the few things clips.js asks of an <audio> element: play() (a
    // promise, refused when the context is not running or Sound is off), pause(), `volume`, and
    // the 'ended' event. It goes straight to the master gain, at the songs' own level.
    clipVoice(url) {
      const on = {};
      let node = null; let gain = null; let over = false; let volume = 1;
      return {
        addEventListener(ev, fn) { on[ev] = fn; },
        removeAttribute() {},
        get volume() { return volume; },
        set volume(v) { volume = unit(v, volume); if (gain) ramp(gain.gain, volume, 0.03); },
        play() {
          if (!running() || !settings.soundEnabled) return Promise.reject(new Error('audio is not running'));
          return clipBuffer(url).then((buffer) => {
            if (over) return;
            node = ctx.createBufferSource();
            node.buffer = buffer;
            gain = ctx.createGain();
            gain.gain.value = volume;
            node.connect(gain);
            gain.connect(master);
            node.onended = () => { if (!over) { over = true; on.ended?.(); } try { gain.disconnect(); } catch { /* gone */ } };
            node.start();
          });
        },
        pause() {
          over = true;
          try { node?.stop(); } catch { /* not started, or already stopped */ }
        },
      };
    },
  };
  return api;
}
