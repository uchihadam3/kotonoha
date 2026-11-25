/**
 * Spaced repetition. Every learnable item (word, kana, kanji) has a stage 0..9 and a due time.
 *   stage 1  semente  (introduced)
 *   stage 2  broto
 *   stage 3+ folha    → counts as LEARNED forever (a leaf on the Great Tree)
 *   stage 6+ flor     → memorised
 *   stage 8+ fruto    → mastered
 * A correct answer when the item is due moves it up one stage; when it is not due yet it only refreshes
 * the item a little (no cramming). A wrong answer moves it down and makes it due again soon.
 */

export interface SrsItem {
  /** stage 0..9 */
  s: number;
  /** due time (ms since epoch) */
  d: number;
  /** correct / wrong counters */
  c: number;
  w: number;
  /** reached stage 3 at least once (learned leaf, never lost) */
  L?: 1;
  /** first seen (ms) */
  f?: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** wait after reaching stage n before it is due again */
export const INTERVALS = [0, 1 * MIN, 8 * MIN, 4 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY, 90 * DAY];
export const LEARNED_STAGE = 3;
export const MEMORIZED_STAGE = 6;
export const MASTERED_STAGE = 8;
export const MAX_STAGE = 9;

export const STAGE_INFO = [
  { name: 'Nova', jp: '無', color: '#6b6f85' },
  { name: 'Semente', jp: '種', color: '#b08a5a' },
  { name: 'Broto', jp: '芽', color: '#9ccf6a' },
  { name: 'Folha', jp: '葉', color: '#4fc27a' },
  { name: 'Folha', jp: '葉', color: '#3fb57a' },
  { name: 'Folha forte', jp: '葉', color: '#2fa58a' },
  { name: 'Flor', jp: '花', color: '#f08cb4' },
  { name: 'Flor', jp: '花', color: '#ea6fa3' },
  { name: 'Fruto', jp: '実', color: '#ffc94a' },
  { name: 'Estrela', jp: '星', color: '#ffe680' },
];

export function newItem(now: number): SrsItem {
  return { s: 1, d: now + INTERVALS[1], c: 0, w: 0, f: now };
}

export function isDue(it: SrsItem | undefined, now: number): boolean {
  return !!it && it.s > 0 && it.s < MAX_STAGE + 1 && it.d <= now;
}

/** Applies an answer. Returns true when the item just became a learned leaf for the first time. */
export function answer(it: SrsItem, correct: boolean, now: number): { leveled: boolean; newLeaf: boolean } {
  let leveled = false;
  let newLeaf = false;
  if (correct) {
    it.c++;
    if (it.d <= now + 30_000) {
      it.s = Math.min(MAX_STAGE, it.s + 1);
      leveled = true;
    } else if (it.s < 2) {
      // early in learning, a second correct answer in the same practice still counts as a step
      it.s = 2;
      leveled = true;
    }
    it.d = now + INTERVALS[Math.min(it.s, INTERVALS.length - 1)] * (0.9 + Math.random() * 0.2);
    if (it.s >= LEARNED_STAGE && !it.L) {
      it.L = 1;
      newLeaf = true;
    }
  } else {
    it.w++;
    it.s = Math.max(1, it.s - (it.s >= MEMORIZED_STAGE ? 2 : 1));
    it.d = now + INTERVALS[1];
  }
  return { leveled, newLeaf };
}

/** Item urgency: lower = more urgent. Overdue items first, then lower stages. */
export function urgency(it: SrsItem, now: number): number {
  const over = (now - it.d) / HOUR;
  return -over * 2 + it.s;
}

export function stageLabel(s: number): string {
  return STAGE_INFO[Math.max(0, Math.min(STAGE_INFO.length - 1, s))].name;
}

/** Compact serialisation for saves: [s, d(minutes), c, w, L, f(minutes)] */
export function packItem(it: SrsItem): number[] {
  return [it.s, Math.round(it.d / MIN), it.c, it.w, it.L ? 1 : 0, it.f ? Math.round(it.f / MIN) : 0];
}
export function unpackItem(a: number[]): SrsItem {
  const it: SrsItem = { s: a[0] | 0, d: (a[1] || 0) * MIN, c: a[2] | 0, w: a[3] | 0 };
  if (a[4]) it.L = 1;
  if (a[5]) it.f = a[5] * MIN;
  return it;
}
