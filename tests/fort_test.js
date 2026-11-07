const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const vp of [{width:390,height:844},{width:844,height:390}]){
const p=await (await b.newContext({viewport:vp})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{window.__said=[];window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>{window.__said.push(u.text);setTimeout(()=>u.onend&&u.onend(),30)},cancel(){}}})});
await p.goto('file://'+process.cwd()+'/fort.html');await p.waitForTimeout(600);
const r1=await p.evaluate(()=>{var S=__fort.S;S.gold=40;return [Talk.heard('तीन सैनिक ऊपर'),__fort.lane,S.units.filter(u=>u.side===1).length]});
const r2=await p.evaluate(()=>{__fort.S.gold=40;Talk.heard('टावर बनाओ नीचे');return [__fort.lane,__fort.S.towers.length]});
await p.evaluate(()=>{__fort.S.gold=60;Talk.heard('हमला')});
await p.waitForTimeout(2500);
const r3=await p.evaluate(()=>[__fort.S.units.length,__fort.S.ehp,__fort.S.hp,__said.slice(-3)]);
console.log(vp.width+'x'+vp.height,'| 3 soldiers top:',r1,'| tower bottom:',r2,'| after attack 2.5s units/ehp/hp:',r3,'| err:',errs);
await p.screenshot({path:'../fort_'+vp.width+'.png'});}
await b.close()})();
