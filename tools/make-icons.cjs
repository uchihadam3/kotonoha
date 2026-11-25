// Renders the app icons (PWA + desktop) from an SVG drawing of the KOTONOHA emblem.
const { chromium } = require('playwright');
const fs = require('fs');
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
<radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1d2a3e"/><stop offset="1" stop-color="#07080f"/></radialGradient>
<linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9ffe9"/><stop offset=".4" stop-color="#5fd3a2"/><stop offset=".8" stop-color="#1f8f6c"/><stop offset="1" stop-color="#e9c46a"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#fff6d0" stop-opacity=".9"/><stop offset=".45" stop-color="#9ff0c8" stop-opacity=".35"/><stop offset="1" stop-color="#2fae84" stop-opacity="0"/></radialGradient>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c8"/><stop offset=".5" stop-color="#e9c46a"/><stop offset="1" stop-color="#a87a2c"/></linearGradient>
</defs>
<rect width="512" height="512" rx="${pad ? 0 : 112}" fill="url(#bg)"/>
<g transform="translate(256 256) scale(${pad ? 0.72 : 0.92})">
<circle r="210" fill="url(#glow)"/>
<path d="M -120 -150 A 190 190 0 1 1 -175 60" fill="none" stroke="#14141c" stroke-width="44" stroke-linecap="round"/>
<path d="M -120 -150 A 190 190 0 1 1 -175 60" fill="none" stroke="url(#ring)" stroke-width="6" stroke-linecap="round" opacity=".9"/>
<g transform="rotate(-18)">
<path d="M0,-128 C 58,-98 90,-30 78,24 C 66,76 30,110 0,134 C -30,110 -66,76 -78,24 C -90,-30 -58,-98 0,-128 Z" fill="url(#leaf)" stroke="#e9c46a" stroke-width="4"/>
<path d="M0,-110 C 3,-30 3,60 0,150 M0,-52 C 22,-62 40,-70 58,-74 M0,-52 C -22,-62 -40,-70 -58,-74 M0,-6 C 26,-18 46,-22 68,-26 M0,-6 C -26,-18 -46,-22 -68,-26 M0,40 C 22,30 42,24 60,20 M0,40 C -22,30 -42,24 -60,20" fill="none" stroke="#fff6d6" stroke-width="4" stroke-linecap="round" opacity=".9"/>
</g>
<rect x="128" y="96" width="62" height="96" rx="8" fill="#c22d1f" transform="rotate(6 159 144)"/>
<text x="159" y="160" font-size="58" text-anchor="middle" fill="#fff4e6" font-family="serif" transform="rotate(6 159 144)">言</text>
</g></svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  for (const [name, pad] of [['icon-512', false], ['maskable-512', true]]) {
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(pad)}</body></html>`);
    await p.screenshot({ path: `public/icons/${name}.png`, omitBackground: true });
  }
  await b.close();
})();
