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
