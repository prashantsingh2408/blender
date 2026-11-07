/* agent.js — hands-free voice control + autopilot for every game.
   One listener, one order parser, one HUD; a small driver per game turns orders
   into the game's own inputs and plays between orders using the game's exposed
   state. Orders are followed literally: "बचो" only dodges, "मारो" only shoots,
   "अपने आप खेलो" does everything. If an order cannot be carried out, the agent
   says so and hands control back.  <script src="agent.js" data-game="contra"> */
(function () {
  var me = document.currentScript, GAME = (me && me.getAttribute('data-game')) || 'contra';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var say = function (t) { if (window.Talk) Talk.say(t); };

  /* ---------- orders (shared vocabulary) ---------- */
  var ORDERS = [
    { id: 'auto', re: /अपने आप|खुद खेलो|खुद से|autoplay|\bauto\b|play yourself|खेलते रहो|तुम खेलो/ },
    { id: 'dodge', re: /बचो|बचा|बच के|बचके|बच जा|बचना|गोली से|गोलियों|गोलियां|गोलियाँ|गोलिय|\bdodge\b|\bevade\b|\bavoid\b|\bbullets?\b|हटो|संभल/ },
    { id: 'fireon', re: /मारते रहो|गोली चलाते रहो|keep (firing|shooting)|लगातार/ },
    { id: 'fireoff', re: /मत मारो|गोली बंद|मारना बंद|stop (firing|shooting)|cease|फायर बंद/ },
    { id: 'fire', re: /मारो|मार दो|गोली|फायर|\bfire\b|\bshoot\b|\bkill\b|उड़ा दो|ठोक दो|हमला/ },
    { id: 'advance', re: /आगे बढ़|आगे चल|आगे जा|बढ़ो|बढ़ते रहो|चलते रहो|\badvance\b|\bforward\b|\bgo\b|दौड़ो|दौड़|तेज़ चलो|गैस/ },
    { id: 'retreat', re: /पीछे|वापस|\bretreat\b|\bback\b|\breverse\b/ },
    { id: 'hold', re: /रुको|रुक जा|ठहरो|\bhold\b|\bstop\b|\bwait\b|खड़े रहो|ब्रेक|\bbrake\b/ },
    { id: 'jump', re: /कूद|जंप|छलांग|\bjump\b|उछल|उड़ो|\bfly\b/ },
    { id: 'dash', re: /डैश|\bdash\b|भाग/ },
    { id: 'prone', re: /लेट जा|झुक|\bduck\b|\bprone\b|नीचे बैठ/ },
    { id: 'up', re: /ऊपर|\bup\b|\bnorth\b/ }, { id: 'down', re: /नीचे|\bdown\b|\bsouth\b/ },
    { id: 'left', re: /बाएँ|बाएं|बायें|\bleft\b|\bwest\b/ }, { id: 'right', re: /दाएँ|दाएं|दायें|\bright\b|\beast\b/ },
    { id: 'start', re: /शुरू|स्टार्ट|फिर से|दोबारा|\bstart\b|\bagain\b|\brestart\b/ }
  ];
  function parse(t) { var l = String(t).toLowerCase(), out = []; ORDERS.forEach(function (o) { if (o.re.test(l)) out.push(o.id); }); if (out.indexOf('fireon') >= 0 || out.indexOf('fireoff') >= 0) out = out.filter(function (x) { return x !== 'fire'; }); if (out.indexOf('dodge') >= 0) out = out.filter(function (x) { return x !== 'fire'; }); return out; }

  /* ---------- key helpers ---------- */
  function kev(type, key, code, kc) { return new KeyboardEvent(type, { key: key, code: code, keyCode: kc, which: kc, bubbles: true, cancelable: true }); }
  function tap(key, code, kc, ms) { window.dispatchEvent(kev('keydown', key, code, kc)); setTimeout(function () { window.dispatchEvent(kev('keyup', key, code, kc)); }, ms || 60); }

  /* ---------- shared agent state ---------- */
  var A = { strategy: 'idle', fire: false, dodge: false, burst: 0, fails: 0, t: 0 };
  var NAMES = { idle: 'खड़ा', advance: 'आगे बढ़ रहा', retreat: 'पीछे हट रहा', hold: 'रुका', auto: 'अपने आप खेल रहा', dodge: 'बच रहा' };
  function giveBack(why) { A.strategy = 'idle'; A.fire = false; A.dodge = false; A.burst = 0; if (D.release) D.release(); say(why || 'मैं नहीं कर पा रहा, तुम कंट्रोल लो।'); hud(); }

  /* ================= drivers ================= */
  var DRIVERS = {};

  /* ---- Jungle Commando ---- */
  DRIVERS.contra = (function () {
    var g = function () { return window.__game; }, lastX = 0, stuckT = 0, fireT = 0, lastJump = 0, proneT = 0, lastLives = null, dodgeHits = 0, move = 0;
    function setMove(dir) { var k = g().keys; if (move !== dir) { k.left = dir < 0; k.right = dir > 0; move = dir; } }
    function jump() { if (Date.now() - lastJump < 260) return; lastJump = Date.now(); tap('z', 'KeyZ', 90, 90); }
    function fire() { tap('x', 'KeyX', 88, 70); }
    function prone(ms) { var k = g().keys; k.down = true; proneT = ms; }
    function enemiesNear(p, dir, range) { return (g().enemies || []).filter(function (e) { if (e.dead || e.hp <= 0) return false; var dx = e.x - p.x; if (Math.abs(dx) > range || Math.abs((e.y || 0) - p.y) > 90) return false; return dir === 0 || dx * dir > 0; }); }
    /* threat = enemy bullet that will cross the player's body within ~0.5 s */
    function threats(p) { var B = g().eBullets || [], out = []; for (var i = 0; i < B.length; i++) { var b = B[i]; if (b.dead) continue; var dx = p.x - b.x; if (!b.vx || dx * b.vx <= 0) continue; var t = dx / b.vx; if (t < 0 || t > 0.6) continue; var yAt = b.y + (b.vy || 0) * t; var top = p.y - 28, bot = p.y + 2; if (yAt < top - 6 || yAt > bot + 6) continue; out.push({ b: b, t: t, yAt: yAt, high: yAt < p.y - 12 }); } out.sort(function (u, v) { return u.t - v.t; }); return out; }
    var wantJump = false;
    return {
      ready: function () { var G = g(); return G && G.G && G.G.state === 'play' && G.player && !G.player.dead; },
      release: function () { var G = g(); if (!G) return; setMove(0); G.keys.down = false; },
      tick: function (dt) {
        var G = g(), p = G.player, s = A.strategy;
        var dir = s === 'advance' || s === 'auto' ? 1 : s === 'retreat' ? -1 : 0;
        var SF = G.surfaces || [], on = null; for (var i = 0; i < SF.length; i++) { var sf = SF[i]; if (p.x >= sf.x1 - 2 && p.x <= sf.x2 + 2 && Math.abs(sf.y - p.y) < 2) { on = sf; break; } }
        var toEdge = on ? (dir >= 0 ? on.x2 - p.x : p.x - on.x1) : 999, nearEdge = toEdge < 60;
        if (proneT > 0) { proneT -= dt; if (proneT <= 0 || nearEdge) { G.keys.down = false; proneT = 0; } }
        /* dodge first: it overrides everything else this tick (but never by stopping in mid-air) */
        if (A.dodge || s === 'auto') { var ths = threats(p); if (ths.length) { var first = ths[0], allHigh = ths.every(function (h) { return h.high; });
            if (p.onGround) { if (allHigh && dir === 0 && !nearEdge) { if (first.t < 0.4) prone(0.3); } else { G.keys.down = false; proneT = 0; wantJump = true; } A.t = 0.2; }
            else if (p.jumpsLeft > 0 && first.t < 0.25 && !first.high && p.vy > 0) { lastJump = 0; jump(); } }
          /* ensure-jump loop: the game drops a jump that lands on a prone frame, so keep asking until we leave the ground */
          if (wantJump) { if (!p.onGround) wantJump = false; else if (!G.keys.down && !p.prone && Date.now() - lastJump > 120) { lastJump = Date.now(); tap('z', 'KeyZ', 90, 90); } }
          if (lastLives !== null && G.G.lives < lastLives && A.dodge) { dodgeHits++; if (dodgeHits >= 2) { dodgeHits = 0; giveBack('मैं गोली से बच नहीं पा रहा, तुम कंट्रोल लो।'); lastLives = G.G.lives; return; } else say('लगी एक... फिर कोशिश।'); } lastLives = G.G.lives; }
        if (A.t > 0) { A.t -= dt; if (p.onGround && A.t > 0.2) A.t = 0.2; } else setMove(dir);
        if (dir !== 0) {
          if (Math.abs(p.x - lastX) < 0.3 && p.onGround) { stuckT += dt; if (stuckT > 0.35) { jump(); stuckT = 0; } } else stuckT = 0;
          /* terrain: jump before the edge of the platform we stand on, and double-jump if still falling over a gap */
          if (p.onGround && on) { if (toEdge < 9) { var ax = p.x + dir * 40, landing = SF.some(function (q) { return ax >= q.x1 && ax <= q.x2 && q.y <= p.y + 1; }); if (!landing) jump(); } }
          if (!p.onGround && p.vy > 40) { var bx = p.x + dir * 24, below = SF.some(function (q) { return bx >= q.x1 && bx <= q.x2 && q.y >= p.y - 4; }), here = SF.some(function (q) { return p.x >= q.x1 && p.x <= q.x2 && q.y >= p.y - 4; });
            if (!below && here) { setMove(0); A.t = 0.08; } else if (!below && !here && p.jumpsLeft > 0) jump(); }
          /* enemies standing on a ledge above: hop up to them */
          var up = toEdge > 90 && (G.enemies || []).some(function (e) { return !e.dead && e.hp > 0 && (e.x - p.x) * dir > 0 && Math.abs(e.x - p.x) < 150 && e.y < p.y - 22 && e.y > p.y - 80; }); if (up && p.onGround) jump();
        }
        var wantFire = A.fire || s === 'auto';
        if (wantFire) { var near = enemiesNear(p, dir || 0, 300).sort(function (q1, q2) { return Math.abs(q1.x - p.x) - Math.abs(q2.x - p.x); }); if (near.length) { var e = near[0], d = e.x > p.x ? 1 : -1, ed = Math.abs(e.x - p.x); if (dir === 0 && p.dir !== d) { setMove(d); A.t = 0.05; }
            /* in auto: stop short of a close enemy and shoot it before walking into it */
            if (s === 'auto' && ed < 120 && A.t <= 0 && p.onGround && !nearEdge) { setMove(0); A.t = 0.12; }
            fireT += dt; if (fireT > 0.14) { fire(); fireT = 0; }
            if (ed < 46 && p.onGround && s === 'auto') jump(); } }
        if (A.burst > 0) { fireT += dt; if (fireT > 0.11) { fire(); fireT = 0; A.burst--; } }
        lastX = p.x;
      },
      order: function (id) {
        if (id === 'jump') jump(); else if (id === 'dash') tap('c', 'KeyC', 67, 80); else if (id === 'prone') prone(1.2);
        else if (id === 'start') { tap('Enter', 'Enter', 13, 60); }
        else return false; return true;
      }
    };
  })();

  /* ---- Hill Rally ---- */
  DRIVERS.car = (function () {
    var c = function () { return window.__car; }, deadT = 0, said = false;
    function keys() { return c().keys; }
    return {
      ready: function () { return !!(c() && c().S); },
      release: function () { var k = keys(); k.arrowup = k.arrowdown = 0; },
      tick: function (dt) {
        var S = c().S, k = keys(), s = A.strategy;
        if (S.dead) { if (!deadT) { deadT = 1; if (s !== 'idle') giveBack('गाड़ी पलट गई। तुम कंट्रोल लो।'); } return; } deadT = 0;
        if (s === 'advance' || s === 'auto') {
          /* gas; in the air keep the nose level: tilt back (brake) when nose dips, gas when it rises */
          if (S.air) { var a = S.ang; k.arrowup = a < 0.25 ? 1 : 0; k.arrowdown = a > 0.45 ? 1 : 0; } else { k.arrowup = 1; k.arrowdown = 0; }
          if (s === 'auto' && S.fuel < 0.15 && !said) { said = true; say('ईंधन खत्म हो रहा है।'); }
        } else if (s === 'retreat') { k.arrowup = 0; k.arrowdown = 1; }
        else if (s === 'hold') { k.arrowup = 0; k.arrowdown = S.vx > 20 ? 1 : 0; }
        else { k.arrowup = k.arrowdown = 0; }
      },
      order: function (id) { if (id === 'jump') { var k = keys(); k.arrowup = 1; setTimeout(function () { if (A.strategy === 'idle') k.arrowup = 0; }, 500); return true; } if (id === 'start') { if (c().S.dead) tap(' ', 'Space', 32, 60); return true; } return false; }
    };
  })();

  /* ---- Agent GO (grid puzzle): moves by direction, or solves it ---- */
  DRIVERS.iso = (function () {
    var i = function () { return window.__iso; }, plan = null, stepT = 0;
    function neighbors(s) { var out = [], p = s.p, d = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]; d.forEach(function (v) { var to = [p[0] + v[0], p[1] + v[1]]; var n = i().step(s, to); if (n !== s) out.push({ to: to, s: n }); }); return out; }
    function solvePath(s0) { var id = function (s) { return JSON.stringify([s.p, s.g.map(function (g) { return g.i * 2 + (g.dead ? 1 : 0); })]); }; var seen = {}; seen[id(s0)] = 1; var q = [[s0, []]]; var n = 0; while (q.length && n++ < 60000) { var cur = q.shift(), s = cur[0], path = cur[1]; var ns = neighbors(s); for (var k = 0; k < ns.length; k++) { var x = ns[k]; if (x.s.over === 'win') return path.concat([x.to]); if (x.s.over) continue; var key = id(x.s); if (seen[key]) continue; seen[key] = 1; q.push([x.s, path.concat([x.to])]); } } return null; }
    function dirMove(dx, dy) { var S = i().S, to = [S.p[0] + dx, S.p[1] + dy]; var n = i().step(S, to); if (n === S) { say('उधर रास्ता नहीं है।'); return false; } i().move(to); return true; }
    return {
      ready: function () { return !!(i() && i().S); },
      release: function () { plan = null; },
      tick: function (dt) { if (A.strategy !== 'auto') return; var S = i().S; if (S.over) { if (S.over === 'win') { say('निकल गए! मिशन पूरा।'); } else say('पकड़े गए। तुम कंट्रोल लो।'); A.strategy = 'idle'; plan = null; hud(); return; } if (!plan) { plan = solvePath(S); if (!plan) { giveBack('मुझे रास्ता नहीं मिल रहा, तुम कंट्रोल लो।'); return; } say(plan.length + ' चालों में निकलता हूँ।'); } stepT += dt; if (stepT > 0.5 && plan.length) { stepT = 0; i().move(plan.shift()); } },
      order: function (id) { if (id === 'up') return dirMove(0, -1); if (id === 'down') return dirMove(0, 1); if (id === 'left') return dirMove(-1, 0); if (id === 'right') return dirMove(1, 0); if (id === 'advance') return dirMove(1, 0); if (id === 'retreat') return dirMove(-1, 0); if (id === 'start') { i().reset(); plan = null; return true; } if (id === 'auto') { plan = null; return false; } return false; }
    };
  })();

  /* ---- Jetpack Arena ---- */
  DRIVERS.arena = (function () {
    var a = function () { return window.__arena; }, fireT = 0;
    function me() { var s = a().snap; if (!s) return null; for (var k = 0; k < s.p.length; k++) if (s.p[k][0] === a().myId) return s.p[k]; return null; }
    function nearest(m) { var s = a().snap, best = null, bd = 1e9; s.p.forEach(function (p) { if (p[0] === m[0] || p[12] > 0) return; var d = Math.hypot(p[2] - m[2], p[3] - m[3]); if (d < bd) { bd = d; best = p; } }); return best; }
    return {
      ready: function () { return !!(a() && a().mode && a().snap); },
      release: function () { var I = a().inp; I.l = I.r = I.u = I.f = 0; },
      tick: function (dt) { var I = a().inp, m = me(), s = A.strategy; if (!m) return; var e = nearest(m);
        if (s === 'auto') { if (e) { var dx = e[2] - m[2], dy = e[3] - m[3]; I.l = dx < -40 ? 1 : 0; I.r = dx > 40 ? 1 : 0; I.u = (dy < -10 || m[3] > 400) ? 1 : 0; I.a = Math.atan2(dy - 10, dx); fireT += dt; I.f = Math.hypot(dx, dy) < 420 ? 1 : 0; } else { I.l = I.r = I.f = 0; I.u = 0; } }
        else { I.l = s === 'retreat' ? 1 : 0; I.r = s === 'advance' ? 1 : 0; if (A.fire && e) { I.a = Math.atan2(e[3] - m[3] - 10, e[2] - m[2]); I.f = 1; } else I.f = A.burst > 0 ? 1 : 0; if (A.burst > 0) { fireT += dt; if (fireT > 0.1) { fireT = 0; A.burst--; } } if (A.dodge && e && Math.hypot(e[2] - m[2], e[3] - m[3]) < 260) { I.u = 1; I.l = e[2] > m[2] ? 1 : 0; I.r = e[2] <= m[2] ? 1 : 0; } }
      },
      order: function (id) { var I = a().inp; if (id === 'jump') { I.u = 1; setTimeout(function () { I.u = 0; }, 450); return true; } if (id === 'up') { I.u = 1; setTimeout(function () { I.u = 0; }, 700); return true; } return false; }
    };
  })();

  /* ---- Command Fort: the game parses its own commands (GameVoice) ---- */
  DRIVERS.mantra = { ready: function () { return !!window.__mantra; }, release: function () {}, tick: function () {}, order: function () { return false; }, raw: function (text) { return window.GameVoice ? window.GameVoice(text) : false; } };
  DRIVERS.fort = { ready: function () { return !!window.__fort; }, release: function () {}, tick: function () {}, order: function () { return false; }, raw: function (text) { return window.GameVoice ? window.GameVoice(text) : false; } };

  var D = DRIVERS[GAME] || DRIVERS.contra;

  /* ---------- main loop (33 ms, only touches inputs when something changes) ---------- */
  var last = performance.now();
  setInterval(function () { var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; try { if (!D.ready()) return; D.tick(dt); } catch (e) {} }, 33);

  function order(ids, text) {
    if (D.raw && D.raw(text)) { hud(); return true; }
    if (!ids.length) return false;
    ids.forEach(function (id) {
      if (D.order(id)) return;
      if (id === 'auto') { A.strategy = 'auto'; A.fire = true; A.dodge = true; }
      else if (id === 'dodge') { A.dodge = true; A.fire = false; A.burst = 0; if (A.strategy === 'auto') A.strategy = 'hold'; say('ठीक, बच रहा हूँ।'); }
      else if (id === 'fireon') { A.fire = true; }
      else if (id === 'fireoff') { A.fire = false; A.burst = 0; }
      else if (id === 'fire') { A.burst = 4; }
      else if (id === 'advance' || id === 'retreat' || id === 'hold') { A.strategy = id; if (id === 'hold') A.burst = 0; }
      else if (id === 'start') { if (A.strategy === 'idle') A.strategy = 'advance'; }
    });
    hud(); return true;
  }

  /* ---------- optional LLM intent (plug-in point, see doc) ---------- */
  function llmIntent(text) {
    if (!window.INTENT_URL) return Promise.resolve(null);
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 2500);
    return fetch(window.INTENT_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text, game: GAME, orders: ORDERS.map(function (o) { return o.id; }) }), signal: c.signal })
      .then(function (r) { clearTimeout(t); return r.ok ? r.json() : null; }).then(function (j) { return j && Array.isArray(j.intents) ? j.intents : null; }).catch(function () { return null; });
  }

  /* ---------- hands-free listener ---------- */
  var on = false, rec = null, seen = '', speaking = false, restartT = null;
  var realSpeak = window.speechSynthesis && speechSynthesis.speak && speechSynthesis.speak.bind(speechSynthesis);
  if (realSpeak) { try { speechSynthesis.speak = function (u) { speaking = true; var end = u.onend, err = u.onerror; u.onend = function (e) { speaking = false; if (end) end(e); kick(); }; u.onerror = function (e) { speaking = false; if (err) err(e); kick(); }; try { if (rec) rec.abort(); } catch (x) {} return realSpeak(u); }; } catch (e) {} }
  function kick() { if (on && !speaking) { clearTimeout(restartT); restartT = setTimeout(startRec, 150); } }
  function handle(t, isFinal) {
    var fresh = t.length > seen.length && t.indexOf(seen) === 0 ? t.slice(seen.length) : t; seen = isFinal ? '' : t;
    var ids = parse(fresh);
    if ((D.raw && D.raw(fresh)) || ids.length) { if (ids.length) order(ids, fresh); flash('⌨ ' + fresh.trim()); }
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
  css.textContent = '.ag-btn.solo{position:fixed;left:12px;top:calc(50% - 100px);z-index:9001;border:0;border-radius:14px;background:#1e293b;color:#f8fafc;font:800 12px system-ui,"Noto Sans Devanagari",sans-serif;padding:8px 12px;cursor:pointer}' +
    '.ag-hud{position:fixed;left:50%;top:calc(max(6px,env(safe-area-inset-top)) + 58px);transform:translateX(-50%);z-index:9001;background:rgba(15,23,42,.9);color:#fff;border-radius:12px;padding:6px 14px;font:700 13px system-ui,"Noto Sans Devanagari",sans-serif;display:none;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}.ag-hud.on{display:block}.ag-hud b{color:#fbbf24}' +
    '.ag-fl{position:fixed;left:50%;top:calc(max(6px,env(safe-area-inset-top)) + 118px);transform:translateX(-50%);z-index:9001;background:#fbbf24;color:#0f172a;border-radius:10px;padding:5px 12px;font:800 13px system-ui,"Noto Sans Devanagari",sans-serif;display:none;max-width:90vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ag-fl.on{display:block}';
  document.head.appendChild(css);
  var btn = document.createElement('button'); btn.className = 'tk-btn ag-btn'; btn.setAttribute('aria-label', 'वॉइस कंट्रोल चालू/बंद'); btn.innerHTML = '<i>🎧</i><span>कंट्रोल</span>';
  var hudEl = document.createElement('div'); hudEl.className = 'ag-hud';
  var fl = document.createElement('div'); fl.className = 'ag-fl'; var flT = null;
  function flash(t) { fl.textContent = t; fl.classList.add('on'); clearTimeout(flT); flT = setTimeout(function () { fl.classList.remove('on'); }, 1400); }
  function hud() { hudEl.innerHTML = ''; var a = document.createElement('span'); a.textContent = (on ? '🎧 ' : '') + 'एजेंट: '; var b = document.createElement('b'); var tags = [NAMES[A.strategy] || A.strategy]; if (A.dodge && A.strategy !== 'auto') tags.push('बच रहा'); if (A.fire && A.strategy !== 'auto') tags.push('मार रहा'); b.textContent = tags.join(' · '); hudEl.appendChild(a); hudEl.appendChild(b); hudEl.classList.toggle('on', on || A.strategy !== 'idle' || A.dodge || A.fire); document.body.classList.toggle('ag-on', hudEl.classList.contains('on')); btn.children[1].textContent = on ? 'सुन रहा' : 'कंट्रोल'; }
  var HELP = { contra: 'आगे बढ़ो · कूदो · मारो · गोली से बचो · रुको · अपने आप खेलो', car: 'आगे बढ़ो (गैस) · रुको (ब्रेक) · अपने आप खेलो', iso: 'ऊपर/नीचे/बाएँ/दाएँ · अपने आप खेलो', arena: 'आगे/पीछे · उड़ो · मारो · बचो · अपने आप खेलो', fort: 'तीन सैनिक ऊपर · तीरंदाज़ भेजो · टावर बनाओ · हमला', mantra: 'असुर पर लिखा मंत्र बोलो · ढाल · शांति · जीवन' };
  btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  btn.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
  btn.addEventListener('click', function (e) { e.stopPropagation(); on = !on; btn.classList.toggle('on', on); if (on) { if (!SR) { flash('यहाँ बोलकर खेलना संभव नहीं (Chrome में खोलो)'); on = false; btn.classList.remove('on'); hud(); return; } startRec(); flash('बोलो: ' + (HELP[GAME] || HELP.contra)); if (window.Talk && Talk.setEnabled && Talk.enabled && !Talk.userSet) { Talk.setEnabled(false, true); setTimeout(function () { flash('किरदार चुप — 🗣 बटन से चालू करो'); }, 1500); } } else { stopRec(); A.strategy = 'idle'; A.fire = false; A.dodge = false; try { D.release(); } catch (x) {} } hud(); });
  function mount() { var more = document.querySelector('.tk-dock .tk-more'); if (more) { more.insertBefore(btn, more.firstChild); } else { btn.classList.add('solo'); document.body.appendChild(btn); } document.body.appendChild(hudEl); document.body.appendChild(fl); hud(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  function listen(v) { if (v === on) return; btn.click(); }
  window.Agent = { listen: listen, order: function (t) { return order(parse(t), t); }, parse: parse, state: A, get strategy() { return A.strategy; }, set strategy(s) { A.strategy = s; hud(); }, get listening() { return on; }, handle: handle, game: GAME };
})();
