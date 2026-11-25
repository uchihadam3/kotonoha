// Visits every place (teleport) and screenshots it; also opens the book, the map and a battle.
const { chromium } = require('playwright');
(async () => {
  const [out = 'screenshots/tour', w = '1280', hh = '720', only = ''] = process.argv.slice(2);
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +hh } });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`[err] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto('http://127.0.0.1:5173/?dev=game&quick&fresh&tut=3', { waitUntil: 'load' });
  await page.waitForTimeout(9000);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // open every gate and give some colour back for the tour
  await ev(() => { const g = window.kt.game; for (const gt of g.gates) gt.unlock(); g.debugSat = 1; g.world.clock = 0.42; });
  const places = [
    ['praia', 20, 345, 0.6], ['vila', 0, 232, 0], ['comercio', 168, 160, 1.57], ['escola', -165, 170, 0], ['santuario', -30, 60, 0],
    ['porto', 262, 22, 2.2], ['neon', 300, -186, 0], ['termas', -282, -30, 0], ['castelo', -192, -200, 0], ['templo', 92, -296, 0], ['pico', -20, -418, 0],
  ];
  for (const [id, x, z, yaw] of places) {
    if (only && !only.split(',').includes(id)) continue;
    await ev(([x, z, yaw]) => { const g = window.kt.game; g.player.place(x, z, yaw); g.rig.yaw = yaw + Math.PI; g.rig.pitch = 0.62; g.rig.dist = 34; g.rig.maxDist = 40; g.rig.snap(g.player.pos); }, [x, z, yaw]);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/${id}.png` });
    console.log('shot', id);
  }
  if (!only) {
    await ev(() => window.kt.game.openBook());
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/book.png` });
    await ev(() => { document.querySelector('.book .close').click(); window.kt.game.openMap(); });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/map.png` });
  }
  console.log(logs.slice(0, 20).join('\n'));
  await browser.close();
})();
