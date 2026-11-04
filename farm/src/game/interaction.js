// Interaction controller (annex §D.2): reach, the 0.25 s stillness rule and auto-work at
// 0.75 s per unit (1 s per weed). Pure logic: positions come in, ledger transactions go out
// through `commit(tx)`, presentation events come back from `update`. Not saved: everything here
// is cleared on load (spec §12).
// v0.9 (P25-4): weeding needs the rake and digging a crop spot needs the shovel. Standing still
// at the tools takes the one the next tool job needs (0.5 s; a swap puts the other back). With
// the wrong tool at a job no work starts (`toolBlocked`); with `Tools come to me` on, the needed
// tool comes to her hand at the job instead, in the same 0.5 s.
// v0.11: coming within YARD_REACH_M of the material pile by the house (`yard`) with wood or
// stone on her head drops it all there at once, moving or not.
// v0.12: the same at the yard-sale table (`table`) with crops on her head: they go onto the table
// until it is full. Nothing is armed any more: there is no delivery and no selling menu; a build
// is one DIY press at its site (`atSite`), and the yard sale one press of its button.
// v0.13 (captain: "tools come to me is automatic after going to pick them up at least once
// each"): a tool she has once taken at the tools comes to her hand at the job (`comes`), in the
// same 0.5 s; she can still walk to the tools and take it there. The tables grow with the house:
// her crops go onto any table that stands.
import { CAPACITY, CROPS, isWeedId, NODES, TABLE_REACH_M, TIMING, YARD_MATERIALS } from './data.js';
import {
  available, digOpen, nodeEstablished, sourceResource, tableAvailable, tableFull, toolComes, toolJobs, weedOpen,
} from './ledger.js';

export const REACH_M = 0.9; // 1.5 Vanessa collision diameters with the 0.6 m base hero sphere
export const STILL_SPEED_MS = 0.05; // m/s: the stillness clock runs only below this (P23-6.12)
export const HIGHLIGHT_RANGE_M = 3.5; // the ground ring marks the nearest collectible this close
export const YARD_REACH_M = 1.2; // P27-1: within about 1.2 m of the pile her load drops

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// the tool comes to her hand at the job: taken once (v0.13, P29-7), or any tool with Help me
// finish (opts.toolsComeToMe)
export const comes = (l, tool, opts = {}) => !!opts.toolsComeToMe || toolComes(l, tool);
const WORK_KINDS = new Set(['weed', 'pile', 'stick', 'rock', 'node', 'dig', 'tools']);
const SOURCE_KINDS = new Set(['pile', 'stick', 'rock', 'node']);
// the tool a job target needs
export const TOOL_FOR = { weed: 'rake', dig: 'shovel' };
export function toolForId(l, id) {
  if (isWeedId(id)) return 'rake';
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

// in reach of an open job while holding the wrong tool (or none) that will not come to her: the
// tool it needs, else null
export function toolBlocked(l, hero, targets, opts = {}) {
  for (const t of targets) {
    const tool = TOOL_FOR[t.kind];
    if (!tool || l.tool === tool || comes(l, tool, opts) || !inReach(hero, t)) continue;
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

// opts: { want: the tool to take at the tools (wantedTool), toolsComeToMe: Help me finish }
export function isWorkEligible(l, t, opts = {}) {
  if (t.hold) return false; // presentation hold: a branch still in the tree or falling (P25-5)
  if (t.kind === 'weed') return weedOpen(l, t.id) && (l.tool === 'rake' || comes(l, 'rake', opts));
  if (t.kind === 'dig') return digOpen(l, t.id) && (l.tool === 'shovel' || comes(l, 'shovel', opts));
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

// the length of the next work unit at `t`: weeds 1 s, dig spots 1.5 s, taking a tool 0.5 s,
// every resource unit 0.75 s
export function workUnitMs(t, timing = TIMING, l = null) {
  if (t.kind === 'tools' || (l && toolFirst(l, t))) return timing.toolMs;
  if (t.kind === 'weed') return timing.weedMs;
  if (t.kind === 'dig') return timing.digMs;
  return timing.workUnitMs;
}

// the ledger transaction one finished work unit at `t` commits
export function workTx(l, t, want = null) {
  if (t.kind === 'tools') return { t: 'takeTool', tool: want };
  const first = toolFirst(l, t);
  if (first) return { t: 'takeTool', tool: first, come: true }; // the tool arrives at the job
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
  if (toolBlocked(l, hero, targets, opts)) {
    const tools = targets.find((t) => t.kind === 'tools');
    if (tools) return { target: tools, inReach: inReach(hero, tools) };
  }
  const gap = (t) => dist(hero, t) - (t.r ?? 0);
  const near = targets.filter((t) => WORK_KINDS.has(t.kind) && isWorkEligible(l, t, opts) && gap(t) <= range);
  near.sort((a, b) => gap(a) - gap(b) || (a.id < b.id ? -1 : 1));
  return near.length ? { target: near[0], inReach: false } : null;
}

// v0.12: the build site she stands at (its blueprint outline marks it; no mat), or null
export function atSite(hero, targets) {
  const c = targets.filter((t) => t.kind === 'site' && inReach(hero, t));
  c.sort((a, b) => (dist(hero, a) - (a.r ?? 0)) - (dist(hero, b) - (b.r ?? 0)) || (a.id < b.id ? -1 : 1));
  return c[0] ?? null;
}

// she carries something the pile takes
export const hasLoad = (l) => YARD_MATERIALS.some((r) => l.carried[r] > 0);
// close enough to the material pile for her load to drop
export function atYard(hero, targets) {
  const y = targets.find((t) => t.kind === 'yard');
  return !!y && inReach(hero, y, YARD_REACH_M);
}
// she carries crops and the yard-sale table has room
export const hasCrops = (l) => CROPS.some((c) => l.carried[c] > 0);
export function atTable(hero, targets) {
  return targets.some((t) => t.kind === 'table' && inReach(hero, t, TABLE_REACH_M));
}
// v0.15 (captain: "Vanessa should click the yard sale buttom from the north of the table"): she
// holds the sale from behind her tables, on their north side (the far side from the camera, smaller
// z), within SALE_REACH_M of one; the buyers come up to the south side. Walking past still sets her
// crops out from either side.
export const SALE_REACH_M = 1.6;
export function atSellingSide(hero, targets, reach = SALE_REACH_M) {
  return targets.some((t) => t.kind === 'table' && inReach(hero, t, reach) && hero.z < t.z);
}

export function createInteraction({ getLedger, commit, timing = TIMING }) {
  const s = {
    stillMs: 0,
    selectedId: null,
    want: null, // the tool the tools would give this frame
    work: null, // { target, elapsed }
  };

  function stopWork(events, reason) {
    if (s.work) events.push({ type: 'workStop', target: s.work.target, reason });
    s.work = null; // an incomplete unit resets without yield or loss
  }

  return {
    get state() { return s; },
    get working() { return s.work?.target ?? null; },
    // share of the current work unit done, 0..1 (the ground ring's progress arc)
    get workProgress() { return s.work ? Math.min(1, s.work.elapsed / workUnitMs(s.work.target, timing, getLedger())) : 0; },
    // what the current work unit will do: 'take' (a tool), or the target's kind
    get workDoing() { return s.work ? workTx(getLedger(), s.work.target, s.want).t : null; },

    // ctx: { hero: {x,z}, moving: boolean (input held), speed: m/s, targets: [{id, kind, x, z, r}],
    //        want?: the tool to take at the tools, toolsComeToMe?: Help me finish (every tool comes),
    //        tableBusy?: a yard sale is being shown (the table takes nothing until the buyers go) }
    update(dtMs, ctx) {
      const events = [];
      let l = getLedger();
      // the material pile: walking past it drops her whole load, moving or not (v0.11)
      if (hasLoad(l) && atYard(ctx.hero, ctx.targets)) {
        const res = commit({ t: 'drop' });
        events.push({ type: 'drop', result: res });
        l = getLedger();
      }
      // the yard-sale table: walking past it sets her crops out on it (v0.12)
      if (!ctx.tableBusy && hasCrops(l) && tableAvailable(l) && !tableFull(l) && atTable(ctx.hero, ctx.targets)) {
        const res = commit({ t: 'stock' });
        events.push({ type: 'stock', result: res });
        l = getLedger();
      }
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

    // a card, pause, a build or a teleport: drop the unit in progress
    reset() {
      s.stillMs = 0; s.selectedId = null; s.work = null;
    },
  };
}
