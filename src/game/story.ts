/** Story: the tutorial with Kon, the quest tracker, special NPC moments and the ending at 10 000 words. */
import * as THREE from 'three';
import type { Game } from './game';
import type { NpcActor } from './actors';
import type { Line } from '../ui/dialog';
import { vocab } from '../lang/vocab';
import { runLesson } from './lesson';
import { REGIONS, THEME_NAMES, rankFor } from '../data/regions';
import { esc, fmtNum, sleep } from '../core/util';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';

export class Story {
  constructor(private g: Game) {}

  private konLine(l: { jp?: string; pt: string; expr?: string }): Line {
    const kon = this.g.kon;
    return {
      who: 'Kon', whoJp: 'コン', role: 'raposa-espírito', jp: l.jp, pt: l.pt, voice: { pitch: 1.45, rate: 1.0 }, expr: l.expr,
      speaker: { set talking(v: boolean) { kon.talking = v; }, get talking() { return kon.talking; }, emote: (e: string, s?: number) => kon.emote(e as never, s) },
    };
  }

  async konSays(lines: { jp?: string; pt: string; expr?: string }[]) {
    const g = this.g;
    if (g.dialog.open) return;
    g.pause(true);
    try {
      for (const l of lines) await g.dialog.say(this.konLine(l));
    } finally {
      g.dialog.close();
      g.pause(false);
    }
  }

  async tutorial() {
    const g = this.g;
    const f = g.save.flags;
    if (f.tut) return;
    await sleep(600);
    await this.konSays([
      { jp: 'はじめまして！ ぼくは コン！', pt: 'Muito prazer! Eu sou o Kon! (はじめまして = "muito prazer", quando se conhece alguém)', expr: 'happy' },
      { pt: `Sou a raposa-espírito que guarda a Grande Árvore das Palavras. Você é ${g.save.name}? Em japonês o seu nome fica ${g.save.nameKana || '…'}!` },
      { jp: '見て、あの 山の 上の 木！', pt: 'Olha aquela árvore lá no alto da montanha! É a Grande Árvore, 言の葉の大樹 (kotonoha no taiju).' },
      { pt: 'O Grande Silêncio levou todas as folhas dela. Cada palavra que você aprende e lembra vira uma folha de luz. Com 10.000 folhas, a árvore volta à vida!' },
      { pt: 'E a cada palavra, a cor volta ao mundo. Repare: agora está tudo quase cinza...' },
      { jp: 'さあ、始めよう！', pt: 'Vamos começar! Suas primeiras palavras: os cumprimentos.' },
    ]);
    const first = vocab.byTheme.get('saudacoes')?.slice(0, 5) ?? [];
    await runLesson(g, first, 'Primeiras palavras · com Kon');
    f.tut = 1;
    g.persist();
    await this.konSays([
      { jp: 'すごい！ よくできました！', pt: 'Incrível! Muito bem! (よくできました = "fez bem feito")', expr: 'happy' },
      { pt: 'Essas palavras ainda são 🌱 brotos. Daqui a alguns minutos, sombras do Silêncio vão aparecer para testar a sua memória. Vença-as e os brotos viram folhas na Árvore!' },
      { pt: g.app.input.touch ? 'Para andar, use o joystick (lado esquerdo da tela). Arraste à direita para girar a câmera. O botão ✋ fala com as pessoas e examina as coisas.' : 'Para andar: WASD ou setas (Shift corre, Espaço pula). Arraste o mouse para girar a câmera. E para falar e examinar. Tab abre o Livro das Palavras e M, o mapa.' },
      { pt: 'Está vendo as palavras flutuando sobre as coisas? Chegue perto e examine: é assim que se aprende vivendo!' },
      { jp: 'あの 漁師さんに 話しかけて みて。', pt: 'Tente falar com aquele pescador, o Vovô Umi. Ele conhece todos os cumprimentos.' },
    ]);
  }

  /** special moments when talking to someone; return true when fully handled */
  async npcHook(n: NpcActor): Promise<boolean> {
    const g = this.g;
    const f = g.save.flags;
    if (n.def.id === 'umi' && f.tut === 1) {
      f.tut = 2;
      setTimeout(() => void this.konSays([
        { jp: 'よし！ 村へ 行こう！', pt: 'Isso! Agora vamos à vila! Siga o caminho de terra para o norte, até a Vila do Amanhecer.' },
      ]), 400);
      return false;
    }
    if (n.def.id === 'mori' && (f.tut ?? 0) < 3) {
      f.tut = 3;
      await g.dialog.say({ who: n.def.name, whoJp: n.def.jp, role: n.def.title, jp: '旅の方、よく 来て くださいました。', pt: 'Viajante, que bom que você veio. (fala polida de um senhor respeitoso)', voice: n.def.voice });
      await g.dialog.say({ who: n.def.name, whoJp: n.def.jp, role: n.def.title, pt: 'Desde o Grande Silêncio, os caminhos da ilha estão fechados por uma névoa cinzenta. Só quem conhece palavras suficientes consegue atravessá-la.' });
      await g.dialog.say({ who: n.def.name, whoJp: n.def.jp, role: n.def.title, pt: 'Cada morador ensina coisas diferentes: a Vovó Haru, a família e a casa; o Kenta, os números; o Sr. Tanaka, a natureza e os animais. Fale com todos!' });
      await g.dialog.say({ who: n.def.name, whoJp: n.def.jp, role: n.def.title, pt: `Com ${REGIONS[2].req} palavras aprendidas, a névoa da Rua do Comércio vai se abrir. Boa sorte!` });
      return false;
    }
    if (n.def.id === 'kotonoha') {
      await this.treeHeart();
      return true;
    }
    return false;
  }

  /** the HUD objective */
  updateQuest() {
    const g = this.g;
    const f = g.save.flags;
    const L = g.learner.leaves;
    const c = g.learner.counts();
    if (!f.tut) return g.hud.setQuest(null);
    if (f.tut === 1) return g.hud.setQuest('Objetivo', 'Fale com o <b>Vovô Umi</b>, o pescador da praia 🎣');
    if (f.tut === 2) return g.hud.setQuest('Objetivo', 'Siga o caminho para o norte até a <b>Vila do Amanhecer</b> <span class="jp">朝日村</span>');
    const next = REGIONS.filter((r) => r.req > L).sort((a, b) => a.req - b.req)[0];
    let html = '';
    if (next) html += `Abrir <span class="jp">${next.jp}</span> ${esc(next.name)}: <b>${fmtNum(L)}/${fmtNum(next.req)}</b> palavras`;
    else if (L < 10000) html += `Grande Árvore: <b>${fmtNum(L)}/10.000</b> folhas`;
    else html += 'A Grande Árvore floresceu! Visite o coração dela no Pico Sagrado.';
    if (c.due >= 3) html += `<br>🍂 ${c.due} palavras para revisar: enfrente uma sombra ou reze num santuário 祠`;
    else {
      // suggest a teacher nearby with new words
      const unlocked = g.learner.unlockedRegions();
      const t = g.npcs.find((n) => unlocked.has(n.def.region ?? '') && (n.def.themes ?? []).some((th) => g.learner.newWords(th, 1).length));
      if (t) {
        const th = (t.def.themes ?? []).find((x) => g.learner.newWords(x, 1).length)!;
        html += `<br>📖 Aprenda <b>${esc(THEME_NAMES[th]?.pt ?? th)}</b> com ${esc(t.def.name)}`;
      }
    }
    g.hud.setQuest('Jornada', html);
  }

  async treeHeart() {
    const g = this.g;
    const L = g.learner.leaves;
    const hime = g.npcs.find((n) => n.def.id === 'kotonoha');
    const base: Partial<Line> = hime ? { who: hime.def.name, whoJp: hime.def.jp, role: hime.def.title, voice: hime.def.voice } : { who: 'Grande Árvore' };
    if (L < 10000) {
      await g.dialog.say({ ...base, jp: 'あなたの 言葉が 聞こえます。', pt: 'Eu ouço as suas palavras.' } as Line);
      await g.dialog.say({ ...base, pt: `A árvore tem ${fmtNum(L)} folhas. Faltam ${fmtNum(10000 - L)} para ela florescer por inteiro. Continue: cada palavra conta.` } as Line);
      g.dialog.close();
      return;
    }
    if (g.save.flags.ending) {
      await g.dialog.say({ ...base, jp: 'ありがとう。あなたは もう 言霊使いです。', pt: 'Obrigada. Você já é um Senhor do Kotodama.' } as Line);
      g.dialog.close();
      return;
    }
    g.save.flags.ending = 1;
    g.persist();
    g.dialog.close();
    await this.ending();
  }

  private async ending() {
    const g = this.g;
    g.pause(true);
    music.play('peak');
    sfx.rankUp();
    const cam = g.engine.camera;
    const tb = g.world.treeBase;
    g.rig.override = { pos: new THREE.Vector3(tb.x + 60, tb.y + 30, tb.z + 80), look: new THREE.Vector3(tb.x, tb.y + 40, tb.z), k: 0.6 };
    g.world.clock = 0.27;
    await sleep(2500);
    g.world.bursts.spark(new THREE.Vector3(tb.x, tb.y + 45, tb.z), '#ffe9a8', 120, 12);
    const rk = rankFor(g.learner.leaves);
    await g.app.screens.alert(`<span class="jp" style="font-size:40px;display:block">言の葉の大樹</span><br>As dez mil folhas voltaram à Grande Árvore. A ilha inteira tem cor de novo, e você fala japonês em todos os tons: polido, casual, keigo, gírias, anime, o japonês antigo e até Kansai.<br><br><b>${esc(g.save.name)}</b>, agora você é <span class="jp">${rk.jp}</span> — ${rk.pt}.<br><br>Obrigado por jogar KOTONOHA. ありがとうございました！<br><small>Uchihadam Production</small>`, 'Continuar explorando');
    g.rig.override = null;
    void cam;
    g.pause(false);
  }
}
