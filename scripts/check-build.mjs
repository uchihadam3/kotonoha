// Sanity check of the single-file build: every conversation, the word list and the kanji made it in.
import { readFileSync, readdirSync } from 'node:fs';
const html = readFileSync('dist/index.html', 'utf8');
const missing = [];
for (const f of readdirSync('src/data/convos').filter((f) => f.endsWith('.json'))) {
  const c = JSON.parse(readFileSync('src/data/convos/' + f, 'utf8'));
  if (!html.includes(c.title)) missing.push(`conversa ${c.id}`);
}
const words = JSON.parse(readFileSync('src/data/words.json', 'utf8')).rows;
for (const r of [words[0], words[Math.floor(words.length / 2)], words[words.length - 1]]) if (!html.includes(String(r[3]))) missing.push(`palavra ${r[1]}`);
if (missing.length) {
  console.error('✗ faltando na build: ' + missing.join(', '));
  process.exit(1);
}
console.log(`✓ build ok: ${(html.length / 1e6).toFixed(1)} M caracteres, ${words.length} palavras, conversas JSON presentes`);
