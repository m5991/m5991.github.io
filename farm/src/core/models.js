// Model registry: a readable port of the BASE registry `ne` (app.pretty.js 24755-24912) on
// upstream three r158. Models arrive as fetched .glb files (the BASE took base64 from
// window.models) and are parsed with GLTFLoader + the meshopt decoder. Every scene's top-level
// children register by name in one global map per kind, as in the BASE, so names must be
// unique across GLBs; a duplicate is an error here instead of a silent overwrite. Materials
// become the shared toon material (world/look.js; PBR values discarded, as the BASE did with
// its matte Lambert), keeping the authored colour.
// Unlike the BASE, unnamed primitives (gltfpack 1.3 drops mesh names) are renamed
// `<node>_<i>` so they cannot collide across files (slice finding for G.3 question 1).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { toonMaterial } from '../world/look.js';

export class ModelRegistry {
  constructor() {
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.objects = new Map(); // top-level nodes by name
    this.animations = new Map(); // clips by name
  }

  async load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const gltf = await new Promise((ok, err) => this.loader.parse(buf, '', ok, err));
    for (const clip of gltf.animations) {
      if (this.animations.has(clip.name)) throw new Error(`duplicate clip name ${clip.name} in ${url}`);
      this.animations.set(clip.name, clip);
    }
    for (const node of [...gltf.scene.children]) {
      if (this.objects.has(node.name)) throw new Error(`duplicate top-level node ${node.name} in ${url}`);
      node.traverse((o) => {
        if (o.isMesh) {
          o.material = toToon(o.material, !!o.geometry.attributes.color);
          if (/^mesh_\d+/.test(o.name) && o.parent) o.name = `${o.parent.name}_${o.parent.children.indexOf(o)}`;
        }
      });
      node.removeFromParent();
      this.objects.set(node.name, node);
    }
    return gltf;
  }

  // SkeletonUtils clone: rebinds skeletons, keeps morph targets (the BASE `mr.clone` does the same)
  instance(name) {
    const src = this.objects.get(name);
    if (!src) throw new Error(`no model node ${name}`);
    return cloneSkinned(src);
  }

  clip(name) {
    const c = this.animations.get(name);
    if (!c) throw new Error(`no clip ${name}`);
    return c;
  }
}

function toToon(m, vertexColors) {
  if (Array.isArray(m)) return m.map((x) => toToon(x, vertexColors));
  const t = toonMaterial({ color: m.color ?? 0xffffff, vertexColors, side: m.side });
  t.name = m.name;
  return t;
}
