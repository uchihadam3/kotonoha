/**
 * The clothes shop (洋服屋) and the wardrobe. Buying happens in Japanese: the clerk says the price out loud and
 * you have to understand it before paying. Everything bought can be worn from the wardrobe in the pause menu.
 */
import type { Game } from './game';
import type { NpcActor } from './actors';
import { h, esc, fmtNum, sleep } from '../core/util';
import { ICON } from '../ui/icons';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import { numberKana, numberKanji, priceDistractors } from '../lang/numbers';
import { lookFromSave } from './game';

export type Slot = 'hat' | 'outfit' | 'glasses';
export interface ShopItem {
  slot: Slot;
  value: string;
  jp: string;
  r: string;
  pt: string;
  price: number;
}

export const SHOP: ShopItem[] = [
  { slot: 'hat', value: 'straw', jp: '麦わら帽子', r: 'むぎわらぼうし', pt: 'chapéu de palha', price: 120 },
  { slot: 'hat', value: 'headband', jp: '鉢巻き', r: 'はちまき', pt: 'faixa de cabeça', price: 150 },
  { slot: 'hat', value: 'kerchief', jp: '手ぬぐい', r: 'てぬぐい', pt: 'lenço de cabeça', price: 180 },
  { slot: 'hat', value: 'cap', jp: '帽子', r: 'ぼうし', pt: 'boné', price: 200 },
  { slot: 'hat', value: 'bow', jp: 'リボン', r: 'りぼん', pt: 'laço de fita', price: 250 },
  { slot: 'glasses', value: '1', jp: '眼鏡', r: 'めがね', pt: 'óculos', price: 300 },
  { slot: 'outfit', value: 'casual', jp: '普段着', r: 'ふだんぎ', pt: 'roupa do dia a dia', price: 350 },
  { slot: 'outfit', value: 'apron', jp: 'エプロン', r: 'えぷろん', pt: 'avental', price: 380 },
  { slot: 'hat', value: 'chef', jp: 'コック帽', r: 'こっくぼう', pt: 'chapéu de cozinheiro', price: 400 },
  { slot: 'hat', value: 'cat', jp: '猫耳', r: 'ねこみみ', pt: 'orelhas de gato', price: 600 },
  { slot: 'outfit', value: 'schoolM', jp: '学ラン', r: 'がくらん', pt: 'uniforme escolar (gakuran)', price: 700 },
  { slot: 'outfit', value: 'schoolF', jp: 'セーラー服', r: 'せーらーふく', pt: 'uniforme de marinheiro', price: 700 },
  { slot: 'outfit', value: 'yukata', jp: '浴衣', r: 'ゆかた', pt: 'yukata (quimono de verão)', price: 850 },
  { slot: 'hat', value: 'eboshi', jp: '烏帽子', r: 'えぼし', pt: 'chapéu da corte antiga', price: 900 },
  { slot: 'outfit', value: 'monk', jp: '作務衣', r: 'さむえ', pt: 'roupa de trabalho de monge', price: 950 },
  { slot: 'outfit', value: 'doctor', jp: '白衣', r: 'はくい', pt: 'jaleco branco', price: 1100 },
  { slot: 'outfit', value: 'suit', jp: 'スーツ', r: 'すーつ', pt: 'terno', price: 1200 },
  { slot: 'outfit', value: 'kimono', jp: '着物', r: 'きもの', pt: 'quimono', price: 1500 },
  { slot: 'outfit', value: 'miko', jp: '巫女装束', r: 'みこしょうぞく', pt: 'roupa de sacerdotisa', price: 1600 },
  { slot: 'outfit', value: 'idol', jp: 'アイドル衣装', r: 'あいどるいしょう', pt: 'roupa de idol', price: 1800 },
  { slot: 'outfit', value: 'ninja', jp: '忍び装束', r: 'しのびしょうぞく', pt: 'roupa de ninja', price: 2000 },
  { slot: 'outfit', value: 'samurai', jp: '侍の鎧', r: 'さむらいのよろい', pt: 'armadura de samurai', price: 2500 },
];

const DEFAULTS: Record<Slot, { value: string; jp: string; r: string; pt: string }> = {
  hat: { value: 'none', jp: 'なし', r: 'なし', pt: 'sem chapéu' },
  outfit: { value: 'traveler', jp: '旅人の服', r: 'たびびとのふく', pt: 'roupa de viajante' },
  glasses: { value: '0', jp: 'なし', r: 'なし', pt: 'sem óculos' },
};
const SLOT_NAME: Record<Slot, string> = { hat: 'Chapéus', outfit: 'Roupas', glasses: 'Acessórios' };

const key = (it: { slot: Slot; value: string }) => `${it.slot}:${it.value}`;

const CSS = `
.shop { position: absolute; inset: 0; z-index: 30; display: grid; grid-template-columns: 1fr min(470px, 100%); pointer-events: none; }
.shop .spanel { pointer-events: auto; margin: calc(12px + var(--safe-t)) 12px calc(12px + var(--safe-b)); display: flex; flex-direction: column; min-height: 0; max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px); }
.shop .shead { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.shop .shead h2 { margin: 0; flex: 1; min-width: 0; }
.shop .purse { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; color: var(--gold2); font-weight: 700; white-space: nowrap; flex: none; }
.shop .purse svg { width: 18px; height: 18px; }
.shop .shead .x { position: static; flex: none; }
.shop .clerk { background: var(--paper); color: var(--paper-ink); border-radius: 14px; padding: 10px 14px; margin-bottom: 10px; min-height: 64px; }
.shop .clerk .who { font-size: 12px; color: #8a6a3a; letter-spacing: .05em; }
.shop .clerk .cj { font-family: var(--jp); font-size: 19px; line-height: 1.45; }
.shop .clerk .cp { font-size: 13px; color: #6b5a44; margin-top: 2px; }
.shop .ask { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 10px; }
.shop .ask button { padding: 12px; border-radius: 12px; border: 0; background: var(--ink3); color: #fff; font-size: 17px; font-variant-numeric: tabular-nums; cursor: pointer; }
.shop .ask button.ok { background: var(--jade2); }
.shop .ask button.no { background: var(--red2); }
.shop .slist { overflow: auto; min-height: 0; flex: 1; padding-right: 2px; }
.shop .sgroup { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--gold); margin: 10px 2px 6px; }
.shop .sgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 8px; }
.shop .item { text-align: left; padding: 9px 11px; border-radius: 12px; border: 0; background: rgba(255,255,255,.06); color: #eee; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.shop .item .ij { font-family: var(--jp); font-size: 18px; display: block; }
.shop .item .ir { font-size: 11px; color: var(--muted); display: block; }
.shop .item .ip { font-size: 12px; display: block; margin-top: 3px; }
.shop .item .is { font-size: 11px; display: inline-block; margin-top: 5px; padding: 1px 7px; border-radius: 99px; background: rgba(233,196,106,.16); color: var(--gold2); }
.shop .item.on { box-shadow: inset 0 0 0 2px var(--gold); }
.shop .item.sel { background: rgba(233,196,106,.14); }
.shop .sfoot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
@media (max-width: 760px) {
  .shop { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
  .shop .spanel { margin: 0 8px calc(8px + var(--safe-b)); max-height: 60vh; max-height: 60dvh; }
  .shop .clerk .cj { font-size: 17px; }
}
`;
let cssDone = false;

/** what the player wears now (for lookFromSave) */
export function equipped(save: { equip: Record<string, string> }) {
  return {
    hat: save.equip.hat ?? 'none',
    outfit: save.equip.outfit ?? 'traveler',
    glasses: save.equip.glasses === '1',
  };
}

/**
 * Opens the shop (with a clerk) or the wardrobe (owned items only). The camera turns to face the player so
 * every change is visible, framed in the space the panel leaves free.
 */
export async function openShop(g: Game, clerk: NpcActor | null) {
  if (!cssDone) {
    cssDone = true;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const wardrobe = !clerk;
  g.pause(true);
  const save = g.save;
  // phones: step back so the whole body fits in the space above the panel
  const narrow = window.innerWidth / window.innerHeight < 0.9;
  g.portraitShot(narrow ? 5.6 : 3.3, narrow ? 1.6 : 1.35);
  document.body.classList.add('dressing');
  const cam = g.engine.camera;
  const el = h(`<div class="shop"><div></div><div class="panel spanel">
    <div class="shead"><h2><span class="jp">${wardrobe ? '衣装' : '洋服屋'}</span>${wardrobe ? 'Guarda-roupa' : 'Loja de roupas'}</h2><span class="purse">${ICON.coin} <b>${fmtNum(save.mon)}</b> 文</span><button class="hbtn x" title="Fechar">${ICON.close}</button></div>
    ${wardrobe ? '' : `<div class="clerk"><div class="who"></div><div class="cj"></div><div class="cp"></div></div><div class="ask"></div>`}
    <div class="slist"></div>
  </div></div>`);
  g.ui.appendChild(el);
  const panel = el.querySelector('.spanel') as HTMLElement;
  const purse = el.querySelector('.purse b') as HTMLElement;
  const list = el.querySelector('.slist') as HTMLElement;
  const ask = el.querySelector('.ask') as HTMLElement | null;
  // keep the player in view beside/above the panel
  const offs = g.engine.onFrame(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const r = panel.getBoundingClientRect();
    const side = r.left > W * 0.3;
    const cx = side ? r.left / 2 : W / 2;
    const cy = side ? H / 2 : Math.max(60, r.top / 2);
    cam.setViewOffset(W, H, Math.round(W / 2 - cx), Math.round(H / 2 - cy), W, H);
  });

  const say = (jp: string, pt: string) => {
    if (!clerk) return;
    (el.querySelector('.who') as HTMLElement).textContent = `${clerk.def.name} · ${clerk.def.jp}`;
    (el.querySelector('.cj') as HTMLElement).textContent = jp;
    (el.querySelector('.cp') as HTMLElement).textContent = pt;
    voice.speak(jp, clerk.def.voice);
    clerk.char.talking = true;
    setTimeout(() => (clerk.char.talking = false), 1600);
  };
  const owned = (it: { slot: Slot; value: string }) => it.value === DEFAULTS[it.slot].value || save.items.includes(key(it));
  const wearing = (it: { slot: Slot; value: string }) => (save.equip[it.slot] ?? DEFAULTS[it.slot].value) === it.value;
  const wear = (it: { slot: Slot; value: string }) => {
    save.equip[it.slot] = it.value;
    g.player.setLook(lookFromSave(save));
    g.world.bursts.spark(g.player.pos.clone().setY(g.player.pos.y + 1.2), '#ffe9a8', 26, 2);
    g.persist();
  };

  let busy = false;
  const render = () => {
    list.innerHTML = '';
    for (const slot of ['outfit', 'hat', 'glasses'] as Slot[]) {
      const items = [{ ...DEFAULTS[slot], slot, price: 0 }, ...SHOP.filter((it) => it.slot === slot)].filter((it) => !wardrobe || owned(it));
      if (!items.length) continue;
      list.appendChild(h(`<div class="sgroup">${SLOT_NAME[slot]}</div>`));
      const grid = h(`<div class="sgrid"></div>`);
      for (const it of items) {
        const has = owned(it);
        const state = wearing(it) ? 'Usando' : has ? (it.price ? 'Comprado · vestir' : 'Vestir') : '？？ 文';
        const b = h(`<button class="item ${wearing(it) ? 'on' : ''}"><span class="ij">${esc(it.jp)}</span><span class="ir">${esc(it.r)}</span><span class="ip">${esc(it.pt)}</span><span class="is">${state}</span></button>`);
        b.addEventListener('click', () => void pick(it as ShopItem, b));
        grid.appendChild(b);
      }
      list.appendChild(grid);
    }
  };

  const pick = async (it: ShopItem, btn: HTMLElement) => {
    if (busy) return;
    sfx.click();
    if (owned(it)) {
      wear(it);
      if (clerk) say('よく お似合いですよ！', 'Ficou muito bem em você!');
      render();
      return;
    }
    if (!clerk || !ask) return;
    busy = true;
    list.querySelectorAll('.item').forEach((x) => x.classList.remove('sel'));
    btn.classList.add('sel');
    // the price is only said in Japanese: understand it to buy
    const priceKana = numberKana(it.price) + 'もん';
    say(`こちらの ${it.jp}は、${priceKana} です。`, `Ouça o preço d${it.slot === 'outfit' ? 'esta roupa' : 'este item'} e escolha quanto vai pagar.`);
    const opts = [it.price, ...priceDistractors(it.price)].sort(() => Math.random() - 0.5);
    ask.innerHTML = '';
    let tries = 0;
    await new Promise<void>((done) => {
      for (const o of opts) {
        const ob = h(`<button>${fmtNum(o)} 文</button>`);
        ob.addEventListener('click', async () => {
          if (o !== it.price) {
            tries++;
            ob.classList.add('no');
            sfx.wrong();
            say(`いいえ、${priceKana} です よ。`, tries >= 2 ? `Não, é ${numberKanji(it.price)} 文 (${priceKana}).` : 'Não é esse valor. Ouça de novo.');
            if (tries >= 2) voice.speak(priceKana, { ...(clerk.def.voice ?? { pitch: 1, rate: 1 }), rate: 0.7 });
            return;
          }
          ob.classList.add('ok');
          sfx.correct();
          await sleep(350);
          ask.innerHTML = '';
          if (save.mon < it.price) {
            say('あ、お金が 足りない みたいですね…', `Faltou dinheiro: custa ${fmtNum(it.price)} 文 e você tem ${fmtNum(save.mon)} 文. Ganhe mais em lições, batalhas, minijogos e pedidos!`);
            done();
            return;
          }
          save.mon -= it.price;
          save.items.push(key(it));
          purse.textContent = fmtNum(save.mon);
          sfx.coin();
          wear(it);
          say(`${priceKana}、ちょうど いただきます。ありがとうございます！`, `${tries ? '' : 'Entendeu de primeira! '}Comprado: ${it.pt}. Ficou ótimo!`);
          done();
        });
        ask.appendChild(ob);
      }
    });
    busy = false;
    render();
  };

  if (clerk) say('いらっしゃいませ！ ゆっくり 見て ください ね。', 'Bem-vindo! Fique à vontade para olhar. Toque numa peça para saber o preço.');
  render();
  await new Promise<void>((res) => {
    el.querySelector('.x')!.addEventListener('click', () => res());
  });
  sfx.back();
  offs();
  cam.clearViewOffset();
  el.remove();
  document.body.classList.remove('dressing');
  g.rig.override = null;
  g.pause(false);
}
