/** 地図 — the island map: places with their level and word requirement, your position, fast travel. */
import type { Game } from '../game/game';
import { h, esc, fmtNum } from '../core/util';
import { ICON } from './icons';
import { REGIONS, ROADS, REGION_BY_ID, THEME_NAMES, type RegionDef } from '../data/regions';
import { buildGrid, WORLD } from '../world/terrain';
import { sfx } from '../audio/sfx';

let mapImage: HTMLCanvasElement | null = null;

function renderIsland(size = 720): HTMLCanvasElement {
  if (mapImage) return mapImage;
  const g = buildGrid();
  const N = WORLD.seg + 1;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gi = Math.floor((x / size) * (N - 1)), gj = Math.floor((y / size) * (N - 1));
      const hgt = g[gj * N + gi];
      const hx = g[gj * N + Math.min(N - 1, gi + 1)] - hgt;
      const shade = 1 + Math.max(-0.35, Math.min(0.35, -hx * 0.12));
      let r: number, gg: number, b: number;
      if (hgt < -1.5) [r, gg, b] = [28 + hgt, 70 + hgt * 1.5, 110 + hgt];
      else if (hgt < 0.4) [r, gg, b] = [70, 150, 170];
      else if (hgt < 2.2) [r, gg, b] = [226, 210, 160];
      else if (hgt < 40) [r, gg, b] = [118 - hgt * 0.6, 170 - hgt * 0.8, 92 - hgt * 0.4];
      else if (hgt < 110) [r, gg, b] = [80 + hgt * 0.2, 110 + hgt * 0.1, 80 + hgt * 0.2];
      else [r, gg, b] = [235, 238, 245];
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, r * shade);
      img.data[i + 1] = Math.min(255, gg * shade);
      img.data[i + 2] = Math.min(255, b * shade);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // roads
  ctx.strokeStyle = 'rgba(250,236,200,.75)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([6, 4]);
  for (const rd of ROADS) {
    const A = REGION_BY_ID[rd.a], B = REGION_BY_ID[rd.b];
    const pts: [number, number][] = [[A.x, A.z], ...(rd.via ?? []), [B.x, B.z]];
    ctx.beginPath();
    pts.forEach(([x, z], i) => {
      const [px, py] = toMap(x, z, size);
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // paper vignette
  const gr = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(10,12,24,.55)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, size, size);
  mapImage = c;
  return c;
}

export function toMap(x: number, z: number, size: number): [number, number] {
  const x0 = WORLD.cx - WORLD.size / 2, z0 = WORLD.cz - WORLD.size / 2;
  return [((x - x0) / WORLD.size) * size, ((z - z0) / WORLD.size) * size];
}

export class MapUI {
  constructor(private g: Game) {}

  open() {
    const g = this.g;
    g.pause(true);
    sfx.open();
    const L = g.learner.leaves;
    const el = h(`<div class="screen dim center" style="z-index:42"><div class="panel map-panel"><button class="close">${ICON.close}</button>
      <div style="padding:14px 16px 0"><h2><span class="jp">地図</span>Ilha de Kotonoha</h2></div>
      <div class="mapwrap"></div><div class="info"><span class="muted">Toque num lugar para ver o nível, o que se aprende lá e quantas palavras são necessárias.</span></div></div></div>`);
    g.app.screens.root.appendChild(el);
    const close = () => {
      sfx.back();
      el.remove();
      g.pause(false);
    };
    el.querySelector('.close')!.addEventListener('click', close);
    el.addEventListener('pointerdown', (e) => {
      if (e.target === el) close();
    });
    const wrap = el.querySelector('.mapwrap') as HTMLElement;
    const info = el.querySelector('.info') as HTMLElement;
    const img = renderIsland();
    const cv = img.cloneNode(true) as HTMLCanvasElement;
    cv.getContext('2d')!.drawImage(img, 0, 0);
    // keep it square inside the wrap
    const place = () => {
      const s = Math.min(wrap.clientWidth, wrap.clientHeight);
      cv.style.width = cv.style.height = s + 'px';
      cv.style.position = 'absolute';
      cv.style.left = (wrap.clientWidth - s) / 2 + 'px';
      cv.style.top = (wrap.clientHeight - s) / 2 + 'px';
      return { s, ox: (wrap.clientWidth - s) / 2, oy: (wrap.clientHeight - s) / 2 };
    };
    wrap.appendChild(cv);
    requestAnimationFrame(() => {
      const { s, ox, oy } = place();
      for (const r of REGIONS) {
        const [mx, my] = toMap(r.x, r.z, s);
        const open = L >= r.req;
        const pin = h(`<button class="pin ${open ? '' : 'locked'}" style="left:${ox + mx}px;top:${oy + my}px;--c:${r.color}"><span class="dot"></span><span class="lbl"><span class="jp">${r.jp}</span>${esc(r.name)}</span>${open ? `<span class="req">${esc(r.level)}</span>` : `<span class="req">🔒 ${fmtNum(r.req)} palavras</span>`}</button>`);
        pin.addEventListener('click', () => this.info(info, r, close));
        wrap.appendChild(pin);
      }
      const [px, py] = toMap(g.player.pos.x, g.player.pos.z, s);
      wrap.appendChild(h(`<div class="you" style="left:${ox + px}px;top:${oy + py}px"></div>`));
      const [tx, ty] = toMap(g.world.treeBase.x, g.world.treeBase.z, s);
      wrap.appendChild(h(`<div style="position:absolute;left:${ox + tx}px;top:${oy + ty - 22}px;transform:translate(-50%,-50%);font-size:26px;filter:drop-shadow(0 0 8px #7ff0c4)">🌳</div>`));
    });
  }

  private info(info: HTMLElement, r: RegionDef, close: () => void) {
    const g = this.g;
    sfx.click();
    const L = g.learner.leaves;
    const open = L >= r.req;
    const visited = g.save.visited.includes(r.id);
    const themes = r.themes.map((t) => THEME_NAMES[t]?.pt ?? t).join(', ');
    info.innerHTML = `<div class="jp">${r.jp}</div><div style="flex:1"><b>${esc(r.name)}</b> · <span class="muted">${esc(r.kana)} · nível ${esc(r.level)}</span><br>${esc(r.desc)}<br><small class="muted">Aprende-se: ${esc(themes)}${r.req ? ` · abre com ${fmtNum(r.req)} palavras` : ''}</small></div>`;
    if (open && visited) {
      const b = g.app.screens.btn('Viajar ⛩', async () => {
        close();
        const spot = g.spots.find((s) => s.id === 'hokora' && Math.hypot(s.x - r.x, s.z - r.z) < r.r + 10);
        await g.teleport(spot ? spot.x + 2 : r.x, spot ? spot.z + 2 : r.z + r.r * 0.3);
      }, 'small primary');
      info.appendChild(b);
    } else if (!open) {
      info.appendChild(h(`<div class="muted small" style="text-align:right">Faltam <b style="color:#ffcf8a">${fmtNum(r.req - L)}</b><br>palavras</div>`));
    }
  }
}
