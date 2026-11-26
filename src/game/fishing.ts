/**
 * Fishing (釣り): cast from the pier, wait for the bobber to dip (nibbles are traps!), strike at the real bite,
 * then land the fish by naming it in Japanese. Every species is a word; the first catch teaches it, the next ones
 * ask you to recall it. Rare fish, a golden carp at night, and junk (a boot!) fill the encyclopedia (図鑑).
 */
import type { Game } from './game';
import { h, esc, sleep, shuffle } from '../core/util';
import { ICON } from '../ui/icons';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { voice } from '../audio/voice';
import { audio, mtof } from '../audio/audio';
import { vocab } from '../lang/vocab';

interface Fish {
  jp: string;
  r: string;
  pt: string;
  icon: string;
  /** 0 junk, 1 common, 2 uncommon, 3 rare, 4 legendary */
  rar: number;
  cm: [number, number];
  hue: number;
  night?: boolean;
  port?: boolean;
}

export const FISH: Fish[] = [
  { jp: '鰯', r: 'いわし', pt: 'sardinha', icon: '🐟', rar: 1, cm: [10, 22], hue: 210 },
  { jp: '鯵', r: 'あじ', pt: 'carapau', icon: '🐟', rar: 1, cm: [15, 35], hue: 190 },
  { jp: '鯖', r: 'さば', pt: 'cavala', icon: '🐟', rar: 1, cm: [25, 45], hue: 160 },
  { jp: '海老', r: 'えび', pt: 'camarão', icon: '🦐', rar: 1, cm: [8, 20], hue: 10 },
  { jp: '蟹', r: 'かに', pt: 'caranguejo', icon: '🦀', rar: 1, cm: [10, 30], hue: 0 },
  { jp: '烏賊', r: 'いか', pt: 'lula', icon: '🦑', rar: 1, cm: [20, 45], hue: 330 },
  { jp: '海月', r: 'くらげ', pt: 'água-viva', icon: '🪼', rar: 1, cm: [10, 40], hue: 280 },
  { jp: '秋刀魚', r: 'さんま', pt: 'sanma (peixe-agulha do Pacífico)', icon: '🐟', rar: 2, cm: [25, 40], hue: 220 },
  { jp: '鯛', r: 'たい', pt: 'pargo (o peixe da sorte)', icon: '🐠', rar: 2, cm: [30, 60], hue: 350 },
  { jp: '鰹', r: 'かつお', pt: 'bonito', icon: '🐟', rar: 2, cm: [40, 80], hue: 230, port: true },
  { jp: '蛸', r: 'たこ', pt: 'polvo', icon: '🐙', rar: 2, cm: [30, 90], hue: 15 },
  { jp: '鮭', r: 'さけ', pt: 'salmão', icon: '🐟', rar: 2, cm: [50, 90], hue: 20 },
  { jp: '平目', r: 'ひらめ', pt: 'linguado', icon: '🐟', rar: 2, cm: [30, 70], hue: 40 },
  { jp: '鰤', r: 'ぶり', pt: 'olhete (buri)', icon: '🐟', rar: 2, cm: [50, 100], hue: 200, port: true },
  { jp: '河豚', r: 'ふぐ', pt: 'baiacu', icon: '🐡', rar: 3, cm: [20, 45], hue: 50 },
  { jp: '鰻', r: 'うなぎ', pt: 'enguia', icon: '🐍', rar: 3, cm: [40, 90], hue: 100, night: true },
  { jp: '鮪', r: 'まぐろ', pt: 'atum', icon: '🐟', rar: 3, cm: [90, 250], hue: 240, port: true },
  { jp: '鮫', r: 'さめ', pt: 'tubarão', icon: '🦈', rar: 3, cm: [120, 300], hue: 210, port: true },
  { jp: '金の鯉', r: 'きんのこい', pt: 'carpa dourada (lenda)', icon: '🐠', rar: 4, cm: [60, 120], hue: 45, night: true },
  { jp: '大王烏賊', r: 'だいおういか', pt: 'lula gigante (lenda)', icon: '🦑', rar: 4, cm: [400, 1200], hue: 330, port: true },
  { jp: '長靴', r: 'ながぐつ', pt: 'bota velha', icon: '👢', rar: 0, cm: [25, 30], hue: 0 },
  { jp: '空き缶', r: 'あきかん', pt: 'lata vazia', icon: '🥫', rar: 0, cm: [10, 12], hue: 0 },
];
const RARITY = ['lixo', 'comum', 'incomum', 'raro', 'LENDÁRIO'];
const RCOL = ['#9aa0a8', '#cfe8ff', '#7fe0b0', '#c69bff', '#ffd76a'];
const MON = [2, 6, 12, 30, 120];

const CSS = `
.fish-ui { position: absolute; inset: 0; pointer-events: none; }
.fish-ui .hint { position: absolute; left: 50%; bottom: calc(18px + var(--safe-b)); transform: translateX(-50%); color: #fff; background: rgba(0,0,0,.45); padding: 8px 16px; border-radius: 999px; font-size: 14px; white-space: nowrap; }
.fish-ui .bang { position: absolute; font-family: var(--latin); font-size: 64px; color: #ffef9a; text-shadow: 0 0 24px #ff9a3a, 0 4px 0 #a8401f; transform: translate(-50%, -100%) scale(0); transition: transform .12s cubic-bezier(.3,1.8,.5,1); }
.fish-ui .bang.on { transform: translate(-50%, -100%) scale(1); }
.fish-ui .zk { position: absolute; right: 12px; top: 8px; pointer-events: auto; white-space: nowrap; }
.fcard { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(400px, 92vw); background: linear-gradient(180deg, #fffaf0, #f0e4c8); color: #2a2318; border-radius: 18px; padding: 18px; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,.6), inset 0 0 0 3px var(--rc, #cfe8ff); pointer-events: auto; animation: fpop .45s cubic-bezier(.3,1.6,.5,1); }
@keyframes fpop { from { transform: translate(-50%, -40%) scale(.6); opacity: 0; } }
.fcard .ficon { font-size: 76px; line-height: 1; filter: drop-shadow(0 6px 8px rgba(0,0,0,.3)); animation: fwiggle 1.2s ease-in-out infinite; display: inline-block; }
@keyframes fwiggle { 50% { transform: rotate(-8deg) translateY(-4px); } }
.fcard .frar { display: inline-block; margin: 6px 0 2px; padding: 2px 10px; border-radius: 99px; background: #2a2318; color: var(--rc, #fff); font-size: 11px; letter-spacing: .16em; font-weight: 700; }
.fcard .fjp { font-family: var(--jp); font-size: 42px; margin-top: 4px; }
.fcard .fr { color: #8a6a3a; font-size: 16px; }
.fcard .fpt { font-size: 16px; margin-top: 4px; }
.fcard .fsz { color: #6b5a44; font-size: 13px; margin-top: 6px; }
.fcard .fq { font-size: 15px; margin: 6px 0 10px; }
.fcard .fopts { display: grid; gap: 8px; }
.fcard .fopts button { padding: 12px; border-radius: 12px; border: 0; background: #fff; box-shadow: inset 0 0 0 1px #d8c8a4; font-family: var(--jp); font-size: 20px; cursor: pointer; color: #2a2318; }
.fcard .fopts button small { display: block; font-family: var(--ui); font-size: 12px; color: #8a7a60; }
.fcard .fopts button.ok { background: #bff0d4; }
.fcard .fopts button.no { background: #f6c4bc; }
.fcard .row { margin-top: 12px; justify-content: center; }
.fcard.new::before { content: 'NOVO NO 図鑑!'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #d8432f; color: #fff; font-size: 11px; letter-spacing: .14em; padding: 3px 10px; border-radius: 99px; font-weight: 700; }
.zukan { position: absolute; inset: 0; background: rgba(4,8,16,.92); pointer-events: auto; overflow: auto; padding: 16px max(16px, env(safe-area-inset-left, 0px)); color: #fff; }
.zukan h3 { font-family: var(--latin); letter-spacing: .1em; color: var(--gold2); margin: 0 0 10px; }
.zukan .zg { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; }
.zukan .zc { background: rgba(255,255,255,.06); border-radius: 12px; padding: 10px; text-align: center; box-shadow: inset 0 0 0 1px var(--rc); }
.zukan .zc .i { font-size: 34px; }
.zukan .zc .j { font-family: var(--jp); font-size: 20px; }
.zukan .zc small { display: block; color: var(--muted); font-size: 11px; }
.zukan .zc.no .i { filter: brightness(0) opacity(.35); }
`;
let cssDone = false;

interface Swimmer { x: number; y: number; vx: number; size: number; hue: number; ph: number; target: boolean }

export async function fishing(g: Game, shell: (t: string, jp: string, song?: string) => { el: HTMLElement; play: HTMLElement; score: HTMLElement; time: HTMLElement; close: () => void; x: HTMLElement; readonly closed: boolean }) {
  if (!cssDone) {
    cssDone = true;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const sh = shell('Pescaria', '釣り', 'beach');
  const atPort = g.region?.id === 'porto';
  const night = g.world.clock > 0.8 || g.world.clock < 0.22;
  const cv = h(`<canvas></canvas>`) as HTMLCanvasElement;
  const ui = h(`<div class="fish-ui"><div class="hint">Toque na água para lançar a linha 🎣</div><div class="bang">！</div><button class="mbtn small ghost zk">${ICON.book} 図鑑</button></div>`);
  sh.play.append(cv, ui);
  const hint = ui.querySelector('.hint') as HTMLElement;
  const bang = ui.querySelector('.bang') as HTMLElement;
  const ctx = cv.getContext('2d')!;
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = sh.play.clientWidth;
    H = sh.play.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
  };
  resize();
  window.addEventListener('resize', resize);
  const flags = g.save.flags;
  const caughtCount = () => FISH.filter((f) => flags['fish:' + f.jp]).length;
  let total = 0;
  const upd = () => (sh.score.textContent = `🐟 ${total} · 図鑑 ${caughtCount()}/${FISH.length}`);
  upd();

  // scene state
  const waterY = () => H * 0.36;
  const rodTip = () => ({ x: Math.min(W * 0.26, 210), y: waterY() - Math.min(110, H * 0.17) });
  const swimmers: Swimmer[] = Array.from({ length: 7 }, () => ({ x: Math.random() * 1, y: 0.25 + Math.random() * 0.65, vx: (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.04), size: 0.5 + Math.random() * 0.9, hue: Math.random() * 360, ph: Math.random() * 6, target: false }));
  const parts: { x: number; y: number; vx: number; vy: number; life: number; c: string }[] = [];
  const splash = (x: number, y: number, n = 14, c = 'rgba(220,240,255,') => {
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 160, life: 1, c });
  };
  type Phase = 'idle' | 'cast' | 'wait' | 'nibble' | 'bite' | 'reel' | 'card';
  let phase: Phase = 'idle';
  let bob = { x: 0, y: 0, dip: 0 };
  let castT = 0, castFrom = { x: 0, y: 0 }, castTo = { x: 0, y: 0 };
  let timer = 0, nibbles = 0, biteAt = 0;
  let fish: Fish | null = null;
  let hooked: Swimmer | null = null;
  let jump = 0;

  const pickFish = (): Fish => {
    const pool = FISH.filter((f) => (!f.night || night) && (!f.port || atPort || f.rar < 3));
    const weight = (f: Fish) => [6, 30, 14, 4, 0.8][f.rar] * (f.night && night ? 2 : 1) * (f.port && atPort ? 1.6 : 1);
    const tot = pool.reduce((s, f) => s + weight(f), 0);
    let r = Math.random() * tot;
    for (const f of pool) if ((r -= weight(f)) <= 0) return f;
    return pool[0];
  };

  const blip = (f: number, d = 0.12) => {
    if (!audio.ctx) return;
    audio.koto(mtof(f), audio.now, 0.18, 'sfx', { dur: d * 6 });
  };

  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (phase === 'idle') {
      if (y < waterY() - 10) return;
      phase = 'cast';
      castT = 0;
      castFrom = rodTip();
      castTo = { x: Math.max(W * 0.3, Math.min(W - 30, x)), y: waterY() + 4 };
      hint.textContent = 'Espere... só puxe quando a bóia afundar de verdade!';
      sfx.cast();
    } else if (phase === 'nibble' || phase === 'wait') {
      // too early: the fish swims away
      sfx.wrong();
      hint.textContent = 'Cedo demais! O peixe fugiu. Toque na água para lançar de novo.';
      if (hooked) hooked.target = false;
      hooked = null;
      phase = 'idle';
    } else if (phase === 'bite') {
      phase = 'reel';
      bang.classList.remove('on');
      sfx.catch();
      jump = 1;
      splash(bob.x, bob.y, 26);
      void land();
    }
  });

  const card = (html: string, rc: string, isNew = false) => {
    const c = h(`<div class="fcard ${isNew ? 'new' : ''}" style="--rc:${rc}">${html}</div>`);
    ui.appendChild(c);
    return c;
  };

  const land = async () => {
    const f = fish!;
    await sleep(650);
    const first = !flags['fish:' + f.jp];
    const rc = RCOL[f.rar];
    const size = Math.round(f.cm[0] + Math.random() ** 2 * (f.cm[1] - f.cm[0]));
    const head = `<div class="ficon">${f.icon}</div><br><span class="frar">${RARITY[f.rar].toUpperCase()}</span>`;
    let caught = true;
    if (!first && f.rar > 0) {
      // recall: the fish fights back until you name it
      const others = shuffle(FISH.filter((o) => o.jp !== f.jp && o.rar > 0)).slice(0, 2);
      const opts = shuffle([f, ...others]);
      const c = card(`${head}<div class="fq">Fisgou um(a) <b>${esc(f.pt)}</b>! Diga o nome em japonês para puxar:</div><div class="fopts"></div>`, rc);
      const box = c.querySelector('.fopts') as HTMLElement;
      caught = await new Promise<boolean>((res) => {
        const t0 = performance.now();
        for (const o of opts) {
          const b = h(`<button>${esc(o.jp)}<small>${esc(o.r)}</small></button>`);
          b.addEventListener('click', () => {
            const ok = o.jp === f.jp;
            b.classList.add(ok ? 'ok' : 'no');
            if (!ok) box.querySelector(`button:nth-child(${opts.indexOf(f) + 1})`)?.classList.add('ok');
            ok ? sfx.correct() : sfx.wrong();
            voice.speak(f.r);
            setTimeout(() => res(ok && performance.now() - t0 < 12000), 700);
          }, { once: true });
          box.appendChild(b);
        }
      });
      c.remove();
    }
    if (!caught) {
      splash(bob.x, waterY(), 20);
      const c = card(`<div class="ficon" style="animation:none;opacity:.5">💨</div><div class="fjp">逃げられた！</div><div class="fr">にげられた</div><div class="fpt">Fugiu! Era <b class="jp">${esc(f.jp)}</b> (${esc(f.r)}) · ${esc(f.pt)}</div><div class="row"><button class="mbtn primary">Lançar de novo</button></div>`, '#f6c4bc');
      await new Promise<void>((res) => c.querySelector('button')!.addEventListener('click', () => res()));
      c.remove();
    } else {
      flags['fish:' + f.jp] = (flags['fish:' + f.jp] ?? 0) + 1;
      const best = flags['fishcm:' + f.jp] ?? 0;
      const record = size > best;
      if (record) flags['fishcm:' + f.jp] = size;
      total++;
      const mon = MON[f.rar] + (first ? 10 : 0) + (record && !first ? 5 : 0);
      g.addMon(mon);
      // the word goes into the player's memory
      const w = vocab.find(f.jp) ?? vocab.find(f.r);
      if (w) {
        g.learner.introduce('w:' + w.id);
        if (!first) g.learner.answer('w:' + w.id, true);
      }
      if (f.rar >= 3) sfx.rankUp();
      else sfx.newWord();
      voice.speak(f.r);
      const c = card(`${head}<div class="fjp">${esc(f.jp)}</div><div class="fr">${esc(f.r)}</div><div class="fpt">${esc(f.pt)}</div><div class="fsz">${f.rar === 0 ? 'Bom, pelo menos limpou o mar 😅' : `${size >= 100 ? (size / 100).toFixed(1) + ' m' : size + ' cm'}${record && !first ? ' · 🏆 novo recorde!' : ''}`} · +${mon} 文</div><div class="row"><button class="mbtn primary">${first ? 'Que legal! ' : ''}Continuar</button></div>`, rc, first);
      upd();
      await new Promise<void>((res) => c.querySelector('button')!.addEventListener('click', () => res()));
      c.remove();
      g.persist();
    }
    if (hooked) {
      hooked.target = false;
      hooked.x = Math.random() < 0.5 ? -0.1 : 1.1;
    }
    hooked = null;
    fish = null;
    phase = 'idle';
    hint.textContent = 'Toque na água para lançar a linha 🎣';
  };

  (ui.querySelector('.zk') as HTMLElement).addEventListener('click', () => {
    sfx.page();
    const z = h(`<div class="zukan"><div class="row" style="justify-content:space-between;align-items:center"><h3>図鑑 · Enciclopédia (${caughtCount()}/${FISH.length})</h3><button class="hbtn">${ICON.close}</button></div><div class="zg">${FISH.map((f) => {
      const n = flags['fish:' + f.jp] ?? 0;
      const cm = flags['fishcm:' + f.jp] ?? 0;
      return `<div class="zc ${n ? '' : 'no'}" style="--rc:${RCOL[f.rar]}"><div class="i">${f.icon}</div><div class="j">${n ? esc(f.jp) : '？？'}</div><small>${n ? esc(f.r) + ' · ' + esc(f.pt) : RARITY[f.rar] + (f.night ? ' · à noite' : '') + (f.port ? ' · no porto' : '')}</small>${n ? `<small>×${n}${cm && f.rar ? ' · recorde ' + (cm >= 100 ? (cm / 100).toFixed(1) + ' m' : cm + ' cm') : ''}</small>` : ''}</div>`;
    }).join('')}</div></div>`);
    z.querySelector('.hbtn')!.addEventListener('click', () => z.remove());
    ui.appendChild(z);
  });

  // ── animation loop
  let last = performance.now();
  let run = true;
  const sky = night ? ['#070b1c', '#1a2244'] : g.world.clock > 0.7 ? ['#2a1c3c', '#e08a5a'] : g.world.clock < 0.3 ? ['#3a3a6a', '#f0b0a0'] : ['#6ab0e8', '#cfe8f8'];
  const sea = night ? ['#0a1a34', '#02060e'] : ['#2a7ab0', '#08243e'];
  const loop = () => {
    if (!run || sh.closed) return;
    requestAnimationFrame(loop);
    const now = performance.now();
    // animation steps are clamped for smoothness, but waiting times follow the real clock
    const real = Math.min(0.5, (now - last) / 1000);
    const dt = Math.min(0.05, real);
    last = now;
    const t = now / 1000;
    const wy = waterY();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky
    let gr = ctx.createLinearGradient(0, 0, 0, wy);
    gr.addColorStop(0, sky[0]);
    gr.addColorStop(1, sky[1]);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, wy);
    // sun or moon + stars
    if (night) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 97.3) % W, (i * 53.7) % (wy * 0.9), 1.5, 1.5);
      ctx.fillStyle = '#fdf6d8';
      ctx.beginPath();
      ctx.arc(W * 0.78, wy * 0.35, 22, 0, 7);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,240,200,.9)';
      ctx.beginPath();
      ctx.arc(W * 0.8, wy * 0.4, 30, 0, 7);
      ctx.fill();
    }
    // far island silhouette
    ctx.fillStyle = night ? '#0c1428' : 'rgba(40,70,90,.55)';
    ctx.beginPath();
    ctx.moveTo(W * 0.45, wy);
    ctx.quadraticCurveTo(W * 0.6, wy - 50, W * 0.72, wy - 12);
    ctx.quadraticCurveTo(W * 0.85, wy - 34, W, wy - 6);
    ctx.lineTo(W, wy);
    ctx.fill();
    // sea
    gr = ctx.createLinearGradient(0, wy, 0, H);
    gr.addColorStop(0, sea[0]);
    gr.addColorStop(1, sea[1]);
    ctx.fillStyle = gr;
    ctx.fillRect(0, wy, W, H - wy);
    // light rays
    ctx.globalAlpha = night ? 0.04 : 0.08;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 0.23 + t * 0.01) % 1) * W;
      ctx.beginPath();
      ctx.moveTo(x, wy);
      ctx.lineTo(x + 40, wy);
      ctx.lineTo(x - 60, H);
      ctx.lineTo(x - 140, H);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // fish shadows
    for (const s of swimmers) {
      if (s.target && hooked === s) {
        s.x += (bob.x / W - s.x) * dt * 1.2;
        const ty = (bob.y - wy + 22) / (H - wy);
        s.y += (ty - s.y) * dt * 1.2;
      } else {
        s.x += s.vx * dt;
        if (s.x < -0.15) s.x = 1.15;
        if (s.x > 1.15) s.x = -0.15;
      }
      const px = s.x * W, py = wy + 18 + s.y * (H - wy - 30);
      const sz = 14 + s.size * 16;
      const dir = s.target && hooked === s ? (bob.x > px ? 1 : -1) : Math.sign(s.vx) || 1;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(dir, 1);
      ctx.fillStyle = night ? 'rgba(0,0,0,.45)' : 'rgba(5,25,45,.45)';
      const wob = Math.sin(t * 6 + s.ph) * 0.25;
      ctx.beginPath();
      ctx.ellipse(0, 0, sz, sz * 0.42, 0, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-sz * 0.85, 0);
      ctx.lineTo(-sz * 1.5, -sz * (0.45 + wob));
      ctx.lineTo(-sz * 1.5, sz * (0.45 - wob));
      ctx.fill();
      ctx.restore();
    }
    // bubbles
    ctx.fillStyle = 'rgba(200,235,255,.35)';
    for (let i = 0; i < 18; i++) {
      const bx = ((i * 0.137 + Math.sin(t * 0.3 + i) * 0.01) % 1) * W;
      const by = H - ((t * (12 + (i % 5) * 6) + i * 40) % (H - wy));
      ctx.beginPath();
      ctx.arc(bx, by, 1.5 + (i % 3), 0, 7);
      ctx.fill();
    }
    // surface waves
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wy + Math.sin(x * 0.03 + t * 2) * 2.5);
    ctx.stroke();
    // pier
    const tip = rodTip();
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(0, wy - 34, tip.x + 20, 12);
    for (let px = 8; px < tip.x + 10; px += 34) ctx.fillRect(px, wy - 24, 7, 60);
    // the player (back view) + Kon
    const px = tip.x - 36, py = wy - 34;
    ctx.fillStyle = '#2a3a6a';
    ctx.fillRect(px - 9, py - 34, 18, 22);
    ctx.fillStyle = '#c8442f';
    ctx.fillRect(px - 10, py - 36, 20, 5);
    ctx.fillStyle = '#2a2126';
    ctx.beginPath();
    ctx.arc(px, py - 44, 11, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#e88a3a';
    ctx.beginPath();
    ctx.arc(px - 30, py - 16 + Math.sin(t * 3) * 3, 9, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - 36, py - 22 + Math.sin(t * 3) * 3);
    ctx.lineTo(px - 33, py - 32 + Math.sin(t * 3) * 3);
    ctx.lineTo(px - 28, py - 23 + Math.sin(t * 3) * 3);
    ctx.moveTo(px - 32, py - 23 + Math.sin(t * 3) * 3);
    ctx.lineTo(px - 26, py - 32 + Math.sin(t * 3) * 3);
    ctx.lineTo(px - 23, py - 21 + Math.sin(t * 3) * 3);
    ctx.fill();
    // rod
    ctx.strokeStyle = '#3a2416';
    ctx.lineWidth = 3;
    const bend = phase === 'bite' || phase === 'reel' ? 16 : phase === 'nibble' ? 6 : 0;
    ctx.beginPath();
    ctx.moveTo(px + 6, py - 30);
    ctx.quadraticCurveTo(px + 30, tip.y - 10 + bend, tip.x, tip.y + bend);
    ctx.stroke();

    // ── state machine
    if (phase === 'cast') {
      castT += real * 1.6;
      const k = Math.min(1, castT);
      bob.x = castFrom.x + (castTo.x - castFrom.x) * k;
      bob.y = castFrom.y + (castTo.y - castFrom.y) * k - Math.sin(k * Math.PI) * 90;
      if (k >= 1) {
        phase = 'wait';
        splash(bob.x, castTo.y, 10);
        blip(64);
        timer = 1.2 + Math.random() * 2.5;
        fish = pickFish();
        nibbles = Math.floor(Math.random() * 3);
        hooked = swimmers.find((s) => !s.target) ?? null;
        if (hooked) hooked.target = true;
      }
    } else if (phase === 'wait' || phase === 'nibble' || phase === 'bite') {
      bob.y = castTo.y + Math.sin(t * 2.4) * 1.5;
      timer -= real;
      if (phase === 'nibble') bob.dip = Math.max(0, bob.dip - real * 30);
      if (timer <= 0) {
        if (phase === 'bite') {
          bang.classList.remove('on');
          sfx.wrong();
          hint.textContent = 'Demorou! O peixe soltou a isca. Toque na água para lançar de novo.';
          if (hooked) hooked.target = false;
          hooked = null;
          phase = 'idle';
        } else if (nibbles > 0) {
          nibbles--;
          phase = 'nibble';
          bob.dip = 6;
          blip(76);
          timer = 0.6 + Math.random() * 0.9;
        } else {
          phase = 'bite';
          biteAt = now;
          timer = 0.85;
          bob.dip = 16;
          splash(bob.x, bob.y, 12);
          blip(88);
          blip(93);
          bang.style.left = bob.x + 'px';
          bang.style.top = bob.y - 20 + 'px';
          bang.classList.add('on');
          if (navigator.vibrate) navigator.vibrate(60);
          hint.textContent = 'AGORA! Toque!';
        }
      }
      if (phase === 'bite') bob.dip = 12 + Math.sin((now - biteAt) / 40) * 4;
    } else if (phase === 'reel') {
      bob.y -= dt * 60;
    }
    // line + bobber
    if (phase !== 'idle') {
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y + bend);
      ctx.quadraticCurveTo((tip.x + bob.x) / 2, Math.max(tip.y, bob.y) + 30, bob.x, bob.y + bob.dip);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bob.x, bob.y + bob.dip, 6, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#e8402a';
      ctx.beginPath();
      ctx.arc(bob.x, bob.y + bob.dip, 6, Math.PI, 0);
      ctx.fill();
      if (phase !== 'cast' && phase !== 'reel') {
        ctx.strokeStyle = 'rgba(255,255,255,.4)';
        const rr = ((t * 30) % 30) + 6;
        ctx.beginPath();
        ctx.ellipse(bob.x, castTo.y + 3, rr, rr * 0.3, 0, 0, 7);
        ctx.stroke();
      }
    }
    // the fish leaps out when hooked
    if (jump > 0 && fish) {
      jump -= real * 0.9;
      const k = 1 - jump;
      const jx = bob.x - k * 80, jy = wy - Math.sin(k * Math.PI) * 120;
      ctx.font = `${44 + fish.rar * 6}px serif`;
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(jx, jy);
      ctx.rotate(-1 + k * 2);
      ctx.fillText(fish.icon, 0, 0);
      ctx.restore();
    }
    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 400 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.4;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.c + p.life.toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, 7);
      ctx.fill();
    }
  };
  loop();
  await new Promise<void>((res) => sh.x.addEventListener('click', () => res()));
  run = false;
  window.removeEventListener('resize', resize);
  sh.close();
  if (total) g.app.screens.toast(`🎣 ${total} peixe(s) · 図鑑 ${caughtCount()}/${FISH.length}`);
}
