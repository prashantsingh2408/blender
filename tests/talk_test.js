const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const g of ['contra','car','iso','arena']){
 const p=await (await b.newContext({viewport:{width:844,height:390}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(/fonts\.g|unpkg|peerjs/,r=>r.abort());
 await p.addInitScript(()=>{window.__said=[];window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>{window.__said.push(u.text);setTimeout(()=>u.onend&&u.onend(),30)},cancel(){}}});
  window.SpeechRecognition=window.webkitSpeechRecognition=function(){const r=this;window.__rec=r;r.start=()=>setTimeout(()=>r.onstart&&r.onstart(),10);r.stop=()=>setTimeout(()=>r.onend&&r.onend(),10)};
  window.__res=(t)=>window.__rec.onresult({resultIndex:0,results:[Object.assign([{transcript:t}],{isFinal:true})]})});
 await p.goto('file://'+process.cwd()+'/'+g+'.html');await p.waitForTimeout(1200);
 const ok=await p.evaluate(()=>!!document.querySelector('.tk-mic')&&!!window.Talk);
 await p.click('.tk-mic');await p.waitForTimeout(80);await p.evaluate(()=>__res('तू बहुत कमज़ोर है'));await p.click('.tk-mic');await p.waitForTimeout(1200);
 const r=await p.evaluate(()=>({mood:Talk.mood,psych:Talk.psych,said:__said,bub:document.querySelector('.tk-bub').textContent}));
 await p.evaluate(()=>Talk.event('died'));await p.waitForTimeout(100);
 console.log(g,'| ui:',ok,'| mood:',r.mood,r.psych,'| said:',r.said.length,'| err:',errs);
 await p.screenshot({path:'../tk_'+g+'.png'});
}
await b.close()})();
