import './ui/ui.css';
import { App } from './game/app';

const params = new URLSearchParams(location.search);
const app = new App(document.getElementById('app')!, params);
void app.boot();
(window as unknown as { kt: App }).kt = app;

// the installed game: offline copy + automatic updates (hosted site only, not inside frames)
let top = false;
try {
  top = window.top === window.self;
} catch {
  top = false;
}
const secure = location.protocol === 'https:' || location.hostname === 'localhost';
if (import.meta.env.PROD && 'serviceWorker' in navigator && secure && top) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (had) app.screens?.toast('Nova versão do KOTONOHA instalada! Ela vale a partir da próxima vez que você abrir o jogo.', 7000);
  });
}

// save when the page is hidden or closed (phones kill tabs without warning)
const flush = () => app.game?.persist();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
window.addEventListener('pagehide', flush);
