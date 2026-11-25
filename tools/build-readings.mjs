#!/usr/bin/env node
/**
 * Generates src/data/readings.json: the kana reading (spaced by word) of every Japanese line written in
 * the game's source (dialogues, greetings, story, conversations), so the game can show furigana/romaji
 * for any line. Readings come from kuromoji, corrected with the vocabulary's own readings.
 * Usage: node tools/build-readings.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const JP = /[぀-ヿ㐀-鿿]/;
const hasKanji = (s) => /[㐀-鿿々]/.test(s);
const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|json)$/.test(f) && !/words\.json|kanji\.json|strokes\.json|readings\.json/.test(f)) out.push(p);
  }
  return out;
}

const lines = new Set();
for (const f of walk('src')) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)) {
    const s = m[2];
    if (JP.test(s) && /[\u3040-\u30ff]/.test(s) && s.length >= 2 && s.length <= 160 && !s.includes('${') && !/[<>{}=]/.test(s)) lines.add(s.replace(/\\n/g, '\n'));
  }
}

// vocabulary readings to correct kuromoji
const readingOf = new Map();
if (existsSync('src/data/words.json')) {
  const wj = JSON.parse(readFileSync('src/data/words.json', 'utf8'));
  for (const r of wj.rows) if (hasKanji(r[1]) && !readingOf.has(r[1])) readingOf.set(r[1], toHira(r[2]));
}
const kuromoji = require('kuromoji');
const tk = await new Promise((res, rej) => kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((e, t) => (e ? rej(e) : res(t))));
const out = {};
for (const s of lines) {
  const parts = [];
  for (const t of tk.tokenize(s)) {
    const surf = t.surface_form;
    let r;
    if (!hasKanji(surf)) r = surf;
    else if (readingOf.has(surf)) r = readingOf.get(surf);
    else if (t.reading && t.reading !== '*') r = toHira(t.reading);
    else r = surf;
    if (t.pos === '記号' && parts.length) parts[parts.length - 1] += r;
    else parts.push(r);
  }
  out[s] = parts.join(' ').replace(/ (ます|ました|ません|でした|た|だ|て|で|ない|たい|ちゃう|じゃう|る|れる|られる|せる|させる|う|よう)(?=[ 。、！？]|$)/g, '$1');
}
writeFileSync('src/data/readings.json', JSON.stringify(out));
console.log(`readings: ${Object.keys(out).length} lines`);
