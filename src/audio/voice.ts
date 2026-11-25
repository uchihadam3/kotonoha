/**
 * Japanese voice: the browser's speech synthesis (best available ja-JP voice) for every word, sentence and
 * dialogue line, and speech recognition so the player can SPEAK words (where the browser supports it).
 */
import { audio } from './audio';
import { toHiragana, normalizeKana } from '../lang/kana';

export interface SpeakOpts {
  rate?: number;
  pitch?: number;
  onend?: () => void;
  /** do not duck music */
  noDuck?: boolean;
}

const PREFERRED = ['Nanami', 'Google 日本語', 'Kyoko', 'O-ren', 'Otoya', 'Haruka', 'Ayumi', 'Sayaka', 'Mizuki', 'Keita', 'Ichiro', 'Hattori', 'Japanese'];

class Voice {
  ja: SpeechSynthesisVoice | null = null;
  voices: SpeechSynthesisVoice[] = [];
  rate = 0.9;
  volume = 1;
  preferredName = '';
  private ready = false;
  private speaking = 0;

  init(preferred = '') {
    this.preferredName = preferred;
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'));
      this.pick();
      this.ready = true;
    };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  }

  private pick() {
    if (!this.voices.length) {
      this.ja = null;
      return;
    }
    if (this.preferredName) {
      const v = this.voices.find((x) => x.name === this.preferredName);
      if (v) {
        this.ja = v;
        return;
      }
    }
    for (const p of PREFERRED) {
      // prefer natural/online voices when several match
      const vs = this.voices.filter((v) => v.name.includes(p));
      const v = vs.find((x) => /natural|online|enhanced|premium/i.test(x.name)) ?? vs[0];
      if (v) {
        this.ja = v;
        return;
      }
    }
    this.ja = this.voices[0];
  }

  setPreferred(name: string) {
    this.preferredName = name;
    this.pick();
  }

  get available(): boolean {
    return 'speechSynthesis' in window;
  }

  get hasJapanese(): boolean {
    return !!this.ja || (this.available && !this.ready);
  }

  /** warm-up inside a user gesture (iOS) */
  prime() {
    if (!this.available) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  speak(text: string, opts: SpeakOpts = {}) {
    if (!this.available || !text || this.volume <= 0) {
      opts.onend?.();
      return;
    }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[～〜]/g, ''));
      u.lang = 'ja-JP';
      if (this.ja) u.voice = this.ja;
      u.rate = (opts.rate ?? 1) * this.rate;
      u.pitch = opts.pitch ?? 1;
      u.volume = this.volume;
      const id = ++this.speaking;
      if (!opts.noDuck) audio.duck(true);
      const done = () => {
        if (id === this.speaking) audio.duck(false);
        opts.onend?.();
      };
      u.onend = done;
      u.onerror = done;
      speechSynthesis.speak(u);
      // Chrome sometimes never fires onend for long utterances
      setTimeout(() => {
        if (id === this.speaking) audio.duck(false);
      }, 1500 + text.length * 260);
    } catch {
      opts.onend?.();
    }
  }

  stop() {
    if (!this.available) return;
    try {
      speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    audio.duck(false);
  }

  // ───────────────────────── speech recognition ─────────────────────────

  get canListen(): boolean {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  /**
   * Listens once in Japanese. Resolves with the recognised alternatives (empty on failure/silence).
   */
  listen(timeoutMs = 6000): Promise<string[]> {
    return new Promise((res) => {
      const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SR) return res([]);
      let done = false;
      const finish = (r: string[]) => {
        if (done) return;
        done = true;
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        res(r);
      };
      const rec = new SR();
      rec.lang = 'ja-JP';
      rec.interimResults = false;
      rec.maxAlternatives = 6;
      rec.continuous = false;
      rec.onresult = (e: SpeechRecEvent) => {
        const out: string[] = [];
        for (let i = 0; i < e.results.length; i++) for (let j = 0; j < e.results[i].length; j++) out.push(e.results[i][j].transcript);
        finish(out);
      };
      rec.onerror = () => finish([]);
      rec.onend = () => finish([]);
      try {
        this.stop();
        rec.start();
      } catch {
        finish([]);
      }
      setTimeout(() => finish([]), timeoutMs);
    });
  }

  /** does what was heard match the word (written form or reading)? */
  matches(heard: string[], w: string, r: string): boolean {
    const targets = [w, r, toHiragana(r)].map(normalizeKana);
    return heard.some((h) => {
      const n = normalizeKana(h);
      return targets.some((t) => t && (n === t || n.includes(t) || (t.length >= 3 && t.includes(n) && n.length >= t.length - 1)));
    });
  }
}

interface SpeechRecEvent {
  results: { length: number; [i: number]: { length: number; [j: number]: { transcript: string } } };
}
interface SpeechRec {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: SpeechRecEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export const voice = new Voice();
