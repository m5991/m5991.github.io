// Interaction controller (annex §D.2): reach, the 0.25 s stillness rule, auto-work at
// 0.75 s per unit (1 s per weed), explicit arming of one mat or the crate, and the 0.15 s
// transfer cadence with the 0.3 s coin pour. Pure logic: positions come in, ledger
// transactions go out through `commit(tx)`, presentation events come back from `update`.
// Not saved: everything here is disarmed and cleared on load (spec §12).
// v0.9 (P25-4): weeding needs the rake and digging a crop spot needs the shovel. Standing still
// at the tools takes the one the next tool job needs (0.5 s; a swap puts the other back). With
// the wrong tool at a job no work starts (`toolBlocked`); with `Tools come to me` on, the needed
// tool comes to her hand at the job instead, in the same 0.5 s.
import { CAPACITY, CROPS, NODES, TIMING, U1_WEED_MS, U2_DIG_MS, WEEDS } from './data.js';
import {
  available, digOpen, nodeEstablished, owns, sourceResource, stageState, stillNeeded, toolJobs, weedOpen,
} from './ledger.js';

export const REACH_M = 0.9; // 1.5 Vanessa collision diameters with the 0.6 m base hero sphere
export const STILL_SPEED_MS = 0.05; // m/s: the stillness clock runs only below this (P23-6.12)
export const HIGHLIGHT_RANGE_M = 3.5; // the ground ring marks the nearest collectible this close

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const WORK_KINDS = new Set(['weed', 'pile', 'spot', 'rock', 'node', 'dig', 'tools']);
const SOURCE_KINDS = new Set(['pile', 'spot', 'rock', 'node']);
// the tool a job target needs
export const TOOL_FOR = { weed: 'rake', dig: 'shovel' };
export function toolForId(l, id) {
  if (WEEDS.includes(id)) return 'rake';
  if (id in NODES && digOpen(l, id)) return 'shovel';
  return null;
}

// The tool to take at the tools now: the one the goal line names (its `tool`, or the job its
// target needs), otherwise the one for the nearest open job; null when the held tool already
// does the next job, or when no tool job is open (nothing is taken).
// goal: { target, tool? } (guide.js nextGoal), hero: {x,z}, targets: world targets
export function wantedTool(l, goal, hero, targets) {
  const jobs = toolJobs(l);
  const named = goal?.tool ?? (goal?.target ? toolForId(l, goal.target) : null);
  if (named && jobs[named].length) return named === l.tool ? null : named;
  let best = null;
  for (const t of targets) {
    const tool = TOOL_FOR[t.kind];
    if (!tool || !jobs[tool].includes(t.id)) continue;
    const d = dist(hero, t);
    if (!best || d < best.d) best = { tool, d };
  }
  return best && best.tool !== l.tool ? best.tool : null;
}

// in reach of an open job while holding the wrong tool (or none): the tool it needs, else null
export function toolBlocked(l, hero, targets) {
  for (const t of targets) {
    const tool = TOOL_FOR[t.kind];
    if (!tool || l.tool === tool || !inReach(hero, t)) continue;
    if (t.kind === 'weed' ? weedOpen(l, t.id) : digOpen(l, t.id)) return tool;
  }
  return null;
}

// moving for the 0.25 s rule: input held, or the eased mover still faster than 0.05 m/s, so
// the stop glide does not count as standing still
export function isMoving(ctx) {
  return !!ctx.moving || (ctx.speed ?? 0) >= STILL_SPEED_MS;
}

export function inReach(hero, target, reach = REACH_M) {
  return dist(hero, target) - (target.r ?? 0) <= reach;
}

// opts: { want: the tool to take at the tools (wantedTool), toolsComeToMe: setting }
export function isWorkEligible(l, t, opts = {}) {
  if (t.hold) return false; // presentation hold: a branch still in the tree or falling (P25-5)
  if (t.kind === 'weed') return weedOpen(l, t.id) && (l.tool === 'rake' || !!opts.toolsComeToMe);
  if (t.kind === 'dig') return digOpen(l, t.id) && (l.tool === 'shovel' || !!opts.toolsComeToMe);
  if (t.kind === 'tools') return !!opts.want && opts.want !== l.tool;
  if (SOURCE_KINDS.has(t.kind)) {
    if (t.kind === 'node' && !nodeEstablished(l, t.id)) return false;
    const res = sourceResource(t.id);
    return available(l, t.id) > 0 && l.carried[res] < CAPACITY;
  }
  return false;
}

// the tool a work unit at `t` would take first (Tools come to me), else null
function toolFirst(l, t) {
  const tool = TOOL_FOR[t.kind];
  return tool && l.tool !== tool ? tool : null;
}

// the length of the next work unit at `t`: weeds 1 s (0.5 s with U1), dig spots 1.5 s (0.75 s
// with U2), taking a tool 0.5 s, every resource unit 0.75 s
export function workUnitMs(t, timing = TIMING, l = null) {
  if (t.kind === 'tools' || (l && toolFirst(l, t))) return timing.toolMs;
  if (t.kind === 'weed') return l && owns(l, 'U1') ? U1_WEED_MS : timing.weedMs;
  if (t.kind === 'dig') return l && owns(l, 'U2') ? U2_DIG_MS : timing.digMs;
  return timing.workUnitMs;
}

// the ledger transaction one finished work unit at `t` commits
export function workTx(l, t, want = null) {
  if (t.kind === 'tools') return { t: 'takeTool', tool: want };
  const first = toolFirst(l, t);
  if (first) return { t: 'takeTool', tool: first }; // Tools come to me: the tool arrives at the job
  if (t.kind === 'weed') return { t: 'clearWeed', id: t.id };
  if (t.kind === 'dig') return { t: 'dig', id: t.id };
  return { t: 'pick', src: t.id };
}

// nearest eligible work target in reach; the selected one first; ties by stable ID
export function pickWorkTarget(l, hero, targets, selectedId = null, opts = {}) {
  const eligible = targets.filter((t) => WORK_KINDS.has(t.kind) && inReach(hero, t) && isWorkEligible(l, t, opts));
  const sel = eligible.find((t) => t.id === selectedId);
  if (sel) return sel;
  eligible.sort((a, b) => (dist(hero, a) - (a.r ?? 0)) - (dist(hero, b) - (b.r ?? 0)) || (a.id < b.id ? -1 : 1));
  return eligible[0] ?? null;
}

// The collectible the ground ring marks (playtest fix: pickups must read as collectible): the
// one that work would pick now if she stood still (in reach, selected first), otherwise the
// nearest eligible weed, pile, spot or crop within HIGHLIGHT_RANGE_M of her edge-to-edge.
// -> { target, inReach } or null. Empty or full sources are never marked.
// v0.9: with the wrong tool at a job the ring moves to the tools (`toolBlocked`), wherever they are.
export function pickHighlight(l, hero, targets, selectedId = null, range = HIGHLIGHT_RANGE_M, opts = {}) {
  const here = pickWorkTarget(l, hero, targets, selectedId, opts);
  if (here) return { target: here, inReach: true };
  if (!opts.toolsComeToMe && toolBlocked(l, hero, targets)) {
    const tools = targets.find((t) => t.kind === 'tools');
    if (tools) return { target: tools, inReach: inReach(hero, tools) };
  }
  const gap = (t) => dist(hero, t) - (t.r ?? 0);
  const near = targets.filter((t) => WORK_KINDS.has(t.kind) && isWorkEligible(l, t, opts) && gap(t) <= range);
  near.sort((a, b) => gap(a) - gap(b) || (a.id < b.id ? -1 : 1));
  return near.length ? { target: near[0], inReach: false } : null;
}

// the one contextual world action: the nearest mat or crate in reach
export function pickContextTarget(hero, targets) {
  const c = targets.filter((t) => (t.kind === 'mat' || t.kind === 'crate') && inReach(hero, t));
  c.sort((a, b) => dist(hero, a) - dist(hero, b) || (a.id < b.id ? -1 : 1));
  return c[0] ?? null;
}

export function createInteraction({ getLedger, commit, timing = TIMING }) {
  const s = {
    stillMs: 0,
    selectedId: null,
    want: null, // the tool the tools would give this frame
    work: null, // { target, elapsed }
    armed: null, // { kind, id, mode, phase, timer, units, coins }
  };

  function stopWork(events, reason) {
    if (s.work) events.push({ type: 'workStop', target: s.work.target, reason });
    s.work = null; // an incomplete unit resets without yield or loss
  }

  function disarm(reason, extra = {}) {
    if (!s.armed) return null;
    const ev = { type: 'disarmed', kind: s.armed.kind, id: s.armed.id, reason, units: s.armed.units, coins: s.armed.coins, ...extra };
    s.armed = null;
    return ev;
  }

  function nextMaterial(l, stage) {
    const need = stillNeeded(l, stage);
    for (const r of ['W', 'R']) if (need[r] > 0 && l.carried[r] > 0) return r; // wood, then stone
    return null;
  }

  function nextCrop(l, mode) {
    const order = mode === 'all' ? CROPS : [mode];
    return order.find((c) => l.carried[c] > 0) ?? null;
  }

  function stepArmed(dt, ctx, events) {
    const a = s.armed;
    const target = ctx.targets.find((t) => t.id === a.id);
    if (!target || !inReach(ctx.hero, target)) {
      events.push(disarm('movedAway'));
      return;
    }
    a.timer += dt;
    while (s.armed && a.timer >= (a.phase === 'pour' ? timing.coinPourMs : timing.transferMs)) {
      a.timer -= a.phase === 'pour' ? timing.coinPourMs : timing.transferMs;
      const l = getLedger();
      if (a.kind === 'crate') {
        const crop = nextCrop(l, a.mode);
        if (!crop) { events.push(disarm(a.units ? 'soldAll' : 'nothingToSell')); return; }
        const res = commit({ t: 'sell', crop });
        if (!res.ok) { events.push(disarm(res.reason)); return; }
        a.units += 1;
        a.coins += res.events[0].coins;
        events.push({ type: 'transfer', kind: 'crate', id: a.id, r: crop, coins: res.events[0].coins, result: res });
        continue;
      }
      // mat: materials W then R, then one atomic coin deposit after a 0.3 s pour
      if (a.phase === 'materials') {
        const r = nextMaterial(l, a.id);
        if (r) {
          const res = commit({ t: 'depositMat', stage: a.id, r });
          if (!res.ok) { events.push(disarm(res.reason)); return; }
          a.units += 1;
          events.push({ type: 'transfer', kind: 'mat', id: a.id, r, result: res });
          if (res.events.some((e) => e.type === 'committed')) {
            events.push({ type: 'committed', stage: a.id });
            events.push(disarm('committed'));
            return;
          }
          continue;
        }
        if (stillNeeded(l, a.id).coins > 0 && l.purse > 0) {
          a.phase = 'pour';
          events.push({ type: 'coinPour', id: a.id, n: Math.min(l.purse, stillNeeded(l, a.id).coins) });
          continue;
        }
        events.push(disarm('shortage', { missing: shortageOf(l, a.id) }));
        return;
      }
      if (a.phase === 'pour') {
        const res = commit({ t: 'depositCoins', stage: a.id });
        if (!res.ok) { events.push(disarm(res.reason)); return; }
        a.coins += res.events[0].n;
        events.push({ type: 'transfer', kind: 'mat', id: a.id, r: 'coins', n: res.events[0].n, result: res });
        if (res.events.some((e) => e.type === 'committed')) {
          events.push({ type: 'committed', stage: a.id });
          events.push(disarm('committed'));
        } else {
          events.push(disarm('shortage', { missing: shortageOf(getLedger(), a.id) }));
        }
        return;
      }
    }
  }

  function shortageOf(l, stage) {
    const need = stillNeeded(l, stage);
    return { coins: Math.max(0, need.coins - l.purse), W: Math.max(0, need.W - l.carried.W), R: Math.max(0, need.R - l.carried.R) };
  }

  return {
    get state() { return s; },
    get armed() { return s.armed; },
    get working() { return s.work?.target ?? null; },
    // share of the current work unit done, 0..1 (the ground ring's progress arc)
    get workProgress() { return s.work ? Math.min(1, s.work.elapsed / workUnitMs(s.work.target, timing, getLedger())) : 0; },
    // what the current work unit will do: 'take' (a tool), or the target's kind
    get workDoing() { return s.work ? workTx(getLedger(), s.work.target, s.want).t : null; },

    // ctx: { hero: {x,z}, moving: boolean (input held), speed: m/s, targets: [{id, kind, x, z, r}],
    //        want?: the tool to take at the tools, toolsComeToMe?: setting }
    update(dtMs, ctx) {
      const events = [];
      if (s.armed) {
        stopWork(events, 'armed');
        stepArmed(dtMs, ctx, events);
        return events.filter(Boolean);
      }
      const l = getLedger();
      if (isMoving(ctx)) {
        s.stillMs = 0;
        stopWork(events, 'moved');
        const sel = ctx.targets.find((t) => t.id === s.selectedId);
        if (sel && !inReach(ctx.hero, sel)) s.selectedId = null;
        return events;
      }
      s.stillMs += dtMs;
      const opts = { want: ctx.want ?? null, toolsComeToMe: !!ctx.toolsComeToMe };
      s.want = opts.want;
      const target = pickWorkTarget(l, ctx.hero, ctx.targets, s.selectedId, opts);
      if (!target) { stopWork(events, 'noTarget'); return events; }
      if (s.stillMs < timing.stillMs) return events;
      if (!s.work || s.work.target.id !== target.id) {
        stopWork(events, 'switch');
        s.work = { target, elapsed: 0 };
        s.selectedId = target.id;
        events.push({ type: 'workStart', target });
        return events; // the first unit starts counting next frame
      }
      s.work.elapsed += dtMs;
      const unitMs = workUnitMs(target, timing, l);
      if (s.work.elapsed >= unitMs) {
        s.work.elapsed -= unitMs;
        const tx = workTx(l, target, opts.want);
        const res = commit(tx);
        events.push({ type: 'unit', target, tx, result: res });
        if (!res.ok || !isWorkEligible(getLedger(), target, opts)) stopWork(events, res.ok ? 'done' : res.reason);
      }
      return events;
    },

    // Confirm delivery / Sell: arms only that target, only while in reach.
    arm(kind, id, mode, ctx) {
      const t = ctx.targets.find((x) => x.id === id);
      if (!t || !inReach(ctx.hero, t)) return { ok: false, reason: 'notInReach' };
      if (kind === 'mat' && stageState(getLedger(), id) !== 'OPEN') return { ok: false, reason: 'locked' };
      const prev = disarm('replaced');
      s.work = null;
      s.armed = { kind, id, mode: mode ?? 'all', phase: 'materials', timer: 0, units: 0, coins: 0 };
      return { ok: true, replaced: prev };
    },
    // modal, pause, resize, reload or `Stop delivery`
    disarm,
    reset() {
      s.stillMs = 0; s.selectedId = null; s.work = null; s.armed = null;
    },
  };
}
