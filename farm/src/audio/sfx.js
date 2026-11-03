// Sound-effect cues: which file a game moment plays, how loud, and how often (spec §9; standing
// bar A24-8). This module owns no audio: it decides, then hands each one-shot to the single
// audio owner through `play(file, { gain, rate })`, where the effects bus applies effectsVolume
// and Mute all. Files are original synthesized sounds (tools/make-sfx.mjs, assets/sfx/CREDITS.md),
// normalised to one loudness; the mix lives in CUES.gain here.
// Repeats never machine-gun: a cue closer than its `gapMs` to the last one is dropped (never
// queued), cues bunched inside DENSITY_MS get progressively softer, and every play varies its
// pitch and level a little (plus a different take, for cues with several). A UI tap yields to any
// other cue started in the same moment (a Confirm button plays Confirm, not a tap as well).
// Reduced motion changes nothing here: sound follows the event, not the animation.

export const SFX_PATH = 'assets/sfx/';

// gain: mix level 0..1 (all files share one loudness); gapMs: minimum spacing between two plays;
// pitch: random detune range in semitones (±); vol: random level cut, fraction (0..vol);
// density: softening step per recent play (0 = none)
export const CUES = {
  step: { files: ['step-1', 'step-2', 'step-3', 'step-4'], gain: 0.22, gapMs: 110, pitch: 1.2, vol: 0.25, density: 0 },
  weed: { files: ['weed'], gain: 0.5, gapMs: 250, pitch: 1, vol: 0.15 },
  tick: { files: ['tick'], gain: 0.3, gapMs: 90, pitch: 1.5, vol: 0.2 },
  pop: { files: ['pop'], gain: 0.38, gapMs: 55, pitch: 1.5, vol: 0.2 },
  full: { files: ['full'], gain: 0.42, gapMs: 1500, pitch: 0, vol: 0 },
  landW: { files: ['land-wood'], gain: 0.42, gapMs: 60, pitch: 1.5, vol: 0.2 },
  landR: { files: ['land-stone'], gain: 0.36, gapMs: 60, pitch: 1.5, vol: 0.2 },
  coin: { files: ['coin-1', 'coin-2'], gain: 0.3, gapMs: 70, pitch: 1, vol: 0.25 },
  confirm: { files: ['confirm'], gain: 0.45, gapMs: 300, pitch: 0, vol: 0 },
  complete: { files: ['complete'], gain: 0.5, gapMs: 1500, pitch: 0, vol: 0 },
  sell: { files: ['sell'], gain: 0.36, gapMs: 80, pitch: 1, vol: 0.2 },
  chirp: { files: ['chirp-1', 'chirp-2'], gain: 0.28, gapMs: 700, pitch: 2, vol: 0.3 },
  squawk: { files: ['squawk'], gain: 0.38, gapMs: 600, pitch: 1, vol: 0.15 },
  tap: { files: ['tap'], gain: 0.3, gapMs: 50, pitch: 0.5, vol: 0.1, density: 0 },
  cue: { files: ['cue'], gain: 0.34, gapMs: 1500, pitch: 0, vol: 0 },
  // the falling branch (P25-5): it snaps free in the tree, then lands
  crack: { files: ['crack'], gain: 0.34, gapMs: 800, pitch: 1, vol: 0.1 },
  thud: { files: ['thud'], gain: 0.42, gapMs: 800, pitch: 1, vol: 0.1 },
  brush: { files: ['brush'], gain: 0.4, gapMs: 400, pitch: 1, vol: 0.15 }, // a colour wash (spec v0.9 §10.9)
  // a hammer strike as Vanessa builds (spec v0.11 §10.10): the wood knock, lower and softer
  tock: { files: ['land-wood'], gain: 0.5, gapMs: 200, pitch: 0.6, vol: 0.12 },
};

// the cue for a unit arriving on a pile, by resource code (W wood, R stone; a crop landing in the
// market crate is a sale: its thud and a small coin)
export const LAND_CUE = { W: 'landW', R: 'landR', C: 'sell', S: 'sell', T: 'sell', coins: 'coin' };

export const DENSITY_MS = 500; // plays of one cue within this window soften the next one
export const DENSITY_STEP = 0.12; // level cut per recent play
export const DENSITY_FLOOR = 0.45; // never softer than this fraction
export const TAP_YIELD_MS = 40; // a tap this close after another cue is dropped
export const ALL_CUES_PER_100MS = 6; // global cap on new effects in any 100 ms

// the cue a ledger event plays the moment it is applied (unit landings play theirs on arrival:
// LAND_CUE, the pop and the building's completion are wired where those presentations end)
export function ledgerCue(e) {
  switch (e.type) {
    case 'picked': return 'tick';
    case 'full': return 'full';
    case 'weedCleared': return 'weed';
    case 'dug': return 'weed'; // the same earthy tug as a weed coming up
    case 'toolTaken': return 'tick';
    default: return null;
  }
}

// play(file, { gain, rate }) -> void: the audio owner's one-shot on the effects bus
// now() -> ms; random() -> 0..1 (injected for tests)
export function createSfx({ play, now = () => performance.now(), random = Math.random, cues = CUES } = {}) {
  const last = {}; // cue -> ms of its last play
  const recent = {}; // cue -> ms of its plays within DENSITY_MS
  const lastFile = {}; // cue -> index of its last take
  let all = []; // ms of every play within 100 ms
  let lastOther = -Infinity; // ms of the last non-tap cue
  const stats = { played: 0, dropped: 0 };

  // -> { file, gain, rate } when it plays, or null when throttled
  function cue(name, { gain = 1 } = {}) {
    const c = cues[name];
    if (!c) return null;
    const t = now();
    if (t - (last[name] ?? -Infinity) < c.gapMs) { stats.dropped++; return null; }
    if (name === 'tap' && t - lastOther < TAP_YIELD_MS) { stats.dropped++; return null; }
    all = all.filter((x) => t - x < 100);
    if (all.length >= ALL_CUES_PER_100MS) { stats.dropped++; return null; }
    const r = (recent[name] ?? []).filter((x) => t - x < DENSITY_MS);
    const soften = Math.max(DENSITY_FLOOR, 1 - (c.density ?? DENSITY_STEP) * r.length);
    let i = Math.floor(random() * c.files.length);
    if (c.files.length > 1 && i === lastFile[name]) i = (i + 1) % c.files.length;
    const detune = (random() * 2 - 1) * (c.pitch ?? 0);
    const out = {
      file: c.files[i],
      gain: c.gain * gain * soften * (1 - random() * (c.vol ?? 0)),
      rate: 2 ** (detune / 12),
    };
    last[name] = t;
    r.push(t);
    recent[name] = r;
    lastFile[name] = i;
    all.push(t);
    if (name !== 'tap') lastOther = t;
    stats.played++;
    play(out.file, { gain: out.gain, rate: out.rate });
    return out;
  }

  return { cue, stats };
}

// every file the cues use, for preloading through the audio owner
export function sfxFiles(cues = CUES) {
  return [...new Set(Object.values(cues).flatMap((c) => c.files))];
}
