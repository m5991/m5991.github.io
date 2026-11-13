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
import * as THREE from 'three';
import { PERF } from './core/perf.js';
import { createWakeLock } from './core/wake-lock.js';
import { createLoop } from './core/loop.js';
import { ModelRegistry } from './core/models.js';
import { Tweens } from './core/tween.js';
import { ARCHER_LINES, BASE_STAGE, BIRDS, CAPACITY, DWIGHT_THANKS, dwightLine, HAMMERED, HEAD_CROPS, HOUSE_STAGES, isYardWeed, NODES, TABLE_STAGES, lineText, RESOURCE_NAMES, RESOURCE_UNIT, ROCKS, STAGES, STAGE_ORDER } from './game/data.js';
import {
  apply, autoTxs, available, canTake, crateCount, sourceResource, mainComplete, plotWeeds, isFirstCrop, recipe, restockReady, saleReady, saleWish,
  tableCap, tables, toolIdle,
} from './game/ledger.js';
import { createBirds } from './game/birds.js';
import { createCredits } from './ui/credits.js';
import { createSongPlayer, fmtTime } from './ui/songplayer.js';
import { createBeat, lowEnergy } from './audio/beat.js';
import { eveningAt, sinceFinish } from './game/evening.js';
import { KEEPSAKES, KEEPSAKE_IDS, KEEPSAKE_REACH_M, foundKeepsakes, keepsakeLine, keepsakePrints, keepsakesLeft, visibleKeepsakes } from './game/keepsakes.js';
import { bubblePlace } from './ui/bubble.js';
import { createRace, fmtRace, raceClock } from './game/race.js';
import { drawPostcard, postcardStats, sharePostcard, statsItems, statsLine } from './ui/postcard.js';
import { createDiyHint } from './game/hints.js';
import { PATCH_NAME, PLACE_LABEL, SHORT_LABEL, spotStatus, WOOD_PILES, WOOD_SOURCES } from './game/guide.js';
import { eggPhase, found, foundCount, foundSongs, huntGoal, lastSongTurn, lastSongWaits, mp3Name, mp3Path, nextEgg, previewStart, songLyric, songNumber, songSpot, songTitle, songsFor, spotAct, SPOTS, sunoLink, visibleSpots } from './game/songs.js';
import { createNotes, onePill, quietCoach } from './ui/voices.js';
import { Hammering } from './world/build.js';
import { wishWords } from './world/world.js';
import { createBurst } from './ui/burst.js';
import { applyTheme } from './ui/theme.js';
import * as G from './world/greybox.js';
import { createPrefs } from './game/prefs.js';
import { Finale, FINALE_YAW } from './world/finale.js';
import { Sunset } from './world/sunset.js';
import { eveningLight, everythingFound, SAYS_AFTER_MS, saysAfter, SIGNATURE, STAMP, SUNSET_AFTER_MS, sunsetDue } from './game/sunset.js';
import { Opening } from './world/opening.js';
import { freshFarm, playsOpening, saveNotice, WELCOME, welcomeDue } from './game/opening.js';
import { createPaper } from './ui/paper.js';
import { createSaveData, createSaveManager } from './game/save.js';
import {
  atSellingSide, buildBarAt, createInteraction, HIGHLIGHT_RANGE_M, idleWeed, inReach, isMoving, pickHighlight, SALE_REACH_M, toolBlocked, wantedTool,
} from './game/interaction.js';
import { nextGoal } from './game/guide.js';
import { coachPrompt, dropLesson, guideTargets, kindOf, learned, LINGER_MS, MOVED_M, routineGather, tutorialStep } from './game/tutorial.js';
import { fitRect, PRESETS, Projection, projectedExtent } from './world/projection.js';
import { endCardFrame, finaleRect, mixRect } from './world/framing.js';
import { World } from './world/world.js';
import { Hero, RUN_SPEED } from './world/hero.js';
import { CameraRig } from './world/camera.js';
import { outlines } from './world/greybox.js';
import { configureShadows, setLookResolution } from './world/look.js';
import { VANESSA_START } from './world/layout.js';
import { createHud } from './ui/hud.js';
import { createCards } from './ui/cards.js';
import { createInput } from './ui/input.js';
import { stackCap, STACK_BASE_Y } from './world/stackmath.js';
import { arrowPlacement, createCoach } from './ui/coach.js';
import { createAudio } from './audio/audio.js';
import { createSfx, LAND_CUE, ledgerCue, SFX_PATH, sfxFiles } from './audio/sfx.js';

const params = new URLSearchParams(location.search);
const preset = { ...PRESETS[params.get('cam') === 'ortho' ? 'ortho' : 'persp'] };
if (params.has('pitch')) preset.pitchDeg = Number(params.get('pitch'));
if (params.has('fov') && preset.type === 'perspective') preset.fovDeg = Number(params.get('fov'));
outlines.enabled = params.get('outline') !== '0';
const DEBUG = params.has('debug');
// v0.16 the hunt: how near a spot (m) calls the bird, how near the landed egg picks it up, where
// the rest between two eggs (ms); the egg lands a step from her (world.freeSpotNear)
const HUNT = { spotM: 0.65, pickM: 0.75, restMs: 2500 };
const SPEED = params.has('speed') ? Number(params.get('speed')) : RUN_SPEED;
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
  let burstHeld = false; // test hook (?debug=1): hold the burst's frame for a screenshot
  const rig = new CameraRig(proj);
  world.heroPos = () => hero.position; // flat parts wash outward from where she works
  world.camera = rig.camera; // the hunt's sparkles face it
  // the sheet she holds up in two of the hunt's moments carries the drawing itself (hero.js)
  hero.drawingTexture = (mat) => new THREE.TextureLoader().load('assets/reference/drawing.jpg', (tex) => { tex.colorSpace = THREE.SRGBColorSpace; mat.map = tex; mat.needsUpdate = true; });

  // ---------- state, saves ----------
  const saves = createSaveManager(safeStorage());
  let data = createSaveData();
  let lastSaveAt = 0;
  const hud = createHud();
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
  const inHunt = () => eggPhase(data.ledger) && session.playing && !finale.active && !sunset.active && !finaleDue && !opening.active && rig.mode !== 'whole';
  // v0.25: every song and every keepsake is found (every action with them: a song is found by its action)
  const allFound = () => everythingFound(data, songsFor(), KEEPSAKE_IDS);
  // v0.27: the circles out now. The last song's ("I gave it to the world") comes out when every
  // other song and every keepsake is found (songs.js LAST_SONG), so it is always the last find.
  const keepsakesDone = () => keepsakesLeft(data.keepsakes ?? {}).length === 0;
  const spotsNow = () => visibleSpots(data.discoveries, undefined, { othersFound: keepsakesDone() });
  function spotHere(heroXZ) {
    // (v0.23: only the few spots on show have their action)
    for (const id of spotsNow()) {
      world.eggSpotPos(id, tmpH);
      if (Math.hypot(tmpH.x - heroXZ.x, tmpH.z - heroXZ.z) <= world.spotReach(id)) return id;
    }
    return null;
  }
  const tmpH = new THREE.Vector3();
  function updateHunt(dt, heroXZ) {
    if (!inHunt()) { world.updateEggSpots([], dt); world.updateSpotProps([], false); world.updateEggCircle(null, dt); return; }
    // v0.23 (Tiffany: "have just a few at a time ... replacing each other as she collects them"):
    // the first few spots that still hold a song, each with its red circle (the action); the
    // song itself, the egg on the grass, lies in a yellow one
    const showing = spotsNow();
    world.updateSpotProps(showing, true); // the weeds and the crumpled sketch lie at their spots
    const waiting = hunt.busy || hunt.egg || hunt.moment;
    world.updateEggSpots(waiting ? [] : showing, dt);
    world.updateEggCircle(hunt.egg, dt);
    if (hunt.egg) {
      if (Math.hypot(hunt.egg.position.x - heroXZ.x, hunt.egg.position.z - heroXZ.z) <= HUNT.pickM) pickEgg();
      return;
    }
    if (hunt.busy) return;
    hunt.restMs = Math.max(0, hunt.restMs - dt);
    if (hunt.restMs > 0 || cards.isOpen) return;
    // v0.17c: at a spot, its small moment first (songs.js SPOTS act), then the bird
    const m = hunt.moment;
    if (m) {
      const before = m.ms;
      m.ms += dt;
      for (const [time, cue] of momentCues(m.act.kind, m.act.ms)) if (before < time && m.ms >= time) sfx.cue(cue);
      if (hero.moving) { hunt.moment = null; hero.cancelMoment(); world.cancelSpot(m.spot); return; } // walking off calls it off
      if (m.ms >= m.act.ms) {
        hunt.moment = null;
        const id = nextEgg(data.ledger, { discoveries: data.discoveries, spot: m.spot });
        if (id) bringEgg(id);
      }
      return;
    }
    const spot = spotHere(heroXZ);
    const act = spot && spotAct(spot);
    if (act && $('context').hidden) hud.setContext(act.verb, () => startMoment(spot), 'act');
  }
  // ---------- v0.17c: the keepsakes hidden on the finished farm (game/keepsakes.js) ----------
  let creditsContent = null;
  const loadCreditsContent = () => (creditsContent ??= fetch('assets/credits/credits.json').then((r) => r.json()).catch(() => null));
  function updateKeepsakes(dt, heroXZ) {
    const out = inHunt();
    data.keepsakes ??= {};
    // v0.23: a few at a time, each bouncing where it lies
    const shown = visibleKeepsakes(data.keepsakes);
    world.updateKeepsakes(dt, { out, found: data.keepsakes, shown });
    if (!out || cards.isOpen || hunt.moment) return;
    for (const id of shown) {
      const p = world.keepsakePos(id);
      if (p && Math.hypot(p.x - heroXZ.x, p.z - heroXZ.z) <= KEEPSAKE_REACH_M) { findKeepsake(id); break; }
    }
  }
  function findKeepsake(id) {
    data.keepsakes = { ...data.keepsakes, [id]: data.ledger.activeMs };
    persist(); // kept before it is shown
    world.pickKeepsake(id);
    sfx.cue('complete');
    hud.announce(`Found a keepsake: ${KEEPSAKES[id].label}`);
    setTimeout(() => keepsakeCard(id), reducedMotion() ? 150 : 650);
  }
  async function keepsakeCard(id) {
    if (cards.isOpen || !session.playing) { setTimeout(() => keepsakeCard(id), 800); return; }
    const c = await loadCreditsContent();
    input.release(); hero.halt(); loop.pause('card');
    const n = foundKeepsakes(data.keepsakes).length;
    cards.prints({
      title: `Found: ${KEEPSAKES[id].label}`,
      text: `One of Vanessa's gift jokes, hidden on the farm. ${keepsakeLine(data.keepsakes)}.`,
      prints: keepsakePrints(id, c),
      left: n < KEEPSAKE_IDS.length ? 'Another one is out on the farm now.' : 'That was the last one. Extras → Keepsakes shows them all.',
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
      text: found.length ? 'The gift jokes found on the farm.' : 'Five of Vanessa\'s gift jokes lie about the finished farm, a couple at a time. Each one you find is kept here.',
      prints: found.flatMap((id) => keepsakePrints(id, c)),
      left: left.length && lastSongTurn(data.discoveries) ? `Hints: ${left.map((id) => KEEPSAKES[id].hint).join(' ')}` : left.length ? `${left.length} still hidden.` : '',
      cancel: 'Close',
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
  const DRAWING = { src: 'assets/reference/drawing.jpg', download: 'The Farm, the drawing.jpg', postcard: 'The Farm postcard.png' };
  const farmStats = () => postcardStats({
    ledger: data.ledger, session: data.session,
    songsFound: foundCount(data.discoveries), songsTotal: songsFor().length,
    keepsakesFound: foundKeepsakes(data.keepsakes ?? {}).length, keepsakesTotal: KEEPSAKE_IDS.length,
    complete: allFound(), // v0.25: the signature and the gold stamp
  });
  function showDrawing() {
    const stats = farmStats();
    cards.picture({
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
      onShare: async (img, say) => {
        const canvas = drawPostcard(document.createElement('canvas'), img, stats);
        const how = await sharePostcard(canvas, { name: DRAWING.postcard, title: 'The Farm', text: statsLine(stats) });
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
  function songEnergy() {
    const el = songs.element;
    const ctx = audio.context;
    if (!el || !ctx || el.muted) return null;
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
    if (kind === 'pockets') return [[ms * 0.45, 'pop'], [ms * 0.6, 'coin']];
    if (kind === 'kick') return [[ms * 0.3, 'step'], [ms * 0.55, 'step'], [ms * 0.8, 'step']];
    return [];
  }
  function startMoment(spot) {
    if (hunt.moment || hunt.busy || hunt.egg) return;
    const act = spotAct(spot);
    hunt.moment = { spot, act, ms: 0 };
    ix.reset();
    hero.halt();
    // she turns to the thing the act is about (the tree, the sun, the corn; the camera for a pose)
    const face = world.spotFacing(spot, hero.position, rig.camera);
    if (face !== null) hero.yawTarget = face;
    hero.startMoment(act.kind, { ms: act.ms, ...world.spotStage(spot, hero.position) });
    world.spotPoke(spot, act, hero.position);
    sfx.cue(act.kind === 'door' ? 'knock' : 'cue');
    hud.setContext(null, null);
    hud.announce(`${act.verb}: ${act.word}`);
  }
  function bringEgg(id) {
    // the egg lands a step from her, on the camera's side, clear of the farm's footprints
    const at = world.freeSpotNear(hero.position);
    hunt.busy = true;
    hunt.id = id;
    // its song is loaded by the time the egg is picked up (not over a song that is playing)
    if (audio.settings.soundEnabled) songs.prepare({ id, src: mp3Path(id), from: previewStart(id) });
    hud.announce(`A bird is coming from ${SPOTS[songSpot(id)].label}`);
    world.eggDrop(at, hunt.eggs++).then((egg) => { sfx.cue('eggDrop'); hunt.egg = egg; hunt.busy = false; });
  }
  function pickEgg() {
    const id = hunt.id;
    const egg = hunt.egg;
    hunt.egg = null; hunt.id = null; hunt.restMs = HUNT.restMs;
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
  // and be downloaded under the extras page"): all 24, in her order, each with Play, Download MP3
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
    const area = sunset.active ? { left: 0, right: view.w, top: 0, bottom: signTop() } : { left: 0, right: view.w, top: live.playTop || live.hudBottom, bottom: live.ctlTop || view.h };
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
  const benchSpot = () => world.benchSeat(new THREE.Vector3());
  function birdCtx(heroXZ) {
    const l = data.ledger;
    return {
      l,
      hero: heroXZ,
      nodePos: (id) => world.stations[id]?.pos,
      bench: (() => { const b = benchSpot(); return { x: b.x, z: b.z }; })(),
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
    return hero.stack.count ? hero.stack.topWorld(birdAt) : birdAt.copy(hero.position).setY(1.9);
  }
  function updateBirds(dt, heroXZ) {
    const acts = birds.update(dt, birdCtx(heroXZ));
    for (const act of acts) {
      switch (act.a) {
        case 'turn': commit({ t: 'birdTurn' }); break;
        // v0.20 (audit 3): a bird at a plant Dwight guards is his: no warning to act on, only its chirp
        // (v0.23: nor for a bird that only visits the finished farm: it takes nothing)
        case 'warn': if (!act.guarded && !act.harmless) { hud.urgent(act.text, BIRDS.warnMs + 1500); hud.announce(act.text); } sfx.cue('chirp'); break;
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
        case 'leave': if (act.why === 'wave') world.birdShoo(); break;
        default:
      }
    }
    const st = birds.state;
    world.updateBird(dt, st, birdTarget(st.target));
    if (waveBtn.hidden === birds.wavable) waveBtn.hidden = !birds.wavable;
  }
  // a free Wave (the Wave button, E / Space while a bird threatens, or a tap on the bird)
  function doWave() {
    if (!birds.wave()) return;
    hero.celebrate(900);
    world.birdShoo();
    sfx.cue('squawk');
    hud.announce('Shoo! The bird flies off with nothing');
    $('btn-wave').hidden = true;
  }
  $('btn-wave').onclick = doWave;

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
    songs.subscribe((st) => {
      bar.hidden = !st.id;
      if (!st.id) return;
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

  // The bench stain: a visible cloth swipe clears it over BIRDS.cleanMs.
  function updateCleaning(dt) {
    if (!cleaning) return;
    if (hero.moving || !data.ledger.theft.stain) { cleaning = null; hero.cancelMoment(); world.cleanBenchVisual(0); return; }
    cleaning.ms += dt;
    world.cleanBenchVisual(cleaning.ms / BIRDS.cleanMs);
    if (cleaning.ms >= BIRDS.cleanMs) { cleaning = null; commit({ t: 'cleanBench' }); }
  }

  // (v0.24: the rake that has come to her hand for a weed the farm does not ask for, on the open
  // grass or on a patch not open yet, stays until that weed is raked: the ledger's "idle tool goes
  // back" waits)
  const rakingGrass = () => data.ledger.tool === 'rake' && !!ix.working && idleWeed(data.ledger, ix.working);
  function settleLedger() {
    for (let guard = 0, next = autoTxs(data.ledger); next.length && guard < 20; next = autoTxs(data.ledger), guard++) {
      // (v0.25: the tables fill from the crate once the buyers have gone: `saleShowing`)
      const tx = next.find((t) => !(t.t === 'returnTool' && rakingGrass()) && !(t.t === 'restock' && saleShowing));
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
          notes.once('full-mat', `${cap(RESOURCE_NAMES[e.res])} full: Vanessa carries ${CAPACITY} at most. Walk past the pile by the house to drop it.`, 3200);
          break;
        case 'headFull':
          // v0.25: her head holds one table's worth of crops; told once, the first time it is full
          hud.announce(`${HEAD_CROPS} crops on her head: the rest goes into the crate`);
          notes.once('crate', `Vanessa carries ${HEAD_CROPS} crops. What she picks now goes into the crate by the yard-sale tables, and the tables fill up from it.`, 5200);
          break;
        case 'crated': {
          // v0.25: past what her head holds, the crop flies from its plant to the crate by the tables
          const from = stationPos(e.src).setY(0.5);
          const to = world.crateTopWorld();
          const ms = Math.round(Math.min(900, 380 + from.distanceTo(to) * 45));
          world.expect('crate', e.res);
          world.pulse(e.src);
          const landing = world.flight(e.res, from, to, ms).then(() => { world.landed('crate', e.res); sfx.cue('pop'); });
          crateLanding = Promise.all([crateLanding, landing]);
          hud.announce(`${cap(RESOURCE_UNIT[e.res])} into the crate: ${e.crate}`);
          break;
        }
        case 'restocked': {
          // v0.25: the tables fill up again from the crate, one crop every 70 ms, once whatever was
          // on its way into the crate has landed there
          const before = l.table.C + l.table.S + l.table.T - (e.n.C + e.n.S + e.n.T);
          const order = [];
          for (const c of ['T', 'S', 'C']) for (let k = 0; k < e.n[c]; k++) order.push(c);
          order.forEach((c) => world.expect('table', c));
          const total = order.length;
          crateLanding.then(() => {
            order.forEach((c, i) => {
              world.tweens.wait(i * 70).then(() => world.flight(c, world.crateTopWorld(), world.tableSlotWorld(c, before + i), 300)).then(() => { world.landed('table', c); if (i % 2 === 0) sfx.cue('sell'); });
            });
          });
          const n = l.table.C + l.table.S + l.table.T;
          hud.announce(n >= tableCap(l) ? `${total} from the crate: every table is full, time for a yard sale` : `${total} from the crate onto the table${tables(l) > 1 ? 's' : ''}: ${n} of ${tableCap(l)}`);
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
            notes.once('yardweed', 'The weeds on the open grass grow straight back. Rake them if you like: they harm nothing.', 4600);
            hud.announce('The weed on the grass has grown back');
          }
          break;
        case 'ready':
          world.regrowCrop(e.src); // a crop a bird took is back on its plant (v0.23)
          break;
        case 'cropChosen':
          // her first crop, for good: it themes every card and menu (P27-7)
          applyTheme(e.crop);
          hud.announce(`Your first crop: ${PATCH_NAME[e.crop]}`);
          // (v0.21: the news only; what to do next is the goal line's)
          hud.toast(`${cap(PATCH_NAME[e.crop])} it is! Your first patch is free.`, 3600);
          break;
        case 'firstHarvest':
          hud.toast('First harvest! The other two crop patches are open now.', 4200);
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
          }).then(() => { saleShowing = false; settleLedger(); }); // (v0.25: now the tables fill up from the crate)
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
          hud.toast(`A ${what} plant wilted under the weeds. Replanting it is free.`, 4200);
          hud.announce(`A ${what} plant wilted`);
          break;
        }
        case 'stolen': {
          // v0.17 (§7): the loss by the HUD, said politely. v0.22: from a plant the bird takes its
          // whole ripe crop, and the plant grows it again
          const unit = RESOURCE_UNIT[e.res];
          const what = e.from === 'carried' ? `−1 ${unit}: a bird took it from your head` : `A bird flew off with ${e.n > 1 ? `${e.n} ${RESOURCE_NAMES[e.res]}` : `a ${unit}`}: that plant has to grow ${e.n > 1 ? 'them' : 'it'} again`;
          if (e.from === 'carried') hud.bump(e.res);
          // (v0.21: the loss each time; the advice once)
          if (!notes.once('stolen', `${what}. Wave birds off, or hire an archer to guard the crops.`, 4600)) hud.toast(`${what}.`, 3000);
          hud.announce(e.from === 'carried' ? `A bird took one ${unit}` : `A bird flew off with the ${PATCH_NAME[e.res]} from one plant`);
          break;
        }
        case 'stained':
          hud.toast('A bird left a mess on the bench.', 3000); // (v0.21: the bench's circle and its Clean button say the rest)
          hud.announce('A bird left a mess on the bench');
          break;
        case 'benchCleaned':
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
          const climbs = hammered && e.stage === 'H4' && !reducedMotion();
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
          const moreTables = TABLE_STAGES.includes(e.stage) && tables(data.ledger) > Math.max(1, world.tablesShown ?? 1);
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
              const nth = ['', 'first', 'second', 'third'][n] ?? 'new';
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
      const mine = (roofClimb = { stage });
      hero.halt();
      hero.startMoment('roof', { ms: total, route: world.roofRoute(), up: ROOF.upMs / total, down: ROOF.downMs / total });
      world.tweens.wait(ROOF.upMs).then(() => {
        if (roofClimb !== mine || hero.moment?.kind !== 'roof') return;
        hammering.start(stage, ms, null); // no hop: she is on the roof
        hammering.faceTo = world.chimneyPoint();
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
    hud.toast(`A neighbour asks for the next yard sale: “${wishWords(w)}”`, 4600);
  }
  hammering.onLand = (p) => { sfx.cue('thud'); world.puff(new THREE.Vector3(p.x, 0, p.z), { scale: 1.1 }); };
  hammering.onStrike = (i) => {
    sfx.cue('tock');
    if (roofClimb) { // on the roof: the ticks and the dust are at the chimney itself
      if (i === 0) { tmpP.copy(hero.position).project(rig.camera); burst.show(tmpP.x < 0 ? -1 : 1); }
      const top = world.chimneyPoint(tmpS);
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
  function diyAway(bar) {
    diyHint.nudge();
    const where = STAGES[bar.stage]?.label && HOUSE_STAGES.includes(bar.stage) ? 'the house' : `the ${bar.label}`;
    hud.toast(`${PLACE_LABEL[bar.stage] ?? cap(bar.label)}: all here. Follow the arrow to ${where}`, 3000);
  }
  function doDiy(stage) {
    const r = commit({ t: 'build', stage });
    if (r.ok) sfx.cue('confirm');
    else hud.toast(r.reason === 'short' ? 'Not everything is here yet.' : 'This cannot be built yet.');
  }
  let saleShowing = false;
  let crateLanding = Promise.resolve(); // v0.25: the crops still flying into the crate (a restock waits for them)
  let finaleDue = false; // the home is built and its finale has not played yet (it follows the DIY)
  // v0.15: she sells from behind the tables, their north side (interaction.js atSellingSide)
  function atTheTable() {
    const hp = { x: hero.body.position.x, z: hero.body.position.z };
    return atSellingSide(hp, ctxTargets);
  }
  function doYardSale() {
    if (saleShowing || !saleReady(data.ledger)) return;
    if (!atTheTable()) {
      const hp = { x: hero.body.position.x, z: hero.body.position.z };
      const near = ctxTargets.some((x) => x.kind === 'table' && inReach(hp, x, SALE_REACH_M));
      hud.toast(near ? 'Yard Sale: go round to the back of the tables.' : 'Yard Sale: go to the back of the tables.', 2200);
      return;
    }
    commit({ t: 'yardSale' });
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
      if (birds.wavable) doWave(); // v0.17: a bird first
      else if (hud.diyHere) hud.triggerDiy();
      else if (hud.saleShown) hud.triggerSale();
      else if (!$('context').hidden) hud.triggerContext();
      else if (hud.diyShown) hud.triggerDiy(); // away from the part: show the way
    },
    onTap: (x, y) => tapWorld(x, y),
    onEscape: () => { if (cards.isOpen) return; if (credits.active) { credits.skip(); return; } if (!completedEl.hidden) { keepExploring(); return; } if (!extrasEl.hidden) { closeExtras(); return; } if (!pauseEl.hidden) { closePause(); return; } if (opening.active) return; if (sunset.active) { sunset.skip(); return; } if (finale.active) { finale.skip(); return; } if (rig.mode === 'whole') { leaveWhole(); return; } if (session.playing) { if (atTheEnd()) openExtras(); else openPause(); } },
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
    hero.setInput(debugSteer ?? input.read());
    hero.preStep(dt);
    world.physics.step(1 / 60, dt / 1000, 5);
    // v0.26: the ledger's clock takes whole milliseconds; what a frame's time leaves over is
    // carried to the next, so the clock keeps real time at any frame rate (v0.25 rounded each
    // frame: 17 for 16.7 at 60 a second, 8 for 8.3 at 120, so the farm's clock ran 2% fast on one
    // screen and 4% slow on another)
    tickCarry += dt;
    const tickMs = Math.floor(tickCarry);
    tickCarry -= tickMs;
    commit({ t: 'tick', ms: tickMs, calm: data.settings.helpMeFinish });
    world.updateBranch(dt);
    ctxTargets = world.targets(data.ledger, ledgerRev);
    const heroXZ = { x: hero.body.position.x, z: hero.body.position.z };
    goal = goalFor(data.ledger, heroXZ);
    toolCtx = { want: wantedTool(data.ledger, goal, heroXZ, ctxTargets), toolsComeToMe: data.settings.helpMeFinish }; // Help me finish brings every tool (P29-7)
    // (v0.22: nor during a song spot's moment: she is doing that, not gathering what lies near)
    // (v0.23: nor while she climbs to the chimney, or down from it)
    if (roofClimb && (hero.moving || hero.moment?.kind !== 'roof')) { roofClimb = null; if (hero.moment?.kind === 'roof') hero.cancelMoment(); }
    const building = hammering.active || !!roofClimb;
    const evs = building || hunt.moment ? [] : ix.update(dt, { hero: heroXZ, moving: hero.moving, speed: hero.groundSpeed, targets: ctxTargets, tableBusy: saleShowing, ...toolCtx });
    for (const e of evs) handleIxEvent(e);
    // (v0.25: a table has room and the crate holds crops, e.g. after a sale's show was cut short)
    if (!saleShowing && restockReady(data.ledger)) settleLedger();
    // (v0.24: she walked off from a weed nobody asked for before raking it: the rake goes back)
    if (data.ledger.tool !== null && !ix.working && toolIdle(data.ledger)) settleLedger();
    const working = hunt.moment ? null : ix.working;
    if (hammering.active && hero.moving) hammering.stop(); // moving away never undoes the build
    const faceTo = working ? working : hammering.active ? hammering.faceTo : null;
    // v0.23 (Tiffany: "When she is shoveling or raking make an animation of her doing it"): with
    // the rake at a weed or the shovel at a spot she works with it, stroke by stroke
    const doing = working ? ix.workDoing : null;
    const toolWork = doing === 'clearWeed' && data.ledger.tool === 'rake' ? 'rake' : doing === 'dig' && data.ledger.tool === 'shovel' ? 'shovel' : null;
    hero.update(dt, { working: !!working || hammering.active, faceTo, tool: toolWork, stroke: ix.workProgress });
    hammering.update(dt); // after her pose, so the hammer sits in her fist
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
    const visibleMarkers = building || eggPhase(data.ledger) ? [] : markers;
    // (the bench's stain asks for an action, Clean the bench: its circle is the actions' red one)
    const stainShown = data.ledger.theft.stain && !cleaning && !diyTime && !building;
    if (stainShown) visibleMarkers.push('G2');
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
    updateWhoKnows(dt, heroXZ);
    // v0.25: everything is found: a moment later, "Sunset on the bench" (once per farm)
    // (asked only on a finished farm that has not seen it: nothing is counted on a farm under way)
    if (!data.session.sunsetSeen && mainComplete(data.ledger) && sunsetDue(data, { finished: true, complete: allFound() })
      && inHunt() && !hunt.egg && !hunt.busy && !hunt.moment && !saleShowing && !hammering.active && !cleaning && !birds.busy) {
      sunsetWait += dt;
      if (sunsetWait >= SUNSET_AFTER_MS) { sunsetWait = 0; sunset.start(); }
    } else sunsetWait = 0;
    // v0.17c: with every song found, the goal line counts the keepsakes and gives the next hint
    // (v0.27: with only the last song left, which waits for the keepsakes, the line is the keepsakes')
    const allSongs = foundCount(data.discoveries) >= songsFor().length || lastSongWaits(data.discoveries, keepsakesDone());
    const nextKeep = keepsakesLeft(data.keepsakes ?? {})[0];
    // v0.21 (audit 5): one line, icon-first; in the hunt the counter row is the songs found of all
    // (and the keepsakes, once one is found), so the line does not count them again
    const hunting = eggPhase(data.ledger) && !finaleDue; // (v0.23: not while the last build is still going up)
    hud.setHunt(hunting ? { found: foundCount(data.discoveries), total: songsFor().length, keepsakes: foundKeepsakes(data.keepsakes ?? {}).length, keepsakesTotal: KEEPSAKE_IDS.length } : null, HUNT_TAPS);
    // (v0.23, audit 8: after a build the line holds its "✓ Walls!" for a beat)
    if (goalBeat) { goalBeat.ms -= dt; if (goalBeat.ms <= 0) goalBeat = goalBeat.then ?? null; }
    hud.setRace(data.session.race ? fmtRace(raceClock(data.ledger, data.session)) : null, mainComplete(data.ledger));
    hud.setGoal(goalBeat ? goalBeat.goal : !hunting ? goal
      : allSongs && nextKeep ? { text: `${keepsakeLine(data.keepsakes)}. ${KEEPSAKES[nextKeep].hint}${foundCount(data.discoveries) < songsFor().length ? ' The last song comes when every keepsake is found.' : ''}`, line: { icon: 'gift', label: KEEPSAKES[nextKeep].hint, wrap: true } }
        : allSongs ? { text: `Every song and every keepsake found.`, line: { icon: 'check', label: 'Everything found' } }
          : huntGoal({ discoveries: data.discoveries, othersFound: keepsakesDone(), egg: hunt.egg ? 'landed' : hunt.busy ? 'coming' : hunt.moment ? 'moment' : null }));
    // one pill: the coach's "how" while it teaches, else the status (ui/voices.js)
    const pill = onePill(coachState?.prompt ?? null, statusWant);
    if (coachState) coachState.prompt = pill.coach;
    if (pill.status !== lastProgress) { hud.setProgress(pill.status); lastProgress = pill.status; }
    ledgerSeen = data.ledger;
    if (worldBusy()) activeAt = performance.now(); // v0.26: something moves: the full frame budget
  }
  const HUNT_TAPS = { onSongs: () => openSongbook({ fromPlay: true }), onKeepsakes: () => openKeepsakes({ fromPlay: true }) };
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
    if (hunt.busy || hunt.egg || hunt.moment) return false;
    return spotsNow().some((sp) => near(world.eggSpotPos(sp, tmpS)));
  }
  let statusWant = null; // what the status pill would say (updateContext)

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
    hud.setBuild(bar, bar?.ready ? (bar.here ? () => doDiy(bar.stage) : () => diyAway(bar)) : null);
    // v0.14: yellow at the tables. v0.23 (Tiffany: "when she fills them the yard sale button is
    // highlighted"): yellow from the moment every table is full, wherever she stands
    hud.setSale(saleReady(data.ledger) && !saleShowing && !finale.active && !sunset.active, doYardSale, true);
    // at the tools: the explicit way to take the one the next job needs (P25-4)
    const tools = ctxTargets.find((x) => x.kind === 'tools');
    if (tools && toolCtx.want && inReach(heroXZ, tools)) {
      const tool = toolCtx.want;
      hud.setContext(`Take the ${tool}`, () => { ix.reset(); commit({ t: 'takeTool', tool }); });
    } else if (data.ledger.theft.stain && !cleaning && Math.hypot(benchSpot().x - heroXZ.x, benchSpot().z - heroXZ.z) < 1.9) {
      hud.setContext('Clean the bench', () => { hero.halt(); cleaning = { ms: 0 }; hero.startMoment('clean', { ms: BIRDS.cleanMs, seat: world.benchSeat() }); }, 'act'); // the cloth swipes while she stands still
    } else hud.setContext(null, null);
    // nonmodal status: what Vanessa is doing or why the nearby source is idle
    let text = '';
    const w = ix.working;
    if (w) {
      const doing = ix.workDoing;
      if (doing === 'takeTool') text = `Taking the ${w.kind === 'tools' ? toolCtx.want : w.kind === 'weed' ? 'rake' : 'shovel'}…`;
      else if (w.kind === 'weed') text = isYardWeed(w.id) ? 'Raking the weed… it grows straight back' : 'Clearing weeds…';
      else if (w.kind === 'dig') text = 'Digging…';
      else text = `Gathering ${RESOURCE_UNIT[sourceResource(w.id)]}… ${data.ledger.carried[sourceResource(w.id)]}${crateCount(data.ledger) && ['C', 'S', 'T'].includes(sourceResource(w.id)) ? ` · crate ${crateCount(data.ledger)}` : ''}`;
    } else if (roofClimb && !hammering.active) {
      text = 'Up onto the roof…';
    } else if (hammering.active) {
      text = `DIY time! Building the ${STAGES[hammering.stage].label}…`;
    } else if (cleaning) {
      text = 'Cleaning the bench…';
    } else {
      const need = toolBlocked(data.ledger, heroXZ, ctxTargets, toolCtx);
      if (need && goal.tool !== need) text = `You need the ${need}. It leans by the house.`; // (v0.21: not when the goal line is "Take the rake")
      // (v0.24: no weed waits for its patch to open any more: every weed that stands can be raked)
      // the yard pile, inspected (P27-1)
      const yard = !text && ctxTargets.find((x) => x.kind === 'yard' && inReach(heroXZ, x, 1.2));
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
      if (crate) { const n = crateCount(data.ledger); text = n ? `Crate · ${n} crop${n === 1 ? '' : 's'}. The tables fill up from it.` : 'Crate · empty. What her head cannot take goes in here.'; }
      // v0.17: beside the raised bed's scribble, its name (§10.5: never a botanical one)
      const wk = !text && world.whoKnowsPos(tmpS);
      if (wk && Math.hypot(wk.x - heroXZ.x, wk.z - heroXZ.z) < 0.9) text = 'Who-Knows plant';
      const near = ctxTargets.filter((x) => ['node', 'stick', 'pile', 'rock'].includes(x.kind) && inReach(heroXZ, x));
      for (const n of near) {
        if (text) break;
        const res = sourceResource(n.id);
        if (n.hold) { text = 'A stick is coming down from the tree'; break; }
        if (available(data.ledger, n.id) > 0 && !canTake(data.ledger, res)) { text = `Can't carry more ${RESOURCE_NAMES[res]}: ${CAPACITY} is the most`; break; }
        // v0.20 (audit 2): a spot that is not planted yet is not "Growing" (guide.js spotStatus)
        if (available(data.ledger, n.id) === 0 && n.kind === 'node') { text = spotStatus(data.ledger, n.id) ?? ''; if (text) break; }
      }
      // a wilted plant's spot (spec v0.12 P28-4)
      const re = !text && ctxTargets.find((x) => x.kind === 'dig' && data.ledger.wilted[x.id] && inReach(heroXZ, x, 1.2));
      if (re) text = data.ledger.tool === 'shovel' ? 'Replant: stand still to dig' : 'Replant: dig it with the shovel (it leans by the house)';
    }
    statusWant = text || null; // shown by the world step, unless the coach is teaching
  }

  // v0.12: a tap on the world that lands on the yard-sale stand holds the sale (the captain:
  // "you click the stand is more intuitive")
  function tapWorld(x, y) {
    if (!session.playing || loop.paused) return;
    // v0.17: a tap on (or near) a bird that threatens waves it off
    const bp = birds.wavable && world.birdPos(tmpP);
    if (bp) {
      bp.project(rig.camera);
      if (Math.hypot(((bp.x + 1) / 2) * view.w - x, ((1 - bp.y) / 2) * view.h - y) < 70) { doWave(); return; }
    }
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
    roofClimb = null; goalBeat = null; wishTold = -1; lastBite = null; sunsetWait = 0; tickCarry = 0;
    ledgerRev++; // (v0.26: another farm: nothing kept from the last one)
    showSign(null);
    applyTheme(data.ledger.crop); // her first crop's theme; a new farm starts on plain paper
    if (hammering.active) hammering.stop();
    diyHint.reset();
    burst.hide();
    world.endSale();
    saleShowing = false;
    crateLanding = Promise.resolve();
    world.clearEggs();
    Object.assign(hunt, { busy: false, egg: null, id: null, restMs: 0, moment: null });
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
    showEvening();
    extrasEl.hidden = false;
    extrasEl.scrollTop = 0;
    $('btn-extras-back').focus({ preventScroll: true });
  }
  function closeExtras() { extrasEl.hidden = true; releaseWorld(); $('btn-extras').focus({ preventScroll: true }); }
  // v0.25: once the sunset has played the farm stays in its evening light; this switch in Extras
  // gives the day back (with its own evening now and then, as before), and the evening again
  function showEvening() {
    const b = $('btn-evening');
    b.hidden = !data.session.sunsetSeen;
    const on = !data.session.dayLight;
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.state').textContent = on ? 'on' : 'off';
  }
  $('btn-evening').onclick = () => { data.session.dayLight = !data.session.dayLight; persist(); showEvening(); hud.announce(data.session.dayLight ? 'The day is back on the farm' : 'The evening light stays on the farm'); };
  $('btn-extras').onclick = openExtras;
  $('btn-extras-back').onclick = closeExtras;
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
  $('btn-skip').onclick = () => { if (sunset.active) sunset.skip(); else finale.skip(); };

  // ---------- v0.25: "Sunset on the bench", when everything is found (game/sunset.js) ----------
  // The captain's pick for the end of the postgame: the day turns to golden evening, Vanessa and
  // Dwight sit on the bench, fireflies over the corn, and "The Farm, complete" is pencilled in with
  // a gold 100%. Presentation only (world/sunset.js); it plays once per farm, can be skipped like
  // the finale, and afterwards the evening stays (Extras has the switch for the day).
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
      hud.toast(`${SIGNATURE}: every song and every keepsake found. The evening stays on the farm; Extras has a switch for the day, and The drawing is signed.`, 7000);
      menuButton().focus({ preventScroll: true });
    },
  });
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
    notes.once('hunt', 'Exploring: walk to a red circle and do what it says, and a bird brings a song in a yellow circle. A few show at a time.', 6500);
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
    if (opening.phase === 'waiting') opening.begin();
  };
  paper.onStart(tapOpening);
  $('opening-start').onclick = () => opening.begin(); // Enter or Space on the focused Start control
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
  $('btn-reset').onclick = () => {
    // v0.23 (audit 14): a new farm can be a race: a clock on the way to the finished farm
    // v0.25 (the captain: "New farm also gets the animation"): the opening plays over the new
    // farm, from its page, on the theme started again from its top; her tap on the button is the
    // gesture, so it runs at once
    const fresh = (race) => {
      extrasEl.hidden = true; releaseWorld();
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
      title: 'Start a new farm?',
      text: `This erases the farm: every build, ${data.ledger.purse} coins, the songs and the keepsakes found. The sound settings are kept.`,
      confirm: 'Start a new farm', cancel: 'Keep this farm',
      onConfirm: () => fresh(false),
      extra: 'Start a new farm as a race',
      extraNote: `A race shows a clock until the farm is finished${race.best ? `. Best time on this device: ${fmtRace(race.best)}` : ', and keeps your best time on this device'}.`,
      onExtra: () => fresh(true),
    });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { ix.reset(); input.release(); hero.halt(); loop.pause('hidden'); } else loop.resume('hidden');
    audio.setHidden(document.hidden);
    credits.setHidden(document.hidden);
    if (document.hidden) songs.pause(); // like the theme; Play on the bar picks the song up again
  });

  // ---------- audio (audio/audio.js): the single owner; starts on an explicit gesture ----------
  const audio = createAudio({
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
  const promptBtn = $('audio-prompt');
  const PROMPTS = { enable: 'Tap to enable audio', resume: 'Tap to resume audio' };
  function showAudio() {
    const s = audio.settings;
    for (const b of soundSwitches) {
      b.setAttribute('aria-pressed', String(s.soundEnabled));
      b.querySelector('.state').textContent = audio.state === 'unsupported' ? 'unavailable' : s.soundEnabled ? 'on' : 'off';
      b.disabled = audio.state === 'unsupported';
    }
    for (const el of volMusic) el.value = String(Math.round(s.musicVolume * 100));
    for (const el of volEffects) el.value = String(Math.round(s.effectsVolume * 100));
    const p = audio.prompt;
    promptBtn.hidden = !p;
    if (p) promptBtn.textContent = PROMPTS[p];
  }
  for (const b of soundSwitches) b.onclick = () => { audio.toggleSound(); credits.setSound(audio.settings.soundEnabled); songs.setMuted(!audio.settings.soundEnabled); };
  // (the theme rests while a menu is open; moving its slider lets it play there, so the level is
  // heard as it is set. A found song playing in its place keeps its own hold and plays on.)
  for (const el of volMusic) el.oninput = (e) => { audio.setMusicVolume(Number(e.target.value) / 100); audio.releaseMusic('menu'); };
  for (const el of volEffects) {
    el.oninput = (e) => audio.setEffectsVolume(Number(e.target.value) / 100);
    el.onchange = () => sfx.cue('tick'); // hear the new level on release
  }
  promptBtn.onclick = () => audio.gesture();
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
  for (const t of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(t, () => { audio.gesture(); loadSfx(); songs.unlock(); }, true);
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
    wakeLock.setActive(session.playing && !document.hidden && (credits.active ? !credits.paused : finale.active || sunset.active || (opening.active && opening.phase === 'running') || !loop.paused));
    opening.update(dt);
    finale.update(dt);
    sunset.update(dt);
    credits.update(dt);
    if (backdrop) rig.wholeBlend = 1; // the credits and the completed menu: the drawing's frame
    else if (!finale.active && !sunset.active && !opening.active && rig.wholeBlend > 0) rig.wholeBlend = Math.max(0, rig.wholeBlend - dt / 900); // back to Vanessa
    rig.update(dt, hero.position, view);
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
      ? eveningLight({ cycle: eveningAt(sinceFinish(data.ledger.activeMs, data.session.finishedAt), mainComplete(data.ledger)), scene: dusk ? dusk.evening : null, seen: data.session.sunsetSeen && mainComplete(data.ledger), dayLight: data.session.dayLight })
      : 0;
    world.updateFireflies(dt, dusk ? Math.min(ev, dusk.fireflies) : ev);
    // (v0.26: written when it changes)
    if (ev !== eveningShown) {
      eveningShown = ev;
      $('evening').style.opacity = String(ev.toFixed(3));
    }
    world.updateSky(rig.camera);
    if (rig.mode === 'whole' || !session.playing || finale.active || sunset.active || opening.active || rig.wholeBlend > 0) world.resetFade(); else { world.updateFade(dt, rig.camera, fadePoints(), { solidTrunk: hero.moment?.kind === 'hug' }); updateStackCap(performance.now()); }
    updateCoach();
    if (burst.active || burst.ticking || hammering.active) {
      tmpP.copy(hero.position).setY(1.75).project(rig.camera);
      burst.update(burstHeld ? 0 : dt, { x: ((tmpP.x + 1) / 2) * view.w, y: ((1 - tmpP.y) / 2) * view.h }, { w: view.w, top: live.hudBottom, bottom: live.ctlTop || view.h }, reducedMotion());
    }
    placeYardBadge();
    placeCrateBadge();
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
  const cinematic = () => finale.active || sunset.active || (opening.active && (opening.phase === 'running' || paper.needsCapture));
  const cameraMoving = () => !rig.settled || (rig.wholeBlend > 0 && rig.wholeBlend < 1);
  // v0.27's end card has just come up and the picture is on its way to its place beside it
  const cardSliding = () => backdrop && performance.now() - cardAt < CARD_SLIDE_MS + 100;
  // the world runs and something in it is on the move
  function worldBusy() {
    return hero.moving || hero.groundSpeed > 0.02 || !!hero.moment || !!hero.rise || hero.celebrateMs > 0 || !!ix.working || hammering.active || !!roofClimb
      || tweens.list.length > 0 || saleShowing || hunt.busy || !!hunt.moment || birds.busy || !!cleaning || world.busy || hero.stack.busy
      || burst.active || burst.ticking || songs.state.playing || cameraMoving();
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
          const c = data.ledger.carried;
          data.ledger = { ...data.ledger, purse: data.ledger.purse + need.coins, carried: { ...c, W: Math.max(c.W, need.W), R: Math.max(c.R, need.R) } };
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
