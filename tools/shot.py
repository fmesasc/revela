#!/usr/bin/env python3
"""Screenshot of the editor after running some JavaScript, for visual checks.

    tools/shot.py OUT.png "JS to run (window.__revela is R)" [CSS selector to clip to] [--scale=3] [--size=1280x800]

Serves the repo, opens index.html?test in headless Chrome (like tests/run.py),
starts from a new deck, runs the JS, waits a moment and saves the screenshot
(of the whole page, or of the selector's box with some margin).
"""
import base64, http.server, json, os, shutil, socketserver, subprocess, sys, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass


def main():
    opts = [a for a in sys.argv[1:] if a.startswith('--')]
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out, js, sel = args[0], args[1] if len(args) > 1 else '', args[2] if len(args) > 2 else ''
    scale = float(next((o.split('=')[1] for o in opts if o.startswith('--scale=')), '2'))
    w, h = map(int, next((o.split('=')[1] for o in opts if o.startswith('--size=')), '1280x800').split('x'))
    chrome = next((shutil.which(c) for c in ('google-chrome', 'chromium', 'chromium-browser') if shutil.which(c)), None)
    srv = socketserver.TCPServer(('127.0.0.1', 0), Quiet)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    r_in, w_in = os.pipe(); r_out, w_out = os.pipe()
    def child():
        os.dup2(r_in, 3); os.dup2(w_out, 4)
    proc = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-pipe',
                             '--user-data-dir=' + os.path.join(os.environ.get('TMPDIR', '/tmp'), f'revela-shot-{os.getpid()}')],
                            preexec_fn=child, pass_fds=(3, 4), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.close(r_in); os.close(w_out)
    buf, n = b'', [0]

    def send(method, sid=None, **params):
        n[0] += 1
        msg = {'id': n[0], 'method': method, 'params': params}
        if sid: msg['sessionId'] = sid
        os.write(w_in, json.dumps(msg).encode() + b'\0')
        return n[0]

    def recv(want):
        nonlocal buf
        while True:
            while b'\0' in buf:
                raw, buf = buf.split(b'\0', 1)
                m = json.loads(raw)
                if m.get('id') == want: return m
            buf += os.read(r_out, 1 << 16)

    try:
        tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
        sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
        ev = lambda e: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True)).get('result', {}).get('result', {})
        recv(send('Emulation.setDeviceMetricsOverride', sid, width=w, height=h, deviceScaleFactor=scale, mobile=False))
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test')); time.sleep(2.5)
        ev("(()=>{const R=window.__revela;R.store.replaceDeck(R.model.emptyDeck());R.render();return 1})()")
        if js:
            r = ev(f"(async()=>{{const R=window.__revela;{js};return 'ok'}})()")
            if r.get('subtype') == 'error': print('JS:', r.get('description')); return 1
        time.sleep(0.8)
        clip = None
        if sel:
            b = ev(f"(()=>{{const r=document.querySelector({json.dumps(sel)}).getBoundingClientRect();return JSON.stringify([r.left,r.top,r.width,r.height])}})()").get('value')
            x, y, cw, ch = json.loads(b); m = 12
            clip = {'x': max(0, x - m), 'y': max(0, y - m), 'width': cw + 2 * m, 'height': ch + 2 * m, 'scale': 1}
        params = {'format': 'png'}
        if clip: params['clip'] = clip
        data = recv(send('Page.captureScreenshot', sid, **params))['result']['data']
        open(out, 'wb').write(base64.b64decode(data))
        print(out)
    finally:
        proc.kill(); srv.shutdown()


if __name__ == '__main__':
    sys.exit(main())
