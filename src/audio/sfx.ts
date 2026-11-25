/** Sound effects, all synthesized from the instruments in audio.ts. */
import { audio, mtof } from './audio';

const IN = [0, 1, 5, 7, 8];
const YO = [0, 2, 5, 7, 9];
const deg = (root: number, scale: number[], d: number) => mtof(root + scale[((d % 5) + 5) % 5] + 12 * Math.floor(d / 5));

let lastHover = 0;
export const sfx = {
  hover() {
    if (!audio.ctx) return;
    const t = audio.now;
    if (t - lastHover < 0.05) return;
    lastHover = t;
    audio.chime(2637, t, 0.08, 'ui', 0.15);
  },
  click() {
    if (!audio.ctx) return;
    audio.koto(mtof(79), audio.now, 0.35, 'ui', { dur: 0.6, rev: 0.15, dly: 0 });
  },
  back() {
    if (!audio.ctx) return;
    audio.koto(mtof(67), audio.now, 0.3, 'ui', { dur: 0.6, rev: 0.15, dly: 0 });
  },
  open() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.whoosh(t, 0.35, 0.12, 600, 2400, 'ui');
    audio.chime(1568, t + 0.05, 0.15, 'ui', 0.5);
  },
  page() {
    if (!audio.ctx) return;
    audio.whoosh(audio.now, 0.22, 0.1, 1800, 5000, 'ui');
  },
  correct(combo = 0) {
    if (!audio.ctx) return;
    const t = audio.now;
    const up = Math.min(combo, 6);
    audio.chime(deg(76, YO, up), t, 0.4, 'ui', 0.9);
    audio.chime(deg(76, YO, up + 2), t + 0.08, 0.38, 'ui', 1.1);
    audio.koto(deg(64, YO, up + 4), t + 0.02, 0.3, 'ui', { dur: 1.2 });
  },
  wrong() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.taiko(t, 0.35, 'ui', 0.7);
    audio.koto(mtof(46), t, 0.35, 'ui', { dur: 0.7, bend: -1 });
    audio.koto(mtof(47), t + 0.01, 0.25, 'ui', { dur: 0.6 });
  },
  type() {
    if (!audio.ctx) return;
    audio.drum(audio.now, 0.12, 'ui', 'rim');
  },
  blip(pitch = 1) {
    if (!audio.ctx) return;
    audio.chime(520 * pitch * (0.95 + Math.random() * 0.1), audio.now, 0.07, 'ui', 0.07);
  },
  newWord() {
    if (!audio.ctx) return;
    const t = audio.now;
    for (let i = 0; i < 5; i++) audio.koto(deg(62, IN, i + 2), t + i * 0.06, 0.32, 'ui', { dur: 1.4, pan: (i - 2) * 0.2 });
    audio.bell(deg(74, IN, 4), t + 0.32, 0.25, 'ui', 2.2);
  },
  leaf() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.bell(1760, t, 0.28, 'ui', 2.8, 2.76);
    audio.chime(2349, t + 0.12, 0.25, 'ui', 1.4);
    audio.chime(3136, t + 0.24, 0.2, 'ui', 1.6);
  },
  coin() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.bell(2637, t, 0.15, 'ui', 0.5, 1.41);
    audio.bell(3520, t + 0.07, 0.12, 'ui', 0.6, 1.41);
  },
  rankUp() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.taiko(t, 0.8, 'sfx');
    for (let i = 0; i < 8; i++) audio.koto(deg(57, YO, i), t + 0.05 + i * 0.05, 0.35, 'sfx', { dur: 1.8, pan: (i - 4) * 0.12 });
    audio.flute(deg(69, YO, 5), t + 0.5, 0.5, 0.5, 'sfx', { scoop: 0.4 });
    audio.flute(deg(69, YO, 7), t + 1.0, 1.1, 0.55, 'sfx', { scoop: 0.8 });
    audio.bell(deg(81, YO, 0), t + 1.0, 0.3, 'sfx', 3);
    audio.taiko(t + 1.0, 0.6, 'sfx', 0.9);
  },
  unlock() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.bell(mtof(43), t, 0.6, 'sfx', 6, 2.01);
    audio.whoosh(t + 0.2, 2.2, 0.25, 200, 4000);
    audio.taiko(t, 0.9, 'sfx', 0.7);
    audio.taiko(t + 0.9, 0.7, 'sfx', 0.8);
    for (let i = 0; i < 6; i++) audio.chime(deg(84, YO, i), t + 1.1 + i * 0.09, 0.22, 'sfx', 1.5);
  },
  step(surface: 'grass' | 'stone' | 'wood' | 'sand' = 'grass') {
    if (!audio.ctx) return;
    const t = audio.now;
    const f = surface === 'wood' ? 900 : surface === 'stone' ? 2200 : surface === 'sand' ? 1400 : 1700;
    const ctx = audio.ctx;
    const n = ctx.createBufferSource();
    n.buffer = audio.noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * (0.85 + Math.random() * 0.3);
    bp.Q.value = surface === 'wood' ? 4 : 1;
    const g = ctx.createGain();
    const v = surface === 'sand' ? 0.05 : 0.07;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (surface === 'wood' ? 0.07 : 0.05));
    n.connect(bp);
    bp.connect(g);
    g.connect(audio.buses.sfx);
    n.start(t, Math.random());
    n.stop(t + 0.1);
  },
  jump() {
    if (!audio.ctx) return;
    audio.whoosh(audio.now, 0.25, 0.08, 400, 1200);
  },
  cast() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.whoosh(t, 0.5, 0.22, 500, 6000);
    audio.chime(1976, t + 0.05, 0.25, 'sfx', 0.8);
    audio.chime(2960, t + 0.12, 0.2, 'sfx', 0.8);
  },
  hit() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.taiko(t, 0.7, 'sfx', 1.3);
    audio.drum(t, 0.5, 'sfx', 'clap');
    audio.bell(1318, t, 0.2, 'sfx', 1.2, 2.4);
  },
  hurt() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.whoosh(t, 0.4, 0.25, 2000, 200);
    audio.taiko(t + 0.05, 0.6, 'sfx', 0.6);
  },
  shadow() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.whoosh(t, 1.4, 0.18, 120, 500);
    audio.koto(mtof(38), t, 0.3, 'sfx', { dur: 2, bend: -1 });
    audio.koto(mtof(39), t + 0.02, 0.25, 'sfx', { dur: 2 });
  },
  victory() {
    if (!audio.ctx) return;
    const t = audio.now;
    const mel = [0, 2, 3, 4, 7];
    mel.forEach((d, i) => audio.koto(deg(62, YO, d), t + i * 0.11, 0.42, 'sfx', { dur: 1.6 }));
    audio.taiko(t, 0.8, 'sfx');
    audio.taiko(t + 0.44, 0.8, 'sfx');
    audio.flute(deg(74, YO, 4), t + 0.55, 1.2, 0.55, 'sfx', { scoop: 0.6 });
    audio.bell(deg(86, YO, 0), t + 0.55, 0.25, 'sfx', 3);
  },
  defeat() {
    if (!audio.ctx) return;
    const t = audio.now;
    [4, 3, 1, 0].forEach((d, i) => audio.koto(deg(55, IN, d), t + i * 0.22, 0.35, 'sfx', { dur: 2 }));
    audio.taiko(t + 0.9, 0.5, 'sfx', 0.6);
  },
  catch() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.chime(2093 + Math.random() * 400, t, 0.3, 'ui', 0.6);
    audio.chime(3136, t + 0.06, 0.18, 'ui', 0.6);
  },
  slap() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.drum(t, 0.9, 'sfx', 'clap');
    audio.drum(t, 0.5, 'sfx', 'rim');
  },
  door() {
    if (!audio.ctx) return;
    audio.whoosh(audio.now, 0.5, 0.15, 300, 900);
  },
  /** Uchihadam Production sting: deep impact, fire breath, metallic shimmer, rising resolve */
  studio() {
    if (!audio.ctx) return;
    const t = audio.now + 0.05;
    audio.taiko(t, 1, 'sfx', 0.5);
    audio.taiko(t + 0.02, 0.6, 'sfx', 0.35);
    audio.whoosh(t, 3.2, 0.32, 120, 1400);
    audio.bell(mtof(38), t + 0.1, 0.55, 'sfx', 6, 1.99);
    audio.bell(mtof(50), t + 1.6, 0.35, 'sfx', 4.5, 2.01);
    for (let i = 0; i < 5; i++) audio.chime(deg(74, IN, i * 2), t + 1.7 + i * 0.07, 0.14, 'sfx', 2.2);
    audio.pad([mtof(38), mtof(45), mtof(50), mtof(57)], t + 0.3, 4.5, 1.3, 'sfx', 0.5);
    audio.taiko(t + 3.4, 0.7, 'sfx', 0.55);
  },
  /** KOTONOHA logo: koto glissando, ink bell, breath of flute */
  title() {
    if (!audio.ctx) return;
    const t = audio.now + 0.05;
    for (let i = 0; i < 10; i++) audio.koto(deg(50, IN, i), t + i * 0.055, 0.32, 'sfx', { dur: 2.4, pan: (i - 5) * 0.12 });
    audio.bell(mtof(74), t + 0.7, 0.35, 'sfx', 4, 3.01);
    audio.flute(deg(62, IN, 4), t + 1.1, 1.8, 0.55, 'sfx', { scoop: 1 });
    audio.flute(deg(62, IN, 3), t + 2.95, 1.6, 0.45, 'sfx', { scoop: 0.4 });
    audio.pad([mtof(50), mtof(57), mtof(62)], t + 0.6, 4.2, 1, 'sfx', 0.4);
    audio.taiko(t + 1.1, 0.5, 'sfx', 0.8);
  },
  /** furin wind chime (ambient detail) */
  furin() {
    if (!audio.ctx) return;
    const t = audio.now;
    audio.bell(2793 + Math.random() * 300, t, 0.08, 'sfx', 1.8, 2.71);
  },
  templeBell() {
    if (!audio.ctx) return;
    audio.bell(mtof(36), audio.now, 0.6, 'sfx', 8, 2.02);
  },
};
