const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
async function page(f){const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.route(/fonts\.g|unpkg|peerjs/,r=>r.abort());
 await p.addInitScript(()=>{window.__said=[];window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>{window.__said.push(u.text);setTimeout(()=>u.onend&&u.onend(),20)},cancel(){}},writable:true,configurable:true});
  window.SpeechRecognition=window.webkitSpeechRecognition=function(){const r=this;window.__rec=r;r.start=()=>setTimeout(()=>r.onstart&&r.onstart(),10);r.stop=r.abort=()=>setTimeout(()=>r.onend&&r.onend(),10)}});
 await p.goto('file://'+process.cwd()+'/'+f);await p.waitForTimeout(1000);return p}
// ---- CONTRA: dodge test ----
let p=await page('contra.html');
await p.evaluate(()=>Agent.order('शुरू करो'));await p.waitForTimeout(300);await p.evaluate(()=>Agent.order('रुको'));await p.waitForTimeout(200);
await p.evaluate(()=>Agent.order('गोली से बचो'));await p.waitForTimeout(100);
let st=await p.evaluate(()=>({strategy:Agent.strategy,fire:Agent.state.fire,dodge:Agent.state.dodge}));
console.log('contra after बचो:',st);
// fire 6 low bullets at the player over 3s, count hits (lives lost) and shots fired by player
let res=await p.evaluate(async()=>{const g=__game,p=g.player;const lives0=g.G.lives,pb0=g.pBullets.length;let jumps=0,prones=0;
 for(let i=0;i<6;i++){const high=i%3===2;g.eBullets.push({x:p.x+150,y:high?p.y-22:p.y-6,vx:-150,vy:0});let seenAir=false,seenProne=false;
  for(let t=0;t<40;t++){await new Promise(r=>setTimeout(r,25));if(!g.player.onGround)seenAir=true;if(g.keys.down)seenProne=true;}
  if(seenAir)jumps++;if(seenProne)prones++;}
 return {livesLost:lives0-g.G.lives,jumps,prones,playerShots:g.pBullets.length-pb0,said:__said.slice(-3)}});
console.log('contra dodge 6 bullets ->',res,'| err:',p.errs);
// auto plays
await p.evaluate(()=>Agent.order('अपने आप खेलो'));const x0=await p.evaluate(()=>__game.player.x);await p.waitForTimeout(3000);
console.log('contra auto 3s: dx=',Math.round(await p.evaluate(()=>__game.player.x)-x0),'score',await p.evaluate(()=>__game.G.score),'lives',await p.evaluate(()=>__game.G.lives));
await p.evaluate(()=>Agent.order('गोली बंद करो रुको'));await p.waitForTimeout(100);console.log('contra fireoff:',await p.evaluate(()=>[Agent.state.fire,Agent.strategy]));
// ---- CAR ----
p=await page('car.html');await p.evaluate(()=>Agent.order('अपने आप खेलो'));const d0=await p.evaluate(()=>__car.S.dist);await p.waitForTimeout(5000);
console.log('car auto 5s: dist',Math.round(await p.evaluate(()=>__car.S.dist)-d0),'dead',await p.evaluate(()=>__car.S.dead),'| err:',p.errs);
// ---- ISO ----
p=await page('iso.html');const m0=await p.evaluate(()=>__iso.S.p.join(','));await p.evaluate(()=>Agent.order('दाएँ'));await p.waitForTimeout(300);
console.log('iso right: from',m0,'to',await p.evaluate(()=>__iso.S.p.join(',')),'said',await p.evaluate(()=>__said.slice(-1)));
await p.evaluate(()=>Agent.order('अपने आप खेलो'));await p.waitForTimeout(9000);
console.log('iso auto: over=',await p.evaluate(()=>__iso.S.over),'moves',await p.evaluate(()=>document.getElementById('mv').textContent),'| err:',p.errs);
// ---- ARENA (parse + ui only, needs a room) ----
p=await page('arena.html');console.log('arena ui:',await p.evaluate(()=>!!document.querySelector('.ag-btn')),'parse:',await p.evaluate(()=>Agent.parse('उड़ो और मारो')),'| err:',p.errs);
// ---- FORT via hands-free ----
p=await page('fort.html');await p.click('.tk-tog');await p.waitForTimeout(100);await p.click('.ag-btn');await p.waitForTimeout(100);await p.evaluate(()=>{__fort.S.gold=30;__rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'दो तीरंदाज़ नीचे'}],{isFinal:true})]})});await p.waitForTimeout(200);
console.log('fort handsfree:',await p.evaluate(()=>[__fort.lane,__fort.S.units.length]),'| err:',p.errs);
await b.close()})();
