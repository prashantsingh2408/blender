import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { canonicalUrl } from '../lib/canonical-url'
import siteMetadata from '../metadata.json'

const homepageMeta = siteMetadata['/']

// The game hub is plain HTML + CSS (same file as /home.html on the static site), rendered
// inline here so "/" IS the hub: no redirect, no intermediate screen.
const HUB_CSS = "*{box-sizing:border-box}\nhtml,body{margin:0;min-height:100%;background:#0f172a;color:#f8fafc;font-family:\"Noto Sans Devanagari\",system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif}\n.hub{min-height:100vh;padding:max(20px,env(safe-area-inset-top)) 16px 32px;display:flex;flex-direction:column;align-items:center;gap:26px}\nheader,section{width:100%;max-width:900px}\nh1{margin:0;font-size:clamp(28px,6vw,40px);font-weight:800;letter-spacing:-.01em}\nh1 span{color:#f59e0b}\np.s{margin:6px 0 0;color:#94a3b8;font-size:14px}\nh2{margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8}\n.pl{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}\n.pl button{flex:0 0 112px;scroll-snap-align:start;background:#1e293b;border:2px solid #1e293b;border-radius:16px;padding:12px 8px;color:#f8fafc;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:inherit}\n.pl button.sel{border-color:#f59e0b;background:#27354d}\n.pl i{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 24px system-ui,sans-serif;font-style:normal;color:#0f172a}\n.pl b{font-size:14px;line-height:1.15;text-align:center}\n.pl small{font-size:11px;color:#94a3b8;text-align:center;line-height:1.2}\n.pl em{font-style:normal;font-size:11px;font-weight:700;color:#f59e0b;min-height:14px}\n.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}\na.c{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;aspect-ratio:1/1;border-radius:18px;text-decoration:none;color:#fff;border:2px solid transparent;transition:transform .12s,border-color .12s}\na.c:hover,a.c:focus-visible{border-color:#f59e0b;transform:translateY(-2px)}\na.c:active{transform:scale(.97)}\na.c i{font-style:normal;font-size:52px;line-height:1}\na.c b{font-size:15px;text-align:center;padding:0 8px;line-height:1.2}\na.c small{font-size:11px;opacity:.85}\n.m{background:#5b21b6;border-color:#f59e0b!important}.a{background:#166534}.b{background:#6d28d9}.d{background:#c2410c}.e{background:#1d4ed8}.f{background:#0f766e}.h{background:#b91c1c}\nfooter{color:#64748b;font-size:12px;text-align:center}"
const HUB_HTML = "<header><h1>🎮 Gen AI <span>Games</span></h1><p class=\"s\">साथी चुनो → गेम चुनो → 🎤 बोलकर खेलो</p></header>\n\n<section>\n<h2>AI साथी</h2>\n<div class=\"pl\" id=\"pl\"></div>\n</section>\n\n<section>\n<h2>गेम</h2>\n<div class=\"g\">\n<a class=\"c m\" href=\"/mantra.html\"><i>🧙</i><b>Mantra Wars</b><small>सिर्फ़ आवाज़ से · मंत्र बोलो</small></a>\n<a class=\"c a\" href=\"/contra.html\"><i>🔫</i><b>Jungle Commando</b><small>शूटर · 🎧 वॉइस ऑटोपायलट</small></a>\n<a class=\"c b\" href=\"/racer.html\"><i>🏎️</i><b>Talking Racer</b><small>रेसिंग · बॉस से बात</small></a>\n<a class=\"c h\" href=\"/fort.html\"><i>🏰</i><b>Command Fort</b><small>स्ट्रैटेजी · आवाज़ से सेना</small></a>\n<a class=\"c d\" href=\"/car.html\"><i>🚙</i><b>Hill Rally</b><small>पहाड़ी कार</small></a>\n<a class=\"c e\" href=\"/iso.html\"><i>🕵️</i><b>Agent GO</b><small>पज़ल</small></a>\n<a class=\"c f\" href=\"/arena.html\"><i>🚀</i><b>Jetpack Arena</b><small>मल्टीप्लेयर</small></a>\n</div>\n</section>\n<footer>हर गेम में 🎤 बोलो बटन · Chrome में सबसे अच्छा</footer>"
const HUB_SCRIPT = "var PLAYERS=[\n {id:'rocky',name:'रॉकी',color:'#ef4444',trait:'घमंडी · आक्रामक'},\n {id:'madam',name:'मैडम नाइट्रो',color:'#a855f7',trait:'शांत · तंज़'},\n {id:'bolt',name:'बोल्ट',color:'#3b82f6',trait:'तेज़ · घबराया'},\n {id:'tapori',name:'अपुन टपोरी',color:'#f97316',trait:'मुंबई · मज़ाकिया'},\n {id:'champ',name:'चैम्पियन',color:'#22c55e',trait:'इज़्ज़त · साफ़ खेल'}\n];\nvar cur=null;try{cur=localStorage.getItem('genai_player')}catch(e){}\nif(!cur){cur='rocky';try{localStorage.setItem('genai_player',cur);localStorage.setItem('tr_char',JSON.stringify(cur))}catch(e){}}\nfunction render(){var el=document.getElementById('pl');el.innerHTML='';PLAYERS.forEach(function(p){var b=document.createElement('button');b.className=p.id===cur?'sel':'';b.setAttribute('aria-pressed',p.id===cur);b.innerHTML='<i></i><b></b><small></small><em></em>';b.children[0].style.background=p.color;b.children[0].textContent=p.name[0];b.children[1].textContent=p.name;b.children[2].textContent=p.trait;b.children[3].textContent=p.id===cur?'✓ साथी':'';b.onclick=function(){cur=p.id;try{localStorage.setItem('genai_player',cur);localStorage.setItem('tr_char',JSON.stringify(cur))}catch(e){}render();try{var u=new SpeechSynthesisUtterance(p.name+' तैयार।');u.lang='hi-IN';speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}};el.appendChild(b)})}\nrender();"

export const Route = createFileRoute('/')({
  head: () => {
    const canonical = canonicalUrl('/')
    return {
      meta: [
        { title: homepageMeta.title },
        { name: 'description', content: homepageMeta.description },
        { name: 'theme-color', content: '#0f172a' },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    }
  },
  component: App,
})

function App() {
  useEffect(() => {
    const s = document.createElement('script')
    s.textContent = HUB_SCRIPT
    document.body.appendChild(s)
    return () => {
      s.remove()
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HUB_CSS }} />
      <div className="hub" dangerouslySetInnerHTML={{ __html: HUB_HTML }} />
    </>
  )
}
