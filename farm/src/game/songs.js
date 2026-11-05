// The songs and the egg hunt (spec §8). Pure: no three.js, no DOM. Found songs are kept in the
// save's `discoveries` field (spec §12), apart from the ledger, as { [id]: { at: active ms when
// found } }.
//
// v0.12 (captain 2026-11-02: "maybe spare coins and in fact a lot of coins unlock the easter egg of
// the song of money"): E21's trigger is saving up a lot of coins, E21_COINS in her purse.
//
// v0.16 (captain's notes on the v0.15 build, 2026-11-04):
// - "Collecting the easter eggs should be the second phase of the game, after the picture is
//   completed and all of the colour is filled in": the hunt opens once the home (H5) is built and
//   the finale has coloured the drawing (`eggPhase`), in Keep exploring. Each egg is one song.
// - "When you get an easter egg, a bird flies by and drops an egg": every song, E21 too, comes as
//   an egg a bird drops near Vanessa; she picks it up and the song is hers (main.js, world.js).
// - The triggers, few and simple for a phone: each song belongs to a spot on the farm (SPOTS), the
//   place its lyrics are about. A spot with a song still in it sparkles; when she walks up to it a
//   bird brings that spot's next egg. E21 stays the money song: once her purse holds E21_COINS (in
//   the hunt), the bird brings it wherever she is.
// - "Two versions at the end of the game ... one for kids with only a selection of the songs ...
//   the kids are not going to have the Suno link, only listening inside the game. In both versions
//   you can download the mp3": the edition is 'full' or 'kids' (`EDITIONS`); `songsFor` lists the
//   songs each one has (the kids list, `kids` and `why` below, confirmed by the captain on
//   2026-11-05), `sunoLink` gives no link in the kids edition, and every found song can be heard in
//   the game and downloaded as an MP3 (`mp3Path`, made locally by tools/make-songs.mjs).
//
// E## is the playlist's track ##, identified by its recording id (the Suno song id). Titles are the
// recordings' own (straight apostrophes); tracks 31-33 are three recordings with one title.
import { mainComplete } from './ledger.js';

export const E21_COINS = 80;
export const EDITIONS = ['full', 'kids'];

// the spots where the songs wait, each with its first hint (spec §8's tier one, about the place)
// v0.17c (captain: "let's do all this", after the suggestion to give each song spot its own small
// moment): at a spot with a song left, the egg no longer comes by itself. A button names a small
// thing to do there, tied to the spot's songs (`act.verb`); Vanessa does it (`act.ms`), an ink word
// pops up (`act.word`), the farm answers (world.js spotPoke), and then the bird brings the egg.
// The purse (E21) still comes by itself once she has the coins.
export const SPOTS = {
  door: { label: 'the front door', hint: 'A finished house still has songs behind its door.', act: { verb: 'Knock on the door', word: 'Knock knock!', ms: 1200 } },
  chimney: { label: 'the chimney', hint: 'Stand by the house and watch the smoke.', act: { verb: 'Watch the smoke', word: 'Puff!', ms: 1400 } },
  bench: { label: 'the bench', hint: 'Sit a while on the bench under the tree.', act: { verb: 'Rest on the bench', word: 'Aah…', ms: 1600 } },
  tree: { label: 'the tree', hint: 'The birds argue in the old tree.', act: { verb: 'Listen to the birds', word: 'Tweet? Tweet!', ms: 1400 } },
  tools: { label: 'the shovel and rake', hint: 'The tools by the house have something to say.', act: { verb: 'Lean the rake on the shovel', word: 'Clink!', ms: 1200 } },
  stones: { label: 'the stepping stones', hint: 'Small stones dream big behind the house.', act: { verb: 'Hop the stepping stones', word: 'Hop! Hop!', ms: 1300 } },
  bed: { label: 'the raised bed', hint: 'Something in the raised bed wants to be picked.', act: { verb: 'Say hello to the Who-Knows plant', word: '?♪', ms: 1500 } },
  sunflowers: { label: 'the sunflowers', hint: 'The sunflowers do everything together.', act: { verb: 'Dance with the sunflowers', word: 'Ta-da!', ms: 1500 } },
  corn: { label: 'the corn', hint: 'One stalk is outstanding in its field.', act: { verb: 'Tell the corn a joke', word: 'Corny!', ms: 1300 } },
  table: { label: 'the yard-sale table', hint: 'Overall pockets and yard-sale tables hold surprises.', act: { verb: 'Empty your pockets', word: 'Treasures!', ms: 1300 } },
  purse: { label: 'a full purse', hint: 'Spare coins add up: save a big purse and someone will sing about it.' },
};
// what to do at a spot before its egg comes (null for the purse)
export const spotAct = (spot) => SPOTS[spot]?.act ?? null;

const S = (n, title, uuid, spot, kids, why) => ({ n, title, suno: `https://suno.com/song/${uuid}`, spot, kids, why });
export const SONGS = {
  E01: S(1, 'I gave it to the world', '7936e058-846b-4016-9cbc-3ffe8ea5efd6', 'bench', true, 'A shy girl\'s drawing goes all over the world; ends with "don\'t be embarrassed to show your drawings".'),
  E02: S(2, 'Heat down low', '2f4bb9ea-02f8-4b47-a1fb-4ab549c2817f', 'chimney', true, 'A proud chimney drawing lines of smoke in the sky.'),
  E03: S(3, 'Wrong Kind Weed', 'bbebf61e-34a3-41a2-8618-d38320be52cc', 'bed', false, 'Cannabis jokes ("I\'d even be a gummy", "sour apple flavored").'),
  E04: S(4, 'You swore you quit', '7c91d99e-186c-4601-87e9-39683383ba3d', 'chimney', false, 'Quit-smoking jokes with drug innuendo ("still bakin\'", "puff puff").'),
  E05: S(5, 'We make a good team', '4e33212d-f3ee-4382-8fcf-466952a333c0', 'bench', true, 'The bench and the tree, a gentle friendship song.'),
  E06: S(6, 'Weeds Elite', '520ae622-8e5a-443c-a03b-46c122a2e455', 'bed', true, 'Cartoon-villain garden weeds plotting to take over ("HA HA HO!").'),
  E07: S(7, 'Sunflower Squad', '0cef0f75-40e7-42ff-8c5c-149a8fd88817', 'sunflowers', true, 'Goofy sunflowers sticking together; made for kids.'),
  E08: S(8, 'Pebble and Stepping Stone', 'ec714794-12b0-4eee-9aa6-6dd98c46c27a', 'stones', true, 'A little pebble dreaming of being a stepping stone.'),
  E09: S(9, 'I\'m not your hoe', '554c177d-a986-4317-bac1-b00c35836780', 'tools', false, 'Adult innuendo throughout ("hoe", "a rake in every meaning").'),
  E10: S(10, 'Conservative Beet', '65a3ec3a-a024-4a1d-9eeb-91858f7d4630', 'bed', false, 'Party-political satire (names a politician, "canceled", "liberty").'),
  E11: S(11, 'Insecure Sun', '0a4110c9-f108-4cf0-9ef1-26cc0b114ae6', 'tree', false, 'Body-image jokes ("too fat", "skipped stars, cut back on charge").'),
  E12: S(12, 'The House', 'e0862ce9-c646-4ea1-87fe-44763c51fd61', 'door', true, 'The house waiting for its family to come home; already the end-credits song.'),
  E13: S(13, 'Rake to Shovel', 'c25161a0-7d9c-47f6-9cba-a6fd684e3936', 'tools', true, 'The rake and the shovel standing side by side after work.'),
  E14: S(14, 'Cornstalk and Sunflower', '9604b750-3cfa-4f26-968b-62342419f438', 'sunflowers', true, 'A cornstalk longing for a sunflower; sad but gentle.'),
  E15: S(15, 'Let the birds debate', '5109ab01-961b-4fff-b43f-8016435f8a17', 'tree', true, 'Birds arguing over the best perch on the farm.'),
  E16: S(16, 'Pockets', '9bf707ac-fa84-4dab-9ada-ef5344e2976c', 'table', true, 'Everything in her overall pockets.'),
  E17: S(17, 'Stay in the shade', '4ed2951f-6387-4a1e-9c4c-a63b5422657a', 'bench', false, 'Swears in the chorus ("the birds keep sh...ing on me"); Benched (E27) is its clean version.'),
  E18: S(18, 'Tu Kaafi Zyaada Yellow Hai', '0c873d5c-11d9-47d7-bbeb-03edd2f4311e', 'tree', true, 'Calling out to the sun, "Sun! Oye! Sun!"; light teasing only.'),
  E19: S(19, 'Put it on paper', 'e4c23d08-1887-4a8e-ac7e-c03430ba1b2b', 'bench', true, 'A morning on the farm that might become a drawing.'),
  E20: S(20, 'Home Sweet Home', 'f21708a9-b2c2-42d2-9496-9b24c5769a9e', 'door', true, 'A child remembering the farm and Vanessa in her overalls.'),
  E21: S(21, 'One day she\'ll be rich', '4ffb52c7-27e7-4fcd-a0d5-fc73584a972d', 'purse', true, 'The best drawer in the world will buy a farm one day.'),
  E22: S(22, 'Luckiest man alive', 'b76f17eb-edb1-40b5-a7bb-babf11e29ea0', 'tree', true, 'A husband proud of his wife\'s drawings; sweet, no innuendo.'),
  E23: S(23, 'Don\'t you worry', '5185518d-fedc-47a1-b523-1827b04f99f2', 'bench', true, 'Encouragement for Vanessa to keep drawing.'),
  E24: S(24, 'And she goes by Vanessa', '1341ea44-7cc6-4206-88b8-3b89b738fa56', 'door', false, 'One swear word in verse 1 (E29 is the same song with it cleaned up).'),
  E25: S(25, 'Who Knows', '4c479436-9ddb-440e-83b0-22565ce89bd9', 'bed', true, 'A scribble plant that does not know what it is.'),
  E26: S(26, 'You might see', '289adb9a-da4e-449b-bb93-c668948b8c41', 'chimney', true, 'Smoke wondering what it would see beyond the roof.'),
  E27: S(27, 'Benched', 'f3fc5521-e06a-4dd4-aa7c-430546c2cd81', 'bench', true, 'The bench complaining that the birds poop on it; kids will laugh.'),
  E28: S(28, 'Corny', 'bc3fcc95-074a-47ce-8106-015e6c2a6dcd', 'corn', true, 'Corn puns ("a-maize-ing"); made for kids.'),
  E29: S(29, 'Demon Hunter (Vanessa\'s Song)', 'd739cbc9-f24e-4464-85e7-59c579c3b668', 'door', true, 'The farm tour with the clean words ("Girl, yeah no way", "oh my gosh").'),
  E30: S(30, 'House With The Smoke (Dance Break Remix)', '51aa89ff-d7fa-4c45-b0c5-47f35ba8c4fd', 'door', true, 'Only the farm-tour chorus, for dancing.'),
  E31: S(31, 'Pockets Full of Treasures', '5104f147-0c10-4e3a-acde-73bf318b13c3', 'table', true, 'The pocket song, another recording.'),
  E32: S(32, 'Pockets Full of Treasures', 'e6d38364-0b9e-4585-9434-c754d7268768', 'table', true, 'The pocket song, the short version.'),
  E33: S(33, 'Pockets Full of Treasures', '00d5c9f3-a38d-4d23-8b6d-6f3856c884bc', 'table', true, 'The pocket song, the long version with dolls, blankets and a novel.'),
};
// E21's first hint stays the coin hint (v0.12)
SONGS.E21.hint = SPOTS.purse.hint;
SONGS.E21.coins = E21_COINS;
export const SONG_IDS = Object.keys(SONGS);
// the kids edition's songs (26; confirmed by the captain on 2026-11-05: "everything confirmed")
export const KIDS_SONGS = SONG_IDS.filter((id) => SONGS[id].kids);

export const isEdition = (e) => EDITIONS.includes(e);
// the songs an edition has, in playlist order
export const songsFor = (edition = 'full') => (edition === 'kids' ? KIDS_SONGS : SONG_IDS);
export const hasSong = (id, edition = 'full') => songsFor(edition).includes(id);
// the song's Suno page: only in the full edition (the kids listen only inside the game)
export const sunoLink = (id, edition = 'full') => (edition === 'kids' || !SONGS[id] ? null : SONGS[id].suno);
// the MP3 of a song, made locally from the playlist archive (tools/make-songs.mjs), and the name
// it downloads as
export const mp3Path = (id) => `assets/songs/${id}.mp3`;
export const mp3Name = (id) => `${String(SONGS[id].n).padStart(2, '0')} ${SONGS[id].title.replace(/[\\/:*?"<>|]/g, '')}.mp3`;
// a card title that tells the three "Pockets Full of Treasures" recordings apart
export const songLabel = (id) => (SONG_IDS.filter((k) => SONGS[k].title === SONGS[id].title).length > 1 ? `${SONGS[id].title} (recording ${SONGS[id].n})` : SONGS[id].title);

// the hunt is phase two: open once the home is built and the drawing has its colour
export const eggPhase = (l) => mainComplete(l);
// how many of the edition's songs are found
export const foundCount = (edition = 'full', discoveries = {}) => songsFor(edition).filter((id) => discoveries?.[id]).length;
// the songs still waiting at a spot, in playlist order
export const eggsAt = (spot, edition = 'full', discoveries = {}) => songsFor(edition).filter((id) => SONGS[id].spot === spot && !discoveries?.[id]);
// the spots that still hold a song (E21's purse is not a place)
export const spotsWithEggs = (edition = 'full', discoveries = {}) => Object.keys(SPOTS).filter((s) => s !== 'purse' && eggsAt(s, edition, discoveries).length > 0);

// the songs this ledger has just earned that are not found yet (E21: a big purse), in id order.
// v0.16: only in the hunt (phase two), and only the edition's own
export function songsDue(l, discoveries = {}, edition = 'full') {
  if (!eggPhase(l)) return [];
  return songsFor(edition).filter((id) => !discoveries?.[id] && SONGS[id].coins !== undefined && l.purse >= SONGS[id].coins);
}

// The next egg a bird brings: the money song as soon as it is due (wherever she is), otherwise the
// next song of the spot she is at (`spot`, or null). Nothing before the hunt opens.
export function nextEgg(l, { edition = 'full', discoveries = {}, spot = null } = {}) {
  if (!eggPhase(l)) return null;
  const due = songsDue(l, discoveries, edition);
  if (due.length) return due[0];
  return spot ? eggsAt(spot, edition, discoveries)[0] ?? null : null;
}

// the found record for a song
export const found = (l) => ({ at: l.activeMs });

// the goal line in the hunt
export function huntLine(edition = 'full', discoveries = {}) {
  const all = songsFor(edition).length;
  const n = foundCount(edition, discoveries);
  if (n >= all) return `Every song found: ${n} of ${all}. Listen to them any time in Pause → Songs.`;
  return `Egg hunt · ${n} of ${all} songs · walk to a sparkle and do what it asks: a bird brings an egg`;
}
