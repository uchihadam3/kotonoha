#!/usr/bin/env node
// Validates an annotation batch: node tools/validate-annot.mjs 07   (checks data-src/annot/out-07.jsonl against in-07.jsonl)
import { readFileSync, existsSync } from 'node:fs';
const id = process.argv[2];
if (!id) { console.log('usage: node tools/validate-annot.mjs <batch>'); process.exit(2); }
const THEMES = new Set(['saudacoes','numeros','familia','animais','cores','natureza','comida','roupas','compras','casa','tempo','escola','corpo','saude','verbos','acoes','adjetivos','estado','gramatica','adverbios','sentimentos','relacoes','mente','comunicacao','cidade','viagem','trabalho','negocios','sociedade','ciencia','tecnologia','arte','lazer','historia','expressoes','onomatopeia']);
const POS = new Set(['n','vs','pn','pron','num','ctr','suf','pref','prt','conj','int','exp','adv','adj-i','adj-ix','adj-na','adj-no','adj-pn','cop','aux','v1','v5u','v5k','v5k-s','v5g','v5s','v5t','v5n','v5b','v5m','v5r','v5r-i','v5aru','vk','vs-i']);
const REG = new Set(['polido','casual','giria','anime','antigo','keigo','kansai']);
const KANA = /^[ぁ-ゖゝゞァ-ヺーヽヾ]+$/u;
const inF = `data-src/annot/in-${id}.jsonl`, outF = `data-src/annot/out-${id}.jsonl`;
if (!existsSync(outF)) { console.log(`✗ ${outF} does not exist`); process.exit(1); }
const parse = (f) => readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l, n) => { try { return JSON.parse(l); } catch (e) { return { __bad: `line ${n + 1}: ${e.message}` }; } });
const ins = parse(inF), outs = parse(outF);
let errors = 0, warns = 0;
const err = (m) => { errors++; console.log('✗ ' + m); };
const warn = (m) => { warns++; if (warns <= 60) console.log('△ ' + m); };
const byI = new Map();
for (const o of outs) {
  if (o.__bad) { err(`invalid JSON ${o.__bad}`); continue; }
  if (byI.has(o.i)) err(`${o.i}: duplicated`);
  byI.set(o.i, o);
}
for (const x of ins) {
  const o = byI.get(x.i);
  if (!o) { err(`${x.i} ${x.w}: missing output line`); continue; }
  for (const k of Object.keys(o)) if (!['i','pt','t','ex','pos','w','r','reg','note','skip'].includes(k)) err(`${x.i}: unknown key ${k}`);
  if (o.skip === true) continue;
  if (typeof o.pt !== 'string' || !/[a-zà-ú]/i.test(o.pt)) err(`${x.i} ${x.w}: pt missing`);
  if (/[぀-ヿ一-鿿]/.test(o.pt || '')) warn(`${x.i} ${x.w}: Japanese characters inside pt`);
  if (!THEMES.has(o.t)) err(`${x.i} ${x.w}: bad theme "${o.t}"`);
  if (o.pos !== undefined && !POS.has(o.pos)) err(`${x.i} ${x.w}: bad pos "${o.pos}"`);
  if (o.reg !== undefined && !REG.has(o.reg)) err(`${x.i} ${x.w}: bad reg "${o.reg}"`);
  if (o.r !== undefined && !KANA.test(o.r)) err(`${x.i} ${x.w}: r must be kana only`);
  if (o.note !== undefined && (typeof o.note !== 'string' || o.note.length > 200)) err(`${x.i} ${x.w}: note too long or not a string`);
  if (!Array.isArray(o.ex) || o.ex.length !== 2 || typeof o.ex[0] !== 'string' || typeof o.ex[1] !== 'string' || !o.ex[0] || !o.ex[1]) { err(`${x.i} ${x.w}: ex must be [jp, pt]`); continue; }
  const w = o.w || x.w, r = o.r || x.r;
  const jp = o.ex[0];
  const stems = [w, r, w.slice(0, -1), r.slice(0, -1), w.replace(/する$/, ''), w.slice(0, 1)].filter((s) => s && s.length >= 1);
  if (!stems.some((s) => jp.includes(s))) warn(`${x.i} ${w}: example may not contain the word: ${jp}`);
  if (jp.length > 45) warn(`${x.i} ${w}: long example (${jp.length} chars)`);
}
console.log(`${outs.length} output lines for ${ins.length} inputs; ${errors} error(s), ${warns} warning(s).`);
process.exit(errors ? 1 : 0);
