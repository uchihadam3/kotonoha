/**
 * The application: boot flow (gate → Uchihadam Production → KOTONOHA logo → title menu), settings,
 * saving, and switching between the title scene and the game.
 */
import * as THREE from 'three';
import { Engine } from '../core/engine';
import { Input } from '../core/input';
import { loadSettings, saveSettings, type Settings } from '../core/settings';
import { lastSlot, loadSlot, writeSlot } from '../core/save';
import { Screens } from '../ui/screens';
import { audio } from '../audio/audio';
import { music } from '../audio/music';
import { voice } from '../audio/voice';
import { World } from '../world/world';
import { h } from '../core/util';
import { newSave } from '../core/save';
import { Game } from './game';
import { prologue, characterCreator } from './cutscene';
import { lookFromSave } from './game';
import '../ui/game.css';

export class App {
  readonly root: HTMLElement;
  readonly ui: HTMLElement;
  engine!: Engine;
  input!: Input;
  screens!: Screens;
  settings: Settings = loadSettings();
  world: World | null = null;
  private installEvt: (Event & { prompt(): Promise<void> }) | null = null;

  constructor(parent: HTMLElement, readonly params: URLSearchParams) {
    this.root = parent;
    this.ui = h(`<div id="ui"></div>`);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installEvt = e as Event & { prompt(): Promise<void> };
    });
  }

  async boot() {
    this.engine = new Engine(this.root, this.settings.quality);
    this.root.appendChild(this.ui);
    this.screens = new Screens(this.ui);
    this.input = new Input(this.engine.canvas);
    this.applySettings(this.settings);
    voice.init(this.settings.voiceName);
    await document.fonts?.ready;
    const dev = this.params.get('dev');
    if (dev === 'island') return this.devIsland();
    if (dev === 'title') {
      audio.unlock();
      this.titleMenu();
      return;
    }
    if (dev === 'prologue' || dev === 'creator') {
      audio.unlock();
      const w = this.ensureWorld();
      const s = newSave(0);
      s.name = 'Adam';
      if (dev === 'creator') await characterCreator(this, w, s);
      else await prologue(this, w, lookFromSave(s));
      return;
    }
    if (dev === 'game') {
      audio.unlock();
      const slot = Number(this.params.get('slot') ?? 0);
      const fresh = this.params.has('fresh') || !loadSlot(slot);
      if (fresh && this.params.has('quick')) {
        const s = newSave(slot);
        s.name = 'Adam';
        s.nameKana = 'アダム';
        s.flags.tut = Number(this.params.get('tut') ?? 0);
        writeSlot(s);
        this.game = new Game(this, s);
        await this.game.start(false);
        return;
      }
      await this.startGame(slot, fresh);
      return;
    }
    // normal flow
    await this.screens.gate();
    audio.unlock();
    voice.prime();
    this.applySettings(this.settings);
    if (!this.params.has('skipintro')) {
      await this.screens.studio();
      await this.screens.titleReveal();
    }
    this.titleMenu();
  }

  applySettings(s: Settings) {
    this.settings = s;
    saveSettings(s);
    audio.setVolumes(s.master, s.music, s.sfx);
    voice.volume = s.voice;
    voice.rate = s.voiceRate;
    if (s.voiceName !== voice.preferredName) voice.setPreferred(s.voiceName);
    if (this.input) {
      this.input.sens = s.camSens;
      this.input.invertY = s.invertY;
    }
    document.documentElement.style.setProperty('--ts', String(s.textScale));
    if (this.engine && (s.quality === 'auto' ? Engine.detectQuality() : s.quality) !== this.engine.quality) this.engine.setQuality(s.quality);
  }

  ensureWorld(): World {
    if (!this.world) {
      this.world = new World(this.engine);
      this.world.finishVegetation();
    }
    return this.world;
  }

  private titleOrbit: (() => void) | null = null;

  /** the Great Tree at night, in full bloom, slowly circled by the camera */
  titleScene() {
    const w = this.ensureWorld();
    const cam = this.engine.camera;
    cam.far = 4000;
    cam.fov = 48;
    cam.updateProjectionMatrix();
    w.clock = 0.93;
    w.clockFrozen = true;
    // a vision of the goal: the tree with all ten thousand leaves
    w.tree.setCounts(10000, 2200, 900, 0);
    w.tree.instant();
    const base = w.treeBase;
    w.focus.copy(base).add(new THREE.Vector3(0, 10, 0));
    this.engine.setScene(w.scene, cam);
    this.titleOrbit?.();
    this.titleOrbit = this.engine.onFrame(({ dt, t }) => {
      const a = t * 0.045 + 2.2;
      const r = 118;
      cam.position.set(base.x + Math.cos(a) * r, base.y + 26 + Math.sin(t * 0.1) * 4, base.z + Math.sin(a) * r);
      // on wide screens keep the tree in the right third (logo and menu on the left)
      const wide = cam.aspect > 1.15 ? Math.min(1, (cam.aspect - 1.15) * 1.6) : 0;
      const side = 34 * wide;
      cam.lookAt(base.x - Math.sin(a) * side, base.y + 36, base.z + Math.cos(a) * side);
      w.update(dt, t, cam);
    });
    this.engine.start();
  }

  titleMenu() {
    this.titleScene();
    music.play('title');
    const last = lastSlot();
    this.screens.mainMenu(
      {
        continueGame: (slot) => this.startGame(slot, false),
        newGame: (slot) => this.startGame(slot, true),
        options: () => this.screens.options({ ...this.settings }, (s) => this.applySettings(s)),
        credits: () => this.screens.credits(),
        install: () => this.install(),
        canInstall: () => !!this.installEvt || this.isIOS(),
      },
      last !== null ? loadSlot(last) : null,
    );
  }

  isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as { standalone?: boolean }).standalone;
  }

  async install() {
    if (this.installEvt) {
      await this.installEvt.prompt();
      this.installEvt = null;
      return;
    }
    await this.screens.alert('No iPhone/iPad: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. O jogo abre em tela cheia e funciona sem internet.');
  }

  game: Game | null = null;

  async startGame(slot: number, fresh: boolean) {
    const save = fresh ? newSave(slot) : loadSlot(slot);
    if (!save) {
      this.screens.toast('Não foi possível carregar essa jornada.');
      return;
    }
    await this.screens.fadeTo(1, 700);
    this.screens.clear();
    this.titleOrbit?.();
    this.titleOrbit = null;
    music.stop(0.8);
    const w = this.ensureWorld();
    if (fresh) {
      await this.screens.fadeTo(0, 600);
      await characterCreator(this, w, save);
      await this.screens.fadeTo(1, 600);
      if (!this.params.has('skipcine')) {
        await this.screens.fadeTo(0, 10);
        this.engine.u.uFade.value = 1;
        await prologue(this, w, lookFromSave(save));
      }
    }
    this.game = new Game(this, save);
    const start = this.game.start(fresh);
    await this.screens.fadeTo(0, 900);
    this.engine.u.uFade.value = 0;
    await start;
  }

  async backToTitle() {
    await this.screens.fadeTo(1, 600);
    this.game?.stop();
    this.game = null;
    location.reload();
  }

  /** dev view: the whole island from above */
  devIsland() {
    const w = new World(this.engine);
    this.world = w;
    const cam = this.engine.camera;
    cam.far = 4000;
    cam.updateProjectionMatrix();
    const view = this.params.get('view') ?? 'top';
    w.clock = Number(this.params.get('clock') ?? 0.4);
    w.clockFrozen = true;
    if (view === 'top') {
      cam.position.set(0, 720, 330);
      cam.lookAt(0, 0, -60);
    } else {
      const [x, y, z, tx, ty, tz] = view.split(',').map(Number);
      cam.position.set(x, y, z);
      cam.lookAt(tx, ty, tz);
    }
    w.focus.set(0, 0, 0);
    (w.scene.fog as THREE.FogExp2).density = Number(this.params.get('fog') ?? 0.0003);
    this.engine.setScene(w.scene, cam);
    this.engine.onFrame(({ dt, t }) => w.update(dt, t, cam));
    this.engine.start();
    (window as unknown as { THREE: typeof THREE }).THREE = THREE;
  }
}
