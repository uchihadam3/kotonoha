/** Player options, shared by all save slots. */
import { getItem, setItem } from './save';

export type Quality = 'auto' | 'alta' | 'media' | 'baixa';
export type RomajiMode = 'sempre' | 'iniciante' | 'nunca';

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  voice: number;
  voiceRate: number;
  voiceName: string;
  romaji: RomajiMode;
  furigana: boolean;
  quality: Quality;
  camSens: number;
  invertY: boolean;
  textScale: number;
  speech: boolean;
  reducedMotion: boolean;
  autoSpeak: boolean;
}

const KEY = 'kotonoha.settings';
export const DEFAULTS: Settings = {
  master: 0.85,
  music: 0.6,
  sfx: 0.8,
  voice: 1,
  voiceRate: 0.9,
  voiceName: '',
  romaji: 'iniciante',
  furigana: true,
  quality: 'auto',
  camSens: 1,
  invertY: false,
  textScale: 1,
  speech: true,
  reducedMotion: false,
  autoSpeak: true,
};

export function loadSettings(): Settings {
  try {
    const raw = getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

export function saveSettings(s: Settings) {
  setItem(KEY, JSON.stringify(s));
}
