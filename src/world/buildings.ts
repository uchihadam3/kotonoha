/**
 * Japanese architecture kit: village houses, shops with noren, torii, shrine halls, stone and paper
 * lanterns, arched bridges, fences, wells, vending machines, stalls, a school, a pagoda, a castle keep,
 * neon towers, an onsen, a lighthouse and boats. Every builder writes painted pieces into a Builder and
 * registers its colliders.
 */
import * as THREE from 'three';
import { Builder, roofGeometry, curvedRoof } from './kit';
import type { Collision } from './terrain';
import { heightAt } from './terrain';
import { Rng } from '../core/rng';

export const COL = {
  woodDark: '#4a3426', wood: '#7a5638', woodLight: '#b0855a', plaster: '#efe6d2', plaster2: '#e6dcc4', shoji: '#f6f0de',
  roofTile: '#4d5563', roofTile2: '#3d4452', roofRidge: '#2e333d', thatch: '#b59a5c', thatchDark: '#8f7740',
  vermilion: '#d8432f', vermilionDark: '#a8281b', black: '#1e1c22', stone: '#a8a39a', stone2: '#8f8a82', moss: '#6f9a52',
  paperGlow: '#ffd9a0', lanternRed: '#e2483a', gold: '#e9c46a', noren: '#2c4a7c', concrete: '#d7d3cb', glass: '#9fc6dc',
  neonPink: '#ff4fc8', neonCyan: '#4fe8ff', neonYellow: '#ffe04f', steel: '#8c96a3',
};

export interface Ctx {
  b: Builder;
  col: Collision;
}

const ground = (x: number, z: number) => heightAt(x, z);

/** rotate local (lx, lz) by ry around (x, z) */
export function rot(x: number, z: number, ry: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}

// ───────────────────────── houses ─────────────────────────

export interface HouseOpts {
  w?: number;
  d?: number;
  h?: number;
  roof?: string;
  wall?: string;
  thatch?: boolean;
  floors?: 1 | 2;
  engawa?: boolean;
  seed?: number;
}

/** traditional village house (minka): posts, plaster/shoji walls, deep eaves, tiled or thatched roof */
export function house(c: Ctx, x: number, z: number, ry: number, o: HouseOpts = {}) {
  const { b, col } = c;
  const w = o.w ?? 7, d = o.d ?? 5.5, h = o.h ?? 2.7;
  const y = ground(x, z);
  const r = new Rng(o.seed ?? Math.floor(x * 13 + z * 7));
  b.push({ x, y, z, ry });
  // stone foundation
  b.box(w + 0.4, 0.45, d + 0.4, COL.stone2, { y: 0.2 });
  // floor and walls
  b.box(w, h, d, o.wall ?? COL.plaster, { y: 0.45 + h / 2 });
  // posts on corners and along the front
  const postC = COL.woodDark;
  for (const px of [-w / 2, w / 2]) for (const pz of [-d / 2, d / 2]) b.box(0.22, h + 0.1, 0.22, postC, { x: px, y: 0.45 + h / 2, z: pz });
  for (let i = 1; i < 4; i++) b.box(0.16, h, 0.16, postC, { x: -w / 2 + (w * i) / 4, y: 0.45 + h / 2, z: d / 2 + 0.02 });
  // horizontal beams
  b.box(w + 0.1, 0.18, 0.1, postC, { y: 0.45 + h - 0.2, z: d / 2 + 0.06 });
  b.box(w + 0.1, 0.12, 0.1, postC, { y: 0.45 + 0.9, z: d / 2 + 0.06 });
  // shoji panels (glow at night) on the front
  for (let i = 0; i < 4; i++) {
    const px = -w / 2 + (w * (i + 0.5)) / 4;
    if (i === 1) {
      // door
      b.box(w / 4 - 0.35, h - 0.45, 0.06, COL.wood, { x: px, y: 0.45 + (h - 0.45) / 2, z: d / 2 + 0.05 });
      continue;
    }
    b.box(w / 4 - 0.4, 1.05, 0.05, COL.paperGlow, { x: px, y: 0.45 + 1.55, z: d / 2 + 0.04 }, true);
    // lattice
    for (let k = -1; k <= 1; k++) b.box(0.04, 1.05, 0.07, postC, { x: px + k * 0.35, y: 0.45 + 1.55, z: d / 2 + 0.06 });
    b.box(w / 4 - 0.4, 0.04, 0.07, postC, { x: px, y: 0.45 + 1.55, z: d / 2 + 0.06 });
  }
  // side window
  b.box(0.05, 0.8, 1.2, COL.paperGlow, { x: w / 2 + 0.03, y: 0.45 + 1.6, z: 0 }, true);
  if (o.engawa !== false) {
    b.box(w + 0.6, 0.12, 1.1, COL.woodLight, { y: 0.6, z: d / 2 + 0.6 });
    for (const px of [-w / 2 - 0.2, 0, w / 2 + 0.2]) b.box(0.12, 0.5, 0.12, COL.woodDark, { x: px, y: 0.3, z: d / 2 + 1.1 });
  }
  // roof
  const rh = o.thatch ? 2.8 : 2.0;
  const rc = o.roof ?? (o.thatch ? COL.thatch : r.pick([COL.roofTile, COL.roofTile2, '#5a4a44', '#3e5a5a']));
  const top = 0.45 + h;
  b.add(roofGeometry(w + 1.8, d + 1.8, rh, o.thatch ? 0.05 : 0.32, o.thatch ? 0.4 : 0.6), rc, { y: top });
  b.box((w + 1.8) * (o.thatch ? 0.42 : 0.62), 0.22, 0.4, o.thatch ? COL.thatchDark : COL.roofRidge, { y: top + rh + 0.05 });
  if (!o.thatch) {
    // ridge end ornaments (onigawara)
    for (const s of [-1, 1]) b.box(0.3, 0.5, 0.45, COL.roofRidge, { x: s * (w + 1.8) * 0.31, y: top + rh + 0.15 });
  }
  if (o.floors === 2) {
    b.box(w * 0.7, 1.8, d * 0.7, o.wall ?? COL.plaster2, { y: top + 1.2 });
    b.box(w * 0.5, 0.7, 0.05, COL.paperGlow, { y: top + 1.3, z: d * 0.35 + 0.03 }, true);
    b.add(roofGeometry(w * 0.7 + 1.4, d * 0.7 + 1.4, 1.6, 0.28, 0.6), rc, { y: top + 2.1 });
    b.box((w * 0.7 + 1.4) * 0.62, 0.2, 0.35, COL.roofRidge, { y: top + 3.75 });
  }
  b.pop();
  col.box(x, z, w + 0.6, d + 0.6, ry);
}

/** shop front (machiya) with noren curtain + optional hanging sign slot. Returns sign anchor in world space */
export function shop(c: Ctx, x: number, z: number, ry: number, o: { w?: number; d?: number; color?: string; noren?: string; awning?: string; floors?: 1 | 2 } = {}) {
  const { b, col } = c;
  const w = o.w ?? 6, d = o.d ?? 6;
  const y = ground(x, z);
  b.push({ x, y, z, ry });
  b.box(w, 0.3, d, COL.stone2, { y: 0.15 });
  b.box(w, 3.0, d, o.color ?? COL.plaster2, { y: 0.3 + 1.5 });
  // open front with counter
  b.box(w - 0.8, 2.2, 0.1, '#3a2c22', { y: 0.3 + 1.1, z: d / 2 + 0.01 });
  b.box(w - 1.2, 0.9, 0.6, COL.woodLight, { y: 0.75, z: d / 2 + 0.3 });
  // goods on the counter (colored boxes)
  const goods = ['#e2483a', '#f2c94c', '#6fbf5a', '#f49ac0', '#ffffff', '#ff9a3a'];
  for (let i = 0; i < 5; i++) b.box(0.45, 0.25, 0.35, goods[(i + Math.floor(x)) % goods.length], { x: -w / 2 + 1 + i * ((w - 2) / 4), y: 1.33, z: d / 2 + 0.35 });
  // posts
  for (const px of [-w / 2, w / 2]) b.box(0.25, 3.2, 0.25, COL.woodDark, { x: px, y: 1.6, z: d / 2 });
  // noren (cloth) — colour band, the text is added separately as a sign
  const nc = o.noren ?? COL.noren;
  for (let i = 0; i < 4; i++) b.box((w - 1.2) / 4 - 0.08, 0.85, 0.04, nc, { x: -w / 2 + 0.6 + ((w - 1.2) * (i + 0.5)) / 4, y: 2.6, z: d / 2 + 0.12 });
  // awning
  b.box(w + 0.6, 0.12, 1.6, o.awning ?? COL.roofTile, { y: 3.3, z: d / 2 + 0.6, rx: 0.18 });
  // upper floor
  if (o.floors !== 1) {
    b.box(w, 2.4, d - 0.6, o.color ?? COL.plaster, { y: 0.3 + 3 + 1.2, z: -0.3 });
    for (let i = 0; i < 3; i++) b.box(w / 3 - 0.5, 1, 0.05, COL.paperGlow, { x: -w / 3 + (i * w) / 3, y: 4.6, z: d / 2 - 0.58 }, true);
    for (let i = 0; i < 9; i++) b.box(0.05, 1, 0.08, COL.woodDark, { x: -w / 2 + 0.4 + (i * (w - 0.8)) / 8, y: 4.6, z: d / 2 - 0.56 });
    b.add(roofGeometry(w + 1.2, d + 0.6, 1.5, 0.25, 0.7), COL.roofTile2, { y: 6.0, z: -0.3 });
  } else {
    b.add(roofGeometry(w + 1.2, d + 1.2, 1.6, 0.25, 0.7), COL.roofTile2, { y: 3.3 });
  }
  b.pop();
  col.box(x, z, w, d, ry);
  // sign anchor: above the awning, front
  const [sx, sz] = rot(x, z, ry, 0, d / 2 + 0.05);
  return { x: sx, y: y + (o.floors === 1 ? 3.95 : 3.75), z: sz, ry };
}

// ───────────────────────── sacred ─────────────────────────

export function torii(c: Ctx, x: number, z: number, ry: number, s = 1, color = COL.vermilion, collide = true) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry, s });
  const span = 4.2, hgt = 5.2;
  for (const px of [-span / 2, span / 2]) {
    b.cyl(0.22, 0.26, hgt, color, { x: px, y: hgt / 2 }, 12);
    b.cyl(0.3, 0.3, 0.45, COL.black, { x: px, y: 0.22 }, 12);
  }
  // nuki (tie beam)
  b.box(span + 0.9, 0.3, 0.26, color, { y: hgt - 1.25 });
  // gakuzuka (center strut)
  b.box(0.3, 0.75, 0.22, color, { y: hgt - 0.72 });
  // kasagi + shimaki: upturned top beams
  const kas = new THREE.BoxGeometry(span + 2.2, 0.36, 0.5, 8, 1, 1);
  const p = kas.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i);
    p.setY(i, p.getY(i) + Math.pow(Math.abs(vx) / ((span + 2.2) / 2), 2.2) * 0.45);
  }
  kas.computeVertexNormals();
  b.add(kas, color, { y: hgt - 0.1 });
  const kas2 = kas.clone();
  b.add(kas2, COL.black, { y: hgt + 0.25, sy: 0.7, sz: 1.1 });
  b.pop();
  if (collide) {
    const [ax, az] = rot(x, z, ry, -span / 2 * s, 0);
    const [bx, bz] = rot(x, z, ry, span / 2 * s, 0);
    col.circle(ax, az, 0.35 * s);
    col.circle(bx, bz, 0.35 * s);
  }
}

export function stoneLantern(c: Ctx, x: number, z: number, s = 1, lit = true) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, s });
  b.cyl(0.55, 0.65, 0.3, COL.stone2, { y: 0.15 }, 6);
  b.cyl(0.16, 0.2, 1.1, COL.stone, { y: 0.85 }, 8);
  b.cyl(0.45, 0.4, 0.22, COL.stone2, { y: 1.5 }, 6);
  b.box(0.55, 0.5, 0.55, COL.stone, { y: 1.85 });
  if (lit) b.box(0.4, 0.32, 0.58, COL.paperGlow, { y: 1.85 }, true);
  b.cone(0.62, 0.45, COL.stone2, { y: 2.32 }, 6);
  b.sphere(0.1, COL.stone2, { y: 2.6 }, 0);
  b.pop();
  col.circle(x, z, 0.5 * s);
}

/** red/white paper lantern (chōchin) hanging at (x, y, z) */
export function paperLantern(b: Builder, x: number, y: number, z: number, color = COL.lanternRed, s = 1) {
  b.cyl(0.08 * s, 0.08 * s, 0.08 * s, COL.black, { x, y: y + 0.42 * s, z }, 8);
  b.add(new THREE.SphereGeometry(0.3 * s, 10, 8), color, { x, y, z, sy: 1.35 }, true);
  b.cyl(0.08 * s, 0.08 * s, 0.08 * s, COL.black, { x, y: y - 0.42 * s, z }, 8);
}

export function shrineHall(c: Ctx, x: number, z: number, ry: number, s = 1) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry, s });
  // raised platform with steps
  b.box(11, 1.2, 9, COL.stone2, { y: 0.6 });
  for (let i = 0; i < 4; i++) b.box(3.5, 0.3, 0.6, COL.stone, { y: 0.15 + i * 0.3, z: 4.5 + 1.8 - i * 0.6 });
  b.box(9, 0.25, 7, COL.woodLight, { y: 1.32 });
  // pillars
  for (const px of [-4, -1.3, 1.3, 4]) for (const pz of [-3, 3]) b.cyl(0.25, 0.25, 3.6, COL.vermilion, { x: px, y: 1.2 + 1.8, z: pz }, 10);
  // walls
  b.box(7.6, 3.2, 5.4, COL.plaster, { y: 1.2 + 1.7, z: -0.2 });
  b.box(2.4, 2.6, 0.08, COL.woodDark, { y: 1.2 + 1.4, z: 2.52 });
  for (const px of [-2.6, 2.6]) b.box(2, 1.2, 0.06, COL.paperGlow, { x: px, y: 3.2, z: 2.52 }, true);
  // offering box + bell rope
  b.box(1.8, 0.8, 0.9, COL.woodDark, { y: 1.85, z: 3.6 });
  b.box(1.9, 0.08, 1.0, COL.gold, { y: 2.27, z: 3.6 });
  b.sphere(0.32, COL.gold, { y: 4.3, z: 3.3 }, 1);
  b.cyl(0.07, 0.07, 2.2, '#f2e6c8', { y: 3.1, z: 3.35 }, 6);
  // shimenawa rope with shide
  b.cyl(0.18, 0.18, 6.5, '#e8d8a8', { y: 4.55, z: 3.1, rz: Math.PI / 2 }, 8);
  for (let i = -2; i <= 2; i++) b.box(0.18, 0.5, 0.02, '#ffffff', { x: i * 1.2, y: 4.15, z: 3.12 });
  // big curved roof (two layers)
  b.add(curvedRoof(13.5, 11, 3.2), COL.roofTile2, { y: 4.8 });
  b.box(5.2, 0.4, 11.2, COL.roofRidge, { y: 8.0 });
  // chigi (crossed rafters) and katsuogi on the ridge
  for (const pz of [-5.4, 5.4]) {
    b.box(0.18, 1.6, 0.18, COL.gold, { y: 8.6, z: pz, rx: 0.5 });
    b.box(0.18, 1.6, 0.18, COL.gold, { y: 8.6, z: pz, rx: -0.5 });
  }
  for (let i = -2; i <= 2; i++) b.cyl(0.18, 0.18, 0.9, COL.gold, { y: 8.4, z: i * 1.6, rz: Math.PI / 2 }, 8);
  b.pop();
  col.box(x, z, 11 * s, 9 * s, ry);
}

/** small roadside shrine (hokora) — the Word Shrines where lessons can be reviewed */
export function hokora(c: Ctx, x: number, z: number, ry: number) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry });
  b.box(1.6, 0.5, 1.4, COL.stone2, { y: 0.25 });
  b.box(1.1, 1.0, 0.9, COL.wood, { y: 1.0 });
  b.box(0.7, 0.6, 0.05, COL.paperGlow, { y: 1.05, z: 0.46 }, true);
  b.add(roofGeometry(1.8, 1.6, 0.7, 0.12, 0.5), COL.roofTile2, { y: 1.5 });
  b.box(1.0, 0.1, 0.12, COL.vermilion, { y: 1.55, z: 0.75 });
  b.pop();
  col.box(x, z, 1.6, 1.4, ry);
}

export function foxStatue(c: Ctx, x: number, z: number, ry: number, s = 1) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry, s });
  b.box(0.9, 1.0, 0.9, COL.stone2, { y: 0.5 });
  b.add(new THREE.IcosahedronGeometry(0.42, 1), COL.stone, { y: 1.45, sy: 1.3 });
  b.add(new THREE.IcosahedronGeometry(0.3, 1), COL.stone, { y: 2.05, z: 0.1 });
  b.cone(0.13, 0.4, COL.stone, { y: 2.0, z: 0.42, rx: Math.PI / 2 }, 6);
  for (const s2 of [-1, 1]) b.cone(0.1, 0.35, COL.stone, { x: s2 * 0.15, y: 2.38 }, 5);
  b.box(0.5, 0.18, 0.05, COL.vermilion, { y: 1.75, z: 0.36 });
  b.add(new THREE.IcosahedronGeometry(0.22, 1), COL.stone2, { y: 1.3, z: -0.45, sy: 2.2 });
  b.pop();
  col.circle(x, z, 0.6 * s);
}

// ───────────────────────── village props ─────────────────────────

export function bridge(c: Ctx, x: number, z: number, ry: number, len = 12, width = 3, color = COL.vermilion) {
  const { b } = c;
  const y = Math.max(ground(x, z), 0.3);
  b.push({ x, y, z, ry });
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const z0 = -len / 2 + len * t0, z1 = -len / 2 + len * t1;
    const y0 = Math.sin(t0 * Math.PI) * 1.6 + 0.6, y1 = Math.sin(t1 * Math.PI) * 1.6 + 0.6;
    const zz = (z0 + z1) / 2, yy = (y0 + y1) / 2;
    const ang = Math.atan2(y1 - y0, z1 - z0);
    b.box(width, 0.2, len / segs + 0.05, COL.woodLight, { y: yy, z: zz, rx: -ang });
    for (const s of [-1, 1]) {
      b.box(0.12, 0.12, len / segs + 0.05, color, { x: s * width / 2, y: yy + 0.9, z: zz, rx: -ang });
      if (i % 2 === 0) b.box(0.14, 0.95, 0.14, color, { x: s * width / 2, y: yy + 0.45, z: zz });
    }
  }
  for (const s of [-1, 1]) for (const e of [-1, 1]) b.box(0.25, 1.4, 0.25, color, { x: s * width / 2, y: 1.1, z: e * len / 2 });
  b.pop();
}

export function fence(c: Ctx, x0: number, z0: number, x1: number, z1: number, color = COL.woodLight, collide = true) {
  const { b, col } = c;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.round(len / 1.6));
  const ry = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    b.box(0.14, 1.1, 0.14, COL.woodDark, { x, y: ground(x, z) + 0.55, z });
  }
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    const y = ground(x, z);
    b.box(0.06, 0.1, len / n, color, { x, y: y + 0.85, z, ry });
    b.box(0.06, 0.1, len / n, color, { x, y: y + 0.45, z, ry });
  }
  if (collide) col.box((x0 + x1) / 2, (z0 + z1) / 2, 0.3, len, ry);
}

export function stoneWall(c: Ctx, x0: number, z0: number, x1: number, z1: number, h = 1.2) {
  const { b, col } = c;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ry = Math.atan2(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    const y = ground(x, z);
    b.box(0.9, h * (0.85 + ((i * 37) % 10) / 50), len / n, i % 2 ? COL.stone : COL.stone2, { x, y: y + h / 2, z, ry });
  }
  b.box(1.0, 0.18, len, COL.roofTile2, { x: (x0 + x1) / 2, y: ground((x0 + x1) / 2, (z0 + z1) / 2) + h + 0.08, z: (z0 + z1) / 2, ry });
  col.box((x0 + x1) / 2, (z0 + z1) / 2, 0.9, len, ry);
}

export function well(c: Ctx, x: number, z: number) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z });
  b.cyl(1.0, 1.05, 0.9, COL.stone, { y: 0.45 }, 12);
  b.cyl(0.82, 0.82, 0.92, '#2a4a5a', { y: 0.47 }, 12);
  for (const s of [-1, 1]) b.box(0.15, 2.3, 0.15, COL.woodDark, { x: s * 0.9, y: 1.15 });
  b.box(2.2, 0.15, 0.2, COL.woodDark, { y: 2.3 });
  b.add(roofGeometry(2.6, 1.8, 0.7, 0.1, 0.5), COL.roofTile2, { y: 2.4 });
  b.cyl(0.18, 0.18, 0.3, COL.woodLight, { y: 1.6, x: 0.2 }, 8);
  b.pop();
  col.circle(x, z, 1.1);
}

export function vendingMachine(c: Ctx, x: number, z: number, ry: number, color = '#e8eef4') {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry });
  b.box(1.0, 1.85, 0.75, color, { y: 0.93 });
  b.box(0.8, 1.0, 0.04, '#cfe8ff', { y: 1.3, z: 0.38 }, true);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) b.box(0.1, 0.22, 0.05, ['#e2483a', '#3a8ae2', '#f2c94c', '#6fbf5a'][(r + k) % 4], { x: -0.28 + k * 0.19, y: 1.0 + r * 0.3, z: 0.41 });
  b.box(0.5, 0.15, 0.05, '#333', { y: 0.35, z: 0.38 });
  b.pop();
  col.box(x, z, 1.0, 0.75, ry);
}

export function bench(c: Ctx, x: number, z: number, ry: number) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry });
  b.box(1.8, 0.1, 0.5, COL.woodLight, { y: 0.45 });
  for (const s of [-0.75, 0.75]) b.box(0.1, 0.45, 0.45, COL.woodDark, { x: s, y: 0.22 });
  b.pop();
  col.box(x, z, 1.8, 0.5, ry);
}

/** food stall (yatai) with a lantern row */
export function yatai(c: Ctx, x: number, z: number, ry: number, cloth = '#e2483a') {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry });
  b.box(2.6, 1.0, 1.3, COL.wood, { y: 0.5 });
  b.box(2.8, 0.08, 1.6, COL.woodLight, { y: 1.04 });
  for (const s of [-1.25, 1.25]) for (const t of [-0.6, 0.6]) b.box(0.1, 1.4, 0.1, COL.woodDark, { x: s, y: 1.7, z: t });
  b.add(roofGeometry(3.4, 2.2, 0.7, 0.1, 0.8), cloth, { y: 2.4 });
  for (let i = 0; i < 4; i++) b.box(0.6, 0.45, 0.03, cloth, { x: -1.0 + i * 0.66, y: 2.15, z: 0.85 });
  for (let i = 0; i < 3; i++) paperLantern(b, -0.9 + i * 0.9, 2.05, 0.95, i % 2 ? '#ffffff' : COL.lanternRed, 0.55);
  // wheels
  for (const s of [-1, 1]) b.cyl(0.42, 0.42, 0.12, COL.woodDark, { x: s * 1.0, y: 0.42, z: -0.72, rx: Math.PI / 2 }, 12);
  b.pop();
  col.box(x, z, 2.8, 1.6, ry);
}

/** a string of paper lanterns between two points (festival street) */
export function lanternString(b: Builder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, n = 8) {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sag = Math.sin(t * Math.PI) * 0.8;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - sag, z = z0 + (z1 - z0) * t;
    b.cyl(0.015, 0.015, 0.5, COL.black, { x, y: y + 0.1, z }, 4);
    paperLantern(b, x, y - 0.35, z, i % 3 === 0 ? '#ffffff' : COL.lanternRed, 0.5);
  }
}

export function pole(c: Ctx, x: number, z: number, h = 6) {
  const { b, col } = c;
  const y = ground(x, z);
  b.cyl(0.1, 0.13, h, '#6a5a4a', { x, y: y + h / 2, z }, 6);
  b.box(1.4, 0.08, 0.08, '#6a5a4a', { x, y: y + h - 0.5, z });
  col.circle(x, z, 0.2);
}

// ───────────────────────── bigger landmarks ─────────────────────────

export function school(c: Ctx, x: number, z: number, ry: number) {
  const { b, col } = c;
  const y = ground(x, z);
  const W = 30, D = 10, F = 3.4;
  b.push({ x, y, z, ry });
  b.box(W, 0.4, D, COL.stone2, { y: 0.2 });
  for (let f = 0; f < 3; f++) {
    b.box(W, F, D, f % 2 ? '#f1ece2' : '#ece6da', { y: 0.4 + F / 2 + f * F });
    // windows (glow at night)
    for (let i = 0; i < 10; i++) {
      const wx = -W / 2 + 1.6 + i * ((W - 3.2) / 9);
      b.box(2.0, 1.6, 0.06, '#bcd8e6', { x: wx, y: 0.4 + f * F + 1.9, z: D / 2 + 0.02 }, true);
      b.box(2.1, 0.08, 0.1, '#9aa3ad', { x: wx, y: 0.4 + f * F + 1.05, z: D / 2 + 0.06 });
    }
    b.box(W + 0.3, 0.15, D + 0.3, '#d2ccc0', { y: 0.4 + (f + 1) * F });
  }
  // clock tower
  b.box(5, 3.5, 4, '#f1ece2', { y: 0.4 + 3 * F + 1.75 });
  b.cyl(1.3, 1.3, 0.2, '#ffffff', { y: 0.4 + 3 * F + 2, z: 2.02, rx: Math.PI / 2 }, 24);
  b.box(0.12, 1.0, 0.05, COL.black, { y: 0.4 + 3 * F + 2.3, z: 2.14 });
  b.box(0.7, 0.12, 0.05, COL.black, { x: 0.3, y: 0.4 + 3 * F + 2, z: 2.14 });
  b.add(roofGeometry(5.8, 4.8, 1.4, 0.1, 0.4), '#4a6a8a', { y: 0.4 + 3 * F + 3.5 });
  // entrance canopy
  b.box(6, 0.25, 3, '#d2ccc0', { y: 3.2, z: D / 2 + 1.5 });
  for (const s of [-2.6, 2.6]) b.box(0.3, 3, 0.3, '#d2ccc0', { x: s, y: 1.7, z: D / 2 + 2.8 });
  b.box(3.2, 2.6, 0.06, '#9fc6dc', { y: 1.7, z: D / 2 + 0.03 }, true);
  b.pop();
  col.box(x, z, W, D, ry);
}

export function pagoda(c: Ctx, x: number, z: number, ry: number, tiers = 5) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry });
  b.box(7.5, 1, 7.5, COL.stone2, { y: 0.5 });
  let yy = 1;
  for (let i = 0; i < tiers; i++) {
    const s = 1 - i * 0.12;
    b.box(4.4 * s, 2.4, 4.4 * s, i % 2 ? COL.vermilion : COL.vermilionDark, { y: yy + 1.2 });
    b.box(4.0 * s, 1.2, 4.6 * s, '#f6e2b0', { y: yy + 1.2 }, true);
    b.add(curvedRoof(8.2 * s, 8.2 * s, 1.2), COL.roofTile2, { y: yy + 2.4 });
    b.add(curvedRoof(8.2 * s, 8.2 * s, 1.2), COL.roofTile2, { y: yy + 2.4, ry: Math.PI / 2 });
    yy += 3.3;
  }
  // sōrin spire
  b.cyl(0.12, 0.18, 6, COL.gold, { y: yy + 3 }, 8);
  for (let i = 0; i < 9; i++) b.cyl(0.5 - i * 0.03, 0.5 - i * 0.03, 0.08, COL.gold, { y: yy + 0.8 + i * 0.45 }, 12);
  b.pop();
  col.box(x, z, 7.5, 7.5, ry);
}

export function castle(c: Ctx, x: number, z: number, ry: number) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z, ry });
  // sloped stone base (ishigaki)
  const base = new THREE.CylinderGeometry(9, 13, 8, 4, 1);
  base.rotateY(Math.PI / 4);
  b.add(base, COL.stone2, { y: 4 }, false, 0.15);
  let yy = 8;
  const levels = [[15, 4.2], [12, 3.6], [9.5, 3.2], [7, 3.0]];
  levels.forEach(([w, h], i) => {
    b.box(w, h, w * 0.8, '#f4f1ea', { y: yy + h / 2 });
    for (let k = -1; k <= 1; k++) b.box(1.2, 0.9, 0.06, '#2a2a30', { x: k * w * 0.28, y: yy + h * 0.55, z: w * 0.4 + 0.02 });
    b.add(curvedRoof(w + 3, w * 0.8 + 3, 1.4), '#3a4250', { y: yy + h });
    b.add(curvedRoof(w * 0.8 + 3, w + 3, 1.4), '#3a4250', { y: yy + h, ry: Math.PI / 2 });
    // decorative gable (chidori-hafu)
    if (i < 3) b.add(roofGeometry(w * 0.4, 2, 1.6, 0.05, 0.1), '#3a4250', { y: yy + h + 0.4, z: w * 0.4 + 1 });
    yy += h + 1.2;
  });
  // golden shachihoko on the ridge
  for (const s of [-1, 1]) b.cone(0.35, 1.2, COL.gold, { x: s * 3.2, y: yy + 0.4, rz: s * 0.4 }, 6);
  b.pop();
  col.box(x, z, 26, 26, ry + Math.PI / 4);
}

export function tower(c: Ctx, x: number, z: number, ry: number, w: number, d: number, h: number, color: string, neon: string, seed = 1) {
  const { b, col } = c;
  const y = ground(x, z);
  const r = new Rng(seed);
  b.push({ x, y, z, ry });
  b.box(w, h, d, color, { y: h / 2 });
  // window grid (glow)
  const floors = Math.floor(h / 3.2);
  for (let f = 1; f < floors; f++) {
    for (const side of [1, -1]) {
      const cols = Math.max(2, Math.floor(w / 2.4));
      for (let k = 0; k < cols; k++) {
        if (r.chance(0.25)) continue;
        b.box(1.4, 1.5, 0.05, r.chance(0.7) ? '#ffe9b8' : '#bfe6ff', { x: -w / 2 + 1.2 + k * ((w - 2.4) / Math.max(1, cols - 1)), y: f * 3.2, z: side * (d / 2 + 0.02) }, true);
      }
    }
  }
  // neon trims and rooftop
  b.box(w + 0.2, 0.25, 0.25, neon, { y: h - 0.4, z: d / 2 + 0.1 }, true);
  b.box(0.25, h * 0.6, 0.25, neon, { x: w / 2 + 0.1, y: h * 0.5, z: d / 2 + 0.1 }, true);
  b.box(w * 0.4, 1.6, d * 0.4, '#3a3f4a', { y: h + 0.8 });
  if (r.chance(0.5)) b.cyl(0.08, 0.08, 6, '#c0c6d0', { y: h + 4, x: w * 0.2 }, 6);
  b.pop();
  col.box(x, z, w, d, ry);
}

export function onsenPool(c: Ctx, x: number, z: number, r = 5) {
  const { b, col } = c;
  const y = ground(x, z);
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.add(new THREE.IcosahedronGeometry(0.9, 0), i % 2 ? COL.stone : COL.stone2, { x: x + Math.cos(a) * r, y: y + 0.3, z: z + Math.sin(a) * r, sy: 0.6 }, false, 0.2);
  }
  b.cyl(r - 0.2, r - 0.2, 0.1, '#7fd6d0', { x, y: y + 0.45, z }, 24, true);
  col.circle(x, z, r - 0.6, 'onsen');
}

export function lighthouse(c: Ctx, x: number, z: number) {
  const { b, col } = c;
  const y = ground(x, z);
  b.push({ x, y, z });
  for (let i = 0; i < 6; i++) b.cyl(2.2 - i * 0.2, 2.4 - i * 0.2, 3, i % 2 ? COL.vermilion : '#f4f1ea', { y: 1.5 + i * 3 }, 16);
  b.cyl(1.3, 1.3, 2, '#fff3c8', { y: 19 }, 16, true);
  b.cone(1.8, 1.6, '#2e333d', { y: 20.8 }, 16);
  b.pop();
  col.circle(x, z, 2.4);
}

export function boat(c: Ctx, x: number, z: number, ry: number, y = 0.2, s = 1) {
  const { b } = c;
  b.push({ x, y, z, ry, s });
  const hull = new THREE.CylinderGeometry(1.1, 0.7, 6, 8, 1, false, 0, Math.PI);
  hull.rotateZ(Math.PI / 2);
  hull.rotateX(Math.PI / 2);
  b.add(hull, COL.woodLight, { y: 0.5, rz: Math.PI });
  b.box(1.9, 0.1, 5.2, COL.wood, { y: 0.55 });
  b.box(1.2, 1.0, 1.4, '#f4f1ea', { y: 1.1, z: -0.8 });
  b.box(0.08, 3.5, 0.08, COL.woodDark, { y: 2.4, z: 0.8 });
  b.pop();
}

export function pier(c: Ctx, x0: number, z0: number, x1: number, z1: number, w = 3) {
  const { b, col } = c;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ry = Math.atan2(x1 - x0, z1 - z0);
  const n = Math.round(len / 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    for (const s of [-1, 1]) {
      const [px, pz] = rot(x, z, ry, (s * w) / 2, 0);
      b.cyl(0.14, 0.14, 3, COL.woodDark, { x: px, y: -0.6, z: pz }, 6);
    }
  }
  b.box(w, 0.2, len, COL.woodLight, { x: (x0 + x1) / 2, y: 0.95, z: (z0 + z1) / 2, ry });
  void col;
}
