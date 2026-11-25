// Automated playtest: drives the game through its main screens and takes screenshots.
// node scripts/play.cjs [outdir] [width] [height]
const { chromium } = require('playwright');
(async () => {
  const [out = 'screenshots/play', w = '1280', hh = '720'] = process.argv.slice(2);
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +hh } });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto('http://127.0.0.1:5173/?dev=game&quick&fresh&tut=3', { waitUntil: 'load' });
  await page.waitForTimeout(9000);
  const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // walk to the village plaza
  await ev(() => { const g = window.kt.game; g.player.place(4, 222, Math.PI); g.rig.yaw = 0.3; g.rig.snap(g.player.pos); });
  await page.waitForTimeout(2500);
  await shot('01-village');
  // talk to grandma Haru
  await ev(() => { const g = window.kt.game; const n = g.npcs.find((x) => x.def.id === 'haru'); g.player.place(n.pos.x + 2, n.pos.z + 2, 0); g.rig.snap(g.player.pos); g.talkTo(n); });
  await page.waitForTimeout(2500);
  await shot('02-dialog');
  await page.mouse.click(+w / 2, +hh - 90);
  await page.waitForTimeout(400);
  await page.mouse.click(+w / 2, +hh - 90);
  await page.waitForTimeout(1500);
  await shot('03-menu');
  // choose the first option (lesson)
  await page.keyboard.press('1');
  await page.waitForTimeout(2000);
  await shot('04-lesson-card');
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await page.waitForTimeout(800);
  await shot('05-lesson-quiz');
  console.log(logs.slice(0, 30).join('\n'));
  await browser.close();
})();
