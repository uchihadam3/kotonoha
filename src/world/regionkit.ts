/**
 * Shared context for region builders: geometry builder, collisions, sign atlas, NPC and word-spot
 * registration, walkable platforms, ponds and named spots.
 */
import * as THREE from 'three';
import { Builder } from './kit';
import { SignAtlas, signQuad, type SignStyle } from './textures';
import type { World } from './world';
import type { Look3D } from './characters';
import type { Platform } from '../game/player';
import { heightAt } from './terrain';
import type { TreeKind } from './nature';

export type NpcRole = 'teacher' | 'quest' | 'shop' | 'game' | 'talk' | 'guide';

export interface NpcSpawn {
  id: string;
  name: string;
  jp: string;
  x: number;
  z: number;
  ry?: number;
  look: Look3D;
  voice?: { pitch: number; rate: number };
  role: NpcRole;
  /** themes this person teaches */
  themes?: string[];
  /** registers this person speaks / teaches */
  registers?: string[];
  /** greeting [japanese, portuguese] */
  greet: [string, string];
  /** short self-description shown in the dialog header */
  title: string;
  wander?: number;
  game?: string;
  /** conversation situation ids */
  convos?: string[];
  /** sells things (opens the shop) */
  shop?: 'roupas';
  /** region id (filled by the builder) */
  region?: string;
}

export interface WordSpot {
  /** written form to look up in the vocabulary */
  w: string;
  x: number;
  z: number;
  y?: number;
  /** marker height above ground */
  h?: number;
  region?: string;
}

export interface Spot {
  id: string;
  x: number;
  z: number;
  y: number;
  r?: number;
  data?: Record<string, unknown>;
}

export class RegionCtx {
  b = new Builder();
  atlas: SignAtlas;
  private signGeos: THREE.BufferGeometry[] = [];
  private signGlowGeos: THREE.BufferGeometry[] = [];
  npcs: NpcSpawn[] = [];
  words: WordSpot[] = [];
  platforms: Platform[] = [];
  spots: Spot[] = [];
  region = '';

  constructor(readonly world: World, atlas: SignAtlas) {
    this.atlas = atlas;
  }

  get col() {
    return this.world.col;
  }

  ground(x: number, z: number) {
    return heightAt(x, z);
  }

  /** a sign: text drawn into the atlas, placed as a quad (both faces unless single) */
  sign(text: string, st: SignStyle, x: number, y: number, z: number, ry: number, w: number, h: number, opts: { glow?: boolean; double?: boolean } = {}) {
    const uv = this.atlas.add(text, st);
    const make = (flip: boolean) => {
      const g = signQuad(w, h, uv);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry + (flip ? Math.PI : 0), 0)), new THREE.Vector3(1, 1, 1));
      if (flip) {
        // offset slightly so back faces don't z-fight
        const off = new THREE.Vector3(0, 0, -0.02).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
        m.setPosition(x + off.x, y, z + off.z);
      } else {
        const off = new THREE.Vector3(0, 0, 0.02).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
        m.setPosition(x + off.x, y, z + off.z);
      }
      g.applyMatrix4(m);
      (opts.glow ? this.signGlowGeos : this.signGeos).push(g);
    };
    make(false);
    if (opts.double) make(true);
  }

  npc(n: NpcSpawn) {
    n.region = this.region;
    this.npcs.push(n);
  }

  word(w: string, x: number, z: number, h = 2.2, y?: number) {
    this.words.push({ w, x, z, h, y, region: this.region });
  }

  platform(p: Platform) {
    this.platforms.push(p);
  }

  spot(id: string, x: number, z: number, r?: number, data?: Record<string, unknown>) {
    this.spots.push({ id, x, z, y: heightAt(x, z), r, data });
  }

  tree(kind: TreeKind, x: number, z: number, s = 1) {
    this.world.veg.place(kind, x, z, s);
    if (kind !== 'flowers' && kind !== 'bush') this.col.circle(x, z, kind === 'bamboo' ? 0.9 : 0.45 * s);
  }

  /** merges everything built so far into the scene; returns the group */
  finish(name: string): THREE.Group {
    const g = this.b.build(name);
    if (this.signGeos.length || this.signGlowGeos.length) {
      const tex = this.atlas.texture();
      if (this.signGeos.length) {
        const m = new THREE.Mesh(mergeAll(this.signGeos), new THREE.MeshToonMaterial({ map: tex, transparent: true, alphaTest: 0.05 }));
        m.receiveShadow = true;
        g.add(m);
      }
      if (this.signGlowGeos.length) {
        const m = new THREE.Mesh(mergeAll(this.signGlowGeos), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, toneMapped: false }));
        m.name = 'neon';
        g.add(m);
      }
      this.signGeos = [];
      this.signGlowGeos = [];
    }
    this.world.scene.add(g);
    return g;
  }
}

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
function mergeAll(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(gs, false)!;
  g.computeBoundingSphere();
  return g;
}

/** common sign styles */
export const SIGN = {
  wood: (w = 256, h = 96): SignStyle => ({ bg: '#6a4a32', fg: '#fff3dc', border: '#3e2a1c', font: 'brush', w, h }),
  woodV: (w = 96, h = 320): SignStyle => ({ bg: '#7a5638', fg: '#fff3dc', border: '#3e2a1c', font: 'brush', vertical: true, w, h }),
  noren: (color = '#2c4a7c', w = 320, h = 140): SignStyle => ({ bg: color, fg: '#ffffff', font: 'brush', w, h }),
  plaque: (w = 120, h = 300): SignStyle => ({ bg: '#1e1c22', fg: '#e9c46a', border: '#e9c46a', font: 'mincho', vertical: true, w, h }),
  neon: (fg: string, w = 400, h = 120): SignStyle => ({ bg: '#0c0d18', fg, border: fg, font: 'ui', glow: fg, w, h }),
  neonV: (fg: string, w = 110, h = 380): SignStyle => ({ bg: '#0c0d18', fg, border: fg, font: 'ui', glow: fg, vertical: true, w, h }),
  paper: (w = 300, h = 110): SignStyle => ({ bg: '#f6efdf', fg: '#2a2318', border: '#8a6a3a', font: 'learn', w, h }),
  red: (w = 300, h = 110): SignStyle => ({ bg: '#c8442f', fg: '#fff5ea', border: '#7a1f14', font: 'brush', w, h }),
  stone: (w = 110, h = 300): SignStyle => ({ bg: '#8f8a82', fg: '#2a2622', font: 'brush', vertical: true, w, h }),
};
