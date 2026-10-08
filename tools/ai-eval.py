#!/usr/bin/env python3
"""The AI's decks, measured with the real model: a set of topics (programming, history, science, business…), each
made as a person does — first the outline, then the slides — and scored by src/features/ai/quality.js. So a change in
the instructions or in the model is measured, not guessed.

   OPENROUTER_API_KEY=sk-or-… python3 tools/ai-eval.py [--model google/gemini-2.5-flash] [--only swift,roma] [--out tmp/ai-eval]
   python3 tools/ai-eval.py --replay tmp/ai-eval-old [--out tmp/ai-eval]    (the decks of a past run, laid out again: free)

Needs Chrome (it runs the app headless, as tests/run.py). Costs a few cents per topic on that key. Writes a table (and,
in GitHub Actions, the run's summary) and every deck as JSON to look at. Exit code 1 if the average is under --min."""
import base64, io, json, os, sys, time, http.server, socketserver, threading, subprocess, shutil, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOPICS = {   # key: (topic, language, what the person answered to the questions — '' for none)
    'swift': ('Lenguaje de programación Swift: introducción para estudiantes de FP', 'català', ''),
    'python': ('Python para análisis de datos con pandas', 'español', 'Para analistas de marketing que usan Excel a diario y nunca han programado. Una sesión de 45 minutos. Que salgan sabiendo cargar un CSV, filtrar y agrupar.'),
    'sql': ('Consultas SQL: SELECT, JOIN y GROUP BY con ejemplos', 'español', ''),
    'git': ('Git and GitHub for beginners: branches, commits and pull requests', 'English', ''),
    'dax': ('Medidas DAX en Power BI: CALCULATE y contexto de filtro', 'español', 'Para el equipo de finanzas; ya hacen informes en Power BI pero sin medidas propias. Su modelo tiene las tablas Ventas, Fecha y Producto.'),
    'roma': ('La caída del Imperio romano de Occidente', 'español', 'Clase de 1.º de Bachillerato, 50 minutos. Quiero que debatan qué causa pesó más.'),
    'fracciones': ('Sumar y restar fracciones', 'español', 'Alumnos de 2.º de ESO que van flojos en el mínimo común múltiplo. Clase de 55 minutos con ejercicios para hacer en clase. Que al final sepan sumar con distinto denominador.'),
    'pitagoras': ('El teorema de Pitágoras y sus aplicaciones', 'español', ''),
    'ventas': ('Resultados de ventas del trimestre y plan para el siguiente', 'español', 'Comité de dirección de una distribuidora de material de oficina. T3: 2,4 M€ de ventas frente a un objetivo de 2,6 M€ (-8 %); el norte creció un 12 % y el sur cayó un 15 % por la pérdida de un cliente grande. Busco aprobación para contratar dos comerciales en el sur.'),
    'tesis': ('Defensa de tesis doctoral: simulación de urgencias hospitalarias con modelos basados en agentes', 'español', 'Tribunal de tres doctores en informática. 20 minutos. Aportación principal: un sistema modular que reduce de años a semanas adaptar el simulador a un hospital nuevo; validado con los datos de dos hospitales.'),
    'pitch': ('Presentación a inversores de una app de reservas para peluquerías', 'español', 'Ronda pre-semilla de 300.000 €. Tenemos 120 peluquerías de pago en Valencia y 8 % de crecimiento mensual. 10 minutos.'),
    'cambio': ('Climate change: causes, effects and what cities can do', 'English', 'City council of a mid-sized Spanish coastal city; decision-makers, not scientists. 15 minutes. Focus on heatwaves and flooding.'),
}

class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass

def main():
    arg = lambda n, d=None: next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == n), d)
    replay = arg('--replay')    # (to measure a change in the layout on the same slides, without paying the model again)
    key = 'mock' if replay else os.environ.get('OPENROUTER_API_KEY', '').strip()
    if not key: print('Falta OPENROUTER_API_KEY (una clave de OpenRouter).'); return 2
    media = '' if '--no-media' in sys.argv else 'search'   # (real pictures and videos searched for the slides that show something: media.js)
    model, out, least = arg('--model', ''), arg('--out', os.path.join(ROOT, 'tmp', 'ai-eval')), float(arg('--min', '70'))
    only = [k for k in (arg('--only', '') or '').split(',') if k] or [k for k in TOPICS if not replay or os.path.exists(os.path.join(replay, k + '.json'))]
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
    recv(send('Emulation.setDeviceMetricsOverride', sid, width=1600, height=1000, deviceScaleFactor=1, mobile=False))
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test'))
    for _ in range(80):
        if ev('!!window.__revela'): break
        time.sleep(0.25)
    if key == 'mock':      # (to try this tool itself without a model: canned answers)
        ev("""(()=>{const deck={title:'Prueba',design:'tech',slides:[{kind:'title',title:'Prueba',subtitle:'Sub',notes:'n'},{kind:'steps',title:'Pasos',steps:[{title:'Uno',text:'Primero esto'},{title:'Dos',text:'Luego esto'},{title:'Tres',text:'Y esto'}],notes:'n'},
          {kind:'code',title:'Código',code:{language:'python',code:'import pandas as pd\\ndf = pd.read_csv(\\"a.csv\\")'},bullets:['Carga un CSV'],notes:'n'},{kind:'stats',title:'Cifras',stats:[{value:'2,4 M€',label:'Ventas'}],source:'Fuente: tus datos',notes:'n'},{kind:'closing',title:'Gracias',notes:'n'}]};
          window.fetch=async(u,o)=>{const b=JSON.parse(o.body),sys=b.messages[0].content;const a=/3-4 questions/.test(sys)?{questions:[{q:'¿Para quién?',options:['A','B']}]}:/Plan a presentation/.test(sys)?{title:'Prueba',slides:deck.slides.map(x=>({title:x.title,kind:x.kind,points:[]}))}:deck;
            return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(a)}}]}))};return 1})()""")
    if not replay: ev(f"(()=>{{const R=window.__revela;R.ai.setAiKey({json.dumps(key)});R.ai.acceptPrivacy();{f'R.ai.setAiModel({json.dumps(model)});' if model else ''}return 1}})()")
    ev("(()=>{const s=document.createElement('style');s.textContent='.toast,#toasts{display:none!important}';document.head.append(s);return 1})()")   # (the app's notices, out of the pictures)
    rows = []
    for k in only:
        topic, lang, context = TOPICS[k]; t0 = time.time()
        try:
            r = ev(f"""(async()=>{{const R=window.__revela,A=R.aiDeck,Q=await import('/src/features/ai/quality.js');
              const o={{topic:{json.dumps(topic)},language:{json.dumps(lang)},count:10,context:{json.dumps(context)},media:{json.dumps(media)}}};
              const old={json.dumps(json.load(open(os.path.join(replay, k + '.json'))) if replay else None)};
              const asks=old?old.questions:await A.askAbout(o).catch(e=>[{{q:'ERROR '+e.message}}]);
              const ol=old?old.outline:await A.createOutline(o); const sp=old?Object.assign(old.specs.slice(),{{design:old.design,title:old.title,quality:old.quality,qualityFirst:{{score:old.first}}}}):await A.createDeck({{...o,outline:ol.slides}});
              if(!old&&o.media==='search')await A.findMedia(sp,{{topic:o.topic,language:o.language}});
              // (Made as the app makes it: a design with its layouts, the slides composed in it.)
              const G=await import('/src/features/design/gallery.js'),M=await import('/src/features/document/master.js');
              const d=G.buildFromGallery(sp.design||'minimal'); M.ensureLayouts(d); if(sp.title) d.name=sp.title; R.store.replaceDeck(d);
              const starter=new Set(R.state.deck.slides.map(s=>s.id)); await A.insertSpecs(sp,{{images:false}});
              R.store.commit(()=>{{R.state.deck.slides=R.state.deck.slides.filter(s=>!starter.has(s.id));R.state.ui.slideIndex=0}});
              return {{design:sp.design, title:sp.title, questions:asks, outline:ol, specs:JSON.parse(JSON.stringify(sp)), quality:sp.quality||Q.deckQuality(sp,{{topic:o.topic}}), first:(sp.qualityFirst||sp.quality||{{}}).score, n:R.state.deck.slides.length}}}})()""")
            # Each slide drawn (for a person to judge it), and measured: text past its box, letters too small to read.
            shots, small, spill, spills = [], 0, 0, []
            for i in range(r['n']):
                m = ev(f"""(async()=>{{const R=window.__revela;R.slides.goToSlide({i});R.store.setSelection(null);R.render();await new Promise(x=>setTimeout(x,450));
                  const st=document.getElementById('stage');let small=0,spill=0,min=999;const where=[];
                  for(const b of st.querySelectorAll('.block')){{const box=b.getBoundingClientRect(),w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT),rg=document.createRange();
                    if(b.querySelector('pre,code,.katex'))continue;for(let n;(n=w.nextNode());){{if(!/[\\p{{L}}\\p{{N}}]/u.test(n.textContent))continue;   /* (a big decorative quote mark: only its line box goes past) */const fs=parseFloat(getComputedStyle(n.parentElement).fontSize);   /* (slide pixels: the stage is scaled as a whole) */min=Math.min(min,fs);if(fs<18)small++;
                      rg.selectNodeContents(n);for(const q of rg.getClientRects())if(q.bottom>box.bottom+3||q.right>box.right+3){{spill++;where.push(n.textContent.trim().slice(0,40));break}}}}}}
                  const r=st.getBoundingClientRect();return [r.x,r.y,r.width,r.height,small,spill,Math.round(min),where]}})()""")
                small += m[4]; spill += m[5]
                if m[7]: spills.append({'slide': i + 1, 'kind': (r['specs'][i] if i < len(r['specs']) else {}).get('kind'), 'texts': m[7]})
                p = {'format': 'png', 'clip': {'x': m[0], 'y': m[1], 'width': m[2], 'height': m[3], 'scale': 1}}
                shots.append(base64.b64decode(recv(send('Page.captureScreenshot', sid, **p))['result']['data']))
            try:
                from PIL import Image
                ims = [Image.open(io.BytesIO(x)) for x in shots]; ims = [im.resize((480, int(480 * im.height / im.width))) for im in ims]
                cols = 3; w, h = ims[0].size; sheet = Image.new('RGB', (cols * (w + 6), ((len(ims) + cols - 1) // cols) * (h + 6)), '#777')
                for j, im in enumerate(ims): sheet.paste(im, ((j % cols) * (w + 6), (j // cols) * (h + 6)))
                sheet.save(os.path.join(out, k + '.png'))
            except Exception as e: print('sin hoja de imágenes:', e)
            r['layout'] = {'small_texts': small, 'spilling_texts': spill, 'spills': spills}
            q = r['quality']; json.dump(r, open(os.path.join(out, k + '.json'), 'w'), ensure_ascii=False, indent=1)
            rows.append((k, q['score'], len(r['specs']), q['stats']['code'], ', '.join(sorted(set(s.get('kind', '?') for s in r['specs']))), '; '.join(([f"{sum(1 for x in r['specs'] if x.get('picture'))} imágenes y {sum(1 for x in r['specs'] if x.get('video'))} vídeos"] if media else []) + [p['detail'] for p in q['problems']] + ([f"{r['layout']['spilling_texts']} textos que se salen"] if r['layout']['spilling_texts'] else []) + ([f"{r['layout']['small_texts']} textos de menos de 18 px (sin contar el código)"] if r['layout']['small_texts'] else [])) or '—', round(time.time() - t0), r.get('first', q['score'])))
        except Exception as e:
            rows.append((k, 0, 0, 0, '', 'ERROR: ' + (str(e).splitlines() or [''])[0][:200], round(time.time() - t0), 0))
        print(f'{rows[-1][0]:<12} {rows[-1][1]:>3}  {rows[-1][5]}', flush=True)
    proc.kill()
    avg = sum(r[1] for r in rows) / max(1, len(rows))
    md = [f'## La IA, medida{f" ({model})" if model else ""}: media {avg:.0f}/100 (a la primera: {sum(r[7] for r in rows) / max(1, len(rows)):.0f})', '', '| Tema | Nota | A la primera | Diapositivas | Código | Tipos | Problemas | s |', '|---|---:|---:|---:|---:|---|---|---:|']
    md += [f'| {r[0]} | {r[1]} | {r[7]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {r[6]} |' for r in rows]
    open(os.path.join(out, 'resumen.md'), 'w').write('\n'.join(md) + '\n'); print('\n'.join(md))
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write('\n'.join(md) + '\n')
    return 0 if avg >= least else 1

if __name__ == '__main__':
    sys.exit(main())
