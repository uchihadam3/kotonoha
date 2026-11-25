/** "Domínio Total" (完全制覇): how much of the whole game the player has mastered. */
import type { Game } from './game';
import { vocab } from '../lang/vocab';
import { KANA } from '../lang/kanadata';
import { CONVOS } from '../data/convos';
import { REGIONS } from '../data/regions';

export interface Completion {
  words: number;
  wordsMax: number;
  kanji: number;
  kanjiMax: number;
  kana: number;
  kanaMax: number;
  convos: number;
  convosMax: number;
  seals: number;
  sealsMax: number;
  /** 0…1, weighted */
  pct: number;
}

export function completion(g: Game): Completion {
  const c = g.learner.counts();
  const convos = CONVOS.filter((cv) => g.save.flags['convo:' + cv.id]).length;
  const r = {
    words: c.words,
    wordsMax: 10000,
    kanji: c.kanji,
    kanjiMax: vocab.kanji.length,
    kana: c.kana,
    kanaMax: KANA.length,
    convos,
    convosMax: CONVOS.length,
    seals: g.save.bosses.length,
    sealsMax: REGIONS.length - 1,
  };
  const part = (a: number, b: number) => (b ? Math.min(1, a / b) : 1);
  // words and kanji weigh the most; conversations, seals and kana complete the picture
  const pct = part(r.words, r.wordsMax) * 0.45 + part(r.kanji, r.kanjiMax) * 0.3 + part(r.convos, r.convosMax) * 0.12 + part(r.seals, r.sealsMax) * 0.08 + part(r.kana, r.kanaMax) * 0.05;
  return { ...r, pct: Math.min(1, pct) };
}
