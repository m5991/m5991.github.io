// The songs and the egg hunt (spec §8). Pure: no three.js, no DOM. Found songs are kept in the
// save's `discoveries` field (spec §12), apart from the ledger, as { [id]: { at: active ms when
// found } }.
//
// v0.16 (captain's notes on the v0.15 build, 2026-11-04):
// - "Collecting the easter eggs should be the second phase of the game, after the picture is
//   completed and all of the colour is filled in": the hunt opens once the home (H5) is built and
//   the finale has coloured the drawing (`eggPhase`), in Keep exploring. Each egg is one song.
// - "When you get an easter egg, a bird flies by and drops an egg": every song comes as an egg a
//   bird drops near Vanessa; she picks it up and the song is hers (main.js, world.js).
// - "Two versions at the end of the game ... one for kids with only a selection of the songs ...
//   the kids are not going to have the Suno link, only listening inside the game. In both versions
//   you can download the mp3": the edition is 'full' or 'kids' (`EDITIONS`); `sunoLink` gives no
//   link in the kids edition, and every found song can be heard in the game and downloaded as an
//   MP3 (`mp3Path`, made locally by tools/make-songs.mjs).
// v0.17c: at a spot with a song, a button names a small thing to do there (`act.verb`); Vanessa
// does it (`act.ms`), an ink word pops up (`act.word`), the farm answers (world.js spotPoke), and
// then the bird brings the egg.
//
// v0.20 (captain 2026-11-10: "We have the list of songs ... We should use the titles Tiffany uses
// in the google drive for the songs"; Tiffany's lists become the whole song set: "Yes that's what
// needs to be done"): Tiffany's two Google Drive lists, one song per farm object, are the song set.
// The full edition has exactly the 12 songs of her "Adult farm songs" and the kids edition exactly
// the 11 of her "Kid's farm songs" (`LISTS`, in her order). Each song is shown by her label for it,
// exactly as she wrote it (`songTitle`: "Smoke" for the kids' chimney song, "Chimney" for the
// adults'), and waits at its object's spot on the farm (`songSpot`). The other recordings stay in
// the archive below (`SONGS`, so an older save's discoveries still read) but are out of play: no
// star, no card, no count. The money song (E21) is one of them, so no song comes from the purse
// any more; `songsDue` still brings any song given `coins`, should a list name one again.
//
// E## is the playlist's track ##, identified by its recording id (the Suno song id). `title` is
// the recording's own title in the October archive, kept only to tell the files apart.
import { mainComplete } from './ledger.js';

export const E21_COINS = 80;
export const EDITIONS = ['full', 'kids'];

const S = (n, title, uuid) => ({ n, title, suno: `https://suno.com/song/${uuid}` });
export const SONGS = {
  E01: S(1, 'I gave it to the world', '7936e058-846b-4016-9cbc-3ffe8ea5efd6'),
  E02: S(2, 'Heat down low', '2f4bb9ea-02f8-4b47-a1fb-4ab549c2817f'),
  E03: S(3, 'Wrong Kind Weed', 'bbebf61e-34a3-41a2-8618-d38320be52cc'),
  E04: S(4, 'You swore you quit', '7c91d99e-186c-4601-87e9-39683383ba3d'),
  E05: S(5, 'We make a good team', '4e33212d-f3ee-4382-8fcf-466952a333c0'),
  E06: S(6, 'Weeds Elite', '520ae622-8e5a-443c-a03b-46c122a2e455'),
  E07: S(7, 'Sunflower Squad', '0cef0f75-40e7-42ff-8c5c-149a8fd88817'),
  E08: S(8, 'Pebble and Stepping Stone', 'ec714794-12b0-4eee-9aa6-6dd98c46c27a'),
  E09: S(9, 'I\'m not your hoe', '554c177d-a986-4317-bac1-b00c35836780'),
  E10: S(10, 'Conservative Beet', '65a3ec3a-a024-4a1d-9eeb-91858f7d4630'),
  E11: S(11, 'Insecure Sun', '0a4110c9-f108-4cf0-9ef1-26cc0b114ae6'),
  E12: S(12, 'The House', 'e0862ce9-c646-4ea1-87fe-44763c51fd61'),
  E13: S(13, 'Rake to Shovel', 'c25161a0-7d9c-47f6-9cba-a6fd684e3936'),
  E14: S(14, 'Cornstalk and Sunflower', '9604b750-3cfa-4f26-968b-62342419f438'),
  E15: S(15, 'Let the birds debate', '5109ab01-961b-4fff-b43f-8016435f8a17'),
  E16: S(16, 'Pockets', '9bf707ac-fa84-4dab-9ada-ef5344e2976c'),
  E17: S(17, 'Stay in the shade', '4ed2951f-6387-4a1e-9c4c-a63b5422657a'),
  E18: S(18, 'Tu Kaafi Zyaada Yellow Hai', '0c873d5c-11d9-47d7-bbeb-03edd2f4311e'),
  E19: S(19, 'Put it on paper', 'e4c23d08-1887-4a8e-ac7e-c03430ba1b2b'),
  E20: S(20, 'Home Sweet Home', 'f21708a9-b2c2-42d2-9496-9b24c5769a9e'),
  E21: S(21, 'One day she\'ll be rich', '4ffb52c7-27e7-4fcd-a0d5-fc73584a972d'),
  E22: S(22, 'Luckiest man alive', 'b76f17eb-edb1-40b5-a7bb-babf11e29ea0'),
  E23: S(23, 'Don\'t you worry', '5185518d-fedc-47a1-b523-1827b04f99f2'),
  E24: S(24, 'And she goes by Vanessa', '1341ea44-7cc6-4206-88b8-3b89b738fa56'),
  E25: S(25, 'Who Knows', '4c479436-9ddb-440e-83b0-22565ce89bd9'),
  E26: S(26, 'You might see', '289adb9a-da4e-449b-bb93-c668948b8c41'),
  E27: S(27, 'Benched', 'f3fc5521-e06a-4dd4-aa7c-430546c2cd81'),
  E28: S(28, 'Corny', 'bc3fcc95-074a-47ce-8106-015e6c2a6dcd'),
  E29: S(29, 'Demon Hunter (Vanessa\'s Song)', 'd739cbc9-f24e-4464-85e7-59c579c3b668'),
  E30: S(30, 'House With The Smoke (Dance Break Remix)', '51aa89ff-d7fa-4c45-b0c5-47f35ba8c4fd'),
  E31: S(31, 'Pockets Full of Treasures', '5104f147-0c10-4e3a-acde-73bf318b13c3'),
  E32: S(32, 'Pockets Full of Treasures', 'e6d38364-0b9e-4585-9434-c754d7268768'),
  E33: S(33, 'Pockets Full of Treasures', '00d5c9f3-a38d-4d23-8b6d-6f3856c884bc'),
};
// the money song's trigger, kept with its recording (out of play since v0.20: see above)
SONGS.E21.coins = E21_COINS;
export const SONG_IDS = Object.keys(SONGS);

// Tiffany's lists, in her order: [her label, exactly as written; the recording; its spot on the farm]
// (Google Docs "Adult farm songs" and "Kid's farm songs", fetched 2026-11-10; each line there is a
// label and a Suno link, matched to a recording here by its Suno id)
const LISTS = {
  full: [
    ['Tree', 'E05', 'tree'],
    ['Bench', 'E17', 'bench'],
    ['Pebble and Stepping Stone', 'E08', 'stones'],
    ['Birds', 'E15', 'birds'],
    ['House', 'E12', 'door'],
    ['Chimney', 'E04', 'chimney'],
    ['Corn', 'E14', 'corn'],
    ['Weed', 'E03', 'weeds'],
    ['Who knows plant', 'E25', 'bed'],
    ['Sunflower', 'E07', 'sunflowers'],
    ['Sun', 'E11', 'sun'],
    ['Rake and Shovel', 'E09', 'tools'],
  ],
  kids: [
    ['Sunflower', 'E07', 'sunflowers'],
    ['Sun', 'E11', 'sun'],
    ['Rake and Shovel', 'E13', 'tools'],
    ['Bench', 'E27', 'bench'],
    ['Smoke', 'E02', 'chimney'],
    ['Weeds', 'E06', 'weeds'],
    ['Tree', 'E05', 'tree'],
    ['Corn', 'E28', 'corn'],
    ['Pebble and Stepping stone', 'E08', 'stones'],
    ['House', 'E12', 'door'],
    ['Birds', 'E15', 'birds'],
  ],
};
const listOf = (edition) => LISTS[edition === 'kids' ? 'kids' : 'full'];
const entry = (id, edition) => listOf(edition).find((x) => x[1] === id) ?? LISTS.full.find((x) => x[1] === id) ?? LISTS.kids.find((x) => x[1] === id) ?? null;
export const EDITION_SONGS = { full: LISTS.full.map((x) => x[1]), kids: LISTS.kids.map((x) => x[1]) };
export const KIDS_SONGS = EDITION_SONGS.kids;
// the recordings in either list (17), and the archive's others, which are out of play
export const LISTED_SONGS = SONG_IDS.filter((id) => EDITION_SONGS.full.includes(id) || EDITION_SONGS.kids.includes(id));
export const UNLISTED_SONGS = SONG_IDS.filter((id) => !LISTED_SONGS.includes(id));

// The spots where the songs wait: the farm object each one is about. `label` is how the cards name
// the place, `hint` a first hint about it (spec §8's tier one), `act` the small thing to do there
// before the bird comes (v0.17c), `anchor` and `offset` (metres on the ground) where its star
// stands (world.js eggSpotPos). v0.20: one spot per object, one song per spot in each edition.
// The sun's and the birds' stars stand on the farm's own ground, at its back edge beneath the
// drawn sun and the drawn flock (v0.17 had them far out on the paper sky's side of the horizon).
const act = (verb, word, ms = 1500) => ({ verb, word, ms });
export const SPOTS = {
  tree: { label: 'the old tree', hint: 'The tree and the bench make a good team.', act: act('Thank the old tree', 'Good team!') },
  bench: { label: 'the bench', hint: 'Sit a while on the bench under the tree.', act: act('Rest on the bench', 'Aah…', 2600) },
  stones: { label: 'the stepping stones', hint: 'Small stones dream big behind the house.', act: act('Hop the stepping stones', 'Hop! Hop!') },
  birds: { label: 'the corner under the birds', hint: 'The birds argue over the best perch.', act: act('Let the birds debate', 'Tweet? Tweet!', 1600) },
  door: { label: 'the front door', hint: 'A finished house leaves the light on.', act: act('Knock on the door', 'Knock knock!') },
  chimney: { label: 'the chimney', hint: 'Follow the smoke up from the roof.', act: act('Climb to the chimney', 'Up we go!', 7200) },
  corn: { label: 'the corn', hint: 'One stalk is outstanding in its field.', act: act('Tell the corn a joke', 'Corny!') },
  weeds: { label: 'the weeds by the raised bed', hint: 'Something beside the raised bed is plotting.', anchor: 'bed', offset: [1.8, 0.4], act: act('Challenge the garden weeds', 'Not today!') },
  bed: { label: 'the Who-Knows plant in the raised bed', hint: 'A scribble in the raised bed wonders what it is.', act: act('Say hello to the Who-Knows plant', '?♪') },
  sunflowers: { label: 'the sunflowers', hint: 'The sunflowers do everything together.', act: act('Dance with the sunflowers', 'Ta-da!') },
  sun: { label: 'the field\'s edge under the sun', hint: 'Somebody up there feels a little too bright today.', act: act('Greet the sun', 'Hello, sunshine!') },
  tools: { label: 'the shovel and rake', hint: 'The tools by the house have something to say.', act: act('Lean the rake on the shovel', 'Clink!') },
};
// the full edition's own moment where its song at a spot tells another joke than the kids' one
const ACTS = {
  full: {
    corn: act('Look over at the sunflowers', 'Sigh…'), // Cornstalk and Sunflower: the corn longing for a sunflower
    weeds: act('Inspect the mystery weed', 'Hmm…'), // Wrong Kind Weed
    tools: act('Tell the rake to behave', 'At ease!'), // I'm not your hoe: the shovel has had enough of the rake
  },
};
// what to do at a spot before its egg comes
export const spotAct = (spot, edition = 'full') => ACTS[edition === 'kids' ? 'kids' : 'full']?.[spot] ?? SPOTS[spot]?.act ?? null;

// One short line of each song's own words for its card (audit 4: "a lyric line on every song
// card, kid-safe lines in the kids edition"). Each is from the song's published lyrics (checked
// in test/songs-v020.test.mjs against source/songs/report.md); the kids list's eleven are gentle
// lines, and the full edition's bench line prints its one rude word with asterisks.
const LYRICS = {
  E02: 'I write my name across the sky',
  E03: 'Man, I’d even be a gummy if that’s what it takes to be your weed',
  E04: 'You smokin’ like a chimney',
  E05: 'You’re the bench and I’m the tree and we understand',
  E06: 'Still we rise — HA HA HO!',
  E07: 'If I lean left, you lean too',
  E08: 'When I’m a stepping stone someday',
  E09: 'No, I’m not your hoe, I’m a shovel—built to move mountains',
  E11: 'I’m lookin’ like a highlighter in a buttercup',
  E12: 'I’ll leave the light on in the hall',
  E13: 'I dig it up, you smooth the way',
  E14: 'I’m corn, planted in lines I didn’t choose',
  E15: 'Let the birds debate, let the birds use voice',
  E17: '’Cause the birds keep sh**tin’ on me and it’s not okay',
  E25: 'I look like a scribble / Not a plant',
  E27: 'Can I stay in the shade?',
  E28: 'I’m a-maize-ing every single day',
};
export const songLyric = (id) => LYRICS[id] ?? null;

export const isEdition = (e) => EDITIONS.includes(e);
// the songs an edition has, in Tiffany's order
export const songsFor = (edition = 'full') => EDITION_SONGS[edition === 'kids' ? 'kids' : 'full'];
export const hasSong = (id, edition = 'full') => songsFor(edition).includes(id);
// Tiffany's label for a song, exactly as she wrote it in this edition's list (a recording in
// neither list keeps its archive title: it is never shown)
export const songTitle = (id, edition = 'full') => entry(id, edition)?.[0] ?? SONGS[id]?.title ?? id;
// its place in the edition's list, from 1 (0: not in it)
export const songNumber = (id, edition = 'full') => songsFor(edition).indexOf(id) + 1;
// the spot where it waits (null for a recording out of play)
export const songSpot = (id, edition = 'full') => (hasSong(id, edition) ? entry(id, edition)[2] : null);
// the song's Suno page: only in the full edition (the kids listen only inside the game)
export const sunoLink = (id, edition = 'full') => (edition === 'kids' || !SONGS[id] ? null : SONGS[id].suno);
// the MP3 of a song (tools/make-songs.mjs), its short discovery clip (the captain's crop of it,
// played as its egg cracks) and the name it downloads as: its number and label in this edition
export const mp3Path = (id) => `assets/songs/${id}.mp3`;
export const clipPath = (id) => `assets/songs/clips/${id}.mp3`;
export const mp3Name = (id, edition = 'full') => `${String(songNumber(id, edition) || SONGS[id].n).padStart(2, '0')} ${songTitle(id, edition).replace(/[\\/:*?"<>|]/g, '')}.mp3`;

// the hunt is phase two: open once the home is built and the drawing has its colour
export const eggPhase = (l) => mainComplete(l);
// how many of the edition's songs are found
export const foundCount = (edition = 'full', discoveries = {}) => songsFor(edition).filter((id) => discoveries?.[id]).length;
// the songs still waiting at a spot, in list order
export const eggsAt = (spot, edition = 'full', discoveries = {}) => songsFor(edition).filter((id) => songSpot(id, edition) === spot && !discoveries?.[id]);
// the spots that still hold a song
export const spotsWithEggs = (edition = 'full', discoveries = {}) => Object.keys(SPOTS).filter((s) => eggsAt(s, edition, discoveries).length > 0);

// the songs this ledger has just earned that are not found yet (a song with `coins`: a big purse),
// in list order: only in the hunt (phase two), and only the edition's own. None since v0.20.
export function songsDue(l, discoveries = {}, edition = 'full') {
  if (!eggPhase(l)) return [];
  return songsFor(edition).filter((id) => !discoveries?.[id] && SONGS[id].coins !== undefined && l.purse >= SONGS[id].coins);
}

// The next egg a bird brings: a purse song as soon as it is due (wherever she is), otherwise the
// song of the spot she is at (`spot`, or null). Nothing before the hunt opens.
export function nextEgg(l, { edition = 'full', discoveries = {}, spot = null } = {}) {
  if (!eggPhase(l)) return null;
  const due = songsDue(l, discoveries, edition);
  if (due.length) return due[0];
  return spot ? eggsAt(spot, edition, discoveries)[0] ?? null : null;
}

// the found record for a song
export const found = (l) => ({ at: l.activeMs });

// The goal line in the hunt. v0.20 (audit 2: "the last song is a dead end"): when one song is
// left, the line names it and where it waits (or, for a purse song, how many coins it still wants).
export function huntLine(edition = 'full', discoveries = {}, purse = 0) {
  const all = songsFor(edition).length;
  const left = songsFor(edition).filter((id) => !discoveries?.[id]);
  const n = all - left.length;
  if (!left.length) return `Every song found: ${n} of ${all}. Listen to them any time in Pause → Songs.`;
  if (left.length === 1) {
    const id = left[0];
    const title = songTitle(id, edition);
    if (SONGS[id].coins !== undefined) return `One song left: “${title}” · save a big purse · ${Math.min(purse, SONGS[id].coins)}/${SONGS[id].coins} coins`;
    return `One song left: “${title}” · go to ${SPOTS[songSpot(id, edition)].label}`;
  }
  return `Egg hunt · ${n} of ${all} songs · walk to a sparkle and do what it asks: a bird brings an egg`;
}
