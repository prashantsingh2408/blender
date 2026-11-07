const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.route(/fonts\.g|unpkg|peerjs/, r => r.abort());
  await page.goto('file://' + process.cwd() + '/contra.html#god'); await page.waitForTimeout(800);
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  await page.evaluate(() => { __game.G.score = 777; });
  const before = await page.evaluate(() => ({ t: LV && LV.title }));
  await page.click('#cfgBtn'); await page.selectOption('#o_level', 'snow'); await page.click('#o_close'); await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ t: LV.title, score: __game.G.score, state: __game.G.state, en: __game.enemies.length, cam: __game.cam }));
  console.log(JSON.stringify({ before, after, errs }));
  const ok = after.t === 'SNOW BASE' && after.score === 777 && after.state === 'play' && !errs.length;
  console.log(ok ? 'WORLD PASS' : 'WORLD FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
