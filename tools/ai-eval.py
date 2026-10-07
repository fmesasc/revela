#!/usr/bin/env python3
"""The AI's decks, measured with the real model: a set of topics (programming, history, science, business…), each
made as a person does — first the outline, then the slides — and scored by src/features/ai/quality.js. So a change in
the instructions or in the model is measured, not guessed.

   OPENROUTER_API_KEY=sk-or-… python3 tools/ai-eval.py [--model google/gemini-2.5-flash] [--only swift,roma] [--out tmp/ai-eval]

Needs Chrome (it runs the app headless, as tests/run.py). Costs a few cents per topic on that key. Writes a table (and,
in GitHub Actions, the run's summary) and every deck as JSON to look at. Exit code 1 if the average is under --min."""
import json, os, sys, time, http.server, socketserver, threading, subprocess, shutil, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOPICS = {   # key: (topic, language of the deck)
    'swift': ('Lenguaje de programación Swift: introducción para estudiantes de FP', 'català'),
    'python': ('Python para análisis de datos con pandas', 'español'),
    'sql': ('Consultas SQL: SELECT, JOIN y GROUP BY con ejemplos', 'español'),
    'git': ('Git and GitHub for beginners: branches, commits and pull requests', 'English'),
    'dax': ('Medidas DAX en Power BI: CALCULATE y contexto de filtro', 'español'),
    'roma': ('La caída del Imperio romano de Occidente', 'español'),
    'fotosintesi': ('La fotosíntesi per a alumnes de 2n d’ESO', 'català'),
    'pitagoras': ('El teorema de Pitágoras y sus aplicaciones', 'español'),
    'ventas': ('Resultados de ventas del trimestre y plan para el siguiente', 'español'),
    'onboarding': ('Bienvenida a nuevos empleados: cultura, herramientas y primeras semanas', 'español'),
    'cambio': ('Climate change: causes, effects and what cities can do', 'English'),
    'marketing': ('Plan de marketing digital para una pequeña tienda online', 'español'),
}

class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass

def main():
    arg = lambda n, d=None: next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == n), d)
    key = os.environ.get('OPENROUTER_API_KEY', '').strip()
    if not key: print('Falta OPENROUTER_API_KEY (una clave de OpenRouter).'); return 2
    model, out, least = arg('--model', ''), arg('--out', os.path.join(ROOT, 'tmp', 'ai-eval')), float(arg('--min', '70'))
    only = [k for k in (arg('--only', '') or '').split(',') if k] or list(TOPICS)
    os.makedirs(out, exist_ok=True)
    srv = socketserver.TCPServer(('127.0.0.1', 0), Q); threading.Thread(target=srv.serve_forever, daemon=True).start(); port = srv.server_address[1]
    chrome = next(shutil.which(c) for c in ('google-chrome', 'chromium', 'chromium-browser') if shutil.which(c))
    r_in, w_in = os.pipe(); r_out, w_out = os.pipe()
    def child(): os.dup2(r_in, 3); os.dup2(w_out, 4)
    proc = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-pipe', '--user-data-dir=' + tempfile.mkdtemp(prefix='aieval-')],
                            preexec_fn=child, pass_fds=(3, 4), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
    def ev(e):
        r = recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True))
        if 'exceptionDetails' in r.get('result', {}): raise RuntimeError(r['result']['exceptionDetails'].get('exception', {}).get('description', 'error'))
        return r.get('result', {}).get('result', {}).get('value')
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test'))
    for _ in range(80):
        if ev('!!window.__revela'): break
        time.sleep(0.25)
    ev(f"(()=>{{const R=window.__revela;R.ai.setAiKey({json.dumps(key)});R.ai.acceptPrivacy();{f'R.ai.setAiModel({json.dumps(model)});' if model else ''}return 1}})()")
    rows = []
    for k in only:
        topic, lang = TOPICS[k]; t0 = time.time()
        try:
            r = ev(f"""(async()=>{{const A=window.__revela.aiDeck,Q=await import('/src/features/ai/quality.js');
              const o={{topic:{json.dumps(topic)},language:{json.dumps(lang)},count:10}};
              const ol=await A.createOutline(o); const sp=await A.createDeck({{...o,outline:ol.slides}});
              return {{outline:ol, specs:JSON.parse(JSON.stringify(sp)), quality:sp.quality||Q.deckQuality(sp,{{topic:o.topic}})}}}})()""")
            q = r['quality']; json.dump(r, open(os.path.join(out, k + '.json'), 'w'), ensure_ascii=False, indent=1)
            rows.append((k, q['score'], len(r['specs']), q['stats']['code'], ', '.join(sorted(set(s.get('kind', '?') for s in r['specs']))), '; '.join(p['detail'] for p in q['problems']) or '—', round(time.time() - t0)))
        except Exception as e:
            rows.append((k, 0, 0, 0, '', 'ERROR: ' + (str(e).splitlines() or [''])[0][:200], round(time.time() - t0)))
        print(f'{rows[-1][0]:<12} {rows[-1][1]:>3}  {rows[-1][5]}', flush=True)
    proc.kill()
    avg = sum(r[1] for r in rows) / max(1, len(rows))
    md = [f'## La IA, medida{f" ({model})" if model else ""}: media {avg:.0f}/100', '', '| Tema | Nota | Diapositivas | Código | Tipos | Problemas | s |', '|---|---:|---:|---:|---|---|---:|']
    md += [f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {r[6]} |' for r in rows]
    open(os.path.join(out, 'resumen.md'), 'w').write('\n'.join(md) + '\n'); print('\n'.join(md))
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write('\n'.join(md) + '\n')
    return 0 if avg >= least else 1

if __name__ == '__main__':
    sys.exit(main())
