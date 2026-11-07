/* talk.js — shared "talking character" layer for every game.
   Adds: a push-to-talk mic button, Hindi speech-in / speech-out, a character
   with 4 moods (confident / angry / nervous / respectful), and a watcher that
   reads each game's exposed state (__game / __car / __iso / __arena) to react
   to kills, deaths, wins and losses. Include with:
   <script src="talk.js" data-game="contra"></script>                      */
(function () {
  var me = document.currentScript, GAME = (me && me.getAttribute('data-game')) || 'generic';
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };

  /* ---------- characters ---------- */
  var CH = {
    contra: { name: 'कर्नल', title: 'जंगल का बॉस', color: '#2e7d32', pitch: 0.8,
      start: ['मेरे जंगल में घुसा है? ज़िंदा वापस नहीं जाएगा।', 'चल, दिखा क्या दम है तुझमें।'],
      kill: { confident: ['एक गिरा, सौ और हैं।', 'इतने से कुछ नहीं होता।'], angry: ['मेरे आदमी को मारा? अब देख!', 'बस करो!'], nervous: ['रुक... रुक जा यार।', 'ये... ये तो तेज़ है।'], respectful: ['बढ़िया निशाना।', 'शाबाश, सैनिक।'] },
      died: { confident: ['कहा था ना। घर जा।', 'हा हा! गिर गया।'], angry: ['यही अंजाम होता है!', 'अब बोलो?'], nervous: ['उफ़... बच गया मैं।', 'किस्मत मेरी।'], respectful: ['उठो, फिर कोशिश करो।', 'ऐसा होता है, हिम्मत रखो।'] },
      boss: { confident: ['अब असली खेल शुरू।', 'मुझसे टकराओगे?'], angry: ['आ गया तू! खत्म करता हूँ!'], nervous: ['मत... मत आ पास।'], respectful: ['यहाँ तक आए, मान गया। अब लड़ो।'] },
      win: ['ठीक है... इस बार तुम जीते।', 'जंगल तुम्हारा। अभी के लिए।'],
      lose: ['खेल खत्म। कहा था ना।', 'जंगल में कमज़ोर नहीं टिकते।'] },
    car: { name: 'उस्ताद', title: 'पहाड़ का ड्राइवर', color: '#ef6c00', pitch: 1.0,
      start: ['पहाड़ी रास्ता है, आराम से। पलट गए तो हँसूँगा।', 'गैस दबा, पर दिमाग से।'],
      kill: { confident: ['सिक्का मिला, बढ़िया।'], angry: ['सिक्के बटोर रहा है, चलाना सीख।'], nervous: ['अरे वाह... रुक मत।'], respectful: ['शानदार ड्राइविंग।'] },
      died: { confident: ['पलट गई! हा हा।', 'कहा था ना, आराम से।'], angry: ['फिर पलटी! क्या कर रहे हो?'], nervous: ['ओह... चोट तो नहीं लगी?'], respectful: ['कोई बात नहीं, फिर चलो।'] },
      far: { confident: ['हम्म, चला लेते हो।'], angry: ['इतनी दूर कैसे पहुँच गया?'], nervous: ['रुक जा... बहुत दूर जा रहा है।'], respectful: ['वाह, लंबी दौड़।'] },
      win: ['मान गया।'], lose: ['रुक गई गाड़ी।'] },
    iso: { name: 'गार्ड कप्तान', title: 'रिज़ॉर्ट सिक्योरिटी', color: '#1976d2', pitch: 0.9,
      start: ['मेरे गार्ड हर कोने पर हैं। छुप सको तो छुप लो।', 'एजेंट? यहाँ से निकल कर दिखाओ।'],
      kill: { confident: ['एक गार्ड सोया, बाकी जागे हैं।'], angry: ['मेरे आदमी को गिराया? अब सब सतर्क!'], nervous: ['कैसे... कैसे पीछे से आए?'], respectful: ['चुपचाप, साफ़ काम।'] },
      died: { confident: ['पकड़ा गया! हा।', 'इतना आसान।'], angry: ['बाहर फेंको इसे!'], nervous: ['उफ़, पकड़ा तो गया।'], respectful: ['अच्छी कोशिश थी।'] },
      win: ['निकल गया... कैसे?', 'ठीक है एजेंट, तुम जीते।'], lose: ['फिर आना, फिर पकड़ेंगे।'] },
    arena: { name: 'कमेंटेटर', title: 'अखाड़े की आवाज़', color: '#00897b', pitch: 1.1,
      start: ['अखाड़ा गर्म है! जेटपैक चालू करो।', 'आठ खिलाड़ी, एक विजेता।'],
      kill: { confident: ['शानदार शॉट!', 'एक और गिरा!'], angry: ['बहुत हो गया, रुको!'], nervous: ['कोई इसे रोको!'], respectful: ['क्या निशाना है, वाह!'] },
      died: { confident: ['गिर गए! रीस्पॉन।', 'हा! उड़ना सीखो।'], angry: ['उठो और बदला लो!'], nervous: ['ओह, वो तो बुरा लगा।'], respectful: ['कोई बात नहीं, वापस आओ।'] },
      win: ['विजेता!'], lose: ['अगली बार।'] },
    fort: { name: 'सेनापति', title: 'किले का रक्षक', color: '#b91c1c', pitch: 0.85,
      start: ['सेनापति तैयार। हुक्म दो: सैनिक, तीरंदाज़, दैत्य, या हमला।', 'किला तुम्हारा, सेना तुम्हारी। बोलो क्या करें?'],
      kill: { confident: ['दुश्मन गिरा।'], angry: ['और भेजो! कुचल दो!'], nervous: ['बच गए... अभी के लिए।'], respectful: ['बढ़िया चाल, सेनापति।'] },
      died: { confident: ['हमारा सैनिक गिरा। और भेजो।'], angry: ['बदला लो!'], nervous: ['किला... खतरे में है।'], respectful: ['हिम्मत रखो।'] },
      win: ['किला फ़तह! जय हो।'], lose: ['किला गिर गया। फिर से लड़ेंगे।'] },
    generic: { name: 'बॉस', title: '', color: '#8e24aa', pitch: 1,
      start: ['चलो, खेल शुरू।'], kill: { confident: ['ठीक।'], angry: ['बस!'], nervous: ['रुक।'], respectful: ['बढ़िया।'] },
      died: { confident: ['हा!'], angry: ['यही होना था।'], nervous: ['उफ़।'], respectful: ['फिर कोशिश।'] }, win: ['जीत गए।'], lose: ['हार गए।'] }
  };
  var C = CH[GAME] || CH.generic;

  /* ---------- AI players (chosen on the home page, follow you into every game) ---------- */
  var PLAYERS = {
    rocky: { name: 'रॉकी', title: 'स्ट्रीट किंग', color: '#ff5a5f', pitch: 0.85, temper: 1.4, angryAt: 25, nervousAt: 75, racer: 'rocky',
      start: ['चल बे, दिखा क्या है तुझमें।', 'स्ट्रीट किंग आ गया। डरना मत।'],
      kill: { confident: ['हम्म, एक गिरा। बस?', 'इतने में क्या होता है।'], angry: ['बस कर! मेरा दिमाग मत खा!', 'अब मैं भड़क गया!'], nervous: ['रुक... रुक जा भाई।', 'ये... ये क्या चल रहा है?'], respectful: ['बढ़िया, मानना पड़ेगा।'] },
      died: { confident: ['हा हा! कहा था ना।', 'घर जा, सो जा।'], angry: ['यही होना था तेरे साथ!'], nervous: ['उफ़... चलो बचा मैं।'], respectful: ['उठ, फिर से। हिम्मत रख।'] },
      boss: { confident: ['अब असली खेल।'], angry: ['आ गया! अब खैर नहीं!'], nervous: ['मत आ पास...'], respectful: ['यहाँ तक आया, मान गया।'] },
      win: ['ठीक है... आज तू जीता।', 'किस्मत थी तेरी।'], lose: ['कहा था ना। किंग मैं हूँ।'],
      reply: { taunt: { confident: ['बड़ी बातें। खेल कर दिखा।'], angry: ['मुँह बंद कर!', 'अब तेरी खैर नहीं!'], nervous: ['ठीक है... ठीक है...'], respectful: ['हा हा, मज़ाक अच्छा था।'] }, praise: ['हाँ हाँ, पता है मैं बेस्ट हूँ।'], bargain: ['किंग सौदे नहीं करता।'] } },
    madam: { name: 'मैडम नाइट्रो', title: 'दिमागी खेल', color: '#8e24aa', pitch: 1.2, temper: 0.6, angryAt: 45, nervousAt: 85, racer: 'madam',
      start: ['आराम से खेलो, डार्लिंग। मैं देख रही हूँ।', 'चलो, थोड़ा दिमागी खेल हो जाए।'],
      kill: { confident: ['प्यारा। और?', 'हम्म, ठीक-ठाक।'], angry: ['अब मुझे चिढ़ हो रही है।'], nervous: ['ये... उम्मीद से बेहतर है।'], respectful: ['सुंदर। सच में।'] },
      died: { confident: ['ओह। बेचारा।', 'मैंने कहा था, आराम से।'], angry: ['यही चाहिए था तुम्हें।'], nervous: ['उफ़, चलो बचे।'], respectful: ['होता है। फिर कोशिश।'] },
      boss: { confident: ['अब मज़ा आएगा।'], angry: ['ख़त्म करती हूँ।'], nervous: ['संभल कर...'], respectful: ['यहाँ तक? वाह।'] },
      win: ['ठीक है, आज तुम जीते। कल देखेंगे।'], lose: ['जैसा सोचा था।'],
      reply: { taunt: { confident: ['बच्चों जैसी बातें।', 'इतनी मेहनत मुझे चिढ़ाने में?'], angry: ['बस। अब चुप।'], nervous: ['ठीक है, ठीक है।'], respectful: ['हा, अच्छा था।'] }, praise: ['जानती हूँ। धन्यवाद।'], bargain: ['सौदा? मेरे साथ? प्यारे हो।'] } },
    bolt: { name: 'बोल्ट', title: 'नौसिखिया उस्ताद', color: '#1976d2', pitch: 1.35, temper: 1.0, angryAt: 40, nervousAt: 55, racer: 'bolt',
      start: ['ह-हाय! मैं बोल्ट। तेज़ हूँ, पर... घबराता हूँ।', 'चलो चलो चलो!'],
      kill: { confident: ['वाह! ठीक है!'], angry: ['अरे यार, बस करो ना!'], nervous: ['रुको रुको रुको!', 'मुझे... डर लग रहा है।'], respectful: ['तुम तो प्रो हो!'] },
      died: { confident: ['ओह नो! ठीक हो?'], angry: ['हा! देखा!'], nervous: ['उफ़... मैं भी गिर जाता।'], respectful: ['कोई नहीं, फिर से!'] },
      boss: { confident: ['बॉस! चलो!'], angry: ['अब मैं गुस्से में हूँ!'], nervous: ['म-मत जाओ पास!'], respectful: ['तुम कर लोगे!'] },
      win: ['तुम जीते! वाह!'], lose: ['कोई बात नहीं, फिर खेलते हैं।'],
      reply: { taunt: { confident: ['ऐसा मत बोलो ना!'], angry: ['बस! अब मैं नहीं डरूँगा!'], nervous: ['ओके ओके, सॉरी!'], respectful: ['हे हे, ठीक है।'] }, praise: ['सच में? थैंक यू!'], bargain: ['सौदा? मुझे नहीं पता ये कैसे होता है।'] } },
    tapori: { name: 'अपुन टपोरी', title: 'मुंबई का बाप', color: '#ef6c00', pitch: 0.95, temper: 1.2, angryAt: 30, nervousAt: 70, racer: 'tapori',
      start: ['ए बॉस, अपुन आ गया। खेल चालू कर।', 'क्या रे, तैयार है क्या?'],
      kill: { confident: ['एक गया। बोले तो, मामूली।'], angry: ['ए! अपुन का भेजा मत घुमा!'], nervous: ['अरे रुक रे... जास्ती हो रहा है।'], respectful: ['झकास! मान गया बॉस।'] },
      died: { confident: ['हा हा! खल्लास!', 'बोला था ना।'], angry: ['यही होना था रे!'], nervous: ['बच गया अपुन।'], respectful: ['उठ रे, फिर से मार।'] },
      boss: { confident: ['अब असली लफड़ा।'], angry: ['आ गया! अभी बजाता हूँ!'], nervous: ['ए, इधर मत आ।'], respectful: ['इधर तक आया? सलाम।'] },
      win: ['ठीक है रे, आज तू बाप।'], lose: ['बोला था ना, अपुन बाप है।'],
      reply: { taunt: { confident: ['ए, बोलने से कुछ नहीं होता।'], angry: ['चुप रे! भेजा फ्राई मत कर!'], nervous: ['ठीक है रे, ठीक है।'], respectful: ['हा हा, मस्त बोला।'] }, praise: ['एकदम सही बोला। अपुन झकास है।'], bargain: ['सौदा? पैसा निकाल, फिर बात कर... मज़ाक रे।'] } },
    champ: { name: 'चैम्पियन', title: 'लाइन की इज़्ज़त', color: '#3ddc97', pitch: 0.9, temper: 0.5, angryAt: 50, nervousAt: 90, racer: 'champ',
      start: ['साफ़ खेलो। मैं साथ हूँ।', 'चलो, सीखते हैं।'],
      kill: { confident: ['अच्छा। ध्यान बनाए रखो।'], angry: ['शांत रहो। गुस्से में गलती होती है।'], nervous: ['तेज़ हो तुम।'], respectful: ['शानदार। यही तरीका है।'] },
      died: { confident: ['कोई बात नहीं। क्या सीखा?'], angry: ['जल्दबाज़ी मत करो।'], nervous: ['संभलो।'], respectful: ['उठो। चैम्पियन गिरकर उठते हैं।'] },
      boss: { confident: ['अब असली परीक्षा।'], angry: ['ध्यान से।'], nervous: ['मैं हूँ।'], respectful: ['तुम तैयार हो।'] },
      win: ['बधाई। कमाई हुई जीत।'], lose: ['हार से सीखो। फिर आओ।'],
      reply: { taunt: { confident: ['शब्द नहीं, खेल बोलता है।'], angry: ['बस। इज़्ज़त से बात करो।'], nervous: ['ठीक है।'], respectful: ['हा, ठीक है दोस्त।'] }, praise: ['धन्यवाद। अब खेल पर ध्यान।'], bargain: ['जीत खरीदी नहीं जाती।'] } }
  };
  var PID = null; try { PID = localStorage.getItem('genai_player'); } catch (e) {}
  var P = PID && PLAYERS[PID];
  if (P) { var base = C; C = {}; for (var k in base) C[k] = base[k]; for (var k2 in P) C[k2] = P[k2]; C.game = base; }

  /* replies to what the player says */
  var REPLY = {
    taunt: { confident: ['बड़ी-बड़ी बातें। खेल कर दिखाओ।', 'बोलने से नहीं होता।'], angry: ['मुँह बंद रखो!', 'अब तुम्हारी खैर नहीं!'], nervous: ['ठीक है... ठीक है...', 'इतना गुस्सा क्यों?'], respectful: ['हा हा, मज़ाक अच्छा था।'] },
    praise: ['शुक्रिया। पर रहम नहीं करूँगा।', 'अच्छा, तारीफ़? चालाक हो।', 'तारीफ़ के लिए धन्यवाद, दोस्त।'],
    bargain: ['सौदा? यहाँ सौदे नहीं होते।', 'पैसे से नहीं, खेल से जीतो।'],
    silent: ['कुछ बोलो तो।', 'चुप क्यों हो?']
  };
  function classify(t) { t = String(t).toLowerCase();
    if (/deal|let me win|money|coin|bribe|please|सौदा|डील|पैसे|पैसा|जीतने दो|कृपया|प्लीज|sauda|paisa/.test(t)) return 'bargain';
    if (/nice|good|great|respect|thank|शाबाश|बढ़िया|अच्छा|अच्छे|वाह|मस्त|कमाल|शुक्रिया|धन्यवाद|तारीफ|इज़्ज़त|इज्जत|shabash|badhiya|accha|mast/.test(t)) return 'praise';
    if (!t.trim()) return 'silent'; return 'taunt'; }

  /* ---------- state ---------- */
  var mood = 'confident', psych = 0, lastEv = 0, voiceOn = true, speaking = false, listening = false, rec = null, SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var MOODHI = { confident: 'आत्मविश्वास', angry: 'गुस्से में', nervous: 'घबराया', respectful: 'इज़्ज़त' };
  var ANGRY_AT = C.angryAt || 35, NERV_AT = C.nervousAt || 70, TEMPER = C.temper || 1;
  function recalc() { if (psych >= NERV_AT) mood = 'nervous'; else if (psych >= ANGRY_AT) mood = 'angry'; else if (mood === 'nervous' || mood === 'angry') mood = 'confident'; chip.textContent = C.name + ': ' + MOODHI[mood]; chip.className = 'tk-chip ' + mood; }

  /* ---------- UI ---------- */
  var css = document.createElement('style');
  css.textContent = '.tk-mic{position:fixed;left:12px;top:50%;transform:translateY(-50%);z-index:9000;width:64px;height:64px;border-radius:50%;border:0;background:#ffd23f;color:#10202b;font:700 11px system-ui,"Noto Sans Devanagari",sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none}.tk-mic i{font-style:normal;font-size:26px;line-height:1}.tk-mic.live{background:#ff5a5f;color:#fff;animation:tkp 1s ease-in-out infinite}@keyframes tkp{50%{transform:translateY(-50%) scale(1.1)}}.tk-mic.off{opacity:.45}' +
    '.tk-bub{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9000;max-width:min(78vw,420px);background:rgba(16,32,43,.93);color:#fff;border-radius:12px;padding:8px 14px;font:600 15px system-ui,"Noto Sans Devanagari",sans-serif;line-height:1.3;display:none;box-shadow:0 4px 14px rgba(0,0,0,.4);pointer-events:none}.tk-bub.on{display:block}.tk-bub b{display:block;font-size:11px;letter-spacing:.08em;color:#ffd23f;margin-bottom:2px}.tk-bub.you{background:#3dd6f5;color:#10202b}.tk-bub.you b{color:#10202b}' +
    '.tk-chip{position:fixed;left:12px;top:calc(50% + 40px);z-index:9000;font:700 11px system-ui,"Noto Sans Devanagari",sans-serif;background:rgba(16,32,43,.85);color:#fff;padding:3px 9px;border-radius:12px;white-space:nowrap}.tk-chip.angry{color:#ff5a5f}.tk-chip.nervous{color:#ffd23f}.tk-chip.respectful{color:#3ddc97}' +
    '.tk-heard{position:fixed;left:84px;top:50%;transform:translateY(-50%);z-index:9000;max-width:50vw;font:600 13px system-ui,"Noto Sans Devanagari",sans-serif;background:rgba(16,32,43,.85);color:#fff;padding:5px 10px;border-radius:10px;display:none}.tk-heard.on{display:block}' +
    '.tk-mute{position:fixed;left:12px;top:calc(50% - 60px);z-index:9000;border:0;border-radius:12px;background:rgba(16,32,43,.85);color:#fff;font:700 11px system-ui,sans-serif;padding:4px 9px;cursor:pointer}' +
    '@media (max-aspect-ratio:1/1){.tk-mic{top:auto;bottom:88px;transform:none}.tk-mic.live{animation:none}.tk-chip{top:auto;bottom:66px}.tk-heard{top:auto;bottom:100px;transform:none}.tk-mute{top:auto;bottom:160px}}';
  document.head.appendChild(css);
  var mic = document.createElement('button'); mic.className = 'tk-mic'; mic.setAttribute('aria-label', 'बोलने के लिए दबाओ'); mic.innerHTML = '<i>🎤</i><span>बोलो</span>';
  var bub = document.createElement('div'); bub.className = 'tk-bub'; bub.setAttribute('aria-live', 'polite');
  var chip = document.createElement('div'); chip.className = 'tk-chip';
  var heardEl = document.createElement('div'); heardEl.className = 'tk-heard';
  var mute = document.createElement('button'); mute.className = 'tk-mute'; mute.textContent = '🔊 आवाज़'; mute.setAttribute('aria-pressed', 'true');
  function mount() { [mic, bub, chip, heardEl, mute].forEach(function (e) { document.body.appendChild(e); }); recalc(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var bubT = null;
  function say(who, text, isBoss) { bub.innerHTML = '<b></b><span></span>'; bub.children[0].textContent = who; bub.children[1].textContent = text; bub.className = 'tk-bub on' + (isBoss ? '' : ' you'); clearTimeout(bubT); bubT = setTimeout(function () { bub.classList.remove('on'); }, isBoss ? 4200 : 2500); if (isBoss) speak(text); }
  function speak(t) { if (!voiceOn || !window.speechSynthesis) return; try { var u = new SpeechSynthesisUtterance(t); u.lang = 'hi-IN'; u.pitch = C.pitch || 1; u.rate = 1; speaking = true; u.onend = u.onerror = function () { speaking = false; }; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { speaking = false; } }
  function line(ev, force) { var now = Date.now(); if (!force && now - lastEv < 3500) return; lastEv = now; var L = C[ev] || (C.game && C.game[ev]); if (!L) return; var arr = Array.isArray(L) ? L : (L[mood] || L.confident); say(C.name, pick(arr), true); }

  /* ---------- player speech ---------- */
  function setMic(on) { listening = on; mic.classList.toggle('live', on); mic.lastChild.textContent = on ? 'सुन रहा हूँ…' : 'बोलो'; }
  function heardShow(t) { heardEl.textContent = t; heardEl.classList.toggle('on', !!t); }
  var wd = null;
  function startListen() {
    if (!SR) { say('माइक', 'यहाँ बोलकर खेलना संभव नहीं है। (Chrome में खोलो)', false); return; }
    if (listening) return; try { speechSynthesis.cancel(); } catch (e) {}
    var got = '', r; try { r = new SR(); r.lang = 'hi-IN'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false; } catch (e) { return; }
    rec = r; clearTimeout(wd); wd = setTimeout(function () { try { r.stop(); } catch (e) {} }, 9000);
    r.onstart = function () { setMic(true); };
    r.onresult = function (e) { var fin = '', tmp = ''; for (var i = 0; i < e.results.length; i++) { var x = e.results[i][0].transcript; if (e.results[i].isFinal) fin += x; else tmp += x; } got = (fin || tmp).trim(); heardShow(got); };
    r.onerror = function (e) { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') say('माइक', 'माइक की अनुमति बंद है।', false); else if (e.error === 'no-speech') { heardShow('कुछ सुनाई नहीं दिया।'); setTimeout(function () { heardShow(''); }, 2500); } };
    r.onend = function () { clearTimeout(wd); setMic(false); rec = null; var t = got; got = ''; heardShow(''); if (t) heard(t); };
    try { r.start(); } catch (e) { setMic(false); }
  }
  /* ---------- voice command mechanism: Hindi/English words -> the game's own keys ----------
     Games read keyboard input (e.code or e.key), so a spoken command is turned into a synthetic
     key press: movement words are held for a moment, actions are tapped. Works in any game
     that uses these keys; nothing in the game changes.                                        */
  var VOICE = [
    { re: /\b(start|go|again|restart)\b|फिर से|दोबारा|शुरू|चालू|स्टार्ट|खेलो/, key: 'Enter', code: 'Enter', kc: 13, hold: 0, hi: 'शुरू' },
    { re: /\bright\b|आगे|दाएँ|दाएं|दायें|राइट/, key: 'ArrowRight', code: 'ArrowRight', kc: 39, hold: 900, hi: 'आगे' },
    { re: /\bleft\b|\bback\b|पीछे|बाएँ|बाएं|बायें|लेफ्ट|लेफ़्ट/, key: 'ArrowLeft', code: 'ArrowLeft', kc: 37, hold: 900, hi: 'पीछे' },
    { re: /\bjump\b|कूदो|कूद|जंप|छलांग/, key: ' ', code: 'Space', kc: 32, hold: 120, hi: 'कूदो' },
    { re: /\b(up|gas|fast|faster)\b|ऊपर|तेज़|तेज|गैस|भगाओ|दौड़ो/, key: 'ArrowUp', code: 'ArrowUp', kc: 38, hold: 1200, hi: 'तेज़' },
    { re: /\b(down|brake|slow)\b|नीचे|ब्रेक|धीरे|बैठो/, key: 'ArrowDown', code: 'ArrowDown', kc: 40, hold: 700, hi: 'ब्रेक' },
    { re: /\b(fire|shoot)\b|गोली|फायर|मारो|शूट|चलाओ/, key: 'x', code: 'KeyX', kc: 88, hold: 450, hi: 'फायर' },
    { re: /\bstop\b|रुको|रुक|बस करो/, key: null, hi: 'रुको' }
  ];
  var held = [];
  function kev(type, c) { return new KeyboardEvent(type, { key: c.key, code: c.code, keyCode: c.kc, which: c.kc, bubbles: true, cancelable: true }); }
  function press(c) { var d = kev('keydown', c); window.dispatchEvent(d); document.dispatchEvent(d); var up = function () { var u = kev('keyup', c); window.dispatchEvent(u); document.dispatchEvent(u); }; if (c.hold) { var h = setTimeout(up, c.hold); held.push({ up: up, h: h }); } else up(); }
  function release() { held.forEach(function (x) { clearTimeout(x.h); x.up(); }); held = []; }
  function voiceCmd(l) { var hit = []; VOICE.forEach(function (c) { if (c.re.test(l)) { hit.push(c.hi); if (c.key === null) release(); else press(c); } }); return hit; }

  function heard(t) {
    var l = t.toLowerCase();
    if (typeof window.GameVoice === 'function') { var handled = false; try { handled = !!window.GameVoice(t); } catch (e) {} if (handled) { say('तुम', t, false); heardShow('⚔ ' + t.trim()); setTimeout(function () { heardShow(''); }, 1500); return; } }
    var cmds = voiceCmd(l);
    if (cmds.length) { heardShow('⌨ ' + cmds.join(' + ')); setTimeout(function () { heardShow(''); }, 1500); if (!/\s/.test(t.trim()) || cmds.length >= 2) { say('तुम', t, false); return; } }
    say('तुम', t, false);
    var k = classify(t);
    var R = C.reply || REPLY;
    if (k === 'taunt') { psych = Math.min(100, psych + 30 * TEMPER); recalc(); setTimeout(function () { say(C.name, pick((R.taunt && R.taunt[mood]) || REPLY.taunt[mood]), true); }, 700); }
    else if (k === 'praise') { psych = Math.max(0, psych - 25); mood = 'respectful'; chip.textContent = C.name + ': ' + MOODHI.respectful; chip.className = 'tk-chip respectful'; setTimeout(function () { say(C.name, pick(R.praise || REPLY.praise), true); }, 700); }
    else setTimeout(function () { say(C.name, pick(R[k] || REPLY[k]), true); }, 700);
  }
  mic.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  mic.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
  mic.addEventListener('click', function (e) { e.stopPropagation(); if (listening && rec) { try { rec.stop(); } catch (x) {} } else startListen(); });
  mute.addEventListener('click', function (e) { e.stopPropagation(); voiceOn = !voiceOn; mute.textContent = voiceOn ? '🔊 आवाज़' : '🔇 चुप'; mute.setAttribute('aria-pressed', String(voiceOn)); mic.classList.toggle('off', !voiceOn); if (!voiceOn) try { speechSynthesis.cancel(); } catch (x) {} });
  addEventListener('keydown', function (e) { if ((e.key === 'm' || e.key === 'M') && !e.repeat) mic.click(); });
  setInterval(function () { psych = Math.max(0, psych - 0.8); if (psych < 35 && mood !== 'respectful') recalc(); }, 1000);

  /* ---------- game watchers (read exposed state, fire events) ---------- */
  var W = {
    contra: function () { var g = window.__game; if (!g || !g.G) return; var G = g.G, p = this.p || (this.p = {}); if (p.state !== G.state) { if (G.state === 'play' && (p.state === 'title' || p.state === 'gameover' || p.state === 'clear' || p.state === undefined)) line('start', true); if (G.state === 'bossdie') line('boss', true); if (G.state === 'clear') line('win', true); if (G.state === 'gameover') line('lose', true); p.state = G.state; } if (p.lives !== undefined && G.lives < p.lives) line('died', true); p.lives = G.lives; if (p.score !== undefined && G.score > p.score) line('kill'); p.score = G.score; },
    car: function () { var c = window.__car; if (!c || !c.S) return; var S = c.S, p = this.p || (this.p = { said: false }); if (!p.said && S.t > 0.5) { p.said = true; line('start', true); } if (S.dead && !p.dead) line('died', true); if (!S.dead && p.dead) { p.said = false; p.far = 0; } p.dead = S.dead; if (p.coins !== undefined && S.coins > p.coins) line('kill'); p.coins = S.coins; var f = Math.floor(S.dist / 400); if (f > (p.far || 0)) { p.far = f; line('far'); } },
    iso: function () { var i = window.__iso; if (!i || !i.S) return; var S = i.S, p = this.p || (this.p = { said: false }); if (!p.said) { p.said = true; line('start', true); } var d = (S.g || []).filter(function (x) { return x.dead; }).length; if (p.d !== undefined && d > p.d) line('kill', true); p.d = d; if (S.over && S.over !== p.over) { if (S.over === 'win') line('win', true); else { line('died', true); } } if (!S.over && p.over) { p.d = 0; } p.over = S.over; },
    fort: function () { var f = window.__fort; if (!f || !f.S) return; var S = f.S, p = this.p || (this.p = { said: false }); if (!p.said) { p.said = true; line('start', true); } var mine = S.units.filter(function (u) { return u.side === 1; }).length, theirs = S.units.filter(function (u) { return u.side === -1; }).length; if (p.theirs !== undefined && theirs < p.theirs && !S.over) line('kill'); if (p.mine !== undefined && mine < p.mine && !S.over) line('died'); p.mine = mine; p.theirs = theirs; if (S.over && S.over !== p.over) line(S.over, true); if (!S.over) p.over = null; else p.over = S.over; },
    arena: function () { var a = window.__arena; if (!a || !a.snap) return; var s = a.snap, p = this.p || (this.p = { said: false }); if (!p.said) { p.said = true; line('start', true); } var mine = (s.p || []).filter(function (q) { return q[0] === a.myId; })[0]; if (mine) { var dead = mine[12] > 0; if (dead && !p.dead) line('died', true); p.dead = dead; } var n = (s.ev || []).length; if (p.n !== undefined && n > p.n) line('kill'); p.n = n; }
  };
  var watch = W[GAME]; if (watch) setInterval(function () { try { watch.call(watch); } catch (e) {} }, 150);

  window.Talk = { say: function (t) { say(C.name, t, true); }, event: function (ev) { line(ev, true); }, get mood() { return mood; }, get psych() { return psych; }, character: C, player: PID, players: PLAYERS, heard: heard, command: voiceCmd, commands: VOICE };
})();
