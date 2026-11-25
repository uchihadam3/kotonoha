/**
 * Learning UI: the word card (furigana, romaji, meaning, register, note, example, conjugations, stroke
 * order, kanji breakdown, speak-it button) and the quiz panel (options, typing with live kana, speaking).
 */
import { h, esc, sleep } from '../core/util';
import { ICON } from './icons';
import { vocab, strokesFor, type Word, type Kanji } from '../lang/vocab';
import { conjugate, conjugatable } from '../lang/conjugate';
import { hasKanji, romajiToKana, toRomaji, allKana } from '../lang/kana';
import { checkTyped, type Question } from '../lang/challenge';
import { voice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { REGISTER_NAMES, THEME_NAMES } from '../data/regions';
import { STAGE_INFO } from '../lang/srs';

export interface DisplayPrefs {
  romaji: boolean;
  furigana: boolean;
  autoSpeak: boolean;
  speech: boolean;
}

export function regBadge(reg: string): string {
  const r = REGISTER_NAMES[reg];
  if (!r) return '';
  return `<span class="reg ${reg}" title="${esc(r.desc)}">${r.jp} · ${r.pt}</span>`;
}

/** word with furigana (ruby) when it has kanji */
export function rubyWord(w: string, r: string, furigana: boolean): string {
  const disp = esc(w.replace(/^～/, '〜'));
  if (!furigana || !hasKanji(w)) return disp;
  return `<ruby>${disp}<rt>${esc(r)}</rt></ruby>`;
}

// ───────────────────────── stroke order ─────────────────────────

export async function strokeSVG(ch: string, size = 120, animate = true): Promise<HTMLElement> {
  const paths = await strokesFor(ch);
  const el = h(`<div class="strokes" style="width:${size}px;height:${size}px"></div>`);
  if (!paths) {
    el.innerHTML = `<span class="jp" style="font-size:${size * 0.8}px;line-height:${size}px">${esc(ch)}</span>`;
    return el;
  }
  const total = paths.length;
  const svg = `<svg viewBox="0 0 109 109"><g class="ghost">${paths.map((d) => `<path d="${d}"/>`).join('')}</g><g class="ink">${paths
    .map((d, i) => `<path d="${d}" pathLength="1" style="--i:${i};--n:${total}"/>`)
    .join('')}</g></svg>`;
  el.innerHTML = svg;
  if (animate) el.classList.add('play');
  el.addEventListener('click', () => {
    el.classList.remove('play');
    void el.offsetWidth;
    el.classList.add('play');
  });
  return el;
}

// ───────────────────────── word card ─────────────────────────

export function wordCard(w: Word, prefs: DisplayPrefs, opts: { stage?: number; isNew?: boolean; onSpeak?: (ok: boolean) => void } = {}): HTMLElement {
  const stage = opts.stage ?? 0;
  const si = STAGE_INFO[Math.min(stage, STAGE_INFO.length - 1)];
  const theme = THEME_NAMES[w.t];
  const romaji = prefs.romaji ? `<div class="wc-romaji">${esc(vocab.romaji(w))}</div>` : '';
  const showReading = hasKanji(w.w) || w.w.replace(/^～/, '') !== w.r;
  const card = h(`<div class="wordcard paper">
    <div class="wc-top">
      <span class="wc-theme">${theme ? `${theme.jp} · ${theme.pt}` : ''}</span>
      <span class="wc-level">N${w.n}</span>
      ${opts.isNew ? '<span class="wc-new">NOVA</span>' : `<span class="wc-stage" style="--c:${si.color}">${si.jp} ${si.name}</span>`}
    </div>
    <div class="wc-main">
      ${showReading ? `<div class="wc-reading">${esc(w.r)}</div>` : ''}
      <div class="wc-word jp">${esc(w.w.replace(/^～/, '〜'))}</div>
      ${romaji}
      <div class="wc-actions"><button class="round say" title="Ouvir">${ICON.speaker}</button>${prefs.speech && voice.canListen ? `<button class="round mic" title="Fale você">${ICON.mic}</button>` : ''}</div>
    </div>
    <div class="wc-pt">${esc(w.pt)}</div>
    <div class="wc-tags">${w.reg ? regBadge(w.reg) : ''}<span class="pos">${posName(w.pos)}</span></div>
    ${w.note ? `<div class="wc-note">💡 ${esc(w.note)}</div>` : ''}
    ${w.exjp ? `<div class="wc-ex"><button class="round small sayex" title="Ouvir a frase">${ICON.speaker}</button><div><div class="jp ex-jp">${esc(w.exjp)}</div>${prefs.furigana && w.exr ? `<div class="ex-r">${esc(w.exr)}</div>` : ''}${prefs.romaji && w.exr ? `<div class="ex-ro">${esc(toRomaji(w.exr))}</div>` : ''}<div class="ex-pt">${esc(w.expt)}</div></div></div>` : ''}
    <div class="wc-extra"></div>
    <div class="wc-heard"></div>
  </div>`);
  card.querySelector('.say')!.addEventListener('click', (e) => {
    e.stopPropagation();
    voice.speak(w.r);
  });
  card.querySelector('.sayex')?.addEventListener('click', (e) => {
    e.stopPropagation();
    voice.speak(w.exjp, { rate: 0.95 });
  });
  const heard = card.querySelector('.wc-heard') as HTMLElement;
  card.querySelector('.mic')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    btn.classList.add('listening');
    heard.textContent = 'Ouvindo… fale agora!';
    const res = await voice.listen();
    btn.classList.remove('listening');
    if (voice.micBlocked) {
      heard.textContent = 'O microfone não está disponível aqui. Para praticar a fala, abra o jogo direto no navegador ou na versão instalada e permita o microfone.';
      btn.remove();
      return;
    }
    const ok = voice.matches(res, w.w.replace(/^～/, ''), w.r);
    heard.innerHTML = res.length ? `${ok ? '✅ Perfeito!' : '🤔 Ouvi:'} <span class="jp">${esc(res[0])}</span>` : 'Não ouvi nada. Tente de novo (o navegador precisa de permissão do microfone).';
    if (ok) sfx.correct();
    opts.onSpeak?.(ok);
  });
  // extras: conjugation + kanji breakdown + strokes
  const extra = card.querySelector('.wc-extra') as HTMLElement;
  if (conjugatable(w.pos)) {
    const btn = h(`<button class="chip">${ICON.chat} Formas: polido ↔ casual</button>`);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      sfx.click();
      btn.replaceWith(conjTable(w));
    });
    extra.appendChild(btn);
  }
  const chars = [...w.w].filter((c) => hasKanji(c) || allKana(c)).slice(0, 6);
  if (chars.length) {
    const btn = h(`<button class="chip">✍️ Ordem dos traços</button>`);
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      sfx.click();
      const box = h(`<div class="stroke-row"></div>`);
      btn.replaceWith(box);
      for (const ch of chars) {
        const k = vocab.kanjiByChar.get(ch);
        const cell = h(`<div class="stroke-cell"></div>`);
        cell.appendChild(await strokeSVG(ch, 92));
        if (k) cell.appendChild(h(`<div class="sc-k"><b>${esc(k.pt.split(';')[0])}</b><span>${esc(k.on)}${k.kun ? ' · ' + esc(k.kun) : ''}</span></div>`));
        box.appendChild(cell);
      }
    });
    extra.appendChild(btn);
  }
  if (prefs.autoSpeak) setTimeout(() => voice.speak(w.r), 250);
  return card;
}

function conjTable(w: Word): HTMLElement {
  const forms = conjugate(w.w, w.r, w.pos);
  const t = h(`<div class="conj"><table>${forms
    .map((f) => `<tr class="${f.reg}"><td class="lbl">${esc(f.label)}</td><td class="jp">${esc(f.w)}</td><td class="r">${esc(f.r !== f.w ? f.r : '')}</td><td><button class="round tiny" data-r="${esc(f.r)}">${ICON.speaker}</button></td></tr>`)
    .join('')}</table><div class="muted small">Azul = polido (です/ます) · Verde = casual (com amigos)</div></div>`);
  t.querySelectorAll('button[data-r]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    voice.speak((b as HTMLElement).dataset.r!);
  }));
  return t;
}

export function posName(pos: string): string {
  const m: Record<string, string> = {
    n: 'substantivo', vs: 'substantivo (+する = verbo)', pn: 'nome próprio', pron: 'pronome', num: 'número', ctr: 'contador', suf: 'sufixo', pref: 'prefixo', prt: 'partícula',
    conj: 'conjunção', int: 'interjeição', exp: 'expressão', adv: 'advérbio', 'adj-i': 'adjetivo い', 'adj-ix': 'adjetivo い (irregular)', 'adj-na': 'adjetivo な', 'adj-no': 'adjetivo の',
    'adj-pn': 'pré-nominal', cop: 'cópula', aux: 'auxiliar', v1: 'verbo ichidan (る)', v5u: 'verbo godan (う)', v5k: 'verbo godan (く)', 'v5k-s': 'verbo godan (行く)', v5g: 'verbo godan (ぐ)',
    v5s: 'verbo godan (す)', v5t: 'verbo godan (つ)', v5n: 'verbo godan (ぬ)', v5b: 'verbo godan (ぶ)', v5m: 'verbo godan (む)', v5r: 'verbo godan (る)', 'v5r-i': 'verbo godan irregular', v5aru: 'verbo honorífico',
    vk: 'verbo irregular (来る)', 'vs-i': 'verbo する',
  };
  return m[pos] ?? pos;
}

export function kanjiCard(k: Kanji, stage = 0): HTMLElement {
  const words = vocab.wordsWithKanji(k.k);
  const si = STAGE_INFO[Math.min(stage, STAGE_INFO.length - 1)];
  const el = h(`<div class="wordcard paper kanjicard">
    <div class="wc-top"><span class="wc-theme">漢字 · ${k.grade <= 6 ? `${k.grade}º ano escolar` : 'ensino médio'}</span><span class="wc-level">${k.jlpt ? 'N' + k.jlpt : '—'}</span><span class="wc-stage" style="--c:${si.color}">${si.jp} ${si.name}</span></div>
    <div class="kc-main"><div class="kc-stroke"></div><div class="kc-info"><div class="wc-pt">${esc(k.pt)}</div>
      <div class="kc-read"><b>On (chinesa):</b> <span class="jp">${esc(k.on || '—')}</span></div>
      <div class="kc-read"><b>Kun (japonesa):</b> <span class="jp">${esc(k.kun || '—')}</span></div>
      <div class="muted small">${k.strokes} traços · toque no kanji para repetir</div></div></div>
    ${words.length ? `<div class="kc-words">${words.map((w) => `<button class="kc-w" data-r="${esc(w.r)}"><span class="jp">${esc(w.w)}</span><small>${esc(w.r)} · ${esc(w.pt.split(';')[0])}</small></button>`).join('')}</div>` : ''}
  </div>`);
  void strokeSVG(k.k, 140).then((s) => el.querySelector('.kc-stroke')!.appendChild(s));
  el.querySelectorAll('.kc-w').forEach((b) => b.addEventListener('click', () => voice.speak((b as HTMLElement).dataset.r!)));
  return el;
}

// ───────────────────────── quiz panel ─────────────────────────

export interface QuizResult {
  correct: boolean;
  timeMs: number;
  spoken?: boolean;
}

/**
 * Renders a question inside `host` and resolves when answered. Typing questions convert romaji to kana
 * as you type; options can be picked with 1-4 keys.
 */
export function askQuestion(host: HTMLElement, q: Question, prefs: DisplayPrefs, opts: { timer?: number; reveal?: boolean } = {}): Promise<QuizResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    host.innerHTML = '';
    const w = q.word;
    const romajiLine = prefs.romaji && w && q.promptJp && q.type !== 'reading' && q.type !== 'cloze' ? `<div class="q-ro">${esc(vocab.romaji(w))}</div>` : '';
    const promptHtml = q.promptJp
      ? `<div class="q-prompt jp ${q.prompt.length > 8 ? 'long' : ''}">${q.reading && prefs.furigana && q.type !== 'reading' ? `<ruby>${esc(q.prompt)}<rt>${esc(q.reading)}</rt></ruby>` : esc(q.prompt)}</div>${romajiLine}`
      : q.type === 'listen'
        ? `<button class="q-listen">${ICON.speaker}<span>Ouvir de novo</span></button>`
        : `<div class="q-prompt pt">${esc(q.prompt)}</div>`;
    const el = h(`<div class="quiz">
      <div class="q-ask">${esc(q.ask)}</div>
      ${promptHtml}
      ${q.hint ? `<div class="q-hint">${esc(q.hint)}</div>` : ''}
      <div class="q-body"></div>
      ${opts.timer ? '<div class="q-timer"><i></i></div>' : ''}
      <div class="q-feedback"></div>
    </div>`);
    host.appendChild(el);
    const body = el.querySelector('.q-body') as HTMLElement;
    const fb = el.querySelector('.q-feedback') as HTMLElement;
    let done = false;
    const say = () => q.say && voice.speak(q.say);
    el.querySelector('.q-listen')?.addEventListener('click', say);
    if (q.say && (q.type === 'listen' || (prefs.autoSpeak && (q.type === 'meaning' || q.type === 'conj')))) setTimeout(say, 200);
    let timerId: number | null = null;
    const finish = async (correct: boolean, spoken = false) => {
      if (done) return;
      done = true;
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('keydown', onKey);
      el.classList.add(correct ? 'right' : 'wrong');
      if (correct) sfx.correct();
      else sfx.wrong();
      if (w) {
        fb.innerHTML = `<div class="fb ${correct ? 'ok' : 'no'}"><b>${correct ? 'Certo!' : 'Quase!'}</b> <span class="jp">${rubyWord(w.w, w.r, true)}</span> · ${esc(w.pt.split(';').slice(0, 2).join('; '))}</div>`;
        if (!correct || opts.reveal) voice.speak(w.r);
      } else if (!correct) {
        const right = q.options?.find((o) => o.correct);
        fb.innerHTML = `<div class="fb no"><b>Resposta:</b> <span class="${right?.jp ? 'jp' : ''}">${esc(right?.label ?? q.answer ?? '')}</span></div>`;
      } else fb.innerHTML = `<div class="fb ok"><b>Certo!</b></div>`;
      await sleep(correct ? 650 : 1500);
      resolve({ correct, timeMs: performance.now() - start, spoken });
    };
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && q.options) {
        const btn = body.querySelectorAll('.opt')[n - 1] as HTMLElement | undefined;
        btn?.click();
      }
    };
    if (q.options) {
      body.classList.add('opts-grid');
      q.options.forEach((o, i) => {
        const b = h(`<button class="opt ${o.jp ? 'jp' : ''}"><span class="k">${i + 1}</span><span class="l">${esc(o.label)}</span>${o.sub ? `<span class="s">${esc(o.sub)}</span>` : ''}</button>`);
        b.addEventListener('click', () => {
          if (done) return;
          b.classList.add(o.correct ? 'good' : 'bad');
          if (!o.correct) body.querySelectorAll('.opt').forEach((x, j) => q.options![j].correct && x.classList.add('good'));
          void finish(o.correct);
        });
        body.appendChild(b);
      });
      window.addEventListener('keydown', onKey);
    } else if (q.type === 'type') {
      const kata = !!w && /^[ァ-ヺー]+$/.test(w.r);
      const form = h(`<form class="q-type"><div class="typed jp"></div><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="digite em romaji (ex: neko)"><button class="mbtn primary small" type="submit">OK</button></form>`);
      const input = form.querySelector('input') as HTMLInputElement;
      const typed = form.querySelector('.typed') as HTMLElement;
      input.addEventListener('input', () => {
        typed.textContent = romajiToKana(input.value, kata) || '　';
        sfx.type();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const kana = romajiToKana(input.value, kata, true);
        void finish(checkTyped(q, kana) || checkTyped(q, input.value));
      });
      const giveup = h(`<button class="linkbtn" type="button">Não sei</button>`);
      giveup.addEventListener('click', () => void finish(false));
      body.append(form, giveup);
      setTimeout(() => input.focus(), 50);
    } else if (q.type === 'speak') {
      const b = h(`<button class="mbtn primary">${ICON.mic}<span>Falar</span></button>`);
      const skip = h(`<button class="linkbtn">Não posso falar agora</button>`);
      b.addEventListener('click', async () => {
        b.classList.add('listening');
        fb.textContent = 'Ouvindo…';
        const res = await voice.listen();
        b.classList.remove('listening');
        if (voice.micBlocked) {
          fb.textContent = 'Microfone indisponível aqui. Pulando a fala.';
          void finish(true);
          return;
        }
        const ok = !!w && voice.matches(res, w.w.replace(/^～/, ''), w.r);
        if (!ok && res.length) fb.innerHTML = `Ouvi: <span class="jp">${esc(res[0])}</span>`;
        void finish(ok, true);
      });
      skip.addEventListener('click', () => void finish(true));
      body.append(b, skip);
    }
    if (opts.timer) {
      const bar = el.querySelector('.q-timer i') as HTMLElement;
      bar.style.animationDuration = opts.timer + 'ms';
      timerId = window.setTimeout(() => void finish(false), opts.timer);
    }
  });
}
