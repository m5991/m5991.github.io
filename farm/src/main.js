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
import * as THREE from 'three';
import { createLoop } from './core/loop.js';
import { ModelRegistry } from './core/models.js';
import { Tweens } from './core/tween.js';
import { BASE_STAGE, CAPACITY, HAMMERED, HOUSE_STAGES, LAST_STAGE, NODES, RESOURCE_NAMES, RESOURCE_UNIT, ROCKS, STAGES, STAGE_ORDER } from './game/data.js';
import {
  apply, autoTxs, available, sourceResource, mainComplete, plotWeeds, weedPresent, weedOpen, isFirstCrop, recipe, saleReady,
  tableCap, tables,
} from './game/ledger.js';
import { createDiyHint } from './game/hints.js';
import { buildBar, PATCH_NAME, WOOD_SOURCES } from './game/guide.js';
import { E21_COINS, found, SONGS, songsDue } from './game/songs.js';
import { Hammering } from './world/build.js';
import { createBurst } from './ui/burst.js';
import { applyTheme } from './ui/theme.js';
import * as G from './world/greybox.js';
import { createPrefs } from './game/prefs.js';
import { Finale, FINALE_YAW } from './world/finale.js';
import { Opening } from './world/opening.js';
import { playsOpening, saveNotice } from './game/opening.js';
import { createPaper } from './ui/paper.js';
import { createSaveData, createSaveManager } from './game/save.js';
import {
  atSellingSide, atSite, createInteraction, HIGHLIGHT_RANGE_M, inReach, isMoving, pickHighlight, SALE_REACH_M, toolBlocked, wantedTool,
} from './game/interaction.js';
import { nextGoal } from './game/guide.js';
import { coachPrompt, dropLesson, kindOf, learned, LINGER_MS, MOVED_M, tutorialStep } from './game/tutorial.js';
import { fitRect, PRESETS, Projection, projectedExtent } from './world/projection.js';
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
const SPEED = params.has('speed') ? Number(params.get('speed')) : RUN_SPEED;
// arrow tip height above each kind of target, metres
const ARROW_H = { weed: 0.75, pile: 0.8, stick: 0.6, rock: 0.75, node: 2.1, site: 0.5, table: 1.05, tools: 1.9, yard: 0.7 };
const $ = (id) => document.getElementById(id);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

async function boot() {
  // the paper is laid out at once, so the title pencils itself in while the farm loads
  const paper = createPaper($('opening'));
  if (document.documentElement.dataset.opening !== undefined) paper.place(window.innerWidth, window.innerHeight);
  // ---------- renderer, scene, lights ----------
  const canvas = $('world');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = params.get('shadows') !== '0';
  // the shared look (world/look.js): toon bands lit by one soft sun from the upper left, soft
  // ink-blue PCF shadows, a paper sky drawn by the world (no clear colour shows)
  const scene = new THREE.Scene();
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
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

  // ---------- state, saves ----------
  const saves = createSaveManager(safeStorage());
  let data = createSaveData();
  let lastSaveAt = 0;
  const hud = createHud();
  const cards = createCards($('card'));
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

  // every accepted transaction is saved before its presentation (spec §12); then the ledger's own
  // follow-ups (C0 committing free as its weeds clear, an idle tool going back) go the same way
  function commit(tx) {
    const r = apply(data.ledger, tx);
    if (!r.ok) return r;
    data.ledger = r.l;
    if (tx.t !== 'tick' || r.events.length) {
      persist();
      present(tx, r.events); // books unit flights first, so their piles fill only as they land
      world.sync(data.ledger, true);
      hud.render(data.ledger);
      settleLedger();
      checkSongs();
    } else if (data.ledger.activeMs - lastSaveAt > 5000) {
      persist(); // active time and position, throttled
    }
    return r;
  }
  // v0.12: a song earned by the ledger (E21: a big purse) is found, saved, then shown: a small
  // fountain of coins over Vanessa and the song's card
  function checkSongs() {
    for (const id of songsDue(data.ledger, data.discoveries)) {
      data.discoveries = { ...data.discoveries, [id]: found(data.ledger) };
      persist();
      later(() => songMoment(id));
    }
  }
  function songMoment(id) {
    if (finale.active) { setTimeout(() => songMoment(id), 1000); return; }
    sfx.cue('complete');
    const top = hero.position.clone().setY(1.9);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const up = top.clone().add(new THREE.Vector3(Math.cos(a) * 0.7, 0.6 + (i % 3) * 0.15, Math.sin(a) * 0.35));
      world.tweens.wait(i * 60).then(() => world.flight('coin', top, up, 420)).then(() => world.flight('coin', up, hero.position.clone().setY(1.2), 380)).then(() => sfx.cue('coin'));
    }
    hud.bump('coins');
    hud.announce(`Song found: ${SONGS[id].title}`);
    setTimeout(() => {
      if (cards.isOpen || !session.playing) return;
      input.release();
      hero.halt();
      loop.pause('card');
      cards.message({
        title: `♪ Song found: “${SONGS[id].title}”`,
        text: `You saved up ${E21_COINS} coins, and someone sang about it. This is the money song, kept in your songs from now on.`,
        cancel: 'Lovely',
        onClose: () => loop.resume('card'),
      });
    }, reducedMotion() ? 300 : 1500);
  }
  function settleLedger() {
    for (let guard = 0, next = autoTxs(data.ledger); next.length && guard < 20; next = autoTxs(data.ledger), guard++) {
      if (!commit(next[0]).ok) break;
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
          hud.toast(`${cap(RESOURCE_NAMES[e.res])} full: Vanessa carries ${CAPACITY} at most.${['C', 'S', 'T'].includes(e.res) ? ' Walk past the yard-sale table to set them out.' : ' Walk past the pile by the house to drop it.'}`, 3200);
          break;
        case 'weedCleared':
          hud.announce('Weeds cleared');
          break;
        case 'cropChosen':
          // her first crop, for good: it themes every card and menu (P27-7)
          applyTheme(e.crop);
          hud.announce(`Your first crop: ${PATCH_NAME[e.crop]}`);
          hud.toast(e.crop === 'T'
            ? 'Tomatoes it is! This patch is free: rake its other weeds, then build its raised bed with sticks.'
            : `${cap(PATCH_NAME[e.crop])} it is! This patch is free: rake its other weeds, then dig it with the shovel.`, 4500);
          break;
        case 'firstHarvest':
          hud.toast('First harvest! The other two crop patches open now: rake their weeds whenever you like.', 4500);
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
          hud.announce(n >= 6 ? `${n} out${Number.isFinite(cap6) ? ` of ${cap6}` : ''}: time for a yard sale` : `On the table: ${n} of 6`);
          if (n >= 6 && !data.session.firstSaleSeen) hud.toast('The table is full! Tap Yard Sale, or the table, to sell it all.', 4200);
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
            onSign: () => sfx.cue('confirm'),
            onCoins: (res, from) => {
              world.flight('coin', from.clone().setY(from.y + 0.2), hero.position.clone().setY(1.2), 380).then(() => { sfx.cue('coin'); hud.bump('coins'); });
            },
          }).then(() => { saleShowing = false; });
          if (!data.session.firstSaleSeen) {
            data.session.firstSaleSeen = true;
            persist();
            hud.toast(`Yard sale! ${e.coins} coins. Coins with wood and stone build everything: the bottom line shows what the next build still needs.`, 5200);
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
          const what = e.stage === 'clump' ? `Weeds in the ${PATCH_NAME[NODES[e.node].res]}: rake them before the plant wilts.` : `Weeds are choking a ${RESOURCE_UNIT[NODES[e.node].res]} plant! Rake them now.`;
          hud.toast(what, 3800);
          hud.announce(what);
          break;
        }
        case 'wilted': {
          const what = RESOURCE_UNIT[NODES[e.id].res];
          world.wilt(e.id);
          hud.toast(`A ${what} plant wilted under the weeds. Replant it: dig its spot with the shovel, for free.`, 4800);
          hud.announce(`A ${what} plant wilted`);
          break;
        }
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
          const first = BASE_STAGE[data.ledger.crop] === e.stage;
          const hammered = HAMMERED.includes(e.stage) && !!world.stations[e.stage];
          if (hammered) startBuilding(e.stage);
          else hero.celebrate(1200);
          hud.announce(HAMMERED.includes(e.stage) ? `DIY time! Vanessa builds the ${s.label}.` : `${cap(s.label)} saved`);
          // the part goes together once she has hopped to it (v0.12)
          const lead = hammered ? Hammering.leadMs(reducedMotion()) : 0;
          if (lead) world.holdReveal(e.stage, data.ledger);
          // v0.13 (P29-5): a house stage brings one more yard-sale table, set up as its DIY ends
          const moreTables = ['H1', 'H2', 'H3'].includes(e.stage) && tables(data.ledger) > (world.tablesShown ?? 1);
          if (moreTables) world.tableHold = true;
          world.tweens.wait(lead).then(() => world.reveal(e.stage, s.workMs, data.ledger)).then(() => {
            sfx.cue('complete');
            if (s.crop && first) hud.toast(`The ${s.label} is ready: dig its two spots with the shovel. The yard-sale table is set up: walk past it with your ${PATCH_NAME[data.ledger.crop]}.`, 4800);
            else if (s.crop) hud.toast(`The ${s.label} is ready: dig its two spots with the shovel.`, 4200);
            if (s.hire) hud.toast('The first elf archer is hired. Archers and birds come in a later build.', 5000);
            if (e.stage === 'H1') hud.toast('Foundation laid! Next: the path, another crop plot and the walls.', 5000);
            if (moreTables) {
              world.tableHold = false;
              world.sync(data.ledger, true); // the new table pops up in dust
              sfx.cue('thud');
              const n = tables(data.ledger);
              hud.toast(n >= 4 ? 'The big yard sale! A fourth table, room for everything, and at every sale two neighbours bring stalls of their own.' : `More neighbours are coming: a ${n === 2 ? 'second' : 'third'} yard-sale table.`, 4200);
            }
            if (e.stage === LAST_STAGE) finale.start(); // the home (v0.15: H5) is saved; last, the drawing gets its colour (P25-2)
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
  function startBuilding(stage) {
    if (hammering.active) hammering.stop();
    ix.reset();
    world.showHeldTool(false);
    const at = world.buildPoint(stage);
    hammering.start(stage, STAGES[stage].workMs, { x: at.x, z: at.z });
    hammering.faceTo = at;
    hero.yawTarget = Math.atan2(at.x - hero.body.position.x, at.z - hero.body.position.z);
  }
  hammering.onLand = (p) => { sfx.cue('thud'); world.puff(new THREE.Vector3(p.x, 0, p.z), { scale: 1.1 }); };
  hammering.onStrike = (i) => {
    sfx.cue('tock');
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
    hud.toast(`${cap(bar.label)}: all here. Go to ${where}`, 3000);
  }
  function doDiy(stage) {
    const r = commit({ t: 'build', stage });
    if (r.ok) sfx.cue('confirm');
    else hud.toast(r.reason === 'short' ? 'Not everything is here yet.' : 'This cannot be built yet.');
  }
  let saleShowing = false;
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
      hud.toast(near ? 'Yard Sale: go round to the back of the table.' : 'Yard Sale: go to the back of the table.', 2200);
      return;
    }
    commit({ t: 'yardSale' });
  }

  // ---------- loop with the world-pause gate ----------
  let frozen = false; // test hook (?debug=1): hold world time while the page keeps rendering
  const loop = createLoop({ world: (dt) => { if (!frozen) worldStep(dt); }, render: renderStep });
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
    onEscape: () => { if (cards.isOpen) return; if (opening.active) { if (opening.phase === 'running') opening.skip(); return; } if (finale.active) { finale.skip(); return; } if (rig.mode === 'whole') { leaveWhole(); return; } if (session.playing) openPause(); },
    onBlueprint: () => toggleBlueprint(),
    isBlocked: () => cards.isOpen || loop.paused,
  });

  let ctxTargets = [];
  let lastProgress = '';
  let debugSteer = null; // test hooks only (?debug=1)
  let debugCarried = null;
  let highlight = null; // the collectible the ground ring marks: { target, inReach } or null
  // first-actions coach: session-only facts (the rest derives from the ledger, tutorial.js)
  const tut = { moved: false, movedM: 0, lingerMs: 0, lingerHold: 0, phase: null, dropNoted: false };
  let coachState = null; // decided in the world step, drawn in the render step
  function worldStep(dt) {
    hero.setInput(debugSteer ?? input.read());
    hero.preStep(dt);
    world.physics.step(1 / 60, dt / 1000, 5);
    commit({ t: 'tick', ms: Math.round(dt), calm: data.settings.helpMeFinish });
    world.updateBranch(dt);
    ctxTargets = world.targets(data.ledger);
    const heroXZ = { x: hero.body.position.x, z: hero.body.position.z };
    goal = goalFor(data.ledger, heroXZ);
    toolCtx = { want: wantedTool(data.ledger, goal, heroXZ, ctxTargets), toolsComeToMe: data.settings.helpMeFinish }; // Help me finish brings every tool (P29-7)
    const evs = hammering.active ? [] : ix.update(dt, { hero: heroXZ, moving: hero.moving, speed: hero.groundSpeed, targets: ctxTargets, tableBusy: saleShowing, ...toolCtx });
    for (const e of evs) handleIxEvent(e);
    const working = ix.working;
    if (hammering.active && hero.moving) hammering.stop(); // moving away never undoes the build
    const faceTo = working ? working : hammering.active ? hammering.faceTo : null;
    hero.update(dt, { working: !!working || hammering.active, faceTo });
    hammering.update(dt); // after her pose, so the hammer sits in her fist
    if (!debugCarried) hero.setCounts(data.ledger.carried);
    world.updateHeldTool();
    world.updatePiles(dt, reducedMotion());
    world.updateRegrowth(data.ledger, dt);
    tweens.update(dt);
    // the ground ring: nearest collectible, solid in reach, filling while she works
    highlight = hammering.active ? null : pickHighlight(data.ledger, heroXZ, ctxTargets, ix.state.selectedId, HIGHLIGHT_RANGE_M, toolCtx);
    const still = !isMoving({ moving: hero.moving, speed: hero.groundSpeed });
    const mode = working ? 'work' : highlight?.inReach ? (still ? 'settle' : 'reach') : 'near';
    world.updateMarker(dt, highlight && { target: highlight.target, mode, progress: ix.workProgress }, reducedMotion());
    updateContext(heroXZ, dt);
    updateCoachState(dt, heroXZ, working);
    hud.setGoal(goal.text);
  }

  // the goal line; when it names stone, the rock nearest Vanessa that still has some (§3 P25-6)
  let goal = { text: '', target: null };
  let toolCtx = { want: null, toolsComeToMe: false };
  function goalFor(l, heroXZ) {
    const g = nextGoal(l, { toolsCome: data.settings.helpMeFinish });
    const wood = WOOD_SOURCES.includes(g.target);
    if (!(g.target in ROCKS) && !wood) return g;
    let best = null;
    for (const id of wood ? WOOD_SOURCES : Object.keys(ROCKS)) {
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
    const point = step?.phase === 'build' && hud.diyShown ? 'diy' : step?.phase === 'sale' && hud.saleShown ? 'sale' : null;
    const here = highlight?.inReach ? kindOf(highlight.target.id, l) : null;
    coachState = {
      step,
      point,
      prompt: coachPrompt({ step, learned: learned(l), mode: input.mode, here, tool: toolCtx.want, working: !!working, lingering: tut.lingerHold > 0, point }),
    };
  }

  function handleIxEvent(e) {
    if (e.type === 'workStart') { world.markerPop(0.07); return; } // answers the moment work starts
    if (e.type === 'unit') { if (e.result.ok) world.markerPop(0.16); }
  }

  function updateContext(heroXZ, dt = 0) {
    // v0.12: the build line (the site she stands at, or the goal line's next build) and its DIY
    const site = atSite(heroXZ, ctxTargets);
    const bar = finale.active || opening.active ? null : buildBar(data.ledger, site?.id ?? null);
    diyState = diyHint.update(dt, bar && !hammering.active ? bar : null);
    hud.setBuild(bar, bar?.ready ? (bar.here ? () => doDiy(bar.stage) : () => diyAway(bar)) : null);
    hud.setSale(saleReady(data.ledger) && !saleShowing && !finale.active, doYardSale, atTheTable()); // v0.14: yellow at the tables
    // at the tools: the explicit way to take the one the next job needs (P25-4)
    const tools = ctxTargets.find((x) => x.kind === 'tools');
    if (tools && toolCtx.want && inReach(heroXZ, tools)) {
      const tool = toolCtx.want;
      hud.setContext(`Take the ${tool}`, () => { ix.reset(); commit({ t: 'takeTool', tool }); });
    } else hud.setContext(null, null);
    // nonmodal status: what Vanessa is doing or why the nearby source is idle
    let text = '';
    const w = ix.working;
    if (w) {
      const doing = ix.workDoing;
      if (doing === 'takeTool') text = `Taking the ${w.kind === 'tools' ? toolCtx.want : w.kind === 'weed' ? 'rake' : 'shovel'}…`;
      else if (w.kind === 'weed') text = 'Clearing weeds…';
      else if (w.kind === 'dig') text = 'Digging…';
      else text = `Gathering ${RESOURCE_UNIT[sourceResource(w.id)]}… ${data.ledger.carried[sourceResource(w.id)]}`;
    } else if (hammering.active) {
      text = `DIY time! Building the ${STAGES[hammering.stage].label}…`;
    } else {
      const need = toolBlocked(data.ledger, heroXZ, ctxTargets, toolCtx);
      if (need) text = `You need the ${need}. It leans by the house.`;
      // a weed on a patch that is not open yet (P27-4)
      const waiting = !text && ctxTargets.find((x) => x.kind === 'weed' && inReach(heroXZ, x) && !data.ledger.weeds[x.id] && weedPresent(data.ledger, x.id) && !weedOpen(data.ledger, x.id));
      if (waiting) text = 'Opens after your first harvest';
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
        text = saleShowing ? 'Yard sale!' : n >= capN ? 'The tables are full: tap Yard Sale' : n >= 6 ? `Yard-sale tables · ${n}${of}. Tap Yard Sale, or bring more.` : `Yard-sale table · ${n} of 6. Walk past with crops to set them out.`;
      }
      const near = ctxTargets.filter((x) => ['node', 'stick', 'pile', 'rock'].includes(x.kind) && inReach(heroXZ, x));
      for (const n of near) {
        if (text) break;
        const res = sourceResource(n.id);
        if (n.hold) { text = 'A stick is coming down from the tree'; break; }
        if (available(data.ledger, n.id) > 0 && data.ledger.carried[res] >= CAPACITY) { text = `Can't carry more ${RESOURCE_NAMES[res]}: ${CAPACITY} is the most`; break; }
        if (available(data.ledger, n.id) === 0 && n.kind === 'node') { text = data.ledger.overgrown[n.id] !== null ? 'Weeds! Rake them before it wilts' : 'Growing'; break; }
      }
      // a wilted plant's spot (spec v0.12 P28-4)
      const re = !text && ctxTargets.find((x) => x.kind === 'dig' && data.ledger.wilted[x.id] && inReach(heroXZ, x, 1.2));
      if (re) text = data.ledger.tool === 'shovel' ? 'Replant: stand still to dig' : 'Replant: dig it with the shovel (it leans by the house)';
    }
    if (text !== lastProgress) { hud.setProgress(text || null); lastProgress = text; }
  }

  // v0.12: a tap on the world that lands on the yard-sale stand holds the sale (the captain:
  // "you click the stand is more intuitive")
  function tapWorld(x, y) {
    if (!session.playing || loop.paused || !saleReady(data.ledger)) return;
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
      if (playsOpening({ seen: prefs.openingSeen, param: params.get('opening'), overlay })) {
        paper.place(view.w, view.h);
        opening.prepare();
      } else paper.hide();
      if (overlay) enterWhole(true);
    };
    const n = saveNotice(r, saves.sessionOnly);
    if (n) showNotice(n, r, go);
    else go(r.status === 'ok' ? r.data : createSaveData());
  }
  const recoveryNote = (n) => `A rock with ${n} stone has appeared by the house, so the farm can still be finished.`;
  function start(d) {
    document.body.classList.remove('booting');
    data = structuredClone(d);
    ix.reset();
    Object.assign(tut, { moved: false, movedM: 0, lingerMs: 0, lingerHold: 0, phase: null, dropNoted: false });
    coachState = null;
    highlight = null;
    const pos = data.vanessa.x === null ? proj.groundAt(VANESSA_START.u, VANESSA_START.v) : new THREE.Vector3(data.vanessa.x, 0, data.vanessa.z);
    hero.place(pos.x, pos.z);
    rig.snap = true;
    rig.wholeBlend = 0;
    world.tableHold = false;
    world.sync(data.ledger);
    world.setFinished(mainComplete(data.ledger)); // the coloured end state derives from the home (P25-2)
    applyTheme(data.ledger.crop); // her first crop's theme; a new farm starts on plain paper
    if (hammering.active) hammering.stop();
    diyHint.reset();
    burst.hide();
    world.endSale();
    saleShowing = false;
    $('btn-replay').hidden = !mainComplete(data.ledger);
    hud.render(data.ledger);
    hud.setGoal(nextGoal(data.ledger, { toolsCome: data.settings.helpMeFinish }).text);
    persist();
    settleLedger(); // e.g. a test save from before v0.9 whose corn-plot weeds are already cleared
    $('set-help').checked = data.settings.helpMeFinish;
    titleEl.hidden = true;
    session.playing = true;
    loop.resume('title');
    $('btn-pause').focus();
  }
  function openPause() {
    ix.reset();
    input.release();
    hero.halt();
    loop.pause('menu');
    audio.holdMusic('menu');
    pauseEl.hidden = false;
    $('btn-resume').focus();
  }
  function closePause() { pauseEl.hidden = true; loop.resume('menu'); audio.releaseMusic('menu'); $('btn-pause').focus(); }
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
    $('btn-pause').focus();
  }
  // ---------- the Blueprint toggle (P25-3): utility row, Pause at 320 px, and the B key ----------
  const prefs = createPrefs(safeStorage());
  world.setBlueprint(prefs.blueprint, false);
  const bpButtons = [$('btn-blueprint'), $('btn-blueprint-pause')];
  function showBlueprint() {
    const on = prefs.blueprint;
    for (const b of bpButtons) {
      b.setAttribute('aria-pressed', String(on));
      b.title = on ? 'Blueprint on: the outlines of unbuilt things show (B)' : 'Blueprint off: only finished things show (B)';
    }
    $('btn-blueprint-pause').querySelector('.state').textContent = on ? 'on' : 'off';
  }
  function toggleBlueprint() {
    if (cards.isOpen || finale.active || opening.active || !session.playing) return;
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
    reducedMotion,
    onStart: () => {
      ix.reset();
      world.endSale();
      input.release();
      hero.halt();
      loop.pause('finale');
      document.body.classList.add('finale');
      $('btn-skip').hidden = false;
      $('btn-skip').focus();
      hud.announce('The house is finished. The drawing takes its colour.');
    },
    onEnd: () => {
      document.body.classList.remove('finale');
      $('btn-skip').hidden = true;
      $('btn-replay').hidden = !mainComplete(data.ledger);
      loop.resume('finale'); // the camera eases back to Vanessa (renderStep)
      hud.toast('The farm is finished, in colour. Keep exploring.', 4500);
      $('btn-pause').focus();
    },
  });
  $('btn-skip').onclick = () => finale.skip();
  $('btn-replay').onclick = () => { closePause(); finale.start(); };

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
      $('btn-pause').focus({ preventScroll: true });
      for (const fn of afterOpening.splice(0)) fn();
    },
  });
  // The page's first tap, click, Enter or Space starts (a gesture, so the theme starts with
  // it); after that any tap or key skips, except the gesture that resumes the theme after a
  // hidden tab. Escape skips through the input layer's onEscape. Taps on the page never reach
  // the stick, which is beneath it.
  let resuming = false; // read before the audio owner handles the same gesture
  for (const t of ['pointerup', 'keydown']) window.addEventListener(t, () => { resuming = opening.active && audio.prompt === 'resume'; }, true);
  const tapOpening = () => {
    if (!opening.active || resuming) return;
    if (opening.phase === 'waiting') opening.begin(); else opening.skip();
  };
  paper.onStart(tapOpening);
  $('opening-start').onclick = () => opening.begin(); // Enter or Space on the focused Start control
  window.addEventListener('keydown', (e) => {
    if (!opening.active || e.repeat || cards.isOpen || e.key === 'Escape' || e.target.closest?.('#opening-sound')) return;
    if (opening.phase === 'waiting' && ![' ', 'Enter'].includes(e.key)) return;
    e.preventDefault();
    tapOpening();
  });
  // Pause → Watch the opening (also in Help): the theme starts again from its intro, and it
  // ends on the farm as it is now
  const watchOpening = () => {
    closePause();
    audio.restartMusic();
    paper.place(view.w, view.h);
    opening.prepare();
    opening.begin();
  };
  $('btn-watch').onclick = watchOpening;
  $('btn-opening').onclick = watchOpening;

  // every button answers with a light tap, unless its own handler just played a cue (Confirm)
  document.addEventListener('click', (ev) => { if (ev.target.closest?.('button')) sfx.cue('tap'); });
  $('btn-pause').onclick = openPause;
  // v0.12: Help me finish: no weeds creep over the crops and no stick is lost (saved)
  $('set-help').onchange = (ev) => { data.settings.helpMeFinish = ev.target.checked; persist(); };
  $('btn-resume').onclick = closePause;
  $('btn-whole').onclick = () => enterWhole(false);
  $('btn-overlay').onclick = () => enterWhole(true);
  $('btn-back').onclick = leaveWhole;
  $('btn-reset').onclick = () => {
    cards.message({
      title: 'Start a new farm?',
      text: `This erases the farm: ${data.ledger.paymentEvents.length} built stages, ${data.ledger.purse} coins and everything carried. Settings are kept.`,
      confirm: 'Erase progress', cancel: 'Cancel',
      onConfirm: () => { pauseEl.hidden = true; loop.resume('menu'); audio.releaseMusic('menu'); start(saves.reset(data.settings)); },
    });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { ix.reset(); input.release(); hero.halt(); loop.pause('hidden'); } else loop.resume('hidden');
    audio.setHidden(document.hidden);
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
  const soundBtn = $('btn-sound');
  const promptBtn = $('audio-prompt');
  const PROMPTS = { enable: 'Tap to enable audio', resume: 'Tap to resume audio' };
  function showAudio() {
    const s = audio.settings;
    soundBtn.setAttribute('aria-pressed', String(s.soundEnabled));
    soundBtn.title = audio.state === 'unsupported' ? 'Audio is unavailable in this browser' : s.soundEnabled ? 'Sound on: tap to mute all' : 'Sound off: tap to turn on';
    $('opening-sound').setAttribute('aria-pressed', String(s.soundEnabled));
    $('vol-music').value = String(Math.round(s.musicVolume * 100));
    $('vol-effects').value = String(Math.round(s.effectsVolume * 100));
    const p = audio.prompt;
    promptBtn.hidden = !p;
    if (p) promptBtn.textContent = PROMPTS[p];
  }
  soundBtn.onclick = () => audio.toggleSound();
  $('opening-sound').onclick = () => audio.toggleSound(); // the page's corner toggle (P26-1)
  $('vol-music').oninput = (e) => audio.setMusicVolume(Number(e.target.value) / 100);
  $('vol-effects').oninput = (e) => audio.setEffectsVolume(Number(e.target.value) / 100);
  $('vol-effects').onchange = () => sfx.cue('tick'); // hear the new level on release
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
  for (const t of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(t, () => { audio.gesture(); loadSfx(); }, true);
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
  }
  window.addEventListener('resize', () => { layout(); });
  layout();

  // points the tree must not hide: Vanessa's legs, body and head, the marked collectible and
  // the coach's target
  const fadePts = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3());
  function fadePoints() {
    const p = hero.position;
    const pts = [fadePts[0].set(p.x, 0.3, p.z), fadePts[1].set(p.x, 0.9, p.z), fadePts[2].set(p.x, 1.5, p.z)];
    if (highlight) pts.push(fadePts[3].set(highlight.target.x, 0.15, highlight.target.z));
    const st = coachState?.step && world.stations[coachState.step.target];
    if (st) pts.push(fadePts[4].copy(st.pos).setY(0.3));
    const br = world.branchPoint(fadePts[5]); // the falling branch (P25-5)
    if (br) pts.push(br);
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
    const show = n > 0 && session.playing && !finale.active && !opening.active && rig.mode !== 'whole';
    yardBadge.hidden = !show;
    if (!show) return;
    tmpP.copy(world.stations.yard.pos).setY(0.75).project(rig.camera);
    yardBadge.textContent = `+${n}`;
    yardBadge.style.transform = `translate(${(((tmpP.x + 1) / 2) * view.w).toFixed(1)}px, ${(((1 - tmpP.y) / 2) * view.h).toFixed(1)}px)`;
  }

  function updateCoach() {
    if (loop.paused || rig.mode === 'whole' || !session.playing || !coachState) { coach.hideAll(); badge.hidden = true; coach.sparkle(null); return; }
    if (hammering.active) { coach.hideAll(); coach.sparkle(null); return; } // nothing over the build
    const { step, prompt, point } = coachState;
    // one arrow at the goal's target; at the crop choice, three, one per patch in its colour
    const aims = step?.choice ? step.choice.map((c) => ({ id: c.target, colour: c.colour })) : step?.target ? [{ id: step.target }] : [];
    // v0.13 DIY hint: 10 s after she has everything (or at once when DIY is pressed away), the
    // arrow leads to the part, which sparkles
    const hintAt = diyState.point && world.stations[diyState.stage] ? diyState.stage : null;
    if (hintAt && !aims.some((a) => a.id === hintAt)) aims.push({ id: hintAt });
    if (hintAt) {
      world.buildPoint(hintAt, tmpP).setY(Math.max(0.5, tmpP.y + 0.2)).project(rig.camera);
      const sx = ((tmpP.x + 1) / 2) * view.w; const sy = ((1 - tmpP.y) / 2) * view.h;
      coach.sparkle(tmpP.z < 1 && sx > 0 && sx < view.w && sy > (live.playTop || live.hudBottom) && sy < live.ctlTop ? { x: sx + 34, y: sy - 4 } : null); // beside the arrow's tip
    } else coach.sparkle(null);
    const arrows = [];
    for (const aim of aims) {
      const st = world.stations[aim.id];
      if (!st || point) continue;
      const hp = hero.body.position;
      // v0.15: for a sale the arrow shows where she sells from, behind the first table
      const sell = aim.id === 'table' && step?.sale;
      const pos = sell ? world.sellSpot(tmpS) : st.pos;
      const atTarget = sell ? atTheTable() : Math.hypot(pos.x - hp.x, pos.z - hp.z) - st.def.r <= 0.9;
      if (atTarget) continue;
      tmpP.copy(pos).setY(st.obj.position.y + (ARROW_H[st.def.kind] ?? 0.6)).project(rig.camera);
      const pt = { x: ((tmpP.x + 1) / 2) * view.w, y: ((1 - tmpP.y) / 2) * view.h, front: tmpP.z < 1 };
      const a = arrowPlacement(pt, { left: 0, right: view.w, top: live.playTop || live.hudBottom, bottom: live.ctlTop });
      arrows.push(aim.colour ? { ...a, colour: aim.colour } : a);
    }
    coach.arrows(arrows);
    coach.tip(prompt, !$('progress').hidden);
    placeStackBadge();
    coach.demo(step?.phase === 'move' && input.mode !== 'keyboard' && !input.stickActive); // not while she is already dragging
    coach.pointAt(point === 'diy' ? $('btn-diy') : point === 'sale' ? $('btn-sale') : null);
  }

  function renderStep(dt) {
    opening.update(dt);
    finale.update(dt);
    if (!finale.active && !opening.active && rig.wholeBlend > 0) rig.wholeBlend = Math.max(0, rig.wholeBlend - dt / 900); // back to Vanessa
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
    world.updateSky(rig.camera);
    if (rig.mode === 'whole' || !session.playing || finale.active || opening.active || rig.wholeBlend > 0) world.resetFade(); else { world.updateFade(dt, rig.camera, fadePoints()); updateStackCap(performance.now()); }
    updateCoach();
    if (burst.active || hammering.active) {
      tmpP.copy(hero.position).setY(1.75).project(rig.camera);
      burst.update(burstHeld ? 0 : dt, { x: ((tmpP.x + 1) / 2) * view.w, y: ((1 - tmpP.y) / 2) * view.h }, { w: view.w, top: live.hudBottom, bottom: live.ctlTop || view.h }, reducedMotion());
    }
    placeYardBadge();
    // under the opening's paper nothing 3D is seen: draw only to take the drawing's still
    if (opening.coversCanvas && !paper.needsCapture) { if (DEBUG) debugReadout(); return; }
    renderer.render(scene, rig.camera);
    if (opening.active && paper.needsCapture) paper.capture(canvas, renderer.getPixelRatio());
    if (DEBUG) debugReadout();
  }

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
      finale, prefs, toggleBlueprint, opening, paper, hammering, burst, hud, get diyState() { return diyState; }, diyHint,
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
