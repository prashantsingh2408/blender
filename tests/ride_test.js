const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('jc_cfg', JSON.stringify({ v: 3, level: 'plane', lives: 0, aim: 'touch' })));
  await page.route(/fonts\.g|unpkg|peerjs/, r => r.abort());
  await page.goto('file://' + process.cwd() + '/contra.html#god'); await page.waitForTimeout(700);
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  const S = () => page.evaluate(() => ({ t: LV.type, cam: Math.round(__game.cam), x: Math.round(__game.player.x), y: Math.round(__game.player.y), score: __game.G.score, en: __game.enemies.length, st: __game.G.state, dead: __game.player.dead }));
  const s0 = await S(); await page.waitForTimeout(3000); const s1 = await S();
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1200); const up = await S(); await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(1000); const dn = await S(); await page.keyboard.up('ArrowDown');
  await page.screenshot({ path: '../ride.png' });
  const pet = await page.evaluate(() => window.Pet && Pet.D.alive);
  console.log(JSON.stringify({ s0, s1, up, dn, pet, errs }));
  const okA = s0.t === 'ride' && s1.cam > s0.cam + 100 && up.y < s1.y && dn.y > up.y && s1.score >= s0.score && !pet && !errs.length;
  // water crash without god mode
  await page.evaluate(() => { __game.G.godMode = false; __game.player.inv = 0; });
  const lives0 = await page.evaluate(() => __game.G.lives);
  await page.evaluate(() => { __game.player.y = 170; }); await page.waitForTimeout(300);
  const crash = await page.evaluate(() => ({ dead: __game.player.dead, lives: __game.G.lives }));
  // finish line
  await page.evaluate(() => { __game.G.godMode = true; });
  await page.goto('file://' + process.cwd() + '/contra.html#god&boss'); await page.reload(); await page.waitForTimeout(700);
  await page.keyboard.press('Enter'); await page.waitForTimeout(9000);
  const fin = await S();
  console.log(JSON.stringify({ crash, lives0, fin }));
  const ok = okA && crash.dead && fin.st === 'clear';
  console.log(ok ? 'RIDE PASS' : 'RIDE FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
