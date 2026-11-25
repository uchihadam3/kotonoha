// Plays the opening flow: gate → studio → logo → title → new game → creator → prologue → tutorial.
const { chromium } = require('playwright');
(async () => {
  const [out = 'screenshots/flow', w = '1280', hh = '720'] = process.argv.slice(2);
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +hh } });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
  const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name, Date.now() % 100000); };
  await page.waitForTimeout(1500);
  await shot('00-gate');
  await page.mouse.click(+w / 2, +hh / 2);
  await page.waitForTimeout(3200);
  await shot('01-studio');
  await page.waitForTimeout(5200);
  await page.waitForTimeout(2600);
  await shot('02-logo');
  await page.waitForTimeout(4500);
  await shot('03-title');
  await page.getByText('Novo jogo').click();
  await page.waitForTimeout(800);
  await shot('04-slots');
  await page.locator('.slot').first().click();
  await page.waitForTimeout(6000);
  await page.locator('.creator .nm').fill('Adam');
  await page.waitForTimeout(3000);
  await shot('05-creator');
  await page.locator('.creator .go').click();
  const times = [3000, 9000, 9000, 8000, 7000, 8000, 7000, 6000, 6000];
  for (let i = 0; i < times.length; i++) { await page.waitForTimeout(times[i]); await shot(`06-prologue-${i}`); }
  await page.waitForTimeout(8000);
  await shot('07-tutorial');
  console.log(logs.slice(0, 20).join('\n'));
  await browser.close();
})();
