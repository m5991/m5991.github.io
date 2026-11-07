// Phone-readable poses layered over the existing rig; pure timing for regression tests.
const smooth = (u) => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };
export const stepUpHeight = (from, to, u) => from + (to - from) * smooth(u) + Math.max(0, to - from) * 0.16 * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
export function actionPose(kind, u, reduced = false) {
  const blend = smooth(u / 0.18) * smooth((1 - u) / 0.18);
  const wave = reduced ? 0 : Math.sin(u * Math.PI * 12);
  const bones = {};
  let travel = 0;
  if (kind === 'bench') {
    for (const side of ['L', 'R']) { bones[`Hip_${side}`] = [-1.42 * blend]; bones[`Knee_${side}`] = [1.48 * blend]; }
    bones.Spine1_M = [0.12 * blend];
  } else if (kind === 'clean') {
    bones.Spine1_M = [0.55 * blend]; bones.Shoulder_R = [-0.9 * blend, 0.2 * wave, -0.25 * blend]; bones.Elbow_R = [-0.65 * blend];
    bones.Hip_L = [-0.25 * blend]; bones.Knee_L = [0.4 * blend];
  } else if (kind === 'chimney') {
    travel = u < 0.45 ? smooth(u / 0.45) : u < 0.62 ? 1 : 1 - smooth((u - 0.62) / 0.38);
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      bones[`Shoulder_${side}`] = [(-2.1 + sign * wave * 0.35) * blend];
      bones[`Elbow_${side}`] = [-0.45 * blend]; bones[`Hip_${side}`] = [(-0.55 + sign * wave * 0.45) * blend]; bones[`Knee_${side}`] = [(0.8 - sign * wave * 0.4) * blend];
    }
  } else if (kind === 'door') {
    bones.Shoulder_R = [-1.3 * blend]; bones.Elbow_R = [(-0.9 + wave * 0.25) * blend];
  }
  return { blend, bones, travel };
}
