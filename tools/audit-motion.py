#!/usr/bin/env python3
"""Checks what every example presentation's motion does, from the decks themselves (tools/motioncheck.mjs): animations
   that never play or leave the slide wrong, a title that comes after its content, steps with holes, automatic advance
   too quick for the words, links that lead nowhere, background videos that aren't there, maps and 3D with nothing to show
   without a connection, loud transitions in a serious talk. Quick: no pictures (tools/play-templates.py plays them).
   python3 tools/audit-motion.py [GROUP_OR_FILE_OR_KEY …] [--lang XX[,YY…]] [--json OUT] [--loud] [--risky]
   --risky: only prints the keys of the presentations whose playing most needs looking at (maps, 3D, video, embedded pages).
   Prints one line per problem: key, lang, slide, kind: what. Exits with 1 if there are any. (Chrome: one at a time.)"""
import atexit, http.server, json, os, shutil, socketserver, subprocess, sys, tempfile, threading, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
def opt(name, d=None):
    if name in args: i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return d
LANGS = opt('--lang', 'es').split(','); JSON_OUT = opt('--json'); LOUD = '--loud' in args; RISKY = '--risky' in args; args = [a for a in args if a not in ('--loud', '--risky')]

class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass

JS = r"""(async()=>{const R=window.__revela,E=R.examples,M=await import('/tools/motioncheck.mjs'),known=await M.knownFor();
  const keys=%s,lang=%s,loud=%s,out=[];
  const list=Object.entries(E.EXAMPLES).filter(([k,v])=>!keys.length||keys.includes(k)||keys.includes(v.cat)||keys.includes(v.file||'')).map(([k])=>k);
  for(const k of list){const d=await E.loadExample(k,lang);if(!d){out.push([k,'no carga','','']);continue}
    for(const [kind,where,what] of M.checkDeck(d,known,k))out.push([k,kind,where,what]);
    if(loud){const dt=d.defaultTransition,n=d.slides.filter(s=>M.LOUD.has(s.transition||dt)).length;if(n>=3)out.push([k,'transiciones llamativas',n+' diapositivas',[...new Set(d.slides.map(s=>s.transition||dt).filter(t=>M.LOUD.has(t)))].join(', ')])}}
  const risky=[];for(const k of list){const d=await E.loadExample(k,lang);if(!d)continue;let m=0,a=0,v=0;for(const s of d.slides){if(s.bgVideo)v++;for(const b of s.blocks||[]){if(['map','model','embed','video'].includes(b.type))m++;a+=[b.animation,...(b.anims||[])].filter(Boolean).length}}if(m||v)risky.push(k)}
  return JSON.stringify({n:list.length,out,risky})})()"""

def main():
    subprocess.run(['node', os.path.join(ROOT, 'tools', 'build-catalog.mjs')], check=True, stdout=subprocess.DEVNULL)
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Q); srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
    chrome = next(shutil.which(c) for c in ('google-chrome', 'chromium', 'chromium-browser') if shutil.which(c))
    sys.path.insert(0, os.path.join(ROOT, 'tools')); from chromeprof import profile
    prof = profile('revela-motion')
    r_in, w_in = os.pipe(); r_out, w_out = os.pipe()
    proc = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-pipe', '--user-data-dir=' + prof],
                            preexec_fn=lambda: (os.dup2(r_in, 3), os.dup2(w_out, 4)), pass_fds=(3, 4), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    atexit.register(lambda: (proc.kill(), proc.wait()))
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
    ev = lambda e: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True))['result']
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test'))
    for _ in range(80):
        if ev('!!window.__revela').get('result', {}).get('value'): break
        time.sleep(0.25)
    found, total = [], 0
    for lang in LANGS:
        r = ev(JS % (json.dumps(args), json.dumps(lang), 'true' if LOUD else 'false'))
        if 'exceptionDetails' in r: print('error:', json.dumps(r['exceptionDetails'])[:400]); sys.exit(2)
        d = json.loads(r['result']['value']); total = d['n']
        if RISKY: print(' '.join(d['risky'])); sys.exit(0)
        for key, kind, where, what in d['out']:
            found.append({'key': key, 'lang': lang, 'kind': kind, 'where': where, 'what': what})
            print(f'{key}  {lang}  {where}  {kind}: {what}', flush=True)
    if JSON_OUT: json.dump(found, open(JSON_OUT, 'w'), ensure_ascii=False, indent=1)
    print(f'{total} presentaciones × {len(LANGS)} idiomas, {len(found)} avisos')
    sys.exit(1 if found else 0)
main()
