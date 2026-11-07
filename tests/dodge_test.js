const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();let totalLost=0,totalShots=0;
for(let run=0;run<3;run++){const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/fonts\.g/,r=>r.abort());
 await p.addInitScript(()=>{window.__said=[];window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>{window.__said.push(u.text);setTimeout(()=>u.onend&&u.onend(),20)},cancel(){}},writable:true,configurable:true})});
 await p.goto('file://'+process.cwd()+'/contra.html');await p.waitForTimeout(900);
 await p.evaluate(()=>Agent.order('शुरू करो'));await p.waitForTimeout(300);await p.evaluate(()=>Agent.order('रुको'));await p.waitForTimeout(100);
 const parsed=await p.evaluate(()=>[Agent.parse('गोलियों से बचो'),Agent.parse('गोलियां'),Agent.parse('bullets se bacho')]);
 await p.evaluate(()=>Agent.order('गोलियों से बचो'));await p.waitForTimeout(100);
 const r=await p.evaluate(async()=>{const g=__game;const out=[];const lives0=g.G.lives,pb0=g.pBullets.length;
  for(let i=0;i<10;i++){const p=g.player;const kind=['low','mid','high','low','high','mid','low','high','mid','low'][i];const dy=kind==='low'?-5:kind==='mid'?-16:-24;const l0=g.G.lives;
   g.eBullets.push({x:p.x+160,y:p.y+dy,vx:-160,vy:0});let air=0,pr=0;
   for(let t=0;t<36;t++){await new Promise(r=>setTimeout(r,25));if(!g.player.onGround)air++;if(g.keys.down)pr++;}
   out.push(kind+':'+(air?'J':'')+(pr?'P':'')+(g.G.lives<l0?'HIT':'ok'));}
  return {lost:lives0-g.G.lives,shots:g.pBullets.length-pb0,seq:out.join(' '),said:__said.slice(-2),strategy:Agent.strategy}});
 console.log('run',run,'parse:',JSON.stringify(parsed),'|',r,errs);totalLost+=r.lost;totalShots+=r.shots;await p.close();}
console.log('TOTAL lost',totalLost,'/30 bullets; shots fired',totalShots);await b.close()})();
