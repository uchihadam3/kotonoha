/**
 * Generative-but-composed music. Every song is generated once from a fixed seed (so it is always the
 * same piece), in a Japanese scale, and looped in an A A B A form with a sample-accurate scheduler.
 */
import { audio, mtof } from './audio';
import { mulberry32 } from '../core/rng';

type Layer = 'pad' | 'koto' | 'arp' | 'flute' | 'shinobue' | 'taiko' | 'festival' | 'lofi' | 'bass' | 'shamisen' | 'bells' | 'chime' | 'soft';

export interface SongDef {
  bpm: number;
  root: number;
  scale: number[];
  layers: Layer[];
  seed: number;
  /** 0..1: how busy the parts are */
  energy: number;
  swing?: number;
  /** progression in scale degrees, one chord per bar */
  prog?: number[];
}

export const SCALES = {
  in: [0, 1, 5, 7, 8],
  yo: [0, 2, 5, 7, 9],
  hira: [0, 2, 3, 7, 8],
  ryukyu: [0, 4, 5, 7, 11],
  iwato: [0, 1, 5, 6, 10],
  major: [0, 2, 4, 7, 9],
  minor: [0, 3, 5, 7, 10],
};

export const SONGS: Record<string, SongDef> = {
  title: { bpm: 64, root: 50, scale: SCALES.in, layers: ['pad', 'arp', 'flute', 'bells', 'bass'], seed: 11, energy: 0.25, prog: [0, 0, 3, 4, 0, 3, 1, 0] },
  menu: { bpm: 64, root: 50, scale: SCALES.in, layers: ['pad', 'arp', 'bells'], seed: 11, energy: 0.2, prog: [0, 0, 3, 4] },
  beach: { bpm: 84, root: 55, scale: SCALES.ryukyu, layers: ['pad', 'koto', 'arp', 'soft', 'bass'], seed: 21, energy: 0.4, prog: [0, 3, 1, 0, 0, 3, 4, 0] },
  village: { bpm: 92, root: 50, scale: SCALES.yo, layers: ['pad', 'koto', 'flute', 'arp', 'soft', 'bass'], seed: 31, energy: 0.45, prog: [0, 2, 3, 0, 0, 2, 4, 0] },
  night: { bpm: 62, root: 50, scale: SCALES.in, layers: ['pad', 'arp', 'bells', 'flute'], seed: 41, energy: 0.18, prog: [0, 3, 0, 4] },
  market: { bpm: 112, root: 52, scale: SCALES.yo, layers: ['shamisen', 'shinobue', 'festival', 'bass', 'pad'], seed: 51, energy: 0.75, prog: [0, 0, 3, 4, 0, 2, 3, 0], swing: 0.12 },
  school: { bpm: 100, root: 53, scale: SCALES.major, layers: ['chime', 'arp', 'pad', 'soft', 'bass'], seed: 61, energy: 0.5, prog: [0, 3, 4, 2, 0, 3, 1, 4] },
  shrine: { bpm: 58, root: 48, scale: SCALES.in, layers: ['pad', 'bells', 'flute', 'soft', 'arp'], seed: 71, energy: 0.2, prog: [0, 0, 3, 3, 4, 4, 0, 0] },
  port: { bpm: 96, root: 50, scale: SCALES.yo, layers: ['koto', 'pad', 'arp', 'soft', 'bass', 'flute'], seed: 81, energy: 0.5, prog: [0, 3, 2, 4] },
  city: { bpm: 86, root: 51, scale: SCALES.hira, layers: ['lofi', 'chime', 'pad', 'bass', 'arp'], seed: 91, energy: 0.55, prog: [0, 3, 2, 4] },
  onsen: { bpm: 70, root: 53, scale: SCALES.ryukyu, layers: ['pad', 'koto', 'flute', 'soft'], seed: 101, energy: 0.25, prog: [0, 3, 0, 4] },
  castle: { bpm: 100, root: 45, scale: SCALES.hira, layers: ['taiko', 'shamisen', 'flute', 'bass', 'pad'], seed: 111, energy: 0.65, prog: [0, 0, 3, 1] },
  temple: { bpm: 54, root: 48, scale: SCALES.in, layers: ['pad', 'bells', 'flute'], seed: 121, energy: 0.15, prog: [0, 3, 4, 0] },
  peak: { bpm: 76, root: 50, scale: SCALES.yo, layers: ['pad', 'taiko', 'flute', 'arp', 'bass', 'bells'], seed: 131, energy: 0.55, prog: [0, 3, 4, 2, 0, 3, 1, 0] },
  lesson: { bpm: 80, root: 52, scale: SCALES.yo, layers: ['pad', 'arp', 'soft'], seed: 141, energy: 0.2, prog: [0, 3, 4, 0] },
  battle: { bpm: 138, root: 50, scale: SCALES.hira, layers: ['taiko', 'festival', 'koto', 'shinobue', 'bass'], seed: 151, energy: 0.9, prog: [0, 0, 3, 4, 0, 0, 1, 4] },
  boss: { bpm: 148, root: 47, scale: SCALES.iwato, layers: ['taiko', 'festival', 'koto', 'shinobue', 'bass', 'pad'], seed: 161, energy: 1, prog: [0, 1, 0, 3, 0, 1, 4, 3] },
  minigame: { bpm: 120, root: 55, scale: SCALES.yo, layers: ['shamisen', 'festival', 'chime', 'bass'], seed: 171, energy: 0.7, prog: [0, 3, 4, 0], swing: 0.1 },
};

interface Note {
  step: number; // 16th index inside the section
  dur: number; // in 16ths
  deg: number; // scale degree (may exceed scale length → octave)
  vel: number;
}

interface Section {
  bars: number;
  melody: Note[];
  counter: Note[];
  chords: number[];
}

const RHYTHMS_SLOW = [
  [8, 4, 4, 8, 8], [4, 4, 8, 12, 4], [6, 2, 8, 8, 8], [8, 8, 4, 4, 8], [12, 4, 8, 8],
];
const RHYTHMS_MID = [
  [4, 2, 2, 4, 4, 2, 2, 2, 2, 8], [2, 2, 4, 4, 4, 4, 4, 8], [4, 4, 2, 2, 4, 4, 4, 8], [3, 1, 4, 4, 4, 3, 1, 4, 8], [2, 2, 2, 2, 4, 4, 8, 8],
];
const RHYTHMS_FAST = [
  [2, 2, 2, 2, 2, 2, 4, 2, 2, 2, 2, 8], [2, 1, 1, 2, 2, 4, 2, 2, 2, 2, 4, 8], [1, 1, 2, 2, 2, 4, 4, 2, 2, 4, 8], [2, 2, 4, 2, 2, 4, 2, 2, 2, 2, 8],
];

function compose(def: SongDef, seed: number, bars: number, answer: boolean): Section {
  const rnd = mulberry32(seed);
  const pool = def.energy > 0.7 ? RHYTHMS_FAST : def.energy > 0.35 ? RHYTHMS_MID : RHYTHMS_SLOW;
  const n = def.scale.length;
  const melody: Note[] = [];
  const counter: Note[] = [];
  // motif of 2 bars, developed: A, A' (transposed), B (answer), cadence
  const makePhrase = (startDeg: number, rhythm: number[], endDeg: number): { deg: number; dur: number }[] => {
    const out: { deg: number; dur: number }[] = [];
    let d = startDeg;
    for (let i = 0; i < rhythm.length; i++) {
      out.push({ deg: d, dur: rhythm[i] });
      const r = rnd();
      const remaining = rhythm.length - i - 1;
      if (remaining <= 1) {
        d = endDeg;
      } else {
        const step = r < 0.12 ? 0 : r < 0.75 ? (rnd() < 0.5 ? 1 : -1) : rnd() < 0.5 ? 2 : -2;
        d += step;
        // pull toward the comfortable middle register
        if (d > n + 3) d -= 2;
        if (d < 1) d += 2;
      }
    }
    return out;
  };
  const rhythmA = pool[Math.floor(rnd() * pool.length)];
  const rhythmB = pool[Math.floor(rnd() * pool.length)];
  const base = n + (answer ? 1 : 0);
  const motif = makePhrase(base, rhythmA, base - 1 + (rnd() < 0.5 ? 1 : 0));
  const phrases: { deg: number; dur: number }[][] = [];
  phrases.push(motif);
  phrases.push(motif.map((x, i) => ({ deg: x.deg + (i < motif.length - 2 ? 1 : 0), dur: x.dur })));
  phrases.push(makePhrase(base + 2, rhythmB, base));
  phrases.push(makePhrase(base + 1, answer ? rhythmA : rhythmB, answer ? n : n + (rnd() < 0.5 ? 0 : 3)));
  let step = 0;
  for (let p = 0; p < Math.min(phrases.length, bars / 2); p++) {
    let s = 0;
    for (const x of phrases[p]) {
      // occasional rest makes it breathe
      if (!(def.energy < 0.4 && rnd() < 0.12 && s > 0)) melody.push({ step: step + s, dur: x.dur, deg: x.deg, vel: 0.5 + rnd() * 0.25 });
      s += x.dur;
    }
    step += 32;
  }
  // counter-melody: long notes a third below in the second half
  for (let b = 0; b < bars; b += 2) counter.push({ step: b * 16 + 8, dur: 16, deg: n - 1 + Math.floor(rnd() * 3), vel: 0.35 });
  const prog = def.prog ?? [0, 3, 4, 0];
  const chords = Array.from({ length: bars }, (_, i) => prog[(i + (answer ? 4 : 0)) % prog.length]);
  return { bars, melody, counter, chords };
}

export class Music {
  private timer: number | null = null;
  private current: string | null = null;
  private def: SongDef | null = null;
  private sections: Section[] = [];
  private form = [0, 0, 1, 0];
  private formIdx = 0;
  private step = 0;
  private nextTime = 0;
  private gen = 0;
  intensity = 1;
  private stopAmb: (() => void) | null = null;

  get playing() {
    return this.current;
  }

  play(id: string, fadeIn = 1.5) {
    if (this.current === id) return;
    const def = SONGS[id];
    if (!def || !audio.ctx) return;
    this.stop(0.8);
    this.current = id;
    this.def = def;
    this.sections = [compose(def, def.seed, 8, false), compose(def, def.seed + 7, 8, true)];
    this.formIdx = 0;
    this.step = 0;
    const g = ++this.gen;
    this.nextTime = audio.now + 0.12;
    const bus = audio.buses.music;
    const t = audio.now;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.exponentialRampToValueAtTime(Math.max(0.0001, audio.volumes.music), t + fadeIn);
    this.timer = window.setInterval(() => {
      if (g !== this.gen) return;
      this.schedule();
    }, 25);
  }

  stop(fade = 1.2) {
    this.gen++;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    if (!audio.ctx) return;
    const bus = audio.buses.music;
    const t = audio.now;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
    // restore level for the next song after the fade
    bus.gain.setValueAtTime(Math.max(0.0001, audio.volumes.music), t + fade + 0.05);
  }

  /** ambience bed for a place (separate from music) */
  ambience(kind: Parameters<typeof audio.ambience>[0] | null) {
    this.stopAmb?.();
    this.stopAmb = kind ? audio.ambience(kind) : null;
  }

  private note(deg: number, octave = 0): number {
    const d = this.def!;
    const n = d.scale.length;
    const o = Math.floor(deg / n);
    const i = ((deg % n) + n) % n;
    return mtof(d.root + d.scale[i] + 12 * (o + octave));
  }

  private chordTones(root: number): number[] {
    return [root, root + 2, root + 4];
  }

  private schedule() {
    const def = this.def;
    if (!def || !audio.ctx) return;
    const spb = 60 / def.bpm / 4; // seconds per 16th
    while (this.nextTime < audio.now + 0.18) {
      const sec = this.sections[this.form[this.formIdx]];
      const st = this.step;
      const swing = def.swing && st % 2 === 1 ? def.swing * spb : 0;
      this.playStep(def, sec, st, this.nextTime + swing, spb);
      this.nextTime += spb;
      this.step++;
      if (this.step >= sec.bars * 16) {
        this.step = 0;
        this.formIdx = (this.formIdx + 1) % this.form.length;
      }
    }
  }

  private playStep(def: SongDef, sec: Section, st: number, t: number, spb: number) {
    const bar = Math.floor(st / 16);
    const inBar = st % 16;
    const chord = sec.chords[bar];
    const L = def.layers;
    const e = def.energy * this.intensity;
    const variation = this.formIdx === 2;
    // pads & bass on the bar
    if (inBar === 0) {
      if (L.includes('pad')) {
        const tones = this.chordTones(chord).map((dg) => this.note(dg, -1));
        audio.pad(tones, t, spb * 16 * 0.98, 0.9, 'music', 0.35 + e * 0.3);
      }
      if (L.includes('bass')) audio.bass(this.note(chord, -2), t, 0.55, 'music', spb * 7);
    }
    if (L.includes('bass') && inBar === 8 && e > 0.4) audio.bass(this.note(chord + (bar % 2 ? 2 : 0), -2), t, 0.4, 'music', spb * 6);
    // melody
    const lead: Layer | undefined = L.find((x) => x === 'flute' || x === 'shinobue' || x === 'koto' || x === 'chime' || x === 'shamisen');
    for (const nt of sec.melody) {
      if (nt.step !== st) continue;
      const f = this.note(nt.deg + (variation ? 1 : 0), 0);
      const dur = nt.dur * spb;
      if (lead === 'flute') audio.flute(f, t, dur * 0.95, nt.vel * 0.9, 'music', { scoop: nt.dur >= 6 ? 0.8 : 0.2 });
      else if (lead === 'shinobue') audio.flute(f * 2, t, dur * 0.9, nt.vel * 0.55, 'music', { bright: 1, breath: 0.8, scoop: 0.3 });
      else if (lead === 'koto') audio.koto(f, t, nt.vel * 0.9, 'music', { dur: Math.max(1.2, dur * 1.6), bend: nt.dur >= 8 && Math.random() < 0.3 ? 1 : 0 });
      else if (lead === 'chime') audio.chime(f * 2, t, nt.vel * 0.55, 'music', Math.max(0.8, dur * 1.4));
      else if (lead === 'shamisen') audio.shamisen(f, t, nt.vel * 0.85, 'music');
      // second voice doubles the lead in the variation
      if (variation && L.includes('koto') && lead !== 'koto' && nt.dur >= 4) audio.koto(f / 2, t, nt.vel * 0.4, 'music', { dur: 1.4, pan: -0.3 });
    }
    if (L.includes('flute') && lead !== 'flute' && variation) {
      for (const c of sec.counter) if (c.step === st) audio.flute(this.note(c.deg, -1), t, c.dur * spb * 0.9, c.vel * 0.7, 'music', { scoop: 0.6, pan: 0.25 });
    }
    // arpeggio (koto/kalimba patterns on chord tones)
    if (L.includes('arp')) {
      const div = e > 0.6 ? 2 : e > 0.3 ? 4 : 8;
      if (inBar % div === 0) {
        const tones = this.chordTones(chord);
        const idx = (inBar / div) % 4;
        const order = [0, 1, 2, 1];
        const dg = tones[order[idx]] + (idx === 2 ? 0 : 0);
        audio.koto(this.note(dg, idx === 2 ? 0 : -1 + (bar % 2)), t, 0.28 + (inBar === 0 ? 0.1 : 0), 'music', { dur: 1.6, pan: idx % 2 ? 0.35 : -0.35, rev: 0.4, dly: 0.2 });
      }
    }
    if (L.includes('bells') && inBar === 0 && bar % 2 === 0) audio.bell(this.note(chord + 5, 0), t + spb * 2, 0.22, 'music', 3.5, 3.01);
    // percussion
    if (L.includes('soft')) {
      if (inBar === 0) audio.taiko(t, 0.35, 'music', 1.2);
      if (inBar === 8 && e > 0.35) audio.drum(t, 0.25, 'music', 'rim');
    }
    if (L.includes('taiko')) {
      // don . don . | don don kara .
      const pat = e > 0.8 ? [0, 4, 6, 8, 12, 14] : [0, 8, 10];
      if (pat.includes(inBar)) audio.taiko(t, inBar === 0 ? 0.85 : 0.55, 'music', inBar === 0 ? 1 : 1.15);
      if ((inBar === 12 || inBar === 14) && e > 0.6) audio.drum(t, 0.35, 'music', 'rim', 0.2);
    }
    if (L.includes('festival')) {
      // matsuri: shime-daiko 8ths with accents, kane bell on beats
      if (inBar % 2 === 0) audio.drum(t, inBar % 4 === 0 ? 0.42 : 0.26, 'music', 'shime', -0.2);
      if (e > 0.85 && inBar % 2 === 1) audio.drum(t, 0.15, 'music', 'shime', 0.2);
      if (inBar % 4 === 0) audio.bell(2093, t, 0.06, 'music', 0.25, 1.41);
      if (L.includes('shamisen') && (inBar === 4 || inBar === 12)) audio.drum(t, 0.3, 'music', 'clap', 0.1);
    }
    if (L.includes('lofi')) {
      if (inBar === 0 || inBar === 10) audio.taiko(t, 0.5, 'music', 1.6);
      if (inBar === 4 || inBar === 12) audio.drum(t, 0.4, 'music', 'rim');
      if (inBar % 2 === 0) audio.drum(t, inBar % 4 === 2 ? 0.2 : 0.12, 'music', 'hat', 0.3);
    }
    if (L.includes('shamisen') && lead !== 'shamisen' && inBar % 4 === 2) audio.shamisen(this.note(chord, -1), t, 0.3, 'music', -0.3);
  }
}

export const music = new Music();
