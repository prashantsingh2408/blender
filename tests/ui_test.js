/* UI overlap / layout test suite for every game.
   Policy: the voice dock must (1) sit fully inside the viewport in a top strip, (2) never cover the player/hero,
   (3) when collapsed never intersect any of the game's own fixed/absolute UI, (4) have >=44px buttons when expanded,
   (5) keep the agent HUD inside the viewport and off the dock. Runs every game x 4 viewports. Exit 1 on any failure. */
const { chromium } = require('playwright');
const GAMES = ['contra','car','iso','arena','fort','mantra'];
const VIEWS = [[390,844],[844,390],[360,780],[780,360]];
const LANDSCAPE_ONLY = { contra: true };
function rect(r){return r&&{l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}}
(async()=>{const b=await chromium.launch();let fails=0,rows=[];
for(const g of GAMES)for(const [W,H] of VIEWS){
 const p=await (await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(/fonts\.g|unpkg|peerjs/,r=>r.abort());
 await p.addInitScript(()=>{window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speak:u=>setTimeout(()=>u.onend&&u.onend(),20),cancel(){}},writable:true,configurable:true});window.SpeechRecognition=window.webkitSpeechRecognition=function(){const r=this;window.__rec=r;r.start=()=>setTimeout(()=>r.onstart&&r.onstart(),10);r.stop=r.abort=()=>setTimeout(()=>r.onend&&r.onend(),10)}});
 await p.goto('file://'+process.cwd()+'/'+g+'.html');await p.waitForTimeout(700);
 // get into play state
 if(g==='mantra'){await p.tap('#go');await p.waitForTimeout(300)}
 if(g==='arena'){await p.tap('button.b');await p.waitForTimeout(500)}
 if(g==='contra'){await p.evaluate(()=>Agent.order('शुरू करो'));await p.waitForTimeout(300)}
 const problems=[];
 const check=async(label,state)=>{
  const r=await p.evaluate((g)=>{
   const vw=innerWidth,vh=innerHeight,out={};
   const dock=document.querySelector('.tk-dock');const d=dock.getBoundingClientRect();
   out.dock=[Math.round(d.left),Math.round(d.top),Math.round(d.width),Math.round(d.height)];
   out.inView=d.left>=0&&d.top>=0&&d.right<=vw&&d.bottom<=vh;
   out.topStrip=d.top<=20&&d.height<=64;
   // buttons visible size
   out.smallBtn=[...dock.querySelectorAll('.tk-btn')].filter(b=>b.offsetParent!==null||getComputedStyle(b).position==='fixed').map(b=>{const r=b.getBoundingClientRect();return [b.className.replace('tk-btn ',''),Math.round(r.width),Math.round(r.height)]}).filter(x=>x[1]>0&&(x[1]<44||x[2]<44));
   // overlap with the game's own fixed/absolute UI (ignore our own layer and full-screen overlays)
   const ours=el=>el.closest('.tk-dock,.ag-hud,.ag-fl,.tk-bub,.tk-heard');
   const inter=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
   out.overlaps=[];
   const visibleBg=el=>{const cs=getComputedStyle(el);const bg=cs.backgroundColor;const a=bg.startsWith('rgba')?parseFloat(bg.split(',')[3]):(bg==='transparent'?0:1);return a>0.05||cs.backgroundImage!=='none'||(parseFloat(cs.borderTopWidth)>0&&cs.borderTopStyle!=='none')};
   const isLeaf=el=>el.children.length===0&&(el.textContent.trim().length>0||/^(BUTTON|INPUT|IMG|SVG|CANVAS|A)$/.test(el.tagName));
   const boxes=[];
   for(const el of document.querySelectorAll('body *')){if(ours(el)||el===dock)continue;const cs=getComputedStyle(el);if(!(cs.position==='fixed'||cs.position==='absolute'))continue;if(cs.visibility==='hidden'||cs.display==='none')continue;const r=el.getBoundingClientRect();if(r.width<4||r.height<4||r.width*r.height>vw*vh*0.6)continue;
     // a positioned container counts only if it paints something itself; otherwise its painted descendants count
     const name=el.id?'#'+el.id:el.tagName.toLowerCase()+(el.className?'.'+String(el.className).split(' ')[0]:'');
     if(visibleBg(el)||isLeaf(el))boxes.push([name,r]);
     for(const d of el.querySelectorAll('*')){if(ours(d))continue;const dc=getComputedStyle(d);if(dc.visibility==='hidden'||dc.display==='none')continue;const dr=d.getBoundingClientRect();if(dr.width<4||dr.height<4)continue;if(visibleBg(d)||isLeaf(d))boxes.push([name+' > '+(d.id?'#'+d.id:d.tagName.toLowerCase()),dr])}}
   const seen=new Set();for(const [n,r] of boxes){const a=inter(r,d);if(a>0&&!seen.has(n)){seen.add(n);out.overlaps.push(n+' '+Math.round(a)+'px²')}}
   // hero point must not be under our layer
   let hero=null;
   if(g==='contra'){const G=window.__game;const c=document.getElementById('c')||document.querySelector('canvas');const cr=c.getBoundingClientRect();const s=cr.height/224;hero=[cr.left+(G.player.x-G.cam)*s,cr.top+(G.player.y-12)*s]}
   if(g==='mantra'){hero=[vw/2,vh-Math.max(90,vh*0.16)]}
   if(g==='fort'){const pad=Math.min(80,vw*0.12);hero=[pad-10,vh*0.5]}
   if(g==='car'||g==='iso'||g==='arena'){hero=[vw/2,vh/2]}
   if(hero){const e=document.elementFromPoint(Math.max(0,Math.min(vw-1,hero[0])),Math.max(0,Math.min(vh-1,hero[1])));out.hero=[Math.round(hero[0]),Math.round(hero[1]),e?(e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0]):'none'];out.heroCovered=!!(e&&ours(e))}
   const hud=document.querySelector('.ag-hud');if(hud&&hud.classList.contains('on')){const h=hud.getBoundingClientRect();out.hudInView=h.left>=0&&h.right<=vw&&h.top>=0&&h.bottom<=vh;out.hudOnDock=inter(h,d)>0}
   return out},g);
  if(!r.inView)problems.push(label+': dock outside viewport '+JSON.stringify(r.dock));
  if(!r.topStrip)problems.push(label+': dock not in top strip '+JSON.stringify(r.dock));
  if(r.smallBtn.length)problems.push(label+': buttons <44px '+JSON.stringify(r.smallBtn));
  if(state==='collapsed'&&r.overlaps.length&&!(LANDSCAPE_ONLY[g]&&H>W))problems.push(label+': dock overlaps game UI '+r.overlaps.join(', '));
  if(r.heroCovered)problems.push(label+': hero covered by our UI at '+JSON.stringify(r.hero));
  if(r.hudInView===false)problems.push(label+': agent hud outside viewport');if(r.hudOnDock)problems.push(label+': agent hud overlaps dock');
  return r};
 const c1=await check('collapsed','collapsed');
 await p.tap('.tk-tog');await p.waitForTimeout(150);const c2=await check('expanded','expanded');
 await p.tap('.ag-btn');await p.waitForTimeout(150);const c3=await check('agent-on','expanded');
 await p.screenshot({path:'../ui_'+g+'_'+W+'x'+H+'.png'});
 if(errs.length)problems.push('js errors: '+errs.join(' | '));
 rows.push([g,W+'x'+H,problems.length?'FAIL':'ok',JSON.stringify(c1.dock),problems.join(' ;; ')]);fails+=problems.length?1:0;await p.close();}
for(const r of rows)console.log(r[2].padEnd(4),r[0].padEnd(7),r[1].padEnd(8),r[3].padEnd(22),r[4]);
console.log(fails?`\n${fails} FAILING case(s)`:'\nALL UI CASES PASS');await b.close();process.exit(fails?1:0)})();
