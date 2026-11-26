/* KOTONOHA tests: kana/romaji, the IME, conjugation, spaced repetition, saves and data integrity.
 * Run with: npm test */
import { toRomaji, romajiToKana, nameToKatakana, normalizeKana, toKatakana } from '../src/lang/kana';
import { conjugate } from '../src/lang/conjugate';
import { numberKana, numberKanji, priceDistractors } from '../src/lang/numbers';
import { newItem, answer, LEARNED_STAGE, INTERVALS, packItem, unpackItem } from '../src/lang/srs';
import { newSave, validate } from '../src/core/save';
import { REGIONS, THEME_NAMES, LEVEL_UNLOCK } from '../src/data/regions';
import { CONVOS } from '../src/data/convos';
import { readFileSync, readdirSync } from 'node:fs';

let pass = 0, fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else {
    fail++;
    console.log(`✗ ${name}\n    got:  ${JSON.stringify(got)}\n    want: ${JSON.stringify(want)}`);
  }
}
function ok(name: string, cond: boolean) {
  eq(name, cond, true);
}

// ── romaji
eq('romaji basic', toRomaji('ねこ'), 'neko');
eq('romaji yoon', toRomaji('しゃしん'), 'shashin');
eq('romaji sokuon', toRomaji('きって'), 'kitte');
eq('romaji ch geminate', toRomaji('まっちゃ'), 'matcha');
eq('romaji long vowel katakana', toRomaji('コーヒー'), 'koohii');
eq('romaji n apostrophe', toRomaji('こんや'), "kon'ya");
eq('romaji fa', toRomaji('ファン'), 'fan');
eq('romaji ti', toRomaji('パーティー'), 'paatii');
eq('romaji particles in sentences', toRomaji('わたし は がくせい です。'), 'watashi wa gakusei desu.');
eq('romaji を へ', toRomaji('みず を のみます'), 'mizu o nomimasu');

// ── romaji → kana (typing)
eq('ime simple', romajiToKana('neko'), 'ねこ');
eq('ime double consonant', romajiToKana('kitte'), 'きって');
eq('ime nn', romajiToKana('konnnichiha'), 'こんにちは');
eq('ime n before consonant', romajiToKana('sensei'), 'せんせい');
eq('ime final n', romajiToKana('hon', false, true), 'ほん');
eq('ime shi/si', romajiToKana('sushi') === romajiToKana('susi'), true);
eq('ime katakana', romajiToKana('ko-hi-', true), 'コーヒー');
eq('ime yoon', romajiToKana('kyou'), 'きょう');
eq('ime tch', romajiToKana('matcha'), 'まっちゃ');
eq('normalize', normalizeKana('コーヒー。'), 'こーひー');
eq('katakana', toKatakana('ねこ'), 'ネコ');

// ── names
eq('name Adam', nameToKatakana('Adam'), 'アダム');
eq('name Maria', nameToKatakana('Maria'), 'マリア');
eq('name Lucas', nameToKatakana('Lucas'), 'ルカス');

// ── conjugation
const form = (w: string, r: string, pos: string, id: string) => conjugate(w, r, pos).find((f) => f.id === id)?.w;
eq('v1 masu', form('食べる', 'たべる', 'v1', 'masu'), '食べます');
eq('v1 te', form('食べる', 'たべる', 'v1', 'te'), '食べて');
eq('v5k te', form('書く', 'かく', 'v5k', 'te'), '書いて');
eq('v5k-s te', form('行く', 'いく', 'v5k-s', 'te'), '行って');
eq('v5g te', form('泳ぐ', 'およぐ', 'v5g', 'te'), '泳いで');
eq('v5m nai', form('読む', 'よむ', 'v5m', 'nai'), '読まない');
eq('v5u nai', form('買う', 'かう', 'v5u', 'nai'), '買わない');
eq('v5r ta', form('帰る', 'かえる', 'v5r', 'ta'), '帰った');
eq('v5s masu', form('話す', 'はなす', 'v5s', 'masu'), '話します');
eq('ある nai', form('ある', 'ある', 'v5r-i', 'nai'), 'ない');
eq('来る nai reading', conjugate('来る', 'くる', 'vk').find((f) => f.id === 'nai')?.r, 'こない');
eq('来る masu', form('来る', 'くる', 'vk', 'masu'), '来ます');
eq('する masu', form('する', 'する', 'vs-i', 'masu'), 'します');
eq('勉強する te', form('勉強する', 'べんきょうする', 'vs-i', 'te'), '勉強して');
eq('愛する nai', form('愛する', 'あいする', 'vs-i', 'nai'), '愛さない');
eq('感ずる masu', form('感ずる', 'かんずる', 'vs-i', 'masu'), '感じます');
eq('いい neg', form('いい', 'いい', 'adj-ix', 'neg'), 'よくない');
eq('高い past', form('高い', 'たかい', 'adj-i', 'past'), '高かった');
eq('静か polite', form('静か', 'しずか', 'adj-na', 'desu'), '静かです');
eq('いらっしゃる masu', form('いらっしゃる', 'いらっしゃる', 'v5aru', 'masu'), 'いらっしゃいます');

// ── numbers (prices in the shop)
eq('120', numberKana(120), 'ひゃくにじゅう');
eq('300', numberKana(300), 'さんびゃく');
eq('600', numberKana(600), 'ろっぴゃく');
eq('850', numberKana(850), 'はっぴゃくごじゅう');
eq('1500', numberKana(1500), 'せんごひゃく');
eq('2500', numberKana(2500), 'にせんごひゃく');
eq('3000', numberKana(3000), 'さんぜん');
eq('8000', numberKana(8000), 'はっせん');
eq('12000', numberKana(12000), 'いちまんにせん');
eq('kanji 350', numberKanji(350), '三百五十');
eq('kanji 1500', numberKanji(1500), '千五百');
ok('distractors differ and are positive', priceDistractors(350).every((x) => x > 0 && x !== 350) && priceDistractors(350).length === 3);

// ── spaced repetition
{
  let now = 1_000_000;
  const it = newItem(now);
  eq('new item stage', it.s, 1);
  answer(it, true, now);
  eq('second correct in same session reaches 2', it.s, 2);
  now = it.d + 1;
  const r = answer(it, true, now);
  eq('due answer reaches learned stage', it.s, LEARNED_STAGE);
  ok('new leaf flagged once', r.newLeaf && !!it.L);
  answer(it, false, now + 10);
  ok('wrong answer drops a stage but keeps the leaf', it.s === LEARNED_STAGE - 1 && !!it.L);
  const back = unpackItem(packItem(it));
  eq('pack/unpack', [back.s, back.c, back.w, back.L], [it.s, it.c, it.w, it.L]);
  ok('intervals grow', INTERVALS.every((v, i) => i === 0 || v > INTERVALS[i - 1]));
}

// ── saves
{
  const s = newSave(1);
  s.name = 'Teste';
  s.srs['w:abc'] = [3, 100, 2, 0, 1, 50];
  const v = validate(JSON.parse(JSON.stringify(s)));
  ok('save validates', !!v && v.name === 'Teste' && v.srs['w:abc'][0] === 3);
  ok('broken save rejected', validate({ foo: 1 }) === null);
}

// ── data integrity
{
  const wj = JSON.parse(readFileSync('src/data/words.json', 'utf8')) as { fields: string[]; themes: string[]; rows: (string | number)[][] };
  const ids = new Set(wj.rows.map((r) => r[0]));
  eq('word ids unique', ids.size, wj.rows.length);
  ok('has thousands of words', wj.rows.length >= 3000);
  const kanaOnly = /^[ぁ-ゖァ-ヺーゝゞヽヾ]+$/u;
  const badReading = wj.rows.filter((r) => !kanaOnly.test(String(r[2])));
  eq('every reading is kana', badReading.slice(0, 5).map((r) => r[1]), []);
  const missingTheme = wj.themes.filter((t) => !THEME_NAMES[t]);
  eq('every theme has a name', missingTheme, []);
  for (const reg of REGIONS) for (const t of reg.themes) ok(`region ${reg.id} theme ${t} exists`, !!THEME_NAMES[t]);
  const kj = JSON.parse(readFileSync('src/data/kanji.json', 'utf8')) as { rows: unknown[][] };
  eq('2136 jōyō kanji', kj.rows.length, 2136);
  const strokes = JSON.parse(readFileSync('src/data/strokes.json', 'utf8')) as Record<string, string[]>;
  ok('strokes for kana and kanji', !!strokes['あ'] && !!strokes['日'] && Object.keys(strokes).length > 2000);
  const jsonConvos = readdirSync('src/data/convos').filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync('src/data/convos/' + f, 'utf8')) as typeof CONVOS[number]);
  for (const c of [...CONVOS, ...jsonConvos]) {
    ok(`convo ${c.id} has steps`, c.steps.length >= 3);
    for (const st of c.steps) if (st.you) {
      ok(`convo ${c.id} has exactly one right answer per step`, st.you.filter((o) => o.ok).length === 1);
      ok(`convo ${c.id} wrong options explain why`, st.you.every((o) => o.ok || !!o.why));
    }
  }
  ok('regions ordered by requirement', REGIONS.every((r, i) => i === 0 || r.req >= REGIONS[i - 1].req));

  // the whole journey can be finished with words alone: at every unlock step there are enough words to reach the next
  const words = wj.rows.map((r) => ({ n: Number(r[4]), t: String(r[5]) }));
  const floorAt = (L: number) => [4, 3, 2, 1].reduce((f, lv) => (L >= LEVEL_UNLOCK[lv] ? lv : f), 5);
  const avail = (L: number) => {
    const th = new Set(REGIONS.filter((r) => r.req <= L).flatMap((r) => r.themes));
    return words.filter((w) => th.has(w.t) && w.n >= floorAt(L)).length;
  };
  const steps = [...new Set([0, ...REGIONS.map((r) => r.req), ...Object.values(LEVEL_UNLOCK), 10000])].sort((a, b) => a - b);
  for (let i = 0; i < steps.length - 1; i++) ok(`from ${steps[i]} leaves you can reach ${steps[i + 1]}`, avail(steps[i]) >= steps[i + 1]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
