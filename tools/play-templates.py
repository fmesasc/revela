#!/usr/bin/env python3
"""Plays the example presentations as an audience would see them — exported as a web page and stepped through with
   «next» to the end — and reports what goes wrong: script errors, files that don't load, steps that don't move on,
   slides that come out blank, objects that end up off the slide. One sheet of pictures per presentation (every
   step, in order), to look at.
   python3 tools/play-templates.py [GROUP_OR_KEY …] [--lang XX] [--out DIR] [--wait S] [--gpu] [--resume] [--max N]
   DIR (default tmp/play): report.json, and KEY.jpg per presentation. Prints one line per problem.
   (Chrome: one at a time — run it through tmp/chrome-slot.sh. --gpu: the computer's graphics card, as a person's
   browser has it — maps and 3D at their real speed —; without it, software drawing.)"""
import base64, http.server, io, json, os, re, shutil, socketserver, subprocess, sys, threading, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
def opt(name, d=None):
    if name in args: i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return d
MAX = int(opt('--max', '0')); LANG = opt('--lang', 'es'); OUT = os.path.abspath(opt('--out', os.path.join(ROOT, 'tmp', 'play'))); WAIT = float(opt('--wait', '1.4'))
GPU = '--gpu' in args; RESUME = '--resume' in args; args = [a for a in args if a not in ('--gpu', '--resume')]
os.makedirs(OUT, exist_ok=True); HTML = os.path.join(ROOT, 'tmp', 'play-html'); os.makedirs(HTML, exist_ok=True)

class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Q); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
chrome = next(shutil.which(c) for c in ('google-chrome', 'chromium') if shutil.which(c))
flags = ['--use-angle=gl-egl', '--ignore-gpu-blocklist'] if GPU else ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
# (Its own browser profile, removed at the end: left behind, each run's — models and pages cached — filled the disk.)
from chromeprof import profile
PROFILE = profile('revela-play')
ri, wi = os.pipe(); ro, wo = os.pipe()
proc = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', *flags, '--autoplay-policy=no-user-gesture-required', '--remote-debugging-pipe',
                         f'--user-data-dir={PROFILE}'],
                        preexec_fn=lambda: (os.dup2(ri, 3), os.dup2(wo, 4)), pass_fds=(3, 4), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
os.close(ri); os.close(wo)
buf = b''; n = [0]; events = []
def send(m, sid=None, **pa):
    n[0] += 1; msg = {'id': n[0], 'method': m, 'params': pa}
    if sid: msg['sessionId'] = sid
    os.write(wi, json.dumps(msg).encode() + b'\0'); return n[0]
def recv(want, timeout=120):
    global buf
    t0 = time.time()
    while time.time() - t0 < timeout:
        while b'\0' in buf:
            raw, buf = buf.split(b'\0', 1); m = json.loads(raw)
            if m.get('id') == want: return m
            if 'method' in m: events.append(m)
        buf += os.read(ro, 1 << 16)
    raise TimeoutError(want)
def main():
    tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
    sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
    ev = lambda e, t=120: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True), t).get('result', {})
    for d in ('Runtime.enable', 'Log.enable', 'Network.enable', 'Page.enable'): recv(send(d, sid))
    recv(send('Emulation.setDeviceMetricsOverride', sid, width=1280, height=720, deviceScaleFactor=1, mobile=False))
    # The keys asked for (a group, a file or a key; all when none), and their pages, made by the app itself.
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test')); time.sleep(5)
    keys = ev("""(async()=>{const E=await import('/src/features/content/examples.js');const {CATALOG}=await import('/src/features/content/templates/catalog.js');
      const want=%s;return Object.keys(CATALOG).filter(k=>!want.length||want.some(w=>k===w||k.startsWith(w+'_')||CATALOG[k].file===w||CATALOG[k].cat===w))})()""" % json.dumps(args))['result']['value']
    report = json.load(open(os.path.join(OUT, 'report.json'))) if os.path.exists(os.path.join(OUT, 'report.json')) else {}
    done = 0
    for key in keys:
        if RESUME and key in report: continue          # (--resume: the ones already played, left as they were)
        if MAX and done >= MAX: break                  # (--max N: at most N presentations this run, so the browser is free in between)
        done += 1
        html = ev("""(async()=>{const R=window.__revela,E=await import('/src/features/content/examples.js');const d=await E.loadExample(%s,%s);if(!d)return '';
          return R.io.buildHTML(d,{inApp:false})})()""" % (json.dumps(key), json.dumps(LANG)), 180).get('result', {}).get('value') or ''
        if not html: print(f'{key}\tno se pudo generar', flush=True); continue
        open(os.path.join(HTML, key + '.html'), 'w').write(html)
        # (One that hangs the browser — a heavy 3D with the computer busy —: said, and on to the next.)
        try: report[key] = play(sid, ev, key)
        except TimeoutError: report[key] = {'steps': 0, 'slides': 0, 'problems': ['la reproducción no respondió a tiempo (¿el ordenador muy cargado?): volver a probar'], 'seconds': 0}
        json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), ensure_ascii=False, indent=1)
        for p in report[key]['problems']: print(f'{key}\t{p}', flush=True)
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test')); time.sleep(4)
    print(f'{len(keys)} presentaciones; {sum(len(report[k]["problems"]) for k in keys if k in report)} avisos', flush=True)

# What is checked on the slide in view, after each step.
CHECK = r"""(()=>{const out=[];const sec=Reveal.getCurrentSlide();if(!sec)return out;const S=document.querySelector('.reveal .slides').getBoundingClientRect(),k=S.width/Reveal.getConfig().width;
  const vis=e=>{for(let x=e;x&&x!==sec.parentElement;x=x.parentElement){const s=getComputedStyle(x);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false}return true};
  for(const e of sec.querySelectorAll(':scope > .stage > *, :scope > *:not(.stage):not(aside)')){
    if(!vis(e)||e.hasAttribute('data-bleed')||e.closest('[data-bleed]')||e.getAttribute('aria-hidden')==='true')continue;
    // (Only what carries something — text, a picture, 3D, a video, a table, a map —: glows and bands go past the edge on purpose.)
    if(!(e.innerText||'').trim()&&!e.querySelector('img,model-viewer,video,table,iframe,[data-geomap]')&&!e.matches('img,model-viewer,video,[data-geomap]'))continue;
    const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    const off=Math.max(S.left-r.left,r.right-S.right,S.top-r.top,r.bottom-S.bottom)/k;
    if(off>40&&!(r.right<S.left||r.left>S.right||r.bottom<S.top||r.top>S.bottom))out.push('se sale '+Math.round(off)+' px: '+(e.innerText||e.getAttribute('aria-label')||e.className||e.tagName).replace(/\s+/g,' ').trim().slice(0,40))}
  for(const im of sec.querySelectorAll('img'))if(vis(im)&&im.complete&&!im.naturalWidth&&im.getAttribute('src'))out.push('imagen que no carga: '+im.getAttribute('src').slice(0,60));
  for(const v of sec.querySelectorAll('video,audio'))if(v.error)out.push('vídeo/sonido que no carga: '+(v.currentSrc||'').slice(0,60));
  for(const m of sec.querySelectorAll('model-viewer'))if(m.__rvError||m.getAttribute('data-error'))out.push('3D que no carga');
  for(const m of sec.querySelectorAll('[data-geomap]'))if(m.classList.contains('rvm-offline'))out.push('mapa sin cargar');
  return out})()"""

def play(sid, ev, key):
    events.clear()
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/tmp/play-html/{key}.html'))
    for _ in range(60):
        if ev('!!(window.Reveal&&Reveal.isReady&&Reveal.isReady())').get('result', {}).get('value'): break
        time.sleep(0.25)
    time.sleep(2)
    problems, shots, seen, stuck, t0 = [], [], set(), 0, time.time()
    total = ev('Reveal.getTotalSlides()').get('result', {}).get('value') or 0
    while len(shots) < 160 and time.time() - t0 < 240:
        time.sleep(WAIT)
        idx = ev('JSON.stringify(Reveal.getIndices())').get('result', {}).get('value')
        label = (lambda i: f"{i['h'] + 1}" + (f"v{i['v'] + 1}" if i.get('v') else '') + (f".{i['f'] + 1}" if i.get('f') is not None and i.get('f') >= 0 else ''))(json.loads(idx))
        found = ev(CHECK).get('result', {}).get('value') or []
        # (What goes past the edge is looked at again a moment later: a transition or a fly-in may still be on its way.)
        if any(q.startswith('se sale') for q in found):
            time.sleep(1.6); found = [q for q in (ev(CHECK).get('result', {}).get('value') or []) if q in found or not q.startswith('se sale')]
        for p in found: problems.append(f'diapositiva {label}: {p}')
        img = base64.b64decode(recv(send('Page.captureScreenshot', sid, format='jpeg', quality=60))['result']['data'])
        shots.append((label, img))
        if idx in seen: stuck += 1
        seen.add(idx)
        end = ev('Reveal.isLastSlide()&&!Reveal.availableFragments().next').get('result', {}).get('value')
        if end: break
        ev('Reveal.next(),1')
        time.sleep(0.15)
        if ev('JSON.stringify(Reveal.getIndices())').get('result', {}).get('value') == idx:
            time.sleep(WAIT); ev('Reveal.next(),1')
            if ev('JSON.stringify(Reveal.getIndices())').get('result', {}).get('value') == idx: problems.append(f'diapositiva {label}: «siguiente» no avanza'); break
    # Errors in the page and files that didn't load (the maps' tiles and the like, retried by the map itself, aside).
    for m in events:
        p = m.get('params', {})
        if m['method'] == 'Runtime.exceptionThrown':
            d = p.get('exceptionDetails', {}); problems.append('error: ' + ((d.get('exception') or {}).get('description') or d.get('text') or '')[:160].split('\n')[0])
        elif m['method'] == 'Runtime.consoleAPICalled' and p.get('type') == 'error':
            problems.append('consola: ' + ' '.join(str(a.get('value', a.get('description', ''))) for a in p.get('args', []))[:160])
        elif m['method'] == 'Network.loadingFailed' and not p.get('canceled') and p.get('type') in ('Document', 'Script', 'Stylesheet', 'Image', 'Media', 'Font', 'Fetch', 'XHR'):
            problems.append(f"no carga ({p.get('type')}): {p.get('errorText')}")
    urls = {m['params']['requestId']: m['params']['request']['url'] for m in events if m['method'] == 'Network.requestWillBeSent'}
    problems = [re.sub(r'(no carga \(\w+\): .*)', lambda x: x.group(1), q) for q in problems]
    for i, q in enumerate(problems):
        if q.startswith('no carga'):
            rid = next((m['params']['requestId'] for m in events if m['method'] == 'Network.loadingFailed' and m['params'].get('errorText') in q), None)
            if rid in urls: problems[i] = q + ' ' + urls[rid][:90]
    problems = [q for q in dict.fromkeys(problems) if not re.search(r'tiles\.|openfreemap|/tiles/|mapterhorn|eox\.at|favicon|nominatim', q)]
    seen_slides = {re.sub(r'\..*', '', s[0]) for s in shots}      # (a slide of a vertical stack is «16v2»)
    if total and len(seen_slides) < total: problems.append(f'solo se vieron {len(seen_slides)} de {total} diapositivas')
    sheet(key, shots)
    return {'steps': len(shots), 'slides': total, 'problems': problems, 'seconds': round(time.time() - t0)}

def sheet(key, shots):
    from PIL import Image, ImageDraw
    W, H, cols = 320, 180, 5
    rows = (len(shots) + cols - 1) // cols
    s = Image.new('RGB', (cols * (W + 4), max(1, rows) * (H + 4)), 'white')
    for i, (label, data) in enumerate(shots):
        im = Image.open(io.BytesIO(data)).convert('RGB').resize((W, H)); d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 8 + 7 * len(label), 14), fill='black'); d.text((4, 2), label, fill='yellow')
        s.paste(im, ((i % cols) * (W + 4), (i // cols) * (H + 4)))
    s.save(os.path.join(OUT, key + '.jpg'), quality=80)

try: main()
finally: proc.kill(); srv.shutdown(); proc.wait(timeout=10)
