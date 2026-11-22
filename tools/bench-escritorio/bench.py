#!/usr/bin/env python3
"""Medidas de rendimiento de la aplicación (docs/ESCRITORIO-NATIVO.md), con Chrome sin cabeza y sin dependencias.

  python3 tools/bench-escritorio/bench.py deck [N=300] [live=0|1]   presentación sintética de N diapositivas con imágenes
  python3 tools/bench-escritorio/bench.py video [MB=100] [address=0|1]   insertar un vídeo de MB megabytes
  python3 tools/bench-escritorio/bench.py history [limit=60] [N=300]   memoria y tiempo de deshacer

Imprime un JSON con milisegundos y megabytes. «live=1» / «address=1» es lo que hace el escritorio (archivos por su dirección,
no como texto data:). Cada vez abre un Chrome nuevo con un perfil vacío; hace falta Chrome o Chromium."""
import http.server, json, os, shutil, socketserver, subprocess, sys, tempfile, threading, time
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
scenario = sys.argv[1] if len(sys.argv) > 1 else 'deck'
params = dict(zip(['a', 'b'], sys.argv[2:4]))
BENCH = {'deck': {'N': int(params.get('a', 300)), 'live': params.get('b', '0') == '1'},
         'video': {'MB': int(params.get('a', 100)), 'address': params.get('b', '0') == '1'},
         'history': {'limit': int(params.get('a', 60)), 'N': int(params.get('b', 300))}}[scenario]
JS = 'window.BENCH = ' + json.dumps(BENCH) + ';\n' + open(os.path.join(HERE, scenario + '.js')).read()
chrome = next((shutil.which(c) for c in ('google-chrome', 'chromium', 'chromium-browser') if shutil.which(c)), None) or sys.exit('No se encontró Chrome/Chromium')
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1',0),Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
r_in,w_in = os.pipe(); r_out,w_out = os.pipe(); prof = tempfile.mkdtemp(prefix='revela-bench-')
def child(): os.dup2(r_in,3); os.dup2(w_out,4)
proc = subprocess.Popen([chrome,'--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-pipe','--enable-precise-memory-info','--js-flags=--expose-gc','--window-size=1400,900','--user-data-dir='+prof,'about:blank'],pass_fds=(r_in,w_out,3,4),preexec_fn=child,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
os.close(r_in); os.close(w_out); buf=b''; ids=[0]
def send(m,session=None,**p):
    ids[0]+=1; msg={'id':ids[0],'method':m,'params':p}
    if session: msg['sessionId']=session
    os.write(w_in,json.dumps(msg).encode()+b'\0'); return ids[0]
def recv(want):
    global buf
    while True:
        while b'\0' in buf:
            raw,buf=buf.split(b'\0',1); m=json.loads(raw)
            if m.get('id')==want: return m
        buf+=os.read(r_out,1<<16)
try:
    tid=recv(send('Target.createTarget',url='about:blank'))['result']['targetId']
    sid=recv(send('Target.attachToTarget',targetId=tid,flatten=True))['result']['sessionId']
    recv(send('Page.enable',sid))
    recv(send('Page.navigate',sid,url=f'http://127.0.0.1:{port}/index.html?test')); time.sleep(5)
    r=recv(send('Runtime.evaluate',sid,expression=JS,awaitPromise=True,returnByValue=True,timeout=900000))
    res=r.get('result',{})
    print(res.get('result',{}).get('value') or json.dumps(res.get('exceptionDetails') or res)[:2000])
finally:
    proc.kill(); shutil.rmtree(prof,ignore_errors=True)
