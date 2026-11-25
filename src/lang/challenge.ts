/**
 * Question generator for lessons, reviews and battles: meaning, reverse, listening, reading, typing,
 * cloze (fill the sentence), conjugation (polite ↔ casual) and kana/kanji questions, with smart distractors.
 */
import { vocab, type Word, type Kanji } from './vocab';
import { hasKanji, toHiragana, normalizeKana } from './kana';
import { conjugate, conjugatable } from './conjugate';
import { shuffle } from '../core/util';

export type QType = 'meaning' | 'reverse' | 'listen' | 'reading' | 'type' | 'cloze' | 'conj' | 'kana' | 'kanaRev' | 'kanji' | 'kanjiRead' | 'speak';

export interface Option {
  label: string;
  sub?: string;
  jp?: boolean;
  correct: boolean;
}

export interface Question {
  type: QType;
  key: string;
  /** main prompt */
  prompt: string;
  promptJp?: boolean;
  /** furigana / small reading above the prompt */
  reading?: string;
  /** helper line (romaji, hint) */
  hint?: string;
  /** instruction text */
  ask: string;
  /** what the voice says (kana preferred) */
  say?: string;
  options?: Option[];
  /** typed answer target (kana) */
  answer?: string;
  /** alternatives accepted for typing */
  accept?: string[];
  word?: Word;
  kanji?: Kanji;
}

function distractWords(w: Word, n: number, by: (x: Word) => string, pool?: Word[]): Word[] {
  const theme = pool ?? vocab.byTheme.get(w.t) ?? vocab.words;
  const target = by(w);
  const seen = new Set([target]);
  const out: Word[] = [];
  const cands = shuffle(theme.filter((x) => x.id !== w.id && Math.abs(x.n - w.n) <= 1));
  for (const c of cands) {
    const v = by(c);
    if (!v || seen.has(v)) continue;
    // avoid near-synonyms in Portuguese
    if (c.pt.split(';')[0].trim() === w.pt.split(';')[0].trim()) continue;
    seen.add(v);
    out.push(c);
    if (out.length >= n) break;
  }
  if (out.length < n) {
    for (const c of shuffle(vocab.words.slice(0, 3000))) {
      const v = by(c);
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(c);
      if (out.length >= n) break;
    }
  }
  return out;
}

const firstPt = (w: Word) => w.pt.split(';').slice(0, 2).join('; ');

export function wordQuestion(w: Word, type: QType): Question {
  const key = 'w:' + w.id;
  const display = w.w.replace(/^～/, '〜');
  switch (type) {
    case 'meaning': {
      const opts = [w, ...distractWords(w, 3, firstPt)].map((x) => ({ label: firstPt(x), correct: x.id === w.id }));
      return { type, key, prompt: display, promptJp: true, reading: hasKanji(w.w) ? w.r : undefined, ask: 'O que significa?', say: w.r, options: shuffle(opts), word: w };
    }
    case 'reverse': {
      const opts = [w, ...distractWords(w, 3, (x) => x.w)].map((x) => ({ label: x.w.replace(/^～/, '〜'), sub: hasKanji(x.w) ? x.r : undefined, jp: true, correct: x.id === w.id }));
      return { type, key, prompt: firstPt(w), ask: 'Como se diz em japonês?', options: shuffle(opts), word: w };
    }
    case 'listen': {
      const opts = [w, ...distractWords(w, 3, firstPt)].map((x) => ({ label: firstPt(x), correct: x.id === w.id }));
      return { type, key, prompt: '🔊', ask: 'Ouça e escolha o significado', say: w.r, options: shuffle(opts), word: w };
    }
    case 'reading': {
      const opts = [w, ...distractWords(w, 3, (x) => toHiragana(x.r), vocab.words.filter((x) => hasKanji(x.w) && x.r.length >= w.r.length - 1 && x.r.length <= w.r.length + 1).slice(0, 4000))].map((x) => ({
        label: toHiragana(x.r), jp: true, correct: x.id === w.id,
      }));
      return { type, key, prompt: display, promptJp: true, hint: firstPt(w), ask: 'Qual é a leitura?', options: shuffle(opts), word: w };
    }
    case 'type': {
      return { type, key, prompt: firstPt(w), ask: 'Escreva em japonês (digite em romaji)', answer: normalizeKana(w.r), accept: [normalizeKana(w.w)], word: w, say: w.r };
    }
    case 'speak': {
      return { type, key, prompt: display, promptJp: true, reading: w.r, hint: firstPt(w), ask: 'Fale a palavra em voz alta', answer: w.r, say: w.r, word: w };
    }
    case 'cloze': {
      if (!w.exjp) return wordQuestion(w, 'meaning');
      const core = w.w.replace(/^～/, '');
      let target = core;
      if (!w.exjp.includes(core)) {
        // conjugated: blank the stem
        const stem = core.slice(0, Math.max(1, core.length - 1));
        if (!w.exjp.includes(stem)) return wordQuestion(w, 'meaning');
        target = stem;
      }
      const blanked = w.exjp.replace(target, '＿＿');
      const opts = [w, ...distractWords(w, 3, (x) => x.w)].map((x) => ({ label: target === core ? x.w.replace(/^～/, '') : x.w.replace(/^～/, '').slice(0, Math.max(1, x.w.length - 1)), sub: hasKanji(x.w) ? x.r : undefined, jp: true, correct: x.id === w.id }));
      return { type, key, prompt: blanked, promptJp: true, hint: w.expt, ask: 'Complete a frase', say: undefined, options: shuffle(opts), word: w };
    }
    case 'conj': {
      if (!conjugatable(w.pos)) return wordQuestion(w, 'meaning');
      const forms = conjugate(w.w, w.r, w.pos);
      const polite = forms.find((f) => f.id === 'masu' || f.id === 'desu');
      if (!polite) return wordQuestion(w, 'meaning');
      const wrong = shuffle(forms.filter((f) => f.w !== polite.w && f.id !== 'dict')).slice(0, 3);
      const opts = [polite, ...wrong].map((f) => ({ label: f.w, sub: f.label, jp: true, correct: f === polite }));
      return { type, key, prompt: w.w, promptJp: true, reading: w.r, hint: firstPt(w), ask: 'Qual é a forma POLIDA (です/ます)?', options: shuffle(opts), word: w, say: w.r };
    }
    default:
      return wordQuestion(w, 'meaning');
  }
}

/** picks a question type appropriate to how well the word is known */
export function pickType(w: Word, stage: number, allowTyping = true): QType {
  const r = Math.random();
  const kanji = hasKanji(w.w);
  if (stage <= 1) return r < 0.6 ? 'meaning' : 'listen';
  if (stage === 2) return r < 0.35 ? 'reverse' : r < 0.6 ? 'listen' : r < 0.8 && kanji ? 'reading' : 'meaning';
  if (stage <= 4) {
    if (r < 0.2 && w.exjp) return 'cloze';
    if (r < 0.35 && conjugatable(w.pos)) return 'conj';
    if (r < 0.5 && kanji) return 'reading';
    if (r < 0.7) return 'reverse';
    if (r < 0.85 && allowTyping) return 'type';
    return 'listen';
  }
  if (r < 0.3 && allowTyping) return 'type';
  if (r < 0.5 && w.exjp) return 'cloze';
  if (r < 0.65 && kanji) return 'reading';
  if (r < 0.8) return 'listen';
  return 'reverse';
}

// ───────────────────────── kana & kanji ─────────────────────────

export function kanaQuestion(ch: string, all: { ch: string; ro: string }[], reverse = false): Question {
  const me = all.find((x) => x.ch === ch)!;
  const pool = shuffle(all.filter((x) => x.ch !== ch && x.ro !== me.ro)).slice(0, 3);
  if (!reverse) {
    const opts = [me, ...pool].map((x) => ({ label: x.ro, correct: x.ch === ch }));
    return { type: 'kana', key: 'k:' + ch, prompt: ch, promptJp: true, ask: 'Que som é este?', say: ch, options: shuffle(opts) };
  }
  const opts = [me, ...pool].map((x) => ({ label: x.ch, jp: true, correct: x.ch === ch }));
  return { type: 'kanaRev', key: 'k:' + ch, prompt: me.ro, ask: 'Qual kana tem este som?', say: ch, options: shuffle(opts) };
}

export function kanjiQuestion(k: Kanji, reading = false): Question {
  const pool = shuffle(vocab.kanji.filter((x) => x.k !== k.k && Math.abs(x.jlpt - k.jlpt) <= 1)).slice(0, 3);
  if (!reading) {
    const opts = [k, ...pool].map((x) => ({ label: x.pt.split(';').slice(0, 2).join('; '), correct: x.k === k.k }));
    return { type: 'kanji', key: 'K:' + k.k, prompt: k.k, promptJp: true, ask: 'O que significa este kanji?', options: shuffle(opts), kanji: k };
  }
  const rd = (x: Kanji) => (x.kun.split('、')[0] || x.on.split('、')[0] || '').replace(/[.\-]/g, '');
  const opts = [k, ...pool].filter((x) => rd(x)).map((x) => ({ label: toHiragana(rd(x)), jp: true, correct: x.k === k.k }));
  return { type: 'kanjiRead', key: 'K:' + k.k, prompt: k.k, promptJp: true, ask: 'Qual destas é uma leitura deste kanji?', options: shuffle(opts), kanji: k };
}

export function checkTyped(q: Question, typed: string): boolean {
  const t = normalizeKana(typed);
  if (!t) return false;
  if (t === q.answer) return true;
  return (q.accept ?? []).some((a) => a && t === a);
}
