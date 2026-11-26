/** Runs situational conversations and the register drill ("how would you say it to…?"). */
import type { Game } from './game';
import type { NpcActor } from './actors';
import type { Line } from '../ui/dialog';
import { CONVO_BY_ID } from '../data/convos';
import registros from '../data/registros.json';
import { shuffle } from '../core/util';
import { sfx } from '../audio/sfx';
import { REGISTER_NAMES } from '../data/regions';

interface RegForm {
  w: string;
  r: string;
  note?: string;
}
interface RegConcept {
  pt: string;
  f: Record<string, RegForm>;
  note?: string;
}
const REG = registros as unknown as RegConcept[];

const SITUATION: Record<string, string[]> = {
  polido: ['para um professor', 'para um desconhecido na rua', 'para a vizinha mais velha', 'para um atendente'],
  casual: ['para um amigo da escola', 'para o seu irmão mais novo', 'para uma colega da mesma idade'],
  keigo: ['para um cliente importante', 'para o presidente da empresa', 'numa cerimônia formal'],
  giria: ['para um amigo bem próximo, no chat', 'entre jovens, zoando'],
  anime: ['como um herói de anime', 'como um personagem durão de mangá'],
  antigo: ['como um samurai do período Edo', 'como um senhor feudal'],
  kansai: ['como alguém de Osaka', 'com o sotaque de Kansai'],
};

export class Convos {
  constructor(private g: Game) {}

  info(id: string) {
    const c = CONVO_BY_ID[id];
    return c ? { title: c.title, sub: c.sub } : null;
  }

  async run(id: string, n: NpcActor) {
    const c = CONVO_BY_ID[id];
    if (!c) return;
    const g = this.g;
    g.pause(true);
    n.busy = true;
    g.player.face(n.pos.x, n.pos.z);
    g.framePair(g.player.pos, n.pos);
    const speaker = { set talking(v: boolean) { n.char.talking = v; }, get talking() { return n.char.talking; }, emote: (e: string, s?: number) => n.char.emote(e as never, s) };
    const base: Partial<Line> = { who: n.def.name, whoJp: n.def.jp, role: c.title, voice: n.def.voice, speaker };
    let right = 0, tries = 0;
    try {
      await g.dialog.say({ ...base, pt: `Situação: ${c.sub}. Escolha o que dizer em cada momento.` } as Line);
      for (const st of c.steps) {
        if (st.npc) await g.dialog.say({ ...base, jp: st.npc[0], pt: st.npc[1] } as Line);
        if (st.note) await g.dialog.say({ ...base, who: 'Kon', whoJp: 'コン', role: 'dica', voice: { pitch: 1.45, rate: 1 }, speaker: null, pt: '💡 ' + st.note } as Line);
        if (st.you) {
          const name = g.save.name || 'você';
          const opts = shuffle(st.you.map((o) => ({ ...o, jp: o.jp.replace(/○○/g, g.save.nameKana || name) })));
          for (;;) {
            tries++;
            const i = await g.dialog.choose({ who: g.save.name || 'Você', role: 'o que você diz?', pt: 'Escolha a fala certa para esta situação:' } as Line, opts.map((o) => ({ label: o.pt, jp: o.jp, reg: o.reg, good: o.ok })), true);
            const o = opts[i];
            if (o.ok) {
              right++;
              sfx.correct();
              n.char.emote('happy', 1.5);
              break;
            }
            sfx.wrong();
            n.char.emote('surprised', 1.5);
            await g.dialog.say({ ...base, who: 'Kon', whoJp: 'コン', role: 'dica', voice: { pitch: 1.45, rate: 1 }, speaker: null, pt: '🤔 ' + (o.why ?? 'Não é bem isso. Tente de novo!') } as Line);
          }
        }
      }
      const perfect = right === tries;
      g.addMon(perfect ? 40 : 20);
      g.missions.bump('convo');
      g.save.flags['convo:' + id] = Math.max(g.save.flags['convo:' + id] ?? 0, perfect ? 2 : 1);
      await g.dialog.say({ ...base, who: 'Kon', whoJp: 'コン', role: 'raposa-espírito', voice: { pitch: 1.45, rate: 1 }, speaker: null, jp: perfect ? 'かんぺき！' : 'よくできました！', pt: perfect ? `Perfeito! Conversa completa sem erros. +40 文` : `Muito bem! Você completou a conversa. +20 文 (tente de novo para fazer sem erros)` } as Line);
    } finally {
      g.dialog.close();
      n.busy = false;
      g.rig.override = null;
      g.pause(false);
      g.persist();
    }
  }

  /** "how would you say X to Y?" with forms of the same concept in different registers */
  async registerDrill(n: NpcActor, base: Partial<Line>) {
    const g = this.g;
    const regs = (n.def.registers ?? ['polido', 'casual']).filter((r) => SITUATION[r]);
    let right = 0;
    const rounds = 4;
    for (let k = 0; k < rounds; k++) {
      const target = regs[k % regs.length];
      const pool = REG.filter((c) => c.f[target] && Object.keys(c.f).length >= 3);
      if (!pool.length) break;
      const concept = shuffle([...pool])[0];
      const others = shuffle(Object.keys(concept.f).filter((r) => r !== target)).slice(0, 2);
      const sit = shuffle([...SITUATION[target]])[0];
      const opts = shuffle([target, ...others]).map((r) => ({ label: concept.f[r].r !== concept.f[r].w ? concept.f[r].r : '', jp: concept.f[r].w, good: r === target, reg: undefined as string | undefined }));
      const i = await g.dialog.choose({ ...base, pt: `Como dizer “${concept.pt}” ${sit}?` } as Line, opts, true);
      if (opts[i].good) right++;
      const f = concept.f[target];
      await g.dialog.say({ ...base, jp: f.w, pt: `${REGISTER_NAMES[target]?.jp} ${REGISTER_NAMES[target]?.pt}: ${f.w} (${f.r}). ${f.note ?? REGISTER_NAMES[target]?.desc ?? ''}` } as Line);
    }
    g.addMon(right * 5);
  }
}
