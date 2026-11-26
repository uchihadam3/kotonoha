/**
 * Achievements (実績): medals for everything the island offers. Checked a couple of times a second; each one
 * plays a fanfare, pays mon and shows up on the medal wall in the Book.
 */
import type { Game } from './game';
import { h, esc } from '../core/util';
import { sfx } from '../audio/sfx';
import { completion } from './completion';

interface Ach {
  id: string;
  jp: string;
  pt: string;
  how: string;
  mon: number;
  icon: string;
  test: (g: Game) => boolean;
}

const fishSpecies = (g: Game) => Object.keys(g.save.flags).filter((k) => k.startsWith('fish:')).length;
const words = (g: Game) => g.learner.counts().words;

export const ACHIEVEMENTS: Ach[] = [
  { id: 'w10', jp: '最初の葉', pt: 'Primeiras folhas', how: 'Aprenda 10 palavras', mon: 30, icon: '🌱', test: (g) => words(g) >= 10 },
  { id: 'w100', jp: '百の言葉', pt: 'Cem palavras', how: 'Aprenda 100 palavras', mon: 80, icon: '🍃', test: (g) => words(g) >= 100 },
  { id: 'w1000', jp: '千の言葉', pt: 'Mil palavras', how: 'Aprenda 1.000 palavras', mon: 300, icon: '🌿', test: (g) => words(g) >= 1000 },
  { id: 'w5000', jp: '五千の言葉', pt: 'Cinco mil palavras', how: 'Aprenda 5.000 palavras', mon: 800, icon: '🌳', test: (g) => words(g) >= 5000 },
  { id: 'w10000', jp: '言霊使い', pt: 'Senhor do Kotodama', how: 'Aprenda 10.000 palavras', mon: 2000, icon: '🌸', test: (g) => words(g) >= 10000 },
  { id: 'k50', jp: '漢字の芽', pt: 'Broto de kanji', how: 'Aprenda 50 kanji', mon: 80, icon: '書', test: (g) => g.learner.counts().kanji >= 50 },
  { id: 'k500', jp: '漢字の林', pt: 'Bosque de kanji', how: 'Aprenda 500 kanji', mon: 400, icon: '林', test: (g) => g.learner.counts().kanji >= 500 },
  { id: 'kall', jp: '漢字の森', pt: 'Floresta de kanji', how: 'Aprenda os 2.136 kanji', mon: 2000, icon: '森', test: (g) => { const c = completion(g); return c.kanji >= c.kanjiMax; } },
  { id: 'kana', jp: '仮名の達人', pt: 'Mestre dos kana', how: 'Aprenda todos os kana', mon: 300, icon: 'あ', test: (g) => { const c = completion(g); return c.kana >= c.kanaMax; } },
  { id: 'win1', jp: '初勝利', pt: 'Primeira vitória', how: 'Vença uma Sombra do Silêncio', mon: 30, icon: '⚔️', test: (g) => g.save.stats.wins >= 1 },
  { id: 'win50', jp: '影狩り', pt: 'Caçador de sombras', how: 'Vença 50 Sombras', mon: 300, icon: '🗡️', test: (g) => g.save.stats.wins >= 50 },
  { id: 'special', jp: '言霊斬り', pt: 'Golpe de palavra', how: 'Faça o ataque especial (5 acertos seguidos)', mon: 50, icon: '⚡', test: (g) => (g.save.flags.specials ?? 0) >= 1 },
  { id: 'combo20', jp: '連鎖の達人', pt: 'Mestre do combo', how: 'Faça um combo de 20', mon: 200, icon: '🔥', test: (g) => g.save.stats.bestCombo >= 20 },
  { id: 'boss1', jp: '封印', pt: 'Primeiro selo', how: 'Vença uma Grande Sombra', mon: 150, icon: '🔴', test: (g) => g.save.bosses.length >= 1 },
  { id: 'bossall', jp: '島の守り手', pt: 'Guardião da ilha', how: 'Conquiste os 10 selos', mon: 1500, icon: '⛩️', test: (g) => g.save.bosses.length >= 10 },
  { id: 'fish1', jp: '初釣り', pt: 'Primeiro peixe', how: 'Pesque um peixe', mon: 20, icon: '🎣', test: (g) => fishSpecies(g) >= 1 },
  { id: 'fish10', jp: '釣り名人', pt: 'Pescador de verdade', how: 'Pesque 10 espécies diferentes', mon: 200, icon: '🐟', test: (g) => fishSpecies(g) >= 10 },
  { id: 'fishall', jp: '図鑑完成', pt: 'Enciclopédia completa', how: 'Complete o 図鑑 dos peixes', mon: 1200, icon: '📖', test: (g) => fishSpecies(g) >= 22 },
  { id: 'legend', jp: '伝説の魚', pt: 'Peixe lendário', how: 'Pesque um peixe lendário', mon: 400, icon: '✨', test: (g) => !!(g.save.flags['fish:金の鯉'] || g.save.flags['fish:大王烏賊']) },
  { id: 'chest1', jp: '宝探し', pt: 'Caça ao tesouro', how: 'Abra um baú', mon: 20, icon: '🗝️', test: (g) => g.treasures.found >= 1 },
  { id: 'chest10', jp: '宝の山', pt: 'Montanha de tesouros', how: 'Abra 10 baús', mon: 250, icon: '💰', test: (g) => g.treasures.found >= 10 },
  { id: 'chestall', jp: '全ての宝', pt: 'Todos os tesouros', how: 'Abra todos os baús da ilha', mon: 1000, icon: '👑', test: (g) => g.treasures.found >= g.treasures.chests.length },
  { id: 'req1', jp: '頼りになる', pt: 'Alguém confiável', how: 'Complete um pedido お願い', mon: 30, icon: '🤝', test: (g) => (g.save.flags.reqDone ?? 0) >= 1 },
  { id: 'req20', jp: '島の人気者', pt: 'Querido da ilha', how: 'Complete 20 pedidos', mon: 400, icon: '💌', test: (g) => (g.save.flags.reqDone ?? 0) >= 20 },
  { id: 'shop1', jp: 'お買い物', pt: 'Primeira compra', how: 'Compre algo na loja de roupas', mon: 20, icon: '🛍️', test: (g) => g.save.items.length >= 1 },
  { id: 'shop10', jp: 'おしゃれ', pt: 'Estiloso', how: 'Tenha 10 peças de roupa', mon: 300, icon: '👘', test: (g) => g.save.items.length >= 10 },
  { id: 'star1', jp: '完璧', pt: 'Perfeito!', how: 'Termine uma lição com 3 estrelas', mon: 40, icon: '⭐', test: (g) => (g.save.flags.stars3 ?? 0) >= 1 },
  { id: 'star25', jp: '優等生', pt: 'Aluno exemplar', how: '25 lições com 3 estrelas', mon: 350, icon: '🌟', test: (g) => (g.save.flags.stars3 ?? 0) >= 25 },
  { id: 'convo5', jp: '話し上手', pt: 'Bom de papo', how: 'Complete 5 conversas', mon: 120, icon: '💬', test: (g) => completion(g).convos >= 5 },
  { id: 'convoall', jp: '会話の達人', pt: 'Mestre da conversa', how: 'Complete todas as conversas', mon: 800, icon: '🗣️', test: (g) => { const c = completion(g); return c.convos >= c.convosMax; } },
  { id: 'days3', jp: '三日坊主卒業', pt: 'Constante', how: 'Complete todas as missões em 3 dias', mon: 200, icon: '📅', test: (g) => (g.save.flags.missionDays ?? 0) >= 3 },
  { id: 'perfect', jp: '完全制覇', pt: 'Domínio Total', how: 'Chegue a 100% de tudo', mon: 5000, icon: '🏆', test: (g) => completion(g).pct >= 1 },
];

export class Achievements {
  private queue: Ach[] = [];
  private busy = false;
  constructor(private g: Game) {
    if (!document.getElementById('ach-css')) {
      const st = document.createElement('style');
      st.id = 'ach-css';
      st.textContent = ACH_CSS;
      document.head.appendChild(st);
    }
  }

  get got() {
    return ACHIEVEMENTS.filter((a) => this.g.save.flags['ach:' + a.id]).length;
  }

  /** look for newly earned medals (quietly marks the ones earned before this feature existed only once) */
  check() {
    const f = this.g.save.flags;
    for (const a of ACHIEVEMENTS) {
      if (f['ach:' + a.id]) continue;
      let ok = false;
      try {
        ok = a.test(this.g);
      } catch {
        ok = false;
      }
      if (!ok) continue;
      f['ach:' + a.id] = 1;
      this.g.addMon(a.mon);
      this.queue.push(a);
    }
    void this.show();
  }

  private async show() {
    if (this.busy) return;
    this.busy = true;
    while (this.queue.length) {
      const a = this.queue.shift()!;
      sfx.rankUp();
      const el = h(`<div class="achpop"><div class="ai">${a.icon}</div><div><div class="al">実績解除 · CONQUISTA</div><div class="aj jp">${esc(a.jp)}</div><div class="ap">${esc(a.pt)} · +${a.mon} 文</div></div></div>`);
      this.g.ui.appendChild(el);
      await new Promise((r) => setTimeout(r, 3600));
      el.classList.add('out');
      await new Promise((r) => setTimeout(r, 450));
      el.remove();
    }
    this.busy = false;
  }

  /** the medal wall (Book → Progresso) */
  wall(): HTMLElement {
    const f = this.g.save.flags;
    return h(`<div class="achwall"><h3><span class="jp">実績</span> Conquistas ${this.got}/${ACHIEVEMENTS.length}</h3><div class="ag">${ACHIEVEMENTS.map((a) => {
      const ok = !!f['ach:' + a.id];
      return `<div class="ac ${ok ? 'ok' : ''}" title="${esc(a.how)}"><div class="ai">${ok ? a.icon : '？'}</div><div class="aj jp">${esc(a.jp)}</div><small>${esc(ok ? a.pt : a.how)}</small></div>`;
    }).join('')}</div></div>`);
  }
}

export const ACH_CSS = `
.achpop { position: absolute; left: 50%; top: calc(76px + var(--safe-t)); transform: translateX(-50%); z-index: 85; display: flex; align-items: center; gap: 12px; padding: 10px 18px 10px 12px; border-radius: 16px; background: linear-gradient(90deg, #2a1d08, #4a3510); color: #fff; box-shadow: 0 0 0 2px #e9c46a, 0 16px 40px rgba(0,0,0,.5), 0 0 40px rgba(233,196,106,.4); animation: achin .6s cubic-bezier(.3,1.6,.5,1); pointer-events: none; max-width: calc(100vw - 24px); }
.achpop.out { animation: achout .45s ease forwards; }
.achpop .ai { font-size: 38px; line-height: 1; filter: drop-shadow(0 0 10px rgba(255,210,120,.8)); font-family: var(--brush); color: #ffd76a; }
.achpop .al { font-size: 10px; letter-spacing: .2em; color: #e9c46a; }
.achpop .aj { font-size: 20px; color: #fff3d0; }
.achpop .ap { font-size: 13px; color: #e8dcc0; }
@keyframes achin { from { transform: translate(-50%, -40px) scale(.7); opacity: 0; } }
@keyframes achout { to { transform: translate(-50%, -30px); opacity: 0; } }
.achwall { margin-top: 18px; }
.achwall h3 { font-family: var(--latin); letter-spacing: .08em; color: var(--gold2); margin: 0 0 10px; }
.achwall .ag { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; }
.achwall .ac { text-align: center; padding: 10px 6px; border-radius: 12px; background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); opacity: .6; }
.achwall .ac.ok { opacity: 1; background: rgba(233,196,106,.1); box-shadow: inset 0 0 0 1px rgba(233,196,106,.5); }
.achwall .ac .ai { font-size: 28px; font-family: var(--brush); color: #ffd76a; }
.achwall .ac .aj { font-size: 15px; color: #fff; }
.achwall .ac small { display: block; font-size: 11px; color: var(--muted); line-height: 1.3; margin-top: 2px; }
`;
