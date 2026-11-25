/** Canvas-made textures: signs with Japanese text (packed in an atlas), faces, glows, clouds, petals. */
import * as THREE from 'three';

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

export function texFrom(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const cache = new Map<string, THREE.Texture>();

/** soft radial glow (white, use with color/additive blending) */
export function glowTex(): THREE.Texture {
  const k = 'glow';
  if (cache.has(k)) return cache.get(k)!;
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
  gr.addColorStop(0.6, 'rgba(255,255,255,.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = texFrom(c);
  cache.set(k, t);
  return t;
}

export function cloudTex(seed = 1): THREE.Texture {
  const k = 'cloud' + seed;
  if (cache.has(k)) return cache.get(k)!;
  const [c, g] = canvas(256, 128);
  let s = seed * 9301;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const x = 40 + r() * 176, y = 50 + r() * 40, rad = 18 + r() * 34;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const t = texFrom(c);
  cache.set(k, t);
  return t;
}

export function petalTex(): THREE.Texture {
  const k = 'petal';
  if (cache.has(k)) return cache.get(k)!;
  const [c, g] = canvas(64, 64);
  g.translate(32, 34);
  const gr = g.createLinearGradient(0, -26, 0, 26);
  gr.addColorStop(0, '#fff2f7');
  gr.addColorStop(1, '#f49ac0');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(0, 26);
  g.bezierCurveTo(22, 10, 18, -20, 6, -26);
  g.lineTo(0, -18);
  g.lineTo(-6, -26);
  g.bezierCurveTo(-18, -20, -22, 10, 0, 26);
  g.fill();
  const t = texFrom(c);
  cache.set(k, t);
  return t;
}

/** a single glyph (kanji/kana) as a glowing texture, for floating word particles and markers */
export function glyphTex(ch: string, color = '#fff6d6', glow = 'rgba(95,211,162,.9)'): THREE.Texture {
  const k = `g:${ch}:${color}:${glow}`;
  if (cache.has(k)) return cache.get(k)!;
  const size = 256;
  const [c, g] = canvas(size, size);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const fs = ch.length > 2 ? Math.floor(190 / ch.length) * 1.5 : ch.length === 2 ? 110 : 170;
  g.font = `${fs}px 'kt-learn', 'kt-ui', serif`;
  g.shadowColor = glow;
  g.shadowBlur = 28;
  g.fillStyle = color;
  g.fillText(ch, size / 2, size / 2 + 8);
  g.shadowBlur = 8;
  g.fillText(ch, size / 2, size / 2 + 8);
  const t = texFrom(c);
  cache.set(k, t);
  return t;
}

// ───────────────────────── sign atlas ─────────────────────────

export interface SignStyle {
  bg: string;
  fg: string;
  border?: string;
  font?: 'brush' | 'mincho' | 'learn' | 'ui';
  vertical?: boolean;
  /** pixel size of the sign in the atlas (w,h) */
  w: number;
  h: number;
  glow?: string;
  sub?: string;
}

/**
 * Packs many small signs (shop names, noren curtains, plaques, neon) into one texture so a whole region's
 * signs draw in one call. add() returns UV rect; after all add(), call texture().
 */
export class SignAtlas {
  private c: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private x = 0;
  private y = 0;
  private rowH = 0;
  private tex: THREE.CanvasTexture | null = null;
  constructor(readonly size = 2048) {
    [this.c, this.g] = canvas(size, size);
  }

  /** pixel scale applied to every sign (keeps the whole island's signs in one texture) */
  scale = 0.72;
  add(text: string, st0: SignStyle): { u0: number; v0: number; u1: number; v1: number } {
    const st = { ...st0, w: Math.round(st0.w * this.scale), h: Math.round(st0.h * this.scale) };
    const pad = 4;
    if (this.x + st.w + pad > this.size) {
      this.x = 0;
      this.y += this.rowH + pad;
      this.rowH = 0;
    }
    if (this.y + st.h > this.size) {
      console.warn('SignAtlas full; sign skipped:', text);
      return { u0: 0, v0: 0, u1: 0.001, v1: 0.001 };
    }
    const x = this.x, y = this.y;
    this.x += st.w + pad;
    this.rowH = Math.max(this.rowH, st.h);
    const g = this.g;
    g.save();
    g.translate(x, y);
    // background
    g.fillStyle = st.bg;
    g.fillRect(0, 0, st.w, st.h);
    if (st.border) {
      g.strokeStyle = st.border;
      g.lineWidth = Math.max(2, Math.min(st.w, st.h) * 0.06);
      g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, st.w - g.lineWidth, st.h - g.lineWidth);
    }
    const fam = st.font === 'brush' ? "'kt-brush'" : st.font === 'mincho' ? "'kt-mincho'" : st.font === 'learn' ? "'kt-learn'" : "'kt-ui'";
    g.fillStyle = st.fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (st.glow) {
      g.shadowColor = st.glow;
      g.shadowBlur = 12;
    }
    const chars = [...text];
    if (st.vertical) {
      const n = chars.length;
      const fs = Math.min(st.w * 0.72, (st.h * 0.86) / n);
      g.font = `700 ${fs}px ${fam}, serif`;
      chars.forEach((ch, i) => g.fillText(ch, st.w / 2, st.h / 2 + (i - (n - 1) / 2) * fs * 1.02));
    } else {
      const n = chars.length;
      let fs = Math.min(st.h * (st.sub ? 0.5 : 0.66), (st.w * 0.9) / Math.max(1, n));
      g.font = `700 ${fs}px ${fam}, serif`;
      g.fillText(text, st.w / 2, st.h * (st.sub ? 0.4 : 0.53));
      if (st.sub) {
        fs = st.h * 0.2;
        g.shadowBlur = 0;
        g.font = `700 ${fs}px 'kt-ui', sans-serif`;
        g.globalAlpha = 0.8;
        g.fillText(st.sub, st.w / 2, st.h * 0.8);
      }
    }
    g.restore();
    return { u0: x / this.size, v0: 1 - (y + st.h) / this.size, u1: (x + st.w) / this.size, v1: 1 - y / this.size };
  }

  texture(): THREE.CanvasTexture {
    if (!this.tex) {
      this.tex = texFrom(this.c);
      this.tex.generateMipmaps = true;
      this.tex.minFilter = THREE.LinearMipmapLinearFilter;
    }
    this.tex.needsUpdate = true;
    return this.tex;
  }
}

/** a quad with UVs mapped to an atlas rect */
export function signQuad(w: number, h: number, uv: { u0: number; v0: number; u1: number; v1: number }): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.attributes.uv as THREE.BufferAttribute;
  // PlaneGeometry uv order: (0,1) (1,1) (0,0) (1,0)
  a.setXY(0, uv.u0, uv.v1);
  a.setXY(1, uv.u1, uv.v1);
  a.setXY(2, uv.u0, uv.v0);
  a.setXY(3, uv.u1, uv.v0);
  return g;
}

// ───────────────────────── faces ─────────────────────────

export type Expr = 'neutral' | 'happy' | 'blink' | 'surprised' | 'sad' | 'talk' | 'determined' | 'sleepy';
export const EXPRS: Expr[] = ['neutral', 'happy', 'blink', 'surprised', 'sad', 'talk', 'determined', 'sleepy'];

/**
 * Anime-style face atlas: 8 expressions in a 4×2 grid. Drawn once per eye colour / style.
 */
export function faceAtlas(eye = '#3a2a22', opts: { lashes?: boolean; blush?: boolean; fox?: boolean; glasses?: boolean; old?: boolean } = {}): THREE.Texture {
  const k = `face:${eye}:${JSON.stringify(opts)}`;
  if (cache.has(k)) return cache.get(k)!;
  const S = 256;
  const [c, g] = canvas(S * 4, S * 2);
  EXPRS.forEach((ex, i) => {
    g.save();
    g.translate((i % 4) * S, Math.floor(i / 4) * S);
    drawFace(g, S, ex, eye, opts);
    g.restore();
  });
  const t = texFrom(c);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(k, t);
  return t;
}

function drawFace(g: CanvasRenderingContext2D, S: number, ex: Expr, eye: string, o: { lashes?: boolean; blush?: boolean; fox?: boolean; glasses?: boolean; old?: boolean }) {
  const cx = S / 2;
  const ey = S * 0.47;
  const dx = o.fox ? S * 0.17 : S * 0.165;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const eyeOpen = (x: number, mirror: number) => {
    const w = o.fox ? S * 0.07 : S * 0.085, h = o.fox ? S * 0.1 : S * 0.125;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(x, ey, w * 1.08, h * 1.04, 0, 0, Math.PI * 2);
    g.fill();
    const gr = g.createLinearGradient(0, ey - h, 0, ey + h);
    gr.addColorStop(0, '#120c10');
    gr.addColorStop(0.45, eye);
    gr.addColorStop(1, lighten(eye));
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, ey + h * 0.06, w * 0.82, h * 0.92, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0b0708';
    g.beginPath();
    g.ellipse(x, ey + h * 0.12, w * 0.36, h * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    // highlights
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath();
    g.ellipse(x + w * 0.28 * mirror, ey - h * 0.38, w * 0.26, h * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath();
    g.arc(x - w * 0.3 * mirror, ey + h * 0.45, w * 0.13, 0, Math.PI * 2);
    g.fill();
    // upper lid line
    g.strokeStyle = '#1a1014';
    g.lineWidth = S * 0.022;
    g.beginPath();
    g.ellipse(x, ey + h * 0.05, w * 1.12, h * 1.1, 0, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    if (o.lashes) {
      g.beginPath();
      g.moveTo(x + w * 1.05 * mirror, ey - h * 0.55);
      g.lineTo(x + w * 1.4 * mirror, ey - h * 0.85);
      g.stroke();
    }
  };
  const eyeClosed = (x: number, happy: boolean) => {
    g.strokeStyle = '#1a1014';
    g.lineWidth = S * 0.022;
    g.beginPath();
    if (happy) g.arc(x, ey + S * 0.03, S * 0.06, Math.PI * 1.1, Math.PI * 1.9);
    else g.arc(x, ey - S * 0.02, S * 0.065, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
  };
  const brow = (x: number, mirror: number, tilt: number) => {
    g.strokeStyle = o.old ? '#d8d8d8' : '#2a1c18';
    g.lineWidth = S * (o.old ? 0.03 : 0.018);
    g.beginPath();
    g.moveTo(x - S * 0.06 * mirror, ey - S * 0.17 + tilt * mirror * -1);
    g.quadraticCurveTo(x, ey - S * 0.2, x + S * 0.06 * mirror, ey - S * 0.17 + tilt * mirror);
    g.stroke();
  };
  const L = cx - dx, R = cx + dx;
  if (ex === 'happy') {
    eyeClosed(L, true);
    eyeClosed(R, true);
  } else if (ex === 'blink' || ex === 'sleepy') {
    eyeClosed(L, false);
    eyeClosed(R, false);
  } else {
    eyeOpen(L, -1);
    eyeOpen(R, 1);
  }
  const tilt = ex === 'sad' ? -S * 0.025 : ex === 'determined' ? S * 0.03 : ex === 'surprised' ? -S * 0.01 : 0;
  brow(L, -1, tilt);
  brow(R, 1, tilt);
  // mouth
  const my = S * 0.7;
  g.strokeStyle = '#5a2626';
  g.fillStyle = '#7a2a30';
  g.lineWidth = S * 0.018;
  g.beginPath();
  if (ex === 'happy' || ex === 'talk') {
    g.moveTo(cx - S * 0.055, my - S * 0.01);
    g.quadraticCurveTo(cx, my + S * (ex === 'talk' ? 0.075 : 0.06), cx + S * 0.055, my - S * 0.01);
    g.closePath();
    g.fill();
    g.fillStyle = '#ff8f9a';
    g.beginPath();
    g.ellipse(cx, my + S * 0.025, S * 0.025, S * 0.014, 0, 0, Math.PI * 2);
    g.fill();
  } else if (ex === 'surprised') {
    g.ellipse(cx, my + S * 0.01, S * 0.028, S * 0.038, 0, 0, Math.PI * 2);
    g.fill();
  } else if (ex === 'sad') {
    g.arc(cx, my + S * 0.04, S * 0.04, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  } else if (ex === 'determined') {
    g.moveTo(cx - S * 0.04, my);
    g.lineTo(cx + S * 0.04, my - S * 0.005);
    g.stroke();
  } else {
    g.arc(cx, my - S * 0.02, S * 0.04, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
  }
  if (o.blush || ex === 'happy') {
    g.fillStyle = 'rgba(255,120,140,.35)';
    g.beginPath();
    g.ellipse(L - S * 0.02, ey + S * 0.13, S * 0.05, S * 0.025, 0, 0, Math.PI * 2);
    g.ellipse(R + S * 0.02, ey + S * 0.13, S * 0.05, S * 0.025, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (o.glasses) {
    g.strokeStyle = '#2b2b33';
    g.lineWidth = S * 0.016;
    g.beginPath();
    g.roundRect(L - S * 0.1, ey - S * 0.1, S * 0.2, S * 0.17, S * 0.04);
    g.roundRect(R - S * 0.1, ey - S * 0.1, S * 0.2, S * 0.17, S * 0.04);
    g.moveTo(L + S * 0.1, ey - S * 0.04);
    g.lineTo(R - S * 0.1, ey - S * 0.04);
    g.stroke();
  }
  if (o.old) {
    g.strokeStyle = 'rgba(120,80,60,.35)';
    g.lineWidth = S * 0.01;
    g.beginPath();
    g.moveTo(L - S * 0.09, ey + S * 0.08);
    g.lineTo(L - S * 0.05, ey + S * 0.1);
    g.moveTo(R + S * 0.09, ey + S * 0.08);
    g.lineTo(R + S * 0.05, ey + S * 0.1);
    g.stroke();
  }
}

function lighten(hex: string): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), 0.45);
  return '#' + c.getHexString();
}

export function exprUV(ex: Expr): { x: number; y: number } {
  const i = EXPRS.indexOf(ex);
  return { x: (i % 4) * 0.25, y: i < 4 ? 0.5 : 0 };
}
