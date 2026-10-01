#!/usr/bin/env python3
"""Revela's Blender runner: a tiny HTTP server inside the container (Dockerfile).

    GET  /…   → "ok" (the Container class checks the port is up)
    POST /run { script, timeoutSec } → { ok, log, glb (base64), preview (base64 PNG), thumb (base64 JPEG), seconds, error? }

One run at a time (another one meanwhile: 429). Each run gets a fresh folder under WORK; Blender
runs there as this same unprivileged user, with run.py around the script (it exports out.glb and
renders the preview), a time limit (the whole process group is killed), a memory limit and a size
limit for the GLB. The folder is deleted afterwards. Only the revela-blender Worker can reach this
port, and it checks each request's signature first (worker.js); there are no secrets in here.

Also used by tools/blender-try.py to try the same wrapper with this computer's Blender.
"""
import base64, json, os, resource, shlex, shutil, signal, subprocess, sys, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = shlex.split(os.environ.get('BLENDER', '/opt/blender/blender'))
WORK = os.environ.get('WORK', '/work')
MAX_TIMEOUT = int(os.environ.get('MAX_TIMEOUT', '90'))
MAX_GLB = int(os.environ.get('MAX_GLB_MB', '15')) * 1024 * 1024
MAX_SCRIPT = 100_000
MAX_TRIS = int(os.environ.get('MAX_TRIS', '300000'))
MEM_LIMIT = int(os.environ.get('MEM_LIMIT_MB', '0')) * 1024 * 1024   # address space for Blender (0: none)
LOG_MAX = 6000


def _limits():
    os.setsid()
    if MEM_LIMIT: resource.setrlimit(resource.RLIMIT_AS, (MEM_LIMIT, MEM_LIMIT))
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_GLB * 4, MAX_GLB * 4))     # (no file bigger than this)
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def run_job(script, timeout=MAX_TIMEOUT, keep=None):
    """Runs one script → the response's dict. keep: a folder to leave the results in (tools/blender-try.py)."""
    t0 = time.time()
    timeout = max(10, min(MAX_TIMEOUT, int(timeout or MAX_TIMEOUT)))
    os.makedirs(WORK, exist_ok=True)
    job = keep or tempfile.mkdtemp(prefix='job-', dir=WORK)
    os.makedirs(job, exist_ok=True)
    try:
        with open(os.path.join(job, 'user.py'), 'w', encoding='utf-8') as f: f.write(script)
        for x in ('out.glb', 'preview.png', 'thumb.jpg', 'result.json'):
            if os.path.exists(os.path.join(job, x)): os.remove(os.path.join(job, x))
        cmd = BLENDER + ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '-P', os.path.join(HERE, 'run.py'), '--', job, str(MAX_TRIS)]
        # (Inside the container: a clean environment. Trying it here with Flatpak needs this session's.)
        env = dict(os.environ) if keep else {'PATH': '/usr/bin:/bin', 'HOME': job, 'TMPDIR': job, 'LANG': 'C.UTF-8'}
        p = subprocess.Popen(cmd, cwd=job, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, preexec_fn=_limits, stdin=subprocess.DEVNULL)
        try: out, _ = p.communicate(timeout=timeout); timed_out = False
        except subprocess.TimeoutExpired:
            try: os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            out, _ = p.communicate(); timed_out = True
        log = out.decode('utf-8', 'replace')
        log = log if len(log) <= LOG_MAX else '…' + log[-LOG_MAX:]
        res = {}
        try:
            with open(os.path.join(job, 'result.json')) as f: res = json.load(f)
        except Exception: pass
        r = {'ok': False, 'log': log, 'seconds': round(time.time() - t0, 2)}
        if timed_out: return {**r, 'error': 'timeout', 'message': f'Blender took more than {timeout} s.'}
        if not res.get('ok'): return {**r, 'error': res.get('error') or 'blender', 'message': res.get('message') or f'Blender stopped (code {p.returncode}).'}
        glb = os.path.join(job, 'out.glb')
        if not os.path.exists(glb): return {**r, 'error': 'export', 'message': 'No GLB was written.'}
        if os.path.getsize(glb) > MAX_GLB: return {**r, 'error': 'too large', 'message': f'The GLB is {os.path.getsize(glb) // 1048576} MB (at most {MAX_GLB // 1048576} MB).'}
        b64 = lambda n: base64.b64encode(open(os.path.join(job, n), 'rb').read()).decode() if os.path.exists(os.path.join(job, n)) else None
        return {**r, 'ok': True, 'glb': b64('out.glb'), 'preview': b64('preview.png'), 'thumb': b64('thumb.jpg'),
                'tris': res.get('tris'), 'engine': res.get('engine'), 'size': res.get('size'), 'seconds': round(time.time() - t0, 2)}
    finally:
        if not keep: shutil.rmtree(job, ignore_errors=True)


busy = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.send_response(200); self.send_header('Content-Type', 'text/plain'); self.end_headers(); self.wfile.write(b'ok')

    def do_POST(self):
        if self.path != '/run': return self.reply(404, {'error': 'not found'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_SCRIPT * 2: return self.reply(413, {'error': 'too large'})
        try: a = json.loads(self.rfile.read(n))
        except Exception: return self.reply(400, {'error': 'bad request'})
        script = a.get('script') if isinstance(a, dict) else None
        if not isinstance(script, str) or not script.strip() or len(script) > MAX_SCRIPT: return self.reply(400, {'error': 'bad request'})
        if not busy.acquire(blocking=False): return self.reply(429, {'error': 'busy'})
        try: self.reply(200, run_job(script, a.get('timeoutSec')))
        finally: busy.release()

    def log_message(self, *a): pass                         # (no request log: scripts may hold people's words)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8080'))
    print(f'Revela Blender runner on :{port} ({" ".join(BLENDER)})', flush=True)
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
