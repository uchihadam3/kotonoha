/**
 * Automatic conjugation of verbs and adjectives (written form and reading in parallel), used to teach the
 * polite ↔ casual forms: 食べる ↔ 食べます, 高い ↔ 高いです, past, negative, te-form…
 */

export type FormId =
  | 'dict' | 'masu' | 'masen' | 'mashita' | 'masendeshita' | 'te' | 'ta' | 'nai' | 'nakatta'
  | 'vol' | 'mashou' | 'tai' | 'pot' | 'imp' | 'ba'
  | 'desu' | 'neg' | 'past' | 'negpast' | 'adv';

export interface Form {
  id: FormId;
  label: string; // Portuguese label
  reg: 'casual' | 'polido';
  w: string;
  r: string;
}

const GODAN: Record<string, { u: string; i: string; a: string; e: string; o: string; te: string; ta: string }> = {
  v5u: { u: 'う', i: 'い', a: 'わ', e: 'え', o: 'お', te: 'って', ta: 'った' },
  v5k: { u: 'く', i: 'き', a: 'か', e: 'け', o: 'こ', te: 'いて', ta: 'いた' },
  'v5k-s': { u: 'く', i: 'き', a: 'か', e: 'け', o: 'こ', te: 'って', ta: 'った' },
  v5g: { u: 'ぐ', i: 'ぎ', a: 'が', e: 'げ', o: 'ご', te: 'いで', ta: 'いだ' },
  v5s: { u: 'す', i: 'し', a: 'さ', e: 'せ', o: 'そ', te: 'して', ta: 'した' },
  v5t: { u: 'つ', i: 'ち', a: 'た', e: 'て', o: 'と', te: 'って', ta: 'った' },
  v5n: { u: 'ぬ', i: 'に', a: 'な', e: 'ね', o: 'の', te: 'んで', ta: 'んだ' },
  v5b: { u: 'ぶ', i: 'び', a: 'ば', e: 'べ', o: 'ぼ', te: 'んで', ta: 'んだ' },
  v5m: { u: 'む', i: 'み', a: 'ま', e: 'め', o: 'も', te: 'んで', ta: 'んだ' },
  v5r: { u: 'る', i: 'り', a: 'ら', e: 'れ', o: 'ろ', te: 'って', ta: 'った' },
  'v5r-i': { u: 'る', i: 'り', a: 'ら', e: 'れ', o: 'ろ', te: 'って', ta: 'った' },
  v5aru: { u: 'る', i: 'い', a: 'ら', e: 'え', o: 'ろ', te: 'って', ta: 'った' },
};

export const isVerb = (pos: string) => pos.startsWith('v') && pos !== 'vs';
export const isAdj = (pos: string) => pos === 'adj-i' || pos === 'adj-ix' || pos === 'adj-na';
export const conjugatable = (pos: string) => isVerb(pos) || isAdj(pos);

/** Strip `n` characters from both the written form and reading and append the same suffix. */
function swap(w: string, r: string, cut: number, add: string): [string, string] {
  return [w.slice(0, w.length - cut) + add, r.slice(0, r.length - cut) + add];
}

export function conjugate(w: string, r: string, pos: string): Form[] {
  const out: Form[] = [];
  const f = (id: FormId, label: string, reg: 'casual' | 'polido', pair: [string, string]) => out.push({ id, label, reg, w: pair[0], r: pair[1] });

  if (pos === 'v1') {
    f('dict', 'dicionário (casual)', 'casual', [w, r]);
    f('masu', 'polido', 'polido', swap(w, r, 1, 'ます'));
    f('masen', 'polido negativo', 'polido', swap(w, r, 1, 'ません'));
    f('mashita', 'polido passado', 'polido', swap(w, r, 1, 'ました'));
    f('masendeshita', 'polido passado negativo', 'polido', swap(w, r, 1, 'ませんでした'));
    f('te', 'forma て', 'casual', swap(w, r, 1, 'て'));
    f('ta', 'passado (casual)', 'casual', swap(w, r, 1, 'た'));
    f('nai', 'negativo (casual)', 'casual', swap(w, r, 1, 'ない'));
    f('nakatta', 'passado negativo (casual)', 'casual', swap(w, r, 1, 'なかった'));
    f('vol', 'vamos… (casual)', 'casual', swap(w, r, 1, 'よう'));
    f('mashou', 'vamos… (polido)', 'polido', swap(w, r, 1, 'ましょう'));
    f('tai', 'quero…', 'casual', swap(w, r, 1, 'たい'));
    f('pot', 'potencial (consigo)', 'casual', swap(w, r, 1, 'られる'));
    f('ba', 'condicional (se…)', 'casual', swap(w, r, 1, 'れば'));
    return out;
  }
  if (pos === 'vk') {
    // 来る / くる (also compound …て来る written with kanji)
    const kw = w.endsWith('来る') ? w.slice(0, -2) : w.slice(0, -2);
    const kr = r.slice(0, -2);
    const k = (wk: string, rk: string): [string, string] => (w.endsWith('来る') ? [kw + '来' + wk, kr + rk] : [kw + rk, kr + rk]);
    f('dict', 'dicionário (casual)', 'casual', [w, r]);
    f('masu', 'polido', 'polido', k('ます', 'きます'));
    f('masen', 'polido negativo', 'polido', k('ません', 'きません'));
    f('mashita', 'polido passado', 'polido', k('ました', 'きました'));
    f('masendeshita', 'polido passado negativo', 'polido', k('ませんでした', 'きませんでした'));
    f('te', 'forma て', 'casual', k('て', 'きて'));
    f('ta', 'passado (casual)', 'casual', k('た', 'きた'));
    f('nai', 'negativo (casual)', 'casual', k('ない', 'こない'));
    f('nakatta', 'passado negativo (casual)', 'casual', k('なかった', 'こなかった'));
    f('vol', 'vamos… (casual)', 'casual', k('よう', 'こよう'));
    f('mashou', 'vamos… (polido)', 'polido', k('ましょう', 'きましょう'));
    f('tai', 'quero…', 'casual', k('たい', 'きたい'));
    f('pot', 'potencial (consigo)', 'casual', k('られる', 'こられる'));
    f('ba', 'condicional (se…)', 'casual', k('れば', 'くれば'));
    return out;
  }
  // ずる verbs (感ずる, 応ずる…) conjugate like ichidan じる
  if (pos === 'vs-i' && w.endsWith('ずる')) return conjugate(w.slice(0, -2) + 'じる', r.slice(0, -2) + 'じる', 'v1').map((f) => (f.id === 'dict' ? { ...f, w, r } : f));
  // one-kanji する verbs (愛する, 訳する, 罰する…) take さ/せ in some forms
  const sSpecial = pos === 'vs-i' && ['愛する', '訳する', '略する', '察する'].includes(w);
  if (pos === 'vs-i') {
    // する or 〜する (勉強する)
    const sw = (add: string, addR = add): [string, string] => [w.slice(0, -2) + add, r.slice(0, -2) + addR];
    f('dict', 'dicionário (casual)', 'casual', [w, r]);
    f('masu', 'polido', 'polido', sw('します'));
    f('masen', 'polido negativo', 'polido', sw('しません'));
    f('mashita', 'polido passado', 'polido', sw('しました'));
    f('masendeshita', 'polido passado negativo', 'polido', sw('しませんでした'));
    f('te', 'forma て', 'casual', sw('して'));
    f('ta', 'passado (casual)', 'casual', sw('した'));
    f('nai', 'negativo (casual)', 'casual', sw(sSpecial ? 'さない' : 'しない'));
    f('nakatta', 'passado negativo (casual)', 'casual', sw(sSpecial ? 'さなかった' : 'しなかった'));
    f('vol', 'vamos… (casual)', 'casual', sw('しよう'));
    f('mashou', 'vamos… (polido)', 'polido', sw('しましょう'));
    f('tai', 'quero…', 'casual', sw('したい'));
    f('pot', 'potencial (consigo)', 'casual', sw(sSpecial ? 'せる' : 'できる'));
    f('ba', 'condicional (se…)', 'casual', sw('すれば'));
    return out;
  }
  const g = GODAN[pos];
  if (g) {
    const stem = (end: string) => swap(w, r, 1, end);
    f('dict', 'dicionário (casual)', 'casual', [w, r]);
    f('masu', 'polido', 'polido', stem(g.i + 'ます'));
    f('masen', 'polido negativo', 'polido', stem(g.i + 'ません'));
    f('mashita', 'polido passado', 'polido', stem(g.i + 'ました'));
    f('masendeshita', 'polido passado negativo', 'polido', stem(g.i + 'ませんでした'));
    f('te', 'forma て', 'casual', stem(g.te.length === 2 && g.te[0] !== 'い' && g.te[0] !== 'ん' ? g.te : g.te));
    // te/ta replace the final kana entirely (書く → 書いて)
    out[out.length - 1].w = w.slice(0, -1) + g.te;
    out[out.length - 1].r = r.slice(0, -1) + g.te;
    f('ta', 'passado (casual)', 'casual', [w.slice(0, -1) + g.ta, r.slice(0, -1) + g.ta]);
    if (pos === 'v5r-i') {
      // ある → ない
      f('nai', 'negativo (casual)', 'casual', [w.slice(0, -2) + 'ない', r.slice(0, -2) + 'ない']);
      f('nakatta', 'passado negativo (casual)', 'casual', [w.slice(0, -2) + 'なかった', r.slice(0, -2) + 'なかった']);
    } else {
      f('nai', 'negativo (casual)', 'casual', stem(g.a + 'ない'));
      f('nakatta', 'passado negativo (casual)', 'casual', stem(g.a + 'なかった'));
    }
    f('vol', 'vamos… (casual)', 'casual', stem(g.o + 'う'));
    f('mashou', 'vamos… (polido)', 'polido', stem(g.i + 'ましょう'));
    f('tai', 'quero…', 'casual', stem(g.i + 'たい'));
    if (pos !== 'v5aru' && pos !== 'v5r-i') f('pot', 'potencial (consigo)', 'casual', stem(g.e + 'る'));
    f('ba', 'condicional (se…)', 'casual', stem(g.e + 'ば'));
    if (pos === 'v5aru') f('imp', 'imperativo/pedido', 'polido', stem('い'));
    return out;
  }
  if (pos === 'adj-i' || pos === 'adj-ix') {
    // いい/よい conjugate from よ-
    const ii = pos === 'adj-ix';
    const base = (add: string): [string, string] => {
      if (ii) {
        const wStem = w.endsWith('いい') ? w.slice(0, -2) + 'よ' : w.slice(0, -1);
        const rStem = r.endsWith('いい') ? r.slice(0, -2) + 'よ' : r.slice(0, -1);
        return [wStem + add, rStem + add];
      }
      return swap(w, r, 1, add);
    };
    f('dict', 'casual', 'casual', [w, r]);
    f('desu', 'polido', 'polido', [w + 'です', r + 'です']);
    f('neg', 'negativo (casual)', 'casual', base('くない'));
    f('negpast', 'passado negativo (casual)', 'casual', base('くなかった'));
    f('past', 'passado (casual)', 'casual', base('かった'));
    const p = base('かった');
    f('mashita', 'passado (polido)', 'polido', [p[0] + 'です', p[1] + 'です']);
    const n = base('くない');
    f('masen', 'negativo (polido)', 'polido', [n[0] + 'です', n[1] + 'です']);
    f('te', 'forma て', 'casual', base('くて'));
    f('adv', 'advérbio', 'casual', base('く'));
    return out;
  }
  if (pos === 'adj-na') {
    f('dict', 'casual (+だ)', 'casual', [w + 'だ', r + 'だ']);
    f('desu', 'polido', 'polido', [w + 'です', r + 'です']);
    f('neg', 'negativo (casual)', 'casual', [w + 'じゃない', r + 'じゃない']);
    f('masen', 'negativo (polido)', 'polido', [w + 'じゃないです', r + 'じゃないです']);
    f('past', 'passado (casual)', 'casual', [w + 'だった', r + 'だった']);
    f('mashita', 'passado (polido)', 'polido', [w + 'でした', r + 'でした']);
    f('te', 'forma て', 'casual', [w + 'で', r + 'で']);
    f('adv', 'advérbio', 'casual', [w + 'に', r + 'に']);
    return out;
  }
  return out;
}

export function politeForm(w: string, r: string, pos: string): { w: string; r: string } | null {
  const fs = conjugate(w, r, pos);
  const p = fs.find((x) => x.id === 'masu' || x.id === 'desu');
  return p ? { w: p.w, r: p.r } : null;
}
