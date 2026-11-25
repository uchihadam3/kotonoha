// Exercises battles, mini-games and conversations and screenshots each.
const { chromium } = require('playwright');
(async () => {
  const [out = 'screenshots/sys', w = '1280', hh = '720', which = 'all'] = process.argv.slice(2);
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +hh } });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`[err] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
  await page.goto('http://127.0.0.1:5173/?dev=game&quick&fresh&tut=3', { waitUntil: 'load' });
  await page.waitForTimeout(9000);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (n) => { await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
  // give the learner 40 words in learning so battles/games have material
  await ev(() => {
    const g = window.kt.game;
    g.debugSat = 1;
    const words = ['saudacoes', 'familia', 'numeros', 'animais'].flatMap((t) => g.learner.newWords(t, 10));
    for (const w of words) { const it = g.learner.introduce('w:' + w.id, Date.now() - 3600e3); it.s = 2; it.d = Date.now() - 1000; }
  });
  const run = async (name, fn, waits = [2500]) => {
    if (which !== 'all' && !which.split(',').includes(name)) return;
    await page.evaluate((src) => { const f = (0, eval)('(' + src + ')'); try { const r = f(); if (r && r.catch) r.catch((e) => console.error(String(e && e.stack || e))); } catch (e) { console.error(String(e && e.stack || e)); } }, fn.toString());
    for (let i = 0; i < waits.length; i++) { await page.waitForTimeout(waits[i]); await shot(`${name}-${i}`); }
    // close any overlay
    await ev(() => { document.querySelectorAll('.learn, .mg, .screen.dim').forEach((e) => e.remove()); const g = window.kt.game; g.dialog.close(); g.rig.override = null; while (g.isPaused) g.pause(false); });
    await page.waitForTimeout(400);
  };
  await run('battle2', () => {
    const g = window.kt.game;
    g.shadowT = 0;
    g.checkShadows(1);
    const sh = g.shadows[0];
    if (sh) g.fight(sh);
    else console.error('no shadow spawned');
  }, [3500, 3000]);
  await run('fireflies', () => window.kt.game.games.fireflies(), [2500, 3000]);
  await run('karuta', () => window.kt.game.games.karuta(), [4000]);
  await run('sushi', () => window.kt.game.games.sushi(), [3000]);
  await run('kanji', () => window.kt.game.games.kanjiDojo(), [3000]);
  await run('omikuji', () => window.kt.game.games.omikuji(), [2500]);
  await run('typing', () => window.kt.game.games.typingDojo(), [2500]);
  await run('convo', () => { const g = window.kt.game; const n = g.npcs.find((x) => x.def.id === 'tenin'); g.player.place(n.pos.x, n.pos.z + 2, Math.PI); g.rig.snap(g.player.pos); g.convos.run('konbini', n); }, [3000]);
  await run('register', () => { const g = window.kt.game; const n = g.npcs.find((x) => x.def.id === 'mio'); g.player.place(n.pos.x, n.pos.z + 2, Math.PI); g.rig.snap(g.player.pos); g.pause(true); g.convos.registerDrill(n, { who: n.def.name, whoJp: n.def.jp }); }, [3000]);
  await run('examine', () => { const g = window.kt.game; const s = g.wordSpots.find((x) => x.word.w === '井戸'); g.examine(s); }, [2500]);
  console.log(logs.slice(0, 30).join('\n'));
  await browser.close();
})();
