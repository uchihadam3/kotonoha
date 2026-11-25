/**
 * Audio engine: buses (music, sfx, ambience), reverb, compressor, and the synthesized Japanese instruments
 * (koto, shakuhachi, shinobue, taiko, shime-daiko, bells, shamisen, pads, kalimba). 100% Web Audio.
 */

export type Bus = 'music' | 'sfx' | 'amb' | 'ui';

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  buses = {} as Record<Bus, GainNode>;
  musicDuck!: GainNode;
  reverb!: ConvolverNode;
  reverbSend!: GainNode;
  delay!: DelayNode;
  delaySend!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private waves = new Map<string, PeriodicWave>();
  volumes = { master: 0.85, music: 0.6, sfx: 0.8 };

  /** must be called from a user gesture */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = this.volumes.master;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2, 2.6);
    const revOut = ctx.createGain();
    revOut.gain.value = 0.9;
    this.reverb.connect(revOut);
    revOut.connect(this.master);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 1;
    this.reverbSend.connect(this.reverb);

    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.375;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2600;
    this.delay.connect(dlp);
    dlp.connect(fb);
    fb.connect(this.delay);
    const dOut = ctx.createGain();
    dOut.gain.value = 0.5;
    dlp.connect(dOut);
    dOut.connect(this.master);
    dOut.connect(this.reverbSend);
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = 1;
    this.delaySend.connect(this.delay);

    this.musicDuck = ctx.createGain();
    this.musicDuck.connect(this.master);
    for (const b of ['music', 'sfx', 'amb', 'ui'] as Bus[]) {
      const g = ctx.createGain();
      g.gain.value = b === 'music' ? this.volumes.music : b === 'amb' ? this.volumes.music * 0.8 : this.volumes.sfx;
      g.connect(b === 'music' || b === 'amb' ? this.musicDuck : this.master);
      this.buses[b] = g;
    }
    // silent kick so iOS really starts
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.05);
  }

  get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setVolumes(master: number, music: number, sfx: number) {
    this.volumes = { master, music, sfx };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(master, t, 0.05);
    this.buses.music.gain.setTargetAtTime(music, t, 0.05);
    this.buses.amb.gain.setTargetAtTime(music * 0.8, t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(sfx, t, 0.05);
    this.buses.ui.gain.setTargetAtTime(sfx, t, 0.05);
  }

  /** lower music while the voice speaks */
  duck(on: boolean) {
    if (!this.ctx) return;
    this.musicDuck.gain.setTargetAtTime(on ? 0.35 : 1, this.ctx.currentTime, on ? 0.08 : 0.4);
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // darker tail: one-pole lowpass increasing over time
        const n = Math.random() * 2 - 1;
        const a = 0.35 + t * 0.6;
        lp = lp * a + n * (1 - a);
        d[i] = lp * Math.pow(1 - t, decay) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      }
    }
    return buf;
  }

  noise(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 2;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    return b;
  }

  wave(name: string, harmonics: number[]): PeriodicWave {
    const hit = this.waves.get(name);
    if (hit) return hit;
    const ctx = this.ctx!;
    const real = new Float32Array(harmonics.length + 1);
    const imag = new Float32Array(harmonics.length + 1);
    harmonics.forEach((a, i) => (imag[i + 1] = a));
    const w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this.waves.set(name, w);
    return w;
  }

  /** output node for an instrument voice: dry → bus, wet → reverb/delay */
  out(bus: Bus, rev = 0.25, dly = 0, pan = 0): AudioNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    let node: AudioNode = g;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      node = p;
    }
    node.connect(this.buses[bus]);
    if (rev > 0) {
      const s = ctx.createGain();
      s.gain.value = rev;
      node.connect(s);
      s.connect(this.reverbSend);
    }
    if (dly > 0) {
      const s = ctx.createGain();
      s.gain.value = dly;
      node.connect(s);
      s.connect(this.delaySend);
    }
    return g;
  }

  // ───────────────────────── instruments ─────────────────────────

  /** koto: bright pluck with a falling filter and a tiny pitch settle */
  koto(freq: number, t: number, vel = 0.5, bus: Bus = 'music', opts: { dur?: number; pan?: number; rev?: number; dly?: number; bend?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const dur = opts.dur ?? 2.2;
    const out = this.out(bus, opts.rev ?? 0.3, opts.dly ?? 0.12, opts.pan ?? 0);
    const o = ctx.createOscillator();
    o.setPeriodicWave(this.wave('koto', [1, 0.62, 0.42, 0.3, 0.22, 0.16, 0.1, 0.08, 0.05, 0.035, 0.02]));
    o.frequency.setValueAtTime(freq * 1.012, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
    if (opts.bend) {
      o.frequency.setValueAtTime(freq, t + 0.25);
      o.frequency.linearRampToValueAtTime(freq * Math.pow(2, opts.bend / 12), t + 0.45);
    }
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(Math.min(12000, freq * 9), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.6), t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.004);
    g.gain.exponentialRampToValueAtTime(vel * 0.16, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f);
    f.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    // pluck noise
    const n = ctx.createBufferSource();
    n.buffer = this.noise();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = Math.min(9000, freq * 4);
    nf.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.12, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(out);
    n.start(t, Math.random());
    n.stop(t + 0.05);
  }

  /** shamisen: buzzy, percussive pluck (sawari) */
  shamisen(freq: number, t: number, vel = 0.5, bus: Bus = 'music', pan = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, 0.18, 0.05, pan);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq * 1.02, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq * 3, t);
    f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.3);
    f.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.45, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f);
    f.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.65);
    const n = ctx.createBufferSource();
    n.buffer = this.noise();
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    const nf = ctx.createBiquadFilter();
    nf.type = 'highpass';
    nf.frequency.value = 2500;
    n.connect(nf);
    nf.connect(ng);
    ng.connect(out);
    n.start(t, Math.random());
    n.stop(t + 0.03);
  }

  /** shakuhachi / shinobue: breathy flute with delayed vibrato and an upward "meri" scoop */
  flute(freq: number, t: number, dur: number, vel = 0.4, bus: Bus = 'music', opts: { breath?: number; scoop?: number; pan?: number; bright?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, 0.45, 0.15, opts.pan ?? 0);
    const o = ctx.createOscillator();
    o.setPeriodicWave(this.wave('flute' + (opts.bright ?? 0), opts.bright ? [1, 0.25, 0.12, 0.06, 0.03] : [1, 0.12, 0.05, 0.02]));
    const scoop = opts.scoop ?? 0.6;
    o.frequency.setValueAtTime(freq * Math.pow(2, -scoop / 12), t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.18);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(0, t + Math.min(0.4, dur * 0.4));
    vg.gain.linearRampToValueAtTime(freq * 0.012, t + Math.min(0.9, dur * 0.8));
    vib.connect(vg);
    vg.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.12);
    g.gain.setValueAtTime(vel * 0.32, t + Math.max(0.13, dur - 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(9000, freq * 5);
    o.connect(lp);
    lp.connect(g);
    g.connect(out);
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.2);
    vib.stop(t + dur + 0.2);
    // breath
    const n = ctx.createBufferSource();
    n.buffer = this.noise();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = freq * 2;
    nf.Q.value = 3;
    const ng = ctx.createGain();
    const br = (opts.breath ?? 0.5) * vel;
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(br * 0.22, t + 0.06);
    ng.gain.exponentialRampToValueAtTime(br * 0.05, t + 0.3);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(out);
    n.start(t, Math.random());
    n.stop(t + dur + 0.15);
  }

  /** taiko (big drum): pitch-dropping body + skin noise */
  taiko(t: number, vel = 0.8, bus: Bus = 'music', pitch = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, 0.22, 0);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(48 * pitch, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 1.1, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 1);
    const n = ctx.createBufferSource();
    n.buffer = this.noise();
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 900 * pitch;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(out);
    n.start(t, Math.random());
    n.stop(t + 0.15);
  }

  /** shime-daiko / kakegoe-like small drum, rim click */
  drum(t: number, vel = 0.5, bus: Bus = 'music', kind: 'shime' | 'rim' | 'clap' | 'hat' = 'shime', pan = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, kind === 'clap' ? 0.25 : 0.12, 0, pan);
    if (kind === 'shime') {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(260, t + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.2);
    }
    const n = ctx.createBufferSource();
    n.buffer = this.noise();
    const nf = ctx.createBiquadFilter();
    nf.type = kind === 'hat' ? 'highpass' : 'bandpass';
    nf.frequency.value = kind === 'rim' ? 1800 : kind === 'clap' ? 1300 : kind === 'hat' ? 7000 : 1100;
    nf.Q.value = kind === 'clap' ? 1 : 2;
    const ng = ctx.createGain();
    const len = kind === 'clap' ? 0.18 : kind === 'hat' ? 0.05 : 0.06;
    ng.gain.setValueAtTime(vel * (kind === 'clap' ? 0.7 : 0.35), t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + len);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(out);
    n.start(t, Math.random());
    n.stop(t + len + 0.02);
  }

  /** bell: FM with inharmonic partials (furin wind chime, temple bell, rin) */
  bell(freq: number, t: number, vel = 0.4, bus: Bus = 'sfx', decay = 2.5, ratio = 3.5) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, 0.5, 0.1);
    const car = ctx.createOscillator();
    car.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.frequency.value = freq * ratio;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + decay * 0.6);
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    car.connect(g);
    g.connect(out);
    car.start(t);
    mod.start(t);
    car.stop(t + decay + 0.05);
    mod.stop(t + decay + 0.05);
  }

  /** soft pad chord (slow attack, detuned) */
  pad(freqs: number[], t: number, dur: number, vel = 0.25, bus: Bus = 'music', bright = 0.5) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, 0.6, 0.05);
    const g = ctx.createGain();
    const att = Math.min(1.6, dur * 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.16, t + att);
    g.gain.setValueAtTime(vel * 0.16, t + Math.max(att, dur - 1));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600 + bright * 2400;
    lp.Q.value = 0.5;
    lp.connect(g);
    g.connect(out);
    for (const f of freqs) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 1.4);
      }
    }
  }

  /** bass pluck (wood bass / low koto) */
  bass(freq: number, t: number, vel = 0.5, bus: Bus = 'music', dur = 0.8) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, 0.08, 0);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq / 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(220, t + dur);
    o.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(out);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  /** kalimba/celesta: soft sparkly tone for UI and rewards */
  chime(freq: number, t: number, vel = 0.35, bus: Bus = 'ui', dur = 1.2, pan = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, 0.35, 0.12, pan);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 4.02;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.4, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(vel * 0.08, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g);
    o2.connect(g2);
    g.connect(out);
    g2.connect(out);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + 0.2);
  }

  /** filtered noise swoosh (wind, transitions) */
  whoosh(t: number, dur = 0.8, vel = 0.3, from = 300, to = 3000, bus: Bus = 'sfx') {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = this.out(bus, 0.35, 0);
    const n = ctx.createBufferSource();
    n.buffer = this.noise();
    n.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start(t, Math.random());
    n.stop(t + dur + 0.05);
  }

  /** continuous ambience layer (wind, sea, crickets, city hum). Returns a stop function. */
  ambience(kind: 'wind' | 'sea' | 'night' | 'city' | 'stream' | 'rain'): (fade?: number) => void {
    const ctx = this.ctx;
    if (!ctx) return () => {};
    const out = this.out('amb', 0.2, 0);
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(out);
    const t0 = ctx.currentTime;
    master.gain.exponentialRampToValueAtTime(1, t0 + 2.5);
    const nodes: AudioScheduledSourceNode[] = [];
    const n = ctx.createBufferSource();
    n.buffer = this.noise();
    n.loop = true;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    n.connect(f);
    f.connect(g);
    g.connect(master);
    nodes.push(n);
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.connect(lg);
    nodes.push(lfo);
    if (kind === 'wind') {
      f.type = 'bandpass';
      f.frequency.value = 500;
      f.Q.value = 0.7;
      g.gain.value = 0.05;
      lfo.frequency.value = 0.07;
      lg.gain.value = 300;
      lg.connect(f.frequency);
    } else if (kind === 'sea') {
      f.type = 'lowpass';
      f.frequency.value = 700;
      g.gain.value = 0.09;
      lfo.frequency.value = 0.11;
      lg.gain.value = 0.07;
      lg.connect(g.gain);
    } else if (kind === 'stream') {
      f.type = 'bandpass';
      f.frequency.value = 2400;
      f.Q.value = 0.4;
      g.gain.value = 0.035;
      lfo.frequency.value = 3.1;
      lg.gain.value = 0.01;
      lg.connect(g.gain);
    } else if (kind === 'rain') {
      f.type = 'highpass';
      f.frequency.value = 1500;
      g.gain.value = 0.06;
      lfo.frequency.value = 0.2;
      lg.gain.value = 0.01;
      lg.connect(g.gain);
    } else if (kind === 'city') {
      f.type = 'lowpass';
      f.frequency.value = 260;
      g.gain.value = 0.08;
      lfo.frequency.value = 0.05;
      lg.gain.value = 0.02;
      lg.connect(g.gain);
    } else {
      // night: soft wind + crickets
      f.type = 'lowpass';
      f.frequency.value = 400;
      g.gain.value = 0.02;
      lfo.frequency.value = 0.1;
      lg.gain.value = 0.01;
      lg.connect(g.gain);
      for (let i = 0; i < 2; i++) {
        const c = ctx.createOscillator();
        c.frequency.value = 4200 + i * 380;
        const am = ctx.createOscillator();
        am.type = 'square';
        am.frequency.value = 26 + i * 4;
        const amg = ctx.createGain();
        amg.gain.value = 0.006;
        const chirp = ctx.createOscillator();
        chirp.frequency.value = 0.6 + i * 0.27;
        const chg = ctx.createGain();
        chg.gain.value = 0.006;
        const cg = ctx.createGain();
        cg.gain.value = 0;
        am.connect(amg);
        amg.connect(cg.gain);
        chirp.connect(chg);
        chg.connect(cg.gain);
        c.connect(cg);
        cg.connect(master);
        c.start();
        am.start();
        chirp.start();
        nodes.push(c, am, chirp);
      }
    }
    n.start(0, Math.random() * 1.5);
    lfo.start();
    return (fade = 2) => {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + fade);
      for (const s of nodes) s.stop(t + fade + 0.1);
    };
  }
}

export const audio = new AudioEngine();

/** MIDI note → frequency */
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
