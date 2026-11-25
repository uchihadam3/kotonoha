/**
 * Lessons (new words with cards + practice) and reviews (spaced repetition practice), shown as a
 * full-screen paper overlay over the 3D world.
 */
import type { Game } from './game';
import { h, esc, sleep, shuffle } from '../core/util';
import { wordCard, askQuestion } from '../ui/learnui';
import { wordQuestion, pickType, type QType } from '../lang/challenge';
import type { Word } from '../lang/vocab';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { ICON } from '../ui/icons';

export interface LessonResult {
  words: Word[];
  correct: number;
  total: number;
}

function overlay(game: Game, title: string, jp: string): { el: HTMLElement; box: HTMLElement; bar: HTMLElement; foot: HTMLElement; close: () => void } {
  const el = h(`<div class="learn"><div class="frame">
    <div class="lhead"><div class="title"><span class="jp">${esc(jp)}</span>${esc(title)}</div><button class="hbtn x" title="Sair">${ICON.close}</button></div>
    <div class="progress"><i style="width:0%"></i></div>
    <div class="stagebox"></div>
    <div class="lfoot"></div>
  </div></div>`);
  game.ui.appendChild(el);
  const close = () => el.remove();
  return { el, box: el.querySelector('.stagebox') as HTMLElement, bar: el.querySelector('.progress i') as HTMLElement, foot: el.querySelector('.lfoot') as HTMLElement, close };
}

function waitNext(foot: HTMLElement, label = 'Próxima', game?: Game): Promise<void> {
  return new Promise((res) => {
    foot.innerHTML = '';
    const b = h(`<button class="mbtn primary">${esc(label)} ${ICON.arrow}</button>`);
    const go = () => {
      window.removeEventListener('keydown', key);
      sfx.click();
      res();
    };
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault();
        go();
      }
    };
    b.addEventListener('click', go);
    window.addEventListener('keydown', key);
    foot.appendChild(b);
    void game;
  });
}

export async function runLesson(game: Game, words: Word[], title: string): Promise<LessonResult | null> {
  if (!words.length) return null;
  game.pause(true);
  const prevSong = music.playing;
  music.play('lesson');
  const ov = overlay(game, title, '学');
  let aborted = false;
  ov.el.querySelector('.x')!.addEventListener('click', () => {
    aborted = true;
    ov.close();
  });
  const prefs = game.prefs();
  const total = words.length * 2 + 1;
  let step = 0;
  const advance = () => (ov.bar.style.width = `${(++step / total) * 100}%`);
  // 1) cards
  for (let i = 0; i < words.length && !aborted; i++) {
    const w = words[i];
    const key = 'w:' + w.id;
    game.learner.introduce(key);
    ov.box.innerHTML = '';
    ov.box.appendChild(wordCard(w, { ...prefs, romaji: game.showRomaji(key) }, { isNew: true, onSpeak: (ok) => ok && game.save.stats.spoken++ }));
    sfx.newWord();
    advance();
    await waitNext(ov.foot, i === words.length - 1 ? 'Praticar' : 'Próxima', game);
    // quick check after the first half
    if (i === 3 && words.length > 5 && !aborted) {
      for (const qw of shuffle(words.slice(0, 4)).slice(0, 2)) {
        if (aborted) break;
        const q = wordQuestion(qw, Math.random() < 0.5 ? 'meaning' : 'listen');
        ov.foot.innerHTML = '';
        await askQuestion(ov.box, q, { ...prefs, romaji: game.showRomaji('w:' + qw.id) });
      }
    }
  }
  if (aborted) return finish(null);
  // 2) practice: each word once, mistakes come back at the end
  let correct = 0, asked = 0;
  const queue = shuffle([...words]);
  const retry: Word[] = [];
  const types: QType[] = ['meaning', 'listen', 'reverse'];
  for (const w of queue) {
    if (aborted) break;
    const q = wordQuestion(w, types[asked % types.length]);
    ov.foot.innerHTML = '';
    const r = await askQuestion(ov.box, q, { ...prefs, romaji: game.showRomaji('w:' + w.id) });
    asked++;
    game.learner.answer('w:' + w.id, r.correct);
    if (r.correct) correct++;
    else retry.push(w);
    advance();
  }
  for (const w of retry) {
    if (aborted) break;
    const q = wordQuestion(w, 'meaning');
    ov.foot.innerHTML = '';
    const r = await askQuestion(ov.box, q, { ...prefs, romaji: true }, { reveal: true });
    game.learner.answer('w:' + w.id, r.correct);
  }
  if (aborted) return finish(null);
  // 3) result
  ov.bar.style.width = '100%';
  const mon = 10 + correct * 2;
  game.addMon(mon);
  game.save.stats.lessons++;
  ov.box.innerHTML = '';
  ov.box.appendChild(h(`<div class="paper result-card" style="border-radius:18px">
    <div class="big">芽</div>
    <h2 style="margin:6px 0 0;font-family:var(--latin);color:#6b4a1c">Lição completa!</h2>
    <div class="stats"><div class="stat"><b>${words.length}</b><span>palavras novas</span></div><div class="stat"><b>${correct}/${asked}</b><span>acertos</span></div><div class="stat"><b>+${mon}</b><span>文 mon</span></div></div>
    <div class="words">${words.map((w) => `<span>${esc(w.w)}</span>`).join('')}</div>
    <p style="color:#6a5a42;font-size:14px;margin-top:14px">🌱 Agora elas são <b>brotos</b>. Revise daqui a alguns minutos (as sombras do Silêncio vão aparecer!) para virarem <b>folhas</b> na Grande Árvore.</p>
  </div>`));
  sfx.victory();
  await waitNext(ov.foot, 'Continuar', game);
  return finish({ words, correct, total: asked });

  function finish(r: LessonResult | null) {
    ov.close();
    if (prevSong) music.play(prevSong);
    game.pause(false);
    game.persist();
    return r;
  }
}

/** a calm review session (word shrine / book): due words first */
export async function runReview(game: Game, keys: string[], title = 'Revisão'): Promise<number> {
  if (!keys.length) return 0;
  game.pause(true);
  const prevSong = music.playing;
  music.play('lesson');
  const ov = overlay(game, title, '復');
  let aborted = false;
  ov.el.querySelector('.x')!.addEventListener('click', () => {
    aborted = true;
  });
  const prefs = game.prefs();
  let correct = 0, i = 0;
  const leavesBefore = game.learner.leaves;
  for (const key of keys) {
    if (aborted) break;
    const w = game.learner.word(key);
    if (!w) continue;
    const q = wordQuestion(w, pickType(w, game.learner.stage(key)));
    ov.foot.innerHTML = '';
    const r = await askQuestion(ov.box, q, { ...prefs, romaji: game.showRomaji(key) });
    game.learner.answer(key, r.correct);
    if (r.correct) correct++;
    ov.bar.style.width = `${(++i / keys.length) * 100}%`;
  }
  const gained = game.learner.leaves - leavesBefore;
  if (!aborted) {
    ov.box.innerHTML = '';
    ov.box.appendChild(h(`<div class="paper result-card" style="border-radius:18px"><div class="big">${gained > 0 ? '葉' : '復'}</div>
      <div class="stats"><div class="stat"><b>${correct}/${i}</b><span>acertos</span></div><div class="stat"><b>+${gained}</b><span>folhas novas</span></div></div></div>`));
    if (gained > 0) sfx.leaf();
    await waitNext(ov.foot, 'Continuar', game);
  }
  ov.close();
  if (prevSong) music.play(prevSong);
  game.pause(false);
  game.persist();
  await sleep(10);
  return correct;
}
