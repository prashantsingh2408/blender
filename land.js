(function(){var m=document.getElementById('modes');if(m&&!document.getElementById('lnkhome')){var a=document.createElement('a');a.id='lnkhome';a.href='./';a.textContent='ALL GAMES';a.style.cssText='background:#1976d2;color:#fff;padding:10px 14px;border-radius:20px;text-decoration:none';m.insertBefore(a,m.firstChild)}})();
(function(){
var touch=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;if(!touch)return;
var d=document.createElement('div');d.id='rotov';
d.style.cssText='display:none;position:fixed;inset:0;z-index:99999;background:#0b1626;color:#fff;font:700 18px system-ui;text-align:center;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px';
d.innerHTML='<div style="font-size:64px;display:inline-block;animation:rr 1.6s ease-in-out infinite">&#128241;</div><div>Turn your phone sideways</div><div style="font:500 14px system-ui;color:#9db4cc;max-width:300px">This game plays best in landscape mode.</div><button id="rotb" style="padding:12px 22px;border:0;border-radius:22px;font:800 15px system-ui;background:#ffd24a;color:#10202e">TAP: FULLSCREEN + LOCK LANDSCAPE</button><style>@keyframes rr{0%,30%{transform:rotate(0)}70%,100%{transform:rotate(-90deg)}}</style>';
document.body.appendChild(d);
function lock(){try{var e=document.documentElement;var p=(!document.fullscreenElement&&e.requestFullscreen)?e.requestFullscreen():Promise.resolve();Promise.resolve(p).then(function(){return screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape')}).catch(function(){})}catch(x){}}
function chk(){d.style.display=innerHeight>innerWidth?'flex':'none'}
addEventListener('resize',chk);addEventListener('orientationchange',chk);chk();
document.getElementById('rotb').onclick=lock;
var first=true;addEventListener('pointerdown',function(){if(first){first=false;try{if(screen.orientation&&screen.orientation.lock&&document.fullscreenElement)screen.orientation.lock('landscape').catch(function(){})}catch(x){}}},{once:true});
try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(function(){})}catch(x){}
})();
