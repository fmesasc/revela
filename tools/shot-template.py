#!/usr/bin/env python3
"""Pictures of an example presentation's slides, as they look in the editor, in one sheet.
   python3 tools/shot-template.py KEY [OUT.png]   (needs Chrome; serves the repository locally)
   Also: --present N  takes slide N (1-based) while presenting, 2 s after it appears (animations, 3D).
         --editor N   the whole editor window on slide N (for the website's pictures); --gallery: the gallery open.
         --size WxH   the window's size (default 1600x1000); --dark: the editor in dark mode.
         --export     OUT is the presentation exported as a web page (File ▸ Export ▸ HTML), not a picture.
         --lang XX    the presentation and the interface in that language (its translation, src/features/content/tplang.js)
         --demo       with --export: for the website (site/demo/): it moves on by itself (Ns, --every N, default 6)
                      and loops until touched, not indexed, and its Google fonts copied next to it (no visits to Google)."""
import atexit, base64, http.server, json, os, shutil, socketserver, subprocess, sys, threading, time, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
def demo_page(html, folder):
    """The exported page, for the website: not indexed, and its Google fonts as files of its own."""
    import re, urllib.request
    UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'}
    os.makedirs(os.path.join(folder, 'fonts'), exist_ok=True)
    def local(m):
        css = urllib.request.urlopen(urllib.request.Request(m.group(1).replace('&amp;', '&'), headers=UA)).read().decode()
        def get(u):
            name = re.sub(r'[^\w.-]', '_', u.group(1).split('/s/')[-1])
            path = os.path.join(folder, 'fonts', name)
            if not os.path.exists(path): open(path, 'wb').write(urllib.request.urlopen(urllib.request.Request(u.group(1), headers=UA)).read())
            return f'url(fonts/{name})'
        # (only the Latin subsets: the others are left out)
        css = '\n'.join(b for b in re.split(r'(?=/\* )', css) if b.startswith('/* latin */') or b.startswith('/* latin-ext */'))
        return '<style>' + re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', get, css) + '</style>'
    html = re.sub(r'<link[^>]+href="(https://fonts\.googleapis\.com/[^"]+)"[^>]*>', local, html)
    html = re.sub(r'<link[^>]+href="https://fonts\.gstatic\.com[^"]*"[^>]*>', '', html)
    return html.replace('<head>', '<head>\n<meta name="robots" content="noindex">', 1)

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
    # (At the end, Chrome closed and its profile deleted — once it has finished writing to it: 700 left behind filled /tmp with 34 GB.)
    atexit.register(lambda: (proc.kill(), proc.wait(), [shutil.rmtree(prof, ignore_errors=True) or time.sleep(0.3) for _ in range(10) if os.path.exists(prof)]))   # (its helpers write on a moment)
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
    size = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--size'), '1600x1000'); W, H = map(int, size.split('x'))
    recv(send('Emulation.setDeviceMetricsOverride', sid, width=W, height=H, deviceScaleFactor=1, mobile=False))
    recv(send('Emulation.setEmulatedMedia', sid, features=[{'name': 'prefers-color-scheme', 'value': 'dark' if '--dark' in sys.argv else 'light'}]))
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test'))
    for _ in range(80):
        if ev('!!window.__revela'): break
        time.sleep(0.25)
    if '--dark' in sys.argv:                                  # (the editor's own setting: it doesn't follow the system by default)
        ev("import('/src/ui/shell/appearance.js').then(m=>{const a={mode:'dark'};localStorage.setItem('revela.appearance',JSON.stringify(a));m.applyAppearance(a);return 1})")
    lang = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--lang'), 'es')
    if lang != 'es':                                          # (the interface in that language too: the website's pictures per language)
        ev(f"window.__revela.i18n.setLang({json.dumps(lang)}).then(()=>{{window.__revela.render();return 1}})")
    count = ev(f"(()=>{{const R=window.__revela;return R.examples.loadExample({json.dumps(key)}, {json.dumps(lang)}).then(d=>d&&import('/src/ui/canvas/fittext.js').then(m=>m.fitTranslated(d))).then(d=>{{if(!d)return -1;R.store.replaceDeck(d);return d.slides.length}})}})()")
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
    if '--export' in sys.argv:                               # (the web page, as File ▸ Export makes it)
        if '--demo' in sys.argv:
            every = int(next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--every'), '6')) * 1000
            ev(f"(()=>{{const R=window.__revela;R.store.commit(()=>{{R.state.deck.loop=true;R.state.deck.slides.forEach(s=>{{s.autoSlide={every}}})}});return 1}})()")
        html = ev('window.__revela.io.buildHTML()')
        if '--demo' in sys.argv: html = demo_page(html, os.path.dirname(os.path.abspath(out)))
        open(out, 'w').write(html); print(out); proc.kill(); return
    from PIL import Image
    import io
    editor = next((int(sys.argv[i + 1]) for i, a in enumerate(sys.argv) if a == '--editor'), 0)
    if editor or '--gallery' in sys.argv:
        ev(f"(()=>{{const R=window.__revela;R.slides.goToSlide({max(0, editor - 1)});R.render();return 1}})()"); time.sleep(1); models(); time.sleep(1)
        if '--gallery' in sys.argv:                          # (the example presentations, with their covers)
            ev("(()=>{document.querySelector('[data-action=\"gallery\"]').click();return 1})()"); time.sleep(1)
            cat = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--group'), '')   # (--group creative: only that group)
            ev("(()=>{const b=document.querySelector('#gallery-modal .gal-bar');b.previousElementSibling.scrollIntoView({block:'start'});" + (f"b.querySelector('.gal-cat[data-cat={json.dumps(cat)}]').click();" if cat else '') + "return 1})()"); time.sleep(7)
        open(out, 'wb').write(shot()); print(out); proc.kill(); return
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
