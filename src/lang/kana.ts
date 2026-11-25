/**
 * Kana tables, romaji (modified Hepburn with doubled long vowels: "ookii", "koohii"), romaji→kana input
 * conversion (a tiny IME used for typed answers) and a Latin-name→katakana helper.
 */

export interface KanaCell {
  h: string; // hiragana
  k: string; // katakana
  ro: string; // romaji
}

/** The gojūon chart, row by row (null = empty cell). */
export const GOJUON: (string | null)[][] = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', null, 'ゆ', null, 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', null, null, null, 'を'],
  ['ん', null, null, null, null],
];
export const DAKUTEN: (string | null)[][] = [
  ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
  ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  ['だ', 'ぢ', 'づ', 'で', 'ど'],
  ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
  ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
];
export const YOON: string[][] = [
  ['きゃ', 'きゅ', 'きょ'],
  ['しゃ', 'しゅ', 'しょ'],
  ['ちゃ', 'ちゅ', 'ちょ'],
  ['にゃ', 'にゅ', 'にょ'],
  ['ひゃ', 'ひゅ', 'ひょ'],
  ['みゃ', 'みゅ', 'みょ'],
  ['りゃ', 'りゅ', 'りょ'],
  ['ぎゃ', 'ぎゅ', 'ぎょ'],
  ['じゃ', 'じゅ', 'じょ'],
  ['びゃ', 'びゅ', 'びょ'],
  ['ぴゃ', 'ぴゅ', 'ぴょ'],
];

const BASE: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゎ: 'wa', ゔ: 'vu',
};
// extended katakana combinations (written in hiragana after conversion)
const COMBO: Record<string, string> = {
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo', ゔゅ: 'vyu',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', ふゅ: 'fyu',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du', でゅ: 'dyu', てゅ: 'tyu',
  しぇ: 'she', じぇ: 'je', ちぇ: 'che', つぁ: 'tsa', つぃ: 'tsi', つぇ: 'tse', つぉ: 'tso',
  いぇ: 'ye', くぁ: 'kwa', ぐぁ: 'gwa',
};

export const isHiragana = (c: string) => c >= 'ぁ' && c <= 'ゟ';
export const isKatakana = (c: string) => (c >= '゠' && c <= 'ヿ') || c === 'ー';
export const isKana = (c: string) => isHiragana(c) || isKatakana(c);
export const isKanji = (c: string) => (c >= '一' && c <= '鿿') || (c >= '㐀' && c <= '䶿') || c === '々' || c === '〆';
export const hasKanji = (s: string) => [...s].some(isKanji);
export const allKana = (s: string) => [...s].every((c) => isKana(c));

export function toHiragana(s: string): string {
  let o = '';
  for (const c of s) {
    const code = c.charCodeAt(0);
    o += code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : c;
  }
  return o;
}
export function toKatakana(s: string): string {
  let o = '';
  for (const c of s) {
    const code = c.charCodeAt(0);
    o += code >= 0x3041 && code <= 0x3096 ? String.fromCharCode(code + 0x60) : c;
  }
  return o;
}

const VOWEL_OF = (ro: string) => {
  const m = ro.match(/[aeiou]$/);
  return m ? m[0] : '';
};

/** Kana → romaji. Spaced sentences ("わたし は がくせい です。") read standalone は/へ/を as wa/e/o. */
export function toRomaji(input: string): string {
  if (input.includes(' ')) {
    return input
      .split(/(\s+)/)
      .map((tok) => {
        if (/^\s+$/.test(tok)) return ' ';
        const bare = tok.replace(/[、。！？!?「」『』…]/g, '');
        const punct = tok.slice(bare.length);
        if (bare === 'は') return 'wa' + punctToLatin(punct);
        if (bare === 'へ') return 'e' + punctToLatin(punct);
        if (bare === 'を') return 'o' + punctToLatin(punct);
        return wordRomaji(tok);
      })
      .join('');
  }
  return wordRomaji(input);
}

function punctToLatin(p: string): string {
  return p.replace(/、/g, ',').replace(/。/g, '.').replace(/！/g, '!').replace(/？/g, '?').replace(/[「」『』]/g, '"').replace(/…/g, '...');
}

function wordRomaji(input: string): string {
  const s = toHiragana(input);
  let out = '';
  let gem = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const two = s.slice(i, i + 2);
    let ro: string | undefined;
    let adv = 1;
    if (COMBO[two]) {
      ro = COMBO[two];
      adv = 2;
    } else if (i + 1 < s.length && 'ゃゅょ'.includes(s[i + 1]) && BASE[c]) {
      const base = BASE[c];
      const y = s[i + 1] === 'ゃ' ? 'a' : s[i + 1] === 'ゅ' ? 'u' : 'o';
      ro = /^(sh|ch|j)/.test(base) ? base.replace(/i$/, '') + y : base.replace(/i$/, '') + 'y' + y;
      adv = 2;
    } else if (c === 'っ') {
      gem = true;
      continue;
    } else if (c === 'ー') {
      out += VOWEL_OF(out) || '-';
      continue;
    } else if (BASE[c] !== undefined) {
      ro = BASE[c];
    }
    if (ro === undefined) {
      out += punctToLatin(c);
      gem = false;
      continue;
    }
    if (gem) {
      out += ro.startsWith('ch') ? 't' : ro[0];
      gem = false;
    }
    // ん before a vowel or y needs an apostrophe (kon'ya)
    if (out.endsWith('n') && s[i - 1] === 'ん' && /^[aeiouy]/.test(ro)) out += "'";
    out += ro;
    i += adv - 1;
  }
  if (gem) out += "'";
  return out;
}

// ───────────────────────── romaji → kana (typing answers) ─────────────────────────

const R2K: Record<string, string> = {};
(() => {
  const add = (ro: string, k: string) => {
    if (!(ro in R2K)) R2K[ro] = k;
  };
  for (const [k, ro] of Object.entries(BASE)) if (!'ぁぃぅぇぉゎゐゑ'.includes(k)) add(ro, k);
  for (const [k, ro] of Object.entries(COMBO)) add(ro, k);
  for (const row of YOON) for (const k of row) add(wordRomaji(k), k);
  const alt: [string, string][] = [
    ['si', 'し'], ['ti', 'ち'], ['tu', 'つ'], ['hu', 'ふ'], ['zi', 'じ'], ['di', 'ぢ'], ['du', 'づ'],
    ['sya', 'しゃ'], ['syu', 'しゅ'], ['syo', 'しょ'], ['tya', 'ちゃ'], ['tyu', 'ちゅ'], ['tyo', 'ちょ'], ['cya', 'ちゃ'], ['cyu', 'ちゅ'], ['cyo', 'ちょ'],
    ['zya', 'じゃ'], ['zyu', 'じゅ'], ['zyo', 'じょ'], ['jya', 'じゃ'], ['jyu', 'じゅ'], ['jyo', 'じょ'],
    ['wo', 'を'], ['nn', 'ん'], ["n'", 'ん'], ['xn', 'ん'],
    ['xa', 'ぁ'], ['xi', 'ぃ'], ['xu', 'ぅ'], ['xe', 'ぇ'], ['xo', 'ぉ'], ['la', 'ぁ'], ['li', 'ぃ'], ['lu', 'ぅ'], ['le', 'ぇ'], ['lo', 'ぉ'],
    ['xya', 'ゃ'], ['xyu', 'ゅ'], ['xyo', 'ょ'], ['lya', 'ゃ'], ['lyu', 'ゅ'], ['lyo', 'ょ'], ['xtu', 'っ'], ['ltu', 'っ'], ['xtsu', 'っ'],
    ['ca', 'か'], ['cu', 'く'], ['co', 'こ'], ['qa', 'くぁ'], ['-', 'ー'],
  ];
  for (const [ro, k] of alt) R2K[ro] = k;
})();
const R2K_MAX = 4;

/**
 * Converts typed romaji into kana as the player types. Returns the converted text; a trailing unfinished
 * syllable (like "k" or "sh") is kept in Latin letters. `final` converts a lone trailing "n" into ん.
 */
export function romajiToKana(input: string, katakana = false, final = false): string {
  const s = input.toLowerCase();
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (!/[a-z'\-]/.test(c)) {
      out += c === ' ' ? '' : c;
      i++;
      continue;
    }
    // double consonant → っ
    if (i + 1 < s.length && c === s[i + 1] && /[bcdfghjklmpqrstvwxyz]/.test(c) && c !== 'n') {
      out += 'っ';
      i++;
      continue;
    }
    if (c === 't' && s[i + 1] === 'c' && s[i + 2] === 'h') {
      out += 'っ';
      i++;
      continue;
    }
    // ん: "n" followed by a consonant other than y (or by nothing when final)
    if (c === 'n' && i + 1 < s.length && /[bcdfghjkmpqrstvwxz]/.test(s[i + 1])) {
      out += 'ん';
      i++;
      continue;
    }
    let matched = false;
    for (let len = Math.min(R2K_MAX, s.length - i); len > 0; len--) {
      const chunk = s.slice(i, i + len);
      if (R2K[chunk] !== undefined) {
        if (chunk === 'n' && i + 1 >= s.length && !final) break; // wait: could become na/ni/…
        out += R2K[chunk];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (c === 'n' && final && i === s.length - 1) {
        out += 'ん';
        i++;
        continue;
      }
      out += s.slice(i);
      break;
    }
  }
  return katakana ? toKatakana(out) : out;
}

/** Normalises an answer for comparison: hiragana, no spaces/punctuation/long-vowel ambiguity. */
export function normalizeKana(s: string): string {
  return toHiragana(s)
    .replace(/[\s、。！？!?・,.\-~〜～「」]/g, '')
    .trim();
}

// ───────────────────────── names in katakana ─────────────────────────

/** Rough transliteration of a Latin (Portuguese/English) name into katakana, e.g. "Adam" → アダム. */
export function nameToKatakana(name: string): string {
  let s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (!s) return '';
  // Portuguese-ish spellings → romaji-friendly
  s = s
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ck/g, 'k')
    .replace(/qu([ei])/g, 'k$1')
    .replace(/qu/g, 'ku')
    .replace(/c([ei])/g, 's$1')
    .replace(/ç/g, 's')
    .replace(/c/g, 'k')
    .replace(/lh/g, 'ri')
    .replace(/nh/g, 'ni')
    .replace(/x/g, 'sh')
    .replace(/l/g, 'r')
    .replace(/v/g, 'b')
    .replace(/w/g, 'u')
    .replace(/y/g, 'i')
    .replace(/g([ei])/g, 'j$1')
    .replace(/j([aou])/g, 'j$1')
    .replace(/h/g, '');
  let out = '';
  let i = 0;
  const V = 'aeiou';
  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];
    if (V.includes(c)) {
      out += R2K[c];
      i++;
      continue;
    }
    if (c === 'n' && (!n || !V.includes(n))) {
      out += 'ん';
      i++;
      continue;
    }
    if (c === 'm' && (!n || !V.includes(n))) {
      // final or pre-consonant m → ム (Adam → アダム) unless followed by b/p (ン)
      out += n === 'b' || n === 'p' ? 'ん' : 'む';
      i++;
      continue;
    }
    if (n && V.includes(n)) {
      let syl = c + n;
      if (c === 's' && n === 'i') syl = 'shi';
      if (c === 't' && n === 'i') syl = 'tei';
      if (c === 't' && n === 'u') syl = 'to';
      if (c === 'd' && n === 'i') syl = 'dei';
      if (c === 'd' && n === 'u') syl = 'du';
      if (c === 'f' && n !== 'u') syl = 'f' + n;
      const k = R2K[syl] ?? (syl === 'tei' ? 'てぃ' : syl === 'dei' ? 'でぃ' : undefined);
      if (k) {
        out += k;
        i += 2;
        continue;
      }
    }
    // consonant cluster or final consonant: add the default vowel
    const lone: Record<string, string> = { t: 'と', d: 'ど', s: 'す', k: 'く', g: 'ぐ', b: 'ぶ', p: 'ぷ', r: 'る', f: 'ふ', z: 'ず', j: 'じ', m: 'む', n: 'ん' };
    out += lone[c] ?? '';
    i++;
  }
  // doubled vowels from Portuguese spelling (aa) are fine; long final -e/-o kept short
  return toKatakana(out);
}
