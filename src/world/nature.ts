/**
 * Vegetation and rocks: instanced trees (sakura, black pine, cedar, maple, broadleaf, bamboo), bushes,
 * flowers and stones, scattered by biome and grouped in spatial chunks so the camera culls them.
 * Foliage sways in the wind (vertex shader).
 */
import * as THREE from 'three';
import { Builder, toonRamp, leafGeometry } from './kit';
import { heightAt, normalAt, roadInfo, riverDist, WORLD } from './terrain';
import { REGIONS } from '../data/regions';
import { Rng } from '../core/rng';
import { fbm2, noise2 } from '../core/noise';

export type TreeKind = 'sakura' | 'pine' | 'cedar' | 'maple' | 'broad' | 'bamboo' | 'bush' | 'rock' | 'flowers' | 'ginkgo' | 'willow';

const windUniforms = { uTime: { value: 0 }, uWind: { value: 1 } };

/** toon material with wind sway (instanced) */
export function foliageMaterial(sway = 1): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniforms.uTime;
    sh.uniforms.uWind = windUniforms.uWind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 ip = vec3(0.0);
          #ifdef USE_INSTANCING
            ip = instanceMatrix[3].xyz;
          #endif
          float k = max(0.0, position.y - 1.2) * ${(0.035 * sway).toFixed(4)} * uWind;
          float ph = ip.x * 0.13 + ip.z * 0.17;
          transformed.x += sin(uTime * 1.3 + ph) * k + sin(uTime * 2.9 + ph * 2.0) * k * 0.3;
          transformed.z += cos(uTime * 1.1 + ph) * k * 0.7;
        }`,
      );
  };
  return m;
}

export function updateWind(t: number, strength = 1) {
  windUniforms.uTime.value = t;
  windUniforms.uWind.value = strength;
}

// ───────────────────────── tree models ─────────────────────────

const P = {
  bark: '#5b4335', bark2: '#6d5241', barkDark: '#3e2e26',
  sak1: '#f9c9dc', sak2: '#f3a6c3', sak3: '#fde3ec',
  pine1: '#2f5e3a', pine2: '#3c7046', cedar1: '#2c5a3e', cedar2: '#3a6e4a',
  map1: '#e0482f', map2: '#f07a2e', map3: '#c9302a',
  br1: '#5f9a48', br2: '#77b257', br3: '#4c8640',
  bamboo: '#8fbf5a', bambooLeaf: '#6fae4a',
  ginkgo: '#f2c94c', ginkgo2: '#e8b53a',
  rock: '#8f8c96', rock2: '#77737f', moss: '#6f9a52',
};

function puff(b: Builder, r: number, color: string, x: number, y: number, z: number, sy = 0.8) {
  b.add(new THREE.IcosahedronGeometry(r, 1), color, { x, y, z, sy });
}

export function treeGeometry(kind: TreeKind, seed = 1): THREE.BufferGeometry {
  const b = new Builder();
  const r = new Rng(seed * 7919 + kind.length);
  switch (kind) {
    case 'sakura': {
      // gnarled trunk splitting into branches, wide pink canopy
      b.cyl(0.22, 0.38, 2.4, P.bark, { y: 1.2, rz: 0.08 });
      b.cyl(0.12, 0.2, 2.2, P.bark2, { x: 0.6, y: 2.9, rz: -0.6 });
      b.cyl(0.12, 0.2, 2.0, P.bark2, { x: -0.55, y: 2.8, rz: 0.65 });
      b.cyl(0.1, 0.16, 1.8, P.bark2, { z: 0.5, y: 3.0, rx: 0.5 });
      const cols = [P.sak1, P.sak2, P.sak3];
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2 + r.range(-0.2, 0.2);
        const d = r.range(0.6, 2.3);
        puff(b, r.range(1.0, 1.5), cols[i % 3], Math.cos(a) * d, r.range(3.4, 4.6), Math.sin(a) * d, 0.75);
      }
      puff(b, 1.6, P.sak2, 0, 4.7, 0, 0.7);
      break;
    }
    case 'pine': {
      // Japanese black pine: leaning trunk, flat cloud-like pads
      const lean = r.range(-0.25, 0.25);
      b.cyl(0.18, 0.32, 4.2, P.barkDark, { y: 2.1, rz: lean });
      const tx = -Math.sin(lean) * 4;
      const pads = 5;
      for (let i = 0; i < pads; i++) {
        const a = r.range(0, Math.PI * 2);
        const d = r.range(0.4, 1.6);
        const y = 2.6 + i * 0.55;
        b.add(new THREE.IcosahedronGeometry(1, 1), i % 2 ? P.pine1 : P.pine2, { x: tx * (y / 4.2) + Math.cos(a) * d, y, z: Math.sin(a) * d, sx: r.range(1.2, 1.8), sy: 0.42, sz: r.range(1.0, 1.5) });
      }
      break;
    }
    case 'cedar': {
      b.cyl(0.16, 0.28, 3.5, P.barkDark, { y: 1.75 });
      for (let i = 0; i < 4; i++) {
        const s = 1 - i * 0.2;
        b.cone(1.9 * s, 2.6 * s, i % 2 ? P.cedar1 : P.cedar2, { y: 3.0 + i * 1.35 }, 7);
      }
      break;
    }
    case 'maple': {
      b.cyl(0.16, 0.28, 2.6, P.bark, { y: 1.3 });
      const cols = [P.map1, P.map2, P.map3];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        puff(b, r.range(0.9, 1.3), cols[i % 3], Math.cos(a) * r.range(0.6, 1.6), r.range(3.0, 4.3), Math.sin(a) * r.range(0.6, 1.6), 0.8);
      }
      puff(b, 1.3, P.map1, 0, 4.6, 0, 0.8);
      break;
    }
    case 'ginkgo': {
      b.cyl(0.18, 0.3, 3.2, P.bark, { y: 1.6 });
      for (let i = 0; i < 5; i++) b.cone(1.6 - i * 0.25, 1.8, i % 2 ? P.ginkgo : P.ginkgo2, { y: 3 + i * 1.0 }, 9);
      break;
    }
    case 'willow': {
      b.cyl(0.2, 0.34, 3.0, P.bark, { y: 1.5, rz: 0.1 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        b.cyl(0.5, 0.12, 3.2, i % 2 ? P.br2 : P.br1, { x: Math.cos(a) * 1.3, y: 2.6, z: Math.sin(a) * 1.3 }, 6);
      }
      puff(b, 1.6, P.br1, 0, 4.2, 0, 0.6);
      break;
    }
    case 'broad': {
      b.cyl(0.18, 0.3, 3.0, P.bark, { y: 1.5 });
      const cols = [P.br1, P.br2, P.br3];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        puff(b, r.range(1.0, 1.5), cols[i % 3], Math.cos(a) * r.range(0.5, 1.4), r.range(3.2, 4.6), Math.sin(a) * r.range(0.5, 1.4), 0.85);
      }
      puff(b, 1.4, P.br2, 0, 5.0, 0, 0.85);
      break;
    }
    case 'bamboo': {
      for (let i = 0; i < 6; i++) {
        const x = r.range(-1.2, 1.2), z = r.range(-1.2, 1.2), hgt = r.range(6, 9);
        const lean = r.range(-0.08, 0.08);
        b.cyl(0.07, 0.09, hgt, P.bamboo, { x, y: hgt / 2, z, rz: lean }, 6);
        for (let k = 1; k < 5; k++) b.cyl(0.095, 0.095, 0.06, '#6f9a44', { x: x - lean * k * 1.6, y: k * hgt / 5, z }, 6);
        for (let k = 0; k < 4; k++) {
          const lg = leafGeometry(0.9, 0.22);
          b.add(lg, P.bambooLeaf, { x: x - lean * hgt, y: hgt - 0.6 - k * 0.5, z, rx: -1.2, rz: r.range(0, 6.28), ry: r.range(0, 6.28) });
        }
        puff(b, 0.7, P.bambooLeaf, x - lean * hgt, hgt - 0.4, z, 1.2);
      }
      break;
    }
    case 'bush': {
      const cols = [P.br1, P.br2, P.br3];
      for (let i = 0; i < 3; i++) puff(b, r.range(0.5, 0.8), cols[i], r.range(-0.6, 0.6), 0.45, r.range(-0.6, 0.6), 0.75);
      if (r.chance(0.4)) for (let i = 0; i < 5; i++) b.sphere(0.09, r.pick(['#f6b8cf', '#ffffff', '#ffd36b']), { x: r.range(-0.7, 0.7), y: r.range(0.6, 0.95), z: r.range(-0.7, 0.7) }, 0);
      break;
    }
    case 'flowers': {
      const cols = ['#f6b8cf', '#ffffff', '#ffd36b', '#b48cff', '#ff8a7a'];
      for (let i = 0; i < 9; i++) {
        const x = r.range(-1, 1), z = r.range(-1, 1);
        b.cyl(0.015, 0.015, 0.35, '#5a9a40', { x, y: 0.17, z }, 4);
        b.sphere(0.08, r.pick(cols), { x, y: 0.38, z }, 0);
      }
      break;
    }
    case 'rock': {
      const g = new THREE.IcosahedronGeometry(1, 1);
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const n = 0.75 + noise2(x * 2 + seed, z * 2 + y) * 0.25;
        pos.setXYZ(i, x * n * 1.2, y * n * 0.75, z * n);
      }
      b.add(g, r.chance(0.5) ? P.rock : P.rock2, { y: 0.35 }, false, 0.12);
      if (r.chance(0.5)) b.add(new THREE.IcosahedronGeometry(0.55, 0), P.moss, { y: 0.95, sy: 0.3, x: 0.1 });
      break;
    }
  }
  return b.geometry();
}

// ───────────────────────── scattering ─────────────────────────

interface Inst {
  x: number;
  y: number;
  z: number;
  s: number;
  ry: number;
  tilt?: number;
}

const CHUNK = 128;

export class Vegetation {
  readonly group = new THREE.Group();
  private chunks: { kind: TreeKind; mesh: THREE.InstancedMesh; cx: number; cz: number; small: boolean }[] = [];
  private mats = new Map<string, THREE.Material>();

  constructor(private density = 1) {}

  /** extra hand-placed instances (regions add sakura around the school, etc.) */
  readonly extra: Map<TreeKind, Inst[]> = new Map();

  place(kind: TreeKind, x: number, z: number, s = 1, ry = Math.random() * Math.PI * 2) {
    if (!this.extra.has(kind)) this.extra.set(kind, []);
    this.extra.get(kind)!.push({ x, y: heightAt(x, z), z, s, ry });
  }

  /** procedural scatter over the whole island, then build chunked instanced meshes */
  build() {
    const r = new Rng(2024);
    const all = new Map<TreeKind, Inst[]>();
    const push = (k: TreeKind, i: Inst) => {
      if (!all.has(k)) all.set(k, []);
      all.get(k)!.push(i);
    };
    const half = WORLD.size / 2;
    const step = 7 / Math.sqrt(this.density);
    const nrm = new THREE.Vector3();
    for (let z = WORLD.cz - half; z < WORLD.cz + half; z += step) {
      for (let x = WORLD.cx - half; x < WORLD.cx + half; x += step) {
        const px = x + r.range(-step * 0.45, step * 0.45), pz = z + r.range(-step * 0.45, step * 0.45);
        const y = heightAt(px, pz);
        if (y < 1.6 || y > 128) continue;
        normalAt(px, pz, nrm);
        if (nrm.y < 0.78) {
          if (y > 8 && r.chance(0.05)) push('rock', { x: px, y: y - 0.2, z: pz, s: r.range(0.8, 2.6), ry: r.range(0, 6.3) });
          continue;
        }
        const rd = roadInfo(px, pz);
        if (rd.d < 6) continue;
        const rv = riverDist(px, pz);
        if (rv.d < 9) continue;
        let inRegion = false;
        for (const g of REGIONS) {
          const d = Math.hypot(px - g.x, pz - g.z);
          if (d < g.r + 6) {
            inRegion = true;
            break;
          }
        }
        if (inRegion) continue;
        const forest = fbm2(px * 0.012, pz * 0.012, 3);
        const alt = y;
        const roll = r.next();
        // biome by altitude and noise
        if (alt > 34) {
          if (forest > -0.15 && roll < 0.55) push(roll < 0.4 ? 'cedar' : 'pine', { x: px, y: y - 0.1, z: pz, s: r.range(0.9, 1.6), ry: r.range(0, 6.3) });
          else if (roll < 0.6) push('rock', { x: px, y: y - 0.2, z: pz, s: r.range(0.6, 1.8), ry: r.range(0, 6.3) });
          continue;
        }
        // lowlands
        if (forest > 0.18) {
          if (roll < 0.5) push(forest > 0.38 ? 'cedar' : 'broad', { x: px, y: y - 0.1, z: pz, s: r.range(0.85, 1.4), ry: r.range(0, 6.3) });
          else if (roll < 0.62) push('bush', { x: px, y, z: pz, s: r.range(0.8, 1.4), ry: r.range(0, 6.3) });
          continue;
        }
        // groves near specific places
        const nearShrine = Math.hypot(px + 30, pz - 38) < 140;
        const nearOnsen = Math.hypot(px + 282, pz + 48) < 150;
        const nearSchool = Math.hypot(px + 165, pz - 148) < 120;
        if (nearShrine && forest < -0.25 && roll < 0.35) push('bamboo', { x: px, y, z: pz, s: r.range(0.9, 1.2), ry: r.range(0, 6.3) });
        else if ((nearOnsen || (nearShrine && forest > 0)) && roll < 0.12) push('maple', { x: px, y, z: pz, s: r.range(0.9, 1.3), ry: r.range(0, 6.3) });
        else if (nearSchool && roll < 0.1) push('sakura', { x: px, y, z: pz, s: r.range(0.9, 1.3), ry: r.range(0, 6.3) });
        else if (roll < 0.03) push('broad', { x: px, y, z: pz, s: r.range(0.8, 1.3), ry: r.range(0, 6.3) });
        else if (roll < 0.045) push('sakura', { x: px, y, z: pz, s: r.range(0.8, 1.2), ry: r.range(0, 6.3) });
        else if (roll < 0.09) push('bush', { x: px, y, z: pz, s: r.range(0.7, 1.3), ry: r.range(0, 6.3) });
        else if (roll < 0.15 && noise2(px * 0.05, pz * 0.05) > 0.2) push('flowers', { x: px, y, z: pz, s: r.range(0.8, 1.4), ry: r.range(0, 6.3) });
        else if (roll < 0.165) push('rock', { x: px, y: y - 0.15, z: pz, s: r.range(0.4, 1.2), ry: r.range(0, 6.3) });
      }
    }
    for (const [k, list] of this.extra) for (const i of list) push(k, i);
    const variants = 3;
    for (const [kind, list] of all) {
      const geos = Array.from({ length: kind === 'flowers' || kind === 'rock' || kind === 'bush' ? 2 : variants }, (_, v) => treeGeometry(kind, v + 1));
      const mat = this.material(kind);
      // bucket by chunk and variant
      const buckets = new Map<string, Inst[]>();
      list.forEach((inst, idx) => {
        const cx = Math.floor(inst.x / CHUNK), cz = Math.floor(inst.z / CHUNK);
        const key = `${cx},${cz},${idx % geos.length}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(inst);
      });
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
      const small = kind === 'bush' || kind === 'flowers' || kind === 'rock';
      for (const [key, insts] of buckets) {
        const [cx, cz, v] = key.split(',').map(Number);
        const mesh = new THREE.InstancedMesh(geos[v], mat, insts.length);
        insts.forEach((it, i) => {
          e.set(it.tilt ?? 0, it.ry, 0);
          q.setFromEuler(e);
          s3.setScalar(it.s);
          p3.set(it.x, it.y, it.z);
          m4.compose(p3, q, s3);
          mesh.setMatrixAt(i, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.castShadow = !small;
        mesh.receiveShadow = true;
        mesh.name = kind;
        this.group.add(mesh);
        this.chunks.push({ kind, mesh, cx, cz, small });
      }
    }
  }

  private material(kind: TreeKind): THREE.Material {
    const key = kind === 'rock' ? 'rock' : kind === 'bamboo' ? 'bamboo' : 'leafy';
    if (!this.mats.has(key)) {
      this.mats.set(key, key === 'rock' ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }) : foliageMaterial(key === 'bamboo' ? 1.6 : 1));
    }
    return this.mats.get(key)!;
  }

  /** hide small props in far chunks (cheap distance LOD) */
  update(cam: THREE.Vector3) {
    for (const c of this.chunks) {
      const dx = (c.cx + 0.5) * CHUNK - cam.x, dz = (c.cz + 0.5) * CHUNK - cam.z;
      const d = Math.hypot(dx, dz);
      c.mesh.visible = c.small ? d < 260 : d < 900;
    }
  }
}
