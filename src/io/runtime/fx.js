// What Revela takes away from a map or a 3D model on this computer — said where it happens, with a way to change it.
// A map that no longer flies («Reduce motion» is on in the system), that has lost its 3D relief (light mode), that is a
// picture (no WebGL, no connection) or a model that is its picture: each gets a small badge in its corner; pressed, it
// says why and offers what can be done («Show with all the effects», «Back to the light mode», «Try again»).
// Runs as source embedded in the exported page (toString), so it imports nothing; the editor and the presentation share it.
//
// The choice is the user's, kept in this browser: 'revela.perf' ('' | 'lite' | 'full', what ?perf= has always set) and
// 'revela.motion' ('' | 'ignore': with «reduce motion» in the system, fly all the same).
//   auto    = both empty               (Revela decides from the computer and the system)
//   full    = perf full + motion ignore (every effect, whatever the computer says)
//   lite    = perf lite                 (light mode, forced)
//   motion  = perf full, motion respected (no light mode; the system's «reduce motion» still counts)
export const fxWords = t => ({
  motion: t('Movimiento reducido'), lite: t('Modo ligero'), pic3d: t('Imagen en vez de 3D'), full: t('Efectos completos'),
  whyMotion: t('Tu sistema tiene activado «Reducir movimiento»: los mapas saltan de una parada a otra sin volar, girar ni pulsar.'),
  whyLite: t('Para que vaya fluido en este equipo, el mapa se muestra sin relieve 3D.'),
  why3d: t('Este equipo no puede dibujar el modelo 3D: se muestra su imagen.'),
  whyFull: t('Todos los efectos activados. Si va lento, vuelve al modo ligero.'),
  actFull: t('Mostrar con todos los efectos'), actLite: t('Volver al modo ligero'), retry: t('Probar de nuevo'),
  slow: t('Puede ir lento en este equipo.'), settings: t('Ajustes de efectos…'),
  toast: t('Algunos efectos de mapas y 3D están reducidos en este equipo. Pulsa el aviso para saber por qué.'),
});

export function fxRuntime(W) {
  if (window.__rvFX) { Object.assign(window.__rvFX.words, W || {}); return window.__rvFX; }
  var FX = window.__rvFX = { words: W || {}, mem: {}, subs: [], pops: null };
  // ── The choice, kept (localStorage; failing that the session's; failing that this page's memory).
  function read(k) { try { var v = localStorage.getItem(k); if (v != null) return v; } catch (e) {} try { var s = sessionStorage.getItem(k); if (s != null) return s; } catch (e) {} return FX.mem[k] || ''; }
  function write(k, v) {
    FX.mem[k] = v;
    try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); return; } catch (e) {}
    try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch (e) {}
  }
  FX.perf = function () { try { var q = /[?&]perf=(lite|full)\b/.exec(location.search); if (q) return q[1]; } catch (e) {} var p = read('revela.perf'); return p === 'lite' || p === 'full' ? p : ''; };
  FX.motion = function () { return read('revela.motion') === 'ignore' ? 'ignore' : ''; };
  FX.system = function () { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };
  FX.reduced = function () { return FX.system() && FX.motion() !== 'ignore'; };
  FX.mode = function () {
    var p = FX.perf(), m = FX.motion();
    if (p === 'full' && m === 'ignore') return 'full';
    if (p === 'lite') return 'lite';
    if (p === 'full') return 'motion';
    return 'auto';
  };
  FX.set = function (mode) {
    write('revela.perf', mode === 'full' || mode === 'motion' ? 'full' : mode === 'lite' ? 'lite' : '');
    write('revela.motion', mode === 'full' ? 'ignore' : '');
    FX.apply();
  };
  // The maps alive take the new choice at once (their relief, their badge); a page that has to start again (a context
  // that would not come, no connection) is asked for again, on the same slide.
  FX.apply = function () { FX.subs.slice().forEach(function (f) { try { f(); } catch (e) {} }); FX.closePop(); };
  FX.retry = function () {
    var R = window.Reveal;
    if (R && R.getIndices) { try { sessionStorage.setItem('rvfx.at', JSON.stringify(R.getIndices())); } catch (e) {} location.reload(); return; }
    FX.apply();
  };
  (function () {
    var at; try { at = JSON.parse(sessionStorage.getItem('rvfx.at') || 'null'); sessionStorage.removeItem('rvfx.at'); } catch (e) {}
    if (!at) return;
    var n = 0, tm = setInterval(function () {
      var R = window.Reveal;
      if (R && R.isReady && R.isReady()) { clearInterval(tm); try { R.slide(at.h, at.v, at.f); } catch (e) {} } else if (++n > 100) clearInterval(tm);
    }, 100);
  })();
  // ── What this computer is (for the settings: «Now: …»).
  var probe = null;
  FX.status = function () {
    if (!probe) {
      probe = { nogl: true, soft: false, renderer: '' };
      try {
        var cv = document.createElement('canvas'), g = cv.getContext('webgl2') || cv.getContext('webgl');
        if (g) {
          probe.nogl = false;
          var x = g.getExtension('WEBGL_debug_renderer_info'); probe.renderer = x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL) || '') : '';
          probe.soft = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(probe.renderer);
          var l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext();
        }
      } catch (e) {}
    }
    var gs = window.__rvGS || {};
    return { mode: FX.mode(), media: FX.system(), nogl: probe.nogl || !!gs.dead, soft: probe.soft,
      few: !!((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4)), lost: !!gs.lite };
  };
  // ── The badge.
  function css() {
    if (document.getElementById('rvfx-css')) return;
    var s = document.createElement('style'); s.id = 'rvfx-css';
    s.textContent = '.rvfx-badge{position:absolute;left:calc(8px - var(--rvm-l,0px));bottom:calc(8px - var(--rvm-b,0px));z-index:4;display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 7px;border:0;border-radius:11px;'
      + 'background:rgba(20,24,30,.74);color:#fff;font:12px/1.3 system-ui,sans-serif;cursor:pointer;opacity:.8;pointer-events:auto;max-width:calc(100% - 16px)}'
      + '.rvfx-badge:hover,.rvfx-badge:focus-visible{opacity:1;outline:2px solid #8ab4ff}.rvfx-badge i{font:normal 13px/1 system-ui,sans-serif}'
      + '.rvfx-badge.rvfx-note{left:auto;bottom:auto;right:calc(8px - var(--rvm-r,0px));top:calc(8px - var(--rvm-t,0px))}'
      + '.rvfx-pop{position:fixed;z-index:2147483000;width:min(320px,90vw);box-sizing:border-box;padding:12px 14px;border-radius:12px;background:#fff;color:#1d1f24;font:13px/1.45 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.38)}'
      + '.rvfx-pop p{margin:0 0 8px}.rvfx-pop .rvfx-s{color:#5b6068;font-size:12px}.rvfx-pop .rvfx-b{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}'
      + '.rvfx-pop button{padding:6px 11px;border:1px solid #c9ced6;border-radius:8px;background:#f4f6f9;color:#1d1f24;font:inherit;cursor:pointer}'
      + '.rvfx-pop button.rvfx-p{background:#2457d6;border-color:#2457d6;color:#fff}.rvfx-pop button:focus-visible{outline:2px solid #2457d6;outline-offset:1px}'
      + '.rvfx-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147482000;max-width:min(520px,92vw);padding:9px 16px;border-radius:12px;background:rgba(20,24,30,.9);color:#fff;font:13px/1.4 system-ui,sans-serif;text-align:center;transition:opacity .4s}';
    (document.head || document.documentElement).appendChild(s);
  }
  var ICON = { motion: '⇄', lite: '⚡', full: '✓', pic3d: '▣', gl: '▣', offline: '⌁' };
  var label = function (c) { return c.label || FX.words[c.k] || ''; };
  var why = function (c) { return c.why || FX.words['why' + c.k.charAt(0).toUpperCase() + c.k.slice(1)] || ''; };
  // list: [{k:'motion'|'lite'|'full'|'pic3d'|'gl'|'offline', why?, label?}] — what is missing here; empty: nothing (no badge).
  // anchor: a note the box already has (the map's «no connection»): it becomes the badge instead of a second one.
  FX.mark = function (el, list, anchor) {
    list = (list || []).map(function (c) { return typeof c === 'string' ? { k: c } : c; }).filter(function (c) { return c && c.k; });
    var b = el.querySelector(':scope > .rvfx-badge');
    if (!list.length) { if (b) b.remove(); if (anchor) anchor.classList.remove('rvfx-badge', 'rvfx-note'); return; }
    css();
    el.__fx = list;
    if (anchor) { if (b && b !== anchor) b.remove(); b = anchor; b.classList.add('rvfx-badge', 'rvfx-note'); }
    else if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'rvfx-badge'; el.appendChild(b); }
    if (!anchor) { b.textContent = ''; var i = document.createElement('i'); i.setAttribute('aria-hidden', 'true'); i.textContent = ICON[list[0].k] || 'ⓘ'; b.appendChild(i); b.appendChild(document.createTextNode(label(list[0]))); }
    else if (!b.querySelector('i')) { var i2 = document.createElement('i'); i2.setAttribute('aria-hidden', 'true'); i2.textContent = ICON[list[0].k] || 'ⓘ'; b.insertBefore(i2, b.firstChild); }
    b.setAttribute('role', 'button'); b.tabIndex = 0; b.setAttribute('aria-haspopup', 'dialog');
    b.title = why(list[0]);
    if (!b.__fx) {
      b.__fx = true;
      ['pointerdown', 'mousedown', 'click', 'dblclick', 'touchstart'].forEach(function (n) { b.addEventListener(n, function (e) { e.stopPropagation(); }); });
      b.addEventListener('click', function () { FX.pop(el, b); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); FX.pop(el, b); } else e.stopPropagation(); });
    }
    if (list[0].k !== 'full') FX.toastOnce();
  };
  FX.toastOnce = function () {
    var seen; try { seen = sessionStorage.getItem('rvfx.toast'); sessionStorage.setItem('rvfx.toast', '1'); } catch (e) { seen = FX.mem.toast; FX.mem.toast = '1'; }
    if (seen || !FX.words.toast) return;
    css();
    var d = document.createElement('div'); d.className = 'rvfx-toast'; d.setAttribute('role', 'status'); d.textContent = FX.words.toast;
    document.body.appendChild(d);
    setTimeout(function () { d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 500); }, 7000);
  };
  FX.closePop = function () { if (FX.pops) { FX.pops.remove(); FX.pops = null; document.removeEventListener('keydown', FX.pk, true); document.removeEventListener('pointerdown', FX.pd, true); } };
  FX.pop = function (el, b) {
    var had = FX.pops && FX.pops.__for === el; FX.closePop(); if (had) return;
    var list = el.__fx || [], keys = list.map(function (c) { return c.k; }), has = function (k) { return keys.indexOf(k) >= 0; };
    var p = document.createElement('div'); p.className = 'rvfx-pop'; p.setAttribute('role', 'dialog'); p.__for = el;
    p.dir = document.documentElement.dir || 'ltr';
    list.forEach(function (c) { var q = document.createElement('p'); q.textContent = why(c); p.appendChild(q); });
    var bar = document.createElement('div'); bar.className = 'rvfx-b';
    var add = function (text, fn, primary) { var x = document.createElement('button'); x.type = 'button'; x.textContent = text; if (primary) x.className = 'rvfx-p'; x.addEventListener('click', function (e) { e.stopPropagation(); fn(); }); bar.appendChild(x); return x; };
    if (has('motion') || has('lite')) { add(FX.words.actFull, function () { FX.set('full'); }, true); var s = document.createElement('p'); s.className = 'rvfx-s'; s.textContent = FX.words.slow || ''; p.appendChild(s); }
    if (has('full')) add(FX.words.actLite, function () { FX.set('lite'); }, true);
    if (has('gl') || has('offline') || has('pic3d')) add(FX.words.retry, function () { FX.retry(); }, !has('motion') && !has('lite') && !has('full'));
    if (FX.openSettings) add(FX.words.settings, function () { FX.closePop(); FX.openSettings(); });
    p.appendChild(bar);
    document.body.appendChild(p); FX.pops = p;
    var r = b.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight, vw = innerWidth, vh = innerHeight;
    p.style.left = Math.max(8, Math.min(vw - w - 8, r.left)) + 'px';
    p.style.top = Math.max(8, r.top - h - 8 > 8 ? r.top - h - 8 : Math.min(vh - h - 8, r.bottom + 8)) + 'px';
    FX.pk = function (e) { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); FX.closePop(); b.focus(); } };
    FX.pd = function (e) { if (FX.pops && !FX.pops.contains(e.target) && !b.contains(e.target)) FX.closePop(); };
    document.addEventListener('keydown', FX.pk, true); document.addEventListener('pointerdown', FX.pd, true);
    var f = p.querySelector('button'); if (f) f.focus();
  };
  return FX;
}
