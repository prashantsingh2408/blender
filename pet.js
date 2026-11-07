/* pet.js — शेरू, the commando's dog. Lives on a transparent overlay canvas aligned with the game canvas,
   reads the game's exposed state (__game) and takes voice orders: "शेरू हमला", "शेरू आगे देखो", "शेरू रुको",
   "शेरू वापस", "भौंको", "जो मैं करूँ वही करो". He bites enemies (__game.killEnemy) and barks to stun shooters. */
(function () {
  var G = function () { return window.__game; };
  var NAME = 'शेरू', GRAV = 850, JUMP_V = -260, RUN = 105;
  var D = { x: 0, y: 176, vx: 0, vy: 0, dir: 1, onGround: false, mode: 'follow', target: null, biteT: 0, barkT: 0, say: '', sayT: 0, anim: 0, lastJump: 0, stuckT: 0, lastX: 0, alive: false, mirrorJumpT: 0, stamina: 1 };
  var MODES = { follow: 'साथ', attack: 'हमला', scout: 'आगे देख रहा', stay: 'बैठा', mirror: 'तुम्हारे जैसा' };

  /* ---------- overlay canvas ---------- */
  var cv = document.createElement('canvas'); cv.id = 'petcv'; cv.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:1'; cv.setAttribute('aria-hidden', 'true');
  var g = cv.getContext('2d');
  function mount() { document.body.appendChild(cv); } if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  /* ---------- helpers on the game's world ---------- */
  function groundAt(x, y) { var SF = G().surfaces || [], best = null; for (var i = 0; i < SF.length; i++) { var s = SF[i]; if (x >= s.x1 && x <= s.x2 && s.y >= y - 1 && (!best || s.y < best.y)) best = s; } return best; }
  function onSurface(x, y) { var SF = G().surfaces || []; for (var i = 0; i < SF.length; i++) { var s = SF[i]; if (x >= s.x1 - 1 && x <= s.x2 + 1 && Math.abs(s.y - y) < 2) return s; } return null; }
  function jump() { if (!D.onGround || Date.now() - D.lastJump < 250) return; D.vy = JUMP_V; D.onGround = false; D.lastJump = Date.now(); }
  function bark(text) { D.say = text; D.sayT = 1.4; D.barkT = 0.4; }
  function nearestEnemy(x, range) { var best = null, bd = range; (G().enemies || []).forEach(function (e) { if (e.dead || e.hp <= 0 || e.t === 'cap' || e.t === 'core') return; var d = Math.abs(e.x - x); if (d < bd && Math.abs(e.y - D.y) < 100) { bd = d; best = e; } }); return best; }

  /* ---------- orders ---------- */
  var NAME_RE = /शेरू|शेरु|sheru|कुत्ता|कुत्ते|डॉगी|डॉग|\bdog\b|पप्पी|\bpuppy\b/;
  function voice(text) {
    var l = String(text).toLowerCase(), named = NAME_RE.test(l), did = false;
    if (/भौंक|\bbark\b/.test(l)) { doBark(); did = true; }
    if (/जो मैं करूँ|जो मैं करू|मेरे जैसा|मेरी तरह|\bmirror\b|\bcopy me\b|वही करो/.test(l)) { D.mode = 'mirror'; bark('भौं!'); did = true; }
    if (!named && !did) return false;
    if (/हमला|पकड़|काट|\battack\b|\bbite\b|\bget\b|मारो|मार/.test(l)) { D.mode = 'attack'; D.target = null; bark('ग्रर्र!'); did = true; }
    else if (/आगे|देख|\bscout\b|\bahead\b|जाओ/.test(l)) { D.mode = 'scout'; bark('भौं भौं!'); did = true; }
    else if (/रुक|बैठ|\bstay\b|\bsit\b|\bstop\b/.test(l)) { D.mode = 'stay'; D.vx = 0; bark('...'); did = true; }
    else if (/वापस|आ जा|आजा|यहाँ|यहां|\bcome\b|\bheel\b|\bback\b|साथ/.test(l)) { D.mode = 'follow'; bark('भौं!'); did = true; }
    else if (named && !did) { bark('भौं?'); did = true; }
    return did;
  }
  var prevVoice = window.GameVoice;
  window.GameVoice = function (t) { var r = false; try { r = voice(t); } catch (e) {} if (!r && prevVoice) return prevVoice(t); return r; };
  function doBark() { bark('भौं भौं!'); (G().enemies || []).forEach(function (e) { if (e.dead) return; if (Math.abs(e.x - D.x) < 170 && Math.abs(e.y - D.y) < 90) { e.cd = Math.max(e.cd || 0, 2.5); e.flash = 0.2; } }); }

  /* ---------- brain + physics ---------- */
  var prevP = null, prevFire = 0;
  function tick(dt) {
    var W = G(); if (!W || !W.G || !W.player) return;
    var p = W.player, play = W.G.state === 'play' || W.G.state === 'bossdie';
    if (!play || (W.LV && W.LV.type === 'ride')) { D.alive = false; return; }
    if (!D.alive) { D.alive = true; D.x = p.x - 24; D.y = p.y; D.vx = 0; D.vy = 0; D.onGround = true; D.mode = D.mode === 'stay' ? 'follow' : D.mode; }
    if (p.dead) { if (D.mode !== 'stay') { D.mode = 'follow'; } }
    /* decide where to go */
    var goal = null, want = 0;
    if (D.mode === 'attack' || (D.mode === 'mirror' && prevFire > 0)) { if (!D.target || D.target.dead || D.target.hp <= 0) D.target = nearestEnemy(p.x, 420); if (D.target) goal = D.target.x; else if (D.mode === 'attack') { D.mode = 'follow'; bark('भौं?'); } }
    if (goal === null) {
      if (D.mode === 'scout') goal = p.x + 190 * (p.dir || 1);
      else if (D.mode === 'stay') goal = D.x;
      else goal = p.x - 26 * (p.dir || 1);
    }
    var dx = goal - D.x; if (Math.abs(dx) > 6) { want = Math.sign(dx) * RUN * (D.mode === 'attack' ? 1.25 : 1); D.dir = Math.sign(dx); }
    /* mirror: copy the commando's jumps and shots */
    if (D.mode === 'mirror' && prevP) { if (prevP.onGround && !p.onGround && p.vy < 0) D.mirrorJumpT = 0.12; }
    if (D.mirrorJumpT > 0) { D.mirrorJumpT -= dt; if (D.onGround) { jump(); D.mirrorJumpT = 0; } }
    /* terrain: jump at edges when the far side exists, jump when stuck, never walk off into a gap */
    var on = onSurface(D.x, D.y);
    if (D.onGround && on && want !== 0) { var toEdge = want > 0 ? on.x2 - D.x : D.x - on.x1; if (toEdge < 8) { var ax = D.x + Math.sign(want) * 44, landing = groundAt(ax, D.y - 60); if (landing && landing.y <= D.y + 2) jump(); else want = 0; } }
    if (D.onGround && on && Math.abs(D.x - D.lastX) < 0.2 && want !== 0) { D.stuckT += dt; if (D.stuckT > 0.3) { jump(); D.stuckT = 0; } } else D.stuckT = 0;
    /* a target or the player standing on a ledge above: hop */
    var upGoal = (D.target && D.target.y < D.y - 20 && Math.abs(D.target.x - D.x) < 80) || (D.mode !== 'stay' && !D.target && p.y < D.y - 20 && Math.abs(p.x - D.x) < 60);
    if (upGoal && D.onGround) jump();
    D.lastX = D.x;
    D.vx += (want - D.vx) * Math.min(1, dt * 12); D.x += D.vx * dt; D.x = Math.max(4, D.x);
    /* gravity against the game's surfaces */
    D.vy += GRAV * dt; var ny = D.y + D.vy * dt; var s2 = groundAt(D.x, D.y); D.onGround = false;
    if (D.vy >= 0 && s2 && D.y <= s2.y + 0.5 && ny >= s2.y) { D.y = s2.y; D.vy = 0; D.onGround = true; } else D.y = ny;
    if (D.y > 300) { D.x = p.x - 20; D.y = p.y; D.vy = 0; D.onGround = true; D.mode = 'follow'; bark('कूँ...'); }
    /* bite */
    D.biteT -= dt;
    if (D.target && !D.target.dead && D.target.hp > 0 && Math.abs(D.target.x - D.x) < 18 && Math.abs(D.target.y - D.y) < 30 && D.biteT <= 0) {
      D.biteT = 0.45; var e = D.target; e.hp -= 1; e.flash = 0.12; bark('ग्रर्र!');
      if (e.hp <= 0) { var sc0 = W.G.score; try { W.killEnemy(e); } catch (x) {} try { if (W.G.score === sc0 && W.addScore) W.addScore(e.boss ? 1000 : (e.t === 'tank' || e.t === 'chopper' ? 300 : 100)); if (e.boss && W.startBossDeath) W.startBossDeath(); } catch (x2) {} D.target = null; if (D.mode === 'attack') { D.target = nearestEnemy(p.x, 420); if (!D.target) { D.mode = 'follow'; bark('भौं!'); } } }
    }
    if (D.sayT > 0) D.sayT -= dt; if (D.barkT > 0) D.barkT -= dt;
    D.anim += dt * (Math.abs(D.vx) > 10 ? 14 : 3);
    prevFire = (W.keys && (W.keys.fire ? 1 : 0)) || 0; prevP = { onGround: p.onGround, vy: p.vy };
  }

  /* ---------- draw (world -> screen through the game's own layout) ---------- */
  function draw() {
    var W = G(); var c = W && W.canvas; if (!c) return;
    var r = c.getBoundingClientRect(); if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.round(r.width); cv.height = Math.round(r.height); }
    cv.style.left = r.left + 'px'; cv.style.top = r.top + 'px'; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    g.clearRect(0, 0, cv.width, cv.height); if (!D.alive) return;
    var S = r.width / (W.VW || 320), sx = (D.x - W.cam) * S, sy = (D.y + (W.EXTRA || 0)) * S;
    g.save(); g.translate(sx, sy); g.scale(S * D.dir, S);
    var run = Math.abs(D.vx) > 10, leg = Math.sin(D.anim) * (run ? 4 : 0.6);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 1, 11, 2.5, 0, 0, 6.283); g.fill();
    g.strokeStyle = '#5a3a1a'; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-6, -4); g.lineTo(-6 + leg, 0); g.moveTo(5, -4); g.lineTo(5 - leg, 0); g.moveTo(-3, -4); g.lineTo(-3 - leg, 0); g.moveTo(8, -4); g.lineTo(8 + leg, 0); g.stroke();
    g.fillStyle = '#b5712f'; g.beginPath(); g.ellipse(1, -8, 9.5, 5, 0, 0, 6.283); g.fill();
    g.strokeStyle = '#b5712f'; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, -10); g.quadraticCurveTo(-14, -16 + Math.sin(D.anim * 2) * 3, -11, -17); g.stroke();
    g.fillStyle = '#c9843d'; g.beginPath(); g.ellipse(10, -12, 5.5, 4.5, 0, 0, 6.283); g.fill();
    g.fillStyle = '#5a3a1a'; g.beginPath(); g.ellipse(7, -16, 2.2, 3.5, -0.3, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(11, -16.5, 2.2, 3.5, 0.3, 0, 6.283); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(15.5, -12.5, 1.6, 0, 6.283); g.fill(); g.beginPath(); g.arc(12, -13.5, 1, 0, 6.283); g.fill();
    g.fillStyle = '#e53935'; g.fillRect(2, -11, 5, 2.2);
    if (D.barkT > 0) { g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.arc(17, -12, 5, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(17, -12, 8, -0.7, 0.7); g.stroke(); }
    g.restore();
    g.save(); g.translate(sx, sy); g.scale(S, S); g.textAlign = 'center'; g.font = '700 6px system-ui,"Noto Sans Devanagari",sans-serif';
    g.fillStyle = 'rgba(0,0,0,.55)'; var lab = NAME + ' · ' + (MODES[D.mode] || D.mode); var w = g.measureText(lab).width + 6; g.fillRect(-w / 2, -30, w, 8); g.fillStyle = '#ffd23f'; g.fillText(lab, 0, -24);
    if (D.sayT > 0) { g.font = '700 7px system-ui,"Noto Sans Devanagari",sans-serif'; var w2 = g.measureText(D.say).width + 8; g.fillStyle = '#fff'; g.beginPath(); g.roundRect ? g.roundRect(-w2 / 2, -42, w2, 10, 3) : g.rect(-w2 / 2, -42, w2, 10); g.fill(); g.fillStyle = '#111'; g.fillText(D.say, 0, -34.5); }
    g.restore();
  }
  var last = performance.now();
  (function loop(n) { var dt = Math.min(0.05, (n - last) / 1000); last = n; try { tick(dt); draw(); } catch (e) {} requestAnimationFrame(loop); })(last);
  window.Pet = { D: D, voice: voice, get mode() { return D.mode; }, set mode(m) { D.mode = m; }, bark: doBark };
})();
