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
    { id: 'teachend', re: /सिखाना (खत्म|ख़त्म|बंद|पूरा)|बस इतना|स्किल याद|याद रखो|skill done|stop teaching/ },
    { id: 'teachstart', re: /सिखाना शुरू|सिखाओ|सिखाता हूँ|सिखाती हूँ|नई स्किल|स्किल सिखा|\bteach\b|सीखो/ },
    { id: 'skills', re: /स्किल दिखा|स्किल्स|तुम्हें क्या आता|क्या क्या आता|what can you do|\bskills\b|स्किल बता/ },
    { id: 'report', re: /क्या दिख|क्या है सामने|आगे क्या|रिपोर्ट|\bstatus\b|\breport\b|कितने दुश्मन|बताओ क्या|क्या हाल/ },
    { id: 'gunmenu', re: /बंदूक बदल|गन बदल|हथियार बदल|हथियार दिखा|बंदूक दिखा|\bchange (the )?(gun|weapon)\b|\bweapons?\b|दूसरी बंदूक|कौन सी बंदूक/ },
    { id: 'gunnext', re: /अगली बंदूक|अगला हथियार|next (gun|weapon)|बंदूक आगे/ },
    { id: 'takeall', re: /कंट्रोल (लो|तुम|ले लो|संभालो|सँभालो)|सब तुम|तुम संभालो|तुम सँभालो|manage the control|take (the )?control|पूरा तुम/ },
    { id: 'giveall', re: /कंट्रोल (मुझे|मेरा|दो|दे दो)|मैं संभालता|मैं सँभालता|मैं संभालूँ|हाथ हटाओ|\brelease\b|मुझे खेलने दो|छोड़ दो/ },
    { id: 'justfire', re: /बस गोली|सिर्फ़ गोली|सिर्फ गोली|गोली तुम|तुम मारो|तुम गोली|शूटिंग तुम|(only|just) (shoot|fire)|you shoot|तुम शूट/ },
    { id: 'ifire', re: /गोली मैं|मैं मारूँगा|मैं मारूंगा|मैं मारता|शूटिंग मेरी|मैं गोली|मैं शूट|i('ll| will)? shoot/ },
    { id: 'youmove', re: /तुम चलो|चाल तुम|मूवमेंट तुम|तुम बढ़ो|चलना तुम|you (move|walk|run)/ },
    { id: 'imove', re: /मैं चलता|मैं चलूँ|मैं चलूं|चाल मेरी|मैं चलाता|मैं चलाऊँ|चलना मेरा|i('ll| will)? (move|walk)|मैं खुद चल/ },
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
    { id: 'hunt', re: /निशाना|नीशाना|\baim\b|\btarget\b|(?:टैंक|टैक|टाइम|\btank\b|टावर|तोप|turret|cannon|हेलीकॉप्टर|हेलिकॉप्टर|chopper|helicopter|सिपाही|सैनिक|soldier|बॉस|\bboss\b)(?=.*(मार|गोली|उड़ा|खत्म|ख़त्म|shoot|kill|fire|पर|पे))/ },
    { id: 'cross', re: /पार कर|पार हो|क्रॉस|क्रास|\bcross\b|गड्ढा|गड्ढे|गड्डा|खाई|पानी के ऊपर|\bjump over\b|उस पार|छलांग लगा/ },
    { id: 'start', re: /शुरू|स्टार्ट|फिर से|दोबारा|\bstart\b|\bagain\b|\brestart\b/ }
  ];
  function parse(t) { var l = String(t).toLowerCase(), out = []; for (var k in learned) { if (l.indexOf(k) >= 0 && learned[k] && learned[k].length) out = out.concat(learned[k]); } ORDERS.forEach(function (o) { if (o.re.test(l)) out.push(o.id); }); if (out.indexOf('fireon') >= 0 || out.indexOf('fireoff') >= 0) out = out.filter(function (x) { return x !== 'fire'; }); if (out.indexOf('dodge') >= 0) out = out.filter(function (x) { return x !== 'fire'; }); if (out.indexOf('cross') >= 0) out = out.filter(function (x) { return x !== 'jump' && x !== 'advance'; }); if (out.indexOf('hunt') >= 0) out = out.filter(function (x) { return x !== 'fire' && x !== 'fireon' && x !== 'advance' && x !== 'hold'; });
    ['teachend', 'teachstart', 'skills', 'report', 'gunmenu', 'gunnext', 'takeall', 'giveall', 'justfire', 'ifire', 'youmove', 'imove'].forEach(function (k) { if (out.indexOf(k) >= 0) out = [k]; });
    return out; }

  /* ---------- key helpers ---------- */
  function kev(type, key, code, kc) { return new KeyboardEvent(type, { key: key, code: code, keyCode: kc, which: kc, bubbles: true, cancelable: true }); }
  function tap(key, code, kc, ms) { window.dispatchEvent(kev('keydown', key, code, kc)); setTimeout(function () { window.dispatchEvent(kev('keyup', key, code, kc)); }, ms || 60); }

  /* ---------- shared agent state ---------- */
  var A = { strategy: 'idle', fire: false, dodge: false, burst: 0, fails: 0, t: 0, defend: true, roles: { move: true, fire: true, dodge: true }, target: '', skills: {}, teaching: null, pendingName: false };
  /* memory: words the player taught us ("<unknown phrase>" followed by a known order within 6 s) */
  var learned = {}; try { learned = JSON.parse(localStorage.getItem('agent_learned_' + GAME) || '{}') || {}; } catch (e) {}
  var pendingUnknown = null;
  function learn(phrase, ids) { phrase = String(phrase).toLowerCase().trim(); if (!phrase || phrase.length < 2 || phrase.length > 40) return; learned[phrase] = ids; try { localStorage.setItem('agent_learned_' + GAME, JSON.stringify(learned)); } catch (e) {} }
  /* the commando answers every order in his own voice */
  var LINES = { advance: ['जी मालिक, आगे बढ़ता हूँ!', 'आगे चलो!', 'बढ़ रहा हूँ, मालिक।'], takeall: ['ठीक मालिक, पूरा मोर्चा मेरा।', 'कंट्रोल मेरे पास, आराम से बैठो।'], giveall: ['जी, कंट्रोल तुम्हारा। मैं साथ हूँ।'], justfire: ['तुम चलो, गोली मैं चलाऊँगा।'], ifire: ['ठीक, गोली तुम्हारी।'], youmove: ['चाल मेरी, मालिक।'], imove: ['ठीक, तुम चलाओ। मैं निशाना रखूँगा।'], gunnext: ['अगली बंदूक!'], teachstart: ['सिखाओ मालिक, मैं देख रहा हूँ।'], teachend: ['याद हो गया।'], report: [], skills: [], retreat: ['पीछे हटता हूँ, मालिक।'], hold: ['रुक गया, मालिक।', 'मोर्चा संभाला।'], dodge: ['बचता हूँ!', 'सिर नीचे!'], fire: ['फायर!'], fireon: ['गोली चलाता रहूँगा!'], fireoff: ['गोली बंद, मालिक।'], jump: ['हुप!'], dash: ['भागो!'], prone: ['लेट गया।'], cross: ['गड्ढा पार करता हूँ, मालिक!'], hunt: ['निशाना लग गया!'], auto: ['मैं संभालता हूँ, मालिक!'], start: ['तैयार, मालिक!'], up: ['ऊपर!'], down: ['नीचे!'], left: ['बाएँ!'], right: ['दाएँ!'], unknown: ['समझा नहीं मालिक, फिर बोलो?', 'क्या करूँ मालिक?'], learned: ['समझ गया मालिक!'] };
  var SOLDIER = { contra: true };
  function soldierSay(id) { if (!SOLDIER[GAME]) return; var L = LINES[id]; if (!L) return; var t = L[Math.floor(Math.random() * L.length)]; flash('🪖 ' + t); try { if (window.Talk && Talk.voiceOn === false) return; var u = new SpeechSynthesisUtterance(t); u.lang = 'hi-IN'; u.pitch = 0.7; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
  var NAMES = { idle: 'खड़ा', advance: 'आगे बढ़ रहा', retreat: 'पीछे हट रहा', hold: 'रुका', auto: 'अपने आप खेल रहा', dodge: 'बच रहा', cross: 'गड्ढा पार कर रहा', hunt: 'निशाना लगा रहा' };
  function giveBack(why) { A.strategy = 'idle'; A.fire = false; A.dodge = false; A.burst = 0; if (D.release) D.release(); say(why || 'नहीं हो रहा, तुम संभालो।'); hud(); }

  /* ================= drivers ================= */
  var DRIVERS = {};

  /* ---- Jungle Commando ---- */
  DRIVERS.contra = (function () {
    var g = function () { return window.__game; }, lastX = 0, stuckT = 0, fireT = 0, lastJump = 0, proneT = 0, lastLives = null, dodgeHits = 0, move = 0, lastLivesCross = null;
    function setMove(dir) { if (!A.roles.move) { move = 0; return; } var k = g().keys; if (move !== dir) { k.left = dir < 0; k.right = dir > 0; move = dir; } }
    function jump() { if (!A.roles.move && !A.roles.dodge) return; if (Date.now() - lastJump < 260) return; lastJump = Date.now(); tap('z', 'KeyZ', 90, 90); }
    function fire() { if (!A.roles.fire) return; tap('x', 'KeyX', 88, 70); }
    function prone(ms) { if (!A.roles.move && !A.roles.dodge) return; var k = g().keys; k.down = true; proneT = ms; }
    function enemiesNear(p, dir, range) { return (g().enemies || []).filter(function (e) { if (e.dead || e.hp <= 0) return false; var dx = e.x - p.x; if (Math.abs(dx) > range || Math.abs((e.y || 0) - p.y) > 90) return false; return dir === 0 || dx * dir > 0; }); }
    /* threat = enemy bullet that will cross the player's body within ~0.5 s */
    function threats(p) { var B = g().eBullets || [], out = []; for (var i = 0; i < B.length; i++) { var b = B[i]; if (b.dead) continue; var dx = p.x - b.x; if (!b.vx || dx * b.vx <= 0) continue; var t = dx / b.vx; if (t < 0 || t > 0.6) continue; var yAt = b.y + (b.vy || 0) * t; var top = p.y - 28, bot = p.y + 2; if (yAt < top - 6 || yAt > bot + 6) continue; out.push({ b: b, t: t, yAt: yAt, high: yAt < p.y - 12 }); } out.sort(function (u, v) { return u.t - v.t; }); return out; }
    var wantJump = false;
    return {
      ready: function () { var G = g(); return G && G.G && G.G.state === 'play' && G.player && !G.player.dead; },
      release: function () { var G = g(); if (!G) return; var k = G.keys; k.left = false; k.right = false; move = 0; G.keys.down = false; G.aim = null; },
      tick: function (dt) {
        var G = g(), p = G.player, s = A.strategy;
        var huntDir = 0;
        if (s === 'hunt' && A.hunt) { var Hn = A.hunt; Hn.t += dt; if (!Hn.e || Hn.e.dead || Hn.e.hp <= 0) { Hn.e = null; var bd = 1e9; (G.enemies || []).forEach(function (e) { if (e.dead || e.hp <= 0) return; var ok = Hn.type.indexOf(e.t) >= 0 || (Hn.type[0] === 'boss' && e.boss); if (!ok) return; var d = Math.abs(e.x - p.x); if (d < bd) { bd = d; Hn.e = e; } }); if (!Hn.e) { if (Hn.t > 1.5) { G.aim = null; A.hunt = null; say(Hn.killed ? 'ख़त्म!' : 'दिखा नहीं।'); A.strategy = 'hold'; hud(); return; } } else if (Hn.t > 1.5 && !Hn.killed) Hn.killed = false; }
          if (Hn.e) { var ex = Hn.e.x, ey = Hn.e.y - (Hn.e.h || 20) / 2, ddx = ex - p.x, ddy = ey - (p.y - 14), dist = Math.abs(ddx);
            huntDir = dist > 230 ? Math.sign(ddx) : 0; if (p.dir !== Math.sign(ddx) && dist <= 230) { setMove(Math.sign(ddx)); A.t = 0.04; }
            if (A.roles.fire) G.aim = Math.atan2(ddy, ddx);
            if (dist <= 300 && Math.abs(ddy) < 140) { fireT += dt; if (fireT > 0.13) { fire(); fireT = 0; } }
            if (ey < p.y - 40 && dist < 60 && p.onGround) jump();
            Hn.killed = true; } }
        else if (G.aim != null && !defTgt) G.aim = null;
        var dir = s === 'advance' || s === 'auto' || (s === 'cross' && A.cross && A.cross.phase === 'run') ? 1 : s === 'retreat' ? -1 : s === 'hunt' ? huntDir : 0;
        /* auto-defence: while advancing / crossing / holding, shoot the nearest enemy in front (aimed, incl. ledges) unless told गोली बंद */
        var defTgt = null;
        if (A.defend && s !== 'hunt' && s !== 'auto' && (dir !== 0 || s === 'hold' || s === 'cross' || A.dodge)) { var bdd = 270; (G.enemies || []).forEach(function (e) { if (e.dead || e.hp <= 0 || e.t === 'cap' || e.t === 'core') return; var ddx = e.x - p.x; if (dir !== 0 && ddx * dir < 0) return; if (s === 'cross' && ddx < 0) return; var d = Math.abs(ddx); if (d < bdd && Math.abs(e.y - p.y) < 130) { bdd = d; defTgt = e; } });
          if (defTgt && A.roles.fire) { G.aim = Math.atan2((defTgt.y - (defTgt.h || 20) / 2) - (p.y - 14), defTgt.x - p.x); if (dir === 0 && p.dir !== Math.sign(defTgt.x - p.x)) { setMove(Math.sign(defTgt.x - p.x)); A.t = 0.04; } if (!(s === 'cross' && nearEdge && A.cross && A.cross.phase === 'run')) { fireT += dt; if (fireT > 0.15) { fire(); fireT = 0; } } } else if (s !== 'hunt' && G.aim != null) G.aim = null; }
        var SF = G.surfaces || [], on = null; for (var i = 0; i < SF.length; i++) { var sf = SF[i]; if (p.x >= sf.x1 - 2 && p.x <= sf.x2 + 2 && Math.abs(sf.y - p.y) < 2) { on = sf; break; } }
        var toEdge = on ? (dir >= 0 ? on.x2 - p.x : p.x - on.x1) : 999, nearEdge = toEdge < 60;
        if (proneT > 0) { proneT -= dt; if (proneT <= 0 || nearEdge) { G.keys.down = false; proneT = 0; } }
        /* dodge first: it overrides everything else this tick (but never by stopping in mid-air) */
        if (s === 'cross' && lastLivesCross !== null && G.G.lives < lastLivesCross) { A.cross = null; giveBack('नहीं हुआ, तुम संभालो।'); lastLivesCross = G.G.lives; return; } lastLivesCross = G.G.lives;
        if ((A.dodge || s === 'auto') && !(s === 'cross' && nearEdge && A.cross && A.cross.phase === 'run')) { var ths = threats(p); if (ths.length) { var first = ths[0], allHigh = ths.every(function (h) { return h.high; });
            if (p.onGround) { if (allHigh && dir === 0 && !nearEdge) { if (first.t < 0.4) prone(0.3); } else { G.keys.down = false; proneT = 0; wantJump = true; } A.t = 0.2; }
            else if (p.jumpsLeft > 0 && first.t < 0.25 && !first.high && p.vy > 0) { lastJump = 0; jump(); } }
          /* ensure-jump loop: the game drops a jump that lands on a prone frame, so keep asking until we leave the ground */
          if (wantJump) { if (!p.onGround) wantJump = false; else if (!G.keys.down && !p.prone && Date.now() - lastJump > 120) { lastJump = Date.now(); tap('z', 'KeyZ', 90, 90); } }
          if (lastLives !== null && G.G.lives < lastLives && A.dodge) { dodgeHits++; if (dodgeHits >= 2 && s === 'hold') { dodgeHits = 0; giveBack('नहीं हो रहा, तुम संभालो।'); lastLives = G.G.lives; return; } else say('आउच!'); } lastLives = G.G.lives; }
        if (A.t > 0) { A.t -= dt; if (p.onGround && A.t > 0.2) A.t = 0.2; } else setMove(dir);
        if (s === 'cross' && A.cross) { var C = A.cross; C.t += dt; if (C.x0 === null && on) { C.x0 = p.x; C.s0 = on; }
          if (C.phase === 'clear') { C.ct += dt; var shooters = (G.enemies || []).filter(function (e) { return !e.dead && e.hp > 0 && e.x > p.x && e.x - p.x < 230 && Math.abs(e.y - p.y) < 130 && e.t !== 'cap' && e.t !== 'core'; }).length; if (!shooters || C.ct > 2.5) { C.phase = 'run'; if (window.Pet && Pet.bark) try { Pet.bark(); } catch (x) {} } }
          if (C.s0 && on && on !== C.s0 && p.onGround && p.x > C.x0 + 20) { A.strategy = 'hold'; setMove(0); A.cross = null; say('हो गया!'); hud(); return; }
          if (C.t > 8) { A.cross = null; giveBack('नहीं हो रहा, तुम संभालो।'); return; } }
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

  function rawHook(t) { try { if (extraHook(t)) return true; if (D.raw) return !!D.raw(t); return !!(window.GameVoice && window.GameVoice(t)); } catch (e) { return false; } }
  /* ===== commando extras: weapons, roles, report, skills ===== */
  var TEACHABLE = ['advance', 'retreat', 'hold', 'jump', 'dash', 'prone', 'fire', 'fireon', 'fireoff', 'dodge', 'cross', 'hunt', 'up', 'down', 'left', 'right'];
  var SKILLS_DB = {}; try { SKILLS_DB = JSON.parse(localStorage.getItem('agent_skills_' + GAME) || '{}') || {}; } catch (e) {}
  var USES = {}; try { USES = JSON.parse(localStorage.getItem('agent_uses_' + GAME) || '{}') || {}; } catch (e) {}
  var SKILL_HI = { advance: 'आगे बढ़ना', retreat: 'पीछे हटना', hold: 'मोर्चा', jump: 'कूदना', dash: 'डैश', prone: 'लेटना', fire: 'गोली', dodge: 'गोली से बचना', cross: 'गड्ढा पार', hunt: 'निशाना', auto: 'अकेले खेलना', gunmenu: 'हथियार बदलना' };
  function bumpSkill(id) { if (!SKILL_HI[id]) return; USES[id] = (USES[id] || 0) + 1; try { localStorage.setItem('agent_uses_' + GAME, JSON.stringify(USES)); } catch (e) {} }
  function level(id) { return Math.min(9, 1 + Math.floor((USES[id] || 0) / 4)); }
  function saveSkills() { try { localStorage.setItem('agent_skills_' + GAME, JSON.stringify(SKILLS_DB)); } catch (e) {} }
  function nameFrom(t) { var m = String(t).match(/नाम\s+(?:है\s+|रखो\s+|रख\s+|दो\s+)?([^,.।]+?)(?:\s+(?:रखो|रख दो|है|रहेगा|करो))?\s*$/) || String(t).match(/\bname\s+(?:it\s+)?([^,.]+)$/i); return m ? m[1].trim().replace(/^(इसका|इसे|skill|स्किल)\s+/, '').trim() : ''; }
  function finishTeaching(nm) { var st = A.teaching ? A.teaching.steps : []; A.teaching = null; A.pendingName = false; if (!st.length) { say('कुछ सिखाया ही नहीं, मालिक।'); return; } var seq = [], t0 = st[0].at; st.forEach(function (x, i) { seq.push({ id: x.id, text: x.text, delay: i === 0 ? 0 : Math.min(1500, x.at - st[i - 1].at) }); }); SKILLS_DB[nm.toLowerCase()] = seq; saveSkills(); say('सीख गया: "' + nm + '" = ' + seq.map(function (x) { return SKILL_HI[x.id] || x.id; }).join(', ')); hud(); }
  function runSkill(nm) { var seq = SKILLS_DB[nm]; if (!seq) return false; var t = 0; seq.forEach(function (x) { t += x.delay; setTimeout(function () { order([x.id], x.text); }, t); }); say('"' + nm + '" कर रहा हूँ!'); return true; }
  var GUN_ALIAS = { N: ['राइफल', 'rifle'], S: ['स्प्रेड', 'spread'], M: ['मशीन', 'machine', 'एम गन', 'एमजी'], L: ['लेज़र', 'लेजर', 'laser'], F: ['फ्लेम', 'आग वाली', 'flame', 'फ्लेमथ्रोअर'], K: ['शॉटगन', 'शोटगन', 'shotgun'], R: ['रॉकेट', 'राकेट', 'rocket'], G: ['मोर्टार', 'mortar'], H: ['ग्रेनेड', 'grenade', 'बम'], MB: ['बस्टर', 'buster', 'मेगा', 'mega'], MT: ['ब्लेड', 'blade', 'आरी'] };
  var gunMenuUntil = 0, menuEl = null;
  function gunList() { var W = window.__game; if (!W || !W.WEAPONS) return []; var set = (W.curSet && W.curSet.length ? W.curSet : Object.keys(W.WEAPONS)); return set.map(function (k) { return { k: k, name: W.WEAPONS[k] ? W.WEAPONS[k].name : k }; }); }
  function findGun(t) { var l = String(t).toLowerCase(), W = window.__game; if (!W || !W.WEAPONS) return null; var keys = Object.keys(W.WEAPONS), hit = null; keys.forEach(function (k) { var names = (GUN_ALIAS[k] || []).concat([String(W.WEAPONS[k].name || '').toLowerCase()]); if (names.some(function (n) { return n && l.indexOf(n) >= 0; })) hit = hit || k; }); var m = l.match(/(?:बंदूक|गन|हथियार|gun|weapon|नंबर)\s*(\d)/) || l.match(/^\s*(\d)\s*$/); if (!hit && m) { var list = gunList(); var i = parseInt(m[1], 10) - 1; if (list[i]) hit = list[i].k; } return hit; }
  function showGuns() { var list = gunList(); if (!list.length) return; gunMenuUntil = Date.now() + 8000; if (!menuEl) { menuEl = document.createElement('div'); menuEl.className = 'ag-menu'; document.body.appendChild(menuEl); } menuEl.innerHTML = ''; var h = document.createElement('div'); h.textContent = 'कौन-सी बंदूक? नाम बोलो'; h.style.cssText = 'font-weight:800;color:#fbbf24;margin-bottom:4px'; menuEl.appendChild(h); list.forEach(function (gn, i) { var d = document.createElement('div'); d.textContent = (i + 1) + '. ' + gn.name + (GUN_ALIAS[gn.k] ? ' · ' + GUN_ALIAS[gn.k][0] : ''); if (window.__game.player && window.__game.player.gun === gn.k) d.style.color = '#4ade80'; menuEl.appendChild(d); }); menuEl.classList.add('on'); setTimeout(function () { if (Date.now() >= gunMenuUntil) menuEl.classList.remove('on'); }, 8100); say('कौन-सी बंदूक, मालिक? ' + list.slice(0, 4).map(function (x) { return GUN_ALIAS[x.k] ? GUN_ALIAS[x.k][0] : x.name; }).join(', ') + '…'); }
  function extraHook(t) {
    var l = String(t).toLowerCase().trim(); if (!l) return false;
    if (A.pendingName) { var nm = nameFrom(l) || l.replace(/^(नाम|इसका नाम|name)\s*/, '').trim(); if (nm) { finishTeaching(nm); return true; } }
    for (var k in SKILLS_DB) { if (l.indexOf(k) >= 0) { return runSkill(k); } }
    var g = findGun(l); if (g && (Date.now() < gunMenuUntil || /बंदूक|गन|हथियार|gun|weapon|लो|दो|चुनो|लगाओ|निकालो|दे/.test(l))) { var W = window.__game; if (W && W.setGun && W.setGun(g)) { gunMenuUntil = 0; if (menuEl) menuEl.classList.remove('on'); var name = W.WEAPONS[g].name; say((GUN_ALIAS[g] ? GUN_ALIAS[g][0] : name) + ' लोड, मालिक!'); flash('🔫 ' + name); bumpSkill('gunmenu'); hud(); return true; } }
    return false;
  }
  function describe() { var W = window.__game; if (!W || !W.player) return 'अभी खेल शुरू नहीं हुआ, मालिक।'; var p = W.player, ahead = {}, n = 0; (W.enemies || []).forEach(function (e) { if (e.dead || e.hp <= 0 || e.t === 'cap' || e.t === 'core') return; var dx = e.x - p.x; if (dx > -40 && dx < 420) { var nm = { rifle: 'सिपाही', runner: 'दौड़ता सिपाही', turret: 'टावर', cannon: 'तोप', tank: 'टैंक', chopper: 'हेलीकॉप्टर', head: 'बॉस', boss: 'बॉस' }[e.t] || e.t; ahead[nm] = (ahead[nm] || 0) + 1; n++; } }); var parts = []; for (var k in ahead) parts.push(ahead[k] + ' ' + k); var SF = W.surfaces || [], on = null; for (var i = 0; i < SF.length; i++) { var sf = SF[i]; if (p.x >= sf.x1 - 2 && p.x <= sf.x2 + 2 && Math.abs(sf.y - p.y) < 2) { on = sf; break; } } var gap = on ? Math.round(on.x2 - p.x) : -1; var txt = (n ? 'सामने ' + parts.join(', ') + '।' : 'सामने कोई दुश्मन नहीं।') + (gap >= 0 && gap < 160 ? ' ' + gap + ' कदम पर गड्ढा।' : '') + ' जान ' + (W.G.lives === Infinity ? 'अनगिनत' : W.G.lives) + '। हुक्म?'; return txt; }
  function report() { var t = describe(); say(t); flash('🪖 ' + t); }
  function showSkills() { var built = ['advance', 'jump', 'dodge', 'cross', 'hunt', 'fire', 'gunmenu', 'auto'].map(function (id) { return SKILL_HI[id] + ' Lv' + level(id); }); var custom = Object.keys(SKILLS_DB); var t = 'मुझे आता है: ' + built.join(', ') + (custom.length ? '। सिखाई हुई: ' + custom.join(', ') : '') + '।'; say(t); flash('🧠 ' + t); }
  var QUIPS = { kill3: ['तीन गिरे, मालिक। चाय का समय?', 'हैट्रिक! अब बोनस दो।'], death: ['उफ़, ये ज़ोर की लगी। फिर से!', 'मालिक, थोड़ा और ध्यान… मेरा नहीं, तुम्हारा।'], idle: ['मालिक, मैं यहीं खड़ा हूँ। कुछ करूँ?', 'हुक्म दो मालिक, मच्छर काट रहे हैं।'] };
  function quip(k) { var L = QUIPS[k]; if (!L || Math.random() < 0.4) return; var t = L[Math.floor(Math.random() * L.length)]; flash('🪖 ' + t); try { if (window.Talk && Talk.voiceOn === false) return; var u = new SpeechSynthesisUtterance(t); u.lang = 'hi-IN'; u.pitch = 0.7; speechSynthesis.speak(u); } catch (e) {} }
  var lastScoreQ = 0, streak = 0, lastLivesQ = null, idleT = 0;
  setInterval(function () { var W = window.__game; if (!W || !W.G || !on) return; if (W.G.state !== 'play') return; if (W.G.score > lastScoreQ) { streak++; if (streak === 3) { quip('kill3'); streak = 0; } } lastScoreQ = W.G.score; if (lastLivesQ !== null && W.G.lives < lastLivesQ) { quip('death'); streak = 0; } lastLivesQ = W.G.lives; idleT = (A.strategy === 'idle' && !A.fire) ? idleT + 1 : 0; if (idleT === 25) { quip('idle'); idleT = -60; } }, 1000);
  /* the player touching the movement side of the screen takes the wheel back */
  document.addEventListener('pointerdown', function (e) { if (!on || !A.roles.move) return; if (e.target && e.target.closest && e.target.closest('.tk-dock,.ag-hud,.ag-fl,.ag-menu,button,a')) return; if (e.clientX < innerWidth * 0.5 && ['advance', 'retreat', 'cross', 'auto', 'hunt'].indexOf(A.strategy) >= 0) { A.roles.move = false; try { D.release(); } catch (x) {} say('ठीक, चाल तुम्हारी।'); hud(); } }, true);
  function huntType(t) { t = String(t).toLowerCase(); if (/टैंक|टैक|टाइम|\btank\b/.test(t)) return ['tank']; if (/टावर|तोप|turret|cannon|मशीन/.test(t)) return ['turret', 'cannon']; if (/हेलीकॉप्टर|हेलिकॉप्टर|chopper|helicopter|हेली/.test(t)) return ['chopper']; if (/सिपाही|सैनिक|soldier|आदमी|दुश्मन/.test(t)) return ['rifle', 'runner']; if (/बॉस|\bboss\b/.test(t)) return ['boss']; return null; }
  function order(ids, text) {
    if (rawHook(text)) { hud(); return true; }
    if (!ids.length) return false;
    if (pendingUnknown && Date.now() - pendingUnknown.t < 6000) { learn(pendingUnknown.text, ids.slice()); soldierSay('learned'); } pendingUnknown = null;
    var first = ids.filter(function (x) { return LINES[x]; })[0]; if (first) setTimeout(function () { soldierSay(first); }, 60);
    ids.forEach(function (x) { if (A.teaching && TEACHABLE.indexOf(x) >= 0) A.teaching.steps.push({ id: x, text: text, at: Date.now() }); bumpSkill(x); });
    ids.forEach(function (id) {
      if (D.order(id)) return;
      if (id === 'auto') { A.strategy = 'auto'; A.fire = true; A.dodge = true; }
      else if (id === 'dodge') { A.dodge = true; A.fire = false; A.burst = 0; if (A.strategy === 'auto') A.strategy = 'hold'; say('ठीक!'); }
      else if (id === 'fireon') { A.fire = true; A.defend = true; }
      else if (id === 'fireoff') { A.fire = false; A.burst = 0; A.defend = false; }
      else if (id === 'fire') { A.burst = 4; }
      else if (id === 'advance' || id === 'retreat' || id === 'hold') { A.strategy = id; if (id === 'hold') A.burst = 0; }
      else if (id === 'takeall') { A.roles.move = A.roles.fire = A.roles.dodge = true; A.strategy = 'auto'; A.fire = true; A.dodge = true; }
      else if (id === 'giveall') { A.roles.move = false; A.roles.fire = false; A.strategy = 'idle'; A.fire = false; A.burst = 0; try { D.release(); } catch (x) {} }
      else if (id === 'justfire') { A.roles.fire = true; A.roles.move = false; A.fire = true; A.defend = true; if (A.strategy === 'idle') A.strategy = 'hold'; try { D.release(); } catch (x) {} }
      else if (id === 'ifire') { A.roles.fire = false; A.fire = false; A.burst = 0; A.defend = false; if (window.__game) window.__game.aim = null; }
      else if (id === 'youmove') { A.roles.move = true; A.strategy = 'advance'; }
      else if (id === 'imove') { A.roles.move = false; try { D.release(); } catch (x) {} }
      else if (id === 'gunmenu') { showGuns(); }
      else if (id === 'gunnext') { tap('q', 'KeyQ', 81, 60); setTimeout(function () { soldierSay('gunnext'); }, 300); }
      else if (id === 'report') { report(); }
      else if (id === 'skills') { showSkills(); }
      else if (id === 'teachstart') { A.teaching = { steps: [], t: Date.now() }; }
      else if (id === 'teachend') { var nm = nameFrom(text); if (A.teaching) { if (nm) finishTeaching(nm); else { A.pendingName = true; say('इस स्किल का नाम क्या रखूँ?'); } } }
      else if (id === 'hunt') { var ty = huntType(text); A.hunt = { type: ty, t: 0, e: null }; A.strategy = 'hunt'; say(ty ? 'जी!' : 'किस पर?'); if (!ty) A.strategy = 'hold'; }
      else if (id === 'cross') { A.strategy = 'cross'; A.cross = { x0: null, t: 0, phase: 'clear', ct: 0 }; say('जी!'); }
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
  if (realSpeak) { try { speechSynthesis.speak = function (u) { speaking = true; spokenWords = String(u.text || '').toLowerCase().replace(/[।,.!?…]/g, ' ').split(/\s+/).filter(Boolean); spokenEnd = Date.now() + 8000; var end = u.onend, err = u.onerror; u.onend = function (e) { speaking = false; spokenEnd = Date.now(); if (end) end(e); kick(); }; u.onerror = function (e) { speaking = false; spokenEnd = Date.now(); if (err) err(e); kick(); }; try { if (rec) rec.abort(); } catch (x) {} return realSpeak(u); }; } catch (e) {} }
  function kick() { if (on && !speaking) { clearTimeout(restartT); restartT = setTimeout(startRec, 150); } }
  var spokenWords = [], spokenEnd = 0;
  function isEcho(t) { if (!spokenWords.length || Date.now() - spokenEnd > 2500) return false; var w = String(t).toLowerCase().split(/\s+/).filter(Boolean); if (!w.length) return false; var hit = w.filter(function (x) { return spokenWords.indexOf(x) >= 0; }).length; return hit >= Math.max(1, Math.ceil(w.length * 0.5)); }
  function handle(t, isFinal) {
    if (isEcho(t)) { seen = isFinal ? '' : t; return; }
    var fresh = t.length > seen.length && t.indexOf(seen) === 0 ? t.slice(seen.length) : t; seen = isFinal ? '' : t;
    var ids = parse(fresh);
    var rawHit = rawHook(fresh);
    if (rawHit || ids.length) { if (!rawHit && ids.length) order(ids, fresh); flash('⌨ ' + fresh.trim()); }
    else if (isFinal && fresh.trim()) { llmIntent(fresh).then(function (li) { if (li && li.length) { order(li, fresh); flash('🤖 ' + fresh.trim()); } else { pendingUnknown = { text: fresh.trim(), t: Date.now() }; if (SOLDIER[GAME] && on) soldierSay('unknown'); else if (window.Talk) Talk.heard(fresh); } }); }
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
    '.ag-menu{position:fixed;left:50%;top:calc(max(6px,env(safe-area-inset-top)) + 150px);transform:translateX(-50%);z-index:9001;background:rgba(15,23,42,.94);color:#fff;border-radius:12px;padding:10px 16px;font:700 14px/1.5 system-ui,"Noto Sans Devanagari",sans-serif;display:none;max-width:90vw}.ag-menu.on{display:block}' +
    '.ag-fl{position:fixed;left:50%;top:calc(max(6px,env(safe-area-inset-top)) + 118px);transform:translateX(-50%);z-index:9001;background:#fbbf24;color:#0f172a;border-radius:10px;padding:5px 12px;font:800 13px system-ui,"Noto Sans Devanagari",sans-serif;display:none;max-width:90vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ag-fl.on{display:block}';
  document.head.appendChild(css);
  var btn = document.createElement('button'); btn.className = 'tk-btn ag-btn'; btn.setAttribute('aria-label', 'वॉइस कंट्रोल चालू/बंद'); btn.innerHTML = '<i>🎧</i><span>कंट्रोल</span>';
  var hudEl = document.createElement('div'); hudEl.className = 'ag-hud';
  var fl = document.createElement('div'); fl.className = 'ag-fl'; var flT = null;
  function flash(t) { fl.textContent = t; fl.classList.add('on'); clearTimeout(flT); flT = setTimeout(function () { fl.classList.remove('on'); }, 1400); }
  function hud() { hudEl.innerHTML = ''; var a = document.createElement('span'); a.textContent = (on ? '🎧 ' : '') + (SOLDIER[GAME] ? '🪖 ' : 'एजेंट: '); var b = document.createElement('b'); var tags = [NAMES[A.strategy] || A.strategy]; if (A.strategy === 'hunt' && A.hunt && A.hunt.e) tags[0] = '🎯 ' + ({ rifle: 'सिपाही', runner: 'सिपाही', turret: 'टावर', cannon: 'तोप', tank: 'टैंक', chopper: 'हेलीकॉप्टर' }[A.hunt.e.t] || A.hunt.e.t) + ' पर निशाना'; if (A.strategy === 'cross' && A.cross) tags[0] = A.cross.phase === 'clear' ? 'रास्ता साफ़ कर रहा' : 'गड्ढा पार कर रहा'; if (A.dodge && A.strategy !== 'auto') tags.push('🛡 बच रहा'); if (A.fire && A.strategy !== 'auto') tags.push('🔫 मार रहा'); if (A.teaching) tags.push('📝 सीख रहा (' + A.teaching.steps.length + ')'); if (SOLDIER[GAME]) tags.push('चाल: ' + (A.roles.move ? 'मैं' : 'तुम') + ' · गोली: ' + (A.roles.fire ? 'मैं' : 'तुम')); b.textContent = tags.join(' · '); hudEl.appendChild(a); hudEl.appendChild(b); hudEl.classList.toggle('on', on || A.strategy !== 'idle' || A.dodge || A.fire || !!A.teaching); document.body.classList.toggle('ag-on', hudEl.classList.contains('on')); btn.children[1].textContent = on ? 'सुन रहा' : 'कंट्रोल'; }
  var HELP = { contra: 'आगे बढ़ो · कूदो · मारो · बचो · गड्ढा पार करो · निशाना टैंक पे · बंदूक बदलो · तुम संभालो / मैं चलता हूँ · सिखाना शुरू', car: 'आगे बढ़ो (गैस) · रुको (ब्रेक) · अपने आप खेलो', iso: 'ऊपर/नीचे/बाएँ/दाएँ · अपने आप खेलो', arena: 'आगे/पीछे · उड़ो · मारो · बचो · अपने आप खेलो', fort: 'तीन सैनिक ऊपर · तीरंदाज़ भेजो · टावर बनाओ · हमला', mantra: 'असुर पर लिखा मंत्र बोलो · ढाल · शांति · जीवन' };
  btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  btn.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
  btn.addEventListener('click', function (e) { e.stopPropagation(); on = !on; btn.classList.toggle('on', on); if (on) { if (!SR) { flash('यहाँ बोलकर खेलना संभव नहीं (Chrome में खोलो)'); on = false; btn.classList.remove('on'); hud(); return; } startRec(); flash('बोलो: ' + (HELP[GAME] || HELP.contra)); if (window.Talk && Talk.setEnabled && Talk.enabled && !Talk.userSet) { Talk.setEnabled(false, true); setTimeout(function () { flash('किरदार चुप — 🗣 बटन से चालू करो'); }, 1500); } } else { stopRec(); A.strategy = 'idle'; A.fire = false; A.dodge = false; try { D.release(); } catch (x) {} } hud(); });
  function mount() { var more = document.querySelector('.tk-dock .tk-more'); if (more) { more.insertBefore(btn, more.firstChild); } else { btn.classList.add('solo'); document.body.appendChild(btn); } document.body.appendChild(hudEl); document.body.appendChild(fl); hud(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  function listen(v) { if (v === on) return; btn.click(); }
  window.Agent = { listen: listen, skills: SKILLS_DB, uses: USES, describe: describe, guns: gunList, findGun: findGun, order: function (t) { return order(parse(t), t); }, parse: parse, state: A, get strategy() { return A.strategy; }, set strategy(s) { A.strategy = s; hud(); }, get listening() { return on; }, handle: handle, game: GAME };
})();
