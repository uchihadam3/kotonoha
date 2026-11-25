#!/usr/bin/env node
/**
 * Builds the game data in src/data from the sources in data-src:
 *   words.json     curated themed vocabulary + annotated JLPT/frequency words (deduplicated, ordered)
 *   registros.json how each register says everyday things
 *   kanji.json     the 2 136 jōyō kanji (readings, meanings in Portuguese, grade, JLPT, strokes)
 *   strokes.json   stroke paths (KanjiVG) for kana and kanji
 * Example sentences without a reading get one from kuromoji, corrected with the vocabulary's readings.
 * Usage: node tools/build-data.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const VOCAB = 'data-src/vocab';
const ANNOT = 'data-src/annot';
const OUT = 'src/data';
mkdirSync(OUT, { recursive: true });

const THEME_ORDER = [
  'saudacoes', 'numeros', 'familia', 'animais', 'cores', 'natureza', 'casa', 'comida', 'compras', 'roupas', 'onomatopeia',
  'escola', 'tempo', 'verbos', 'adjetivos', 'gramatica', 'corpo', 'casual', 'sentimentos', 'adverbios', 'keigo', 'historia', 'arte',
  'antigo', 'cidade', 'viagem', 'trabalho', 'acoes', 'relacoes', 'giria', 'anime', 'tecnologia', 'comunicacao', 'lazer', 'estado',
  'saude', 'kansai', 'sociedade', 'negocios', 'mente', 'ciencia', 'expressoes',
];

const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const hasKanji = (s) => /[㐀-鿿々]/.test(s);
function hashId(s, salt = '') {
  let x = 0x811c9dc5;
  const t = salt + s;
  for (let i = 0; i < t.length; i++) {
    x ^= t.charCodeAt(i);
    x = Math.imul(x, 0x01000193) >>> 0;
  }
  return x.toString(36);
}

// ───────────── load curated ─────────────
const curated = [];
for (const f of readdirSync(VOCAB).filter((f) => f.endsWith('.json'))) {
  const theme = f.replace('.json', '');
  const arr = JSON.parse(readFileSync(join(VOCAB, f), 'utf8'));
  arr.forEach((e, i) => curated.push({ ...e, t: theme, src: 'c', ord: i }));
}
// ───────────── load annotated ─────────────
const wb = existsSync('data-src/wordbase.json') ? JSON.parse(readFileSync('data-src/wordbase.json', 'utf8')) : { jlpt: [], extra: [] };
const baseById = new Map([...wb.jlpt, ...wb.extra].map((o) => [o.i, o]));
const annotated = [];
if (existsSync(ANNOT)) {
  for (const f of readdirSync(ANNOT).filter((f) => /^out-\d+\.jsonl$/.test(f)).sort()) {
    for (const line of readFileSync(join(ANNOT, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let o;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      if (o.skip) continue;
      const b = baseById.get(o.i);
      if (!b || !o.pt || !o.t) continue;
      annotated.push({
        w: o.w || b.w, r: o.r || toKanaReading(b.r), pt: o.pt, n: b.n, pos: o.pos || b.pos, t: o.t, reg: o.reg, note: o.note,
        ex: Array.isArray(o.ex) ? { jp: o.ex[0], pt: o.ex[1] } : undefined, src: 'a', nf: b.nf ?? 99, ord: Number(o.i.slice(1)),
      });
    }
  }
}
function toKanaReading(r) {
  return r.replace(/[^ぁ-ゖァ-ヺー]/g, '');
}

// ───────────── merge & dedupe ─────────────
const seenWR = new Set();
const seenW = new Map(); // w -> reading set
const words = [];
const keyOf = (w, r) => `${w}|${toHira(r)}`;
const firstSense = (pt) => pt.split(/[;,(]/)[0].trim().toLowerCase();
function accept(e) {
  if (!e.w || !e.r || !e.pt) return false;
  const k = keyOf(e.w, e.r);
  if (seenWR.has(k)) return false;
  // the same word under another spelling (有難う vs ありがとう): same reading and same main meaning
  const same = seenW.get(toHira(e.r)) ?? [];
  for (const alt of same) if (firstSense(alt.pt) === firstSense(e.pt)) return false;
  seenWR.add(k);
  if (!seenW.has(toHira(e.r))) seenW.set(toHira(e.r), []);
  seenW.get(toHira(e.r)).push(e);
  return true;
}
for (const e of curated) if (accept(e)) words.push(e);
const fromCurated = words.length;
annotated.sort((a, b) => a.n === b.n ? (a.nf - b.nf) || (a.ord - b.ord) : b.n - a.n);
for (const e of annotated) if (accept(e)) words.push(e);
console.log(`words: ${words.length} (${fromCurated} curated, ${words.length - fromCurated} annotated; ${annotated.length} annotated read)`);

// ───────────── example readings ─────────────
const readingOf = new Map();
for (const e of words) if (hasKanji(e.w) && !readingOf.has(e.w)) readingOf.set(e.w, toHira(e.r));
const kuromoji = require('kuromoji');
const tokenizer = await new Promise((res, rej) => kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((e, t) => (e ? rej(e) : res(t))));
let generated = 0;
function readingFor(jp) {
  const toks = tokenizer.tokenize(jp);
  const parts = [];
  for (const t of toks) {
    const surf = t.surface_form;
    let r;
    if (!hasKanji(surf)) r = surf;
    else if (readingOf.has(surf)) r = readingOf.get(surf);
    else if (t.reading && t.reading !== '*') r = toHira(t.reading);
    else r = surf;
    // keep katakana words as katakana
    if (/^[ァ-ヺー]+$/.test(surf)) r = surf;
    const isPunct = t.pos === '記号';
    if (isPunct && parts.length) parts[parts.length - 1] += r;
    else parts.push(r);
  }
  // glue auxiliaries/conjugation endings to their verbs so the spacing reads naturally
  return parts.join(' ').replace(/ (ます|ました|ません|でした|た|だ|て|で|ない|たい|ちゃう|じゃう|る|れる|られる|せる|させる|う|よう)(?=[ 。、！？]|$)/g, '$1');
}
for (const e of words) {
  if (e.ex && !e.ex.r && e.ex.jp) {
    e.ex.r = readingFor(e.ex.jp);
    generated++;
  }
}
console.log(`example readings generated: ${generated}`);

// ───────────── ids, final order ─────────────
const ids = new Set();
for (const e of words) {
  let id = hashId(`${e.w}|${e.r}`);
  let salt = 0;
  while (ids.has(id)) id = hashId(`${e.w}|${e.r}`, String(++salt));
  ids.add(id);
  e.id = id;
  if (!THEME_ORDER.includes(e.t)) THEME_ORDER.push(e.t);
}
const themeIdx = Object.fromEntries(THEME_ORDER.map((t, i) => [t, i]));
words.sort((a, b) => (themeIdx[a.t] - themeIdx[b.t]) || (b.n - a.n) || (a.src === b.src ? 0 : a.src === 'c' ? -1 : 1) || (a.src === 'c' ? a.ord - b.ord : (a.nf - b.nf) || (a.ord - b.ord)));
const FIELDS = ['id', 'w', 'r', 'pt', 'n', 't', 'pos', 'reg', 'note', 'exjp', 'exr', 'expt', 'ro'];
const rows = words.map((e) => [e.id, e.w, e.r, e.pt, e.n, e.t, e.pos || 'n', e.reg || '', e.note || '', e.ex?.jp || '', e.ex?.r || '', e.ex?.pt || '', e.ro || '']);
writeFileSync(join(OUT, 'words.json'), JSON.stringify({ fields: FIELDS, themes: THEME_ORDER.filter((t) => words.some((w) => w.t === t)), rows }));
const byTheme = {};
for (const w of words) byTheme[w.t] = (byTheme[w.t] || 0) + 1;
console.log('by theme:', JSON.stringify(byTheme));
const byLevel = {};
for (const w of words) byLevel['N' + w.n] = (byLevel['N' + w.n] || 0) + 1;
console.log('by level:', JSON.stringify(byLevel));

// ───────────── registros ─────────────
if (existsSync('data-src/vocab-extra/registros.json')) {
  const reg = JSON.parse(readFileSync('data-src/vocab-extra/registros.json', 'utf8'));
  writeFileSync(join(OUT, 'registros.json'), JSON.stringify(reg));
  console.log(`registros: ${reg.length} concepts`);
}

// ───────────── kanji ─────────────
if (existsSync('data-src/raw/kanjidic2.xml')) {
  const xml = readFileSync('data-src/raw/kanjidic2.xml', 'utf8');
  const kd = JSON.parse(readFileSync('data-src/raw/kanji-data.json', 'utf8'));
  const ptFix = existsSync('data-src/kanji-pt.json') ? JSON.parse(readFileSync('data-src/kanji-pt.json', 'utf8')) : {};
  const chars = Object.entries(kd).filter(([, v]) => v.grade != null && v.grade <= 8);
  const entries = new Map();
  const re = /<character>([\s\S]*?)<\/character>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const lit = /<literal>(.*?)<\/literal>/.exec(block)[1];
    if (!kd[lit] || kd[lit].grade == null || kd[lit].grade > 8) continue;
    const on = [...block.matchAll(/<reading r_type="ja_on">(.*?)<\/reading>/g)].map((x) => x[1]);
    const kun = [...block.matchAll(/<reading r_type="ja_kun">(.*?)<\/reading>/g)].map((x) => x[1]);
    const pt = [...block.matchAll(/<meaning m_lang="pt">(.*?)<\/meaning>/g)].map((x) => x[1]);
    const en = [...block.matchAll(/<meaning>(.*?)<\/meaning>/g)].map((x) => x[1]);
    entries.set(lit, { on, kun, pt, en });
  }
  // order: by JLPT level (5 → 1), then school grade, then frequency
  chars.sort(([, a], [, b]) => ((b.jlpt_new ?? 0) - (a.jlpt_new ?? 0)) || (a.grade - b.grade) || ((a.freq ?? 9999) - (b.freq ?? 9999)));
  const kanjiRows = chars.map(([k, v]) => {
    const e = entries.get(k) || { on: [], kun: [], pt: [], en: [] };
    const ptm = ptFix[k] || cleanPt(e.pt).slice(0, 3).join('; ') || e.en.slice(0, 3).join('; ');
    return [k, v.strokes, v.grade, v.jlpt_new ?? 0, v.freq ?? 0, e.on.slice(0, 4).join('、'), e.kun.slice(0, 5).join('、'), ptm];
  });
  writeFileSync(join(OUT, 'kanji.json'), JSON.stringify({ fields: ['k', 'strokes', 'grade', 'jlpt', 'freq', 'on', 'kun', 'pt'], rows: kanjiRows }));
  console.log(`kanji: ${kanjiRows.length} (${Object.keys(ptFix).length} with reviewed Portuguese)`);
}
function cleanPt(list) {
  return list.map((s) => s.trim()).filter((s) => s && !/avião|prefixo|sufixo p\//i.test(s)).map((s) => s.charAt(0).toLowerCase() + s.slice(1));
}

// ───────────── strokes (KanjiVG) ─────────────
const KVG = 'data-src/raw/kanjivg';
if (existsSync(KVG)) {
  const strokes = {};
  let bytes = 0;
  for (const f of readdirSync(KVG).filter((f) => f.endsWith('.svg'))) {
    const ch = String.fromCodePoint(parseInt(f.replace('.svg', ''), 16));
    const svg = readFileSync(join(KVG, f), 'utf8');
    const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((x) => compactPath(x[1]));
    if (!paths.length) continue;
    strokes[ch] = paths;
    bytes += paths.join('').length;
  }
  writeFileSync(join(OUT, 'strokes.json'), JSON.stringify(strokes));
  console.log(`strokes: ${Object.keys(strokes).length} characters, ${(bytes / 1e6).toFixed(2)} MB of path data`);
}
function compactPath(d) {
  return d
    .replace(/(\d+\.\d+)/g, (n) => String(Math.round(Number(n) * 10) / 10))
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ',')
    .replace(/ ?([MmCcSsLlZz]) ?/g, '$1')
    .replace(/,-/g, '-')
    .replace(/ -/g, '-');
}

// ───────────── charset for font subsetting ─────────────
const chars = new Set();
for (const r of rows) for (const s of [r[1], r[2], r[9], r[10]]) for (const c of s) chars.add(c);
writeFileSync('data-src/charset.txt', [...chars].join(''));
console.log(`charset: ${chars.size} chars`);
