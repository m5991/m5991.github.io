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

// v0.31 (Tiffany's "Edits #5": "Don't include #17 in the keepsakes, just the slideshow"; "Don't
// write days or anything other than the titles I give you for the keepsakes and slideshow. Here are
// the numbers that refer to the order I would like them to appear. Don't show the numbers in the
// captions"; with Tiffany: "all should be keepsakes except number 17 the invitation to the party";
// "the ceiling photo can go with the poster"): every item of her numbered list but #17, in her
// order: 24 keepsakes. Each is the thing itself on the grass (props.js keepsake), its card shows
// her photos of it (`gifts`: the slideshow's photos, assets/credits/credits.json) under her title
// alone. Five keep the ids of v0.17c-v0.30's keepsakes (jello, novel, ornament, peep, cd), so a farm
// that found them keeps them found. `n` is her number (never shown). `u`, `v`: where it lies, spread
// over the farm and the grass round it (she can run anywhere now), clear of the song circles, the
// crops, the stations and the weeds on the grass (test/v031-world.test.mjs).
// `title` is her title; #6.5's photo caption leaves out the family name (the public site shows no
// surname: TITLE_SHOWN).
const K = (n, title, label, gifts, u, v, hint) => ({ n, title, label, gifts, u, v, hint });
// v0.33 (Tiffany's "Edits #7": "reverse the order of the slide show pictures and also in the
// keepsakes" for the jello, the backdrop, the first two puzzle photos, the Peeps, the white-elephant
// painting, the novel and the CD; the Christmas tree's 2nd photo last; the 3rd T-shirt photo first;
// the surprise party reordered and its bird-wings photo, photo-41, removed): each keepsake lists its
// photos in her new order, the slideshow's `sequence` (credits.json) the same
const ph = (...k) => k.map((i) => `photo-${String(i).padStart(2, '0')}`);
export const KEEPSAKES = {
  masterpiece: K('1', 'The Masterpiece', 'the masterpiece', ph(1), 45, 81.5, 'Something lies in the open grass below the path.'),
  card: K('2', 'The Greeting Card', 'the greeting card', ph(2), 102, 57.5, 'Something lies out past the right edge of the corn.'),
  flyer: K('3', 'The Moms Night Out Flyer', 'the flyer', ph(3), -3, 56, 'Something lies out past the far left edge, behind the tree.'),
  book: K('4', 'The Children’s Picture Book', 'the picture book', ph(4), 66, 56, 'Something lies between the yard-sale tables and the corn.'),
  blanket: K('4.5', 'The Blanket', 'the blanket', ph(5, 6), 102, 92, 'Something lies out past the right edge, below the sunflowers.'),
  jello: K('5', 'The Jello', 'the jello', ph(8, 7), 19.5, 63.5, 'Something red and wobbly sits under the old tree.'),
  present: K('6', 'The 3D White Elephant Present', 'the 3D present', ph(10, 9), -3, 95, 'Something lies out past the far left edge, at the front.'),
  xmascard: K('6.5', 'The Christmas Card', 'the Christmas card', ph(11), 54, 65, 'Something lies just in front of the yard-sale tables.'),
  tree: K('7', 'The Secret Santa Christmas Tree', 'the Christmas tree', ph(12, 14, 15, 16, 13), 85.5, 59, 'Something stands between the corn and the sunflowers.'),
  earrings: K('7.5', 'The Earrings', 'the earrings', ph(17), 16.5, 56, 'Something small lies behind the old tree.'),
  bookmarks: K('8', 'The Bookmarks', 'the bookmarks', ph(18), 69, 74, 'Something lies in the grass above the raised bed.'),
  backdrop: K('9', 'The Tutor Photo Backdrop', 'the photo backdrop', ph(20, 19), 102, 66.5, 'Something stands out past the right edge, by the sunflowers.'),
  wrapping: K('10', 'The Wrapping Paper', 'the wrapping paper', ph(21), -1.5, 62, 'Something lies at the far left edge.'),
  novel: K('11', 'The Full Length “Who Done It” Novel', 'the novel', ph(23, 22), 13.5, 104, 'Somebody left a bestseller out at the very front, on the left.'),
  puzzle: K('13', 'The Surprise Puzzle Competition', 'the puzzle', ph(26, 25, 27), 97.5, 60.5, 'Something lies at the right edge, past the corn.'),
  peep: K('13.5', 'The Peeps Diorama', 'the Peeps diorama', ph(29, 28), 76.5, 56, 'A tiny farmer hides at the end of the tables, by the corn.'),
  shirts: K('14', 'The Twin Day T-Shirts', 'the T-shirts', ph(32, 30, 31, 33), 13.5, 60.5, 'Something lies behind the old tree, on the left.'),
  yearbook: K('15', 'The Yearbook Background', 'the yearbook', ph(34, 35), 57, 71, 'Something lies below the yard-sale tables.'),
  cd: K('16', 'The CD', 'the CD', ph(37, 36), 22.5, 59, 'A soundtrack lies by the path, near the old tree.'),
  whoknows: K('17.5', 'The Who Knows Plant', 'the Who-Knows plant', ph(39), 60, 92, 'Something green and wiggly lies on the grass.'),
  party: K('18', 'The Farm Party', 'the farm party', ph(45, 42, 40, 46, 44, 43), 0, 104, 'Something lies out at the very front, far left.'),
  barbie: K('19', 'The Barbie Clothes', 'the doll clothes', ph(47), 22.5, 56, 'Something lies by the path, behind the tree.'),
  poster: K('20', 'The Poster', 'the poster', ph(48, 49), 96, 57.5, 'Something lies at the right edge, past the corn.'),
};
// what a keepsake's title says on screen: her title, but #6.5 without the family name
export const TITLE_SHOWN = { xmascard: 'The Christmas Card' };
export const keepsakeTitle = (id) => TITLE_SHOWN[id] ?? KEEPSAKES[id]?.title ?? '';
// v0.31: the slideshow's one item that is not a keepsake (#17, the invitation)
// v0.32 (Tiffany's "Edits #6": "So that we keep the same keepsakes as songs, you can remove the car
// decoration one and the video game one, but keep them in the slideshow"; "There is one new category,
// #17.5, which should be titled, 'The Who Knows Plant'"): #12 The Car Ornament and #21 The Video Game
// are in the slideshow only, with #17; #17.5 is a keepsake. 23 keepsakes, as many as the songs. Her
// new photos (50 in all, tools/make-photos.mjs) renumber the prints. A farm that found the car ornament
// or the video game keeps that in its save; they are no longer counted.
export const SLIDESHOW_ONLY = ['photo-24', 'photo-38', 'photo-50'];
export const KEEPSAKE_IDS = Object.keys(KEEPSAKES);
export const KEEPSAKE_REACH_M = 0.9; // walking this close picks one up
export const KEEPSAKE_NEAR_M = 4; // within this, it gives a small hop now and then (no glint: v0.22)
// v0.23 (Tiffany: "Have all the keepsakes icons not circles ... Have the icons bouncing a bit so she
// sees them"; "have just a few at a time ... replacing each other as she collects them"): the
// keepsakes on the grass now: the first KEEPSAKES_AT_ONCE still to find, in their order; each
// bounces gently all the time (world.js), wherever she is. No arrow points at one.
export const KEEPSAKES_AT_ONCE = 2;
export const visibleKeepsakes = (saved = {}, n = KEEPSAKES_AT_ONCE) => KEEPSAKE_IDS.filter((id) => !saved?.[id]).slice(0, n);
// v0.30 (Tiffany: "Make the keepsakes also pop up one by one, maybe one for every song that's
// available so you can slowly collect them"): one keepsake on the grass at a time, and one more
// for each song found: the first comes out with the first song, and the next only once another
// song has been found (so with n songs found, n keepsakes have come out at most). `songsFound`: the
// number of songs found. (v0.23-v0.29: two at a time from the start, `visibleKeepsakes`.)
// v0.31: 24 keepsakes and 23 songs, the last of which waits for every keepsake: once every song but
// the last is found (`allButLast`), the ones still left come out one after another, each as the one
// before is picked up (without it the last two would never come out).
// v0.32 (Tiffany's "Edits #6": "Play one song, then while the song plays have her find the keepsake,
// then once the keepsake is found, then the next song becomes available. Stagger them so they are
// timed evenly. End on a song (I gave it to the world.)"): a song and a keepsake take turns: each
// song found brings out one keepsake (while it plays: main.js waits HUNT.restMs into the song), and
// the next song's circle comes once it is found (`songTurn`). 23 songs and 23 keepsakes: the last
// song ends the turns, and its keepsake comes out as she explores on with it playing.
// (`allButLast`, v0.31's rule for the last ones, is no longer needed: one each, always.)
// v0.33 (Tiffany's "Edits #7": "Have the keepsakes first so it ends the game in a song not a
// keepsake"): `allButLast` (every song but the last is found): the keepsakes still left come out one
// after the other with no song, and the last song's circle waits for them all (main.js actOpen), so
// "I gave it to the world" is the very last find. (v0.32: the last keepsake came after the last song.)
export function keepsakesNow(saved = {}, songsFound = 0, allButLast = false) {
  const left = KEEPSAKE_IDS.filter((id) => !saved?.[id]);
  const out = KEEPSAKE_IDS.length - left.length;
  return left.length && (songsFound > out || allButLast) ? [left[0]] : [];
}
// v0.32: a song's circle can come out: every song found so far has had its keepsake found
export const songTurn = (saved = {}, songsFound = 0) => foundKeepsakes(saved).length >= Math.min(songsFound, KEEPSAKE_IDS.length);

// they are out on the farm in the exploring phase only
export const keepsakesOut = (mainDone) => !!mainDone;
export const foundKeepsakes = (saved = {}) => KEEPSAKE_IDS.filter((id) => saved?.[id]);
export const keepsakesLeft = (saved = {}) => KEEPSAKE_IDS.filter((id) => !saved?.[id]);
export function keepsakeLine(saved = {}) {
  const n = foundKeepsakes(saved).length;
  return n >= KEEPSAKE_IDS.length ? `Every keepsake found (${n} of ${n})` : `${n} of ${KEEPSAKE_IDS.length} keepsakes found`;
}
// the prints of a keepsake, from the credits content (missing ones are left out)
// (v0.31: each print shows her title only; the card's own heading is the title too)
export function keepsakePrints(id, credits) {
  const byId = new Map([...(credits?.gifts ?? []), ...(credits?.keepsakes ?? [])].map((g) => [g.id, g]));
  return (KEEPSAKES[id]?.gifts ?? []).map((g) => byId.get(g)).filter(Boolean).map((g) => ({ ...g, title: keepsakeTitle(id), caption: '' }));
}
