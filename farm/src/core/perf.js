// v0.26 (the captain: "Run an audit on performance on s26 on firefox i can feel how the phone
// starts heating"): the switches of the performance fixes. Each fix is on by default and can be
// turned off by itself on the address, so a phone check can compare one against another:
//
//   ?fps=60        fix 1: draw at most this many frames a second (0: as many as the screen gives)
//   ?idlefps=30    fix 2: the budget while nothing but the farm's own small motion moves
//                  (0: the same as ?fps)
//   ?still=0       fix 2: keep drawing behind Pause, Extras, a card or a notice (v0.25 did)
//   ?batch=0       fix 3: one ink hull per mesh and every prop drawn by itself (v0.25 did)
//   ?cache=0       fix 4: work every position, target and HUD write out again on each frame
//   ?dpr=2         fix 5: the most device pixels drawn per CSS pixel (2, as before)
//   ?shadow=1024   fix 6: the shadow map's side in pixels (1024, as before; 0: no shadow map)
//   ?perf=0        all of the above as in v0.25
//
// The look and every timing are the same with a switch on or off; what changes is how often the
// same picture is drawn and how much work a frame takes.
export const PERF_DEFAULTS = Object.freeze({ fps: 60, idleFps: 30, still: true, batch: true, cache: true, dpr: 2, shadow: 1024 });
export const PERF_OFF = Object.freeze({ fps: 0, idleFps: 0, still: false, batch: false, cache: false, dpr: 2, shadow: 1024 });

const num = (v, fallback, { min = 0, max = Infinity } = {}) => {
  if (v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const flag = (v, fallback) => (v === '0' ? false : v === '1' ? true : fallback);

// search: the address's query (`location.search`), or a URLSearchParams
export function readPerf(search = '') {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search;
  const base = q.get('perf') === '0' ? PERF_OFF : PERF_DEFAULTS;
  return {
    fps: num(q.get('fps'), base.fps, { max: 240 }),
    idleFps: num(q.get('idlefps'), base.idleFps, { max: 240 }),
    still: flag(q.get('still'), base.still),
    batch: flag(q.get('batch'), base.batch),
    cache: flag(q.get('cache'), base.cache),
    dpr: num(q.get('dpr'), base.dpr, { min: 0.5, max: 4 }),
    shadow: num(q.get('shadow'), base.shadow, { max: 4096 }),
  };
}

// the page's switches (a test sets them directly)
export const PERF = readPerf(globalThis.location?.search ?? '');
