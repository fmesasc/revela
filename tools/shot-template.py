#!/usr/bin/env python3
"""Pictures of an example presentation's slides, as they look in the editor, in one sheet.
   python3 tools/shot-template.py KEY [OUT.png]   (needs Chrome; serves the repository locally)
   Also: --present N  takes slide N (1-based) while presenting, 2 s after it appears (animations, 3D)."""
import base64, http.server, json, os, shutil, socketserver, subprocess, sys, threading, time, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    key = args[0]; out = args[1] if len(args) > 1 else f'/tmp/tpl-{key}.png'
    subprocess.run(['node', os.path.join(ROOT, 'tools', 'build-catalog.mjs')], check=True, stdout=subprocess.DEVNULL)   # (the list, up to date)
    present = next((int(sys.argv[i + 1]) for i, a in enumerate(sys.argv) if a == '--present'), 0)
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
    count = ev(f"(()=>{{const R=window.__revela;return R.examples.loadExample({json.dumps(key)}).then(d=>{{if(!d)return -1;R.store.replaceDeck(d);return d.slides.length}})}})()")
    if count is None or count < 0: print('No existe', key); sys.exit(1)
    ev("document.fonts.ready.then(()=>1)"); time.sleep(1.5)
    # (3D models: up to 30 s for them to load, in the editor and in the presentation's frame.)
    def models():
        ev("""new Promise(ok=>{const t0=Date.now();const all=()=>{const docs=[document,...[...document.querySelectorAll('iframe')].map(f=>{try{return f.contentDocument}catch(e){return null}}).filter(Boolean)];return docs.flatMap(d=>[...d.querySelectorAll('model-viewer')])};
          const tick=()=>{const m=all();if(m.every(x=>x.loaded||x.getAttribute('src')===null)||Date.now()-t0>30000)ok(1);else setTimeout(tick,250)};tick()})""")
    def shot(clip=None):
        p = {'format': 'png'}
        if clip: p['clip'] = {**clip, 'scale': 1}
        return base64.b64decode(recv(send('Page.captureScreenshot', sid, **p))['result']['data'])
    from PIL import Image
    import io
    if present:
        ev(f"(()=>{{const R=window.__revela;R.slides.goToSlide({present - 1});R.io.present({{fullscreen:false,fromCurrent:true}});return 1}})()"); time.sleep(2); models(); time.sleep(2)
        open(out, 'wb').write(shot()); print(out); return
    ims = []
    for i in range(count):
        ev(f"(()=>{{const R=window.__revela;R.slides.goToSlide({i});R.render();return 1}})()"); time.sleep(0.5); models(); time.sleep(0.6)
        r = ev("(()=>{const e=document.querySelector('#stage-grid .stage')||document.querySelector('#stage');const b=e.getBoundingClientRect();return [b.left,b.top,b.width,b.height]})()")
        im = Image.open(io.BytesIO(shot({'x': r[0], 'y': r[1], 'width': r[2], 'height': r[3]})))
        ims.append(im.resize((640, int(640 * im.height / im.width))))
    cols = 3; w, h = ims[0].size
    sheet = Image.new('RGB', (cols * (w + 8), ((len(ims) + cols - 1) // cols) * (h + 8)), '#666')
    for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * (w + 8), (i // cols) * (h + 8)))
    sheet.save(out); print(out, f'({count} diapositivas)')
    proc.kill()
main()
