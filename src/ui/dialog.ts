/**
 * Dialogue box (washi paper): speaker tag, Japanese line with typewriter reveal, reading (furigana line)
 * and romaji on demand, Portuguese translation, voice, and choices (optionally tagged with a register).
 */
import { h, esc, sleep } from '../core/util';
import { ICON } from './icons';
import { voice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { toRomaji } from '../lang/kana';
import readingsJson from '../data/readings.json';
import { regBadge } from './learnui';

const READINGS = readingsJson as unknown as Record<string, string>;
export function readingOf(jp: string): string | null {
  return READINGS[jp] ?? null;
}

export interface Speaker {
  talking: boolean;
  emote?(e: string, secs?: number): void;
}

export interface Line {
  who?: string;
  whoJp?: string;
  role?: string;
  jp?: string;
  pt: string;
  voice?: { pitch: number; rate: number };
  speaker?: Speaker | null;
  expr?: string;
}

export interface Choice {
  label: string;
  jp?: string;
  sub?: string;
  icon?: string;
  reg?: string;
  /** mark as right/wrong after picking (register exercises) */
  good?: boolean;
}

export interface DialogPrefs {
  romaji: boolean;
  furigana: boolean;
  autoSpeak: boolean;
}

export class DialogUI {
  private el: HTMLElement | null = null;
  prefs: DialogPrefs = { romaji: true, furigana: true, autoSpeak: true };
  private advance: (() => void) | null = null;
  private keyHandler = (e: KeyboardEvent) => {
    if (!this.el) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
      e.preventDefault();
      this.advance?.();
    }
    const n = Number(e.key);
    if (n >= 1 && n <= 6) (this.el.querySelectorAll('.choice')[n - 1] as HTMLElement | undefined)?.click();
  };

  constructor(private parent: HTMLElement) {
    window.addEventListener('keydown', this.keyHandler);
  }

  get open() {
    return !!this.el;
  }

  private render(line: Line | null): HTMLElement {
    if (!this.el) {
      this.el = h(`<div class="dialog-box"><div class="db"></div></div>`);
      this.parent.appendChild(this.el);
    }
    const db = this.el.querySelector('.db') as HTMLElement;
    if (!line) {
      db.innerHTML = '';
      return db;
    }
    const reading = line.jp ? readingOf(line.jp) : null;
    db.innerHTML = `${line.who ? `<div class="name">${esc(line.who)}${line.whoJp ? `<span class="jp">${esc(line.whoJp)}</span>` : ''}${line.role ? `<span class="role">${esc(line.role)}</span>` : ''}</div>` : ''}
      ${line.jp ? `<div class="tools"><button class="round small say" title="Ouvir">${ICON.speaker}</button></div><div class="line-jp"></div>` : ''}
      ${line.jp && reading && this.prefs.furigana ? `<div class="line-r">${esc(reading)}</div>` : ''}
      ${line.jp && reading && this.prefs.romaji ? `<div class="line-ro">${esc(toRomaji(reading))}</div>` : ''}
      <div class="line-pt ${line.jp ? '' : 'only'}">${esc(line.pt)}</div>`;
    db.querySelector('.say')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (line.jp) this.speak(line);
    });
    return db;
  }

  private speak(line: Line) {
    if (!line.jp) return;
    if (line.speaker) line.speaker.talking = true;
    const stop = () => {
      if (line.speaker) line.speaker.talking = false;
    };
    voice.speak(line.jp, { pitch: line.voice?.pitch ?? 1, rate: line.voice?.rate ?? 1, onend: stop });
    setTimeout(stop, 900 + line.jp.length * 140);
  }

  /** shows a line and waits for the player */
  async say(line: Line): Promise<void> {
    const db = this.render(line);
    if (line.expr && line.speaker?.emote) line.speaker.emote(line.expr, 2.5);
    if (line.jp && this.prefs.autoSpeak) this.speak(line);
    const jpEl = db.querySelector('.line-jp') as HTMLElement | null;
    let full = false;
    const fullText = line.jp ?? '';
    const typer = (async () => {
      if (!jpEl) return;
      for (let i = 1; i <= fullText.length; i++) {
        if (full) break;
        jpEl.textContent = fullText.slice(0, i);
        if (i % 2 === 0) sfx.blip(line.voice?.pitch ?? 1);
        await sleep(28);
      }
      jpEl.textContent = fullText;
      full = true;
    })();
    await new Promise<void>((res) => {
      const more = h(`<div class="more">▼</div>`);
      db.appendChild(more);
      this.advance = () => {
        if (!full) {
          full = true;
          if (jpEl) jpEl.textContent = fullText;
          return;
        }
        sfx.click();
        this.advance = null;
        res();
      };
      db.addEventListener('click', () => this.advance?.(), { once: false });
    });
    await typer;
    if (line.speaker) line.speaker.talking = false;
  }

  /** shows a line (optional) with choices; resolves with the chosen index */
  choose(line: Line | null, choices: Choice[], reveal = false): Promise<number> {
    const db = this.render(line);
    if (line?.jp) {
      const jpEl = db.querySelector('.line-jp') as HTMLElement | null;
      if (jpEl) jpEl.textContent = line.jp;
      if (this.prefs.autoSpeak) this.speak(line);
    }
    const box = h(`<div class="choices"></div>`);
    db.appendChild(box);
    return new Promise((res) => {
      choices.forEach((c, i) => {
        const b = h(`<button class="choice">${c.icon ? `<span class="ico">${c.icon}</span>` : `<span class="ico" style="font-size:13px;opacity:.6">${i + 1}</span>`}<span>${c.jp ? `<span class="jp">${esc(c.jp)}</span> ` : ''}${c.reg ? regBadge(c.reg) : ''}<span class="${c.jp ? 'sub' : ''}">${esc(c.label)}</span>${c.sub ? `<small class="sub">${esc(c.sub)}</small>` : ''}</span></button>`);
        b.addEventListener('click', async (e) => {
          e.stopPropagation();
          sfx.click();
          if (c.jp) voice.speak(c.jp);
          if (reveal && c.good !== undefined) {
            b.classList.add(c.good ? 'good' : 'bad');
            if (!c.good) box.querySelectorAll('.choice').forEach((x, j) => choices[j].good && x.classList.add('good'));
            await sleep(c.good ? 700 : 1300);
          }
          res(i);
        });
        box.appendChild(b);
      });
    });
  }

  close() {
    this.el?.remove();
    this.el = null;
    this.advance = null;
    voice.stop();
  }
}
