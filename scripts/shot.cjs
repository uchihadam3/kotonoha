// Screenshot helper: node scripts/shot.cjs <url> <out.png> [waitMs=4000] [width=1280] [height=720] [--click] [--dpr=1] [--steps=json]
const { chromium } = require('playwright');
(async () => {
  const [url, out, wait = '4000', w = '1280', hgt = '720', ...rest] = process.argv.slice(2);
  const dpr = Number((rest.find((r) => r.startsWith('--dpr=')) || '--dpr=1').slice(6));
  const stepsArg = rest.find((r) => r.startsWith('--steps='));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(hgt) }, deviceScaleFactor: dpr });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(url, { waitUntil: 'load' });
  if (rest.includes('--click')) {
    await page.waitForTimeout(800);
    await page.mouse.click(Number(w) / 2, Number(hgt) / 2);
  }
  if (stepsArg) {
    const steps = JSON.parse(stepsArg.slice(8));
    for (const s of steps) {
      if (s.wait) await page.waitForTimeout(s.wait);
      if (s.click) await page.mouse.click(s.click[0], s.click[1]);
      if (s.key) await page.keyboard.press(s.key);
      if (s.down) await page.keyboard.down(s.down);
      if (s.up) await page.keyboard.up(s.up);
      if (s.eval) await page.evaluate(s.eval);
      if (s.shot) await page.screenshot({ path: s.shot });
    }
  }
  await page.waitForTimeout(Number(wait));
  await page.screenshot({ path: out });
  console.log(logs.slice(-25).join('\n'));
  await browser.close();
})();
