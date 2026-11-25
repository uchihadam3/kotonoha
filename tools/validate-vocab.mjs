#!/usr/bin/env node
// Validates vocabulary JSON files (data-src/vocab/*.json).
// Usage: node tools/validate-vocab.mjs [file.json ...]   (no args = every file in data-src/vocab)
// Prints errors and a romaji preview so the readings can be eyeballed.
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const POS = new Set([
  'n', 'pn', 'pron', 'num', 'ctr', 'suf', 'pref', 'prt', 'conj', 'int', 'exp', 'adv', 'adj-i', 'adj-ix', 'adj-na', 'adj-no', 'adj-pn',
  'v1', 'v5u', 'v5k', 'v5k-s', 'v5g', 'v5s', 'v5t', 'v5n', 'v5b', 'v5m', 'v5r', 'v5r-i', 'v5aru', 'vk', 'vs', 'vs-i', 'aux', 'cop',
]);
const REG = new Set(['polido', 'casual', 'giria', 'anime', 'antigo', 'keigo', 'kansai']);
const KANA = /^[ぁ-ゖゝゞァ-ヺーヽヾ]+$/u;
const SENT_KANA = /^[ぁ-ゖゝゞァ-ヺーヽヾ 　、。！？!?「」『』…〜～・ー,.]+$/u;
const HAS_LATIN_PT = /[a-zA-ZÀ-ú]/;

// --- tiny kana -> romaji (Hepburn) just for the preview ---
const H = {
  あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',
  な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',
  ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',ゐ:'wi',ゑ:'we',を:'o',ん:'n',が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',
  だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o',ゔ:'vu',
};
function toHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
function romaji(kana) {
  const s = toHira(kana);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === 'っ') { const nx = romaji(s.slice(i + 1, i + 2)); out += nx ? nx[0] : ''; continue; }
    if (c === 'ー') { out += out.slice(-1); continue; }
    if (n && 'ゃゅょ'.includes(n) && H[c]) {
      const base = H[c];
      const y = { ゃ: 'a', ゅ: 'u', ょ: 'o' }[n];
      out += (/(sh|ch|j)$/.test(base.slice(0, -1)) ? base.slice(0, -1) : base.slice(0, -1) + 'y') + y;
      i++;
      continue;
    }
    out += H[c] ?? c;
  }
  return out;
}

const dir = 'data-src/vocab';
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));
let errors = 0;
let total = 0;
const seen = new Map();
for (const f of files) {
  let arr;
  try {
    arr = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    console.log(`✗ ${f}: invalid JSON: ${e.message}`);
    errors++;
    continue;
  }
  if (!Array.isArray(arr)) { console.log(`✗ ${f}: top level must be an array`); errors++; continue; }
  const err = (i, msg) => { errors++; console.log(`✗ ${basename(f)}[${i}] ${arr[i]?.w ?? ''}: ${msg}`); };
  arr.forEach((e, i) => {
    if (typeof e !== 'object' || !e) return err(i, 'not an object');
    for (const k of Object.keys(e)) if (!['w', 'r', 'pt', 'n', 'pos', 'reg', 'ex', 'note', 'ro'].includes(k)) err(i, `unknown key "${k}"`);
    if (typeof e.w !== 'string' || !e.w.trim()) err(i, 'missing w');
    if (typeof e.r !== 'string' || !KANA.test(e.r)) err(i, `r must be kana only (got "${e.r}")`);
    if (typeof e.pt !== 'string' || !HAS_LATIN_PT.test(e.pt)) err(i, 'missing pt');
    if (![1, 2, 3, 4, 5].includes(e.n)) err(i, `n must be 1..5 (got ${e.n})`);
    if (!POS.has(e.pos)) err(i, `bad pos "${e.pos}"`);
    if (e.reg !== undefined && !REG.has(e.reg)) err(i, `bad reg "${e.reg}"`);
    if (e.ro !== undefined && !/^[a-z' -]+$/.test(e.ro)) err(i, `ro must be lowercase romaji (got "${e.ro}")`);
    if (e.note !== undefined && typeof e.note !== 'string') err(i, 'note must be a string');
    if (e.ex !== undefined) {
      const x = e.ex;
      if (typeof x !== 'object' || !x) err(i, 'ex must be an object');
      else {
        if (typeof x.jp !== 'string' || !x.jp) err(i, 'ex.jp missing');
        if (typeof x.r !== 'string' || !SENT_KANA.test(x.r)) err(i, `ex.r must be kana with spaces/punctuation (got "${x.r}")`);
        if (typeof x.pt !== 'string' || !x.pt) err(i, 'ex.pt missing');
        for (const k of Object.keys(x)) if (!['jp', 'r', 'pt'].includes(k)) err(i, `unknown ex key "${k}"`);
      }
    }
    const key = `${e.w}|${e.r}`;
    if (seen.has(key)) err(i, `duplicate of ${seen.get(key)}`);
    else seen.set(key, `${basename(f)}[${i}]`);
  });
  total += arr.length;
  const exCount = arr.filter((e) => e.ex).length;
  const levels = [5, 4, 3, 2, 1].map((n) => `N${n}:${arr.filter((e) => e.n === n).length}`).join(' ');
  console.log(`• ${basename(f)}: ${arr.length} words, ${exCount} examples, ${levels}`);
  if (process.env.PREVIEW) for (const e of arr) console.log(`    ${e.w}  ${e.r}  ${e.ro ?? romaji(e.r)}  — ${e.pt}${e.reg ? `  [${e.reg}]` : ''}`);
}
console.log(errors ? `\n${errors} problem(s) found in ${total} entries.` : `\nOK — ${total} entries, no problems.`);
process.exit(errors ? 1 : 0);
