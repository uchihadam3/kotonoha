/**
 * The learner's memory: every word ("w:id"), kanji ("K:日") and kana ("k:あ") has a spaced-repetition
 * item. Counts learned leaves, picks new words for lessons and due items for reviews.
 */
import type { SaveData } from '../core/save';
import { answer, isDue, newItem, packItem, unpackItem, urgency, LEARNED_STAGE, MEMORIZED_STAGE, MASTERED_STAGE, type SrsItem } from '../lang/srs';
import { vocab, type Word } from '../lang/vocab';
import { LEVEL_UNLOCK, REGIONS } from '../data/regions';

export interface Counts {
  words: number;
  kanji: number;
  kana: number;
  memorized: number;
  mastered: number;
  due: number;
  seeds: number;
}

export class Learner {
  items = new Map<string, SrsItem>();
  private dirty = true;
  private cached: Counts = { words: 0, kanji: 0, kana: 0, memorized: 0, mastered: 0, due: 0, seeds: 0 };
  onLeaf: ((key: string) => void) | null = null;

  constructor(readonly save: SaveData) {
    for (const [k, v] of Object.entries(save.srs)) this.items.set(k, unpackItem(v));
  }

  persist() {
    const out: Record<string, number[]> = {};
    for (const [k, v] of this.items) out[k] = packItem(v);
    this.save.srs = out;
  }

  get(key: string) {
    return this.items.get(key);
  }

  introduce(key: string, now = Date.now()): SrsItem {
    let it = this.items.get(key);
    if (!it) {
      it = newItem(now);
      this.items.set(key, it);
      this.dirty = true;
    }
    return it;
  }

  /** records an answer; returns whether a new leaf was born */
  answer(key: string, correct: boolean, now = Date.now()) {
    const it = this.introduce(key, now);
    const r = answer(it, correct, now);
    this.dirty = true;
    if (correct) this.save.stats.correct++;
    else this.save.stats.wrong++;
    if (r.newLeaf) this.onLeaf?.(key);
    return r;
  }

  counts(now = Date.now()): Counts {
    if (!this.dirty && now - this.lastCount < 15000) return this.cached;
    const c: Counts = { words: 0, kanji: 0, kana: 0, memorized: 0, mastered: 0, due: 0, seeds: 0 };
    for (const [k, it] of this.items) {
      const isWord = k.startsWith('w:');
      if (it.L) {
        if (isWord) c.words++;
        else if (k.startsWith('K:')) c.kanji++;
        else c.kana++;
        if (isWord && it.s >= MEMORIZED_STAGE) c.memorized++;
        if (isWord && it.s >= MASTERED_STAGE) c.mastered++;
      } else if (isWord) c.seeds++;
      if (isWord && it.L && isDue(it, now)) c.due++;
    }
    this.cached = c;
    this.dirty = false;
    this.lastCount = now;
    return c;
  }
  private lastCount = 0;

  /** total learned words (leaves) */
  get leaves() {
    return this.counts().words;
  }

  /** highest JLPT level unlocked for new words (5 = only N5) */
  levelFloor(): number {
    const L = this.leaves;
    let floor = 5;
    for (const lv of [4, 3, 2, 1]) if (L >= LEVEL_UNLOCK[lv]) floor = lv;
    return floor;
  }

  unlockedRegions(): Set<string> {
    const L = this.leaves;
    return new Set(REGIONS.filter((r) => L >= r.req).map((r) => r.id));
  }

  /** next unseen words of a theme (respecting unlocked levels) */
  newWords(theme: string, n = 8): Word[] {
    const floor = this.levelFloor();
    const list = vocab.byTheme.get(theme) ?? [];
    const out: Word[] = [];
    for (const w of list) {
      if (w.n < floor) continue;
      if (this.items.has('w:' + w.id)) continue;
      out.push(w);
      if (out.length >= n) break;
    }
    return out;
  }

  themeProgress(theme: string): { learned: number; seen: number; total: number; available: number } {
    const floor = this.levelFloor();
    const list = vocab.byTheme.get(theme) ?? [];
    let learned = 0, seen = 0, available = 0;
    for (const w of list) {
      const it = this.items.get('w:' + w.id);
      if (it) seen++;
      if (it?.L) learned++;
      if (w.n >= floor) available++;
    }
    return { learned, seen, total: list.length, available };
  }

  /** items due for review (most urgent first) */
  dueItems(prefix = 'w:', max = 20, now = Date.now()): string[] {
    const list: [string, number][] = [];
    for (const [k, it] of this.items) if (k.startsWith(prefix) && isDue(it, now)) list.push([k, urgency(it, now)]);
    list.sort((a, b) => a[1] - b[1]);
    return list.slice(0, max).map((x) => x[0]);
  }

  /** words in learning (seen, not yet leaves), ordered by due time */
  learningItems(prefix = 'w:', max = 20, now = Date.now()): string[] {
    const list: [string, number][] = [];
    for (const [k, it] of this.items) if (k.startsWith(prefix) && it.s < LEARNED_STAGE) list.push([k, it.d - now]);
    list.sort((a, b) => a[1] - b[1]);
    return list.slice(0, max).map((x) => x[0]);
  }

  /** a review set for a battle: due first, then learning, then random known */
  reviewSet(n: number, now = Date.now()): string[] {
    const set = new Set<string>(this.dueItems('w:', n, now));
    for (const k of this.learningItems('w:', n, now)) if (set.size < n) set.add(k);
    if (set.size < n) {
      const known = [...this.items.keys()].filter((k) => k.startsWith('w:') && !set.has(k));
      while (set.size < n && known.length) set.add(known.splice(Math.floor(Math.random() * known.length), 1)[0]);
    }
    return [...set];
  }

  word(key: string): Word | undefined {
    return vocab.byId.get(key.replace(/^w:/, ''));
  }

  stage(key: string): number {
    return this.items.get(key)?.s ?? 0;
  }

  isLearned(key: string): boolean {
    return !!this.items.get(key)?.L;
  }
}
