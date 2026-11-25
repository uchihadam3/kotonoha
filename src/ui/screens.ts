/**
 * Full-screen moments: gate, studio logo, KOTONOHA logo reveal, main menu, save slots (load/new/import/
 * export), options, credits, install, confirm dialogs, toasts and fades.
 */
import studioLogo from '../assets/uchihadam-production.webp';
import { LOGO_CSS, logoHTML } from './logo';
import { ICON } from './icons';
import { h, sleep, esc, fmtTime, fmtNum } from '../core/util';
import { listSlots, deleteSlot, exportFile, importFile, saveToCode, saveFromCode, writeSlot, leavesOf, SLOT_COUNT, type SaveData } from '../core/save';
import type { Settings } from '../core/settings';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';

export interface MenuActions {
  continueGame(slot: number): void;
  newGame(slot: number): void;
  options(): void;
  credits(): void;
  install(): void;
  canInstall(): boolean;
}

export class Screens {
  readonly root: HTMLElement;
  private fade: HTMLElement;
  private toasts: HTMLElement;
  private skip = false;

  constructor(parent: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = LOGO_CSS;
    document.head.appendChild(style);
    this.root = h(`<div id="screens"></div>`);
    parent.appendChild(this.root);
    this.fade = h(`<div id="fade"></div>`);
    parent.appendChild(this.fade);
    this.toasts = h(`<div id="toasts"></div>`);
    parent.appendChild(this.toasts);
  }

  screen(cls: string, html: string): HTMLElement {
    const el = h(`<div class="screen ${cls}">${html}</div>`);
    this.root.appendChild(el);
    return el;
  }

  clear() {
    this.root.innerHTML = '';
  }

  fadeTo(v: number, ms = 800, white = false): Promise<void> {
    this.fade.classList.toggle('white', white);
    this.fade.style.transition = `opacity ${ms}ms ease`;
    this.fade.style.opacity = String(v);
    return sleep(ms);
  }

  toast(html: string, ms = 4200) {
    const el = h(`<div class="toast">${html}</div>`);
    el.style.animationDuration = ms + 'ms';
    this.toasts.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  btn(label: string, fn: () => void, cls = '', icon = ''): HTMLButtonElement {
    const b = h(`<button class="mbtn ${cls}">${icon ? `<span class="ico">${icon}</span>` : ''}<span>${label}</span></button>`) as HTMLButtonElement;
    b.addEventListener('pointerenter', () => sfx.hover());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      sfx.click();
      fn();
    });
    return b;
  }

  confirm(text: string, yes = 'Sim', no = 'Não'): Promise<boolean> {
    return new Promise((res) => {
      const el = this.screen('dim center', `<div class="panel dialog"><p>${text}</p><div class="row center"></div></div>`);
      const row = el.querySelector('.row')!;
      row.append(
        this.btn(no, () => {
          el.remove();
          res(false);
        }, 'ghost'),
        this.btn(yes, () => {
          el.remove();
          res(true);
        }, 'primary'),
      );
    });
  }

  alert(html: string, ok = 'OK'): Promise<void> {
    return new Promise((res) => {
      const el = this.screen('dim center', `<div class="panel dialog"><p>${html}</p><div class="row center"></div></div>`);
      el.querySelector('.row')!.append(this.btn(ok, () => {
        el.remove();
        res();
      }, 'primary'));
    });
  }

  // ───────────────────────────── intro ─────────────────────────────

  /** Click-to-begin (browsers need a gesture to start audio and voice). */
  gate(): Promise<void> {
    const el = this.screen('gate center', `<div class="seal">言</div><p>TOQUE PARA COMEÇAR</p><small>🎧 Melhor com som ligado: o jogo fala japonês com você.</small>`);
    return new Promise((res) => {
      const go = (e: Event) => {
        e.preventDefault();
        el.removeEventListener('pointerdown', go);
        window.removeEventListener('keydown', go);
        el.classList.add('out');
        setTimeout(() => el.remove(), 600);
        res();
      };
      el.addEventListener('pointerdown', go);
      window.addEventListener('keydown', go);
    });
  }

  private armSkip() {
    this.skip = false;
    const s = () => (this.skip = true);
    setTimeout(() => {
      window.addEventListener('keydown', s, { once: true });
      window.addEventListener('pointerdown', s, { once: true });
    }, 400);
  }

  private async wait(ms: number) {
    for (let t = 0; t < ms; t += 50) {
      if (this.skip) return;
      await sleep(50);
    }
  }

  /** Uchihadam Production: embers rising, the emblem fading in under a sweep of light. */
  async studio() {
    this.armSkip();
    const el = this.screen('studio center', `<canvas class="embers"></canvas><div class="logo-wrap"><img alt="Uchihadam Production" src="${studioLogo}"><div class="sweep"></div></div><div class="presents">APRESENTA</div><div class="skip-hint">toque para pular</div>`);
    (el.querySelector('.logo-wrap') as HTMLElement).style.setProperty('--logo', `url(${studioLogo})`);
    const stop = embers(el.querySelector('canvas') as HTMLCanvasElement);
    await this.wait(450);
    sfx.studio();
    el.classList.add('play');
    await this.wait(6400);
    el.classList.add('out');
    await sleep(this.skip ? 250 : 650);
    stop();
    el.remove();
  }

  /** The KOTONOHA logo reveal over drifting glowing leaves. */
  async titleReveal() {
    this.armSkip();
    const el = this.screen('title-reveal center', `<canvas></canvas>${logoHTML('A Jornada das Dez Mil Palavras')}<div class="skip-hint">toque para pular</div>`);
    const logo = el.querySelector('.kt-logo') as HTMLElement;
    logo.classList.add('pre');
    const stop = leavesBg(el.querySelector('canvas') as HTMLCanvasElement);
    await this.wait(350);
    sfx.title();
    logo.classList.remove('pre');
    logo.classList.add('reveal');
    await this.wait(5600);
    el.classList.add('out');
    await sleep(650);
    stop();
    el.remove();
  }

  // ───────────────────────────── main menu ─────────────────────────────

  mainMenu(actions: MenuActions, last: SaveData | null): HTMLElement {
    const el = this.screen('menu-screen', `<div class="logo-slot">${logoHTML('A Jornada das Dez Mil Palavras', 'small')}</div><div class="menu"></div><div class="version">v${__BUILD__}</div><div class="studio-mark">UCHIHADAM PRODUCTION</div>`);
    const menu = el.querySelector('.menu') as HTMLElement;
    if (last) {
      const words = leavesOf(last, 'w:');
      menu.append(this.btn(`Continuar <span class="sub">${esc(last.name || 'Viajante')} · ${fmtNum(words)} palavras</span>`, () => actions.continueGame(last.slot), 'primary', ICON.play));
    }
    menu.append(this.btn('Novo jogo', () => this.slotPicker('new', actions), last ? '' : 'primary', ICON.plus));
    menu.append(this.btn('Carregar', () => this.slotPicker('load', actions), '', ICON.load));
    menu.append(this.btn('Opções', () => actions.options(), '', ICON.gear));
    if (actions.canInstall()) menu.append(this.btn('Instalar o jogo', () => actions.install(), '', ICON.install));
    menu.append(this.btn('Créditos', () => actions.credits(), '', ICON.scroll));
    return el;
  }

  slotPicker(mode: 'new' | 'load', actions: MenuActions) {
    const el = this.screen('dim center', `<div class="panel" style="width:min(640px,94vw)"><button class="close">${ICON.close}</button><h2><span class="jp">${mode === 'new' ? '新' : '記'}</span>${mode === 'new' ? 'Novo jogo' : 'Carregar jornada'}</h2><div class="slots"></div><div class="row" style="margin-top:14px"></div></div>`);
    const close = () => {
      sfx.back();
      el.remove();
    };
    el.querySelector('.close')!.addEventListener('click', close);
    el.addEventListener('pointerdown', (e) => {
      if (e.target === el) close();
    });
    const list = el.querySelector('.slots') as HTMLElement;
    const render = () => {
      list.innerHTML = '';
      for (const { slot, data } of listSlots()) {
        const words = data ? leavesOf(data, 'w:') : 0;
        const kanji = data ? leavesOf(data, 'K:') : 0;
        const card = h(`<div class="slot ${data ? '' : 'empty'}"><div class="num">${['一', '二', '三'][slot]}</div><div class="info">${
          data
            ? `<b>${esc(data.name || 'Viajante')} ${data.nameKana ? `<span class="jp" style="color:var(--gold2)">${esc(data.nameKana)}</span>` : ''}</b><div class="meta">${fmtNum(words)} palavras · ${kanji} kanji · ${fmtTime(data.playTime)}<br>${new Date(data.updated).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>`
            : `<b>Espaço vazio</b><div class="meta">${mode === 'new' ? 'Começar uma nova jornada aqui' : 'Nenhuma jornada salva'}</div>`
        }</div><div class="acts"></div></div>`);
        const acts = card.querySelector('.acts') as HTMLElement;
        if (data) {
          const exp = h(`<button class="iconbtn" title="Exportar">${ICON.export}</button>`);
          exp.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exportDialog(data);
          });
          const del = h(`<button class="iconbtn" title="Apagar">${ICON.trash}</button>`);
          del.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (await this.confirm(`Apagar a jornada de <b>${esc(data.name || 'Viajante')}</b>? Isso não pode ser desfeito.`, 'Apagar', 'Cancelar')) {
              deleteSlot(slot);
              render();
            }
          });
          acts.append(exp, del);
        }
        card.addEventListener('click', async () => {
          sfx.click();
          if (mode === 'load') {
            if (!data) return;
            el.remove();
            actions.continueGame(slot);
          } else {
            if (data && !(await this.confirm(`Começar um jogo novo no espaço ${slot + 1}? A jornada de <b>${esc(data.name || 'Viajante')}</b> será substituída.`, 'Substituir', 'Cancelar'))) return;
            el.remove();
            actions.newGame(slot);
          }
        });
        list.appendChild(card);
      }
    };
    render();
    if (mode === 'load') {
      const row = el.querySelector('.row') as HTMLElement;
      row.append(
        this.btn('Importar código', () => this.importDialog(render), 'small ghost', ICON.import),
        this.btn('Importar arquivo', async () => {
          const d = await importFile();
          if (!d) return this.toast('Arquivo inválido.');
          await this.placeImported(d);
          render();
        }, 'small ghost', ICON.load),
      );
    }
  }

  private async placeImported(d: SaveData) {
    const slots = listSlots();
    const free = slots.find((s) => !s.data);
    let slot = free ? free.slot : -1;
    if (slot < 0) {
      const ok = await this.confirm('Todos os espaços estão ocupados. Substituir o espaço 3?', 'Substituir', 'Cancelar');
      if (!ok) return;
      slot = SLOT_COUNT - 1;
    }
    d.slot = slot;
    writeSlot(d);
    this.toast(`Jornada de <b>${esc(d.name || 'Viajante')}</b> importada no espaço ${slot + 1}.`);
  }

  private importDialog(after: () => void) {
    const el = this.screen('dim center', `<div class="panel" style="width:min(560px,94vw)"><button class="close">${ICON.close}</button><h2>Importar código</h2><p class="muted small">Cole o código exportado de outro aparelho.</p><textarea placeholder="KT2:..."></textarea><div class="row end" style="margin-top:12px"></div></div>`);
    el.querySelector('.close')!.addEventListener('click', () => el.remove());
    const ta = el.querySelector('textarea') as HTMLTextAreaElement;
    el.querySelector('.row')!.append(this.btn('Importar', async () => {
      const d = await saveFromCode(ta.value);
      if (!d) return this.toast('Código inválido.');
      el.remove();
      await this.placeImported(d);
      after();
    }, 'primary small'));
  }

  private async exportDialog(d: SaveData) {
    const code = await saveToCode(d);
    const el = this.screen('dim center', `<div class="panel" style="width:min(560px,94vw)"><button class="close">${ICON.close}</button><h2>Exportar jornada</h2><p class="muted small">Copie o código ou salve o arquivo para continuar em outro aparelho (Carregar → Importar).</p><textarea readonly></textarea><div class="row end" style="margin-top:12px"></div></div>`);
    el.querySelector('.close')!.addEventListener('click', () => el.remove());
    const ta = el.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = code;
    el.querySelector('.row')!.append(
      this.btn('Salvar arquivo', () => exportFile(d), 'small ghost', ICON.export),
      this.btn('Copiar código', async () => {
        try {
          await navigator.clipboard.writeText(code);
          this.toast('Código copiado!');
        } catch {
          ta.select();
          document.execCommand('copy');
          this.toast('Código copiado!');
        }
      }, 'small primary', ICON.copy),
    );
  }

  // ───────────────────────────── options ─────────────────────────────

  options(s: Settings, apply: (s: Settings) => void, onClose?: () => void) {
    const el = this.screen('dim center', `<div class="panel" style="width:min(680px,95vw)"><button class="close">${ICON.close}</button><h2><span class="jp">設定</span>Opções</h2><div class="opts"></div></div>`);
    const close = () => {
      sfx.back();
      el.remove();
      onClose?.();
    };
    el.querySelector('.close')!.addEventListener('click', close);
    const opts = el.querySelector('.opts') as HTMLElement;
    const slider = (label: string, key: keyof Settings, min = 0, max = 1, step = 0.05) => {
      const l = h(`<label>${label}</label>`);
      const i = h(`<input type="range" min="${min}" max="${max}" step="${step}">`) as HTMLInputElement;
      i.value = String(s[key]);
      i.addEventListener('input', () => {
        (s[key] as number) = Number(i.value);
        apply(s);
      });
      opts.append(l, i);
    };
    const seg = (label: string, key: keyof Settings, values: [string, string][], hint = '') => {
      const l = h(`<label>${label}</label>`);
      const g = h(`<div class="seg"></div>`);
      for (const [v, t] of values) {
        const b = h(`<button class="${String(s[key]) === v ? 'on' : ''}">${t}</button>`);
        b.addEventListener('click', () => {
          sfx.click();
          (s as unknown as Record<string, unknown>)[key] = v === 'true' ? true : v === 'false' ? false : isNaN(Number(v)) ? v : Number(v);
          g.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          apply(s);
        });
        g.appendChild(b);
      }
      opts.append(l, g);
      if (hint) opts.append(h(`<div class="hint">${hint}</div>`));
    };
    slider('Volume geral', 'master');
    slider('Música', 'music');
    slider('Efeitos', 'sfx');
    slider('Voz japonesa', 'voice');
    slider('Velocidade da voz', 'voiceRate', 0.5, 1.3, 0.05);
    // voice picker
    if (voice.voices.length > 1) {
      const l = h(`<label>Voz</label>`);
      const sel = h(`<select></select>`) as HTMLSelectElement;
      sel.append(h(`<option value="">Automática (melhor disponível)</option>`));
      for (const v of voice.voices) sel.append(h(`<option value="${esc(v.name)}">${esc(v.name)}</option>`));
      sel.value = s.voiceName;
      sel.addEventListener('change', () => {
        s.voiceName = sel.value;
        apply(s);
        voice.speak('こんにちは。ことのはへ ようこそ。');
      });
      opts.append(l, sel);
    } else if (!voice.ja) {
      opts.append(h(`<div class="hint" style="color:#ffb38a">Nenhuma voz japonesa encontrada neste aparelho. No celular, instale "Japonês" nas vozes de texto-para-fala do sistema; no computador, Chrome e Edge já têm vozes japonesas.</div>`));
    }
    seg('Romaji (letras latinas)', 'romaji', [['sempre', 'Sempre'], ['iniciante', 'No começo'], ['nunca', 'Nunca']], 'Em "No começo", o romaji some das palavras que você já aprendeu.');
    seg('Furigana (leitura sobre o kanji)', 'furigana', [['true', 'Mostrar'], ['false', 'Esconder']]);
    seg('Falar automaticamente', 'autoSpeak', [['true', 'Sim'], ['false', 'Não']], 'Lê em voz alta cada palavra e fala dos personagens.');
    seg('Responder falando (microfone)', 'speech', [['true', 'Sim'], ['false', 'Não']], 'Em desafios, você pode falar a palavra em japonês (Chrome/Edge/Safari).');
    seg('Gráficos', 'quality', [['auto', 'Auto'], ['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']]);
    slider('Sensibilidade da câmera', 'camSens', 0.3, 2, 0.05);
    seg('Inverter câmera vertical', 'invertY', [['false', 'Não'], ['true', 'Sim']]);
    seg('Tamanho do texto', 'textScale', [['0.9', 'P'], ['1', 'M'], ['1.15', 'G'], ['1.3', 'GG']]);
    seg('Menos movimento', 'reducedMotion', [['false', 'Não'], ['true', 'Sim']]);
    const fs = this.btn('Tela cheia', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.().catch(() => {});
    }, 'small ghost', ICON.fullscreen);
    opts.append(h('<span></span>'), fs);
  }

  credits() {
    const el = this.screen('dim center', `<div class="panel credits" style="width:min(640px,94vw)"><button class="close">${ICON.close}</button>
      <h2 style="justify-content:center"><span class="jp">言の葉</span>KOTONOHA</h2>
      <div class="role">Uma produção</div><div class="name">Uchihadam Production</div>
      <div class="role">Direção, mundo, história, música e arte</div><div class="name">Uchihadam Production</div>
      <div class="role">Programação e sons sintetizados</div><div class="name">Feito com Three.js e Web Audio</div>
      <div class="role">Dados de japonês</div>
      <div class="lic">KANJIDIC2 e JMdict © Electronic Dictionary Research and Development Group (EDRDG), CC BY-SA 4.0.<br>
      Traços dos kanji e kana: KanjiVG © Ulrich Apel, CC BY-SA 3.0.<br>
      Listas JLPT: Jonathan Waller (tanos.co.uk) via open-anki-jlpt-decks (MIT).<br>
      Fontes: Zen Maru Gothic, Klee One, Yuji Syuku, Shippori Mincho B1 e Marcellus (SIL Open Font License).<br>
      Epígrafe: Ki no Tsurayuki, prefácio do Kokin Wakashū (905), domínio público.</div>
      <div class="role">Obrigado por jogar</div><div class="name jp" style="font-size:26px">ありがとうございます！</div></div>`);
    el.querySelector('.close')!.addEventListener('click', () => {
      sfx.back();
      el.remove();
    });
  }
}

function embers(cv: HTMLCanvasElement): () => void {
  const g = cv.getContext('2d')!;
  let run = true;
  const P: { x: number; y: number; vx: number; vy: number; l: number; s: number }[] = [];
  const resize = () => {
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
  };
  resize();
  const loop = () => {
    if (!run) return;
    requestAnimationFrame(loop);
    g.clearRect(0, 0, cv.width, cv.height);
    if (P.length < 150) P.push({ x: cv.width * (0.28 + Math.random() * 0.44), y: cv.height * (0.6 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 1.6, l: 1, s: 1 + Math.random() * 2.2 });
    for (const p of P) {
      p.x += p.vx + Math.sin(p.y * 0.02) * 0.3;
      p.y += p.vy;
      p.l -= 0.006;
      const a = Math.max(0, p.l);
      g.fillStyle = `rgba(255,${120 + Math.floor(a * 100)},40,${a * 0.85})`;
      g.beginPath();
      g.arc(p.x, p.y, p.s * a, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = P.length - 1; i >= 0; i--) if (P[i].l <= 0) P.splice(i, 1);
  };
  loop();
  return () => (run = false);
}

/** Glowing leaves and kana drifting upward behind the logo. */
function leavesBg(cv: HTMLCanvasElement): () => void {
  const g = cv.getContext('2d')!;
  let run = true;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = window.innerWidth * dpr;
  cv.height = window.innerHeight * dpr;
  g.scale(dpr, dpr);
  const W = window.innerWidth, H = window.innerHeight;
  const glyphs = 'あいうえおかきくけこさしすせそ言葉心花月風夢光水木日人山川空海'.split('');
  const N: { x: number; y: number; s: number; v: number; r: number; vr: number; k: number; ch: string; a: number }[] = [];
  for (let i = 0; i < 60; i++)
    N.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 1.2, v: 0.15 + Math.random() * 0.5, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.02, k: Math.random() < 0.35 ? 1 : 0, ch: glyphs[Math.floor(Math.random() * glyphs.length)], a: Math.random() * 6.28 });
  const leaf = (s: number) => {
    g.beginPath();
    g.moveTo(0, -10 * s);
    g.bezierCurveTo(7 * s, -6 * s, 7 * s, 6 * s, 0, 10 * s);
    g.bezierCurveTo(-7 * s, 6 * s, -7 * s, -6 * s, 0, -10 * s);
    g.fill();
  };
  const loop = () => {
    if (!run) return;
    requestAnimationFrame(loop);
    g.clearRect(0, 0, W, H);
    for (const n of N) {
      n.y -= n.v;
      n.a += 0.01;
      n.x += Math.sin(n.a) * 0.35;
      n.r += n.vr;
      if (n.y < -30) {
        n.y = H + 30;
        n.x = Math.random() * W;
      }
      g.save();
      g.translate(n.x, n.y);
      g.rotate(n.r);
      const alpha = 0.12 + n.s * 0.22;
      if (n.k) {
        g.font = `${Math.floor(16 * n.s)}px 'kt-learn', serif`;
        g.fillStyle = `rgba(246, 227, 176, ${alpha * 0.8})`;
        g.textAlign = 'center';
        g.fillText(n.ch, 0, 0);
      } else {
        g.shadowColor = 'rgba(95, 211, 162, .8)';
        g.shadowBlur = 10;
        g.fillStyle = `rgba(140, 235, 190, ${alpha})`;
        leaf(n.s);
      }
      g.restore();
    }
  };
  loop();
  return () => (run = false);
}
