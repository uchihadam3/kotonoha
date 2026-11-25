/**
 * Cinematic system (letterbox, camera moves, subtitles, calligraphy titles) and the prologue:
 * the Kokinshū epigraph, the Great Tree in bloom, the village alive, the Great Silence that strips the
 * leaves and the colour, the traveller arriving at dawn, and Kon's first word.
 */
import * as THREE from 'three';
import type { App } from './app';
import type { World } from '../world/world';
import { h, sleep, easeInOutCubic, esc } from '../core/util';
import { audio, mtof } from '../audio/audio';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { Character, Kon, type Look3D } from '../world/characters';
import { heightAt } from '../world/terrain';
import { REGION_BY_ID } from '../data/regions';
import { Falling } from '../world/particles';
import { nameToKatakana } from '../lang/kana';
import { SKINS, HAIRS, OUTFIT_COLORS, EYES } from '../world/characters';
import type { SaveData } from '../core/save';
import { lookFromSave } from './game';

const CSS = `
.cine { position: absolute; inset: 0; z-index: 50; pointer-events: auto; }
.cine .sub { position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); width: min(900px, 92vw); text-align: center; color: #fff; font-size: clamp(16px, 2.4vw, 23px); line-height: 1.55; text-shadow: 0 2px 12px rgba(0,0,0,.95); opacity: 0; transition: opacity .9s ease; font-family: 'kt-mincho', var(--latin), serif; letter-spacing: .02em; }
.cine .sub.on { opacity: 1; }
.cine .sub .jp { display: block; font-family: var(--jp); font-size: 1.25em; color: var(--gold2); margin-bottom: 4px; }
.cine .skip { position: absolute; right: 20px; bottom: calc(16px + var(--safe-b)); padding: 8px 16px; border-radius: 999px; border: 0; background: rgba(0,0,0,.45); color: rgba(255,255,255,.75); font-size: 13px; letter-spacing: .1em; cursor: pointer; }
.cine .verse { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6vw; background: #05060a; }
.cine .verse .v { writing-mode: vertical-rl; font-family: var(--brush); font-size: clamp(26px, 5.2vh, 46px); color: #f4ecd8; letter-spacing: .18em; line-height: 1.9; height: 78vh; }
.cine .verse .v span { opacity: 0; transition: opacity .5s ease, filter .8s ease; filter: blur(6px); display: inline-block; }
.cine .verse .v span.on { opacity: 1; filter: none; }
.cine .verse .side { max-width: 34vw; color: #d9cfb8; font-family: 'kt-mincho', serif; font-size: clamp(14px, 2vw, 19px); line-height: 1.8; opacity: 0; transition: opacity 1.2s ease; }
.cine .verse .side.on { opacity: 1; }
.cine .verse .side .who { margin-top: 18px; color: var(--gold); font-size: .85em; letter-spacing: .1em; }
.cine .verse .seal { width: 46px; height: 46px; border-radius: 6px; background: #c22d1f; color: #fff4e6; font-family: var(--brush); display: flex; align-items: center; justify-content: center; font-size: 26px; margin-top: 14px; opacity: 0; transform: scale(2); transition: all .4s cubic-bezier(.3,1.8,.5,1); }
.cine .verse .seal.on { opacity: 1; transform: scale(1) rotate(-6deg); }
.cine .card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; opacity: 0; transition: opacity 1.4s ease; }
.cine .card.on { opacity: 1; }
.cine .card .big { font-family: var(--brush); font-size: clamp(70px, 16vw, 170px); color: #fff; text-shadow: 0 0 40px rgba(127,240,196,.6), 0 6px 30px rgba(0,0,0,.6); }
.cine .card .lat { font-family: var(--latin); letter-spacing: .5em; color: var(--gold2); font-size: clamp(16px, 3vw, 28px); margin-left: .5em; }
@media (max-aspect-ratio: 1/1) { .cine .verse { flex-direction: column; gap: 3vh; } .cine .verse .v { height: 52vh; } .cine .verse .side { max-width: 86vw; text-align: center; } }

.creator { position: absolute; inset: 0; z-index: 45; display: grid; grid-template-columns: 1fr min(420px, 100%); pointer-events: none; }
.creator .cpanel { pointer-events: auto; margin: max(14px, var(--safe-t)) 14px 14px; align-self: center; max-height: calc(100vh - 28px); overflow: auto; }
.creator .row2 { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 12px; }
.creator .sw { width: 36px; height: 36px; border-radius: 10px; border: 0; cursor: pointer; box-shadow: inset 0 0 0 2px rgba(255,255,255,.15); }
.creator .sw.on { box-shadow: 0 0 0 3px var(--gold); }
.creator .opt2 { padding: 7px 12px; border-radius: 999px; border: 0; background: rgba(255,255,255,.07); color: #ddd; cursor: pointer; font-size: 13px; }
.creator .opt2.on { background: var(--gold); color: #2a1d08; }
.creator label { display: block; font-size: 13px; color: var(--muted); margin-top: 6px; }
.creator .kana { font-family: var(--jp); font-size: 30px; color: var(--gold2); min-height: 40px; margin: 6px 0 2px; }
.creator .kana small { font-family: var(--ui); font-size: 12px; color: var(--muted); margin-left: 6px; }
@media (max-width: 760px) { .creator { grid-template-columns: 1fr; grid-template-rows: 38vh 1fr; } .creator .cpanel { margin: 0 8px 8px; align-self: stretch; } }
`;

let cssDone = false;
function ensureCss() {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export class Cine {
  el: HTMLElement;
  private sub: HTMLElement;
  skipped = false;
  private camAnim: (() => void) | null = null;
  constructor(private app: App) {
    ensureCss();
    this.el = h(`<div class="cine"><div class="sub"></div><button class="skip">PULAR ▸▸</button></div>`);
    app.ui.appendChild(this.el);
    this.sub = this.el.querySelector('.sub') as HTMLElement;
    this.el.querySelector('.skip')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.skipped = true;
    });
    window.addEventListener('keydown', this.onKey);
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') this.skipped = true;
  };
  async wait(ms: number) {
    for (let t = 0; t < ms && !this.skipped; t += 50) await sleep(50);
  }
  bars(v: number, ms = 1200) {
    const u = this.app.engine.u;
    const from = u.uBars.value, t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      u.uBars.value = from + (v - from) * easeInOutCubic(k);
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }
  async say(pt: string, jp = '', ms = 4200) {
    if (this.skipped) return;
    this.sub.innerHTML = `${jp ? `<span class="jp">${esc(jp)}</span>` : ''}${esc(pt)}`;
    this.sub.classList.add('on');
    await this.wait(ms);
    this.sub.classList.remove('on');
    await this.wait(700);
  }
  /** move the camera along keyframes over `ms` */
  move(cam: THREE.PerspectiveCamera, keys: { p: THREE.Vector3; l: THREE.Vector3 }[], ms: number, ease = easeInOutCubic) {
    this.camAnim?.();
    const t0 = performance.now();
    const pc = new THREE.CatmullRomCurve3(keys.map((k) => k.p));
    const lc = new THREE.CatmullRomCurve3(keys.map((k) => k.l));
    const stop = this.app.engine.onFrame(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      const e = ease(k);
      cam.position.copy(pc.getPoint(e));
      cam.lookAt(lc.getPoint(e));
    });
    this.camAnim = stop;
    return stop;
  }
  fadeTo(v: number, ms = 900) {
    const u = this.app.engine.u;
    const from = u.uFade.value, t0 = performance.now();
    return new Promise<void>((res) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        u.uFade.value = from + (v - from) * k;
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
  }
  close() {
    this.camAnim?.();
    window.removeEventListener('keydown', this.onKey);
    this.el.remove();
    this.bars(0, 800);
  }
}

/** smoothly animate a number from → to over ms */
function tween(ms: number, fn: (k: number) => void): () => void {
  const t0 = performance.now();
  let alive = true;
  const step = () => {
    if (!alive) return;
    const k = Math.min(1, (performance.now() - t0) / ms);
    fn(k);
    if (k < 1) requestAnimationFrame(step);
  };
  step();
  return () => (alive = false);
}

export async function prologue(app: App, world: World, look: Look3D) {
  const cine = new Cine(app);
  const cam = app.engine.camera;
  const eng = app.engine;
  const u = eng.u;
  cam.fov = 45;
  cam.updateProjectionMatrix();
  world.clockFrozen = true;
  eng.setScene(world.scene, cam);
  const frame = eng.onFrame(({ dt, t }) => world.update(dt, t, cam));
  music.stop(1.5);
  cine.bars(0.1, 1500);

  // ── 1. the epigraph (Kokinshū, 905)
  const verse = 'やまとうたは 人の心を種として よろづの言の葉とぞなれりける';
  const vEl = h(`<div class="verse"><div class="v">${[...verse].map((c) => `<span>${c === ' ' ? '　' : esc(c)}</span>`).join('')}</div><div class="side">A poesia do Japão tem o coração humano como semente,<br>e dele brotam as dez mil folhas das palavras.<div class="who">— Ki no Tsurayuki, prefácio do Kokin Wakashū (905)</div><div class="seal">言</div></div></div>`);
  cine.el.prepend(vEl);
  if (audio.ctx) {
    const t = audio.now;
    audio.pad([mtof(38), mtof(45), mtof(50)], t + 0.2, 9, 0.9, 'sfx', 0.3);
    [0, 3, 5, 7, 8, 12].forEach((d, i) => audio.koto(mtof(50 + d), t + 0.5 + i * 1.3, 0.3, 'sfx', { dur: 3 }));
  }
  const spans = [...vEl.querySelectorAll('.v span')];
  for (let i = 0; i < spans.length && !cine.skipped; i++) {
    spans[i].classList.add('on');
    await cine.wait(110);
  }
  (vEl.querySelector('.side') as HTMLElement).classList.add('on');
  await cine.wait(1800);
  (vEl.querySelector('.seal') as HTMLElement).classList.add('on');
  sfx.slap();
  await cine.wait(3800);
  // ── 2. the Great Tree in full bloom
  world.clock = 0.9;
  world.tree.setCounts(10000, 2200, 900, 0);
  world.tree.instant();
  u.uSat.value = 1.05;
  u.uInk.value = 0;
  world.sky.gloom = 0;
  vEl.style.transition = 'opacity 2s ease';
  vEl.style.opacity = '0';
  music.play('title', 3);
  const tb = world.treeBase;
  cine.move(cam, [
    { p: new THREE.Vector3(tb.x + 30, tb.y + 4, tb.z + 48), l: new THREE.Vector3(tb.x, tb.y + 10, tb.z) },
    { p: new THREE.Vector3(tb.x + 52, tb.y + 26, tb.z + 70), l: new THREE.Vector3(tb.x, tb.y + 34, tb.z) },
    { p: new THREE.Vector3(tb.x + 40, tb.y + 48, tb.z + 110), l: new THREE.Vector3(tb.x, tb.y + 42, tb.z) },
  ], 14000);
  await cine.wait(1200);
  vEl.remove();
  await cine.say('Na ilha de Kotonoha, cada palavra era uma folha viva da Grande Árvore.', '言の葉の大樹', 5200);
  await cine.say('Enquanto as pessoas conversavam, a árvore florescia: dez mil folhas de luz.', '', 4600);
  // ── 3. the village alive at dusk
  world.clock = 0.76;
  const vila = REGION_BY_ID.vila;
  const vy = heightAt(vila.x, vila.z);
  cine.move(cam, [
    { p: new THREE.Vector3(vila.x - 60, vy + 30, vila.z + 70), l: new THREE.Vector3(vila.x, vy + 4, vila.z) },
    { p: new THREE.Vector3(vila.x + 10, vy + 18, vila.z + 52), l: new THREE.Vector3(vila.x - 2, vy + 3, vila.z - 6) },
    { p: new THREE.Vector3(vila.x + 50, vy + 22, vila.z + 30), l: new THREE.Vector3(vila.x, vy + 6, vila.z - 20) },
  ], 11000);
  await cine.say('Nas vilas, nas ruas e nos templos, as palavras davam cor a tudo: o polido, o casual, as gírias, os versos antigos...', '', 5200);
  // ── 4. the Great Silence
  sfx.shadow();
  if (audio.ctx) {
    const t = audio.now;
    audio.taiko(t, 1, 'sfx', 0.45);
    audio.taiko(t + 0.9, 0.9, 'sfx', 0.5);
    audio.taiko(t + 1.6, 1, 'sfx', 0.42);
    audio.whoosh(t, 6, 0.35, 90, 600);
    audio.pad([mtof(37), mtof(38), mtof(44)], t, 8, 1.2, 'sfx', 0.2);
  }
  music.stop(3);
  const stopSat = tween(6500, (k) => {
    u.uSat.value = 1.05 - k * 0.93;
    u.uInk.value = k * 0.8;
    world.sky.gloom = k * 0.7;
  });
  world.clock = 0.83;
  const storm = new Falling({ count: 900, radius: 140, height: 90, kind: 'leaf', color: '#7a8a80', glow: 0, speed: 3 });
  storm.center = new THREE.Vector3(tb.x, tb.y - 10, tb.z + 40);
  world.scene.add(storm.mesh);
  const stormFrame = eng.onFrame(({ t }) => storm.update(t));
  cine.move(cam, [
    { p: new THREE.Vector3(tb.x - 70, tb.y + 30, tb.z + 90), l: new THREE.Vector3(tb.x, tb.y + 35, tb.z) },
    { p: new THREE.Vector3(tb.x - 90, tb.y + 45, tb.z + 140), l: new THREE.Vector3(tb.x, tb.y + 25, tb.z) },
  ], 12000);
  const stopLeaves = tween(9000, (k) => world.tree.setCounts(Math.round(10000 * (1 - k)), Math.round(2200 * (1 - k)), Math.round(900 * (1 - k)), 0));
  await cine.say('Até que veio o Grande Silêncio. As palavras foram esquecidas... e as folhas caíram.', '大いなる沈黙', 5600);
  await cine.say('Dez mil folhas se espalharam pelo mundo. E as cores se apagaram.', '', 4600);
  stopLeaves();
  world.tree.setCounts(0, 0, 0, 0);
  world.tree.instant();
  await cine.fadeTo(1, 1500);
  stopSat();
  storm.mesh.removeFromParent();
  stormFrame();
  // ── 5. dawn: the traveller arrives by boat
  const praia = REGION_BY_ID.praia;
  world.clock = 0.262;
  u.uSat.value = 0.32;
  u.uInk.value = 0.6;
  world.sky.gloom = 0.35;
  const arrival = new THREE.Vector3(praia.x - 1.4, 0.2, praia.z + 54);
  const traveller = new Character(look);
  traveller.root.position.set(arrival.x, 1.05, arrival.z - 1);
  traveller.root.rotation.y = Math.PI;
  world.scene.add(traveller.root);
  const tf = eng.onFrame(({ dt }) => traveller.update(dt));
  cine.move(cam, [
    { p: new THREE.Vector3(arrival.x + 26, 3, arrival.z + 30), l: new THREE.Vector3(arrival.x, 1.5, arrival.z) },
    { p: new THREE.Vector3(arrival.x + 9, 2.4, arrival.z + 9), l: new THREE.Vector3(arrival.x, 1.8, arrival.z - 2) },
  ], 11000);
  music.play('beach', 4);
  await cine.fadeTo(0, 2200);
  await cine.say('Muitos anos depois, ao amanhecer, alguém de uma terra distante chega à ilha...', '朝日浜', 5000);
  // the traveller walks onto the pier
  const walk = tween(4200, (k) => {
    traveller.root.position.z = arrival.z - 1 - k * 9;
    traveller.speed = k < 0.95 ? 2.4 : 0;
  });
  await cine.say('...sem saber uma única palavra de japonês.', '', 3800);
  walk();
  traveller.speed = 0;
  // ── 6. Kon appears
  const kon = new Kon();
  const kp = new THREE.Vector3(traveller.root.position.x, 1.9, traveller.root.position.z - 2.6);
  kon.root.position.copy(kp);
  kon.root.rotation.y = 0;
  kon.root.scale.setScalar(0.01);
  world.scene.add(kon.root);
  const kf = eng.onFrame(({ dt }) => kon.update(dt));
  cine.move(cam, [
    { p: new THREE.Vector3(kp.x + 4, 2.4, kp.z + 5.5), l: new THREE.Vector3(kp.x, 1.8, kp.z - 0.4) },
    { p: new THREE.Vector3(kp.x + 2.2, 2.2, kp.z + 3.6), l: new THREE.Vector3(kp.x, 1.9, kp.z) },
  ], 9000);
  await cine.wait(1200);
  sfx.newWord();
  world.bursts.spark(kp.clone(), '#ffe3a8', 50, 4);
  world.bursts.ring(kp.clone().setY(1.2), '#ffd9a0', 6);
  tween(900, (k) => kon.root.scale.setScalar(Math.max(0.01, k * 1.2 - Math.sin(k * Math.PI) * 0.1)));
  traveller.emote('surprised', 3);
  await cine.wait(1400);
  kon.talking = true;
  voice.speak('こ…こんにちは！', { pitch: 1.45, rate: 0.9 });
  await cine.say('— Ko... konnichiwa! (Olá!)', 'こんにちは！', 3400);
  kon.talking = false;
  // the very first leaf lights up far away on the Great Tree
  world.tree.setCounts(1, 0, 0, 0);
  sfx.leaf();
  const tit = h(`<div class="card"><div class="big">言の葉</div><div class="lat">KOTONOHA</div></div>`);
  cine.el.appendChild(tit);
  await sleep(50);
  tit.classList.add('on');
  await cine.wait(3800);
  tit.classList.remove('on');
  await cine.wait(900);
  // clean up
  world.tree.setCounts(0, 0, 0, 0);
  tf();
  kf();
  traveller.root.removeFromParent();
  kon.root.removeFromParent();
  frame();
  cine.close();
  u.uFade.value = 0;
  world.clockFrozen = false;
}

// ───────────────────────── character creation ─────────────────────────

export function characterCreator(app: App, world: World, save: SaveData): Promise<void> {
  ensureCss();
  const cam = app.engine.camera;
  const praia = REGION_BY_ID.praia;
  const spot = new THREE.Vector3(praia.x - 6, 1.05, praia.z + 40);
  world.clock = 0.29;
  world.clockFrozen = true;
  const u = app.engine.u;
  u.uSat.value = 1;
  u.uInk.value = 0;
  world.sky.gloom = 0;
  let ch = new Character(lookFromSave(save));
  ch.root.position.copy(spot);
  ch.root.rotation.y = 0.5;
  world.scene.add(ch.root);
  app.engine.setScene(world.scene, cam);
  cam.fov = 40;
  cam.updateProjectionMatrix();
  const wide = window.innerWidth > 760;
  const frame = app.engine.onFrame(({ dt, t }) => {
    world.update(dt, t, cam);
    ch.update(dt);
    ch.root.rotation.y = 0.4 + Math.sin(t * 0.4) * 0.5;
    cam.position.set(spot.x + (wide ? 1.2 : 0), spot.y + 1.3, spot.z + 4.2);
    cam.lookAt(spot.x + (wide ? 1.0 : 0), spot.y + (wide ? 0.95 : 0.75), spot.z);
  });
  music.play('beach');
  const el = h(`<div class="creator"><div></div><div class="panel cpanel"><h2><span class="jp">旅人</span>Quem é você?</h2>
    <label>Seu nome</label><input type="text" class="nm" maxlength="16" placeholder="Seu nome" style="width:100%">
    <div class="kana">　</div>
    <label>Pele</label><div class="row2 skin"></div>
    <label>Cabelo</label><div class="row2 hair"></div>
    <label>Penteado</label><div class="row2 style"></div>
    <label>Roupa</label><div class="row2 outfit"></div>
    <label>Olhos</label><div class="row2 eyes"></div>
    <div class="row end" style="margin-top:14px"><button class="mbtn primary go">Começar a jornada ▸</button></div></div></div>`);
  app.ui.appendChild(el);
  const nm = el.querySelector('.nm') as HTMLInputElement;
  const kanaEl = el.querySelector('.kana') as HTMLElement;
  const rebuild = () => {
    const pos = ch.root.position.clone();
    ch.root.removeFromParent();
    ch = new Character(lookFromSave(save));
    ch.root.position.copy(pos);
    world.scene.add(ch.root);
    ch.wave();
  };
  const swatches = (cls: string, colors: string[], key: 'skin' | 'hair' | 'outfit' | 'eyes') => {
    const row = el.querySelector('.' + cls) as HTMLElement;
    colors.forEach((c, i) => {
      const b = h(`<button class="sw ${save.look[key] === i ? 'on' : ''}" style="background:${c}"></button>`);
      b.addEventListener('click', () => {
        save.look[key] = i;
        row.querySelectorAll('.sw').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        sfx.click();
        rebuild();
      });
      row.appendChild(b);
    });
  };
  swatches('skin', SKINS, 'skin');
  swatches('hair', HAIRS, 'hair');
  swatches('outfit', OUTFIT_COLORS, 'outfit');
  swatches('eyes', EYES, 'eyes');
  const styles = ['Curto', 'Longo', 'Rabo de cavalo', 'Chanel', 'Espetado', 'Maria-chiquinha', 'Coque', 'Bagunçado'];
  const srow = el.querySelector('.style') as HTMLElement;
  styles.forEach((s, i) => {
    const b = h(`<button class="opt2 ${save.look.hairStyle === i ? 'on' : ''}">${s}</button>`);
    b.addEventListener('click', () => {
      save.look.hairStyle = i;
      srow.querySelectorAll('.opt2').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      sfx.click();
      rebuild();
    });
    srow.appendChild(b);
  });
  const updKana = () => {
    const k = nameToKatakana(nm.value);
    kanaEl.innerHTML = k ? `${esc(k)}<small>seu nome em katakana</small>` : '　';
  };
  nm.addEventListener('input', updKana);
  nm.value = save.name;
  updKana();
  setTimeout(() => nm.focus(), 100);
  return new Promise((res) => {
    el.querySelector('.go')!.addEventListener('click', () => {
      const name = nm.value.trim();
      if (!name) {
        nm.focus();
        nm.style.boxShadow = 'inset 0 0 0 2px #d8432f';
        return;
      }
      sfx.click();
      save.name = name;
      save.nameKana = nameToKatakana(name);
      el.remove();
      frame();
      ch.root.removeFromParent();
      world.clockFrozen = false;
      res();
    });
  });
}
