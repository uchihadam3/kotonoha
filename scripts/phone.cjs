// Phone checks (portrait and landscape): title, HUD, dialog, lesson card, quiz.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || 'screenshots/phone';
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [tag, dev] of [['port', devices['iPhone 13']], ['land', devices['iPhone 13 landscape']]]) {
    const ctx = await browser.newContext({ ...dev, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('[pageerror]', e.message));
    await page.goto('http://127.0.0.1:5173/?dev=title', { waitUntil: 'load' });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `${out}/${tag}-title.png` });
    await page.goto('http://127.0.0.1:5173/?dev=game&quick&fresh&tut=3', { waitUntil: 'load' });
    await page.waitForTimeout(9000);
    await page.evaluate(() => { const g = window.kt.game; g.debugSat = 1; g.world.clock = 0.4; });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${tag}-hud.png` });
    await page.evaluate(() => { const g = window.kt.game; const n = g.npcs.find((x) => x.def.id === 'haru'); g.player.place(n.pos.x + 2, n.pos.z + 2, 0); g.rig.snap(g.player.pos); g.talkTo(n); });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${tag}-dialog.png` });
    await page.evaluate(() => { document.querySelector('.dialog-box .db').click(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { document.querySelector('.dialog-box .db').click(); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${tag}-menu.png` });
    await page.evaluate(() => { document.querySelector('.dialog-box .choice').click(); });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${out}/${tag}-card.png` });
    await ctx.close();
  }
  await browser.close();
})();
