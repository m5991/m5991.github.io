// The gameplay theme: "The House (Instrumental)" as an intro-then-loop (spec A17; captain,
// 2026-11-01). Pure data and arithmetic, no Web Audio, so it is unit-tested under Node.
//
// The asset is the original track with one baked seam. The end of the final section (its last
// downbeat, 187.084 s) jumps back to the downbeat where the verse starts (12.640 s): the 12.6 s
// intro plays once, then the 174.4 s body loops. Only the original's 6 s ring-out is unused.
// Both sides of the seam are on the song's tonic chord and on its 150 BPM beat grid, so the jump
// sounds like the song's own move from a loud closing section back into a verse.
//
// How the seam is baked into the file, so it survives lossy encoding and decoder offsets:
//   [0, end - G - N)          original audio
//   [end - G - N, end - G)    80 ms equal-power crossfade from the final bar into the pre-verse audio
//   [end - G, file end)       the audio that follows the loop start (a 60 ms guard band)
// Playing past loopEnd and jumping to loopStart therefore give the same audio. An encoder
// priming delay that a browser leaves in (AAC: 1024-2112 samples, 21-44 ms) shifts both loop
// points by the same amount and stays inside the guard. Gap-free looping uses one
// AudioBufferSourceNode with loopStart/loopEnd, never <audio loop>, which leaves a gap.

export const TRACK = Object.freeze({
  url: 'assets/audio/the-house.m4a',
  sampleRate: 48000, // the sample counts below are at this rate; browsers may decode at another
  loopStartSample: 606720, // 12.640 s: verse downbeat
  loopEndSample: 8980032, // 187.084 s: last downbeat of the final section
  guardSamples: 2880, // 60 ms after loopEnd that repeat the audio after loopStart
  lengthSamples: 8992512, // 187.344 s of audio in the asset
});

// Loop points in seconds, independent of the decode rate. With `bufferDuration` (the decoded
// buffer's length in seconds) it also checks that the buffer reaches the loop end; a shorter
// buffer would make the source wrap early or stop, so it is refused.
export function loopPoints(track = TRACK, bufferDuration) {
  const { sampleRate: sr, loopStartSample: a, loopEndSample: b, guardSamples: g, lengthSamples: n } = track;
  if (!(sr > 0) || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b <= a) throw new Error('invalid loop points');
  if (!Number.isInteger(g) || g < 0 || b + g > n) throw new Error('the guard band runs past the end of the asset');
  const start = a / sr;
  const end = b / sr;
  if (bufferDuration !== undefined && bufferDuration < end) throw new Error(`decoded music is ${bufferDuration.toFixed(3)} s, shorter than its loop end ${end.toFixed(3)} s`);
  return { start, end, length: end - start, intro: start, guard: g / sr };
}

// Position in the asset `elapsed` seconds after playback started at `from` (0 = the top): the
// intro once, then the loop body forever. A start inside the body stays inside it.
export function playhead(elapsed, track = TRACK, from = 0) {
  const { start, end, length } = loopPoints(track);
  const t = Math.max(0, from) + Math.max(0, elapsed || 0);
  if (t < end) return t;
  return start + ((t - start) % length);
}

// How many times the loop body has wrapped after `elapsed` seconds from the top.
export function loopsCompleted(elapsed, track = TRACK) {
  const { start, end, length } = loopPoints(track);
  return elapsed < end ? 0 : Math.floor((elapsed - start) / length);
}
