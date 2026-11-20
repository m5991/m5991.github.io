// v0.31 (Tiffany's "Edits #5": "Ending animation to last the duration of the song 'I gave it to the
// world' have the action be just stealing the drawing, then don't even have an Easter egg, just have
// the song play from the beginning as the blond farmer girl take the drawings and run all over the
// whole farm throwing them everywhere instead of just one spot. Even in the air, and from the roof.
// Birds can fly away with some, she can give one to Dwight and yardsale people come back and she
// gives them out as well. Take some into the house. Vanessa keeps trying to catch her but can't. This
// is the final animation shabang and should be funny and chaotic and 'extra'"): the last song's
// scene. It takes the place of v0.29-v0.30's short scene (thief.js) and of that song's egg.
//
// Vanessa holds her drawing out at the front of the farm; the other farmer (Vanessa's model with
// blond hair, a rose shirt and a red cap: thief.js recolour) runs in, snatches it, and the song
// starts from its top. For the whole song she runs a route over the farm with an armful of copies:
// the yard-sale tables, where the neighbours come back and she hands copies out; the corn, where two
// birds swoop and fly off with some; up the wall onto the roof, throwing copies down from it and one
// into the chimney; into the house through the door and out again with more; Dwight on his bench,
// who gets one; laps round the old tree with Vanessa on her heels; the sunflowers, the raised bed; a
// last lap throwing everything into the air. Copies flutter down and lie everywhere. Vanessa chases
// a step or two behind the whole time, lunges now and then and never quite catches her. At the very
// end the farmer stops, gives the last copy to Vanessa, and runs off the farm.
//
// Presentation only, on its own clock (main.js runs it like the finale: the world waits, Skip ends
// it). The route is planned from the farm's own places when it starts (`plan`), and the stops
// stretch so the scene lasts the song (`durationMs`). Reduced motion: the farmer stands beside her
// with the drawing, the copies lie about, and she is gone after a few seconds.
import * as THREE from 'three';
import * as G from './greybox.js';
import { LOOKS } from '../game/crowd.js';
import { recolour } from './thief.js';
import { addOutline } from './greybox.js';
import { planWalk } from './walk.js';

export const GIVEAWAY = Object.freeze({
  leadMs: 1500, // she runs in and snatches the drawing (v0.32: the song starts as she comes, at 0)
  songMs: 135616, // "I gave it to the world" (E01), when the player cannot say
  // v0.32: she is off the farm by this time into the song: "They made it into earrings" is sung from
  // 41.0 s (heard with a speech-to-text pass over assets/songs/E01.mp3: the line starts at 41.02 s)
  earringsMs: 41020,
  exitMs: 40300,
  chaseMs: [8000, 16000], // the chase over the whole farm, at the least and at the most
  speed: 5.3, // m/s: the farmer runs
  chase: 4.7, // m/s: Vanessa, never quite as fast
  lagMs: 1150, // how far behind her Vanessa runs
  lungeMs: 900, // a lunge: Vanessa closes in for this long
  gapM: 0.55, // the nearest Vanessa ever gets (her grab misses by that much)
  copiesMax: 90, // copies on the farm at once (the oldest go first)
  sheet: [0.42, 0.32],
  reducedMs: 4500,
  fadeAfterMs: 20000, // the copies lie this long once it is over, then fade
});

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
// a cheap seeded wobble for where the copies land
const rnd = (i) => { const x = Math.sin(i * 91.17 + 7.3) * 43758.5453; return x - Math.floor(x); };

// the lines on screen (ink words over their heads, and Dwight's speech)
export const GIVEAWAY_WORDS = Object.freeze({
  snatch: 'Mine!', hey: 'Hey!', catch: 'Come back here!', paint: 'Bigger!', tables: 'Copies for everyone!', ooh: ['Ooh!', 'For me?', 'Lovely!', 'Framing it!'],
  lunge: ['Got y—', 'Almost!', 'Nope!'], dodge: ['Too slow!', 'Missed me!', 'Wheee!'], birds: 'Tweet!', roof: 'Up here!', down: 'Come down!',
  chimney: 'Special delivery!', door: 'Knock knock!', inside: 'Hello in there!', tree: 'Round and round!', last: 'For you!', bye: 'Bye!',
  dwight: 'Fact: this is the finest drawing ever made. I will be framing it. In a frame.',
});

export class Giveaway {
  constructor({ world, hero, registry, tweens, reducedMotion = () => false, onSay = () => {}, onCue = () => {} }) {
    Object.assign(this, { world, hero, registry, tweens, reducedMotion, onSay, onCue });
    this.active = false;
    this.copies = [];
    this.focus = V3();
  }

  // ---------- the cast ----------
  build() {
    if (this.model) return;
    const m = this.registry.instance('Vanessa');
    m.name = 'GiveawayFarmer';
    recolour(m);
    // v0.32 (Tiffany's "Edits #6": "Make the blond farmer the same size and weight as Vanessa"): the
    // same model and size, and now the same ink line round her as Vanessa has (hero.js), which made
    // Vanessa look the bigger and fuller of the two (v0.29-v0.31: drawn without it)
    addOutline(m, 0.012);
    m.visible = false;
    m.traverse((o) => { o.userData.noFit = true; });
    this.world.root.add(m);
    this.model = m;
    this.mixer = new THREE.AnimationMixer(m);
    this.acts = Object.fromEntries(['V_Run', 'V_Idle', 'V_Celebrate', 'V_Walk'].map((c) => [c, this.mixer.clipAction(this.registry.clip(c))]));
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.world.drawingMap((t) => { mat.map = t; mat.needsUpdate = true; });
    this.paper = mat;
    this.sheetGeo = new THREE.PlaneGeometry(...GIVEAWAY.sheet);
    // the armful in her hand
    const hand = m.getObjectByName('Hand_R_Tool') ?? m;
    const pile = new THREE.Group(); pile.name = 'Armful';
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(this.sheetGeo, mat); s.position.set(0.01 * i, 0.01 * i, -0.005 * i); s.rotation.z = (i - 1) * 0.12; pile.add(s); }
    hand.add(pile);
    const ws = V3(); hand.updateWorldMatrix(true, false); hand.getWorldScale(ws);
    pile.scale.setScalar(1 / Math.max(1e-3, ws.x));
    pile.visible = false;
    this.armful = pile;
    // the neighbours who come back (the yard sale's buyers), and two birds
    this.buyers = [0, 2, 4, 6].map((k) => {
      const b = G.buyer(LOOKS[k % LOOKS.length]);
      b.visible = false; b.traverse((o) => { o.userData.noFit = true; });
      this.world.root.add(b);
      return { obj: b, sheet: null };
    });
    this.birds = [0, 1].map(() => {
      const b = G.flyingBird(); b.scale.setScalar(1.6); b.visible = false;
      b.traverse((o) => { o.userData.noFit = true; });
      this.world.root.add(b);
      return { obj: b, wl: b.getObjectByName('wingL'), wr: b.getObjectByName('wingR') };
    });
  }
  play(name, rate = 1) {
    for (const [n, a] of Object.entries(this.acts)) {
      if (n === name) { a.timeScale = rate; if (!a.isRunning()) a.reset().fadeIn(0.12).play(); } else if (a.isRunning()) a.fadeOut(0.12);
    }
  }

  // ---------- the route ----------
  // The farm's places and the route through them, as steps: { kind: 'run', to } runs there round
  // what is in the way; 'stand' stays `ms` (stretched to fit the song), facing `face`, doing `anim`;
  // 'route' follows `pts` (the climb onto the roof, the way down) at `speed`; 'inside' is gone into
  // the house for `ms`. `at` lists [ms into the step, what happens] (the throws and the words).
  plan(start) {
    const w = this.world;
    const g = (u, v) => w.proj.groundAt(u, v).setY(0);
    const tables = w.tableStations().filter((t) => t.obj.visible);
    const row = tables.length ? tables : w.tableStations().slice(0, 1);
    const front = (t, dz) => t.pos.clone().setY(0).add(V3(0, 0, dz));
    const house = w.objects.D01;
    const door = w.doorWay();
    const climb = w.chimneyRoute();
    const tree = w.objects.D09.position.clone().setY(0);
    const bench = w.benchSeat(V3());
    const benchFront = bench.clone().add(V3(Math.sin(w.objects.D10.rotation.y) * 0.95, 0, Math.cos(w.objects.D10.rotation.y) * 0.95)).setY(0);
    const sun = w.stations.S0?.pos.clone().setY(0) ?? g(82, 70);
    const bed = w.stations.T0?.pos.clone().setY(0) ?? g(68, 88);
    const cornA = g(56, 53.5); const cornB = g(76, 53.5);
    const rowMid = row[Math.floor(row.length / 2)];
    const T = this.T = {
      start, tables: row, house, door, climb, tree, bench, benchFront, sun, bed, cornA, cornB,
      buyerAt: row.slice(0, 4).map((t, i) => front(t, 1.7 + (i % 2) * 0.35)),
      inBuyers: row.slice(0, 4).map((t, i) => front(t, 9 + i)),
    };
    // obstacles the runs go round (planWalk): the house, the tree, the bench, the tables, the bed
    const hb = new THREE.Box3().setFromObject(house);
    this.obstacles = [
      { x: (hb.min.x + hb.max.x) / 2, z: (hb.min.z + hb.max.z) / 2, r: Math.max(hb.max.x - hb.min.x, hb.max.z - hb.min.z) * 0.55 + 0.4 },
      { x: tree.x, z: tree.z, r: 0.95 }, { x: bench.x, z: bench.z, r: 1.0 }, { x: bed.x, z: bed.z, r: 1.5 },
      ...row.map((t) => ({ x: t.pos.x, z: t.pos.z, r: 0.75 })),
    ];
    const W = GIVEAWAY_WORDS;
    const steps = [];
    const run = (to, at = []) => steps.push({ kind: 'run', to: to.clone(), at });
    const stand = (ms, o = {}) => steps.push({ kind: 'stand', ms, ...o, at: o.at ?? [] });
    // v0.32 (Tiffany's "Edits #6": "The first part is that she grabs the paper and starts being chased
    // all over the WHOLE farm, then when she starts spreading the paper copies, going in and out of the
    // house, handing them to yard sale people (who leave as soon as the get get a picture by the way),
    // giving one to Dwight, painting a huge version of it, throwing them everywhere throwing some from
    // the roof, being chased by Vanessa in and out of the house, etc should happen much quicker ... the
    // entire time she is doing everything Vanessa is chasing her. Make this an animation about 40
    // seconds long"): about 12 s of chase round the whole farm with the drawing, then the copies,
    // quickly, one place after another, Vanessa on her heels the whole way; she runs off the farm just
    // before "They made it into earrings" (GIVEAWAY.exitMs). (v0.31: the whole song, 2 min 16 s.)
    // 1. the chase over the whole farm, the drawing in her hand (it takes up whatever time is left)
    const chase = [g(50, 100), g(76, 104), g(96, 92), g(98, 74), g(92, 60), g(70, 59.5), g(52, 62), g(44, 70), g(30, 84), g(12, 92), g(4, 74), g(14, 66), g(40, 58)];
    steps.push({ kind: 'route', pts: [start.clone(), ...chase], speed: GIVEAWAY.speed, flex: true, key: 'chase', at: [[1500, () => this.say(W.catch, this.vPos, 1300)], [5200, () => { this.lungeAt = this.t; }], [9500, () => { this.lungeAt = this.t; }]] });
    // 2. in through the front door and out again with an armful of copies
    run(door.out, [[0, () => { this.armful.visible = true; }]]);
    steps.push({ kind: 'route', pts: [door.out, door.step, door.inside], speed: 3.6, door: 'in' });
    steps.push({ kind: 'inside', ms: 1100, at: [[300, () => this.say(W.door, door.out.clone(), 1000)], [600, () => this.windowCopy()]] });
    steps.push({ kind: 'route', pts: [door.inside, door.step, door.out], speed: 3.8, door: 'out', at: [[200, () => this.toss(5, { spread: 2.5, high: 3 })]] });
    // 3. the yard-sale tables: the neighbours run up, each gets a copy and is off with it at once
    run(front(rowMid, 0.9), [[0, () => this.buyersIn()], [300, () => this.toss(3, { spread: 2, high: 3 })]]);
    stand(2300, { anim: 'V_Celebrate', face: 'camera', key: 'tables', lunge: true,
      at: [[0, () => this.say(W.tables, this.model.position, 1200)], [200, () => this.toss(4, { onto: 'tables' })], ...T.buyerAt.map((_, i) => [350 + i * 380, () => this.hand(i)])] });
    // 4. Dwight on his bench gets one
    run(T.benchFront, [[300, () => this.toss(2, { spread: 1.5 })]]);
    stand(1500, { anim: 'V_Idle', face: T.bench, key: 'dwight', at: [[100, () => this.giveDwight()], [500, () => this.onSay('dwight', W.dwight)]] });
    // 5. a huge copy, painted on the grass in a few big strokes
    const paintAt = g(30, 95);
    run(paintAt.clone().add(V3(-1.9, 0, 0.6)));
    stand(2600, { anim: 'V_Celebrate', face: paintAt, key: 'paint', at: [[0, () => { this.paintHuge(paintAt, 2400); this.say(W.paint, this.model.position, 1300); }]] });
    // 6. up onto the roof by the left wall, copies off the roof and one down the chimney
    run(climb[0]);
    steps.push({ kind: 'route', pts: climb.slice(1), speed: 3.4, up: true, at: [[100, () => this.say(W.roof, this.model.position, 1200)]] });
    stand(2600, { anim: 'V_Celebrate', face: 'camera', up: true, key: 'roof',
      at: [[100, () => this.toss(6, { from: 'here', around: w.objects.D01.position.clone().add(V3(0, 0, 3.4)), spread: 4, high: 3 })], [900, () => this.chimneyDrop()], [1500, () => this.toss(6, { from: 'here', spread: 5, high: 3.5 })]] });
    steps.push({ kind: 'route', pts: [...climb.slice(1)].reverse(), speed: 4, up: true });
    // 7. in and out of the house again, Vanessa right behind her through the door
    run(door.out);
    steps.push({ kind: 'route', pts: [door.out, door.step, door.inside], speed: 3.8, door: 'in', key: 'in2' });
    steps.push({ kind: 'inside', ms: 700, key: 'in2', at: [[200, () => this.cue('knock')]] });
    steps.push({ kind: 'route', pts: [door.inside, door.step, door.out], speed: 4, door: 'out', key: 'in2' });
    // 8. everything into the air, over the front of the farm, the birds come for some
    steps.push({ kind: 'route', pts: [door.out, g(46, 84), g(60, 92), g(74, 96)], speed: GIVEAWAY.speed, key: 'fountain',
      at: [[100, () => this.toss(6, { spread: 3.5, high: 4.5, seed: 1 })], [700, () => this.birdsIn()], [1300, () => { this.toss(8, { spread: 4.5, high: 5.5, seed: 2 }); this.say(W.dodge[2], this.model.position, 1100); }], [2200, () => this.toss(6, { spread: 4, high: 4.5, seed: 3 })]] });
    // 9. and off the farm she runs ("Bye!"), just before "They made it into earrings"
    steps.push({ kind: 'run', key: 'bye', to: g(74, 96).add(V3(17, 0, 1.5)), at: [[100, () => { this.armful.visible = false; this.say(GIVEAWAY_WORDS.bye, this.model.position, 1200); }]] });
    return steps;
  }

  // ---------- start, the clock, the end ----------
  // `at`: Vanessa's place (a ground point); `songMs`: the song's length (ms) when known
  start(at, { songMs = GIVEAWAY.songMs, camera = null } = {}) {
    this.build();
    this.clear();
    this.active = true;
    this.t = 0;
    this.reduced = this.reducedMotion();
    this.camera = camera;
    this.lastCopy = null;
    this.events = [];
    this.endMs = GIVEAWAY.exitMs; // (v0.31: the whole song, GIVEAWAY.leadMs + songMs)
    void songMs;
    const m = this.model;
    const h = this.hero;
    this.vPos = h.position.clone().setY(0);
    this.vYaw = h.yaw;
    this.lunges = 0;
    this.lungeT = -Infinity;
    if (this.reduced) {
      m.position.copy(this.vPos).add(V3(-0.8, 0, 0.2));
      m.visible = true; this.armful.visible = true; this.play('V_Idle');
      for (let i = 0; i < 10; i++) this.lay(this.vPos.clone().add(V3(Math.cos(i) * (1.2 + rnd(i)), 0, Math.sin(i) * (1 + rnd(i + 3)))), i);
      this.endMs = GIVEAWAY.reducedMs;
      return;
    }
    const right = camera ? V3(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize() : V3(1, 0, 0);
    this.fromP = this.vPos.clone().addScaledVector(right, -9).add(V3(0, 0, 0.6));
    this.meetP = this.vPos.clone().addScaledVector(right, -0.8).add(V3(0, 0, 0.35));
    m.position.copy(this.fromP);
    m.rotation.y = Math.atan2(right.x, right.z);
    m.visible = true;
    this.armful.visible = false;
    this.play('V_Run');
    // the route, timed: runs and climbs take what their length takes; the chase (`flex`) takes up the
    // rest, between GIVEAWAY.chaseMs[0] and [1]; if the rest still does not fit, the stops shrink, and
    // then everything runs faster, so that she is off the farm at GIVEAWAY.exitMs (v0.32)
    const steps = this.plan(this.meetP.clone());
    let p = this.meetP.clone();
    const lenOf = (pts) => pts.reduce((n, q, i) => (i ? n + q.distanceTo(pts[i - 1]) : 0), 0);
    for (const s of steps) {
      if (s.kind === 'run') { s.path = planWalk(p, s.to, this.obstacles, 40, Infinity); s.ms = (s.path.len / GIVEAWAY.speed) * 1000; p = s.to.clone(); }
      else if (s.kind === 'route') { if (s.flex) s.pts[0] = p.clone(); s.len = lenOf(s.pts); s.ms = (s.len / s.speed) * 1000; p = s.pts.at(-1).clone().setY(0); }
    }
    const budget = this.endMs - GIVEAWAY.leadMs - 300;
    const chase = steps.find((s) => s.flex);
    const sum = (f) => steps.filter(f).reduce((n, s) => n + s.ms, 0);
    const moving = () => sum((s) => s.kind === 'run' || (s.kind === 'route' && !s.flex));
    const stops = () => sum((s) => s.kind === 'stand' || s.kind === 'inside');
    chase.ms = Math.max(GIVEAWAY.chaseMs[0], Math.min(GIVEAWAY.chaseMs[1], budget - moving() - stops()));
    let over = moving() + stops() + chase.ms - budget;
    if (over > 0) { const k = Math.max(0.55, (stops() - over) / stops()); for (const s of steps) if (s.kind === 'stand' || s.kind === 'inside') s.ms *= k; }
    over = moving() + stops() + chase.ms - budget;
    if (over > 0) { const k = (moving() - over) / moving(); for (const s of steps) if (s.kind === 'run' || (s.kind === 'route' && !s.flex)) s.ms *= k; }
    this.runRate = GIVEAWAY.speed; // (a run's own speed: its length over its time)
    for (const s of steps) if (s.kind === 'run') s.speed = s.path.len / (s.ms / 1000);
    let t = GIVEAWAY.leadMs;
    for (const s of steps) { s.t0 = t; t += s.ms; s.t1 = t; s.done = new Set(); }
    this.steps = steps;
    // (she is off the farm at exitMs, whatever is left over)
    const late = steps.at(-1).t1 - this.endMs;
    if (late < 0) { const last = steps.at(-1); last.t0 -= late; last.t1 -= late; }
    this.trail = [{ t: 0, p: this.fromP.clone(), ground: true }];
  }

  get done() { return !this.active; }

  update(dtMs) {
    if (!this.active || this.held) return;
    this.t += dtMs;
    this.mixer.update(dtMs / 1000);
    this.stepBirds(dtMs);
    this.stepBuyers(dtMs);
    if (this.reduced) { if (this.t >= this.endMs) this.end(); this.focus.copy(this.vPos); return; }
    this.stepFarmer(dtMs);
    this.stepVanessa(dtMs);
    // the camera: between the two, nearer the farmer, up with her on the roof
    const m = this.model.position;
    const k = this.lastStop || this.cur?.key === 'bye' || !this.model.visible ? 0.15 : 0.6; // (as she runs off, the camera stays with Vanessa)
    this.fk = this.fk === undefined ? k : this.fk + (k - this.fk) * (1 - Math.exp(-dtMs / 600));
    this.focus.set(m.x * this.fk + this.vPos.x * (1 - this.fk), m.y * 0.5 * this.fk, m.z * this.fk + this.vPos.z * (1 - this.fk));
    if (this.t >= this.endMs) this.end();
  }
  // (checks: run the scene on to `ms`, its flights and words with it)
  seek(ms) { while (this.active && this.t < ms) { const dt = Math.min(50, ms - this.t); this.tweens.update(dt); this.update(dt); } }

  stepFarmer(dtMs) {
    const m = this.model;
    if (this.hopY) { m.position.y -= this.hopY; this.hopY = 0; }
    this.stepFarmerAt(dtMs);
    const k = this.hopAt === undefined ? 1 : (this.t - this.hopAt) / 420;
    if (k >= 0 && k < 1) { this.hopY = Math.sin(Math.PI * k) * 0.45; m.position.y += this.hopY; }
  }
  stepFarmerAt(dtMs) {
    const m = this.model;
    const t = this.t;
    if (t < GIVEAWAY.leadMs) {
      const k = Math.min(1, t / GIVEAWAY.leadMs);
      m.position.lerpVectors(this.fromP, this.meetP, k);
      return this.record(true);
    }
    if (!this.snatched) {
      this.snatched = true;
      this.armful.visible = true;
      this.play('V_Celebrate');
      m.rotation.y = Math.atan2(this.vPos.x - m.position.x, this.vPos.z - m.position.z) + 0.5;
      this.say(GIVEAWAY_WORDS.snatch, m.position, 1300);
      this.say(GIVEAWAY_WORDS.hey, this.vPos, 1300);
      this.cue('squawk');
      this.events.push('snatch');
    }
    const s = this.steps.find((x) => t >= x.t0 && t < x.t1) ?? null;
    if (!s) { if (t >= this.steps.at(-1).t1) { m.visible = false; } return this.record(true); }
    const local = t - s.t0;
    for (const [ms, fn] of s.at ?? []) if (local >= ms && !s.done.has(ms)) { s.done.add(ms); fn(); }
    if (s !== this.cur) { this.cur = s; this.onStep(s); }
    if (s.kind === 'run') {
      const d = Math.min(s.path.len, (local / 1000) * (s.speed ?? GIVEAWAY.speed));
      const q = along(s.path.pts, s.path.cum, d);
      this.face(Math.atan2(q.dx, q.dz), dtMs);
      m.position.set(q.x, 0, q.z);
      this.play('V_Run', 1.15);
      return this.record(true);
    }
    if (s.kind === 'route') {
      const q = alongPts(s.pts, Math.min(1, local / s.ms));
      m.position.set(q.x, q.y ?? 0, q.z);
      if (Math.hypot(q.dx, q.dz) > 1e-4) this.face(Math.atan2(q.dx, q.dz), dtMs);
      this.play('V_Run', s.up ? 0.8 : 1.1);
      if (s.door) {
        const k = local / s.ms;
        this.world.setDoorOpen(s.door === 'in' ? Math.min(1, k * 2.5) : k < 0.8 ? 1 : (1 - k) * 5);
        m.visible = s.door === 'in' ? k < 0.85 : k > 0.1;
      }
      return this.record(!s.up && !(s.door === 'in' && local / s.ms > 0.6) && !(s.door === 'out' && local / s.ms < 0.4));
    }
    if (s.kind === 'inside') {
      m.visible = false;
      this.world.setDoorOpen(Math.max(0, 1 - local / 450));
      return this.record(false);
    }
    // a stand: facing the viewer, the thing she throws at, Dwight, or Vanessa
    const to = s.face === 'camera' && this.camera ? this.camera.position : s.face === 'vanessa' ? this.vPos : s.face;
    if (to) this.face(Math.atan2(to.x - m.position.x, to.z - m.position.z), dtMs);
    this.play(s.anim ?? 'V_Idle');
    return this.record(!s.up);
  }
  onStep(s) {
    // a lunge at the stop: Vanessa closes in and grabs at the air as the farmer dodges
    if (s.lunge || s.key === 'tables' || s.key === 'last') this.lungeAt = s.t0 + (s.key === 'last' ? 400 : 900);
    if (s.key === 'last') this.lastStop = true;
  }
  face(yaw, dtMs) {
    const m = this.model;
    const d = Math.atan2(Math.sin(yaw - m.rotation.y), Math.cos(yaw - m.rotation.y));
    m.rotation.y += d * (1 - Math.exp(-dtMs / 70));
  }
  record(ground) { this.trail.push({ t: this.t, p: this.model.position.clone().setY(0), ground }); if (this.trail.length > 600) this.trail.splice(0, 200); }

  // Vanessa: where the farmer was a moment ago, on the ground (she waits at the foot of the wall
  // while the farmer is up on the roof, and at the door while she is inside); a lunge closes in
  stepVanessa(dtMs) {
    const h = this.hero;
    const t = this.t;
    if (t < GIVEAWAY.leadMs + 300) { this.placeV(dtMs, false); return; }
    let lag = GIVEAWAY.lagMs;
    let speed = GIVEAWAY.chase;
    if (this.lungeAt !== undefined && t >= this.lungeAt && t < this.lungeAt + GIVEAWAY.lungeMs) {
      lag = 260; speed = 7.5;
      if (this.lungeAt !== this.lungeSaid) {
        this.lungeSaid = this.lungeAt;
        const i = this.lunges++;
        if (!this.lastStop) { this.say(GIVEAWAY_WORDS.lunge[i % 3], this.vPos, 1000); this.dodge(i); }
      }
    }
    // the trail point `lag` ago (or the last one on the ground before it)
    const want = t - lag;
    let target = null;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const e = this.trail[i];
      if (e.t > want) continue;
      if (e.ground) { target = e.p; break; }
    }
    if (this.lastStop) target = this.model.position.clone().setY(0).add(V3(0.6, 0, 0.45)); // she comes up to take the last copy
    // (while the farmer is up on the house or inside it, Vanessa waits in front of it, in sight,
    // looking up: not behind it at the foot of the wall)
    // (v0.32: the second time she runs after her in through the door and out again: "being chased by
    // Vanessa in and out of the house")
    else if (this.cur?.key === 'in2' && this.T) target = this.cur.door === 'out' ? this.T.door.out : this.T.door.inside;
    else if ((this.cur?.up || this.cur?.kind === 'inside' || this.cur?.door) && this.T) target = this.T.door.out.clone().add(V3(this.cur.kind === 'inside' || this.cur.door ? 0.2 : -1.3, 0, 0.9));
    if (!target) { this.placeV(dtMs, false); return; }
    const d = dist2(target, this.vPos);
    const near = this.lastStop ? 0.05 : 0.7; // (never right on top of her)
    let moving = false;
    if (d > near) {
      const step = Math.min(d - near * 0.5, (speed * dtMs) / 1000);
      this.vPos.x += ((target.x - this.vPos.x) / d) * step;
      this.vPos.z += ((target.z - this.vPos.z) / d) * step;
      this.vYawWant = Math.atan2(target.x - this.vPos.x, target.z - this.vPos.z);
      moving = step > 0.002;
    } else {
      const m = this.model.position;
      this.vYawWant = Math.atan2(m.x - this.vPos.x, m.z - this.vPos.z);
    }
    // (never on top of her: a step away at the least, however they run, so she is never caught)
    const fm = this.model.position;
    if (this.model.visible && fm.y < 0.3 && !this.lastStop) {
      const dx = this.vPos.x - fm.x; const dz = this.vPos.z - fm.z; const dd = Math.hypot(dx, dz);
      if (dd < GIVEAWAY.gapM) {
        const k = dd > 1e-4 ? GIVEAWAY.gapM / dd : 0;
        this.vPos.x = dd > 1e-4 ? fm.x + dx * k : fm.x + GIVEAWAY.gapM; this.vPos.z = dd > 1e-4 ? fm.z + dz * k : fm.z;
      }
    }
    // at the foot of the house while the farmer is up there: a shaken fist now and then
    if (this.cur?.up && !this.saidDown && !moving) { this.saidDown = true; this.say(GIVEAWAY_WORDS.down, this.vPos, 1500); }
    this.placeV(dtMs, moving, speed);
    void h;
  }
  placeV(dtMs, moving, speed = GIVEAWAY.chase) {
    const h = this.hero;
    if (this.vYawWant !== undefined) {
      const d = Math.atan2(Math.sin(this.vYawWant - h.yaw), Math.cos(this.vYawWant - h.yaw));
      h.yaw += d * (1 - Math.exp(-dtMs / 60));
    }
    h.yawTarget = h.yaw;
    h.view.rotation.y = h.yaw;
    h.view.position.set(this.vPos.x, 0, this.vPos.z);
    h.view.visible = !(this.T && this.cur?.key === 'in2' && dist2(this.vPos, this.T.door.inside) < 0.7); // (v0.32: inside after her)
    h.body.position.set(this.vPos.x, h.body.position.y, this.vPos.z);
    h.body.velocity.set(0, 0, 0);
    h.anim.play(moving ? 'run' : this.t < GIVEAWAY.leadMs ? 'idle' : 'idle', 0.15, moving ? Math.max(0.8, speed / 4.7) : 1);
    h.anim.update(dtMs / 1000);
  }
  // the farmer side-steps a lunge with a hop
  dodge(i) {
    const m = this.model;
    this.hopAt = this.t; // (a hop of 0.45 m over 420 ms, on top of wherever she is: stepFarmer)
    this.tweens.wait(250).then(() => this.say(GIVEAWAY_WORDS.dodge[i % 3], m.position, 1100));
    this.cue('pop');
  }

  // ---------- the copies ----------
  // `n` copies thrown out of her arms: onto the ground round her (or `around`), `onto` the tables,
  // `into` the tree's canopy; `high` how far up they go; each flutters down rocking side to side
  toss(n, { around = null, spread = 2, high = 2.4, onto = null, into = null, from = null, seed = 0 } = {}) {
    if (!this.model) return;
    const m = this.model;
    for (let i = 0; i < n; i++) {
      const k = (this.thrown = (this.thrown ?? 0) + 1) + seed * 17;
      const o = (from === 'here' ? m.position : m.position).clone().setY(m.position.y + 1.5);
      let to;
      if (onto === 'tables') {
        const tb = this.T.tables[k % this.T.tables.length];
        to = tb.pos.clone().add(V3((rnd(k) - 0.5) * 0.9, 0.78, (rnd(k + 1) - 0.5) * 0.4));
      } else if (into === 'tree') {
        const c = this.T.tree;
        to = c.clone().add(V3((rnd(k) - 0.5) * 2.6, 3.2 + rnd(k + 2) * 1.3, 0.6 + (rnd(k + 1) - 0.5) * 1.6));
      } else {
        const c = (around ?? m.position).clone().setY(0);
        const a = rnd(k) * Math.PI * 2; const r = 0.4 + rnd(k + 5) * spread;
        to = c.add(V3(Math.cos(a) * r, 0.012 + (k % 9) * 0.0012, Math.sin(a) * r * 0.8));
      }
      this.fly(o, to, { high, k, stays: !!into || onto === 'tables' });
    }
    this.cue('tick');
  }
  fly(from, to, { high = 2.4, k = 0, stays = false, ms = null } = {}) {
    const s = this.sheet();
    s.position.copy(from);
    const up = Math.max(from.y, to.y) + high * (0.7 + 0.5 * rnd(k + 9));
    const dur = ms ?? 1300 + high * 280 + rnd(k + 4) * 500;
    const spin = (rnd(k + 6) - 0.5) * 8;
    const flat = to.y < 0.3 || stays;
    const rock = 0.6 + rnd(k + 7) * 0.5;
    s.userData.flying = true;
    this.tweens.run(dur, (u) => {
      if (!s.parent) return;
      // up fast, down slowly, rocking like paper
      const rise = 0.28;
      const y = u < rise ? from.y + (up - from.y) * Math.sin((u / rise) * Math.PI / 2) : up + (to.y - up) * ease((u - rise) / (1 - rise));
      s.position.set(from.x + (to.x - from.x) * u + Math.sin(u * 13 + k) * 0.25 * (1 - u), y, from.z + (to.z - from.z) * u);
      s.rotation.set(-Math.PI / 2 * (flat ? u : u * 0.5) + Math.sin(u * 11 + k) * rock * (1 - u), spin * u, Math.sin(u * 7 + k) * 0.6 * (1 - u));
    }).then(() => {
      if (!s.parent) return;
      s.userData.flying = false;
      s.position.copy(to);
      s.rotation.set(flat ? -Math.PI / 2 : -0.4, 0, rnd(k) * Math.PI * 2);
      if (to.y < 0.3) this.world.puff?.(to.clone().setY(0.05), { scale: 0.2, seed: k });
    });
    return s;
  }
  sheet() {
    // the oldest copy on the grass goes once there are too many
    if (this.copies.length >= GIVEAWAY.copiesMax) {
      const old = this.copies.find((c) => !c.userData.flying && !c.userData.held);
      if (old) { this.world.root.remove(old); this.copies.splice(this.copies.indexOf(old), 1); }
    }
    const s = new THREE.Mesh(this.sheetGeo, this.paper);
    s.name = 'DrawingCopy';
    s.userData.noFit = true;
    this.world.root.add(s);
    this.copies.push(s);
    return s;
  }
  lay(at, k) { const s = this.sheet(); s.position.copy(at).setY(0.012 + (k % 9) * 0.001); s.rotation.set(-Math.PI / 2, 0, rnd(k) * 6); }

  // v0.32 (Tiffany's "Edits #6": "painting a huge version of it"): a huge copy of the drawing painted
  // onto the grass at `at`, stroke by stroke from left to right over `ms`, with a paint pot beside it
  paintHuge(at, ms = 2400) {
    if (this.huge) this.world.root.remove(this.huge);
    const g = new THREE.Group(); g.name = 'HugeCopy';
    const W = 3.4; const H = 2.6;
    const mat = this.paper.clone();
    const geo = new THREE.PlaneGeometry(W, H); geo.translate(W / 2, 0, 0);
    const sheet = new THREE.Mesh(geo, mat); sheet.rotation.x = -Math.PI / 2; sheet.position.set(-W / 2, 0.02, 0);
    g.add(sheet);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.24, 14), new THREE.MeshBasicMaterial({ color: 0x3f9bd8 }));
    pot.position.set(-W / 2 - 0.35, 0.12, 0.8); g.add(pot);
    g.traverse((o) => { o.userData.noFit = true; o.userData.noOutline = true; });
    g.position.copy(at).setY(0);
    this.world.root.add(g);
    this.huge = g;
    sheet.scale.x = 0.01;
    if (this.reduced) { sheet.scale.x = 1; return; }
    const strokes = 6;
    this.tweens.run(ms, (k) => { const s2 = Math.floor(k * strokes + 0.5) / strokes; sheet.scale.x = Math.max(0.01, Math.min(1, s2 * 0.7 + k * 0.3)); });
    for (let i = 0; i < strokes; i++) this.tweens.wait((i * ms) / strokes).then(() => this.cue('brush'));
  }
  // one down the chimney: a puff of smoke answers
  chimneyDrop() {
    const top = this.world.smoke?.top ?? this.model.position.clone().setY(this.model.position.y + 1);
    const s = this.fly(this.model.position.clone().setY(this.model.position.y + 1.5), top.clone().add(V3(0, -0.6, 0)), { high: 1.2, k: 99, ms: 1100 });
    this.tweens.wait(1150).then(() => { if (s.parent) { this.world.root.remove(s); this.copies.splice(this.copies.indexOf(s), 1); } this.world.puff?.(top.clone().add(V3(0, 0.3, 0)), { scale: 1.2 }); this.cue('pop'); });
  }
  // from inside: one sails out of the window
  windowCopy() {
    const h = this.world.objects.D01;
    const w = h.localToWorld(V3(-1.08, 1.6, 2.2));
    this.fly(w, w.clone().setY(0).add(V3(0.4, 0.012, 1.6)), { high: 1.2, k: 77 });
    this.say(GIVEAWAY_WORDS.inside, w.clone().add(V3(0, 0.6, 0)), 1300);
  }
  // Dwight gets one: it lands in his hands, and he holds it up
  giveDwight() {
    const a = this.world.archers?.A1;
    if (!a?.root.visible) return;
    const arms = a.arms ?? a.root;
    const s = this.fly(this.model.position.clone().setY(1.5), a.root.position.clone().setY(1.25), { high: 0.6, k: 55, ms: 800, stays: true });
    this.tweens.wait(820).then(() => {
      if (!s.parent) return;
      s.userData.held = true;
      arms.attach(s);
      s.position.set(0, -0.15, 0.42); s.rotation.set(-0.2, 0, 0);
      const ws = V3(); arms.getWorldScale(ws); s.scale.setScalar(1 / Math.max(1e-3, ws.x));
      this.dwightSheet = s;
    });
  }
  // the very last copy: into Vanessa's hands
  giveLast() {
    this.armful.visible = false;
    this.say(GIVEAWAY_WORDS.last, this.model.position, 1700);
    const s = this.fly(this.model.position.clone().setY(1.4), this.vPos.clone().setY(1.25), { high: 0.4, k: 66, ms: 700, stays: true });
    s.userData.held = true;
    this.lastCopy = s;
    this.events.push('last');
    this.cue('cue');
  }

  // ---------- the neighbours and the birds ----------
  buyersIn() {
    this.buyers.forEach((b, i) => {
      b.obj.visible = true;
      b.from = this.T.inBuyers[i] ?? this.T.buyerAt[0].clone().add(V3(i, 0, 8));
      b.to = this.T.buyerAt[i] ?? this.T.buyerAt[0].clone().add(V3(i * 0.7, 0, 0));
      b.t0 = this.t + i * 160; b.ms = 1100; b.away = null; // (v0.32: they come quicker)
      b.obj.position.copy(b.from);
    });
  }
  hand(i) {
    const b = this.buyers[i];
    if (!b?.obj.visible) return;
    // (one already in hand goes up in the air for joy and down onto the grass)
    if (b.sheet) {
      const old = b.sheet; b.sheet = null; old.userData.held = false;
      const from = old.position.clone(); const to = b.obj.position.clone().add(V3(0.6 * (i % 2 ? 1 : -1), 0.013, 0.5));
      old.userData.flying = true;
      this.tweens.run(1200, (k) => { if (!old.parent) return; old.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k + Math.sin(Math.PI * k) * 1.6, from.z + (to.z - from.z) * k); old.rotation.set(-Math.PI / 2 * k, k * 4, 0); })
        .then(() => { old.userData.flying = false; old.position.copy(to); old.rotation.set(-Math.PI / 2, 0, i); });
    }
    const s = this.fly(this.model.position.clone().setY(1.5), b.obj.position.clone().setY(1.2), { high: 0.5, k: 30 + i, ms: 700, stays: true });
    s.userData.held = true;
    // (v0.32, Tiffany's "Edits #6": the neighbours "leave as soon as the[y] get a picture"): off they go with it
    this.tweens.wait(720).then(() => { if (!s.parent) return; b.sheet = s; s.rotation.set(-0.15, 0, 0); this.say(GIVEAWAY_WORDS.ooh[i % 4], b.obj.position.clone().setY(2), 1000); b.cheer = this.t; b.away = { t0: this.t + 250, ms: 1700, from: b.obj.position.clone().setY(0) }; });
  }
  stepBuyers(dtMs) {
    for (const b of this.buyers ?? []) {
      if (!b.obj.visible || b.t0 === undefined) continue;
      const k = Math.max(0, Math.min(1, (this.t - b.t0) / b.ms));
      b.obj.position.lerpVectors(b.from, b.to, ease(k));
      if (b.away && this.t >= b.away.t0) {
        const u = Math.min(1, (this.t - b.away.t0) / b.away.ms);
        b.obj.position.lerpVectors(b.away.from, b.from, ease(u));
        b.obj.position.y = Math.abs(Math.sin(u * Math.PI * 7)) * 0.05;
        b.obj.rotation.y = Math.atan2(b.from.x - b.obj.position.x, b.from.z - b.obj.position.z);
        if (b.sheet && !b.sheet.userData.flying) { b.sheet.position.copy(b.obj.position).add(V3(Math.sin(b.obj.rotation.y) * 0.28, 1.25, Math.cos(b.obj.rotation.y) * 0.28)); b.sheet.rotation.set(-0.15, b.obj.rotation.y, 0); }
        if (u >= 1) { b.obj.visible = false; b.away = null; if (b.sheet) { b.sheet.parent?.remove(b.sheet); b.sheet = null; } }
        continue;
      }
      const hop = k < 1 ? Math.abs(Math.sin(k * Math.PI * 7)) * 0.05 : b.cheer !== undefined ? Math.max(0, Math.sin((this.t - b.cheer) / 140)) * 0.12 * Math.exp(-(this.t - b.cheer) / 2500) : 0;
      b.obj.position.y = hop;
      const look = k < 1 ? b.to : this.model.position;
      b.obj.rotation.y = Math.atan2(look.x - b.obj.position.x, look.z - b.obj.position.z);
      if (b.sheet && !b.sheet.userData.flying) b.sheet.position.copy(b.obj.position).add(V3(Math.sin(b.obj.rotation.y) * 0.28, 1.25 + Math.sin(this.t / 300) * 0.04, Math.cos(b.obj.rotation.y) * 0.28));
      if (b.sheet && !b.sheet.userData.flying) b.sheet.rotation.set(-0.15, b.obj.rotation.y, 0);
    }
    if (this.lastCopy && !this.lastCopy.userData.flying) {
      const h = this.hero;
      this.lastCopy.position.copy(h.view.position).add(V3(Math.sin(h.yaw) * 0.32, 1.3, Math.cos(h.yaw) * 0.32));
      this.lastCopy.rotation.set(-0.1, h.yaw, 0);
    }
  }
  birdsIn() {
    this.birds.forEach((b, i) => {
      const grab = this.copies.filter((c) => !c.userData.flying && !c.userData.held && c.position.y < 0.3).slice(-1 - i)[0];
      if (!grab) return;
      grab.userData.held = true;
      const start = grab.position.clone().add(V3(-6 + i * 12, 6, -4));
      const end = grab.position.clone().add(V3(9 - i * 18, 7.5, -7));
      b.obj.visible = true;
      b.phase = { t: 0, ms: 4200 + i * 400, start, at: grab.position.clone(), end, grab, delay: i * 700 };
    });
    this.cue('squawk');
    this.say(GIVEAWAY_WORDS.birds, this.model.position.clone().add(V3(1.5, 1, -1)), 1200);
  }
  stepBirds(dtMs) {
    for (const b of this.birds ?? []) {
      const p = b.phase;
      if (!p) continue;
      p.t += dtMs;
      const u = Math.max(0, p.t - p.delay) / p.ms;
      if (u >= 1) { b.obj.visible = false; b.phase = null; if (p.grab.parent) { this.world.root.remove(p.grab); this.copies.splice(this.copies.indexOf(p.grab), 1); } continue; }
      const a = u < 0.45 ? p.start.clone().lerp(p.at.clone().setY(0.5), ease(u / 0.45)) : p.at.clone().setY(0.5).lerp(p.end, ease((u - 0.45) / 0.55));
      const dir = (u < 0.45 ? p.at.clone().sub(p.start) : p.end.clone().sub(p.at));
      b.obj.position.copy(a);
      b.obj.rotation.y = Math.atan2(dir.x, dir.z);
      const flap = Math.sin(this.t / 70) * 0.7;
      if (b.wl) b.wl.rotation.z = flap; if (b.wr) b.wr.rotation.z = -flap;
      if (u >= 0.45) { p.grab.position.copy(a).add(V3(0, -0.3, 0)); p.grab.rotation.set(-0.3, b.obj.rotation.y, Math.sin(this.t / 90) * 0.3); }
    }
  }

  say(text, at, ms = 1300) { this.world.inkWord?.(text, at.clone().setY((at.y ?? 0) + 2.25), { h: 0.42, ms }); }
  cue(name) { this.onCue(name); }

  // ---------- the end ----------
  skip() { if (this.active) this.end(); }
  end() {
    if (!this.active) return;
    this.active = false;
    if (this.model) { this.model.visible = false; for (const a of Object.values(this.acts)) a.stop(); this.armful.visible = false; }
    this.world.setDoorOpen(0);
    for (const b of this.buyers ?? []) { b.obj.visible = false; b.t0 = undefined; b.sheet = null; b.away = null; }
    // (the huge painted copy fades with the copies)
    if (this.huge) { const hm = this.huge; this.huge = null; const mat = hm.children[0]?.material; this.tweens.wait(GIVEAWAY.fadeAfterMs).then(() => this.tweens.run(1200, (k) => { if (mat) { mat.transparent = true; mat.opacity = 1 - k; } })).then(() => this.world.root.remove(hm)); }
    for (const b of this.birds ?? []) { b.obj.visible = false; b.phase = null; }
    if (this.dwightSheet) { this.dwightSheet.parent?.remove(this.dwightSheet); this.dwightSheet = null; }
    if (this.lastCopy) { this.world.root.remove(this.lastCopy); this.copies.splice(this.copies.indexOf(this.lastCopy), 1); this.lastCopy = null; }
    // the copies lie a while where they fell (the ones held in hands go), then fade
    const copies = this.copies.filter((c) => { if (c.userData.held || c.userData.flying || c.parent !== this.world.root) { c.parent?.remove(c); return false; } return true; });
    this.copies = [];
    const fade = this.paper.clone(); fade.transparent = true;
    for (const c of copies) c.material = fade;
    this.tweens.wait(GIVEAWAY.fadeAfterMs).then(() => this.tweens.run(1200, (k) => { fade.opacity = 1 - k; }))
      .then(() => { for (const c of copies) this.world.root.remove(c); fade.dispose(); });
    this.hero.body.position.set(this.vPos.x, this.hero.body.position.y, this.vPos.z);
    this.hero.view.visible = true;
  }
  clear() { for (const c of this.copies) c.parent?.remove(c); this.copies = []; this.fk = undefined; this.hopAt = undefined; this.hopY = 0; this.snatched = false; this.cur = null; this.lastStop = false; this.saidDown = false; this.lungeAt = undefined; this.thrown = 0; }
}

// a point `d` metres along a planned path (walk.js pts and cum), with its direction
function along(pts, cum, d) {
  let i = 1;
  while (i < pts.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1]; const b = pts[i];
  const seg = Math.max(1e-6, cum[i] - cum[i - 1]);
  const k = Math.max(0, Math.min(1, (d - cum[i - 1]) / seg));
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dx: b.x - a.x, dz: b.z - a.z };
}
// a point a fraction `u` of the way along a polyline of world points (with height)
function alongPts(pts, u) {
  const lens = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); lens.push(l); total += l; }
  let d = u * total;
  for (let i = 1; i < pts.length; i++) {
    const l = lens[i - 1];
    if (d <= l || i === pts.length - 1) {
      const k = l > 0 ? Math.min(1, d / l) : 1;
      const a = pts[i - 1]; const b = pts[i];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, dx: b.x - a.x, dz: b.z - a.z };
    }
    d -= l;
  }
  const b = pts.at(-1);
  return { x: b.x, y: b.y, z: b.z, dx: 0, dz: 0 };
}
