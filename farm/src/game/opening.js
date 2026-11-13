// The opening (spec v0.10 §4.1, A26-1…A26-3, P26-1…P26-3: "the paper comes to life"): the game
// opens on the redrawn drawing lying on paper, in ink with no colour, the title pencilled
// beside it. The page rests, silent, until the first tap or Enter/Space; that starts the theme
// from 0 s and the opening runs on the theme's own clock: the page holds while the intro
// begins, the camera sinks toward the sheet and its flat lines lift into the live world in its
// start state, the camera eases down to the play camera, Vanessa's ink figure fills with
// colour, and control passes on the verse downbeat (the theme's loopStart, 12.640 s). It plays on a
// device's first launch and at the start of every new farm, and it cannot be skipped (v0.25; until
// v0.24 any tap or key after the start skipped to the same end state, and it played once per
// device). Pure data and arithmetic: unit-tested.
import { TRACK } from '../audio/track.js';

// the theme's intro: the handoff is the verse downbeat that starts the loop
export const INTRO_MS = Math.round((TRACK.loopStartSample / TRACK.sampleRate) * 1000); // 12640
export const BAR_MS = 1600; // the intro's 150 BPM grid, 4 beats a bar

// ms on the theme's clock after the first tap (spans are [from, to]); on bar lines where they can
export const OPENING = Object.freeze({
  hold: [0, 2 * BAR_MS], // 1. the page holds while the intro begins; the tap mark and Sound fade
  dive: [2 * BAR_MS, 4 * BAR_MS], // 2. the camera sinks until the drawing fills its frame
  handoff: [3.75 * BAR_MS, 4.25 * BAR_MS], // the paper gives way to the live world, drawn the same
  lift: [4 * BAR_MS, 5 * BAR_MS], // parts not built yet turn into blueprint ghosts; play elements come up
  wash: [4.5 * BAR_MS, 4.5 * BAR_MS + 800], // what is usable from the start takes its colour, rising from the ground
  camera: [4 * BAR_MS, 6 * BAR_MS], // from the drawing framing down to the play camera behind D17
  stepIn: [6 * BAR_MS, 6 * BAR_MS + 500], // 3. Vanessa fills with colour (the 0.5 s wash), into her idle
  total: INTRO_MS, // handoff: the HUD and the guide's first step, on the verse downbeat
});

// reduced motion: no write-in, no camera move, no lifting lines and no washes; the page holds
// to 3.2 s, then one cross-fade of 0.5 s to the start of play, and control passes at once
export const OPENING_REDUCED = Object.freeze({ hold: 2 * BAR_MS, fade: 500, total: 2 * BAR_MS + 500 });

export const SKIP_FADE_MS = 200; // a skip cross-fades to the end state
export const HUD_FADE_MS = 200;
export const TAP_MARK_MS = 3000; // the pencilled tap mark appears on the resting page
// how long the held page waits for the theme to start after the tap before running on its own
// (silent) clock; nothing moves before OPENING.dive, so the wait does not show
export const MUSIC_WAIT_MS = 2500;

const ramp = ([a, b], t) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const smooth = (x) => x * x * (3 - 2 * x);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

// What the opening shows t ms after the first tap:
//   dive 0..1 (the camera over the paper), paper 1..0 (the page layer's opacity over the live
//   world), camera 1..0 (the drawing framing's weight: 1 the drawing, 0 the play camera),
//   drawing 1..0 (1 every part drawn finished, 0 each part's own look), stations 0..1 (the play
//   elements grown in), wash 0..1 (the world's colour rising; 0 all ink), hero 0..1 (Vanessa's
//   colour rising), steppedIn (out of the drawing's pose), done (control passes).
export function openingState(t, { reducedMotion = false } = {}) {
  if (reducedMotion) {
    const live = t >= OPENING_REDUCED.hold; // behind the page the world is already in its start state
    const on = live ? 1 : 0;
    return {
      dive: 0, paper: 1 - ramp([OPENING_REDUCED.hold, OPENING_REDUCED.total], t), camera: 1 - on, drawing: 1 - on,
      stations: on, wash: on, hero: on, steppedIn: live, done: t >= OPENING_REDUCED.total,
    };
  }
  return {
    dive: easeInOut(ramp(OPENING.dive, t)),
    paper: 1 - smooth(ramp(OPENING.handoff, t)),
    camera: 1 - easeInOut(ramp(OPENING.camera, t)),
    drawing: 1 - smooth(ramp(OPENING.lift, t)),
    stations: smooth(ramp(OPENING.lift, t)),
    wash: ramp(OPENING.wash, t),
    hero: ramp(OPENING.stepIn, t),
    steppedIn: t >= OPENING.stepIn[0],
    done: t >= OPENING.total,
  };
}
// the resting page, and the end state a skip lands on (the same as the last frame)
export const OPENING_START = Object.freeze(openingState(0));
export const OPENING_END = Object.freeze(openingState(OPENING.total));

// The opening's clock is the theme's playhead, so the handoff lands on the verse downbeat.
//   c: { t, waited, free }; dtMs: frame time; music: { state, position (s) } from audio.js
// - 'playing': the playhead (monotonic: a reading a little behind holds rather than rewinds);
// - 'idle' / 'loading' just after the tap: hold (the page is still) for up to MUSIC_WAIT_MS;
// - 'paused' (a hidden tab came back; the theme waits for the next gesture): hold, never restart;
// - otherwise (Sound off, refused, unsupported, failed, or too slow) a silent clock on frame
//   time with the same timings; once it has run silent it never jumps back to the playhead.
export function createClock() { return { t: 0, waited: 0, free: false }; }
export function stepClock(c, dtMs, music = {}) {
  const dt = Math.max(0, dtMs || 0);
  if (!c.free) {
    if (music.state === 'playing' && Number.isFinite(music.position)) return { ...c, t: Math.max(c.t, music.position * 1000) };
    if (music.state === 'paused' && c.t > 0) return c;
    if (['idle', 'loading'].includes(music.state) && c.waited + dt < MUSIC_WAIT_MS) return { ...c, waited: c.waited + dt };
  }
  return { ...c, free: true, t: c.t + dt };
}

// Whether this launch opens on the page: once per device (the `openingSeen` view setting), and
// not before a save notice has been answered; `?opening=1` forces it, `?opening=0` and the
// comparison overlay (`?overlay=1`) skip it.
// v0.25 (the captain: "New farm also gets the animation"): and whenever the farm that starts is a
// brand-new one (`fresh`: nothing done on it yet, freshFarm below), whether this device has seen
// the opening or not: from Extras -> New farm, a new game after a save notice, a first launch.
export function playsOpening({ seen = false, param = null, overlay = false, fresh = false } = {}) {
  if (param === '0' || overlay) return false;
  if (param === '1') return true;
  return fresh || !seen;
}
// a brand-new farm: no crop chosen, nothing built, no time played (`d`: a save payload)
export const freshFarm = (d) => !!d?.ledger && d.ledger.crop === null && d.ledger.activeMs === 0 && (d.ledger.paymentEvents?.length ?? 0) === 0;
// v0.25 (the captain: "Make the start animation unskipable"): once it runs, no tap, key or Escape
// ends the opening early; it plays to its handoff (12.6 s on the theme's intro; 3.7 s with reduced
// motion). The page still waits for its first tap, which starts the theme. (v0.10-v0.24: any tap
// or key after the start skipped to the end state.)
export const OPENING_SKIPPABLE = false;
// v0.25 (the captain: "We should add an explanation when we start the game ... You have imagined
// this house lets make your dreams come true!"): the welcome card, shown once on a new farm as the
// opening hands over (or at once where no opening plays): who she is and what to do first, a few
// seconds of reading on one card, in the game's voice. Not a tutorial: the goal line and the
// first-actions guide teach the rest as before.
export const WELCOME = Object.freeze({
  title: 'You have imagined this house. Let’s make your dreams come true!',
  who: 'You are Vanessa. This farm is your drawing, and you build it yourself, one DIY at a time.',
  first: 'First, take the rake that leans by the house and clear the weeds from a crop patch. The line at the top always says what comes next.',
  go: 'Let’s go',
});
// the welcome is due: a farm nothing has been done on, that has not shown it yet
export const welcomeDue = (d) => !!d?.ledger && d.session?.welcomeSeen !== true && d.ledger.crop === null && (d.ledger.paymentEvents?.length ?? 0) === 0;

// The save notice shown as a paper card before play (or before the page), or null:
// { kind: 'corrupt' | 'newer' | 'sessionOnly', recover (a last good copy exists) }
export function saveNotice(loaded, sessionOnly = false) {
  if (loaded.status === 'corrupt') return { kind: 'corrupt', recover: !!loaded.backup };
  if (loaded.status === 'newer') return { kind: 'newer', recover: false };
  if (sessionOnly) return { kind: 'sessionOnly', recover: false };
  return null;
}
