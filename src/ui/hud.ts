/** In-game HUD: the leaf meter, counters, clock, coins, quest tracker, interaction prompt, region banner. */
import { h, esc, fmtNum } from '../core/util';
import { ICON } from './icons';
import { rankFor, REGIONS, type RegionDef } from '../data/regions';
import type { Counts } from '../game/learner';

export interface HudActions {
  book(): void;
  map(): void;
  menu(): void;
  interact(): void;
  jump(): void;
  review(): void;
}

export class Hud {
  readonly el: HTMLElement;
  private meterN: HTMLElement;
  private rank: HTMLElement;
  private bar: HTMLElement;
  private next: HTMLElement;
  private ring: SVGElement;
  private leaf: HTMLElement;
  private chips: HTMLElement;
  private clock: HTMLElement;
  private mon: HTMLElement;
  private quest: HTMLElement;
  private prompt: HTMLElement;
  private banner: HTMLElement;
  private bookBadge: HTMLElement;
  private lastLeaves = -1;

  constructor(parent: HTMLElement, act: HudActions) {
    this.el = h(`<div class="hud">
      <div class="meter" title="Folhas da Grande Árvore (palavras aprendidas)">
        <div class="leaf"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.12)" stroke-width="3"/><circle class="ring" cx="26" cy="26" r="23" fill="none" stroke="#5fd3a2" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dashoffset="100" transform="rotate(-90 26 26)"/><path d="M26 12c8 6 10 16 2 26-1 1-3 1-4 0-8-10-6-20 2-26z" fill="#5fd3a2"/><path d="M26 15v22M26 22l4-3M26 27l-4-3M26 31l3-2" stroke="#e9fff4" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg></div>
        <div class="txt"><div class="n">0<small>palavras</small></div><div class="rank"></div><div class="bar"><i></i></div><div class="next"></div></div>
      </div>
      <div class="chips"></div>
      <div class="tr">
        <div class="clock"><span class="jp">朝</span><span>manhã</span></div>
        <div class="mon">${ICON.coin}<span>0</span></div>
        <button class="hbtn b-book" title="Livro das palavras (Tab)">${ICON.book}<span class="badge" style="display:none"></span></button>
        <button class="hbtn b-map" title="Mapa (M)">${ICON.map}</button>
        <button class="hbtn b-menu" title="Menu (Esc)">${ICON.menu}</button>
      </div>
      <div class="quest" style="display:none"></div>
      <div class="prompt"><span class="key">E</span><span class="ptxt"></span></div>
      <div class="banner"><div class="jp"></div><div class="pt"></div><div class="lv"></div></div>
      <div class="touchpad"><button class="tbtn small b-jump">${ICON.arrow}<span>pular</span></button><button class="tbtn b-act">${ICON.hand}<span>agir</span></button></div>
    </div>`);
    parent.appendChild(this.el);
    const q = <T extends Element = HTMLElement>(s: string) => this.el.querySelector(s) as unknown as T;
    this.meterN = q('.meter .n');
    this.rank = q('.meter .rank');
    this.bar = q('.meter .bar i');
    this.next = q('.meter .next');
    this.ring = q<SVGElement>('.ring');
    this.leaf = q('.leaf');
    this.chips = q('.chips');
    this.clock = q('.clock');
    this.mon = q('.mon span');
    this.quest = q('.quest');
    this.prompt = q('.prompt');
    this.banner = q('.banner');
    this.bookBadge = q('.b-book .badge');
    q('.b-book').addEventListener('click', act.book);
    q('.b-map').addEventListener('click', act.map);
    q('.b-menu').addEventListener('click', act.menu);
    q('.meter').addEventListener('click', act.book);
    this.prompt.addEventListener('click', act.interact);
    q('.b-act').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      act.interact();
    });
    q('.b-jump').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      act.jump();
    });
    this.chips.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.due')) act.review();
    });
  }

  set visible(v: boolean) {
    this.el.style.display = v ? '' : 'none';
  }

  update(c: Counts, mon: number) {
    const L = c.words;
    if (L !== this.lastLeaves) {
      if (this.lastLeaves >= 0 && L > this.lastLeaves) {
        this.leaf.classList.remove('pulse');
        void this.leaf.offsetWidth;
        this.leaf.classList.add('pulse');
      }
      this.lastLeaves = L;
    }
    this.meterN.innerHTML = `${fmtNum(L)}<small>${L === 1 ? 'palavra' : 'palavras'}</small>`;
    const rk = rankFor(L);
    this.rank.innerHTML = `<span class="jp">${rk.jp}</span>${rk.pt}`;
    const nextRegion = REGIONS.filter((r) => r.req > L).sort((a, b) => a.req - b.req)[0];
    const prevReq = REGIONS.filter((r) => r.req <= L).reduce((m, r) => Math.max(m, r.req), 0);
    if (nextRegion) {
      const k = (L - prevReq) / Math.max(1, nextRegion.req - prevReq);
      this.bar.style.width = `${Math.min(100, k * 100)}%`;
      this.next.textContent = `${nextRegion.name}: ${fmtNum(nextRegion.req)}`;
    } else {
      this.bar.style.width = `${Math.min(100, (L / 10000) * 100)}%`;
      this.next.textContent = `Grande Árvore: ${fmtNum(L)} / 10.000`;
    }
    this.ring.setAttribute('stroke-dashoffset', String(100 - Math.min(100, (L / 10000) * 100 * 8 + (L > 0 ? 2 : 0))));
    const chips: string[] = [];
    if (c.due > 0) chips.push(`<span class="chip2 due">🍂 ${c.due} para revisar</span>`);
    if (c.seeds > 0) chips.push(`<span class="chip2">🌱 ${c.seeds} brotando</span>`);
    if (c.kana > 0) chips.push(`<span class="chip2"><span class="jp">あ</span> ${c.kana} kana</span>`);
    if (c.kanji > 0) chips.push(`<span class="chip2"><span class="jp">字</span> ${c.kanji} kanji</span>`);
    this.chips.innerHTML = chips.join('');
    this.mon.textContent = fmtNum(mon);
    this.bookBadge.style.display = c.due > 0 ? '' : 'none';
    this.bookBadge.textContent = String(Math.min(99, c.due));
  }

  setClock(clock: number) {
    const c = ((clock % 1) + 1) % 1;
    const [jp, pt] = c < 0.22 ? ['夜', 'noite'] : c < 0.42 ? ['朝', 'manhã'] : c < 0.7 ? ['昼', 'tarde'] : c < 0.82 ? ['夕', 'entardecer'] : ['夜', 'noite'];
    const hh = Math.floor(c * 24), mm = Math.floor((c * 24 - hh) * 60);
    this.clock.innerHTML = `<span class="jp">${jp}</span><span>${pt} ${String(hh).padStart(2, '0')}:${String(Math.floor(mm / 10) * 10).padStart(2, '0')}</span>`;
  }

  setQuest(title: string | null, html = '') {
    if (!title) {
      this.quest.style.display = 'none';
      return;
    }
    this.quest.style.display = '';
    this.quest.innerHTML = `<div class="qt">${esc(title)}</div>${html}`;
  }

  setPrompt(text: string | null, key = 'E') {
    if (!text) {
      this.prompt.classList.remove('on');
      return;
    }
    (this.prompt.querySelector('.key') as HTMLElement).textContent = key;
    const t = this.prompt.querySelector('.ptxt') as HTMLElement;
    if (t.innerHTML !== text) t.innerHTML = text;
    this.prompt.classList.add('on');
  }

  showBanner(r: RegionDef) {
    (this.banner.querySelector('.jp') as HTMLElement).textContent = r.jp;
    (this.banner.querySelector('.pt') as HTMLElement).textContent = r.name;
    (this.banner.querySelector('.lv') as HTMLElement).textContent = `${r.kana} · nível ${r.level}`;
    this.banner.classList.remove('show');
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
  }
}
