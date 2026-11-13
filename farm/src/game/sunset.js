// v0.25 "Sunset on the bench": what happens when everything is found after the finale.
// The captain (2026-11-13), asked "We should have something when you complete all the postgame,
// what do you think?", picked this one: the day turns to golden evening, Vanessa and Dwight sit on
// the bench, fireflies over the corn, the drawing gets a pencilled "The Farm, complete" signature,
// and the postcard gains a gold 100% stamp. Calm, within the no-confetti rule (§10.6): nothing
// bursts, flashes or showers; the light changes, two people sit down, a line is pencilled in.
//
// "Everything" is every song and every keepsake. Every song is found by doing its spot's action,
// so with all the songs found every action has been done too.
// It plays once per farm (`sunsetSeen` in the save's session), a moment after the last find, or as
// a farm that already had everything loads. Afterwards the farm stays in that evening light, with
// its fireflies; Extras has a switch, "Evening light", that gives the day back (and the evening
// again), kept with the farm (`dayLight`). That is this build's answer to the brief's "stays in
// that evening light, or let her toggle back to day; your call": both.
// Nothing new is drawn for it: the evening is v0.17c's own warm wash and its two dozen fireflies
// (world.updateFireflies), held instead of coming and going. Pure data and arithmetic.

export const SIGNATURE = 'The Farm, complete';
export const STAMP = '100%';

// every song of the list and every keepsake is found
// songs: the ids of the song list; keepsakes: the ids of the keepsakes
export function everythingFound({ discoveries = {}, keepsakes = {} } = {}, songs = [], keepsakeIds = []) {
  return songs.length > 0 && songs.every((id) => !!discoveries?.[id]) && keepsakeIds.every((id) => !!keepsakes?.[id]);
}
// the sunset is due: the farm is finished, everything is found, and it has not played on this farm
export function sunsetDue(d, { finished = false, complete = false } = {}) {
  return finished && complete && d?.session?.sunsetSeen !== true;
}
// how long she stands idle, everything found, before it starts (ms of play): after the last card
// has closed, so the find itself is taken in first
export const SUNSET_AFTER_MS = 1400;

// ms from the start of the scene (spans are [from, to])
export const SUNSET = Object.freeze({
  camera: [0, 2200], // the camera eases from play to the first shot (an upright screen: the corn's half; a wide one: the whole drawing)
  dusk: [300, 4300], // the day turns to golden evening
  fireflies: [1800, 4600], // the fireflies come up, over the corn among other places
  walk: [400, 5200], // she walks to the bench (where Dwight sits)
  travel: [4300, 6900], // an upright screen: the camera goes back across to the bench's half
  sit: [6600, 7700], // she sits down at its free end
  sign: [8200, 10700], // "The Farm, complete" is pencilled in
  stamp: [10900, 11400], // the gold 100% comes onto the paper beside it
  hold: [11400, 14000],
  total: 14000,
});
export const SUNSET_REDUCED_FADE_MS = 150;

const ramp = ([a, b], t) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const smooth = (x) => x * x * (3 - 2 * x);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

// The scene's state at time t (ms); every value is 0..1 and only rises:
//   camera (the drawing framing's weight), shot (the camera's travel from the first shot to the
//   bench's), evening (the light), fireflies, walk (her way to the bench), sit (sitting down),
//   sign (how much of the signature is written), stamp, done.
// Reduced motion: no camera travel and no walk: the evening, the two of them seated, the signature
// and the stamp come in one short fade on the bench's shot, and then it holds.
export function sunsetState(t, { reducedMotion = false } = {}) {
  if (reducedMotion) {
    const k = Math.max(0, Math.min(1, t / SUNSET_REDUCED_FADE_MS));
    return { camera: 1, shot: 1, evening: k, fireflies: k, walk: 1, sit: 1, sign: k, stamp: k, done: t >= SUNSET.total };
  }
  return {
    camera: smooth(ramp(SUNSET.camera, t)),
    shot: easeInOut(ramp(SUNSET.travel, t)),
    evening: smooth(ramp(SUNSET.dusk, t)),
    fireflies: smooth(ramp(SUNSET.fireflies, t)),
    walk: easeInOut(ramp(SUNSET.walk, t)),
    sit: smooth(ramp(SUNSET.sit, t)),
    sign: ramp(SUNSET.sign, t),
    stamp: smooth(ramp(SUNSET.stamp, t)),
    done: t >= SUNSET.total,
  };
}
// Skip lands on the end state (the same as the last frame)
export const SUNSET_END = Object.freeze(sunsetState(SUNSET.total));

// The evening light on the farm, 0 (day) .. 1 (golden evening):
//   `cycle` is v0.17c's own evening, which comes and goes on the finished farm (game/evening.js);
//   while the scene plays (`scene`: its `evening`, or null) the light is at least the scene's;
//   once the sunset has been seen the evening stays (1), unless she has asked for the day back
//   (`dayLight`), which gives the cycle again.
export function eveningLight({ cycle = 0, scene = null, seen = false, dayLight = false } = {}) {
  if (scene !== null) return Math.max(cycle, scene);
  if (seen && !dayLight) return 1;
  return cycle;
}
