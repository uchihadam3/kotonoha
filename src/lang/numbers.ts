/** Japanese numbers read aloud (kana), with the sound changes learners trip on: さんびゃく, ろっぴゃく, はっぴゃく, さんぜん, はっせん. */
const D = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

export function numberKana(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'ゼロ';
  let s = '';
  const man = Math.floor(n / 10000);
  if (man) {
    s += numberKana(man) + 'まん';
    n %= 10000;
  }
  const th = Math.floor(n / 1000), hu = Math.floor((n % 1000) / 100), te = Math.floor((n % 100) / 10), on = n % 10;
  if (th) s += th === 1 ? 'せん' : th === 3 ? 'さんぜん' : th === 8 ? 'はっせん' : D[th] + 'せん';
  if (hu) s += hu === 1 ? 'ひゃく' : hu === 3 ? 'さんびゃく' : hu === 6 ? 'ろっぴゃく' : hu === 8 ? 'はっぴゃく' : D[hu] + 'ひゃく';
  if (te) s += te === 1 ? 'じゅう' : D[te] + 'じゅう';
  if (on) s += D[on];
  return s;
}

const K = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 350 → 三百五十 */
export function numberKanji(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return '〇';
  let s = '';
  const man = Math.floor(n / 10000);
  if (man) {
    s += numberKanji(man) + '万';
    n %= 10000;
  }
  const part = (d: number, unit: string) => (d ? (d === 1 ? '' : K[d]) + unit : '');
  s += part(Math.floor(n / 1000), '千') + part(Math.floor((n % 1000) / 100), '百') + part(Math.floor((n % 100) / 10), '十') + K[n % 10];
  return s;
}

/** plausible wrong prices for a listening question (close numbers that sound alike) */
export function priceDistractors(p: number, count = 3): number[] {
  const out = new Set<number>();
  const cand = [p + 100, p - 100, p + 50, p - 50, p * 2, Math.round(p / 2 / 10) * 10, p + 1000, p - 1000, p + 200, p - 200, p + 10, p - 10];
  // swap hundreds and tens (350 → 530), a classic listening mix-up
  const h = Math.floor((p % 1000) / 100), t = Math.floor((p % 100) / 10);
  if (h !== t) cand.unshift(p - h * 100 - t * 10 + t * 100 + h * 10);
  for (const c of cand.sort(() => Math.random() - 0.5)) {
    if (c > 0 && c !== p) out.add(c);
    if (out.size >= count) break;
  }
  return [...out];
}
