// Save manager, schema v5 (spec §12; annex §D.8). Versioned payload plus a last-good copy in
// localStorage, written synchronously after every accepted ledger transaction. Storage that is
// denied or full degrades to disclosed session-only play; a corrupt payload offers the last
// good copy or a new game, never a silent reset.
import { CAPACITY, CROP_STAGES, NODES, PILES, ROCKS, STAGE_ORDER, STICK_SLOTS, WEEDS } from './data.js';
import { createLedger, mainComplete, stoneShortfall, validateLedger } from './ledger.js';

export const SCHEMA = 5;
export const KEY = 'vanessas-farm/save';
export const BACKUP_KEY = 'vanessas-farm/save-last-good';

// Everything v5 stores (spec §12). Fields for later steps (discoveries, archers, audio) are
// placeholders with fixed shapes so a later step fills them without a schema bump.
export function createSaveData() {
  return {
    schema: SCHEMA,
    ledger: createLedger(),
    session: { endingSeen: false, firstSaleSeen: false, whoKnowsHelloSeen: false },
    vanessa: { x: null, z: null }, // validated position; null = start position
    // helpMeFinish (v0.12): no weeds creep over her crops and no stick is lost (v0.13: and each
    // tool comes to her by itself from the start; the Tools come to me setting is gone, P29-7)
    settings: { reducedMotion: false, birdsNeverSteal: false, helpMeFinish: false },
    discoveries: {},
    archers: {},
  };
}

export function validateSave(d) {
  const errors = [];
  if (!d || typeof d !== 'object') return ['payload is not an object'];
  if (d.schema !== SCHEMA) return [`schema ${d.schema} is not ${SCHEMA}`];
  errors.push(...validateLedger(d.ledger).map((m) => `ledger: ${m}`));
  if (!d.session || typeof d.session.endingSeen !== 'boolean' || typeof d.session.firstSaleSeen !== 'boolean') errors.push('session');
  const v = d.vanessa;
  if (!v || !((v.x === null && v.z === null) || (Number.isFinite(v.x) && Number.isFinite(v.z)))) errors.push('vanessa position');
  if (!d.settings || typeof d.settings.reducedMotion !== 'boolean' || typeof d.settings.helpMeFinish !== 'boolean' || 'toolsComeToMe' in d.settings) errors.push('settings');
  return errors;
}

// ---------- test saves from a build before v0.9 (spec §12, P25) ----------
// v0.9 keeps schema v5 because only test saves exist, and loads an older v5 test save like this:
// R1 and R2 take the old rubble piles' remainders and R3-R8 start full; the rubble spot is
// dropped; wood or stone already deposited on a crop stage, which no longer takes any, goes back
// to Vanessa (capacity-safe: any stone that does not fit goes to the recovery rock, any wood to
// the starter branch piles, so nothing is lost); established crop nodes count as dug; the held
// tool starts at its lean and no upgrade is owned. The stone invariant is then checked by
// `repairStone`. Returns a new payload; one that already has the v0.9 shape is returned as is.
export function isPreV09(d) {
  const l = d?.ledger;
  return !!l && typeof l === 'object' && (!('rocks' in l) || 'pR1' in (l.piles ?? {}) || 'sR' in (l.spots ?? {}));
}
export function migratePreV09(d0) {
  if (!isPreV09(d0)) return d0;
  const d = structuredClone(d0);
  const l = d.ledger;
  const old = { piles: l.piles ?? {}, spots: l.spots ?? {}, nodes: l.nodes ?? {} };
  l.rocks = { ...createLedger().rocks };
  for (const [pile, rock] of [['pR1', 'R1'], ['pR2', 'R2']]) {
    if (Number.isInteger(old.piles[pile])) l.rocks[rock] = Math.max(0, Math.min(ROCKS[rock].units, old.piles[pile]));
  }
  l.piles = Object.fromEntries(Object.keys(PILES).map((id) => [id, old.piles[id] ?? PILES[id].units]));
  l.spots = { sW: old.spots.sW ?? { remaining: 0, readyAt: null } }; // the v0.9 wood spot (gone in v0.12)
  l.weeds = Object.fromEntries(WEEDS.map((id) => [id, l.weeds?.[id] === true]));
  l.nodes = Object.fromEntries(Object.keys(NODES).map((id) => {
    const n = old.nodes[id] ?? { remaining: 0, readyAt: null };
    const established = l.stages?.[NODES[id].stage]?.committed === true;
    return [id, established ? { remaining: n.remaining ?? 0, readyAt: n.readyAt ?? null, dug: true } : { remaining: 0, readyAt: null, dug: false }];
  }));
  l.tool = null;
  l.owned = { U1: false, U2: false }; // the v0.9 upgrades (gone in v0.12)
  // materials on a crop stage go back to Vanessa (crop stages take coins only now)
  for (const id of CROP_STAGES) {
    const dep = l.stages?.[id]?.deposited;
    if (!dep) continue;
    if (l.stages[id].committed) { dep.W = 0; dep.R = 0; continue; } // consumed when it committed
    for (const r of ['W', 'R']) {
      const n = dep[r] ?? 0;
      dep[r] = 0;
      const fit = Math.min(n, CAPACITY - (l.carried?.[r] ?? 0));
      if (l.carried) l.carried[r] += fit;
      let rest = n - fit;
      if (r === 'R') l.rocks.RX += rest;
      else {
        for (const p of Object.keys(PILES)) {
          const room = PILES[p].units - l.piles[p];
          const k = Math.min(room, rest);
          l.piles[p] += k;
          rest -= k;
        }
      }
    }
  }
  d.settings = { reducedMotion: false, birdsNeverSteal: false, toolsComeToMe: false, ...(d.settings ?? {}) };
  return d;
}

// ---------- saves from a build before v0.11 (pile, free first crop) ----------
// Still schema v5 (only test saves exist). A save without the material pile gets an empty one;
// the house mat's weed is gone (its clump is simply dropped); a farm that had started on the
// corn patch (a corn weed raked or C0 planted: v0.10 had only corn first) keeps corn as its first
// crop, and its theme; the first harvest counts as done if anything was ever sold or crops are
// carried. Returns a new payload; one that already has the v0.11 shape is returned as is.
export function isPreV011(d) {
  const l = d?.ledger;
  return !!l && typeof l === 'object' && !('yard' in l);
}
export function migratePreV011(d0) {
  if (!isPreV011(d0)) return d0;
  const d = structuredClone(d0);
  const l = d.ledger;
  l.yard = { W: 0, R: 0 };
  l.weeds = Object.fromEntries(WEEDS.map((id) => [id, l.weeds?.[id] === true]));
  const cornStarted = l.weeds.wC1 || l.weeds.wC2 || l.stages?.C0?.committed === true;
  l.crop = cornStarted ? 'C' : null;
  const sold = Object.values(l.sold ?? {}).reduce((n, x) => n + (x || 0), 0);
  const carriedCrops = ['C', 'S', 'T'].reduce((n, c) => n + (l.carried?.[c] ?? 0), 0);
  l.harvested = sold + carriedCrops > 0 || l.stages?.H1?.committed === true;
  // a free first crop keeps nothing in escrow
  if (l.crop && l.stages?.C0?.deposited) l.stages.C0.deposited = { coins: 0, W: 0, R: 0 };
  return d;
}

// ---------- saves from v0.11 (the market crate, partial builds, upgrades, the wood spot) ----------
// Still schema v5 (only test saves exist). Anything paid into a build that was not finished goes
// back where it came from (coins to the purse, wood and stone onto the yard pile), since builds
// are now done in one go; a bought rake or shovel upgrade is refunded (10 coins each); the wood
// spot's waiting batch is dropped (branches start falling around the tree again shortly); the
// table starts empty; no weed covers a crop yet. A committed T0 is its built raised bed (wood it
// never took is not charged). Returns a new payload; one that already has the v0.12 shape is
// returned as is.
export function isPreV012(d) {
  const l = d?.ledger;
  return !!l && typeof l === 'object' && !('table' in l);
}
export function migratePreV012(d0) {
  if (!isPreV012(d0)) return d0;
  const d = structuredClone(d0);
  const l = d.ledger;
  l.yard ??= { W: 0, R: 0 };
  const stages = l.stages ?? {};
  for (const id of STAGE_ORDER) {
    const st = stages[id];
    if (!st) { stages[id] = { committed: false }; continue; }
    const dep = st.deposited ?? {};
    if (!st.committed) {
      l.purse = (l.purse ?? 0) + (dep.coins ?? 0);
      l.yard.W += dep.W ?? 0;
      l.yard.R += dep.R ?? 0;
    }
    stages[id] = { committed: st.committed === true };
  }
  l.stages = stages;
  const owned = l.owned ?? {};
  l.purse = (l.purse ?? 0) + (owned.U1 ? 10 : 0) + (owned.U2 ? 10 : 0);
  delete l.owned;
  delete l.spots;
  l.sticks = Object.fromEntries(STICK_SLOTS.map((id) => [id, { units: 0, at: null }]));
  l.stickNext = null; // the first branch falls 20 s after the next tick (from H1 on)
  l.stickSeq = 0;
  l.overgrown = Object.fromEntries(Object.keys(NODES).map((id) => [id, null]));
  l.wilted = Object.fromEntries(Object.keys(NODES).map((id) => [id, false]));
  l.regrowAt = null;
  l.regrowSeq = 0;
  l.table = { C: 0, S: 0, T: 0 };
  l.sales = 0;
  return d;
}

// ---------- saves from v0.12 (the Tools come to me setting) ----------
// Still schema v5 (only test saves exist; spec v0.13 P29-10). The ledger needs nothing: its tables
// follow its house stage (a v0.12 table holds six at most, and one table always stands), and the
// tools she has taken once are read from it. The `Tools come to me` setting is dropped: a tool she
// has used comes by itself now, so a player who had it on loses nothing. Returns a new payload;
// one that already has the v0.13 shape is returned as is.
export function isPreV013(d) {
  return !!d?.settings && typeof d.settings === 'object' && 'toolsComeToMe' in d.settings;
}
export function migratePreV013(d0) {
  if (!isPreV013(d0)) return d0;
  const d = structuredClone(d0);
  delete d.settings.toolsComeToMe;
  return d;
}

// The stone invariant (§6.6 point 1): if the stone in the rocks, carried and at the pile no longer
// covers the stone still required, the recovery rock RX at R1's place gets the missing units.
// -> { data, added } (a new payload when it changed)
export function repairStone(d0) {
  const missing = stoneShortfall(d0.ledger);
  if (!missing) return { data: d0, added: 0 };
  const d = structuredClone(d0);
  d.ledger.rocks.RX += missing;
  return { data: d, added: missing };
}

// settings added since the first v5 test saves get their defaults
function withSettingDefaults(d) {
  if (!d?.settings || typeof d.settings !== 'object') return d;
  const missing = ['helpMeFinish'].filter((k) => typeof d.settings[k] !== 'boolean');
  if (!missing.length) return d;
  return { ...d, settings: { ...d.settings, ...Object.fromEntries(missing.map((k) => [k, false])) } };
}

// what a stored payload becomes before validation: older test saves brought up to v0.13
export function upgradePayload(d) {
  if (!d || typeof d !== 'object' || d.schema !== SCHEMA) return d;
  return migratePreV013(withSettingDefaults(migratePreV012(migratePreV011(migratePreV09(d)))));
}

// `mainComplete` derives from H4 even if endingSeen is false (spec §12).
export const derivedMainComplete = (d) => mainComplete(d.ledger);

function probeStorage(storage) {
  try {
    const k = `${KEY}/probe`;
    storage.setItem(k, '1');
    storage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function createSaveManager(storage = globalThis.localStorage) {
  let sessionOnly = !storage || !probeStorage(storage);
  let memory = null; // session-only copy
  let lastWriteError = null;

  function read(key) {
    try { return storage.getItem(key); } catch { return null; }
  }
  function parse(text) {
    if (text == null) return { status: 'none' };
    let d;
    try { d = JSON.parse(text); } catch { return { status: 'corrupt', errors: ['not JSON'] }; }
    if (d && typeof d.schema === 'number' && d.schema > SCHEMA) return { status: 'newer', schema: d.schema };
    const migrated = isPreV09(d) || isPreV011(d) || isPreV012(d) || isPreV013(d);
    d = upgradePayload(d);
    const errors = validateSave(d);
    if (errors.length) return { status: 'corrupt', errors };
    const fixed = repairStone(d);
    return { status: 'ok', data: fixed.data, ...(migrated ? { migrated: true } : {}), ...(fixed.added ? { recoveryRock: fixed.added } : {}) };
  }

  return {
    get sessionOnly() { return sessionOnly; },
    get lastWriteError() { return lastWriteError; },
    // -> { status: 'none' | 'ok' | 'corrupt' | 'newer', data?, backup?, errors? }
    load() {
      if (sessionOnly) return memory ? { status: 'ok', data: structuredClone(memory) } : { status: 'none' };
      const primary = parse(read(KEY));
      if (primary.status === 'ok' || primary.status === 'none' || primary.status === 'newer') return primary;
      const backup = parse(read(BACKUP_KEY));
      return { ...primary, backup: backup.status === 'ok' ? backup.data : null };
    },
    save(data) {
      const errors = validateSave(data);
      if (errors.length) throw new Error(`refusing to save an invalid payload: ${errors.join('; ')}`);
      const text = JSON.stringify(data);
      if (sessionOnly) { memory = JSON.parse(text); return { ok: true, sessionOnly: true }; }
      try {
        const prev = read(KEY);
        if (prev && parse(prev).status === 'ok') storage.setItem(BACKUP_KEY, prev);
        storage.setItem(KEY, text);
        lastWriteError = null;
        return { ok: true };
      } catch (err) {
        // quota or denial mid-session: keep playing, disclosed as session-only
        lastWriteError = String(err?.name ?? err);
        sessionOnly = true;
        memory = JSON.parse(text);
        return { ok: true, sessionOnly: true, error: lastWriteError };
      }
    },
    // Explicit reset (confirmed in the UI); keeps settings by default (spec §12).
    reset(keepSettings) {
      const fresh = createSaveData();
      if (keepSettings) fresh.settings = structuredClone(keepSettings);
      if (!sessionOnly) {
        try { storage.removeItem(KEY); storage.removeItem(BACKUP_KEY); } catch { /* storage gone */ }
      }
      memory = null;
      return fresh;
    },
  };
}
