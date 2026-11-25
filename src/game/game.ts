/**
 * The game: builds the places, people and word spots, runs the player, Kon, the camera, interactions,
 * shadows (battles), gates of mist, the colour of each place, quests, saving and all the panels.
 */
import * as THREE from 'three';
import type { App } from './app';
import type { World } from '../world/world';
import { Player, CameraRig } from './player';
import { Kon, type Look3D, SKINS, HAIRS, OUTFIT_COLORS, EYES } from '../world/characters';
import { RegionCtx } from '../world/regionkit';
import { SignAtlas } from '../world/textures';
import { buildPraia, buildVila, buildComercio, buildEscola, buildSantuario, buildPorto } from '../world/regions1';
import { buildNeon, buildTermas, buildCastelo, buildTemplo, buildPico } from '../world/regions2';
import { NpcActor, WordSpotActor, Gate, Shadow } from './actors';
import { Learner } from './learner';
import { Hud } from '../ui/hud';
import { DialogUI, type Line } from '../ui/dialog';
import { writeSlot, type SaveData } from '../core/save';
import { REGIONS, REGION_BY_ID, THEME_NAMES, rankFor, type RegionDef } from '../data/regions';
import { vocab, type Word } from '../lang/vocab';
import { runLesson, runReview } from './lesson';
import { runBattle } from './battle';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { clamp, damp, h, sleep, todayKey, fmtNum, esc } from '../core/util';
import { heightAt } from '../world/terrain';
import { ICON } from '../ui/icons';
import { wordCard, kanjiCard } from '../ui/learnui';
import type { DisplayPrefs } from '../ui/learnui';
import { Book } from '../ui/book';
import { MapUI } from '../ui/mapui';
import { Story } from './story';
import { Minigames } from './minigames';
import { Convos } from './convo';
import type { Spot } from '../world/regionkit';
import { STAGE_INFO } from '../lang/srs';
import { Builder } from '../world/kit';

export interface Interactable {
  pos: THREE.Vector3;
  r: number;
  label: string;
  action: () => void | Promise<void>;
  when?: () => boolean;
}

const TAKE = 4;

export function lookFromSave(s: SaveData): Look3D {
  const L = s.look;
  const styles = ['short', 'long', 'pony', 'bob', 'spiky', 'twin', 'bun', 'messy'] as const;
  return {
    skin: SKINS[L.skin % SKINS.length],
    hair: HAIRS[L.hair % HAIRS.length],
    hairStyle: styles[L.hairStyle % styles.length],
    outfit: 'traveler',
    top: OUTFIT_COLORS[L.outfit % OUTFIT_COLORS.length],
    bottom: '#3a3a48',
    accent: ['#c8442f', '#e9c46a', '#5fd3a2', '#7cb6ff', '#f6b8cf', '#b48cff', '#ff9a4f', '#ffffff'][L.outfit % 8],
    eyes: EYES[L.eyes % EYES.length],
    lashes: L.hairStyle === 1 || L.hairStyle === 2 || L.hairStyle === 5,
  };
}

export class Game {
  readonly world: World;
  readonly ui: HTMLElement;
  readonly engine;
  player!: Player;
  kon!: Kon;
  rig!: CameraRig;
  hud!: Hud;
  dialog!: DialogUI;
  learner!: Learner;
  book!: Book;
  map!: MapUI;
  story!: Story;
  games!: Minigames;
  convos!: Convos;
  npcs: NpcActor[] = [];
  wordSpots: WordSpotActor[] = [];
  spots: Spot[] = [];
  gates: Gate[] = [];
  shadows: Shadow[] = [];
  interactables: Interactable[] = [];
  private labels: HTMLElement;
  private paused = 0;
  private stopFrame: (() => void) | null = null;
  private current: Interactable | null = null;
  private region: RegionDef | null = null;
  private sat = 0.3;
  private saveT = 0;
  private shadowT = 8;
  private hudT = 0;
  private konOffset = new THREE.Vector3(1.1, 2.0, -0.9);
  private animals: { obj: THREE.Group; t: number; base: THREE.Vector3; kind: string }[] = [];
  private regionsBuilt = false;
  private lastLeaves = 0;
  private tmpV = new THREE.Vector3();
  running = false;

  constructor(readonly app: App, public save: SaveData) {
    this.world = app.ensureWorld();
    this.engine = app.engine;
    this.ui = app.ui;
    this.labels = h(`<div class="labels" style="position:absolute;inset:0;pointer-events:none;z-index:4"></div>`);
  }

  // ───────────────────────── setup ─────────────────────────

  build() {
    this.ui.appendChild(this.labels);
    this.learner = new Learner(this.save);
    this.learner.onLeaf = (key) => this.onLeaf(key);
    if (!this.regionsBuilt) this.buildRegions();
    this.player = new Player(lookFromSave(this.save), this.world, this.app.input);
    for (const r of this.regionCtxPlatforms) this.player.platforms.push(r);
    this.kon = new Kon();
    this.world.scene.add(this.kon.root);
    this.rig = new CameraRig(this.engine.camera);
    this.engine.camera.fov = 55;
    this.engine.camera.near = 0.1;
    this.engine.camera.far = 3200;
    this.engine.camera.updateProjectionMatrix();
    this.hud = new Hud(this.ui, {
      book: () => this.openBook(),
      map: () => this.openMap(),
      menu: () => this.openPause(),
      interact: () => this.app.input.fire('interact'),
      jump: () => this.app.input.fire('jump'),
      review: () => this.quickReview(),
    });
    this.dialog = new DialogUI(this.ui);
    this.book = new Book(this);
    this.map = new MapUI(this);
    this.story = new Story(this);
    this.games = new Minigames(this);
    this.convos = new Convos(this);
    this.applyPrefs();
    if (this.app.input.touch) document.body.classList.add('touch');
    // stick visuals for touch
    const stick = h(`<div class="stick"><div class="knob"></div></div>`);
    this.ui.appendChild(stick);
    this.app.input.stickEl = stick;
    this.app.input.knobEl = stick.querySelector('.knob') as HTMLElement;
    // gates for locked places
    const unlocked = this.learner.unlockedRegions();
    for (const r of REGIONS) {
      if (r.req <= 0) continue;
      const g = new Gate(r, this.world.scene, this.world.col);
      if (unlocked.has(r.id)) {
        g.unlock();
        g.update(10, 0);
      }
      this.gates.push(g);
    }
    this.lastLeaves = this.learner.leaves;
    this.world.clock = this.save.clock;
    this.world.clockFrozen = false;
    this.world.dayLength = 1200;
    this.daily();
  }

  private regionCtxPlatforms: import('./player').Platform[] = [];

  private buildRegions() {
    const atlas = new SignAtlas(2048);
    const builders = [buildPraia, buildVila, buildComercio, buildEscola, buildSantuario, buildPorto, buildNeon, buildTermas, buildCastelo, buildTemplo, buildPico];
    for (const fn of builders) {
      const c = new RegionCtx(this.world, atlas);
      fn(c);
      c.finish('region-' + c.region);
      this.regionCtxPlatforms.push(...c.platforms);
      for (const n of c.npcs) this.npcs.push(new NpcActor(n, this.world.scene, this.labels));
      for (const ws of c.words) {
        const w = vocab.find(ws.w);
        if (w) this.wordSpots.push(new WordSpotActor(ws, w, this.labels));
      }
      this.spots.push(...c.spots);
    }
    this.world.finishVegetation();
    this.buildAnimals();
    this.regionsBuilt = true;
  }

  private buildAnimals() {
    for (const sp of this.spots.filter((s) => s.id === 'cat' || s.id === 'dog' || s.id === 'bird')) {
      const b = new Builder();
      if (sp.id === 'cat') {
        b.add(new THREE.SphereGeometry(0.22, 10, 8), '#f2c27a', { y: 0.25, sz: 1.5 });
        b.sphere(0.17, '#f2c27a', { y: 0.42, z: 0.28 }, 1);
        for (const s of [-1, 1]) b.cone(0.06, 0.14, '#e0a060', { x: s * 0.09, y: 0.6, z: 0.28 }, 4);
        b.cyl(0.03, 0.03, 0.4, '#e0a060', { y: 0.38, z: -0.32, rx: -0.6 }, 5);
        for (const s of [-1, 1]) b.sphere(0.025, '#222', { x: s * 0.06, y: 0.45, z: 0.44 }, 0);
      } else if (sp.id === 'dog') {
        b.add(new THREE.SphereGeometry(0.26, 10, 8), '#f4f0e6', { y: 0.35, sz: 1.6 });
        b.sphere(0.2, '#f4f0e6', { y: 0.58, z: 0.34 }, 1);
        b.cone(0.09, 0.15, '#c9a878', { y: 0.55, z: 0.52, rx: Math.PI / 2 }, 6);
        for (const s of [-1, 1]) b.cone(0.07, 0.16, '#c9a878', { x: s * 0.12, y: 0.78, z: 0.3 }, 4);
        for (const [x, z] of [[-0.12, 0.2], [0.12, 0.2], [-0.12, -0.25], [0.12, -0.25]]) b.cyl(0.05, 0.05, 0.25, '#f4f0e6', { x, y: 0.12, z }, 5);
        b.box(0.2, 0.04, 0.12, '#c8442f', { y: 0.46, z: 0.3 });
      } else {
        b.add(new THREE.SphereGeometry(0.14, 8, 6), '#6a7a9a', { y: 0, sz: 1.4 });
        b.sphere(0.09, '#6a7a9a', { y: 0.1, z: 0.14 }, 1);
        b.cone(0.03, 0.08, '#e9c46a', { y: 0.1, z: 0.25, rx: Math.PI / 2 }, 4);
      }
      const g = new THREE.Group();
      g.add(b.build('animal', true));
      const base = new THREE.Vector3(sp.x, sp.y + (sp.id === 'bird' ? 6.4 : 0), sp.z);
      g.position.copy(base);
      this.world.scene.add(g);
      this.animals.push({ obj: g, t: Math.random() * 10, base, kind: sp.id });
      const w = vocab.find((sp.data?.w as string) ?? '');
      if (w) this.wordSpots.push(new WordSpotActor({ w: w.w, x: sp.x, z: sp.z, h: sp.id === 'bird' ? 7.2 : 1.3, region: '' }, w, this.labels));
    }
  }

  // ───────────────────────── run ─────────────────────────

  async start(fresh: boolean) {
    this.build();
    this.running = true;
    const p = this.save.pos;
    if (fresh || (p.x === 0 && p.z === 0)) {
      const st = this.spots.find((s) => s.id === 'start')!;
      this.player.place(st.x, st.z, Math.PI);
    } else this.player.place(p.x, p.z, p.ry);
    this.rig.yaw = this.player.yaw + Math.PI;
    this.rig.snap(this.player.pos);
    this.kon.root.position.copy(this.player.pos).add(new THREE.Vector3(1.1, 2.0, 0));
    this.engine.setScene(this.world.scene, this.engine.camera);
    this.stopFrame = this.engine.onFrame(({ dt, t }) => this.frame(dt, t));
    this.engine.start();
    const r = this.world.nearestRegion(this.player.pos.x, this.player.pos.z);
    this.enterRegion(r, true);
    this.sat = this.restoration(r);
    this.hud.update(this.learner.counts(), this.save.mon);
    if (!this.save.flags.tut) await this.story.tutorial();
    else this.toastWelcome();
  }

  stop() {
    this.running = false;
    this.persist();
    this.stopFrame?.();
    this.dialog.close();
    this.hud.el.remove();
    this.labels.remove();
  }

  private toastWelcome() {
    const c = this.learner.counts();
    const rk = rankFor(c.words);
    this.app.screens.toast(`おかえり！ Bem-vindo de volta, <b>${esc(this.save.name)}</b> · <span class="jp">${rk.jp}</span> ${rk.pt}${c.due ? ` · 🍂 ${c.due} para revisar` : ''}`, 5200);
  }

  pause(on: boolean) {
    this.paused = Math.max(0, this.paused + (on ? 1 : -1));
    this.app.input.enabled = this.paused === 0;
    this.hud.setPrompt(null);
  }

  get isPaused() {
    return this.paused > 0;
  }

  prefs(): DisplayPrefs {
    const s = this.app.settings;
    return { romaji: s.romaji !== 'nunca', furigana: s.furigana, autoSpeak: s.autoSpeak, speech: s.speech };
  }

  /** romaji rule: always / beginners (until learned or 300 words) / never */
  showRomaji(key: string): boolean {
    const m = this.app.settings.romaji;
    if (m === 'sempre') return true;
    if (m === 'nunca') return false;
    return !this.learner.isLearned(key) && this.learner.leaves < 400;
  }

  applyPrefs() {
    const s = this.app.settings;
    this.dialog.prefs = { romaji: s.romaji === 'sempre' || (s.romaji === 'iniciante' && (this.learner?.leaves ?? 0) < 400), furigana: s.furigana, autoSpeak: s.autoSpeak };
  }

  addMon(n: number) {
    this.save.mon += n;
    sfx.coin();
  }

  persist() {
    if (!this.learner) return;
    this.learner.persist();
    if (this.player) this.save.pos = { x: this.player.pos.x, z: this.player.pos.z, ry: this.player.yaw };
    this.save.clock = this.world.clock;
    if (this.region) this.save.region = this.region.id;
    writeSlot(this.save);
  }

  private daily() {
    const today = todayKey();
    const st = this.save.stats;
    if (st.lastDay !== today) {
      const y = new Date(Date.now() - 864e5);
      const yesterday = todayKey(y);
      st.dailyStreak = st.lastDay === yesterday ? st.dailyStreak + 1 : 1;
      st.daysPlayed++;
      st.lastDay = today;
    }
  }

  // ───────────────────────── frame ─────────────────────────

  private frame(dt: number, t: number) {
    if (!this.running) return;
    const input = this.app.input;
    input.update();
    this.save.playTime += dt;
    const look = input.consumeLook();
    if (!this.paused) {
      this.player.update(dt, this.rig.yaw);
      const moving = Math.hypot(this.player.vel.x, this.player.vel.y) > 1;
      this.rig.update(dt, look, this.player.pos, moving && input.lastDevice !== 'kb' ? this.player.yaw : undefined);
    } else {
      this.player.char.speed = 0;
      this.player.char.update(dt);
      this.rig.update(dt, { x: 0, y: 0, zoom: 0 }, this.player.pos);
    }
    // Kon floats beside the player's shoulder
    const off = this.tmpV.copy(this.konOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw);
    const kp = this.player.pos.clone().add(off);
    this.kon.root.position.lerp(kp, Math.min(1, dt * 4));
    this.kon.root.rotation.y = damp(this.kon.root.rotation.y, this.player.yaw, 4, dt);
    this.kon.update(dt);
    this.world.focus.copy(this.player.pos);
    this.world.update(dt, t, this.engine.camera);
    for (const n of this.npcs) {
      const d = n.pos.distanceToSquared(this.player.pos);
      if (d < 140 * 140) n.update(dt, this.player.pos, this.world.col);
      n.char.root.visible = d < 220 * 220;
    }
    for (const g of this.gates) g.update(dt, t);
    for (const s of this.shadows) s.update(dt, this.player.pos);
    for (const a of this.animals) {
      a.t += dt;
      if (a.kind === 'bird') a.obj.position.y = a.base.y + Math.sin(a.t * 3) * 0.05;
      else a.obj.rotation.y = Math.sin(a.t * 0.3) * 0.8;
    }
    this.updateLabels();
    this.updateRegion(dt);
    if (!this.paused) {
      this.updateInteract();
      if (input.take('interact') && this.current) void this.current.action();
      if (input.take('book')) this.openBook();
      if (input.take('map')) this.openMap();
      if (input.take('back') || input.take('menu')) this.openPause();
      this.checkShadows(dt);
      this.checkGates();
    } else {
      input.clearOnce();
    }
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.5;
      const c = this.learner.counts();
      this.hud.update(c, this.save.mon);
      this.hud.setClock(this.world.clock);
      this.world.tree.setCounts(c.words, c.memorized, c.mastered, c.due);
      this.kon.setTails(1 + Math.floor(c.words / 1250));
      this.story.updateQuest();
      if (c.words !== this.lastLeaves) this.onLeavesChanged(this.lastLeaves, c.words);
    }
    this.saveT += dt;
    if (this.saveT > 30) {
      this.saveT = 0;
      this.persist();
    }
  }

  private updateLabels() {
    const cam = this.engine.camera;
    const w = window.innerWidth, hgt = window.innerHeight;
    const v = this.tmpV;
    const show = (el: HTMLElement, pos: THREE.Vector3, maxD: number) => {
      const d = pos.distanceTo(cam.position);
      if (d > maxD || this.paused) {
        if (el.style.display !== 'none') el.style.display = 'none';
        return;
      }
      v.copy(pos).project(cam);
      if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) {
        if (el.style.display !== 'none') el.style.display = 'none';
        return;
      }
      el.style.display = '';
      el.style.left = ((v.x + 1) / 2) * w + 'px';
      el.style.top = ((1 - v.y) / 2) * hgt + 'px';
      el.style.opacity = String(clamp(1.4 - d / maxD, 0, 1));
    };
    for (const n of this.npcs) show(n.label, this.tmpPos(n.pos, n.char.heightM + 0.5), 26);
    for (const s of this.wordSpots) {
      show(s.label, s.pos, 30);
      if (s.label.style.display !== 'none' && Math.random() < 0.05) {
        const key = 'w:' + s.word.id;
        const it = this.learner.get(key);
        s.setKnown(!!it?.L, !!it, s.word.r, s.word.pt.split(';')[0]);
      }
    }
  }
  private _tp = new THREE.Vector3();
  private tmpPos(p: THREE.Vector3, dy: number) {
    return this._tp.set(p.x, p.y + dy, p.z);
  }

  // ───────────────────────── regions & colour ─────────────────────────

  /** how much colour has returned to a place (0 = grey silence, 1 = full colour) */
  restoration(r: RegionDef): number {
    const L = this.learner.leaves;
    const next = REGIONS.filter((x) => x.req > r.req).sort((a, b) => a.req - b.req)[0];
    const span = Math.max(80, ((next?.req ?? r.req + 1500) - r.req) * 0.85);
    const base = r.id === 'praia' ? 0.3 : 0.05;
    return clamp(base + (L - r.req) / span, 0, 1);
  }

  private updateRegion(dt: number) {
    const p = this.player.pos;
    const r = this.world.nearestRegion(p.x, p.z);
    const inside = Math.hypot(p.x - r.x, p.z - r.z) < r.r + 22;
    if (inside && r !== this.region) this.enterRegion(r);
    // colour grading toward the current place's restoration
    const target = this.region ? this.restoration(this.region) : 0.5;
    this.sat = damp(this.sat, target, 1.2, dt);
    const u = this.engine.u;
    u.uSat.value = 0.42 + this.sat * 0.66;
    u.uInk.value = (1 - this.sat) * 0.42;
    this.world.sky.gloom = (1 - this.sat) * 0.35;
  }

  private enterRegion(r: RegionDef, silent = false) {
    this.region = r;
    this.save.region = r.id;
    const night = this.world.sky.state.night > 0.6;
    music.play(night && (r.id === 'vila' || r.id === 'praia') ? 'night' : r.music);
    music.ambience(night && r.amb !== 'city' && r.amb !== 'sea' ? 'night' : r.amb);
    if (!this.save.visited.includes(r.id)) {
      this.save.visited.push(r.id);
      if (!silent) this.hud.showBanner(r);
    } else if (!silent) this.hud.showBanner(r);
  }

  private checkGates() {
    const p = this.player.pos;
    const L = this.learner.leaves;
    for (const g of this.gates) {
      if (g.open) continue;
      if (L >= g.region.req) {
        void this.openGate(g);
        continue;
      }
      const d = g.distance(p.x, p.z);
      if (d < 6 && d > -2 && !this.current) this.hud.setPrompt(`<span class="jp">${g.region.jp}</span> fechado pelo Silêncio · precisa de <b>${fmtNum(g.region.req)}</b> palavras (você tem ${fmtNum(L)})`, '🔒');
    }
  }

  private async openGate(g: Gate) {
    g.unlock();
    if (this.save.flags['gate:' + g.region.id]) return;
    this.save.flags['gate:' + g.region.id] = 1;
    this.persist();
    // celebration: camera looks at the place, the mist dissolves
    this.pause(true);
    sfx.unlock();
    const target = new THREE.Vector3(g.region.x, heightAt(g.region.x, g.region.z) + 6, g.region.z);
    const from = this.player.pos.clone().add(new THREE.Vector3(0, 14, 0)).lerp(target, 0.35);
    this.rig.override = { pos: from, look: target, k: 1.5 };
    this.hud.showBanner(g.region);
    await sleep(3800);
    this.rig.override = null;
    this.pause(false);
    await this.story.konSays([
      { jp: '見て！ 新しい 道が 開いたよ！', pt: `Olha! Um novo caminho se abriu: ${g.region.name}! (${g.region.level})` },
      { pt: g.region.desc },
    ]);
  }

  // ───────────────────────── interaction ─────────────────────────

  private updateInteract() {
    const p = this.player.pos;
    let best: Interactable | null = null, bd = 1e9;
    const consider = (it: Interactable) => {
      if (it.when && !it.when()) return;
      const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
      if (d < it.r && d < bd) {
        bd = d;
        best = it;
      }
    };
    for (const n of this.npcs) {
      if (n.pos.distanceToSquared(p) > 25) continue;
      consider({ pos: n.pos, r: 3.2, label: `Falar com <b>${esc(n.def.name)}</b> <span class="jp">${esc(n.def.jp)}</span>`, action: () => this.talkTo(n) });
    }
    for (const s of this.wordSpots) {
      if (Math.abs(s.pos.x - p.x) > 6 || Math.abs(s.pos.z - p.z) > 6) continue;
      consider({ pos: s.pos, r: 4.2, label: `Examinar <span class="jp">${esc(s.word.w)}</span>`, action: () => this.examine(s) });
    }
    for (const sp of this.spots) {
      if (Math.abs(sp.x - p.x) > 8 || Math.abs(sp.z - p.z) > 8) continue;
      const it = this.spotInteract(sp);
      if (it) consider(it);
    }
    for (const sh of this.shadows) {
      const d = sh.group.position.distanceTo(p);
      if (d < (sh.boss ? 6 : 3.2) && !sh.dead) {
        consider({ pos: sh.group.position, r: sh.boss ? 7 : 3.6, label: `<b>Enfrentar a ${sh.boss ? 'Grande ' : ''}Sombra</b> do Silêncio`, action: () => this.fight(sh) });
      }
    }
    this.current = best;
    if (best) this.hud.setPrompt((best as Interactable).label, this.app.input.touch ? '✋' : 'E');
    else this.hud.setPrompt(null);
  }

  private spotInteract(sp: Spot): Interactable | null {
    const pos = new THREE.Vector3(sp.x, sp.y, sp.z);
    switch (sp.id) {
      case 'hokora':
        return { pos, r: 3, label: 'Rezar no <b>santuário de palavras</b> 祠 (revisar)', action: () => this.hokora() };
      case 'kon-shrine':
        return { pos, r: 3, label: 'Santuário da Kon 狐の祠 (revisar)', action: () => this.hokora() };
      case 'pond':
        return { pos, r: 8, label: 'Caçar vaga-lumes de kana <span class="jp">蛍</span>', action: () => this.games.fireflies() };
      case 'karuta':
        return { pos, r: 3, label: 'Jogar <b>karuta</b> かるた', action: () => this.games.karuta() };
      case 'kanji':
        return { pos, r: 3, label: 'Dojô de kanji <span class="jp">書道</span>', action: () => this.games.kanjiDojo() };
      case 'omikuji':
        return { pos, r: 3, label: 'Tirar a sorte <span class="jp">おみくじ</span>', action: () => this.games.omikuji() };
      case 'bell':
        return { pos, r: 3.5, label: 'Tocar o sino <span class="jp">鐘</span>', action: () => { sfx.templeBell(); this.rig.shake = 0.3; } };
      case 'ferry':
      case 'konbini':
      case 'sushi':
        return null;
      case 'heart':
        return { pos, r: 4, label: 'Tocar o coração da <b>Grande Árvore</b>', action: () => this.story.treeHeart() };
      case 'dojo':
        return { pos, r: 3, label: 'Dojô: desafio de digitação <span class="jp">道場</span>', action: () => this.games.typingDojo() };
      case 'arcade':
        return { pos, r: 4, label: 'Fliperama: desafio de velocidade <span class="jp">ゲーセン</span>', action: () => this.games.arcade() };
      case 'ashiyu':
      case 'steam1':
      case 'steam2':
        return { pos, r: 4, label: 'Descansar nas termas <span class="jp">温泉</span> (ouvir frases)', action: () => this.games.onsenRest() };
      default:
        return null;
    }
  }

  async talkTo(n: NpcActor) {
    if (this.dialog.open) return;
    this.pause(true);
    n.busy = true;
    this.player.face(n.pos.x, n.pos.z);
    n.char.wave();
    const first = !this.save.flags['met:' + n.def.id];
    this.save.flags['met:' + n.def.id] = 1;
    const speaker = { set talking(v: boolean) { n.char.talking = v; }, get talking() { return n.char.talking; }, emote: (e: string, s?: number) => n.char.emote(e as never, s) };
    const base: Partial<Line> = { who: n.def.name, whoJp: n.def.jp, role: n.def.title, voice: n.def.voice, speaker };
    try {
      if (first) n.char.bow();
      await this.dialog.say({ ...base, jp: n.def.greet[0], pt: n.def.greet[1] } as Line);
      if (await this.story.npcHook(n)) return;
      await this.npcMenu(n, base);
    } finally {
      this.dialog.close();
      n.busy = false;
      this.pause(false);
    }
  }

  private async npcMenu(n: NpcActor, base: Partial<Line>) {
    for (;;) {
      const opts: { label: string; sub?: string; icon?: string; act: () => Promise<boolean | void> }[] = [];
      for (const t of n.def.themes ?? []) {
        const next = this.learner.newWords(t, 8);
        const pr = this.learner.themeProgress(t);
        const nm = THEME_NAMES[t];
        if (next.length) {
          opts.push({
            label: `Lição: ${nm?.pt ?? t}`,
            sub: `${next.length} palavras novas · ${pr.learned}/${pr.total} aprendidas${pr.available < pr.total ? ` · níveis mais altos abrem com mais palavras` : ''}`,
            icon: ICON.book,
            act: async () => {
              this.dialog.close();
              await runLesson(this, next, `${nm?.pt ?? t} · com ${n.def.name}`);
              return true;
            },
          });
        } else if (pr.total) {
          opts.push({ label: `${nm?.pt ?? t}: nada novo por agora`, sub: pr.available < pr.total ? 'Aprenda mais palavras no total para liberar os níveis seguintes.' : 'Você já viu todas as palavras deste tema!', icon: ICON.check, act: async () => false });
        }
      }
      const seen = (n.def.themes ?? []).flatMap((t) => (vocab.byTheme.get(t) ?? []).filter((w) => this.learner.get('w:' + w.id)).map((w) => 'w:' + w.id));
      if (seen.length >= 4) opts.push({ label: 'Revisar as palavras deste mestre', sub: `${seen.length} palavras`, icon: ICON.brain, act: async () => { this.dialog.close(); await runReview(this, seen.sort(() => Math.random() - 0.5).slice(0, 12), `Revisão com ${n.def.name}`); return true; } });
      for (const c of n.def.convos ?? []) {
        const info = this.convos.info(c);
        if (info) opts.push({ label: `Conversa: ${info.title}`, sub: info.sub, icon: ICON.chat, act: async () => { this.dialog.close(); await this.convos.run(c, n); return true; } });
      }
      if (n.def.registers?.length) opts.push({ label: 'Como você fala? (registros)', sub: 'Exercício: o jeito certo de falar com cada pessoa', icon: ICON.people, act: async () => { await this.convos.registerDrill(n, base); return true; } });
      if (n.def.game) {
        const gname: Record<string, string> = { fireflies: 'Vaga-lumes de kana', karuta: 'Karuta (cartas)', shop: 'Balcão de sushi (pedidos)', kanji: 'Dojô de kanji' };
        opts.push({ label: `Jogar: ${gname[n.def.game] ?? n.def.game}`, icon: ICON.sparkle, act: async () => { this.dialog.close(); await this.games.play(n.def.game!); return true; } });
      }
      opts.push({ label: 'Tchau! またね', icon: ICON.back, act: async () => false });
      const i = await this.dialog.choose({ ...base, jp: 'どうしますか？', pt: 'O que você quer fazer?' } as Line, opts.map((o) => ({ label: o.label, sub: o.sub, icon: o.icon })));
      const again = await opts[i].act();
      if (!again) {
        await this.dialog.say({ ...base, jp: 'またね！', pt: 'Até mais!' } as Line);
        return;
      }
      // after an activity, offer the menu again
      this.pause(true);
      this.pause(false);
    }
  }

  async examine(s: WordSpotActor) {
    this.pause(true);
    const key = 'w:' + s.word.id;
    const isNew = !this.learner.get(key);
    this.learner.introduce(key);
    const el = h(`<div class="learn"><div class="frame"><div class="lhead"><div class="title"><span class="jp">見</span>Você encontrou uma palavra</div><button class="hbtn x">${ICON.close}</button></div><div class="stagebox"></div><div class="lfoot"></div></div></div>`);
    this.ui.appendChild(el);
    const box = el.querySelector('.stagebox') as HTMLElement;
    box.appendChild(wordCard(s.word, { ...this.prefs(), romaji: this.showRomaji(key) }, { isNew, stage: this.learner.stage(key), onSpeak: (ok) => ok && this.save.stats.spoken++ }));
    if (isNew) {
      sfx.newWord();
      this.world.bursts.glyph(s.pos.clone(), s.word.w.replace(/^～/, '').slice(0, 3));
      this.world.bursts.spark(s.pos.clone(), '#bfffe0', 18, 3);
    }
    const kanjiRow = vocab.kanjiIn(s.word.w);
    const foot = el.querySelector('.lfoot') as HTMLElement;
    if (kanjiRow.length) {
      const kb = h(`<button class="mbtn ghost small">Ver kanji: <span class="jp">${kanjiRow.map((k) => k.k).join(' ')}</span></button>`);
      kb.addEventListener('click', () => {
        box.innerHTML = '';
        for (const k of kanjiRow) box.appendChild(kanjiCard(k, this.learner.stage('K:' + k.k)));
      });
      foot.appendChild(kb);
    }
    await new Promise<void>((res) => {
      const ok = h(`<button class="mbtn primary">OK ${ICON.check}</button>`);
      ok.addEventListener('click', () => res());
      el.querySelector('.x')!.addEventListener('click', () => res());
      foot.appendChild(ok);
    });
    el.remove();
    this.pause(false);
    this.persist();
  }

  async hokora() {
    const due = this.learner.dueItems('w:', 15);
    if (!due.length) {
      const learning = this.learner.learningItems('w:', 10);
      if (!learning.length) {
        this.app.screens.toast('O santuário está em silêncio: nada para revisar agora. Aprenda palavras novas com os moradores!');
        return;
      }
      await runReview(this, learning, 'Santuário de palavras 祠');
      return;
    }
    await runReview(this, due, 'Santuário de palavras 祠');
  }

  async quickReview() {
    const due = this.learner.dueItems('w:', 15);
    if (due.length) await runReview(this, due, 'Revisão rápida');
  }

  // ───────────────────────── shadows & battles ─────────────────────────

  private checkShadows(dt: number) {
    this.shadowT -= dt;
    if (this.shadowT > 0) return;
    this.shadowT = 6;
    this.shadows = this.shadows.filter((s) => !s.dead);
    if (!this.save.flags.tut || this.shadows.length >= 1) return;
    const due = this.learner.dueItems('w:', 30).length + this.learner.learningItems('w:', 30).filter((k) => (this.learner.get(k)?.d ?? 0) <= Date.now()).length;
    if (due < TAKE) return;
    // spawn a shadow a little ahead of the player, on walkable ground inside an open place
    for (let tries = 0; tries < 8; tries++) {
      const a = this.player.yaw + (Math.random() - 0.5) * 2.2;
      const d = 10 + Math.random() * 8;
      const x = this.player.pos.x + Math.sin(a) * d, z = this.player.pos.z + Math.cos(a) * d;
      const y = heightAt(x, z);
      if (y < 0.5) continue;
      const [rx, rz] = this.world.col.resolve(x, z, 1);
      if (Math.hypot(rx - x, rz - z) > 0.2) continue;
      const s = new Shadow(this.world.scene, new THREE.Vector3(x, y + 1.4, z));
      this.shadows.push(s);
      sfx.shadow();
      if (!this.save.flags.firstShadow) {
        this.save.flags.firstShadow = 1;
        void this.story.konSays([
          { jp: 'あっ！ 影だ！', pt: 'Ah! Uma sombra do Silêncio!' },
          { pt: 'Ela aparece quando há palavras para revisar. Chegue perto e enfrente-a: cada resposta certa é uma palavra-feitiço, e as palavras viram folhas na Grande Árvore!' },
        ]);
      }
      break;
    }
  }

  async fight(sh: Shadow) {
    const keys = this.learner.reviewSet(sh.boss ? 20 : 10);
    if (keys.length < 3) {
      this.app.screens.toast('Você ainda tem poucas palavras para enfrentar a sombra. Aprenda uma lição primeiro!');
      return;
    }
    await runBattle(this, sh, keys);
    this.shadows = this.shadows.filter((s) => !s.dead);
    this.shadowT = 25;
  }

  // ───────────────────────── leaves ─────────────────────────

  private onLeaf(_key: string) {
    // the visual is handled when counts update (batch); here: little sparkle on the meter
  }

  private onLeavesChanged(before: number, after: number) {
    this.lastLeaves = after;
    if (after > before) {
      sfx.leaf();
      this.world.bursts.spark(this.player.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), '#7ff0c4', 14, 3);
      const rb = rankFor(before), ra = rankFor(after);
      if (ra !== rb) {
        sfx.rankUp();
        this.app.screens.toast(`<span class="jp">${ra.jp}</span> Novo título: <b>${ra.pt}</b>!`, 6000);
        this.applyPrefs();
      }
      for (const lv of [250, 800, 2400, 4500]) {
        if (before < lv && after >= lv) this.app.screens.toast(`Novo nível de palavras liberado: <b>N${lv === 250 ? 4 : lv === 800 ? 3 : lv === 2400 ? 2 : 1}</b>!`, 6000);
      }
    }
  }

  // ───────────────────────── panels ─────────────────────────

  openBook() {
    if (this.isPaused) return;
    this.book.open();
  }

  openMap() {
    if (this.isPaused) return;
    this.map.open();
  }

  openPause() {
    if (this.isPaused) return;
    this.pause(true);
    const s = this.app.screens;
    const c = this.learner.counts();
    const el = s.screen('dim center', `<div class="panel" style="width:min(460px,92vw);text-align:center"><h2 style="justify-content:center"><span class="jp">休</span>Pausa</h2>
      <p class="muted small">${esc(this.save.name)} · ${fmtNum(c.words)} palavras · ${c.kanji} kanji · ${c.kana} kana</p><div class="menu" style="display:flex;flex-direction:column;gap:8px"></div></div>`);
    const menu = el.querySelector('.menu') as HTMLElement;
    const close = () => {
      el.remove();
      this.pause(false);
    };
    menu.append(
      s.btn('Continuar', close, 'primary', ICON.play),
      s.btn('Salvar agora', () => {
        this.persist();
        s.toast('Jornada salva!');
      }, '', ICON.check),
      s.btn('Livro das palavras', () => {
        close();
        this.openBook();
      }, '', ICON.book),
      s.btn('Mapa', () => {
        close();
        this.openMap();
      }, '', ICON.map),
      s.btn('Opções', () => s.options({ ...this.app.settings }, (st) => {
        this.app.applySettings(st);
        this.applyPrefs();
      }), '', ICON.gear),
      s.btn('Voltar ao título', async () => {
        this.persist();
        el.remove();
        this.paused = 0;
        await this.app.backToTitle();
      }, 'ghost', ICON.back),
    );
  }

  get stageInfo() {
    return STAGE_INFO;
  }

  regionDef(id: string) {
    return REGION_BY_ID[id];
  }

  async teleport(x: number, z: number) {
    await this.app.screens.fadeTo(1, 500);
    this.player.place(x, z, this.player.yaw);
    this.rig.snap(this.player.pos);
    this.persist();
    await this.app.screens.fadeTo(0, 600);
  }

  /** Kon reacts to a word being spoken etc. */
  konEmote(e: 'happy' | 'surprised' | 'sad') {
    this.kon.emote(e, 1.5);
  }

  sayWord(w: Word) {
    voice.speak(w.r);
  }
}
