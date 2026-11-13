// The end credits (spec §5.1, A25-9, P25-8; v0.17): the vocal House (E12) played once, its
// checked lyrics a line at a time, Vanessa's gift jokes over the years as paper prints, the
// messages from everyone who loves her (only from volunteers, with consent), and a closing card.
// Pure: no DOM, no audio. `validateCredits` checks the content file (assets/credits/credits.json),
// `planCredits` lays the cards on the song's clock, `creditsAt` says what shows at a time.
//
// Rules from §5.1: the gifts fill the first part of the song and the messages the rest; a gift
// holds 4–6 s (at least 3 s when there are more than fit, the rest then on a closing page of
// small prints; up to 8 s when there are fewer and no messages); a message holds 2 s plus a
// third of a second a word, 5–12 s, a longer one running over several cards. Nothing is
// invented: an empty section is left out, and a player build shows no placeholder and no message
// without consent.
//
// v0.20 (captain 2026-11-10: "Isn't it the credits the slide show? Also there will not be no slide
// show on kids version"): the pictures are now the 26 photos Tiffany shared of the drawing over the
// years (the content file's `gifts`, in date order; made by tools/make-photos.mjs), so the full
// edition's credits are a slideshow of them over the song, each held about six seconds, with the
// title, the lyrics and the closing card as before. The kids edition shows no photo (`photos:
// false`): its title card, then the coloured drawing alone under the lyrics, then the closing card.
// The prints the hidden keepsakes show are the content file's `keepsakes` (game/keepsakes.js).

export const CREDITS = {
  titleS: 5, // the opening card, over the song's intro
  closingS: 14, // the closing card, at the end
  closingAloneS: 30, // with no picture and no message before it (the kids edition): its last half minute
  tailS: 1.5, // the last moment of the song, the frame alone
  gift: { min: 3, normal: [4, 6], max: 8 },
  message: { base: 2, perWord: 1 / 3, min: 5, max: 12 },
};

const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean);
const hold = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// -> a list of problems; `player`: the stricter rules of a build shown to players
export function validateCredits(c, lyrics = null, { player = false, durationS = null } = {}) {
  const e = [];
  if (!c || c.version !== 1) return ['version'];
  if (!c.song?.eggId || !c.song.audio || !c.song.lyrics) e.push('song');
  const ids = new Set();
  for (const [k, list] of [['gifts', c.gifts], ['messages', c.messages], ['keepsakes', c.keepsakes ?? []]]) {
    if (!Array.isArray(list)) { e.push(k); continue; }
    for (const x of list) {
      if (!x.id) e.push(`${k}: an item has no id`);
      else if (ids.has(x.id)) e.push(`${x.id}: id used twice`);
      ids.add(x.id);
      if (x.image && !x.alt) e.push(`${x.id}: an image needs alt text`);
      if (player && x.placeholder) e.push(`${x.id}: a placeholder in a player build`);
    }
  }
  for (const g of [...(c.gifts ?? []), ...(Array.isArray(c.keepsakes) ? c.keepsakes : [])]) {
    if (!(g.year === null || Number.isInteger(g.year))) e.push(`${g.id}: year`);
    if (!g.image) e.push(`${g.id}: no image`);
  }
  for (const m of c.messages ?? []) {
    if (!m.from || !m.text) e.push(`${m.id}: a message needs its sender and its words`);
    if (player && m.consent !== true) e.push(`${m.id}: no consent`);
  }
  if (c.sequence !== null && c.sequence !== undefined && (!Array.isArray(c.sequence) || c.sequence.some((id) => !ids.has(id)))) e.push('sequence');
  if (lyrics) {
    if (player && lyrics.checked !== true) e.push('lyrics are not checked by listening');
    let prev = -Infinity;
    for (const l of lyrics.lines ?? []) {
      if (!(l.t >= prev && l.end > l.t && l.text)) { e.push(`lyric at ${l.t}`); break; }
      if (durationS !== null && l.end > durationS) { e.push(`lyric at ${l.t} runs past the song`); break; }
      prev = l.t;
    }
  }
  return e;
}

// a long message runs over several cards, each within the hold limits
export function messageCards(m) {
  const w = words(m.text);
  const per = Math.floor((CREDITS.message.max - CREDITS.message.base) / CREDITS.message.perWord); // 30 words
  const out = [];
  for (let i = 0; i < w.length || i === 0; i += per) {
    const part = w.slice(i, i + per);
    out.push({ kind: 'message', id: out.length ? `${m.id}#${out.length + 1}` : m.id, from: m.from, text: part.join(' '), image: out.length ? null : m.image ?? null, alt: m.alt ?? '', hold: hold(CREDITS.message.base + CREDITS.message.perWord * part.length, CREDITS.message.min, CREDITS.message.max) });
    if (!w.length) break;
  }
  return out;
}

// What the credits show, on the song's clock (seconds). -> { duration, cards: [{ kind, start, end, ... }] }
// kinds: 'title', 'gift' (side 'left' | 'right'), 'prints' (the gifts that did not fit), 'message', 'closing'
// `photos` false: no picture at all (v0.20's kids edition; v0.22 has one game, with the photos)
export function planCredits(c, durationS, { player = true, photos = true } = {}) {
  const show = (x) => photos && !(player && x.placeholder);
  // by year, then file order; an undated gift takes the year of the one before it in the file,
  // so it keeps its place among them (an explicit `sequence` sets any other order)
  let carry = -Infinity;
  const gifts = (c.gifts ?? []).filter((g) => show(g) && g.image).map((g, i) => { carry = g.year ?? carry; return { ...g, order: i, sortYear: carry }; });
  const order = Array.isArray(c.sequence) ? c.sequence : null;
  if (order) gifts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  else gifts.sort((a, b) => a.sortYear - b.sortYear || a.order - b.order);
  const messages = (c.messages ?? []).filter((m) => !(player && m.placeholder) && (!player || m.consent === true) && m.text).flatMap(messageCards);
  // the song under its name in Tiffany's list (v0.20: "House"; the content file's `song.title`)
  const cards = [{ kind: 'title', start: 0, end: CREDITS.titleS, title: 'The Farm', song: c.song?.title ?? 'House' }];
  const closing = c.closing?.text ? CREDITS.closingS : 0;
  const end = Math.max(CREDITS.titleS, durationS - CREDITS.tailS);
  const msgS = messages.reduce((n, m) => n + m.hold, 0);
  let room = Math.max(0, end - closing - CREDITS.titleS - msgS);
  let t = CREDITS.titleS;
  if (gifts.length) {
    const top = messages.length ? CREDITS.gift.normal[1] : CREDITS.gift.max;
    let each = room / gifts.length;
    let shown = gifts;
    let rest = [];
    if (each < CREDITS.gift.min) {
      // more than fit: as many as fit at 3 s, then one page of small prints for the rest
      const n = Math.max(0, Math.floor((room - CREDITS.gift.normal[1]) / CREDITS.gift.min));
      shown = gifts.slice(0, n);
      rest = gifts.slice(n);
      each = CREDITS.gift.min;
    }
    each = hold(each, CREDITS.gift.min, top);
    shown.forEach((g, i) => { cards.push({ kind: 'gift', ...g, side: i % 2 ? 'right' : 'left', n: i + 1, of: gifts.length, start: t, end: t + each }); t += each; });
    if (rest.length) { const s = Math.max(CREDITS.gift.normal[1], room - each * shown.length); cards.push({ kind: 'prints', items: rest, start: t, end: t + s }); t += s; }
  }
  for (const m of messages) { cards.push({ ...m, start: t, end: t + m.hold }); t += m.hold; }
  if (closing) {
    let s = Math.max(closing, end - t);
    // nothing before it: the drawing alone under the lyrics first, then the closing card
    if (!gifts.length && !messages.length) s = Math.max(closing, Math.min(s, CREDITS.closingAloneS));
    const start = Math.max(t, end - s);
    cards.push({ kind: 'closing', title: c.closing.title ?? '', text: c.closing.text, start, end: start + s });
    t = start + s;
  }
  return { duration: Math.max(durationS, t), cards };
}

// at time t: the card showing, the lyric line being sung and the next one (lighter, beneath)
export function creditsAt(plan, lyrics, t) {
  const card = plan.cards.find((c) => t >= c.start && t < c.end) ?? null;
  const lines = lyrics?.lines ?? [];
  let i = -1;
  for (let k = 0; k < lines.length; k++) if (lines[k].t <= t) i = k; else break;
  const line = i >= 0 && t < lines[i].end ? lines[i] : null;
  const next = lines[i + 1] && lines[i + 1].t - t < 6 ? lines[i + 1] : null;
  return { card, line, next, done: t >= plan.duration };
}

// (v0.22 had a Credits card in Extras, the plain list of who and what the game is made from.
// v0.23, Tiffany: "Get rid of the credits tab": it is gone. What the game is made from, and the
// licences of the font and the motion pack, are in README.md, assets/fonts/OFL.txt and
// assets/models/SOURCES.md.)
