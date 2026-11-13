// v0.17c (captain: "let's do all this", after the suggestion to hide the real gift jokes on the
// farm): five of Vanessa's gift jokes from the credits material lie hidden on the finished farm. In
// the exploring phase (after the finale, with the egg hunt) she can come across them; walking up
// to one picks it up, it is saved (`keepsakes` in the save, apart from the ledger) and its card
// shows the real photo from the credits material (assets/credits/credits.json; v0.20: its
// `keepsakes` list, since `gifts` became the slideshow's photos). Pure: no DOM.
// Nothing is needed for anything; Extras → Keepsakes (and the HUD's counter) lists what is found.
// (v0.27: but the last song, "I gave it to the world", waits for them: game/songs.js LAST_SONG.)
// v0.22 (Tiffany: "Remove the dates on the keepsakes"; "they should just be icons that look like
// the item in the photo"; the yellow circles are the songs' alone): a keepsake lies on the grass as
// the thing itself, with no ring and no yellow glint, and its prints show no year. Three of them
// moved a step, clear of the song spots (the CD, the novel, the Peep farmer).

// id -> what it is, the credits prints it shows (gift ids), where it lies (drawing u, v), and the
// hint once every song but the last is found (v0.27: the last one waits for the keepsakes)
export const KEEPSAKES = {
  jello: { label: 'the jello', gifts: ['gift-03', 'gift-05'], u: 84, v: 63, hint: 'Something red and wobbly by the sunflowers.' },
  ornament: { label: 'the ornament', gifts: ['gift-30'], u: 20, v: 67.5, hint: 'Something hangs about under the tree.' },
  cd: { label: 'the CD', gifts: ['gift-42', 'gift-43'], u: 41, v: 79.1, hint: 'A soundtrack lies out in the open grass.' },
  novel: { label: 'the novel', gifts: ['gift-32'], u: 19.8, v: 85.1, hint: 'Somebody left a bestseller by the bench.' },
  peep: { label: 'the Peep farmer', gifts: ['gift-40'], u: 60.6, v: 73.2, hint: 'A tiny farmer hides behind the raised bed.' },
};
export const KEEPSAKE_IDS = Object.keys(KEEPSAKES);
export const KEEPSAKE_REACH_M = 0.9; // walking this close picks one up
export const KEEPSAKE_NEAR_M = 4; // within this, it gives a small hop now and then (no glint: v0.22)
// v0.23 (Tiffany: "Have all the keepsakes icons not circles ... Have the icons bouncing a bit so she
// sees them"; "have just a few at a time ... replacing each other as she collects them"): the
// keepsakes on the grass now: the first KEEPSAKES_AT_ONCE still to find, in their order; each
// bounces gently all the time (world.js), wherever she is. No arrow points at one.
export const KEEPSAKES_AT_ONCE = 2;
export const visibleKeepsakes = (saved = {}, n = KEEPSAKES_AT_ONCE) => KEEPSAKE_IDS.filter((id) => !saved?.[id]).slice(0, n);

// they are out on the farm in the exploring phase only
export const keepsakesOut = (mainDone) => !!mainDone;
export const foundKeepsakes = (saved = {}) => KEEPSAKE_IDS.filter((id) => saved?.[id]);
export const keepsakesLeft = (saved = {}) => KEEPSAKE_IDS.filter((id) => !saved?.[id]);
export function keepsakeLine(saved = {}) {
  const n = foundKeepsakes(saved).length;
  return n >= KEEPSAKE_IDS.length ? `Every keepsake found (${n} of ${n})` : `${n} of ${KEEPSAKE_IDS.length} keepsakes found`;
}
// the prints of a keepsake, from the credits content (missing ones are left out)
export function keepsakePrints(id, credits) {
  const byId = new Map([...(credits?.gifts ?? []), ...(credits?.keepsakes ?? [])].map((g) => [g.id, g]));
  return (KEEPSAKES[id]?.gifts ?? []).map((g) => byId.get(g)).filter(Boolean);
}
