// Masked animation manager: a readable port of the BASE `fo` (app.pretty.js 33562-33740) and
// its mask table `te` (24632-24664). A clip can be restricted to bone subtrees (include list
// minus exclude list) so an upper-body task plays over idle or walking legs. Actions are
// combinations of masked clips cross-faded together. The mixer is advanced by the world
// update only, so the world-pause gate freezes it.
import * as THREE from 'three';

function collectBones(root, startName, stop) {
  const start = root.getObjectByName(startName);
  const out = [];
  const walk = (b) => {
    if (stop.has(b.name)) return;
    out.push(b.name);
    for (const c of b.children) if (c.isBone) walk(c);
  };
  if (start) walk(start);
  return out;
}

export class MaskedAnimator {
  constructor(model) {
    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = {};
    this.actions = {}; // name -> [clip names]
    this.current = null;
  }

  // { name, clip, include?: [bone], exclude?: [bone] } (BASE addClip semantics)
  addClip({ name, clip, include = [], exclude = [] }) {
    let c = clip;
    if (include.length) {
      const stop = new Set(exclude.flatMap((b) => collectBones(this.model, b, new Set())));
      const keep = new Set(include.flatMap((b) => collectBones(this.model, b, stop)));
      c = clip.clone();
      c.tracks = c.tracks.filter((t) => keep.has(t.name.split('.')[0]));
      c.name = name;
    }
    const a = this.mixer.clipAction(c);
    this.clips[name] = a;
    return a;
  }

  defineAction(name, clipNames) { this.actions[name] = clipNames; }

  // Cross-fade to an action (a set of masked clips), like the BASE `fadeTo`. Calling it again
  // for the current action only updates the playback rate, so a locomotion clip can follow the
  // eased speed every frame. `phase` (0..1) starts the incoming clips at that point of their
  // cycle, so walk and run swap without a stumble.
  play(name, fade = 0.15, timeScale = 1, phase = null) {
    const next = this.actions[name];
    if (this.current === name) {
      for (const n of next) this.clips[n].setEffectiveTimeScale(timeScale);
      return;
    }
    const prev = this.current ? this.actions[this.current] : [];
    for (const n of prev) if (!next.includes(n)) this.clips[n].fadeOut(fade);
    for (const n of next) {
      const a = this.clips[n];
      a.setEffectiveTimeScale(timeScale);
      if (!prev.includes(n)) {
        a.reset().fadeIn(fade).play();
        if (phase !== null) a.time = phase * a.getClip().duration;
      }
    }
    this.current = name;
  }

  // normalized cycle position (0..1) of the current action's first clip
  phase() {
    const first = this.current && this.clips[this.actions[this.current][0]];
    if (!first) return 0;
    const d = first.getClip().duration;
    return d > 0 ? (first.time % d) / d : 0;
  }

  update(dtS) { this.mixer.update(dtS); }
}

// BASE mask table (te) adapted to Vanessa's clips.
export const VANESSA_MASKS = {
  legs: { include: ['Hip_R', 'Hip_L'], exclude: ['Spine1_M'] },
  upper: { include: ['Spine1_M'], exclude: ['Hip_R', 'Hip_L'] },
  walkLegs: { include: ['Root_M'], exclude: ['Scapula_R', 'Scapula_L'] },
  hands: { include: ['Scapula_R', 'Scapula_L'] },
};
