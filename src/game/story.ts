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
import { epilogue } from './cutscene';
import { completion, type Completion } from './completion';

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
    ]);
    // the camera turns to the Great Tree on the sacred peak
    const tb = g.world.treeBase;
    const from = g.player.pos.clone().add(new THREE.Vector3(0, 4, 0));
    const toTree = tb.clone().sub(from).setY(0).normalize();
    g.rig.override = { pos: from.clone().addScaledVector(toTree, -6).add(new THREE.Vector3(0, 1.5, 0)), look: tb.clone().add(new THREE.Vector3(0, 45, 0)), k: 1.6 };
    await this.konSays([
      { jp: '見て、あの 山の 上の 木！', pt: 'Olha aquela árvore lá no alto da montanha! É a Grande Árvore, 言の葉の大樹 (kotonoha no taiju).' },
      { pt: 'O Grande Silêncio levou todas as folhas dela. Cada palavra que você aprende e lembra vira uma folha de luz. Com 10.000 folhas, a árvore volta à vida!' },
    ]);
    g.rig.override = null;
    await this.konSays([
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
    const mis = g.missions?.questLine();
    if (mis) html += `<br>${mis}`;
    const req = g.requests?.questLine();
    if (req) html += `<br>${req}`;
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
    const done = completion(g);
    if (!g.save.flags.ending) {
      g.save.flags.ending = 1;
      g.persist();
      g.dialog.close();
      await epilogue(g);
      await this.afterEnding();
      return;
    }
    if (done.pct >= 1 && !g.save.flags.perfect) {
      g.dialog.close();
      await this.perfect();
      return;
    }
    await g.dialog.say({ ...base, jp: 'ありがとう。あなたは もう 言霊使いです。', pt: 'Obrigada. Você já é um Senhor do Kotodama.' } as Line);
    if (done.pct < 1) await g.dialog.say({ ...base, pt: `Domínio Total 完全制覇: ${Math.floor(done.pct * 100)}%. ${this.missing(done)}` } as Line);
    g.dialog.close();
  }

  /** what is still missing for 100% */
  private missing(d: Completion): string {
    const out: string[] = [];
    if (d.kanji < d.kanjiMax) out.push(`${fmtNum(d.kanjiMax - d.kanji)} kanji (Dojô de Kanji da escola)`);
    if (d.convos < d.convosMax) out.push(`${d.convosMax - d.convos} conversas`);
    if (d.seals < d.sealsMax) out.push(`${d.sealsMax - d.seals} selos das Grandes Sombras`);
    if (d.kana < d.kanaMax) out.push(`${d.kanaMax - d.kana} kana`);
    return out.length ? `Ainda faltam: ${out.join(', ')}.` : '';
  }

  /** right after the credits: Kon points at what is left for the "Domínio Total" */
  private async afterEnding() {
    const d = completion(this.g);
    sfx.rankUp();
    const rk = rankFor(this.g.learner.leaves);
    this.g.app.screens.toast(`<span class="jp">${rk.jp}</span> ${esc(rk.pt)}: a Grande Árvore floresceu!`, 6000);
    if (d.pct >= 1) return this.perfect();
    await this.konSays([
      { jp: 'やったね！ でも、旅は まだ 終わらないよ。', pt: 'Conseguimos! Mas a jornada ainda não acabou.', expr: 'happy' },
      { pt: `Ainda dá para chegar ao Domínio Total 完全制覇 (agora em ${Math.floor(d.pct * 100)}%). ${this.missing(d)} Quando estiver tudo completo, volte ao coração da árvore.` },
      { jp: 'それに、毎日の 復習も 忘れずに ね！', pt: 'E não esqueça as revisões de cada dia: folha revisada é folha que não murcha!' },
    ]);
  }

  /** 100%: every word, kanji, kana, conversation and seal */
  private async perfect() {
    const g = this.g;
    g.save.flags.perfect = 1;
    g.persist();
    g.pause(true);
    const tb = g.world.treeBase;
    g.rig.override = { pos: new THREE.Vector3(tb.x + 50, tb.y + 26, tb.z + 74), look: new THREE.Vector3(tb.x, tb.y + 40, tb.z), k: 0.6 };
    await sleep(1800);
    music.play('peak');
    sfx.rankUp();
    g.world.bursts.spark(new THREE.Vector3(tb.x, tb.y + 45, tb.z), '#ffd86a', 200, 16);
    g.world.bursts.ring(new THREE.Vector3(tb.x, tb.y + 2, tb.z), '#ffe9a8', 40);
    await sleep(2600);
    await g.app.screens.alert(`<span class="jp" style="font-size:42px;display:block">完全制覇</span><br><b>Domínio Total.</b> Todas as palavras, os ${fmtNum(completion(g).kanjiMax)} kanji, todos os kana, todas as conversas e todos os selos.<br><br>A Grande Árvore ficou dourada: cada folha agora é uma palavra dominada.<br><br><b>${esc(g.save.name)}</b>, não existe mais nada que esta ilha possa ensinar a você. O resto do japonês está lá fora, no mundo. 行ってらっしゃい！`, 'Continuar');
    g.rig.override = null;
    g.pause(false);
  }
}
