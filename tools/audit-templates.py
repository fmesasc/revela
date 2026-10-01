#!/usr/bin/env python3
"""Checks how the example presentations look in the editor, slide by slide: text that
   doesn't fit its box, objects out of the slide, text over other text or over a chart,
   table or picture, and text with little contrast against a plain background.
   python3 tools/audit-templates.py [GROUP_OR_FILE …] [--json OUT]   (needs Chrome)
   Prints one line per problem: key, slide, kind, what. Exits with 1 if there are any."""
import base64, http.server, json, os, shutil, socketserver, subprocess, sys, threading, time, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK = r"""(()=>{
const st=document.querySelector('#stage-grid .stage')||document.querySelector('#stage'), S=st.getBoundingClientRect(), k=S.width/1280, out=[];
const els=[...st.querySelectorAll('.block')].filter(e=>e._b&&getComputedStyle(e).display!=='none');
const exits=b=>[b.animation,...(b.anims||[])].some(a=>a&&/out|path|current-visible/.test(a.effect||''));
const ink=e=>{const r=e.querySelector('.rich');if(!r)return[];const out=[],w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);for(let n;(n=w.nextNode());){if(!n.textContent.trim())continue;const fs=parseFloat(getComputedStyle(n.parentElement).fontSize);const g=document.createRange();g.selectNodeContents(n);
  for(const x of g.getClientRects()){if(x.width<1)continue;const mid=x.top+x.height/2+fs*.05;out.push(new DOMRect(x.left,mid-fs*.36,x.width,fs*.68))}}return out};
const area=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
const txt=e=>(e.querySelector('.rich')?.innerText||'').replace(/\s+/g,' ').trim().slice(0,50);
const lum=c=>{const m=c.match(/[\d.]+/g);if(!m)return null;const [r,g,b]=m.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
const bgOf=e=>{for(let x=e;x&&x!==st.parentElement;x=x.parentElement){const s=getComputedStyle(x);if(s.backgroundImage!=='none')return null;const c=s.backgroundColor;if(c&&!/rgba\(.*, 0\)|transparent/.test(c)){const a=c.match(/[\d.]+/g);if(a.length<4||+a[3]>.9)return c;return null}}return null};
for(const e of els){const b=e._b,r=e.getBoundingClientRect();
  if(b.type==='text'&&!b.curve){const rich=e.querySelector('.rich');if(rich&&ink(e).some(x=>x.bottom>r.bottom+3||x.right>r.right+3||x.top<r.top-3||x.left<r.left-3))out.push(['no cabe',txt(e)]);
    const L=ink(e);if(L.some(x=>x.left<S.left-1||x.right>S.right+1||x.top<S.top-1||x.bottom>S.bottom+1))out.push(['texto fuera',txt(e)]);
    // (Contrast: each piece of text's own colour against what is right under its middle — only when that is the
    // slide or a plain box, whose colour is known; over shapes, pictures or gradients it isn't checked.)
    if(!b.wordart&&rich){const w=document.createTreeWalker(rich,NodeFilter.SHOW_TEXT);let worst=null;
      for(let n;(n=w.nextNode());){if(!n.textContent.trim())continue;const pe=n.parentElement,c=getComputedStyle(pe);if(/text/.test(c.backgroundClip+c.webkitBackgroundClip)||/rgba\(.*, 0\)$/.test(c.color)||c.textShadow!=='none')continue;
        const g=document.createRange();g.selectNodeContents(n);const q=g.getClientRects()[0];if(!q)continue;
        const stack=document.elementsFromPoint(q.left+q.width/2,q.top+q.height/2),below=stack.find(x=>!e.contains(x)&&x!==e)||null;
        const own=bgOf(pe);let bg=null;if(own&&e.contains([...stack].find(x=>{const s=getComputedStyle(x);return s.backgroundColor&&!/rgba\(.*, 0\)|transparent/.test(s.backgroundColor)})||document.body))bg=own;
        else if(below&&(below===st||below.classList.contains('stage')))bg=bgOf(below);
        if(!bg)continue;const a=lum(bg),f=lum(c.color);if(a==null||f==null)continue;const ratio=(Math.max(a,f)+.05)/(Math.min(a,f)+.05);if(!worst||ratio<worst)worst=ratio}
      if(worst&&worst<2.6)out.push(['poco contraste',txt(e)+' ('+worst.toFixed(1)+')'])}}
  if(['chart','table','code','math','poll','diagram','timer'].includes(b.type)&&(r.left<S.left-2||r.top<S.top-2||r.right>S.right+2||r.bottom>S.bottom+2))out.push(['fuera',b.type]);}
const T=els.filter(e=>e._b.type==='text'&&!exits(e._b));
for(let i=0;i<T.length;i++)for(let j=i+1;j<T.length;j++){const A=ink(T[i]),B=ink(T[j]);let s=0;for(const a of A)for(const c of B)s+=area(a,c);if(s>40*k*k)out.push(['textos encima',txt(T[i])+' / '+txt(T[j])]);}
const C=els.filter(e=>['chart','table','image','code','poll','diagram','math'].includes(e._b.type)&&!exits(e._b));
for(const t of T)for(const c of C){if(t.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_PRECEDING&&false)continue;const cr=c.getBoundingClientRect();const s=ink(t).reduce((m,a)=>m+area(a,cr),0);
  if(s>200*k*k&&!(c._b.type==='image'&&els.indexOf(c)<els.indexOf(t)))out.push(['texto sobre '+c._b.type,txt(t)]);}
return out})()"""
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
def main():
    subprocess.run(['node', os.path.join(ROOT, 'tools', 'build-catalog.mjs')], check=True, stdout=subprocess.DEVNULL)   # (the list, up to date)
    srv = socketserver.TCPServer(('127.0.0.1', 0), Q); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
    chrome = next(shutil.which(c) for c in ('google-chrome', 'chromium', 'chromium-browser') if shutil.which(c))
    r_in, w_in = os.pipe(); r_out, w_out = os.pipe()
    def child(): os.dup2(r_in, 3); os.dup2(w_out, 4)
    prof = tempfile.mkdtemp(prefix='tpl-')
    proc = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-pipe', '--user-data-dir=' + prof, '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
                            preexec_fn=child, pass_fds=(3, 4), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.close(r_in); os.close(w_out); buf = [b'']; n = [0]
    def send(m, sid=None, **p):
        n[0] += 1; msg = {'id': n[0], 'method': m, 'params': p}
        if sid: msg['sessionId'] = sid
        os.write(w_in, json.dumps(msg).encode() + b'\0'); return n[0]
    def recv(w):
        while True:
            while b'\0' in buf[0]:
                raw, buf[0] = buf[0].split(b'\0', 1); m = json.loads(raw)
                if m.get('id') == w: return m
            buf[0] += os.read(r_out, 1 << 16)
    tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
    sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
    ev = lambda e: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True)).get('result', {}).get('result', {}).get('value')
    recv(send('Emulation.setDeviceMetricsOverride', sid, width=1600, height=1000, deviceScaleFactor=1, mobile=False))
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test'))
    for _ in range(80):
        if ev('!!window.__revela'): break
        time.sleep(0.25)
    keys = ev("(()=>{const E=window.__revela.examples.EXAMPLES;return Object.entries(E).map(([k,v])=>[k,v.cat,v.file||''])})()")
    only = [a for a in sys.argv[1:] if not a.startswith('--') and a != json_out]
    keys = [k for k, c, f in keys if not only or c in only or f in only or k in only]
    found = []
    for key in keys:
        cnt = ev(f"window.__revela.examples.loadExample({json.dumps(key)}).then(d=>{{window.__revela.store.replaceDeck(d);return d.slides.length}})")
        ev("document.fonts.ready.then(()=>1)"); time.sleep(0.4)
        for i in range(cnt or 0):
            ev(f"(()=>{{const R=window.__revela;R.slides.goToSlide({i});R.render();return 1}})()"); time.sleep(0.35)
            for kind, what in ev(CHECK) or []:
                found.append({'key': key, 'slide': i + 1, 'kind': kind, 'what': what})
                print(f'{key}  {i + 1}  {kind}: {what}', flush=True)
    if json_out: json.dump(found, open(json_out, 'w'), ensure_ascii=False, indent=1)
    print(f'{len(keys)} presentaciones revisadas, {len(found)} avisos')
    proc.kill(); sys.exit(1 if found else 0)
json_out = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--json'), None)
main()
