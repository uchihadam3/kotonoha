/**
 * The KOTONOHA logo: an ink ensō (円相) painted by a brush, a glowing jade-and-gold leaf blooming inside it,
 * a vermilion hanko seal reading 言の葉, the KOTONOHA wordmark and the tagline. Pure SVG + CSS so it stays
 * crisp everywhere and every piece can be animated.
 */
import { mulberry32 } from '../core/rng';
import { noise2 } from '../core/noise';

let uid = 0;

/** brush-stroke ensō as a filled path (outer edge forward, inner edge back) + dry-brush streaks */
function ensoPaths(seed = 7): { body: string; streaks: string[]; guide: string } {
  const rnd = mulberry32(seed);
  const R = 62;
  const start = -1.9; // radians, upper left
  const sweep = Math.PI * 1.86;
  const N = 160;
  const outer: string[] = [];
  const inner: string[] = [];
  const guide: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = start + sweep * t;
    const wob = noise2(t * 3.1, seed) * 2.2 + Math.sin(t * 9) * 0.6;
    const r = R + wob + (t > 0.85 ? (t - 0.85) * 18 : 0);
    // thick press at the start, swelling in the middle, thin flick at the end
    const press = t < 0.06 ? 0.55 + t * 7.5 : 1;
    const w = (13 * (1 - Math.pow(t, 2.2) * 0.82) + noise2(t * 12, seed + 3) * 1.8) * press;
    const x = Math.cos(a), y = Math.sin(a);
    outer.push(`${(x * (r + w * 0.55)).toFixed(2)},${(y * (r + w * 0.55)).toFixed(2)}`);
    inner.push(`${(x * (r - w * 0.45)).toFixed(2)},${(y * (r - w * 0.45)).toFixed(2)}`);
    guide.push(`${(x * r).toFixed(2)},${(y * r).toFixed(2)}`);
  }
  const body = `M${outer.join(' L')} L${inner.reverse().join(' L')} Z`;
  // dry-brush streaks near the tail
  const streaks: string[] = [];
  for (let k = 0; k < 7; k++) {
    const off = (rnd() - 0.5) * 9;
    const t0 = 0.62 + rnd() * 0.18, t1 = Math.min(1, t0 + 0.12 + rnd() * 0.2);
    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = t0 + ((t1 - t0) * i) / 24;
      const a = start + sweep * t;
      const r = R + off + noise2(t * 3.1, seed) * 2.2 + (t > 0.85 ? (t - 0.85) * 18 : 0);
      pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
    }
    streaks.push(`M${pts.join(' L')}`);
  }
  return { body, streaks, guide: `M${guide.join(' L')}` };
}

export function logoHTML(tagline: string, size: 'big' | 'small' = 'big'): string {
  const id = `kl${uid++}`;
  const e = ensoPaths();
  const leaf = 'M0,-44 C 20,-34 31,-10 27,8 C 23,26 10,38 0,46 C -10,38 -23,26 -27,8 C -31,-10 -20,-34 0,-44 Z';
  const veins = [
    'M0,-38 C 1,-10 1,20 0,52',
    'M0,-18 C 8,-22 14,-24 20,-26', 'M0,-18 C -8,-22 -14,-24 -20,-26',
    'M0,-2 C 9,-6 16,-8 24,-9', 'M0,-2 C -9,-6 -16,-8 -24,-9',
    'M0,14 C 8,10 15,8 21,7', 'M0,14 C -8,10 -15,8 -21,7',
    'M0,29 C 6,26 11,24 15,23', 'M0,29 C -6,26 -11,24 -15,23',
  ];
  return `<div class="kt-logo ${size}">
  <div class="kt-mark">
    <svg class="emblem" viewBox="-90 -90 180 180" aria-hidden="true">
      <defs>
        <radialGradient id="${id}-glow"><stop offset="0" stop-color="#fff6d0" stop-opacity=".95"/><stop offset=".35" stop-color="#9ff0c8" stop-opacity=".45"/><stop offset="1" stop-color="#2fae84" stop-opacity="0"/></radialGradient>
        <linearGradient id="${id}-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9ffe9"/><stop offset=".35" stop-color="#5fd3a2"/><stop offset=".75" stop-color="#1f8f6c"/><stop offset="1" stop-color="#e9c46a"/></linearGradient>
        <linearGradient id="${id}-ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b2a35"/><stop offset=".5" stop-color="#12121a"/><stop offset="1" stop-color="#3a2230"/></linearGradient>
        <linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c8"/><stop offset=".5" stop-color="#f0c75e"/><stop offset="1" stop-color="#b9812a"/></linearGradient>
        <filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter>
        <filter id="${id}-rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/></filter>
        <mask id="${id}-reveal"><path class="reveal-stroke" d="${e.guide}" fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round" pathLength="100"/></mask>
      </defs>
      <circle class="halo" r="86" fill="url(#${id}-glow)"/>
      <g class="enso" mask="url(#${id}-reveal)" filter="url(#${id}-rough)">
        <path d="${e.body}" fill="url(#${id}-ink)"/>
        <path d="${e.body}" fill="none" stroke="url(#${id}-gold)" stroke-width=".9" opacity=".75"/>
        ${e.streaks.map((s) => `<path d="${s}" fill="none" stroke="#14141c" stroke-width="${(0.7 + Math.random()).toFixed(2)}" stroke-linecap="round" opacity=".85"/>`).join('')}
      </g>
      <g class="leaf">
        <ellipse cx="0" cy="4" rx="46" ry="52" fill="url(#${id}-glow)" opacity=".55" class="leaf-aura"/>
        <g transform="rotate(-18)">
          <path d="${leaf}" fill="url(#${id}-leaf)" stroke="#e9c46a" stroke-width="1.3"/>
          <g class="veins" fill="none" stroke="#fff6d6" stroke-width="1.35" stroke-linecap="round" opacity=".9">${veins.map((v, i) => `<path d="${v}" pathLength="1" style="--i:${i}"/>`).join('')}</g>
          <path d="${leaf}" fill="none" stroke="#fff" stroke-width="2.2" opacity=".35" filter="url(#${id}-blur)"/>
        </g>
      </g>
      <g class="sparks">${Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return `<circle cx="${(Math.cos(a) * 76).toFixed(1)}" cy="${(Math.sin(a) * 76).toFixed(1)}" r="${(1.2 + (i % 3) * 0.5).toFixed(1)}" fill="#fff3c8" style="--i:${i}"/>`;
      }).join('')}</g>
    </svg>
    <div class="hanko"><span>言</span><span>の</span><span>葉</span></div>
  </div>
  <svg class="word" viewBox="0 0 1000 150" aria-label="KOTONOHA">
    <defs>
      <linearGradient id="${id}-wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset=".45" stop-color="#f6e3b0"/><stop offset=".7" stop-color="#e2b964"/><stop offset="1" stop-color="#a87a2c"/></linearGradient>
      <linearGradient id="${id}-shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="${id}-wmask"><text x="500" y="108" text-anchor="middle" font-family="Marcellus, 'Shippori Mincho B1', Georgia, serif" font-size="112" letter-spacing="22" fill="#fff">KOTONOHA</text></mask>
    </defs>
    <text class="w-shadow" x="500" y="116" text-anchor="middle" font-family="Marcellus, Georgia, serif" font-size="112" letter-spacing="22" fill="#05060c" opacity=".8">KOTONOHA</text>
    <g class="w-letters" font-family="Marcellus, Georgia, serif" font-size="112">
      <text x="500" y="108" text-anchor="middle" letter-spacing="22" fill="url(#${id}-wg)" stroke="#3a2a14" stroke-width="1.6" paint-order="stroke">KOTONOHA</text>
    </g>
    <g mask="url(#${id}-wmask)"><rect class="w-shine" x="-300" y="0" width="220" height="150" fill="url(#${id}-shine)" transform="skewX(-20)"/></g>
  </svg>
  <div class="tagline"><i></i><span>${tagline}</span><i></i></div>
</div>`;
}

export const LOGO_CSS = `
.kt-logo { position: relative; display: flex; flex-direction: column; align-items: center; user-select: none; pointer-events: none; }
.kt-logo .kt-mark { position: relative; }
.kt-logo .emblem { width: min(250px, 34vh); height: min(250px, 34vh); overflow: visible; filter: drop-shadow(0 12px 30px rgba(0,0,0,.6)); }
.kt-logo.small .emblem { width: min(118px, 17vh); height: min(118px, 17vh); }
.kt-logo .hanko { position: absolute; right: -14%; top: 52%; width: 38px; padding: 6px 0 7px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; gap: 0;
  background: radial-gradient(circle at 30% 25%, #ef5a43, #c22d1f 60%, #9e1f15); color: #fff5ea; font-family: 'kt-brush', 'kt-mincho', serif; font-size: 25px; line-height: 1.08;
  box-shadow: inset 0 0 0 2px rgba(255,236,220,.75), inset 0 0 0 4px #c22d1f, 0 6px 16px rgba(0,0,0,.45); transform: rotate(4deg); }
.kt-logo.small .hanko { width: 22px; font-size: 14px; padding: 4px 0; border-radius: 4px; right: -16%; }
.kt-logo .word { width: min(760px, 90vw); height: auto; margin-top: 2px; overflow: visible; filter: drop-shadow(0 6px 16px rgba(0,0,0,.7)); }
.kt-logo.small .word { width: min(420px, 78vw); margin-top: -2px; }
.kt-logo .tagline { display: flex; align-items: center; gap: 14px; margin-top: 2px; font-family: 'kt-mincho', Marcellus, serif; font-weight: 700; letter-spacing: .28em; font-size: clamp(11px, 1.9vh, 16px); color: #f6e3b0; text-transform: uppercase; text-shadow: 0 2px 8px rgba(0,0,0,.9); white-space: nowrap; }
.kt-logo.small .tagline { font-size: 10px; letter-spacing: .2em; }
.kt-logo .tagline i { width: 46px; height: 1.5px; background: linear-gradient(90deg, transparent, #e9c46a, transparent); }
.kt-logo .halo { opacity: .35; animation: kt-breathe 4s ease-in-out infinite; transform-origin: 0 0; }
.kt-logo .leaf-aura { animation: kt-breathe 3s ease-in-out infinite; transform-origin: 0 4px; }
.kt-logo .w-shine { animation: kt-shine 6s ease-in-out infinite 1.5s; }
.kt-logo .sparks circle { animation: kt-twinkle 2.6s ease-in-out infinite; animation-delay: calc(var(--i) * .29s); transform-box: fill-box; transform-origin: center; }
.kt-logo .reveal-stroke { stroke-dasharray: 100; stroke-dashoffset: 0; }
.kt-logo .veins path { stroke-dasharray: 1; stroke-dashoffset: 0; }
@keyframes kt-breathe { 0%,100% { opacity: .35; transform: scale(1); } 50% { opacity: .6; transform: scale(1.06); } }
@keyframes kt-shine { 0% { transform: skewX(-20deg) translateX(0); } 45%,100% { transform: skewX(-20deg) translateX(1500px); } }
@keyframes kt-twinkle { 0%,100% { opacity: .2; transform: scale(.6); } 50% { opacity: 1; transform: scale(1.3); } }

/* reveal sequence */
.kt-logo.pre .reveal-stroke { stroke-dashoffset: 100; }
.kt-logo.pre .leaf, .kt-logo.pre .word, .kt-logo.pre .tagline, .kt-logo.pre .hanko, .kt-logo.pre .halo, .kt-logo.pre .sparks { opacity: 0; }
.kt-logo.pre .veins path { stroke-dashoffset: 1; }
.kt-logo.reveal .reveal-stroke { animation: kt-paint 1.5s cubic-bezier(.55,.05,.35,1) both .25s; }
.kt-logo.reveal .halo { animation: kt-fadein 1.2s ease both 1.2s, kt-breathe 4s ease-in-out infinite 2.4s; }
.kt-logo.reveal .leaf { animation: kt-bloom 1.1s cubic-bezier(.2,1.5,.4,1) both 1.35s; transform-origin: 0 0; }
.kt-logo.reveal .veins path { animation: kt-vein .9s ease-out both; animation-delay: calc(1.9s + var(--i) * .07s); }
.kt-logo.reveal .sparks { animation: kt-fadein .6s ease both 2.2s; }
.kt-logo.reveal .word { animation: kt-word 1.3s cubic-bezier(.2,1,.3,1) both 2.0s; }
.kt-logo.reveal .hanko { animation: kt-stamp .45s cubic-bezier(.3,1.8,.5,1) both 2.9s; }
.kt-logo.reveal .tagline { animation: kt-tag 1.2s ease both 3.3s; }
@keyframes kt-paint { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
@keyframes kt-fadein { from { opacity: 0; } to { opacity: 1; } }
@keyframes kt-bloom { 0% { opacity: 0; transform: scale(.1) rotate(-40deg); filter: brightness(3); } 60% { filter: brightness(1.4); } 100% { opacity: 1; transform: none; filter: none; } }
@keyframes kt-vein { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes kt-word { 0% { opacity: 0; transform: translateY(22px) scale(.94); filter: blur(8px); letter-spacing: .3em; } 100% { opacity: 1; transform: none; filter: none; } }
@keyframes kt-stamp { 0% { opacity: 0; transform: rotate(4deg) scale(3); } 100% { opacity: 1; transform: rotate(4deg) scale(1); } }
@keyframes kt-tag { 0% { opacity: 0; letter-spacing: .7em; } 100% { opacity: 1; } }
.kt-logo .leaf { transform-box: view-box; }
`;
