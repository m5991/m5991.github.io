// Bootstrap and wiring for the provisional slice. Ownership (annex §F.3): the ledger owns
// every count and is saved after each accepted transaction, before its presentation starts;
// the interaction controller owns selection and arming (never saved); the world, Vanessa and
// the DOM only present. URL knobs: ?cam=persp|ortho &pitch= &fov= &speed= &outline=0
// &overlay=1 (drawing overlay in the whole-farm framing) &debug=1 (test hooks, readout).
// Playtest fixes (captain phone test 2026-11-01): a 4.5 m/s run, a floating stick, a ground
// ring on the nearest collectible with a work-progress arc, the tree fading when it hides
// Vanessa or a target, and the first-actions coach (game/tutorial.js, ui/coach.js).
// v0.9 (addendum 25): the rake and the shovel are taken at the tools and ride her hand while she
// weeds or digs (P25-4); the ledger's own follow-ups (a free stage committing, an idle tool going
// back) are applied through the same commit, so each is saved and presented; wood branches fall
// from the tree (P25-5) and stone comes from finite rocks (P25-6).
// Spec v0.9 (captain phone test of build v6): parts of the drawing take their colour when
// finished (game/reveal.js, world.js), the Blueprint toggle and the B key show or hide the
// outlines of unbuilt things (game/prefs.js), and the home (v0.15: H5) ends in the colour finale (world/finale.js).
// Spec v0.10 §4.1 (A26-1…A26-3): a device's first launch opens on the redrawn drawing on paper
// (game/opening.js, world/opening.js, ui/paper.js); its first tap starts the theme and the
// opening, any later tap or key skips, and it ends on the play start set up by start(). There
// is no title or menu screen (S26-02): a save notice is a paper card before play, and New farm
// and Watch the opening are in Pause.
// Spec v0.11 (captain 2026-11-02): wood and stone she walks past the yard pile with drop there
// and builds take from it; every station has a Build card and Vanessa hammers each build up
// herself with a "DIY time!" (world/build.js, ui/burst.js); the weeds sit on the three crop
// patches and the first one she rakes is her free first crop, which themes every card and menu
// for good (ui/theme.js).
// v0.12 (captain's v0.11 playtest): crops she walks past go onto the yard-sale table, and a full
// table sells with the Yard Sale button (or a tap on the stand); there are no cards for building
// or selling: the next build's needs count down at the bottom and become its DIY button, which
// works at the part; DIY is a hop, dust and comic hammering; sticks drop around the tree and go if
// left; weeds creep over planted crops; Help me finish (Pause) turns those two off.
// v0.13 (captain's v0.12 playtest): lesson messages are a slim note at the top edge (a tap folds
// it); the yard sale grows with the house (a table per house stage, more buyers); a tool taken
// once comes to her at the job; the DIY button pulses as soon as she has everything, and after
// 10 s an arrow and a sparkle show the part; the finale walks her to her place.
// v0.16 (captain's v0.15 playtest): the egg hunt is phase two, after the finale: a spot with a song
// sparkles, a bird drops its egg near her, she picks it up and the song is hers to listen to and
// download (game/songs.js); a kids edition (kids/, or ?edition=kids) has only the kids' songs and
// no Suno links, and its own save; the hired archer stands at his post and says his line.
// v0.17 (spec §7, §6.5, §5.1, §10.5): birds come for the crops from the second crop plot on (game/
// birds.js decides, the ledger takes, capped); Wave, or a hired archer's warning arrow, sends one
// off; a bird may leave a stain on the restored bench, cleaned with a cloth; Dwight is the sole
// archer; the end credits follow the finale; the Who-Knows plant says hello.
// v0.20 (captain 2026-11-10, with the design audit's changes 1-4): Tiffany's two lists are the song
// set, each song under her label (game/songs.js); a found song's short clip plays as its egg cracks,
// over the ducked theme, and its card shows a line of its lyrics (audio/clips.js, ui/cards.js); once
// hired, Dwight takes the birds that come for the crops by himself, and the completed menu counts
// them; the finished farm's evening starts from the finish; the full edition's credits are a
// slideshow of the photos of the drawing over the years (the kids edition has none).
// v0.21 (captain 2026-11-10: the design audit's changes 5, 7 and 9, and "the tomatoes harvest
// should also go up"): one voice on screen (the goal in one icon-first line, counters that appear
// when they matter, one pill, edge notes only for news: ui/hud.js, ui/voices.js); the egg hunt is
// a hunt in the full edition (stars hidden until she is near, clues in the songbook: game/songs.js);
// an upright phone frames the finale and the opening on the drawing's middle (world/framing.js);
// a grown tomato plant gives more (game/data.js TOMATO_YIELD).
// v0.22 (Tiffany's notes "Changes to game", 2026-11-11, with the captain's answers): one game with
// her one list of songs (22 and the two she added; no kids edition); a found song starts by itself
// at its preview and plays on, and its card has one button; Pause only pauses, and Extras (New
// farm first, The drawing, Slideshow, Songs with the downloads, Keepsakes, Credits) stands in its
// place once the farm is finished; the slideshow is offered at the end, never started by itself;
// every song spot's act is something Vanessa is seen doing (world/moments.js); a bird that takes
// from a plant flies off with its crop and the plant grows it again; the opening is her drawing.
// v0.23 (Tiffany's notes "Farm changes #2", 2026-11-12, and the design audit's 8, 12, 13 and 14):
// at DIY time the goal line says DIY and the place, one arrow leads there and its circle is the
// only one; the builds come in her order, one at a time; a tool is in Vanessa's hand only for its
// own job, and she is seen raking and digging; a yard sale is held when every table is full, and
// her crops go onto the table that has room; no sound button on the screen (it is in Pause and in
// Extras) and the sound starts with the game; in the end the actions are red circles, the songs
// yellow ones, the keepsakes bounce, a few show at a time and no arrow points at them; weeds come
// up on the grass and birds visit, harming nothing; Dwight walks out of the picture before the
// final image and sits on the bench afterwards; Extras lists every song, and has no Credits.
// v0.24 (the captain's v0.23 playtest, 2026-11-12): the DIY button works wherever she is within
// reach of the next build's own site (at "DIY · Windows & doors" it never came: the house's stages
// share one site, and the nearest of them was taken to be the roof's); the tree's trunk fades with
// its canopy; every weed that stands can be raked from the start, and the ones on the open grass
// grow straight back; Pause has the sound switch and the two volumes.
// v0.25 (the captain's v0.24 playtest, 2026-11-13): the finale is shot for the screen it plays on
// (the house, then her place, each filling an upright screen; a closer start and the whole drawing
// on a wide one; v0.27: the whole farm, on every screen); the opening cannot be skipped and a new farm plays
// it; a welcome card opens every new farm; the weeds of the later corn and sunflower plots can be
// raked from the start; she carries one table's worth of crops and the rest goes into the crate
// beside the tables, which fill from it; with every song and keepsake found the day turns to a
// lasting golden evening on the bench (game/sunset.js) and The drawing is signed and stamped.
// v0.26 (the captain, on the S26 in Firefox: "i can feel how the phone starts heating"; the audit
// found the farm drawn 108-119 times a second, also while nothing happened): the farm is drawn 60
// times a second at most, 30 while nothing but its own small motion moves, and not at all behind
// Pause, Extras, a card or in a hidden tab (core/loop.js, `framePlan` below); a prop's parts of
// one look are one mesh with one ink hull (world/hand.js mergeByMaterial); what a frame works out
// again is kept until it changes. Each fix has a switch on the address (core/perf.js). Nothing
// looks or runs differently.
// v0.27 (the captain's v0.25 playtest, 2026-11-13: "maybe we should simply show the whole farm"):
// the finale is one shot on every screen, the whole farm (world/framing.js WHOLE_FARM), and the
// picture slides into the room the end card leaves; on the bench in the sunset Dwight says his
// line, "(of the)" in much smaller letters (game/data.js DWIGHT_THANKS).
// v0.28 (the captain: "I find the box counterintuitive ... the same as the materials place"): she
// carries twelve crops on her head and picks nothing past that; walking past the crop crate empties
// her head into it, the crops flying from her stack as wood and stone fly onto the pile; Yard Sale
// fills the tables from the crate first, the crops flying over, and then the buyers come.
import * as THREE from 'three';
import { PERF } from './core/perf.js';
import { createWakeLock } from './core/wake-lock.js';
import { createLoop } from './core/loop.js';
import { ModelRegistry } from './core/models.js';
import { Tweens } from './core/tween.js';
import { ARCHER_LINES, BASE_STAGE, BIRDS, CAPACITY, CRATE_CAP, DWIGHT_THANKS, dwightLine, HAMMERED, HEAD_CROPS, HOUSE_STAGES, isYardWeed, NODES, TABLE_STAGES, lineText, RESOURCE_NAMES, RESOURCE_UNIT, ROCKS, STAGES, STAGE_ORDER } from './game/data.js';
import {
  apply, autoTxs, available, canTake, crateCount, crateFull, cropsCarried, sourceResource, mainComplete, plotWeeds, isFirstCrop, recipe, restockReady, saleReady, saleWish, storeFull,
  tableCap, tableFull, tables, toolIdle,
} from './game/ledger.js';
import { createBirds, WAVE_MS } from './game/birds.js';
import { createCredits } from './ui/credits.js';
import { createSongPlayer, fmtTime } from './ui/songplayer.js';
import { createBeat, lowEnergy } from './audio/beat.js';
import { eveningAt, sinceFinish } from './game/evening.js';
import { KEEPSAKES, KEEPSAKE_IDS, KEEPSAKE_REACH_M, foundKeepsakes, keepsakeLine, keepsakePrints, keepsakesLeft, keepsakesNow, keepsakeTitle, songTurn } from './game/keepsakes.js';
import { bubblePlace } from './ui/bubble.js';
import { createRace, fmtRace, raceClock } from './game/race.js';
import { drawShared, postcardStats, sharePostcard, SIGNED_BY, statsItems, statsLine } from './ui/postcard.js';
import { createDiyHint } from './game/hints.js';
import { byHouse, PATCH_NAME, pileWords, PLACE_LABEL, SHORT_LABEL, spotStatus, WOOD_PILES, WOOD_SOURCES } from './game/guide.js';
import { eggPhase, eggsAt, found, foundCount, foundSongs, hasSong, huntCircles, huntGoal, LAST_SONG, lastSongTurn, lastSongWaits, mp3Name, mp3Path, nextEgg, previewStart, songLyric, songNumber, songSpot, songTitle, songsFor, spotAct, SPOTS, sunoLink } from './game/songs.js';
import { eggStuck } from './game/egg.js';
import { createNotes, onePill, quietCoach } from './ui/voices.js';
import { Hammering } from './world/build.js';
import { wishWords } from './world/world.js';
import { createBurst } from './ui/burst.js';
import { applyTheme } from './ui/theme.js';
import * as G from './world/greybox.js';
import { createPrefs } from './game/prefs.js';
import { Finale, FINALE_YAW, obstaclesOf } from './world/finale.js';
import { planWalk } from './world/walk.js';
import { Sunset } from './world/sunset.js';
import { eveningLight, everythingFound, SAYS_AFTER_MS, saysAfter, SIGNATURE, STAMP, SUNSET_AFTER_MS, sunsetDue } from './game/sunset.js';
import { Opening } from './world/opening.js';
import { freshFarm, playsOpening, saveNotice, WELCOME, welcomeDue } from './game/opening.js';
import { finishedFarm } from './game/endfarm.js';
import { createPaper } from './ui/paper.js';
import { createSaveData, createSaveManager } from './game/save.js';
import {
  atSellingSide, buildBarAt, createInteraction, HIGHLIGHT_RANGE_M, idleWeed, inReach, isMoving, pickHighlight, SALE_REACH_M, toolBlocked, wantedTool,
} from './game/interaction.js';
import { nextGoal, nextStage } from './game/guide.js';
import { coachPrompt, dropLesson, guideTargets, kindOf, learned, LINGER_MS, MOVED_M, routineGather, tutorialStep } from './game/tutorial.js';
import { fitRect, PRESETS, Projection, projectedExtent } from './world/projection.js';
import { endCardFrame, finaleRect, mixRect } from './world/framing.js';
import { World } from './world/world.js';
import { Hero, RUN_SPEED } from './world/hero.js';
import { ThiefScene, THIEF_SCENE } from './world/thief.js';
import { Giveaway, GIVEAWAY } from './world/giveaway.js';
import { CameraRig } from './world/camera.js';
import { outlines } from './world/greybox.js';
import { configureShadows, setLookResolution } from './world/look.js';
import { VANESSA_START } from './world/layout.js';
import { createHud } from './ui/hud.js';
import { createCards } from './ui/cards.js';
import { createInput } from './ui/input.js';
import { stackCap, STACK_BASE_Y } from './world/stackmath.js';
import { arrowPlacement, createCoach } from './ui/coach.js';
import { createAudio, RETURN_GRACE_MS } from './audio/audio.js';
import { TRACK } from './audio/track.js';
import { createSfx, LAND_CUE, ledgerCue, SFX_PATH, sfxFiles } from './audio/sfx.js';

const params = new URLSearchParams(location.search);
const preset = { ...PRESETS[params.get('cam') === 'ortho' ? 'ortho' : 'persp'] };
if (params.has('pitch')) preset.pitchDeg = Number(params.get('pitch'));
if (params.has('fov') && preset.type === 'perspective') preset.fovDeg = Number(params.get('fov'));
outlines.enabled = params.get('outline') !== '0';
const DEBUG = params.has('debug');
// v0.29 (Tiffany: "For editing purposes, can I be able to skip to the end to see what it looks like
// without playing the whole game?"): `?end=1` opens a finished farm in the song hunt, kept for the
// session only (the farm saved on the device is not touched). Not shown anywhere in the game.
const END = params.get('end') === '1';
// v0.16 the hunt: how near a spot (m) calls the bird, how near the landed egg picks it up, where
// the rest between two eggs (ms); the egg lands a step from her (world.freeSpotNear)
// v0.29 (Tiffany: "Have her click a song and be able to go get a keepsake while the song plays and
// but not another song for at least 15 seconds so they have to listen to a little of the song"):
// after a song is found no red circle shows for 15 s; the keepsakes are there meanwhile
// v0.31 (Tiffany's "Edits #5": "Make her listen to the song a little less time before the new red
// clickable circle appears"): 10 s (v0.29-v0.30: 15 s)
const HUNT = { spotM: 0.65, pickM: 0.75, restMs: 10000 };
const KEEP_AFTER_MS = 2500; // v0.33: a song's keepsake comes out this far into it
const SPEED = params.has('speed') ? Number(params.get('speed')) : RUN_SPEED;
// v0.32 (Tiffany's "Edits #6": "The background soundtrack is skipping. Have it run continuously"):
// the iPhone's silent element (an iPhone without the audio-session API) loops two seconds of silence
// at 48 kHz, the rate the theme plays at, made here once. v0.29-v0.31 looped a tenth of a second at
// 8 kHz (SILENT_WAV), restarting ten times a second at a rate the phone's audio had to switch to.
function silentWav(seconds = 2, rate = 48000) {
  const n = seconds * rate;
  const b = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true); b.setUint32(24, rate, true);
  b.setUint32(28, rate * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); str(36, 'data'); b.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
}
const $ = (id) => document.getElementById(id);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

async function boot() {
  // the paper is laid out at once, so the title pencils itself in while the farm loads
  const paper = createPaper($('opening'));
  if (document.documentElement.dataset.opening !== undefined) paper.place(window.innerWidth, window.innerHeight);
  // ---------- renderer, scene, lights ----------
  const canvas = $('world');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(PERF.dpr, window.devicePixelRatio || 1)); // v0.26: ?dpr= (2, as before)
  renderer.shadowMap.enabled = params.get('shadows') !== '0' && PERF.shadow > 0;
  // the shared look (world/look.js): toon bands lit by one soft sun from the upper left, soft
  // ink-blue PCF shadows, a paper sky drawn by the world (no clear colour shows)
  const scene = new THREE.Scene();
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(PERF.shadow || 1024, PERF.shadow || 1024); // v0.26: ?shadow= (1024, as before)
  Object.assign(sunLight.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  configureShadows(renderer, sunLight);
  scene.add(sunLight, sunLight.target);

  // ---------- assets, projection, world ----------
  const registry = new ModelRegistry();
  await registry.load('assets/models/vanessa.glb');
  const probe = registry.instance('Vanessa');
  probe.updateMatrixWorld(true);
  const vBox = new THREE.Box3().setFromObject(probe, true);
  const proj = new Projection(preset, vBox.max.y - vBox.min.y).refine(probe);
  const tweens = new Tweens();
  const world = new World({ scene, proj, tweens });
  world.build();
  const hero = new Hero({ registry, world, scene, speed: SPEED });
  world.setHand(hero.view.getObjectByName('Hand_R_Tool'), hero.view); // the held rake or shovel follows it
  // she builds it herself (spec v0.11 §10.10): the hammer from her bib pocket, the strikes
  const hammering = new Hammering({ hammer: G.hammer(), hand: hero.view.getObjectByName('Hand_R_Tool'), body: hero.view, root: world.root, physics: hero.body });
  const burst = createBurst();
  // v0.29: "I gave it to the world": the other farmer who takes the drawing (world/thief.js)
  const thief = new ThiefScene({ registry, root: world.root, tweens, drawingMap: (fn) => world.drawingMap(fn), inkWord: (...a) => world.inkWord(...a), puff: (...a) => world.puff(...a), reducedMotion: () => reducedMotion() });
  let sceneSteer = null; // her steer while she chases the farmer
  // v0.31: the last song's scene, over the whole song (world/giveaway.js)
  const giveaway = new Giveaway({ registry, world, hero, tweens, reducedMotion: () => reducedMotion(), onSay: (who, line) => archerSays(line, 6500), onCue: (c) => sfx.cue(c) });
  let giveawaySong = null; // { id, started } while it runs
  let burstHeld = false; // test hook (?debug=1): hold the burst's frame for a screenshot
  const rig = new CameraRig(proj);
  world.heroPos = () => hero.position; // flat parts wash outward from where she works
  world.camera = rig.camera; // the hunt's sparkles face it
  // the sheet she holds up in two of the hunt's moments carries the drawing itself (hero.js)
  hero.drawingTexture = (mat) => new THREE.TextureLoader().load('assets/reference/drawing.jpg', (tex) => { tex.colorSpace = THREE.SRGBColorSpace; mat.map = tex; mat.needsUpdate = true; });

  // ---------- state, saves ----------
  const saves = createSaveManager(END ? null : safeStorage()); // (v0.29: ?end=1 keeps its farm for the session only)
  let data = createSaveData();
  let lastSaveAt = 0;
  const hud = createHud();
  // v0.32 (Tiffany's "Edits #6": "Don't prompt her to do anything else during a yardsale"): while the
  // neighbours buy, the notes wait and come once they have gone (`selling`, below)
  {
    const show = hud.toast.bind(hud);
    const held = [];
    hud.toast = (text, ms) => { if (selling()) { if (!held.some(([t]) => t === text)) held.push([text, ms]); } else show(text, ms); };
    hud.flushHeld = () => { for (const [t, m] of held.splice(0)) show(t, m); };
  }
  const selling = () => saleShowing || saleStarting || !!(autoWalk && !autoWalk.stage);
  // v0.21 (audit 5: "edge notes only for new information"): a kind of news is told once a session
  const notes = createNotes((text, ms) => later(() => hud.toast(text, ms)));
  // v0.17b: one song player for the game: a song keeps playing when its card or the menu closes,
  // in place of the theme, until it ends or is stopped (ui/songplayer.js).
  // v0.22: a found song starts by itself as its egg cracks, at its preview's first second, and
  // plays on to its end (no Listen button, no short clip that stops). The player's one audio
  // element is blessed on the first taps (`unlock`, below), so a phone lets it start with no tap.
  const songs = createSongPlayer({
    onActive: (on) => { if (on) audio.holdMusic('song'); else audio.releaseMusic('song'); },
    muted: () => !audio.settings.soundEnabled,
  });
  const cards = createCards($('card'), { player: songs });
  const coach = createCoach();
  const prefersReduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const reducedMotion = () => prefersReduced || data.settings.reducedMotion;
  world.reducedMotion = reducedMotion; // unit flights fade in place instead of arcing (V8)
  hammering.reducedMotion = reducedMotion;
  hero.reducedMotion = reducedMotion; // the stack: no sway or spring, flights fade (V8)
  const getLedger = () => data.ledger;

  // sound effects: cues decide and throttle (audio/sfx.js); the audio owner plays them on its
  // effects bus, which applies effectsVolume and Mute all. Reduced motion changes no sound.
  // (`audio` is created below; cues only fire once the world runs)
  const sfx = createSfx({ play: (file, o) => audio.playEffect(file, { volume: o.gain, rate: o.rate }) });
  hero.stack.onLand = () => sfx.cue('pop'); // a picked-up unit arrives on the stack
  world.onWash = () => sfx.cue('brush'); // one soft brush stroke as a colour wash starts (§10.9)
  hero.onFootfall = (kind) => sfx.cue('step', { gain: kind === 'run' ? 1 : 0.7 });
  world.onBranch = (phase) => sfx.cue(phase); // the stick snaps free, then lands (P25-5)

  // a message for the player, shown now or, while the opening plays, as it ends
  const afterOpening = [];
  const later = (fn) => { if (opening?.active) afterOpening.push(fn); else fn(); };
  function persist() {
    const p = hero.body.position;
    data.vanessa = { x: p.x, z: p.z };
    const r = saves.save(data);
    lastSaveAt = data.ledger.activeMs;
    if (r.sessionOnly && !persist.warned) { persist.warned = true; later(() => hud.toast('Saving is unavailable here: progress lasts for this session only.', 5000)); }
  }

  // v0.26: counts the ledger's changes other than its clock, so that what the world step works
  // out from the ledger (world.targets) is worked out once per change and not once per frame
  let ledgerRev = 0;
  // every accepted transaction is saved before its presentation (spec §12); then the ledger's own
  // follow-ups (C0 committing free as its weeds clear, an idle tool going back) go the same way
  function commit(tx) {
    const r = apply(data.ledger, tx);
    if (!r.ok) return r;
    data.ledger = r.l;
    if (tx.t !== 'tick' || r.events.length) {
      ledgerRev++; // v0.26: something other than the clock changed (what is kept per frame is asked again)
      persist();
      present(tx, r.events); // books unit flights first, so their piles fill only as they land
      world.sync(data.ledger, true);
      hud.render(data.ledger);
      settleLedger();
    } else if (data.ledger.activeMs - lastSaveAt > 5000) {
      persist(); // active time and position, throttled
    }
    return r;
  }
  // ---------- v0.16: the egg hunt (phase two) and the songs ----------
  // Once the farm is finished and coloured, every song is an egg: a spot with a song left in it
  // sparkles; when Vanessa has done its small moment there a bird flies over and drops the egg near
  // her; walking up to it picks it up, and the song is found (saved at once, in `discoveries`), its
  // song starts playing and its card opens. Session-only state; nothing in the ledger.
  const hunt = { busy: false, egg: null, id: null, restMs: 0, eggs: 0, at: new THREE.Vector3(), moment: null };
  // (v0.22: not in the moment between the home's last hammer blow and its finale: `finaleDue`)
  const inHunt = () => eggPhase(data.ledger) && session.playing && !finale.active && !sunset.active && !giveaway.active && !finaleDue && !opening.active && rig.mode !== 'whole';
  // v0.25: every song and every keepsake is found (every action with them: a song is found by its action)
  const allFound = () => everythingFound(data, songsFor(), KEEPSAKE_IDS);
  // v0.27: the circles out now. The last song's ("I gave it to the world") comes out when every
  // other song and every keepsake is found (songs.js LAST_SONG), so it is always the last find.
  const keepsakesDone = () => keepsakesLeft(data.keepsakes ?? {}).length === 0;
  // v0.30 (Tiffany: "There should never be a time that there aren't any red circles if there are
  // more songs to collect"; "If a red circle appears don't let it disappear until she collects the
  // song"; "Make the song circles appear spaced out in location"): the circles out now (songs.js
  // huntCircles), worked out again only when a song is found, with the metres between the spots
  // measured on the farm. The last song's circle comes out as soon as every other song is found; its
  // action waits for the keepsakes (`actOpen`).
  const spotGap = new Map();
  const spotDist = (a, b) => {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    let m = spotGap.get(k);
    if (m === undefined) { const p = world.eggSpotPos(a, new THREE.Vector3()); const q = world.eggSpotPos(b, new THREE.Vector3()); m = Math.hypot(p.x - q.x, p.z - q.z); spotGap.set(k, m); }
    return m;
  };
  const circles = { of: null, out: [] };
  const spotsNow = () => {
    if (circles.of !== data.discoveries) { circles.of = data.discoveries; circles.out = huntCircles(data.discoveries, { dist: spotDist }); }
    return circles.out;
  };
  // can the action at this spot be done now (v0.30: the last song's waits for the keepsakes)
  // (v0.32: every song's, the last one's too, waits until each song found so far has had its keepsake
  // found: a song and a keepsake take turns, keepsakes.js songTurn)
  // (v0.32: the bench's "Clean the bench" once a bird has left its mess there, Tiffany's "Edits #6")
  // (v0.33: the last song's waits for every keepsake: keepsakes.js keepsakesNow)
  const actOpen = (spot) => songTurn(data.keepsakes ?? {}, foundCount(data.discoveries)) && (spot !== 'bench' || !!data.ledger.theft.stain) && (spot === null || spot !== songSpot(LAST_SONG) || !!data.discoveries?.[LAST_SONG] || keepsakesDone());
  function spotHere(heroXZ) {
    // (v0.23: only the few spots on show have their action)
    for (const id of spotsNow()) {
      world.eggSpotPos(id, tmpH);
      if (Math.hypot(tmpH.x - heroXZ.x, tmpH.z - heroXZ.z) <= world.spotReach(id) && actOpen(id)) return id;
    }
    return null;
  }
  const tmpH = new THREE.Vector3();
  // v0.31: an action can be started now (nothing of the last song is still under way)
  const huntReady = () => !hunt.egg && !hunt.busy && !hunt.moment && hunt.restMs <= 0;
  function updateHunt(dt, heroXZ) {
    if (!inHunt()) { world.updateEggSpots([], dt); world.updateSpotProps([], false); world.updateEggCircle(null, dt); return; }
    // v0.23 (Tiffany: "have just a few at a time ... replacing each other as she collects them"):
    // the first few spots that still hold a song, each with its red circle (the action); the
    // song itself, the egg on the grass, lies in a yellow one
    const showing = spotsNow();
    // v0.32 (Tiffany's "Edits #6": "The crumbled piece of paper looks like a keepsake. Make it only appear
    // at the same time as the red circle around it"): a spot's things (the weeds, the crumpled sketch)
    // lie there only while its circle is on the grass, or while she does its action
    const onGrass = huntReady() ? showing.filter(actOpen) : [];
    world.updateSpotProps(hunt.moment && !onGrass.includes(hunt.moment.spot) ? [...onGrass, hunt.moment.spot] : onGrass, true);
    // v0.31 (Tiffany's "Edits #5": "Don't highlight red circles until you're able to actually click
    // on them (do the action and get an egg)"; "just don't have a red circle until the time is up.
    // So she never is standing on a red circle waiting to be given an action"): a circle is on the
    // grass only while its action can be done: not while the bird comes, the egg waits, she does an
    // action or listens to the song just found, and not the last song's while a keepsake is left.
    // Which spots are out (`spotsNow`) is v0.30's: a circle that has come out stays its song's
    // until that song is found, and comes back on the grass as soon as its action can be done.
    world.updateEggSpots(onGrass, dt);
    world.updateEggCircle(hunt.egg, dt);
    if (hunt.egg) {
      // v0.30 (Tiffany: "The egg fell on the chimney but she can't climb back up to get it. Also when
      // she's on top of the house"; "She can't reach the chimney egg"): an egg on the roof that she
      // is not up beside comes down off the roof to the grass beside her (the stick took her down
      // from the chimney while the bird was on its way)
      // v0.33 (Tiffany's "Edits #7": the yellow circle only "when it falls to the ground because that's
      // where she can collect it"): an egg on the roof always rolls off it to the grass in front of
      // the house, a moment after it lands, and she climbs down to pick it up there
      if ((hunt.egg.userData.y ?? 0) > 0.3 && !hunt.egg.userData.falling) { hunt.egg.userData.roofMs = (hunt.egg.userData.roofMs ?? 0) + dt; if (hunt.egg.userData.roofMs > 700 || eggStuck({ eggY: hunt.egg.userData.y ?? 0, heroUp: heroUp() })) eggDown(hunt.egg); return; }
      if (!hunt.egg.userData.falling && Math.hypot(hunt.egg.position.x - heroXZ.x, hunt.egg.position.z - heroXZ.z) <= HUNT.pickM) pickEgg();
      return;
    }
    if (hunt.busy) return;
    hunt.restMs = Math.max(0, hunt.restMs - dt);
    if (hunt.restMs > 0 || cards.isOpen) return; // (v0.31: sitting on the bench is the world step's, benchSit)
    // v0.17c: at a spot, its small moment first (songs.js SPOTS act), then the bird
    const m = hunt.moment;
    if (m) {
      const before = m.ms;
      m.ms += dt;
      for (const [time, cue] of momentCues(m.act.kind, m.act.ms)) if (before < time && m.ms >= time) sfx.cue(cue);
      if (hero.moving) { hunt.moment = null; hero.cancelMoment(); world.cancelSpot(m.spot); return; } // walking off calls it off
      // v0.29 (Tiffany: "When she climbs to the chimney the bird should drop the egg up there"): at
      // the top she waits by the chimney, the bird drops the egg onto the roof beside her, she
      // picks it up there (pickEgg), and then climbs down
      if (m.act.kind === 'chimney' && !m.eggAsked && m.ms >= m.act.ms * CHIMNEY_TOP) {
        m.eggAsked = true;
        if (hero.moment?.kind === 'chimney') hero.moment.freezeAt = CHIMNEY_TOP;
        const id = nextEgg(data.ledger, { discoveries: data.discoveries, spot: m.spot });
        if (id) bringEgg(id, { roof: true });
        return;
      }
      if (m.ms >= m.act.ms) {
        hunt.moment = null;
        const id = m.eggAsked ? null : nextEgg(data.ledger, { discoveries: data.discoveries, spot: m.spot });
        if (id) bringEgg(id);
      }
      return;
    }
    const spot = spotHere(heroXZ);
    const act = spot && spotAct(spot);
    if (act && $('context').hidden) hud.setContext(act.verb, () => startMoment(spot), 'act');
  }
  // v0.29 (Tiffany: "Let her go sit with Dwight at anytime. In the collecting faze"): she sits at the
  // bench's other end while he sits on it, and stays until the stick moves her.
  // v0.30 (Tiffany: "You can sit down next to Dwight without clicking on the button. Just standing
  // right next to him makes you sit"): no button: standing still beside his end of the bench for a
  // moment (SEAT_AUTO) sits her down. Once she gets up she has to step away before it can again.
  // v0.31 (Tiffany's "Edits #5": "Allow her to sit down on the bench by approaching the front at
  // any point in the whole game"; "Let her sit down on the bench at any time"): from the moment the
  // bench is built, with Dwight on it or not: standing still in front of the seat for a moment
  // (her free end of it when he sits there) sits her down. Not while she is busy with anything else.
  // (the Clean the bench button is up as she comes near: a moment's stop in front of the seat sits her)
  const SEAT_AUTO = { near: 0.8, away: 1.7, ms: 600, half: 0.95 }; // (v0.32: a little sooner and from a little farther: 0.75 m, 0.9 s)
  const seatAuto = { ms: 0, armed: true };
  const benchBuilt = () => !!data.ledger.stages?.G2?.committed;
  // where she stands to sit down: in front of her end of the seat
  const benchFront = () => world.spotStage('bench', hero.position).to;
  function benchSit(heroXZ, dt = 0) {
    // v0.33 (Tiffany's "Edits #7": "Regularly it prompts her to clean the poop and she just sits in it
    // instead"): with a bird's mess on the seat, standing at the bench is for cleaning it (Clean the
    // bench); she sits once it is clean
    if (!benchBuilt() || data.ledger.theft.stain || hero.moment || hero.rise || cleaning || hammering.active || roofClimb || autoWalk || ix.working || hunt.moment || hunt.egg || saleShowing || cards.isOpen || (inHunt() && spotHere(heroXZ))) { seatAuto.ms = 0; return; }
    // v0.33 (Tiffany's "Edits #7": "Have her be able to sit on the bench at any point in the game, not just
    // when there's poop there"): she found her seat only where the mess's red circle put her. Now
    // anywhere along the front of the seat, up to 1.2 m out, sits her down (her free end of it when
    // Dwight is there); v0.32 asked for 0.85 m round one point in front of her end of it
    const b = world.objects.D10.localToWorld(tmpH.set(0, 0, 0));
    const yaw = world.objects.D10.rotation.y;
    const dx = heroXZ.x - b.x; const dz = heroXZ.z - b.z;
    const along = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const out = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const ahead = out > 0.05;
    const d = Math.abs(along) <= SEAT_AUTO.half && ahead ? Math.max(0, out - 0.42) : Infinity;
    if (!(Math.abs(along) <= SEAT_AUTO.half + 0.5 && out > -0.6 && out < SEAT_AUTO.away)) seatAuto.armed = true;
    // v0.32 (Tiffany's "Edits #6": "Allow her to sit on the bench anytime she wants to even if Dwight is on
    // it too. She sits when she stands right in front of it"): standing in front of her end of the seat
    // sits her down after a short moment (SEAT_AUTO.ms), and so does walking into it from the front
    // (the stick pushing her against the seat): v0.31 waited for her to stand still, so pushing toward
    // the bench, the natural thing to do, never sat her down
    const m = Math.hypot(lastStick.x, lastStick.y);
    const into = m > 0.3 && ((lastStick.x / m) * -Math.sin(yaw) + (-lastStick.y / m) * -Math.cos(yaw)) > 0.5;
    if (!seatAuto.armed || d > SEAT_AUTO.near || !ahead || (hero.moving && !into)) { seatAuto.ms = 0; return; }
    seatAuto.ms += into ? dt * 2.5 : dt;
    if (seatAuto.ms < SEAT_AUTO.ms) return;
    seatAuto.ms = 0; seatAuto.armed = false;
    ix.reset();
    hero.halt();
    hero.startMoment('bench', { ms: 5000, hold: true, ...world.spotStage('bench', hero.position) });
    hud.announce(world.archerSeated('A1') ? 'Vanessa sits on the bench beside Dwight' : 'Vanessa sits down on the bench');
  }
  const dwightSeat = benchSit; // (the v0.30 name)
  // v0.30: is she up on the house (the chimney's climb), where an egg on the roof is in her reach
  const heroUp = () => hero.moment?.kind === 'chimney' && hero.position.y > 0.5;
  // the egg rolls off the roof and drops onto the grass a step from her, clear of the red circles
  function eggDown(egg) {
    const to = world.eggSpot(hero.position, circleAvoid(), onPlayScreen); // (v0.33: in sight, never behind the house)
    // (v0.33: she climbs down for it: the egg is picked up on the grass)
    if (hunt.moment?.eggAsked) { hunt.moment = null; if (hero.moment?.kind === 'chimney') hero.moment.freezeAt = null; }
    hud.announce('The egg rolls off the roof and drops onto the grass beside Vanessa');
    world.eggFall(egg, to).then(() => sfx.cue('eggDrop'));
  }
  // the red circles on show, for the egg to land clear of
  const circleAvoid = () => spotsNow().map((sp) => { const p = world.eggSpotPos(sp, new THREE.Vector3()); return { x: p.x, z: p.z, r: 1.0 }; });
  // ---------- v0.17c: the keepsakes hidden on the finished farm (game/keepsakes.js) ----------
  let creditsContent = null;
  const loadCreditsContent = () => (creditsContent ??= fetch('assets/credits/credits.json').then((r) => r.json()).catch(() => null));
  function updateKeepsakes(dt, heroXZ) {
    const out = inHunt();
    data.keepsakes ??= {};
    // v0.23: a few at a time, each bouncing where it lies
    // (v0.30: one at a time, one more for each song found: keepsakes.js keepsakesNow)
    // (v0.31: and once every song but the last is found, the rest one after another)
    // v0.32 (Tiffany's "Edits #6": "while the song plays have her find the keepsake ... Stagger them so
    // they are timed evenly"; "Don't hide the keepsakes as much. Make them fairly obvious. Not blocked
    // by other things like gardens, trees, benches etc"): the keepsake a song brings comes out
    // HUNT.restMs into the song (as the "Enjoy the song" wait ends), on open grass a few metres from
    // her, in front of nothing and behind nothing, clear of the red circles (world.keepsakeSpot)
    const owed = keepsakesNow(data.keepsakes, foundCount(data.discoveries), lastSongTurn(data.discoveries) && !data.discoveries?.[LAST_SONG]);
    if (keepOut && (data.keepsakes?.[keepOut] || !owed.includes(keepOut))) keepOut = null;
    // v0.33 (Tiffany's "Edits #7": "Make sure there is a keepsake available to be found/collected within
    // 5 seconds of having clicked on the song"): 2.5 s into the song (v0.32: 10 s, as its wait ended)
    if (!keepOut && owed.length && out && !hunt.egg && !hunt.busy && !hunt.moment && hunt.restMs <= HUNT.restMs - KEEP_AFTER_MS && !giveaway.active) {
      keepOut = owed[0];
      world.placeKeepsake(keepOut, world.keepsakeSpot(hero.position, circleAvoid(), KEEPSAKE_IDS.indexOf(keepOut), onPlayScreen));
      hud.announce(`A keepsake has come out on the grass near Vanessa: ${keepsakeTitle(keepOut)}`);
    }
    const shown = keepOut ? [keepOut] : [];
    world.updateKeepsakes(dt, { out, found: data.keepsakes, shown });
    if (!out || cards.isOpen || hunt.moment) return;
    for (const id of shown) {
      const p = world.keepsakePos(id);
      if (p && Math.hypot(p.x - heroXZ.x, p.z - heroXZ.z) <= KEEPSAKE_REACH_M) { findKeepsake(id); break; }
    }
  }
  let keepOut = null; // v0.32: the keepsake out on the grass now (session only: placed near her)
  // v0.32: the crop spots on the screen now (a weed creeps over one of those first), every half second
  const inView = { at: -1, ids: [] };
  const nodesInView = () => {
    const now = data.ledger.activeMs;
    if (Math.abs(now - inView.at) < 500) return inView.ids;
    inView.at = now;
    inView.ids = Object.keys(NODES).filter((id) => { const p = world.stations[id]?.pos; return p && onPlayScreen(p.x, p.z); });
    return inView.ids;
  };
  // v0.32: a place on the grass is in the play area of the screen now, with a margin
  const onPlayScreen = (x, z) => {
    const v = tmpP.set(x, 0.2, z).project(rig.camera);
    const sx = ((v.x + 1) / 2) * view.w; const sy = ((1 - v.y) / 2) * view.h;
    return v.z < 1 && sx > view.w * 0.12 && sx < view.w * 0.88 && sy > (live.playTop || live.hudBottom) + 50 && sy < (live.ctlTop || view.h) - 70;
  };
  function findKeepsake(id) {
    keepOut = null;
    data.keepsakes = { ...data.keepsakes, [id]: data.ledger.activeMs };
    persist(); // kept before it is shown
    world.pickKeepsake(id);
    sfx.cue('complete');
    hud.announce(`Found a keepsake: ${keepsakeTitle(id)}`);
    setTimeout(() => keepsakeCard(id), reducedMotion() ? 150 : 650);
  }
  async function keepsakeCard(id) {
    if (cards.isOpen || !session.playing) { setTimeout(() => keepsakeCard(id), 800); return; }
    const c = await loadCreditsContent();
    input.release(); hero.halt(); loop.pause('card');
    const n = foundKeepsakes(data.keepsakes).length;
    // v0.31 (Tiffany's "Edits #5": "Don't write days or anything other than the titles I give you for
    // the keepsakes and slideshow"): the card is her title over her photos, nothing printed with them;
    // under them, in small letters, only how many are found and when the next one comes
    cards.prints({
      title: keepsakeTitle(id),
      text: '',
      prints: keepsakePrints(id, c).map((g) => ({ ...g, title: '' })),
      // (v0.30: one at a time, and the next comes out with the next song found)
      left: `${keepsakeLine(data.keepsakes)}. ${n < KEEPSAKE_IDS.length ? (foundCount(data.discoveries) < songsFor().length ? 'The next song’s red circle is out now.' : 'Another one comes out soon.') : 'Extras → Keepsakes shows them all.'}`,
      onClose: () => loop.resume('card'),
    });
  }
  async function openKeepsakes({ fromPlay = false } = {}) {
    const c = await loadCreditsContent();
    if (fromPlay) { input.release(); hero.halt(); loop.pause('card'); } // from the HUD's counter: the world waits
    const found = foundKeepsakes(data.keepsakes);
    const left = keepsakesLeft(data.keepsakes);
    cards.prints({
      title: `Keepsakes · ${found.length} of ${KEEPSAKE_IDS.length}`,
      text: found.length ? '' : `${KEEPSAKE_IDS.length} keepsakes lie about the finished farm, one at a time: one more comes out with each song you find. Each one you find is kept here.`,
      // (v0.31: in her order, each under her title, once)
      prints: KEEPSAKE_IDS.filter((id) => data.keepsakes?.[id]).flatMap((id) => keepsakePrints(id, c).map((g, i) => (i ? { ...g, title: '' } : g))),
      left: left.length ? `${left.length} still to find: each song you find brings one out.` : '',
      cancel: 'Close',
      corner: true, // v0.33 (Tiffany's "Edits #7": "Put an x at the top of that one, the keepsakes page")
      ...(fromPlay ? { onClose: () => loop.resume('card') } : {}),
    });
  }
  $('btn-keepsakes').onclick = () => openKeepsakes();

  // ---------- v0.22: "The drawing" (Tiffany: 'Under "draw it" it should say "the drawing" instead
  // and show a downloadable image of the actual drawing') ----------
  // Vanessa's own drawing, the picture the whole farm is made from, with a link that saves it.
  // (v0.17c's Draw it rendered the farm in pencil; this is the drawing itself.)
  // v0.23 (design audit 12, "a postcard to share"): under the drawing, a strip of this farm's
  // numbers (the time it was finished in, the yard sales, the birds Dwight scared off, the songs
  // and the keepsakes found), and Share, which sends the drawing with that strip as one picture
  // through the phone's share sheet (or saves it where there is none). ui/postcard.js.
  const DRAWING = { src: 'assets/reference/drawing.jpg', download: 'The Farm, the drawing.jpg', postcard: 'The Farm postcard.png', shared: 'The Farm, by Vanessa.png' };
  // v0.32: the signed drawing saved as a file (Download)
  const savePicture = async (canvas, name) => {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  };
  const farmStats = () => postcardStats({
    ledger: data.ledger, session: data.session,
    songsFound: foundCount(data.discoveries), songsTotal: songsFor().length,
    keepsakesFound: foundKeepsakes(data.keepsakes ?? {}).length, keepsakesTotal: KEEPSAKE_IDS.length,
    complete: allFound(), // v0.25: the signature and the gold stamp
  });
  function showDrawing() {
    const stats = farmStats();
    void stats;
    cards.picture({
      plain: true, // (v0.32: the drawing, signed, with Share, Download and Close: nothing else)
      byline: SIGNED_BY,
      onDownload: async (img, say) => {
        const c = drawShared(document.createElement('canvas'), img);
        const how = await savePicture(c, DRAWING.shared);
        say(how ? 'Saved.' : '');
      },
      title: 'The drawing',
      text: 'Vanessa’s drawing: the farm, just as she drew it.',
      src: DRAWING.src,
      alt: 'Vanessa’s farm drawing in pen: a house with a smoking chimney, birds, the sun, a corn field, a tree and a bench in a ring of stones, a winding path, a farmer in overalls, sunflowers and a raised bed.',
      download: DRAWING.download,
      save: 'Download the drawing',
      stats: statsItems(stats),
      statsText: statsLine(stats),
      // v0.25: with everything found the drawing is signed "The Farm, complete" and stamped 100%
      ...(stats.complete ? { signature: SIGNATURE, stamp: STAMP } : {}),
      share: 'Share',
      // v0.30 (Tiffany: "When you can share the picture make it just the picture and make it have a
      // disclaimer 'Vanessa drew this!'"): the drawing alone, with that note on it (ui/postcard.js)
      onShare: async (img, say) => {
        const canvas = drawShared(document.createElement('canvas'), img);
        const how = await sharePostcard(canvas, { name: DRAWING.shared, title: 'The Farm', text: 'The Farm, by Vanessa' });
        say(how === 'saved' ? 'Saved as a picture.' : how === 'shared' ? 'Shared.' : '');
      },
    });
  }
  $('btn-drawing').onclick = showDrawing;

  // ---------- v0.17c: the farm moves to the song playing (audio/beat.js, world.dance) ----------
  // The song's element goes through an analyser once (the audio owner's context); its low end
  // drives the sway and the beats. Muted, or with no context, a steady pulse stands in.
  const beat = createBeat();
  const tap = { el: null, analyser: null, bytes: null };
  // v0.29: the song's element is no longer routed through the audio context to be analysed. Routed,
  // it was only heard while that context ran: a phone that suspended or stuck the context (another
  // app, the lock screen) kept the song silent though it "played". The farm keeps to the song's
  // steady pulse instead (audio/beat.js, the fallback it always had). `?beat=1` routes it again.
  const ANALYSE_SONG = params.get('beat') === '1';
  function songEnergy() {
    const el = songs.element;
    const ctx = audio.context;
    if (!ANALYSE_SONG || !el || !ctx || el.muted) return null;
    if (tap.el !== el) {
      tap.el = el; tap.analyser = null;
      try {
        const src = ctx.createMediaElementSource(el);
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        src.connect(an); an.connect(ctx.destination);
        tap.analyser = an; tap.bytes = new Uint8Array(an.frequencyBinCount);
      } catch { tap.analyser = null; }
    }
    if (!tap.analyser) return null;
    tap.analyser.getByteFrequencyData(tap.bytes);
    return lowEnergy(tap.bytes);
  }
  function updateDance(dt) {
    const on = songs.state.playing && !finale.active && !credits.active;
    const b = on ? beat.update(dt, songEnergy()) : { level: 0, beat: false };
    world.dance(dt, { on, level: b.level, beat: b.beat });
  }

  // The sounds of a moment, on its clock (ms): the knocks on the door, a tap for each hop, the
  // clink of the tools, the stamp at the weeds, the coins
  function momentCues(kind, ms) {
    if (kind === 'door') return [[430, 'knock'], [860, 'knock']];
    if (kind === 'hop') return world.hopTimes(ms).map((t) => [t, 'landStone']);
    if (kind === 'reach') return [[ms * 0.5, 'tick'], [ms * 0.62, 'tick']];
    if (kind === 'fist') return [[ms * 0.45, 'thud']];
    if (kind === 'toss') return [[ms * 0.3, 'coin'], [ms * 0.75, 'coin']];
    if (kind === 'pockets') return [[ms * 0.45, 'pop'], [ms * 0.53, 'pop'], [ms * 0.61, 'pop']]; // (v0.32: treasures, not coins)
    if (kind === 'kick') return [[ms * 0.3, 'step'], [ms * 0.55, 'step'], [ms * 0.8, 'step']];
    return [];
  }
  // v0.29: the "I gave it to the world" scene, on the act's clock: she shows the drawing, the other
  // farmer takes it and throws the copies, runs off, Vanessa chases her a few steps; then the egg
  function stepThief(m, dt) {
    if (lastStick.lengthSq() > 1e-4 && !sceneSteer) { thief.cancel(); hunt.moment = null; hero.cancelMoment(); world.cancelSpot(m.spot); return; } // she walked off
    const ev = thief.update(dt);
    if (ev.took) { hero.cancelMoment(); hero.yawTarget = Math.atan2(thief.position.x - hero.body.position.x, thief.position.z - hero.body.position.z); sfx.cue('squawk'); world.inkWord('Hey!', hero.position.clone().setY(2.25), { h: 0.45, ms: 1300 }); hud.announce('Another farmer runs in and takes the drawing'); }
    if (ev.flee) { world.inkWord('Copies for everyone!', thief.position.clone().setY(2.3), { h: 0.38, ms: 1500 }); hud.announce('She throws copies of the drawing everywhere and runs off'); }
    const p = thief.position;
    if (ev.chase && p) {
      const dx = p.x - hero.body.position.x; const dz = p.z - hero.body.position.z; const d = Math.hypot(dx, dz) || 1;
      sceneSteer = (sceneSteer ?? new THREE.Vector2()).set(dx / d, -dz / d);
    } else if (sceneSteer) {
      sceneSteer = null; hero.halt();
      world.inkWord('Come back!', hero.position.clone().setY(2.25), { h: 0.42, ms: 1500 });
      hud.announce('Vanessa chases her off');
    }
    if (m.ms >= m.act.ms) {
      thief.cancel(); sceneSteer = null;
    if (giveaway.active) { giveaway.end(); document.body.classList.remove('finale', 'giveaway'); $('btn-skip').hidden = true; rig.zoomPx = undefined; loop.resume('giveaway'); } giveawaySong = null; // (v0.31) hunt.moment = null;
      const id = nextEgg(data.ledger, { discoveries: data.discoveries, spot: m.spot });
      if (id) bringEgg(id);
    }
  }
  const lastStick = new THREE.Vector2();
  const zeroSteer = new THREE.Vector2(); // (v0.31: no steering while she is in the house)
  function startMoment(spot) {
    if (hunt.moment || hunt.busy || hunt.egg) return;
    const act = spotAct(spot);
    hunt.moment = { spot, act, ms: 0 };
    // v0.31 (Tiffany's "Edits #5": the ending lasts the song, with no egg): the giveaway
    if (act.kind === 'thief') { hunt.moment = null; startGiveaway(spot); return; }
    if (act.kind === 'thief-v030') {
      ix.reset(); hero.halt();
      const face = world.spotFacing(spot, hero.position, rig.camera);
      if (face !== null) hero.yawTarget = face;
      hero.startMoment('show', { ms: THIEF_SCENE.arriveMs + 400 });
      thief.start(hero.position.clone().setY(0), rig.camera);
      sfx.cue('cue');
      hud.setContext(null, null);
      hud.announce(`${act.verb}: ${act.word}`);
      world.inkWord(act.word, hero.position.clone().setY(2.3), { h: 0.45, ms: 1300 });
      return;
    }
    ix.reset();
    hero.halt();
    // she turns to the thing the act is about (the tree, the sun, the corn; the camera for a pose)
    const face = world.spotFacing(spot, hero.position, rig.camera);
    if (face !== null) hero.yawTarget = face;
    const stage = world.spotStage(spot, hero.position);
    if (spot === 'tree' && stage.yaw != null) hero.yawTarget = stage.yaw; // (v0.33: side on to the viewer, hugging the trunk)
    // v0.32 (Tiffany's "Edits #6": "After she hops the stepping stones turn her around to the front"):
    // on the last stone she turns to the viewer
    const last = act.kind === 'hop' ? stage.route?.at(-1) : null;
    const endYaw = last ? Math.atan2(rig.camera.position.x - last.x, rig.camera.position.z - last.z) : null;
    hero.startMoment(act.kind, { ms: act.ms, ...stage, endYaw });
    world.spotPoke(spot, act, hero.position);
    sfx.cue(act.kind === 'door' ? 'knock' : 'cue');
    hud.setContext(null, null);
    hud.announce(`${act.verb}: ${act.word}`);
  }
  // v0.31 (Tiffany's "Edits #5": "Ending animation to last the duration of the song 'I gave it to
  // the world' have the action be just stealing the drawing, then don't even have an Easter egg, just
  // have the song play from the beginning as the blond farmer girl take the drawings and run all over
  // the whole farm"): at its red circle she holds her drawing out, the farmer snatches it, and the
  // song is hers at once (no bird, no egg): it starts from its top as the drawing is taken, and the
  // scene (world/giveaway.js) lasts the song. The world waits, as in the finale; Skip ends it.
  function startGiveaway(spot) {
    const id = eggsAt(spot, data.discoveries)[0] ?? LAST_SONG;
    ix.reset(); input.release(); hero.halt(); hero.cancelMoment?.();
    const face = world.spotFacing(spot, hero.position, rig.camera);
    if (face !== null) { hero.yaw = face; hero.yawTarget = face; hero.view.rotation.y = face; }
    hud.setContext(null, null);
    data.discoveries = { ...data.discoveries, [id]: { ...found(data.ledger), giveaway: true } };
    persist(); // found for good before it is shown
    giveawaySong = { id, started: false };
    if (audio.settings.soundEnabled) songs.prepare({ id, src: mp3Path(id), from: 0 });
    loop.pause('giveaway');
    document.body.classList.add('finale', 'giveaway');
    $('btn-skip').hidden = false;
    $('btn-skip').focus({ preventScroll: true });
    rig.zoomPx = CameraRig.gameplayPx(view.w, view.h) * (view.w < view.h ? 0.62 : 0.9);
    // (nothing of the hunt on the grass while it plays: the circles, the ring, the markers)
    world.updateEggSpots([], 1e4); world.updateEggCircle(null, 1e4); world.updateSpotProps([], false);
    world.updateMarker(1e4, null, true); world.updateGoalMarkers([], 1e4, []);
    giveaway.start(hero.position.clone().setY(0), { songMs: GIVEAWAY.songMs, camera: rig.camera });
    sfx.cue('cue');
    hud.announce(`${spotAct(spot).verb}. Another farmer runs in and takes the drawing, and “${songTitle(id)}” begins.`);
  }
  // each frame while it runs (the render step: the world waits)
  function stepGiveaway(dt) {
    if (!giveaway.active) return;
    tweens.update(dt); // (the world step waits, and the copies' flights, the words and the puffs run on its tweens)
    giveaway.update(dt);
    // (v0.32, Tiffany's "Edits #6": "start playing the song sooner! At the VERY beginning of the action is
    // when the song starts": on the scene's first frame, as the farmer runs in; v0.31: as she took it)
    if (giveawaySong && !giveawaySong.started) {
      giveawaySong.started = true;
      const id = giveawaySong.id;
      if (audio.settings.soundEnabled && songsHere !== false) songs.play({ id, src: mp3Path(id), title: songTitle(id), from: 0 });
      hud.announce(`Song found: ${songTitle(id)}`);
    }
    if (!giveaway.active) endGiveaway();
  }
  function endGiveaway() {
    if (giveaway.active) giveaway.end();
    document.body.classList.remove('finale', 'giveaway');
    $('btn-skip').hidden = true;
    rig.zoomPx = undefined;
    const p = hero.view.position;
    hero.place(p.x, p.z);
    loop.resume('giveaway');
    if (giveawaySong) {
      const id = giveawaySong.id;
      if (!giveawaySong.started && audio.settings.soundEnabled && songsHere !== false) songs.play({ id, src: mp3Path(id), title: songTitle(id), from: 0 });
      hud.toast(`Song found: “${songTitle(id)}”. Every song is in your songbook.`, 4200);
      giveawaySong = null;
      hunt.restMs = HUNT.restMs; // (v0.32: its keepsake comes out as she explores on, the song playing)
    }
    // (v0.32: the farmer is gone off the farm; Vanessa explores on with the song playing, and its bar's ×
    // stops it; v0.31 ended with the last copy in her hands, held up)
    // v0.33 (the ending as adopted, Tiffany's "Edits #7": "Give me a recommendation of how to end the game
    // when she runs away"): Vanessa stops, laughs and dusts herself off; then (everything found) she walks
    // back to the bench and sits beside Dwight, the colour floods in all at once (the sunset, below), and
    // the story and the slideshow are offered, the song playing on until the player moves on
    if (!reducedMotion()) { hero.halt(); hero.startMoment('dust', { ms: 3400 }); }
    menuButton().focus({ preventScroll: true });
  }
  const CHIMNEY_TOP = 0.5; // v0.29: where in "Climb to the chimney" she is up by it
  function bringEgg(id, { roof = false } = {}) {
    // the egg lands a step from her, on the camera's side, clear of the farm's footprints
    // (v0.29: or on the roof right beside her, up by the chimney)
    // (v0.30: on the grass clear of the red circles, which stay out now)
    const at = roof ? hero.position.clone().add(new THREE.Vector3(0.28, 0, 0.12)) : world.eggSpot(hero.position, circleAvoid(), onPlayScreen); // (v0.33: never behind anything)
    const y = roof ? hero.position.y + 0.05 : 0;
    hunt.busy = true;
    hunt.id = id;
    // its song is loaded by the time the egg is picked up (not over a song that is playing)
    if (audio.settings.soundEnabled) songs.prepare({ id, src: mp3Path(id), from: previewStart(id) });
    hud.announce(`A bird is coming from ${SPOTS[songSpot(id)].label}`);
    world.eggDrop(at, hunt.eggs++, { y }).then((egg) => { sfx.cue('eggDrop'); hunt.egg = egg; hunt.busy = false; });
  }
  function pickEgg() {
    const id = hunt.id;
    const egg = hunt.egg;
    hunt.egg = null; hunt.id = null; hunt.restMs = HUNT.restMs;
    // v0.29: picked up on the roof: now she climbs down
    if (hunt.moment?.eggAsked) { hunt.moment = null; if (hero.moment?.kind === 'chimney') hero.moment.freezeAt = null; }
    data.discoveries = { ...data.discoveries, [id]: { ...found(data.ledger), egg: true } };
    persist(); // found for good before it is shown (spec §8: discovery state first)
    sfx.cue('crack');
    // v0.22: the song itself answers the crack. It starts at its preview's first second and plays
    // on to its end, in place of the theme; the bar above the controls pauses, moves or stops it.
    // With Sound off nothing starts (the card and the songbook still have it).
    const sounding = audio.settings.soundEnabled && songsHere !== false;
    if (sounding) songs.play({ id, src: mp3Path(id), title: songTitle(id), from: previewStart(id) });
    world.popEgg(egg).then(() => { if (!sounding) sfx.cue('complete'); });
    hud.announce(`Song found: ${songTitle(id)}`);
    // v0.17 (§5): every song found: the collection's paper stamp
    if (foundCount(data.discoveries) === songsFor().length) setTimeout(() => hud.toast(`Every song found! All ${songsFor().length} are in your songbook, stamped.`, 5200), 1500);
    setTimeout(() => songCard(id), reducedMotion() ? 200 : 700);
  }
  // are this build's song files here (tools/make-songs.mjs); asked once (the promise), and kept
  // as a plain fact once known (`songsHere`: null until then)
  let songsHere = null;
  let songsAsked = null;
  const songFilesHere = () => (songsAsked ??= fetch(mp3Path(songsFor()[0]), { method: 'HEAD' }).then((r) => r.ok).catch(() => false).then((ok) => (songsHere = ok)));
  // v0.22 (Tiffany: "The only option should be lovely when you get a song"): the found card is the
  // song's title, a line of its words and where the bird brought it from, over the song already
  // playing. Lovely closes it and the song plays on. Only if the browser refused to start the
  // song with no tap does the card offer to play it (that tap is all it needs).
  async function songCard(id) {
    if (cards.isOpen || !session.playing) { setTimeout(() => songCard(id), 800); return; }
    const available = await songFilesHere();
    input.release();
    hero.halt();
    loop.pause('card');
    const n = foundCount(data.discoveries);
    const all = songsFor().length;
    cards.song({
      title: `♪ Song found: “${songTitle(id)}”`,
      lyric: songLyric(id), // v0.20 (audit 4): a line of its own words
      text: `A bird brought it from ${SPOTS[songSpot(id)].label}. ${n} of ${all} songs found.`,
      id, songTitle: songTitle(id), src: mp3Path(id), from: previewStart(id), available,
      onClose: () => { loop.resume('card'); },
    });
  }
  // The songbook. v0.23 (Tiffany: "Even before she collects the songs, allow all of them to appear
  // and be downloaded under the extras page"): all of them (v0.29: 23), in her order, each with Play, Download MP3
  // and its Suno page, whether it has been found on the farm or not; a found one carries a small
  // mark. (v0.22 listed only the songs found.) `fromPlay`: opened from the HUD's songs counter,
  // so the world waits behind it.
  async function openSongbook({ fromPlay = false } = {}) {
    const available = await songFilesHere();
    if (fromPlay) { if (cards.isOpen || loop.paused) return; input.release(); hero.halt(); loop.pause('card'); }
    const mine = foundSongs(data.discoveries);
    const list = songsFor();
    const all = list.length;
    const intro = mine.length === all ? 'Every song, found. Play one here, or download it to keep.'
      : `All ${all} songs are here to play and to download. The ones with a mark you have found on the farm.`;
    cards.songbook({
      title: `Songs · ${mine.length} of ${all} found`,
      intro,
      songs: list.map((id) => ({ id, number: songNumber(id), title: `${String(songNumber(id)).padStart(2, '0')} · ${songTitle(id)}`, playTitle: songTitle(id), lyric: songLyric(id), src: mp3Path(id), download: mp3Name(id), suno: sunoLink(id), found: !!data.discoveries?.[id] })),
      stamp: mine.length === all ? `All ${all} songs found` : '',
      left: '',
      available,
      ...(fromPlay ? { onClose: () => loop.resume('card') } : {}),
    });
  }

  // ---------- v0.16: what the archer says when he is hired ----------
  // (v0.27: a line may have parts said in much smaller letters, data.js DWIGHT_THANKS; `scene`: the
  // sunset's own line, the only one shown while that scene plays)
  const speech = { el: $('speech'), until: 0, id: 'A1', scene: false };
  function archerSays(line, ms = 7000, id = 'A1', { scene = false } = {}) {
    speech.id = id;
    speech.scene = scene;
    speech.el.querySelector('.who').textContent = 'Archer';
    const parts = (typeof line === 'string' ? [line] : line).map((p) => {
      if (typeof p === 'string') return p;
      const small = document.createElement('span');
      small.className = 'aside';
      small.textContent = p.small;
      return small;
    });
    speech.el.querySelector('.text').replaceChildren('“', ...parts, '”');
    speech.el.hidden = false;
    speech.until = performance.now() + ms;
    hud.announce(`The archer: ${lineText(line)}`);
  }
  // v0.23 (Tiffany: "If Dwight has a speech bubble don't let it block the birds, and make it have
  // the pointy part pointing towards him"): the bubble stands beside his head with a pointed tail
  // whose tip is at his head, on whichever side keeps it off the birds (the flock in the sky and
  // the bird he has just sent off): ui/bubble.js decides, here it is measured and placed.
  const toScreen = (v) => ({ x: ((v.x + 1) / 2) * view.w, y: ((1 - v.y) / 2) * view.h, front: v.z < 1 });
  function placeSpeech() {
    if (speech.el.hidden) return;
    if (performance.now() > speech.until || !world.archers?.[speech.id]?.root.visible || rig.mode === 'whole' || finale.active || (sunset.active && !speech.scene)) { speech.el.hidden = true; return; }
    const head = toScreen(world.archerHead(tmpP, speech.id).project(rig.camera));
    const avoid = [];
    const flock = world.objects.D21;
    if (flock) { const f = toScreen(tmpP.copy(flock.position).project(rig.camera)); if (f.front) avoid.push({ x: f.x, y: f.y, r: Math.max(70, view.w * 0.09) }); }
    const bp = world.birdPos(tmpP);
    if (bp) { const b = toScreen(bp.project(rig.camera)); if (b.front) avoid.push({ x: b.x, y: b.y, r: 46 }); }
    // (nor Vanessa herself)
    { const v = toScreen(tmpP.copy(hero.position).setY(hero.position.y + 1).project(rig.camera)); if (v.front) avoid.push({ x: v.x, y: v.y, r: 44 }); }
    const w = speech.el.offsetWidth || 260; const h = speech.el.offsetHeight || 70;
    // (in the sunset there is no HUD: the bubble has the screen down to the signature's line)
    // (v0.31: and above the song's bar while it is up: no words behind it)
    const npTop = $('now-playing').hidden ? Infinity : $('now-playing').getBoundingClientRect().top - 6;
    const area = sunset.active ? { left: 0, right: view.w, top: 0, bottom: signTop() } : { left: 0, right: view.w, top: live.playTop || live.hudBottom, bottom: Math.min(live.ctlTop || view.h, npTop) };
    const at = bubblePlace(head, { w, h }, area, avoid);
    speech.el.style.transform = `translate(${at.left.toFixed(1)}px, ${at.top.toFixed(1)}px)`;
    speech.el.dataset.tail = at.side;
    speech.el.style.setProperty('--tail', `${at.tail.toFixed(0)}px`);
  }

  // ---------- v0.17: the birds (spec §7; game/birds.js decides, the ledger takes) ----------
  // Session-only: the visit's clock is not saved (the kinds' rotation and every take are).
  const birds = createBirds();
  const waveBtn = $('btn-wave');
  const birdAt = new THREE.Vector3();
  let cleaning = null; // { ms } while she wipes the bench, standing still
  let quietClean = false; // v0.33
  const benchSpot = () => world.benchSeat(new THREE.Vector3());
  function birdCtx(heroXZ) {
    const l = data.ledger;
    return {
      l,
      hero: heroXZ,
      nodePos: (id) => world.stations[id]?.pos,
      bench: (() => { const b = benchSpot(); return { x: b.x, z: b.z }; })(),
      // v0.31: the first table, where a bird goes for the crops set out (none during a sale)
      tablePos: world.stations.table ? { x: world.stations.table.pos.x, z: world.stations.table.pos.z } : null,
      saleOn: saleShowing || saleStarting,
      onScreen: (p) => onPlayScreen(p.x, p.z), // v0.32: the birds steal where she sees it
      perchAt: (kind) => world.perchPoint(kind), // v0.32: the roof's ridge, the old tree's crown
      // v0.32 (Tiffany's "Edits #6": "When it says clean the bench, there should have already been a bird
      // to visit and poop on it"): while the bench's red circle waits for its mess, a bird comes for it first
      want: inHunt() && spotsNow().includes('bench') && !l.theft.stain ? 'perch' : null,
      archers: world.archerPosts(l),
      calm: data.settings.helpMeFinish || data.settings.birdsNeverSteal,
      heroSafe: hammering.active || ctxTargets.some((x) => x.kind === 'table' && inReach(heroXZ, x, SALE_REACH_M)),
      blocked: saleShowing || hammering.active || finale.active || opening.active || cards.isOpen || rig.mode === 'whole' || !session.playing || !!hunt.egg || hunt.busy || !!hunt.moment,
    };
  }
  // the point the bird goes for this frame: the top of the plant, the bench seat, over her head
  function birdTarget(t) {
    if (!t) return null;
    if (t.kind === 'node' || t.kind === 'visit') return world.nodeTop(t.id, birdAt);
    if (t.kind === 'perch') return world.benchSeat(birdAt);
    if (t.kind === 'roof' || t.kind === 'treetop') return birdAt.copy(t.pos);
    if (t.kind === 'table') return birdAt.set(t.pos.x, 0.9, t.pos.z);
    return hero.stack.count ? hero.stack.topWorld(birdAt) : birdAt.copy(hero.position).setY(1.9);
  }
  function updateBirds(dt, heroXZ) {
    const acts = birds.update(dt, birdCtx(heroXZ));
    for (const act of acts) {
      switch (act.a) {
        case 'turn': commit({ t: 'birdTurn' }); break;
        // v0.20 (audit 3): a bird at a plant Dwight guards is his: no warning to act on, only its chirp
        // (v0.23: nor for a bird that only visits the finished farm: it takes nothing)
        // v0.33 (Tiffany's "Edits #7": "Why is it prompting her to wave so much?"): no red warning and
        // no Wave button: the chirp, and the words for a screen reader (v0.17-v0.32: "... Wave it off")
        case 'warn': if (!act.guarded && !act.harmless) hud.announce(act.text); sfx.cue('chirp'); break;
        case 'land': sfx.cue('chirp'); break;
        case 'draw': world.archerDraw(act.archer, act.at, BIRDS.drawMs); break;
        case 'shoot':
          world.archerShoot(act.archer, act.at).then(() => sfx.cue('thud'));
          sfx.cue('squawk');
          world.birdShoo();
          hud.announce(`The archer looses a warning arrow, and the bird flies off with nothing`);
          // v0.20: his tally for the completed menu, and now and then a deadpan word about it
          data.session.dwightDeterred = (data.session.dwightDeterred ?? 0) + 1;
          persist();
          { const line = dwightLine(data.session.dwightDeterred); if (line) archerSays(line, 3800, act.archer); }
          break;
        case 'take': {
          const r = commit(act.tx);
          // v0.22: it flies off with the crop in its claws, and a plant it took from stands bare
          if (r.ok) { const e = r.events.find((x) => x.type === 'stolen'); if (e) { world.birdCarry(e.res); if (e.src) world.stripPlant(e.src); sfx.cue('squawk'); } }
          break;
        }
        case 'stain': commit({ t: 'stain' }); break;
        case 'leave': if (act.why === 'wave') { world.birdShoo(); sfx.cue('squawk'); hud.announce('Shoo! The bird flies off with nothing'); } break;
        default:
      }
    }
    const st = birds.state;
    world.updateBird(dt, st, birdTarget(st.target));
    if (!waveBtn.hidden) waveBtn.hidden = true; // v0.33: no Wave button
    autoWave(dt, st);
  }
  // v0.33 (Tiffany's "Edits #7": "Have her automatically wave (no button) at birds when they're
  // flying by sometimes if she's not performing an action"): now and then, as a bird flies in or off
  // on her screen while she stands doing nothing, she turns to it and waves. A friendly wave: it does
  // not send the bird off (Dwight's arrow does that for the corn).
  const waveBy = { ms: 0, next: 9000 };
  function autoWave(dt, st) {
    waveBy.ms += dt;
    if (waveBy.ms < waveBy.next || !['warn', 'approach', 'leave'].includes(st.phase)) return;
    const idle = !hero.moving && !hero.moment && !hero.rise && !ix.working && !hammering.active && !roofClimb && !autoWalk && !cleaning && !houseVisit && !saleShowing && !hunt.moment && !hunt.egg && !cards.isOpen && !finale.active && !giveaway.active;
    const bp = idle && world.birdPos(tmpP);
    if (!bp || !world.onScreen(bp, rig.camera)) return;
    waveBy.ms = 0; waveBy.next = 14000 + Math.random() * 12000;
    if (Math.random() < 0.35) return; // sometimes, not every time
    hero.yawTarget = Math.atan2(bp.x - hero.body.position.x, bp.z - hero.body.position.z);
    hero.startMoment('wave', { ms: WAVE_MS + 400 });
    hud.announce('Vanessa waves at the bird');
  }
  // a free Wave (the Wave button, E / Space while a bird threatens, or a tap on the bird)
  // v0.29 (Tiffany: "When it says wave, give her a second to wave at the bird"): she turns to the
  // bird and waves at it for a second (birds.js WAVE_MS); then it flies off with nothing
  function doWave() {
    if (!birds.wave()) return;
    const bp = world.birdPos(tmpP);
    if (bp && !hero.moving && !hammering.active && !roofClimb) {
      ix.reset();
      hero.halt();
      hero.yawTarget = Math.atan2(bp.x - hero.body.position.x, bp.z - hero.body.position.z);
      hero.startMoment('wave', { ms: WAVE_MS + 200 });
    } else hero.celebrate(WAVE_MS);
    sfx.cue('cue');
    hud.announce('Vanessa waves at the bird');
    $('btn-wave').hidden = true;
  }
  $('btn-wave').onclick = doWave;
  // v0.33 (Tiffany's "Edits #7": "as a rule any time there is a … to finish a sentence you have to be
  // able to click on it"): a tap on any words cut short with "…" (a song's title on its bar) shows
  // them whole in a note. (The goal line is never cut short now; the game's own sentences no longer
  // end in "…".)
  document.addEventListener('click', (e) => {
    for (let el = e.target; el && el !== document.body; el = el.parentElement) {
      if (!(el instanceof HTMLElement) || el.scrollWidth <= el.clientWidth + 1) continue;
      if (getComputedStyle(el).textOverflow !== 'ellipsis') continue;
      hud.toast(el.textContent.trim(), 4200);
      return;
    }
  }, true);

  // ---------- v0.17b: the now-playing bar (ui/songplayer.js) ----------
  {
    const bar = $('now-playing');
    const range = bar.querySelector('input');
    const time = bar.querySelector('.np-time');
    const toggle = bar.querySelector('[data-act="toggle"]');
    let dragging = false;
    toggle.onclick = () => songs.toggle();
    bar.querySelector('[data-act="stop"]').onclick = () => { songs.stop(); menuButton().focus({ preventScroll: true }); };
    range.addEventListener('input', () => { dragging = true; time.textContent = `${fmtTime(Number(range.value))} / ${fmtTime(Number(range.max))}`; });
    range.addEventListener('change', () => { dragging = false; songs.seek(Number(range.value)); });
    // v0.30 (Tiffany: "Put a download button right next to the x on the box that is playing the
    // song"): the song's own MP3, under its number and title, as the songbook names it
    const dl = bar.querySelector('[data-act="download"]');
    songs.subscribe((st) => {
      bar.hidden = !st.id;
      // v0.31: the words that pop up near the bottom keep above the bar while it is up (styles.css)
      if (document.body.classList.contains('song-bar') !== !!st.id) {
        document.body.classList.toggle('song-bar', !!st.id);
        if (st.id) requestAnimationFrame(() => document.documentElement.style.setProperty('--np-h', `${Math.round(bar.getBoundingClientRect().height || 64)}px`));
      }
      if (!st.id) return;
      if (dl.dataset.id !== st.id && hasSong(st.id)) { dl.dataset.id = st.id; dl.href = mp3Path(st.id); dl.download = mp3Name(st.id); dl.setAttribute('aria-label', `Download “${songTitle(st.id)}”`); }
      bar.querySelector('.np-title').textContent = `♪ ${st.title}`;
      toggle.firstElementChild.textContent = st.playing ? '❚❚' : '▶';
      toggle.setAttribute('aria-label', st.playing ? 'Pause the song' : 'Play the song');
      if (st.duration) range.max = String(st.duration);
      if (!dragging) { range.value = String(st.t); time.textContent = st.error ? 'Could not play' : `${fmtTime(st.t)} / ${fmtTime(st.duration)}`; }
    });
  }
  // ---------- v0.17: the Who-Knows plant says hello (spec §10.5) ----------
  // Once per save, the first time she comes within 3 of her collision diameters (1.8 m) of it,
  // while no card, bird, build or sale is under way: no input lock, no camera move, no sound of a
  // song, no discovery. When she idles 4 s beside it she glances at it.
  const who = { idleMs: 0, glanced: false, far: false };
  function updateWhoKnows(dt, heroXZ) {
    const p = world.whoKnowsPos(tmpH);
    if (!p) return;
    const d = Math.hypot(p.x - heroXZ.x, p.z - heroXZ.z);
    world.updateWhoKnows(dt, { near: d < 2.4, happy: !!data.discoveries?.E25 });
    // she must come up to it: her start spot (D17) is beside the bed, so it waits until she has
    // walked away once and comes back
    if (d > 2.6) who.far = true;
    if (!data.session.whoKnowsHelloSeen && who.far && d < 1.8 && !birds.busy && !hammering.active && !saleShowing && !ix.working) {
      data.session.whoKnowsHelloSeen = true;
      persist();
      world.whoKnowsHello(hero.position);
      hud.announce('The Who-Knows plant gives a curious wiggle');
    }
    // the favourite spot: idling beside it, she glances at it (her soft smile is her idle face)
    const idle = d < 1.6 && !hero.moving && !ix.working && !hammering.active;
    who.idleMs = idle ? who.idleMs + dt : 0;
    if (!idle) who.glanced = false;
    if (who.idleMs >= 4000 && !who.glanced) { who.glanced = true; hero.yawTarget = Math.atan2(p.x - hero.body.position.x, p.z - hero.body.position.z); }
  }

  const CLEAN_STAND_M = 0.42; // v0.29: she stands this far in front of the stain to wipe it
  const CLEAN_STEP_MS = 400; // the step up to it, before the wiping
  // The bench stain: a visible cloth swipe clears it over BIRDS.cleanMs.
  // v0.31 (Tiffany's "Edits #5": "clean the bench at any time"): with no mess on it she wipes it all
  // the same, and it shines (`stain: false`)
  function updateCleaning(dt) {
    if (!cleaning) return;
    if (hero.moving || (cleaning.stain && !data.ledger.theft.stain)) { cleaning = null; hero.cancelMoment(); world.cleanBenchVisual(0); return; }
    cleaning.ms += dt;
    if (cleaning.stain) world.cleanBenchVisual(cleaning.ms / BIRDS.cleanMs);
    if (cleaning.ms >= BIRDS.cleanMs) {
      const had = cleaning.stain;
      cleaning = null;
      if (had) commit({ t: 'cleanBench' });
      else { sfx.cue('weed'); world.inkWord('Squeaky clean!', world.benchSeat().setY(1.2), { h: 0.4, ms: 1300 }); hud.announce('The bench shines'); }
    }
  }

  // (v0.24: the rake that has come to her hand for a weed the farm does not ask for, on the open
  // grass or on a patch not open yet, stays until that weed is raked: the ledger's "idle tool goes
  // back" waits)
  const rakingGrass = () => data.ledger.tool === 'rake' && !!ix.working && idleWeed(data.ledger, ix.working);
  function settleLedger() {
    for (let guard = 0, next = autoTxs(data.ledger); next.length && guard < 20; next = autoTxs(data.ledger), guard++) {
      // (v0.28: the crate is no follow-up any more; the tables fill from it as a sale starts and after it)
      // (v0.29: the crate's crops go onto the tables only once the buyers have gone)
      const tx = next.find((t) => !(t.t === 'returnTool' && rakingGrass()) && !(t.t === 'restock' && (saleShowing || saleStarting)));
      if (!tx || !commit(tx).ok) break;
    }
  }

  const stationPos = (id) => world.stations[id]?.pos.clone().setY(0.3) ?? hero.position.clone();
  const matTop = (id) => stationPos(id).setY(0.15);

  // Units travel through the stack over Vanessa's head (carry.js): source -> stack on a pick,
  // stack -> the yard pile on a drop, stack -> the yard-sale table on a stock (v0.12), and from
  // her head or the yard pile into the part on a DIY. A unit appears in its destination pile when
  // its flight lands (world.expect / world.landed).
  function present(tx, events) {
    const l = data.ledger;
    for (const e of events) {
      const cue = ledgerCue(e);
      if (cue) sfx.cue(cue);
      switch (e.type) {
        case 'picked': {
          const n = l.carried[e.res];
          // v0.29 (Tiffany: "The very first time something goes on your head it should explain where
          // to put it and highlight it"; "It never explained where to take the stones/wood OR
          // crop"): the first wood or stone, and the first crop, say where they go; the place has a
          // circle until she has taken them there once (carryLessons)
          // (v0.33, "Edits #7": "You could also mention that you always drop wood and stones there"; every
          // build now takes them from the pile only, ledger.js pileOnly; and the first stone is led there too)
          if (['W', 'R'].includes(e.res) && carryLessons(l).mat) {
            if (!notes.once('carry-mat', `Wood and stone always go to ${pileWords(l)}: walk through it to leave them there. A DIY counts only what is in that pile.`, 7000)) notes.once(`carry-${e.res}`, `${e.res === 'R' ? 'Stone' : 'Wood'} goes to ${pileWords(l)} too: walk through it to leave it there.`, 5000);
          }
          // v0.32 (Tiffany's "Edits #6": "prompt her early in the game explaining that in order to get
          // coins, she needs to have a yard sale"; "When it talks about the yardsale in the tutorial let
          // it say 'table' not 'tables' being full. Explain that extra crops can be stored in the storage
          // bin for later")
          if (['C', 'S', 'T'].includes(e.res) && carryLessons(l).crop) notes.once('carry-crop', `Coins come from yard sales. Crops go onto the yard-sale table by the path: walk past it to set them out, and when the table is full, tap Yard Sale. Extra crops can wait in the storage bin beside the table for later.`, 9000);
          hero.stack.receive(e.res, stationPos(e.src).setY(0.4), l.carried);
          world.pulse(e.src);
          hud.bump(e.res);
          hud.announce(`${cap(RESOURCE_NAMES[e.res])} ${n}`);
          break;
        }
        case 'full':
          // the cap is told at the refusal moment, never on the counter (captain, 2026-11-01)
          hud.announce(`${cap(RESOURCE_NAMES[e.res])} full`);
          // (v0.21: the note the first time for crops and for materials; after that the status pill says it)
          // (v0.25: only wood and stone fill up; a crop past her head's six goes into the crate)
          notes.once('full-mat', `${cap(RESOURCE_NAMES[e.res])} full: Vanessa carries ${CAPACITY} at most. Walk past ${pileWords(l)} to drop it.`, 3200);
          break;
        case 'headFull':
          // v0.25: her head is full of crops; told once, the first time (v0.28: twelve, and the next
          // pick waits until she has set them out or left them in the crate)
          // (v0.29: the crate is overflow only: the tables are where crops go)
          hud.announce(`${HEAD_CROPS} crops on her head: set them out on the yard-sale tables`);
          notes.once('headfull', HEAD_NOTE(), 5200);
          break;
        case 'stowed': {
          // v0.28: her crops come off the stack into the crate, one every 60 ms, as wood and stone
          // go onto the pile by the house
          let i = 0;
          const before = crateCount(l) - (e.n.C + e.n.S + e.n.T);
          const landings = [];
          for (const c of ['C', 'S', 'T']) {
            for (let k = 0; k < e.n[c]; k++, i++) {
              world.expect('crate', c);
              landings.push(hero.stack.send(c, world.crateSlotWorld(before + i), l.carried, i * 60).then(() => { world.landed('crate', c); if (k % 2 === 0) sfx.cue('pop'); }));
            }
          }
          crateLanding = Promise.all([crateLanding, ...landings]);
          const n = crateCount(l);
          // v0.29 (Tiffany: "Explain that she has no more space so they go in storage. And when the
          // crate is full she can't drop stuff off at all until the yardsale happens")
          if (e.first) notes.once('crate', CRATE_NOTE, 7000);
          if (e.full) hud.toast(`The crate is full: ${CRATE_CAP} crops. Nothing more can be dropped off until a yard sale empties the tables and the crate.`, 5200);
          hud.announce(`No room on the tables: ${i} into the storage crate. It holds ${n} of ${CRATE_CAP}`);
          break;
        }
        case 'restocked': {
          // v0.25: the tables fill up again from the crate, one crop every 70 ms, once whatever was
          // on its way into the crate has landed there
          // (v0.28: after a sale, and as one starts: Yard Sale fills the tables first, doYardSale)
          if (e.sale) break; // (the sale filled the tables itself: its goods are shown with the sale)
          const before = l.table.C + l.table.S + l.table.T - (e.n.C + e.n.S + e.n.T);
          const order = [];
          for (const c of ['T', 'S', 'C']) for (let k = 0; k < e.n[c]; k++) order.push(c);
          order.forEach((c) => world.expect('table', c));
          const total = order.length;
          restockLanding = crateLanding.then(() => Promise.all(order.map((c, i) => world.tweens.wait(i * 70)
            .then(() => world.flight(c, world.crateTopWorld(), world.tableSlotWorld(c, before + i), 300))
            .then(() => { world.landed('table', c); if (i % 2 === 0) sfx.cue('sell'); }))));
          const n = l.table.C + l.table.S + l.table.T;
          if (!saleStarting) hud.announce(n >= tableCap(l) ? `${total} from the crate: every table is full, time for a yard sale` : `${total} from the crate onto the table${tables(l) > 1 ? 's' : ''}: ${n} of ${tableCap(l)}`);
          else hud.announce(`Yard sale! ${total} from the crate onto the tables`);
          tellWish();
          break;
        }
        case 'weedCleared':
          hud.announce('Weeds cleared');
          break;
        case 'yardWeedSprouted':
          // v0.24: the weeds on the open grass stand from the start and grow straight back when
          // raked. That is news once, the first time one comes back; nothing depends on them.
          // (v0.23 told of each new one on the finished farm.)
          if (e.back) {
            notes.once('yardweed', 'The weeds on the open grass grow back after a while. Rake them if you like: they harm nothing.', 4600);
            hud.announce('The weed on the grass has grown back');
          }
          break;
        case 'ready':
          world.regrowCrop(e.src); // a crop a bird took is back on its plant (v0.23)
          // v0.33 (Tiffany's "Edits #7": "Make sure at some point you explain that you pick and sell the
          // sunflowers. The player might think they're just decorative"): as her first sunflowers bloom
          if (NODES[e.src]?.res === 'S' && !mainComplete(l)) notes.once('sunflowers', 'The sunflowers are a crop, like the corn: stand at a sunflower in bloom to pick it, then sell it at the yard sale. They fetch more coins than corn.', 7500);
          break;
        case 'cropChosen':
          // her first crop, for good: it themes every card and menu (P27-7)
          applyTheme(e.crop);
          hud.announce(`Your first crop: ${PATCH_NAME[e.crop]}`);
          // (v0.21: the news only; what to do next is the goal line's)
          hud.toast(`${cap(PATCH_NAME[e.crop])} it is! Your first patch is free.`, 3600);
          break;
        case 'firstHarvest':
          // (v0.32: the other patches open each in its turn; the first harvest is where the coins begin)
          break;
        case 'dropped': {
          // the load comes off her stack top first, one every 60 ms, into the pile (P27-1)
          let i = 0;
          for (const r of ['R', 'W']) {
            for (let k = 0; k < e.n[r]; k++, i++) {
              const slot = Math.min(e.yard[r] - e.n[r] + k, r === 'W' ? 23 : 17);
              world.expect('yard', r);
              hero.stack.send(r, world.yardSlotWorld(r, slot), l.carried, i * 60).then(() => { world.landed('yard', r); if (k % 3 === 0) sfx.cue(LAND_CUE[r]); });
            }
          }
          hud.bump('W'); hud.bump('R');
          hud.announce(`Left at the pile: ${l.yard.W} wood, ${l.yard.R} stone`);
          break;
        }
        case 'stocked': {
          // v0.12: her crops come off the stack onto the table's cloth, one every 80 ms
          let i = 0;
          const before = l.table.C + l.table.S + l.table.T - (e.n.C + e.n.S + e.n.T);
          for (const c of ['C', 'S', 'T']) {
            for (let k = 0; k < e.n[c]; k++, i++) {
              world.expect('table', c);
              const slot = before + i;
              hero.stack.send(c, world.tableSlotWorld(c, slot), l.carried, i * 80).then(() => { world.landed('table', c); sfx.cue('sell'); });
            }
          }
          const n = l.table.C + l.table.S + l.table.T;
          const cap6 = tableCap(l);
          hud.announce(n >= cap6 ? `${n} out: every table is full, time for a yard sale` : `On the table${tables(l) > 1 ? 's' : ''}: ${n} of ${cap6}`);
          // (v0.21: no note here: the Yard Sale button comes up with the hand on it)
          // v0.23 (audit 13): a neighbour's wish for this sale is news, told once as she begins to set out
          tellWish();
          break;
        }
        case 'yardSale': {
          // v0.12: the sign goes down, neighbours walk up and take the goods; a coin pops for each
          hud.announce(`Yard sale! Sold ${e.items.C + e.items.S + e.items.T} crops for ${e.coins} coins`);
          const order = [];
          for (const c of ['C', 'S', 'T']) for (let k = 0; k < e.items[c]; k++) order.push(c);
          saleShowing = true;
          if (e.moreTables) world.tableHold = true; // v0.29: the new table waits for the buyers to go
          const seq = saleSeq;
          saleWave(); // v0.29: she faces the front and waves to the neighbours
          world.yardSale(order, {
            sale: e.sale,
            tables: e.tables,
            wish: e.wish ?? null,
            // the tip: one more coin, from the buyer whose wish was on the tables
            onTip: (from) => { world.flight('coin', from, hero.position.clone().setY(1.2), 420).then(() => { sfx.cue('coin'); hud.bump('coins'); }); },
            onSign: () => sfx.cue('confirm'),
            onCoins: (res, from) => {
              world.flight('coin', from.clone().setY(from.y + 0.2), hero.position.clone().setY(1.2), 380).then(() => { sfx.cue('coin'); hud.bump('coins'); });
            },
          }).then(() => {
            if (seq !== saleSeq) return; // (a load or a new farm since)
            saleShowing = false;
            // v0.29 (Tiffany: "Give her more and more tables and space to fill up during the game as
            // her yardsales grows"): a table more after the 4th, 8th and 11th sale, set up as the
            // buyers go
            if (e.moreTables) {
              world.tableHold = false;
              world.sync(data.ledger, true); // the new table pops up in dust
              sfx.cue('thud');
              const n = e.moreTables;
              const nth = ['', 'first', 'second', 'third', 'fourth'][n] ?? 'new';
              if (!mainComplete(data.ledger)) hud.toast(`Your yard sale is growing: a ${nth} table! Fill ${n === 2 ? 'both' : `all ${n}`} for the next yard sale.`, 5200);
            }
            // v0.25: now the tables fill up again from the crate (v0.28: asked for here, the crate is
            // no follow-up of every change any more)
            if (restockReady(data.ledger)) commit({ t: 'restock' });
            settleLedger();
          });
          if (!data.session.firstSaleSeen) {
            data.session.firstSaleSeen = true;
            persist();
            hud.toast(`Yard sale! ${e.coins} coins. Coins, wood and stone build everything: the top line counts what is still missing.`, 5200);
          }
          break;
        }
        case 'stickFell':
          world.dropStick(e.src, rig.camera);
          break;
        case 'stickGone':
          world.fadeStick(e.src);
          break;
        case 'weedSprouted':
          hud.announce(`A weed is sprouting in the ${PATCH_NAME[NODES[e.node].res]}`);
          break;
        case 'weedGrows': {
          // the two warnings (spec v0.12 P28-4): a clump, then choking the plant
          // (v0.21: the goal line turns to the weed and the arrow points at it; the note told the
          // same thing a third time, so only the first weed of a session gets one, as news)
          const what = e.stage === 'clump' ? `Weeds in the ${PATCH_NAME[NODES[e.node].res]}: remove them before the plant wilts.` : `Weeds are choking a ${RESOURCE_UNIT[NODES[e.node].res]} plant! Remove them now.`;
          if (e.stage === 'clump') notes.once('weed', 'Weeds creep back over the crops. Left too long, the plant under them wilts.', 4200);
          hud.announce(what);
          break;
        }
        case 'wilted': {
          const what = RESOURCE_UNIT[NODES[e.id].res];
          world.wilt(e.id);
          hud.toast(`The weeds choked a ${what} plant: it is gone. Remove the weed, then replant the spot for free.`, 5200);
          hud.announce(`A ${what} plant wilted`);
          break;
        }
        case 'stolen': {
          // v0.17 (§7): the loss by the HUD, said politely. v0.22: from a plant the bird takes its
          // whole ripe crop, and the plant grows it again
          const unit = RESOURCE_UNIT[e.res];
          const what = e.from === 'carried' ? `−1 ${unit}: a bird took it from your head`
            : e.from === 'table' ? `A bird flew off with a ${unit} from the yard-sale table` // (v0.31)
              : `A bird flew off with ${e.n > 1 ? `${e.n} ${RESOURCE_NAMES[e.res]}` : `a ${unit}`}: that plant has to grow ${e.n > 1 ? 'them' : 'it'} again`;
          if (e.from === 'carried') hud.bump(e.res);
          // (v0.21: the loss each time; the advice once)
          // (v0.33: no Wave any more: "Birds steal ripe crops now and then", and the archer)
          if (!notes.once('stolen', `${what}. Birds steal ripe crops now and then; an archer, once hired, keeps them off the corn.`, 5200)) hud.toast(`${what}.`, 3000);
          hud.announce(e.from === 'carried' ? `A bird took one ${unit}` : e.from === 'table' ? `A bird took a ${unit} from the yard-sale table` : `A bird flew off with the ${PATCH_NAME[e.res]} from one plant`);
          break;
        }
        case 'stained':
          hud.toast('A bird left a mess on the bench.', 3000); // (v0.21: the bench's circle and its Clean button say the rest)
          hud.announce('A bird left a mess on the bench');
          break;
        case 'benchCleaned':
          if (quietClean) break; // (v0.33: a mess left from before the hunt, gone without a word)
          hud.announce('The bench is clean again');
          sfx.cue('weed');
          break;
        case 'toolTaken':
          hud.announce(`${cap(e.tool)} in hand`);
          break;
        case 'toolReturned':
          hud.announce(`The ${e.tool} goes back by the house`);
          break;
        case 'dug':
          // v0.32: early in the game, as her first crop goes in: where coins come from
          if (!data.ledger.harvested) notes.once('coins', 'To get coins, Vanessa holds a yard sale: she sells her crops to the neighbours at the yard-sale table.', 6000);
          world.revealDig(e.id, data.ledger);
          world.pulse(e.id);
          hud.announce(e.replanted ? 'Replanted: ready to harvest in a few seconds' : 'Planted: ready to harvest in a few seconds');
          break;
        case 'built': {
          // v0.12 DIY: what it takes flies in from her head, the yard pile and her purse
          const to = world.buildPoint(e.stage);
          const spot = (k) => to.clone().add(new THREE.Vector3((k % 3 - 1) * 0.15, 0.1, 0));
          let d = 0;
          for (const r of ['W', 'R']) {
            for (let k = 0; k < e.took.carried[r]; k++, d += 50) hero.stack.send(r, spot(k), l.carried, d).then(() => sfx.cue(LAND_CUE[r]));
            for (let k = 0; k < e.took.yard[r]; k++, d += 50) {
              const from = world.yardTopWorld(r, l.yard[r] + e.took.yard[r] - k - 1);
              world.tweens.wait(d).then(() => world.flight(r, from, spot(k), 520)).then(() => { if (k % 2 === 0) sfx.cue(LAND_CUE[r]); });
            }
          }
          for (let i = 0; i < Math.min(6, e.took.coins); i++) world.flight('coin', hero.position.clone().setY(1.2), to, 300 + i * 40).then(() => sfx.cue('coin'));
          if (e.took.coins) hud.bump('coins');
          if (e.took.carried.W + e.took.yard.W) hud.bump('W');
          if (e.took.carried.R + e.took.yard.R) hud.bump('R');
          break;
        }
        case 'committed': {
          const s = STAGES[e.stage];
          // v0.20: the finished farm's day starts now (game/evening.js); kept in the save
          // v0.23: the farm is finished when every stage is built (the chimney, on a new farm)
          const finishing = mainComplete(data.ledger);
          if (finishing) { data.session.finishedAt = data.ledger.activeMs; persist(); finaleDue = true; }
          const first = BASE_STAGE[data.ledger.crop] === e.stage;
          const hammered = HAMMERED.includes(e.stage) && !!world.stations[e.stage];
          // v0.23 (Tiffany: "When she builds the chimney have her clime onto the roof first")
          // v0.29 (Tiffany: "Have her climb to make the roof just like she climbs to build the chimney")
          const climbs = hammered && (e.stage === 'H4' || e.stage === 'H3') && !reducedMotion();
          if (hammered) startBuilding(e.stage, { climbs });
          else hero.celebrate(1200);
          hud.announce(HAMMERED.includes(e.stage) ? `DIY time! Vanessa builds the ${s.label}.` : `${cap(s.label)} saved`);
          // v0.23 (design audit 8, "a beat after each build"): the goal line holds a pencilled
          // "✓ Walls!" before it names the next need
          // (while she hammers the line names what she is building; the beat comes as it stands)
          holdGoal({ text: `${cap(s.label)}: done!`, line: { icon: 'check', label: `${SHORT_LABEL[e.stage] ?? cap(s.label)}!`, done: true } }, BEAT_MS,
            hammered ? { goal: { text: `DIY time! Vanessa builds the ${s.label}.`, line: { icon: 'hammer', label: 'DIY time!', tail: PLACE_LABEL[e.stage] ?? cap(s.label) } }, ms: (climbs ? ROOF.upMs : Hammering.leadMs(reducedMotion())) + s.workMs } : null);
          // the part goes together once she has hopped to it (v0.12)
          const lead = hammered ? (climbs ? ROOF.upMs : Hammering.leadMs(reducedMotion())) : 0;
          if (lead) world.holdReveal(e.stage, data.ledger);
          // v0.13 (P29-5): a house stage brings one more yard-sale table, set up as its DIY ends
          // (v0.23: the bench brings the second and the walls the third: data.js TABLE_STAGES)
          // (v0.30: with the builds again: data.js TABLE_BUILDS)
          const moreTables = tables(data.ledger) > Math.max(1, world.tablesShown ?? 1);
          if (moreTables) world.tableHold = true;
          world.tweens.wait(lead).then(() => world.reveal(e.stage, s.workMs, data.ledger)).then(async () => {
            sfx.cue('complete');
            // (v0.21: the news is the table; the digging is the goal line's)
            if (s.crop && first) hud.toast('The yard-sale table is set up by the path.', 3800);
            if (s.hire) { world.archerReset(e.stage); archerSays(ARCHER_LINES[0], 7000, e.stage); } // v0.16: he arrives at his post and says his line
            if (moreTables) {
              world.tableHold = false;
              world.sync(data.ledger, true); // the new table pops up in dust
              sfx.cue('thud');
              const n = tables(data.ledger);
              const nth = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'][n] ?? 'new';
              if (!finishing) hud.toast(`More neighbours are coming: a ${nth} yard-sale table. Fill ${n === 2 ? 'both' : `all ${n}`} for a yard sale: the next builds cost more.`, 5200);
            }
            // v0.23 (audit 8): each house stage has its small ink moment (world.js houseMoment);
            // at the walls she waves through where the window will be
            if (HOUSE_STAGES.includes(e.stage) && session.playing && !finale.active) {
              if (e.stage === 'H2' && !hero.moving && !hammering.active) {
                const st = world.spotStage('window', hero.position);
                hero.yawTarget = world.spotFacing('window', hero.position, rig.camera) ?? hero.yaw;
                hero.startMoment('hello', { ms: 1900, ...st });
              }
              const moment = world.houseMoment(e.stage);
              if (finishing) await Promise.race([moment, world.tweens.wait(2600)]); // the heart, then the finale
            }
            if (finishing) {
              // she is down from the roof before the drawing takes its colour
              for (let waited = 0; roofClimb && waited < ROOF.downMs + 400; waited += 100) await world.tweens.wait(100);
              finishRace();
              finale.start(); // the last build is saved; last, the drawing gets its colour (P25-2)
            }
          });
          break;
        }
        default:
      }
    }
  }

  const ix = createInteraction({ getLedger, commit });

  // ---------- she builds it herself (spec v0.11 §10.10, P27-3; v0.12 DIY time) ----------
  // The stage is committed and saved already; this is presentation. The rake or shovel goes back
  // to its lean first, she hops toward the part (dust where she lands), the hammer comes out of
  // her pocket and she strikes it in a big comic way while it goes together in ink (dust, ticks
  // and swoosh lines at each blow, the part jolting), the burst pops up at the first strike, and
  // moving away stops her.
  // v0.23 (Tiffany: "When she builds the chimney have her clime onto the roof first"): for the
  // chimney she goes round to the house's left wall, climbs it and the roof (ROOF.upMs), hammers
  // the chimney up from there, and climbs down again (`climbs`; hero.js moment 'roof'). Walking
  // off calls her down at once; the build is saved either way.
  const ROOF = { upMs: 1700, downMs: 1100 };
  const BEAT_MS = 1500; // audit 8: how long the goal line holds "✓ Walls!" after the build
  let roofClimb = null; // { stage } while she is on her way up, on the roof, or coming down
  function startBuilding(stage, { climbs = false } = {}) {
    if (hammering.active) hammering.stop();
    ix.reset();
    world.showHeldTool(false);
    const ms = STAGES[stage].workMs;
    if (climbs) {
      const total = ROOF.upMs + ms + ROOF.downMs;
      const roof = stage === 'H3'; // v0.29: the roof, from the top of the left wall
      const mine = (roofClimb = { stage, point: () => (roof ? world.roofPoint(tmpS) : world.chimneyPoint(tmpS)) });
      hero.halt();
      hero.startMoment('roof', { ms: total, route: roof ? world.roofBuildRoute() : world.roofRoute(), up: ROOF.upMs / total, down: ROOF.downMs / total });
      world.tweens.wait(ROOF.upMs).then(() => {
        if (roofClimb !== mine || hero.moment?.kind !== 'roof') return;
        hammering.start(stage, ms, null); // no hop: she is up on the house
        hammering.faceTo = roof ? world.roofPoint() : world.chimneyPoint();
      });
      world.tweens.wait(total + 50).then(() => { if (roofClimb === mine) roofClimb = null; });
      return;
    }
    const at = world.buildPoint(stage);
    hammering.start(stage, ms, { x: at.x, z: at.z });
    hammering.faceTo = at;
    hero.yawTarget = Math.atan2(at.x - hero.body.position.x, at.z - hero.body.position.z);
  }
  // audit 8: the goal line's beat after a build ("✓ Walls!"), held for `ms` of play
  let goalBeat = null; // { goal, ms, then? }: `then` follows when `ms` of play has passed
  function holdGoal(goal, ms, first = null) { goalBeat = first ? { ...first, then: { goal, ms } } : { goal, ms }; }
  // audit 13: a neighbour's wish for the sale that is next, told once
  let wishTold = -1;
  function tellWish() {
    const w = saleWish(data.ledger);
    if (!w || wishTold === data.ledger.sales) return;
    wishTold = data.ledger.sales;
    // v0.29: the note is on the table (world.setWishTag), and this says where it came from
    hud.toast(`A neighbour left a note on the yard-sale table: “${wishWords(w)}” Have them out at the next yard sale for a tip.`, 7500);
  }
  // v0.29: the wish's note over the first table, while the sale it is for is still to come
  const WISH_TAG = { C: 'corn', S: 'sunflowers', T: 'tomatoes' };
  function showWishTag() {
    const w = saleWish(data.ledger);
    const show = w && session.playing && !saleShowing && !mainComplete(data.ledger) && wishTold === data.ledger.sales && !finale.active && !sunset.active && rig.mode !== 'whole' && !world.playHidden;
    world.setWishTag(show ? `Wanted: ${w.n} ${WISH_TAG[w.crop]}` : null);
  }
  hammering.onLand = (p) => { sfx.cue('thud'); world.puff(new THREE.Vector3(p.x, 0, p.z), { scale: 1.1 }); };
  hammering.onStrike = (i) => {
    sfx.cue('tock');
    if (roofClimb) { // on the roof: the ticks and the dust are at the chimney itself
      if (i === 0) { tmpP.copy(hero.position).project(rig.camera); burst.show(tmpP.x < 0 ? -1 : 1); }
      const top = roofClimb.point();
      if (roofClimb.stage === 'H3') world.strikePart('H3', i);
      world.puff(top.clone(), { scale: 0.7 + 0.2 * i, seed: i });
      const hit = top.clone().project(rig.camera);
      burst.tick({ x: ((hit.x + 1) / 2) * view.w, y: ((1 - hit.y) / 2) * view.h }, reducedMotion());
      return;
    }
    if (i === 0) {
      // beside her, on the side away from the screen's centre
      tmpP.copy(hero.position).project(rig.camera);
      burst.show(tmpP.x < 0 ? -1 : 1);
    }
    const st = hammering.stage;
    world.strikePart(st, i);
    const hit = world.buildPoint(st).project(rig.camera);
    burst.tick({ x: ((hit.x + 1) / 2) * view.w, y: ((1 - hit.y) / 2) * view.h }, reducedMotion());
  };
  hammering.onEnd = () => { world.showHeldTool(true); };

  // v0.12: DIY at the site she stands at, once she has everything; the Yard Sale once the table
  // is full and she is at it (the button, E / Space, or a tap on the stand; spec v0.12 P28-1: out
  // of reach the button says to go to the table, and the arrow points there)
  // v0.13 DIY hint: the button shows as soon as she has everything; pressed away from the part it
  // shows the way at once (the arrow and the sparkle)
  const diyHint = createDiyHint();
  let diyState = { stage: null, pulse: false, point: false };
  // v0.32 (Tiffany's "Edits #6": "When it's time to diy, don't make her move to a spot, just hit the
  // button and she runs over there to build it"): pressed anywhere, DIY sends her running to the
  // build's spot, round the house, the tree and the bench, and she builds it as she gets there. The
  // stick takes her back (no build). (v0.13-v0.31: away from the part it pointed the way.)
  function diyAway(bar) {
    if (autoWalk?.stage === bar.stage) return;
    const to = world.standPoint(bar.stage, new THREE.Vector3());
    const from = { x: hero.body.position.x, z: hero.body.position.z };
    const plan = planWalk(from, { x: to.x, z: to.z }, obstaclesOf(world, hero), 40, Infinity);
    ix.reset();
    hero.cancelMoment?.();
    autoWalk = { points: plan.pts.slice(1).map((q) => new THREE.Vector3(q.x, 0, q.z)), i: 0, ms: 0, stage: bar.stage, speed: 1 };
    hud.announce(`Vanessa runs to the ${bar.label} to build it`);
  }
  function doDiy(stage) {
    const r = commit({ t: 'build', stage });
    if (r.ok) sfx.cue('confirm');
    else hud.toast(r.reason === 'short' ? 'Not everything is here yet.' : 'This cannot be built yet.');
  }
  let saleShowing = false;
  let crateLanding = Promise.resolve(); // v0.25: the crops still flying into the crate (a restock waits for them)
  let restockLanding = Promise.resolve(); // v0.28: the crops flying from the crate onto the tables
  let saleStarting = false; // v0.28: Yard Sale was pressed and the tables are filling from the crate
  let saleSeq = 0; // v0.28: counts the farms loaded: a sale's show that outlives its farm does nothing
  // v0.28: the note the first time her head is full of crops
  // v0.29: the crate is overflow storage, there only while every table is full
  const HEAD_NOTE = () => `Vanessa carries ${HEAD_CROPS} crops at most. Walk past a yard-sale table to set them out; when ${tables(data.ledger) > 1 ? 'every table is' : 'the table is'} full, tap Yard Sale.`;
  const CRATE_NOTE = `No more space on the table, so the extra crops go into the storage bin beside it, for later: it holds ${CRATE_CAP}. When it is full nothing more can be dropped off until a yard sale empties it.`;
  let finaleDue = false; // the home is built and its finale has not played yet (it follows the DIY)
  // v0.15: she sells from behind the tables, their north side (interaction.js atSellingSide)
  function atTheTable() {
    const hp = { x: hero.body.position.x, z: hero.body.position.z };
    return atSellingSide(hp, ctxTargets);
  }
  // v0.33: she stands behind the middle of the row of tables
  function atSaleMiddle() {
    const m = world.sellSpot(new THREE.Vector3(), tables(data.ledger));
    return Math.hypot(m.x - hero.body.position.x, m.z - hero.body.position.z) < 0.6;
  }
  // v0.29 (Tiffany: "When the yardsale button goes on she should be able to select it no matter
  // where she's standing and it show her walking back to the table and then the sign goes up"):
  // pressed away from the tables, she walks back round them to her place behind the first one,
  // and the sale starts as she gets there. Pushing the stick takes her back (no sale).
  let autoWalk = null; // { points: [Vector3], i, ms } while she walks back to the tables
  const AUTO_WALK = { speed: 0.62, near: 0.28, maxMs: 16000 };
  function salePath() {
    const sell = world.sellSpot(new THREE.Vector3(), tables(data.ledger)); // (v0.33: the middle of the row)
    const p = hero.body.position;
    const row = world.tableStations().slice(0, tables(data.ledger));
    const xs = row.map((t) => t.pos.x);
    if (world.stations.crate?.obj.visible) xs.push(world.stations.crate.pos.x);
    const z = row[0].pos.z;
    const minX = Math.min(...xs) - 0.95;
    const maxX = Math.max(...xs) + 0.95;
    const pts = [];
    // in front of the row (the buyers' side) and within its length: round its nearer end first
    // (v0.33: from anywhere on that side, now that she goes to the row's middle, behind it)
    if (p.z > z - 0.35) {
      const endX = Math.abs(p.x - minX) <= Math.abs(p.x - maxX) ? minX : maxX;
      pts.push(new THREE.Vector3(endX, 0, z + 0.7), new THREE.Vector3(endX, 0, z - 0.9));
    }
    pts.push(sell);
    return pts;
  }
  function walkToSale() {
    ix.reset();
    hero.cancelMoment?.();
    autoWalk = { points: salePath(), i: 0, ms: 0 };
    hud.announce('Vanessa walks back to the yard-sale tables');
  }
  // her steer this frame while she walks back (null when she is not, or has arrived)
  const autoSteer = new THREE.Vector2();
  function stepAutoWalk(dt, stick) {
    if (!autoWalk) return null;
    // (v0.32: or to the next build's spot, for its DIY: `stage`)
    const diyWalk = !!autoWalk.stage;
    if (stick.x * stick.x + stick.y * stick.y > 1e-4 || cards.isOpen || (diyWalk ? nextStage(data.ledger) !== autoWalk.stage || hammering.active || !hud.diyShown : !saleReady(data.ledger) || saleShowing)) { autoWalk = null; return null; } // she took over
    autoWalk.ms += dt;
    const p = hero.body.position;
    if (diyWalk) {
      const bar = buildBarAt(data.ledger, { x: p.x, z: p.z }, ctxTargets);
      if ((bar?.here && bar.stage === autoWalk.stage) || autoWalk.ms > AUTO_WALK.maxMs) {
        const stage = autoWalk.stage;
        autoWalk = null; hero.halt();
        if (bar?.here && bar.ready) doDiy(stage);
        return null;
      }
    } else if ((atTheTable() && atSaleMiddle()) || autoWalk.ms > AUTO_WALK.maxMs) { autoWalk = null; hero.halt(); if (atTheTable()) doYardSale({ here: true }); return null; }
    let to = autoWalk.points[autoWalk.i];
    while (Math.hypot(to.x - p.x, to.z - p.z) < AUTO_WALK.near && autoWalk.i < autoWalk.points.length - 1) to = autoWalk.points[++autoWalk.i];
    const dx = to.x - p.x; const dz = to.z - p.z; const d = Math.hypot(dx, dz);
    if (d < 0.05) return autoSteer.set(0, 0);
    return autoSteer.set(dx / d, -dz / d).multiplyScalar(autoWalk.speed ?? AUTO_WALK.speed);
  }
  // v0.29 (Tiffany: "During the yardsale have her facing the front and waving to people"): as the
  // buyers come she turns to the front and waves to them
  const SALE_WAVE_MS = 3400;
  function saleWave() {
    if (hero.moving || hammering.active || roofClimb) return;
    hero.halt();
    const cam = rig.camera.position;
    const yaw = Math.atan2(cam.x - hero.body.position.x, cam.z - hero.body.position.z);
    hero.yaw = yaw; hero.yawTarget = yaw;
    hero.startMoment('wave', { ms: SALE_WAVE_MS });
  }
  function doYardSale({ here = false } = {}) {
    if (saleShowing || !saleReady(data.ledger)) return;
    // (v0.33, Tiffany's "Edits #7": she runs to the middle of the row first, so the crowd is all in view)
    if (!here && (!atTheTable() || !atSaleMiddle())) { walkToSale(); return; }
    // v0.28 (the captain: "when you do the yard sale it automatically grabs fruit from the box"):
    // what the tables still lack comes from the crate first, the crops flying over to them, and the
    // buyers come once they are out. Nothing else can be sold or set out meanwhile (`saleShowing`).
    if (!tableFull(data.ledger)) {
      const seq = saleSeq;
      saleStarting = true;
      const r = commit({ t: 'restock' });
      saleStarting = false;
      if (r.ok) {
        saleShowing = true;
        restockLanding.then(() => world.tweens.wait(220)).then(() => {
          if (seq !== saleSeq) return;
          saleShowing = false;
          if (saleReady(data.ledger)) commit({ t: 'yardSale' });
        });
        return;
      }
    }
    commit({ t: 'yardSale' });
  }

  // v0.29: the two carry lessons still open: wood or stone on her head that has never gone to the
  // pile (nor into a build), crops on her head that have never been set out
  function carryLessons(l) {
    const k = learned(l);
    // v0.33 (Tiffany's "Edits #7": "before I could drop off the stones there was a different thing
    // highlighted. Let the stones also be directed to the drop off pile"): wood and stone each, until
    // that material has been left at the pile once (v0.29-v0.32: either one, so after the wood the
    // stones on her head had no circle)
    const left = (r) => k.built || l.yard[r] > 0; // that material has been left at the pile (or used)
    return { mat: (l.carried.W > 0 && !left('W')) || (l.carried.R > 0 && !left('R')), crop: cropsCarried(l) > 0 && !k.stocked };
  }
  // ---------- v0.31: in and out of the house ----------
  // Tiffany's "Edits #5": "Allow her to go in and out of the house"; with Tiffany: "it is enough
  // that she walks through the door, disappears inside, and comes back out". Once the house has its
  // door (the windows and doors, H5), walking into the door from its step opens it: she goes in
  // through it and is gone, the door shuts behind her, and a few seconds later (or as soon as the
  // stick is pushed) it opens again and she comes back out onto the step. Presentation only: her
  // body waits on the step meanwhile, and nothing in the ledger changes.
  // v0.33 (Tiffany's "Edits #7": "When she goes in and comes out of the house, she looks like her legs
  // are standing still. Keep her walking"; "When she's in the house show her through the see through
  // walls walking around / spinning etc (controlled by the player) and she only can come out if the
  // player leads her to the door"): she really walks in. Pushed into the door, the house stops being
  // solid for her (world.setHouseSolid), she walks in on her own legs to a step inside the door, and
  // then the stick moves her about the room, kept within its walls (world.houseClamp); the walls go
  // see-through as they do whenever they hide her (world.updateFade), and Spin twirls her. Walking
  // into the door from inside takes her out, again on her own legs, and the house is solid again
  // behind her. (v0.31-v0.32: her body waited on the step and a picture of her slid in and out.)
  const HOUSE_VISIT = { reach: 0.42, half: 0.42, pushMs: 120, inMs: 2600, outMs: 2600, minStayMs: 400, shutMs: 450, near: 0.16 };
  let houseVisit = null; // { phase: 'in' | 'inside' | 'out', ms, way }
  let doorPush = 0; // how long she has pushed into the door
  const doorReady = () => !!data.ledger.stages?.H5?.committed && !!world.objects.D01?.visible && session.playing && !finale.active && !sunset.active && rig.mode !== 'whole';
  // the stick pushes along the house's own +z (out of its front) by more than `k`
  const pushesOut = (stick, way, k = 0.55) => {
    const m = Math.hypot(stick.x, stick.y);
    return m > 0.3 && ((stick.x / m) * Math.sin(way.yaw) + (-stick.y / m) * Math.cos(way.yaw)) > k;
  };
  function tryHouse(dt, stick) {
    if (houseVisit || !doorReady() || hero.moment || hero.rise || hammering.active || roofClimb || autoWalk || cleaning || ix.working || hunt.moment || cards.isOpen) { doorPush = 0; return; }
    const way = world.doorWay();
    const q = way.local(hero.body.position);
    const atDoor = Math.abs(q.x - way.doorX) < HOUSE_VISIT.half && q.z < way.stepZ + HOUSE_VISIT.reach && q.z > way.front;
    // the stick pushes into the house: screen up is the world's -z; the house's front faces +z in its own frame
    const m = Math.hypot(stick.x, stick.y);
    const fx = Math.sin(way.yaw); const fz = Math.cos(way.yaw);
    const into = m > 0.3 && ((stick.x / m) * -fx + (-stick.y / m) * -fz) > 0.55;
    doorPush = atDoor && into ? doorPush + dt : 0;
    if (doorPush < HOUSE_VISIT.pushMs) return;
    doorPush = 0;
    ix.reset();
    houseVisit = { phase: 'in', ms: 0, way };
    world.setHouseSolid(false);
    sfx.cue('knock');
    hud.announce('Vanessa goes into the house');
  }
  // her steer while she is in the house: walking herself in and out through the door, and the
  // player's stick in between
  const houseAim = new THREE.Vector2();
  function houseSteer(stick) {
    const v = houseVisit;
    if (v.phase === 'inside') return stick;
    const to = v.phase === 'in' ? v.way.inside : v.way.out;
    const p = hero.body.position;
    const dx = to.x - p.x; const dz = to.z - p.z; const d = Math.hypot(dx, dz);
    if (d < 0.02) return zeroSteer;
    return houseAim.set(dx / d, -dz / d).multiplyScalar(Math.min(1, 0.35 + d * 1.5));
  }
  // the visit's frame: the door, the walls she is kept within, and when she is in or out
  function stepHouseVisit(dt, stick) {
    const v = houseVisit;
    if (!v) return;
    v.ms += dt;
    const { way } = v;
    const p = hero.body.position;
    const q = way.local(p);
    if (v.phase === 'in') {
      world.setDoorOpen(Math.min(1, v.ms / 300));
      world.houseClamp(hero, { door: true });
      if (Math.hypot(way.inside.x - p.x, way.inside.z - p.z) < HOUSE_VISIT.near || v.ms > HOUSE_VISIT.inMs) {
        v.phase = 'inside'; v.ms = 0;
        world.inkWord('Home!', way.step.clone().setY(2.3), { h: 0.5, ms: 1200 });
        hud.announce('Vanessa is inside the house. Walk her about, or lead her to the door to come back out.');
      }
    } else if (v.phase === 'inside') {
      world.setDoorOpen(1 - Math.min(1, v.ms / HOUSE_VISIT.shutMs));
      world.houseClamp(hero);
      // out only through the door: at it, pushing out of the house
      const atDoor = Math.abs(q.x - way.doorX) < HOUSE_VISIT.half && q.z > way.front - 0.75;
      if (atDoor && pushesOut(stick, way) && v.ms > HOUSE_VISIT.minStayMs && !hero.moment) {
        v.phase = 'out'; v.ms = 0;
        hud.announce('Vanessa comes back out of the house');
      }
    } else if (v.phase === 'out') {
      world.setDoorOpen(Math.min(1, v.ms / 250));
      world.houseClamp(hero, { door: true });
      if (Math.hypot(way.out.x - p.x, way.out.z - p.z) < HOUSE_VISIT.near * 2 || v.ms > HOUSE_VISIT.outMs) {
        world.setDoorOpen(0);
        world.setHouseSolid(true);
        houseVisit = null;
      }
    }
  }
  // v0.33: inside, she twirls (Spin, the context button)
  function houseSpin() {
    if (houseVisit?.phase !== 'inside' || hero.moment) return;
    hero.halt();
    hero.startMoment('dance', { ms: 2400 });
    sfx.cue('cue');
    hud.announce('Vanessa twirls round the room');
  }
  // ---------- loop with the world-pause gate ----------
  let frozen = false; // test hook (?debug=1): hold world time while the page keeps rendering
  // v0.26: the frame budget (core/loop.js): 60 frames a second at most, 30 while the farm idles,
  // none while nothing on the canvas can change (`framePlan`, below the render step)
  const loop = createLoop({ world: (dt) => { if (!frozen) worldStep(dt); }, render: renderStep, plan: (t) => framePlan(t), fps: () => PERF.fps, idleFps: () => PERF.idleFps });
  const input = createInput({
    zone: $('stick-zone'), base: $('stick-base'), knob: $('stick-knob'),
    onAction: () => {
      if (cards.isOpen || loop.paused) return;
      if (hud.diyHere) hud.triggerDiy();
      else if (hud.saleShown) hud.triggerSale();
      else if (!$('context').hidden) hud.triggerContext();
      else if (hud.diyShown) hud.triggerDiy(); // away from the part: show the way
    },
    onTap: (x, y) => tapWorld(x, y),
    onEscape: () => { if (cards.isOpen) return; if (credits.active) { credits.skip(); return; } if (!completedEl.hidden) { keepExploring(); return; } if (!extrasEl.hidden) { closeExtras(); return; } if (!pauseEl.hidden) { closePause(); return; } if (opening.active) return; if (giveaway.active) { giveaway.skip(); return; } if (sunset.active) { sunset.skip(); return; } if (finale.active) { finale.skip(); return; } if (rig.mode === 'whole') { leaveWhole(); return; } if (session.playing) { if (atTheEnd()) openExtras(); else openPause(); } },
    onBlueprint: () => toggleBlueprint(),
    isBlocked: () => cards.isOpen || loop.paused,
  });

  let ctxTargets = [];
  let lastProgress = null;
  let debugSteer = null; // test hooks only (?debug=1)
  let debugCarried = null;
  let highlight = null; // the collectible the ground ring marks: { target, inReach } or null
  // first-actions coach: session-only facts (the rest derives from the ledger, tutorial.js)
  const tut = { moved: false, movedM: 0, lingerMs: 0, lingerHold: 0, phase: null, dropNoted: false };
  let coachState = null; // decided in the world step, drawn in the render step
  let ledgerSeen = null; // v0.26: the ledger as the last world step left it
  function worldStep(dt) {
    if (data.ledger !== ledgerSeen) ledgerRev++; // (a ledger put in place by anything but `commit`: a check's cheat)
    const stick = input.read();
    lastStick.copy(stick);
    if (!houseVisit) tryHouse(dt, debugSteer ?? stick);
    hero.setInput(houseVisit ? houseSteer(debugSteer ?? stick) : debugSteer ?? stepAutoWalk(dt, stick) ?? sceneSteer ?? stick); // (v0.33: in the house too, on her own legs)
    hero.preStep(dt);
    world.physics.step(1 / 60, dt / 1000, 5);
    // v0.26: the ledger's clock takes whole milliseconds; what a frame's time leaves over is
    // carried to the next, so the clock keeps real time at any frame rate (v0.25 rounded each
    // frame: 17 for 16.7 at 60 a second, 8 for 8.3 at 120, so the farm's clock ran 2% fast on one
    // screen and 4% slow on another)
    tickCarry += dt;
    const tickMs = Math.floor(tickCarry);
    tickCarry -= tickMs;
    commit({ t: 'tick', ms: tickMs, calm: data.settings.helpMeFinish, near: nodesInView() }); // (v0.32: `near`)
    world.updateBranch(dt);
    ctxTargets = world.targets(data.ledger, ledgerRev);
    // v0.33 (Tiffany's "Edits #7": "During the end where she's collecting things don't allow any more
    // collecting crops or wood or rocks. She should just be collecting"): on the finished farm only the
    // songs and the keepsakes are hers to pick up (and a weed on the grass to rake)
    if (eggPhase(data.ledger)) ctxTargets = ctxTargets.filter((t) => t.kind === 'weed');
    const heroXZ = { x: hero.body.position.x, z: hero.body.position.z };
    goal = goalFor(data.ledger, heroXZ);
    // v0.29: a build that waits only for wood or stone says so once, as news
    if (goal.only && goal.target && STAGES[nextStageOf()] && !onlyTold.has(`${nextStageOf()}${goal.only}`) && data.ledger.purse > 0 && !hammering.active) {
      const st = nextStageOf();
      onlyTold.add(`${st}${goal.only}`);
      const short = goal.line?.needs?.find(([k]) => k === goal.only)?.[1] ?? 0;
      if (recipe(data.ledger, st).coins <= data.ledger.purse) hud.toast(goal.only === 'W' ? `${cap(STAGES[st].label)}: the coins are here. It still needs ${short} wood: sticks fall from the old tree, and the logs lie by the path.` : `${cap(STAGES[st].label)}: the coins are here. It still needs ${short} stone: the loose rocks lie about the farm.`, 5600);
    }
    // v0.32 (Tiffany's "Edits #6": "She doesn't ever need to go to the shovel and rake to pick it up so
    // don't have a circle option to do so"): every tool comes to her hand at its job; nothing is taken
    // at the tools (no circle there, no "Take the rake")
    toolCtx = { want: null, toolsComeToMe: true };
    // (v0.22: nor during a song spot's moment: she is doing that, not gathering what lies near)
    // (v0.23: nor while she climbs to the chimney, or down from it)
    if (roofClimb && (hero.moving || hero.moment?.kind !== 'roof')) { roofClimb = null; if (hero.moment?.kind === 'roof') hero.cancelMoment(); }
    const building = hammering.active || !!roofClimb;
    // (v0.33: while the rake or the shovel flies into her hand, the work waits for it)
    const toolComing = world.toolArriving();
    const evs = building || hunt.moment || toolComing ? [] : ix.update(dt, { hero: heroXZ, moving: hero.moving, speed: hero.groundSpeed, targets: ctxTargets, tableBusy: saleShowing, ...toolCtx });
    for (const e of evs) handleIxEvent(e);
    // (v0.25-v0.27 filled a table with room from the crate here, every frame; v0.28: only as a sale
    // starts and after it)
    // (v0.24: she walked off from a weed nobody asked for before raking it: the rake goes back)
    if (data.ledger.tool !== null && !ix.working && toolIdle(data.ledger)) settleLedger();
    const working = hunt.moment ? null : ix.working;
    if (hammering.active && hero.moving) hammering.stop(); // moving away never undoes the build
    const faceTo = working ? working : hammering.active ? hammering.faceTo : null;
    // v0.23 (Tiffany: "When she is shoveling or raking make an animation of her doing it"): with
    // the rake at a weed or the shovel at a spot she works with it, stroke by stroke
    const doing = working ? ix.workDoing : null;
    const toolWork = toolComing ? null : doing === 'clearWeed' && data.ledger.tool === 'rake' ? 'rake' : doing === 'dig' && data.ledger.tool === 'shovel' ? 'shovel' : null;
    hero.update(dt, { working: !!working || hammering.active, faceTo, tool: toolWork, stroke: ix.workProgress });
    hammering.update(dt); // after her pose, so the hammer sits in her fist
    stepHouseVisit(dt, debugSteer ?? stick); // v0.31: through the door and back (after her own update)
    if (!debugCarried) hero.setCounts(data.ledger.carried);
    world.toolStroke = hero.toolStroke;
    // a little earth, or a few leaves, as each stroke bites
    const bite = hero.toolStroke ? `${hero.toolStroke.kind}${ix.working?.id}${hero.toolStroke.stroke}${hero.toolStroke.k > (hero.toolStroke.kind === 'rake' ? 0.34 : 0.4) ? 'b' : 'a'}` : null;
    if (bite && bite !== lastBite && bite.endsWith('b') && world.toolFoot && !reducedMotion()) world.puff(world.toolFoot.clone().setY(0.08), { scale: hero.toolStroke.kind === 'rake' ? 0.3 : 0.42, seed: hero.toolStroke.stroke });
    lastBite = bite;
    world.updateHeldTool();
    world.updatePiles(dt, reducedMotion());
    world.updateRegrowth(data.ledger, dt);
    tweens.update(dt);
    // the ground ring: nearest collectible, solid in reach, filling while she works
    highlight = building || hunt.moment ? null : pickHighlight(data.ledger, heroXZ, ctxTargets, ix.state.selectedId, HIGHLIGHT_RANGE_M, toolCtx);
    const still = !isMoving({ moving: hero.moving, speed: hero.groundSpeed });
    const mode = working ? 'work' : highlight?.inReach ? (still ? 'settle' : 'reach') : 'near';
    // v0.18: no circle for a routine gathering step she has done before (tutorial.js guideTargets)
    // v0.23 (Tiffany: "When it is DIY time make the only highlighted circle be around the DIY
    // location"; "Clean the bench should never be highlighted at DIY time"): at DIY time the goal's
    // one target is the build, and nothing else is marked: not the bench's stain, not the ring round
    // a crop or a stick near her (unless she is working there: that is its progress)
    diyTime = !!goal.diy && !building;
    const markers = diyTime ? [goal.diy] : guideTargets(data.ledger, goal);
    const visibleMarkers = building || eggPhase(data.ledger) || selling() ? [] : markers; // (v0.32: nothing marked during a yard sale)
    // (the bench's stain asks for an action, Clean the bench: its circle is the actions' red one)
    // (v0.33, Tiffany's "Edits #7": "When she is collecting songs, they appear as red circles. Remove the
    // bird pooping on the bench which also appears as a red circle": in the hunt the mess and its
    // circle are there only for the bench's own song, "Clean the bench")
    const benchAsks = !inHunt() || spotsNow().includes('bench');
    if (inHunt() && data.ledger.theft.stain && !benchAsks && !cleaning) { quietClean = true; commit({ t: 'cleanBench' }); quietClean = false; }
    const stainShown = data.ledger.theft.stain && benchAsks && !cleaning && !diyTime && !building && !selling();
    if (stainShown) visibleMarkers.push('G2');
    // v0.29: where her first load goes, marked until she has taken one there
    if (!diyTime && !building && !eggPhase(data.ledger) && !selling()) {
      const lesson = carryLessons(data.ledger);
      if (lesson.mat && !visibleMarkers.includes('yard')) visibleMarkers.push('yard');
      // (v0.30: while her first wood or stone is on its way to the pile, the pile is the only circle)
      if (lesson.crop && !lesson.mat && !visibleMarkers.includes('table')) visibleMarkers.push('table');
    }
    // v0.23 ("Don't have a blue circle on top of a yellow circle unless there is a reason to"): the
    // blue ring keeps off a place that already has a circle (the guide's yellow one, an action's
    // red one, the egg's); while she works there it is her progress, which is the reason
    let ring = highlight;
    if (ring && !working && (diyTime || circleNear(ring.target, visibleMarkers))) ring = null;
    world.updateMarker(dt, ring && { target: ring.target, mode, progress: ix.workProgress }, reducedMotion());
    updateContext(heroXZ, dt);
    updateCoachState(dt, heroXZ, working);
    world.updateGoalMarkers(visibleMarkers, dt, stainShown ? ['G2'] : []);
    updateHunt(dt, heroXZ);
    updateKeepsakes(dt, heroXZ);
    updateBirds(dt, heroXZ);
    updateCleaning(dt);
    if (session.playing && !finale.active && !sunset.active) benchSit(heroXZ, dt);
    updateWhoKnows(dt, heroXZ);
    // v0.25: everything is found: a moment later, "Sunset on the bench" (once per farm)
    // (asked only on a finished farm that has not seen it: nothing is counted on a farm under way)
    if (!data.session.sunsetSeen && mainComplete(data.ledger) && sunsetDue(data, { finished: true, complete: allFound() })
      && inHunt() && !hunt.egg && !hunt.busy && !hunt.moment && !giveaway.active && !houseVisit && !saleShowing && !hammering.active && !cleaning && !birds.busy && hero.moment?.kind !== 'dust') {
      sunsetWait += dt;
      if (sunsetWait >= SUNSET_AFTER_MS) { sunsetWait = 0; sunset.start(); }
    } else sunsetWait = 0;
    // v0.17c: with every song found, the goal line counts the keepsakes and gives the next hint
    // (v0.27: with only the last song left, which waits for the keepsakes, the line is the keepsakes')
    const allSongs = foundCount(data.discoveries) >= songsFor().length;
    const nextKeep = keepsakesLeft(data.keepsakes ?? {})[0];
    // v0.32: a keepsake is out: the line says so (it lies in plain sight, a few metres away)
    const keepLine = keepOut && !data.keepsakes?.[keepOut] ? { text: `A keepsake has come out on the grass near Vanessa: ${keepsakeTitle(keepOut)}. Walk up to it to pick it up; then the next song's red circle comes out.`, line: { icon: 'gift', label: 'Find the keepsake', tail: 'bouncing nearby' } } : null;
    // v0.21 (audit 5): one line, icon-first; in the hunt the counter row is the songs found of all
    // (and the keepsakes, once one is found), so the line does not count them again
    const hunting = eggPhase(data.ledger) && !finaleDue; // (v0.23: not while the last build is still going up)
    if (document.body.classList.contains('hunting') !== hunting) document.body.classList.toggle('hunting', hunting); // v0.29: the Yard Sale button steps aside
    hud.setHunt(hunting ? { found: foundCount(data.discoveries), total: songsFor().length, keepsakes: foundKeepsakes(data.keepsakes ?? {}).length, keepsakesTotal: KEEPSAKE_IDS.length } : null, HUNT_TAPS);
    // (v0.23, audit 8: after a build the line holds its "✓ Walls!" for a beat)
    if (goalBeat) { goalBeat.ms -= dt; if (goalBeat.ms <= 0) goalBeat = goalBeat.then ?? null; }
    hud.setRace(data.session.race ? fmtRace(raceClock(data.ledger, data.session)) : null, mainComplete(data.ledger));
    // (v0.32: during a yard sale the line says only that, and asks for nothing)
    if (selling() !== wasSelling) { wasSelling = selling(); if (!wasSelling) hud.flushHeld(); }
    hud.setGoal(wasSelling && !hunting ? SALE_GOAL : goalBeat ? goalBeat.goal : !hunting ? goal
      : keepLine ?? (allSongs && nextKeep ? { text: 'Enjoy the song. One more keepsake comes out in a moment.', line: { icon: 'note', label: 'Enjoy the song' } }
        : allSongs ? { text: `Every song and every keepsake found.`, line: { icon: 'check', label: 'Everything found' } }
          : huntGoal({ discoveries: data.discoveries, othersFound: keepsakesDone(), /* (v0.33: the last song waits for every keepsake) */ egg: hunt.egg ? 'landed' : hunt.busy ? 'coming' : hunt.moment ? 'moment' : (hunt.restMs > 0 || !actOpen(null)) && inHunt() ? 'rest' : null, restS: Math.ceil(hunt.restMs / 1000) })));
    // one pill: the coach's "how" while it teaches, else the status (ui/voices.js)
    const pill = selling() ? { coach: null, status: 'Yard sale!' } : onePill(coachState?.prompt ?? null, statusWant);
    if (coachState) coachState.prompt = pill.coach;
    if (pill.status !== lastProgress) { hud.setProgress(pill.status); lastProgress = pill.status; }
    ledgerSeen = data.ledger;
    if (worldBusy()) activeAt = performance.now(); // v0.26: something moves: the full frame budget
  }
  const HUNT_TAPS = { onSongs: () => openSongbook({ fromPlay: true }), onKeepsakes: () => openKeepsakes({ fromPlay: true }) };
  let wasSelling = false; // v0.32: a yard sale is on (the notes wait)
  const SALE_GOAL = { text: 'Yard sale! The neighbours are buying.', line: { icon: 'coins', label: 'Yard sale!' } };
  let sunsetWait = 0; // v0.25: play time with everything found, before the sunset starts
  let tickCarry = 0; // v0.26: the part of a millisecond the ledger's clock has not had yet
  let diyTime = false; // she has everything for the next build (the goal line says DIY)
  let lastBite = null; // the tool stroke last seen (a puff as each one bites)
  // is a circle already on the ground at this target: one of the guide's (`ids`), an action's
  // spot in the end, or the egg's
  const CIRCLE_NEAR_M = 1.0;
  function circleNear(t, ids) {
    const near = (p) => !!p && Math.hypot(p.x - t.x, p.z - t.z) <= CIRCLE_NEAR_M;
    for (const id of ids) if (id === t.id || near(world.standPoint(id, tmpS))) return true;
    if (!inHunt()) return false;
    if (hunt.egg && near(hunt.egg.position)) return true;
    return huntReady() && spotsNow().some((sp) => actOpen(sp) && near(world.eggSpotPos(sp, tmpS))); // (v0.31: only the circles on the grass)
  }
  let statusWant = null; // what the status pill would say (updateContext)
  const onlyTold = new Set(); // v0.29: the builds whose "only wood (or stone) missing" has been told
  const nextStageOf = () => nextStage(data.ledger);

  // the goal line; when it names stone, the rock nearest Vanessa that still has some (§3 P25-6)
  let goal = { text: '', target: null };
  let toolCtx = { want: null, toolsComeToMe: false };
  function goalFor(l, heroXZ) {
    const g = nextGoal(l, { toolsCome: data.settings.helpMeFinish });
    const wood = WOOD_SOURCES.includes(g.target);
    if (!(g.target in ROCKS) && !wood) return g;
    let best = null;
    // (v0.20: while the line names the logs by the path, the arrow keeps to those piles)
    for (const id of wood ? (WOOD_PILES.includes(g.target) ? WOOD_PILES : WOOD_SOURCES) : Object.keys(ROCKS)) {
      const st = world.stations[id];
      if (!st || !available(l, id)) continue;
      const d = Math.hypot(st.pos.x - heroXZ.x, st.pos.z - heroXZ.z);
      if (!best || d < best.d) best = { id, d };
    }
    return best ? { ...g, target: best.id } : g;
  }

  // what the coach shows this frame (tutorial.js decides; the render step places it)
  function updateCoachState(dt, heroXZ, working) {
    if (!tut.moved) {
      tut.movedM += (hero.groundSpeed * dt) / 1000;
      if (tut.movedM >= MOVED_M) tut.moved = true;
    }
    // walking around in reach of a collectible without stopping: explain the stillness rule
    tut.lingerMs = highlight?.inReach && !working && hero.moving ? tut.lingerMs + dt : 0;
    tut.lingerHold = tut.lingerMs >= LINGER_MS ? 1800 : Math.max(0, tut.lingerHold - dt);
    const l = data.ledger;
    const step = tutorialStep(l, { moved: tut.moved, toolsCome: data.settings.helpMeFinish });
    // v0.13 (P29-1): the pile lesson is a one-time edge note near the pile, never the arrow
    if (!tut.dropNoted) {
      const y = world.stations.yard.pos;
      const note = dropLesson(l, Math.hypot(y.x - heroXZ.x, y.z - heroXZ.z));
      if (note) { tut.dropNoted = true; hud.toast(note, 4000); }
    }
    // a soft cue each time the first-actions guide moves on to a new step (its text shows it too)
    if (step?.phase && tut.phase && step.phase !== tut.phase) sfx.cue('cue');
    tut.phase = step?.phase ?? null;
    // the hand points at the button to press: DIY at the first build, Yard Sale at the first sale
    // (v0.23, Tiffany: "Don't have the arrow point at DIY": no hand on the DIY button; the goal
    // line says DIY and the arrow leads to the place)
    const point = step?.phase === 'sale' && hud.saleShown ? 'sale' : null;
    const here = highlight?.inReach ? kindOf(highlight.target.id, l) : null;
    coachState = {
      step,
      point,
      // (v0.21: not what the goal line or a pointed-at button already says)
      prompt: quietCoach(coachPrompt({ step, learned: learned(l), mode: input.mode, here, tool: toolCtx.want, working: !!working, lingering: tut.lingerHold > 0, point, atSite: hud.diyHere })),
    };
  }

  function handleIxEvent(e) {
    if (e.type === 'workStart') { world.markerPop(0.07); return; } // answers the moment work starts
    if (e.type === 'unit') { if (e.result.ok) world.markerPop(0.16); }
  }

  function updateContext(heroXZ, dt = 0) {
    // v0.12: the build line (the site she stands at, or the goal line's next build) and its DIY
    // (v0.24: she is at the next build when she is within reach of its own site: the house's five
    // stages share one, and the nearest of them was not always the one the goal line was on)
    const bar = finale.active || sunset.active || opening.active ? null : buildBarAt(data.ledger, heroXZ, ctxTargets);
    diyState = diyHint.update(dt, bar && !hammering.active ? bar : null);
    // (v0.32: no DIY button while the neighbours buy; it comes as they go)
    hud.setBuild(selling() ? null : bar, bar?.ready ? (bar.here ? () => doDiy(bar.stage) : () => diyAway(bar)) : null);
    // v0.14: yellow at the tables. v0.23 (Tiffany: "when she fills them the yard sale button is
    // highlighted"): yellow from the moment every table is full, wherever she stands
    hud.setSale(saleReady(data.ledger) && !saleShowing && !finale.active && !sunset.active, doYardSale, true);
    // at the tools: the explicit way to take the one the next job needs (P25-4)
    const tools = ctxTargets.find((x) => x.kind === 'tools');
    if (selling()) {
      hud.setContext(null, null); // (v0.32: nothing else to do during a yard sale)
    } else if (houseVisit) {
      hud.setContext(houseVisit.phase === 'inside' && !hero.moment ? 'Spin' : null, houseVisit.phase === 'inside' ? houseSpin : null); // (v0.33: she twirls in the house)
    } else if (tools && toolCtx.want && inReach(heroXZ, tools)) {
      const tool = toolCtx.want;
      hud.setContext(`Take the ${tool}`, () => { ix.reset(); commit({ t: 'takeTool', tool }); });
    // (v0.32, Tiffany's "Edits #6": "Currently it's prompting her to clean an already clean bench":
    // only a bench with a bird's mess on it is cleaned; v0.31 offered it any time)
    } else if (data.ledger.theft.stain && !cleaning && !hero.moment && !(inHunt() && spotHere(heroXZ)) && Math.hypot(benchSpot().x - heroXZ.x, benchSpot().z - heroXZ.z) < 1.9) {
      // v0.29 (Tiffany: "When she's cleaning the bench, have her clean the part of the bench the poop
      // is actually on"): she steps up to the stain, in front of the bench, and wipes it there
      // (v0.31: any time the bench stands, mess or no mess; at a red circle its own action comes first)
      hud.setContext('Clean the bench', () => {
        hero.halt(); ix.reset();
        const stain = !!data.ledger.theft.stain;
        const seat = stain && world.stain?.visible ? world.stain.position.clone() : world.benchSeat();
        const to = hero.sitSpot(seat, world.objects.D10.rotation.y, new THREE.Vector3(), CLEAN_STAND_M);
        cleaning = { ms: -CLEAN_STEP_MS, stain };
        hero.startMoment('clean', { ms: BIRDS.cleanMs + CLEAN_STEP_MS, seat, to });
      }, data.ledger.theft.stain ? 'act' : null);
    } else hud.setContext(null, null);
    // nonmodal status: what Vanessa is doing or why the nearby source is idle
    let text = '';
    const w = ix.working;
    if (w) {
      const doing = ix.workDoing;
      if (doing === 'takeTool') text = `Taking the ${w.kind === 'tools' ? toolCtx.want : w.kind === 'weed' ? 'rake' : 'shovel'}`;
      else if (w.kind === 'weed') text = isYardWeed(w.id) ? 'Raking the weed: it grows back soon' : 'Clearing weeds';
      else if (w.kind === 'dig') text = 'Digging';
      else text = `Gathering ${RESOURCE_UNIT[sourceResource(w.id)]}: ${data.ledger.carried[sourceResource(w.id)]}${['C', 'S', 'T'].includes(sourceResource(w.id)) && cropsCarried(data.ledger) > data.ledger.carried[sourceResource(w.id)] ? ` · ${cropsCarried(data.ledger)} of ${HEAD_CROPS} crops` : ''}`;
    } else if (houseVisit?.phase === 'inside') {
      text = 'Inside the house: walk her to the door to come back out'; // (v0.32; v0.33: through the door)
    } else if (autoWalk) {
      text = autoWalk.stage ? `Running to the ${STAGES[autoWalk.stage].label}` : 'Back to the tables for the yard sale'; // v0.29 (v0.32: and to a build)
    } else if (roofClimb && !hammering.active) {
      text = roofClimb.stage === 'H3' ? 'Up onto the walls' : 'Up onto the roof';
    } else if (hammering.active) {
      text = `DIY time! Building the ${STAGES[hammering.stage].label}`;
    } else if (cleaning) {
      text = 'Cleaning the bench';
    } else {
      const need = toolBlocked(data.ledger, heroXZ, ctxTargets, toolCtx);
      if (need && goal.tool !== need) text = `You need the ${need}. It leans ${byHouse(data.ledger)}.`; // (v0.21: not when the goal line is "Take the rake")
      // (v0.24: no weed waits for its patch to open any more: every weed that stands can be raked)
      // the yard pile, inspected (P27-1)
      // (v0.31, Tiffany's "Edits #5": "At the end of the game where it is talking about the growing
      // wood pile there is a bubble that explains the 'build takes from here' but remove that bubble
      // at the end of the game when she is running around": on the finished farm nothing is built)
      const yard = !text && !mainComplete(data.ledger) && ctxTargets.find((x) => x.kind === 'yard' && inReach(heroXZ, x, 1.2));
      if (yard) text = `Yard pile · ${data.ledger.yard.W} wood, ${data.ledger.yard.R} stone. Build takes from here.`;
      // the yard-sale table, inspected (v0.12)
      const table = !text && ctxTargets.find((x) => x.kind === 'table' && inReach(heroXZ, x, 1.2));
      if (table) {
        const n = data.ledger.table.C + data.ledger.table.S + data.ledger.table.T;
        const capN = tableCap(data.ledger);
        // v0.14: with all four tables there is no maximum, so no "of"
        const of = Number.isFinite(capN) ? ` of ${capN}` : ' out';
        // (v0.21: what is out, while it is not yet a sale; once six are out the Yard Sale button
        // is up and says the rest, so the pill stays quiet unless more would still fit)
        // (v0.23: a sale is held when every table is full, so the count is against all of them)
        text = saleShowing ? 'Yard sale!' : n >= capN ? '' : `Yard-sale table${tables(data.ledger) > 1 ? 's' : ''} · ${n}${of}`;
      }
      // v0.25: the crop crate, inspected
      const crate = !text && ctxTargets.find((x) => x.kind === 'crate' && inReach(heroXZ, x, 0.9));
      if (crate) { const n = crateCount(data.ledger); text = `Storage crate · ${n} of ${CRATE_CAP}${n >= CRATE_CAP ? ': full until a yard sale' : ''}`; }
      // v0.29: at the full tables with crops, and the crate full too: nothing more can be dropped off
      const stuck = !text && cropsCarried(data.ledger) > 0 && tableFull(data.ledger) && crateFull(data.ledger) && ctxTargets.some((x) => (x.kind === 'table' || x.kind === 'crate') && inReach(heroXZ, x, 1.3));
      if (stuck) text = 'No room: the tables and the crate are full. Tap Yard Sale to empty them.';
      // v0.17: beside the raised bed's scribble, its name (§10.5: never a botanical one)
      const wk = !text && world.whoKnowsPos(tmpS);
      if (wk && Math.hypot(wk.x - heroXZ.x, wk.z - heroXZ.z) < 0.9) text = 'Who-Knows plant';
      const near = ctxTargets.filter((x) => ['node', 'stick', 'pile', 'rock'].includes(x.kind) && inReach(heroXZ, x));
      for (const n of near) {
        if (text) break;
        const res = sourceResource(n.id);
        if (n.hold) { text = 'A stick is coming down from the tree'; break; }
        // (v0.28: crops fill her head together, twelve of them: the crate by the tables takes them)
        // (v0.31, Tiffany's "Edits #5": one yard sale at a time: with a sale's worth in hand the ripe
        // crop waits for the sale, and the line says so; then it can be picked)
        if (available(data.ledger, n.id) > 0 && !canTake(data.ledger, res)) { text = ['C', 'S', 'T'].includes(res) ? (storeFull(data.ledger) ? 'A yard sale’s worth is in hand: set it out at a table, tap Yard Sale, then pick more.' : `Her head is full: ${HEAD_CROPS} crops. Leave them in the crate by the tables, or set them out.`) : `Can't carry more ${RESOURCE_NAMES[res]}: ${CAPACITY} is the most`; break; }
        // v0.20 (audit 2): a spot that is not planted yet is not "Growing" (guide.js spotStatus)
        if (available(data.ledger, n.id) === 0 && n.kind === 'node') { text = spotStatus(data.ledger, n.id) ?? ''; if (text) break; }
      }
      // a wilted plant's spot (spec v0.12 P28-4)
      const re = !text && ctxTargets.find((x) => x.kind === 'dig' && data.ledger.wilted[x.id] && inReach(heroXZ, x, 1.2));
      if (re) text = data.ledger.tool === 'shovel' ? 'Replant: stand still to dig' : `Replant: dig it with the shovel (it leans ${byHouse(data.ledger)})`;
    }
    statusWant = text || null; // shown by the world step, unless the coach is teaching
  }

  // v0.12: a tap on the world that lands on the yard-sale stand holds the sale (the captain:
  // "you click the stand is more intuitive")
  function tapWorld(x, y) {
    if (!session.playing || loop.paused) return;
    // (v0.17-v0.32: a tap on a bird that threatened waved it off; v0.33: she waves by herself, autoWave)
    if (!saleReady(data.ledger)) return;
    const ndc = new THREE.Vector2((x / view.w) * 2 - 1, -(y / view.h) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, rig.camera);
    // any of her tables (v0.13), or close to one on screen (a finger is wide)
    for (const st of world.tableStations()) {
      if (!st.obj.visible) continue;
      const onTable = ray.intersectObject(st.obj, true).length > 0;
      tmpP.copy(st.pos).setY(0.6).project(rig.camera);
      const px = Math.hypot(((tmpP.x + 1) / 2) * view.w - x, ((1 - tmpP.y) / 2) * view.h - y);
      if (onTable || px < 56) { doYardSale(); return; }
    }
  }

  // ---------- session: title, pause, whole farm, overlay ----------
  const session = { playing: false };
  const titleEl = $('title');
  const pauseEl = $('pause');
  // A save notice as a paper card before play (spec v0.10 §11.3, S26-02): a damaged or newer
  // save with the existing choices, or a browser that keeps progress for this session only.
  // `go(data)` starts play (and the opening, if this launch has it).
  const NOTICES = {
    corrupt: (n) => `Your saved farm could not be read.${n.recover ? ' A last good copy is available.' : ' Start a new game to continue.'}`,
    newer: () => 'This save comes from a newer version of the game; it was left untouched.',
    sessionOnly: () => 'Saving is unavailable in this browser: progress lasts for this session only.',
  };
  function showNotice(n, r, go) {
    paper.hide();
    loop.pause('title');
    titleEl.hidden = false;
    $('title-note').textContent = NOTICES[n.kind](n);
    $('btn-recover').hidden = !n.recover;
    $('btn-new').hidden = n.kind === 'sessionOnly';
    $('btn-continue').hidden = n.kind !== 'sessionOnly';
    if (n.kind === 'sessionOnly') persist.warned = true; // told here, not again as a toast
    $('btn-recover').onclick = () => go(r.backup);
    $('btn-new').onclick = () => go(createSaveData());
    $('btn-continue').onclick = () => go(r.status === 'ok' ? r.data : createSaveData());
    (n.recover ? $('btn-recover') : n.kind === 'sessionOnly' ? $('btn-continue') : $('btn-new')).focus();
  }
  // No menu (S26-02): a valid save goes straight to play at its position (Continue), otherwise
  // a new farm starts; a device's first launch shows the opening's page over it.
  function launch() {
    if (END) {
      // v0.29: the finished farm, straight into the song hunt: no opening, no welcome, no notice
      persist.warned = true;
      start(finishedFarm());
      paper.hide();
      audio.autostart();
      loadSfx();
      later(() => hud.toast('The finished farm (?end=1): nothing here is saved. Walk to a red circle for a song.', 5200));
      return;
    }
    const r = saves.load();
    const overlay = params.get('overlay') === '1';
    const go = (d) => {
      start(d);
      if (d === r.data && r.recoveryRock) later(() => hud.toast(recoveryNote(r.recoveryRock), 6000));
      // (v0.17 opened a finished farm on the completed menu; v0.22: it opens on the farm, with
      // Extras where Pause was. The slideshow's offer comes once, at the end of the finale.)
      // (v0.25: a brand-new farm always opens on the page, seen before or not)
      if (playsOpening({ seen: prefs.openingSeen, param: params.get('opening'), overlay, fresh: freshFarm(d) })) {
        paper.place(view.w, view.h);
        opening.prepare();
        // v0.33 (Tiffany's "Edits #7": "When you first start the game the music should come on"; "Make
        // the default sound setting be on ... Even at the very beginning of the game"): the theme is
        // asked for on the opening's page too, where it waited for the tap before; a browser that
        // allows it plays it at once, and the tap that starts the opening starts it from its top. One
        // that does not (an iPhone) starts it with that first tap, as before.
        audio.autostart();
        loadSfx();
      } else {
        welcome(); // v0.25: a new farm with no opening before it (?opening=0) is welcomed at once
        paper.hide();
        // v0.23 ("Sound automatically starts with the game"): asked for at once, with no gesture;
        // where the browser will not have that, the first touch starts it, with no prompt in
        // between. (A device's first launch rests on the opening's page, whose first tap starts
        // the theme and the opening together, as before: the opening runs on the theme's clock.)
        audio.autostart();
        loadSfx();
      }
      if (overlay) enterWhole(true);
    };
    const n = saveNotice(r, saves.sessionOnly);
    if (n) showNotice(n, r, go);
    else go(r.status === 'ok' ? r.data : createSaveData());
  }
  const recoveryNote = (n) => `A rock with ${n} stone has appeared by the house, so the farm can still be finished.`;
  function start(d) {
    document.body.classList.remove('booting');
    if (sunset.active) sunset.skip(); // (v0.25: a scene of the farm before this one ends with that farm)
    data = structuredClone(d);
    // v0.20: a farm finished before the evening had its own clock starts its day now
    if (mainComplete(data.ledger) && !Number.isFinite(data.session.finishedAt)) data.session.finishedAt = data.ledger.activeMs;
    ix.reset();
    Object.assign(tut, { moved: false, movedM: 0, lingerMs: 0, lingerHold: 0, phase: null, dropNoted: false });
    Object.assign(who, { idleMs: 0, glanced: false, far: false }); // v0.17: the Who-Knows hello waits for her to come up to it
    coachState = null;
    highlight = null;
    const pos = data.vanessa.x === null ? proj.groundAt(VANESSA_START.u, VANESSA_START.v) : new THREE.Vector3(data.vanessa.x, 0, data.vanessa.z);
    hero.place(pos.x, pos.z);
    rig.snap = true;
    rig.wholeBlend = 0;
    world.tableHold = false;
    world.resetTools(data.ledger.tool);
    world.sync(data.ledger);
    world.setFinished(mainComplete(data.ledger)); // the coloured end state derives from the home (P25-2)
    // v0.23: on a finished farm Dwight is on the bench; otherwise at his post
    world.archerReset();
    if (mainComplete(data.ledger)) world.archerToBench('A1', { instant: true });
    thief.cancel(); sceneSteer = null;
    if (houseVisit) { hero.view.visible = true; world.setDoorOpen(0); world.setHouseSolid(true); } houseVisit = null; doorPush = 0; // (v0.31; v0.33: the house solid again)
    roofClimb = null; autoWalk = null; goalBeat = null; wishTold = -1; lastBite = null; sunsetWait = 0; tickCarry = 0;
    ledgerRev++; // (v0.26: another farm: nothing kept from the last one)
    showSign(null);
    applyTheme(data.ledger.crop); // her first crop's theme; a new farm starts on plain paper
    if (hammering.active) hammering.stop();
    diyHint.reset();
    burst.hide();
    world.endSale();
    saleShowing = false;
    crateLanding = Promise.resolve();
    restockLanding = Promise.resolve();
    saleStarting = false;
    saleSeq++; // (v0.28: a sale still being shown belongs to the farm before)
    world.clearEggs();
    Object.assign(hunt, { busy: false, egg: null, id: null, restMs: 0, moment: null });
    keepOut = null; // (v0.32)
    songs.stop(); // a new farm, or another save: no song of the last one plays on
    finaleDue = false;
    birds.reset(data.ledger.activeMs);
    cleaning = null;
    speech.el.hidden = true;
    if (backdrop) { holdBackdrop(false); completedEl.hidden = true; loop.resume('done'); }
    extrasEl.hidden = true; pauseEl.hidden = true;
    showMenuButton();
    notes.reset();
    hud.reset();
    hud.setHunt(null);
    hud.setRace(null);
    hud.render(data.ledger);
    applyHelpParams(); // ?help= and ?birds= (the accessibility settings; saved with the farm)
    hud.setGoal(nextGoal(data.ledger, { toolsCome: data.settings.helpMeFinish }));
    persist();
    settleLedger(); // e.g. a test save from before v0.9 whose corn-plot weeds are already cleared
    titleEl.hidden = true;
    session.playing = true;
    loop.resume('title');
    menuButton().focus();
  }
  // ---------- v0.22: Pause only pauses; Extras at the end ----------
  // Tiffany: "The pause button only pauses, it doesn't leave you to a list of other options. At the
  // end, there should be a button instead of the pause button that says extras that leads you to
  // that list. Cannot access extras until the end when you are just exploring."
  // The end: the home is built and its finale has played (the farm is coloured, she is exploring).
  const extrasEl = $('extras');
  // v0.23 (audit 14): the race's best time, kept on the device apart from the farm save
  const race = createRace(safeStorage());
  let lastRace = null; // { ms, best, isBest, previous } of the race just finished (the finish card shows it)
  function finishRace() {
    if (!data.session.race || !Number.isFinite(data.session.finishedAt)) return;
    lastRace = race.finish(data.session.finishedAt);
  }
  const atTheEnd = () => mainComplete(data.ledger) && !finale.active && !finaleDue;
  const menuButton = () => (atTheEnd() ? $('btn-extras') : $('btn-pause'));
  function showMenuButton() {
    const end = atTheEnd();
    $('btn-pause').hidden = end;
    $('btn-extras').hidden = !end;
  }
  function holdWorld() {
    ix.reset();
    input.release();
    hero.halt();
    loop.pause('menu');
    audio.holdMusic('menu'); // the theme rests; a found song that is playing plays on (Extras is where the songs are)
  }
  function releaseWorld() { loop.resume('menu'); audio.releaseMusic('menu'); }
  function openPause() {
    if (atTheEnd()) { openExtras(); return; }
    holdWorld();
    pauseEl.hidden = false;
    $('btn-resume').focus();
  }
  function closePause() { pauseEl.hidden = true; releaseWorld(); $('btn-pause').focus(); }
  function openExtras() {
    if (!atTheEnd() || !extrasEl.hidden) return;
    holdWorld();
    $('btn-songs').textContent = `Songs (${foundCount(data.discoveries)}/${songsFor().length} found)`;
    $('btn-keepsakes').textContent = `Keepsakes (${foundKeepsakes(data.keepsakes ?? {}).length}/${KEEPSAKE_IDS.length})`;
    $('btn-ending').textContent = data.discoveries?.[LAST_SONG] ? 'Watch the ending again' : 'Skip to the ending'; // (v0.33)
    extrasEl.hidden = false;
    extrasEl.scrollTop = 0;
    $('btn-extras-back').focus({ preventScroll: true });
  }
  function closeExtras() { extrasEl.hidden = true; releaseWorld(); $('btn-extras').focus({ preventScroll: true }); }
  // (v0.25-v0.29: an Evening light switch in Extras gave the day back after the sunset. v0.30
  // (Tiffany's "Farm changes #4": "Remove the option to turn evening light off"): it is gone, and the
  // farm stays in its evening once the sunset has played, also on a farm whose switch was off.)
  $('btn-extras').onclick = openExtras;
  $('btn-extras-back').onclick = closeExtras;
  // v0.31 (Tiffany's "Edits #5": "allow clicking the background to close the menu"): a tap on the
  // menu's paper itself, not on one of its buttons or sliders, closes Pause or Extras
  $('btn-pause-back').onclick = () => closePause();
  extrasEl.addEventListener('click', (e) => { if (e.target === extrasEl) closeExtras(); });
  pauseEl.addEventListener('click', (e) => { if (e.target === pauseEl) closePause(); });
  // (v0.23, Tiffany: "Get rid of the credits tab": Extras has no Credits)
  function enterWhole(withOverlay) {
    pauseEl.hidden = true;
    if (withOverlay) {
      const g = proj.groundAt(VANESSA_START.u, VANESSA_START.v);
      hero.place(g.x, g.z);
      hero.yaw = FINALE_YAW; hero.yawTarget = FINALE_YAW; hero.view.rotation.y = FINALE_YAW; // A29-10, as in the finale
      hero.halt();
      hero.showFinalePose(true); // the drawing's hands-on-hips pose, nothing on her head (V9)
      world.showHeldTool(false); // nor in her hands
    }
    audio.releaseMusic('menu'); // the whole-farm view keeps the theme
    rig.mode = 'whole';
    document.body.classList.add('whole');
    $('overlay').hidden = !withOverlay;
    loop.pause('whole');
    layout();
    $('btn-back').focus();
  }
  function leaveWhole() {
    hero.showFinalePose(false);
    world.showHeldTool(true);
    rig.mode = 'play';
    rig.snap = true;
    document.body.classList.remove('whole');
    $('overlay').hidden = true;
    loop.resume('whole');
    loop.resume('menu');
    menuButton().focus();
  }
  // ---------- the Blueprint toggle (P25-3): utility row, Pause at 320 px, and the B key ----------
  const prefs = createPrefs(safeStorage());
  world.setBlueprint(prefs.blueprint, false);
  const bpButtons = [$('btn-blueprint')];
  function showBlueprint() {
    const on = prefs.blueprint;
    for (const b of bpButtons) {
      b.setAttribute('aria-pressed', String(on));
      b.title = on ? 'Blueprint on: the outlines of unbuilt things show (B)' : 'Blueprint off: only finished things show (B)';
    }
  }
  function toggleBlueprint() {
    if (cards.isOpen || finale.active || sunset.active || opening.active || !session.playing) return;
    world.setBlueprint(prefs.toggleBlueprint());
    showBlueprint();
    hud.announce(`Blueprint ${prefs.blueprint ? 'on' : 'off'}`);
  }
  for (const b of bpButtons) b.onclick = toggleBlueprint;
  showBlueprint();

  // ---------- the colour finale (P25-2): after the home (H5), presentation only, skippable ----------
  const finale = new Finale({
    world, hero, rig,
    at: () => proj.groundAt(VANESSA_START.u, VANESSA_START.v), // D17
    house: () => world.objects.D01.position, // v0.25: she cheers at it before she sets off
    reducedMotion,
    onStart: () => {
      ix.reset();
      world.endSale();
      world.clearEggs(); // an egg on the grass waits for no cinematic: it comes again after
      Object.assign(hunt, { busy: false, egg: null, id: null });
      input.release();
      hero.halt();
      loop.pause('finale');
      document.body.classList.add('finale');
      $('btn-skip').hidden = false;
      $('btn-skip').focus();
      // v0.23 (Tiffany: "If Dwight doesn't already walk off the screen before the final image
      // appears, have him do that. Not just disappear."): he walks out of the picture
      world.archerLeave();
      burst.hide(); // no "DIY time!" or ink tick is left over the picture
      hud.announce('The house is finished. The drawing takes its colour.');
    },
    onEnd: () => {
      document.body.classList.remove('finale');
      $('btn-skip').hidden = true;
      finaleDue = false;
      showMenuButton(); // Extras now stands where Pause stood
      loop.resume('finale'); // the camera eases back to Vanessa (renderStep)
      // v0.23 (Tiffany: "In the end let Dwight go sit down on the bench"): he walks back in and sits
      // (the first time the slideshow's offer comes first: he walks in when she goes on, keepExploring)
      if (data.session.creditsSeen) world.archerToBench('A1');
      // v0.22: the first time, the slideshow is offered (watch it, or keep playing); it never
      // starts by itself, and it is always in Extras
      if (mainComplete(data.ledger) && !data.session.creditsSeen) { showCompleted(); return; }
      if (foundCount(data.discoveries) < songsFor().length) huntNews();
      menuButton().focus();
    },
  });
  $('btn-skip').onclick = () => { if (giveaway.active) giveaway.skip(); else if (sunset.active) sunset.skip(); else finale.skip(); };

  // ---------- v0.25: "Sunset on the bench", when everything is found (game/sunset.js) ----------
  // The captain's pick for the end of the postgame: the day turns to golden evening, Vanessa and
  // Dwight sit on the bench, fireflies over the corn, and "The Farm, complete" is pencilled in with
  // a gold 100%. Presentation only (world/sunset.js); it plays once per farm, can be skipped like
  // the finale, and afterwards the evening stays (v0.25-v0.29: Extras had a switch for the day).
  const signEl = $('sunset-sign');
  signEl.querySelector('.line').textContent = SIGNATURE;
  signEl.querySelector('.gold-stamp').textContent = STAMP;
  // st: the scene's state (or null: put the signature away)
  function showSign(st) {
    if (!st || !(st.sign > 0)) { signEl.hidden = true; return; }
    signEl.hidden = false;
    signEl.style.setProperty('--sign', st.sign.toFixed(3));
    signEl.style.setProperty('--stamp', st.stamp.toFixed(3));
  }
  // where the signature's line begins on screen, top (px), whether it is written yet or not
  const signTop = () => {
    if (!signEl.hidden) return signEl.getBoundingClientRect().top;
    return $('btn-skip').hidden ? view.h : $('btn-skip').getBoundingClientRect().top - 72;
  };
  // v0.27 (the captain: "when all completed and in the bench Dwight can say something like this
  // wouldn't be possible without the help of your Assistant (of the) General Manager"): once she
  // has sat down beside him he says it, in his speech bubble, and it stays to the end of the scene
  const sunsetSays = (st) => { if (st.says > 0 && !speech.scene) archerSays(DWIGHT_THANKS, Infinity, 'A1', { scene: true }); };
  const sunset = new Sunset({
    world, hero, rig, reducedMotion,
    onStart: () => {
      ix.reset();
      input.release();
      hero.halt();
      world.showHeldTool(false);
      loop.pause('sunset');
      document.body.classList.add('finale', 'sunset'); // the play UI away, as in the finale; the evening shows
      $('btn-skip').hidden = false;
      $('btn-skip').focus({ preventScroll: true });
      burst.hide();
      hud.announce('Everything is found. The day turns to a golden evening, and Vanessa sits down on the bench beside Dwight.');
    },
    onState: (st) => { showSign(st); if (sunset.active) sunsetSays(st); },
    onEnd: () => {
      // his line goes with the scene; one that was skipped before it could be read he says now,
      // as she gets up beside him
      speech.scene = false;
      speech.el.hidden = true;
      if (saysAfter(sunset.endedAt, { reducedMotion: sunset.reduced }) && world.archerSeated('A1')) archerSays(DWIGHT_THANKS, SAYS_AFTER_MS);
      document.body.classList.remove('finale', 'sunset');
      $('btn-skip').hidden = true;
      world.showHeldTool(true);
      data.session.sunsetSeen = true;
      persist(); // seen for good before anything else
      loop.resume('sunset'); // the camera eases back to Vanessa (renderStep)
      setTimeout(() => showSign(null), 600);
      signEl.classList.add('leaving');
      setTimeout(() => signEl.classList.remove('leaving'), 700);
      hud.announce(`${SIGNATURE}. The evening stays on the farm.`);
      hud.toast(`${SIGNATURE}: every song and every keepsake found. The evening stays on the farm, and The drawing is signed.`, 7000);
      menuButton().focus({ preventScroll: true });
      // v0.33 (the ending as adopted, Tiffany's "Edits #7"): then the story and the slideshow follow,
      // offered; the song plays on and she can keep exploring until the player moves on
      setTimeout(offerStory, reducedMotion() ? 300 : 1600);
    },
  });
  function offerStory() {
    if (credits.active || !session.playing) return;
    if (cards.isOpen || finale.active || sunset.active || giveaway.active) { setTimeout(offerStory, 800); return; }
    cards.message({
      title: 'The Farm, complete',
      text: 'Every song and every keepsake is found. Watch the story of the drawing and its slideshow, or keep exploring the farm with the song playing.',
      confirm: 'Watch the story and slideshow', cancel: 'Keep exploring',
      onConfirm: () => credits.start(),
    });
  }
  // (v0.21's paper bands above and below an upright screen's framing are gone since v0.25: above
  // and below the farm the world's own sky and ground go on, world/framing.js)

  // ---------- v0.17: the end credits (§5.1) and the completed menu (§5) ----------
  // Both sit over the coloured drawing at the finale camera: the play elements away, Vanessa at
  // D17 in the drawing's pose, nothing on her head; the world is paused behind them.
  const completedEl = $('completed');
  let backdrop = false;
  // v0.25: `card`: the end card's backdrop. The whole farm is framed in the part of the screen
  // the card leaves free (above it on an upright screen, left of it on a wide one: framing.js
  // endCardFrame), so the card no longer lies over the picture. The slideshow keeps the centred frame.
  // v0.27: the card comes as the finale ends on the whole farm, and the picture slides from the
  // finale's frame into its place beside the card (CARD_SLIDE_MS; reduced motion: it is there).
  const CARD_SLIDE_MS = 600;
  let cardAt = 0; // when the end card came up (performance.now)
  const cardFrame = (w, h) => {
    const k = reducedMotion() ? 1 : Math.max(0, Math.min(1, (performance.now() - cardAt) / CARD_SLIDE_MS));
    return mixRect(finaleRect(w, h), endCardFrame(w, h).rect, k * k * (3 - 2 * k));
  };
  function holdBackdrop(on, { card = false } = {}) {
    backdrop = on;
    document.body.classList.toggle('backdrop', on); // no HUD over the drawing
    if (on && card) cardAt = performance.now();
    if (on) rig.frameRect = card ? cardFrame : null;
    if (on) {
      ix.reset(); input.release(); hero.halt();
      const p = proj.groundAt(VANESSA_START.u, VANESSA_START.v);
      hero.place(p.x, p.z);
      hero.yaw = FINALE_YAW; hero.yawTarget = FINALE_YAW; hero.view.rotation.y = FINALE_YAW;
      hero.showFinalePose(true);
      hero.stack.root.scale.setScalar(0.01);
      world.showHeldTool(false);
      world.setPlayHidden(1);
      rig.wholeBlend = 1;
    } else {
      hero.showFinalePose(false);
      hero.stack.root.scale.setScalar(1);
      world.showHeldTool(true);
      world.setPlayHidden(0);
    }
  }
  const credits = createCredits({
    el: $('credits'),
    fetchJson: (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }),
    soundOn: () => audio.settings.soundEnabled,
    reducedMotion,
    holdMusic: () => audio.holdMusic('credits'),
    releaseMusic: () => audio.releaseMusic('credits'),
    onStart: () => {
      songs.stop(); // the slideshow plays its own song
      completedEl.hidden = true;
      if (!extrasEl.hidden) { extrasEl.hidden = true; releaseWorld(); }
      holdBackdrop(true);
      loop.pause('credits');
      document.body.classList.add('credits');
      hud.announce('The slideshow');
    },
    onEnd: () => {
      document.body.classList.remove('credits');
      loop.resume('credits');
      keepExploring(); // back to the farm (Extras has it again)
    },
  });
  // The end of the finale (v0.22): the farm is finished, and the slideshow is offered once.
  // "Watch the slideshow" plays it; "Keep playing" goes on to the egg hunt. Either way the offer
  // is not made again (`creditsSeen`): the slideshow is in Extras from here on.
  function showCompleted() {
    holdBackdrop(true, { card: true });
    completedEl.dataset.card = endCardFrame(view.w, view.h).card;
    loop.pause('done');
    const all = songsFor().length;
    $('completed-note').textContent = `The house is a home, and the whole drawing is in colour. Would you like to see the slideshow of the drawing over the years? It is in Extras any time. And ${all} songs wait on the farm, a few red circles at a time.`;
    // v0.20 (audit 3): what Dwight did about the birds
    const shooed = data.session.dwightDeterred ?? 0;
    // v0.23 (audit 14): a race's time, and the best one kept on this device
    const raced = lastRace && data.session.race ? `Race: ${fmtRace(lastRace.ms)}${lastRace.isBest ? (lastRace.previous ? ` · a new best (it was ${fmtRace(lastRace.previous)})` : ' · your first time: the one to beat') : ` · best ${fmtRace(lastRace.best)}`}` : '';
    $('completed-race').hidden = !raced;
    $('completed-race').textContent = raced;
    $('completed-tally').hidden = !shooed;
    $('completed-tally').textContent = `Birds deterred by Dwight: ${shooed}`;
    if (!data.session.creditsSeen) { data.session.creditsSeen = true; persist(); }
    completedEl.hidden = false;
    $('btn-slideshow-end').focus({ preventScroll: true });
  }
  // the hunt's rules, told once a session as it opens (after that the goal line carries it)
  function huntNews() {
    notes.once('hunt', 'Exploring: walk to the red circle and do what it says, and a bird brings a song in a yellow circle. While the song plays a keepsake comes out near you: find it, and the next red circle comes out.', 7500);
  }
  function keepExploring() {
    completedEl.hidden = true;
    holdBackdrop(false);
    world.archerToBench('A1'); // v0.23: Dwight comes back into the picture and sits on the bench (he is there already on a later visit)
    loop.resume('done');
    rig.snap = true;
    showMenuButton();
    if (foundCount(data.discoveries) < songsFor().length) huntNews();
    menuButton().focus({ preventScroll: true });
  }
  $('btn-explore').onclick = keepExploring;
  $('btn-slideshow-end').onclick = () => credits.start();
  $('btn-slideshow').onclick = () => credits.start();
  // v0.33 (Tiffany's "Edits #7": "Make it possible to skip to the end animation"): Extras → Skip to the
  // ending: every song and keepsake still to find counts as found, and "I gave it to the world" plays
  // at once, with the sunset on the bench after it; once it has played, Watch the ending again replays
  // the scene (nothing else changes)
  function playEnding() {
    const spot = songSpot(LAST_SONG);
    const go = () => {
      closeExtras();
      Object.assign(hunt, { busy: false, egg: null, id: null, restMs: 0, moment: null }); world.clearEggs();
      keepOut = null;
      const p = world.eggSpotPos(spot, new THREE.Vector3());
      hero.place(p.x, p.z); rig.snap = true;
      setTimeout(() => startGiveaway(spot), 120);
    };
    if (data.discoveries?.[LAST_SONG]) { go(); return; }
    cards.message({
      title: 'Skip to the ending?',
      text: 'Every song and keepsake still to find is counted as found, and the last song, “I gave it to the world”, plays now with its ending.',
      confirm: 'Skip to the ending', cancel: 'Not now',
      onConfirm: () => {
        const at = found(data.ledger);
        for (const id of songsFor()) if (id !== LAST_SONG && !data.discoveries?.[id]) data.discoveries = { ...data.discoveries, [id]: { ...at, skipped: true } };
        for (const id of KEEPSAKE_IDS) if (!data.keepsakes?.[id]) data.keepsakes = { ...data.keepsakes, [id]: data.ledger.activeMs };
        persist();
        go();
      },
    });
  }
  $('btn-ending').onclick = playEnding;
  window.addEventListener('keydown', (e) => {
    if (!credits.active || cards.isOpen) return;
    if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); credits.togglePause(); }
  });
  // the songbook (Extras → Songs, and the HUD's songs counter)
  $('btn-songs').onclick = () => openSongbook();

  // ---------- the opening: the drawing on paper comes to life (once per device) ----------
  const opening = new Opening({
    world, hero, rig, paper, reducedMotion,
    view: () => view,
    music: () => ({ state: audio.state, position: audio.position }),
    finished: () => mainComplete(data.ledger),
    onStart: () => {
      ix.reset();
      input.release();
      hero.halt();
      loop.pause('opening');
      document.body.classList.add('opening');
      $('opening').classList.toggle('reduced', reducedMotion());
    },
    // a skip from the live part: the frame on screen now, cross-faded into the end state
    onFreeze: () => { renderer.render(scene, rig.camera); paper.captureView(canvas); },
    onEnd: () => {
      document.body.classList.remove('opening');
      document.body.classList.add('handoff'); // the HUD fades in over 200 ms
      setTimeout(() => document.body.classList.remove('handoff'), 400);
      input.release();
      loop.resume('opening');
      prefs.setOpeningSeen(true);
      menuButton().focus({ preventScroll: true });
      for (const fn of afterOpening.splice(0)) fn();
      welcome(); // v0.25: a new farm is welcomed as the opening hands over
    },
  });
  // The page's first tap, click, Enter or Space starts (a gesture, so the theme starts with
  // it). Taps on the page never reach the stick, which is beneath it.
  // v0.25 (the captain: "Make the start animation unskipable"): once it runs nothing ends it
  // early: a tap, a key or Escape does nothing (v0.10-v0.24: any of them skipped to the end
  // state), except that a gesture still brings the theme back after a hidden tab, as everywhere.
  let resuming = false; // read before the audio owner handles the same gesture
  for (const t of ['pointerup', 'keydown']) window.addEventListener(t, () => { resuming = opening.active && audio.prompt === 'resume'; }, true);
  const tapOpening = () => {
    if (!opening.active || resuming) return;
    // (v0.33: the theme may already be playing on the page: the opening runs on its clock from the top)
    if (opening.phase === 'waiting') { if (audio.position > 0.3) audio.restartMusic(); opening.begin(); }
  };
  paper.onStart(tapOpening);
  $('opening-start').onclick = () => { if (opening.active && opening.phase === 'waiting' && audio.position > 0.3) audio.restartMusic(); opening.begin(); }; // Enter or Space on the focused Start control
  window.addEventListener('keydown', (e) => {
    if (!opening.active || e.repeat || cards.isOpen || e.key === 'Escape') return;
    if (opening.phase !== 'waiting' || ![' ', 'Enter'].includes(e.key)) return;
    e.preventDefault();
    tapOpening();
  });
  // v0.25 (the captain: "We should add an explanation when we start the game"): the welcome card,
  // once on a new farm, as the opening hands over (or at once where none plays). The world waits
  // behind it; closing it is the start of play.
  function welcome() {
    if (!welcomeDue(data) || !session.playing) return;
    if (cards.isOpen || !titleEl.hidden) { setTimeout(welcome, 600); return; }
    input.release(); hero.halt();
    loop.pause('card');
    cards.welcome({
      ...WELCOME,
      onClose: () => {
        data.session.welcomeSeen = true;
        persist();
        loop.resume('card');
        menuButton().focus({ preventScroll: true });
      },
    });
    hud.announce(`${WELCOME.title} ${WELCOME.who} ${WELCOME.first}`);
  }
  // every button answers with a light tap, unless its own handler just played a cue (Confirm)
  document.addEventListener('click', (ev) => { if (ev.target.closest?.('button')) sfx.cue('tap'); });
  $('btn-pause').onclick = openPause;
  $('btn-resume').onclick = closePause;
  $('btn-back').onclick = leaveWhole;
  // v0.12 Help me finish and v0.17 Birds never steal are accessibility settings kept in the save.
  // v0.22 (Tiffany: 'Remove the "help" option'): they have no menu any more; `?help=1` or `?help=0`
  // on the address turns Help me finish on or off, `?birds=0` or `?birds=1` the birds' theft.
  function applyHelpParams() {
    let changed = false;
    if (['0', '1'].includes(params.get('help')) && data.settings.helpMeFinish !== (params.get('help') === '1')) { data.settings.helpMeFinish = params.get('help') === '1'; changed = true; }
    if (['0', '1'].includes(params.get('birds')) && data.settings.birdsNeverSteal !== (params.get('birds') === '0')) { data.settings.birdsNeverSteal = params.get('birds') === '0'; changed = true; }
    return changed;
  }
  // New farm: the first thing in Extras, behind its confirmation
  // (v0.29: and Start over in Pause, the same thing during the game: `fromPause`)
  function newFarm({ fromPause = false } = {}) {
    // v0.23 (audit 14): a new farm can be a race: a clock on the way to the finished farm
    // v0.25 (the captain: "New farm also gets the animation"): the opening plays over the new
    // farm, from its page, on the theme started again from its top; her tap on the button is the
    // gesture, so it runs at once
    const fresh = (race) => {
      extrasEl.hidden = true; pauseEl.hidden = true; releaseWorld();
      const d = saves.reset(data.settings); d.session.race = race; lastRace = null;
      start(d);
      if (playsOpening({ seen: prefs.openingSeen, param: params.get('opening'), fresh: true })) {
        paper.place(view.w, view.h);
        opening.prepare();
        audio.restartMusic();
        opening.begin();
      } else setTimeout(welcome, 80); // (once the confirmation card has closed for good)
    };
    cards.message({
      title: fromPause ? 'Start over from the beginning?' : 'Start a new farm?',
      text: `This erases the farm: every build, ${data.ledger.purse} coins, the songs and the keepsakes found. The sound settings are kept.`,
      confirm: fromPause ? 'Start over' : 'Start a new farm', cancel: 'Keep this farm',
      onConfirm: () => fresh(false),
      extra: 'Start a new farm as a race',
      extraNote: `A race shows a clock until the farm is finished${race.best ? `. Best time on this device: ${fmtRace(race.best)}` : ', and keeps your best time on this device'}.`,
      onExtra: () => fresh(true),
    });
  }
  $('btn-reset').onclick = () => newFarm();
  $('btn-start-over').onclick = () => newFarm({ fromPause: true });
  // v0.29: a phone that brings the page back from its page cache may skip visibilitychange
  window.addEventListener('pageshow', (e) => { if (!e.persisted || document.hidden) return; loop.resume('hidden'); claimSound(); away = true; setAway(false); });
  let songResume = false; // v0.29: a found song was playing as the page was hidden
  // v0.33 (Tiffany's "Edits #7": "If you have two of the games or more open in separate tabs, only the
  // one that is up should play the audio. Currently they all play overlapping"): the sound goes quiet
  // when the page is hidden (as before) and also when another tab of the game has come to the front
  // since (`yielded`). The tabs tell each other through a broadcast channel: a tab that is shown,
  // focused or touched claims the sound, and every other one goes quiet until it is claimed back.
  let yielded = false;
  let away = false; // the sound is away: the page hidden, or another tab has it
  function setAway(on) {
    if (on === away) return;
    away = on;
    audio.setHidden(away);
    credits.setHidden(away);
    // like the theme; v0.29 (Tiffany: "If I go out of the farm game on my phone and come back, have
    // the song automatically start playing again"): a song that was playing plays on when the page
    // is shown again (the element was started by her tap, so the browser lets it go on)
    if (away) { songResume = songResume || songs.state.playing; songs.pause(); } else if (songResume) { songResume = false; songs.resume(); }
    // v0.30 (Tiffany: "When I click out of the game to a different page in my phone and then come
    // back, it should automatically start the audio"): the iPhone's silent element, which keeps
    // its audio session, plays on again too (it was started by her tap, so it may)
    if (!away && silent) silent.play()?.catch?.(() => {});
    if (away && silent) silent.pause?.();
    // v0.31: the theme's back-up voice (themeBackup below)
    if (away) themeBackup.hide(); else themeBackup.back();
  }
  const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const tabs = (() => { try { return new BroadcastChannel('vanessas-farm/sound'); } catch { return null; } })();
  tabs?.addEventListener('message', (e) => { if (e.data?.claim && e.data.claim !== tabId && !yielded) { yielded = true; setAway(true); } });
  const claimSound = () => {
    if (document.hidden) return;
    if (yielded) { yielded = false; setAway(false); }
    try { tabs?.postMessage({ claim: tabId }); } catch { /* one tab only */ }
  };
  window.addEventListener('focus', claimSound);
  claimSound(); // a game opened in front: the others go quiet
  for (const t of ['pointerdown', 'keydown']) window.addEventListener(t, () => { if (yielded || !claimSound.done) { claimSound.done = true; claimSound(); } }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { ix.reset(); input.release(); hero.halt(); loop.pause('hidden'); } else loop.resume('hidden');
    if (!document.hidden) claimSound();
    setAway(document.hidden || yielded);
  });

  // ---------- v0.31: the theme comes back by itself (Tiffany's "Edits #5") ----------
  // "When I leave the page, and go back to the game the music should automatically start playing
  // instead of having to click the button that says 'resume audio'". v0.30 left the audio context to
  // the phone, which on her iPhone still kept it stopped until a tap. A media element that a tap has
  // once started may play again later with no tap (the found songs do so, v0.29); so the theme has
  // one too, blessed on the first taps. Back on the page, if the context has not come back by itself
  // within a moment, that element plays the theme on from where it stopped, and "Tap to resume audio"
  // is not shown. The next tap brings the context back and the element stops (the theme goes on in
  // Web Audio). On an iPhone the element plays at its own volume (the page cannot set it there).
  const themeBackup = (() => {
    let el = null; let blessed = false; let on = false; let timer = 0;
    const make = () => { if (el) return el; el = new Audio(TRACK.url); el.loop = true; el.preload = 'auto'; el.setAttribute('playsinline', ''); return el; };
    return {
      get on() { return on; },
      // inside a tap: start and stop it once, muted, so a later play() needs no tap
      bless() {
        if (blessed || !audio.settings.soundEnabled) return;
        blessed = true;
        const a = make(); a.muted = true;
        const p = a.play(); p?.then?.(() => { if (!on) a.pause(); a.muted = false; }, () => { blessed = false; a.muted = false; });
      },
      back() {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (document.hidden || !blessed || audio.running || !audio.settings.soundEnabled || songs.state.playing || on) return;
          const a = make();
          try { a.currentTime = Math.max(0, audio.position || 0); } catch { /* not seekable yet */ }
          a.volume = Math.min(1, audio.settings.musicVolume);
          on = true;
          a.play()?.then?.(() => showAudio(), () => { on = false; showAudio(); });
          showAudio();
        }, RETURN_GRACE_MS - 300);
      },
      hide() { clearTimeout(timer); if (on && el) el.pause(); on = false; },
      // the context runs again: the theme is Web Audio's once more
      settle() { if (on && audio.running) { el?.pause(); on = false; showAudio(); } },
    };
  })();
  // ---------- audio (audio/audio.js): the single owner; starts on an explicit gesture ----------
  // v0.29: an iPhone without the audio-session API keeps Web Audio past its silent switch while a
  // media element plays: a silent one loops, started by the first tap (audio.js keepAlive)
  const iPhoneLike = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let silent = null;
  const keepAlive = () => {
    if (!iPhoneLike || navigator.audioSession || silent) return;
    silent = new Audio(silentWav());
    silent.loop = true;
    silent.setAttribute('playsinline', '');
    silent.play()?.catch?.(() => { silent = null; });
  };
  const audio = createAudio({
    session: navigator.audioSession ?? null,
    keepAlive,
    AudioContextCtor: window.AudioContext ?? window.webkitAudioContext,
    load: (url) => fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
      return r.arrayBuffer();
    }),
    storage: safeStorage(),
    onChange: showAudio,
  });
  // v0.23 (Tiffany: "Don't have a button on the screen that controls volume. Only in the drop down
  // list. Sound automatically starts with the game"): no Sound button on the HUD or on the opening's
  // page. Sound on or off is a switch in the two lists there are: Pause, and Extras (with the two
  // volumes). The sound starts by itself (audio.autostart, called as the game starts: launch).
  // v0.24 (the captain: "were sound effects removed? ... can we add them to the pause menu?
  // Because I only see music"): Pause has the same three controls as Extras: the switch, the music
  // volume and the effects volume. Still no volume control on the play screen.
  const soundSwitches = [$('btn-sound-pause'), $('btn-sound-extras')];
  const volMusic = [$('vol-music-pause'), $('vol-music')];
  const volEffects = [$('vol-effects-pause'), $('vol-effects')];
  // v0.32 (Tiffany's "Edits #6": "Remove the button that says 'tap to enable audio' it should just
  // start automatically"): no button. The sound starts by itself; where the browser holds it back
  // until the page is touched (an iPhone), her first touch of the game starts it, with nothing shown
  // (every tap, click and key is a gesture, below). (v0.10-v0.31: "Tap to enable audio" and "Tap to
  // resume audio" were offered as a button.)
  function showAudio() {
    const s = audio.settings;
    for (const b of soundSwitches) {
      b.setAttribute('aria-pressed', String(s.soundEnabled));
      b.querySelector('.state').textContent = audio.state === 'unsupported' ? 'unavailable' : s.soundEnabled ? 'on' : 'off';
      b.disabled = audio.state === 'unsupported';
    }
    for (const el of volMusic) el.value = String(Math.round(s.musicVolume * 100));
    for (const el of volEffects) el.value = String(Math.round(s.effectsVolume * 100));
  }
  for (const b of soundSwitches) b.onclick = () => { audio.toggleSound(); credits.setSound(audio.settings.soundEnabled); songs.setMuted(!audio.settings.soundEnabled); };
  // (the theme rests while a menu is open; moving its slider lets it play there, so the level is
  // heard as it is set. A found song playing in its place keeps its own hold and plays on.)
  for (const el of volMusic) el.oninput = (e) => { audio.setMusicVolume(Number(e.target.value) / 100); audio.releaseMusic('menu'); };
  for (const el of volEffects) {
    el.oninput = (e) => audio.setEffectsVolume(Number(e.target.value) / 100);
    el.onchange = () => sfx.cue('tick'); // hear the new level on release
  }
  // every tap, click or key is an explicit gesture: it starts audio, retries a refused start
  // and resumes after a hidden tab
  // The effects load once the gesture has made the audio context (never before: no context
  // without a gesture, and none while Sound is off).
  let sfxLoading = false;
  const loadSfx = () => {
    if (sfxLoading || !audio.context) return;
    sfxLoading = true;
    for (const f of sfxFiles()) audio.loadEffect(f, `${SFX_PATH}${f}.mp3`);
  };
  // (v0.22: and blesses the song player's one element, so a found song may start with no tap)
  // (v0.23: `pointerdown` too, so the very first touch of the stick starts the sound)
  for (const t of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(t, () => { audio.gesture(); loadSfx(); songs.unlock(); themeBackup.bless(); setTimeout(() => themeBackup.settle(), 120); }, true);
  audio.prefetch();
  showAudio();

  // ---------- layout: canvas size, HUD bands, overlay rectangle ----------
  const view = { w: 1, h: 1, top: 0, bottom: 0 };
  function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    setLookResolution(renderer); // constant-width ink and screen-space paper grain
    const whole = rig.mode === 'whole';
    view.w = w; view.h = h;
    // v0.13 (P29-2): while the edge note is open the play area starts under it, so the camera
    // centres Vanessa below it and it never covers her
    view.top = whole ? 0 : Math.max($('hud').getBoundingClientRect().bottom, hud.noteRect?.bottom ?? 0);
    view.bottom = whole ? 0 : h - $('controls').getBoundingClientRect().top;
    const r = fitRect(w, h);
    Object.assign($('overlay').style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    Object.assign($('frame').style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    if (opening?.active) paper.place(w, h); // the sheet for the new screen, and a new still
    if (!completedEl.hidden) completedEl.dataset.card = endCardFrame(w, h).card; // (the end card's side follows the screen)
  }
  window.addEventListener('resize', () => { layout(); });
  layout();

  // points the tree must not hide: Vanessa's legs, body and head, the marked collectible and
  // the coach's target
  // (v0.24: and the circle of the build it is DIY time for, so the place to stand is never behind
  // the tree; the trunk goes see-through with the canopy, world.updateFade)
  const fadePts = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector3());
  function fadePoints() {
    const p = hero.position;
    // (v0.23: on the roof she is in plain sight above the house: nothing fades for her there)
    const pts = hero.moment?.kind === 'roof' ? [] : [fadePts[0].set(p.x, p.y + 0.3, p.z), fadePts[1].set(p.x, p.y + 0.9, p.z), fadePts[2].set(p.x, p.y + 1.5, p.z)];
    if (highlight) pts.push(fadePts[3].set(highlight.target.x, 0.15, highlight.target.z));
    const st = coachState?.step && world.stations[coachState.step.target];
    if (st) pts.push(fadePts[4].copy(st.pos).setY(0.3));
    const br = world.branchPoint(fadePts[5]); // the falling branch (P25-5)
    if (br) pts.push(br);
    const spot = diyTime && goal.diy ? world.standPoint(goal.diy, fadePts[6]) : null;
    if (spot) pts.push(spot.setY(spot.y + 0.15));
    return pts;
  }

  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3(); // v0.15: the selling spot behind the table
  // The HUD's live bottom edge. It grows when the goal line gets its text, after the first
  // layout (which measured an empty goal line and so centred Vanessa too high): re-measure the
  // bands whenever the HUD changes size; the camera eases to the new centre (camera.js). The
  // coach arrow stays below the HUD and the carried stack is capped to the room above her head.
  const live = { hudBottom: 0, playTop: 0, ctlTop: 0, capAt: 0 };
  const measureBands = () => {
    live.hudBottom = $('hud').getBoundingClientRect().bottom;
    live.playTop = Math.max(live.hudBottom, hud.noteRect?.bottom ?? 0); // under the edge note (v0.13)
    live.ctlTop = $('controls').getBoundingClientRect().top;
    document.documentElement.style.setProperty('--note-top', `${Math.round(live.hudBottom + 6)}px`); // the edge note (v0.13)
    live.capAt = 0;
    layout();
  };
  new ResizeObserver(measureBands).observe($('hud'));
  new ResizeObserver(measureBands).observe($('toast')); // the note opens, folds or goes
  hud.onNote = () => requestAnimationFrame(measureBands);
  window.addEventListener('resize', measureBands);
  measureBands();
  const capA = new THREE.Vector3();
  const capB = new THREE.Vector3();
  // how many units fit between the top of her head and the HUD, through the actual camera
  function updateStackCap(now) {
    if (now < live.capAt) return;
    live.capAt = now + 250;
    const p = hero.position;
    capA.set(p.x, STACK_BASE_Y, p.z).project(rig.camera);
    capB.set(p.x, STACK_BASE_Y + 1, p.z).project(rig.camera);
    const pxPerM = ((capB.y - capA.y) / 2) * view.h;
    const base = ((1 - capA.y) / 2) * view.h;
    // v0.13 (P29-2): the stack's room is measured from the edge note's bottom while it is open
    const top = live.playTop || live.hudBottom;
    if (pxPerM > 0) hero.stack.cap = stackCap((base - top - 30) / pxPerM);
  }

  // "+N" over the stack's top when more is carried than the screen lets it draw
  const badge = $('stack-badge');
  function placeStackBadge() {
    const n = hero.stack.hidden;
    badge.hidden = !n;
    if (!n) return;
    hero.stack.topWorld(tmpP).project(rig.camera);
    badge.textContent = `+${n}`;
    badge.style.transform = `translate(${(((tmpP.x + 1) / 2) * view.w).toFixed(1)}px, ${(((1 - tmpP.y) / 2) * view.h).toFixed(1)}px)`;
  }

  // "+N" over the yard pile when it holds more than it draws (P27-1)
  const yardBadge = $('yard-badge');
  function placeYardBadge() {
    const n = world.yardHidden ?? 0;
    const show = n > 0 && session.playing && !finale.active && !sunset.active && !opening.active && rig.mode !== 'whole';
    yardBadge.hidden = !show;
    if (!show) return;
    tmpP.copy(world.stations.yard.pos).setY(0.75).project(rig.camera);
    yardBadge.textContent = `+${n}`;
    yardBadge.style.transform = `translate(${(((tmpP.x + 1) / 2) * view.w).toFixed(1)}px, ${(((1 - tmpP.y) / 2) * view.h).toFixed(1)}px)`;
  }

  // v0.25: the count beside the crop crate, while it holds anything
  const crateBadge = $('crate-badge');
  function placeCrateBadge() {
    const n = world.crateTotal ?? 0;
    const show = n > 0 && session.playing && !finale.active && !sunset.active && !opening.active && rig.mode !== 'whole' && !backdrop && !world.playHidden;
    crateBadge.hidden = !show;
    if (!show) return;
    tmpP.copy(world.stations.crate.obj.position).setY(0.95).project(rig.camera);
    crateBadge.textContent = String(n);
    crateBadge.style.transform = `translate(${(((tmpP.x + 1) / 2) * view.w).toFixed(1)}px, ${(((1 - tmpP.y) / 2) * view.h).toFixed(1)}px)`;
  }

  function updateCoach() {
    if (loop.paused || rig.mode === 'whole' || !session.playing || !coachState) { coach.hideAll(); badge.hidden = true; coach.sparkle(null); return; }
    if (hammering.active) { coach.hideAll(); coach.sparkle(null); return; } // nothing over the build
    const { step, prompt, point } = coachState;
    // one arrow at the goal's target; at the crop choice, three, one per patch in its colour
    // v0.23 (Tiffany: "When it says DIY only have one arrow ... at that time only an arrow to the
    // DIY", from the moment she has everything: "have the arrow take her to the location
    // initially"; v0.13 waited 10 s and added a sparkle): at DIY time the one arrow is the build's
    const aims = diyTime ? [{ id: goal.diy }]
      : step?.choice ? step.choice.map((c) => ({ id: c.target, colour: c.colour })) : (step?.target ?? goal.target) ? [{ id: step?.target ?? goal.target }] : [];
    // v0.18: and no arrow for a routine gathering step she has done before (the goal line still says it)
    for (let i = aims.length - 1; i >= 0; i--) if (routineGather(data.ledger, aims[i].id)) aims.splice(i, 1);
    coach.sparkle(null);
    const arrows = [];
    for (const aim of aims) {
      const st = world.stations[aim.id];
      if (!st || point) continue;
      const hp = hero.body.position;
      // v0.15: for a sale the arrow shows where she sells from, behind the first table
      const sell = aim.id === 'table';
      const pos = world.standPoint(aim.id, tmpS) ?? st.pos;
      const atTarget = sell ? atTheTable() : Math.hypot(pos.x - hp.x, pos.z - hp.z) <= 0.65;
      if (atTarget) continue;
      tmpP.copy(pos).setY(pos.y + 0.9).project(rig.camera);
      const pt = { x: ((tmpP.x + 1) / 2) * view.w, y: ((1 - tmpP.y) / 2) * view.h, front: tmpP.z < 1 };
      const a = arrowPlacement(pt, { left: 0, right: view.w, top: live.playTop || live.hudBottom, bottom: live.ctlTop });
      arrows.push(aim.colour ? { ...a, colour: aim.colour } : a);
    }
    // (v0.23, Tiffany: "No arrows pointing at icons or songs": no arrow in the end, not to an
    // action's circle, not to the egg, not to a keepsake; v0.16-v0.22 led to the egg and to the
    // last song)
    if (goalBeat || (eggPhase(data.ledger) && !finaleDue)) arrows.length = 0;
    coach.arrows(arrows);
    coach.tip(prompt);
    placeStackBadge();
    coach.demo(step?.phase === 'move' && input.mode !== 'keyboard' && !input.stickActive); // not while she is already dragging
    coach.pointAt(point === 'sale' ? $('btn-sale') : null);
  }

  let eveningShown = null; // the evening wash's opacity as last written
  const wakeLock = createWakeLock();
  document.addEventListener('pointerdown', () => wakeLock.refresh(), { passive: true });
  function renderStep(dt) {
    wakeLock.setActive(session.playing && !document.hidden && (credits.active ? !credits.paused : finale.active || sunset.active || giveaway.active || (opening.active && opening.phase === 'running') || !loop.paused));
    opening.update(dt);
    finale.update(dt);
    sunset.update(dt);
    stepGiveaway(dt); // v0.31
    credits.update(dt);
    if (backdrop) rig.wholeBlend = 1; // the credits and the completed menu: the drawing's frame
    else if (!finale.active && !sunset.active && !opening.active && rig.wholeBlend > 0) rig.wholeBlend = Math.max(0, rig.wholeBlend - dt / 900); // back to Vanessa
    rig.update(dt, giveaway.active ? giveaway.focus : hero.position, view);
    const f = rig.focus;
    // the sun light follows what the camera frames, so shadows stay sharp in the drawing frame
    const sx = rig.wholeBlend > 0 ? f.x * (1 - rig.wholeBlend) : f.x;
    const sz = rig.wholeBlend > 0 ? f.z * (1 - rig.wholeBlend) : f.z;
    sunLight.position.set(sx - 8, 14, sz + 6);
    sunLight.target.position.set(sx, 0, sz);
    rig.camera.updateMatrixWorld();
    world.updateLooks(dt);
    world.updateSmoke(dt);
    world.updateArcher(dt);
    world.updateSkyBirds(dt);
    world.updateSun(dt); // v0.22: the end's sun: its spiral turns and its rays give light
    updateDance(dt);
    // v0.17c: the finished farm's evening and its fireflies
    // (v0.20: on a clock that starts when the farm is finished, so the hunt opens by day)
    // v0.25: once everything is found the evening stays ("Sunset on the bench", game/sunset.js);
    // while that scene plays the light and the fireflies are the scene's
    const dusk = sunset.active ? sunset.state : null;
    const ev = session.playing && !finale.active && !credits.active && !backdrop
      ? eveningLight({ cycle: eveningAt(sinceFinish(data.ledger.activeMs, data.session.finishedAt), mainComplete(data.ledger)), scene: dusk ? dusk.evening : null, seen: data.session.sunsetSeen && mainComplete(data.ledger), dayLight: false })
      : 0;
    world.updateFireflies(dt, dusk ? Math.min(ev, dusk.fireflies) : ev);
    // (v0.26: written when it changes)
    if (ev !== eveningShown) {
      eveningShown = ev;
      $('evening').style.opacity = String(ev.toFixed(3));
    }
    world.updateSky(rig.camera);
    if (rig.mode === 'whole' || !session.playing || finale.active || sunset.active || giveaway.active || opening.active || rig.wholeBlend > 0) world.resetFade(); else { world.updateFade(dt, rig.camera, fadePoints(), { solidTrunk: hero.moment?.kind === 'hug' }); updateStackCap(performance.now()); }
    updateCoach();
    if (burst.active || burst.ticking || hammering.active) {
      tmpP.copy(hero.position).setY(1.75).project(rig.camera);
      burst.update(burstHeld ? 0 : dt, { x: ((tmpP.x + 1) / 2) * view.w, y: ((1 - tmpP.y) / 2) * view.h }, { w: view.w, top: live.hudBottom, bottom: live.ctlTop || view.h }, reducedMotion());
    }
    placeYardBadge();
    placeCrateBadge();
    showWishTag();
    placeSpeech();
    // under the opening's paper nothing 3D is seen (v0.22: the page shows the drawing itself;
    // the world is drawn under it only until that picture is on the page)
    if (opening.coversCanvas && !paper.needsCapture) { if (DEBUG) debugReadout(); return; }
    renderer.render(scene, rig.camera);
    draws++;
    if (DEBUG) debugReadout();
  }

  // ---------- v0.26: the frame budget (core/loop.js asks on every callback of the screen) ----------
  // 'full': something on the farm moves, or is about to (she walks or works, a flight, a build, a
  //   sale, a bird, a cinematic, the camera on its way), and for a second after it stops;
  // 'idle': the world runs and only its own small motion shows (the smoke, the sun, the sky's
  //   birds, a circle breathing, Dwight looking about), and the drawing behind the slideshow and
  //   the end card: half the frames;
  // 'hold': nothing on the canvas can change: a hidden tab, the page of the opening before its
  //   tap, and the world waiting behind Pause, Extras, a card or a notice. The picture is drawn
  //   once and stays. Whatever does move behind a card is given its frames: the farm dancing to
  //   a song behind its card, the blueprint fading in, the camera settling, Dwight's words
  //   running out. Behind Pause and Extras, which cover the farm with paper, nothing is.
  // A tap, a key or a resize always gets its frames at once (`stir`).
  const ACTIVE_GRACE_MS = 1000; // the full budget for this long after the last thing moved
  let activeAt = -Infinity;
  let draws = 0; // scene draws submitted (checks)
  const cinematic = () => finale.active || sunset.active || giveaway.active || (opening.active && (opening.phase === 'running' || paper.needsCapture));
  const cameraMoving = () => !rig.settled || (rig.wholeBlend > 0 && rig.wholeBlend < 1);
  // v0.27's end card has just come up and the picture is on its way to its place beside it
  const cardSliding = () => backdrop && performance.now() - cardAt < CARD_SLIDE_MS + 100;
  // the world runs and something in it is on the move
  function worldBusy() {
    return hero.moving || hero.groundSpeed > 0.02 || !!hero.moment || !!hero.rise || hero.celebrateMs > 0 || !!ix.working || hammering.active || !!roofClimb
      || tweens.list.length > 0 || saleShowing || hunt.busy || !!hunt.moment || birds.busy || !!cleaning || world.busy || hero.stack.busy
      || burst.active || burst.ticking || songs.state.playing || cameraMoving() || thief.active || !!houseVisit;
  }
  // a sheet of paper over the whole screen: Pause, Extras or a save notice (styles.css `.screen`, 95% paper)
  const covered = () => !pauseEl.hidden || !extrasEl.hidden || !titleEl.hidden;
  // the world waits behind a card, and still something shows
  const pausedMotion = () => songs.state.playing || (world.danceState?.k ?? 0) > 0.001 || world.looksMoving || cameraMoving() || burst.active || burst.ticking || !speech.el.hidden;
  function framePlan(t) {
    if (document.hidden) return PERF.still ? 'hold' : 'full';
    if (cinematic()) return 'full';
    if (opening.active) return PERF.still ? 'hold' : 'full'; // its page rests, over the whole canvas, until the first tap
    if (loop.paused) {
      // the drawing is the picture there (v0.27: and it slides into its place beside the end card)
      if (credits.active || backdrop || rig.mode === 'whole') return cameraMoving() || cardSliding() ? 'full' : 'idle';
      if (!PERF.still) return 'full';
      if (covered()) return 'hold'; // Pause, Extras or a notice lies over the whole farm (also while a song plays in Extras)
      return pausedMotion() ? 'full' : 'hold';
    }
    return t - activeAt < ACTIVE_GRACE_MS ? 'full' : 'idle';
  }
  // the player did something, or the page changed: frames now, whatever the plan was
  const stir = () => { activeAt = performance.now(); loop.request(); };
  for (const t of ['pointerdown', 'pointerup', 'keydown', 'click', 'input', 'change']) window.addEventListener(t, stir, { capture: true, passive: true });
  window.addEventListener('resize', stir);
  document.addEventListener('visibilitychange', stir);
  songs.subscribe(() => loop.request()); // a song starts or stops: the farm's dance with it
  THREE.DefaultLoadingManager.onLoad = () => loop.request(); // a picture that arrives late is drawn, also on a held frame

  // ---------- measurement (step 3) and debug hooks ----------
  function measure() {
    const r = fitRect(view.w, view.h);
    const ve = projectedExtent(proj, hero.view);
    const he = projectedExtent(proj, world.objects.D01);
    // the same in viewport pixels through the actual whole-farm camera
    const cam = proj.makeViewportCamera();
    proj.frameViewport(cam, view.w, view.h, r);
    const px = (obj) => {
      let top = Infinity; let bottom = -Infinity;
      const v = new THREE.Vector3();
      obj.updateMatrixWorld(true);
      obj.traverse((m) => {
        if (!m.isMesh || m.userData.noFit) return;
        for (let o = m; o; o = o.parent) if (!o.visible) return;
        const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).project(cam);
          const y = (1 - v.y) / 2 * view.h;
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      });
      return { top, bottom, h: bottom - top };
    };
    const vp = px(hero.view);
    const hp = px(world.objects.D01);
    return {
      viewport: [view.w, view.h],
      rect: Object.fromEntries(Object.entries(r).map(([k, x]) => [k, +x.toFixed(1)])),
      camera: proj.describe(),
      vanessaShare: +((ve.bottom - ve.top) / 100).toFixed(4),
      vanessaFeetV: +ve.bottom.toFixed(2),
      vanessaHeadV: +ve.top.toFixed(2),
      houseShare: +((he.bottom - he.top) / 100).toFixed(4),
      houseToVanessa: +((he.bottom - he.top) / (ve.bottom - ve.top)).toFixed(3),
      px: { vanessa: +vp.h.toFixed(1), house: +hp.h.toFixed(1), vanessaShareOfRect: +(vp.h / r.h).toFixed(4), houseToVanessa: +(hp.h / vp.h).toFixed(3) },
      fits: world.fits,
      speed: SPEED,
      mPerU: { atVanessa: +proj.metresPerU(56, 81).toFixed(3), atHouseMat: +proj.metresPerU(41, 52).toFixed(3), atCornMat: +proj.metresPerU(60, 52.5).toFixed(3) },
    };
  }
  function debugReadout() {
    const el = $('debug');
    if (!el.hidden && performance.now() - (debugReadout.t ?? 0) > 500) {
      debugReadout.t = performance.now();
      const p = hero.body.position;
      el.textContent = `fps ${loop.fps.toFixed(1)} (software rendering is not phone performance) · pos ${p.x.toFixed(2)},${p.z.toFixed(2)} · active ${(data.ledger.activeMs / 1000).toFixed(1)} s · paused ${loop.reasons.join(',') || 'no'}`;
    }
  }
  if (DEBUG) {
    $('debug').hidden = false;
    window.__farm = {
      get ledger() { return data.ledger; }, get data() { return data; }, renderer, scene, commit, ix, hero, world, proj, rig, loop, measure, saves, cards, input, coach,
      audio, get highlight() { return highlight; }, get coachState() { return coachState; }, get tut() { return tut; },
      teleport(u, v) { const g = proj.groundAt(u, v); hero.place(g.x, g.z); rig.snap = true; },
      place(x, z) { hero.place(x, z); rig.snap = true; },
      enterWhole, leaveWhole, start, openPause, doDiy, doYardSale, tapWorld,
      fps: () => loop.fps,
      // v0.26: the frame budget now ('full' | 'idle' | 'hold'), the screen's callbacks, the frames
      // worked and the scene draws submitted since the start, and the switches (core/perf.js)
      perf: () => ({ mode: loop.mode, asleep: loop.asleep, ...loop.counts, draws, fps: +loop.fps.toFixed(1), switches: { ...PERF } }),
      // deterministic world time for automated checks: runs the same world step the loop runs
      advance(ms, frame = 50) { for (let t = 0; t < ms; t += frame) if (!loop.paused) worldStep(frame); },
      walkTo(u, v, { maxMs = 30000, tol = 0.2 } = {}) {
        const g = proj.groundAt(u, v);
        let t = 0;
        for (; t < maxMs; t += 50) {
          const p = hero.body.position;
          const dx = g.x - p.x; const dz = g.z - p.z; const d = Math.hypot(dx, dz);
          if (d < tol) break;
          debugSteer = new THREE.Vector2(dx / d, -dz / d).multiplyScalar(Math.min(1, 0.3 + d));
          worldStep(50);
        }
        debugSteer = null;
        worldStep(50);
        const p = hero.body.position;
        return { ms: t, dist: +Math.hypot(g.x - p.x, g.z - p.z).toFixed(2) };
      },
      steer(x, y) { debugSteer = x === null ? null : new THREE.Vector2(x, y); },
      freeze(on = true) { frozen = on; },
      // presentation check only: show given carried counts without a transaction (never saved)
      showCarried(c) { debugCarried = c; hero.setCounts(c); hud.render({ ...data.ledger, carried: c }); },
      // build stages through the real transactions, funding them from nothing first (a cheat
      // for checks only). Missing prerequisites,
      // weeds (with the rake) and the stage's dig spots (with the shovel) are done too.
      // -> the stages committed, in order
      build(...stages) {
        const done = [];
        const rake = (ids) => { for (const w of ids) if (!data.ledger.weeds[w]) { if (data.ledger.tool !== 'rake') commit({ t: 'takeTool', tool: 'rake' }); commit({ t: 'clearWeed', id: w }); } };
        const one = (st) => {
          if (data.ledger.stages[st].committed) return;
          for (const p of STAGES[st].prereq) {
            if (p === 'first') one(data.ledger.crop ? BASE_STAGE[data.ledger.crop] : 'C0'); // corn unless chosen
            else if (p === 'second') {
              if (['C0', 'S0', 'T0'].filter((b) => data.ledger.stages[b].committed).length < 2) one(['C0', 'S0', 'T0'].find((b) => !data.ledger.stages[b].committed));
            } else one(p);
          }
          // a crop plot that waits for the first harvest: the cheat marks it harvested
          if (STAGES[st].afterHarvest && !isFirstCrop(data.ledger, st) && data.ledger.crop && !data.ledger.harvested) data.ledger = { ...data.ledger, harvested: true };
          rake(STAGES[st].weeds ?? []);
          const need = recipe(data.ledger, st);
          const y = data.ledger.yard; // (v0.32: at the pile, where the first DIY takes them from)
          data.ledger = { ...data.ledger, purse: data.ledger.purse + need.coins, yard: { ...y, W: y.W + need.W, R: y.R + need.R }, since: { sales: 1, gather: 2 } }; // (v0.29: and the pacing gate met)
          if (need.coins + need.W + need.R > 0) commit({ t: 'build', stage: st });
          settleLedger(); // a free stage (her first crop) commits here
          if (!data.ledger.stages[st].committed) return;
          done.push(st);
          rake(plotWeeds(st));
          for (const id of Object.keys(data.ledger.nodes)) {
            if (data.ledger.nodes[id].dug) continue;
            if (!NODES[id] || NODES[id].stage !== st) continue;
            if (data.ledger.tool !== 'shovel') commit({ t: 'takeTool', tool: 'shovel' });
            commit({ t: 'dig', id });
          }
          settleLedger(); // the idle tool goes back
        };
        for (const st of stages.length ? stages : STAGE_ORDER) one(st);
        return done;
      },
      finale, sunset, prefs, toggleBlueprint, opening, paper, hammering, burst, hud, get diyState() { return diyState; }, diyHint,
      hunt, openSongbook, notes, songCard, archerSays, race, holdGoal, get diyTime() { return diyTime; }, get roofClimb() { return roofClimb; }, get goal() { return goal; }, placeSpeech, birds, doWave, credits, showCompleted, keepExploring, songs, pickEgg, startMoment, findKeepsake, openKeepsakes, showDrawing, openExtras, closeExtras, closePause, resetHunt() { world.clearEggs(); Object.assign(hunt, { busy: false, egg: null, id: null, restMs: 0, moment: null }); },
      holdBurst(on = true) { burstHeld = on; },
      get houseVisit() { return houseVisit; },
      giveaway, startGiveaway,
      looks: () => world.looks(),
    };
  }
  loop.start();
  launch();
}

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('fatal');
  el.hidden = false;
  el.textContent = `The farm could not start: ${err.message}`;
});
