const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{window.__said=[];window.SpeechSynthesisUtterance=function(t){this.text=t};const ss={speak:u=>{window.__said.push(u.text);setTimeout(()=>u.onend&&u.onend(),20)},cancel(){}};Object.defineProperty(window,'speechSynthesis',{value:ss,writable:true,configurable:true})});
await p.goto('file://'+process.cwd()+'/contra.html');await p.waitForTimeout(900);
await p.evaluate(()=>{Agent.order('शुरू करो');Agent.order('बचो')});await p.waitForTimeout(300);
console.log('types in level:',await p.evaluate(()=>{const c={};__game.enemies.forEach(e=>{c[e.t]=(c[e.t]||0)+1});return c}));
console.log('parse:',JSON.stringify(await p.evaluate(()=>[Agent.parse('निशाना टैंक पे लगाओ'),Agent.parse('फॉक्स बैंक पर करके गोली मारो टाइम पर लगाओ'),Agent.parse('सिपाही को मारो'),Agent.parse('टावर पर गोली चलाओ')])));
// 1) advance stability: 12 s of "आगे बढ़ो" with dodge on must never go idle and must make progress
const x0=await p.evaluate(()=>__game.player.x);await p.evaluate(()=>Agent.order('चलो आगे बढ़ो'));await p.waitForTimeout(12000);
console.log('advance 12s: strategy',await p.evaluate(()=>Agent.strategy),'dx',Math.round(await p.evaluate(()=>__game.player.x)-x0),'lives',await p.evaluate(()=>__game.G.lives));
// 2) echo guard: our own TTS text must not become an order
await p.evaluate(()=>Agent.order('रुको'));await p.evaluate(()=>{speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance('ठीक, पार करता हूँ'),{}))});await p.waitForTimeout(100);
await p.evaluate(()=>Agent.handle('ठीक पार करता हूँ',true));await p.waitForTimeout(100);console.log('echo ignored -> strategy still',await p.evaluate(()=>Agent.strategy));
// 3) hunt a soldier (rifle) that exists
const l0=await p.evaluate(()=>__game.G.lives);const n0=await p.evaluate(()=>__game.enemies.filter(e=>!e.dead&&(e.t==='rifle'||e.t==='runner')).length);
await p.evaluate(()=>Agent.handle('निशाना सिपाही पे लगाओ',true));await p.waitForTimeout(200);console.log('hunt strategy',await p.evaluate(()=>Agent.strategy),'aim set',await p.evaluate(()=>__game.aim!=null),'target',await p.evaluate(()=>Agent.state.hunt&&Agent.state.hunt.e&&Agent.state.hunt.e.t));
await p.waitForTimeout(7000);
console.log('after hunt 7s: soldiers',n0,'->',await p.evaluate(()=>__game.enemies.filter(e=>!e.dead&&(e.t==='rifle'||e.t==='runner')).length),'score',await p.evaluate(()=>__game.G.score),'strategy',await p.evaluate(()=>Agent.strategy),'said',await p.evaluate(()=>__said.slice(-2)),'aim cleared',await p.evaluate(()=>__game.aim==null));
// 4) hunt a type that exists further: turret/cannon
const t0=await p.evaluate(()=>__game.enemies.filter(e=>!e.dead&&(e.t==='turret'||e.t==='cannon')).length);
await p.evaluate(()=>Agent.handle('टावर पर निशाना लगाओ',true));await p.waitForTimeout(12000);
console.log('hunt turret 12s:',t0,'->',await p.evaluate(()=>__game.enemies.filter(e=>!e.dead&&(e.t==='turret'||e.t==='cannon')).length),'x',Math.round(await p.evaluate(()=>__game.player.x)),'lives',await p.evaluate(()=>__game.G.lives),'strategy',await p.evaluate(()=>Agent.strategy),'| errors',errs);
await b.close()})();
