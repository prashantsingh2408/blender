(function(){var m=document.getElementById('modes');if(m&&!document.getElementById('lnkhome')){var a=document.createElement('a');a.id='lnkhome';a.href='./';a.textContent='ALL GAMES';a.style.cssText='background:#1976d2;color:#fff;padding:10px 14px;border-radius:20px;text-decoration:none';m.insertBefore(a,m.firstChild)}})();
(function(){
var touch=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;if(!touch)return;
var d=document.createElement('div');d.id='rotov';
d.style.cssText='display:none;position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:99999;background:rgba(11,22,38,.94);color:#fff;font:700 13px system-ui;text-align:center;flex-direction:row;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;max-width:96vw;box-shadow:0 4px 14px rgba(0,0,0,.5)';
d.innerHTML='<span style="font-size:22px;display:inline-block;animation:rr 1.6s ease-in-out infinite">&#128241;</span><span>फ़ोन घुमाओ (landscape बेहतर)</span><button id="rotb" style="padding:6px 10px;border:0;border-radius:12px;font:800 12px system-ui;background:#ffd24a;color:#10202e">लैंडस्केप लॉक</button><button id="rotx" aria-label="बंद" style="padding:6px 9px;border:0;border-radius:12px;font:800 12px system-ui;background:#334155;color:#fff">✕</button><style>@keyframes rr{0%,30%{transform:rotate(0)}70%,100%{transform:rotate(-90deg)}}</style>';
document.body.appendChild(d);
function lock(){try{var e=document.documentElement;var p=(!document.fullscreenElement&&e.requestFullscreen)?e.requestFullscreen():Promise.resolve();Promise.resolve(p).then(function(){return screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape')}).catch(function(){})}catch(x){}}
var dismissed=false;function chk(){d.style.display=(!dismissed&&innerHeight>innerWidth)?'flex':'none'}
addEventListener('resize',chk);addEventListener('orientationchange',chk);chk();
document.getElementById('rotb').onclick=lock;document.getElementById('rotx').onclick=function(){dismissed=true;chk()};setTimeout(function(){dismissed=true;chk()},6000);
var first=true;addEventListener('pointerdown',function(){if(first){first=false;try{if(screen.orientation&&screen.orientation.lock&&document.fullscreenElement)screen.orientation.lock('landscape').catch(function(){})}catch(x){}}},{once:true});
try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(function(){})}catch(x){}
})();
