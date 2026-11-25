/** 言の葉帳 — the Book of Words: words by theme (dictionary + search), kana, kanji, registers, stats. */
import type { Game } from '../game/game';
import { h, esc, fmtNum, fmtTime } from '../core/util';
import { ICON } from './icons';
import { vocab, type Word } from '../lang/vocab';
import { THEME_NAMES, REGISTER_NAMES, rankFor, levelFor } from '../data/regions';
import { STAGE_INFO } from '../lang/srs';
import { wordCard, kanjiCard, strokeSVG } from './learnui';
import { GOJUON, DAKUTEN, YOON, toKatakana, toRomaji, toHiragana } from '../lang/kana';
import { MNEMO } from '../lang/kanadata';
import { voice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import registros from '../data/registros.json';
import { runReview } from '../game/lesson';

type Tab = 'words' | 'kana' | 'kanji' | 'reg' | 'stats';

export class Book {
  private el: HTMLElement | null = null;
  private tab: Tab = 'words';
  private theme: string | null = null;
  private query = '';
  private kanaSet: 'hira' | 'kata' = 'hira';
  constructor(private g: Game) {}

  open() {
    const g = this.g;
    g.pause(true);
    sfx.open();
    this.el = h(`<div class="screen dim center" style="z-index:42"><div class="panel book"><button class="close">${ICON.close}</button>
      <div class="tabs">
        <button class="tab" data-t="words"><span class="jp">単語</span>Palavras</button>
        <button class="tab" data-t="kana"><span class="jp">仮名</span>Kana</button>
        <button class="tab" data-t="kanji"><span class="jp">漢字</span>Kanji</button>
        <button class="tab" data-t="reg"><span class="jp">話し方</span>Registros</button>
        <button class="tab" data-t="stats"><span class="jp">記録</span>Progresso</button>
      </div><div class="bbody"></div></div></div>`);
    this.g.app.screens.root.appendChild(this.el);
    this.el.querySelector('.close')!.addEventListener('click', () => this.close());
    this.el.addEventListener('pointerdown', (e) => {
      if (e.target === this.el) this.close();
    });
    this.el.querySelectorAll('.tab').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.page();
        this.tab = (b as HTMLElement).dataset.t as Tab;
        this.render();
      }),
    );
    this.render();
  }

  close() {
    if (!this.el) return;
    sfx.back();
    this.el.remove();
    this.el = null;
    this.g.pause(false);
  }

  private body(): HTMLElement {
    this.el!.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.t === this.tab));
    const b = this.el!.querySelector('.bbody') as HTMLElement;
    b.innerHTML = '';
    b.scrollTop = 0;
    return b;
  }

  private render() {
    if (!this.el) return;
    if (this.tab === 'words') return this.theme || this.query ? this.renderWords() : this.renderThemes();
    if (this.tab === 'kana') return this.renderKana();
    if (this.tab === 'kanji') return this.renderKanji();
    if (this.tab === 'reg') return this.renderReg();
    return this.renderStats();
  }

  private searchBar(b: HTMLElement) {
    const L = this.g.learner;
    const due = L.dueItems('w:', 20);
    const bar = h(`<div class="bar2"><input type="text" placeholder="Buscar: japonês, leitura, romaji ou português…" value="${esc(this.query)}">${due.length ? `<button class="mbtn small primary rev">🍂 Revisar ${due.length}</button>` : ''}</div>`);
    const input = bar.querySelector('input') as HTMLInputElement;
    let tm = 0;
    input.addEventListener('input', () => {
      clearTimeout(tm);
      tm = window.setTimeout(() => {
        this.query = input.value.trim();
        this.render();
        const again = this.el?.querySelector('.bar2 input') as HTMLInputElement | null;
        again?.focus();
        again?.setSelectionRange(again.value.length, again.value.length);
      }, 250);
    });
    bar.querySelector('.rev')?.addEventListener('click', async () => {
      this.close();
      await runReview(this.g, due, 'Revisão do Livro');
    });
    b.appendChild(bar);
  }

  private renderThemes() {
    const b = this.body();
    this.searchBar(b);
    const L = this.g.learner;
    const grid = h(`<div class="themes"></div>`);
    for (const t of vocab.themes) {
      const nm = THEME_NAMES[t] ?? { pt: t, jp: '' };
      const p = L.themeProgress(t);
      const el = h(`<button class="theme"><span class="jp">${esc(nm.jp)}</span><b>${esc(nm.pt)}</b><br><small>${p.learned} aprendidas · ${p.seen} vistas · ${p.total} no total</small><div class="pbar"><i style="width:${(p.learned / Math.max(1, p.total)) * 100}%"></i></div></button>`);
      el.addEventListener('click', () => {
        sfx.click();
        this.theme = t;
        this.render();
      });
      grid.appendChild(el);
    }
    b.appendChild(grid);
  }

  private renderWords() {
    const b = this.body();
    const L = this.g.learner;
    const back = h(`<button class="mbtn small ghost" style="margin-bottom:10px">${ICON.back} Temas</button>`);
    back.addEventListener('click', () => {
      this.theme = null;
      this.query = '';
      this.render();
    });
    b.appendChild(back);
    this.searchBar(b);
    let list: Word[];
    if (this.query) {
      const q = this.query.toLowerCase();
      const qh = toHiragana(q);
      list = vocab.words.filter((w) => w.w.includes(this.query) || toHiragana(w.r).includes(qh) || w.pt.toLowerCase().includes(q) || vocab.romaji(w).includes(q)).slice(0, 300);
    } else list = vocab.byTheme.get(this.theme!) ?? [];
    const title = this.query ? `Busca: “${esc(this.query)}” (${list.length})` : `${THEME_NAMES[this.theme!]?.pt ?? this.theme} (${list.length})`;
    b.appendChild(h(`<h3>${title}</h3>`));
    const grid = h(`<div class="wgrid"></div>`);
    const floor = L.levelFloor();
    for (const w of list.slice(0, 600)) {
      const it = L.get('w:' + w.id);
      const st = it?.s ?? 0;
      const c = it ? STAGE_INFO[Math.min(st, 9)].color : '#3a3a48';
      const locked = !it && w.n < floor;
      const cell = h(`<button class="wcell ${locked ? 'locked' : ''}" style="--c:${c}"><span class="jp">${esc(w.w)}</span><small>${it ? esc(w.r) + ' · ' + esc(w.pt.split(';')[0]) : locked ? `N${w.n} 🔒` : `N${w.n} · ${esc(w.pt.split(';')[0])}`}</small></button>`);
      cell.addEventListener('click', () => this.showWord(w));
      grid.appendChild(cell);
    }
    b.appendChild(grid);
  }

  private showWord(w: Word) {
    sfx.click();
    const g = this.g;
    const key = 'w:' + w.id;
    const m = h(`<div class="screen dim center" style="z-index:44"><div style="width:min(620px,96vw);max-height:92vh;overflow:auto"></div></div>`);
    const holder = m.firstElementChild as HTMLElement;
    holder.appendChild(wordCard(w, { ...g.prefs(), romaji: g.showRomaji(key) }, { stage: g.learner.stage(key), isNew: !g.learner.get(key) }));
    const row = h(`<div class="row end" style="margin-top:8px"></div>`);
    row.appendChild(g.app.screens.btn('Fechar', () => m.remove(), 'small'));
    holder.appendChild(row);
    m.addEventListener('pointerdown', (e) => {
      if (e.target === m) m.remove();
    });
    g.app.screens.root.appendChild(m);
  }

  private renderKana() {
    const b = this.body();
    const L = this.g.learner;
    const seg = h(`<div class="bar2"><div class="seg"><button data-s="hira" class="${this.kanaSet === 'hira' ? 'on' : ''}">ひらがな Hiragana</button><button data-s="kata" class="${this.kanaSet === 'kata' ? 'on' : ''}">カタカナ Katakana</button></div><span class="muted small">Toque para ouvir e ver os traços. Aprenda kana nos vaga-lumes da lagoa da vila 🌙</span></div>`);
    seg.querySelectorAll('button').forEach((bt) => bt.addEventListener('click', () => {
      this.kanaSet = (bt as HTMLElement).dataset.s as 'hira' | 'kata';
      this.render();
    }));
    b.appendChild(seg);
    const conv = (c: string) => (this.kanaSet === 'kata' ? toKatakana(c) : c);
    const cell = (c: string | null) => {
      if (!c) return h(`<div class="kana-cell empty"></div>`);
      const ch = conv(c);
      const it = L.get('k:' + ch);
      const col = it ? STAGE_INFO[Math.min(it.s, 9)].color : '#333';
      const el = h(`<button class="kana-cell" style="--c:${col}"><span class="jp">${ch}</span><small>${toRomaji(ch)}</small></button>`);
      el.addEventListener('click', async () => {
        voice.speak(ch);
        const m = h(`<div class="screen dim center" style="z-index:44"><div class="panel paper" style="text-align:center;width:min(340px,90vw)"></div></div>`);
        const p = m.firstElementChild as HTMLElement;
        p.appendChild(await strokeSVG(ch, 200));
        p.appendChild(h(`<div style="font-size:26px;font-weight:700;margin-top:8px">${toRomaji(ch)}</div><div style="color:#6a5a42;font-size:14px">${esc(MNEMO[toHiragana(ch)] ?? '')}</div>`));
        m.addEventListener('pointerdown', (e) => {
          if (e.target === m) m.remove();
        });
        this.g.app.screens.root.appendChild(m);
      });
      return el;
    };
    for (const [title, rows] of [['Básicos (gojūon)', GOJUON], ['Com tenten e maru (dakuten)', DAKUTEN]] as const) {
      b.appendChild(h(`<h3>${title}</h3>`));
      const grid = h(`<div class="kana-grid"></div>`);
      for (const r of rows) for (const c of r) grid.appendChild(cell(c));
      b.appendChild(grid);
    }
    b.appendChild(h(`<h3>Combinações (yōon)</h3>`));
    const yg = h(`<div class="kana-grid" style="grid-template-columns:repeat(3,minmax(56px,80px))"></div>`);
    for (const r of YOON) for (const c of r) yg.appendChild(cell(c));
    b.appendChild(yg);
  }

  private renderKanji() {
    const b = this.body();
    const L = this.g.learner;
    const seen = vocab.kanji.filter((k) => L.get('K:' + k.k)).length;
    b.appendChild(h(`<div class="bar2"><span>Kanji: <b>${L.counts().kanji}</b> aprendidos · ${seen} vistos · <b>2.136</b> kanji de uso comum (jōyō). Aprenda no Dojô de kanji do Santuário da Raposa 書道.</span></div>`));
    const levels: [string, (n: number) => boolean][] = [['N5', (n) => n === 5], ['N4', (n) => n === 4], ['N3', (n) => n === 3], ['N2', (n) => n === 2], ['N1', (n) => n === 1], ['Outros jōyō', (n) => n === 0]];
    for (const [lbl, f] of levels) {
      const list = vocab.kanji.filter((k) => f(k.jlpt));
      if (!list.length) continue;
      const learned = list.filter((k) => L.isLearned('K:' + k.k)).length;
      b.appendChild(h(`<h3>${lbl} · ${learned}/${list.length}</h3>`));
      const grid = h(`<div class="kgrid"></div>`);
      for (const k of list) {
        const it = L.get('K:' + k.k);
        const col = it ? STAGE_INFO[Math.min(it.s, 9)].color : '#2a2a34';
        const el = h(`<button class="kcell ${it ? '' : 'locked'}" style="--c:${col}" title="${esc(k.pt)}">${k.k}</button>`);
        el.addEventListener('click', () => {
          const m = h(`<div class="screen dim center" style="z-index:44"><div style="width:min(620px,96vw);max-height:92vh;overflow:auto"></div></div>`);
          (m.firstElementChild as HTMLElement).appendChild(kanjiCard(k, it?.s ?? 0));
          m.addEventListener('pointerdown', (e) => {
            if (e.target === m) m.remove();
          });
          this.g.app.screens.root.appendChild(m);
        });
        grid.appendChild(el);
      }
      b.appendChild(grid);
    }
  }

  private renderReg() {
    const b = this.body();
    const regs = ['keigo', 'polido', 'casual', 'giria', 'anime', 'antigo', 'kansai'];
    b.appendChild(h(`<p class="muted small">O japonês muda conforme COM QUEM você fala. A mesma ideia em cada registro (toque para ouvir):</p>`));
    const rows = (registros as unknown as { pt: string; f: Record<string, { w: string; r: string; note?: string }>; note?: string }[])
      .map((c) => `<tr><td><b>${esc(c.pt)}</b>${c.note ? `<small>${esc(c.note)}</small>` : ''}</td>${regs.map((r) => (c.f[r] ? `<td><span class="jp" data-r="${esc(c.f[r].r)}">${esc(c.f[r].w)}</span><small>${esc(c.f[r].r)}</small></td>` : '<td class="muted">—</td>')).join('')}</tr>`)
      .join('');
    const t = h(`<div style="overflow:auto"><table class="reg-table"><thead><tr><th></th>${regs.map((r) => `<th><span class="reg ${r}">${REGISTER_NAMES[r].jp}</span><br>${REGISTER_NAMES[r].pt}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`);
    t.querySelectorAll('[data-r]').forEach((s) => s.addEventListener('click', () => voice.speak((s as HTMLElement).dataset.r!)));
    b.appendChild(t);
    b.appendChild(h(`<div style="margin-top:14px">${regs.map((r) => `<p><span class="reg ${r}">${REGISTER_NAMES[r].jp} · ${REGISTER_NAMES[r].pt}</span> <span class="muted">${esc(REGISTER_NAMES[r].desc)}</span></p>`).join('')}</div>`));
  }

  private renderStats() {
    const b = this.body();
    const g = this.g;
    const c = g.learner.counts();
    const st = g.save.stats;
    const rk = rankFor(c.words);
    const acc = st.correct + st.wrong ? Math.round((st.correct / (st.correct + st.wrong)) * 100) : 0;
    b.appendChild(h(`<div style="text-align:center;margin:6px 0 16px"><div class="jp" style="font-family:var(--brush);font-size:48px;color:var(--gold)">${rk.jp}</div><div style="color:var(--gold2);letter-spacing:.2em">${esc(rk.pt.toUpperCase())}</div><div class="muted small">${esc(g.save.name)} ${g.save.nameKana ? `· <span class="jp">${esc(g.save.nameKana)}</span>` : ''} · nível estimado: <b>${levelFor(c.words)}</b></div></div>`));
    const box = (n: string | number, l: string) => `<div class="statbox"><b>${n}</b><span>${l}</span></div>`;
    b.appendChild(h(`<div class="statgrid">
      ${box(fmtNum(c.words), 'palavras aprendidas (folhas)')}${box(`${((c.words / 10000) * 100).toFixed(1)}%`, 'da Grande Árvore')}
      ${box(fmtNum(c.memorized), 'memorizadas 🌸')}${box(fmtNum(c.mastered), 'dominadas ⭐')}
      ${box(c.kanji, 'kanji de 2.136')}${box(c.kana, 'kana')}
      ${box(c.due, 'para revisar agora')}${box(acc + '%', 'de acertos')}
      ${box(st.wins + '/' + st.battles, 'sombras vencidas')}${box('x' + st.bestCombo, 'maior combo')}
      ${box(st.lessons, 'lições')}${box(st.spoken, 'palavras faladas 🎤')}
      ${box(fmtTime(g.save.playTime), 'tempo de jogo')}${box(st.dailyStreak + ' 🔥', 'dias seguidos')}
      ${box(fmtNum(g.save.mon), '文 mon')}${box(g.save.visited.length + '/11', 'lugares visitados')}
      ${box(g.save.bosses.length + '/10', 'selos (Grandes Sombras)')}${box(Object.keys(g.save.flags).filter((k) => k.startsWith('convo:')).length + '/8', 'conversas completas')}
    </div>`));
  }
}
