const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:5173/?dev=game&quick&fresh&tut=3', { waitUntil: 'load' });
  await page.waitForTimeout(9000);
  for (const [name, x, z] of [['praia', 14, 360], ['vila', 0, 232], ['comercio', 168, 160], ['neon', 300, -186], ['castelo', -192, -200]]) {
    const info = await page.evaluate(([x, z]) => {
      const g = window.kt.game;
      g.player.place(x, z, 0);
      g.rig.snap(g.player.pos);
      return new Promise((res) => setTimeout(() => {
        const r = window.kt.engine.renderer;
        r.info.autoReset = false;
        r.info.reset();
        window.kt.engine.composer.render(0.016);
        res({ calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures, progs: r.info.programs?.length });
        r.info.autoReset = true;
      }, 1500));
    }, [x, z]);
    console.log(name, JSON.stringify(info));
  }
  await browser.close();
})();
