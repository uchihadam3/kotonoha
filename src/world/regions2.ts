/**
 * Places 7–11: Cidade Neon, Vila das Termas, Cidade do Castelo, Templo da Montanha, Pico Sagrado.
 */
import * as THREE from 'three';
import type { RegionCtx } from './regionkit';
import { SIGN } from './regionkit';
import { house, shop, torii, stoneLantern, hokora, bridge, stoneWall, vendingMachine, bench, tower, onsenPool, castle, pagoda, lanternString, paperLantern, COL } from './buildings';
import { REGION_BY_ID } from '../data/regions';
import { Rng } from '../core/rng';
import { roofGeometry } from './kit';

const R = REGION_BY_ID;

// ───────────────────────── 7. Cidade Neon ─────────────────────────
export function buildNeon(c: RegionCtx) {
  c.region = 'neon';
  const { x: cx, z: cz } = R.neon;
  const ctx = { b: c.b, col: c.col };
  const r = new Rng(77);
  // the scramble crossing in the middle
  const y0 = c.ground(cx, cz);
  c.b.box(40, 0.04, 40, '#3a3a44', { x: cx, y: y0 + 0.03, z: cz });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    for (let k = 0; k < 7; k++) {
      const off = -6 + k * 2;
      const [x, z] = [cx + Math.cos(a) * 14 + Math.sin(a) * off, cz + Math.sin(a) * 14 + Math.cos(a) * off];
      c.b.box(i % 2 ? 4 : 1, 0.05, i % 2 ? 1 : 4, '#f4f4f6', { x, y: y0 + 0.06, z });
    }
  }
  for (let k = 0; k < 9; k++) c.b.box(1, 0.05, 18, '#f4f4f6', { x: cx - 8 + k * 2, y: y0 + 0.06, z: cz, ry: Math.PI / 4 });
  c.word('交差点', cx, cz, 2.2);
  c.word('信号', cx + 12, cz + 12, 4.5);
  // traffic lights
  for (const [sx, sz] of [[12, 12], [-12, 12], [12, -12], [-12, -12]]) {
    const x = cx + sx, z = cz + sz;
    c.b.cyl(0.1, 0.12, 4.2, '#6a6e78', { x, y: y0 + 2.1, z }, 6);
    c.b.box(0.5, 1.2, 0.3, '#2a2a30', { x, y: y0 + 4.2, z });
    c.b.sphere(0.14, '#40ff80', { x, y: y0 + 4.5, z: z + 0.16 }, 1, true);
    c.b.sphere(0.14, '#ff4040', { x, y: y0 + 3.95, z: z + 0.16 }, 1, true);
    c.col.circle(x, z, 0.3);
  }
  // towers around the crossing with neon signs
  const signs: [string, string][] = [['カラオケ', '#ff4fc8'], ['ゲームセンター', '#4fe8ff'], ['ラーメン', '#ffe04f'], ['本屋', '#7cff8a'], ['ホテル', '#ff9a4f'], ['カフェ', '#b48cff'], ['電気屋', '#4fe8ff'], ['居酒屋', '#ff5a5a'], ['映画館', '#ffe04f'], ['アニメ', '#ff4fc8'], ['銀行', '#9ad0ff'], ['病院', '#7cff8a']];
  const spots: [number, number, number][] = [[-30, -30, 0], [0, -34, 0], [30, -30, 0], [-34, 0, Math.PI / 2], [34, 0, -Math.PI / 2], [-30, 30, Math.PI], [0, 34, Math.PI], [30, 30, Math.PI], [-58, -28, 0], [58, -24, 0], [-56, 26, Math.PI], [56, 30, Math.PI]];
  spots.forEach(([dx, dz, ry], i) => {
    const w = 14 + (i % 3) * 3, d = 12, h = 22 + r.int(0, 5) * 8;
    const [txt, col] = signs[i % signs.length];
    tower(ctx, cx + dx, cz + dz, ry, w, d, h, r.pick(['#4a4f5e', '#5e6272', '#3e4250', '#6a6e7a', '#585c6a']), col, 100 + i);
    const fx = cx + dx + Math.sin(ry) * (d / 2 + 0.6), fz = cz + dz + Math.cos(ry) * (d / 2 + 0.6);
    c.sign(txt, SIGN.neonV(col, 120, 420), fx + Math.cos(ry) * (w / 2 - 1.2), c.ground(fx, fz) + 9 + (i % 3) * 3, fz - Math.sin(ry) * (w / 2 - 1.2), ry, 1.5, 5.2, { glow: true });
    c.word(txt, fx, fz, 3);
  });
  // big screen
  c.b.box(16, 9, 0.5, '#1e1e24', { x: cx, y: y0 + 22, z: cz - 34 + 6.3 });
  c.sign('言の葉 TV', SIGN.neon('#4fe8ff', 620, 340), cx, y0 + 22, cz - 34 + 6.6, 0, 15, 8.2, { glow: true });
  // otaku street to the east: shops with anime-style signs
  for (let i = 0; i < 5; i++) {
    const x = cx + 48 + i * 10, z = cz + 4;
    shop(ctx, x, z - 8, 0, { w: 8, d: 6, color: '#e8e8f0', noren: ['#ff4fc8', '#4fe8ff', '#b48cff', '#ffe04f', '#7cff8a'][i], floors: 2 });
  }
  c.spot('arcade', cx + 30, cz - 22);
  vendingMachine(ctx, cx + 18, cz - 16, 0, '#ff4fc8');
  vendingMachine(ctx, cx + 19.2, cz - 16, 0, '#4fe8ff');
  vendingMachine(ctx, cx - 18, cz + 16, Math.PI, '#e8eef4');
  for (let i = 0; i < 6; i++) bench(ctx, cx - 20 + i * 8, cz + 22, Math.PI);
  c.spot('hokora', cx - 22, cz + 20);
  // station
  c.b.box(30, 7, 12, '#d7d3cb', { x: cx - 4, y: y0 + 3.5, z: cz + 58 });
  c.sign('ネオン駅', SIGN.neon('#ffffff', 480, 110), cx - 4, y0 + 6, cz + 51.9, Math.PI, 7, 1.6, { glow: true });
  c.col.box(cx - 4, cz + 58, 30, 12, 0);
  c.word('駅', cx - 4, cz + 50, 4);
  // people
  c.npc({
    id: 'salaryman', name: 'Sr. Hayashi', jp: 'はやし部長', title: 'gerente de empresa', x: cx - 6, z: cz - 18, ry: 0.4, role: 'teacher',
    themes: ['negocios', 'trabalho', 'keigo'], registers: ['keigo'], voice: { pitch: 0.85, rate: 1.0 }, convos: ['entrevista', 'reuniao'],
    greet: ['いつも お世話に なっております。', 'Agradeço sempre a sua atenção (fórmula de negócios).'],
    look: { skin: '#e9b996', hair: '#3a3036', hairStyle: 'short', outfit: 'suit', top: '#2a2f3a', bottom: '#2a2f3a', accent: '#c8442f', eyes: '#3a2a22', glasses: true },
  });
  c.npc({
    id: 'gamer', name: 'Sora', jp: 'そら', title: 'gamer e streamer', x: cx + 26, z: cz - 20, ry: -0.6, role: 'teacher',
    themes: ['tecnologia', 'lazer', 'giria'], registers: ['giria', 'casual'], voice: { pitch: 1.2, rate: 1.2 }, wander: 4,
    greet: ['うっす！ 今日も 配信 してるよ〜。', 'E aí! Hoje também tô fazendo live!'],
    look: { skin: '#ffe3cf', hair: '#3a5aa8', hairStyle: 'messy', outfit: 'casual', top: '#2a2a36', bottom: '#3a3a48', accent: '#4fe8ff', eyes: '#2a4a7a', hat: 'cap' },
  });
  c.npc({
    id: 'idol', name: 'Hikari', jp: 'ひかり', title: 'idol (fala de anime)', x: cx + 50, z: cz + 8, ry: Math.PI, role: 'teacher',
    themes: ['anime', 'comunicacao'], registers: ['anime', 'casual'], voice: { pitch: 1.55, rate: 1.1 },
    greet: ['みんな〜！ 今日も 元気 いっぱい だよっ！', 'Pessoal~! Hoje também estou cheia de energia!'],
    look: { skin: '#ffe3cf', hair: '#f6b8cf', hairStyle: 'twin', outfit: 'idol', top: '#ff8ac2', bottom: '#ffffff', accent: '#ffd36b', eyes: '#7a2a4a', lashes: true, hat: 'bow' },
  });
  c.npc({
    id: 'news', name: 'Repórter Aoi', jp: 'あおい', title: 'repórter da TV', x: cx + 4, z: cz - 24, ry: 0, role: 'teacher',
    themes: ['comunicacao', 'estado', 'sociedade'], registers: ['polido', 'keigo'], voice: { pitch: 1.15, rate: 1.05 },
    greet: ['こんにちは。ニュースの 時間です。', 'Boa tarde. É hora das notícias.'],
    look: { skin: '#ffe3cf', hair: '#4a3226', hairStyle: 'bob', outfit: 'suit', top: '#e0e4f0', bottom: '#2a2a36', accent: '#3a6ea8', eyes: '#5a3a2a', lashes: true },
  });
}

// ───────────────────────── 8. Vila das Termas ─────────────────────────
export function buildTermas(c: RegionCtx) {
  c.region = 'termas';
  const { x: cx, z: cz } = R.termas;
  const ctx = { b: c.b, col: c.col };
  const r = new Rng(88);
  // the big ryokan
  const rx = cx - 6, rz = cz - 24;
  house(ctx, rx, rz, 0, { w: 22, d: 10, floors: 2, wall: '#efe4cc', roof: '#3d4452', seed: 801 });
  c.sign('旅館 ことのは', SIGN.wood(420, 110), rx, c.ground(rx, rz) + 3.6, rz + 6.2, 0, 4.2, 1.1);
  for (let i = 0; i < 5; i++) paperLantern(c.b, rx - 8 + i * 4, c.ground(rx, rz) + 3.0, rz + 6.0, '#ffffff', 0.7);
  c.word('旅館', rx, rz + 7, 7.5);
  // outdoor baths with steam
  onsenPool(ctx, cx + 14, cz - 6, 5.5);
  onsenPool(ctx, cx + 26, cz + 6, 4.2);
  c.spot('steam1', cx + 14, cz - 6);
  c.spot('steam2', cx + 26, cz + 6);
  c.word('温泉', cx + 14, cz - 6, 2.4);
  // bamboo fence around the baths
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = cx + 20 + Math.cos(a) * 15, z = cz + Math.sin(a) * 13;
    if (Math.abs(a - Math.PI) < 0.4) continue;
    c.b.cyl(0.08, 0.08, 2.2, '#b5a06a', { x, y: c.ground(x, z) + 1.1, z }, 5);
  }
  // foot bath by the stream
  c.b.box(6, 0.5, 2.4, COL.woodLight, { x: cx - 18, y: c.ground(cx - 18, cz + 12) + 0.25, z: cz + 12 });
  c.b.box(5.4, 0.1, 1.4, '#7fd6d0', { x: cx - 18, y: c.ground(cx - 18, cz + 12) + 0.52, z: cz + 12 }, true);
  c.b.add(roofGeometry(7, 3.4, 1.2, 0.2, 0.6), COL.roofTile2, { x: cx - 18, y: c.ground(cx - 18, cz + 12) + 2.6, z: cz + 12 });
  for (const s of [-3, 3]) for (const t of [-1.4, 1.4]) c.b.box(0.18, 2.6, 0.18, COL.woodDark, { x: cx - 18 + s, y: c.ground(cx - 18, cz + 12) + 1.3, z: cz + 12 + t });
  c.sign('足湯', SIGN.wood(200, 100), cx - 18, c.ground(cx - 18, cz + 12) + 2.3, cz + 13.75, 0, 1.4, 0.7);
  c.spot('ashiyu', cx - 18, cz + 14.5);
  c.word('足', cx - 18, cz + 12, 2.6);
  // souvenir street and a little shrine
  for (let i = 0; i < 4; i++) shop(ctx, cx - 30 + i * 10, cz + 28, Math.PI, { w: 8, d: 5, color: '#f2e8d8', noren: ['#c8442f', '#3e8a5a', '#2c4a7c', '#8a5ab8'][i], floors: 1 });
  lanternString(c.b, cx - 34, c.ground(cx - 34, cz + 22) + 4.2, cz + 22, cx + 6, c.ground(cx + 6, cz + 22) + 4.2, cz + 22, 12);
  bridge(ctx, cx - 2, cz + 8, 0.2, 10, 2.6, COL.woodLight);
  c.platform({ x: cx - 2, z: cz + 8, hw: 1.3, hd: 5, rot: 0.2, y: c.ground(cx - 2, cz + 8) + 0.6, arch: 1.6 });
  for (let i = 0; i < 12; i++) c.tree('maple', cx + r.range(-50, 50), cz + r.range(-50, 40), r.range(0.9, 1.3));
  c.spot('hokora', cx + 6, cz + 18);
  // people
  c.npc({
    id: 'okami', name: 'Okami Fumiko', jp: 'ふみこ女将', title: 'dona do ryokan', x: rx + 2, z: rz + 7.5, ry: 0, role: 'talk',
    themes: ['keigo', 'viagem'], registers: ['keigo'], voice: { pitch: 1.1, rate: 0.9 }, convos: ['ryokan'],
    greet: ['ようこそ お越しくださいました。', 'Seja muito bem-vindo, obrigado por vir.'],
    look: { skin: '#ffe3cf', hair: '#2a2126', hairStyle: 'bun', outfit: 'kimono', top: '#5a6ea8', bottom: '#3a4a7a', accent: '#e9c46a', eyes: '#3a2a22', lashes: true },
  });
  c.npc({
    id: 'osaka', name: 'Tia Kazuko', jp: 'かずこおばちゃん', title: 'turista de Osaka', x: cx + 4, z: cz + 20, ry: 2.4, role: 'teacher',
    themes: ['kansai', 'relacoes'], registers: ['kansai'], voice: { pitch: 1.15, rate: 1.15 }, wander: 5,
    greet: ['まいど！ あんた、どっから 来たん？', 'Olá! (jeito de Osaka) De onde você veio?'],
    look: { skin: '#f6d2b8', hair: '#7a4a2e', hairStyle: 'short', outfit: 'casual', top: '#ff9a4f', bottom: '#4a2a3a', accent: '#ffd36b', eyes: '#3a2a22', glasses: true },
  });
  c.npc({
    id: 'isha', name: 'Doutor Kenji', jp: 'けんじ先生', title: 'médico das termas', x: cx - 26, z: cz - 6, ry: 1, role: 'teacher',
    themes: ['saude', 'corpo'], registers: ['polido'], voice: { pitch: 0.9, rate: 0.9 }, convos: ['medico'],
    greet: ['どうしましたか。どこか 痛いですか？', 'O que houve? Está com dor em algum lugar?'],
    look: { skin: '#f6d2b8', hair: '#4a4a52', hairStyle: 'short', outfit: 'doctor', top: '#e8eef4', bottom: '#3a4a5a', accent: '#3a6ea8', eyes: '#3a2a22', glasses: true },
  });
  c.npc({
    id: 'fuufu', name: 'Sr. e Sra. Nakamura', jp: 'なかむら夫妻', title: 'casal de idosos', x: cx + 10, z: cz + 4, ry: -2.2, role: 'teacher',
    themes: ['relacoes', 'sentimentos', 'onomatopeia'], registers: ['casual', 'polido'], voice: { pitch: 0.8, rate: 0.85 },
    greet: ['ああ、いい お湯だったねえ。', 'Ah, que banho gostoso que foi, né.'],
    look: { skin: '#f6d2b8', hair: '#d8d8de', hairStyle: 'short', outfit: 'yukata', top: '#3a6ea8', bottom: '#3a6ea8', accent: '#2a2a36', eyes: '#3a2a22', old: true },
  });
}

// ───────────────────────── 9. Cidade do Castelo ─────────────────────────
export function buildCastelo(c: RegionCtx) {
  c.region = 'castelo';
  const { x: cx, z: cz } = R.castelo;
  const ctx = { b: c.b, col: c.col };
  const r = new Rng(99);
  // the castle on the hill (north part) with a moat
  const kx = cx, kz = cz - 26;
  castle(ctx, kx, kz, 0);
  c.world.water.pond(kx, kz, 22, 20, c.ground(kx + 22, kz) - 0.6).renderOrder = 0;
  c.word('城', kx, kz, 38);
  // stone walls of the castle town
  stoneWall(ctx, cx - 40, cz + 10, cx - 10, cz + 10, 2.2);
  stoneWall(ctx, cx + 10, cz + 10, cx + 40, cz + 10, 2.2);
  // gate (large black gate)
  c.b.box(8, 1.2, 3, '#2a2a30', { x: cx, y: c.ground(cx, cz + 10) + 6.0, z: cz + 10 });
  c.b.add(roofGeometry(10, 4.5, 1.8, 0.3, 0.6), '#3a4250', { x: cx, y: c.ground(cx, cz + 10) + 6.6, z: cz + 10 });
  for (const s of [-3.6, 3.6]) {
    c.b.box(0.8, 6, 0.8, '#2a2a30', { x: cx + s, y: c.ground(cx + s, cz + 10) + 3, z: cz + 10 });
    c.col.box(cx + s, cz + 10, 0.8, 0.8, 0);
  }
  c.word('門', cx, cz + 10, 8.5);
  // merchant street (machiya) south of the wall
  for (let i = 0; i < 6; i++) {
    shop(ctx, cx - 30 + i * 12, cz + 24, Math.PI, { w: 10, d: 6, color: '#e6dcc4', noren: ['#1e2a4a', '#6a3a2a', '#3e5a3a', '#2a2a36', '#8a2a2a', '#4a3a6a'][i], floors: 2 });
    shop(ctx, cx - 30 + i * 12, cz + 44, 0, { w: 10, d: 6, color: '#e9e0c8', noren: ['#6a3a2a', '#1e2a4a', '#8a2a2a', '#3e5a3a', '#4a3a6a', '#2a2a36'][i], floors: 2 });
  }
  c.sign('呉服', SIGN.noren('#1e2a4a', 300, 130), cx - 30, c.ground(cx - 30, cz + 24) + 3.6, cz + 20.9, Math.PI, 3, 1.3);
  c.sign('茶屋', SIGN.noren('#3e5a3a', 300, 130), cx - 6, c.ground(cx - 6, cz + 24) + 3.6, cz + 20.9, Math.PI, 3, 1.3);
  c.sign('道場', SIGN.wood(300, 120), cx + 18, c.ground(cx + 18, cz + 44) + 3.6, cz + 47.1, 0, 3, 1.2);
  c.spot('dojo', cx + 18, cz + 48);
  for (let i = 0; i < 8; i++) stoneLantern(ctx, cx - 4 + (i % 2) * 8, cz + 14 + Math.floor(i / 2) * 9, 0.9);
  for (let i = 0; i < 10; i++) c.tree(r.chance(0.6) ? 'pine' : 'sakura', cx + r.range(-60, 60), cz + r.range(-60, -40), r.range(1, 1.4));
  c.spot('hokora', cx - 14, cz + 34);
  // people
  c.npc({
    id: 'tonosama', name: 'Lorde Nobunari', jp: 'のぶなり殿', title: 'senhor do castelo (fantasma)', x: cx, z: cz + 4, ry: 0, role: 'teacher',
    themes: ['antigo', 'historia'], registers: ['antigo'], voice: { pitch: 0.65, rate: 0.8 },
    greet: ['苦しゅうない。近う 寄れ。', 'Está tudo bem. Aproxime-se (fala de um senhor feudal).'],
    look: { skin: '#cfe0ff', hair: '#1e2236', hairStyle: 'topknot', outfit: 'samurai', top: '#8a2a2a', bottom: '#3a2a4a', accent: '#e9c46a', eyes: '#1e2236', ghost: true },
  });
  c.npc({
    id: 'chajin', name: 'Mestre de Chá Rikyū', jp: 'りきゅう', title: 'mestre da cerimônia do chá', x: cx - 6, z: cz + 19.5, ry: Math.PI, role: 'teacher',
    themes: ['arte', 'keigo', 'expressoes'], registers: ['keigo', 'antigo'], voice: { pitch: 0.75, rate: 0.8 },
    greet: ['一期一会。どうぞ、お茶を 一服。', 'Um encontro, uma oportunidade. Por favor, uma xícara de chá.'],
    look: { skin: '#f6d2b8', hair: '#8a8a92', hairStyle: 'bald', outfit: 'monk', top: '#4a4a3a', bottom: '#3a3a2a', accent: '#6a6a4a', eyes: '#3a2a22', old: true },
  });
  c.npc({
    id: 'giin', name: 'Deputada Ishikawa', jp: 'いしかわ議員', title: 'política', x: cx + 14, z: cz + 30, ry: -1.6, role: 'teacher',
    themes: ['sociedade', 'negocios'], registers: ['keigo', 'polido'], voice: { pitch: 1.0, rate: 1.0 },
    greet: ['皆様の 声を 大切に いたします。', 'Valorizarei a voz de todos vocês.'],
    look: { skin: '#ffe3cf', hair: '#2a2126', hairStyle: 'bob', outfit: 'suit', top: '#6a2a3a', bottom: '#2a2a36', accent: '#e9c46a', eyes: '#3a2a22', lashes: true },
  });
  c.npc({
    id: 'ninja', name: 'Kage', jp: 'かげ', title: 'ninja misterioso', x: cx + 30, z: cz + 6, ry: -2.2, role: 'teacher',
    themes: ['anime', 'acoes'], registers: ['anime', 'antigo'], voice: { pitch: 0.95, rate: 1.1 },
    greet: ['……見つかったか。さすがだな。', '...Fui descoberto. Impressionante.'],
    look: { skin: '#f6d2b8', hair: '#1e1c22', hairStyle: 'short', outfit: 'ninja', top: '#1e1c28', bottom: '#1e1c28', accent: '#c8442f', eyes: '#3a2a22', hat: 'headband' },
  });
}

// ───────────────────────── 10. Templo da Montanha ─────────────────────────
export function buildTemplo(c: RegionCtx) {
  c.region = 'templo';
  const { x: cx, z: cz } = R.templo;
  const ctx = { b: c.b, col: c.col };
  const r = new Rng(1010);
  pagoda(ctx, cx + 18, cz - 14, 0.3, 5);
  c.word('塔', cx + 18, cz - 14, 22);
  // main hall (temple: no torii, dark wood, golden details)
  const hx = cx - 10, hz = cz - 18;
  house(ctx, hx, hz, 0, { w: 16, d: 11, wall: '#5a4232', roof: '#2e333d', seed: 1001 });
  c.sign('山寺', SIGN.plaque(110, 300), hx, c.ground(hx, hz) + 3.9, hz + 6.6, 0, 0.6, 1.6);
  c.word('寺', hx, hz + 7, 8);
  // zen rock garden
  const gx = cx - 4, gz = cz + 10;
  c.b.box(16, 0.08, 10, '#e8e2d4', { x: gx, y: c.ground(gx, gz) + 0.05, z: gz });
  for (let i = 0; i < 9; i++) c.b.box(15.4, 0.02, 0.06, '#cfc8b8', { x: gx, y: c.ground(gx, gz) + 0.1, z: gz - 4 + i });
  for (const [dx, dz, s] of [[-4, -1, 1.2], [3, 1, 0.9], [5.5, -2, 0.6], [-1, 2.5, 0.7]]) c.b.add(new THREE.IcosahedronGeometry(s, 0), COL.stone2, { x: gx + dx, y: c.ground(gx, gz) + s * 0.4, z: gz + dz, sy: 0.7 }, false, 0.2);
  c.col.box(gx, gz, 16, 10, 0);
  c.word('庭', gx, gz, 2.4);
  // bell tower with the great bell
  const bx = cx + 26, bz = cz + 14;
  for (const s of [-1, 1]) for (const t of [-1, 1]) c.b.box(0.4, 5, 0.4, COL.woodDark, { x: bx + s * 2, y: c.ground(bx, bz) + 2.5, z: bz + t * 2 });
  c.b.add(roofGeometry(6, 6, 2, 0.3, 0.4), COL.roofTile2, { x: bx, y: c.ground(bx, bz) + 5, z: bz });
  c.b.cyl(1.2, 1.4, 2.6, '#4a5a4a', { x: bx, y: c.ground(bx, bz) + 3.2, z: bz }, 18);
  c.col.box(bx, bz, 4.4, 4.4, 0);
  c.spot('bell', bx, bz + 3.4);
  c.word('鐘', bx, bz, 7);
  for (let i = 0; i < 16; i++) c.tree(r.chance(0.7) ? 'pine' : 'maple', cx + r.range(-50, 50), cz + r.range(-50, 50) * 0.6 + (i % 2 ? 35 : -40), r.range(1, 1.5));
  for (let i = 0; i < 6; i++) stoneLantern(ctx, cx - 14 + i * 5.6, cz + 24, 0.95);
  c.spot('hokora', cx + 6, cz + 26);
  c.npc({
    id: 'zen', name: 'Mestre Zen Dōgen', jp: 'どうげん老師', title: 'mestre zen', x: cx - 4, z: cz + 3, ry: 0, role: 'teacher',
    themes: ['mente', 'expressoes'], registers: ['antigo', 'keigo'], voice: { pitch: 0.7, rate: 0.75 },
    greet: ['よく 来られた。心を 静かに しなさい。', 'Que bom que veio. Acalme o coração.'],
    look: { skin: '#f6d2b8', hair: '#8a8a92', hairStyle: 'bald', outfit: 'monk', top: '#3a3a3e', bottom: '#2a2a2e', accent: '#c9a878', eyes: '#3a2a22', old: true },
  });
  c.npc({
    id: 'hakase', name: 'Doutora Midori', jp: 'みどり博士', title: 'cientista eremita', x: cx + 10, z: cz - 2, ry: -0.8, role: 'teacher',
    themes: ['ciencia', 'estado'], registers: ['polido'], voice: { pitch: 1.05, rate: 1.05 },
    greet: ['ふむ、興味深い。君も 研究に 来たのかね？', 'Hum, interessante. Você também veio pesquisar?'],
    look: { skin: '#ffe3cf', hair: '#5ab88a', hairStyle: 'messy', outfit: 'doctor', top: '#f2f6f4', bottom: '#3a4a3a', accent: '#5fd3a2', eyes: '#3a6a3a', glasses: true },
  });
  c.npc({
    id: 'haijin', name: 'Poeta Bashō', jp: 'ばしょう', title: 'poeta de haicai', x: cx + 22, z: cz + 4, ry: -1.4, role: 'teacher',
    themes: ['arte', 'comunicacao', 'natureza'], registers: ['antigo', 'polido'], voice: { pitch: 0.8, rate: 0.8 },
    greet: ['古池や 蛙飛び込む 水の音。', 'O velho lago / uma rã salta / som da água. (haicai de Bashō)'],
    look: { skin: '#f6d2b8', hair: '#5a5a62', hairStyle: 'short', outfit: 'monk', top: '#6a5a4a', bottom: '#4a3a2a', accent: '#c9a878', eyes: '#3a2a22', hat: 'straw', old: true },
  });
}

// ───────────────────────── 11. Pico Sagrado ─────────────────────────
export function buildPico(c: RegionCtx) {
  c.region = 'pico';
  const { x: cx, z: cz } = R.pico;
  const ctx = { b: c.b, col: c.col };
  // stone circle around the Great Tree
  const tx = cx, tz = cz - 16;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = tx + Math.cos(a) * 24, z = tz + Math.sin(a) * 24;
    c.b.box(1.2, 2.6 + (i % 3) * 0.4, 0.8, COL.stone, { x, y: c.ground(x, z) + 1.2, z, ry: -a });
    c.col.box(x, z, 1.2, 0.8, -a);
  }
  // the final gate of words
  torii(ctx, cx, cz + 22, 0, 1.8, '#e9c46a');
  c.sign('言霊の門', SIGN.plaque(110, 380), cx, c.ground(cx, cz + 22) + 7.6, cz + 22.5, 0, 0.8, 2.6, { double: true });
  for (let i = 0; i < 6; i++) stoneLantern(ctx, cx + (i % 2 ? 6 : -6), cz + 30 - Math.floor(i / 2) * 9, 1.1);
  hokora(ctx, cx + 16, cz + 10, -0.6);
  c.spot('hokora', cx + 14, cz + 12);
  c.spot('heart', tx, tz + 9);
  c.word('木', tx + 8, tz + 10, 4);
  c.word('言葉', cx, cz + 22, 10.5);
  c.npc({
    id: 'kotonoha', name: 'Kotonoha-hime', jp: '言の葉姫', title: 'espírito da Grande Árvore', x: tx, z: tz + 11, ry: 0, role: 'guide',
    themes: ['expressoes', 'mente'], registers: ['antigo', 'keigo', 'polido', 'casual', 'giria', 'anime', 'kansai'], voice: { pitch: 1.2, rate: 0.85 },
    greet: ['よく ここまで 来ましたね。あなたの 言葉が、この 木を 育てたのです。', 'Você chegou até aqui. Foram as suas palavras que fizeram esta árvore crescer.'],
    look: { skin: '#fff4ee', hair: '#9ff0c8', hairStyle: 'long', outfit: 'miko', top: '#f4fff8', bottom: '#5fd3a2', accent: '#e9c46a', eyes: '#2a8a6a', lashes: true, hat: 'bow' },
  });
}
