const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.route(/fonts\.g|unpkg|peerjs/, r => r.abort());
  await page.goto('file://' + process.cwd() + '/contra.html#god'); await page.waitForTimeout(700);
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  const vis = () => page.evaluate(() => [...document.querySelectorAll('#settings section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.dataset.tab));
  await page.click('#cfgBtn'); const t0 = await vis();
  const res = { tabs: [] };
  for (const t of ['controls', 'gameplay', 'weapons', 'world', 'char']) { await page.click(`#stabs button[data-tab=${t}]`); res.tabs.push((await vis()).join()); }
  await page.click('#stabs button[data-tab=gameplay]'); await page.selectOption('#o_pet', '0'); await page.waitForTimeout(400);
  res.petOff = await page.evaluate(() => [Pet.D.alive, getComputedStyle(document.getElementById('petcv')).display, JSON.parse(localStorage.jc_cfg).pet]);
  await page.selectOption('#o_pet', '1'); await page.waitForTimeout(400); res.petOn = await page.evaluate(() => Pet.D.alive);
  await page.click('#stabs button[data-tab=weapons]'); await page.selectOption('#s_gun', 'K'); res.gun = await page.evaluate(() => __game.player.gun);
  await page.click('#stabs button[data-tab=char]'); await page.selectOption('#o_hero', 'megaman'); res.hero = await page.evaluate(() => [__game.player.gun, __game.cfg.hero]);
  await page.screenshot({ path: '../settings.png' });
  await page.click('#stabs button[data-tab=world]');
  const x0 = await page.evaluate(() => __game.player.x);
  await page.click('.dj[data-k=boss]'); await page.waitForTimeout(300);
  res.boss = await page.evaluate(() => [__game.player.x > 1000, __game.G.paused, document.getElementById('settings').style.display]);
  await page.click('#cfgBtn'); await page.click('#stabs button[data-tab=world]'); await page.click('.dj[data-k=start]'); await page.waitForTimeout(200);
  res.start = await page.evaluate(() => __game.player.x < 100);
  console.log(JSON.stringify({ t0, res, errs }));
  const ok = t0.join() === 'char' && res.tabs.join('|') === 'controls|gameplay|weapons|world|char' && res.petOff[0] === false && res.petOff[1] === 'none' && res.petOff[2] === 0 && res.petOn === true && res.gun === 'K' && res.hero[0] === 'MB' && res.boss[0] && !res.boss[1] && res.start && !errs.length;
  console.log(ok ? 'SETTINGS PASS' : 'SETTINGS FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
