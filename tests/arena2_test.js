const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
// simulate a very slow peerjs CDN: delay 6s then fail
await p.route(/unpkg|peerjs/,async r=>{await new Promise(x=>setTimeout(x,6000));r.abort()});await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{value:{speak(){},cancel(){}},writable:true,configurable:true})});
const t0=Date.now();await p.goto('file://'+process.cwd()+'/arena.html',{waitUntil:'domcontentloaded'});
const visible=await p.waitForSelector('button.b',{timeout:3000}).then(()=>true).catch(()=>false);
console.log('lobby visible within',Date.now()-t0,'ms while CDN stalls:',visible);
await p.tap('button.b');await p.waitForTimeout(1500);
console.log('after PLAY NOW: mode=',await p.evaluate(()=>__arena.mode),'snap players=',await p.evaluate(()=>__arena.snap&&__arena.snap.p.length),'menu hidden=',await p.evaluate(()=>document.getElementById('menu').style.display==='none'));
await p.evaluate(()=>Agent.order('अपने आप खेलो'));await p.waitForTimeout(3000);
console.log('auto 3s: inp=',await p.evaluate(()=>JSON.stringify(__arena.inp)),'my kills/deaths=',await p.evaluate(()=>{const m=__arena.snap.p.find(q=>q[0]===__arena.myId);return m&&[m[10],m[11]]}),'| errors:',errs);
await p.screenshot({path:'../arena_play.png'});await b.close()})();
