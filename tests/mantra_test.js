const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const vp of [{width:390,height:844},{width:844,height:390}]){
const p=await (await b.newContext({viewport:vp})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{window.__said=[];window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>{window.__said.push(u.text);setTimeout(()=>u.onend&&u.onend(),20)},cancel(){}},writable:true,configurable:true});
 window.SpeechRecognition=window.webkitSpeechRecognition=function(){const r=this;window.__rec=r;r.start=()=>setTimeout(()=>r.onstart&&r.onstart(),10);r.stop=r.abort=()=>setTimeout(()=>r.onend&&r.onend(),10)}});
await p.goto('file://'+process.cwd()+'/mantra.html');await p.waitForTimeout(700);
await p.click('#go');await p.waitForTimeout(2500);
const r1=await p.evaluate(()=>({run:__mantra.run,listening:Agent.listening,enemies:__mantra.S.en.length,charOn:Talk.enabled,first:__mantra.S.en[0]&&__mantra.S.en[0].m[0].w}));
// speak the first enemy's mantra through the hands-free path (interim result)
const r2=await p.evaluate(()=>{const S=__mantra.S;const w=S.en[0].m[0].w;const n0=S.en.length;__rec.onresult({resultIndex:0,results:[Object.assign([{transcript:w}],{isFinal:false})]});return {word:w,before:n0,after:S.en.length,score:S.score}});
const r3=await p.evaluate(()=>{const S=__mantra.S;S.mana=10;const n=S.en.length;__rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'ढाल'}],{isFinal:true})]});return {shield:S.shield,heard:document.getElementById('heard').textContent}});
await p.waitForTimeout(1200);await p.screenshot({path:'../mantra_'+vp.width+'.png'});
console.log(vp.width,'| start:',r1,'| cast:',r2,'| shield:',r3,'| err:',errs);}
await b.close()})();
