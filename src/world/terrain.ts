/**
 * The island: a heightfield shaped by an island mask, hills, the northern mountains, flat pads for every
 * place, roads and a river. Also the collision world (circles and boxes in a spatial hash).
 */
import * as THREE from 'three';
import { fbm2, noise2 } from '../core/noise';
import { REGIONS, ROADS, REGION_BY_ID, TREE_POS, type RegionDef } from '../data/regions';
import { clamp, smoothstep, lerp } from '../core/util';
import { toonRamp } from './kit';

export const WORLD = { size: 1100, seg: 275, cx: 0, cz: -80 };

interface RoadSeg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  ya: number;
  yb: number;
  t0: number;
  t1: number;
  len: number;
}

export const RIVER: [number, number][] = [
  [-150, -120], [-110, -40], [-82, 40], [-60, 110], [-44, 168], [-40, 230], [-52, 290], [-70, 350], [-86, 420],
];

const roadSegs: RoadSeg[] = [];
(() => {
  for (const r of ROADS) {
    const A = REGION_BY_ID[r.a], B = REGION_BY_ID[r.b];
    const pts: [number, number][] = [[A.x, A.z], ...(r.via ?? []), [B.x, B.z]];
    let total = 0;
    const lens: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      lens.push(l);
      total += l;
    }
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      roadSegs.push({ ax: pts[i][0], az: pts[i][1], bx: pts[i + 1][0], bz: pts[i + 1][1], ya: A.y, yb: B.y, t0: acc / total, t1: (acc + lens[i]) / total, len: lens[i] });
      acc += lens[i];
    }
  }
})();

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): [number, number] {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2);
  const qx = ax + dx * t, qz = az + dz * t;
  return [Math.hypot(px - qx, pz - qz), t];
}

/** distance to the nearest road and the road's target height there */
export function roadInfo(x: number, z: number): { d: number; y: number } {
  let best = 1e9, y = 0;
  for (const s of roadSegs) {
    const [d, t] = segDist(x, z, s.ax, s.az, s.bx, s.bz);
    if (d < best) {
      best = d;
      const tt = s.t0 + (s.t1 - s.t0) * t;
      y = lerp(s.ya, s.yb, smoothstep(0, 1, tt));
    }
  }
  return { d: best, y };
}

export function riverDist(x: number, z: number): { d: number; t: number } {
  let best = 1e9, bt = 0;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [d, t] = segDist(x, z, RIVER[i][0], RIVER[i][1], RIVER[i + 1][0], RIVER[i + 1][1]);
    if (d < best) {
      best = d;
      bt = (i + t) / (RIVER.length - 1);
    }
  }
  return { d: best, t: bt };
}

/** analytic height before region pads/roads */
function baseHeight(x: number, z: number): number {
  const ex = (x - WORLD.cx) / 410, ez = (z - WORLD.cz) / 455;
  let d = Math.sqrt(ex * ex + ez * ez);
  d += fbm2(x * 0.0045, z * 0.0045, 3) * 0.1;
  // the harbour bay to the east, a cove at the beach
  const bay = Math.exp(-(((x - 352) / 70) ** 2 + ((z - 10) / 95) ** 2));
  const cove = Math.exp(-(((x - 20) / 90) ** 2 + ((z - 395) / 40) ** 2));
  d += bay * 0.35 + cove * 0.12;
  const land = smoothstep(1.0, 0.86, d);
  let h = -16 + land * 19;
  // rolling hills
  h += land * (fbm2(x * 0.009, z * 0.009, 4) * 7 + 3);
  // the sacred mountain massif to the north
  const md = Math.hypot(x - TREE_POS.x, (z - TREE_POS.z) * 0.85);
  const massif = Math.exp(-((md / 210) ** 2));
  const ridge = 1 - Math.abs(noise2(x * 0.006, z * 0.006));
  h += land * massif * (96 + ridge * 38);
  // western range (onsen valley) and eastern hills
  const west = Math.exp(-((Math.hypot(x + 300, z + 60) / 150) ** 2));
  h += land * west * (34 + ridge * 18);
  const castleHill = Math.exp(-((Math.hypot(x + 200, z + 262) / 60) ** 2));
  h += land * castleHill * 8;
  return h;
}

function regionBlend(x: number, z: number, h: number): number {
  for (const r of REGIONS) {
    const d = Math.hypot(x - r.x, z - r.z);
    const outer = r.r + 34;
    if (d < outer) {
      const k = smoothstep(outer, r.r * 0.86, d);
      // keep a little texture inside the pad
      const target = r.y + noise2(x * 0.05, z * 0.05) * 0.15;
      h = lerp(h, target, k);
    }
  }
  return h;
}

let grid: Float32Array | null = null;
const N = WORLD.seg + 1;
const cell = WORLD.size / WORLD.seg;
const x0 = WORLD.cx - WORLD.size / 2, z0 = WORLD.cz - WORLD.size / 2;

/** full height including pads, roads and river (used to build the grid) */
export function computeHeight(x: number, z: number): number {
  let h = baseHeight(x, z);
  h = regionBlend(x, z, h);
  const rd = roadInfo(x, z);
  if (rd.d < 11) h = lerp(h, rd.y, smoothstep(11, 3.5, rd.d));
  const rv = riverDist(x, z);
  if (rv.d < 16 && h > -2) {
    const bed = Math.min(h, riverSurface(rv.t) - 1.2);
    h = lerp(h, bed, smoothstep(16, 5, rv.d));
  }
  return h;
}

/** water level of the river along its course (t = 0 source … 1 mouth) */
export function riverSurface(t: number): number {
  return lerp(26, -0.2, smoothstep(0, 1, t * 1.05)) + 0.2;
}

export function buildGrid() {
  if (grid) return grid;
  grid = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) grid[j * N + i] = computeHeight(x0 + i * cell, z0 + j * cell);
  return grid;
}

/** bilinear height lookup from the grid (matches the mesh closely) */
export function heightAt(x: number, z: number): number {
  const g = grid ?? buildGrid();
  const fx = clamp((x - x0) / cell, 0, N - 1.001), fz = clamp((z - z0) / cell, 0, N - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz);
  const tx = fx - i, tz = fz - j;
  const a = g[j * N + i], b = g[j * N + i + 1], c = g[(j + 1) * N + i], d = g[(j + 1) * N + i + 1];
  // match the triangulation of PlaneGeometry (diagonal from (i,j+1) to (i+1,j))
  if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
  return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
}

export function normalAt(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
  const e = 1.5;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}

const C = (hex: string) => new THREE.Color(hex);
const PAL = {
  sand: C('#e8d6a8'), wetSand: C('#c9b383'), grass1: C('#7fbf5a'), grass2: C('#5aa04a'), grass3: C('#a6c96a'), dry: C('#b7b46a'),
  dirt: C('#b49268'), road: C('#cdb58e'), rock: C('#8a8790'), rock2: C('#6e6a74'), snow: C('#f4f6fb'), seabed: C('#3a6f7a'), forest: C('#3f7a45'), moss: C('#6a9a4a'), flowers: C('#e6a9c8'),
};

export function buildTerrainMesh(): THREE.Mesh {
  const g = buildGrid();
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, WORLD.seg, WORLD.seg);
  geo.rotateX(-Math.PI / 2);
  geo.translate(WORLD.cx, 0, WORLD.cz);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const gi = Math.round((x - x0) / cell), gj = Math.round((z - z0) / cell);
    pos.setY(i, g[gj * N + gi]);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const slope = 1 - nrm.getY(i);
    const n = fbm2(x * 0.03, z * 0.03, 2);
    const n2 = noise2(x * 0.11, z * 0.11);
    if (y < -1.5) c.copy(PAL.seabed).lerp(PAL.wetSand, smoothstep(-8, -1.5, y));
    else if (y < 1.3) c.copy(PAL.wetSand).lerp(PAL.sand, smoothstep(-1.5, 1.2, y));
    else if (y < 2.4 && Math.hypot(x - 20, z - 350) < 140) c.copy(PAL.sand).lerp(PAL.grass3, smoothstep(1.6, 2.6, y));
    else {
      c.copy(PAL.grass1).lerp(PAL.grass2, clamp(n * 0.8 + 0.4)).lerp(PAL.grass3, clamp(n2 * 0.4));
      if (n2 > 0.55 && y < 30) c.lerp(PAL.flowers, 0.25);
      if (y > 40) c.lerp(PAL.forest, smoothstep(40, 70, y) * 0.6);
      if (slope > 0.22) c.lerp(PAL.rock, smoothstep(0.22, 0.42, slope));
      if (y > 120) c.lerp(PAL.snow, smoothstep(120, 135, y + n * 6));
    }
    const rd = roadInfo(x, z);
    if (rd.d < 4.2 && y > 0.5) c.lerp(PAL.road, smoothstep(4.2, 2.2, rd.d) * 0.9);
    const rv = riverDist(x, z);
    if (rv.d < 9 && y > -1) c.lerp(PAL.wetSand, smoothstep(9, 5, rv.d) * 0.7);
    for (const r of REGIONS) {
      const d = Math.hypot(x - r.x, z - r.z);
      if (d < r.r * 0.9 && r.id !== 'praia') c.lerp(regionGround(r), smoothstep(r.r * 0.9, r.r * 0.5, d) * 0.55);
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.name = 'terrain';
  m.matrixAutoUpdate = false;
  return m;
}

function regionGround(r: RegionDef): THREE.Color {
  switch (r.id) {
    case 'comercio': return C('#c9b89a');
    case 'porto': return C('#bfb4a2');
    case 'neon': return C('#6e6a78');
    case 'castelo': return C('#cbbf9c');
    case 'santuario': return C('#c8b48c');
    case 'templo': return C('#b8ab8c');
    case 'pico': return C('#d8d2c4');
    case 'escola': return C('#a7c97a');
    default: return C('#9fc46e');
  }
}

// ───────────────────────── collision world ─────────────────────────

export interface Collider {
  x: number;
  z: number;
  /** circle radius (if set) */
  r?: number;
  /** box half extents + rotation */
  hw?: number;
  hd?: number;
  rot?: number;
  tag?: string;
  /** disabled colliders are ignored (e.g. opened gates) */
  off?: boolean;
}

export class Collision {
  private cells = new Map<string, Collider[]>();
  private readonly cs = 8;
  all: Collider[] = [];
  add(c: Collider): Collider {
    this.all.push(c);
    const ext = c.r ?? Math.hypot(c.hw ?? 0, c.hd ?? 0);
    const i0 = Math.floor((c.x - ext) / this.cs), i1 = Math.floor((c.x + ext) / this.cs);
    const j0 = Math.floor((c.z - ext) / this.cs), j1 = Math.floor((c.z + ext) / this.cs);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const k = i + ',' + j;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k)!.push(c);
      }
    return c;
  }
  circle(x: number, z: number, r: number, tag?: string) {
    return this.add({ x, z, r, tag });
  }
  /** box with the same yaw as an Object3D's rotation.y */
  box(x: number, z: number, w: number, d: number, rotY = 0, tag?: string) {
    return this.add({ x, z, hw: w / 2, hd: d / 2, rot: -rotY, tag });
  }
  /** pushes a circle (px,pz,pr) out of all colliders; returns corrected position */
  resolve(px: number, pz: number, pr: number): [number, number] {
    const i = Math.floor(px / this.cs), j = Math.floor(pz / this.cs);
    for (let it = 0; it < 2; it++) {
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++) {
          const list = this.cells.get(i + di + ',' + (j + dj));
          if (!list) continue;
          for (const c of list) {
            if (c.off) continue;
            if (c.r !== undefined) {
              const dx = px - c.x, dz = pz - c.z;
              const d = Math.hypot(dx, dz), min = c.r + pr;
              if (d < min && d > 1e-5) {
                px = c.x + (dx / d) * min;
                pz = c.z + (dz / d) * min;
              }
            } else {
              const cos = Math.cos(-(c.rot ?? 0)), sin = Math.sin(-(c.rot ?? 0));
              const lx = (px - c.x) * cos - (pz - c.z) * sin;
              const lz = (px - c.x) * sin + (pz - c.z) * cos;
              const hw = c.hw!, hd = c.hd!;
              const qx = clamp(lx, -hw, hw), qz = clamp(lz, -hd, hd);
              let dx = lx - qx, dz = lz - qz;
              let d = Math.hypot(dx, dz);
              let nlx = lx, nlz = lz;
              if (d < pr) {
                if (d < 1e-5) {
                  // inside: push out along the smallest axis
                  const ox = hw - Math.abs(lx), oz = hd - Math.abs(lz);
                  if (ox < oz) nlx = Math.sign(lx || 1) * (hw + pr);
                  else nlz = Math.sign(lz || 1) * (hd + pr);
                } else {
                  dx /= d;
                  dz /= d;
                  nlx = qx + dx * pr;
                  nlz = qz + dz * pr;
                }
                const c2 = Math.cos(c.rot ?? 0), s2 = Math.sin(c.rot ?? 0);
                px = c.x + nlx * c2 - nlz * s2;
                pz = c.z + nlx * s2 + nlz * c2;
                d = 0;
              }
            }
          }
        }
    }
    return [px, pz];
  }
}
