#!/usr/bin/env python3
"""PowerPoint import fidelity: each slide as LibreOffice draws the original
(left) next to how Revela imports it (right), one PNG per slide.

    tools/pptx-compare.py FILE.pptx OUT_DIR [slide numbers, e.g. 1 2 5-8] [--export]

With --export, the right side is the exported reveal.js presentation (what the
audience sees) instead of the editor's canvas.

Needs LibreOffice (soffice), pdftoppm and Pillow. The file is only read
locally: it is served to the headless browser from this machine.
"""
import base64, http.server, json, os, shutil, socketserver, subprocess, sys, threading, time
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = 640   # width of each half, px


def pages(args, total):
    out = []
    for a in args or [f'1-{total}']:
        a, b = (a.split('-') + [a])[:2]
        out += range(int(a), int(b) + 1)
    return [n for n in out if 1 <= n <= total]


def main():
    src, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    os.makedirs(out, exist_ok=True)
    ref = os.path.join(out, 'ref')
    os.makedirs(ref, exist_ok=True)
    pdf = os.path.join(ref, os.path.splitext(os.path.basename(src))[0] + '.pdf')
    if not os.path.exists(pdf):
        subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', ref, src], capture_output=True, timeout=600)
        subprocess.run(['pdftoppm', '-scale-to-x', str(W), '-scale-to-y', '-1', '-png', pdf, os.path.join(ref, 'p')], check=True)
    refs = sorted(f for f in os.listdir(ref) if f.startswith('p-') and f.endswith('.png'))

    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
        def log_message(s, *a): pass
        def do_GET(s):
            if s.path.startswith('/__export.html'):
                data = export_html[0].encode()
                s.send_response(200); s.send_header('Content-Type', 'text/html; charset=utf-8'); s.send_header('Content-Length', str(len(data))); s.end_headers(); s.wfile.write(data)
            elif s.path == '/__deck.pptx':
                data = open(src, 'rb').read()
                s.send_response(200); s.send_header('Content-Length', str(len(data))); s.end_headers(); s.wfile.write(data)
            else:
                super().do_GET()
    export_html = ['']
    srv = socketserver.TCPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    chrome = next(shutil.which(c) for c in ('google-chrome', 'chromium', 'chromium-browser') if shutil.which(c))
    r_in, w_in = os.pipe(); r_out, w_out = os.pipe()
    proc = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--remote-debugging-pipe', '--hide-scrollbars',
                             f'--user-data-dir={out}/.chrome'], preexec_fn=lambda: (os.dup2(r_in, 3), os.dup2(w_out, 4)),
                            pass_fds=(3, 4), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    n, buf = [0], [b'']

    def send(m, sid=None, **p):
        n[0] += 1; msg = {'id': n[0], 'method': m, 'params': p}
        if sid: msg['sessionId'] = sid
        os.write(w_in, json.dumps(msg).encode() + b'\0'); return n[0]

    def recv(want):
        while True:
            while b'\0' in buf[0]:
                raw, buf[0] = buf[0].split(b'\0', 1); m = json.loads(raw)
                if m.get('id') == want: return m
            buf[0] += os.read(r_out, 1 << 20)
    try:
        tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
        sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
        ev = lambda e: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True))['result'].get('result', {}).get('value')
        recv(send('Emulation.setDeviceMetricsOverride', sid, width=1600, height=1000, deviceScaleFactor=1, mobile=False))
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{srv.server_address[1]}/index.html?test')); time.sleep(2.5)
        total = ev("""(async()=>{const R=window.__revela;const b=await (await fetch('/__deck.pptx')).blob();
          const d=await R.pptxImport.importPPTX(new File([b],'deck.pptx'));R.store.replaceDeck(d);
          R.state.ui.zoom=640/d.size.w;R.render();return d.slides.length})()""")
        time.sleep(2)   # let start-up notices go before the first capture
        export = '--export' in sys.argv
        nums = pages([a for a in sys.argv[3:] if not a.startswith('--')], total)
        if export:
            export_html[0] = ev("window.__revela.io.buildHTML()")
            tid2 = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
            sid2 = recv(send('Target.attachToTarget', targetId=tid2, flatten=True))['result']['sessionId']
            recv(send('Emulation.setDeviceMetricsOverride', sid2, width=1280, height=720, deviceScaleFactor=W / 1280, mobile=False))
            flat = json.loads(ev("JSON.stringify([...window.__revela.io.slidePathsFor(window.__revela.state.deck).values()])"))
        for i in (nums if export else []):
            recv(send('Page.navigate', sid2, url=f'http://127.0.0.1:{srv.server_address[1]}/__export.html#/{flat[i - 1]}')); time.sleep(2.5)
            recv(send('Runtime.evaluate', sid2, expression="document.querySelector('.controls')&&(document.querySelector('.controls').style.display='none');document.querySelector('.progress')&&(document.querySelector('.progress').style.display='none')"))
            shot = recv(send('Page.captureScreenshot', sid2, format='png'))
            mine = os.path.join(out, f'export-{i:02d}.png')
            open(mine, 'wb').write(base64.b64decode(shot['result']['data']))
            a = Image.open(os.path.join(ref, refs[i - 1])); b = Image.open(mine)
            both = Image.new('RGB', (a.width + b.width + 8, max(a.height, b.height)), '#888')
            both.paste(a, (0, 0)); both.paste(b, (a.width + 8, 0))
            both.save(os.path.join(out, f'compare-export-{i:02d}.png')); print(os.path.join(out, f'compare-export-{i:02d}.png'))
        for i in ([] if export else nums):
            ev(f"(()=>{{const R=window.__revela;R.state.ui.slideIndex={i - 1};R.state.ui.selection=null;R.render();return 1}})()")
            time.sleep(0.6)
            box = json.loads(ev("JSON.stringify((r=>[r.left,r.top,r.width,r.height])(document.getElementById('stage').getBoundingClientRect()))"))
            shot = recv(send('Page.captureScreenshot', sid, format='png', clip={'x': box[0], 'y': box[1], 'width': box[2], 'height': box[3], 'scale': W / box[2]}))
            mine = os.path.join(out, f'revela-{i:02d}.png')
            open(mine, 'wb').write(base64.b64decode(shot['result']['data']))
            a = Image.open(os.path.join(ref, refs[i - 1])) if i - 1 < len(refs) else Image.new('RGB', (W, 360), 'white')
            b = Image.open(mine)
            both = Image.new('RGB', (a.width + b.width + 8, max(a.height, b.height)), '#888')
            both.paste(a, (0, 0)); both.paste(b, (a.width + 8, 0))
            both.save(os.path.join(out, f'compare-{i:02d}.png'))
            print(os.path.join(out, f'compare-{i:02d}.png'))
    finally:
        proc.kill(); srv.shutdown()


if __name__ == '__main__':
    main()
