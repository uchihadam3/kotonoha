/**
 * Kotodama battles: a shadow of the Silence blocks your way; every right answer is a word-spell (the
 * kanji flies and strikes), every wrong answer lets the shadow hit you. Battles are where reviews happen.
 */
import * as THREE from 'three';
import type { Game } from './game';
import type { Shadow } from './actors';
import { h, sleep } from '../core/util';
import { askQuestion } from '../ui/learnui';
import { wordQuestion, pickType } from '../lang/challenge';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { ICON } from '../ui/icons';

export async function runBattle(game: Game, shadow: Shadow, keys: string[]): Promise<'win' | 'lose' | 'flee'> {
  if (!keys.length) return 'flee';
  game.pause(true);
  const boss = shadow.boss;
  const prevSong = music.playing;
  sfx.shadow();
  music.play(boss ? 'boss' : 'battle', 0.6);
  // camera: frame player and shadow
  const p = game.player.pos.clone();
  const s = shadow.group.position.clone();
  const mid = p.clone().lerp(s, 0.5);
  const side = new THREE.Vector3(s.z - p.z, 0, p.x - s.x).normalize().multiplyScalar(boss ? 9 : 6);
  game.rig.override = { pos: mid.clone().add(side).add(new THREE.Vector3(0, boss ? 5 : 3, 0)), look: mid.clone().add(new THREE.Vector3(0, 1.6, 0)), k: 3 };
  game.player.face(s.x, s.z);
  game.engine.u.uVignette.value = 0.55;
  const maxHp = boss ? Math.max(12, Math.min(24, keys.length)) : Math.max(5, Math.min(10, keys.length));
  let hp = maxHp, hearts = boss ? 5 : 3, combo = 0, best = 0, correct = 0, asked = 0;
  const el = h(`<div class="learn battle-ui" style="background:radial-gradient(ellipse at 50% 20%, rgba(20,12,40,.25), rgba(6,4,14,.78))"><div class="frame">
    <div class="lhead"><div class="title"><span class="jp">${boss ? '大影' : '影'}</span>${boss ? 'Grande Sombra do Silêncio' : 'Sombra do Silêncio'}</div><button class="hbtn x" title="Fugir">${ICON.back}</button></div>
    <div class="foes"><div class="hearts"></div><div class="hp"><i style="width:100%"></i></div><div class="combo">x0</div></div>
    <div class="stagebox"></div>
  </div></div>`);
  game.ui.appendChild(el);
  const heartsEl = el.querySelector('.hearts') as HTMLElement;
  const hpEl = el.querySelector('.hp i') as HTMLElement;
  const comboEl = el.querySelector('.combo') as HTMLElement;
  const box = el.querySelector('.stagebox') as HTMLElement;
  const drawHearts = (max: number) => (heartsEl.innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < hearts ? '' : 'lost'}">${ICON.heart}</span>`).join(''));
  const maxHearts = hearts;
  drawHearts(maxHearts);
  let fled = false;
  el.querySelector('.x')!.addEventListener('click', () => (fled = true));
  const prefs = game.prefs();
  let i = 0;
  const leavesBefore = game.learner.leaves;
  while (hp > 0 && hearts > 0 && !fled) {
    const key = keys[i % keys.length];
    i++;
    const w = game.learner.word(key);
    if (!w) continue;
    const q = wordQuestion(w, pickType(w, game.learner.stage(key)));
    const timer = q.type === 'type' ? 25000 : boss ? 11000 : 14000;
    const r = await askQuestion(box, q, { ...prefs, romaji: game.showRomaji(key) }, { timer });
    if (fled) break;
    asked++;
    game.learner.answer(key, r.correct);
    if (r.correct) {
      correct++;
      combo++;
      best = Math.max(best, combo);
      const dmg = 1 + (combo >= 5 ? 1 : 0) + (r.timeMs < 3500 ? 0.5 : 0);
      hp = Math.max(0, hp - dmg);
      // the word flies as a spell
      sfx.cast();
      const from = game.player.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
      game.world.bursts.glyph(from, w.w.replace(/^～/, '').slice(0, 3), '#fff6d6', 'rgba(95,211,162,.95)', 1.2);
      setTimeout(() => {
        sfx.hit();
        game.world.bursts.spark(shadow.group.position.clone(), '#bfffe0', 26, 5);
        game.rig.shake = 0.6;
      }, 260);
    } else {
      combo = 0;
      hearts--;
      sfx.hurt();
      game.rig.shake = 1;
      game.engine.u.uFlash.value = 0.25;
      setTimeout(() => (game.engine.u.uFlash.value = 0), 120);
      game.player.char.emote('sad', 1.5);
    }
    hpEl.style.width = `${(hp / maxHp) * 100}%`;
    comboEl.textContent = `x${combo}`;
    comboEl.classList.toggle('hot', combo >= 5);
    drawHearts(maxHearts);
  }
  const won = hp <= 0;
  game.save.stats.battles++;
  if (won) game.save.stats.wins++;
  game.save.stats.bestCombo = Math.max(game.save.stats.bestCombo, best);
  box.innerHTML = '';
  const gained = game.learner.leaves - leavesBefore;
  if (won) {
    sfx.victory();
    game.world.bursts.spark(shadow.group.position.clone(), '#ffe9a8', 60, 7);
    game.world.bursts.ring(shadow.group.position.clone().setY(game.player.pos.y + 0.2), '#bfffe0', 14);
    shadow.remove();
    const mon = (boss ? 120 : 15) + correct * 3 + best * 2;
    game.addMon(mon);
    game.player.char.emote('happy', 2);
    box.appendChild(h(`<div class="paper result-card" style="border-radius:18px"><div class="big">勝</div>
      <h2 style="margin:4px 0 0;font-family:var(--latin);color:#6b4a1c">A sombra se desfez em luz!</h2>
      <div class="stats"><div class="stat"><b>${correct}/${asked}</b><span>acertos</span></div><div class="stat"><b>x${best}</b><span>maior combo</span></div><div class="stat"><b>+${gained}</b><span>folhas</span></div><div class="stat"><b>+${mon}</b><span>文 mon</span></div></div></div>`));
  } else {
    if (!fled) sfx.defeat();
    box.appendChild(h(`<div class="paper result-card" style="border-radius:18px"><div class="big">${fled ? '逃' : '負'}</div>
      <h2 style="margin:4px 0 0;font-family:var(--latin);color:#6b4a1c">${fled ? 'Você recuou.' : 'A sombra escapou...'}</h2>
      <p style="color:#6a5a42">Revise as palavras no Livro (Tab) ou num santuário de palavras e tente de novo. Cada erro também ensina!</p></div>`));
    shadow.group.position.add(new THREE.Vector3((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16));
  }
  const foot = h(`<div class="lfoot"></div>`);
  el.querySelector('.frame')!.appendChild(foot);
  await new Promise<void>((res) => {
    const b = h(`<button class="mbtn primary">Continuar ${ICON.arrow}</button>`);
    b.addEventListener('click', () => res());
    foot.appendChild(b);
    if (gained > 0) sfx.leaf();
  });
  el.remove();
  game.rig.override = null;
  game.engine.u.uVignette.value = 0.32;
  if (prevSong) music.play(prevSong, 1);
  game.pause(false);
  game.persist();
  await sleep(10);
  return won ? 'win' : fled ? 'flee' : 'lose';
}
