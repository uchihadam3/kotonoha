/**
 * Mini-games: kana fireflies, karuta, kanji dojo, omikuji (daily), typing dojo, arcade (listening speed),
 * the sushi counter (orders with counters) and resting at the onsen (listening/shadowing).
 */
import type { Game } from './game';
import { h, esc, sleep, shuffle, todayKey, pick } from '../core/util';
import { ICON } from '../ui/icons';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { voice } from '../audio/voice';
import { KANA, MNEMO } from '../lang/kanadata';
import { vocab, type Word } from '../lang/vocab';
import { kanjiCard, askQuestion, strokeSVG, rubyWord } from '../ui/learnui';
import { kanjiQuestion, wordQuestion } from '../lang/challenge';
import { romajiToKana, normalizeKana, toRomaji } from '../lang/kana';
import { isDue } from '../lang/srs';

const CSS = `
.mg { position: absolute; inset: 0; z-index: 36; background: radial-gradient(ellipse at 50% 30%, #0f1a2a, #03050a 75%); display: flex; flex-direction: column; animation: fadein .3s; }
.mg .mgtop { display: flex; align-items: center; gap: 12px; padding: calc(10px + var(--safe-t)) 14px 8px; color: #fff; }
.mg .mgtop .t { flex: 1; font-family: var(--latin); letter-spacing: .1em; color: var(--gold2); font-size: 18px; }
.mg .mgtop .t .jp { font-family: var(--brush); color: #ff8a6a; margin-right: 8px; font-size: 22px; }
.mg .mgtop .score { font-family: var(--ui); font-weight: 700; font-size: 20px; color: #fff; }
.mg .mgtop .time { font-family: var(--ui); font-weight: 700; font-size: 20px; color: var(--gold2); min-width: 44px; text-align: right; }
.mg .play { position: relative; flex: 1; overflow: hidden; }
.mg canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.mg .call { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); text-align: center; color: #fff; pointer-events: none; }
.mg .call .big { font-family: var(--latin); font-size: 40px; color: #fff3c8; text-shadow: 0 0 20px rgba(255,220,140,.7); }
.mg .call small { display: block; color: var(--muted); font-size: 13px; }
.mg .play > .center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; }
.mg .kana-intro { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; width: min(860px, 96vw); max-height: 70vh; overflow: auto; }
.mg .ki { border-radius: 14px; padding: 10px; background: radial-gradient(circle at 50% 0%, #fffaf0, var(--paper)); color: var(--paper-ink); text-align: center; cursor: pointer; }
.mg .ki .jp { font-size: 44px; display: block; }
.mg .ki b { font-size: 18px; }
.mg .ki small { display: block; font-size: 12px; color: #6a5a42; min-height: 30px; }
.mg .cards { display: grid; grid-template-columns: repeat(4, minmax(70px, 140px)); gap: 10px; justify-content: center; padding: 10px; }
.mg .kcard { aspect-ratio: 3/4; border: 0; border-radius: 10px; background: linear-gradient(180deg, #fffaf0, #eadfc6); box-shadow: inset 0 0 0 3px #c9452f, 0 8px 18px rgba(0,0,0,.4); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--jp); color: #1e1810; transition: transform .12s; padding: 4px; }
.mg .kcard:hover { transform: translateY(-3px) rotate(-1deg); }
.mg .kcard .w { font-size: clamp(18px, 4vw, 30px); writing-mode: vertical-rl; }
.mg .kcard small { font-family: var(--ui); font-size: 11px; color: #7a6a52; }
.mg .kcard.taken { opacity: .15; pointer-events: none; }
.mg .kcard.win { box-shadow: inset 0 0 0 3px #2fae84, 0 0 30px #2fae84; }
.mg .kcard.lose { box-shadow: inset 0 0 0 3px #555, 0 0 30px #d8432f; }
.mg .reader { text-align: center; color: #fff; margin: 6px 0 2px; min-height: 52px; }
.mg .reader .jp { font-size: 28px; color: var(--gold2); }
.mg .vs { display: flex; justify-content: center; gap: 26px; color: #fff; font-family: var(--ui); font-size: 18px; }
.mg .sushi-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 10px 0; }
.mg .sushi { border: 0; border-radius: 14px; padding: 10px; width: 108px; background: radial-gradient(circle at 50% 0%, #fffaf0, var(--paper)); color: var(--paper-ink); cursor: pointer; text-align: center; position: relative; }
.mg .sushi .pic { font-size: 34px; }
.mg .sushi .jp { font-size: 16px; display: block; }
.mg .sushi .n { position: absolute; top: 6px; right: 8px; background: #c9452f; color: #fff; border-radius: 10px; min-width: 22px; font-size: 13px; }
.mg .order { text-align: center; color: #fff; padding: 8px; }
.mg .order .jp { font-size: clamp(22px, 4.5vw, 34px); color: #fff3c8; }
.mg .order .r { color: var(--muted); font-size: 13px; }
.mg .typebox { display: flex; flex-direction: column; align-items: center; gap: 10px; color: #fff; }
.mg .typebox .target { font-family: var(--jp); font-size: clamp(40px, 9vw, 72px); }
.mg .typebox .pt { color: var(--gold2); font-size: 18px; }
.mg .typebox .typed { font-family: var(--jp); font-size: 30px; min-height: 40px; color: #bfffe0; }
.mg .typebox input { width: min(340px, 86vw); text-align: center; font-size: 20px; }
.omikuji { width: min(380px, 90vw); margin: auto; border-radius: 10px; padding: 18px; background: linear-gradient(180deg, #fffaf0, #f2e6cc); color: #2a2318; text-align: center; box-shadow: inset 0 0 0 4px #c9452f, 0 20px 50px rgba(0,0,0,.5); animation: unroll .9s ease; transform-origin: top; }
@keyframes unroll { from { transform: scaleY(.05); } to { transform: none; } }
.omikuji .fortune { font-family: var(--brush); font-size: 72px; line-height: 1.1; color: #c9452f; margin: 8px auto 4px; letter-spacing: .1em; }
`;
let cssDone = false;

export class Minigames {
  constructor(private g: Game) {
    if (!cssDone) {
      cssDone = true;
      const s = document.createElement('style');
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }

  async play(id: string) {
    if (id === 'fireflies') return this.fireflies();
    if (id === 'karuta') return this.karuta();
    if (id === 'shop') return this.sushi();
    if (id === 'kanji') return this.kanjiDojo();
  }

  private shell(title: string, jp: string, song = 'minigame') {
    const g = this.g;
    g.pause(true);
    const prev = music.playing;
    music.play(song);
    const el = h(`<div class="mg"><div class="mgtop"><div class="t"><span class="jp">${esc(jp)}</span>${esc(title)}</div><div class="score"></div><div class="time"></div><button class="hbtn x">${ICON.close}</button></div><div class="play"></div></div>`);
    g.ui.appendChild(el);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.remove();
      if (prev) music.play(prev);
      g.pause(false);
      g.persist();
    };
    return { el, play: el.querySelector('.play') as HTMLElement, score: el.querySelector('.score') as HTMLElement, time: el.querySelector('.time') as HTMLElement, close, x: el.querySelector('.x') as HTMLElement, get closed() { return closed; } };
  }

  // ───────────────────────── kana fireflies ─────────────────────────
  async fireflies() {
    const g = this.g;
    const L = g.learner;
    // which kana are in play: learned rows + the next row
    const hiraLearned = KANA.filter((k) => k.set === 'hira' && L.isLearned('k:' + k.ch)).length;
    const useKata = hiraLearned >= 40 && Math.random() < 0.5;
    const set = KANA.filter((k) => k.set === (useKata ? 'kata' : 'hira') && k.group !== 'yoon');
    const rows = [...new Set(set.map((k) => k.group + k.row))];
    let playRows = rows.filter((rw) => set.filter((k) => k.group + k.row === rw).every((k) => L.get('k:' + k.ch)));
    const nextRow = rows.find((rw) => !playRows.includes(rw));
    const fresh = nextRow ? set.filter((k) => k.group + k.row === nextRow) : [];
    playRows = [...playRows.slice(-5), ...(nextRow ? [nextRow] : [])];
    const pool = set.filter((k) => playRows.includes(k.group + k.row));
    const sh = this.shell(useKata ? 'Vaga-lumes de katakana' : 'Vaga-lumes de hiragana', '蛍');
    sh.x.addEventListener('click', () => sh.close());
    // teach the new row first
    if (fresh.length) {
      const intro = h(`<div class="center"><div><div class="reader"><div class="jp">${useKata ? 'カタカナ' : 'ひらがな'}</div><div>Novos ${useKata ? 'katakana' : 'hiragana'}! Toque para ouvir e ver os traços.</div></div><div class="kana-intro"></div><div class="row center" style="margin-top:12px"></div></div></div>`);
      const grid = intro.querySelector('.kana-intro') as HTMLElement;
      for (const k of fresh) {
        L.introduce('k:' + k.ch);
        const card = h(`<div class="ki"><span class="jp">${k.ch}</span><b>${k.ro}</b><small>${esc(MNEMO[k.ch] ?? '')}</small></div>`);
        card.addEventListener('click', async () => {
          voice.speak(k.ch);
          if (!card.querySelector('.strokes')) card.appendChild(await strokeSVG(k.ch, 90));
        });
        grid.appendChild(card);
      }
      sh.play.appendChild(intro);
      await new Promise<void>((res) => {
        const b = g.app.screens.btn('Caçar vaga-lumes!', () => res(), 'primary', ICON.sparkle);
        intro.querySelector('.row')!.appendChild(b);
      });
      intro.remove();
    }
    if (sh.closed) return;
    // the game: canvas with fireflies carrying kana
    const cv = h(`<canvas></canvas>`) as HTMLCanvasElement;
    const call = h(`<div class="call"><div class="big"></div><small>toque no vaga-lume com este som</small></div>`);
    sh.play.append(cv, call);
    const ctx = cv.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      cv.width = sh.play.clientWidth * dpr;
      cv.height = sh.play.clientHeight * dpr;
    };
    resize();
    const W = () => cv.width / dpr, H = () => cv.height / dpr;
    interface Fly { k: typeof pool[number]; x: number; y: number; vx: number; vy: number; ph: number; caught: number }
    const flies: Fly[] = [];
    let target = pick(pool);
    const spawn = (k: typeof pool[number]) => flies.push({ k, x: Math.random() * W(), y: H() * (0.25 + Math.random() * 0.65), vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 30, ph: Math.random() * 6, caught: 0 });
    const newRound = () => {
      target = pick(pool);
      const others = shuffle(pool.filter((k) => k.ch !== target.ch)).slice(0, Math.min(5, pool.length - 1));
      flies.length = 0;
      for (const k of shuffle([target, ...others])) spawn(k);
      (call.querySelector('.big') as HTMLElement).textContent = target.ro;
      voice.speak(target.ch, { rate: 0.9 });
    };
    let score = 0, left = 45, alive = true, combo = 0;
    newRound();
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best: Fly | null = null, bd = 1e9;
      for (const f of flies) {
        const d = Math.hypot(f.x - x, f.y - y);
        if (d < 44 && d < bd) {
          bd = d;
          best = f;
        }
      }
      if (!best) return;
      const ok = best.k.ch === target.ch;
      L.answer('k:' + target.ch, ok);
      if (ok) {
        combo++;
        score += 10 + combo * 2;
        sfx.catch();
        best.caught = 1;
        setTimeout(newRound, 380);
      } else {
        combo = 0;
        sfx.wrong();
        best.vx *= 3;
        voice.speak(target.ch);
      }
      sh.score.textContent = `${score}`;
    });
    let last = performance.now();
    const loop = () => {
      if (!alive || sh.closed) return;
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W(), H());
      // pond silhouette
      const gr = ctx.createLinearGradient(0, H() * 0.6, 0, H());
      gr.addColorStop(0, 'rgba(20,40,60,0)');
      gr.addColorStop(1, 'rgba(30,60,80,.5)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, H() * 0.6, W(), H() * 0.4);
      for (const f of flies) {
        f.ph += dt * 2;
        f.vx += (Math.random() - 0.5) * 60 * dt;
        f.vy += (Math.random() - 0.5) * 60 * dt;
        f.vx *= 0.98;
        f.vy *= 0.98;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < 30 || f.x > W() - 30) f.vx *= -1;
        if (f.y < 90 || f.y > H() - 30) f.vy *= -1;
        const glow = 0.6 + Math.sin(f.ph * 3) * 0.4;
        const rad = f.caught ? 60 : 34;
        const g2 = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rad);
        g2.addColorStop(0, `rgba(230,255,160,${0.85 * glow})`);
        g2.addColorStop(1, 'rgba(230,255,160,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `30px 'kt-learn', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a2a10';
        ctx.fillText(f.k.ch, f.x, f.y + 2);
      }
    };
    loop();
    for (; left > 0 && !sh.closed; left--) {
      sh.time.textContent = `${left}s`;
      await sleep(1000);
    }
    alive = false;
    if (sh.closed) return;
    sfx.victory();
    const mon = Math.round(score / 5);
    g.addMon(mon);
    sh.play.innerHTML = `<div class="center"><div class="paper result-card" style="border-radius:18px;max-width:420px"><div class="big">蛍</div><div class="stats"><div class="stat"><b>${score}</b><span>pontos</span></div><div class="stat"><b>+${mon}</b><span>文 mon</span></div></div><p style="color:#6a5a42">Cada kana certo também cresce na sua memória. Jogue de novo para aprender novas fileiras!</p></div></div>`;
    await sleep(2600);
    sh.close();
  }

  // ───────────────────────── karuta ─────────────────────────
  async karuta() {
    const g = this.g;
    const known = [...g.learner.items.keys()].filter((k) => k.startsWith('w:')).map((k) => g.learner.word(k)!).filter(Boolean);
    if (known.length < 8) {
      g.app.screens.toast('Você precisa conhecer pelo menos 8 palavras para jogar karuta. Faça algumas lições!');
      return;
    }
    const sh = this.shell('Karuta', 'かるた');
    sh.x.addEventListener('click', () => sh.close());
    let me = 0, cpu = 0;
    const cards = shuffle(known).slice(0, 8);
    const wrap = h(`<div style="display:flex;flex-direction:column;height:100%"><div class="vs"><span>Você: <b class="m">0</b></span><span>Chihiro: <b class="c">0</b></span></div><div class="reader"></div><div class="cards"></div></div>`);
    sh.play.appendChild(wrap);
    const grid = wrap.querySelector('.cards') as HTMLElement;
    const reader = wrap.querySelector('.reader') as HTMLElement;
    const els = new Map<string, HTMLElement>();
    for (const w of cards) {
      const c = h(`<button class="kcard"><span class="w">${esc(w.w.replace(/^～/, '〜'))}</span><small>${esc(w.r)}</small></button>`);
      els.set(w.id, c);
      grid.appendChild(c);
    }
    let remaining = [...cards];
    const showRomaji = g.learner.leaves < 150;
    while (remaining.length && !sh.closed && me < 5 && cpu < 5) {
      const target = pick(remaining);
      await sleep(900);
      reader.innerHTML = `<div>Ouça…</div>`;
      voice.speak(target.r, { rate: 0.95 });
      await sleep(400);
      if (showRomaji) reader.innerHTML = `<div class="jp">♪</div><div class="muted small">${esc(g.learner.leaves < 60 ? target.pt.split(';')[0] : '')}</div>`;
      const cpuTime = 2600 + Math.random() * 2400 - Math.min(1200, g.learner.leaves * 2);
      const res = await new Promise<'me' | 'cpu' | 'wrong'>((resolve) => {
        const timer = setTimeout(() => resolve('cpu'), cpuTime);
        for (const w of remaining) {
          const el = els.get(w.id)!;
          el.onclick = () => {
            clearTimeout(timer);
            resolve(w.id === target.id ? 'me' : 'wrong');
          };
        }
      });
      const el = els.get(target.id)!;
      g.learner.answer('w:' + target.id, res === 'me');
      if (res === 'me') {
        me++;
        sfx.slap();
        el.classList.add('win');
      } else {
        cpu++;
        sfx.wrong();
        el.classList.add('lose');
      }
      reader.innerHTML = `<div class="jp">${rubyWord(target.w, target.r, true)}</div><div>${esc(target.pt.split(';')[0])}</div>`;
      (wrap.querySelector('.m') as HTMLElement).textContent = String(me);
      (wrap.querySelector('.c') as HTMLElement).textContent = String(cpu);
      await sleep(1100);
      el.classList.add('taken');
      remaining = remaining.filter((w) => w.id !== target.id);
      for (const w of remaining) els.get(w.id)!.onclick = null;
    }
    if (sh.closed) return;
    const won = me > cpu;
    if (won) sfx.victory();
    else sfx.defeat();
    const mon = me * 6 + (won ? 20 : 0);
    g.addMon(mon);
    reader.innerHTML = `<div class="jp" style="font-size:40px">${won ? '勝ち！' : '負け…'}</div><div>${won ? 'Você venceu!' : 'A Chihiro venceu desta vez.'} +${mon} 文</div>`;
    await sleep(2600);
    sh.close();
  }

  // ───────────────────────── kanji dojo ─────────────────────────
  async kanjiDojo() {
    const g = this.g;
    const L = g.learner;
    const floor = L.levelFloor();
    const due = L.dueItems('K:', 10);
    // new kanji: the next 5 in JLPT order whose level is unlocked
    const fresh = vocab.kanji.filter((k) => !L.get('K:' + k.k) && (k.jlpt === 0 ? 1 : k.jlpt) >= floor).slice(0, 5);
    const sh = this.shell('Dojô de kanji', '書道', 'lesson');
    sh.x.addEventListener('click', () => sh.close());
    const box = h(`<div class="center" style="align-items:flex-start;overflow:auto"><div style="width:min(720px,96vw)" class="kbox"></div></div>`);
    sh.play.appendChild(box);
    const kb = box.querySelector('.kbox') as HTMLElement;
    const next = () => new Promise<void>((res) => {
      const row = h(`<div class="row end" style="margin-top:10px"></div>`);
      row.appendChild(g.app.screens.btn('Próximo ▸', () => res(), 'primary'));
      kb.appendChild(row);
    });
    for (const k of fresh) {
      if (sh.closed) return;
      L.introduce('K:' + k.k);
      kb.innerHTML = '';
      kb.appendChild(kanjiCard(k, 1));
      sfx.newWord();
      await next();
    }
    const quiz = shuffle([...fresh.map((k) => 'K:' + k.k), ...due]);
    let i = 0;
    for (const key of quiz) {
      if (sh.closed) return;
      const k = vocab.kanjiByChar.get(key.slice(2));
      if (!k) continue;
      kb.innerHTML = '';
      const r = await askQuestion(kb, kanjiQuestion(k, i++ % 2 === 1), g.prefs());
      L.answer(key, r.correct);
    }
    if (sh.closed) return;
    kb.innerHTML = `<div class="paper result-card" style="border-radius:18px"><div class="big">字</div><p style="color:#6a5a42">${fresh.length ? `Kanji novos: <span class="jp" style="font-size:24px">${fresh.map((k) => k.k).join(' ')}</span>` : 'Nenhum kanji novo agora: revise os que estão no Livro.'}</p></div>`;
    g.addMon(fresh.length * 4 + quiz.length);
    await sleep(2200);
    sh.close();
  }

  // ───────────────────────── omikuji ─────────────────────────
  async omikuji() {
    const g = this.g;
    const day = todayKey();
    if (g.save.daily.omikuji === day) {
      g.app.screens.toast('Você já tirou a sua おみくじ hoje. Volte amanhã!');
      return;
    }
    g.save.daily.omikuji = day;
    const fortunes = [
      ['大吉', 'daikichi', 'Grande sorte!', 30], ['中吉', 'chuukichi', 'Sorte média', 20], ['小吉', 'shoukichi', 'Pequena sorte', 15],
      ['吉', 'kichi', 'Sorte', 12], ['末吉', 'suekichi', 'Sorte futura', 10], ['凶', 'kyou', 'Azar (amarre no varal do santuário!)', 5],
    ] as const;
    const f = fortunes[Math.floor(Math.pow(Math.random(), 1.5) * fortunes.length)];
    // word of the day: an unseen word from an unlocked theme
    const unlocked = g.learner.unlockedRegions();
    const themes = [...new Set(g.npcs.filter((n) => unlocked.has(n.def.region ?? '')).flatMap((n) => n.def.themes ?? []))];
    let wotd: Word | undefined;
    for (const t of shuffle(themes)) {
      const nw = g.learner.newWords(t, 1)[0];
      if (nw) {
        wotd = nw;
        break;
      }
    }
    const sh = this.shell('Omikuji', 'おみくじ', 'shrine');
    sh.x.addEventListener('click', () => sh.close());
    sfx.templeBell();
    const card = h(`<div class="center"><div class="omikuji"><div class="muted small" style="color:#7a6a52">Sua sorte de hoje</div><div class="fortune">${f[0]}</div><b>${f[1]}</b> · ${esc(f[2])}
      ${wotd ? `<hr style="border:0;border-top:1px dashed #c9a878;margin:14px 0"><div style="font-size:13px;color:#7a6a52">Palavra do dia</div><div class="jp" style="font-size:42px">${esc(wotd.w)}</div><div>${esc(wotd.r)} · ${esc(wotd.pt)}</div>` : ''}
      <div style="margin-top:10px;color:#c9452f">+${f[3]} 文</div></div></div>`);
    sh.play.appendChild(card);
    voice.speak(f[0] === '凶' ? 'きょう' : f[1] === 'daikichi' ? 'だいきち' : f[0]);
    if (wotd) {
      g.learner.introduce('w:' + wotd.id);
      setTimeout(() => voice.speak(wotd!.r), 1600);
    }
    g.addMon(f[3]);
    await new Promise<void>((res) => sh.x.addEventListener('click', () => res()));
  }

  // ───────────────────────── typing dojo ─────────────────────────
  async typingDojo() {
    const g = this.g;
    const keys = g.learner.reviewSet(12);
    if (keys.length < 4) {
      g.app.screens.toast('Aprenda mais palavras antes do desafio de digitação.');
      return;
    }
    const sh = this.shell('Dojô de digitação', '道場');
    sh.x.addEventListener('click', () => sh.close());
    let score = 0;
    for (const key of keys) {
      if (sh.closed) return;
      const w = g.learner.word(key);
      if (!w) continue;
      const kata = /^[ァ-ヺー]+$/.test(w.r);
      const box = h(`<div class="center"><div class="typebox"><div class="pt">${esc(w.pt.split(';')[0])}</div><div class="target">${g.showRomaji(key) ? '' : ''}？</div><div class="typed">　</div><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="romaji"><div class="muted small">Digite a palavra em romaji. Enter confirma.</div></div></div>`);
      sh.play.innerHTML = '';
      sh.play.appendChild(box);
      const input = box.querySelector('input') as HTMLInputElement;
      const typed = box.querySelector('.typed') as HTMLElement;
      const target = box.querySelector('.target') as HTMLElement;
      input.focus();
      const ok = await new Promise<boolean>((res) => {
        const t0 = performance.now();
        input.addEventListener('input', () => {
          typed.textContent = romajiToKana(input.value, kata) || '　';
          sfx.type();
          if (normalizeKana(romajiToKana(input.value, kata, true)) === normalizeKana(w.r)) res(true);
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') res(normalizeKana(romajiToKana(input.value, kata, true)) === normalizeKana(w.r));
        });
        setTimeout(() => res(false), 20000);
        void t0;
      });
      target.innerHTML = rubyWord(w.w, w.r, true);
      g.learner.answer(key, ok);
      if (ok) {
        score++;
        sfx.correct(score);
      } else {
        sfx.wrong();
        typed.textContent = `${w.r} (${toRomaji(w.r)})`;
      }
      voice.speak(w.r);
      sh.score.textContent = String(score);
      await sleep(ok ? 700 : 1600);
    }
    if (sh.closed) return;
    g.addMon(score * 4);
    sh.close();
  }

  // ───────────────────────── arcade (listening speed) ─────────────────────────
  async arcade() {
    const g = this.g;
    const keys = g.learner.reviewSet(30);
    if (keys.length < 6) {
      g.app.screens.toast('Aprenda mais palavras para jogar no fliperama!');
      return;
    }
    const sh = this.shell('Fliperama do ouvido', 'ゲーセン', 'battle');
    sh.x.addEventListener('click', () => sh.close());
    let score = 0, left = 60;
    const t0 = Date.now();
    const box = h(`<div class="center" style="align-items:center"><div style="width:min(640px,96vw)" class="ab"></div></div>`);
    sh.play.appendChild(box);
    const ab = box.querySelector('.ab') as HTMLElement;
    const clock = setInterval(() => {
      left = 60 - Math.floor((Date.now() - t0) / 1000);
      sh.time.textContent = `${Math.max(0, left)}s`;
    }, 250);
    let i = 0;
    while (left > 0 && !sh.closed) {
      const key = keys[i++ % keys.length];
      const w = g.learner.word(key);
      if (!w) continue;
      const r = await askQuestion(ab, wordQuestion(w, 'listen'), { ...g.prefs(), autoSpeak: true }, { timer: 6000 });
      g.learner.answer(key, r.correct);
      if (r.correct) score += Math.max(10, 50 - Math.floor(r.timeMs / 200));
      sh.score.textContent = String(score);
    }
    clearInterval(clock);
    if (sh.closed) return;
    const best = Math.max(score, g.save.flags.arcadeBest ?? 0);
    g.save.flags.arcadeBest = best;
    g.addMon(Math.round(score / 20));
    ab.innerHTML = `<div class="paper result-card" style="border-radius:18px"><div class="big">耳</div><div class="stats"><div class="stat"><b>${score}</b><span>pontos</span></div><div class="stat"><b>${best}</b><span>recorde</span></div></div></div>`;
    sfx.victory();
    await sleep(2600);
    sh.close();
  }

  // ───────────────────────── onsen rest (listening & shadowing) ─────────────────────────
  async onsenRest() {
    const g = this.g;
    const known = [...g.learner.items.entries()].filter(([k, it]) => k.startsWith('w:') && it.s >= 2).map(([k]) => g.learner.word(k)!).filter((w) => w?.exjp);
    if (known.length < 3) {
      g.app.screens.toast('Ahh… que água gostosa. (Aprenda mais palavras para ouvir frases aqui.)');
      return;
    }
    const sh = this.shell('Descanso nas termas', '温泉', 'onsen');
    sh.x.addEventListener('click', () => sh.close());
    const box = h(`<div class="center"><div style="width:min(640px,96vw);text-align:center;color:#fff" class="ob"></div></div>`);
    sh.play.appendChild(box);
    const ob = box.querySelector('.ob') as HTMLElement;
    for (const w of shuffle(known).slice(0, 8)) {
      if (sh.closed) return;
      ob.innerHTML = `<div class="muted small">Ouça e repita em voz alta (shadowing)</div><div class="jp" style="font-size:clamp(22px,5vw,34px);margin:10px 0">${esc(w.exjp)}</div><div style="color:var(--muted)">${esc(w.exr)}</div><div style="color:var(--gold2);margin-top:8px">${esc(w.expt)}</div>`;
      await new Promise<void>((res) => voice.speak(w.exjp, { rate: 0.85, onend: () => res() }));
      await sleep(2600);
      if (isDue(g.learner.get('w:' + w.id), Date.now())) g.learner.answer('w:' + w.id, true);
    }
    sh.close();
  }

  // ───────────────────────── sushi counter ─────────────────────────
  async sushi() {
    const g = this.g;
    const MENU = [
      { jp: 'まぐろ', pt: 'atum', pic: '🍣' }, { jp: 'サーモン', pt: 'salmão', pic: '🍣' }, { jp: 'えび', pt: 'camarão', pic: '🍤' },
      { jp: 'たまご', pt: 'omelete', pic: '🍳' }, { jp: 'いか', pt: 'lula', pic: '🦑' }, { jp: 'いくら', pt: 'ovas de salmão', pic: '🔴' },
      { jp: 'のりまき', pt: 'rolinho de alga', pic: '🍙' }, { jp: 'みそしる', pt: 'sopa de missô', pic: '🍲' }, { jp: 'おちゃ', pt: 'chá', pic: '🍵' },
    ];
    const NUM = ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ'];
    const sh = this.shell('Balcão de sushi', '寿司', 'market');
    sh.x.addEventListener('click', () => sh.close());
    let score = 0;
    for (let round = 0; round < 6 && !sh.closed; round++) {
      const lvl = Math.min(3, 1 + Math.floor(round / 2));
      const order = shuffle(MENU).slice(0, lvl).map((m) => ({ m, n: 1 + Math.floor(Math.random() * (round < 2 ? 2 : 4)) }));
      const say = order.map((o) => `${o.m.jp}を ${NUM[o.n]}`).join('、') + '、ください！';
      const spaced = order.map((o) => `${o.m.jp} を ${NUM[o.n]}`).join('、 ') + '、 ください！';
      const box = h(`<div style="height:100%;display:flex;flex-direction:column;justify-content:center"><div class="order"><div class="muted small">Cliente ${round + 1}/6</div><div class="jp">「${esc(say)}」</div><div class="r">${g.learner.leaves < 120 ? esc(toRomaji(spaced)) : ''}</div><button class="round" style="margin-top:6px;background:#2a2318;color:#fff">${ICON.speaker}</button></div><div class="sushi-row"></div><div class="row center"></div></div>`);
      sh.play.innerHTML = '';
      sh.play.appendChild(box);
      const speak = () => voice.speak(say, { rate: 0.9 });
      box.querySelector('.round')!.addEventListener('click', speak);
      speak();
      const counts = new Map<string, number>();
      const row = box.querySelector('.sushi-row') as HTMLElement;
      for (const m of MENU) {
        const b = h(`<button class="sushi"><div class="pic">${m.pic}</div><span class="jp">${m.jp}</span><small>${esc(m.pt)}</small><span class="n" style="display:none"></span></button>`);
        b.addEventListener('click', () => {
          const n = ((counts.get(m.jp) ?? 0) + 1) % 6;
          counts.set(m.jp, n);
          const badge = b.querySelector('.n') as HTMLElement;
          badge.style.display = n ? '' : 'none';
          badge.textContent = String(n);
          sfx.click();
          voice.speak(m.jp);
        });
        row.appendChild(b);
      }
      const ok = await new Promise<boolean>((res) => {
        box.querySelector('.row')!.appendChild(g.app.screens.btn('Servir! どうぞ', () => {
          const right = order.every((o) => counts.get(o.m.jp) === o.n) && [...counts.entries()].filter(([, n]) => n > 0).length === order.length;
          res(right);
        }, 'primary'));
      });
      if (ok) {
        score++;
        sfx.correct(score);
        voice.speak('ありがとう！ いただきます！', { pitch: 1.1 });
      } else {
        sfx.wrong();
        voice.speak('あれ？ ちがいますよ。', { pitch: 1.1 });
      }
      (box.querySelector('.order .r') as HTMLElement).innerHTML = `${ok ? '✅ Pedido certo!' : '❌ Era:'} ${order.map((o) => `${o.m.jp} ×${o.n} (${o.m.pt})`).join(', ')}`;
      sh.score.textContent = String(score);
      await sleep(2000);
    }
    if (sh.closed) return;
    g.addMon(score * 8);
    sh.close();
  }
}
