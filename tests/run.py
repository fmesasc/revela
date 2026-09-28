#!/usr/bin/env python3
"""Headless test runner in real time (no virtual clock), so that media APIs
(camera, MediaRecorder) work with Chrome's fake devices.

It talks to Chrome over --remote-debugging-pipe (file descriptors 3 and 4,
NUL-separated JSON), which needs only the Python standard library.
Prints "REVELATEST PASS n/n" or "REVELATEST FAIL ..."; exit code 0 on pass.
"""
import http.server, json, os, shutil, socketserver, subprocess, sys, tempfile, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIMEOUT = float(os.environ.get('REVELA_TEST_TIMEOUT', '180'))


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass


def touch_checks(send, recv, port):
    import json as _j
    tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
    sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
    ev = lambda e: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True)).get('result', {}).get('result', {}).get('value')
    def touch(kind, x=0, y=0): recv(send('Input.dispatchTouchEvent', sid, type=kind, touchPoints=([] if kind == 'touchEnd' else [{'x': x, 'y': y}])))
    recv(send('Emulation.setDeviceMetricsOverride', sid, width=390, height=844, deviceScaleFactor=2, mobile=True))
    recv(send('Emulation.setTouchEmulationEnabled', sid, enabled=True, maxTouchPoints=5))
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test')); time.sleep(3)
    fails = []
    def check(ok, name):
        if not ok: fails.append('✗ táctil: ' + name)
    rect = lambda sel: _j.loads(ev(f"(()=>{{const r=document.querySelector({_j.dumps(sel)}).getBoundingClientRect();return JSON.stringify({{x:r.left+r.width/2,y:r.top+r.height/2,l:r.left,t:r.top}})}})()"))
    bid = ev("window.__revela.store.currentSlide().blocks[1].id"); sel = f'#stage .block[data-id="{bid}"]'
    r = rect(sel); touch('touchStart', r['x'], r['y']); touch('touchEnd'); time.sleep(0.3)
    check(ev("window.__revela.state.ui.selection") == bid, 'tocar selecciona')
    x0 = ev("window.__revela.store.currentSlide().blocks[1].x")
    touch('touchStart', r['x'], r['y'])
    for i in range(1, 9): touch('touchMove', r['x'] + i * 4, r['y']); time.sleep(0.02)
    touch('touchEnd'); time.sleep(0.3)
    check(ev("window.__revela.store.currentSlide().blocks[1].x") > x0, 'arrastrar mueve')
    ev("(()=>{const b=window.__revela.store.currentSlide().blocks[1];b.x=140;b.w=600;window.__revela.render();return 1})()"); time.sleep(0.2)
    h = rect(sel + ' .handle-size.se'); w0 = ev("window.__revela.store.currentSlide().blocks[1].w")
    touch('touchStart', h['x'], h['y'])
    for i in range(1, 9): touch('touchMove', h['x'] + i * 4, h['y']); time.sleep(0.02)
    touch('touchEnd'); time.sleep(0.3)
    check(ev("window.__revela.store.currentSlide().blocks[1].w") > w0, 'redimensionar con el tirador')
    r = rect(sel); touch('touchStart', r['l'] + 10, r['t'] + 10); time.sleep(0.8); touch('touchEnd'); time.sleep(0.3)
    items = ev("document.querySelector('.ctx-item')?.closest('[hidden]') ? '' : [...document.querySelectorAll('.ctx-item')].map(x=>x.textContent).join('|')") or ''
    check(items.startswith('Copiar|Cortar|Pegar'), 'pulsación larga abre el menú con Copiar/Cortar/Pegar (' + items[:40] + ')')
    ev("[...document.querySelectorAll('.ctx-item')].find(x=>x.textContent==='Copiar')?.click();1"); time.sleep(0.2)
    n0 = ev("window.__revela.store.currentSlide().blocks.length"); p = rect('[data-action="clip-paste"]')
    touch('touchStart', p['x'], p['y']); touch('touchEnd'); time.sleep(0.4)
    check(ev("window.__revela.store.currentSlide().blocks.length") == n0 + 1, 'pegar desde la cinta')
    t0 = rect(f'#stage .block[data-id="{ev("window.__revela.store.currentSlide().blocks[0].id")}"]')
    for _ in range(2): touch('touchStart', t0['x'], t0['y']); touch('touchEnd'); time.sleep(0.12)
    time.sleep(0.3); check(ev("!!document.querySelector('#stage .block.editing')"), 'doble toque para escribir')
    return fails


def main():
    chrome = next((shutil.which(c) for c in ('google-chrome', 'chromium', 'chromium-browser') if shutil.which(c)), None)
    if not chrome:
        print('No se encontró Chrome/Chromium'); return 2
    srv = socketserver.TCPServer(('127.0.0.1', 0), Quiet)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    r_in, w_in = os.pipe()     # we write → Chrome reads (fd 3)
    r_out, w_out = os.pipe()   # Chrome writes (fd 4) → we read
    prof = tempfile.mkdtemp(prefix='revela-test-')

    def child():
        os.dup2(r_in, 3); os.dup2(w_out, 4)

    proc = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-pipe',
                             '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
                             '--autoplay-policy=no-user-gesture-required', '--window-size=1400,900',
                             '--user-data-dir=' + prof, 'about:blank'],
                            pass_fds=(r_in, w_out, 3, 4), preexec_fn=child,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.close(r_in); os.close(w_out)
    buf = b''; ids = [0]

    def send(method, session=None, **params):
        ids[0] += 1
        msg = {'id': ids[0], 'method': method, 'params': params}
        if session: msg['sessionId'] = session
        os.write(w_in, json.dumps(msg).encode() + b'\0')
        return ids[0]

    def recv(want):
        nonlocal buf
        while True:
            while b'\0' in buf:
                raw, buf = buf.split(b'\0', 1)
                m = json.loads(raw)
                if m.get('id') == want: return m
            chunk = os.read(r_out, 1 << 16)
            if not chunk: raise RuntimeError('Chrome se cerró')
            buf += chunk

    try:
        tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
        sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/tests/index.html'))
        deadline = time.time() + TIMEOUT
        out = ''
        while time.time() < deadline:
            time.sleep(1)
            r = recv(send('Runtime.evaluate', sid, returnByValue=True,
                          expression="/^REVELATEST (PASS|FAIL)/.test(document.title)?document.title:''"))
            out = r.get('result', {}).get('result', {}).get('value') or ''
            if out: break
        # Touch checks with real touch events on a phone-sized page (the suite
        # itself runs with mouse events).
        touch_fail = touch_checks(send, recv, port) if out.startswith('REVELATEST PASS') else []
        if touch_fail:
            print('REVELATEST FAIL touch'); print('\n'.join(touch_fail)); return 1
        if out.startswith('REVELATEST PASS'): out += ' + táctil 6/6'
        if out.startswith('REVELATEST FAIL'):
            r = recv(send('Runtime.evaluate', sid, returnByValue=True,
                          expression="[...document.querySelectorAll('.row.ko')].map(e=>e.innerText.replace(/\\s+/g,' ')).join('\\n')"))
            detail = r.get('result', {}).get('result', {}).get('value') or ''
            print(out); print(detail[:4000]); return 1
        print(out or 'REVELATEST FAIL (sin resultado)')
        return 0 if out.startswith('REVELATEST PASS') else 1
    finally:
        proc.kill(); srv.shutdown(); shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
