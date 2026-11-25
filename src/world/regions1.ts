/**
 * Places 1–6: Praia do Amanhecer, Vila do Amanhecer, Rua do Comércio, Escola da Colina, Santuário da
 * Raposa, Cidade do Porto. Geometry, signs, people (NPCs), word spots and named spots.
 */
import * as THREE from 'three';
import type { RegionCtx } from './regionkit';
import { SIGN } from './regionkit';
import {
  house, shop, torii, stoneLantern, shrineHall, hokora, foxStatue, bridge, fence, stoneWall, well, vendingMachine, bench, yatai,
  lanternString, pole, school, boat, pier, lighthouse, paperLantern, rot, COL,
} from './buildings';
import { REGION_BY_ID } from '../data/regions';
import { Rng } from '../core/rng';
import { roofGeometry } from './kit';

const R = REGION_BY_ID;

// ───────────────────────── 1. Praia do Amanhecer ─────────────────────────
export function buildPraia(c: RegionCtx) {
  c.region = 'praia';
  const { x: cx, z: cz } = R.praia;
  const ctx = { b: c.b, col: c.col };
  // pier into the cove + the boat the traveller arrives on
  pier(ctx, cx - 6, cz + 22, cx - 6, cz + 58, 3);
  c.platform({ x: cx - 6, z: cz + 40, hw: 1.6, hd: 18.5, rot: 0, y: 1.05 });
  boat(ctx, cx - 1.4, cz + 54, 0.1, 0.15, 1.1);
  boat(ctx, cx - 12, cz + 46, -0.3, 0.1, 0.9);
  // floating torii in the sea (like a sacred gate of the sunrise)
  torii(ctx, cx + 38, cz + 62, 0.25, 1.6, COL.vermilion, false);
  // fisherman's hut with nets
  house(ctx, cx + 26, cz - 6, -0.5, { w: 5, d: 4, thatch: true, engawa: false, seed: 3 });
  for (let i = 0; i < 3; i++) {
    pole(ctx, cx + 14 + i * 3.2, cz + 6, 2.6);
  }
  c.b.box(6.8, 1.4, 0.04, '#3a5a5a', { x: cx + 17.2, y: c.ground(cx + 17, cz + 6) + 1.6, z: cz + 6 });
  // Kon's little shrine on the beach (where the tutorial starts)
  hokora(ctx, cx - 18, cz - 4, 0.6);
  torii(ctx, cx - 14, cz + 1, 0.6, 0.55);
  stoneLantern(ctx, cx - 21, cz + 1, 0.7);
  stoneLantern(ctx, cx - 13.5, cz - 7.5, 0.7);
  c.spot('kon-shrine', cx - 16, cz - 2);
  // welcome sign
  c.sign('朝日浜', SIGN.woodV(96, 300), cx + 4, c.ground(cx + 4, cz + 14) + 1.9, cz + 14, 0.2, 0.75, 2.3, { double: true });
  c.b.box(0.18, 2.6, 0.18, COL.woodDark, { x: cx + 4, y: c.ground(cx + 4, cz + 14) + 1.3, z: cz + 13.9 });
  // driftwood and rocks
  const r = new Rng(5);
  for (let i = 0; i < 14; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(14, 40);
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.6 + 10;
    c.b.add(new THREE.IcosahedronGeometry(r.range(0.4, 1.3), 0), r.chance(0.5) ? COL.stone : COL.stone2, { x, y: c.ground(x, z) + 0.2, z, sy: 0.6, ry: r.range(0, 3) }, false, 0.15);
  }
  for (let i = 0; i < 10; i++) c.tree('pine', cx - 40 + i * 9 + r.range(-2, 2), cz - 26 + r.range(-4, 4), r.range(0.9, 1.3));
  // word spots
  c.word('海', cx + 10, cz + 34, 2.4);
  c.word('船', cx - 1.4, cz + 54, 3.2);
  c.word('砂', cx + 4, cz + 22, 1.6);
  c.word('空', cx - 8, cz + 8, 4.5);
  c.spot('arrival', cx - 6, cz + 50);
  c.spot('start', cx - 6, cz + 30);
  c.npc({
    id: 'umi', name: 'Vovô Umi', jp: 'うみじい', title: 'pescador da praia', x: cx + 20, z: cz + 4, ry: -0.8, role: 'teacher',
    themes: ['saudacoes'], registers: ['polido', 'casual'], voice: { pitch: 0.7, rate: 0.85 },
    greet: ['おはよう！ いい 朝 だね。', 'Bom dia! Que manhã bonita, hein.'],
    look: { skin: '#c98e68', hair: '#d8d8d8', hairStyle: 'bald', outfit: 'fisher', top: '#3a6ea8', bottom: '#2a2a36', accent: '#e9c46a', eyes: '#3a2a22', hat: 'straw', old: true },
  });
}

// ───────────────────────── 2. Vila do Amanhecer ─────────────────────────
export function buildVila(c: RegionCtx) {
  c.region = 'vila';
  const { x: cx, z: cz } = R.vila;
  const ctx = { b: c.b, col: c.col };
  const r = new Rng(12);
  // central plaza: well + the old cherry tree
  well(ctx, cx + 4, cz + 2);
  c.tree('sakura', cx - 6, cz - 4, 1.9);
  c.b.cyl(1.6, 1.8, 0.5, COL.stone2, { x: cx - 6, y: c.ground(cx - 6, cz - 4) + 0.25, z: cz - 4 }, 12);
  c.b.cyl(0.08, 0.08, 6, '#e8d8a8', { x: cx - 6, y: c.ground(cx - 6, cz - 4) + 1.6, z: cz - 4, rz: Math.PI / 2 }, 6);
  bench(ctx, cx - 1, cz - 9, 0);
  bench(ctx, cx - 11, cz + 3, Math.PI / 2);
  // houses in a ring around the plaza
  const homes: [number, number, number, number?][] = [
    [-22, -18, 0.3], [-4, -26, 0], [16, -22, -0.4], [28, -4, -1.4], [24, 18, -2.4], [-24, 14, 2.6], [-30, -2, 1.6], [6, 26, Math.PI], [-12, 28, 2.9],
  ];
  homes.forEach(([dx, dz, ry], i) => {
    house(ctx, cx + dx, cz + dz, ry + Math.PI, { w: 6 + (i % 3), d: 5 + (i % 2), thatch: i % 4 === 1, floors: i === 2 || i === 6 ? 2 : 1, seed: i + 30 });
  });
  // fences and gardens
  fence(ctx, cx + 34, cz - 16, cx + 34, cz + 14);
  fence(ctx, cx - 38, cz - 14, cx - 38, cz + 22);
  // rice paddies to the east (water with sprouts)
  for (let k = 0; k < 4; k++) {
    const px = cx + 48 + (k % 2) * 14, pz = cz - 14 + Math.floor(k / 2) * 16;
    c.world.water.pond(px, pz, 6, 6.5, c.ground(px, pz) + 0.25).scale.set(6, 1, 7);
    for (let i = 0; i < 40; i++) c.b.cone(0.05, 0.4, '#6fbf5a', { x: px + r.range(-5, 5), y: c.ground(px, pz) + 0.45, z: pz + r.range(-5.5, 5.5) }, 3);
    c.b.box(13, 0.3, 0.5, '#8a7a5a', { x: px, y: c.ground(px, pz) + 0.15, z: pz - 7.2 });
  }
  c.word('田んぼ', cx + 48, cz - 14, 2.5);
  // koi pond near the river with stepping stones
  const kx = cx - 26, kz = cz - 38;
  c.world.water.pond(kx, kz, 7, 5);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    c.b.add(new THREE.IcosahedronGeometry(0.8, 0), COL.stone2, { x: kx + Math.cos(a) * 7.4, y: c.ground(kx, kz) + 0.2, z: kz + Math.sin(a) * 5.4, sy: 0.5 }, false, 0.2);
  }
  stoneLantern(ctx, kx + 8, kz - 4, 0.9);
  c.word('池', kx, kz + 2, 1.6);
  c.word('魚', kx - 2, kz - 1, 1.3);
  c.spot('pond', kx, kz, 9);
  // the bridge over the river toward the school road
  bridge(ctx, cx - 41, cz - 22, Math.PI / 2 + 0.15, 14, 3);
  c.platform({ x: cx - 41, z: cz - 22, hw: 1.5, hd: 7, rot: Math.PI / 2 + 0.15, y: c.ground(cx - 41, cz - 22) + 0.6, arch: 1.6 });
  c.word('橋', cx - 41, cz - 22, 4);
  c.word('川', cx - 44, cz - 4, 1.4);
  // village entrance sign + word shrine
  c.sign('朝日村', SIGN.woodV(96, 300), cx + 12, c.ground(cx + 12, cz + 44) + 2, cz + 44, 0, 0.8, 2.4, { double: true });
  c.b.box(0.2, 2.8, 0.2, COL.woodDark, { x: cx + 12, y: c.ground(cx + 12, cz + 44) + 1.4, z: cz + 43.9 });
  hokora(ctx, cx + 10, cz - 12, Math.PI);
  c.spot('hokora', cx + 10, cz - 10);
  // laundry lines, flowers, pots
  for (const [dx, dz] of [[-16, -6], [14, 10], [-8, 18]]) c.tree('flowers', cx + dx, cz + dz, 1.2);
  for (let i = 0; i < 8; i++) c.tree(r.chance(0.5) ? 'broad' : 'sakura', cx + r.range(-50, 50), cz + r.range(-48, 48) * (i % 2 ? 1 : -1) * 0.9 + (i % 2 ? 40 : -40) * 0.2, r.range(0.9, 1.2));
  // words around the village
  c.word('木', cx - 6, cz - 4, 9.5);
  c.word('家', cx - 4, cz - 26, 6.2);
  c.word('井戸', cx + 4, cz + 2, 3.4);
  c.word('花', cx - 16, cz - 6, 1.6);
  c.word('山', cx - 2, cz - 50, 3);
  c.word('村', cx + 12, cz + 44, 4.2);
  // animals (word carriers)
  c.spot('cat', cx + 16, cz - 16, 1, { w: '猫' });
  c.spot('dog', cx - 14, cz + 10, 1, { w: '犬' });
  c.spot('bird', cx + 2, cz - 26, 1, { w: '鳥' });
  // people
  c.npc({
    id: 'haru', name: 'Vovó Haru', jp: 'はるおばあちゃん', title: 'avó querida da vila', x: cx - 4, z: cz - 20, ry: 0, role: 'teacher',
    themes: ['familia', 'casa'], registers: ['casual', 'polido'], voice: { pitch: 1.1, rate: 0.8 },
    greet: ['あら、いらっしゃい。ゆっくりしていってね。', 'Ah, seja bem-vindo. Fique à vontade.'],
    look: { skin: '#f6d2b8', hair: '#d8d8de', hairStyle: 'bun', outfit: 'kimono', top: '#8a5ab8', bottom: '#6a4a7a', accent: '#e9c46a', eyes: '#3a2a22', old: true, scale: 0.92 },
  });
  c.npc({
    id: 'kenta', name: 'Kenta', jp: 'けんた', title: 'menino travesso', x: cx + 8, z: cz + 6, ry: 2, role: 'teacher',
    themes: ['numeros', 'casual'], registers: ['casual'], voice: { pitch: 1.5, rate: 1.05 }, wander: 6,
    greet: ['よっ！ 一緒に 数えよう！', 'E aí! Vamos contar juntos!'],
    look: { skin: '#f6d2b8', hair: '#2a2126', hairStyle: 'spiky', outfit: 'kid', top: '#e0a030', bottom: '#3a5a8a', accent: '#c8442f', eyes: '#3a2a22', hat: 'cap', scale: 0.78 },
  });
  c.npc({
    id: 'tanaka', name: 'Sr. Tanaka', jp: 'たなかさん', title: 'agricultor', x: cx + 40, z: cz - 6, ry: -1.4, role: 'teacher',
    themes: ['natureza', 'animais'], registers: ['polido'], voice: { pitch: 0.85, rate: 0.9 },
    greet: ['こんにちは。今日も いい 天気ですね。', 'Boa tarde. Hoje também está um tempo bom, não é?'],
    look: { skin: '#c98e68', hair: '#2a2126', hairStyle: 'short', outfit: 'casual', top: '#3e8a5a', bottom: '#4a4a5a', accent: '#f2efe6', eyes: '#3a2a22', hat: 'straw' },
  });
  c.npc({
    id: 'mori', name: 'Chefe Mori', jp: 'もりそんちょう', title: 'chefe da vila', x: cx + 2, z: cz + 10, ry: Math.PI, role: 'quest',
    themes: ['saudacoes', 'cores'], registers: ['polido'], voice: { pitch: 0.75, rate: 0.85 },
    greet: ['ようこそ、朝日村へ。', 'Seja bem-vindo à Vila do Amanhecer.'],
    look: { skin: '#e9b996', hair: '#8a8a92', hairStyle: 'short', outfit: 'elder', top: '#4a5a6a', bottom: '#2a2a36', accent: '#e9c46a', eyes: '#3a2a22', old: true, glasses: true },
  });
  c.npc({
    id: 'hotaru', name: 'Hotaru', jp: 'ほたる', title: 'menina dos vaga-lumes', x: kx + 9, z: kz + 3, ry: -1.8, role: 'game', game: 'fireflies',
    themes: ['saudacoes'], registers: ['casual'], voice: { pitch: 1.45, rate: 1.0 },
    greet: ['ねえねえ、ほたる、見に行こう！', 'Ei, ei, vamos ver os vaga-lumes!'],
    look: { skin: '#ffe3cf', hair: '#4a3226', hairStyle: 'twin', outfit: 'yukata', top: '#e88aa8', bottom: '#e88aa8', accent: '#ffd36b', eyes: '#5a3a2a', scale: 0.8, lashes: true },
  });
}

// ───────────────────────── 3. Rua do Comércio ─────────────────────────
export function buildComercio(c: RegionCtx) {
  c.region = 'comercio';
  const { x: cx, z: cz } = R.comercio;
  const ctx = { b: c.b, col: c.col };
  // the street runs east–west; shops on both sides
  const shops: { name: string; sub: string; color: string; noren: string; w?: string }[] = [
    { name: '八百屋', sub: 'YAOYA · frutas e verduras', color: '#f1e3c4', noren: '#3e8a5a', w: '野菜' },
    { name: '魚屋', sub: 'SAKANAYA · peixaria', color: '#e3ecf1', noren: '#2c4a7c', w: '魚' },
    { name: 'パン屋', sub: 'PAN-YA · padaria', color: '#f4e6d0', noren: '#c9822f', w: 'パン' },
    { name: '本屋', sub: 'HON-YA · livraria', color: '#ece4d8', noren: '#6a3a2a', w: '本' },
    { name: '花屋', sub: 'HANAYA · floricultura', color: '#f6e6ec', noren: '#d85a7a', w: '花' },
    { name: '和菓子', sub: 'WAGASHI · doces', color: '#f2e8d8', noren: '#8a5ab8', w: 'お菓子' },
    { name: 'ラーメン', sub: 'RĀMEN', color: '#f1dccb', noren: '#c8442f', w: 'ラーメン' },
    { name: '寿司', sub: 'SUSHI', color: '#f4efe6', noren: '#1e2a4a', w: '寿司' },
    { name: '服', sub: 'FUKU · roupas', color: '#e8e8f0', noren: '#3a6ea8', w: '服' },
    { name: '薬局', sub: 'YAKKYOKU · farmácia', color: '#e6f1ea', noren: '#2f8a6a', w: '薬' },
  ];
  const n = shops.length / 2;
  for (let i = 0; i < shops.length; i++) {
    const side = i < n ? -1 : 1;
    const k = i % n;
    const x = cx - 28 + k * 13;
    const z = cz + side * 9;
    const ry = side < 0 ? 0 : Math.PI;
    const s = shops[i];
    const anchor = shop(ctx, x, z + side * 3, ry, { w: 9, d: 6, color: s.color, noren: s.noren, floors: k % 2 ? 1 : 2 });
    c.sign(s.name, { ...SIGN.noren(s.noren, 360, 150), sub: s.sub }, anchor.x, anchor.y, anchor.z + (side < 0 ? 0.18 : -0.18), ry, 3.6, 1.5);
    if (s.w) c.word(s.w, anchor.x, anchor.z + (side < 0 ? 2.2 : -2.2), 2.6);
  }
  // entrance arches with the street name
  for (const ex of [-42, 42]) {
    const x = cx + ex;
    for (const sz of [-5.2, 5.2]) {
      c.b.box(0.4, 6.5, 0.4, '#3a3036', { x, y: c.ground(x, cz + sz) + 3.25, z: cz + sz });
      c.col.circle(x, cz + sz, 0.4);
    }
    c.b.box(0.6, 1.2, 11.5, '#c8442f', { x, y: c.ground(x, cz) + 6.4, z: cz });
    c.sign('商店街', SIGN.red(420, 140), x + (ex < 0 ? -0.33 : 0.33), c.ground(x, cz) + 6.4, cz, ex < 0 ? -Math.PI / 2 : Math.PI / 2, 4.2, 1.1, { glow: false, double: true });
  }
  // lantern strings across the street
  for (let k = 0; k < 6; k++) {
    const x = cx - 32 + k * 13;
    lanternString(c.b, x, c.ground(x, cz - 7) + 5.2, cz - 7, x + 0.5, c.ground(x, cz + 7) + 5.2, cz + 7, 6);
  }
  // stalls, vending machines, benches
  yatai(ctx, cx + 4, cz - 1.5, Math.PI / 2, '#c8442f');
  yatai(ctx, cx - 18, cz + 1.5, -Math.PI / 2, '#2c4a7c');
  vendingMachine(ctx, cx + 33, cz - 5.5, 0, '#e8eef4');
  vendingMachine(ctx, cx + 34.2, cz - 5.5, 0, '#c8442f');
  vendingMachine(ctx, cx - 33, cz + 5.5, Math.PI, '#3a6ea8');
  c.word('自動販売機', cx + 33.6, cz - 5.5, 2.6);
  bench(ctx, cx + 18, cz + 3.8, Math.PI);
  // konbini at the east end
  const kx = cx + 30, kz = cz + 20;
  c.b.box(14, 4, 9, '#f4f4f6', { x: kx, y: c.ground(kx, kz) + 2, z: kz });
  c.b.box(14.2, 0.9, 9.2, '#3aa86a', { x: kx, y: c.ground(kx, kz) + 3.6, z: kz });
  c.b.box(0.1, 0.3, 9.2, '#f2c94c', { x: kx - 7.1, y: c.ground(kx, kz) + 3.1, z: kz });
  c.b.box(9, 2.6, 0.06, '#cfe8ff', { x: kx, y: c.ground(kx, kz) + 1.5, z: kz - 4.52 }, true);
  c.sign('コンビニ', SIGN.neon('#ffffff', 420, 110), kx, c.ground(kx, kz) + 3.6, kz - 4.62, Math.PI, 4.6, 0.85, { glow: true });
  c.col.box(kx, kz, 14, 9, 0);
  c.word('コンビニ', kx, kz - 6, 3.2);
  c.spot('konbini', kx, kz - 6.5);
  // the teen corner (gíria) and the sushi counter
  c.spot('sushi', cx - 28 + 2 * 13, cz + 9);
  // people
  c.npc({
    id: 'yaoya', name: 'Sr. Ōta', jp: 'おおたさん', title: 'quitandeiro', x: cx - 28, z: cz - 4.6, ry: 0, role: 'teacher',
    themes: ['comida', 'compras'], registers: ['keigo', 'polido'], voice: { pitch: 0.95, rate: 0.95 },
    greet: ['いらっしゃいませ！ 新鮮な 野菜、ありますよ！', 'Bem-vindo! Temos verduras fresquinhas!'],
    look: { skin: '#e9b996', hair: '#2a2126', hairStyle: 'short', outfit: 'apron', top: '#f2efe6', bottom: '#2a2a36', accent: '#3e8a5a', eyes: '#3a2a22', hat: 'headband' },
  });
  c.npc({
    id: 'mio', name: 'Mio', jp: 'みお', title: 'estudante descolada', x: cx + 12, z: cz + 2, ry: -2, role: 'teacher',
    themes: ['giria', 'roupas', 'onomatopeia'], registers: ['giria', 'casual'], voice: { pitch: 1.3, rate: 1.15 }, wander: 4,
    greet: ['え、マジ？ 外国の人？ ウケる〜！', 'Quê, sério? Você é estrangeiro? Que demais!'],
    look: { skin: '#e9b996', hair: '#e8c070', hairStyle: 'long', outfit: 'gyaru', top: '#f49ac0', bottom: '#2a2a36', accent: '#ffd36b', eyes: '#5a3a2a', lashes: true },
  });
  c.npc({
    id: 'itamae', name: 'Mestre Sushi Jirō', jp: 'じろうさん', title: 'sushiman', x: cx - 2, z: cz + 4.8, ry: Math.PI, role: 'game', game: 'shop',
    themes: ['comida', 'numeros'], registers: ['keigo', 'casual'], voice: { pitch: 0.8, rate: 0.95 },
    greet: ['へい、らっしゃい！ 何に しましょう？', 'Opa, entra! O que vai ser?'],
    look: { skin: '#e9b996', hair: '#2a2126', hairStyle: 'short', outfit: 'chef', top: '#ffffff', bottom: '#2a2a36', accent: '#1e2a4a', eyes: '#3a2a22', hat: 'kerchief' },
  });
  c.npc({
    id: 'tenin', name: 'Atendente Satō', jp: 'さとうさん', title: 'atendente da konbini', x: kx - 2, z: kz - 6, ry: Math.PI, role: 'talk',
    themes: ['compras', 'keigo'], registers: ['keigo'], voice: { pitch: 1.15, rate: 1.05 }, convos: ['konbini'],
    greet: ['いらっしゃいませ。こんにちは。', 'Bem-vindo. Boa tarde.'],
    look: { skin: '#ffe3cf', hair: '#4a3226', hairStyle: 'pony', outfit: 'apron', top: '#3aa86a', bottom: '#2a2a36', accent: '#3aa86a', eyes: '#5a3a2a', lashes: true },
  });
  c.npc({
    id: 'hanaya', name: 'Dona Yuri', jp: 'ゆりさん', title: 'florista', x: cx + 24, z: cz + 4.8, ry: Math.PI, role: 'teacher',
    themes: ['cores', 'natureza'], registers: ['polido'], voice: { pitch: 1.2, rate: 0.95 },
    greet: ['きれいな 花が たくさん ありますよ。', 'Temos muitas flores bonitas.'],
    look: { skin: '#ffe3cf', hair: '#7a4a2e', hairStyle: 'bob', outfit: 'apron', top: '#f6b8cf', bottom: '#4a4a5a', accent: '#d85a7a', eyes: '#3a6a3a', lashes: true },
  });
}

// ───────────────────────── 4. Escola da Colina ─────────────────────────
export function buildEscola(c: RegionCtx) {
  c.region = 'escola';
  const { x: cx, z: cz } = R.escola;
  const ctx = { b: c.b, col: c.col };
  const r = new Rng(41);
  school(ctx, cx - 4, cz - 22, 0);
  c.sign('言の葉学園', SIGN.plaque(110, 360), cx + 7.5, c.ground(cx + 7, cz + 20) + 2.1, cz + 20.3, 0, 0.55, 1.8, { double: true });
  // gate
  for (const s of [-6, 6]) {
    c.b.box(1, 2.6, 1, '#d2ccc0', { x: cx + s, y: c.ground(cx + s, cz + 20) + 1.3, z: cz + 20 });
    c.col.box(cx + s, cz + 20, 1, 1, 0);
  }
  stoneWall(ctx, cx + 6.5, cz + 20, cx + 40, cz + 20, 1.3);
  stoneWall(ctx, cx - 6.5, cz + 20, cx - 40, cz + 20, 1.3);
  // sakura avenue
  for (let i = 0; i < 6; i++) {
    c.tree('sakura', cx - 9, cz + 16 - i * 6.5, 1.2);
    c.tree('sakura', cx + 9, cz + 16 - i * 6.5, 1.2);
  }
  // sports field with a running track
  const fx = cx + 30, fz = cz - 4;
  c.b.box(26, 0.06, 18, '#c98e68', { x: fx, y: c.ground(fx, fz) + 0.04, z: fz });
  c.b.box(20, 0.08, 12, '#7fbf5a', { x: fx, y: c.ground(fx, fz) + 0.06, z: fz });
  for (const s of [-1, 1]) {
    c.b.box(0.15, 2.4, 0.15, '#f2efe6', { x: fx + s * 9, y: c.ground(fx, fz) + 1.2, z: fz });
    c.b.box(0.1, 0.1, 3.4, '#f2efe6', { x: fx + s * 9, y: c.ground(fx, fz) + 2.4, z: fz });
  }
  c.word('運動場', fx, fz, 2.2);
  // bicycle shed
  c.b.box(10, 0.15, 3, '#7a8a9a', { x: cx - 26, y: c.ground(cx - 26, cz + 6) + 2.4, z: cz + 6 });
  for (let i = 0; i < 6; i++) {
    const x = cx - 30 + i * 1.6;
    c.b.add(new THREE.TorusGeometry(0.32, 0.04, 6, 14), '#3a3a48', { x, y: c.ground(x, cz + 6) + 0.35, z: cz + 5.5, ry: Math.PI / 2 });
    c.b.add(new THREE.TorusGeometry(0.32, 0.04, 6, 14), '#3a3a48', { x, y: c.ground(x, cz + 6) + 0.35, z: cz + 6.5, ry: Math.PI / 2 });
  }
  c.word('自転車', cx - 26, cz + 6, 3.2);
  // club house (karuta club)
  house(ctx, cx - 30, cz - 8, Math.PI / 2, { w: 8, d: 6, wall: '#efe6d2', seed: 70 });
  c.sign('かるた部', SIGN.wood(300, 100), cx - 26.5, c.ground(cx - 26, cz - 8) + 2.4, cz - 8, Math.PI / 2, 2, 0.66);
  c.spot('karuta', cx - 25, cz - 8);
  for (let i = 0; i < 10; i++) c.tree(r.chance(0.6) ? 'sakura' : 'broad', cx + r.range(-48, 48), cz + r.range(-45, -30), r.range(0.9, 1.3));
  c.word('学校', cx - 4, cz - 15, 12);
  c.word('桜', cx + 9, cz + 3.5, 6);
  c.word('門', cx, cz + 20, 3.4);
  c.spot('hokora', cx + 16, cz + 12);
  // people
  c.npc({
    id: 'yamada', name: 'Professora Yamada', jp: 'やまだせんせい', title: 'professora de japonês', x: cx, z: cz - 9, ry: 0, role: 'teacher',
    themes: ['gramatica', 'verbos', 'escola'], registers: ['polido'], voice: { pitch: 1.1, rate: 0.9 },
    greet: ['はい、皆さん、こんにちは。今日も 一緒に 勉強しましょう。', 'Muito bem, pessoal, boa tarde. Vamos estudar juntos hoje também.'],
    look: { skin: '#ffe3cf', hair: '#2a2126', hairStyle: 'bun', outfit: 'suit', top: '#3a5a8a', bottom: '#2a2a36', accent: '#e88aa8', eyes: '#3a2a22', glasses: true, lashes: true },
  });
  c.npc({
    id: 'yui', name: 'Yui', jp: 'ゆい', title: 'colega de classe', x: cx + 6, z: cz + 6, ry: -2.6, role: 'teacher',
    themes: ['tempo', 'adjetivos', 'casual'], registers: ['casual'], voice: { pitch: 1.3, rate: 1.05 }, wander: 5,
    greet: ['あ、転校生？ よろしくね！', 'Ah, você é o aluno novo? Prazer!'],
    look: { skin: '#ffe3cf', hair: '#4a3226', hairStyle: 'pony', outfit: 'schoolF', top: '#f2efe6', bottom: '#2a3a6a', accent: '#c8442f', eyes: '#5a3a2a', lashes: true },
  });
  c.npc({
    id: 'riku', name: 'Riku', jp: 'りく', title: 'atleta da escola', x: fx - 8, z: fz + 6, ry: 1.2, role: 'teacher',
    themes: ['corpo', 'verbos'], registers: ['casual'], voice: { pitch: 1.05, rate: 1.1 }, wander: 8,
    greet: ['おっす！ 走るの、好き？', 'E aí! Você gosta de correr?'],
    look: { skin: '#e9b996', hair: '#2a2126', hairStyle: 'messy', outfit: 'schoolM', top: '#1e2236', bottom: '#1e2236', accent: '#e9c46a', eyes: '#3a2a22' },
  });
  c.npc({
    id: 'akira', name: 'Akira', jp: 'あきら', title: 'otaku do clube de mangá', x: cx - 22, z: cz - 2, ry: 1.4, role: 'teacher',
    themes: ['anime'], registers: ['anime'], voice: { pitch: 1.0, rate: 1.15 },
    greet: ['ふっ……ついに 来たか、選ばれし者よ！', 'Hmpf... finalmente você veio, ó escolhido!'],
    look: { skin: '#ffe3cf', hair: '#3a2a4a', hairStyle: 'spiky', outfit: 'otaku', top: '#2a2a36', bottom: '#3a3a48', accent: '#b48cff', eyes: '#2a4a7a', glasses: true },
  });
  c.npc({
    id: 'karuta', name: 'Capitã Chihiro', jp: 'ちひろ', title: 'clube de karuta', x: cx - 25, z: cz - 11, ry: Math.PI / 2, role: 'game', game: 'karuta',
    themes: ['saudacoes'], registers: ['polido', 'casual'], voice: { pitch: 1.2, rate: 1.0 },
    greet: ['かるた、やってみる？ 速さが 大事だよ！', 'Quer jogar karuta? O importante é a velocidade!'],
    look: { skin: '#ffe3cf', hair: '#2a2126', hairStyle: 'long', outfit: 'miko', top: '#f2efe6', bottom: '#3a5a8a', accent: '#e9c46a', eyes: '#3a2a22', lashes: true },
  });
}

// ───────────────────────── 5. Santuário da Raposa ─────────────────────────
export function buildSantuario(c: RegionCtx) {
  c.region = 'santuario';
  const { x: cx, z: cz } = R.santuario;
  const ctx = { b: c.b, col: c.col };
  const r = new Rng(55);
  // main hall facing south
  shrineHall(ctx, cx, cz - 22, 0);
  c.platform({ x: cx, z: cz - 22, hw: 5.5, hd: 4.5, rot: 0, y: c.ground(cx, cz - 22) + 1.35 });
  c.platform({ x: cx, z: cz - 15.5, hw: 1.75, hd: 1.4, rot: 0, y: c.ground(cx, cz - 22) + 0.7 });
  foxStatue(ctx, cx - 5, cz - 12, 0.2);
  foxStatue(ctx, cx + 5, cz - 12, -0.2);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) stoneLantern(ctx, cx + s * 6.5, cz - 6 + i * 7, 1.05);
  // the tunnel of a thousand torii climbing toward the shrine from the south
  for (let i = 0; i < 26; i++) {
    const z = cz + 46 - i * 2.2;
    const x = cx + Math.sin(i * 0.22) * 2.5;
    torii(ctx, x, z, Math.cos(i * 0.22) * 0.15, 0.62, i % 2 ? COL.vermilion : '#e04a34', true);
  }
  // big torii at the plaza
  torii(ctx, cx, cz + 6, 0, 1.35);
  c.sign('稲荷神社', SIGN.plaque(110, 380), cx, c.ground(cx, cz + 6) + 5.7, cz + 6.35, 0, 0.62, 2.1, { double: true });
  // sacred tree with shimenawa
  c.tree('broad', cx + 18, cz - 10, 2.4);
  c.b.cyl(0.12, 0.12, 4, '#e8d8a8', { x: cx + 18, y: c.ground(cx + 18, cz - 10) + 2.2, z: cz - 10, rz: Math.PI / 2 }, 6);
  c.word('神社', cx, cz - 13, 9.5);
  c.word('鳥居', cx, cz + 6, 7.5);
  c.word('狐', cx - 5, cz - 12, 3);
  // ema board and omikuji stand
  c.b.box(4, 2, 0.3, COL.woodDark, { x: cx - 16, y: c.ground(cx - 16, cz - 2) + 1.4, z: cz - 2 });
  for (let i = 0; i < 12; i++) c.b.box(0.32, 0.24, 0.05, '#e8c890', { x: cx - 17.6 + (i % 6) * 0.62, y: c.ground(cx - 16, cz - 2) + 1.0 + Math.floor(i / 6) * 0.6, z: cz - 1.8, rz: (i % 3) * 0.1 });
  c.b.add(roofGeometry(4.6, 1.2, 0.5, 0.1, 0.6), COL.roofTile2, { x: cx - 16, y: c.ground(cx - 16, cz - 2) + 2.45, z: cz - 2 });
  c.col.box(cx - 16, cz - 2, 4, 0.6, 0);
  c.word('絵馬', cx - 16, cz - 2, 3.4);
  c.spot('omikuji', cx + 14, cz + 2);
  c.b.box(2.4, 1.2, 1.2, COL.vermilion, { x: cx + 14, y: c.ground(cx + 14, cz + 2) + 0.6, z: cz + 2 });
  c.sign('おみくじ', SIGN.paper(300, 100), cx + 14, c.ground(cx + 14, cz + 2) + 1.0, cz + 2.62, 0, 1.9, 0.62);
  c.col.box(cx + 14, cz + 2, 2.4, 1.2, 0);
  // bell tower
  const bx = cx + 20, bz = cz + 18;
  for (const s of [-1, 1]) for (const t of [-1, 1]) c.b.box(0.35, 4.5, 0.35, COL.woodDark, { x: bx + s * 1.6, y: c.ground(bx, bz) + 2.25, z: bz + t * 1.6 });
  c.b.add(roofGeometry(5, 5, 1.6, 0.25, 0.4), COL.roofTile2, { x: bx, y: c.ground(bx, bz) + 4.5, z: bz });
  c.b.cyl(0.9, 1.1, 2.0, '#5a6a5a', { x: bx, y: c.ground(bx, bz) + 3.0, z: bz }, 16);
  c.col.box(bx, bz, 3.6, 3.6, 0);
  c.spot('bell', bx, bz + 3);
  // bamboo grove and maples around
  for (let i = 0; i < 14; i++) c.tree('bamboo', cx - 40 + r.range(-6, 6), cz - 30 + i * 5 + r.range(-2, 2), r.range(0.9, 1.2));
  for (let i = 0; i < 8; i++) c.tree('maple', cx + 30 + r.range(-6, 6), cz - 30 + i * 7, r.range(0.9, 1.2));
  // calligraphy pavilion (kanji dojo)
  house(ctx, cx - 24, cz - 30, 0.8, { w: 7, d: 5, wall: '#f2ead6', seed: 88 });
  c.sign('書道', SIGN.wood(220, 110), cx - 21.4, c.ground(cx - 22, cz - 27) + 2.6, cz - 26.6, 0.8, 1.5, 0.75);
  c.spot('kanji', cx - 21, cz - 26);
  c.spot('hokora', cx + 8, cz + 14);
  // people
  c.npc({
    id: 'kannushi', name: 'Sacerdote Kiyomasa', jp: 'きよまさ宮司', title: 'sacerdote do santuário', x: cx + 3, z: cz - 12.5, ry: 0, role: 'teacher',
    themes: ['keigo', 'historia'], registers: ['keigo'], voice: { pitch: 0.8, rate: 0.85 },
    greet: ['ようこそ お参りくださいました。', 'Seja muito bem-vindo à sua visita ao santuário.'],
    look: { skin: '#f6d2b8', hair: '#2a2126', hairStyle: 'short', outfit: 'priest', top: '#f4f1ea', bottom: '#5a6ea8', accent: '#e9c46a', eyes: '#3a2a22', hat: 'eboshi' },
  });
  c.npc({
    id: 'miko', name: 'Sakura', jp: 'さくら', title: 'sacerdotisa (miko)', x: cx + 12, z: cz + 3, ry: -0.6, role: 'teacher',
    themes: ['sentimentos', 'adverbios'], registers: ['polido'], voice: { pitch: 1.25, rate: 0.95 },
    greet: ['こんにちは。今日の 運勢を 占ってみませんか？', 'Boa tarde. Que tal ver a sua sorte de hoje?'],
    look: { skin: '#ffe3cf', hair: '#2a2126', hairStyle: 'long', outfit: 'miko', top: '#f4f1ea', bottom: '#c8442f', accent: '#ffffff', eyes: '#3a2a22', lashes: true, hat: 'bow' },
  });
  c.npc({
    id: 'samurai', name: 'Espírito Musashi', jp: 'むさし', title: 'fantasma de samurai', x: cx - 12, z: cz - 26, ry: 0.6, role: 'teacher',
    themes: ['antigo'], registers: ['antigo'], voice: { pitch: 0.6, rate: 0.8 },
    greet: ['拙者、武士の 霊で ござる。', 'Este humilde é o espírito de um samurai.'],
    look: { skin: '#cfe0ff', hair: '#1e2236', hairStyle: 'topknot', outfit: 'samurai', top: '#4a5a8a', bottom: '#2a3a5a', accent: '#e9c46a', eyes: '#1e2236', ghost: true },
  });
  c.npc({
    id: 'shodo', name: 'Mestra Fude', jp: 'ふで先生', title: 'calígrafa (dojô de kanji)', x: cx - 20, z: cz - 24, ry: 0.8, role: 'game', game: 'kanji',
    themes: ['arte'], registers: ['polido'], voice: { pitch: 0.95, rate: 0.85 },
    greet: ['漢字は 心で 書くものです。', 'O kanji se escreve com o coração.'],
    look: { skin: '#f6d2b8', hair: '#b8b8c0', hairStyle: 'bun', outfit: 'kimono', top: '#2a2a36', bottom: '#2a2a36', accent: '#c8442f', eyes: '#3a2a22', old: true },
  });
}

// ───────────────────────── 6. Cidade do Porto ─────────────────────────
export function buildPorto(c: RegionCtx) {
  c.region = 'porto';
  const { x: cx, z: cz } = R.porto;
  const ctx = { b: c.b, col: c.col };
  const r = new Rng(66);
  // quay along the bay (east)
  for (let i = 0; i < 4; i++) {
    const z = cz - 36 + i * 22;
    pier(ctx, cx + 30, z, cx + 62, z, 3.2);
    c.platform({ x: cx + 46, z, hw: 16, hd: 1.7, rot: Math.PI / 2, y: 1.05 });
    boat(ctx, cx + 52, z + 4, Math.PI / 2 + r.range(-0.2, 0.2), 0.15, 1.2);
  }
  c.word('港', cx + 40, cz - 14, 3);
  c.word('船', cx + 52, cz - 10, 3.5);
  // warehouses
  for (let i = 0; i < 3; i++) {
    const z = cz - 30 + i * 22;
    c.b.box(10, 6, 14, i % 2 ? '#b8644a' : '#8a5a4a', { x: cx + 18, y: c.ground(cx + 18, z) + 3, z });
    c.b.add(roofGeometry(11, 15, 2.2, 0.05, 0.98), '#4a4f58', { x: cx + 18, y: c.ground(cx + 18, z) + 6, z });
    c.col.box(cx + 18, z, 10, 14, 0);
  }
  // fish market
  c.b.box(16, 0.3, 8, '#8f8a82', { x: cx - 4, y: c.ground(cx - 4, cz + 26) + 0.15, z: cz + 26 });
  c.b.box(16.4, 0.25, 8.4, '#3a6ea8', { x: cx - 4, y: c.ground(cx - 4, cz + 26) + 4.2, z: cz + 26 });
  for (const s of [-7.8, 7.8]) for (const t of [-3.8, 3.8]) c.b.box(0.25, 4, 0.25, '#6a6a72', { x: cx - 4 + s, y: c.ground(cx, cz + 26) + 2.1, z: cz + 26 + t });
  for (let i = 0; i < 4; i++) {
    c.b.box(3, 0.9, 1.4, '#d7d3cb', { x: cx - 10 + i * 4, y: c.ground(cx, cz + 26) + 0.6, z: cz + 26 });
    for (let k = 0; k < 4; k++) c.b.add(new THREE.ConeGeometry(0.12, 0.7, 5), '#9fb8c8', { x: cx - 11 + i * 4 + k * 0.6, y: c.ground(cx, cz + 26) + 1.1, z: cz + 26, rz: Math.PI / 2 });
  }
  c.sign('魚市場', SIGN.noren('#1e2a4a', 360, 120), cx - 4, c.ground(cx - 4, cz + 26) + 3.6, cz + 30.25, 0, 3.6, 1.2, { double: true });
  c.word('市場', cx - 4, cz + 26, 5.2);
  // the lighthouse on the point
  lighthouse(ctx, cx + 58, cz - 54);
  c.word('灯台', cx + 58, cz - 54, 24);
  // ferry terminal with departures board
  c.b.box(18, 5, 10, '#e9eef2', { x: cx + 6, y: c.ground(cx + 6, cz - 6) + 2.5, z: cz - 6 });
  c.b.box(18.4, 0.4, 10.4, '#3a6ea8', { x: cx + 6, y: c.ground(cx + 6, cz - 6) + 5.2, z: cz - 6 });
  c.b.box(12, 3, 0.06, '#cfe8ff', { x: cx + 6, y: c.ground(cx + 6, cz - 6) + 2, z: cz - 0.97 }, true);
  c.sign('フェリー乗り場', SIGN.neon('#ffffff', 520, 100), cx + 6, c.ground(cx + 6, cz - 6) + 4.4, cz - 0.9, 0, 6, 1.15, { glow: true });
  c.col.box(cx + 6, cz - 6, 18, 10, 0);
  c.spot('ferry', cx + 6, cz + 1);
  // police box (kōban) and station
  c.b.box(4, 3.2, 4, '#f2efe6', { x: cx - 24, y: c.ground(cx - 24, cz - 8) + 1.6, z: cz - 8 });
  c.b.sphere(0.25, '#ff4040', { x: cx - 24, y: c.ground(cx - 24, cz - 8) + 3.5, z: cz - 6 }, 1, true);
  c.sign('交番', SIGN.paper(200, 100), cx - 24, c.ground(cx - 24, cz - 8) + 2.7, cz - 5.95, 0, 1.6, 0.8);
  c.col.box(cx - 24, cz - 8, 4, 4, 0);
  c.word('交番', cx - 24, cz - 4.5, 3.6);
  // town houses
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 1.4 + 1.9;
    const d = 36 + (i % 3) * 6;
    house(ctx, cx + Math.cos(a) * d, cz + Math.sin(a) * d, -a + Math.PI / 2, { w: 6, d: 5, floors: i % 2 ? 2 : 1, wall: i % 3 ? '#efe6d2' : '#e3d8c4', seed: 300 + i });
  }
  for (let i = 0; i < 6; i++) stoneLantern(ctx, cx - 10 + i * 6, cz + 12, 0.8);
  c.spot('hokora', cx - 14, cz + 6);
  // people
  c.npc({
    id: 'ferry', name: 'Sr. Kaito', jp: 'かいとさん', title: 'bilheteiro da balsa', x: cx + 6, z: cz + 0.5, ry: 0, role: 'teacher',
    themes: ['viagem', 'cidade'], registers: ['keigo', 'polido'], voice: { pitch: 0.9, rate: 0.95 }, convos: ['viagem'],
    greet: ['いらっしゃいませ。どちらまで いらっしゃいますか。', 'Bem-vindo. Para onde o senhor vai?'],
    look: { skin: '#e9b996', hair: '#2a2126', hairStyle: 'short', outfit: 'suit', top: '#1e2a4a', bottom: '#1e2a4a', accent: '#e9c46a', eyes: '#3a2a22', hat: 'cap' },
  });
  c.npc({
    id: 'police', name: 'Policial Mizuki', jp: 'みずきさん', title: 'policial do kōban', x: cx - 24, z: cz - 4.8, ry: 0.2, role: 'talk',
    themes: ['cidade', 'adverbios'], registers: ['polido'], voice: { pitch: 1.1, rate: 0.95 }, convos: ['direcoes'],
    greet: ['こんにちは。道に 迷いましたか？', 'Boa tarde. Está perdido?'],
    look: { skin: '#ffe3cf', hair: '#2a2126', hairStyle: 'bob', outfit: 'suit', top: '#2a3a6a', bottom: '#2a3a6a', accent: '#e9c46a', eyes: '#3a2a22', hat: 'cap', lashes: true },
  });
  c.npc({
    id: 'gyoshi', name: 'Capitão Tetsu', jp: 'てつ船長', title: 'pescador veterano', x: cx + 34, z: cz - 12, ry: -1.6, role: 'teacher',
    themes: ['acoes', 'trabalho'], registers: ['casual'], voice: { pitch: 0.7, rate: 0.95 },
    greet: ['おう、若いの！ 今日は 大漁だぜ！', 'Opa, jovem! Hoje a pesca foi farta!'],
    look: { skin: '#9a6648', hair: '#3a3036', hairStyle: 'short', outfit: 'fisher', top: '#3a6ea8', bottom: '#2a2a36', accent: '#c8442f', eyes: '#3a2a22', hat: 'headband' },
  });
  c.npc({
    id: 'kaisha', name: 'Sra. Kobayashi', jp: 'こばやしさん', title: 'funcionária de escritório', x: cx - 6, z: cz + 14, ry: 2.8, role: 'teacher',
    themes: ['trabalho', 'relacoes'], registers: ['keigo', 'polido'], voice: { pitch: 1.15, rate: 1.0 }, convos: ['trabalho'],
    greet: ['お疲れ様です。少し 休憩中なんです。', 'Bom trabalho para você. Estou num intervalo rápido.'],
    look: { skin: '#ffe3cf', hair: '#4a3226', hairStyle: 'bob', outfit: 'suit', top: '#4a4a5a', bottom: '#2a2a36', accent: '#f2efe6', eyes: '#5a3a2a', lashes: true },
  });
  void paperLantern;
  void rot;
}
