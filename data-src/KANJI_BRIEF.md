# KOTONOHA — kanji meaning brief

The game teaches all 2 136 jōyō kanji to Brazilian Portuguese speakers. Each kanji card shows its meaning in
Portuguese. The current Portuguese meanings come from KANJIDIC2 and contain mistakes (e.g. 葉 "avião",
from a mistranslation of "plane" = flat surface) or are missing.

Input: `data-src/kanji/in-N.jsonl`, one JSON per line: `{"k":"葉","en":"leaf; plane; lobe…","pt":"folha; avião…","on":"ヨウ","kun":"は"}`.

Output: `data-src/kanji/out-N.jsonl`, one line per input line, same order: `{"k":"葉","pt":"folha; lâmina; (contador de coisas finas)"}`

Rules for `pt`:
- Brazilian Portuguese, lowercase except proper nouns (Japão, China, Buda…), 1 to 3 meanings separated by `; `,
  most important first: the core meaning a learner should associate with the kanji (as used in modern words).
- Fix every wrong or odd translation; fill missing ones from the English and your knowledge. No English words.
- Keep it short (ideally under 40 characters). No explanations.

Check that every line parses and that `k` matches the input order:
`node -e "const fs=require('fs');const a=fs.readFileSync('data-src/kanji/in-N.jsonl','utf8').trim().split('\n').map(JSON.parse);const b=fs.readFileSync('data-src/kanji/out-N.jsonl','utf8').trim().split('\n').map(JSON.parse);if(a.length!==b.length)throw 'count';a.forEach((x,i)=>{if(x.k!==b[i].k||!b[i].pt)throw 'line '+i});console.log('ok',b.length)"`
(replace N). Reply in at most 2 lines.
