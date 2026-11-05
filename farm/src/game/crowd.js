// The yard sale's people (v0.13, captain's v0.12 playtest: "the clients are always the same and
// blocky. we can maybe make them more random, or make them more people"; answer 3 "1 table per
// stage": buyers go from 2-3 to about 8-10, other neighbours selling too at the end). Pure and
// seeded, so a sale replays the same: how many come to a sale, and what each neighbour looks
// like. The world draws them (props.js `buyer`); nothing here touches the ledger.
import { BUYERS, TABLES_MAX } from './data.js';
import { seeded } from './ledger.js';

// colours are names of the shared palette (world/look.js PAL) or plain hex numbers
export const SKINS = [0xe2b48f, 0xc9946b, 0xf0c9a6, 0x9c6b4a, 0xd8a27a, 0x7a4f35];
export const HAIRS = [0x4a2f22, 0x2b2522, 0x8a5a33, 0xc9a25e, 0x9a9a96, 0x6b3424, 0xe0c890];
export const TOPS = [0x426b91, 0xb53e36, 0x6b8a52, 0xe6b83e, 0xf1deb5, 0x8b6fa8, 0xd9825b, 0x4f8f8a, 0xf4eddc, 0xc76f8f];
export const BOTTOMS = [0x3d434b, 0x426b91, 0x8d603e, 0x5b6b4a, 0xf1deb5, 0x2f3d55];
export const HATS = [0xe6b83e, 0xf1deb5, 0xb53e36, 0x426b91, 0x6b8a52];
// spec v0.13 P29-4's kit: short hair, a bun, a ponytail, curls or a braid; a sun hat, a cap or a
// headscarf about one time in three; a basket, a cloth bag or nothing to carry
export const HAIR_STYLES = ['short', 'bun', 'ponytail', 'curly', 'braid'];
export const HAT_STYLES = ['straw', 'cap', 'scarf'];
export const CARRY = ['basket', 'tote', null];
export const POOL = 16; // the neighbours the world makes once; each sale picks from them

// one neighbour, n = 0..POOL-1: a kid now and then, a hat now and then, a dress or trousers, a
// basket or a tote; heights and builds vary
export function personLook(n) {
  const r = (k) => seeded(n * 131 + k * 17 + 5);
  const pick = (list, k) => list[Math.floor(r(k) * list.length) % list.length];
  const kid = n % 6 === 3; // about one in six (three of the sixteen)
  const height = kid ? 1.1 + r(1) * 0.15 : 1.45 + r(1) * 0.35;
  const look = {
    n,
    kid,
    height: +height.toFixed(3),
    build: +(kid ? 0.85 + r(2) * 0.15 : 0.85 + r(2) * 0.4).toFixed(3), // shoulders and waist
    skin: pick(SKINS, 3),
    hair: pick(HAIRS, 4),
    hairStyle: HAIR_STYLES[(n * 3 + Math.floor(r(5) * 2)) % HAIR_STYLES.length], // every style, spread
    hat: n % 3 === 1 ? HAT_STYLES[Math.floor(n / 3) % HAT_STYLES.length] : null, // one in three
    hatColour: pick(HATS, 8),
    top: TOPS[(n * 7 + Math.floor(r(9) * 3)) % TOPS.length], // spread over the whole palette
    bottom: pick(BOTTOMS, 10),
    dress: !kid && r(11) < 0.3,
    carry: CARRY[(n + Math.floor(r(12) * 2)) % CARRY.length],
    walk: +(0.85 + r(13) * 0.35).toFixed(3), // stride rate
  };
  return look;
}
export const LOOKS = Array.from({ length: POOL }, (_, n) => personLook(n));

// a height band (P29-4: no two buyers in one sale share height band, hair or hat and top colour)
export const heightBand = (look) => (look.kid ? 'child' : look.height < 1.6 ? 'short' : look.height < 1.7 ? 'middle' : 'tall');
export const lookKey = (look) => `${heightBand(look)}|${look.hat ?? look.hairStyle}|${look.top}`;

// how many buyers come to sale number `sale` with `tables` tables out: 2-3 at one table, about
// 8-10 at four
export function buyerCount(tables, sale) {
  const [lo, hi] = BUYERS[Math.max(1, Math.min(TABLES_MAX, tables)) - 1];
  return lo + Math.floor(seeded(sale * 7 + 3) * (hi - lo + 1));
}

// which neighbours come to sale `sale`: `count` different ones of the pool (a seeded shuffle,
// `skip` kept out), never two with the same height band,
// hair or hat and top colour, and never the same set as the sale before
function shuffled(sale, skip) {
  const ids = Array.from({ length: POOL }, (_, i) => i).filter((i) => !skip.includes(i));
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(sale * 977 + i * 13) * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const out = []; const keys = new Set();
  for (const i of ids) { const k = lookKey(LOOKS[i]); if (!keys.has(k)) { keys.add(k); out.push(i); } }
  return out;
}
export function crowdFor(sale, count, skip = []) {
  const pick = (s) => shuffled(s, skip).slice(0, count);
  const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  let who = pick(sale);
  if (sale > 1 && same(who, pick(sale - 1))) {
    // the same set as last time: swap one for someone who did not come then
    const out = shuffled(sale, skip).find((i) => !who.includes(i));
    if (out !== undefined) who = [...who.slice(0, -1), out];
  }
  return who;
}

// v0.16: no neighbour sells any more (the captain: "Remove the extra sellers"); every neighbour
// can come to buy
