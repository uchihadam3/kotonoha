/**
 * Daily missions (今日のミッション): three small goals a day, drawn from everything the island offers
 * (shadows, fishing, chests, requests, conversations, new words...). Each pays mon; all three pay a bonus.
 */
import type { Game } from './game';
import { h, esc, todayKey, fmtNum } from '../core/util';
import { ICON } from '../ui/icons';
import { sfx } from '../audio/sfx';

export type MissionKind = 'win' | 'fish' | 'chest' | 'request' | 'words' | 'convo' | 'special' | 'game' | 'review';
const POOL: { kind: MissionKind; n: number; jp: string; pt: string; mon: number; need?: number }[] = [
  { kind: 'win', n: 2, jp: '影を 二つ 倒そう', pt: 'Vença 2 Sombras do Silêncio', mon: 60 },
  { kind: 'fish', n: 3, jp: '魚を 三匹 釣ろう', pt: 'Pesque 3 peixes (Vovô Umi, na praia)', mon: 50 },
  { kind: 'chest', n: 1, jp: '宝箱を 開けよう', pt: 'Abra 1 baú do tesouro 宝', mon: 60 },
  { kind: 'request', n: 1, jp: 'お願いを 聞こう', pt: 'Complete o pedido de alguém com ！', mon: 70 },
  { kind: 'words', n: 8, jp: '新しい 言葉を 八つ', pt: 'Aprenda 8 palavras novas (folhas)', mon: 60 },
  { kind: 'convo', n: 1, jp: '会話を しよう', pt: 'Complete 1 conversa com um morador', mon: 50 },
  { kind: 'special', n: 1, jp: '言霊斬りを 決めよう', pt: 'Faça o ataque especial 言霊斬り (5 acertos seguidos)', mon: 70, need: 20 },
  { kind: 'game', n: 2, jp: 'ミニゲームで 遊ぼう', pt: 'Jogue 2 minijogos', mon: 40 },
  { kind: 'review', n: 10, jp: '十回 復習しよう', pt: 'Acerte 10 revisões (sombras ou santuários)', mon: 50, need: 15 },
];

function hash(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return (x >>> 0) / 4294967295;
}

export const MISSION_CSS = `
.mlist { display: grid; gap: 10px; margin-top: 10px; }
.mrow { padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px rgba(233,196,106,.2); display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; }
.mrow .mj { font-size: 17px; color: var(--gold2); grid-column: 1 / -1; }
.mrow .mp { font-size: 13px; color: #ddd; }
.mrow .mn { font-size: 12px; color: var(--muted); align-self: center; font-variant-numeric: tabular-nums; }
.mrow .mbar { grid-column: 1 / -1; height: 6px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden; margin-top: 4px; }
.mrow .mbar i { display: block; height: 100%; background: linear-gradient(90deg, var(--jade2), var(--jade)); }
.mrow.done { box-shadow: inset 0 0 0 2px var(--gold); }
.mrow.done .mbar i { background: linear-gradient(90deg, #d9a93a, var(--gold2)); }
`;

let cssDone = false;
export class Missions {
  constructor(private g: Game) {
    if (!cssDone) {
      cssDone = true;
      const st = document.createElement('style');
      st.textContent = MISSION_CSS;
      document.head.appendChild(st);
    }
  }

  private get day() {
    return Number(todayKey().replace(/-/g, ''));
  }

  /** today's three missions (stable for the day, different every day) */
  today() {
    const f = this.g.save.flags;
    if (f['m:day'] !== this.day) {
      for (const k of Object.keys(f)) if (k.startsWith('m:')) delete f[k];
      f['m:day'] = this.day;
    }
    const words = this.g.learner?.leaves ?? 0;
    const pool = POOL.filter((m) => !m.need || words >= m.need);
    const picks = [...pool].sort((a, b) => hash(a.kind + this.day + this.g.save.slot) - hash(b.kind + this.day + this.g.save.slot)).slice(0, 3);
    return picks.map((m) => ({ ...m, got: Math.min(m.n, f['m:' + m.kind] ?? 0), done: !!f['m:ok:' + m.kind] }));
  }

  /** count progress; pays out when a mission (or all three) completes */
  bump(kind: MissionKind, n = 1) {
    const list = this.today();
    const m = list.find((x) => x.kind === kind);
    if (!m || m.done) return;
    const f = this.g.save.flags;
    f['m:' + kind] = (f['m:' + kind] ?? 0) + n;
    if (f['m:' + kind] >= m.n) {
      f['m:ok:' + kind] = 1;
      this.g.addMon(m.mon);
      sfx.unlock();
      this.g.app.screens.toast(`🎯 Missão do dia completa: <b>${esc(m.pt)}</b> · +${m.mon} 文`, 5000);
      if (this.today().every((x) => x.done) && !f['m:all']) {
        f['m:all'] = 1;
        f.missionDays = (f.missionDays ?? 0) + 1;
        setTimeout(() => {
          this.g.addMon(150);
          sfx.rankUp();
          this.g.app.screens.toast(`🏆 <span class="jp">皆勤賞</span> Todas as missões de hoje! +150 文 · dias completos: ${f.missionDays}`, 6500);
        }, 1800);
      }
    }
  }

  /** a short line for the objective card */
  questLine(): string {
    const list = this.today();
    const left = list.filter((m) => !m.done);
    if (!left.length) return '🎯 Missões de hoje: completas! 皆勤賞';
    const m = left[0];
    return `🎯 Missão (${list.length - left.length}/3): ${esc(m.pt)} <b>${m.got}/${m.n}</b>`;
  }

  /** the missions board */
  open() {
    const list = this.today();
    const el = this.g.app.screens.screen('dim center', `<div class="panel" style="width:min(520px,94vw)"><button class="close">${ICON.close}</button>
      <h2><span class="jp">今日</span>Missões do dia</h2><p class="muted small">Três desafios novos todo dia. Complete todos para o bônus 皆勤賞 (+150 文). Você tem ${fmtNum(this.g.save.mon)} 文.</p>
      <div class="mlist">${list.map((m) => `<div class="mrow ${m.done ? 'done' : ''}"><div class="mj jp">${esc(m.jp)}</div><div class="mp">${esc(m.pt)}</div><div class="mbar"><i style="width:${(m.got / m.n) * 100}%"></i></div><div class="mn">${m.done ? '✔' : `${m.got}/${m.n}`} · +${m.mon} 文</div></div>`).join('')}</div></div>`);
    el.querySelector('.close')!.addEventListener('click', () => {
      sfx.back();
      el.remove();
    });
    return el;
  }
}

