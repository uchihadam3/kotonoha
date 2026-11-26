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
import type { Game } from './game';
import { completion } from './completion';
import { lookFromSave } from './game';

const CSS = `
.cine { position: absolute; inset: 0; z-index: 50; pointer-events: auto; }
.cine .sub { position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); width: min(900px, 92vw); text-align: center; color: #fff; font-size: clamp(16px, 2.4vw, 23px); line-height: 1.55; text-shadow: 0 2px 12px rgba(0,0,0,.95); opacity: 0; transition: opacity .9s ease; font-family: 'kt-mincho', var(--latin), serif; letter-spacing: .02em; }
.cine .sub.on { opacity: 1; }
.cine .sub .jp { display: block; font-family: var(--jp); font-size: 1.25em; color: var(--gold2); margin-bottom: 4px; }
.cine .skip { position: absolute; right: 20px; bottom: calc(16px + var(--safe-b)); padding: 8px 16px; border-radius: 999px; border: 0; background: rgba(0,0,0,.45); color: rgba(255,255,255,.75); font-size: 13px; letter-spacing: .1em; cursor: pointer; }
.cine .verse { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6vw; background: #05060a; }
.cine .verse .cols { display: flex; flex-direction: row-reverse; gap: clamp(14px, 3vh, 30px); align-items: flex-start; }
.cine .verse .v { writing-mode: vertical-rl; font-family: var(--brush); font-size: min(4.4vh, 40px); color: #f4ecd8; letter-spacing: .08em; line-height: 1.3; white-space: nowrap; }
.cine .verse .v:nth-child(2) { margin-top: 1.1em; }
.cine .verse .v:nth-child(3) { margin-top: 2.2em; }
.cine .verse .v span { opacity: 0; transition: opacity .6s ease, text-shadow .8s ease; text-shadow: 0 0 18px rgba(255,240,200,.9); }
.cine .verse .v span.on { opacity: 1; text-shadow: 0 0 6px rgba(255,240,200,.25); }
.cine .verse .side { max-width: 34vw; color: #d9cfb8; font-family: 'kt-mincho', serif; font-size: clamp(14px, 2vw, 19px); line-height: 1.8; opacity: 0; transition: opacity 1.2s ease; }
.cine .verse .side.on { opacity: 1; }
.cine .verse .side .who { margin-top: 18px; color: var(--gold); font-size: .85em; letter-spacing: .1em; }
.cine .verse .seal { width: 46px; height: 46px; border-radius: 6px; background: #c22d1f; color: #fff4e6; font-family: var(--brush); display: flex; align-items: center; justify-content: center; font-size: 26px; margin-top: 14px; opacity: 0; transform: scale(2); transition: all .4s cubic-bezier(.3,1.8,.5,1); }
.cine .verse .seal.on { opacity: 1; transform: scale(1) rotate(-6deg); }
.cine .card { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; opacity: 0; transition: opacity 1.4s ease; }
.cine .card.on { opacity: 1; }
.cine .card .big { font-family: var(--brush); font-size: clamp(70px, 16vw, 170px); color: #fff; text-shadow: 0 0 40px rgba(127,240,196,.6), 0 6px 30px rgba(0,0,0,.6); }
.cine .card .lat { font-family: var(--latin); letter-spacing: .5em; color: var(--gold2); font-size: clamp(16px, 3vw, 28px); margin-left: .5em; }
.cine .rain { position: absolute; inset: 0; pointer-events: none; }
.cine .rain span { position: absolute; font-family: var(--jp); font-size: clamp(17px, 2.5vw, 30px); opacity: 0; transform: translateY(12px); transition: opacity 1.1s ease, transform 2.6s ease; text-shadow: 0 2px 14px rgba(0,0,0,.9), 0 0 2px rgba(0,0,0,.8); white-space: nowrap; }
.cine .rain span.on { opacity: .96; transform: translateY(0); }
.cine .rain span small { display: block; font-family: var(--ui); font-size: 12px; letter-spacing: .16em; text-transform: uppercase; opacity: .85; margin-top: 2px; }
.cine .roll { position: absolute; inset: 0; overflow: hidden; background: linear-gradient(90deg, rgba(5,6,10,.88), rgba(5,6,10,.6) 50%, rgba(5,6,10,.15)); opacity: 0; transition: opacity 1.6s ease; }
.cine .roll.on { opacity: 1; }
.cine .roll .in { position: absolute; left: 7vw; top: 0; width: min(540px, 86vw); text-align: center; color: #efe6d2; font-family: 'kt-mincho', var(--latin), serif; will-change: transform; }
.cine .roll h3 { font-family: var(--latin); letter-spacing: .3em; color: var(--gold); font-size: 13px; font-weight: 400; margin: 40px 0 8px; text-transform: uppercase; }
.cine .roll .nm { font-size: clamp(17px, 2.1vw, 22px); line-height: 1.55; }
.cine .roll .nm .jp { font-family: var(--jp); color: var(--gold2); margin-right: 8px; }
.cine .roll .nm small { display: block; font-family: var(--ui); font-size: 12px; color: #a9a290; letter-spacing: .06em; margin-bottom: 6px; }
.cine .roll .lic { font-size: 13px; line-height: 1.75; color: #bdb4a2; font-family: var(--ui); }
.cine .roll .big { font-family: var(--brush); font-size: clamp(64px, 10vw, 112px); color: #fff; text-shadow: 0 0 30px rgba(127,240,196,.5); line-height: 1.1; }
.cine .roll .lat { font-family: var(--latin); letter-spacing: .45em; color: var(--gold2); font-size: clamp(15px, 2.4vw, 22px); margin-left: .45em; }
.cine .roll .stats { margin: 8px auto 0; max-width: 380px; }
.cine .roll .stat { display: flex; justify-content: space-between; gap: 18px; border-bottom: 1px solid rgba(233,196,106,.18); padding: 7px 2px; font-size: 15px; font-family: var(--ui); }
.cine .roll .stat b { color: var(--gold2); font-variant-numeric: tabular-nums; }
.cine .roll .thanks { font-family: var(--jp); font-size: clamp(24px, 3.4vw, 34px); color: var(--gold2); margin-top: 10px; }
@media (max-aspect-ratio: 1/1) { .cine .roll { background: rgba(5,6,10,.72); } .cine .roll .in { left: 50%; margin-left: max(-270px, -43vw); } }
@media (max-aspect-ratio: 1/1) { .cine .verse { flex-direction: column; gap: 3vh; } .cine .verse .v { font-size: clamp(20px, 3.6vh, 34px); } .cine .verse .side { max-width: 86vw; text-align: center; } }

.creator { position: absolute; inset: 0; z-index: 45; display: grid; grid-template-columns: 1fr min(420px, 100%); pointer-events: none; }
.creator .cpanel { pointer-events: auto; margin: max(14px, var(--safe-t)) 14px 14px; align-self: center; max-height: calc(100vh - 28px); overflow: auto; }
.creator .row2 { display: flex; gap: 5px; flex-wrap: wrap; margin: 3px 0 8px; }
.creator .cpanel h2 { margin-bottom: 8px; }
.creator .sw { width: 30px; height: 30px; border-radius: 10px; border: 0; cursor: pointer; box-shadow: inset 0 0 0 2px rgba(255,255,255,.15); }
.creator .sw.on { box-shadow: 0 0 0 3px var(--gold); }
.creator .opt2 { padding: 5px 10px; border-radius: 999px; border: 0; background: rgba(255,255,255,.07); color: #ddd; cursor: pointer; font-size: 13px; }
.creator .opt2.on { background: var(--gold); color: #2a1d08; }
.creator label { display: block; font-size: 13px; color: var(--muted); margin-top: 6px; }
.creator .kana { font-family: var(--jp); font-size: 26px; color: var(--gold2); min-height: 34px; margin: 4px 0 0; }
.creator .kana small { font-family: var(--ui); font-size: 12px; color: var(--muted); margin-left: 6px; }
@media (max-width: 760px) { .creator { grid-template-columns: 1fr; grid-template-rows: 1fr auto; } .creator .cpanel { margin: 0 8px calc(8px + var(--safe-b)); align-self: end; max-height: 54vh; max-height: 54dvh; } }
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
  /** when set, follows the point the camera looks at (keeps sunlight and shadows on what is on screen) */
  focus: THREE.Vector3 | null = null;
  private camAnim: (() => void) | null = null;
  constructor(private app: App) {
    ensureCss();
    this.el = h(`<div class="cine"><div class="sub"></div><button class="skip">PULAR ▸▸</button></div>`);
    app.ui.appendChild(this.el);
    this.sub = this.el.querySelector('.sub') as HTMLElement;
    this.el.querySelector('.skip')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.skipped = true;
      voice.stop();
    });
    window.addEventListener('keydown', this.onKey);
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') this.skipped = true;
  };
  /** waits on the real clock (slow frames must not stretch the scene) */
  async wait(ms: number) {
    const end = performance.now() + ms;
    while (!this.skipped) {
      const left = end - performance.now();
      if (left <= 0) break;
      await sleep(Math.min(50, left));
    }
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
      const lp = lc.getPoint(e);
      cam.lookAt(lp);
      this.focus?.copy(lp);
    });
    this.camAnim = stop;
    return stop;
  }
  fadeTo(v: number, ms = 900) {
    if (this.skipped) ms = Math.min(ms, 180);
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

export async function prologue(app: App, world: World, look: Look3D, game?: Game) {
  const cine = new Cine(app);
  cine.focus = world.focus;
  const cam = app.engine.camera;
  const eng = app.engine;
  const u = eng.u;
  cam.fov = 45;
  cam.updateProjectionMatrix();
  world.clockFrozen = true;
  eng.setScene(world.scene, cam);
  eng.start();
  const frame = eng.onFrame(({ dt, t }) => {
    world.update(dt, t, cam);
    // the islanders go about their day (only those near the camera)
    if (game) for (const n of game.npcs) if (n.pos.distanceToSquared(cam.position) < 120 * 120) n.char.update(dt);
  });
  music.stop(1.5);
  cine.bars(0.1, 1500);

  // ── 1. the epigraph (Kokinshū, 905)
  const verse = ['やまとうたは', '人の心を種として', 'よろづの言の葉とぞなれりける'];
  const vEl = h(`<div class="verse"><div class="cols">${verse.map((line) => `<div class="v">${[...line].map((c) => `<span>${esc(c)}</span>`).join('')}</div>`).join('')}</div><div class="side">A poesia do Japão tem o coração humano como semente,<br>e dele brotam as dez mil folhas das palavras.<div class="who">— Ki no Tsurayuki, prefácio do Kokin Wakashū (905)</div><div class="seal">言</div></div></div>`);
  cine.el.prepend(vEl);
  eng.skipRender = true;
  if (audio.ctx) {
    const t = audio.now;
    audio.pad([mtof(38), mtof(45), mtof(50)], t + 0.2, 9, 0.9, 'sfx', 0.3);
    [0, 3, 5, 7, 8, 12].forEach((d, i) => audio.koto(mtof(50 + d), t + 0.5 + i * 1.3, 0.3, 'sfx', { dur: 3 }));
  }
  const spans = [...vEl.querySelectorAll('.v span')];
  const tv0 = performance.now();
  for (let i = 0; i < spans.length && !cine.skipped; i++) {
    spans[i].classList.add('on');
    // keep to the real clock even if frames are slow
    const due = tv0 + (i + 1) * 150;
    const waitMs = due - performance.now();
    if (waitMs > 0) await cine.wait(waitMs);
  }
  spans.forEach((s) => s.classList.add('on'));
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
  eng.skipRender = false;
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
  // the traveller steps off the boat and walks along the pier
  const wFrom = new THREE.Vector3(arrival.x, 1.05, arrival.z - 1);
  const wTo = new THREE.Vector3(praia.x - 6, 1.05, arrival.z - 11);
  traveller.root.rotation.y = Math.atan2(wTo.x - wFrom.x, wTo.z - wFrom.z);
  const walk = tween(4200, (k) => {
    traveller.root.position.lerpVectors(wFrom, wTo, k);
    traveller.speed = k < 0.95 ? 2.4 : 0;
  });
  await cine.say('...sem saber uma única palavra de japonês.', '', 3800);
  walk();
  traveller.root.position.copy(wTo);
  traveller.root.rotation.y = Math.PI;
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
  eng.skipRender = false;
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
  app.engine.start();
  cam.fov = 40;
  cam.updateProjectionMatrix();
  // the character is framed inside the part of the screen the panel leaves free (left of it on wide
  // screens, above it on phones), at a distance that makes it fill that space
  let panelEl: HTMLElement | null = null;
  const frame = app.engine.onFrame(({ dt, t }) => {
    world.update(dt, t, cam);
    ch.update(dt);
    ch.root.rotation.y = 0.4 + Math.sin(t * 0.4) * 0.5;
    const W = window.innerWidth, H = window.innerHeight;
    const r = panelEl?.getBoundingClientRect();
    const side = !r || r.left > W * 0.3;
    const cx = side ? (r ? r.left / 2 : W / 2) : W / 2;
    const freeTop = Math.max(0, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-t')) || 0);
    const freeH = side ? H : Math.max(120, (r?.top ?? H) - freeTop);
    const cy = side ? H / 2 : freeTop + freeH / 2;
    const fit = side ? 0.78 : 0.86;
    const d = Math.min(10, Math.max(2.6, (1.85 * H) / (fit * freeH * 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)))));
    cam.position.set(spot.x + d * 0.08, spot.y + 1.05 + d * 0.06, spot.z + d);
    cam.lookAt(spot.x, spot.y + 0.92, spot.z);
    cam.setViewOffset(W, H, Math.round(W / 2 - cx), Math.round(H / 2 - cy), W, H);
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
  panelEl = el.querySelector('.cpanel') as HTMLElement;
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
      cam.clearViewOffset();
      ch.root.removeFromParent();
      world.clockFrozen = false;
      res();
    });
  });
}

// ───────────────────────── epilogue ─────────────────────────

/** phrases that float over the island in the epilogue: one voice for every way of speaking learned */
const VOICES: { jp: string; reg: string; label: string }[] = [
  { jp: 'はじめまして。よろしくお願いします。', reg: 'polido', label: 'polido' },
  { jp: 'ねえ、一緒に行こうよ！', reg: 'casual', label: 'casual' },
  { jp: 'マジでヤバくない？', reg: 'giria', label: 'gíria' },
  { jp: '恐れ入りますが、少々お待ちくださいませ。', reg: 'keigo', label: 'keigo' },
  { jp: '俺は絶対にあきらめない！', reg: 'anime', label: 'anime' },
  { jp: 'いざ、参らん。', reg: 'antigo', label: 'antigo' },
  { jp: 'ほんま、おおきに！', reg: 'kansai', label: 'kansai' },
  { jp: 'いらっしゃいませ！', reg: 'polido', label: 'loja' },
  { jp: 'ただいま！　おかえり！', reg: 'casual', label: 'casa' },
  { jp: 'お疲れさまでした！', reg: 'polido', label: 'trabalho' },
  { jp: 'すみません、駅はどこですか。', reg: 'polido', label: 'rua' },
  { jp: '乾杯！', reg: 'casual', label: 'festa' },
  { jp: 'お大事に。', reg: 'polido', label: 'médico' },
  { jp: '拙者、推して参る！', reg: 'antigo', label: 'samurai' },
  { jp: 'めっちゃ楽しかった！', reg: 'giria', label: 'amigos' },
  { jp: 'ご清聴ありがとうございました。', reg: 'keigo', label: 'discurso' },
];

/**
 * The ending, mirroring the prologue: the last leaf makes the Great Tree burst into bloom, the camera flies over
 * an island in full colour while voices in every register drift by, Kon waits on the pier where it all began,
 * the Kokinshū verse returns, and the credits roll with the player's own journey and the whole cast.
 */
export async function epilogue(g: Game) {
  const app = g.app;
  const eng = app.engine;
  const u = eng.u;
  const cam = eng.camera;
  const world = g.world;
  const cine = new Cine(app);
  const c = g.learner.counts();
  const back = { x: g.player.pos.x, z: g.player.pos.z, yaw: g.player.yaw };
  const oldFov = cam.fov;
  g.pause(true);
  g.hud.el.style.visibility = 'hidden';
  world.clockFrozen = true;
  cam.fov = 45;
  cam.updateProjectionMatrix();
  music.stop(1.5);
  cine.bars(0.1, 1500);
  const hime = g.npcs.find((n) => n.def.id === 'kotonoha');
  const himeVoice = hime?.def.voice ?? { pitch: 1.2, rate: 0.85 };
  const himeSays = async (jp: string, pt: string, ms = 5200) => {
    voice.speak(jp, himeVoice);
    await cine.say(pt, jp, ms);
  };
  const tb = world.treeBase;
  const focus = tb.clone();
  cine.focus = focus;
  g.focusOverride = focus;

  // ── 1. the ten-thousandth leaf: the whole tree bursts into bloom
  world.clock = 0.93;
  g.debugSat = 1.05;
  world.sky.gloom = 0;
  cine.move(cam, [
    { p: new THREE.Vector3(tb.x + 12, tb.y + 3, tb.z + 20), l: new THREE.Vector3(tb.x, tb.y + 14, tb.z) },
    { p: new THREE.Vector3(tb.x + 30, tb.y + 12, tb.z + 44), l: new THREE.Vector3(tb.x, tb.y + 30, tb.z) },
    { p: new THREE.Vector3(tb.x + 46, tb.y + 30, tb.z + 84), l: new THREE.Vector3(tb.x, tb.y + 40, tb.z) },
  ], 17000);
  await cine.wait(1600);
  if (audio.ctx) {
    const t = audio.now;
    audio.pad([mtof(50), mtof(57), mtof(62), mtof(66)], t, 9, 1.6, 'sfx', 0.3);
    [0, 4, 7, 12, 16, 19, 24].forEach((d, i) => audio.koto(mtof(62 + d), t + 0.2 + i * 0.32, 0.26, 'sfx', { dur: 3 }));
  }
  sfx.rankUp();
  g.treeOverride = [Math.max(10000, c.words), Math.max(c.memorized, 2600), Math.max(c.mastered, 1100)];
  world.bursts.spark(new THREE.Vector3(tb.x, tb.y + 40, tb.z), '#ffe9a8', 170, 15);
  world.bursts.ring(new THREE.Vector3(tb.x, tb.y + 2, tb.z), '#bff7dc', 34);
  tween(2600, (k) => (u.uFlash.value = 0.85 * (1 - k)));
  music.play('title', 3);
  await cine.wait(2400);
  await himeSays('言の葉が、みんな 帰ってきました。', 'As folhas das palavras... voltaram todas.');
  await himeSays('あなたが 覚えた 一つ一つの 言葉が、この 木に 命を 灯したのです。', 'Cada palavra que você aprendeu acendeu uma vida nesta árvore. Dez mil folhas de luz.', 5600);

  // ── 2. dawn over an island in full colour, voices in every register
  await cine.fadeTo(1, 1100);
  world.clock = 0.27;
  const R = (id: string, dy: number) => {
    const r = REGION_BY_ID[id];
    return { p: new THREE.Vector3(r.x, heightAt(r.x, r.z) + dy, r.z), r };
  };
  const cas = R('castelo', 0), neon = R('neon', 0), porto = R('porto', 0), com = R('comercio', 0), vila = R('vila', 0), praia = R('praia', 0);
  const fly = [
    { p: new THREE.Vector3(tb.x + 60, tb.y + 60, tb.z + 90), l: new THREE.Vector3(cas.p.x, cas.p.y, cas.p.z) },
    { p: new THREE.Vector3(cas.p.x + 70, cas.p.y + 78, cas.p.z + 90), l: new THREE.Vector3(cas.p.x, cas.p.y + 6, cas.p.z) },
    { p: new THREE.Vector3(neon.p.x - 120, neon.p.y + 96, neon.p.z + 70), l: new THREE.Vector3(neon.p.x, neon.p.y + 14, neon.p.z) },
    { p: new THREE.Vector3(porto.p.x - 110, porto.p.y + 66, porto.p.z + 30), l: new THREE.Vector3(porto.p.x, porto.p.y + 2, porto.p.z) },
    { p: new THREE.Vector3(com.p.x - 80, com.p.y + 56, com.p.z + 60), l: new THREE.Vector3(com.p.x, com.p.y + 2, com.p.z) },
    { p: new THREE.Vector3(vila.p.x + 60, vila.p.y + 48, vila.p.z + 70), l: new THREE.Vector3(vila.p.x, vila.p.y + 2, vila.p.z) },
    { p: new THREE.Vector3(praia.p.x + 40, 30, praia.p.z + 96), l: new THREE.Vector3(praia.p.x, 2, praia.p.z + 30) },
  ];
  cine.move(cam, fly, 33000, (k) => k);
  await cine.fadeTo(0, 1400);
  const rain = h(`<div class="rain"></div>`);
  cine.el.prepend(rain);
  let vi = 0;
  const rainTimer = window.setInterval(() => {
    if (cine.skipped) return;
    const v = VOICES[vi++ % VOICES.length];
    const sp = h(`<span style="left:${(6 + Math.random() * 62).toFixed(1)}%;top:${(10 + Math.random() * 52).toFixed(1)}%;color:var(--r-${v.reg})">${esc(v.jp)}<small>${esc(v.label)}</small></span>`);
    rain.appendChild(sp);
    requestAnimationFrame(() => requestAnimationFrame(() => sp.classList.add('on')));
    window.setTimeout(() => sp.classList.remove('on'), 3600);
    window.setTimeout(() => sp.remove(), 5200);
  }, 1500);
  await cine.say('A cor voltou a cada canto da ilha.', '', 4600);
  await cine.say('Nos castelos, nas ruas de neon, nos portos e nos mercados, as pessoas voltaram a conversar...', '', 5600);
  await cine.say('...com educação, com carinho, com gírias, em keigo, à moda antiga e até no jeito de Osaka.', '', 5600);
  await cine.say('E em cada conversa, uma palavra que você também entende.', '', 5000);
  window.clearInterval(rainTimer);
  rain.remove();

  // ── 3. the pier where it all began: Kon is waiting
  await cine.fadeTo(1, 1000);
  const pier = new THREE.Vector3(praia.p.x - 6, 0, praia.p.z + 50);
  g.player.place(pier.x, pier.z, 0);
  g.rig.snap(g.player.pos);
  g.snapKon();
  const pp = g.player.pos;
  const pierMove = cine.move(cam, [
    { p: new THREE.Vector3(pp.x - 0.6, pp.y + 2.7, pp.z - 7.5), l: new THREE.Vector3(pp.x + 0.6, pp.y + 1.6, pp.z + 6) },
    { p: new THREE.Vector3(pp.x + 0.1, pp.y + 2.4, pp.z - 5.6), l: new THREE.Vector3(pp.x + 0.6, pp.y + 1.8, pp.z + 8) },
  ], 16000);
  await cine.fadeTo(0, 1600);
  await cine.wait(800);
  const konSay = async (jp: string, pt: string, ms = 4200) => {
    g.kon.talking = true;
    voice.speak(jp, { pitch: 1.45, rate: 0.95 });
    await cine.say(pt, jp, ms);
    g.kon.talking = false;
  };
  g.kon.emote('happy', 3);
  await konSay('ねえ、覚えてる？ ここで 初めて 会った 日のこと。', 'Ei, lembra? Do dia em que a gente se conheceu, bem aqui.');
  await konSay('あの日、きみは 一つも 日本語を 知らなかった。', 'Naquele dia você não sabia nem uma palavra de japonês.');
  await konSay('今は 一万の 言葉。…これからも、よろしくね！', 'Agora são dez mil. ...Daqui pra frente, conto com você!', 4800);

  // ── 4. the verse again
  await cine.fadeTo(1, 1400);
  eng.skipRender = true;
  const verse = ['やまとうたは', '人の心を種として', 'よろづの言の葉とぞなれりける'];
  const vEl = h(`<div class="verse"><div class="cols">${verse.map((line) => `<div class="v">${[...line].map((ch) => `<span class="on">${esc(ch)}</span>`).join('')}</div>`).join('')}</div><div class="side">A poesia do Japão tem o coração humano como semente,<br>e dele brotam as dez mil folhas das palavras.<br><br>Agora, dez mil delas também são suas.<div class="who">— Ki no Tsurayuki, Kokin Wakashū (905)</div><div class="seal">言</div></div></div>`);
  vEl.style.opacity = '0';
  vEl.style.transition = 'opacity 1.6s ease';
  cine.el.prepend(vEl);
  await sleep(50);
  vEl.style.opacity = '1';
  await cine.wait(1600);
  (vEl.querySelector('.side') as HTMLElement).classList.add('on');
  await cine.wait(2600);
  (vEl.querySelector('.seal') as HTMLElement).classList.add('on');
  sfx.slap();
  await cine.wait(3400);

  // ── 5. credits over the tree at night
  world.clock = 0.9;
  g.player.place(back.x, back.z, back.yaw);
  g.rig.snap(g.player.pos);
  g.snapKon();
  eng.skipRender = false;
  vEl.style.opacity = '0';
  pierMove();
  const orbit = eng.onFrame(({ t }) => {
    const a = t * 0.05 + 0.6;
    cam.position.set(tb.x + Math.cos(a) * 95, tb.y + 34 + Math.sin(t * 0.13) * 5, tb.z + Math.sin(a) * 95);
    cam.lookAt(tb.x, tb.y + 36, tb.z);
  });
  await cine.fadeTo(0, 1800);
  vEl.remove();
  music.play('peak', 3);
  const s = g.save;
  const done = completion(g);
  const hours = Math.floor(s.playTime / 3600), mins = Math.floor((s.playTime % 3600) / 60);
  const stat = (k: string, v: string) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`;
  const cast = g.npcs
    .filter((n) => n.def.name && n.def.jp)
    .map((n) => `<div class="nm"><span class="jp">${esc(n.def.jp)}</span>${esc(n.def.name)}<small>${esc(n.def.title ?? '')}</small></div>`)
    .join('');
  const roll = h(`<div class="roll"><div class="in">
    <div class="big">言の葉</div><div class="lat">KOTONOHA</div>
    <div class="nm" style="margin-top:8px"><small>A Jornada das Dez Mil Palavras</small></div>
    <h3>A sua jornada</h3>
    <div class="nm"><span class="jp">${esc(nameToKatakana(s.name || 'Viajante'))}</span>${esc(s.name || 'Viajante')}</div>
    <div class="stats">
      ${stat('Palavras aprendidas', fmtN(c.words))}
      ${stat('Palavras dominadas', fmtN(c.mastered))}
      ${stat('Kanji', `${fmtN(done.kanji)} / ${fmtN(done.kanjiMax)}`)}
      ${stat('Kana', `${fmtN(done.kana)} / ${fmtN(done.kanaMax)}`)}
      ${stat('Conversas completas', `${done.convos} / ${done.convosMax}`)}
      ${stat('Selos das Grandes Sombras', `${done.seals} / ${done.sealsMax}`)}
      ${stat('Batalhas vencidas', fmtN(s.stats.wins))}
      ${stat('Tempo de jogo', `${hours} h ${String(mins).padStart(2, '0')} min`)}
    </div>
    <h3>Uma produção</h3><div class="nm">Uchihadam Production</div>
    <h3>Direção, mundo, história, música e arte</h3><div class="nm">Uchihadam Production</div>
    <h3>Programação e sons</h3><div class="nm">Feito com Three.js e Web Audio<small>toda a música é composta e tocada em tempo real</small></div>
    <h3>Vozes</h3><div class="nm">A síntese de voz japonesa do seu aparelho</div>
    <h3>Elenco</h3>
    <div class="nm"><span class="jp">コン</span>Kon<small>raposa-espírito</small></div>
    ${cast}
    <h3>Dados de japonês</h3>
    <div class="lic">KANJIDIC2 e JMdict © Electronic Dictionary Research and Development Group (EDRDG), CC BY-SA 4.0.<br>Traços dos kanji e kana: KanjiVG © Ulrich Apel, CC BY-SA 3.0.<br>Listas JLPT: Jonathan Waller (tanos.co.uk) via open-anki-jlpt-decks (MIT).<br>Fontes: Zen Maru Gothic, Klee One, Yuji Syuku, Shippori Mincho B1 e Marcellus (SIL Open Font License).<br>Epígrafe: Ki no Tsurayuki, prefácio do Kokin Wakashū (905).</div>
    <h3>E você</h3><div class="nm">que aprendeu dez mil palavras<small>uma folha de cada vez</small></div>
    <div class="thanks">ありがとうございました！</div>
    <div class="nm" style="margin-bottom:12vh"><small>Obrigado por jogar</small></div>
  </div></div>`);
  cine.el.prepend(roll);
  await sleep(60);
  roll.classList.add('on');
  const inner = roll.querySelector('.in') as HTMLElement;
  const total = inner.offsetHeight + window.innerHeight;
  const speed = Math.max(42, window.innerHeight / 14); // px per second
  const rollMs = (total / speed) * 1000;
  const r0 = performance.now();
  await new Promise<void>((res) => {
    const step = () => {
      const k = (performance.now() - r0) / rollMs;
      inner.style.transform = `translateY(${(window.innerHeight - k * total).toFixed(1)}px)`;
      if (k >= 1 || cine.skipped) return res();
      requestAnimationFrame(step);
    };
    step();
  });
  roll.classList.remove('on');

  // ── 6. 終
  const fin = h(`<div class="card"><div class="big">終</div><div class="lat">FIM</div></div>`);
  cine.el.appendChild(fin);
  await sleep(50);
  fin.classList.add('on');
  cine.skipped = false;
  await cine.wait(3400);
  fin.classList.remove('on');
  await cine.fadeTo(1, 1200);

  // back to the game, at the heart of the tree, in the morning
  orbit();
  roll.remove();
  fin.remove();
  cine.close();
  world.clock = 0.3;
  world.clockFrozen = false;
  g.debugSat = null;
  g.treeOverride = null;
  g.focusOverride = null;
  cam.fov = oldFov;
  cam.updateProjectionMatrix();
  g.player.place(back.x, back.z, back.yaw);
  g.rig.snap(g.player.pos);
  g.snapKon();
  g.hud.el.style.visibility = '';
  u.uFlash.value = 0;
  g.pause(false);
  await cine.fadeTo(0, 1400);
}

const fmtN = (n: number) => n.toLocaleString('pt-BR');
