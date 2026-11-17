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
// v0.23 (Tiffany's notes "Farm changes #2", 2026-11-12):
// - "Have the lyrics of the song determine the position of the circles if it relates to one of the
//   parts of the drawing in content": each song's spot was checked against its words (the archive's
//   report; the two added songs as heard). Twenty already stood at the part their words are about, or
//   are about no part of the drawing at all (the drawing itself, her sketches) and keep their open
//   ground. Four move: "Pockets" from the yard-sale table (which is not in the drawing) to the
//   vegetables of the raised bed ("Beet seeds in my pocket"); "Put it on Paper" to the path beside
//   the bench ("On a bench in the yard ... Rests on her bench in the shade"); "Luckiest Man Alive"
//   from the middle of the field to beside the farmer's place ("She draws pictures of me / Standing
//   next to her ... We're both farmers"); "Vanessa in her flip flops" from the open grass left of
//   the house to the end of the corn rows ("Dancing down the garden rows / Walking through the corn
//   where the green runs high").
// - "Actions should be in a different color than songs and collecting crops. Maybe red for
//   actions?": a spot's circle is the action's, and red; the egg the bird brings lies in the song's
//   circle, yellow; the ring round a crop or a stick is the tools' blue, as it was.
// - "have just a few at a time ... replacing each other as she collects them": only the first
//   SPOTS_AT_ONCE spots with a song left show, in her list's order (`visibleSpots`); a found song
//   makes room for the next.
// - "No arrows pointing at icons or songs": none, not even to the last song (`lastSpot` is kept
//   for the goal line's words only).
// - "Even before she collects the songs, allow all of them to appear and be downloaded under the
//   extras page": the songbook lists all 24 from the start (main.js).
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
  ['Pockets', 'E16', 'pockets', 0],
  ['Tu Kaafi Zyaada Yellow Hai', 'E18', 'glare', 59.2],
  ['Put it on Paper', 'E19', 'paper', 37.5],
  ['Home Sweet Home', 'E20', 'window', 80.1],
  ['One Day She’ll Be Rich', 'E21', 'path', 41.1],
  ['Luckiest Man Alive', 'E22', 'field', 30.6],
  ['Don’t You Worry', 'E23', 'sketch', 74.0],
  ['Who Knows', 'E25', 'bed', 28.1],
  ['And She Goes By Vanessa', 'E29', 'pose', 0],
  // v0.29 (Tiffany, after "Farm changes #3": "The song out drawing our all our dreams has the D word
  // in it. That was on the no-no song list"): "Outdrawing all our dreams" (E34) is out of play, and
  // nothing takes its place (Vanessa asked to leave off "You swore you quit", E04, as well): 23 songs.
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
  // (v0.29: at its own place in front of the sunflowers, where the sunflower patch's place was: that
  // moved into the patch, and a red circle there would lie over the sunflowers' own rings)
  sunflowers: { label: 'the sunflowers', uv: [79, 75], act: act('Dance with the sunflowers', 'dance', 'Ta-da!', 3000) },
  // v0.29 (Tiffany: "The action wave should always be at a bird not the sun. The action for the sun
  // should be 'put sunglasses on'")
  sun: { label: 'the field’s edge under the sun', act: act('Put your sunglasses on', 'sunglasses', 'Too bright!', 2800) },
  tools: { label: 'the shovel and the rake', act: act('Lean the rake on the shovel', 'reach', 'Clink!', 2600) },
  // v0.29 (Tiffany: 'She should also "rest on the bench" a little longer'): 5 s (it was 2.8 s)
  // v0.30 (Tiffany: "Make her clean the bench not rest on I in order to unlock the stay in the shade
  // song"): she wipes the bench with her cloth (it was "Rest on the bench", v0.22-v0.29)
  bench: { label: 'the bench', act: act('Clean the bench', 'clean', 'Squeaky clean!', 3200) },
  chimney: { label: 'the chimney', act: act('Climb to the chimney', 'chimney', 'Up we go!', 7200) },
  weeds: { label: 'the weeds by the raised bed', anchor: 'bed', offset: [1.9, 0.5], act: act('Shake a fist at the weeds', 'fist', 'Not today!', 2400) },
  tree: { label: 'the old tree', act: act('Hug the old tree', 'hug', 'Good team!', 2600) },
  // v0.29 (Tiffany: "Make the corny song appear right next to the corn stalks instead of right
  // behind the table"): beside the front row of the corn, between two of its plants (not on one)
  corn: { label: 'the corn', uv: [67.8, 51.2], act: act('Tell the corn a joke', 'joke', 'Corny!', 3000) },
  stones: { label: 'the stepping stones', act: act('Hop the stepping stones', 'hop', 'Hop! Hop!', 3200) },
  door: { label: 'the front door', act: act('Knock on the door', 'door', 'Knock knock!', 1600) },
  birds: { label: 'the corner under the birds', act: act('Whistle to the birds', 'whistle', 'Tweet? Tweet!', 2400) },
  // v0.29 (Tiffany: "a person who looks like Tiffany (another farmer but with blond hair and a
  // different colored shirt) run in in a second pair of overalls, steal the drawing and throw copies
  // around then get chased off the screen by Vanessa"): the scene (world/thief.js), 9 s (v0.29: a
  // little left of 52.2, 95.5, to keep clear of the Who-Knows plant's circle)
  world: { label: 'the front of the farm', uv: [49.5, 96], act: act('Show your drawing to the world', 'thief', 'Look, world!', 9000) },
  between: { label: 'the grass between the corn and the sunflowers', uv: [86.5, 55.5], act: act('Lean toward the sunflowers', 'lean', 'Sigh…', 2800) },
  // v0.23: "Beet seeds in my pocket": the vegetables' end of the raised bed (the table it stood at is not in the drawing)
  // (v0.29, Tiffany: "Never have a red circle that overlaps a crop collecting": a step past the
  // bed's vegetable end and in front of it, off the tomato plants' rings; it stood at 78.4, 82.9)
  pockets: { label: 'the vegetables in the raised bed', uv: [79, 98.5], act: act('Empty your pockets', 'pockets', 'Treasures!', 2600) },
  glare: { label: 'the sunny corner of the field', uv: [96.5, 50], act: act('Shade your eyes from the sun', 'shade', 'Oye, Sun!', 2600) },
  // v0.23: "On a bench in the yard ... Rests on her bench in the shade": the path beside the bench
  paper: { label: 'the path beside the bench', uv: [32.4, 71.7], act: act('Sketch the farm', 'sketch', 'Put it on paper!', 3000) },
  window: { label: 'the window by the door', act: act('Peek in the window', 'peek', 'Home sweet home!', 2600) },
  path: { label: 'the middle of the path', uv: [40, 60], act: act('Toss your coins in the air', 'toss', 'Rich!', 2400) },
  // v0.23: "She draws pictures of me / Standing next to her ... We're both farmers": beside the farmer's place in the drawing
  field: { label: 'the grass beside the farmer’s place', uv: [49.2, 74.3], act: act('Blow a kiss', 'kiss', '♥', 2400) },
  sketch: { label: 'the crumpled sketch in the corner', uv: [10.1, 93.1], act: act('Pick up the crumpled sketch', 'pickup', 'Keep it!', 2600) },
  // (v0.29: in front of the bed, by the Who-Knows plant, a step off the tomato plants' rings: a red
  // circle never lies over a crop's; test/v029-world.test.mjs measures every spot)
  bed: { label: 'the Who-Knows plant in the raised bed', anchor: 'bed', offset: [-0.55, 0.7], act: act('Say hello to the Who-Knows plant', 'hello', '?♪', 2400) },
  pose: { label: 'Vanessa’s place in the drawing', act: act('Strike your pose', 'pose', 'Vanessa!', 2600) },
  // (v0.29: the corner past the sunflowers was "Outdrawing all our dreams"' spot, out of play)
  // v0.23: "Dancing down the garden rows ... Walking through the corn where the green runs high": the end of the corn rows
  flipflops: { label: 'the end of the corn rows', uv: [51, 50], act: act('Kick up your flip-flops', 'kick', 'Flip! Flop!', 2600) },
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
// the spots that still hold a song
export const spotsWithEggs = (discoveries = {}) => Object.keys(SPOTS).filter((s) => eggsAt(s, discoveries).length > 0);
// v0.23 (Tiffany: "have just a few at a time up here, replacing each other as she collects them, so
// it doesn't look as crowded"): the spots on show now: the first SPOTS_AT_ONCE that still hold a
// song, in her list's order. Each shows its red circle (the action); the others wait their turn.
export const SPOTS_AT_ONCE = 3;
// v0.27 (the captain, 2026-11-13: "is the home sweet home the last song of it was a coinicidence
// on my playthrough? If the song is always going to play maybe we can consider having a one last
// song always be, so we choose the most appropiate song, maybe I gave it to the world").
// It was his order of play. Three circles are out at a time, the first three songs of the list
// still to find, and a circle left alone stays out to the end: "Home Sweet Home", the 17th of the
// 24, came last because its circle (the window by the door) was the one he left while he did the
// seven after it. The song that plays into the sunset is simply the last one found: a found song
// plays on to its end, and the sunset neither starts nor stops one.
// Now the last find is always the same song. "I gave it to the world" is held back: its circle
// ("Show your drawing to the world", at the front of the farm) comes out only when every other
// song and everything else there is to find (`othersFound`: the keepsakes) is found. So it is
// found last, it starts as its egg cracks, and a moment after its card is closed the sunset
// begins under it. A farm that had found it already (an older save) goes on as before.
export const LAST_SONG = 'E01';
// v0.29 (Tiffany: "Make the second to last one the House song"): "The House" (E12) is held back too,
// until every song but the last is found
export const SECOND_LAST = 'E12';
// v0.29 (Tiffany: "After she hugs the tree there should be more time between the option to play the
// poop song comes up ... Maybe after the tree song, she goes around a collects a different song
// before returning to the bench to get the poop song"): "Stay in the Shade" (E27, the bench, the
// birds' poop) waits until "Tree and Bench" (E05, the tree) is found and one other song after it,
// unless no other song is left to find first
export const FOLLOWS = { E27: { after: 'E05', gap: 1 } };
const HELD = new Set([LAST_SONG, SECOND_LAST]);
// a song still waiting its turn (not shown even when it is among the first few left)
export function songWaits(id, discoveries = {}) {
  if (id === LAST_SONG) return true; // (its own turn is in visibleSpots)
  if (id === SECOND_LAST) return !SONG_LIST.every((x) => HELD.has(x) || !!discoveries?.[x]);
  const rule = FOLLOWS[id];
  if (!rule) return false;
  const others = SONG_LIST.filter((x) => x !== id && !HELD.has(x) && !discoveries?.[x]);
  if (!others.length) return false; // nothing else to find first
  const t = discoveries?.[rule.after];
  if (!t) return true;
  const after = SONG_LIST.filter((x) => x !== id && x !== rule.after && (discoveries?.[x]?.at ?? -1) > (t.at ?? 0)).length;
  return after < rule.gap;
}
// every song but the last one is found: the last one's turn has come (or it is found too)
export const lastSongTurn = (discoveries = {}) => SONG_LIST.every((id) => id === LAST_SONG || !!discoveries?.[id]);
// the last song is the only one left, and it waits: something else is still to find first
export const lastSongWaits = (discoveries = {}, othersFound = true) => !discoveries?.[LAST_SONG] && lastSongTurn(discoveries) && !othersFound;
export function visibleSpots(discoveries = {}, n = SPOTS_AT_ONCE, { othersFound = true } = {}) {
  const out = [];
  for (const id of SONG_LIST) {
    if (id === LAST_SONG || discoveries?.[id] || songWaits(id, discoveries)) continue; // (the last one's own turn is below)
    const spot = songSpot(id);
    if (!discoveries?.[id] && spot && !out.includes(spot)) out.push(spot);
    if (out.length >= n) break;
  }
  if (!out.length && !discoveries?.[LAST_SONG] && othersFound) out.push(songSpot(LAST_SONG));
  return out;
}

// v0.30 (Tiffany's "Farm changes #4": "There should never be a time that there aren't any red
// circles if there are more songs to collect"; "If a red circle appears don't let it disappear
// until she collects the song"; "Make the song circles appear spaced out in location. Don't have her
// collect all the ones by the house in order. She has to move to a different part of the farm to
// get to the next circle"):
// The circles on show are worked out by playing the hunt back from its start, find by find, in the
// order the songs were found (`at`). A circle comes out and stays out until its song is found: a
// find takes only its own circle away, and the free places are filled again at once, so while a
// song is left there is always a circle (the songs that wait their turn, `songWaits`, are passed
// over until their turn; the last one's turn is when every other song is found). A new circle is
// placed away from where she has just been: the first song in her list (still to find, not waiting)
// that is at least HUNT_SPACING.far metres from the spot of the song just found and
// HUNT_SPACING.apart metres from every circle still out; if none is, the first that is far from the
// spot just found; if none is, the one farthest from it. `dist(a, b)`: metres between two spots
// (main.js measures them on the farm; with none given, every spot is far from every other, which is
// v0.23's order). Kept for older saves too: they are played back the same way.
// (v0.23-v0.29 showed the first three in list order not found yet: a find could bring an earlier
// song out in place of one on show, and the last song hid every circle while a keepsake was left.)
export const HUNT_SPACING = { far: 6, apart: 5 };
export function huntCircles(discoveries = {}, { n = SPOTS_AT_ONCE, dist = null } = {}) {
  const d = dist ?? (() => Infinity);
  const finds = SONG_LIST.filter((id) => discoveries?.[id])
    .map((id) => ({ id, at: discoveries[id]?.at ?? 0, i: SONG_LIST.indexOf(id) }))
    .sort((a, b) => a.at - b.at || a.i - b.i);
  const known = {};
  let shown = [];
  let last = null; // the spot of the song just found
  const fill = () => {
    while (shown.length < n) {
      const spots = new Set(shown.map((x) => x.spot));
      const free = SONG_LIST.filter((id) => !known[id] && !shown.some((x) => x.id === id) && !spots.has(songSpot(id))
        && (id === LAST_SONG ? lastSongTurn(known) : !songWaits(id, known)));
      if (!free.length) break;
      const farFrom = (id) => !last || d(songSpot(id), last) >= HUNT_SPACING.far;
      const apart = (id) => shown.every((x) => d(songSpot(id), x.spot) >= HUNT_SPACING.apart);
      // (among those, the one with the most songs still to find near it first, so a part of the farm
      // where several wait is thinned out early and the last few are not left bunched together)
      const crowd = (id) => SONG_LIST.filter((x) => x !== id && !known[x] && d(songSpot(id), songSpot(x)) < HUNT_SPACING.far).length;
      const best = (ids) => ids.reduce((b, id) => (b === null || crowd(id) > crowd(b) ? id : b), null);
      let pick = best(free.filter((id) => farFrom(id) && apart(id))) ?? best(free.filter(farFrom));
      if (!pick) pick = free.reduce((best, id) => (d(songSpot(id), last) > d(songSpot(best), last) ? id : best), free[0]);
      shown.push({ id: pick, spot: songSpot(pick) });
    }
  };
  fill();
  for (const f of finds) {
    known[f.id] = discoveries[f.id];
    shown = shown.filter((x) => x.id !== f.id);
    last = songSpot(f.id);
    fill();
  }
  return shown.map((x) => x.spot);
}
// the song whose circle is at a spot (null: none in play there)
export const songAt = (spot) => SONG_LIST.find((id) => songSpot(id) === spot) ?? null;

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
// v0.27: `othersFound`: everything that is not a song (the keepsakes) is found; while it is not,
// the last song waits and the line says what for.
// v0.29: `egg` 'rest': a song was just found, and the next circles wait a while (`restS` seconds)
export function huntGoal({ discoveries = {}, egg = null, othersFound = true, restS = 0 } = {}) {
  const left = SONG_LIST.filter((id) => !discoveries?.[id]);
  const all = SONG_LIST.length;
  if (!left.length) return { text: `Every song found: ${all} of ${all}. Hear them again any time in Extras, under Songs.`, line: { icon: 'note', label: 'Every song found' } };
  if (egg === 'coming') return { text: 'A bird is bringing an egg.', line: { icon: 'egg', label: 'A bird is coming…' } };
  if (egg === 'landed') return { text: 'An egg has landed in a yellow circle: walk up to it.', line: { icon: 'egg', label: 'Pick up the egg', tail: 'in the yellow circle' } };
  // (v0.30: the circles stay out while she listens; only their actions wait: Tiffany, "There should
  // never be a time that there aren't any red circles if there are more songs to collect")
  if (egg === 'rest') return { text: `Listen a while: the next song can be fetched from a red circle in ${restS} seconds. A keepsake can be found meanwhile.`, line: { icon: 'note', label: 'Listen a while', tail: `next song in ${restS} s` } };
  if (egg === 'moment') return { text: 'Vanessa is doing what the circle asked.', line: { icon: 'note', label: 'Here goes…' } };
  // (v0.30: its red circle is out all the while; its action waits for the keepsakes)
  if (lastSongWaits(discoveries, othersFound)) return { text: 'One song is left, and it comes last: its red circle is out, and its action waits until the keepsakes still on the farm are found.', line: { icon: 'gift', label: 'Find the last keepsakes', tail: 'then the last song' } };
  if (left.length === 1 && left[0] === LAST_SONG) return { text: `The last song: its red circle is at ${SPOTS[songSpot(left[0])].label}. Walk there and do what it says.`, line: { icon: 'note', label: 'The last song', tail: 'at the red circle' } };
  if (left.length === 1) return { text: `One song left: its red circle is at ${SPOTS[songSpot(left[0])].label}. Walk there and do what it says.`, line: { icon: 'note', label: 'One song left', tail: 'at the red circle' } };
  return { text: 'Walk to a red circle on the farm and do what it says: a bird brings its song as an egg, in a yellow circle.', line: { icon: 'note', label: 'Walk to a red circle' } };
}
