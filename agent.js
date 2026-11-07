/* agent.js — voice-commanded autopilot for Jungle Commando.
   "Control is my voice": a hands-free listener keeps the mic open, every spoken
   phrase becomes an order (कूदो / मारो / आगे बढ़ो / रुको / अपने आप खेलो), and an
   autopilot drives the commando between orders using the game's exposed state
   (__game.player / enemies / keys). Load after talk.js on contra.html.
   Free-form sentences can additionally go through an LLM intent endpoint when
   window.INTENT_URL is set (POST {text} -> {intents:[...]}); otherwise the fast
   local parser below is used, which is what keeps reactions under 50 ms.      */
(function () {
  var G = function () { return window.__game; };
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  /* ---------- orders ---------- */
  var ORDERS = [
    { id: 'auto', re: /अपने आप|खुद खेलो|खुद से|autoplay|auto|play yourself|खेलते रहो/ },
    { id: 'advance', re: /आगे बढ़|आगे चल|आगे जा|बढ़ो|बढ़ते रहो|चलते रहो|\badvance\b|\bforward\b|\bmove\b|दौड़ो|दौड़/ },
    { id: 'retreat', re: /पीछे|वापस|\bretreat\b|\bback\b/ },
    { id: 'hold', re: /रुको|रुक जा|ठहरो|\bhold\b|\bstop\b|\bwait\b|खड़े रहो/ },
    { id: 'jump', re: /कूद|जंप|छलांग|\bjump\b|उछल/ },
    { id: 'fire', re: /मारो|मार दो|गोली|फायर|\bfire\b|\bshoot\b|\bkill\b|उड़ा दो|ठोक दो|हमला/ },
    { id: 'dash', re: /डैश|तेज़ी से|\bdash\b|भाग/ },
    { id: 'prone', re: /लेट जा|नीचे|झुक|\bduck\b|\bprone\b|\bdown\b/ },
    { id: 'start', re: /शुरू|स्टार्ट|फिर से|दोबारा|\bstart\b|\bagain\b|\brestart\b/ }
  ];
  function parse(t) { var l = String(t).toLowerCase(), out = []; ORDERS.forEach(function (o) { if (o.re.test(l)) out.push(o.id); }); return out; }

  /* ---------- key helpers (the game reads e.code; movement via its exposed keys object) ---------- */
  var CODES = { jump: ['z', 'KeyZ', 90], fire: ['x', 'KeyX', 88], dash: ['c', 'KeyC', 67], start: ['Enter', 'Enter', 13] };
  function kev(type, c) { return new KeyboardEvent(type, { key: c[0], code: c[1], keyCode: c[2], which: c[2], bubbles: true, cancelable: true }); }
  function tap(name, holdMs) { var c = CODES[name]; if (!c) return; window.dispatchEvent(kev('keydown', c)); setTimeout(function () { window.dispatchEvent(kev('keyup', c)); }, holdMs || 60); }
  function K() { var g = G(); return g && g.keys; }
  function setMove(dir) { var k = K(); if (!k) return; k.left = dir < 0; k.right = dir > 0; }
  function setDown(on) { var k = K(); if (k) k.down = !!on; }

  /* ---------- autopilot ---------- */
  var A = { strategy: 'idle', autofire: false, lastX: 0, stuckT: 0, fireT: 0, burst: 0, lastJump: 0 };
  var NAMES = { idle: 'खड़ा', advance: 'आगे बढ़ रहा', retreat: 'पीछे हट रहा', hold: 'मोर्चा', auto: 'अपने आप खेल रहा' };
  function enemiesNear(p, dir, range) { var g = G(); if (!g) return []; return (g.enemies || []).filter(function (e) { if (e.dead || e.hp <= 0) return false; var dx = e.x - p.x; if (Math.abs(dx) > range) return false; if (Math.abs((e.y || 0) - p.y) > 90) return false; return dir === 0 || (dx * dir > 0); }); }
  function tick() {
    var g = G(); if (!g || !g.G || g.G.state !== 'play' || !g.player || g.player.dead) { return; }
    var p = g.player, dt = 0.05;
    var s = A.strategy === 'auto' ? 'advance' : A.strategy;
    if (s === 'advance' || s === 'retreat') {
      var dir = s === 'advance' ? 1 : -1; setMove(dir);
      /* stuck → jump; enemy ahead → fire */
      if (Math.abs(p.x - A.lastX) < 0.3 && p.onGround) { A.stuckT += dt; if (A.stuckT > 0.35) { tap('jump', 90); A.stuckT = 0; } } else A.stuckT = 0;
      var ahead = enemiesNear(p, dir, 260);
      if (ahead.length) { A.fireT += dt; if (A.fireT > 0.22) { tap('fire', 70); A.fireT = 0; } var close = ahead.some(function (e) { return Math.abs(e.x - p.x) < 70; }); if (close && p.onGround && Date.now() - A.lastJump > 700) { tap('jump', 90); A.lastJump = Date.now(); } }
    } else if (s === 'hold') {
      setMove(0);
      var any = enemiesNear(p, 0, 300);
      if (any.length) { var e = any[0], d = e.x > p.x ? 1 : -1; if (p.dir !== d) { setMove(d); setTimeout(function () { setMove(0); }, 40); } A.fireT += dt; if (A.fireT > 0.22) { tap('fire', 70); A.fireT = 0; } }
    } else { setMove(0); }
    if (A.burst > 0) { A.fireT += dt; if (A.fireT > 0.12) { tap('fire', 60); A.fireT = 0; A.burst--; } }
    A.lastX = p.x;
  }
  setInterval(tick, 50);

  function order(ids, text) {
    if (!ids.length) return false;
    ids.forEach(function (id) {
      if (id === 'auto') { A.strategy = 'auto'; }
      else if (id === 'advance' || id === 'retreat' || id === 'hold') { A.strategy = id; }
      else if (id === 'jump') { tap('jump', 90); }
      else if (id === 'fire') { A.burst = 4; }
      else if (id === 'dash') { tap('dash', 80); }
      else if (id === 'prone') { setDown(true); setTimeout(function () { setDown(false); }, 1200); }
      else if (id === 'start') { tap('start', 60); if (A.strategy === 'idle') A.strategy = 'advance'; }
    });
    hud(); return true;
  }

  /* ---------- optional LLM intent (plug-in point) ---------- */
  function llmIntent(text) {
    if (!window.INTENT_URL) return Promise.resolve(null);
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 2500);
    return fetch(window.INTENT_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text, orders: ORDERS.map(function (o) { return o.id; }) }), signal: c.signal })
      .then(function (r) { clearTimeout(t); return r.ok ? r.json() : null; }).then(function (j) { return j && Array.isArray(j.intents) ? j.intents : null; }).catch(function () { return null; });
  }

  /* ---------- hands-free listener ---------- */
  var on = false, rec = null, seen = '', speaking = false, restartT = null;
  var realSpeak = window.speechSynthesis && speechSynthesis.speak.bind(speechSynthesis);
  if (realSpeak) { speechSynthesis.speak = function (u) { speaking = true; var end = u.onend, err = u.onerror; u.onend = function (e) { speaking = false; if (end) end(e); kick(); }; u.onerror = function (e) { speaking = false; if (err) err(e); kick(); }; try { if (rec) rec.abort(); } catch (x) {} return realSpeak(u); }; }
  function kick() { if (on && !speaking) { clearTimeout(restartT); restartT = setTimeout(startRec, 150); } }
  function handle(t, isFinal) {
    var fresh = t.length > seen.length && t.indexOf(seen) === 0 ? t.slice(seen.length) : t; seen = isFinal ? '' : t;
    var ids = parse(fresh);
    if (ids.length) { order(ids, fresh); flash('⌨ ' + fresh.trim()); }
    else if (isFinal && fresh.trim()) { llmIntent(fresh).then(function (li) { if (li && li.length) { order(li, fresh); flash('🤖 ' + fresh.trim()); } else if (window.Talk) Talk.heard(fresh); }); }
  }
  function startRec() {
    if (!on || !SR || rec) return;
    var r; try { r = new SR(); r.lang = 'hi-IN'; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1; } catch (e) { return; }
    rec = r; seen = '';
    r.onresult = function (e) { for (var i = e.resultIndex; i < e.results.length; i++) { var t = e.results[i][0].transcript.trim(); if (t) handle(t, e.results[i].isFinal); } };
    r.onerror = function (e) { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { on = false; flash('माइक की अनुमति बंद है'); hud(); } };
    r.onend = function () { rec = null; kick(); };
    try { r.start(); } catch (e) { rec = null; }
  }
  function stopRec() { try { if (rec) rec.abort(); } catch (e) {} rec = null; }

  /* ---------- UI ---------- */
  var css = document.createElement('style');
  css.textContent = '.ag-btn{position:fixed;left:12px;top:calc(50% - 100px);z-index:9001;border:0;border-radius:14px;background:#3dd6f5;color:#10202b;font:800 12px system-ui,"Noto Sans Devanagari",sans-serif;padding:7px 11px;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.4)}.ag-btn.on{background:#ff5a5f;color:#fff;animation:agp 1.2s ease-in-out infinite}@keyframes agp{50%{box-shadow:0 0 0 6px rgba(255,90,95,.25)}}' +
    '.ag-hud{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:9001;background:rgba(16,32,43,.9);color:#fff;border-radius:12px;padding:6px 14px;font:700 13px system-ui,"Noto Sans Devanagari",sans-serif;display:none;white-space:nowrap}.ag-hud.on{display:block}.ag-hud b{color:#ffd23f}' +
    '.ag-fl{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:9001;background:#ffd23f;color:#10202b;border-radius:10px;padding:4px 12px;font:800 13px system-ui,"Noto Sans Devanagari",sans-serif;display:none}.ag-fl.on{display:block}' +
    '@media (max-aspect-ratio:1/1){.ag-btn{top:auto;bottom:200px}}';
  document.head.appendChild(css);
  var btn = document.createElement('button'); btn.className = 'ag-btn'; btn.textContent = '🎧 वॉइस कंट्रोल';
  var hudEl = document.createElement('div'); hudEl.className = 'ag-hud';
  var fl = document.createElement('div'); fl.className = 'ag-fl'; var flT = null;
  function flash(t) { fl.textContent = t; fl.classList.add('on'); clearTimeout(flT); flT = setTimeout(function () { fl.classList.remove('on'); }, 1400); }
  function hud() { hudEl.innerHTML = ''; var a = document.createElement('span'); a.textContent = on ? '🎧 सुन रहा हूँ · कमांडो: ' : 'कमांडो: '; var b = document.createElement('b'); b.textContent = NAMES[A.strategy] || A.strategy; hudEl.appendChild(a); hudEl.appendChild(b); hudEl.classList.toggle('on', on || A.strategy !== 'idle'); }
  btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  btn.addEventListener('click', function (e) { e.stopPropagation(); on = !on; btn.classList.toggle('on', on); btn.textContent = on ? '🎧 सुन रहा हूँ' : '🎧 वॉइस कंट्रोल'; if (on) { if (!SR) { flash('यहाँ बोलकर खेलना संभव नहीं (Chrome में खोलो)'); on = false; btn.classList.remove('on'); btn.textContent = '🎧 वॉइस कंट्रोल'; return; } startRec(); flash('बोलो: आगे बढ़ो · कूदो · मारो · रुको · अपने आप खेलो'); } else { stopRec(); A.strategy = 'idle'; setMove(0); } hud(); });
  function mount() { document.body.appendChild(btn); document.body.appendChild(hudEl); document.body.appendChild(fl); hud(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  window.Agent = { order: function (t) { return order(parse(t), t); }, parse: parse, get strategy() { return A.strategy; }, set strategy(s) { A.strategy = s; hud(); }, get listening() { return on; }, handle: handle };
})();
