/**
 * Requests (お願い): islanders ask, in Japanese, for you to find something somewhere on the island. The thing is
 * one of the words floating over objects in the world, written only in Japanese, so the hunt is also reading
 * practice: match the kanji you were given with the labels you see. Find it, come back, get the reward.
 */
import type { Game } from './game';
import type { NpcActor, WordSpotActor } from './actors';
import type { Line } from '../ui/dialog';
import { REGION_BY_ID } from '../data/regions';
import { esc } from '../core/util';
import { sfx } from '../audio/sfx';
import { ICON } from '../ui/icons';

export interface ActiveRequest {
  npc: string;
  /** word id of the thing to find */
  w: string;
  found: boolean;
}

/** ways of asking, from polite to casual, so the request itself teaches a register */
const ASKS: { jp: (x: string) => string; pt: string; reg: string }[] = [
  { jp: (x) => `すみません、${x}を 探して いただけませんか。`, pt: 'Com licença, poderia procurar isto para mim?', reg: 'polido' },
  { jp: (x) => `${x}を 見つけて くれる？`, pt: 'Você encontra isto para mim?', reg: 'casual' },
  { jp: (x) => `お願いが あるの。${x}は どこに あるか、見て きて くれない？`, pt: 'Tenho um pedido: vai ver onde fica isto para mim?', reg: 'casual' },
  { jp: (x) => `恐れ入りますが、${x}を 探して いただけますでしょうか。`, pt: 'Desculpe o incômodo, mas poderia procurar isto?', reg: 'keigo' },
  { jp: (x) => `ねえねえ、${x}って どこ？ 探して！`, pt: 'Ei, cadê isto? Procura pra mim!', reg: 'casual' },
];
const THANKS = [
  ['ありがとう！ 助かったよ！', 'Obrigado! Você me salvou!'],
  ['本当に ありがとうございます！', 'Muito obrigado mesmo!'],
  ['わあ、すごい！ さすが！', 'Uau, incrível! Como esperado!'],
  ['恐れ入ります。心より 感謝 いたします。', 'Agradeço do fundo do coração.'],
];

export class Requests {
  constructor(private g: Game) {}

  get active(): ActiveRequest | null {
    return (this.g.save as unknown as { req?: ActiveRequest }).req ?? null;
  }
  private set active(r: ActiveRequest | null) {
    (this.g.save as unknown as { req?: ActiveRequest | null }).req = r;
  }

  private spotOf(r: ActiveRequest): WordSpotActor | undefined {
    return this.g.wordSpots.find((s) => s.word.id === r.w);
  }
  npcOf(r: ActiveRequest): NpcActor | undefined {
    return this.g.npcs.find((n) => n.def.id === r.npc);
  }

  /** pick something to find: in an open place, not right beside the person, not too far */
  private pickSpot(n: NpcActor): WordSpotActor | null {
    const open = this.g.learner.unlockedRegions();
    const done = new Set(Object.keys(this.g.save.flags).filter((k) => k.startsWith('reqw:')).map((k) => k.slice(5)));
    const cands = this.g.wordSpots.filter((s) => {
      const reg = this.g.world.nearestRegion(s.pos.x, s.pos.z);
      if (!reg || !open.has(reg.id)) return false;
      const d = Math.hypot(s.pos.x - n.pos.x, s.pos.z - n.pos.z);
      return d > 14 && d < 230;
    });
    if (!cands.length) return null;
    // prefer things never asked before, then the nearer ones
    cands.sort((a, b) => Number(done.has(a.word.id)) - Number(done.has(b.word.id)) || Math.hypot(a.pos.x - n.pos.x, a.pos.z - n.pos.z) - Math.hypot(b.pos.x - n.pos.x, b.pos.z - n.pos.z));
    const top = cands.slice(0, Math.min(8, cands.length));
    return top[Math.floor(Math.random() * top.length)];
  }

  /** menu entries for this person (offer, or deliver) */
  options(n: NpcActor, base: Partial<Line>): { label: string; sub?: string; icon?: string; act: () => Promise<boolean | void> }[] {
    const r = this.active;
    if (r && r.npc === n.def.id) {
      const s = this.spotOf(r);
      const w = s?.word;
      if (r.found) return [{ label: `Entregar o pedido: ${w ? w.w : ''}`, sub: 'Você encontrou! Conte para quem pediu.', icon: ICON.check, act: () => this.deliver(n, base) }];
      return [{ label: `Pedido: ${w ? w.w : '?'}`, sub: 'Ainda procurando… toque para ouvir o pedido de novo', icon: ICON.eye, act: () => this.remind(n, base) }];
    }
    if (r) return [];
    if (n.def.role === 'guide') return [];
    return [{ label: 'Pedido: "お願いが あるんだけど…"', sub: 'Ajude esta pessoa: procure algo pela ilha (+文 e palavra nova)', icon: ICON.quest, act: () => this.offer(n, base) }];
  }

  private async offer(n: NpcActor, base: Partial<Line>): Promise<boolean> {
    const g = this.g;
    const s = this.pickSpot(n);
    if (!s) {
      await g.dialog.say({ ...base, jp: '今は 大丈夫。ありがとう！', pt: 'Agora não preciso de nada. Obrigado!' } as Line);
      return true;
    }
    const w = s.word;
    const ask = ASKS[Math.floor(Math.random() * ASKS.length)];
    const reg = g.world.nearestRegion(s.pos.x, s.pos.z);
    await g.dialog.say({ ...base, jp: ask.jp(w.w), pt: `${ask.pt} → ${w.w} (${w.r})` } as Line);
    await g.dialog.say({ ...base, who: 'Kon', whoJp: 'コン', role: 'dica', voice: { pitch: 1.45, rate: 1 }, speaker: null, pt: `🔎 Procure as letras ${w.w} flutuando sobre algo${reg ? ` perto de ${reg.name}` : ''}. Quando achar, examine e volte aqui. (Significa "${w.pt.split(';')[0]}".)` } as Line);
    this.active = { npc: n.def.id, w: w.id, found: false };
    g.persist();
    g.story.updateQuest();
    sfx.blip();
    return true;
  }

  private async remind(n: NpcActor, base: Partial<Line>): Promise<boolean> {
    const r = this.active!;
    const s = this.spotOf(r);
    if (!s) {
      this.active = null;
      return true;
    }
    const reg = this.g.world.nearestRegion(s.pos.x, s.pos.z);
    await this.g.dialog.say({ ...base, jp: `${s.word.w}、まだ 見つからない？`, pt: `Ainda não achou ${s.word.w} (${s.word.r})?${reg ? ` Fica perto de ${reg.name}.` : ''}` } as Line);
    return true;
  }

  /** called when the player examines a word in the world */
  onExamine(s: WordSpotActor) {
    const r = this.active;
    if (!r || r.found || r.w !== s.word.id) return;
    r.found = true;
    this.g.persist();
    sfx.unlock();
    const n = this.npcOf(r);
    this.g.app.screens.toast(`🔎 Achou <span class="jp">${esc(s.word.w)}</span>! Volte para <b>${esc(n?.def.name ?? '')}</b> e conte.`, 5500);
    this.g.story.updateQuest();
  }

  private async deliver(n: NpcActor, base: Partial<Line>): Promise<boolean> {
    const g = this.g;
    const r = this.active!;
    const s = this.spotOf(r);
    const t = THANKS[Math.floor(Math.random() * THANKS.length)];
    await g.dialog.say({ ...base, jp: `${s ? s.word.w + 'を ' : ''}見つけて くれたの？ ${t[0]}`, pt: t[1] } as Line);
    const dist = s ? Math.hypot(s.pos.x - n.pos.x, s.pos.z - n.pos.z) : 50;
    const mon = 30 + Math.round(dist / 4);
    g.addMon(mon);
    g.save.flags['reqw:' + r.w] = 1;
    g.save.flags.reqDone = (g.save.flags.reqDone ?? 0) + 1;
    // finding it counts as a correct review of that word
    if (s) {
      const key = 'w:' + s.word.id;
      g.learner.introduce(key);
      g.learner.answer(key, true);
    }
    this.active = null;
    g.persist();
    n.char.emote('happy', 2);
    g.world.bursts.spark(n.pos.clone().setY(n.pos.y + 1.6), '#ffe9a8', 30, 2.5);
    g.app.screens.toast(`お願い completo! +${mon} 文 · pedidos feitos: ${g.save.flags.reqDone}`, 4500);
    g.story.updateQuest();
    return true;
  }

  /** a line for the HUD objective */
  questLine(): string {
    const r = this.active;
    if (!r) return '';
    const s = this.spotOf(r);
    const n = this.npcOf(r);
    if (!s || !n) return '';
    if (r.found) return `🔎 Pedido: volte para <b>${esc(n.def.name)}</b> (${esc(REGION_BY_ID[n.def.region ?? '']?.name ?? '')})`;
    const reg = this.g.world.nearestRegion(s.pos.x, s.pos.z);
    return `🔎 Pedido de ${esc(n.def.name)}: ache <span class="jp">${esc(s.word.w)}</span> (${esc(s.word.r)})${reg ? ` · ${esc(reg.name)}` : ''}`;
  }
}
