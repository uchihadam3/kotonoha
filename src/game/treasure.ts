/**
 * Treasure chests (宝箱) hidden around every place on the island. Each is locked with a word: build it from
 * scrambled kana tiles (a picture in the easy places, a kanji word with its meaning in the harder ones).
 * Inside: mon and, sometimes, clothes from the shop for free.
 */
import * as THREE from 'three';
import type { Game } from './game';
import type { Interactable } from './game';
import { REGIONS, type RegionDef } from '../data/regions';
import { heightAt } from '../world/terrain';
import { h, esc, shuffle, sleep } from '../core/util';
import { ICON } from '../ui/icons';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { vocab, type Word } from '../lang/vocab';
import { hasKanji } from '../lang/kana';
import { SHOP } from './shop';

/** picture words for the first places (kana only, everyday things) */
const PICS: [string, string, string][] = [
  ['🍎', 'りんご', 'maçã'], ['🐱', 'ねこ', 'gato'], ['🐶', 'いぬ', 'cachorro'], ['🐟', 'さかな', 'peixe'], ['🚗', 'くるま', 'carro'],
  ['📚', 'ほん', 'livro'], ['💧', 'みず', 'água'], ['⛰️', 'やま', 'montanha'], ['🌊', 'うみ', 'mar'], ['🌸', 'はな', 'flor'],
  ['🌙', 'つき', 'lua'], ['⭐', 'ほし', 'estrela'], ['☔', 'あめ', 'chuva'], ['❄️', 'ゆき', 'neve'], ['🐦', 'とり', 'pássaro'],
  ['🍓', 'いちご', 'morango'], ['🍣', 'すし', 'sushi'], ['🍵', 'おちゃ', 'chá'], ['☂️', 'かさ', 'guarda-chuva'], ['⏰', 'とけい', 'relógio'],
  ['👟', 'くつ', 'sapato'], ['👓', 'めがね', 'óculos'], ['🏠', 'いえ', 'casa'], ['🚲', 'じてんしゃ', 'bicicleta'], ['🥚', 'たまご', 'ovo'],
  ['🍌', 'バナナ', 'banana'], ['🍊', 'みかん', 'tangerina'], ['🍉', 'スイカ', 'melancia'], ['🐻', 'くま', 'urso'], ['🐰', 'うさぎ', 'coelho'],
  ['🐒', 'さる', 'macaco'], ['🐢', 'かめ', 'tartaruga'], ['🔥', 'ひ', 'fogo'], ['🌳', 'き', 'árvore'], ['☀️', 'たいよう', 'sol'],
  ['🌈', 'にじ', 'arco-íris'], ['✋', 'て', 'mão'], ['👂', 'みみ', 'orelha'], ['🥢', 'はし', 'hashi'], ['🍙', 'おにぎり', 'bolinho de arroz'],
  ['✉️', 'てがみ', 'carta'], ['🔑', 'かぎ', 'chave'], ['🎸', 'ギター', 'violão'], ['⚽', 'サッカー', 'futebol'], ['🍜', 'ラーメン', 'lámen'],
  ['🍞', 'パン', 'pão'], ['🍰', 'ケーキ', 'bolo'], ['🐮', 'うし', 'vaca'], ['🐷', 'ぶた', 'porco'], ['🍇', 'ぶどう', 'uva'],
];
const KANA_POOL = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだでどばびぶべぼぱぴぷぺぽ';
const KATA_POOL = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワンガギグゲゴザジズゼゾダデドバビブベボパピプペポー';

interface Chest {
  id: string;
  region: RegionDef;
  pos: THREE.Vector3;
  group: THREE.Group;
  lid: THREE.Group;
  label: HTMLElement;
  open: boolean;
  lidT: number;
}

const CSS = `
.chestlock { position: absolute; inset: 0; z-index: 36; display: flex; align-items: center; justify-content: center; background: rgba(5,6,12,.55); padding: 16px; animation: fadein .25s; }
.chestlock .cl { width: min(460px, 100%); background: linear-gradient(180deg, #3a2414, #24160c); border-radius: 20px; padding: 16px 16px 14px; color: #f6e6c8; box-shadow: 0 30px 70px rgba(0,0,0,.6), inset 0 0 0 3px #d9a93a, inset 0 0 0 7px #3a2414, inset 0 0 0 9px #b8862a; text-align: center; position: relative; }
.chestlock h3 { margin: 2px 0 2px; font-family: var(--latin); letter-spacing: .12em; color: #ffd98a; }
.chestlock h3 .jp { font-family: var(--brush); margin-right: 6px; }
.chestlock .sub { font-size: 13px; color: #d8c4a0; }
.chestlock .clue { margin: 12px auto 6px; }
.chestlock .clue .pic { font-size: 72px; line-height: 1.1; animation: fwiggle 1.6s ease-in-out infinite; display: inline-block; }
.chestlock .clue .kj { font-family: var(--jp); font-size: 48px; color: #fff; }
.chestlock .clue .pt { font-size: 15px; color: #ffe7b0; }
.chestlock .slots { display: flex; justify-content: center; gap: 6px; margin: 12px 0; flex-wrap: wrap; }
.chestlock .slot { width: 46px; height: 52px; border-radius: 10px; background: rgba(0,0,0,.35); box-shadow: inset 0 0 0 2px #b8862a; font-family: var(--jp); font-size: 28px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; }
.chestlock .slot.f { background: #f6e6c8; color: #2a1a0a; animation: pop .2s; }
.chestlock .tiles { display: flex; justify-content: center; gap: 7px; flex-wrap: wrap; }
.chestlock .tile { width: 50px; height: 54px; border-radius: 11px; border: 0; background: linear-gradient(180deg, #fffaf0, #e8d6b0); color: #2a1a0a; font-family: var(--jp); font-size: 28px; cursor: pointer; box-shadow: 0 4px 0 #8a6a3a; transition: transform .1s; }
.chestlock .tile:active { transform: translateY(3px); box-shadow: 0 1px 0 #8a6a3a; }
.chestlock .tile.used { visibility: hidden; }
.chestlock .crow { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 8px; }
.chestlock .shake { animation: shake .4s; }
@keyframes fwiggle { 50% { transform: rotate(-8deg) translateY(-4px); } }
@keyframes shake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
.marker-label.chest .ml { color: #ffd76a; font-family: var(--brush); text-shadow: 0 0 14px rgba(255,200,80,.9), 0 2px 6px rgba(0,0,0,.8); }
`;
let cssDone = false;

function hash(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return (x >>> 0) / 4294967295;
}

export class Treasures {
  chests: Chest[] = [];
  constructor(private g: Game) {
    if (!cssDone) {
      cssDone = true;
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const wood = new THREE.MeshToonMaterial({ color: '#8a5a2a' });
    const dark = new THREE.MeshToonMaterial({ color: '#5a3818' });
    const gold = new THREE.MeshStandardMaterial({ color: '#f2c04a', metalness: 0.7, roughness: 0.3, emissive: '#5a3a00', emissiveIntensity: 0.6 });
    const box = new THREE.BoxGeometry(1.1, 0.6, 0.72);
    const lidG = new THREE.CylinderGeometry(0.36, 0.36, 1.1, 10, 1, false, 0, Math.PI);
    lidG.rotateZ(Math.PI / 2);
    const band = new THREE.BoxGeometry(0.1, 0.64, 0.76);
    const lock = new THREE.BoxGeometry(0.18, 0.22, 0.06);
    const col = g.world.col;
    for (const r of REGIONS) {
      const n = r.id === 'praia' ? 2 : 3;
      let placed = 0;
      for (let k = 0; k < 40 && placed < n; k++) {
        const a = hash(r.id + k) * Math.PI * 2;
        const d = r.r * (0.35 + hash(r.id + 'd' + k) * 0.55);
        const x = r.x + Math.cos(a) * d, z = r.z + Math.sin(a) * d;
        const y = heightAt(x, z);
        if (y < 0.8) continue;
        const [rx, rz] = col.resolve(x, z, 1.4);
        if (Math.hypot(rx - x, rz - z) > 0.01) continue;
        if (this.chests.some((c) => Math.hypot(c.pos.x - x, c.pos.z - z) < 14)) continue;
        if (g.npcs.some((nn) => Math.hypot(nn.pos.x - x, nn.pos.z - z) < 4)) continue;
        const grp = new THREE.Group();
        const body = new THREE.Mesh(box, wood);
        body.position.y = 0.3;
        const lid = new THREE.Group();
        lid.position.set(0, 0.6, -0.36);
        const lm = new THREE.Mesh(lidG, dark);
        lm.position.z = 0.36;
        lid.add(lm);
        for (const bx of [-0.38, 0.38]) {
          const b = new THREE.Mesh(band, gold);
          b.position.set(bx, 0.3, 0);
          grp.add(b);
        }
        const lk = new THREE.Mesh(lock, gold);
        lk.position.set(0, 0.48, 0.38);
        grp.add(body, lid, lk);
        grp.traverse((o) => ((o as THREE.Mesh).castShadow = true));
        grp.position.set(x, y, z);
        grp.rotation.y = hash(r.id + 'r' + k) * Math.PI * 2;
        g.world.scene.add(grp);
        col.circle(x, z, 0.7);
        const id = `${r.id}:${placed}`;
        const label = h(`<div class="marker-label chest"><div class="ml">宝</div><div class="mr"></div></div>`);
        g.labels.appendChild(label);
        const open = !!g.save.flags['chest:' + id];
        if (open) lid.rotation.x = -1.9;
        this.chests.push({ id, region: r, pos: new THREE.Vector3(x, y, z), group: grp, lid, label, open, lidT: open ? 1 : 0 });
        placed++;
      }
    }
  }

  get found() {
    return this.chests.filter((c) => c.open).length;
  }

  update(dt: number, cam: THREE.Camera) {
    const w = window.innerWidth, hh = window.innerHeight;
    const v = new THREE.Vector3();
    for (const c of this.chests) {
      if (c.open && c.lidT < 1) {
        c.lidT = Math.min(1, c.lidT + dt * 1.6);
        c.lid.rotation.x = -1.9 * (1 - Math.pow(1 - c.lidT, 3));
      }
      const d = c.pos.distanceTo(cam.position);
      const show = !c.open && d < 34 && !this.g.isPaused;
      if (show) {
        v.copy(c.pos).setY(c.pos.y + 1.6).project(cam);
        if (v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1) {
          c.label.style.display = '';
          c.label.style.left = ((v.x + 1) / 2) * w + 'px';
          c.label.style.top = ((1 - v.y) / 2) * hh + 'px';
          c.label.style.opacity = String(Math.min(1, 1.4 - d / 34));
          continue;
        }
      }
      c.label.style.display = 'none';
    }
  }

  interactables(p: THREE.Vector3): Interactable[] {
    const out: Interactable[] = [];
    for (const c of this.chests) {
      if (c.open || Math.abs(c.pos.x - p.x) > 5 || Math.abs(c.pos.z - p.z) > 5) continue;
      out.push({ pos: c.pos, r: 2.6, label: 'Abrir o <b>baú do tesouro</b> <span class="jp">宝箱</span>', action: () => this.open(c) });
    }
    return out;
  }

  /** the word that locks this chest: a picture early on, a kanji word later */
  private lockWord(c: Chest): { clue: string; reading: string; pt: string; word?: Word } {
    const idx = REGIONS.indexOf(c.region);
    if (idx <= 2) {
      const p = PICS[Math.floor(hash(c.id + 'w' + this.g.save.slot) * PICS.length)];
      return { clue: `<div class="pic">${p[0]}</div>`, reading: p[1], pt: p[2] };
    }
    const pool = c.region.themes.flatMap((t) => vocab.byTheme.get(t) ?? []).filter((w) => hasKanji(w.w) && w.r.length >= 2 && w.r.length <= 5 && !/[ゃゅょっー]/.test(w.r));
    const known = pool.filter((w) => this.g.learner.get('w:' + w.id));
    const src = known.length >= 3 ? known : pool;
    const w = src[Math.floor(hash(c.id + 'k' + this.g.save.slot) * src.length)];
    return { clue: `<div class="kj">${esc(w.w)}</div><div class="pt">${esc(w.pt.split(';')[0])}</div>`, reading: w.r, pt: w.pt.split(';')[0], word: w };
  }

  async open(c: Chest) {
    const g = this.g;
    g.pause(true);
    const lockW = this.lockWord(c);
    const chars = [...lockW.reading];
    const kata = /[ァ-ヺ]/.test(lockW.reading);
    const pool = kata ? KATA_POOL : KANA_POOL;
    const extra = shuffle([...pool].filter((k) => !chars.includes(k))).slice(0, Math.max(3, 7 - chars.length));
    const tiles = shuffle([...chars, ...extra]);
    const el = h(`<div class="chestlock"><div class="cl">
      <h3><span class="jp">宝箱</span>Baú do tesouro</h3>
      <div class="sub">Trancado com uma palavra. Monte a leitura com as peças!</div>
      <div class="clue">${lockW.clue}</div>
      <div class="slots">${chars.map(() => '<div class="slot"></div>').join('')}</div>
      <div class="tiles">${tiles.map((t, i) => `<button class="tile" data-i="${i}">${esc(t)}</button>`).join('')}</div>
      <div class="crow"><button class="mbtn small ghost hint">${ICON.speaker} Dica</button><button class="mbtn small ghost leave">Depois</button></div>
    </div></div>`);
    g.ui.appendChild(el);
    const slots = [...el.querySelectorAll('.slot')] as HTMLElement[];
    const filled: { ch: string; tile: HTMLElement }[] = [];
    let fails = 0;
    const res = await new Promise<boolean>((done) => {
      const check = async () => {
        if (filled.length < chars.length) return;
        if (filled.map((f) => f.ch).join('') === lockW.reading) {
          sfx.unlock();
          await sleep(300);
          done(true);
          return;
        }
        fails++;
        sfx.wrong();
        const cl = el.querySelector('.cl') as HTMLElement;
        cl.classList.remove('shake');
        void cl.offsetWidth;
        cl.classList.add('shake');
        await sleep(450);
        // keep the correct start after mistakes, give the rest back
        let keep = 0;
        while (keep < filled.length && filled[keep].ch === chars[keep]) keep++;
        if (fails >= 2) keep = Math.max(keep, Math.min(fails - 1, chars.length - 1));
        while (filled.length > keep) {
          const f = filled.pop()!;
          f.tile.classList.remove('used');
        }
        for (let i = 0; i < chars.length; i++) {
          slots[i].textContent = i < filled.length ? filled[i].ch : '';
          slots[i].classList.toggle('f', i < filled.length);
        }
        // after mistakes, the next right piece is given
        if (fails >= 2 && filled.length < chars.length) {
          const want = chars[filled.length];
          const t = [...el.querySelectorAll('.tile:not(.used)')].find((b) => b.textContent === want) as HTMLElement | undefined;
          t?.click();
        }
      };
      el.querySelectorAll('.tile').forEach((b) => b.addEventListener('click', () => {
        if (filled.length >= chars.length || b.classList.contains('used')) return;
        sfx.type();
        b.classList.add('used');
        filled.push({ ch: b.textContent!, tile: b as HTMLElement });
        const s = slots[filled.length - 1];
        s.textContent = b.textContent;
        s.classList.add('f');
        void check();
      }));
      slots.forEach((s, i) => s.addEventListener('click', () => {
        if (i !== filled.length - 1) return;
        const f = filled.pop()!;
        f.tile.classList.remove('used');
        s.textContent = '';
        s.classList.remove('f');
      }));
      el.querySelector('.hint')!.addEventListener('click', () => voice.speak(lockW.reading, { rate: 0.8 }));
      el.querySelector('.leave')!.addEventListener('click', () => done(false));
    });
    el.remove();
    if (!res) {
      g.pause(false);
      return;
    }
    // open it
    c.open = true;
    g.save.flags['chest:' + c.id] = 1;
    sfx.victory();
    const top = c.pos.clone().setY(c.pos.y + 1);
    g.world.bursts.spark(top, '#ffd76a', 60, 5);
    g.world.bursts.ring(c.pos.clone().setY(c.pos.y + 0.2), '#ffe9a8', 4);
    g.world.bursts.glyph(top.clone().setY(top.y + 1), [...lockW.reading].slice(0, 4).join(''));
    voice.speak(lockW.reading);
    if (lockW.word) {
      g.learner.introduce('w:' + lockW.word.id);
      if (fails === 0) g.learner.answer('w:' + lockW.word.id, true);
    }
    const idx = REGIONS.indexOf(c.region);
    const mon = 40 + idx * 20 + (fails === 0 ? 15 : 0);
    g.addMon(mon);
    let loot = '';
    const notOwned = SHOP.filter((it) => !g.save.items.includes(`${it.slot}:${it.value}`) && it.price <= 400 + idx * 200);
    if (notOwned.length && hash(c.id + 'loot') < 0.45) {
      const it = notOwned[Math.floor(Math.random() * notOwned.length)];
      g.save.items.push(`${it.slot}:${it.value}`);
      loot = ` e <b><span class="jp">${esc(it.jp)}</span> (${esc(it.pt)})</b>! Vista no Guarda-roupa`;
    }
    await sleep(700);
    g.app.screens.toast(`<span class="jp">宝箱</span> ${esc(lockW.reading)} = ${esc(lockW.pt)} · +${mon} 文${loot} · baús: ${this.found}/${this.chests.length}`, 6500);
    g.pause(false);
    g.persist();
  }
}
