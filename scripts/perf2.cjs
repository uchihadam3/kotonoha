const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:5173/?dev=game&quick&fresh&tut=3', { waitUntil: 'load' });
  await page.waitForTimeout(9000);
  const out = await page.evaluate(() => {
    const g = window.kt.game, w = g.world, r = window.kt.engine.renderer;
    g.player.place(0, 232, 0); g.rig.snap(g.player.pos);
    const measure = () => { r.info.autoReset = false; r.info.reset(); window.kt.engine.composer.render(0.016); const v = { calls: r.info.render.calls, tris: r.info.render.triangles }; r.info.autoReset = true; return v; };
    const res = { all: measure() };
    const toggle = (name, objs) => { objs.forEach((o) => (o.userData._v = o.visible, o.visible = false)); res['-' + name] = measure(); objs.forEach((o) => (o.visible = o.userData._v)); };
    toggle('veg', [w.veg.group]);
    toggle('tree', [w.tree.group]);
    toggle('terrain', [w.terrain]);
    toggle('grass', w.grass ? [w.grass.mesh] : []);
    toggle('regions', w.scene.children.filter((c) => c.name && c.name.startsWith('region-')));
    toggle('npcs', g.npcs.map((n) => n.char.root));
    toggle('water', [w.water.group]);
    w.sun.castShadow = false; res['-shadows'] = measure(); w.sun.castShadow = true;
    return res;
  });
  console.log(JSON.stringify(out, null, 0));
  await browser.close();
})();
