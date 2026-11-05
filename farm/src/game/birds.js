// The birds (spec §7, §6.6 point 4; A09 warning arrows, A22 "birds steal crops, archers chase
// them off, and losses are capped so nobody gets stuck"). Pure and deterministic: no three.js, no
// DOM. The director decides when a bird comes, what it goes for and how its visit ends; the ledger
// owns what is taken (`birdTurn`, `steal`, `stain`), and the world only shows the bird.
//
// One bird at a time, at most one visit every BIRDS.everyMs of active time, from the second crop
// plot on. The kinds take turns in a fixed order (BIRD_KINDS: the bench, a ready crop plant, the
// crops on her head), skipping any that cannot happen now, so there is no chance roll:
//   warn (2 s: it circles its target, and the warning names it)
//   -> approach (it lands on the plant or the bench; or it chases her for 2 s)
//   -> sit (3 s on a plant, then it takes one unit; on the bench it leaves a stain)
//   -> leave.
// A free Wave before the take sends it off with nothing. So does a hired archer, as soon as the
// bird is inside his cover: he draws for 0.8 s and looses a blunt warning arrow into the ground
// beside it (never at it); when two archers cover it, the nearer one shoots. Each archer guards
// his own crops (ARCHER_GUARDS) and the ground round his post (BIRDS.coverM). The caps (one unit a
// visit, three in any two minutes, eight between the second crop plot and the home) and the
// settings (Help me finish, Birds never steal) are checked before every take. After the home, or
// with theft off, birds only perch on the bench.
import { ARCHER_GUARDS, BIRDS, BIRD_KINDS, NODES } from './data.js';
import { birdsActive, carriedTarget, isCommitted, mainComplete, readyNodes, theftAllowed } from './ledger.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// the plural the warnings use for each crop
const CROP_WORD = { C: 'corn', S: 'sunflowers', T: 'tomatoes' };

// the hired archer who covers point `p` (a plant he guards, `nodeId`, or a point within coverM of
// his post), the nearest one if two do; null when none
export function coveringArcher(archers, p, nodeId = null) {
  let best = null;
  for (const a of archers ?? []) {
    const d = dist(a.pos, p);
    const guards = nodeId && (a.guards ?? ARCHER_GUARDS[a.id] ?? []).includes(nodeId);
    if ((guards || d <= BIRDS.coverM) && (!best || d < best.d)) best = { id: a.id, pos: a.pos, d };
  }
  return best;
}

// The target a kind of visit would go for now, or null when it cannot happen.
// ctx: { l, hero: {x,z}, nodePos(id) -> {x,z}, bench: {x,z}, archers: [{ id, pos }], calm, heroSafe }
//   calm: Help me finish or Birds never steal (no theft); heroSafe: she is at the yard-sale table
//   or building, where a head thief never goes (§7)
export function targetFor(kind, ctx) {
  const { l } = ctx;
  if (kind === 'perch') return isCommitted(l, 'G2') && !l.theft.stain && ctx.bench ? { kind, id: 'bench', pos: ctx.bench } : null;
  if (ctx.calm || !theftAllowed(l)) return null;
  if (kind === 'node') {
    // the ready plant farthest from Vanessa
    let best = null;
    for (const id of readyNodes(l)) {
      const p = ctx.nodePos(id);
      if (!p) continue;
      const d = dist(p, ctx.hero);
      if (!best || d > best.d) best = { kind, id, pos: p, d, res: NODES[id].res };
    }
    return best && { kind, id: best.id, pos: best.pos, res: best.res };
  }
  if (kind === 'carried') {
    const res = carriedTarget(l);
    if (!res || ctx.heroSafe || coveringArcher(ctx.archers, ctx.hero)) return null;
    return { kind, id: 'hero', pos: ctx.hero, res };
  }
  return null;
}

// The next visit: the kinds take turns from the saved rotation, the first that can happen now.
export function chooseVisit(ctx) {
  const { l } = ctx;
  if (!birdsActive(l)) return null;
  const order = mainComplete(l) ? ['perch'] : BIRD_KINDS;
  const start = l.theft.rotation % order.length;
  for (let i = 0; i < order.length; i++) {
    const t = targetFor(order[(start + i) % order.length], ctx);
    if (t) return t;
  }
  return null;
}

// what the warning says (§7: "A bird is eyeing the tomatoes", "A bird is circling your corn")
export function warningText(t) {
  if (t.kind === 'perch') return 'A bird is eyeing the bench';
  if (t.kind === 'carried') return `A bird is after the ${CROP_WORD[t.res]} on your head! Wave it off`;
  return t.res === 'C' ? 'A bird is circling your corn' : `A bird is eyeing the ${CROP_WORD[t.res]}`;
}

// The visit's clock. update(dt, ctx) -> actions for the caller to carry out, in order:
//   { a: 'turn' }                       commit { t: 'birdTurn' } (the rotation moves on, saved)
//   { a: 'warn', target, text }         show the warning
//   { a: 'land' }                       the bird reaches the plant or the bench
//   { a: 'draw', archer }               an archer raises his bow at the bird
//   { a: 'shoot', archer, at }          he looses the warning arrow into the ground at `at`
//   { a: 'take', tx }                   commit the steal (the ledger checks the caps again)
//   { a: 'stain' }                      commit { t: 'stain' }
//   { a: 'leave', why }                 the bird flies off: 'wave' | 'arrow' | 'took' | 'stained' | 'gone'
//   { a: 'done' }                       it is out of sight; the next visit waits BIRDS.everyMs
// ctx as targetFor, plus `blocked` (a sale or a build is under way, a card or the finale: a bird
// that is not sitting yet gives up, and none comes).
export function createBirds() {
  const s = { phase: 'idle', t: 0, nextAt: null, target: null, archer: null, drawT: 0, why: null, lastShot: -Infinity };
  const leave = (out, why) => { s.phase = 'leave'; s.t = 0; s.why = why; s.archer = null; out.push({ a: 'leave', why }); };
  // the target moves with her (a head thief) and a plant's spot is fixed
  const follow = (ctx) => { if (s.target?.kind === 'carried') s.target = { ...s.target, pos: ctx.hero }; };
  // is the visit still on: its target can still be gone for
  const still = (ctx) => {
    if (!s.target) return false;
    if (s.target.kind === 'perch') return isCommitted(ctx.l, 'G2') && !ctx.l.theft.stain;
    if (ctx.calm || !theftAllowed(ctx.l)) return false;
    if (s.target.kind === 'node') return readyNodes(ctx.l).includes(s.target.id);
    return !!carriedTarget(ctx.l) && !ctx.heroSafe;
  };
  // a hired archer whose cover the bird has entered draws, then shoots (never at the bird)
  function guard(out, ctx, dt) {
    if (s.archer) {
      s.drawT += dt;
      if (s.drawT >= BIRDS.drawMs) {
        const p = s.target.pos;
        const a = s.archer.pos;
        const d = Math.max(0.01, dist(a, p));
        // into the empty ground a metre short of the bird, on the archer's side
        const at = { x: p.x + ((a.x - p.x) / d) * 1.0, z: p.z + ((a.z - p.z) / d) * 1.0 };
        out.push({ a: 'shoot', archer: s.archer.id, at });
        s.lastShot = ctx.l.activeMs;
        leave(out, 'arrow');
      }
      return true;
    }
    const cover = coveringArcher(ctx.archers, s.target.pos, s.target.kind === 'node' ? s.target.id : null);
    if (!cover || ctx.l.activeMs - s.lastShot < BIRDS.fireMs) return false;
    s.archer = cover;
    s.drawT = 0;
    out.push({ a: 'draw', archer: cover.id, at: { x: s.target.pos.x, z: s.target.pos.z } });
    return true;
  }
  return {
    get state() { return { phase: s.phase, t: s.t, target: s.target, archer: s.archer?.id ?? null, why: s.why, nextAt: s.nextAt }; },
    // the bird can be waved off now (before the take; not once an archer is on it)
    get wavable() { return ['warn', 'approach', 'sit'].includes(s.phase) && !s.archer; },
    get busy() { return s.phase !== 'idle'; },
    reset(activeMs = null) {
      Object.assign(s, { phase: 'idle', t: 0, nextAt: activeMs === null ? null : activeMs + BIRDS.firstMs, target: null, archer: null, drawT: 0, why: null });
    },
    // a free Wave: off it goes with nothing. -> true when there was a bird to wave off
    wave() {
      if (!this.wavable) return false;
      const out = [];
      leave(out, 'wave');
      return true;
    },
    update(dt, ctx) {
      const out = [];
      const now = ctx.l.activeMs;
      if (s.phase === 'idle') {
        if (!birdsActive(ctx.l)) { s.nextAt = null; return out; }
        if (s.nextAt === null) s.nextAt = now + BIRDS.firstMs;
        if (ctx.blocked || now < s.nextAt) return out;
        const t = chooseVisit(ctx);
        if (!t) { s.nextAt = now + 5000; return out; } // nothing to go for: look again soon
        s.target = t;
        s.phase = 'warn';
        s.t = 0;
        s.why = null;
        out.push({ a: 'turn' }, { a: 'warn', target: t, text: warningText(t) });
        return out;
      }
      s.t += dt;
      follow(ctx);
      if (s.phase === 'leave') {
        if (s.t >= BIRDS.leaveMs) {
          s.phase = 'idle'; s.t = 0; s.target = null;
          s.nextAt = now + BIRDS.everyMs;
          out.push({ a: 'done' });
        }
        return out;
      }
      if (ctx.blocked && s.phase !== 'sit') { leave(out, 'gone'); return out; }
      if (!still(ctx)) { leave(out, 'gone'); return out; }
      if (guard(out, ctx, dt)) return out;
      if (s.phase === 'warn' && s.t >= BIRDS.warnMs) {
        s.phase = 'approach'; s.t = 0;
      } else if (s.phase === 'approach') {
        if (s.target.kind === 'carried') {
          if (s.t >= BIRDS.approachMs) {
            out.push({ a: 'take', tx: { t: 'steal', from: 'carried' } });
            leave(out, 'took');
          }
        } else if (s.t >= BIRDS.landMs) {
          s.phase = 'sit'; s.t = 0;
          out.push({ a: 'land' });
        }
      } else if (s.phase === 'sit') {
        const k = s.target.kind;
        if (s.t >= (k === 'perch' ? BIRDS.perchMs : BIRDS.sitMs)) {
          if (k === 'perch') { out.push({ a: 'stain' }); leave(out, 'stained'); } else { out.push({ a: 'take', tx: { t: 'steal', from: 'node', src: s.target.id } }); leave(out, 'took'); }
        }
      }
      return out;
    },
  };
}
