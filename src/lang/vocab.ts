/** Vocabulary, kanji and stroke data access (from the generated JSON in src/data). */
import wordsJson from '../data/words.json';
import kanjiJson from '../data/kanji.json';
import { toRomaji, isKanji } from './kana';

export interface Word {
  id: string;
  w: string;
  r: string;
  pt: string;
  n: number;
  t: string;
  pos: string;
  reg: string;
  note: string;
  exjp: string;
  exr: string;
  expt: string;
  ro: string;
  /** index in the master list */
  idx: number;
}

export interface Kanji {
  k: string;
  strokes: number;
  grade: number;
  jlpt: number;
  freq: number;
  on: string;
  kun: string;
  pt: string;
  idx: number;
}

type WordsJson = { fields: string[]; themes: string[]; rows: (string | number)[][] };
type KanjiJson = { fields: string[]; rows: (string | number)[][] };

class VocabDB {
  readonly words: Word[];
  readonly byId = new Map<string, Word>();
  readonly byW = new Map<string, Word[]>();
  readonly byTheme = new Map<string, Word[]>();
  readonly themes: string[];
  readonly kanji: Kanji[];
  readonly kanjiByChar = new Map<string, Kanji>();
  /** words that contain each kanji (for kanji cards) */
  private kanjiWords = new Map<string, Word[]>();

  constructor() {
    const wj = wordsJson as unknown as WordsJson;
    this.themes = wj.themes;
    this.words = wj.rows.map((r, idx) => ({
      id: String(r[0]), w: String(r[1]), r: String(r[2]), pt: String(r[3]), n: Number(r[4]), t: String(r[5]), pos: String(r[6]), reg: String(r[7]),
      note: String(r[8]), exjp: String(r[9]), exr: String(r[10]), expt: String(r[11]), ro: String(r[12]), idx,
    }));
    for (const w of this.words) {
      this.byId.set(w.id, w);
      const key = w.w.replace(/^～/, '');
      if (!this.byW.has(key)) this.byW.set(key, []);
      this.byW.get(key)!.push(w);
      if (!this.byTheme.has(w.t)) this.byTheme.set(w.t, []);
      this.byTheme.get(w.t)!.push(w);
    }
    const kj = kanjiJson as unknown as KanjiJson;
    this.kanji = kj.rows.map((r, idx) => ({ k: String(r[0]), strokes: Number(r[1]), grade: Number(r[2]), jlpt: Number(r[3]), freq: Number(r[4]), on: String(r[5]), kun: String(r[6]), pt: String(r[7]), idx }));
    for (const k of this.kanji) this.kanjiByChar.set(k.k, k);
  }

  find(w: string): Word | undefined {
    return this.byW.get(w)?.[0];
  }

  romaji(w: Word): string {
    return w.ro || toRomaji(w.r);
  }

  wordsWithKanji(ch: string): Word[] {
    if (!this.kanjiWords.has(ch)) {
      const list = this.words.filter((w) => w.w.includes(ch)).sort((a, b) => b.n - a.n || a.w.length - b.w.length).slice(0, 8);
      this.kanjiWords.set(ch, list);
    }
    return this.kanjiWords.get(ch)!;
  }

  kanjiIn(w: string): Kanji[] {
    return [...w].filter(isKanji).map((c) => this.kanjiByChar.get(c)).filter((k): k is Kanji => !!k);
  }
}

export const vocab = new VocabDB();

let strokesCache: Record<string, string[]> | null = null;
/** stroke paths (KanjiVG, 109×109 viewBox) — loaded lazily */
export async function strokesFor(ch: string): Promise<string[] | null> {
  if (!strokesCache) strokesCache = (await import('../data/strokes.json')).default as unknown as Record<string, string[]>;
  return strokesCache[ch] ?? null;
}
