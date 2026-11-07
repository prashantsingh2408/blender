const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();let pass=0;
for(let run=0;run<3;run++){const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.g/,r=>r.abort());
 await p.addInitScript(()=>{window.__said=[];window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>{window.__said.push(u.text);setTimeout(()=>u.onend&&u.onend(),20)},cancel(){}},writable:true,configurable:true})});
 await p.goto('file://'+process.cwd()+'/contra.html');await p.waitForTimeout(900);
 await p.evaluate(()=>{Agent.order('शुरू करो');Agent.order('गोलियों से बचो');Agent.order('आगे बढ़ो')});
 // walk until near the first gap (ground 0-303, gap to 343)
 for(let i=0;i<60;i++){await p.waitForTimeout(100);if(await p.evaluate(()=>__game.player.x>250))break}
 await p.evaluate(()=>Agent.order('रुको'));await p.waitForTimeout(300);
 const x0=await p.evaluate(()=>Math.round(__game.player.x)),l0=await p.evaluate(()=>__game.G.lives);
 const parsed=await p.evaluate(()=>Agent.parse('इस गड्ढे को क्रॉस करो'));
 await p.evaluate(()=>Agent.handle('इस गड्ढे को क्रॉस करो',true));await p.waitForTimeout(150);const st=await p.evaluate(()=>Agent.strategy);
 await p.waitForTimeout(5000);
 const r=await p.evaluate(()=>({x:Math.round(__game.player.x),ground:__game.player.onGround,lives:__game.G.lives,strategy:Agent.strategy,said:__said.slice(-2)}));
 const ok=r.x>343&&r.lives===l0&&r.strategy==='hold';if(ok)pass++;
 console.log('run',run,'parse',JSON.stringify(parsed),'| from x',x0,'strategy',st,'->',r,ok?'PASS':'FAIL',errs);await p.close();}
console.log(pass+'/3 crossings succeeded');await b.close();process.exit(pass===3?0:1)})();
