#!/usr/bin/env python3
"""Headless test runner in real time (no virtual clock), so that media APIs
(camera, MediaRecorder) work with Chrome's fake devices.

It talks to Chrome over --remote-debugging-pipe (file descriptors 3 and 4,
NUL-separated JSON), which needs only the Python standard library.
Prints "REVELATEST PASS n/n" or "REVELATEST FAIL ..."; exit code 0 on pass.
"""
import http.server, json, os, shutil, socketserver, subprocess, sys, tempfile, threading, time, urllib.parse

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
    # A known deck (title + subtitle), not whatever the suite left autosaved.
    ev("(()=>{const R=window.__revela;R.store.replaceDeck(R.model.emptyDeck());R.render();return 1})()"); time.sleep(0.3)
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
    # A long press on a thumbnail starts picking slides (checkboxes); a tap adds another.
    ev("(()=>{document.activeElement?.blur?.();const R=window.__revela;R.slides.addSlide();R.slides.goToSlide(0);R.render();return 1})()"); time.sleep(0.3)
    a = rect('#navigator .thumb[data-index="0"]'); touch('touchStart', a['x'], a['y']); time.sleep(0.8); touch('touchEnd'); time.sleep(0.3)
    a = rect('#navigator .thumb[data-index="1"]'); touch('touchStart', a['x'], a['y']); touch('touchEnd'); time.sleep(0.4)
    check(ev("(()=>{const R=window.__revela,c=document.querySelector('#navigator .thumb[data-index=\"1\"] .thumb-check');return R.state.ui.slidePick&&R.store.slideSelCount()===2&&!!c&&getComputedStyle(c).display!=='none'&&!!document.querySelector('.nav-pick')})()"),
      'pulsación larga en una miniatura: elegir varias diapositivas con casillas')
    ev("document.querySelector('.nav-pick .np-done')?.click();document.getElementById('context-menu').hidden=true;1"); time.sleep(0.2)
    # Turned on its side: the slide is fitted and seen whole; the title bar fits upright too.
    ev("document.activeElement?.blur?.();1")
    fits = "(()=>{const w=document.getElementById('canvas-wrap').getBoundingClientRect(),s=document.getElementById('stage').getBoundingClientRect();return s.width>100&&s.left>=w.left-1&&s.right<=w.right+1&&s.top>=w.top-1&&s.bottom<=w.bottom+1})()"
    check(ev(fits), 'en vertical la diapositiva se ve entera')
    check(ev("document.querySelector('.titlebar').scrollWidth<=innerWidth+1"), 'la barra de título cabe en vertical')
    check(ev("(()=>{const r=document.querySelector('.titlebar [data-action=present]').getBoundingClientRect();return r.width>20&&r.right<=innerWidth})()"), 'en el móvil se ve el botón Presentar')
    # A new object's tab opens and shows whole, though the tabs scroll.
    tabin = ev("(async()=>{const R=window.__revela;R.store.commit(()=>R.store.setSelection(null),{history:false});await new Promise(r=>setTimeout(r,100));document.querySelector('#ribbon [data-tab=ctx]').textContent='';document.querySelector('#ribbon .tabs').scrollLeft=0;R.blocks.addShape('rect');await new Promise(r=>setTimeout(r,300));const t=document.querySelector('#ribbon [data-tab=ctx]').getBoundingClientRect(),b=document.querySelector('#ribbon .tabs').getBoundingClientRect();return t.width>20&&t.left>=b.left-1&&t.right<=b.right+1})()")
    check(tabin, 'la pestaña del objeto nuevo se ve entera')
    # Dialogs (and the Animation pane, under the slide there) fit the phone's width (some ask for a minimum width of their own).
    wide = ev("(async()=>{const out=[];for(const a of ['deck-settings','anim-panel','shortcuts']){document.querySelector(`[data-action=${a}]`).click();await new Promise(r=>setTimeout(r,200));const m=a==='anim-panel'?document.getElementById('anim-pane'):document.querySelector('.modal-backdrop:last-of-type .modal');const r=m?.getBoundingClientRect();if(!m||r.left<0||r.right>innerWidth+1||m.scrollWidth>m.clientWidth+1)out.push(a);document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove());if(a==='anim-panel')document.querySelector('#anim-pane .cm-close')?.click()}return out.join(',')})()")
    check(wide == '', 'los diálogos caben a lo ancho en el móvil (' + str(wide) + ')')
    ev("(()=>{const R=window.__revela;R.store.commit(()=>R.store.setSelection(null),{history:false});return 1})()"); time.sleep(0.2)
    check(ev("(()=>{const t=document.querySelector('#ribbon [data-tab=home]').getBoundingClientRect(),b=document.querySelector('#ribbon .tabs').getBoundingClientRect();return t.left>=b.left-1&&t.right<=b.right+1})()"), 'al quitar la selección, la pestaña Inicio se ve')
    # Insert ▸ Shapes: its three rows of small shapes, not stretched over the group's name.
    shapes = ev("(async()=>{document.querySelector('#ribbon [data-tab=insert]').click();await new Promise(r=>setTimeout(r,200));const g=document.querySelector('[data-shape-gallery]'),b=g.querySelector('button').getBoundingClientRect(),l=g.closest('.group').querySelector(':scope>label').getBoundingClientRect(),gr=g.getBoundingClientRect();document.querySelector('#ribbon [data-tab=home]').click();return b.height<32&&gr.bottom<=l.top+1})()")
    check(shapes, 'Insertar ▸ Formas: las formas no se estiran sobre el nombre del grupo')
    # Menus and the ribbon's small windows, opened from a button at either edge: whole on a phone's screen.
    out = ev("""(async()=>{const bad=[],W=innerWidth,H=innerHeight,inside=(el,n)=>{const r=el.getBoundingClientRect();if(r.left<-1||r.right>W+1||r.top<-1||r.bottom>H+1)bad.push(n+' '+[r.left,r.right,r.bottom].map(Math.round).join('/'));};
      const P=await import('/src/ui/ribbon/popovers.js'),S=await import('/src/ui/shell/where.js'),types=[...new Set([...document.querySelectorAll('[data-more]')].map(x=>x.dataset.more)),'symbols','icons','wordart'];
      for(const side of ['left','right']){const a=document.createElement('button');a.textContent='x';a.style.cssText=`position:fixed;top:120px;${side}:4px;width:30px;height:30px`;document.body.appendChild(a);
        for(const t of types){P.closePopover();P.togglePopover(a,t);await new Promise(r=>setTimeout(r,30));const p=document.querySelector('.popover');if(p)inside(p,t+'@'+side);}
        P.closePopover();S.openSaveWhere(a);await new Promise(r=>setTimeout(r,30));const m=document.getElementById('save-where');if(m){inside(m,'guardar@'+side);m.remove();}a.remove();}
      return bad.join(', ');})()""")
    check(out == '', 'los menús y ventanitas caben enteros en el móvil (' + str(out) + ')')
    recv(send('Emulation.setDeviceMetricsOverride', sid, width=844, height=390, deviceScaleFactor=2, mobile=True)); time.sleep(0.8)
    check(ev(fits), 'en horizontal (móvil tumbado) la diapositiva se ve entera')
    return fails


def math_keyboard_check(send, recv, port):
    """The equation editor's virtual keyboard with real mouse clicks, in a
    top-level page (inside the suite's iframe MathLive shows it elsewhere)."""
    import json as _j
    tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
    sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
    ev = lambda e: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True)).get('result', {}).get('result', {}).get('value')
    def click(x, y, n=1):
        for c in range(1, n + 1):
            for kind in ('mousePressed', 'mouseReleased'):
                recv(send('Input.dispatchMouseEvent', sid, type=kind, x=x, y=y, button='left', clickCount=c))
    def wait(expr, secs=15):
        end = time.time() + secs
        while time.time() < end:
            v = ev(expr)
            if v: return v
            time.sleep(0.2)
        return None
    recv(send('Emulation.setDeviceMetricsOverride', sid, width=1280, height=800, deviceScaleFactor=1, mobile=False))
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test')); time.sleep(3)
    ev("(()=>{const R=window.__revela;R.store.replaceDeck(R.model.emptyDeck());R.blocks.addMath();R.blocks.setMath('x');R.render();return 1})()"); time.sleep(0.5)
    fails = []
    def check(ok, name):
        if not ok: fails.append('✗ ecuación: ' + name)
    rect = lambda js: _j.loads(ev(f"(()=>{{const e={js};if(!e)return 'null';const r=e.getBoundingClientRect();return JSON.stringify({{x:r.left+r.width/2,y:r.top+r.height/2}})}})()") or 'null')
    bid = ev("window.__revela.store.currentSlide().blocks.at(-1).id")
    r = rect(f"document.querySelector('#stage .block[data-id=\"{bid}\"]')")
    click(r['x'], r['y'], 2)
    check(wait("!!document.querySelector('#math-modal math-field')"), 'doble clic abre el editor')
    check(wait("!!window.mathVirtualKeyboard?.visible"), 'el teclado virtual se muestra')
    key = wait("(()=>{const k=[...document.querySelectorAll('.ML__keyboard .MLK__layer.is-visible .MLK__keycap')].find(k=>/^7/.test(k.textContent.trim())&&k.getBoundingClientRect().width>0);if(!k)return null;const r=k.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()")
    check(key, 'tecla 7 visible')
    if key:
        k = _j.loads(key)
        top = ev(f"(()=>{{const e=document.elementFromPoint({k['x']},{k['y']});return !!e?.closest('.ML__keyboard')}})()")
        check(top, 'el teclado está por encima del diálogo')
        click(k['x'], k['y']); time.sleep(0.5)
        check(ev("!!document.getElementById('math-modal')"), 'pulsar una tecla no cierra el editor')
        latex = ev(f"window.__revela.store.currentSlide().blocks.find(b=>b.id==='{bid}').latex") or ''
        check('7' in latex, f'la tecla escribe en la ecuación ({latex})')
    # Every keyboard (123, ∞≠∈, abc, αβγ), chosen with a real click on its tab, fits on the
    # screen, on a laptop and on a phone, and the dialog stays visible above it.
    fits = """(()=>{const vis=[...document.querySelectorAll('.ML__keyboard .MLK__layer')].find(l=>getComputedStyle(l).display!=='none');
      const caps=[...vis.querySelectorAll('.MLK__keycap, .action')].filter(k=>k.getBoundingClientRect().width>0);
      const out=caps.filter(k=>{const r=k.getBoundingClientRect();return r.left<-1||r.top<-1||r.right>innerWidth+1||r.bottom>innerHeight+1}).length;
      const md=document.querySelector('#math-modal .modal').getBoundingClientRect(), pl=document.querySelector('.ML__keyboard .MLK__plate').getBoundingClientRect();
      return JSON.stringify({n:caps.length,out,over:Math.round(md.bottom-pl.top),w:document.documentElement.scrollWidth-innerWidth,id:vis.id})})()"""
    for w, h in ((1280, 800), (390, 800)):
        recv(send('Emulation.setDeviceMetricsOverride', sid, width=w, height=h, deviceScaleFactor=1, mobile=False)); time.sleep(0.6)
        seen = set()
        for name in ('∞≠∈', 'abc', 'αβγ', '123'):
            tab = ev(f"(()=>{{const t=[...[...document.querySelectorAll('.ML__keyboard .MLK__layer')].find(l=>getComputedStyle(l).display!=='none')?.querySelectorAll('.layer-switch')].find(x=>x.textContent.trim()==={_j.dumps(name)});if(!t)return null;const r=t.getBoundingClientRect();return JSON.stringify({{x:r.left+r.width/2,y:r.top+r.height/2,t:t.textContent.trim()}})}})()")
            if not tab: check(False, f'pestaña «{name}» del teclado ({w}×{h})'); continue
            t = _j.loads(tab)
            top = ev(f"(()=>{{const e=document.elementFromPoint({t['x']},{t['y']});return !!e?.closest('.ML__keyboard')}})()")
            check(top, f'la pestaña «{name}» se ve y se puede pulsar ({w}×{h})')
            click(t['x'], t['y']); time.sleep(0.4)
            raw = ev(fits)
            if not raw:
                check(False, f'pulsar la pestaña «{t["t"]}» no cierra el editor ({w}×{h})')
                continue
            f = _j.loads(raw)
            seen.add(f['id'])
            check(f['n'] > 10 and f['out'] == 0, f'teclado «{t["t"]}» entero en pantalla a {w}×{h} ({f["out"]} teclas fuera)')
            check(f['over'] <= 0 and f['w'] <= 0, f'el diálogo se ve encima del teclado «{t["t"]}» a {w}×{h} y nada se sale por los lados')
        check(len(seen) == 4, f'las pestañas cambian de teclado ({len(seen)} distintos a {w}×{h})')
    # A click on the backdrop (between the dialog and the keyboard) still closes it.
    click(195, 420); time.sleep(0.4)
    check(not ev("!!document.getElementById('math-modal')"), 'un clic en el fondo cierra el editor')
    ev("document.querySelector('#math-modal .modal-close')?.click();1"); time.sleep(0.4)
    check(not ev("window.mathVirtualKeyboard?.visible"), 'al cerrar el editor se oculta el teclado')
    recv(send('Target.closeTarget', targetId=tid))
    return fails


def mouse_checks(send, recv, port):
    """Real mouse and keys (trusted events, which the suite can't make): a
    double-click on a word selects it; Esc closes a dialog and focus goes back."""
    import json as _j
    tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
    sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
    ev = lambda e: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True)).get('result', {}).get('result', {}).get('value')
    def click(x, y, n=1):
        recv(send('Input.dispatchMouseEvent', sid, type='mouseMoved', x=x, y=y))
        for c in range(1, n + 1):
            for kind in ('mousePressed', 'mouseReleased'):
                recv(send('Input.dispatchMouseEvent', sid, type=kind, x=x, y=y, button='left', clickCount=c))
    def key(k, vk):
        for kind in ('rawKeyDown', 'keyUp'):
            recv(send('Input.dispatchKeyEvent', sid, type=kind, key=k, code=k, windowsVirtualKeyCode=vk))
    recv(send('Emulation.setDeviceMetricsOverride', sid, width=1280, height=800, deviceScaleFactor=1, mobile=False))
    recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html?test')); time.sleep(3)
    ev("(()=>{const R=window.__revela;R.store.replaceDeck(R.model.emptyDeck());R.blocks.addText('Uno dos tres');R.store.setSelection(null);R.render();return 1})()"); time.sleep(0.4)
    fails = []
    def check(ok, name):
        if not ok: fails.append('✗ ratón: ' + name)
    # The middle of "dos", in the text box just added.
    at = _j.loads(ev("""(()=>{const b=window.__revela.store.currentSlide().blocks.at(-1),e=document.querySelector(`#stage .block[data-id="${b.id}"] .rich`);
      const n=document.createTreeWalker(e,NodeFilter.SHOW_TEXT).nextNode(),r=document.createRange(),i=n.nodeValue.indexOf('dos');r.setStart(n,i+1);r.setEnd(n,i+2);
      const q=r.getBoundingClientRect();return JSON.stringify({x:q.left+q.width/2,y:q.top+q.height/2})})()""") or 'null')
    if at:
        click(at['x'], at['y'], 2); time.sleep(0.3)
        sel = ev("getSelection().toString()")
        check(sel == 'dos', f'doble clic en una palabra la selecciona ({sel!r})')
    else: check(False, 'texto de prueba en la diapositiva')
    ev("document.activeElement?.blur?.();1"); time.sleep(0.2)
    # A dialog opened from a button: focus goes in; Esc closes it and focus goes back to the button.
    b = _j.loads(ev("(()=>{document.querySelector('#ribbon [data-tab=view]').click();const b=document.querySelector('#ribbon [data-action=shortcuts]');b.scrollIntoView({block:'nearest',inline:'center'});const r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,w:r.width})})()") or 'null')
    time.sleep(0.3)
    if b and b['w'] > 0:
        click(b['x'], b['y']); time.sleep(0.4)
        check(ev("!!document.activeElement?.closest('#sc-modal')"), 'al abrir un diálogo el foco entra en él')
        key('Escape', 27); time.sleep(0.3)
        check(not ev("!!document.getElementById('sc-modal')"), 'Esc cierra el diálogo')
        check(ev("document.activeElement?.dataset?.action==='shortcuts'"), 'al cerrarlo el foco vuelve al botón')
    else: check(False, 'botón de atajos en la cinta (Ver)')
    recv(send('Target.closeTarget', targetId=tid))
    return fails


def e2e_checks(send, recv, port):
    """Two real pages talking over WebRTC (PeerJS public broker): phone remote,
    live poll and audience Q&A. Needs network; run with: tests/run.sh --e2e"""
    import json as _j
    def tab(url):
        tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
        sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
        recv(send('Page.navigate', sid, url=url)); return sid
    def ev(sid, e): return recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True)).get('result', {}).get('result', {}).get('value')
    def wait(sid, e, secs=20):
        for _ in range(int(secs * 4)):
            v = ev(sid, e)
            if v: return v
            time.sleep(0.25)
        return None
    fails = []
    def check(ok, name):
        if not ok: fails.append('✗ e2e: ' + name)
    base = f'http://127.0.0.1:{port}'
    # Phone remote
    A = tab(base + '/index.html?test'); time.sleep(3)
    ev(A, "(()=>{const R=window.__revela;R.slides.addSlide();R.slides.goToSlide(0);document.querySelector('[data-action=connect-mobile]').click();return 1})()")
    code = wait(A, "(()=>{const c=document.querySelector('#host-modal .host-code')?.textContent||'';return /^[A-Z0-9]{5}$/.test(c)?c:''})()")
    check(code, 'el mando obtiene un código')
    check(ev(A, "(()=>{const c=document.querySelector('#host-modal canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let k=0;for(let i=0;i<d.length;i+=4)if(d[i]<100&&d[i+3])k++;return k>100})()"), 'QR del mando dibujado')
    link = ev(A, "document.querySelector('#host-modal .host-link')?.href||''")
    check(f'code={code}' in (link or '') and '&k=' in (link or ''), 'el enlace del QR lleva el código y la clave')
    B = tab(link or f'{base}/remote.html?code={code}')
    check(wait(A, "document.querySelector('#host-modal .host-status')?.classList.contains('on')"), 'el móvil se conecta solo desde el QR')
    wait(B, "document.getElementById('control')?.classList.contains('active')", 10)
    ev(B, "document.getElementById('next').click();1")
    check(wait(A, "window.__revela.state.ui.slideIndex===1", 8), 'Siguiente desde el móvil')
    # A second phone with the code alone: one controls at a time.
    B2 = tab(f'{base}/remote.html?code={code}')
    check(wait(B2, "!!document.getElementById('err')?.textContent&&!document.getElementById('control').classList.contains('active')", 10), 'un segundo móvil: ocupado')
    # The touchpad while presenting: the spotlight follows the finger on the real presentation.
    ev(A, "(()=>{window.__revela.io.present({fullscreen:false});return 1})()")
    wait(B, "document.getElementById('pad').classList.contains('live')", 10)   # (the phone knows the slides are on screen)
    ev(B, "(()=>{document.querySelector('[data-view=pad]').click();document.querySelector('[data-tool=spot]').click();const p=document.getElementById('pad'),r=p.getBoundingClientRect();"
          "const E=(t,u)=>p.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:3,pointerType:'touch',clientX:r.left+u*r.width,clientY:r.top+r.height/2}));"
          "E('pointerdown',.5);E('pointermove',.55);window.__up=()=>E('pointerup',.55);return 1})()")
    check(wait(A, "window.__revela.session.present?.frame.contentDocument.getElementById('__rv-spot')?.style.display==='block'", 8), 'el foco del móvil en la presentación')
    ev(B, "window.__up();1")
    check(wait(A, "window.__revela.session.present?.frame.contentDocument.getElementById('__rv-spot')?.style.display==='none'", 8), 'al levantar el dedo se quita')
    ev(A, "document.querySelector('#host-modal .host-cut')?.click();1")
    check(wait(B, "document.getElementById('connect').classList.contains('active')&&!!document.getElementById('err').textContent", 8), 'quien presenta desconecta el móvil')
    ev(A, "document.getElementById('present-close')?.click();1")
    # Live poll + Q&A inside the exported presentation
    ev(A, "(async()=>{const R=window.__revela;R.store.replaceDeck(R.model.emptyDeck());R.poll.addPoll({question:'P',options:['A','B']});R.slides.addSlide();R.poll.addPoll({question:'Q',kind:'qa'});R.slides.goToSlide(0);"
          "const html=R.io.buildHTML().replace(/https:\\/\\/fmesasc\\.github\\.io\\/revela\\/vote\\.html/g,location.origin+'/vote.html');document.open();document.write(html);document.close();return 1})()")
    vcode = wait(A, "(()=>{const c=document.querySelector('.rv-poll-code')?.textContent||'';return /^[A-Z0-9]{5}$/.test(c)?c:''})()")
    check(vcode, 'la votación obtiene un código')
    V = tab(f'{base}/vote.html?c={vcode}')
    check(wait(V, "!document.getElementById('poll').hidden"), 'el móvil recibe la pregunta')
    ev(V, "document.querySelectorAll('#answers .opt')[1].click();document.getElementById('send').click();1")
    check(wait(A, "/B\\s*1/.test(document.querySelector('.rv-poll-res').innerText)", 10), 'el voto actualiza el gráfico')
    ev(A, "Reveal.next();1")
    wait(V, "!!document.querySelector('#answers textarea')", 10)
    ev(V, "document.querySelector('#answers textarea').value='¿Hola?';document.querySelector('#answers button').click();1")
    check(wait(A, "[...document.querySelectorAll('.rv-poll-res')].some(e=>/¿Hola\\?/.test(e.innerText))", 10), 'pregunta del público en pantalla')
    # Co-editing: A shares with an edit link, B opens it; changes and chat both ways.
    C = tab(base + '/index.html?test'); time.sleep(3)
    ev(C, "(()=>{localStorage.setItem('revela.author','Ana');localStorage.setItem('revela.shareServer',JSON.stringify({url:'off'}));const R=window.__revela;R.store.replaceDeck(R.model.emptyDeck());R.store.commit(()=>{R.state.deck.name='Coedición'});document.querySelector('[data-action=collab]').click();return 1})()")
    wait(C, "!!document.querySelector('.dlg-ok')", 5); ev(C, "document.querySelector('.dlg-ok').click();1")
    link = wait(C, "document.querySelector('#collab-modal .cb-link[data-role=edit]')?.value||''")
    check(link, 'colaborar da un enlace de edición')
    if link:
        G = tab(link + '&test')
        check(wait(G, "window.__revela?.state.deck.name==='Coedición'"), 'el invitado ve la presentación')
        check(wait(C, "document.querySelectorAll('#collab-bar .cb-av').length===1"), 'el anfitrión ve al invitado en la barra')
        ev(G, "(()=>{const R=window.__revela;R.store.commit(()=>{R.state.deck.slides[0].blocks[0].x=777});return 1})()")
        check(wait(C, "window.__revela.state.deck.slides[0].blocks[0].x===777", 10), 'el cambio del invitado llega al anfitrión')
        ev(C, "(()=>{const R=window.__revela;R.store.commit(()=>{R.state.deck.slides[0].notes='nota de Ana'});return 1})()")
        check(wait(G, "window.__revela.state.deck.slides[0].notes==='nota de Ana'", 10), 'el cambio del anfitrión llega al invitado')
        ev(G, "(()=>{document.querySelector('#collab-bar .collab-chat-btn').click();const i=document.querySelector('#collab-chat .cc-in');i.value='¡Hola!';i.form.requestSubmit();return 1})()")
        check(wait(C, "[...document.querySelectorAll('#collab-bar .collab-unread')].some(e=>e.textContent==='1')", 10), 'el chat avisa de un mensaje nuevo')
    return fails


def site_checks(send, recv):
    """The official site as Cloudflare Pages publishes it (tools/build-site.mjs):
    home, plans and support at the top, the app in /app/ as the official edition,
    working like the open one."""
    if not shutil.which('node'): return []
    out = tempfile.mkdtemp(prefix='revela-site-')
    subprocess.run(['node', os.path.join(ROOT, 'tools', 'build-site.mjs'), out], check=True, stdout=subprocess.DEVNULL)

    # A stand-in for the accounts API (server/cloudflare/api.js has its own tests):
    # enough to see the official edition use it.
    seen = {'ai': []}
    class Site(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k): super().__init__(*a, directory=out, **k)
        def log_message(self, *a): pass
        def reply(self, status, obj, extra=None):
            b = json.dumps(obj).encode(); self.send_response(status); self.send_header('Content-Type', 'application/json')
            for k, v in (extra or {}).items(): self.send_header(k, v)
            self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
        def signed(self): return 'rv_session=ok' in (self.headers.get('Cookie') or '')
        def do_GET(self):
            # A poll answered later by a link (public: server/cloudflare/docs.js has its own tests).
            if self.path == '/api/docs/abcdefghijklmnop1234/poll/pollx1':
                return self.reply(200, {'poll': {'pollId': 'pollx1', 'kind': 'number', 'question': '¿Cuántos kilos?', 'options': [], 'min': 0, 'max': 10, 'unit': 'kg'}, 'name': 'Charla de otoño'})
            if self.path.startswith('/api/docs/abcdefghijklmnop1234/poll/'): return self.reply(404, {'error': 'not found'})
            # A tracked link (view.html?doc=…&r=…) that asks for the email first (docs.js has its own tests).
            if self.path.startswith('/api/docs/abcdefghijklmnop1234?'):
                q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                if q.get('r') != ['seguimiento1234']: return self.reply(401, {'error': 'sign in'})
                if not q.get('e'): return self.reply(200, {'ask': True, 'name': 'Propuesta para Acme'})
                seen['tracked'] = q
                return self.reply(200, {'role': 'present', 'name': 'Propuesta para Acme', 'deck': {'name': 'Propuesta para Acme', 'size': {'w': 1280, 'h': 720},
                    'slides': [{'id': 'sl1', 'blocks': [{'id': 'b1', 'type': 'text', 'html': 'Hola, Acme', 'x': 80, 'y': 80, 'w': 800, 'h': 120, 'fontSize': 60}]}, {'id': 'sl2', 'blocks': []}]}})
            if self.path.startswith('/api/me'):
                return self.reply(200, {'email': 'ana@example.com', 'plan': 'free', 'credits': 50, 'features': ['ai', 'cloud-save'], 'billing': False, 'photos': ['unsplash']}) if self.signed() else self.reply(401, {'error': 'no session'})
            if self.path.startswith('/api/') and not self.signed(): return self.reply(401, {'error': 'no session'})
            if self.path == '/api/team':
                return self.reply(200, {'team': {'id': 'team123456789', 'name': 'IES Ejemplo', 'seats': 3, 'active': True, 'until': 1893456000000, 'members': {'ana@example.com': {'role': 'admin'}, 'pepe@example.com': {'role': 'member'}},
                    'invited': {'eva@example.com': {'role': 'member'}}, 'brand': {'name': 'Centro', 'colors': ['#123456', '#ffffff']}, 'templates': [{'id': 'tpl1', 'name': 'Plantilla del centro'}]}, 'role': 'admin', 'invites': []})
            if self.path == '/api/docs':
                return self.reply(200, {'mine': [{'id': 'abcdefghijklmnop1234', 'name': 'Charla de otoño', 'updated': 1790000000000}], 'shared': [{'id': 'zyxwvutsrqponmlk9876', 'name': 'De Luis', 'owner': 'luis@example.com', 'role': 'comment'}], 'limit': 3})
            if self.path.startswith('/api/stock/search'):
                return self.reply(200, {'results': [{'id': 'f1', 'thumb': '/app/icons/icon-192.png', 'src': '/app/icons/icon-512.png', 'width': 512, 'height': 512, 'alt': 'Logo',
                    'author': 'Ana Foto', 'authorUrl': 'https://unsplash.com/@ana', 'source': 'Unsplash', 'sourceUrl': 'https://unsplash.com'}]})
            return super().do_GET()
        def do_POST(self):
            body = self.rfile.read(int(self.headers.get('Content-Length') or 0))
            if self.path == '/api/docs/abcdefghijklmnop1234/poll/pollx1': seen.setdefault('later', []).append(json.loads(body or b'{}')); return self.reply(200, {'ok': True})
            if self.path == '/api/docs/abcdefghijklmnop1234/view': seen.setdefault('views', []).append(json.loads(body or b'{}')); return self.reply(200, {'ok': True})
            if self.path == '/api/login': return self.reply(200, {'ok': True}, {'Set-Cookie': 'rv_session=ok; Path=/api; HttpOnly; SameSite=Strict'})
            if self.path == '/api/docs/thumbs': return self.reply(200, {'thumbs': {}}) if self.signed() else self.reply(401, {'error': 'no session'})
            if self.path == '/api/stock/used': seen.setdefault('used', []).append(json.loads(body or b'{}')); return self.reply(200, {'ok': True})
            if self.path == '/api/support': seen.setdefault('support', []).append(json.loads(body or b'{}')); return self.reply(200, {'ok': True, 'id': 1001, 'mailed': True})
            if self.path == '/api/ai/chat':
                if not self.signed(): return self.reply(401, {'error': 'no session'})
                seen['ai'].append(json.loads(body or b'{}')); return self.reply(200, {'choices': [{'message': {'content': 'hola desde el servidor'}}], 'charged': 3})
            return self.reply(404, {'error': 'not found'})
    srv = socketserver.TCPServer(('127.0.0.1', 0), Site); port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    fails = []
    def check(ok, name):
        if not ok: fails.append('✗ web: ' + name)
    try:
        tid = recv(send('Target.createTarget', url='about:blank'))['result']['targetId']
        sid = recv(send('Target.attachToTarget', targetId=tid, flatten=True))['result']['sessionId']
        ev = lambda e: recv(send('Runtime.evaluate', sid, expression=e, awaitPromise=True, returnByValue=True)).get('result', {}).get('result', {}).get('value')
        # The home page: its pictures load, its own links lead somewhere (Pages serves /pricing as pricing.html;
        # /community is the Worker's: tests/server-api.mjs checks it).
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html')); time.sleep(1.5)
        check('Revela' in (ev('document.title') or ''), 'portada')
        # (Pictures further down load when scrolled to: those are checked by fetching them.)
        check(ev("Promise.all([...document.images].map(i=>i.loading==='lazy'?fetch(i.src).then(r=>r.ok):i.complete&&i.naturalWidth>0)).then(a=>a.every(Boolean))"), 'las imágenes de la portada cargan')
        bad = ev(r"""(async()=>{const hrefs=[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>!/^(https?:|#|mailto:)/.test(h)&&!/^\/community/.test(h)).map(h=>h.split('#')[0]).filter(Boolean))];
          const bad=[];for(const h of hrefs){const u=/[.\/]$/.test(h)||/\.html$/.test(h)?h:h+'.html';const r=await fetch(u);if(!r.ok)bad.push(h);}return bad.join(',')})()""")
        check(bad == '', 'enlaces rotos en la portada: ' + str(bad))
        for page in ('pricing.html', 'support.html', 'privacy.html', 'terms.html'):
            check(ev(f"fetch('{page}').then(r=>r.ok)"), 'página ' + page)
        # The live presentation on the home page: loaded after the page, a real exported one.
        # A poll answered later, by its link: the poll from the cloud, the answer back to it.
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/app/vote.html?doc=abcdefghijklmnop1234&poll=pollx1')); time.sleep(1.5)
        check(ev("document.getElementById('q').textContent") == '¿Cuántos kilos?' and ev("!document.getElementById('poll').hidden"), 'responder más tarde: la votación por su enlace')
        ev("(()=>{const n=document.querySelector('#answers input[type=number]');n.value='7';n.dispatchEvent(new Event('input'));document.getElementById('send').click();return 1})()"); time.sleep(0.8)
        later = seen.get('later') or [{}]
        check(later[-1].get('answer') == 7 and len(str(later[-1].get('voter', ''))) >= 8 and ev("!document.getElementById('done').hidden"), 'responder más tarde: se envía y se confirma: ' + str(later))
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/app/vote.html?doc=abcdefghijklmnop1234&poll=otra1')); time.sleep(1.2)
        check('ya no está abierta' in (ev("document.body.innerText") or ''), 'responder más tarde: una cerrada lo dice')
        # A tracked link: the email first (with whom it goes to), then the presentation, and what's looked at counted with the link.
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/app/view.html?doc=abcdefghijklmnop1234&r=seguimiento1234')); time.sleep(1.5)
        check(ev("!!document.querySelector('#m form input[type=email]') && /Propuesta para Acme/.test(document.body.innerText)"), 'enlace con seguimiento: pide el correo antes de verla')
        ev("(()=>{const f=document.querySelector('#m form');f.querySelector('input[type=email]').value='leo@cliente.com';f.querySelector('input[type=text]').value='Leo';f.requestSubmit();return 1})()"); time.sleep(3)
        tr = seen.get('tracked') or {}
        check(tr.get('e') == ['leo@cliente.com'] and tr.get('n') == ['Leo'], 'enlace con seguimiento: manda el correo y el nombre: ' + str(tr))
        check(ev("!!window.Reveal&&Reveal.isReady()&&/Hola, Acme/.test(document.body.innerText)"), 'enlace con seguimiento: y la muestra presentada')
        ev("Reveal.next(),1"); time.sleep(2.2)
        vs = seen.get('views') or []
        check(any(v.get('r') == 'seguimiento1234' and v.get('enter') and v.get('slide') == 'sl1' for v in vs) and any(v.get('slide') == 'sl1' and v.get('ms', 0) > 0 for v in vs) and any(v.get('slide') == 'sl2' for v in vs),
              'enlace con seguimiento: cuenta cada diapositiva y su tiempo, con su enlace: ' + str(vs)[:300])
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html')); time.sleep(1.5)
        check(ev("(f=>!!f&&/\\/demo\\/reloj\\.html$/.test(f.src))(document.querySelector('.live iframe'))") and ev("fetch('/demo/reloj.html').then(r=>r.text()).then(t=>/Reveal\\.initialize/.test(t)&&/noindex/.test(t)&&!/fonts\\.googleapis/.test(t))"), 'la presentación en directo de la portada')
        # In other languages: each its own address, with links between them for search engines.
        check(ev("[...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l=>l.hreflang).join()") == 'es,en,fr,de,it,pt,ca,gl,nl,eu,ar,x-default', 'hreflang en la portada')
        # (Plus the templates' pages, when the site makes them — site/tools/pages.mjs: the list and one page each, in every language.)
        tdir = os.path.join(out, 'templates'); made = (['templates'] + os.listdir(tdir)) if os.path.isdir(tdir) else []
        check(ev("fetch('sitemap.xml').then(r=>r.text()).then(t=>(t.match(/<loc>/g)||[]).length)") == 81 + 11 * len(made), f'sitemap: 7 páginas × 11 idiomas + 4 legales + {len(made)} de plantillas × 11')
        if os.path.exists(os.path.join(ROOT, 'site', 'tools', 'pages.mjs')):
            check(len(made) > 100, f'las páginas de las plantillas: {len(made)}')
            recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/templates.html')); time.sleep(1.5)
            cards = ev("document.querySelectorAll('.tpl-card').length") or 0
            check(cards == len(made) - 1 and ev("document.querySelectorAll('.tpl-group h2').length") >= 6, f'la lista de plantillas, por grupos: {cards}')
            bad = ev(r"""(async()=>{const u=[...new Set([...document.querySelectorAll('.tpl-card')].flatMap(a=>[a.getAttribute('href')+'.html',a.querySelector('img').getAttribute('src')]))];
              const bad=[];await Promise.all(u.map(h=>fetch(h).then(r=>{if(!r.ok)bad.push(h)})));return bad.join(',')})()""")
            check(bad == '', 'cada plantilla de la lista, con su página y su portada: ' + str(bad)[:300])
            first = ev("document.querySelector('.tpl-card').getAttribute('href')")
            recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/en{first}.html')); time.sleep(1.5)
            check(ev("document.documentElement.lang") == 'en' and ev("document.querySelector('link[rel=canonical]').href") == 'https://revelaslides.com/en' + first, 'una plantilla en inglés, con su dirección: ' + str(first))
            check(ev("[...document.querySelectorAll('link[rel=alternate][hreflang]')].length") == 12 and ev("document.querySelector('.site-langs a[hreflang=ar]').getAttribute('href')") == '/ar' + first, 'con sus otros idiomas')
            check(ev("(a=>!!a&&/^\\/app\\/\\?template=\\w+&lang=en$/.test(a.getAttribute('href')))(document.querySelector('.tpl-hero .btn.primary'))"), 'el botón la abre en la aplicación, en inglés')
            check(ev("(i=>i.complete&&i.naturalWidth===640)(document.querySelector('.tpl-cover img'))") and ev("document.querySelectorAll('.tpl-slides li').length") > 3, 'su portada y sus diapositivas')
            check(ev("JSON.parse(document.querySelector('script[type=\"application/ld+json\"]').textContent)['@graph'][0].inLanguage") == 'en' and not ev("/Plantillas|diapositivas|Usar esta/.test(document.body.innerText)"), 'datos para buscadores en inglés, y sin restos en español')
            recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/index.html')); time.sleep(1)
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/en/pricing.html')); time.sleep(1.5)
        check(ev("document.documentElement.lang") == 'en' and 'Pric' in (ev('document.title') or ''), 'precios en inglés: ' + str(ev('document.title')))
        check(ev("document.querySelector('link[rel=canonical]').href") == 'https://revelaslides.com/en/pricing', 'su dirección canónica')
        check(ev("[...document.querySelectorAll('a[href^=\"/app/\"]')].every(a=>/[?&]lang=en/.test(a.href))"), 'abre la aplicación en inglés')
        check(ev("document.querySelector('.site-langs a[aria-current]').lang") == 'en', 'menú de idiomas')
        check(not ev("/IVA|Precios|Gratis para/.test(document.body.innerText)"), 'sin restos en español')
        bad = ev(r"""(async()=>{const hrefs=[...new Set([...document.querySelectorAll('a[href],link[href],img[src],script[src]')].map(a=>a.getAttribute('href')||a.getAttribute('src')).filter(h=>h.startsWith('/')&&!h.startsWith('/app/')&&!h.startsWith('/community')).map(h=>h.split('#')[0]))];
          const bad=[];for(const h of hrefs){const u=/\/$/.test(h)||/\.\w+$/.test(h)?h:h+'.html';const r=await fetch(u);if(!r.ok)bad.push(h);}return bad.join(',')})()""")
        check(bad == '', 'enlaces rotos en /en/: ' + str(bad))
        # The app in /app/: the official edition, and working.
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/app/index.html?test')); time.sleep(3)
        check(ev("!!window.__revela"), 'la aplicación arranca en /app/')
        check(ev("document.body.dataset.edition") == 'cloud', 'edición oficial en /app/')
        check(ev("document.getElementById('premium').hidden"), 'sin el botón «Versión premium» en la edición oficial')
        n = ev("(()=>{const R=window.__revela;R.store.replaceDeck(R.model.emptyDeck());R.slides.addSlide('blank');return R.state.deck.slides.length})()")
        check(n == 2, 'añadir una diapositiva en /app/')
        check((ev("window.__revela.io.buildHTML().length") or 0) > 5000, 'exportar la presentación en /app/')
        check(ev("fetch('sw.js').then(r=>r.ok)") and ev("fetch('auth.html').then(r=>r.ok)"), 'archivos de la aplicación en /app/')
        # The account: signed out, then in; its AI goes through the server (no OpenRouter key here).
        check(ev("(b=>!b.hidden&&/Iniciar sesi/.test(b.textContent))(document.getElementById('plan-btn'))"), 'botón de la cuenta: iniciar sesión')
        ev("fetch('/api/login',{method:'POST',body:'{}'}).then(()=>import('./src/io/cloud/account.js')).then(m=>m.refreshAccount()).then(()=>1)"); time.sleep(0.3)
        check(ev("document.querySelector('#plan-btn span').textContent.trim()") == '50', 'con sesión: sus créditos en el botón')
        ans = ev("import('./src/features/ai/openrouter.js').then(m=>m.chat([{role:'user',content:'Hola'}],{maxTokens:100}))")
        check(ans == 'hola desde el servidor' and seen['ai'] and seen['ai'][-1].get('max_tokens') == 100, 'la IA de la cuenta, por el servidor: ' + str(ans))
        ev("document.getElementById('plan-btn').click();1"); time.sleep(0.4)
        check(ev("(m=>!!m&&/50/.test(m.querySelector('.acc-credits').textContent)&&m.querySelector('[data-buy]').disabled)(document.getElementById('account-modal'))"), '«Mi cuenta»: créditos, y pagos aún no disponibles')
        check(ev("!!document.querySelector('#account-modal .acc-team')&&!!document.querySelector('#account-modal .acc-export')&&!!document.querySelector('#account-modal .acc-delete')"), '«Mi cuenta»: equipos y tus datos')
        check(ev("!!document.querySelector('#account-modal .acc-report')"), '«Mi cuenta»: informar de un problema')
        ev("document.querySelector('#account-modal .modal-close').click();1")
        # «Informar de un problema», signed in: answered at the account's address; the deck only if ticked.
        ev("document.querySelector('[data-action=\"report-problem\"]').click();1"); time.sleep(0.3)
        check(ev("(m=>!!m&&!m.querySelector('.rp-email')&&/ana@example.com/.test(m.textContent))(document.getElementById('report-modal'))"), 'informar de un problema con sesión: se responde a su correo')
        ev("(()=>{const m=document.getElementById('report-modal');m.querySelector('.rp-cat').value='ai';m.querySelector('.rp-msg').value='La IA no contesta';m.querySelector('.rp-attach').checked=true;m.querySelector('.rp-send').click();return 1})()"); time.sleep(0.6)
        rep = (seen.get('support') or [{}])[-1]
        check(rep.get('category') == 'ai' and rep.get('message') == 'La IA no contesta' and '"slides"' in (rep.get('attach') or '') and rep.get('version', '').startswith('cloud ') and 'email' not in rep, 'el informe llega con la versión y la presentación adjunta: ' + str({k: v for k, v in rep.items() if k != 'attach'}))
        check(ev("/#1001/.test(document.querySelector('.modal-backdrop .dlg-msg')?.textContent||'')") and not ev("!!document.getElementById('report-modal')"), 'y dice su número')
        ev("document.querySelector('.modal-backdrop .dlg-ok')?.click();1")
        # Revela's cloud: the group in File, my presentations, sharing with people (not saved yet)
        check(ev("getComputedStyle(document.querySelector('[data-action=\"cloud-docs\"]').closest('.group')).display!=='none'"), 'la nube de Revela en Archivo (solo en la edición oficial)')
        ev("document.querySelector('[data-action=\"cloud-docs\"]').click();1"); time.sleep(0.6)
        check(ev("(m=>!!m&&/Charla de otoño/.test(m.textContent)&&/1 de 3 presentaciones/.test(m.textContent))(document.getElementById('cloud-docs-modal'))"), '«Mi nube»: las mías (con el límite)')
        ev("document.querySelector('#cloud-docs-modal [data-sec=\"shared\"]').click();1"); time.sleep(0.3)
        check(ev("(m=>/De Luis/.test(m.textContent)&&/luis@example.com/.test(m.textContent))(document.getElementById('cloud-docs-modal'))"), '«Mi nube»: y las compartidas conmigo, aparte')
        ev("document.querySelector('#cloud-docs-modal .modal-close').click();document.querySelector('[data-action=\"cloud-share\"]').click();1"); time.sleep(0.5)
        check(ev("!!document.querySelector('#cloud-share-modal .cl-save')"), '«Personas»: primero, guardarla en la nube')
        ev("document.querySelector('#cloud-share-modal .modal-close').click();1")
        # My team
        ev("import('./src/ui/dialogs/team.js').then(m=>m.openTeam()).then(()=>1)"); time.sleep(0.8)
        check(ev("(m=>!!m&&/IES Ejemplo/.test(m.textContent)&&/3\\/3/.test(m.textContent)&&/Plantilla del centro/.test(m.textContent)&&!!m.querySelector('.tm-invite')&&!!m.querySelector('.tm-sw'))(document.getElementById('team-modal'))"), '«Mi equipo»: personas y puestos, marca y plantillas')
        ev("document.querySelector('#team-modal .modal-close').click();1")
        # Photos (Unsplash/Pexels through the server)
        ev("(()=>{localStorage.setItem('revela.consent.revelaphotos','1');document.querySelector('[data-action=\"insert-stock\"]').click();return 1})()"); time.sleep(0.4)
        check(ev("!!document.querySelector('[data-et=\"photos\"]')"), 'pestaña Fotos (el servidor la ofrece)')
        ev("(()=>{document.querySelector('[data-et=\"photos\"]').click();const q=document.querySelector('.sk-q');q.value='faro';document.querySelector('.sk-go').click();return 1})()"); time.sleep(0.8)
        ev("(()=>{const it=document.querySelector('#elements-panel .el-grid .el-item, #elements-panel .el-grid button');it&&it.click();return 1})()"); time.sleep(0.5)
        check(ev("(b=>!!b&&b.caption==='Ana Foto / Unsplash')(window.__revela.state.deck.slides[window.__revela.state.ui.slideIndex].blocks.at(-1))"), 'una foto añadida, con su autor')
        check(seen.get('used') and seen['used'][-1].get('id') == 'f1', 'y se avisa a Unsplash de que se usa')
        # From the website in English, the app starts in English (and keeps it).
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/app/index.html?test&lang=en')); time.sleep(3)
        check(ev("document.documentElement.lang") == 'en' and ev("localStorage.getItem('revela.lang')") == 'en', 'la aplicación con ?lang=en, en inglés')
        ev("localStorage.removeItem('revela.lang');1")
        recv(send('Target.closeTarget', targetId=tid))
    finally:
        srv.shutdown(); shutil.rmtree(out, ignore_errors=True)
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
                             '--lang=es-ES', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
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
        # Uncaught errors of the page and the app frame (a module that fails to
        # load leaves the suite without the app): shown when a run fails.
        recv(send('Page.enable', sid))
        recv(send('Page.addScriptToEvaluateOnNewDocument', sid, source=
            "(function(){var k=function(m){try{(top.__errs=top.__errs||[]).push(m);}catch(e){}};"
            "addEventListener('error',function(e){k((e.message||'error')+' '+(e.filename||'')+':'+(e.lineno||''));});"
            "addEventListener('unhandledrejection',function(e){k('promise: '+(e.reason&&e.reason.message||e.reason));});})();"))
        only = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--only=')), '')
        grep = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--grep=')), '')
        qs = '&'.join(x for x in [f'only={only}' if only else '', 'grep=' + urllib.parse.quote(grep) if grep else ''] if x)
        recv(send('Page.navigate', sid, url=f'http://127.0.0.1:{port}/tests/index.html' + (f'?{qs}' if qs else '')))
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
        if out.startswith('REVELATEST PASS'): out += ' + táctil 16/16'
        math_fail = math_keyboard_check(send, recv, port) if out.startswith('REVELATEST PASS') else []
        if math_fail:
            print('REVELATEST FAIL ecuación'); print('\n'.join(math_fail)); return 1
        if out.startswith('REVELATEST PASS'): out += ' + ecuación'
        mouse_fail = mouse_checks(send, recv, port) if out.startswith('REVELATEST PASS') else []
        if mouse_fail:
            print('REVELATEST FAIL ratón'); print('\n'.join(mouse_fail)); return 1
        if out.startswith('REVELATEST PASS'): out += ' + ratón'
        # (The website is the private fmesasc/revela-site, cloned in site/: without it, its checks are skipped.)
        has_site = os.path.exists(os.path.join(ROOT, 'site', 'index.html'))
        if not has_site: print('WEB: sin site/ (repositorio privado fmesasc/revela-site): comprobaciones de la web omitidas')
        site_fail = site_checks(send, recv) if out.startswith('REVELATEST PASS') and has_site else []
        if site_fail:
            print('REVELATEST FAIL web'); print('\n'.join(site_fail)); return 1
        if out.startswith('REVELATEST PASS') and has_site and shutil.which('node'): out += ' + web'
        if out.startswith('REVELATEST PASS') and '--e2e' in sys.argv:
            e2e_fail = e2e_checks(send, recv, port)
            if e2e_fail: print('REVELATEST FAIL e2e'); print('\n'.join(e2e_fail)); return 1
            out += ' + e2e 19/19'
        if out.startswith('REVELATEST FAIL'):
            r = recv(send('Runtime.evaluate', sid, returnByValue=True,
                          expression="[...document.querySelectorAll('.row.ko')].map(e=>e.innerText.replace(/\\s+/g,' ')).join('\\n')"))
            detail = r.get('result', {}).get('result', {}).get('value') or ''
            r = recv(send('Runtime.evaluate', sid, returnByValue=True, expression="(window.__errs||[]).slice(0,10).join('\\n')"))
            errs = r.get('result', {}).get('result', {}).get('value') or ''
            print(out)
            if errs: print('Errores de la página:\n' + errs)
            print(detail[:4000]); return 1
        if not out:
            r = recv(send('Runtime.evaluate', sid, returnByValue=True, expression="window.__now||''"))
            print(f'REVELATEST FAIL (sin resultado en {TIMEOUT:.0f} s; en curso: ' + (r.get('result', {}).get('result', {}).get('value') or '?') + ')')
            return 1
        print(out)
        return 0 if out.startswith('REVELATEST PASS') else 1
    finally:
        proc.kill(); srv.shutdown(); shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
