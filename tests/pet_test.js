const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>setTimeout(()=>u.onend&&u.onend(),20),cancel(){}},writable:true,configurable:true})});
await p.goto('file://'+process.cwd()+'/contra.html');await p.waitForTimeout(900);
await p.evaluate(()=>Agent.order('शुरू करो'));await p.waitForTimeout(300);await p.evaluate(()=>Agent.order('रुको'));await p.evaluate(()=>Agent.order('गोलियों से बचो'));await p.waitForTimeout(1500);
const f=await p.evaluate(()=>({alive:Pet.D.alive,mode:Pet.mode,dist:Math.round(Math.abs(Pet.D.x-__game.player.x)),ground:Pet.D.onGround,y:Math.round(Pet.D.y)}));console.log('follow:',f);
// walk the commando forward 2s; dog should keep up
await p.evaluate(()=>Agent.order('आगे बढ़ो'));await p.waitForTimeout(2000);await p.evaluate(()=>Agent.order('रुको'));await p.evaluate(()=>Agent.order('बचो'));await p.waitForTimeout(800);
console.log('after walk: dog dist',await p.evaluate(()=>Math.round(Math.abs(Pet.D.x-__game.player.x))),'dog y',await p.evaluate(()=>Math.round(Pet.D.y)),'player y',await p.evaluate(()=>Math.round(__game.player.y)));
// attack order via the voice hook (as the hands-free listener would deliver it)
const s0=await p.evaluate(()=>__game.G.score);const en0=await p.evaluate(()=>__game.enemies.filter(e=>!e.dead).length);
console.log('voice "शेरू हमला" handled:',await p.evaluate(()=>Agent.handle('शेरू हमला',true)||Pet.mode),'mode',await p.evaluate(()=>Pet.mode));
await p.waitForTimeout(5000);
console.log('attack 5s: score',s0,'->',await p.evaluate(()=>__game.G.score),'enemies',en0,'->',await p.evaluate(()=>__game.enemies.filter(e=>!e.dead).length),'mode now',await p.evaluate(()=>Pet.mode),'player shots',await p.evaluate(()=>__game.pBullets.length));
await p.evaluate(()=>Agent.handle('शेरू रुको',true));await p.waitForTimeout(600);const x1=await p.evaluate(()=>Pet.D.x);await p.waitForTimeout(800);
console.log('stay: mode',await p.evaluate(()=>Pet.mode),'moved',Math.round(await p.evaluate(()=>Pet.D.x)-x1),'px');
await p.evaluate(()=>Agent.handle('शेरू आगे देखो',true));await p.waitForTimeout(2200);
console.log('scout: dog ahead by',await p.evaluate(()=>Math.round(Pet.D.x-__game.player.x)),'px');
await p.evaluate(()=>Agent.handle('शेरू वापस आओ',true));await p.waitForTimeout(2200);
console.log('return: dist',await p.evaluate(()=>Math.round(Math.abs(Pet.D.x-__game.player.x))));
await p.evaluate(()=>Agent.handle('जो मैं करूँ वही करो',true));console.log('player alive',await p.evaluate(()=>!__game.player.dead+' lives '+__game.G.lives),'| mirror mode:',await p.evaluate(()=>Pet.mode));
await p.evaluate(()=>Agent.handle('भौंको',true));await p.waitForTimeout(100);console.log('bark say:',await p.evaluate(()=>Pet.D.say));
await p.evaluate(()=>Agent.order('अपने आप खेलो'));await p.waitForTimeout(6000);
console.log('auto with dog 6s: score',await p.evaluate(()=>__game.G.score),'lives',await p.evaluate(()=>__game.G.lives),'dog alive',await p.evaluate(()=>Pet.D.alive),'| errors',errs);
await p.screenshot({path:'../pet.png'});await b.close()})();
