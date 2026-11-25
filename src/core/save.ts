/**
 * Save system: 3 slots in localStorage (+ automatic saving), export/import as a text code or a file.
 * Never throws: storage failures fall back to memory so the game keeps running.
 */

export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;
const KEY = (slot: number) => `kotonoha.save.${slot}`;
const LAST = 'kotonoha.lastSlot';

export interface Look {
  skin: number;
  hair: number;
  hairStyle: number;
  outfit: number;
  eyes: number;
}

export interface Stats {
  battles: number;
  wins: number;
  correct: number;
  wrong: number;
  bestCombo: number;
  lessons: number;
  daysPlayed: number;
  lastDay: string;
  dailyStreak: number;
  spoken: number;
}

export interface SaveData {
  version: number;
  slot: number;
  created: number;
  updated: number;
  /** seconds */
  playTime: number;
  name: string;
  nameKana: string;
  look: Look;
  /** where the player stands */
  pos: { x: number; z: number; ry: number };
  region: string;
  /** spaced-repetition items, packed (see srs.packItem) */
  srs: Record<string, number[]>;
  /** story beats, tutorial steps, small counters */
  flags: Record<string, number>;
  /** quest id → step (−1 = done) */
  quests: Record<string, number>;
  /** currency (文 mon) */
  mon: number;
  items: string[];
  equip: Record<string, string>;
  visited: string[];
  bosses: string[];
  /** world clock 0..1 (0.25 = sunrise, 0.5 = noon) */
  clock: number;
  stats: Stats;
  /** daily omikuji / word of the day (YYYY-MM-DD) */
  daily: Record<string, string>;
}

export function newSave(slot: number): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    slot,
    created: now,
    updated: now,
    playTime: 0,
    name: '',
    nameKana: '',
    look: { skin: 1, hair: 0, hairStyle: 0, outfit: 0, eyes: 0 },
    pos: { x: 0, z: 0, ry: 0 },
    region: 'praia',
    srs: {},
    flags: {},
    quests: {},
    mon: 0,
    items: [],
    equip: {},
    visited: [],
    bosses: [],
    clock: 0.27,
    stats: { battles: 0, wins: 0, correct: 0, wrong: 0, bestCombo: 0, lessons: 0, daysPlayed: 0, lastDay: '', dailyStreak: 0, spoken: 0 },
    daily: {},
  };
}

const memory = new Map<string, string>();
function store(): Storage | null {
  try {
    const s = window.localStorage;
    s.setItem('__kt_probe', '1');
    s.removeItem('__kt_probe');
    return s;
  } catch {
    return null;
  }
}
export function getItem(k: string): string | null {
  try {
    return store()?.getItem(k) ?? memory.get(k) ?? null;
  } catch {
    return memory.get(k) ?? null;
  }
}
export function setItem(k: string, v: string): boolean {
  memory.set(k, v);
  try {
    const s = store();
    if (!s) return false;
    s.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}

export function validate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<SaveData>;
  if (typeof d.version !== 'number' || typeof d.srs !== 'object' || d.srs === null) return null;
  const base = newSave(typeof d.slot === 'number' ? d.slot : 0);
  return {
    ...base,
    ...d,
    look: { ...base.look, ...(d.look ?? {}) },
    pos: { ...base.pos, ...(d.pos ?? {}) },
    srs: d.srs ?? {},
    flags: d.flags ?? {},
    quests: d.quests ?? {},
    items: Array.isArray(d.items) ? d.items : [],
    equip: d.equip ?? {},
    visited: Array.isArray(d.visited) ? d.visited : [],
    bosses: Array.isArray(d.bosses) ? d.bosses : [],
    stats: { ...base.stats, ...(d.stats ?? {}) },
    daily: d.daily ?? {},
  } as SaveData;
}

export function loadSlot(slot: number): SaveData | null {
  const raw = getItem(KEY(slot));
  if (!raw) return null;
  try {
    const d = validate(JSON.parse(raw));
    if (d) d.slot = slot;
    return d;
  } catch {
    return null;
  }
}

export function writeSlot(d: SaveData): boolean {
  d.updated = Date.now();
  const ok = setItem(KEY(d.slot), JSON.stringify(d));
  setItem(LAST, String(d.slot));
  return ok;
}

export function deleteSlot(slot: number) {
  memory.delete(KEY(slot));
  try {
    store()?.removeItem(KEY(slot));
  } catch {
    /* ignore */
  }
}

export function lastSlot(): number | null {
  const v = getItem(LAST);
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < SLOT_COUNT && loadSlot(n) ? n : null;
}

export function listSlots(): { slot: number; data: SaveData | null }[] {
  const out: { slot: number; data: SaveData | null }[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) out.push({ slot: i, data: loadSlot(i) });
  return out;
}

/** Number of learned leaves (items that reached the learned stage at least once). */
export function leavesOf(d: SaveData, prefix = ''): number {
  let n = 0;
  for (const [k, v] of Object.entries(d.srs)) if (v[4] && (!prefix || k.startsWith(prefix))) n++;
  return n;
}

// ───────────────────────── export / import ─────────────────────────

async function deflate(text: string): Promise<Uint8Array | null> {
  try {
    const CS = (globalThis as { CompressionStream?: typeof CompressionStream }).CompressionStream;
    if (!CS) return null;
    const stream = new Blob([text]).stream().pipeThrough(new CS('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}
async function inflate(bytes: Uint8Array): Promise<string | null> {
  try {
    const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
    if (!DS) return null;
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DS('deflate-raw'));
    return await new Response(stream).text();
  } catch {
    return null;
  }
}
function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Text code for copying a save between devices ("KT2:" = compressed, "KT1:" = plain). */
export async function saveToCode(d: SaveData): Promise<string> {
  const json = JSON.stringify(d);
  const z = await deflate(json);
  if (z) return 'KT2:' + toB64(z);
  return 'KT1:' + btoa(unescape(encodeURIComponent(json)));
}

export async function saveFromCode(code: string): Promise<SaveData | null> {
  const c = code.trim().replace(/\s+/g, '');
  try {
    if (c.startsWith('{')) return validate(JSON.parse(code));
    if (c.startsWith('KT2:')) {
      const json = await inflate(fromB64(c.slice(4)));
      return json ? validate(JSON.parse(json)) : null;
    }
    const body = c.startsWith('KT1:') ? c.slice(4) : c;
    return validate(JSON.parse(decodeURIComponent(escape(atob(body)))));
  } catch {
    return null;
  }
}

export function exportFile(d: SaveData) {
  const blob = new Blob([JSON.stringify(d)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const who = (d.name || 'jogador').replace(/[^\p{L}\p{N}_-]+/gu, '_');
  a.download = `kotonoha-${who}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function importFile(): Promise<SaveData | null> {
  return new Promise((res) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return res(null);
      const text = await f.text();
      res(await saveFromCode(text));
    };
    input.click();
  });
}
