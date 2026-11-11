// The songs and the egg hunt (spec §8). Pure: no three.js, no DOM. Found songs are kept in the
// save's `discoveries` field (spec §12), apart from the ledger, as { [id]: { at: active ms when
// found } }.
//
// v0.16 (captain's notes on the v0.15 build, 2026-11-04):
// - "Collecting the easter eggs should be the second phase of the game, after the picture is
//   completed and all of the colour is filled in": the hunt opens once the home (H5) is built and
//   the finale has coloured the drawing (`eggPhase`). Each egg is one song.
// - "When you get an easter egg, a bird flies by and drops an egg": every song comes as an egg a
//   bird drops near Vanessa; she picks it up and the song is hers (main.js, world.js).
// v0.17c: at a spot with a song, a button names a small thing to do there (`act.verb`); Vanessa
// does it (`act.ms`), an ink word pops up (`act.word`), the farm answers (world.js spotPoke), and
// then the bird brings the egg.
//
// v0.22 (Tiffany's notes "Changes to game" and her doc "Kid's farm songs", 2026-11-11; the captain:
// "there will only be one version that includes all 22 songs", "let's take the titles, she says,
// in the document"):
// - One game, one song set. The full and kids editions of v0.16-v0.21 are gone. The set is the 22
//   songs of her doc, in her order, each under her title exactly as she wrote it (her place hints
//   in brackets, "(About the bench)", are not part of the title: they place the song), then the
//   two songs she added from another Suno account: 24 in all (`SONG_LIST`).
// - Every song waits at its own spot on the farm (`SPOTS`: 24 spots, one song each), the thing its
//   title or its words are about. A spot with a song left shows a yellow circle and a star ("The
//   circles should be the actions that you perform to get the Easter egg song"), from anywhere:
//   v0.21's hidden stars, its songbook clues and "Show all" are gone ("The keepsakes and the songs
//   should appear little by little as you collect"), and the songbook lists only what is found.
// - "Make sure she does everything it says to do, 'hop the stepping stones' etc": every act's
//   words name something Vanessa visibly does (world/moments.js has the pose and the motion of
//   each `act.kind`; test/v022.test.mjs holds the two together).
// - A found song starts by itself as its egg cracks, at the first second of its preview (the
//   captain's crop of it, `previewStart`), and plays on to its end (ui/songplayer.js).
// The archive's other recordings stay below (`SONGS`, so an older save's discoveries still read)
// but are out of play: no star, no card, no count.
//
// E## is the playlist's track ##, identified by its recording id (the Suno song id). `title` is
// the recording's own title in the archive, kept only to tell the files apart. E34 and E35 are the
// two recordings added on 2026-11-11.
import { mainComplete } from './ledger.js';

const S = (n, title, uuid, shared = true) => ({ n, title, suno: shared ? `https://suno.com/song/${uuid}` : null, uuid });
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
  // the two recordings from the other Suno account (2026-11-11). Their Suno pages are not public
  // (the song page answers "not found"), so they carry no Suno link.
  E34: S(34, 'Outdrawing all our dreams', 'ae7f9849-12ee-4813-8717-7041f327fe4b', false),
  E35: S(35, 'Vanessa in her flip flops', '098bc09e-7320-4a66-b307-0a8f529cdad9', false),
};
export const SONG_IDS = Object.keys(SONGS);

// Tiffany's list, in her order: [her title, exactly as written; the recording; its spot on the
// farm; the first second of its preview]. Her doc "Kid's farm songs" (the Drive folder "New farm",
// copied 2026-11-11) gives each song as a title and a Suno link, matched to a recording here by
// its Suno id. Four of her titles carry a place hint in brackets, which fixes the spot: (About the
// bench) Stay in the Shade, (Near a weed) Weeds Elite, (About the corn) Corny, (About the sun) Tu
// Kaafi Zyaada Yellow Hai. Two of her links are recordings the archive holds under another title:
// "Stay in the Shade" is the recording archived as "Benched" (E27), "And She Goes By Vanessa" the
// one archived as "Demon Hunter (Vanessa's Song)" (E29). The last two are the songs she added as
// files, named as her files are.
// The preview's start is the start of the captain's crop of the song (source/songs/crops/Kaji
// Crops, `NN - title start-end`); the two new songs have no crop, and start where their first
// chorus comes in.
const LIST = [
  ['Sunflower Squad', 'E07', 'sunflowers', 30.3],
  ['Insecure Sun', 'E11', 'sun', 48.5],
  ['Rake to Shovel', 'E13', 'tools', 65.2],
  ['Stay in the Shade', 'E27', 'bench', 44.5],
  ['The Chimney', 'E02', 'chimney', 40.3],
  ['Weeds Elite', 'E06', 'weeds', 41.7],
  ['Tree and Bench', 'E05', 'tree', 59.5],
  ['Corny', 'E28', 'corn', 34.8],
  ['Pebble and Stepping Stone', 'E08', 'stones', 28.9],
  ['The House', 'E12', 'door', 74.1],
  ['Let the Birds Debate', 'E15', 'birds', 0.6],
  ['I gave it to the world', 'E01', 'world', 52.7],
  ['Cornstalk and Sunflower', 'E14', 'between', 73.5],
  ['Pockets', 'E16', 'table', 0],
  ['Tu Kaafi Zyaada Yellow Hai', 'E18', 'glare', 59.2],
  ['Put it on Paper', 'E19', 'paper', 37.5],
  ['Home Sweet Home', 'E20', 'window', 80.1],
  ['One Day She’ll Be Rich', 'E21', 'path', 41.1],
  ['Luckiest Man Alive', 'E22', 'field', 30.6],
  ['Don’t You Worry', 'E23', 'sketch', 74.0],
  ['Who Knows', 'E25', 'bed', 28.1],
  ['And She Goes By Vanessa', 'E29', 'pose', 0],
  ['Outdrawing all our dreams', 'E34', 'easel', 41.0],
  ['Vanessa in her flip flops', 'E35', 'flipflops', 39.5],
];
const entry = (id) => LIST.find((x) => x[1] === id) ?? null;
// the songs in play, in Tiffany's order, and the archive's others
export const SONG_LIST = LIST.map((x) => x[1]);
export const LISTED_SONGS = SONG_LIST;
export const UNLISTED_SONGS = SONG_IDS.filter((id) => !SONG_LIST.includes(id));

// The spots where the songs wait: the farm thing each one is about, one song per spot. `label` is
// how the cards and the announcements name the place. `act` is the small thing to do there before
// the bird comes: `verb` is the button's words, `kind` the pose and motion Vanessa does for it
// (world/moments.js), `word` the pencilled word that pops up, `ms` how long it takes. Where the
// spot stands on the ground (world.js eggSpotPos): at its `anchor` (a thing on the farm; default:
// the spot's own name) plus `offset` metres, or at the drawing point `uv`.
// Tiffany: "Make sure she does everything it says to do": every verb names what she is seen doing.
const act = (verb, kind, word, ms) => ({ verb, kind, word, ms });
export const SPOTS = {
  sunflowers: { label: 'the sunflowers', act: act('Dance with the sunflowers', 'dance', 'Ta-da!', 3000) },
  sun: { label: 'the field’s edge under the sun', act: act('Wave to the sun', 'wave', 'Hello, sunshine!', 2400) },
  tools: { label: 'the shovel and the rake', act: act('Lean the rake on the shovel', 'reach', 'Clink!', 2600) },
  bench: { label: 'the bench', act: act('Rest on the bench', 'bench', 'Aah…', 2800) },
  chimney: { label: 'the chimney', act: act('Climb to the chimney', 'chimney', 'Up we go!', 7200) },
  weeds: { label: 'the weeds by the raised bed', anchor: 'bed', offset: [1.9, 0.5], act: act('Shake a fist at the weeds', 'fist', 'Not today!', 2400) },
  tree: { label: 'the old tree', act: act('Hug the old tree', 'hug', 'Good team!', 2600) },
  corn: { label: 'the corn', act: act('Tell the corn a joke', 'joke', 'Corny!', 3000) },
  stones: { label: 'the stepping stones', act: act('Hop the stepping stones', 'hop', 'Hop! Hop!', 3200) },
  door: { label: 'the front door', act: act('Knock on the door', 'door', 'Knock knock!', 1600) },
  birds: { label: 'the corner under the birds', act: act('Whistle to the birds', 'whistle', 'Tweet? Tweet!', 2400) },
  world: { label: 'the front of the farm', uv: [52.2, 95.5], act: act('Show your drawing to the world', 'show', 'Look, world!', 2800) },
  between: { label: 'the grass between the corn and the sunflowers', uv: [86.5, 55.5], act: act('Lean toward the sunflowers', 'lean', 'Sigh…', 2800) },
  table: { label: 'the yard-sale table', act: act('Empty your pockets', 'pockets', 'Treasures!', 2600) },
  glare: { label: 'the sunny corner of the field', uv: [96.5, 50], act: act('Shade your eyes from the sun', 'shade', 'Oye, Sun!', 2600) },
  paper: { label: 'the grass with the best view', uv: [30.6, 88.7], act: act('Sketch the farm', 'sketch', 'Put it on paper!', 3000) },
  window: { label: 'the window by the door', act: act('Peek in the window', 'peek', 'Home sweet home!', 2600) },
  path: { label: 'the middle of the path', uv: [40, 60], act: act('Toss your coins in the air', 'toss', 'Rich!', 2400) },
  field: { label: 'the middle of the field', uv: [50, 70.7], act: act('Blow a kiss', 'kiss', '♥', 2400) },
  sketch: { label: 'the crumpled sketch in the corner', uv: [10.1, 93.1], act: act('Pick up the crumpled sketch', 'pickup', 'Keep it!', 2600) },
  bed: { label: 'the Who-Knows plant in the raised bed', act: act('Say hello to the Who-Knows plant', 'hello', '?♪', 2400) },
  pose: { label: 'Vanessa’s place in the drawing', act: act('Strike your pose', 'pose', 'Vanessa!', 2600) },
  easel: { label: 'the corner past the sunflowers', uv: [94.1, 83.9], act: act('Draw a big circle in the air', 'draw', 'Dream big!', 2800) },
  flipflops: { label: 'the open grass left of the house', uv: [11.8, 51.3], act: act('Kick up your flip-flops', 'kick', 'Flip! Flop!', 2600) },
};
// what to do at a spot before its egg comes
export const spotAct = (spot) => SPOTS[spot]?.act ?? null;

// One short line of each song's own words for its card and the songbook (audit 4). Each is from
// the song's published lyrics (test/v022.test.mjs checks it against source/songs/report.md); the
// two new songs' lines are as sung (their lyrics are not published; heard and written down
// 2026-11-11, source/songs/new/notes.md). All of them are fit for a child to read.
const LYRICS = {
  E01: 'I gave it to the world / And they ate it up',
  E02: 'I write my name across the sky',
  E05: 'You’re the bench and I’m the tree and we understand',
  E06: 'Still we rise — HA HA HO!',
  E07: 'If I lean left, you lean too',
  E08: 'When I’m a stepping stone someday',
  E11: 'I’m lookin’ like a highlighter in a buttercup',
  E12: 'I’ll leave the light on in the hall',
  E13: 'I dig it up, you smooth the way',
  E14: 'I would lean if I could',
  E15: 'Let the birds debate, let the birds use voice',
  E16: 'These overalls got pockets / Stitched with stories I adore',
  E18: 'Duniya keh rahi hai tu kaafi zyaada yellow hai',
  E19: 'Maybe one day she’ll put it on paper',
  E20: 'My mom’s the best thing that grew on the farm',
  E21: 'The best drawer in the world / One day she’ll be rich',
  E22: 'She doesn’t know how good she is',
  E23: 'And Vanessa / Don’t you worry / You’ll be great',
  E25: 'I look like a scribble / Not a plant',
  E27: 'Can I stay in the shade?',
  E28: 'I’m a-maize-ing every single day',
  E29: 'And she goes by Vanessa',
  E34: 'Vanessa, what will you draw next?',
  E35: 'Vanessa in her flip flops / Dancing down the garden rows',
};
export const songLyric = (id) => LYRICS[id] ?? null;

// the songs in play, in Tiffany's order
export const songsFor = () => SONG_LIST;
export const hasSong = (id) => SONG_LIST.includes(id);
// Tiffany's title for a song, exactly as she wrote it (a recording out of play keeps its archive
// title: it is never shown)
export const songTitle = (id) => entry(id)?.[0] ?? SONGS[id]?.title ?? id;
// its place in her list, from 1 (0: not in it)
export const songNumber = (id) => SONG_LIST.indexOf(id) + 1;
// the spot where it waits (null for a recording out of play)
export const songSpot = (id) => entry(id)?.[2] ?? null;
// where its preview starts in the song (s): the found song starts here and plays on to its end
export const previewStart = (id) => entry(id)?.[3] ?? 0;
// The song's Suno page, for the songbook (as the full edition showed it; the songbook is reached at
// the end of the game). Null for the two recordings whose pages are not public.
export const sunoLink = (id) => SONGS[id]?.suno ?? null;
// the MP3 of a song (tools/make-songs.mjs) and the name it downloads as: its number and title
export const mp3Path = (id) => `assets/songs/${id}.mp3`;
export const mp3Name = (id) => `${String(songNumber(id) || SONGS[id].n).padStart(2, '0')} ${songTitle(id).replace(/[\\/:*?"<>|]/g, '')}.mp3`;

// the hunt is phase two: open once the home is built and the drawing has its colour
export const eggPhase = (l) => mainComplete(l);
// how many of the songs are found
export const foundCount = (discoveries = {}) => SONG_LIST.filter((id) => discoveries?.[id]).length;
// the songs found, in list order (the songbook lists these, and only these)
export const foundSongs = (discoveries = {}) => SONG_LIST.filter((id) => discoveries?.[id]);
// the song still waiting at a spot (in list order, should a spot ever hold two)
export const eggsAt = (spot, discoveries = {}) => SONG_LIST.filter((id) => songSpot(id) === spot && !discoveries?.[id]);
// the spots that still hold a song: each shows its yellow circle and its star
export const spotsWithEggs = (discoveries = {}) => Object.keys(SPOTS).filter((s) => eggsAt(s, discoveries).length > 0);

// The next egg a bird brings: the song of the spot she is at (`spot`, or null). Nothing before
// the hunt opens.
export function nextEgg(l, { discoveries = {}, spot = null } = {}) {
  if (!eggPhase(l)) return null;
  return spot ? eggsAt(spot, discoveries)[0] ?? null : null;
}

// the found record for a song
export const found = (l) => ({ at: l.activeMs });

// The last song gets the arrow (v0.20, audit 2: "the last song is a dead end"): the spot the
// guide's arrow leads to, or null while more than one is left.
export function lastSpot(discoveries = {}) {
  const left = spotsWithEggs(discoveries);
  return left.length === 1 ? left[0] : null;
}

// The hunt's goal: { text (the sentence, for screen readers), line (one line on screen) }.
// `egg`: 'coming' while the bird flies, 'landed' while the egg waits on the grass. The count is
// not here: it is the songs counter in the HUD.
export function huntGoal({ discoveries = {}, egg = null } = {}) {
  const left = SONG_LIST.filter((id) => !discoveries?.[id]);
  const all = SONG_LIST.length;
  if (!left.length) return { text: `Every song found: ${all} of ${all}. Hear them again any time in Extras, under Songs.`, line: { icon: 'note', label: 'Every song found' } };
  if (egg === 'coming') return { text: 'A bird is bringing an egg.', line: { icon: 'egg', label: 'A bird is coming…' } };
  if (egg === 'landed') return { text: 'An egg has landed: walk up to it.', line: { icon: 'egg', label: 'Pick up the egg' } };
  if (left.length === 1) return { text: `One song left: follow the arrow to ${SPOTS[songSpot(left[0])].label}.`, line: { icon: 'note', label: 'One song left', tail: 'follow the arrow' } };
  return { text: 'A song waits at every yellow circle on the farm: walk to one and do what it says, and a bird brings an egg.', line: { icon: 'note', label: 'Walk to a yellow circle' } };
}
