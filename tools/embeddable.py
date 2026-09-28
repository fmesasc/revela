#!/usr/bin/env python3
"""Which web pages can be shown inside a presentation (an iframe), tested in
real headless Chrome, since some sites answer differently to curl.

    tools/embeddable.py https://site1 https://site2 ...

Prints "funciona" or "BLOQUEADA" for each, and the browser's reason.
"""
import tempfile, json, os, subprocess, sys, time, shutil, http.server, socketserver, threading
URLS = sys.argv[1:]
html = '<!doctype html><body>' + ''.join(f'<iframe src="{u}" width="400" height="300"></iframe>' for u in URLS)
d = tempfile.mkdtemp(prefix='revela-embed-'); open(os.path.join(d, 'frames.html'), 'w').write(html)
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=d, **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
chrome = shutil.which('google-chrome') or shutil.which('chromium')
r_in, w_in = os.pipe(); r_out, w_out = os.pipe()
p = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--remote-debugging-pipe', '--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process', f'--user-data-dir={d}/prof'],
    preexec_fn=lambda: (os.dup2(r_in, 3), os.dup2(w_out, 4)), pass_fds=(3, 4), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
n = [0]; buf = b''; logs = []
def send(m, sid=None, **pa):
    n[0] += 1; msg = {'id': n[0], 'method': m, 'params': pa}
    if sid: msg['sessionId'] = sid
    os.write(w_in, json.dumps(msg).encode() + b'\0'); return n[0]
def recv(want, until=None):
    global buf
    while True:
        while b'\0' in buf:
            raw, buf = buf.split(b'\0', 1); m = json.loads(raw)
            if m.get('method') == 'Runtime.consoleAPICalled' or m.get('method') == 'Log.entryAdded':
                logs.append(m.get('params', {}).get('entry', {}).get('text', ''))
            if want and m.get('id') == want: return m
        buf += os.read(r_out, 1 << 16)
tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
recv(send('Log.enable', sid)); recv(send('Page.enable', sid))
recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{srv.server_address[1]}/frames.html')); time.sleep(12)
tree = recv(send('Page.getFrameTree', sid))['result']['frameTree']
for c in tree.get('childFrames', []):
    f = c['frame']; print(('BLOQUEADA ' if f['url'].startswith('chrome-error') or f.get('unreachableUrl') else 'funciona  ') + (f.get('unreachableUrl') or f['url'])[:110])
refused = [l for l in logs if 'Refused' in l or 'frame-ancestors' in l]
for l in refused: print('  ', l)
p.kill(); srv.shutdown()
