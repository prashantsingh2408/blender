const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, permissions: ['microphone'] });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => { window.SpeechSynthesisUtterance = function (t) { this.text = t; }; Object.defineProperty(window, 'speechSynthesis', { value: { speak: u => setTimeout(() => u.onend && u.onend(), 20), cancel() {} } });
    window.webkitSpeechRecognition = window.SpeechRecognition = function () { const r = this; window.__rec = r; r.start = () => setTimeout(() => r.onresult && r.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'aage badho' }], { isFinal: true })] }), 800); r.stop = () => { r.onend && r.onend(); }; }; });
  await page.route(/fonts\.g|unpkg|peerjs/, r => r.abort());
  await page.goto('file://' + process.cwd() + '/contra.html'); await page.waitForTimeout(600);
  await page.click('#cfgBtn'); await page.click('#stabs button[data-tab=controls]'); await page.click('#vt_spk'); await page.waitForTimeout(300);
  const spk = await page.textContent('#vtLines');
  await page.click('#vt_mic'); await page.waitForTimeout(11500);
  const mic = await page.textContent('#vtLines');
  console.log(JSON.stringify({ spk, mic, errs }));
  const ok = /Played/.test(spk) && /Recognised: .aage badho/.test(mic) && /Microphone level/.test(mic) && /Step 2/.test(mic) && !errs.length;
  console.log(ok ? 'VOICETEST PASS' : 'VOICETEST FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
