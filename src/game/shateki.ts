/**
 * 射的 (shateki): the festival shooting gallery. Kon calls a word (meaning on screen, voice in Japanese) and you
 * shoot the moving target that has it written in Japanese. 45 seconds, combos, a miss costs time, prizes at the end.
 */
import type { Game } from './game';
import { h, esc, sleep, shuffle } from '../core/util';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { vocab, type Word } from '../lang/vocab';

const CSS = `
.stall { position: absolute; inset: 0; display: flex; flex-direction: column; background: linear-gradient(180deg, #2a0f14, #140a10); overflow: hidden; }
.stall .awning { height: 54px; flex: none; background: repeating-linear-gradient(90deg, #d8432f 0 44px, #fff4e6 44px 88px); box-shadow: 0 6px 0 rgba(0,0,0,.3); position: relative; }
.stall .awning::after { content: ''; position: absolute; left: 0; right: 0; bottom: -14px; height: 14px; background: radial-gradient(circle at 22px 0, #d8432f 21px, transparent 22px) 0 0 / 88px 14px repeat-x, radial-gradient(circle at 66px 0, #fff4e6 21px, transparent 22px) 0 0 / 88px 14px repeat-x; }
.stall .lanterns { position: absolute; top: 58px; left: 0; right: 0; display: flex; justify-content: space-around; pointer-events: none; }
.stall .lanterns i { width: 26px; height: 34px; border-radius: 45%; background: radial-gradient(circle at 50% 40%, #ffd98a, #e8602a 70%); box-shadow: 0 0 22px rgba(255,170,80,.7); animation: lsw 3s ease-in-out infinite; }
.stall .lanterns i:nth-child(2n) { animation-delay: -1.5s; }
@keyframes lsw { 50% { transform: rotate(5deg); } }
.stall .call { margin: 30px auto 4px; text-align: center; color: #fff; z-index: 2; }
.stall .call .q { font-size: 13px; letter-spacing: .2em; color: #ffd98a; }
.stall .call .m { font-size: clamp(22px, 4vw, 32px); font-weight: 700; text-shadow: 0 2px 10px rgba(0,0,0,.6); }
.stall .call .say { margin-top: 2px; }
.stall .shelves { position: relative; flex: 1; margin: 6px 0 10px; }
.stall .shelf { position: absolute; left: 0; right: 0; height: 12px; background: linear-gradient(#8a5a2a, #4a2e14); box-shadow: 0 4px 8px rgba(0,0,0,.5); }
.stall .tgt { position: absolute; transform: translate(-50%, -100%); min-width: 74px; white-space: nowrap; padding: 10px 10px 8px; border-radius: 40% 40% 14px 14px; background: radial-gradient(circle at 50% 30%, #ff6a52, #b8281a 75%); color: #fff; text-align: center; font-family: var(--jp); font-size: 22px; box-shadow: inset 0 -6px 0 rgba(0,0,0,.25), 0 6px 10px rgba(0,0,0,.4); cursor: crosshair; user-select: none; border: 0; }
.stall .tgt::before { content: ''; display: block; width: 34px; height: 22px; margin: 0 auto 4px; border-radius: 50%; background: #fff4e6; box-shadow: inset 0 0 0 3px #2a1a1a; }
.stall .tgt.alt { background: radial-gradient(circle at 50% 30%, #ffe27a, #d89a1a 75%); color: #2a1a0a; }
.stall .tgt.alt2 { background: radial-gradient(circle at 50% 30%, #8ad6ff, #2a6ab8 75%); }
.stall .tgt.hit { animation: fall .7s ease-in forwards; pointer-events: none; }
.stall .tgt.miss { animation: shake .35s; }
@media (max-height: 560px) {
  .stall .awning { height: 34px; }
  .stall .lanterns { display: none; }
  .stall .call { margin: 16px auto 0; display: flex; align-items: center; gap: 10px; justify-content: center; }
  .stall .call .q { display: none; }
  .stall .call .m { font-size: 22px; }
  .stall .tgt { font-size: 17px; padding: 6px 9px; min-width: 56px; }
  .stall .tgt::before { width: 22px; height: 12px; margin-bottom: 2px; }
}
@keyframes fall { 0% { transform: translate(-50%, -100%) rotate(0); } 30% { transform: translate(-50%, -120%) rotate(-25deg); } 100% { transform: translate(-50%, 160%) rotate(-100deg); opacity: 0; } }
@keyframes shake { 20%, 60% { margin-left: -6px; } 40%, 80% { margin-left: 6px; } }
.stall .bang { position: absolute; transform: translate(-50%, -50%); font-family: var(--brush); font-size: 34px; color: #fff3b0; text-shadow: 0 0 14px #ff9a3a; pointer-events: none; animation: bang .5s ease-out forwards; }
@keyframes bang { from { transform: translate(-50%, -50%) scale(.3); } to { transform: translate(-50%, -90%) scale(1.3); opacity: 0; } }
.stall .prize { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(380px, 90vw); background: linear-gradient(180deg, #fffaf0, #f0e4c8); color: #2a2318; border-radius: 18px; padding: 18px; text-align: center; box-shadow: 0 0 0 4px #d8432f, 0 24px 60px rgba(0,0,0,.6); z-index: 5; animation: pop .4s; }
.stall .prize .big { font-family: var(--brush); font-size: 60px; color: #c9452f; }
`;
let cssDone = false;

export async function shateki(g: Game, shell: (t: string, jp: string, song?: string) => { el: HTMLElement; play: HTMLElement; score: HTMLElement; time: HTMLElement; close: () => void; x: HTMLElement; readonly closed: boolean }) {
  if (!cssDone) {
    cssDone = true;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const sh = shell('Tiro ao alvo do festival', '射的', 'minigame');
  const L = g.learner;
  // words you have met (so it is practice), topped up with easy ones
  let pool: Word[] = vocab.words.filter((w) => L.get('w:' + w.id) && w.w.length <= 6);
  if (pool.length < 10) pool = [...pool, ...['saudacoes', 'numeros', 'animais', 'familia'].flatMap((t) => (vocab.byTheme.get(t) ?? []).slice(0, 12))].filter((w) => w.w.length <= 6);
  pool = [...new Map(pool.map((w) => [w.w, w])).values()];
  const night = g.world.clock > 0.75 || g.world.clock < 0.22;
  const st = h(`<div class="stall"><div class="awning"></div><div class="lanterns">${'<i></i>'.repeat(7)}</div>
    <div class="call"><div class="q">ACERTE: ${night ? '🏮 FESTIVAL À NOITE · PONTOS x2' : ''}</div><div class="m"></div><button class="mbtn small ghost say">🔊 ouvir</button></div>
    <div class="shelves"></div></div>`);
  sh.play.appendChild(st);
  const shelves = st.querySelector('.shelves') as HTMLElement;
  const callEl = st.querySelector('.m') as HTMLElement;
  for (const y of [36, 67, 97]) shelves.appendChild(h(`<div class="shelf" style="top:${y}%"></div>`));
  let score = 0, combo = 0, hits = 0, time = 45, target: Word | null = null;
  let targets: { el: HTMLElement; w: Word; x: number; v: number; y: number }[] = [];
  const upd = () => {
    sh.score.textContent = `🎯 ${score}${combo >= 2 ? ` · x${combo}` : ''}`;
    sh.time.textContent = `${Math.ceil(time)}s`;
  };
  const round = () => {
    for (const t of targets) t.el.remove();
    targets = [];
    target = pool[Math.floor(Math.random() * pool.length)];
    const others = shuffle(pool.filter((w) => w.w !== target!.w && w.pt.split(';')[0] !== target!.pt.split(';')[0])).slice(0, 5);
    const words = shuffle([target, ...others]);
    words.forEach((w, i) => {
      const row = i % 3;
      const el = h(`<button class="tgt ${['', 'alt', 'alt2'][i % 3]}">${esc(w.w)}</button>`);
      shelves.appendChild(el);
      const t = { el, w, x: Math.random(), v: (row % 2 ? -1 : 1) * (0.06 + Math.random() * 0.07 + hits * 0.004), y: [36, 67, 97][row] };
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        shoot(t, e as PointerEvent);
      });
      targets.push(t);
    });
    callEl.textContent = target.pt.split(';')[0];
    voice.speak(target.r);
  };
  const bang = (x: number, y: number, text: string) => {
    const r = shelves.getBoundingClientRect();
    const b = h(`<div class="bang" style="left:${x - r.left}px;top:${y - r.top}px">${text}</div>`);
    shelves.appendChild(b);
    setTimeout(() => b.remove(), 520);
  };
  const shoot = (t: { el: HTMLElement; w: Word }, e: PointerEvent) => {
    if (time <= 0 || !target) return;
    if (t.w.w === target.w) {
      combo++;
      hits++;
      const pts = (10 + combo * 2) * (night ? 2 : 1);
      score += pts;
      sfx.hit();
      bang(e.clientX, e.clientY, `パン！ +${pts}`);
      t.el.classList.add('hit');
      L.answer('w:' + target.id, true);
      target = null;
      setTimeout(round, 420);
    } else {
      combo = 0;
      time = Math.max(0, time - 3);
      sfx.wrong();
      bang(e.clientX, e.clientY, 'はずれ！ −3s');
      t.el.classList.remove('miss');
      void t.el.offsetWidth;
      t.el.classList.add('miss');
    }
    upd();
  };
  st.querySelector('.say')!.addEventListener('click', () => target && voice.speak(target.r));
  round();
  upd();
  let last = performance.now();
  let run = true;
  const loop = () => {
    if (!run || sh.closed) return;
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.5, (now - last) / 1000);
    last = now;
    time = Math.max(0, time - dt);
    const W = shelves.clientWidth, H = shelves.clientHeight;
    for (const t of targets) {
      if (t.el.classList.contains('hit')) continue;
      t.x += t.v * dt;
      if (t.x > 1.08) t.x = -0.08;
      if (t.x < -0.08) t.x = 1.08;
      t.el.style.left = t.x * W + 'px';
      t.el.style.top = (t.y / 100) * H + 'px';
    }
    sh.time.textContent = `${Math.ceil(time)}s`;
    if (time <= 0) {
      run = false;
      void finish();
    }
  };
  const finish = async () => {
    for (const t of targets) t.el.remove();
    const mon = Math.round(score / 3);
    g.addMon(mon);
    const best = g.save.flags.shatekiBest ?? 0;
    if (score > best) g.save.flags.shatekiBest = score;
    const tier = score >= 300 ? ['特賞', 'Prêmio especial!'] : score >= 160 ? ['一等', 'Primeiro prêmio!'] : score >= 70 ? ['二等', 'Segundo prêmio'] : ['参加賞', 'Prêmio de participação'];
    sfx.victory();
    const p = h(`<div class="prize"><div class="big">${tier[0]}</div><div><b>${tier[1]}</b></div><p>${hits} alvos · ${score} pontos${score > best ? ' · 🏆 recorde!' : ` · recorde ${best}`}<br>+${mon} 文</p><button class="mbtn primary">Jogar de novo</button></div>`);
    st.appendChild(p);
    await sleep(300);
    p.querySelector('button')!.addEventListener('click', () => {
      p.remove();
      score = 0;
      combo = 0;
      hits = 0;
      time = 45;
      run = true;
      last = performance.now();
      round();
      upd();
      loop();
    });
  };
  loop();
  await new Promise<void>((res) => sh.x.addEventListener('click', () => res()));
  run = false;
  sh.close();
}
