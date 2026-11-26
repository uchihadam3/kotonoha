/**
 * My house (我が家): a tatami room to decorate. Every piece of furniture is a Japanese word, bought from the
 * catalogue by understanding the price said in Japanese. The cosier the room (居心地), the bigger the daily bonus.
 */
import type { Game } from './game';
import { h, esc, fmtNum, todayKey } from '../core/util';
import { ICON } from '../ui/icons';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { numberKana, numberKanji, priceDistractors } from '../lang/numbers';

interface Furniture { id: string; jp: string; r: string; pt: string; icon: string; price: number; x: number; y: number; s: number }
/** x/y are % positions in the room picture, s the size */
export const FURNITURE: Furniture[] = [
  { id: 'zabuton', jp: '座布団', r: 'ざぶとん', pt: 'almofada de sentar', icon: '🟫', price: 80, x: 44, y: 78, s: 1 },
  { id: 'chabudai', jp: 'ちゃぶ台', r: 'ちゃぶだい', pt: 'mesinha baixa', icon: '🍵', price: 200, x: 52, y: 70, s: 1.3 },
  { id: 'futon', jp: '布団', r: 'ふとん', pt: 'futon (cama no chão)', icon: '🛏️', price: 350, x: 18, y: 80, s: 1.7 },
  { id: 'andon', jp: '行灯', r: 'あんどん', pt: 'luminária de papel', icon: '🏮', price: 150, x: 84, y: 60, s: 1.2 },
  { id: 'kakejiku', jp: '掛け軸', r: 'かけじく', pt: 'pergaminho de parede', icon: '📜', price: 300, x: 30, y: 30, s: 1.4 },
  { id: 'bonsai', jp: '盆栽', r: 'ぼんさい', pt: 'bonsai', icon: '🌳', price: 450, x: 70, y: 48, s: 1.1 },
  { id: 'hondana', jp: '本棚', r: 'ほんだな', pt: 'estante de livros', icon: '📚', price: 400, x: 90, y: 34, s: 1.5 },
  { id: 'terebi', jp: 'テレビ', r: 'てれび', pt: 'televisão', icon: '📺', price: 800, x: 64, y: 32, s: 1.4 },
  { id: 'kotatsu', jp: '炬燵', r: 'こたつ', pt: 'kotatsu (mesa aquecida)', icon: '🧺', price: 900, x: 36, y: 62, s: 1.5 },
  { id: 'manekineko', jp: '招き猫', r: 'まねきねこ', pt: 'gato da sorte', icon: '🐱', price: 500, x: 12, y: 46, s: 1 },
  { id: 'daruma', jp: '達磨', r: 'だるま', pt: 'daruma', icon: '🎎', price: 250, x: 78, y: 44, s: 1 },
  { id: 'furin', jp: '風鈴', r: 'ふうりん', pt: 'sininho de vento', icon: '🎐', price: 120, x: 50, y: 12, s: 1 },
  { id: 'suiso', jp: '水槽', r: 'すいそう', pt: 'aquário', icon: '🐠', price: 700, x: 14, y: 26, s: 1.3 },
  { id: 'gita', jp: 'ギター', r: 'ぎたー', pt: 'violão', icon: '🎸', price: 600, x: 96, y: 62, s: 1.2 },
  { id: 'kabuto', jp: '兜', r: 'かぶと', pt: 'elmo de samurai', icon: '🪖', price: 1500, x: 44, y: 22, s: 1.2 },
  { id: 'ningyo', jp: '日本人形', r: 'にほんにんぎょう', pt: 'boneca japonesa', icon: '👘', price: 1000, x: 60, y: 54, s: 1 },
];

const CSS = `
.house { position: absolute; inset: 0; z-index: 36; display: flex; flex-direction: column; background: #120c08; animation: fadein .3s; }
.house .htop { display: flex; align-items: center; gap: 10px; padding: calc(10px + var(--safe-t)) 14px 8px; color: #fff; }
.house .htop .t { flex: 1; font-family: var(--latin); letter-spacing: .08em; color: var(--gold2); font-size: 18px; }
.house .htop .t .jp { font-family: var(--brush); color: #ff9a6a; margin-right: 6px; }
.house .htop .cz { font-size: 13px; color: #ffe0b0; white-space: nowrap; }
.house .body { flex: 1; display: grid; grid-template-columns: 1fr min(380px, 42%); gap: 10px; padding: 0 12px calc(12px + var(--safe-b)); min-height: 0; }
.house .room { position: relative; border-radius: 16px; overflow: hidden; background:
  linear-gradient(180deg, #f2e6cc 0 52%, transparent 52%),
  repeating-linear-gradient(90deg, transparent 0 16.6%, rgba(90,60,30,.35) 16.6% calc(16.6% + 3px)),
  linear-gradient(180deg, #c9b27a 52%, #a8925a); box-shadow: inset 0 0 0 6px #5a3a22, inset 0 0 60px rgba(0,0,0,.35); min-height: 220px; }
.house .room::before { content: ''; position: absolute; left: 6%; right: 6%; top: 8%; height: 38%; background: repeating-linear-gradient(90deg, rgba(255,255,255,.75) 0 9%, #8a6a44 9% calc(9% + 4px)), repeating-linear-gradient(180deg, transparent 0 24%, #8a6a44 24% calc(24% + 4px)); box-shadow: 0 0 0 5px #6a4a2a; border-radius: 4px; opacity: .9; }
.house .room::after { content: ''; position: absolute; left: 0; right: 0; top: 52%; height: 6px; background: #6a4a2a; }
.house .room.night::before { background: repeating-linear-gradient(90deg, rgba(40,50,90,.85) 0 9%, #3a2a1a 9% calc(9% + 4px)), repeating-linear-gradient(180deg, transparent 0 24%, #3a2a1a 24% calc(24% + 4px)); }
.house .fi { position: absolute; transform: translate(-50%, -50%); text-align: center; animation: pop .35s; filter: drop-shadow(0 6px 4px rgba(0,0,0,.35)); cursor: pointer; border: 0; background: none; padding: 0; }
.house .fi .e { display: block; line-height: 1; }
.house .fi .n { display: block; font-family: var(--jp); font-size: 11px; color: #2a1a0a; background: rgba(255,250,240,.85); border-radius: 6px; padding: 0 4px; margin-top: 2px; white-space: nowrap; }
.house .kon { position: absolute; left: 66%; top: 76%; font-size: 40px; animation: konbob 2.4s ease-in-out infinite; }
@keyframes konbob { 50% { transform: translateY(-6px); } }
.house .cat { display: flex; flex-direction: column; min-height: 0; background: rgba(255,255,255,.04); border-radius: 14px; padding: 10px; color: #fff; }
.house .cat h3 { margin: 0 0 6px; font-family: var(--latin); color: var(--gold2); letter-spacing: .06em; font-size: 16px; }
.house .clerk { background: var(--paper); color: var(--paper-ink); border-radius: 12px; padding: 8px 12px; margin-bottom: 8px; font-size: 13px; }
.house .clerk .cj { font-family: var(--jp); font-size: 17px; }
.house .ask { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
.house .ask button { padding: 10px; border-radius: 10px; border: 0; background: var(--ink3); color: #fff; font-size: 16px; cursor: pointer; }
.house .ask button.ok { background: var(--jade2); } .house .ask button.no { background: var(--red2); }
.house .list { overflow: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(116px, 1fr)); gap: 6px; min-height: 0; }
.house .it { text-align: left; border: 0; border-radius: 10px; padding: 7px 9px; background: rgba(255,255,255,.06); color: #eee; cursor: pointer; }
.house .it .e { font-size: 22px; } .house .it .j { font-family: var(--jp); font-size: 16px; display: block; } .house .it small { display: block; color: var(--muted); font-size: 11px; }
.house .it.own { box-shadow: inset 0 0 0 1px var(--gold); opacity: .75; }
@media (max-width: 760px), (max-height: 520px) { .house .body { grid-template-columns: 1fr; grid-template-rows: minmax(190px, 1fr) auto; } .house .cat { max-height: 42vh; } }
`;
let cssDone = false;

export async function openHouse(g: Game) {
  if (!cssDone) {
    cssDone = true;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  g.pause(true);
  const save = g.save;
  const has = (f: Furniture) => save.items.includes('home:' + f.id);
  const comfort = () => FURNITURE.filter(has).length;
  const night = g.world.clock > 0.75 || g.world.clock < 0.22;
  const el = h(`<div class="house"><div class="htop"><div class="t"><span class="jp">我が家</span>Minha casa</div><span class="cz"></span><button class="hbtn x">${ICON.close}</button></div>
    <div class="body"><div class="room ${night ? 'night' : ''}"><div class="kon">🦊</div></div>
    <div class="cat"><h3><span class="jp">家具屋</span> Catálogo de móveis</h3><div class="clerk"><div class="cj"></div><div class="cp"></div></div><div class="ask"></div><div class="list"></div></div></div></div>`);
  g.ui.appendChild(el);
  const room = el.querySelector('.room') as HTMLElement;
  const list = el.querySelector('.list') as HTMLElement;
  const ask = el.querySelector('.ask') as HTMLElement;
  const cz = el.querySelector('.cz') as HTMLElement;
  const say = (jp: string, pt: string) => {
    (el.querySelector('.cj') as HTMLElement).textContent = jp;
    (el.querySelector('.cp') as HTMLElement).textContent = pt;
    voice.speak(jp, { pitch: 1.1, rate: 0.95 });
  };
  const drawRoom = () => {
    room.querySelectorAll('.fi').forEach((x) => x.remove());
    for (const f of FURNITURE.filter(has)) {
      const b = h(`<button class="fi" style="left:${f.x}%;top:${f.y}%"><span class="e" style="font-size:${Math.round(34 * f.s)}px">${f.icon}</span><span class="n">${esc(f.jp)}</span></button>`);
      b.addEventListener('click', () => {
        sfx.blip();
        voice.speak(f.r);
        say(`${f.jp}（${f.r}）`, `${f.pt}`);
      });
      room.appendChild(b);
    }
    cz.textContent = `居心地 ${comfort()}/${FURNITURE.length} · ${fmtNum(save.mon)} 文`;
  };
  const drawList = () => {
    list.innerHTML = '';
    for (const f of FURNITURE) {
      const b = h(`<button class="it ${has(f) ? 'own' : ''}"><span class="e">${f.icon}</span><span class="j">${esc(f.jp)}</span><small>${esc(f.r)} · ${esc(f.pt)}</small><small>${has(f) ? 'Na sua casa ✓' : '？？ 文'}</small></button>`);
      b.addEventListener('click', () => void buy(f));
      list.appendChild(b);
    }
  };
  let busy = false;
  const buy = async (f: Furniture) => {
    if (busy) return;
    sfx.click();
    if (has(f)) {
      say(`${f.jp}は もう ありますね。`, `Você já tem: ${f.pt}.`);
      return;
    }
    busy = true;
    const pk = numberKana(f.price) + 'もん';
    say(`${f.jp}は ${pk} です。`, 'Ouça o preço e escolha o valor certo.');
    ask.innerHTML = '';
    let tries = 0;
    await new Promise<void>((done) => {
      for (const o of [f.price, ...priceDistractors(f.price)].sort(() => Math.random() - 0.5)) {
        const ob = h(`<button>${fmtNum(o)} 文</button>`);
        ob.addEventListener('click', () => {
          if (o !== f.price) {
            tries++;
            ob.classList.add('no');
            sfx.wrong();
            say(`いいえ、${pk} です。`, tries >= 2 ? `É ${numberKanji(f.price)} 文 (${pk}).` : 'Não é esse valor. Ouça de novo.');
            return;
          }
          ask.innerHTML = '';
          if (save.mon < f.price) {
            sfx.wrong();
            say('お金が 足りませんね…', `Faltou: custa ${fmtNum(f.price)} 文 e você tem ${fmtNum(save.mon)} 文.`);
            done();
            return;
          }
          save.mon -= f.price;
          save.items.push('home:' + f.id);
          sfx.coin();
          sfx.newWord();
          say('毎度 ありがとうございます！', `Chegou: ${f.pt}! Olhe a sua sala.`);
          g.learnFromItem?.(f.jp, f.r);
          g.persist();
          done();
        });
        ask.appendChild(ob);
      }
    });
    busy = false;
    drawRoom();
    drawList();
  };
  // daily comfort bonus
  const day = Number(todayKey().replace(/-/g, ''));
  if (comfort() > 0 && save.flags.homeDay !== day) {
    save.flags.homeDay = day;
    const bonus = 15 + comfort() * 12;
    g.addMon(bonus);
    say('おかえりなさい！ ゆっくり 休んでね。', `Bem-vindo de volta! Bônus de conforto 居心地 de hoje: +${bonus} 文.`);
  } else {
    say(comfort() ? 'おかえりなさい！' : 'ここが あなたの 家です。', comfort() ? 'Bem-vindo de volta! Que tal mais um móvel?' : 'Esta é a sua casa! Compre móveis no catálogo: cada um é uma palavra. Quanto mais aconchegante, maior o bônus diário.');
  }
  drawRoom();
  drawList();
  await new Promise<void>((res) => el.querySelector('.x')!.addEventListener('click', () => res()));
  sfx.back();
  el.remove();
  g.pause(false);
  g.persist();
}
