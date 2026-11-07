const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();let tot={score:0,lives:0,dx:0};
for(let run=0;run<3;run++){const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.g/,r=>r.abort());
 await p.addInitScript(()=>{window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>setTimeout(()=>u.onend&&u.onend(),20),cancel(){}},writable:true,configurable:true})});
 await p.goto('file://'+process.cwd()+'/contra.html');await p.waitForTimeout(900);
 await p.evaluate(()=>Agent.order('शुरू करो'));await p.waitForTimeout(200);await p.evaluate(()=>Agent.order('अपने आप खेलो'));const x0=await p.evaluate(()=>__game.player.x);
 await p.waitForTimeout(10000);const r=await p.evaluate(()=>({score:__game.G.score,lives:__game.G.lives,x:Math.round(__game.player.x),state:__game.G.state}));
 console.log('run',run,'10s auto:',r,'dx',r.x-Math.round(x0),'err',errs);tot.score+=r.score;tot.lives+=r.lives;tot.dx+=r.x-x0;await p.close();}
console.log('avg score',tot.score/3,'avg lives',tot.lives/3,'avg dx',Math.round(tot.dx/3));await b.close()})();
