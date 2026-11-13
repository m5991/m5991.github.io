// Phone-readable poses layered over the existing rig; pure timing for regression tests.
//
// v0.22 (Tiffany: "Make sure she does everything it says to do, 'hop the stepping stones' etc"):
// every song spot's act (game/songs.js SPOTS `act.kind`) has a pose and a motion here, so the
// button's words are what Vanessa is seen doing. v0.21 had a pose for four of them (the bench, the
// door, the chimney, the bench cloth); at the other spots she stood still while a word popped up.
// `actionPose(kind, u)` gives, at u 0..1 of the act:
//   bones   { bone: [x, y, z] } rotations (rad) laid over her idle stance
//   blend   0..1, the ease in and out of the whole pose
//   travel  0..1 along the act's route (the chimney climb: there and back; the hops: one way)
//   lift    metres her body rises (a hop, a bounce; negative: a crouch)
//   roll    rad her whole body leans to her left (+) or right (-)
//   spin    rad she turns on the spot (the dance's twirl)
//   to      0..1 how far she has stepped to the act's own place (the tree's trunk, the window)
//   smile   0..1
//   prop    0..1 how far the act's own thing is out (the sheet held up, the pad, the paper picked up)
// Rig notes (measured on the model): Shoulder x < 0 raises the arm forward, z < 0 lifts the right
// arm out to the side (z > 0 the left), y > 0 turns the right arm in across the body (y < 0 the
// left); Elbow x < 0 bends it; Hip x < 0 swings the leg forward, Knee x > 0 bends it; Spine1 x > 0
// bows forward, z > 0 leans to her right; Head x < 0 looks up, z > 0 tilts to her right.
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (u) => { const t = clamp01(u); return t * t * (3 - 2 * t); };
// 0 outside [a, d], 1 inside [b, c], eased between
const span = (u, a, b, c, d) => smooth((u - a) / Math.max(1e-6, b - a)) * smooth((d - u) / Math.max(1e-6, d - c));
export const stepUpHeight = (from, to, u) => from + (to - from) * smooth(u) + Math.max(0, to - from) * 0.16 * Math.sin(Math.PI * clamp01(u));

// The kinds: what she does, in a few words (the tests check each act's verb against these words,
// so a button never names something she does not do).
export const ACTIONS = {
  bench: 'sits down on the bench, knees bent, and rests',
  clean: 'bends over the bench and wipes it with a cloth',
  chimney: 'climbs the wall and the roof to the chimney, and comes back down',
  roof: 'climbs the wall onto the roof, builds the chimney there, and comes back down',
  door: 'raises her fist and knocks on the door',
  dance: 'sways with her arms up, bounces and twirls',
  wave: 'looks up and waves her raised arm',
  reach: 'reaches out to the tools and leans the rake onto the shovel',
  fist: 'shakes her raised fist and stamps a foot',
  hug: 'steps up to the trunk and wraps both arms round it',
  joke: 'cups a hand to her mouth, leans in, then laughs',
  hop: 'hops from stone to stone along the line, arms out',
  whistle: 'puts her fingers to her lips and looks up',
  show: 'holds her drawing out before her with both hands, for the viewer to see',
  lean: 'leans her whole body sideways, toward the sunflowers',
  pockets: 'digs her hands into her pockets, then flings them out',
  shade: 'raises a hand to her brow and looks up',
  sketch: 'holds a pad and draws on it, glancing up',
  peek: 'cups her hands round her eyes and leans to the glass',
  toss: 'crouches, then throws both arms up',
  kiss: 'touches her hand to her lips and sweeps it out',
  pickup: 'bends down to the ground, picks it up and holds it',
  hello: 'leans to the plant and waves',
  pose: 'stands as in the drawing: facing front, hands in her pockets, smiling',
  draw: 'sweeps her arm round in a big circle',
  kick: 'kicks one foot up, then the other',
};
export const ACTION_KINDS = Object.keys(ACTIONS);

// the drawing's pose (D17; Tiffany: "show her facing the front smiling like the picture instead
// with her hands in her pockets"): elbows out, hands down in the overall's hip pockets, the
// ponytail swung out to her right as the drawing has it. k 0..1.
export function pocketPose(k = 1) {
  return {
    Shoulder_R: [0.2 * k, 0.65 * k, -0.45 * k], Elbow_R: [-0.55 * k],
    Shoulder_L: [0.2 * k, -0.65 * k, 0.45 * k], Elbow_L: [-0.55 * k],
    Ponytail1_M: [0, 0, -1.2 * k], Ponytail2_M: [0, 0, 0.45 * k], Ponytail3_M: [0, 0, 0.35 * k],
  };
}
// v0.23 (Tiffany: "At the end show the farmer looking up towards the people and smiling"): the
// final scene's pose is the drawing's, with her head lifted to the viewer: the camera looks down on
// her, so her face is raised to it (LOOK_UP radians at the neck and the head, a little at the chest)
// and she smiles. k 0..1.
export const LOOK_UP = { head: 0.42, neck: 0.16, chest: 0.07 };
export function finalePose(k = 1) {
  return { ...pocketPose(k), Head_M: [-LOOK_UP.head * k], Neck_M: [-LOOK_UP.neck * k], Chest_M: [-LOOK_UP.chest * k] };
}

// v0.23 (Tiffany: "When she is shoveling or raking make an animation of her doing it, not just
// holding the tool"): the work with a tool, as a pose over her stance and the path of the tool's
// foot on the ground before her. `u` is how far the work unit is (0..1: one weed, one spot);
// TOOL_STROKES strokes fit in it.
//   rake:   she reaches out with both arms and draws the rake's head back to her feet, bowing into
//           each pull;
//   shovel: she sets the blade, drives it into the earth with her foot on it, levers back and
//           lifts the earth out to her side.
// -> { bones, reach (m: the tool's foot ahead of her), side (m to her right), lift (m: its height;
//      below 0 the blade is in the ground), k (0..1 through this stroke), stroke (which one) }
export const TOOL_WORK = {
  rake: 'reaches out and draws the rake back through the weeds, bowing into each pull',
  shovel: 'drives the shovel into the earth with her foot, levers back and lifts the earth out',
};
export const TOOL_STROKES = { rake: 2, shovel: 2 };
export function toolPose(kind, u, reduced = false) {
  const n = TOOL_STROKES[kind] ?? 1;
  const x = clamp01(u) * n;
  const stroke = Math.min(n - 1, Math.floor(x));
  const k = reduced ? 0.5 : x - stroke;
  const bones = {};
  if (kind === 'rake') {
    // out over the first third, then the long pull home
    const out = k < 0.34 ? smooth(k / 0.34) : 1 - smooth((k - 0.34) / 0.66);
    bones.Spine1_M = [0.34 + 0.2 * out];
    // her hands at her waist as the rake comes home, out before her chest at the reach
    bones.Shoulder_R = [-0.45 - 0.55 * out, 0.3, -0.12]; bones.Elbow_R = [-0.8 + 0.55 * out];
    bones.Shoulder_L = [-0.35 - 0.55 * out, -0.42, 0.14]; bones.Elbow_L = [-0.95 + 0.55 * out];
    bones.Hip_L = [-0.32]; bones.Knee_L = [0.42]; bones.Hip_R = [0.12];
    bones.Head_M = [0.2];
    return { bones, reach: 0.62 + 0.55 * out, side: 0.06, lift: 0.02, k, stroke, out };
  }
  // the shovel: set (0-0.18), drive in (0.18-0.42), lever back (0.42-0.62), lift out and tip (0.62-1)
  const drive = smooth((k - 0.18) / 0.24) * (1 - smooth((k - 0.42) / 0.2));
  const sunk = smooth((k - 0.18) / 0.24) * (1 - smooth((k - 0.56) / 0.14));
  const lift = smooth((k - 0.58) / 0.2) * (1 - smooth((k - 0.86) / 0.14));
  bones.Spine1_M = [0.3 + 0.28 * drive - 0.16 * lift];
  bones.Shoulder_R = [-0.5 - 0.25 * drive - 0.45 * lift, 0.25, -0.1 - 0.35 * lift]; bones.Elbow_R = [-0.75 + 0.35 * drive - 0.25 * lift];
  bones.Shoulder_L = [-0.4 - 0.3 * drive - 0.35 * lift, -0.4, 0.12]; bones.Elbow_L = [-0.95 + 0.4 * drive];
  // her right foot comes up onto the blade and pushes it down
  const foot = smooth(k / 0.16) * (1 - smooth((k - 0.2) / 0.2));
  bones.Hip_R = [-0.8 * foot - 0.15 * drive]; bones.Knee_R = [1.1 * foot + 0.2 * drive];
  bones.Hip_L = [-0.1 * drive]; bones.Knee_L = [0.25 * drive];
  bones.Head_M = [0.22];
  return { bones, reach: 0.52 - 0.1 * lift, side: 0.05 + 0.32 * lift, lift: 0.1 - 0.24 * sunk + 0.36 * lift, k, stroke, drive, lifted: lift };
}

// v0.23 (Tiffany: "When she builds the chimney have her clime onto the roof first"): the climb for
// the chimney's DIY. u 0..1 of the whole (up, the build, down); `up` and `down` are the shares of
// it she climbs. -> travel 0..1 along the route (the wall, the roof, the chimney), `climb` 0..1 how
// much of the climbing pose shows, and its swing.
export function roofClimb(u, { up = 0.3, down = 0.2 } = {}) {
  const t = clamp01(u);
  const travel = t < up ? smooth(t / up) : t > 1 - down ? 1 - smooth((t - (1 - down)) / down) : 1;
  const moving = t < up ? Math.sin((t / up) * Math.PI) : t > 1 - down ? Math.sin(((t - (1 - down)) / down) * Math.PI) : 0;
  return { travel, climb: Math.min(1, moving * 1.6), onRoof: t >= up && t <= 1 - down };
}

// the hops along a route of `stones` places: [start, end] of each hop as fractions of the act
// (a short rest on every stone, a last beat on the far one)
export function hopSpans(stones) {
  const hops = Math.max(1, stones - 1);
  const lead = 0.1; const tail = 0.12;
  const each = (1 - lead - tail) / hops;
  return Array.from({ length: hops }, (_, i) => [lead + i * each, lead + i * each + each * 0.72]);
}
// where she is on the hop route at u: { i (the stone she left), k 0..1 across the gap, air 0..1 }
export function hopAt(u, stones) {
  const spans = hopSpans(stones);
  for (let i = 0; i < spans.length; i++) {
    const [a, b] = spans[i];
    if (u < a) return { i, k: 0, air: 0 };
    if (u <= b) { const k = (u - a) / (b - a); return { i, k: smooth(k), air: Math.sin(Math.PI * k) }; }
  }
  return { i: spans.length - 1, k: 1, air: 0 };
}

export function actionPose(kind, u, reduced = false, opts = {}) {
  const { stones = 5 } = opts;
  const blend = smooth(u / 0.18) * smooth((1 - u) / 0.18);
  const wave = reduced ? 0 : Math.sin(u * Math.PI * 12);
  const beat = reduced ? 0 : Math.sin(u * Math.PI * 6); // three slow swings over the act
  const bones = {};
  let travel = 0; let lift = 0; let roll = 0; let spin = 0; let to = 0; let smile = 0; let prop = 0;
  if (kind === 'bench') {
    for (const side of ['L', 'R']) { bones[`Hip_${side}`] = [-1.42 * blend]; bones[`Knee_${side}`] = [1.48 * blend]; }
    bones.Spine1_M = [0.12 * blend];
    smile = blend;
  } else if (kind === 'clean') {
    bones.Spine1_M = [0.55 * blend]; bones.Shoulder_R = [-0.9 * blend, 0.2 * wave, -0.25 * blend]; bones.Elbow_R = [-0.65 * blend];
    bones.Hip_L = [-0.25 * blend]; bones.Knee_L = [0.4 * blend];
  } else if (kind === 'chimney') {
    travel = u < 0.45 ? smooth(u / 0.45) : u < 0.62 ? 1 : 1 - smooth((u - 0.62) / 0.38);
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      bones[`Shoulder_${side}`] = [(-2.1 + sign * wave * 0.35) * blend];
      bones[`Elbow_${side}`] = [-0.45 * blend]; bones[`Hip_${side}`] = [(-0.55 + sign * wave * 0.45) * blend]; bones[`Knee_${side}`] = [(0.8 - sign * wave * 0.4) * blend];
    }
  } else if (kind === 'roof') {
    // v0.23: the chimney's DIY: up the wall and the roof, the hammering there (her arms are the
    // hammer's then), and down again
    const c = roofClimb(u, { up: opts.up, down: opts.down });
    travel = c.travel;
    const sw = reduced ? 0 : Math.sin(u * Math.PI * 26);
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      bones[`Shoulder_${side}`] = [(-2.1 + sign * sw * 0.35) * c.climb];
      bones[`Elbow_${side}`] = [-0.45 * c.climb]; bones[`Hip_${side}`] = [(-0.55 + sign * sw * 0.45) * c.climb]; bones[`Knee_${side}`] = [(0.8 - sign * sw * 0.4) * c.climb];
    }
  } else if (kind === 'door') {
    bones.Shoulder_R = [-1.3 * blend]; bones.Elbow_R = [(-0.9 + wave * 0.25) * blend];
  } else if (kind === 'dance') {
    // arms up and swaying, a bounce on each swing, one twirl in the second half
    const s = beat;
    bones.Shoulder_R = [-2.45 * blend, 0, (-0.35 + 0.4 * s) * blend]; bones.Shoulder_L = [-2.45 * blend, 0, (0.35 + 0.4 * s) * blend];
    bones.Elbow_R = [-0.35 * blend]; bones.Elbow_L = [-0.35 * blend];
    bones.Spine1_M = [0, 0, 0.2 * s * blend];
    bones.Hip_L = [-0.3 * Math.max(0, s) * blend]; bones.Knee_L = [0.6 * Math.max(0, s) * blend];
    bones.Hip_R = [-0.3 * Math.max(0, -s) * blend]; bones.Knee_R = [0.6 * Math.max(0, -s) * blend];
    lift = reduced ? 0 : 0.09 * Math.abs(s) * blend;
    roll = 0.12 * s * blend;
    spin = reduced ? 0 : Math.PI * 2 * smooth((u - 0.52) / 0.3);
    smile = blend;
  } else if (kind === 'wave') {
    bones.Shoulder_R = [-0.35 * blend, 0, -2.25 * blend]; bones.Elbow_R = [(-0.55 + 0.45 * wave) * blend];
    bones.Head_M = [-0.4 * blend]; bones.Spine1_M = [-0.08 * blend];
    smile = blend;
  } else if (kind === 'reach') {
    const k = span(u, 0.08, 0.3, 0.72, 0.95);
    bones.Shoulder_R = [-1.35 * k, 0, -0.1 * k]; bones.Elbow_R = [-0.22 * k];
    bones.Spine1_M = [0.26 * k]; bones.Hip_L = [-0.2 * k]; bones.Knee_L = [0.32 * k];
  } else if (kind === 'fist') {
    bones.Shoulder_R = [-1.95 * blend, 0, -0.45 * blend]; bones.Elbow_R = [(-1.45 + 0.32 * wave) * blend];
    bones.Shoulder_L = [0.15 * blend, -0.7 * blend, 0.6 * blend]; bones.Elbow_L = [-1.15 * blend];
    bones.Spine1_M = [0.2 * blend];
    const stamp = span(u, 0.26, 0.38, 0.4, 0.47); // the foot comes up, and down
    bones.Hip_R = [-0.85 * stamp]; bones.Knee_R = [1.2 * stamp];
  } else if (kind === 'hug') {
    to = span(u, 0.04, 0.24, 0.78, 0.98);
    const k = span(u, 0.14, 0.34, 0.72, 0.92);
    const squeeze = reduced ? 0 : 0.06 * Math.sin(u * Math.PI * 4);
    bones.Shoulder_R = [-1.32 * k, 0, (0.42 + squeeze) * k]; bones.Shoulder_L = [-1.32 * k, 0, (-0.42 - squeeze) * k];
    bones.Elbow_R = [-0.75 * k]; bones.Elbow_L = [-0.75 * k];
    bones.Spine1_M = [0.2 * k]; bones.Head_M = [0, 0, 0.32 * k];
    smile = k;
  } else if (kind === 'joke') {
    const tell = span(u, 0.05, 0.2, 0.46, 0.58); // hand to her mouth, leaning in
    const laugh = span(u, 0.55, 0.66, 0.86, 0.98); // then she laughs
    bones.Shoulder_R = [(-1.55 * tell - 0.55 * laugh), 0.5 * laugh, -0.5 * tell]; bones.Elbow_R = [-2.0 * tell - 1.5 * laugh];
    bones.Shoulder_L = [-0.55 * laugh, -0.5 * laugh, 0]; bones.Elbow_L = [-1.5 * laugh];
    bones.Spine1_M = [0.3 * tell + (0.12 + 0.1 * wave) * laugh];
    bones.Head_M = [-0.35 * laugh];
    lift = reduced ? 0 : 0.03 * Math.abs(wave) * laugh;
    smile = Math.max(tell * 0.5, laugh);
  } else if (kind === 'hop') {
    // (reduced motion: she steps from stone to stone, no leap)
    const h = hopAt(u, stones);
    const air = reduced ? 0 : h.air;
    travel = (h.i + h.k) / Math.max(1, stones - 1);
    lift = 0.42 * air;
    const arms = smooth(u / 0.1) * smooth((1 - u) / 0.1);
    bones.Shoulder_R = [0, 0, (-1.0 - 0.3 * air) * arms]; bones.Shoulder_L = [0, 0, (1.0 + 0.3 * air) * arms];
    for (const side of ['L', 'R']) { bones[`Hip_${side}`] = [-0.75 * air]; bones[`Knee_${side}`] = [1.25 * air]; }
    smile = arms;
  } else if (kind === 'whistle') {
    bones.Shoulder_R = [-1.5 * blend, 0.35 * blend, -0.32 * blend]; bones.Elbow_R = [-2.15 * blend];
    bones.Head_M = [-0.48 * blend]; bones.Chest_M = [-0.1 * blend];
  } else if (kind === 'show') {
    // out before her at arm's length, at chest height (never over her head: what she carries is there)
    const k = span(u, 0.05, 0.25, 0.8, 0.97);
    bones.Shoulder_R = [-1.42 * k, 0, 0.2 * k]; bones.Shoulder_L = [-1.42 * k, 0, -0.2 * k];
    bones.Elbow_R = [-0.18 * k]; bones.Elbow_L = [-0.18 * k];
    bones.Spine1_M = [-0.06 * k];
    lift = reduced ? 0 : 0.05 * Math.abs(beat) * k;
    smile = k; prop = k;
  } else if (kind === 'lean') {
    const k = span(u, 0.05, 0.35, 0.7, 0.97);
    const sway = reduced ? 0 : 0.04 * Math.sin(u * Math.PI * 4);
    roll = (0.3 + sway) * k;
    bones.Spine1_M = [0, 0, -0.32 * k]; bones.Head_M = [0, 0, -0.3 * k];
    bones.Shoulder_R = [0.15 * k, 0, 0.1 * k]; bones.Shoulder_L = [-0.5 * k, 0, 0.75 * k]; bones.Elbow_L = [-0.2 * k];
  } else if (kind === 'pockets') {
    const dig = span(u, 0.03, 0.16, 0.42, 0.5); // hands deep in her pockets, rummaging
    const fling = span(u, 0.46, 0.56, 0.84, 0.98); // and out they come
    const p = pocketPose(dig);
    const rummage = reduced ? 0 : 0.12 * wave * dig;
    bones.Shoulder_R = [p.Shoulder_R[0] - 0.45 * fling, p.Shoulder_R[1], p.Shoulder_R[2] - 1.5 * fling + rummage];
    bones.Shoulder_L = [p.Shoulder_L[0] - 0.45 * fling, p.Shoulder_L[1], p.Shoulder_L[2] + 1.5 * fling - rummage];
    bones.Elbow_R = [p.Elbow_R[0] - 0.25 * fling]; bones.Elbow_L = [p.Elbow_L[0] - 0.25 * fling];
    bones.Spine1_M = [0.12 * dig - 0.1 * fling];
    smile = fling;
  } else if (kind === 'shade') {
    bones.Shoulder_R = [-1.72 * blend, 0.55 * blend, -0.72 * blend]; bones.Elbow_R = [-2.05 * blend];
    bones.Shoulder_L = [0.15 * blend, -0.7 * blend, 0.6 * blend]; bones.Elbow_L = [-1.15 * blend];
    bones.Head_M = [-0.36 * blend]; bones.Spine1_M = [-0.1 * blend];
  } else if (kind === 'sketch') {
    const k = span(u, 0.04, 0.22, 0.82, 0.97);
    const look = reduced ? 0 : Math.max(0, Math.sin(u * Math.PI * 4 - 1.2)); // up at the farm, down at the pad
    bones.Shoulder_L = [-0.95 * k, -0.45 * k, 0.1 * k]; bones.Elbow_L = [-1.35 * k];
    bones.Shoulder_R = [-0.9 * k, 0.55 * k, -0.15 * k]; bones.Elbow_R = [(-1.45 + 0.16 * wave) * k];
    bones.Head_M = [(0.34 - 0.5 * look) * k];
    prop = k;
  } else if (kind === 'peek') {
    to = span(u, 0.03, 0.22, 0.8, 0.98);
    const k = span(u, 0.12, 0.3, 0.76, 0.94);
    bones.Shoulder_R = [-1.6 * k, 0.35 * k, -0.55 * k]; bones.Shoulder_L = [-1.6 * k, -0.35 * k, 0.55 * k];
    bones.Elbow_R = [-2.2 * k]; bones.Elbow_L = [-2.2 * k];
    bones.Spine1_M = [0.42 * k]; bones.Head_M = [-0.25 * k];
    bones.Hip_L = [-0.18 * k]; bones.Hip_R = [-0.18 * k];
  } else if (kind === 'toss') {
    const crouch = span(u, 0.04, 0.2, 0.24, 0.34);
    const up = span(u, 0.24, 0.36, 0.72, 0.95);
    bones.Shoulder_R = [-0.5 * crouch - 2.75 * up, 0, -0.18 * up]; bones.Shoulder_L = [-0.5 * crouch - 2.75 * up, 0, 0.18 * up];
    bones.Elbow_R = [-1.1 * crouch - 0.15 * up]; bones.Elbow_L = [-1.1 * crouch - 0.15 * up];
    for (const side of ['L', 'R']) { bones[`Hip_${side}`] = [-0.55 * crouch]; bones[`Knee_${side}`] = [0.95 * crouch]; }
    bones.Head_M = [-0.45 * up];
    lift = -0.12 * crouch + (reduced ? 0 : 0.1 * span(u, 0.28, 0.36, 0.38, 0.5));
    smile = up;
  } else if (kind === 'kiss') {
    const lips = span(u, 0.05, 0.2, 0.36, 0.48);
    const out = span(u, 0.42, 0.56, 0.8, 0.97);
    bones.Shoulder_R = [-1.5 * lips - 1.25 * out, 0.4 * lips, -0.25 * lips - 0.55 * out]; bones.Elbow_R = [-2.2 * lips - 0.25 * out];
    bones.Spine1_M = [0.1 * out]; bones.Head_M = [-0.1 * out];
    smile = Math.max(lips, out);
  } else if (kind === 'pickup') {
    const down = span(u, 0.05, 0.25, 0.36, 0.5);
    const hold = span(u, 0.46, 0.6, 0.84, 0.98);
    bones.Spine1_M = [0.85 * down + 0.1 * hold];
    for (const side of ['L', 'R']) { bones[`Hip_${side}`] = [-0.95 * down]; bones[`Knee_${side}`] = [1.5 * down]; }
    bones.Shoulder_R = [-1.15 * down - 1.0 * hold, 0.5 * hold, -0.1 * hold]; bones.Elbow_R = [-0.2 * down - 1.6 * hold];
    bones.Head_M = [0.3 * hold];
    lift = -0.3 * down;
    smile = hold; prop = Math.max(hold, smooth((u - 0.3) / 0.08) * (u < 0.55 ? 1 : 0));
  } else if (kind === 'hello') {
    bones.Shoulder_R = [-0.7 * blend, 0, -1.5 * blend]; bones.Elbow_R = [(-1.55 + 0.38 * wave) * blend];
    bones.Spine1_M = [0.22 * blend]; bones.Head_M = [0, 0, 0.22 * blend];
    smile = blend;
  } else if (kind === 'pose') {
    const k = span(u, 0.04, 0.24, 0.84, 0.98);
    Object.assign(bones, pocketPose(k));
    smile = k;
  } else if (kind === 'draw') {
    const k = span(u, 0.04, 0.2, 0.84, 0.98);
    const a = drawAngle(u);
    bones.Shoulder_R = [(-1.7 - 0.62 * Math.sin(a)) * k, 0, (-0.72 - 0.6 * Math.cos(a)) * k]; bones.Elbow_R = [-0.2 * k];
    bones.Head_M = [-0.18 * k, 0, 0.1 * Math.cos(a) * k];
    smile = k;
  } else if (kind === 'kick') {
    const s = beat;
    bones.Hip_L = [-1.05 * Math.max(0, s) * blend]; bones.Knee_L = [0.28 * Math.max(0, s) * blend];
    bones.Hip_R = [-1.05 * Math.max(0, -s) * blend]; bones.Knee_R = [0.28 * Math.max(0, -s) * blend];
    bones.Shoulder_R = [-0.7 * Math.max(0, s) * blend, 0, -0.55 * blend]; bones.Shoulder_L = [-0.7 * Math.max(0, -s) * blend, 0, 0.55 * blend];
    bones.Spine1_M = [-0.12 * Math.abs(s) * blend];
    lift = reduced ? 0 : 0.07 * Math.abs(s) * blend;
    smile = blend;
  }
  return { blend, bones, travel, lift, roll, spin, to, smile, prop };
}
// the angle of her hand round the circle she draws in the air (rad, from the top, one and a
// quarter turns), and how much of the circle is drawn by u (0..1): world.js draws the line
export const drawAngle = (u) => clamp01((u - 0.16) / 0.62) * Math.PI * 2.5;
export const drawnShare = (u) => clamp01((u - 0.16) / (0.62 / 1.25));
